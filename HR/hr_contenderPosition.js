const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const periodService = require('../HR/modules/periodService')

me.entity.addMethod('createOrder')

me.createOrder = function (ctx) {
  const mParams = ctx.mParams
  const orderNumber = UB.i18n('(проєкт)')
  const orderDate = ctx.mParams.onDate

  const orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  const contenderPositionOrder = UB.Repository('hr_contenderPosition')
    .attrs(['orderID', 'ID'])
    .selectById(mParams.instanceID)

  const empOrderAppointDet = UB.Repository('hr_empOrderAppointDet')
    .attrs(['ID'])
    .where('orderID', '=', contenderPositionOrder.orderID)
    .where('employeeID', '=', mParams.employeeID)
    .where('positionID', '=', mParams.positionID)
    .selectSingle()

  const empOrder = UB.Repository('hr_empOrder')
    .attrs(['ID'])
    .selectById(contenderPositionOrder.orderID)

  let orderID

  const empOrderStore = UB.DataStore('hr_empOrder')
  if (!empOrder || !contenderPositionOrder.orderID) {
    const contenderPositionStore = UB.DataStore('hr_contenderPosition')
    orderID = empOrderStore.generateID()
    empOrderStore.run('insert', {
      execParams: {
        ID: orderID,
        orderNumber: orderNumber,
        orderDate: orderDate,
        entryDate: orderDate,
        organizationID: mParams.organizationID,
        empOrderType: mParams.empOrderType,
        orderClass: orderClass,
        periodID: periodService.getCurrentPeriod(ctx.mParams.organizationID).ID,
        reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}',
        respEmployeeNumID: mParams.respEmployeeNumID,
        orderState: 'PROJECT'
      }
    })
    contenderPositionStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: contenderPositionOrder.ID,
        orderID
      }
    })
  } else {
    ctx.mParams.empOrderAppointDetID = (empOrderAppointDet && empOrderAppointDet.ID) || null
    orderID = contenderPositionOrder.orderID
  }

  empOrderStore.freeNative()
  ctx.mParams.orderID = orderID
  return true
}
