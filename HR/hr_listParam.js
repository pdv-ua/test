const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.entity.addMethod('canVisibleUpdateValues')

me.on('insert:after', ctx => {
  if (ctx.mParams.bindToReport) {
    UB.DataStore('hr_reportParam').run('insert', { execParams: { listParamID: ctx.mParams.execParams.ID, reportCode: ctx.mParams.bindToReport } })
  }
})
me.canVisibleUpdateValues = () => {}
