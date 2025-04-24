const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  setItemIdx(ctx)
}

function setItemIdx (ctx) {
  let execParams = ctx.mParams.execParams
  let itemIdx = execParams.itemIdx
  if (itemIdx) {
    return
  }
  if (execParams.positionInstructionID) {
    itemIdx = UB.Repository(__entityName).attrs('max([itemIdx])').where('positionInstructionID', '=', execParams.positionInstructionID).select().get(0)
  }
  execParams.itemIdx = itemIdx ? itemIdx + 1 : 1
}
