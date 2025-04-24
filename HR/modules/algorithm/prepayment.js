/**
 * Виплата аванса
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params }) => {
  const flagsFix = params.flagsFix || 0
  const mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  const paySum = accrualService.roundPayEl(params.paySum, cont.payEl[params.payElID].roundUpTo, true)
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
    reason: params.reason,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    accrualDt: JSON.stringify(postingService.getAccrualDt({
      cont,
      sourceAccr: { accrualDt: JSON.parse(params.accrualDt), periodCalc },
      params: {
        flagsFix,
        dictFundSourceID: params.dictFundSourceID || null,
        dictProgClassID: params.dictProgClassID || null,
        dictProjectID: params.dictProjectID || null,
        accrualDt: params.accrualDt || null,
        dateFrom: params.dateFrom,
        payElID: params.payElID,
        dateTo: params.dateTo,
        paySum
      }
    }))
  }
}
