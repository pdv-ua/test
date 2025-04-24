const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const reportUtils = require('../HR/public/core/reportUtils')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const periodService = require('./modules/periodService')

me.entity.addMethod('search')
me.entity.addMethod('createOrder')
me.entity.addMethod('getEmpListExpAllowanceData')

me.entity.addMethod('getData')

function getConvertDateSQL (paramName) {
  const sqlDialect = entityBaseService.getSQLDialect()
  return sqlDialect.dialect === 'MSSQL2012'
    ? `CONVERT(datetime, CAST(DATEPART(year, :${paramName}:) AS varchar(4))
        + (CASE WHEN DATEPART(month, exp2.calcDate) < 10  THEN '0' + CAST(DATEPART(month, exp2.calcDate) AS varchar(2))
        ELSE CAST(DATEPART(month, exp2.calcDate) AS varchar(2)) END)
        + (CASE WHEN DATEPART(month, exp2.calcDate) = 2 and DATEPART(day, exp2.calcDate) = 29 THEN '28'
          WHEN DATEPART(day, exp2.calcDate) < 10  THEN '0' + CAST(DATEPART(day, exp2.calcDate) AS varchar(2))
        ELSE CAST(DATEPART(day, exp2.calcDate) AS varchar(2)) END), 112)`
    : `cast(
      cast(extract(year from cast(:${paramName}: as timestamp)) as varchar(4)) || 
      (case when extract(month from exp2.calcDate) < 10 then '0' || cast(extract(month from exp2.calcDate) as varchar(2)) else cast(extract(month from exp2.calcDate) as varchar(2)) end) || 
      (case when extract(month from exp2.calcDate) = 2 and extract(day from exp2.calcDate) = 29 then '28' when extract(day from exp2.calcDate) < 10 then '0' || cast(extract(day from exp2.calcDate) as varchar(2)) else cast(extract(day from exp2.calcDate) as varchar(2)) end)
    as timestamp)`
}

function getJoinExpSql (expCode) {
  const calcDateSql = expCode === '6'
    ? ` ,(case when exp2.calcDate >= '2016-05-01' then exp2.calcDate else (select min(exp3.calcDate)  
  from hr_employeeExperience exp3 
    join hr_dictExperience dexp3 on exp3.dictExperienceID = dexp3.ID and dexp3.mi_deleteDate>='9999-12-31' 
     join hr_methodExp mexp3 on mexp3.ID = dexp3.methodExpID 
  where (mexp3.code = '6' or mexp3.code = '14') 
    and exp3.employeeID = exp2.employeeID 
    and exp3.mi_deleteDate >= '9999-12-31') END) as calcDate `
    : ` , exp2.calcDate as calcDate `

  const joinExp = `
  JOIN (
    SELECT 
      govexp.employeeID
      , govexp.ID as govexp
      , govexp.startCalcDate as govstartCalcDate
      , dexp.name as dexpname
      , govexp.calcDate as govcalcDate
      , exp2.calcDate as calcDate
      , (CASE 
      WHEN ${getConvertDateSQL('dateFrom')} between :dateFrom: and :dateTo:          
      THEN ${getConvertDateSQL('dateFrom')}         
      WHEN ${getConvertDateSQL('dateTo')} between :dateFrom: and :dateTo:          
      THEN ${getConvertDateSQL('dateTo')}         
      ELSE '9999-12-31' END) AS setDate       
      From hr_employeeExperience govexp 
        JOIN hr_dictExperience dexp on govexp.dictExperienceID = dexp.ID and dexp.mi_deleteDate>='9999-12-31' 
        JOIN (select exp2.employeeID
        ${calcDateSql} 
      From hr_employeeExperience exp2 
        JOIN hr_dictExperience dexp2 on exp2.dictExperienceID = dexp2.ID and dexp2.mi_deleteDate>='9999-12-31' 
          AND exp2.mi_deleteDate >= '9999-12-31' and dexp2.ID = :dictExperienceID:
      ) exp2 on govexp.employeeID = exp2.employeeID       
    WHERE 
      dexp.ID = :dictExperienceID: AND govexp.mi_deleteDate >= '9999-12-31'
  ) exp on emp.ID = exp.employeeID 
`
  return joinExp
}

function formSqlBuilder (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let payElExpCodeData
  if (ctx.mParams.payElID) {
    payElExpCodeData = UB.Repository('hr_payEl')
      .attrs(['dictExperienceID', 'dictExperienceID.methodExpID.code'])
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .where('dictExperienceID.methodExpID.mi_deleteDate', '>=', '#maxdate')
      .selectById(ctx.mParams.payElID)
  }
  const expCode = payElExpCodeData && payElExpCodeData['dictExperienceID.methodExpID.code'] ? payElExpCodeData['dictExperienceID.methodExpID.code'] : null
  const dictExperienceID = payElExpCodeData && payElExpCodeData.dictExperienceID ? payElExpCodeData.dictExperienceID : null
  const sqlBuilder = {
    text: `  SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID  
      JOIN hr_employee emp on en.employeeID = emp.ID 
      ${getJoinExpSql(expCode, dictExperienceID)} 
      LEFT JOIN ubm_enum e_workPlace ON e_workPlace.code = ep.workPlace
        and e_workPlace.eGroup = 'HR_WORKER_PLACE'
      LEFT JOIN hr_dictPosition dpos ON dpos.ID = ep.dictPositionID
      LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos.ID from hr_position pos
        WHERE pos.mi_data_id = ep.positionID              
          and pos.orgID = en.orgID  
          and pos.mi_dateFrom <= :dateTo:   
          and pos.mi_deleteDate >= '9999-12-31'              
          and pos.state = 'ACTIVE'             
        ORDER BY pos.mi_dateFrom desc ${sqlDialect.limit})  
      {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      employeePositionID: { field: 'ep.ID' },
      positionID: { field: 'ep.positionID' },
      departmentID: { field: 'ep.departmentID' },
      tabNum: { field: 'en.tabNum' },
      lastName: { field: 'emp.lastName' },
      firstName: { field: 'emp.firstName' },
      middleName: { field: 'emp.middleName' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      stageYear: { field: sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, exp.calcDate, exp.setDate)` : `DATE_PART('year', AGE(exp.setDate, exp.calcDate))` },
      rate: { field: `(select ${sqlDialect.top} expEl.rate from hr_payElExperience expEl where expEl.payElID = :payElID: 
        and expEl.years <= ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, exp.calcDate, exp.setDate)` : `DATE_PART('year', AGE(exp.setDate, exp.calcDate))`}
        and expEl.mi_deleteDate>='9999-12-31'
        and exp.setDate between expEl.dateFrom and expEl.dateTo order by expEl.years desc ${sqlDialect.limit})` },
      setDate: { field: 'exp.setDate' },
      calcDate: { field: 'exp.calcDate' },
      posName: { field: 'COALESCE(pos.name, dpos.name)' },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, exp.setDate, en.orgID, (select ${sqlDialect.top}pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, exp.setDate, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      employeePositionDesc: { field: 'ep.description' },
      workPlaceName: { field: 'e_workPlace.name' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.whereParams.payElID = ctx.mParams.payElID
  sqlBuilder.clauses.whereParams.expCode = expCode
  sqlBuilder.clauses.whereParams.dictExperienceID = dictExperienceID
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, "stageYear"'

  return sqlBuilder
}

me.search = function (ctx) {
  const sqlBuilder = formSqlBuilder(ctx)
  let runsql

  if (ctx.mParams.options && ctx.mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      ctx.mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)

  ctx.inherite = false
  return true
}

me.getData = function (ctx) {
  const sqlBuilder = formSqlBuilder(ctx)
  let runsql

  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause
  )

  const store = UB.DataStore(__entityName)
  store.runSQL(runsql, sqlBuilder.clauses.whereParams)

  ctx.mParams.data = JSON.stringify(store.getAsJsObject())
  return true
}

me.getWhereClause = function (mParams) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const positionTypeClause = mParams.positionType ? ` and ((pos.ID IS NOT NULL AND  pos.positionType = '${mParams.positionType}') OR (pos.ID IS NULL AND dpos.positionType = '${mParams.positionType}')) ` : ''
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31'    
    and :dateFrom: between ep.dateFrom and ep.dateTo 
    and :dateFrom: between en.dateFrom and en.dateTo     
    and ep.isActive = 1  
    ${positionTypeClause} 
    ${workPlaceClause} 
    and exp.setDate < '9999-12-31' 
    and (exp.govstartCalcDate is null or exp.govstartCalcDate > :dateFrom:) 
    and exists (select ${sqlDialect.top} expEl.rate from hr_payElExperience expEl where expEl.payElID = :payElID: 
    and expEl.years <= ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, exp.calcDate, exp.setDate)` : `DATE_PART('year', AGE(exp.setDate, exp.calcDate))`}
    and expEl.mi_deleteDate>='9999-12-31'
    and exp.setDate between expEl.dateFrom and expEl.dateTo order by expEl.years desc ${sqlDialect.limit}) 
    ${orgClause}
    ${depClause}     
    `
}

me.getEmpListExpAllowanceData = ctx => {
  const sqlBuilder = formSqlBuilder(ctx)
  const runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  const empDS = UB.DataStore('hr_empListExpAllowance')
  empDS.runSQL(runsql, sqlBuilder.clauses.whereParams)

  const emps = JSON.parse(empDS.asJSONObject)

  emps.forEach((item, i) => {
    item.num = i + 1
    if (item.setDate) {
      item.setDate = dateService.formatDate(item.setDate)
    }
    item.structDepName = reportUtils.getReportDepStructFld(item.depName, item.structDepName)
    item.depTree = reportUtils.getReportDepStructFld(item.depName, item.depTree)
  })

  ctx.mParams.resultData = JSON.stringify({
    emps
  })
}

/**
 * Створити Наказ про встановлення надбавок
 * @param {object} ctx
 */
me.createOrder = function (ctx) {
  const empData = JSON.parse(ctx.mParams.empData)
  const orderNumber = UB.i18n('(проєкт)')
  const orderDate = ctx.mParams.onDate
  const orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  const empOrderStore = UB.DataStore('hr_empOrder')
  const orderID = empOrderStore.generateID()
  empOrderStore.run('insert', {
    execParams: {
      ID: orderID,
      orderNumber: orderNumber,
      orderDate: orderDate,
      entryDate: orderDate,
      organizationID: ctx.mParams.organizationID,
      empOrderType: 'ADDSALARYGOV',
      orderClass: orderClass,
      periodID: periodService.getCurrentPeriod(ctx.mParams.organizationID).ID,
      reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
    }
  })
  empOrderStore.freeNative()

  const empOrderDetStore = UB.DataStore('hr_empOrderAddsalarygovDet')
  const orderDetID = empOrderDetStore.generateID()
  empOrderDetStore.run('insert', {
    execParams: {
      ID: orderDetID,
      orderID: orderID,
      itemIdx: 1,
      empOrderType: 'ADDSALARYGOV',
      organizationID: ctx.mParams.organizationID,
      dateFrom: orderDate,
      payElID: ctx.mParams.payElID,
      isGroup: true
    }
  })
  empOrderDetStore.freeNative()

  const empOrderChgSalEmpDet = UB.DataStore('hr_empOrderChgSalEmpDet')
  empData.forEach(item => {
    const empOrderID = empOrderChgSalEmpDet.generateID()
    empOrderChgSalEmpDet.run('insert', {
      execParams: {
        ID: empOrderID,
        paraID: orderDetID,
        orderID: orderID,
        itemIdx: 1,
        organizationID: ctx.mParams.organizationID,
        employeePositionID: item.employeePositionID,
        employeeNumberID: item.employeeNumberID,
        employeeID: item.employeeID,
        firstName: item.firstName,
        lastName: item.lastName,
        middleName: item.middleName,
        departmentID: item.departmentID,

        payElID: ctx.mParams.payElID,
        empOrderType: 'ADDSALARYGOV',

        positionID: item.positionID,

        dateFrom: dateService.shiftDate(item.setDate) || orderDate,
        dateTo: dateService.maxDate(),
        stageYear: item.stageYear,
        accrualRate: item.rate
      }
    })
  })
  empOrderChgSalEmpDet.freeNative()

  ctx.mParams.orderID = orderID
  return true
}
