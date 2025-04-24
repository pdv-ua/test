const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams

  orderService.setEmpOrderAttrs(ctx, {
    noSetEmpOrderType: true
  })

  if (!execParams.description) {
    execParams.description = execParams.title || '..'
  }
}

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.employeePositionID) {
    let pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'employeeNumberID',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'positionID.name',
        'positionID.fullName',
        'employeeNumberID.tabNum',
        'departmentID.name'
      ])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(execParams.employeePositionID) || {}

    if (!execParams.firstName) {
      execParams.firstName = pos['employeeID.firstName']
    }
    if (!execParams.lastName) {
      execParams.lastName = pos['employeeID.lastName']
    }
    if (!execParams.middleName) {
      execParams.middleName = pos['employeeID.middleName']
    }
    let order
    if (!execParams.empOrderType && !instanceData.empOrderType && execParams.orderID) {
      order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.empOrderType = order.get('empOrderType')
    }
    if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
      order = order || UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }

    execParams.employeeID = pos['employeeID']
    execParams.employeeNumberID = pos['employeeNumberID']
    execParams.title = `${pos['positionID.fullName']}  [${pos['employeeNumberID.tabNum']}]`
  } else {
    execParams.title = ebs.getCompositeAttributeValue(ctx, 'description', ['positionID.fullName'], '^', true)
    delete execParams.employeeID
    delete execParams.employeeNumberID
  }
  if (execParams.employeePositionID === null) {
    execParams.employeeID = null
    execParams.employeeNumberID = null
    const position = UB.Repository('hr_position')
      .attrs(['fullName']).misc({ __mip_recordhistory_all: true }).selectById(execParams.positionID || instanceData.positionID)

    execParams.title = position ? position.fullName : '...'
    execParams.firstName = '...'
    execParams.lastName = '...'
    execParams.middleName = '...'
  }

  if (!execParams.description) {
    execParams.description = execParams.title
  }
  if (ctx.mParams.method === 'insert') {
    if (!execParams.firstName) {
      execParams.firstName = '...'
    }
    if (!execParams.lastName) {
      execParams.lastName = '...'
    }
    if (!execParams.middleName) {
      execParams.middleName = '...'
    }
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
  setDescription(ctx)
}
