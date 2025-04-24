const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const Session = UB.Session
const { startProcess, stopProcess, continueProcess } = require('./modules/reconciliationProcess')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('startReconciliation')
me.entity.addMethod('stopReconciliation')
me.entity.addMethod('continueReconciliation')
me.entity.addMethod('cancelReconciliation')
me.entity.addMethod('saveEmployeeList')

me.entity.addMethod('canVisibleStartReconciliation')
me.entity.addMethod('canVisibleStopReconciliation')
me.entity.addMethod('canVisibleContinueReconciliation')
me.entity.addMethod('canVisibleCancelReconciliation')
me.entity.addMethod('canStopReconciliation')

/**
 * Метод для перевірки права відміняти погодження погоджених документів
 */
me.canStopReconciliation = () => {}

/**
 * Додає список осіб (прізвище та ініціали) з пунктів виконавців в поле етапу employeeList при видаленні, додаванні або редагуванні пунктів
 * Додаються перші 7 осіб. Якща їх більше, додається "..." до списку
 * Викликається в hr_empOrderDet.js
 * @param {number} recStageID ID етапу
 * @param {number} paraID ID пункту
 */
me.saveEmployeeList = (recStageID, paraID) => {
  const getShortFIO = (firstName, middleName, lastName) => {
    lastName = (lastName || '').trim()
    firstName = (firstName || '').trim()
    middleName = (middleName || '').trim()

    firstName = firstName && firstName.substr(0, 1).toUpperCase() + '.'
    middleName = middleName && middleName.substr(0, 1).toUpperCase() + '.'
    return (lastName + ' ' + firstName + ' ' + middleName).trim()
  }
  let employeeList = []
  recStageID = recStageID || UB.Repository('hr_recparticipant').attrs('recStageID').where('ID', '=', paraID).selectScalar()
  let employeeData = UB.Repository('hr_recparticipant').attrs(['employeePosition.employeeID.shortFIO', 'employeePosition.employeeID.firstName', 'employeePosition.employeeID.lastName', 'employeePosition.employeeID.middleName'])
    .where('recStageID', '=', recStageID)
    // .where('employeeID', 'isNotNull')
    .orderBy('ID')
    .limit(50)
    .selectAsObject({
      'employeePosition.employeeID.shortFIO': 'shortFIO',
      'employeePosition.employeeID.firstName': 'firstName',
      'employeePosition.employeeID.lastName': 'lastName',
      'employeePosition.employeeID.middleName': 'middleName'
    })
  let tail = ''
  for (let i = 0, len = employeeData.length; i < len; i++) {
    let item = employeeData[i]
    let name = item.shortFIO || getShortFIO(item.firstName, item.middleName, item.lastName)
    if (employeeList.join(', ').length >= 95) {
      tail = ' ...'
      break
    }
    !employeeList.includes(name) && employeeList.push(name)
  }
  employeeList = employeeList.join(', ') + tail
  UB.DataStore(__entityName).execSQL(`update ${__entityName} set employeeList = :employeeList: where ID = :recStageID:`, {
    employeeList, recStageID
  })
}
me.on('insert:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  const parentField = execParams.docID ? 'docID' : 'recstageTemplateID'
  if (!execParams.orderIndex) {
    const orderIndex = UB.Repository(__entityName).attrs(['max([orderIndex])']).where(parentField, '=', execParams[parentField]).where('entityName', '=', 'hr_recstage').selectScalar()
    execParams.orderIndex = orderIndex ? orderIndex + 1 : 1
  }
  execParams.entityName = !execParams.entityName ? 'hr_recstage' : execParams.entityName
})

me.on('delete:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  const state = UB.Repository(__entityName).attrs(['mi_wfState']).where('ID', '=', execParams.ID).selectScalar()
  if (state !== 'NEW' && ctxt.externalCall) {
    throw new UB.UBAbort(`<<<${UB.i18n('Видалення заборонено')}>>>`)
  }
  let detailStore = UB.DataStore('hr_recparticipant')
  UB.Repository('hr_recparticipant')
    .attrs(['ID'])
    .where('recStageID', '=', execParams.ID)
    .selectAsObject()
    .forEach(item => {
      detailStore.run('delete', { execParams: { ID: item.ID } })
    })
})

me.on('update:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  if (execParams.mi_wfState !== 'NEW') {
    const state = UB.Repository(__entityName).attrs(['mi_wfState']).where('ID', '=', execParams.ID).selectScalar()
    if (state !== 'NEW' && ctxt.externalCall) {
      throw new UB.UBAbort(`<<<${UB.i18n('Редагування заборонено')}>>>`)
    }
  }
})

function saveActionInHistory (params) {
  const store = UB.DataStore('hr_orderStateHistory')
  const execParams = Object.assign({}, params)
  execParams.userID = Session.userID
  execParams.actionDateTime = dateService.currentDateTime()
  store.run('insert', {
    execParams
  })
}

me.startReconciliation = function (ctxt) {
  console.log('startReconciliation', ctxt)
  let docID = ctxt.mParams.docID
  if (!docID) throw new UB.UBAbort('Require parameter docID')
  startProcess(docID, true)
  saveActionInHistory({
    orderID: docID,
    actionType: 'NEW',
    orderState: 'ON_RECONCILATION'
  })
}

me.stopReconciliation = function (ctxt) {
  let docID = ctxt.mParams.docID
  if (!docID) throw new UB.UBAbort('Require parameter docID')
  stopProcess(docID, true)
  saveActionInHistory({
    orderID: docID,
    actionType: 'CANCELED',
    orderState: 'PROJECT'
  })
}

me.cancelReconciliation = function (ctxt) {
  let docID = ctxt.mParams.docID
  if (!docID) throw new UB.UBAbort('Require parameter docID')
  stopProcess(docID, true)
  saveActionInHistory({
    orderID: docID,
    actionType: 'ON_COMPLETION',
    orderState: 'PROJECT'
  })
}

me.continueReconciliation = function (ctxt) {
  let docID = ctxt.mParams.docID
  let comments = ctxt.mParams.comments
  if (!docID) throw new UB.UBAbort('Require parameter docID')
  continueProcess(docID, comments)
  saveActionInHistory({
    orderID: docID,
    actionType: 'RENEWAL',
    orderState: 'ON_RECONCILATION'
  })
}

me.canVisibleStartReconciliation = () => {}
me.canVisibleStopReconciliation = () => {}
me.canVisibleContinueReconciliation = () => {}
me.canVisibleCancelReconciliation = () => {}
