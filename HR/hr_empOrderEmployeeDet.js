const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const UB = require('@unitybase/ub')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx)
}

function setDates (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  let paraID = execParams.paraID || instanceData.paraID
  let master = UB.Repository('hr_empOrderDet').attrs(['dateFrom', 'dateTo']).selectById(paraID)
  if (master && master.dateFrom) {
    execParams.dateFrom = new Date(master.dateFrom)
  }
  if (master && master.dateTo) {
    execParams.dateTo = new Date(master.dateTo)
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
  setDates(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDates(ctx)
  setAttrs(ctx)
}
