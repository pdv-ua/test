const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const accrualService = require('../HR/modules/accrualService')

me.on('delete:before', beforeDelete)
me.on('insert:before', setDescription)
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
        description: `${UB.i18n('Інвалідність')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
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
        description: `${UB.i18n('Інвалідність')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
  setDescription(ctx)
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
        description: `${UB.i18n('Інвалідність')} ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(previousValues.dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const disabilityType = UB.Repository('hr_dictDisabilityType')
    .attrs('name')
    .where('ID', '=', execParams.disabilityID || instanceData.disabilityID)
    .select().get(0)
  const dateFrom = execParams.dateFromEmpty === undefined ? instanceData.dateFromEmpty : execParams.dateFromEmpty
  const dateTo = execParams.dateToEmpty === undefined ? instanceData.dateToEmpty : execParams.dateToEmpty
  let period = ''
  if (dateFrom || dateTo) {
    period += ','
    if (dateFrom) {
      period += UB.i18n(` з {0}`, dateService.formatDate(dateFrom))
    }
    if (dateTo) {
      period += UB.i18n(` по {0}`, dateService.formatDate(dateTo))
    }
  }
  execParams.description = UB.i18n(`{0}, група {1}{2}`, disabilityType, (execParams.disabilityGroup || instanceData.disabilityGroup), period)
}
