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
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
      INNER JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID and ep.isActive = 1
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        and emp.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_employeeFamily ef ON ef.employeeID = emp.ID
        and ef.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_people ppl ON ppl.ID = ef.peopleID
        and ppl.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_dictKinshipKind ks ON ks.ID = ef.dictKinshipKindID
        and ks.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictMaritalStatusKind ms ON ms.ID = emp.dictMaritalStatusKindID
      LEFT JOIN ubm_enum sex ON sex.code = emp.sexType
        and sex.eGroup = 'HR_SEX_TYPE'
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
      sexType: { field: 'sex.name' },
      birthDate: { field: 'emp.birthDate' },
      maritalStatus: { field: 'ms.name' },
      childName: { field: 'ppl.fullFIO' },
      childBirthDate: { field: 'ppl.birthDate' },
      childAge: { field: `(CONCAT(${staffService.getEmpAgeSql('ppl.birthDate')}, ' р. ',
       ${sqlDialect.dialect === 'MSSQL2012'
    ? '(CONVERT(varchar, (CASE WHEN DATEPART(day, ppl.birthDate) > DATEPART(day, :onDate:) THEN DATEDIFF(month, ppl.birthDate, :onDate:) - 1 ELSE DATEDIFF(month, ppl.birthDate, :onDate:) END % 12)))'
    : `(select date_part('month', AGE(:onDate:, ppl.birthDate)))`} , ' м.'))`
      },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
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
  sqlBuilder.clauses.whereParams.maxYear = ctx.mParams.maxYear || 15
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO'

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

  let whereClause = `  en.mi_deleteDate >= '9999-12-31' 
      and :onDate: between en.dateFrom and en.dateTo      
      and ep.mi_deleteDate >= '9999-12-31' 
      and :onDate: between ep.dateFrom and ep.dateTo       
      and :onDate: <= COALESCE(ef.dateTo, '9999-12-31')
      and ks.code in ('05', '06')
      and ${sqlDialect.dialect === 'MSSQL2012' ? `DATEADD(yy, ${mParams.maxYear}, ppl.birthDate)` : `(ppl.birthDate + '${mParams.maxYear} years')`} > :onDate:
      and ppl.birthDate <= :onDate:
    ${orgClause}
    ${depClause}
      `
  if (mParams.sexType) {
    whereClause += `  and emp.sexType = '${mParams.sexType === 1 ? 'M' : 'W'}'`
  }
  return whereClause
}
