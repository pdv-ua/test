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
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcBountyHelp')
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
  const periodSalary = UB.Repository('hr_dictPeriod').attrs(['ID', 'dateFrom', 'dateTo']).selectById(execParams.periodSalaryID || previousValues.periodSalaryID)
  periodSalary.dateFrom = dateService.shiftDate(periodSalary.dateFrom)
  periodSalary.dateTo = dateService.shiftDate(periodSalary.dateTo)
  const orderRegistryDtID = UB.Repository('hr_orderRegistryDt').attrs(['ID']).where('orderID', '=', execParams.ID).selectScalar()
  if (orderRegistryDtID) {
    let dateFrom = dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom)
    if (periodSalary.dateFrom > dateFrom) {
      dateFrom = periodSalary.dateFrom
    } else if (dateFrom > periodSalary.dateTo) {
      dateFrom = periodSalary.dateTo
    }
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: orderRegistryDtID,
        periodSalaryID: periodSalary.ID,
        periodSalary: periodSalary.dateFrom,
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
        dateFrom: dateFrom,
        dateTo: dateFrom,
        dateFromAvg: execParams.dateFromAvg || previousValues.dateFromAvg,
        dateToAvg: execParams.dateToAvg || previousValues.dateToAvg,
        accrualDt: execParams.accrualDt || previousValues.accrualDt,
        paySum: execParams.paySum || previousValues.paySum,
        countMonth: execParams.countMonth || previousValues.countMonth,
        rate: execParams.rate || previousValues.rate,
        empOrderID: execParams.empOrderID || previousValues.empOrderID,
        empOrderDetID: execParams.empOrderDetID || previousValues.empOrderDetID,
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
  const periodSalary = UB.Repository('hr_dictPeriod').attrs(['ID', 'dateFrom', 'dateTo']).selectById(execParams.periodSalaryID)
  periodSalary.dateFrom = dateService.shiftDate(periodSalary.dateFrom)
  periodSalary.dateTo = dateService.shiftDate(periodSalary.dateTo)
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
      countMonth: execParams.countMonth,
      rate: execParams.rate,
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

me.calcBountyHelp = function (ctx) {
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

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)

  const methodCode = UB.Repository(__entityName)
    .attrs('payElID.methodID.code')
    .where('ID', '=', ctx.mParams.execParams.ID)
    .selectScalar()

  const storeDt = UB.DataStore('hr_orderRegistryDt')
  const store = UB.DataStore(__entityName)

  const setBountyHelpVacationPeriod = settingsService.getByCode('setBountyHelpVacationPeriod', order.organizationID)
  if (methodCode === '37') {
    if (!(instanceData.flagsFix & 1 << 12) && (!setBountyHelpVacationPeriod)) {
      if (instanceData.periodSalaryID !== currentPeriod.ID) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: instanceData.ID,
            periodSalaryID: currentPeriod.ID
          }
        })
        const orderDet = UB.Repository('hr_orderRegistryDt')
          .attrs(['ID'])
          .where('orderID', '=', instanceData.ID).selectAsObject()
        orderDet.forEach(det => {
          storeDt.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: det.ID,
              periodCalcID: currentPeriod.ID,
              periodCalc: currentPeriod.dateFrom
            }
          })
        })
        instanceData.periodSalaryID = currentPeriod.ID
      }
    }
  }
  if (instanceData.flagsFix & 1 << 12) {
    instanceData.flagsFix = (instanceData.flagsFix || 0) & ~(1 << 12)
  }

  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name'])
    .where('orderID', '=', instanceData.ID).selectAsObject()

  const payEls = ctx.mParams.payEls ? JSON.parse(ctx.mParams.payEls) : payElService.getPayEl({ orgID: order.organizationID, getAll: false })
  const periodSalary = periodService.getPeriod(instanceData.periodSalaryID)

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
    const payEl = UB.Repository('hr_payEl')
      .attrs(['ID', 'methodID.code', 'notLimitPayments'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(row.payElID)
    if (!payEl['notLimitPayments'] || payEl['methodID.code'] !== '36') {
      const pYear = dateService.shiftDate(periodSalary.dateFrom)
      const bountyHelp = UB.Repository('hr_accrual')
        .attrs(['payElID.name', 'paySum', 'periodCalcID.name'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orgID', '=', order.organizationID)
        .where('payElID', '=', row.payElID)
        .where('periodSalary', '>=', dateService.firstDayOfYear(pYear))
        .where('periodSalary', '<=', dateService.lastDayOfYear(pYear))
        .where('flagsRecSum', '!=', 8192)
        .where('flagsRecReversal', '!=', 512)
        .where('orderID', '!=', instanceData.ID)
        .notExists(UB.Repository('hr_accrual')
          .correlation('linkToParentID', 'ID')
          .where('employeeNumberID', '=', row.employeeNumberID)
          .where('orgID', '=', order.organizationID)
          .where('payElID', '=', row.payElID)
          .where('flagsRecReversal', '=', 512)
          .where('flagsRecSum', '!=', 8192))
        .selectSingle()
      if (bountyHelp) {
        const employee = UB.Repository('hr_employeeNumberS')
          .attrs('description')
          .selectById(row.employeeNumberID)
        throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} {1} у сумі {2} вже була нарахована у {3}!', employee['description'], bountyHelp['payElID.name'], bountyHelp['paySum'], bountyHelp['periodCalcID.name'])}>>>`)
      }
    }

    if (instanceData.empOrderID && instanceData.valuation === 'PLAN') {
      row.flagsFix = (row.flagsFix || 0) | 1 << 9
    }
    if (instanceData.empOrderID && instanceData.valuation === 'SUM') {
      row.flagsFix = (row.flagsFix || 0) | 1 << 1
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
      flagsFix: row.flagsFix,
      planHours: row.planHours,
      planDays: row.planDays,
      baseSum: row.baseSum,
      rate: row.rate,
      days: row.days,
      calendarDays: row.calendarDays,
      hours: row.hours,
      mask: 0,
      maskAdd: 0,
      koef: instanceData.countMonth,
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
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}
