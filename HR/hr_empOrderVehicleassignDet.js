const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const moment = require('moment')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  return UB.i18n(`Наказ про закріплення автотранспортного засобу №  {0} від {1}`, d['orderID.orderNumber'], moment(d['orderID.orderDate']).format('DD.MM.YYYY'))
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

me.doPosting = function (orderID) {
  const store = UB.DataStore('hr_employeeVehicle')
  const det = UB.Repository('hr_empOrderVehicleassignDet')
  .attrs(['ID', 'dateFrom', 'dateTo', 'vehicleID','employeeID','strVehicle'])
  .where('orderID', '=', orderID)
  .selectAsObject()
  det.forEach(row => {
    const empVehicle = UB.Repository('hr_employeeVehicle').attrs(['ID'])
    .where('orderID', '=', orderID)
    .where('employeeID', '=', row.employeeID)
    .where('vehicleID', '=', row.vehicleID)
    .where('strVehicle', '=', row.strVehicle)
    .selectSingle()
    if (!empVehicle) {
      const newID = store.generateID()
      store.run('insert', {
        __skipSelectAfterInsert: true,
        isOrderOperation: true,
        execParams: {
          ID: newID,
          employeeID: row.employeeID,
          vehicleID: row.vehicleID,
          strVehicle: row.strVehicle,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo ? row.dateTo : dateService.maxDate(),
          orderID: orderID
        }
      })
    }
  })
}

me.doCancelPosting = function (order) {
  const store = UB.DataStore('hr_employeeVehicle')
  const empvehicles = UB.Repository('hr_employeeVehicle')
    .attrs(['ID'])
    .where('orderID', '=', order.ID)
    .selectAsObject()

  empvehicles.forEach(row => {
    store.run('delete', {
      skipOrderDelete: true,
      execParams: {
        ID: row.ID,
      }
    })
  })
}
