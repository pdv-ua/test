const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const timService = require('./modules/timService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()

  const cityName = `(Select ${sqlDialect.top} ordDet.cityName from hr_empOrderMissionDet ordDet 
       where ts.orderID = ordDet.orderID and ((ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
  where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) 
       or ordDet.employeeNumberID = ts.employeeNumberID) and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as cityName
      `
  const destOrganizationName = `(Select ${sqlDialect.top} ordDet.destOrganizationName from hr_empOrderMissionDet ordDet 
       where ts.orderID = ordDet.orderID and ((ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
  where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) or ordDet.employeeNumberID = ts.employeeNumberID) and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as destOrganizationName
        `

  const missionDateFrom = `(Select ${sqlDialect.top} ordDet.dateFrom from  hr_empOrderMissionDet ordDet 
      where ts.orderID = ordDet.orderID and ((ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
  where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) or ordDet.employeeNumberID = ts.employeeNumberID) and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as missionDateFrom
        `

  const missionDateTo = `(Select ${sqlDialect.top} ordDet.dateTo from  hr_empOrderMissionDet ordDet 
      where ts.orderID = ordDet.orderID and ((ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
  where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) or ordDet.employeeNumberID = ts.employeeNumberID) and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as missionDateTo
        `

  const missionIsNeedReport = `(Select ${sqlDialect.top} ordDet.isNeedReport from  hr_empOrderMissionDet ordDet 
      where ts.orderID = ordDet.orderID and ((ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
  where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) or ordDet.employeeNumberID = ts.employeeNumberID) and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as missionIsNeedReport
        `

  const reportDate = `(Select ${sqlDialect.top} es.reportDate from  hr_employeeMission es 
      where ts.orderID = es.orderID and es.mi_deleteDate >= '9999-12-31' and es.employeeNumberID = ts.employeeNumberID ${sqlDialect.limit}) as reportDate `

  const isInsideCountry = `(Select ${sqlDialect.top}          
    case when ordDet.isInsideCountry = 1 then 'Так' else 'Нi' end
    from  hr_empOrderMissionDet ordDet where ts.orderID = ordDet.orderID and (
    (ordDet.isGroup = 1 and ts.employeeNumberID = (select ${sqlDialect.top} ordEmpDet.employeeNumberID from hr_empOrderEmployeeDet ordEmpDet
    where ordEmpDet.mi_deleteDate >= '9999-12-31'
    and ordEmpDet.paraID = ordDet.ID
    and ts.employeeNumberID = ordEmpDet.employeeNumberID ${sqlDialect.limit})) 
    or ordDet.employeeNumberID = ts.employeeNumberID)
    and ordDet.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as isInsideCountry`

  const misFields = `${cityName}, ${destOrganizationName}, ${missionDateFrom}, ${missionDateTo}, ${isInsideCountry}, ${missionIsNeedReport}, ${reportDate}`

  let runsql
  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN ${timService.getTimeSheetPeriodDateSql({ dateFromPar: 'dateFrom', dateToPar: 'dateTo', orgIDPar: ctx.mParams.organizationID, groupCode: 'LST_TRIP', addFieldsSql: misFields, includeChildOrgs: ctx.mParams.includeChildOrgs })} ts
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
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      cityName: { field: 'ts.cityName' },
      destOrganizationName: { field: 'ts.destOrganizationName' },
      missionDateFrom: { field: 'ts.missionDateFrom' },
      missionDateTo: { field: 'ts.missionDateTo' },
      isInsideCountry: { field: 'ts.isInsideCountry' },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :dateTo:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posCategory: { field: staffService.getPosCatShortNameByEpIdSql('ep.positionID', ':dateTo:') },
      rankCur: { field: staffService.getRankNameSql('en', ':dateTo:') },
      reportDate: { field: 'ts.reportDate' },
      missionIsNeedReport: { field: 'ts.missionIsNeedReport' },
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
  sqlBuilder.clauses.whereParams.onDate = dateService.shiftDate(ctx.mParams.onDate)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY missionDateFrom, fullFIO'

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

  return ` en.mi_deleteDate >= '9999-12-31' 
  and (en.dateTo > :dateFrom: or en.dateTo is null)
  ${workPlaceClause} 
  ${orgClause}
  ${depClause}     
  `
}
