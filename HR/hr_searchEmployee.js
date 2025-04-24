/* eslint-disable no-multi-str */
const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const searchService = require('./modules/searchService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('getSearchSql')
me.entity.addMethod('select4search')
me.entity.addMethod('select4searchPos')

me.getSearchSql = function (ctx, getCount) {
  let mParams = ctx.mParams
  let noLockHint = entityBaseService.isMsSql() ? 'with (nolock)' : ''
  let sql = `SELECT {0}
    {1}
    {6}
  FROM
    (select * from hr_employee emp ${noLockHint} where emp.mi_deleteDate >= '9999-12-31') emp
    INNER JOIN hr_employeeNumber en ON en.employeeID = emp.ID
      and en.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictEducationLevel edu ON edu.id = emp.dictEducationLevelID
    LEFT JOIN cdn_country country ON country.id = emp.citizenshipID
    LEFT JOIN (SELECT ep.employeeNumberID, pos.name as posName, dep.name as depName, ep.mtCount, pos.accrualSum,
        pe.name as payElName, wsch.name as workScheduleName, ep.dateFrom, ep.dateTo
      FROM hr_employeePosition ep
        INNER JOIN hr_employeeNumber enPos ON enPos.ID = ep.employeeNumberID
          and enPos.dateTo >= ep.dateFrom
          and enPos.dateFrom <= ep.dateTo
        INNER JOIN hr_position pos on pos.mi_data_id = ep.positionID
          and {5} between pos.mi_dateFrom and pos.mi_dateTo
          and pos.mi_deleteDate >= '9999-12-31'
          and pos.state = 'ACTIVE'
        LEFT JOIN hr_department dep ON dep.mi_data_id = ep.departmentID
          and {5} between dep.mi_dateFrom and dep.mi_dateTo
          and dep.mi_deleteDate >= '9999-12-31'
          and dep.state = 'ACTIVE'
        LEFT JOIN hr_payEl pe ON pe.ID = pos.payElID
        LEFT JOIN hr_workSchedule wsch ON wsch.ID = ep.workScheduleID
      WHERE
        {5} between ep.dateFrom and ep.dateTo and ep.isActive = 1
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.dateFrom = (select max(ep2.datefrom) from hr_employeePosition ep2
          where ep2.employeeNumberID = ep.employeeNumberID and ep2.isActive = 1
            and {5} between ep2.dateFrom and ep2.dateTo
            and ep2.mi_deleteDate >= '9999-12-31')
      ) pos ON pos.employeeNumberID = en.ID
  {2}
  {3}
  {4}`
  let srchParamsStr = mParams.params && mParams.params.srchParams
  let runsql
  let params = {}
  let clauses
  let aliases = {
    'ID': {
      field: 'en.ID'
    },
    'tabNum': {
      field: 'en.tabNum'
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
    'depName': {
      field: 'pos.depName'
    },
    'posName': {
      field: 'pos.posName'
    },
    'dateFrom': {
      field: 'en.dateFrom'
    },
    'dateTo': {
      field: 'en.dateTo'
    },
    'mtCount': {
      field: 'pos.mtCount'
    },
    'payElName': {
      field: 'pos.payElName'
    },
    'accrualSum': {
      field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'pos.accrualSum'
    },
    'workScheduleName': {
      field: 'pos.workScheduleName'
    },
    'employeeID': {
      field: 'emp.ID'
    },
    'employeeNumberID': {
      field: 'en.ID'
    },
    'orgID': {
      field: 'en.orgID',
      fieldwhere: 'en.orgID'
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
  let onDate = dateService.currentDate()
  let searchAttr = ''
  let whereAddClause = '0 = 1'
  if (srchParamsStr) {
    let srchParams = JSON.parse(srchParamsStr)
    let searchSql = searchService.getSearchSql(srchParams)
    searchAttr = searchSql.searchAttrs
    whereAddClause = searchSql.whereClause
    if (!mParams.whereList) {
      mParams.whereList = {}
    }
    if (srchParams.orgID) {
      mParams.whereList.orgID = {
        expression: '[orgID]',
        condition: 'equal',
        values: {
          value: srchParams.orgID
        }
      }
    }
    if (srchParams.onDate) {
      onDate = srchParams.onDate
      mParams.whereList.dateFrom = {
        expression: '[dateFrom]',
        condition: 'lessEqual',
        value: onDate
      }
      mParams.whereList.dateTo = {
        expression: '[dateTo]',
        condition: 'moreEqual',
        value: onDate
      }
    }
  }
  let onDate4Sql = dateService.formatDate4Sql(onDate)
  clauses = selectService.getClauses(ctx, params, aliases, whereAddClause, 'emp.fullFIO', true)
  if (getCount) {
    let countField = 'COUNT(1) as totalRowCount '
    runsql = UB.format(sql, countField, '', clauses.whereClause, '', '', onDate4Sql, '')
  } else {
    runsql = UB.format(sql, clauses.limitClause, clauses.fieldList, clauses.whereClause, clauses.orderClause,
      clauses.maxLimitClause, onDate4Sql, searchAttr)
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

me.select4searchPos = function (ctx) {
  let empSqlParams = global.hr_searchPosition.getEmpSearchSql(ctx)
  ctx.dataStore.runSQL(empSqlParams.runsql, empSqlParams.whereParams)
  ctx.inherite = false
  return true
}
