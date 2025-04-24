/**
 * Доплата до мінімальної
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const timeKoef = ((!params.flagsRec || params.flagsRec & 1 << 5) && cont.payEl[params.payElID].isNormMinSum)
    ? (params.planHours > params.hours ? params.planHours / params.hours : 1)
    : (params.planDays > params.days ? params.planDays / params.days : 1)

  let paySum = (flagsFix & 1 << 1)
    ? params.paySum
    : accrualService.roundPayEl(params.baseSum > 0 ? Math.max(0, (((params.minSum || 0) * (params.mtCount || 1)) / timeKoef - params.baseSum)) : 0,
      cont.payEl[params.payElID].roundUpTo)

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
    minSalarySum: params.minSum,
    paySum,
    mtCount: params.mtCount,
    mask: params.mask,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
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
