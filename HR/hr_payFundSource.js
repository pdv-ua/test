const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
}

function checkDate (ctx, instanceData) {
  if (ctx.mParams.skipUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  const payFundSourceStore = UB.DataStore('hr_payFundSource')
  let dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const payFundSource = UB.Repository('hr_payFundSource')
    .attrs('ID', 'dateFrom', 'dateTo', 'mi_modifyDate')
    .where('dictFundSourceID', '=', execParams.dictFundSourceID || instanceData.dictFundSourceID)
    .where('payFundID', '=', execParams.payFundID || instanceData.payFundID)
    .where('dateTo', '>=', dateFrom)
    .where('ID', '!=', execParams.ID)
    .selectAsObject()

  payFundSource.forEach(row => {
    if (dateService.shiftDate(row.dateFrom) >= dateFrom) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата початку дії якого більше або дорівнює даті початку  дії поточного запису')}>>>`)
    }
    if (dateService.shiftDate(row.dateTo) >= dateFrom) {
      payFundSourceStore.run('update', {
        skipUpdate: true,
        execParams: {
          ID: row.ID,
          mi_modifyDate: row.mi_modifyDate,
          dateTo: dateService.addDays(dateFrom, -1)
        }
      })
    }
  })
}
