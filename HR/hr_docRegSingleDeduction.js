const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const algorithmService = require('../HR/modules/algorithmService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['periodID', 'periodID.dateFrom', 'periodID.dateTo', 'organizationID'])
    .selectById(execParams.orderRegistryID)
  orderRegistry.dateFrom = dateService.shiftDate(orderRegistry['periodID.dateFrom'])
  orderRegistry.dateTo = dateService.shiftDate(orderRegistry['periodID.dateTo'])
  const accrualDt = rlService.calculateOrderAccrualDt({
    employeeNumberID: execParams.employeeNumberID,
    payElID: execParams.payElID,
    orgID: orderRegistry.organizationID,
    periodID: orderRegistry.periodID,
    dateFrom: new Date(orderRegistry['periodID.dateFrom']),
    dateTo: new Date(orderRegistry['periodID.dateTo']),
    dictFundSourceID: execParams.dictFundSourceID,
    paySum: execParams.paySum
  })
  store.run('insert', {
    __skipOptimisticLock: true,
    execParams: {
      orderRegistryID: execParams.orderRegistryID,
      employeePositionID: execParams.employeePositionID,
      employeeNumberID: execParams.employeeNumberID,
      payElID: execParams.payElID,
      orderDate: dateService.shiftDate(execParams.orderDate),
      orderNumber: execParams.orderNumber,
      orderID: execParams.ID,
      periodCalcID: null,
      periodCalc: null,
      periodSalaryID: orderRegistry.periodID,
      periodSalary: orderRegistry.dateFrom,
      dateFrom: orderRegistry.dateFrom,
      dateTo: orderRegistry.dateTo,
      flagsRec: execParams.flagsRec,
      flagsFix: execParams.flagsFix,
      mask: algorithmService.getFillMaskByPeriod(orderRegistry.dateFrom, orderRegistry.dateTo),
      dictFundSourceID: execParams.dictFundSourceID,
      paySum: execParams.paySum,
      accrualDt: JSON.stringify(accrualDt),
      empOrderID: execParams.empOrderID || null,
      empOrderDetID: execParams.empOrderDetID || null
    }
  })
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
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

function beforeUpdate (ctx) {
  setDefaultAttribute(ctx)
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'orderRegistryID']).where('orderID', '=', execParams.ID)
    .selectSingle()
  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['periodID', 'periodID.dateFrom', 'periodID.dateTo', 'organizationID'])
    .selectById(orderRegistryDt.orderRegistryID)
  const accrualDt = rlService.calculateOrderAccrualDt({
    employeeNumberID: execParams.employeeNumberID || previousValues.employeeNumberID,
    payElID: execParams.payElID || previousValues.payElID,
    orgID: orderRegistry.organizationID,
    periodID: orderRegistry.periodID,
    dateFrom: new Date(orderRegistry['periodID.dateFrom']),
    dateTo: new Date(orderRegistry['periodID.dateTo']),
    dictFundSourceID: (execParams.dictFundSourceID || execParams.dictFundSourceID === null) ? execParams.dictFundSourceID : previousValues.dictFundSourceID,
    paySum: execParams.paySum || previousValues.paySum
  })

  if (orderRegistryDt) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: orderRegistryDt.ID,
        employeePositionID: execParams.employeePositionID || previousValues.employeePositionID,
        employeeNumberID: execParams.employeeNumberID || previousValues.employeeNumberID,
        payElID: execParams.payElID || previousValues.payElID,
        orderDate: dateService.shiftDate(execParams.orderDate || previousValues.orderDate),
        orderNumber: execParams.orderNumber || previousValues.orderNumber,
        flagsRec: execParams.flagsRec || previousValues.flagsRec,
        flagsFix: execParams.flagsFix || previousValues.flagsFix,
        paySum: execParams.paySum || previousValues.paySum,
        dictFundSourceID: (execParams.dictFundSourceID || execParams.dictFundSourceID === null) ? execParams.dictFundSourceID : previousValues.dictFundSourceID,
        accrualDt: JSON.stringify(accrualDt)
      }
    })
  }
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'mi_modifyDate', 'employeeNumberID.limitedAccess'])
    .where('orderID', '=', execParams.ID)
    .misc({ __skipRls: true })
    .selectAsObject()
  orderRegistryDt.forEach(record => {
    if (record['employeeNumberID.limitedAccess'] && !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
      throw new UB.UBAbort(`<<<${UB.i18n('Відсутні права на видалення документа нарахування')}>>>`)
    }
    Session.runAsAdmin(function () {
      store.run('delete', {
        skipOrderDelete: true,
        execParams: {
          ID: record.ID,
          mi_modifyDate: record.mi_modifyDate
        }
      })
    })
  })
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }

  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

me.doPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(ctx.mParams.execParams.ID)
  }
  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name'])
    .where('orderID', '=', instanceData.ID).selectAsObject()

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)

  const payEls = ctx.mParams.payEls ? JSON.parse(ctx.mParams.payEls) : payElService.getPayEl({ orgID: order.organizationID, getAll: false })
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

  const accruals = []

  detail.forEach(row => {
    if (row.periodCalcID !== postingPeriod.ID) {
      storeDt.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          periodCalcID: postingPeriod.ID,
          periodCalc: postingPeriod.dateFrom
        }
      })
    }
    accruals.push({
      orgID: order.organizationID,
      orderID: row.orderID,
      orderDtID: row.ID,
      periodCalcID: postingPeriod.ID,
      periodSalaryID: row.periodSalaryID,
      periodCalc: postingPeriod.dateFrom,
      periodSalary: row.periodSalary,
      employeeNumberID: row.employeeNumberID,
      payElID: row.payElID,
      flagsRec: row.flagsRec,
      flagsFix: row.flagsFix,
      planHours: row.planHours,
      planDays: row.planDays,
      baseSum: row.baseSum,
      rate: row.rate,
      days: row.days,
      calendarDays: row.calendarDays,
      hours: row.hours,
      mask: row.mask,
      maskAdd: row.maskAdd,
      mtCount: row.mtCount,
      paySum: row.paySum,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      avgCalcType: row.avgCalcType,
      dateFromAvg: row.dateFromAvg,
      dateToAvg: row.dateToAvg,
      calculateDate: new Date(),
      linkToParentID: row.linkToParentID,
      linkToChildID: row.linkToChildID,
      orderDateFrom: row.orderDateFrom,
      orderDateTo: row.orderDateTo,
      accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
    })
  })
  accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'description']).selectById(ctx.mParams.execParams.ID)
  }
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}
