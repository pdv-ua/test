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
    text: `  SELECT {0} {1}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID       
        ${staffService.getSqlEmployeePositionOneWorkPlace()}       
    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      birthDate: { field: 'emp.birthDate' },
      age: { field: staffService.getEmpAgeSql() },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      dateAppointmentPos: { field: ` (select ${sqlDialect.top} ep.dateFrom
        from hr_employeePosition ep
        where ep.employeeNumberID = en.ID and ep.isActive = 1 
        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.isActive = 1
        and ep.organizationID = en.orgID
        order by ep.dateFrom desc ${sqlDialect.limit})
      ` },
      dateAppointmentDep: { field: ` (select ${sqlDialect.top} ep.dateFrom
        from hr_employeePosition ep
        where ep.employeeNumberID = en.ID and ep.isActive = 1
        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.isActive = 1
        and ep.organizationID = en.orgID
        order by ep.dateFrom asc ${sqlDialect.limit})
      ` },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY age, fullFIO'

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

me.getWhereClause = function (mParams, sqlDialect) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  const maleClause = mParams.isMale
    ? (sqlDialect.dialect === 'MSSQL2012'
      ? `emp.sexType = 'M' and CAST(DATEDIFF(day, emp.birthDate, DATEADD(d, 1, :onDate:)) / 365.2425 as int) BETWEEN ${mParams.maleAgeFrom || 0} AND ${mParams.maleAgeTo || 120}`
      : `emp.sexType = 'M' and date_part('years', AGE(:onDate:, emp.birthDate)) BETWEEN ${mParams.maleAgeFrom || 0} AND ${mParams.maleAgeTo || 120}`
    ) : '1 = 1'
  const femaleClause = mParams.isFemale
    ? (sqlDialect.dialect === 'MSSQL2012'
      ? `emp.sexType = 'W' and CAST(DATEDIFF(day, emp.birthDate, DATEADD(d, 1, :onDate:)) / 365.2425 as int) BETWEEN ${mParams.femaleAgeFrom || 0} AND ${mParams.femaleAgeTo || 120}`
      : `emp.sexType = 'W' and date_part('years', AGE(:onDate:, emp.birthDate)) BETWEEN ${mParams.femaleAgeFrom || 0} AND ${mParams.femaleAgeTo || 120}`
    ) : '1 = 1'
  const sexOp = mParams.isMale && mParams.isFemale ? 'or' : 'and'
  const whereClause = ` emp.mi_deleteDate >= '9999-12-31'
    and en.mi_deleteDate >= '9999-12-31' 
    and ep.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo     
    and :onDate: between ep.dateFrom and ep.dateTo    
    and ((${maleClause})
      ${sexOp} (${femaleClause}))
    ${orgClause}
    ${depClause}     
    `
  return whereClause
}
