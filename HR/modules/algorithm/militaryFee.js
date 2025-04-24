/**
 * Військовий збір
 */

const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const taxIndividAcc = []
  let paySum = 0

  const accrualDt = sourceAccr && sourceAccr.accrualDt ? sourceAccr.accrualDt : []
  const taxFreeSum = {}
  if (!(flagsFix & 1)) {
    cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
      if (cont.payEl[accr.payElID].method.code === '26' && ((cont.payEl[params.payElID].periodType === 'CALC' && accr.periodCalcID === periodCalc.ID) ||
          (cont.payEl[params.payElID].periodType !== 'CALC' && accr.periodSalaryID === periodSalary.ID)) &&
        !(accr.flagsRec & 1 << 12) && accr.taxIndividAcc && accr.taxIndividAcc.length) {
        accr.taxIndividAcc.forEach(taxIndivid => {
          if (taxIndivid.taxFreeSum) {
            if (taxFreeSum[taxIndivid.taxIndividID]) {
              taxFreeSum[taxIndivid.taxIndividID] = accrualService.round(taxFreeSum[taxIndivid.taxIndividID] + taxIndivid.taxFreeSum)
            } else {
              taxFreeSum[taxIndivid.taxIndividID] = taxIndivid.taxFreeSum
            }
          }
        })
      }
    })
  }
  accrualDt.forEach(row => {
    row.paySum = accrualService.round(row.paySum * (params.rate || 0) / 100, 4)
    if (row.payElID) {
      const payElTaxIndivid = cont.payEl[row.payElID].payElTaxIndivid.find(o => o.dateFrom <= params.dateTo && o.dateTo >= params.dateFrom)
      if (payElTaxIndivid) {
        let freeSumm = 0
        if (taxFreeSum[payElTaxIndivid.taxIndividID]) {
          freeSumm = Math.min(row.sourceSum, taxFreeSum[payElTaxIndivid.taxIndividID])
          taxFreeSum[payElTaxIndivid.taxIndividID] = taxFreeSum[payElTaxIndivid.taxIndividID] - freeSumm
          // row.sourceSum = row.sourceSum
          row.paySum = accrualService.round((row.sourceSum - freeSumm) * (params.rate || 0) / 100, 4)
          params.baseSum = accrualService.round(params.baseSum - freeSumm)
        }

        const taxIndivid = taxIndividAcc.find(o => o.taxIndividID === payElTaxIndivid.taxIndividID)
        if (taxIndivid) {
          taxIndivid.incomeSum = accrualService.round(taxIndivid.incomeSum + row.sourceSum)
          taxIndivid.taxSum = accrualService.round(taxIndivid.taxSum + row.paySum, 4)
          taxIndivid.taxFreeSum = accrualService.round(taxIndivid.taxFreeSum + freeSumm)
        } else {
          taxIndividAcc.push({
            taxIndividID: payElTaxIndivid.taxIndividID,
            incomeSum: row.sourceSum,
            taxFreeSum: freeSumm,
            privilegeSum: 0,
            taxSum: row.paySum
          })
        }
        delete row.payElID
        delete row.sourceSum
      }
    }
  })

  if (params.rate) {
    paySum = params.baseSum * params.rate / 100 + (params.addPaySum || 0)
  }
  if (params.mask === undefined) {
    params.mask = algorithmService.getFillMaskByPeriod(params.dateFrom, params.dateTo)
  }
  const paySumSecJobs = cont.payEl[params.payElID].includeSecondJobs
    ? algorithmService.getSumSecJobs(cont, params.employeeNumberID, periodSalary.ID, params.payElID)
    : { paySum: 0, baseSum: 0 }
  paySum = (flagsFix & 1 << 1) ? params.paySum : accrualService.roundPayEl(paySum - ((params.flagsFix & 1) ? 0 : paySumSecJobs.paySum), cont.payEl[params.payElID].roundUpTo)
  if (paySumSecJobs.baseSum !== 0 && !(params.flagsFix & 1)) {
    params.baseSum = accrualService.round(params.baseSum - paySumSecJobs.baseSum)
  }

  if (!sourceAccr) {
    sourceAccr = {}
  }
  sourceAccr.accrualDt = algorithmService.calcGroupSumAccrualDt(accrualDt, paySum)
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
    mask: params.mask,
    paySum,
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
    taxIndividAcc: algorithmService.correctAccrualDt(taxIndividAcc, paySum, null, 'taxSum'),
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
