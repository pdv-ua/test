const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')
const postingService = require('../HR/modules/postingService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('calc')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('checkBeforePosting')

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.orderState = 'PROJECT'
  const periodSalary = periodService.getPeriod(execParams.periodSalaryID)
  execParams.description = `${UB.i18n('Погодинна оплата')} ${periodSalary.name}`
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistry = UB.Repository('hr_orderRegistry').attrs(['periodID', 'periodID.dateFrom', 'periodID.dateTo']).selectById(execParams.orderRegistryID)
  orderRegistry.dateFrom = dateService.shiftDate(orderRegistry['periodID.dateFrom'])
  orderRegistry.dateTo = dateService.shiftDate(orderRegistry['periodID.dateTo'])
  const periodSalary = periodService.getPeriod(execParams.periodSalaryID)
  let dateFrom = dateService.shiftDate(execParams.dateFrom)
  if (periodSalary.dateFrom > dateFrom) {
    dateFrom = periodSalary.dateFrom
  } else if (dateFrom > periodSalary.dateTo) {
    dateFrom = periodSalary.dateTo
  }

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
      periodSalaryID: periodSalary.ID,
      periodSalary: periodSalary.dateFrom,
      dateFrom: dateFrom,
      dateTo: dateFrom,
      flagsRec: execParams.flagsRec || 2,
      flagsFix: execParams.flagsFix || 0,
      mask: 0,
      baseSum: execParams.baseSum,
      paySum: execParams.paySum,
      hours: execParams.hours,
      accrualDt: execParams.accrualDt,
      empOrderID: execParams.empOrderID || null,
      empOrderDetID: execParams.empOrderDetID || null
    }
  })
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
}

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDtID = UB.Repository('hr_orderRegistryDt').attrs(['ID']).where('orderID', '=', execParams.ID).selectScalar()
  const orderRegistry = UB.Repository('hr_orderRegistry').attrs(['periodID', 'periodID.dateFrom', 'periodID.dateTo'])
    .selectById(execParams.orderRegistryID || previousValues.orderRegistryID)
  const periodSalary = periodService.getPeriod(execParams.periodSalaryID || previousValues.periodSalaryID)
  orderRegistry.dateFrom = dateService.shiftDate(orderRegistry['periodID.dateFrom'])
  orderRegistry.dateTo = dateService.shiftDate(orderRegistry['periodID.dateTo'])
  let dateFrom = dateService.shiftDate(execParams.dateFrom || previousValues.orderDate)
  if (periodSalary.dateFrom > dateFrom) {
    dateFrom = periodSalary.dateFrom
  } else if (dateFrom > periodSalary.dateTo) {
    dateFrom = periodSalary.dateTo
  }
  execParams.description = `${UB.i18n('Погодинна оплата')} ${periodSalary.name}`
  if (orderRegistryDtID) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: orderRegistryDtID,
        employeePositionID: execParams.employeePositionID || previousValues.employeePositionID,
        employeeNumberID: execParams.employeeNumberID || previousValues.employeeNumberID,
        payElID: execParams.payElID || previousValues.payElID,
        orderDate: dateService.shiftDate(execParams.orderDate || previousValues.orderDate),
        orderNumber: execParams.orderNumber || previousValues.orderNumber,
        flagsRec: execParams.flagsRec || previousValues.flagsRec || 2,
        flagsFix: execParams.flagsFix || previousValues.flagsFix || 0,
        periodSalaryID: periodSalary.ID,
        periodSalary: periodSalary.dateFrom,
        paySum: execParams.paySum || previousValues.paySum,
        baseSum: execParams.baseSum || previousValues.baseSum,
        hours: execParams.hours || previousValues.hours,
        accrualDt: execParams.accrualDt || previousValues.accrualDt,
        dateFrom: dateFrom,
        dateTo: dateFrom
      }
    })
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

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  if (instanceData.get('empOrderID') && !ctx.mParams.forcedDelete) {
    const orderState = UB.Repository('hr_order')
      .attrs('orderState')
      .where('ID', '=', instanceData.get('empOrderID'))
      .selectScalar()
    if (orderState === 'PROCESSED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - сформовано з наказу по персоналу. Видалення неможливе.', instanceData.get('description'))}>>>`)
    }
  }
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'mi_modifyDate', 'employeeNumberID.limitedAccess'])
    .where('orderID', '=', execParams.ID)
    .misc({ __skipRls: true })
    .selectAsObject()
  orderRegistryDt.forEach(record => {
    if (!instanceData.get('empOrderID') && record['employeeNumberID.limitedAccess'] && !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
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

me.calc = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const cont = { }
  const orgID = params.orgID
  rlService.loadCalcData({ cont, orgID, periodID: params.periodSalaryID, employeeNumbers: [params.employeeNumberID], loadData: { prop: true } })
  cont.employeeNumberID = params.employeeNumberID
  const paySum = accrualService.roundPayEl((params.baseSum || 0) * (params.hours || 0), cont.payEl[params.payElID].roundUpTo)
  mParams.resultData = JSON.stringify({
    paySum,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr: {},
      params: {
        dateFrom: params.dateFrom,
        payElID: params.payElID,
        dictFundSourceID: params.dictFundSourceID,
        dictProgClassID: params.dictProgClassID,
        paySum
      }
    })
  })
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
      empOrderID: ctx.mParams.execParams.empOrderID || instanceData.empOrderID,
      timeSheetID: orderRegistryService.getTimeSheetChangeByOrder(ctx.mParams.execParams.empOrderID || instanceData.empOrderID, row.employeeNumberID),
      orderDtID: row.ID,
      periodCalcID: postingPeriod.ID,
      periodSalaryID: row.periodSalaryID,
      periodCalc: postingPeriod.dateFrom,
      periodSalary: row.periodSalary,
      employeeNumberID: row.employeeNumberID,
      payElID: row.payElID,
      flagsRec: row.flagsRec,
      flagsFix: row.flagsFix | 755, // 0 1 4 5 6 7 9
      planHours: row.hours * row.hours,
      planDays: 0,
      baseSum: row.baseSum,
      rate: 100,
      days: 0,
      hours: row.hours,
      mask: 0,
      maskAdd: 0,
      mtCount: row.mtCount,
      paySum: row.paySum,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      calculateDate: new Date(),
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

me.checkBeforePosting = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const resultData = []
  const errorMessages = []
  const docRegHourPay = UB.Repository('hr_docRegHourPay')
    .attrs(['ID', 'employeePositionID', 'employeePositionID.description', 'employeePositionID.planHours', 'hours'])
    .whereIf(params.IDs, 'ID', 'in', params.IDs)
    .whereIf(params.orderRegistryID, 'orderRegistryID', '=', params.orderRegistryID)
    .where('orderState', '=', 'PROJECT')
    .selectAsObject()
  docRegHourPay.forEach(row => {
    if (row['employeePositionID.planHours'] && row.hours && row.employeePositionID) {
      const hourWork = UB.Repository('hr_docRegHourPay')
        .attrs(['sum([hours])'])
        .where('employeePositionID', '=', row.employeePositionID)
        .where('orderState', '=', 'POSTED')
        .where('ID', '!=', row.ID)
        .selectScalar() || 0
      if ((hourWork + row.hours) <= row['employeePositionID.planHours']) {
        resultData.push(row.ID)
      } else {
        const msg = UB.i18n('Працівник {0} відпрацював більше годин, ніж дозволено', row['employeePositionID.description'])
        if (!errorMessages.includes(msg)) errorMessages.push(msg)
      }
    }
  })
  mParams.resultData = JSON.stringify({ postingDocRegIDs: resultData, errorMessages })
}
