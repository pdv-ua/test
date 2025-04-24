const _ = require('lodash')
const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const calendarService = require('../../HR/modules/calendarService')
const accrualService = require('../../HR/modules/accrualService')
const experienceService = require('../../HR/modules/experienceService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const employeeService = require('../../HR/modules/employeeService')

module.exports = {
  getCalendarDaysByPeriod, // Кількість календарних днів
  getPlanDaysByTimeSheet, // Кількість планових оплачуваних днів та кількість планових відпрацьованих днів
  getPayTimeByTimeCost, // Кількість оплачуваних днів/годин за маскою виключаючи елементи обліку робочого часу
  getPayTimeByPlanTimeCost, // Кількість оплачуваних днів/годин за маскою виключаючи елементи обліку робочого часу по плану
  getTimeByLeadingAccrual, // Дані часу за провідною системою оплати
  getTimeByTimeSheet, // Дані часу з табеля
  getTimeForMinSum, // Дані часу з табеля Доплата до мінімальної суми
  getTimeByAccrual, // Дані часу з розрахункового листа
  getTimeByTimeSheetOvertime, // Дані часу з табеля для переробітку
  getPayTimeByPayEl, // Дані часу по виду оплати і масці
  getPlanSum, // Розрахунок планової суми на дату за вказаною системою оплати
  getFactForPlanSum, // Розрахунок фактичної суми при розрахунку планової суми
  getFactSum, // Розрахунок фактичної суми по списку видів оплати,
  getFactSumForAvg, // Розрахунок фактичної суми по списку видів оплати для розрахунку середнього
  getFactSumFund, // Розрахунок фактичної суми по списку видів оплати Нарахування на зарплату ЄСВ,
  getChangePayPeriod, // Періоди зміни нарахувань
  getChangeSalaryByPeriod, // Періоди зміни окладу
  getChangePayPeriodWithLeading, // Періоди зміни нарахувань з зміною призначення
  getExpiriencePeriods, // Періоди підвищення відсока по стажу
  getExpirience, // Відсоток по стажу
  getRateExperienceByYears,
  getRateExperienceByMonths,
  getFillMaskByPeriod,
  calcGroupSumAccrualDt,
  calcGroupSumAccrualPaymentDt,
  correctAccrualDt,
  calcGroupSumAccrualFundDt,
  correctAccrualFundDt,
  getFactTimeByTimeSheet,
  getPlanTimeByTimeSheet,
  sumAccrualDtByDictFundSource,
  getPlanTime, // розрахунок планового часу за період згідно розкладу роботи
  getPlanTimeByTimeCost, // розрахунок планового часу за період згідно розкладу роботи з урахуванням виключень
  getSumSecJobs, // Заробіток внутрішнього сумісника по виду оплати
  getPlanSumByPeriod, // Плановий середній заробіток за період
  getTimeSheetByPeriod, // Дані табеля за період
  getTimeSheetByPeriodLoad, // Дані табеля за період вибірка з бд
  getPayTimeForAvg, // розрахунок часу для середнього
  getFactSumForSickness, // Розрахунок фактичної суми по списку видів оплати для розрахунку середнього для лікарняних
  getTaxIndividAcc, // Розрахунок сум по видам доходу,
  getChangeCategoryECBByPeriods,
  getDaysByMethod, // Кількість днів за методом розрахунку та таблицею входження виду оплати
  calcHoursByDays, // Масив годин по дням пропорційно до загальної кількості годин
  getAccrualDtByTariffing,
  getLastPosition, // Останнє призначення за період
  groupAccrualDt,
  getAccumDaysByPeriod,
  getEmpCalcProportion,
  getPayElByOrderDtID,
  getAccrualForPayFSS
}


//pdv 15.07.24
function getEmpCalcProportion(cont,payElID) {
  // const type = UB.Repository('hr_employeePosition')
  // .attrs(['payElID.calcproportion'])
  // .where('employeeNumberID', '=', cont.employeeNumberID)
  // .where('dateFrom', '<=', onDate)
  // .where('dateTo', '>=', onDate)
  // .selectAsObject({'payElID.calcproportion': 'type'});
  //if (cont.emp[cont.employeeNumberID].calcProportion) return cont.emp[cont.employeeNumberID].calcProportion
  return cont.payEl[payElID].calcProportion
}
// end 

//pdv 15.07.24
function getPayElByOrderDtID(orderDtID) {
  const payElReq = UB.Repository('hr_orderRegistryDt')
    .attrs(['orderRegistryID.payElID'])
    .where('ID','=', orderDtID)
    .selectAsObject({'orderRegistryID.payElID':'ID'})

return payElReq.length?payElReq[0]:null;
}
// end 


function getCalendarDaysByPeriod (dateFrom, dateTo, excludeHolidays = true, orgID) {
  let days = 0
  const holidays = excludeHolidays ? calendarService.getHolidays(dateFrom, dateTo, orgID) : []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    if (!holidays.find(o => o.getTime() === date.getTime())) {
      days++
    }
    date = dateService.addDays(date, 1)
  }
  return days
}

function getPlanDaysByTimeSheet ({ dateFrom, dateTo, startWork, finishWork, timeSheets, perDateFrom, perDateTo, typeCalcTime }) {
  const result = {
    planDays: 0,
    workDays: 0,
    perDays: 0,
    minPlanDays: 0,
    minWorkDays: 0
  }
  let date = dateService.shiftDate(dateFrom)
  if (typeCalcTime !== 'TYPEALL') {
    for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
      const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
      if ((!typeCalcTime || typeCalcTime === 'TYPEWORK')) {
        if (timeSheetDay && timeSheetDay.planTimeCostType === 'WORK') {
          const dateWork = dateService.shiftDate(timeSheetDay.dateWork)
          if (startWork <= dateWork && finishWork >= dateWork) {
            result.planDays++
          }
          if (startWork <= dateWork && finishWork >= dateWork && perDateFrom <= dateWork && perDateTo >= dateWork) {
            result.workDays++
          }
          if (perDateFrom <= dateWork && perDateTo >= dateWork) {
            result.perDays++
          }
        }
        result.minPlanDays++
        if (perDateFrom <= date && perDateTo >= date && startWork <= date && finishWork >= date) {
          result.minWorkDays++
        }
      } else {
        if (startWork <= date && finishWork >= date) {
          result.planDays++
          result.minPlanDays++
        }
        if (perDateFrom <= date && perDateTo >= date) {
          result.perDays++
        }
        if (perDateFrom <= date && perDateTo >= date && startWork <= date && finishWork >= date) {
          result.workDays++
          result.minWorkDays++
        }
      }
      date = dateService.addDays(date, 1)
    }
  }
  if (typeCalcTime === 'TYPEALL' || (result.planDays === 0 && result.workDays === 0 && result.perDays === 0)) {
    return {
      planDays: 1,
      workDays: 1,
      perDays: 1,
      minPlanDays: 1,
      minWorkDays: 1
    }
  } else {
    return result
  }
}

/**
 * @param mask
 * @param dateFrom
 * @param dateTo
 * @param hourAttr
 * @param payElTimeCost
 * @param excludeHolidays
 * @param timeSheets
 * @param dayAverageCondition
 * @param orgID
 * @returns {{days: number, hours: number, mask: number}}
 */
function getPayTimeByTimeCost (mask, dateFrom, dateTo, hourAttr, payElTimeCost = [], excludeHolidays, timeSheets, dayAverageCondition, orgID) {
  const result = {
    days: 0,
    hours: 0,
    mask: 0
  }
  const onlyWorkDays = dayAverageCondition && !(dayAverageCondition === 'calend') && !(dayAverageCondition === 'noHolidays')
  const timeCostType = dayAverageCondition === 'norma' ? 'normTimeCostType' : dayAverageCondition === 'plan' ? 'planTimeCostType' : 'factTimeCostType'
  const timeCostAttr = dayAverageCondition === 'norma' ? 'normTimeCostID' : dayAverageCondition === 'plan' ? 'planTimeCostID' : 'factTimeCostID'
  const holidays = !onlyWorkDays && (excludeHolidays || dayAverageCondition === 'noHolidays') ? calendarService.getHolidays(dateFrom, dateTo, orgID) : []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
    if (timeSheetDay && (mask & 1 << (date.getDate() - 1)) &&
      !holidays.find(o => o.getTime() === date.getTime()) &&
      ((!onlyWorkDays && !payElTimeCost.find(o => o.dictTimeCostID === timeSheetDay.factTimeCostID &&
        o.dateFrom <= date && o.dateTo >= date)) ||
        (onlyWorkDays && timeSheetDay[timeCostType] === 'WORK' &&
          !payElTimeCost.find(o => o.dictTimeCostID === timeSheetDay[timeCostAttr] && o.dateFrom <= date && o.dateTo >= date)))) {
      result.days++
      result.mask = result.mask | 1 << (date.getDate() - 1)
      result.hours += timeSheetDay[hourAttr]
    }
    date = dateService.addDays(date, 1)
  }
  return result
}

function getPayTimeForAvg ({ mask, dateFrom, dateTo, hourAttr, payEl, dayAverageCondition, calcEarnings, timeSheets = [], plans = [], holiday, orgID, cont }) {
  const result = {
    days: 0,
    hours: 0,
    mask: 0
  }
  const payElTimeCost = payEl.payElTimeCost
  const holidays = dayAverageCondition === 'noHolidays' ? (holiday || calendarService.getHolidays(dateFrom, dateTo, orgID)) : []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    let timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
    if (timeSheetDay && cont && cont.constants && cont.constants['hrAccrualAvgCalcTimeDate'] && date < cont.constants['hrAccrualAvgCalcTimeDate']) {
      timeSheetDay = null
    }
    const planDay = plans.find(o => o.dayDate.getTime() === date.getTime())
    const timeCostAttr = (hourAttr === 'normHour' || hourAttr === 'planHour' || dayAverageCondition === 'plan') ? 'planTimeCostID' : 'factTimeCostID'
    const timeCostType = dayAverageCondition === 'plan' ? 'planTimeCostType' : 'factTimeCostType'

    let isInclude = (mask & 1 << (date.getDate() - 1)) && !holidays.find(o => o.getTime() === date.getTime())
    if (isInclude && timeSheetDay && payElTimeCost.find(o => o.dictTimeCostID === timeSheetDay[timeCostAttr])) isInclude = false
    if (isInclude && dayAverageCondition === 'work') {
      if (calcEarnings === 'DAYNORM') {
        if (!timeSheetDay || (timeSheetDay && !(['WORK', 'FREE'].includes(timeSheetDay.factTimeCostType) && timeSheetDay.planTimeCostType === 'WORK'))) {
          isInclude = false
        }
      } else {
        if (!timeSheetDay || (timeSheetDay && ((!timeSheetDay.isDayAsPlan && timeSheetDay[timeCostType] !== 'WORK') ||
          (timeSheetDay.isDayAsPlan && !(['WORK', 'FREE'].includes(timeSheetDay.factTimeCostType) && timeSheetDay.planTimeCostType === 'WORK'))
        ))) isInclude = false
      }
    }
    if (isInclude && dayAverageCondition === 'plan' && ((timeSheetDay && timeSheetDay[timeCostType] !== 'WORK') ||
      (!timeSheetDay && planDay && planDay['timeCostType'] !== 'WORK'))) isInclude = false

    if (isInclude && dayAverageCondition === 'plan' && planDay && payElTimeCost.find(o => o.dictTimeCostID === planDay['dictTimeCostID'])) isInclude = false
    if (isInclude) {
      result.days++
      result.mask = result.mask | 1 << (date.getDate() - 1)
      result.hours += timeSheetDay ? timeSheetDay[hourAttr] : (planDay ? planDay['workHours'] : 0)
    }
    date = dateService.addDays(date, 1)
  }
  return result
}

function getPayTimeByPlanTimeCost (mask, dateFrom, dateTo, hourAttr, payElTimeCost = [], excludeHolidays, timeSheets, orgID) {
  const result = {
    days: 0,
    hours: 0,
    mask: 0
  }
  const holidays = excludeHolidays ? calendarService.getHolidays(dateFrom, dateTo, orgID) : []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
    if (timeSheetDay && (mask & 1 << (date.getDate() - 1)) &&
      !holidays.find(o => o.getTime() === date.getTime()) &&
      !payElTimeCost.find(o => o.dictTimeCostID === timeSheetDay.planTimeCostID && o.dateFrom <= date && o.dateTo >= date)) {
      result.days++
      result.mask = result.mask | 1 << (date.getDate() - 1)
      result.hours += timeSheetDay[hourAttr]
    }
    date = dateService.addDays(date, 1)
  }
  return result
}

function getTimeByLeadingAccrual (cont, payElID, accr, dateFrom, dateTo, moreNorm = false, workSchedule) {
  const result = {
    days: 0,
    hours: 0,
    planDays: 0,
    planHours: 0,
    mask: 0,
    hoursByDays: {},
    planHoursByDays: {},
    fullTime: true
  }
  if (moreNorm && workSchedule && workSchedule.isSummarized) {
    return result
  }
  const baseTime = cont.payEl[payElID].method.code === '9' || cont.payEl[payElID].payElEntryTime.find(e => cont.payEl[e.payElBaseID].method.code === '138' && e.dateFrom <= dateTo && e.dateTo >= dateFrom)
  let addMask = 0
  const payElEntryTime = []
  cont.payEl[payElID].payElEntryTime.forEach(row => {
    if (row.payElBaseID !== accr.payElID && cont.payEl[row.payElBaseID].method.groupCode !== 1 && row.dateFrom <= dateTo && row.dateTo >= dateFrom) {
      payElEntryTime.push(row.payElBaseID)
    }
  })
  const isOvertime = workSchedule ? workSchedule.isOvertime : 0
  let date = dateService.shiftDate(dateFrom)
  let hoursByDays = baseTime
    ? (accr.leadingHoursByDays ? (typeof accr.leadingHoursByDays === 'string' ? JSON.parse(accr.leadingHoursByDays) : Object.assign({}, accr.leadingHoursByDays)) : null)
    : (accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : Object.assign({}, accr.hoursByDays)) : null)
  let planHoursByDays = accr.planHoursByDays ? (typeof accr.planHoursByDays === 'string' ? JSON.parse(accr.planHoursByDays) : Object.assign({}, accr.planHoursByDays)) : null
  const timeSheets = getTimeSheetByPeriod(cont.periods.find(o => o.ID === accr.periodSalaryID), cont)
  if (!hoursByDays || !planHoursByDays || moreNorm || baseTime) {
    const payTime = getTimeByTimeSheet({ cont, payElID: accr.payElID, timeSheets, dateFrom, dateTo, isSummarized: workSchedule && workSchedule.isSummarized })
    result.fullTime = payTime.fullTime
    if (!hoursByDays || moreNorm || baseTime) {
      hoursByDays = baseTime ? payTime.leadingHoursByDays : payTime.hoursByDays || null
    }
    if (!planHoursByDays || moreNorm || baseTime) {
      planHoursByDays = payTime.planHoursByDays || null
    }
    if (accr.flagsRec & 8) {
      if (!accr.planHours && !(accr.flagsFix & 32)) {
        accr.planHours = payTime.planHours
      }
      if (!accr.planDays && !(accr.flagsFix & 16)) {
        accr.planDays = payTime.planDays
      }
    }
  }

  if (payElEntryTime.length) {
    cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
      if (acc.periodSalaryID === accr.periodSalaryID && payElEntryTime.includes(acc.payElID) &&
        !(acc.flagsRec & 1 << 10) && !(acc.flagsRec & 1 << 12) && !(acc.flagsRec & 1 << 9)) {
        let mask = acc.mask
        let maskAdd = acc.maskAdd || 0
        cont.emp[cont.employeeNumberID].accrual.forEach(rev => {
          if (rev.linkToParentID === acc.ID && rev.flagsRec & 1 << 9 && !(rev.flagsRec & 1 << 12)) {
            mask = mask & ~rev.mask
            maskAdd = maskAdd & ~rev.maskAdd
          }
        })
        addMask = addMask | (mask & ~maskAdd)
      }
    })
  }

  const avgHours = hoursByDays ? 0 : accrualService.round((accr.hours || 0) / (accr.days || 1), 2)
  result.planHours = accr.planHours
  result.planHoursByDays = planHoursByDays
  result.planDays = accr.planDays
  let dopDayCount = 0
  let dopHoursCount = 0

  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
    const dopDay = addMask & 1 << (day - 1)
    let addDays = hoursByDays
      ? ((timeSheetDay && timeSheetDay.isDayAsPlan && !moreNorm) ? (planHoursByDays[String(day)] > 0 ? 1 : 0)
        : (hoursByDays[String(day)] > 0 ? (moreNorm ? (result.planHoursByDays[String(day)] > 0 && hoursByDays[String(day)] !== result.planHoursByDays[String(day)] && isOvertime ? 1 : 0) : 1) : 0))
      : ((accr.mask & 1 << (day - 1)) && !(accr.maskAdd & 1 << (day - 1))) ? 1 : 0
    if (!((accr.mask & 1 << (day - 1)) && !(accr.maskAdd & 1 << (day - 1))) && dopDay/* && !moreNorm */) {
      dopDayCount++
      addDays = 1
    }
    result.days += addDays
    let addHours = moreNorm
      ? ((result.planHoursByDays[String(day)] > 0 && hoursByDays[String(day)] > 0 && hoursByDays[String(day)] !== result.planHoursByDays[String(day)] && isOvertime)
        ? hoursByDays[String(day)] - result.planHoursByDays[String(day)]
        : 0)
      : (hoursByDays
        ? (hoursByDays[String(day)] || 0)
        : ((accr.mask & 1 << (day - 1)) && !(accr.maskAdd & 1 << (day - 1))) ? avgHours : 0)
    if (!addHours && dopDay && !moreNorm) {
      addHours = timeSheetDay ? (timeSheetDay.factHour || 0) : 0
      dopHoursCount += addHours
    }
    result.hours += addHours
    result.hoursByDays[String(day)] = addHours
    if (moreNorm
      ? result.planHoursByDays[String(day)] > 0 && result.hoursByDays[String(day)] > 0
      : ((hoursByDays
        ? hoursByDays[String(day)] > 0
        : ((accr.mask & 1 << (day - 1)) && !(accr.maskAdd & 1 << (day - 1)))) || dopDay)
    ) {
      result.mask = result.mask | 1 << (day - 1)
    }
    date = dateService.addDays(date, 1)
  }
  if (result.days > (accr.days + dopDayCount)) {
    result.days = accr.days + dopDayCount
  }
  result.hours = accrualService.round(result.hours, 2)
  result.fullTime = (workSchedule && workSchedule.isDayAsPlan) ? true : (result.fullTime && result.hours === (accr.hours + dopHoursCount) && result.days === (accr.days + dopDayCount))
  return result
}

function getTimeForMinSum ({ cont, payElID, timeSheets, dateFrom, dateTo, isCorrection = false, payElTimeCostNot, useTimeSheetBy = 'NORMA' }) {
  const planAttrName = useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'
  const result = {
    days: 0,
    hours: 0,
    planDays: dateService.dayDiff(dateFrom, dateTo) + 1,
    planHours: 0,
    mask: 0,
    hoursByDays: {},
    planHoursByDays: {},
    leadingHoursByDays: {},
    fullTime: !isCorrection,
    overtimePlan: 0,
    overtimeFact: 0
  }
  if (!payElTimeCostNot) {
    payElTimeCostNot = cont.payEl[payElID].payElTimeCostNot
  }
  timeSheets.forEach(row => {
    let dateWork = dateService.shiftDate(row.dateWork)
    result.planHoursByDays[String(dateWork.getDate())] = row[`${planAttrName}Hour`]
    if (!payElTimeCostNot.find(o => o.dictTimeCostID === row.factTimeCostID)) {
      result.days++
      result.mask = result.mask | 1 << (dateWork.getDate() - 1)
      result.hoursByDays[String(dateWork.getDate())] = !row.isFactHour ? row[`${planAttrName}Hour`] : row.factHour
    } else {
      result.hoursByDays[String(dateWork.getDate())] = 0
    }
  })
  return result
}
/**
 *
 * @param cont
 * @param payElID
 * @param timeSheets
 * @param dateFrom
 * @param dateTo
 * @param isCorrection
 * @param isSummarized
 * @param payElTimeCost
 * @param useIsFactHour
 * @returns {{days: number, hours: number, planDays: number, planHours: number, mask: number, fullTime: boolean}}
 */
function getTimeByTimeSheet ({ cont, payElID, timeSheets, dateFrom, dateTo, isCorrection = false, isSummarized, payElTimeCost, useIsFactHour, payElTimeCostNot, planByNorm = false, maxOvertime = false, payDownTime = false, useTimeSheetBy }) {
  const result = {
    days: 0,
    hours: 0,
    planDays: 0,
    planHours: 0,
    mask: 0,
    hoursByDays: {},
    planHoursByDays: {},
    leadingHoursByDays: {},
    fullTime: !isCorrection,
    overtimePlan: 0,
    overtimeFact: 0
  }
  let byTimeCost = true
  const planAttrName = (useTimeSheetBy || cont.payEl[payElID].useTimeSheetBy) === 'PLAN' ? 'plan' : 'norm'
  //const byHour = cont.payEl[payElID].calcProportion === 'HOUR'
  const pos = getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, dateFrom, dateTo)
  const byHour = (pos && pos.payElID && cont.payEl[pos.payElID]?cont.payEl[pos.payElID].calcProportion:cont.payEl[payElID].calcProportion) === 'HOUR'
  if (!payElTimeCostNot) {
    payElTimeCostNot = cont.payEl[payElID].payElTimeCostNot
  }
  if (!payElTimeCost) {
    payElTimeCost = []
    if (cont.payEl[payElID].payElTimeCost.length) {
      payElTimeCost.push(...cont.payEl[payElID].payElTimeCost)
    } else {
      if (cont.payEl[payElID].payElEntryTime.length) {
        byTimeCost = false
        if (!cont.emp[cont.employeeNumberID].accrual) {
          cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, cont.employeeNumberID, dateService.firstDayOfMonth(dateFrom))
        }
      } else {
        cont.payEl[payElID].payElEntryTime.forEach(elEntry => {
          if (cont.payEl[elEntry.payElBaseID].payElTimeCost.length) {
            payElTimeCost.push(...cont.payEl[elEntry.payElBaseID].payElTimeCost)
          }
          if (cont.payEl[elEntry.payElBaseID].dictTimeCostID) {
            payElTimeCost.push({
              dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostID,
              dateFrom: elEntry.dateFrom,
              dateTo: elEntry.dateTo
            })
          }
          if (cont.payEl[elEntry.payElBaseID].dictTimeCostWorkID) {
            payElTimeCost.push({
              dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostWorkID,
              dateFrom: elEntry.dateFrom,
              dateTo: elEntry.dateTo
            })
          }
          if (cont.payEl[elEntry.payElBaseID].dictTimeCostAvgID) {
            payElTimeCost.push({
              dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostAvgID,
              dateFrom: elEntry.dateFrom,
              dateTo: elEntry.dateTo
            })
          }
        })
      }
    }
  }
  let addDay = false
  timeSheets.forEach(row => {
    let dateWork = dateService.shiftDate(row.dateWork)
    result.planHours += row[`${planAttrName}Hour`]
    result.planHoursByDays[String(dateWork.getDate())] = row[`${planAttrName}Hour`]
    result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
    let factHour = payDownTime ? (row.factHourPlus || 0) : ((useIsFactHour && !row.isFactHour) ? row[`${planAttrName}Hour`] : row.factHour)
    if (isSummarized && dateWork >= dateFrom && dateWork <= dateTo && ['WORK', 'FREE'].includes(row.factTimeCostType)) {
      result.overtimePlan = result.overtimePlan + (row[`${planAttrName}Hour`] || 0)
      result.overtimeFact = result.overtimeFact + (factHour || 0)
    }
    if (byTimeCost) {
      addDay = (!payElTimeCostNot.length ||
        !payElTimeCostNot.find(o => o.dictTimeCostID === row[row.isDayAsPlan ? `planTimeCostID` : 'factTimeCostID'] && o.dateFrom <= dateWork && o.dateTo >= dateWork))
        ? (payElTimeCost.length ? payElTimeCost.find(o =>
          ((row.isDayAsPlan) ||
            (!row.isDayAsPlan && o.dictTimeCostID === row.factTimeCostID)) && o.dateFrom <= dateWork && o.dateTo >= dateWork) : true) : false
    } else {
      addDay = cont.emp[cont.employeeNumberID].accrual.find(o => (cont.payEl[o.payElID].method.groupCode === 1 || cont.payEl[o.payElID].method.groupCode === 3)
        && o.dateFrom <= dateWork && o.dateTo >= dateWork
        && (!(o.mask) || (o.mask & 1 << (dateWork.getDate() - 1)))
        && cont.payEl[payElID].payElEntryTime.find(e => e.dateFrom <= dateWork && e.dateTo >= dateWork)
      )
    }
      
    if (addDay && dateWork >= dateFrom && dateWork <= dateTo) {
      if (!isCorrection || (isCorrection && row.isCorrection && row.periodID === cont.periodCalc.ID)) {
        if (planByNorm && /* planAttrName === 'norm' && */ row[`${planAttrName}MonthDay`] && row[`${planAttrName}MonthHour`]) {
          result.normMonthDay = row[`${planAttrName}MonthDay`]
          result.normMonthHour = row[`${planAttrName}MonthHour`]
        }
        const dayCount = payDownTime ? (factHour > 0 ? 1 : 0)
          : byTimeCost ? (
            row.isDayAsPlan
              ? (payElTimeCost.length
                ? ((row.planTimeCostType === 'WORK' && payElTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID) && !payElTimeCostNot.find(o => o.dictTimeCostID === row.factTimeCostID)) ? 1 : 0)
                : (['WORK', 'FREE'].includes(row.factTimeCostType) && row.planTimeCostType === 'WORK') ? 1 : 0)
              : (payElTimeCost.length ? (row.factTimeCostType !== 'FREE' ? 1 : 0) : (row.factTimeCostType === 'WORK' ? 1 : 0))
          ) : (factHour > 0 ? 1 : 0)

        result.days += dayCount
        if (payDownTime) {
          result.hours += factHour
        } else if (dayCount || (row.isDayAsPlan && payElTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID) && !payElTimeCostNot.find(o => o.dictTimeCostID === row.factTimeCostID))) {
          result.hours += factHour
        }
        result.hoursByDays[String(dateWork.getDate())] = (dayCount || (row.isDayAsPlan && payElTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID) && !payElTimeCostNot.find(o => o.dictTimeCostID === row.factTimeCostID))) ? factHour : 0
        if (dayCount && row.planTimeCostType === 'WORK' && factHour !== row[`${planAttrName}Hour`] && !row.isDayAsPlan) {
          result.fullTime = false
        }
        if ((dayCount && !row.isDayAsPlan) || (row.isDayAsPlan && ((byHour && factHour) || (!byHour && dayCount)))) {
          result.mask = result.mask | 1 << (dateWork.getDate() - 1)
        }
      }
    } else {
      result.hoursByDays[String(dateWork.getDate())] = 0
    }
  })
  result.leadingHoursByDays = Object.assign({}, result.hoursByDays)
  if (isSummarized && !isCorrection) {
    result.overtime = maxOvertime === true ? accrualService.round(result.overtimeFact - result.overtimePlan, 3)
      : accrualService.round(Math.max(0, result.overtimeFact - Math.min(result.overtimeFact, result.overtimePlan)), 3)
    if (typeof maxOvertime === 'number') {
      result.overtime = Math.min(result.overtime, maxOvertime)
    }
    if (result.overtime > 0) {
      let hours = result.hours
      let hourSum = 0
      let corrDay
      result.hours = Math.max(result.hours - result.overtime, 0)
      Object.keys(result.hoursByDays).forEach(dayNum => {
        if (result.hoursByDays[dayNum] > 0) {
          if (!corrDay) {
            corrDay = dayNum
          }
          result.hoursByDays[dayNum] = accrualService.round(result.hoursByDays[dayNum] / hours * result.hours)
          hourSum = hourSum + result.hoursByDays[dayNum]
        }
      })
      if (hourSum !== result.hours && corrDay) {
        result.hoursByDays[corrDay] = accrualService.round(result.hoursByDays[corrDay] + result.hours - hourSum)
      }
    }
  }

  result.hours = accrualService.round(result.hours, 4)
  result.planHours = accrualService.round(result.planHours, 4)
  if (planByNorm && planAttrName === 'norm' && result.normMonthDay && result.normMonthHour) {
    result.planDays = result.normMonthDay
    result.planHours = result.normMonthHour
  }

  return result
}

/**
 *
 * @param cont
 * @param payElID
 * @param dateFrom
 * @param dateTo
 * @returns {{days: number, hours: number, planDays: number, planHours: number, mask: number, fullTime: boolean}}
 */

function getTimeByAccrual (cont, payElID, timeSheets, dateFrom, dateTo) {
  const result = {
    days: 0,
    hours: 0,
    planDays: 0,
    planHours: 0,
    mask: 0,
    hoursByDays: {},
    planHoursByDays: {},
    fullTime: true
  }
  const fillMask = getFillMaskByPeriod(dateFrom, dateTo)
  if (!cont.emp[cont.employeeNumberID].accrual) {
    cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, cont.employeeNumberID, dateService.firstDayOfMonth(dateFrom))
  }

  //add pdv 12.09.24
  //add sort 12.09.24
  // Время считается по первому посадовому месту

  const empList =[]
  
  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber.mainEmpNumberID) {
    let empListTmp = Object.keys(cont.emp).map(numberIDD => cont.emp[numberIDD])
      .filter(e =>e.prop && e.prop.employeeNumber && e.prop.employeeNumber.empWorkPlace === "5" 
      && e.accrual && e.accrual.length 
      //&& e.salaryAccrual && e.salaryAccrual.length 
      &&
      (e.prop.timeSheets
        ? e.prop.timeSheets.filter(o => o.dateWork >= dateFrom && o.dateWork <= dateTo && (!o.employeeNumberID || o.employeeNumberID === e.prop.employeeNumber.ID))
        : []).length)
              //.map(e => e.employeeNumberPartID)
      .sort((a,b) => (a && a.prop && a.prop.employeeNumber?a.prop.employeeNumber.tabNumSort:9999) - (b && b.prop && b.prop.employeeNumber?b.prop.employeeNumber.tabNumSort:9999))
    
    //Не нашли посадовое место то загружаем посадовые
    if (!empListTmp || !empListTmp.length) {
      cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
        if (!(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 16) && !(accr.flagsRec & 1 << 17) &&
          accr.dateFrom <= dateTo && accr.dateTo >= dateFrom && cont.payEl[payElID].payElEntryTime.find(o => o.payElBaseID === accr.payElID) 
          ) {
            if (accr.employeeNumberPartID && !cont.emp[accr.employeeNumberPartID]) {
              cont.emp[accr.employeeNumberPartID] = {}
              cont.emp[accr.employeeNumberPartID].prop = employeeService.getEmpData(accr.employeeNumberPartID, dateFrom, dateTo, null, cont)
              cont.emp[accr.employeeNumberPartID].accrual = accrualService.getAccrual(cont.orgID, accr.employeeNumberPartID, dateService.firstDayOfMonth(dateFrom))
            }  
            //  cont.emp[accr.employeeNumberPartID].accrual.push(accr)
            //  cont.emp[accr.employeeNumberPartID].salaryAccrual = cont.emp[cont.employeeNumberID].salaryAccrual
            //cont.emp[accr.employeeNumberPartID]
          }
      })

      empListTmp = Object.keys(cont.emp).map(numberIDD => cont.emp[numberIDD])
      .filter(e =>e.prop && e.prop.employeeNumber && e.prop.employeeNumber.empWorkPlace === "5" 
      && e.accrual && e.accrual.length && 
      //e.salaryAccrual && e.salaryAccrual.length &&
      (e.prop.timeSheets
        ? e.prop.timeSheets.filter(o => o.dateWork >= dateFrom && o.dateWork <= dateTo && (!o.employeeNumberID || o.employeeNumberID === e.prop.employeeNumber.ID))
        : []).length)
              //.map(e => e.employeeNumberPartID)
      .sort((a,b) => (a && a.prop && a.prop.employeeNumber?a.prop.employeeNumber.tabNumSort:9999) - (b && b.prop && b.prop.employeeNumber?b.prop.employeeNumber.tabNumSort:9999))

    }
    empListTmp.forEach(e => {
      e.accrual.filter(sa => sa.dateFrom <= dateTo && sa.dateTo >= dateFrom && cont.payEl[payElID].payElEntryTime.find(o => o.payElBaseID === sa.payElID)).forEach(sa => {
        if (!empList.length || empList[empList.length-1].dateTo < sa.dateFrom)
          //|| empList.map(e => e.mtCount).reduce((partialSum, a) => partialSum + a, 0)<1) 
          empList.push(sa)
      })    
    })

    //if (!empList.length&&empListTmp.length) empList.push({employeeNumberID: empListTmp['0'].prop.employeeNumber.ID})
  } //else {
   // empList.push({employeeNumberID: cont.employeeNumberID})
  //}
  ///
  const accruals = []
  if (empList.length) {
    empList.forEach(accr => {
        if (!(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 16) && !(accr.flagsRec & 1 << 17) &&
          accr.dateFrom <= dateTo && accr.dateTo >= dateFrom && cont.payEl[payElID].payElEntryTime.find(o => o.payElBaseID === accr.payElID) 
          ) {accruals.push(accr)}
      })
  } else {
    cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
      if (!(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 16) && !(accr.flagsRec & 1 << 17) &&
        accr.dateFrom <= dateTo && accr.dateTo >= dateFrom && cont.payEl[payElID].payElEntryTime.find(o => o.payElBaseID === accr.payElID) 
        ) {
          accruals.push(accr)
        }
    })
  }
  accruals.sort((a, b) => cont.payEl[a.payElID].method.groupCode - cont.payEl[b.payElID].method.groupCode).forEach(accr => {
    const reversal = cont.emp[accr.employeeNumberID].accrual.filter(o => o.linkToParentID === accr.ID && (o.flagsRec & 1 << 9))
    if (accr.flagsRec & 1 << 5 || (accr.flagsRec & 1 << 3 && 
      cont.payEl[accr.payElID].calcProportion === 'HOUR')) {
      result.fullTime = false
    }
    const accrSalaryPeriod = cont.periods.find(o => o.ID === accr.periodSalaryID)
    if (!accrSalaryPeriod) {
      console.log('Empty accrual period')
      console.log(cont.orgID)
      console.log(accr)
      cont.periods.forEach(p => {
        console.log(p)
      })
    }
    const timeSheets = accrSalaryPeriod ? getTimeSheetByPeriod(accrSalaryPeriod, cont) : []
    if (accr.days) {
      if (accr.mask) {
        let accrMask = accr.mask & fillMask
        let hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
        let planHoursByDays = accr.planHoursByDays ? (typeof accr.planHoursByDays === 'string' ? JSON.parse(accr.planHoursByDays) : accr.planHoursByDays) : null
        if ((!hoursByDays || !planHoursByDays) && cont.payEl[accr.payElID].method.groupCode === 1 && cont.payEl[accr.payElID].method.code !== '138') {
          const payTime = getTimeByTimeSheet({ cont,
            payElID: accr.payElID,
            timeSheets,
            dateFrom,
            dateTo,
            payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
              ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
              : null
          })
          result.fullTime = payTime.fullTime
          if (!hoursByDays) {
            hoursByDays = payTime.hoursByDays || null
          }
          if (!planHoursByDays) {
            planHoursByDays = payTime.planHoursByDays || null
          }
        }
        let accrDays = accr.days
        let accrHours = accr.hours
        if (hoursByDays) {
          let date = dateService.shiftDate(dateFrom)
          for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
            let hoursByDay = hoursByDays[String(day)]
            const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
            let dayMask = accrMask & 1 << (date.getDate() - 1)
            reversal.forEach(rev => {
              const revHoursByDays = rev.hoursByDays ? (typeof rev.hoursByDays === 'string' ? JSON.parse(rev.hoursByDays) : rev.hoursByDays) : null
              if (!revHoursByDays) {
                hoursByDay = hoursByDay - (cont.payEl[rev.payElID].method.code !== '138' && timeSheetDay && timeSheetDay.factTimeCostType === 'WORK' && timeSheetDay.factHour) ? timeSheetDay.factHour : 0
              } else {
                hoursByDay = hoursByDay - revHoursByDays[String(day)] || 0
              }
              dayMask = dayMask & ~(rev.mask & 1 << (date.getDate() - 1))
            })
            if (hoursByDay) {
              result.days = result.days + ((timeSheetDay && timeSheetDay.isDayAsPlan && (result.hoursByDays[String(day)] || 0) === 0) ? (dayMask ? 1 : 0) : ((hoursByDay > 0 ? 1 : 0) - (result.hoursByDays[String(day)] > 0 ? 1 : 0)))
              //result.hours = result.hours - (result.hoursByDays[String(day)] || 0) + (hoursByDay || 0)
              result.hours = result.hours + (hoursByDay || 0)
              result.hoursByDays[String(day)] = (result.hoursByDays[String(day)] || 0) + hoursByDay
            } else {
              result.days += (timeSheetDay && timeSheetDay.isDayAsPlan && (result.hoursByDays[String(day)] || 0) === 0) ? (dayMask ? 1 : 0) : hoursByDay > 0 ? 1 : 0
              result.hours += hoursByDay || 0
              result.hoursByDays[String(day)] = (result.hoursByDays[String(day)] || 0) + (hoursByDay || 0)
            }
            date = dateService.addDays(date, 1)
          }
        } else {
          reversal.forEach(rev => {
            const revMask = rev.mask & fillMask
            accrMask = accrMask & ~revMask
            accrDays += rev.days
            accrHours += rev.hours
          })
          const days = ((accrMask || 0).toString(2).match(/1/g) || []).length
          result.days = result.days + ((accrMask || 0).toString(2).match(/1/g) || []).length
          result.hours = accrDays === 0 ? 0 : accrualService.round(result.hours + (accrHours || 0) / accrDays * days)
        }
        if (cont.payEl[accr.payElID].method.groupCode === 1) {
          if (accr.planDays === null || accr.planHours === null) {
            const payTime = getTimeByTimeSheet({ cont,
              payElID: accr.payElID,
              timeSheets,
              dateFrom,
              dateTo,
              payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
                ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
                : null
            })
            result.planDays = Math.max(result.planDays, (payTime.planDays || accr.planDays || accr.planDays || 0))
            result.planHours = Math.max(result.planHours, (payTime.planHours || accr.planHours || accr.planHours || 0))
          } else {
            result.planDays = Math.max(result.planDays, ((accr.planDays === null ? result.days : accr.planDays) || 0))
            result.planHours = Math.max(result.planHours, ((accr.planHours === null ? result.hours : accr.planHours) || 0))
          }
          if (planHoursByDays) {
            result.planHoursByDays = planHoursByDays
          }
        }
        result.mask = result.mask | accrMask
      } else {
        result.days = result.days + (accr.days || 0)
        result.hours = result.hours + (accr.hours || 0)
        reversal.forEach(rev => {
          result.days += rev.days || 0
          result.hours += rev.hours || 0
        })
        if (cont.payEl[accr.payElID].method.groupCode === 1) {
          if (accr.planDays === null || accr.planHours === null) {
            const payTime = getTimeByTimeSheet({ cont,
              payElID: accr.payElID,
              timeSheets,
              dateFrom,
              dateTo,
              payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
                ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
                : null
            })
            result.planDays = Math.max(result.planDays, (payTime.planDays || accr.planDays || accr.planDays || 0))
            result.planHours = Math.max(result.planHours, (payTime.planHours || accr.planHours || accr.planHours || 0))
          } else {
            result.planDays = Math.max(result.planDays, ((accr.planDays === null ? result.days : accr.planDays) || 0))
            result.planHours = Math.max(result.planHours, ((accr.planHours === null ? result.hours : accr.planHours) || 0))
          }
        }
      }
    } else {
      if (accr.mask) {
        let accrMask = accr.mask & fillMask
        result.mask = result.mask | accrMask
        let hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
        let planHoursByDays = accr.planHoursByDays ? (typeof accr.planHoursByDays === 'string' ? JSON.parse(accr.planHoursByDays) : accr.planHoursByDays) : null
        if ((!hoursByDays || !planHoursByDays) && cont.payEl[accr.payElID].method.groupCode === 1 && cont.payEl[accr.payElID].method.code !== '138') {
          const payTime = getTimeByTimeSheet({ cont,
            payElID: accr.payElID,
            timeSheets,
            dateFrom,
            dateTo,
            payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
              ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
              : null
          })
          result.fullTime = payTime.fullTime
          if (!hoursByDays) {
            hoursByDays = payTime.hoursByDays || null
          }
          if (!planHoursByDays) {
            planHoursByDays = payTime.planHoursByDays || null
          }
        }
        if (hoursByDays) {
          let date = dateService.shiftDate(dateFrom)
          for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
            let hoursByDay = hoursByDays[String(day)] || 0
            reversal.forEach(rev => {
              const revHoursByDays = rev.hoursByDays ? (typeof rev.hoursByDays === 'string' ? JSON.parse(rev.hoursByDays) : rev.hoursByDays) : null
              if (!revHoursByDays) {
                const timeDay = cont.emp[accr.employeeNumberID].prop.timeSheets.find(o => o.dateWork.getTime() === date.getTime())
                hoursByDay -= (cont.payEl[rev.payElID].method.code !== '138' && timeDay && timeDay.factTimeCostType === 'WORK' && timeDay.factHour) ? timeDay.factHour : 0
              } else {
                hoursByDay -= revHoursByDays[String(day)] || 0
              }
            })
            result.hours += hoursByDay
            result.hoursByDays[String(day)] = (result.hoursByDays[String(day)] || 0) + hoursByDay
            date = dateService.addDays(date, 1)
          }
        } else {
          let hours = accr.hours
          reversal.forEach(rev => {
            hours += rev.hours || 0
          })
          result.hours = accrualService.round(result.hours + hours)
        }
        if (cont.payEl[accr.payElID].method.groupCode === 1) {
          if (accr.planDays === null || accr.planHours === null) {
            const payTime = getTimeByTimeSheet({ cont,
              payElID: accr.payElID,
              timeSheets,
              dateFrom,
              dateTo,
              payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
                ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
                : null
            })
            result.planDays = Math.max(result.planDays, (payTime.planDays || accr.planDays || accr.planDays || 0))
            result.planHours = Math.max(result.planHours, (payTime.planHours || accr.planHours || accr.planHours || 0))
          } else {
            result.planDays = Math.max(result.planDays, ((accr.planDays === null ? result.days : accr.planDays) || 0))
            result.planHours = Math.max(result.planHours, ((accr.planHours === null ? result.hours : accr.planHours) || 0))
          }
          if (planHoursByDays) {
            result.planHoursByDays = planHoursByDays
          }
        }
      } else {
        result.hours = result.hours + (accr.hours || 0)
        reversal.forEach(rev => {
          result.hours += rev.hours || 0
        })
        if (!(accr.flagsRec & 512) && cont.payEl[accr.payElID].method.groupCode === 1) {
          if (accr.planDays === null || accr.planHours === null) {
            const payTime = getTimeByTimeSheet({ cont,
              payElID: accr.payElID,
              timeSheets,
              dateFrom,
              dateTo,
              payElTimeCost: cont.payEl[accr.payElID].method.code === '21'
                ? [{ dictTimeCostID: cont.payEl[accr.payElID].dictTimeCostWorkID, dateFrom: cont.payEl[accr.payElID].dateFrom, dateTo: cont.payEl[accr.payElID].dateTo }]
                : null
            })
            result.planDays = Math.max(result.planDays, (payTime.planDays || accr.planDays || accr.planDays || 0))
            result.planHours = Math.max(result.planHours, (payTime.planHours || accr.planHours || accr.planHours || 0))
          } else {
            result.planDays = Math.max(result.planDays, ((accr.planDays === null ? result.days : accr.planDays) || 0))
            result.planHours = Math.max(result.planHours, ((accr.planHours === null ? result.hours : accr.planHours) || 0))
          }
        }
      }
    }
  })
  result.hours = accrualService.round(result.hours)
  return result
}
/**
 *
 * @param cont
 * @param payElID
 * @param timeSheets
 * @param dateFrom
 * @param dateTo
 * @param periodSummarized
 * @returns {{days: number, hours: number, planDays: number, planHours: number, mask: number, fullTime: boolean}}
 */

function getTimeByTimeSheetOvertime (cont, payElID, timeSheets, dateFrom, dateTo, periodSummarized, onDate) {
  const result = {
    planDays: 0,
    planHours: 0,
    mask: 0,
    overtime: 0,
    overtimePlan: 0, // Переробіток
    overtimeFact: 0
  }
  const planAttrName = ['PLAN'].includes(cont.payEl[payElID].useTimeSheetBy) ? 'plan' : 'norm'
  const payElTimeCost = []
  if (cont.payEl[payElID].payElTimeCost.length) {
    payElTimeCost.push(...cont.payEl[payElID].payElTimeCost)
  }
  if (periodSummarized !== 'MONTH') {
    let perDateFrom = dateService.firstDayOfYear(dateFrom)
    if (onDate) {
      perDateFrom = (periodSummarized === 'YEAR') ? dateService.firstDayOfYear(dateFrom)
        : (periodSummarized === 'HALFYEAR') ? (dateFrom.getMonth() <= 5 ? dateService.firstDayOfYear(dateFrom) : dateService.addMonths(dateService.firstDayOfYear(dateFrom), 6))
          : (periodSummarized === 'QUARTER') ? (dateFrom.getMonth() <= 2 ? dateService.firstDayOfYear(dateFrom)
            : dateFrom.getMonth() <= 5 ? dateService.addMonths(dateService.firstDayOfYear(dateFrom), 3)
              : dateFrom.getMonth() <= 8 ? dateService.addMonths(dateService.firstDayOfYear(dateFrom), 6) : dateService.addMonths(dateService.firstDayOfYear(dateFrom), 9)
          ) : dateService.addDays(dateService.lastDayOfMonth(dateFrom), 1)
      let correctDateFrom = dateService.shiftDate(perDateFrom)
      let pDate = dateService.lastDayOfMonth(dateService.shiftDate(dateFrom))
      while (pDate >= correctDateFrom) {
        const period = cont.periods.find(o => o.dateTo >= pDate && o.dateFrom <= pDate)
        const perodSheets = getTimeSheetByPeriod(period, cont)
        if (!perodSheets.find(o => o.isSummarized && o.periodSummarized === periodSummarized)) {
          correctDateFrom = dateService.addDays(pDate, 1)
        }
        pDate = dateService.addMonths(pDate, -1)
      }
      if (correctDateFrom > perDateFrom) {
        perDateFrom = correctDateFrom
      }
    } else {
      perDateFrom = (periodSummarized === 'YEAR' && [11].includes(dateFrom.getMonth())) ? dateService.firstDayOfYear(dateFrom)
        : (periodSummarized === 'HALFYEAR' && [5, 11].includes(dateFrom.getMonth())) ? dateService.firstDayOfMonth(dateService.addMonths(dateFrom, -5))
          : (periodSummarized === 'QUARTER' && [2, 5, 8, 11].includes(dateFrom.getMonth())) ? dateService.firstDayOfMonth(dateService.addMonths(dateFrom, -2))
            : dateService.addDays(dateService.lastDayOfMonth(dateFrom), 1)
    }
    const perDateTo = dateService.lastDayOfMonth(dateFrom)
    timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= perDateFrom && o.dateWork <= perDateTo && (!o.employeeNumberID || o.employeeNumberID === cont.employeeNumberID))
  }
  const planDateFrom = periodSummarized !== 'MONTH' ? dateService.firstDayOfMonth(dateFrom) : dateFrom
  const planDateTo = dateFrom ? dateService.lastDayOfMonth(dateFrom) : dateTo
  timeSheets.forEach(row => {
    if (row.dateWork >= planDateFrom && row.dateWork <= planDateTo && !result.planHours) {
      result.planHours = row[`${planAttrName}MonthHour`]
      result.planDays = row[`${planAttrName}MonthDay`]
    }
    if ((periodSummarized !== 'MONTH' || (row.dateWork >= dateFrom && row.dateWork <= dateTo)) && row.isSummarized && row.periodSummarized === periodSummarized &&
      (row.factTimeCostType === 'WORK' || row.factTimeCostType === 'FREE')
    ) {
      result.overtimePlan = result.overtimePlan + (row[`${planAttrName}Hour`] || 0)
      if (!payElTimeCost.length || payElTimeCost.find(o =>
        o.dictTimeCostID === row.factTimeCostID && o.dateFrom <= row.dateWork && o.dateTo >= row.dateWork)) {
        result.overtimeFact = result.overtimeFact + (row.factHour || 0)
      }
    }
  })

  result.planHours = accrualService.round(result.planHours, 3)
  // result.overtime = accrualService.round(Math.max(0, result.overtimeFact - Math.min(result.overtimeFact, result.overtimePlan)), 3)
  result.overtime = accrualService.round(result.overtimeFact - result.overtimePlan, 3)

  return result
}

/**
 *
 * @param cont
 * @param timeSheets
 * @param dateFrom
 * @param dateTo
 * @param payElID
 * @param partPeriod
 * @param excludeTimeCost
 * @param useTimeSheetBy
 * @returns {{days: number, hours: number, planDays: number, planHours: number, mask: number, fullTime: boolean}}
 */
function getFactTimeByTimeSheet ({ cont, timeSheets, dateFrom, dateTo, payElID, partPeriod, excludeTimeCost = [], useTimeSheetBy = 'NORMA' }) {
  const methodCode = payElID ? cont.payEl[payElID].method.code : ''
  const result = {
    days: 0,
    hours: 0,
    factHours: 0,
    planDays: 0,
    planHours: 0
  }

  const planAttrName = useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'

  const perDateFrom = partPeriod ? dateService.shiftDate(dateFrom) : dateService.firstDayOfMonth(dateFrom)
  const perDateTo = partPeriod ? dateService.shiftDate(dateTo) : dateService.lastDayOfMonth(dateTo)
  timeSheets.forEach(row => {
    if (perDateFrom <= row.dateWork && row.dateWork <= perDateTo) {
      switch (methodCode) {
        case '7': // Вечірні
          result.days += row.factHourEvening > 0 ? 1 : 0
          result.hours += row.factHourEvening || 0
          result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
          result.planHours += row[`${planAttrName}Hour`]
          break
        case '8': // Нічні
          result.days += row.factHourNight > 0 ? 1 : 0
          result.hours += row.factHourNight || 0
          result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
          result.planHours += row[`${planAttrName}Hour`]
          break
        case '153': // Шкідливі
          result.days += row.factHourHarmful > 0 ? 1 : 0
          result.hours += row.factHourHarmful || 0
          result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
          result.planHours += row[`${planAttrName}Hour`]
          break
        case '207': // Особливі
          result.days += row.factHourDop > 0 ? 1 : 0
          result.hours += row.factHourDop || 0
          result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
          result.planHours += row[`${planAttrName}Hour`]
          break
        default:
          result.days += !excludeTimeCost.includes(row.factTimeCostID) && (row.isDayAsPlan ? ['WORK', 'FREE'].includes(row.factTimeCostType) && row[`${planAttrName}TimeCostType`] === 'WORK' : row.factTimeCostType === 'WORK') ? 1 : 0
          result.hours += !excludeTimeCost.includes(row.factTimeCostID) && (row.isDayAsPlan ? ['WORK', 'FREE'].includes(row.factTimeCostType) && row[`${planAttrName}TimeCostType`] === 'WORK' : row.factTimeCostType === 'WORK') ? row.factHour : 0
          result.factHours += !excludeTimeCost.includes(row.factTimeCostID) && row.factTimeCostType === 'WORK' ? row.factHour : 0
          result.planDays += row[`${planAttrName}Hour`] > 0 ? 1 : 0
          result.planHours += row[`${planAttrName}Hour`]
      }
    }
  })
  return result
}

function getPlanTimeByTimeSheet ({ timeSheets, dateFrom, dateTo, useTimeSheetBy = 'NORMA' }) {
  const planAttrName = useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'
  const result = {
    days: 0,
    hours: 0
  }
  dateFrom = dateService.firstDayOfMonth(dateFrom)
  dateTo = dateService.lastDayOfMonth(dateTo)
  let dateWork
  timeSheets.forEach(row => {
    dateWork = dateService.shiftDate(row.dateWork)
    if (dateFrom <= dateWork && dateWork <= dateTo) {
      result.days += row[`${planAttrName}Hour`] > 0 ? 1 : 0
      result.hours += row[`${planAttrName}Hour`]
    }
  })
  return result
}

function getPayTimeByPayEl (cont, payElID, mask, timeSheets, dateFrom, dateTo, workSchedule, periodSalaryID) {
  const payEl = cont.payEl[payElID]
  const result = {
    days: 0,
    hours: 0,
    mask: 0,
    hoursByDays: {}
  }
  const isPayDayOff = workSchedule ? workSchedule.isPayDayOff : 0
  const isPayHoliday = workSchedule ? workSchedule.isPayHoliday : 0
  const isNightHours = workSchedule ? workSchedule.isNightHours : 0
  const isEveningHours = workSchedule ? workSchedule.isEveningHours : 0

  let addMask = 0
  if (payEl.method.code === '56') {
    const payElEntryTime = []
    payEl.payElEntryTime.forEach(row => {
      if (row.dateFrom <= dateTo && row.dateTo >= dateFrom) {
        payElEntryTime.push(row.payElBaseID)
      }
    })
    if (payElEntryTime.length) {
      cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
        if (acc.periodSalaryID === periodSalaryID && payElEntryTime.includes(acc.payElID) &&
          !(acc.flagsRec & 1 << 10) && !(acc.flagsRec & 1 << 12) && !(acc.flagsRec & 1 << 9)) {
          let mask = acc.mask
          let maskAdd = acc.maskAdd || 0
          cont.emp[cont.employeeNumberID].accrual.forEach(rev => {
            if (rev.linkToParentID === acc.ID && rev.flagsRec & 1 << 9 && !(rev.flagsRec & 1 << 12)) {
              mask = mask & ~rev.mask
              maskAdd = maskAdd & ~rev.maskAdd
            }
          })
          addMask = addMask | (mask & ~maskAdd)
        }
      })
    }
  }

  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
    switch (payEl.method.code) {
      case '7': // Вечірні
        if (timeSheetDay && isEveningHours && (mask & 1 << (date.getDate() - 1)) && timeSheetDay.factHourEvening > 0) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.factHourEvening
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHourEvening
        }
        break
      case '8': // Нічні
        if (timeSheetDay && isNightHours && (mask & 1 << (date.getDate() - 1)) && timeSheetDay.factHourNight > 0) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.factHourNight
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHourNight
        }
        break
      case '10': // Святковий
        if (timeSheetDay && timeSheetDay.factHour > 0 &&
          isPayHoliday &&
          timeSheetDay.factTimeCostType === 'WORK' &&
          cont.holidays.find(o => o.getTime() === date.getTime())) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.factHour
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHour
        }
        break
      case '11': // Вихідний
        if (timeSheetDay /* && (mask & 1 << (date.getDate() - 1)) && timeSheetDay.factHour > 0 */ &&
          isPayDayOff && // !timeSheetDay.normHour &&
          cont.payEl[payElID].payElTimeCost.find(o =>
            o.dictTimeCostID === timeSheetDay.factTimeCostID && o.dateFrom <= date && o.dateTo >= date) &&
          // timeSheetDay.factTimeCostType === 'WORK' &&
          (payEl.isPayInHolidays || !cont.holidays.find(o => o.getTime() === date.getTime()))
        ) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += (timeSheetDay.factHour || 0)
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHour
        }
        break
      case '56': // Доплата до повного робочого дня/тижня
        if (timeSheetDay && timeSheetDay.typeSheetChange === '2' && (addMask & 1 << (day - 1)) &&
          timeSheetDay.normHour > 0 && timeSheetDay.normHour > timeSheetDay.factHour) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.normHour - timeSheetDay.factHour
          result.hoursByDays[String(date.getDate())] = timeSheetDay.normHour - timeSheetDay.factHour
        }
        break
      case '153': // Шкідливі
        if (timeSheetDay && (mask & 1 << (date.getDate() - 1)) && timeSheetDay.factHourHarmful > 0) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.factHourHarmful
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHourHarmful
        }
        break
      case '207': // Особливі
        if (timeSheetDay && (mask & 1 << (date.getDate() - 1)) && timeSheetDay.factHourDop > 0) {
          result.days++
          result.mask = result.mask | 1 << (date.getDate() - 1)
          result.hours += timeSheetDay.factHourDop
          result.hoursByDays[String(date.getDate())] = timeSheetDay.factHourDop
        }
        break
    }

    date = dateService.addDays(date, 1)
  }
  return result
}

function getFillMaskByPeriod (dateFrom, dateTo) {
  return dateService.shiftDate(dateFrom) <= dateService.shiftDate(dateTo)
    ? parseInt(''.padStart((dateService.shiftDate(dateFrom)).getDate() - 1, '0').padStart((dateService.shiftDate(dateTo)).getDate(), '1'), 2)
    : 0
}

/**
 *
 * @param {Date} onDate
 * @param {*} cont
 * @param {object<payElID, dateTo, dateFrom, rate>} permanentAccrual
 * @param salaryAccrual
 * @param permanentAccruals Array of permanentAccrual
 * @param includePayEl
 * @param calcPayEl
 * @param withPercent
 * @param payTime
 * @param payElEntryMinSum
 * @param payElEntryPlanSum
 * @param onlyAutoCalc
 * @returns {number}
 */
function getPlanSum (onDate, cont, permanentAccrual, salaryAccrual = {}, permanentAccruals, includePayEl, calcPayEl = [], withPercent = false, payTime, payElEntryMinSum = false, payElEntryPlanSum = false, onlyAutoCalc = false) {
  let planSum = 0
  const calcPayEls = []
  let timeKoef = 1
  // const useTariffing = cont.emp[cont.employeeNumberID].prop.useTariffing
  let accrualSum = 0
  // if (!useTariffing) {
  // При використанні тарифікації суми системи оплати у ЛС нема, розрахунок планової суми потрібно виконувати від сум тарифікації
  accrualSum = salaryAccrual.baseSum || salaryAccrual.accrualSum || 0
  if (!accrualSum) {
    const curPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
    if (curPos && curPos.accrualSum) {
      accrualSum = curPos.accrualSum
    }
  }
  // }
  
  let staying = settingsService.get('STAYING',cont.orgID);
  if (cont.payEl[permanentAccrual.payElID].method.code === '137' && staying===true) {
    //const eee = payEl900.find(e => e.code === '0900');
    const workpace = UB.Repository('trf_workPlace')
    .attrs(['*'])
    .where('employeeNumberID', '=', cont.employeeNumberID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('state','eq','POSTED')
    .orderByDesc('dateFrom')
    .selectAsObject();
    
    let accrualSum_

    if (workpace) {

      workpace.forEach(e => {
      const position = UB.Repository('trf_position')
      .attrs(['*'])
      .where('workPlaceID', '=', e.ID)
      .selectAsObject();
      if (position) {
        const tarr = UB.Repository('trf_accrual')
        .attrs(['*'])
        .where('positionID', '=', position[0].ID)
        .selectAsObject();

       if (tarr) {
        //accrualSum = tarr.find(e => cont.payEl[e.payElID].code === '0900').accrualSum;
        const ta = tarr.find(e => cont.payEl[e.payElID].code === '0900');
        if (ta && !accrualSum_) accrualSum_ = ta.accrualSum;        
       }
      }
      })
      if (accrualSum_) accrualSum = accrualSum_
    }
    
  }


  if (!permanentAccruals) {
    permanentAccruals = accrualService.getPermanentAccrual(cont.orgID, cont.employeeNumberID, cont, { dateFrom: onDate, dateTo: onDate })
  }
  calcPayEls.push(...calcPayEl)
  let rate = permanentAccrual.rate
  if (permanentAccrual.baseSum) {
    if (includePayEl) {
      includePayEl.push({
        payElID: permanentAccrual.payElID,
        paySum: permanentAccrual.baseSum
      })
    }
    return permanentAccrual.baseSum
  }

  if (cont.payEl[permanentAccrual.payElID].method.code === '5') {
    const salaryRank = cont.emp[cont.employeeNumberID].prop.salaryRank.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
    if (includePayEl) {
      includePayEl.push({
        payElID: permanentAccrual.payElID,
        paySum: salaryRank ? salaryRank.paySum : 0
      })
    }
    return salaryRank ? salaryRank.paySum : 0
  }
  if (!rate && cont.payEl[permanentAccrual.payElID].method.code === '6') {
    const experience = getExpiriencePeriods(cont, permanentAccrual.payElID, onDate, onDate)
    if (experience.length) {
      rate = experience[0].rate
    }
  }

  if (cont.payEl[permanentAccrual.payElID].method.code === '24' && cont.payEl[permanentAccrual.payElID].calcSumType !== 'FACT') {
    const lastPosition = getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, onDate, onDate)
    const baseDate = (lastPosition && lastPosition.raiseSalary) ? dateService.shiftDate(lastPosition.raiseSalary) : null
    const firstDayOfMonth = dateService.firstDayOfMonth(onDate)
    if (baseDate && !(firstDayOfMonth <= baseDate && dateService.lastDayOfMonth(onDate) >= baseDate)) {
      let koef = 1
      let date = dateService.addMonths(dateService.shiftDate(baseDate), 1)
      let subIndex = 1
      const salaryDateFrom = dateService.addMonths(firstDayOfMonth, -1)
      while (date < salaryDateFrom) {
        const indexSalary = cont.dict.hr_dictIndexSalary.find(o => date >= o.dateFrom)
        if (indexSalary) {
          subIndex = subIndex * indexSalary.indexValue / 100
        }
        if (subIndex > 1.03) {
          koef = accrualService.round(koef * subIndex, 3)
          subIndex = 1
        }
        date = dateService.addMonths(date, 1)
      }
      rate = accrualService.round((koef - 1) * 100, 1)
    }
  }

  if (salaryAccrual.payElID && cont.payEl[salaryAccrual.payElID] && cont.payEl[salaryAccrual.payElID].method.code === '2') {
    const df = dateService.firstDayOfMonth(onDate)
    const dt = dateService.lastDayOfMonth(onDate)
    if (!payTime) {
      const timeSheets = getTimeSheetByPeriod(cont.periods.find(o => o.dateFrom <= onDate && o.dateTo >= onDate), cont)
      payTime = getFactTimeByTimeSheet({ cont, timeSheets, dateFrom: df, dateTo: dt, useTimeSheetBy: cont.payEl[salaryAccrual.payElID].useTimeSheetBy })
    }
    const pos = getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, df, dt);
    accrualSum = (/*cont.payEl[salaryAccrual.payElID].calcProportion*/cont.payEl[pos.payElID].calcProportion === 'HOUR' ? (payTime.planHours || payTime.hours) : (payTime.planDays || payTime.days)) * accrualSum
  }

  if (calcPayEls.find(o => o === permanentAccrual.payElID)) {
    return planSum
  }
  calcPayEls.push(permanentAccrual.payElID)
  let payElEntry = cont.payEl[permanentAccrual.payElID][payElEntryPlanSum ? (cont.payEl[permanentAccrual.payElID].payElEntryPlanSum.length ? 'payElEntryPlanSum' : 'payElEntrySum') : (payElEntryMinSum ? 'payElEntryMinSum' : 'payElEntrySum')]
    .filter(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (onlyAutoCalc) {
    payElEntry = payElEntry.filter(o => cont.payEl[o.payElBaseID].isAutoCalc)
  }

//add 2437 by pdv 02.07.2024 
if(cont.payEl[permanentAccrual.payElID].code === '2437' && payElEntry && payElEntry.length) {
  const tariffingAccruals = UB.Repository('trf_accrual')
  .attrs(['positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.workPlaceID.employeeNumberID',
    'payElID', 'payElID.methodID.code', 'positionID.workPlaceID.dateFrom', 'positionID.workPlaceID.dateTo', 'accrualSum', 'rate',
    'positionID.workPlaceID', 'positionID.dictFundSourceID', 'baseSum', 'flagsFix', 'accrualRate',
    'positionID.workNormID', 'positionID.workNormID.weekHours', 'hours', 'positionID.dictProgClassID', 'positionID.dictPositionID',
    'positionID.posIndex'
  ])
  .where('positionID.workPlaceID.employeeNumberID', 'in', cont.employeeNumberID)
  // .where('[employeeNumberID.dateFrom]=[dateFrom]', 'custom')
  .where('positionID.workPlaceID.state', '=', 'POSTED')
  .where('positionID.workPlaceID.documentID.type', '=', 'FACT')
  .where('positionID.workPlaceID.dateFrom', '<=', onDate)
  .where('positionID.workPlaceID.dateTo', '>=', onDate)
  .where('payElID.methodID.methodGroupID.code', 'in', ['1', '2'])
  .orderBy('positionID.workPlaceID.employeeNumberID')
  .orderBy('positionID.workPlaceID.dateFrom')
  .orderBy('payElID')
  .selectAsObject({
    'positionID': 'ID',
    'positionID.workPlaceID.employeeNumberID.employeeID': 'employeeID',
    'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
    'positionID.workPlaceID.dateFrom': 'dateFrom',
    'positionID.workPlaceID.dateTo': 'dateTo',
    'positionID.workPlaceID': 'groupID',
    'payElID.methodID.code': 'methodCode',
    'positionID.dictFundSourceID': 'dictFundSourceID',
    'positionID.dictRankID': 'dictRankID',
    'accrualRate': 'mtCount',
    'accrualSum': 'paySum',
    'positionID.workNormID': 'workNormID',
    'positionID.workNormID.weekHours': 'weekHours',
    'hours': 'loadHours',
    'positionID.dictProgClassID': 'dictProgClassID',
    'positionID.dictPositionID': 'dictPositionID',
    'positionID.posIndex': 'posIndex'
  });
  planSum = 0;
  if (tariffingAccruals&&tariffingAccruals.length) {
    payElEntry.forEach(el => {
    let a = tariffingAccruals.find(e => e.payElID === el.payElBaseID);
    if (a)  planSum += a.paySum
  }) 
  } else 
    if (cont.emp[cont.employeeNumberID].prop.tariffingAccruals&&cont.emp[cont.employeeNumberID].prop.tariffingAccruals.length&&permanentAccruals) {
      payElEntry.forEach(el => {
        let a = permanentAccruals.find(e => e.payElID === el.payElBaseID);
        if (a)  planSum += a.paySum
      })
    }
  return planSum;
}
//

if (payElEntry.find(o => o.payElBaseID === salaryAccrual.payElID)) {
  if (includePayEl) {
    includePayEl.push({
      payElID: salaryAccrual.payElID,
      paySum: accrualSum / (withPercent ? 100 * rate : 1)
    })
  }
  planSum += accrualSum
}

  if (['7', '8', '153', '207'].includes(cont.payEl[permanentAccrual.payElID].method.code) && !permanentAccrual.fromExtraPay) {
    const df = dateService.firstDayOfMonth(onDate)
    const dt = dateService.lastDayOfMonth(onDate)
    const timeSheets = getTimeSheetByPeriod(cont.periods.find(o => o.dateFrom <= onDate && o.dateTo >= onDate), cont)
    payTime = getFactTimeByTimeSheet({ cont, timeSheets, dateFrom: df, dateTo: dt, payElID: permanentAccrual.payElID, useTimeSheetBy: cont.payEl[permanentAccrual.payElID].useTimeSheetBy })
    timeKoef = (payTime.planHours > 0 && payTime.hours > 0) ? payTime.hours / payTime.planHours : 0
    if (timeKoef === 0) {
      return 0
    }
  }

  permanentAccruals.forEach(perAccr => {
    const payEl = cont.payEl[perAccr.payElID]
    if (payEl.method.groupType === 'PAYMENT' &&
      (![1, 6, 7, 8, 9].includes(payEl.method.groupCode) || ['24'].includes(payEl.method.code) || perAccr.source === 'trf_accrual') &&
      !['9', '10', '11', '50', '56', '66', '138'].includes(payEl.method.code) &&
      permanentAccrual.payElID !== payEl.ID &&
      perAccr.dateFrom <= permanentAccrual.dateTo &&
      perAccr.dateTo >= permanentAccrual.dateFrom &&
      perAccr.dateFrom <= onDate &&
      perAccr.dateTo >= onDate &&
      !calcPayEls.find(o => o === payEl.ID) &&
      payElEntry.find(o => o.payElBaseID === payEl.ID) &&
      // Плановий заробіток розраховується тільки по нарахуванням основної посади тарифікації posIndex === '1'
      (perAccr.source !== 'trf_accrual')) {
      const sum = getPlanSum(onDate, cont, perAccr, salaryAccrual, permanentAccruals, null, calcPayEls, true)
      planSum += sum
      if (includePayEl && sum > 0) {
        includePayEl.push({
          payElID: payEl.ID,
          paySum: sum
        })
      }
    }
  })
  if (cont.payEl[permanentAccrual.payElID].method.code === '6' && permanentAccrual.limitSum) {
    planSum = Math.min(permanentAccrual.limitSum, planSum)
  }
  if (withPercent) {
    if (cont.payEl[permanentAccrual.payElID].method.code === '24' && cont.payEl[permanentAccrual.payElID].calcSumType !== 'FACT') {
      const livingCost = cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= onDate)
      if (livingCost && livingCost.workingPerson) {
        planSum = Math.min(planSum, livingCost.workingPerson)
      }
      planSum = planSum * timeKoef / 100 * (rate || 0)
    } else {
      planSum = planSum * timeKoef / 100 * (rate || 0)
    }
  }

  return planSum
}
function getHoursByTimeSheet (cont, period, payElID, mask) {
  let hours = 0
  let payElTimeCost = []
  let byTimeCost = true
  if (cont.payEl[payElID].payElTimeCost.length) {
    payElTimeCost = cont.payEl[payElID].payElTimeCost
  } else {
    if (cont.payEl[payElID].payElEntryTime.length) {
      byTimeCost = false
      if (!cont.emp[cont.employeeNumberID].accrual) {
        cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, cont.employeeNumberID, dateService.firstDayOfMonth(period.dateFrom))
      }
    } else {
      cont.payEl[payElID].payElEntryTime.forEach(elEntry => {
        if (cont.payEl[elEntry.payElBaseID].payElTimeCost.length) {
          payElTimeCost.push(...cont.payEl[elEntry.payElBaseID].payElTimeCost)
        }
      })
    }
  }
  let addDay = false
  const timeSheets = getTimeSheetByPeriod(period, cont)
  timeSheets.forEach(row => {
    if (mask & 1 << (row.dateWork.getDate() - 1)) {
      if (byTimeCost) {
        addDay = payElTimeCost.length ? payElTimeCost.find(o =>
          o.dictTimeCostID === row.factTimeCostID && o.dateFrom <= row.dateWork && o.dateTo >= row.dateWork) : true
      } else {
        addDay = cont.emp[cont.employeeNumberID].accrual.find(o => cont.payEl[o.payElID].method.groupCode === 1 &&
          o.dateFrom <= row.dateWork && o.dateTo >= row.dateWork &&
          (o.mask & 1 << (row.dateWork.getDate() - 1)) &&
          cont.payEl[payElID].payElEntryTime.find(e => e.payElBaseID === o.payElID && e.dateFrom <= row.dateWork && e.dateTo >= row.dateWork))
      }
      if (addDay) {
        hours += row.factHour
      }
    }
  })
  return accrualService.round(hours, 2)
}
function getFactForPlanSum ({ cont, payElID, periodCalc, periodSalary, dateFrom, dateTo, payElBase }) {
  let factSum = 0
  if (!payElBase) {
    payElBase = cont.payEl[payElID].payElEntrySum.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom && [6, 7, 8, 9].includes(cont.payEl[o.payElBaseID].method.groupCode))
  }
  if (payElBase.length) {
    factSum = getFactSum({
      cont,
      payElID,
      periodCalc,
      periodSalary,
      dateFrom,
      dateTo,
      payElBase
    })
  }
  return factSum
}

//// Add pdv 13.12.24
// Расчет 27 код Военный сбор меняем на Обліковій період
// добавлен periodCalcMain - период за который идет расчет
function getFactSum ({ withDetail, cont, payElID, periodCalc, periodSalary, dateFrom, dateTo, payElBase, periodType,
  fillMask, periodOnly, withIncludPayEl, withPayElID, groupType, dictFundSourceList, dictProgClassList, dictProjectList,
  sourceID, payElExclude, finishWork, trfPositionID, periodCalcMain }) {
  let factSum = 0
  let paySum = 0
  const factDetail = []
  const includPayEl = []
  const includeSecondJobs = payElID && (cont.payEl[payElID].includeSecondJobs || cont.payEl[payElID].method.code === '26')
  if (!periodType) {
    periodType = cont.payEl[payElID].periodType
  }

  // Add pdv 13.12.24
  // Расчет 27 код Военный сбор меняем на Обліковій період
  //if (payElID && cont.payEl[payElID].method.code === '27' && periodCalc.dateFrom>=dateService.shiftDate('2024-12-01')) {
  //   periodType = 'SALARY'
  //}
  // end
  if ([2, 5].includes(payElID && cont.payEl[payElID].method.groupCode)) {
    periodType = 'SALARY'
  }
  if (!fillMask || fillMask === 0) {
    fillMask = getFillMaskByPeriod(dateFrom, dateTo)
  }
  if (!payElBase) {
    payElBase = cont.payEl[payElID].payElEntrySum.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
  }
  const isParentEmpInclude = payElID ? cont.payEl[payElID].isParentEmployeeNumber : false
  if (periodType === 'SALARY') {
    factSum = cont.emp[cont.employeeNumberID].accrual.reduce((sum, accr) => {
      if (accr.periodSalaryID === periodSalary.ID &&
        (!periodOnly || accr.periodCalcID === periodOnly.ID) && (!(accr.flagsRec & 1 << 12) || includeSecondJobs) &&
        (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) && ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        (!groupType || groupType.includes(cont.payEl[accr.payElID].method.groupType)) &&
        (!sourceID || !(accr.flagsRec & 1 << 15) || accr.sourceID === sourceID) &&
        (accr.mask || (accr.dateFrom <= dateTo && accr.dateTo >= dateFrom)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && (!finishWork || finishWork >= accr.periodCalc || (!payElExclude || !payElExclude.find(o => o.payElBaseID === accr.payElID))) &&
        ((accr.source !== 'trf_accrual') || !trfPositionID || (accr.trfPositionID === trfPositionID))
      ) {
        const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
        let baseElMask = getFillMaskByPeriod(
          dateService.shiftDate(Math.max(dateFrom, elBase.dateFrom ? dateService.shiftDate(elBase.dateFrom) : dateFrom)),
          dateService.shiftDate(Math.min(dateTo, elBase.dateTo ? dateService.shiftDate(elBase.dateTo) : dateTo))
        )
        if (periodSalary.ID === accr.periodSalaryID) {
          baseElMask = baseElMask & fillMask
        }
        const accrMask = (accr.mask
          ? accr.mask
          : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
            dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
        let mask = accrMask & baseElMask
        let accrPaySum = accr.paySum
        if (dictFundSourceList || dictProgClassList || dictProjectList) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accrPaySum = 0
            accr.accrualDt.forEach(accDt => {
              accrPaySum += ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID))) ? accDt.paySum : 0
            })
          } else {
            accrPaySum = 0
          }
        }

        if ((accrMask & baseElMask) === accrMask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum
        } else if (!accr.mask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / periodSalary.dateTo.getDate() * (dateService.dayDiff(dateFrom, dateTo) + 1)
        } else {
          let calcProportionHours = false
          if (accr.flagsRec & 1 << 3) {
            const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
            if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
              calcProportionHours = true
            }
          }
          if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
            let date = dateService.shiftDate(dateFrom)
            let factHour = 0
            const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
            if (hoursByDays) {
              for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                if (hoursByDays[String(day)] > 0) {
                  factHour += hoursByDays[String(day)]
                }
                date = dateService.addDays(date, 1)
              }
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              if (cont.payEl[accr.payElID].method.groupCode === 1) {
                factHour = getHoursByTimeSheet(cont, periodSalary, accr.payElID, mask)
              } else {
                let payDays = (mask.toString(2).match(/1/g) || []).length
                factHour = Math.abs(accr.hours) / accrDays * payDays
              }
            }
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / Math.abs(accr.hours) * factHour
          } else {
            let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
            let payDays = (mask.toString(2).match(/1/g) || []).length
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / accrDays * payDays
          }
        }
        paySum = accrualService.round(paySum, 2)
        sum += paySum
        if (paySum !== 0 || accr.paySum === 0) {
          if (withIncludPayEl) {
            includPayEl.push(Object.assign(Object.assign({}, accr), { paySum: paySum }))
          }
          if (withDetail && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                  (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                  (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID))) {
                  const dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * ((paySum === accrPaySum || accrPaySum === 0) ? 1 : (paySum / accrPaySum)), 2)
                  factDetail.push(Object.assign(Object.assign(Object.assign({}, accDt),
                    { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
                }
              })
            } else {
              factDetail.push(Object.assign({ paySum: paySum || 0 }, withPayElID ? {
                payElID: accr.payElID,
                sourceSum: paySum
              } : {},
              {
                dictFundSourceID: accr.dictFundSourceID,
                dictProjectID: accr.dictProjectID,
                dictProgClassID: accr.dictProgClassID,
                dictPositionID: accr.dictPositionID
              }))
            }
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  } else {
    // periodCalcMain передается при расчете Военного сбора (частный случай - начиная с декабря 24 года, за предыдущие периоды)
   if (!periodCalcMain) {
    factSum = cont.emp[cont.employeeNumberID].accrual.reduce((sum, accr) => {
      if ((accr.periodCalcID === periodCalc.ID || 
        // Add pdv расчет отпускных 
        (accr.periodSalaryID === periodSalary.ID && payElID && cont.payEl[payElID].method.code === '27' && accr.periodCalc<dateService.shiftDate('2024-12-01') && accr.periodCalc<accr.periodSalary && accr.periodSalary>=dateService.shiftDate('2024-12-01'))) 
        && (!periodOnly || accr.periodSalaryID === periodOnly.ID) &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) &&
        (!groupType || groupType.includes(cont.payEl[accr.payElID].method.groupType)) &&
        (!sourceID || !(accr.flagsRec & 1 << 15) || accr.sourceID === sourceID) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && (!finishWork || finishWork >= accr.periodCalc || (!payElExclude || !payElExclude.find(o => o.payElBaseID === accr.payElID))) &&
        ((accr.source !== 'trf_accrual') || !trfPositionID || (accr.trfPositionID === trfPositionID))
        //pdv exclude Разова премия
        && (!cont.skipMethodCodes || !cont.skipMethodCodes.includes(cont.payEl[accr.payElID].method.code))
      ) {
        const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
        const accPeriod = cont.org.orgPeriods.find(o => o.ID === accr.periodSalaryID) || { dateFrom, dateTo }
        
        // add pdv 14.12.24 расчет Военного сбоа
        if (payElID && cont.payEl[payElID].method.code === '27') {
          const recalcOld = periodCalc.dateFrom>=dateService.shiftDate('2024-12-01') && accPeriod.dateTo<dateService.shiftDate('2024-12-01')
          let el = cont.payEl[accr.payElID]
          // Проверяем по документу (Документу нарахувань) не является ли данный вид начислений исключениями
          if (recalcOld && (!['3','68'].includes(el.method.code) || (cont.orgID ===3000021657431 && el.method.code === '68')))  {
              if (el.method.code === '68') return accrualService.round(sum, 2);
              let fel = accr.orderDtID?getPayElByOrderDtID(accr.orderDtID):null
              if (!fel || !fel.ID || !['3'].includes(cont.payEl[fel.ID].method.code)) {
                //если не замена исключаем из расчета 
                if (fel && fel.ID && cont.payEl[fel.ID].method.code === '68') {
                  if (orgID === 3000021657431) return accrualService.round(sum, 2);
                } else { 
                  return accrualService.round(sum, 2);
                }
              }  
          } 
          const recalcf = accr.periodCalc<dateService.shiftDate('2024-12-01') && accr.periodCalc<accr.periodSalary && accr.periodSalary>=dateService.shiftDate('2024-12-01')
          if (recalcf) {
            let eee = cont.payEl[accr.payElID]
          }
        }
       //pdv without 150
       // if (payElID && cont.payEl[payElID].method.code === '27') {
       //  const recalcOld = periodCalc.dateFrom>=dateService.shiftDate('2024-12-01') && accPeriod.dateTo<dateService.shiftDate('2024-12-01')
       //  if (recalcOld) return accrualService.round(sum, 2);
       // }

        let baseElMask = getFillMaskByPeriod(
          dateService.shiftDate(Math.max(accPeriod.dateFrom, (elBase.dateFrom && accr.periodSalaryID === periodCalc.ID) ? dateService.shiftDate(elBase.dateFrom) : accPeriod.dateFrom)),
          dateService.shiftDate(Math.min(accPeriod.dateTo, (elBase.dateTo && accr.periodSalaryID === periodCalc.ID) ? dateService.shiftDate(elBase.dateTo) : accPeriod.dateTo))
        )
        if (periodSalary.ID === accr.periodSalaryID) {
          baseElMask = baseElMask & fillMask
        }
        const accrMask = (accr.mask
          ? accr.mask
          : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
            dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
        let mask = accrMask & baseElMask
        let accrPaySum = accr.paySum
        if (dictFundSourceList || dictProgClassList || dictProjectList) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accrPaySum = 0
            accr.accrualDt.forEach(accDt => {
              accrPaySum += ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID)))
                ? accDt.paySum : 0
            })
          } else {
            accrPaySum = 0
          }
        }
        if ((accrMask & baseElMask) === accrMask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum
        } else if (!accr.mask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / accPeriod.dateTo.getDate() * (dateService.dayDiff(dateFrom, dateTo) + 1)
        } else {
          let calcProportionHours = false
          if (accr.flagsRec & 1 << 3) {
            const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
            if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
              calcProportionHours = true
            }
          }
          if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
            let date = dateService.shiftDate(dateFrom)
            let factHour = 0
            const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
            if (hoursByDays) {
              for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                if (hoursByDays[String(day)] > 0) {
                  factHour += hoursByDays[String(day)]
                }
                date = dateService.addDays(date, 1)
              }
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              if (cont.payEl[accr.payElID].method.groupCode === 1) {
                factHour = getHoursByTimeSheet(cont, accPeriod, accr.payElID, mask)
              } else {
                let payDays = (mask.toString(2).match(/1/g) || []).length
                factHour = Math.abs(accr.hours) / accrDays * payDays
              }
            }
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / Math.abs(accr.hours) * factHour
          } else {
            let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
            let payDays = (mask.toString(2).match(/1/g) || []).length
            paySum = (accrDays) ? (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / accrDays * payDays : 0
          }
        }
        paySum = accrualService.round(paySum, 2)
        sum += paySum
        if (paySum !== 0 || accr.paySum === 0) {
          if (withIncludPayEl) {
            includPayEl.push(Object.assign(Object.assign({}, accr), { paySum: paySum }))
          }
          if (withDetail && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                  (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                  (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID))) {
                  const dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * ((paySum === accrPaySum || accrPaySum === 0) ? 1 : (paySum / accrPaySum)), 2)
                  factDetail.push(Object.assign(Object.assign(Object.assign({}, accDt),
                    { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
                }
              })
            } else {
              factDetail.push(Object.assign({ paySum: paySum || 0 }, withPayElID ? {
                payElID: accr.payElID,
                sourceSum: paySum
              } : {},
              { dictFundSourceID: accr.dictFundSourceID, dictProjectID: accr.dictProjectID, dictProgClassID: accr.dictProgClassID, dictPositionID: accr.dictPositionID }))
            }
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
   } else {
    //add pdv -передан основной период расчета
    //// Расчет 27 код Военный сбор меняем на Обліковій період
    factSum = cont.emp[cont.employeeNumberID].accrual.reduce((sum, accr) => {
      if (((accr.periodCalcID === periodCalcMain.ID && accr.periodSalaryID === periodSalary.ID)  || 
      (accr.periodSalaryID === periodCalc.ID && accr.periodSalary<dateService.shiftDate('2024-12-01') && accr.periodCalc>=dateService.shiftDate('2024-12-01')) ||
      (accr.periodCalcID === periodCalc.ID && accr.periodCalc<dateService.shiftDate('2024-12-01') && accr.periodCalc<accr.periodSalary && accr.periodSalary>=dateService.shiftDate('2024-12-01')))
        && (!(accr.flagsRec & 1 << 12) || includeSecondJobs) &&
        (!groupType || groupType.includes(cont.payEl[accr.payElID].method.groupType)) &&
        (!sourceID || !(accr.flagsRec & 1 << 15) || accr.sourceID === sourceID) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && (!finishWork || finishWork >= accr.periodCalc || (!payElExclude || !payElExclude.find(o => o.payElBaseID === accr.payElID))) &&
        ((accr.source !== 'trf_accrual') || !trfPositionID || (accr.trfPositionID === trfPositionID))
        //pdv exclude Разова премия
        && (!cont.skipMethodCodes || !cont.skipMethodCodes.includes(cont.payEl[accr.payElID].method.code))
        //&& (['17','18','19','20','40','41','149'].includes(cont.payEl[accr.payElID].method.code))
        //&& (!['150'].includes(cont.payEl[accr.payElID].method.code))
        && (!['3'].includes(cont.payEl[accr.payElID].method.code)) //ЦПХ
      ) {
        const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
        const accPeriod = cont.org.orgPeriods.find(o => o.ID === accr.periodSalaryID) || { dateFrom, dateTo }
        // Мобилизация
        if (cont.payEl[accr.payElID].method.code === '68' && cont.orgID !=3000021657431 ) return accrualService.round(sum, 2);
        // Проверяем по документу Документу нарахувань не является ли данный вид начислений
        if (accr.orderDtID) {
          let fel = getPayElByOrderDtID(accr.orderDtID)
          if (fel && fel.ID && (['3','68'].includes(cont.payEl[fel.ID].method.code))) {
            //если замена исключаем из расчета 
            if (cont.orgID != 3000021657431 && cont.payEl[fel.ID].method.code === '68') return accrualService.round(sum, 2);
            if (cont.payEl[fel.ID].method.code === '3') return accrualService.round(sum, 2);
          }  
        } 
        
        let baseElMask = getFillMaskByPeriod(
          dateService.shiftDate(Math.max(accPeriod.dateFrom, (elBase.dateFrom && accr.periodSalaryID === periodCalc.ID) ? dateService.shiftDate(elBase.dateFrom) : accPeriod.dateFrom)),
          dateService.shiftDate(Math.min(accPeriod.dateTo, (elBase.dateTo && accr.periodSalaryID === periodCalc.ID) ? dateService.shiftDate(elBase.dateTo) : accPeriod.dateTo))
        )
        if (periodSalary.ID === accr.periodSalaryID) {
          baseElMask = baseElMask & fillMask
        }
        const accrMask = (accr.mask
          ? accr.mask
          : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
            dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
        let mask = accrMask & baseElMask
        let accrPaySum = accr.paySum
        if (dictFundSourceList || dictProgClassList || dictProjectList) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accrPaySum = 0
            accr.accrualDt.forEach(accDt => {
              accrPaySum += ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID)))
                ? accDt.paySum : 0
            })
          } else {
            accrPaySum = 0
          }
        }
        if ((accrMask & baseElMask) === accrMask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum
        } else if (!accr.mask) {
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / accPeriod.dateTo.getDate() * (dateService.dayDiff(dateFrom, dateTo) + 1)
        } else {
          let calcProportionHours = false
          if (accr.flagsRec & 1 << 3) {
            const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
            if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
              calcProportionHours = true
            }
          }
          if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
            let date = dateService.shiftDate(dateFrom)
            let factHour = 0
            const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
            if (hoursByDays) {
              for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                if (hoursByDays[String(day)] > 0) {
                  factHour += hoursByDays[String(day)]
                }
                date = dateService.addDays(date, 1)
              }
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              if (cont.payEl[accr.payElID].method.groupCode === 1) {
                factHour = getHoursByTimeSheet(cont, accPeriod, accr.payElID, mask)
              } else {
                let payDays = (mask.toString(2).match(/1/g) || []).length
                factHour = Math.abs(accr.hours) / accrDays * payDays
              }
            }
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / Math.abs(accr.hours) * factHour
          } else {
            let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
            let payDays = (mask.toString(2).match(/1/g) || []).length
            paySum = (accrDays) ? (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accrPaySum / accrDays * payDays : 0
          }
        }
        const recalcf = accr.periodCalc<dateService.shiftDate('2024-12-01') && accr.periodCalc<accr.periodSalary && accr.periodSalary>=dateService.shiftDate('2024-12-01')
          if (recalcf) {
            paySum = -1 * paySum;
          }
        paySum = accrualService.round(paySum, 2)
        sum += paySum
        if (paySum !== 0 || accr.paySum === 0) {
          if (withIncludPayEl) {
            includPayEl.push(Object.assign(Object.assign({}, accr), { paySum: paySum }))
          }
          if (withDetail && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if ((!dictFundSourceList || dictFundSourceList.includes(accDt.dictFundSourceID)) &&
                  (!dictProjectList || dictProjectList.includes(accDt.dictProjectID)) &&
                  (!dictProgClassList || dictProgClassList.includes(accDt.dictProgClassID))) {
                  let dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * ((paySum === accrPaySum || accrPaySum === 0) ? 1 : (paySum / accrPaySum)), 2)
                  if (recalcf) {
                    dtPaySum = -1 * dtPaySum;
                  }
                  factDetail.push(Object.assign(Object.assign(Object.assign({}, accDt),
                    { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
                }
              })
            } else {
              factDetail.push(Object.assign({ paySum: paySum || 0 }, withPayElID ? {
                payElID: accr.payElID,
                sourceSum: paySum
              } : {},
              { dictFundSourceID: accr.dictFundSourceID, dictProjectID: accr.dictProjectID, dictProgClassID: accr.dictProgClassID, dictPositionID: accr.dictPositionID }))
            }
          }
        }
        }
        return accrualService.round(sum, 2)
      },0)
   }
  }
  if (withDetail || withIncludPayEl) {
    return {
      factSum,
      accrualDt: (!withPayElID)
        ? calcGroupSumAccrualDt(factDetail, factSum, (!payElID || cont.payEl[payElID].method.groupType !== 'OFFTAKE'))
        : factDetail,
      includPayEl
    }
  } else {
    return factSum
  }
}

function getFactSumForAvg ({ withDetail, cont, payElID, periodCalc, periodSalary, dateFrom, dateTo, partPeriod, fillMask, payElBase, includeSecondJobs, dateFromAvg, dateToAvg, periods, avgOnDate, until12122020, after29042022 }) {
  let paySum = 0
  const factDetail = []
  const includPayEl = []
  if (!payElBase) {
    payElBase = cont.payEl[payElID].payElEntrySum.filter(o => dateService.shiftDate(o.dateFrom) <= avgOnDate && dateService.shiftDate(o.dateTo) >= avgOnDate)
  }
  const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateFrom && o.dateTo >= periodCalc.dateFrom)
  const calcType = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'HOUR') || 'HOUR'
  const useTimeSheetBy = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].useTimeSheetBy : 'NORMA') || 'NORMA'
  if (!fillMask || fillMask === 0) {
    fillMask = getFillMaskByPeriod(dateFrom, dateTo)
  }

  if (!periods) {
    periods = []
  }
  const dictFundSourceFSSU = cont.dict.ac_fundSource ? cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID) : []
  const avgMonths = dateService.monthDiff(dateFromAvg, dateToAvg, true) || 1
  let timeSheets = getTimeSheetByPeriod(periodSalary, cont)
  const minAvgCalcTime = cont.constants && cont.constants['hrAccrualAvgCalcTimeDate']
  if (minAvgCalcTime) {
    timeSheets = timeSheets.filter(o => o.dateWork >= minAvgCalcTime)
  }
  const excludeTimeCostPremium = (cont.payEl[payElID].payElTimeExclPremium || []).map(o => o.dictTimeCostID)
  let factTime = getFactTimeByTimeSheet({
    cont,
    timeSheets,
    dateFrom: periodSalary.dateFrom,
    dateTo: periodSalary.dateTo,
    useTimeSheetBy,
    excludeTimeCost: excludeTimeCostPremium
  })
  const factPartTime = partPeriod ? getFactTimeByTimeSheet({
    cont,
    timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
    dateFrom,
    dateTo,
    partPeriod,
    useTimeSheetBy,
    excludeTimeCost: excludeTimeCostPremium
  }) : factTime
  const partKoef = calcType === 'HOUR' ? (factPartTime.hours < factTime.hours ? factPartTime.hours / factTime.hours : 1) : (factPartTime.days < factTime.days ? factPartTime.days / factTime.days : 1)
  const dayAverageCondition = cont.payEl[payElID].method.dayAverageCondition
  const koef = calcType === 'HOUR' ? (factTime.hours < factTime.planHours ? factTime.hours / factTime.planHours : 1) : (factTime.days < factTime.planDays ? factTime.days / factTime.planDays : 1)
  const isParentEmpInclude = cont.payEl[payElID].isParentEmployeeNumber
  const minAvgSumTime = cont.constants && cont.constants['hrAccrualAvgCalcSumDate'] ? dateService.firstDayOfMonth(cont.constants['hrAccrualAvgCalcSumDate']) : null
  const empAccruals = minAvgSumTime ? cont.emp[cont.employeeNumberID].accrual.filter(o => dateService.shiftDate(o.periodCalc) >= minAvgSumTime) : cont.emp[cont.employeeNumberID].accrual

  function calcFactSum (periodSalary, withDetail) {
    return empAccruals.reduce((sum, accr) => {
      if (accr.periodSalaryID === periodSalary.ID && dateService.shiftDate(accr.periodCalc) <= periodCalc.dateFrom &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
        cont.payEl[accr.payElID].method.groupCode !== 3 && !(cont.payEl[payElID].onlyPlanTrip && cont.payEl[accr.payElID].method.code === '21' && !(accr.flagsRec & 1 << 22))
      ) {
        if (!partPeriod) {
          paySum = accr.paySum
        } else {
          const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
          let baseElMask = getFillMaskByPeriod(
            dateService.shiftDate(Math.max(dateFrom, elBase.dateFrom ? dateService.shiftDate(elBase.dateFrom) : dateFrom)),
            dateService.shiftDate(Math.min(dateTo, elBase.dateTo ? dateService.shiftDate(elBase.dateTo) : dateTo))
          )
          if (periodSalary.ID === accr.periodSalaryID) {
            baseElMask = baseElMask & fillMask
          }
          const accrMask = (accr.mask
            ? accr.mask
            : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
              dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
          let mask = accrMask & baseElMask
          if ((accrMask & baseElMask) === accrMask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum
          } else if (!accr.mask && !accr.hours && accr.dateFrom && accr.dateTo) {
            const crossDay = ((fillMask & accrMask || 0).toString(2).match(/1/g) || []).length
            let accrKoef = crossDay > 0 ? ((accrMask || 0).toString(2).match(/1/g) || []).length / crossDay : 0
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * accrKoef
          } else if (!accr.mask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * (partKoef)
          } else {
            let calcProportionHours = false
            if (accr.flagsRec & 1 << 3) {
              const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
              if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
                calcProportionHours = true
              }
            }
            if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
              let date = dateService.shiftDate(dateFrom)
              let factHour = 0
              const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
              if (hoursByDays) {
                for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                  if (hoursByDays[String(day)] > 0) {
                    factHour += hoursByDays[String(day)]
                  }
                  date = dateService.addDays(date, 1)
                }
              } else {
                let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
                if (cont.payEl[accr.payElID].method.groupCode === 1) {
                  factHour = getHoursByTimeSheet(cont, periodSalary, accr.payElID, mask)
                } else {
                  let payDays = (mask.toString(2).match(/1/g) || []).length
                  factHour = Math.abs(accr.hours) / accrDays * payDays
                }
              }
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / Math.abs(accr.hours) * factHour
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              let payDays = (mask.toString(2).match(/1/g) || []).length
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / accrDays * payDays
            }
          }
          paySum = Number.isFinite(paySum) ? paySum : 0
          paySum = accrualService.round(paySum, 2)
        }
        sum += paySum

        if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accr.accrualDt.forEach(accDt => {
              if (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) {
                factDetail.push(Object.assign(Object.assign({}, accDt), { paySum: accDt.paySum * (partPeriod ? (paySum / accr.paySum) : 1) }))
              }
            })
          } else {
            factDetail.push({
              paySum,
              dictFundSourceID: accr.dictFundSourceID,
              dictProgClassID: accr.dictProgClassID,
              dictProjectID: accr.dictProjectID,
              departmentID: accr.departmentID,
              accountID: accr.accountID
            })
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  }

  const after092021 = periodCalc.dateFrom >= new Date(Date.UTC(2021, 8, 1, 0, 0, 0, 0))
  let factSum = calcFactSum(periodSalary, withDetail)
  if (until12122020) {
    const factTimeFull = {
      days: 0,
      hours: 0,
      planDays: 0,
      planHours: 0
    }
    periods.forEach(period => {
      const perTimeSheets = getTimeSheetByPeriod(period, cont)
      const perFactTime = getFactTimeByTimeSheet({ cont, timeSheets: perTimeSheets, dateFrom: period.dateFrom, dateTo: period.dateTo, useTimeSheetBy })
      const factSum = calcFactSum(period, false)
      if (factSum !== 0) {
        factTimeFull.days += perFactTime.days
        factTimeFull.hours += perFactTime.hours
        factTimeFull.planDays += perFactTime.planDays
        factTimeFull.planHours += perFactTime.planHours
      }
    })
    const koefFull = calcType === 'HOUR' ? (factTimeFull.hours < factTimeFull.planHours ? factTimeFull.hours / factTimeFull.planHours : 1) : (factTimeFull.days < factTimeFull.planDays ? factTimeFull.days / factTimeFull.planDays : 1)
    // идем по премиям
    factSum += empAccruals.reduce((sum, accr) => {
      if (cont.payEl[accr.payElID].method.groupCode === 3 && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) &&
        dateService.firstDayOfMonth(dateFromAvg) <= accr.periodCalc && accr.periodCalc <= dateToAvg) {
        const code = cont.payEl[accr.payElID].method.code
        let accrDateFrom = dateService.shiftDate(accr.dateFromAvg)
        let accrDateTo = dateService.shiftDate(accr.dateToAvg)
        let paySum = 0
        if (dayAverageCondition === 'calend' || dayAverageCondition === 'noHolidays') {
          switch (code) {
            case '46':
              paySum = accrualService.round(accr.paySum / 12, 2)
              break
            default:
              if (accr.periodCalcID === periodSalary.ID) {
                paySum = accr.paySum
              }
              break
          }
        }
        if (dayAverageCondition === 'work' || dayAverageCondition === 'plan') {
          switch (code) {
            case '12':
            case '47':
              if (accr.periodCalcID === periodSalary.ID) {
                if (accr.periodCalcID === accr.periodSalaryID) {
                  if (code === '12' || cont.payEl[accr.payElID].calcSumType === 'FACT') {
                    paySum = accr.paySum
                  } else {
                    paySum = accrualService.round(accr.paySum * koef, 2)
                  }
                }
                if (accr.periodSalary < accr.periodCalc) {
                  paySum = accrualService.round(accr.paySum * koefFull, 2)
                }
              }
              break
            case '45':
              if (accr.periodCalcID === periodSalary.ID) {
                paySum = accrualService.round(accr.paySum * koefFull * (avgMonths < 3 ? avgMonths / 3 : 1), 2)
              }
              break
            case '46':
              paySum = accrualService.round(accr.paySum / 12, 2)
              break
            case '65':
            case '206':
              if (accr.periodCalcID === periodSalary.ID) {
                const payMonths = (dateService.monthDiff(accrDateFrom, accrDateTo, true) || 1)
                if (payMonths === 1) {
                  if (accrDateFrom <= accr.periodCalc && accr.periodCalc <= accrDateTo) {
                    paySum = accr.paySum
                  }
                  if (accrDateTo < accr.periodCalc) {
                    paySum = accrualService.round(accr.paySum * koefFull, 2)
                  }
                } else {
                  paySum = accrualService.round(accr.paySum * koefFull * (avgMonths < payMonths ? avgMonths / payMonths : 1), 2)
                }
              }
              break
          }
        }
        paySum = Number.isFinite(paySum) ? paySum : 0
        sum += paySum * partKoef
        if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accr.accrualDt.forEach(accDt => {
              if (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) {
                factDetail.push(Object.assign(Object.assign({}, accDt), { paySum: accrualService.round(accDt.paySum * paySum * partKoef / accr.paySum, 2) }))
              }
            })
          } else {
            factDetail.push({
              paySum,
              dictFundSourceID: accr.dictFundSourceID,
              dictProgClassID: accr.dictProgClassID,
              dictProjectID: accr.dictProjectID,
              dictPositionID: accr.dictPositionID
            })
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  } else if (after29042022) {
    factSum += empAccruals.reduce((sum, accr) => {
      if (cont.payEl[accr.payElID].method.groupCode === 3 && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && !accr.linkToParentID) {
        const payEl = cont.payEl[accr.payElID]
        const code = payEl.method.code
        let calcTimeProportion = payEl.calcTimeProportion || 'DAY'
        if (calcTimeProportion === 'SALARY' && empPos && empPos.payElID) {
          calcTimeProportion = cont.payEl[empPos.payElID].calcProportion || 'DAY'
        }
        const includeInAvg = cont.payEl[accr.payElID].includeInCalcAvg
        let accrDateFrom = accr.periodCalc
        let accrDateTo = dateService.lastDayOfMonth(accr.periodCalc)
        let payMonths
        switch (code) {
          case '45':
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, 2))
            break
          case '65':
          case '206':
            payMonths = accr.dateFromAvg && accr.dateToAvg
              ? (dateService.monthDiff(accr.dateFromAvg, accr.dateToAvg, true) || 1)
              : (dateService.monthDiff(accr.dateFrom, accr.dateTo, true) || 1)
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, payMonths - 1))
            break
          case '46':
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, 11))
            break
          case '47':
            accrDateTo = dateService.lastDayOfMonth(accr.periodCalc)
            break
        }
        if (accrDateFrom <= dateTo && accrDateTo >= dateFrom) {
          let accrPaySum = accr.paySum + (accr.ID ? getRecalcSum(empAccruals, accr.ID) : 0)
          let accrDateFromAvg = accr.dateFromAvg || dateService.firstDayOfMonth(accr.periodSalary)
          let accrDateToAvg = accr.dateToAvg || dateService.lastDayOfMonth(accr.periodSalary)
          if (['45', '46', '65'].includes(code) && (!accr.dateFromAvg || !accr.dateToAvg)) {
            switch (code) {
              case '45': {
                if ([2, 5, 8, 11].includes(accr.periodSalary.getMonth())) {
                  accrDateFromAvg = dateService.firstDayOfMonth(dateService.addMonths(accr.periodSalary, -2))
                  accrDateToAvg = dateService.lastDayOfMonth(dateService.addMonths(accr.periodSalary))
                } else {
                  const startDate = new Date(accr.dateFrom.getFullYear() - (accr.dateFrom.getMonth() < 2 ? 1 : 0),
                    accr.dateFrom.getMonth() < 2 ? 9 : accr.dateFrom.getMonth() < 5 ? 0 : accr.dateFrom.getMonth() < 8 ? 3 : 6, 1)
                  accrDateFromAvg = dateService.firstDayOfMonth(startDate)
                  accrDateToAvg = dateService.lastDayOfMonth(dateService.addMonths(startDate, 2))
                }
                break
              }
              case '46': {
                if ([11].includes(accr.periodSalary.getMonth())) {
                  accrDateFromAvg = dateService.firstDayOfYear(accr.periodSalary)
                  accrDateToAvg = dateService.lastDayOfYear(accr.periodSalary)
                } else {
                  accrDateFromAvg = dateService.firstDayOfYear(dateService.addYears(accr.periodSalary, -1))
                  accrDateToAvg = dateService.lastDayOfYear(dateService.addYears(accr.periodSalary, -1))
                }
                break
              }
              case '65': {
                accrDateFromAvg = dateService.firstDayOfMonth(dateService.addMonths(accr.periodSalary, -1))
                accrDateToAvg = dateService.lastDayOfMonth(dateService.addMonths(accr.periodSalary, -1))
                break
              }
            }
          }
          let paySum = 0
          factTime = getFactTimeByTimeSheet({
            cont,
            timeSheets,
            dateFrom: periodSalary.dateFrom,
            dateTo: periodSalary.dateTo,
            useTimeSheetBy: (includeInAvg === '1' || includeInAvg === '2') ? 'NORMA' : 'PLAN',
            excludeTimeCost: excludeTimeCostPremium
          })
          const factTimePerAvg = getFactTimeByTimeSheet({
            cont,
            timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
            dateFrom: accrDateFromAvg,
            dateTo: accrDateToAvg,
            partPeriod: true,
            excludeTimeCost: excludeTimeCostPremium,
            useTimeSheetBy: (includeInAvg === '1' || includeInAvg === '2') ? 'NORMA' : 'PLAN'
          })
          const factTimePerCalc = getFactTimeByTimeSheet({
            cont,
            timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
            dateFrom: accrDateFrom,
            dateTo: accrDateTo,
            partPeriod: true,
            excludeTimeCost: excludeTimeCostPremium,
            useTimeSheetBy: (includeInAvg === '1' || includeInAvg === '2') ? 'NORMA' : 'PLAN'
          })
          const planTimeAvg = getFactTimeByTimeSheet({
            cont,
            timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
            dateFrom: accrDateFromAvg,
            dateTo: accrDateToAvg,
            partPeriod: true,
            excludeTimeCost: [],
            useTimeSheetBy: (includeInAvg === '1' || includeInAvg === '2') ? 'NORMA' : 'PLAN'
          })
          const fdpp = calcTimeProportion === 'HOUR' ? factTimePerAvg.factHours : factTimePerAvg.days // кількість відпрацьованих днів у періоді збору даних для премії (ФДПП)
          const fdps = calcTimeProportion === 'HOUR' ? factTimePerCalc.factHours : factTimePerCalc.days // кількість відпрацьованих днів у періодах, до яких будуть додаватись сума премії (ФДПС)
          const ndpp = calcTimeProportion === 'HOUR' ? planTimeAvg.planHours : planTimeAvg.planDays // кількість робочих днів за нормою (НДПП)
          const pdpp = calcTimeProportion === 'HOUR' ? planTimeAvg.planHours : planTimeAvg.planDays // кількість днів за планом у періоді збору даних для премії (ПДПП)
          let planTime = 0
          const daysDiffAvg = dateService.dateDiff(accrDateFromAvg, accrDateToAvg)
          const timeSheetAvg = minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets
          const daysTimeSheetAvg = timeSheetAvg.reduce((days, row) => {
            if (accrDateFromAvg <= row.dateWork && row.dateWork <= accrDateToAvg) {
              days++
            }
            return days
          }, 0)
          if (includeInAvg === '1' || includeInAvg === '3') {
            // За фактом (норма) або За фактом (план)
            if (daysDiffAvg === daysTimeSheetAvg && fdpp >= ndpp) {
              planTime = fdpp
            } else {
              planTime = fdpp >= fdps ? fdpp : fdps
            }
          } else if (includeInAvg === '2') {
            // За нормою
            planTime = ndpp > fdps ? ndpp : fdps
          } else if (includeInAvg === '4') {
            // За планом
            planTime = pdpp > fdps ? pdpp : fdps
          }
          paySum = planTime !== 0 ? accrualService.round(accrPaySum / planTime * (calcTimeProportion === 'HOUR' ? factTime.factHours : factTime.days), 2) : 0
          paySum = Number.isFinite(paySum) ? paySum : 0
          const logData = {
            employeeNumberID: cont.employeeNumberID,
            payElID: accr.payElID,
            payEl: payEl ? payEl.description : null,
            method: payEl && payEl.method ? payEl.method.code : null,
            includeInAvg,
            paySum,
            accrPaySum,
            fdpp,
            fdps,
            pdpp,
            ndpp,
            factDays: factTime.days,
            factHours: factTime.hours,
            daysDiffAvg,
            daysTimeSheetAvg,
            accrDateFrom,
            accrDateTo,
            accrDateFromAvg,
            accrDateToAvg,
            dateFrom,
            dateTo
          }
          console.log('###', JSON.stringify(logData))
          sum += paySum
          if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) {
                  factDetail.push(Object.assign(Object.assign({}, accDt), { paySum: accrualService.round(accDt.paySum * paySum / accrPaySum, 2) }))
                }
              })
            } else {
              factDetail.push({
                paySum,
                dictFundSourceID: accr.dictFundSourceID,
                dictProgClassID: accr.dictProgClassID,
                dictProjectID: accr.dictProjectID,
                dictPositionID: accr.dictPositionID
              })
            }
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  } else if (after092021) {
    factSum += empAccruals.reduce((sum, accr) => {
      if (cont.payEl[accr.payElID].method.groupCode === 3 && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID) && !accr.linkToParentID) {
        const payEl = cont.payEl[accr.payElID]
        const code = payEl.method.code
        const includeInAvg = cont.payEl[accr.payElID].includeInCalcAvg
        let accrDateFrom = accr.periodCalc
        let accrDateTo = dateService.lastDayOfMonth(accr.periodCalc)
        let payMonths
        switch (code) {
          case '45':
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, 2))
            break
          case '65':
          case '206':
            payMonths = accr.dateFromAvg && accr.dateToAvg
              ? (dateService.monthDiff(accr.dateFromAvg, accr.dateToAvg, true) || 1)
              : (dateService.monthDiff(accr.dateFrom, accr.dateTo, true) || 1)
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, payMonths - 1))
            break
          case '46':
            accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodCalc, 11))
            break
          case '47':
            accrDateTo = dateService.lastDayOfMonth(accr.periodCalc)
            break
        }
        if (accrDateFrom <= dateTo && accrDateTo >= dateFrom) {
          const empPosOnDate = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accrDateFrom && o.dateTo >= accrDateFrom)
          const accCalcType = ((empPosOnDate && empPosOnDate.payElID) ? cont.payEl[empPosOnDate.payElID].calcProportion : calcType) || calcType
          let accrPaySum = accr.paySum + (accr.ID ? getRecalcSum(empAccruals, accr.ID) : 0)
          let accrDateFromAvg = accr.dateFromAvg || dateService.firstDayOfMonth(accr.periodSalary)
          let accrDateToAvg = accr.dateToAvg || dateService.lastDayOfMonth(accr.periodSalary)
          if (['45', '46'].includes(code) && (accr.flagsRec & 8 || (!accr.dateFromAvg || !accr.dateToAvg))) {
            switch (code) {
              case '45': {
                if ([2, 5, 8, 11].includes(accr.periodSalary.getMonth())) {
                  accrDateFromAvg = dateService.firstDayOfMonth(dateService.addMonths(accr.periodSalary, -2))
                  accrDateToAvg = dateService.lastDayOfMonth(dateService.addMonths(accr.periodSalary))
                } else {
                  const startDate = new Date(accr.dateFrom.getFullYear() - (accr.dateFrom.getMonth() < 2 ? 1 : 0),
                    accr.dateFrom.getMonth() < 2 ? 9 : accr.dateFrom.getMonth() < 5 ? 0 : accr.dateFrom.getMonth() < 8 ? 3 : 6, 1)
                  accrDateFromAvg = dateService.firstDayOfMonth(startDate)
                  accrDateToAvg = dateService.lastDayOfMonth(dateService.addMonths(startDate, 2))
                }
                break
              }
              case '46': {
                if ([11].includes(accr.periodSalary.getMonth())) {
                  accrDateFromAvg = dateService.firstDayOfYear(accr.periodSalary)
                  accrDateToAvg = dateService.lastDayOfYear(accr.periodSalary)
                } else {
                  accrDateFromAvg = dateService.firstDayOfYear(dateService.addYears(accr.periodSalary, -1))
                  accrDateToAvg = dateService.lastDayOfYear(dateService.addYears(accr.periodSalary, -1))
                }
                break
              }
            }
          }
          let paySum = 0
          const factTimePer = getFactTimeByTimeSheet({
            cont,
            timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
            dateFrom: accrDateFromAvg,
            dateTo: accrDateToAvg,
            useTimeSheetBy
          })

          if (includeInAvg === '2') {
            paySum = (accCalcType === 'HOUR' ? factTime.hours : factTime.days) !== 0 ? accrualService.round(accrPaySum / (accCalcType === 'HOUR' ? factTimePer.planHours : factTimePer.planDays) * (accCalcType === 'HOUR' ? factTime.hours : factTime.days), 2) : 0
          } else {
            paySum = (accCalcType === 'HOUR' ? factTime.hours : factTime.days) !== 0 ? accrualService.round(accrPaySum / (accCalcType === 'HOUR' ? factTimePer.hours : factTimePer.days) * (accCalcType === 'HOUR' ? factTime.hours : factTime.days), 2) : 0
          }
          paySum = Number.isFinite(paySum) ? paySum : 0
          // console.log('###', paySum, accr.paySum, accrDateFromAvg, accrDateToAvg, factTimePer, factTime, periodSalary.dateFrom, periodSalary.dateTo)
          sum += paySum
          if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) {
                  factDetail.push(Object.assign(Object.assign({}, accDt), { paySum: accrualService.round(accDt.paySum * paySum / accrPaySum, 2) }))
                }
              })
            } else {
              factDetail.push({
                paySum,
                dictFundSourceID: accr.dictFundSourceID,
                dictProgClassID: accr.dictProgClassID,
                dictProjectID: accr.dictProjectID,
                dictPositionID: accr.dictPositionID
              })
            }
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  } else {
    factSum += empAccruals.reduce((sum, accr) => {
      if (cont.payEl[accr.payElID].method.groupCode === 3 && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
        payElBase.find(o => o.payElBaseID === accr.payElID)) {
        const payEl = cont.payEl[accr.payElID]
        const code = payEl.method.code
        const includeInAvg = payEl.includeInCalcAvg
        let accrDateFrom = accr.dateFromAvg || accr.dateFrom
        let accrDateTo = accr.dateToAvg || accr.dateTo
        if (['45', '46'].includes(code) && (accr.flagsRec & 8 || (!accr.dateFromAvg || !accr.dateToAvg))) {
          switch (code) {
            case '45': {
              if ([2, 5, 8, 11].includes(accr.periodSalary.getMonth())) {
                accrDateFrom = dateService.firstDayOfMonth(dateService.addMonths(accr.periodSalary, -2))
                accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(accr.periodSalary))
              } else {
                const startDate = new Date(accr.dateFrom.getFullYear() - (accr.dateFrom.getMonth() < 2 ? 1 : 0),
                  accr.dateFrom.getMonth() < 2 ? 9 : accr.dateFrom.getMonth() < 5 ? 0 : accr.dateFrom.getMonth() < 8 ? 3 : 6, 1)
                accrDateFrom = dateService.firstDayOfMonth(startDate)
                accrDateTo = dateService.lastDayOfMonth(dateService.addMonths(startDate, 2))
              }
              break
            }
            case '46': {
              if ([11].includes(accr.periodSalary.getMonth())) {
                accrDateFrom = dateService.firstDayOfYear(accr.periodSalary)
                accrDateTo = dateService.lastDayOfYear(accr.periodSalary)
              } else {
                accrDateFrom = dateService.firstDayOfYear(dateService.addYears(accr.periodSalary, -1))
                accrDateTo = dateService.lastDayOfYear(dateService.addYears(accr.periodSalary, -1))
              }
              break
            }
          }
        }
        if (accrDateFrom <= dateTo && accrDateTo >= dateFrom) {
          let paySum = 0
          switch (code) {
            case '12':
              if (code === '12' || cont.payEl[accr.payElID].calcSumType === 'FACT') {
                paySum = accr.paySum
              } else {
                paySum = accrualService.round(accr.paySum * koef, 2)
              }
              if (includeInAvg === '2') {
                paySum = (calcType === 'HOUR' ? factTime.hours : factTime.days) !== 0 ? accrualService.round(accr.paySum / (calcType === 'HOUR' ? factTime.planHours : factTime.planDays) * (calcType === 'HOUR' ? factTime.hours : factTime.days), 2) : 0
              }
              break
            case '45':
            case '46':
            case '47':
            case '65':
            case '206':
              const factTimePer = getFactTimeByTimeSheet({
                cont,
                timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets,
                dateFrom: accrDateFrom,
                dateTo: accrDateTo,
                useTimeSheetBy
              })
              if (includeInAvg === '2') {
                paySum = (calcType === 'HOUR' ? factTime.hours : factTime.days) !== 0 ? accrualService.round(accr.paySum / (calcType === 'HOUR' ? factTimePer.planHours : factTimePer.planDays) * (calcType === 'HOUR' ? factTime.hours : factTime.days), 2) : 0
              } else {
                paySum = (calcType === 'HOUR' ? factTime.hours : factTime.days) !== 0 ? accrualService.round(accr.paySum / (calcType === 'HOUR' ? factTimePer.hours : factTimePer.days) * (calcType === 'HOUR' ? factTime.hours : factTime.days), 2) : 0
              }
              break
          }
          paySum = Number.isFinite(paySum) ? paySum : 0
          sum += paySum * partKoef
          if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
            if (accr.accrualDt && accr.accrualDt.length) {
              accr.accrualDt.forEach(accDt => {
                if (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID)) {
                  factDetail.push(Object.assign(Object.assign({}, accDt), { paySum: accrualService.round(accDt.paySum * paySum * partKoef / accr.paySum, 2) }))
                }
              })
            } else {
              factDetail.push({
                paySum,
                dictFundSourceID: accr.dictFundSourceID,
                dictProgClassID: accr.dictProgClassID,
                dictProjectID: accr.dictProjectID,
                dictPositionID: accr.dictPositionID
              })
            }
          }
        }
      }
      return accrualService.round(sum, 2)
    }, 0)
  }
  if (withDetail) {
    return {
      factSum: factSum || 0,
      accrualDt: calcGroupSumAccrualDt(factDetail, factSum, true),
      includPayEl
    }
  } else {
    return factSum || 0
  }
}

function getRecalcSum (accruals, parentID) {
  let paySum = 0
  const recalcAccr = parentID ? accruals.filter(o => o.linkToParentID === parentID && o.ID !== parentID) : []
  recalcAccr.forEach(r => {
    const recalcSum = r.ID ? getRecalcSum(accruals, r.ID) : 0
    paySum += (r.paySum || 0) + recalcSum
  })
  return paySum
}

function getFactSumForSickness ({ withDetail, cont, payElID, periodCalc, payElBase, withPayElID, avgOnDate, partPeriod, dateFrom, dateTo, fillMask }) {
  let factSum = 0
  let paySum = 0
  let isAdd = false
  const factDetail = []
  const payElFundList = []
  if (!cont.payFund) {
    cont.payFund = []
  }
  cont.payFund.filter(o => o.methodCode === '1').forEach(fund => {
    fund.payFundBase.forEach(row => {
      payElFundList.push({
        payElID: row.payElBaseID,
        calcPeriod: fund.calcPeriod
      })
    })
  })
  const includeSecondJobs = payElID && (cont.payEl[payElID].includeSecondJobs || cont.payEl[payElID].method.code === '26')

  if (!payElBase) {
    payElBase = cont.payEl[payElID].payElEntrySum.filter(o => o.dateFrom <= avgOnDate && o.dateTo >= avgOnDate)
  }
  const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateFrom && o.dateTo >= periodCalc.dateFrom)
  const calcType = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].calcProportion : 'HOUR') || 'HOUR'
  const useTimeSheetBy = ((empPos && empPos.payElID) ? cont.payEl[empPos.payElID].useTimeSheetBy : 'NORMA') || 'NORMA'
  if (partPeriod && (!fillMask || fillMask === 0)) {
    fillMask = getFillMaskByPeriod(dateFrom, dateTo)
  }
  const minAvgCalcTime = cont.constants && cont.constants['hrAccrualAvgCalcTimeDate']
  let partKoef = 1
  if (partPeriod) {
    let timeSheets = getTimeSheetByPeriod(periodCalc, cont)
    if (minAvgCalcTime) {
      timeSheets = timeSheets.filter(o => o.dateWork >= minAvgCalcTime)
    }
    const factTime = getFactTimeByTimeSheet({
      cont,
      timeSheets,
      dateFrom: periodCalc.dateFrom,
      dateTo: periodCalc.dateTo,
      useTimeSheetBy
    })
    const factPartTime = partPeriod ? getFactTimeByTimeSheet({
      cont,
      timeSheets: minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets,
      dateFrom,
      dateTo,
      partPeriod,
      useTimeSheetBy
    }) : factTime
    partKoef = calcType === 'HOUR' ? (factPartTime.hours < factTime.hours ? factPartTime.hours / factTime.hours : 1) : (factPartTime.days < factTime.days ? factPartTime.days / factTime.days : 1)
  }
  const minAvgSumTime = cont.constants && cont.constants['hrAccrualAvgCalcSumDate'] ? dateService.firstDayOfMonth(cont.constants['hrAccrualAvgCalcSumDate']) : null
  const empAccruals = minAvgSumTime ? cont.emp[cont.employeeNumberID].accrual.filter(o => dateService.shiftDate(o.periodCalc) >= minAvgSumTime) : cont.emp[cont.employeeNumberID].accrual

  const isParentEmpInclude = cont.payEl[payElID].isParentEmployeeNumber
  factSum = empAccruals.reduce((sum, accr) => {
    if ((!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
      ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
      payElBase.find(o => o.payElBaseID === accr.payElID)) {
      const payElFund = payElFundList.find(o => o.payElID === accr.payElID)
      if (payElFund) {
        if (payElFund.calcPeriod === 'SALARY') {
          isAdd = accr.periodSalaryID === periodCalc.ID
        } else {
          isAdd = accr.periodCalc <= accr.periodSalary && accr.periodCalcID === periodCalc.ID
        }
      } else {
        isAdd = accr.periodCalcID === periodCalc.ID
      }
      if (isAdd) {
        if (!partPeriod) {
          paySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum, 2)
        } else {
          const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
          let baseElMask = getFillMaskByPeriod(
            dateService.shiftDate(Math.max(dateFrom, elBase.dateFrom ? dateService.shiftDate(elBase.dateFrom) : dateFrom)),
            dateService.shiftDate(Math.min(dateTo, elBase.dateTo ? dateService.shiftDate(elBase.dateTo) : dateTo))
          )
          if (periodCalc.ID === accr.periodSalaryID) {
            baseElMask = baseElMask & fillMask
          }
          const accrMask = (accr.mask
            ? accr.mask
            : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
              dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
          let mask = accrMask & baseElMask
          if ((accrMask & baseElMask) === accrMask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum
          } else if (!accr.mask && !accr.hours && accr.dateFrom && accr.dateTo) {
            const crossDay = ((fillMask & accrMask || 0).toString(2).match(/1/g) || []).length
            let accrKoef = crossDay > 0 ? ((accrMask || 0).toString(2).match(/1/g) || []).length / crossDay : 0
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * accrKoef
          } else if (!accr.mask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * (partKoef)
          } else {
            let calcProportionHours = false
            if (accr.flagsRec & 1 << 3) {
              const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
              if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
                calcProportionHours = true
              }
            }
            if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
              let date = dateService.shiftDate(dateFrom)
              let factHour = 0
              const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
              if (hoursByDays) {
                for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                  if (hoursByDays[String(day)] > 0) {
                    factHour += hoursByDays[String(day)]
                  }
                  date = dateService.addDays(date, 1)
                }
              } else {
                let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
                if (cont.payEl[accr.payElID].method.groupCode === 1) {
                  factHour = getHoursByTimeSheet(cont, periodCalc, accr.payElID, mask)
                } else {
                  let payDays = (mask.toString(2).match(/1/g) || []).length
                  factHour = Math.abs(accr.hours) / accrDays * payDays
                }
              }
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / Math.abs(accr.hours) * factHour
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              let payDays = (mask.toString(2).match(/1/g) || []).length
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / accrDays * payDays
            }
          }
          paySum = accrualService.round(paySum, 2)
        }
        sum += paySum
        if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
          if (accr.accrualDt && accr.accrualDt.length) {
            accr.accrualDt.forEach(accDt => {
              const dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * paySum / accr.paySum, 2)
              factDetail.push(Object.assign(Object.assign(Object.assign({}, accDt),
                { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
            })
          } else {
            factDetail.push(Object.assign({ paySum: paySum || 0 },
              withPayElID ? { payElID: accr.payElID, sourceSum: paySum } : {},
              { dictFundSourceID: accr.dictFundSourceID, dictProjectID: accr.dictProjectID, dictProgClassID: accr.dictProgClassID, dictPositionID: accr.dictPositionID }))
          }
        }
      }
    }
    return accrualService.round(sum, 2)
  }, 0)
  const accrGroup = []
  empAccruals.forEach(accr => {
    if ((!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
      ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) && payElBase.find(o => o.payElBaseID === accr.payElID)) {
      const payElFund = payElFundList.find(o => o.payElID === accr.payElID)
      if (payElFund && payElFund.calcPeriod === 'CALC' && accr.periodCalc > accr.periodSalary) {
        const group = accrGroup.find(o => o.periodCalcID === accr.periodCalcID && o.periodSalaryID === accr.periodSalaryID && o.payElID === accr.payElID)
        const accrualDt = []
        if (!partPeriod) {
          paySum = accr.paySum
        } else {
          const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
          let baseElMask = getFillMaskByPeriod(
            dateService.shiftDate(Math.max(dateFrom, elBase.dateFrom ? dateService.shiftDate(elBase.dateFrom) : dateFrom)),
            dateService.shiftDate(Math.min(dateTo, elBase.dateTo ? dateService.shiftDate(elBase.dateTo) : dateTo))
          )
          if (periodCalc.ID === accr.periodSalaryID) {
            baseElMask = baseElMask & fillMask
          }
          const accrMask = (accr.mask
            ? accr.mask
            : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
              dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
          let mask = accrMask & baseElMask
          if ((accrMask & baseElMask) === accrMask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum
          } else if (!accr.mask && !accr.hours && accr.dateFrom && accr.dateTo) {
            const crossDay = ((fillMask & accrMask || 0).toString(2).match(/1/g) || []).length
            let accrKoef = crossDay > 0 ? ((accrMask || 0).toString(2).match(/1/g) || []).length / crossDay : 0
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * accrKoef
          } else if (!accr.mask) {
            paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum * (partKoef)
          } else {
            let calcProportionHours = false
            if (accr.flagsRec & 1 << 3) {
              const empPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accr.dateFrom && accr.dateFrom <= o.dateTo)
              if (empPos && empPos.payElID && cont.payEl[empPos.payElID].calcProportion === 'HOUR') {
                calcProportionHours = true
              }
            }
            if (accr.planHours && accr.hours && (accr.flagsRec & 1 << 5 || calcProportionHours)) {
              let date = dateService.shiftDate(dateFrom)
              let factHour = 0
              const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
              if (hoursByDays) {
                for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
                  if (hoursByDays[String(day)] > 0) {
                    factHour += hoursByDays[String(day)]
                  }
                  date = dateService.addDays(date, 1)
                }
              } else {
                let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
                if (cont.payEl[accr.payElID].method.groupCode === 1) {
                  factHour = getHoursByTimeSheet(cont, periodCalc, accr.payElID, mask)
                } else {
                  let payDays = (mask.toString(2).match(/1/g) || []).length
                  factHour = Math.abs(accr.hours) / accrDays * payDays
                }
              }
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / Math.abs(accr.hours) * factHour
            } else {
              let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
              let payDays = (mask.toString(2).match(/1/g) || []).length
              paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / accrDays * payDays
            }
          }
          paySum = accrualService.round(paySum, 2)
        }
        if (withDetail && !(accr.flagsRec & 1 << 12)) {
          if (accr.accrualDt && accr.accrualDt.length && accr.paySum !== 0) {
            accr.accrualDt.forEach(accDt => {
              const dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * paySum / accr.paySum, 2)
              accrualDt.push(Object.assign(Object.assign(Object.assign({}, accDt),
                { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
            })
          } else {
            accrualDt.push(Object.assign({ paySum: paySum || 0 }, withPayElID ? { payElID: accr.payElID, sourceSum: paySum } : {},
              { dictFundSourceID: accr.dictFundSourceID, dictProjectID: accr.dictProjectID, dictProgClassID: accr.dictProgClassID, dictPositionID: accr.dictPositionID }))
          }
        }

        if (!group) {
          accrGroup.push({
            periodCalcID: accr.periodCalcID,
            periodSalaryID: accr.periodSalaryID,
            periodCalc: accr.periodCalc,
            periodSalary: accr.periodSalary,
            paySum: paySum,
            accrualDt: accrualDt,
            payElID: accr.payElID
          })
        } else {
          group.paySum += paySum
          group.accrualDt.push(...accrualDt)
        }
      }
    }
  })
  accrGroup.forEach(accr => {
    isAdd = false
    const esvAccr = empAccruals.filter(o => o.periodCalcID === accr.periodCalcID && o.periodSalaryID === accr.periodSalaryID &&
      [4, 5].includes(cont.payEl[o.payElID].method.groupCode))
    const paySumEsvAccr = esvAccr.reduce((sum, item) => sum + item.paySum, 0)
    if (accrualService.round(paySumEsvAccr) !== 0) {
      if (accr.paySum * paySumEsvAccr < 0) {
        isAdd = accr.periodSalaryID === periodCalc.ID
      } else {
        isAdd = accr.periodCalcID === periodCalc.ID
      }
    } else {
      const dayCount = empAccruals.filter(o => o.periodCalcID === accr.periodCalcID && o.periodSalaryID === accr.periodSalaryID &&
        ['14', '15', '57', '140'].includes(cont.payEl[o.payElID].method.code)).reduce((sum, item) => sum + item.days, 0)
      if (dayCount === 0) {
        isAdd = accr.periodCalcID === periodCalc.ID
      } else {
        if (accr.paySum * dayCount < 0) {
          isAdd = accr.periodSalaryID === periodCalc.ID
        } else {
          isAdd = accr.periodCalcID === periodCalc.ID
        }
      }
    }
    if (isAdd) {
      factSum += accr.paySum
      if (withDetail && !(accr.flagsRec & 1 << 12)) {
        factDetail.push(...accr.accrualDt)
      }
    }
  })
  if (withDetail) {
    return {
      factSum,
      accrualDt: (!withPayElID)
        ? calcGroupSumAccrualDt(factDetail, factSum, (!payElID || cont.payEl[payElID].method.groupType !== 'OFFTAKE'))
        : factDetail,
      includPayEl: []
    }
  } else {
    return factSum
  }
}

function calcGroupSumAccrualDt (detail, sum, withAccount) {
  const result = []
  const det = []
  let paySum = 0
  detail.forEach(row => {
    if (!Number.isFinite(row.paySum)) {
      row.paySum = 0
    }
    const dt = {}
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        dt[`d${i}`] = row[`d${i}`]
        if (row[`d${i}Value`]) {
          dt[`d${i}Value`] = row[`d${i}Value`]
        }
      }
    }
    dt.dimValues = Object.values(dt)

    dt.paySum = row.paySum
    dt.dictFundSourceID = row.dictFundSourceID || null
    dt.dictProgClassID = row.dictProgClassID || null
    dt.dictProjectID = row.dictProjectID || null
    dt.departmentID = row.departmentID || null
    dt.accountID = withAccount ? row.accountID : null
    paySum = accrualService.round(paySum + row.paySum, 2)
    det.push(dt)
  })
  paySum = accrualService.round(paySum, 2)
  det.forEach(row => {
    const sumRow = result.find(o => (!withAccount || o.accountID === row.accountID) && o.departmentID === row.departmentID &&
      o.dictProgClassID === row.dictProgClassID && o.dictFundSourceID === row.dictFundSourceID && o.dictProjectID === row.dictProjectID &&
      !_.difference(o.dimValues, row.dimValues).length && !_.difference(row.dimValues, o.dimValues).length)
    if (sumRow) {
      sumRow.paySum = accrualService.round(sumRow.paySum + row.paySum, 2)
    } else {
      row.paySum = accrualService.round(row.paySum, 2)
      result.push(row)
    }
  })
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].paySum === 0 && paySum !== 0) {
      result.splice(i, 1)
    } else {
      delete result[i].dimValues
    }
  }
  if (paySum !== sum && result.length) {
    return correctAccrualDt(result, sum, paySum)
  } else {
    return result
  }
}
function calcGroupSumAccrualPaymentDt (detail, sum) {
  const result = []
  const det = []
  let paySum = 0
  detail.forEach(row => {
    const dt = {}
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        dt[`d${i}`] = row[`d${i}`]
        if (row[`d${i}Value`]) {
          dt[`d${i}Value`] = row[`d${i}Value`]
        }
      }
    }
    dt.dimValues = Object.values(dt)

    dt.paySum = row.paySum
    dt.departmentID = row.departmentID || null
    dt.dictFundSourceID = row.dictFundSourceID || null
    dt.dictProgClassID = row.dictProgClassID || null
    dt.dictProjectID = row.dictProjectID || null
    paySum = accrualService.round(paySum + row.paySum, 2)
    det.push(dt)
  })
  paySum = accrualService.round(paySum, 2)
  det.forEach(row => {
    const sumRow = result.find(o => o.dictFundSourceID === row.dictFundSourceID && o.dictProjectID === row.dictProjectID &&
      o.dictProgClassID === row.dictProgClassID && o.departmentID === row.departmentID &&
      !_.difference(o.dimValues, row.dimValues).length && !_.difference(row.dimValues, o.dimValues).length)
    if (sumRow) {
      sumRow.paySum = accrualService.round(sumRow.paySum + row.paySum, 2)
    } else {
      row.paySum = accrualService.round(row.paySum, 2)
      result.push(row)
    }
  })
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].paySum === 0 && paySum !== 0) {
      result.splice(i, 1)
    } else {
      delete result[i].dimValues
    }
  }
  if (paySum !== sum && result.length) {
    return correctAccrualDt(result, sum, paySum)
  } else {
    return result
  }
}
function correctAccrualDt (detail, sum = 0, detPaySum, attrName = 'paySum') {
  let paySum = 0
  if (!detPaySum) {
    detPaySum = detail.reduce((sum, row) => {
      return accrualService.round(sum + row[attrName], 2)
    }, 0)
  }

  detail.forEach(row => {
    row[attrName] = accrualService.round(row[attrName] / (detPaySum || 1) * sum, 2)
    paySum = accrualService.round(paySum + row[attrName], 2)
    delete row.ID
    delete row.accrualID
  })

  if (paySum !== sum && detail.length) {
    detail[0][attrName] = accrualService.round(detail[0][attrName] + sum - paySum, 2)
  }
  return detail
}

function calcGroupSumAccrualFundDt (detail, sum) {
  const result = []
  const det = []
  let paySum = 0
  let sourceSum = 0
  let baseSum = 0
  detail.forEach(row => {
    const dt = {}
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        dt[`d${i}`] = row[`d${i}`]
        if (row[`d${i}Value`]) {
          dt[`d${i}Value`] = row[`d${i}Value`]
        }
      }
    }
    dt.dimValues = Object.values(dt)

    dt.paySum = row.paySum
    dt.sourceSum = row.sourceSum
    dt.baseSum = row.baseSum
    dt.payElID = row.payElID
    dt.dictFundSourceID = row.dictFundSourceID || null
    dt.dictProgClassID = row.dictProgClassID || null
    dt.dictProjectID = row.dictProjectID || null
    dt.departmentID = row.departmentID || null
    dt.accountID = row.accountID || null
    paySum = accrualService.round(paySum + row.paySum, 2)
    sourceSum = accrualService.round(sourceSum + row.sourceSum, 2)
    baseSum = accrualService.round(baseSum + row.baseSum, 2)
    det.push(dt)
  })

  det.forEach(row => {
    const sumRow = result.find(o => o.accountID == row.accountID && o.departmentID == row.departmentID && o.payElID == row.payElID &&
      o.dictProgClassID == row.dictProgClassID && o.dictFundSourceID == row.dictFundSourceID && o.dictProjectID == row.dictProjectID &&
      !_.difference(o.dimValues, row.dimValues).length && !_.difference(row.dimValues, o.dimValues).length)
    if (sumRow) {
      sumRow.paySum = accrualService.round(sumRow.paySum + row.paySum, 2)
      sumRow.sourceSum = accrualService.round(sumRow.sourceSum + row.sourceSum, 2)
      sumRow.baseSum = accrualService.round(sumRow.baseSum + row.baseSum, 2)
    } else {
      row.paySum = accrualService.round(row.paySum, 2)
      row.sourceSum = accrualService.round(row.sourceSum, 2)
      row.baseSum = accrualService.round(row.baseSum, 2)
      result.push(row)
    }
  })
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].paySum === 0 && result[i].baseSum === 0 && result[i].sourceSum === 0) {
      result.splice(i, 1)
    } else {
      delete result[i].dimValues
    }
  }
  if (paySum !== sum && result.length) {
    return correctAccrualFundDt(result, sum, paySum)
  } else {
    return result
  }
}

function correctAccrualFundDt (detail, sum = 0, detPaySum) {
  let paySum = 0
  if (!detPaySum) {
    detPaySum = detail.reduce((sum, row) => {
      return accrualService.round(sum + row.paySum, 2)
    }, 0)
  }

  detail.forEach(row => {
    row.paySum = accrualService.round(row.paySum / (detPaySum || 1) * sum, 2)
    paySum = accrualService.round(paySum + row.paySum, 2)
    delete row.ID
    delete row.accrualFundID
  })

  if (paySum !== sum && detail.length) {
    detail[0].paySum = accrualService.round(detail[0].paySum + sum - paySum, 2)
  }
  return detail
}

function getChangePayPeriod (cont, permanentAccrual, perDateFrom, perDateTo) {
  let daysFrom = [perDateFrom]
  let daysTo = [perDateTo]
  let resultPeriods = []
  function pushDay (days, newDay) {
    const nd = dateService.shiftDate(newDay)
    if (perDateFrom < nd && nd < perDateTo && !days.find(o => o.getTime() === nd.getTime())) {
      days.push(nd)
    }
  }
  function getPeriods (accr, dateFrom, dateTo, calcPayEl = []) {
    if (calcPayEl.find(o => o === accr.payElID)) {
      return
    }
    calcPayEl.push(accr.payElID)
    if (cont.payEl[accr.payElID].method.code === '5') {
      const rankPeriod = cont.emp[cont.employeeNumberID].prop.salaryRank.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
      rankPeriod.forEach(per => {
        if (per.dateFrom > dateFrom && per.dateFrom < dateTo) {
          pushDay(daysFrom, dateService.shiftDate(Math.max(dateFrom, per.dateFrom)))
        }
        if (per.dateTo >= dateFrom && per.dateTo < dateTo) {
          pushDay(daysTo, dateService.shiftDate(Math.min(dateTo, per.dateTo)))
        }
      })
    }
    if (cont.payEl[accr.payElID].method.code === '6') {
      const expiriencePeriods = getExpiriencePeriods(cont, accr.payElID, dateFrom, dateTo)
      expiriencePeriods.forEach(per => {
        if (per.dateFrom > dateFrom && per.dateFrom < dateTo) {
          pushDay(daysFrom, dateService.shiftDate(Math.max(dateFrom, per.dateFrom)))
        }
        if (per.dateTo > dateFrom && per.dateTo < dateTo) {
          pushDay(daysTo, dateService.shiftDate(Math.min(dateTo, per.dateTo)))
        }
      })
    }
    const payElEntry = cont.payEl[accr.payElID].payElEntrySum.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
    cont.emp[cont.employeeNumberID].permanentAccrual.forEach(perAccr => {
      const payEl = cont.payEl[perAccr.payElID]
      if (payEl.method.groupCode !== 1 &&
        permanentAccrual.payElID !== payEl.ID &&
        perAccr.dateFrom <= permanentAccrual.dateTo &&
        perAccr.dateTo >= permanentAccrual.dateFrom &&
        !calcPayEl.find(o => o === payEl.ID) &&
        payElEntry.find(o => o.payElBaseID === payEl.ID)
      ) {
        if (perAccr.dateFrom > dateFrom && perAccr.dateFrom < dateTo) {
          pushDay(daysFrom, dateService.shiftDate(Math.max(dateFrom, perAccr.dateFrom)))
        }
        if (perAccr.dateTo >= dateFrom && perAccr.dateTo < dateTo) {
          if (perAccr.dateTo > dateFrom) {
            pushDay(daysTo, dateService.shiftDate(Math.min(dateTo, perAccr.dateTo)))
          } else {
            const nd = dateService.shiftDate(Math.min(dateTo, perAccr.dateTo))
            if (!daysTo.find(o => o.getTime() === nd.getTime())) {
              daysTo.push(nd)
            }
          }
        }
        getPeriods(perAccr, perAccr.dateFrom, perAccr.dateTo, calcPayEl.slice(0))
      }
    })
  }

  getPeriods(permanentAccrual, perDateFrom, perDateTo)

  const payElRate = cont.payEl[permanentAccrual.payElID].payElRate.filter(o => o.dateFrom <= perDateTo && o.dateTo >= perDateFrom)
  payElRate.forEach(rate => {
    if (rate.dateFrom > perDateFrom && rate.dateFrom < perDateTo) {
      pushDay(daysFrom, dateService.shiftDate(Math.max(perDateFrom, rate.dateFrom)))
    }
    if (rate.dateTo > perDateFrom && rate.dateTo < perDateTo) {
      pushDay(daysTo, dateService.shiftDate(Math.min(perDateTo, rate.dateTo)))
    }
  })
  daysFrom = daysFrom.sort((a, b) => (a.getTime() - b.getTime()))
  daysTo = daysTo.sort((a, b) => (a.getTime() - b.getTime()))
  let day = dateService.shiftDate(perDateFrom)
  while (day <= perDateTo) {
    let df = daysFrom.find(o => o > day)
    let dt = daysTo.find(o => o >= day)
    if (df && dt) {
      if (dt < df) {
        resultPeriods.push({
          dateFrom: dateService.shiftDate(day),
          dateTo: dateService.shiftDate(dt)
        })
        day = dateService.addDays(dt, 1)
      } else {
        resultPeriods.push({
          dateFrom: dateService.shiftDate(day),
          dateTo: dateService.addDays(df, -1)
        })
        day = df
      }
    } else if (df) {
      resultPeriods.push({
        dateFrom: dateService.shiftDate(day),
        dateTo: dateService.addDays(df, -1)
      })
      day = df
    } else if (dt) {
      resultPeriods.push({
        dateFrom: dateService.shiftDate(day),
        dateTo: dateService.shiftDate(dt)
      })
      day = dateService.addDays(dt, 1)
    } else {
      day = perDateTo
    }
  }
  return resultPeriods
}

function getExpiriencePeriods (cont, payElID, dateFrom, dateTo) {
  const payEl = cont.payEl[payElID]
  const experiencePeriod = []
  const experience = cont.emp[cont.employeeNumberID].prop.experience.find(o => o.dictExperienceID === payEl.dictExperienceID)
  let calcDate = experience ? dateService.shiftDate(experience.calcDate) : experienceService.calculateExperience(cont.employeeNumberID, payEl.dictExperienceID, dateFrom, null, false, cont).calcDate
  if (payEl.surchargeExperience === '2') {
    calcDate = dateService.firstDayOfMonth(dateService.addMonths(calcDate, 1))
  }
  let calcDateTo = calcDate.getDate() < dateTo.getDate() ? dateService.shiftDate((dateService.shiftDate(dateTo)).setDate(calcDate.getDate())) : dateService.shiftDate(dateTo)
  if (experience && experience.startCalcDate && dateService.shiftDate(experience.startCalcDate) < calcDateTo) {
    calcDateTo = dateService.shiftDate(experience.startCalcDate)
  }
  // Для diffDate завжди додаємо 1 день, щоб дата на яку розраховується стаж включалася в розмір стажу. Стаж у організації на дату прийому === 1 день, а не 0.
  const diffDateFrom = dateService.getYmd(calcDate, dateFrom, true)
  const diffDateTo = dateService.getYmd(calcDate, calcDateTo, true)
  const payElExperience = payEl.payElExperience.filter(o => dateService.shiftDate(o.dateFrom) <= dateTo && dateService.shiftDate(o.dateTo) >= dateFrom)
  let date = dateService.shiftDate(dateFrom)
  let idx = -1
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const exp = _.findLast(payElExperience,
      o => (o.years * 12 + o.months) < ((date < calcDateTo ? diffDateFrom.years : diffDateTo.years) * 12 +
        (date < calcDateTo ? (diffDateFrom.months + (diffDateFrom.days > 0 ? 1 : 0)) : (diffDateTo.months + (diffDateTo.days > 0 ? 1 : 0)))) &&
        o.dateFrom <= date && o.dateTo >= date)
    if (exp) {
      if (!experiencePeriod.length) {
        experiencePeriod.push({
          rate: exp.rate,
          dateFrom: dateService.shiftDate(date),
          dateTo: dateService.shiftDate(date)
        })
        idx++
      } else {
        if (experiencePeriod[idx].rate === exp.rate) {
          experiencePeriod[idx].dateTo = dateService.shiftDate(date)
        } else {
          experiencePeriod.push({
            rate: exp.rate,
            dateFrom: dateService.shiftDate(date),
            dateTo: dateService.shiftDate(date)
          })
          idx++
        }
      }
    }
    date = dateService.addDays(date, 1)
  }
  return experiencePeriod
}

function getExpirience (cont, payElID, onDate, byMethod) {
  const payEl = cont.payEl[payElID]
  const experience = cont.emp[cont.employeeNumberID].prop.experience.find(o => o.dictExperienceID === payEl.dictExperienceID)
  const calcDate = experience ? dateService.shiftDate(experience.calcDate) : cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom
  const diffDate = (!experience && byMethod)
    ? experienceService.calculateExperience(cont.employeeNumberID, payEl.dictExperienceID, onDate, null, false, cont)
    : dateService.getYmd(calcDate, onDate, true)
  const exp = _.findLast(payEl.payElExperience,
    o => (o.years * 12 + o.months) <= (diffDate.years * 12 + diffDate.months) &&
      dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
  diffDate.rate = exp ? exp.rate : 0

  return diffDate
}

function getRateExperienceByYears (cont, payElID, onDate, years) {
  return getRateExperienceByMonths(cont, payElID, onDate, years * 12)
}

function getRateExperienceByMonths (cont, payElID, onDate, months) {
  let exp = 0
  if (cont.payEl && cont.payEl[payElID] && cont.payEl[payElID].payElExperience && cont.payEl[payElID].payElExperience.length) {
    const filtered = cont.payEl[payElID].payElExperience.filter(o => (o.years * 12 + o.months) <= months &&
      dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
    if (filtered.length) {
      if (filtered.length === 1) {
        exp = filtered[0].rate
      } else {
        const sorted = filtered.sort((a, b) => (a.years * 12 + a.months) < (b.years * 12 + b.months))
        exp = sorted[0].rate
      }
    }
  } else {
    const filtered = cont.dict.hr_dictIllnessPercent.filter(o => o.minMonths <= months &&
      dateService.shiftDate(o.dateFrom) <= onDate && dateService.shiftDate(o.dateTo) >= onDate)
    if (filtered.length) {
      if (filtered.length === 1) {
        exp = filtered[0].value
      } else {
        const sorted = filtered.sort((a, b) => a.minMonths < b.minMonths)
        exp = sorted[0].value
      }
    }
  }
  return exp
}

function sumAccrualDtByDictFundSource (accrualDt, addAccrualDt) {
  if (typeof addAccrualDt === 'object') {
    addAccrualDt.forEach(accr => {
      const accDt = accrualDt.find(o => o.dictFundSourceID === accr.dictFundSourceID)
      if (accDt) {
        accDt.paySum += accr.paySum
        accDt.paySum = accrualService.round(accDt.paySum, 2)
      } else {
        accrualDt.push({
          dictFundSourceID: accr.dictFundSourceID,
          dictProgClassID: accr.dictProgClassID,
          dictProjectID: accr.dictProjectID,
          paySum: accrualService.round(accr.paySum, 2)
        })
      }
    })
  }
  return accrualDt
}

function getPlanTime (orgID, workScheduleID, dateFrom, dateTo, cont) {
  const planByOrgID = ((cont && cont.constants) ? cont.constants.hrUsePlanByOrg : settingsService.getByCode('hrUsePlanByOrg', orgID))
  const plan = UB.Repository('tim_plan')
    .attrs(['workHours'])
    .where('organizationID', '=', planByOrgID || orgID)
    .where('workScheduleID', '=', workScheduleID)
    .where('workHours', '>', 0)
    .where('dayDate', '>=', dateFrom)
    .where('dayDate', '<=', dateTo)
    .orderBy('dayDate')
    .selectAsObject()
  const result = { days: 0, hours: 0 }
  plan.forEach(planDay => {
    result.days += planDay.workHours > 0 ? 1 : 0
    result.hours += planDay.workHours
  })
  return result
}

function getPlanTimeByTimeCost (cont, orgID, workScheduleID, mask, dateFrom, dateTo, payElTimeCost = [], dayAverageCondition) {
  const planByOrgID = ((cont && cont.constants) ? cont.constants.hrUsePlanByOrg : settingsService.getByCode('hrUsePlanByOrg', orgID))
  const result = {
    days: 0,
    hours: 0,
    mask: 0
  }
  const plan = UB.Repository('tim_plan')
    .attrs(['ID', 'dayDate', 'dictTimeCostID', 'dictTimeCostID.timeCostType', 'workHours'])
    .where('organizationID', '=', planByOrgID || orgID)
    .where('workScheduleID', '=', workScheduleID)
    .where('dayDate', '>=', dateFrom)
    .where('dayDate', '<=', dateTo)
    .orderBy('dayDate')
    .selectAsObject({
      'dictTimeCostID.timeCostType': 'timeCostType'
    })
  const onlyWorkDays = dayAverageCondition && !(dayAverageCondition === 'calend') && !(dayAverageCondition === 'noHolidays')
  const holidays = !onlyWorkDays && (dayAverageCondition === 'noHolidays') ? calendarService.getHolidays(dateFrom, dateTo, orgID) : []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const planDay = plan.find(o => dateService.shiftDate(o.dayDate).getTime() === date.getTime())
    if (planDay && (mask & 1 << (date.getDate() - 1)) &&
      !holidays.find(o => o.getTime() === date.getTime()) &&
      ((!onlyWorkDays && !payElTimeCost.find(o => o.dictTimeCostID === planDay.dictTimeCostID &&
        o.dateFrom <= date && o.dateTo >= date)) ||
        (onlyWorkDays && planDay['timeCostType'] === 'WORK'))) {
      result.days++
      result.mask = result.mask | 1 << (date.getDate() - 1)
      result.hours += planDay.workHours
    }
    date = dateService.addDays(date, 1)
  }
  return result
}

function getFactSumFund ({ withDetail, cont, payElID, periodCalc, periodSalary, dateFrom, dateTo, payElBase, fillMask,
  withIncludPayEl, withPayElID, payElExclude, finishWork }) {
  const includeSecondJobs = payElID && (cont.payEl[payElID].includeSecondJobs || cont.payEl[payElID].method.code === '26')
  const periods = [{ periodID: periodSalary.ID }]
  const periodSum = {}
  const isParentEmpInclude = payElID && cont.payEl[payElID].isParentEmployeeNumber
  cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
    if (cont.payEl[accr.payElID].method.groupType === 'PAYMENT') {
      if (accr.periodCalc <= periodCalc.dateFrom && !periods.find(o => o.periodID === accr.periodSalaryID)) {
        periods.push({ periodID: accr.periodSalaryID })
      }
      if (accr.periodSalary < accr.periodCalc && accr.periodCalc <= periodCalc.dateFrom &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
        ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17))) {
        if (!periodSum[accr.periodSalaryID]) {
          periodSum[accr.periodSalaryID] = { sicknessSum: 0, restSum: 0, sicknessDays: 0, payElSum: {} }
        }
        if (cont.sicknessPayEls.includes(accr.payElID)) {
          periodSum[accr.periodSalaryID].sicknessSum = accrualService.round(periodSum[accr.periodSalaryID].sicknessSum + accr.paySum)
          if (['14', '15', '57', '140'].includes(cont.payEl[accr.payElID].method.code)) {
            periodSum[accr.periodSalaryID].sicknessDays += accr.days
          }
        } else {
          if (periodSum[accr.periodSalaryID].payElSum[accr.payElID]) {
            periodSum[accr.periodSalaryID].payElSum[accr.payElID] = accrualService.round(periodSum[accr.periodSalaryID].payElSum[accr.payElID] + accr.paySum)
          } else {
            periodSum[accr.periodSalaryID].payElSum[accr.payElID] = accr.paySum
          }
          periodSum[accr.periodSalaryID].restSum = accrualService.round(periodSum[accr.periodSalaryID].restSum)
        }
      }
    }
  })
  cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
    if (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' && accr.periodSalary < accr.periodCalc && accr.periodCalc <= periodCalc.dateFrom &&
      (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && !cont.sicknessPayEls.includes(accr.payElID) &&
      (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) && ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17))) {
      const period = periods.find(o => o.periodID === accr.periodSalaryID)
      if (period && periodSum[period.periodID] && periodSum[period.periodID].payElSum &&
        (((periodSum[period.periodID].sicknessSum > 0 && periodSum[period.periodID].payElSum[accr.payElID] < 0) ||
          (periodSum[period.periodID].sicknessSum < 0 && periodSum[period.periodID].payElSum[accr.payElID] > 0)) ||
          (periodSum[period.periodID].sicknessSum === 0 && periodSum[period.periodID].sicknessDays !== 0 &&
            ((periodSum[period.periodID].sicknessDays > 0 && periodSum[period.periodID].payElSum[accr.payElID] < 0) ||
              (periodSum[period.periodID].sicknessDays < 0 && periodSum[period.periodID].payElSum[accr.payElID] > 0))
          ))) {
        period[accr.payElID] = true // hasSickness
      }
    }
  })

  let paySum = 0
  const factDetail = []
  const includPayEl = []
  if (!fillMask || fillMask === 0) {
    fillMask = getFillMaskByPeriod(dateFrom, dateTo)
  }
  if (!payElBase) {
    payElBase = []
  }
  let factSum = cont.emp[cont.employeeNumberID].accrual.reduce((sum, accr) => {
    if (((accr.periodCalcID === periodSalary.ID && accr.periodCalc <= periodCalc.dateFrom && (!(accr.flagsRec & 1 << 12) || includeSecondJobs) &&
      !(accr.periodSalary < periodSalary.dateFrom && (periods.find(o => o.periodID === accr.periodSalaryID && o[accr.payElID]))) &&
      payElBase.find(o => o.payElBaseID === accr.payElID)) ||
      (accr.periodSalaryID === periodSalary.ID && accr.periodCalc <= periodCalc.dateFrom &&
        (!(accr.flagsRec & 1 << 12) || includeSecondJobs) && periods.find(o => o.periodID === accr.periodSalaryID && o[accr.payElID]) &&
        payElBase.find(o => o.payElBaseID === accr.payElID))) && (isParentEmpInclude || !(accr.flagsRec & 1 << 16)) &&
      ((isParentEmpInclude && includeSecondJobs) || !(accr.flagsRec & 1 << 17)) &&
      (!finishWork || finishWork >= accr.periodCalc || (!payElExclude || !payElExclude.find(o => o.payElBaseID === accr.payElID))) &&
      ((accr.periodSalaryID === periodSalary.ID) || (accr.periodSalary < periodSalary.dateFrom && dateFrom.getTime() === periodSalary.dateFrom.getTime()) ||
        (accr.periodSalary > periodSalary.dateTo && dateTo.getTime() === periodSalary.dateTo.getTime()))
    ) {
      const elBase = payElBase.find(o => o.payElBaseID === accr.payElID)
      const accPeriod = cont.org.orgPeriods.find(o => o.ID === accr.periodSalaryID) || { dateFrom, dateTo }
      let baseElMask = getFillMaskByPeriod(
        dateService.shiftDate(Math.max(accPeriod.dateFrom, elBase.dateFrom ? dateService.shiftDate(elBase.dateFrom) : accPeriod.dateFrom,
          (dateFrom && dateFrom.getMonth() === accPeriod.dateFrom.getMonth() && dateFrom.getFullYear() === accPeriod.dateFrom.getFullYear()) ? dateFrom : accPeriod.dateFrom)),
        dateService.shiftDate(Math.min(accPeriod.dateTo, elBase.dateTo ? dateService.shiftDate(elBase.dateTo) : accPeriod.dateTo,
          (dateTo && dateTo.getMonth() === accPeriod.dateTo.getMonth() && dateTo.getFullYear() === accPeriod.dateTo.getFullYear()) ? dateTo : accPeriod.dateTo))
      )
      if (periodSalary.ID === accr.periodSalaryID) {
        baseElMask = baseElMask & fillMask
        if (accr.dateTo.getDate() > periodSalary.dateTo.getDate()) {
          accr.dateTo = dateService.shiftDate(accr.dateTo.setDate(periodSalary.dateTo.getDate()))
        }
      }
      const accrMask = (accr.mask
        ? accr.mask
        : getFillMaskByPeriod(dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, accr.dateFrom)),
          dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, accr.dateTo)))) & ~(accr.maskAdd || 0)
      let mask = accrMask & baseElMask
      if ((accrMask & baseElMask) === accrMask) {
        paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum
      } else if (!accr.mask && periodSalary.dateFrom.getTime() === dateFrom.getTime() && periodSalary.dateTo.getTime() === dateTo.getTime()) {
        paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / periodSalary.dateTo.getDate() * (dateService.dayDiff(dateFrom, dateTo) + 1)
      } else {
        if (accr.planHours && accr.hours) {
          let date = dateService.shiftDate(dateFrom)
          let factHour = 0
          const hoursByDays = accr.hoursByDays ? (typeof accr.hoursByDays === 'string' ? JSON.parse(accr.hoursByDays) : accr.hoursByDays) : null
          if (hoursByDays) {
            for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
              if (hoursByDays[String(day)] > 0) {
                factHour += hoursByDays[String(day)]
              }
              date = dateService.addDays(date, 1)
            }
          } else {
            let accrDays = ((accr.mask || 0).toString(2).match(/1/g) || []).length
            if (cont.payEl[accr.payElID].method.groupCode === 1) {
              factHour = getHoursByTimeSheet(cont, accPeriod, accr.payElID, mask)
            } else {
              let payDays = (mask.toString(2).match(/1/g) || []).length
              factHour = Math.abs(accr.hours) / accrDays * payDays
            }
          }
          paySum = (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / Math.abs(accr.hours) * factHour
        } else {
          let accrDays = ((accr.mask || accrMask).toString(2).match(/1/g) || []).length
          let payDays = (mask.toString(2).match(/1/g) || []).length
          paySum = (accrDays) ? (cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum / accrDays * payDays : 0
        }
      }
      paySum = accrualService.round(paySum, 2)
      sum += paySum
      if (withIncludPayEl) {
        includPayEl.push(Object.assign(Object.assign({}, accr), { paySum: paySum }))
      }
      if (withDetail && paySum !== 0 && !(accr.flagsRec & 1 << 12)) {
        if (accr.accrualDt && accr.accrualDt.length) {
          accr.accrualDt.forEach(accDt => {
            const dtPaySum = accrualService.round((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accDt.paySum * paySum / accr.paySum, 2)
            factDetail.push(Object.assign(Object.assign(Object.assign({}, accDt),
              { paySum: dtPaySum }), withPayElID ? { payElID: accr.payElID, sourceSum: dtPaySum } : {}))
          })
        } else {
          factDetail.push(Object.assign({ paySum: paySum || 0 }, withPayElID ? { payElID: accr.payElID, sourceSum: paySum } : {},
            { dictFundSourceID: accr.dictFundSourceID, dictProjectID: accr.dictProjectID, dictProgClassID: accr.dictProgClassID, dictPositionID: accr.dictPositionID }))
        }
      }
    }
    return accrualService.round(sum, 2)
  }, 0)
  if (withDetail || withIncludPayEl) {
    return {
      factSum,
      accrualDt: (!withPayElID)
        ? calcGroupSumAccrualDt(factDetail, factSum, (!payElID || cont.payEl[payElID].method.groupType !== 'OFFTAKE'))
        : factDetail,
      includPayEl
    }
  } else {
    return factSum
  }
}

function getSumSecJobs (cont, employeeNumberID, periodID, payElID) {
  if (cont.payEl[payElID].includeSecondJobs) {
    let paySum = 0
    let baseSum = 0
    cont.emp[employeeNumberID].accrual.forEach(accr => {
      if (accr.periodSalaryID === periodID && payElID === accr.payElID && accr.flagsRec & 1 << 12) {
        paySum = accrualService.round(paySum + accr.paySum, 2)
        baseSum = accrualService.round(baseSum + (accr.baseSum || 0), 2)
      }
    })
    return { paySum, baseSum }
  } else {
    return { paySum: 0, baseSum: 0 }
  }
}

function getChangeSalaryByPeriod (cont, perDateFrom, perDateTo) {
  const salaryAccrual = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
    if (pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
      if (!salaryAccrual.length || salaryAccrual[salaryAccrual.length - 1].accrualSum !== pos.accrualSum ||
        salaryAccrual[salaryAccrual.length - 1].mtCount !== pos.mtCount
      ) {
        salaryAccrual.push({
          payElID: pos.payElID,
          accrualSum: pos.accrualSum,
          mtCount: pos.mtCount,
          workScheduleID: pos.workScheduleID,
          dateFrom: dateService.shiftDate(Math.max(perDateFrom, pos.dateFrom)),
          dateTo: dateService.shiftDate(Math.min(perDateTo, pos.dateTo))
        })
      } else {
        salaryAccrual[salaryAccrual.length - 1].dateTo = dateService.shiftDate(Math.min(perDateTo, pos.dateTo))
      }
    }
  })
  return salaryAccrual
}

function getChangePayPeriodWithLeading (cont, perAccrual, perDateFrom, perDateTo) {
  const result = []
  const salaryAccrual = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
    if (pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
      salaryAccrual.push({
        payElID: pos.payElID,
        accrualSum: pos.accrualSum,
        mtCount: pos.mtCount,
        dateFrom: (!salaryAccrual.length && pos.dateFrom > perDateFrom) ? perDateFrom : dateService.shiftDate(Math.max(perDateFrom, pos.dateFrom)),
        dateTo: dateService.shiftDate(Math.min(perDateTo, pos.dateTo))
      })
    }
  })
  if (salaryAccrual.length) {
    salaryAccrual[salaryAccrual.length - 1].dateTo = perDateTo
  }
  salaryAccrual.forEach(accr => {
    getChangePayPeriod(cont, perAccrual, accr.dateFrom, accr.dateTo).forEach(changePeriod => {
      result.push({
        dateFrom: changePeriod.dateFrom,
        dateTo: changePeriod.dateTo,
        payElID: accr.payElID,
        accrualSum: accr.accrualSum,
        mtCount: accr.mtCount
      })
    })
  })
  return result
}

function getPlanSumByPeriod (period, cont, payElID) {
  let planSum = 0
  const perAccrual = {
    payElID: payElID,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo
  }
  let periodPlanHour = 0
  const periodTimeSheets = []
  const timeSheets = getTimeSheetByPeriod(period, cont)
  timeSheets.forEach(o => {
    periodPlanHour = accrualService.round(periodPlanHour + (o.normHour || 0))
    periodTimeSheets.push(o)
  })
  const salaryAccrual = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
    if (pos.dateFrom <= period.dateTo && pos.dateTo >= period.dateFrom) {
      salaryAccrual.push({
        payElID: pos.payElID,
        accrualSum: pos.accrualSum,
        dateFrom: (!salaryAccrual && pos.dateFrom > period.dateFrom) ? period.dateFrom : dateService.shiftDate(Math.max(period.dateFrom, pos.dateFrom)),
        dateTo: dateService.shiftDate(Math.min(period.dateTo, pos.dateTo))
      })
    }
  })
  if (salaryAccrual.length) {
    salaryAccrual[salaryAccrual.length - 1].dateTo = period.dateTo
  }
  salaryAccrual.forEach(accr => {
    getChangePayPeriod(cont, perAccrual, accr.dateFrom, accr.dateTo).forEach(changePeriod => {
      const onDate = dateService.shiftDate(Math.min(period.dateTo, changePeriod.dateTo))
      let periodPlanSum = getPlanSum(onDate, cont, perAccrual, accr)
      let hours = 0
      periodTimeSheets.forEach(o => {
        if (o.dateWork >= changePeriod.dateFrom && o.dateWork <= changePeriod.dateTo) {
          hours = accrualService.round(hours + (o.normHour || 0))
        }
      })
      planSum = accrualService.round(planSum + (periodPlanHour ? (periodPlanSum / periodPlanHour * hours) : 0))
    })
  })

  return planSum
}

function getTimeSheetByPeriod (period, cont) {
  if (!cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod) {
    cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod = {}
  }
  if (!cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod[period.ID]) {
    cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod[period.ID] =
      cont.emp[cont.employeeNumberID].prop.timeSheets
        ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= period.dateFrom && o.dateWork <= period.dateTo && (!o.employeeNumberID || o.employeeNumberID === cont.employeeNumberID))
        : []
  }
  return cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod[period.ID]
}
function getTimeSheetByPeriodLoad (period, cont) {
  const result = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'dateWork', 'planTimeCostID', 'factTimeCostID', 'factHour', 'factHourNight',
      'factHourEvening', 'planHour', 'normHour', 'normMonthDay', 'normMonthHour', 'planHourNight', 'planHourEvening', 'planTimeCostID.timeCostType',
      'factTimeCostID.timeCostType', 'factTimeCostID.isFactHour', 'mtCount', 'orderID', 'isCorrection',
      'planID.workScheduleID.isDayAsPlan', 'factHourHarmful', 'employeeNumberID', 'typeSheetChange',
      'planID.workScheduleID.isSummarized', 'planID.workScheduleID.periodSummarized', 'factHourDop'])
    .where('employeeNumberID', '=', cont.employeeNumberID)
    .where('isActive', '=', 1)
    .where('dateWork', '>=', period.dateFrom)
    .where('dateWork', '<=', period.dateTo)
    .orderBy('dateWork')
    .selectAsObject({
      'planTimeCostID.timeCostType': 'planTimeCostType',
      'factTimeCostID.timeCostType': 'factTimeCostType',
      'factTimeCostID.isFactHour': 'isFactHour',
      'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan'
    })
  result.forEach(row => {
    row.dateWork = dateService.shiftDate(row.dateWork)
  })
  return result
}

function getTaxIndividAcc (cont, permanentAccrual, perDateFrom, perDateTo, periodSalary, calcMethods, calcType) {
  const taxIndividAcc = []
  if (permanentAccrual.length) {
    // Розрахунок по видам доходів
    const payElTaxIndividEntry = []
    permanentAccrual.forEach(perm => {
      cont.payEl[perm.payElID].payElTaxIndividEntry.filter(o => o.dateFrom <= perDateTo && o.dateTo >= perDateFrom).forEach(taxInd => {
        if (!payElTaxIndividEntry.find(o => o.taxIndividID === taxInd.taxIndividID)) {
          taxInd.notUseBenefits = !!cont.payEl[perm.payElID].notUseBenefits
          payElTaxIndividEntry.push(taxInd)
        }
      })
    })
    if (payElTaxIndividEntry.length) {
      const year = perDateFrom.getFullYear()
      const livingCost = cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= perDateFrom)
      const workingPersonLivingCost = livingCost ? livingCost.workingPerson : 0
      const yearAgo = dateService.addMonths(periodSalary.dateFrom, -11)
      let socialMaxBase = 1.4
      let childMaxBase = 1.4
      let accrualDt = []
      // Пільги
      let socialKof = 0
      let childKof = 0
      let socialCount = 0
      let childCount = 0
      let socialTaxLimit
      const childTaxLimit = []
      let paySum = 0
      let baseSum = 0
      let useTaxFreeSum = {}
      const secJobAccrual = cont.emp[cont.employeeNumberID].accrual.filter(o => o.periodSalaryID === periodSalary.ID && (o.flagsRec & 1 << 12) && calcMethods.includes(cont.payEl[o.payElID].method.code))
      const taxIndividSecJob = []
      if (secJobAccrual.length) {
        secJobAccrual.forEach(acc => {
          if (acc.taxIndividAcc && acc.taxIndividAcc.length) {
            acc.taxIndividAcc.forEach(taxDt => {
              const taxSec = taxIndividSecJob.find(o => o.taxIndividID === taxDt.taxIndividID)
              if (taxSec) {
                taxSec.paySum = accrualService.round(taxSec.paySum + (taxDt.taxSum || 0), 4)
                taxSec.incomeSum = accrualService.round(taxSec.incomeSum + (taxDt.incomeSum || 0), 4)
                taxSec.privilegeSum = accrualService.round(taxSec.privilegeSum + (taxDt.privilegeSum || 0), 4)
                taxSec.taxFreeSum = accrualService.round(taxSec.taxFreeSum + (taxDt.taxFreeSum || 0), 4)
              } else {
                taxIndividSecJob.push({ taxIndividID: taxDt.taxIndividID, paySum: taxDt.taxSum, incomeSum: taxDt.incomeSum, privilegeSum: taxDt.privilegeSum, taxFreeSum: taxDt.taxFreeSum || 0 })
              }
              const tiCode = (cont.dict.hr_dictTaxIndivid.find(o => o.ID === taxDt.taxIndividID) || {}).code || '0'
              tiCode[tiCode] = accrualService.round((tiCode[tiCode] || 0) + (taxDt.taxFreeSum || 0), 4)
            })
          } else {
            const taxSec = taxIndividSecJob.find(o => o.taxIndividID === null)
            if (taxSec) {
              taxSec.paySum = accrualService.round(taxSec.paySum + acc.paySum, 4)
              taxSec.incomeSum = accrualService.round(taxSec.incomeSum + acc.baseSum, 4)
              taxSec.privilegeSum = accrualService.round(taxSec.privilegeSum + acc.privilegeSum, 4)
              taxSec.taxFreeSum = accrualService.round(taxSec.taxFreeSum + (acc.taxFreeSum || 0), 4)
            } else {
              taxIndividSecJob.push({ taxIndividID: null, paySum: acc.paySum, incomeSum: acc.baseSum, privilegeSum: acc.privilegeSum, taxFreeSum: acc.taxFreeSum || 0 })
            }
          }
        })
      }

      payElTaxIndividEntry.sort((a, b) => a['priority'] - b['priority']).forEach(individ => {
        const indDateFrom = dateService.shiftDate(Math.max(perDateFrom, individ.dateFrom))
        const indDateTo = dateService.shiftDate(Math.min(perDateTo, individ.dateTo))
        const payElBase = _.reduce(cont.payEl, (result, payEl) => {
          if (payEl.payElTaxIndivid.find(o => o.taxIndividID === individ.taxIndividID && o.dateFrom <= indDateTo && o.dateTo >= indDateFrom)) {
            result.push({
              payElBaseID: payEl.ID,
              dateFrom: indDateFrom,
              dateTo: indDateTo
            })
          }
          return result
        }, [])
        const fact = getFactSum({ withDetail: true, cont, payElID: permanentAccrual[0].payElID, periodCalc: periodSalary, periodSalary, dateFrom: indDateFrom, dateTo: indDateTo, payElBase })
        let incomeSum = accrualService.round(fact.factSum)
        let taxFreeSum = 0
        if (fact !== 0) {
          if (individ.code === 126) {
            const rate = (cont.dict.hr_taxRate.find(o => o.yearFrom <= year && o.sumFrom <= Math.abs(fact.factSum)) || { rate: 0 }).rate
            incomeSum = accrualService.round(fact.factSum * (100 / (100 - rate)))
            // taxFreeSum = accrualService.round(fact.factSum - incomeSum)
          } else if (individ.code === 150) {
            taxFreeSum = Math.min(fact.factSum, (accrualService.round(workingPersonLivingCost * 1.4 / 10, 0) * 10 - (useTaxFreeSum[individ.code] || 0)))
            useTaxFreeSum[individ.code] = (accrualService.round(useTaxFreeSum[individ.code] || 0) + taxFreeSum)
            incomeSum = Math.max(0, accrualService.round(fact.factSum))
          } else if (individ.code === 146) {
            taxFreeSum = Math.min(fact.factSum, accrualService.round(workingPersonLivingCost * 1.4 / 10, 0) * 10 * 2 - (useTaxFreeSum[individ.code] || 0))
            useTaxFreeSum[individ.code] = (accrualService.round(useTaxFreeSum[individ.code] || 0) + taxFreeSum)
            incomeSum = Math.max(0, accrualService.round(fact.factSum))
          } else if (individ.code === 169) {
            let priorTaxFree = 0
            cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
              if (accr.periodSalary >= yearAgo && cont.payEl[accr.payElID].method.code === '26' &&
                !(accr.flagsRec & 1 << 12) && accr.taxIndividAcc && accr.taxIndividAcc.length) {
                const individAcc = accr.taxIndividAcc.find(o => o.taxIndividID === individ.taxIndividID)
                if (individAcc) {
                  priorTaxFree = accrualService.round(priorTaxFree + (individAcc.taxFreeSum || 0))
                }
              }
            })
            taxFreeSum = Math.min(fact.factSum, accrualService.round(workingPersonLivingCost * 1.4 / 10, 0) * 10 - priorTaxFree - (useTaxFreeSum[individ.code] || 0))
            useTaxFreeSum[individ.code] = (accrualService.round(useTaxFreeSum[individ.code] || 0) + taxFreeSum)
            incomeSum = Math.max(0, accrualService.round(fact.factSum))
          }
        }
        baseSum = accrualService.round(baseSum + incomeSum)

        taxIndividAcc.push({
          taxIndividID: individ.taxIndividID,
          incomeSum,
          privilegeSum: 0,
          taxFreeSum,
          taxSum: 0,
          accrualDt: fact.accrualDt
        })
      })
      if (49 & calcType | 4 & calcType) {
        const employeeTaxLimit = cont.emp[cont.employeeNumberID].prop.employeeTaxLimit.filter(o => o.dateFrom <= perDateTo && o.dateTo >= perDateFrom &&
          o['taxLimitID.dateFrom'] <= perDateTo && o['taxLimitID.dateTo'] >= perDateFrom)
        employeeTaxLimit.forEach(empTaxLimit => {
          if (empTaxLimit['taxLimitID.taxLimitType'] === '2') {
            if (baseSum <= ((empTaxLimit.amountChild || 0) * (Math.round((workingPersonLivingCost * (empTaxLimit['taxLimitID.maxBase'] || 1.4)) * 0.1) / 0.1))) {
              // дитячі пільги - сумуємо
              childCount += (empTaxLimit.amountChild || 0)
              childKof += (empTaxLimit.amountChild || 0) * (empTaxLimit['taxLimitID.size'] || 0)
              childTaxLimit.push(empTaxLimit.taxLimitID)
              childMaxBase = empTaxLimit['taxLimitID.maxBase'] || 1.4
            }
          } else { // соціальні пільги - вибираємо більшу
            if (baseSum <= ((Math.round((workingPersonLivingCost * (empTaxLimit['taxLimitID.maxBase'] || 1.4)) * 0.1) / 0.1))) {
              socialCount = 1
              socialKof = (socialKof < (empTaxLimit['taxLimitID.size'] || 0)) ? (empTaxLimit['taxLimitID.size'] || 0) : socialKof
              socialTaxLimit = (socialKof < (empTaxLimit['taxLimitID.size'] || 0)) ? empTaxLimit.taxLimitID : socialTaxLimit
              socialMaxBase = empTaxLimit['taxLimitID.maxBase'] || 1.4
            }
          }
        })
      }
      const maxBase = childKof > socialKof ? childMaxBase : socialMaxBase
      const baseThreshold = Math.round((workingPersonLivingCost * maxBase) * 0.1) / 0.1
      const taxLimitValue = Math.max(childKof, socialKof)
      const taxCountLimitValue = childKof > socialKof ? childCount : socialCount
      const allTaxLimitValue = taxCountLimitValue * baseThreshold
      // Поріг застосування пільг
      const privePercent = (cont.dict.hr_taxLimitBase.find(o => o.yearFrom <= year) || { rate: 0 }).rate
      let totalPrivValue = (baseSum < allTaxLimitValue) ? workingPersonLivingCost * (privePercent / 100) * taxLimitValue : 0
      const rates = []
      taxIndividAcc.forEach(acc => {
        const taxIdx = secJobAccrual.length ? taxIndividSecJob.findIndex(o => o.taxIndividID === acc.taxIndividID) : -1
        if (payElTaxIndividEntry.find(o => o.taxIndividID === acc.taxIndividID).taxBreaks &&
          (cont.periodCalc.dateFrom >= periodSalary.dateFrom || !payElTaxIndividEntry.find(o => o.taxIndividID === acc.taxIndividID).notUseBenefits)) {
          acc.privilegeSum = Math.max(0, Math.min(acc.incomeSum, totalPrivValue))
          totalPrivValue = accrualService.round(totalPrivValue - acc.privilegeSum, 4)
        }
        acc.inSum = acc.incomeSum - acc.privilegeSum - ((baseSum < allTaxLimitValue) ? (taxIdx >= 0 ? (taxIndividSecJob[taxIdx].privilegeSum || 0) : 0) : 0) - acc.taxFreeSum
        const rate = (cont.dict.hr_taxRate.find(o => o.yearFrom <= year && o.sumFrom <= Math.abs(acc.inSum)) || { rate: 0 }).rate
        acc.taxSum = accrualService.round(acc.inSum * rate / 100, 2)
        if (secJobAccrual.length) {
          if (taxIdx >= 0) {
            acc.taxSum = accrualService.round(acc.taxSum - (taxIndividSecJob[taxIdx].paySum || 0), 4)
            acc.incomeSum = accrualService.round(acc.incomeSum - (taxIndividSecJob[taxIdx].incomeSum || 0), 4)
            if (baseSum >= allTaxLimitValue) {
              acc.privilegeSum = accrualService.round(acc.privilegeSum - (taxIndividSecJob[taxIdx].privilegeSum || 0), 4)
            }
            acc.inSum = accrualService.round(acc.inSum - ((taxIndividSecJob[taxIdx].incomeSum || 0) - (taxIndividSecJob[taxIdx].privilegeSum || 0)), 4)
            acc.secTaxSum = taxIndividSecJob[taxIdx].paySum || 0
            acc.secIncomeSum = taxIndividSecJob[taxIdx].incomeSum || 0
            acc.secPrivilegeSum = taxIndividSecJob[taxIdx].privilegeSum || 0
            taxIndividSecJob.splice(taxIdx, 1)
          }
        }
        paySum = accrualService.round(paySum + acc.taxSum, 4)

        const taxLimit = {}
        if (socialTaxLimit) {
          taxLimit.taxLimitID1 = socialTaxLimit
        }
        if (childTaxLimit.length) {
          for (let i = 0; i < (socialTaxLimit ? 2 : 3); i++) {
            if (childTaxLimit[i]) {
              taxLimit[`taxLimitID${socialTaxLimit ? i + 2 : i + 1}`] = childTaxLimit[i]
            }
          }
        }
        Object.assign(acc, taxLimit)

        const ratesEl = rates.find(o => o.rate === rate)
        if (!ratesEl) {
          rates.push({
            rate: rate,
            taxIndividAcc: [acc]
          })
        } else {
          ratesEl.taxIndividAcc.push(acc)
        }
      })
      rates.forEach(rateEl => {
        let sum = 0
        let taxSum = 0
        let maxIdx = 0
        rateEl.taxIndividAcc.forEach((acc, idx) => {
          sum = accrualService.round(sum + acc.inSum + (acc.secIncomeSum || 0) - (acc.secPrivilegeSum || 0), 2)
          taxSum = accrualService.round(taxSum + acc.taxSum + (acc.secTaxSum || 0), 2)
          if (acc.taxSum && acc.taxSum > rateEl.taxIndividAcc[maxIdx].taxSum && !(acc.accrualDt || []).reduce((result, dt) => {
            if (!result && (cont.dict.dictFundSourceFSSU || []).includes(dt.dictFundSourceID)) {
              result = true
            }
            return result
          }, false)) {
            maxIdx = idx
          }
        })
        const allTaxSum = accrualService.round(sum * rateEl.rate / 100, 2)
        if (taxSum !== allTaxSum) {
          rateEl.taxIndividAcc[maxIdx].taxSum = accrualService.round(rateEl.taxIndividAcc[maxIdx].taxSum + allTaxSum - taxSum, 2)
        }
      })

      let taxSecSum = 0

      taxIndividSecJob.forEach(taxInd => {
        if (taxInd.taxIndividID) {
          taxIndividAcc.push({
            taxIndividID: taxInd.taxIndividID,
            incomeSum: -1 * taxInd.incomeSum,
            privilegeSum: -1 * taxInd.privilegeSum,
            taxFreeSum: -1 * (taxInd.taxFreeSum || 0),
            taxSum: -1 * taxInd.paySum,
            accrualDt: []
          })
          paySum = accrualService.round(paySum - taxInd.paySum, 4)
          baseSum = accrualService.round(baseSum - taxInd.paySum, 4)
        } else {
          taxSecSum = accrualService.round(taxSecSum + taxInd.paySum, 4)
        }
      })
      if (taxSecSum !== 0) {
        if (paySum === 0) {
          if (taxIndividAcc.length) {
            taxIndividAcc[0].taxSum = accrualService.round(taxIndividAcc[0].taxSum - taxSecSum, 4)
          }
          paySum = accrualService.round(paySum - taxSecSum)
        } else {
          let taxIndividAccSum = 0
          taxIndividAcc.forEach(row => {
            row.taxSum = accrualService.round(row.taxSum - row.taxSum / paySum * taxSecSum, 4)
            taxIndividAccSum = accrualService.round(taxIndividAccSum + row.taxSum)
          })
          baseSum = accrualService.round(baseSum - baseSum / paySum * taxSecSum, 4)
          paySum = accrualService.round(paySum - taxSecSum, 4)
          if (taxIndividAccSum !== paySum && taxIndividAcc.length) {
            taxIndividAcc[0].taxSum = accrualService.round(taxIndividAcc[0].taxSum + taxIndividAccSum - paySum, 4)
          }
        }
      }

      for (let i = taxIndividAcc.length - 1; i >= 0; i--) {
        if (taxIndividAcc[i].taxSum === 0 && taxIndividAcc[i].incomeSum === 0 && taxIndividAcc[i].privilegeSum === 0) {
          taxIndividAcc.splice(i, 1)
        } else {
          delete taxIndividAcc[i].inSum
          delete taxIndividAcc[i].secTaxSum
          delete taxIndividAcc[i].secIncomeSum
          delete taxIndividAcc[i].secPrivilegeSum
          taxIndividAcc[i].taxSum = accrualService.round(taxIndividAcc[i].taxSum)
          taxIndividAcc[i].incomeSum = accrualService.round(taxIndividAcc[i].incomeSum)
          taxIndividAcc[i].privilegeSum = accrualService.round(taxIndividAcc[i].privilegeSum)
          correctAccrualDt(taxIndividAcc[i].accrualDt, taxIndividAcc[i].taxSum)
          taxIndividAcc[i].accrualDt.forEach(row => {
            accrualDt.push(row)
          })
        }
      }
    }
  }
  return taxIndividAcc
}

function getChangeCategoryECBByPeriod (cont, perDateFrom, perDateTo) {
  const changeCategory = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
    if (pos.dictCategoryECBID && pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
      if (!changeCategory.length || changeCategory[changeCategory.length - 1].dictCategoryECBID !== pos.dictCategoryECBID) {
        changeCategory.push({
          dictCategoryECBID: pos.dictCategoryECBID,
          dateFrom: dateService.shiftDate(Math.max(perDateFrom, pos.dateFrom)),
          dateTo: dateService.shiftDate(Math.min(perDateTo, pos.dateTo))
        })
      } else {
        changeCategory[changeCategory.length - 1].dateTo = dateService.shiftDate(Math.min(perDateTo, pos.dateTo))
      }
    }
  })
  if (changeCategory.length) {
    if (changeCategory[0].dateFrom > perDateFrom) {
      changeCategory[0].dateFrom = dateService.shiftDate(perDateFrom)
    }
    if (changeCategory[changeCategory.length - 1].dateTo < perDateTo) {
      changeCategory[changeCategory.length - 1].dateTo = dateService.shiftDate(perDateTo)
    }
  } else {
    const beforePos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dictCategoryECBID && pos.dateTo <= perDateFrom)
    if (beforePos) {
      changeCategory.push({
        dictCategoryECBID: beforePos.dictCategoryECBID,
        dateFrom: dateService.shiftDate(perDateFrom),
        dateTo: dateService.shiftDate(perDateTo)
      })
    } else {
      const afterPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dictCategoryECBID && pos.dateFrom > perDateTo)
      if (afterPos) {
        changeCategory.push({
          dictCategoryECBID: afterPos.dictCategoryECBID,
          dateFrom: dateService.shiftDate(perDateFrom),
          dateTo: dateService.shiftDate(perDateTo)
        })
      }
    }
  }

  return changeCategory
}
function getChangeCategoryECBByPeriods (cont, reCalcPeriod) {
  const calcPeriods = {}
  const dictCategoryECBIDs = []
  const finishWork = (reCalcPeriod && reCalcPeriod.length) ? reCalcPeriod[reCalcPeriod.length - 1].dateTo : cont.periodCalc.dateTo
  const periods = cont.periods.filter(o => o.dateTo >= cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork && o.dateFrom <= finishWork)
  periods.forEach(period => {
    calcPeriods[period.ID] = []
    cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
      if (/* pos.dictCategoryECBID && */ pos.dateFrom <= period.dateTo && pos.dateTo >= period.dateFrom) {
        if (!calcPeriods[period.ID].length || calcPeriods[period.ID][calcPeriods[period.ID].length - 1].dictCategoryECBID !== pos.dictCategoryECBID) {
          calcPeriods[period.ID].push({
            dictCategoryECBID: pos.dictCategoryECBID || null,
            dateFrom: dateService.shiftDate(Math.max(period.dateFrom, pos.dateFrom)),
            dateTo: dateService.shiftDate(Math.min(period.dateTo, pos.dateTo))
          })
          if (pos.dictCategoryECBID && !dictCategoryECBIDs.includes(pos.dictCategoryECBID)) {
            dictCategoryECBIDs.push(pos.dictCategoryECBID)
          }
        } else {
          calcPeriods[period.ID][calcPeriods[period.ID].length - 1].dateTo = dateService.shiftDate(Math.min(period.dateTo, pos.dateTo))
        }
      }
    })
    if (calcPeriods[period.ID].length) {
      if (calcPeriods[period.ID][0].dateFrom > period.dateFrom) {
        calcPeriods[period.ID][0].dateFrom = dateService.shiftDate(period.dateFrom)
      }
      if (calcPeriods[period.ID][calcPeriods[period.ID].length - 1].dateTo < period.dateTo) {
        calcPeriods[period.ID][calcPeriods[period.ID].length - 1].dateTo = dateService.shiftDate(period.dateTo)
      }
    } else {
      const beforePos = _.findLast(cont.emp[cont.employeeNumberID].prop.employeePositions, pos => pos.dateTo <= period.dateFrom)
      if (beforePos) {
        calcPeriods[period.ID].push({
          dictCategoryECBID: beforePos.dictCategoryECBID || null,
          dateFrom: dateService.shiftDate(period.dateFrom),
          dateTo: dateService.shiftDate(period.dateTo)
        })
        if (beforePos.dictCategoryECBID && !dictCategoryECBIDs.includes(beforePos.dictCategoryECBID)) {
          dictCategoryECBIDs.push(beforePos.dictCategoryECBID)
        }
      } else {
        const afterPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dateFrom > period.dateTo)
        if (afterPos) {
          calcPeriods[period.ID].push({
            dictCategoryECBID: afterPos.dictCategoryECBID,
            dateFrom: dateService.shiftDate(period.dateFrom),
            dateTo: dateService.shiftDate(period.dateTo)
          })
          if (!dictCategoryECBIDs.includes(afterPos.dictCategoryECBID)) {
            dictCategoryECBIDs.push(afterPos.dictCategoryECBID)
          }
        }
      }
    }
  })
  return { calcPeriods, dictCategoryECBIDs }
}

function getDaysByMethod (cont, payElID, periodSalaryID, methodCode) {
  const period = cont.periods.find(o => o.ID === periodSalaryID)
  const payElBase = cont.payEl[payElID].payElEntrySum.filter(o => o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom && cont.payEl[o.payElBaseID].method.code === methodCode)
  return cont.emp[cont.employeeNumberID].accrual.reduce((days, accr) => {
    if (accr.periodSalaryID === periodSalaryID &&
      cont.payEl[accr.payElID].method.code === methodCode &&
      !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 16) &&
      payElBase.find(o => o.payElBaseID === accr.payElID) &&
      accr.days > days) {
      return accr.days
    }
    return days
  }, 0)
}

function calcHoursByDays (hoursByDays, hours, mask = 0) {
  hoursByDays = Object.values(hoursByDays)
  const allHours = hoursByDays.reduce((a, b) => a + b, 0)
  hoursByDays = hoursByDays.map(h => allHours ? accrualService.round(h * hours / allHours, 2) : 0)
  const rest = accrualService.round(hours - hoursByDays.reduce((a, b) => a + b, 0), 2)
  if (rest) {
    const idx = hoursByDays.findIndex(o => o)
    if (idx >= 0) {
      hoursByDays[idx] = accrualService.round(hoursByDays[idx] + rest, 2)
    }
  }
  return hoursByDays.reduce((a, b, idx) => {
    a[idx + 1] = b
    return a
  }, {})
}

function getAccrualDtByTariffing (cont, payElBase, periodSalary) {
  const accrualDt = accrualService.getTariffingAccrualList({ cont, periodSalary })
    .filter(o => !payElBase || payElBase.includes(o.payElID))
    .map(o => {
      return Object.assign({
        dictFundSourceID: o.dictFundSourceID,
        dictProgClassID: o.dictProgClassID,
        dictPositionID: o.dictPositionID,
        paySum: o.paySum
      })
    })
  return groupAccrualDt(accrualDt)
}

function getLastPosition (employeePositions, dateFrom, dateTo) {
  const lastPositions = employeePositions.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
  return lastPositions.length ? lastPositions[lastPositions.length - 1] : null
}

function compareObjectsExclude (objA, objB, excludeFields = []) {
  const keysA = Object.keys(objA)
  for (let key of keysA) {
    if (!excludeFields.includes(key) && objA[key] !== objB[key]) {
      return false
    }
  }
  return true
}

function groupAccrualDt (accrualDt) {
  const result = []
  accrualDt.forEach(rec => {
    const index = result.findIndex(o => compareObjectsExclude(o, rec, ['paySum']))
    if (index >= 0) {
      result[index].paySum += rec.paySum
    } else {
      result.push(rec)
    }
  })
  return result
}

function getAccumDaysByPeriod (cont, payElID, dateFrom, dateTo) {
  let resultDay = 0
  if (cont.payEl[payElID].method.dayAccumCondition === 'calend') {
    resultDay = dateService.dateDiff(dateFrom, dateTo)
  } else if (cont.payEl[payElID].method.dayAccumCondition === 'noHolidays') {
    resultDay = dateService.dateDiff(dateFrom, dateTo) - cont.holidays.filter(o => o >= dateFrom && o <= dateTo).length
  } else if (cont.payEl[payElID].method.dayAccumCondition === 'noDaysOff') {
    resultDay = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.planTimeCostType === 'WORK' && o.dateWork >= dateFrom && o.dateWork <= dateTo).length
  } else if (cont.payEl[payElID].method.dayAccumCondition === 'noDaysNormaOff') {
    resultDay = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.normTimeCostType === 'WORK' && o.dateWork >= dateFrom && o.dateWork <= dateTo).length
  }
  return resultDay
}

function getAccrualForPayFSS(contAccrual, orgID, employeeID, periodCalcID) {
  const payElIDs = contAccrual.map(item => item.payElID)
  const accrual = UB.Repository('hr_accrual').attrs(['ID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary', 'employeeNumberID', 'payElID', 'flagsRec',
    'flagsFix', 'baseSum', 'rate', 'mask', 'paySum', 'dateFrom', 'dateTo', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'calcParams', 'source', 'sourceID'])
    .where('orgID', '=', orgID)
    .where('employeeNumberID', '=', employeeID)
    .where('periodCalcID', '=', periodCalcID)
    .where('payElID', 'in', payElIDs)
    .selectAsObject()
  accrual.forEach(acc => {
    const accrualDt = UB.Repository('hr_accrualDt').attrs(['*']).where('accrualID', '=', acc.ID).selectAsObject()
    if (accrualDt) acc.accrualDt = accrualDt
  })
  return accrual
}