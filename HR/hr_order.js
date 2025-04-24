/**
 * During server startup will add a after:insert/update/delete handlers
 * to all orders entity for data replication to hr_order
 *
 * TODO - add setState method to order entities for call doPosting entity method / remove postings
 * TODO - disable edit of posted orders
 */

const UB = require('@unitybase/ub')
const App = UB.App

/** @type TubDataStore */
let orderUnityStore

/**
 * Create 'insert:after' handler for inserting orderNumber, orderDate & description
 * for specified order entity instance to hr_order entity
 *
 * @param {Number} orderClassID
 * @returns {orderAfterInsert}
 */
function createOrderAfterInsert (orderClassID) {
  function orderAfterInsert (/** @param {ubMethodParams} ctxt */ctxt) {
    const inParams = ctxt.mParams.execParams
    const entity = App.domainInfo.entities[ctxt.dataStore.entity.name]
    if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_order')
    // Object.keys(inParams)
    orderUnityStore.run('insert', {
      __skipSelectAfterInsert: true,
      execParams: {
        ID: inParams.ID,
        orderNumber: inParams.orderNumberFull || inParams.orderNumber || inParams.requestNumber,
        orderDate: inParams.orderDate || inParams.docDate || inParams.requestDate,
        description: inParams.description,
        orderClass: orderClassID,
        orderState: inParams.orderState || ((!entity.attributes.orderState && inParams.state) ? inParams.state : undefined),
        entryDate: inParams.entryDate || null,
        periodID: inParams.periodID || null,
        periodCalcID: inParams.periodCalcID || null,
        changeOrderID: inParams.changeOrderID || null,
        empOrderType: inParams.empOrderType || null,
        organizationID: inParams.organizationID || inParams.orgID || null,
        masterOrganizationID: inParams.masterOrganizationID || null,
        respEmployeeID: inParams.respEmployeeID,
        respEmployeeNumberID: inParams.respEmployeeNumberID,
        respEmployeePositionID: inParams.respEmployeePositionID,
        respEmployeeNumID: inParams.respEmployeeNumID,
        documentPath: inParams.document,
        allowPosting: inParams.allowPosting
      }
    })
  }
  return orderAfterInsert
}

function orderAfterUpdate (/** @param {ubMethodParams} ctxt */ctxt) {
  const inParams = ctxt.mParams.execParams
  const entity = App.domainInfo.entities[ctxt.dataStore.entity.name]
  if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_order')
  // Object.keys(inParams)
  let ep = { ID: inParams.ID }
  if (inParams.orderNumberFull || inParams.orderNumber) {
    ep.orderNumber = inParams.orderNumberFull || inParams.orderNumber
  } else if (inParams.requestNumber) ep.orderNumber = inParams.requestNumber
  if (inParams.orderDate) {
    ep.orderDate = inParams.orderDate
  } else if (inParams.docDate) {
    ep.orderDate = inParams.docDate
  } else if (inParams.requestDate) ep.orderDate = inParams.requestDate
  if (inParams.description) ep.description = inParams.description
  if (inParams.orderState) ep.orderState = inParams.orderState
  if (!entity.attributes.orderState && inParams.state) ep.orderState = inParams.state
  if (inParams.entryDate) ep.entryDate = inParams.entryDate
  if (inParams.periodID) ep.periodID = inParams.periodID
  if (inParams.periodCalcID || inParams.periodCalcID === null) ep.periodCalcID = inParams.periodCalcID
  if (inParams.changeOrderID || inParams.changeOrderID === null) ep.changeOrderID = inParams.changeOrderID
  if (inParams.empOrderType) ep.empOrderType = inParams.empOrderType
  if (inParams.respEmployeeID) ep.respEmployeeID = inParams.respEmployeeID
  if (inParams.respEmployeeNumberID) ep.respEmployeeNumberID = inParams.respEmployeeNumberID
  if (inParams.respEmployeePositionID) ep.respEmployeePositionID = inParams.respEmployeePositionID
  if (inParams.organizationID) ep.organizationID = inParams.organizationID
  if (!inParams.organizationID && inParams.orgID) ep.organizationID = inParams.orgID
  if (inParams.masterOrganizationID) ep.masterOrganizationID = inParams.masterOrganizationID
  if (inParams.respEmployeeNumID) ep.respEmployeeNumID = inParams.respEmployeeNumID
  if (inParams.document) ep.documentPath = inParams.document
  if (inParams.allowPosting) ep.allowPosting = inParams.allowPosting
  orderUnityStore.run('update', {
    __skipSelectAfterUpdate: true,
    execParams: ep
  })
}
/** @param {ubMethodParams} ctxt */
function orderAfterDelete (ctxt) {
  const inParams = ctxt.mParams.execParams
  if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_order')
  // Object.keys(inParams)
  let ep = { ID: inParams.ID }
  UB.Repository('hr_empOrdListAppruv')
    .attrs(['ID', 'participantID'])
    .where('orderID', '=', inParams.ID)
    .selectAsObject().forEach(o => {
      new TubDataStore('hr_empOrdListAppruv').run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: o.ID,
          participantID: null
        }
      })
    })
  const acquaintanceListStore = new TubDataStore('hr_acquaintanceList')
  UB.Repository('hr_acquaintanceList').attrs(['ID', 'participantID.recStageID', 'participantID']).where('orderID', '=', inParams.ID).selectAsObject({ 'participantID.recStageID': 'recStageID' }).forEach(o => {
    const recparticipantStore = UB.DataStore('hr_recparticipant')
    const recStageStore = UB.DataStore('hr_recstage')
    acquaintanceListStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: o.ID,
        participantID: null
      }
    })
    o.participantID && recparticipantStore.run('delete', { __skipOptimisticLock: true, execParams: { ID: o.participantID } })
    o.recStageID && recStageStore.run('delete', { __skipOptimisticLock: true, execParams: { ID: o.recStageID } })
  })
  orderUnityStore.run('delete', {
    execParams: ep
  })
}

App.once('domainIsLoaded', () => {
  let orderClasses
  try {
    orderClasses = UB.Repository('hr_orderClass').attrs(['ID', 'description', 'entityName']).selectAsObject()
  } catch (e) {
    // console.warn('hr_orderClass not loaded. hr_orders entity do not track orders data manipulations')
    return
  }
  for (let i = 0, l = orderClasses.length; i < l; i++) {
    let order = orderClasses[i]
    if (global[order.entityName]) {
      global[order.entityName].on('insert:after', createOrderAfterInsert(order.ID))
      global[order.entityName].on('update:after', orderAfterUpdate)
      global[order.entityName].on('delete:after', orderAfterDelete)
      if (global[order.entityName].onAfterOrderEvent) {
        global[order.entityName].onAfterOrderEvent()
      }
    }
  }
  global.hr_employeeOrder.onAfterOrderEvent()
})
