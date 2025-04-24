const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.entity.addMethod('checkYearMissionDays')
me.entity.addMethod('getYearInfo')

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true
  })

  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!execParams.dictTimeCostID && !instanceData.dictTimeCostID) {
    execParams.dictTimeCostID = UB.Repository('hr_dictTimeCost')
      .attrs('ID')
      .where('code', '=', entityBaseService.langCodei18n('Вдр'))
      .where('isClose', '=', 0)
      .select()
      .get(0)
  }
  execParams.orderID = execParams.orderID || instanceData.orderID
  me.getYearInfo(ctx)
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

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if ((execParams.dateTo || execParams.dateFrom) && instanceData.dateFrom && instanceData.dateTo) {
    const paraOrders = UB.Repository('hr_empOrderDet')
      .attrs(['ID'])
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
    paraOrders.forEach(det => {
      UB.DataStore('hr_empOrderDet')
        .run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: det.ID,
            dateFrom: instanceData.dateFrom,
            dateTo: instanceData.dateTo
          }
        })
    })
  }
  if (execParams.description !== undefined) {
    const store = UB.DataStore('hr_empOrderEmployeeDet')
    UB.Repository('hr_empOrderEmployeeDet').attrs('ID')
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
      .forEach(item => {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: item.ID,
            description: execParams.description
          }
        })
      })
  }
}

function getYearMissionInfo (employeeNumberID, onDate, orderID) {
  let dateTo = dateService.shiftDate(onDate) || new Date()
  dateTo = dateService.lastDayOfYear(dateTo)
  let dateFrom = dateService.firstDayOfYear(dateTo)
  let days = timService.getDaysByTimeCostGroup(employeeNumberID, 'LST_TRIP', dateFrom, dateTo, orderID)
  let res = {
    year: dateTo.getFullYear(),
    days: days || 0
  }
  return res
}

function checkYearMissionInfo (employeeNumberID, dateFrom, dateTo, dayCount, orderID, maxDays, isEmpAgreed, shortFIO) {
  let msg
  if (isEmpAgreed) {
    return msg
  }
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  const yearBeg = dateFrom.getFullYear()
  const yearEnd = dateTo.getFullYear()
  for (let yy = yearBeg; yy <= yearEnd; yy++) {
    let yearDateBeg = dateService.getYearBegin(yy)
    let yearDateEnd = dateService.getYearEnd(yy)
    let yearDateFrom = (dateFrom > yearDateBeg) ? dateFrom : yearDateBeg
    let yearDateTo = (dateTo < yearDateEnd) ? dateTo : yearDateEnd
    let missionInfo = getYearMissionInfo(employeeNumberID, yearDateFrom, orderID)
    let days = missionInfo.days
    let missionDayCount = timService.getCalendarDays(yearDateFrom, yearDateTo)
    let missionDays = days + (missionDayCount || 0)
    maxDays = parseInt(maxDays)
    if (missionDays > maxDays) {
      msg = UB.i18n(`По працівнику {0} кількість днів відрядження {1} за {2} рік перевищує встановлений в системі максимальний строк відрядження {3}.`, shortFIO, missionDays, yy, maxDays)
      break
    }
  }
  return msg
}

/** Отримати кількість днів відрядження за рік по працівнику
 * @param {object} ctx
 * @param {number} ctx.mParams.orgID організація
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {Date} ctx.mParams.dateFrom дата, до якої від початку року перевіряються відрядження
 * @param {number} ctx.mParams.dayCount кількість днів
 * @param {number} ctx.mParams.orderID ID наказу
 * @param {Boolean} ctx.mParams.isInsideCountry відрядження в межах країни
 * @param {Boolean} ctx.mParams.isEmpAgreed згода працівника
 */
me.checkYearMissionDays = function (ctx) {
  const mParams = ctx.mParams
  const maxIntDayConst = Number(settingsService.getByCode('hrMaxMissionIntDayCount', mParams.orgID || null) || 30)
  const maxExtDayConst = Number(settingsService.getByCode('hrMaxMissionExtDayCount', mParams.orgID || null) || 60)
  if (mParams.employeeNumberID) {
    let maxDays = mParams.isInsideCountry ? maxIntDayConst : maxExtDayConst
    let empInfo = UB.Repository('hr_employee')
      .attrs(['shortFIO'])
      .selectById(mParams.employeeID)
    let res = checkYearMissionInfo(mParams.employeeNumberID, mParams.dateFrom, mParams.dateTo, mParams.dayCount, mParams.orderID,
      maxDays, mParams.isEmpAgreed, empInfo.shortFIO)
    if (res) {
      mParams.result = res
    }
  } else {
    const orderItems = UB.Repository(__entityName)
      .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'isInsideCountry'])
      .where('orderID', '=', mParams.orderID)
      .selectAsObject()
    const empOrderItems = UB.Repository('hr_empOrderEmployeeDet')
      .attrs(['paraID', 'employeeNumberID', 'employeeID.shortFIO', 'isEmpAgreed'])
      .where('orderID', '=', mParams.orderID)
      .selectAsObject()
    let isOneEmp = true
    let emps = []
    for (let i = 0; i < orderItems.length; i++) {
      let orderItem = orderItems[i]
      let dateFrom = orderItem.dateFrom
      let dateTo = orderItem.dateTo
      let dayCount = orderItem.dayCount
      let mxDays = orderItem.isInsideCountry ? maxIntDayConst : maxExtDayConst
      let empItems = empOrderItems.filter(item => item.paraID === orderItem.ID)
      for (let j = 0; j < empItems.length; j++) {
        let empItem = empItems[j]
        let msg = checkYearMissionInfo(empItem.employeeNumberID, dateFrom, dateTo, dayCount, mParams.orderID, mxDays,
          empItem.isEmpAgreed, empItem['employeeID.shortFIO'])
        if (msg) {
          if (isOneEmp) {
            mParams.result = msg
          }
          isOneEmp = false
          emps.push(empItem['employeeID.shortFIO'])
        }
      }
      if (emps.length > 1) {
        mParams.result = UB.i18n(`По працівникам {0} кількість днів відрядження за рік перевищує встановлений в системі максимальний строк відрядження`, emps.join(', '))
      }
    }
  }
}

/** Отримати повідомлення про кількість днів відрядження за рік по працівнику
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {Date} ctx.mParams.dateFrom дата, до якої від початку року перевіряються відрядження
 * @param {number} ctx.mParams.orderID ID наказу
 */
me.getYearInfo = function (ctx) {
  const mParams = ctx.mParams
  if (mParams.employeeNumberID) {
    let missionInfo = getYearMissionInfo(mParams.employeeNumberID, mParams.dateFrom, mParams.orderID)
    let empInfo = UB.Repository('hr_employee')
      .attrs(['shortFIO', 'sexType'])
      .selectById(mParams.employeeID)
    let empName = empInfo.shortFIO
    let endStr = empInfo.sexType === 'W' ? 'ла' : 'в'
    mParams.yearInfo = UB.i18n(`У {0} р. {1} перебува{2} у відрядженнях {3} дн.`, missionInfo.year, empName, endStr, missionInfo.days)
  }
}
