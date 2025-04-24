const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.empOrderID) {
    createVacationData(execParams)
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.empOrderID) {
    const instanceData = ctx.dataStore.getAsJsObject()[0]
    deleteVacationData(instanceData.orderID, instanceData.empVacationPeriodID)
    createVacationData({
      orderID: instanceData.orderID,
      empVacationPeriodID: execParams.empVacationPeriodID || instanceData.empVacationPeriodID,
      dayComp: execParams.dayComp === undefined ? instanceData.dayComp : execParams.dayComp
    })
  }
}

function createVacationData (item) {
  if (item.dayComp > 0) {
    const order = UB.Repository('hr_docRegVacationCompensation')
      .attrs('orderRegistryID.organizationID', 'orderNumber', 'orderDate', 'employeePositionID', 'employeeNumberID',
        'employeeNumberID.employeeID', 'orderRegistryID.periodID', 'dateFrom')
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(item.orderID)

    const vacStore = UB.DataStore('hr_employeeVacation')
    const compVacStore = UB.DataStore('hr_empVacationComp')

    const dictVacationKindID = UB.Repository('hr_empVacationPeriod')
      .attrs(['empVacationPlanID.dictVacationKindID'])
      .where('ID', '=', item.empVacationPeriodID)
      .selectScalar()

    vacStore.run('insert', {
      execParams: {
        organizationID: order['orderRegistryID.organizationID'],
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderID: item.orderID,
        dictVacationKindID,
        employeeID: order['employeeNumberID.employeeID'],
        employeePositionID: order.employeePositionID,
        employeeNumberID: order.employeeNumberID,
        dayCount: item.dayComp,
        cntDay: item.dayComp,
        dateFrom: order.dateFrom,
        dateTo: null,
        dictPeriodID: order['orderRegistryID.periodID'],
        empVacationPeriodID: item.empVacationPeriodID,
        avgSum: 0,
        vacationStatus: 'COMP',
        orderState: 'POSTED'
      }
    })
    compVacStore.run('insert', {
      execParams: {
        empVacationPeriodID: item.empVacationPeriodID,
        dayComp: item.dayComp,
        recalcDate: order.dateFrom,
        orderID: item.orderID
      }
    })
  }
}

function deleteVacationData (orderID, empVacationPeriodID) {
  const vacStore = UB.DataStore('hr_employeeVacation')
  const compVacStore = UB.DataStore('hr_empVacationComp')
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
  const compVacationDt = UB.Repository('hr_empVacationComp')
    .attrs('ID')
    .where('orderID', '=', orderID)
    .where('empVacationPeriodID', '=', empVacationPeriodID)
    .selectAsObject()
  compVacationDt.forEach(det => {
    compVacStore.run('delete', {
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
