/**
 * Заміна
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySum = (flagsFix & 1 << 1)
    ? params.paySum
    : accrualService.roundPayEl((params.baseSum /
      ((params.flagsRec && params.flagsRec & (1 << 5)) ? params.planHours : params.planDays) *
      ((params.flagsRec && params.flagsRec & (1 << 5)) ? params.hours : params.days) *
      // (params.mtCount || 1) *
      ((params.rate !== null && params.rate >= 0) ? (params.rate / 100) : 1)) || 0, cont.payEl[params.payElID].roundUpTo)
  paySum = Number.isFinite(paySum) ? paySum : 0

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    missingEmployeeNumberID: params.missingEmployeeNumberID,
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
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr,
      params: {
        periodSalary,
        flagsFix,
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
