const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const schemeID = UB.Repository('hr_dictSalarySchemeLevel')
    .attrs('dictSalarySchemeID')
    .misc({ __allowSelectSafeDeleted: true })
    .where('ID', '=', execParams.dictSalarySchemeLevelID)
    .selectScalar()

  if (execParams.dateFromEmpty) {
    const dateFrom = dateService.shiftDate(execParams.dateFromEmpty)
    const prevItem = UB.Repository(__entityName)
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('dictSalarySchemeLevelID', '=', execParams.dictSalarySchemeLevelID)
      .selectSingle()
    if (prevItem) {
      const store = UB.DataStore(__entityName)
      store.run('update', {
        __skipOptimisticLock: true,
        skipBefore: true,
        execParams: {
          ID: prevItem.ID,
          dateTo: dateService.addDays(dateFrom, -1)
        }
      })
    }
  }
  const baseSum = execParams.dateFromEmpty
    ? UB.Repository('hr_dictSalarySchemeBase')
      .attrs('accrualSum')
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateFromEmpty))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFromEmpty))
      .where('dictSalarySchemeID', '=', schemeID)
      .selectScalar() || 0
    : 0

  if (!execParams.accrualSumMin) {
    execParams.accrualSumMin = (execParams.coefMin || 0) * baseSum
  }
  if (!execParams.accrualSumMax) {
    execParams.accrualSumMax = (execParams.coefMax || 0) * baseSum
  }
  roundSum(execParams, execParams.dictSalarySchemeLevelID)
  entityService.setAttrs(ctx)
}

function roundSum (execParams, dictSalarySchemeLevelID) {
  const scheme = UB.Repository('hr_dictSalarySchemeLevel')
    .attrs('dictSalarySchemeID.schemeType', 'dictSalarySchemeID.roundUpTo', 'dictSalarySchemeID.setAccrualByMinValue')
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(dictSalarySchemeLevelID, {
      'dictSalarySchemeID.schemeType': 'schemeType',
      'dictSalarySchemeID.roundUpTo': 'roundUpTo',
      'dictSalarySchemeID.setAccrualByMinValue': 'setAccrualByMinValue'
    }) || {}
  if (scheme) {
    if (execParams.accrualSum) {
      execParams.accrualSum = accrualService.roundSum(execParams.accrualSum, scheme['roundUpTo'] || '1')
    }
    if (execParams.accrualSumMin) {
      execParams.accrualSumMin = accrualService.roundSum(execParams.accrualSumMin, scheme['roundUpTo'] || '1')
    }
    if (execParams.accrualSumMax) {
      execParams.accrualSumMax = accrualService.roundSum(execParams.accrualSumMax, scheme['roundUpTo'] || '1')
    }
    if (!execParams.accrualSum && scheme['setAccrualByMinValue']) {
      execParams.accrualSum = execParams.accrualSumMin
    }
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  roundSum(execParams, instanceData.get('dictSalarySchemeLevelID'))
  entityService.setAttrs(ctx)
}
