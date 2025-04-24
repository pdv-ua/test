const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  if (execParams.isChanged === undefined || execParams.isChanged === null) execParams.isChanged = 1
}

function beforeUpdate (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  // if (execParams.isChanged === null) execParams.isChanged = 0
  // if (execParams.isChanged === undefined) execParams.isChanged = 0

  if (execParams.quantity !== undefined) {
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    if (previousValues && previousValues.quantity && previousValues.quantity !== execParams.quantity) {
      execParams.isChanged = 1
    }
  }
}
