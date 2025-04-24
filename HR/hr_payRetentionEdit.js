const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')
const orgService = require('../HR/modules/orgService')
const selectService = require('../AC/modules/dataServices/selectService')
const periodService = require('../HR/modules/periodService')

me.entity.addMethod('select')

me.select = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let sqlBuilder = {
    text:
      ` SELECT {0} {1} FROM (
        SELECT  pr.ID AS ID, pe.description AS payElDescription, pr.rate, pr.baseSum, pr.paymentMethod,
        ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? '(CASE year(pr.dateFrom) WHEN 2000 THEN null ELSE pr.dateFrom END)'
    : '(CASE Extract(YEAR from pr.dateFrom) WHEN 2000 THEN null ELSE pr.dateFrom END)'}
        AS dateFrom,
        ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? '(CASE year(pr.dateTo) WHEN 9999 THEN null ELSE pr.dateTo END)'
    : '(CASE Extract(YEAR from pr.dateTo) WHEN 9999 THEN null ELSE pr.dateTo END)'}
        AS dateTo,
        null AS permDisabledID,
         'hr_payRetention' AS entityName,
          pr.employeeNumberID, pr.orderID
        FROM hr_payRetention pr 
        JOIN hr_employeeNumber  en ON en.ID = pr.employeeNumberID
        JOIN hr_payEl pe ON pe.ID = pr.payElID    
        WHERE pr.employeeNumberID = :employeeNumberID: AND pr.mi_deleteDate >= '9999-12-31' 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
         ${ctx.mParams.onDate ? ' and pr.dateFrom <= :onDate: and pr.dateTo >= :onDate: ' : ''} 
        UNION ALL
        select pp.ID, pe.description AS payElDescription, pp.rate, pp.paySum AS baseSum, null AS paymentMethod,
          ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? '(CASE year(pp.dateFrom) WHEN 2000 THEN null ELSE pp.dateFrom END)'
    : '(CASE Extract(YEAR from pp.dateFrom) WHEN 2000 THEN null ELSE pp.dateFrom END)'}
    AS dateFrom,
          ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? '(CASE year(pp.dateTo) WHEN 9999 THEN null ELSE pp.dateTo END)'
    : '(CASE Extract(YEAR from pp.dateTo) WHEN 9999 THEN null ELSE pp.dateTo END)'}
    AS dateTo,
    (SELECT ${sqlDialect.top} d.ID FROM hr_payPermDisable d where d.employeeNumberID = :employeeNumberID: and d.payPermID = pp.ID and d.mi_deleteDate >= '9999-12-31'  ${sqlDialect.limit}) AS permDisabledID,
          'hr_payPerm' AS entityName,
          :employeeNumberID: AS employeeNumberID,
          null orderID
          FROM hr_payPerm pp
          JOIN hr_payEl pe ON pe.ID = pp.payElID 
          WHERE pp.ID${entityBaseService.getInExpression('payPermIDs')}
          AND pp.mi_deleteDate >= '9999-12-31' ${ctx.mParams.onDate ? ' and pp.dateFrom <= :onDate: and pp.dateTo >= :onDate: ' : ''} 
  ) t
        
      {2} {3} {4}
    `,

    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      payElDescription: { field: 't.payElDescription' },
      dateFrom: { field: 't.dateFrom' },
      dateTo: { field: 't.dateTo' },
      baseSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 't.baseSum' },
      rate: { field: 't.rate' },
      paymentMethod: { field: 't.paymentMethod' },
      entityName: { field: 't.entityName' },
      employeeNumberID: { field: 't.employeeNumberID' },
      orderID: { field: 't.orderID' },
      permDisabledID: { field: 't.permDisabledID' }
    },
    params: {}
  }
  const employeeNumberID = ctx.mParams.whereList.employeeID.value
  const onDate = ctx.mParams.onDate ? dateService.shiftDate(ctx.mParams.onDate) : dateService.currentDate()
  let dateFrom = dateService.shiftDate(onDate || dateService.currentDate())
  let dateTo = dateService.shiftDate(onDate || dateService.currentDate())
  if (employeeNumberID && !ctx.mParams.onDate) {
    const employeeNumber = UB.Repository('hr_employeeNumberS')
      .attrs(['orgID', 'mainEmpNumberID', 'empWorkPlace']).selectById(employeeNumberID)

    const currentPeriod = periodService.getCurrentPeriod(employeeNumber.orgID)
    if (currentPeriod) {
      dateFrom = currentPeriod.dateFrom
      dateTo = currentPeriod.dateTo
    }
  }

  const position = employeeNumberID ? UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID.orgID', 'departmentID', 'dictPositionID', 'dictStaffCatID', 'workPlace', 'workerType'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .selectSingle() : null
  const payPermIDs = []
  if (position) {
    const orgAccrual = orgService.getOrgAccrual(position['employeeNumberID.orgID'], null, dateFrom, dateTo, 'OFFTAKE')
    const employeeAccrual = UB.Repository('hr_payRetention')
      .attrs(['ID', 'payElID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
    orgAccrual.forEach(acc => {
      if (!employeeAccrual.find(o => o.payElID === acc.payElID) &&
        !((acc.excludeDepartment && acc.department.includes(position.departmentID)) || (!acc.excludeDepartment && acc.department.length && !acc.department.includes(position.departmentID))) &&
        !((acc.excludePosition && acc.position.includes(position.dictPositionID)) || (!acc.excludePosition && acc.position.length && !acc.position.includes(position.dictPositionID))) &&
        !((acc.excludeStaff && acc.category.includes(position.dictStaffCatID)) || (!acc.excludeStaff && acc.category.length && !acc.category.includes(position.dictStaffCatID))) &&
        !((acc.excludeEmpCategory && acc.empCategory.includes(position.dictEmpCategoryID)) || (!acc.excludeEmpCategory && acc.empCategory.length && !acc.empCategory.includes(position.dictEmpCategoryID))) &&
        !((acc.excludeWorkPlace && acc.workPlace.includes(position.workPlace)) || (!acc.excludeWorkPlace && acc.workPlace.length && !acc.workPlace.includes(position.workPlace))) &&
        !((acc.excludeWorkerType && acc.workerType.includes(position.workerType)) || (!acc.excludeWorkerType && acc.workerType.length && !acc.workerType.includes(position.workerType)))
      ) {
        payPermIDs.push(acc.ID)
      }
    })
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)
  sqlBuilder.clauses.whereParams.employeeNumberID = employeeNumberID
  sqlBuilder.clauses.whereParams.payPermIDs = payPermIDs.length ? payPermIDs : [0]
  sqlBuilder.clauses.whereParams.onDate = onDate
  sqlBuilder.clauses.whereParams.dateFrom = dateFrom
  sqlBuilder.clauses.whereParams.dateTo = dateTo
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY t.dateTo ASC, t.entityName  ASC, t.payElDescription ASC, t.dateFrom ASC '

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
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
