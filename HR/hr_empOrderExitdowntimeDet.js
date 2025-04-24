const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')

me.details = [
  {
    detailName: 'empOrderExitdowntimeListDet',
    entityName: 'hr_empOrderExitdowntimeListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'employeePositionID', 'dateFrom', 'dateStart'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('loadEmployeeList')
me.entity.addMethod('doPosting')

function getDescription (dateFrom, dateTo) {
  let dateToStr = dateService.formatDate(dateTo)
  return UB.i18n(`Вихід з простою або тимчасового призупинення з {0}`, dateToStr)
}

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.dateTo || instanceData.dateTo
  execParams.description = getDescription(dateFrom, dateTo)
  execParams.title = '..'
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function afterInsert (ctx) {
  orderService.saveDetails(ctx, me.details)
  syncDates(ctx)
}

function afterUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
  syncDates(ctx)
}

function syncDates (ctx) {
  const execParams = ctx.mParams.execParams
  let dateFrom = execParams.dateFrom
  let dateTo = execParams.dateTo
  if (dateFrom !== undefined || dateTo !== undefined) {
    const ds = UB.DataStore('hr_empOrderExitdowntimeListDet')
    const detList = UB.Repository('hr_empOrderExitdowntimeListDet')
      .attrs(['ID'])
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
    detList.forEach(det => {
      ds.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: det.ID,
          dateFrom: dateFrom,
          dateTo: dateTo
        }
      })
    })
    ds.freeNative()
  }
}

/** Заповнення працівниками пункту наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 * @param {number} ctx.mParams.orderID наказ
 * @param {date} ctx.mParams.dateFrom дата виходу з простою
 * @param {boolean} ctx.mParams.isDeleteExisting чи видаляти попередніх працівників
 * @param {string} ctx.mParams.empOrderType тип наказу
 * @param {Array} ctx.mParams.records массив ID'ів вибраних посад працівників
 **/
me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.dateFrom)

  const downTimeEmp = UB.Repository('hr_empOrderDowntimeListDet')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('orderID', '=', mParams.grantOrderID)
    .selectAsObject()

  let empNumList = downTimeEmp.map(o => o.employeeNumberID)

  const tempSuspendEmp = UB.Repository('hr_empOrderTempsuspendDet')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('orderID', '=', mParams.grantOrderID)
    .selectAsObject()

  empNumList = empNumList.concat(tempSuspendEmp.map(o => o.employeeNumberID)).concat([0])

  const employeePosition = empNumList.length
    ? UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'description'])
      .where('employeeNumberID', 'in', empNumList)
      .where('isActive', '=', 1)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .notExists(UB.Repository('hr_empOrderExitdowntimeListDet')
        .correlation('employeePositionID', 'ID')
        .where('orderID', '=', mParams.orderID)
        .where('mi_deleteDate', '>=', '#maxdate'))
      .selectAsObject()
    : []

  const result = []
  employeePosition.forEach(item => {
    const emp = downTimeEmp.find(o => o.employeeNumberID === item.employeeNumberID) || tempSuspendEmp.find(o => o.employeeNumberID === item.employeeNumberID)
    result.push({
      employeePositionID: item.ID,
      employeeNumberID: item.employeeNumberID,
      description: item.description,
      orderID: mParams.orderID,
      paraID: mParams.paraID,
      dateStart: emp ? emp.dateFrom : null,
      dateEnd: emp ? emp.dateTo : dateService.maxDate()
    })
  })
  mParams.result = JSON.stringify(result)
}

me.doPosting = function ({ item, order, currentPeriod, saved }) {
  const para = UB.Repository(__entityName)
    .attrs(['dateFrom', 'grantOrderID'])
    .selectById(item.paraID)
  const dateFrom = dateService.shiftDate(para.dateFrom)
  const empList = UB.Repository('hr_empOrderExitdowntimeListDet')
    .attrs('employeePositionID', 'employeeNumberID')
    .where('paraID', '=', item.paraID)
    .selectAsObject()
  if (empList.length) {
    timService.cancelTimeSheetByOrder(para['grantOrderID'], order.ID, currentPeriod, dateFrom, null, empList.map(o => o.employeeNumberID), true)
  }
  empList.forEach(row => {
    const perAccruals = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
      .where('orderID', '=', para['grantOrderID'])
      .where('employeeNumberID', '=', row.employeeNumberID)
      .selectAsObject()
    perAccruals.forEach(acc => {
      timService.cancelTimeSheetByOrder(acc['ID'], order.ID, currentPeriod, dateFrom, null, [row.employeeNumberID], true)
      if (dateService.shiftDate(acc.dateFrom) < dateFrom && dateFrom < dateService.shiftDate(acc.dateTo)) {
        orderService.updateByOrder({
          store: 'hr_employeeAccrual',
          params: {
            ID: acc.ID,
            dateTo: dateFrom,
            changeOrderID: order.ID
          },
          saved: saved,
          oldValues: {
            dateTo: acc.dateTo,
            changeOrderID: acc.changeOrderID
          }
        })
      }
    })
  })
}
