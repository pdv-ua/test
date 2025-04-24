const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx)
}

function beforeInsert (ctx) {
  let execParams = ctx.mParams.execParams
  if (!execParams.description) {
    execParams.description = '..'
  }
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  let execParams = ctx.mParams.execParams
  if (execParams.description !== undefined && !execParams.description) {
    execParams.description = '..'
  }
  setAttrs(ctx)
}
