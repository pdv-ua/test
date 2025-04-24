const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const _ = require('lodash')
const orderService = require('./modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsertUpdate)
me.on('update:after', afterInsertUpdate)

me.entity.addMethod('checkBeforeCancelPosting')

function setDescription (ctx) {
  // const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
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
  ctx.previousValues = {}
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = previousValues
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

me.checkBeforeCancelPosting = function (item) {
  const para = UB.Repository(__entityName)
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'employeePositionID', 'dictContractKindID']).selectById(item.ID)

  const dictContractKind = UB.Repository('hr_dictContractKind')
    .attrs(['code', 'isTerm']).selectById(para.dictContractKindID)
  const withReturn = dictContractKind && dictContractKind.code === '20' && dictContractKind.isTerm

  if (withReturn) {
    let oldValues = item.changedValues
    if (!oldValues) return
    if (_.isString(oldValues)) {
      oldValues = JSON.parse(oldValues)
    }
    if (oldValues.inserted && _.isArray(oldValues.inserted)) {
      oldValues.inserted.forEach(item => {
        const entName = Object.keys(item)[0]
        if (entName === 'hr_employeePosition') {
          const ID = item[entName]
          const posData = UB.Repository(entName).attrs(['dateTo', 'employeeNumberID']).selectById(ID)
          if (posData) {
            const lastPos = UB.Repository(entName)
              .attrs(['ID', 'description'])
              .where('employeeNumberID', '=', posData.employeeNumberID)
              .where('dateFrom', '>', posData.dateTo)
              .selectSingle()
            if (lastPos) {
              throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе. Для працівника {0} були зроблені зміни іншим наказом', lastPos.description)}>>>`)
            }
          }
        }
      })
    }
  }
}

function afterInsertUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.previousValues || {}

  orderService.saveOrderFundSource(ctx)

  if ((execParams.employeePositionID || execParams.dateFrom) && !execParams.isPreservExistCharges) {
    const orderDetID = execParams.ID || instanceData.ID
    const orderID = execParams.orderID || instanceData.orderID
    const dateFrom = execParams.dateFrom || instanceData.dateFrom
    orderService.addNonClosableAccruals(execParams.employeePositionID || instanceData.employeePositionID, orderID, orderDetID, dateFrom)
  }
}
