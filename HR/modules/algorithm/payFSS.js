/**
 * Виплата за рахунок СС
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params }) => {
  const flagsFix = params.flagsFix || 0
  const paySum = accrualService.roundPayEl(params.paySum, cont.payEl[params.payElID].roundUpTo)
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
    reason: params.paySum < 0.01 ? '1' : '0',
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
        dateTo: params.dateTo,
        payElID: params.payElID,
        paySum
      }
    }))
  }
}
