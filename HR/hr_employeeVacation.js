const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const timeCostService = require('./modules/timeCostService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:after', afterDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('getDaycount')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.description && execParams.useCustomDesc) {
    delete execParams.useCustomDesc
    return
  }
  if (!ctx.mParams.sicknessOperation && (execParams.dictVacationKindID || execParams.orderNumber || execParams.orderDate || execParams.dateFrom || execParams.dateTo)) {
    const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    const dictVacationKindID = execParams.dictVacationKindID || instanceData.dictVacationKindID
    const dictVacationKindName = UB.Repository('hr_dictVacationKind')
      .attrs(['name'])
      .where('ID', '=', dictVacationKindID)
      .misc({ __allowSelectSafeDeleted: true })
      .selectScalar()
    const orderID = execParams.orderID || instanceData.orderID
    if (orderID) {
      const orderData = UB.Repository('hr_order')
        .attrs(['orderNumber', 'orderDate', 'orderNumberFullView'])
        .misc({ __allowSelectSafeDeleted: true })
        .selectById(orderID)
      const vacationStatus = execParams.vacationStatus || instanceData.vacationStatus || 'GRANT'
      let orderOperationStr = (vacationStatus === 'CANCEL') ? 'Скасування відпустки' : dictVacationKindName
      let dateFromStr = ''
      let dateToStr = ''
      if (!['COMP', 'RETURN'].includes(vacationStatus)) {
        const dateFrom = execParams.dateFrom || instanceData.dateFrom
        dateFromStr = (dateFrom && ' з ' + dateService.formatDate(dateFrom)) || ''
        const dateTo = execParams.dateTo || instanceData.dateTo
        dateToStr = (dateTo && ' по ' + dateService.formatDate(dateTo)) || ''
      }
      let orderNumStr = (orderData.orderNumber && ' № ' + orderData.orderNumber) || ''
      let orderDateStr = (orderData.orderDate && ' від ' + dateService.formatDate(orderData.orderDate)) || ''
      execParams.description = `${orderOperationStr}${dateFromStr}${dateToStr}. Наказ${orderNumStr}${orderDateStr}`
      if (!execParams.orderNumber) execParams.orderNumber = orderData.orderNumberFullView || orderData.orderNumber
      if (!execParams.orderDate) execParams.orderDate = orderData.orderDate
    } else {
      let orderNumStr = execParams.orderNumber
      let orderDateStr = dateService.formatDate(execParams.orderDate)
      let descriptionAdd = execParams.descriptionAdd || instanceData.descriptionAdd || ''
      delete execParams.descriptionAdd
      delete instanceData.descriptionAdd
      execParams.description = `Імпорт. Наказ №${orderNumStr} від ${orderDateStr}` + (descriptionAdd.length ? ` ${descriptionAdd}` : '')
    }
  }
}

function setAttrs (ctx) {
  setDescription(ctx)
}

function setPeriodAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  const method = execParams.method || 'update'
  let empVacationPeriodID
  if (method === 'delete') {
    empVacationPeriodID = UB.Repository(__entityName)
      .attrs(['empVacationPeriodID'])
      .where('ID', '=', execParams.ID)
      .misc({ __allowSelectSafeDeleted: true })
      .selectScalar()
  } else {
    const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    empVacationPeriodID = execParams.empVacationPeriodID || instanceData.empVacationPeriodID
  }
  if (empVacationPeriodID) {
    global.hr_empVacationPeriod.setAttrs({
      mParams: {
        execParams: { ID: empVacationPeriodID },
        method: method,
        runUpdate: true
      }
    })
  }
}

function beforeInsert (ctx) {
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function recalcVacPeriods (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const isDeleting = execParams.method === 'delete'
  if (!mParams.skipCalcFields && (execParams.dayCount !== undefined || isDeleting)) {
    let empVacationPeriodID
    let employeeNumberID
    let instanceData
    let orgID
    if (isDeleting) {
      instanceData = UB.Repository(__entityName)
        .attrs('empVacationPeriodID', 'employeeNumberID', 'organizationID')
        .misc({ __allowSelectSafeDeleted: true })
        .selectById(execParams.ID)
      empVacationPeriodID = instanceData.empVacationPeriodID
      employeeNumberID = instanceData.employeeNumberID
      orgID = instanceData.organizationID
    } else {
      instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
      empVacationPeriodID = execParams.empVacationPeriodID || instanceData.empVacationPeriodID
      employeeNumberID = execParams.employeeNumberID || instanceData.employeeNumberID
      orgID = execParams.organizationID || instanceData.organizationID
    }
    timeCostService.calcVacPeriods({
      mParams: {
        execParams: {
          ID: empVacationPeriodID,
          employeeNumberID,
          orgID
        }
      }
    })
  }
}

function afterInsert (ctx) {
  setPeriodAttrs(ctx)
  recalcVacPeriods(ctx)
}

function afterUpdate (ctx) {
  setPeriodAttrs(ctx)
  recalcVacPeriods(ctx)
}

function afterDelete (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.method = 'delete'
  setPeriodAttrs(ctx)
  recalcVacPeriods(ctx)
}

me.getDaycount = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const dateFrom = execParams.dateFrom
  const dateTo = execParams.dateTo
  let res = timeCostService.getCalendarianDays(dateFrom, dateTo)
  if (res) {
    mParams.result = res
  }
  return true
}
