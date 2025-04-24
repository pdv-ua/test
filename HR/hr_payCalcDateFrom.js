const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.entity.addMethod('addForRecalc')
me.entity.addMethod('cancelRecalc')

me.addForRecalc = function (ctx) {
  const params = ctx.mParams.execParams
  if (!params.periodID) return
  const periodCalc = UB.Repository('hr_dictPeriod').attrs(['ID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', params.orgID || null)
    .where('isCurrent', '=', true)
    .selectSingle()
  const selected = params.selected || []
  const store = UB.DataStore('hr_payCalcDateFrom')
  selected.forEach(ID => {
    const row = UB.Repository('hr_payCalcDateFrom')
      .attrs('ID')
      .where('periodCalcID', '=', periodCalc.ID || null)
      .where('employeeNumberID', '=', ID)
      .selectSingle()
    if (row) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          periodCalcID: periodCalc.ID,
          periodSalaryID: params.periodID
        }
      })
    } else {
      store.run('insert', {
        execParams: {
          employeeNumberID: ID,
          periodCalcID: periodCalc.ID,
          periodSalaryID: params.periodID
        }
      })
    }
  })
  if (selected.length) {
    calcService.addCalcQueue({ employeeNumbers: selected, description: `Дата перерахунку зарплати` })
  }
}

me.cancelRecalc = function (ctx) {
  const params = ctx.mParams.execParams
  const periodCalc = UB.Repository('hr_dictPeriod').attrs(['ID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', params.orgID || null)
    .where('isCurrent', '=', true)
    .selectSingle()
  const selected = params.selected || []
  const rows = UB.Repository('hr_payCalcDateFrom')
    .attrs('ID')
    .where('periodCalcID', '=', periodCalc.ID || null)
    .where('employeeNumberID', 'in', selected)
    .selectAsObject()

  const store = UB.DataStore('hr_payCalcDateFrom')
  rows.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
  if (selected.length) {
    calcService.addCalcQueue({ employeeNumbers: selected, description: `Дата перерахунку зарплати` })
  }
}
