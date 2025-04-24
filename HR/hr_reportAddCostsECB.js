const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const staffService = require('./modules/staffService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.orgID) === true
  let runsql
  let sqlBuilder = {
    text: `
      select {0} {1}
      FROM hr_accrualFund af 
JOIN hr_employeeNumber en on af.employeeNumberID = en.ID 
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN hr_dictPeriod dp on af.periodSalaryID = dp.ID
 LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :periodDateTo:  
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
        
      {2} 
      {3} {4}
    `,
    clauses: {},
    aliases: {
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      tabNum: { field: 'en.tabNum' },
      employeeNumberID: { field: 'af.employeeNumberID' },
      /*
        posName: { field: `
        (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) 
          from hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' 
              and pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
            left join hr_dictPosition dp ON dp.ID = ep.dictPositionID 
          where ep.employeeNumberID = af.employeeNumberID and ep.isActive = 1 
            and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.mi_deleteDate >= '9999-12-31'
          order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}
        )      
      ` }, */
      posName: { field: useActualPositionName
          ? 'ep.factPosName'
          : staffService.getPosFldOnDateSql2(':periodDateTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      period: { field: 'dp.name' },
      baseSum: { field: 'af.baseSum' },
      sourceSum: { field: 'af.sourceSum' },
      rate: { field: 'af.rate' },
      paySum: { field: 'af.paySum' }
      //sum: { field: `sum(af.sourceSum)` },
      //sumECB: { field: `(sum(af.sourceSum)*af.rate/100)` },
      //addECB: { field: `(sum(af.paySum) - sum(af.sourceSum)*af.rate/100)` },
      //generalECB: { field: `sum(af.paySum)` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID
  sqlBuilder.clauses.whereParams.periodID = mParams.periodID
  sqlBuilder.clauses.whereParams.periodDateTo = mParams.periodDateTo

  if (mParams.auditOrganization) {
    sqlBuilder.clauses.whereParams.auditOrganization = mParams.auditOrganization
  }
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, emp.firstName, en.tabNum'

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
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let kindClause = `
    and (select ${sqlDialect.top} dep.mi_data_id from hr_employeePosition ep 
        left join hr_department dep on dep.mi_data_id = ep.departmentID and dep.orgID = ep.organizationID 
        and  dep.state = 'ACTIVE' and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31' 
      where ep.employeeNumberID = af.employeeNumberID and ep.isActive = 1 
        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom 
        and ep.mi_deleteDate >= '9999-12-31' order by  ep.dateTo desc, dep.mi_dateTo desc ${sqlDialect.limit})`
  if (mParams.departmentID && mParams.includeChildDepts) {
    kindClause += ` IN (select dep.mi_data_id from hr_department dep
    where dep.mi_treePath like '%${mParams.departmentID}%' and dep.state = 'ACTIVE'
    and dep.mi_dateFrom <= :periodDateTo: and dep.mi_dateTo >= :periodDateTo:
      and dep.mi_deleteDate >= '9999-12-31' ) `
  } else if (mParams.departmentID && !mParams.includeChildDepts) {
    kindClause += ` = ${mParams.departmentID} `
  } else {
    kindClause = ''
  }
  return `
 en.orgID = :orgID: 
  ${kindClause} 
 and af.periodCalcID = :periodID:
 
 ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
 and en.mi_deleteDate >= '9999-12-31' 
 and emp.mi_deleteDate >= '9999-12-31' `
}
