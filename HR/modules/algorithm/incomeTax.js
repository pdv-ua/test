/**
 * ПДФО
 */
const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let paySum = 0
  let baseSum = 0
  let accrualDt = []
  const taxIndividAcc = []
  cont.payEl[params.payElID].payElTaxIndividEntry.filter(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
    .sort((a, b) => a['priority'] - b['priority']).forEach(individ => {
      const individAcc = sourceAccr.allTaxIndividAcc.find(o => o.taxIndividID === individ.taxIndividID)
      if (individAcc) {
        const ind = Object.assign({}, individAcc)
        delete ind.accrualDt
        taxIndividAcc.push(ind)
        paySum = accrualService.round(paySum + ind.taxSum)
        baseSum = accrualService.round(baseSum + ind.incomeSum)
        individAcc.accrualDt.forEach(row => {
          accrualDt.push(Object.assign({}, row))
        })
      }
    })
  paySum = (flagsFix & 1 << 1) ? params.paySum : accrualService.roundPayEl(paySum, cont.payEl[params.payElID].roundUpTo)
  params.baseSum = (flagsFix & 1 << 0) ? params.baseSum : baseSum
  if (!sourceAccr) {
    sourceAccr = {}
  }
  sourceAccr.accrualDt = algorithmService.calcGroupSumAccrualDt(accrualDt, paySum)
  return {
    taxIndividAcc: taxIndividAcc,
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
    mask: params.mask,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
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
