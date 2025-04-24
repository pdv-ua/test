const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('selectUnionPays')

me.selectUnionPays = ctx => {
  const mParams = ctx.mParams
  mParams.orgIDs = [mParams.organizationID]
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.organizationID) === true
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

  const sqlDialect = entityBaseService.getSQLDialect()

  let runsql
  let sqlBuilder = {
    text: `SELECT {0} {1} 
FROM hr_accrual acc1 
INNER JOIN hr_employeeNumber en
    ON en.ID = acc1.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_employee emp1 ON emp1.ID = en.employeeID AND emp1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_dictPeriod per1 ON per1.ID = acc1.periodCalcID AND per1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_payEl pay1 ON pay1.ID = acc1.payElID
  INNER JOIN hr_method met1 ON met1.ID = pay1.methodID AND met1.code = '32'
  INNER JOIN hr_methodGroup metGr1 ON metGr1.ID = met1.methodGroupID
  LEFT JOIN  hr_employeePosition ep ON 
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :periodTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit} )
  LEFT JOIN hr_department dep1 ON dep1.ID = ${staffService.getDepFldOnDateSql(':periodTo:', 'ep.departmentID', 'ID')} 
  LEFT JOIN hr_position dictPos ON dictPos.ID = ${staffService.getPosFldOnDateSql(':periodTo:', 'ep.positionID', 'ID', null)} 
  LEFT JOIN hr_payRetention payRet1 ON payRet1.ID = acc1.sourceID AND payRet1.mi_deleteDate >= '9999-12-31'
  LEFT JOIN ac_contractor contr1 ON contr1.ID = payRet1.contractorID AND contr1.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_dictPeriod per2 ON per2.ID = acc1.periodSalaryID 
            {2} {3} {4} {5} `,
    clauses: {},
    aliases: {
      'sum([incomeSum])': { field: `COALESCE((select sum(af2.paySum) FROM hr_accrual af2
JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
JOIN hr_methodGroup mgr2 on meth2.methodGroupID = mgr2.ID and mgr2.mi_deleteDate >= '9999-12-31'
where acc1.employeeNumberID = af2.employeeNumberID and mgr2.groupType = 'PAYMENT' and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} 
and (af2.flagsRec & 8192 != 8192) 
and af2.periodSalaryID = (case when pay1.periodType = 'SALARY' then acc1.periodSalaryID else af2.periodSalaryID end) ),0)` },
      'sum([incomeNoSum])': { field: `COALESCE(((SELECT sum(af2.paySum) 
      FROM hr_accrual af2 
      JOIN hr_payEl pe2 ON af2.payElID = pe2.ID AND pe2.mi_deleteDate >= '9999-12-31' 
      JOIN hr_method meth2 ON pe2.methodID = meth2.ID AND meth2.mi_deleteDate >= '9999-12-31' 
      JOIN hr_methodGroup mgr2 ON meth2.methodGroupID = mgr2.ID AND mgr2.mi_deleteDate >= '9999-12-31' 
      WHERE acc1.employeeNumberID = af2.employeeNumberID AND mgr2.groupType = 'PAYMENT' AND af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} 
      and (af2.flagsRec & 8192 != 8192) 
      and af2.periodSalaryID = (case when pay1.periodType = 'SALARY' then acc1.periodSalaryID else af2.periodSalaryID end)) 
      - sum(acc1.baseSum)
      ),0)` },
      'sum([incomeWithSum])': { field: `COALESCE(sum(acc1.baseSum), 0)` },
      'sum([paySum])': { field: `COALESCE (sum(acc1.paySum), 0)` },
      tabNum: { field: 'en.tabNum' },
      fullFIO: { field: 'emp1.fullFIO' },
      payElName: { field: 'pay1.name' },
      incomeSum: { field: `COALESCE((select sum(af2.paySum) FROM hr_accrual af2
JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
JOIN hr_methodGroup mgr2 on meth2.methodGroupID = mgr2.ID and mgr2.mi_deleteDate >= '9999-12-31'
where acc1.employeeNumberID = af2.employeeNumberID and mgr2.groupType = 'PAYMENT' and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} 
and (af2.flagsRec & 8192 != 8192) 
and af2.periodSalaryID = (case when pay1.periodType = 'SALARY' then acc1.periodSalaryID else af2.periodSalaryID end) ),0)` },
      incomeNoSum: { field: `COALESCE(((SELECT sum(af2.paySum) 
      FROM hr_accrual af2 
      JOIN hr_payEl pe2 ON af2.payElID = pe2.ID AND pe2.mi_deleteDate >= '9999-12-31' 
      JOIN hr_method meth2 ON pe2.methodID = meth2.ID AND meth2.mi_deleteDate >= '9999-12-31' 
      JOIN hr_methodGroup mgr2 ON meth2.methodGroupID = mgr2.ID AND mgr2.mi_deleteDate >= '9999-12-31' 
      WHERE acc1.employeeNumberID = af2.employeeNumberID AND mgr2.groupType = 'PAYMENT' AND af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} 
      and (af2.flagsRec & 8192 != 8192) 
      and af2.periodSalaryID = (case when pay1.periodType = 'SALARY' then acc1.periodSalaryID else af2.periodSalaryID end)) 
      - sum(acc1.baseSum)
      ),0)` },
      incomeWithSum: { field: `COALESCE(sum(acc1.baseSum), 0)` },
      rate: { field: 'acc1.rate' },
      paySum: { field: `COALESCE (sum(acc1.paySum), 0)` },
      posName: { field: useActualPositionName
          ? 'ep.factPosName'
          : staffService.getPosFldOnDateSql2(':periodTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      depName: { field: `dep1.name` },
      periodName: { field: `per2.description` },
      departmentID: { field: 'ep.departmentID' },
      orgID: { field: 'en.orgID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':periodTo:', 'en.orgID', 'name') },
      selfStructDepName: { field: `(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit})` },
      positionID: { field: 'ep.positionID' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)

  sqlBuilder.clauses.whereParams.organizationID = mParams.organizationID
  sqlBuilder.clauses.whereParams.periodIDs = mParams.periodIDs
  sqlBuilder.clauses.whereParams.periodFrom = dateService.shiftDate(mParams.periodFromDateFrom)
  sqlBuilder.clauses.whereParams.periodTo = dateService.shiftDate(mParams.periodToDateTo)
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID

  sqlBuilder.clauses.groupClause = 'GROUP BY en.orgID, ep.organizationID, acc1.employeeNumberID, en.tabNum, emp1.fullFIO, pay1.ID, pay1.name, acc1.periodSalaryID, per2.description, acc1.rate, dictPos.name, dep1.name, ep.departmentID, dep1.treePath, ep.positionID, dictPos.idxNum, pay1.periodType, ep.factPosName, ep.dictPositionID'

  let aggregate = mParams.fieldList.filter(el => el.indexOf('sum(') !== -1)
  sqlBuilder.clauses.orderClause = aggregate.length > 0 || sqlBuilder.clauses.orderClause ? sqlBuilder.clauses.orderClause : sqlBuilder.clauses.orderClause || 'ORDER BY dep1.treePath, dictPos.idxNum, emp1.fullFIO'
  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '', '')

    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }

  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.groupClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  if (aggregate.length > 0) {
    runsql = `SELECT SUM(accrual."sum([incomeSum])") as "sum([incomeSum])", SUM(accrual."sum([incomeNoSum])") as "sum([incomeNoSum])", 
       SUM(accrual."sum([incomeWithSum])") as "sum([incomeWithSum])", SUM(accrual."sum([paySum])") as "sum([paySum])" from (${runsql}) accrual`
  }
  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false

  return true
}

me.getWhereClause = function (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const depClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':periodTo:')
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:')

  return ` 
  per1.ID${entityBaseService.getInExpression('periodIDs')}
  ${orgClause} 
  ${depClause} 
  AND (acc1.flagsRec & 8192 != 8192)
 ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}`
}
