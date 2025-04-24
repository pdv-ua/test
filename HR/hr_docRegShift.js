const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const tarifficationService = require('../HR/modules/tarifficationService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcShift')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute(['employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber', 'orderDate',
      'paySum', 'periodCalcID', 'employeePositionID', 'periodCalc', 'periodSalaryID', 'periodSalary',
      'dateFrom', 'dateTo', 'mask', 'flagsFix', 'flagsRec', 'accrualDt', 'payElID.description',
      'dictFundSourceID', 'dictFundSourceID.name',
      'dictProgClassID', 'dictProgClassID.description',
      'days', 'baseSum', 'planDays', 'planHours', 'hours', 'rate', 'paySum'
    ], ['lineNum'])
  }
]

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom'])
    .selectById(execParams.orderRegistryID)

  const formData = JSON.parse(ctx.mParams.formData)
  formData.detail.orderRegistryDt.insert.forEach(item => {
    item.orderRegistryID = execParams.orderRegistryID
    item.orderDate = execParams.orderDate
    item.orderNumber = execParams.orderNumber
    item.orderID = execParams.ID
    item.empOrderID = execParams.empOrderID || null
    item.empOrderDetID = execParams.empOrderDetID || null
    item.periodCalcID = orderRegistry.periodID
    item.periodSalaryID = orderRegistry.periodID
    item.periodCalc = orderRegistry['periodID.dateFrom']
    item.periodSalary = orderRegistry['periodID.dateFrom']
    item.employeeNumberID = execParams.employeeNumberID
    item.employeePositionID = execParams.employeePositionID
    item.mask = item.mask || 0
  })
  ctx.mParams.formData = JSON.stringify(formData)

  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  setDefaultAttribute(ctx)
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    const orderRegistry = UB.Repository('hr_orderRegistry')
      .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom'])
      .selectById(execParams.orderRegistryID || instanceData.orderRegistryID)
    formData.detail.orderRegistryDt.insert.forEach(item => {
      item.orderRegistryID = execParams.orderRegistryID || instanceData.orderRegistryID
      item.orderDate = execParams.orderDate || instanceData.orderDate
      item.orderNumber = execParams.orderNumber || instanceData.orderNumber
      item.orderID = execParams.ID
      item.empOrderID = execParams.empOrderID || instanceData.empOrderID
      item.empOrderDetID = execParams.empOrderDetID || instanceData.empOrderDetID
      item.periodCalcID = orderRegistry.periodID
      item.periodSalaryID = orderRegistry.periodID
      item.periodCalc = orderRegistry['periodID.dateFrom']
      item.periodSalary = orderRegistry['periodID.dateFrom']
      item.employeeNumberID = execParams.employeeNumberID || instanceData.employeeNumberID
      item.employeePositionID = execParams.employeePositionID || instanceData.employeePositionID
      item.mask = item.mask || 0
    })
    ctx.mParams.formData = JSON.stringify(formData)
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
  execParams.orderID = execParams.orderRegistryID || instanceData.orderRegistryID
}

me.calcShift = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  mParams.resultData = JSON.stringify(tarifficationService.calculateShift(params))
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

  validate(instanceData.ID, order.organizationID)

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
      empOrderID: ctx.mParams.execParams.empOrderID || instanceData.empOrderID,
      timeSheetID: orderRegistryService.getTimeSheetChangeByOrder(ctx.mParams.execParams.empOrderID || instanceData.empOrderID, row.employeeNumberID),
      orderID: row.orderID,
      orderDtID: row.ID,
      periodCalcID: postingPeriod.ID,
      periodSalaryID: row.periodSalaryID,
      periodCalc: postingPeriod.dateFrom,
      periodSalary: row.periodSalary,
      employeeNumberID: row.employeeNumberID,
      payElID: row.payElID,
      flagsRec: 2 | (row.flagsRec & 1 << 5),
      flagsFix: row.flagsFix,
      planHours: row.planHours,
      planDays: row.planDays,
      baseSum: row.baseSum,
      rate: row.rate,
      days: row.days,
      calendarDays: row.calendarDays,
      hours: row.hours,
      mask: 0, // row.mask,
      maskAdd: 0, // row.maskAdd,
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

function validate (docID, orgID) {
  const result = UB.Repository('hr_orderRegistryDt')
    .attrs(['payElID.description', 'employeeNumberID.description'])
    .where('orderID', '=', docID)
    .where('dictFundSourceID', 'isNull')
    .selectSingle({ 'payElID.description': 'payElDescription', 'employeeNumberID.description': 'empNumDescription' })
  if (result) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}: не визначено джерело фінансування для {1}.', result.empNumDescription, result.payElDescription)}>>>`)
  }
  if (settingsService.getByCode('hrProgClassAcc', orgID)) {
    const result = UB.Repository('hr_orderRegistryDt')
      .attrs(['payElID.description', 'employeeNumberID.description'])
      .where('orderID', '=', docID)
      .where('dictProgClassID', 'isNull')
      .selectSingle({ 'payElID.description': 'payElDescription', 'employeeNumberID.description': 'empNumDescription' })
    if (result) {
      throw new UB.UBAbort(`<<<${UB.i18n(`{0}: не визначено КПК для {1}.`, result.empNumDescription, result.payElDescription)}>>>`)
    }
  }
}
