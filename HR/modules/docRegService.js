const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const periodService = require('../../HR/modules/periodService')
const dateService = require('../../AC/modules/dataServices/dateService')
const averageService = require('../../HR/modules/averageService')
const accrualService = require('../../HR/modules/accrualService')
const algorithmService = require('../../HR/modules/algorithmService')
const calendarService = require('../../HR/modules/calendarService')
const postingService = require('../../HR/modules/postingService')
const employeeService = require('../../HR/modules/employeeService')
const orgService = require('../../HR/modules/orgService')
const payElService = require('../../HR/modules/payElService')
const contService = require('../../HR/modules/contService')
const payFundService = require('../../HR/modules/payFundService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService.js')
const settingsService = require('../../AC/modules/entityServices/settingsService')

const algorithmVacation = require('../modules/algorithm/vacation') // Відпустка
const algorithmBusinessTrip = require('../modules/algorithm/businessTrip') // Відрядження
const algorithmAvgPay = require('../modules/algorithm/avgPay') // Оплата за середнім
const pieceWorkShift = require('../modules/algorithm/pieceWorkShift') // Змінний бригадний наряд

module.exports = {
  calculateVacation,
  calculateVacationKid,
  calculateBusinessTrip,
  calculateCompensation,
  calculateVacationUnpaid,
  calculateAvgPay,
  calculateAvgMonth,
  calculateOrder,
  calculateSupAvgEarn,
  calculateRenewalPay,
  calculateBountyHelp,
  calculatePieceWorkShift,
  calcRegistryReserve
}

function calculateVacation ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    // Дані працівника (призначення, нарахування, табель)
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false,
      skipAutoCalc: orderParams.skipAutoCalc
    })
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return
  const onDate = dateService.shiftDate(orderParams.dateFrom)
  let docRegVacation
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, null, false, true)
  }
  if (orderParams.recalculate) {
    orderParams.accruals.forEach(accr => {
      const dayAccumCondition = cont.payEl[accr.payElID].method.dayAccumCondition

      const periodSalary = cont.periods.find(o => o.ID === accr.periodSalaryID)
      const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
      if (!(accr.flagsFix & 1 << 6) && !(accr.flagsFix & 1 << 7) && (!cont.constants || !cont.constants.hrTimeSheetReCalcDate || cont.constants.hrTimeSheetReCalcDate < periodSalary.dateFrom)) {
        let dateTo = dateService.shiftDate(accr.dateTo)
        let date = dateService.shiftDate(accr.dateFrom)
        do {
          const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
          if (((dayAccumCondition === 'noHolidays' && !cont.holidays.find(o => o.getTime() === date.getTime())) || (dayAccumCondition !== 'noHolidays')) &&
            timeSheetDay && ((accr.empOrderID && timeSheetDay.orderID === accr.empOrderID) || (orderParams.orderID && timeSheetDay.orderID === orderParams.orderID)) &&
            !(accr.mask & 1 << (date.getDate() - 1))) {
            accr.days++
            accr.mask = accr.mask | 1 << (date.getDate() - 1)
          }
          date = dateService.addDays(date, 1)
        } while (date <= dateTo)
      }
    })
  }
  if (orderParams.parentID) {
    if (!orderParams.recalculate) {
      const vacationFields = ['avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'orderRegistryID', 'dateFrom']
      docRegVacation = UB.Repository('hr_docRegVacation').attrs(vacationFields).selectById(orderParams.parentID)
      if (docRegVacation) {
        vacationFields.forEach(fieldName => {
          if (fieldName !== 'dateFrom') {
            if (['dateFromAvg', 'dateToAvg'].includes(fieldName)) {
              orderParams[fieldName] = dateService.shiftDate(docRegVacation[fieldName])
            } else {
              orderParams[fieldName] = docRegVacation[fieldName]
            }
          }
        })
        orderParams.avgOnDate = dateService.shiftDate(docRegVacation.dateFrom)
        orderParams.baseSum = docRegVacation.avgSum
        orderParams.flagsRec = 2 | (docRegVacation.avgCalcType === 'FACT' ? (1 << 7) : docRegVacation.avgCalcType === 'PLAN' ? (1 << 8) : (1 << 6))
        orderParams.flagsFix = orderParams.flagsFix | 1 << 0 | 1 << 10 | 1 << 11 | 1 << 18

        orderParams.accrualsAvg = UB.Repository('hr_accrualAvg').attrs('periodID', 'periodID.name', 'dateFrom', 'dateTo',
          'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt').where('orderID', '=', orderParams.parentID).selectAsObject()

        orderParams.accrualsAvg.forEach(avg => {
          avg.flagsFix = 143425 // 1 << 13 | 1 << 12 | 1 << 0 | 1 << 6 | 1 << 17
        })
        const accrualDt = UB.Repository('hr_orderRegistryDt').attrs('accrualDt').where('orderID', '=', orderParams.parentID).selectAsObject()
        orderParams.accrualDt = []
        accrualDt.forEach(accDt => {
          if (accDt.accrualDt) {
            orderParams.accrualDt.push(...JSON.parse(accDt.accrualDt))
          }
        })
      } else {
        orderParams.parentID = null
      }
    }
  }

  if (!orderParams.parentID) {
    let resultCalculate
    if (!orderParams.avgOnDate) {
      orderParams.avgOnDate = onDate
    }
    // Розрахунок середнього заробітку за попередні періоди
    if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
      resultCalculate = averageService.calculateAverage({
        orgID,
        cont,
        params: orderParams,
        excludeHolidays: false,
        customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
      })
    }
    // Розрахунок середнього заробітку від фактичної суми
    if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
      // Для відпустки розрахунок від фактичного заробітку тепер пропускається та одразу переходить до планового
      orderParams.avgCalcType = 'PLAN'
    }
    // Розрахунок середнього заробітку від планової суми
    if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
      const periodSalary = cont.periods
        ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
        : periodService.getPeriodOnDate(orgID, onDate)
      if (!periodSalary) {
        throw new UB.UBAbort(`<<<${UB.i18n('Для розрахунку працівника {0} не знайдено розрахунковий період на дату {1}', cont.emp[cont.employeeNumberID].prop.employeeNumber.description, dateService.formatDate(onDate))}>>>`)
      }
      averageService.calculateAveragePlan({
        orgID,
        cont,
        params: orderParams,
        periodCalc: periodSalary,
        onDate,
        excludeHolidays: false,
        daysMode: 1
      })
    }
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  if (/*! existAccruals && */ onDate < new Date(Date.UTC(2020, 11, 12, 0, 0, 0, 0))) {
    // Розрахунок коефіцієнтів індексації відповідно підвищення окладу
    indexingAccrual(cont, orderParams)
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      baseSum: orderParams.baseSum,
      dictFundSourceID: orderParams.dictFundSourceID || null,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmVacation.run({ cont,
      periodCalc,
      periodSalary,
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      }
    }))
  })
}

function calculateVacationKid ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, null, false, true)
  }
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      baseSum: 0,
      dayCount: 0,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmVacation.run({ cont, periodCalc, periodSalary, params: accr }))
  })
}

function indexingAccrual (cont, orderParams) {
  // Розрахунок коефіцієнтів індексації відповідно підвищення окладу
  const beforeDate = dateService.addDays(orderParams.dateFrom, -1)
  const startSalary = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= beforeDate && o.dateTo >= beforeDate)
  const indexSalary = cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.isIndex && o.dateFrom >= orderParams.dateFrom && o.dateFrom <= orderParams.dateTo)
  indexSalary.forEach(row => {
    if (!startSalary || row.accrualSum > startSalary.accrualSum) {
      const koef = !startSalary ? 1 : accrualService.round(row.accrualSum / startSalary.accrualSum, 6)
      if (koef !== 1) {
        let setKoef = false
        for (let i = 0; i < orderParams.accruals.length; i++) {
          if (setKoef) {
            orderParams.accruals[i].koef *= koef
          } else {
            if (row.dateFrom.getTime() === orderParams.accruals[i].dateFrom.getTime()) {
              orderParams.accruals[i].koef *= koef
              setKoef = true
            } else if (row.dateFrom > orderParams.accruals[i].dateFrom && row.dateFrom <= orderParams.accruals[i].dateTo) {
              const newAccrual = {}
              Object.assign(newAccrual, orderParams.accruals[i], { dateFrom: dateService.shiftDate(row.dateFrom) })
              orderParams.accruals[i].dateTo = dateService.addDays(dateService.shiftDate(row.dateFrom), -1)
              orderParams.accruals.splice(i + 1, 0, newAccrual)
              setKoef = true
            } else if (row.dateFrom < orderParams.accruals[i].dateFrom) {
              orderParams.accruals[i].koef *= koef
            }
          }
        }
      }
    }
  })
}

function setSplitPeriod (cont, orgID, employeeNumberID, orderParams, periodCalc, singlePeriod = false, useEmpOrder = false, isDisableDateToLimit = false) {
  const timService = require('../../HR/modules/timService')
  const holidays = orderParams.dayAccumCondition === 'noHolidays' ? calendarService.getHolidays(orderParams.dateFrom, dateService.addYears(orderParams.dateFrom, 3),
    orgID) : []
  const rules = (cont.dict && cont.dict.rules) || UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  let timeSheets = []
  let isFactHour = false
  if (useEmpOrder && orderParams.empOrderID) {
    timeSheets = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'dateWork', 'orderID', 'factTimeCostID', 'planHour', 'normHour', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType' ])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('orderID', '=', orderParams.empOrderID)
      .where('dateWork', '>=', orderParams.dateFrom)
      .where('dateWork', '<=', orderParams.dateTo)
      .where('isActive', '=', true)
      .orderBy('dateWork')
      .selectAsObject({
        'planTimeCostID.timeCostType': 'planTimeCostType',
        'normTimeCostID.timeCostType': 'normTimeCostType'
      })
    timeSheets.forEach(row => { row.dateWork = dateService.shiftDate(row.dateWork) })
    isFactHour = cont.payEl[orderParams.payElID]['dictTimeCostID.isFactHour']
  } else {
    timeSheets = timService.getTimeSheetWithoutOrder(employeeNumberID, orderParams.dateFrom, orderParams.orderID, orderParams.dayAccumCondition, orderParams.source)
  }
  const periods = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'name'])
    .where('orgID', '=', orgID)
    .where('dateTo', '>=', orderParams.dateFrom)
    .orderBy('dateFrom')
    .selectAsObject()
  periods.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })

  const dictTimeCostID = cont.payEl[orderParams.payElID].dictTimeCostID
  const accruals = []
  const dateFrom = orderParams.dateFrom
  let calendarDayCount = (!orderParams.ctrlName || orderParams.ctrlName === 'calendarDayCount') ? orderParams.calendarDayCount : 0
  let dayCount = (!orderParams.ctrlName || orderParams.ctrlName === 'dayCount') ? orderParams.dayCount : null
  let hourCount = 0
  let dateTo = ((!orderParams.ctrlName || orderParams.ctrlName === 'dateTo') && orderParams.dateTo)
    ? orderParams.dateTo : (orderParams.ctrlName === 'dateFrom')
      ? dateService.addDays(orderParams.dateFrom, (orderParams.calendarDayCount || orderParams.dayCount) - 1)
      : dateService.addDays(orderParams.dateFrom, (calendarDayCount || dayCount) - 1)
  let maxDateTo
  if (isDisableDateToLimit) {
    maxDateTo = orderParams.ctrlName === 'dayCount' ? timeSheets[timeSheets.length - 1].dateWork : dateService.shiftDate(dateTo)
  } else {
    maxDateTo = dateService.shiftDate(orderParams.maxDateTo) || dateService.addMonths(dateService.lastDayOfMonth(dateFrom), 12)
  }
  calendarDayCount = 0
  dayCount = 0
  const orderMinDateStore = {}
  let date = dateService.shiftDate(dateFrom)

  do {
    const period = periods.find(o => o.dateFrom <= date && o.dateTo >= date)
    if (period) {
      let accr = accruals.find(o => o.periodSalaryID === period.ID)
      if (!accr) {
        accr = {
          periodSalaryID: period.ID,
          periodSalary: period.dateFrom,
          'periodSalaryID.name': period.name,
          employeeNumberID: orderParams.employeeNumberID,
          payElID: orderParams.payElID,
          flagsRec: orderParams.flagsRec,
          flagsFix: orderParams.flagsFix,
          dateFrom: dateService.shiftDate(date),
          dateTo: dateService.shiftDate(date),
          days: 0,
          hours: 0,
          mask: 0,
          maskAdd: 0,
          calendarDays: 0,
          koef: 1
        }
        accruals.push(accr)
      }
      const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
      if ((orderParams.dayAccumCondition === 'calend' ||
          (orderParams.dayAccumCondition === 'noHolidays' && !holidays.find(o => o.getTime() === date.getTime())) ||
          (orderParams.dayAccumCondition === 'noDaysOff' && timeSheetDay && timeSheetDay.planTimeCostType === 'WORK') ||
          (orderParams.dayAccumCondition === 'noDaysNormaOff' && timeSheetDay && timeSheetDay.normTimeCostType === 'WORK')
      ) &&
        ((!orderParams.source || !orderParams.source.sourceID) || (orderParams.source && orderParams.source.sourceID && timeSheetDay))
      ) {
        let addDay = true
        if (dictTimeCostID && timeSheetDay && !orderParams.source && !(useEmpOrder && orderParams.empOrderID)) {
          if (timeSheetDay.factTimeCostID !== dictTimeCostID) {
            const rule = rules.find(rule => rule.dictTimeCost1ID === timeSheetDay.factTimeCostID && rule.dictTimeCost2ID === dictTimeCostID)
            if (!rule || (rule && !rule.isDateFirst && rule.isElemFirst)) {
              addDay = false
            }
            if (rule && rule.isDateFirst) {
              const orderMinDate = timService.getOrderMinDate(timeSheetDay, orderMinDateStore)
              addDay = rule.isElemFirst ? orderParams.dateFrom < orderMinDate : orderParams.dateFrom > orderMinDate
            }
          }
        }
        if (addDay) {
          dayCount++
          accr.days++
          const hours = timeSheetDay ? (isFactHour ? timeSheetDay.factHour : timeSheetDay.normHour) : 0
          hourCount += hours
          accr.hours += hours
          accr.mask = accr.mask | 1 << (date.getDate() - 1)
        } else {
          accr.maskAdd = accr.maskAdd | 1 << (date.getDate() - 1)
        }
      } else {
        accr.maskAdd = accr.maskAdd | 1 << (date.getDate() - 1)
      }

      calendarDayCount++
      accr.calendarDays++
      accr.dateTo = dateService.shiftDate(date)

      if (orderParams.dayCount && (date.getTime() === dateTo.getTime()) && (orderParams.dayCount > dayCount) && orderParams.ctrlName === 'dayCount') {
        dateTo = dateService.addDays(dateTo, 1)
      }

      if (!orderParams.calendarDayCount && orderParams.dayCount && (date.getTime() === dateTo.getTime()) && (orderParams.dayCount > dayCount) && orderParams.ctrlName === 'dateFrom') {
        dateTo = dateService.addDays(dateTo, 1)
      }

      if (orderParams.ctrlName === 'payElID') {
        dateTo = dateService.addDays(dateTo, 1)
      }
    }
    date = dateService.addDays(date, 1)
  } while (date <= dateTo && date <= maxDateTo)
  orderParams.calendarDayCount = calendarDayCount
  orderParams.dayCount = dayCount
  orderParams.hourCount = (orderParams.ctrlName === 'hourCount') ? orderParams.hourCount : hourCount
  orderParams.dateTo = dateTo
  if (singlePeriod) {
    orderParams.accruals = [
      {
        periodSalaryID: periodCalc.ID,
        periodSalary: periodCalc.dateFrom,
        'periodSalaryID.name': periodCalc.name,
        employeeNumberID: orderParams.employeeNumberID,
        payElID: orderParams.payElID,
        flagsRec: orderParams.flagsRec,
        flagsFix: orderParams.flagsFix,
        dateFrom: dateService.shiftDate(dateFrom),
        dateTo: dateService.shiftDate(dateTo),
        days: dayCount,
        hours: hourCount,
        calendarDays: calendarDayCount,
        koef: 1
      }
    ]
  } else {
    orderParams.accruals = accruals
  }
}

function calculateBusinessTrip ({ orgID, cont, orderParams }) {
  let timeSheets = []
  if (!orderParams.dayAccumCondition) {
    orderParams.dayAccumCondition = cont.payEl[orderParams.payElID].dayAccumCondition || cont.payEl[orderParams.payElID].method.dayAccumCondition || 'noDaysOff'
  }
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
    const timService = require('../../HR/modules/timService')
    timeSheets = timService.getTimeSheetWithoutOrder(orderParams.employeeNumberID, orderParams.dateFrom, orderParams.orderID, orderParams.dayAccumCondition)
    if (orderParams.empOrderID) {
      timeSheets.forEach(ts => {
        const timeSheetDay = cont.emp[orderParams.employeeNumberID].prop.timeSheets.find(o => o.dateWork.getTime() === ts.dateWork.getTime() && o.factTimeCostID !== ts.factTimeCostID)
        if (timeSheetDay) {
          timeSheetDay.factTimeCostID = ts.factTimeCostID
          timeSheetDay.factHour = ts.normHour
          timeSheetDay.factTimeCostType = ts.planTimeCostType
        }
      })
    }
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  let resultCalculate
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return

  if (!orderParams.calcEarnings) {
    orderParams.calcEarnings = cont.payEl[orderParams.payElID].calcEarnings || 'DAY'
  }
  if (!(orderParams.flagsFix & 1 << 23) && cont.payEl[orderParams.payElID].calcEarnings === 'ACCRUAL') {
    const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.dateFrom && orderParams.dateFrom <= o.dateTo)
    orderParams.calcEarnings = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'DAY') || 'DAY'
  }
  orderParams.flagsRec = ((orderParams.flagsRec || 0) | 2) | (orderParams.calcEarnings === 'HOUR' ? 1 << 5 : 0)

  // Розрахунок середнього заробітку за попередні періоди
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  const onDate = dateService.shiftDate(orderParams.dateFrom)
  const periodSalary = cont.periods
    ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
    : periodService.getPeriodOnDate(orgID, onDate)
  if (orderParams.recalculate) {
    if (orderParams.avgCalcType === 'FACT' && (orderParams.flagsRec & 1 << 7)) {
      // const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg) : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
      const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
        : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
          dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
      // const dateTo = (orderParams.flagsFix & 1 << 11) ? dateService.shiftDate(orderParams.dateToAvg) : dateService.addDays(orderParams.dateFrom, -1)
      const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
        : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
      resultCalculate = averageService.calculateAverageFact({
        orgID,
        cont,
        params: orderParams,
        dateFrom,
        dateTo,
        customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
      })
    }

    // Розрахунок середнього заробітку від планової суми
    if (orderParams.avgCalcType === 'PLAN' && (orderParams.flagsRec & 1 << 8)) {
      if (cont.payEl[orderParams.payElID].planSumByFact) {
        const payElBase = cont.payEl[orderParams.payElID].payElEntryPlanSum.filter(o => dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
        resultCalculate = averageService.calculateAverageFact({
          orgID,
          cont,
          params: orderParams,
          dateFrom: periodSalary.dateFrom,
          dateTo: periodSalary.dateTo,
          payElBase
        })
      } else {
        averageService.calculateAveragePlan({
          orgID,
          cont,
          params: orderParams,
          periodCalc: periodSalary,
          onDate,
          excludeHolidays: false,
          daysMode: 2
        })
      }
    }
  }
  if (!resultCalculate && !orderParams.recalculate) {
    orderParams.avgCalcType = 'PREVIOUS'
    if (!(orderParams.flagsFix & (1 << 0))) {
      orderParams.baseSum = 0
    }
  }
  if (!(orderParams.flagsFix & 1 << 21)) {
    const df = dateService.firstDayOfMonth(onDate)
    const dt = dateService.lastDayOfMonth(onDate)
    const fillMask = algorithmService.getFillMaskByPeriod(df, dt)
    const dayEarningType = cont.payEl[orderParams.payElID].dayEarningType
    if (dayEarningType === 'FACT') {
      const factSum = algorithmService.getFactSum({
        withDetail: false,
        cont,
        payElID: orderParams.payElID,
        periodCalc: periodCalc,
        periodSalary: periodSalary,
        dateFrom: dateService.shiftDate(periodSalary.dateFrom),
        dateTo: dateService.shiftDate(periodSalary.dateTo),
        periodType: 'SALARY',
        fillMask,
        includeSecondJobs: cont.payEl[orderParams.payElID].includeSecondJobs,
        payElBase: cont.payEl[orderParams.payElID].payElEntryPlanSum.filter(o => dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
      })

      const payTime = algorithmService.getPayTimeForAvg({
        mask: fillMask,
        dateFrom: dateService.shiftDate(periodSalary.dateFrom),
        dateTo: dateService.shiftDate(periodSalary.dateTo),
        hourAttr: 'factHour',
        payEl: cont.payEl[orderParams.payElID],
        dayAverageCondition: cont.payEl[orderParams.payElID].method.dayAverageCondition,
        calcEarnings: orderParams.calcEarnings || cont.payEl[orderParams.payElID].calcEarnings,
        timeSheets: algorithmService.getTimeSheetByPeriod(periodSalary, cont),
        plans: [],
        holiday: cont.holidays,
        orgID,
        cont
      })

      orderParams.planSum = factSum / (orderParams.flagsRec & 1 << 5 ? payTime.hours : payTime.days)
    } else {
      let onlyAutoCalc = dayEarningType === 'PLANAVTO' || dayEarningType === 'PLANFACT' || dayEarningType === 'PLANSСHED'
      // Постійні нарахування
      cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, orderParams.employeeNumberID, cont, periodSalary)
      const accr = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
      const permanentAccrual = {
        payElID: orderParams.payElID,
        dateFrom: cont.payEl[orderParams.payElID].dateFrom,
        dateTo: cont.payEl[orderParams.payElID].dateTo
      }

      let workScheduleID = (cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length)
        ? ((cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate) ||
          cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null
      const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
      if (workSchedule && workSchedule.planScheduleID) {
        workScheduleID = workSchedule.planScheduleID
      }
      const payTime = dayEarningType === 'PLANSСHED'
        ? algorithmService.getPlanTime(orgID, workScheduleID, dateService.shiftDate(periodSalary.dateFrom), dateService.shiftDate(periodSalary.dateTo), cont)
        : algorithmService.getPayTimeByTimeCost(fillMask, df, dt, 'planHour', cont.payEl[orderParams.payElID].payElTimeCost, false, cont.emp[cont.employeeNumberID].prop.timeSheets, 'plan', orgID)
      const daysCount = payTime.days
      const hoursCount = payTime.hours
      // Постійні нарахування
      cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, periodSalary)
      const calcByPayElEntryPlanSum = !!cont.payEl[orderParams.payElID].payElEntryPlanSum.length
      let planSum = accr && accr.payElID ? algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, payTime, false, calcByPayElEntryPlanSum, onlyAutoCalc) * (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1) : 0
      const employeeNumberID = cont.employeeNumberID
      let baseSumSecJobs = 0
      const includeSecondJobs = cont.payEl[orderParams.payElID].includeSecondJobs
      if (includeSecondJobs && cont.emp[cont.employeeNumberID].prop.employeePositions.length &&
        cont.emp[employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1].workPlace === '1') {
        const employeeID = cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID
        if (Array.isArray(cont.secJobs[employeeID])) {
          cont.secJobs[employeeID].forEach(row => {
            if (cont.emp[row.employeeNumberID] && cont.emp[row.employeeNumberID].prop && cont.emp[row.employeeNumberID].prop.employeePositions) {
              cont.employeeNumberID = row.employeeNumberID
              const accr = cont.emp[row.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
              cont.emp[row.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, periodCalc)
              baseSumSecJobs += accr && accr.payElID ? algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, payTime, false, calcByPayElEntryPlanSum, onlyAutoCalc) * (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1) : 0
            }
          })
        }
      }
      planSum += baseSumSecJobs
      const payElBase = cont.payEl[orderParams.payElID].payElEntryPlanSum.filter(o => dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
        .filter(o => !cont.payEl[o.payElBaseID].isAutoCalc)

      const factSum = dayEarningType === 'PLANFACT' ? algorithmService.getFactSum({
        withDetail: false,
        cont,
        payElID: orderParams.payElID,
        periodCalc: periodCalc,
        periodSalary: periodSalary,
        dateFrom: dateService.shiftDate(periodSalary.dateFrom),
        dateTo: dateService.shiftDate(periodSalary.dateTo),
        periodType: 'SALARY',
        fillMask,
        includeSecondJobs,
        payElBase
      }) : 0
      planSum += factSum

      cont.employeeNumberID = employeeNumberID
      orderParams.planSum = planSum / (orderParams.flagsRec & 1 << 5 ? hoursCount : daysCount)
    }

    if (!orderParams.accrualDt) {
      orderParams.accrualDt = []
    }
  }

  if (!orderParams.planSum) orderParams.planSum = 0
  if (!orderParams.baseSum) orderParams.baseSum = 0

  orderParams.planSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.planSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.planSum, 6)
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 6)

  if (!(orderParams.flagsFix & 1 << 22)) {
    if (!(orderParams.flagsFix & 1 << 23)) {
      if (orderParams.planSum >= orderParams.baseSum) {
        orderParams.indAvgPlan = 'INDPLAN'
      } else {
        orderParams.indAvgPlan = 'INDAVG'
      }
    }
    if (orderParams.indAvgPlan === 'INDPLAN') {
      orderParams.calcSum = orderParams.planSum
    } else {
      orderParams.calcSum = orderParams.baseSum
    }
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }

  cont.payEl[orderParams.payElID].dictTimeCostID = orderParams.indAvgPlan === 'INDPLAN' ? cont.payEl[orderParams.payElID].dictTimeCostWorkID : cont.payEl[orderParams.payElID].dictTimeCostAvgID

  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  // Розділення за періодами
  if (!existAccruals) {
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, periodCalc, null, false, true)
  } else if (!orderParams.recalculate) {
    // уточнюємо кількість днів з урахуванням елементу обліку робочого часу
    const dictTimeCostID = cont.payEl[orderParams.payElID].dictTimeCostID
    if (!cont.holidays) {
      cont.holidays = calendarService.getHolidays(dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -24), dateService.addMonths(periodCalc.dateTo, 12), orgID)
    }
    const rules = cont.dict.rules || UB.Repository('hr_dictTimeCostInt')
      .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
      .selectAsObject()

    const timService = require('../../HR/modules/timService')
    orderParams.accruals.forEach(accr => {
      if (!(accr.flagsFix & 1 << 7) && !(accr.flagsFix & 1 << 6)) {
        let dayCount = 0
        let hourCount = 0
        let mask = 0
        let maskAdd = 0
        const orderMinDateStore = {}
        let dateTo = dateService.shiftDate(accr.dateTo)
        let date = dateService.shiftDate(accr.dateFrom)
        do {
          const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
          if (orderParams.dayAccumCondition === 'calend' ||
                (orderParams.dayAccumCondition === 'noHolidays' && !cont.holidays.find(o => o.getTime() === date.getTime())) ||
                (orderParams.dayAccumCondition === 'noDaysOff' && timeSheetDay) ||
                (orderParams.dayAccumCondition === 'noDaysNormaOff' && timeSheetDay && timeSheetDay.normTimeCostType === 'WORK')) {
            let addDay = true
            if (dictTimeCostID && timeSheetDay) {
              const rule = rules.find(rule => rule.dictTimeCost1ID === timeSheetDay.factTimeCostID && rule.dictTimeCost2ID === dictTimeCostID)
              if (rule && !rule.isDateFirst && rule.isElemFirst) {
                addDay = false
              }
              if (rule && rule.isDateFirst) {
                const orderMinDate = timService.getOrderMinDate(timeSheetDay, orderMinDateStore)
                addDay = rule.isElemFirst ? orderParams.dateFrom < orderMinDate : orderParams.dateFrom > orderMinDate
              }
            }
            if (addDay) {
              dayCount++
              hourCount += timeSheetDay ? (cont.payEl[orderParams.payElID]['dictTimeCostID.isFactHour'] ? timeSheetDay.factHour : timeSheetDay.normHour) : 0
              mask = mask | 1 << (date.getDate() - 1)
            } else {
              maskAdd = maskAdd | 1 << (date.getDate() - 1)
            }
          } else {
            maskAdd = maskAdd | 1 << (date.getDate() - 1)
          }
          date = dateService.addDays(date, 1)
        } while (date <= dateTo)
        orderParams.dayCount += dayCount - accr.days
        accr.days = dayCount
        accr.hours = hourCount
        accr.mask = mask
        accr.maskAdd = maskAdd
      }
    })
    orderParams.dayCount = Math.max(0, orderParams.accruals.reduce((dayCount, accr) => dayCount + accr.days, 0))
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      calcSum: orderParams.baseSum,
      planSum: orderParams.planSum,
      baseSum: orderParams.calcSum,
      indAvgPlan: orderParams.indAvgPlan,
      dictFundSourceID: orderParams.dictFundSourceID || null,
      calcEarnings: orderParams.calcEarnings,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmBusinessTrip.run({ cont,
      periodCalc,
      periodSalary: periodSalary || periodService.getPeriod(accr.periodSalaryID),
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      }
    }))
  })
}

function calculateCompensation ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
  } else {
    if (!orderParams.compensationPeriod && orderParams.calcParams && orderParams.calcParams.compensationPeriod) {
      orderParams.compensationPeriod = orderParams.calcParams.compensationPeriod
    }
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  const onDate = dateService.shiftDate(orderParams.dateFrom)
  let periodSalary = cont.periods
    ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
    : periodService.getPeriodOnDate(orgID, onDate)
  if (!periodSalary) {
    periodSalary = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  }
  if (!existAccruals) {
    orderParams.accruals = [
      {
        periodSalaryID: periodSalary.ID,
        periodSalary: periodSalary.dateFrom,
        'periodSalaryID.name': periodSalary.name,
        employeeNumberID: orderParams.employeeNumberID,
        payElID: orderParams.payElID,
        flagsRec: orderParams.flagsRec,
        flagsFix: orderParams.flagsFix,
        dateFrom: onDate,
        dateTo: onDate,
        days: orderParams.dayCount,
        koef: 1
      }
    ]
  }
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return
  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = onDate
  }
  const minDateFromAvg = orderParams.compensationPeriod === '2' && onDate >= new Date(Date.UTC(2023, 8, 12, 0, 0, 0, 0)) ? new Date(Date.UTC(2023, 0, 1, 0, 0, 0, 0)) : null
  const maxDateToAvg = orderParams.compensationPeriod === '2' && onDate >= new Date(Date.UTC(2023, 8, 12, 0, 0, 0, 0)) ? new Date(Date.UTC(2023, 11, 31, 0, 0, 0, 0)) : null
  if (!orderParams.avgCalcType || (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8))) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: true,
      minDateFromAvg,
      maxDateToAvg,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від фактичної суми пропускається, переходимо до розрахунку від плану
  if (!resultCalculate && orderParams.avgCalcType === 'FACT') {
    orderParams.avgCalcType = 'PLAN'
    orderParams.accrualDt = []
  }
  // Розрахунок середнього заробітку від планової суми
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false,
      daysMode: 2,
      minDateFromAvg
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  if (!existAccruals && onDate < new Date(Date.UTC(2020, 11, 12, 0, 0, 0, 0))) {
    // Розрахунок коефіцієнтів індексації відповідно підвищення окладу
    indexingAccrual(cont, orderParams)
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      mask: 0,
      baseSum: orderParams.baseSum,
      days: !orderParams.recalculate ? orderParams.dayCount : accr.days,
      dictFundSourceID: orderParams.dictFundSourceID || null,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmVacation.run({ cont,
      periodCalc,
      periodSalary,
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      } }))
    orderParams.paySum = accr.paySum
  })
}

function calculateVacationUnpaid ({ orgID, cont, orderParams }) {
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  const rlService = require('../../HR/modules/rlService')
  rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
    prop: true,
    accrual: true,
    skipSecondJobs: false
  })
  cont.employeeNumberID = orderParams.employeeNumberID
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  if (!existAccruals) {
    // Створення нарахувань по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, null, false, true)
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.dayCount = 0
  orderParams.accruals.forEach(accr => {
    const workDays = UB.Repository('tim_timeSheet')
      .attrs('dateWork')
      .where('employeeNumberID', '=', orderParams.employeeNumberID)
      .where('dateWork', '>=', accr.dateFrom)
      .where('dateWork', '<=', accr.dateTo)
      .where('planTimeCostID.timeCostType', '=', 'WORK')
      .where('isCanceled', '=', 0)
      .where('isSchedule', '=', 1, 'isSchedule')
      .where('orderID.orderClass.entityName', '=', 'hr_timeSheetChange', 'isTimeSheetChange')
      .groupBy('dateWork')
      .logic('(([isSchedule]) or ([isTimeSheetChange]))')
      .selectAsObject()
    accr.workDays = workDays.length
    orderParams.dayCount += accr.workDays
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      baseSum: orderParams.baseSum || 0,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmVacation.run({ cont, periodCalc, periodSalary, params: accr }))
  })
}

function calculateAvgPay ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  if (orderParams.parentID) {
    const parentFields = ['avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'orderRegistryID', 'calcEarnings']
    const docReg = UB.Repository('hr_docRegAvgPay').attrs(parentFields).selectById(orderParams.parentID)
    if (docReg) {
      parentFields.forEach(fieldName => {
        if (['dateFromAvg', 'dateToAvg'].includes(fieldName)) {
          orderParams[fieldName] = dateService.shiftDate(docReg[fieldName])
        } else {
          orderParams[fieldName] = docReg[fieldName]
        }
      })
      orderParams.baseSum = docReg.avgSum
      orderParams.flagsRec = 2 | (docReg.avgCalcType === 'FACT' ? (1 << 7) : docReg.avgCalcType === 'PLAN' ? (1 << 8) : (1 << 6))
      orderParams.flagsFix = orderParams.flagsFix | 1 << 0 | 1 << 10 | 1 << 11 | 1 << 18
      orderParams.calcEarnings = docReg.calcEarnings || 'DAY'
      orderParams.accrualsAvg = UB.Repository('hr_accrualAvg').attrs('periodID.name', 'dateFrom', 'dateTo',
        'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt').where('orderID', '=', orderParams.parentID).selectAsObject()

      orderParams.accrualsAvg.forEach(avg => {
        avg.flagsFix = 143425 // 1 << 13 | 1 << 12 | 1 << 0 | 1 << 6 | 1 << 17
      })
    }
  }
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, periodCalc, false)
  } else if (!orderParams.uiRecalc) {
    const timService = require('../../HR/modules/timService')
    if (!cont.holidays) {
      cont.holidays = calendarService.getHolidays(dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -24), dateService.addMonths(periodCalc.dateTo, 12), orgID)
    }
    const rules = cont.dict.rules || UB.Repository('hr_dictTimeCostInt')
      .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
      .selectAsObject()
    const dictTimeCostID = cont.payEl[orderParams.payElID].dictTimeCostID
    orderParams.dayAccumCondition = cont.payEl[orderParams.payElID].method.dayAccumCondition || 'noDaysOff'
    orderParams.accruals.forEach(accr => {
      const periodSalary = cont.periods.find(o => o.ID === accr.periodSalaryID)
      const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
      if (!(accr.flagsFix & 1 << 6) && !(accr.flagsFix & 1 << 7) && (!cont.constants || !cont.constants.hrTimeSheetReCalcDate || cont.constants.hrTimeSheetReCalcDate < periodSalary.dateFrom)) {
        let dayCount = 0
        let hourCount = 0
        let mask = 0
        let maskAdd = 0
        const orderMinDateStore = {}
        let dateTo = dateService.shiftDate(accr.dateTo)
        let date = dateService.shiftDate(accr.dateFrom)
        do {
          const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
          if (orderParams.dayAccumCondition === 'calend' ||
            (orderParams.dayAccumCondition === 'noHolidays' && !cont.holidays.find(o => o.getTime() === date.getTime())) ||
            (orderParams.dayAccumCondition === 'noDaysOff' && timeSheetDay && timeSheetDay.planTimeCostType === 'WORK') ||
            (orderParams.dayAccumCondition === 'noDaysNormaOff' && timeSheetDay && timeSheetDay.normTimeCostType === 'WORK')
          ) {
            let addDay = true
            if (dictTimeCostID && timeSheetDay && (!orderParams.empOrderID || timeSheetDay.orderID !== orderParams.empOrderID)) {
              const rule = rules.find(rule => rule.dictTimeCost1ID === timeSheetDay.factTimeCostID && rule.dictTimeCost2ID === dictTimeCostID)
              if (rule && !rule.isDateFirst && rule.isElemFirst) {
                addDay = false
              }
              if (rule && rule.isDateFirst) {
                const orderMinDate = timService.getOrderMinDate(timeSheetDay, orderMinDateStore)
                addDay = rule.isElemFirst ? orderParams.dateFrom < orderMinDate : orderParams.dateFrom > orderMinDate
              }
              if (timeSheetDay.orderID === orderParams.orderID) {
                addDay = true
              }
              if (orderParams.recalculate && dictTimeCostID && timeSheetDay.factTimeCostID !== dictTimeCostID) {
                addDay = false
              }
            }
            if (addDay) {
              if ((timeSheetDay ? timeSheetDay['normHour'] : 0) > 0) {
                dayCount++
                hourCount += timeSheetDay ? timeSheetDay['normHour'] : 0
                mask = mask | 1 << (date.getDate() - 1)
              }
            } else {
              maskAdd = maskAdd | 1 << (date.getDate() - 1)
            }
          } else {
            maskAdd = maskAdd | 1 << (date.getDate() - 1)
          }
          date = dateService.addDays(date, 1)
        } while (date <= dateTo)
        orderParams.dayCount += dayCount - accr.days
        accr.days = dayCount
        accr.hours = accrualService.round(hourCount, 3)
        accr.mask = mask
        accr.maskAdd = maskAdd
      }
    })
  }
  if (!orderParams.calcEarnings) {
    orderParams.calcEarnings = 'DAY'
  }
  if (!(orderParams.flagsFix & 1 << 23) && cont.payEl[orderParams.payElID].calcEarnings === 'ACCRUAL') {
    const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.dateFrom && orderParams.dateFrom <= o.dateTo)
    orderParams.calcEarnings = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'DAY') || 'DAY'
  }
  orderParams.flagsRec = ((orderParams.flagsRec || 0) | 2) | (orderParams.calcEarnings === 'HOUR' ? 1 << 5 : 0)

  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    // const dateFrom = (orderParams.flagsFix & 1 << 10) ? orderParams.dateFromAvg : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
    const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
    // const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg : dateService.addDays(orderParams.dateFrom, -1)
    const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
      : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
    resultCalculate = averageService.calculateAverageFact({
      orgID,
      cont,
      params: orderParams,
      dateFrom,
      dateTo,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від планової суми
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const onDate = dateService.shiftDate(orderParams.dateFrom)
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false,
      daysMode: 2
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    if (periodSalary) {
      Object.assign(accr, {
        avgCalcType: orderParams.avgCalcType,
        dateFromAvg: orderParams.dateFromAvg,
        dateToAvg: orderParams.dateToAvg,
        baseSum: orderParams.baseSum,
        calcEarnings: orderParams.calcEarnings,
        dictFundSourceID: orderParams.dictFundSourceID || null,
        flagsRec: orderParams.flagsRec,
        flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
      })
      Object.assign(accr, algorithmAvgPay.run({
        cont,
        periodCalc,
        periodSalary,
        params: accr,
        sourceAccr: {
          accrualDt: orderParams.accrualDt,
          perAccr: orderParams.source ? (orderParams.source.perAccr || null) : null
        }
      }))
    }
  })
}

function calculateRenewalPay ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `,
    { prop: true, accrual: true, skipSecondJobs: false })
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)

  cont.employeeNumberID = orderParams.employeeNumberID
  if (!existAccruals) {
    // Розділення по періодам
    const periods = UB.Repository('hr_dictPeriod')
      .attrs(['ID', 'dateFrom', 'dateTo', 'name'])
      .where('orgID', '=', orgID)
      .where('dateTo', '>=', orderParams.dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
    periods.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    const accruals = []
    const dateFrom = dateService.shiftDate(orderParams.dateFrom)
    let calendarDayCount = (!orderParams.ctrlName || orderParams.ctrlName === 'calendarDayCount') ? orderParams.calendarDayCount : 0
    let dayCount = (!orderParams.ctrlName || orderParams.ctrlName === 'dayCount') ? orderParams.dayCount : null
    let dateTo = (!orderParams.ctrlName || orderParams.ctrlName === 'dateTo' || orderParams.ctrlName === 'payElID')
      ? orderParams.dateTo : (orderParams.ctrlName === 'dateFrom')
        ? dateService.addDays(orderParams.dateFrom, (orderParams.calendarDayCount || orderParams.dayCount) - 1)
        : dateService.addDays(orderParams.dateFrom, (calendarDayCount || dayCount) - 1)

    const workScheduleID = (cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length)
      ? ((cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= dateFrom && o.dateTo >= dateFrom) ||
        cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null
    const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
    const plan = UB.Repository('tim_plan')
      .attrs(['dayDate', 'workHours', 'dictTimeCostID', 'dictTimeCostID.timeCostType'])
      .where('organizationID', '=', planByOrgID || orgID)
      .where('workScheduleID', '=', workScheduleID)
      .where('dayDate', '>=', orderParams.dateFrom)
      .where('dayDate', '<=', orderParams.dateTo)
      .orderBy('dayDate')
      .selectAsObject({
        'dictTimeCostID.timeCostType': 'timeCostType'
      })

    const orderID = orderParams.orderID || orderParams.empOrderID
    const timeSheet = UB.Repository('tim_timeSheet')
      .attrs(['dateWork', 'planTimeCostID', 'factTimeCostID', 'planTimeCostID.timeCostType', 'factTimeCostID.timeCostType',
        'planID.workScheduleID.isDayAsPlan'])
      .where('employeeNumberID', '=', orderParams.employeeNumberID)
      .where('dateWork', '>=', orderParams.dateFrom)
      .where('dateWork', '<=', orderParams.dateTo)
      .where('orderID', '=', orderID)
      .selectAsObject({
        'planTimeCostID.timeCostType': 'planTimeCostType',
        'factTimeCostID.timeCostType': 'factTimeCostType',
        'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan'
      })

    calendarDayCount = 0
    dayCount = 0
    let date = dateService.shiftDate(dateFrom)
    let planDay, factDay
    let isAdd
    do {
      const period = periods.find(o => o.dateFrom <= date && o.dateTo >= date)
      if (period) {
        let accr = accruals.find(o => o.periodSalaryID === period.ID)
        if (!accr) {
          accr = {
            periodSalaryID: period.ID,
            periodSalary: period.dateFrom,
            'periodSalaryID.name': period.name,
            employeeNumberID: orderParams.employeeNumberID,
            payElID: orderParams.payElID,
            flagsRec: orderParams.flagsRec,
            flagsFix: orderParams.flagsFix,
            dateFrom: dateService.shiftDate(date),
            dateTo: dateService.shiftDate(date),
            days: 0,
            hours: 0,
            mask: 0,
            maskAdd: 0,
            calendarDays: 0,
            koef: 1
          }
          accruals.push(accr)
        }
        factDay = timeSheet.find(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())
        isAdd = false
        if (factDay && (factDay.planTimeCostType === 'WORK' || factDay.factTimeCostType === 'WORK')) {
          isAdd = true
        } else {
          planDay = plan.find(o => dateService.shiftDate(o.dayDate).getTime() === date.getTime())
          if (planDay && planDay.timeCostType === 'WORK') {
            isAdd = true
          }
        }
        if (isAdd) {
          dayCount++
          accr.days++
          accr.mask = accr.mask | 1 << (date.getDate() - 1)
        } else {
          accr.maskAdd = accr.maskAdd | 1 << (date.getDate() - 1)
        }

        calendarDayCount++
        accr.calendarDays++
        accr.dateTo = dateService.shiftDate(date)

        if (orderParams.dayCount && (date.getTime() === dateTo.getTime()) && (orderParams.dayCount > dayCount) && orderParams.ctrlName === 'dayCount') {
          dateTo = dateService.addDays(dateTo, 1)
        }

        if (!orderParams.calendarDayCount && orderParams.dayCount && (date.getTime() === dateTo.getTime()) && (orderParams.dayCount > dayCount) && orderParams.ctrlName === 'dateFrom') {
          dateTo = dateService.addDays(dateTo, 1)
        }
      }
      date = dateService.addDays(date, 1)
    } while (date <= dateTo)

    orderParams.calendarDayCount = calendarDayCount
    orderParams.dayCount = dayCount
    orderParams.dateTo = dateTo
    orderParams.accruals = accruals
  }

  if (!orderParams.calcEarnings) {
    orderParams.calcEarnings = 'DAY'
  }
  if (!(orderParams.flagsFix & 1 << 23) && cont.payEl[orderParams.payElID].calcEarnings === 'ACCRUAL') {
    const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.dateFrom && orderParams.dateFrom <= o.dateTo)
    orderParams.calcEarnings = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'DAY') || 'DAY'
  }
  orderParams.flagsRec = ((orderParams.flagsRec || 0) | 2) | (orderParams.calcEarnings === 'HOUR' ? 1 << 5 : 0)

  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  /*
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT') {
    orderParams.avgCalcType = 'PLAN'
    orderParams.accrualDt = []
  }
  */
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    // const dateFrom = (orderParams.flagsFix & 1 << 10) ? orderParams.dateFromAvg : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
    const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
    // const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg : dateService.addDays(orderParams.dateFrom, -1)
    const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
      : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
    resultCalculate = averageService.calculateAverageFact({
      orgID,
      cont,
      params: orderParams,
      dateFrom,
      dateTo,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від планової суми
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const onDate = dateService.shiftDate(orderParams.dateFrom)
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false,
      daysMode: 2
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      baseSum: orderParams.baseSum,
      dictFundSourceID: orderParams.dictFundSourceID || null,
      calcEarnings: orderParams.calcEarnings,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmAvgPay.run({ cont,
      periodCalc,
      periodSalary,
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      }
    }))
  })
}

function calculateAvgMonth ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams)
  }
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return
  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  if (!orderParams.calcEarnings) {
    orderParams.calcEarnings = 'DAY'
  }
  if (!(orderParams.flagsFix & 1 << 23) && cont.payEl[orderParams.payElID].calcEarnings === 'ACCRUAL') {
    const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.dateFrom && orderParams.dateFrom <= o.dateTo)
    orderParams.calcEarnings = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'DAY') || 'DAY'
  }
  orderParams.flagsRec = ((orderParams.flagsRec || 0) | 2) | (orderParams.calcEarnings === 'HOUR' ? 1 << 5 : 0)

  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
    const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
      : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
    resultCalculate = averageService.calculateAverageFact({
      orgID,
      cont,
      params: orderParams,
      dateFrom,
      dateTo,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
    if (!resultCalculate) orderParams.avgCalcType = 'PLAN'
  }
  // if (cont.payEl[orderParams.payElID].method.code === '22' && orderParams.avgCalcType === 'PLAN') orderParams.avgCalcType = 'FACT'
  // Розрахунок середнього заробітку від планової суми
  const onDate = dateService.shiftDate(orderParams.dateFrom)
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  } else {
    orderParams.baseSum = accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo)
  }
  // Розрахунок середньої кількості днів
  const payEl = cont.payEl[orderParams.payElID]
  let daysCount = 0
  let hoursCount = 0
  let monthCount = 0
  const calcMounth = payEl.calcMounth || 2
  const workScheduleID = (cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length)
    ? ((cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.avgOnDate && o.dateTo >= orderParams.avgOnDate) ||
      cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null

  const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.avgOnDate && o.dateTo >= orderParams.avgOnDate)
  const useTimeSheetBy = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].useTimeSheetBy : 'NORMA') || 'NORMA'
  let doCalc = true
  let df = dateService.addMonths(dateService.firstDayOfMonth(onDate), -1)
  let dt = dateService.lastDayOfMonth(df)
  while (doCalc) {
    const payTime = workScheduleID ? algorithmService.getPlanTime(orgID, workScheduleID, df, dt, cont)
      : algorithmService.getPlanTimeByTimeSheet({ timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets, dateFrom: df, dateTo: dt, useTimeSheetBy })
    daysCount += payTime.days
    hoursCount += payTime.hours
    monthCount++
    if (monthCount === calcMounth) doCalc = false
    df = dateService.addMonths(df, -1)
    dt = dateService.lastDayOfMonth(df)
  }
  if (!(orderParams.flagsFix & 1 << 13)) {
    orderParams.avgDays = accrualService.round((orderParams.calcEarnings === 'HOUR' ? hoursCount : daysCount) / monthCount, 2)
  }
  // Середньомісячна
  if (!(orderParams.flagsFix & 1 << 18)) {
    orderParams.avgSumMonth = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum * orderParams.avgDays, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum * orderParams.avgDays, 2)
  }
  // Сума
  if (!(orderParams.flagsFix & 1 << 1)) {
    orderParams.paySum = accrualService.roundPayEl(orderParams.avgSumMonth * orderParams.countMonth, payEl.roundUpTo)
  } else {
    orderParams.accrualDt = []
  }
  orderParams.accrualDt = postingService.getAccrualDt({
    cont,
    sourceAccr: {
      accrualDt: orderParams.accrualDt
    },
    params: {
      dictFundSourceID: orderParams.dictFundSourceID || null,
      dateFrom: orderParams.dateFrom,
      payElID: orderParams.payElID,
      paySum: orderParams.paySum,
      flagsFix: orderParams.flagsFix
    }
  })
}

function calculateBountyHelp ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
    rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `, {
      prop: true,
      accrual: true,
      skipSecondJobs: false
    })
  }
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams)
  }
  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = orderParams.employeeNumberID
  if ([null, '', 'PLAN'].includes(cont.payEl[orderParams.payElID].calcAvgType)) {
    cont.payEl[orderParams.payElID].calcAvgType = 'PLAN'
    orderParams.avgCalcType = 'PLAN'
    orderParams.flagsRec = orderParams.flagsRec | 1 << 8
  }
  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    // const dateFrom = (orderParams.flagsFix & 1 << 10) ? orderParams.dateFromAvg : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
    let dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
    // const dateTo = (orderParams.flagsFix & 1 << 11) ? dateService.shiftDate(orderParams.dateToAvg) : dateService.addDays(orderParams.dateFrom, -1)
    const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
      : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
    resultCalculate = averageService.calculateAverageFact({
      orgID,
      cont,
      params: orderParams,
      dateFrom,
      dateTo,
      customAdjustPeriodFn: cont.payEl[orderParams.payElID].calcMounth === 2 ? adjustBusinessTripAndAvgPayPeriod : undefined
    })
    if (!resultCalculate) orderParams.avgCalcType = 'PLAN'
  }
  if (cont.payEl[orderParams.payElID].method.code === '22' && orderParams.avgCalcType === 'PLAN') orderParams.avgCalcType = 'FACT'
  // Розрахунок середнього заробітку від планової суми
  const onDate = dateService.shiftDate(orderParams.dateFrom)
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false,
      daysMode: 3
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  } else {
    orderParams.baseSum = accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo)
  }
  // Розрахунок середньої кількості днів
  const payEl = cont.payEl[orderParams.payElID]
  let daysCount = 0
  let monthCount = 0
  const calcMounth = payEl.calcMounth || 2
  const workScheduleID = (cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length)
    ? ((cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.avgOnDate && o.dateTo >= orderParams.avgOnDate) ||
      cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null
  const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= orderParams.avgOnDate && o.dateTo >= orderParams.avgOnDate)
  const useTimeSheetBy = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].useTimeSheetBy : 'NORMA') || 'NORMA'
  let doCalc = true
  let df = dateService.addMonths(dateService.firstDayOfMonth(onDate), -1)
  let dt = dateService.lastDayOfMonth(df)
  while (doCalc) {
    const payTime = workScheduleID ? algorithmService.getPlanTime(orgID, workScheduleID, df, dt, cont)
      : algorithmService.getPlanTimeByTimeSheet({ timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets, dateFrom: df, dateTo: dt, useTimeSheetBy })
    daysCount += payTime.days
    monthCount++
    if (monthCount === calcMounth) doCalc = false
    df = dateService.addMonths(df, -1)
    dt = dateService.lastDayOfMonth(df)
  }
  if (!(orderParams.flagsFix & 1 << 13)) {
    orderParams.avgDays = accrualService.round(daysCount / monthCount, 2)
  }

  if (!orderParams.rate) {
    orderParams.rate = 100
  }
  if (!orderParams.countMonth) {
    orderParams.countMonth = 1
  }
  if (orderParams.valuation !== 'SUM') {
    if ([null, '', 'PLAN'].includes(cont.payEl[orderParams.payElID].calcAvgType)) {
      if (!(orderParams.flagsFix & 1 << 9)) {
        if (cont.payEl[orderParams.payElID].dictExperienceID && cont.payEl[orderParams.payElID].payElExperience.length) {
          const experience = algorithmService.getExpirience(cont, orderParams.payElID, orderParams.dateFrom, true)
          orderParams.rate = experience.rate
        }
      }
      // Середньомісячна
      if (!(orderParams.flagsFix & 1 << 18) || orderParams.avgSumMonth === undefined) {
        orderParams.avgSumMonth = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
      }
      // Сума
      if (!(orderParams.flagsFix & 1 << 1)) {
        orderParams.paySum = accrualService.roundPayEl(orderParams.avgSumMonth * orderParams.rate / 100, payEl.roundUpTo)
      }
    } else {
      // Середньомісячна
      if (!(orderParams.flagsFix & 1 << 18)) {
        orderParams.avgSumMonth = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum * orderParams.avgDays, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum * orderParams.avgDays, 2)
      }
      // Сума
      if (!(orderParams.flagsFix & 1 << 1)) {
        orderParams.paySum = accrualService.roundPayEl(orderParams.avgSumMonth * orderParams.rate * orderParams.countMonth / 100, payEl.roundUpTo)
      }
    }
  }
  orderParams.accrualDt = postingService.getAccrualDt({
    cont,
    sourceAccr: {
      accrualDt: orderParams.accrualDt
    },
    params: {
      dictFundSourceID: orderParams.dictFundSourceID || null,
      dateFrom: orderParams.dateFrom,
      payElID: orderParams.payElID,
      paySum: orderParams.paySum,
      flagsFix: orderParams.flagsFix
    }
  })
}

function adjustBusinessTripAndAvgPayPeriod (cont, params) {
  const payEl = cont.payEl[params.payElID]
  const calcMonth = payEl.calcMounth || 1
  params.dateToAvg = dateService.shiftDate(params.dateToAvg)
  params.dateFromAvg = (params.flagsFix & 1 << 10) ? params.dateFromAvg : dateService.addMonths(params.dateFromAvg, -1 * calcMonth)
  if (!(params.flagsFix & 1 << 11) && params.dateToAvg && params.dateFromAvg) {
    if (params.dateToAvg.getDate() === dateService.lastDayOfMonth(params.dateToAvg).getDate()) {
      params.dateToAvg = dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(params.dateToAvg), -1 * calcMonth))
    } else {
      params.dateToAvg = dateService.addMonths(params.dateToAvg, -1 * calcMonth)
    }
  }
}

function calculateOrder ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  const periodCalc = cont.periods
    ? cont.periods.find(o => o.ID === orderParams.periodCalcID)
    : periodService.getPeriod(orderParams.periodCalcID)
  rlService.loadCalcData({ cont, orgID, employeeNumbers: [orderParams.employeeNumberID], periodID: orderParams.periodCalcID, loadData: { accrual: true, prop: true } })
  cont.employeeNumberID = orderParams.employeeNumberID
  orderParams.accrualDt = postingService.getAccrualDt({
    cont,
    sourceAccr: {
      periodCalc
    },
    params: {
      dateFrom: periodCalc.dateFrom,
      payElID: orderParams.payElID,
      paySum: orderParams.paySum,
      dictFundSourceID: orderParams.dictFundSourceID,
      flagsFix: orderParams.flagsFix || 0
    }
  })
}

function calculateSupAvgEarn ({ orgID, cont, orderParams }) {
  const rlService = require('../../HR/modules/rlService')
  rlService.getCalcAccrual(cont, orgID, [orderParams.employeeNumberID], orderParams.periodCalcID, `Order: ${orderParams.orderID} `,
    { prop: true, accrual: true, skipSecondJobs: false })
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber) {
    employeeService.recalcEmpStartWork(orderParams.employeeNumberID, cont.emp[orderParams.employeeNumberID].prop.employeeNumber.dateFrom, cont)
  }
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  const periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, periodCalc, false)
  }
  cont.employeeNumberID = orderParams.employeeNumberID
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) return
  // Розрахунок середнього заробітку за попередні періоди
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = dateService.shiftDate(orderParams.dateFrom)
  }
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateAverage({
      orgID,
      cont,
      params: orderParams,
      excludeHolidays: false,
      checkContinuation: false,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    // const dateFrom = (orderParams.flagsFix & 1 << 10) ? orderParams.dateFromAvg : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
    const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1 * cont.payEl[orderParams.payElID].calcMounth)))
    // const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg : dateService.addDays(orderParams.dateFrom, -1)
    const dateTo = (orderParams.flagsFix & 1 << 11) ? orderParams.dateToAvg
      : dateService.lastDayOfMonth(dateService.addMonths(dateService.firstDayOfMonth(orderParams.dateFrom), -1))
    resultCalculate = averageService.calculateAverageFact({
      orgID,
      cont,
      params: orderParams,
      dateFrom,
      dateTo,
      customAdjustPeriodFn: adjustBusinessTripAndAvgPayPeriod
    })
  }
  // Розрахунок середнього заробітку від планової суми
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const onDate = dateService.shiftDate(orderParams.dateFrom)
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateAveragePlan({
      orgID,
      cont,
      params: orderParams,
      periodCalc: periodSalary,
      onDate,
      excludeHolidays: false,
      daysMode: 2
    })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  orderParams.baseSum = cont.payEl[orderParams.payElID].roundAvgUpTo ? accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo) : accrualService.round(orderParams.baseSum, 2)
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      baseSum: orderParams.baseSum,
      dictFundSourceID: orderParams.dictFundSourceID || null,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    Object.assign(accr, algorithmAvgPay.run({ cont,
      periodCalc,
      periodSalary,
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      }
    }))
  })
}

function calculatePieceWorkShift ({ orgID, workList, periodCalcID, periodSalaryID, orderParams = {} }) {
  const cont = {}
  const result = []
  cont.orgID = orgID
  cont.org = orgService.getOrgData(orgID)
  cont.constants = orgService.getOrgConstant(orgID)
  cont.payEl = payElService.getPayEl({ orgID })
  contService.initDict(cont, ['dictWorkOperation', 'entryAcc', 'payDim'])
  let periodCalc = periodCalcID ? periodService.getPeriod(periodCalcID) : null
  let periodSalary = periodSalaryID ? periodService.getPeriod(periodSalaryID) : null
  let dateFrom = periodSalaryID ? periodSalary.dateFrom : null
  let dateTo = periodSalaryID ? periodSalary.dateTo : null

  cont.periodCalc = periodCalc

  const employeeNumbers = workList.filter(o => o.employeeNumberID).map(o => o.employeeNumberID)
  employeeService.loadEmployeeData({ orgID, cont, employeeNumbers, dateFrom, dateTo, skipSecondJobs: true, skipParentEmployee: true, entityList: ['employeeNumber'] })

  workList.forEach(work => {
    if (!work.payElID) {
      return
    }
    const payEl = cont.payEl[work.payElID]
    if (payEl.ignoreInCalcPay) {
      work.flagsRec = work.flagsRec | 1 << 13
    }
    if (work.idx === undefined) {
      work.idx = 1
    }
    cont.employeeNumberID = work.employeeNumberID
    if (cont.employeeNumberID && !cont.emp[cont.employeeNumberID].prop.employeeNumber) {
      return
    }
    const params = Object.assign(work, {
      orgID: orgID,
      employeeNumberID: work.employeeNumberID,
      payElID: work.payElID,
      dateFrom: work.dateFrom ? dateService.shiftDate(work.dateFrom) : periodSalary.dateFrom,
      dateTo: work.dateTo ? dateService.shiftDate(work.dateTo) : periodSalary.dateTo
    })
    const sourceAccr = {
      perAccr: work.sourceID ? cont.emp[cont.employeeNumberID].permanentAccrual.find(o => o.ID === work.sourceID) : null,
      periodCalc
    }
    if (!params.flagsFix) {
      params.flagsFix = 0
    }
    if (!params.flagsRec) {
      params.flagsRec = 0
    }
    params.hours = 0
    params.days = 0
    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
    result.push(Object.assign(pieceWorkShift.run({
      cont,
      periodCalc,
      periodSalary,
      params,
      sourceAccr
    }), { idx: work.idx }))
  })
  return result
}

function getCalendarDaysByPeriod (dateFrom, dateTo, periodDateTo, holidays) {
  let yearDays = 0
  let periodDays = 0
  let date = dateService.shiftDate(dateFrom)
  while (date <= dateTo) {
    if (!holidays.find(o => o.getTime() === date.getTime())) {
      yearDays++
      if (date <= periodDateTo) {
        periodDays++
      }
    }
    date = dateService.addDays(date, 1)
  }
  return { yearDays, periodDays }
}

function calcRegistryReserve ({ orgID, orderParams }) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const periodFromAvg = periodService.getPeriod(orderParams.periodFromAvg)
  const orderRegistryDtRL = []
  const orderRegistryDtRD = []
  const cont = {
    orgID,
    periodCalc: currentPeriod,
    periods: periodService.getArrayPeriods(orgID, currentPeriod.dateFrom),
    emp: {},
    org: orgService.getOrgData(orgID),
    payEl: payElService.getPayEl({ orgID }),
    payFund: payFundService.getPayFund(),
    holidays: calendarService.getHolidays(dateService.addMonths(dateService.firstDayOfYear(currentPeriod.dateFrom), -24), dateService.addMonths(currentPeriod.dateTo, 12), orgID)
  }
  contService.initDict(cont)
  const payEl = cont.payEl[orderParams.payElID]
  const payFund = cont.payFund.filter(fund => fund.methodCode !== '2' && fund.payFundBase.find(o => o.payElBaseID === payEl.ID))
  const payElAccrualReserve = cont.payEl[payEl.ID].payElAccrualReserve.filter(o => o.dateFrom <= currentPeriod.dateTo && o.dateTo >= currentPeriod.dateFrom)
  const payElUseReserve = cont.payEl[payEl.ID].payElUseReserve.filter(o => o.dateFrom <= currentPeriod.dateTo && o.dateTo >= currentPeriod.dateFrom) // Використання резерву
  const payFundAccrReserve = cont.payFund.filter(fund => fund.methodCode !== '2' && fund.payFundBase.find(o => payElAccrualReserve.find(r => r.payElBaseID === o.payElBaseID)))
  const payFundAccrReserveIDs = payFundAccrReserve.map(o => o.ID)
  const payFundUseReserve = cont.payFund.filter(fund => fund.methodCode !== '2' && fund.payFundBase.find(o => payElUseReserve.find(r => r.payElBaseID === o.payElBaseID)))
  const payFundUseReserveIDs = payFundUseReserve.map(o => o.ID)
  const store = UB.DataStore('hr_employeeNumber')
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  store.runSQL(` SELECT n.ID "employeeNumberID", n.tabNum "tabNum", n.dateTo "dateTo",
    (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) from hr_employeePosition ep 
    left join hr_position pos on pos.mi_data_id = ep.positionID and pos.orgID = ep.organizationID and pos.state = 'ACTIVE'
     and pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
    left join hr_dictPosition dp ON dp.ID = ep.dictPositionID 
    where ep.employeeNumberID = n.ID and ep.isActive = 1 AND ep.dateFrom <= :dateTo:
    and ep.mi_deleteDate >= '9999-12-31' order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) "posName",
    (select ${sqlDialect.top} pos.name from hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID 
    and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and pos.mi_dateFrom <= ep.dateTo and 
    pos.mi_deleteDate >= '9999-12-31' where ep.employeeNumberID = n.ID AND ep.dateFrom <= :dateTo: and ep.isActive = 1  
    and ep.mi_deleteDate >= '9999-12-31' order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) "depName"
    FROM hr_employeeNumber n
    WHERE n.orgID = :orgID: AND n.dateFrom <= :dateTo: AND n.dateTo >= :dateFrom: AND n.mi_deleteDate >= '9999-12-31'
     ${limitedAccess ? ` AND n.limitedAccess = 0` : ''}`,
  {
    orgID,
    dateFrom: periodFromAvg.dateFrom,
    dateTo: currentPeriod.dateTo
  })
  const employeeNumbers = store.getAsJsObject()

  const balanceVacations = UB.Repository('hr_balanceVacation')
    .attrs(['payElID', 'employeeNumberID', 'payFundID', 'sumFrom', 'accrualDt'])
    .where('orgID', '=', orgID)
    .where('periodCalcID', '=', periodFromAvg.ID)
    .orderBy('employeeNumberID')
    .selectAsObject()

  const vacPlans = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID', 'dayDiff', 'dayCountFact'
    ])
    .where('empVacationPlanID.employeeNumberID.orgID', '=', orgID)
    .where('empVacationPlanID.dictVacationKindID.isFormReserve', '=', true)
    .where('fromOrgID', 'isNull')
    .where('dateFrom', '<=', currentPeriod.dateTo)
    .where('dayDiff', '>=', 0)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('empVacationPlanID.employeeNumberID')
    .orderBy('empVacationPlanID.dictVacationKindID')
    .orderByDesc('dateFrom')
    .selectAsObject({
      'empVacationPlanID.employeeNumberID': 'employeeNumberID',
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID'
    })

  vacPlans.forEach(plan => {
    let days = 0
    const employeeNumber = employeeNumbers.find(o => o.employeeNumberID === plan.employeeNumberID)
    if (employeeNumber) {
      if (dateService.shiftDate(plan.dateTo) <= currentPeriod.dateTo) {
        days = plan.dayDiff
      } else {
        const vacDays = getCalendarDaysByPeriod(dateService.shiftDate(plan.dateFrom), dateService.shiftDate(plan.dateTo), currentPeriod.dateTo, cont.holidays)
        days = accrualService.round(vacDays.yearDays ? (plan.dayCountPlan / vacDays.yearDays * vacDays.periodDays - plan.dayCountFact) : 0, 0)
      }
      employeeNumber.days = (employeeNumber.days || 0) + days
    }
  })

  const loadDateFrom = dateService.addMonths(currentPeriod.dateFrom, -24)
  const loadDateTo = dateService.addMonths(currentPeriod.dateTo, 12)

  employeeNumbers.forEach(employeeNumber => {
    cont.emp = {}
    employeeService.loadEmployeeData({
      orgID,
      cont,
      employeeNumbers: [employeeNumber],
      dateFrom: loadDateFrom,
      dateTo: loadDateTo,
      skipSecondJobs: true,
      entityList: ['employeePosition', 'employeeAccrual', 'employeeRetentions', 'payPermDisable', 'timeSheet', 'employeeDisability', 'employeeBenefits']
    })
    cont.employeeNumberID = employeeNumber.employeeNumberID
    employeeNumber.dateTo = dateService.shiftDate(employeeNumber.dateTo)
    cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, cont.employeeNumberID, loadDateFrom)
    cont.emp[cont.employeeNumberID].accrualFund = accrualService.getFundAccrual(cont.orgID, cont.employeeNumberID, loadDateFrom)
    if (cont.emp[cont.employeeNumberID].prop && cont.emp[cont.employeeNumberID].prop.parentEmpNumbers) {
      cont.emp[cont.employeeNumberID].prop.parentEmpNumbers.forEach(parent => {
        const accruals = accrualService.getAccrual(parent.orgID, parent.employeeNumberID, loadDateFrom)
        // const accrualFund = accrualService.getFundAccrual(parent.orgID, parent.employeeNumberID, loadDateFrom)
        accruals.forEach(accr => {
          const periodCalc = cont.periods.find(o => o.dateFrom.getTime() === accr.periodCalc.getTime())
          if (periodCalc) {
            accr.periodCalcID = periodCalc.ID
          }
          const periodSalary = cont.periods.find(o => o.dateFrom.getTime() === accr.periodSalary.getTime())
          if (periodSalary) {
            accr.periodSalaryID = periodSalary.ID
          }
          const flagsAdd = (accr.flagsRec & 1 << 12 ? 1 << 17 : 0) | (accr.flagsRec & 1 << 13)
          accr.flagsRec = 1 << 16 | flagsAdd
          cont.emp[cont.employeeNumberID].accrual.push(Object.assign({}, accr))
        })
        /* accrualFund.forEach(accr => {
          const periodCalc = cont.periods.find(o => o.dateFrom.getTime() === accr.periodCalc.getTime())
          if (periodCalc) {
            accr.periodCalcID = periodCalc.ID
          }
          const periodSalary = cont.periods.find(o => o.dateFrom.getTime() === accr.periodSalary.getTime())
          if (periodSalary) {
            accr.periodSalaryID = periodSalary.ID
          }
          cont.emp[cont.employeeNumberID].accrualFund.push(Object.assign({}, accr))
        }) */
      })
    }

    const pos = _.findLast(cont.emp[cont.employeeNumberID].prop.employeePositions, o => o.dateFrom <= currentPeriod.dateTo) || {}
    const params = {
      employeeNumberID: cont.employeeNumberID,
      payElID: payEl.ID,
      flagsRec: 0,
      mtCount: (pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1)
    }
    params.dateFrom = currentPeriod.dateFrom
    params.dateTo = currentPeriod.dateTo
    params.baseDate = dateService.firstDayOfMonth(dateService.addMonths(currentPeriod.dateTo, 1))
    const orderCalcParams = {
      avgOnDate: params.baseDate,
      dateFrom: params.baseDate,
      dateTo: params.baseDate,
      orgID: cont.orgID,
      periodCalcID: cont.periodCalc.ID,
      employeeNumberID: cont.employeeNumberID,
      payElID: payEl.ID,
      flagsFix: 0,
      flagsRec: 0,
      dayAccumCondition: payEl.method.dayAccumCondition || 'noDaysOff'
    }
    if (payEl.isParentEmployeeNumber) {
      employeeService.recalcEmpStartWork(cont.employeeNumberID, cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom, cont)
    }
    if (employeeNumber.dateTo > currentPeriod.dateTo) {
      const resultCalculate = averageService.calculateAverage({
        orgID,
        cont,
        params: orderCalcParams,
        excludeHolidays: false,
        checkContinuation: true
      })
      if (!resultCalculate && orderCalcParams.avgCalcType === 'FACT') {
        orderCalcParams.avgCalcType = 'PLAN'
        orderCalcParams.accrualDt = []
      }
      orderCalcParams.dateFrom = currentPeriod.dateTo
      if (!resultCalculate && orderCalcParams.avgCalcType === 'PLAN') {
        averageService.calculateAveragePlan({
          orgID,
          cont,
          params: orderCalcParams,
          periodCalc: currentPeriod,
          onDate: params.baseDate,
          excludeHolidays: false,
          daysMode: 1
        })
      }
    }
    params.baseSum = payEl.roundAvgUpTo ? accrualService.roundPayEl(orderCalcParams.baseSum || 0, payEl.roundAvgUpTo) : accrualService.round(orderCalcParams.baseSum || 0, 2)
    if (orderCalcParams.avgDt) {
      params.calcSum = orderCalcParams.avgDt.baseSum
      params.avgDays = orderCalcParams.avgDt.days
    }
    params.rate = 0
    payFund.forEach(fund => {
      if ((fund.payFundCategory.find(o => o.dictCategoryECBID === pos.dictCategoryECBID)) &&
        fund.payFundBase.find(o => o.payElBaseID === payEl.ID)
      ) {
        const ecbRate = cont.dict.hr_dictRateTaxECB.find(o => o.dictTypeTaxECBID === fund.typeTaxECBID && o.dateFrom <= currentPeriod.dateTo &&
          o.dateTo >= currentPeriod.dateFrom)
        params.rate = ecbRate ? ecbRate.rate : 0
        params.payFundID = fund.ID
        params['payFundID.description'] = fund.description
      }
    })
    if (!employeeNumber.days) {
      employeeNumber.days = 0
    }
    params.inventSum = (employeeNumber.dateTo > currentPeriod.dateTo) ? accrualService.round(params.baseSum * employeeNumber.days) : 0
    params.inventAccruedSum = accrualService.round(params.inventSum / 100 * params.rate)
    params.invAccrualDt = JSON.stringify(postingService.getAccrualDt({
      cont,
      sourceAccr: {},
      params: {
        flagsFix: 0,
        dateFrom: currentPeriod.dateFrom,
        dateTo: currentPeriod.dateTo,
        payElID: payEl.ID,
        paySum: params.inventSum
      } }))
    params.inventAccruedSumDt = JSON.parse(params.invAccrualDt)
    params.inventAccruedSumDt.forEach(acc => {
      acc.payElID = payEl.ID
      acc.baseSum = acc.paySum
      acc.sourceSum = acc.paySum
    })
    params.inventAccruedSumDt = algorithmService.calcGroupSumAccrualFundDt(params.inventAccruedSumDt, params.inventAccruedSum)
    params.inventAccruedSumDt = JSON.stringify(params.inventAccruedSumDt)
    if (employeeNumber.dateTo > currentPeriod.dateTo) {
      orderRegistryDtRL.push({
        tabNum: employeeNumber.tabNum,
        'employeeNumberID.description': cont.emp[cont.employeeNumberID].prop.employeeNumber.description,
        'employeeNumberID.dateFrom': cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom,
        'employeeNumberID.dateToEmpty': cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo.getFullYear() !== 9999
          ? cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo : null,
        employeeNumberID: cont.employeeNumberID,
        periodCalcID: currentPeriod.ID,
        periodCalc: currentPeriod.dateFrom,
        periodSalaryID: currentPeriod.ID,
        periodSalary: currentPeriod.dateFrom,
        dateFrom: currentPeriod.dateFrom,
        dateTo: currentPeriod.dateTo,
        flagsFix: 0,
        flagsRec: 0,
        mask: 0,
        calcSum: params.calcSum || 0,
        avgDays: params.avgDays || 0,
        baseSum: params.baseSum,
        calendarDays: employeeNumber.days,
        paySum: params.inventSum,
        rate: params.rate,
        accruedSum: params.inventAccruedSum,
        posName: employeeNumber.posName,
        depName: employeeNumber.depName,
        accrualDt: params.invAccrualDt,
        accrualAddDt: params.inventAccruedSumDt
      })
    }
    // Розрахунок донарахування резерву
    params.accruedSum = 0
    params.usedSum = 0
    params.drAccrualDt = JSON.parse(params.invAccrualDt)
    cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
      if (!(331776 & acc.flagsRec) && acc.periodCalc >= periodFromAvg.dateFrom && acc.periodCalc <= currentPeriod.dateFrom) {
        if (payElAccrualReserve.find(o => o.payElBaseID === acc.payElID)) {
          params.accruedSum = accrualService.round(params.accruedSum + acc.paySum)
          acc.accrualDt && acc.accrualDt.forEach(dt => {
            delete dt.ID
            delete dt.accrualID
            dt.paySum *= -1
            params.drAccrualDt.push(Object.assign({}, dt))
          })
        }
        if (payElUseReserve.find(o => o.payElBaseID === acc.payElID)) {
          params.usedSum = accrualService.round(params.usedSum + acc.paySum)
          acc.accrualDt && acc.accrualDt.forEach(dt => {
            delete dt.ID
            delete dt.accrualID
            params.drAccrualDt.push(Object.assign({}, dt))
          })
        }
      }
    })
    const balanceVacation = balanceVacations.filter(o => o.employeeNumberID === cont.employeeNumberID && o.payElID === payEl.ID)
    params.sumFrom = balanceVacation.reduce((sum, row) => {
      if (row.accrualDt) {
        JSON.parse(row.accrualDt).forEach(dt => {
          delete dt.ID
          delete dt.accrualID
          dt.paySum *= -1
          params.drAccrualDt.push(Object.assign({}, dt))
        })
      }
      return sum + (row.sumFrom || 0)
    }, 0)
    params.sumTo = (params.sumFrom + params.accruedSum - params.usedSum)
    params.paySum = accrualService.round(params.inventSum - params.sumTo)
    orderRegistryDtRD.push({
      tabNum: employeeNumber.tabNum,
      'employeeNumberID.description': cont.emp[cont.employeeNumberID].prop.employeeNumber.description,
      'employeeNumberID.dateFrom': cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom,
      'employeeNumberID.dateToEmpty': cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo.getFullYear() !== 9999
        ? cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo : null,
      employeeNumberID: cont.employeeNumberID,
      periodCalcID: currentPeriod.ID,
      periodCalc: currentPeriod.dateFrom,
      periodSalaryID: currentPeriod.ID,
      periodSalary: currentPeriod.dateFrom,
      dateFrom: currentPeriod.dateFrom,
      dateTo: currentPeriod.dateTo,
      flagsFix: 0,
      flagsRec: 0,
      mask: 0,
      payElID: payEl.ID,
      'payElID.description': payEl.description,
      sumFrom: params.sumFrom,
      accruedSum: params.accruedSum,
      usedSum: params.usedSum,
      sumTo: params.sumTo,
      baseSum: params.inventSum,
      paySum: params.paySum,
      posName: employeeNumber.posName,
      depName: employeeNumber.depName,
      accrualDt: JSON.stringify(algorithmService.correctAccrualDt(params.drAccrualDt, params.paySum)),
      accrualAddDt: params.invAccrualDt
    })

    // Розрахунок донарахування нарахування на резерв
    if (params.payFundID) {
      params.accruedSum = 0
      params.usedSum = 0
      params.dnAccrualDt = JSON.parse(params.inventAccruedSumDt)
      cont.emp[cont.employeeNumberID].accrualFund.forEach(acc => {
        if (acc.periodCalc >= periodFromAvg.dateFrom && acc.periodCalc <= currentPeriod.dateFrom) {
          if (payFundAccrReserveIDs.includes(acc.payFundID)) {
            params.accruedSum = accrualService.round(params.accruedSum + acc.paySum)
            acc.accrualFundDt && acc.accrualFundDt.forEach(dt => {
              delete dt.ID
              delete dt.accrualID
              dt.payElID = payEl.ID
              dt.paySum *= -1
              dt.baseSum *= -1
              dt.sourceSum *= -1
              params.dnAccrualDt.push(Object.assign({}, dt))
            })
          }
          if (payFundUseReserveIDs.includes(acc.payFundID)) {
            params.usedSum = accrualService.round(params.usedSum + acc.paySum)
            acc.accrualFundDt && acc.accrualFundDt.forEach(dt => {
              delete dt.ID
              delete dt.accrualID
              dt.payElID = payEl.ID
              params.dnAccrualDt.push(Object.assign({}, dt))
            })
          }
        }
      })
      const balanceVacationFund = balanceVacations.filter(o => o.employeeNumberID === cont.employeeNumberID && o.payFundID)
      params.sumFrom = balanceVacationFund.reduce((sum, row) => {
        if (row.accrualDt) {
          JSON.parse(row.accrualDt).forEach(dt => {
            delete dt.ID
            delete dt.accrualID
            dt.paySum *= -1
            dt.baseSum = -1 * (dt.baseSum || 0)
            dt.sourceSum = -1 * (dt.baseSum || 0)
            params.dnAccrualDt.push(Object.assign({}, dt))
          })
        }
        return sum + (row.sumFrom || 0)
      }, 0)
      params.sumTo = (params.sumFrom + params.accruedSum - params.usedSum)
      params.calcSum = params.paySum
      params.paySum = accrualService.round(params.inventAccruedSum - params.sumTo)
      params.dnAccrualDt = algorithmService.calcGroupSumAccrualFundDt(params.dnAccrualDt, params.paySum)
      orderRegistryDtRD.push({
        tabNum: employeeNumber.tabNum,
        'employeeNumberID.description': cont.emp[cont.employeeNumberID].prop.employeeNumber.description,
        employeeNumberID: cont.employeeNumberID,
        periodCalcID: currentPeriod.ID,
        periodCalc: currentPeriod.dateFrom,
        periodSalaryID: currentPeriod.ID,
        periodSalary: currentPeriod.dateFrom,
        dateFrom: currentPeriod.dateFrom,
        dateTo: currentPeriod.dateTo,
        flagsFix: 0,
        flagsRec: 0,
        mask: 0,
        payFundID: params.payFundID || null,
        'payFundID.description': params['payFundID.description'] || null,
        rate: params.rate,
        sumFrom: params.sumFrom,
        accruedSum: params.accruedSum,
        usedSum: params.usedSum,
        sumTo: params.sumTo,
        calcSum: params.calcSum,
        baseSum: params.inventAccruedSum,
        paySum: params.paySum,
        posName: employeeNumber.posName,
        depName: employeeNumber.depName,
        accrualDt: JSON.stringify(algorithmService.correctAccrualDt(params.dnAccrualDt, params.paySum)),
        accrualAddDt: params.inventAccruedSumDt
      })
    }
    delete cont.emp[cont.employeeNumberID]
  })
  return { orderRegistryDtRL, orderRegistryDtRD }
}
