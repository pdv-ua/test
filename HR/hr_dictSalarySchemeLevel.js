const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

me.entity.addMethod('recalcSalaryScheme')
me.entity.addMethod('selectOnDate')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code && !execParams.sortNumber) {
    execParams.sortNumber = Number(String(execParams.code || '').replace(/[^\d]/g, '') || 0)
  }
  entityService.setAttrs(ctx)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code && !execParams.sortNumber) {
    execParams.sortNumber = Number(String(execParams.code || '').replace(/[^\d]/g, '') || 0)
  }
  entityService.setAttrs(ctx)
}

me.recalcSalaryScheme = function (ctx) {
  const levelID = ctx.mParams.ID
  const schemeData = UB.Repository(__entityName)
    .attrs(['dictSalarySchemeID'])
    .selectById(levelID)

  const salaryScheme = UB.Repository('hr_dictSalaryScheme')
    .attrs(['schemeType', 'setAccrualByMinValue', 'roundUpTo'])
    .selectById(schemeData.dictSalarySchemeID)

  if (salaryScheme['schemeType'] === '1') {
    const detail = UB.Repository('hr_dictSalarySchemeDet')
      .attrs(['ID', 'coefMin', 'coefMax', 'dateFrom'])
      .where('dictSalarySchemeLevelID', '=', levelID)
      .selectAsObject()
    const store = UB.DataStore('hr_dictSalarySchemeDet')

    const baseSalary = UB.Repository('hr_dictSalarySchemeBase')
      .attrs(['dateFrom', 'dateTo', 'accrualSum'])
      .where('dictSalarySchemeID', '=', schemeData.dictSalarySchemeID)
      .selectAsObject()
    baseSalary.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    detail.forEach(row => {
      const dateFrom = dateService.shiftDate(row.dateFrom)
      const base = baseSalary.find(o => o.dateFrom <= dateFrom && o.dateTo >= dateFrom)
      if (base) {
        const accrualSumMin = accrualService.roundSum(base.accrualSum * row.coefMin || 0, salaryScheme.roundUpTo || '1')
        const accrualSumMax = accrualService.roundSum(base.accrualSum * row.coefMax || 0, salaryScheme.roundUpTo || '1')
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            accrualSumMin,
            accrualSumMax,
            accrualSum: salaryScheme['setAccrualByMinValue'] ? accrualSumMin : null
          }
        })
      }
    })
  }
}

me.selectOnDate = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const dateFromEmptySql = sqlDialect.dialect === 'MSSQL2012'
    ? '(CASE year(l.dateFrom) WHEN 2000 THEN null ELSE l.dateFrom END)'
    : '(CASE Extract(YEAR from l.dateFrom) WHEN 2000 THEN null ELSE l.dateFrom END)'
  const dateToEmptySql = sqlDialect.dialect === 'MSSQL2012'
    ? '(CASE year(l.dateTo) WHEN 9999 THEN null ELSE l.dateTo END)'
    : '(CASE Extract(YEAR from l.dateTo) WHEN 9999 THEN null ELSE l.dateTo END)'
  const onDate = dateService.shiftDate(mParams.onDate)
  const accrualSumMinSql = onDate
    ? `(select ${sqlDialect.top} det.accrualSumMin from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.accrualSumMin from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const accrualSumMaxSql = onDate
    ? `(select ${sqlDialect.top} det.accrualSumMax from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.accrualSumMax from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const accrualSumAvgSql = onDate
    ? `(select ${sqlDialect.top} (det.accrualSumMax + det.accrualSumMin)/2 from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} (det.accrualSumMax + det.accrualSumMin)/2 from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const coefMinSql = onDate
    ? `(select ${sqlDialect.top} det.coefMin from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.coefMin from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const coefMaxSql = onDate
    ? `(select ${sqlDialect.top} det.coefMax from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.coefMax from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const accDateFromSql = onDate
    ? `(select ${sqlDialect.top} det.dateFrom from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.dateFrom from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`
  const accDateToSql = onDate
    ? `(select ${sqlDialect.top} det.dateTo from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' and det.dateFrom <= :onDate: and det.dateTo >= :onDate: ${sqlDialect.limit})`
    : `(select ${sqlDialect.top} det.dateTo from hr_dictSalarySchemeDet det where det.dictSalarySchemeLevelID = l.ID and det.mi_deleteDate >= '9999-12-31' order by dateTo desc ${sqlDialect.limit})`

  let sqlBuilder = {
    text:
      `SELECT {0} {1} FROM (
        SELECT l.ID
          ,l.dictSalarySchemeID
          ,l.code
          ,l.sortNumber
          ,l.name
          ,l.dateFrom
          ,l.dateTo
          ,l.isActive
          ,l.dictPositionID
          ,l.description
          ,${dateFromEmptySql} as dateFromEmpty
          ,${dateToEmptySql} as dateToEmpty
          ,${accrualSumMinSql} as accrualSumMin
          ,${accrualSumMaxSql} as accrualSumMax
          ,${accrualSumAvgSql} as accrualSumAvg
          ,${accDateFromSql} as accDateFrom
          ,${accDateToSql} as accDateTo
          ,${coefMinSql} as coefMin
          ,${coefMaxSql} as coefMax
        FROM hr_dictSalarySchemeLevel l
        WHERE l.mi_deleteDate >= '9999-12-31'
  ) t        
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      dictSalarySchemeID: { field: 't.dictSalarySchemeID' },
      code: { field: 't.code' },
      sortNumber: { field: 't.sortNumber' },
      name: { field: 't.name' },
      dateFrom: { field: 't.dateFrom' },
      dateTo: { field: 't.dateTo' },
      isActive: { field: 't.isActive' },
      dictPositionID: { field: 't.dictPositionID' },
      description: { field: 't.description' },
      dateFromEmpty: { field: 't.dateFromEmpty' },
      dateToEmpty: { field: 't.dateToEmpty' },
      accrualSumMin: { field: 't.accrualSumMin' },
      accrualSumMax: { field: 't.accrualSumMax' },
      accrualSumAvg: { field: 't.accrualSumAvg' },
      coefMin: { field: 't.coefMin' },
      coefMax: { field: 't.coefMax' },
      accDateFrom: { field: sqlDialect.dialect === 'MSSQL2012' ? '(CASE year(t.accDateFrom) WHEN 2000 THEN null ELSE t.accDateFrom END)' : '(CASE Extract(YEAR from t.accDateFrom) WHEN 2000 THEN null ELSE t.accDateFrom END)' },
      accDateTo: { field: sqlDialect.dialect === 'MSSQL2012' ? '(CASE year(t.accDateTo) WHEN 9999 THEN null ELSE t.accDateTo END)' : '(CASE Extract(YEAR from t.accDateTo) WHEN 9999 THEN null ELSE t.accDateTo END)' }
    },
    params: {}
  }
  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)

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

  sqlBuilder.clauses.whereParams.onDate = onDate

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}
