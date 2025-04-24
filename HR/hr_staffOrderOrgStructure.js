const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function beforeInsert (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.orderDate) {
    execParams.orderDate = dateService.shiftDate(execParams.orderDate)
  }
  if (execParams.entryDate) {
    execParams.entryDate = dateService.shiftDate(execParams.entryDate)
  }
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  execParams.description = UB.i18n(`Ведення організацій {0}`, entityBaseService.getCompositeAttributeValue(ctx, 'description'))
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  orderService.checkOrderUpdate(ctx)
  execParams.description = UB.i18n(`Ведення організацій {0}`, entityBaseService.getCompositeAttributeValue(ctx, 'description'))
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_staffOrderOrgStructure')
    .attrs(['ID', 'orderDate', 'orgID'])
    .misc({ __skipRls: true })
    .selectById(execParams.ID)
  const allowDoPosting = settingsService.get('allowDoPosting', null, null)
  const orderDate = dateService.shiftDate(order.orderDate)
  const globalDate = dateService.currentTruncDate()
  if (!allowDoPosting) {
    if (orderDate > globalDate) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата наказу більша за поточну дату. Проведення неможливо')}>>>`)
    }
  }

  orderService.doPostingStaffOrder(ctx)
}

me.doCancelPosting = function (ctx) {
  orderService.doCancelPostingStaffOrder(ctx)
}
