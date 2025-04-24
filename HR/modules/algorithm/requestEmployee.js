/**
 * Перерахування за заявою працівника
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySum = 0
  if (params.mask === undefined) {
    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  }
  if (params.rate) {
    paySum = Math.max(params.baseSum * params.rate / 100, 0)
  } else {
    paySum = Math.max(params.baseSum, 0)
  }
  if (cont.payEl[params.payElID].calcSumType === 'PLAN' && params.rate && !params.dailyWage) {
    paySum = params.planDays ? (paySum / params.planDays) * params.days : 0
  }
  if (params.dailyWage) {
    paySum = cont.payEl[params.payElID].calcSumType === 'PLAN' ? (params.planDays ? (paySum / params.planDays) : 0) : (params.days ? (paySum / params.days) : 0)
  }

  params.calculatedSum = accrualService.roundPayEl(paySum, cont.payEl[params.payElID].roundUpTo)
  if (params.balance === undefined) {
    params.balance = paySum
  }
  paySum = (flagsFix & 1 << 1) ? params.paySum : accrualService.roundPayEl(Math.max(Math.min(paySum, params.balance), 0), cont.payEl[params.payElID].roundUpTo)
  if (!sourceAccr) {
    sourceAccr = {}
  }
  sourceAccr.accrualDt = algorithmService.correctAccrualDt(sourceAccr && sourceAccr.accrualDt ? sourceAccr.accrualDt : [], paySum)

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    baseSum: params.baseSum,
    rate: params.rate,
    paySum,
    calculatedSum: params.calculatedSum,
    mask: params.mask,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr,
      params: {
        flagsFix,
        periodSalary,
        dictFundSourceID: params.dictFundSourceID || null,
        dictProgClassID: params.dictProgClassID || null,
        dictProjectID: params.dictProjectID || null,
        accrualDt: params.accrualDt || null,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        payElID: params.payElID,
        paySum
      }
    })
  }
}
