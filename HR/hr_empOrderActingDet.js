const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const UB = require('@unitybase/ub')
const moment = require('moment')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('closeDateTo')
me.entity.addMethod('clearDetail')

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams

  orderService.setEmpOrderAttrs(ctx, {
    noSetEmpOrderType: true
  })

  if (!execParams.description) {
    execParams.description = execParams.title || '..'
  }

  if (!execParams.orderID && execParams.paraID) {
    const _order = UB.Repository('hr_empOrderDet')
      .attrs('orderID', 'organizationID')
      .selectById(execParams.paraID)
    if (_order) {
      execParams.orderID = _order.orderID
      execParams.organizationID = _order.organizationID
    }
  }
}

function checkCrossPeriod (ctx) {
  const { execParams } = ctx.mParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const paraID = execParams.paraID || instanceData.paraID
  if (execParams.dateFrom === undefined && execParams.dateTo === undefined) {
    return
  }
  let dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  let dateTo = execParams.dateTo
  if (dateTo === undefined) {
    dateTo = instanceData.dateTo
  }
  if (dateTo === null) {
    dateTo = dateService.maxDate()
  } else {
    dateTo = dateService.shiftDate(dateTo)
  }
  dateTo = moment(dateTo).format('YYYY-MM-DD')
  dateFrom = moment(dateFrom).format('YYYY-MM-DD')
  const exists = UB.Repository(__entityName)
    .attrs('ID', 'dateFrom', 'dateTo')
    .where(`dateFrom`, '<', dateTo)
    .where(`coalesce(dateTo, '9999-12-31') >= '${dateFrom}'`, 'custom')
    .where('ID', '<>', execParams.ID)
    .where('paraID', '=', paraID)
    .selectSingle()
  if (exists) {
    throw new UB.UBAbort(`<<<${UB.i18n('Виявлено перетин періодів')}>>>`)
  }
}

function beforeInsert (ctx) {
  checkCrossPeriod(ctx)
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  checkCrossPeriod(ctx)
  setAttrs(ctx)
}

/**
 * Закрити дату закінчення виконання обов'язків
 * @param {object} ctx
 * @param {number} ctx.mParams.itemID ID пункту наказу про виконання обов'язків (hr_empOrderActingDet)
 * @param {date} ctx.mParams.dateTo дата закінчення виконання обов'язків
 */
me.closeDateTo = function (ctx) {
  const mParams = ctx.mParams
  const itemID = ctx.mParams.itemID
  const itemIDs = ctx.mParams.itemIDs
  const dateTo = (ctx.mParams.dateTo && dateService.shiftDate(ctx.mParams.dateTo)) || null
  if (itemID || itemIDs) {
    const store = UB.DataStore(__entityName)
    if (itemIDs) {
      itemIDs.forEach(id => {
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: id,
            dateTo: dateTo
          }
        })
      })
    } else {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        execParams: {
          ID: itemID,
          dateTo: dateTo
        }
      })
    }
    store.freeNative()
    mParams.result = true
  }
}

/* Очистити всі записи пунтку наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 */
me.clearDetail = function (ctx) {
  const paraID = ctx.mParams.paraID
  const items = UB.Repository(__entityName)
    .attrs('ID')
    .where('paraID', '=', paraID)
    .selectAsObject()
  if (items.length > 0) {
    let store = UB.DataStore(__entityName)
    items.forEach((item) => {
      store.run('delete', { execParams: { ID: item.ID } })
    })
    store.freeNative()
  }
}
