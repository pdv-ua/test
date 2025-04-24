const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')

me.on('update:before', beforeUpdate)
me.entity.addMethod('changeTariffCoeff')

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  if (execParams.koef && execParams.koef !== previousValues.koef) {
    const details = UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['ID', 'accrualSum', 'dateFrom'])
      .where('dictTarifCoeffID', '=', execParams.ID)
      .selectAsObject()

    const store = UB.DataStore('hr_dictTarifCoeffDet')
    details.forEach(det => {
      const dateFrom = dateService.shiftDate(det.dateFrom)
      const baseAccrualSum = UB.Repository('hr_dictTarifCoeffDet')
        .attrs('accrualSum')
        .where('dictTarifCoeffID.baseAccrual', '=', true)
        .where('dateFrom', '<=', dateFrom)
        .where('dateTo', '>=', dateFrom)
        .selectScalar()
      const accrualSum = accrualService.round((baseAccrualSum || 0) * (execParams.koef || 0), 0) || 0
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: det.ID,
          accrualSum: accrualSum
        }
      })
    })
  }
}

me.changeTariffCoeff = function (ctx) {
  const mParams = ctx.mParams

  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const baseAccrualSum = mParams.baseAccrualSum

  const dictTariffCoeff = UB.Repository(__entityName)
    .attrs('*')
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()

  const store = UB.DataStore('hr_dictTarifCoeffDet')
  dictTariffCoeff.forEach(item => {
    const accrualSum = accrualService.round((item.baseAccrual ? 1 : item.koef) * baseAccrualSum, 0) || 0
    const det = UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['ID', 'dateFrom'])
      .where('dictTarifCoeffID', '=', item.ID)
      .where('dateTo', '=', dateService.maxDate())
      .selectSingle()

    store.run('insert', {
      execParams: {
        dateFrom: dateFrom,
        dictTarifCoeffID: item.ID,
        dateTo: det ? (dateService.shiftDate(det.dateFrom) < dateFrom ? dateService.maxDate() : dateService.addDays(det.dateFrom, -1)) : dateService.maxDate(),
        accrualSum: accrualSum
      }
    })

    if (det && dateService.shiftDate(det.dateFrom) < dateFrom) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: det.ID,
          dateTo: dateService.addDays(dateFrom, -1)
        }
      })
    }
  })
}
