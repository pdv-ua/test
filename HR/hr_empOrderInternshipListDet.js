const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  let execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!execParams.description && execParams.description !== undefined) {
    execParams.description = '..'
  }
  if (execParams.firstName || execParams.lastName || execParams.middleName) {
    execParams.title = (execParams.lastName || instanceData.lastName) + ' ' + (execParams.firstName || instanceData.firstName) + ' ' + (execParams.middleName || instanceData.middleName)
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}
