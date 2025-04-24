const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timeCostService = require('../HR/modules/timeCostService')
const periodService = require('../HR/modules/periodService')
const timService = require('../HR/modules/timService')
const staffService = require('../HR/modules/staffService')
const calendarService = require('../HR/modules/calendarService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addIntComb')
me.entity.addMethod('checkNoVacDays')
me.entity.addMethod('checkVacationCrossPeriod')
me.entity.addMethod('doPosting')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'dateFrom', 'dateTo', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  let dateFrom = dateService.formatDate(d['dateFrom'])
  let dateTo = dateService.formatDate(d['dateTo'])
  return UB.i18n(`{0}, з {1} по {2}, № {3} від {4}`, d['employeeID.shortFIO'], dateFrom, dateTo, d['orderID.orderNumber'], dateService.formatDate(d['orderID.orderDate']))
}

function getDescription (dateFrom, dateTo, dayCount) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let dayCountStr = dayCount ? ' тривалістю ' + dayCount + '  днів' : ''
  return UB.i18n(`Відкликання з періодичної відпустки з {0}{1}{2}`, dateFromStr, dateToStr, dayCountStr)
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.dateTo || instanceData.dateTo
  let dayCount = execParams.dayCount || instanceData.dayCount
  execParams.description = getDescription(dateFrom, dateTo, dayCount)
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeDelete (ctx) {

}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  let execParams = ctx.mParams.execParams
  let noChangeFields = ['employeePositionID', 'dateFrom', 'dateTo', 'dayCount']
  noChangeFields.forEach(item => {
    if (execParams[item] !== undefined) {
      let list = UB.Repository('hr_empOrderDet')
        .attrs('ID', 'mi_unityEntity')
        .where('ID', '<>', execParams.ID)
        .where('paraID', '=', execParams.ID)
        .selectAsObject()
      list.forEach(item => {
        UB.DataStore(item.mi_unityEntity).run('delete', {
          execParams: {
            ID: item.ID
          }
        })
      })
    }
  })

  setAttrs(ctx)
}

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.employeePositionID основне місце роботи працівника
 * @param {number} mParams.employeeNumberID таб. номер
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 * @param {string} mParams.reasonDoc підстава пункту наказу
 */
me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeePositionID = mParams.employeePositionID
  const employeeNumberID = mParams.employeeNumberID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason
  const reasonDoc = mParams.reasonDoc

  let resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATIONREVOKE', orderID, employeePositionID, dateFrom,
    dateTo, dayCount, true, {
      description: getDescription(dateFrom),
      reason: reason,
      reasonDoc: reasonDoc
    }, (orderDetID) => {
      global['hr_empOrderVacationListDet'].cloneVacationList({
        mParams: {
          paraID: orderDetID,
          orderID: orderID,
          dateFrom: dateService.shiftDate(dateFrom),
          dateTo: dateService.shiftDate(dateTo),
          dayCount: dayCount,
          empOrderType: 'VACATIONREVOKE',
          employeePositionID: employeePositionID,
          employeeNumberID: employeeNumberID
        }
      })
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

/* Перевірка на дні відкликання, для яких не знайдено відпустку
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 */
me.checkNoVacDays = ctx => {
  const maxCheckDays = 10
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)

  let msg
  if (employeeNumberID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    const crossVac = global['hr_empOrderVacationListDet'].getActiveVacationList({
      mParams: execParams
    })
    let notCheckedDays = []
    let isEtc = false
    for (let dt = dateFrom; dt.getTime() <= dateTo.getTime(); dt = dateService.addDays(dt, 1)) {
      let dayIsIn = false
      for (let i = 0; i < crossVac.length; i++) {
        let vacItem = crossVac[i]
        if (dt >= vacItem.dateFrom && dt <= vacItem.dateTo) {
          dayIsIn = true
          break
        }
      }
      if (!dayIsIn) {
        notCheckedDays.push(dt)
        if (notCheckedDays.length >= maxCheckDays) {
          isEtc = true
          break
        }
      }
    }
    if (notCheckedDays.length > 0) {
      let errDays = notCheckedDays.map(item => dateService.formatDate(item, 'dd.mm')).join(', ')
      if (isEtc) {
        errDays += '...'
      }
      msg = UB.i18n(`В періоді відкликання знайдено дні {0}, за які не надана відпустка`, errDays)
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка на перетин з іншими відкликаннями відпустки працівника
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.listDetID період пункту наказу
 * @return {string} текст помилки
 */
me.checkVacationCrossPeriod = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const orderID = execParams.orderID || 0
  const listDetID = execParams.listDetID || 0

  let msg
  if (employeeNumberID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    let crossVac = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID', 'orderID.orderNumber', 'orderID.orderDate', 'dictVacationKindID.name', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('ID', '!=', listDetID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('empOrderType', '=', 'VACATIONREVOKE')
      .where('orderID', '=', orderID, 'innerOrder')
      .where('orderID', '!=', orderID, 'outOrder')
      .where('orderID.orderState', '!=', 'PROJECT', 'notProject')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .logic('([innerOrder] or ([outOrder] and [notProject]))')
      .selectSingle()
    if (crossVac) {
      let dateFromStr = dateService.formatDate(dateFrom)
      let dateToStr = dateService.formatDate(dateTo)
      let dateFromStr2 = dateService.formatDate(crossVac.dateFrom)
      let dateToStr2 = dateService.formatDate(crossVac.dateTo)
      let orderDateStr = dateService.formatDate(crossVac['orderID.orderDate'])
      msg = `Виявлено перетин періодів, наказ відкликання з відпустки № ${crossVac['orderID.orderNumber']} від ${orderDateStr},
        "${crossVac['dictVacationKindID.name']}" з ${dateFromStr2} по ${dateToStr2}, з періодом з ${dateFromStr} по ${dateToStr}`
    }
  }
  mParams.msg = msg || ''
  return true
}

me.doPosting = function ({ item, order, saved }) {
  if (item.mi_unityEntity === __entityName) {
    const periodID = order.periodID
    const det = UB.Repository(__entityName)
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'orderID', 'errorText'])
      .selectById(item.ID)
    const detVac = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID', 'dictVacationKindID', 'sourceParaID.orderID', 'dateFrom', 'dateTo', 'paraID', 'dayCount', 'employeeID',
        'employeePositionID', 'employeeNumberID', 'empVacationPeriodID', 'dictVacationKindID.payElID.includeSecondJobs',
        'employeeNumberID.orgID', 'dictVacationKindID.payElID.dictTimeCostID'
      ])
      .where('paraID', '=', item.ID)
      .selectAsObject()
    const employeeVacationStore = UB.DataStore('hr_employeeVacation')
    const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
    detVac.forEach(vac => {
      const employeeNumbers = [vac.employeeNumberID]
      if (vac['dictVacationKindID.payElID.includeSecondJobs']) {
        const secJobs = staffService.getSecondJobs(vac.employeeID, vac.employeeNumberID, vac['employeeNumberID.orgID'], vac.dateFrom, vac.dateTo)
        secJobs.forEach(row => {
          employeeNumbers.push(row.employeeNumberID)
        })
      }
      let dateFrom = dateService.shiftDate(vac.dateFrom)
      let dateTo = dateService.shiftDate(vac.dateTo)
      /* кількість днів по табелю визначаємо по основному таб. номеру vac.employeeNumberID */
      const dictTimeCostID = vac['dictVacationKindID.payElID.dictTimeCostID'] || vac['dictVacationKindID.dictTimeCostID']
      const vacKindData = UB.Repository('tim_timeSheet')
        .attrs(['dateWork'])
        .where('employeeNumberID', '=', vac.employeeNumberID)
        .where('factTimeCostID', '=', dictTimeCostID)
        .where('isActive', '=', 1)
        .where('dateWork', '>=', dateFrom)
        .where('dateWork', '<=', dateTo)
        .orderBy('dateWork')
        .selectAsObject()
      const dayAccumCondition = UB.Repository('hr_dictVacationKind')
        .attrs('dayAccumCondition')
        .where('ID', '=', vac.dictVacationKindID)
        .selectScalar()
      let daysOff = 0
      if (dayAccumCondition === 'noHolidays') {
        const holidays = calendarService.getHolidays(dateFrom, dateTo, order.organizationID)
        holidays.forEach(day => {
          const ts = vacKindData.find(o => dateService.shiftDate(o.dateWork).getTime() === day.getTime())
          daysOff += ts ? 1 : 0
        })
      }
      /* в табелі відміняємо відпустку по всім таб. номерам */
      timService.cancelTimeSheetByOrder(vac['sourceParaID.orderID'], det.orderID, currentPeriod, vac.dateFrom, vac.dateTo, employeeNumbers, true)

      const dayCount = vacKindData.length - daysOff
      if (dayCount > 0) {
        orderService.insertByOrder({
          store: 'hr_employeeVacation',
          params: {
            organizationID: order.organizationID,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderID: det.orderID,
            paraID: vac.ID,
            dictVacationKindID: vac.dictVacationKindID,
            employeeID: vac.employeeID,
            employeePositionID: vac.employeePositionID,
            employeeNumberID: det.employeeNumberID,
            dayCount: -dayCount,
            dateFrom: dateFrom,
            dateTo: dateTo,
            dictPeriodID: periodID,
            empVacationPeriodID: vac.empVacationPeriodID,
            avgSum: 0,
            vacationStatus: 'REVOKE',
            orderState: 'POSTED'
          },
          saved: saved
        })
      }
      let errorText = det.errorText
      if (errorText) {
        orderService.updateByOrder({
          store: 'hr_empOrderVacationrevokeDet',
          params: {
            ID: det.ID,
            errorText: null
          },
          saved: saved,
          oldValues: {
            errorText: errorText
          }
        })
      }
    })
    employeeVacationStore.freeNative()
  }
}
