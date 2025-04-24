const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.respNum) {
    const lastRespNum = UB.Repository(__entityName)
      .attrs('respNum')
      .where('orderID', '=', execParams.orderID || 0)
      .orderBy('respNum', 'desc')
      .limit(1)
      .selectScalar() || 0
    execParams.respNum = lastRespNum + 1
  }
}
