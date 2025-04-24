/**
 * Виплата суми
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const mask = params.mask || algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  let paySumAccrual = params.paySum
  let paySum = 0
  if (['205'].includes(cont.payEl[params.payElID].method.code)) {
    paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(paySumAccrual, cont.payEl[params.payElID].roundUpTo, true)
  } else {
    if (params.rate) {
      paySumAccrual = paySumAccrual * params.rate / 100
    }
    if (params.rateOff) {
      params.paySumOff = paySumAccrual * params.rateOff / 100
    }
    paySumAccrual = Number.isFinite(paySumAccrual) ? accrualService.roundPayEl(paySumAccrual, cont.payEl[params.payElID].roundUpTo) : 0
    paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(paySumAccrual - (params.paySumOff || 0), cont.payEl[params.payElID].roundUpTo, true)
  }
  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    planDays: params.planDays || null,
    planHours: params.planHours || null,
    hours: params.hours,
    days: params.days,
    flagsFix,
    rateOff: params.rateOff || 0,
    paySumOff: params.paySumOff || 0,
    mtCount: params.mtCount || null,
    avgCalcType: params.avgCalcType,
    dateFromAvg: params.dateFromAvg,
    dateToAvg: params.dateToAvg,
    baseSum: params.baseSum,
    sumAvg: params.sumAvg || null,
    rate: params.rate || null,
    planSumAvg: params.planSumAvg || null,
    calculatedSum: params.calculatedSum || null,
    paySumAccrual: params.paySumAccrual || null,
    paySum,
    mask: mask,
    reason: params.reason,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr: sourceAccr || { accrualDt: [], periodCalc },
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
