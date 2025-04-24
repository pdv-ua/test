const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const moment = require('moment')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  return UB.i18n(`Наказ про роботу у вихідні дні №  {0} від {1}`, d['orderID.orderNumber'], moment(d['orderID.orderDate']).format('DD.MM.YYYY'))
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.description = `${UB.i18n('Вихідний/святковий день')} ${dateService.getStringFormatDate(execParams.dateFrom, false, UB.i18n(' р.'))}`
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

me.doPosting = function ({ item, order, isImportOperation, currentPeriod, saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'typeCompensation', 'byRequest', 'dictTimeCostID', 'dictTimeCost2ID', 'dateRest','workHours'])
    .selectById(item.ID)
  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  if (para.dictTimeCostID) {
    timService.setTimeSheet([{
      orderID: order.ID,
      employeeNumberID: para.employeeNumberID,
      periodID: currentPeriod.ID,
      dateWork: dateService.shiftDate(para.dateFrom),
      factTimeCostID: para.dictTimeCostID,
      factHour: para['workHours'],
      planHour: para['workHours'],
      overridePlanHours: true,
      isCorrection: true
    }],
    true)
  }
  if (para['typeCompensation'] === 'HOLIDAY' && !para.byRequest && para.dateRest && para.dictTimeCost2ID) {
    timService.setTimeSheet([{
      orderID: order.ID,
      employeeNumberID: para.employeeNumberID,
      periodID: currentPeriod.ID,
      dateWork: dateService.shiftDate(para.dateRest),
      factTimeCostID: para.dictTimeCost2ID,
      factHour: para['workHours'],
      planHour: para['workHours'],
      overridePlanHours: true,
      isCorrection: true
    }],
    true)
  }
  if (para['typeCompensation'] === 'HOLIDAY' && para.byRequest) {
    const dictVacationKindID = UB.Repository('hr_dictVacationKind')
      .attrs(['ID'])
      .where('code', '=', 'dWeekWork')
      .selectScalar()
    if (dictVacationKindID) {
      let empVacPlanID
      const empVacPlan = UB.Repository('hr_empVacationPlan')
        .attrs(['ID', 'dayCount'])
        .where('dictVacationKindID', '=', dictVacationKindID)
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('employeeID', '=', para.employeeID)
        .where('dateTo', '=', '#maxdate')
        .selectSingle()
      if (empVacPlan) {
        empVacPlanID = empVacPlan.ID
      } else {
        const store = UB.DataStore('hr_empVacationPlan')
        empVacPlanID = store.generateID()
        store.run('insert', {
          __skipSelectAfterInsert: true,
          isOrderOperation: true,
          isImportOperation: isImportOperation,
          execParams: {
            ID: empVacPlanID,
            employeeNumberID: para.employeeNumberID,
            employeeID: para.employeeID,
            dictVacationKindID: dictVacationKindID,
            dateFrom: para.dateFrom,
            dateTo: dateService.maxDate(),
            dayCount: 1,
            orderID: null,
            orderDetID: item.ID
          }
        })
      }
      orderService.insertByOrder({
        store: 'hr_empVacationPeriod',
        params: {
          empVacationPlanID: empVacPlanID,
          dateFrom: para.dateFrom,
          dateTo: para.dateFrom,
          dayCountPlan: 1,
          orderDetID: item.ID
        },
        saved: saved
      })
    }
  }
}

me.doCancelPosting = function (item) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'typeCompensation', 'byRequest', 'dictTimeCostID', 'dictTimeCost2ID', 'dateRest'])
    .selectById(item.ID)
  timService.cancelTimeSheet(item.orderID)
  orderService.restoreOldValues(item)
  if (para['typeCompensation'] === 'HOLIDAY' && para.byRequest) {
    const dictVacationKindID = UB.Repository('hr_dictVacationKind')
      .attrs(['ID'])
      .where('code', '=', 'dWeekWork')
      .selectScalar()
    if (dictVacationKindID) {
      const empVacPlan = UB.Repository('hr_empVacationPlan')
        .attrs(['ID'])
        .where('dictVacationKindID', '=', dictVacationKindID)
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('employeeID', '=', para.employeeID)
        .where('dateTo', '=', '#maxdate')
        .selectSingle()
      if (empVacPlan) {
        const vacPeriod = UB.Repository('hr_empVacationPeriod')
          .attrs('ID')
          .where('empVacationPlanID', '=', empVacPlan.ID)
          .limit(1)
          .selectSingle()
        if (!vacPeriod) {
          const store = UB.DataStore('hr_empVacationPlan')
          store.run('delete', {
            execParams: {
              ID: empVacPlan.ID
            }
          })
        }
      }
    }
  }
}
