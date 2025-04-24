const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const orderValidator = require('../HR/modules/orderValidator')
const calendarService = require('../HR/modules/calendarService')
const timeCostService = require('../HR/modules/timeCostService')
const nameCase = require('../HR/modules/nameCase')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:after', afterDelete)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('getActiveVacationList')
me.entity.addMethod('cloneVacationList')
me.entity.addMethod('checkVacationCrossPeriod')
me.entity.addMethod('checkVacationCrossTimeSheet')
me.entity.addMethod('checkContVacation')
me.entity.addMethod('checkImpartibleVac')
me.entity.addMethod('checkAvailableVacationDays')
me.entity.addMethod('validateAvailableVacationDays')
me.entity.addMethod('checkMainPart')
me.entity.addMethod('checkEmpNumberPeriod')
me.entity.addMethod('checkNotPerVacDays')
me.entity.addMethod('checkMoneyHelpVac')
me.entity.addMethod('clearDetail')
me.entity.addMethod('checkPeriodDayDiff')

module.exports = {
  checkContiniousVacation
}

/* Перевірка, щоб при "галочці" "Безперервна відпустка" було достутньо днів >= 14 дн. */
function checkContiniousVacation (ctx, toThrowError = true) {
  const yearVacMainPart = timService.CONSTANTS.yearVacMainPart
  let isContinuous
  let dayCount
  if (ctx.data4Check) {
    const checkData = ctx.data4Check
    isContinuous = checkData.isContinuous
    dayCount = checkData.dayCount
  } else {
    const execParams = ctx.mParams.execParams
    const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    const ID = execParams.ID
    if (ID) {
      isContinuous = UB.Repository(__entityName)
        .attrs(['isContinuous'])
        .where('ID', '=', ID)
        .selectScalar()
      if (isContinuous) {
        dayCount = execParams.dayCount || instanceData.dayCount
      }
    }
  }
  let msg
  if (isContinuous) {
    if (dayCount < yearVacMainPart) {
      msg = UB.i18n('Тривалість безперервної щорічної відпустки {0} дн. повинна бути {1} дн. або більше', dayCount, yearVacMainPart)
    }
  }
  if (toThrowError) {
    if (msg) {
      throw new UB.UBAbort(`<<<${msg}>>>`)
    }
  } else {
    return msg
  }
}

function getDescription (ctx) {
  let parts = ebs.getCompositeAttributeValue(ctx, 'description', ['dictVacationKindID.name', 'dateFrom', 'dateTo'], '^', true).split('^')
  return parts[0] + ' з ' + parts[1] + ' по ' + parts[2]
}

function beforeInsert (ctx) {
  let execParams = ctx.mParams.execParams
  let paraFields = ['orderID', 'departmentID', 'positionID', 'organizationID', 'employeePositionID', 'employeeNumberID',
    'employeeID', 'firstName', 'lastName', 'middleName', 'title', 'empOrderType']
  let para = UB.Repository('hr_empOrderDet').attrs(paraFields).selectById(execParams.paraID)
  paraFields.forEach(item => {
    execParams[item] = para[item]
  })
  execParams.description = getDescription(ctx)
  global['hr_empOrderDet'].setItemIdx(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  let execParams = ctx.mParams.execParams
  if (execParams.dictVacationKindID !== undefined || execParams.dateFrom !== undefined) {
    execParams.description = getDescription(ctx)
  }
}

function afterDelete (ctx) {
  const empVacList = UB.Repository('hr_employeeVacation')
    .attrs('ID')
    .where('paraID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  if (empVacList.length) {
    const empVacStore = UB.DataStore('hr_employeeVacation')
    empVacList.forEach(row => {
      empVacStore.run('delete', {
        execParams: { ID: row.ID }
      })
    })
  }
}

/* Перевірка на перетин з іншими відпустками працівника
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeePositionID посада
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.listDetID період пункту наказу
 * @return {string} текст помилки
 */
me.checkVacationCrossPeriod = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeePositionID = execParams.employeePositionID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const orderID = execParams.orderID || 0
  const listDetID = execParams.listDetID || 0

  let msg
  if (employeePositionID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    let crossVac = UB.Repository(__entityName)
      .attrs(['ID', 'paraID', 'orderID.orderNumber', 'orderID.orderDate', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'orderID', 'employeeNumberID'])
      .where('employeePositionID', '=', employeePositionID)
      .where('ID', '!=', listDetID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('empOrderType', 'in', ['VACATION', 'VACATIONLONG', 'CWSRELAXHD'])
      .where('orderID', '=', orderID, 'innerOrder')
      .where('orderID', '!=', orderID, 'outOrder')
      .where('orderID.orderState', '!=', 'PROJECT', 'notProject')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .notExists(UB.Repository(__entityName)
        .correlation('employeePositionID', 'employeePositionID')
        .where('dateFrom', '<=', dateTo)
        .where('dateTo', '>=', dateFrom)
        .where('empOrderType', '=', 'VACATIONREVOKE')
        .where('orderID', '!=', orderID)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('orderID.mi_deleteDate', '>=', '#maxdate'))
      .notExists(UB.Repository('hr_empOrderVacationprolongDet')
        .correlation('grantVacationParaID', 'paraID')
        .where('action', '=', 'CANCEL')
        .where('orderID', '!=', orderID)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('orderID.mi_deleteDate', '>=', '#maxdate'))
      .logic('([innerOrder] or ([outOrder] and [notProject]))')
      .limit(1)
      .selectSingle()
    if (crossVac) {
      // check timeSheet
      const vacDays = UB.Repository('tim_timeSheet')
        .attrs('dateWork')
        .where('employeeNumberID', '=', crossVac.employeeNumberID)
        .where('orderID', '=', crossVac.orderID)
        .where('isActive', '=', 1)
        .where('dateWork', '>=', dateFrom)
        .where('dateWork', '<=', dateTo)
        .selectAsObject()
      if (vacDays.length) {
        let dateFromStr = dateService.formatDate(dateFrom)
        let dateToStr = dateService.formatDate(dateTo)
        let dateFromStr2 = dateService.formatDate(crossVac.dateFrom)
        let dateToStr2 = dateService.formatDate(crossVac.dateTo)
        let orderDateStr = dateService.formatDate(crossVac['orderID.orderDate'])
        msg = `Виявлено перетин періодів, наказ № ${crossVac['orderID.orderNumber']} від ${orderDateStr},
          "${crossVac['dictVacationKindID.name']}" з ${dateFromStr2} по ${dateToStr2}, з періодом з ${dateFromStr} по ${dateToStr}`
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка по табелю, щоб не було неявок в періоді відпустки, що не дозволено перетинати
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @return {string} текст помилки
 */
me.checkVacationCrossTimeSheet = ctx => {
  const maxCheckDays = 10
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  let msg
  const dictTimeCostID = UB.Repository('hr_dictVacationKind')
    .attrs(['dictTimeCostID'])
    .where('ID', '=', dictVacationKindID)
    .selectScalar()
  const timeSheets = UB.Repository('tim_timeSheet')
    .attrs(['dateWork', 'factTimeCostID.nameShort', 'factTimeCostID.code'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', 1)
    .orderBy('dateWork')
    .selectAsObject()
  const timeCostInt = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID.code', 'priorityType'])
    .where('dictTimeCost2ID', '=', dictTimeCostID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject({
      'dictTimeCost1ID.code': 'code'
    })
  if (timeSheets.length > 0) {
    let checkDates = []
    const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
    const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
    let isDayTrunc = timeSheets.length > maxCheckDays
    let daysToCheck = isDayTrunc ? maxCheckDays : timeSheets.length
    for (let i = 0; i < daysToCheck; i++) {
      let timeSheetItem = timeSheets[i]
      let dateWork = new Date(timeSheetItem.dateWork)
      let isHoliday = holidays.find(hld => dateService.equals(hld, dateWork))
      if (!isHoliday) {
        let factCode = timeSheetItem['factTimeCostID.code']
        if (!timeCostInt.find(item => item.code === factCode)) {
          checkDates.push(`${dateService.formatDate(timeSheetItem.dateWork, 'dd.mm')} "${timeSheetItem['factTimeCostID.nameShort']}"`)
        }
      }
    }
    if (checkDates.length > 0) {
      let dateStr = checkDates.join(', ')
      if (isDayTrunc) {
        dateStr += '...'
      }
      msg = UB.i18n(`В табелі працівника за період відпустки існують наступні елементи обліку: {0}`, dateStr)
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка при не встановленій "галочці" "Безперервна відпустка", щоб залишилося достатньо днів для неподільної частини 14 дн.
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {number} ctx.mParams.execParams.vacPeriodID період відпустки
 * @param {boolean} ctx.mParams.execParams.isContinuous ознака безперервності
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {number} ctx.mParams.execParams.orgID організація
 * @param {date} ctx.mParams.execParams.onDate системна дата перегляду
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.listDetID період пункту наказу
 * @return {string} текст помилки
 */
me.checkMainPart = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const vacPeriodID = execParams.vacPeriodID
  const isContinuous = execParams.isContinuous
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  let dayCount = execParams.dayCount
  const orgID = execParams.orgID
  const onDate = dateService.shiftDate(execParams.onDate)
  const orderID = execParams.orderID
  const listDetID = execParams.listDetID || 0

  if (isContinuous) {
    return true
  }

  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo) && dateService.isValid(onDate) && dayCount && orderID) {
    const vacFromYear = dateFrom.getFullYear()
    const vacToYear = dateTo.getFullYear()
    const currYear = onDate.getFullYear()
    /* https://dev.intecracy.com/confluence/pages/viewpage.action?pageId=163973049 :
     * Перевірка не виконується для відпусток, які оформлюються заднім числом, Тобто для виконання перевірки рік початку
     * відпустки або рік закінчення відпустки повинен бути більше або рівні року загальносистемної дати. */
    if (!(currYear > vacFromYear || currYear > vacToYear)) {
      let addInfoParams = {
        orgID: orgID,
        dictVacationKindID: dictVacationKindID,
        currPeriodID: vacPeriodID
      }
      const otherVac = UB.Repository(__entityName)
        .attrs('dayCount')
        .where('orderID', '=', orderID)
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dictVacationKindID', '=', dictVacationKindID)
        .where('empVacationPeriodID', '=', vacPeriodID)
        .where('ID', '!=', listDetID)
        .notExists(UB.Repository(__entityName)
          .where('orderID', '=', orderID)
          .where('employeeNumberID', '=', employeeNumberID)
          .where('dictVacationKindID', '=', dictVacationKindID)
          .where('empVacationPeriodID', '=', vacPeriodID)
          .where('isContinuous', '=', true)
          .where('ID', '!=', listDetID))
        .selectAsObject()
      let otherDayCount = 0
      if (otherVac.length) {
        otherVac.forEach(vac => {
          otherDayCount += vac.dayCount
        })
      }
      dayCount += otherDayCount
      let checkMainPartMsg = orderValidator.checkMainPart(employeeNumberID, dateFrom, dateTo, dayCount, false, undefined, addInfoParams)
      if (checkMainPartMsg) {
        msg = UB.i18n(`{0}. Зменшіть тривалість відпустки або проставте ознаку "Безперервна відпустка"`, checkMainPartMsg)
      }
    } else {
      mParams.isBackOrder = true
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка на безперервность щорічної відпустки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.ID ID пункту наказу
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {boolean} ctx.mParams.execParams.isContinuous ознака безперервності
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkContVacation = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  let msg
  if (execParams) {
    msg = checkContiniousVacation({
      data4Check: {
        ID: execParams.ID,
        isContinuous: execParams.isContinuous,
        dateFrom: dateService.shiftDate(execParams.dateFrom),
        dayCount: execParams.dayCount,
        employeeNumberID: execParams.employeeNumberID,
        dictVacationKindID: execParams.dictVacationKindID
      }
    }, false)
  } else {
    msg = checkContiniousVacation(ctx, false)
  }
  if (msg) {
    mParams.msg = msg
  }
}

/* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток"
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {string} ctx.mParams.execParams.dateFrom дата початку
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @params {number} ctx.mParams.execParams.dayCountFactCorr ручне коригування використаних днів
 * @return {string} текст помилки
 */
me.checkImpartibleVac = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dayCount = execParams.dayCount
  const dayCountFactCorr = execParams.dayCountFactCorr
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dayCount) {
    msg = orderValidator.checkImpartibleVac(employeeNumberID, dictVacationKindID, dateFrom, dayCount, dayCountFactCorr)
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка, щоб Сумарна кількість днів певного виду відпустки за період надання відпустки не перевищує залишок днів по періоду
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {number} ctx.mParams.execParams.orgID організація
 * @param {string} ctx.mParams.execParams.dateFrom дата початку
 * @param {number} ctx.mParams.execParams.dateTo дата закінчення
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {number} ctx.mParams.execParams.orderDetID пункт наказу
 * @param {number} ctx.mParams.execParams.listDetID період пункту наказу
 * @return {string} текст помилки
 */
me.checkAvailableVacationDays = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const orgID = execParams.orgID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  let dayCount = execParams.dayCount || 0
  const orderDetID = execParams.orderDetID
  const listDetID = execParams.listDetID || 0
  let msg
  if (employeeNumberID && dictVacationKindID && orgID && dateService.isValid(dateFrom) && dateService.isValid(dateTo) && orderDetID) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['code', 'name', 'isDay'])
      .selectById(dictVacationKindID)
    if (dictVacationKindData.isDay) {
      let addInfo = {}
      global['hr_empVacationPlan'].getAvailableVacationDays(employeeNumberID, orgID, dateFrom, dictVacationKindID, addInfo)
      const totalDaysDiff = addInfo.totalDaysDiffNoCheck
      const otherVac = UB.Repository(__entityName)
        .attrs('dayCount')
        .where('paraID', '=', orderDetID)
        .where('employeeNumberID', '=', employeeNumberID)
        .where('dictVacationKindID', '=', dictVacationKindID)
        .where('ID', '!=', listDetID)
        .selectAsObject()
      let otherDayCount = 0
      if (otherVac.length) {
        otherVac.forEach(vac => {
          otherDayCount += vac.dayCount
        })
      }
      dayCount += otherDayCount
      if (totalDaysDiff < dayCount) {
        msg = UB.i18n(`Для виду відпустки '{0}' тривалість {1} дн. (сума днів за пунктами по виду відпустки за період) перевищує залишок періоду {2} дн. (залишок рахується з урахуванням всіх періодів відпустки, в яких є залишки)`,
          dictVacationKindData.name, dayCount, totalDaysDiff)
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* валідація, що визивається при проведенні з orderValidator */
me.validateAvailableVacationDays = function (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'paraID', 'employeeNumberID', 'dictVacationKindID', 'dateFrom', 'dateTo', 'dayCount', 'firstName',
      'middleName', 'lastName', 'employeeNumberID.orgID'])
    .where('orderID', '=', orderID)
    .selectAsObject({
      'employeeNumberID.orgID': 'orgID'
    })
  const errors = []
  orderDet.forEach(orderItem => {
    const ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          dictVacationKindID: orderItem.dictVacationKindID,
          orgID: orderItem.orgID,
          dateFrom: orderItem.dateFrom,
          dateTo: orderItem.dateTo,
          dayCount: orderItem.dayCount,
          orderDetID: orderItem.paraID,
          listDetID: orderItem.ID
        }
      }
    }
    me.checkAvailableVacationDays(ctx)
    if (ctx.mParams.msg) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(ctx.mParams.msg)}`)
    }
  })
  return errors.length ? errors : null
}

/**
 * Перевірка на входимість періоду права на відпустку в період дії таб. номеру
 * @param {object} ctx
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {Date} ctx.mParams.execParams.dateFrom дата початку
 * @param {Date} ctx.mParams.execParams.dateFrom дата закінчення
 */
me.checkEmpNumberPeriod = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  if (!employeeNumberID) {
    return
  }

  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  let dateTo = dateService.shiftDate(execParams.dateTo)
  dateTo = dateTo ? new Date(dateTo) : dateService.maxDate()

  let msg
  const empNumberOutDate = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'description', 'dateFrom', 'dateTo'])
    .where('ID', '=', employeeNumberID)
    .where('dateFrom', '>', dateFrom, 'dateFrom')
    .where('dateTo', '<', dateTo, 'dateTo')
    .logic('([dateFrom] OR [dateTo])')
    .selectSingle()
  if (empNumberOutDate) {
    msg = `Період відпустки з ${dateService.formatDate(dateFrom, 'dd.mm.yyyy')} по ${dateService.formatDate(dateTo, 'dd.mm.yyyy')}
      виходить за межі періоду дії табельного номеру "${empNumberOutDate.description}" 
      з ${dateService.formatDate(empNumberOutDate.dateFrom, 'dd.mm.yyyy')} по ${dateService.formatDate(empNumberOutDate.dateTo, 'dd.mm.yyyy')}`
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірки для ознаки "Матеріальна допомога"
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку відпустки
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.orderDetID пункт наказу
 * @param {number} ctx.mParams.execParams.listDetID період пункту наказу
 * @param {boolean} ctx.mParams.execParams.isMoneyHelp матеріальна допомога
 * @param {boolean} ctx.mParams.execParams.vacOrderCall клієнтський виклик з наказу про відпустку
 * @param {boolean} ctx.mParams.execParams.skipVacKindCheck пропустити перевірку на наявність установки мат. допомоги в довіднику видів відпусток
 * @return {string} текст помилки
 */
me.checkMoneyHelpVac = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const isMoneyHelp = execParams.isMoneyHelp
  if (!isMoneyHelp) {
    return true
  }
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID || 0
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const orderID = execParams.orderID
  const orderDetID = execParams.orderDetID
  const listDetID = execParams.listDetID || 0
  let msg = []
  if (orderID && orderDetID && employeeNumberID && dateService.isValid(dateFrom)) {
    if (!execParams.skipVacKindCheck) {
      /* Дані по запису, що редагується */
      const listDetMoneyHelp = UB.Repository('hr_dictVacationKind')
        .attrs('isMoneyHelp')
        .where('ID', '=', dictVacationKindID)
        .selectScalar()
      if (!listDetMoneyHelp) {
        /* Дані по іншим записам */
        const orderDetMoneyHelp = UB.Repository(__entityName)
          .attrs('ID', 'dictVacationKindID.isMoneyHelp')
          .where('paraID', '=', orderDetID)
          .selectAsObject({
            'dictVacationKindID.isMoneyHelp': 'isMoneyHelp'
          })
        if (orderDetMoneyHelp.length) {
          let existMoneyHelp = false
          for (let i = 0; i < orderDetMoneyHelp.length; i++) {
            let orderDetMoneyHelpItem = orderDetMoneyHelp[i]
            if (orderDetMoneyHelpItem.isMoneyHelp && orderDetMoneyHelpItem.ID !== listDetID) {
              existMoneyHelp = true
              break
            }
          }
          if (!existMoneyHelp) {
            msg.push({
              code: 'listDetMoneyHelp',
              msg: 'Для вказаних видів відпусток не може бути надана матеріальна допомога'
            })
          }
        }
      }
    }

    let isOtherMoneyHelp = false
    const vacYear = dateFrom.getFullYear()
    const vacYearFrom = dateService.getYearBegin(vacYear)
    const vacYearTo = dateService.getYearEnd(vacYear)
    const orderMoneyHelp = UB.Repository(__entityName)
      .attrs('orderID.description')
      .where('orderID', '=', orderID)
      .where('employeeNumberID', '=', employeeNumberID)
      .where('grantParaID.isMoneyHelp', '=', true)
      .where('paraID', '!=', orderDetID)
      .where('grantParaID.dateFrom', '>=', vacYearFrom)
      .where('grantParaID.dateFrom', '<=', vacYearTo)
      .selectSingle()
    if (orderMoneyHelp) {
      let byOrder = execParams.vacOrderCall ? 'поточним наказом' : UB.i18n(`за наказом {0}`, orderMoneyHelp['orderID.description'])
      msg.push({
        code: 'orderMoneyHelp',
        msg: UB.i18n(`Матеріальну допомогу за {0} вже надано {1}`, vacYear, byOrder)
      })
      isOtherMoneyHelp = true
    }
    if (!isOtherMoneyHelp) {
      const otherMoneyHelp = UB.Repository(__entityName)
        .attrs('orderID.description')
        .where('orderID', '!=', orderID)
        .where('employeeNumberID', '=', employeeNumberID)
        .where('grantParaID.isMoneyHelp', '=', true)
        .where('orderID.orderState', '!=', 'PROJECT')
        .where('grantParaID.dateFrom', '>=', vacYearFrom)
        .where('grantParaID.dateFrom', '<=', vacYearTo)
        .notExists(
          UB.Repository('hr_empOrderVacationprolongDet')
            .correlation('grantVacationParaID', 'paraID')
            .where('orderID.orderState', '!=', 'PROJECT')
            .where('action', '=', 'CANCEL')
            .where('isCancelMoneyHelp', '=', 1)
            .where('mi_deleteDate', '>=', '#maxdate')
        )
        .selectSingle()
      if (otherMoneyHelp) {
        msg.push({
          code: 'otherOrderMoneyHelp',
          msg: UB.i18n(`Матеріальну допомогу за {0} вже надано за наказом {1}`, vacYear, otherMoneyHelp['orderID.description'])
        })
        isOtherMoneyHelp = true
      }
    }
  }
  mParams.msg = JSON.stringify(msg)
  return true
}

/* Перевірка, щоб кількість днів відпустки без збереження заробітної плати за рік не повинна перевищувати 15 дн
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {number} ctx.mParams.execParams.orgID організація
 * @param {string} ctx.mParams.execParams.dateFrom дата початку
 * @param {number} ctx.mParams.execParams.dateTo дата закінчення
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkNotPerVacDays = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const orgID = execParams.orgID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  let dayCount = execParams.dayCount || 0
  let msg
  if (employeeNumberID && dictVacationKindID && orgID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['code'])
      .selectById(dictVacationKindID)
    if (dictVacationKindData.code === 'dNot') {
      const currYear = dateFrom.getFullYear()
      let addInfo = { upToDate: dateTo, currYear: currYear }
      global['hr_empVacationPlan'].getAvailableVacationDays(employeeNumberID, orgID, dateFrom, dictVacationKindID, addInfo)
      const currYearDaysFact = addInfo.currYearDaysFact
      const dNotVacDays = timService.CONSTANTS.dNotVacDays
      let currYearDaysCount = currYearDaysFact + dayCount
      if (currYearDaysCount > dNotVacDays) {
        msg = UB.i18n(`Відпустка без збереження заробітної плати перевищує {0} днів за {1} рік. `, dNotVacDays, currYear) +
          UB.i18n(`Загальна кількість днів - {0}.`, currYearDaysFact + dayCount)
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/**
 * Отримати всі відпустки, що перетинаються з періодом ctx.mParams.dateFrom та ctx.mParams.dateTo
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.employeePositionID посада працівника, не обов'язкове
 * @param {date} ctx.mParams.dateFrom дата початку
 * @param {date} ctx.mParams.dateTo дата закінчення
 * @return {Array} масив записів періодів відпустки
 */
me.getActiveVacationList = ctx => {
  const mParams = ctx.mParams
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.shiftDate(mParams.dateTo)
  let employeeNumberID = mParams.employeeNumberID
  if (!employeeNumberID) {
    const employeePositionID = mParams.employeePositionID
    employeeNumberID = UB.Repository('hr_employeePositionS')
      .attrs(employeeNumberID)
      .where('ID', '=', employeePositionID)
      .selectScalar()
  }
  const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
  /* перетин періодів */
  let data = UB.Repository(__entityName)
    .attrs(['employeePositionID', 'employeeNumberID', 'empVacationPeriodID', 'empVacationPeriodID.description',
      'dictVacationKindID', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'paraID', 'ID'])
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('empOrderType', 'in', ['VACATION', 'VACATIONPROLONG'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
  data.forEach(item => {
    let itemDateFrom = new Date(item.dateFrom)
    if (itemDateFrom < dateFrom) {
      itemDateFrom = dateFrom
    }
    item.dateFrom = itemDateFrom
    let itemDateTo = new Date(item.dateTo)
    if (itemDateTo > dateTo) {
      itemDateTo = dateTo
    }
    item.dateTo = itemDateTo
    let mParams = {
      dateFrom: itemDateFrom,
      dateTo: itemDateTo,
      dictVacationKindID: item.dictVacationKindID,
      orgID
    }
    global['hr_empOrder'].getWorkDays4Vac({ mParams: mParams })
    item.dayCount = mParams.daysCount || 0
  })
  mParams.data = JSON.stringify(data)
  return data
}

/**
 * Копіювання періодів відпустки для наказу про відкликання з відпустки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID ID пункту наказу про відкликання відпустки
 * @param {number} ctx.mParams.orderID ID наказу про відкликання відпустки
 * @param {number} ctx.mParams.empOrderType тип операції ('VACATIONREVOKE')
 * @param {number} ctx.mParams.employeePositionID посада працівника
 * @param {number} ctx.mParams.employeeNumberID таб. номер
 * @param {date} ctx.mParams.dateFrom дата початку
 * @param {date} ctx.mParams.dateTo дата закінчення
 */
me.cloneVacationList = ctx => {
  let mParams = ctx.mParams
  let store = UB.DataStore(__entityName)
  let existingData = UB.Repository(__entityName).attrs('ID').where('paraID', '=', mParams.paraID).select()
  while (!existingData.eof) {
    store.run('delete', {
      execParams: {
        ID: existingData.get(0)
      }
    })
    existingData.next()
  }
  let data = me.getActiveVacationList(ctx)
  data.forEach(item => {
    store.run('insert', {
      execParams: {
        paraID: mParams.paraID,
        orderID: mParams.orderID,
        empOrderType: mParams.empOrderType,
        employeePositionID: item.employeePositionID,
        employeeNumberID: item.employeeNumberID,
        empVacationPeriodID: item.empVacationPeriodID,
        dictVacationKindID: item.dictVacationKindID,
        dateFrom: item.dateFrom,
        dateTo: item.dateTo,
        dayCount: item.dayCount,
        sourceParaID: item.ID
      }
    })
  })
}

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'title', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  return UB.i18n(`{0}, {1},  № {2} від {3}`, d['employeeID.shortFIO'], d['description'], d['orderID.orderNumber'], dateService.formatDate(d['orderID.orderDate']))
}

/* Очистити всі записи періодів пунтку наказу про відпустку
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 */
me.clearDetail = function (ctx) {
  const paraID = ctx.mParams.paraID
  const detailRows = UB.Repository(__entityName)
    .attrs('ID')
    .where('paraID', '=', paraID)
    .selectAsObject()
  if (detailRows.length > 0) {
    let dtStore = UB.DataStore(__entityName)
    detailRows.forEach((item) => {
      dtStore.run('delete', { execParams: { ID: item.ID } })
    })
    dtStore.freeNative()
  }
}

/* Перевірка, щоб тривалість днів відпустки не перевищувала доступні дні з урахуванням всіх пунктів даного наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.listDetID пункт за періодом відпустки
 * @param {number} ctx.mParams.execParams.empVacationPeriodID період відпустки
 * @param {number} ctx.mParams.execParams.dayCount тривалість днів відпустки
 * @return {string} текст помилки
 */
me.checkPeriodDayDiff = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const orderID = execParams.orderID
  const listDetID = execParams.listDetID || 0
  const empVacationPeriodID = execParams.empVacationPeriodID
  const dayCount = execParams.dayCount || 0
  let msg
  if (orderID && empVacationPeriodID) {
    const vacFact = timeCostService.getVacFactDays({ currPeriodID: empVacationPeriodID, orgID: execParams.orgID })
    let periodDayDiff = (vacFact[0] && vacFact[0].dayDiff) || 0
    let otherDayCount = UB.Repository(__entityName)
      .attrs('SUM([dayCount])')
      .where('orderID', '=', orderID)
      .where('ID', '!=', listDetID)
      .where('empVacationPeriodID', '=', empVacationPeriodID)
      .selectScalar() || 0
    periodDayDiff -= otherDayCount
    if (dayCount > periodDayDiff) {
      msg = UB.i18n(`Тривалість {0} дн. перевищує залишок періоду {1} дн.`, dayCount, periodDayDiff)
    }
  }
  mParams.msg = msg || ''
  return true
}
