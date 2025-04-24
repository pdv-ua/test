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
me.on('select:after', afterSelect)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addIntComb')
me.entity.addMethod('checkNoVacDays')
me.entity.addMethod('checkVacationCrossPeriod')
me.entity.addMethod('doPosting')

me.details = [
  {
    detailName: 'empOrderVacationMoveDet',
    entityName: 'hr_empOrderVacationMoveDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'paraID', 'orderID', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'dayCount', 'empVacationPeriodID',
      'empVacationPeriodID.description', 'employeeNumberID', 'dictVacationKindID'
    ], ['lineNum'])
  },
  {
    detailName: 'empOrderVacationListDet',
    entityName: 'hr_empOrderVacationListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'paraID', 'orderID', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'dayCount', 'empVacationPeriodID',
      'empVacationPeriodID.description', 'employeeNumberID', 'dictVacationKindID', 'sourceParaID'
    ], ['lineNum'])
  }
]

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

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
  orderService.saveDetails(ctx, me.details)
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
  let isVacRetProlongDet = item.mi_unityEntity === 'hr_empOrderVacretprolongDet'
  if (isVacRetProlongDet) {
    const para = UB.Repository(item.mi_unityEntity)
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID', 'employeePositionID', 'employeeNumberID', 'employeePositionID.description'])
      .selectById(item.ID)

    const periodID = order.periodID
    const detVacs = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID', 'dictVacationKindID', 'sourceParaID.orderID', 'dateFrom', 'dateTo', 'paraID', 'dayCount', 'employeeID',
        'employeePositionID', 'employeeNumberID', 'empVacationPeriodID', 'dictVacationKindID.payElID.includeSecondJobs',
        'employeeNumberID.orgID', 'dictVacationKindID.payElID.dictTimeCostID'
      ])
      .where('paraID', '=', item.ID)
      .selectAsObject()
    if (!detVacs.length) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} не вказані види відпусток! Скоригуйте дані!', para['employeePositionID.description'])}>>>`)
    }
    const employeeVacationStore = UB.DataStore('hr_employeeVacation')
    const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
    detVacs.forEach(vac => {
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
      timService.cancelTimeSheetByOrder(vac['sourceParaID.orderID'], order.ID, currentPeriod, vac.dateFrom, vac.dateTo, employeeNumbers, true)

      const dayCount = vacKindData.length - daysOff
      if (dayCount > 0) {
        orderService.insertByOrder({
          store: 'hr_employeeVacation',
          params: {
            organizationID: order.organizationID,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderID: order.ID,
            paraID: vac.ID,
            dictVacationKindID: vac.dictVacationKindID,
            employeeID: vac.employeeID,
            employeePositionID: vac.employeePositionID,
            employeeNumberID: item.employeeNumberID,
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
    })
    const detMoveVacs = UB.Repository('hr_empOrderVacationMoveDet')
      .attrs(['ID', 'paraID', 'paraID.ID', 'dateFrom', 'dateTo', 'dayCount', 'empVacationPeriodID', 'organizationID.mi_data_id',
        'employeeID', 'dictVacationKindID', 'employeePositionID', 'employeePositionID.dateFrom', 'employeePositionID.dateTo',
        'employeePositionID.accrualSum', 'employeeNumberID', 'dictVacationKindID.code', 'dictVacationKindID.dictTimeCostID',
        'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.description', 'isContinuous', 'dictVacationKindID.payElID.dictTimeCostID',
        'dictVacationKindID.payElID.dictTimeCostID.code', 'dictVacationKindID.payElID.includeSecondJobs', 'employeeNumberID.orgID', 'isBackOrder'])
      .where('paraID', '=', item.ID)
      .selectAsObject()
    if (!detMoveVacs.length) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} не вказані періоди перенесення відпусток! Скоригуйте дані!', para['employeePositionID.description'])}>>>`)
    }
    detMoveVacs.forEach(para => {
      para.periodID = order.periodID
      para.mi_unityEntity = item.mi_unityEntity
      para.dictTimeCostID = para['dictVacationKindID.payElID.dictTimeCostID'] || para['dictVacationKindID.dictTimeCostID']
      para.includeSecondJobs = para['dictVacationKindID.payElID.includeSecondJobs']
      para.factHour = 0
      orderService.setTimeSheet({ para: para, saved: saved, currentPeriod })
      orderService.insertByOrder({
        store: 'hr_employeeVacation',
        params: {
          organizationID: order.organizationID,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          orderID: order.ID,
          paraID: item.ID,
          dictVacationKindID: para.dictVacationKindID,
          employeeID: para.employeeID,
          employeePositionID: para.employeePositionID,
          employeeNumberID: para.employeeNumberID,
          dayCount: para.dayCount,
          dateFrom: para.dateFrom,
          dateTo: para.dateTo,
          dictPeriodID: periodID,
          empVacationPeriodID: para.empVacationPeriodID,
          avgSum: 0,
          vacationStatus: 'RETPROLONG',
          orderState: 'POSTED'
        },
        saved: saved
      })
    })
    employeeVacationStore.freeNative()
  }
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}
