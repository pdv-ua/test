const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const App = UB.App

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  checkUniqueOrg(execParams)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  checkUniqueOrg(execParams)
}

function checkUniqueOrg (execParams) {
  if (execParams.organizationID) {
    const item = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('organizationID', '=', execParams.organizationID)
      .where('ID', '!=', execParams.ID)
      .selectSingle()

    if (item) {
      throw new UB.UBAbort(`<<<Вже існує запис для обраної організації">>>`)
    }
  }
}
