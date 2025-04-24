/**
 * Профспілковий внесок
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySum = 0
  if (params.rate) {
    paySum = params.baseSum * params.rate / 100
  }
  if (params.mask === undefined) {
    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  }
  const paySumSecJobs = cont.payEl[params.payElID].includeSecondJobs
    ? algorithmService.getSumSecJobs(cont, params.employeeNumberID, periodSalary.ID, params.payElID)
    : { paySum: 0, baseSum: 0 }
  paySum = (flagsFix & 1 << 1) ? params.paySum : accrualService.roundPayEl(paySum - paySumSecJobs.paySum, cont.payEl[params.payElID].roundUpTo)
  if (paySumSecJobs.baseSum !== 0 && !(params.flagsFix & 1)) {
    params.baseSum = accrualService.round(params.baseSum - paySumSecJobs.baseSum)
  }
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
