const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: me.getSqlBuilderText(),
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      taxCode: { field: 'emp.taxCode' },
      fullFIO: { field: 'emp.fullFIO' },
      termJob: {
        field: sqlDialect.dialect === 'MSSQL2012'
          ? `(CONVERT(varchar, (select DATEDIFF(yy, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) - CASE WHEN MONTH(:onDateCur:) < MONTH(COALESCE(ex.calcDate, en.dateFrom)) THEN 1 WHEN MONTH(:onDateCur:) > MONTH(COALESCE(ex.calcDate, en.dateFrom)) THEN 0 WHEN DAY(:onDateCur:) < DAY(COALESCE(ex.calcDate, en.dateFrom)) THEN 1 ELSE 0 END)))
        + ' р. ' + (CONVERT(varchar, (CASE WHEN DATEPART(day, COALESCE(ex.calcDate, en.dateFrom)) > DATEPART(day, :onDateCur:) THEN DATEDIFF(month, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) - 1 ELSE DATEDIFF(month, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) END % 12)))
        + ' м. ' + (CONVERT(varchar,   datediff(day, dateadd(
          month,
          ((CASE WHEN DATEPART(day, COALESCE(ex.calcDate, en.dateFrom)) > DATEPART(day, :onDateCur:) THEN DATEDIFF(month, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) - 1 ELSE DATEDIFF(month, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) END % 12)),
          dateadd(year, ((select DATEDIFF(yy, COALESCE(ex.calcDate, en.dateFrom), :onDateCur:) - CASE WHEN MONTH(:onDateCur:) < MONTH(COALESCE(ex.calcDate, en.dateFrom)) THEN 1 WHEN MONTH(:onDateCur:) > MONTH(COALESCE(ex.calcDate, en.dateFrom)) THEN 0 WHEN DAY(:onDateCur:) < DAY(COALESCE(ex.calcDate, en.dateFrom)) THEN 1 ELSE 0 END)),
                  COALESCE(ex.calcDate, en.dateFrom))), :onDateCur:)))
      + ' д.'`
          : `(CONCAT(date_part('years', AGE(:onDateCur:, COALESCE(ex.calcDate, en.dateFrom))), ' р. ', date_part('month', AGE(:onDateCur:, COALESCE(ex.calcDate, en.dateFrom))), ' м. ', date_part('days', AGE(:onDateCur:, COALESCE(ex.calcDate, en.dateFrom))), ' д.'))` },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      rankCur: { field: 'rankTypes.name' },
      rankDateFrom: { field: 'ranks.dateFrom' },
      rankDateNext: { field: 'ranks.dateNext' },
      sexType: { field: 'emp.sexType' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      rankNext: { field: `(select ${sqlDialect.top} rt.name from hr_dictRank rt where rt.code = CAST((CAST(rankTypes.code as int) - 1) as varchar(32)) and rt.isActive =1 and rt.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` }
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
  sqlBuilder.clauses.whereParams.onDateCur = dateService.addDays(mParams.onDate, 1)
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

me.getWhereClause = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'
    and en.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo 
    and :onDate: between ep.dateFrom and ep.dateTo  
    and pos.positionType = '1'
    ${orgClause}
    ${depClause}     
    `
}

me.getSqlBuilderText = function () {
  const sqlDialect = entityBaseService.getSQLDialect()
  let txt = ` SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ 
where posSubQ.mi_data_id = ep.positionID 
and posSubQ.state = 'ACTIVE' 
and posSubQ.mi_dateFrom <= :onDate:   
and posSubQ.mi_deleteDate >= '9999-12-31' 
order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})     
      LEFT JOIN hr_publServRang ranks on en.employeeID = ranks.employeeID and ranks.mi_deleteDate >= '9999-12-31' and ranks.dateFrom <= :onDate:
    and ranks.dateTo >= :onDate:  
      LEFT JOIN hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID and rankTypes.mi_deleteDate >= '9999-12-31'

      LEFT JOIN (hr_employeeExperience ex join hr_dictExperience de on de.id = ex.dictExperienceID and ex.mi_deleteDate >= '9999-12-31') on ex.employeeID = emp.ID and de.code='6'
      {2} {3} {4}
    `
  return txt
}
