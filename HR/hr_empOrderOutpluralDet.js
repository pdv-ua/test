// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
// const moment = require('moment')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.setEmpOrderAttrs(ctx)
  if (!execParams.description && execParams.title) {
    execParams.description = execParams.title
  }
  if (execParams.dateFrom) {
    execParams.dateTo = execParams.dateFrom
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
