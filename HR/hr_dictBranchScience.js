const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  entityService.setAttrs(ctx)
  if (execParams.shortName) {
    execParams.description = `${execParams.description} (${execParams.shortName})`
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx)
  const shortName = execParams.shortName === undefined ? instanceData.shortName : execParams.shortName
  if (shortName) {
    execParams.description = `${execParams.description} (${shortName})`
  }
}
