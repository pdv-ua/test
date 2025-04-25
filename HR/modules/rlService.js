const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const orgService = require('../../HR/modules/orgService')
const periodService = require('../../HR/modules/periodService')
const payElService = require('../../HR/modules/payElService')
const payFundService = require('../../HR/modules/payFundService')
const accrualService = require('../../HR/modules/accrualService')
const dateService = require('../../AC/modules/dataServices/dateService')
const employeeService = require('../../HR/modules/employeeService')
const algorithmService = require('../../HR/modules/algorithmService')
const docRegService = require('../../HR/modules/docRegService')
const sicknessService = require('../../HR/modules/sicknessService')
const payRollService = require('../../HR/modules/payRollService')
const contService = require('../../HR/modules/contService')
const paySummaryService = require('../../HR/modules/paySummaryService')
const calendarService = require('../../HR/modules/calendarService')
const postingService = require('../../HR/modules/postingService')
const averageService = require('../../HR/modules/averageService')
const tarifficationService = require('../../HR/modules/tarifficationService')

// Алгоритми розрахунку
const algorithmSalary = require('../modules/algorithm/salary') // Оплата за окладом
const algorithmSurcharge = require('../modules/algorithm/surcharge') // Постійна надбавка
const algorithmMonthPremium = require('../modules/algorithm/monthPremium') // Щомісячна премія
const algorithmEvening = require('../modules/algorithm/evening') // Доплата за роботу у вечірній час
const algorithmNight = require('../modules/algorithm/night') // Доплата за роботу у нічний час
const algorithmRang = require('../modules/algorithm/rang') // Надбавка за ранг
const algorithmVacation = require('../modules/algorithm/vacation') // Відпустка
const algorithmIndexation = require('../modules/algorithm/indexation') // Індексація
const algorithmRaisingToMinSalary = require('../modules/algorithm/raisingToMinSalary') // Доплата до мінімальної
const algorithmHoliday = require('../modules/algorithm/holiday') // Доплата за роботу в святковий день
const algorithmDayOff = require('../modules/algorithm/dayOff') // Оплата за роботу у вихідний день
const algorithmTradeUnionFee = require('../modules/algorithm/tradeUnionFee') // Профспілковий внесок
const algorithmMilitaryFee = require('../modules/algorithm/militaryFee') // Військовий збір
const algorithmIncomeTax = require('../modules/algorithm/incomeTax') // ПДФО
const algorithmAlimony = require('../modules/algorithm/alimony') // Аліменти
const algorithmOvertime = require('../modules/algorithm/overtime') // Оплата за роботу в надурочний час
const algorithmRate = require('../modules/algorithm/rate') // Оплата за тарифом
const algorithmMoreNorm = require('../modules/algorithm/moreNorm') // Переробіток
const algorithmRaisingToAvgSalary = require('../modules/algorithm/raisingToAvgSalary') // Доплата до среднего зароботка
const algorithmRequestEmployee = require('../modules/algorithm/requestEmployee') // Перерахування за заявою працівника
const algorithmPaySalary = require('../modules/algorithm/paySalary') // Виплата зарплати
const algorithmPaySum = require('../modules/algorithm/paySum') // Сума для розрахунку середнього заробітку
const algorithmTrfSalary = require('../modules/algorithm/trfSalary') // Пед.навантаження
const algorithmRaisingToMinSum = require('../modules/algorithm/raisingToMinSum') // Доплата до мінімальної суми
const algorithmReserve = require('../modules/algorithm/reserve') // Резерв відпустки
const pieceWork = require('../modules/algorithm/pieceWork') // Відрядна оплата праці

module.exports = {
  startPayCalc,
  stopPayCalc,
  autoCalculate,
  calculateAccrual,
  calculateOrderAccrual,
  calculateOrderAccrualDt,
  getSalaryFromRl,
  calcSelAlgorithm,
  getCalcAccrual,
  loadCalcData,
  autoCalculateBalance
}

function startPayCalc (orgID, numCount, calcBalance, description = '') {
  const store = UB.DataStore('hr_payCalc')
  const payCalcID = store.generateID()
  store.run('insert', {
    __skipSelectAfterInsert: true,
    execParams: {
      ID: payCalcID,
      orgID: orgID,
      timeStampBegin: dateService.currentDateTime(),
      numCount: numCount,
      calcBalance: calcBalance || 0,
      description: description

    }
  })
  store.freeNative()
  return payCalcID
}

function stopPayCalc (payCalcID, stopDate) {
  const store = UB.DataStore('hr_payCalc')
  try {
    store.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      execParams: {
        ID: payCalcID,
        timeStampEnd: stopDate || dateService.currentDateTime()
      }
    })
  } catch (e) { }
  store.freeNative()
}

/**
 * @param cont
 * @param orgID
 * @param periodID
 * @param payCalcID
 * @param employeeNumbers
 * @param calculateProperty {object}
 *          calcType 1 << 0 - Стандартний режим, 1 << 1 - нарахування, 1 << 2 - утримання, 1 << 3 інтервал розрахунку, 1 << 4 - по списку видів оплат, 1 << 5 розрахунковий лист, 1 << 6 ЄСВ
 *          dateFrom
 *          dateTo
 *          calculatePayElIDs = [3,4...]
 *          accrual: [{
 *           periodCalcID: periodCalc.ID,
             periodSalaryID: periodSalary.ID,
             periodCalc: periodCalc.dateFrom,
             periodSalary: periodSalary.dateFrom,
             employeeNumberID: employeeNumberID,
             payElID: payElID,
             mask: mask,
             paySum,
             dateFrom,
             dateTo
 *          }]
 * @param returnCalcData
 * @param skipCommit
 * @returns {boolean}
 */
function autoCalculate ({ cont = {}, orgID, periodID, payCalcID, employeeNumbers = [], calculateProperty = { calcType: 1 << 0 },
  returnCalcData = false, skipCommit = false }) {
  let logDate = new Date()
  console.log(`autoCalculate Початок розрахунку - Кількість  ${employeeNumbers.length}`)
  console.log(`autoCalculate Початок завантаження даних по організації`)
  let timeCalc
  if (cont.logCalcTime === undefined) {
    cont.logCalcTime = !!(UB.App.serverConfig.application.customSettings && UB.App.serverConfig.application.customSettings.logCalcTime)
  }
  if (!cont.payCalcID) {
    cont.payCalcID = payCalcID
  }
  // Дані періода
  if (!cont.periodCalc) {
    cont.periodCalc = periodService.getPeriod(periodID)
  }

  let periodCalc = cont.periodCalc

  // Дані організації
  if ((!periodCalc.isCurrent || periodCalc.orgID !== orgID) && (33 & calculateProperty.calcType)) {
    return false
  }
  if (!cont.secJobs) {
    cont.secJobs = {}
  }
  cont.orgID = orgID
  if (!cont.org) {
    cont.org = orgService.getOrgData(orgID)
  }
  if (!cont.constants) {
    cont.constants = orgService.getOrgConstant(orgID)
  }
  if (!cont.orgName) {
    cont.orgName = UB.Repository('ac_organization').attrs('name').where('ID', '=', orgID).selectScalar()
  }

  if (!cont.periods) {
    cont.periods = periodService.getArrayPeriods(orgID, periodCalc.dateFrom)
  }

  // Види оплат
  if (!cont.payEl) {
    cont.payEl = payElService.getPayEl({ orgID })
  }
  if (!cont.sicknessPayEls) {
    cont.sicknessPayEls = payElService.filterPayEl({ cont, groupCodes: [4, 5] })
  }
  if (!cont.countCalc) {
    cont.countCalc = 1
  }
  // Правила розрахунку тарифікації
  if (!cont.trfCalcRule && cont.constants.hrTariffingEducational) {
    cont.trfCalcRule = tarifficationService.getDictAccrualDt({ orgID })
  }

  // Фонди
  if (!cont.payFund) {
    cont.payFund = payFundService.getPayFund()
  }
  if (!cont.dict) {
    contService.initDict(cont) // Завантаження загальних довідників
  }
  if (!cont.unconfirmedSickness) {
    cont.unconfirmedSickness = cont.dict.hr_dictTimeCost.find(o => o.code === 'НеПідЛ') || { ID: 0 }
  }

  if (!cont.emp) {
    cont.emp = {}
  }
  const prevMonthDate = dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -36)
  const nextMonthDate = dateService.addMonths(periodCalc.dateTo, 12)
  if (!cont.holidays) {
    cont.holidays = calendarService.getHolidays(dateService.addMonths(prevMonthDate, -84), nextMonthDate, orgID)
  }
  console.log(`autoCalculate Кінець завантаження даних по організації ${orgID} ${cont.orgName} - ${(new Date()).getTime() - logDate.getTime()}`)
  logDate = new Date()

  employeeNumbers.forEach(employeeNumber => {
    const employeeNumberID = typeof employeeNumber === 'object' ? employeeNumber.employeeNumberID : employeeNumber
    if (cont.emp[employeeNumberID] && cont.emp[employeeNumberID].isCalculate && (!returnCalcData || cont.emp[employeeNumberID].accrual)) {
      return
    }
    let employeeDescription = `${employeeNumberID}`
    console.log(`autoCalculate Початок завантаження даних по працівнику ${employeeNumberID} orgID:${orgID} ${cont.orgName}`)
    logDate = new Date()
    if (!cont.emp[employeeNumberID]) {
      cont.emp[employeeNumberID] = {}
    }
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime = { timeCalc: 0, periodCount: 0, timeCalcDt: {} }
    }
    cont.employeeNumberID = employeeNumberID
    // Періоди перерахунку
    let recalcDate = (97 & calculateProperty.calcType)
      ? accrualService.getReCalcDate({ orgID: cont.orgID, employeeNumberID, periodID: periodCalc.ID, reCalcDate: periodCalc.dateFrom, minReCalcDate: cont.constants.hrMinReCalcDate, calculateProperty })
      : { dateFrom: periodCalc.dateFrom, dateTo: periodCalc.dateTo, minReCalcDate: cont.constants.hrMinReCalcDate }
    if (calculateProperty.calcType & 1 << 2) {
      (calculateProperty.accrual[employeeNumberID] || []).forEach(acc => {
        recalcDate.dateFrom = dateService.shiftDate(Math.min(recalcDate.dateFrom, dateService.shiftDate(acc.periodCalc), dateService.shiftDate(acc.periodSalary)))
        recalcDate.dateTo = dateService.shiftDate(Math.max(recalcDate.dateTo, dateService.shiftDate(acc.periodCalc), dateService.shiftDate(acc.periodSalary)))
      })
    }

    let loadDateFrom = (calculateProperty.calcType & 1 << 2 && calculateProperty.dateFrom)
      ? dateService.addMonths(calculateProperty.dateFrom, -2)
      : dateService.firstDayOfYear(dateService.addMonths(recalcDate.dateFrom, -24))
    const loadDateTo = dateService.shiftDate(Math.max(recalcDate.dateTo, nextMonthDate))
    // Дані працівника (призначення, нарахування, табель)
    if (!cont.emp[employeeNumberID].prop) {
      cont.emp[employeeNumberID].prop = employeeService.getEmpData(employeeNumberID, loadDateFrom, loadDateTo, null, cont)
    }
    if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.employeeNumber) {
      employeeDescription = `${employeeNumberID} ${cont.emp[employeeNumberID].prop.employeeNumber.description}`
    }
    if (!cont.emp[employeeNumberID].prop.employeeNumber || cont.emp[employeeNumberID].prop.employeeNumber.orgID !== periodCalc.orgID) {
      return
    }

    timeCalc = (new Date()).getTime() - logDate.getTime()
    console.log(`autoCalculate Кінець завантаження даних по працівнику ${employeeDescription} orgID:${orgID} ${cont.orgName} - ${timeCalc}`)
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime.timeCalcDt[`завантаження даних`] = timeCalc
      cont.emp[employeeNumberID].logCalcTime.timeCalc += timeCalc
    }
    const secEmpNumIds = []
    const workPlaceNumIds = []
    const secAccrual = []
    const accrualFundSec = []
    if (97 & calculateProperty.calcType) {
      if (cont.emp[employeeNumberID].prop.employeePositions.length &&
        cont.emp[employeeNumberID].prop.employeePositions[cont.emp[employeeNumberID].prop.employeePositions.length - 1].workPlace === '1') {
        console.log(`autoCalculate Початок Розрахунок сумісників`)
        employeeService.loadSecondJobs(orgID, cont, employeeNumberID)
        if (cont.secJobs[cont.emp[employeeNumberID].prop.employeeNumber.employeeID]) {
          cont.secJobs[cont.emp[employeeNumberID].prop.employeeNumber.employeeID].forEach(row => {
            if (row.employeeNumberID !== employeeNumberID && row['employeeNumberID.dateFrom'] <= periodCalc.dateTo &&
              row['employeeNumberID.dateTo'] >= dateService.addMonths(periodCalc.dateFrom, -3) &&
              !secEmpNumIds.find(o => o === row.employeeNumberID && row.employeeNumberID !== employeeNumberID)) {
              secEmpNumIds.push(row.employeeNumberID)
            } else {
              accrualFundSec.push(...accrualService.getFundAccrual(cont.orgID, row.employeeNumberID, loadDateFrom, dateService.addMonths(periodCalc.dateFrom, 1)))
            }
          })
          if (secEmpNumIds.length) {
            if (calculateProperty.calcType & 1 << 6) {
              secEmpNumIds.forEach(secEmpID => {
                accrualFundSec.push(...accrualService.getFundAccrual(cont.orgID, secEmpID, loadDateFrom, dateService.addMonths(periodCalc.dateFrom, 1)))
              })
            } else {
              autoCalculate({
                cont,
                orgID,
                periodID,
                payCalcID,
                employeeNumbers: secEmpNumIds,
                calculateProperty: Object.assign(Object.assign({}, calculateProperty), { calcType: calculateProperty.calcType | 1 << 12 }),
                returnCalcData: true,
                skipCommit
              })
              secEmpNumIds.forEach(secEmpID => {
                if (cont.emp[secEmpID] && cont.emp[secEmpID].accrual) {
                  cont.emp[secEmpID].accrual.forEach(accr => {
                    if (accr.periodCalcID === periodCalc.ID && accr.insert !== false) {
                      const acc = Object.assign({}, accr)
                      acc.employeeNumberPartID = accr.employeeNumberID
                      acc.employeeNumberID = employeeNumberID
                      acc.insert = true
                      delete acc.ID
                      // delete acc.accrualDt
                      acc.flagsRec = (((1 | 1 << 12) | 1 << 13) | (accr.flagsRec & 1 << 10)) | (accr.flagsRec & 1 << 13 ? 1 << 18 : 0)
                      secAccrual.push(acc)
                      if (accr.periodSalary < recalcDate.dateFrom && (!cont.constants.hrTimeSheetReCalcDate || accr.periodSalary >= cont.constants.hrTimeSheetReCalcDate)) {
                        recalcDate.dateFrom = accr.periodSalary
                      }
                    }
                  })
                }
                if (cont.emp[secEmpID] && cont.emp[secEmpID].accrualFund && cont.emp[secEmpID].accrualFund.length) {
                  accrualFundSec.push(...cont.emp[secEmpID].accrualFund)
                }
              })
            }
          }
          cont.employeeNumberID = employeeNumberID
        }
        console.log(`autoCalculate Кінець Розрахунок сумісників`)
        // Завантаження Нарахувань на зарплату попереднього табельного основного
      }
      if (cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop.useTariffing && cont.emp[employeeNumberID].prop.employeeNumber && cont.emp[employeeNumberID].prop.employeeNumber.empWorkPlace !== '5') {
        console.log(`autoCalculate Початок розрахунку робочого місця`)
        employeeService.loadWorkPlace(orgID, cont, employeeNumberID).forEach(row => {
          if (row.empWorkPlace === '5' && row.employeeNumberID !== employeeNumberID && row['employeeNumberID.dateFrom'] <= periodCalc.dateTo &&
               row['employeeNumberID.dateTo'] >= dateService.addMonths(periodCalc.dateFrom, -3) &&
               !workPlaceNumIds.find(o => o === row.employeeNumberID && row.employeeNumberID !== employeeNumberID)) {
            workPlaceNumIds.push(row.employeeNumberID)
          } else {
            accrualFundSec.push(...accrualService.getFundAccrual(cont.orgID, row.employeeNumberID, loadDateFrom, dateService.addMonths(periodCalc.dateFrom, 1)))
          }
        })
        if (workPlaceNumIds.length) {
          if (calculateProperty.calcType & 1 << 6) {
            workPlaceNumIds.forEach(secEmpID => {
              accrualFundSec.push(...accrualService.getFundAccrual(cont.orgID, secEmpID, loadDateFrom, dateService.addMonths(periodCalc.dateFrom, 1)))
            })
          } else {
            autoCalculate({
              cont,
              orgID,
              periodID,
              payCalcID,
              employeeNumbers: workPlaceNumIds,
              calculateProperty: Object.assign(Object.assign({}, calculateProperty), { calcType: calculateProperty.calcType | 1 << 12 }),
              returnCalcData: true,
              skipCommit
            })
            workPlaceNumIds.forEach(secEmpID => {
              if (cont.emp[secEmpID] && cont.emp[secEmpID].accrual) {
                cont.emp[secEmpID].accrual.forEach(accr => {
                  if (accr.periodCalcID === periodCalc.ID && accr.insert !== false) {
                    const acc = Object.assign({}, accr)
                    acc.employeeNumberPartID = accr.employeeNumberID
                    acc.employeeNumberID = employeeNumberID
                    acc.insert = true
                    acc.calcParams = acc.calcParams ? (typeof acc.calcParams === 'object' ? acc.calcParams : JSON.parse(acc.calcParams)) : {}
                    acc.calcParams.createFromAccrualID = acc.ID
                    delete acc.ID
                    // delete acc.accrualDt
                    acc.flagsRec = accr.flagsRec | 1 << 20
                    secAccrual.push(acc)
                    if (accr.periodSalary < recalcDate.dateFrom && (!cont.constants.hrTimeSheetReCalcDate || accr.periodSalary >= cont.constants.hrTimeSheetReCalcDate)) {
                      recalcDate.dateFrom = accr.periodSalary
                    }
                  }
                })
              }
            })
          }
        }
        cont.employeeNumberID = employeeNumberID
        console.log(`autoCalculate Кінець розрахунку робочого місця`)
      }

      if (cont.emp[employeeNumberID].prop.employeePositions.length &&
        ['1', '3'].includes(cont.emp[employeeNumberID].prop.employeePositions[cont.emp[employeeNumberID].prop.employeePositions.length - 1].workPlace)) {
        const priorTab = employeeService.getPriorEmployeeNumber(orgID, cont, employeeNumberID, cont.emp[employeeNumberID].prop.employeePositions[cont.emp[employeeNumberID].prop.employeePositions.length - 1].workPlace)
        priorTab.forEach(priorTab => {
          const accrualFundTab = accrualService.getFundAccrual(priorTab.orgID, priorTab.employeeNumberID, loadDateFrom, periodCalc.dateTo)
          accrualFundTab.forEach(accr => {
            const periodCalc = cont.periods.find(o => o.dateFrom.getTime() === accr.periodCalc.getTime())
            if (periodCalc) {
              accr.periodCalcID = periodCalc.ID
            }
            const periodSalary = cont.periods.find(o => o.dateFrom.getTime() === accr.periodSalary.getTime())
            if (periodSalary) {
              accr.periodSalaryID = periodSalary.ID
            }
          })
          accrualFundSec.push(...accrualFundTab)
        })
      }
    }
    if (!(calculateProperty.calcType & 1 << 2)) {
      const recalcDateFrom = dateService.shiftDate(Math.min(dateService.firstDayOfYear(dateService.addMonths(recalcDate.dateFrom, -24)), dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -24)))
      if (loadDateFrom > recalcDateFrom) {
        console.log(`autoCalculate Varning reload getEmpData`)
        cont.emp[employeeNumberID].prop = employeeService.getEmpData(employeeNumberID, recalcDateFrom, loadDateTo, null, cont)
        loadDateFrom = recalcDateFrom
      }
    }
    // Загрузка нарахувань
    if ((97 & calculateProperty.calcType) || !calculateProperty.accrual) {
      cont.emp[employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, employeeNumberID, loadDateFrom, (calculateProperty.calcType & 1 << 6 ? null : periodCalc.ID), periodCalc.dateTo)
      cont.emp[employeeNumberID].accrualAvg = accrualService.getAccrualAvgByAccrual(cont.emp[employeeNumberID].accrual)
      if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.parentEmpNumbers) {
        cont.emp[employeeNumberID].prop.parentEmpNumbers.forEach(parent => {
          const accruals = accrualService.getAccrual(parent.orgID, parent.employeeNumberID, loadDateFrom)
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
            cont.emp[employeeNumberID].accrual.push(Object.assign({}, accr))
          })
        })
      }
      checkAndLoadTimeSheet(cont, employeeNumberID)
    } else {
      cont.emp[employeeNumberID].accrual = calculateProperty.accrual[employeeNumberID] || []
      cont.emp[employeeNumberID].accrualAvg = []
    }
    cont.emp[employeeNumberID].accrualFund = (97 & calculateProperty.calcType)
      ? accrualService.getFundAccrual(cont.orgID, employeeNumberID, loadDateFrom, periodCalc.dateFrom) : []

    if (secAccrual.length) {
      cont.emp[employeeNumberID].accrual.push(...secAccrual)
    }
    if (!cont.emp[employeeNumberID].accrualFundSec) {
      cont.emp[employeeNumberID].accrualFundSec = accrualFundSec
    } else {
      cont.emp[employeeNumberID].accrualFundSec.push(...accrualFundSec)
    }
    cont.emp[employeeNumberID].recalcDateTo = dateService.lastDayOfMonth(recalcDate.dateTo)
    console.log(`autoCalculate Перерахунок з ${dateService.formatDate(recalcDate.dateFrom)}`)
    let reCalcPeriod = periodService.getPeriodsByDateFromCont(cont, recalcDate.dateFrom, cont.emp[employeeNumberID].recalcDateTo)
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime.periodCount = reCalcPeriod.length
    }
    console.log(`autoCalculate Початок Розрахунок РЛ`)
    logDate = new Date()
    // "Сторнування невиходів змінених ручним коригуванням"

    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      reCalcPeriod.forEach(periodSalary => {
        if (cont.constants.hrTimeSheetReCalcDate && cont.constants.hrTimeSheetReCalcDate > periodSalary.dateFrom) {
          return
        }
        cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
          if (!(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 16) && !(accr.flagsRec & 1 << 20) &&
            accr.dateFrom <= periodSalary.dateTo && accr.dateTo >= periodSalary.dateFrom &&
            (([4, 5].includes(cont.payEl[accr.payElID].method.groupCode) && !['16', '71'].includes(cont.payEl[accr.payElID].method.code)) ||
              cont.payEl[accr.payElID].method.code === '21')) {
            if (accr.days && accr.mask) {
              const reversal = cont.emp[cont.employeeNumberID].accrual.filter(o => o.linkToParentID === accr.ID && (o.flagsRec & 1 << 9))
              let accrMask = accr.mask
              let reversalMask = 0
              let reversalDays = 0
              let reversalHours = 0
              let dayCount = accr.days
              reversal.forEach(rev => {
                accrMask = accrMask & ~rev.mask
                dayCount += rev.days
              })
              if (dayCount > 0) {
                const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
                let date = dateService.shiftDate(accr.dateFrom)
                for (let day = accr.dateFrom.getDate(); day <= accr.dateTo.getDate(); day++) {
                  if (accrMask & 1 << (date.getDate() - 1)) {
                    const timeSheetDay = timeSheets.find(o => o.dateWork.getTime() === date.getTime())
                    if ((timeSheetDay && (((accr.flagsRec & 8 || accr.source) && timeSheetDay.factTimeCostType !== 'ABSENCE') ||
                      (!(accr.flagsRec & 8 || accr.source) && (!timeSheetDay.orderID || (timeSheetDay.orderID !== accr.orderID &&
                        timeSheetDay.orderID !== accr.empOrderID && timeSheetDay.orderID !== accr.timeSheetID))))) ||
                      (!timeSheetDay && cont.emp[employeeNumberID].prop.employeeNumber.finishWork < date)) {
                      reversalMask = reversalMask | 1 << (date.getDate() - 1)
                      reversalDays++
                      reversalHours += (timeSheetDay && timeSheetDay.planHour) || 0
                    }
                  }
                  date = dateService.addDays(date, 1)
                }
                if (reversalDays > 0 && reversalMask > 0) {
                  const acc = Object.assign(Object.assign({}, accr))
                  delete acc.accrualDt
                  acc.accrualDt = []
                  if (accr.accrualDt && accr.accrualDt.length) {
                    accr.accrualDt.forEach(dt => {
                      acc.accrualDt.push(Object.assign({}, dt))
                    })
                  }
                  acc.insert = true
                  acc.periodCalcID = periodCalc.ID
                  acc.periodCalc = periodCalc.dateFrom
                  acc.linkToParentID = acc.ID
                  delete acc.ID
                  acc.mask = reversalMask
                  acc.flagsRec = (1 | 1 << 9) | (acc.flagsRec & 1 << 5)
                  acc.paySum = -1 * accrualService.round(accr.paySum / accr.days * reversalDays)
                  acc.baseSum = -1 * acc.baseSum
                  acc.calculateDate = dateService.currentDateTime()
                  acc.days = -1 * reversalDays
                  acc.hours = -1 * reversalHours || null
                  let paySumDt = 0
                  if (acc.accrualDt && acc.accrualDt.length) {
                    acc.accrualDt.forEach(accDt => {
                      delete accDt.ID
                      delete accDt.accrualID
                      let dtSum = -1 * accrualService.round(accDt.paySum / accr.days * reversalDays)
                      accDt.paySum = dtSum
                      paySumDt = accrualService.round(paySumDt + dtSum)
                    })
                    if (acc.paySum !== paySumDt) {
                      acc.accrualDt[0].paySum = accrualService.round(acc.accrualDt[0].paySum + acc.paySum - paySumDt)
                    }
                  } else {
                    acc.accrualDt = [{
                      paySum: acc.paySum
                    }]
                  }
                  if (acc.accrualAvg) {
                    acc.accrualAvg.forEach(accAvg => {
                      delete accAvg.ID
                      delete accAvg.accrualID
                    })
                  }
                  cont.emp[cont.employeeNumberID].accrual.push(acc)
                }
              }
            }
          }
        })
      })
    }

    // Цикл по періодам які перераховуються "Відпустка по догляду за дитиною"
    let calcMethods = ['14', '15', '57', '140']
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        // Постійні нарахування
        cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        const salaryAccrual = cont.emp[cont.employeeNumberID].permanentAccrual.length ? accrualService.getChangeSalaryAccrual({ cont, periodSalary }) : []
        salaryAccrual.forEach(accr => {
          cont.emp[cont.employeeNumberID].permanentAccrual
            .filter(o => ((35 & calculateProperty.calcType) ||
              (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
              cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
              calcMethods.includes(cont.payEl[o.payElID].method.code) &&
              !cont.emp[cont.employeeNumberID].accrual.find(a => a.periodSalaryID === periodSalary.ID && a.periodCalcID === periodCalc.ID &&
                a.payElID === o.payElID && !(a.flagsRec & 1 << 9) && (15 & a.flagsRec) && !(a.flagsRec & 4096)))
            .forEach(perAccr => {
              const payEl = cont.payEl[perAccr.payElID]
              let perDateFrom = dateService.shiftDate(Math.max(accr.dateFrom, perAccr.dateFrom))
              let perDateTo = dateService.shiftDate(Math.min(accr.dateTo, perAccr.dateTo))
              if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
              }
              const params = {
                employeeNumberID: cont.employeeNumberID,
                payElID: perAccr.payElID,
                mtCount: accr.isMtCount ? (accr.mtCount || 1) : 1,
                dateFrom: perDateFrom,
                dateTo: perDateTo,
                baseSum: 0,
                paySum: 0,
                flagsRec: 1,
                empOrderID: perAccr.orderID,
                timeSheetID: perAccr.ID
              }
              const source = {
                source: perAccr.source,
                sourceID: perAccr.ID
              }
              const sourceAccr = {
                perAccr,
                periodCalc
              }
              switch (payEl.method.code) {
                case '57':
                case '14':
                case '15':
                case '140':
                  if (perAccr.source === 'hr_employeeAccrual') {
                    params.mask = 0
                    params.days = 0
                    timeSheets.forEach(timeSheetDay => {
                      if (timeSheetDay.dateWork >= params.dateFrom && timeSheetDay.dateWork <= params.dateTo &&
                        ((timeSheetDay.orderID === perAccr.ID) || (perAccr.orderID && timeSheetDay.orderID === perAccr.orderID))) {
                        params.days++
                        params.mask = params.mask | 1 << (timeSheetDay.dateWork.getDate() - 1)
                      }
                    })
                  } else {
                    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
                    params.days = (params.mask.toString(2).match(/1/g) || []).length
                  }
                  calcSelAlgorithm({
                    payEl,
                    params,
                    cont,
                    periodCalc,
                    periodSalary,
                    source,
                    sourceAccr,
                    calculateProperty
                  })
                  break
              }
            })
        })
        // }
      })
    }
    calcMethods = ['1', '2', '63', '77', '146', '147', '156']
    // Цикл по періодам які перераховуються "Cистема оплати"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      reCalcPeriod.forEach(periodSalary => {
        // Сторно нарахувань
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl, source) => { return calcMethods.includes(payEl.method.code) && (!source || ['hr_employeePosition', 'trf_accrual'].includes(source)) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        // система оплати
        cont.emp[employeeNumberID].salaryAccrual = cont.emp[employeeNumberID].prop.useTariffing
          ? accrualService.getTariffingAccrualList({ orgID, cont, periodSalary, methodCodeList: ['1', '146', '147', '156'] })
            .map(o => { o.flagsFix = 0; return o })
          : accrualService.getSalaryAccrual({ orgID, cont, periodSalary })
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        let maxOvertime = 0
        cont.emp[employeeNumberID].salaryAccrual.forEach(params => {
          if (cont.dict.hr_workSchedule.find(o => o.ID === params.workScheduleID && o.isSummarized)) {
            const payTime = algorithmService.getTimeByTimeSheet({
              cont,
              payElID: params.payElID,
              timeSheets,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              isCorrection: periodSalary.dateFrom > periodCalc.dateTo,
              isSummarized: !cont.payEl[params.payElID].payOverNorm && cont.dict.hr_workSchedule.find(o => o.ID === params.workScheduleID && o.isSummarized),
              planByNorm: true,
              maxOvertime: true
            })
            maxOvertime = accrualService.round(maxOvertime + payTime.overtime, 3)
          }
        })

        // Розрахунок видів оплат групи Система оплати
        cont.emp[employeeNumberID].salaryAccrual.forEach(params => {
          const payEl = cont.payEl[params.payElID]
          if (((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(params.payElID))) &&
            payEl.isAutoCalc && (cont.payEl[params.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) && calcMethods.includes(payEl.method.code) &&
            !cont.emp[employeeNumberID].accrual.find(o => o.periodSalaryID === periodSalary.ID && (6 & o.flagsRec) && !(o.flagsRec & 1 << 9) && !(o.flagsRec & 4096) &&
              (o.payElID === params.payElID /* cont.payEl[o.payElID].method.groupCode === 1 */ && !['137', '3'].includes(cont.payEl[o.payElID].method.code)) && !(o.flagsRec & 1 << 1))) {
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              params.dateFrom = dateService.shiftDate(Math.max(params.dateFrom, calculateProperty.dateFrom))
              params.dateTo = dateService.shiftDate(Math.min(params.dateTo, calculateProperty.dateTo))
            }
            const pos = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, params.dateFrom, params.dateTo)
            const payTime = algorithmService.getTimeByTimeSheet({
              cont,
              payElID: params.payElID,
              timeSheets,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              isCorrection: periodSalary.dateFrom > periodCalc.dateTo,
              isSummarized: !cont.payEl[params.payElID].payOverNorm && cont.dict.hr_workSchedule.find(o => o.ID === params.workScheduleID && o.isSummarized),
              maxOvertime,
              planByNorm: true
            })
            maxOvertime = accrualService.round(maxOvertime - payTime.overtime, 3)
            params.flagsRec = 1
            params.planDays = payTime.planDays
            params.planHours = payTime.planHours
            params.days = payTime.days
            params.hours = payTime.hours
            params.mask = payTime.mask
            params.hoursByDays = payTime.hoursByDays
            params.planHoursByDays = payTime.planHoursByDays
            params.leadingHoursByDays = payTime.leadingHoursByDays
            if ((pos && pos.payElID?cont.payEl[pos.payElID].calcProportion : cont.payEl[params.payElID].calcProportion)!== 'DAY' || !payTime.fullTime) {
              params.flagsRec = params.flagsRec | 1 << 5
            }
            let algorithm
            switch (payEl.method.code) {
              case '1':
              case '77': {
                algorithm = algorithmSalary
                const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params }),
                  {
                    source: params.source || 'hr_employeePosition',
                    sourceID: params.ID
                  })
                if (!(accrual.paySum > 0 || accrual.days !== 0 || accrual.hours !== 0)) {
                  accrual.insert = false
                }
                if (params.source === 'trf_accrual') {
                  accrual.flagsRec |= 1 << 15
                  cont.emp[cont.employeeNumberID].accrual.push(accrual)
                } else {
                  reduction({ cont, accrual, calculateProperty })
                }
                break
              }
              case '2': {
                algorithm = algorithmRate
                const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params }),
                  {
                    source: 'hr_employeePosition',
                    sourceID: params.ID
                  })
                if (!(accrual.paySum > 0 || accrual.days !== 0 || accrual.hours !== 0)) {
                  accrual.insert = false
                }
                if (params.source === 'trf_accrual') {
                  accrual.flagsRec |= 1 << 15
                  cont.emp[cont.employeeNumberID].accrual.push(accrual)
                } else {
                  reduction({ cont, accrual, calculateProperty })
                }
                break
              }
              case '63': {
                algorithm = pieceWork
                const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params }),
                  {
                    source: 'hr_employeePosition',
                    sourceID: params.ID
                  })
                if (!(accrual.paySum > 0 || accrual.days !== 0 || accrual.hours !== 0)) {
                  accrual.insert = false
                }
                  if (params.source === 'trf_accrual') {
                      accrual.flagsRec |= 1 << 15
                      cont.emp[cont.employeeNumberID].accrual.push(accrual)
                  } else {
                      reduction({cont, accrual, calculateProperty})
                  }
                break
              }
              case '146':
                if (params.source === 'trf_accrual') {
                  algorithm = algorithmTrfSalary
                  const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params }),
                    {
                      source: params.source || 'trf_accrual',
                      sourceID: params.ID
                    })
                  accrual.flagsRec |= 1 << 5 | 1 << 15
                  if (accrual.paySum > 0 || accrual.days !== 0 || accrual.hours !== 0) {
                    accrual.calculateDate = dateService.currentDateTime()
                    if (accrual.insert !== false) {
                      accrual.insert = true
                    }
                    cont.emp[cont.employeeNumberID].accrual.push(accrual)
                    // reduction({ cont, accrual, calculateProperty })
                  }
                }
                break
              case '156':
              case '147': {
                if (params.source === 'trf_accrual') {
                  algorithm = algorithmSalary
                  const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params }),
                    {
                      source: params.source || 'trf_accrual',
                      sourceID: params.ID
                    })
                  accrual.flagsRec |= 1 << 15
                  if (accrual.paySum > 0 || accrual.days !== 0 || accrual.hours !== 0) {
                    accrual.calculateDate = dateService.currentDateTime()
                    if (accrual.insert !== false) {
                      accrual.insert = true
                    }
                    cont.emp[cont.employeeNumberID].accrual.push(accrual)
                    // reduction({ cont, accrual, calculateProperty })
                  }
                }
                break
              }
            }
          }
        })
      })
    }

    // "Cистема оплати" - в постійних нарахуваннях
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['1', '2', '3', '77', '137']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl, source) => { return (['1', '2', '3', '77', '137'].includes(payEl.method.code) && source && !['hr_employeePosition', 'trf_accrual'].includes(source)) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o => !['hr_employeePosition', 'trf_accrual'].includes(o.source) &&
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom && calcMethods.includes(cont.payEl[o.payElID].method.code) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }

            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }

            const sourceAccr = {
              perAccr,
              periodCalc
            }
            switch (payEl.method.code) {
              case '1':
              case '2':
              case '77': {
                algorithmService.getChangeSalaryByPeriod(cont, perDateFrom, perDateTo).forEach(salaryChangePeriod => {
                  params.dateFrom = salaryChangePeriod.dateFrom
                  params.dateTo = salaryChangePeriod.dateTo
                  const payTime = algorithmService.getTimeByTimeSheet({
                    cont,
                    payElID: params.payElID,
                    timeSheets,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo,
                    isCorrection: periodSalary.dateFrom > periodCalc.dateTo,
                    isSummarized: !cont.payEl[params.payElID].payOverNorm && cont.dict.hr_workSchedule.find(o => o.ID === salaryChangePeriod.workScheduleID && o.isSummarized),
                    planByNorm: true
                  })
                  params.flagsRec = 1
                  params.planDays = payTime.planDays
                  params.planHours = payTime.planHours
                  params.days = payTime.days
                  params.hours = payTime.hours
                  params.mask = payTime.mask
                  params.hoursByDays = payTime.hoursByDays
                  params.planHoursByDays = payTime.planHoursByDays
                  params.leadingHoursByDays = payTime.leadingHoursByDays
                  const pos = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, params.dateFrom, params.dateTo)
                  if (/*cont.payEl[params.payElID].calcProportion*/cont.payEl[pos.payElID].calcProportion !== 'DAY' || !payTime.fullTime) {
                    params.flagsRec = params.flagsRec | 1 << 5
                  }
                  params.baseSum = perAccr.baseSum || salaryChangePeriod.accrualSum
                  params.mtCount = (salaryChangePeriod.mtCount && payEl.isMtCount) ? salaryChangePeriod.mtCount : 1
                  calcSelAlgorithm({
                    payEl,
                    params,
                    cont,
                    periodCalc,
                    periodSalary,
                    source,
                    sourceAccr,
                    calculateProperty
                  })
                })
                break
              }
              case '3': {
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                const payTime = algorithmService.getTimeByTimeSheet({
                  cont,
                  payElID: params.payElID,
                  timeSheets,
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo,
                  isCorrection: periodSalary.dateFrom > periodCalc.dateTo
                })
                params.flagsRec = 1
                params.planDays = payTime.planDays || (payEl.isTimeSheet ? payTime.planDays : 1)
                params.planHours = payTime.planHours || (payEl.isTimeSheet ? payTime.planHours : 1)
                params.days = payEl.isTimeSheet ? payTime.days : params.planDays
                params.hours = payEl.isTimeSheet ? payTime.hours : params.planHours
                params.mask = payEl.isTimeSheet ? payTime.mask : 0
                params.hoursByDays = payTime.hoursByDays
                params.planHoursByDays = payTime.planHoursByDays
                params.leadingHoursByDays = payTime.leadingHoursByDays
                params.mtCount = 1
                const pos = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, params.dateFrom, params.dateTo)
                  if (/*cont.payEl[params.payElID].calcProportion*/cont.payEl[pos.payElID].calcProportion !== 'DAY' || !payTime.fullTime) {
                  params.flagsRec = params.flagsRec | 1 << 5
                }
                params.baseSum = perAccr.baseSum
                params.remindSum = perAccr.remindSum || 0
                cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
                  if (accr.sourceID === perAccr.ID && accr.periodCalcID === periodCalc.ID) {
                    params.remindSum = Math.max(0, (params.remindSum || 0) - accr.paySum)
                  }
                })
                if (perAccr.accrualDateTo >= periodSalary.dateFrom && perAccr.accrualDateTo <= periodSalary.dateTo) {
                  params.baseSum = params.remindSum
                  params.planHours = params.hours
                  params.planDays = params.days
                }
                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
                break
              }
              case '137': {
                algorithmService.getChangeSalaryByPeriod(cont, perDateFrom, perDateTo).forEach(salaryChangePeriod => {
                  params.dateFrom = salaryChangePeriod.dateFrom
                  params.dateTo = salaryChangePeriod.dateTo
                  const payTime = algorithmService.getTimeByTimeSheet({
                    cont,
                    payElID: params.payElID,
                    timeSheets,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo,
                    isCorrection: periodSalary.dateFrom > periodCalc.dateTo,
                    // isSummarized: cont.dict.hr_workSchedule.find(o => o.ID === params.workScheduleID && o.isSummarized),
                    useIsFactHour: true,
                    planByNorm: true,
                    payDownTime: cont.payEl[params.payElID].payDownTime
                  })
                  params.flagsRec = 1
                  params.planDays = payTime.planDays
                  params.planHours = payTime.planHours
                  params.days = payTime.days
                  params.hours = payTime.hours
                  params.mask = payTime.mask
                  params.hoursByDays = payTime.hoursByDays
                  params.planHoursByDays = payTime.planHoursByDays
                  params.leadingHoursByDays = payTime.leadingHoursByDays
                  if (!payTime.fullTime || cont.payEl[params.payElID].calcTimeProportion === 'HOUR' ||
                    (cont.payEl[params.payElID].calcTimeProportion === 'SALARY' && salaryChangePeriod.payElID && cont.payEl[salaryChangePeriod.payElID].calcProportion === 'HOUR')) {
                    params.flagsRec = params.flagsRec | 1 << 5
                  }
                  params.rate = perAccr.rate || payEl.accrualRate
                  params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, salaryChangePeriod, null, false, [], false, {
                    days: payTime.planDays,
                    hours: payTime.planHours
                  }) + algorithmService.getFactForPlanSum({
                    cont,
                    payElID: perAccr.payElID,
                    periodCalc: periodSalary,
                    periodSalary,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo
                  })
                  params.mtCount = (salaryChangePeriod.mtCount && payEl.isMtCount) ? salaryChangePeriod.mtCount : 1
                  if (payEl.maxMtCount) {
                    params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
                  }
                  calcSelAlgorithm({
                    payEl,
                    params,
                    cont,
                    periodCalc,
                    periodSalary,
                    source,
                    sourceAccr,
                    calculateProperty
                  })
                })
                break
              }
            }
          })
      })
    }

    // Цикл по періодам які перераховуються "Переробіток"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['138']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        if (!cont.emp[employeeNumberID].permanentAccrual.length) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        if (cont.emp[employeeNumberID].permanentAccrual.find(o => cont.payEl[o.payElID].periodSummarized === 'MONTH')) {
          const salaryAccrual = accrualService.getChangeSalaryAccrual({ cont, periodSalary, isSummarized: true })
          cont.emp[employeeNumberID].permanentAccrual
            .filter(o => cont.payEl[o.payElID].periodSummarized === 'MONTH' && ((35 & calculateProperty.calcType) ||
              (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
              cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
              calcMethods.includes(cont.payEl[o.payElID].method.code) &&
              !cont.emp[employeeNumberID].accrual.find(a => (a.periodCalcID === periodCalc.ID || a.flagsRec & 1 << 2) &&
                a.periodSalaryID === periodSalary.ID && a.payElID === o.payElID &&
                (a.sourceID === o.ID || !a.sourceID) && (12 & a.flagsRec) && !(a.flagsRec & 4096)))
            .forEach(perAccr => {
              const resultAccr = []
              salaryAccrual.forEach(accr => {
                const payEl = cont.payEl[perAccr.payElID]
                let perDateFrom = dateService.shiftDate(Math.max(accr.dateFrom, perAccr.dateFrom))
                let perDateTo = dateService.shiftDate(Math.min(accr.dateTo, perAccr.dateTo))
                if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                  perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                  perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
                }
                const params = {
                  employeeNumberID: employeeNumberID,
                  payElID: perAccr.payElID,
                  mtCount: accr.isMtCount ? accr.mtCount : 1,
                  flagsRec: 1 | 1 << 5
                }
                const source = {
                  source: perAccr.source,
                  sourceID: perAccr.ID
                }
                const sourceAccr = {
                  perAccr,
                  periodCalc
                }
                switch (payEl.method.code) {
                  case '138':
                    algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                      const perPos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= changePeriod.dateTo && o.dateTo >= changePeriod.dateFrom)
                      params.dateFrom = changePeriod.dateFrom
                      params.dateTo = changePeriod.dateTo
                      params.baseSum = accr.accrualSum
                      params.rate = perAccr.rate
                      if (!params.mtCount) {
                        params.mtCount = perPos.mtCount || 1
                      }
                      const payTime = algorithmService.getTimeByTimeSheetOvertime(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo, cont.payEl[params.payElID].periodSummarized)
                      params.planDays = payTime.planDays
                      params.planHours = payTime.planHours
                      params.days = 0
                      params.hours = payTime.overtime
                      params.mask = payTime.mask
                      resultAccr.push({
                        payEl,
                        params,
                        cont,
                        periodCalc,
                        periodSalary,
                        source,
                        sourceAccr,
                        calculateProperty
                      })
                    })
                    break
                }
              })
              resultAccr.forEach(sAccr => {
                if (sAccr.params.hours < 0) {
                  let hours = sAccr.params.hours
                  for (let i = resultAccr.length - 1; i >= 0; i--) {
                    if (resultAccr[i].params.hours > 0) {
                      const corrHours = (resultAccr[i].params.hours + hours) > 0 ? (-1 * hours) : resultAccr[i].params.hours
                      resultAccr[i].params.hours = accrualService.round(resultAccr[i].params.hours - corrHours, 3)
                      hours = accrualService.round(hours + corrHours, 3)
                    }
                  }
                  sAccr.params.hours = hours
                }
              })
              resultAccr.forEach(sAccr => {
                if (sAccr.params.hours > 0) {
                  calcSelAlgorithm(sAccr)
                }
              })
            })
        }
        if (cont.emp[employeeNumberID].permanentAccrual.find(o => cont.payEl[o.payElID].periodSummarized !== 'MONTH')) {
          const finishWork = (cont.emp[employeeNumberID].prop.employeeNumber.dateTo >= periodSalary.dateFrom && cont.emp[employeeNumberID].prop.employeeNumber.dateTo <= periodSalary.dateTo)
          const finish = {
            YEAR: finishWork,
            HALFYEAR: finishWork,
            QUARTER: finishWork
          }
          if (!finishWork) {
            const nextPerDateFrom = dateService.addMonths(periodSalary.dateFrom, 1)
            const nextPerDateTo = dateService.lastDayOfMonth(nextPerDateFrom)
            Object.keys(finish).forEach(periodSummarized => {
              if (cont.emp[employeeNumberID].prop.employeePositions.find(o => o.isSummarized && o.periodSummarized === periodSummarized && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) &&
              !cont.emp[employeeNumberID].prop.employeePositions.find(o => o.isSummarized && o.periodSummarized === periodSummarized && o.dateFrom <= nextPerDateTo && o.dateTo >= nextPerDateFrom)) {
                finish[periodSummarized] = true
              }
            })
          }
          cont.emp[employeeNumberID].permanentAccrual
            .filter(o => cont.payEl[o.payElID].periodSummarized !== 'MONTH' && ((35 & calculateProperty.calcType) ||
              (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
              cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
              calcMethods.includes(cont.payEl[o.payElID].method.code) &&
              ((cont.payEl[o.payElID].periodSummarized === 'YEAR' && ([11].includes(periodSalary.dateFrom.getMonth()) || finish.YEAR)) ||
                (cont.payEl[o.payElID].periodSummarized === 'HALFYEAR' && ([5, 11].includes(periodSalary.dateFrom.getMonth()) || finish.HALFYEAR)) ||
                (cont.payEl[o.payElID].periodSummarized === 'QUARTER' && ([2, 5, 8, 11].includes(periodSalary.dateFrom.getMonth()) || finish.QUARTER)) || (
                cont.emp[employeeNumberID].prop.employeeNumber.dateTo >= periodSalary.dateFrom && cont.emp[employeeNumberID].prop.employeeNumber.dateTo <= periodSalary.dateTo
              )) &&
              !cont.emp[employeeNumberID].accrual.find(a => (a.periodCalcID === periodCalc.ID || a.flagsRec & 1 << 2) &&
                a.periodSalaryID === periodSalary.ID && a.payElID === o.payElID &&
                (a.sourceID === o.ID || !a.sourceID) && (12 & a.flagsRec) && !(a.flagsRec & 4096)))
            .forEach(perAccr => {
              const payEl = cont.payEl[perAccr.payElID]
              let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
              let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
              if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
              }
              const pos = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, perDateFrom, perDateTo)
              const params = {
                employeeNumberID: employeeNumberID,
                payElID: perAccr.payElID,
                mtCount: (pos && pos.payElID && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1,
                flagsRec: 1 | 1 << 5
              }
              const source = {
                source: perAccr.source,
                sourceID: perAccr.ID
              }
              const sourceAccr = {
                perAccr,
                periodCalc
              }
              switch (payEl.method.code) {
                case '138':
                  params.rate = perAccr.rate
                  params.dateFrom = perDateFrom
                  params.dateTo = perDateTo
                  params.baseSum = pos ? (pos.accrualSum || 0) : 0

                  const payTime = algorithmService.getTimeByTimeSheetOvertime(cont, params.payElID, [], params.dateFrom,
                    params.dateTo, cont.payEl[params.payElID].periodSummarized, true
                    /* (cont.emp[employeeNumberID].prop.employeeNumber.dateTo >= periodSalary.dateFrom && cont.emp[employeeNumberID].prop.employeeNumber.dateTo <= periodSalary.dateTo) */)
                  params.planDays = payTime.planDays
                  params.planHours = payTime.planHours
                  params.days = 0
                  params.hours = payTime.overtime
                  params.mask = payTime.mask
                  if (params.hours > 0) {
                    calcSelAlgorithm({
                      payEl,
                      params,
                      cont,
                      periodCalc,
                      periodSalary,
                      source,
                      sourceAccr,
                      calculateProperty
                    })
                  }
                  break
              }
            })
        }
      })
    }
    if (cont.emp[employeeNumberID].prop.useTariffing) {
      // Розрахунок тарифікації
      if (((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType)) {
        calcMethods = ['4', '5', '6', '7', '8', '10', '11', '33', '9', '56', '153', '207', '148', '154', '155']
        reCalcPeriod.forEach(periodSalary => {
          if (33 & calculateProperty.calcType) {
            reversal({
              cont,
              periodCalc,
              periodSalary,
              conditionPayEl: (payEl, source) => {
                return payEl.calcSumType !== 'FACT' && calcMethods.includes(payEl.method.code) && source === 'trf_accrual'
              }
            })
          }
          if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
            return
          }
          // Постійні нарахування
          cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
          // Розраховані види оплат групи Система оплати
          cont.emp[employeeNumberID].salaryRl = cont.emp[cont.employeeNumberID].accrual.filter(o => o.periodSalaryID === periodSalary.ID && o.periodCalcID === periodCalc.ID &&
                      cont.payEl[o.payElID].method.groupCode === 1 && !(o.flagsRec & 1 << 9) && !(o.flagsRec & 1 << 12) && !(o.flagsRec & 1 << 10) && !(o.flagsRec & 1 << 16) && !(o.flagsRec & 1 << 17))
          // getSalaryFromRl({ cont, periodSalary })
          // Розрахунок надбавки і доплати
          const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
          cont.emp[employeeNumberID].salaryRl.forEach((accr, index, accrArray) => {            
            cont.emp[employeeNumberID].permanentAccrual
              .filter(o => ((35 & calculateProperty.calcType) ||
                              (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
                              o.source === 'trf_accrual' && isFindTrfAccrual(o, accr, index, accrArray, cont.trfCalcRule) &&
                              cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
                              (cont.payEl[o.payElID].calcSumType !== 'FACT' && calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
                              (cont.payEl[o.payElID].payElEntryTime.find(e => e.payElBaseID === accr.payElID && e.dateFrom <= accr.dateFrom && e.dateTo >= accr.dateTo) || ['56', '11'].includes(cont.payEl[o.payElID].method.code)) &&
                              !cont.emp[employeeNumberID].accrual.find(a => (a.periodCalcID === periodCalc.ID || a.flagsRec & 1 << 2) && a.periodSalaryID === periodSalary.ID && a.payElID === o.payElID &&
                                  (a.sourceID === o.ID || !a.sourceID) && (a.paymentID === accr.sourceID || !a.paymentID) && (12 & a.flagsRec) && !(a.flagsRec & 4096)))
              .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
              .forEach(perAccr => {
                const payEl = cont.payEl[perAccr.payElID]
                if ((accr.days <= 0 || Math.abs(accr.hours) <= 0.01) && !['4', '7', '8', '9', '10', '11'].includes(payEl.method.code)) {
                  return
                }
                let perDateFrom = dateService.shiftDate(Math.max(accr.dateFrom, perAccr.dateFrom))
                let perDateTo = dateService.shiftDate(Math.min(accr.dateTo, perAccr.dateTo))
                if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                  perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                  perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
                }
                const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom) || {}
                const params = {
                  employeeNumberID: employeeNumberID,
                  payElID: perAccr.payElID,
                  rate: perAccr.rate,
                  planHours: accr.planHours,
                  planDays: accr.planDays,
                  hours: accr.hours,
                  days: accr.days,
                  hoursByDays: accr.hoursByDays,
                  planHoursByDays: accr.planHoursByDays,
                  mask: accr.mask,
                  mtCount: perAccr.source === 'trf_accrual' ? 1 : (accr.mtCount || pos.mtCount || 1),
                  flagsRec: (1 | (((((pos && pos.payElID ? cont.payEl[pos.payElID].calcProportion : cont.payEl[accr.payElID].calcProportion) !== 'DAY' /*|| (accr.flagsRec & 1 << 5)*/) && cont.payEl[perAccr.payElID].calcTimeProportion !== 'DAY') ||
                                      ['56'].includes(payEl.method.code) || cont.payEl[perAccr.payElID].calcTimeProportion === 'HOUR') ? 1 << 5 : 0)) |
                                  (accr.flagsRec & 1 << 15 ? 1 << 15 : 0)
                }
                if (payEl.ignoreInCalcPay) {
                  params.flagsRec = params.flagsRec | 1 << 13
                }
                const source = {
                  source: perAccr.source,
                  sourceID: perAccr.ID,
                  paymentID: accr.sourceID
                }
                const sourceAccr = {
                  leadAccr: accr,
                  perAccr,
                  periodCalc
                }

                if (perAccr.source === 'trf_accrual') {
                  // Усі надбавки із тарифікації розраховуються із застосуванням суми і відсотку із тарифікації.
                  // Надбавка за вислугу і надбавка за ранг також. При зміні стажу або рангу створюється нова тарифікація.
                  // Див. вимоги замовника UBHR-13485
                  if (accr.periodCalcID === periodCalc.ID) {
                    const algorithm = algorithmTrfSalary // algorithmSurcharge
                    params.dateFrom = perDateFrom
                    params.dateTo = perDateTo
                    params.baseSum = perAccr.baseSum
                    params.rate = perAccr.rate || 100
                    const payTime = algorithmService.getTimeByTimeSheet({
                      cont,
                      payElID: params.payElID,
                      timeSheets,
                      dateFrom: params.dateFrom,
                      dateTo: params.dateTo,
                      isCorrection: periodSalary.dateFrom > periodCalc.dateTo,
                      planByNorm: cont.payEl[payEl.ID].useTimeSheetBy != 'PLAN'
                    })
                    params.planDays = payTime.planDays
                    params.planHours = payTime.planHours
                    params.days = payTime.days
                    params.hours = payTime.hours
                    params.mask = payTime.mask
                    params.hoursByDays = payTime.hoursByDays
                    params.planHoursByDays = payTime.planHoursByDays
                    params.dictFundSourceID = perAccr.dictFundSourceID
                    params.dictProgClassID = perAccr.dictProgClassID
                    params.dictPositionID = perAccr.dictPositionID
                    if (params.workNormID) {
                      /* const year = periodSalary.dateFrom.getFullYear()
                                                                const workNorm = params.workNormID ? cont.dict.trf_workNormDt.find(o => o.workNormID === params.workNormID && o.year === year) : null
                                                                const month = periodSalary.dateFrom.getMonth() */
                      // params.planHours = workNorm ? workNorm['m' + (month + 1)] : params.planHours
                      params.hours = params.planDays ? accrualService.round(params.planHours * params.days / params.planDays) : params.hours
                      params.planHoursByDays = algorithmService.calcHoursByDays(params.planHoursByDays, params.planHours)
                      params.hoursByDays = algorithmService.calcHoursByDays(params.hoursByDays, params.hours, params.mask)
                    }
                    calcSelAlgorithm({
                      payEl,
                      params,
                      cont,
                      periodCalc,
                      periodSalary,
                      source,
                      sourceAccr,
                      calculateProperty,
                      algorithm
                    })
                  }
                }
              })
          })
        })
      }
    }
    // Цикл по періодам які перераховуються "Розрахунок надбавки і доплати" від планової суми
    if (((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType)) {
      calcMethods = ['4', '5', '6', '7', '8', '10', '11', '33', '9', '56', '153', '207', '148', '154', '155']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl, source) => { return payEl.calcSumType !== 'FACT' && calcMethods.includes(payEl.method.code) && source !== 'trf_accrual' }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        // Розраховані види оплат групи Система оплати
        cont.emp[employeeNumberID].salaryRl = getSalaryFromRl({ cont, periodSalary })
        // Розрахунок надбавки і доплати
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        cont.emp[employeeNumberID].salaryRl.forEach((accr, index, accrArray) => {
          cont.emp[employeeNumberID].permanentAccrual
            .filter(o => ((35 & calculateProperty.calcType) ||
              (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) && o.source !== 'trf_accrual' &&
              cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
              (cont.payEl[o.payElID].calcSumType !== 'FACT' && calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
              (cont.payEl[o.payElID].payElEntryTime.find(e => e.payElBaseID === accr.payElID && e.dateFrom <= accr.dateFrom && e.dateTo >= accr.dateTo) || ['56', '11'].includes(cont.payEl[o.payElID].method.code)) &&
              !cont.emp[employeeNumberID].accrual.find(a => (a.periodCalcID === periodCalc.ID || a.flagsRec & 1 << 2) && a.periodSalaryID === periodSalary.ID && a.payElID === o.payElID &&
                (a.sourceID === o.ID || !a.sourceID) && (a.paymentID === accr.sourceID || !a.paymentID) && (12 & a.flagsRec) && !(a.flagsRec & 4096)))
            .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
            .forEach(perAccr => {
              const payEl = cont.payEl[perAccr.payElID]
              if ((accr.days <= 0 || Math.abs(accr.hours) <= 0.01) && !['4', '7', '8', '9', '10', '11'].includes(payEl.method.code)) {
                return
              }
              let perDateFrom = dateService.shiftDate(Math.max(accr.dateFrom, perAccr.dateFrom))
              let perDateTo = dateService.shiftDate(Math.min(accr.dateTo, perAccr.dateTo))
              if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
              }
              const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom) || {}
              const params = {
                employeeNumberID: employeeNumberID,
                payElID: perAccr.payElID,
                rate: perAccr.rate,
                planHours: accr.planHours,
                planDays: accr.planDays,
                hours: accr.hours,
                days: accr.days,
                hoursByDays: accr.hoursByDays,
                planHoursByDays: accr.planHoursByDays,
                mask: accr.mask,
                mtCount: perAccr.source === 'trf_accrual' ? 1 : (accr.mtCount || pos.mtCount || 1),
                flagsRec: (1 | ((((cont.payEl[pos.payElID].calcProportion !== 'DAY' /*|| (accr.flagsRec & 1 << 5)*/) && cont.payEl[perAccr.payElID].calcTimeProportion !== 'DAY') ||
                  ['56'].includes(payEl.method.code) || cont.payEl[perAccr.payElID].calcTimeProportion === 'HOUR') ? 1 << 5 : 0)) |
                  (accr.flagsRec & 1 << 15 ? 1 << 15 : 0)
              }
              if (payEl.ignoreInCalcPay) {
                params.flagsRec = params.flagsRec | 1 << 13
              }
              const maskDays = accr.mask
              const source = {
                source: perAccr.source,
                sourceID: perAccr.ID,
                paymentID: accr.sourceID
              }
              const sourceAccr = {
                leadAccr: accr,
                perAccr,
                periodCalc
              }

              switch (payEl.method.code) {
                case '4':
                case '9':
                  algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                    params.dateFrom = changePeriod.dateFrom
                    params.dateTo = changePeriod.dateTo
                    const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                    const payTime = algorithmService.getTimeByLeadingAccrual(cont, params.payElID, accr, params.dateFrom, params.dateTo, payEl.method.code === '9', workSchedule)
                    if (payEl.method.code === '4' && payEl.calcSumType === 'MIN') {
                      const minSalaryRec = cont.dict.hr_dictSalaryMinSize.find(o => o.dateFrom <= periodSalary.dateFrom)
                      params.baseSum = minSalaryRec ? minSalaryRec.monthValue : 0
                    } else {
                      params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, accr, null, false, [], false, {
                        days: payTime.planDays,
                        hours: payTime.planHours
                      }) + algorithmService.getFactForPlanSum({
                        cont,
                        payElID: perAccr.payElID,
                        periodCalc: periodSalary,
                        periodSalary,
                        dateFrom: params.dateFrom,
                        dateTo: params.dateTo
                      })
                    }
                    params.planDays = payTime.planDays
                    params.planHours = payTime.planHours
                    params.days = payTime.days
                    params.hours = payTime.hours
                    params.mask = payTime.mask
                    params.hoursByDays = payTime.hoursByDays
                    params.planHoursByDays = payTime.planHoursByDays
                    calcSelAlgorithm({
                      payEl,
                      params,
                      cont,
                      periodCalc,
                      periodSalary,
                      maskDays,
                      source,
                      sourceAccr,
                      calculateProperty
                    })
                  })
                  break
                case '7':
                case '8':
                case '10':
                case '11':
                case '56':
                case '153':
                case '207':
                  algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                    params.dateFrom = changePeriod.dateFrom
                    params.dateTo = changePeriod.dateTo
                    if (!params.mask || payEl.method.code !== '56') {
                      params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
                    }
                    const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                    const payTime = algorithmService.getPayTimeByPayEl(cont, params.payElID, params.mask, timeSheets, params.dateFrom, params.dateTo, workSchedule, periodSalary.ID)
                    params.days = payTime.days
                    params.hours = payTime.hours
                    params.mask = payTime.mask
                    params.hoursByDays = payTime.hoursByDays

                    if (['7', '8', '10', '11', '153', '207'].includes(payEl.method.code) && workSchedule && pos) {
                      if (payEl.normTimeBy === 'AVERAGE') {
                        const workScheduleID = (payEl.useTimeSheetBy === 'PLAN' ? workSchedule.planScheduleID : workSchedule.normScheduleID) || workSchedule.ID
                        const planTime = algorithmService.getPlanTime(orgID, workScheduleID, dateService.firstDayOfYear(params.dateFrom), dateService.lastDayOfYear(params.dateFrom), cont)
                        let mtCount = workSchedule.isMtCount ? (pos.mtCount || 1) : 1
                        if (workSchedule.maxMtCount) {
                          mtCount = Math.min(workSchedule.maxMtCount, mtCount)
                        }
                        if (workScheduleID !== workSchedule.ID) {
                          const planWorkSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
                          if (planWorkSchedule && planWorkSchedule.maxMtCount) {
                            mtCount = Math.min(planWorkSchedule.maxMtCount, mtCount)
                          }
                        }
                        params.planHours = accrualService.round(planTime.hours * mtCount / 12, 4)
                        params.planDays = accrualService.round(planTime.days / 12, 2)
                        if (payEl.maxMtCount) {
                          params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
                        }
                      } else if (timeSheets) {
                        const timeSheetOnDay = timeSheets.find(o => o.dateWork.getTime() === params.dateFrom.getTime())
                        if (timeSheetOnDay) {
                          params.planHours = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthHour`]
                          params.planDays = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthDay`]
                        }
                      }
                    }
                    params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, accr) +
                        algorithmService.getFactForPlanSum({
                          cont,
                          payElID: perAccr.payElID,
                          periodCalc: periodSalary,
                          periodSalary,
                          dateFrom: params.dateFrom,
                          dateTo: params.dateTo
                        })
                    calcSelAlgorithm({
                      payEl,
                      params,
                      cont,
                      periodCalc,
                      periodSalary,
                      maskDays,
                      source,
                      sourceAccr,
                      calculateProperty
                    })
                  })
                  break
                case '6':
                  algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                    const expiriencePeriods = perAccr.rate > 0
                      ? [{ rate: perAccr.rate, dateFrom: changePeriod.dateFrom, dateTo: changePeriod.dateTo }]
                      : algorithmService.getExpiriencePeriods(cont, payEl.ID, changePeriod.dateFrom, changePeriod.dateTo)
                    expiriencePeriods.forEach(expirience => {
                      params.rate = expirience.rate
                      params.dateFrom = expirience.dateFrom
                      params.dateTo = expirience.dateTo
                      params.baseSum = algorithmService.getPlanSum(expirience.dateFrom, cont, perAccr, accr) +
                          algorithmService.getFactForPlanSum({
                            cont,
                            payElID: perAccr.payElID,
                            periodCalc: periodSalary,
                            periodSalary,
                            dateFrom: params.dateFrom,
                            dateTo: params.dateTo
                          })
                      if (perAccr.limitSum) {
                        params.baseSum = Math.min(params.baseSum, perAccr.limitSum)
                      }
                      const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                      const payTime = algorithmService.getTimeByLeadingAccrual(cont, params.payElID, accr, params.dateFrom, params.dateTo, false, workSchedule)
                      params.planDays = payTime.planDays
                      params.planHours = payTime.planHours
                      params.days = payTime.days
                      params.hours = payTime.hours
                      params.mask = payTime.mask
                      params.hoursByDays = payTime.hoursByDays
                      params.planHoursByDays = payTime.planHoursByDays
                      calcSelAlgorithm({
                        payEl,
                        params,
                        cont,
                        periodCalc,
                        periodSalary,
                        maskDays,
                        source,
                        sourceAccr,
                        calculateProperty
                      })
                    })
                  })
                  break
                case '5':
                  algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                    cont.emp[employeeNumberID].prop.salaryRank.filter(o => dateService.shiftDate(o.dateFrom) <= changePeriod.dateTo && dateService.shiftDate(o.dateTo) >= changePeriod.dateFrom)
                      .forEach(rank => {
                        params.dateFrom = perDateFrom > dateService.shiftDate(rank.dateFrom) ? perDateFrom : dateService.shiftDate(rank.dateFrom)
                        params.dateTo = perDateTo < dateService.shiftDate(rank.dateTo) ? perDateTo : dateService.shiftDate(rank.dateTo)
                        params.baseSum = perAccr.baseSum ? perAccr.baseSum : rank.paySum
                        const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                        const payTime = algorithmService.getTimeByLeadingAccrual(cont, params.payElID, accr, params.dateFrom, params.dateTo, false, workSchedule)
                        params.planDays = payTime.planDays
                        params.planHours = payTime.planHours
                        params.days = payTime.days
                        params.hours = payTime.hours
                        params.mask = payTime.mask
                        params.hoursByDays = payTime.hoursByDays
                        params.planHoursByDays = payTime.planHoursByDays
                        calcSelAlgorithm({
                          payEl,
                          params,
                          cont,
                          periodCalc,
                          periodSalary,
                          maskDays,
                          source,
                          sourceAccr,
                          calculateProperty
                        })
                      })
                  })
                  break
                case '33': {
                  if ((payEl.calcAlgorithm === '1' && perAccr.missingEmployeeNumberID) ||
                      (payEl.calcAlgorithm === '2' && perAccr.missingEmployeeNumberID && perAccr.rate) ||
                      (payEl.calcAlgorithm === '3' && perAccr.rate) ||
                        (payEl.calcAlgorithm === '4' && perAccr.baseSum)) {
                    if (payEl.maxMtCount) {
                      params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
                    }
                    const missCont = {}
                    if (['1', '2'].includes(payEl.calcAlgorithm)) {
                      missCont.orgID = cont.orgID
                      missCont.org = cont.org
                      missCont.periods = cont.periods
                      missCont.payEl = cont.payEl
                      missCont.dict = cont.dict
                      missCont.emp = {}
                      missCont.emp[perAccr.missingEmployeeNumberID] = {}
                      missCont.employeeNumberID = perAccr.missingEmployeeNumberID
                      missCont.emp[missCont.employeeNumberID].prop = employeeService.getEmpData(missCont.employeeNumberID, periodSalary.dateFrom, periodSalary.dateTo)
                      if (!missCont.emp[missCont.employeeNumberID].prop.employeeNumber) {
                        missCont.emp[missCont.employeeNumberID].prop.employeeNumber = []
                      }
                      if (!missCont.emp[missCont.employeeNumberID].prop.employeePositions) {
                        missCont.emp[missCont.employeeNumberID].prop.employeePositions = []
                      }
                      if (!missCont.emp[missCont.employeeNumberID].prop.employeeAccruals) {
                        missCont.emp[missCont.employeeNumberID].prop.employeeAccruals = []
                      }
                      if (!missCont.emp[missCont.employeeNumberID].prop.employeeRetentions) {
                        missCont.emp[missCont.employeeNumberID].prop.employeeRetentions = []
                      }
                      missCont.emp[missCont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, missCont.employeeNumberID, missCont, periodSalary, calcMethods)
                    }
                    params.missingEmployeeNumberID = perAccr.missingEmployeeNumberID || null
                    algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                      if (['1', '2'].includes(payEl.calcAlgorithm)) {
                        algorithmService.getChangePayPeriodWithLeading(missCont, perAccr, changePeriod.dateFrom, changePeriod.dateTo).forEach(misChangePeriod => {
                          params.dateFrom = misChangePeriod.dateFrom
                          params.dateTo = misChangePeriod.dateTo
                          const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                          const payTime = algorithmService.getTimeByLeadingAccrual(cont, params.payElID, accr, params.dateFrom, params.dateTo, false, workSchedule)
                          params.rate = perAccr.rate
                          params.planDays = payTime.planDays
                          params.planHours = payTime.planHours
                          params.days = payTime.days
                          params.hours = payTime.hours
                          params.mask = payTime.mask
                          params.hoursByDays = payTime.hoursByDays
                          params.planHoursByDays = payTime.planHoursByDays
                          if (timeSheets) {
                            const timeSheetOnDay = timeSheets.find(o => o.dateWork.getTime() === params.dateFrom.getTime())
                            if (timeSheetOnDay) {
                              params.planHours = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthHour`]
                              params.planDays = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthDay`]
                            }
                          }
                          switch (payEl.calcAlgorithm) {
                            case '1': { // Різниця заробітку відсутнього і заміщаючого працівників
                              params.rate = null
                              const missPlanSum = algorithmService.getPlanSum(params.dateFrom, missCont, perAccr, misChangePeriod) * (misChangePeriod.mtCount || 1)
                              const currPlanSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, cont.constants.hrTariffingEducational ? (cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom) || {}) : accr) * (params.mtCount || 1)
                              params.baseSum = Math.max(0, missPlanSum - currPlanSum)
                              break
                            }
                            case '2': { // Відсоток від заробітку відсутнього працівника
                              params.baseSum = algorithmService.getPlanSum(params.dateFrom, missCont, perAccr, misChangePeriod) * (misChangePeriod.mtCount || 1)
                              break
                            }
                          }
                          calcSelAlgorithm({
                            payEl,
                            params,
                            cont,
                            periodCalc,
                            periodSalary,
                            maskDays,
                            source,
                            sourceAccr,
                            calculateProperty
                          })
                        })
                      } else {
                        // Відсоток від заробітку заміщаючого працівника
                        params.dateFrom = changePeriod.dateFrom
                        params.dateTo = changePeriod.dateTo
                        const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === pos.workScheduleID)
                        const payTime = algorithmService.getTimeByLeadingAccrual(cont, params.payElID, accr, params.dateFrom, params.dateTo, false, workSchedule)
                        params.rate = perAccr.rate
                        params.planDays = payTime.planDays
                        params.planHours = payTime.planHours
                        params.days = payTime.days
                        params.hours = payTime.hours
                        params.mask = payTime.mask
                        params.hoursByDays = payTime.hoursByDays
                        params.planHoursByDays = payTime.planHoursByDays
                        if (timeSheets) {
                          const timeSheetOnDay = timeSheets.find(o => o.dateWork.getTime() === params.dateFrom.getTime())
                          if (timeSheetOnDay) {
                            params.planHours = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthHour`]
                            params.planDays = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthDay`]
                          }
                        }
                        if (payEl.calcAlgorithm === '4') {
                          params.baseSum = perAccr.baseSum * (params.mtCount || 1)
                        } else {
                          params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, cont.constants.hrTariffingEducational ? (cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom) || {}) : accr) * (params.mtCount || 1)
                        }
                        calcSelAlgorithm({
                          payEl,
                          params,
                          cont,
                          periodCalc,
                          periodSalary,
                          maskDays,
                          source,
                          sourceAccr,
                          calculateProperty
                        })
                      }
                    })
                  }
                  break
                }
              }
            })
        })
      })
    }

    // Цикл по періодам які перераховуються "Індексація від планового заробітку", "Премія за чистим плановим заробітком за період"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['24']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
         reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return payEl.calcSumType !== 'FACT' && calcMethods.includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)

        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          (cont.payEl[o.payElID].calcSumType !== 'FACT' && calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
          !cont.emp[employeeNumberID].accrual.find(a => (a.periodCalcID === periodCalc.ID || a.flagsRec & 1 << 2) && a.periodSalaryID === periodSalary.ID && a.payElID === o.payElID &&
            (a.sourceID === o.ID || !a.sourceID) && (12 & a.flagsRec) && !(a.flagsRec & 4096)))
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom) || {}
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              mtCount: pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }

            const sourceAccr = {
              perAccr,
              periodCalc
            }
            switch (payEl.method.code) {
              case '24':
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                const payTime = algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
                params.flagsRec = params.flagsRec | ((!payTime.fullTime || (pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, perAccr, pos)
                params.planDays = payTime.planDays
                params.planHours = payTime.planHours
                params.days = payTime.days
                params.hours = payTime.hours
                params.mask = payTime.mask
                params.hoursByDays = payTime.hoursByDays
                params.planHoursByDays = payTime.planHoursByDays
                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
                break
            }
          })
      })
    }
    // Цикл по періодам які перераховуються "Розрахунок щомісячних премій і надбавок від фактичного заробітку"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['12', '4', '5', '6', '24', '148', '154', '155']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl, source) => {
              return ((payEl.calcSumType === 'FACT' && ['4', '6', '24'].includes(payEl.method.code)) ||
                ['12'].includes(payEl.method.code) ||
                (cont.emp[employeeNumberID].useTariffing && calcMethods.includes(payEl.method.code)))
            }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          // (!cont.emp[employeeNumberID].prop.useTariffing || o.source === 'trf_accrual') &&
          (!o.baseSum || periodSalary.dateFrom <= periodCalc.dateFrom) &&
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
          ((['4', '5', '6', '24', '148', '154', '155'].includes(cont.payEl[o.payElID].method.code) &&
            cont.payEl[o.payElID].calcSumType === 'FACT') || ['12'].includes(cont.payEl[o.payElID].method.code)) &&
          (!['12'].includes(cont.payEl[o.payElID].method.code) ||
            (
              ((!cont.payEl[o.payElID].isPayDismAll && periodCalc.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo) || cont.payEl[o.payElID].isPayDismAll) &&
              ((!cont.payEl[o.payElID].isPayDismSalPeriod && periodSalary.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo) || cont.payEl[o.payElID].isPayDismSalPeriod) &&
              ((cont.payEl[o.payElID].isPayDismCalcPeriod && periodCalc.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodCalc.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo) || !cont.payEl[o.payElID].isPayDismCalcPeriod) &&
              ((cont.payEl[o.payElID].isPayDismOnlyPeriod && periodSalary.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodSalary.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo) || !cont.payEl[o.payElID].isPayDismOnlyPeriod)
            )) &&

          /* ((cont.payEl[o.payElID].isPayDismAll || (periodCalc.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
            (cont.payEl[o.payElID].isPayDismSalPeriod || (periodSalary.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
            (!cont.payEl[o.payElID].isPayDismCalcPeriod || (periodCalc.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodCalc.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
            (!cont.payEl[o.payElID].isPayDismOnlyPeriod || (periodSalary.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodSalary.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo))
            )) && */
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        )
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1 | (perAccr.source === 'trf_accrual' ? 1 << 15 : 0),
              mtCount: perAccr.source === 'trf_accrual' ? perAccr.mtCount : (pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1),
              workNormID: perAccr.workNormID
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }

            const sourceAccr = {
              perAccr,
              periodCalc
            }

            if (perAccr.source === 'trf_accrual') {
              // Усі надбавки із тарифікації розраховуються із застосуванням суми і відсотку із тарифікації.
              // Надбавка за вислугу і надбавка за ранг також. При зміні стажу або рангу створюється нова тарифікація.
              // Див. вимоги замовника UBHR-13485
              const algorithm = algorithmTrfSalary // algorithmSurcharge
              params.dateFrom = perDateFrom
              params.dateTo = perDateTo
              const fact = algorithmService.getFactSum({
                withDetail: true,
                cont,
                payElID: perAccr.payElID,
                periodCalc: periodSalary,
                periodSalary,
                dateFrom: perDateFrom,
                dateTo: perDateTo,
                payElBase: null,
                periodType: null,
                fillMask: null,
                periodOnly: null,
                withIncludPayEl: null,
                withPayElID: null,
                groupType: null,
                dictFundSourceList: null,
                dictProgClassList: null,
                dictProjectList: null,
                sourceID: null,
                payElExclude: null,
                finishWork: null,
                trfPositionID: perAccr.trfPositionID
                // sourceID: (params.flagsRec & 1 << 15) ? perAccr.ID : null
              })
              const trfCalcRule = cont.trfCalcRule.find(o => o.payElID === perAccr.payElID)
              const baseSum = getFactSumWithTrfRules(perAccr, trfCalcRule, fact.factSum, cont.payEl[perAccr.payElID].roundUpTo)
              params.baseSum = baseSum.sum
              params.fixBaseSum = baseSum.fixBaseSum
              sourceAccr.accrualDt = fact.accrualDt
              params.rate = perAccr.rate || 100
              const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo })
              params.planDays = payTime.planDays
              params.planHours = payTime.planHours
              params.days = payTime.days
              params.hours = payTime.hours
              params.mask = payTime.mask
              params.hoursByDays = payTime.hoursByDays
              params.planHoursByDays = payTime.planHoursByDays
              params.dictFundSourceID = perAccr.dictFundSourceID
              params.dictProgClassID = perAccr.dictProgClassID
              params.dictPositionID = perAccr.dictPositionID

              if (params.workNormID) {
                /* const year = periodSalary.dateFrom.getFullYear()
                const workNorm = params.workNormID ? cont.dict.trf_workNormDt.find(o => o.workNormID === params.workNormID && o.year === year) : null
                const month = periodSalary.dateFrom.getMonth()
                params.planHours = workNorm ? workNorm['m' + (month + 1)] : params.planHours */
                params.hours = params.planDays ? accrualService.round(params.planHours * params.days / params.planDays) : params.hours
                params.planHoursByDays = algorithmService.calcHoursByDays(params.planHoursByDays, params.planHours)
                params.hoursByDays = algorithmService.calcHoursByDays(params.hoursByDays, params.hours, params.mask)
              }

              calcSelAlgorithm({
                payEl,
                params,
                cont,
                periodCalc,
                periodSalary,
                source,
                sourceAccr,
                calculateProperty,
                algorithm
              })
            } else {
              switch (payEl.method.code) {
                case '4':
                case '24':
                case '12': {
                  params.dateFrom = perDateFrom
                  params.dateTo = perDateTo
                  let fact = {}
                  if (perAccr.baseSum) {
                    params.baseSum = (periodSalary.dateFrom > periodCalc.dateTo) ? 0 : perAccr.baseSum
                  } else {
                    fact = algorithmService.getFactSum({
                      withDetail: true,
                      cont,
                      payElID: perAccr.payElID,
                      periodCalc: periodSalary,
                      periodSalary,
                      dateFrom: perDateFrom,
                      dateTo: perDateTo,
                      sourceID: (params.flagsRec & 1 << 15) ? perAccr.ID : null
                    })
                    params.baseSum = fact.factSum
                    sourceAccr.accrualDt = fact.accrualDt
                  }
                  params.rate = perAccr.rate
                  if (cont.payEl[params.payElID].useKPI) {
                    if (!(params.flagsFix & 1 << 26)) {
                      params.KPI = employeeService.getEmployeeKpi(cont, cont.employeeNumberID, params.dateTo)
                    }
                    const kpiAccrual = accrualService.getKpiAccrual(cont, params.payElID, params.dateTo, params.KPI)
                    if (kpiAccrual) {
                      if (kpiAccrual.rate) {
                        params.rate = params.flagsFix & 1 << 9 ? params.rate : kpiAccrual.rate || 0
                      } else if (kpiAccrual.paySum) {
                        params.baseSum = params.flagsFix & 1 ? params.baseSum : kpiAccrual.paySum || 0
                      }
                    }
                  }
                  //add pdv 09.08.24
                  //add sort 12.08.24
                  // Индексация считается по первому посадовому месту
                  // const empList = [];
                  // if (payEl.method.code !== '4') {
                  // const empIDListTmp = cont.emp[cont.employeeNumberID].salaryRl
                  //   .filter(e => e.periodSalaryID === periodSalary.ID && cont.emp[e.employeeNumberPartID].prop.employeeNumber.empWorkPlace === "5" && 
                  //     e.dateFrom >= periodSalary.dateFrom && e.dateTo <= periodSalary.dateTo 
                  //     && cont.emp[e.employeeNumberPartID].accrual && cont.emp[e.employeeNumberPartID].accrual.length)
                  //   //.map(e => e.employeeNumberPartID)
                  //   .sort((a,b) => (cont.emp[a.employeeNumberPartID] && cont.emp[a.employeeNumberPartID].prop && cont.emp[a.employeeNumberPartID].prop.employeeNumber?
                  //     cont.emp[a.employeeNumberPartID].prop.employeeNumber.tabNumSort:9999) - 
                  //     (cont.emp[b.employeeNumberPartID] && cont.emp[b.employeeNumberPartID].prop && cont.emp[b.employeeNumberPartID].prop.employeeNumber?
                  //       cont.emp[b.employeeNumberPartID].prop.employeeNumber.tabNumSort:9999))

                  
                  // empIDListTmp.forEach(e => {
                  //   if (!empList.length || empList[empList.length-1].dateTo < e.dateFrom) empList.push(e)
                  // })

                 /* const empID = Object.keys(cont.emp).map(numberIDD => cont.emp[numberIDD])
                    .filter(e => e.accrual && e.accrual.length)
                    .sort((a,b) => (a && a.prop && a.prop.employeeNumber?a.prop.employeeNumber.tabNumSort:9999) - (b && b.prop && b.prop.employeeNumber?b.prop.employeeNumber.tabNumSort:9999))
                    .find(e => e.prop && e.prop.employeeNumber && e.prop.employeeNumber.mainEmpNumberID === employeeNumberID && 
                      (cont.emp[e.prop.employeeNumber.ID].prop.timeSheets
                      ? cont.emp[e.prop.employeeNumber.ID].prop.timeSheets.filter(o => o.dateWork >= periodSalary.dateFrom && o.dateWork <= periodSalary.dateTo && (!o.employeeNumberID || o.employeeNumberID === employeeNumberID))
                      : []).length
                    )
                  // Если нашли первое позадовое место подменяем его 
                  if (empID) cont.employeeNumberID = empID.prop.employeeNumber.ID
                  const tsPos = algorithmService.getTimeSheetByPeriod(periodSalary, cont)*/
                //}
                  // 
                  const payTime = payEl.method.code === '4'
                    ? algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
                    : algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets: timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo, planByNorm: true })
                  // Возвращаем расчитываемый employeeNumberID
                  //  if (empID) cont.employeeNumberID = employeeNumberID  
                  // if (empList.length) {
                  //   payTime.days = 0
                  //   payTime.hours = 0
                  //   empList.forEach(e => {
                  //     payTime.days += e.days
                  //     payTime.hours += e.hours
                  //    })
                  // }
                  params.flagsRec = params.flagsRec | ((!payTime.fullTime || (pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                  params.planDays = payTime.planDays
                  params.planHours = payTime.planHours
                  params.days = payTime.days
                  params.hours = payTime.hours
                  params.mask = payTime.mask
                  params.hoursByDays = payTime.hoursByDays
                  params.planHoursByDays = payTime.planHoursByDays
                  calcSelAlgorithm({
                    payEl,
                    params,
                    cont,
                    periodCalc,
                    periodSalary,
                    source,
                    sourceAccr,
                    calculateProperty
                  })
                  break
                }
                case '5': {
                  algorithmService.getChangePayPeriod(cont, perAccr, perDateFrom, perDateTo).forEach(changePeriod => {
                    cont.emp[employeeNumberID].prop.salaryRank.filter(o => dateService.shiftDate(o.dateFrom) <= changePeriod.dateTo && dateService.shiftDate(o.dateTo) >= changePeriod.dateFrom)
                      .forEach(rank => {
                        params.dateFrom = perDateFrom > dateService.shiftDate(rank.dateFrom) ? perDateFrom : dateService.shiftDate(rank.dateFrom)
                        params.dateTo = perDateTo < dateService.shiftDate(rank.dateTo) ? perDateTo : dateService.shiftDate(rank.dateTo)
                        params.baseSum = rank.paySum
                        const payTime = algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
                        params.planDays = payTime.planDays
                        params.planHours = payTime.planHours
                        params.days = payTime.days
                        params.hours = payTime.hours
                        params.mask = payTime.mask
                        params.hoursByDays = payTime.hoursByDays
                        params.planHoursByDays = payTime.planHoursByDays
                        calcSelAlgorithm({
                          payEl,
                          params,
                          cont,
                          periodCalc,
                          periodSalary,
                          source,
                          sourceAccr,
                          calculateProperty
                        })
                      })
                  })
                  break
                }
                case '6': {
                  const expiriencePeriods = perAccr.rate > 0
                    ? [{ rate: perAccr.rate, dateFrom: perDateFrom, dateTo: perDateTo }]
                    : algorithmService.getExpiriencePeriods(cont, payEl.ID, perDateFrom, perDateTo)
                  expiriencePeriods.forEach(expirience => {
                    params.rate = expirience.rate
                    params.dateFrom = expirience.dateFrom
                    params.dateTo = expirience.dateTo
                    let fact = {}
                    if (perAccr.baseSum) {
                      params.baseSum = perAccr.baseSum
                    } else {
                      fact = algorithmService.getFactSum({
                        withDetail: true,
                        cont,
                        payElID: perAccr.payElID,
                        periodCalc: periodSalary,
                        periodSalary,
                        dateFrom: params.dateFrom,
                        dateTo: params.dateTo,
                        sourceID: (params.flagsRec & 1 << 15) ? perAccr.ID : null
                      })
                      params.baseSum = fact.factSum
                      sourceAccr.accrualDt = fact.accrualDt
                      if (perAccr.limitSum) {
                        params.baseSum = Math.min(params.baseSum, perAccr.limitSum)
                      }
                    }
                    const payTime = algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
                    params.flagsRec = params.flagsRec | ((!payTime.fullTime || (pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                    params.planDays = payTime.planDays
                    params.planHours = payTime.planHours
                    params.days = payTime.days
                    params.hours = payTime.hours
                    params.mask = payTime.mask
                    params.hoursByDays = payTime.hoursByDays
                    params.planHoursByDays = payTime.planHoursByDays
                    calcSelAlgorithm({
                      payEl,
                      params,
                      cont,
                      periodCalc,
                      periodSalary,
                      source,
                      sourceAccr,
                      calculateProperty
                    })
                  })
                  break
                }
              }
            }
          })
      })
    }
    // метод розрахунку для нарахування звільненим
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['208']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl, source) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        if (!(cont.emp[employeeNumberID].prop.employeeNumber.dateTo >= periodSalary.dateFrom && cont.emp[employeeNumberID].prop.employeeNumber.dateTo <= periodSalary.dateTo) || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          (!o.baseSum || periodSalary.dateFrom <= periodCalc.dateFrom) &&
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
           !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        )
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            if (!payEl.payElID || !payEl.rightRate || !payEl.calcMounthRate) {
              return
            }
            const calcPayEl = cont.payEl[payEl.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              mtCount: (pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1),
              workNormID: perAccr.workNormID
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }

            const sourceAccr = {
              perAccr,
              periodCalc
            }
            const rateDateFrom = dateService.addMonths(periodSalary.dateFrom, -1 * payEl.calcMounthRate)
            const rateDateTo = dateService.addDays(periodSalary.dateFrom, -1)
            const rateParam = cont.emp[cont.employeeNumberID].accrual.reduce((p, a) => {
              if (a.payElID === calcPayEl.ID && a.periodSalary >= rateDateFrom && a.periodSalary <= rateDateTo &&
                 !(a.flagsRec & 1 << 9) && !(a.flagsRec & 1 << 10) && !(a.flagsRec & 1 << 12) && !(a.flagsRec & 1 << 16) && !(a.flagsRec & 1 << 17)
              ) {
                p.rate += a.rate || 0
                p.accrualCount++
              }
              return p
            }, { rate: 0, accrualCount: 0 })

            params.rate = (rateParam.rate !== 0 && rateParam.accrualCount !== 0) ? accrualService.round(rateParam.rate / rateParam.accrualCount) : 0

            if (calcPayEl.isIndividualRate && calcPayEl.rightRate === 'AVG') {
              const employeeAccruals = cont.emp[cont.employeeNumberID].prop.employeeAccruals.filter(o => o.employeeNumberID === employeeNumberID &&
                o.payElID === calcPayEl.ID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
              if (employeeAccruals.length && employeeAccruals[employeeAccruals.length - 1].accrualRate) {
                params.rate = params.rate * employeeAccruals[employeeAccruals.length - 1].accrualRate / 100
              }
            }

            switch (calcPayEl.method.code) {
              case '12': {
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                let fact = {}
                if (perAccr.baseSum) {
                  params.baseSum = (periodSalary.dateFrom > periodCalc.dateTo) ? 0 : perAccr.baseSum
                } else {
                  fact = algorithmService.getFactSum({
                    withDetail: true,
                    cont,
                    payElID: calcPayEl.ID,
                    periodCalc: periodSalary,
                    periodSalary,
                    dateFrom: perDateFrom,
                    dateTo: perDateTo,
                    sourceID: (params.flagsRec & 1 << 15) ? perAccr.ID : null
                  })
                  params.baseSum = fact.factSum
                  sourceAccr.accrualDt = fact.accrualDt
                }
                // params.rate = perAccr.rate
                const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: calcPayEl.ID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo, planByNorm: true })
                params.flagsRec = params.flagsRec | ((!payTime.fullTime || (pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                params.planDays = payTime.planDays
                params.planHours = payTime.planHours
                params.days = payTime.days
                params.hours = payTime.hours
                params.mask = payTime.mask
                params.hoursByDays = payTime.hoursByDays
                params.planHoursByDays = payTime.planHoursByDays
                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
                break
              }
              case '65':
              case '45':
              case '46': {
                const onDate = periodSalary.dateFrom
                const month = onDate.getMonth()
                let dateFromAvg = periodSalary.dateFrom
                let dateToAvg = periodSalary.dateTo
                switch (calcPayEl.method.code) {
                  case '65':
                    dateFromAvg = dateService.addMonths(onDate, -1)
                    dateToAvg = dateService.lastDayOfMonth(dateFromAvg)
                    break
                  case '45':
                    if ([2, 5, 8, 11].includes(month)) {
                      dateFromAvg = dateService.addMonths(onDate, -2)
                      dateToAvg = dateService.lastDayOfMonth(onDate)
                    } else {
                      dateFromAvg = dateService.getQuarterDates(onDate.getFullYear(), dateService.getQuarter(onDate) - 1).dateFrom
                      dateToAvg = dateService.lastDayOfMonth(dateService.addMonths(dateFromAvg, 2))
                    }
                    break
                  case '46':
                    if (month === 11) {
                      dateFromAvg = dateService.firstDayOfYear(onDate)
                    } else {
                      dateFromAvg = dateService.firstDayOfYear(dateService.addYears(onDate, -1))
                    }
                    dateToAvg = dateService.lastDayOfMonth(dateService.addMonths(dateFromAvg, 11))
                    break
                }
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                params.dateFromAvg = dateFromAvg
                params.dateToAvg = dateToAvg
                params.mask = 0
                const calcPeriods = cont.periods.filter(o => o.dateFrom >= params.dateFromAvg && o.dateFrom <= params.dateToAvg)
                let accrualDt = []
                params.days = 0
                params.hours = 0
                calcPeriods.forEach(period => {
                  const perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, params.dateFromAvg || period.dateFrom))
                  const perDateTo = dateService.shiftDate(Math.min(period.dateTo, params.dateToAvg || period.dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo))
                  const periodTimeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
                  const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: calcPayEl.ID, timeSheets: periodTimeSheets, dateFrom: perDateFrom, dateTo: perDateTo })
                  params.days += payTime.days
                  params.hours = accrualService.round(params.hours + payTime.hours, 4)
                  if (calcPayEl.calcSumType !== 'FACT') {
                    const permAccrual = {
                      payElID: calcPayEl.ID,
                      dateFrom: perDateFrom,
                      dateTo: perDateTo
                    }
                    let onDate = dateService.shiftDate(perDateTo)
                    const salaryAccrual = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
                    let mtCount = 1
                    if (salaryAccrual && salaryAccrual.payElID) {
                      const payElSal = cont.payEl[salaryAccrual.payElID]
                      mtCount = payElSal.isMtCount ? (salaryAccrual.mtCount || 1) : 1
                      if (payElSal && payElSal.method.groupCode === 1) {
                        Object.assign(salaryAccrual, {
                          flagsRec: 1
                        })
                      }
                    }
                    period.baseSum = algorithmService.getPlanSum(onDate, cont, permAccrual, salaryAccrual || {}) * mtCount
                    if (calcPayEl.method.code !== '47' && (period.dateFrom.getTime() !== perDateFrom.getTime() || period.dateFrom.getTime() !== perDateTo.getTime())) {
                      if ((payTime.fullTime ? payTime.planDays : payTime.planHours) !== 0) {
                        period.baseSum = accrualService.round(period.baseSum / (payTime.fullTime ? (payTime.planDays / payTime.days) : (payTime.planHours / payTime.hours)))
                      }
                    }
                  } else {
                    const fact = algorithmService.getFactSum({
                      withDetail: true,
                      cont,
                      payElID: calcPayEl.ID,
                      periodCalc: period,
                      periodSalary: period,
                      dateFrom: perDateFrom,
                      dateTo: perDateTo
                    })
                    period.baseSum = fact.factSum
                    accrualDt = accrualDt.concat(fact.accrualDt)
                  }
                })
                let calcSum = 0
                if (calcPeriods.length) {
                  calcSum = accrualService.round(calcPeriods.reduce((sum, period) => {
                    return sum + period.baseSum
                  }, 0) / (calcPayEl.baseSumIsAverage ? calcPeriods.length : 1))
                  if (calcSum < 0) {
                    calcSum = 0
                  }
                }
                params.baseSum = calcSum
                sourceAccr.accrualDt = calcSum ? algorithmService.calcGroupSumAccrualDt(accrualDt, calcSum, true) : []

                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
                break
              }
            }
          })
      })
    }
    if (cont.emp[employeeNumberID].prop.useTariffing) {
      unionAccrual({ cont, calculateProperty })
      cont.emp[cont.employeeNumberID].prop.tariffingAccruals = cont.emp[cont.employeeNumberID].prop.unionTariffingAccruals
    }

    // Цикл по періодам які перераховуються Документи премії
    const logDocDate = new Date()
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['12', '47']
      reCalcPeriod.forEach(periodSalary => {
        cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
          const payEl = cont.payEl[accr.payElID]
          if ((accr.flagsRec & 2) && !(accr.flagsRec & 1 << 20) && accr.periodCalcID === periodSalary.ID && payEl.isRecalculate &&
            ((payEl.method.code === '47' && (payEl.calcSumType === 'FACT')) || payEl.method.code === '12') &&
            !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 2) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 16)) {
            let paySum = accr.paySum
            let baseSum = accr.baseSum
            let paySumAccrual = accr.paySumAccrual || 0
            let rateOff = accr.rateOff || 0
            let paySumOff = accr.paySumOff || 0
            let days = accr.days
            let hours = accr.hours
            let mask = accr.mask || 0
            let maskAdd = accr.maskAdd || 0
            let isCorrect = false
            cont.emp[cont.employeeNumberID].accrual.forEach(o => {
              if (o.linkToParentID === accr.ID && ((o.flagsRec & 1 << 9) || (o.flagsRec & 1 << 10)) && !(o.flagsRec & 1 << 12)) {
                paySum = accrualService.round(paySum + o.paySum)
                paySumAccrual = accrualService.round(paySumAccrual + (o.paySumAccrual || 0))
                baseSum = accrualService.round(baseSum + o.baseSum)
                days += (o.days || 0)
                hours += (o.hours || 0)
                if (o.flagsRec & 1 << 9) {
                  mask = mask & ~(o.mask || 0)
                  maskAdd = maskAdd & ~(o.maskAdd || 0)
                } else if (o.flagsRec & 1 << 10) { }
                mask = mask | (o.mask || 0)
                maskAdd = maskAdd | (o.maskAdd || 0)
              }
              if ((o.linkToParentID === accr.ID || o.orderID === accr.orderID) && (o.flagsRec & 1 << 2)) {
                isCorrect = true
              }
            })
            if (!isCorrect) {
              const source = {}
              const sourceAccr = {
                periodCalc
              }
              let perDateFrom = dateService.shiftDate(accr.dateFrom)
              let perDateTo = dateService.shiftDate(accr.dateTo)
              const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
              let mtCount = pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1
              mtCount = (payEl.method.code === '47') ? (payEl.maxMtCount && mtCount > payEl.maxMtCount ? payEl.maxMtCount : mtCount) : mtCount
              const params = {
                employeeNumberID: cont.employeeNumberID,
                payElID: accr.payElID,
                flagsRec: (accr.flagsRec & ~2) | 1 << 10 | 1 << 0,
                flagsFix: accr.flagsFix,
                mtCount,
                dateFrom: perDateFrom,
                dateTo: perDateTo,
                rate: accr.rate,
                dateFromAvg: accr.dateFromAvg ? dateService.shiftDate(accr.dateFromAvg) : null,
                dateToAvg: accr.dateToAvg ? dateService.shiftDate(accr.dateToAvg) : null,
                paySum,
                paySumAccrual,
                rateOff,
                paySumOff
              }
              const accrPeriodSalary = cont.periods.find(o => o.ID === accr.periodSalaryID)
              const accrPeriodCalc = cont.periods.find(o => o.ID === accr.periodCalcID)
              switch (payEl.method.code) {
                case '12': {
                  let fact = {}
                  const timeSheets = algorithmService.getTimeSheetByPeriod(accrPeriodSalary, cont)
                  params.days = 0
                  params.hours = 0
                  if (accr.flagsFix & 1) {
                    params.days = accr.days
                    params.hours = accr.hours
                    params.planDays = accr.planDays
                    params.planHours = accr.planHours
                    params.baseSum = accr.baseSum
                  } else {
                    const deptIDs = accrualService.getCalcParams(accr.calcParams, 'deptIDs')
                    if (deptIDs) {
                      baseSum = 0
                      sourceAccr.accrualDt = []
                      cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                        if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= params.dateTo && pos.dateTo >= params.dateFrom) {
                          const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, params.dateFrom))
                          const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, params.dateTo))
                          const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: factDateFrom, dateTo: factDateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo })
                          params.days += payTime.days
                          params.hours = accrualService.round(params.hours + payTime.hours, 4)
                          const fact = algorithmService.getFactSum({
                            withDetail: true,
                            cont,
                            payElID: params.payElID,
                            periodCalc: accrPeriodSalary,
                            periodSalary: accrPeriodSalary,
                            dateFrom: factDateFrom,
                            dateTo: factDateTo
                          })
                          params.baseSum = accrualService.round((params.baseSum || 0) + fact.factSum)
                          sourceAccr.accrualDt = sourceAccr.accrualDt.concat(fact.accrualDt)
                        }
                      })
                    } else {
                      const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: perDateFrom, dateTo: perDateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo })
                      params.days = payTime.days
                      params.hours = payTime.hours
                      params.planDays = payTime.planDays
                      params.planHours = payTime.planHours
                         fact = algorithmService.getFactSum({
                        withDetail: true,
                        cont,
                        payElID: accr.payElID,
                        periodCalc: accrPeriodSalary,
                        periodSalary: accrPeriodSalary,
                        dateFrom: perDateFrom,
                        dateTo: perDateTo
                         })
                      if (accr.baseSum === 0) {
                        params.baseSum = accrualService.round(accr.paySumAccrual / (payTime.fullTime ? (accr.days / payTime.days) : (accr.hours / payTime.hours)))
                        sourceAccr.accrualDt = accr.accrualDt
                      } else {
                        params.baseSum = fact.factSum
                        sourceAccr.accrualDt = fact.accrualDt
                      }
                    }
                  }
                  break
                }
                case '45':
                case '46':
                case '47': {
                  if (!params.dateFromAvg || !params.dateToAvg) {
                    const per = (!pos || !pos.payElID || cont.payEl[pos.payElID].periodType === 'CALC') ? accrPeriodCalc : accrPeriodSalary
                    params.dateFromAvg = per.dateFrom
                    params.dateToAvg = per.dateTo
                  }

                  if (accr.flagsFix & 1 && !payEl.isTimeSheet) {
                    params.baseSum = accr.baseSum
                  } else {
                    const deptIDs = accrualService.getCalcParams(accr.calcParams, 'deptIDs')
                    const calcPeriods = cont.periods.filter(o => o.dateFrom <= params.dateToAvg && o.dateTo >= params.dateFromAvg)
                    let accrualDt = []
                    params.days = 0
                    params.hours = 0
                    calcPeriods.forEach(period => {
                      const periodDateFrom = dateService.shiftDate(period.dateFrom)
                      const periodDateTo = dateService.shiftDate(Math.min(period.dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork))
                      const periodTimeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
                      const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets: periodTimeSheets, dateFrom: periodDateFrom, dateTo: periodDateTo })
                      params.days += payTime.days
                      params.hours = accrualService.round(params.hours + payTime.hours, 4)
                      if (payEl.calcSumType === 'FACT') {
                        if (deptIDs) {
                          period.baseSum = 0
                          cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                            if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
                              const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, perDateFrom))
                              const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, perDateTo))
                              const fact = algorithmService.getFactSum({
                                withDetail: true,
                                cont,
                                payElID: params.payElID,
                                periodCalc: period,
                                periodSalary: period,
                                dateFrom: factDateFrom,
                                dateTo: factDateTo
                              })
                              period.baseSum = accrualService.round((period.baseSum || 0) + fact.factSum)
                              accrualDt = accrualDt.concat(fact.accrualDt)
                            }
                          })
                        } else {
                          if (payEl.isTimeSheet && (period.dateFrom.getTime() !== perDateFrom.getTime() || period.dateFrom.getTime() !== perDateTo.getTime())) {
                            if ((payTime.fullTime ? payTime.planDays : payTime.planHours) !== 0) {
                              if (accr.baseSum === 0) {
                                // Розрахунок базової суми, якщо вона не заповнена в документах премії, щоб зрозуміти чи потрібно перераховувати
                                period.baseSum = accrualService.round(accr.paySumAccrual / (payTime.fullTime ? (accr.days / payTime.days) : (accr.hours / payTime.hours)))
                              } else {
                                period.baseSum = accrualService.round(accr.baseSum / (payTime.fullTime ? (payTime.planDays / payTime.days) : (payTime.planHours / payTime.hours)))
                              }
                            }
                          } else {
                            const fact = algorithmService.getFactSum({
                              withDetail: true,
                              cont,
                              payElID: params.payElID,
                              periodCalc: period,
                              periodSalary: period,
                              dateFrom: periodDateFrom,
                              dateTo: periodDateTo
                            })
                            period.baseSum = fact.factSum
                            accrualDt = accrualDt.concat(fact.accrualDt)
                          }
                        }
                      }
                    })
                    let calcSum = 0
                    if (calcPeriods.length) {
                      calcSum = accrualService.round(calcPeriods.reduce((sum, period) => {
                        return sum + period.baseSum
                      }, 0) / (payEl.baseSumIsAverage ? calcPeriods.length : 1))
                      if (calcSum < 0) {
                        calcSum = 0
                      }
                    }
                    params.baseSum = calcSum
                    sourceAccr.accrualDt = calcSum ? algorithmService.calcGroupSumAccrualDt(accrualDt, calcSum, true) : []
                  }
                }
              }
              params.mask = 0
              
              const docAccrual = algorithmMonthPremium.run({
                cont,
                periodCalc,
                periodSalary: accrPeriodSalary,
                params,
                sourceAccr,
                source
              })
              if (docAccrual.paySum !== paySum) {
                docAccrual.linkToParentID = accr.ID
                docAccrual.insert = true
                docAccrual.orderID = accr.orderID
                docAccrual.orderDtID = accr.orderDtID
                cont.emp[cont.employeeNumberID].accrual.push(docAccrual)
                if (paySum !== 0) {
                  const acc = Object.assign({}, accr)
                  acc.insert = true
                  acc.periodCalcID = periodCalc.ID
                  acc.periodCalc = periodCalc.dateFrom
                  acc.linkToParentID = acc.ID
                  acc.mask = mask
                  acc.flagsRec = (((acc.flagsRec | 1 << 9) & ~2) | 1)
                  acc.paySum = -1 * paySum
                  acc.baseSum = -1 * baseSum
                  acc.paySumAccrual = -1 * paySumAccrual
                  acc.rateOff = rateOff
                  acc.paySumOff = paySumOff
                  acc.calculateDate = dateService.currentDateTime()
                  acc.planHours = acc.planHours ? -1 * acc.planHours : acc.planHours
                  acc.planDays = acc.planDays ? -1 * acc.planDays : acc.planDays
                  acc.days = -1 * days
                  acc.hours = -1 * hours
                  delete acc.accrualDt
                  delete acc.ID
                  if (accr.accrualDt && accr.accrualDt.length) {
                    acc.accrualDt = []
                    accr.accrualDt.forEach(dt => {
                      const aDt = Object.assign({}, dt)
                      delete aDt.ID
                      delete aDt.accrualID
                      aDt.paySum *= -1
                      acc.accrualDt.push(aDt)
                    })
                    acc.accrualDt = algorithmService.correctAccrualDt(acc.accrualDt, acc.paySum)
                  } else {
                    acc.accrualDt = [{ paySum: acc.paySum }]
                  }
                  cont.emp[cont.employeeNumberID].accrual.push(acc)
                }
              }
            }
          }
        })
      })
    }

    // Цикл по періодам які перераховуються "Доплата до середнього заробітку"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['50', '51']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => {
              return calcMethods.includes(payEl.method.code)
            }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateTo) {
          return
        }
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual
          .filter(o => ((35 & calculateProperty.calcType) || (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
            o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom && calcMethods.includes(cont.payEl[o.payElID].method.code) &&
            !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
              accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096)))
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              dateFrom: perDateFrom,
              dateTo: perDateTo
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }
            const sourceAccr = {
              perAccr,
              periodCalc
            }
            let fact = algorithmService.getFactSum({
              withDetail: true,
              cont,
              payElID: perAccr.payElID,
              periodCalc: periodSalary,
              periodSalary,
              dateFrom: perDateFrom,
              dateTo: perDateTo
            })
            params.sumAvg = perAccr.accrualSum
            params.baseSum = fact.factSum
            sourceAccr.accrualDt = fact.accrualDt
            const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
            params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
            const timeBy = (pos && pos.payElID) ? (cont.payEl[pos.payElID].useTimeSheetBy || 'NORMA') : 'NORMA'
            const payTime = algorithmService.getPayTimeByTimeCost(params.mask, params.dateFrom, params.dateTo, timeBy === 'PLAN' ? 'planHour' : 'normHour', [], false, timeSheets, timeBy === 'PLAN' ? 'plan' : 'norma', orgID)
            params.planDays = payTime.days
            params.planHours = payTime.hours
            params.days = payTime.days
            params.hours = payTime.hours
            calcSelAlgorithm({
              payEl,
              params,
              cont,
              periodCalc,
              periodSalary,
              source,
              sourceAccr,
              calculateProperty
            })
          })
      })
    }
    // Цикл по періодам які перераховуються "Доплата до мінімальної суми", "Доплата до мінімальної зарплати"
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['25', '49']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
          calcMethods.includes(cont.payEl[o.payElID].method.code) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            algorithmService.getChangeSalaryByPeriod(cont, perDateFrom, perDateTo).forEach(salaryChangePeriod => {
              const params = {
                employeeNumberID: employeeNumberID,
                payElID: perAccr.payElID,
                flagsRec: 1,
                mtCount: salaryChangePeriod.payElID ? ((salaryChangePeriod.mtCount && cont.payEl[salaryChangePeriod.payElID].isMtCount) ? salaryChangePeriod.mtCount : 1) : (salaryChangePeriod.mtCount || 1)
              }
              if (payEl.maxMtCount) {
                params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
              }

              const source = {
                source: perAccr.source,
                sourceID: perAccr.ID
              }
              const sourceAccr = {
                perAccr,
                periodCalc
              }
              if (calcMethods.includes(payEl.method.code)) {
                params.dateFrom = salaryChangePeriod.dateFrom
                params.dateTo = salaryChangePeriod.dateTo
                if (perAccr.baseSum && payEl.method.code === '25') {
                  params.baseSum = perAccr.baseSum
                } else {
                  const fact = algorithmService.getFactSum({
                    withDetail: true,
                    cont,
                    payElID: perAccr.payElID,
                    periodCalc: periodSalary,
                    periodSalary,
                    dateFrom: salaryChangePeriod.dateFrom,
                    dateTo: salaryChangePeriod.dateTo,
                    periodType: 'SALARY'
                  })
                  params.baseSum = fact.factSum
                  sourceAccr.accrualDt = fact.accrualDt
                }
                if (payEl.method.code === '49') {
                  params.minSum = perAccr.baseSum || 0
                }
                params.rate = perAccr.rate
                const payTime = payEl.isNormMinSum
                  ? algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo, planByNorm: true, useTimeSheetBy: (salaryChangePeriod.payElID ? cont.payEl[salaryChangePeriod.payElID].useTimeSheetBy : null) })
                  : algorithmService.getTimeForMinSum({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, calcProportion: salaryChangePeriod.payElID ? cont.payEl[salaryChangePeriod.payElID].useTimeSheetBy : 'NORMA' })
                params.flagsRec = params.flagsRec | ((!payTime.fullTime || (salaryChangePeriod.payElID && cont.payEl[salaryChangePeriod.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                params.planDays = payTime.planDays
                params.planHours = payTime.planHours
                params.days = payTime.days
                params.hours = payTime.hours
                params.mask = payTime.mask
                params.hoursByDays = payTime.hoursByDays
                params.planHoursByDays = payTime.planHoursByDays
                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
              }
            })
          })
      })
    }
    if (cont.constants.hrTimeSheetReCalcDate && cont.emp[cont.employeeNumberID].prop.timeSheetsPrior) {
      cont.emp[cont.employeeNumberID].prop.baseTimeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets
      cont.emp[cont.employeeNumberID].prop.timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheetsPrior
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsWithParent
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
    } else if (cont.emp[cont.employeeNumberID].prop.timeSheetsWithParent) {
      cont.emp[cont.employeeNumberID].prop.baseTimeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets
      cont.emp[cont.employeeNumberID].prop.timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheetsWithParent
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsWithParent
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
    }

    // Оплата за середнім заробітком з постійних нарахувань
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['44']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return ['44'].includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        if (!timeSheets.length) { return }
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
          ['44'].includes(cont.payEl[o.payElID].method.code) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateTo && o.dateTo >= perDateFrom)
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              mtCount: pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1
            }
            switch (payEl.method.code) {
              case '44': {
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                const accrualParams = perAccr.accrualParams ? JSON.parse(perAccr.accrualParams) : {}
                if (!accrualParams.params) accrualParams.params = {}
                if (accrualParams.accrualAvg) {
                  accrualParams.accrualAvg.forEach(avg => {
                    avg.flagsFix = 143425 // 1 << 13 | 1 << 12 | 1 << 0 | 1 << 6 | 1 << 17
                  })
                }
                const order = {
                  recalculate: true,
                  orgID: cont.orgID,
                  periodCalcID: cont.periodCalc,
                  employeeNumberID: cont.employeeNumberID,
                  payElID: payEl.ID,
                  flagsFix: (accrualParams.params.flagsFix || 0) | 8391681, // 1 << 10 | 1 << 11 | 1 << 23 | 1 << 0
                  flagsRec: 1,
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo,
                  baseSum: accrualParams.params.avgSum || 0,
                  avgCalcType: accrualParams.params.avgCalcType || null,
                  dateFromAvg: accrualParams.params.dateFromAvg ? dateService.shiftDate(accrualParams.params.dateFromAvg) : null,
                  dateToAvg: accrualParams.params.dateToAvg ? dateService.shiftDate(accrualParams.params.dateToAvg) : null,
                  avgSum: accrualParams.params.avgSum || 0,
                  calcEarnings: accrualParams.params.calcEarnings || payEl.calcEarnings || null,
                  dayAccumCondition: payEl.method.dayAccumCondition || 'noDaysOff',
                  accrualsAvg: accrualParams.accrualAvg || [],
                  accruals: [],
                  source: perAccr.source === 'hr_employeeAccrual' ? {
                    source: perAccr.source,
                    sourceID: perAccr.ID,
                    orderID: perAccr.orderID,
                    perAccr
                  } : null
                }
                const resultData = calculateOrderAccrual(order, cont)
                resultData.accruals.forEach(accrual => {
                  if (resultData.accrualsAvg && resultData.accrualsAvg.length) {
                    resultData.accrualsAvg.forEach(avg => {
                      delete avg.ID
                      delete avg.idx
                      delete avg['periodID.name']
                    })
                  }
                  delete accrual.ID
                  delete accrual.idx
                  accrual.flagsRec = 1
                  accrual.accrualAvg = resultData.accrualsAvg
                  accrual.periodCalcID = cont.periodCalc.ID
                  accrual.periodCalc = cont.periodCalc.dateFrom
                  accrual.source = perAccr.source
                  accrual.sourceID = perAccr.ID
                  reduction({ cont, accrual, calculateProperty })
                })
              }
            }
          })
      })
    }
    // Цикл по періодам які перераховуються "Перерахунок нарахувань від середнього заробітку" (Відпустки і т. д.)
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['13', '16', '71', '67', '142', '21', '22', '23', '36', '37', '44', '68', '73', '17', '18', '19', '20', '40', '149']
      reCalcPeriod.forEach(periodSalary => {
        const recalcAccruals = []
        cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
          const payEl = cont.payEl[accr.payElID]
          if (((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(accr.payElID))) &&
            (accr.flagsRec & 2) && !(accr.flagsRec & 1 << 20) && accr.periodCalcID === periodSalary.ID && payEl.isRecalculate && calcMethods.includes(payEl.method.code) &&
            !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 2) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 16)) {
            let paySum = accr.paySum
            let days = accr.days
            let hours = accr.hours || 0
            let mask = accr.mask
            let addRecalc = true
            let storno = false
            cont.emp[cont.employeeNumberID].accrual.forEach(o => {
              if (o.linkToParentID === accr.ID && ((o.flagsRec & 1 << 9) || (o.flagsRec & 1 << 10)) && !(o.flagsRec & 1 << 12)) {
                paySum = paySum + o.paySum
                if (o.flagsRec & 1 << 9) {
                  days += o.days
                  hours += (o.hours || 0)
                  if ([4, 5, 6].includes(cont.payEl[accr.payElID].method.groupCode)) {
                    mask = mask & ~o.mask
                  }
                }
                if (o.flagsRec & 1 << 2) {
                  addRecalc = false
                }
                if (o.flagsRec & 1 << 9) {
                  storno = true
                }
              }
            })
            if (addRecalc && ((days === null || days > 0) || !storno)) {
              const recalcOrderAccr = recalcAccruals.find(o => o.find(a => a.orderID === accr.orderID && a.orderID))
              const recalcAccrual = Object.assign({}, accr)
              delete recalcAccrual.accrualDt
              recalcAccrual.accrualDt = []
              if (accr.accrualDt && accr.accrualDt.length) {
                accr.accrualDt.forEach(dt => {
                  recalcAccrual.accrualDt.push(Object.assign({}, dt))
                })
              }
              recalcAccrual.correctDays = days
              recalcAccrual.correctPaySum = paySum
              recalcAccrual.correctHours = hours
              recalcAccrual.mask = mask
              if (recalcOrderAccr) {
                recalcOrderAccr.push(recalcAccrual)
              } else {
                recalcAccruals.push([recalcAccrual])
              }
            }
          }
        })
        recalcAccruals.sort((a, b) => a[0].dateFrom && b[0].dateFrom ? dateService.shiftDate(a[0].dateFrom).getTime() - dateService.shiftDate(b[0].dateFrom).getTime() : 0)

        recalcAccruals.forEach(accruals => {
          recalcOrderAccrual(cont, accruals)
        })
      })
    }
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime.timeCalcDt[`перерахунок документів`] = (new Date()).getTime() - logDocDate.getTime()
    }
    if (cont.emp[cont.employeeNumberID].prop.baseTimeSheets) {
      const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets
      cont.emp[cont.employeeNumberID].prop.timeSheets = cont.emp[cont.employeeNumberID].prop.baseTimeSheets
      cont.emp[cont.employeeNumberID].prop.baseTimeSheets = timeSheets
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
    }
    // Доплата до чистої суми з обмеженням
    if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['204', '205']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo < periodSalary.dateFrom || periodSalary.dateFrom > periodCalc.dateFrom) {
          return
        }
        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
        if (!timeSheets.length) { return }
        // Постійні нарахування
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((35 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
          calcMethods.includes(cont.payEl[o.payElID].method.code) &&
          (!['205'].includes(cont.payEl[o.payElID].method.code) ||
            ((cont.payEl[o.payElID].isPayDismAll || (periodCalc.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
              (cont.payEl[o.payElID].isPayDismSalPeriod || (periodSalary.dateTo < cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
              (!cont.payEl[o.payElID].isPayDismCalcPeriod || (periodCalc.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodCalc.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo)) &&
              (!cont.payEl[o.payElID].isPayDismOnlyPeriod || (periodSalary.dateFrom <= cont.emp[employeeNumberID].prop.employeeNumber.dateTo && periodSalary.dateTo >= cont.emp[employeeNumberID].prop.employeeNumber.dateTo))
            )) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
        )
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              mtCount: (pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1)
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }

            const sourceAccr = {
              perAccr,
              periodCalc
            }
            switch (payEl.method.code) {
              case '204':
              case '205': {
                params.dateFrom = perDateFrom
                params.dateTo = perDateTo
                const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo })
                params.flagsRec = params.flagsRec | ((!payTime.fullTime || (pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
                params.planDays = payTime.planDays
                params.planHours = payTime.planHours
                params.days = payTime.days
                params.hours = payTime.hours
                params.mask = payTime.mask
                params.hoursByDays = payTime.hoursByDays
                params.planHoursByDays = payTime.planHoursByDays
                let accrualSum = (perAccr.baseSum || 0) * (payEl.isMtCount ? params.mtCount : 1) * (payEl.isTimeSheet ? (params.planDays ? (params.days / params.planDays) : 0) : 1)
                let limitSum = (perAccr.limitSum || 0) * (payEl.isMtCount ? params.mtCount : 1) * (payEl.isLimitTimeSheet ? (params.planDays ? (params.days / params.planDays) : 0) : 1)
                const fact = algorithmService.getFactSum({
                  withDetail: true,
                  withIncludPayEl: true,
                  cont,
                  payElID: perAccr.payElID,
                  periodCalc: periodSalary,
                  periodSalary,
                  dateFrom: perDateFrom,
                  dateTo: perDateTo,
                  periodType: 'SALARY'
                })
                const retentionCont = {
                  org: Object.assign({}, cont.org),
                  payEl: Object.assign({}, cont.payEl),
                  sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
                  payFund: cont.payFund,
                  periods: cont.periods,
                  holidays: cont.holidays,
                  dict: Object.assign({}, cont.dict),
                  emp: { [employeeNumberID]: { prop: Object.assign({}, cont.emp[employeeNumberID].prop) } }

                }
                const payElOfftake = cont.payEl[perAccr.payElID].payElAddRetention.map(o => o.payElBaseID)
                const baseAccrual = [].concat(fact.includPayEl || [])
                autoCalculate({
                  cont: retentionCont,
                  orgID,
                  periodID: periodSalary.ID,
                  employeeNumbers: [employeeNumberID],
                  skipCommit,
                  calculateProperty: {
                    calcType: 1 << 4,
                    calculatePayElIDs: payElOfftake,
                    dateFrom: periodSalary.dateFrom,
                    dateTo: periodSalary.dateTo,
                    accrual: { [employeeNumberID]: baseAccrual }
                  }
                })
                let taxSum = 0
                let hasTaxLimit = false
                retentionCont.emp[employeeNumberID].accrual.forEach(alAccr => {
                  if (payElOfftake.includes(alAccr.payElID)) {
                    taxSum = accrualService.round(taxSum + alAccr.paySum)
                    if (alAccr.taxIndividAcc) {
                      alAccr.taxIndividAcc.forEach(iAcc => {
                        if (iAcc.taxLimitID1) {
                          hasTaxLimit = true
                        }
                      })
                    }
                  }
                })
                params.calculatedSum = fact.factSum - taxSum
                if (perAccr.limitSum && (hasTaxLimit || (params.calculatedSum >= limitSum || Math.max(0, Math.min(accrualSum, limitSum - params.calculatedSum)) < (payEl.sumPayMore || 0)))) {
                  params.paySum = 0
                  params.paySumAccrual = 0
                  if (hasTaxLimit) {
                    params.calcParams = accrualService.setCalcParams(params.calcParams, 'calcMessage', 1)
                    params.calcParams = accrualService.setCalcParams(params.calcParams, 'save', true)
                  }
                } else {
                  params.paySumAccrual = Math.max(0, Math.min(accrualSum, perAccr.limitSum ? limitSum - params.calculatedSum : accrualSum))
                  let accr = Object.assign({
                    periodCalcID: periodSalary.ID,
                    periodSalaryID: periodSalary.ID,
                    periodCalc: periodSalary.dateFrom,
                    periodSalary: periodSalary.dateFrom,
                    employeeNumberID: employeeNumberID,
                    payElID: payEl.ID,
                    paySum: params.paySumAccrual,
                    accrualDt: [{ paySum: params.paySumAccrual }]
                  }, params)
                  autoCalculate({
                    cont: retentionCont,
                    orgID,
                    periodID: periodSalary.ID,
                    employeeNumbers: [employeeNumberID],
                    skipCommit,
                    calculateProperty: {
                      calcType: 1 << 4,
                      calculatePayElIDs: payElOfftake,
                      dateFrom: periodSalary.dateFrom,
                      dateTo: periodSalary.dateTo,
                      accrual: { [employeeNumberID]: [accr] }
                    }
                  })
                  let taxSumAcc = 0
                  retentionCont.emp[employeeNumberID].accrual.forEach(alAccr => {
                    if (payElOfftake.includes(alAccr.payElID)) {
                      taxSumAcc = accrualService.round(taxSumAcc + alAccr.paySum)
                    }
                  })
                  params.paySum = accrualService.round(Math.max(0, params.paySumAccrual + taxSumAcc / (params.paySumAccrual - taxSumAcc) * params.paySumAccrual))
                  if (perAccr.limitSum) {
                    accr = Object.assign({
                      periodCalcID: periodSalary.ID,
                      periodSalaryID: periodSalary.ID,
                      periodCalc: periodSalary.dateFrom,
                      periodSalary: periodSalary.dateFrom,
                      employeeNumberID: employeeNumberID,
                      payElID: payEl.ID,
                      paySum: params.paySum,
                      accrualDt: [{ paySum: params.paySum }]
                    }, params)
                    autoCalculate({
                      cont: retentionCont,
                      orgID,
                      periodID: periodSalary.ID,
                      employeeNumbers: [employeeNumberID],
                      skipCommit,
                      calculateProperty: {
                        calcType: 1 << 4,
                        calculatePayElIDs: payElOfftake,
                        dateFrom: periodSalary.dateFrom,
                        dateTo: periodSalary.dateTo,
                        accrual: { [employeeNumberID]: (fact.includPayEl || []).concat([accr]) }
                      }
                    })
                    taxSumAcc = 0
                    retentionCont.emp[employeeNumberID].accrual.forEach(alAccr => {
                      if (payElOfftake.includes(alAccr.payElID)) {
                        taxSumAcc = accrualService.round(taxSumAcc + alAccr.paySum)
                      }
                    })
                    if (accrualService.round(fact.factSum + params.paySum - taxSumAcc) > limitSum) {
                      params.paySum = accrualService.round(params.paySum - (accrualService.round(fact.factSum + params.paySum - taxSumAcc) - limitSum))
                    }
                  }
                }
                params.sumAvg = accrualSum
                params.planSumAvg = limitSum

                calcSelAlgorithm({
                  payEl,
                  params,
                  cont,
                  periodCalc,
                  periodSalary,
                  source,
                  sourceAccr,
                  calculateProperty
                })
                break
              }
            }
          })
      })
    }
    if (cont.emp[cont.employeeNumberID].prop.baseTimeSheets) {
      const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets
      cont.emp[cont.employeeNumberID].prop.timeSheets = cont.emp[cont.employeeNumberID].prop.baseTimeSheets
      cont.emp[cont.employeeNumberID].prop.baseTimeSheets = timeSheets
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
    }
    // Резерв відпусток
    if (((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) && cont.emp[employeeNumberID].prop.employeeNumber.dateTo > periodCalc.dateTo) {
      calcMethods = ['201', '202']
      const periodSalary = periodCalc
      const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
      // Постійні нарахування
      cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods)
      cont.emp[employeeNumberID].permanentAccrual.filter(o =>
        ((35 & calculateProperty.calcType) ||
          (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
        cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
        o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom &&
        !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
          accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096))
      ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
        .forEach(perAccr => {
          const payEl = cont.payEl[perAccr.payElID]
          let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
          let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
          if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
            perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
            perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
          }

          const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom)
          const params = {
            employeeNumberID: employeeNumberID,
            payElID: perAccr.payElID,
            flagsRec: 1 | 1 << 13,
            mtCount: (pos ? (pos.payElID ? ((pos.mtCount && cont.payEl[pos.payElID].isMtCount) ? pos.mtCount : 1) : (pos.mtCount || 1)) : 1)
          }
          const sourceAccr = {
            perAccr,
            periodCalc
          }

          switch (payEl.method.code) {
            case '201': {
              params.dateFrom = perDateTo
              params.dateTo = perDateTo
              params.baseDate = dateService.firstDayOfMonth(dateService.addMonths(perDateTo, 1))
              if (cont.emp[employeeNumberID].prop.employeeNumber.finishWork > periodSalary.dateTo &&
                (!payEl.payElTimeCostNot.length || timeSheets.find(o => !payEl.payElTimeCostNot.find(c => c.dictTimeCostID === o.factTimeCostID)))) {
                const orderParams = {
                  avgOnDate: params.baseDate,
                  dateFrom: params.baseDate,
                  dateTo: params.baseDate,
                  orgID: cont.orgID,
                  periodCalcID: cont.periodCalc,
                  employeeNumberID: cont.employeeNumberID,
                  payElID: payEl.ID,
                  flagsFix: 0,
                  flagsRec: 1,
                  dayAccumCondition: payEl.method.dayAccumCondition || 'noDaysOff'
                }
                const resultCalculate = averageService.calculateAverage({
                  orgID,
                  cont,
                  params: orderParams,
                  excludeHolidays: false,
                  checkContinuation: true
                })
                if (!resultCalculate && orderParams.avgCalcType === 'FACT') {
                  orderParams.avgCalcType = 'PLAN'
                  orderParams.accrualDt = []
                }
                orderParams.dateFrom = perDateTo
                if (!resultCalculate && orderParams.avgCalcType === 'PLAN') {
                  averageService.calculateAveragePlan({
                    orgID,
                    cont,
                    params: orderParams,
                    periodCalc: periodSalary,
                    onDate: params.baseDate,
                    excludeHolidays: false,
                    daysMode: 1
                  })
                }
                params.baseSum = accrualService.round(orderParams.baseSum || 0)
                if (orderParams.avgDt) {
                  params.paySumAccrual = orderParams.avgDt.baseSum
                  params.calendarDays = orderParams.avgDt.days
                }
                sourceAccr.accrualDt = orderParams.accrualDt
                params.mask = 0
                params.koef = 0
                params.standingAll = 0
                if (params.baseSum) {
                  const vacPeriods = UB.Repository('hr_empVacationPeriod')
                    .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'isPartYear', 'empVacationPlanID.dayCount'])
                    .where('empVacationPlanID.employeeNumberID', '=', cont.employeeNumberID)
                    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
                    .where('empVacationPlanID.dictVacationKindID.isFormReserve', '=', true)
                    .where('fromOrgID', 'isNull')
                    .where('dateFrom', '<=', perDateTo)
                    .where('dateTo', '>=', perDateFrom)
                    .where('empVacationPlanID.dateFrom', '<=', perDateTo)
                    .where('empVacationPlanID.dateTo', '>=', payEl.isCalcReservePart ? perDateTo : perDateFrom)
                    .selectAsObject({
                      'empVacationPlanID.dayCount': 'dayCount'
                    })
                  vacPeriods.forEach(vacPeriod => {
                    vacPeriod.dateFrom = dateService.shiftDate(vacPeriod.dateFrom)
                    vacPeriod.dateTo = dateService.shiftDate(vacPeriod.dateTo)
                    const periodDays = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, vacPeriod.dateFrom, vacPeriod.dateTo)
                    params.standingAll = accrualService.round(params.standingAll + (vacPeriod.dayCount || 0), 0)
                    let daysPlan = 0
                    if (payEl.isCalcReservePart) {
                      const dayCount = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, periodSalary.dateFrom, periodSalary.dateTo)
                      daysPlan = Math.min(vacPeriod.dayCountPlan, vacPeriod.dayCountPlan / periodDays * dayCount)
                    } else {
                      const dayCount = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, dateService.shiftDate(Math.max(perDateFrom, vacPeriod.dateFrom)), dateService.shiftDate(Math.min(perDateTo, vacPeriod.dateTo)))
                      daysPlan = Math.min(vacPeriod.dayCountPlan, vacPeriod.dayCountPlan / periodDays * dayCount)
                    }
                    params.koef = accrualService.round(params.koef + daysPlan, 6)
                  })
                  /* if (vacPeriods.length) {
                    params.standingAll = accrualService.round(params.standingAll / vacPeriods.length, 0)
                  } */
                  params.koef = accrualService.round(params.koef, payEl.roundDays || 2)
                }
                const accrual = algorithmReserve.run({
                  cont,
                  periodCalc,
                  periodSalary,
                  params,
                  sourceAccr
                })
                accrual.avgCalcType = orderParams.avgCalcType
                accrual.dateFromAvg = orderParams.dateFromAvg
                accrual.dateToAvg = orderParams.dateToAvg
                accrual.accrualAvg = orderParams.accrualsAvg || []
                accrual.calculateDate = dateService.currentDateTime()
                accrual.insert = true
                if (accrual.paySum > 0) {
                  cont.emp[cont.employeeNumberID].accrual.push(accrual)
                }
              }
              break
            }
            case '202': {
              params.dateFrom = perDateFrom
              params.dateTo = perDateTo
              params.koef = 1
              const fact = algorithmService.getFactSum({
                withDetail: true,
                cont,
                payElID: perAccr.payElID,
                periodCalc: periodSalary,
                periodSalary,
                dateFrom: perDateFrom,
                dateTo: perDateTo,
                sourceID: (params.flagsRec & 1 << 15) ? perAccr.ID : null
              })
              params.baseSum = fact.factSum
              sourceAccr.accrualDt = fact.accrualDt
              params.rate = perAccr.rate || 0
              params.mask = 0
              const accrual = algorithmReserve.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              })
              accrual.calculateDate = dateService.currentDateTime()
              accrual.insert = true
              cont.emp[cont.employeeNumberID].accrual.push(accrual)
              break
            }
          }
        })
    }
    if (cont.emp[cont.employeeNumberID].prop.baseTimeSheets) {
      const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets
      cont.emp[cont.employeeNumberID].prop.timeSheets = cont.emp[cont.employeeNumberID].prop.baseTimeSheets
      cont.emp[cont.employeeNumberID].prop.baseTimeSheets = timeSheets
      delete cont.emp[cont.employeeNumberID].prop.timeSheetsByPeriod
    }
    if ((33 & calculateProperty.calcType) && cont.constants.hrMinReCalcDate) {
      // Розрахунок утримань і нарахувань на зарплату виконується без обмеження по мінімальному розрахунковому періоду, тобто на наявний дохід, але не раніше ніж мінімальний обліковий період поточного розрахункового періоду.
      const accrualReCalcDate = getAccrualReCalcDate(cont.orgID, employeeNumberID, periodID)
      if (accrualReCalcDate && accrualReCalcDate < cont.constants.hrMinReCalcDate) {
        recalcDate = accrualService.getReCalcDate({ orgID: cont.orgID, employeeNumberID, periodID: periodCalc.ID, reCalcDate: periodCalc.dateFrom, minReCalcDate: accrualReCalcDate })
        reCalcPeriod = periodService.getPeriodsByDateFromCont(cont, recalcDate.dateFrom, cont.emp[employeeNumberID].recalcDateTo)
      }
    }

    // Утримання
    // 9 Цикл по періодам які перераховуються "ПДФО"
    if ((1 << 0 | 1 << 2 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
      calcMethods = ['26']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }
        let perDateFrom = dateService.shiftDate(periodSalary.dateFrom)
        let perDateTo = dateService.shiftDate(periodSalary.dateTo)
        if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
          perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
          perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
        }
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, { dateFrom: perDateFrom, dateTo: perDateTo }, calcMethods, null, true)
          .filter(o => ((37 & calculateProperty.calcType) || (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
            cont.payEl[o.payElID].isAutoCalc && calcMethods.includes(cont.payEl[o.payElID].method.code))
        const allTaxIndividAcc = algorithmService.getTaxIndividAcc(cont, cont.emp[cont.employeeNumberID].permanentAccrual, perDateFrom, perDateTo, periodSalary, calcMethods, calculateProperty.calcType)
        
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096)))
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1,
              dateFrom: perDateFrom,
              dateTo: perDateTo
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }
            const sourceAccr = {
              perAccr,
              allTaxIndividAcc,
              periodCalc
            }
            params.mask = algorithmService.getFillMaskByPeriod(perDateFrom, perDateTo)
            calcSelAlgorithm({ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr, calculateProperty })
          })
      })
      // 10 Цикл по періодам які перераховуються "27 Війсковий сбір"
      calcMethods = ['27']
      reCalcPeriod.forEach(periodSalary => {  
          const recalcOld = periodCalc?periodCalc.dateFrom>=dateService.shiftDate('2024-12-01') && periodSalary.dateTo<dateService.shiftDate('2024-12-01'):
                                       cont.periodCalc.dateFrom>=dateService.shiftDate('2024-12-01') && periodSalary.dateTo<dateService.shiftDate('2024-12-01')
        
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) },
            recalcOld
          })
        }
        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods, null, true)
        const militaryPerAccr = cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((37 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          calcMethods.includes(cont.payEl[o.payElID].method.code) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096)))
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
        const groupMilitaryPerAccr = []
        militaryPerAccr.forEach(perAccr => {
          const payEl = cont.payEl[perAccr.payElID]
          let perDateFrom = dateService.shiftDate(Math.max(periodSalary.dateFrom, perAccr.dateFrom))
          let perDateTo = dateService.shiftDate(Math.min(periodSalary.dateTo, perAccr.dateTo))
          if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
            perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
            perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
          }
          const params = {
            employeeNumberID: employeeNumberID,
            payElID: perAccr.payElID,
            flagsRec: 1
          }
          const source = {
            source: perAccr.source,
            sourceID: perAccr.ID
          }
          const sourceAccr = {
            perAccr,
            periodCalc
          }
          params.dateFrom = perDateFrom
          params.dateTo = perDateTo
          params.mask = algorithmService.getFillMaskByPeriod(perDateFrom, perDateTo)
          const payElRates = cont.payEl[perAccr.payElID].payElRate.find(o => (o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom))
          params.rate = (perAccr.rate !== null && perAccr.rate >= 0 && perAccr.source !== 'hr_payPerm') ? perAccr.rate : (payElRates ? payElRates.rate : 0)
          let fact = {}
          if (perAccr.baseSum) {
            params.baseSum = perAccr.baseSum
          } else {
            if (params.rate > 0) {
              fact = algorithmService.getFactSum({
                withDetail: true,
                withPayElID: true,
                cont,
                payElID: perAccr.payElID,
                periodCalc: periodSalary,//!recalcOld?periodCalc:periodSalary,
                periodSalary,
                dateFrom: perDateFrom,
                dateTo: perDateTo,
                periodCalcMain: recalcOld?periodCalc:null
              })
              params.baseSum = fact.factSum
              sourceAccr.accrualDt = fact.accrualDt
            } else {
              params.baseSum = 0
              sourceAccr.accrualDt = []
            }
          }
          if (params.baseSum !== 0) {
            let group = groupMilitaryPerAccr.find(o => o.rate === params.rate && o.roundUpTo === cont.payEl[params.payElID].roundUpTo)
            if (group) {
              group.baseSum = accrualService.round(group.baseSum + params.baseSum)
              group.paramsAccr.push({ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr, calculateProperty })
            } else {
              groupMilitaryPerAccr.push({
                rate: params.rate,
                baseSum: params.baseSum,
                roundUpTo: cont.payEl[params.payElID].roundUpTo,
                paramsAccr: [{ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr, calculateProperty }]
              })
            }
          }
        })
        groupMilitaryPerAccr.forEach(group => {
          if (group.paramsAccr.length > 1) {
            let addIdx = -1
            let remainder = 1
            let addPaySum = accrualService.roundPayEl(group.baseSum * group.rate / 100, group.roundUpTo)
            group.paramsAccr.forEach((calcParam, idx) => {
              const accrPaySum = accrualService.roundPayEl(calcParam.params.baseSum * calcParam.params.rate / 100, group.roundUpTo)
              const remainderPaySum = accrPaySum - accrualService.round(accrPaySum)
              if (remainderPaySum < remainder && !(calcParam.sourceAccr.accrualDt || []).reduce((result, dt) => {
                if (!result && (cont.dict.dictFundSourceFSSU || []).includes(dt.dictFundSourceID)) {
                  result = true
                }
                return result
              }, false)) {
                addIdx = idx
                // remainder = remainderPaySum
              }
              addPaySum = accrualService.roundPayEl(addPaySum - accrPaySum, group.roundUpTo)
            })
            if ((addIdx + 1) && addPaySum !== 0) {
              group.paramsAccr[addIdx].params.addPaySum = addPaySum
            }
          }
          group.paramsAccr.forEach((calcParam) => {
            calcSelAlgorithm(calcParam)
          })
        })
      })
      // 13 Цикл по періодам які перераховуються "32 Профспілкові внески"
      calcMethods = ['32']
      reCalcPeriod.forEach(periodSalary => {
        if (33 & calculateProperty.calcType) {
          reversal({
            cont,
            periodCalc,
            periodSalary,
            conditionPayEl: (payEl) => { return calcMethods.includes(payEl.method.code) }
          })
        }

        cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, calcMethods, null, true)
        cont.emp[employeeNumberID].permanentAccrual.filter(o =>
          ((37 & calculateProperty.calcType) ||
            (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
          cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
          calcMethods.includes(cont.payEl[o.payElID].method.code) &&
          !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
            accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (12 & accr.flagsRec) && !(accr.flagsRec & 4096)))
          .sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
          .forEach(perAccr => {
            const payEl = cont.payEl[perAccr.payElID]
            let perDateFrom = dateService.shiftDate(Math.max(periodSalary.dateFrom, perAccr.dateFrom))
            let perDateTo = dateService.shiftDate(Math.min(periodSalary.dateTo, perAccr.dateTo))
            if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
              perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
              perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
            }
            const params = {
              employeeNumberID: employeeNumberID,
              payElID: perAccr.payElID,
              flagsRec: 1
            }
            const source = {
              source: perAccr.source,
              sourceID: perAccr.ID
            }
            const sourceAccr = {
              perAccr,
              periodCalc
            }
            params.dateFrom = perDateFrom
            params.dateTo = perDateTo
            const payElRates = cont.payEl[perAccr.payElID].payElRate.find(o => (dateService.shiftDate(o.dateFrom) <= perDateFrom && dateService.shiftDate(o.dateTo) >= perDateTo))
            params.rate = (perAccr.rate !== null && perAccr.rate >= 0 && perAccr.source !== 'hr_payPerm') ? perAccr.rate : (payElRates ? payElRates.rate : 0)
            params.mask = algorithmService.getFillMaskByPeriod(perDateFrom, perDateTo)
            let fact = {}
            if (perAccr.baseSum) {
              params.baseSum = perAccr.baseSum
            } else {
              if (params.rate > 0) {
                fact = algorithmService.getFactSum({
                  withDetail: true,
                  cont,
                  payElID: perAccr.payElID,
                  periodCalc: periodSalary,
                  periodSalary,
                  dateFrom: perDateFrom,
                  dateTo: perDateTo
                })
                params.baseSum = fact.factSum
                sourceAccr.accrualDt = fact.accrualDt
              } else {
                params.baseSum = 0
                sourceAccr.accrualDt = []
              }
            }
            if (params.baseSum !== 0) {
              calcSelAlgorithm({ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr, calculateProperty })
            }
          })
      })
      if ((1 << 0 | 1 << 1 | 1 << 2 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
        // 11 Цикл по періодам які перераховуються "Аліменти", "Утримання за виконавчими листами"
        calcMethods = ['31', '61']
        reCalcPeriod.forEach(periodSalary => {
          if (periodSalary.ID === periodCalc.ID) {
            const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
            calcMethods.forEach(calcMethod => {
              cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, [calcMethod])
              const alimonyAccr = cont.emp[employeeNumberID].permanentAccrual.filter(o =>
                ((37 & calculateProperty.calcType) ||
                  (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
                cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
                o.source !== 'hr_payPerm' && calcMethod === cont.payEl[o.payElID].method.code // calcMethods.includes(cont.payEl[o.payElID].method.code)
              ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
              if (alimonyAccr.length) {
                if (!cont.emp[employeeNumberID].accrualBalance) {
                  cont.emp[employeeNumberID].accrualBalance = accrualService.getAccrualBalance(employeeNumberID, periodCalc.priorPeriodID)
                }
                const balance = accrualService.getBalanceAccrual(cont, periodSalary.ID) + cont.emp[employeeNumberID].accrualBalance
                const alimonyParams = []
                let fullPlanSum = 0
                alimonyAccr.forEach(perAccr => {
                  const payEl = cont.payEl[perAccr.payElID]
                  if (!payEl.repaymentOnly || perAccr.remindSum > 0) {
                    let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
                    let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
                    if (!(37 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                      perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                      perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
                    }
                    const payTime = algorithmService.getPlanDaysByTimeSheet({
                      timeSheets: timeSheets,
                      dateFrom: periodSalary.dateFrom,
                      dateTo: periodSalary.dateTo,
                      startWork: cont.emp[employeeNumberID].prop.employeeNumber.startWork,
                      finishWork: cont.emp[employeeNumberID].prop.employeeNumber.finishWork,
                      perDateFrom,
                      perDateTo,
                      typeCalcTime: payEl.typeCalcTime
                    })
                    const params = {
                      employeeNumberID: employeeNumberID,
                      payElID: perAccr.payElID,
                      flagsRec: 1
                    }
                    const source = {
                      source: perAccr.source,
                      sourceID: perAccr.ID
                    }
                    const sourceAccr = {
                      perAccr,
                      periodCalc
                    }
                    params.dateFrom = perDateFrom
                    params.dateTo = perDateTo
                    params.rate = perAccr.rate
                    params.calculatedSum = 0
                    const remindSum = (periodSalary.dateFrom < periodCalc.dateFrom ? 0 : perAccr.remindSum) || 0
                    let finishMinSum = null
                    let birthDate = null
                    if (payEl.method.code === '31') {
                      birthDate = perAccr['employeeFamilyID.peopleID.birthDate'] ? dateService.shiftDate(perAccr['employeeFamilyID.peopleID.birthDate']) : null
                      const yearsOldTo = birthDate ? dateService.yearsDiff(birthDate, periodSalary.dateTo) : null
                      const finishMinSize = cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= periodSalary.dateTo)
                      finishMinSum = yearsOldTo !== null ? (yearsOldTo < 6 ? finishMinSize.childrenUnder6 : (yearsOldTo < 18 ? finishMinSize.childrenTo18 : null)) : null
                    }

                    const payElOfftake = cont.payEl[perAccr.payElID].payElEntrySum.filter(o => cont.payEl[o.payElBaseID].method.groupType === 'OFFTAKE' &&
                      o.dateFrom <= periodSalary.dateFrom && o.dateTo >= periodSalary.dateTo && o.payElBaseID !== perAccr.payElID).map(o => o.payElBaseID)
                    const fact = algorithmService.getFactSum({
                      withDetail: true,
                      withIncludPayEl: true,
                      groupType: ['PAYMENT'],
                      cont,
                      payElID: perAccr.payElID,
                      periodCalc: periodSalary,
                      periodSalary,
                      dateFrom: periodSalary.dateFrom,
                      dateTo: periodSalary.dateTo
                    })
                    if (perAccr.rate) {
                      params.basePayment = accrualService.round(Math.max(0, fact.factSum))
                      if (payElOfftake.length && fact.includPayEl.length) {
                        const { includPayEl } = fact
                        const accruals = { [employeeNumberID]: [] }
                        includPayEl.forEach(payEl => {
                          accruals[employeeNumberID].push({
                            periodCalcID: periodSalary.ID,
                            periodSalaryID: periodSalary.ID,
                            periodCalc: periodSalary.dateFrom,
                            periodSalary: periodSalary.dateFrom,
                            employeeNumberID: employeeNumberID,
                            payElID: payEl.payElID,
                            mask: algorithmService.getFillMaskByPeriod(periodSalary.dateFrom, periodSalary.dateTo),
                            paySum: payEl.paySum,
                            dateFrom: periodSalary.dateFrom,
                            dateTo: periodSalary.dateTo,
                            accrualDt: payEl.accrualDt
                          })
                        })
                        const alimonyCont = {
                          org: Object.assign({}, cont.org),
                          payEl: Object.assign({}, cont.payEl),
                          sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
                          payFund: cont.payFund,
                          periods: cont.periods,
                          holidays: cont.holidays,
                          dict: Object.assign({}, cont.dict),
                          emp: { [employeeNumberID]: { prop: Object.assign({}, cont.emp[employeeNumberID].prop) } }

                        }
                        autoCalculate({
                          cont: alimonyCont,
                          orgID,
                          periodID: periodSalary.ID,
                          employeeNumbers: [employeeNumberID],
                          skipCommit,
                          calculateProperty: {
                            calcType: 1 << 4,
                            calculatePayElIDs: payElOfftake,
                            dateFrom: periodSalary.dateFrom,
                            dateTo: periodSalary.dateTo,
                            accrual: accruals
                          }
                        })

                        alimonyCont.emp[employeeNumberID].accrual.forEach(alAccr => {
                          if (payElOfftake.includes(alAccr.payElID)) {
                            fact.factSum = accrualService.round(fact.factSum - alAccr.paySum)
                            if (alAccr.accrualDt && alAccr.accrualDt.length) {
                              alAccr.accrualDt.forEach(dt => {
                                dt.paySum *= -1
                                fact.accrualDt.push(dt)
                              })
                            }
                          }
                        })
                      }
                      params.baseSum = accrualService.round(Math.max(0, fact.factSum))
                      if (params.baseSum < 0) {
                        params.baseSum = 0
                      }
                      params.calculatedSum = accrualService.round(params.baseSum * payTime.perDays / payTime.planDays * perAccr.rate / 100)
                      sourceAccr.accrualDt = fact.accrualDt
                    } else {
                      params.baseSum = accrualService.round(Math.max(0, fact.factSum))
                      params.calculatedSum = perAccr.baseSum || 0
                      params.basePayment = perAccr.baseSum || 0
                      sourceAccr.accrualDt = []
                      // Індексація
                      if (params.calculatedSum > 0) {
                        let startMinSum = null
                        if (payEl.method.code === '31') {
                          const dateIdxFrom = perAccr.dateIdxFrom ? dateService.shiftDate(perAccr.dateIdxFrom) : null
                          const yearsOld = birthDate && dateIdxFrom ? dateService.yearsDiff(birthDate, dateIdxFrom) : null
                          const minSize = dateIdxFrom ? cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= dateIdxFrom) : null
                          startMinSum = minSize !== null ? (yearsOld < 6 ? minSize.childrenUnder6 : (yearsOld < 18 ? minSize.childrenTo18 : null)) : null
                        }
                        params.calculatedSum *= (startMinSum && finishMinSum && finishMinSum > startMinSum) ? finishMinSum / startMinSum : 1
                        params.calculatedSum = accrualService.round(params.calculatedSum * payTime.minWorkDays / payTime.minPlanDays)
                      }
                    }
                    // Граничні розміри
                    if (finishMinSum && params.calculatedSum && perAccr.rate) {
                      const alimonyLimit = payEl.payElAlimonyLimit.find(o => dateService.shiftDate(o.dateFrom) < perAccr.dateFrom)
                      if (alimonyLimit) {
                        if ((alimonyLimit.coefficientMin && finishMinSum * alimonyLimit.coefficientMin * payTime.minWorkDays / payTime.minPlanDays) >
                          params.calculatedSum) {
                          params.calculatedSum = accrualService.round(finishMinSum * alimonyLimit.coefficientMin * payTime.minWorkDays / payTime.minPlanDays)
                        }
                        if (alimonyLimit.coefficientMax && finishMinSum * alimonyLimit.coefficientMax * payTime.minWorkDays / payTime.minPlanDays < params.calculatedSum) {
                          params.calculatedSum = accrualService.round(finishMinSum * alimonyLimit.coefficientMax * payTime.minWorkDays / payTime.minPlanDays)
                        }
                      }
                    }
                    alimonyParams.push({ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr })
                    fullPlanSum = accrualService.round(fullPlanSum + params.calculatedSum + (payEl.repaymentOnly ? 0 : (remindSum || 0)), 2)
                  }
                })
                alimonyParams.forEach(param => {
                  let limitSum = fullPlanSum
                  const dateFrom = dateService.shiftDate(Math.max(periodSalary.dateFrom, param.payEl.dateFrom))
                  const dateTo = dateService.shiftDate(Math.min(periodSalary.dateTo, param.payEl.dateTo))
                  const remindSum = (periodSalary.dateFrom < periodCalc.dateFrom ? 0 : param.sourceAccr.perAccr.remindSum) || 0
                  let entryPayEl = param.payEl.payElEntryMinSum.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
                  if (!entryPayEl.length) {
                    entryPayEl = param.payEl.payElEntrySum.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
                  }
                  const payElOfftakeLim = entryPayEl.filter(o => cont.payEl[o.payElBaseID].method.groupType === 'OFFTAKE' &&
                    o.payElBaseID !== param.payEl.ID).map(o => o.payElBaseID)
                  if (param.payEl.alimonyLessPayment && param.payEl.alimonyLessPayment > 0 && entryPayEl.length) {
                    const fact = algorithmService.getFactSum({
                      withDetail: true,
                      withIncludPayEl: true,
                      groupType: ['PAYMENT'],
                      cont,
                      payElID: param.payEl.ID,
                      periodCalc: periodSalary,
                      periodSalary,
                      payElBase: entryPayEl,
                      dateFrom,
                      dateTo
                    })
                    if (payElOfftakeLim.length && fact.includPayEl.length) {
                      const { includPayEl } = fact
                      const accruals = { [employeeNumberID]: [] }
                      includPayEl.forEach(payEl => {
                        accruals[employeeNumberID].push({
                          periodCalcID: periodSalary.ID,
                          periodSalaryID: periodSalary.ID,
                          periodCalc: periodSalary.dateFrom,
                          periodSalary: periodSalary.dateFrom,
                          employeeNumberID: employeeNumberID,
                          payElID: payEl.payElID,
                          mask: algorithmService.getFillMaskByPeriod(periodSalary.dateFrom, periodSalary.dateTo),
                          paySum: payEl.paySum,
                          dateFrom: periodSalary.dateFrom,
                          dateTo: periodSalary.dateTo,
                          accrualDt: payEl.accrualDt
                        })
                      })
                      const alimonyCont = {
                        org: Object.assign({}, cont.org),
                        payEl: Object.assign({}, cont.payEl),
                        sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
                        payFund: cont.payFund,
                        periods: cont.periods,
                        holidays: cont.holidays,
                        dict: Object.assign({}, cont.dict),
                        emp: { [employeeNumberID]: { prop: Object.assign({}, cont.emp[employeeNumberID].prop) } }

                      }
                      autoCalculate({
                        cont: alimonyCont,
                        orgID,
                        periodID: periodSalary.ID,
                        employeeNumbers: [employeeNumberID],
                        skipCommit,
                        calculateProperty: {
                          calcType: 1 << 4,
                          calculatePayElIDs: payElOfftakeLim,
                          dateFrom: periodSalary.dateFrom,
                          dateTo: periodSalary.dateTo,
                          accrual: accruals
                        }
                      })

                      alimonyCont.emp[employeeNumberID].accrual.forEach(alAccr => {
                        if (payElOfftakeLim.includes(alAccr.payElID)) {
                          fact.factSum = accrualService.round(fact.factSum - alAccr.paySum)
                          if (alAccr.accrualDt && alAccr.accrualDt.length) {
                            alAccr.accrualDt.forEach(dt => {
                              dt.paySum *= -1
                              fact.accrualDt.push(dt)
                            })
                          }
                        }
                      })
                    }
                    limitSum = accrualService.round(Math.min(limitSum, fact.factSum * param.payEl.alimonyLessPayment / 100), 2)
                  }
                  limitSum = accrualService.round(Math.min(limitSum, balance), 2)
                  const maxSum = fullPlanSum ? accrualService.round((param.params.calculatedSum + remindSum) * limitSum / fullPlanSum, 2) : 0

                  param.params.repaymentSum = param.payEl.repaymentOnly ? 0 : accrualService.round(Math.max(Math.min(param.params.calculatedSum, maxSum), 0))

                  param.params.incomingDebtSum = remindSum
                  if (param.payEl.repaymentOnly) {
                    param.params.repaymentDebtSum = accrualService.round(Math.max(Math.min(remindSum, Math.min(param.params.calculatedSum, maxSum)), 0), 2)
                    param.params.calculatedSum = 0
                  } else {
                    param.params.repaymentDebtSum = accrualService.round(Math.max(Math.min(remindSum, maxSum - param.params.repaymentSum), 0), 2)
                  }
                  param.params.mask = algorithmService.getFillMaskByPeriod(param.params.dateFrom, param.params.dateTo)
                  param.calculateProperty = calculateProperty
                  calcSelAlgorithm(param)
                })
              }
            })
          }
        })
      }
      if ((1 << 0 | 1 << 1 | 1 << 3 | 1 << 4 | 1 << 5) & calculateProperty.calcType) {
        // 11 Цикл по періодам які перераховуються "Перерахування за заявою працівника"
        calcMethods = ['62']
        reCalcPeriod.forEach(periodSalary => {
          if (periodSalary.ID === periodCalc.ID) {
            calcMethods.forEach(calcMethod => {
              cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, employeeNumberID, cont, periodSalary, [calcMethod])
              cont.emp[employeeNumberID].permanentAccrual.filter(o =>
                ((37 & calculateProperty.calcType) ||
                  (calculateProperty.calcType & 1 << 4 && calculateProperty.calculatePayElIDs.includes(o.payElID))) &&
                cont.payEl[o.payElID].isAutoCalc && (cont.payEl[o.payElID].isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom) &&
                o.source !== 'hr_payPerm' && calcMethod === cont.payEl[o.payElID].method.code &&
                !cont.emp[employeeNumberID].accrual.find(accr => (accr.periodCalcID === periodCalc.ID || accr.flagsRec & 1 << 2) && accr.periodSalaryID === periodSalary.ID &&
                  accr.payElID === o.payElID && (accr.sourceID === o.ID || !accr.sourceID) && (14 & accr.flagsRec) && !(accr.flagsRec & 4096))
              ).sort((a, b) => cont.payEl[b.payElID].payElEntrySum.find(o => o.payElBaseID === a.payElID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ? -1 : 1)
                .forEach(perAccr => {
                  const payEl = cont.payEl[perAccr.payElID]
                  let perDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, perAccr.dateFrom))
                  let perDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, perAccr.dateTo))
                  if (!(33 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
                    perDateFrom = dateService.shiftDate(Math.max(perDateFrom, calculateProperty.dateFrom))
                    perDateTo = dateService.shiftDate(Math.min(perDateTo, calculateProperty.dateTo))
                  }
                  if (!cont.emp[employeeNumberID].accrualBalance) {
                    cont.emp[employeeNumberID].accrualBalance = accrualService.getAccrualBalance(employeeNumberID, periodCalc.priorPeriodID)
                  }
                  const params = {
                    employeeNumberID: employeeNumberID,
                    payElID: perAccr.payElID,
                    flagsRec: 1
                  }
                  const source = {
                    source: perAccr.source,
                    sourceID: perAccr.ID
                  }
                  const sourceAccr = {
                    perAccr,
                    periodCalc
                  }
                  params.dateFrom = perDateFrom
                  params.dateTo = perDateTo
                  params.mask = algorithmService.getFillMaskByPeriod(perDateFrom, perDateTo)
                  params.rate = (perAccr.rate !== null && perAccr.rate >= 0 && perAccr.source !== 'hr_payPerm') ? perAccr.rate : 0
                  let fact = {}
                  if (perAccr.baseSum) {
                    params.baseSum = perAccr.baseSum
                  } else {
                    if (params.rate > 0) {
                      if (payEl.calcSumType === 'PLAN') {
                        const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
                        const pos = cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= perDateFrom && o.dateTo >= perDateFrom) || {}
                        params.baseSum = algorithmService.getPlanSum(perDateFrom, cont, perAccr, pos)
                        const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo })
                        params.planDays = payTime.planDays
                        params.days = payTime.days
                      } else {
                        fact = algorithmService.getFactSum({
                          withDetail: true,
                          cont,
                          payElID: perAccr.payElID,
                          periodCalc: periodSalary,
                          periodSalary,
                          dateFrom: perDateFrom,
                          dateTo: perDateTo,
                          periodType: payEl.periodType || 'CALC'
                        })
                        params.baseSum = fact.factSum
                        sourceAccr.accrualDt = fact.accrualDt
                      }
                    } else {
                      params.baseSum = 0
                      sourceAccr.accrualDt = []
                    }
                  }
                  if (params.baseSum !== 0) {
                    calcSelAlgorithm({ payEl, params, cont, periodCalc, periodSalary, source, sourceAccr, calculateProperty })
                  }
                })
            })
          }
        })
      }
    }
    // Нарахувань на зарплату (Фонди)
    if ((1 << 0 | 1 << 1 | 1 << 2 | 1 << 3 | 1 << 5 | 1 << 6) & calculateProperty.calcType) {
      const changeCategory = algorithmService.getChangeCategoryECBByPeriods(cont, reCalcPeriod)
      reCalcPeriod.forEach(periodSalary => {
        let perDateTo = dateService.shiftDate(periodSalary.dateTo)
        if (!(97 & calculateProperty.calcType) && periodSalary.ID === periodCalc.ID && calculateProperty.dateFrom && calculateProperty.dateTo) {
          perDateTo = calculateProperty.dateTo
        }
        const accrualFund = []
        let sourceSumAll = 0
        const dayPeriodCount = periodSalary.dateTo.getDate()
        let workDateFrom = dateService.shiftDate(Math.max(cont.emp[employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom))
        let workDateTo = dateService.shiftDate(Math.min(cont.emp[employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo))
        const dayCount = workDateTo.getDate() - workDateFrom.getDate() + 1
        const baseECV = cont.dict.hr_maxBaseECB.find(o => o.dateFrom <= perDateTo) || {}
        const priorFund = []
        const permPayFund = accrualService.getPermanentFund(cont, periodSalary)
        const foundDop = permPayFund.find(o => o.methodCode === '2' && o.isAutoCalc && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
        const foundBase = permPayFund.find(o => o.methodCode === '1' && o.isAutoCalc && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
        let sourceSumAllSec = 0
        if (cont.emp[employeeNumberID].accrualFundSec) {
          cont.emp[employeeNumberID].accrualFundSec.forEach(fund => {
            const payFundP = cont.payFund.find(o => o.ID === fund.payFundID && o.isAutoCalc) || {}
            if (fund.periodSalaryID === periodSalary.ID && !payFundP.isRecSum) {
              sourceSumAllSec = accrualService.round(sourceSumAllSec + fund.sourceSum)
            }
          })
        }
        cont.emp[employeeNumberID].accrualFund.forEach(fund => {
          if (fund.periodSalaryID === periodSalary.ID && fund.periodCalcID !== periodCalc.ID && cont.payFund.find(o => o.ID === fund.payFundID && o.isAutoCalc)) {
            const fFund = priorFund.find(o => o.payFundID === fund.payFundID && o.rate === fund.rate)
            if (!fFund) {
              if (!fund.accrualFundDt || !fund.accrualFundDt.length) {
                fund.accrualFundDt = [{
                  paySum: fund.paySum,
                  sourceSum: fund.sourceSum,
                  baseSum: fund.baseSum
                }]
              }
              priorFund.push(Object.assign({}, fund))
            } else {
              fFund.paySum = accrualService.round(fFund.paySum + fund.paySum, 6)
              fFund.baseSum = accrualService.round(fFund.baseSum + fund.baseSum, 6)
              fFund.sourceSum = accrualService.round(fFund.sourceSum + fund.sourceSum, 6)
              fFund.addMinSum = accrualService.round(fFund.addMinSum + fund.addMinSum, 6)
              if (fund.accrualFundDt && fund.accrualFundDt.length) {
                fund.accrualFundDt.forEach(fundDt => {
                  const accrualFundDt = Object.assign({}, fundDt)
                  delete accrualFundDt.ID
                  fFund.accrualFundDt.push(accrualFundDt)
                })
              } else {
                fFund.accrualFundDt.push({
                  paySum: fund.paySum,
                  sourceSum: fund.sourceSum,
                  baseSum: fund.baseSum
                })
              }
            }
          }
        })
        let minBaseSum = (cont.emp[employeeNumberID].prop.employeeNumber.startWork > periodSalary.dateFrom ||
          cont.emp[employeeNumberID].prop.employeeNumber.finishWork < periodSalary.dateTo
        ) ? 0
          : (baseECV.minSum || 0) * (!(97 & calculateProperty.calcType) ? dayCount / dayPeriodCount : 1)
        if (minBaseSum > 0 && (!foundDop || !foundDop.accrueUnSick)) {
          const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
          if (timeSheets.length && timeSheets[timeSheets.length - 1].factTimeCostID === cont.unconfirmedSickness.ID) {
            const nextMonthDate = dateService.addDays(periodSalary.dateTo, 1)
            const nextPeriod = cont.periods.find(o => o.dateTo >= nextMonthDate && o.dateFrom <= nextMonthDate)
            if (nextPeriod) {
              const nextTimeSheets = algorithmService.getTimeSheetByPeriod(nextPeriod, cont)
              if (nextTimeSheets.length && nextTimeSheets[0].factTimeCostID === cont.unconfirmedSickness.ID && timeSheets.find(o => o.factTimeCostID !== cont.unconfirmedSickness.ID)) {
                minBaseSum = 0
              }
            }
          }
        }
        const maxBaseSum = (cont.emp[employeeNumberID].prop.employeeNumber.finishWork < periodSalary.dateFrom)
          ? (baseECV.maxSum || 0)
          : (baseECV.maxSum || 0) * ((foundBase && foundBase.correctByTime) ? dayCount / dayPeriodCount : 1)
        let existFund = false
        permPayFund.forEach(fund => {
          if (fund.isAutoCalc && ['1'].includes(fund.methodCode) && fund.dateFrom <= periodSalary.dateTo && fund.dateTo >= periodSalary.dateFrom &&
            changeCategory.calcPeriods[periodSalary.ID]
          ) {
            changeCategory.calcPeriods[periodSalary.ID].forEach(catPer => {
              if (catPer.dateFrom <= fund.dateTo && catPer.dateTo >= fund.dateFrom && fund.payFundCategory.find(o => o.dictCategoryECBID === catPer.dictCategoryECBID)) {
                const rate = cont.dict.hr_dictRateTaxECB.find(o => o.dictTypeTaxECBID === fund.typeTaxECBID && o.dateFrom <= catPer.dateFrom &&
                  o.dateTo >= catPer.dateFrom)
                const fact = algorithmService[fund.calcPeriod === 'SALARY' ? 'getFactSum' : 'getFactSumFund'](
                  {
                    withDetail: true,
                    withPayElID: true,
                    cont,
                    periodCalc: fund.calcPeriod === 'SALARY' ? periodSalary : periodCalc,
                    periodSalary,
                    dateFrom: dateService.shiftDate(Math.max(catPer.dateFrom, fund.dateFrom)),
                    dateTo: dateService.shiftDate(Math.min(catPer.dateTo, fund.dateTo)),
                    payElBase: fund.payFundBase,
                    payElExclude: fund.payFundExclude,
                    finishWork: cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork,
                    periodType: fund.calcPeriod
                  })

                const calcFund = accrualFund.find(o => o.payFundID === fund.ID && o.rate === (rate ? rate.rate : 0))

                if (calcFund) {
                  if (fact.factSum > 0) {
                    calcFund.factSum = calcFund.baseSum = calcFund.sourceSum = accrualService.round(calcFund.factSum + fact.factSum, 6)
                    calcFund.accrualFundDt.push(...fact.accrualDt)
                    if (!fund.isRecSum) {
                      sourceSumAll = accrualService.round(sourceSumAll + fact.factSum, 6)
                      existFund = true
                    }
                  }
                } else {
                  const accrFund = {
                    employeeNumberID: employeeNumberID,
                    periodCalcID: periodCalc.ID,
                    periodCalc: periodCalc.dateFrom,
                    periodSalaryID: periodSalary.ID,
                    periodSalary: periodSalary.dateFrom,
                    payFundID: fund.ID,
                    rate: rate ? rate.rate : 0,
                    sourceSum: 0,
                    baseSum: 0,
                    paySum: 0,
                    periodType: fund.calcPeriod
                  }

                  accrFund.factSum = accrFund.baseSum = accrFund.sourceSum = accrualService.round(fact.factSum, 6)
                  accrFund.accrualFundDt = fact.accrualDt
                  // accrFund.baseSum = accrualService.round(accrFund.baseSum, 6)
                  // accrFund.sourceSum = accrualService.round(accrFund.sourceSum, 6)
                  accrFund.addMinSum = 0 // accrualService.round((accrFund.sourceSum < accrFund.baseSum ? accrFund.baseSum - accrFund.sourceSum : 0), 6)
                  accrFund.isRecSum = fund.isRecSum
                  // accrualFundDt
                  if (accrFund.sourceSum !== 0) {
                    if (!fund.isRecSum) {
                      sourceSumAll = accrualService.round(sourceSumAll + accrFund.sourceSum, 6)
                      existFund = true
                    }
                    accrualFund.push(accrFund)
                  }
                }
              }
            })
          }
        })
        let baseSumAll = 0
        //add pdv 20.11.2024
        /*const categoryECB = cont.dict.hr_dictCategoryECB.filter(o => ['1', '25'].includes(o.code)).map(o => o.ID)
        const employeePos = cont.emp[employeeNumberID].prop.employeePositions.find(o =>
          o.workPlace === '1' && categoryECB.includes(o.dictCategoryECBID) &&
          o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)

          if (employeePos && employeePos.mtCount)
          minBaseSum = accrualService.round(minBaseSum * Math.max(0,employeePos.mtCount)>1?1:Math.max(0,employeePos.mtCount),2)
*/
        if (minBaseSum > 0 && (existFund || (!existFund && sourceSumAllSec)) && (sourceSumAll + sourceSumAllSec) < minBaseSum && (97 & calculateProperty.calcType)) {
          const categoryECB = cont.dict.hr_dictCategoryECB.filter(o => ['1', '25'].includes(o.code)).map(o => o.ID)
           const employeePos = cont.emp[employeeNumberID].prop.employeePositions.find(o =>
             o.workPlace === '1' && categoryECB.includes(o.dictCategoryECBID) &&
             o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)

          if (employeePos && periodSalary.dateFrom <= periodCalc.dateFrom) {
            if (foundDop) {
              let timeSheetExcept = false
              if (foundDop.payFundTimeCost.length) {
                const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
                timeSheets.forEach(row => {
                  if (foundDop.payFundTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID)) {
                    timeSheetExcept = true
                  }
                })
              }
              if (!timeSheetExcept) {
                const rate = cont.dict.hr_dictRateTaxECB.find(o => o.dictTypeTaxECBID === foundDop.typeTaxECBID && o.dateFrom <= periodSalary.dateFrom &&
                  o.dateTo >= periodSalary.dateFrom)
                const dopRate = rate ? rate.rate : 0
                let dopBaseSum = accrualService.round(minBaseSum - Math.max(0, sourceSumAll + sourceSumAllSec))
                let dopPaySum = accrualService.round((minBaseSum - Math.max(0, sourceSumAll + sourceSumAllSec)) * (rate ? rate.rate : 0) / 100, 2)
                let accrualFundDt = getAccrualFundDtByBaseSum(foundDop, cont, periodCalc, periodSalary)
                if (!accrualFundDt.length) {
                  const position = cont.emp[cont.employeeNumberID] ? (_.findLast(cont.emp[cont.employeeNumberID].prop.employeePositions, o =>
                    o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom) ||
                        cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1] || {}) : {}
                  if (position && position.fundSources && position.fundSources.length) {
                    accrualFundDt = postingService.correctPosFundSource([{
                      paySum: dopPaySum,
                      sourceSum: 0,
                      baseSum: dopBaseSum
                    }], position.fundSources, position.mtCount, true)
                  }
                }
                /* if (!accrualFundDt.length) {
                  accrualFundDt = getAllAccrualFundDt(accrualFund, periodSalary)
                } */
                accrualFund.push({
                  employeeNumberID: employeeNumberID,
                  periodCalcID: periodCalc.ID,
                  periodCalc: periodCalc.dateFrom,
                  periodSalaryID: periodSalary.ID,
                  periodSalary: periodSalary.dateFrom,
                  payFundID: foundDop.ID,
                  rate: dopRate,
                  sourceSum: 0,
                  baseSum: dopBaseSum,
                  factSum: dopBaseSum,
                  addMinSum: dopBaseSum,
                  paySum: dopPaySum,
                  accrualFundDt: accrualFundDt.length ? accrualFundDt : [{
                    paySum: dopPaySum,
                    sourceSum: 0,
                    baseSum: dopBaseSum
                  }]
                })
              }
            } else {
              const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
              let sourceSumCorrect = Math.max(0, sourceSumAll + sourceSumAllSec)
              let addMinSum = false
              accrualFund.forEach(accrFund => {
                if (accrFund.sourceSum > 0) {
                  let timeSheetExcept = false
                  const payFoundCorrect = cont.payFund.find(o => o.ID === accrFund.payFundID && o.isAutoCalc)
                  if (payFoundCorrect && payFoundCorrect.payFundTimeCost.length) {
                    timeSheets.forEach(row => {
                      if (payFoundCorrect.payFundTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID)) {
                        timeSheetExcept = true
                      }
                    })
                  }
                  if (!timeSheetExcept) {
                    if (payFoundCorrect.addMinSum) {
                      accrFund.correct = true
                    }
                  } else {
                    sourceSumCorrect = accrualService.round(sourceSumCorrect - accrFund.sourceSum, 6)
                  }
                  if (payFoundCorrect.addMinSum) {
                    addMinSum = true
                  }
                }
              })
              if (addMinSum) {
                let corIdx = -1
                accrualFund.forEach((accrFund, idx) => {
                  if (accrFund.correct) {
                    accrFund.baseSum = accrualService.round(accrFund.sourceSum * minBaseSum / sourceSumCorrect, 6)
                    baseSumAll = accrualService.round(baseSumAll + accrFund.baseSum, 6)
                    delete accrFund.correct
                    if (corIdx < 0) {
                      corIdx = idx
                    }
                  } else {
                    baseSumAll = accrualService.round(baseSumAll + accrFund.baseSum, 6)
                  }
                })
                if ((minBaseSum - baseSumAll) !== 0 && accrualFund.length && corIdx >= 0) {
                  accrualFund[corIdx].baseSum = accrualService.round(accrualFund[corIdx].baseSum + minBaseSum - baseSumAll, 6)
                  accrualFund[corIdx].addMinSum = accrualService.round(minBaseSum - baseSumAll, 6)
                }
              }
            }
          }
        } else if (maxBaseSum >= 0 && (sourceSumAll + sourceSumAllSec) > maxBaseSum && (97 & calculateProperty.calcType)) {
          accrualFund.forEach(accrFund => {
            if (accrFund.sourceSum > 0 && !accrFund.isRecSum) {
              accrFund.baseSum = accrualService.round(Math.min(accrFund.sourceSum, (maxBaseSum - sourceSumAllSec) + baseSumAll), 6)
              baseSumAll = accrualService.round(baseSumAll - accrFund.baseSum, 6)
              if (accrFund.baseSum <= 0) {
                accrFund.baseSum = 0
              }
            }
          })
        } else {
          accrualFund.forEach(accrFund => {
            accrFund.baseSum = accrFund.sourceSum
          })
        }
        accrualFund.forEach(accrFund => {
          delete accrFund.isRecSum
          accrFund.paySum = accrualService.round(accrFund.baseSum * accrFund.rate / 100, 6)
          if (accrFund.accrualFundDt) {
            accrFund.accrualFundDt.forEach(row => {
              row.paySum = accrFund.factSum !== 0 ? accrualService.round(row.paySum / accrFund.factSum * accrFund.paySum, 6) : row.paySum
              //pdv 03/12/24 добавил accrualService.round(row.paySum * 100 / accrFund.rate, 6) вместо accrFund.baseSum
              // При расчете доплат до мин 18 код при разных кпк неверно считало сумму, сделал пропорционально суммы
              row.baseSum = accrFund.sourceSum !== 0 ? accrualService.round(row.sourceSum / accrFund.sourceSum * accrFund.baseSum, 6) : accrualService.round(row.paySum * 100 / accrFund.rate, 6)
            })
          }
          const sumFund = priorFund.filter(o => o.payFundID === accrFund.payFundID && o.rate === accrFund.rate &&
            dateService.shiftDate(o.periodCalc) < periodCalc.dateFrom).reduce((sum, accr) => {
            sum.paySum = accrualService.round(sum.paySum + accr.paySum, 6)
            sum.baseSum = accrualService.round(sum.baseSum + accr.baseSum, 6)
            sum.sourceSum = accrualService.round(sum.sourceSum + accr.sourceSum, 6)
            sum.addMinSum = accrualService.round(sum.addMinSum + accr.addMinSum, 6)
            accr.isRecalc = true
            if (accr.accrualFundDt) {
              accr.accrualFundDt.forEach(fDt => {
                const fundDt = Object.assign({}, fDt)
                delete fundDt.ID
                fundDt.paySum = -1 * (fundDt.paySum || 0)
                fundDt.sourceSum = -1 * (fundDt.sourceSum || 0)
                fundDt.baseSum = -1 * (fundDt.baseSum || 0)
                accrFund.accrualFundDt.push(fundDt)
              })
            } else {
              if (accr.paySum !== 0) {
                accrFund.accrualFundDt.push({
                  paySum: accr.paySum,
                  sourceSum: accr.sourceSum,
                  baseSum: accr.baseSum
                })
              }
            }
            return sum
          }, { baseSum: 0, paySum: 0, sourceSum: 0, addMinSum: 0 })
          accrFund.baseSum = accrualService.round(accrFund.baseSum - sumFund.baseSum, 6)
          accrFund.sourceSum = accrualService.round(accrFund.sourceSum - sumFund.sourceSum, 6)
          accrFund.addMinSum = accrualService.round(((accrFund.sourceSum < accrFund.baseSum && (!foundDop || (foundDop && foundDop.ID !== accrFund.payFundID)))
            ? (accrFund.baseSum - accrFund.sourceSum) : accrFund.addMinSum) - sumFund.addMinSum, 6)
          accrFund.paySum = accrualService.round(accrFund.paySum - sumFund.paySum, 6)
          accrFund.accrualFundDt = algorithmService.calcGroupSumAccrualFundDt(accrFund.accrualFundDt, accrFund.paySum)
        })
        priorFund.forEach(pFund => {
          if (!pFund.isRecalc && pFund.periodCalc < periodCalc.dateFrom) {
            const reversalFund = Object.assign({ insert: true }, pFund)
            reversalFund.periodCalcID = periodCalc.ID
            reversalFund.periodCalc = periodCalc.dateFrom
            reversalFund.paySum = -1 * reversalFund.paySum
            reversalFund.addMinSum = -1 * reversalFund.addMinSum
            reversalFund.baseSum = -1 * reversalFund.baseSum
            reversalFund.sourceSum = -1 * reversalFund.sourceSum
            delete reversalFund.ID
            if (reversalFund.accrualFundDt) {
              reversalFund.accrualFundDt.forEach(fundDt => {
                delete fundDt.ID
                fundDt.paySum = -1 * (fundDt.paySum || 0)
                fundDt.sourceSum = -1 * (fundDt.sourceSum || 0)
                fundDt.baseSum = -1 * (fundDt.baseSum || 0)
              })
              reversalFund.accrualFundDt = algorithmService.calcGroupSumAccrualFundDt(reversalFund.accrualFundDt, reversalFund.paySum)
            } else {
              reversalFund.accrualFundDt = [{
                paySum: reversalFund.paySum,
                sourceSum: reversalFund.sourceSum,
                baseSum: reversalFund.baseSum
              }]
            }
            cont.emp[cont.employeeNumberID].accrualFund.push(reversalFund)
          } else {
            delete pFund.isRecalc
          }
        })
        accrualFund.forEach(accrFund => {
          // accrFund.paySum = accrualService.round(accrFund.baseSum * accrFund.rate / 100, 6)
          if (accrFund.paySum !== 0 || accrFund.sourceSum !== 0 || accrFund.baseSum !== 0 || accrFund.addMinSum !== 0) {
            accrFund.insert = true
            cont.emp[cont.employeeNumberID].accrualFund.push(accrFund)
            let rowPaySum = 0
            let rowBaseSum = 0
            if (accrFund.accrualFundDt) {
              accrFund.accrualFundDt.forEach(row => {
                // row.paySum = accrFund.factSum !== 0 ? accrualService.round(row.paySum / accrFund.factSum * accrFund.paySum, 6) : row.paySum
                // row.baseSum = accrFund.sourceSum !== 0 ? accrualService.round(row.sourceSum / accrFund.sourceSum * accrFund.baseSum, 6) : accrFund.baseSum
                rowPaySum = accrualService.round(rowPaySum + row.paySum, 6)
                rowBaseSum = accrualService.round(rowBaseSum + row.baseSum, 6)
              })
            }
            if (accrFund.paySum && accrFund.paySum !== rowPaySum && accrFund.accrualFundDt.length) {
              accrFund.accrualFundDt[0].paySum = accrualService.round(accrFund.accrualFundDt[0].paySum + accrFund.paySum - rowPaySum, 6)
            }
            if (accrFund.baseSum && accrFund.baseSum !== rowBaseSum && accrFund.accrualFundDt.length) {
              accrFund.accrualFundDt[0].baseSum = accrualService.round(accrFund.accrualFundDt[0].baseSum + accrFund.baseSum - rowBaseSum, 6)
            }
            accrFund.accrualFundDt = postingService.getAccrualFundDt({ cont, accrFund, period: periodSalary })

            delete accrFund.factSum
          }
        })
      })
    }

    timeCalc = (new Date()).getTime() - logDate.getTime()
    console.log(`autoCalculate Кінець Розрахунок РЛ ${employeeDescription} - ${timeCalc}`)
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime.timeCalcDt[`розрахунок РЛ`] = timeCalc - (cont.emp[employeeNumberID].logCalcTime.timeCalcDt[`перерахунок документів`] || 0)
      cont.emp[employeeNumberID].logCalcTime.timeCalc += timeCalc
    }
    logDate = new Date()
    secEmpNumIds.forEach(empID => {
      if (cont.emp[empID]) {
        cont.emp[empID].prop = null
        cont.emp[empID].accrual = null
        cont.emp[empID].accrualFund = null
      }
    })
    workPlaceNumIds.forEach(empID => {
      if (cont.emp[empID]) {
        cont.emp[empID].prop = null
        cont.emp[empID].accrual = null
        cont.emp[empID].accrualFund = null
      }
    })
    if (33 & calculateProperty.calcType) {
      saveAutoCalc(cont, periodCalc, employeeNumber, skipCommit)
      if (!cont.countCalc) {
        cont.countCalc = 1
      }

      cont.countCalc++
      if (!returnCalcData &&
        (!cont.emp[employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= periodCalc.dateTo && o.dateTo >= periodCalc.dateFrom && o.workPlace === '2') &&
        cont.emp[employeeNumberID].prop.employeeNumber.empWorkPlace !== '5')) {
        cont.emp[employeeNumberID].accrual = null
        cont.emp[employeeNumberID].accrualAvg = null
        cont.emp[employeeNumberID].prop = null
        cont.emp[employeeNumberID].accrualFund = null
      }
      cont.emp[employeeNumberID].accrualFundSec = null
      cont.emp[employeeNumberID].isCalculate = true
      console.log(`autoCalculate Розраховано ${employeeDescription} - Кількість ${cont.countCalc}`)
    }

    if (calculateProperty.calcType & 1 << 6) {
      cont.emp[employeeNumberID].accrual = null
      cont.emp[employeeNumberID].accrualAvg = null
      cont.emp[employeeNumberID].prop = null
      cont.emp[employeeNumberID].accrualFundSec = null
      delete cont.emp[employeeNumberID].recalcDateTo
      for (let i = cont.emp[employeeNumberID].accrualFund.length - 1; i >= 0; i--) {
        if (!cont.emp[employeeNumberID].accrualFund[i].insert) {
          cont.emp[employeeNumberID].accrualFund.splice(i, 1)
        }
      }
    }

    /* if (cont.countCalc % 300 === 0) {
      console.log(`autoCalculate Початок global.gc()`)
      // global.gc()
      console.log(`autoCalculate Кінець global.gc()`)
    } */
  })
  const stopDate = dateService.currentDateTime()
  if (calculateProperty.calcType & 1 << 0 && !(calculateProperty.calcType & 1 << 12)) {
    try {
      console.log(`autoCalculate Початок розрахунку баланса по організації`)
      logDate = new Date()
      paySummaryService.savePeriodOrgBalance(orgID, periodCalc)
      console.log(`autoCalculate Кінець розрахунок баланса по організації - ${(new Date()).getTime() - logDate.getTime()}`)
    } catch (error) {
      console.error(error)
    }
  }
  return stopDate
}

function saveAutoCalc (cont, periodCalc, employeeNumber, skipCommit) {
  try {
    console.log(`autoCalculate Початок Збереження РЛ`)
    const store = UB.DataStore('hr_employeeNumState')
    const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
    let logDate = new Date()
    const employeeNumberID = typeof employeeNumber !== 'object' ? employeeNumber : employeeNumber.employeeNumberID
    accrualService.removeAutoCalcAccrual({ orgID: cont.orgID, employeeNumberID, periodID: periodCalc.ID })
    accrualService.saveAutoCalcAccrual(cont)
    accrualService.saveAutoCalcAccrualFund(cont)
    const timeCalc = (new Date()).getTime() - logDate.getTime()
    console.log(`autoCalculate Кінець Збереження РЛ ${employeeNumberID} - ${timeCalc}`)
    if (cont.logCalcTime) {
      cont.emp[employeeNumberID].logCalcTime.timeCalcDt[`збереження РЛ`] = timeCalc
      cont.emp[employeeNumberID].logCalcTime.timeCalc += timeCalc
    }
    console.log(`autoCalculate Початок розрахунок баланса працівника ${employeeNumberID}`)
    logDate = new Date()
    cont.emp[cont.employeeNumberID].accrualBalanceOut = accrualService.savePeriodEmpBalance(cont, periodCalc)
    console.log(`autoCalculate Кінець розрахунок баланса працівника ${employeeNumberID} - ${(new Date()).getTime() - logDate.getTime()}`)
    const runQuery = () => {
      if (typeof employeeNumber === 'object') {
        if (!employeeNumber.ID) {
          employeeNumber.ID = UB.Repository('hr_employeeNumState').attrs(['ID'])
            .where('employeeNumberID', '=', employeeNumberID)
            .selectScalar()
        }
        const execParams = {
          ID: employeeNumber.ID,
          mi_modifyDate: employeeNumber.mi_modifyDate,
          flags: 1
        }
        if (cont.logCalcTime && cont.emp[employeeNumberID].logCalcTime) {
          execParams.timeCalc = cont.emp[employeeNumberID].logCalcTime.timeCalc || 0
          execParams.periodCount = cont.emp[employeeNumberID].logCalcTime.periodCount || 0
          execParams.timeCalcDt = JSON.stringify(cont.emp[employeeNumberID].logCalcTime.timeCalcDt || {})
        }
        store.run('update', {
          __skipOptimisticLock: true,
          execParams
        })
      } else {
        const employeeNumStateID = UB.Repository('hr_employeeNumState').attrs(['ID'])
          .where('employeeNumberID', '=', employeeNumberID)
          .selectScalar()
        const execParams = {
          ID: employeeNumStateID,
          flags: 1
        }
        if (cont.logCalcTime && cont.emp[employeeNumberID].logCalcTime) {
          execParams.timeCalc = cont.emp[employeeNumberID].logCalcTime.timeCalc || 0
          execParams.periodCount = cont.emp[employeeNumberID].logCalcTime.periodCount || 0
          execParams.timeCalcDt = JSON.stringify(cont.emp[employeeNumberID].logCalcTime.timeCalcDt || {})
        }
        store.run('update', {
          __skipOptimisticLock: true,
          execParams
        })
      }
    }
    try {
      db.savepointWrap(runQuery)
    } catch (error) {
      console.error(error)
    }
    if (!skipCommit) {
      App.dbCommit()
    }
  } catch (error) {
    console.error(error)
  }
}

function getDefaultAlgorithm (payEl) {
  let algorithm
  switch (payEl.method.code) {
    case '1':
    case '3':
    case '77':
    case '137':
      algorithm = algorithmSalary
      break
    case '2':
      algorithm = algorithmRate
      break
    case '63':
      algorithm = pieceWork
      break
    case '4':
    case '6':
    case '56':
      algorithm = payEl.calcSumType !== 'FACT' ? algorithmSurcharge : algorithmMonthPremium
      break
    case '148':
    case '154':
    case '155':
      algorithm = algorithmSurcharge
      break
    case '5':
      algorithm = algorithmRang
      break
    case '7':
      algorithm = algorithmEvening
      break
    case '8':
    case '153':
    case '207':
      algorithm = algorithmNight
      break
    case '10':
      algorithm = algorithmHoliday
      break
    case '11':
      algorithm = algorithmDayOff
      break
    case '12':
    case '208':
      algorithm = algorithmMonthPremium
      break
    case '24':
      algorithm = algorithmIndexation
      break
    case '25':
      algorithm = algorithmRaisingToMinSalary
      break
    case '26':
      algorithm = algorithmIncomeTax
      break
    case '27':
      algorithm = algorithmMilitaryFee
      break
    case '31':
    case '61':
      algorithm = algorithmAlimony
      break
    case '32':
      algorithm = algorithmTradeUnionFee
      break
    case '33':
      algorithm = algorithmMoreNorm
      break
    case '9':
    case '138':
      algorithm = algorithmOvertime
      break
    case '14':
    case '15':
    case '57':
    case '140':
      algorithm = algorithmVacation
      break
    case '50':
    case '51':
      algorithm = algorithmRaisingToAvgSalary
      break
    case '62':
      algorithm = algorithmRequestEmployee
      break
    case '49':
      algorithm = algorithmRaisingToMinSum
      break
    case '204':
    case '205':
      algorithm = algorithmPaySum
      break
  }
  return algorithm
}

function calcSelAlgorithm ({ payEl, params, cont, periodCalc, periodSalary, maskDays, source, sourceAccr = {}, calculateProperty, algorithm = null }) {
  if (!algorithm) {
    algorithm = getDefaultAlgorithm(payEl)
  }
  if (!periodSalary) {
    periodSalary = periodCalc
  }
  const accrual = Object.assign(algorithm.run({ cont, periodCalc, periodSalary, params, maskDays, sourceAccr }), source)
  if (payEl.ignoreInCalcPay) {
    accrual.flagsRec = accrual.flagsRec | 1 << 13
  }
  if ((accrual.flagsRec & (1 << 15)) && accrual.paySum > 0) {
    cont.emp[cont.employeeNumberID].accrual.push(accrual)
  } else if (payEl.method.code === '31' || payEl.method.code === '61') {
    const alimonyAccrual = cont.emp[cont.employeeNumberID].accrual.find(o => o.payElID === accrual.payElID && o.sourceID === accrual.sourceID &&
      o.source === accrual.source && o.periodSalaryID === accrual.periodSalaryID && !(o.flagsRec & 1))
    if (alimonyAccrual) {
      if (accrual.paySum !== alimonyAccrual.paySum || accrual.calculatedSum !== alimonyAccrual.calculatedSum ||
        accrual.incomingDebtSum !== alimonyAccrual.incomingDebtSum || accrual.baseSum !== alimonyAccrual.baseSum ||
        accrual.repaymentDebtSum !== alimonyAccrual.repaymentDebtSum || accrual.repaymentSum !== alimonyAccrual.repaymentSum) {
        alimonyAccrual.update = true
        alimonyAccrual.basePayment = accrual.basePayment // Сума нарахування з суми Доход
        alimonyAccrual.baseSum = accrual.baseSum // Дохід
        alimonyAccrual.calculatedSum = accrual.calculatedSum // Розраховано за місяць
        alimonyAccrual.incomingDebtSum = accrual.incomingDebtSum // Вхідний залишок
        alimonyAccrual.repaymentSum = Math.min(alimonyAccrual.paySum, accrual.repaymentSum) // Погашено за місяць
        alimonyAccrual.repaymentDebtSum = Math.max(0, alimonyAccrual.paySum - alimonyAccrual.repaymentSum) // Погашення заборгованості
      }
    } else if (accrual.paySum > 0 || accrual.calculatedSum > 0 || accrual.incomingDebtSum > 0 || accrual.baseSum > 0 || accrual.repaymentDebtSum > 0) {
      reduction({ cont, accrual, calculateProperty })
    }
  } else if (accrual.paySum === 0 && ['26', '27'].includes(payEl.method.code)) {
    if (accrual.taxIndividAcc && accrual.taxIndividAcc.find(o => o.taxSum !== 0 || o.incomeSum !== 0 || o.privilegeSum !== 0 || o.taxFreeSum)) {
      reduction({ cont, accrual, calculateProperty })
    }
  } else if (accrual.paySum !== 0 || ['14', '15', '57', '140'].includes(payEl.method.code) ||
    (accrual.calcParams && accrual.calcParams.save)) {
    reduction({ cont, accrual, calculateProperty })
  }
}

function reversal ({ cont, periodCalc, periodSalary, conditionPayEl, recalcOld }) {
  const addReverseAccrual = []
  cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
    const payEl = cont.payEl[accr.payElID]
    
    if (accr.periodSalaryID === periodSalary.ID && payEl.isAutoCalc &&
      ((accr.flagsRec & 1) || (accr.flagsRec & 1 << 3)) && !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 2) && !(accr.flagsRec & 1 << 20) &&
      !(accr.flagsRec & 1 << 1) && (!(accr.flagsRec & 1 << 9) || !accr.linkToParentID) && !accr.orderID &&
      conditionPayEl(payEl, accr.source) && (payEl.isRecalculate || periodSalary.dateFrom >= periodCalc.dateFrom )) {
        if (payEl.code ==='270') {
          let a = 0
        }
      if (recalcOld ) {
        if (accr.periodCalc<dateService.shiftDate('2024-12-01')) return
      }  
      //if (recalcOld) return
      const reversalAccrual = []
      let isCorrect = false
      cont.emp[cont.employeeNumberID].accrual.forEach(o => {
        if (o.linkToParentID === accr.ID &&
          (o.flagsRec & 1 << 9) && !(o.flagsRec & 1 << 12) && (!o.sourceID || (o.sourceID || null) === (accr.sourceID || null))) {
          reversalAccrual.push(o)
        }
        if ((!accr.paymentID || !o.paymentID || accr.paymentID === o.paymentID) && (!o.sourceID || (o.sourceID || null) === (accr.sourceID || null)) &&
            accr.periodSalaryID === o.periodSalaryID && accr.payElID === o.payElID && (o.flagsRec & 1 << 2) && !(o.flagsRec & 1 << 12)) {
          isCorrect = true
        }
      })
      if (!isCorrect) {
        const acc = Object.assign({}, accr)
        let mask = acc.mask || 0
        let maskAdd = acc.maskAdd || 0
        let paySum = acc.paySum
        let baseSum = acc.baseSum || 0
        delete acc.taxIndividAcc
        if (accr.taxIndividAcc && accr.taxIndividAcc.length) {
          acc.taxIndividAcc = []
          accr.taxIndividAcc.forEach(taxIndivud => {
            const taxInd = Object.assign({}, taxIndivud)
            delete taxInd.ID
            delete taxInd.accrualID
            taxInd.taxSum *= -1
            taxInd.incomeSum *= -1
            taxInd.taxFreeSum *= -1
            taxInd.privilegeSum *= -1
            acc.taxIndividAcc.push(taxInd)
          })
        }
        delete acc.accrualDt
        if (accr.accrualDt && accr.accrualDt.length) {
          acc.accrualDt = []
          accr.accrualDt.forEach(dt => {
            const aDt = Object.assign({}, dt)
            delete aDt.ID
            delete aDt.accrualID
            aDt.paySum *= -1
            acc.accrualDt.push(aDt)
          })
        } else {
          acc.accrualDt = [{ paySum: -1 * acc.paySum }]
        }
        reversalAccrual.forEach(rev => {
          mask = mask & ~(rev.mask || 0)
          maskAdd = maskAdd & ~(rev.maskAdd || 0)
          paySum = accrualService.round(paySum + rev.paySum)
          baseSum = accrualService.round(baseSum + rev.baseSum)
          if (rev.accrualDt && rev.accrualDt.length) {
            rev.accrualDt.forEach(dt => {
              const aDt = Object.assign({}, dt)
              delete aDt.ID
              delete aDt.accrualID
              aDt.paySum *= -1
              acc.accrualDt.push(aDt)
            })
          }
          if (rev.taxIndividAcc && rev.taxIndividAcc.length) {
            rev.taxIndividAcc.forEach(taxIndivud => {
              const taxIndividEx = acc.taxIndividAcc ? acc.taxIndividAcc.find(o => o.taxIndividID === taxIndivud.taxIndividID) : null
              if (taxIndividEx) {
                taxIndividEx.taxSum = accrualService.round(taxIndividEx.taxSum + (-1 * taxIndivud.taxSum))
                taxIndividEx.incomeSum = accrualService.round(taxIndividEx.incomeSum + (-1 * taxIndivud.incomeSum))
                taxIndividEx.taxFreeSum = accrualService.round(taxIndividEx.taxFreeSum + (-1 * taxIndivud.taxFreeSum))
                taxIndividEx.privilegeSum = accrualService.round(taxIndividEx.privilegeSum + (-1 * taxIndivud.privilegeSum))
              } else {
                const taxInd = Object.assign({}, taxIndivud)
                delete taxInd.ID
                delete taxInd.accrualID
                taxInd.taxSum *= -1
                taxInd.incomeSum *= -1
                taxInd.taxFreeSum *= -1
                taxInd.privilegeSum *= -1
                acc.taxIndividAcc.push(taxInd)
              }
            })
          }
        })
        let isAdd = Math.abs(paySum) >= 0.01 || reversalAccrual.length === 0
        if (!isAdd && acc.taxIndividAcc && acc.taxIndividAcc.length) {
          acc.taxIndividAcc.forEach(accAvg => {
            if (accAvg.taxSum !== 0 || accAvg.incomeSum !== 0 || accAvg.privilegeSum !== 0) {
              isAdd = true
            }
          })
        }
        if (isAdd) {
          acc.insert = true
          acc.periodCalcID = periodCalc.ID
          acc.periodCalc = periodCalc.dateFrom
          acc.linkToParentID = acc.ID
          acc.mask = mask
          acc.flagsRec = (((acc.flagsRec | 1 << 9) & ~(1 << 3)) | 1)
          acc.paySum = -1 * paySum
          acc.baseSum = -1 * baseSum
          acc.calculateDate = dateService.currentDateTime()
          acc.planHours = acc.planHours ? -1 * acc.planHours : acc.planHours
          acc.planDays = acc.planDays ? -1 * acc.planDays : acc.planDays
          acc.days = acc.days ? -1 * acc.days : acc.days
          acc.hours = acc.hours ? -1 * acc.hours : acc.hours
          if (accr.flagsRec & 1 << 3) {
            acc.importAccrual = true
            if (!!acc.hours && !(acc.flagsRec & 1 << 5)) {
              const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= acc.dateFrom && o.dateTo >= acc.dateFrom)
              acc.flagsRec = acc.flagsRec | ((pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY') ? 1 << 5 : 0)
            }
          }
          delete acc.accrualAvg
          if (accr.accrualAvg && accr.accrualAvg.length) {
            acc.accrualAvg = []
            accr.accrualAvg.forEach(accAvg => {
              const avg = Object.assign({}, accAvg)
              delete avg.ID
              delete avg.accrualID
              acc.accrualAvg.push(avg)
            })
          }
          delete acc.ID
          addReverseAccrual.push(acc)
        }
      }
    }
  })
  cont.emp[cont.employeeNumberID].accrual.push(...addReverseAccrual)
}

function reduction ({ cont, accrual, calculateProperty }) {
  if (33 & calculateProperty.calcType) {
    const reversalAccruals = []
    const reversalIndexes = []
    const reversalParent = []
    cont.emp[cont.employeeNumberID].accrual.forEach((o, idx) => {
      if (o.linkToParentID && o.payElID === accrual.payElID && o.periodSalaryID === accrual.periodSalaryID &&
        o.periodCalcID === accrual.periodCalcID && !(o.flagsRec & 200704) &&
        (!o.sourceID || (o.sourceID || null) === (accrual.sourceID || null)) &&
        (!accrual.paymentID || !o.paymentID || accrual.paymentID === o.paymentID)

      ) {
        if ((o.importAccrual && Math.abs((o.paySum || 0) + (accrual.paySum || 0)) <= 0.01) ||
          (Math.abs((o.rate || 0) - (accrual.rate || 0)) <= 0.01 &&
            Math.abs((o.koef || 0) - (accrual.koef || 0)) <= 0.01 &&
            (cont.payEl[accrual.payElID].method.groupType !== 'PAYMENT' ||
              (/* o.mask === accrual.mask && */
                Math.abs((o.planHours || 0) + (accrual.planHours || 0)) <= 0.01 &&
                Math.abs((o.planDays || 0) + (accrual.planDays || 0)) <= 0.01 &&
                Math.abs((o.days || 0) + (accrual.days || 0)) <= 0.01 &&
                Math.abs((o.hours || 0) + (accrual.hours || 0)) <= 0.01
              )))) {
          reversalAccruals.push(o)
          reversalIndexes.push(idx)
        } else {
          reversalParent.push(o)
        }
      }
    })
    if (reversalAccruals.length) {
      if (!accrualService.calcReversalAccrual(cont, accrual, reversalAccruals)) {
        accrual.calculateDate = dateService.currentDateTime()
        accrual.insert = true
        accrual.flagsRec = (accrual.flagsRec || 0) | 1 << 10
        accrual.linkToParentID = reversalAccruals[0].linkToParentID
        cont.emp[cont.employeeNumberID].accrual.push(accrual)
      }
      for (let i = reversalIndexes.length - 1; i >= 0; i--) {
        cont.emp[cont.employeeNumberID].accrual.splice(reversalIndexes[i], 1)
      }
    } else {
      if (reversalParent.length) {
        accrual.linkToParentID = reversalParent[0].linkToParentID
      }
      accrual.calculateDate = dateService.currentDateTime()
      if (accrual.insert !== false) {
        accrual.insert = true
      }
      cont.emp[cont.employeeNumberID].accrual.push(accrual)
    }
  } else {
    cont.emp[cont.employeeNumberID].accrual.push(accrual)
  }
}

function getMinPeriodSalary (accrual) {
  let minPeriodSalary = accrual[0].periodSalary.getTime()
  for (let i = 1; i < accrual.length; i++) {
    let periodSalaryTime = accrual[i].periodSalary.getTime()
    if (periodSalaryTime < minPeriodSalary) {
      minPeriodSalary = periodSalaryTime
    }
  }
  return dateService.shiftDate(minPeriodSalary)
}

function checkAndLoadTimeSheet (cont, employeeNumberID) {
  if (cont.emp[employeeNumberID].accrual.length) {
    let minPeriodSalary = getMinPeriodSalary(cont.emp[employeeNumberID].accrual)
    if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.timeSheets && cont.emp[employeeNumberID].prop.timeSheetDateFrom) {
      if (cont.emp[employeeNumberID].prop.timeSheetDateFrom.getTime() > minPeriodSalary.getTime()) {
        employeeService.loadEmployeeTimeSheet({ cont, empNumbers: [employeeNumberID], dateFrom: dateService.shiftDate(minPeriodSalary), dateTo: dateService.addDays(cont.emp[employeeNumberID].prop.timeSheetDateFrom, -1) })
        cont.emp[employeeNumberID].prop.timeSheetDateFrom = minPeriodSalary
      }
    }
  }
}

function calculateAccrual({ orgID, payElParams, periodCalcID, periodSalaryID, orderParams = {} }) {
  const timService = require('./timService')
  const cont = {}
  const result = []
  cont.orgID = orgID
  // Дані організації
  cont.org = orgService.getOrgData(orgID)
  // Види оплат
  if (!cont.constants) {
    cont.constants = orgService.getOrgConstant(orgID)
  }
  cont.payEl = payElService.getPayEl({ orgID })
  // Встановлення записів довідників (наприклад: cont.dict.hr_dictLivingCost )
  contService.initDict(cont)
  // Дані періодів
  let periodCalc = periodCalcID ? periodService.getPeriod(periodCalcID) : null
  let periodSalary = periodSalaryID ? periodService.getPeriod(periodSalaryID) : null
  let dateTo = periodSalaryID ? periodSalary.dateTo : null
  let dateFrom = periodSalaryID ? dateService.addMonths(periodSalary.dateFrom, -13) : null
  cont.periodCalc = periodCalc
  let balances = []
  const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  if (orderParams && orderParams.checkBalance) {
    const employeeNumbers = payElParams.map(o => o.employeeNumberID)
    if (employeeNumbers.length) {
      balances = UB.Repository('hr_accrualBalance')
        .attrs('SUM([sumTo])', 'employeeNumberID')
        .where('employeeNumberID', 'in', employeeNumbers)
        .where('periodCalcID', '=', periodCalc.ID)
        .where('dictFundSourceID', 'notIn', dictFundSourceFSSU.length ? dictFundSourceFSSU : [0], 'fundin')
        .where('dictFundSourceID', 'isNull', undefined, 'fundnull')
        .logic('([fundin] OR [fundnull])')
        .groupBy('employeeNumberID')
        .selectAsObject({
          'SUM([sumTo])': 'balance'
        })
    }
  }
  const deptIDs = orderParams ? accrualService.getDepIDs(orderParams) : null
  payElParams.forEach(payElParam => {
    if (!payElParam.payElID) {
      return
    }
    const payEl = cont.payEl[payElParam.payElID]
    if (payEl.ignoreInCalcPay) {
      payElParam.flagsRec = payElParam.flagsRec | 1 << 13
    }
    if (payElParam.idx === undefined) {
      payElParam.idx = 1
    }
    if (!periodCalcID) {
      periodCalc = periodService.getPeriod(payElParam.periodCalcID)
      cont.periodCalc = periodCalc
    }
    if (!cont.periods) {
      cont.periods = periodService.getArrayPeriods(orgID, dateService.addMonths(periodSalaryID ? periodSalary.dateFrom : periodCalc.dateFrom, -24))
    }
    if (payElParam.periodSalaryID) {
      periodSalary = periodService.getPeriod(payElParam.periodSalaryID)
      dateTo = periodSalary.dateTo
      dateFrom = dateService.addMonths(periodSalary.dateFrom, -24)
    }
    cont.emp = { [payElParam.employeeNumberID]: {} }
    cont.employeeNumberID = payElParam.employeeNumberID

    // Дані працівника (призначення, нарахування, табель)
    cont.emp[cont.employeeNumberID].prop = employeeService.getEmpData(payElParam.employeeNumberID, dateFrom, dateTo)
    if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) {
      return
    }
    // Нарахування за останні -13 періодів (в період (periodID) без автоматично розрахованих записів)
    cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, payElParam.employeeNumberID, dateFrom)
    if (cont.emp[cont.employeeNumberID].prop && cont.emp[cont.employeeNumberID].prop.parentEmpNumbers) {
      cont.emp[cont.employeeNumberID].prop.parentEmpNumbers.forEach(parent => {
        const accruals = accrualService.getAccrual(parent.orgID, parent.employeeNumberID, dateFrom)
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
      })
    }
    
    checkAndLoadTimeSheet(cont, cont.employeeNumberID)

    // Постійні нарахування
    cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, payElParam.employeeNumberID, cont, periodSalary)
    // Розраховані види оплат групи Система оплати
    cont.emp[cont.employeeNumberID].salaryRl = getSalaryFromRl({ cont, periodSalary })
    const params = Object.assign(payElParam, {
      orgID: orgID,
      employeeNumberID: payElParam.employeeNumberID,
      payElID: payElParam.payElID,
      dateFrom: payElParam.dateFrom ? dateService.shiftDate(payElParam.dateFrom) : periodSalary.dateFrom,
      dateTo: payElParam.dateTo ? dateService.shiftDate(payElParam.dateTo) : periodSalary.dateTo
    })

    const permanentAccruals = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, { dateFrom: params.dateFrom, dateTo: params.dateTo }, null, [params.payElID])
    const permanentAccrual = permanentAccruals.length ? permanentAccruals[0] : {}

    cont.holidays = calendarService.getHolidays(dateService.addYears(params.dateFrom, -3), dateService.addMonths(params.dateTo, 12), orgID)
    const sourceAccr = {
      perAccr: payElParam.sourceID ? cont.emp[cont.employeeNumberID].permanentAccrual.find(o => o.ID === payElParam.sourceID) : null,
      periodCalc
    }

    if (!params.flagsFix) {
      params.flagsFix = 0
    }
    if (!params.flagsRec) {
      params.flagsRec = 0
    }
    if (params.fromExtraPay) {
      const isNeedCalc = UB.Repository('hr_employeeNumState')
        .attrs(['employeeNumberID'])
        .where('flags', '=', 0)
        .where('employeeNumberID', '=', params.employeeNumberID)
        .limit(1)
        .selectSingle()
      if (isNeedCalc) {
        autoCalculate({
          cont,
          orgID,
          periodID: periodCalcID,
          employeeNumbers: [params.employeeNumberID],
          returnCalcData: true,
          skipCommit: true
        })
      }
    }
    let isSummarized = false
    const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dateFrom <= params.dateFrom && pos.dateTo >= params.dateFrom)
    const workSchedule = position ? cont.dict.hr_workSchedule.find(o => o.ID === position.workScheduleID) : null
    if (cont.payEl[params.payElID].method.groupCode === 1) {
      if (workSchedule && workSchedule.isSummarized) {
        isSummarized = true
      }
    }
    const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= periodSalary.dateFrom && o.dateWork <= periodSalary.dateTo)
    if (['4', '5', '6', '24', '33'].includes(payEl.method.code) && payEl.calcSumType !== 'FACT') {
      if (workSchedule && workSchedule.isSummarized &&
        !cont.payEl[params.payElID].payElEntryTime.find(e => cont.payEl[e.payElBaseID].method.code === '138' && e.dateFrom <= params.dateTo && e.dateTo >= params.dateFrom)) {
        isSummarized = true
      }
    }
    let payTime =
      (['4', '5', '6', '9', '33', '148', '154', '155'].includes(payEl.method.code) && payEl.calcSumType !== 'FACT')
        ? algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
        : (['4', '6'].includes(payEl.method.code) && payEl.calcSumType === 'FACT')
          ? algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
          : (payEl.method.code !== '49' || payEl.isNormMinSum)
            ? algorithmService.getTimeByTimeSheet({
              cont,
              payElID: params.payElID,
              timeSheets,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              isSummarized,
              useIsFactHour: payEl.method.code === '137',
              planByNorm: !!['1', '2', '4', '12', '24', '25', '49', '63', '77', '146', '147', '156'].includes(payEl.method.code)
            })
            : algorithmService.getTimeForMinSum({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, calcProportion: (position && position.payElID) ? cont.payEl[position.payElID].useTimeSheetBy : 'NORMA' })
    if (!params.fromExtraPay) {
      params.flagsRec = params.flagsRec | ((!payTime.fullTime || (position && position.payElID && cont.payEl[position.payElID].calcProportion !== 'DAY')) ? 1 << 5 : 0)
    }
    if (!params.fromExtraPay && ['7', '8', '10', '11', '56', '153', '207', '33'].includes(payEl.method.code)) {
      const workSchedule = position ? cont.dict.hr_workSchedule.find(o => o.ID === position.workScheduleID) : null
      Object.assign(payTime, algorithmService.getPayTimeByPayEl(cont, params.payElID, payTime.mask, timeSheets, params.dateFrom, params.dateTo, workSchedule, params.periodSalaryID))
      if (['7', '8', '10', '11', '153', '207', '33'].includes(payEl.method.code) && workSchedule && position) {
        if (payEl.normTimeBy === 'AVERAGE') {
          const workScheduleID = (payEl.useTimeSheetBy === 'PLAN' ? workSchedule.planScheduleID : workSchedule.normScheduleID) || workSchedule.ID
          const planTime = algorithmService.getPlanTime(orgID, workScheduleID, dateService.firstDayOfYear(params.dateFrom), dateService.lastDayOfYear(params.dateFrom), cont)
          let mtCount = workSchedule.isMtCount ? (position.mtCount || 1) : 1
          if (workSchedule.maxMtCount) {
            mtCount = Math.min(workSchedule.maxMtCount, mtCount)
          }
          if (workScheduleID !== workSchedule.ID) {
            const planWorkSchedule = cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID)
            if (planWorkSchedule && planWorkSchedule.maxMtCount) {
              mtCount = Math.min(planWorkSchedule.maxMtCount, mtCount)
            }
          }
          params.planHours = accrualService.round(planTime.hours * mtCount / 12, 4)
          params.planDays = accrualService.round(planTime.days / 12, 2)
          if (payEl.maxMtCount) {
            params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
          }
        } else if (timeSheets) {
          const timeSheetOnDay = timeSheets.find(o => o.dateWork.getTime() === params.dateFrom.getTime())
          if (timeSheetOnDay) {
            params.planHours = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthHour`]
            params.planDays = timeSheetOnDay[`${payEl.useTimeSheetBy === 'PLAN' ? 'plan' : 'norm'}MonthDay`]
          }
        }
      }
    }

    params.planDays = ((params.flagsFix & 1 << 4) || (params.flagsFix & 1 << 5)) ? params.planDays : payTime.planDays
    params.planHours = ((params.flagsFix & 1 << 4) || (params.flagsFix & 1 << 5)) ? params.planHours : payTime.planHours
    if (payEl.method.code === '9' && !params.fromExtraPay) {
      let overDays = 0
      let overHours = 0
      let overMask = 0
      for (let day = params.dateFrom.getDate(); day <= params.dateTo.getDate(); day++) {
        overDays += (payTime.hoursByDays[String(day)] > 0 ? (payTime.planHoursByDays[String(day)] > 0 &&
          payTime.hoursByDays[String(day)] !== payTime.planHoursByDays[String(day)] ? 1 : 0) : 0)
        overHours += ((payTime.planHoursByDays[String(day)] > 0 && payTime.hoursByDays[String(day)] > 0 &&
          payTime.hoursByDays[String(day)] !== (payTime.planHoursByDays[String(day)]))
          ? payTime.hoursByDays[String(day)] - (payTime.planHoursByDays[String(day)])
          : 0)
        if (payTime.planHoursByDays[String(day)] > 0 && payTime.hoursByDays[String(day)] > 0 &&
          payTime.hoursByDays[String(day)] !== payTime.planHoursByDays[String(day)]) {
          overMask = overMask | 1 << (day - 1)
        }
      }
      params.days = ((params.flagsFix & 1 << 6) || (params.flagsFix & 1 << 7)) ? params.days : overDays
      params.hours = ((params.flagsFix & 1 << 6) || (params.flagsFix & 1 << 7)) ? params.hours : overHours
      params.mask = overMask
    } else {
      if (params.fromExtraPay && !((params.flagsFix & 1 << 6) || (params.flagsFix & 1 << 7))) {
        const calcTime =
          (['4', '5', '6', '9', '33', '148', '154', '155'].includes(payEl.method.code) && payEl.calcSumType !== 'FACT')
            ? algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFromCalc, params.dateToCalc)
            : (['4', '6'].includes(payEl.method.code) && payEl.calcSumType === 'FACT')
              ? algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFromCalc, params.dateToCalc)
              : algorithmService.getTimeByTimeSheet({
                cont,
                payElID: params.payElID,
                timeSheets,
                dateFrom: params.dateFromCalc,
                dateTo: params.dateToCalc,
                isSummarized: true,
                useIsFactHour: payEl.method.code === '137'
              })
        params.days = calcTime.days
        params.hours = calcTime.hours
        if ((!params.mask && !(params.flagsFix & 1 << 6) && !(params.flagsFix & 1 << 7)) ||
          (params.mask && params.mask > algorithmService.getFillMaskByPeriod(params.dateFromCalc, params.dateToCalc))) {
          params.mask = payTime.mask
        }
      } else {
        params.days = ((params.flagsFix & 1 << 6) || (params.flagsFix & 1 << 7)) ? params.days : payTime.days
        params.hours = ((params.flagsFix & 1 << 6) || (params.flagsFix & 1 << 7)) ? params.hours : payTime.hours
        if ((!params.mask && !(params.flagsFix & 1 << 6) && !(params.flagsFix & 1 << 7)) ||
          (params.mask && params.mask > algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo))) {
          params.mask = payTime.mask
        }
      }
    }

    let unpaid = {}
    switch (payEl.method.code) {
      case '1':
      case '77': {
        const pos = params.sourceID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.ID === params.sourceID)
          : position
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = pos ? pos.mtCount : 1
        }
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = pos ? pos.accrualSum : 0
        }
        result.push(Object.assign(algorithmSalary.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '2': {
        const pos = params.sourceID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.ID === params.sourceID)
          : position
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = pos ? pos.mtCount : 1
        }
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = pos ? pos.accrualSum : 0
        }
        if (cont.payEl[params.payElID].calcProportion === 'HOUR') {
          params.flagsRec = params.flagsRec | 1 << 5
        }
        result.push(Object.assign(algorithmRate.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '63': {
        const pos = params.sourceID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.ID === params.sourceID)
          : position
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = pos ? pos.mtCount : 1
        }
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = pos ? pos.accrualSum : 0
        }
        result.push(Object.assign(pieceWork.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '146':
      case '156':
      case '147': {
        const pos = params.sourceID ? cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.ID === params.sourceID)
          : position
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = pos ? pos.mtCount : 1
        }
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = UB.Repository('trf_accrual')
            .attrs(['SUM([accrualSum])'])
            .where('payElID', '=', params.payElID)
            .where('positionID.workPlaceID.employeeNumberID', '=', cont.employeeNumberID)
            .where('positionID.workPlaceID.state', '=', 'POSTED')
            .where('positionID.workPlaceID.documentID.type', '=', 'FACT')
            .where('positionID.workPlaceID.dateFrom', '<=', params.dateTo)
            .where('positionID.workPlaceID.dateTo', '>=', params.dateFrom)
            .selectScalar() || 0
        }
        params.flagsRec = params.flagsRec | 1 << 5
        result.push(Object.assign(algorithmSalary.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '137': {
        if (cont.payEl[params.payElID].calcTimeProportion === 'HOUR' ||
          (cont.payEl[params.payElID].calcTimeProportion === 'SALARY' && position.payElID && cont.payEl[position.payElID].calcProportion === 'HOUR')) {
          params.flagsRec = params.flagsRec | 1 << 5
        }
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = position ? position.mtCount : 1
          if (payEl.maxMtCount) {
            params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
          }
        }
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, {
            payElID: params.payElID,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            fromExtraPay: !!params.fromExtraPay
          }, position) +
            algorithmService.getFactForPlanSum({
              cont,
              payElID: params.payElID,
              periodCalc: periodSalary,
              periodSalary,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo
            })
        }
        if (!(params.flagsFix & 1 << 9)) {
          params.rate = permanentAccrual.rate || payEl.rate
        }
        result.push(Object.assign(algorithmSalary.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '14':
      case '15':
      case '57':
      case '140':
        params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
        params.days = (params.mask.toString(2).match(/1/g) || []).length
        result.push(Object.assign(algorithmVacation.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '151':
        result.push(Object.assign(algorithmPaySum.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '138': {
        const pos = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, params.dateFrom, params.dateTo)
        const payTime = algorithmService.getTimeByTimeSheetOvertime(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo, cont.payEl[params.payElID].periodSummarized)
        params.days = 0
        params.mask = payTime.mask
        if (!(params.flagsFix & 1 << 0)) {
          params.baseSum = pos ? pos.accrualSum : 0
        }
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = pos ? pos.mtCount : 1
        }
        if (!(params.flagsFix & 1 << 7)) {
          params.hours = Math.max(0, payTime.overtime)
        }
        params.flagsRec = params.flagsRec | 1 << 5
        if (!(params.flagsFix & 1 << 9)) {
          params.rate = permanentAccrual.rate
        }
        result.push(Object.assign(algorithmOvertime.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '10':
      case '11':
      case '24':
      case '25':
      case '49':
      case '33':
      case '9':
      case '56':
      case '148':
      case '153':
      case '154':
      case '155':
      case '207':
        if ((payEl.calcSumType !== 'FACT' && payEl.method.code !== '25' && payEl.method.code !== '49') || payEl.method.code === '33') {
          const accr = (params.paymentID
            ? cont.emp[cont.employeeNumberID].salaryRl.find(o => o.sourceID === params.paymentID)
            : (cont.emp[cont.employeeNumberID].salaryRl.find(o => dateService.shiftDate(o.dateFrom) <= params.dateTo && dateService.shiftDate(o.dateTo) >= params.dateFrom && o.paySum !== 0 && o.payElID === (position || {}).payElID) ||
              cont.emp[cont.employeeNumberID].salaryRl.find(o => dateService.shiftDate(o.dateFrom) <= params.dateTo && dateService.shiftDate(o.dateTo) >= params.dateFrom && o.paySum !== 0)
            )) ||
            cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom) || {}
          sourceAccr.leadAccr = Object.keys(accr).length ? accr : null
          if (!(params.flagsFix & 1 << 0)) {
            let baseSum
            if (['4', '7', '8', '9', '10', '11', '153', '207'].includes(payEl.method.code)) {
              if (!(params.flagsFix & 1 << 9)) {
                baseSum = permanentAccrual.baseSum || null
                if (!baseSum) {
                  params.rate = (payEl.isIndividualRate ? null : permanentAccrual.rate) || null
                } else {
                  params.baseSum = baseSum
                }
              }
            }

            if (!baseSum) {
              if (['4', '6', '7', '8', '10', '11', '24', '56', '153', '207'].includes(payEl.method.code) || (payEl.method.code === '9' && params.fromExtraPay)) {
                if (payEl.method.code === '4' && payEl.calcSumType === 'MIN') {
                  const minSalaryRec = cont.dict.hr_dictSalaryMinSize.find(o => o.dateFrom <= periodSalary.dateFrom)
                  params.baseSum = minSalaryRec ? minSalaryRec.monthValue : 0
                } else {
                  params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, {
                    payElID: params.payElID,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo,
                    fromExtraPay: !!params.fromExtraPay
                  }, accr) +
                    algorithmService.getFactForPlanSum({
                      cont,
                      payElID: params.payElID,
                      periodCalc: periodSalary,
                      periodSalary,
                      dateFrom: params.dateFrom,
                      dateTo: params.dateTo
                    })
                }
                if (payEl.method.code === '6') {
                  if (permanentAccrual.limitSum) {
                    params.baseSum = Math.min(params.baseSum, permanentAccrual.limitSum)
                  }
                }
              } else if (payEl.method.code === '5') {
                const salaryRank = cont.emp[cont.employeeNumberID].prop.salaryRank.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom)
                params.baseSum = permanentAccrual.baseSum ? permanentAccrual.baseSum : (salaryRank ? salaryRank.paySum : 0)
              } else if (payEl.method.code === '33') {
                const missCont = {}
                if (['1', '2'].includes(payEl.calcAlgorithm) && (params.missingEmployeeNumberID || permanentAccrual.missingEmployeeNumberID)) {
                  missCont.orgID = cont.orgID
                  missCont.org = cont.org
                  missCont.periods = cont.periods
                  missCont.payEl = cont.payEl
                  missCont.dict = cont.dict
                  missCont.emp = {}
                  missCont.employeeNumberID = params.missingEmployeeNumberID || permanentAccrual.missingEmployeeNumberID
                  missCont.emp[missCont.employeeNumberID] = {}
                  missCont.emp[missCont.employeeNumberID].prop = employeeService.getEmpData(missCont.employeeNumberID, periodSalary.dateFrom, periodSalary.dateTo)
                  missCont.emp[missCont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, missCont.employeeNumberID, missCont, periodSalary,
                    ['4', '5', '6', '7', '8', '10', '11', '24', '33', '9', '153', '207'])
                }
                params.missingEmployeeNumberID = params.missingEmployeeNumberID || permanentAccrual.missingEmployeeNumberID || null
                if (!(params.flagsFix & 1 << 9)) {
                  params.rate = params.rate || (payEl.isIndividualRate ? null : permanentAccrual.rate)
                }
                const permAccr = {
                  payElID: params.payElID,
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo
                }

                if (!(params.flagsFix & 1 << 8)) {
                  params.mtCount = position ? position.mtCount : 1
                  if (payEl.maxMtCount) {
                    params.mtCount = Math.min(payEl.maxMtCount, params.mtCount)
                  }
                }
                switch (payEl.calcAlgorithm) {
                  case '1': { // Різниця заробітку відсутнього і заміщаючого працівників
                    params.rate = null
                    if (!(params.flagsFix & 1 << 0) && (params.missingEmployeeNumberID || permanentAccrual.missingEmployeeNumberID)) {
                      const missAccr = missCont.emp[missCont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
                      const missPlanSum = missAccr ? algorithmService.getPlanSum(params.dateFrom, missCont, permAccr, missAccr || {}) * (missAccr ? (missAccr.mtCount || 1) : 1) : 0
                      const currPlanSum = algorithmService.getPlanSum(params.dateFrom, cont, permAccr, position || {}) * (position ? (position.mtCount || 1) : 1)
                      params.baseSum = Math.max(0, missPlanSum - currPlanSum)
                    }
                    break
                  }
                  case '2': { // Відсоток від заробітку відсутнього працівника
                    if (!(params.flagsFix & 1 << 0) && (params.missingEmployeeNumberID || permanentAccrual.missingEmployeeNumberID)) {
                      const missAccr = missCont.emp[missCont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
                      params.baseSum = missAccr ? (algorithmService.getPlanSum(params.dateFrom, missCont, permAccr, missAccr || {}) * (missAccr ? (missAccr.mtCount || 1) : 1)) : 0
                    }
                    break
                  }
                  case '3': { // Відсоток від заробітку заміщаючого працівника
                    if (!(params.flagsFix & 1 << 0)) {
                      params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, permAccr, position || {}) * (position ? (position.mtCount || 1) : 1)
                    }
                    break
                  }
                  case '4': { // Відсоток від суми
                    if (!params.baseSum) {
                      params.baseSum = 0
                    }
                    break
                  }
                }
              }
            }
          }
          if (!params.fromExtraPay) {
            params.flagsRec = (params.flagsRec || 0) | (params.flagsFix & 1 << 7
              ? 1 << 5
              : (params.flagsFix & 1 << 6
                ? 0
                : accr ? (((accr.flagsRec & 1 << 5) || (params.flagsFix & 1 << 5) || (params.flagsFix & 1 << 7)) ? 1 << 5 : 0)
                  : 1 << 5))
          }
          if (!(params.flagsFix & 1 << 8) && !params.isMtCount) {
            params.mtCount = accr.mtCount || 1
          }
          switch (payEl.method.code) {
            case '33':
              result.push(Object.assign(algorithmMoreNorm.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '4':
              if (cont.payEl[params.payElID].isIndividualRate && orderParams && orderParams.reCalcRate && params.rate && params.additionalRate) {
                params.rate = accrualService.round(params.rate * params.additionalRate / 100)
              }
              if (params.fromExtraPay) {
                if (cont.payEl[params.payElID].calcTimeProportion === 'HOUR' ||
                  (cont.payEl[params.payElID].calcTimeProportion === 'SALARY' && position && position.payElID && cont.payEl[position.payElID].calcProportion !== 'DAY')) {
                  params.flagsRec = params.flagsRec | 1 << 5
                } else {
                  params.flagsRec = params.flagsRec & ~(1 << 5)
                }
              }
              result.push(Object.assign(algorithmSurcharge.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '56':
            case '148':
            case '154':
            case '155':
              result.push(Object.assign(algorithmSurcharge.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '24':
              result.push(Object.assign(algorithmIndexation.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '5':
              result.push(Object.assign(algorithmRang.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '6':
              if (!(params.flagsFix & 1 << 9) && !(params.flagsFix & 1 << 1)) {
                params.rate = algorithmService.getExpirience(cont, params.payElID, params.dateFrom, true).rate
              }
              result.push(Object.assign(algorithmSurcharge.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '7':
              result.push(Object.assign(algorithmEvening.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '8':
            case '153':
            case '207':
              result.push(Object.assign(algorithmNight.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '10':
              result.push(Object.assign(algorithmHoliday.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '11':
              result.push(Object.assign(algorithmDayOff.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '9':
              result.push(Object.assign(algorithmOvertime.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
          }
        } else {
          params.flagsRec = (params.flagsRec || 0) | (params.flagsFix & 1 << 7 ? 1 << 5 : params.flagsFix & 1 << 6 ? 0 : 1 << 5)
          if (!(params.flagsFix & 1)) {
            let baseSum
            if (['4'].includes(payEl.method.code)) {
              if (!(params.flagsFix & 1 << 9)) {
                baseSum = permanentAccrual.baseSum || null
                if (!baseSum) {
                  params.rate = (payEl.isIndividualRate ? null : permanentAccrual.rate) || null
                } else {
                  params.baseSum = baseSum
                }
              }
            }
            if (!baseSum) {
              if (deptIDs) {
                params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
                baseSum = 0
                sourceAccr.accrualDt = []
                cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                  if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= params.dateTo && pos.dateTo >= params.dateFrom) {
                    const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, params.dateFrom))
                    const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, params.dateTo))
                    const fact = algorithmService.getFactSum({
                      withDetail: true,
                      cont,
                      payElID: params.payElID,
                      periodCalc,
                      periodSalary,
                      dateFrom: factDateFrom,
                      dateTo: factDateTo,
                      periodType: payEl.method.code === '25' ? 'SALARY' : null
                    })
                    baseSum = accrualService.round(baseSum + fact.factSum)
                    sourceAccr.accrualDt = sourceAccr.accrualDt.concat(fact.accrualDt)
                  }
                })
              } else {
                const fact = algorithmService.getFactSum({
                  withDetail: true,
                  cont,
                  payElID: params.payElID,
                  periodCalc,
                  periodSalary,
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo,
                  periodType: payEl.method.code === '25' ? 'SALARY' : null
                })
                params.baseSum = accrualService.round(fact.factSum)
                sourceAccr.accrualDt = fact.accrualDt
              }
              if (payEl.method.code === '6') {
                if (permanentAccrual.limitSum) {
                  params.baseSum = Math.min(params.baseSum, permanentAccrual.limitSum)
                }
              }
            }
          }
          switch (payEl.method.code) {
            case '6':
              if (!(params.flagsFix & 1 << 9) && !(params.flagsFix & 1 << 1)) {
                params.rate = algorithmService.getExpirience(cont, params.payElID, params.dateFrom, true).rate
              }
          }
          switch (payEl.method.code) {
            default:
            case '4':
              if (cont.payEl[params.payElID].isIndividualRate && orderParams && orderParams.reCalcRate && params.rate && params.additionalRate) {
                params.rate = accrualService.round(params.rate * params.additionalRate / 100)
              }
              if (params.fromExtraPay) {
                if (cont.payEl[params.payElID].calcTimeProportion === 'HOUR' ||
                  (cont.payEl[params.payElID].calcTimeProportion === 'SALARY' && position.payElID && cont.payEl[position.payElID].calcProportion !== 'DAY')) {
                  params.flagsRec = params.flagsRec | 1 << 5
                } else {
                  params.flagsRec = params.flagsRec & ~(1 << 5)
                }
              }
              result.push(Object.assign(algorithmMonthPremium.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '6':
              result.push(Object.assign(algorithmMonthPremium.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '24':
              result.push(Object.assign(algorithmIndexation.run({
                cont,
                periodCalc,
                periodSalary,
                params,
                sourceAccr
              }), { idx: payElParam.idx }))
              break
            case '25':
            case '49':
              const accr = (params.paymentID
                ? cont.emp[cont.employeeNumberID].salaryRl.find(o => o.sourceID === params.paymentID)
                : cont.emp[cont.employeeNumberID].salaryRl.find(o => dateService.shiftDate(o.dateFrom) <= params.dateTo && dateService.shiftDate(o.dateTo) >= params.dateFrom && o.paySum !== 0)) ||
                cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom) || {}
              sourceAccr.leadAccr = Object.keys(accr).length ? accr : null
              const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
              params.mtCount = pos ? pos.mtCount : 1
              if (payEl.method.code === '25') {
                result.push(Object.assign(algorithmRaisingToMinSalary.run({
                  cont,
                  periodCalc,
                  periodSalary,
                  params,
                  sourceAccr
                }), { idx: payElParam.idx }))
              }
              if (payEl.method.code === '49') {
                if (!(params.flagsFix & 1 << 13)) {
                  params.minSum = permanentAccrual.baseSum
                } else {
                  params.minSum = params.minSalarySum
                }
                params.mtCount = pos ? (pos.mtCount && payEl.isMtCount ? pos.mtCount : 1) : 1
                result.push(Object.assign(algorithmRaisingToMinSum.run({
                  cont,
                  periodCalc,
                  periodSalary,
                  params,
                  sourceAccr
                }), { idx: payElParam.idx }))
              }
              break
          }
        }
        break
      case '45':
      case '46':
      case '47':
      case '65':
        params.mask = 0
        if (deptIDs) {
          params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
        }

        if (!(params.flagsFix & 1) || (payEl.method.code === '46') || (payEl.method.code === '47')) {
          let calcSum
          if (params.flagsFix & 1 << 18) {
            calcSum = params.sumAvg
          } else {
            params.dateFromAvg = dateService.shiftDate(params.dateFromAvg || params.dateFrom)
            params.dateToAvg = dateService.shiftDate(params.dateToAvg || params.dateTo)
            const calcPeriods = periodService.getPeriodsByDate(orgID, params.dateFromAvg ? params.dateFromAvg : params.dateFrom, params.dateToAvg ? params.dateToAvg : params.dateTo)
            let accrualDt = []
            params.days = params.flagsFix & 1 << 6 ? params.days : 0
            params.hours = params.flagsFix & 1 << 7 ? params.hours : 0

            calcPeriods.forEach(period => {
              cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, payElParam.employeeNumberID, cont, period)
              const perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, params.dateFromAvg || period.dateFrom))
              const perDateTo = dateService.shiftDate(Math.min(period.dateTo, params.dateToAvg || period.dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo))
              const periodTimeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
              const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets: periodTimeSheets, dateFrom: perDateFrom, dateTo: perDateTo })
              if (!(params.flagsFix & 1 << 6)) {
                params.days += payTime.days
              }
              if (!(params.flagsFix & 1 << 7)) {
                params.hours = accrualService.round(params.hours + payTime.hours, 4)
              }
              if (payEl.calcSumType !== 'FACT') {
                const permAccrual = {
                  payElID: params.payElID,
                  dateFrom: perDateFrom,
                  dateTo: perDateTo
                }
                let onDate = dateService.shiftDate(perDateTo)
                if (payEl.method.code === '47' && orderParams.orderDate) {
                  onDate = (dateService.shiftDate(orderParams.orderDate) >= perDateFrom && dateService.shiftDate(orderParams.orderDate) <= perDateTo)
                    ? dateService.shiftDate(orderParams.orderDate) : (dateService.shiftDate(orderParams.orderDate) < perDateFrom ? perDateFrom : perDateTo)
                }
                const salaryAccrual = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
                  let mtCount = 1
                if (salaryAccrual && salaryAccrual.payElID) {
                  const salPayEl = cont.payEl[salaryAccrual.payElID]
                  mtCount = (payEl.method.code === '47') ? (payEl.isMtCount ? (salaryAccrual.mtCount || 1) : 1) : (salPayEl.isMtCount ? (salaryAccrual.mtCount || 1) : 1)
                  mtCount = (payEl.method.code === '47') ? (payEl.maxMtCount && mtCount > payEl.maxMtCount ? payEl.maxMtCount : mtCount) : mtCount
                  if (salPayEl && salPayEl.method.groupCode === 1) {
                    Object.assign(salaryAccrual, {
                      flagsRec: 1
                    })
                  }
                }
                
                period.baseSum = algorithmService.getPlanSum(onDate, cont, permAccrual, salaryAccrual || {}) * mtCount
                if ((!['47', '65'].includes(payEl.method.code) || payEl.isTimeSheet) && (period.dateFrom.getTime() !== perDateFrom.getTime() || period.dateFrom.getTime() !== perDateTo.getTime())) {
                  if ((payTime.fullTime ? payTime.planDays : payTime.planHours) !== 0) {
                    period.baseSum = accrualService.round(period.baseSum / (payTime.fullTime ? (payTime.planDays / payTime.days) : (payTime.planHours / payTime.hours)))
                  }
                }
                // if (payEl.method.code === '47' && payEl.isTimeSheet) {
                //   period.baseSum = accrualService.round(period.baseSum / ((((!params.flagsRec || params.flagsRec & 1 << 5) ? payTime.planHours : payTime.planDays) !== 0)
                //     ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? payTime.planHours : payTime.planDays) /
                //             ((!params.flagsRec || params.flagsRec & 1 << 5) ? payTime.hours : payTime.days)) : 1))
                // }
              } else {
                if (deptIDs) {
                  period.baseSum = 0
                  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                    if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
                      const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, perDateFrom))
                      const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, perDateTo))
                      const fact = algorithmService.getFactSum({
                        withDetail: true,
                        cont,
                        payElID: params.payElID,
                        periodCalc: period,
                        periodSalary: period,
                        dateFrom: factDateFrom,
                        dateTo: factDateTo
                      })
                      period.baseSum = accrualService.round((period.baseSum || 0) + fact.factSum)
                      accrualDt = accrualDt.concat(fact.accrualDt)
                    }
                  })
                } else {
                  const fact = algorithmService.getFactSum({
                    withDetail: true,
                    cont,
                    payElID: params.payElID,
                    periodCalc: period,
                    periodSalary: period,
                    dateFrom: perDateFrom,
                    dateTo: perDateTo
                  })
                  
                  period.baseSum = fact.factSum
                  if (period.baseSum === 0 && ['47'].includes(payEl.method.code) && payEl.isTimeSheet && (period.dateFrom.getTime() !== perDateFrom.getTime() || period.dateFrom.getTime() !== perDateTo.getTime())) {
                    if ((payTime.fullTime ? payTime.planDays : payTime.planHours) !== 0) {
                      period.baseSum = accrualService.round(params.baseSum / (payTime.fullTime ? (payTime.planDays / payTime.days) : (payTime.planHours / payTime.hours)))
                    }
                  }
                  accrualDt = accrualDt.concat(fact.accrualDt)
                }
              }
            })
            
            if (calcPeriods.length) {
              calcSum = accrualService.round(calcPeriods.reduce((sum, period) => {
                return sum + period.baseSum
              }, 0) / (payEl.baseSumIsAverage ? calcPeriods.length : 1))
              if (calcSum < 0) {
                calcSum = 0
              }
            } else {
              calcSum = 0
            }
            sourceAccr.accrualDt = calcSum ? algorithmService.calcGroupSumAccrualDt(accrualDt, calcSum, true) : []
          }
          if (payEl.method.code === '46') {
            if (!(params.flagsFix & 1 << 18)) {
              params.sumAvg = calcSum
            }
            if (!(params.flagsFix & 1 << 19)) {
              params.extraRate = algorithmService.getExpirience(cont, params.payElID, params.dateToAvg, true).rate
            }
            if (!(params.flagsFix & 1)) {
              params.baseSum = accrualService.round(params.sumAvg * (params.extraRate ? params.extraRate / 100 : 1))
            }
          } else {
            if (!(params.flagsFix & 1)) {
              params.baseSum = calcSum
            }
          }
        }
        else if ((params.flagsFix & 1) && payEl.method.code === '65' && payEl.isTimeSheet) {
          params.flagsRec = params.flagsRec | 1 << 5
          params.dateFromAvg = dateService.shiftDate(params.dateFromAvg || params.dateFrom)
          params.dateToAvg = dateService.shiftDate(params.dateToAvg || params.dateTo)
          const calcPeriods = periodService.getPeriodsByDate(orgID, params.dateFromAvg ? params.dateFromAvg : params.dateFrom, params.dateToAvg ? params.dateToAvg : params.dateTo)
          params.days = params.flagsFix & 1 << 6 ? params.days : 0
          params.hours = params.flagsFix & 1 << 7 ? params.hours : 0
          params.planDays = 0
          params.planHours = 0
          calcPeriods.forEach(period => {
            cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, payElParam.employeeNumberID, cont, period)
            const perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, params.dateFromAvg || period.dateFrom))
            const perDateTo = dateService.shiftDate(Math.min(period.dateTo, params.dateToAvg || period.dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo))
            const periodTimeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
            const payTime = algorithmService.getTimeByTimeSheet({
              cont,
              payElID: params.payElID,
              timeSheets: periodTimeSheets,
              dateFrom: perDateFrom,
              dateTo: perDateTo
            })
            params.planDays += payTime.planDays
            params.planHours = accrualService.round(params.planHours + payTime.planHours, 4)
            if (!(params.flagsFix & 1 << 6)) {
              params.days += payTime.days
            }
            if (!(params.flagsFix & 1 << 7)) {
              params.hours = accrualService.round(params.hours + payTime.hours, 4)
            }
          })
        }
        if (cont.payEl[params.payElID].isIndividualRate && orderParams && orderParams.reCalcRate && params.rate && params.additionalRate) {
          params.rate = accrualService.round(params.rate * params.additionalRate / 100)
        }
        
        result.push(Object.assign(algorithmMonthPremium.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '12':
        if (deptIDs) {
          params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
        }
        if (!(params.flagsFix & 1)) {
          let baseSum
          if (!(params.flagsFix & 1 << 9)) {
            const perAccr = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, {
              dateFrom: params.dateFrom,
              dateTo: params.dateTo
            }, null, [params.payElID])[0]
            baseSum = (perAccr && perAccr.baseSum) || 0
            if (!baseSum && !(params.flagsFix & 1 << 1)) {
              params.rate = (orderParams && orderParams.rate) || (payEl.isIndividualRate ? null : (perAccr && perAccr.rate)) || null
            }
          }
          if (cont.payEl[params.payElID].isIndividualRate && orderParams && orderParams.reCalcRate && params.rate && params.additionalRate) {
            params.rate = accrualService.round(params.rate * params.additionalRate / 100)
          }
          if (orderParams && cont.payEl[params.payElID].useKPI) {
            if (!params.KPI && !(params.flagsFix & 1 << 26)) {
              params.KPI = employeeService.getEmployeeKpi(cont, cont.employeeNumberID, params.dateTo)
            }
            const kpiAccrual = accrualService.getKpiAccrual(cont, params.payElID, params.dateTo, params.KPI)
            params.rate = params.flagsFix & 1 << 9 ? params.rate : kpiAccrual ? kpiAccrual.rate || null : null
            baseSum = params.flagsFix & 1 ? baseSum : kpiAccrual && !kpiAccrual.rate ? kpiAccrual.paySum || null : null
          }
          if (!baseSum && params.rate) {
            if (deptIDs) {
              baseSum = 0
              sourceAccr.accrualDt = []
              cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= params.dateTo && pos.dateTo >= params.dateFrom) {
                  const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, params.dateFrom))
                  const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, params.dateTo))
                  const fact = algorithmService.getFactSum({
                    withDetail: true,
                    cont,
                    payElID: params.payElID,
                    periodCalc,
                    periodSalary,
                    dateFrom: factDateFrom,
                    dateTo: factDateTo
                  })
                  baseSum = accrualService.round(baseSum + fact.factSum)
                  sourceAccr.accrualDt = sourceAccr.accrualDt.concat(fact.accrualDt)
                }
              })
            } else {
              const fact = algorithmService.getFactSum({
                withDetail: true,
                cont,
                payElID: params.payElID,
                periodCalc,
                periodSalary,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo
              })
              baseSum = accrualService.round(fact.factSum)
              sourceAccr.accrualDt = fact.accrualDt
            }
          }
          params.baseSum = baseSum
        } else {
          if (!(params.flagsFix & 1 << 9) && !(params.flagsFix & 1 << 1)) {
            params.rate = null
          }
        }

        result.push(Object.assign(algorithmMonthPremium.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '208':
        const calcPayEl = cont.payEl[payEl.payElID]
        if (!(params.flagsFix & 1 << 9)) {
          const rateDateFrom = dateService.addMonths(periodSalary.dateFrom, -1 * payEl.calcMounthRate)
          const rateDateTo = dateService.addDays(periodSalary.dateFrom, -1)
          const rateParam = cont.emp[cont.employeeNumberID].accrual.reduce((p, a) => {
            if (a.payElID === calcPayEl.ID && a.periodSalary >= rateDateFrom && a.periodSalary <= rateDateTo &&
              !(a.flagsRec & 1 << 9) && !(a.flagsRec & 1 << 10) && !(a.flagsRec & 1 << 12) && !(a.flagsRec & 1 << 16) && !(a.flagsRec & 1 << 17)
            ) {
              p.rate += a.rate || 0
              p.accrualCount++
            }
            return p
          }, { rate: 0, accrualCount: 0 })

          params.rate = (rateParam.rate !== 0 && rateParam.accrualCount !== 0) ? accrualService.round(rateParam.rate / rateParam.accrualCount) : 0

          if (calcPayEl.isIndividualRate && calcPayEl.rightRate === 'AVG') {
            const employeeAccruals = cont.emp[cont.employeeNumberID].prop.employeeAccruals.filter(o => o.employeeNumberID === cont.employeeNumberID &&
              o.payElID === calcPayEl.ID && o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
            if (employeeAccruals.length && employeeAccruals[employeeAccruals.length - 1].accrualRate) {
              params.rate = params.rate * employeeAccruals[employeeAccruals.length - 1].accrualRate / 100
            }
          }
        }
        switch (calcPayEl.method.code) {
          case '12': {
            if (deptIDs) {
              params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
            }
            if (!(params.flagsFix & 1)) {
              let baseSum
              if (!baseSum && params.rate) {
                if (deptIDs) {
                  baseSum = 0
                  sourceAccr.accrualDt = []
                  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                    if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= params.dateTo && pos.dateTo >= params.dateFrom) {
                      const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, params.dateFrom))
                      const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, params.dateTo))
                      const fact = algorithmService.getFactSum({
                        withDetail: true,
                        cont,
                        payElID: calcPayEl.ID,
                        periodCalc,
                        periodSalary,
                        dateFrom: factDateFrom,
                        dateTo: factDateTo
                      })
                      baseSum = accrualService.round(baseSum + fact.factSum)
                      sourceAccr.accrualDt = sourceAccr.accrualDt.concat(fact.accrualDt)
                    }
                  })
                } else {
                  const fact = algorithmService.getFactSum({
                    withDetail: true,
                    cont,
                    payElID: calcPayEl.ID,
                    periodCalc,
                    periodSalary,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo
                  })
                  baseSum = accrualService.round(fact.factSum)
                  sourceAccr.accrualDt = fact.accrualDt
                }
              }
              params.baseSum = baseSum
            }
            break
          }
          case '45':
          case '46':
          case '47':
          case '65':
            params.mask = 0
            if (deptIDs) {
              params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
            }
            if (!(params.flagsFix & 1) || (calcPayEl.method.code === '46')) {
              let calcSum
              if (params.flagsFix & 1 << 18) {
                calcSum = params.sumAvg
              } else {
                params.dateFromAvg = dateService.shiftDate(params.dateFromAvg || params.dateFrom)
                params.dateToAvg = dateService.shiftDate(params.dateToAvg || params.dateTo)
                const calcPeriods = periodService.getPeriodsByDate(orgID, params.dateFromAvg ? params.dateFromAvg : params.dateFrom, params.dateToAvg ? params.dateToAvg : params.dateTo)
                let accrualDt = []
                params.days = params.flagsFix & 1 << 6 ? params.days : 0
                params.hours = params.flagsFix & 1 << 7 ? params.hours : 0
                calcPeriods.forEach(period => {
                  cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, payElParam.employeeNumberID, cont, period)
                  const perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, params.dateFromAvg || period.dateFrom))
                  const perDateTo = dateService.shiftDate(Math.min(period.dateTo, params.dateToAvg || period.dateTo, cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo))
                  const periodTimeSheets = algorithmService.getTimeSheetByPeriod(period, cont)
                  const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: calcPayEl.ID, timeSheets: periodTimeSheets, dateFrom: perDateFrom, dateTo: perDateTo })
                  if (!(params.flagsFix & 1 << 6)) {
                    params.days += payTime.days
                  }
                  if (!(params.flagsFix & 1 << 7)) {
                    params.hours = accrualService.round(params.hours + payTime.hours, 4)
                  }
                  if (calcPayEl.calcSumType !== 'FACT') {
                    const permAccrual = {
                      payElID: calcPayEl.ID,
                      dateFrom: perDateFrom,
                      dateTo: perDateTo
                    }
                    let onDate = dateService.shiftDate(perDateTo)
                    if (calcPayEl.method.code === '47' && orderParams.orderDate) {
                      onDate = (dateService.shiftDate(orderParams.orderDate) >= perDateFrom && dateService.shiftDate(orderParams.orderDate) <= perDateTo)
                        ? dateService.shiftDate(orderParams.orderDate) : (dateService.shiftDate(orderParams.orderDate) < perDateFrom ? perDateFrom : perDateTo)
                    }
                    const salaryAccrual = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
                    let mtCount = 1
                    if (salaryAccrual && salaryAccrual.payElID) {
                      const salPayEl = cont.payEl[salaryAccrual.payElID]
                      mtCount = salPayEl.isMtCount ? (salaryAccrual.mtCount || 1) : 1
                      if (salPayEl && salPayEl.method.groupCode === 1) {
                        Object.assign(salaryAccrual, {
                          flagsRec: 1
                        })
                      }
                    }
                    period.baseSum = algorithmService.getPlanSum(onDate, cont, permAccrual, salaryAccrual || {}) * mtCount
                    if (calcPayEl.method.code !== '47' && (period.dateFrom.getTime() !== perDateFrom.getTime() || period.dateFrom.getTime() !== perDateTo.getTime())) {
                      if ((payTime.fullTime ? payTime.planDays : payTime.planHours) !== 0) {
                        period.baseSum = accrualService.round(period.baseSum / (payTime.fullTime ? (payTime.planDays / payTime.days) : (payTime.planHours / payTime.hours)))
                      }
                    }
                  } else {
                    if (deptIDs) {
                      period.baseSum = 0
                      cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(pos => {
                        if (deptIDs.includes(pos.departmentID) && pos.dateFrom <= perDateTo && pos.dateTo >= perDateFrom) {
                          const factDateFrom = dateService.shiftDate(Math.max(pos.dateFrom, perDateFrom))
                          const factDateTo = dateService.shiftDate(Math.min(pos.dateTo, perDateTo))
                          const fact = algorithmService.getFactSum({
                            withDetail: true,
                            cont,
                            payElID: calcPayEl.ID,
                            periodCalc: period,
                            periodSalary: period,
                            dateFrom: factDateFrom,
                            dateTo: factDateTo
                          })
                          period.baseSum = accrualService.round((period.baseSum || 0) + fact.factSum)
                          accrualDt = accrualDt.concat(fact.accrualDt)
                        }
                      })
                    } else {
                      const fact = algorithmService.getFactSum({
                        withDetail: true,
                        cont,
                        payElID: calcPayEl.ID,
                        periodCalc: period,
                        periodSalary: period,
                        dateFrom: perDateFrom,
                        dateTo: perDateTo
                      })
                      period.baseSum = fact.factSum
                      accrualDt = accrualDt.concat(fact.accrualDt)
                    }
                  }
                })
                if (calcPeriods.length) {
                  calcSum = accrualService.round(calcPeriods.reduce((sum, period) => {
                    return sum + period.baseSum
                  }, 0) / (calcPayEl.baseSumIsAverage ? calcPeriods.length : 1))
                  if (calcSum < 0) {
                    calcSum = 0
                  }
                } else {
                  calcSum = 0
                }
                sourceAccr.accrualDt = calcSum ? algorithmService.calcGroupSumAccrualDt(accrualDt, calcSum, true) : []
              }
              if (calcPayEl.method.code === '46') {
                if (!(params.flagsFix & 1 << 18)) {
                  params.sumAvg = calcSum
                }
                if (!(params.flagsFix & 1 << 19)) {
                  params.extraRate = algorithmService.getExpirience(cont, calcPayEl.ID, params.dateToAvg, true).rate
                }
                if (!(params.flagsFix & 1)) {
                  params.baseSum = accrualService.round(params.sumAvg * (params.extraRate ? params.extraRate / 100 : 1))
                }
              } else {
                if (!(params.flagsFix & 1)) {
                  params.baseSum = calcSum
                }
              }
            }
            break
        }
        result.push(Object.assign(algorithmMonthPremium.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '13':
      case '67':
      case '142':
        result.push(Object.assign(algorithmVacation.run({
          cont,
          periodCalc,
          periodSalary,
          params
        }), { idx: payElParam.idx }))
        break
      case '150':
        result.push(Object.assign(algorithmSurcharge.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      case '50':
      case '51':
        params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
        const timeBy = (position && position.payElID) ? (cont.payEl[position.payElID].useTimeSheetBy || 'NORMA') : 'NORMA'
        const payTime = algorithmService.getPayTimeByTimeCost(params.mask, params.dateFrom, params.dateTo, timeBy === 'PLAN' ? 'planHour' : 'normHour', [], false, timeSheets, timeBy === 'PLAN' ? 'plan' : 'norma', orgID)
        params.planDays = payTime.days
        params.planHours = payTime.hours
        params.days = payTime.days
        params.hours = payTime.hours
        params.sumAvg = (sourceAccr.perAccr ? sourceAccr.perAccr.accrualSum : 0) || 0
        result.push(Object.assign(algorithmRaisingToAvgSalary.run({
          cont,
          periodCalc,
          periodSalary,
          params
        }), { idx: payElParam.idx }))
        break
      case '26': {
        cont.emp[cont.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo
        }, ['26'], null, true)
        sourceAccr.allTaxIndividAcc = algorithmService.getTaxIndividAcc(cont, cont.emp[cont.employeeNumberID].permanentAccrual, params.dateFrom, params.dateTo, periodSalary, ['26'], 1)
        const accrual = Object.assign(algorithmIncomeTax.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx })
        if (accrual.taxIndividAcc) {
          accrual.taxIndividAcc.forEach(tax => {
            tax['taxIndividID.name'] = (cont.dict.hr_dictTaxIndivid.find(o => o.ID === tax.taxIndividID) || {}).name
          })
        }
        result.push(reductionAccrual({ cont, accrual, ID: params.ID }))
        break
      }
      case '27': {
        const fact = algorithmService.getFactSum({
          cont,
          payElID: params.payElID,
          periodCalc,
          periodSalary,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          withPayElID: true,
          withDetail: true
        })

        if (!(params.flagsFix & 1)) {
          params.baseSum = fact.factSum
          sourceAccr.accrualDt = fact.accrualDt
        } else {
          sourceAccr.accrualDt = algorithmService.correctAccrualDt(fact.accrualDt, params.baseSum, null, 'sourceSum')
        }
        const accrual = Object.assign(algorithmMilitaryFee.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx })
        if (accrual.flagsFix & 1 << 13) {
          if (params.taxIndividAcc) {
            accrual.taxIndividAcc = algorithmService.correctAccrualDt(params.taxIndividAcc, params.baseSum, null, 'incomeSum')
            accrual.taxIndividAcc = algorithmService.correctAccrualDt(params.taxIndividAcc, params.paySum, null, 'taxSum')
          }
        } else {
          if (accrual.taxIndividAcc) {
            accrual.taxIndividAcc.forEach(tax => {
              tax['taxIndividID.name'] = (cont.dict.hr_dictTaxIndivid.find(o => o.ID === tax.taxIndividID) || {}).name
            })
          }
        }
        result.push(accrual)
        break
      }
      case '32':
        const fact = algorithmService.getFactSum({ cont, payElID: params.payElID, periodCalc, periodSalary, dateFrom: params.dateFrom, dateTo: params.dateTo, withDetail: true })
        if (!(params.flagsFix & 1)) {
          params.baseSum = fact.factSum
          sourceAccr.accrualDt = fact.accrualDt
        } else {
          sourceAccr.accrualDt = algorithmService.correctAccrualDt(fact.accrualDt, params.baseSum, null, 'sourceSum')
        }
        result.push(Object.assign(algorithmTradeUnionFee.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      case '62':
        params.dailyWage = !!(orderParams && orderParams.dailyWage)
        if (orderParams && orderParams.checkBalance) {
          const empBalance = balances.find(o => o.employeeNumberID === params.employeeNumberID) || {}
          params.balance = empBalance.balance || 0
        }

        if (!(params.flagsFix & 1)) {
          if (payEl.calcSumType === 'PLAN') {
            const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo })
            params.planDays = payTime.planDays
            params.days = payTime.days
            const salaryAccrual = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
            params.baseSum = algorithmService.getPlanSum(params.dateFrom, cont, {
              payElID: params.payElID,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo
            }, salaryAccrual)
          } else {
            if (params.dailyWage) {
              let mask = 0
              cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
                if (accr.periodSalaryID === params.periodSalaryID && accr.mask && cont.payEl[accr.payElID].method.groupType === 'PAYMENT' &&
                  !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 2) && !(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 16)) {
                  let accrMask = accr.mask
                  cont.emp[cont.employeeNumberID].accrual.forEach(o => {
                    if (o.linkToParentID === accr.ID && o.mask && ((o.flagsRec & 1 << 9) || (o.flagsRec & 1 << 10)) && !(o.flagsRec & 1 << 12)) {
                      accrMask = accrMask & ~o.mask
                    }
                  })
                  mask = mask | accrMask
                }
              })
              params.days = ((mask || 0).toString(2).match(/1/g) || []).length
            }
            const fact = algorithmService.getFactSum({
              cont,
              payElID: params.payElID,
              periodCalc,
              periodSalary,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              withDetail: true
            })
            if (!(params.flagsFix & 1)) {
              params.baseSum = fact.factSum
              sourceAccr.accrualDt = fact.accrualDt
            } else {
              sourceAccr.accrualDt = algorithmService.correctAccrualDt(fact.accrualDt, params.baseSum, null, 'sourceSum')
            }
          }
        }
        result.push(Object.assign(algorithmRequestEmployee.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      case '3':
      case '38':
      case '42':
      case '43':
      case '141':
        if (!(params.flagsFix & 1 << 8)) {
          params.mtCount = 1
        }
        params.mask = payEl.method.code === '3' ? algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo) : 0
        params.planDays = null
        params.planHours = null
        params.days = null
        params.hours = null
        result.push(Object.assign(algorithmSalary.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      case '28':
      case '29':
      case '30':
      case '53':
        params.planDays = null
        params.planHours = null
        params.days = null
        params.hours = null
        if (params.flagsFix & 1 << 17) {
          params.accrualDt = (typeof params.accrualDt !== 'string') ? JSON.stringify(params.accrualDt) : params.accrualDt
        } else {
          params.accrualDt = []
          let paySum = 0
          const dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
          const payElBase = cont.payEl[params.payElID].payElEntrySum.filter(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
          if (payEl.method.code === '28') {
            balances = UB.Repository('hr_accrualBalance')
              .attrs('SUM([sumFrom])', 'dictFundSourceID')
              .where('employeeNumberID', 'in', cont.employeeNumberID)
              .where('periodCalcID', '=', periodSalary.ID)
              .whereIf(dictFundSourceFSSU.length, 'dictFundSourceID', 'notIn', dictFundSourceFSSU)
              .groupBy(['dictFundSourceID'])
              .selectAsObject({
                'SUM([sumFrom])': 'paySum'
              })
            balances.forEach(dt => {
              params.accrualDt.push(dt)
              paySum = accrualService.round(paySum + dt.paySum)
            })
          }
          cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
            if (acc.periodCalcID === periodSalary.ID && acc.accrualDt && acc.accrualDt.length && !(acc.flagsRec & 1 << 13) &&
              (!payElBase.length || payElBase.find(o => o.payElBaseID === params.payElID))) {
              acc.accrualDt.forEach(accDt => {
                delete accDt.ID
                if (((['28', '29', '30'].includes(payEl.method.code) && (!dictFundSourceFSSU.length || !dictFundSourceFSSU.includes(accDt.dictFundSourceID))) ||
                  (['53'].includes(payEl.method.code) && (dictFundSourceFSSU.length && dictFundSourceFSSU.includes(accDt.dictFundSourceID))))) {
                  const dt = Object.assign({}, accDt)
                  delete dt.ID
                  dt.paySum = (cont.payEl[acc.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * dt.paySum
                  params.accrualDt.push(dt)
                  paySum = accrualService.round(paySum + dt.paySum)
                  // sourceAccr.accrualDt.push(dt)
                }
              })
            }
          })
          params.accrualDt = JSON.stringify(params.accrualDt)
          if (!(params.flagsFix & 1 << 1)) {
            params.paySum = paySum
          }
        }
        const newAccrual = Object.assign(algorithmPaySalary.run({ cont, periodCalc, periodSalary, params }), { idx: payElParam.idx })
        newAccrual.accrualDt = JSON.parse(newAccrual.accrualDt)
        result.push(newAccrual)
        break
      case '41':
        params.days = timService.getDaysByCondition(params.dateFrom, params.dateTo, payEl.method.dayAccumCondition, orgID)
        params.mask = timService.getMaskByCondition(params.dateFrom, params.dateTo, payEl.method.dayAccumCondition, orgID)
        unpaid = {
          periodCalcID: periodCalc.ID,
          periodSalaryID: periodSalary.ID,
          periodCalc: periodCalc.dateFrom,
          periodSalary: periodSalary.dateFrom,
          employeeNumberID: params.employeeNumberID,
          payElID: params.payElID,
          flagsRec: params.flagsRec,
          flagsFix: params.flagsFix,
          avgCalcType: params.avgCalcType,
          dateFromAvg: params.dateFromAvg,
          dateToAvg: params.dateToAvg,
          baseSum: params.baseSum,
          paySum: 0,
          mask: params.mask,
          days: params.days,
          planHours: params.planHours,
          planDays: params.planDays,
          mtCount: params.mtCount,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          accrualDt: []
        }
        result.push(Object.assign(unpaid, { idx: payElParam.idx }))
        break
      case '31':
      case '61': {
        const balance = accrualService.getAccrualBalance(cont.employeeNumberID, periodCalc.ID)
        params.rate = !(params.flagsFix & 1 << 9) ? (sourceAccr.perAccr.rate || null) : params.rate
        params.calculatedSum = (params.flagsFix & 1 << 11) ? params.calculatedSum : 0
        const remindSum = sourceAccr.perAccr.remindSum || 0
        let birthDate = null
        let finishMinSum = null
        if (payEl.method.code === '31') {
          const birthDate = sourceAccr.perAccr['employeeFamilyID.peopleID.birthDate'] ? dateService.shiftDate(sourceAccr.perAccr['employeeFamilyID.peopleID.birthDate']) : null
          const yearsOldTo = birthDate ? dateService.yearsDiff(birthDate, periodSalary.dateTo) : null
          const finishMinSize = cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= periodSalary.dateTo)
          finishMinSum = yearsOldTo ? (yearsOldTo < 6 ? finishMinSize.childrenUnder6 : (yearsOldTo < 18 ? finishMinSize.childrenTo18 : null)) : null
        }
        const perDateFrom = dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, periodSalary.dateFrom, dateService.shiftDate(sourceAccr.perAccr.dateFrom)))
        const perDateTo = dateService.shiftDate(Math.min(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork, periodSalary.dateTo, dateService.shiftDate(sourceAccr.perAccr.dateTo)))
        const payTime = algorithmService.getPlanDaysByTimeSheet({
          timeSheets: timeSheets,
          dateFrom: periodSalary.dateFrom,
          dateTo: periodSalary.dateTo,
          startWork: dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork),
          finishWork: dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork),
          perDateFrom,
          perDateTo,
          typeCalcTime: payEl.typeCalcTime
        })
        const payElOfftake = cont.payEl[params.payElID].payElEntrySum.filter(o => cont.payEl[o.payElBaseID].method.groupType === 'OFFTAKE' &&
          o.dateFrom <= periodSalary.dateFrom && o.dateTo >= periodSalary.dateTo).map(o => o.payElBaseID)
        const fact = algorithmService.getFactSum({
          withDetail: true,
          withIncludPayEl: true,
          groupType: ['PAYMENT'],
          cont,
          payElID: params.payElID,
          periodCalc: periodCalc,
          periodSalary,
          dateFrom: periodSalary.dateFrom,
          dateTo: periodSalary.dateTo
        })
        if (params.rate) {
          params.basePayment = accrualService.round(Math.max(0, fact.factSum))
          if (payElOfftake.length && fact.includPayEl.length) {
            const { includPayEl } = fact
            const accruals = { [cont.employeeNumberID]: [] }
            includPayEl.forEach(payEl => {
              accruals[cont.employeeNumberID].push({
                periodCalcID: periodSalary.ID,
                periodSalaryID: periodSalary.ID,
                periodCalc: periodSalary.dateFrom,
                periodSalary: periodSalary.dateFrom,
                employeeNumberID: cont.employeeNumberID,
                payElID: payEl.payElID,
                mask: algorithmService.getFillMaskByPeriod(periodSalary.dateFrom, periodSalary.dateTo),
                paySum: payEl.paySum,
                dateFrom: periodSalary.dateFrom,
                dateTo: periodSalary.dateTo,
                accrualDt: payEl.accrualDt
              })
            })
            const alimonyCont = {
              org: Object.assign({}, cont.org),
              payEl: Object.assign({}, cont.payEl),
              sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
              payFund: cont.payFund,
              periods: cont.periods,
              holidays: cont.holidays,
              dict: Object.assign({}, cont.dict),
              emp: { [cont.employeeNumberID]: { prop: Object.assign({}, cont.emp[cont.employeeNumberID].prop) } }

            }
            autoCalculate({
              cont: alimonyCont,
              orgID,
              periodID: periodSalary.ID,
              employeeNumbers: [cont.employeeNumberID],
              skipCommit: true,
              calculateProperty: {
                calcType: 1 << 4,
                calculatePayElIDs: payElOfftake,
                dateFrom: periodSalary.dateFrom,
                dateTo: periodSalary.dateTo,
                accrual: accruals
              }
            })

            alimonyCont.emp[cont.employeeNumberID].accrual.forEach(alAccr => {
              if (payElOfftake.includes(alAccr.payElID)) {
                fact.factSum = accrualService.round(fact.factSum - alAccr.paySum)
                if (alAccr.accrualDt && alAccr.accrualDt.length) {
                  alAccr.accrualDt.forEach(dt => {
                    dt.paySum *= -1
                    fact.accrualDt.push(dt)
                  })
                }
              }
            })
          }
          params.baseSum = !(params.flagsFix & 1 << 0) ? accrualService.round(Math.max(0, fact.factSum)) : params.baseSum
          if (params.baseSum < 0) {
            params.baseSum = 0
          }
          params.calculatedSum = !(params.flagsFix & 1 << 11) ? (params.baseSum * payTime.perDays / payTime.planDays * params.rate / 100) : params.calculatedSum
          sourceAccr.accrualDt = fact.accrualDt
        } else {
          params.calculatedSum = !(params.flagsFix & 1 << 11) ? sourceAccr.perAccr.baseSum : params.calculatedSum
          params.baseSum = !(params.flagsFix & 1 << 0) ? accrualService.round(Math.max(0, fact.factSum)) : params.baseSum
          params.basePayment = params.calculatedSum
          sourceAccr.accrualDt = []
          // Індексація
          if (params.calculatedSum > 0 && !(params.flagsFix & 1 << 11)) {
            let startMinSum = null
            if (payEl.method.code === '31') {
              const dateIdxFrom = sourceAccr.perAccr.dateIdxFrom ? dateService.shiftDate(sourceAccr.perAccr.dateIdxFrom) : null
              const yearsOld = birthDate && dateIdxFrom ? dateService.yearsDiff(birthDate, dateIdxFrom) : null
              const minSize = dateIdxFrom ? cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= dateIdxFrom) : null
              startMinSum = minSize ? (yearsOld < 6 ? minSize.childrenUnder6 : (yearsOld < 18 ? minSize.childrenTo18 : null)) : null
            }
            params.calculatedSum *= (startMinSum && finishMinSum && finishMinSum > startMinSum) ? finishMinSum / startMinSum : 1
            params.calculatedSum = params.calculatedSum * payTime.minWorkDays / payTime.minPlanDays
          }
        }
        // Граничні розміри
        if (finishMinSum && params.calculatedSum && params.rate && !(params.flagsFix & 1 << 11)) {
          const alimonyLimit = payEl.payElAlimonyLimit.find(o => dateService.shiftDate(o.dateFrom) < params.dateFrom)
          if (alimonyLimit) {
            if ((alimonyLimit.coefficientMin && finishMinSum * alimonyLimit.coefficientMin * payTime.minWorkDays / payTime.minPlanDays) >
              params.calculatedSum) {
              params.calculatedSum = finishMinSum * alimonyLimit.coefficientMin * payTime.minWorkDays / payTime.minPlanDays
            }
            if (alimonyLimit.coefficientMax && finishMinSum * alimonyLimit.coefficientMax * payTime.minWorkDays / payTime.minPlanDays < params.calculatedSum) {
              params.calculatedSum = finishMinSum * alimonyLimit.coefficientMax * payTime.minWorkDays / payTime.minPlanDays
            }
          }
        }
        let limitSum = params.calculatedSum
        const dateFrom = dateService.shiftDate(Math.max(periodSalary.dateFrom, payEl.dateFrom))
        const dateTo = dateService.shiftDate(Math.min(periodSalary.dateTo, payEl.dateTo))
        const entryPayEl = payEl.payElEntryTime.filter(o => o.dateFrom <= dateTo && o.dateTo >= dateFrom)
        if (payEl.alimonyLessPayment && payEl.alimonyLessPayment > 0 && entryPayEl.length) {
          const baseSum = accrualService.round(Math.max(0, algorithmService.getFactSum({
            cont,
            payElID: payEl.ID,
            periodCalc,
            periodSalary,
            payElBase: entryPayEl,
            dateFrom,
            dateTo
          })))
          limitSum = accrualService.round(Math.min(limitSum + remindSum, baseSum * payEl.alimonyLessPayment / 100), 2)
        }
        limitSum = accrualService.round(Math.min(limitSum, balance), 2)
        const maxSum = accrualService.round((params.calculatedSum + remindSum) * limitSum / (params.calculatedSum + remindSum), 2)
        params.repaymentSum = !(params.flagsFix & 1 << 12) ? accrualService.round(Math.min(params.calculatedSum, maxSum)) : params.repaymentSum
        params.incomingDebtSum = remindSum
        params.repaymentDebtSum = !(params.flagsFix & 1 << 10) ? accrualService.round(Math.min(remindSum, maxSum - params.repaymentSum), 2) : params.repaymentDebtSum
        params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
        result.push(Object.assign(algorithmAlimony.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      }
      case '201': {
        params.flagsRec = params.flagsRec | 1 << 13
        const payEl = cont.payEl[params.payElID]
        const onDate = dateService.shiftDate(params.dateTo)
        if (!(params.flagsFix & 1 << 10) || !params.baseDate) {
          params.baseDate = dateService.firstDayOfMonth(dateService.addMonths(onDate, 1))
        } else {
          params.baseDate = dateService.shiftDate(params.baseDate)
        }
        const calcParams = {
          avgOnDate: params.baseDate,
          dateFrom: params.baseDate,
          dateTo: params.baseDate,
          orgID: cont.orgID,
          periodCalcID: periodCalc,
          employeeNumberID: cont.employeeNumberID,
          payElID: payEl.ID,
          flagsFix: 0,
          flagsRec: 1,
          dayAccumCondition: payEl.method.dayAccumCondition || 'noDaysOff'
        }
        const resultCalculate = averageService.calculateAverage({
          orgID,
          cont,
          params: calcParams,
          excludeHolidays: false,
          checkContinuation: true
        })
        if (!resultCalculate && calcParams.avgCalcType === 'FACT') {
          calcParams.avgCalcType = 'PLAN'
          calcParams.accrualDt = []
        }
        if (!resultCalculate && calcParams.avgCalcType === 'PLAN') {
          averageService.calculateAveragePlan({
            orgID,
            cont,
            params: calcParams,
            periodCalc: periodSalary,
            onDate: params.baseDate,
            excludeHolidays: false,
            daysMode: 1
          })
        }
        sourceAccr.accrualDt = calcParams.accrualDt
        if (calcParams.avgDt) {
          params.paySumAccrual = params.flagsFix & 1 << 21 ? params.paySumAccrual : calcParams.avgDt.baseSum
          params.calendarDays = params.flagsFix & 1 << 19 ? params.calendarDays : calcParams.avgDt.days
        }
        if (!(params.flagsFix & 1)) {
          if (!(params.flagsFix & 1 << 21 || params.flagsFix & 1 << 19)) {
            params.baseSum = accrualService.round(calcParams.baseSum || 0)
          } else {
            params.baseSum = params.calendarDays ? accrualService.round((params.paySumAccrual || 0) / params.calendarDays) : 0
          }
        }

        if (!(params.flagsFix & 1 << 12)) {
          params.koef = 0
          params.standingAll = 0

          const vacPeriods = UB.Repository('hr_empVacationPeriod')
            .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'isPartYear', 'empVacationPlanID.dayCount'])
            .where('empVacationPlanID.employeeNumberID', '=', cont.employeeNumberID)
            .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
            .where('empVacationPlanID.dictVacationKindID.isFormReserve', '=', true)
            .where('fromOrgID', 'isNull')
            .where('dateFrom', '<=', params.dateTo)
            .where('dateTo', '>=', params.dateFrom)
            .where('empVacationPlanID.dateFrom', '<=', params.dateTo)
            .where('empVacationPlanID.dateTo', '>=', params.dateTo)
            .selectAsObject({
              'empVacationPlanID.dayCount': 'dayCount'
            })
          vacPeriods.forEach(vacPeriod => {
            vacPeriod.dateFrom = dateService.shiftDate(vacPeriod.dateFrom)
            vacPeriod.dateTo = dateService.shiftDate(vacPeriod.dateTo)
            const periodDays = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, vacPeriod.dateFrom, vacPeriod.dateTo)
            params.standingAll = accrualService.round(params.standingAll + (vacPeriod.dayCount || 0), 0)
            let daysPlan = 0
            if (payEl.isCalcReservePart) {
              const dayCount = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, periodSalary.dateFrom, periodSalary.dateTo)
              daysPlan = Math.min(vacPeriod.dayCountPlan, vacPeriod.dayCountPlan / periodDays * dayCount)
            } else {
              const dayCount = algorithmService.getAccumDaysByPeriod(cont, payEl.ID, dateService.shiftDate(Math.max(params.dateFrom, vacPeriod.dateFrom)), dateService.shiftDate(Math.min(params.dateTo, vacPeriod.dateTo)))
              daysPlan = Math.min(vacPeriod.dayCountPlan, vacPeriod.dayCountPlan / periodDays * dayCount)
            }
            params.koef = accrualService.round(params.koef + daysPlan, 6)
          })
          /* if (vacPeriods.length) {
            params.standingAll = accrualService.round(params.standingAll / vacPeriods.length, 0)
          } */
          params.koef = accrualService.round(params.koef, payEl.roundDays || 2)
        } else if (!params.koef) {
          params.koef = 0
        }
        const newAccrual = Object.assign(algorithmReserve.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx })
        newAccrual.avgCalcType = calcParams.avgCalcType
        newAccrual.dateFromAvg = calcParams.dateFromAvg
        newAccrual.dateToAvg = calcParams.dateToAvg
        newAccrual.accrualAvg = calcParams.accrualsAvg || []
        result.push(newAccrual)
        break
      }
      case '202': {
        params.flagsRec = params.flagsRec | 1 << 13
        if (!params.rate) {
          params.rate = 0
        }
        if (!(params.flagsFix & 1)) {
          const fact = algorithmService.getFactSum({
            withDetail: true,
            cont,
            payElID: params.payElID,
            periodCalc: periodSalary,
            periodSalary,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo
          })
          params.baseSum = fact.factSum
          sourceAccr.accrualDt = fact.accrualDt
        }
        params.koef = 1
        result.push(Object.assign(algorithmReserve.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      }
      case '204':
      case '205': {
        const perAccr = accrualService.getPermanentAccrual(orgID, cont.employeeNumberID, cont, {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo
        }, null, [params.payElID])[0]
        if (!(params.flagsFix & 1 << 8)) {
          const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
          params.mtCount = pos ? (pos.mtCount && payEl.isMtCount ? pos.mtCount : 1) : 1
        }
        params.baseSum = params.flagsFix & 1 ? params.baseSum : perAccr ? (perAccr.baseSum || 0) : (params.baseSum || 0)

        let accrualSum = params.flagsFix & 1 << 18 ? params.sumAvg
          : ((params.baseSum || 0) * (payEl.isMtCount ? (params.mtCount || 0) : 1) * (payEl.isTimeSheet ? (params.planDays ? (params.days / params.planDays) : 0) : 1))
        let limitSum = params.flagsFix & 1 ? params.planSumAvg
          : (perAccr ? (perAccr.limitSum || 0) : 0) * (payEl.isMtCount ? (params.mtCount || 0) : 1) * (payEl.isLimitTimeSheet ? (params.planDays ? (params.days / params.planDays) : 0) : 1)

        let fact = {
          factSum: 0,
          includPayEl: []
        }
        const mask = algorithmService.getFillMaskByPeriod(periodSalary.dateFrom, periodSalary.dateTo)
        if (params.dateFromAvg && params.dateToAvg) {
          params.dateFromAvg = dateService.shiftDate(params.dateFromAvg)
          params.dateToAvg = dateService.shiftDate(params.dateToAvg)
          const calcPeriods = periodService.getPeriodsByDate(orgID, params.dateFromAvg ? params.dateFromAvg : params.dateFrom, params.dateToAvg ? params.dateToAvg : params.dateTo)

          calcPeriods.forEach(period => {
            const factPeriod = algorithmService.getFactSum({
              withDetail: true,
              withIncludPayEl: true,
              cont,
              payElID: params.payElID,
              periodCalc: period,
              periodSalary: period,
              dateFrom: period.dateFrom,
              dateTo: period.dateTo,
              periodType: 'SALARY'
            })
            fact.factSum += factPeriod.factSum
            factPeriod.includPayEl.forEach(includRow => {
              includRow.dateFrom = periodSalary.dateFrom
              includRow.dateTo = periodSalary.dateTo
              includRow.periodCalc = includRow.periodSalary = periodSalary.dateFrom
              includRow.periodCalcID = includRow.periodSalaryID = periodSalary.ID
              includRow.mask = mask
              fact.includPayEl.push(includRow)
            })
          })
        } else {
          fact = algorithmService.getFactSum({
            withDetail: true,
            withIncludPayEl: true,
            cont,
            payElID: params.payElID,
            periodCalc: periodSalary,
            periodSalary,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            periodType: 'SALARY'
          })
        }

        const retentionCont = {
          org: Object.assign({}, cont.org),
          payEl: Object.assign({}, cont.payEl),
          sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
          payFund: cont.payFund,
          periods: cont.periods,
          holidays: cont.holidays,
          dict: Object.assign({}, cont.dict),
          emp: { [cont.employeeNumberID]: { prop: Object.assign({}, cont.emp[cont.employeeNumberID].prop) } }
        }

        const payElOfftake = payEl.payElAddRetention.map(o => o.payElBaseID)
        const baseAccrual = [].concat(fact.includPayEl || [])
        autoCalculate({
          cont: retentionCont,
          orgID,
          periodID: periodSalary.ID,
          employeeNumbers: [cont.employeeNumberID],
          skipCommit: true,
          calculateProperty: {
            calcType: 1 << 4,
            calculatePayElIDs: payElOfftake,
            dateFrom: periodSalary.dateFrom,
            dateTo: periodSalary.dateTo,
            accrual: { [cont.employeeNumberID]: baseAccrual }
          }
        })
        let taxSum = 0
        retentionCont.emp[cont.employeeNumberID].accrual.forEach(alAccr => {
          if (payElOfftake.includes(alAccr.payElID)) {
            taxSum = accrualService.round(taxSum + alAccr.paySum)
          }
        })
        params.calculatedSum = params.flagsFix & 1 << 11 ? params.calculatedSum : (fact.factSum - taxSum)
        if (limitSum && (params.calculatedSum >= limitSum || Math.max(0, Math.min(accrualSum, limitSum - params.calculatedSum)) < (payEl.sumPayMore || 0))) {
          params.paySum = params.flagsFix & 1 << 1 ? params.paySum : 0
          params.paySumAccrual = params.flagsFix & 1 << 21 ? params.paySumAccrual : 0
          if (params.rateOff) {
            params.paySumOff = params.flagsFix & 1 << 20 ? params.paySumOff : (params.paySumAccrual / 100 * params.paySumOff)
          }
        } else {
          params.paySumAccrual = params.flagsFix & 1 << 21 ? params.paySumAccrual : Math.max(0, Math.min(accrualSum, limitSum ? limitSum - params.calculatedSum : accrualSum))
          if (params.rateOff) {
            params.paySumOff = params.flagsFix & 1 << 20 ? params.paySumOff : (params.paySumAccrual / 100 * params.rateOff)
          }

          let accr = Object.assign(Object.assign({}, params),
            {
              periodCalcID: periodSalary.ID,
              periodSalaryID: periodSalary.ID,
              periodCalc: periodSalary.dateFrom,
              periodSalary: periodSalary.dateFrom,
              employeeNumberID: cont.employeeNumberID,
              payElID: payEl.ID,
              paySum: (params.paySumAccrual - (params.paySumOff || 0)),
              accrualDt: [{ paySum: (params.paySumAccrual - (params.paySumOff || 0)) }]
            })
          autoCalculate({
            cont: retentionCont,
            orgID,
            periodID: periodSalary.ID,
            employeeNumbers: [cont.employeeNumberID],
            skipCommit: true,
            calculateProperty: {
              calcType: 1 << 4,
              calculatePayElIDs: payElOfftake,
              dateFrom: periodSalary.dateFrom,
              dateTo: periodSalary.dateTo,
              accrual: { [cont.employeeNumberID]: [accr] }
            }
          })
          let taxSumAcc = 0
          retentionCont.emp[cont.employeeNumberID].accrual.forEach(alAccr => {
            if (payElOfftake.includes(alAccr.payElID)) {
              taxSumAcc = accrualService.round(taxSumAcc + alAccr.paySum)
            }
          })
          params.paySum = params.flagsFix & 1 << 1 ? params.paySum : Math.max(0, (params.paySumAccrual - (params.paySumOff || 0)) + taxSumAcc / ((params.paySumAccrual - (params.paySumOff || 0)) - taxSumAcc) * (params.paySumAccrual - (params.paySumOff || 0)))
          if (limitSum) {
            accr = Object.assign({
              periodSalaryID: periodSalary.ID,
              periodSalary: periodSalary.dateFrom,
              employeeNumberID: cont.employeeNumberID,
              payElID: payEl.ID,
              paySum: params.paySum,
              dateFrom: periodSalary.dateFrom,
              dateTo: periodSalary.dateTo

            }, params)
            accr.periodCalcID = periodSalary.ID,
            accr.periodCalc = periodSalary.dateFrom
            accr.mask = mask
            accr.accrualDt = [{ paySum: params.paySum }]
            autoCalculate({
              cont: retentionCont,
              orgID,
              periodID: periodSalary.ID,
              employeeNumbers: [cont.employeeNumberID],
              skipCommit: true,
              calculateProperty: {
                calcType: 1 << 4,
                calculatePayElIDs: payElOfftake,
                dateFrom: periodSalary.dateFrom,
                dateTo: periodSalary.dateTo,
                accrual: { [cont.employeeNumberID]: (fact.includPayEl || []).concat([accr]) }
              }
            })
            taxSumAcc = 0
            retentionCont.emp[cont.employeeNumberID].accrual.forEach(alAccr => {
              if (payElOfftake.includes(alAccr.payElID)) {
                taxSumAcc = accrualService.round(taxSumAcc + alAccr.paySum)
              }
            })
            if (accrualService.round(fact.factSum + params.paySum - taxSumAcc) > limitSum) {
              params.paySum = accrualService.round(params.paySum - (accrualService.round(fact.factSum + params.paySum - taxSumAcc) - limitSum))
            }
          }
        }
        if (cont.payEl[params.payElID].isIndividualRate && orderParams && orderParams.reCalcRate && params.rate && params.additionalRate) {
          params.rate = accrualService.round(params.rate * params.additionalRate / 100)
        }
        params.sumAvg = accrualSum
        params.planSumAvg = limitSum
        result.push(Object.assign(algorithmPaySum.run({ cont, periodCalc, periodSalary, params, sourceAccr }), { idx: payElParam.idx }))
        break
      }
      case '206': {
        params.mask = 0
        if (deptIDs) {
          params.calcParams = params.calcParams ? Object.assign((typeof params.calcParams === 'object' ? params.calcParams : JSON.parse(params.calcParams)), { deptIDs }) : { deptIDs }
        }
        params.dateFromAvg = dateService.shiftDate(params.dateFromAvg || params.dateFrom)
        params.dateToAvg = dateService.shiftDate(params.dateToAvg || params.dateTo)
        const calcPeriods = periodService.getPeriodsByDate(orgID, params.dateFromAvg ? params.dateFromAvg : params.dateFrom, params.dateToAvg ? params.dateToAvg : params.dateTo)
        let calcSum = 0
        let hasTaxLimit = false
        const parentCont = {}
        if (payEl.isParentEmployeeNumber && cont.emp[cont.employeeNumberID].prop.employeeNumber.parentEmpNumberID &&
          cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom > (params.dateFromAvg ? params.dateFromAvg : params.dateFrom)) {
          cont.emp[cont.employeeNumberID].prop.parentEmpNumbers.forEach(parent => {
            if (parent.dateTo >= (params.dateFromAvg ? params.dateFromAvg : params.dateFrom)) {
              parentCont[parent.employeeNumberID] = {
                orgID: parent.orgID,
                org: orgService.getOrgData(parent.orgID),
                payEl: Object.assign({}, cont.payEl),
                sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
                payFund: cont.payFund,
                dict: Object.assign({}, cont.dict),
                periods: periodService.getArrayPeriods(parent.orgID, dateService.addMonths(periodSalaryID ? periodSalary.dateFrom : periodCalc.dateFrom, -24)),
                holidays: calendarService.getHolidays(dateService.addYears(params.dateFrom, -3), dateService.addMonths(params.dateTo, 12), parent.orgID),
                emp: { [parent.employeeNumberID]: { prop: employeeService.getEmpData(parent.employeeNumberID, dateFrom, dateTo) } },
                employeeNumberID: parent.employeeNumberID
              }
            }
          })
        }
        params.days = params.flagsFix & 1 << 6 ? params.days : 0
        params.hours = null
        calcPeriods.forEach(period => {
          period.baseSum = 0
          period.days = 0
          if (!hasTaxLimit) {
            let employeePositions = cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom)
            Object.keys(parentCont).forEach(parentEmployeeNumberID => {
              employeePositions = employeePositions.concat(parentCont[parentEmployeeNumberID].emp[parentEmployeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom))
            })
            employeePositions.forEach(employeePosition => {
              const perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, employeePosition.dateFrom))
              const perDateTo = dateService.shiftDate(Math.min(period.dateTo, employeePosition.dateTo))
              const permanentAccrual = accrualService.getPermanentAccrual(
                employeePosition.organizationID,
                employeePosition.employeeNumberID,
                employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID],
                {
                  dateFrom: perDateFrom,
                  dateTo: perDateTo
                }
              )
              const permAccrual = {
                payElID: params.payElID,
                dateFrom: perDateFrom,
                dateTo: perDateTo
              }
              const includePayEl = []
              period.baseSum = algorithmService.getPlanSum(perDateTo, employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID], permAccrual, employeePosition, permanentAccrual, includePayEl) * (payEl.isMtCount ? (employeePositions.mtCount || 1) : 1)
              const orgPeriod = employeePosition.organizationID === orgID ? period : parentCont[employeePosition.employeeNumberID].periods.find(o => o.dateFrom.getTime() === period.dateFrom.getTime())
              const periodTimeSheets = algorithmService.getTimeSheetByPeriod(orgPeriod, (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]))
              const payTime = algorithmService.getTimeByTimeSheet({ cont: (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]), payElID: params.payElID, timeSheets: periodTimeSheets, dateFrom: perDateFrom, dateTo: perDateTo })
              if (!(params.flagsFix & 1 << 6)) {
                params.days += payTime.days
              }
              if (includePayEl.length && orgPeriod) {
                includePayEl.forEach(acc => {
                  acc.periodCalcID = orgPeriod.ID
                  acc.periodSalaryID = orgPeriod.ID
                  acc.periodCalc = orgPeriod.dateFrom
                  acc.periodSalary = orgPeriod.dateFrom
                  acc.employeeNumberID = employeePosition.employeeNumberID
                  acc.dateFrom = perDateTo
                  acc.dateTo = perDateTo
                  acc.paySum = acc.paySum * (payEl.isMtCount ? (employeePositions.mtCount || 1) : 1)
                })
                const retentionCont = {
                  org: Object.assign({}, (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).org),
                  payEl: Object.assign({}, (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).payEl),
                  sicknessPayEls: Object.assign({}, (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).sicknessPayEls),
                  payFund: (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).payFund,
                  periods: (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).periods,
                  holidays: (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).holidays,
                  dict: Object.assign({}, (employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID]).dict),
                  emp: { [employeePosition.employeeNumberID]: { prop: Object.assign({}, ((employeePosition.organizationID === orgID ? cont : parentCont[employeePosition.employeeNumberID])).emp[employeePosition.employeeNumberID].prop) } }
                }

                const payElOfftake = payEl.payElAddRetention.map(o => o.payElBaseID)
                autoCalculate({
                  cont: retentionCont,
                  orgID: employeePosition.organizationID,
                  periodID: orgPeriod.ID,
                  employeeNumbers: [employeePosition.employeeNumberID],
                  skipCommit: true,
                  calculateProperty: {
                    calcType: 1 << 4,
                    calculatePayElIDs: payElOfftake,
                    dateFrom: orgPeriod.dateFrom,
                    dateTo: orgPeriod.dateTo,
                    accrual: { [employeePosition.employeeNumberID]: includePayEl.filter(o => !['204', '205', '206'].includes(cont.payEl[o.payElID].method.code)) }
                  }
                })
                let taxSum = 0
                retentionCont.emp[employeePosition.employeeNumberID].accrual.forEach(alAccr => {
                  if (payElOfftake.includes(alAccr.payElID)) {
                    taxSum = accrualService.round(taxSum + alAccr.paySum)
                    if (alAccr.taxIndividAcc) {
                      alAccr.taxIndividAcc.forEach(iAcc => {
                        if (iAcc.taxLimitID1) {
                          hasTaxLimit = true
                        }
                      })
                    }
                  }
                })
                period.baseSum = (period.baseSum - taxSum)
              }
              if (orgPeriod.dateFrom.getTime() !== perDateFrom.getTime() || orgPeriod.dateFrom.getTime() !== perDateTo.getTime()) {
                if (payTime.planDays !== 0) {
                  period.baseSum = accrualService.round(period.baseSum / payTime.planDays * payTime.days)
                }
              }
            })
          }
        })
        if (calcPeriods.length && !hasTaxLimit) {
          calcSum = accrualService.round(calcPeriods.reduce((sum, period) => {
            return sum + period.baseSum
          }, 0) / (payEl.calcPlanType === 'AVGPLAN' ? calcPeriods.length : 1))
          if (calcSum < 0) {
            calcSum = 0
          }
        } else {
          calcSum = 0
        }

        if (!(params.flagsFix & 1)) {
          params.baseSum = calcSum
        }
        params.paySumAccrual = !(params.flagsFix & 1 << 21) ? (params.baseSum * (params.rate ? (params.rate / 100) : 1)) : params.paySumAccrual

        const retentionCont = {
          org: Object.assign({}, cont.org),
          payEl: Object.assign({}, cont.payEl),
          sicknessPayEls: Object.assign({}, cont.sicknessPayEls),
          payFund: cont.payFund,
          dict: Object.assign({}, cont.dict),
          periods: cont.periods,
          holidays: cont.holidays,
          emp: { [cont.employeeNumberID]: { prop: Object.assign({}, cont.emp[cont.employeeNumberID].prop) } }
        }
        const payElOfftake = payEl.payElAddRetention.map(o => o.payElBaseID)
        const accr = Object.assign(Object.assign({}, params),
          {
            periodCalcID: periodSalary.ID,
            periodSalaryID: periodSalary.ID,
            periodCalc: periodSalary.dateFrom,
            periodSalary: periodSalary.dateFrom,
            employeeNumberID: cont.employeeNumberID,
            payElID: payEl.ID,
            paySum: params.paySumAccrual,
            accrualDt: [{ paySum: params.paySumAccrual }]
          })
        autoCalculate({
          cont: retentionCont,
          orgID,
          periodID: periodSalary.ID,
          employeeNumbers: [cont.employeeNumberID],
          skipCommit: true,
          calculateProperty: {
            calcType: 1 << 4,
            calculatePayElIDs: payElOfftake,
            dateFrom: periodSalary.dateFrom,
            dateTo: periodSalary.dateTo,
            accrual: { [cont.employeeNumberID]: [accr] }
          }
        })
        let taxSumAcc = 0
        retentionCont.emp[cont.employeeNumberID].accrual.forEach(alAccr => {
          if (payElOfftake.includes(alAccr.payElID)) {
            taxSumAcc = accrualService.round(taxSumAcc + alAccr.paySum)
          }
        })
        params.paySum = params.flagsFix & 1 << 1 ? params.paySum : Math.max(0, params.paySumAccrual + taxSumAcc / (params.paySumAccrual - taxSumAcc) * params.paySumAccrual)

        result.push(Object.assign(algorithmPaySum.run({
          cont,
          periodCalc,
          periodSalary,
          params,
          sourceAccr
        }), { idx: payElParam.idx }))
        break
      }
      default:
        const emptyResult = {
          periodCalcID: periodCalc.ID,
          periodSalaryID: periodSalary.ID,
          periodCalc: periodCalc.dateFrom,
          periodSalary: periodSalary.dateFrom,
          employeeNumberID: params.employeeNumberID,
          payElID: params.payElID,
          flagsRec: params.flagsRec,
          flagsFix: params.flagsFix,
          avgCalcType: params.avgCalcType,
          dateFromAvg: params.dateFromAvg,
          dateToAvg: params.dateToAvg,
          baseSum: params.baseSum,
          paySum: params.flagsFix & 2 ? (params.paySum || 0) : 0,
          mask: 0,
          days: params.days,
          hours: params.hours,
          planHours: params.planHours,
          planDays: params.planDays,
          mtCount: params.mtCount,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          accrualDt: []
        }
        result.push(Object.assign(emptyResult, { idx: payElParam.idx }))
    }
  })
  return result
}

function getSalaryFromRl ({ cont, periodSalary }) {
  const salaryRl = cont.emp[cont.employeeNumberID].accrual.filter(o => o.periodSalaryID === periodSalary.ID && cont.payEl[o.payElID].method.groupCode === 1)
  const result = []
  salaryRl.forEach(accr => {
    if (!(accr.flagsRec & 1 << 9) && !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 10) && !(accr.flagsRec & 1 << 16) && !(accr.flagsRec & 1 << 17)) {
      const salaryAccr = Object.assign({}, accr)
      salaryAccr.accrualDt = []
      if (accr.accrualDt && accr.accrualDt.length) {
        accr.accrualDt.forEach(dt => {
          const aDt = Object.assign({}, dt)
          delete aDt.ID
          delete aDt.accrualID
          salaryAccr.accrualDt.push(aDt)
        })
      }
      const reversal = salaryRl.filter(o => o.linkToParentID === accr.ID && ((o.flagsRec & 1 << 9) || (o.flagsRec & 1 << 10)))
      reversal.forEach(rev => {
        salaryAccr.paySum = accrualService.round(salaryAccr.paySum + rev.paySum)
        salaryAccr.baseSum = accrualService.round(salaryAccr.baseSum + rev.baseSum)
        salaryAccr.days = accrualService.round(salaryAccr.days + rev.days)
        salaryAccr.hours = accrualService.round(salaryAccr.hours + rev.hours)
        if (rev.accrualDt && rev.accrualDt.length) {
          rev.accrualDt.forEach(dt => {
            const aDt = Object.assign({}, dt)
            delete aDt.ID
            delete aDt.accrualID
            aDt.paySum *= -1
            salaryAccr.accrualDt.push(aDt)
          })
        }
      })
      if (salaryAccr.days > 0 || Math.abs(salaryAccr.hours) > 0.01 || !reversal.length) {
        if (salaryAccr.accrualDt && salaryAccr.accrualDt.length > 1) {
          algorithmService.correctAccrualDt(salaryAccr.accrualDt, salaryAccr.paySum)
        }
        result.push(salaryAccr)
      }
    }
  })
  return result
}

function unionAccrual ({ cont, calculateProperty }) {
  const unionAccrual = []
  const removeIndex = []
  const accIndex = []
  cont.emp[cont.employeeNumberID].accrual.forEach((acc, idx) => {
    if (acc.periodCalcID === cont.periodCalc.ID && acc.flagsRec & 1 << 15 && acc.flagsRec & 1 && !(acc.flagsRec & 1 << 9)) {
      unionAccrual.push(acc)
      accIndex.push(idx)
    }
  })
  unionAccrual.forEach((acc, idx) => {
    const uAcc = unionAccrual.find((o, index) => index < idx && o.payElID === acc.payElID && o.periodSalaryID === acc.periodSalaryID && o.mask === acc.mask &&
      (o.dictPositionID || null) === (acc.dictPositionID || null) &&
      Math.abs((o.rate || 0) - (acc.rate || 0)) <= 0.01 &&
      Math.abs((o.planHours || 0) - (acc.planHours || 0)) <= 0.01 &&
      Math.abs((o.planDays || 0) - (acc.planDays || 0)) <= 0.01 &&
      Math.abs((o.days || 0) - (acc.days || 0)) <= 0.01 &&
      Math.abs((o.hours || 0) - (acc.hours || 0)) <= 0.01)
    if (uAcc) {
      removeIndex.push(idx)
      uAcc.baseSum = uAcc.baseSum + acc.baseSum
      uAcc.mtCount = uAcc.mtCount ? uAcc.mtCount + acc.mtCount : null
      uAcc.paySum = accrualService.round(uAcc.paySum + acc.paySum)
      const accrualDt = algorithmService.groupAccrualDt(uAcc.accrualDt.concat(...acc.accrualDt))
      uAcc.accrualDt = algorithmService.calcGroupSumAccrualDt(accrualDt, uAcc.paySum, true)
    }
  })
  for (let i = accIndex.length - 1; i >= 0; i--) {
    cont.emp[cont.employeeNumberID].accrual.splice(accIndex[i], 1)
  }
  for (let i = removeIndex.length - 1; i >= 0; i--) {
    unionAccrual.splice(removeIndex[i], 1)
  }
  unionAccrual.forEach(accrual => {
    reduction({ cont, accrual, calculateProperty })
  })
}

function calculateOrderAccrual (orderParams, cont) {
  if (!cont) {
    cont = { emp: {} }
  }
  const orgID = orderParams.orgID
  // Дані організації
  if (!cont.org) {
    cont.org = orgService.getOrgData(orgID)
  }
  if (!cont.constants) {
    cont.constants = orgService.getOrgConstant(orgID)
  }
  // Види оплат
  if (!cont.payEl) {
    cont.payEl = payElService.getPayEl({ orgID })
  }
  // Фонди
  if (!cont.payFund) {
    cont.payFund = payFundService.getPayFund()
  }
  if (orderParams.dateFrom) {
    orderParams.dateFrom = dateService.shiftDate(orderParams.dateFrom)
  }
  if (orderParams.dateTo) {
    orderParams.dateTo = dateService.shiftDate(orderParams.dateTo)
  }
  if (!orderParams.payElParams) {
    orderParams.payElParams = []
  }
  orderParams.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  if (!cont.periodCalc) {
    cont.periodCalc = periodService.getPeriod(orderParams.periodCalcID)
  }
  if (!cont.periods) {
    cont.periods = periodService.getArrayPeriods(orgID, cont.periodCalc.dateFrom)
  }
  if (!cont.holidays) {
    cont.holidays = calendarService.getHolidays(dateService.addMonths(dateService.firstDayOfYear(cont.periodCalc.dateFrom), -24), dateService.addMonths(cont.periodCalc.dateTo, 12), orgID)
  }
  if (orderParams.calcParams) {
    try {
      orderParams.calcParams = JSON.parse(orderParams.calcParams)
    } catch (e) {
      orderParams.calcParams = null
    }
  }
  const payEl = cont.payEl[orderParams.payElID]
  if (!payEl) {
    if (orderParams.dictIllnessReasonID) {
      const illnessReason = UB.Repository('hr_dictIllnessReason')
        .attrs('name')
        .selectById(orderParams.dictIllnessReasonID)
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести документ<br>Для причини непрацездатності "{0}" не вказано вид оплати', illnessReason.name)}>>>`)
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести документ<br>Не вказано вид оплати')}>>>`)
    }
  }
  switch (payEl.method.code) {
    case '13':
    case '67':
    case '142':
      docRegService.calculateVacation({ orgID, cont, orderParams })
      break
    case '14':
    case '57':
    case '140':
      docRegService.calculateVacationKid({ orgID, cont, orderParams })
      break
    case '15':
    case '41':
      docRegService.calculateVacationUnpaid({ orgID, cont, orderParams })
      break
    case '16':
    case '71':
      docRegService.calculateCompensation({ orgID, cont, orderParams })
      break
    case '21':
      docRegService.calculateBusinessTrip({ orgID, cont, orderParams })
      break
    case '22':
      docRegService.calculateAvgMonth({ orgID, cont, orderParams })
      break
    case '23':
    case '44':
    case '68':
    case '73':
      docRegService.calculateAvgPay({ orgID, cont, orderParams })
      break
    case '58':
      docRegService.calculateRenewalPay({ orgID, cont, orderParams })
      break
    case '28':
      payRollService.calculatePayment({ orgID, cont, orderParams })
      break
    case '29':
      payRollService.calculatePrepayment({ orgID, cont, orderParams })
      break
    case '30':
      payRollService.calculateWhithinPeriod({ orgID, cont, orderParams })
      break
    case '31':
    case '61':
      payRollService.calculateAlimony({ orgID, cont, orderParams })
      break
    case '62':
      payRollService.calculateRequestEmployee({ orgID, cont, orderParams })
      break
    case '36':
    case '37':
      docRegService.calculateBountyHelp({ orgID, cont, orderParams })
      break
    case '38':
      docRegService.calculateOrder({ orgID, cont, orderParams })
      break
    case '53':
      payRollService.calculatePayFSS({ orgID, cont, orderParams })
      break
    case '135':
      docRegService.calculateOrder({ orgID, cont, orderParams })
      break
    case '50':
    case '51':
      docRegService.calculateSupAvgEarn({ orgID, cont, orderParams })
      break
    case '17':
    case '18':
    case '19':
    case '20':
    case '40':
    case '149':
      sicknessService.calculateSickness({ orgID, cont, orderParams })
      break
    case '75':
      payRollService.calculateFundSource({ orgID, cont, orderParams })
      break
  }
  return orderParams
}

function recalcOrderAccrual (cont, accruals) {
  if (accruals && accruals.length) {
    const lastAccrual = accruals[accruals.length - 1]
    const firstAccrual = accruals[0]
    switch (cont.payEl[lastAccrual.payElID].method.code) {
      case '13':
      case '67':
      case '142':
      case '16':
      case '71':
      case '21':
      case '22':
      case '23':
      case '44':
      case '68':
      case '73':
      case '17':
      case '18':
      case '19':
      case '20':
      case '40':
      case '36':
      case '37':
      case '149':
      {
        const accrualsDt = []
        const accrualsAvg = []
        let orderID = lastAccrual.orderID
        let parentAccrual
        if (firstAccrual.linkToParentID) {
          let surcharges = false
          for (let i = cont.emp[cont.employeeNumberID].accrual.length - 1; i >= 0; i--) {
            if ((!surcharges && cont.emp[cont.employeeNumberID].accrual[i].ID === firstAccrual.linkToParentID) || (
              cont.emp[cont.employeeNumberID].accrual[i].linkToParentID === firstAccrual.linkToParentID &&
                cont.emp[cont.employeeNumberID].accrual[i].flagsRec & 1 << 10
            )) {
              if (cont.emp[cont.employeeNumberID].accrual[i].linkToParentID === firstAccrual.linkToParentID &&
                  cont.emp[cont.employeeNumberID].accrual[i].flagsRec & 1 << 10) {
                surcharges = true
              }
              parentAccrual = cont.emp[cont.employeeNumberID].accrual[i]
              orderID = parentAccrual.orderID
              break
            }
          }
        }
        cont.emp[cont.employeeNumberID].accrualAvg.forEach(accAvg => {
          if (accAvg.accrualID === (parentAccrual ? parentAccrual.ID : lastAccrual.ID)) {
            accrualsAvg.push(Object.assign({}, accAvg))
          }
        })
        if (!accrualsAvg.length && orderID) {
          cont.emp[cont.employeeNumberID].accrualAvg.forEach(accAvg => {
            if (accAvg.orderID === orderID && accAvg.accrualID === null) {
              accrualsAvg.push(Object.assign({}, accAvg))
            }
          })
        }

        accruals.forEach((acc, idx) => {
          accrualsDt.push(Object.assign(Object.assign({ idx: idx }, acc), { days: acc.correctDays, paySum: acc.correctPaySum }))
        })
        let flagsFix = lastAccrual.flagsFix
        let flagsRec = lastAccrual.flagsRec
        if (parentAccrual) {
          flagsFix = flagsFix | 1 << 0 | 1 << 9 | 1 << 10 | 1 << 11 | 1 << 18 | 1 << 21 | 1 << 20 | 1 << 22
          flagsRec = flagsRec | (parentAccrual & 1 << 6) | (parentAccrual & 1 << 7) | (parentAccrual & 1 << 8)
          accrualsAvg.forEach(avg => {
            avg.flagsFix = (avg.flagsFix || 0) | 1 << 6 | 1 << 0
          })
        }
        if (['36', '37'].includes(cont.payEl[lastAccrual.payElID].method.code) && lastAccrual.avgCalcType !== 'PLAN') {
          flagsFix = flagsFix | 1 << 10 | 1 << 11
        }

        const order = {
          recalculate: true,
          orgID: cont.orgID,
          periodCalcID: cont.periodCalc,
          employeeNumberID: lastAccrual.employeeNumberID,
          payElID: lastAccrual.payElID,
          flagsFix,
          flagsRec,
          dateFrom: lastAccrual.orderDateFrom || lastAccrual.dateFrom,
          dateTo: lastAccrual.orderDateTo || accruals[accruals.length - 1].dateTo,
          baseSum: parentAccrual ? parentAccrual.baseSum : lastAccrual.baseSum,
          paySum: lastAccrual.paySum,
          avgCalcType: parentAccrual ? parentAccrual.avgCalcType : lastAccrual.avgCalcType,
          dateFromAvg: parentAccrual ? parentAccrual.dateFromAvg : lastAccrual.dateFromAvg,
          dateToAvg: parentAccrual ? parentAccrual.dateToAvg : lastAccrual.dateToAvg,
          avgSum: parentAccrual ? parentAccrual.baseSum : lastAccrual.baseSum,
          avgSumMonth: parentAccrual ? parentAccrual.baseSum : lastAccrual.baseSum,
          avgDays: parentAccrual ? parentAccrual.avgDays : lastAccrual.avgDays,
          calcSum: parentAccrual ? parentAccrual.baseSum : lastAccrual.baseSum,
          avgOnDate: parentAccrual ? parentAccrual.dateFrom : firstAccrual.dateFrom,
          accruals: accrualsDt,
          accrualsAvg: accrualsAvg,
          rate: parentAccrual ? parentAccrual.rate : lastAccrual.rate,
          planSum: lastAccrual.planSumAvg,
          countMonth: lastAccrual.koef,
          dictIllnessReasonID: lastAccrual.dictIllnessReasonID,
          standingYearMonth: lastAccrual.standingYearMonth,
          standingAll: lastAccrual.standingAll,
          indAvgPlan: lastAccrual.isAvg ? 'INDAVG' : 'INDPLAN',
          orderID: lastAccrual.orderID,
          empOrderID: lastAccrual.empOrderID,
          calcEarnings: parentAccrual ? parentAccrual.calcEarnings : lastAccrual.calcEarnings,
          dayAccumCondition: cont.payEl[lastAccrual.payElID].dayAccumCondition || cont.payEl[lastAccrual.payElID].method.dayAccumCondition || 'noDaysOff',
          calcParams: parentAccrual ? parentAccrual.calcParams : lastAccrual.calcParams
        }
        if (['13'].includes(cont.payEl[lastAccrual.payElID].method.code)) {
          order.parentID = parentAccrual ? parentAccrual.orderDtID : null
        }
        if (['17', '18', '19', '20', '40', '149'].includes(cont.payEl[lastAccrual.payElID].method.code)) {
          order.parentSicknessID = parentAccrual ? parentAccrual.orderDtID : null
        }
        const resultData = calculateOrderAccrual(order, cont)
        if (resultData) {
          switch (cont.payEl[lastAccrual.payElID].method.code) {
            case '22':
            case '36':
            case '37':
            {
              const docAccrual = lastAccrual
              if (resultData.accrualsAvg && resultData.accrualsAvg.length) {
                resultData.accrualsAvg.forEach(avg => {
                  avg.accrualDt = JSON.stringify(avg.accrualDt || [])
                  delete avg.ID
                  delete avg.idx
                  delete avg['periodID.name']
                })
              }
              if (docAccrual && Math.abs((resultData.paySum || 0) - (docAccrual.correctPaySum || 0)) >= 0.01) {
                const paySum = accrualService.round(resultData.paySum - docAccrual.correctPaySum)
                docAccrual.linkToParentID = docAccrual.ID
                delete docAccrual.ID
                delete docAccrual.idx
                delete docAccrual.correctPaySum
                delete docAccrual.correctDays
                delete docAccrual.correctHours
                docAccrual.insert = true
                docAccrual.flagsRec = ((docAccrual.flagsRec & ~(1 << 1)) | 1 << 10) | 1 << 0

                docAccrual.accrualDt = algorithmService.correctAccrualDt(docAccrual.accrualDt || [], paySum, docAccrual.paySum)
                docAccrual.baseSum = resultData.avgSumMonth
                docAccrual.paySum = paySum
                docAccrual.periodCalcID = cont.periodCalc.ID
                docAccrual.periodCalc = cont.periodCalc.dateFrom
                cont.emp[cont.employeeNumberID].accrual.push(docAccrual)
              }
              break
            }
            default: {
              resultData.accruals.forEach(accr => {
                const docAccrual = accruals[accr.idx]
                if (resultData.accrualsAvg && resultData.accrualsAvg.length) {
                  resultData.accrualsAvg.forEach(avg => {
                    avg.accrualDt = JSON.stringify(avg.accrualDt || [])
                    delete avg.ID
                    delete avg.idx
                    delete avg['periodID.name']
                  })
                }

                if (docAccrual && Math.abs((accr.paySum || 0) - (docAccrual.correctPaySum || 0)) >= 0.01) {
                  const paySum = accrualService.round(accr.paySum - docAccrual.correctPaySum)
                  // if (['23', '44', '68', '73'].includes(cont.payEl[lastAccrual.payElID].method.code)) {
                  accr.days = accr.days - accr.correctDays
                  accr.hours = accrualService.round(accr.hours - accr.correctHours, 3)
                  // }
                  delete accr.ID
                  delete accr.idx
                  delete accr.correctPaySum
                  delete accr.correctDays
                  delete docAccrual.correctHours
                  accr.insert = true
                  accr.flagsRec = ((accr.flagsRec & ~(1 << 1)) | 1 << 10) | 1 << 0
                  accr.linkToParentID = docAccrual.ID
                  accr.accrualDt = algorithmService.correctAccrualDt(accr.accrualDt || [], paySum, accr.paySum)
                  accr.accrualAvg = resultData.accrualsAvg
                  accr.paySum = paySum
                  accr.periodCalcID = cont.periodCalc.ID
                  accr.periodCalc = cont.periodCalc.dateFrom
                  cont.emp[cont.employeeNumberID].accrual.push(accr)
                }
              })
            }
          }
        }
        break
      }
    }
  }
}

function calculateOrderAccrualDt (orderParams = {}) {
  const cont = { emp: {} }
  cont.employeeNumberID = orderParams.employeeNumberID
  loadCalcData({ cont, orgID: orderParams.orgID, periodID: orderParams.periodID, employeeNumbers: [orderParams.employeeNumberID], loadData: { prop: true } })
  return postingService.getAccrualDt({ cont, params: orderParams })
}

function getCalcAccrual (cont, orgID, employeeNumbers, periodID, description, loadData) {
  const recalcEmployeeNumbers = UB.Repository('hr_employeeNumState')
    .attrs(['employeeNumberID'])
    .where('flags', '=', 0)
    .where('employeeNumberID', 'in', employeeNumbers)
    .selectAsObject()
  if (recalcEmployeeNumbers.length && ((loadData && !loadData.skipAutoCalc) || !loadData)) {
    const payCalcID = startPayCalc(orgID, recalcEmployeeNumbers.length, 0, description)
    autoCalculate({ cont, orgID, periodID, payCalcID, employeeNumbers: recalcEmployeeNumbers.map(o => o.employeeNumberID), skipCommit: true })
    stopPayCalc(payCalcID)
  }
  if (loadData) {
    loadCalcData({ cont, orgID, periodID, employeeNumbers, loadData })
  }
}

function loadCalcData ({ cont, orgID, periodID, employeeNumbers, loadData }) {
  const periodCalc = periodService.getPeriod(periodID)
  cont.orgID = orgID
  if (!cont.org) {
    cont.org = orgService.getOrgData(orgID)
  }
  if (!cont.constants) {
    cont.constants = orgService.getOrgConstant(orgID)
  }
  // Види оплат
  if (!cont.payEl) {
    cont.payEl = payElService.getPayEl({ orgID })
  }
  // Фонди
  if (!cont.payFund) {
    cont.payFund = payFundService.getPayFund()
  }
  if (!cont.dict) {
    contService.initDict(cont) // Встановлення записів довідників (наприклад: cont.dict.hr_dictLivingCost )
  }
  if (!cont.periodCalc) {
    cont.periodCalc = periodService.getPeriod(periodID)
  }
  if (!cont.periods) {
    cont.periods = periodService.getArrayPeriods(orgID, cont.periodCalc.dateFrom)
  }
  if (!cont.holidays) {
    cont.holidays = calendarService.getHolidays(dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -24), dateService.addMonths(periodCalc.dateTo, 12), orgID)
  }
  if (!cont.emp) {
    cont.emp = {}
  }
  if (loadData) {
    const loadDateFrom = loadData.dateFrom || dateService.addMonths(dateService.firstDayOfYear(periodCalc.dateFrom), -24)
    const loadDateTo = loadData.dateTo || dateService.addMonths(periodCalc.dateTo, 12)
    if (loadData.prop) {
      const skipSecondJobs = loadData.skipSecondJobs === undefined ? true : loadData.skipSecondJobs
      const skipParentEmployee = !!loadData.skipParentEmployee
      employeeService.loadEmployeeData({ orgID, cont, employeeNumbers, dateFrom: loadDateFrom, dateTo: loadDateTo, skipSecondJobs, skipParentEmployee, entityList: loadData.entityList })
    }
    if (loadData.accrual) {
      employeeNumbers.forEach(employeeNumberID => {
        cont.emp[employeeNumberID].accrual = accrualService.getAccrual(orgID, employeeNumberID, loadDateFrom)
        cont.emp[employeeNumberID].accrualFund = accrualService.getFundAccrual(orgID, employeeNumberID, loadDateFrom)
        cont.emp[employeeNumberID].accrualBalanceOut = accrualService.getAccrualBalance(employeeNumberID, periodCalc.ID)
        if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.parentEmpNumbers) {
          cont.emp[employeeNumberID].prop.parentEmpNumbers.forEach(parent => {
            const accruals = accrualService.getAccrual(parent.orgID, parent.employeeNumberID, loadDateFrom)
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
              cont.emp[employeeNumberID].accrual.push(Object.assign({}, accr))
            })
          })
        }
        if (loadData.prop) {
          if (cont.emp[employeeNumberID].accrual.length) {
            let minPeriodSalary = cont.emp[employeeNumberID].accrual[0].periodSalary.getTime()
            for (let i = 1; i < cont.emp[employeeNumberID].accrual.length; i++) {
              let periodSalaryTime = cont.emp[employeeNumberID].accrual[i].periodSalary.getTime()
              if (periodSalaryTime < minPeriodSalary) {
                minPeriodSalary = periodSalaryTime
              }
            }
            // дозавантажуємо табель
            if (loadDateFrom > minPeriodSalary) {
              employeeService.loadEmployeeTimeSheet({ cont, empNumbers: [employeeNumberID], dateFrom: dateService.shiftDate(minPeriodSalary), dateTo: dateService.addDays(loadDateFrom, -1) })
            }
          }
        }
      })
    }
  }
}

function autoCalculateBalance ({ cont = {}, orgID, periodID, employeeNumbers = [] }) {
  const store = UB.DataStore('hr_employeeNumState')
  // Дані періода
  if (!cont.periodCalc) {
    cont.periodCalc = periodService.getPeriod(periodID)
  }
  // Види оплат
  if (!cont.payEl) {
    cont.payEl = payElService.getPayEl({ orgID })
  }

  if (!cont.emp) {
    cont.emp = {}
  }

  employeeNumbers.forEach(employeeNumber => {
    cont.employeeNumberID = typeof employeeNumber === 'object' ? employeeNumber.employeeNumberID : employeeNumber
    if (!cont.emp[cont.employeeNumberID]) {
      cont.emp[cont.employeeNumberID] = {}
    }
    cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(orgID, cont.employeeNumberID, cont.periodCalc.dateFrom, false, cont.periodCalc.dateTo)
    accrualService.savePeriodEmpBalance(cont, cont.periodCalc)
    try {
      if (typeof employeeNumber === 'object') {
        if (!employeeNumber.ID) {
          employeeNumber.ID = UB.Repository('hr_employeeNumState').attrs(['ID'])
            .where('employeeNumberID', '=', cont.employeeNumberID)
            .selectScalar()
        }
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: employeeNumber.ID,
            mi_modifyDate: employeeNumber.mi_modifyDate,
            flags: 1
          }
        })
      } else {
        const employeeNumStateID = UB.Repository('hr_employeeNumState').attrs(['ID'])
          .where('employeeNumberID', '=', employeeNumber)
          .selectScalar()
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: employeeNumStateID,
            flags: 1
          }
        })
      }
    } catch (error) {
      console.error(error)
    }
    App.dbCommit()
  })
  paySummaryService.savePeriodOrgBalance(orgID, cont.periodCalc)
}

function getAccrualReCalcDate (orgID, employeeNumberID, periodCalcID, minReCalcDate = null) {
  const accrual = UB.Repository('hr_accrual')
    .attrs(['MIN([periodSalary])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodCalcID', '=', periodCalcID)
    .where(`(flagsRec & 1 != 1) `, 'custom')
    .whereIf(minReCalcDate, 'periodSalary', '>=', minReCalcDate)
    .limit(1)
    .selectSingle()
  return accrual ? dateService.shiftDate(accrual['MIN([periodSalary])']) : null
}

function getAccrualFundDtByBaseSum (fund, cont, periodCalc, periodSalary) {
  const fact = algorithmService[fund.calcPeriod === 'SALARY' ? 'getFactSum' : 'getFactSumFund'](
    {
      withDetail: true,
      withPayElID: true,
      cont,
      periodCalc: fund.calcPeriod === 'SALARY' ? periodSalary : periodCalc,
      periodSalary,
      dateFrom: periodSalary.dateFrom,
      dateTo: periodSalary.dateTo,
      payElBase: fund.payFundBase,
      payElExclude: fund.payFundExclude,
      finishWork: cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork,
      periodType: fund.calcPeriod
    })
  fact.accrualDt.forEach(row => {
    row.payElID = null
    row.sourceSum = 0
  })
  return fact.accrualDt
}

function getAllAccrualFundDt (accrualFundList, periodSalary) {
  const accrualFundDt = []
  accrualFundList.filter(o => o.periodSalaryID === periodSalary.ID)
    .forEach(fund => {
      accrualFundDt.push(...fund.accrualFundDt)
    })
  return accrualFundDt
}

function getFactSumWithTrfRules (perAccr, trfCalcRule, factSum) {
  let result = {
    sum: 0,
    fixBaseSum: false
  }
  if (!(perAccr.flagsFix & 1 << 8)) {
    if (trfCalcRule && !['1', '2', '3'].includes(trfCalcRule.calcRuleID)) result.sum = perAccr.mtCount < perAccr.accrualRate ? factSum : accrualService.round((factSum * perAccr.accrualRate) / perAccr.mtCount, 3)
    if ((trfCalcRule && ['1', '2', '3'].includes(trfCalcRule.calcRuleID)) || !trfCalcRule) result.sum = factSum
  } else {
    result.sum = perAccr.baseSum
    result.fixBaseSum = true
  }
  return result
}

function reductionAccrual ({ cont, accrual, ID }) {
  const reversalAccruals = []
  cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
    if (accr.payElID === accrual.payElID && (!(accr.flagsRec & 1) || accr.periodCalcID !== accrual.periodCalcID) &&
      (!ID || ID !== accr.ID) &&
      ((cont.payEl[accrual.payElID].periodType === 'SALARY' && accr.periodSalaryID === accrual.periodSalaryID) ||
        (cont.payEl[accrual.payElID].periodType !== 'SALARY' && accr.periodCalcID === accrual.periodCalcID)) &&
      ((accr.flagsRec & 1) || (accr.flagsRec & 1 << 3) || (accr.flagsRec & 1 << 2)) &&
      !(accr.flagsRec & 1 << 12) && !(accr.flagsRec & 1 << 1) && (!(accr.flagsRec & 1 << 9) || !accr.linkToParentID) && !accr.orderID) {
      const reversalAccrual = []
      let isCorrect = false
      cont.emp[cont.employeeNumberID].accrual.forEach(o => {
        if (o.linkToParentID === accr.ID &&
          (o.flagsRec & 1 << 9) && !(o.flagsRec & 1 << 12) && (!o.sourceID || (o.sourceID || null) === (accr.sourceID || null))) {
          reversalAccrual.push(o)
        }
      })
      if (!isCorrect) {
        const acc = Object.assign({}, accr)
        let mask = acc.mask || 0
        let maskAdd = acc.maskAdd || 0
        let paySum = acc.paySum
        let baseSum = acc.baseSum || 0
        delete acc.taxIndividAcc
        if (accr.taxIndividAcc && accr.taxIndividAcc.length) {
          acc.taxIndividAcc = []
          accr.taxIndividAcc.forEach(taxIndivud => {
            const taxInd = Object.assign({}, taxIndivud)
            delete taxInd.ID
            delete taxInd.accrualID
            taxInd.taxSum *= -1
            taxInd.incomeSum *= -1
            taxInd.taxFreeSum *= -1
            taxInd.privilegeSum *= -1
            acc.taxIndividAcc.push(taxInd)
          })
        }
        delete acc.accrualDt
        if (accr.accrualDt && accr.accrualDt.length) {
          acc.accrualDt = []
          accr.accrualDt.forEach(dt => {
            const aDt = Object.assign({}, dt)
            delete aDt.ID
            delete aDt.accrualID
            aDt.paySum *= -1
            acc.accrualDt.push(aDt)
          })
        } else {
          acc.accrualDt = [{ paySum: -1 * acc.paySum }]
        }
        reversalAccrual.forEach(rev => {
          mask = mask & ~(rev.mask || 0)
          maskAdd = maskAdd & ~(rev.maskAdd || 0)
          paySum = accrualService.round(paySum + rev.paySum)
          baseSum = accrualService.round(baseSum + rev.baseSum)
          if (rev.accrualDt && rev.accrualDt.length) {
            rev.accrualDt.forEach(dt => {
              const aDt = Object.assign({}, dt)
              delete aDt.ID
              delete aDt.accrualID
              aDt.paySum *= -1
              acc.accrualDt.push(aDt)
            })
          }
          if (rev.taxIndividAcc && rev.taxIndividAcc.length) {
            rev.taxIndividAcc.forEach(taxIndivud => {
              const taxIndividEx = acc.taxIndividAcc ? acc.taxIndividAcc.find(o => o.taxIndividID === taxIndivud.taxIndividID) : null
              if (taxIndividEx) {
                taxIndividEx.taxSum = accrualService.round(taxIndividEx.taxSum + (-1 * taxIndivud.taxSum))
                taxIndividEx.incomeSum = accrualService.round(taxIndividEx.incomeSum + (-1 * taxIndivud.incomeSum))
                taxIndividEx.taxFreeSum = accrualService.round(taxIndividEx.taxFreeSum + (-1 * taxIndivud.taxFreeSum))
                taxIndividEx.privilegeSum = accrualService.round(taxIndividEx.privilegeSum + (-1 * taxIndivud.privilegeSum))
              } else {
                const taxInd = Object.assign({}, taxIndivud)
                delete taxInd.ID
                delete taxInd.accrualID
                taxInd.taxSum *= -1
                taxInd.incomeSum *= -1
                taxInd.taxFreeSum *= -1
                taxInd.privilegeSum *= -1
                acc.taxIndividAcc.push(taxInd)
              }
            })
          }
        })
        let isAdd = Math.abs(paySum) >= 0.01 || reversalAccrual.length === 0
        if (!isAdd && acc.taxIndividAcc && acc.taxIndividAcc.length) {
          acc.taxIndividAcc.forEach(accAvg => {
            if (accAvg.taxSum !== 0 || accAvg.incomeSum !== 0 || accAvg.privilegeSum !== 0) {
              isAdd = true
            }
          })
        }
        if (isAdd) {
          acc.insert = true
          acc.periodCalcID = accrual.periodCalcID
          acc.periodCalc = accrual.periodCalc
          acc.linkToParentID = acc.ID
          acc.mask = mask
          acc.flagsRec = (((acc.flagsRec | 1 << 9) & ~(1 << 3)) | 1)
          acc.paySum = -1 * paySum
          acc.baseSum = -1 * baseSum
          acc.calculateDate = dateService.currentDateTime()
          acc.planHours = acc.planHours ? -1 * acc.planHours : acc.planHours
          acc.planDays = acc.planDays ? -1 * acc.planDays : acc.planDays
          acc.days = acc.days ? -1 * acc.days : acc.days
          acc.hours = acc.hours ? -1 * acc.hours : acc.hours
          if (accr.flagsRec & 1 << 3) {
            acc.importAccrual = true
            if (!!acc.hours && !(acc.flagsRec & 1 << 5)) {
              const pos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= acc.dateFrom && o.dateTo >= acc.dateFrom)
              acc.flagsRec = acc.flagsRec | ((pos && pos.payElID && cont.payEl[pos.payElID].calcProportion !== 'DAY') ? 1 << 5 : 0)
            }
          }
          delete acc.accrualAvg
          if (accr.accrualAvg && accr.accrualAvg.length) {
            acc.accrualAvg = []
            accr.accrualAvg.forEach(accAvg => {
              const avg = Object.assign({}, accAvg)
              delete avg.ID
              delete avg.accrualID
              acc.accrualAvg.push(avg)
            })
          }
          delete acc.ID
          reversalAccruals.push(acc)
        }
      }
    }
  })
  if (reversalAccruals.length) {
    accrualService.calcReversalAccrual(cont, accrual, reversalAccruals)
    return accrual
  } else {
    return accrual
  }
}

function isFindTrfAccrual (perAccr, accr, i, accrArray, trfCalcRule) {
  const calcRule = trfCalcRule.find(o => o.payElID === perAccr.payElID)
  const dictCalcRule = calcRule ? calcRule.calcRuleID : null
  let result = false
  if (dictCalcRule) {
    switch (dictCalcRule) {
      case '1':
      case '2':
      case '3':
      case '5':
      case '7':  
        // накладаємо обмеження по одному нарахуванню доплати на усі посадові місця згідно правила (groupID - робоче місце тарифікації)
        if ((accrArray.findIndex((o, i) => o.groupID === accr.groupID && o.dateFrom.getTime() === accr.dateFrom.getTime()) === i)) result = true
        break
      case '4':
      case '6':
      case '8':  
      case '9':  
        if ((accrArray.findIndex((o, i) => o.trfPositionID === perAccr.trfPositionID) === i)) result = true
        break
    }
  } else {
    result = true
  }
  return result
}
