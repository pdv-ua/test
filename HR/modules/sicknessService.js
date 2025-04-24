const UB = require('@unitybase/ub')
const periodService = require('../../HR/modules/periodService')
const dateService = require('../../AC/modules/dataServices/dateService')
const averageService = require('../../HR/modules/averageService')
const calendarService = require('../../HR/modules/calendarService')
const algorithmSickness = require('../modules/algorithm/sickness') // Лікарняний
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const employeeService = require('../../HR/modules/employeeService')

module.exports = {
  calculateSickness,
  getParentSickness,
  getExpirienceAndRate,
  getParentAccrual
}

function calculateSickness ({ orgID, cont, orderParams }) {
  if (!orderParams.recalculate) {
    const rlService = require('../../HR/modules/rlService')
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
  cont.employeeNumberID = orderParams.employeeNumberID
  const existAccruals = !!(orderParams.accruals && orderParams.accruals.length)
  let resultCalculate
  let periodCalc = cont.periodCalc || periodService.getPeriod(orderParams.periodCalcID)
  const parentSickness = {}

  orderParams.flagsRec = (orderParams.flagsRec || 0) | 2

  orderParams.dateFrom = dateService.shiftDate(orderParams.dateFrom)
  orderParams.dateTo = dateService.shiftDate(orderParams.dateTo)
  let sicknessDateFrom = orderParams.dateFrom
  if (orderParams.dateFirst && dateService.shiftDate(orderParams.dateFirst) < dateService.shiftDate(orderParams.dateFrom)) {
    sicknessDateFrom = dateService.shiftDate(orderParams.dateFirst)
  }
  if (orderParams.parentSicknessID) {
    if (!orderParams.recalculate) {
      getParentSickness(orderParams.parentSicknessID, parentSickness)
      sicknessDateFrom = parentSickness.dateFrom
      const sicknessFields = ['avgCalcType', 'standingAll', 'standingYearMonth', 'rate', 'dateFromAvg', 'dateToAvg',
        'avgSum', 'calcSum', 'minSalary', 'maxECB', 'maxECBDay', 'parentAccrualID', 'dateFirst']
      const docRegSickness = UB.Repository('hr_docRegSickness').attrs(sicknessFields).selectById(parentSickness.ID)
      if (!docRegSickness.parentAccrualID) {
        sicknessFields.forEach(fieldName => {
          if (['dateFromAvg', 'dateToAvg'].includes(fieldName)) {
            orderParams[fieldName] = dateService.shiftDate(docRegSickness[fieldName])
          } else {
            orderParams[fieldName] = docRegSickness[fieldName]
          }
        })
        orderParams.avgOnDate = parentSickness.dateFrom
        orderParams.baseSum = docRegSickness.avgSum
        orderParams.flagsRec = 2 | (docRegSickness['avgCalcType'] === 'FACT' ? (1 << 7) : docRegSickness['avgCalcType'] === 'PLAN' ? (1 << 8) : (1 << 6))
        orderParams.flagsFix = orderParams.flagsFix | 1 << 0 | 1 << 9 | 1 << 10 | 1 << 11 | 1 << 21 | 1 << 20 | 1 << 22

        orderParams.accrualsAvg = UB.Repository('hr_accrualAvg')
          .attrs(['periodID.name', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'baseSum', 'opSum', 'opKoef', 'periodID', 'accrualDt'])
          .where('orderID', '=', parentSickness.ID)
          .selectAsObject()
        orderParams.accrualsAvg.forEach(avg => {
          avg.flagsFix = 131137 // (1 << 0) | 1 << 6 | 1 << 17
        })
      } else {
        getParentAccrual(docRegSickness.parentAccrualID, parentSickness)
        sicknessDateFrom = docRegSickness.dateFirst || parentSickness.dateFrom
        const pAccr = UB.Repository('hr_accrual')
          .attrs(['*'])
          .selectById(parentSickness.ID || orderParams.parentAccrualID)
        if (pAccr) {
          getParentAccrualData(orderParams, pAccr, sicknessDateFrom)
        }
      }
    }
  } else if (orderParams.parentAccrualID) {
    getParentAccrual(orderParams.parentAccrualID, parentSickness)
    sicknessDateFrom = parentSickness.dateFrom
    const pAccr = UB.Repository('hr_accrual')
      .attrs(['*'])
      .selectById(parentSickness.ID || orderParams.parentAccrualID)
    if (pAccr) {
      getParentAccrualData(orderParams, pAccr, sicknessDateFrom)
    }
  }
  if (!orderParams.avgOnDate) {
    orderParams.avgOnDate = orderParams.dateFrom
  }

  if (!orderParams.sicknessDt) {
    orderParams.sicknessDt = orderParams.orderID ? UB.Repository('hr_docRegSicknessDt')
      .attrs('ID', 'dateFrom', 'dateTo', 'illnessRegime')
      .where('docRegSicknessID', '=', orderParams.orderID)
      .orderBy('dateFrom')
      .selectAsObject() : []
  }
  orderParams.sicknessDt.forEach(det => {
    det.dateFrom = dateService.shiftDate(det.dateFrom)
    det.dateTo = dateService.shiftDate(det.dateTo)
  })

  let dictIllnessReason = orderParams.dictIllnessReasonID ? UB.Repository('hr_dictIllnessReason')
    .attrs(['ID', 'code', 'payElFOPID', 'maxDayFOP', 'payElFSSUID', 'payElFSSUID.methodID.code', 'payElUnpaidID'])
    .selectById(orderParams.dictIllnessReasonID) : null

  orderParams.payElID = dictIllnessReason ? dictIllnessReason.payElFSSUID : orderParams.payElID

  if (!existAccruals) {
    // Розділення по періодам
    setSplitPeriod(cont, orgID, orderParams.employeeNumberID, orderParams, periodCalc, dictIllnessReason, parentSickness, sicknessDateFrom)
  }
  orderParams.dayCount = orderParams.notPay ? 0 : orderParams.accruals.reduce((days, accr) => { return days + accr.days }, 0)
  const employeeSickLimit = UB.Repository('hr_employeeSickLimit')
    .attrs(['ID', 'avgSum', 'typeSickLimit', 'employeeFamilyID'])
    .where('employeeID', '=', cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID)
    .where('dateFrom', '<=', sicknessDateFrom)
    .where('dateTo', '>=', sicknessDateFrom)
    .selectAsObject()

  // Розрахунок стажу і коефіцієнту
  getExpirienceAndRate({
    cont,
    orderParams,
    sicknessDateFrom,
    dictIllnessReason,
    employeeSickLimit
  })

  if (!orderParams.parentSicknessID) {
    const baseECV = cont.dict.hr_maxBaseECB.find(o => o.dateFrom <= sicknessDateFrom) || {}
    orderParams.maxECB = baseECV.maxSum || 0
    orderParams.maxECBDay = (baseECV.maxSum || 0) / 30.44
    const minSalaryRec = cont.dict.hr_dictSalaryMinSize.find(o => o.dateFrom <= sicknessDateFrom)
    orderParams.minSalary = minSalaryRec.monthValue / 30.44
  }
  // Розрахунок середнього заробітку за попередні періоди
  if (!(orderParams.flagsRec & 1 << 7) && !(orderParams.flagsRec & 1 << 8)) {
    resultCalculate = averageService.calculateSicknessAverage({ orgID, cont, params: orderParams, sicknessDateFrom })
  }
  // Розрахунок середнього заробітку від фактичної суми
  if (!resultCalculate && orderParams.avgCalcType === 'FACT' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 8)) {
    // let dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg) : dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
    const dateFrom = (orderParams.flagsFix & 1 << 10) ? dateService.shiftDate(orderParams.dateFromAvg)
      : dateService.shiftDate(Math.max(dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom),
        dateService.addMonths(orderParams.dateFrom, -1 * cont.payEl[orderParams.payElID].calcMounth)))
    const dateTo = (orderParams.flagsFix & 1 << 11) ? dateService.shiftDate(orderParams.dateToAvg) : dateService.addDays(orderParams.dateFrom, -1)
    averageService.calculateSicknessAverageFact({ orgID, cont, params: orderParams, dateFrom, dateTo })
  }
  // Розрахунок середнього заробітку від планової суми
  if (!resultCalculate && orderParams.avgCalcType === 'PLAN' && !(orderParams.flagsRec & 1 << 6) && !(orderParams.flagsRec & 1 << 7)) {
    const onDate = dateService.shiftDate(orderParams.dateFrom)
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.dateTo >= onDate && o.dateFrom <= onDate)
      : periodService.getPeriodOnDate(orgID, onDate)
    averageService.calculateSicknessAveragePlan({ orgID, cont, params: orderParams, periodCalc: periodSalary, onDate })
  }
  if (!orderParams.baseSum) {
    orderParams.baseSum = 0
  }
  if (cont.payEl[orderParams.payElID].roundAvgUpTo) {
    orderParams.baseSum = accrualService.roundPayEl(orderParams.baseSum, cont.payEl[orderParams.payElID].roundAvgUpTo)
  }
  let avgSum = Math.min(orderParams.maxECBDay, orderParams.baseSum)
  const chsEmployeeSick = employeeSickLimit.find(o => o.typeSickLimit === '4')
  if (!(orderParams.flagsFix & 1 << 22)) {
    orderParams.calcSum = avgSum / 100 * orderParams.rate
    if (cont.payEl[orderParams.payElID].method.code !== '20' && orderParams.standingYearMonth < 6) {
      orderParams.calcSum = Math.min(orderParams.calcSum, orderParams.minSalary)
    }
    if (cont.payEl[orderParams.payElID].method.code === '20') {
      const employeePosition = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= sicknessDateFrom && o.dateTo >= sicknessDateFrom)
      if (employeePosition && employeePosition.workPlace === '1') {
        orderParams.calcSum = Math.max(orderParams.calcSum, orderParams.minSalary)
        if (orderParams.standingYearMonth < 6) {
          orderParams.calcSum = Math.min(orderParams.calcSum, 2 * orderParams.minSalary)
        }
      }
    }
    if (chsEmployeeSick) {
      orderParams.calcSum = Math.max(orderParams.calcSum, chsEmployeeSick.avgSum)
    }
  }
  if (cont.payEl[orderParams.payElID].roundAvgUpTo) {
    orderParams.avgSum = accrualService.roundPayEl(orderParams.avgSum, cont.payEl[orderParams.payElID].roundAvgUpTo)
    orderParams.calcSum = accrualService.roundPayEl(orderParams.calcSum, cont.payEl[orderParams.payElID].roundAvgUpTo)
  }
  if (chsEmployeeSick) {
    orderParams.employeeSickLimitID = chsEmployeeSick.ID
  }
  orderParams.paySum = 0 // orderParams.calcSum * orderParams.dayCount
  orderParams.accruals.forEach(accr => {
    const periodSalary = cont.periods
      ? cont.periods.find(o => o.ID === accr.periodSalaryID)
      : periodService.getPeriod(accr.periodSalaryID)
    Object.assign(accr, {
      avgCalcType: orderParams.avgCalcType,
      dateFromAvg: orderParams.dateFromAvg,
      dateToAvg: orderParams.dateToAvg,
      baseSum: orderParams.notPay ? 0 : orderParams.calcSum,
      days: orderParams.notPay ? 0 : accr.days,
      flagsRec: orderParams.flagsRec,
      flagsFix: accr.flagsFix | (orderParams.flagsFix || 0)
    })
    if (!periodSalary) {
      throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено період для розрахунку. Перевірте дати документа: {0} - {1}', dateService.formatDate(orderParams.dateFrom), dateService.formatDate(orderParams.dateTo))}>>>`)
    }
    Object.assign(accr, algorithmSickness.run({ cont,
      periodCalc,
      periodSalary,
      params: accr,
      sourceAccr: {
        accrualDt: orderParams.accrualDt
      }
    }))
    orderParams.paySum += accr.paySum
    if (orderParams.notPay) {
      accr.days = 0
      accr.paySum = 0
    }
  })
  orderParams.paySum = accrualService.roundPayEl(orderParams.paySum, cont.payEl[orderParams.payElID].roundAvgUpTo)
  if (!orderParams.dateFirst) {
    orderParams.dateFirst = sicknessDateFrom
  }
}

function getParentAccrualData (orderParams, parentAccrual, dateFrom) {
  orderParams.avgOnDate = dateFrom
  orderParams.baseSum = parentAccrual.sumAvg || parentAccrual.baseSum
  orderParams.calcSum = parentAccrual.sumAvg || parentAccrual.baseSum
  orderParams.flagsRec = 2 | (parentAccrual['avgCalcType'] === 'FACT' ? (1 << 7) : parentAccrual['avgCalcType'] === 'PLAN' ? (1 << 8) : (1 << 6))
  orderParams.flagsFix = orderParams.flagsFix | 1 << 0 | 1 << 9 | 1 << 10 | 1 << 11 | 1 << 21 | 1 << 20 | 1 << 22

  const sicknessFields = ['rate', 'dateFromAvg', 'dateToAvg']
  sicknessFields.forEach(fieldName => {
    if (['dateFromAvg', 'dateToAvg'].includes(fieldName)) {
      orderParams[fieldName] = dateService.shiftDate(parentAccrual[fieldName])
    } else {
      orderParams[fieldName] = parentAccrual[fieldName]
    }
  })

  orderParams.accrualsAvg = UB.Repository('hr_accrualAvg')
    .attrs(['periodID.name', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'baseSum', 'opSum', 'opKoef', 'periodID', 'accrualDt'])
    .where('accrualID', '=', parentAccrual.ID || orderParams.parentAccrualID)
    .selectAsObject()

  orderParams.accrualsAvg.forEach(avg => {
    avg.flagsFix = 131137 // (1 << 0) | 1 << 6 | 1 << 17
  })
}

function setSplitPeriod (cont, orgID, employeeNumberID, orderParams, periodCalc, dictIllnessReason, parentSickness, sicknessDateFrom) {
  let empOrderSicknessID = orderParams.orderID ? UB.Repository('hr_docRegSickness')
    .attrs('empOrderSicknessID').where('ID', '=', orderParams.orderID).selectScalar() : orderParams.empOrderSicknessID
  if (!empOrderSicknessID && orderParams.empOrderSicknessID) empOrderSicknessID = orderParams.empOrderSicknessID
  const timService = require('../../HR/modules/timService')
  let timeSheets = []
  const empNumbers = [employeeNumberID]
  if (cont.payEl[orderParams.payElID].isParentEmployeeNumber && cont.emp[employeeNumberID].prop.parentEmpNumbers) {
    cont.emp[employeeNumberID].prop.parentEmpNumbers.forEach(item => {
      empNumbers.push(item.employeeNumberID)
    })
  }
  if (empOrderSicknessID) {
    const notPayDictTimeCostID = UB.Repository('hr_empOrderSickness')
      .attrs(['illnessReasonID.payElUnpaidID.dictTimeCostID'])
      .where('ID', '=', empOrderSicknessID)
      .selectScalar()
    timeSheets = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'dateWork', 'orderID', 'factTimeCostID', 'planHour', 'normHour', 'planTimeCostID.timeCostType'])
      .where('employeeNumberID', 'in', empNumbers)
      .where('orderID', '=', empOrderSicknessID)
      .where('dateWork', '>=', orderParams.dateFrom)
      .where('dateWork', '<=', orderParams.dateTo)
      .whereIf(notPayDictTimeCostID, 'factTimeCostID', '!=', notPayDictTimeCostID)
      .where('isActive', '=', true)
      .orderBy('dateWork')
      .selectAsObject()
  } else {
    timeSheets = timService.getTimeSheetWithoutOrder(employeeNumberID, orderParams.dateFrom, orderParams.orderID)
  }

  const holidays = empOrderSicknessID ? calendarService.getHolidays(orderParams.dateFrom, dateService.addYears(orderParams.dateFrom, 3), orgID) : []

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
  let rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()

  const empOrderSickness = empOrderSicknessID ? UB.Repository('hr_empOrderSickness').attrs('*').selectById(empOrderSicknessID) || {} : {}
  const msekDate = empOrderSickness.msekDateTo ? dateService.shiftDate(empOrderSickness.msekDateTo) : (orderParams.msekDateTo ? dateService.shiftDate(orderParams.msekDateTo) : null)
  const msekResult = empOrderSickness.msekResult || orderParams.msekResult

  const accruals = []
  let orderMinDateStore = {}
  if (!Array.isArray(orderParams.sicknessDt)) orderParams.sicknessDt = []
  let maxDayFOP = dictIllnessReason.payElFOPID ? (dictIllnessReason.maxDayFOP || 0) : 0
  if (dictIllnessReason.payElFOPID && maxDayFOP > 0) {
    const parentDayCount = dateService.dayDiff(sicknessDateFrom || parentSickness.dateFrom, orderParams.dateFrom)
    maxDayFOP -= Math.min(parentDayCount, maxDayFOP) // (parentSickness[String(dictIllnessReason.payElFOPID)] || 0)
  }
  orderParams.calendarDayCount = dateService.dayDiff(orderParams.dateFrom, orderParams.dateTo) + 1
  orderParams.dayFSSU = 0
  let date
  for (date = orderParams.dateFrom; date <= orderParams.dateTo; date = dateService.addDays(date, 1)) {
    const period = periods.find(o => o.dateFrom <= date && o.dateTo >= date)
    if (period) {
      const det = orderParams.sicknessDt.find(o => o.dateFrom <= date && date <= o.dateTo)
      const isNotPay = det ? (['4', '5', '6'].includes(det.illnessRegime)) : false
      let accr = accruals.find(o => o.periodSalaryID === period.ID && o.detID === (det ? det.ID : 0) &&
        (((orderParams.notPay || isNotPay) && o.payElID === dictIllnessReason.payElUnpaidID) || (maxDayFOP > 0 && o.payElID === dictIllnessReason.payElFOPID) || (o.payElID === dictIllnessReason.payElFSSUID)))
      let payElID = (orderParams.notPay || (isNotPay && det && det.illnessRegime !== '4')) ? dictIllnessReason.payElUnpaidID : (maxDayFOP > 0 ? dictIllnessReason.payElFOPID : dictIllnessReason.payElFSSUID)
      if (!payElID) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не заповнені види оплати в довіднику Причини непрацездатності')}>>>`)
      }
      if (!accr) {
        accr = {
          periodSalaryID: period.ID,
          periodSalary: period.dateFrom,
          'periodSalaryID.name': period.name,
          employeeNumberID: orderParams.employeeNumberID,
          payElID: payElID,
          'payElID.description': cont.payEl[payElID].description,
          flagsRec: orderParams.flagsRec,
          flagsFix: orderParams.flagsFix,
          dateFrom: dateService.shiftDate(date),
          dateTo: dateService.shiftDate(date),
          days: 0,
          mask: 0,
          maskAdd: 0,
          calendarDays: 0,
          koef: 1,
          detID: det ? det.ID : 0
        }
        accruals.push(accr)
      }
      let addDay = !isNotPay
      if (cont.payEl[payElID].method.dayAccumCondition === 'noHolidays' && holidays.find(o => o.getTime() === date.getTime())) {
        addDay = false
      }
      const timeSheet = timeSheets.find(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())
      if (!empOrderSicknessID) {
        if (addDay && timeSheet) {
          let rule = rules.find(rule => rule.dictTimeCost1ID === timeSheet.factTimeCostID && rule.dictTimeCost2ID === cont.payEl[payElID].dictTimeCostID)
          if (rule && !rule.isDateFirst && rule.isElemFirst) {
            addDay = false
          }
          if (rule && rule.isDateFirst) {
            const orderMinDate = timService.getOrderMinDate(timeSheet, orderMinDateStore)
            addDay = rule.isElemFirst ? orderParams.dateFrom < orderMinDate : orderParams.dateFrom > orderMinDate
          }
        }
      } else {
        if (addDay && !timeSheet) {
          addDay = false
        }
      }
      if (addDay && timeSheet && msekDate && msekResult === '1') {
        if (dateService.shiftDate(timeSheet.dateWork).getTime() === msekDate.getTime()) addDay = false
      }
      if (addDay) {
        accr.days++
        orderParams.dayFSSU += maxDayFOP > 0 ? 0 : 1
        accr.mask = accr.mask | 1 << (date.getDate() - 1)
      } else {
        accr.maskAdd = accr.maskAdd | 1 << (date.getDate() - 1)
      }

      maxDayFOP--
      accr.calendarDays++
      accr.dateTo = dateService.shiftDate(date)
    }
  }
  accruals.forEach(acc => {
    delete acc.detID
  })
  orderParams.accruals = accruals
}

function getParentSickness (parentSicknessID, parentSickness) {
  const docRegSickness = UB.Repository('hr_docRegSickness')
    .attrs(['ID', 'dateFrom', 'parentSicknessID', 'dateFirst']).selectById(parentSicknessID)
  if (!docRegSickness) return
  parentSickness.dateFrom = dateService.shiftDate(docRegSickness.dateFrom)
  parentSickness.ID = docRegSickness.ID
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'dateFrom', 'parentSicknessID', 'payElID', 'days'])
    .where('orderID', '=', parentSicknessID)
    .selectAsObject()

  if (!parentSickness.orderRegistryDt) {
    parentSickness.orderRegistryDt = []
  }
  orderRegistryDt.forEach(row => {
    parentSickness.orderRegistryDt.push(row)
    parentSickness[String(row.payElID)] = (parentSickness[String(row.payElID)] || 0) + row.days
  })
  if (docRegSickness.parentSicknessID) {
    getParentSickness(docRegSickness.parentSicknessID, parentSickness)
  }
}

function getExpirienceAndRate ({ cont, orderParams, sicknessDateFrom, dictIllnessReason, employeeSickLimit }) {
  const experienceService = require('./experienceService')
  let experience = {}
  const dictExperienceID = orderParams.payElID ? cont.payEl[orderParams.payElID].dictExperienceID : null
  if (!(orderParams.flagsFix & 1 << 21)) {
    experience = experienceService.calculateExperience(cont.employeeNumberID, dictExperienceID, sicknessDateFrom, null, false, cont)
    const standingAll = experience.years * 12 + experience.months
    const monthsLimit = (cont.dict.hr_dictIllnessPercent.reduce((prev, current) => {
      return (prev.minMonths > current.minMonths) ? prev : current
    }) || {}).minMonths
    if (monthsLimit) {
      orderParams.standingAll = standingAll < monthsLimit ? standingAll : monthsLimit
    }
    orderParams.standingAllInYear = Math.floor(orderParams.standingAll / 12)
  } else {
    experience.rate = algorithmService.getRateExperienceByMonths(cont, orderParams.payElID, sicknessDateFrom, orderParams.standingAll)
  }
  if (!(orderParams.flagsFix & 1 << 20)) {
    let employeeNumberID = cont.employeeNumberID
    let fromDate = dateService.addYears(sicknessDateFrom, -1)
    const parentEmpNumbers = []
    employeeService.getParentEmpNumberIDs(employeeNumberID, parentEmpNumbers)
    if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.parentEmpNumbers.length) {
      fromDate = dateService.shiftDate(Math.max(fromDate, ...cont.emp[employeeNumberID].prop.parentEmpNumbers.map(o => o.dateFrom)))
    }

    const standingYearMonth = experienceService.calculateExperience(employeeNumberID, dictExperienceID, dateService.addDays(sicknessDateFrom, -1), fromDate, false, cont)
    orderParams.standingYearMonth = standingYearMonth.years * 12 + standingYearMonth.months
    if (orderParams.standingYearMonth > 12) {
      orderParams.standingYearMonth = 12
    }
  }
  let employeeNumberDateFrom = cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom
  if (cont.emp[cont.employeeNumberID].prop.parentEmpNumbers && cont.emp[cont.employeeNumberID].prop.parentEmpNumbers.length) {
    cont.emp[cont.employeeNumberID].prop.parentEmpNumbers.forEach(emp => {
      if (employeeNumberDateFrom > emp.dateFrom) employeeNumberDateFrom = emp.dateFrom
    })
  }
  const monthDiff = dateService.monthDiff(employeeNumberDateFrom, sicknessDateFrom)
  orderParams.workLess6months = monthDiff < 6 ? 'Менше 6 місяців' : ''
  if (monthDiff < 6 && !(orderParams.flagsFix & 1 << 20)) {
    orderParams.standingYearMonth = monthDiff
  }
  if (!(orderParams.flagsFix & 1 << 9)) {
    orderParams.rate = experience.rate || null

    if (orderParams.payElID) {
      let limit
      switch (cont.payEl[orderParams.payElID].method.code) { // (dictIllnessReason['payElFSSUID.methodID.code']) {
        case '18':
        case '149':
          // Больничный за счёт СС
          limit = employeeSickLimit.find(o => ['3', '4', '5', '6'].includes(o.typeSickLimit))
          if (limit) {
            orderParams.rate = 100
            orderParams.employeeSickLimitID = limit.ID
          }
          break
        case '20':
        case '40':
          // вагітність, травматизм
          orderParams.rate = 100
          break
        case '19':
          // Больничный по уходу
          limit = employeeSickLimit.find(o => o.typeSickLimit === '2' && o.employeeFamilyID === orderParams.employeeFamilyID)
          if (limit) {
            orderParams.rate = 100
            orderParams.employeeSickLimitID = limit.ID
          }
          break
      }
    }
    if (!orderParams.rate) {
      orderParams.rate = algorithmService.getRateExperienceByMonths(cont, orderParams.payElID, sicknessDateFrom, orderParams.standingAll)
    }
  }
  return orderParams
}

function getParentAccrual (parentID, parentSickness) {
  const accrual = UB.Repository('hr_accrual')
    .attrs(['*'])
    .selectById(parentID)
  if (!accrual) return
  parentSickness.ID = accrual.ID
  parentSickness.dateFrom = dateService.shiftDate(accrual.dateFrom)
  parentSickness[String(accrual.payElID)] = (parentSickness[String(accrual.payElID)] || 0) + accrual.days

  const parent = UB.Repository('hr_accrual')
    .attrs(['ID'])
    .where('employeeNumberID', '=', accrual.employeeNumberID)
    .where('dateTo', '=', dateService.addDays(parentSickness.dateFrom, -1))
    .where('payElID.methodID.methodGroupID.code', '=', '5')
    .where('payElID.methodID.code', '!=', '41')
    .orderBy('dateTo', 'desc')
    .limit(1)
    .selectSingle()

  if (parent) {
    getParentAccrual(parent.ID, parentSickness)
  }
}
