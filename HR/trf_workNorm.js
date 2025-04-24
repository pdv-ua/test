const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!execParams.name) {
    execParams.name = `${UB.i18n('Тижнева норма')} ${execParams.weekHours}`
  }
  checkDuplicate(ctx)
}
function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.name === null) {
    execParams.name = `${UB.i18n('Тижнева норма')} ${execParams.weekHours || previousValues.weekHours}`
  }
  checkDuplicate(ctx)
}

function checkDuplicate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const dateFrom = dateService.shiftDate(execParams.dateFromEmpty || instanceData.dateFrom || dateService.minDate())
  const dateTo = dateService.shiftDate(execParams.dateToEmpty || instanceData.dateTo || dateService.maxDate())
  const found = UB.Repository(__entityName)
    .attrs(['name', 'weekHours'])
    .where('name', '=', execParams.name || instanceData.name)
    .where('weekHours', '=', execParams.weekHours || instanceData.weekHours)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .where('ID', '<>', execParams.ID)
    .selectSingle()
  if (found) {
    throw new UB.UBAbort(`<<<${UB.i18n('`Вже існує запис {0}! Збереження неможливо!', `${found.weekHours} ${found.name}`)}>>>`)
  }
}
