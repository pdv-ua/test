const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.details = [
  {
    detailName: 'commissionDetail',
    entityName: 'hr_commission',
    docIDName: 'orderID',
    detIDName: 'orderDetID',
    fieldList: orderService.setFieldListAttribute(['employeePositionID.description', 'memberType'], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

function setAttrs (ctx, op) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const posFromDesc = UB.Repository('hr_employeePositionS')
    .attrs('description')
    .where('ID', '=', execParams.employeePositionID || instanceData.employeePositionID)
    .selectScalar()
  const posToDesc = UB.Repository('hr_employeePositionS')
    .attrs('description')
    .where('ID', '=', execParams.toEmployeePositionID || instanceData.toEmployeePositionID)
    .selectScalar()
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateFromStr = dateFrom ? ' з ' + dateService.formatDate(dateFrom) : ''
  let dateTo = execParams.dateTo || instanceData.dateTo
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  execParams.description = UB.i18n(`Передача мат. цінностей від {0} до {1}{2}{3}`, posFromDesc, posToDesc, dateFromStr, dateToStr)
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

function afterInsert (ctx) {
  let params = {
    docID: ctx.mParams.execParams.orderID,
    orderDetID: ctx.mParams.execParams.ID
  }
  orderService.saveDetails(ctx, me.details, params)
}

function afterUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let params = {
    docID: instanceData.orderID,
    orderDetID: ctx.mParams.execParams.ID
  }
  orderService.saveDetails(ctx, me.details, params)
}
