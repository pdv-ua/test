/**
 * Відпустка
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const mask = params.mask || algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  const maskAdd = params.maskAdd || 0
  const paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(params.baseSum * params.days * (params.koef || 1), cont.payEl[params.payElID].roundUpTo)
  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    avgCalcType: params.avgCalcType,
    dateFromAvg: params.dateFromAvg,
    dateToAvg: params.dateToAvg,
    baseSum: params.baseSum,
    paySum,
    mask: mask,
    maskAdd: maskAdd,
    days: params.days,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    empOrderID: params.empOrderID || null,
    timeSheetID: params.timeSheetID || null,
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
