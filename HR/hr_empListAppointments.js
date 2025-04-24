const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')

me.entity.addMethod('search')
me.entity.addMethod('searchMtCountSum')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const params = ctx.mParams
  let runsql
  params.dictFundSourseList = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : []
  params.dictStaffCatList = params.dictStaffCatID.length ? params.dictStaffCatID.split(',').map(o => Number(o)) : []
  params.workPlaceList = params.workPlace.length ? params.workPlace.split(',') : []

  const sqlBuilder = {
    text:
        ` SELECT {0} {1}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
        LEFT JOIN hr_empPosFundSource epfs ON epfs.employeePositionID = ep.ID AND epfs.mi_deleteDate >= '9999-12-31'
      {2} 
      {3} 
      {4}`,
    clauses: {},
    aliases: {
      dictFundSourceIDName: { field: `(SELECT ${sqlDialect.top} fs.description FROM ac_fundSource fs WHERE epfs.dictFundSourceID = fs.ID AND fs.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictFundSourceMtCount: { field: `epfs.mtCount` },
      dictPositionGroupIDName: { field: `(select ${sqlDialect.top} dpg.name from hr_position pos left join hr_dictPositionGroup dpg on dpg.ID = pos.dictPositionGroupID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      tabNum: { field: 'en.tabNum' },
      tabNumSort: { field: 'en.tabNumSort' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      lastName: { field: 'emp.lastName' },
      firstName: { field: 'emp.firstName' },
      middleName: { field: 'emp.middleName' },
      sexType: { field: 'emp.sexType' },
      taxCode: { field: 'emp.taxCode' },
      depName: { field: staffService.getDepFldOnDateSql(':dateFrom:', 'ep.departmentID', 'name') },
      dictPositionName: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      posStaffName: { field: `(select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit})` },
      dictWagePayName: { field: `(select ${sqlDialect.top} wp.name from hr_position pos left join hr_dictWagePay wp on pos.dictWagePayID = wp.ID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit})` },
      dateFrom: { field: 'ep.dateFrom' },
      dateToEmpty: { field: sqlDialect.dialect === 'MSSQL2012' ? `(CASE year(ep.dateTo) WHEN 9999 THEN null ELSE ep.dateTo END)` : `(CASE Extract(YEAR from ep.dateTo) WHEN 9999 THEN null ELSE ep.dateTo END)` },
      dateNew: { field: 'ep.dateNew' },
      workScheduleName: { field: `(select ${sqlDialect.top} dict.name from hr_position pos left join hr_workSchedule dict on dict.ID = pos.workScheduleID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      mtCount: { field: 'ep.mtCount' },
      dictStaffCatName: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ep.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      workerType: { field: 'ep.workerType' },
      workPlace: { field: 'ep.workPlace' },
      dictTrialPeriodIDName: { field: `(select ${sqlDialect.top} dictTP.name from hr_dictTrialPeriod dictTP where dictTP.id = (SELECT ${sqlDialect.top} dictTrialPeriodID FROM hr_employeeTrialPeriod tp WHERE tp.employeeNumberID = ep.employeeNumberID AND tp.mi_deleteDate >= '9999-12-31' AND (tp.employeePositionID=ep.ID OR tp.positionID=ep.positionID OR tp.employeePositionID IS NULL OR tp.positionID IS NULL) ORDER BY tp.dateFrom DESC ${sqlDialect.limit}) and dictTP.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dateTrialEnd: { field: `(SELECT ${sqlDialect.top} dateTrialEnd FROM hr_employeeTrialPeriod tp WHERE tp.employeeNumberID = ep.employeeNumberID AND tp.mi_deleteDate >= '9999-12-31' AND (tp.employeePositionID = ep.ID OR tp.positionID = ep.positionID OR tp.employeePositionID IS NULL OR tp.positionID IS NULL) ORDER BY tp.dateFrom DESC ${sqlDialect.limit})` },
      dictCategoryECBIDName: { field: `(select ${sqlDialect.top} dictCECV.name from hr_dictCategoryECB dictCECV where dictCECV.id = ep.dictCategoryECBID and dictCECV.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictCostTypeDescription: { field: `(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit})` },
      contractType: { field: 'ep.contractType' },
      accountIDDescription: { field: `(select ${sqlDialect.top} acc.description from gl_account acc where acc.id = ep.accountID and acc.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictContractKindIDName: { field: `(select ${sqlDialect.top} dictCK.name from hr_dictContractKind dictCK where dictCK.id = ep.dictContractKindID and dictCK.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictTarifCoeffIDName: { field: `(select ${sqlDialect.top} dictTC.name from hr_dictTarifCoeff dictTC where dictTC.id = ep.dictTarifCoeffID and dictTC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      orderIDDescription: { field: `(select ${sqlDialect.top} o1.description from hr_order o1 where o1.id = ep.orderID and o1.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      changeOrderIDDescription: { field: `(select ${sqlDialect.top} o2.description from hr_order o2 where o2.id = ep.changeOrderID and o2.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      payElIDName: { field: `(select ${sqlDialect.top} payEl.name from hr_payEl payEl where payEl.id = ep.payElID and payEl.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictRankIDName: { field: `(select ${sqlDialect.top} dictR.name from hr_dictRank dictR where dictR.id = ep.dictRankID and dictR.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'ep.accrualSum' },
      raiseSalary: { field: 'ep.raiseSalary' },
      isIndex: { field: 'ep.isIndex' },
      vacancyDateFrom: { field: `(select ${sqlDialect.top} a.dateFrom from hr_empLongTermAbsc a where a.employeeNumberID = ep.employeeNumberID and a.dateFrom <= ${sqlDialect.dialect === 'MSSQL2012' ? 'GETDATE()' : 'current_date'} and a.dateTo >= ${sqlDialect.dialect === 'MSSQL2012' ? 'GETDATE()' : 'current_date'} and a.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      vacancyDateToEmpty: { field: `(select (case ${sqlDialect.dialect === 'MSSQL2012' ? 'year(t.dateTo)' : 'Extract(YEAR from t.dateTo)'} when 9999 then null else t.dateTo end) from (select ${sqlDialect.top} a.dateTo dateTo from hr_empLongTermAbsc a where a.employeeNumberID = ep.employeeNumberID and a.organizationID = ep.organizationID and a.dateFrom <= ${sqlDialect.dialect === 'MSSQL2012' ? 'GETDATE()' : 'current_date'} and a.dateTo >= ${sqlDialect.dialect === 'MSSQL2012' ? 'GETDATE()' : 'current_date'} and a.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) t)` },
      isResponsible: { field: 'ep.isResponsible' },
      planDateTo: { field: 'ep.planDateTo' },
      employeeNumberID: { field: 'ep.employeeNumberID' },
      employeeID: { field: 'ep.employeeID' },
      isFactWorkSchedule: { field: 'ep.isFactWorkSchedule' },
      positionCategory: { field: `(select ${sqlDialect.top} pos.positionCategory from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      positionDictStaffCatIDName: { field: `(select ${sqlDialect.top} dict.name from hr_position pos left join hr_dictStaffCat dict on dict.ID = pos.dictStaffCatID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      positionDictStaffSubCatIDName: { field: `(select ${sqlDialect.top} dict.name from hr_position pos left join hr_dictStaffSubCat dict on dict.ID = pos.dictStaffSubCatID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      psCategory: { field: `(select ${sqlDialect.top} pos.psCategory from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      positionDictStatePayIDName: { field: `(select ${sqlDialect.top} dict.name from hr_position pos left join hr_dictStatePay dict on dict.ID = pos.dictStatePayID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      reformer: { field: `(select ${sqlDialect.top} pos.reformer from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      workScheduleIDName: { field: `(select ${sqlDialect.top} dict.name from hr_position pos left join hr_workSchedule dict on dict.ID = pos.workScheduleID where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo DESC ${sqlDialect.limit})` },
      planHours: { field: 'ep.planHours' },
      selfStructDepName: { field: `(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep.mi_treePath  from hr_department dep  where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  order by dep.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit})` },
      parentUnitDepName: { field: `(select ${sqlDialect.top} dep2.name from hr_department dep2 where dep2.mi_data_id = ep.departmentID and dep2.state = 'ACTIVE' ORDER BY dep2.mi_dateTo DESC ${sqlDialect.limit})` },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(params),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = params.onDate
  sqlBuilder.clauses.whereParams.organizationID = params.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = params.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = params.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = params.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = params.dateFrom
  sqlBuilder.clauses.whereParams.dictStaffCatID = params.dictStaffCatID
  sqlBuilder.clauses.whereParams.dictFundSourceID = params.dictFundSourceID
  sqlBuilder.clauses.whereParams.dictFundSourseList = params.dictFundSourseList
  sqlBuilder.clauses.whereParams.dictStaffCatList = params.dictStaffCatList
  sqlBuilder.clauses.whereParams.workPlaceList = params.workPlaceList

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

me.searchMtCountSum = function (ctx) {
  const params = JSON.parse(ctx.mParams.params)
  let runsql
  params.dictFundSourseList = params.dictFundSourceID.length ? params.dictFundSourceID.split(',').map(o => Number(o)) : []
  params.dictStaffCatList = params.dictStaffCatID.length ? params.dictStaffCatID.split(',').map(o => Number(o)) : []
  params.workPlaceList = params.workPlace.length ? params.workPlace.split(',') : []

  const sqlBuilder = {
    text:
        ` SELECT {0}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
        LEFT JOIN hr_empPosFundSource epfs ON epfs.employeePositionID = ep.ID AND epfs.mi_deleteDate >= '9999-12-31'
      {1} 
      {2}`,
    clauses: {},
    aliases: {
      rowCount: { field: `count(*)` },
      dictFundSourceMtCount: { field: `SUM(epfs.mtCount)` },
      mtCount: { field: 'SUM(ep.mtCount)' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(params),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = params.onDate
  sqlBuilder.clauses.whereParams.organizationID = params.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = params.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = params.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = params.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = params.dateFrom
  sqlBuilder.clauses.whereParams.dictStaffCatID = params.dictStaffCatID
  sqlBuilder.clauses.whereParams.dictFundSourceID = params.dictFundSourceID
  sqlBuilder.clauses.whereParams.dictFundSourseList = params.dictFundSourseList
  sqlBuilder.clauses.whereParams.dictStaffCatList = params.dictStaffCatList
  sqlBuilder.clauses.whereParams.workPlaceList = params.workPlaceList

  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return ctx.dataStore
}

me.getWhereClause = function (params) {
  const depClause = staffService.getDepartmentClause(params.departmentID, params.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeChildOrgs)

  let dictFundSourseClause = ``
  if (params.dictFundSourseList.length) {
    dictFundSourseClause = ` AND epfs.dictFundSourceID${entityBaseService.getInExpression('dictFundSourseList')}`
  }

  let dictStaffCatClause = ``
  if (params.dictStaffCatList.length) {
    dictStaffCatClause = ` AND ep.dictStaffCatID${entityBaseService.getInExpression('dictStaffCatList')}`
  }

  let workPlaceClause = ``
  if (params.workPlaceList.length) {
    workPlaceClause = ` AND ep.workPlace${entityBaseService.getInExpression('workPlaceList')}`
  }

  const whereClause = ` ep.isActive = 1  
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo
    and ep.isActive = 1 
    ${orgClause}
    ${depClause} 
    ${dictFundSourseClause} 
    ${dictStaffCatClause} 
    ${workPlaceClause} 
   `
  return whereClause
}
