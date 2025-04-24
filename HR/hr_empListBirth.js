const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('../HR/modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: ` SELECT {0} {1}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID       
        ${staffService.getSqlEmployeePositionOneWorkPlace()}       
            {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      birthDate: { field: 'emp.birthDate' },
      age: { field: staffService.getEmpAgeSql() },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'fullNameNom') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
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
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.monthBirthDate, emp.dayBirthDate, emp.yearBirthDate, emp.fullFIO'

  sqlBuilder.clauses.whereParams.indexDateFrom = ctx.mParams.dateFrom ? (ctx.mParams.dateFrom - dateService.firstDayOfYear(ctx.mParams.dateFrom)) / 1000 / 60 / 60 / 24 : null
  if (ctx.mParams.dateFrom && ctx.mParams.dateFrom.getMonth() > 1 && dateService.lastDayOfMonth(new Date(ctx.mParams.dateFrom.getFullYear(), 1, 1)).getDate() === 28) {
    sqlBuilder.clauses.whereParams.indexDateFrom++
  }
  sqlBuilder.clauses.whereParams.indexDateTo = ctx.mParams.dateTo ? (ctx.mParams.dateTo - dateService.firstDayOfYear(ctx.mParams.dateTo)) / 1000 / 60 / 60 / 24 : null
  if (ctx.mParams.dateTo && ctx.mParams.dateTo.getMonth() > 1 && dateService.lastDayOfMonth(new Date(ctx.mParams.dateTo.getFullYear(), 1, 1)).getDate() === 28) {
    sqlBuilder.clauses.whereParams.indexDateTo++
  }

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

  const whereClause = ` en.mi_deleteDate >= '9999-12-31'
    and en.dateFrom <= :onDate: 
    and en.dateTo >= :onDate:  
    and emp.birthDate is not null 
    and emp.mi_deleteDate >= '9999-12-31'
    and ep.isActive = 1     
    and ep.mi_deleteDate >= '9999-12-31' 
    and :onDate: between ep.dateFrom and ep.dateTo
    ${orgClause}
    ${depClause}     

    and ${sqlDialect.dialect === 'MSSQL2012'
    ? `((YEAR(:dateFrom:) = YEAR(:dateTo:)
      and DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) BETWEEN :indexDateFrom: AND :indexDateTo:)
    or (YEAR(:dateFrom:) <> YEAR(:dateTo:)
      and (DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) >= :indexDateFrom:
      or DATEDIFF(day, DATEFROMPARTS(YEAR(emp.birthDate), 1, 1), emp.birthDate)
        + IIF(MONTH(emp.birthDate) > 2 and DAY(EOMONTH(DATEFROMPARTS(YEAR(emp.birthDate), 2, 1))) = 28, 1, 0) <= :indexDateTo:)))
    ${mParams.anniversary ? ` AND DATEADD(YEAR, ((DATEDIFF(YEAR, emp.birthDate, :dateFrom:)) / 5 + 
      CASE WHEN (DATEDIFF(YEAR, emp.birthDate, :dateFrom:)) % 5 = 0 THEN 0 ELSE 1 END) * 5, emp.birthDate)
      BETWEEN :dateFrom: AND :dateTo:` : ``}`
    : `(extract(year from cast(:dateFrom: as timestamp)) = extract(year from cast(:dateTo: as timestamp))
      and (date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) + 
          case when date_part('months', emp.birthDate) > 2 
            and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
            then 1 else 0 end between :indexDateFrom: and :indexDateTo:)
        or (extract(year from cast(:dateFrom: as timestamp)) <> extract(year from cast(:dateTo: as timestamp))
            and (date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) + 
              case when date_part('months', emp.birthDate) > 2 
              and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
              then 1 else 0 end >= :indexDateFrom:
        or date_part('days', emp.birthDate - make_date(date_part('years',(emp.birthDate))::int, 1, 1)) + 
          case when date_part('months', emp.birthDate) > 2 
            and date_part('days', (date_trunc('month', make_date(date_part('years', emp.birthDate)::int, 2, 1)) + interval '1 month' - interval '1 day')::date) = 28
            then 1 else 0 end <= :indexDateTo:
        )
      )       
    )  
    ${mParams.anniversary ? ` and (date_part('years', AGE(cast(:dateTo: as timestamp), emp.birthDate)):: int) % 5 = 0  
    ` : ``}`}
    `
  return whereClause
}
