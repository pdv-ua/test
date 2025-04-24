const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const nameCase = require('../HR/modules/nameCase')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('checkRankInYear')
me.entity.addMethod('doPosting')

function setAttrs (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  orderService.setEmpOrderAttrs(ctx)

  const execParams = ctx.mParams.execParams
  if (!execParams.dateTo && !instanceData.dateFrom) {
    execParams.dateTo = '#maxdate'
  }
  if (execParams.dateFrom) {
    execParams.dateNext = dateService.addYears(execParams.dateFrom, 3)
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

/* Перевірка, щоб присвоєння нового рангу було не менш, як за рік після попереднього
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.orderID наказ
 * @return {string} текст помилки
 */
me.checkRankInYear = ctx => {
  const mParams = ctx.mParams
  const orderID = mParams.orderID

  let msg = []
  if (orderID) {
    const instanceData = UB.Repository(__entityName)
      .attrs(['employeeID', 'dateFrom', 'firstName', 'middleName', 'lastName'])
      .where('orderID', '=', orderID)
      .selectAsObject()
    if (instanceData.length > 0) {
      const empRankData = UB.Repository('hr_publServRang')
        .attrs(['employeeID', 'dateFrom'])
        .where('employeeID', 'in', instanceData.map(item => item.employeeID))
        .orderByDesc('dateFrom')
        .selectAsObject()
      if (empRankData.length > 0) {
        instanceData.forEach(instanceItem => {
          let empRankItems = empRankData.filter(item => item.employeeID === instanceItem.employeeID)
          if (empRankItems.length > 0) {
            let prevDateFrom = new Date(empRankItems[0].dateFrom)
            let minDateFrom = dateService.addYears(prevDateFrom, 1)
            let newDateFrom = new Date(instanceItem.dateFrom)
            if (newDateFrom < minDateFrom) {
              let empName = nameCase.getEmpShortNameFromParts(instanceItem.firstName, instanceItem.middleName, instanceItem.lastName)
              msg.push(UB.i18n(`Для працівника {0} попереднє присвоєння рангу відбулося менше року тому.`, empName))
            }
          }
        })
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

me.doPosting = function ({ order, item, para, saved }) {
  para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dictRankID', 'dictRankID.code',
      'orderID', 'orderID.orderNumber', 'rankAssignKindID', 'payElID', 'paySum'])
    .selectById(item.ID)
  const orderDate = dateService.shiftDate(order.orderDate)
  orderService.checkIsParaOk(para)
  const psCategory = UB.Repository('hr_employeePositionS')
    .attrs('psCatCode')
    .where('ID', '=', para.employeePositionID)
    .selectScalar()
  let dateNext
  if (psCategory) {
    const maxRank = UB.Repository('hr_dictRankPsCategory')
      .attrs('dictRankID')
      .where('psCategory', '=', psCategory)
      .orderBy('cast([dictRankID.code] as integer)')
      .limit(1)
      .selectSingle()
    if (maxRank['dictRankID'] === para['dictRankID']) {
      dateNext = para.dateFrom
    }
  }

  orderService.tryClosePublServRangsExceptLast(para.employeeID, order, saved)
  orderService.createRank({ para: para, saved: saved, order: order, dateNext })
  if (para.payElID) {
    const pAccr = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
      .where('payElID', '=', para.payElID)
      .where('employeeNumberID', '=', para.employeeNumberID)
      .where('dateFrom', '<=', para.dateFrom)
      .where('dateTo', '>=', para.dateFrom)
      .selectAsObject()
    const dateTo = dateService.addDays(dateService.shiftDate(para.dateFrom), -1)
    pAccr.forEach(row => {
      orderService.updateByOrder({
        store: 'hr_employeeAccrual',
        params: {
          ID: row.ID,
          dateTo: dateTo,
          changeOrderID: para.orderID
        },
        saved: saved,
        oldValues: {
          dateTo: row.dateTo,
          changeOrderID: row.changeOrderID
        }
      })
    })
    orderService.insertByOrder({
      store: 'hr_employeeAccrual',
      params: {
        employeeID: para.employeeID,
        employeeNumberID: para.employeeNumberID,
        payElID: para.payElID,
        dateFrom: para.dateFrom,
        dateTo: para.dateTo,
        accrualSum: para.paySum,
        orderID: para.orderID,
        orderNumber: order.orderNumberFull || para['orderID.orderNumber'],
        orderDate: orderDate,
        changeOrderID: null
      },
      saved: saved
    })
  }
}
