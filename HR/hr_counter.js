const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const orderService = require('./modules/orderService')

me.entity.addMethod('search')
me.on('insert:after', initRegNum)
me.on('update:after', initRegNum)

me.search = function (ctx) {
  let result = []
  const mParams = ctx.mParams
  let repository = UB.Repository('hr_counter').attrs(mParams.fieldList)
  mParams.whereList.forEach(value => {
    repository = repository.where(value.expression, value.condition, value.values)
  })

  repository = repository.selectAsObject()

  repository.forEach(value => {
    value.orderEntity = global[value.orderEntity].entity.description
    result.push(value)
  })

  ctx.dataStore.initialize(result)
}

function initRegNum (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  let modifiedAttributes = Object.keys(ctx.mParams.execParams)
  if (modifiedAttributes.includes('period') ||
    modifiedAttributes.includes('orderEntity') ||
    modifiedAttributes.includes('prefix') ||
    modifiedAttributes.includes('organization')) {
    orderService.getOrderNum(execParams.orderEntity || instanceData.orderEntity, null,
      execParams.organization || instanceData.organization, 0)
  }
}
