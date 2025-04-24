const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.details = [
  {
    detailName: 'hr_empOrderActingDet',
    entityName: 'hr_empOrderActingDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'employeePositionID.description', 'employeeID',
      'dateFrom', 'dateTo', 'condition', 'empOrderType', 'note'
    ], ['lineNum'])
  }
]

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
      .where('ID', '=', execParams.employeePositionID)
      .select()

    if (!execParams.firstName) {
      execParams.firstName = pos.get('employeeID.firstName')
    }
    if (!execParams.lastName) {
      execParams.lastName = pos.get('employeeID.lastName')
    }
    if (!execParams.middleName) {
      execParams.middleName = pos.get('employeeID.middleName')
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

    execParams.employeeID = pos.get('employeeID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
    execParams.title = `${pos.get('positionID.fullName')}  [${pos.get('employeeNumberID.tabNum')}]`
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
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ebs.setDateTo(ctx)
  setDescription(ctx)
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail.hr_empOrderActingDet.insert.forEach(item => {
      item.orderID = execParams.orderID || instanceData.orderID
      item.isExternal = 0
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }

  orderService.saveDetails(ctx, me.details)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail.hr_empOrderActingDet.insert.forEach(item => {
      item.orderID = execParams.orderID
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
