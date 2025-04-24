const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const timService = require('./modules/timService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

const CONSTANTS = {
  yearVacMainPart: 14,
  yearVacMaxDays: 59,
  predefinedPeriodDays: {
    dChild: [7, 10, 17]
  },
  dNotVacDays: 15,
  stateExpCode: '6',
  vacGrantStatuses: ['GRANT', 'GRANTLONG', 'PROLONG', 'PROLONGL']
}

me.entity.addMethod('search')

me.search = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const fld = sqlDialect.dialect === 'MSSQL2012'
    ? `(CONVERT(varchar, (select DATEDIFF(yy, p.birthDate, :dateTo:) - CASE WHEN MONTH(:dateTo:) < MONTH(p.birthDate) THEN 1 WHEN MONTH(:dateTo:) > MONTH(p.birthDate) THEN 0 WHEN DAY(:dateTo:) < DAY(p.birthDate) THEN 1 ELSE 0 END))) + ' р. ' + ` +
      `(CONVERT(varchar, (CASE WHEN DATEPART(day, p.birthDate) > DATEPART(day, :dateTo:) THEN DATEDIFF(month, p.birthDate, :dateTo:) - 1 ELSE DATEDIFF(month, p.birthDate, :dateTo:) END % 12))) + ' м.'`
    : `CAST(date_part('years', AGE(:dateTo:, p.birthDate)) as varchar(20)) || ' р. ' || CAST(date_part('month', AGE(:dateTo:, p.birthDate)) as varchar(20)) || ' м.'`

  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN ${timService.getTimeSheetPeriodDateSqlEx({ dateFromPar: 'dateFrom', dateToPar: 'dateTo', orgID: ctx.mParams.organizationID, groupCode: 'LST_CHD_CARE_VAC', includeChildOrgs: ctx.mParams.includeChildOrgs })} ts
        ON ts.employeeNumberID = en.ID 
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :dateTo:   
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      orderID: { field: 'ts.orderID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      dictVacationKindName: { field: 'ts.vacKindName' },
      vdateFrom: { field: 'ts.vacDateFrom' },
      vdateTo: { field: 'ts.vacDateTo' },
      vacKindID: { field: 'ts.vacKindID' },
      vacDescription: { field: 'ts.vacDescription' },
      // vacKindID: { field: 'v.vacKindID' },
      dayCount: { field: timService.getVacDaysSql() },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name') },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      employeePositionID: { field: 'ep.ID' },
      childAge: { field: `
      (select ${sqlDialect.top}
       ${fld}
  FROM hr_employeeFamily fam
    JOIN hr_people p on fam.peopleID = p.ID
    JOIN hr_dictKinshipKind dk on fam.dictKinshipKindID = dk.ID
  WHERE fam.employeeID = emp.ID
    and fam.mi_deleteDate >= '9999-12-31' 
    and p.mi_deleteDate >= '9999-12-31' 
    and dk.mi_deleteDate >= '9999-12-31' 
    and dk.code in ('05', '06')   
    and ${sqlDialect.dialect === 'MSSQL2012' ? 'DATEADD(year, 6, p.birthDate) > GETDATE()' : '(p.birthDate + \'6 year\') > current_date'}
  ORDER BY p.birthDate ${sqlDialect.limit}
  )` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO '

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

me.getWhereClause = function (mParams) {
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeSubOrg)

  let depClause = ''

  if (mParams.dictMultiGroupID != null) {
    depClause = getGroupDepartmentClause(mParams.deptIDs)
  } else {
    depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  }

  return ` en.mi_deleteDate >= '9999-12-31' 
  and (en.dateTo > :dateFrom: or en.dateTo is null) 
  ${workPlaceClause} 
  ${orgClause}
  ${depClause}     
  `
}

me.search3 = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const fld = sqlDialect.dialect === 'MSSQL2012'
    ? `(CONVERT(varchar, (select DATEDIFF(yy, p.birthDate, :dateTo:) - CASE WHEN MONTH(:dateTo:) < MONTH(p.birthDate) THEN 1 WHEN MONTH(:dateTo:) > MONTH(p.birthDate) THEN 0 WHEN DAY(:dateTo:) < DAY(p.birthDate) THEN 1 ELSE 0 END))) + ' р. ' + ` +
      `(CONVERT(varchar, (CASE WHEN DATEPART(day, p.birthDate) > DATEPART(day, :dateTo:) THEN DATEDIFF(month, p.birthDate, :dateTo:) - 1 ELSE DATEDIFF(month, p.birthDate, :dateTo:) END % 12))) + ' м.'`
    : `CAST(date_part('years', AGE(:dateTo:, p.birthDate)) as varchar(20)) || ' р. ' || CAST(date_part('month', AGE(:dateTo:, p.birthDate)) as varchar(20)) || ' м.'`

  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN ${getTimeSheetVacationPeriodDateSqlEx({ dateFromPar: 'dateFrom', dateToPar: 'dateTo', orgID: ctx.mParams.organizationID, includeSubOrg: ctx.mParams.includeSubOrg, myFactTimeCostID: ctx.myMassiveFactTimeCostID })} ts
        ON ts.employeeNumberID = en.ID 
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :dateTo:   
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      orderID: { field: 'ts.orderID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      dictVacationKindName: { field: 'ts.vacKindName' },
      vdateFrom: { field: 'ts.vacDateFrom' },
      vdateTo: { field: 'ts.vacDateTo' },
      vacKindID: { field: 'ts.vacKindID' },
      vacDescription: { field: 'ts.vacDescription' },
      vacName: { field: 'ts.myVacationName' },
      docName: { field: 'ts.docName' },
      factTimeCostID: { field: 'ts.factTimeCostID' },
      orderNumber: { field: 'ts.orderNumber' },
      orderDate: { field: 'ts.orderDate' },
      dayCount: { field: timService.getVacDaysSql() },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name') },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      employeePositionID: { field: 'ep.ID' },
      childAge: { field: `
      (select ${sqlDialect.top}
       ${fld}
  FROM hr_employeeFamily fam
    JOIN hr_people p on fam.peopleID = p.ID
    JOIN hr_dictKinshipKind dk on fam.dictKinshipKindID = dk.ID
  WHERE fam.employeeID = emp.ID
    and fam.mi_deleteDate >= '9999-12-31' 
    and p.mi_deleteDate >= '9999-12-31' 
    and dk.mi_deleteDate >= '9999-12-31' 
    and dk.code in ('05', '06')   
    and ${sqlDialect.dialect === 'MSSQL2012' ? 'DATEADD(year, 6, p.birthDate) > GETDATE()' : '(p.birthDate + \'6 year\') > current_date'}
  ORDER BY p.birthDate ${sqlDialect.limit}
  )` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeSubOrg = ctx.mParams.includeSubOrg
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.dateTo
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO '

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

function getTimeSheetVacationPeriodDateSqlEx ({ dateFromPar, dateToPar, orgIDPar, empNumIDPar,
  vacStatuses = CONSTANTS.vacGrantStatuses, orgID, includeSubOrg = false, noHoliday = true, showDetails = false, myFactTimeCostID }) {
  let tsFilter = ''
  const sqlDialect = entityBaseService.getSQLDialect()
  if (empNumIDPar) {
    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID and en.ID = :${empNumIDPar}:`
  } else if (orgIDPar) {
    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID and en.orgID = :${orgIDPar}:`
  } else if (orgID) {
    let orgClause = ''
    if (includeSubOrg) {
      orgClause = ` and en.orgID IN (select org.mi_data_id from hr_organization org
        where org.mi_treePath like '%/${orgID}/%' and org.mi_deleteDate >= '9999-12-31' )`
    } else if (!includeSubOrg) {
      orgClause = ` and en.orgID = ${orgID} `
    }

    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID ${orgClause}`
  }

  let vacStatusFilter = ''
  if (vacStatuses && vacStatuses.length > 0) {
    vacStatusFilter = `and v.vacationStatus in ('${vacStatuses.join("','")}')`
  }
  let holiday = ''
  if (noHoliday) {
    holiday = `and tc.code not in ('${entityBaseService.langCodei18n('Свт')}')`
  }
  let myTimeCost = `and ts.factTimeCostID = 0`
  if (myFactTimeCostID.length) {
    myTimeCost = `and ts.factTimeCostID IN (${myFactTimeCostID.join(',')})`
  }
  let showDetailSql = ''
  if (showDetails) {
    showDetailSql = 'LEFT JOIN hr_empVacationPeriod vp on vp.id = v.empVacationPeriodID'
  }
  return `(SELECT ts.employeeNumberID, ts.factTimeCostID, ts.orderID, o.description as vacDescription, COALESCE(formStudy.name, myNewDocName.description) as docName, o.orderNumber, o.orderDate,
    v.empVacationPeriodID, COALESCE(v.dateFrom, MIN(ts.dateWork)) as vacDateFrom,
    COALESCE(v.dateTo, MAX(ts.dateWork)) as vacDateTo, COALESCE(v.dayCount, COUNT(*)) as vacDayCount,
    v.dictVacationKindID as vacKindID,     
    v.dictVacationKindName as vacKindName,
    ts.myVacationName as myVacationName
    ${showDetails ? ', v.periodValue as periodValue ' : ''}
  FROM
    (SELECT ts.employeeNumberID, ts.factTimeCostID, COALESCE(tsc.orderID, ts.orderID) as orderID, ts.dateWork, ts.isActive, tc.name as myVacationName` +
    //      , ROW_NUMBER() OVER (PARTITION BY ts.employeeNumberID ORDER BY ts.dateWork) - ROW_NUMBER() OVER (PARTITION BY ts.employeeNumberID, ts.factTimeCostID ORDER BY ts.dateWork) as rnk
    ` FROM tim_timeSheet ts
      ${tsFilter}
      INNER JOIN hr_dictTimeCost tc ON tc.ID = ts.factTimeCostID
      LEFT JOIN hr_timeSheetChange tsc ON tsc.ID = ts.orderID
    WHERE ts.isActive = 1
      and ts.mi_deleteDate >= '9999-12-31'
      and ts.dateWork between :${dateFromPar}: and :${dateToPar}:
      ${holiday}
      ${myTimeCost}
      ) ts
    LEFT JOIN hr_order o ON o.id = ts.orderID
    LEFT JOIN ubm_enum formStudy on formStudy.code = o.empOrderType
    LEFT JOIN hr_orderClass myNewDocName on myNewDocName.id = o.orderClass
    LEFT JOIN hr_empOrderSickness orderSikness ON orderSikness.employeeNumberID = ts.employeeNumberID
    LEFT JOIN
      (SELECT v.employeeNumberID, v.orderID, v.dictVacationKindID, vk.name as dictVacationKindName, v.empVacationPeriodID, MIN(v.dateFrom) as dateFrom,
        vk.dictTimeCostID, MAX(v.dateTo) as dateTo, SUM(v.dayCount) as dayCount ${showDetails ? ', vp.description as periodValue ' : ''}
      FROM hr_employeeVacation v
      INNER JOIN hr_dictVacationKind vk ON vk.ID = v.dictVacationKindID
      ${showDetailSql}

      WHERE v.dateFrom <= :dateTo:
        and v.dateTo >= :dateFrom:
        and v.mi_deleteDate >= '9999-12-31'
        ${vacStatusFilter}
      GROUP BY v.employeeNumberID, v.orderID, v.dictVacationKindID, vk.name, v.empVacationPeriodID, vk.dictTimeCostID ${showDetails ? ', vp.description' : ''}
      ) v ON v.orderID = ts.orderID and v.employeeNumberID = ts.employeeNumberID and v.dictTimeCostID = ts.factTimeCostID
  WHERE
    EXISTS (SELECT 1 FROM hr_dictTimeCostGroup tcgr
      INNER JOIN hr_dictTimeGroup gr ON gr.ID = tcgr.dictTimeGroupID
        and gr.mi_deleteDate >= '9999-12-31'
      WHERE :${dateFromPar}: between tcgr.dateFrom and tcgr.dateTo
        and tcgr.mi_deleteDate >= '9999-12-31')
  GROUP BY
    ts.employeeNumberID, ts.factTimeCostID, ts.orderID, ts.myVacationName, formStudy.name, myNewDocName.description, o.orderNumber, o.orderDate,` + // ts.rnk,
    ` o.description, v.empVacationPeriodID, v.dateFrom, v.dateTo,
      v.dayCount, v.dictVacationKindID, v.dictVacationKindName  ${showDetails ? ', v.periodValue ' : ''}
    )`
}

function getGroupDepartmentClause (departmentID, dateAlias = ':onDate:') {
  const depClause = ` and ep.departmentID IN (${departmentID.join(',')}) `

  return depClause
}
