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
me.entity.addMethod('calcVacation')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('checkWorkDays')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'paySum', 'periodCalcID', 'employeePositionID',
      'periodCalc', 'periodSalaryID', 'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days',
      'orderDate', 'calendarDays', 'mask', 'flagsFix', 'baseSum', 'orderDateFrom', 'orderDateTo',
      'avgCalcType', 'dateFromAvg', 'dateToAvg', 'flagsRec', 'accrualDt', 'linkToParentID'
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
    entityName: 'hr_docRegVacationDt',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'dateFrom', 'dateTo', 'dayCount', 'dayDiff',
      'dictVacationKindID', 'dictVacationKindID.name', 'empVacationPeriodID', 'empVacationPeriodID.descriptionEx'
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
  afterInsertOrUpdate(ctx)
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
  })
  // update parentID in child vacations
  const children = UB.Repository('hr_docRegVacation')
    .attrs(['ID'])
    .where('parentID', '=', execParams.ID)
    .selectAsObject()

  const docStore = UB.DataStore('hr_docRegVacation')
  children.forEach(child => {
    docStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: child.ID,
        parentID: null
      }
    })
  })
  const vacDtStore = UB.DataStore('hr_docRegVacationDt')
  UB.Repository('hr_docRegVacationDt')
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
  afterInsertOrUpdate(ctx)
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
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
            entityName: 'hr_docRegVacation',
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
                    entityName: 'hr_docRegVacation',
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

me.calcVacation = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  if (!params.periodCalcID) {
    const period = periodService.getCurrentPeriod(params.orgID || params.organizationID)
    if (!period.ID) {
      throw new UB.UBAbort(`<<<${UB.i18n(`Для організації не знайдено поточного періоду`)}>>>`)
    }
    params.periodCalcID = period.ID
  }
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
}

me.checkWorkDays = function (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.workDaysExist = checkWorkDaysForParent(execParams.employeeNumberID, execParams.dateFrom, execParams.pDateTo)
}

function checkWorkDaysForParent (employeeNumberID, dateFrom, pDateTo) {
  const workDays = UB.Repository('tim_timeSheet')
    .attrs(['ID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('isActive', '=', '1')
    .where('dateWork', '>=', pDateTo)
    .where('dateWork', '<=', dateService.addDays(dateFrom, -1))
    .where('factTimeCostID.timeCostType', '=', 'WORK')
    .selectSingle()
  return !!workDays
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(execParams.ID)
  }
  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name'])
    .where('orderID', '=', instanceData.ID).selectAsObject()

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed',
      'organizationID', 'orderState', 'orderNumber', 'orderDate'])
    .selectById(instanceData.orderRegistryID)

  const storeDt = UB.DataStore('hr_orderRegistryDt')
  const store = UB.DataStore(__entityName)

  const payEls = ctx.mParams.payEls ? JSON.parse(ctx.mParams.payEls) : payElService.getPayEl({ orgID: order.organizationID, getAll: false })
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

  const accruals = []

  if (instanceData.parentID) {
    const parentVacation = UB.Repository('hr_docRegVacation')
      .attrs(['ID', 'description', 'orderNumber', 'orderDate', 'orderState', 'dateTo'])
      .selectById(instanceData.parentID)
    if (parentVacation) {
      if (parentVacation.orderState !== 'POSTED') {
        throw new UB.UBAbort(`<<<${UB.i18n('Проведення документа відпустки № {0} від {1} ({2}) неможливе. Попередній документ № {3} від {4} ({5}) не проведено ', instanceData.orderNumber, dateService.formatDate(instanceData.orderDate), instanceData.description, parentVacation.orderNumber, dateService.formatDate(parentVacation.orderDate), parentVacation.description)}>>>`)
      }
      const pDateTo = dateService.addDays(dateService.shiftDate(parentVacation.dateTo), 1)
      const dateFrom = dateService.shiftDate(instanceData.dateFrom)
      if (pDateTo < dateFrom && ctx.mParams.fromOrderRegistry) {
        const workDays = checkWorkDaysForParent(instanceData.employeeNumberID, dateFrom, pDateTo)
        if (workDays) {
          const employee = UB.Repository('hr_employeeNumberS').attrs('description').selectById(instanceData.employeeNumberID)
          throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} у періоді з {1} по {2} є робочі дні!', employee.description, dateService.formatDate(pDateTo), dateService.formatDate(dateService.addDays(dateFrom, -1)))}>>>`)
        }
      }
    } else {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: instanceData.ID,
          parentID: null
        }
      })
    }
  }

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
    let linkToParentID = instanceData.parentID ? accrualService.getParentAccrual(row.employeeNumberID, accruals, instanceData.parentID) : null
    accruals.push({
      ID: accrualService.getID('S_HR_ACCRUAL'),
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
      planDays: row.calendarDays,
      baseSum: row.baseSum,
      rate: row.rate,
      days: row.days,
      calendarDays: row.calendarDays,
      koef: row.koef,
      hours: row.hours,
      mask: row.mask,
      maskAdd: row.maskAdd,
      mtCount: row.mtCount,
      paySum: row.paySum,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      sumAvg: row.baseSum,
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

  const children = UB.Repository('hr_docRegVacation')
    .attrs(['ID', 'dateFrom', 'dateTo', 'flagsRec', 'employeeNumberID', 'payElID', 'orderRegistryID'])
    .where('parentID', '=', instanceData.ID)
    .selectAsObject()

  children.forEach(child => {
    const childAccrualsAvg = UB.Repository('hr_accrualAvg').attrs('ID').where('orderID', '=', child.ID).selectAsObject()
    const parentAccrualsAvg = UB.Repository('hr_accrualAvg').attrs('periodID', 'dateFrom', 'dateTo',
      'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt').where('orderID', '=', instanceData.ID).selectAsObject()

    const childDet = detail.find(o => o.orderID === child.ID)

    const accruals = childDet ? [childDet] : UB.Repository('hr_orderRegistryDt').attrs('*').where('orderID', '=', child.ID).selectAsObject()

    const prm = rlService.calculateOrderAccrual({
      orgID: order.organizationID,
      periodCalcID: order.periodID,
      orderID: child.ID,
      dateFrom: child.dateFrom,
      dateTo: child.dateTo,
      flagsRec: child.flagsRec,
      payElID: child.payElID,
      employeeNumberID: child.employeeNumberID,
      parentID: instanceData.ID,
      accruals: accruals,
      skipAutoCalc: true
    })

    let childDetails = []

    if (!childDet) {
      childDetails = UB.Repository('hr_orderRegistryDt')
        .attrs('ID')
        .where('orderID', '=', child.ID)
        .selectAsObject()

      prm.accruals.forEach(accr => {
        delete accr['periodSalaryID.name']
        delete accr['periodCalcID.name']
        delete accr['payElID.description']
        delete accr.timeSheetID
        accr.orderID = child.ID
        accr.orderRegistryID = child.orderRegistryID
      })
    }

    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: child.ID,
        dateFrom: prm.dateFrom,
        dateTo: prm.dateTo,
        flagsRec: prm.flagsRec,
        employeeNumberID: prm.employeeNumberID,
        paySum: prm.paySum,
        avgCalcType: prm.avgCalcType,
        dateFromAvg: prm.dateFromAvg,
        dateToAvg: prm.dateToAvg,
        avgSum: prm.avgSum,
        calcSum: prm.calcSum
      },
      formData: JSON.stringify({
        detail: {
          accrualAvg: { insert: parentAccrualsAvg, del: childAccrualsAvg },
          orderRegistryDt: childDet ? { insert: [] } : { insert: prm.accruals, del: childDetails }
        }
      })
    })
    if (childDet) {
      storeDt.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: childDet.ID,
          dateFrom: prm.dateFrom,
          dateTo: prm.dateTo,
          flagsRec: prm.flagsRec,
          employeeNumberID: prm.employeeNumberID,
          paySum: prm.paySum,
          parentID: instanceData.ID,
          avgCalcType: prm.avgCalcType,
          dateFromAvg: prm.dateFromAvg,
          dateToAvg: prm.dateToAvg,
          calcSum: prm.calcSum
        }
      })
    }
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName)
      .attrs(['ID', 'orderRegistryID', 'orderNumber', 'orderDate', 'description'])
      .selectById(ctx.mParams.execParams.ID)
  }
  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)

  const childVacation = UB.Repository('hr_docRegVacation').attrs(['ID', 'description', 'orderNumber', 'orderDate', 'orderState'])
    .where('parentID', '=', instanceData.ID)
    .where('orderState', '=', 'POSTED')
    .selectSingle()
  if (childVacation) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відміна проведення документа відпустки № {0} від {1} ({2}) неможливе, у зв\'язку з тим, що він був подовжений. Документ № {3} від {4} ({5})', instanceData.orderNumber, dateService.formatDate(instanceData.orderDate), instanceData.description, childVacation.orderNumber, dateService.formatDate(childVacation.orderDate), childVacation.description)}>>>`)
  }
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}

me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const docRegStore = UB.DataStore('hr_docRegVacation')
  const vacDtStore = UB.DataStore('hr_docRegVacationDt')

  const employeeID = mParams.employeeID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.shiftDate(mParams.dateTo)
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
        dateTo: dateTo,
        dayCount: dayCount,
        methodID: payEl.methodID
      }
      const resultData = rlService.calculateOrderAccrual(Object.assign({
        orgID: order.organizationID,
        periodCalcID: period.ID,
        flagsRec: 2,
        flagsFix: 0,
        ctrlName: 'dateTo',
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
        const vacCtx = {
          mParams: {
            employeeNumberID: emp.employeeNumberID,
            dateFrom,
            dateTo,
            orgID: order.organizationID,
            payElID,
            mode: 'ADDONLY',
            virtualAdd: true
          }
        }
        global['hr_empOrderVacationDet'].addPeriods(vacCtx)
        if (vacCtx.mParams.addedPeriods) {
          const vacPeriods = JSON.parse(vacCtx.mParams.addedPeriods)
          vacPeriods.forEach(row => {
            row.dateFrom = dateService.shiftDate(row.dateFrom)
            row.dateTo = dateService.shiftDate(row.dateTo)
            vacDtStore.run('insert', {
              execParams: {
                orderID: doc.ID,
                empVacationPeriodID: row.empVacationPeriodID,
                dictVacationKindID: row.dictVacationKindID,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                dayDiff: row.dayDiff,
                dayCount: row.dayCount
              }
            })
          })
        }
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
