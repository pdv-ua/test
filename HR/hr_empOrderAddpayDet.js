const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')

me.details = [
  {
    detailName: 'empOrderAddpayListDet',
    entityName: 'hr_empOrderAddpayListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'employeePositionID'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('loadEmployeeList')
me.entity.addMethod('clearDetail')

function getDescription (dateFrom, dateTo) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  return UB.i18n(`Оплата додаткової роботи з {0}{1}`, dateFromStr, dateToStr)
}

function setAttrs (ctx, op) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.calcDateTo || instanceData.calcDateTo || execParams.dateTo || instanceData.dateTo
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
  if (dateFrom || dateTo) {
    const ds = UB.DataStore('hr_empOrderAddpayListDet')
    const detList = UB.Repository('hr_empOrderAddpayListDet')
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

/* Заповнення працівниками пункту наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 * @param {number} ctx.mParams.orderID наказ
 * @param {boolean} ctx.mParams.isDeleteExisting чи видаляти попередніх працівників
 * @param {string} ctx.mParams.empOrderType тип наказу
 * @param {Array} ctx.mParams.records массив ID'ів вибраних посад працівників
 */
me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderAddpayListDet')
  const existing = UB.Repository('hr_empOrderAddpayListDet')
    .attrs('ID')
    .where('paraID', '=', mParams.paraID)
    .selectAsObject()
  if (mParams.isDeleteExisting) {
    existing.forEach(item => {
      ds.run('delete', { execParams: { ID: item.ID } })
    })
  }
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'employeeNumberID', 'positionID', 'organizationID')
    .where('ID', 'in', mParams.records)
    .selectAsObject()
  employeePosition.filter(item => item.positionID !== null).forEach(item => {
    const isRecordNotExists = mParams.isDeleteExisting || !existing.find(eItem => eItem.ID === item.ID)
    if (isRecordNotExists) {
      ds.run('insert', {
        execParams: {
          empOrderType: mParams.empOrderType,
          employeePositionID: item.ID,
          employeeNumberID: item.employeeNumberID,
          positionID: item.positionID,
          orderID: mParams.orderID,
          paraID: mParams.paraID
        }
      })
    }
  })
  ds.freeNative()
}

/* Очищення працівників пункту наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 */
me.clearDetail = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderAddpayListDet')
  const existing = UB.Repository('hr_empOrderAddpayListDet')
    .attrs('ID')
    .where('paraID', '=', mParams.paraID)
    .selectAsObject()
  existing.forEach(item => {
    ds.run('delete', { execParams: { ID: item.ID } })
  })
  ds.freeNative()
}
