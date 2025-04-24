const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')
const accrualService = require('../HR/modules/accrualService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcAvgPay')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'accrualAvg',
    entityName: 'hr_accrualAvg',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'periodID.name', 'dateFrom', 'dateTo',
      'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'
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
  setDefaultAttribute(ctx)
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
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  afterInsertOrUpdate(ctx)
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterInsertOrUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0]
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(execParams.ID)
  }
  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID'])
    .where('orderID', '=', execParams.ID).selectSingle()

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(execParams.orderRegistryID || instanceData.orderRegistryID)

  const store = UB.DataStore('hr_orderRegistryDt')

  const orderRegistryDt = {
    orderRegistryID: execParams.orderRegistryID || instanceData.orderRegistryID,
    employeePositionID: execParams.employeePositionID || instanceData.employeePositionID,
    employeeNumberID: execParams.employeeNumberID || instanceData.employeeNumberID,
    periodSalaryID: order.periodID,
    periodSalary: order['periodID.dateFrom'],
    baseSum: execParams.avgSum || instanceData.avgSum,
    payElID: execParams.payElID || instanceData.payElID,
    avgCalcType: execParams.avgCalcType || instanceData.avgCalcType,
    dateFromAvg: execParams.dateFromAvg || instanceData.dateFromAvg,
    dateToAvg: execParams.dateToAvg || instanceData.dateToAvg,
    flagsFix: execParams.flagsFix || instanceData.flagsFix,
    flagsRec: execParams.flagsRec || instanceData.flagsRec,
    dateFrom: execParams.dateFrom || instanceData.dateFrom,
    dateTo: execParams.dateTo || instanceData.dateTo,
    orderDateFrom: execParams.dateFrom || instanceData.dateFrom,
    orderDateTo: execParams.dateTo || instanceData.dateTo,
    orderDate: execParams.orderDate || instanceData.orderDate,
    orderNumber: execParams.orderNumber || instanceData.orderNumber,
    orderID: execParams.ID,
    empOrderID: execParams.empOrderID || instanceData.empOrderID || null,
    empOrderDetID: execParams.empOrderDetID || instanceData.empOrderDetID || null,
    calcProportion: execParams.calcProportion || instanceData.calcProportion || 'DAY',
    calcEarnings: execParams.calcEarnings || instanceData.calcEarnings
  }
  if (detail) {
    orderRegistryDt.ID = detail.ID
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: orderRegistryDt
    })
  } else {
    orderRegistryDt.ID = store.generateID()
    store.run('insert', {
      __skipOptimisticLock: true,
      execParams: orderRegistryDt
    })
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  afterInsertOrUpdate(ctx)
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

me.calcAvgPay = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
}

me.doPosting = function (ctx) {
  let instanceData = ctx.dataStore.getAsJsObject()[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(ctx.mParams.execParams.ID)
  }
  const existAccruals = instanceData.empOrderID ? UB.Repository('hr_employeeAccrual')
    .attrs('ID')
    .where('orderID', '=', instanceData.empOrderID)
    .where('employeeNumberID', '=', instanceData.employeeNumberID)
    .selectAsObject() : []

  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'employeeNumberID.employeeID', 'dictFundSourceID', 'periodCalcID', 'dateFrom', 'dateTo', 'baseSum'])
    .where('orderID', '=', instanceData.ID)
    .selectAsObject()
  const accrualParams = {}

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

  accrualParams.accrualAvg = UB.Repository('hr_accrualAvg')
    .attrs(['ID', 'accrualID', 'periodID', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'])
    .where('orderID', '=', instanceData.ID)
    .selectAsObject()
  accrualParams.params = UB.Repository('hr_docRegAvgLongPay')
    .attrs(['flagsFix', 'avgSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcEarnings']).selectById(instanceData.ID)
  const empAccrualStore = UB.DataStore('hr_employeeAccrual')
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
    if (!existAccruals.length) {
      empAccrualStore.run('insert', {
        execParams: {
          employeeID: row['employeeNumberID.employeeID'],
          employeeNumberID: instanceData.employeeNumberID,
          payElID: instanceData.payElID,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo || dateService.maxDate(),
          accrualSum: row.baseSum,
          orderID: instanceData.orderRegistryID,
          orderNumber: instanceData.orderNumber,
          orderDate: instanceData.orderDate,
          dictFundSourceID: row.dictFundSourceID,
          accrualParams: JSON.stringify(accrualParams),
          changeOrderID: null
        }
      })
    }
  })
  existAccruals.forEach(acc => {
    empAccrualStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: acc.ID,
        accrualSum: instanceData.avgSum,
        dictFundSourceID: instanceData.dictFundSourceID,
        accrualParams: JSON.stringify(accrualParams)
      }
    })
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  let instanceData = ctx.dataStore.getAsJsObject()[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'empOrderID', 'employeeNumberID', 'description']).selectById(execParams.ID)
  }
  const storeDt = UB.DataStore('hr_orderRegistryDt')
  const storeAcc = UB.DataStore('hr_employeeAccrual')

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)

  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'employeeNumberID', 'periodCalcID.isClosed', 'periodCalcID', 'periodSalaryID'])
    .where('orderID', '=', instanceData.ID).selectAsObject()
  detail.forEach(row => {
    storeDt.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        periodCalcID: null,
        periodCalc: null
      }
    })
    if (row['periodCalcID.isClosed']) {
      accrualService.setRecalculatePeriod({
        orgID: order.organizationID,
        employeeNumberID: row.employeeNumberID,
        periodSalaryID: row.periodCalcID,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Наказ на оплату за середнім')} ${instanceData.description}`
      })
    }
    const pAccuals = UB.Repository('hr_employeeAccrual')
      .attrs(['ID'])
      .where('orderID', '=', instanceData.orderRegistryID)
      .where('employeeNumberID', '=', row.employeeNumberID)
      .selectAsObject()
    pAccuals.forEach(row => {
      storeAcc.run('delete', {
        skipEmpOrder: true,
        forcedDelete: true,
        execParams: {
          ID: row.ID
        }
      })
    })
  })
  const existAccruals = instanceData.empOrderID ? UB.Repository('hr_employeeAccrual')
    .attrs('ID')
    .where('orderID', '=', instanceData.empOrderID)
    .where('employeeNumberID', '=', instanceData.employeeNumberID)
    .selectAsObject() : []
  existAccruals.forEach(acc => {
    storeAcc.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: acc.ID,
        accrualSum: 0,
        dictFundSourceID: null,
        accrualParams: null
      }
    })
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
}
