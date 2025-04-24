const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)

me.entity.addMethod('loadPositionRespons')

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

me.loadPositionRespons = function (ctx) {
  let mParams = ctx.mParams
  if (!(mParams.positionID && mParams.instructionID)) return

  let store = UB.DataStore(__entityName)
  UB.Repository('hr_positionMainResponsibiliti')
    .attrs(['ID'])
    .where('positionInstructionID', '=', mParams.instructionID)
    .selectAsObject()
    .forEach(row => store.run('delete', { execParams: { ID: row.ID } }))

  const posRespons = UB.Repository('hr_positionResp')
    .attrs(['ID', 'responsibility'])
    .where('positionID', '=', mParams.positionID)
    .selectAsObject()

  posRespons.forEach(item => {
    store.run('insert', {
      execParams: {
        positionInstructionID: mParams.instructionID,
        description: item.responsibility
      }
    })
  })
}
