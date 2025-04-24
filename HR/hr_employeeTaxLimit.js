const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')
const accrualService = require('../HR/modules/accrualService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)

function afterInsert (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['orgID']).selectById(execParams.employeeNumberID)
    accrualService.setRecalculatePeriod({
      orgID: employeeNumber.orgID,
      employeeNumberID: execParams.employeeNumberID,
      dateFrom: execParams.dateFrom,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Пільги ПДФО')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
    })
    calcService.addCalcQueue({ employeeNumbers: [execParams.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function beforeUpdate (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['orgID']).selectById(execParams.employeeNumberID || previousValues.employeeNumberID)
    let calcDate = (execParams.dateFrom || previousValues.dateFrom)
    if (execParams.dateToEmpty || execParams.dateTo) {
      if (!Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateToEmpty', 'dateTo', 'description'].includes(o))) {
        calcDate = dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo) < dateService.maxDate()
          ? dateService.addDays(dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo), 1) : execParams.dateToEmpty || execParams.dateTo
      }
    }
    accrualService.setRecalculatePeriod({
      orgID: employeeNumber.orgID,
      employeeNumberID: previousValues.employeeNumberID,
      dateFrom: calcDate,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Пільги ПДФО')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
    })
    calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function beforeDelete (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['orgID']).selectById(previousValues.employeeNumberID)
    accrualService.setRecalculatePeriod({
      orgID: employeeNumber.orgID,
      employeeNumberID: previousValues.employeeNumberID,
      dateFrom: previousValues.dateFrom,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Пільги ПДФО')} ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(previousValues.dateFrom))}`
    })
    calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}
