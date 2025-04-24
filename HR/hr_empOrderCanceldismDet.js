const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setDescription (ctx) {
  let execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['dismParaID.orderID.orderNumber', 'dismParaID.orderID.dictEmpOrderIndexID.code', 'dismParaID.orderID.orderDate', 'dismParaID.orderID'], '^', true).split('^')
  let oNum = parts[0]
  if (parts[1]) {
    oNum += ('/' + parts[1])
  }
  execParams.description = UB.i18n(`Скасовано наказ про звільнення № {0} від {1}`, oNum, parts[2])
  execParams.dismOrderID = Number(parts[3])
  execParams.dateTo = '#maxdate'
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetDescription: true
  })
  setDescription(ctx)
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
