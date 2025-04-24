const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orgService = require('../HR/modules/orgService')
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const periodService = require('../HR/modules/periodService')

me.entity.addMethod('select')

me.select = function (ctx) {
  const mParams = ctx.mParams
  const isMsSql = entityBaseService.isMsSql()
  const sqlDialect = entityBaseService.getSQLDialect()
  const employeeNumberID = mParams.whereList.employeeID && mParams.whereList.employeeID.value
  const paramOrgID = mParams.whereList.orgID ? mParams.whereList.orgID.value : ctx.mParams.orgID
  const paramArrayOrgIDs = mParams.whereList.arrayOrgIDs ? mParams.whereList.arrayOrgIDs.value : []
  let orgID = paramOrgID
  let mainEmpNumberID
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const paramOnDate = ctx.mParams.onDate && dateService.shiftDate(ctx.mParams.onDate)
  let dateFrom = dateService.shiftDate(paramOnDate || dateService.currentDate())
  let dateTo = dateService.shiftDate(paramOnDate || dateService.currentDate())
  const onDate = paramOnDate || dateService.currentDate()
  if (employeeNumberID) {
    const employeeNumber = UB.Repository('hr_employeeNumberS')
      .attrs(['orgID', 'mainEmpNumberID', 'empWorkPlace']).selectById(employeeNumberID)

    if (!orgID) {
      orgID = employeeNumber.orgID
    }
    if (employeeNumber.empWorkPlace === '5') {
      mainEmpNumberID = employeeNumber.mainEmpNumberID
    }
    if (!ctx.mParams.onDate) {
      const currentPeriod = periodService.getCurrentPeriod(orgID)
      if (currentPeriod) {
        dateFrom = currentPeriod.dateFrom
        dateTo = currentPeriod.dateTo
      }
    }
  }

  let runsql
  let sqlBuilder = {
    text:
      `SELECT {0} {1} FROM (
      SELECT ea.ID AS ID, ea.payElID, pe.description AS payElDescription, ea.accrualRate AS accrualRate,
        ea.accrualSum AS accrualSum, o.description AS orderDescription,
        ${isMsSql ? '(CASE year(ea.dateFrom) WHEN 2000 THEN null ELSE ea.dateFrom END)' : '(CASE Extract(YEAR from ea.dateFrom) WHEN 2000 THEN null ELSE ea.dateFrom END)'}
          AS dateFrom,
        ${isMsSql ? '(CASE year(ea.dateTo) WHEN 9999 THEN null ELSE ea.dateTo END)' : '(CASE Extract(YEAR from ea.dateTo) WHEN 9999 THEN null ELSE ea.dateTo END)'}
          AS dateTo,
          null AS permDisabledID,
        'hr_employeeAccrual' AS entityName,
        ea.employeeNumberID,
        en.orgID,
        ea.orderID,
        null as methodCode
      FROM hr_employeeAccrual ea
        INNER JOIN hr_employeeNumber en ON en.ID = ea.employeeNumberID
        INNER JOIN hr_payEl pe ON pe.ID = ea.payElID    
        INNER JOIN hr_method m ON m.ID = pe.methodID    
        INNER JOIN hr_methodGroup mg ON mg.ID = m.methodGroupID  
        LEFT JOIN hr_order o ON o.ID = ea.orderID     
      WHERE mg.groupType = 'PAYMENT' AND ea.isActive = 1
        AND ea.mi_deleteDate >= '9999-12-31'
        ${employeeNumberID ? 'AND ea.employeeNumberID = ' + employeeNumberID : ''}
        ${!paramArrayOrgIDs.length && paramOrgID ? 'AND en.orgID = ' + paramOrgID : ''}
        ${paramArrayOrgIDs.length ? 'AND en.orgID in (' + paramArrayOrgIDs + ')' : ''}
        ${paramOnDate ? ' and ea.dateFrom <= :onDate: and ea.dateTo >= :onDate: ' : ''} 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      UNION ALL
      SELECT pp.ID, pp.payElID, pe.description AS payElDescription, pp.rate AS accrualRate, pp.paySum AS accrualSum,
        null AS orderDescription,
        ${isMsSql ? '(CASE year(pp.dateFrom) WHEN 2000 THEN null ELSE pp.dateFrom END)' : '(CASE Extract(YEAR from pp.dateFrom) WHEN 2000 THEN null ELSE pp.dateFrom END)'}
          AS dateFrom,
        ${isMsSql ? '(CASE year(pp.dateTo) WHEN 9999 THEN null ELSE pp.dateTo END)' : '(CASE Extract(YEAR from pp.dateTo) WHEN 9999 THEN null ELSE pp.dateTo END)'}
          AS dateTo,
        (SELECT ${sqlDialect.top} d.ID FROM hr_payPermDisable d where d.employeeNumberID = en.ID and d.payPermID = pp.ID and d.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) AS permDisabledID,
        'hr_payPerm' AS entityName,
        en.ID AS employeeNumberID,
        en.orgID,
        null orderID,
        null as methodCode
      FROM 
        hr_employeeNumber en
        INNER JOIN 
          (SELECT ep.employeeNumberID, ep.departmentID, ep.dictPositionID, ep.dictStaffCatID, ep.workPlace, ep.workerType, ep.dictEmpCategoryID
          FROM hr_employeePosition ep
          WHERE ep.mi_deleteDate >= '9999-12-31'
            and ep.dateFrom <= :dateTo:
            and ep.dateTo >= :dateFrom:
            ${employeeNumberID ? 'AND ep.employeeNumberID = ' + employeeNumberID : ''}
            ${paramOrgID ? 'AND ep.organizationID = ' + paramOrgID : ''}
          ) ep ON ep.employeeNumberID = en.ID
        INNER JOIN hr_payPerm pp ON pp.mi_deleteDate >= '9999-12-31' AND pp.payType = 'PAYMENT'
          ${paramOnDate ? ' and pp.dateFrom <= :onDate: and pp.dateTo >= :onDate: ' : ''}
          ${orgService.getOrgAccrualSqlFilter(orgID, null, dateFrom, dateTo, 'PAYMENT', 'pp', 'ep')}
        INNER JOIN hr_payEl pe ON pe.ID = pp.payElID
      WHERE 
        en.mi_deleteDate >= '9999-12-31'
        ${employeeNumberID ? 'AND en.ID = ' + employeeNumberID : ''}
        ${!paramArrayOrgIDs.length && paramOrgID ? 'AND en.orgID = ' + paramOrgID : ''}
        ${paramArrayOrgIDs.length ? 'AND en.orgID in (' + paramArrayOrgIDs + ')' : ''}
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        AND NOT EXISTS (select 1 from hr_employeeAccrual ea
          WHERE ea.employeeNumberID = en.ID
            and ea.payElID = pp.payElID
            and ea.dateFrom <= :dateTo:
            and ea.dateTo >= :dateFrom:
            AND ea.isActive = 1
            and ea.mi_deleteDate >= '9999-12-31')
      GROUP BY pp.ID, pp.payElID, pe.description, pp.rate, pp.paySum, en.ID, en.orgID, pp.dateFrom, pp.dateTo
      UNION ALL
      SELECT ta.ID, ta.payElID, pe.description AS payElDescription, ta.rate AS accrualRate, ta.accrualSum AS accrualSum, td.description AS orderDescription,
        ${isMsSql ? '(CASE year(tw.dateFrom) WHEN 2000 THEN null ELSE tw.dateFrom END)' : '(CASE Extract(YEAR from tw.dateFrom) WHEN 2000 THEN null ELSE tw.dateFrom END)'}
          AS dateFrom,
        ${isMsSql ? '(CASE year(tw.dateTo) WHEN 9999 THEN null ELSE tw.dateTo END)' : '(CASE Extract(YEAR from tw.dateTo) WHEN 9999 THEN null ELSE tw.dateTo END)'}
          AS dateTo,
        null AS permDisabledID,        
        'trf_accrual' AS entityName, ${employeeNumberID || '0'} AS employeeNumberID, en.orgID, null orderID, hm.code as methodCode
      FROM trf_accrual ta
        INNER JOIN trf_position tp ON ta.positionID = tp.ID
        INNER JOIN trf_workPlace tw ON tp.workPlaceID = tw.ID
        INNER JOIN hr_employeeNumber en ON tw.employeeNumberID = en.ID
        INNER JOIN trf_document td ON tw.documentID = td.ID
        INNER JOIN hr_payEl pe ON pe.ID = ta.payElID
        INNER join hr_method hm ON hm.ID = pe.methodID
      WHERE 
        tw.employeeNumberID = ${mainEmpNumberID || '0'}
        AND tw.state = 'POSTED'
        ${paramOnDate ? ' and tw.dateFrom <= :onDate: and tw.dateTo >= :onDate: ' : ''}
        ${!paramArrayOrgIDs.length && paramOrgID ? 'AND td.orgID = ' + paramOrgID : ''}
        ${paramArrayOrgIDs.length ? 'AND td.orgID in (' + paramArrayOrgIDs + ')' : ''}
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''} 
        AND ta.mi_deleteDate >= '9999-12-31'
        AND tp.mi_deleteDate >= '9999-12-31'
        AND tw.mi_deleteDate >= '9999-12-31'
        AND td.mi_deleteDate >= '9999-12-31'
    ) t
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      employeeNumberID: { field: 't.employeeNumberID' },
      orgID: { field: 't.orgID' },
      payElDescription: { field: 't.payElDescription' },
      dateFrom: { field: 't.dateFrom' },
      dateTo: { field: `COALESCE(t.dateTo, '9999-12-31')` },
      dateToEmpty: { field: `CASE WHEN COALESCE(t.dateTo, '9999-12-31') = '9999-12-31' THEN null ELSE t.dateTo END` },
      accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 't.accrualSum' },
      accrualRate: { field: 't.accrualRate' },
      orderDescription: { field: 't.orderDescription' },
      entityName: { field: 't.entityName' },
      orderID: { field: 't.orderID' },
      payElID: { field: 't.payElID' },
      permDisabledID: { field: 't.permDisabledID' },
      methodCode: { field: 't.methodCode' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)
  sqlBuilder.clauses.whereParams.employeeNumberID = employeeNumberID
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
