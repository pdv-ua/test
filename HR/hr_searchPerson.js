/* eslint-disable no-multi-str */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const searchService = require('./modules/searchService')
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('getSearchSql')
me.entity.addMethod('select4search')

me.getSearchSql = function (ctx, getCount) {
  let mParams = ctx.mParams
  let noLockHint = entityBaseService.isMsSql() ? 'with (nolock)' : ''
  let sql = `SELECT {0}
    {1}
    {5}
  FROM
    (select * from hr_employee emp ${noLockHint} where emp.mi_deleteDate >= '9999-12-31') emp
    LEFT JOIN hr_dictEducationLevel edu ON edu.id = emp.dictEducationLevelID
    LEFT JOIN cdn_country country ON country.id = emp.citizenshipID
  {2}
  {3}
  {4}`
  let srchParamsStr = mParams.params && mParams.params.srchParams
  let searchAttr = ''
  let whereAddClause
  if (srchParamsStr) {
    let srchParams = JSON.parse(srchParamsStr)
    let searchSql = searchService.getSearchSql(srchParams)
    searchAttr = searchSql.searchAttrs
    whereAddClause = searchSql.whereClause
    if (srchParams.orgID) {
      whereAddClause = `EXISTS (select 1 from ac_employeeOrg eo where eo.employeeID = emp.ID and eo.organizationID = ${srchParams.orgID}
        and eo.mi_deleteDate >= '9999-12-31')
        and ` + whereAddClause
    }
  } else {
    whereAddClause = '0 = 1'
  }
  let runsql
  let params = {}
  let clauses
  let aliases = {
    'ID': {
      field: 'emp.ID'
    },
    'taxCode': {
      field: 'emp.taxCode'
    },
    'sexType': {
      field: 'emp.sexType'
    },
    'lastName': {
      field: 'emp.lastName'
    },
    'firstName': {
      field: 'emp.firstName'
    },
    'middleName': {
      field: 'emp.middleName'
    },
    'fullFIO': {
      field: 'emp.fullFIO'
    },
    'birthDate': {
      field: 'emp.birthDate'
    },
    'citizenshipName': {
      field: 'country.name'
    },
    'educationLevelName': {
      field: 'edu.name'
    },
    'employeeID': {
      field: 'emp.ID'
    },
    'phoneMobile': {
      field: 'emp.phoneMobile'
    },
    'phoneWorking': {
      field: 'emp.phoneWorking'
    },
    'phoneHome': {
      field: 'emp.phoneHome'
    },
    'email': {
      field: 'emp.email'
    }
  }
  clauses = selectService.getClauses(ctx, params, aliases, whereAddClause, 'emp.fullFIO', true)
  if (getCount) {
    let countField = 'COUNT(1) as totalRowCount '
    runsql = UB.format(sql, countField, '', clauses.whereClause, '', '', '')
  } else {
    runsql = UB.format(sql, clauses.limitClause, clauses.fieldList, clauses.whereClause, clauses.orderClause,
      clauses.maxLimitClause, searchAttr)
  }
  mParams.runsql = runsql
  mParams.whereParams = clauses.whereParams
}

me.select4search = function (ctx) {
  const mParams = ctx.mParams
  if (mParams.options && mParams.options.totalRequired) {
    me.getSearchSql(ctx, true)
    ctx.dataStore.runSQL(mParams.runsql, mParams.whereParams)
    if (!ctx.dataStore.eof) mParams.__totalRecCount = ctx.dataStore.get(0)
  } else {
    delete mParams.__totalRecCount
  }
  me.getSearchSql(ctx)
  ctx.dataStore.runSQL(mParams.runsql, mParams.whereParams)
  ctx.inherite = false
  return true
}
