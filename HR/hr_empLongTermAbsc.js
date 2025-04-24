const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', ctx => {
  if (ctx.mParams.execParams.dateFrom) {
    ctx.mParams.execParams.dateFrom = dateService.shiftDate(ctx.mParams.execParams.dateFrom)
  }

  if (!ctx.mParams.execParams.dateTo) {
    ebs.setDateTo(ctx)
  }
  afterInsertOrUpdate(ctx)
})
me.on('insert:before', ctx => {
  if (!ctx.mParams.execParams.dateTo) {
    ctx.mParams.method = 'insert'
    ebs.setDateTo(ctx)
  }
  afterInsertOrUpdate(ctx)
})

function afterInsertOrUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (!execParams.description && (execParams.orderID || execParams.changeOrderID)) {
    let description = ''
    if (execParams.orderID || instanceData.orderID) {
      const order = UB.Repository('hr_order').attrs(['description']).selectById(execParams.orderID || instanceData.orderID)
      if (order) {
        description = order.description
      }
    }
    if (execParams.changeOrderID || instanceData.changeOrderID) {
      const changeOrder = UB.Repository('hr_order').attrs(['description']).selectById(execParams.changeOrderID || instanceData.changeOrderID)
      if (changeOrder) {
        description = UB.i18n(`{0}. Припинення - {1}`, description, changeOrder.description)
      }
    }
    execParams.description = description
  }
}
