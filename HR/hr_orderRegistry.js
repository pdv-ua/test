const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')
const orderRegistryService = require('../HR/modules/orderRegistryService')
const rlService = require('../HR/modules/rlService')
const periodService = require('../HR/modules/periodService')
const payElService = require('../HR/modules/payElService')
const algorithmService = require('../HR/modules/algorithmService')
const timService = require('../HR/modules/timService')
const employeeService = require('../HR/modules/employeeService')
const docRegService = require('../HR/modules/docRegService')
const contService = require('../HR/modules/contService')
const orgService = require('../HR/modules/orgService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('insert:after', afterInsert)
me.on('delete:before', beforeDelete)

me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('getOrderNum')
me.entity.addMethod('calcRegistryPremium')
me.entity.addMethod('calcRegistryNetSum')
me.entity.addMethod('calcRegistryExtraPay')
me.entity.addMethod('calculateExtraPay')
me.entity.addMethod('calcRegistryRequestEmp')
me.entity.addMethod('fillRegistryAccrualPay')
me.entity.addMethod('createPayOrder')
me.entity.addMethod('setAllowPostingForOrders')
me.entity.addMethod('cancelPayOrder')
me.entity.addMethod('getPeriodsOnDates')
me.entity.addMethod('checkParentVacationPeriods')
me.entity.addMethod('changeEmpOrderState')
me.entity.addMethod('doPostingDocReg')
me.entity.addMethod('cancelPostingDocReg')
me.entity.addMethod('doReversalDocReg')
me.entity.addMethod('doCancelReversalDocReg')
me.entity.addMethod('correctionOrderState')
me.entity.addMethod('search')
me.entity.addMethod('calcRegistryWorkShift')
me.entity.addMethod('calcRegistryReserve')
me.entity.addMethod('loadRegistryPremium')
me.entity.addMethod('getEmployeePremiumList')
me.entity.addMethod('loadCsvFile')

me.details = [
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryPremium',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code', 'baseSum', 'rate', 'paySum', 'periodCalcID',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'dateFromAvg', 'dateToAvg', 'calcSum', 'extraRate', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'dictFundSourceID',
      'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name', 'periodSalaryID.name', 'paySumAccrual',
      'paySumOff', 'rateOff', 'additionalRate', 'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName',
      'KPI', 'calcParams'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryNetSum',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code', 'baseSum', 'rate', 'paySum', 'periodCalcID',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'dateFromAvg', 'dateToAvg', 'calcSum', 'extraRate', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'dictFundSourceID',
      'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name', 'periodSalaryID.name', 'paySumAccrual',
      'paySumOff', 'rateOff', 'additionalRate', 'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName',
      'KPI', 'calcParams', 'planSumAvg', 'sumAvg', 'calculatedSum'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryRequestEmp',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code', 'baseSum', 'rate', 'paySum', 'periodCalcID',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'dateFromAvg', 'dateToAvg', 'calcSum', 'extraRate', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'dictFundSourceID',
      'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name', 'periodSalaryID.name', 'paySumAccrual',
      'paySumOff', 'rateOff', 'additionalRate', 'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryBalanceCorr',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code', 'baseSum', 'rate', 'paySum', 'periodCalcID',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'dateFromAvg', 'dateToAvg', 'calcSum', 'extraRate', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'dictFundSourceID',
      'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name', 'periodSalaryID.name', 'paySumAccrual',
      'paySumOff', 'rateOff', 'additionalRate', 'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryExtraPay',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.tabNum', 'employeeNumberID.mtCount', 'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code', 'baseSum', 'rate', 'paySum', 'periodCalcID',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'dateFromAvg', 'dateToAvg', 'calcSum', 'extraRate', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'flagsFixDoc',
      'periodSalaryID.name', 'dictFundSourceID', 'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name',
      'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryAccrualPay',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'paySum', 'periodCalcID', 'payElID.description',
      'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'flagsRec',
      'posName', 'depName', 'accrualDt', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'flagsFixDoc',
      'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDt',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryWorkShift',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'payElID.description', 'payElID.methodID.code',
      'dictTechID', 'dictTechID.description',
      'dictWorkOperationID', 'dictWorkOperationID.description',
      'payment', 'payment.name', 'dictWorkOperationID.dictMeasureID.symbolUkr', 'norm', 'planQuantity', 'yield',
      'baseSum', 'paySum', 'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'days', 'hours', 'flagsRec',
      'planHours', 'planDays', 'posName', 'depName', 'accrualDt',
      'employeeNumberID.mi_deleteUser', 'employeeNumberID.dateToEmpty', 'employeeNumberID.workPlaceCode', 'dictFundSourceID',
      'dictFundSourceID.description', 'dictFundSourceID.name', 'periodCalcID.name', 'periodSalaryID.name',
      'tabNum', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName'
    ], ['lineNum'])
  },
  {
    detailName: 'docRegNomenclature',
    entityName: 'hr_docRegNomenclature',
    orderType: 'hr_orderRegistryWorkShift',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'dictTechID', 'dictTechID.description', 'nomenclatureID', 'nomenclatureID.description',
      'norm', 'planQuantity', 'quantity', 'paySum', 'flagsFix', 'mi_createDate', 'mi_modifyDate'
    ], ['lineNum'])
  },
  {
    detailName: 'docRegMaterial',
    entityName: 'hr_docRegMaterial',
    orderType: 'hr_orderRegistryWorkShift',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'dictTechID', 'dictTechID.description',
      'nomenclatureID', 'nomenclatureID.description',
      'norm', 'planQuantity', 'quantity', 'flagsFix', 'mi_createDate', 'mi_modifyDate'
    ], ['lineNum'])
  },
  {
    detailName: 'orderRegistryDtRD',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryReserve',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'tabNum', 'employeeNumberID.description', 'payElID.description', 'payFundID.description',
      'baseSum', 'rate', 'paySum', 'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix',
      'dateFrom', 'dateTo', 'mask', 'flagsRec', 'posName', 'depName', 'calcSum', 'accrualDt', 'accrualAddDt', 'sumFrom', 'accruedSum',
      'usedSum', 'sumTo', 'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateToEmpty'
    ], ['lineNum']),
    defaultValue: { dtType: 'rd' }
  },
  {
    detailName: 'orderRegistryDtRL',
    entityName: 'hr_orderRegistryDt',
    orderType: 'hr_orderRegistryReserve',
    docIDName: 'orderRegistryID',
    fieldList: orderService.setFieldListAttribute([
      'tabNum', 'employeeNumberID.description', 'planSum', 'avgDays', 'calcSum', 'calendarDays', 'baseSum', 'rate', 'paySum', 'accruedSum',
      'periodCalcID', 'periodCalc', 'periodSalaryID', 'periodSalary', 'flagsFix', 'dateFrom', 'dateTo', 'mask', 'flagsRec',
      'posName', 'depName', 'accrualDt', 'accrualAddDt',
      'mi_createDate', 'mi_modifyDate', 'mi_modifyUser.fullName', 'mi_createUser.fullName',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateToEmpty'
    ], ['lineNum']),
    defaultValue: { dtType: 'ri' }
  }
]

// Перелік документів, що можуть проводитись частково.
let orderRegistryDtPartiallyPost = [
  global['hr_docRegVacation'],
  global['hr_docRegVacationUnpaid'],
  global['hr_docRegBusinessTrip'],
  global['hr_docRegVacationCompensation'],
  global['hr_docRegVacationKid'],
  global['hr_docRegAvgPay'],
  global['hr_docRegAvgLongPay'],
  global['hr_docRegSickness'],
  global['hr_docRegAvgMonth'],
  global['hr_docRegSupAvgEarn'],
  global['hr_docRegEasyWork'],
  global['hr_docRegFuneral'],
  global['hr_docRegFuneralComp'],
  global['hr_docRegShift']
]

orderRegistryDtPartiallyPost.forEach(orderEntity => {
  orderEntity.on('insert:after', afterInsertDt)
})

function afterInsertDt (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderRegistryID) {
    const orderRegistry = UB.Repository('hr_orderRegistry')
      .attrs('orderState')
      .where('ID', '=', execParams.orderRegistryID)
      .selectSingle()
    if (orderRegistry.orderState === 'POSTED') {
      orderRegistryService.updateOrderRegistryState(execParams.orderRegistryID, 'PARTIALLY')
    }
  }
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
  const execParams = ctx.mParams.execParams
  const boolAttr = ['includeSubDep', 'includeSubDepGroup', 'isOnlyPositive', 'dailyWage', 'checkBalance']
  boolAttr.forEach(attrName => {
    if (execParams[attrName] === undefined) {
      execParams[attrName] = 0
    }
  })
  if (execParams.orderType !== 'hr_orderRegistryExtraPay' && execParams.orderType !== 'hr_orderRegistryAccrualPay' && !execParams.docNumber) {
    execParams.docNumber = orderService.getOrderNum(__entityName, execParams.orderDate, execParams.organizationID)
  }
  execParams.description = `${execParams.name || ''} [${execParams.orderNumber}]`
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  const execParams = ctx.mParams.execParams
  setDefaultAttribute(ctx)
  const detail = me.details.filter(o => o.orderType === (execParams.orderType || instanceData.orderType))
  if (detail.length) {
    orderService.saveDetails(ctx, detail, { skipOrderDelete: true })
  }
  if (instanceData.orderType !== 'hr_orderRegistryExtraPay' && instanceData.orderType !== 'hr_orderRegistryAccrualPay' && execParams.docNumber === null && !instanceData.docNumber) {
    execParams.docNumber = orderService.getOrderNum(__entityName, execParams.orderDate, execParams.organizationID)
  }
  execParams.description = `${execParams.name || instanceData.name || ''} [${execParams.orderNumber || instanceData.orderNumber}]`
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const detail = me.details.filter(o => o.orderType === execParams.orderType)
  if (detail.length) {
    orderService.saveDetails(ctx, detail)
    ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, detail)
  }
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
  const detail = me.details.filter(o => o.orderType === (execParams.orderType || instanceData.orderType))
  if (detail.length) {
    ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, detail)
  }
}
function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  const detailsCount = UB.Repository('hr_orderRegistryDt')
    .attrs('COUNT(*)')
    .where('orderRegistryID', '=', ctx.mParams.execParams.ID)
    .misc({ __skipRls: true })
    .selectScalar()
  if (instanceData.get('empOrderID') && !ctx.mParams.skipEmpOrder) {
    const orderState = UB.Repository('hr_order')
      .attrs('orderState')
      .where('ID', '=', instanceData.get('empOrderID'))
      .selectScalar()
    if (detailsCount && orderState === 'PROCESSED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - сформовано з наказу по персоналу. Видалення неможливе.', instanceData.get('description'))}>>>`)
    }
  }
  if (detailsCount) {
    const orders = UB.Repository('hr_order').attrs(['ID', 'orderClass.entityName'])
      .exists(UB.Repository('hr_orderRegistryDt').correlation('orderID', 'ID').where('orderRegistryID', '=', ctx.mParams.execParams.ID).misc({ __skipRls: true }))
      .selectAsObject()
    orderService.beforeDeleteOrder(ctx)
    if (!instanceData.get('empOrderID') && !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess') &&
      UB.Repository('hr_orderRegistryDt')
        .attrs(['ID', 'mi_modifyDate', 'employeeNumberID.limitedAccess'])
        .where('orderRegistryID', '=', ctx.mParams.execParams.ID)
        .where('employeeNumberID.limitedAccess', '=', 1)
        .misc({ __skipRls: true })
        .selectSingle()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Відсутні права на видалення документа нарахування')}>>>`)
    }
    orders.forEach(row => {
      const store = UB.DataStore(row['orderClass.entityName'])
      Session.runAsAdmin(function () {
        store.run('delete', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID
          }
        })
      })
    })
  }
}
function afterSelect (ctx) {
  const mParams = ctx.mParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }

  if (instanceData.orderType !== 'hr_orderRegistryPremium' &&
    instanceData.orderType !== 'hr_orderRegistryNetSum' &&
    instanceData.orderType !== 'hr_orderRegistryExtraPay' &&
    instanceData.orderType !== 'hr_orderRegistryAccrualPay' &&
    instanceData.orderType !== 'hr_orderRegistryRequestEmp' &&
    instanceData.orderType !== 'hr_orderRegistryWorkShift' &&
    instanceData.orderType !== 'hr_orderRegistryReserve' &&
    instanceData.orderType !== 'hr_orderRegistryBalanceCorr'
  ) {
    return
  }

  if (mParams.ID && !mParams.execParams && ctx.dataStore.get('orderType')) {
    const detail = me.details.filter(o => o.orderType === (ctx.dataStore.get('orderType')))
    if (detail.length) {
      ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, detail)
    }
  }
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }
  if (!execParams.orderDate && !instanceData.orderDate) {
    const period = UB.Repository('hr_dictPeriod').attrs(['dateFrom', 'description']).selectById(execParams.periodID || instanceData.periodID)
    if (execParams.periodID) {
      execParams.orderDate = dateService.shiftDate(period.dateFrom)
    }
  }
  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

me.doPosting = function (ctx) {
  let accruals = []
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.name', 'periodID.dateFrom', 'periodID.dateTo', 'periodID.isClosed',
      'organizationID', 'description', 'payElID', 'orderDate', 'payElID.methodID.code'])
    .selectById(execParams.ID)

  order.orderDate = dateService.shiftDate(order.orderDate)

  const payEls = payElService.getPayEl({ orgID: order.organizationID, getAll: false })
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const postingPeriod = currentPeriod.dateFrom < dateService.shiftDate(order['periodID.dateFrom'])
    ? { ID: order.periodID, dateFrom: dateService.shiftDate(order['periodID.dateFrom']), dateTo: dateService.shiftDate(order['periodID.dateTo']) }
    : { ID: currentPeriod.ID, dateFrom: currentPeriod.dateFrom, dateTo: currentPeriod.dateTo }

  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name', 'employeeNumberID.dateTo', 'periodSalaryID.pYear', 'periodSalaryID.dictMonthID'])
    .where('orderRegistryID', '=', execParams.ID)
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .selectAsObject()
  const maxDate = dateService.maxDate()
  switch (order.orderType) {
    case 'hr_orderRegistryPremium':
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
        let childCurrentPeriod
        let childSalaryPeriod
        let childOrgID
        let orgID = order.organizationID
        if (payEls[order.payElID].isLastEmployeeNumber && dateService.shiftDate(row['employeeNumberID.dateTo']) < maxDate &&
          dateService.shiftDate(row['employeeNumberID.dateTo']) < postingPeriod.dateTo) {
          const empChild = employeeService.getChildEmpNumberIDs(row.employeeNumberID)
          if (empChild) {
            childOrgID = empChild.orgID
            childCurrentPeriod = periodService.getCurrentPeriod(empChild.orgID)
            childSalaryPeriod = periodService.getPeriodByParams(empChild.orgID, row['periodSalaryID.pYear'], row['periodSalaryID.dictMonthID'])
            row.employeeNumberID = empChild.ID
            row.flagsFix = row.flagsFix | 1 << 1
          }
        }
        if (order['payElID.methodID.code'] === '47') {
          const df = childSalaryPeriod ? childSalaryPeriod.dateFrom : dateService.shiftDate(row.periodSalary)
          const dt = dateService.lastDayOfMonth(df)
          const onDate = (order.orderDate >= df && order.orderDate <= dt) ? order.orderDate : (order.orderDate < df ? df : dt)
          row.dateFrom = onDate
          row.dateTo = onDate
        }

        accruals.push({
          orgID: childOrgID || orgID,
          orderID: execParams.ID,
          orderDtID: row.ID,
          periodCalcID: childCurrentPeriod ? childCurrentPeriod.ID : postingPeriod.ID,
          periodSalaryID: childSalaryPeriod ? childSalaryPeriod.ID : row.periodSalaryID,
          periodCalc: childCurrentPeriod ? childCurrentPeriod.dateFrom : postingPeriod.dateFrom,
          periodSalary: childSalaryPeriod ? childSalaryPeriod.dateFrom : row.periodSalary,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          flagsRec: 2,
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
          calculateDate: new Date(),
          linkToParentID: row.linkToParentID,
          linkToChildID: row.linkToChildID,
          accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
          sumAvg: row.calcSum,
          dateFromAvg: row.dateFromAvg,
          dateToAvg: row.dateToAvg,
          extraRate: row.extraRate,
          orderDateFrom: row.orderDateFrom,
          orderDateTo: row.orderDateTo,
          dictFundSourceID: row.dictFundSourceID,
          paySumAccrual: row.paySumAccrual,
          paySumOff: row.paySumOff,
          rateOff: row.rateOff,
          calcParams: row.calcParams
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryNetSum':
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
        let childCurrentPeriod
        let childSalaryPeriod
        let childOrgID
        let orgID = order.organizationID
        if (payEls[order.payElID].isLastEmployeeNumber && dateService.shiftDate(row['employeeNumberID.dateTo']) < maxDate &&
          dateService.shiftDate(row['employeeNumberID.dateTo']) < postingPeriod.dateTo) {
          const empChild = employeeService.getChildEmpNumberIDs(row.employeeNumberID)
          if (empChild) {
            childOrgID = empChild.orgID
            childCurrentPeriod = periodService.getCurrentPeriod(empChild.orgID)
            childSalaryPeriod = periodService.getPeriodByParams(empChild.orgID, row['periodSalaryID.pYear'], row['periodSalaryID.dictMonthID'])
            row.employeeNumberID = empChild.ID
            row.flagsFix = row.flagsFix | 1 << 1
          }
        }
        if (order['payElID.methodID.code'] === '47') {
          const df = childSalaryPeriod ? childSalaryPeriod.dateFrom : dateService.shiftDate(row.periodSalary)
          const dt = dateService.lastDayOfMonth(df)
          const onDate = (order.orderDate >= df && order.orderDate <= dt) ? order.orderDate : (order.orderDate < df ? df : dt)
          row.dateFrom = onDate
          row.dateTo = onDate
        }

        accruals.push({
          orgID: childOrgID || orgID,
          orderID: execParams.ID,
          orderDtID: row.ID,
          periodCalcID: childCurrentPeriod ? childCurrentPeriod.ID : postingPeriod.ID,
          periodSalaryID: childSalaryPeriod ? childSalaryPeriod.ID : row.periodSalaryID,
          periodCalc: childCurrentPeriod ? childCurrentPeriod.dateFrom : postingPeriod.dateFrom,
          periodSalary: childSalaryPeriod ? childSalaryPeriod.dateFrom : row.periodSalary,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          flagsRec: 2,
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
          calculateDate: new Date(),
          linkToParentID: row.linkToParentID,
          linkToChildID: row.linkToChildID,
          accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
          sumAvg: row.calcSum,
          dateFromAvg: row.dateFromAvg,
          dateToAvg: row.dateToAvg,
          extraRate: row.extraRate,
          orderDateFrom: row.orderDateFrom,
          orderDateTo: row.orderDateTo,
          dictFundSourceID: row.dictFundSourceID,
          paySumAccrual: row.paySumAccrual,
          paySumOff: row.paySumOff,
          rateOff: row.rateOff,
          planSumAvg: row.planSumAvg,
          calculatedSum: row.calculatedSum,
          calcParams: row.calcParams
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryAccrualPay':
      detail.forEach(row => {
        storeDt.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            periodCalcID: currentPeriod.ID,
            periodCalc: currentPeriod.dateFrom
          }
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryExtraPay':
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
          orderID: execParams.ID,
          orderDtID: row.ID,
          periodCalcID: postingPeriod.ID,
          periodSalaryID: row.periodSalaryID,
          periodCalc: postingPeriod.dateFrom,
          periodSalary: row.periodSalary,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          flagsRec: 2,
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
          calculateDate: new Date(),
          linkToParentID: row.linkToParentID,
          linkToChildID: row.linkToChildID,
          accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
          sumAvg: row.calcSum,
          dateFromAvg: row.dateFromAvg,
          dateToAvg: row.dateToAvg,
          extraRate: row.extraRate,
          orderDateFrom: row.orderDateFrom,
          orderDateTo: row.orderDateTo
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryRequestEmp':
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
          orderID: execParams.ID,
          orderDtID: row.ID,
          periodCalcID: postingPeriod.ID,
          periodSalaryID: row.periodSalaryID,
          periodCalc: postingPeriod.dateFrom,
          periodSalary: row.periodSalary,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          flagsRec: 2,
          flagsFix: row.flagsFix,
          planHours: row.planHours,
          planDays: row.planDays,
          baseSum: row.baseSum,
          rate: row.rate,
          days: row.days,
          hours: row.hours,
          mask: row.mask,
          maskAdd: row.maskAdd,
          mtCount: row.mtCount,
          paySum: row.paySum,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          calculateDate: new Date(),
          accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
          orderDateFrom: row.orderDateFrom,
          orderDateTo: row.orderDateTo
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryBalanceCorr':
      detail.forEach(row => {
        if (row.periodSalaryID !== postingPeriod.ID) {
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
          orderID: execParams.ID,
          orderDtID: row.ID,
          periodCalcID: postingPeriod.ID,
          periodSalaryID: row.periodSalaryID,
          periodCalc: postingPeriod.dateFrom,
          periodSalary: row.periodSalary,
          employeeNumberID: row.employeeNumberID,
          payElID: row.payElID,
          flagsRec: 2,
          flagsFix: row.flagsFix,
          mask: 0,
          maskAdd: 0,
          paySum: 0,
          dateFrom: row.periodSalary,
          dateTo: row.periodSalary,
          calculateDate: new Date(),
          accrualDt: [{ paySum: -1 * row.paySum, dictFundSourceID: row.dictFundSourceID }, { paySum: row.paySum, dictFundSourceID: execParams.dictFundSourceID }]
        })
      })
      accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryReserve':
      const accrualFunds = []
      const balanceVacation = []
      detail.forEach(row => {
        if (row.dtType === 'rd') {
          if (row.periodCalcID !== currentPeriod.ID || row.periodSalaryID !== currentPeriod.ID) {
            storeDt.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.ID,
                periodCalcID: currentPeriod.ID,
                periodCalc: currentPeriod.dateFrom,
                periodSalaryID: currentPeriod.ID,
                periodSalary: currentPeriod.dateFrom
              }
            })
          }
          if (row.payElID) {
            accruals.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              periodCalcID: currentPeriod.ID,
              periodCalc: currentPeriod.dateFrom,
              periodSalaryID: currentPeriod.ID,
              periodSalary: currentPeriod.dateFrom,
              employeeNumberID: row.employeeNumberID,
              payElID: row.payElID,
              flagsRec: 2 | 1 << 13,
              flagsFix: row.flagsFix,
              mask: row.mask,
              paySum: row.paySum || 0,
              dateFrom: currentPeriod.dateFrom,
              dateTo: currentPeriod.dateTo,
              calculateDate: new Date(),
              accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
            })
            balanceVacation.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              employeeNumberID: row.employeeNumberID,
              periodCalcID: currentPeriod.nextPeriodID,
              payElID: row.payElID,
              sumFrom: row.baseSum || 0,
              accrualDt: row.accrualAddDt || '[]'
            })
          } else if (row.payFundID) {
            accrualFunds.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              periodCalcID: currentPeriod.ID,
              periodCalc: currentPeriod.dateFrom,
              periodSalaryID: currentPeriod.ID,
              periodSalary: currentPeriod.dateFrom,
              employeeNumberID: row.employeeNumberID,
              payFundID: row.payFundID,
              rate: row.rate,
              // sourceSum: row.calcSum,
              // baseSum: row.calcSum,
              paySum: row.paySum || 0,
              accrualFundDt: row.accrualDt ? JSON.parse(row.accrualDt) : []
            })
            balanceVacation.push({
              orgID: order.organizationID,
              orderID: execParams.ID,
              orderDtID: row.ID,
              employeeNumberID: row.employeeNumberID,
              periodCalcID: currentPeriod.nextPeriodID,
              payFundID: row.payFundID,
              rate: row.rate,
              sumFrom: row.baseSum || 0,
              accrualDt: row.accrualAddDt || '[]'
            })
          }
        }
      })
      const balanceVacationStore = UB.DataStore('hr_balanceVacation')
      balanceVacation.forEach(vacation => {
        vacation.ID = accrualService.getID('S_HR_BALANCEVACATION')
        balanceVacationStore.run('insert', {
          __skipOptimisticLock: true,
          __skipSelectAfterInsert: true,
          __skipRls: true,
          __skipAclRls: true,
          execParams: vacation
        })
      })
      accrualService.saveFundAccruals({ accrualFunds, startCalc: false })
      accrualService.saveAccruals({ accruals, calcBalance: 1, description: UB.i18n(`Проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryVacation':
      doPostingOrderRegistry(execParams.ID, 'hr_docRegVacation', payEls)
      doPostingOrderRegistry(execParams.ID, 'hr_docRegBountyHelp', payEls)
      break
    case 'hr_orderRegVacationCompensation': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegVacationCompensation', payEls)
      break
    }
    case 'hr_orderRegistryVacationKid': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegVacationKid', payEls)
      break
    }
    case 'hr_orderRegistryVacationUnpaid': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegVacationUnpaid', payEls)
      break
    }
    case 'hr_orderRegistryBusinessTrip': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegBusinessTrip', payEls)
      break
    }
    case 'hr_orderRegistryAvgPay': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegAvgPay', payEls)
      break
    }
    case 'hr_orderRegistryRenewal': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegRenewal', payEls)
      break
    }
    case 'hr_orderRegistrySickness': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegSickness', payEls)
      break
    }
    case 'hr_orderRegistryFuneral': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegFuneral', payEls)
      break
    }
    case 'hr_orderRegistryFuneralComp': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegFuneralComp', payEls)
      break
    }
    case 'hr_orderRegistryDogCPHPay': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegDogCPHPay', payEls)
      break
    }
    case 'hr_orderRegistrySinglePay': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegSinglePay', payEls)
      break
    }
    case 'hr_orderRegistryBenefit': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegBenefit', payEls)
      break
    }
    case 'hr_orderRegistryBountyHelp': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegBountyHelp', payEls)
      break
    }
    case 'hr_orderRegistrySingleDeduction': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegSingleDeduction', payEls)
      break
    }
    case 'hr_orderRegistrySeverancePay': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegSeverancePay', payEls)
      break
    }
    case 'hr_orderRegistryUnpaidAbsence': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegUnpaidAbsence', payEls)
      break
    }
    case 'hr_orderRegistryEasyWork':
      doPostingOrderRegistry(execParams.ID, 'hr_docRegEasyWork', payEls)
      break
    case 'hr_orderRegistrySupAvgEarn': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegSupAvgEarn', payEls)
      break
    }
    case 'hr_orderRegistryHourPay': {
      doPostingOrderRegistry(execParams.ID, 'hr_docRegHourPay', payEls)
      break
    }
    case 'hr_orderRegistryWorkShift': {
      cancelPostWorkShift(order, order.ID, payEls)
      postWorkShift(order, order.ID, payEls)
      break
    }
  }
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.name', 'periodID.isClosed', 'description', 'payElID', 'organizationID'])
    .selectById(execParams.ID)

  const closedDetail = UB.Repository('hr_orderRegistryDt')
    .attrs('ID')
    .where('orderRegistryID', '=', execParams.ID)
    .where('periodCalcID.isClosed', '=', 1)
    .selectSingle()

  if (closedDetail) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо відмінити проведення документа нарахування у закритому періоді {0}', order['periodID.name'])}>>>`)
  }
  const detail = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.name'])
    .where('orderRegistryID', '=', execParams.ID)
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .selectAsObject()
  const storeDt = UB.DataStore('hr_orderRegistryDt')
  switch (order.orderType) {
    case 'hr_orderRegistryAccrualPay':
      detail.forEach(row => {
        storeDt.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            periodCalcID: null,
            periodCalc: null
          }
        })
      })
      break
    case 'hr_orderRegistryPremium':
    case 'hr_orderRegistryNetSum':
    case 'hr_orderRegistryExtraPay':
    case 'hr_orderRegistryBalanceCorr':
      detail.forEach(row => {
        storeDt.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            periodCalcID: null,
            periodCalc: null
          }
        })
      })
      accrualService.deleteAccrualsByOrder({ orderID: execParams.ID, description: UB.i18n(`Відміна проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryReserve':
      accrualService.deleteFundAccrualsByOrder({ orderID: execParams.ID, startCalc: false, description: UB.i18n(`Відміна проведення {0}`, order.description) })
      accrualService.deleteAccrualsByOrder({ orderID: execParams.ID, description: UB.i18n(`Відміна проведення {0}`, order.description) })
      const balanceVacationStore = UB.DataStore('hr_balanceVacation')
      balanceVacationStore.execSQL(`DELETE FROM hr_balanceVacation WHERE orderID = :orderID:`, { orderID: execParams.ID })
      break
    case 'hr_orderRegistryRequestEmp':
      accrualService.deleteAccrualsByOrder({ orderID: execParams.ID, description: UB.i18n(`Відміна проведення {0}`, order.description) })
      break
    case 'hr_orderRegistryVacation':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegBountyHelp')
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegVacation')
      break
    case 'hr_orderRegistryVacationKid':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegVacationKid')
      break
    case 'hr_orderRegVacationCompensation':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegVacationCompensation')
      break
    case 'hr_orderRegistryVacationUnpaid':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegVacationUnpaid')
      break
    case 'hr_orderRegistryUnpaidAbsence':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegUnpaidAbsence')
      break
    case 'hr_orderRegistryBusinessTrip':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegBusinessTrip')
      break
    case 'hr_orderRegistryAvgPay':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegAvgPay')
      break
    case 'hr_orderRegistryRenewal':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegRenewal')
      break
    case 'hr_orderRegistryBountyHelp':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegBountyHelp')
      break
    case 'hr_orderRegistrySickness':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegSickness')
      break
    case 'hr_orderRegistryFuneral':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegFuneral')
      break
    case 'hr_orderRegistryFuneralComp':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegFuneralComp')
      break
    case 'hr_orderRegistryDogCPHPay':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegDogCPHPay')
      break
    case 'hr_orderRegistrySinglePay':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegSinglePay')
      break
    case 'hr_orderRegistryBenefit':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegBenefit')
      break
    case 'hr_orderRegistrySingleDeduction':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegSingleDeduction')
      break
    case 'hr_orderRegistrySeverancePay':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegSeverancePay')
      break
    case 'hr_orderRegistryEasyWork':
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegEasyWork')
      break
    case 'hr_orderRegistrySupAvgEarn': {
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegSupAvgEarn')
      break
    }
    case 'hr_orderRegistryHourPay': {
      cancelPostingOrderRegistry(execParams.ID, 'hr_docRegHourPay')
      break
    }
    case 'hr_orderRegistryWorkShift': {
      const payEls = payElService.getPayEl({ orgID: order.organizationID, getAll: false })
      cancelPostWorkShift(order, order.ID, payEls)
      postWorkShift(order, null, payEls)
      break
    }
  }
}

me.calcRegistryPremium = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const result = rlService.calculateAccrual({
    orgID: params.orgID,
    payElParams: params.payElParams,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID,
    orderParams: params.orderParams
  })
  const dictFundSources = UB.Repository('ac_fundSource')
    .attrs(['ID', 'name', 'description'])
    .where('ID', 'in', result.map(o => o.dictFundSourceID).filter(o => o))
    .selectAsObject()
  result.forEach(row => {
    const fs = dictFundSources.find(o => o.ID === row.dictFundSourceID)
    row['dictFundSourceID.name'] = fs ? fs.name : null
  })
  mParams.resultData = JSON.stringify(result)
}

me.calcRegistryNetSum = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const result = rlService.calculateAccrual({
    orgID: params.orgID,
    payElParams: params.payElParams,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID,
    orderParams: params.orderParams
  })
  const dictFundSources = UB.Repository('ac_fundSource')
    .attrs(['ID', 'name', 'description'])
    .where('ID', 'in', result.map(o => o.dictFundSourceID).filter(o => o))
    .selectAsObject()
  result.forEach(row => {
    const fs = dictFundSources.find(o => o.ID === row.dictFundSourceID)
    row['dictFundSourceID.name'] = fs ? fs.name : null
  })
  mParams.resultData = JSON.stringify(result)
}

me.calcRegistryExtraPay = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.payElParams) {
    params.payElParams = []
  }
  const periodSalary = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('ID', 'in', params.payElParams.map(row => row.periodSalaryID))
    .selectAsObject()
  periodSalary.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  params.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    row.dateFromCalc = dateService.shiftDate(row.dateFrom)
    row.dateToCalc = dateService.shiftDate(row.dateTo)
    const period = periodSalary.find(o => o.ID === row.periodSalaryID)
    if (period) {
      row.dateFrom = dateService.shiftDate(period.dateFrom)
      row.dateTo = dateService.shiftDate(period.dateTo)
      if (row.dateFromCalc < period.dateFrom) row.dateFromCalc = period.dateFrom
      if (row.dateToCalc > period.dateTo) row.dateToCalc = period.dateTo
    }
    row.payRate = row.rate
    row.flagsFix = (row.flagsFix || 0) | 1 << 9
    row.rate = 100
    row.fromExtraPay = true
  })
  const result = me.calculateExtraPay(params)
  const dictFundSources = UB.Repository('ac_fundSource')
    .attrs(['ID', 'name', 'description'])
    .where('ID', 'in', result.map(o => o.dictFundSourceID).filter(o => o))
    .selectAsObject()
  result.forEach(row => {
    const fs = dictFundSources.find(o => o.ID === row.dictFundSourceID)
    row['dictFundSourceID.name'] = fs ? fs.name : null
  })
  mParams.resultData = JSON.stringify(result)
}

me.calculateExtraPay = function (params) {
  const result = rlService.calculateAccrual({
    orgID: params.orgID,
    payElParams: params.payElParams,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID
  })
  result.forEach(row => {
    if (row) {
      const param = params.payElParams.find(o => o.idx === row.idx) || {}
      row.paySum = ((params.baseSum || row.flagsFix & 2) ? row.paySum : row.paySum * (param.payRate || 0) / 100) || 0
      algorithmService.correctAccrualDt(row.accrualDt, row.paySum)
      row.rate = param.payRate
      row.dateFrom = param.dateFromCalc
      row.dateTo = param.dateToCalc
      row['periodSalaryID.name'] = UB.Repository('hr_dictPeriod').attrs('name').where('ID', '=', row.periodSalaryID).selectScalar()
    }
  })
  return result
}

me.calcRegistryRequestEmp = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const result = rlService.calculateAccrual({
    orgID: params.orgID,
    payElParams: params.payElParams,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID,
    orderParams: params.orderParams
  })
  const dictFundSources = UB.Repository('ac_fundSource')
    .attrs(['ID', 'name', 'description'])
    .where('ID', 'in', result.map(o => o.dictFundSourceID).filter(o => o))
    .selectAsObject()
  result.forEach(row => {
    const fs = dictFundSources.find(o => o.ID === row.dictFundSourceID)
    row['dictFundSourceID.name'] = fs ? fs.name : null
  })
  mParams.resultData = JSON.stringify(result)
}

me.fillRegistryAccrualPay = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.params
  const store = UB.DataStore('hr_accrual')
  const payElParams = (params.payElParams || []).join(',')
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  store.runSQL(`
        select a.ID "ID", a.employeeNumberID "employeeNumberID", a.paySum "paySum", 
        a.periodCalcID as "periodSalaryID", a.periodCalc as "periodSalary",
        a.payElID "payElID", p.description as "payElID.description", mg.code "mgCode",
        0 as baseSum,
        0 as flagsFix,
        0 as flagsRec,
        0 as mask,
        a.dateFrom as "dateFrom",
        a.dateTo as "dateTo"
        from hr_accrual a
        join hr_employeeNumber n on n.ID = a.employeeNumberID and n.orgID = :orgID:
        join hr_payEl p on p.ID = a.payElID
        join hr_method m ON m.ID = p.methodID
        join hr_methodGroup mg ON mg.ID = m.methodGroupID
        where a.payElID in (${payElParams})
        and a.periodCalcID = :periodCalcID:
        and (CAST(:periodSalaryID: AS BigInt) is null or a.periodSalaryID = :periodSalaryID:)
        and (a.flagsRec & 8192) = 0 -- Не запись внутреннего совместителя
        ${limitedAccess ? ' AND n.limitedAccess = 0 ' : ''}
        ORDER BY n.tabNumSort, n.ID`,
  params
  )

  const accrual = store.getAsJsObject()

  const accIDs = accrual.map(o => o.ID)
  const employeeNumberIDs = accrual.map(o => o.employeeNumberID)
  const accrualDts = accIDs.length ? UB.Repository('hr_accrualDt')
    .attrs(['accrualID', 'paySum', 'dictFundSourceID', 'departmentID', 'accountID',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .selectAsObject() : []
  const employeeNumbers = employeeNumberIDs.length ? UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'description', 'dateToEmpty', 'workPlaceCode', 'posName', 'depName'])
    .where('ID', 'in', employeeNumberIDs)
    .selectAsObject() : []
  let empNumberID = 0
  for (let i = accrual.length - 1; i >= 0; i--) {
    const accrualDt = accrualDts.filter(o => o.accrualID === accrual[i].ID)
    accrualDt.forEach(accDt => {
      delete accDt.accrualID
    })
    if (empNumberID === accrual[i].employeeNumberID) {
      accrualDt.push(...JSON.parse(accrual[i + 1].accrualDt))
      accrual[i + 1].paySum = accrualService.round(accrual[i + 1].paySum + accrual[i].paySum)
      algorithmService.calcGroupSumAccrualDt(accrualDt, accrual[i + 1].paySum, true)
      accrual[i + 1].accrualDt = JSON.stringify(accrualDt)
      if (accrual[i + 1].mgCode > accrual[i].mgCode) {
        accrual[i + 1].mgCode = accrual[i].mgCode
        accrual[i + 1].payElID = accrual[i].payElID
        accrual[i + 1]['payElID.description'] = accrual[i]['payElID.description']
      }
      accrual.splice(i, 1)
    } else {
      accrual[i].accrualDt = JSON.stringify(accrualDt)
      const employeeNumber = employeeNumbers.find(o => o.ID === accrual[i].employeeNumberID)
      if (employeeNumber) {
        accrual[i]['employeeNumberID.description'] = employeeNumber.description
        accrual[i]['employeeNumberID.dateToEmpty'] = employeeNumber.dateToEmpty
        accrual[i]['employeeNumberID.workPlaceCode'] = employeeNumber.workPlaceCode
        accrual[i].posName = employeeNumber.posName
        accrual[i].depName = employeeNumber.depName
      }
      delete accrual[i].ID
    }
    empNumberID = accrual[i].employeeNumberID
  }

  mParams.resultData = JSON.stringify(accrual)
}

me.getOrderNum = function (ctx) {
  const mParams = ctx.mParams
  mParams.orderNumber = orderService.getOrderNum(__entityName, mParams.onDate, mParams.organizationID)
}

me.createPayOrder = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(orderRegistryService.createOrder(mParams.empOrderID))
}

me.setAllowPostingForOrders = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(orderRegistryService.setAllowPostingForOrders(mParams.empOrderID, mParams.value))
}

me.cancelPayOrder = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = JSON.stringify(orderRegistryService.cancelOrder(mParams.empOrderID))
}

me.getPeriodsOnDates = function (ctx) {
  const params = JSON.parse(ctx.mParams.params)
  const periodFrom = periodService.getPeriodOnDate(params.orgID, params.onDateFrom)
  const periodTo = periodService.getPeriodOnDate(params.orgID, params.onDateTo)
  ctx.mParams.resultData = JSON.stringify({ periodFrom, periodTo })
}

me.checkParentVacationPeriods = function (ctx) {
  const mParams = ctx.mParams
  const result = []
  const vacations = UB.Repository('hr_docRegVacation')
    .attrs(['employeeNumberID', 'dateFrom', 'parentID.dateTo', 'employeeNumberID.description'])
    .where('orderRegistryID', '=', mParams.orderRegistryID || null)
    .where('parentID', 'isNotNull')
    .selectAsObject()
  vacations.forEach(doc => {
    const pDateTo = dateService.addDays(dateService.shiftDate(doc['parentID.dateTo']), 1)
    const dateFrom = dateService.shiftDate(doc.dateFrom)
    if (pDateTo < dateFrom) {
      const workDays = UB.Repository('tim_timeSheet')
        .attrs(['ID'])
        .where('employeeNumberID', '=', doc.employeeNumberID)
        .where('isActive', '=', '1')
        .where('dateWork', '>=', pDateTo)
        .where('dateWork', '<=', dateService.addDays(dateFrom, -1))
        .where('factTimeCostID.timeCostType', '=', 'WORK')
        .selectSingle()
      if (workDays) {
        result.push({
          description: doc['employeeNumberID.description'],
          dateFrom: pDateTo,
          dateTo: dateService.addDays(dateFrom, -1)
        })
      }
    }
  })
  mParams.resultData = JSON.stringify(result)
}

function doPostingOrderRegistry (orderRegistryID, docRegEntity, payEls = []) {
  const orders = UB.Repository(docRegEntity)
    .attrs(['ID'])
    .where('orderRegistryID', '=', orderRegistryID)
    .where('orderState', '=', 'PROJECT')
    .selectAsObject()
  const store = UB.DataStore(docRegEntity)
  orders.forEach(doc => {
    store.run('update', {
      __skipOptimisticLock: true,
      payEls: JSON.stringify(payEls),
      execParams: {
        ID: doc.ID,
        orderState: 'POSTED'
      }
    })
  })
}

function cancelPostingOrderRegistry (orderRegistryID, docRegEntity) {
  const orders = UB.Repository(docRegEntity)
    .attrs(['ID'])
    .where('orderRegistryID', '=', orderRegistryID)
    .where('orderState', '=', 'POSTED')
    .selectAsObject()
  const store = UB.DataStore(docRegEntity)
  orders.forEach(doc => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: doc.ID,
        orderState: 'PROJECT'
      }
    })
  })
}

me.doPostingDocReg = function (ctx) {
  const execParams = ctx.mParams.execParams
  const docRegID = execParams.docRegID

  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.name', 'periodID.isClosed', 'organizationID'])
    .selectById(execParams.ID)

  const payEls = payElService.getPayEl({ orgID: orderRegistry.organizationID, getAll: false })

  const order = UB.Repository('hr_order')
    .attrs('ID', 'orderClass.entityName')
    .where('ID', '=', docRegID)
    .where('orderState', '=', 'PROJECT')
    .selectSingle()

  if (order) {
    const store = UB.DataStore(order['orderClass.entityName'])
    store.run('update', {
      __skipOptimisticLock: true,
      payEls: JSON.stringify(payEls),
      fromOrderRegistry: true,
      execParams: {
        ID: docRegID,
        orderState: 'POSTED'
      }
    })
  }
}

me.doReversalDocReg = function (ctx) {
  const execParams = ctx.mParams.execParams
  const docRegID = execParams.docRegID
  const action = execParams.action || 'revers'
  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'orderNumber', 'orderDate', 'periodID', 'periodID.name', 'periodID.isClosed', 'organizationID'])
    .selectById(execParams.ID)

  const currentPeriod = periodService.getCurrentPeriod(orderRegistry.organizationID)

  const order = UB.Repository('hr_order')
    .attrs('ID', 'orderClass.entityName', 'description')
    .where('ID', '=', docRegID)
    .where('orderState', '=', 'POSTED')
    .selectSingle()

  const storeDt = UB.DataStore('hr_orderRegistryDt')

  if (order) {
    const docRegEntity = order['orderClass.entityName']

    const reversDetail = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID', 'periodCalcID'])
      .where('orderID', '=', docRegID)
      .where('periodCalcID.dateFrom', '<', currentPeriod.dateFrom)
      .orderBy('periodCalcID.dateFrom', 'desc')
      .selectSingle()

    if (!reversDetail) {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} не було проведено у попередніх періодах! Сторнування не можливо!', order['description'])}>>>`)
    }

    const detail = UB.Repository('hr_orderRegistryDt')
      .attrs(['*', 'orderID.description', 'periodCalcID.dateFrom'])
      .where('orderID', '=', docRegID)
      .where('periodCalcID', '=', reversDetail.periodCalcID)
      .where(`(flagsRec & 512 != 512)`, 'custom')
      .selectAsObject()

    const accruals = UB.Repository('hr_accrual')
      .attrs('ID')
      .where('orderID', '=', docRegID)
      .selectAsObject()
    if (accruals.length) {
      const accrualFSSU = UB.Repository('hr_accrualDt')
        .attrs(['accrualID'])
        .where('accrualID', 'in', accruals.map(o => o.ID))
        .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
        .selectSingle()
      if (accrualFSSU) {
        const sicknessRequis = UB.Repository('hr_sicknessRequisAccrual')
          .attrs('sicknessRequisDtID.sicknessRequisID.description')
          .where('accrualID', '=', accrualFSSU.accrualID)
          .selectSingle()
        if (sicknessRequis) {
          throw new UB.UBAbort(`<<<${UB.i18n('Запис додано до Заяви-розрахунку СС {0}. Сторнувати не можливо!', sicknessRequis['sicknessRequisDtID.sicknessRequisID.description'])}>>>`)
        }
      }
    }

    const docReg = UB.Repository(docRegEntity)
      .attrs(['*'])
      .selectById(docRegID)

    const docRegStore = UB.DataStore(docRegEntity)

    if (docRegEntity === 'hr_docRegSickness') {
      const childSickness = UB.Repository('hr_docRegSickness')
        .attrs(['ID', 'description', 'employeeNumberID.description'])
        .where('parentSicknessID', '=', docRegID)
        .where('orderState', '=', 'POSTED')
        .selectSingle()
      if (childSickness) {
        throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} є {1}, який має статус "Проведено" та є продовженням {2}! Скасування неможливе!', childSickness['employeeNumberID.description'], childSickness.description, docReg.description)}>>>`)
      }
    }

    if (!docReg.empOrderID) {
      timService.cancelTimeSheetByOrder(docRegID, docRegID, currentPeriod, docReg.dateFrom)
    }

    detail.forEach(det => {
      if (det.periodCalcID === currentPeriod.ID) {
        throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} було проведено у поточному періоді! Сторнування не можливо!', det['orderID.description'])}>>>`)
      }
      if (dateService.shiftDate(det['periodCalcID.dateFrom']) < currentPeriod.dateFrom) {
        delete det['orderID.description']
        delete det['periodCalcID.dateFrom']
        det.periodCalcID = null
        det.periodCalc = null
        det.flagsRec = (det.flagsRec || 0) | 1 << 9
        det.calendarDays = -1 * det.calendarDays
        det.days = -1 * det.days
        det.hours = -1 * det.hours
        det.paySum = -1 * det.paySum
        det.linkToParentID = det.ID
        det.empOrderID = null
        det.ID = storeDt.generateID()
        if (det.accrualDt) {
          const accrualDt = JSON.parse(det.accrualDt)
          accrualDt.forEach(dt => {
            dt.paySum = -1 * dt.paySum
          })
          det.accrualDt = JSON.stringify(accrualDt)
        }

        storeDt.run('insert', {
          execParams: det
        })
      }
    })

    const prevAccrualAvg = UB.Repository('hr_accrualAvg')
      .attrs(['*'])
      .where('orderID', '=', docRegID)
      .selectAsObject()

    orderService.clearMiAttrs(docReg)
    const changedValues = JSON.stringify(Object.assign({
      'accrualAvg': prevAccrualAvg
    }, docReg))
    docRegStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: docRegID,
        changedValues
      }
    })

    if (action === 'recalc') {
      const cont = {
        orgID: orderRegistry.organizationID
      }
      if (docRegEntity === 'hr_docRegSickness') {
        const illnessReason = UB.Repository('hr_dictIllnessReason')
          .attrs('*')
          .selectById(docReg.dictIllnessReasonID)
        docReg.payElID = illnessReason.payElFSSUID
      }

      const orderParams = Object.assign({
        recalculate: false,
        orgID: cont.orgID,
        periodCalcID: currentPeriod.ID,
        periodCalc: currentPeriod,
        employeeNumberID: docReg.employeeNumberID,
        payElID: docReg.payElID,
        flagsFix: 0,
        flagsRec: 2,
        accruals: [],
        accrualDt: [],
        dateFrom: dateService.shiftDate(docReg.dateFrom),
        dateTo: dateService.shiftDate(docReg.dateTo),
        parentSicknessID: docRegEntity === 'hr_docRegSickness' ? docReg.parentSicknessID : null
      }, docReg)

      const resultData = rlService.calculateOrderAccrual(orderParams, cont)

      resultData.accruals.forEach(accr => {
        accr.orderID = docRegID
        accr.orderNumber = orderRegistry.orderNumber
        accr.orderDate = orderRegistry.orderDate
        accr.orderRegistryID = execParams.ID
        accr.rate = resultData.rate
        accr.periodCalcID = null
        accr['periodCalcID.name'] = null
        accr.empOrderID = null
        accr.ID = storeDt.generateID()
        accr.accrualDt = JSON.stringify(accr.accrualDt)

        accr.orderDateFrom = docReg.dateFrom
        accr.orderDateTo = docReg.dateTo

        delete accr['periodCalcID.name']
        delete accr['periodSalaryID.name']
        delete accr['payElID.description']

        storeDt.run('insert', {
          execParams: accr
        })
      })
      if (docRegEntity === 'hr_docRegSickness') {
        const accrualsAvg = UB.Repository('hr_accrualAvg').attrs('ID').where('orderID', '=', docRegID).selectAsObject()

        const formData = {
          detail: {
            orderRegistryDt: { insert: [] },
            accrualAvg: { insert: [], del: accrualsAvg },
            docRegSicknessDt: { insert: [] }
          }
        }

        const doc = {
          ID: docRegID
        }

        const copyDocAttr = ['dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'avgCalcType', 'avgSum', 'minSalary',
          'maxECB', 'maxECBDay', 'calcSum', 'rate', 'paySum', 'flagsFix', 'flagsRec', 'standingAll', 'standingAllInYear', 'standingYearMonth', 'rate']
        const copyDocAccrualAvgAttr = ['periodID', 'baseSum', 'baseSumNotIndex', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opKoef', 'opSum']

        copyDocAttr.forEach(attrName => {
          doc[attrName] = resultData[attrName]
        })

        doc.avgSum = resultData.baseSum
        resultData.accrualsAvg.forEach(accr => {
          const accrual = {}
          copyDocAccrualAvgAttr.forEach(attrName => {
            accrual[attrName] = accr[attrName]
          })
          accrual.orderID = doc.ID
          formData.detail.accrualAvg.insert.push(accrual)
        })

        docRegStore.run('update', {
          __skipOptimisticLock: true,
          execParams: doc,
          formData: JSON.stringify(formData)
        })
      }
    }
    UB.DataStore('hr_order').execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: docRegID, orderState: 'PROJECT' })
    UB.DataStore(docRegEntity).execSQL(`UPDATE ${docRegEntity} SET orderState = :orderState: WHERE ID = :ID:`, { ID: docRegID, orderState: 'PROJECT' })
  }
}

/**
 * Метод для Виправлення стану наказів
 */
me.correctionOrderState = (ctx) => {
  const mParams = ctx.mParams
  const hrOrder = UB.Repository('hr_order')
    .attrs(['ID', 'orderClass.entityName'])
    .where('organizationID', '=', mParams.orgID)
    .where('orderState', '=', 'ON_PROCESSING')
    .selectAsObject()
  const errorMessages = []
  hrOrder.forEach(order => {
    let orderCanceling = orderRegistryService.cancelOrder(order.ID, true)
    errorMessages.push(...orderCanceling.errorMessages)
  })
  mParams.errorMessages = JSON.stringify(errorMessages)
}

me.doCancelReversalDocReg = function (ctx) {
  const execParams = ctx.mParams.execParams
  const docRegID = execParams.docRegID
  const storeDt = UB.DataStore('hr_orderRegistryDt')

  const orderRegistry = UB.Repository('hr_orderRegistry')
    .attrs(['ID', 'orderType', 'periodID', 'periodID.name', 'periodID.isClosed', 'organizationID'])
    .selectById(execParams.ID)

  const order = UB.Repository('hr_order')
    .attrs('ID', 'orderClass.entityName', 'description')
    .where('ID', '=', docRegID)
    .selectSingle()

  if (order) {
    const docRegEntity = order['orderClass.entityName']

    const detail = UB.Repository('hr_orderRegistryDt')
      .attrs(['*', 'orderID.description', 'periodCalcID.dateFrom'])
      .where('orderID', '=', docRegID)
      // .where('storno', '=', '1')
      .where('periodCalcID', 'isNull')
      .selectAsObject()

    const docReg = UB.Repository(docRegEntity)
      .attrs('empOrderID', 'dateFrom', 'dateTo', 'changedValues')
      .selectById(docRegID)

    if (!docReg.empOrderID) {
      timService.restoreTimeSheetByChangeOrder(docRegID, orderRegistry.organizationID)
    }

    detail.forEach(det => {
      storeDt.run('delete', {
        execParams: {
          ID: det.ID
        },
        skipOrderDelete: true
      })
    })
    const docRegStore = UB.DataStore(docRegEntity)
    const prevDocReg = docReg.changedValues ? JSON.parse(docReg.changedValues) : null
    if (prevDocReg) {
      const prevAccrualAvg = prevDocReg.accrualAvg
      const curAccrualsAvg = UB.Repository('hr_accrualAvg').attrs('ID').where('orderID', '=', docRegID).selectAsObject()

      delete prevDocReg.accrualAvg
      prevDocReg.changedValues = null
      prevDocReg.ID = docRegID
      docRegStore.run('update', {
        __skipOptimisticLock: true,
        execParams: prevDocReg,
        formData: JSON.stringify({
          detail: {
            accrualAvg: { insert: prevAccrualAvg, del: curAccrualsAvg },
            orderRegistryDt: { insert: [] }
          }
        })
      })
    }
    UB.DataStore('hr_order').execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: docRegID, orderState: 'POSTED' })
    UB.DataStore(docRegEntity).execSQL(`UPDATE ${docRegEntity} SET orderState = :orderState: WHERE ID = :ID:`, { ID: docRegID, orderState: 'POSTED' })
  }
}

me.cancelPostingDocReg = function (ctx) {
  const execParams = ctx.mParams.execParams
  const docRegID = execParams.docRegID

  const order = UB.Repository('hr_order')
    .attrs('ID', 'orderClass.entityName')
    .where('ID', '=', docRegID)
    .where('orderState', '=', 'POSTED')
    .selectSingle()

  if (order) {
    const store = UB.DataStore(order['orderClass.entityName'])
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: docRegID,
        orderState: 'PROJECT'
      }
    })
  }
}

me.changeEmpOrderState = function (ctx) {
  const mParams = ctx.mParams
  const result = {
    errorMessages: [],
    warningMessages: []
  }
  const orderState = mParams.orderState
  const periodCalc = orderState === 'PROCESSED' ? periodService.getCurrentPeriod(mParams.organizationID) : { ID: null }
  mParams.orderIDs.forEach(orderID => {
    const hrOrder = UB.Repository('hr_order')
      .attrs(['orderState', 'orderClass.entityName', 'empOrderType', 'description'])
      .selectById(orderID)

    if (!hrOrder) {
      result.errorMessages.push(`Не знайдено наказ. Можливо він був видалений`)
      return result
    }
    const store = UB.DataStore(hrOrder['orderClass.entityName'])
    store.execSQL(`UPDATE hr_order SET orderState = :orderState:, periodCalcID = :periodCalcID: WHERE ID = :ID:`, { ID: orderID, orderState: orderState, periodCalcID: periodCalc.ID })
    store.execSQL(`UPDATE ${hrOrder['orderClass.entityName']} SET orderState = :orderState:, periodCalcID = :periodCalcID: WHERE ID = :ID:`, { ID: orderID, orderState: orderState, periodCalcID: periodCalc.ID })
  })
  mParams.resultData = JSON.stringify(result)
}

me.search = function (ctx) {
  const mParams = ctx.mParams
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let sqlBuilder = {
    text: `SELECT {0} {1}
      FROM hr_orderRegistry r INNER JOIN hr_dictPeriod dp ON dp.ID = r.periodID
      {2}
      {3}
      {4}
      {5}`,
    clauses: {},
    whereParams: {},
    aliases: {
      orderNumber: { field: 'r.orderNumber' },
      periodDescription: { field: 'dp.description' },
      orderType: { field: 'r.orderType' },
      name: { field: 'r.name' },
      lineCount: { field: `(select count(*) from hr_orderRegistryDt dt JOIN hr_employeeNumber en ON en.ID = dt.employeeNumberID
       where dt.orderRegistryID = r.ID and (dt.dtType = 'rd' or dt.dtType is null) and dt.mi_deleteDate>='9999-12-31' ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''})` },
      paySum: { field: `(select sum(dt.paySum) from hr_orderRegistryDt dt JOIN hr_employeeNumber en ON en.ID = dt.employeeNumberID
       where dt.orderRegistryID = r.ID and (dt.dtType = 'rd' or dt.dtType is null) and dt.mi_deleteDate>='9999-12-31' ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''})` },
      hasPosted: { field: `(SELECT count(*) FROM hr_orderRegistryDt det INNER JOIN hr_order ON hr_order.ID=det.orderID JOIN hr_employeeNumber en ON en.ID = det.employeeNumberID
       WHERE det.orderRegistryID=r.ID AND det.mi_deleteDate>='9999-12-31' AND hr_order.orderState='POSTED' ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''})` },
      hasProject: { field: `(SELECT count(*) FROM hr_orderRegistryDt det INNER JOIN hr_order ON hr_order.ID=det.orderID JOIN hr_employeeNumber en ON en.ID = det.employeeNumberID 
      WHERE det.orderRegistryID=r.ID AND det.mi_deleteDate>='9999-12-31' AND hr_order.orderState='PROJECT' ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''})` },
      hasCanceled: { field: `(SELECT count(*) FROM hr_orderRegistryDt det INNER JOIN hr_order ON hr_order.ID=det.orderID JOIN hr_employeeNumber en ON en.ID = det.employeeNumberID 
      WHERE det.orderRegistryID=r.ID AND det.mi_deleteDate>='9999-12-31' AND hr_order.orderState='CANCELED' ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''})` },
      orderStatePayRoll: { field: `(select ${sqlDialect.top} pr.orderState from hr_payRoll pr join hr_RollReg rr on rr.payRollID = pr.ID join hr_orderRegistry org on org.ID = rr.orderRegistryID where org.ID = r.ID and org.mi_deleteDate>='9999-12-31' and pr.mi_deleteDate>='9999-12-31' ${sqlDialect.limit})` },
      orderDate: { field: 'r.orderDate' },
      orderState: { field: 'r.orderState' },
      periodID: { field: 'r.periodID' },
      organizationID: { field: 'r.organizationID' },
      ID: { field: 'r.ID' },
      mi_modifyDate: { field: 'r.mi_modifyDate' },
      mi_createDate: { field: 'r.mi_createDate' },
      createUser: { field: `(select ${sqlDialect.top} u.fullName from uba_user u where u.ID = r.mi_createUser ${sqlDialect.limit})` },
      modifyUser: { field: `(select ${sqlDialect.top} u.fullName from uba_user u where u.ID = r.mi_modifyUser ${sqlDialect.limit})` },
      // createUser: { field: 'r.createUser' },
      // modifyUser: { field: 'r.modifyUser' },
      employeeList: { field: 'r.employeeList' },
      minDateOrderRegistryDt: { field: '(select min(dt.orderDateFrom) from hr_orderRegistryDt dt inner join hr_order o on dt.orderID = o.ID where dt.orderRegistryID = r.ID and o.orderState = \'PROJECT\' and dt.mi_deleteDate>=\'9999-12-31\')' },
      description: { field: 'r.description' }
    },
    params: {}
  }
  const period = mParams.periodID ? periodService.getPeriod(mParams.periodID) : {}
  const userOrgs = UB.Session.uData.userOrg
  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, period, userOrgs),
    '',
    true)
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.userOrgs = userOrgs
  sqlBuilder.clauses.whereParams.periodID = period.ID || null
  sqlBuilder.clauses.whereParams.periodDateFrom = period.dateFrom || null
  sqlBuilder.clauses.whereClause = `${sqlBuilder.clauses.whereClause} `
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY r.orderDate DESC'

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    '',
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}

me.getWhereClause = function (mParams, period, userOrgs) {
  let rOrgClause = 'r.organizationID = 0'
  let dpOrgClause = 'dp.orgID = 0'
  if (userOrgs && userOrgs.length && userOrgs.includes(mParams.orgID)) {
    rOrgClause = `r.organizationID = ${mParams.orgID}`
    dpOrgClause = `dp.orgID = ${mParams.orgID}`
  }
  return `${rOrgClause} AND ${dpOrgClause} ${period.ID ? ` AND ( r.periodID = :periodID: OR
  EXISTS (SELECT 1 FROM hr_orderRegistryDt rdt WHERE rdt.orderRegistryID = r.ID
  AND rdt.periodCalcID = :periodID: AND rdt.mi_deleteDate >= '9999-12-31')
  ${period.isCurrent ? ` OR (r.orderState = 'PROJECT' AND dp.dateFrom < :periodDateFrom:)` : ''}
  )` : ''} AND r.mi_deleteDate >= '9999-12-31'`
}

me.getTechCards = function (nomenclatureList) {
  const result = {
    dictTechList: [],
    dictMaterialList: [],
    dictWorkList: []
  }
  if (!nomenclatureList.length) {
    return result
  }
  const dictTechID = nomenclatureList.map(o => o.dictTechID)
    .filter((v, i, s) => s.indexOf(v) === i)
    .filter(o => o)
  if (!dictTechID.length) {
    return result
  }
  const dictTechList = UB.Repository('hr_dictTech')
    .attrs('ID', 'description', 'nomenclatureID', 'nomenclatureID.description', 'nomenclatureID.dictMeasureID.symbolUkr', 'quantity')
    .where('ID', 'in', dictTechID)
    .selectAsObject()
  const dictMaterialList = UB.Repository('hr_dictTechMaterial')
    .attrs('ID', 'dictTechID', 'dictTechID.description', 'nomenclatureID', 'nomenclatureID.description', 'quantity')
    .where('dictTechID', 'in', dictTechID)
    .selectAsObject()
  const dictWorkList = UB.Repository('hr_dictTechOperation')
    .attrs('ID', 'dictTechID', 'dictTechID.description', 'dictWorkOperationID', 'dictWorkOperationID.description',
      'dictWorkOperationID.payment', 'dictWorkOperationID.payment.name',
      'dictWorkOperationID.dictMeasureID.symbolUkr',
      'quantity', 'employeeNumberID', 'employeeNumberID.description')
    .where('dictTechID', 'in', dictTechID)
    .selectAsObject()

  const materialList = []
  const workList = []
  nomenclatureList.forEach((nomenclature) => {
    dictMaterialList.filter(o => o.dictTechID === nomenclature.dictTechID).forEach(dictMaterial => {
      materialList.push(dictMaterial)
    })
    dictWorkList.forEach((dictWork) => {
      dictWorkList.filter(o => o.dictTechID === nomenclature.dictTechID).forEach(dictWork => {
        workList.push(dictWork)
      })
    })
  })

  // const unionMaterialList = dictMaterialList.filter((v, i, s) => {
  //   return s.findIndex(o => o.nomenclatureID === v.nomenclatureID) === i
  // })
  // unionMaterialList.forEach(m => {
  //   m.quantity = materialList.reduce((a, b) => {
  //     return a + (b.nomenclatureID === m.nomenclatureID ? b.quantity : 0)
  //   }, 0)
  // })

  // const unionWorkList = dictWorkList.filter((v, i, s) => {
  //   return s.findIndex(o => o.employeeNumberID === v.employeeNumberID && o.dictWorkOperationID === v.dictWorkOperationID) === i
  // })
  // unionWorkList.forEach(w => {
  //   w.quantity = workList.reduce((a, b) => {
  //     return a + (b.employeeNumberID === w.employeeNumberID && b.dictWorkOperationID === w.dictWorkOperationID ? b.quantity : 0)
  //   }, 0)
  // })

  // return { dictTechList, dictMaterialList: unionMaterialList, dictWorkList: unionWorkList }
  return { dictTechList, dictMaterialList, dictWorkList }
}

me.calcTechCards = function (nomenclatureList, materialList, workList, calcProportion = true) {
  if (!nomenclatureList.length) {
    return
  }
  const { dictTechList, dictMaterialList, dictWorkList } = me.getTechCards(nomenclatureList)

  nomenclatureList.forEach(nomenclature => {
    const dictTech = dictTechList.find(dictTech => dictTech.ID === nomenclature.dictTechID)
    if (dictTech) {
      nomenclature['dictTechID.description'] = dictTech.description
      nomenclature.nomenclatureID = dictTech.nomenclatureID
      nomenclature['nomenclatureID.description'] = dictTech['nomenclatureID.description']
      if (!(nomenclature.flagsFix & 1 << 1)) {
        nomenclature.norm = dictTech.quantity
      }
      if (!(nomenclature.flagsFix & 1 << 2)) {
        nomenclature.planQuantity = dictTech.quantity
      }
      if (!(nomenclature.flagsFix & 1 << 0)) {
        nomenclature.quantity = nomenclature.planQuantity
      }
    }
  })

  let materialIdx = materialList.reduce((a, b) => { return b.idx !== undefined && b.idx >= a ? b.idx : a }, -1)
  dictMaterialList.forEach(dictMaterial => {
    const index = materialList.findIndex(o => o.dictTechID === dictMaterial.dictTechID && o.nomenclatureID === dictMaterial.nomenclatureID)
    if (index < 0) {
      materialList.push({
        dictTechID: dictMaterial.dictTechID,
        'dictTechID.description': dictMaterial['dictTechID.description'],
        nomenclatureID: dictMaterial.nomenclatureID,
        'nomenclatureID.description': dictMaterial['nomenclatureID.description'],
        norm: dictMaterial.quantity,
        planQuantity: dictMaterial.quantity,
        quantity: dictMaterial.quantity,
        flagsFix: 0,
        idx: ++materialIdx
      })
    } else {
      materialList[index]['dictTechID.description'] = dictMaterial['dictTechID.description']
      materialList[index]['nomenclatureID.description'] = dictMaterial['nomenclatureID.description']
      if (!(materialList[index].flagsFix & 1 << 1)) {
        materialList[index].norm = dictMaterial.quantity
      }
      if (!(materialList[index].flagsFix & 1 << 2)) {
        materialList[index].planQuantity = dictMaterial.quantity
      }
      if (!(materialList[index].flagsFix & 1 << 0)) {
        materialList[index].quantity = materialList[index].planQuantity
      }
    }
  })

  let recordIndex = workList.reduce((a, b) => { return b.idx !== undefined && b.idx >= a ? b.idx : a }, -1)
  dictWorkList.forEach(dictWork => {
    const index = workList.findIndex(o => o.dictTechID === dictWork.dictTechID &&
      o.dictWorkOperationID === dictWork.dictWorkOperationID &&
      (!dictWork.employeeNumberID || o.employeeNumberID === dictWork.employeeNumberID))
    if (index < 0) {
      workList.push({
        employeeNumberID: dictWork.employeeNumberID,
        'employeeNumberID.description': dictWork['employeeNumberID.description'],
        dictTechID: dictWork.dictTechID,
        'dictTechID.description': dictWork['dictTechID.description'],
        dictWorkOperationID: dictWork.dictWorkOperationID,
        'dictWorkOperationID.description': dictWork['dictWorkOperationID.description'],
        payment: dictWork.payment,
        'payment.name': dictWork['dictWorkOperationID.payment.name'],
        'dictWorkOperationID.dictMeasureID.symbolUkr': dictWork['dictWorkOperationID.dictMeasureID.symbolUkr'],
        norm: dictWork.quantity,
        planQuantity: dictWork.quantity,
        baseSum: 0,
        'yield': dictWork.quantity,
        paySum: 0,
        flagsFix: 0,
        flagsRec: 1 << 1 | 1 << 19,
        idx: ++recordIndex
      })
    } else {
      workList[index]['dictTechID.description'] = dictWork['dictTechID.description']
      workList[index]['dictWorkOperationID.description'] = dictWork['dictWorkOperationID.description']
      if (!(workList[index].flagsFix & 1 << 10)) {
        workList[index].payment = dictWork.payment
        workList[index]['payment.name'] = dictWork['dictWorkOperationID.payment.name']
        workList[index]['dictWorkOperationID.dictMeasureID.symbolUkr'] = dictWork['dictWorkOperationID.dictMeasureID.symbolUkr']
      }
      if (!(workList[index].flagsFix & 1 << 11)) {
        workList[index].norm = dictWork.quantity
      }
      if (!(workList[index].flagsFix & 1 << 18)) {
        workList[index].planQuantity = dictWork.quantity
      }
      if (!(workList[index].flagsFix & 1 << 13)) {
        workList[index].yield = workList[index].planQuantity
      }
      workList[index].flagsRec |= (1 << 1 | 1 << 19)
    }
  })

  if (calcProportion) {
    materialList.forEach(material => {
      const nomenclature = nomenclatureList.find(o => o.dictTechID === material.dictTechID)
      if (nomenclature && nomenclature.norm !== nomenclature.planQuantity) {
        if (!(material.flagsFix & 1 << 2)) {
          material.planQuantity = accrualService.round(nomenclature.norm ? material.norm * nomenclature.planQuantity / nomenclature.norm : 0, 4)
        }
        if (!(material.flagsFix & 1 << 0)) {
          material.quantity = accrualService.round(nomenclature.norm ? material.norm * nomenclature.planQuantity / nomenclature.norm : 0, 4)
        }
      }
    })
    workList.forEach(work => {
      const nomenclature = nomenclatureList.find(o => o.dictTechID === work.dictTechID)
      if (nomenclature && nomenclature.norm !== nomenclature.planQuantity) {
        if (!(work.flagsFix & 1 << 18)) {
          work.planQuantity = accrualService.round(nomenclature.norm ? work.norm * nomenclature.planQuantity / nomenclature.norm : 0, 4)
        }
        if (!(work.flagsFix & 1 << 13)) {
          work.yield = accrualService.round(nomenclature.norm ? work.norm * nomenclature.planQuantity / nomenclature.norm : 0, 4)
        }
      }
    })
  }
}

me.calcRegistryWorkShift = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.nomenclatureList) {
    params.nomenclatureList = []
  }
  if (!params.materialList) {
    params.materialList = []
  }
  if (!params.workList) {
    params.workList = []
  }

  me.calcTechCards(params.nomenclatureList, params.materialList, params.workList)

  params.workList.forEach(row => {
    row.payElID = row.payElID || params.orderParams.payElID
    row.periodCalcID = params.periodCalcID
    row.periodSalaryID = params.periodSalaryID
    row.dateFrom = dateService.shiftDate(params.orderParams.orderDate)
    row.dateTo = row.dateFrom
  })

  const calculatedWorkList = docRegService.calculatePieceWorkShift({
    orgID: params.orgID,
    workList: params.workList,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID,
    orderParams: params.orderParams
  })

  const resultWorkList = []
  calculatedWorkList.forEach(calculated => {
    const row = params.workList.find(o => o.idx === calculated.idx)
    resultWorkList.push(Object.assign({}, row, calculated))
  })

  mParams.resultData = JSON.stringify({
    nomenclatureList: params.nomenclatureList,
    materialList: params.materialList,
    workList: resultWorkList
  })
}

function postWorkShift (order, orderID, payEls) {
  const details = UB.Repository('hr_orderRegistryDt')
    .attrs(['*', 'periodCalcID.dateFrom', 'periodCalcID.dateTo', 'periodSalaryID.dateFrom', 'periodSalaryID.dateTo'])
    .where('orderRegistryID.organizationID', '=', order.organizationID, 'orgID')
    .where('orderRegistryID.periodID', '=', order.periodID, 'period')
    .where('orderRegistryID.payElID', '=', order.payElID, 'payElID')
    .where('orderRegistryID.orderState', '=', 'POSTED', 'allPosted')
    .where('orderRegistryID', '=', orderID || -1, 'current')
    .logic('([orgID] AND [period] AND [payElID] AND ([allPosted] OR [current]))')
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .selectAsObject()

  // Об'єднання записів документів у записи РЛ
  const accruals = []
  details.forEach((row) => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    let index = accruals.findIndex(o => o.employeeNumberID === row.employeeNumberID)
    if (index < 0) {
      const accrual = {
        orgID: order.organizationID,
        orderID: row.orderRegistryID,
        orderDtID: row.ID,
        periodCalcID: order.periodID,
        periodSalaryID: row.periodSalaryID,
        periodCalc: dateService.shiftDate(row['periodCalcID.dateFrom']),
        periodSalary: dateService.shiftDate(row['periodSalaryID.dateFrom']),
        employeeNumberID: row.employeeNumberID,
        payElID: row.payElID,
        flagsRec: 2,
        flagsFix: row.flagsFix,
        planHours: row.planHours,
        planDays: row.planDays,
        baseSum: row.baseSum,
        days: row.days,
        hours: row.hours,
        mask: row.mask,
        maskAdd: row.maskAdd,
        mtCount: row.mtCount,
        paySum: row.paySum,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        calculateDate: new Date(),
        accrualDt: row.accrualDt ? JSON.parse(row.accrualDt) : [],
        orderDateFrom: dateService.shiftDate(row.orderDateFrom),
        orderDateTo: dateService.shiftDate(row.orderDateTo)
      }
      accruals.push(accrual)
    } else {
      accruals[index].dateFrom = accruals[index].dateFrom > row.dateFrom ? row.dateFrom : accruals[index].dateFrom
      accruals[index].dateTo = accruals[index].dateTo < row.dateTo ? row.dateTo : accruals[index].dateTo
      accruals[index].mask |= row.mask
      accruals[index].paySum += row.paySum
      const accrualDt = row.accrualDt ? JSON.parse(row.accrualDt) : []
      accruals[index].accrualDt = algorithmService.calcGroupSumAccrualDt(accruals[index].accrualDt.concat(...accrualDt), accruals[index].paySum, true)
    }
  })

  const dateFrom = accruals.reduce((a, b) => a > b.dateFrom ? b.dateFrom : a, dateService.maxDate())
  const dateTo = accruals.reduce((a, b) => a < b.dateTo ? b.dateTo : a, dateService.minDate())

  const cont = {}
  cont.orgID = order.organizationID
  cont.org = orgService.getOrgData(order.organizationID)
  cont.payEl = payElService.getPayEl({ orgID: order.organizationID })
  contService.initDict(cont, ['workSchedule', 'dictWorkOperation', 'entryAcc', 'payDim'])
  const employeeNumbers = accruals.map(o => o.employeeNumberID)
  employeeService.loadEmployeeData({ orgID: order.organizationID, cont, employeeNumbers, dateFrom, dateTo, skipSecondJobs: true, skipParentEmployee: true, entityList: ['employeePosition', 'timeSheet'] })

  // Табель
  const timeSheetParams = []

  accruals.forEach(detail => {
    // Розрахунковий лист
    cont.employeeNumberID = detail.employeeNumberID
    detail.days = ((detail.mask).toString(2).match(/1/g) || []).length
    const timeSheets = algorithmService.getTimeSheetByPeriod({ ID: detail.periodSalaryID, dateFrom: detail.dateFrom, dateTo: detail.dateTo }, cont)
    const onDate = detail.dateFrom
    const workScheduleID = cont.emp[detail.employeeNumberID].prop.employeePositions && cont.emp[detail.employeeNumberID].prop.employeePositions.length
      ? ((cont.emp[detail.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate) ||
        cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[detail.employeeNumberID].prop.employeePositions.length - 1] || {}).workScheduleID) : null
    const isSummarized = workScheduleID ? cont.dict.hr_workSchedule.find(o => o.ID === workScheduleID && o.isSummarized) : false
    const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: order.payElID, timeSheets, dateFrom: detail.dateFrom, dateTo: detail.dateTo, isCorrection: detail.periodSalary > detail.periodCalc, isSummarized })
    detail.hours = accrualService.getHoursByMask(detail.mask, payTime.hoursByDays)

    // Табель
    if (cont.payEl[detail.payElID].dictTimeCostID) {
      for (let n = 0; n < 31; n++) {
        if (detail.mask & (1 << n)) {
          timeSheetParams.push({
            orderID: detail.orderID,
            entityName: 'hr_orderRegistryWorkShift',
            employeeNumberID: detail.employeeNumberID,
            periodID: detail.periodSalaryID,
            dateWork: dateService.addDays(detail.periodSalary, n),
            factTimeCostID: cont.payEl[detail.payElID].dictTimeCostID,
            factHour: payTime.hoursByDays[n + 1]
          })
        }
      }
    }
  })

  // Розрахунковий лист
  if (accruals.length) {
    accrualService.saveAccruals({ accruals: accruals, checkPayElInCalcPayAttr: true, payEls: payEls, description: UB.i18n(`Проведення {0}`, order.description) })
  }

  // Табель
  if (timeSheetParams.length) {
    timService.setTimeSheet(timeSheetParams)
  }
}

function cancelPostWorkShift (order, orderID, payEls) {
  let orderList = UB.Repository('hr_orderRegistryDt')
    .attrs(['orderRegistryID'])
    .where('orderRegistryID.organizationID', '=', order.organizationID, 'orgID')
    .where('orderRegistryID.periodID', '=', order.periodID, 'period')
    .where('orderRegistryID.payElID', '=', order.payElID, 'payElID')
    .where('orderRegistryID.orderState', '=', 'POSTED', 'allPosted')
    .where('orderRegistryID', '=', orderID || -1, 'current')
    .logic('([orgID] AND [period] AND [payElID] AND ([allPosted] OR [current]))')
    .groupBy('orderRegistryID')
    .selectAsObject()
  orderList.forEach(order => {
    accrualService.deleteAccrualsByOrder({ orderID: order.orderRegistryID, description: UB.i18n(`Розпроведення {0}`, order.description), checkSicknessRequis: false })
    timService.cancelTimeSheet(order.orderRegistryID)
  })
}

me.calcRegistryReserve = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  entityBaseService.initEntityJsonData(params.instanceID)
  const calculatedReserve = docRegService.calcRegistryReserve({
    orgID: params.orgID,
    orderParams: params
  })
  mParams.resultData = JSON.stringify(calculatedReserve)
  entityBaseService.writeEntityJsonData(params.instanceID, mParams.resultData)
}

me.loadRegistryPremium = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach((row) => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    const employeeNumber = employeeService.getEmployeeNumber({ orgID: params.orgID, employeeNumberID: row.employeeNumberID, tabNum: row.tabNum, taxCode: row.taxCode, dateFrom: row.dateFrom, dateTo: row.dateTo, rowIdx: row.idx })
    if (employeeNumber) {
      row.employeeNumberID = employeeNumber.ID
      row.tabNum = employeeNumber.tabNum
      row['employeeNumberID.description'] = employeeNumber.description
      delete row.taxCode
    }
  })
  const result = rlService.calculateAccrual({
    orgID: params.orgID,
    payElParams: params.payElParams,
    periodCalcID: params.periodCalcID,
    periodSalaryID: params.periodSalaryID,
    orderParams: params.orderParams
  })

  // Set descriptions
  if (result.length) {
    const dictFundSources = UB.Repository('ac_fundSource')
      .attrs(['ID', 'name', 'description'])
      .where('ID', 'in', result.map(o => o.dictFundSourceID).filter(o => o))
      .selectAsObject()
    const periodCalc = UB.Repository('hr_dictPeriod').attrs(['name', 'dateFrom', 'dateTo']).where('ID', '=', params.periodCalcID).selectSingle()
    const periodSalary = params.periodCalcID === params.periodSalaryID ? periodCalc : UB.Repository('hr_dictPeriod').attrs(['name', 'dateFrom', 'dateTo']).where('ID', '=', params.periodSalaryID).selectSingle()
    const payEl = UB.Repository('hr_payEl').attrs(['description']).where('ID', '=', result[0].payElID).selectSingle()
    const employeePositionList = UB.Repository('hr_employeePosition')
      .attrs(['employeeNumberID', 'departmentID.name', 'dictPositionID.name', 'workPlace', 'dateFrom', 'dateTo'])
      .where('organizationID', '=', params.orgID)
      .where('employeeNumberID', 'in', result.map(o => o.employeeNumberID))
      .where('dateFrom', '<=', periodSalary.dateTo)
      .where('dateTo', '>=', periodSalary.dateFrom)
      .where('departmentID.state', '=', 'ACTIVE')
      .where('departmentID.mi_dateFrom', '<=', periodSalary.dateTo)
      .where('departmentID.mi_dateTo', '>=', periodSalary.dateFrom)
      .selectAsObject()
    employeePositionList.forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })
    result.forEach(row => {
      const fs = dictFundSources.find(o => o.ID === row.dictFundSourceID)
      row['dictFundSourceID.name'] = fs ? fs.name : null
      const origin = params.payElParams.find(o => o.idx === row.idx)
      row.tabNum = origin.tabNum
      const employeePosition = employeePositionList.find(o => o.employeeNumberID === row.employeeNumberID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
      row['employeeNumberID.description'] = origin['employeeNumberID.description']
      row['employeeNumberID.workPlaceCode'] = employeePosition ? employeePosition.workPlace : null
      row['payElID.description'] = payEl.description
      row['periodCalcID.name'] = periodCalc.name
      row['periodSalaryID.name'] = periodSalary.name
      row['posName'] = employeePosition ? employeePosition['dictPositionID.name'] : null
      row['depName'] = employeePosition ? employeePosition['departmentID.name'] : null
    })
  }

  mParams.resultData = JSON.stringify(result)
}

me.getEmployeePremiumList = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  let result = []
  params.periodFrom = params.periodFromID ? periodService.getPeriod(params.periodFromID) : {}
  params.periodTo = params.periodToID ? periodService.getPeriod(params.periodToID) : {}
  params.dateFrom = params.periodFrom.dateFrom
  params.dateTo = params.periodTo.dateTo
  let allDeptsID = []
  if (params.departmentID) {
    let depIDs = params.departmentID
    if (params.includeSubDep) {
      for (let i = 0; i < depIDs.length; i++) {
        let childDep = UB.Repository('hr_department')
          .attrs('mi_data_id')
          .where('mi_treePath', 'like', `%${depIDs[i]}%`)
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '9999-12-31')
          .where('mi_dateFrom', '<=', params.dateTo)
          .where('mi_dateTo', '>=', params.dateFrom)
          .selectAsArrayOfValues()
        allDeptsID = allDeptsID.concat(childDep)
      }
    } else {
      allDeptsID = [depIDs]
    }
  }
  if (params.dictMultiGroupID) {
    const dictMultiGroupID = params.dictMultiGroupID
    const dictMultiGroupDepsID = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', dictMultiGroupID)
      .selectAsArrayOfValues()
    if (dictMultiGroupDepsID.length) {
      if (params.includeSubDepGroup) {
        for (let i = 0; i < dictMultiGroupDepsID.length; i++) {
          const childDep = UB.Repository('hr_department')
            .attrs('mi_data_id')
            .where('mi_treePath', 'like', `%${dictMultiGroupDepsID[i]}%`)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '9999-12-31')
            .where('mi_dateFrom', '<=', params.dateTo)
            .where('mi_dateTo', '>=', params.dateFrom)
            .selectAsArrayOfValues()
          allDeptsID = allDeptsID.concat(childDep)
        }
      } else {
        allDeptsID = dictMultiGroupDepsID
      }
    }
  }
  if (allDeptsID) {
    result = UB.Repository('hr_employeePosition')
      .attrs(['employeeNumberID'])
      .where('organizationID', '=', params.orgID)
      .whereIf(allDeptsID.length, 'departmentID', 'in', allDeptsID)
      .where('dateFrom', '<=', params.dateTo)
      .where('dateTo', '>=', params.dateFrom)
      .orderBy('dateFrom')
      .selectAsArrayOfValues()
  }
  mParams.resultData = JSON.stringify(result)
}

me.loadCsvFile = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const fileLength = params.payElParams.length
  let description
  let resultDownload
  let failCount = 0
  let remarkCount = 0
  let currentDataTime = dateService.formatDate(dateService.unshiftDate(dateService.currentDateTime()), 'dd.mm.yyyy hh:nn:ss')
  let currentDataTimeLog = dateService.unshiftDate(dateService.currentDateTime())
  params.orderParams.dateFrom = dateService.shiftDate(params.orderParams.dateFrom)
  params.orderParams.dateTo = dateService.shiftDate(params.orderParams.dateTo)
  const downloadNumber = (UB.Repository('hr_orderRegistryLog').attrs('downloadNumber').where('orderID', '=', params.orderParams.orderID).orderByDesc('downloadNumber').limit(1).selectScalar() || 0) + 1
  description = UB.i18n('Початок завантаження {0}. Файл {1}. Користувач {2}', currentDataTime, params.fileName, Session.uData.employeeFullFIO)
  addStringToLog(downloadNumber, '', 0, description, currentDataTimeLog, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
  if (params.dataClear) {
    addStringToLog(downloadNumber, null, 0, UB.i18n('Список працівників документу нарахування очищено перед завантаженням!'), currentDataTimeLog, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
  }
  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach((row) => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    const employeeNumber = getEmployeeNumberToLoadCSV({ params, row, currentDataTimeLog, downloadNumber })
    if (employeeNumber) {
      row.employeeNumberID = employeeNumber.ID
      row.tabNum = employeeNumber.tabNum
      row['employeeNumberID.description'] = employeeNumber.description
      row['employeeNumberID.dateToEmpty'] = employeeNumber.dateToEmpty
      row['employeeNumberID.workPlaceCode'] = employeeNumber.workPlaceCode
      row.posName = employeeNumber.posName
      row.depName = employeeNumber.depName
      row.tabNum = employeeNumber.tabNum
      row.fail = false
      row.flagsFix = 0
      if (row.Rate || params.orderParams.orderRate) {
        row.rate = Number(row.Rate || params.orderParams.orderRate)
        row.flagsFix = row.flagsFix | 1 << 9
      }
      if (row.paySum || params.orderParams.baseSum) {
        row.baseSum = Number(row.paySum || params.orderParams.baseSum)
        row.flagsFix = row.flagsFix | 1
      }
      delete row.Rate
      delete row.paySum
      if (!(dateService.shiftDate(employeeNumber.dateFrom) <= params.orderParams.dateTo && dateService.shiftDate(employeeNumber.dateTo) >= params.orderParams.dateFrom)) {
        description = UB.i18n('Увага! Рядок у документ нарахування додано для особового рахунку працівника, що у періоді з {0} по {1} не працював', dateService.formatDate(params.orderParams.dateFrom), dateService.formatDate(params.orderParams.dateTo))
        addStringToLog(downloadNumber, row.idx, 2, description + '!', currentDataTimeLog, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
      }
    } else {
      row.fail = true
      failCount++
    }
  })
  let resultRow = []
  if (params.orderParams.isIndividualRate) {
    const data = params.payElParams.filter(item => !item.fail)
    const payPerms = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'accrualRate'])
      .where('employeeNumberID', 'in', params.payElParams.filter(item => item.fail === false).map(o => o.employeeNumberID))
      .where('payElID', '=', params.orderParams.payElID)
      .where('dateFrom', '<=', dateService.shiftDate(params.orderParams.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(params.orderParams.dateFrom))
      .where('accrualRate', '>', 0, 'rate')
      .where('accrualSum', '>', 0, 'sum')
      .logic('([rate] OR [sum])')
      .orderBy('employeeNumberID')
      .orderByDesc('accrualRate')
      .orderBy('dateFrom')
      .selectAsObject()
    data.forEach(row => {
      const payPerm = payPerms.filter(o => o.employeeNumberID === row.employeeNumberID)
      payPerm.forEach(empRate => {
        const newRow = Object.assign({}, row)
        if (empRate.accrualRate) {
          newRow.additionalRate = empRate.accrualRate
        } else {
          newRow.additionalRate = 100
          newRow.baseSum = empRate.accrualSum
          newRow.flagsFix = newRow.flagsFix | 1
        }
        resultRow.push(newRow)
      })
      if (!payPerm.length) {
        addStringToLog(downloadNumber, row.idx, 1, UB.i18n('Не знайдено додатковий відсоток для {0}! Рядок у документ нарахування не додано!', row['employeeNumberID.description']), currentDataTimeLog, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
        remarkCount++
      }
    })
  } else {
    resultRow = params.payElParams.filter(item => !item.fail)
  }

  currentDataTime = dateService.formatDate(dateService.unshiftDate(dateService.currentDateTime()), 'dd.mm.yyyy hh:nn:ss')
  description = UB.i18n('Завантаження закінчено {0}. Завантажено {1} з {2}', currentDataTime, fileLength - failCount - remarkCount, fileLength)
  if (failCount) {
    description = description + '. ' + UB.i18n('Помилок = {0}', failCount)
  }
  if (remarkCount) {
    description = description + '. ' + UB.i18n('Зауважень = {0}', remarkCount)
  }
  if (!failCount && !remarkCount) {
    description = description + '. ' + UB.i18n('Виконано без зауважень')
  }
  addStringToLog(downloadNumber, null, 0, description, currentDataTimeLog, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)

  resultDownload = {
    rowWithError: failCount,
    totalError: failCount + remarkCount,
    recordCount: fileLength - failCount - remarkCount

  }

  mParams.resultData = JSON.stringify({
    resultDownload: resultDownload,
    result: resultRow
  })
}

function addStringToLog (downloadNumber, fileLineNumber, msgType, description, loadDate, userID, orgID, params, orderID) {
  const store = UB.DataStore('hr_orderRegistryLog')
  const newID = store.generateID()
  store.run('insert', {
    execParams: {
      downloadNumber: downloadNumber,
      fileLineNumber: fileLineNumber,
      msgType: msgType,
      description: description,
      loadDate: loadDate,
      userID: userID,
      ID: newID,
      orgID: orgID,
      params: params,
      orderID: orderID
    }
  })
}

function getEmployeeNumberToLoadCSV ({ params, row, currentDataTime, downloadNumber }) {
  let description
  if (!row.tabNum && !row.taxCode) {
    description = UB.i18n('Для працівника не вказано РНОКПП або табельний номер! Рядок у документ нарахування  не додано!')
    addStringToLog(downloadNumber, row.idx, 1, description, currentDataTime, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
    return null
  }
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'description', 'dateToEmpty', 'workPlace', 'workPlaceCode', 'depName', 'posName'])
    .where('orgID', '=', params.orgID)
    .whereIf(row.taxCode, 'employeeID.taxCode', '=', row.taxCode)
    .whereIf(row.tabNum, 'tabNum', '=', row.tabNum)
    .orderBy('dateFrom')
    .selectAsObject()
  if (!employeeNumbers.length && row.taxCode) {
    description = UB.i18n('Особу з РНОКПП = {0} не знайдено! Рядок у документ нарахування  не додано!', row.taxCode)
    addStringToLog(downloadNumber, row.idx, 1, description, currentDataTime, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
    return null
  } else if (!employeeNumbers.length && row.tabNum) {
    description = UB.i18n('Особовий рахунок з табельним номером = {0} не знайдено! Рядок у документ нарахування не додано!', row.tabNum)
    addStringToLog(downloadNumber, row.idx, 1, description, currentDataTime, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
    return null
  }
  if (employeeNumbers.length === 1) {
    return employeeNumbers[0]
  } else {
    const employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'workPlace', 'departmentID.code'])
      .where('organizationID', '=', params.orgID)
      .where('employeeNumberID', 'in', employeeNumbers.map(o => o.ID))
      .where('departmentID.state', '=', 'ACTIVE')
      .where('departmentID.mi_dateFrom', '<=', params.orderParams.dateTo)
      .where('departmentID.mi_dateTo', '>=', params.orderParams.dateTo)
      .orderBy('workPlace')
      .orderByDesc('dateFrom')
      .selectAsObject()
    let findPos = employeePositions.filter(o => (!row.workPlace || row.workPlace === o.workPlace) && (!row.department || row.department === o['departmentID.code']) &&
            dateService.shiftDate(o.dateFrom) <= params.orderParams.dateTo && dateService.shiftDate(o.dateTo) >= params.orderParams.dateFrom)
    if (!findPos.length) {
      findPos = employeePositions.filter(o => (!row.workPlace || row.workPlace === o.workPlace) && (!row.department || row.department === o['departmentID.code']) &&
                dateService.shiftDate(o['employeeNumberID.dateFrom']) <= params.orderParams.dateTo && dateService.shiftDate(o['employeeNumberID.dateTo']) >= params.orderParams.dateFrom)
    }
    if (!findPos.length) {
      findPos = employeePositions.filter(o => (!row.workPlace || row.workPlace === o.workPlace) && (!row.department || row.department === o['departmentID.code']))
    }
    if (!findPos.length) {
      findPos = employeePositions.filter(o => (row.workPlace && row.workPlace === o.workPlace) || (row.department && row.department === o['departmentID.code']))
    }
    if (findPos) {
      if (findPos && (new Set(findPos.map(o => o.employeeNumberID))).length === 1) {
        return employeeNumbers.find(o => o.ID === findPos[0].employeeNumberID)
      } else {
        let findWp = findPos.filter(o => o.workPlace === '1')
        if (!findWp.length) { findWp = findPos.filter(o => o.workPlace === '3') }
        if (!findWp.length) { findWp = findPos.filter(o => o.workPlace === '2') }
        if (!findWp.length) { findWp = findPos.filter(o => o.workPlace === '5') }
        if (!findWp.length) { findWp = findPos.filter(o => o.workPlace === '4') }
        if (findWp.length && (new Set(findWp.map(o => o.employeeNumberID))).length === 1) {
          return employeeNumbers.find(o => o.ID === findWp[0].employeeNumberID)
        } else {
          if (findWp.length) {
            return employeeNumbers.find(o => o.ID === findWp[0].employeeNumberID)
          } else {
            description = UB.i18n('Особу з РНОКПП = {0} не знайдено! Рядок у документ нарахування  не додано!', row.taxCode)
            addStringToLog(downloadNumber, row.idx, 1, description, currentDataTime, UB.Session.uData.userID, params.orgID, null, params.orderParams.orderID)
            return null
          }
        }
      }
    } else {
      return employeeNumbers[0]
    }
  }
}
