const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.details = [
  {
    detailName: 'empOrderChgSalPosDet',
    entityName: 'hr_empOrderChgSalPosDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'organizationID', 'empOrderType', 'positionID', 'posName',
      'employeePositionID.description', 'employeeNumberID', 'employeeID', 'empPosDateFrom', 'posAccrualSum',
      'previousAccrualSum', 'accrualSum', 'empOrderType', 'posDateFrom', 'employeePositionID.contractType.name',
      'employeePositionID.dictPositionID', 'employeePositionID.dictPositionValue'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}
function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}
function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}
function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}
function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.title = execParams.description = `Встановлення посадових окладів`
}
