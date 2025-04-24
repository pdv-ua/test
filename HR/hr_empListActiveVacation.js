const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const timService = require('./modules/timService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN ${timService.getTimeSheetPeriodDateSqlEx({ noHoliday: false, dateFromPar: 'dateFrom', dateToPar: 'dateTo', orgID: ctx.mParams.organizationID, groupCode: 'LST_VACATION', includeChildOrgs: ctx.mParams.includeChildOrgs, showDetails: ctx.mParams.showDetails })} ts
        ON ts.employeeNumberID = en.ID 
    LEFT JOIN  hr_employeePosition ep ON 
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :dateTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit})  
    LEFT JOIN ubm_enum e_workPlace ON e_workPlace.code = ep.workPlace
        and e_workPlace.eGroup = 'HR_WORKER_PLACE' 
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      dictVacationKindName: { field: 'ts.vacKindName' },
      dateFrom: { field: 'ts.vacDateFrom' },
      dateTo: { field: 'ts.vacDateTo' },
      vacDayCount: { field: 'ts.vacDayCount' },
      periodValue: { field: mParams.showDetails ? 'ts.periodValue' : 'null' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :dateTo:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posCategory: { field: staffService.getPosCatShortNameByEpIdSql('ep.positionID', ':dateTo:') },
      rankCur: { field: staffService.getRankNameSql('en', ':dateTo:') },
      workPlaceName: { field: 'e_workPlace.name' },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = mParams.dateTo
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY ts.vacDateFrom, emp.fullFIO'

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

me.getWhereClause = function (mParams) {
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` en.mi_deleteDate >= '9999-12-31' 
  ${workPlaceClause} 
  and (en.dateTo > :dateFrom: or en.dateTo is null) 
  ${orgClause}
  ${depClause}     
  `
}
