const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.orderN) {
    execParams.orderN = (UB.Repository(__entityName)
      .attrs('MAX([orderN])')
      .selectScalar() || 0) + 1
  }
}
