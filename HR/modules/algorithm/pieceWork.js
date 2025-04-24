/**
 * Відрядна оплата праці
 */
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params }) => {
  const flagsFix = params.flagsFix || 0
  params.mtCount = (params.flagsFix & 1 << 8) ? params.mtCount : (cont.payEl[params.payElID].isMtCount ? (params.mtCount || 1) : 1)
  let paySum = (flagsFix & 1 << 1) ? params.paySum : 0
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
    mask: params.mask,
    baseSum: params.baseSum,
    paySum,
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
