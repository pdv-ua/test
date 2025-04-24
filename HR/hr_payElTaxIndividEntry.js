const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  checkDuplicate(ctx)
}

function beforeUpdate (ctx) {
  checkDuplicate(ctx)
}

function checkDuplicate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (instanceData.taxIndividID || execParams.taxIndividID) {
    const dateFrom = dateService.shiftDate(execParams.dateFromEmpty || instanceData.dateFrom || dateService.minDate())
    const dateTo = dateService.shiftDate(execParams.dateToEmpty || instanceData.dateTo || dateService.maxDate())
    const found = UB.Repository('hr_payElTaxIndividEntry')
      .attrs('payElID.description')
      .where('taxIndividID', '=', instanceData.taxIndividID || execParams.taxIndividID)
      .where('payElID', '=', instanceData.payElID || execParams.payElID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('ID', '<>', execParams.ID)
      .orderBy('mi_createDate', 'desc')
      .selectSingle()
    if (found) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вид доходу вже призначено для виду оплати')} ${found['payElID.description']}>>>`)
    }
  }
}
