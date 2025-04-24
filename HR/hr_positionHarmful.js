const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
}

function checkDate (ctx, instanceData) {
  if (ctx.mParams.skipUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  let dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const positionHarmful = UB.Repository('hr_positionHarmful')
    .attrs('ID', 'dateFrom', 'dateTo', 'mi_modifyDate')
    .where('positionID', '=', execParams.positionID || instanceData.positionID)
    .where('dictHarmfulKindID', '=', execParams.dictHarmfulKindID || instanceData.dictHarmfulKindID)
    .where('dateTo', '>=', dateFrom)
    .where('ID', '!=', execParams.ID)
    .selectAsObject()
  positionHarmful.forEach(row => {
    if (new Date(row.dateFrom) >= dateFrom) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата початку дії якого більше або дорівнює даті початку  дії поточного запису')}>>>`)
    }
    if (new Date(row.dateTo) >= new Date(execParams.dateTo || instanceData.dateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата закінчення дії якого більше або дорівнює даті закінчення дії поточного запису')}>>>`)
    }
  })
}
