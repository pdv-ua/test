const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcEasyWork')
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
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  setDefaultAttribute(ctx)
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
        dateFrom: execParams.dateFrom || previousValues.dateFrom,
        dateTo: execParams.dateTo || previousValues.dateTo,
        orderDateFrom: execParams.dateFrom || previousValues.dateFrom,
        orderDateTo: execParams.dateTo || previousValues.dateTo,
        flagsRec: execParams.flagsRec || previousValues.flagsRec,
        flagsFix: execParams.flagsFix || previousValues.flagsFix,
        avgCalcType: execParams.avgCalcType || previousValues.avgCalcType,
        baseSum: execParams.avgSumMonth || previousValues.avgSum,
        dateFromAvg: execParams.dateFromAvg || previousValues.dateFromAvg,
        dateToAvg: execParams.dateToAvg || previousValues.dateToAvg,
        accrualDt: execParams.accrualDt || previousValues.accrualDt
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
      dateFrom: execParams.dateFrom,
      dateTo: execParams.dateTo,
      flagsRec: execParams.flagsRec,
      flagsFix: execParams.flagsFix,
      orderDateFrom: execParams.dateFrom,
      orderDateTo: execParams.dateTo,
      avgCalcType: execParams.avgCalcType,
      baseSum: execParams.avgSum,
      dateFromAvg: execParams.dateFromAvg,
      dateToAvg: execParams.dateToAvg,
      accrualDt: execParams.accrualDt,
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
}

me.calcEasyWork = function (ctx) {
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

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

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
    const employee = UB.Repository('hr_employeePositionS').attrs('*').selectById(row.employeePositionID)
    const accrual = UB.Repository('hr_employeeAccrual').attrs(['ID'])
      .where('orderID', '=', row.ID)
      .selectSingle()
    if (accrual) {
      empAccrualStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: accrual.ID,
          employeeID: employee.employeeID,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          accrualSum: row.baseSum,
          orderID: row.orderID,
          orderNumber: row.orderNumber,
          orderDate: row.orderDate,
          changeOrderID: null
        }
      })
    } else {
      empAccrualStore.run('insert', {
        execParams: {
          employeeID: employee.employeeID,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          accrualSum: row.baseSum,
          orderID: row.orderID,
          orderNumber: row.orderNumber,
          orderDate: row.orderDate,
          changeOrderID: null
        }
      })
    }
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'description']).selectById(ctx.mParams.execParams.ID)
  }
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  const empAccrualStore = UB.DataStore('hr_employeeAccrual')
  const empAccruals = UB.Repository('hr_employeeAccrual').attrs(['ID'])
    .where('orderID', '=', instanceData.ID)
    .selectAsObject()
  empAccruals.forEach(row => {
    empAccrualStore.run('delete', { execParams: { ID: row.ID } })
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}
