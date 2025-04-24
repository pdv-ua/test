const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setDescription (ctx) {
  // orderService.setEmpOrderAttrs(ctx)
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
}
