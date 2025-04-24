/**
 * Резерв
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const mtCount = params.mtCount || 1
  let paySum = params.rate ? (params.baseSum * params.rate / 100) : (params.baseSum * params.koef)
  paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(paySum, cont.payEl[params.payElID].roundUpTo)
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
    mask: 0,
    koef: params.koef,
    mtCount: mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    dateFromAvg: params.dateFromAvg,
    dateToAvg: params.dateToAvg,
    baseDate: params.baseDate,
    sumAvg: params.sumAvg,
    dictFundSourceID: params.dictFundSourceID,
    dictProgClassID: params.dictProgClassID,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    calendarDays: params.calendarDays,
    paySumAccrual: params.paySumAccrual,
    standingAll: params.standingAll,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr,
      params: {
        flagsFix,
        dictFundSourceID: params.dictFundSourceID || null,
        dictProgClassID: params.dictProgClassID || null,
        dictProjectID: params.dictProjectID || null,
        accrualDt: params.accrualDt || null,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        payElID: params.payElID,
        paySum,
        rate: params.rate
      }
    })
  }
}
