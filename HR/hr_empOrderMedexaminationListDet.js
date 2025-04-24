const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function getDescription (employeeID, dateFrom, dateTo) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let empName = UB.Repository('hr_employee')
    .attrs(['shortFIO'])
    .where('ID', '=', employeeID)
    .selectScalar()
  return UB.i18n(`Компенсація за проходження медогляду {0} з {1}{2}`, empName, dateFromStr, dateToStr)
}

function setAttrs (ctx, op) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.calcDateTo || instanceData.calcDateTo || execParams.dateTo || instanceData.dateTo
  let employeeID = execParams.employeeID || instanceData.employeeID
  execParams.description = getDescription(employeeID, dateFrom, dateTo)
  if (execParams.employeePositionID) {
    let empos = UB.Repository('hr_employeePositionS')
      .attrs('posName', 'depName')
      .selectById(ctx.mParams.execParams.employeePositionID)
    execParams.posName = empos.posName
    execParams.depName = empos.depName
  }
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
