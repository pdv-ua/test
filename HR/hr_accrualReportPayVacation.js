const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const staffService = require('./modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('getPayVacationDataGrid')

me.getPayVacationDataGrid = function (ctx) {
  const mParams = ctx.mParams
  mParams.periodFrom = dateService.shiftDate(mParams.periodFromDateFrom)
  mParams.periodTo = dateService.shiftDate(mParams.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
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

  let runsql
  let sqlBuilder = {
    text: ` SELECT {0} {1}
            FROM hr_accrual acc
JOIN hr_employeeNumber en on en.ID = acc.employeeNumberID
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN hr_payEl pl on acc.payElID = pl.ID
JOIN hr_method meth on pl.methodID = meth.ID
JOIN hr_methodGroup g ON meth.methodGroupID = g.ID
JOIN hr_dictPeriod salperiod on salperiod.ID = acc.periodSalaryID
JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1  
and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
where ep2.isActive = 1
and ep2.mi_deleteDate >= '9999-12-31' 
and ep2.employeeNumberID = ep.employeeNumberID    
and ep2.dateFrom <= :periodTo: 
order by ep2.dateFrom desc ${sqlDialect.limit})
LEFT JOIN hr_department dep on dep.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2              
Where              
dep2.mi_data_id = ep.departmentID              
and dep2.orgID = en.orgID 
 and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end)  
and dep2.mi_deleteDate >= '9999-12-31'              
and dep2.state = 'ACTIVE'             
order by dep2.mi_dateFrom desc ${sqlDialect.limit}            
) 
LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
Where              
pos2.mi_data_id = ep.positionID              
and pos2.orgID = en.orgID 
and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end) 
and pos2.mi_deleteDate >= '9999-12-31'              
and pos2.state = 'ACTIVE'             
order by pos2.mi_dateFrom desc ${sqlDialect.limit}              
) 
            {2} {3} {4}`,
    clauses: {},
    aliases: {
      'sum([paySum])': { field: 'sum(acc.paySum)' },
      'sum([days])': { field: 'sum(acc.days)' },
      tabNum: { field: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      oblPeriod: { field: 'salperiod.name' },
      payElName: { field: 'pl.description' },
      payElID: { field: 'pl.ID' },
      payElCode: { field: 'pl.code' },
      depName: { field: 'dep.name' },
      baseSum: { field: 'acc.baseSum' },
      days: { field: 'acc.days' },
      paySum: { field: 'acc.paySum' },
      posName: { field: useActualPositionName
        ? 'ep.factPosName'
        : staffService.getPosFldOnDateSql2(':periodTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      period: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE when meth.code is not null and meth.code = '13' and (datepart(year, acc.dateTo) = 9999 or acc.dateTo is null) and acc.dateFrom is not null then CONCAT('з ', format(acc.dateFrom, 'dd.MM.yyyy'))
  when meth.code is not null and meth.code = '13' and acc.dateFrom is null and acc.dateTo is not null and datepart(year, acc.dateTo) != 9999 then CONCAT('по ', format(acc.dateTo, 'dd.MM.yyyy'))
  when meth.code is not null and meth.code = '13' and acc.dateFrom is not null and acc.dateTo is not null and datepart(year, acc.dateTo) != 9999 then CONCAT('з ', format(acc.dateFrom, 'dd.MM.yyyy'), ' по ', format(acc.dateTo, 'dd.MM.yyyy'))
  ELSE '' END)`
        : `(CASE when meth.code is not null and meth.code = '13' and (Extract(YEAR from acc.dateTo) = 9999 or acc.dateTo is null) and acc.dateFrom is not null then CONCAT('з ', to_char(acc.dateFrom, 'DD.MM.YYYY'))
  when meth.code is not null and meth.code = '13' and acc.dateFrom is null and acc.dateTo is not null and Extract(YEAR from acc.dateTo) != 9999 then CONCAT('по ', to_char(acc.dateTo, 'DD.MM.YYYY'))
  when meth.code is not null and meth.code = '13' and acc.dateFrom is not null and acc.dateTo is not null and Extract(YEAR from acc.dateTo) != 9999 then CONCAT('з ', to_char(acc.dateFrom, 'DD.MM.YYYY'), ' по ', to_char(acc.dateTo, 'DD.MM.YYYY'))
  ELSE '' END)` },
      dateFrom: { field: `(CASE when meth.code is not null and meth.code = '13' and acc.dateTo is not null then acc.dateFrom ELSE null END)` },
      dateTo: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE when meth.code is not null and meth.code = '13' and not (datepart(year, acc.dateTo) = 9999 or acc.dateTo is null) then acc.dateTo ELSE null END)`
        : `(CASE when meth.code is not null and meth.code = '13' and not (Extract(YEAR from acc.dateTo) = 9999 or acc.dateTo is null) then acc.dateTo ELSE null END)`
      },
      tabNumSort: { field: 'en.tabNumSort' },
      departmentID: { field: 'ep.departmentID' },
      orgID: { field: 'en.orgID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':periodTo:', 'en.orgID', 'name') },
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

  // sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.orgIDs = mParams.orgIDs
  sqlBuilder.clauses.whereParams.organizationID = mParams.organizationID
  sqlBuilder.clauses.whereParams.periodIDs = mParams.periodIDs
  sqlBuilder.clauses.whereParams.periodFrom = mParams.periodFrom
  sqlBuilder.clauses.whereParams.periodTo = mParams.periodTo
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID

  let aggregate = mParams.fieldList.filter(el => el.indexOf('sum(') !== -1)
  sqlBuilder.clauses.orderClause = aggregate.length > 0 ? sqlBuilder.clauses.orderClause : sqlBuilder.clauses.orderClause || 'ORDER BY dep.idxNum, pos.idxNum, emp.fullFIO, pl.name, salperiod.dateFrom'

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
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:')

  let whereClause = `
acc.periodCalcID${entityBaseService.getInExpression('periodIDs')}
${orgClause}
${depClause}
and (g.code = '4' OR meth.code = '16')
and en.empWorkPlace is NULL   
and (acc.flagsRec & 8192 != 8192)
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
and en.mi_deleteDate >= '9999-12-31' 
and ep.mi_deleteDate >= '9999-12-31'
and emp.mi_deleteDate >= '9999-12-31'
    `
  return whereClause
}
