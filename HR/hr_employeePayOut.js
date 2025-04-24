const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', checkPeriod)

function afterInsert (ctx) {
  if (!ctx.mParams.isImport) {
    checkPeriod(ctx)
    calcService.addCalcQueue({ employeeNumbers: [ctx.mParams.execParams.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function beforeUpdate (ctx) {
  if (!ctx.mParams.isImport) {
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function beforeDelete (ctx) {
  if (!ctx.mParams.isImport) {
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function checkPeriod (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const instance = UB.Repository('hr_employeePayOut').attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'paymentMethod', 'isDefault']).selectById(execParams.ID)
    if (instance && instance.isDefault) {
      if (UB.Repository('hr_employeePayOut').attrs(['ID'])
        .where('employeeNumberID', '=', instance.employeeNumberID)
        .where('paymentMethod', '=', instance.paymentMethod)
        .where('dateFrom', '<=', instance.dateTo)
        .where('dateTo', '>=', instance.dateFrom)
        .where('isDefault', '=', 1)
        .where('ID', '!=', execParams.ID)
        .limit(1)
        .selectScalar()
      ) {
        throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата початку дії якого більше або дорівнює даті початку дії поточного запису')}>>>`)
      }
    }
  }
}
