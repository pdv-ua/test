/**
 * Нарахування за окладом
 */
const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const payEl = cont.payEl[params.payElID]
  const flagsFix = params.flagsFix || 0
  params.mtCount = (params.flagsFix & 1 << 8) ? params.mtCount : (cont.payEl[params.payElID].isMtCount ? (params.mtCount || 1) : 1)
  const baseSum = (cont.payEl[params.payElID].method.code === '137' && !params.rate) ? (params.baseSum * 2 / 3) : params.baseSum
  let paySum = (flagsFix & 1 << 1) ? params.paySum
    : accrualService.roundPayEl(
      (!(params.flagsRec & 1 << 5 ? params.planHours : params.planDays) ? 0
        : (baseSum / (params.flagsRec & 1 << 5 ? params.planHours : params.planDays) *
      (params.flagsRec & 1 << 5 ? params.hours : params.days) *
      (params.mtCount || 1) *
      ((params.rate !== null && params.rate >= 0) ? (params.rate / 100) : 1))) || 0,
      payEl.roundUpTo)
  if (params.remindSum || params.remindSum === 0) {
    paySum = Math.min(params.remindSum, paySum)
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
    mask: params.mask,
    baseSum: params.baseSum,
    paySum,
    rate: params.rate || null,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    leadingHoursByDays: params.leadingHoursByDays,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    dictPositionID: params.dictPositionID || null,
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
    }),
    trfPositionID: params.trfPositionID || null,
    dictPupilID: params.dictPupilID || null

  }
}
