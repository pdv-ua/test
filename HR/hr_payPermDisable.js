const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const accrualService = require('../HR/modules/accrualService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')

me.on('delete:before', beforeDelete)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const employeeNumber = UB.Repository('hr_employeeNumber').attrs('dateFrom', 'orgID').selectById(execParams.employeeNumberID)
  const payPerm = UB.Repository('hr_payPerm').attrs('dateFrom').selectById(execParams.payPermID)
  const dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(employeeNumber.dateFrom), dateService.shiftDate(payPerm.dateFrom)))
  accrualService.setRecalculatePeriod({
    orgID: employeeNumber.orgID,
    employeeNumberID: execParams.employeeNumberID,
    dateFrom: dateFrom,
    entityName: __entityName,
    initiatorID: execParams.ID,
    description: `${UB.i18n('Блокування розрахунку постіних нарахувань і утримань')} ${dateService.formatDate(dateFrom)}`
  })
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0]
  const employeeNumber = UB.Repository('hr_employeeNumber').attrs('dateFrom', 'orgID').selectById(previousValues.employeeNumberID)
  const payPerm = UB.Repository('hr_payPerm').attrs('dateFrom').selectById(previousValues.payPermID)
  const dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(employeeNumber.dateFrom), dateService.shiftDate(payPerm.dateFrom)))
  accrualService.setRecalculatePeriod({
    orgID: employeeNumber.orgID,
    employeeNumberID: previousValues.employeeNumberID,
    dateFrom: dateFrom,
    entityName: __entityName,
    initiatorID: execParams.ID,
    description: `${UB.i18n('Блокування розрахунку постіних нарахувань і утримань')} ${dateService.formatDate(dateFrom)}`
  })
}
