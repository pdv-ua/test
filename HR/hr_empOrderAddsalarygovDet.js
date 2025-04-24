const UB = require('@unitybase/ub')
const moment = require('moment')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.details = [
  {
    detailName: 'empOrderChgSalEmpDet',
    entityName: 'hr_empOrderChgSalEmpDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'employeePositionID', 'payElID', 'dateFrom', 'stageYear', 'accrualRate', 'empOrderType',
      'organizationID', 'workPlace'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('checkAccrualDates')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['payElID.name', 'departmentID.name', 'dateFrom'], '^', true).split('^')
  execParams.description = UB.i18n(`{0} Вид оплати "{1}" з {2} `, parts[1] ? ('Підрозділ ' + parts[1] + ',') : '', parts[0], moment(parts[2], 'DD.MM.YYYY').format('LL'))
  execParams.title = execParams.description
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
}

function afterInsert (ctx) {
  setParentFields(ctx)
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  setParentFields(ctx)
  orderService.saveDetails(ctx, me.details)
  if (ctx.mParams.execParams.dictFundSourceID !== undefined) {
    const emp = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'payElID'])
      .where('paraID', '=', ctx.mParams.execParams.ID)
      .selectAsObject()
    const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
    emp.forEach(item => {
      ds.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          payElID: item.payElID,
          dictFundSourceID: ctx.mParams.execParams.dictFundSourceID
        }
      })
    })
  }
}

function setParentFields (ctx) {
  const mParams = ctx.mParams
  if (!mParams.formData) {
    return
  }
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const orderID = execParams.orderID || instanceData.orderID
  const formData = JSON.parse(mParams.formData)
  const empOrderChgSalEmpDet = formData.detail.empOrderChgSalEmpDet
  if (empOrderChgSalEmpDet.insert.length) {
    empOrderChgSalEmpDet.insert.forEach(ins => {
      ins.orderID = orderID
    })
    mParams.formData = JSON.stringify(formData)
  }
}

/* Перевірка, якщо у працівника вже є нарахування в обраному періоді
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.orderDetID пункт наказу
 * @param {Array} ctx.mParams.execParams.empDetItems працівники
 * @return {string} текст помилки
 */
me.checkAccrualDates = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const orderID = execParams.orderID
  const paraID = execParams.paraID
  let empDetItems = execParams.empDetItems && JSON.parse(execParams.empDetItems)

  const errEmps = []
  if (!empDetItems) {
    empDetItems = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'employeeNumberID.employeeID.shortFIO'])
      .whereIf(orderID, 'orderID', '=', orderID)
      .whereIf(paraID, 'paraID', '=', paraID)
      .selectAsObject({
        'employeeNumberID.employeeID.shortFIO': 'shortFIO'
      })
  }
  const empNumIDs = empDetItems.map(orderItem => orderItem.employeeNumberID)
  const accrual = UB.Repository('hr_employeeAccrual')
    .attrs(['employeeNumberID', 'payElID', 'dateFrom', 'dateTo'])
    .where('employeeNumberID', 'in', empNumIDs)
    .selectAsObject()
  empDetItems.forEach(orderItem => {
    let orderDateFrom = new Date(orderItem.dateFrom)
    let orderDateTo = new Date(orderItem.dateTo) || dateService.maxDate()
    let accrualItem = accrual.find(itm => itm.employeeNumberID === orderItem.employeeNumberID && itm.payElID === orderItem.payElID &&
      new Date(itm.dateFrom) < orderDateTo && new Date(itm.dateTo) > orderDateFrom)
    if (accrualItem) {
      let newDateTo = dateService.addDays(orderDateFrom, -1)
      if (new Date(accrualItem.dateFrom) > newDateTo) {
        if (!errEmps.includes(orderItem.shortFIO)) {
          errEmps.push(orderItem.shortFIO)
        }
      }
    } else {
      let otherEmpItem = empDetItems.find(itm => itm.employeeNumberID === orderItem.employeeNumberID && itm.payElID === orderItem.payElID &&
        itm.ID !== orderItem.ID)
      if (otherEmpItem) {
        if (!errEmps.includes(orderItem.shortFIO)) {
          errEmps.push(orderItem.shortFIO)
        }
      }
    }
  })

  if (errEmps.length > 0) {
    mParams.msg = UB.i18n(`Вже є нарахування в обраному періоді у працівник{0}: {1}`, errEmps.length === 1 ? 'а' : 'ів', errEmps.join(', '))
  }
  return true
}
