const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
// const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const UB = require('@unitybase/ub')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
// const orderService = require('./modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.doPosting = function ({
  item,
  order,
  isImportOperation,
  saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'orderID', 'canceledParaID', 'canceledParaID.mi_unityEntity'])
    .selectById(item.ID, {
      'canceledParaID.mi_unityEntity': 'cancelParaEntity'
    })
  const paraToCancel = UB.Repository(para.cancelParaEntity)
    .attrs(['ID', 'orderState', 'orderID.orderState', 'orderID.description', 'orderID', 'mi_modifyDate', 'employeeNumberID'])
    .selectById(para.canceledParaID)
  if (paraToCancel['orderID.orderState'] === 'PROCESSED') {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}, з якого скасовується пункт, вже опрацьований зарплатою', paraToCancel['orderID.description'])}>>>`)
  }
  if (paraToCancel['orderID.orderState'] !== 'POSTED') {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}, з якого скасовується пункт, не проведено', paraToCancel['orderID.description'])}>>>`)
  }
  if (paraToCancel.orderState === 'CANCELED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Пункт наказу вже скасовано')}>>>`)
  }
  if (!global[para.cancelParaEntity].doCancelPosting) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для цього типу наказу скасування окремого пункту не реалізовано')}>>>`)
  }
  paraToCancel.mi_unityEntity = para.cancelParaEntity
  paraToCancel.paraID = para.canceledParaID
  global[para.cancelParaEntity].doCancelPosting(paraToCancel, true)
  UB.DataStore(para.cancelParaEntity).run('update', {
    isOrderOperation: true,
    __skipOptimisticLock: true,
    execParams: {
      ID: paraToCancel.ID,
      cancelOrderID: para.orderID,
      cancelParaID: para.ID,
      orderState: 'CANCELED'
    }
  })
}
me.doCancelPosting = function (item) {
  const saved = {}
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'orderID', 'canceledParaID', 'canceledParaID.mi_unityEntity'])
    .selectById(item.ID, {
      'canceledParaID.mi_unityEntity': 'cancelParaEntity'
    })
  let fields = ['ID', 'orderID.orderState', 'orderState', 'employeeID', 'orderID.orderDate', 'orderID.orderNumber', 'empOrderType', 'organizationID.mi_data_id', 'employeeNumberID', 'orderID', 'orderID.description']
  const paraToCancel = UB.Repository(para.cancelParaEntity)
    .attrs(fields)
    .selectById(para.canceledParaID)
  if (paraToCancel['orderID.orderState'] === 'PROCESSED') {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}, з якого відміняється скасування, вже опрацьований зарплатою', paraToCancel['orderID.description'])}>>>`)
  }
  if (paraToCancel['orderID.orderState'] !== 'POSTED') {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}, з якого відміняється скасування, не проведено', paraToCancel['orderID.description'])}>>>`)
  }
  if (paraToCancel.orderState !== 'CANCELED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Пункт наказу не скасовано')}>>>`)
  }
  if (!global[para.cancelParaEntity].doCancelPosting) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для цього типу наказу скасування окремого пункту не реалізовано')}>>>`)
  }
  paraToCancel.mi_unityEntity = para.cancelParaEntity
  if (para.cancelParaEntity === 'hr_empOrderVacationDet') {
    const order = UB.Repository('hr_empOrder')
      .attrs(['ID', 'orderNumber', 'orderDate', 'entryDate', 'periodID', 'empOrderType', 'staffTableID', 'staffTableOrgStructureID',
        'organizationID', 'orderNumberFull', 'masterOrganizationID'])
      .selectById(paraToCancel.orderID)
    global[para.cancelParaEntity].doPosting({
      item: paraToCancel,
      isImportOperation: false,
      order: order,
      saved: saved,
      isSingle: true
    })
    const vacListDet = UB.Repository('hr_empOrderVacationListDet')
      .attrs(fields)
      .where('paraID', '=', para.canceledParaID)
      .selectAsObject()
    vacListDet.forEach(vacItem => {
      vacItem.mi_unityEntity = 'hr_empOrderVacationListDet'
      global[para.cancelParaEntity].doPosting({
        item: vacItem,
        isImportOperation: false,
        order: order,
        saved: saved,
        isSingle: true
      })
    })
  } else {
    global[para.cancelParaEntity].doPosting({
      item: paraToCancel,
      isImportOperation: false,
      order: UB.Repository('hr_empOrder').attrs(['ID', 'orderNumber', 'orderDate', 'entryDate', 'periodID',
        'empOrderType', 'staffTableID', 'staffTableOrgStructureID', 'organizationID', 'orderNumberFull', 'masterOrganizationID'])
        .selectById(paraToCancel.orderID),
      saved: saved,
      isSingle: true
    })
  }
  UB.DataStore(para.cancelParaEntity).run('update', {
    isOrderOperation: true,
    __skipOptimisticLock: true,
    execParams: {
      ID: paraToCancel.ID,
      cancelOrderID: null,
      cancelParaID: null,
      orderState: null
    }
  })
}

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  const onDate = dateService.currentDate()
  if (execParams.employeeID) {
    const employee = UB.Repository('hr_employee').attrs('firstName', 'lastName', 'middleName', 'fullFIO').where('ID', '=', execParams.employeeID).selectSingle()
    execParams.title = employee.fullFIO
    execParams.firstName = employee.firstName
    execParams.lastName = employee.lastName
    execParams.middleName = employee.middleName
  }
  if (execParams.canceledParaID) {
    const cPara = UB.Repository('hr_empOrderDet')
      .attrs('descriptionExtView', 'positionID.name', 'departmentID', 'positionID')
      .joinCondition('positionID.mi_dateFrom', '<=', onDate)
      .joinCondition('positionID.mi_dateTo', '>=', onDate)
      .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('positionID.state', '=', 'ACTIVE')
      .selectById(execParams.canceledParaID)
    execParams.positionID = cPara.positionID
    execParams.departmentID = cPara.departmentID
    execParams.description = cPara.descriptionExtView
    execParams.title = cPara['positionID.name'] || execParams.title || '...'
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}
