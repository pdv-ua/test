/**
 * Постійна надбавка
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySumAccrual = (flagsFix & 1 << 21)
    ? params.paySumAccrual
    : (cont.payEl[params.payElID].method.code === '4' && params.fromExtraPay && !cont.payEl[params.payElID].isTimeSheet
      ? params.baseSum
      : accrualService.roundPayEl((params.baseSum / ((((!params.flagsRec || params.flagsRec & 1 << 5)) ? params.planHours : params.planDays) /
        ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)) * (cont.payEl[params.payElID].isMtCount ? (params.mtCount || 1) : 1) *
        ((params.rate !== null && params.rate >= 0) ? (params.rate / 100) : 1)) || 0, cont.payEl[params.payElID].roundUpTo))
  paySumAccrual = Number.isFinite(paySumAccrual) ? paySumAccrual : 0

  paySumAccrual = Number.isFinite(paySumAccrual) ? accrualService.roundPayEl(paySumAccrual, cont.payEl[params.payElID].roundUpTo) : 0
  if (params.rateOff) {
    params.paySumOff = (paySumAccrual * params.rateOff / 100)
  }

  const paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(paySumAccrual - (params.paySumOff || 0), cont.payEl[params.payElID].roundUpTo)
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
    paySumAccrual,
    paySum,
    rateOff: params.rateOff || 0,
    paySumOff: params.paySumOff || 0,
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
