const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
// me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  setItemIdx(ctx)
}

function setItemIdx (ctx) {
  let execParams = ctx.mParams.execParams
  let itemIdx = execParams.itemIdx
  if (itemIdx) {
    return
  }
  if (execParams.ID) {
    itemIdx = UB.Repository(__entityName).attrs('max([itemIdx])').where('ID', '=', execParams.ID).select().get(0)
  }
  execParams.itemIdx = itemIdx ? itemIdx + 1 : 1
}
