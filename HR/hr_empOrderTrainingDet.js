const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true
  })

  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  /*
  if (!execParams.dictTimeCostID && !instanceData.dictTimeCostID) {
    execParams.dictTimeCostID = UB.Repository('hr_dictTimeCost')
      .attrs('ID')
      .where('code', '=', UB.i18n('НеявкаІн'))
      .where('isClose', '=', 0)
      .select()
      .get(0)
  }
  */
  execParams.orderID = execParams.orderID || instanceData.orderID
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if ((execParams.dateTo || execParams.dateFrom) && instanceData.dateFrom && instanceData.dateTo) {
    const paraOrders = UB.Repository('hr_empOrderDet')
      .attrs(['ID'])
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
    paraOrders.forEach(det => {
      UB.DataStore('hr_empOrderDet')
        .run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: det.ID,
            dateFrom: instanceData.dateFrom,
            dateTo: instanceData.dateTo
          }
        })
    })
  }
  if (execParams.description !== undefined) {
    const store = UB.DataStore('hr_empOrderEmployeeDet')
    UB.Repository('hr_empOrderEmployeeDet').attrs('ID')
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
      .forEach(item => {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: item.ID,
            description: execParams.description
          }
        })
      })
  }
}

function beforeInsert (ctx) {
  ctx.mParams.execParams.firstName = '...'
  ctx.mParams.execParams.lastName = '...'
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}
