const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const items = UB.Repository(__entityName)
    .attrs('ID')
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '=', dateService.maxDate())
    .selectAsObject()

  const store = UB.DataStore(__entityName)
  items.forEach(item => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dateTo: dateService.addDays(dateFrom, -1)
      }
    })
  })
}
