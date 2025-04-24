/**
 * Доплата до середнього заробітку
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const mask = params.mask || algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  const calcSum = accrualService.roundPayEl(params.sumAvg * params.planDays - params.baseSum, cont.payEl[params.payElID].roundUpTo)
  const paySum = (flagsFix & 2) ? params.paySum : calcSum > 0 ? calcSum : 0

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    mask,
    sumAvg: params.sumAvg,
    baseSum: params.baseSum,
    paySum,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount || 1,
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
        payElID: params.payElID,
        dateTo: params.dateTo,
        paySum
      }
    })
  }
}
