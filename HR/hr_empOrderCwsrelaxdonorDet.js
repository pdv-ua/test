// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const moment = require('moment')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.description = `${UB.i18n('День відпочинку за день донорства')} ${dateService.getStringFormatDate(execParams.dateFrom, false, UB.i18n(' р.'))}`
  }
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
