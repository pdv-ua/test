const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
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
  let runsql
  let sqlText = ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      INNER JOIN hr_employee emp on en.employeeID = emp.ID
      LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID
        and ep.dateTo between pos.mi_dateFrom and pos.mi_dateTo 
        and pos.mi_deleteDate >= '9999-12-31' 
        and pos.state = 'ACTIVE'
    {2}
    {3}
    {4}`

  let sqlBuilder = {
    text: sqlText,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      employeePositionID: { field: 'ep.ID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      depID: { field: 'ep.departmentID' },
      posName: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateFrom:', 'ep.departmentID', 'name') },
      posID: { field: 'ep.positionID' },
      posParentUnitID: { field: `(select ${sqlDialect.top} parentPos.parentUnitID from hr_position parentPos 
        Where 
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
      // firstName: { field: 'emp.firstName' },
      // lastName: { field: 'emp.lastName' },
      // middleName: { field: 'emp.middleName' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      dayRest: { field: global['hr_empVacationPlan'].getAvailableVacationDaysSql({
        dictVacationKindID: mParams.vacKindID,
        onDate: mParams.dateFrom,
        employeeNumberAlias: 'en.ID',
        orgID: mParams.orgIDs
      }) },
      vacationKind: { field: `(select hr_dictVacationKind.name from hr_dictVacationKind where hr_dictVacationKind.ID = ${mParams.vacKindID ? mParams.vacKindID : -1})` },
      vacationKindID: { field: `(select hr_dictVacationKind.ID from hr_dictVacationKind where hr_dictVacationKind.ID = ${mParams.vacKindID ? mParams.vacKindID : -1})` }
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

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY en.tabNum'

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
  let year = mParams.year || new Date().getFullYear()
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts, ':dateFrom:')
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':dateFrom:')

  const positionTypeClause = mParams.positionType ? `and pos.positionType = '${mParams.positionType}'` : ''
  const psCategoryClause = mParams.psCategory ? `and pos.psCategory = '${mParams.psCategory}'` : ''
  let catFilter = ''
  if ((mParams.catChiefs || mParams.catOthers) && !(mParams.catChiefs && mParams.catOthers)) {
    if (mParams.catChiefs) {
      catFilter = `and pos.positionCategory = '1'`
    } else {
      catFilter = `and pos.positionCategory != '1'`
    }
  }

  return ` ep.isActive = 1
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31' 
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo
    and not EXISTS (select 1 from hr_vacationSchedule csh where csh.employeePositionID = ep.ID and csh.year = ${year} and csh.state != 'NEW' and csh.mi_deleteDate >= '9999-12-31')
    ${depClause}
    ${orgClause}
    ${catFilter}
    ${positionTypeClause}
    ${psCategoryClause}
    ${mParams.vacKindID ? ` and EXISTS (SELECT vpl.ID FROM hr_empVacationPlan vpl 
      INNER JOIN hr_empVacationPeriod vp ON vp.empVacationPlanID = vpl.ID and vp.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_dictVacationKind vk on vk.ID = vpl.dictVacationKindID WHERE vpl.employeeID = emp.ID
        and vpl.mi_deleteDate >= '9999-12-31' and vpl.dictVacationKindID = ${mParams.vacKindID})` : ''}
        and ${global.hr_empVacationPlan.getAvailableVacationDaysSql({
    dictVacationKindID: mParams.vacKindID,
    onDate: mParams.dateFrom,
    employeeNumberAlias: 'en.ID',
    orgID: mParams.orgIDs
  })} > 0 
  `
}
