// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const parts = ebs.getCompositeAttributeValue(ctx, 'description',
    [
      'itemIdx',
      'orderID.description',
      'targetOrderID.description'
    ], '^', true).split('^')
  execParams.description = parts[0] + ' ' + parts[2]
  execParams.title = ' '
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
