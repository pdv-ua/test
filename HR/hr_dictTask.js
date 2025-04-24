// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', ctx => {
  setEmpOrderType(ctx)
})
me.on('update:before', ctx => {
  setEmpOrderType(ctx)
})

function setEmpOrderType (ctx) {
  let execParams = ctx.mParams.execParams
  if (execParams.isCommon !== undefined) {
    if (execParams.isCommon) {
      execParams.empOrderType = 'COMMON'
    }
  }
}
