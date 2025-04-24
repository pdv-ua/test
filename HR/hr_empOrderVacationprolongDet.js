const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timeCostService = require('../HR/modules/timeCostService')
const timService = require('../HR/modules/timService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addIntComb')
me.entity.addMethod('getVacDaysInSickness')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'dateFrom', 'dateTo', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  let dateFrom = dateService.formatDate(d['dateFrom'])
  let dateTo = dateService.formatDate(d['dateTo'])
  return UB.i18n(`{0}, з {1} по {2}, № {3} від {4}`, d['employeeID.shortFIO'], dateFrom, dateTo, d['orderID.orderNumber'], dateService.formatDate(d['orderID.orderDate']))
}

function getDescription (dateFrom, dateTo, dayCount, action, grantOrder) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let dayCountStr = dayCount ? ' тривалістю ' + dayCount + '  днів' : ''
  let actionStr
  if (action === 'TRANSFER') {
    actionStr = UB.i18n(`Перенесення відпустки з {0}{1}{2}`, dateFromStr, dateToStr, dayCountStr)
  } else if (action === 'CANCEL') {
    if (grantOrder) {
      grantOrder = `"${grantOrder}"`
    }
    actionStr = UB.i18n(`Скасування наказу {0}`, grantOrder || '')
  } else {
    actionStr = UB.i18n(`Продовження відпустки з {0}{1}{2}`, dateFromStr, dateToStr, dayCountStr)
  }
  return actionStr
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom !== undefined ? execParams.dateFrom : instanceData.dateFrom
  let dateTo = execParams.dateTo !== undefined ? execParams.dateTo : (execParams.calcDateTo || instanceData.calcDateTo || execParams.dateTo || instanceData.dateTo)
  let dayCount = execParams.calcDayCount || instanceData.calcDayCount || execParams.dayCount || instanceData.dayCount
  let action = execParams.action || instanceData.action
  const grantVacationParaID = execParams.grantVacationParaID || instanceData.grantVacationParaID
  let grantOrder
  if (grantVacationParaID) {
    grantOrder = UB.Repository('hr_empOrderVacationDet')
      .attrs(['description'])
      .where('ID', '=', grantVacationParaID)
      .selectScalar()
  }
  execParams.description = getDescription(dateFrom, dateTo, dayCount, action, grantOrder)
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

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.employeePositionID основне місце роботи працівника
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 * @param {number} mParams.grantVacationParaID пункт наказу про відпустку, яка продовжується
 */
me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeePositionID = mParams.employeePositionID
  const dayCount = mParams.dayCount
  const reason = mParams.reason
  const grantVacationParaID = mParams.grantVacationParaID
  const action = mParams.action
  const orgID = mParams.orgID
  let dateFrom = mParams.dateFrom
  let dateTo = mParams.dateTo
  let resInfo

  const grantVac = grantVacationParaID && UB.Repository('hr_empOrderVacationDet')
    .attrs(['dateFrom', 'dateTo', 'description'])
    .where('ID', '=', grantVacationParaID)
    .selectSingle()

  if (action === 'TRANSFER' && (!dateFrom || !dateTo)) {
    const store = UB.DataStore(__entityName)
    dateFrom = dateFrom || grantVac.dateFrom
    dateTo = dateTo || grantVac.dateTo
    resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATIONPROLONG', orderID, employeePositionID, dateFrom,
      dateTo, dayCount, true, (empPosID) => {
        let res
        let empOrderVac
        if (grantVac) {
          let grantDateFrom = dateService.shiftDate(grantVac.dateFrom)
          let grantDateTo = dateService.shiftDate(grantVac.dateTo)
          empOrderVac = UB.Repository('hr_empOrderVacationDet')
            .attrs(['ID'])
            .where('employeePositionID', '=', empPosID)
            .where('dateFrom', '=', grantDateFrom)
            .where('dateTo', '=', grantDateTo)
            .where('orderID.orderState', '!=', 'PROJECT')
            .selectSingle()
        }
        if (empOrderVac) {
          res = {
            description: getDescription(mParams.dateFrom, mParams.dateTo, dayCount, action, grantVac && grantVac.description),
            reason: reason,
            action,
            grantVacationParaID: empOrderVac.ID,
            empOrderSicknessID: mParams.empOrderSicknessID
          }
        }
        return res
      }, (orderDetID) => {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: orderDetID,
            dateFrom: mParams.dateFrom,
            dateTo: mParams.dateTo
          }
        })
      })
  } else {
    resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATIONPROLONG', orderID, employeePositionID, dateFrom,
      dateTo, dayCount, true, (empPosID) => {
        let res
        let empOrderVac
        if (grantVac) {
          let grantDateFrom = dateService.shiftDate(grantVac.dateFrom)
          let grantDateTo = dateService.shiftDate(grantVac.dateTo)
          empOrderVac = UB.Repository('hr_empOrderVacationDet')
            .attrs(['ID'])
            .where('employeePositionID', '=', empPosID)
            .where('dateFrom', '=', grantDateFrom)
            .where('dateTo', '=', grantDateTo)
            .where('orderID.orderState', '!=', 'PROJECT')
            .selectSingle()
        }
        if (empOrderVac) {
          res = {
            description: getDescription(dateFrom, dateTo, dayCount, action, grantVac && grantVac.description),
            reason: reason,
            action,
            grantVacationParaID: empOrderVac.ID,
            empOrderSicknessID: mParams.empOrderSicknessID
          }
        }
        return res
      }, (orderDetID) => {
        global['hr_empOrderVacationDet'].addPeriods({
          mParams: {
            mode: 'ADDONLY',
            paraID: orderDetID,
            orderID: orderID,
            orderDetEntity: __entityName,
            orgID
          }
        })
      })
  }
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

/**
 * Отримання кількості рообочих днів для продовження відпустки, що припадає на лікарняний
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.mParams.dateFrom Дата початку лікарняного
 * @param {Date} ctx.mParams.dateTo Дата закінчення лікарняного
 * @param {number} ctx.mParams.empOrderVacationDetID пункт наказу про відпустку
 * @return {number} ctx.mParams.daysCount кількість днів
 */
me.getVacDaysInSickness = function (ctx) {
  const mParams = ctx.mParams
  let dateFrom = dateService.shiftDate(mParams.dateFrom)
  let dateTo = dateService.shiftDate(mParams.dateTo)
  let empOrderVacationDetID = mParams.empOrderVacationDetID
  let daysCount = 0
  if (empOrderVacationDetID) {
    const empOrderVacList = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['dateFrom', 'dateTo', 'dictVacationKindID'])
      .where('paraID', '=', empOrderVacationDetID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
    empOrderVacList.length > 0 && empOrderVacList.forEach(vacItem => {
      let vacDateFrom = new Date(vacItem.dateFrom)
      let vacDateTo = new Date(vacItem.dateTo)
      if (vacDateFrom < dateFrom) {
        vacDateFrom = dateFrom
      }
      if (vacDateTo > dateTo) {
        vacDateTo = dateTo
      }
      daysCount += timService.getVacDays(vacDateFrom, vacDateTo, vacItem.dictVacationKindID, mParams.orgID)
    })
  }
  mParams.daysCount = daysCount
}

/* Проведення та розпроведення наказу виконується в hr_empOrderVacationDet (doPosting, doCancelPosting) */
