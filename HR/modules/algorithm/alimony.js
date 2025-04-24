/**
 * Аліменти
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0

  let paySum = (flagsFix & 1 << 1)
    ? params.paySum
    : accrualService.roundPayEl(params.repaymentSum + params.repaymentDebtSum, cont.payEl[params.payElID].roundUpTo)
  if (params.mask === undefined) {
    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  }
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
    days: params.days,
    hours: params.hours,
    mask: params.mask,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    incomingDebtSum: params.incomingDebtSum,
    repaymentDebtSum: params.repaymentDebtSum,
    calculatedSum: params.calculatedSum,
    repaymentSum: params.repaymentSum,
    basePayment: params.basePayment,
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
    // accrualDt: algorithmService.correctAccrualDt(sourceAccr && sourceAccr.accrualDt ? sourceAccr.accrualDt : [], paySum)
  }
}
