const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const _ = require('lodash')
const orderService = require('./modules/orderService')
const nameCaseService = require('../HR/modules/nameCaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsertUpdate)
me.on('update:after', afterInsertUpdate)

me.entity.addMethod('checkBeforeCancelPosting')

function setDescription (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
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
  const orgID = UB.Repository('hr_empOrder').attrs('organizationID').where('ID', '=', execParams.orderID || instanceData.orderID).selectScalar() || 0
  const employee = UB.Repository('hr_employee')
    .attrs(['ID', 'shortFIO', 'fullFIO', 'sexType'])
    .where('ID', '=', execParams.employeeID || instanceData.employeeID)
    .misc({ __allowSelectSafeDeleted: true })
    .selectSingle()
  const position = (execParams.positionID || (execParams.positionID !== null && instanceData.positionID))
    ? UB.Repository('hr_position')
      .attrs(['ID', 'fullNameNom', 'fullNameNomF', 'fullName', 'positionType', 'name', 'nameNom', 'nameNomF', 'dictPositionID', 'nameAddition'])
      .where('ID', '=', execParams.positionID || instanceData.positionID)
      .misc({ __mip_recordhistory_all: true })
      .limit(1)
      .selectSingle()
    : null
  const allowSelectDictPosition = settingsService.getByCode('hrOrderAllowSelectDictPosition', orgID) === true
  let dictPositionID = execParams.dictPositionID
  if (!allowSelectDictPosition && execParams.positionID && position.dictPositionID) {
    dictPositionID = position.dictPositionID
  }
  const dictPosition = (dictPositionID || (dictPositionID !== null && instanceData.dictPositionID))
    ? UB.Repository('hr_dictPosition')
      .attrs(['ID', 'name', 'nameNom', 'nameNomF'])
      .selectById(dictPositionID || instanceData.dictPositionID)
    : null
  const department = (execParams.departmentID || instanceData.departmentID)
    ? UB.Repository('hr_department')
      .attrs(['ID', 'name', 'nameGen'])
      .where('ID', '=', execParams.departmentID || instanceData.departmentID)
      .misc({ __mip_recordhistory_all: true })
      .limit(1)
      .selectSingle() : null
  let empCategoryName = ''
  const dictEmpCategoryID = execParams.dictEmpCategoryID === undefined ? instanceData.dictEmpCategoryID : execParams.dictEmpCategoryID
  if (dictEmpCategoryID) {
    const empCat = UB.Repository('hr_dictEmpCategory').attrs(['genName', 'name']).selectById(dictEmpCategoryID)
    if (empCat) {
      empCategoryName = empCat.genName || empCat.name || ''
    }
    if (empCategoryName) {
      empCategoryName = ' ' + empCategoryName
    }
  }
  let posNameAddition = allowSelectDictPosition
    ? (execParams.posNameAddition === undefined ? instanceData.posNameAddition : execParams.posNameAddition) || ''
    : (position ? position['nameAddition'] : '') || ''
  if (posNameAddition) {
    posNameAddition = ' ' + posNameAddition
  }
  employee.sexType = employee.sexType || 'M'
  const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', orgID)
  const isOrderActualPositionName = settingsService.getByCode('hrOrderActualPositionName', orgID)
  let posName
  if (isOrderActualPositionName) {
    posName = isUseSexType
      ? (employee.sexType === 'W'
        ? (dictPosition ? ' ' + (dictPosition.nameNomF || dictPosition.name) : (position ? ' ' + (position.nameNomF || position.name) : ''))
        : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : (position ? ' ' + (position.nameNom || position.name) : '')))
      : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : (position ? ' ' + (position.nameNom || position.name) : ''))
  } else {
    posName = isUseSexType
      ? (employee.sexType === 'W'
        ? (position ? ' ' + (position.nameNomF || position.name) : (dictPosition ? ' ' + (dictPosition.nameNomF || dictPosition.name) : ''))
        : (position ? ' ' + (position.nameNom || position.name) : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : ''))
      )
      : (position ? ' ' + position.name : (dictPosition ? ' ' + dictPosition.name : ''))
  }
  let posDepName = nameCaseService.removeDuplicateWords(`${posName}${posNameAddition}${empCategoryName}${department ? ' ' + (department.nameGen || department.name) : ''}`)
  if (posDepName) {
    posDepName = ' ' + posDepName
  }
  execParams.factPosition = posDepName
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
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
