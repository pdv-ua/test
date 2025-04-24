const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const timeCostService = require('./modules/timeCostService')

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('checkCrossTimeSheet')
me.entity.addMethod('addIntComb')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'title', 'orderID.orderNumber', 'orderID.orderDate', 'dictMilitaryDutyID.name', 'dateFrom', 'dateTo'])
    .selectById(ID)
  return UB.i18n(`{0}, {1}, № {2} від {3}, {4}, з {5}  {6}`, d['employeeID.shortFIO'], d.title, d['orderID.orderNumber'],
    d['orderID.orderDate'], d['dictMilitaryDutyID.name'].toLowerCase(), dateService.formatDate(d.dateFrom), d.dateTo ? ' по ' + dateService.formatDate(d.dateTo) : '')
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
  const dictTimeCostID = mParams.dictTimeCostID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const payElID = mParams.payElID
  const dictMilitaryDutyID = mParams.dictMilitaryDutyID
  const isPosReserved = mParams.isPosReserved
  const isTempStopVacation = mParams.isTempStopVacation

  let resInfo = timeCostService.addIntCombOrderItems(__entityName, 'MILSERVICE', orderID, employeePositionIDs, dateFrom,
    dateTo, false, {
      dictTimeCostID,
      payElID,
      dictMilitaryDutyID,
      isPosReserved,
      isTempStopVacation
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

function setDescription (ctx) {
  let execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['employeeID.shortFIO', 'title', 'orderID.orderNumber', 'orderID.orderDate', 'dictMilitaryDutyID.name', 'dateFrom', 'dateTo'],
    '^', true).split('^')
  execParams.description = `${parts[4]} ${UB.i18n('з')} ${parts[5]}${parts[6] ? ' по ' + parts[6] : ''}`
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetDescription: true
  })
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

me.checkCrossTimeSheet = function (ctx) {
  const mParams = ctx.mParams
  const employeeNumberID = mParams.employeeNumberID
  const dictTimeCostID = mParams.dictTimeCostID
  // const dateFrom = dateService.shiftDate(mParams.dateFrom)
  // const dateTo = Math.min(dateService.addMonths(dateService.lastDayOfMonth(dateFrom), 3), mParams.dateTo ? dateService.shiftDate(mParams.dateTo) : dateService.maxDate())
  const result = timService.checkCrossTimeSheet(employeeNumberID, dictTimeCostID, mParams.dateFrom, mParams.dateTo)
  mParams.result = JSON.stringify(result)
}
