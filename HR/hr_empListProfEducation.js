const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.getSqlTabNum = function (dialect) {
  const sqlTable = `from hr_employeeNumber en where en.employeeID = emp.ID 
  and en.mi_deleteDate >= '9999-12-31' and en.dateTo >= '${dateService.formatDate(dateService.currentTruncDate(), 'yyyy-mm-dd')}' 
  group by en.tabNum order by en.tabNum `

  const sql = dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + en.tabNum ${sqlTable} FOR XML PATH ('')), 1, 2, '')`
    : `(SELECT STRING_AGG(en.tabNum, ', ') ${sqlTable})`

  return sql
}

me.getSqlAddDescrPerson = function (dialect) {
  const sqlTable = `from hr_employeeNumber en where en.employeeID = emp.ID 
  and en.mi_deleteDate >= '9999-12-31' and en.dateTo >= '${dateService.formatDate(dateService.currentTruncDate(), 'yyyy-mm-dd')}' 
  group by en.tabNum, en.addDescrPerson order by en.tabNum `

  const sql = dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + en.addDescrPerson ${sqlTable} FOR XML PATH ('')), 1, 2, '')`
    : `(SELECT STRING_AGG(en.addDescrPerson, ', ') ${sqlTable})`

  return sql
}

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: `  SELECT {0} {1}
FROM hr_employeePosition ep
INNER JOIN hr_employee emp ON ep.employeeID = emp.ID  and emp.mi_deleteDate >= '9999-12-31'
INNER JOIN hr_empCertificatnUp ecu ON emp.ID = ecu.employeeID
      ${staffService.getSqlEmployeePositionOneWorkPlace()}       

    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'ecu.employeeID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName, ' (', ${me.getSqlTabNum(sqlDialect.dialect)}, ')'))` },
      dictTrainingTopicName: { field: `(select ${sqlDialect.top} dict.name from hr_dictTrainingTopic dict where dict.id = ecu.dictTrainingTopicID and dict.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },

      dateFrom: { field: 'ecu.dateFrom' },
      dateTo: { field: 'ecu.dateTo' },
      educationName: { field: 'ecu.educationName' },
      dictProfCompDevelopFormName: { field: `(select ${sqlDialect.top} dict.name from hr_dictProfCompDevelopForm dict where dict.id = ecu.dictProfCompDevelopFormID and dict.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      hours: { field: 'ecu.hours' },
      ects: { field: 'ecu.ects' },
      groupCategory: { field: `(select ${sqlDialect.top} enum.name from ubm_enum enum where enum.code = ecu.groupCategory and enum.eGroup = 'HR_TRAINING_GROUP_CATEGORY' ${sqlDialect.limit})` },
      country: { field: `(select ${sqlDialect.top} dict.name from cdn_country dict where dict.id = ecu.countryID and dict.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: me.getSqlAddDescrPerson(sqlDialect.dialect) },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'ep.organizationID', 'name') },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, ep.organizationID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
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
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.whereParams.onDate = dateService.currentDate()

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY fullFIO'

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
  const foreignClause = mParams.foreign ? ` and ecu.isInsideCountry = 0 ` : ` and ecu.isInsideCountry = 1 `
  const dictPCDevelopFormClause = mParams.dictProfCompDevelopFormID ? `and ecu.dictProfCompDevelopFormID = ${mParams.dictProfCompDevelopFormID}` : ''
  const dictPCompetencyClause = mParams.dictProfCompetencyID ? `and ecu.dictProfCompetencyID = ${mParams.dictProfCompetencyID}` : ''
  const dictTrTopicNameClause = mParams.dictTrainingTopicName ? `and ecu.dictTrainingTopicName like '%${mParams.dictTrainingTopicName}%' ` : ''

  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':onDate:', 'ep.organizationID')

  return ` ecu.mi_deleteDate >= '9999-12-31' 
    and ecu.dateFrom between :dateFrom: and :dateTo:
    and ep.mi_deleteDate >= '9999-12-31'       
    and :onDate: between ep.dateFrom and ep.dateTo    
    ${foreignClause} 
    ${dictPCDevelopFormClause} 
    ${dictPCompetencyClause} 
    ${dictTrTopicNameClause}
    ${orgClause}
    ${depClause}     
`
}
