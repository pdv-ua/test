/**
 * Доплата за роботу в надурочний час
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySum = (flagsFix & 1 << 1)
    ? params.paySum
    : ((params.hours > 0)
      ? accrualService.roundPayEl((params.baseSum / params.planHours * params.hours *
      (sourceAccr && sourceAccr.leadAccr
        ? ((sourceAccr && sourceAccr.leadAccr && cont.payEl[sourceAccr.leadAccr.payElID].method.code === '63') ||
        cont.payEl[params.payElID].method.code === '9' ? 1 : 2)
        : 1) *
        (params.mtCount || 1) *
        (params.rate ? (params.rate || 0) / 100 : 1)
      ) || 0,
      cont.payEl[params.payElID].roundUpTo)
      : 0)
  paySum = Number.isFinite(paySum) ? paySum : 0
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
    paySum,
    rate: params.rate,
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
