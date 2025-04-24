// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  entityService.setAttrs(ctx)
}

function beforeUpdate (ctx) {
  entityService.setAttrs(ctx)
}
