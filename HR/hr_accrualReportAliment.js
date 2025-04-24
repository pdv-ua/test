const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('selectAliments')

me.selectAliments = ctx => {
  const mParams = ctx.mParams
  mParams.periodFrom = dateService.shiftDate(mParams.periodFromDateFrom)
  mParams.periodTo = dateService.shiftDate(mParams.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.organizationID) === true

  mParams.orgIDs = [mParams.organizationID]
  if (mParams.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.organizationID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      mParams.orgIDs = orgs.map(o => o.mi_data_id)
    }
  }
  const periodList = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', mParams.orgIDs)
    .where('dateFrom', '>=', mParams.periodFromDateFrom)
    .where('dateTo', '<=', mParams.periodToDateTo)
    .selectAsObject()

  mParams.periodIDs = periodList.map(o => o.ID)

  let runsql
  let sqlBuilder = {
    text: `SELECT {0} {1} 
FROM hr_accrual acc1 INNER JOIN hr_employeeNumber num1
    ON num1.ID = acc1.employeeNumberID AND num1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_employee emp1 ON emp1.ID = num1.employeeID AND emp1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_dictPeriod per1 ON per1.ID = acc1.periodCalcID AND per1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_payEl pay1 ON pay1.ID = acc1.payElID
  INNER JOIN hr_method met1 ON met1.ID = pay1.methodID AND (met1.code = '31' OR (met1.code = '61' ${mParams.reqReport ? ' AND pay1.notReqReport = 1' : ''}))
  INNER JOIN hr_employeePosition ep ON ep.ID = (SELECT ${sqlDialect.top} ep2.ID                  
FROM hr_employeePosition ep2                  
WHERE ep2.employeeNumberID = acc1.employeeNumberID                  
AND ep2.isActive = 1 AND ep2.dateFrom <= :periodTo: and ep2.mi_deleteDate >= '9999-12-31'                    
ORDER BY ep2.dateFrom DESC ${sqlDialect.limit}) 
  LEFT JOIN hr_department dep1 ON dep1.ID = (SELECT ${sqlDialect.top} dep2.ID                   
FROM hr_department dep2  WHERE dep2.mi_data_id = ep.departmentID                                
AND dep2.mi_dateFrom <= :periodTo:                 
AND dep2.mi_deleteDate >= '9999-12-31' AND dep2.state = 'ACTIVE'                               
ORDER BY dep2.mi_dateFrom DESC ${sqlDialect.limit})
  LEFT JOIN hr_position dictPos ON dictPos.ID = (SELECT ${sqlDialect.top} pos2.ID 
FROM hr_position pos2 WHERE pos2.mi_data_id = ep.positionID                                  
AND pos2.mi_dateFrom <= :periodTo:                                    
AND pos2.mi_deleteDate >= '9999-12-31' AND pos2.state = 'ACTIVE'                                  
ORDER BY pos2.mi_dateFrom DESC ${sqlDialect.limit}) 
  LEFT JOIN hr_payRetention payRet1 ON payRet1.ID=acc1.sourceID AND payRet1.mi_deleteDate>='9999-12-31'
  LEFT JOIN ac_contractor contr1 ON contr1.ID = payRet1.contractorID AND contr1.mi_deleteDate>='9999-12-31'
  LEFT JOIN ac_contrAccount contrAcc1 ON contrAcc1.mi_deleteDate>='9999-12-31' AND contrAcc1.ID = payRet1.ContrAccountID
  LEFT JOIN ac_contractor contrContrAcc1 ON contrContrAcc1.ID = contrAcc1.organizationID AND contrContrAcc1.mi_deleteDate>='9999-12-31'
  LEFT JOIN ac_bank bank1 ON bank1.ID=contrAcc1.bankID AND bank1.mi_deleteDate>='9999-12-31' 
            {2} {3} {4}`,
    clauses: {},
    aliases: {
      'sum([incomingDebtSum])': { field: 'sum(incomingDebtSum)' },
      'sum([calculatedSum])': { field: 'sum(calculatedSum)' },
      'sum([paySum])': { field: 'sum(paySum)' },
      'sum([debt])': { field: 'sum(acc1.incomingDebtSum + acc1.calculatedSum - acc1.paySum)' },
      tabNum: { field: 'num1.tabNum' },
      tabNumSort: { field: 'num1.tabNumSort' },
      fullFIO: { field: 'emp1.fullFIO' },
      payElName: { field: 'pay1.name' },
      periodName: { field: 'per1.name' },
      incSum: { field: `(
    select COALESCE(sum(paySum), 0)
    from hr_accrual B01
    INNER JOIN hr_payEl B04 ON B04.ID = B01.payElID
    INNER JOIN hr_method B05 ON B05.ID = B04.methodID
    INNER JOIN hr_methodGroup B06 ON B06.ID = B05.methodGroupID and B06.groupType = 'PAYMENT'
    where B01.employeeNumberID = acc1.employeeNumberID
    and acc1.periodCalcID=B01.periodCalcID
  and (pay1.includeSecondJobs > 0 or (B01.flagsRec & 4096) = 0)  and exists (select 1 from hr_payElEntry B07
       where acc1.payElID = B07.payElID AND B07.payElBaseID = B01.payElID AND B07.mi_deleteDate >= '9999-12-31')
  )` },
      outSum: { field: `(
    select COALESCE(sum(paySum), 0)
   from hr_accrual B01
     INNER JOIN hr_payEl B04 ON B04.ID = B01.payElID
    INNER JOIN hr_method B05 ON B05.ID = B04.methodID
    INNER JOIN hr_methodGroup B06 ON B06.ID = B05.methodGroupID and B06.groupType = 'OFFTAKE'
  inner join hr_payElEntry B07 on acc1.payElID = B07.payElID and B07.payElBaseID=B01.payElID and B07.mi_deleteDate >= '9999-12-31' and B07.entryType = 'SUM'
    where B01.employeeNumberID = acc1.employeeNumberID
    and acc1.periodCalcID=B01.periodCalcID
  and (pay1.includeSecondJobs > 0 or (B01.flagsRec & 4096) = 0) and exists (select 1 from hr_payElEntry B07
       where acc1.payElID = B07.payElID AND B07.payElBaseID = B01.payElID AND B07.mi_deleteDate >= '9999-12-31')
  )` },
      rate: { field: 'acc1.rate' },
      accrualID: { field: 'acc1.ID' },
      incomingDebtSum: { field: 'COALESCE(acc1.incomingDebtSum, 0)' },
      calculatedSum: { field: 'COALESCE(acc1.calculatedSum, 0)' },
      paySum: { field: 'COALESCE(acc1.paySum, 0)' },
      debt: { field: 'COALESCE((acc1.incomingDebtSum + acc1.calculatedSum - acc1.paySum), 0)' },
      contrName: { field: 'contr1.name' },
      dateToEmpty: { field: `(case ${sqlDialect.dialect === 'MSSQL2012' ? 'year(payRet1.dateTo)' : 'Extract(YEAR from payRet1.dateTo)'} when 9999 then null else payRet1.dateTo end)` },
      posName: { field: useActualPositionName
        ? 'ep.factPosName'
        : staffService.getPosFldOnDateSql2(':periodTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      depName: { field: `dep1.name` },
      departmentID: { field: 'ep.departmentID' },
      positionID: { field: 'ep.positionID' },
      orgID: { field: 'num1.orgID' },
      contractorName: { field: 'contrContrAcc1.name' },
      contractorOKPOCode: { field: 'contrContrAcc1.OKPOCode' },
      bankName: { field: 'bank1.name' },
      contrAccountCode: { field: 'contrAcc1.code' },
      orgName: { field: staffService.getOrgFldOnDateSql(':periodTo:', 'num1.orgID', 'name') },
      selfStructDepName: { field: `(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit})` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)

  sqlBuilder.clauses.whereParams.orgIDs = mParams.orgIDs
  sqlBuilder.clauses.whereParams.organizationID = mParams.organizationID
  sqlBuilder.clauses.whereParams.periodIDs = mParams.periodIDs
  sqlBuilder.clauses.whereParams.periodFrom = dateService.shiftDate(mParams.periodFrom)
  sqlBuilder.clauses.whereParams.periodTo = dateService.shiftDate(mParams.periodTo)
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID

  let aggregate = mParams.fieldList.filter(el => el.indexOf('sum(') !== -1)
  sqlBuilder.clauses.orderClause = aggregate.length > 0 || sqlBuilder.clauses.orderClause ? sqlBuilder.clauses.orderClause : sqlBuilder.clauses.orderClause || 'ORDER BY dep1.treePath, dictPos.idxNum, emp1.fullFIO'

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

me.getWhereClause = function (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const depClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':periodTo:')
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:', 'num1.orgID')

  return ` per1.dateFrom <= :periodTo: 
  ${orgClause} 
  ${depClause} 
and per1.dateTo >= :periodFrom: 
and acc1.flagsRec & 4096 = 0
${limitedAccess ? ' AND num1.limitedAccess = 0 ' : ''}`
}
