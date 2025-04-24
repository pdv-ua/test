const UB = require('@unitybase/ub')
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('addnew:before', beforeAddNew)
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('repPrintForm')
me.entity.addMethod('copyRecord')

const noNeedChangeDocFields = ['ID', 'mi_modifyUser', 'mi_modifyDate', 'mi_createUser', 'mi_createDate', 'mi_deleteDate',
  'orderState', 'fieldLastChangeDate', 'docLastChangeDate']

function changedDocFields (execParams) {
  const fieldNames = Object.keys(execParams)
  return fieldNames.some(field => !noNeedChangeDocFields.includes(field))
}

function beforeInsert (ctx) {
  const { mParams } = ctx
  const { execParams } = mParams
  execParams.fieldLastChangeDate = new Date()
  if (execParams.document) {
    execParams.docLastChangeDate = new Date()
  }
}

function beforeUpdate (ctx) {
  const { execParams } = ctx.mParams
  const date = new Date()
  if (changedDocFields(execParams)) {
    execParams.fieldLastChangeDate = date
  } else {
    delete execParams.fieldLastChangeDate
  }
  if (execParams.document) {
    execParams.docLastChangeDate = date
  } else {
    delete execParams.docLastChangeDate
  }
}

function beforeAddNew (ctx) {
  const { execParams = {} } = ctx.mParams
  if (execParams.positionID) {
    const parentData = UB.Repository('hr_position')
      .attrs('parentUnitID')
      .where('mi_data_id', '=', execParams.positionID)
      .where('state', '=', 'ACTIVE')
      .orderBy('state')
      .selectSingle()

    const quantity = parentData && parentData.parentUnitID
      ? UB.Repository('hr_position')
        .attrs('sum([quantity])')
        .where('parentUnitID', '=', parentData.parentUnitID)
        .where('state', '=', 'ACTIVE')
        .selectScalar()
      : 0
    if (quantity) execParams.quantityFactEmpl = quantity
  }
}

function beforeDelete (ctx) {
  orderService.beforeDeleteOrder(ctx)
}

me.repPrintForm = function (ctx) {
  const { mParams } = ctx
  mParams.content = JSON.stringify({ instanceID: mParams.params.instanceID })
}

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const store = UB.DataStore(__entityName)
  const newID = store.generateID()
  entityBaseService.cloneInstance(__entityName, params.ID, {
    ID: newID,
    document: null
  })
  const positionMainResponsibiliti = UB.Repository('hr_positionMainResponsibiliti')
    .attrs(['ID'])
    .where('positionInstructionID', '=', params.ID)
    .selectAsObject()
  positionMainResponsibiliti.forEach(row => {
    entityBaseService.cloneInstance('hr_positionMainResponsibiliti', row.ID, {
      positionInstructionID: newID
    })
  })
  const positionRightResponsibiliti = UB.Repository('hr_positionRightResponsibiliti')
    .attrs(['ID'])
    .where('positionInstructionID', '=', params.ID)
    .selectAsObject()
  positionRightResponsibiliti.forEach(row => {
    entityBaseService.cloneInstance('hr_positionRightResponsibiliti', row.ID, {
      positionInstructionID: newID
    })
  })
  const positionServiceCommunication = UB.Repository('hr_positionServiceCommunication')
    .attrs(['ID'])
    .where('positionInstructionID', '=', params.ID)
    .selectAsObject()
  positionServiceCommunication.forEach(row => {
    entityBaseService.cloneInstance('hr_positionServiceCommunication', row.ID, {
      positionInstructionID: newID
    })
  })
  const positionSpecReq = UB.Repository('hr_positionSpecReq')
    .attrs(['ID'])
    .where('positionInstructionID', '=', params.ID)
    .selectAsObject()
  positionSpecReq.forEach(row => {
    entityBaseService.cloneInstance('hr_positionSpecReq', row.ID, {
      positionInstructionID: newID
    })
  })
  const positionInstructionAcqList = UB.Repository('hr_positionInstructionAcqList')
    .attrs(['ID'])
    .where('positionInstructionID', '=', params.ID)
    .selectAsObject()
  positionInstructionAcqList.forEach(row => {
    entityBaseService.cloneInstance('hr_positionInstructionAcqList', row.ID, {
      positionInstructionID: newID
    })
  })
  let document = App.blobStores.getContent(
    { ID: params.ID, entity: __entityName, attribute: 'document' },
    { encoding: 'bin' }
  )
  if (document) {
    App.blobStores.putContent(
      { ID: newID, entity: __entityName, attribute: 'document' },
      document
    )
  }

  ctx.mParams.newID = newID
}
