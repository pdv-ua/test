const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)
me.on('update:after', afterUpdate)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('checkQuantity')

function beforeInsert (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  execParams.entryDate = execParams.orderDate
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)

  const docType = UB.Repository('ubm_enum')
    .attrs(['name'])
    .where('eGroup', '=', 'HR_PLAN_STRU_DOC_TYPE')
    .where('code', '=', execParams.docType || 'NEW')
    .selectScalar()
  execParams.description = `${docType || ''} ${execParams.changeListNumber ? `№ ${execParams.changeListNumber}: ` : ''}${execParams.name || ''} (${execParams.orderNumber || ''})`
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.orderDate) {
    execParams.entryDate = execParams.orderDate
  }
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  orderService.checkOrderUpdate(ctx)
  const docType = UB.Repository('ubm_enum')
    .attrs(['name'])
    .where('eGroup', '=', 'HR_PLAN_STRU_DOC_TYPE')
    .where('code', '=', execParams.docType || instanceData.docType || 'NEW')
    .selectScalar()

  execParams.description = `${docType || ''} ${(execParams.changeListNumber || instanceData.changeListNumber) ? `№ ${execParams.changeListNumber || instanceData.changeListNumber}: ` : ''}${execParams.name || instanceData.name || ''} (${execParams.orderNumber || instanceData.orderNumber || ''})`
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
}

me.doPosting = function (ctx) {
}

me.doCancelPosting = function (ctx) {
}

me.checkQuantity = function (ctx) {
  const mParams = ctx.mParams
  ctx.mParams.totalQuantity = 0
  ctx.mParams.limitEmpNum = 0
  if (!mParams.staffTableID || !mParams.orgID) return
  const staffTableID = mParams.staffTableID
  const organizationID = mParams.orgID
  const onDate = mParams.onDate || dateService.currentDate()

  const orgIDNew = UB.Repository('hr_staffUnit')
    .attrs(['ID'])
    .whereIf(organizationID, 'orgID', '=', organizationID)
    .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
    .where('mi_unityEntity', '=', 'hr_organization')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'NEW', 'active')
    .where('staffOrderID', '=', staffTableID, 'order')
    .misc({ __mip_ondate: onDate })
    .selectScalar()

  let limitEmpNum = 0
  if (orgIDNew) {
    limitEmpNum = UB.Repository('hr_organization')
      .attrs(['limitEmpNum'])
      .where('ID', '=', orgIDNew)
      .selectScalar()
  } else {
    limitEmpNum = UB.Repository('hr_organization')
      .attrs(['limitEmpNum'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: onDate })
      .selectScalar()
  }

  const orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'code', 'fullName', 'quantity', 'mi_unityEntity'])
    .whereIf(organizationID, 'orgID', '=', organizationID)
    .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffTableID, 'order')
    .misc({ __mip_ondate: onDate })
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .orderBy('idxNum')
    .selectAsObject()

  let totalPosQnt = 0
  if (orgStruct) {
    orgStruct.forEach(o => {
      if (o.mi_unityEntity === 'hr_position' && o.parentUnitID === organizationID) totalPosQnt += o.quantity || 0
    })
  }

  const depData = UB.Repository('hr_department')
    .attrs(['ID', 'quantity', 'idxNum'])
    .whereIf(organizationID, 'orgID', '=', organizationID)
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffTableID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .where('isStructDep', '=', true)
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()

  let totalDepQnt = 0
  if (depData) {
    depData.forEach(o => {
      totalDepQnt += o.quantity || 0
    })
  }
  ctx.mParams.totalQuantity = totalDepQnt + totalPosQnt
  ctx.mParams.limitEmpNum = limitEmpNum || 0
}
