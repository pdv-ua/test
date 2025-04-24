const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('update:before', ctx => {
  ebs.setDateTo(ctx)
  setAttrs(ctx)
})

me.on('insert:before', ctx => {
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setAttrs(ctx)
})

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.description = entityBaseService.getCompositeAttributeValue(ctx, 'description')
}
