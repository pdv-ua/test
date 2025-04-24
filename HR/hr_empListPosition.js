const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService.js')
me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  let runsql
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let sqlBuilder = {
    text: `SELECT {0} {1}
      FROM hr_position pos            
        JOIN hr_organization org ON org.ID = pos.orgID 
        LEFT JOIN ac_address aca ON aca.ownerID = org.ID and aca.addressType in ('1', '2')
        LEFT JOIN (SELECT ep.positionID, SUM(ep.mtCount) as mtCount
          FROM hr_employeePosition ep
          ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
          WHERE ep.isActive = 1 
            and ep.dateFrom <= :onDate: 
            and ep.dateTo >= :onDate: 
            and ep.mi_deleteDate >= '9999-12-31'
             ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
          GROUP BY ep.positionID) ep ON ep.positionID = pos.mi_data_id
        LEFT JOIN hr_dictStatePay statePay ON statePay.ID = pos.dictStatePayID
      {2}
      {3}
      {4}
      {5}
      {6}`,
    clauses: {},
    aliases: {
      recordID: { field: 'MAX(pos.ID)' },
      organizationID: { field: 'org.name' },
      name: { field: 'pos.name' },
      positionCount: { field: 'SUM(pos.quantity)', havingClause: true },
      dictWagePayID: { field: 'pos.dictWagePayID' },
      psCategory: { field: 'pos.psCategory' },
      dictStatePayID: { field: 'pos.dictStatePayID' },
      accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'pos.accrualSum' },
      vacantCount: { field: 'SUM(pos.quantity) - SUM(ep.mtCount)', havingClause: true },
      regionID: { field: 'aca.regionID' },
      cityID: { field: 'aca.cityID' }
    },
    params: {}
  }
  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  let whereParams = sqlBuilder.clauses.whereParams
  whereParams.organizationID = mParams.organizationID
  whereParams.regionID = mParams.regionID
  whereParams.cityID = mParams.cityID
  whereParams.powerBranch = mParams.powerBranch
  whereParams.dictGovernmTypeID = mParams.dictGovernmTypeID
  whereParams.year = mParams.year
  whereParams.month = mParams.month
  whereParams.dictEducationLevelID = mParams.dictEducationLevelID
  whereParams.employeeEducationID = mParams.employeeEducationID
  whereParams.dictWagePayID = mParams.dictWagePayID
  whereParams.psCategory = mParams.psCategory
  whereParams.dictStatePayID = mParams.dictStatePayID
  whereParams.name = mParams.name
  whereParams.salaryFrom = mParams.salaryFrom
  whereParams.salaryTo = mParams.salaryTo
  whereParams.tarifGroupID = mParams.tarifGroupID
  whereParams.isVacant = mParams.isVacant
  whereParams.onDate = mParams.onDate || dateService.currentDate()

  sqlBuilder.clauses.groupClause = 'GROUP BY org.name, pos.name, pos.dictWagePayID, pos.psCategory, pos.dictStatePayID,' +
    'statePay.name, pos.accrualSum, aca.regionID, aca.cityID'

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY org.name, pos.name, statePay.name'

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', sqlBuilder.clauses.havingClause, '', '')
    ctx.dataStore.runSQL(runsql, whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.groupClause,
    sqlBuilder.clauses.havingClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, whereParams)
  ctx.inherite = false
  return true
}

me.getWhereClause = function (mParams) {
  let whereClause = `pos.mi_dateFrom <= :onDate: and pos.mi_dateTo >= :onDate: and pos.mi_deleteDate >= '9999-12-31' and pos.state = 'ACTIVE' `
  if (mParams.organizationID != null) {
    whereClause = whereClause + `
        and pos.orgID = :organizationID:
        `
  }
  if (mParams.regionID != null && mParams.regionID !== '') {
    whereClause = whereClause + `
        and aca.regionID = :regionID:
        `
  }
  if (mParams.cityID != null && mParams.cityID !== '') {
    whereClause = whereClause + `
        and aca.cityID = :cityID:
        `
  }
  if (mParams.powerBranch != null && mParams.powerBranch !== '') {
    whereClause = whereClause + `
        and org.powerBranch = :powerBranch:
        `
  }
  if (mParams.dictGovernmTypeID != null && mParams.dictGovernmTypeID !== '') {
    whereClause = whereClause + `
        and org.dictGovernmTypeID = :dictGovernmTypeID:
        `
  }
  // year
  // month
  if (mParams.dictEducationLevelID != null && mParams.dictEducationLevelID !== '') {
    whereClause = whereClause + `
        and aca.dictEducationLevelID = :dictEducationLevelID:
        `
  }
  if (mParams.employeeEducationID != null && mParams.employeeEducationID !== '') {
    whereClause = whereClause + `
        and aca.employeeEducationID = :employeeEducationID:
        `
  }
  if (mParams.dictWagePayID != null && mParams.dictWagePayID !== '') {
    whereClause = whereClause + `
        and pos.dictWagePayID = :dictWagePayID:
        `
  }
  if (mParams.psCategory != null && mParams.psCategory !== '') {
    whereClause = whereClause + `
        and pos.psCategory = :psCategory:
        `
  }
  if (mParams.dictStatePayID != null && mParams.dictStatePayID !== '') {
    whereClause = whereClause + `
        and pos.dictStatePayID = :dictStatePayID:
        `
  }
  if (mParams.name != null && mParams.name !== '') {
    whereClause = whereClause + `
        and pos.name = :name:
        `
  }
  if (mParams.salaryFrom != null && mParams.salaryFrom !== '') {
    whereClause = whereClause + `
        and pos.accrualSum >= :salaryFrom:
        `
  }
  if (mParams.salaryTo != null && mParams.salaryTo !== '') {
    whereClause = whereClause + `
        and pos.accrualSum <= :salaryTo:
        `
  }
  if (mParams.tarifGroupID != null && mParams.tarifGroupID !== '') {
    whereClause = whereClause + `
        and org.tarifGroupID = :tarifGroupID:
        `
  }
  if (mParams.isVacant === true) {
    whereClause = whereClause + `
       and COALESCE(pos.quantity, 0) > (SELECT COALESCE(sum(ep.mtCount), 0) from hr_employeePosition ep where ep.isActive = 1 
       and ep.positionID = pos.mi_data_id and ep.dateFrom <= :onDate: and ep.dateTo >= :onDate: and ep.mi_deleteDate >= '9999-12-31')
      `
  }
  return whereClause
}
