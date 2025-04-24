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
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.orgID) === true
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
      GROUP BY en.orgID, ep.organizationID, af.employeeNumberID, ep.positionID, en.tabNum, emp.lastName, emp.firstName, emp.middleName, af.periodSalaryID, per.name, emp.fullFIO, 
      dep.treePath, pos.idxNum, dep.name, pos.name, ep.departmentID, ep.positionID, ep.factPosName, ep.dictPositionID    
      {3} {4}
    `,
    clauses: {},
    aliases: {
      fullFIO: { field: 'emp.fullFIO' },
      tabNum: { field: 'en.tabNum' },
      posName: { field: useActualPositionName
        ? 'ep.factPosName'
        : staffService.getPosFldOnDateSql2(':periodDateTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      depName: { field: 'dep.name' },
      period: { field: 'per.name' },
      paySum: { field: `(select sum(af2.paySum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
 JOIN hr_methodGroup mgr2 on meth2.methodGroupID = mgr2.ID and mgr2.mi_deleteDate >= '9999-12-31'
 where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and mgr2.groupType = 'PAYMENT' and (af2.flagsRec & 8192 = 0) and af.periodSalaryID=af2.periodSalaryID )` },
      taxSum: { field: `(select sum(af2.paySum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and meth2.code = '27'  and (af2.flagsRec & 8192 = 0) and af.periodSalaryID=af2.periodSalaryID)
` },
      baseSum: { field: `(select sum(af2.baseSum) FROM hr_accrual af2 
 JOIN hr_payEl pe2 on af2.payElID = pe2.ID and pe2.mi_deleteDate >= '9999-12-31'
 JOIN hr_method meth2 on pe2.methodID = meth2.ID and meth2.mi_deleteDate >= '9999-12-31'
 where af.employeeNumberID = af2.employeeNumberID and af2.periodCalcID${entityBaseService.getInExpression('periodIDs')} and meth2.code = '27'  and (af2.flagsRec & 8192 = 0) and af.periodSalaryID=af2.periodSalaryID)
` },
      departmentID: { field: 'ep.departmentID' },
      orgID: { field: 'en.orgID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':periodDateTo:', 'en.orgID', 'name') },
      selfStructDepName: { field: `(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and d.state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit})` },
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
  sqlBuilder.clauses.whereParams.periodIDs = mParams.periodIDs
  sqlBuilder.clauses.whereParams.periodDateTo = mParams.periodDateTo

  if (mParams.auditOrganization) {
    sqlBuilder.clauses.whereParams.auditOrganization = mParams.auditOrganization
  }
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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeSubDep, ':periodDateTo:')
  const orgClauseAf = staffService.getOrganizationClause(mParams.organizationID, mParams.includeSubOrg, ':periodDateTo:', 'af.orgID')
  const orgClauseEn = staffService.getOrganizationClause(mParams.organizationID, mParams.includeSubOrg, ':periodDateTo:')

  return ` af.periodCalcID${entityBaseService.getInExpression('periodIDs')}
    ${orgClauseAf} 
    ${orgClauseEn} 
 AND (af.flagsRec & 8192 = 0) and (mgr.groupType = 'PAYMENT' or meth.code = '27') 
and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 
 where ep2.employeeNumberID = en.ID and ep2.organizationID = en.orgID  
 and ep2.isActive = 1 and ep2.dateFrom <= :periodDateTo: and ep2.mi_deleteDate >= '9999-12-31'
 order by ep2.dateFrom desc ${sqlDialect.limit})
  ${depClause} 
 and en.mi_deleteDate >= '9999-12-31' and emp.mi_deleteDate >= '9999-12-31' 
 ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
  `
}
