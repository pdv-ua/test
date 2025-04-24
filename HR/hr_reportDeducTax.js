const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const staffService = require('./modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const periodList = JSON.parse(mParams.periodList)
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.organizationID) === true
  let runsql
  let sqlBuilder = {
    text: `
      select {0} {1}
      FROM hr_accrual af 
JOIN hr_payEl pe on af.payElID = pe.ID and pe.mi_deleteDate >= '9999-12-31'
LEFT JOIN hr_method meth on pe.methodID = meth.ID and meth.mi_deleteDate >= '9999-12-31'
LEFT JOIN hr_methodGroup mgr on meth.methodGroupID = mgr.ID and mgr.mi_deleteDate >= '9999-12-31' 
JOIN hr_employeeNumber en on af.employeeNumberID = en.ID 
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN hr_employeePosition ep on en.ID = ep.employeeNumberID and ep.isActive = 1 
  and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom 
  and ep.dateFrom <= :periodDateTo: 
  and ep.mi_deleteDate >= '9999-12-31' 
  and ep.isActive = 1 
  and ep.organizationID = en.orgID 
JOIN hr_dictPeriod per on af.periodSalaryID = per.ID and per.mi_deleteDate >= '9999-12-31' 
LEFT JOIN hr_department dep on dep.mi_data_id = ep.departmentID 
and dep.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2              
  Where               
  dep2.mi_data_id = ep.departmentID                
  and dep2.orgID = en.orgID                
  and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodDateTo:) then :periodDateTo: 
 when en.dateTo <= :periodDateTo: then en.dateTo 
 end)               
  and dep2.mi_deleteDate >= '9999-12-31'               
  and dep2.state = 'ACTIVE'              
  order by dep2.mi_dateFrom desc ${sqlDialect.limit})   
LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID              
  and pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
Where              
pos2.mi_data_id = ep.positionID              
and pos2.orgID = en.orgID               
and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodDateTo:) then :periodDateTo: 
 when en.dateTo <= :periodDateTo: then en.dateTo 
 end)           
and pos2.mi_deleteDate >= '9999-12-31'              
and pos2.state = 'ACTIVE'             
order by pos2.mi_dateFrom desc ${sqlDialect.limit}             
) 
      {2} 
      GROUP BY af.employeeNumberID, af.periodSalaryID, ep.positionID, en.tabNum, emp.lastName, emp.firstName, emp.middleName, per.name, per.dateFrom, emp.fullFIO, 
      dep.treePath, pos.idxNum, dep.name, pos.name, pos.idxNum, ep.departmentID, ep.positionID, ep.organizationID, ep.factPosName, ep.dictPositionID
      {3} {4}
    `,
    clauses: {},
    aliases: {
      fullFIO: { field: 'emp.fullFIO' },
      tabNum: { field: 'en.tabNum' },
      period: { field: 'per.name' },
      periodDateFrom: { field: 'per.dateFrom' },
      posName: { field: useActualPositionName
        ? 'ep.factPosName'
        : staffService.getPosFldOnDateSql2(':periodDateTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      depName: { field: 'dep.name' },
      paySum: { field: `(select sum(af2.paySum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
 JOIN hr_methodGroup mgr2 on meth2.methodGroupID = mgr2.ID and mgr2.mi_deleteDate >= '9999-12-31'
 where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and af.periodSalaryID = af2.periodSalaryID and mgr2.groupType = 'PAYMENT'  and (af2.flagsRec & 8192 = 0))` },
      taxSum: { field: `(select sum(af2.paySum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and af.periodSalaryID = af2.periodSalaryID and meth2.code = '26' and (af2.flagsRec & 8192 = 0)) 
` },
      baseSum: { field: `(select sum(af2.baseSum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
 where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and  af.periodSalaryID = af2.periodSalaryID and meth2.code = '26' and (af2.flagsRec & 8192 = 0))
` },
      benefitsSum: { field: `(select sum(tia.privilegeSum) FROM hr_taxIndividAcc tia 
 JOIN hr_accrual af2 on tia.accrualID = af2.ID join hr_payEl pe2 on pe2.ID = af2.payElID
join hr_method m2 on m2.ID = pe2.methodID and m2.code = '26' 
 where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and  af.periodSalaryID = af2.periodSalaryID and (af2.flagsRec & 8192 = 0))
` },
      posIdxNum: { field: `pos.idxNum` },
      departmentID: { field: 'ep.departmentID' },
      orgName: { field: `(select ${sqlDialect.top} org.name from hr_organization org where org.mi_data_id = ep.organizationID and org.state = 'ACTIVE' AND org.mi_deleteDate >= '9999-12-31' order by org.mi_dateTo desc ${sqlDialect.limit})` },
      orgID: { field: 'ep.organizationID' },
      positionID: { field: 'ep.positionID' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = mParams.organizationID
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID
  sqlBuilder.clauses.whereParams.periodIDs = periodList.map(o => o.ID)
  sqlBuilder.clauses.whereParams.periodDateTo = mParams.periodDateTo
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY dep.treePath, pos.idxNum, emp.fullFIO'

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

me.getWhereClause = function (mParams, sqlDialect) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let deptClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeSubDep, ':periodDateTo:')
  let orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeSubOrg, ':periodDateTo:')
  let aforgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeSubOrg, ':periodDateTo:', 'af.orgID')

  return `
 af.periodCalcID${entityBaseService.getInExpression('periodIDs')}
 and (af.flagsRec & 8192 = 0)
 and (mgr.groupType = 'PAYMENT' or meth.code = '26') 
 and en.mi_deleteDate >= '9999-12-31' 
 ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
 and emp.mi_deleteDate >= '9999-12-31' 
 and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 
 where ep2.employeeNumberID = en.ID and ep2.organizationID = en.orgID
  and ep2.isActive = 1 and ep2.dateFrom <= :periodDateTo: and ep2.mi_deleteDate >= '9999-12-31'
 order by ep2.dateFrom desc ${sqlDialect.limit}
  )
  ${deptClause} 
  ${orgClause}
  ${aforgClause}
  `
}
