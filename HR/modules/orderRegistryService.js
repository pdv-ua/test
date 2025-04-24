const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../../AC/modules/dataServices/dateService')
const orderService = require('../../HR/modules/orderService')
const periodService = require('../../HR/modules/periodService')
const rlService = require('../../HR/modules/rlService')
const orgService = require('../../HR/modules/orgService')
const payElService = require('../../HR/modules/payElService')
const payFundService = require('../../HR/modules/payFundService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const timService = require('../../HR/modules/timService')
const calcService = require('../../HR/modules/calcService')
const timeCostService = require('../../HR/modules/timeCostService')

module.exports = {
  createOrder,
  cancelOrder,
  updateOrderRegistryState,
  checkOrderRegistryDtPeriodCalc,
  clearOrderRegistryDtPeriodCalc,
  getTimeSheetChangeByOrder,
  setAllowPostingForOrders,
  updateEmployeeList
}

function createOrder (empOrderID) {
  const result = {
    errorMessages: [],
    warningMessages: []
  }
  const hrOrder = UB.Repository('hr_order').attrs(['orderState', 'orderClass.entityName', 'empOrderType', 'description']).selectById(empOrderID)

  if (!hrOrder) {
    result.errorMessages.push(UB.i18n(`Не знайдено наказ. Можливо він був видалений`))
    return result
  }
  if (hrOrder.orderState !== 'POSTED') {
    result.errorMessages.push(UB.i18n(`Наказ {0} не проведений`, hrOrder.description))
    return result
  }
  const store = UB.DataStore(hrOrder['orderClass.entityName'])
  store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'ON_PROCESSING' })
  store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'ON_PROCESSING' })
  App.dbCommit()
  try {
    let attrs = ['*']
    switch (hrOrder['orderClass.entityName']) {
      case 'hr_empOrder':
        attrs = ['ID', 'orderNumber', 'orderDate', 'orderState', 'empOrderType', 'periodID', 'payElID', 'isGroup', 'organizationID', 'description']
        break
      case 'hr_sicknessMeeting':
        attrs = ['ID', 'empOrderType', 'orderState', 'orderDate', 'orderNumber', 'organizationID', 'description']
        break
    }
    const order = UB.Repository(hrOrder['orderClass.entityName'])
      .attrs(attrs)
      .selectById(empOrderID)

    const period = periodService.getCurrentPeriod(order.organizationID)
    if (!period.ID) {
      result.errorMessages.push(UB.i18n(`Для організації не знайдено поточного періоду`))
      return result
    }

    let orderRegistryDoc
    switch (order.empOrderType) {
      case 'MISSION': /* 'Відрядження' */
      case 'MISSION_G':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryBusinessTrip', { name: hrOrder.description })
        orderRegistryBusinessTrip(order, orderRegistryDoc, period, result)
        break
      case 'VACATION':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryVacation', { name: hrOrder.description })
        orderRegistryVacation(order, orderRegistryDoc, period, result)
        orderRegistryBountyHealth(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryUnpaidAbsence', { name: hrOrder.description })
        orderRegistryVacationUnpaid(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        orderRegistryVacationLong(order, period, result)
        break
      case 'VACATIONPROLONG':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryVacation', { name: hrOrder.description })
        orderRegistryVacationProlong(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryUnpaidAbsence', { name: hrOrder.description })
        orderRegistryVacationUnpaid(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        orderRegistryVacationProlongLongVac(order, period, result)
        break
      case 'VACATIONREVOKE':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryVacation', { name: hrOrder.description })
        orderRegistryVacationMove(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        break
      case 'DISM':
        orderRegistryDismission(order, period, result)
        break
      case 'BOUNTY':
        orderRegistryPremium(order, period, result)
        break
      case 'BOUNTY_HELP':
        orderRegistryBountyHelp(order, period, result)
        break
      case 'RISKPAY':
        orderRegistryRiskPay(order, period, result)
        break
      case 'ADDPAY':
        orderRegistryAddPay(order, period, result)
        break
      case 'SICKNESSMEETING':
        orderRegistrySickness(order, period, result)
        orderRegistryFuneral(order, period, result)
        break
      case 'CWSRELAXDONOR':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgPay', { name: hrOrder.description })
        orderRegistryRelaxDonor(order, orderRegistryDoc, period, result)
        break
      case 'TRAINING':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgPay', { name: hrOrder.description })
        orderRegistryTraining(order, orderRegistryDoc, period, result)
        break
      case 'VACATIONCOMP':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegVacationCompensation', { name: hrOrder.description })
        orderRegVacationCompensation(order, orderRegistryDoc, period, result)
        break
      case 'APPOINT':
        const empOrderAcc = UB.Repository('hr_empOrderAcc')
          .attrs(['ID'])
          .where('empOrderID', '=', order.ID)
          .where('empOrderDetID.orderStateEx', '!=', 'CANCELED')
          .where('payElID.methodID.code', '=', '42')
          .limit(1)
          .selectSingle()
        if (empOrderAcc) {
          orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistrySinglePay', { name: hrOrder.description })
          orderRegistrySinglePay(order, orderRegistryDoc, period, result)
        }
        setAppointTimeSheet(order, period)
        break
      case 'MILSERVICE':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgLongPay', { name: hrOrder.description })
        orderRegistryMilService(order, orderRegistryDoc, period, result)
        break
      case 'MEDEXAMINATION':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgPay', { name: hrOrder.description })
        orderRegistryMedExamination(order, orderRegistryDoc, period, result)
        break
      case 'CHANGEMISSION':
        orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryBusinessTrip', { name: hrOrder.description })
        orderRegistryChangeMission(order, orderRegistryDoc, period, result)
        deleteIfEmptyOrderRegistry(orderRegistryDoc)
        break
      case 'MOVE':
        const hasEasyWork = UB.Repository('hr_empOrderMoveDet')
          .attrs(['ID'])
          .where('orderID', '=', order.ID)
          .where('addPayElID.methodID.code', '=', '51')
          .where('addPayDateFrom', 'isNotNull')
          .limit(1)
          .selectSingle()
        if (hasEasyWork) {
          orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryEasyWork', { name: hrOrder.description })
          orderRegistryEasyWork(order, orderRegistryDoc, period, result)
          deleteIfEmptyOrderRegistry(orderRegistryDoc)
        }
        const hasSupAvgEarn = UB.Repository('hr_empOrderMoveDet')
          .attrs(['ID'])
          .where('orderID', '=', order.ID)
          .where('addPayElID.methodID.code', '=', '50')
          .where('addPayDateFrom', 'isNotNull')
          .limit(1)
          .selectSingle()
        if (hasSupAvgEarn) {
          orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistrySupAvgEarn', { name: hrOrder.description })
          orderRegistrySupAvgEarn(order, orderRegistryDoc, period, result)
          deleteIfEmptyOrderRegistry(orderRegistryDoc)
        }
        break
      case 'AVERAGEPAY':
        const hasLongAvgPay = UB.Repository('hr_empOrderTempavgpayDet')
          .attrs(['ID'])
          .where('orderID', '=', order.ID)
          .where('payElID', 'isNotNull')
          .limit(1)
          .selectSingle()
        if (hasLongAvgPay) {
          orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgLongPay', { name: hrOrder.description })
          orderRegistryAvgLongPay(order, orderRegistryDoc, period, result)
          deleteIfEmptyOrderRegistry(orderRegistryDoc)
        }
        const hasAvgPay = UB.Repository('hr_empOrderAveragepayDet')
          .attrs(['ID'])
          .where('orderID', '=', order.ID)
          .where('payElID', 'isNotNull')
          .limit(1)
          .selectSingle()
        if (hasAvgPay) {
          orderRegistryDoc = getOrderRegistry(order, period, 'hr_orderRegistryAvgPay', { name: hrOrder.description })
          orderRegistryAveragePay(order, orderRegistryDoc, period, result)
          deleteIfEmptyOrderRegistry(orderRegistryDoc)
        }
        break
    }
    deleteIfEmptyOrderRegistry(orderRegistryDoc)

    if (result.errorMessages.length) {
      App.dbRollback()
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED' })
      store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED' })
      App.dbCommit()
    } else {
      store.execSQL(`UPDATE hr_order SET orderState = :orderState:, periodCalcID = :periodID: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED', periodID: period.ID })
      store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState:, periodCalcID = :periodID: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED', periodID: period.ID })
    }
  } catch (e) {
    App.dbRollback()
    store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED' })
    store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED' })
    App.dbCommit()
    throw e
  }

  return result
}

function cancelOrder (empOrderID, skipOnProcessing = false) {
  const result = {
    errorMessages: []
  }
  const hrOrder = UB.Repository('hr_order').attrs(['orderState', 'orderClass.entityName', 'empOrderType', 'description']).selectById(empOrderID)
  if (!hrOrder) {
    result.errorMessages.push(UB.i18n(`Не знайдено наказ. Можливо він був видалений`))
    return result
  }
  if (hrOrder.orderState !== 'PROCESSED' && !skipOnProcessing) {
    result.errorMessages.push(UB.i18n(`Наказ {0} не оброблений`, hrOrder.description))
    return result
  }
  const store = UB.DataStore(hrOrder['orderClass.entityName'])
  store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'ON_PROCESSING' })
  store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'ON_PROCESSING' })
  App.dbCommit()
  try {
    let attrs = ['*']
    switch (hrOrder['orderClass.entityName']) {
      case 'hr_empOrder':
        attrs = ['ID', 'orderNumber', 'orderDate', 'orderState', 'empOrderType', 'periodID', 'payElID', 'isGroup', 'organizationID']
        break
      case 'hr_sicknessMeeting':
        attrs = ['ID', 'empOrderType', 'orderState', 'orderDate', 'orderNumber', 'organizationID', 'description']
        break
    }
    const order = UB.Repository(hrOrder['orderClass.entityName'])
      .attrs(attrs)
      .selectById(empOrderID)

    let regOrderStore
    let regOrders
    switch (order.empOrderType) {
      case 'MISSION':
      case 'MISSION_G':
        removeDocReg('hr_docRegBusinessTrip', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'VACATION':
      case 'VACATIONPROLONG':
      case 'VACATIONREVOKE':
        removeDocReg('hr_docRegVacation', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegUnpaidAbsence', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegUnpaidAbsence', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegVacationKid', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegBountyHelp', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeEmployeeAccrual(empOrderID, result)
        break
      case 'DISM':
        removeDocReg('hr_docRegVacationCompensation', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegSeverancePay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'BOUNTY':
      case 'RISKPAY':
      case 'ADDPAY':
        regOrderStore = UB.DataStore('hr_orderRegistry')
        regOrders = UB.Repository('hr_orderRegistry')
          .attrs(['ID', 'orderState', 'description'])
          .where('empOrderID', '=', empOrderID)
          .selectAsObject()
        regOrders.forEach(regOrder => {
          if (regOrder.orderState !== 'POSTED') {
            regOrderStore.run('delete', {
              skipEmpOrder: true,
              execParams: {
                ID: regOrder.ID
              }
            })
          } else {
            result.errorMessages.push(UB.i18n(`Документ нарахування {0} -  проведений`, regOrder.description))
          }
        })
        break
      case 'BOUNTY_HELP':
        removeDocReg('hr_docRegBountyHelp', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'SICKNESSMEETING':
        removeDocReg('hr_docRegSickness', order.ID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegFuneral', order.ID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'CWSRELAXDONOR':
      case 'TRAINING':
        removeDocReg('hr_docRegAvgPay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'VACATIONCOMP':
        removeDocReg('hr_docRegVacationCompensation', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'APPOINT':
        removeDocReg('hr_docRegSinglePay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeAppointTimeSheet(empOrderID, order)
        break
      case 'MILSERVICE':
        removeDocReg('hr_docRegAvgLongPay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeEmployeeAccrual(empOrderID, result)
        break
      case 'MEDEXAMINATION':
        removeDocReg('hr_docRegAvgPay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeEmployeeAccrual(empOrderID, result)
        break
      case 'CHANGEMISSION':
        cancelOrderRegistryChangeMission(empOrderID, result)
        removeDocReg('hr_docRegBusinessTrip', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
      case 'MOVE':
        removeDocReg('hr_docRegEasyWork', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegSupAvgEarn', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeEmployeeAccrual(empOrderID, result)
        break
      case 'AVERAGEPAY':
        removeDocReg('hr_docRegAvgLongPay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        removeDocReg('hr_docRegAvgPay', empOrderID, result)
        removeOrderRegistry(result.orderRegistryID)
        break
    }

    if (result.errorMessages.length) {
      App.dbRollback()
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED' })
      store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED' })
      App.dbCommit()
    } else {
      store.execSQL(`UPDATE hr_order SET orderState = :orderState:, periodCalcID = :periodID: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED', periodID: null })
      store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState:, periodCalcID = :periodID: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'POSTED', periodID: null })
    }
  } catch (e) {
    App.dbRollback()
    store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED' })
    store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState: WHERE ID = :ID:`, { ID: empOrderID, orderState: 'PROCESSED' })
    App.dbCommit()
    throw e
  }

  return result
}

function removeDocReg (entityName, empOrderID, result) {
  const regOrderStore = UB.DataStore(entityName)
  const regOrders = UB.Repository(entityName)
    .attrs(['ID', 'orderState', 'description', 'orderRegistryID.description', 'orderRegistryID', 'orderRegistryID.orderState'])
    .where('empOrderID', '=', empOrderID)
    .selectAsObject()
  const postedDoc = regOrders.find(o => o['orderState'] === 'POSTED')
  const hasProject = regOrders.find(o => o['orderState'] === 'PROJECT')

  if (postedDoc) {
    let errorMessage = hasProject
      ? UB.i18n(`Документ нарахування {0} частково проведений`, postedDoc['orderRegistryID.description'])
      : UB.i18n(`Документ нарахування {0} проведений`, postedDoc['orderRegistryID.description'])
    result.errorMessages.push(errorMessage)
    return
  }
  result.orderRegistryID = regOrders.length ? regOrders[0].orderRegistryID : null
  regOrders.forEach(regOrder => {
    if (regOrder.orderState === 'PROJECT') {
      regOrderStore.run('delete', {
        skipEmpOrder: true,
        forcedDelete: true,
        execParams: {
          ID: regOrder.ID
        }
      })
    }
  })
}

function removeOrderRegistry (orderRegistryID) {
  if (orderRegistryID) {
    const regOrdersDt = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID'])
      .where('orderRegistryID', '=', orderRegistryID)
      .selectAsObject()
    if (!regOrdersDt.length) {
      const order = UB.Repository('hr_orderRegistry').attrs('ID').selectById(orderRegistryID)
      if (order) {
        const store = UB.DataStore('hr_orderRegistry')
        store.run('delete', {
          skipEmpOrder: true,
          forcedDelete: true,
          execParams: {
            ID: orderRegistryID
          }
        })
      }
    }
  }
}

function removeEmployeeAccrual (empOrderID, result) {
  const pAccuals = UB.Repository('hr_employeeAccrual')
    .attrs(['ID'])
    .where('orderID', '=', empOrderID)
    .selectAsObject()
  const store = UB.DataStore('hr_employeeAccrual')
  pAccuals.forEach(row => {
    store.run('delete', {
      skipEmpOrder: true,
      forcedDelete: true,
      execParams: {
        ID: row.ID
      }
    })
  })
}

function getOrderRegistry (order, period, orderType, params, createNew = true) {
  let orderRegistry
  if (!createNew) {
    orderRegistry = UB.Repository('hr_orderRegistry')
      .attrs(['ID', 'orderNumber', 'name', 'orderDate', 'orderState', 'periodID', 'organizationID', 'orderType', 'payElID',
        'baseSum', 'rate', 'filterParams', 'docNumber'])
      .where('orderState', '=', 'PROJECT')
      .where('periodID', '=', period.ID)
      .where('organizationID', '=', order.organizationID)
      .where('orderType', '=', orderType)
      .limit(1)
      .selectSingle()
  }
  if (!orderRegistry) {
    const store = UB.DataStore('hr_orderRegistry')
    const ID = store.generateID()
    const orderDate = dateService.currentDate()
    store.run('insert', {
      execParams: Object.assign({
        ID,
        orderNumber: orderService.getOrderNum('hr_orderRegistry', orderDate, order.organizationID),
        orderDate,
        orderState: 'PROJECT',
        periodID: period.ID,
        organizationID: order.organizationID,
        orderType,
        empOrderID: order.ID,
        includeSubDep: 0,
        includeSubDepGroup: 0,
        isOnlyPositive: 0,
        checkBalance: 0
      }, params)
    })
    orderRegistry = UB.Repository('hr_orderRegistry')
      .attrs(['ID', 'orderNumber', 'name', 'orderDate', 'orderState', 'periodID', 'organizationID', 'orderType', 'payElID',
        'baseSum', 'rate', 'filterParams', 'docNumber'])
      .selectById(ID)
  }
  return orderRegistry
}

function deleteIfEmptyOrderRegistry (orderRegistry) {
  if (orderRegistry && orderRegistry.ID) {
    const detailsCount = UB.Repository('hr_orderRegistryDt')
      .attrs('COUNT(*)')
      .where('orderRegistryID', '=', orderRegistry.ID)
      .misc({ __skipRls: true })
      .selectScalar()
    if (detailsCount === 0) {
      const order = UB.Repository('hr_orderRegistry').attrs('ID').selectById(orderRegistry.ID)
      if (order) {
        UB.DataStore('hr_orderRegistry').run('delete', {
          execParams: {
            ID: orderRegistry.ID
          }
        })
      }
    }
  }
}

function orderRegistryBusinessTrip (order, orderRegistry, period, result) {
  const empOrderMissionDet = UB.Repository('hr_empOrderMissionDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dictTimeCostID', 'dayCount',
      'dateFrom', 'dateTo', 'isGroup', 'payElID', 'payElID.dayAccumCondition', 'payElID.methodID.dayAccumCondition',
      'payElID.calcIndAvgType', 'payElID.calcEarnings', 'payElID.calcEachPeriod'
    ])
    .where('orderID', '=', order.ID)
    .selectAsObject()
  const docRegBusinessTrip = []

  const docRegBusinessTripStore = UB.DataStore('hr_docRegBusinessTrip')

  empOrderMissionDet.forEach(det => {
    if (det.isGroup) {
      const empOrderEmployeeDet = UB.Repository('hr_empOrderEmployeeDet')
        .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'employeeNumberID.description',
          'dictTimeCostID', 'payElID', 'payElID.dayAccumCondition', 'payElID.methodID.dayAccumCondition',
          'payElID.calcIndAvgType', 'payElID.calcEarnings', 'payElID.calcEachPeriod'
        ])
        .where('orderID', '=', order.ID)
        .where('payElID', 'isNotNull')
        .where('paraID', '=', det.ID)
        .selectAsObject()
      let dateFrom = dateService.shiftDate(det.dateFrom)
      let dateTo = dateService.shiftDate(det.dateTo)
      empOrderEmployeeDet.forEach(empDet => {
        const empNum = UB.Repository('hr_employeeNumberS').attrs(['ID']).selectById(empDet.employeeNumberID)
        if (!empNum) {
          result.errorMessages.push(UB.i18n(`Не знайдено працівника {0}`, empDet['employeeNumberID.description']))
          return
        }
        const periods = empDet['payElID.calcEachPeriod']
          ? periodService.getPeriodsByDate(order.organizationID, dateService.firstDayOfMonth(dateFrom), dateService.lastDayOfMonth(dateTo))
          : [period]
        periods.forEach(calcPeriod => {
          const newDoc = {
            orderRegistryID: orderRegistry.ID,
            empOrderID: order.ID,
            empOrderDetID: empDet.ID,
            empOrderType: 'MISSION',
            orderNumber: order.orderNumber,
            orderDate: dateService.shiftDate(order.orderDate),
            orderState: 'PROJECT',
            employeeID: empDet.employeeID,
            employeeNumberID: empDet.employeeNumberID,
            employeePositionID: empDet.employeePositionID,
            payElID: empDet['payElID'],
            dateFrom: empDet['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.max(calcPeriod.dateFrom, dateFrom)) : dateFrom,
            dateTo: empDet['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.min(calcPeriod.dateTo, dateTo)) : dateTo,
            dayCount: det.dayCount,
            dayAccumCondition: empDet['payElID.dayAccumCondition'] || empDet['payElID.methodID.dayAccumCondition'] || det['payElID.dayAccumCondition'] || det['payElID.methodID.dayAccumCondition'] || 'noDaysOff',
            calcEarnings: empDet['payElID.calcEarnings'],
            flagsFix: 0
          }
          const calIndAvgType = empDet['payElID.calcIndAvgType'] || det['payElID.calcIndAvgType']
          switch (calIndAvgType) {
            case 'AVG':
              newDoc.indAvgPlan = 'INDAVG'
              newDoc.flagsFix = newDoc.flagsFix | 1 << 23
              break
            case 'PLAN':
              newDoc.indAvgPlan = 'INDPLAN'
              newDoc.avgCalcType = 'PLAN'
              newDoc.flagsFix = newDoc.flagsFix | 1 << 23
              break
          }
          docRegBusinessTrip.push(newDoc)
        })
      })
    } else {
      let dateFrom = dateService.shiftDate(det.dateFrom)
      let dateTo = dateService.shiftDate(det.dateTo)
      const periods = det['payElID.calcEachPeriod']
        ? periodService.getPeriodsByDate(order.organizationID, dateService.firstDayOfMonth(dateFrom), dateService.lastDayOfMonth(dateTo))
        : [period]
      periods.forEach(calcPeriod => {
        docRegBusinessTrip.push({
          orderRegistryID: orderRegistry.ID,
          empOrderID: order.ID,
          empOrderDetID: det.ID,
          empOrderType: 'MISSION',
          orderNumber: order.orderNumber,
          orderDate: dateService.shiftDate(order.orderDate),
          orderState: 'PROJECT',
          employeeID: det.employeeID,
          employeeNumberID: det.employeeNumberID,
          employeePositionID: det.employeePositionID,
          payElID: det['payElID'],
          dateFrom: det['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.max(calcPeriod.dateFrom, dateFrom)) : dateFrom,
          dateTo: det['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.min(calcPeriod.dateTo, dateTo)) : dateTo,
          dayCount: det.dayCount,
          dayAccumCondition: det['payElID.dayAccumCondition'] || det['payElID.methodID.dayAccumCondition'] || 'noDaysOff',
          calcEarnings: det['payElID.calcEarnings']
        })
      })
    }
  })

  docRegBusinessTrip.forEach(doc => {
    doc.ID = docRegBusinessTripStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.ID, // doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: (doc.flagsRec || 0) | 2,
      flagsFix: doc.flagsFix,
      dayAccumCondition: doc.dayAccumCondition,
      calcEarnings: doc.calcEarnings,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'indAvgPlan',
      'calcSum', 'planSum', 'flagsFix', 'flagsRec', 'calcEarnings']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition

    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }
    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegBusinessTripStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryBountyHealth (order, orderRegistry, period, result) {
  const payEl = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'calcAvgType'])
    .where('methodID.code', '=', '37')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle() || {}

  const docReg = []
  const docRegStore = UB.DataStore('hr_docRegBountyHelp')

  const empOrderEmployeeDet = UB.Repository('hr_empOrderVacationDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'moneyHelpPayElID', 'moneyHelpPayElID.calcAvgType'])
    .where('orderID', '=', order.ID)
    .where('isMoneyHelp', '=', 1)
    .orderBy('dateFrom')
    .selectAsObject()

  const currentPeriod = periodService.getCurrentPeriod(orderRegistry.organizationID)
  const setBountyHelpVacationPeriod = settingsService.getByCode('setBountyHelpVacationPeriod', orderRegistry.organizationID)
  empOrderEmployeeDet.forEach(empDet => {
    const periodSalary = periodService.getPeriodOnDate(orderRegistry.organizationID, dateService.shiftDate(empDet.dateFrom)) || period
    const payElID = empDet.moneyHelpPayElID || payEl.ID
    const calcAvgType = empDet.moneyHelpPayElID ? empDet['moneyHelpPayElID.calcAvgType'] : payEl.calcAvgType
    if (!payElID) {
      result.errorMessages.push(UB.i18n(`Не знайдено вид оплати для матеріальної допомоги на оздоровлення`))
      return
    }
    docReg.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: empDet.ID,
      empOrderType: 'BOUNTY_HELP',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: empDet.employeeID,
      employeeNumberID: empDet.employeeNumberID,
      employeePositionID: empDet.employeePositionID,
      payElID: payElID,
      countMonth: 1,
      dateFrom: dateService.shiftDate(empDet.dateFrom),
      rate: calcAvgType ? 100 : null,
      flagsFix: calcAvgType ? 1 << 9 : 0,
      periodSalaryID: setBountyHelpVacationPeriod ? periodSalary.ID : currentPeriod.ID
    })
  })

  if (result.errorMessages.length) {
    return
  }
  docReg.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      periodSalaryID: doc.periodSalaryID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dateFromAvg', 'dateToAvg', 'avgCalcType', 'paySum', 'rate', 'avgDays', 'avgSumMonth', 'flagsFix', 'flagsRec']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'paySum', 'accrualDt', 'rate', 'avgDays', 'avgSumMonth' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    doc.accrualDt = JSON.stringify(resultData.accrualDt)

    const formData = {
      detail: {
        orderRegistryDt: { insert: [] },
        accrualAvg: { insert: [] }
      }
    }
    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    delete doc.dayAccumCondition
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryBountyHelp (order, period, result) {
  const payEl = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'calcAvgType'])
    .where('methodID.code', '=', '36')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle()
  if (!payEl) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати Матеріальна допомога`))
    return
  }

  const docReg = []
  const docRegStore = UB.DataStore('hr_docRegBountyHelp')
  const orderRegistry = getOrderRegistry(order, period, 'hr_orderRegistryBountyHelp', { name: order.description })

  const empOrderDet = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'valuation', 'payElID', 'payElID.calcAvgType',
      'avgCount', 'accrualRate', 'accrualCount', 'newValue', 'dictFundSourceID', 'bountyParaID.dictFundSourceID',
      'employeeFamilyID', 'employeeFamilyPosID', 'employeeFamilyPosID.employeeNumberID'
    ])
    .where('orderID', '=', order.ID)
    .orderBy('dateFrom')
    .selectAsObject()

  // valuation: 'AVG', 'PLAN', 'SUM', 'PRC'

  empOrderDet.forEach(empDet => {
    const dictFundSourceID = empDet['dictFundSourceID'] || empDet['bountyParaID.dictFundSourceID']
    let flagsFix = empDet.valuation === 'SUM' ? 513 : ((empDet.valuation === 'PRC' || empDet.valuation === 'PLAN' || (empDet.valuation === 'AVG' && (empDet['payElID.calcAvgType'] || payEl.calcAvgType) === 'PLAN')) ? 1 << 9 : 0)
    if (dictFundSourceID) {
      flagsFix = (flagsFix || 0) | 1 << 14
    }
    if (empDet['employeeFamilyID'] && empDet['employeeFamilyPosID']) {
      empDet.employeePositionID = empDet['employeeFamilyPosID']
      empDet.employeeNumberID = empDet['employeeFamilyPosID.employeeNumberID']
    }
    docReg.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: empDet.ID,
      empOrderType: 'BOUNTY_HELP',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: empDet.employeeID,
      employeeNumberID: empDet.employeeNumberID,
      employeePositionID: empDet.employeePositionID,
      payElID: empDet.payElID || payEl.ID,
      countMonth: empDet.valuation === 'AVG' ? empDet.avgCount : (empDet.valuation === 'PLAN' ? empDet.accrualCount : 1) || 1,
      rate: empDet.valuation === 'PRC' ? empDet.accrualRate
        : (empDet.valuation === 'PLAN' ? empDet.accrualCount * 100
          : (empDet.valuation === 'AVG' && (empDet['payElID.calcAvgType'] || payEl.calcAvgType) === 'PLAN') ? empDet.avgCount * 100 : 100),
      baseSum: empDet.valuation === 'SUM' ? empDet.newValue : null,
      avgSumMonth: empDet.valuation === 'SUM' ? empDet.newValue : null,
      paySum: empDet.valuation === 'SUM' ? empDet.newValue : null,
      valuation: empDet.valuation,
      dateFrom: dateService.shiftDate(order.orderDate),
      dictFundSourceID,
      flagsFix
    })
  })
  docReg.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const periodSalary = periodService.getPeriodOnDate(orderRegistry.organizationID, doc.dateFrom)
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dateFromAvg', 'dateToAvg', 'avgCalcType', 'paySum', 'rate', 'avgDays', 'avgSumMonth', 'flagsFix', 'flagsRec', 'countMonth']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'paySum', 'accrualDt', 'rate', 'avgDays', 'avgSumMonth' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.periodSalaryID = periodSalary ? periodSalary.ID : period.ID
    doc.avgSum = resultData.baseSum
    doc.accrualDt = JSON.stringify(resultData.accrualDt)
    delete doc.baseSum
    const formData = {
      detail: {
        orderRegistryDt: { insert: [] },
        accrualAvg: { insert: [] }
      }
    }
    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
      })
      accrual.periodSalaryID = doc.periodSalaryID
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    delete doc.dayAccumCondition
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
  deleteIfEmptyOrderRegistry(orderRegistry)
}

function orderRegistryVacation (order, orderRegistry, period, result) {
  const payEls = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'methodID', 'methodID.code'])
    .where('methodID.code', 'in', ['13', '15'])
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject()
  const payEl = payEls.find(o => o['methodID.code'] === '13')
  const payElUnpaid = payEls.find(o => o['methodID.code'] === '15')

  if (!payEl) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка"`))
    return
  }
  if (!payElUnpaid) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка без утримання"`))
    return
  }
  const docReg = []
  const docRegStore = UB.DataStore('hr_docRegVacation')
  const docRegUnpaidStore = UB.DataStore('hr_docRegUnpaidAbsence')
  let orderRegistryUnpaid
  const methodList = ['13', '67', '142', '73']
  const empOrderEmployeeDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount', 'empOrderType',
      'dictVacationKindID', 'dictVacationKindID.payElID', 'dictVacationKindID.payElID.methodID',
      'dictVacationKindID.payElID.methodID.dayAccumCondition', 'dictVacationKindID.name',
      'dictVacationKindID.payElPrevWorkID', 'dictVacationKindID.payElPrevWorkID.methodID',
      'dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition', 'empVacationPeriodID',
      'empVacationPeriodID.fromOrgID', 'employeeNumberID.parentEmpNumberID.orgID' ])
    .where('orderID', '=', order.ID)
    .where('paraID.orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', methodList)
    .orderBy('dateFrom')
    .selectAsObject()
  empOrderEmployeeDet.forEach(empDet => {
    const dateFrom = dateService.shiftDate(empDet.dateFrom)
    const dateTo = dateService.shiftDate(empDet.dateTo)
    const currentOrg = (empDet['empVacationPeriodID.fromOrgID'] === null || empDet['empVacationPeriodID.fromOrgID'] === orderRegistry.organizationID) ||
      empDet['empVacationPeriodID.fromOrgID'] === empDet['employeeNumberID.parentEmpNumberID.orgID']
    const payElID = currentOrg ? (empDet['dictVacationKindID.payElID'] || payEl.ID) : (empDet['dictVacationKindID.payElPrevWorkID'] || payElUnpaid.ID)
    const prevItem = docReg.find(o => o.employeeNumberID === empDet.employeeNumberID && o.employeePositionID === empDet.employeePositionID &&
      currentOrg === o.currentOrg && o.payElID === payElID && dateService.addDays(o.dateTo, 1).getTime() === dateFrom.getTime())
    if (!currentOrg && !orderRegistryUnpaid) {
      orderRegistryUnpaid = getOrderRegistry(order, period, 'hr_orderRegistryUnpaidAbsence', { name: order.description })
    }
    if (prevItem) {
      prevItem.dateTo = dateTo
      prevItem.dayCount += empDet.dayCount
    } else {
      docReg.push({
        orderRegistryID: currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID),
        empOrderID: order.ID,
        empOrderDetID: empDet.ID,
        empOrderType: 'VACATION',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: empDet.employeeID,
        employeeNumberID: empDet.employeeNumberID,
        employeePositionID: empDet.employeePositionID,
        payElID: payElID,
        dayAccumCondition: (currentOrg
          ? (empDet['dictVacationKindID.payElID.methodID.dayAccumCondition'] || payEl['methodID.dayAccumCondition'])
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition'] || payElUnpaid['methodID.dayAccumCondition'])) || 'noHolidays',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: empDet.dayCount,
        methodID: currentOrg ? (empDet['dictVacationKindID.payElID.methodID'] || payEl.methodID)
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID'] || payElUnpaid.methodID),
        currentOrg
      })
    }
  })
  const empOrderLongDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
      'dateFrom', 'dateTo', 'dictVacationKindID.payElID', 'orderID.description',
      'dictVacationKindID.payElID.methodID.dayAccumCondition', 'dictVacationKindID.name'])
    .where('orderID', '=', order.ID)
    .where('orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', methodList)
    .selectAsObject()

  empOrderLongDet.forEach(empDet => {
    const dateFrom = dateService.shiftDate(empDet.dateFrom)
    const dateTo = dateService.shiftDate(empDet.dateTo)
    const payElID = empDet['dictVacationKindID.payElID'] || payEl.ID
    const prevItem = docReg.find(o => o.employeeNumberID === empDet.employeeNumberID && o.employeePositionID === empDet.employeePositionID &&
      o.payElID === payElID && dateService.addDays(o.dateTo, 1).getTime() === dateFrom.getTime())
    if (prevItem) {
      prevItem.dateTo = dateTo
      prevItem.dayCount += empDet.dayCount
    } else {
      docReg.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: empDet.ID,
        empOrderType: 'VACATION',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: empDet.employeeID,
        employeeNumberID: empDet.employeeNumberID,
        employeePositionID: empDet.employeePositionID,
        payElID: payElID,
        dayAccumCondition: empDet['dictVacationKindID.payElID.methodID.dayAccumCondition'] || payEl['methodID.dayAccumCondition'] || 'noHolidays',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: empDet.dayCount,
        methodID: empDet['dictVacationKindID.payElID.methodID'] || payEl.methodID
      })
    }
  })
  if (result.errorMessages.length) {
    return
  }

  const cont = {
    emp: { },
    org: orgService.getOrgData(orderRegistry.organizationID),
    payEl: payElService.getPayEl({ orgID: orderRegistry.organizationID }),
    payFund: payFundService.getPayFund(),
    periodCalc: period
  }
  let docParentID
  docReg.forEach((doc, docIdx) => {
    const currentOrg = doc.currentOrg === undefined ? true : doc.currentOrg
    delete doc.currentOrg
    docParentID = doc.parentID
    if (docIdx > 0) {
      for (let idx = docIdx - 1; idx >= 0; idx--) {
        if (docReg[idx].employeeNumberID === doc.employeeNumberID && docReg[idx].methodID === doc.methodID &&
          (dateService.dayDiff(docReg[idx].dateTo, doc.dateFrom) < 2)) {
          docParentID = docReg[idx].ID
        }
      }
    }

    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      parentID: docParentID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc), Object.assign({}, cont))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'flagsFix', 'flagsRec']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']

    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    if (currentOrg) {
      doc.avgSum = resultData.baseSum
    }
    const accrualsAvg = []
    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrualsAvg.push(accrual)
    })

    delete doc.dayAccumCondition
    const methodID = doc.methodID
    delete doc.methodID
    doc.ID = currentOrg ? docRegStore.generateID() : docRegUnpaidStore.generateID()
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach((accr, idx) => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
      })
      accrual.orderRegistryID = currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID)
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = accr.dateFrom
      accrual.orderDateTo = accr.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
      if (idx === 0 && !doc.parentID && docParentID && currentOrg) {
        doc.parentID = docParentID
      }
    })
    accrualsAvg.forEach(accAvg => {
      accAvg.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accAvg)
    })
    const store = currentOrg ? docRegStore : docRegUnpaidStore
    store.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
    doc.methodID = methodID
  })
}

function orderRegistryVacationMove (order, orderRegistry, period, result) {
  const payEls = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'methodID', 'methodID.code'])
    .where('methodID.code', 'in', ['13', '15'])
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject()
  const payEl = payEls.find(o => o['methodID.code'] === '13')
  const payElUnpaid = payEls.find(o => o['methodID.code'] === '15')

  if (!payEl) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка"`))
    return
  }
  if (!payElUnpaid) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка без утримання"`))
    return
  }
  const docReg = []
  const docRegStore = UB.DataStore('hr_docRegVacation')
  const docRegUnpaidStore = UB.DataStore('hr_docRegUnpaidAbsence')
  let orderRegistryUnpaid
  const methodList = ['13', '67', '142', '73']
  const empOrderEmployeeDet = UB.Repository('hr_empOrderVacationMoveDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount', 'empOrderType',
      'dictVacationKindID', 'dictVacationKindID.payElID', 'dictVacationKindID.payElID.methodID', 'paraID',
      'dictVacationKindID.payElID.methodID.dayAccumCondition', 'dictVacationKindID.name',
      'dictVacationKindID.payElPrevWorkID', 'dictVacationKindID.payElPrevWorkID.methodID',
      'dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition',
      'empVacationPeriodID.fromOrgID', 'employeeNumberID.parentEmpNumberID.orgID' ])
    .where('orderID', '=', order.ID)
    .where('paraID.orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', methodList)
    .orderBy('dateFrom')
    .selectAsObject()

  empOrderEmployeeDet.forEach(empDet => {
    const dateFrom = dateService.shiftDate(empDet.dateFrom)
    const dateTo = dateService.shiftDate(empDet.dateTo)
    const currentOrg = (empDet['empVacationPeriodID.fromOrgID'] === null || empDet['empVacationPeriodID.fromOrgID'] === orderRegistry.organizationID) ||
      empDet['empVacationPeriodID.fromOrgID'] === empDet['employeeNumberID.parentEmpNumberID.orgID']
    const payElID = currentOrg ? (empDet['dictVacationKindID.payElID'] || payEl.ID) : (empDet['dictVacationKindID.payElPrevWorkID'] || payElUnpaid.ID)
    const prevItem = docReg.find(o => o.employeeNumberID === empDet.employeeNumberID && o.employeePositionID === empDet.employeePositionID &&
      currentOrg === o.currentOrg && o.payElID === payElID && dateService.addDays(o.dateTo, 1).getTime() === dateFrom.getTime())
    if (!currentOrg && !orderRegistryUnpaid) {
      orderRegistryUnpaid = getOrderRegistry(order, period, 'hr_orderRegistryUnpaidAbsence', { name: order.description })
    }
    if (prevItem) {
      prevItem.dateTo = dateTo
      prevItem.dayCount += empDet.dayCount
    } else {
      docReg.push({
        orderRegistryID: currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID),
        empOrderID: order.ID,
        empOrderDetID: empDet.paraID,
        empOrderType: 'VACATION',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: empDet.employeeID,
        employeeNumberID: empDet.employeeNumberID,
        employeePositionID: empDet.employeePositionID,
        payElID: payElID,
        dayAccumCondition: (currentOrg
          ? (empDet['dictVacationKindID.payElID.methodID.dayAccumCondition'] || payEl['methodID.dayAccumCondition'])
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition'] || payElUnpaid['methodID.dayAccumCondition'])) || 'noHolidays',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: empDet.dayCount,
        methodID: currentOrg ? (empDet['dictVacationKindID.payElID.methodID'] || payEl.methodID)
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID'] || payElUnpaid.methodID),
        currentOrg
      })
    }
  })
  const empOrderLongDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
      'dateFrom', 'dateTo', 'dictVacationKindID.payElID', 'orderID.description',
      'dictVacationKindID.payElID.methodID.dayAccumCondition', 'dictVacationKindID.name'])
    .where('orderID', '=', order.ID)
    .where('orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', methodList)
    .selectAsObject()

  empOrderLongDet.forEach(empDet => {
    const dateFrom = dateService.shiftDate(empDet.dateFrom)
    const dateTo = dateService.shiftDate(empDet.dateTo)
    const payElID = empDet['dictVacationKindID.payElID'] || payEl.ID
    const prevItem = docReg.find(o => o.employeeNumberID === empDet.employeeNumberID && o.employeePositionID === empDet.employeePositionID &&
      o.payElID === payElID && dateService.addDays(o.dateTo, 1).getTime() === dateFrom.getTime())
    if (prevItem) {
      prevItem.dateTo = dateTo
      prevItem.dayCount += empDet.dayCount
    } else {
      docReg.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: empDet.ID,
        empOrderType: 'VACATION',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: empDet.employeeID,
        employeeNumberID: empDet.employeeNumberID,
        employeePositionID: empDet.employeePositionID,
        payElID: payElID,
        dayAccumCondition: empDet['dictVacationKindID.payElID.methodID.dayAccumCondition'] || payEl['methodID.dayAccumCondition'] || 'noHolidays',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: empDet.dayCount,
        methodID: empDet['dictVacationKindID.payElID.methodID'] || payEl.methodID
      })
    }
  })
  if (result.errorMessages.length) {
    return
  }

  const cont = {
    emp: { },
    org: orgService.getOrgData(orderRegistry.organizationID),
    payEl: payElService.getPayEl({ orgID: orderRegistry.organizationID }),
    payFund: payFundService.getPayFund(),
    periodCalc: period
  }
  let docParentID
  docReg.forEach((doc, docIdx) => {
    const currentOrg = doc.currentOrg === undefined ? true : doc.currentOrg
    delete doc.currentOrg
    docParentID = doc.parentID
    if (docIdx > 0) {
      for (let idx = docIdx - 1; idx >= 0; idx--) {
        if (docReg[idx].employeeNumberID === doc.employeeNumberID && docReg[idx].methodID === doc.methodID &&
          (dateService.dayDiff(docReg[idx].dateTo, doc.dateFrom) < 2)) {
          docParentID = docReg[idx].ID
        }
      }
    }

    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      parentID: docParentID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc), Object.assign({}, cont))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'flagsFix', 'flagsRec']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']

    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    if (currentOrg) {
      doc.avgSum = resultData.baseSum
    }
    const accrualsAvg = []
    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrualsAvg.push(accrual)
    })

    delete doc.dayAccumCondition
    const methodID = doc.methodID
    delete doc.methodID
    doc.ID = currentOrg ? docRegStore.generateID() : docRegUnpaidStore.generateID()
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach((accr, idx) => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
      })
      accrual.orderRegistryID = currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID)
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = accr.dateFrom
      accrual.orderDateTo = accr.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
      if (idx === 0 && !doc.parentID && docParentID && currentOrg) {
        doc.parentID = docParentID
      }
    })
    accrualsAvg.forEach(accAvg => {
      accAvg.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accAvg)
    })
    const store = currentOrg ? docRegStore : docRegUnpaidStore
    store.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
    doc.methodID = methodID
  })
}

function orderRegistryVacationProlong (order, orderRegistry, period, result) {
  const payEls = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'methodID', 'methodID.code'])
    .where('methodID.code', 'in', ['13', '15'])
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject()
  const payEl = payEls.find(o => o['methodID.code'] === '13')
  const payElUnpaid = payEls.find(o => o['methodID.code'] === '15')

  if (!payEl) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка"`))
    return
  }
  if (!payElUnpaid) {
    result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Відпустка без утримання"`))
    return
  }
  if (result.errorMessages.length) {
    return
  }

  const docReg = []
  const docRegStore = UB.DataStore('hr_docRegVacation')
  const docRegUnpaidStore = UB.DataStore('hr_docRegUnpaidAbsence')
  let orderRegistryUnpaid
  const empOrderEmployeeDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount', 'empOrderType', 'paraID',
      'dictVacationKindID', 'dictVacationKindID.payElID', 'dictVacationKindID.payElID.methodID.dayAccumCondition',
      'dictVacationKindID.payElID.methodID', 'dictVacationKindID.name',
      'dictVacationKindID.payElPrevWorkID', 'dictVacationKindID.payElPrevWorkID.methodID',
      'dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition',
      'empVacationPeriodID.fromOrgID', 'employeeNumberID.parentEmpNumberID.orgID'
    ])
    .where('orderID', '=', order.ID)
    .where('paraID.orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', ['13', '67', '142'])
    .where('prolongParaID.action', '=', 'PROLONG')
    .orderBy('dateFrom')
    .selectAsObject()
  empOrderEmployeeDet.forEach(empDet => {
    const dateFrom = dateService.shiftDate(empDet.dateFrom)
    const dateTo = dateService.shiftDate(empDet.dateTo)
    const currentOrg = (empDet['empVacationPeriodID.fromOrgID'] === null || empDet['empVacationPeriodID.fromOrgID'] === orderRegistry.organizationID) ||
      empDet['empVacationPeriodID.fromOrgID'] === empDet['employeeNumberID.parentEmpNumberID.orgID']
    const payElID = currentOrg ? (empDet['dictVacationKindID.payElID'] || payEl.ID) : (empDet['dictVacationKindID.payElPrevWorkID'] || payElUnpaid.ID)
    const prevItem = docReg.find(o => o.employeeNumberID === empDet.employeeNumberID && o.employeePositionID === empDet.employeePositionID &&
      currentOrg === o.currentOrg && o.payElID === payElID && dateService.addDays(o.dateTo, 1).getTime() === dateFrom.getTime())
    if (!currentOrg && !orderRegistryUnpaid) {
      orderRegistryUnpaid = getOrderRegistry(order, period, 'hr_orderRegistryUnpaidAbsence', { name: order.description })
    }
    if (prevItem) {
      prevItem.dateTo = dateTo
      prevItem.dayCount += empDet.dayCount
    } else {
      const para = UB.Repository('hr_empOrderVacationprolongDet')
        .attrs(['grantVacationParaID', 'grantVacationParaID.orderID.orderState', 'grantVacationParaID.orderID.description'])
        .selectById(empDet.paraID)
      if (para['grantVacationParaID.orderID.orderState'] !== 'PROCESSED') {
        const msg = UB.i18n(`Накази для "{0}" ще не опрацьовані! Потрібно спочатку опрацювати накази "{1}"`, order.description, para['grantVacationParaID.orderID.description'])
        if (!result.errorMessages.find(o => o === msg)) {
          result.errorMessages.push(msg)
        }
      }

      const parentVac = UB.Repository('hr_docRegVacation')
        .attrs(['ID'])
        .where('empOrderDetID.paraID', '=', para ? para.grantVacationParaID : null)
        .orderBy('dateFrom', 'desc')
        .limit(1)
        .selectSingle()
      docReg.push({
        orderRegistryID: currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID),
        empOrderID: order.ID,
        empOrderDetID: empDet.ID,
        empOrderType: empDet.empOrderType,
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: empDet.employeeID,
        employeeNumberID: empDet.employeeNumberID,
        employeePositionID: empDet.employeePositionID,
        payElID: payElID,
        dayAccumCondition: (currentOrg
          ? (empDet['dictVacationKindID.payElID.methodID.dayAccumCondition'] || payEl['methodID.dayAccumCondition'])
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID.dayAccumCondition'] || payElUnpaid['methodID.dayAccumCondition'])) || 'noHolidays',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: empDet.dayCount,
        parentID: currentOrg ? (parentVac ? parentVac.ID : null) : null,
        methodID: currentOrg ? (empDet['dictVacationKindID.payElID.methodID'] || payEl.methodID)
          : (empDet['dictVacationKindID.payElPrevWorkID.methodID'] || payElUnpaid.methodID),
        currentOrg
      })
    }
  })

  const cont = {
    emp: { },
    org: orgService.getOrgData(orderRegistry.organizationID),
    payEl: payElService.getPayEl({ orgID: orderRegistry.organizationID }),
    payFund: payFundService.getPayFund(),
    periodCalc: period
  }
  let docParentID
  docReg.forEach((doc, docIdx) => {
    const currentOrg = doc.currentOrg === undefined ? true : doc.currentOrg
    delete doc.currentOrg
    docParentID = doc.parentID
    if (docIdx > 0) {
      for (let idx = docIdx - 1; idx >= 0; idx--) {
        if (docReg[idx].employeeNumberID === doc.employeeNumberID && docReg[idx].methodID === doc.methodID &&
          (dateService.dayDiff(docReg[idx].dateTo, doc.dateFrom) < 2)) {
          docParentID = docReg[idx].ID
        }
      }
    }
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      parentID: docParentID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc), Object.assign({}, cont))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'flagsFix', 'flagsRec']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    if (currentOrg) {
      doc.avgSum = resultData.baseSum
    }
    const accrualsAvg = []
    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrualsAvg.push(accrual)
    })

    delete doc.dayAccumCondition
    let parentID

    resultData.accruals.forEach((accr, idx) => {
      const newDoc = Object.assign({}, doc)
      delete newDoc.methodID
      newDoc.ID = docRegStore.generateID()
      doc.ID = currentOrg ? docRegStore.generateID() : docRegUnpaidStore.generateID()
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
      })
      accrual.orderRegistryID = currentOrg ? orderRegistry.ID : (orderRegistryUnpaid ? orderRegistryUnpaid.ID : orderRegistry.ID)
      accrual.orderID = newDoc.ID
      accrual.empOrderID = newDoc.empOrderID
      accrual.empOrderDetID = newDoc.empOrderDetID
      newDoc.dateFrom = accrual.dateFrom
      newDoc.dateTo = accrual.dateTo
      accrual.orderDateFrom = newDoc.dateFrom
      accrual.orderDateTo = newDoc.dateTo
      newDoc.dayCount = accrual.days
      newDoc.calendarDayCount = accrual.calendarDays
      if (idx > 0 && currentOrg) {
        newDoc.parentID = parentID
      }
      parentID = newDoc.ID

      const formData = { detail: {
        orderRegistryDt: { insert: [] },
        accrualAvg: { insert: [] }
      } }

      formData.detail.orderRegistryDt.insert.push(accrual)
      accrualsAvg.forEach(accAvg => {
        accAvg.orderID = newDoc.ID
        formData.detail.accrualAvg.insert.push(accAvg)
      })
      if (idx === 0 && !newDoc.parentID && docParentID && currentOrg) {
        newDoc.parentID = docParentID
      }
      (currentOrg ? docRegStore : docRegUnpaidStore).run('insert', {
        formData: JSON.stringify(formData),
        execParams: newDoc
      })
    })
  })
}

function orderRegistryVacationUnpaid (order, orderRegistry, period, result) {
  let empOrderDet = []
  if (order.empOrderType === 'VACATION') {
    empOrderDet = UB.Repository('hr_empOrderVacationlongDet')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
        'dateFrom', 'dateTo', 'dictVacationKindID.payElID', 'orderID.description', 'dictVacationKindID.name'])
      .where('orderID', '=', order.ID)
      .where('orderStateEx', '!=', 'CANCELED')
      .where('dictVacationKindID.payElID.methodID.code', '=', '15')
      .selectAsObject({
        'dictVacationKindID.payElID': 'payElID'
      })
  }

  if (order.empOrderType === 'VACATIONPROLONG') {
    empOrderDet = UB.Repository('hr_empOrderVacationprolonglDet')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
        'dateFrom', 'dateTo', 'primeVacationParaID.dictVacationKindID.payElID', 'orderID.description'])
      .where('orderID', '=', order.ID)
      .where('orderStateEx', '!=', 'CANCELED')
      .where('primeVacationParaID.dictVacationKindID.payElID.methodID.code', '=', '15')
      .selectAsObject({
        'primeVacationParaID.dictVacationKindID.payElID': 'payElID'
      })
  }

  const docReg = []
  empOrderDet.forEach(det => {
    const payEl = det.payElID
      ? UB.Repository('hr_payEl')
        .attrs(['ID', 'methodID.dayAccumCondition', 'methodID.code'])
        .selectById(det.payElID)
      : UB.Repository('hr_payEl')
        .attrs(['ID', 'methodID.dayAccumCondition', 'methodID.code'])
        .where('methodID.code', '=', '15')
        .where('dateFrom', '<=', period.dateFrom)
        .where('dateTo', '>=', period.dateFrom)
        .limit(1)
        .selectSingle()

    if (!payEl) {
      result.errorMessages.push(UB.i18n(`Не знайдено вид оплати`))
      return
    }

    docReg.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'VACATIONLONG',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: payEl.ID,
      dayAccumCondition: payEl['methodID.dayAccumCondition'] || 'noHolidays',
      dateFrom: dateService.shiftDate(det.dateFrom),
      dateTo: dateService.shiftDate(det.dateTo),
      dayCount: det.dayCount,
      methodCode: payEl['methodID.code']
    })
  })
  if (result.errorMessages.length) {
    return
  }

  docReg.forEach(doc => {
    const docRegStore = UB.DataStore('hr_docRegUnpaidAbsence')

    delete doc.methodCode

    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'flagsFix', 'flagsRec']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'workDays' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    if (!doc.calendarDayCount) doc.calendarDayCount = dateService.dateDiff(doc.dateFrom, doc.dateTo)

    const formData = {
      detail: {
        orderRegistryDt: { insert: [] },
        accrualAvg: { insert: [] }
      }
    }
    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    delete doc.dayAccumCondition
    delete doc.avgSum
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryVacationLong (order, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
      'dateFrom', 'dateTo', 'dictVacationKindID.payElID', 'orderID.description', 'dictVacationKindID.name'])
    .where('orderID', '=', order.ID)
    .where('orderStateEx', '!=', 'CANCELED')
    .where('dictVacationKindID.payElID.methodID.code', 'in', ['14', '57', '140'])
    .selectAsObject({
      'dictVacationKindID.payElID': 'payElID'
    })
  const store = UB.DataStore('hr_employeeAccrual')

  empOrderDet.forEach(det => {
    const pAccrual = {
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      payElID: det.payElID,
      dateFrom: det.dateFrom,
      dateTo: det.dateTo,
      orderID: order.ID,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderState: order.orderState,
      description: order.description
    }

    store.run('insert', {
      skipSetTimeSheet: true,
      execParams: pAccrual
    })
  })
}

function orderRegistryVacationProlongLongVac (order, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderVacationprolonglDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dayCount',
      'dateFrom', 'dateTo', 'primeVacationParaID.dictVacationKindID.payElID'])
    .where('orderID', '=', order.ID)
    .where('orderStateEx', '!=', 'CANCELED')
    .where('primeVacationParaID.dictVacationKindID.payElID.methodID.code', 'in', ['14', '57', '140'])
    .selectAsObject({
      'primeVacationParaID.dictVacationKindID.payElID': 'payElID'
    })
  const store = UB.DataStore('hr_employeeAccrual')

  empOrderDet.forEach(det => {
    const pAccrual = {
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      payElID: det.payElID,
      dateFrom: det.dateFrom,
      dateTo: det.dateTo,
      orderID: order.ID,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderState: order.orderState,
      description: order.description
    }

    store.run('insert', {
      skipSetTimeSheet: true,
      execParams: pAccrual
    })
  })
}

function getAvgPeriod (methodCode, month, year, period) {
  const result = {
    dateFromAvg: null,
    dateToAvg: null
  }
  switch (methodCode) {
    case '45': {
      result.dateFromAvg = dateService.shiftDate(new Date(year, (month || 1) - 1, 1))
      result.dateToAvg = dateService.lastDayOfMonth(dateService.shiftDate(new Date(year, (month || 1) + 1, 1)))
      break
    }
    case '46': {
      result.dateFromAvg = dateService.shiftDate(new Date(year, (month || 1) - 1, 1))
      result.dateToAvg = dateService.lastDayOfMonth(dateService.shiftDate(new Date(year, (month || 1) + 10, 1)))
      break
    }
    default: {
      result.dateFromAvg = period.dateFrom
      result.dateToAvg = period.dateTo
      break
    }
  }

  return result
}
function orderRegistryPremium (order, period) {
  const empOrderDet = UB.Repository('hr_empOrderBountyDet')
    .attrs([ 'ID', 'payElID', 'payElID.methodID.code', 'bountySum', 'isGroup', 'payType', 'month', 'year', 'dictFundSourceID' ])
    .where('orderID', '=', order.ID)
    .exists(
      UB.Repository('hr_empOrderChgSalEmpDet')
        .correlation('paraID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()
  if (!empOrderDet.length) {
    return
  }
  const store = UB.DataStore('hr_orderRegistry')
  empOrderDet.forEach(orderDet => {
    const formData = { detail: {
      orderRegistryDt: { insert: [] }
    } }
    const orderRegistryID = store.generateID()
    const orderRegistryDt = []
    const periodSalary = periodService.getPeriodOnDate(order.organizationID, dateService.shiftDate(new Date(orderDet.year, (orderDet.month || 1) - 1))) || period
    const avgPeriod = getAvgPeriod(orderDet['payElID.methodID.code'], orderDet.month, orderDet.year, periodSalary)

    const empOrderNumDet = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'accrualRate', 'newValue', 'valuation'])
      .where('orderID', '=', order.ID)
      .where('paraID', '=', orderDet.ID)
      .selectAsObject()
    empOrderNumDet.forEach((det) => {
      orderRegistryDt.push({
        employeeNumberID: det.employeeNumberID,
        payElID: orderDet.payElID,
        periodCalcID: period.ID,
        periodSalaryID: ['45', '46'].includes(orderDet['payElID.methodID.code']) ? period.ID : periodSalary.ID,
        periodCalc: period.dateFrom,
        periodSalary: ['45', '46'].includes(orderDet['payElID.methodID.code']) ? period.dateFrom : periodSalary.dateFrom,
        dateFrom: ['45', '46'].includes(orderDet['payElID.methodID.code']) ? period.dateFrom : periodSalary.dateFrom,
        dateTo: ['45', '46'].includes(orderDet['payElID.methodID.code']) ? period.dateTo : periodSalary.dateTo,
        methodCode: orderDet['payElID.methodID.code'],
        rate: det.valuation === 'PRC' ? det.accrualRate : null,
        baseSum: det.valuation === 'SUM' ? det.newValue : null,
        paySum: det.valuation === 'SUM' ? det.newValue : null,
        flagsFix: (det.valuation === 'PRC' ? 1 << 9 : (1 | 2)) | (orderDet.dictFundSourceID ? 1 << 14 : 0),
        dateFromAvg: avgPeriod.dateFromAvg,
        dateToAvg: avgPeriod.dateToAvg,
        dictFundSourceID: orderDet.dictFundSourceID
      })
    })
    const resultData = rlService.calculateAccrual({
      orgID: order.organizationID,
      payElParams: orderRegistryDt,
      periodCalcID: period.ID,
      periodSalaryID: period.ID
    })

    resultData.forEach(row => {
      formData.detail.orderRegistryDt.insert.push(
        {
          orderRegistryID: orderRegistryID,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          baseSum: row.baseSum,
          rate: row.rate,
          paySum: row.paySum,
          paySumAccrual: row.paySumAccrual,
          rateOff: row.rateOff,
          paySumOff: row.paySumOff,
          periodCalcID: null,
          periodCalc: null,
          periodSalaryID: row.periodSalaryID,
          periodSalary: row.periodSalary,
          flagsFix: row.flagsFix,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          mask: row.mask,
          days: row.days,
          hours: row.hours,
          planHours: row.planHours,
          planDays: row.planDays,
          dateFromAvg: row.dateFromAvg,
          dateToAvg: row.dateToAvg,
          extraRate: row.extraRate,
          dictFundSourceID: row.dictFundSourceID,
          accrualDt: JSON.stringify(row.accrualDt)
        }
      )
    })
    const resPeriodSalary = periodService.getPeriodOnDate(order.organizationID, dateService.shiftDate(new Date(orderDet.year, (orderDet.month || 1) - 1))) || period
    // const orderAvgPeriod = getAvgPeriod(orderDet['payElID.methodID.code'], orderDet.month, orderDet.year, period)
    const periodFromAvg = periodService.getPeriodOnDate(order.organizationID, avgPeriod.dateFromAvg)
    const periodToAvg = periodService.getPeriodOnDate(order.organizationID, avgPeriod.dateToAvg)
    store.run('insert', {
      formData: JSON.stringify(formData),
      execParams: {
        ID: orderRegistryID,
        docNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        periodID: period.ID,
        periodSalaryID: ['45', '46'].includes(orderDet['payElID.methodID.code']) ? period.ID : resPeriodSalary.ID,
        organizationID: order.organizationID,
        orderType: 'hr_orderRegistryPremium',
        empOrderID: order.ID,
        name: order.description,
        payElID: orderDet.payElID,
        baseSum: orderDet.payType === 'SUM' ? orderDet.bountySum : null,
        rate: orderDet.payType === 'PRC' ? orderDet.bountySum : null,
        dateFromAvg: avgPeriod.dateFromAvg,
        dateToAvg: avgPeriod.dateToAvg,
        periodFromAvg: periodFromAvg.ID,
        periodToAvg: periodToAvg.ID
      }
    })
    deleteIfEmptyOrderRegistry({ ID: orderRegistryID })
  })
}

function orderRegistryRiskPay (order, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderRiskpayDet')
    .attrs([ 'ID', 'payElID', 'periodID', 'payRate', 'dictFundSourceID' ])
    .where('orderID', '=', order.ID)
    .selectAsObject()
  if (!empOrderDet.length) {
    return
  }
  const formData = {
    detail: {
      orderRegistryDt: { insert: [] }
    }
  }

  const store = UB.DataStore('hr_orderRegistry')
  const orderRegistryID = store.generateID()
  const orderRegistryDt = []
  let idx = 1
  empOrderDet.forEach(orderDet => {
    const empOrderNumDet = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'newValue'])
      .where('orderID', '=', order.ID)
      .where('paraID', '=', orderDet.ID)
      .selectAsObject()
    empOrderNumDet.forEach((det) => {
      orderRegistryDt.push({
        employeeNumberID: det.employeeNumberID,
        payElID: orderDet.payElID,
        periodCalcID: period.ID,
        periodSalaryID: period.ID,
        periodCalc: period.dateFrom,
        periodSalary: period.dateFrom,
        dictFundSourceID: orderDet.dictFundSourceID,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        dateFromCalc: period.dateFrom,
        dateToCalc: period.dateTo,
        hours: det.newValue,
        rate: 100,
        fromExtraPay: true,
        payRate: orderDet.payRate,
        flagsFix: 1 << 9 | 1 << 6 | 1 << 7 | (orderDet.dictFundSourceID ? 1 << 14 : 0),
        idx: idx++
      })
    })
  })

  const resultData = global['hr_orderRegistry'].calculateExtraPay({
    orgID: order.organizationID,
    payElParams: orderRegistryDt,
    periodCalcID: period.ID,
    periodSalaryID: period.ID
  })

  resultData.forEach(row => {
    formData.detail.orderRegistryDt.insert.push(
      {
        orderRegistryID: orderRegistryID,
        employeeNumberID: row.employeeNumberID,
        payElID: row.payElID,
        baseSum: row.baseSum,
        rate: row.rate,
        paySum: row.paySum,
        periodCalcID: row.periodCalcID,
        periodCalc: row.periodCalc,
        periodSalaryID: row.periodSalaryID,
        periodSalary: row.periodSalary,
        dictFundSourceID: row.dictFundSourceID,
        flagsFix: row.flagsFix,
        flagsFixDoc: 1 << 6 | 1 << 7 | 1 << 9,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        mask: row.mask,
        days: row.days,
        hours: row.hours,
        planHours: row.planHours,
        planDays: row.planDays,
        accrualDt: JSON.stringify(row.accrualDt)
      }
    )
  })

  store.run('insert', {
    formData: JSON.stringify(formData),
    execParams: {
      ID: orderRegistryID,
      docNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      periodID: period.ID,
      periodSalaryID: period.ID,
      organizationID: order.organizationID,
      orderType: 'hr_orderRegistryExtraPay',
      empOrderID: order.ID,
      payElID: empOrderDet[0].payElID,
      rate: empOrderDet[0].payRate,
      name: order.description,
      flagsFixDoc: 1 << 6 | 1 << 7 | 1 << 9
    }
  })
  deleteIfEmptyOrderRegistry({ ID: orderRegistryID })
}

function getTimeDiff (dateTimeTo, dateTimeFrom) {
  return Math.floor((dateTimeTo - dateTimeFrom) / 1000) / 3600
}

function orderRegistryAddPay (order, period, result) {
  const accrualService = require('../../HR/modules/accrualService')
  const calendarService = require('../../HR/modules/calendarService')

  const empOrderDet = UB.Repository('hr_empOrderAddpayDet')
    .attrs(['ID', 'dateFrom', 'dateTo', 'payElID', 'isWeekend', 'payElID.methodID.code', 'isTimeWork', 'dictFundSourceID'])
    .where('orderID', '=', order.ID)
    .selectAsObject()
  if (!empOrderDet.length) {
    return
  }

  const defPayEl = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', '=', '11')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle() || {}

  const store = UB.DataStore('hr_orderRegistry')
  const orderRegistryID = store.generateID()
  const orderRegistryDt = []
  const formData = {
    detail: {
      orderRegistryDt: { insert: [] }
    }
  }
  let idx = 1
  let docRate = 0
  empOrderDet.forEach(orderDet => {
    const methodCode = orderDet['payElID.methodID.code'] || defPayEl['methodID.code']
    const empOrderNumDet = UB.Repository('hr_empOrderAddpayListDet')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID'])
      .where('orderID', '=', order.ID)
      .where('paraID', '=', orderDet.ID)
      .selectAsObject()
    const rate = orderDet.isWeekend ? (methodCode === '66' ? 200 : 100) : (methodCode === '66' ? 100 : 0)
    docRate = Math.max(docRate, rate)
    const orderDateFrom = dateService.shiftDate(orderDet.dateFrom)
    const orderDateTo = dateService.shiftDate(orderDet.dateTo)
    const dateTimeFrom = new Date(orderDet.dateFrom)
    const dateTimeTo = new Date(orderDet.dateTo)
    const periods = []
    if (orderDateFrom.getMonth() === orderDateTo.getMonth()) {
      periods.push({
        dateFrom: dateTimeFrom,
        dateTo: dateTimeTo,
        periodSalary: periodService.getPeriodOnDate(order.organizationID, orderDateFrom)
      })
    } else {
      const salaryPeriods = periodService.getPeriodsByDate(order.organizationID, orderDateFrom, orderDateTo)
      salaryPeriods.forEach(row => {
        const endOfPeriod = dateService.unshiftDate(new Date(dateService.formatDate(row.dateTo, 'yyyy-mm-dd') + 'T23:59:59.999Z'))
        periods.push({
          dateFrom: Math.max(dateTimeFrom, dateService.unshiftDate(row.dateFrom)),
          dateTo: Math.min(dateTimeTo, endOfPeriod),
          periodSalary: row
        })
      })
    }
    const holidays = calendarService.getHolidays(orderDateFrom, orderDateTo, order.organizationID)
    periods.forEach(pItem => {
      let hours = 0
      let holidayHours = 0
      let date = dateService.shiftDate(pItem.dateFrom)
      const dateTo = Math.min(pItem.dateTo, dateService.addDays(orderDateTo, 1))
      while (date < dateTo) {
        const holiday = holidays.find(o => o.getTime() === date.getTime())
        if (holiday) {
          if (holiday.getTime() === orderDateFrom.getTime() && holiday.getTime() === orderDateTo.getTime()) {
            holidayHours += accrualService.round(getTimeDiff(pItem.dateTo, pItem.dateFrom), 2)
          } else if (holiday.getTime() === orderDateFrom.getTime()) {
            holidayHours += accrualService.round(getTimeDiff(dateService.unshiftDate(dateService.addDays(date, 1)), pItem.dateFrom), 2)
          } else if (holiday.getTime() === orderDateTo.getTime()) {
            holidayHours += accrualService.round(getTimeDiff(pItem.dateTo, dateService.unshiftDate(date)), 2)
          } else {
            holidayHours += 24
          }
        }
        date = dateService.addDays(date, 1)
      }
      if (['10'].includes(methodCode)) {
        hours = holidayHours
      }
      if (['11', '9'].includes(methodCode)) {
        hours = accrualService.round(getTimeDiff(pItem.dateTo, pItem.dateFrom) - holidayHours, 2)
      }
      empOrderNumDet.forEach((det) => {
        let factHours = hours
        if (orderDet.isTimeWork) {
          let timeSheetHours
          switch (methodCode) {
            case '9':
            case '11':
              timeSheetHours = UB.Repository('tim_timeSheet')
                .attrs(['SUM([factHour])'])
                .where('employeeNumberID', '=', det.employeeNumberID)
                .whereIf(holidays.length, 'dateWork', 'notIn', holidays)
                .where('dateWork', '>=', dateService.shiftDate(pItem.dateFrom))
                .where('dateWork', '<=', dateService.shiftDate(pItem.dateTo))
                .where('isActive', '=', 1)
                .selectScalar() || 0
              break
            case '10':
              timeSheetHours = (holidays.length ? UB.Repository('tim_timeSheet')
                .attrs(['SUM([factHour])'])
                .where('employeeNumberID', '=', det.employeeNumberID)
                .where('dateWork', 'in', holidays)
                .where('isActive', '=', 1)
                .selectScalar() : 0) || 0
              break
          }
          if (factHours > timeSheetHours) {
            factHours = timeSheetHours
          }
        }
        orderRegistryDt.push({
          employeeNumberID: det.employeeNumberID,
          payElID: orderDet.payElID || defPayEl.ID,
          dictFundSourceID: orderDet.dictFundSourceID,
          periodCalcID: period.ID,
          periodSalaryID: pItem.periodSalary.ID,
          periodCalc: period.dateFrom,
          periodSalary: pItem.periodSalary.dateFrom,
          dateFrom: dateService.shiftDate(pItem.dateFrom),
          dateTo: dateService.shiftDate(pItem.dateTo),
          dateFromCalc: dateService.shiftDate(pItem.dateFrom),
          dateToCalc: dateService.shiftDate(pItem.dateTo),
          hours: factHours,
          rate: 100,
          payRate: rate,
          flagsFix: 1 << 6 | 1 << 7 | 1 << 9 | (orderDet.dictFundSourceID ? 1 << 14 : 0),
          idx: idx++,
          fromExtraPay: true
        })
      })
    })
  })
  const resultData = global['hr_orderRegistry'].calculateExtraPay({
    orgID: order.organizationID,
    payElParams: orderRegistryDt,
    periodCalcID: period.ID,
    periodSalaryID: null
  })

  resultData.forEach(row => {
    formData.detail.orderRegistryDt.insert.push(
      {
        orderRegistryID: orderRegistryID,
        employeeNumberID: row.employeeNumberID,
        payElID: row.payElID,
        dictFundSourceID: row.dictFundSourceID,
        baseSum: row.baseSum,
        rate: row.rate,
        paySum: row.paySum,
        periodCalcID: null,
        periodCalc: null,
        periodSalaryID: row.periodSalaryID,
        periodSalary: row.periodSalary,
        flagsFix: row.flagsFix,
        flagsFixDoc: 1 << 6 | 1 << 7 | 1 << 9,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        mask: row.mask,
        days: row.days,
        hours: row.hours,
        planHours: row.planHours,
        planDays: row.planDays,
        accrualDt: JSON.stringify(row.accrualDt)
      }
    )
  })

  store.run('insert', {
    formData: JSON.stringify(formData),
    execParams: {
      ID: orderRegistryID,
      docNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      periodID: period.ID,
      periodSalaryID: period.ID,
      organizationID: order.organizationID,
      orderType: 'hr_orderRegistryExtraPay',
      empOrderID: order.ID,
      payElID: empOrderDet[0].payElID || defPayEl.ID,
      rate: docRate,
      name: order.description,
      flagsFixDoc: 1 << 23 // фиксируем periodSalaryID
    }
  })
  deleteIfEmptyOrderRegistry({ ID: orderRegistryID })
}

// лікарняні
function orderRegistrySickness (order, period, result) {
  const copyAttrs = ['orderDate', 'employeePositionID', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo',
    'msekDateFrom', 'msekDateTo', 'msekResult', 'actNumber', 'actDate', 'easyDateFrom', 'easyDateTo',
    'isReg', 'sickNotes', 'employeeSickLimitID'
  ]
  const attrs = ['ID', 'empOrderSicknessID.parentID', 'empOrderSicknessID.dateFirst', 'empOrderSicknessID.illnessReasonID',
    'empOrderSicknessID.illnessReasonID.payElFSSUID', 'empOrderSicknessID', 'empOrderSicknessID.serie',
    'empOrderSicknessID.number', 'empOrderSicknessID.employeeFamilyID', 'empOrderSicknessID.flagsFix',
    'empOrderSicknessID.standingAllYear', 'empOrderSicknessID.standingAllInYear', 'empOrderSicknessID.workLess6months',
    'empOrderSicknessID.standingYearMonth', 'empOrderSicknessID.percentWork', 'empOrderSicknessID.illnessKind',
    'empOrderSicknessID.description', 'empOrderSicknessID.parentID.number', 'empOrderSicknessID.parentID.dateFrom',
    'empOrderSicknessID.isOnlyFOP', 'isPay'
  ]
  copyAttrs.forEach(attr => { attrs.push('empOrderSicknessID.' + attr) })

  const sicknessData = UB.Repository('hr_sicknessMeetingDt')
    .attrs(attrs)
    .where('sicknessMeetingID', '=', order.ID)
    .where('empOrderSicknessID.mi_deleteDate', '>=', '#maxdate')
    .where('empOrderSicknessID', 'isNotNull')
    // .where('isPay', '=', true)
    .orderBy('dateFrom')
    .selectAsObject()

  if (sicknessData.length) { // є лікарняні, на які треба робити нарахування
    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'minSalary',
      'maxECB', 'maxECBDay', 'calcSum', 'rate', 'paySum', 'flagsFix', 'flagsRec', 'dateFirst']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']

    const orderRegistry = getOrderRegistry(order, period, 'hr_orderRegistrySickness', { name: order.description }, true)

    const docRegStore = UB.DataStore('hr_docRegSickness')
    sicknessData.forEach(item => {
      // формуємо первинний документ для лікарняного
      const formData = { detail: {
        orderRegistryDt: { insert: [] },
        accrualAvg: { insert: [] },
        docRegSicknessDt: { insert: [] }
      } }
      let parentSicknessID = null
      let dateFirst = item['empOrderSicknessID.dateFirst'] ? dateService.shiftDate(item['empOrderSicknessID.dateFirst']) : null

      if (item['empOrderSicknessID.parentID']) {
        parentSicknessID = UB.Repository('hr_docRegSickness')
          .attrs(['ID'])
          .where('empOrderSicknessID', '=', item['empOrderSicknessID.parentID'])
          .selectScalar()
        if (!parentSicknessID) {
          const pData = UB.Repository('hr_sicknessMeetingDt')
            .attrs(['ID', 'sicknessMeetingID', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderState'])
            .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
            .where('empOrderSicknessID', '=', item['empOrderSicknessID.parentID'])
            .limit(1)
            .selectSingle()
          if (pData) {
            if (pData['sicknessMeetingID.orderState'] !== 'PROCESSED' && pData['sicknessMeetingID'] !== order.ID) {
              throw new UB.UBAbort(`<<<${UB.i18n(`Для лікарняного №{0} попередній лікарняний №{1} у протоколі №{2}, який ще не опрацьовано!`, item['empOrderSicknessID.number'], item['empOrderSicknessID.parentID.number'], pData['sicknessMeetingID.orderNumber'])}>>>`)
            } else {
              if (!dateFirst) {
                dateFirst = dateService.shiftDate(item['empOrderSicknessID.parentID.dateFrom'])
              }
              // throw new UB.UBAbort(`<<<${UB.i18n(`Для лікарняного №{0} попередній лікарняний №{1} не додано у жодний протокол!`, item['empOrderSicknessID.number'], item['empOrderSicknessID.parentID.number'])}>>>`)
            }
          }
        }
      } else {
        dateFirst = item['empOrderSicknessID.dateFrom']
      }

      const sicknessDt = UB.Repository('hr_empOrderSicknessDt')
        .attrs(['ID', 'dateFrom', 'dateTo', 'illnessRegime'])
        .where('empOrderSicknessID', '=', item.empOrderSicknessID)
        .selectAsObject()

      sicknessDt.forEach(det => {
        det.dateFrom = dateService.shiftDate(det.dateFrom)
        det.dateTo = dateService.shiftDate(det.dateTo)
      })

      const docID = docRegStore.generateID()
      const resultData = rlService.calculateOrderAccrual({
        orgID: order.organizationID,
        empOrderID: order.ID,
        orderNumber: order.orderNumber,
        empOrderSicknessID: item.empOrderSicknessID,
        orderDate: order.orderDate,
        orderRegistryID: orderRegistry.ID,
        periodCalcID: orderRegistry.periodID,
        employeeNumberID: item['empOrderSicknessID.employeeNumberID'],
        dictIllnessReasonID: item['empOrderSicknessID.illnessReasonID'],
        payElID: item['empOrderSicknessID.illnessReasonID.payElFSSUID'],
        parentSicknessID,
        dateFirst,
        isOnlyFOP: item['empOrderSicknessID.isOnlyFOP'],
        flagsRec: 2,
        flagsFix: (item['empOrderSicknessID.flagsFix'] | 1 << 9 | 1 << 21 | 1 << 20),
        dateFrom: item['empOrderSicknessID.dateFrom'],
        dateTo: item['empOrderSicknessID.dateTo'],
        accruals: [],
        accrualsAvg: [],
        notPay: !item['isPay'],
        method: '4', // страховий стаж
        rate: item['empOrderSicknessID.percentWork'],
        standingYearMonth: item['empOrderSicknessID.standingYearMonth'],
        standingAll: item['empOrderSicknessID.standingAllYear'],
        standingAllInYear: Math.floor(item['empOrderSicknessID.standingAllYear'] || 0 / 12),
        sicknessDt
      })

      const doc = {
        ID: docID,
        empOrderID: order.ID,
        empOrderSicknessID: item.empOrderSicknessID,
        orderNumber: item['empOrderSicknessID.number'],
        seria: item['empOrderSicknessID.serie'],
        parentSicknessID,
        dateFirst,
        isOnlyFOP: item['empOrderSicknessID.isOnlyFOP'],
        dictIllnessReasonID: item['empOrderSicknessID.illnessReasonID'],
        orderRegistryID: orderRegistry.ID,
        employeeFamilyID: item['empOrderSicknessID.employeeFamilyID'],
        workLess6months: item['empOrderSicknessID.workLess6months'],
        illnessKind: item['empOrderSicknessID.illnessKind'],
        orderState: 'PROJECT',
        notPay: !item['isPay']
      }

      copyAttrs.forEach(attr => { doc[attr] = item['empOrderSicknessID.' + attr] })
      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })
      const additionalAttrs = ['standingAll', 'standingAllInYear', 'standingYearMonth', 'rate']
      additionalAttrs.forEach(attr => {
        doc[attr] = resultData[attr]
      })

      doc.avgSum = resultData.baseSum
      resultData.accruals.forEach(accr => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = accr[attrName]
        })
        accrual.orderRegistryID = orderRegistry.ID
        accrual.orderID = doc.ID
        accrual.empOrderID = doc.empOrderID
        accrual.dictIllnessReasonID = doc.dictIllnessReasonID
        accrual.parentSicknessID = doc.parentSicknessID
        accrual.orderDateFrom = doc.dateFrom
        accrual.orderDateTo = doc.dateTo
        accrual.periodCalcID = null
        accrual.periodCalc = null
        formData.detail.orderRegistryDt.insert.push(accrual)
      })

      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrual.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accrual)
      })

      // копіюємо детальну частину лікарняного
      sicknessDt.forEach(dt => {
        delete dt.ID
        formData.detail.docRegSicknessDt.insert.push(dt)
      })
      docRegStore.run('insert', {
        formData: JSON.stringify(formData),
        execParams: doc
      })
    })
    docRegStore.freeNative()
    deleteIfEmptyOrderRegistry(orderRegistry)
  }
}

// допомога на поховання
function orderRegistryFuneral (order, period, result) {
  const copyAttrs = ['orderDate', 'paySum',
    'addDoc', 'seriaDoc', 'numberDoc', 'dateDoc', 'actNumber', 'actDate', 'dateDeath', 'dateFuneral'
  ]
  const attrs = ['ID', 'empOrderFuneralID', 'empOrderFuneralID.employeeFuneralID', 'empOrderFuneralID.employeeFamilyID',
    'empOrderFuneralID.employeeFuneralID.employeeID', 'empOrderFuneralID.employeePositionID',
    'empOrderFuneralID.employeeFuneralID.workPlace', 'empOrderFuneralID.employeeFuneralID.employeeNumberID']
  copyAttrs.forEach(attr => { attrs.push('empOrderFuneralID.' + attr) })

  const funeralData = UB.Repository('hr_sicknessMeetingDt')
    .attrs(attrs)
    .where('sicknessMeetingID', '=', order.ID)
    .where('empOrderFuneralID.mi_deleteDate', '>=', '#maxdate')
    .where('empOrderFuneralID', 'isNotNull')
    .where('isPay', '=', true)
    .selectAsObject()

  if (funeralData.length) { // є документи допомоги, на які треба робити нарахування
    const orderRegistry = getOrderRegistry(order, period, 'hr_orderRegistryFuneral', { name: order.description, empOrderID: order.ID }, true)

    const payEl = UB.Repository('hr_payEl')
      .attrs(['ID', 'methodID.dayAccumCondition'])
      .where('methodID.code', '=', '38')
      .where('dateFrom', '<=', period.dateFrom)
      .where('dateTo', '>=', period.dateFrom)
      .limit(1)
      .selectSingle()
    if (!payEl) {
      result.errorMessages.push(UB.i18n(`Не знайдено вид оплати Допомога на поховання`))
      return
    }
    const docRegStore = UB.DataStore('hr_docRegFuneral')
    funeralData.forEach(item => {
      const docID = docRegStore.generateID()
      const doc = {
        ID: docID,
        empOrderID: order.ID,
        empOrderFuneralID: item.empOrderFuneralID,
        orderRegistryID: orderRegistry.ID,
        orderNumber: 'б/н',
        employeeFuneralID: item['empOrderFuneralID.employeeFuneralID'],
        employeeID: item['empOrderFuneralID.employeeFuneralID.employeeID'],
        employeeNumberID: item['empOrderFuneralID.employeeFuneralID.employeeNumberID'],
        employeePositionID: item['empOrderFuneralID.employeePositionID'],
        employeeFamilyID: item['empOrderFuneralID.employeeFamilyID'],
        orderState: 'PROJECT',
        payElID: payEl.ID
      }

      const resultData = rlService.calculateOrderAccrual({
        orgID: order.organizationID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderRegistryID: orderRegistry.ID,
        periodCalcID: orderRegistry.periodID,
        employeeNumberID: item['empOrderFuneralID.employeeFuneralID.employeeNumberID'],
        payElID: payEl.ID,
        flagsRec: 2,
        flagsFix: 2,
        paySum: item['empOrderFuneralID.paySum']
      })

      copyAttrs.forEach(attr => { doc[attr] = item['empOrderFuneralID.' + attr] })
      doc.accrualDt = JSON.stringify(resultData.accrualDt)

      docRegStore.run('insert', {
        execParams: doc
      })
    })
    docRegStore.freeNative()
    deleteIfEmptyOrderRegistry(orderRegistry)
  }
}

function orderRegistryRelaxDonor (order, orderRegistry, period, result) {
  const empOrderCwsrelaxdonorDet = UB.Repository('hr_empOrderCwsrelaxdonorDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo',
      'employeePositionID.payElID.calcProportion', 'payElID', 'payElID.calcEarnings', 'payElID.methodID.dayAccumCondition'])
    .where('orderID', '=', order.ID)
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion',
      'payElID.methodID.dayAccumCondition': 'dayAccumCondition'
    })
  const docRegAvgPay = []

  const defPayEl = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition', 'calcEarnings'])
    .where('methodID.code', '=', '73')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle() || {}
  const docRegAvgPayStore = UB.DataStore('hr_docRegAvgPay')

  empOrderCwsrelaxdonorDet.forEach(det => {
    const payElID = det.payElID || defPayEl.ID
    if (!payElID) {
      result.errorMessages.push(`Не вказано вид оплати`)
      return
    }
    let calcEarnings = det['payElID.calcEarnings'] || defPayEl['calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }
    if (det.dateFrom) {
      docRegAvgPay.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: det.ID,
        empOrderType: 'AVGPAY',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: det.employeeID,
        employeeNumberID: det.employeeNumberID,
        employeePositionID: det.employeePositionID,
        payElID: payElID,
        dateFrom: dateService.shiftDate(det.dateFrom),
        dateTo: dateService.shiftDate(det.dateFrom),
        calcEarnings: calcEarnings || 'DAY'
      })
    }
    docRegAvgPay.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'AVGPAY',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: payElID,
      dateFrom: dateService.shiftDate(det.dateTo),
      dateTo: dateService.shiftDate(det.dateTo),
      calcEarnings: calcEarnings || 'DAY',
      dayAccumCondition: det.dayAccumCondition || defPayEl['methodID.dayAccumCondition']
    })
  })

  docRegAvgPay.forEach(doc => {
    doc.ID = docRegAvgPayStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcEarnings === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'hourCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType',
      'calcSum', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegAvgPayStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryTraining (order, orderRegistry, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderTrainingDet')
    .attrs(['ID', 'payElID', 'dayCount', 'dateFrom', 'dateTo', 'payElID.methodID.dayAccumCondition', 'payElID.calcEarnings'])
    .where('orderID', '=', order.ID)
    .where('payElID', 'isNotNull')
    .selectAsObject()
  const docRegAvgPay = []

  const docRegAvgPayStore = UB.DataStore('hr_docRegAvgPay')

  empOrderDet.forEach(det => {
    const employee = UB.Repository('hr_empOrderEmployeeDet')
      .attrs(['ID', 'employeePositionID', 'employeeNumberID', 'employeeID', 'employeePositionID.payElID.calcProportion'])
      .where('paraID', '=', det.ID)
      .selectAsObject({
        'employeePositionID.payElID.calcProportion': 'calcProportion'
      })

    employee.forEach(emp => {
      let calcEarnings = det['payElID.calcEarnings']
      if (calcEarnings === 'ACCRUAL') {
        calcEarnings = emp['calcProportion']
      }
      docRegAvgPay.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: det.ID,
        empOrderType: 'AVGPAY',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: emp.employeePositionID,
        payElID: det.payElID,
        dateFrom: dateService.shiftDate(det.dateFrom),
        dateTo: dateService.shiftDate(det.dateTo),
        dayAccumCondition: det['payElID.methodID.dayAccumCondition'],
        calcEarnings: calcEarnings || 'DAY'
      })
    })
  })

  docRegAvgPay.forEach(doc => {
    doc.ID = docRegAvgPayStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcProportion === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    delete doc.dayAccumCondition

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'hourCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType',
      'calcSum', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegAvgPayStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistrySinglePay (order, orderRegistry, period, result) {
  const empOrderAcc = UB.Repository('hr_empOrderAcc')
    .attrs(['ID', 'empOrderDetID', 'empOrderDetID.employeeID', 'empOrderDetID.employeeNumberID', 'empOrderDetID.employeePositionID', 'payElID', 'accrualSum'])
    .where('empOrderID', '=', order.ID)
    .where('empOrderDetID.orderStateEx', '!=', 'CANCELED')
    .where('payElID.methodID.code', '=', '42')
    .selectAsObject({
      'empOrderDetID.employeeID': 'employeeID',
      'empOrderDetID.employeeNumberID': 'employeeNumberID',
      'empOrderDetID.employeePositionID': 'employeePositionID'
    })
  const docRegSinglePay = []

  const docRegStore = UB.DataStore('hr_docRegSinglePay')

  empOrderAcc.forEach(det => {
    docRegSinglePay.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.empOrderDetID,
      empOrderType: 'SINGLEPAYMENT',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: det.payElID,
      paySum: det.accrualSum || 0
    })
  })

  docRegSinglePay.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2,
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['flagsFix', 'flagsRec']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })

    docRegStore.run('insert', {
      execParams: doc
    })
  })
}

function orderRegistryDismission (order, period, result) {
  const empOrderDismDetVac = UB.Repository('hr_empOrderDismVac')
    .attrs(['orderDetID.ID', 'orderDetID.dateFrom', 'employeeNumberID',
      'employeeNumberID.employeeID', 'employeeNumberID.employeePositionID',
      'sum([dayRecalc])', 'sum([dayRestitute])', 'sum([dayReturn])', 'orderDetID.vacRecalcOrganizationID',
      'orderDetID.vacRecalcOrganizationName', 'orderDetID.transferIBAN', 'orderDetID.vacRecalcDescription',
      'orderDetID.vacCompPayElID', 'orderDetID.vacRecalcPayElID', 'empVacationPeriodID', 'sum([dayDiff])'
    ])
    .where('orderDetID.orderID', '=', order.ID)
    .where('orderDetID.mi_deleteDate', '>=', '#maxdate')
    .where('empVacationPeriodID.fromOrgID', '=', order.organizationID, 'fromOrgID')
    .where('empVacationPeriodID.fromOrgID', 'isNull', undefined, 'fromOrgNull')
    .where('dictVacationKindID.isRst', '=', 1)
    .logic('([fromOrgNull] OR [fromOrgID])')
    .groupBy(['orderDetID.ID', 'orderDetID.dateFrom', 'employeeNumberID', 'employeeNumberID.ID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'employeeNumberID.employeeID', 'orderDetID', 'orderDetID.vacRecalcOrganizationID', 'orderDetID.vacRecalcOrganizationName',
      'orderDetID.transferIBAN', 'orderDetID.vacRecalcDescription', 'orderDetID.vacCompPayElID', 'orderDetID.vacRecalcPayElID', 'empVacationPeriodID'])
    .selectAsObject({
      'orderDetID.ID': 'ID',
      'orderDetID.dateFrom': 'dateFrom',
      'employeeNumberID.employeeID': 'employeeID',
      'employeeNumberID.employeePositionID': 'employeePositionID',
      'orderDetID.vacRecalcOrganizationID': 'vacRecalcOrganizationID',
      'orderDetID.vacRecalcOrganizationName': 'vacRecalcOrganizationName',
      'orderDetID.transferIBAN': 'transferIBAN',
      'orderDetID.vacRecalcDescription': 'vacRecalcDescription',
      'orderDetID.vacCompPayElID': 'vacCompPayElID',
      'orderDetID.vacRecalcPayElID': 'vacRecalcPayElID',
      'sum([dayDiff])': 'dayDiff',
      'sum([dayRecalc])': 'dayRecalc',
      'sum([dayRestitute])': 'dayRestitute',
      'sum([dayReturn])': 'dayReturn'
    })

  const payElRecalc = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition'])
    .where('methodID.code', '=', '71')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle()

  const payElCompens = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition'])
    .where('methodID.code', '=', '16')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle()
  if (empOrderDismDetVac.length > 0) {
    let empOrderVacComp = []
    empOrderDismDetVac.forEach(row => {
      if (row.dayRecalc > 0) {
        row.dayComp = row.dayRecalc
        row.isRecalc = true
        empOrderVacComp.push(Object.assign({}, row))
      }
      if ((row.dayRestitute - row.dayReturn) !== 0) {
        row.dayComp = row.dayRestitute - row.dayReturn
        row.isRecalc = false
        empOrderVacComp.push(Object.assign({}, row))
      }
    })
    const empVacPeriodList = UB.Repository('hr_empVacationPeriod')
      .attrs('ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayDiff', 'dayCountFact', 'dayFix', 'dayComp', 'dayRecalc', 'dayReturn')
      .where('ID', 'in', empOrderVacComp.map(o => o.empVacationPeriodID))
      .selectAsObject()
    empVacPeriodList.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    const empOrderVacCompList = []
    empOrderVacComp.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.compensationPeriod1 = null
      row.compensationPeriod2 = null
      row.dayComp1 = 0
      row.dayComp2 = 0
      row.dayDiff1 = 0
      row.dayDiff2 = 0

      const empVacPeriod = empVacPeriodList.find(o => o.ID === row.empVacationPeriodID)
      if (empVacPeriod) {
        const DATE_12_09_2023 = new Date(Date.UTC(2023, 8, 12, 0, 0, 0, 0))
        const DATE_01_01_2024 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0))
        if (row.dateFrom < DATE_12_09_2023) {
          row.compensationPeriod1 = '1'
          row.dayComp1 = row.dayComp
          row.dayDiff1 = row.dayDiff
        } else {
          if (empVacPeriod.dateTo < DATE_01_01_2024) {
            row.compensationPeriod1 = '2'
            row.dayComp1 = row.dayComp
            row.dayDiff1 = row.dayDiff
          } else if (empVacPeriod.dateFrom >= DATE_01_01_2024) {
            row.compensationPeriod1 = '3'
            row.dayComp1 = row.dayComp
            row.dayDiff1 = row.dayDiff
          } else {
            const daysBefore2024 = timeCostService.getProportDays({
              orgID: order.organizationID,
              fromDate: empVacPeriod.dateFrom,
              toDate: empVacPeriod.dateTo,
              onDate: new Date(Date.UTC(2023, 11, 31, 0, 0, 0, 0)), // 31.12.2023
              employeeNumberID: row.employeeNumberID,
              planDays: empVacPeriod.dayCountPlan,
              isPartYear: true
            })
            const dayUsed = empVacPeriod.dayCountFact + (empVacPeriod.dayFix || 0) + (empVacPeriod.dayComp || 0) + (empVacPeriod.dayRecalc || 0) - (empVacPeriod.dayReturn || 0) - row.dayRecalc - (row.isRecalc ? 0 : row.dayComp)
            const dayDiff = empVacPeriod.dayCountPlan - dayUsed
            const daysDiffBefore2024 = Math.max(0, daysBefore2024 - dayUsed)
            if (daysDiffBefore2024 > 0) {
              row.compensationPeriod1 = '2'
              row.dayComp1 = Math.min(daysDiffBefore2024, row.dayComp)
              row.dayDiff1 = daysDiffBefore2024
              if (row.dayComp1 < row.dayComp) {
                row.compensationPeriod2 = '3'
                row.dayComp2 = row.dayComp - row.dayComp1
                row.dayDiff2 = dayDiff - daysDiffBefore2024
              }
            } else if (daysDiffBefore2024 === 0) {
              row.compensationPeriod1 = '3'
              row.dayComp1 = row.dayComp
              row.dayDiff1 = dayDiff
              row.compensationPeriod2 = null
              row.dayComp2 = 0
              row.dayDiff2 = 0
            }
          }
        }
      }
      empOrderVacCompList.push({
        ID: row.ID,
        dateFrom: row.dateFrom,
        employeeNumberID: row.employeeNumberID,
        employeeID: row.employeeID,
        employeePositionID: row.employeePositionID,
        dayRecalc: row.dayRecalc,
        dayRestitute: row.dayRestitute,
        dayReturn: row.dayReturn,
        vacRecalcOrganizationID: row.vacRecalcOrganizationID,
        vacRecalcOrganizationName: row.vacRecalcOrganizationName,
        transferIBAN: row.transferIBAN,
        vacRecalcDescription: row.vacRecalcDescription,
        vacCompPayElID: row.vacCompPayElID,
        vacRecalcPayElID: row.vacRecalcPayElID,
        empVacationPeriodID: row.empVacationPeriodID,
        dayDiff: row.dayDiff1,
        dayComp: row.dayComp1,
        isRecalc: row.isRecalc,
        compensationPeriod: row.compensationPeriod1
      })
      if (row.dayComp2 > 0) {
        empOrderVacCompList.push({
          ID: row.ID,
          dateFrom: row.dateFrom,
          employeeNumberID: row.employeeNumberID,
          employeeID: row.employeeID,
          employeePositionID: row.employeePositionID,
          dayRecalc: row.dayRecalc,
          dayRestitute: row.dayRestitute,
          dayReturn: row.dayReturn,
          vacRecalcOrganizationID: row.vacRecalcOrganizationID,
          vacRecalcOrganizationName: row.vacRecalcOrganizationName,
          transferIBAN: row.transferIBAN,
          vacRecalcDescription: row.vacRecalcDescription,
          vacCompPayElID: row.vacCompPayElID,
          vacRecalcPayElID: row.vacRecalcPayElID,
          empVacationPeriodID: row.empVacationPeriodID,
          dayDiff: row.dayDiff2,
          dayComp: row.dayComp2,
          isRecalc: row.isRecalc,
          compensationPeriod: row.compensationPeriod2
        })
      }
    })

    empOrderVacComp = []
    empOrderVacCompList.forEach(row => {
      const vacItem = empOrderVacComp.find(o => o.ID === row.ID && o.isRecalc === row.isRecalc && o.vacRecalcPayElID === row.vacRecalcPayElID &&
        o.vacCompPayElID === row.vacCompPayElID && o.compensationPeriod === row.compensationPeriod)
      if (vacItem) {
        vacItem.dayComp += row.dayComp || 0
        vacItem.vacationDt.push({
          empVacationPeriodID: row.empVacationPeriodID,
          dayDiff: row.dayDiff,
          dayComp: row.dayComp,
          empOrderID: order.ID
        })
      } else {
        empOrderVacComp.push({
          ID: row.ID,
          dateFrom: row.dateFrom,
          employeeNumberID: row.employeeNumberID,
          employeeID: row.employeeID,
          employeePositionID: row.employeePositionID,
          dayRecalc: row.dayRecalc,
          dayRestitute: row.dayRestitute,
          dayReturn: row.dayReturn,
          vacRecalcOrganizationID: row.vacRecalcOrganizationID,
          vacRecalcOrganizationName: row.vacRecalcOrganizationName,
          transferIBAN: row.transferIBAN,
          vacRecalcDescription: row.vacRecalcDescription,
          vacCompPayElID: row.vacCompPayElID,
          vacRecalcPayElID: row.vacRecalcPayElID,
          dayComp: row.dayComp,
          isRecalc: row.isRecalc,
          compensationPeriod: row.compensationPeriod,
          vacationDt: [{
            empVacationPeriodID: row.empVacationPeriodID,
            dayDiff: row.dayDiff,
            dayComp: row.dayComp,
            empOrderID: order.ID
          }]
        })
      }
    })
    const docRegStore = UB.DataStore('hr_docRegVacationCompensation')
    const orderRegistry = getOrderRegistry(order, period, 'hr_orderRegVacationCompensation', { name: order.description })/* 'Компенсація відпустки' */
    const docRegVacationCompensation = []
    let payElID
    empOrderVacComp.forEach(det => {
      if (det.dayComp !== 0 && det.isRecalc) {
        payElID = det.vacRecalcPayElID || payElRecalc.ID
        if (!payElID) {
          result.errorMessages.push(`Не знайдено вид оплати "Залишок відпустки"`)
          return
        }
        docRegVacationCompensation.push({
          orderRegistryID: orderRegistry.ID,
          empOrderID: order.ID,
          empOrderDetID: det.ID,
          empOrderType: 'VACATIONCOMP',
          orderNumber: order.orderNumber,
          orderDate: dateService.shiftDate(order.orderDate),
          orderState: 'PROJECT',
          employeeID: det.employeeID,
          employeeNumberID: det.employeeNumberID,
          employeePositionID: det.employeePositionID,
          payElID: payElID,
          dateFrom: dateService.shiftDate(det.dateFrom),
          dayCount: det.dayComp,
          vacRecalcOrganizationID: det.vacRecalcOrganizationID,
          vacRecalcOrganizationName: det.vacRecalcOrganizationName,
          transferIBAN: det.transferIBAN,
          vacRecalcDescription: det.vacRecalcDescription,
          compensationPeriod: det.compensationPeriod,
          isRecalc: det.isRecalc,
          vacationDt: det.vacationDt
        })
      }
      if (det.dayComp !== 0 && !det.isRecalc) {
        payElID = det.vacCompPayElID || payElCompens.ID
        if (!payElID) {
          result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Компенсація відпустки"`))
          return
        }
        docRegVacationCompensation.push({
          orderRegistryID: orderRegistry.ID,
          empOrderID: order.ID,
          empOrderDetID: det.ID,
          empOrderType: 'VACATIONCOMP',
          orderNumber: order.orderNumber,
          orderDate: dateService.shiftDate(order.orderDate),
          orderState: 'PROJECT',
          employeeID: det.employeeID,
          employeeNumberID: det.employeeNumberID,
          employeePositionID: det.employeePositionID,
          payElID: payElID,
          dateFrom: dateService.shiftDate(det.dateFrom),
          dayCount: det.dayComp,
          compensationPeriod: det.compensationPeriod,
          isRecalc: false,
          vacationDt: det.vacationDt
        })
      }
    })
    docRegVacationCompensation.forEach(doc => {
      doc.ID = docRegStore.generateID()
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: order.organizationID,
        orderID: doc.empOrderID,
        empOrderID: doc.empOrderID,
        periodCalcID: period.ID,
        flagsRec: 2,
        flagsFix: 0,
        ctrlName: 'dateTo',
        accruals: [],
        accrualsAvg: []
      }, doc))

      const copyDocAttr = ['dayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'indAvgPlan',
        'calcSum', 'planSum', 'flagsFix', 'flagsRec', 'paySum', 'compensationPeriod']
      const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
        'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
        'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
      const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })
      doc.avgSum = resultData.baseSum

      const payElRoll = doc.isRecalc ? UB.Repository('hr_payEl')
        .attrs(['ID'])
        .where('methodID.code', '=', '72')
        .where('dateFrom', '<=', period.dateFrom)
        .where('dateTo', '>=', period.dateFrom)
        .limit(1)
        .selectSingle() : undefined

      doc.payElRollID = payElRoll ? payElRoll.ID : null
      delete doc.isRecalc

      const formData = {
        detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] },
          vacationDt: { insert: [] }
        }
      }
      resultData.accruals.forEach(accr => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = accr[attrName]
        })
        accrual.orderRegistryID = orderRegistry.ID
        accrual.orderID = doc.ID
        accrual.empOrderID = doc.empOrderID
        accrual.empOrderDetID = doc.empOrderDetID
        accrual.orderDateFrom = doc.dateFrom
        formData.detail.orderRegistryDt.insert.push(accrual)
      })

      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrual.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accrual)
      })
      formData.detail.vacationDt.insert.push(...doc.vacationDt)
      delete doc.vacationDt
      docRegStore.run('insert', {
        formData: JSON.stringify(formData),
        execParams: doc
      })
    })
    deleteIfEmptyOrderRegistry(orderRegistry)
  }
  const empOrderDismDetSeverance = UB.Repository('hr_empOrderDismDet')
    .attrs(['ID', 'employeeID', 'dateFrom', 'employeeNumberID', 'employeePositionID', 'cntSeverancePay', 'severancePayElID'])
    .where('orderID', '=', order.ID)
    .where('cntSeverancePay', '>', 0)
    .selectAsObject()
  const payEl = UB.Repository('hr_payEl')
    .attrs(['ID', 'methodID.dayAccumCondition'])
    .where('methodID.code', '=', '22')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle()
  if (empOrderDismDetSeverance.length > 0) {
    const docRegStore = UB.DataStore('hr_docRegSeverancePay')
    const orderRegistry = getOrderRegistry(order, period, 'hr_orderRegistrySeverancePay', { name: order.description })/* 'Вихідна допомога' */
    const docRegSeverancePay = []
    empOrderDismDetSeverance.forEach(det => {
      const payElID = det.severancePayElID || payEl.ID
      if (!payElID) {
        result.errorMessages.push(UB.i18n(`Не вказано вид оплати для "Вихідної допомоги"`))
        return
      }

      docRegSeverancePay.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: det.ID,
        empOrderType: 'SEVERANCE',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: det.employeeID,
        employeeNumberID: det.employeeNumberID,
        employeePositionID: det.employeePositionID,
        payElID: payElID,
        dateFrom: dateService.shiftDate(det.dateFrom),
        countMonth: det.cntSeverancePay
      })
    })
    docRegSeverancePay.forEach(doc => {
      doc.ID = docRegStore.generateID()
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: orderRegistry.organizationID,
        orderID: doc.empOrderID,
        empOrderID: doc.empOrderID,
        periodCalcID: period.ID,
        flagsRec: 2,
        flagsFix: 0,
        ctrlName: 'dateTo',
        accruals: [],
        accrualsAvg: []
      }, doc))

      const copyDocAttr = ['dateFromAvg', 'dateToAvg', 'avgCalcType', 'indAvgPlan',
        'calcSum', 'planSum', 'flagsFix', 'flagsRec', 'paySum']
      const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
        'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
        'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
      const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })

      doc.avgSumRst = resultData.baseSum
      doc.avgDayRst = resultData.avgDays
      doc.avgSumWork = resultData.avgSumMonth
      doc.accrualDt = JSON.stringify(resultData.accrualDt)

      const formData = {
        detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] }
        }
      }
      resultData.accruals.forEach(accr => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = accr[attrName]
        })
        accrual.orderRegistryID = orderRegistry.ID
        accrual.orderID = doc.ID
        accrual.empOrderID = doc.empOrderID
        accrual.empOrderDetID = doc.empOrderDetID
        accrual.orderDateFrom = doc.dateFrom
        formData.detail.orderRegistryDt.insert.push(accrual)
      })

      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrual.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accrual)
      })
      docRegStore.run('insert', {
        formData: JSON.stringify(formData),
        execParams: doc
      })
    })
    deleteIfEmptyOrderRegistry(orderRegistry)
  }
}

function orderRegVacationCompensation (order, orderRegistry, period, result) {
  const empOrderVacComp = UB.Repository('hr_empOrderVacationcompListDet')
    .attrs(['paraID', 'paraID.dateFrom', 'grantParaID.payElID', 'empVacationPeriodID', 'sum([dayComp])', 'sum([dayDiff])',
      'paraID.employeeNumberID', 'paraID.employeePositionID', 'paraID.employeeID', 'empVacationPeriodID.fromOrgID'
    ])
    .where('orderID', '=', order.ID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .where('paraID.mi_deleteDate', '>=', '#maxdate')
    .groupBy(['paraID', 'paraID.dateFrom', 'grantParaID.payElID', 'empVacationPeriodID', 'paraID.employeeNumberID',
      'paraID.employeePositionID', 'paraID.employeeID', 'empVacationPeriodID.fromOrgID'])
    .selectAsObject({
      'paraID.employeeNumberID': 'employeeNumberID',
      'paraID.employeePositionID': 'employeePositionID',
      'paraID.employeeID': 'employeeID',
      'paraID.dateFrom': 'dateFrom',
      'grantParaID.payElID': 'payElID',
      'sum([dayComp])': 'dayComp',
      'sum([dayDiff])': 'dayDiff'
    })

  const payElCompens = UB.Repository('hr_payEl')
    .attrs(['ID'])
    .where('methodID.code', '=', '16')
    .where('dateFrom', '<=', period.dateFrom)
    .where('dateTo', '>=', period.dateFrom)
    .limit(1)
    .selectSingle()
  if (empOrderVacComp.length > 0) {
    const empVacPeriodList = UB.Repository('hr_empVacationPeriod')
      .attrs('ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayDiff', 'dayCountFact', 'dayFix', 'dayComp', 'dayRecalc', 'dayReturn')
      .where('ID', 'in', empOrderVacComp.map(o => o.empVacationPeriodID))
      .selectAsObject()
    empVacPeriodList.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    const empOrderVacCompList = []
    empOrderVacComp.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.compensationPeriod1 = null
      row.compensationPeriod2 = null
      row.dayComp1 = 0
      row.dayComp2 = 0
      row.dayDiff1 = 0
      row.dayDiff2 = 0

      const DATE_12_09_2023 = new Date(Date.UTC(2023, 8, 12, 0, 0, 0, 0))
      const DATE_01_01_2024 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0))

      if (row.dateFrom < DATE_12_09_2023) {
        row.compensationPeriod1 = '1'
        row.dayComp1 = row.dayComp
        row.dayDiff1 = row.dayDiff
      } else {
        const empVacPeriod = empVacPeriodList.find(o => o.ID === row.empVacationPeriodID)
        if (empVacPeriod) {
          if (empVacPeriod.dateTo < DATE_01_01_2024) {
            row.compensationPeriod1 = '2'
            row.dayComp1 = row.dayComp
            row.dayDiff1 = row.dayDiff
          } else if (empVacPeriod.dateFrom >= DATE_01_01_2024) {
            row.compensationPeriod1 = '3'
            row.dayComp1 = row.dayComp
            row.dayDiff1 = row.dayDiff
          } else {
            const daysBefore2024 = timeCostService.getProportDays({
              orgID: order.organizationID,
              fromDate: empVacPeriod.dateFrom,
              toDate: empVacPeriod.dateTo,
              onDate: new Date(Date.UTC(2023, 11, 31, 0, 0, 0, 0)), // 31.12.2023
              employeeNumberID: row.employeeNumberID,
              planDays: empVacPeriod.dayCountPlan,
              isPartYear: true
            })
            const dayUsed = empVacPeriod.dayCountFact + (empVacPeriod.dayFix || 0) + (empVacPeriod.dayComp || 0) + (empVacPeriod.dayRecalc || 0) - (empVacPeriod.dayReturn || 0) - (row.dayComp || 0)
            // const dayUsed = empVacPeriod.dayCountPlan - empVacPeriod.dayDiff - row.dayComp
            const dayDiff = empVacPeriod.dayCountPlan - dayUsed
            const daysDiffBefore2024 = Math.max(0, daysBefore2024 - dayUsed)
            if (daysDiffBefore2024 > 0) {
              row.compensationPeriod1 = '2'
              row.dayComp1 = Math.min(daysDiffBefore2024, row.dayComp)
              row.dayDiff1 = daysDiffBefore2024
              if (row.dayComp1 < row.dayComp) {
                row.compensationPeriod2 = '3'
                row.dayComp2 = row.dayComp - row.dayComp1
                row.dayDiff2 = dayDiff - daysDiffBefore2024
              }
            } else if (daysDiffBefore2024 === 0) {
              row.compensationPeriod1 = '3'
              row.dayComp1 = row.dayComp
              row.dayDiff1 = dayDiff
              row.compensationPeriod2 = null
              row.dayComp2 = 0
              row.dayDiff2 = 0
            }
            /*
            if (daysDiffBefore2024 > 0) {
              row.compensationPeriod1 = '2'
              row.dayComp1 = Math.min(daysBefore2024, row.dayComp)
              row.dayDiff1 = daysDiffBefore2024
              if (row.dayComp1 < row.dayComp) {
                row.compensationPeriod2 = '3'
                row.dayComp2 = row.dayComp - row.dayComp1
                row.dayDiff2 = dayDiff - daysDiffBefore2024
              }
            } else if (dayUsed < daysBefore2024) {
              row.compensationPeriod1 = '3'
              row.dayComp1 = row.dayComp
              row.dayDiff1 = row.dayDiff
              row.compensationPeriod2 = null
              row.dayComp2 = 0
              row.dayDiff2 = 0
            }
            */
          }
        }
      }
      empOrderVacCompList.push({
        paraID: row.paraID,
        dateFrom: row.dateFrom,
        payElID: row.payElID,
        empVacationPeriodID: row.empVacationPeriodID,
        dayComp: row.dayComp1,
        dayDiff: row.dayDiff1,
        employeeNumberID: row.employeeNumberID,
        employeePositionID: row.employeePositionID,
        employeeID: row.employeeID,
        'empVacationPeriodID.fromOrgID': row['empVacationPeriodID.fromOrgID'],
        compensationPeriod: row.compensationPeriod1
      })
      if (row.dayComp2 > 0) {
        const newRow = {
          paraID: row.paraID,
          dateFrom: row.dateFrom,
          payElID: row.payElID,
          empVacationPeriodID: row.empVacationPeriodID,
          dayComp: row.dayComp2,
          dayDiff: row.dayDiff2,
          employeeNumberID: row.employeeNumberID,
          employeePositionID: row.employeePositionID,
          employeeID: row.employeeID,
          'empVacationPeriodID.fromOrgID': row['empVacationPeriodID.fromOrgID'],
          compensationPeriod: row.compensationPeriod2
        }
        const vacItem = empOrderVacCompList.find(o => o.paraID === newRow.paraID && o.dateFrom === newRow.dateFrom &&
          o.payElID === newRow.payElID && o.empVacationPeriodID === newRow.empVacationPeriodID &&
          o.employeeNumberID === newRow.employeeNumberID && o.employeePositionID === newRow.employeePositionID &&
          o.employeeID === newRow.employeeID && o['empVacationPeriodID.fromOrgID'] === newRow['empVacationPeriodID.fromOrgID'] &&
          o.compensationPeriod === newRow.compensationPeriod
        )
        if (vacItem) {
          vacItem.dayComp += newRow.dayComp || 0
          vacItem.dayDiff += newRow.dayDiff || 0
        } else {
          empOrderVacCompList.push(newRow)
        }
      }
    })

    const docRegStore = UB.DataStore('hr_docRegVacationCompensation')
    const docRegVacationCompensation = []
    let payElID
    empOrderVacCompList.forEach(det => {
      if (det.dayComp > 0 && (det['empVacationPeriodID.fromOrgID'] === null || det['empVacationPeriodID.fromOrgID'] === orderRegistry.organizationID)) {
        payElID = det['payElID'] || payElCompens.ID
        if (!payElID) {
          result.errorMessages.push(UB.i18n(`Не знайдено вид оплати "Компенсація відпустки"`))
          return
        }
        docRegVacationCompensation.push({
          orderRegistryID: orderRegistry.ID,
          empOrderID: order.ID,
          empOrderDetID: det.paraID,
          empOrderType: 'VACATIONCOMP',
          orderNumber: order.orderNumber,
          orderDate: dateService.shiftDate(order.orderDate),
          orderState: 'PROJECT',
          employeeID: det.employeeID,
          employeeNumberID: det.employeeNumberID,
          employeePositionID: det.employeePositionID,
          payElID: payElID,
          dateFrom: det.dateFrom,
          dayCount: det.dayComp,
          compensationPeriod: det.compensationPeriod,
          vacationDt: {
            empVacationPeriodID: det.empVacationPeriodID,
            dayDiff: det.dayDiff,
            dayComp: det.dayComp,
            empOrderID: order.ID
          }
        })
      }
    })
    docRegVacationCompensation.forEach(doc => {
      doc.ID = docRegStore.generateID()
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: order.organizationID,
        orderID: doc.empOrderID,
        empOrderID: doc.empOrderID,
        periodCalcID: period.ID,
        flagsRec: 2,
        flagsFix: 0,
        ctrlName: 'dateTo',
        accruals: [],
        accrualsAvg: []
      }, doc))

      const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'indAvgPlan',
        'calcSum', 'planSum', 'flagsFix', 'flagsRec', 'paySum', 'compensationPeriod']
      const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
        'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
        'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
      const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })
      doc.avgSum = resultData.baseSum
      doc.payElRollID = null

      const formData = {
        detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] },
          vacationDt: { insert: [] }
        }
      }
      resultData.accruals.forEach(accr => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = accr[attrName]
        })
        accrual.orderRegistryID = orderRegistry.ID
        accrual.orderID = doc.ID
        accrual.empOrderID = doc.empOrderID
        accrual.empOrderDetID = doc.empOrderDetID
        accrual.orderDateFrom = doc.dateFrom
        formData.detail.orderRegistryDt.insert.push(accrual)
      })

      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrual.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accrual)
      })
      doc.vacationDt.orderID = doc.ID
      formData.detail.vacationDt.insert.push(Object.assign({}, doc.vacationDt))
      delete doc.vacationDt

      docRegStore.run('insert', {
        formData: JSON.stringify(formData),
        execParams: doc
      })
    })
  }
}

function orderRegistryMilService (order, orderRegistry, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderMilserviceDet')
    .attrs(['ID', 'employeePositionID', 'employeeNumberID', 'employeeID', 'payElID', 'payElID.calcEarnings',
      'dateFrom', 'dateTo', 'employeePositionID.payElID.calcProportion', 'payElID.methodID.code', 'employeeNumberID.description'])
    .where('orderID', '=', order.ID)
    .where('payElID', 'isNotNull')
    .where('isPosReserved', '=', 1)
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion'
    })
  const docRegAvgLongPay = []
  const docRegStore = UB.DataStore('hr_docRegAvgLongPay')
  const errorMessages = []
  const accStore = UB.DataStore('hr_employeeAccrual')

  empOrderDet.forEach(det => {
    let calcEarnings = det['payElID.calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }
    if (det['payElID.methodID.code'] === '15') {
      const pAccrual = {
        employeeID: det.employeeID,
        employeeNumberID: det.employeeNumberID,
        payElID: det.payElID,
        dateFrom: det.dateFrom,
        dateTo: det.dateTo,
        orderID: order.ID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderState: order.orderState,
        description: order.description
      }

      accStore.run('insert', {
        skipSetTimeSheet: true,
        execParams: pAccrual
      })
    } else if (det['payElID.methodID.code'] === '44' || (det.dateFrom && det.dateTo)) {
      docRegAvgLongPay.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: det.ID,
        empOrderType: 'AVGLONGPAY',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: det.employeeID,
        employeeNumberID: det.employeeNumberID,
        employeePositionID: det.employeePositionID,
        payElID: det.payElID,
        dateFrom: dateService.shiftDate(det.dateFrom),
        dateTo: dateService.shiftDate(det.dateTo),
        calcEarnings: calcEarnings || 'DAY'
      })
    } else {
      errorMessages.push(UB.i18n(`Для працівника {0} вид оплати не відповідає типу наказу`, det['employeeNumberID.description']))
    }
  })
  if (errorMessages.length) {
    result.errorMessages.push(...errorMessages)
    return
  }

  docRegAvgLongPay.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcProportion === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dateFromAvg', 'dateToAvg', 'avgCalcType', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryAvgLongPay (order, orderRegistry, period, result) {
  let empOrderDet = UB.Repository('hr_empOrderTempavgpayDet')
    .attrs(['ID', 'employeePositionID', 'employeeNumberID', 'employeeID', 'payElID', 'payElID.calcEarnings',
      'dateFrom', 'dateTo', 'employeePositionID.payElID.calcProportion', 'payElID.methodID.code', 'employeeNumberID.description'])
    .where('orderID', '=', order.ID)
    .where('payElID', 'isNotNull')
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion'
    })
  const docRegAvgLongPay = []
  const docRegStore = UB.DataStore('hr_docRegAvgLongPay')

  empOrderDet.forEach(det => {
    let calcEarnings = det['payElID.calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }

    docRegAvgLongPay.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'AVGLONGPAY',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: det.payElID,
      dateFrom: dateService.shiftDate(det.dateFrom),
      dateTo: dateService.isMaxDate(det.dateTo) ? null : dateService.shiftDate(det.dateTo),
      calcEarnings: calcEarnings || 'DAY'
    })
  })

  docRegAvgLongPay.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcProportion === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dateFromAvg', 'dateToAvg', 'avgCalcType', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryAveragePay (order, orderRegistry, period, result) {
  const docRegAvgPay = []

  const empOrderDet = UB.Repository('hr_empOrderAveragepayDet')
    .attrs(['ID', 'payElID', 'payElID.calcEarnings', 'payElID.methodID.code', 'payElID.dayAccumCondition', 'payElID.methodID.dayAccumCondition'])
    .where('orderID', '=', order.ID)
    .where('payElID', 'isNotNull')
    .selectAsObject()

  empOrderDet.forEach(det => {
    const employee = UB.Repository('hr_empOrderEmployeeDet')
      .attrs(['ID', 'employeePositionID', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'employeePositionID.payElID.calcProportion'])
      .where('paraID', '=', det.ID)
      .selectAsObject({
        'employeePositionID.payElID.calcProportion': 'calcProportion'
      })

    employee.forEach(emp => {
      let calcEarnings = det['payElID.calcEarnings']
      if (calcEarnings === 'ACCRUAL') {
        calcEarnings = emp['calcProportion']
      }
      docRegAvgPay.push({
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: det.ID,
        empOrderType: 'AVGPAY',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: emp.employeePositionID,
        payElID: det.payElID,
        dateFrom: dateService.shiftDate(emp.dateFrom),
        dateTo: dateService.shiftDate(emp.dateTo),
        dayAccumCondition: det['payElID.methodID.dayAccumCondition'],
        calcEarnings: calcEarnings || 'DAY'
      })
    })
  })

  const docRegAvgPayStore = UB.DataStore('hr_docRegAvgPay')
  docRegAvgPay.forEach(doc => {
    doc.ID = docRegAvgPayStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcProportion === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    delete doc.dayAccumCondition

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'hourCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType',
      'calcSum', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegAvgPayStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryMedExamination (order, orderRegistry, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderMedexaminationListDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo',
      'employeePositionID.payElID.calcProportion', 'entityParaID.payElID', 'entityParaID.payElID.calcEarnings',
      'entityParaID.payElID.methodID.dayAccumCondition'
    ])
    .where('orderID', '=', order.ID)
    .where('entityParaID.payElID', 'isNotNull')
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion',
      'entityParaID.payElID.methodID.dayAccumCondition': 'dayAccumCondition',
      'entityParaID.payElID': 'payElID',
      'entityParaID.payElID.calcEarnings': 'payElID.calcEarnings'
    })
  const docRegAvgPay = []

  const docRegAvgPayStore = UB.DataStore('hr_docRegAvgPay')

  empOrderDet.forEach(det => {
    const payElID = det.payElID
    let calcEarnings = det['payElID.calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }
    docRegAvgPay.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'AVGPAY',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: payElID,
      dateFrom: dateService.shiftDate(det.dateFrom),
      dateTo: dateService.shiftDate(det.dateTo),
      calcEarnings: calcEarnings || 'DAY',
      dayAccumCondition: det.dayAccumCondition
    })
  })

  docRegAvgPay.forEach(doc => {
    doc.ID = docRegAvgPayStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcEarnings === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'hourCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType',
      'calcSum', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegAvgPayStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistryEasyWork (order, orderRegistry, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderMoveDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'addPayDateFrom', 'addPayDateTo',
      'employeePositionID.payElID.calcProportion', 'addPayElID', 'addPayElID.payElID.calcEarnings',
      'addPayElID.methodID.dayAccumCondition', 'empOrderSicknessID', 'empOrderSicknessID.number', 'empOrderSicknessID.serie',
      'empOrderSicknessID.orderDate'
    ])
    .where('orderID', '=', order.ID)
    .where('addPayElID.methodID.code', '=', '51')
    .where('addPayDateFrom', 'isNotNull')
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion',
      'addPayElID.methodID.dayAccumCondition': 'dayAccumCondition',
      'addPayElID.calcEarnings': 'calcEarnings',
      'addPayElID': 'payElID',
      'addPayDateFrom': 'dateFrom',
      'addPayDateTo': 'dateTo'
    })
  const docRegs = []

  const docRegStore = UB.DataStore('hr_docRegEasyWork')

  empOrderDet.forEach(det => {
    const payElID = det.payElID
    let calcEarnings = det['payElID.calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }
    docRegs.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'SUPPLEMENTAVGEARN',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: payElID,
      dateFrom: dateService.shiftDate(det.dateFrom),
      dateTo: dateService.shiftDate(det.dateTo),
      dayAccumCondition: det.dayAccumCondition,
      seriaRef: det.empOrderSicknessID ? det['empOrderSicknessID.serie'] : null,
      numberRef: det.empOrderSicknessID ? det['empOrderSicknessID.number'] : null,
      dateRef: det.empOrderSicknessID ? det['empOrderSicknessID.orderDate'] : null,
      typeRefSick: det.empOrderSicknessID ? '2' : null
    })
  })

  docRegs.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcEarnings === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function orderRegistrySupAvgEarn (order, orderRegistry, period, result) {
  const empOrderDet = UB.Repository('hr_empOrderMoveDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'addPayDateFrom', 'addPayDateTo',
      'employeePositionID.payElID.calcProportion', 'addPayElID', 'addPayElID.payElID.calcEarnings',
      'addPayElID.methodID.dayAccumCondition'
    ])
    .where('orderID', '=', order.ID)
    .where('addPayElID.methodID.code', '=', '50')
    .where('addPayDateFrom', 'isNotNull')
    .selectAsObject({
      'employeePositionID.payElID.calcProportion': 'calcProportion',
      'addPayElID.methodID.dayAccumCondition': 'dayAccumCondition',
      'addPayElID.calcEarnings': 'calcEarnings',
      'addPayElID': 'payElID',
      'addPayDateFrom': 'dateFrom',
      'addPayDateTo': 'dateTo'
    })
  const docRegs = []

  const docRegStore = UB.DataStore('hr_docRegSupAvgEarn')

  empOrderDet.forEach(det => {
    const payElID = det.payElID
    let calcEarnings = det['payElID.calcEarnings']
    if (calcEarnings === 'ACCRUAL') {
      calcEarnings = det['calcProportion']
    }
    docRegs.push({
      orderRegistryID: orderRegistry.ID,
      empOrderID: order.ID,
      empOrderDetID: det.ID,
      empOrderType: 'SUPPLEMENTAVGEARN',
      orderNumber: order.orderNumber,
      orderDate: dateService.shiftDate(order.orderDate),
      orderState: 'PROJECT',
      employeeID: det.employeeID,
      employeeNumberID: det.employeeNumberID,
      employeePositionID: det.employeePositionID,
      payElID: payElID,
      dateFrom: dateService.shiftDate(det.dateFrom),
      dateTo: dateService.shiftDate(det.dateTo),
      dayAccumCondition: det.dayAccumCondition
    })
  })

  docRegs.forEach(doc => {
    doc.ID = docRegStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: 2 | (doc.calcEarnings === 'HOUR' ? 1 << 5 : 0),
      flagsFix: 0,
      dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'flagsFix', 'flagsRec', 'avgSum']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition
    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }

    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
}

function updateOrderRegistryState (ID, orderState) {
  if (orderState === 'POSTED') {
    const hasProjects = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID'])
      .where('orderID.orderState', '=', 'PROJECT')
      .where('orderRegistryID', '=', ID)
      .misc({ __skipRls: true })
      .limit(1)
      .selectSingle()
    if (hasProjects) return
  }
  UB.DataStore('hr_orderRegistry').execSQL(`UPDATE hr_orderRegistry SET orderState = :orderState: WHERE ID = :ID:`, { ID, orderState })
  UB.DataStore('hr_order').execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID, orderState })
}

function checkOrderRegistryDtPeriodCalc (ID, orderRegistryID, periodID) {
  let detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'periodCalcID.name', 'periodCalcID.isClosed'])
    .whereIf(periodID, 'periodCalcID', '=', periodID)
    .where('orderID', '=', ID).selectAsObject()

  if (!detail.length) {
    detail = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID', 'periodCalcID.name', 'periodCalcID.isClosed'])
      .where('orderID', '=', ID).selectAsObject()
  }
  if (detail.find(row => row['periodCalcID.isClosed'])) {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ був проведений у закритому періоді! Скасування не можливо!')}>>>`)
  }
}

function getTimeSheetChangeByOrder (orderID, employeeNumberID) {
  if (!orderID || !employeeNumberID) {
    return null
  }
  const timeSheetChange = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['timeSheetChangeID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('timeSheetChangeID.orderID', '=', orderID)
    .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()
  return timeSheetChange ? timeSheetChange.timeSheetChangeID : null
}

function clearOrderRegistryDtPeriodCalc (ID, orderRegistryID) {
  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'organizationID'])
    .selectById(orderRegistryID)
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'periodCalcID'])
    .where('periodCalc', '>=', currentPeriod.dateFrom)
    .where('orderID', '=', ID)
    .selectAsObject()
  const storeDt = UB.DataStore('hr_orderRegistryDt')
  detail.forEach(row => {
    storeDt.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        periodCalcID: null,
        periodCalc: null
      }
    })
  })
  storeDt.freeNative()
}

function setAllowPostingForOrders (empOrderID, value) {
  const result = {
    errorMessages: [],
    warningMessages: []
  }
  const hrOrder = UB.Repository('hr_order').attrs(['orderState', 'orderClass.entityName', 'empOrderType', 'description']).selectById(empOrderID)

  if (!hrOrder) {
    result.errorMessages.push(UB.i18n(`Не знайдено наказ. Можливо він був видалений`))
    return result
  }
  if (hrOrder.orderState !== 'PROJECT') {
    result.errorMessages.push(UB.i18n(`Наказ {0} проведений`, hrOrder.description))
    return result
  }
  const store = UB.DataStore(hrOrder['orderClass.entityName'])
  store.execSQL(`UPDATE hr_order SET allowPosting = :allowPosting: WHERE ID = :ID:`, { ID: empOrderID, allowPosting: value ? 1 : 0 })
  store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET allowPosting = :allowPosting: WHERE ID = :ID:`, { ID: empOrderID, allowPosting: value ? 1 : 0 })
  App.dbCommit()

  return result
}

function setAppointTimeSheet (order, period) {
  const accrualService = require('../../HR/modules/accrualService')
  const empOrderAppointDet = UB.Repository('hr_empOrderAppointDet')
    .attrs(['ID', 'employeeID', 'srcOrganizationID', 'parentEmpNumberID', 'parentEmpNumberID.orgID', 'employeeNumberID', 'employeeNumberID.dateFrom',
      'parentEmpNumberID.dateTo'])
    .where('orderID', '=', order.ID)
    .where('isTransfer', '=', 1)
    .selectAsObject()
  const periods = periodService.getPeriodsByDate(order.organizationID, dateService.addYears(period.dateFrom, -3), dateService.addYears(period.dateTo, 1))
  const store = UB.DataStore('tim_timeSheet')
  const employeeNumbers = []
  empOrderAppointDet.forEach(row => {
    let minDateTimeSheet
    if (row.parentEmpNumberID) {
      employeeNumbers.push(row.employeeNumberID)
      const timeSheetParents = UB.Repository('tim_timeSheet')
        .attrs(['*', 'periodID.dateFrom'])
        .where('employeeNumberID', '=', row.parentEmpNumberID)
        .where('dateWork', '>', row['parentEmpNumberID.dateTo'])
        .where('orderID.orderClass.entityName', '=', 'hr_empOrder', 'empOrder')
        .where('orderID.orderClass.entityName', 'in', ['hr_empOrderSickness', 'hr_docRegSickness', 'hr_docRegVacation', 'hr_docRegBusinessTrip'], 'empOrderSickness')
        .where('orderID.empOrderType', 'notIn', ['APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE', 'APPOINT_OUTSTAFF', 'APPOINT_HOUR', 'DISM', 'MOVE', 'MOVE_OUTSTAFF'], 'empOrderType')
        // .where('isActive', '=', 1)
        .where('isCanceled', '=', 0)
        .logic('(([empOrder] AND [empOrderType]) or [empOrderSickness])')
        .selectAsObject()
      const timeSheets = timeSheetParents.length ? UB.Repository('tim_timeSheet')
        .attrs(['*'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('isActive', '=', 1)
        .where('dateWork', 'in', timeSheetParents.map(o => o.dateWork))
        .selectAsObject() : []

      timeSheetParents.forEach(timeSheetParent => {
        const dateWork = dateService.shiftDate(timeSheetParent.dateWork)
        const timeSheetPeriod = periods.find(o => o.dateFrom <= dateWork && o.dateTo >= dateWork)
        const timeSheet = timeSheets.find(o => dateService.shiftDate(o.dateWork).getTime() === dateWork.getTime()) || {}
        if (!minDateTimeSheet || minDateTimeSheet > dateWork) {
          minDateTimeSheet = dateWork
        }
        if (timeSheetPeriod) {
          const execParams = {
            employeeNumberID: row.employeeNumberID,
            dateWork,
            isActive: 1,
            orderID: timeSheetParent.orderID,
            periodID: timeSheetPeriod.ID,
            factTimeCostID: timeSheetParent.factTimeCostID,
            factHour: timeSheetParent.factHour,
            factHourNight: timeSheetParent.factHourNight,
            factHourEvening: timeSheetParent.factHourEvening,
            factHourHarmful: timeSheetParent.factHourHarmful,
            factHourDop: timeSheetParent.factHourDop,
            factHourPlus: timeSheetParent.factHourPlus,
            planID: timeSheet.planID || null,
            planTimeCostID: timeSheet.planTimeCostID || null,
            planHour: timeSheet.planHour || 0,
            normHour: timeSheet.normHour || 0,
            normMonthDay: timeSheet.normMonthDay,
            normMonthHour: timeSheet.normMonthHour,
            planMonthDay: timeSheet.planMonthDay,
            planMonthHour: timeSheet.planMonthHour,
            planHourNight: timeSheet.planHourNight || 0,
            planHourEvening: timeSheet.planHourEvening || 0,
            factPlanHour: timeSheet.factPlanHour || 0,
            mtCount: timeSheet.mtCount || 1,
            isSchedule: 0,
            isCorrection: 0,
            isCanceled: 0
          }
          store.run('insert', {
            execParams
          })
          if (timeSheet.ID) {
            store.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: timeSheet.ID,
                isActive: 0
              }
            })
          }
        }
      })
    }
    if (dateService.shiftDate(row['employeeNumberID.dateFrom']) < period.dateFrom && minDateTimeSheet &&
        minDateTimeSheet < period.dateFrom) {
      accrualService.setRecalculatePeriod({
        orgID: order.organizationID,
        employeeNumberID: row.employeeNumberID,
        dateFrom: dateService.shiftDate(Math.max(minDateTimeSheet, dateService.shiftDate(row['employeeNumberID.dateFrom']))),
        entityName: 'hr_empOrderAppointDet',
        initiatorID: order.ID,
        description: order.description
      })
    }
  })
  if (employeeNumbers.length) {
    employeeNumbers.forEach(row => {
      calcService.addCalcTimeSheetQueue({ employeeNumberID: row.ID, description: UB.i18n('Опрацювання призначенняя') })
    })
    calcService.addCalcQueue({ employeeNumbers, description: order.description })
  }
}

function removeAppointTimeSheet (empOrderID, order) {
  const accrualService = require('../../HR/modules/accrualService')
  const empOrderAppointDet = UB.Repository('hr_empOrderAppointDet')
    .attrs(['ID', 'employeeID', 'srcOrganizationID', 'parentEmpNumberID', 'parentEmpNumberID.orgID', 'employeeNumberID',
      'employeeNumberID.dateFrom' ])
    .where('orderID', '=', empOrderID)
    .where('isTransfer', '=', 1)
    .selectAsObject()
  const period = periodService.getCurrentPeriod(order.organizationID)
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  const employeeNumbers = []
  empOrderAppointDet.forEach(row => {
    let minDateTimeSheet
    if (row.parentEmpNumberID) {
      employeeNumbers.push(row.employeeNumberID)
      const timeSheetParents = UB.Repository('tim_timeSheet')
        .attrs(['ID', 'isActive', 'dateWork', 'createPeriodID', 'periodID'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orderID.organizationID', '!=', order.organizationID)
        .selectAsObject()

      timeSheetParents.forEach(timeSheetParent => {
        timeSheetParent.dateWork = dateService.shiftDate(timeSheetParent.dateWork)
        if (!minDateTimeSheet || minDateTimeSheet > timeSheetParent.dateWork) {
          minDateTimeSheet = timeSheetParent.dateWork
        }
        if (period.dateFrom > timeSheetParent.dateWork) {
          timTimeSheetStore.execSQL(`UPDATE tim_timeSheet SET 
        changeOrderID = :changeOrderID:, isCanceled = :isCanceled:, periodID = :periodID:, createPeriodID = :createPeriodID:,
        canceledPeriodID = :canceledPeriodID:, isActive = :isActive: WHERE ID = :ID:`,
          { ID: timeSheetParent.ID,
            changeOrderID: order.ID,
            isCanceled: 1,
            periodID: period.ID,
            createPeriodID: timeSheetParent.createPeriodID || timeSheetParent.periodID,
            canceledPeriodID: period.ID,
            isActive: 0 })
        } else {
          timTimeSheetStore.execSQL('DELETE FROM tim_timeSheet WHERE ID = :ID:', { ID: timeSheetParent.ID })
        }
      })
      const rules = UB.Repository('hr_dictTimeCostInt')
        .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
        .selectAsObject()
      timeSheetParents.forEach(function (item) {
        if (item.isActive) {
          timService.changeActiveByDateWork(row.employeeNumberID, item.dateWork, rules)
        }
      })
      if (dateService.shiftDate(row['employeeNumberID.dateFrom']) < period.dateFrom && minDateTimeSheet &&
            minDateTimeSheet < period.dateFrom) {
        accrualService.setRecalculatePeriod({
          orgID: order.organizationID,
          employeeNumberID: row.employeeNumberID,
          dateFrom: dateService.shiftDate(Math.max(minDateTimeSheet, dateService.shiftDate(row['employeeNumberID.dateFrom']))),
          entityName: 'hr_empOrderAppointDet',
          initiatorID: order.ID,
          description: order.description
        })
      }
    }
  })
  if (employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, description: order.description })
  }
}

function updateEmployeeList (orderRegistryID) {
  if (orderRegistryID) {
    const employeeListDt = UB.Repository('hr_orderRegistryDt')
      .attrs('employeeNumberID.employeeID.shortFIO')
      .where('orderRegistryID', '=', orderRegistryID)
      .groupBy('employeeNumberID.employeeID.shortFIO')
      .selectAsArrayOfValues()
    let employeeList = employeeListDt.length ? employeeListDt.join(',') : null
    if (employeeList && employeeList.length > 128) {
      employeeList = employeeList.substring(0, 128)
    }
    UB.DataStore('hr_orderRegistry').execSQL(`UPDATE hr_orderRegistry SET employeeList = :employeeList: WHERE ID = :ID:`, {
      ID: orderRegistryID,
      employeeList
    })
  }
}

function orderRegistryChangeMission (order, orderRegistry, period, result) {
  const empOrderChangemissionDet = UB.Repository('hr_empOrderChangemissionDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'missionOrderID', 'missionOrderID.orderState',
      'missionOrderDetID', 'dateFrom', 'dateTo', 'missionOrderID.description', 'employeeNumberID.description'
    ])
    .where('orderID', '=', order.ID)
    .selectAsObject()
  const empOrderCancelmissionDet = UB.Repository('hr_empOrderCancelmissionDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'missionOrderID', 'missionOrderID.orderState',
      'missionOrderDetID', 'missionOrderID.description'
    ])
    .where('orderID', '=', order.ID)
    .selectAsObject()

  const notProcessed = []
  const missionOrders = []
  empOrderChangemissionDet.forEach(row => {
    if (row['missionOrderID.orderState'] !== 'PROCESSED') {
      notProcessed.push(row['missionOrderID.description'])
    }
    if (!missionOrders.find(o => o.missionOrderID === row.missionOrderID && o.missionOrderDetID === row.missionOrderDetID)) {
      missionOrders.push({
        missionOrderID: row.missionOrderID,
        missionOrderDetID: row.missionOrderDetID,
        employeePositionID: row.employeePositionID,
        employeeNumberID: row.employeeNumberID
      })
    }
  })
  empOrderCancelmissionDet.forEach(row => {
    if (row['missionOrderID.orderState'] !== 'PROCESSED') {
      notProcessed.push(row['missionOrderID.description'])
    }
    if (!missionOrders.find(o => o.missionOrderID === row.missionOrderID && o.missionOrderDetID === row.missionOrderDetID)) {
      missionOrders.push({
        missionOrderID: row.missionOrderID,
        missionOrderDetID: row.missionOrderDetID,
        employeePositionID: row.employeePositionID,
        employeeNumberID: row.employeeNumberID
      })
    }
  })
  if (notProcessed.length) {
    result.errorMessages.push(UB.i18n('{0} ще не опрацьовано! Опрацюйте спочатку!', notProcessed.join(',')))
    return
  }
  const docRegBusinessTripStore = UB.DataStore('hr_docRegBusinessTrip')

  missionOrders.forEach(row => {
    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs('orderID')
      .where('empOrderID', '=', row.missionOrderID)
      .where('empOrderDetID.paraID', '=', row.missionOrderDetID)
      .where('employeeNumberID', '=', row.employeeNumberID)
      .groupBy('orderID')
      .misc({ __skipRls: true })
      .selectAsObject()
    orderRegistryDt.forEach(doc => {
      const docReg = UB.Repository('hr_docRegBusinessTrip')
        .attrs('ID', 'orderRegistryID', 'orderState', 'employeeNumberID')
        .selectById(doc.orderID)
      if (docReg) {
        if (docReg.orderState === 'POSTED') {
          timService.cancelTimeSheetByOrder(docReg.ID, order.ID, period)
        }
        docRegBusinessTripStore.execSQL(`UPDATE hr_docRegBusinessTrip SET orderState = :orderState: WHERE ID = :ID:`, { ID: docReg.ID, orderState: 'CANCELED' })
        docRegBusinessTripStore.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: docReg.ID, orderState: 'CANCELED' })
      }
    })
  })

  const docRegBusinessTrip = []

  empOrderChangemissionDet.forEach(row => {
    const empNum = UB.Repository('hr_employeeNumberS').attrs(['ID']).selectById(row.employeeNumberID)
    if (!empNum) {
      result.errorMessages.push(UB.i18n(`Не знайдено працівника {0}`, row['employeeNumberID.description']))
      return
    }
    const missionOrderDet = UB.Repository('hr_empOrderEmployeeDet')
      .attrs(['payElID', 'payElID.dayAccumCondition', 'payElID.methodID.dayAccumCondition', 'payElID.calcIndAvgType',
        'payElID.calcEarnings', 'payElID.calcEachPeriod'])
      .where('paraID', '=', row.missionOrderDetID)
      .where('employeePositionID', '=', row.employeePositionID)
      .limit(1)
      .selectSingle()
    if (!missionOrderDet) {
      result.errorMessages.push(UB.i18n(`Не знайдено пункт наказу для працівника {0}`, row['employeeNumberID.description']))
      return
    }
    let dateFrom = dateService.shiftDate(row.dateFrom)
    let dateTo = dateService.shiftDate(row.dateTo)
    const periods = missionOrderDet['payElID.calcEachPeriod'] ? periodService.getPeriodsByDate(order.organizationID, dateService.firstDayOfMonth(dateFrom), dateService.lastDayOfMonth(dateTo)) : [period]
    periods.forEach(calcPeriod => {
      const newDoc = {
        orderRegistryID: orderRegistry.ID,
        empOrderID: order.ID,
        empOrderDetID: row.ID,
        empOrderType: 'MISSION',
        orderNumber: order.orderNumber,
        orderDate: dateService.shiftDate(order.orderDate),
        orderState: 'PROJECT',
        employeeID: row.employeeID,
        employeeNumberID: row.employeeNumberID,
        employeePositionID: row.employeePositionID,
        payElID: missionOrderDet['payElID'],
        dateFrom: missionOrderDet['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.max(calcPeriod.dateFrom, dateFrom)) : dateFrom,
        dateTo: missionOrderDet['payElID.calcEachPeriod'] ? dateService.shiftDate(Math.min(calcPeriod.dateTo, dateTo)) : dateTo,
        dayCount: row.dayCount,
        dayAccumCondition: missionOrderDet['payElID.dayAccumCondition'] || missionOrderDet['payElID.methodID.dayAccumCondition'] || 'noDaysOff',
        calcEarnings: missionOrderDet['payElID.calcEarnings'],
        flagsFix: 0
      }
      const calIndAvgType = missionOrderDet['payElID.calcIndAvgType']
      switch (calIndAvgType) {
        case 'AVG':
          newDoc.indAvgPlan = 'INDAVG'
          newDoc.flagsFix = newDoc.flagsFix | 1 << 23
          break
        case 'PLAN':
          newDoc.indAvgPlan = 'INDPLAN'
          newDoc.avgCalcType = 'PLAN'
          newDoc.flagsRec = 1 << 8
          newDoc.flagsFix = newDoc.flagsFix | 1 << 23
          break
      }
      docRegBusinessTrip.push(newDoc)
    })
  })

  docRegBusinessTrip.forEach(doc => {
    doc.ID = docRegBusinessTripStore.generateID()
    const resultData = rlService.calculateOrderAccrual(Object.assign({
      orgID: orderRegistry.organizationID,
      orderID: doc.ID, // doc.empOrderID,
      empOrderID: doc.empOrderID,
      periodCalcID: period.ID,
      flagsRec: (doc.flagsRec || 0) | 2,
      flagsFix: doc.flagsFix,
      dayAccumCondition: doc.dayAccumCondition,
      calcEarnings: doc.calcEarnings,
      ctrlName: 'dateTo',
      accruals: [],
      accrualsAvg: []
    }, doc))

    const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'indAvgPlan',
      'calcSum', 'planSum', 'flagsFix', 'flagsRec', 'calcEarnings']
    const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
      'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
      'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
    const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
    copyDocAttr.forEach(attrName => {
      doc[attrName] = resultData[attrName]
    })
    doc.avgSum = resultData.baseSum
    delete doc.dayAccumCondition

    const formData = { detail: {
      orderRegistryDt: { insert: [] },
      accrualAvg: { insert: [] }
    } }
    resultData.accruals.forEach(accr => {
      const accrual = {}
      copyDocRegDtAttr.forEach(attrName => {
        accrual[attrName] = accr[attrName]
      })
      accrual.orderRegistryID = orderRegistry.ID
      accrual.orderID = doc.ID
      accrual.empOrderID = doc.empOrderID
      accrual.empOrderDetID = doc.empOrderDetID
      accrual.orderDateFrom = doc.dateFrom
      accrual.orderDateTo = doc.dateTo
      formData.detail.orderRegistryDt.insert.push(accrual)
    })

    resultData.accrualsAvg.forEach(accr => {
      const accrual = {}
      copyDocAccrualAvgAttr.forEach(attrName => {
        accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
      })
      accrual.orderID = doc.ID
      formData.detail.accrualAvg.insert.push(accrual)
    })
    docRegBusinessTripStore.run('insert', {
      formData: JSON.stringify(formData),
      execParams: doc
    })
  })
  docRegBusinessTripStore.freeNative()
}

function cancelOrderRegistryChangeMission (empOrderID, result) {
  const empOrderChangemissionDet = UB.Repository('hr_empOrderChangemissionDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'missionOrderID', 'missionOrderID.orderState',
      'missionOrderDetID', 'dateFrom', 'dateTo', 'missionOrderID.description', 'employeeNumberID.description'
    ])
    .where('orderID', '=', empOrderID)
    .selectAsObject()
  const empOrderCancelmissionDet = UB.Repository('hr_empOrderCancelmissionDet')
    .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'missionOrderID', 'missionOrderID.orderState',
      'missionOrderDetID', 'missionOrderID.description'
    ])
    .where('orderID', '=', empOrderID)
    .selectAsObject()

  const missionOrders = []
  empOrderChangemissionDet.forEach(row => {
    if (!missionOrders.find(o => o.missionOrderID === row.missionOrderID && o.missionOrderDetID === row.missionOrderDetID)) {
      missionOrders.push({
        missionOrderID: row.missionOrderID,
        missionOrderDetID: row.missionOrderDetID,
        employeePositionID: row.employeePositionID,
        employeeNumberID: row.employeeNumberID
      })
    }
  })
  empOrderCancelmissionDet.forEach(row => {
    if (!missionOrders.find(o => o.missionOrderID === row.missionOrderID && o.missionOrderDetID === row.missionOrderDetID)) {
      missionOrders.push({
        missionOrderID: row.missionOrderID,
        missionOrderDetID: row.missionOrderDetID,
        employeePositionID: row.employeePositionID,
        employeeNumberID: row.employeeNumberID
      })
    }
  })

  const docRegBusinessTripStore = UB.DataStore('hr_docRegBusinessTrip')

  missionOrders.forEach(row => {
    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs('orderID')
      .where('empOrderID', '=', row.missionOrderID)
      .where('empOrderDetID.paraID', '=', row.missionOrderDetID)
      .where('employeeNumberID', '=', row.employeeNumberID)
      .groupBy('orderID')
      .misc({ __skipRls: true })
      .selectAsObject()
    orderRegistryDt.forEach(doc => {
      const docReg = UB.Repository('hr_docRegBusinessTrip')
        .attrs('ID', 'orderRegistryID', 'orderState', 'employeeNumberID', 'orderRegistryID.organizationID')
        .selectById(doc.orderID)
      if (docReg) {
        if (docReg.orderState === 'CANCELED') {
          timService.restoreTimeSheetByChangeOrder(empOrderID, docReg['orderRegistryID.organizationID'])
        }
        docRegBusinessTripStore.execSQL(`UPDATE hr_docRegBusinessTrip SET orderState = :orderState: WHERE ID = :ID:`, { ID: docReg.ID, orderState: 'POSTED' })
        docRegBusinessTripStore.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: docReg.ID, orderState: 'POSTED' })
      }
    })
  })
}
