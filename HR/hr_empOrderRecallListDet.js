const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('clearDetail')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.dayCount) {
    execParams.dayCount = dateService.dateDiff(dateService.shiftDate(execParams.dateFrom), dateService.shiftDate(execParams.dateTo))
  }
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  let execParams = ctx.mParams.execParams
  if ((execParams.dateFrom || execParams.dateTo) && !execParams.dayCount) {
    execParams.dayCount = dateService.dateDiff(dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom), dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
  }
}

me.clearDetail = function (ctx) {
  const paraID = ctx.mParams.paraID
  const detailRows = UB.Repository(__entityName)
    .attrs('ID')
    .where('paraID', '=', paraID)
    .selectAsObject()
  let store = UB.DataStore(__entityName)
  detailRows.forEach((item) => {
    store.run('delete', { execParams: { ID: item.ID } })
  })
  store.freeNative()
}
