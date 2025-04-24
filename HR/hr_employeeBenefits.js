const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const accrualService = require('../HR/modules/accrualService')

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!ctx.mParams.isImport) {
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', execParams.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    employeeNumber.forEach(row => {
      accrualService.setRecalculatePeriod({
        orgID: row.orgID,
        employeeNumberID: row.ID,
        dateFrom: execParams.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Право на пільгу')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (previousValues.employeeID && !ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', previousValues.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    let calcDate = (execParams.dateFrom || previousValues.dateFrom)
    if (execParams.dateToEmpty || execParams.dateTo) {
      if (!Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateToEmpty', 'dateTo', 'description'].includes(o))) {
        calcDate = dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo) < dateService.maxDate()
          ? dateService.addDays(dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo), 1) : execParams.dateToEmpty || execParams.dateTo
      }
    }
    employeeNumber.forEach(row => {
      accrualService.setRecalculatePeriod({
        orgID: row.orgID,
        employeeNumberID: row.ID,
        dateFrom: calcDate,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Право на пільгу')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!ctx.mParams.isImport) {
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', previousValues.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    employeeNumber.forEach(row => {
      accrualService.setRecalculatePeriod({
        orgID: row.orgID,
        employeeNumberID: row.ID,
        dateFrom: previousValues.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Право на пільгу')} ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(previousValues.dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}
