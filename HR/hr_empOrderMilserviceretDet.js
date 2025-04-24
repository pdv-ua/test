const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
// const ebs = require('../AC/modules/entityServices/entityBaseService')
// const UB = require('@unitybase/ub')
const moment = require('moment')
const timeCostService = require('./modules/timeCostService')

me.entity.addMethod('addIntComb')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setDescription (ctx) {
  let execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.description = UB.i18n(`Повернення до виконання посадових обов'язків з {0}`, moment(execParams.dateFrom).format('DD.MM.YYYY'))
  }
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetDescription: true
  })
}

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 */
me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeePositionIDs = mParams.employeePositionIDs
  const dateFrom = mParams.dateFrom

  let resInfo = timeCostService.addIntCombOrderItems(__entityName, 'MILSERVICERET', orderID, employeePositionIDs, dateFrom,
    null, false, {})
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
  setDescription(ctx)
}
