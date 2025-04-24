// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('update:before', beforeInsertUpdate)
me.on('insert:before', beforeInsertUpdate)

function beforeInsertUpdate (ctx) {
/*
  let mParams = ctx.mParams
  let execParams = mParams.execParams
  if (execParams.organizationID) {
    let org = UB.Repository('ac_contractor').attrs('name').selectById(execParams.organizationID)
    if (org) {
      execParams.organizationName = org.name
    }
  }
*/
}
