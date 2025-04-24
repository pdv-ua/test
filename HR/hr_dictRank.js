const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('update:before', ctx => {
  ebs.setDateTo(ctx)
})
me.on('insert:before', ctx => {
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
})
