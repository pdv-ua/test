const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  // const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', ctx.mParams.organizationID) === true
  const fixMonth = settingsService.getByCode('hrVacFixMonth', ctx.mParams.organizationID) || 0
  const hrVacFixMonth = fixMonth || 24

  if (ctx.mParams.includeChildOrgs) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('mi_treePath', 'like', `/${ctx.mParams.organizationID}%`)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: ctx.mParams.dateFrom })
      .selectAsObject()
    ctx.mParams.orgIDs = orgs.map(itm => itm.mi_data_id)
  } else {
    ctx.mParams.orgIDs = [ctx.mParams.organizationID]
  }
  ctx.mParams.orgIDs = ctx.mParams.orgIDs.join(', ')

  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlVac = ` from hr_dictVacationKind where hr_dictVacationKind.ID in (${mParams.vacKindID || -1})`
  const sqlVacationName = sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + hr_dictVacationKind.name ${sqlVac} FOR XML PATH ('')), 1, 2, '')`
    : `(SELECT STRING_AGG(hr_dictVacationKind.name, ', ') ${sqlVac})`
  const lossDateText = sqlDialect.dialect === 'MSSQL2012'
    ? `DATEADD(month, ${hrVacFixMonth}, vacInfo.vpDateFrom) `
    : `(vacInfo.vpDateFrom + '${hrVacFixMonth} month') `

  let runsql
  let sqlText = `SELECT {0} {1}
      FROM hr_employeePosition ep  
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      INNER JOIN hr_employee emp on en.employeeID = emp.ID
      LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID
        and ep.dateTo between pos.mi_dateFrom and pos.mi_dateTo 
        and pos.mi_deleteDate >= '9999-12-31' 
        and pos.state = 'ACTIVE'
      INNER JOIN ${global.hr_empVacationPlan.getVacationInfoSql({
    dictVacationKindID: mParams.vacKindID,
    onDate: mParams.dateFrom,
    orgID: mParams.orgIDs,
    showOverUsedVac: mParams.showOverUsedVac,
    showDetails: mParams.showDetails,
    showFixDays: fixMonth > 0
  })} vacInfo on vacInfo.employeeNumberID  = en.ID  
    {2}
    {3}
    {4}`
  let sqlBuilder = {
    text: sqlText,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      employeeNumberID: { field: 'en.ID' },
      organizationID: { field: 'ep.organizationID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':dateFrom:', 'ep.departmentID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      posID: { field: 'ep.positionID' },
      posParentUnitID: { field: `(select ${sqlDialect.top} parentPos.parentUnitID
        from hr_position parentPos 
        where 
          parentPos.mi_data_id = ep.positionID
          and parentPos.orgID = en.orgID  
          and (parentPos.mi_dateFrom <= en.dateTo or en.dateTo is null)
          and parentPos.mi_dateTo >= en.dateFrom 
          and parentPos.mi_deleteDate >= '9999-12-31' 
          and parentPos.state = 'ACTIVE'
        order by parentPos.mi_dateFrom desc ${sqlDialect.limit}
        )
      ` },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      dayFix: { field: 'vacInfo.dayFix' },
      dayRest: { field: 'vacInfo.dayRest' },
      dayToUse: { field: 'vacInfo.dayToUse' },
      dayCountPlan: { field: 'vacInfo.dayCountPlan' },
      periodValue: { field: mParams.showDetails ? 'vacInfo.periodValue' : 'null' },
      lossDate: { field: mParams.showDetails ? `( case when vacInfo.vpDateFrom is not null then ${lossDateText} else null end)` : 'null' },
      lossDateText: { field: mParams.showDetails ? `( case when vacInfo.vpDateFrom is not null then ${lossDateText} else null end)` : 'null' },
      vacationKind: { field: sqlVacationName },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` }
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
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.whereParams.workPlaceID = ctx.mParams.workPlaceID

  sqlBuilder.clauses.orderClause = mParams.showDetails
    ? sqlBuilder.clauses.orderClause || 'ORDER BY en.tabNum, vacInfo.vpDateFrom, vacInfo.vpdateTo'
    : sqlBuilder.clauses.orderClause || 'ORDER BY en.tabNum'

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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts, ':dateFrom:')
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':dateFrom:')
  const positionTypeClause = mParams.positionType ? `and pos.positionType = '${mParams.positionType}'` : ''
  const psCategoryClause = mParams.psCategory ? `and pos.psCategory = '${mParams.psCategory}'` : ''
  const dictStaffCatClause = mParams.dictStaffCatID ? `and ep.dictStaffCatID = ${mParams.dictStaffCatID} ` : ''
  const workPlaceClause = mParams.workPlace ? `and ep.workPlace = '${mParams.workPlace}' ` : ''

  let catFilter = ''
  if ((mParams.catChiefs || mParams.catOthers) && !(mParams.catChiefs && mParams.catOthers)) {
    if (mParams.catChiefs) {
      catFilter = `and pos.positionCategory = '1'`
    } else {
      catFilter = `and (pos.positionCategory != '1' or pos.positionCategory is null)`
    }
  }

  return ` ep.isActive = 1
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31' 
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo
    ${mParams.vacKindID ? ` and EXISTS (SELECT vpl.ID FROM hr_empVacationPlan vpl 
      INNER JOIN hr_empVacationPeriod vp ON vp.empVacationPlanID = vpl.ID and vp.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_dictVacationKind vk on vk.ID = vpl.dictVacationKindID WHERE vpl.employeeID = emp.ID
        and vpl.mi_deleteDate >= '9999-12-31' and vpl.dictVacationKindID in (${mParams.vacKindID}))` : ''}
    ${orgClause}
    ${depClause}
    ${catFilter}
    ${positionTypeClause}
    ${psCategoryClause}
    ${dictStaffCatClause} 
    ${workPlaceClause}
  `
}
