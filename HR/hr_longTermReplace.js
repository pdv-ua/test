
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const employeeService = require('../HR/modules/employeeService')

me.on('update:before', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = instanceData
  if (!ctx.mParams.execParams.dateTo) {
    ebs.setDateTo(ctx)
  }
})
me.on('insert:before', ctx => {
  if (!ctx.mParams.execParams.dateTo) {
    ctx.mParams.method = 'insert'
    ebs.setDateTo(ctx)
  }
})
me.on('delete:before', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = instanceData
})


me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)

function afterInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  employeeService.updateEmployeeAddPersonDescription(execParams.employeeNumberReplID)
}
function afterUpdate (ctx) {
  const previousValues = ctx.previousValues || {}
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (previousValues.employeeNumberReplID) {
    employeeService.updateEmployeeAddPersonDescription(previousValues.employeeNumberReplID)
  }
  if (execParams.employeeNumberReplID && execParams.employeeNumberReplID !== previousValues.employeeNumberReplID) {
    employeeService.updateEmployeeAddPersonDescription(execParams.employeeNumberReplID)
  }
}
function afterDelete (ctx) {
  const previousValues = ctx.previousValues || {}
  if (previousValues.employeeNumberReplID) {
    employeeService.updateEmployeeAddPersonDescription(previousValues.employeeNumberReplID)
  }
}


