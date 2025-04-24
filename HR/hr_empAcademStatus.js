const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const employeeService = require('../HR/modules/employeeService')

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)

function afterInsert (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    employeeService.updateAddDescriptionPerson(execParams.employeeID)
  }
}

function afterUpdate (ctx) {
  if (!ctx.mParams.isImport) {
    const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
    employeeService.updateAddDescriptionPerson(instanceData.employeeID)
  }
}

function beforeDelete (ctx) {
  if (!ctx.mParams.isImport) {
    ctx.previousValues = ctx.dataStore.getAsJsObject()[0] || {}
  }
}

function afterDelete (ctx) {
  if (!ctx.mParams.isImport && ctx.previousValues) {
    employeeService.updateAddDescriptionPerson(ctx.previousValues.employeeID)
  }
}
