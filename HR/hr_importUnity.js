const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const periodService = require('../HR/modules/periodService')
const accrualService = require('../HR/modules/accrualService')
me.entity.addMethod('transferFund')

me.transferFund = function (ctx) {
  const orgID = 3000000043328
  const periodCalcID = 3000019427550
  const storeFrom = UB.DataStore('hr_importUnity')
  const store = UB.DataStore('hr_accrualFund')
  const storeFundSummarySheet = UB.DataStore('hr_payFundSummarySheet')
  const storeFund = UB.DataStore('hr_accrualFund')
  const storeFundDt = UB.DataStore('hr_accrualFundDt')

  // const data = storeFrom.getAsJsObject()
  // const period = periodService.getCurrentPeriod(orgID)

  store.execSQL(` DELETE FROM hr_payFundSummarySheet WHERE periodID = :periodID:;
  `, { periodID: periodCalcID })

  storeFrom.runSQL('select * from hr_payFundSummarySheet where periodID = :periodID: ', { periodID: periodCalcID })
  const payFundSummarySheet = storeFrom.getAsJsObject()

  payFundSummarySheet.forEach(acc => {
    acc.ID = accrualService.getID('S_HR_PAYFUNDSUMMARYSHEET')
    if (acc.payFundID === 3000116532413) {
      acc.payFundID = 3000116860116
    }
    storeFundSummarySheet.run('insert', {
      execParams: acc
    })
  })

  store.execSQL(` DELETE FROM hr_accrualFundDt WHERE accrualFundID in (SELECT ID FROM hr_accrualFund WHERE periodCalcID = :periodID:);
  DELETE FROM hr_accrualFund WHERE periodCalcID = :periodID:;
  `, { periodID: periodCalcID })

  storeFrom.runSQL('select * from hr_accrualFund where periodCalcID = :ID: ORDER BY ID', { ID: periodCalcID })
  const accrual = storeFrom.getAsJsObject()

  storeFrom.runSQL('select * from hr_accrualFundDt dt where exists (select 1 from hr_accrualFund f where f.periodCalcID = :ID: and f.ID = dt.accrualFundID) ORDER BY dt.accrualFundID ', { ID: periodCalcID })
  const accrualDt = storeFrom.getAsJsObject()
  let accr
  accrualDt.forEach(row => {
    if (!accr || accr.ID !== row.accrualFundID) {
      accr = accrualService.binarySearch(accrual, row.accrualFundID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.accrualFundDt) {
        accr.accrualFundDt.push(row)
      } else {
        accr.accrualFundDt = [row]
      }
    }
  })
  accrual.forEach(acc => {
    acc.ID = accrualService.getID('S_HR_ACCRUALFUND')
    if (acc.payFundID === 3000116532413) {
      acc.payFundID = 3000116860116
    }
    const accrualFundDt = acc.accrualFundDt || []
    delete acc.accrualFundDt
    storeFund.run('insert', {
      execParams: acc
    })
    accrualFundDt.forEach(accDt => {
      accDt.ID = accrualService.getID('S_HR_ACCRUALFUNDDT')
      accDt.accrualFundID = acc.ID
      storeFundDt.run('insert', {
        execParams: accDt
      })
    })
  })
}
