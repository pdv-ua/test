const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)

function beforeInsert (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  entityService.setAttrs(ctx)
  const store = UB.DataStore(__entityName)

  const dateFrom = dateService.shiftDate(execParams.dateFrom)

  const prevItem = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .where('dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
    .selectSingle()
  const nextItem = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('dateFrom', '>=', dateFrom)
    .where('dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
    .orderBy('dateFrom')
    .selectSingle()
  if (prevItem) {
    store.run('update', {
      __skipOptimisticLock: true,
      skipBefore: true,
      execParams: {
        ID: prevItem.ID,
        dateTo: dateService.addDays(dateFrom, -1)
      }
    })
  }
  if (nextItem) {
    execParams.dateTo = dateService.addDays(nextItem.dateFrom, -1)
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams

  const salaryScheme = UB.Repository('hr_dictSalaryScheme')
    .attrs('schemeType', 'setAccrualByMinValue')
    .selectById(execParams.dictSalarySchemeID)

  if (salaryScheme['schemeType'] === '1') {
    const dateFrom = dateService.shiftDate(execParams.dateFrom)
    const nextItem = UB.Repository(__entityName)
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('dateFrom', '>', dateFrom)
      .where('dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
      .where('ID', '!=', execParams.ID)
      .orderBy('dateFrom')
      .selectSingle()
    if (!nextItem) {
      const baseAccrualSum = execParams.accrualSum
      const storeDet = UB.DataStore('hr_dictSalarySchemeDet')

      const details = UB.Repository('hr_dictSalarySchemeDet')
        .attrs('ID', 'dateFrom', 'dateTo', 'coefMin', 'coefMax', 'dictSalarySchemeLevelID')
        .where('dictSalarySchemeLevelID.dictSalarySchemeID', '=', execParams.dictSalarySchemeID)
        .where('dateFrom', '<=', dateFrom)
        .where('dateTo', '=', '#maxdate')
        .where('coefMin', 'isNotNull')
        .where('coefMax', 'isNotNull')
        .selectAsObject()

      details.forEach(detail => {
        const accrualSumMin = accrualService.round(baseAccrualSum * detail.coefMin || 0, 2)
        const accrualSumMax = accrualService.round(baseAccrualSum * detail.coefMax || 0, 2)
        storeDet.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: detail.ID,
            dateTo: dateService.addDays(dateFrom, -1)
          }
        })

        storeDet.run('insert', {
          execParams: {
            dateFrom,
            dictSalarySchemeLevelID: detail.dictSalarySchemeLevelID,
            dateTo: dateService.maxDate(),
            coefMin: detail.coefMin,
            coefMax: detail.coefMax,
            accrualSumMin,
            accrualSumMax,
            accrualSum: salaryScheme['setAccrualByMinValue'] ? accrualSumMin : null
          }
        })
      })
    }
  }
}

function beforeUpdate (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  entityService.setAttrs(ctx)
  if (execParams.dateFrom) {
    const store = UB.DataStore(__entityName)
    const instanceData = ctx.dataStore.getAsJsObject()[0] || {}

    const dateFrom = dateService.shiftDate(execParams.dateFrom)
    const prevItem = UB.Repository(__entityName)
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('dateTo', '<=', dateService.shiftDate(instanceData.dateFrom))
      .where('dictSalarySchemeID', '=', execParams.dictSalarySchemeID || instanceData.dictSalarySchemeID)
      .orderBy('dateTo', 'DESC')
      .selectSingle()
    if (prevItem) {
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
}

function beforeDelete (ctx) {
  if (ctx.mParams.skipBeforeDelete) {
    return
  }
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  const store = UB.DataStore(__entityName)

  const prevItem = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('dateFrom', '<', dateService.shiftDate(instanceData.dateFrom))
    .where('dictSalarySchemeID', '=', instanceData.dictSalarySchemeID)
    .orderBy('dateFrom', 'DESC')
    .selectSingle()
  const lastItem = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom'])
    .where('dictSalarySchemeID', '=', instanceData.dictSalarySchemeID)
    .orderBy('dateTo', 'DESC')
    .selectSingle()
  const isLastItem = lastItem.ID === ctx.mParams.execParams.ID
  if (prevItem) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: prevItem.ID,
        dateTo: isLastItem ? dateService.maxDate() : dateService.shiftDate(instanceData.dateTo)
      }
    })
  }
  const storeDet = UB.DataStore('hr_dictSalarySchemeDet')
  if (isLastItem) {
    const details = UB.Repository('hr_dictSalarySchemeDet')
      .attrs(['ID', 'mi_modifyDate'])
      .where('dateFrom', '=', lastItem.dateFrom)
      .selectAsObject()
    details.forEach(item => {
      storeDet.run('delete', {
        execParams: {
          ID: item.ID,
          mi_modifyDate: item.mi_modifyDate
        }
      })
    })
    const prevDetails = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('ID')
      .where('dateTo', '=', dateService.addDays(lastItem.dateFrom, -1))
      .selectAsObject()
    prevDetails.forEach(item => {
      storeDet.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          dateTo: dateService.maxDate()
        }
      })
    })
  }
}
