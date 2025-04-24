const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')

module.exports = {
  getPayFund

}

function getPayFund () {
  const payFunds = UB.Repository('hr_payFund')
    .attrs(['ID', 'code', 'name', 'payFundMethodID', 'payFundMethodID.code', 'payFundMethodID.correctByTime',
      'payFundMethodID.accrueUnSick', 'addMinSum', 'typeTaxECBID', 'dateFrom', 'dateTo', 'calcPeriod', 'description',
      'sequence', 'isAutoCalc', 'isRecalculate', 'entryOperationID', 'dictFundSourceID', 'excludeFundSource', 'isRecSum'])
    .orderBy('sequence')
    .selectAsObject({
      'payFundMethodID.code': 'methodCode',
      'payFundMethodID.correctByTime': 'correctByTime',
      'payFundMethodID.accrueUnSick': 'accrueUnSick'
    })
  const existPayFund = UB.Repository('hr_payFund').correlation('ID', 'payFundID')
  const payFundBase = UB.Repository('hr_payFundBase').attrs(['*']).exists(existPayFund).orderBy('payFundID').selectAsObject(
    { 'payElID': 'payElBaseID' }
  )
  const payFundExclude = UB.Repository('hr_payFundExclude').attrs(['*']).exists(existPayFund).orderBy('payFundID').selectAsObject(
    { 'payElID': 'payElBaseID' }
  )
  const payFundRate = UB.Repository('hr_payFundRate').attrs(['*']).exists(existPayFund).orderBy('payFundID').orderByDesc('dateFrom').selectAsObject()
  const payFundCategory = UB.Repository('hr_payFundCategory').attrs(['*']).exists(existPayFund).orderBy('payFundID').selectAsObject()
  const existPayFundDep = UB.Repository('hr_payFund').correlation('ID', 'fundID')
  const payFundDepend = UB.Repository('hr_payFundDepend').attrs(['*']).exists(existPayFundDep).selectAsObject()
  const payFundTimeCost = UB.Repository('hr_payFundTimeCost').attrs(['*']).exists(existPayFund).orderBy('payFundID').selectAsObject()
  const payFundSource = UB.Repository('hr_payFundSource').attrs(['*']).exists(existPayFund).orderBy('payFundID').selectAsObject()

  payFundRate.forEach(o => {
    o.dateFrom = dateService.shiftDate(o.dateFrom)
    o.dateTo = dateService.shiftDate(o.dateTo)
  })
  payFundDepend.forEach(o => {
    o.dateFrom = dateService.shiftDate(o.dateFrom)
    o.dateTo = dateService.shiftDate(o.dateTo)
  })
  payFundTimeCost.forEach(o => {
    o.dateFrom = dateService.shiftDate(o.dateFrom)
    o.dateTo = dateService.shiftDate(o.dateTo)
  })
  payFunds.forEach(pFund => {
    pFund.dateFrom = dateService.shiftDate(pFund.dateFrom)
    pFund.dateTo = dateService.shiftDate(pFund.dateTo)
    pFund.payFundBase = []
    pFund.payFundExclude = payFundExclude.filter(o => o.payFundID === pFund.ID)
    pFund.payFundRate = payFundRate.filter(o => o.payFundID === pFund.ID)
    pFund.payFundCategory = payFundCategory.filter(o => o.payFundID === pFund.ID)
    pFund.payFundDepend = payFundDepend.filter(o => o.fundID === pFund.ID)
    pFund.payFundTimeCost = payFundTimeCost.filter(o => o.payFundID === pFund.ID)
    pFund.payFundSource = payFundSource.filter(o => o.payFundID === pFund.ID)
  })
  payFundBase.forEach(o => {
    const pFund = payFunds.find(p => p.ID === o.payFundID)
    if (pFund) {
      pFund.payFundBase.push(o)
    }
  })
  return payFunds
}
