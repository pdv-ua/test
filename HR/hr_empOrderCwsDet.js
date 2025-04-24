const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const moment = require('moment')
const orderService = require('../HR/modules/orderService')
// const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
  if (execParams.workScheduleID) {
    execParams.description = UB.Repository('hr_workSchedule').attrs('name').selectById(execParams.workScheduleID).name
  }
}
function checkWorkScheduleOldID (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.method === 'insert') {
    if (!execParams.workScheduleOldID) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника не встановлений поточний графік роботи, збереження запису неможливе')}>>>`)
    }
    return
  }
  if (execParams.workScheduleOldID !== undefined && !execParams.workScheduleOldID) {
    throw new UB.UBAbort(`<<<${UB.i18n('У працівника не встановлений поточний графік роботи, збереження запису неможливе')}>>>`)
  }
}
function beforeInsert (ctx) {
  checkWorkScheduleOldID(ctx)
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  checkWorkScheduleOldID(ctx)
  setAttrs(ctx)
}
