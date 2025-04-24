// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const entityService = require('../HR/modules/entityService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function clearDummyFields (ctx) {
  const execParams = ctx.mParams.execParams
  let attrs = ctx.dataStore.entity.attributes
  for (let attrName in attrs) {
    let attr = attrs[attrName]
    if (attr.mapping && attr.mapping.expressionType) {
      delete execParams[attrName]
    }
  }
}

function setAttrs (ctx) {
  entityService.setAttrs(ctx)
  ebs.setDateTo(ctx)
  clearDummyFields(ctx)
}

function beforeInsert (ctx) {
  ctx.mParams.method = 'insert'
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isInternalOperation) {
    return
  }
  setAttrs(ctx)
}
