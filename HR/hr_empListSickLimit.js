const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.orgID) === true

  let runsql
  let sqlBuilder = {
    text: `
      select {0} {1}
      FROM hr_employeeSickLimit et  
JOIN hr_employee emp on et.employeeID = emp.ID 
JOIN hr_employeeNumber en on emp.ID = en.employeeID
JOIN hr_employeePosition ep on en.ID = ep.employeeNumberID and ep.isActive = 1 
  and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom 
  and ep.mi_deleteDate >= '9999-12-31' 
  and ep.isActive = 1 
  and ep.organizationID = en.orgID  
JOIN ubm_enum enm 
       on enm.code = et.typeSickLimit 
       and enm.eGroup = 'HR_TYPESICKLIMIT' 
       and enm.mi_deleteDate >= '9999-12-31'   
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      tabNum: { field: 'en.tabNum' },
      posName: { field: useActualPositionName
          ? 'ep.factPosName'
          : staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      typeSickLimit: { field: `
       (CASE
       WHEN et.employeeFamilyID IS NOT NULL
       THEN CONCAT(enm.name,' (',(select ${sqlDialect.top} fam.description from hr_employeeFamily fam where et.employeeFamilyID = fam.ID and fam.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}),')')
       ELSE enm.name
       END 
      )
      ` },
      docNumber: { field: 'et.docNumber' },
      period: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE when datepart(year, et.dateFrom) != 2000 and datepart(year, et.dateTo) = 9999 then CONCAT('з ', format(et.dateFrom, 'dd.MM.yyyy')) 
     when datepart(year, et.dateFrom) = 2000 and datepart(year, et.dateTo) != 9999 then CONCAT('по ', format(et.dateTo, 'dd.MM.yyyy')) 
     when datepart(year, et.dateFrom) != 2000 and datepart(year, et.dateTo) != 9999 then CONCAT('з ', format(et.dateFrom, 'dd.MM.yyyy'), ' по ', format(et.dateTo, 'dd.MM.yyyy'))
      else ''
      END)`
        : `(CASE when extract(YEAR from et.dateFrom) != 2000 and extract(YEAR from et.dateTo) = 9999 then CONCAT('з ', to_char(et.dateFrom, 'DD.MM.YYYY')) 
     when extract(YEAR from et.dateFrom) = 2000 and extract(YEAR from et.dateTo) != 9999 then CONCAT('по ', to_char(et.dateTo, 'DD.MM.YYYY')) 
     when extract(YEAR from et.dateFrom) != 2000 and extract(YEAR from et.dateTo) != 9999 then CONCAT('з ', to_char(et.dateFrom, 'DD.MM.YYYY'), ' по ', to_char(et.dateTo, 'DD.MM.YYYY'))
      else ''
      END)`
      }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(mParams.dateTo)
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.departmentID = mParams.departmentID
  if (mParams.auditOrganization) {
    sqlBuilder.clauses.whereParams.auditOrganization = mParams.auditOrganization
  }
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, emp.firstName'

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
  let kindClause = ''
  let kindClause2 = ''
  if (mParams.departmentID && mParams.includeChildDepts) {
    kindClause = ` and ep.departmentID IN (select dep.mi_data_id from hr_department dep
      where dep.mi_treePath like '%${mParams.departmentID}%' and dep.state = 'ACTIVE' 
      and dep.mi_dateFrom <= :onDate: and dep.mi_dateTo >= :onDate:
      and dep.mi_deleteDate >= '9999-12-31' )`
    kindClause2 = ` and ep.departmentID IN (select dep.mi_data_id from hr_department dep
      where dep.mi_treePath like '%${mParams.departmentID}%' and dep.state = 'ACTIVE' 
      and dep.mi_dateFrom <= :onDate: and dep.mi_dateTo >= :onDate:
      and dep.mi_deleteDate >= '9999-12-31' )`
  } else if (mParams.departmentID && !mParams.includeChildDepts) {
    kindClause = ` and ep.departmentID = ${mParams.departmentID} `
    kindClause2 = ` and ep2.departmentID = ${mParams.departmentID} `
  }

  return `
    et.mi_deleteDate >= '9999-12-31' 
and en.mi_deleteDate >= '9999-12-31' 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
and emp.mi_deleteDate >= '9999-12-31' 
and en.orgID = :orgID:
and en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom: 
and et.dateFrom <= :dateTo: and (et.dateTo >= :dateFrom: or et.dateTo is null)
and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 
 where ep2.isActive = 1 and ep2.mi_deleteDate >= '9999-12-31' 
 and ep2.employeeNumberID = en.ID 
 and ep2.dateFrom <= en.dateTo and ep2.dateTo >= en.dateFrom 
 and ep2.isActive = 1 
 and ep2.organizationID = en.orgID 
 ${kindClause2}
 order by ep2.dateFrom desc ${sqlDialect.limit} 
  )
 ${kindClause}
  `
}
