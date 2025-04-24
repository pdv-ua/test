const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')

me.on('delete:before', beforeDelete)
me.entity.addMethod('updateSalarySchemeOrg')
me.entity.addMethod('recalcSalaryScheme')
me.entity.addMethod('raiseSalaryScheme')
me.entity.addMethod('cancelSalaryScheme')

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const storeBase = UB.DataStore('hr_dictSalarySchemeBase')
  const storeLevel = UB.DataStore('hr_dictSalarySchemeLevel')

  const baseDet = UB.Repository('hr_dictSalarySchemeBase')
    .attrs(['ID'])
    .where('dictSalarySchemeID', '=', execParams.ID)
    .selectAsObject()
  baseDet.forEach(row => {
    storeBase.run('delete', {
      skipBeforeDelete: true,
      execParams: {
        ID: row.ID
      }
    })
  })

  const levelDet = UB.Repository('hr_dictSalarySchemeLevel')
    .attrs(['ID'])
    .where('dictSalarySchemeID', '=', execParams.ID)
    .selectAsObject()
  levelDet.forEach(row => {
    storeLevel.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
}

me.updateSalarySchemeOrg = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_dictSalarySchemeOrg')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        dictSalarySchemeID: mParams.dictSalarySchemeID,
        orgID: ID
      }
    })
  })
}

me.recalcSalaryScheme = function (ctx) {
  const dictSalarySchemeID = ctx.mParams.dictSalarySchemeID

  const salaryScheme = UB.Repository('hr_dictSalaryScheme')
    .attrs(['schemeType', 'setAccrualByMinValue', 'roundUpTo'])
    .selectById(dictSalarySchemeID)

  if (salaryScheme['schemeType'] === '1') {
    const baseSalary = UB.Repository('hr_dictSalarySchemeBase')
      .attrs(['dateFrom', 'dateTo', 'accrualSum'])
      .where('dictSalarySchemeID', '=', dictSalarySchemeID)
      .selectAsObject()
    baseSalary.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    const details = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('ID', 'coefMin', 'coefMax', 'dateFrom')
      .where('dictSalarySchemeLevelID.dictSalarySchemeID', '=', dictSalarySchemeID)
      .selectAsObject()

    const store = UB.DataStore('hr_dictSalarySchemeDet')
    details.forEach(det => {
      const dateFrom = dateService.shiftDate(det.dateFrom)
      const base = baseSalary.find(o => o.dateFrom <= dateFrom && o.dateTo >= dateFrom)
      if (base) {
        const accrualSumMin = accrualService.roundSum(base.accrualSum * det.coefMin || 0, salaryScheme.roundUpTo || '1')
        const accrualSumMax = accrualService.roundSum(base.accrualSum * det.coefMax || 0, salaryScheme.roundUpTo || '1')
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: det.ID,
            accrualSumMin,
            accrualSumMax,
            accrualSum: salaryScheme['setAccrualByMinValue'] ? accrualSumMin : null
          }
        })
      }
    })
  }
}

me.raiseSalaryScheme = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!execParams.dictSalarySchemeID || !execParams.dateFrom) {
    return
  }
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.addDays(dateFrom, -1)
  const details = UB.Repository('hr_dictSalarySchemeDet')
    .attrs('ID', 'dictSalarySchemeLevelID', 'dateFrom', 'dateTo', 'accrualSumMin', 'accrualSumMax', 'accrualSum', 'coefMin', 'coefMax')
    .where('dictSalarySchemeLevelID.dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
    .where('dateFrom', '<', dateFrom)
    .where('dateTo', '=', '#maxdate')
    .selectAsObject()

  const store = UB.DataStore('hr_dictSalarySchemeDet')
  details.forEach(item => {
    const params = {
      ID: store.generateID(),
      dictSalarySchemeLevelID: item.dictSalarySchemeLevelID,
      dateFrom,
      dateTo: '#maxdate',
      accrualSumMin: item.accrualSumMin,
      accrualSumMax: item.accrualSumMax,
      accrualSum: item.accrualSum,
      coefMin: item.coefMin,
      coefMax: item.coefMax
    }
    if (execParams.isAccrualSumMin && item.accrualSumMin) {
      params.accrualSumMin = raiseAccrualSum(item.accrualSumMin, execParams.valuation, execParams.value, execParams.roundingMode, execParams.roundUpTo)
    }
    if (execParams.isAccrualSumMax && item.accrualSumMax) {
      params.accrualSumMax = raiseAccrualSum(item.accrualSumMax, execParams.valuation, execParams.value, execParams.roundingMode, execParams.roundUpTo)
    }
    if (execParams.isAccrualSum && item.accrualSum) {
      params.accrualSum = raiseAccrualSum(item.accrualSum, execParams.valuation, execParams.value, execParams.roundingMode, execParams.roundUpTo)
    }
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dateTo
      }
    })
    store.run('insert', {
      execParams: params
    })
  })
}

function raiseAccrualSum (accrualSum, valuation, value, roundingMode, roundUpTo) {
  let newAccrualSum = accrualSum
  if (valuation === 'PRC') {
    newAccrualSum = accrualService.roundSum(accrualService.round(newAccrualSum * (1 + value / 100)), roundUpTo, roundingMode)
  } else if (valuation === 'SUM') {
    newAccrualSum = accrualService.roundSum(newAccrualSum + value, roundUpTo, roundingMode)
  }
  return newAccrualSum
}

me.cancelSalaryScheme = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!execParams.dictSalarySchemeID || !execParams.dateFrom) {
    return
  }
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const details = UB.Repository('hr_dictSalarySchemeDet')
    .attrs('ID', 'dictSalarySchemeLevelID')
    .where('dictSalarySchemeLevelID.dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
    .where('dateFrom', '=', dateFrom)
    .where('dateTo', '=', '#maxdate')
    .selectAsObject()

  const store = UB.DataStore('hr_dictSalarySchemeDet')
  details.forEach(item => {
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID
      }
    })
    const prevDet = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('ID')
      .where('dictSalarySchemeLevelID', '=', item.dictSalarySchemeLevelID)
      .orderBy('dateFrom', 'desc')
      .selectSingle()
    if (prevDet) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: prevDet.ID,
          dateTo: '#maxdate'
        }
      })
    }
  })
}
