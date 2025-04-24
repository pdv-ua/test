const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsertUpdate)
me.on('delete:before', beforeDelete)

function beforeInsertUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.dateTo) {
    execParams.dateTo = execParams.dateTrialEnd
  }
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderID') && !ctx.mParams.isOrderOperation) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис створено наказом. Видалення неможливе.')}>>>`)
  }
}
