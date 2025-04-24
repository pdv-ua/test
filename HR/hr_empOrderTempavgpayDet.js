const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const _ = require('lodash')
const orderService = require('./modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('doPosting')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams

  let attr = ctx.dataStore.entity.attributes['description']
  if (attr) {
    let cs = attr.customSettings
    if (cs && cs.compositeFields) {
      execParams.description = ebs.getCompositeAttributeValue(ctx, 'description', cs.compositeFields, cs.compositeSeparator, false)
    }
  }
  if (execParams.employeePositionID) {
    let pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'description',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'posStaffName',
        'dictPositionID',
        'dictPositionID.name',
        'employeeNumberID.tabNum',
        'employeeNumberID',
        'depName'
      ])
      .where('ID', '=', execParams.employeePositionID)
      .select()
    if (pos.get('depName')) {
      execParams.title = `${pos.get('posStaffName') || pos.get['dictPositionID.name'] || ''} ${pos.get('depName')}  [${pos.get('employeeNumberID.tabNum')}]`
    } else {
      execParams.title = `${pos.get('posStaffName') || pos.get['dictPositionID.name'] || ''} [${pos.get('employeeNumberID.tabNum')}]`
    }
    execParams.firstName = pos.get('employeeID.firstName')
    execParams.lastName = pos.get('employeeID.lastName')
    execParams.middleName = pos.get('employeeID.middleName')
    execParams.employeeID = pos.get('employeeID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  ctx.previousValues = ctx.dataStore.getAsJsObject()[0] || {}
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

me.doPosting = function ({ item, order, saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'employeeID', 'payElID', 'orderID', 'positionID.dictCostTypeID'])
    .selectById(item.ID)
  const pAccr = {
    employeeID: para.employeeID,
    employeeNumberID: para.employeeNumberID,
    payElID: para.payElID,
    dateFrom: para.dateFrom,
    dateTo: para.dateTo,
    accrualSum: 0,
    accrualRate: 0,
    orderID: para.orderID,
    orderNumber: order.orderNumberFull,
    orderDate: order.orderDate,
    changeOrderID: null
  }
  if (para['positionID.dictCostTypeID']) {
    let coa = global['COA']
    if (coa && coa.dims['ac_dictCostType']) {
      pAccr.d0 = coa.dims['ac_dictCostType'].ID
      pAccr.d0Value = para['positionID.dictCostTypeID']
    }
  }
  orderService.insertByOrder({
    store: 'hr_employeeAccrual',
    params: pAccr,
    saved: saved
  })
}
