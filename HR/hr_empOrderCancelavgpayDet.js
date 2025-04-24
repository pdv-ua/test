const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const timService = require('./modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('./modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')

me.details = [
  {
    detailName: 'hr_empOrderEmployeeDet',
    entityName: 'hr_empOrderEmployeeDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'employeePositionID', 'employeePositionID.description', 'employeeID', 'dateFrom', 'description',
      'empOrderDetID', 'empOrderDateFrom', 'empOrderDateTo', 'reason'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ebs.setDateTo(ctx)
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderEmployeeDet'].insert.forEach(item => {
      item.orderID = execParams.orderID || instanceData.orderID
      item.isExternal = 0
      item.organizationID = execParams.organizationID || instanceData.organizationID
      item.empOrderType = execParams.empOrderType || instanceData.empOrderType
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderEmployeeDet'].insert.forEach(item => {
      item.orderID = execParams.orderID
      item.organizationID = execParams.organizationID
      item.empOrderType = execParams.empOrderType
      item.isExternal = 0
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.doPosting = function ({ item, order, saved }) {
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const empData = UB.Repository('hr_empOrderEmployeeDet')
    .attrs(['ID', 'orderID', 'employeeNumberID', 'dateFrom', 'empOrderDetID', 'empOrderDetID.orderID', 'empOrderDetID.mi_unityEntity'])
    .where('paraID', '=', item.ID)
    .selectAsObject()
  empData.forEach(row => {
    if (row['empOrderDetID.mi_unityEntity'] === 'hr_empOrderTempavgpayDet') {
      const empAccrual = UB.Repository('hr_employeeAccrual')
        .attrs('ID', 'dateTo', 'changeOrderID')
        .where('employeeNumberID', '=', row['employeeNumberID'])
        .where('orderID', '=', row['empOrderDetID.orderID'])
        .limit(1)
        .selectSingle()
      if (empAccrual) {
        orderService.updateByOrder({
          store: 'hr_employeeAccrual',
          params: {
            ID: empAccrual.ID,
            dateTo: dateService.addDays(dateService.shiftDate(row['dateFrom']), -1),
            changeOrderID: order.ID
          },
          saved: saved,
          oldValues: {
            dateTo: empAccrual['dateTo'],
            changeOrderID: empAccrual['changeOrderID']
          }
        })
      }
    }
    if (row['empOrderDetID.mi_unityEntity'] === 'hr_empOrderEmployeeDet') {
      timService.cancelTimeSheetByOrder(row['empOrderDetID.orderID'], order.ID, currentPeriod, row['dateFrom'], null, [row['employeeNumberID']], true)
    }
  })
}
