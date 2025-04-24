const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('delete:before', beforeDelete)

me.on('insert:before', ctx => {
  let execParams = ctx.mParams.execParams
  let data
  let onDate = dateService.shiftDate(execParams.dateFrom || new Date())
  if (!execParams.organizationID) {
    if (execParams.orderID) {
      data = UB.Repository('hr_order')
        .attrs(['organizationID', 'organizationID.name'])
        .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
        .joinCondition('organizationID.mi_dateTo', '>=', onDate)
        .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('organizationID.state', '=', 'ACTIVE')
        .selectById(execParams.orderID)
      execParams.organizationID = data.organizationID
    } else if (execParams.impSourceID) {
      execParams.organizationID = execParams.impSourceID
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Професійне навчання - не вказана організація')}>>>`)
    }
  }
})

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderID') && !ctx.mParams.isOrderOperation) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис створено наказом. Видалення неможливе.')}>>>`)
  }
}
