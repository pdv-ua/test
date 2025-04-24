const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.details = [
  {
    detailName: 'empOrderRecallListDet',
    entityName: 'hr_empOrderRecallListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'orderID', 'paraID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount'
    ], ['lineNum'])
  }
]

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx)
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function afterInsert (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}
