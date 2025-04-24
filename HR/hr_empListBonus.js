const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')

me.getSqlFund = function (dialect) {
  const sqlFs = `from hr_empPosFundSource empFs inner join ac_fundSource fs on fs.id = empFs.dictFundSourceID and fs.mi_deleteDate >= '9999-12-31'
  where empFs.employeePositionID = ep.ID and empFs.mi_deleteDate >= '9999-12-31'`
  const fsField = dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + LTRIM(case when empFs.mtcount = cast(empFs.mtcount as integer) then cast(cast(empFs.mtcount as integer) as varchar(10)) else cast(empFs.mtcount as varchar(10)) end)
     + ' ст. - ' + fs.name ${sqlFs} FOR XML PATH ('')), 1, 2, '')`
    : ` (SELECT STRING_AGG ( CONCAT(case when empFs.mtcount = cast(empFs.mtcount as integer) then cast(cast(empFs.mtcount as integer) as varchar) else cast(empFs.mtcount as varchar) end,
      ' ст. - ', fs.name), ', ') ${sqlFs})`

  return fsField
}

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const isFundSourceAccounting = settingsService.getByCode('hrFundSourceAccounting', mParams.organizationID) === 'STAFF'

  let runsql
  const sqlBuilder = {
    text: ` select {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_employeeBonus bon on bon.employeeID = emp.ID and bon.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_dictBonus dbon on dbon.ID = bon.dictBonusID and dbon.mi_deleteDate >= '9999-12-31'   
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :dateTo:   
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
       
      ${ctx.mParams.workPlace ? '' : staffService.getSqlEmployeePositionOneWorkPlace(':dateTo:')}      
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      docIssuedDate: { field: 'bon.docIssuedDate' },
      bonusName: { field: 'dbon.name' },
      fundSourceName: { field: isFundSourceAccounting ? me.getSqlFund(sqlDialect.dialect) : 'null' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      actualPositionName: { field: 'ep.factPosition' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      depID: { field: 'ep.departmentID' },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      // posCategory: { field: orgType === '2' ? staffService.getPosEnumFldOnDateSql(':dateFrom:', 'ep.positionID', 'psCategory', 'HR_POSITION_PSCATEGORY') : staffService.getPosEnumFldOnDateSql(':dateFrom:', 'ep.positionID', 'positionCategory', 'HR_POSITION_CATEGORY') },
      posCategory: { field: staffService.getPosEnumFldOnDateSql(':dateTo:', 'ep.positionID', 'positionCategory', 'HR_POSITION_CATEGORY') },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name') }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = mParams.dateTo
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dictBonusType = mParams.dictBonusType
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace
  sqlBuilder.clauses.whereParams.dictBonusType = mParams.dictBonusType


  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO'

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

me.getWhereClause = function (mParams, sqlDialect) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts, ':dateTo:')
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':dateTo:')
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  // const psCatWhereClause = mParams.psCategory ? ` and ${staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'psCategory')} = '${mParams.psCategory}'` : ''
  const posCatWhereClause = mParams.positionCategory ? ` and ${staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'positionCategory')} = '${mParams.positionCategory}'` : ''

  const fundClause = mParams.dictFundSource ? ` and EXISTS (SELECT 1 FROM hr_empPosFundSource empFs 
    where empFs.employeePositionID = ep.ID and empFs.mi_deleteDate >= '9999-12-31' and empFs.dictFundSourceID = ${mParams.dictFundSource})` : ''

  const whereClause = ` ep.isActive = 1
    and en.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31' 
    and :dateTo: between ep.dateFrom and ep.dateTo 
    and :dateTo: between en.dateFrom and en.dateTo     

    and COALESCE(bon.docIssuedDate, :dateTo:) between :dateFrom: and :dateTo:
    ${workPlaceClause}
    ${orgClause}
    ${depClause}     
    ${posCatWhereClause}     
    ${fundClause}     
    ${mParams.dictBonusType ? ` and dbon.bonusTypeID in (${mParams.dictBonusType})` : ``}
    `
  return whereClause
}
