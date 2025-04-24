const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const timService = require('../HR/modules/timService')
const orderRegistryService = require('../HR/modules/orderRegistryService')

me.on('delete:before', beforeDelete)
me.on('delete:after', afterDelete)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('insert:after', afterInsert)

function beforeDelete (ctx) {
  ctx.previousValues = ctx.dataStore.getAsJsObject()[0]
  if (!ctx.mParams.skipOrderDelete) {
    const execParams = ctx.mParams.execParams
    const order = UB.Repository('hr_orderRegistryDt').attrs(['orderID', 'empOrderID', 'orderID.orderState', 'orderID.description',
      'orderID.orderClass.entityName']).misc({ __skipRls: true }).selectById(execParams.ID)

    if (order.empOrderID) {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - сформовано з наказу по персоналу. Видалення неможливе.', order['orderID.description'])}>>>`)
    }

    if (order['orderID.orderState'] !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', order['orderID.description'])}>>>`)
    }
    ctx.mParams.orderID = order.orderID
    ctx.mParams.orderEntityName = order['orderID.orderClass.entityName']
    timService.cancelTimeSheet(order.orderID)
  }
}

function afterDelete (ctx) {
  if (!ctx.mParams.skipOrderDelete) {
    const store = UB.DataStore(ctx.mParams.orderEntityName)
    store.run('delete', {
      execParams: {
        ID: ctx.mParams.orderID
      }
    })
  }
  if (ctx.previousValues && ctx.previousValues.orderRegistryID) {
    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID'])
      .where('orderRegistryID', '=', ctx.previousValues.orderRegistryID)
      .where('orderRegistryID.orderType', 'notIn', ['hr_orderRegistryPremium', 'hr_orderRegistryExtraPay', 'hr_orderRegistryAccrualPay',
        'hr_orderRegistryRequestEmp', 'hr_orderRegistryWorkShift', 'hr_orderRegistryReserve', 'hr_orderRegistryNetSum'])
      .selectSingle()
    if (orderRegistryDt) {
      orderRegistryService.updateOrderRegistryState(ctx.previousValues.orderRegistryID, 'POSTED')
    }
    orderRegistryService.updateEmployeeList(ctx.previousValues.orderRegistryID)
  }
}

function beforeUpdate (ctx) {
  ctx.previousValues = ctx.dataStore.getAsJsObject()[0]
}

function afterUpdate (ctx) {
  if (ctx.previousValues && ctx.previousValues.orderRegistryID) {
    orderRegistryService.updateEmployeeList(ctx.previousValues.orderRegistryID)
  }
}

function afterInsert (ctx) {
  orderRegistryService.updateEmployeeList(ctx.mParams.execParams.orderRegistryID)
}

me.selectDistinct = function (ctx) {
  let orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs('periodCalcID', 'employeeNumberID', 'employeeNumberID.tabNum', 'employeeNumberID.employeeID.fullFIO',
      'dateFrom', 'dateTo', 'payElID.name', 'periodSalaryID.name', 'orderRegistryID')
  orderRegistryDt.whereList = ctx.mParams.whereList

  ctx.dataStore.initialize(orderRegistryDt
    .where('payElID.methodID.methodGroupID.code', 'in', ['4', '5'], 'byMethodGr')
    .where('payElID.methodID.code', 'in', ['21', '23', '73'], 'byMethod')
    .logic('([byMethodGr] or [byMethod])')
    .where('payElID.methodID.code', '!=', '16')
    .orderBy('employeeNumberID.tabNum')
    .orderBy('dateFrom')
    .groupBy(['periodCalcID', 'employeeNumberID', 'employeeNumberID.tabNum', 'employeeNumberID.employeeID.fullFIO',
      'dateFrom', 'dateTo', 'payElID.name', 'periodSalaryID.name', 'orderRegistryID'])
    .selectAsObject())
}

me.entity.addMethod('selectDistinct')
