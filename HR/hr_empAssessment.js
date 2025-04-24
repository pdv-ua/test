const orderService = require('../HR/modules/orderService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('delete:before', beforeDelete)

function beforeDelete (ctx) {
  orderService.beforeDeleteOrder(ctx)
}
