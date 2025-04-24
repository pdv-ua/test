const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  createVacationData(execParams)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  deleteVacationData(instanceData.orderID, instanceData.empVacationPeriodID)
  createVacationData({
    orderID: instanceData.orderID,
    empVacationPeriodID: execParams.empVacationPeriodID || instanceData.empVacationPeriodID,
    dictVacationKindID: execParams.dictVacationKindID || instanceData.dictVacationKindID,
    dayCount: execParams.dayCount === undefined ? instanceData.dayCount : execParams.dayCount,
    dateFrom: execParams.dateFrom === undefined ? instanceData.dateFrom : execParams.dateFrom,
    dateTo: execParams.dateTo === undefined ? instanceData.dateTo : execParams.dateTo
  })
}

function createVacationData (item) {
  const order = UB.Repository('hr_docRegVacation')
    .attrs('orderRegistryID.organizationID', 'orderNumber', 'orderDate', 'employeePositionID', 'employeeNumberID',
      'employeeNumberID.employeeID', 'orderRegistryID.periodID', 'dateFrom')
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(item.orderID)

  const vacStore = UB.DataStore('hr_employeeVacation')
  vacStore.run('insert', {
    execParams: {
      organizationID: order['orderRegistryID.organizationID'],
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderID: item.orderID,
      dictVacationKindID: item.dictVacationKindID,
      employeeID: order['employeeNumberID.employeeID'],
      employeePositionID: order.employeePositionID,
      employeeNumberID: order.employeeNumberID,
      dayCount: item.dayCount,
      cntDay: item.dayCount,
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      dictPeriodID: order['orderRegistryID.periodID'],
      empVacationPeriodID: item.empVacationPeriodID,
      avgSum: 0,
      vacationStatus: 'GRANT',
      orderState: 'POSTED',
      isMoneyHelp: false
    }
  })
}

function deleteVacationData (orderID, empVacationPeriodID) {
  const vacStore = UB.DataStore('hr_employeeVacation')
  const vacationDt = UB.Repository('hr_employeeVacation')
    .attrs('ID')
    .where('orderID', '=', orderID)
    .where('empVacationPeriodID', '=', empVacationPeriodID)
    .selectAsObject()
  vacationDt.forEach(det => {
    vacStore.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: det.ID
      }
    })
  })
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  deleteVacationData(instanceData.orderID, instanceData.empVacationPeriodID)
}
