const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcAvgMonth')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'accrualAvg',
    entityName: 'hr_accrualAvg',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'periodID.name', 'dateFrom', 'dateTo',
      'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'
    ], ['lineNum', 'mi_modifyDate'])
  }
]

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDtID = UB.Repository('hr_orderRegistryDt').attrs(['ID']).where('orderID', '=', execParams.ID).selectScalar()
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
        flagsRec: execParams.flagsRec || previousValues.flagsRec,
        flagsFix: execParams.flagsFix || previousValues.flagsFix,
        avgCalcType: execParams.avgCalcType || previousValues.avgCalcType,
        calcSum: execParams.avgSumRst || previousValues.avgSumRst,
        baseSum: execParams.avgSumMonth || previousValues.avgSumMonth,
        avgDays: execParams.avgDays || previousValues.avgDays,
        dateFromAvg: execParams.dateFromAvg || previousValues.dateFromAvg,
        dateToAvg: execParams.dateToAvg || previousValues.dateToAvg,
        accrualDt: execParams.accrualDt || previousValues.accrualDt,
        paySum: execParams.paySum || previousValues.paySum,
        orderDateFrom: dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom),
        orderDateTo: dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom)
      }
    })
  }
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  if (instanceData.get('empOrderID') && !ctx.mParams.skipEmpOrder) {
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

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistry = UB.Repository('hr_orderRegistry').attrs(['periodID', 'periodID.dateFrom', 'periodID.dateTo']).selectById(execParams.orderRegistryID)
  orderRegistry.dateFrom = dateService.shiftDate(orderRegistry['periodID.dateFrom'])
  orderRegistry.dateTo = dateService.shiftDate(orderRegistry['periodID.dateTo'])
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
      orderDateFrom: dateService.shiftDate(execParams.dateFrom),
      orderDateTo: dateService.shiftDate(execParams.dateFrom),
      avgCalcType: execParams.avgCalcType,
      calcSum: execParams.avgSumRst,
      baseSum: execParams.avgSumMonth,
      avgDays: execParams.avgDays,
      dateFromAvg: execParams.dateFromAvg,
      dateToAvg: execParams.dateToAvg,
      accrualDt: execParams.accrualDt,
      mask: 0,
      paySum: execParams.paySum,
      empOrderID: execParams.empOrderID || null,
      empOrderDetID: execParams.empOrderDetID || null
    }
  })

  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
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
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
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

me.calcAvgMonth = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
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

  const payEls = ctx.mParams.payEls ? JSON.parse(ctx.mParams.payEls) : payElService.getPayEl({ orgID: order.organizationID })
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const accruals = []
  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

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
      periodCalc: postingPeriod.dateFrom,
      periodSalaryID: row.periodSalaryID,
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
      avgDays: row.avgDays,
      calculateDate: new Date(),
      linkToParentID: row.linkToParentID,
      linkToChildID: row.linkToChildID,
      orderDateFrom: row.orderDateFrom,
      orderDateTo: row.orderDateTo,
      accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
    })
  })
  accrualService.orderAccrualReversal({ accruals, cont: { payEl: payEls } })
  accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'description']).selectById(ctx.mParams.execParams.ID)
  }
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}
