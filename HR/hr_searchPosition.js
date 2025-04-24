/* eslint-disable no-multi-str */
const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const searchService = require('./modules/searchService')
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('getSearchSql')
me.entity.addMethod('select4search')
me.entity.addMethod('getEmpSearchSql')

function getPosSearchSql (ctx, getCount) {
  const mParams = ctx.mParams
  const isMsSql = entityBaseService.isMsSql()
  const noLockHint = isMsSql ? 'with (nolock)' : ''
  const sqlDialect = entityBaseService.getSQLDialect()
  const concatOp = selectService.concatOperator()
  let srchParamsStr = mParams.params && mParams.params.srchParams
  let searchAttr = ''
  let whereAddClause
  let srchParams
  if (srchParamsStr) {
    srchParams = JSON.parse(srchParamsStr)
    let searchSql = searchService.getSearchSql(srchParams)
    searchAttr = searchSql.searchAttrs
    whereAddClause = searchSql.whereClause
  } else {
    whereAddClause = '0 = 1'
  }
  let onDate = (srchParams && srchParams.onDate) || dateService.currentDate()
  let onDate4Sql = dateService.formatDate4Sql(onDate)
  let orgIDs = searchService.getOrgIDs(srchParams, onDate)
  let posOrgFilter = _.isArray(orgIDs) ? `and pos.orgID in (${orgIDs.join(',')})` : (orgIDs ? 'and pos.orgID = ' + orgIDs : '')
  let sql = `SELECT {0}
    {1}
    {6}
  FROM 
    (select * from hr_position pos ${noLockHint}
     where pos.mi_deleteDate >= '9999-12-31' and pos.state <> 'NEW'
      and pos.mi_dateFrom <= {5}
      and pos.mi_dateTo >= {5}
      and ${global.ac_userOrganization.getUserOrgIDFilter('pos.orgID')}
      ${posOrgFilter}) hrpos
    INNER JOIN hr_organization hrorg ON hrorg.mi_data_id = hrpos.orgID
      and hrorg.mi_deleteDate >= '9999-12-31'
      and hrorg.state = 'ACTIVE'
      and hrorg.mi_dateFrom <= {5}
      and hrorg.mi_dateTo >= {5}
    LEFT JOIN hr_department hrdep ON hrdep.mi_data_id = hrpos.parentUnitID
      and {5} between hrdep.mi_dateFrom and hrdep.mi_dateTo
      and hrdep.mi_deleteDate >= '9999-12-31'
      and hrdep.state = 'ACTIVE'
    LEFT JOIN hr_dictWagePay ON hr_dictWagePay.ID = hrpos.dictWagePayID
    LEFT JOIN hr_dictStatePay ON hr_dictStatePay.ID = hrpos.dictStatePayID
    LEFT JOIN hr_order entryOrder ON entryOrder.ID = hrpos.entryOrderID
    INNER JOIN hr_order staffOrder ON staffOrder.ID = hrpos.staffOrderID
    LEFT JOIN hr_dictPosition dictPos ON dictPos.ID = hrpos.dictPositionID
    LEFT JOIN hr_workSchedule ON hr_workSchedule.ID = hrpos.workScheduleID
    LEFT JOIN hr_dictTarifCoeff ON hr_dictTarifCoeff.ID = hrpos.dictTarifCoeffID
    LEFT JOIN hr_specialty ON hr_specialty.ID = hrpos.dictSpecialtyID
    LEFT JOIN hr_dictEmpCategory ON hr_dictEmpCategory.ID = hrpos.dictEmpCategoryID
    LEFT JOIN hr_dictStaffCat ON hr_dictStaffCat.ID = hrpos.dictStaffCatID
    LEFT JOIN hr_dictPositionKind ON hr_dictPositionKind.ID = hrpos.dictPositionKindID
    LEFT JOIN hr_dictPositionGroup ON hr_dictPositionGroup.ID = hrpos.dictPositionGroupID
    LEFT JOIN hr_dictSalarySchemeLevel
      INNER JOIN hr_dictSalaryScheme ON hr_dictSalaryScheme.ID = hr_dictSalarySchemeLevel.dictSalarySchemeID
      ON hr_dictSalarySchemeLevel.ID = hrpos.dictSalarySchemeLevelID
    LEFT JOIN ac_dictCostType ON ac_dictCostType.ID = hrpos.dictCostTypeID
    LEFT JOIN 
      (SELECT posAccr.positionID, SUM(case when posAccr.accrualRate is not null then Round(pos.accrualSum * posAccr.accrualRate / 100, 2) else posAccr.accrualSum end) as accrualSum
      FROM hr_positionAccrual posAccr
        INNER JOIN hr_position pos ON pos.id = posAccr.positionID
          ${posOrgFilter}
      WHERE
        posAccr.mi_deleteDate = '9999-12-31'
        and {5} between posAccr.dateFrom and posAccr.dateTo
      GROUP BY posAccr.positionID) posAccr ON posAccr.positionID = hrpos.id
  {2}
  {3}
  {4}`

  const fundSourceBaseSql = `from hr_positionFundSource pfs inner join ac_fundSource fs on fs.ID = pfs.dictFundSourceID where pfs.positionID = hrpos.ID and pfs.mi_deleteDate = '9999-12-31'`
  const accrualSumDescFieldSql = `concat(Coalesce(pe.shortPrintName, pe.code), '(',
    Case When posAccr.accrualRate is not null Then ${selectService.formatNumber('posAccr.accrualRate')} ${concatOp} '%'
      Else ${selectService.formatNumber('posAccr.accrualSum')} ${concatOp} 'грн' End,
  ')')`
  const accrualSumDescFromSql = `from hr_positionAccrual posAccr inner join hr_position pos ON pos.id = posAccr.positionID ${posOrgFilter}
    inner join hr_payEl pe ON pe.ID = posAccr.payElID
    where posAccr.positionID = hrpos.ID AND posAccr.mi_deleteDate = '9999-12-31'
      and ${onDate4Sql} between posAccr.dateFrom and posAccr.dateTo`

  let runsql
  let params = {}
  let clauses
  let aliases = {
    'ID': {
      field: 'hrpos.ID'
    },
    'mi_data_id': {
      field: 'hrpos.mi_data_id'
    },
    'orgID': {
      field: 'hrorg.orgID'
    },
    'orgName': {
      field: 'hrorg.name'
    },
    'depName': {
      field: 'hrdep.name'
    },
    'structDepName': {
      field: `${sqlDialect.scheme}depStructName2(hrpos.parentUnitID, ${onDate4Sql}, hrpos.orgID, hrpos.mi_dateTo)`
    },
    'posName': {
      field: 'hrpos.name'
    },
    'posCode': {
      field: 'hrpos.code'
    },
    'quantity': {
      field: 'hrpos.quantity'
    },
    'accrualSum': {
      field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'hrpos.accrualSum'
    },
    'accrualAddSum': {
      field: '(App.domainInfo.isEntityMethodsAccessible(\'hr_service\', \'notShowSalary\') && !entityBaseService.isAdmin()) ? \'0\' : posAccr.accrualSum'
    },
    'accrualAddSumDesc': {
      field: isMsSql ? `STUFF((select ', ' + ${accrualSumDescFieldSql} ${accrualSumDescFromSql} FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(${accrualSumDescFieldSql}, ', ') ${accrualSumDescFromSql})`
    },
    'dictWagePayName': {
      field: 'hr_dictWagePay.name'
    },
    'psCategory': {
      field: 'hrpos.psCategory'
    },
    'dictStatePayName': {
      field: 'hr_dictStatePay.name'
    },
    'state': {
      field: 'hrpos.state'
    },
    'mi_dateFrom': {
      field: 'hrpos.mi_dateFrom'
    },
    'mi_dateTo': {
      field: `(CASE WHEN hrpos.mi_dateTo = '9999-12-31' THEN null ELSE hrpos.mi_dateTo END)`
    },
    'entryOrder': {
      field: 'entryOrder.description'
    },
    'staffOrder': {
      field: 'staffOrder.description'
    },
    'fullName': {
      field: 'hrpos.fullName'
    },
    'dictPosName': {
      field: 'dictPos.name'
    },
    'workScheduleName': {
      field: 'hr_workSchedule.name'
    },
    'dictTarifCoeffName': {
      field: 'hr_dictTarifCoeff.name'
    },
    'dictSpecialtyName': {
      field: 'hr_specialty.name'
    },
    'dictEmpCategoryName': {
      field: 'hr_dictEmpCategory.name'
    },
    'dictStaffCatName': {
      field: 'hr_dictStaffCat.name'
    },
    'dictPositionKindName': {
      field: 'hr_dictPositionKind.name'
    },
    'dictPositionGroupName': {
      field: 'hr_dictPositionGroup.name'
    },
    'dictFundSourceName': {
      field: isMsSql ? `STUFF((select ', ' + fs.name ${fundSourceBaseSql} FOR XML PATH('')), 1, 1, '')` : `(SELECT STRING_AGG(fs.name, ', ') ${fundSourceBaseSql})`
    },
    'paymentType': {
      field: 'hrpos.paymentType'
    },
    'dictSalarySchemeName': {
      field: 'hr_dictSalaryScheme.name'
    },
    'dictCostTypeName': {
      field: 'ac_dictCostType.name'
    },
    'fundBasePay': {
      field: 'hrpos.fundBasePay'
    },
    'fundAddPay': {
      field: 'hrpos.fundAddPay'
    },
    'fundOtherPay': {
      field: 'hrpos.fundOtherPay'
    },
    'fundTotal': {
      field: 'hrpos.fundTotal'
    },
    'addDescrPosition': {
      field: 'hrpos.addDescrPosition'
    },
    'posComment': {
      field: 'hrpos.comment'
    }
  }
  whereAddClause = UB.format(whereAddClause, onDate4Sql)
  clauses = selectService.getClauses(ctx, params, aliases, whereAddClause, 'hrpos.name', true)
  if (getCount) {
    let countField = 'COUNT(1) as totalRowCount '
    runsql = UB.format(sql, countField, '', clauses.whereClause, '', '', onDate4Sql, '')
  } else {
    runsql = UB.format(sql, clauses.limitClause, clauses.fieldList, clauses.whereClause, clauses.orderClause,
      clauses.maxLimitClause, onDate4Sql, searchAttr)
  }
  runsql = searchService.replaceParams({ sql: runsql, onDate: onDate4Sql })
  return {
    runsql: runsql,
    whereParams: clauses.whereParams
  }
}

me.getEmpSearchSql = function (ctx) {
  let mParams = ctx.mParams
  let searchAttr = ''
  let whereAddClause
  let srchParamsStr = mParams.params && mParams.params.srchParams
  let srchParams
  if (srchParamsStr) {
    srchParams = JSON.parse(srchParamsStr)
    let searchSql = searchService.getSearchSql(srchParams)
    searchAttr = searchSql.searchAttrs
    whereAddClause = searchSql.whereClause
  } else {
    whereAddClause = '0 = 1'
  }
  let onDate = (srchParams && srchParams.onDate) || dateService.currentDate()
  let onDate4Sql = dateService.formatDate4Sql(onDate)
  let noLockHint = entityBaseService.isMsSql() ? 'with (nolock)' : ''
  let orgIDs = searchService.getOrgIDs(srchParams, onDate)
  let posOrgFilter = _.isArray(orgIDs) ? `and pos.orgID in (${orgIDs.join(',')})` : (orgIDs ? 'and pos.orgID = ' + orgIDs : '')
  let sql = `SELECT {0}
    {1}
    {6}
  FROM
    (select * from hr_employee hremp ${noLockHint} where hremp.mi_deleteDate >= '9999-12-31') hremp
    INNER JOIN hr_employeePosition hrep ON hrep.employeeID = hremp.ID
      AND {5} between hrep.dateFrom and hrep.dateTo
      AND hrep.isActive = 1
      AND hrep.mi_deleteDate >= '9999-12-31'
    INNER JOIN 
      (select * from hr_position pos ${noLockHint}
       where pos.mi_deleteDate >= '9999-12-31' and pos.state <> 'NEW'
        and pos.mi_dateFrom <= {5}
        and pos.mi_dateTo >= {5}
        and ${global.ac_userOrganization.getUserOrgIDFilter('pos.orgID')}
        ${posOrgFilter}) hrpos ON hrpos.mi_data_id = hrep.positionID
    LEFT JOIN hr_dictEducationLevel edu ON edu.id = hremp.dictEducationLevelID
    LEFT JOIN cdn_country country ON country.id = hremp.citizenshipID
  {2}
  {3}
  {4}`
  let runsql
  let params = {}
  let clauses
  let aliases = {
    'ID': {
      field: 'hremp.ID'
    },
    'positionID': {
      field: 'hrpos.mi_data_id'
    },
    'employeeID': {
      field: 'hrep.employeeID'
    },
    'employeeNumberID': {
      field: 'hrep.employeeNumberID'
    },
    'taxCode': {
      field: 'hremp.taxCode'
    },
    'lastName': {
      field: 'hremp.lastName'
    },
    'firstName': {
      field: 'hremp.firstName'
    },
    'middleName': {
      field: 'hremp.middleName'
    },
    'birthDate': {
      field: 'hremp.birthDate'
    },
    'dateFrom': {
      field: 'hrep.dateFrom'
    },
    'dateTo': {
      field: 'hrep.dateTo'
    },
    'citizenshipName': {
      field: 'country.name'
    },
    'sexType': {
      field: 'hremp.sexType'
    },
    'phoneMobile': {
      field: 'hremp.phoneMobile'
    },
    'phoneWorking': {
      field: 'hremp.phoneWorking'
    },
    'phoneHome': {
      field: 'hremp.phoneHome'
    },
    'email': {
      field: 'hremp.email'
    }
  }
  whereAddClause = UB.format(whereAddClause, onDate4Sql)
  clauses = selectService.getClauses(ctx, params, aliases, whereAddClause, 'hremp.lastName, hremp.firstName, hremp.middleName', true)
  runsql = UB.format(sql, clauses.limitClause, clauses.fieldList, clauses.whereClause, clauses.orderClause,
    clauses.maxLimitClause, onDate4Sql, searchAttr)
  runsql = searchService.replaceParams({ sql: runsql, onDate: onDate4Sql })
  return {
    runsql: runsql,
    whereParams: clauses.whereParams
  }
}

me.getSearchSql = function (ctx, getCount) {
  const mParams = ctx.mParams
  let posSqlParams = getPosSearchSql(ctx, getCount)
  let empSqlParams = me.getEmpSearchSql(ctx)
  mParams.runsql = posSqlParams.runsql + '\r\n\r\n' + empSqlParams.runsql
}

me.select4search = function (ctx) {
  let posSqlParams
  const mParams = ctx.mParams
  if (mParams.options && mParams.options.totalRequired) {
    posSqlParams = getPosSearchSql(ctx, true)
    ctx.dataStore.runSQL(posSqlParams.runsql, posSqlParams.whereParams)
    if (!ctx.dataStore.eof) mParams.__totalRecCount = ctx.dataStore.get(0)
  } else {
    delete mParams.__totalRecCount
  }
  posSqlParams = getPosSearchSql(ctx)
  ctx.dataStore.runSQL(posSqlParams.runsql, posSqlParams.whereParams)
  ctx.inherite = false
  return true
}
