const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('viewPrintForm')

me.details = [
  {
    detailName: 'requestStuffEducation',
    entityName: 'hr_requestStuffEducation',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'dictEducationLevelID.name', 'dictAreasOfEduID.name', 'dictSpecialtyID.name'
    ], ['lineNum'])
  },
  {
    detailName: 'requestStuffExperience',
    entityName: 'hr_requestStuffExperience',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'dictExperienceID.name', 'years', 'months', 'comment'
    ], ['lineNum'])
  },
  {
    detailName: 'requestStuffProfi',
    entityName: 'hr_requestStuffProfi',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'dictRequiredParaID.name', 'requirement'
    ], ['lineNum'])
  },
  {
    detailName: 'requestStuffPcLiteracy',
    entityName: 'hr_requestStuffPcLiteracy',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'dictLevelUsePcID.name', 'soft', 'comment'
    ], ['lineNum'])
  },
  {
    detailName: 'requestStuffComp',
    entityName: 'hr_requestStuffComp',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'dictRequiredParaID.name', 'requirement'
    ], ['lineNum'])
  },
  {
    detailName: 'requestStuffPrivat',
    entityName: 'hr_requestStuffPrivat',
    docIDName: 'requestForStuffID',
    fieldList: orderService.setFieldListAttribute([
      'requirement'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
  setDescription(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  setDescription(ctx)
  orderService.saveDetails(ctx, me.details)
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') === 'RECONCILED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити заявку в стані "Погоджено"')}>>>`)
  }
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

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.requestDate === undefined && execParams.requestNumber === undefined && execParams.positionID === undefined && execParams.departmentID === undefined) {
    return
  }
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['requestNumber', 'requestDate', 'departmentID.name', 'positionID.name'], '^', true).split('^')
  execParams.description = UB.i18n(`№ {0} від {1}`, parts[0], parts[1])
  if (parts[2]) {
    execParams.description += `, ${parts[2]}`
  }
  if (parts[3]) {
    execParams.description += `, ${parts[3]}`
  }
}

me.viewPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.content = JSON.stringify({ instanceID: mParams.instanceID })
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!execParams.requestDate) {
    execParams.requestDate = new Date()
  }

  if ((!execParams.requestNumber && !instanceData.requestNumber) || execParams.requestNumber === null) {
    execParams.requestNumber = orderService.getOrderNum(me.entity.name, execParams.orderDate, execParams.organizationID)
  }
}
