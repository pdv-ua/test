const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const periodService = require('../../HR/modules/periodService')
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const postingService = require('../../HR/modules/postingService')

module.exports = {
  calculateAverage, // Розрахунок середнього
  calculateAverageFact, // Розрахунок Факт
  calculateAveragePlan, // Розрахунок План,
  calculateSicknessAverage, // Розрахунок середнього лікарняний
  calculateSicknessAverageFact, // Розрахунок Факт лікарняний
  calculateSicknessAveragePlan // Розрахунок План лікарняний
}

function calculateAverage ({ orgID, cont, params, checkContinuation, customAdjustPeriodFn, minDateFromAvg, maxDateToAvg }) {
  const timService = require('../../HR/modules/timService')
  const payEl = cont.payEl[params.payElID]
  params.avgCalcType = ((params.flagsRec & 1 << 6) || (params.flagsRec & 1 << 7) || (params.flagsRec & 1 << 8)) ? params.avgCalcType : null // 'PREVIOUS'

  const startWork = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork)
  let date = dateService.firstDayOfMonth(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
  const workScheduleID = (cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length)
    ? ((cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= date && o.dateTo >= date) ||
      cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null
  const workScheduleDays = workScheduleID ? timService.getTimPlan(workScheduleID, date, dateService.addMonths(date, 1), orgID, cont) : []

  let isHoliday = true
  for (let day = date.getDate(); day < startWork.getDate(); day++) {
    const planDay = workScheduleDays.find(o => o.dayDate.getTime() === date.getTime())
    if (!planDay || planDay.timeCostType !== 'FREE') {
      isHoliday = false
    }
    date = dateService.addDays(date, 1)
  }

  const dateFromWork = isHoliday ? dateService.firstDayOfMonth(startWork) : dateService.addMonths(dateService.firstDayOfMonth(startWork), 1)

  // const previousAccrual = null // checkContinuation ? cont.emp[cont.employeeNumberID].accrual.find(o => o.payElID === params.payElID &&
  // (dateService.shiftDate(o.dateTo)).getTime() === dateService.addDays(params.dateFrom, -1).getTime()) : null
  /*
  params.dateFromAvg = previousAccrual ? dateService.shiftDate(previousAccrual.dateFromAvg)
    : (params.flagsFix & 1 << 10) ? dateService.shiftDate(params.dateFromAvg) : dateService.shiftDate(Math.max.apply(null, [dateFromWork, dateService.addMonths(dateService.firstDayOfMonth(params.dateFrom), -1 * (payEl.calcMounth || 1))]))
  params.dateToAvg = previousAccrual ? dateService.shiftDate(previousAccrual.dateToAvg)
    : (params.flagsFix & 1 << 11) ? dateService.shiftDate(params.dateToAvg) : dateService.addDays(dateService.firstDayOfMonth(params.dateFrom), -1)
  */
  params.dateToAvg = (params.flagsFix & 1 << 11) ? dateService.shiftDate(params.dateToAvg) : dateService.addDays(dateService.firstDayOfMonth(params.dateFrom), -1)
  if (!(params.flagsFix & 1 << 11) && maxDateToAvg && params.dateToAvg > maxDateToAvg) {
    params.dateToAvg = maxDateToAvg
  }

  params.dateFromAvg = (params.flagsFix & 1 << 10)
    ? dateService.shiftDate(params.dateFromAvg)
    : dateService.shiftDate(Math.max.apply(null, [
      payEl['usePartialFirstMonth'] ? startWork : dateFromWork,
      payEl.calcMounth >= 1 ? dateService.addMonths(dateService.firstDayOfMonth(params.dateToAvg), -1 * (payEl.calcMounth - 1)) : dateService.firstDayOfMonth(params.dateToAvg)
    ]))

  if (startWork.getTime() >= params.dateFrom.getTime()) {
    if (!params.avgCalcType) {
      params.avgCalcType = 'PLAN'
    }
  } else {
    // full month started at startWork or later
    const firstFullMonth = dateFromWork // (dateFromWork.getDate() === 1) ? startWork : dateService.addMonths(dateService.firstDayOfMonth(startWork), 1)
    // full month ended before params.dateFrom
    const lastFullMonth = dateService.addMonths(dateService.firstDayOfMonth(params.dateFrom), -1)

    // there is no full month in period [startWork, params.dateFrom)
    if (firstFullMonth > lastFullMonth) {
      if (!params.avgCalcType) {
        params.avgCalcType = 'FACT'
      }
    } else if (!(params.flagsFix & 1 << 10) && params.dateFrom < startWork) {
      params.dateFromAvg = startWork.getDate() === 1 ? startWork : dateService.addDays(dateService.lastDayOfMonth(startWork), 1)
    }
  }
  if (!(params.flagsFix & 1 << 10) && minDateFromAvg && params.dateFromAvg < minDateFromAvg) {
    params.dateFromAvg = minDateFromAvg
  }
  if (!(params.flagsFix & 1 << 11) && maxDateToAvg && params.dateToAvg > maxDateToAvg) {
    params.dateToAvg = maxDateToAvg
  }
  let tryAnotherPeriod = false
  let adjustAttempts = cont.payEl[params.payElID].calcMounth === 2 ? 1 : 0
  const until12122020 = params.dateFrom < new Date(Date.UTC(2020, 11, 12, 0, 0, 0, 0))
  const after29042022 = params.dateFrom >= new Date(Date.UTC(2022, 3, 29, 0, 0, 0, 0))
  const periodCalc = cont.periodCalc || periodService.getPeriod(params.periodCalcID)
  const includeSecondJobs = cont.payEl[params.payElID].includeSecondJobs || cont.payEl[params.payElID].method.code === '26'
  params.accrualDt = []
  do {
    if (!params.avgCalcType || params.avgCalcType === 'PREVIOUS') {
      params.avgCalcType = 'PREVIOUS'
      const periods = cont.periods
        ? cont.periods.filter(o => o.dateTo >= params.dateFromAvg && o.dateFrom <= params.dateToAvg)
        : periodService.getPeriodsByDate(orgID, params.dateFromAvg, params.dateToAvg)
      let workScheduleID = cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length > 0 ? cont.emp[cont.employeeNumberID].prop.employeePositions[0].workScheduleID : null
      const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
      if (workSchedule && workSchedule.planScheduleID) {
        workScheduleID = workSchedule.planScheduleID
      }
      const planDays = workScheduleID && payEl.method.dayAverageCondition === 'plan' ? timService.getTimPlan(workScheduleID, params.dateFromAvg, params.dateToAvg, orgID, cont) : []
      const accrualsAvg = []
      if (!params.avgOnDate) {
        params.avgOnDate = dateService.shiftDate(params.dateFrom || dateService.addDays(params.dateToAvg, 1))
      }
      periods.forEach(period => {
        let fillMask = algorithmService.getFillMaskByPeriod(period.dateFrom, period.dateTo)
        let timeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
        const payTime = algorithmService.getPayTimeForAvg({
          mask: fillMask,
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          hourAttr: 'factHour',
          payEl: payEl,
          dayAverageCondition: payEl.method.dayAverageCondition,
          calcEarnings: params.calcEarnings || payEl.calcEarnings,
          timeSheets: timeSheets,
          plans: planDays,
          holiday: cont.holidays,
          orgID,
          cont
        })
        const days151 = algorithmService.getDaysByMethod(cont, params.payElID, period.ID, '151')
        if (days151) {
          payTime.days = days151
        }
        let pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === period.ID) : null
        const fact = algorithmService.getFactSumForAvg({
          withDetail: true,
          cont,
          payElID: params.payElID,
          periodCalc: periodCalc,
          periodSalary: period,
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          fillMask: payTime.mask,
          includeSecondJobs,
          dateFromAvg: params.dateFromAvg,
          dateToAvg: params.dateToAvg,
          periods: periods,
          avgOnDate: params.avgOnDate,
          until12122020,
          after29042022
        })
        const baseSum = (pAccr && pAccr.flagsFix & 1 << 0) ? pAccr.baseSum
          : (payTime.days ? fact.factSum : 0)
        const avg = {
          periodID: period.ID,
          'periodID.name': period.name,
          baseSum: baseSum,
          baseSumNotIndex: (pAccr && pAccr.flagsFix & 1 << 13) ? pAccr.baseSumNotIndex : 0,
          opDays: (pAccr && pAccr.flagsFix & 1 << 6) ? pAccr.opDays : (baseSum ? payTime.days : 0),
          opHours: accrualService.round((pAccr && pAccr.flagsFix & 1 << 7) ? pAccr.opHours : (baseSum ? payTime.hours : 0), 3),
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          flagsFix: (pAccr && pAccr.flagsFix) || 0,
          opKoef: (pAccr && pAccr.flagsFix & 1 << 12) ? pAccr.opKoef : 1
        }
        avg.opSum = (pAccr && pAccr.flagsFix & 1 << 1) ? pAccr.opSum : avg.baseSum * avg.opKoef + (avg.baseSumNotIndex || 0)
        avg.accrualDt = []
        if (avg.opSum !== 0) {
          if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) {
            avg.accrualDt.push(...JSON.parse(pAccr.accrualDt))
            params.accrualDt.push(...JSON.parse(pAccr.accrualDt))
          } else {
            if (fact.accrualDt.length) {
              fact.accrualDt.forEach(row => {
                avg.accrualDt.push(Object.assign({}, row))
              })
              avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
            }
            if (!avg.accrualDt.length && cont.emp[cont.employeeNumberID].prop.useTariffing) {
              const accrualDt = postingService.getAccrualDt({
                cont,
                params: {
                  dateFrom: period.dateFrom,
                  payElID: params.payElID,
                  paySum: avg.opSum || 1,
                  flagsFix: 0
                }
              })
              if (accrualDt.length) {
                avg.accrualDt.push(...accrualDt)
              } else {
                const currentPeriod = cont.periods.find(o => o.orgID === orgID && o.isCurrent)
                avg.accrualDt.push(...postingService.getAccrualDt({
                  cont,
                  params: {
                    dateFrom: currentPeriod.dateFrom,
                    payElID: params.payElID,
                    paySum: avg.opSum || 1,
                    flagsFix: 0
                  }
                }))
              }
            }
            if (!avg.accrualDt.length && avg.opSum !== 0) {
              const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= (period.dateTo || period.dateFrom) && o.dateTo >= period.dateFrom) ||
                cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}
              if (position && position.fundSources) {
                correctPosFundSource([{ paySum: avg.opSum }], position.fundSources, position.mtCount).forEach(row => {
                  avg.accrualDt.push(Object.assign({}, row))
                })
              } else {
                avg.accrualDt.push({ paySum: avg.opSum })
              }
            }
            avg.accrualDt.forEach(o => params.accrualDt.push(Object.assign({}, o)))
          }
        }
        if (pAccr) {
          avg.idx = pAccr.idx
        }
        accrualsAvg.push(avg)
      })

      if (startWork.getDate() === 1 && cont.emp[cont.employeeNumberID].prop.employeePositions.length) {
        cont.emp[cont.employeeNumberID].prop.employeePositions[0].dateFrom = startWork
      }
      if (until12122020) {
        for (let i = 0; i < accrualsAvg.length; i++) {
          let startSalary = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= accrualsAvg[i].dateTo &&
            o.dateTo >= accrualsAvg[i].dateTo)
          if (accrualsAvg[i].flagsFix & 1 << 12) {
            if (!(accrualsAvg[i].flagsFix & 1 << 1)) {
              accrualsAvg[i].opSum = accrualsAvg[i].baseSum * accrualsAvg[i].opKoef + (accrualsAvg[i].baseSumNotIndex || 0)
            }
          } else if (startSalary && accrualsAvg[i].opSum > 0) {
            let indexSalary = cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.isIndex && o.dateFrom > accrualsAvg[i].dateFrom &&
              o.dateFrom <= params.dateFrom)
            indexSalary.forEach(salary => {
              let accrualSumIndex = -1
              for (let index = cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1; index >= 0; index--) {
                if (cont.emp[cont.employeeNumberID].prop.employeePositions[index].dateTo < salary.dateFrom) {
                  accrualSumIndex = index
                  break
                }
              }
              if (accrualSumIndex >= 0 && salary.accrualSum > cont.emp[cont.employeeNumberID].prop.employeePositions[accrualSumIndex].accrualSum) {
                const koef = accrualService.round(salary.accrualSum / cont.emp[cont.employeeNumberID].prop.employeePositions[accrualSumIndex].accrualSum, 6)
                accrualsAvg[i].opKoef *= koef
                if (!(accrualsAvg[i].flagsFix & 1 << 1)) {
                  const startInPeriod = dateService.shiftDate(Math.max(accrualsAvg[i].dateFrom, cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork))
                  const finishInPeriod = dateService.shiftDate(Math.min(accrualsAvg[i].dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork))
                  if (salary.dateFrom > startInPeriod &&
                    salary.dateFrom <= finishInPeriod) {
                    let fillPeriodMask = algorithmService.getFillMaskByPeriod(salary.dateFrom, finishInPeriod)
                    accrualsAvg[i].baseSumNotIndex = (accrualsAvg[i].flagsFix & 1 << 13)
                      ? accrualsAvg[i].baseSumNotIndex
                      : algorithmService.getFactSumForAvg({
                        cont,
                        partPeriod: true,
                        payElID: params.payElID,
                        periodCalc: periodCalc,
                        periodSalary: periods.find(o => o.ID === accrualsAvg[i].periodID),
                        dateFrom: salary.dateFrom,
                        dateTo: finishInPeriod,
                        fillMask: fillPeriodMask,
                        includeSecondJobs,
                        dateFromAvg: params.dateFromAvg,
                        dateToAvg: params.dateToAvg,
                        periods: periods,
                        avgOnDate: params.avgOnDate,
                        until12122020
                      })
                    if (!(accrualsAvg[i].flagsFix & 1)) {
                      accrualsAvg[i].baseSum = accrualsAvg[i].baseSum - accrualsAvg[i].baseSumNotIndex
                    }
                    accrualsAvg[i].opSum = accrualService.round(accrualsAvg[i].baseSum * koef + accrualsAvg[i].baseSumNotIndex, 6)
                  } else {
                    accrualsAvg[i].opSum = accrualService.round(accrualsAvg[i].opSum * koef, 6)
                  }
                }
              }
            })
          }
        }
      }

      let days = 0
      let hours = 0
      let baseSum = 0
      accrualsAvg.forEach(avg => {
        days += avg.opDays
        hours = accrualService.round(hours + avg.opHours, 6)
        baseSum = accrualService.round(baseSum + avg.opSum, 6)
        avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
      })
      if (days === 0 || baseSum === 0) {
        if (customAdjustPeriodFn && adjustAttempts > 0) {
          adjustAttempts--
          tryAnotherPeriod = true
          customAdjustPeriodFn(cont, params)
          if (params.dateFromAvg < cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom) {
            params.dateFromAvg = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
          }
          if (params.dateToAvg < cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom) {
            params.dateToAvg = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
            tryAnotherPeriod = false
            if (!(params.flagsRec & 1 << 6) && !(params.flagsRec & 1 << 7)) {
              params.avgCalcType = 'PLAN'
              params.accrualDt = []
            }
          }
        } else {
          tryAnotherPeriod = false
          if (!(params.flagsRec & 1 << 6) && !(params.flagsRec & 1 << 7)) {
            params.avgCalcType = 'PLAN'
            params.accrualDt = []
          }
        }
      } else {
        tryAnotherPeriod = false
      }
      if (!tryAnotherPeriod) {
        if (!(params.flagsFix & 1)) {
          if (params.flagsRec & 1 << 5) {
            params.baseSum = hours ? accrualService.round(baseSum / hours, 6) : 0
          } else {
            params.baseSum = days ? accrualService.round(baseSum / days, 6) : 0
          }
        }
        params.avgDt = { baseSum, days, hours }
        // params.accrualDt = algorithmService.calcGroupSumAccrualDt(, params.baseSum, true)
        params.accrualsAvg = accrualsAvg
      }
    }
  } while (tryAnotherPeriod)
  return !(params.avgCalcType === 'PLAN' || params.avgCalcType === 'FACT' || !params.baseSum)
}

function calculateAverageFact ({ orgID, cont, params, dateFrom, dateTo, payElBase, customAdjustPeriodFn }) {
  const timService = require('../../HR/modules/timService')
  const payEl = cont.payEl[params.payElID]
  let days = 0
  let hours = 0
  let allBaseSum = 0
  params.dateFromAvg = dateFrom
  params.dateToAvg = dateTo
  const periodCalc = cont.periodCalc || periodService.getPeriod(params.periodCalcID)
  const includeSecondJobs = cont.payEl[params.payElID].includeSecondJobs || cont.payEl[params.payElID].method.code === '26'
  let tryAnotherPeriod = false
  let accrualsAvg = []
  params.accrualDt = []
  const until12122020 = params.dateFrom < new Date(Date.UTC(2020, 11, 12, 0, 0, 0, 0))
  const after29042022 = params.dateFrom >= new Date(Date.UTC(2022, 3, 29, 0, 0, 0, 0))
  let adjustAttempts = 1
  do {
    const periods = cont.periods
      ? cont.periods.filter(o => o.dateTo >= params.dateFromAvg && o.dateFrom <= params.dateToAvg)
      : periodService.getPeriodsByDate(orgID, params.dateFromAvg, params.dateToAvg)
    let workScheduleID = cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length > 0 ? cont.emp[cont.employeeNumberID].prop.employeePositions[0].workScheduleID : null
    const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
    if (workSchedule && workSchedule.planScheduleID) {
      workScheduleID = workSchedule.planScheduleID
    }
    const planDays = workScheduleID && payEl.method.dayAverageCondition === 'plan' ? timService.getTimPlan(workScheduleID, params.dateFromAvg, params.dateToAvg, orgID, cont) : []
    accrualsAvg = []
    periods.forEach(period => {
      let pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === period.ID) : null
      const df = dateService.shiftDate(period.dateFrom)
      const dt = dateService.shiftDate(period.dateTo)
      let fillMask = algorithmService.getFillMaskByPeriod(df, dt)
      const timeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
      const payTime = algorithmService.getPayTimeForAvg({
        mask: fillMask,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        hourAttr: 'factHour',
        payEl: payEl,
        dayAverageCondition: payEl.method.dayAverageCondition,
        calcEarnings: params.calcEarnings || payEl.calcEarnings,
        timeSheets: timeSheets,
        plans: planDays,
        holiday: cont.holidays,
        orgID,
        cont
      })
      const fact = algorithmService.getFactSumForAvg({
        withDetail: true,
        cont,
        payElID: params.payElID,
        periodCalc: periodCalc,
        periodSalary: period,
        dateFrom: df,
        dateTo: dt,
        fillMask: payTime.mask,
        includeSecondJobs,
        dateFromAvg: params.dateFromAvg,
        dateToAvg: params.dateToAvg,
        periods: periods,
        avgOnDate: df,
        payElBase,
        until12122020,
        after29042022
      })

      const baseSum = (pAccr && pAccr.flagsFix & 1 << 0) ? pAccr.baseSum
        : (payTime.days ? fact.factSum : 0)
      const avg = {
        periodID: period.ID,
        'periodID.name': period.name,
        baseSum: baseSum,
        opSum: (pAccr && pAccr.flagsFix & 1 << 1) ? pAccr.opSum : baseSum,
        opDays: (pAccr && pAccr.flagsFix & 1 << 6) ? pAccr.opDays : payTime.days,
        opHours: accrualService.round((pAccr && pAccr.flagsFix & 1 << 7) ? pAccr.opHours : payTime.hours, 3),
        dateFrom: df,
        dateTo: dt,
        flagsFix: (pAccr && pAccr.flagsFix) || 0,
        opKoef: 0
      }
      avg.accrualDt = []
      if (avg.opSum !== 0) {
        if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) {
          avg.accrualDt.push(...JSON.parse(pAccr.accrualDt))
          params.accrualDt.push(...JSON.parse(pAccr.accrualDt))
        } else {
          if (fact.accrualDt.length) {
            fact.accrualDt.forEach(row => {
              avg.accrualDt.push(Object.assign({}, row))
            })
            avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
          }
          if (!avg.accrualDt.length && cont.emp[cont.employeeNumberID].prop.useTariffing) {
            avg.accrualDt.push(...postingService.getAccrualDt({
              cont,
              params: {
                dateFrom: period.dateFrom,
                payElID: params.payElID,
                paySum: avg.opSum || 1,
                flagsFix: 0
              }
            }))
          }
          if (!avg.accrualDt.length && avg.opSum !== 0) {
            const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= (period.dateTo || period.dateFrom) && o.dateTo >= period.dateFrom) ||
              cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}
            if (position && position.fundSources) {
              correctPosFundSource([{ paySum: avg.opSum }], position.fundSources, position.mtCount).forEach(row => {
                avg.accrualDt.push(Object.assign({}, row))
                params.accrualDt.push(Object.assign({}, row))
              })
            } else {
              avg.accrualDt.push({ paySum: avg.opSum })
              params.accrualDt.push({ paySum: avg.opSum })
            }
          }
          avg.accrualDt.forEach(o => params.accrualDt.push(Object.assign({}, o)))
        }
      }
      if (pAccr) {
        avg.idx = pAccr.idx
      }
      avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
      accrualsAvg.push(avg)
      days += avg.opDays
      hours = accrualService.round(hours + avg.opHours, 3)
      allBaseSum = accrualService.round(allBaseSum + avg.opSum, 6)
    })
    if (days === 0 || allBaseSum === 0) {
      if (customAdjustPeriodFn && adjustAttempts > 0) {
        adjustAttempts--
        tryAnotherPeriod = true
        customAdjustPeriodFn(cont, params)
        if (params.dateFromAvg < dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)) {
          params.dateFromAvg = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
        }
        if (params.dateToAvg < dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)) {
          params.dateToAvg = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
          tryAnotherPeriod = false
        }
      } else {
        tryAnotherPeriod = false
      }
    } else {
      tryAnotherPeriod = false
    }
  } while (tryAnotherPeriod)
  if (!(params.flagsFix & 1)) {
    params.baseSum = accrualService.round(allBaseSum / days, 6)
    if (params.flagsRec & 1 << 5) {
      params.baseSum = hours ? accrualService.round(allBaseSum / hours, 6) : 0
    } else {
      params.baseSum = days ? accrualService.round(allBaseSum / days, 6) : 0
    }
  }
  params.avgDt = { baseSum: allBaseSum, days, hours }
  if (days === 0 || allBaseSum === 0) {
    if (!(params.flagsRec & 1 << 6) && !(params.flagsRec & 1 << 7)) {
      params.avgCalcType = 'PLAN'
      params.accrualDt = []
    }
  }
  // params.accrualDt =  algorithmService.calcGroupSumAccrualDt(params.accrualDt, params.baseSum, true)
  params.accrualsAvg = accrualsAvg
  return (allBaseSum > 0 && days > 0)
}

function calculateAveragePlan ({ orgID, cont, params, periodCalc, onDate, daysMode, minDateFromAvg }) {
  const timService = require('../../HR/modules/timService')
  const accrualsAvg = []
  let pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === periodCalc.ID) : null
  params.dateFromAvg = onDate
  params.dateToAvg = onDate
  cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, params.employeeNumberID, cont, { dateFrom: onDate, dateTo: onDate })
  const accr = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  const permanentAccrual = {
    payElID: params.payElID,
    dateFrom: cont.payEl[params.payElID].dateFrom,
    dateTo: cont.payEl[params.payElID].dateTo
  }
  const includeSecondJobs = cont.payEl[params.payElID].includeSecondJobs
  let daysCount
  let hoursCount = 0
  let payTime
  const payEl = cont.payEl[params.payElID]
  let workScheduleID = cont.emp[cont.employeeNumberID].prop.employeePositions && cont.emp[cont.employeeNumberID].prop.employeePositions.length > 0 ? cont.emp[cont.employeeNumberID].prop.employeePositions[0].workScheduleID : null
  const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
  if (workSchedule && workSchedule.planScheduleID) {
    workScheduleID = workSchedule.planScheduleID
  }

  const dayAverageCondition = payEl.method.dayAverageCondition === 'work' ? 'plan' : payEl.method.dayAverageCondition
  switch (daysMode) {
    case 1: { // Відпустка
      const firstDayOfMonth = dateService.firstDayOfMonth(dateService.shiftDate(params.dateFrom))
      daysCount = 0
      for (let i = 0; i < payEl.calcMounth; i++) {
        const df = dateService.addMonths(firstDayOfMonth, -1 * (i + 1))
        const dt = dateService.lastDayOfMonth(df)
        let fillMask = algorithmService.getFillMaskByPeriod(df, dt)
        const planDays = workScheduleID ? timService.getTimPlan(workScheduleID, df, dt, orgID, cont) : []
        payTime = algorithmService.getPayTimeForAvg({
          mask: fillMask,
          dateFrom: df,
          dateTo: dt,
          hourAttr: 'normHour',
          payEl: payEl,
          dayAverageCondition,
          calcEarnings: params.calcEarnings || payEl.calcEarnings,
          timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets,
          plans: planDays,
          holiday: cont.holidays,
          orgID,
          cont
        })
        daysCount += payTime.days
      }
      daysCount = accrualService.round(daysCount / payEl.calcMounth, 2)
    }
      break
    case 2: { // за постановою 100
      const firstDayOfMonth = dateService.firstDayOfMonth(dateService.shiftDate(params.dateFrom))
      daysCount = 0
      let i = 0
      let monthCount = 0
      while (i < payEl.calcMounth) {
        const df = dateService.addMonths(firstDayOfMonth, -1 * (i + 1))
        const dt = dateService.lastDayOfMonth(df)
        if (!minDateFromAvg || df >= minDateFromAvg) {
          let fillMask = algorithmService.getFillMaskByPeriod(df, dt)
          const planDays = workScheduleID ? timService.getTimPlan(workScheduleID, df, dt, orgID, cont) : []
          payTime = algorithmService.getPayTimeForAvg({
            mask: fillMask,
            dateFrom: df,
            dateTo: dt,
            hourAttr: 'planHour',
            payEl: payEl,
            dayAverageCondition,
            calcEarnings: params.calcEarnings || payEl.calcEarnings,
            timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets,
            plans: planDays,
            holiday: cont.holidays,
            orgID,
            cont
          })
          daysCount += payTime.days
          hoursCount += payTime.hours
          monthCount++
        }
        i++
      }
      daysCount = monthCount ? accrualService.round(daysCount / monthCount, 2) : 0
      hoursCount = monthCount ? accrualService.round(hoursCount / monthCount, 3) : 0
    }
      break
    case 3: { // матеріальна допомога
      const firstDayOfMonth = dateService.firstDayOfMonth(dateService.shiftDate(params.dateFrom))
      daysCount = 0
      let i = 0
      let monthCount = 0
      while (i < payEl.calcMounth) {
        const df = dateService.addMonths(firstDayOfMonth, -1 * (i + 1))
        const dt = dateService.lastDayOfMonth(df)
        if (!minDateFromAvg || df >= minDateFromAvg) {
          const payTime = workScheduleID ? algorithmService.getPlanTime(orgID, workScheduleID, df, dt, cont)
            : algorithmService.getPlanTimeByTimeSheet({ timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets, dateFrom: df, dateTo: dt, useTimeSheetBy: (accr && accr.payElID) ? cont.payEl[accr.payElID].useTimeSheetBy : 'NORMA' })
          daysCount += payTime.days
          monthCount++
        }
        i++
      }
      daysCount = monthCount ? accrualService.round(daysCount / monthCount, 2) : 0
    }
      break
    default:
      const df = dateService.firstDayOfMonth(onDate)
      const dt = dateService.lastDayOfMonth(onDate)
      let fillMask = algorithmService.getFillMaskByPeriod(df, dt)
      const planDays = workScheduleID ? timService.getTimPlan(workScheduleID, df, dt, orgID, cont) : []
      payTime = algorithmService.getPayTimeForAvg({
        mask: fillMask,
        dateFrom: df,
        dateTo: dt,
        hourAttr: 'normHour',
        payEl: payEl,
        dayAverageCondition,
        calcEarnings: params.calcEarnings || payEl.calcEarnings,
        timeSheets: cont.emp[cont.employeeNumberID].prop.timeSheets,
        plans: planDays,
        holiday: cont.holidays,
        orgID,
        cont
      })
      daysCount = payTime.days
      hoursCount = payTime.hours
  }
  const calcByPayElEntryPlanSum = !!payEl.payElEntryPlanSum.length
  // Постійні нарахування (основне місце роботи)
  let baseSum = (pAccr && pAccr.flagsFix & 1 << 0)
    ? pAccr.baseSum
    : (accr ? algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, payTime, false, calcByPayElEntryPlanSum) * (cont.payEl[params.payElID].isMtCount ? (accr.mtCount || 1) : 1) : 0)

  const employeeNumberID = cont.employeeNumberID
  let baseSumSecJobs = 0
  const firstJob = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (includeSecondJobs && firstJob && firstJob.workPlace === '1') {
    const employeeID = cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID
    if (Array.isArray(cont.secJobs[employeeID])) {
      cont.secJobs[employeeID].forEach(row => {
        if (cont.emp[row.employeeNumberID] && cont.emp[row.employeeNumberID].prop && cont.emp[row.employeeNumberID].prop.employeePositions) {
          cont.employeeNumberID = row.employeeNumberID
          const accr = cont.emp[row.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
          cont.emp[row.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, { dateFrom: onDate, dateTo: onDate })
          baseSumSecJobs += (pAccr && pAccr.flagsFix & 1 << 0)
            ? pAccr.baseSum
            : (accr ? algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, payTime, false, calcByPayElEntryPlanSum) * (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1) : 0)
        }
      })
    }
  }
  baseSum += (pAccr && pAccr.flagsFix & 1 << 0) ? 0 : baseSumSecJobs
  if (onDate >= new Date(Date.UTC(2020, 11, 12, 0, 0, 0, 0)) && !(pAccr && pAccr.flagsFix & 1 << 0) && !['22', '36', '37'].includes(payEl.method.code)) {
    const minSalaryRec = cont.dict.hr_dictSalaryMinSize.find(o => o.dateFrom <= onDate)
    if (baseSum < minSalaryRec.monthValue * (accr ? (accr.mtCount || 1) : 1)) {
      baseSum = minSalaryRec.monthValue * (accr ? (accr.mtCount || 1) : 1)
    }
  }
  cont.employeeNumberID = employeeNumberID
  if (payEl.isCorrectPlan) {
    const timeSheets = algorithmService.getTimeSheetByPeriod(periodCalc, cont)
    const timeSheetChanges = UB.Repository('tim_timeSheet')
      .attrs(['dateWork', 'planHour', 'normHour', 'factHour'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateWork', '>=', periodCalc.dateFrom)
      .where('dateWork', '<=', periodCalc.dateTo)
      .where('typeSheetChange', '=', '1')
      .orderBy('dateWork')
      .selectAsObject()
    let date = dateService.shiftDate(periodCalc.dateFrom)
    let normHour = 0
    let factHour = 0
    for (let day = periodCalc.dateFrom.getDate(); day <= periodCalc.dateTo.getDate(); day++) {
      const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
      if (timeSheetDay) {
        normHour = accrualService.round(normHour + (timeSheetDay.normHour || 0), 4)
        const timeSheetChange = timeSheetChanges.find(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())
        factHour = timeSheetChange
          ? accrualService.round(factHour + (timeSheetChange.factHour || 0), 4) : accrualService.round(factHour + (timeSheetDay.normHour || 0), 4)
      }
      date = dateService.addDays(date, 1)
    }
    if (normHour && normHour !== factHour) {
      baseSum = accrualService.round(baseSum / normHour * factHour)
    }
  }

  daysCount = (pAccr && pAccr.flagsFix & 1 << 6) ? pAccr.opDays : daysCount
  hoursCount = (pAccr && pAccr.flagsFix & 1 << 7) ? (pAccr.opHours || 0) : hoursCount
  if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt && typeof pAccr.accrualDt === 'string') {
    pAccr.accrualDt = JSON.parse(pAccr.accrualDt)
  }
  let accrualDt = (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) ? algorithmService.correctAccrualDt(pAccr.accrualDt, baseSum || 1)
    : postingService.getAccrualDt({
      cont,
      params: {
        dateFrom: onDate,
        payElID: params.payElID,
        paySum: baseSum || 1,
        flagsFix: 0
      }
    })
  const avg = {
    periodID: periodCalc.ID,
    'periodID.name': periodCalc.name,
    baseSum: baseSum,
    opSum: baseSum,
    opDays: daysCount,
    opHours: accrualService.round(hoursCount, 3),
    dateFrom: onDate,
    dateTo: onDate,
    flagsFix: (pAccr && pAccr.flagsFix) || 0,
    accrualDt,
    opKoef: 0
  }
  if (pAccr) {
    avg.idx = pAccr.idx
  }
  accrualsAvg.push(avg)
  params.accrualsAvg = accrualsAvg
  params.accrualDt = []
  accrualDt.forEach(acc => {
    params.accrualDt.push(Object.assign({}, acc))
  })
  if (!(params.flagsFix & 1)) {
    if (params.flagsRec & 1 << 5) {
      params.baseSum = payEl.calcAvgType === 'PLAN' ? baseSum : accrualService.round(baseSum / hoursCount, 6)
    } else {
      params.baseSum = payEl.calcAvgType === 'PLAN' ? baseSum : accrualService.round(baseSum / daysCount, 6)
    }
  }
  params.avgDt = { baseSum, days: daysCount, hours: hoursCount }
}

function calculateSicknessAverage ({ orgID, cont, params, sicknessDateFrom, excludeHolidays, checkContinuation }) {
  const payEl = cont.payEl[params.payElID]
  params.avgCalcType = ((params.flagsRec & 1 << 6) || (params.flagsRec & 1 << 7) || (params.flagsRec & 1 << 8)) ? params.avgCalcType : null // 'PREVIOUS'
  const startWork = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
  const dateFromWork = startWork.getDate() === 1 ? startWork : dateService.addMonths(dateService.firstDayOfMonth(startWork), 1)

  const previousAccrual = checkContinuation ? cont.emp[cont.employeeNumberID].accrual.find(o => o.payElID === params.payElID &&
    (dateService.shiftDate(o.dateTo)).getTime() === dateService.addDays(sicknessDateFrom, -1).getTime()) : null
  params.dateFromAvg = previousAccrual ? dateService.shiftDate(previousAccrual.dateFromAvg)
    : (params.flagsFix & 1 << 10) ? dateService.shiftDate(params.dateFromAvg)
      : dateService.shiftDate(Math.max(dateFromWork, dateService.addMonths(dateService.firstDayOfMonth(sicknessDateFrom), -1 * (payEl.calcMounth || 1))))

  params.dateToAvg = previousAccrual ? dateService.shiftDate(previousAccrual.dateToAvg)
    : (params.flagsFix & 1 << 11) ? dateService.shiftDate(params.dateToAvg) : dateService.addDays(dateService.firstDayOfMonth(sicknessDateFrom), -1)

  if (startWork.getTime() === sicknessDateFrom.getTime() ||
    dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom).getTime() === sicknessDateFrom.getTime()) {
    if (!params.avgCalcType) {
      params.avgCalcType = 'PLAN'
    }
  } else {
    const lastFullMonth = dateService.firstDayOfMonth(dateService.addMonths(sicknessDateFrom, -1))
    if (lastFullMonth < startWork) {
      if (!params.avgCalcType) {
        params.avgCalcType = 'FACT'
      }
    } else if (!(params.flagsFix & 1 << 10) && params.dateFromAvg < startWork) {
      params.dateFromAvg = startWork.getDate() === 1 ? startWork : dateService.addDays(dateService.lastDayOfMonth(startWork), 1)
    }
  }
  const minAvgCalcTime = cont.constants && cont.constants['hrAccrualAvgCalcTimeDate']
  if (!params.avgCalcType || params.avgCalcType === 'PREVIOUS') {
    params.avgCalcType = 'PREVIOUS'
    const periods = cont.periods
      ? cont.periods.filter(o => o.dateTo >= params.dateFromAvg && o.dateFrom <= params.dateToAvg)
      : periodService.getPeriodsByDate(orgID, dateService.shiftDate(params.dateFromAvg), dateService.shiftDate(params.dateToAvg))
    const accrualsAvg = []
    params.accrualDt = []
    if (!params.avgOnDate) {
      params.avgOnDate = dateService.shiftDate(params.dateFrom || dateService.addDays(params.dateToAvg, 1))
    }

    periods.forEach(period => {
      let fillMask = algorithmService.getFillMaskByPeriod(period.dateFrom, period.dateTo)
      let timeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
      if (minAvgCalcTime) {
        timeSheets = timeSheets.filter(o => o.dateWork >= minAvgCalcTime)
      }
      const payTime = algorithmService.getPayTimeByTimeCost(fillMask, period.dateFrom, period.dateTo, 'factHour', payEl.payElTimeCost, excludeHolidays, timeSheets, null, orgID)
      const days151 = algorithmService.getDaysByMethod(cont, params.payElID, period.ID, '151')
      if (days151) {
        payTime.days = days151
      }
      const pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === period.ID) : null
      const fact = algorithmService.getFactSumForSickness({
        withDetail: true,
        cont,
        payElID: params.payElID,
        periodCalc: period,
        avgOnDate: params.avgOnDate
      })
      let baseSum = (pAccr && pAccr.flagsFix & 1 << 0) ? pAccr.baseSum
        : (payTime.days ? fact.factSum : 0)
      const baseECV = cont.dict.hr_maxBaseECB.find(o => o.dateFrom <= period.dateTo) || {}
      if ((baseECV.maxSum || 0) < baseSum) {
        baseSum = (baseECV.maxSum || 0)
      }
      const avg = {
        periodID: period.ID,
        'periodID.name': period.name,
        baseSum: baseSum,
        opSum: (pAccr && pAccr.flagsFix & 1 << 1) ? pAccr.opSum : baseSum,
        opDays: (pAccr && pAccr.flagsFix & 1 << 6) ? pAccr.opDays : payTime.days,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        flagsFix: (pAccr && pAccr.flagsFix) || 0
      }
      avg.accrualDt = []
      if (avg.opSum !== 0) {
        if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) {
          avg.accrualDt.push(...JSON.parse(pAccr.accrualDt))
          params.accrualDt.push(...JSON.parse(pAccr.accrualDt))
        } else {
          if (fact.accrualDt.length) {
            fact.accrualDt.forEach(row => {
              avg.accrualDt.push(Object.assign({}, row))
            })
            avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
          }
          if (!avg.accrualDt.length && cont.emp[cont.employeeNumberID].prop.useTariffing) {
            let accrualDt = postingService.getAccrualDt({
              cont,
              params: {
                dateFrom: period.dateFrom,
                payElID: params.payElID,
                paySum: avg.opSum,
                flagsFix: 0
              }
            })
            if (accrualDt.length) {
              avg.accrualDt.push(...accrualDt)
            } else {
              const currentPeriod = cont.periods.find(o => o.orgID === orgID && o.isCurrent)
              avg.accrualDt.push(...postingService.getAccrualDt({
                cont,
                params: {
                  dateFrom: currentPeriod.dateFrom,
                  payElID: params.payElID,
                  paySum: avg.opSum,
                  flagsFix: 0
                }
              }))
            }
          }
          if (!avg.accrualDt.length && avg.opSum !== 0) {
            const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= (period.dateTo || period.dateFrom) && o.dateTo >= period.dateFrom) ||
              cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}
            if (position && position.fundSources) {
              correctPosFundSource([{ paySum: avg.opSum }], position.fundSources, position.mtCount).forEach(row => {
                avg.accrualDt.push(Object.assign({}, row))
              })
            } else {
              avg.accrualDt.push({ paySum: avg.opSum })
            }
          }
          avg.accrualDt.forEach(o => params.accrualDt.push(Object.assign({}, o)))
        }
      }
      if (payEl.excludeMonthFreeDays) {
        let countedDays = 0
        let date = dateService.shiftDate(period.dateFrom)
        for (let day = period.dateFrom.getDate(); day <= period.dateTo.getDate(); day++) {
          const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
          if (timeSheetDay && !payEl.payElTimeCost.find(o => o.dictTimeCostID === timeSheetDay.factTimeCostID && o.dateFrom <= date && o.dateTo >= date)) {
            if (timeSheetDay['factTimeCostType'] !== 'FREE') countedDays++
          }
          date = dateService.addDays(date, 1)
        }
        if (countedDays === 0) {
          avg.opDays = 0
          avg.opSum = 0
          avg.accrualDt = []
        }
      }
      if (pAccr) {
        avg.idx = pAccr.idx
      }
      accrualsAvg.push(avg)
    })
    let days = 0
    let baseSum = 0
    accrualsAvg.forEach(avg => {
      days += avg.opDays
      baseSum = accrualService.round(baseSum + avg.opSum, 6)
      avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
    })
    if (days === 0 || baseSum === 0) {
      if (!(params.flagsRec & 1 << 6) && !(params.flagsRec & 1 << 8)) {
        params.avgCalcType = 'FACT'
        params.accrualDt = []
      }
    }
    if (!(params.flagsFix & 1)) {
      params.baseSum = accrualService.round(baseSum / days, 6)
    }
    if (params.avgCalcType === 'PREVIOUS') {
      params.accrualsAvg = accrualsAvg
      // params.accrualDt = algorithmService.calcGroupSumAccrualDt(params.accrualDt, params.baseSum, true)
    }
  }
  return !(params.avgCalcType === 'PLAN' || params.avgCalcType === 'FACT' || !params.baseSum)
}

function calculateSicknessAverageFact ({ orgID, cont, params, dateFrom, dateTo, excludeHolidays }) {
  const periods = cont.periods
    ? cont.periods.filter(o => o.dateTo >= dateFrom && o.dateFrom <= dateTo)
    : periodService.getPeriodsByDate(orgID, dateFrom, dateTo)
  let days = 0
  let allBaseSum = 0
  const accrualsAvg = []
  params.dateFromAvg = dateFrom
  params.dateToAvg = dateTo
  params.accrualDt = []
  const minAvgCalcTime = cont.constants && cont.constants['hrAccrualAvgCalcTimeDate']
  const timeSheets = minAvgCalcTime ? cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= minAvgCalcTime) : cont.emp[cont.employeeNumberID].prop.timeSheets
  periods.forEach(period => {
    let pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === period.ID) : null
    const df = dateService.shiftDate(Math.max(period.dateFrom, dateFrom))
    const dt = dateService.shiftDate(Math.min(period.dateTo, dateTo))
    let fillMask = algorithmService.getFillMaskByPeriod(df, dt)
    const payTime = algorithmService.getPayTimeByTimeCost(fillMask, df, dt, 'factHour', cont.payEl[params.payElID].payElTimeCost, excludeHolidays, timeSheets, null, orgID)

    const fact = algorithmService.getFactSumForSickness({
      withDetail: true,
      cont,
      payElID: params.payElID,
      periodCalc: period,
      avgOnDate: df,
      partPeriod: true,
      dateFrom: df,
      dateTo: dt
    })
    let baseSum = (pAccr && pAccr.flagsFix & 1 << 0) ? pAccr.baseSum
      : (payTime.days ? fact.factSum : 0)
    const baseECV = cont.dict.hr_maxBaseECB.find(o => o.dateFrom <= period.dateTo) || {}
    if ((baseECV.maxSum || 0) < baseSum) {
      baseSum = (baseECV.maxSum || 0)
    }
    const avg = {
      periodID: period.ID,
      'periodID.name': period.name,
      baseSum: baseSum,
      opSum: (pAccr && pAccr.flagsFix & 1 << 1) ? pAccr.opSum : baseSum,
      opDays: (pAccr && pAccr.flagsFix & 1 << 6) ? pAccr.opDays : payTime.days,
      dateFrom: df,
      dateTo: dt,
      flagsFix: (pAccr && pAccr.flagsFix) || 0
    }
    avg.accrualDt = []
    if (avg.opSum !== 0) {
      if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) {
        avg.accrualDt.push(...JSON.parse(pAccr.accrualDt))
        params.accrualDt.push(...JSON.parse(pAccr.accrualDt))
      } else {
        if (fact.accrualDt.length) {
          fact.accrualDt.forEach(row => {
            avg.accrualDt.push(Object.assign({}, row))
          })
          avg.accrualDt = algorithmService.correctAccrualDt(avg.accrualDt, avg.opSum)
        }
        if (!avg.accrualDt.length && cont.emp[cont.employeeNumberID].prop.useTariffing) {
          avg.accrualDt.push(...postingService.getAccrualDt({
            cont,
            params: {
              dateFrom: period.dateFrom,
              payElID: params.payElID,
              paySum: avg.opSum,
              flagsFix: 0
            }
          }))
        }
        if (!avg.accrualDt && avg.opSum !== 0) {
          const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= (period.dateTo || period.dateFrom) && o.dateTo >= period.dateFrom) ||
            cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}
          if (position && position.fundSources) {
            correctPosFundSource([{ paySum: avg.opSum }], position.fundSources, position.mtCount).forEach(row => {
              avg.accrualDt.push(Object.assign({}, row))
            })
          } else {
            avg.accrualDt.push({ paySum: avg.opSum })
          }
        }
        avg.accrualDt.forEach(o => params.accrualDt.push(Object.assign({}, o)))
      }
    }
    if (pAccr) {
      avg.idx = pAccr.idx
    }
    accrualsAvg.push(avg)
    days += avg.opDays
    allBaseSum = accrualService.round(allBaseSum + avg.opSum, 6)
  })
  if (allBaseSum === 0 || days === 0) {
    if (!(params.flagsRec & 1 << 6) && !(params.flagsRec & 1 << 7)) {
      params.avgCalcType = 'PLAN'
      params.accrualDt = []
    }
  }

  if (!(params.flagsFix & 1)) {
    params.baseSum = accrualService.round(allBaseSum / days, 6)
  }
  params.accrualsAvg = accrualsAvg
  // params.accrualDt = algorithmService.calcGroupSumAccrualDt(params.accrualDt, params.baseSum, true)
  return (allBaseSum > 0 && days > 0)
}

function calculateSicknessAveragePlan ({ orgID, cont, params, periodCalc, onDate }) {
  const accrualsAvg = []
  let pAccr = params.accrualsAvg ? params.accrualsAvg.find(o => o.periodID === periodCalc.ID) : null
  params.dateFromAvg = onDate
  params.dateToAvg = onDate
  const accr = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (!accr) return
  const payEl = cont.payEl[params.payElID]
  const permanentAccrual = {
    payElID: params.payElID,
    dateFrom: cont.payEl[params.payElID].dateFrom,
    dateTo: cont.payEl[params.payElID].dateTo
  }
  const includeSecondJobs = cont.payEl[params.payElID].includeSecondJobs
  let daysCount
  if (!pAccr || !(pAccr.flagsFix & 1 << 6)) {
    daysCount = 30.44 // payTime.days
  } else {
    daysCount = pAccr.opDays
  }

  // Постійні нарахування
  cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, periodCalc)

  let baseSum = (pAccr && pAccr.flagsFix & 1 << 0)
    ? pAccr.baseSum
    : (algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, null, false, true) *
    (accr.payElID && cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1))

  const employeeNumberID = cont.employeeNumberID
  if (payEl.isCorrectPlan) {
    const timeSheets = algorithmService.getTimeSheetByPeriod(periodCalc, cont)
    const timeSheetChanges = UB.Repository('tim_timeSheet')
      .attrs(['dateWork', 'planHour', 'normHour', 'factHour'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateWork', '>=', periodCalc.dateFrom)
      .where('dateWork', '<=', periodCalc.dateTo)
      .where('typeSheetChange', '=', '1')
      .orderBy('dateWork')
      .selectAsObject()
    let date = dateService.shiftDate(periodCalc.dateFrom)
    let normHour = 0
    let factHour = 0
    for (let day = periodCalc.dateFrom.getDate(); day <= periodCalc.dateTo.getDate(); day++) {
      const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
      if (timeSheetDay) {
        normHour = accrualService.round(normHour + (timeSheetDay.normHour || 0), 4)
        const timeSheetChange = timeSheetChanges.find(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())
        factHour = timeSheetChange
          ? accrualService.round(factHour + (timeSheetChange.factHour || 0), 4) : accrualService.round(factHour + (timeSheetDay.normHour || 0), 4)
      }
      date = dateService.addDays(date, 1)
    }
    if (normHour && normHour !== factHour) {
      baseSum = accrualService.round(baseSum / normHour * factHour)
    }
  }
  let baseSumSecJobs = 0
  const firstJob = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (includeSecondJobs && firstJob && firstJob.workPlace === '1') {
    const employeeID = cont.emp[cont.employeeNumberID].prop.employeeNumber.employeeID
    if (Array.isArray(cont.secJobs[employeeID])) {
      cont.secJobs[employeeID].forEach(row => {
        if (cont.emp[row.employeeNumberID] && cont.emp[row.employeeNumberID].prop && cont.emp[row.employeeNumberID].prop.employeePositions) {
          cont.employeeNumberID = row.employeeNumberID
          const accr = cont.emp[row.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
          cont.emp[row.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, periodCalc)
          baseSumSecJobs += (pAccr && pAccr.flagsFix & 1 << 0)
            ? pAccr.baseSum
            : ((accr ? algorithmService.getPlanSum(onDate, cont, permanentAccrual, accr, cont.emp[cont.employeeNumberID].permanentAccrual, false, [], false, null, false, true) *
              (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1) : 0))
        }
      })
    }
  }
  baseSum += baseSumSecJobs
  cont.employeeNumberID = employeeNumberID

  const baseECV = cont.dict.hr_maxBaseECB.find(o => o.dateFrom <= onDate) || {}
  if ((baseECV.maxSum || 0) < baseSum) {
    baseSum = (baseECV.maxSum || 0)
  }
  if (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt && typeof pAccr.accrualDt === 'string') {
    pAccr.accrualDt = JSON.parse(pAccr.accrualDt)
  }
  let accrualDt = (pAccr && pAccr.flagsFix & 1 << 17 && pAccr.accrualDt) ? algorithmService.correctAccrualDt(pAccr.accrualDt, baseSum || 1)
    : postingService.getAccrualDt({
      cont,
      params: {
        dateFrom: onDate,
        payElID: params.payElID,
        paySum: baseSum || 1,
        flagsFix: 0
      }
    })
  const avg = {
    periodID: periodCalc.ID,
    'periodID.name': periodCalc.name,
    baseSum: baseSum,
    opSum: baseSum,
    opDays: daysCount,
    dateFrom: onDate,
    dateTo: onDate,
    accrualDt,
    flagsFix: (pAccr && pAccr.flagsFix) || 0
  }
  if (pAccr) {
    avg.idx = pAccr.idx
  }
  accrualsAvg.push(avg)
  params.accrualsAvg = accrualsAvg
  params.accrualDt = []
  accrualDt.forEach(acc => {
    params.accrualDt.push(Object.assign({}, acc))
  })
  if (!(params.flagsFix & 1)) {
    params.baseSum = accrualService.round(baseSum / daysCount, 6)
  }
}

function correctPosFundSource (accrualDt, fundSources, mtCount) {
  const resultAccrualDt = []
  accrualDt.forEach(row => {
    if (row.dictFundSourceID) {
      resultAccrualDt.push(row)
    } else {
      const accDt = []
      fundSources.forEach(fundSource => {
        const newDt = Object.assign({}, row)
        newDt.paySum = accrualService.round(newDt.paySum / (mtCount || 1) * fundSource.mtCount)
        newDt.dictFundSourceID = fundSource.dictFundSourceID
        newDt.dictProjectID = fundSource.dictProjectID
        accDt.push(newDt)
      })
      resultAccrualDt.push(...algorithmService.correctAccrualDt(accDt, row.paySum))
    }
  })
  return resultAccrualDt
}
