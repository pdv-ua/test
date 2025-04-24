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
const stringService = require('../AC/modules/dataServices/stringService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('addIntComb')
me.entity.addMethod('calcAvgPay')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'paySum', 'periodCalcID', 'employeePositionID', 'periodCalc', 'periodSalaryID',
      'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days', 'hours', 'orderDate', 'calendarDays',
      'mask', 'flagsFix', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'flagsRec', 'accrualDt', 'calcProportion'
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
      item.calcProportion = execParams.calcProportion || instanceData.calcProportion
      item.orderID = execParams.ID
      item.calcEarnings = execParams.calcEarnings || instanceData.calcEarnings
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
  }
  )
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
    item.calcProportion = execParams.calcProportion || 'DAY'
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

function afterInsertOrUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!execParams.empOrderID && !instanceData.empOrderID) {
    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID', 'orderRegistryID.periodID', 'payElID', 'payElID.dictTimeCostID', 'orderID', 'dateFrom', 'dateTo',
        'employeeNumberID', 'employeeNumberID.employeeID', 'employeeNumberID.orgID', 'payElID.includeSecondJobs'])
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
      employeeNumbers.forEach(row => {
        let date = dateService.shiftDate(row.dateFrom)
        let dateTo = dateService.shiftDate(row.dateTo)
        while (date <= dateTo) {
          timeSheetParams.push({
            orderID: execParams.ID,
            entityName: 'hr_docRegAvgPay',
            employeeNumberID: row.employeeNumberID,
            periodID: rowDt.periodID,
            dateWork: date,
            factTimeCostID: rowDt['payElID.dictTimeCostID'],
            factHour: 0
          })
          if (addEmployeePosition.length) {
            const mainPos = orderEmployeePosition.find(o => o.employeeNumberID === row.employeeNumberID && o.dateFrom <= date && o.dateTo >= date)
            if (mainPos) {
              const addNumber = []
              addEmployeePosition.filter(o => (!employeeNumber.mainEmpNumberID || o.dictPositionID === mainPos.dictPositionID) && o.dateFrom <= date && o.dateTo >= date).forEach(addPos => {
                if (!addNumber.find(o => o === addPos.employeeNumberID)) {
                  timeSheetParams.push({
                    orderID: execParams.ID,
                    entityName: 'hr_docRegAvgPay',
                    employeeNumberID: addPos.employeeNumberID,
                    periodID: rowDt.periodID,
                    dateWork: date,
                    factTimeCostID: rowDt['payElID.dictTimeCostID'],
                    factHour: 0
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
}

me.calcAvgPay = function (ctx) {
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
    let linkToParentID = instanceData.parentID ? accrualService.getParentAccrual(row.employeeNumberID, accruals, instanceData.parentID) : null

    accruals.push({
      ID: accrualService.getID('S_HR_ACCRUAL'),
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
      calculateDate: new Date(),
      linkToParentID: linkToParentID,
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

me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const docRegAvgPayStore = UB.DataStore('hr_docRegAvgPay')
  const employeeID = mParams.employeeID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.shiftDate(mParams.dateTo)
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
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('employeeNumberID.dateFrom', '<=', dateTo)
      .where('employeeNumberID.dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
  } else {
    empIntComb = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'employeeID', 'payElID.calcProportion', 'description'])
      .where('employeeID', '=', employeeID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('employeeNumberID.dateFrom', '<=', dateTo)
      .where('employeeNumberID.dateTo', '>=', dateFrom)
      .where('workPlace', '=', '2')
      .orderBy('dateFrom')
      .selectAsObject()
  }
  const payEl = UB.Repository('hr_payEl')
    .attrs('calcEarnings', 'methodID.dayAccumCondition')
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(payElID)

  empIntComb.forEach(emp => {
    if (!result.addEmployeeNumbers.find(o => o === emp.employeeNumberID)) {
      let calcEarnings = payEl.calcEarnings
      if (calcEarnings === 'ACCRUAL') {
        calcEarnings = emp['payElID.calcProportion']
      }
      const doc = {
        orderRegistryID: orderRegistryID,
        orderNumber: orderNumber,
        orderDate: orderDate,
        orderState: 'PROJECT',
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: emp.ID,
        payElID: payElID,
        dateFrom,
        dateTo,
        dayAccumCondition: payEl['methodID.dayAccumCondition'],
        calcEarnings: calcEarnings || 'DAY',
        ID: docRegAvgPayStore.generateID()
      }
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: order.organizationID,
        orderID: doc.empOrderID,
        empOrderID: doc.empOrderID,
        periodCalcID: period.ID,
        flagsRec: 2 | (doc.calcProportion === 'HOUR' ? 1 << 5 : 0),
        flagsFix: 0,
        dayAccumCondition: doc.dayAccumCondition || 'noDaysOff',
        ctrlName: 'dateTo',
        accruals: [],
        accrualsAvg: []
      }, doc))

      delete doc.dayAccumCondition

      const copyDocAttr = ['dayCount', 'calendarDayCount', 'hourCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType',
        'calcSum', 'flagsFix', 'flagsRec', 'avgSum']
      const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
        'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
        'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'hours', 'paySum', 'accrualDt', 'calcEarnings']
      const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays',
        'opHours', 'opKoef', 'opSum', 'accrualDt']
      copyDocAttr.forEach(attrName => {
        doc[attrName] = resultData[attrName]
      })
      doc.avgSum = resultData.baseSum
      const formData = {
        detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] }
        }
      }

      resultData.accruals.forEach(accr => {
        const accrual = {}
        copyDocRegDtAttr.forEach(attrName => {
          accrual[attrName] = accr[attrName]
        })
        accrual.orderRegistryID = orderRegistryID
        accrual.orderID = doc.ID
        accrual.empOrderID = doc.empOrderID
        accrual.empOrderDetID = doc.empOrderDetID
        accrual.orderDateFrom = doc.dateFrom
        accrual.orderDateTo = doc.dateTo
        formData.detail.orderRegistryDt.insert.push(accrual)
      })

      resultData.accrualsAvg.forEach(accr => {
        const accrual = {}
        copyDocAccrualAvgAttr.forEach(attrName => {
          accrual[attrName] = attrName === 'accrualDt' ? JSON.stringify(accr[attrName] || []) : accr[attrName]
        })
        accrual.orderID = doc.ID
        formData.detail.accrualAvg.insert.push(accrual)
      })
      try {
        docRegAvgPayStore.run('insert', {
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
