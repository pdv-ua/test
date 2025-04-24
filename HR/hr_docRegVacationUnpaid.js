const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')

me.entity.addMethod('calcVacationUnpaid')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'periodCalcID', 'employeePositionID',
      'periodCalc', 'periodSalaryID', 'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days',
      'orderDate', 'calendarDays', 'flagsRec', 'flagsFix'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  setDefaultAttribute(ctx)
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail.orderRegistryDt.insert.forEach(item => {
      item.orderDateFrom = execParams.dateFrom || instanceData.dateFrom
      item.orderDateTo = execParams.dateTo || instanceData.dateTo
      item.orderDate = execParams.orderDate || instanceData.orderDate
      item.orderNumber = execParams.orderNumber || instanceData.orderNumber
      item.orderID = execParams.ID
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  afterInsertOrUpdate(ctx)
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
  timService.cancelTimeSheet(execParams.ID)
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
  const formData = JSON.parse(ctx.mParams.formData)
  formData.detail.orderRegistryDt.insert.forEach(item => {
    item.orderDateFrom = execParams.dateFrom
    item.orderDateTo = execParams.dateTo
    item.orderDate = execParams.orderDate
    item.orderNumber = execParams.orderNumber
    item.orderID = execParams.ID
    item.periodCalcID = null
    item.periodCalc = null
    item.empOrderID = execParams.empOrderID || null
    item.empOrderDetID = execParams.empOrderDetID || null
  })
  ctx.mParams.formData = JSON.stringify(formData)
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  afterInsertOrUpdate(ctx)
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
}

function afterInsertOrUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'orderRegistryID.periodID', 'payElID', 'payElID.dictTimeCostID', 'orderID', 'dateFrom', 'dateTo', 'employeeNumberID'])
    .where('orderID', '=', execParams.ID)
    .selectAsObject({
      'orderRegistryID.periodID': 'periodID'
    })
  timService.cancelTimeSheet(execParams.ID)
  const timeSheetParams = []
  orderRegistryDt.forEach(row => {
    let date = dateService.shiftDate(row.dateFrom)
    let dateTo = dateService.shiftDate(row.dateTo)
    while (date <= dateTo) {
      timeSheetParams.push({
        orderID: execParams.ID,
        entityName: 'hr_docRegVacationUnpaid',
        employeeNumberID: row.employeeNumberID,
        periodID: row.periodID,
        dateWork: date,
        factTimeCostID: row['payElID.dictTimeCostID'],
        factHour: 0
      })
      date = dateService.nextDay(date)
    }
  })

  timService.setTimeSheet(timeSheetParams)
}

me.calcVacationUnpaid = function (ctx) {
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
      paySum: row.paySum || 0,
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
  accrualService.orderAccrualReversal({ accruals, cont: { payEl: payEls } })
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
