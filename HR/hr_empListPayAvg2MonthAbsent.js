const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: `SELECT {0} {1} 
FROM hr_employeeNumber en 
JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID and ep.isActive = 1 
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN tim_timeSheet tim on en.ID = tim.employeeNumberID and tim.isActive = 1 and tim.dateWork = :dateFrom: and tim.mi_deleteDate >= '9999-12-31' 
JOIN hr_dictTimeCost timeCoast on timeCoast.ID = tim.factTimeCostID and timeCoast.mi_deleteDate >= '9999-12-31' 
JOIN hr_dictTimeCostGroup tcGroup on tcGroup.dictTimeCostID = timeCoast.ID 
JOIN hr_dictTimeGroup timeGroup on timeGroup.ID = tcGroup.dictTimeGroupID 
{2} {3} {4} `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      depName: { field: staffService.getDepNameByIDSql() },
      posName: { field: staffService.getPosNameByIDSql() },
      actualPositionName: { field: 'ep.factPosition' },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      dayCount: { field: `
      (CASE 
       WHEN tim.orderID is not null
       THEN 
        (SELECT ${sqlDialect.dialect === 'MSSQL2012' ? ` DATEDIFF(day, min(tim2.dateWork), max(tim2.dateWork))` : `date_part('days', max(tim2.dateWork) - min(tim2.dateWork))`} + 1 
         from tim_timeSheet tim2 where tim2.employeeNumberID = en.ID and tim2.orderID = tim.orderID)     
       END
       ) 
      ` },
      absentDateFrom: { field: `
      (CASE 
       WHEN tim.orderID is not null
       THEN 
        (SELECT min(tim2.dateWork) from tim_timeSheet tim2 where tim2.employeeNumberID = en.ID and tim2.orderID = tim.orderID)       
       END
       ) 
      ` },
      absentDateTo: { field: `
      (CASE 
       WHEN tim.orderID is not null
       THEN 
        (SELECT max(tim2.dateWork) from tim_timeSheet tim2 where tim2.employeeNumberID = en.ID and tim2.orderID = tim.orderID)       
       END
       ) 
       ` },
      dictTimeCostName: { field: 'timeCoast.name' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and ep.isActive = 1
    and en.dateFrom <= :onDate:
    and (en.dateTo >= :onDate: or en.dateTo is null)
    and ep.dateFrom <= :onDate:
    and (ep.dateTo >= :onDate: or ep.dateTo is null) 
    and timeGroup.code = 'LST_AVGPAYMENT' 
    ${workPlaceClause} 
    ${orgClause}
    ${depClause}     
    `
}
