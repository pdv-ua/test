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
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcSickness')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('getParentSickness')
me.entity.addMethod('addSubEmpOrder')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    docIDName: 'orderID',
    JSONAttr: ['accrualDt'],
    fieldList: orderService.setFieldListAttribute([ 'employeeNumberID', 'orderID', 'orderRegistryID', 'orderNumber',
      'payElID', 'payElID.description', 'paySum', 'periodCalcID', 'periodCalcID.name', 'employeePositionID',
      'periodCalc', 'periodSalaryID', 'periodSalaryID.name', 'periodSalary', 'dateFrom', 'dateTo', 'days',
      'orderDate', 'calendarDays', 'mask', 'flagsFix', 'baseSum', 'accrualDt',
      'avgCalcType', 'dateFromAvg', 'dateToAvg', 'flagsRec', 'rate', 'linkToParentID'
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
    detailName: 'docRegSicknessDt',
    entityName: 'hr_docRegSicknessDt',
    docIDName: 'docRegSicknessID',
    fieldList: orderService.setFieldListAttribute(['docRegSicknessID', 'dateFrom', 'dateTo', 'illnessRegime'], ['lineNum'])
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
  if (execParams.dateTo) {
    const childSickness = UB.Repository('hr_docRegSickness')
      .attrs(['ID', 'description'])
      .where('parentSicknessID', '=', execParams.ID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
      .selectAsObject()
    if (childSickness.length) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата закінчення більша/дорівнює даті початку наступного листа "{0}". Виправіть перед збереженням', childSickness[0].description)}>>>`)
    }
  }
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail.orderRegistryDt.insert.forEach(item => {
      item.orderDateFrom = execParams.dateFrom || instanceData.dateFrom
      item.orderDateTo = execParams.dateTo || instanceData.dateTo
      item.orderDate = execParams.orderDate || instanceData.orderDate
      item.orderNumber = execParams.orderNumber || instanceData.orderNumber
      item.orderID = execParams.ID
      item.dictIllnessReasonID = execParams.dictIllnessReasonID || instanceData.dictIllnessReasonID
      item.parentSicknessID = execParams.parentSicknessID !== undefined ? execParams.parentSicknessID : (instanceData.parentSicknessID || null)
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  afterInsertOrUpdate(ctx)
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  if (instanceData.get('empOrderSicknessID') && !ctx.mParams.forcedDelete) {
    const orderState = instanceData.get('empOrderID')
      ? UB.Repository('hr_order')
        .attrs('orderState')
        .where('ID', '=', instanceData.get('empOrderID'))
        .selectScalar()
      : null
    if (orderState === 'PROCESSED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - сформовано з наказу по персоналу. Видалення неможливе.', instanceData.get('description'))}>>>`)
    }
  }
  const orderRegistryPosted = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID'])
    .where('orderID', '=', execParams.ID)
    .where('periodCalcID.isClosed', '=', 1)
    .selectSingle()
  if (orderRegistryPosted) {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} проведено в закритому періоді. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  const empOrderID = instanceData.get('empOrderID')
  const childSickness = UB.Repository('hr_docRegSickness').attrs(['ID', 'description'])
    .where('parentSicknessID', '=', execParams.ID)
    .whereIf(empOrderID, 'empOrderID', '!=', empOrderID)
    .limit(1)
    .selectSingle()
  if (childSickness) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для документа {0} існує продовження {1}! Видалення неможливе!', instanceData.get('description'), childSickness.description)}>>>`)
  }
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'employeeNumberID.limitedAccess'])
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
        __skipRls: true,
        skipOrderDelete: true,
        execParams: {
          ID: record.ID
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
    item.dictIllnessReasonID = execParams.dictIllnessReasonID
    item.parentSicknessID = execParams.parentSicknessID
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

  const isParentInstance = instanceData.parentSicknessID
  const isParentExec = Object.keys(execParams).includes('parentSicknessID')

  if ((execParams.dateFrom || instanceData.dateFrom) && ((isParentExec && execParams.parentSicknessID) || (!isParentExec && isParentInstance))) {
    const parentSickness = UB.Repository('hr_docRegSickness')
      .attrs('dateTo', 'description')
      .selectById(execParams.parentSicknessID || instanceData.parentSicknessID)
    const dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
    if (dateFrom.getTime() <= new Date(parentSickness.dateTo).getTime()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата початку меньша/дорівнює даті закінчення попереднього листа {0}', parentSickness.description)}>>>`)
    }
  }

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
    timService.cancelTimeSheet(execParams.ID)
    const docParams = UB.Repository(__entityName)
      .attrs(['notPay', 'dictIllnessReasonID.payElUnpaidID.dictTimeCostID', 'msekDateTo', 'msekResult',
        'dictIllnessReasonID.payElFSSUID.isParentEmployeeNumber', 'employeeNumberID', 'employeeNumberID.parentEmpNumberID'])
      .selectById(execParams.ID)
    const notPay = execParams.notPay === undefined ? docParams.notPay : execParams.notPay
    const unpaidDictTimeCostID = docParams['dictIllnessReasonID.payElUnpaidID.dictTimeCostID']
    const isParentEmployeeNumber = docParams['dictIllnessReasonID.payElFSSUID.isParentEmployeeNumber']
    const msekDateTo = dateService.shiftDate(execParams.msekDateTo === undefined ? docParams.msekDateTo : execParams.msekDateTo)
    const msekResult = execParams.msekResult === undefined ? docParams.msekResult : execParams.msekResult
    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID', 'periodCalcID', 'payElID', 'payElID.includeSecondJobs', 'payElID.dictTimeCostID', 'orderID', 'mask',
        'dateFrom', 'dateTo', 'employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.employeeID',
        'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
      .where('orderID', '=', execParams.ID)
      .where('periodCalcID', 'isNull')
      .where(`(flagsRec & 512 != 512)`, 'custom')
      .selectAsObject()
    const orgID = orderRegistryDt.length ? orderRegistryDt[0]['employeeNumberID.orgID'] : null
    const currentPeriod = periodService.getCurrentPeriod(orgID)
    const empNumbers = []
    const timeSheetParams = []
    const parentEmpNumbers = []
    if (isParentEmployeeNumber && docParams['employeeNumberID.parentEmpNumberID']) {
      employeeService.getParentEmpNumberIDs(docParams['employeeNumberID'], parentEmpNumbers)
    }
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

    orderRegistryDt.forEach(rowDt => {
      const employeeNumbers = [{
        employeeNumberID: rowDt.employeeNumberID,
        dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(rowDt['employeeNumberID.dateFrom']))),
        dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(rowDt['employeeNumberID.dateTo'])))
      }]
      empNumbers.push(rowDt.employeeNumberID)
      parentEmpNumbers.forEach(row => {
        if (row.dateFrom <= dateService.shiftDate(rowDt.dateTo) && row.dateTo >= dateService.shiftDate(rowDt.dateFrom)) {
          employeeNumbers.push({
            employeeNumberID: row.employeeNumberID,
            employeeID: rowDt['employeeNumberID.employeeID'],
            dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['dateFrom']))),
            dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['dateTo'])))
          })
        }
      })
      if (rowDt['payElID.includeSecondJobs'] &&
        UB.Repository('hr_employeePositionS')
          .attrs(['ID'])
          .where('employeeNumberID', '=', rowDt.employeeNumberID)
          .where('workPlace', '=', '1')
          .where('dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
          .where('dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
          .selectScalar()) {
        const secJobs = UB.Repository('hr_employeePositionS')
          .attrs(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
          .where('employeeID', '=', rowDt['employeeNumberID.employeeID'])
          .where('employeeNumberID', '!=', rowDt.employeeNumberID)
          .where('organizationID', '=', rowDt['employeeNumberID.orgID'])
          .where('workPlace', '=', '2')
          .where('employeeNumberID.dateFrom', '<=', dateService.shiftDate(rowDt.dateTo))
          .where('employeeNumberID.dateTo', '>=', dateService.shiftDate(rowDt.dateFrom))
          .groupBy(['employeeNumberID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
          .selectAsObject()
        secJobs.forEach(row => {
          employeeNumbers.push({
            employeeNumberID: row.employeeNumberID,
            dateFrom: dateService.shiftDate(Math.max(dateService.shiftDate(rowDt.dateFrom), dateService.shiftDate(row['employeeNumberID.dateFrom']))),
            dateTo: dateService.shiftDate(Math.min(dateService.shiftDate(rowDt.dateTo), dateService.shiftDate(row['employeeNumberID.dateTo'])))
          })
          empNumbers.push(row.employeeNumberID)
        })
      }

      employeeNumbers.forEach(row => {
        let date = dateService.shiftDate(row.dateFrom)
        const dateTo = dateService.shiftDate(row.dateTo)
        while (date <= dateTo) {
          const isMsekDay = msekDateTo && msekDateTo.getTime() === date.getTime() && msekResult === '1' && unpaidDictTimeCostID
          if (isMsekDay) {
            timeSheetParams.push({
              orderID: execParams.ID,
              entityName: 'hr_docRegSickness',
              employeeNumberID: row.employeeNumberID,
              periodID: rowDt.periodCalcID || currentPeriod.ID,
              dateWork: date,
              factTimeCostID: unpaidDictTimeCostID,
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
                      entityName: 'hr_docRegSickness',
                      employeeNumberID: addPos.employeeNumberID,
                      periodID: rowDt.periodCalcID || currentPeriod.ID,
                      dateWork: date,
                      factTimeCostID: unpaidDictTimeCostID,
                      factHour: 0
                    })
                    addNumber.push(addPos.employeeNumberID)
                  }
                })
              }
            }
          } else if (rowDt['payElID.dictTimeCostID']) {
            timeSheetParams.push({
              orderID: execParams.ID,
              entityName: 'hr_docRegSickness',
              employeeNumberID: row.employeeNumberID,
              periodID: rowDt.periodCalcID || currentPeriod.ID,
              dateWork: date,
              factTimeCostID: notPay && unpaidDictTimeCostID ? unpaidDictTimeCostID : rowDt['payElID.dictTimeCostID'],
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
                      entityName: 'hr_docRegSickness',
                      employeeNumberID: addPos.employeeNumberID,
                      periodID: rowDt.periodCalcID || currentPeriod.ID,
                      dateWork: date,
                      factTimeCostID: notPay && unpaidDictTimeCostID ? unpaidDictTimeCostID : rowDt['payElID.dictTimeCostID'],
                      factHour: 0
                    })
                    addNumber.push(addPos.employeeNumberID)
                  }
                })
              }
            }
          }
          date = dateService.nextDay(date)
        }
      })
    })
    timService.setTimeSheet(timeSheetParams)
    const cancelSicknessDt = UB.Repository('hr_docRegSicknessDt')
      .attrs('dateFrom', 'dateTo')
      .where('docRegSicknessID', '=', execParams.ID)
      .where('illnessRegime', '=', '4')
      .selectAsObject()
    cancelSicknessDt.forEach(det => {
      timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod, det.dateFrom, det.dateTo, empNumbers, true)
    })
  }
}

me.calcSickness = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
}

me.doPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName)
      .attrs(['*'])
      .selectById(ctx.mParams.execParams.ID)
  }
  const storeDt = UB.DataStore('hr_orderRegistryDt')
  const store = UB.DataStore(__entityName)

  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name', 'payElID.dictTimeCostID'])
    .where('orderID', '=', instanceData.ID)
    .where('periodCalcID', 'isNull')
    .selectAsObject()

  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.dateFrom', 'periodID.name', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)

  const payEls = ctx.mParams.payEls ? JSON.parse(ctx.mParams.payEls) : payElService.getPayEl({ orgID: order.organizationID, getAll: false })
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom }

  const accruals = []
  const reversal = []

  if (instanceData.parentSicknessID) {
    const parent = UB.Repository('hr_docRegSickness')
      .attrs(['orderState', 'description', 'employeeNumberID.description'])
      .selectById(instanceData.parentSicknessID)
    if (parent.orderState !== 'POSTED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Попередній "{0}" для {1} не проведено!', parent.description, parent['employeeNumberID.description'])}>>>`)
    }
  }

  const isValidDateFirst = instanceData.dateFirst && !instanceData.parentSicknessID && !instanceData.parentAccrualID
    ? instanceData.dateFirst && dateService.shiftDate(instanceData.dateFrom).getTime() === dateService.shiftDate(instanceData.dateFirst).getTime() : true
  if (ctx.mParams.fromOrderRegistry && !isValidDateFirst) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для лікарняного {0} вказана дата початку первинного але не вказан первинний лист!', instanceData.description)}>>>`)
  }

  detail.forEach(row => {
    if (!row.periodCalcID || row.periodCalcID !== postingPeriod.ID) {
      storeDt.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          periodCalcID: postingPeriod.ID,
          periodCalc: postingPeriod.dateFrom
        }
      })
    }
    let linkToParentID = instanceData.parentSicknessID ? accrualService.getParentAccrual(row.employeeNumberID, accruals, instanceData.parentSicknessID) : null
    if (row.flagsRec & 1 << 9 && row.linkToParentID) {
      const parentAccr = UB.Repository('hr_accrual')
        .attrs(['ID'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orderID', '=', row.orderID)
        .where('orderDtID', '=', row.linkToParentID)
        .selectSingle()
      if (parentAccr) {
        linkToParentID = parentAccr.ID
      }
    }
    if (!row.days && !row.paySum) {
      // try to recalculate unpaid days
      row.days = UB.Repository('tim_timeSheet')
        .attrs(['count(*)'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orderID', '=', ctx.mParams.execParams.empOrderSicknessID || instanceData.empOrderSicknessID || row.orderID)
        .where('dateWork', '>=', row.dateFrom)
        .where('dateWork', '<=', row.dateTo)
        .where('factTimeCostID', '=', row['payElID.dictTimeCostID'])
        .where('isActive', '=', true)
        .selectScalar() || 0
    }
    const accr = {
      ID: accrualService.getID('S_HR_ACCRUAL'),
      orgID: order.organizationID,
      orderID: row.orderID,
      empOrderID: ctx.mParams.execParams.empOrderSicknessID || instanceData.empOrderSicknessID,
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
      sumAvg: row.baseSum,
      rate: instanceData.rate,
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
      standingYearMonth: instanceData.standingYearMonth,
      standingAll: instanceData.standingAll,
      dictIllnessReasonID: instanceData.dictIllnessReasonID,
      accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
    }
    if (!row.storno) {
      accruals.push(accr)
    } else {
      const parentAccrual = UB.Repository('hr_accrual')
        .attrs('ID')
        .where('orderID', '=', row.orderID)
        .where('orderDtID', '=', row.linkToParentID)
        .selectSingle()
      accr.linkToParentID = parentAccrual ? parentAccrual.ID : null
      reversal.push(accr)
    }
  })
  if (reversal.length) {
    accrualService.saveAccruals({
      accruals: reversal,
      checkPayElInCalcPayAttr: true,
      payEls: payEls,
      description: UB.i18n(`Проведення {0}`, instanceData.description)
    })
    const parentAccruals = UB.Repository('hr_accrual')
      .attrs(['ID', 'flagsRec'])
      .where('ID', 'in', reversal.map(o => o.linkToParentID).filter(o => o))
      .selectAsObject()
    const accrualStore = UB.DataStore('hr_accrual')
    parentAccruals.forEach(accr => {
      accrualStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: accr.ID,
          flagsRec: (accr.flagsRec || 0) | 1 << 10
        }
      })
    })
  }
  accrualService.orderAccrualReversal({ accruals, cont: { payEl: payEls } })
  if (accruals.length) {
    const children = UB.Repository('hr_docRegSickness')
      .attrs([
        'ID',
        'dateFrom',
        'dateTo',
        'flagsRec',
        'employeeNumberID',
        'dictIllnessReasonID',
        'dictIllnessReasonID.payElFSSUID',
        'employeeFamilyID',
        'orderRegistryID'
      ])
      .where('parentSicknessID', '=', instanceData.ID)
      .selectAsObject()

    children.forEach(child => {
      const childAccrualsAvg = UB.Repository('hr_accrualAvg').attrs('ID').where('orderID', '=', child.ID).selectAsObject()
      const parentAccrualsAvg = UB.Repository('hr_accrualAvg').attrs('periodID', 'dateFrom', 'dateTo',
        'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt').where('orderID', '=', instanceData.ID).selectAsObject()

      const prm = rlService.calculateOrderAccrual({
        orgID: order.organizationID,
        periodCalcID: order.periodID,
        orderID: child.ID,
        dateFrom: child.dateFrom,
        dateTo: child.dateTo,
        flagsRec: child.flagsRec,
        payElID: child['dictIllnessReasonID.payElFSSUID'],
        employeeNumberID: child.employeeNumberID,
        dictIllnessReasonID: child.dictIllnessReasonID,
        employeeFamilyID: child.employeeFamilyID,
        parentSicknessID: instanceData.ID,
        skipAutoCalc: true
      })

      const childDet = detail.find(o => o.orderID === child.ID)
      let childDetails = []

      if (!childDet) {
        childDetails = UB.Repository('hr_orderRegistryDt')
          .attrs('ID')
          .where('orderID', '=', child.ID)
          .where('periodCalcID', 'isNull')
          .where(`(flagsRec & 512 != 512)`, 'custom')
          .selectAsObject()

        prm.accruals.forEach(accr => {
          delete accr['periodSalaryID.name']
          delete accr['periodCalcID.name']
          delete accr['payElID.description']
          accr.orderID = child.ID
          accr.orderRegistryID = child.orderRegistryID
          accr.rate = prm.rate
          accr.periodCalcID = null
          accr.periodCalc = null
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
          dictIllnessReasonID: prm.dictIllnessReasonID,
          employeeFamilyID: prm.employeeFamilyID,
          paySum: prm.paySum,
          avgCalcType: prm.avgCalcType,
          standingAll: prm.standingAll,
          standingYearMonth: prm.standingYearMonth,
          rate: prm.rate,
          dateFromAvg: prm.dateFromAvg,
          dateToAvg: prm.dateToAvg,
          avgSum: prm.avgSum,
          calcSum: prm.calcSum,
          minSalary: prm.minSalary,
          maxECB: prm.maxECB,
          maxECBDay: prm.maxECBDay
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
            dictIllnessReasonID: prm.dictIllnessReasonID,
            paySum: prm.paySum,
            parentSicknessID: instanceData.ID,
            avgCalcType: prm.avgCalcType,
            rate: prm.rate,
            dateFromAvg: prm.dateFromAvg,
            dateToAvg: prm.dateToAvg,
            calcSum: prm.calcSum
          }
        })
      }
    })
    accrualService.saveAccruals({
      accruals: accruals,
      checkPayElInCalcPayAttr: true,
      payEls: payEls,
      description: UB.i18n(`Проведення {0}`, instanceData.description)
    })
  }
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'POSTED')
}

me.doCancelPosting = function (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null
  if (!instanceData) {
    instanceData = UB.Repository(__entityName).attrs(['*']).selectById(ctx.mParams.execParams.ID)
  }
  const employee = UB.Repository('hr_employeeNumberS')
    .attrs('description')
    .selectById(instanceData.employeeNumberID)
  const sicknessRequisAccrual = UB.Repository('hr_sicknessRequisAccrual')
    .attrs(['sicknessRequisDtID.sicknessRequisID.orderNumber', 'sicknessRequisDtID.sicknessRequisID.orderDate'])
    .exists(UB.Repository('hr_accrual')
      .correlation('ID', 'accrualID')
      .where('orderID', '=', instanceData.ID))
    .selectSingle()
  if (sicknessRequisAccrual) {
    const sraOrderNumber = sicknessRequisAccrual['sicknessRequisDtID.sicknessRequisID.orderNumber']
    const sraOrderDate = dateService.formatDate(sicknessRequisAccrual['sicknessRequisDtID.sicknessRequisID.orderDate'])
    throw new UB.UBAbort(`<<<${UB.i18n('Сума лікарняного {0} для {1} додана у заяву-розрахунок №{2} від {3}! Скасування неможливе!', instanceData.description, employee['description'], sraOrderNumber, sraOrderDate)}>>>`)
  }
  const parentSickness = UB.Repository('hr_docRegSickness').attrs(['ID', 'description'])
    .where('parentSicknessID', '=', instanceData.ID)
    .where('orderState', '=', 'POSTED')
    .selectSingle()
  if (parentSickness) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} є {1}, який має статус "Проведено" та є продовженням {2}! Скасування неможливе!', employee['description'], parentSickness.description, instanceData.description)}>>>`)
  }
  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.name', 'periodID.isClosed', 'organizationID', 'orderState'])
    .selectById(instanceData.orderRegistryID)
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)

  const reversal = UB.Repository('hr_accrual')
    .attrs(['ID', 'linkToParentID'])
    .where('orderID', '=', instanceData.ID)
    .where('periodCalcID', '=', currentPeriod.ID)
    .where(`(flagsRec & 512 = 512)`, 'custom')
    .selectAsObject()
  const parentAccruals = UB.Repository('hr_accrual')
    .attrs(['ID', 'flagsRec'])
    .where('ID', 'in', reversal.map(o => o.linkToParentID).filter(o => o))
    .selectAsObject()
  const accrualStore = UB.DataStore('hr_accrual')
  parentAccruals.forEach(accr => {
    accrualStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: accr.ID,
        flagsRec: (accr.flagsRec || 0) & ~(1 << 10)
      }
    })
  })

  orderRegistryService.checkOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID, currentPeriod.ID)
  accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, periodCalcID: currentPeriod.ID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  const accrualPeriods = UB.Repository('hr_accrual')
    .attrs(['periodCalcID'])
    .where('orderID', '=', instanceData.ID)
    .where('periodCalc', '>', currentPeriod.dateFrom)
    .groupBy('periodCalcID')
    .selectAsObject()
  accrualPeriods.forEach(row => {
    accrualService.deleteAccrualsByOrder({ orderID: instanceData.ID, periodCalcID: row.periodCalcID, description: UB.i18n(`Відміна проведення {0}`, instanceData.description) })
  })
  orderRegistryService.updateOrderRegistryState(instanceData.orderRegistryID, 'PROJECT')
  orderRegistryService.clearOrderRegistryDtPeriodCalc(instanceData.ID, instanceData.orderRegistryID)
}

me.getParentSickness = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  if (!mParams.whereList) {
    mParams.whereList = {
      employeeNumberIDs: {
        condition: 'in',
        expression: '[employeeNumberID]',
        value: [0]
      }
    }
  }
  const employeeNumberIDs = mParams.whereList.employeeNumberID.value || (mParams.whereList.employeeNumberID.values && mParams.whereList.employeeNumberID.values.employeeNumberID)
  const dictIllnessReasonID = mParams.whereList.dictIllnessReasonID ? (mParams.whereList.dictIllnessReasonID.value || (mParams.whereList.dictIllnessReasonID.values && mParams.whereList.dictIllnessReasonID.values.dictIllnessReasonID)) : null
  delete mParams.whereList.dictIllnessReasonID

  const employeeFamilyID = mParams.whereList.employeeFamilyID ? (mParams.whereList.employeeFamilyID.value || (mParams.whereList.employeeFamilyID.values && mParams.whereList.employeeFamilyID.values.employeeFamilyID)) : null
  delete mParams.whereList.employeeFamilyID

  let runsql
  let sqlBuilder = {
    text:
      ` SELECT {0} {1} FROM (
        SELECT doc.ID, CONCAT(doc.description, ' (', hir.name, ')') AS description, doc.employeeNumberID, doc.employeePositionID,
            doc.dateFrom, doc.dateTo, doc.dictIllnessReasonID, doc.employeeFamilyID, doc.avgCalcType, doc.standingAll, doc.standingYearMonth,
            doc.rate, doc.dateFromAvg, doc.dateToAvg, doc.avgSum, doc.calcSum, 'docRegSickness' as source, doc.illnessKind, doc.isOnlyFOP
        FROM hr_docRegSickness doc LEFT JOIN hr_dictIllnessReason hir ON doc.dictIllnessReasonID = hir.ID      
        WHERE employeeNumberID ${entityBaseService.getInExpression('employeeNumberIDs')}
          AND doc.mi_deleteDate >= '9999-12-31'
        UNION ALL        
        SELECT ha.ID,
          CASE WHEN ha.dateFrom IS NULL THEN CONCAT(p.description, ' ', dp.name) 
            ELSE CONCAT(p.description, ' з ', ${sqlDialect.dialect === 'MSSQL2012'
    ? `convert(varchar, ha.dateFrom, 104)`
    : `to_char(ha.dateFrom, 'DD.MM.YYYY')`}, ' по ', ${sqlDialect.dialect === 'MSSQL2012'
  ? `convert(varchar, ha.dateTo, 104)` : `to_char(ha.dateTo, 'DD.MM.YYYY')`})         
          END AS description,  ha.employeeNumberID, NULL AS employeePositionID, 
            CASE WHEN ha.dateFrom IS NULL THEN ha.periodSalary ELSE ha.dateFrom END, ha.dateTo, ha.dictIllnessReasonID, NULL AS employeeFamilyID, 
            ha.avgCalcType, ha.standingAll, ha.standingYearMonth, ha.rate, ha.dateFromAvg, ha.dateToAvg, ha.sumAvg as avgSum, ha.paySum as calcSum,
            'accrual' as source, null as illnessKind, null as isOnlyFOP
          FROM hr_accrual ha
          LEFT JOIN hr_dictPeriod dp ON dp.ID=ha.periodSalaryID
          LEFT JOIN hr_payEl p ON ha.payElID=p.ID          
          LEFT JOIN hr_method m ON m.ID=p.methodID
          LEFT JOIN hr_methodGroup g ON m.methodGroupID = g.ID 
        WHERE employeeNumberID ${entityBaseService.getInExpression('employeeNumberIDs')} AND g.code = '5' AND m.code != '41' AND (flagsRec & 8 = 8)
        AND NOT EXISTS(SELECT 1 FROM hr_accrual pa WHERE pa.linkToParentID = ha.ID)
        GROUP BY ha.ID, p.description, ha.dateFrom, ha.dateTo, ha.employeeNumberID, ha.dictIllnessReasonID, ha.avgCalcType, ha.standingAll, ha.standingYearMonth, ha.rate,
  ha.dateFromAvg, ha.dateToAvg, ha.sumAvg, ha.paySum, ha.periodSalary, dp.name   
  ) t        
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      description: { field: 't.description' },
      employeePositionID: { field: 't.employeePositionID' },
      employeeNumberID: { field: 't.employeeNumberID' },
      dateFrom: { field: 't.dateFrom' },
      dateTo: { field: 't.dateTo' },
      dictIllnessReasonID: { field: 't.dictIllnessReasonID' },
      employeeFamilyID: { field: 't.employeeFamilyID' },
      avgCalcType: { field: 't.avgCalcType' },
      standingAll: { field: 't.standingAll' },
      standingYearMonth: { field: 't.standingYearMonth' },
      rate: { field: 't.rate' },
      dateFromAvg: { field: 't.dateFromAvg' },
      dateToAvg: { field: 't.dateToAvg' },
      avgSum: { field: 't.avgSum' },
      calcSum: { field: 't.calcSum' },
      source: { field: 't.source' },
      illnessKind: { field: 't.illnessKind' },
      isOnlyFOP: { field: 't.isOnlyFOP' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)
  sqlBuilder.clauses.whereParams.employeeNumberIDs = employeeNumberIDs
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY t.dateFrom DESC '

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  sqlBuilder.clauses.whereParams.dictIllnessReasonID = dictIllnessReasonID || null
  sqlBuilder.clauses.whereParams.employeeFamilyID = employeeFamilyID || null
  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}

me.addSubEmpOrder = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.params
  const resultOrder = []
  const employeeNumbers = []
  const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'minSalary',
    'maxECB', 'maxECBDay', 'calcSum', 'rate', 'paySum', 'flagsFix', 'flagsRec', 'dateFirst']
  const copyDocRegDtAttr = ['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'periodCalc', 'periodSalary',
    'mask', 'flagsFix', 'flagsRec', 'baseSum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'calcSum', 'planSum', 'koef',
    'periodSalaryID', 'dateFrom', 'dateTo', 'calendarDays', 'days', 'paySum', 'accrualDt' ]
  const additionalAttrs = ['standingAll', 'standingAllInYear', 'standingYearMonth', 'rate']
  const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum', 'accrualDt']
  const order = UB.Repository('hr_docRegSickness')
    .attrs(['ID', 'orderRegistryID', 'empOrderType', 'seria', 'orderNumber', 'orderDate', 'employeeID', 'employeeNumberID',
      'employeePositionID', 'dateFrom', 'dateTo', 'dictIllnessReasonID', 'parentSicknessID', 'employeeFamilyID',
      'calendarDayCount', 'dayCount', 'standingYearMonth', 'workLess6months', 'standingAll', 'standingAllInYear',
      'rate', 'paySum', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'calcSum', 'minSalary', 'maxECB',
      'maxECBDay', 'flagsRec', 'flagsFix', 'notPay', 'isReg', 'sickNotes', 'easyDateFrom', 'easyDateTo',
      'actDate', 'actNumber', 'msekDateFrom', 'msekDateTo', 'msekResult', 'employeeSickLimitID', 'dayFSSU',
      'changedValues', 'dictFundSourceID', 'illnessKind', 'dateFirst',
      'dictIllnessReasonID.payElFSSUID', 'orderRegistryID.periodID', 'orderRegistryID.organizationID'
    ]).selectById(params.orderID)
  const empOrderSicknessDt = UB.Repository('hr_docRegSicknessDt')
    .attrs(['dateFrom', 'dateTo', 'illnessRegime'])
    .where('docRegSicknessID', '=', params.orderID)
    .selectAsObject()
  const parent = order.parentSicknessID ? UB.Repository('hr_docRegSickness')
    .attrs(['ID', 'dictIllnessReasonID', 'dateFrom', 'dateTo']).selectById(order.parentSicknessID) : null
  const sicknessStore = UB.DataStore('hr_docRegSickness')
  if (order) {
    order.dateFrom = dateService.shiftDate(order.dateFrom)
    order.dateTo = dateService.shiftDate(order.dateTo)
    const employeePosition = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'employeeID', 'employeeNumberID'])
      .where('organizationID', '=', order['orderRegistryID.organizationID'])
      .where('employeeID', '=', order.employeeID)
      .where('employeeNumberID', '!=', order.employeeNumberID)
      .where('workPlace', '=', '2')
      .where('dateFrom', '<=', order.dateTo)
      .where('dateTo', '>=', order.dateFrom)
      .orderBy('dateFrom')
      .selectAsObject({
        'ID': 'employeePositionID'
      })
    employeePosition.forEach(row => {
      if (!employeeNumbers.find(o => o.employeeNumberID === row.employeeNumberID)) {
        employeeNumbers.push(row)
      }
    })
    employeeNumbers.forEach(employeeNumber => {
      let existsSickness = false
      const empOrderSickness = UB.Repository('hr_docRegSickness')
        .attrs(['ID', 'orderState'])
        .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
        .where('dictIllnessReasonID', '=', order.dictIllnessReasonID)
        .where('dateFrom', '=', order.dateFrom)
        .where('dateTo', '=', order.dateTo)
        .whereIf(order.employeeFamilyID, 'employeeFamilyID', '=', order.employeeFamilyID)
        .whereIf(order.employeeFamilyID, 'employeeFamilyID', 'isNull')
        .selectAsObject()
      empOrderSickness.forEach(sick => {
        if (!existsSickness) {
          if (sick.orderState === 'PROJECT') {
            existsSickness = true
          } else {
            const timeSheetDayCanceled = UB.Repository('tim_timeSheet')
              .attrs('count([ID])')
              .where('orderID', '=', sick.ID)
              .where('isCanceled', '=', 1)
              .selectScalar()
            if (timeSheetDayCanceled) {
              existsSickness = true
            }
          }
        }
      })
      if (!existsSickness) {
        const doc = Object.assign(Object.assign({ orderState: 'PROJECT' }, order), employeeNumber)
        doc.ID = sicknessStore.generateID()
        doc.dateFirst = null
        const formData = { detail: {
          orderRegistryDt: { insert: [] },
          accrualAvg: { insert: [] },
          docRegSicknessDt: { insert: [] }
        } }
        if (order.parentSicknessID) {
          if (parent.dateFrom) {
            const newParent = UB.Repository('hr_docRegSickness')
              .attrs(['ID', 'dateFirst'])
              .where('employeeNumberID', '=', employeeNumber.employeeNumberID)
              .where('dictIllnessReasonID', '=', parent.dictIllnessReasonID)
              .where('dateFrom', '=', parent.dateFrom)
              .where('dateTo', '=', parent.dateTo)
              .selectSingle() || {}
            doc.parentSicknessID = newParent.ID || null
            doc.dateFirst = newParent.dateFirst ? dateService.shiftDate(newParent.dateFirst) : null
          } else {
            doc.parentSicknessID = null
          }
        }
        const resultData = rlService.calculateOrderAccrual({
          orgID: order['orderRegistryID.organizationID'],
          orderNumber: order.orderNumber,
          // empOrderSicknessID: order.empOrderSicknessID,
          orderDate: order.orderDate,
          orderRegistryID: order.orderRegistryID,
          periodCalcID: order['orderRegistryID.periodID'],
          employeeNumberID: employeeNumber.employeeNumberID,
          dictIllnessReasonID: order.dictIllnessReasonID,
          payElID: order['dictIllnessReasonID.payElFSSUID'],
          parentSicknessID: doc.parentSicknessID,
          dateFirst: doc.dateFirst,
          flagsRec: 2,
          flagsFix: 0,
          dateFrom: order.dateFrom,
          dateTo: order.dateTo,
          accruals: [],
          accrualsAvg: [],
          notPay: false,
          isOnlyFOP: true,
          method: '4', // страховий стаж
          rate: order.rate,
          standingYearMonth: order.standingYearMonth,
          standingAll: order.standingAll,
          standingAllInYear: order.standingAllInYear
        })
        delete doc['orderRegistryID.organizationID']
        delete doc['orderRegistryID.periodID']
        delete doc['dictIllnessReasonID.payElFSSUID']
        copyDocAttr.forEach(attrName => {
          doc[attrName] = resultData[attrName]
        })

        additionalAttrs.forEach(attr => {
          doc[attr] = resultData[attr]
        })

        doc.avgSum = resultData.baseSum
        resultData.accruals.forEach(accr => {
          const accrual = {}
          copyDocRegDtAttr.forEach(attrName => {
            accrual[attrName] = accr[attrName]
          })
          accrual.orderRegistryID = order.orderRegistryID
          accrual.orderID = doc.ID
          accrual.empOrderID = doc.empOrderID
          accrual.dictIllnessReasonID = doc.dictIllnessReasonID
          accrual.parentSicknessID = doc.parentSicknessID
          accrual.orderDateFrom = doc.dateFrom
          accrual.orderDateTo = doc.dateTo
          accrual.periodCalcID = null
          accrual.periodCalc = null
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

        // копіюємо детальну частину лікарняного
        empOrderSicknessDt.forEach(item => {
          formData.detail.docRegSicknessDt.insert.push(item)
        })
        sicknessStore.run('insert', {
          formData: JSON.stringify(formData),
          execParams: doc
        })

        resultOrder.push(doc.ID)
      }
    })

    mParams.resultData = JSON.stringify(resultOrder)
  }
}
