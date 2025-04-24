const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const stringService = require('../AC/modules/dataServices/stringService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('addIntComb')
me.entity.addMethod('calcCompensation')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'paySum', 'periodCalcID', 'employeePositionID',
      'periodCalc', 'periodSalaryID', 'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days',
      'orderDate', 'mask', 'flagsFix', 'baseSum', 'orderDateFrom', 'orderDateTo',
      'avgCalcType', 'dateFromAvg', 'dateToAvg', 'flagsRec', 'accrualDt'
    ], ['lineNum'])
  },
  {
    detailName: 'accrualAvg',
    entityName: 'hr_accrualAvg',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'periodID.name', 'dateFrom', 'dateTo',
      'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'
    ], ['lineNum', 'mi_modifyDate'])
  },
  {
    detailName: 'vacationDt',
    entityName: 'hr_docRegVacationCompensDt',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'empVacationPeriodID', 'empVacationPeriodID.descriptionEx',
      'empVacationPeriodID.empVacationPlanID.dictVacationKindID', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID.name',
      'dayDiff', 'dayComp', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'empOrderID'
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
  const vacDtStore = UB.DataStore('hr_docRegVacationCompensDt')
  UB.Repository('hr_docRegVacationCompensDt')
    .attrs('ID')
    .where('orderID', '=', execParams.ID)
    .selectAsObject().forEach(row => {
      vacDtStore.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID
        }
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

me.calcCompensation = function (ctx) {
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
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed',
      'organizationID', 'orderState', 'orderNumber', 'orderDate'])
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
      flagsFix: row.flagsFix,
      planHours: row.planHours,
      planDays: row.planDays,
      baseSum: row.baseSum,
      rate: row.rate,
      days: row.days,
      calendarDays: row.calendarDays,
      hours: row.hours,
      mask: 0,
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
      accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
      calcParams: JSON.stringify({ compensationPeriod: instanceData.compensationPeriod })
    })
  })
  accrualService.orderAccrualReversal({ accruals, cont: { payEl: payEls } })
  accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')

  const doc = UB.Repository('hr_docRegVacationCompensation')
    .attrs(['ID', 'payElID.methodID.code', 'employeeNumberID', 'dateFrom', 'payElRollID', 'orderDate',
      'orderNumber', 'contractorID', 'contrAccountID'])
    .selectById(instanceData.ID)

  if (doc['payElID.methodID.code'] === '71' && doc.payElRollID) {
    UB.DataStore('hr_payRetention').run('insert', {
      execParams: {
        employeeNumberID: doc.employeeNumberID,
        dateFrom: dateService.shiftDate(doc.dateFrom),
        dateTo: dateService.maxDate(),
        payElID: doc.payElRollID,
        paymentMethod: '1',
        docDate: doc.orderDate,
        docNumber: doc.orderNumber,
        orderID: doc.ID,
        contractorID: doc.contractorID || null,
        contrAccountID: doc.contrAccountID || null
      }
    })
  }
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['ID', 'orderRegistryID', 'description']).selectById(ctx.mParams.execParams.ID)
  }
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  const payRetentionStore = UB.DataStore('hr_payRetention')
  const payRetentions = UB.Repository('hr_payRetention').attrs('ID').where('orderID', '=', instanceData.ID).selectAsObject()
  payRetentions.forEach(row => {
    payRetentionStore.run('delete', { execParams: { ID: row.ID } })
  })
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}

me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const docRegStore = UB.DataStore('hr_docRegVacationCompensation')
  // const vacDtStore = UB.DataStore('hr_docRegVacationDt')

  const employeeID = mParams.employeeID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dayCount = mParams.dayCount
  const payElID = mParams.payElID
  const orderRegistryID = mParams.orderRegistryID
  const orderNumber = mParams.orderNumber
  const orderDate = dateService.shiftDate(mParams.orderDate)

  const result = {
    errors: [],
    added: [],
    addEmployeeNumbers: []
  }
  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderNumber', 'name', 'orderDate', 'orderState', 'periodID', 'organizationID'])
    .selectById(orderRegistryID)

  const period = periodService.getCurrentPeriod(order.organizationID)
  if (!period.ID) {
    ctx.mParams.msg = UB.i18n(`Для організації не знайдено поточного періоду`)
    return
  }
  let empIntComb = []
  if (mParams.empType === '5') {
    empIntComb = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'employeeID', 'payElID.calcProportion', 'description'])
      .where('employeeID', '=', employeeID)
      .where('employeeNumberID.mainEmpNumberID', '=', mParams.mainEmpNumberID)
      .where('employeeNumberID.empWorkPlace', '=', '5')
      .where('employeeNumberID', '!=', mParams.employeeNumberID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('employeeNumberID.dateFrom', '<=', dateFrom)
      .where('employeeNumberID.dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
  } else {
    empIntComb = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'employeeID', 'payElID.calcProportion', 'description'])
      .where('employeeID', '=', employeeID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('employeeNumberID.dateFrom', '<=', dateFrom)
      .where('employeeNumberID.dateTo', '>=', dateFrom)
      .where('workPlace', '=', '2')
      .orderBy('dateFrom')
      .selectAsObject()
  }
  const payEl = UB.Repository('hr_payEl')
    .attrs('calcEarnings', 'methodID.dayAccumCondition', 'methodID')
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(payElID)

  empIntComb.forEach(emp => {
    if (!result.addEmployeeNumbers.find(o => o === emp.employeeNumberID)) {
      const doc = {
        orderRegistryID: orderRegistryID,
        orderNumber: orderNumber,
        orderDate: orderDate,
        orderState: 'PROJECT',
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: emp.ID,
        payElID: payElID,
        dayAccumCondition: payEl['methodID.dayAccumCondition'],
        dateFrom: dateFrom,
        dayCount: dayCount,
        methodID: payEl.methodID
      }
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: order.organizationID,
        periodCalcID: period.ID,
        flagsRec: 2,
        flagsFix: 0,
        ctrlName: 'dayCount',
        accruals: [],
        accrualsAvg: []
      }, doc))

      const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'flagsFix', 'flagsRec']
      const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
        'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
        'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt']
      const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']

      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })
      doc.avgSum = resultData.baseSum
      const accrualsAvg = []
      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrualsAvg.push(accrual)
      })

      delete doc.dayAccumCondition
      delete doc.methodID
      doc.ID = docRegStore.generateID()
      const formData = {
        detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] }
        }
      }

      resultData.accruals.forEach((accr, idx) => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName]) : accr[attrName]
        })
        accrual.orderRegistryID = orderRegistryID
        accrual.orderID = doc.ID
        accrual.orderDateFrom = accr.dateFrom
        accrual.orderDateTo = accr.dateTo
        formData.detail.orderRegistryDt.insert.push(accrual)
      })
      accrualsAvg.forEach(accAvg => {
        accAvg.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accAvg)
      })
      try {
        docRegStore.run('insert', {
          formData: JSON.stringify(formData),
          execParams: doc
        })
        result.added.push(emp['description'])
        result.addEmployeeNumbers.push(emp.employeeNumberID)
        App.dbCommit()
      } catch (e) {
        App.dbRollback()
        if (stringService.isUBAbortStr(e.message)) {
          result.errors.push(stringService.getUBAbortStr(e.message))
        } else {
          result.errors.push(emp['description'] + ' - ' + e.message)
        }
      }
    }
  })
  ctx.mParams.result = JSON.stringify(result)
}
