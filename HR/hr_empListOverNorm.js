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
      .misc({ __mip_ondate: ctx.mParams.onDate })
      .selectAsObject()
    ctx.mParams.orgIDs = orgs.map(itm => itm.mi_data_id)
  } else {
    ctx.mParams.orgIDs = [ctx.mParams.organizationID]
  }
  ctx.mParams.orgIDs = ctx.mParams.orgIDs.join(', ')

  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeePosition ep  
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
      LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
      INNER JOIN tim_timeSheet ts ON ts.employeeNumberID = en.ID
        AND ts.isActive = 1
        AND ts.dateWork between :dateFrom: and :dateTo:
        AND ts.factHour > ts.planHour and ts.planHour is not null
        AND ts.mi_deleteDate >= '9999-12-31'
      INNER JOIN (SELECT ts2.employeeNumberID, ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + Convert(varchar, ts3.dateWork, 104)
          FROM tim_timeSheet ts3
          WHERE ts3.employeeNumberID = ts2.employeeNumberID
            AND ts3.isActive = 1
            AND ts3.dateWork between :dateFrom: and :dateTo:
            AND ts3.factHour > ts3.planHour and ts3.planHour is not null
          FOR XML PATH('')), 1, 2, '')`
    : `(SELECT STRING_AGG(to_char(ts3.dateWork, 'DD.MM.YYYY'), ', ') FROM tim_timeSheet ts3
          WHERE ts3.employeeNumberID = ts2.employeeNumberID
            AND ts3.isActive = 1
            AND ts3.dateWork between :dateFrom: and :dateTo:
            AND ts3.factHour > ts3.planHour and ts3.planHour is not null)`} as "dates"
        FROM tim_timeSheet ts2
          INNER JOIN hr_employeeNumber en2 ON en2.ID = ts2.employeeNumberID
            AND en2.orgID in (${ctx.mParams.orgIDs})
            AND en2.mi_deleteDate >= '9999-12-31'
            AND :onDate: between en2.dateFrom and en2.dateTo
        WHERE
          ts2.isActive = 1
          AND ts2.dateWork between :dateFrom: and :dateTo:
          AND ts2.factHour > ts2.planHour and ts2.planHour is not null
        GROUP BY
          ts2.employeeNumberID     
        ) ai ON ai.employeeNumberID = en.ID

    {2}     
  GROUP BY
  en.ID, en.employeeID, en.tabNum, en.addDescrPerson, emp.fullFIO, emp.taxCode, emp.sexType, 
  en.dateFrom, en.dateTo, ep.positionID, ep.factPosition, ep.departmentID, ai.dates, ep.dictPositionID, ep.organizationID 
    {3}
    {4}
    {5}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      overNormDays: { field: 'COUNT(1)', havingClause: true },
      overNormHours: { field: 'SUM(ts.factHour) - SUM(ts.planHour)', havingClause: true },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, ep.organizationID , (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'ep.organizationID ', 'name') },
      addInfo: { field: `CONCAT(CASE WHEN emp.sexType = 'W' THEN 'Працювала ' ELSE 'Працював ' END, ai.dates)` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, ep.organizationID , (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
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
  sqlBuilder.clauses.whereParams.dateTo = mParams.dateTo
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO '

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(distinct en.ID)', sqlBuilder.clauses.whereClause, sqlBuilder.clauses.havingClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.havingClause,
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
    and ws.isSummarized != 1
    and en.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo
    and ep.mi_deleteDate >= '9999-12-31' 
    and :onDate: between ep.dateFrom and ep.dateTo
    ${orgClause}
    ${depClause}     
    `
}
