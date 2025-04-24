const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const rlService = require('../HR/modules/rlService')
const timService = require('../HR/modules/timService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcBusinessTrip')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'paySum', 'periodCalcID', 'orderID', 'employeePositionID',
      'periodCalc', 'periodSalaryID', 'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days', 'hours',
      'orderDate', 'calendarDays', 'mask', 'flagsFix', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg',
      'calcSum', 'planSum', 'flagsRec', 'accrualDt', 'isAvg'
    ], ['lineNum'])
  },
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
  if (ctx.mParams.skipBefore) {
    return
  }
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
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
      item.calcEarnings = execParams.calcEarnings || instanceData.calcEarnings
      item.isAvg = (execParams.indAvgPlan || instanceData.indAvgPlan) === 'INDAVG'
      item.flagsRec = (execParams.indAvgPlan || instanceData.indAvgPlan) === 'INDPLAN' ? item.flagsRec | 1 << 22 : item.flagsRec & ~(1 << 22)
    })
    formData.detail.orderRegistryDt.update.forEach(item => {
      item.isAvg = (execParams.indAvgPlan || instanceData.indAvgPlan) === 'INDAVG'
      item.calcEarnings = execParams.calcEarnings || instanceData.calcEarnings
      item.flagsRec = (execParams.indAvgPlan || instanceData.indAvgPlan) === 'INDPLAN' ? item.flagsRec | 1 << 22 : item.flagsRec & ~(1 << 22)
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  afterInsertOrUpdate(ctx)
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT' && instanceData.get('orderState') !== 'CANCELED') {
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
    item.isAvg = execParams.indAvgPlan === 'INDAVG'
    item.flagsRec = execParams.indAvgPlan === 'INDPLAN' ? item.flagsRec | 1 << 22 : item.flagsRec & ~(1 << 22)
    item.empOrderID = execParams.empOrderID || null
    item.empOrderDetID = execParams.empOrderDetID || null
    item.calcEarnings = execParams.calcEarnings
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

function setDefaultAttribute (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  const execParams = ctx.mParams.execParams
  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }

  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

function afterInsertOrUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (!execParams.empOrderID && !instanceData.empOrderID) {
    setTimeSheet(ctx, instanceData)
  }
}

function setTimeSheet (ctx, instanceData) {
  const execParams = ctx.mParams.execParams
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'orderRegistryID.periodID', 'payElID', 'payElID.dictTimeCostID', 'payElID.dictTimeCostAvgID',
      'payElID.dictTimeCostWorkID', 'orderID', 'dateFrom', 'dateTo', 'employeeNumberID', 'isAvg',
      'employeeNumberID.employeeID', 'employeeNumberID.orgID', 'payElID.includeSecondJobs'])
    .where('orderID', '=', execParams.ID)
    .selectAsObject({
      'orderRegistryID.periodID': 'periodID'
    })
  timService.cancelTimeSheet(execParams.ID)
  const orderEmployeePosition = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
    .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
    .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
    .where('employeeNumberID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
    .selectAsObject()
  orderEmployeePosition.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  let addEmployeePosition = []
  const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['ID', 'orgID', 'mainEmpNumberID']).selectById(execParams.employeeNumberID || instanceData.employeeNumberID)
  if (employeeNumber.mainEmpNumberID) {
    addEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
      .where('employeeNumberID', '=', employeeNumber.mainEmpNumberID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
      .selectAsObject()
  } else {
    addEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
      .where('organizationID', '=', employeeNumber.orgID)
      .where('employeeNumberID.mainEmpNumberID', '=', employeeNumber.ID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
      .selectAsObject()
  }
  addEmployeePosition.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const timeSheetParams = []
  orderRegistryDt.forEach(rowDt => {
    const employeeNumbers = [{
      employeeNumberID: rowDt.employeeNumberID,
      dateFrom: rowDt.dateFrom,
      dateTo: rowDt.dateTo
    }]
    if (rowDt['payElID.includeSecondJobs']) {
      const secJobs = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .where('employeeID', '=', rowDt['employeeNumberID.employeeID'])
        .where('employeeNumberID', '!=', rowDt.employeeNumberID)
        .where('organizationID', '=', rowDt['employeeNumberID.orgID'])
        .where('workPlace', '=', '2')
        .where('dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
        .where('dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
        .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
        .selectAsObject()
      secJobs.forEach(row => {
        employeeNumbers.push({
          employeeNumberID: row.employeeNumberID,
          dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['employeeNumberID.dateFrom']))),
          dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['employeeNumberID.dateTo'])))
        })
      })
    }
    const timeSheet = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'planID', 'planTimeCostID', 'planHour', 'planHourNight', 'planHourEvening', 'orderID',
        'isSchedule', 'isCorrection', 'isActive', 'factHour', 'factHourNight', 'factHourEvening', 'factTimeCostID',
        'dateWork'])
      .where('employeeNumberID', '=', rowDt.employeeNumberID)
      .where('dateWork', '>=', rowDt.dateFrom)
      .where('dateWork', '<=', rowDt.dateTo)
      .where('isActive', '=', 1)
      .selectAsObject()
    employeeNumbers.forEach(row => {
      let date = dateService.shiftDate(row.dateFrom)
      let dateTo = dateService.shiftDate(row.dateTo)
      while (date <= dateTo) {
        const timeSheetDay = timeSheet.find(o => (dateService.shiftDate(o.dateWork)).getTime() === date.getTime())
        let factTimeCostID = rowDt.isAvg ? rowDt['payElID.dictTimeCostAvgID'] : rowDt['payElID.dictTimeCostWorkID']
        if (factTimeCostID) {
          timeSheetParams.push({
            orderID: execParams.ID,
            entityName: 'hr_docRegBusinessTrip',
            employeeNumberID: row.employeeNumberID,
            periodID: rowDt.periodID,
            dateWork: date,
            factTimeCostID,
            factHour: rowDt.isAvg ? 0 : timeSheetDay ? timeSheetDay.planHour || 0 : 0
          })
        }
        if (factTimeCostID && addEmployeePosition.length) {
          const mainPos = orderEmployeePosition.find(o => o.employeeNumberID === row.employeeNumberID && o.dateFrom <= date && o.dateTo >= date)
          if (mainPos) {
            const addNumber = []
            addEmployeePosition.filter(o => (!employeeNumber.mainEmpNumberID || o.dictPositionID === mainPos.dictPositionID) && o.dateFrom <= date && o.dateTo >= date).forEach(addPos => {
              if (!addNumber.find(o => o === addPos.employeeNumberID)) {
                timeSheetParams.push({
                  orderID: execParams.ID,
                  entityName: 'hr_docRegBusinessTrip',
                  employeeNumberID: addPos.employeeNumberID,
                  periodID: rowDt.periodID,
                  dateWork: date,
                  factTimeCostID,
                  factHour: rowDt.isAvg ? 0 : timeSheetDay ? timeSheetDay.planHour || 0 : 0
                })
                addNumber.push(addPos.employeeNumberID)
              }
            })
          }
        }
        date = dateService.nextDay(date)
      }
    })
  })
  timService.setTimeSheet(timeSheetParams)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.calcBusinessTrip = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
}

me.doPosting = function (ctx) {
  let instanceData = ctx.dataStore.getAsJsObject()[0]
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(ctx.mParams.execParams.ID)
  }
  if (ctx.mParams.execParams.empOrderID || instanceData.empOrderID) {
    setTimeSheet(ctx, instanceData)
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
    let periodCalc = postingPeriod
    if (payEls[row.payElID].accrueFuturePeriod === 'FUTURE' && dateService.shiftDate(row.periodSalary) > currentPeriod.dateFrom) {
      periodCalc = periodService.getPeriod(row.periodSalaryID)
    }

    if (row.periodCalcID !== periodCalc.ID) {
      storeDt.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          periodCalcID: periodCalc.ID,
          periodCalc: periodCalc.dateFrom
        }
      })
    }
    accruals.push({
      orgID: order.organizationID,
      orderID: row.orderID,
      empOrderID: ctx.mParams.execParams.empOrderID || instanceData.empOrderID,
      timeSheetID: orderRegistryService.getTimeSheetChangeByOrder(ctx.mParams.execParams.empOrderID || instanceData.empOrderID, row.employeeNumberID),
      orderDtID: row.ID,
      periodCalcID: periodCalc.ID,
      periodSalaryID: row.periodSalaryID,
      periodCalc: periodCalc.dateFrom,
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
      sumAvg: row.calcSum,
      planSumAvg: row.planSum,
      isAvg: row.isAvg,
      calculateDate: new Date(),
      linkToParentID: row.linkToParentID,
      linkToChildID: row.linkToChildID,
      orderDateFrom: row.orderDateFrom,
      orderDateTo: row.orderDateTo,
      calcEarnings: row.calcEarnings,
      accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
    })
  })
  if (!payEls[instanceData.payElID].calcByDayEarnPermAcc || instanceData.indAvgPlan !== 'INDPLAN') {
    accrualService.orderAccrualReversal({ accruals, cont: { payEl: payEls } })
    accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, instanceData.description) })
  }
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = ctx.dataStore.getAsJsObject()[0]
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'description', 'empOrderID']).selectById(ctx.mParams.execParams.ID)
  }
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
  if (ctx.mParams.execParams.empOrderID || instanceData.empOrderID) {
    timService.cancelTimeSheet(ctx.mParams.execParams.ID)
  }
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}
