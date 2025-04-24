const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const App = UB.App
let orderUnityStore

const employeeOrders = [
  global['hr_orderRegistryDt'],
  global['hr_empOrderDismDet'],
  global['hr_empOrderActingordDet'],
  global['hr_empOrderAppointDet'],
  global['hr_empOrderMoveDet'],
  global['hr_empOrderMissionDet'],
  global['hr_empOrderEmployeeDet'],
  global['hr_empOrderChgemployeeDet'],
  global['hr_empOrderBonusDet'],
  global['hr_empOrderRankDet'],
  global['hr_empOrderRewardDet'],
  global['hr_empOrderPenaltyDet'],
  global['hr_empOrderChgSalEmpDet'],
  global['hr_empOrderChgSalPosDet'],
  global['hr_empOrderBountyDet'],
  global['hr_empOrderActingDet'],
  global['hr_empOrderVacationDet'],
  global['hr_empOrderTrainingDet'],
  global['hr_empOrderMilserviceDet'], // Військова служба
  global['hr_empOrderCwsrelaxhdDet'], // День відпочинку за роботу в вихідній
  global['hr_empOrderCwsrelaxdonorDet'], // День відпочинку за донорство
  global['hr_empOrderCwsDet'], // Зміна графіку роботи
  global['hr_empOrderCwshdDet'], // Про роботу в вихідний,
  global['hr_empOrderInternshipDet'],
  global['hr_empOrderMilserviceretDet'],
  global['hr_empOrderVacationprolongDet'],
  global['hr_empOrderVacationprolonglDet'],
  global['hr_empOrderVacationlongDet'],
  global['hr_empOrderVacationrevokeDet'],
  global['hr_empOrderVacationcompDet'],
  global['hr_empOrderCanceldismDet'],
  // global['hr_empOrderCwsworkhourDet'],
  global['hr_empOrderUni'],
  global['hr_empOrderChgtimecostDet'],
  global['hr_empOrderTrialprolongDet'],
  global['hr_empOrderPluralistDet'],
  global['hr_empOrderRiskpayDet'],
  global['hr_empOrderOverpayDet'],
  global['hr_empOrderOutpluralDet'],
  global['hr_empOrderVacationretDet'],
  global['hr_empOrderChgPositionEmpDet'],
  global['hr_empOrderCertificationDet'],
  global['hr_empOrderDowntimeListDet'],
  global['hr_empOrderAddpayListDet'],
  global['hr_empOrderStafftablemoveDet'],
  global['hr_empOrderSTMovePosDet'],
  global['hr_empOrderActingCloseEmp'],
  global['hr_empOrderCancelparaDet'],
  global['hr_empOrderProlongationDet'],
  global['hr_empOrderChgsalaryDet'],
  global['hr_empOrderVacretprolongDet'],
  global['hr_empOrderTransferDet'],
  global['hr_empOrderTempsuspendDet'],
  global['hr_empOrderExitdowntimeListDet'],
  global['hr_empOrderCombiningposDet'],
  global['hr_empOrderVehicleassignDet'], // про закріплення автотранспорту
  global['hr_empOrderMedexaminationDet'],
  global['hr_empOrderMedexaminationListDet'],
  global['hr_empOrderChangemissionDet'],
  global['hr_empOrderCancelmissionDet'],
  global['hr_empOrderTempavgpayDet'],
  global['hr_empOrderCwshdgrpEmp'],
  global['hr_empOrderCwsRelaxhdGrpEmp']
]

function orderAfterInsert (ctxt) {
  const inParams = ctxt.mParams.execParams
  const attributes = App.domainInfo.entities[ctxt.dataStore.entity.name].attributes
  if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_employeeOrder')
  if (inParams.orderID && (inParams.employeeID || inParams.employeeNumberID || inParams.employeePositionID)) {
    const empID = inParams.employeeID ? inParams.employeeID : UB.Repository('hr_employeeNumberS').attrs(['employeeID']).selectById(inParams.employeeNumberID).employeeID
    const empOrder = UB.Repository('hr_employeeOrder').attrs(['ID'])
      .where('orderID', '=', inParams.orderID)
      .where('employeeID', '=', empID)
      .selectScalar()
    if (!empOrder) {
      orderUnityStore.run('insert', {
        execParams: {
          ID: inParams.ID,
          orderID: inParams.orderID,
          employeeID: empID,
          employeeNumberID: attributes['employeeNumberID'] ? inParams.employeeNumberID : null,
          employeePositionID: attributes['employeePositionID'] ? inParams.employeePositionID : null,
          mi_unityEntity: ctxt.dataStore.entity.name
        }
      })
    }
  }
}

function orderAfterUpdate (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_employeeOrder')
    let ep = { ID: inParams.ID }
    if (inParams.orderID !== undefined) ep.orderID = inParams.orderID
    if (inParams.employeeID !== undefined) ep.employeeID = inParams.employeeID
    if (inParams.employeeNumberID !== undefined) {
      ep.employeeNumberID = inParams.employeeNumberID
    }
    if (inParams.employeePositionID !== undefined) ep.employeePositionID = inParams.employeePositionID
    orderUnityStore.run('update', {
      execParams: ep,
      __skipOptimisticLock: true
    })
  }
}

/** @param {ubMethodParams} ctx */
function orderAfterDelete (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    if (!orderUnityStore) orderUnityStore = UB.DataStore('hr_employeeOrder')
    let ep = { ID: inParams.ID }
    orderUnityStore.run('delete', {
      execParams: ep
    })
  }
}

me.onAfterOrderEvent = function () {
  employeeOrders.forEach(employeeOrder => {
    employeeOrder.on('insert:after', orderAfterInsert)
    employeeOrder.on('update:after', orderAfterUpdate)
    employeeOrder.on('delete:after', orderAfterDelete)
  })
}
