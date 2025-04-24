const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('getTimeSheetAbsences')
me.entity.addMethod('doPosting')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let data = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'dateFrom', 'dateTo', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  let dateFrom = dateService.formatDate(data['dateFrom'])
  return UB.i18n(`{0}, з {1}, № {2} від {3}`, data['employeeID.shortFIO'], dateFrom, data['orderID.orderNumber'], dateService.formatDate(data['orderID.orderDate']))
}

function setAttrs (ctx, op) {
  const execParams = ctx.mParams.execParams
  const positionID = execParams.positionID
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  if (!execParams.positionID && positionID) {
    execParams.positionID = positionID
  }
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  let dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  execParams.description = UB.i18n(`Продовження випробувального терміну з {0} до {1}`, dateFrom, dateTo)
}

function beforeInsert (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function afterInsert (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setOrderReason(ctx)
}

function afterUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setOrderReason(ctx)
}

function setOrderReason (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = UB.Repository(__entityName)
    .attrs(['employeeNumberID', 'employeeWorkbookID', 'orderID', 'orderID.reason', 'dateFrom'])
    .selectById(execParams.ID)
  let dateTo = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const orderReason = instanceData['orderID.reason'] || ''
  let dateFrom
  if (instanceData.employeeWorkbookID) {
    const wb = UB.Repository('hr_employeeWorkbook')
      .attrs(['dateFrom', 'dateTo'])
      .selectById(instanceData.employeeWorkbookID)
    dateFrom = wb.dateFrom
  }

  const empSick = timService.getTimeSheetSickness(instanceData.employeeNumberID, dateFrom, dateTo)
  let reason = ''
  if (empSick.length > 0) {
    reason = 'Листки непрацездатності:\n'
    empSick.forEach(item => {
      if (item.serie || item.number) {
        if (item.serie) {
          reason += UB.i18n(`серія {0} `, item.serie)
        }
        if (item.number) {
          reason += `№ ${item.number}`
        }
        reason += ', '
      }
      reason += UB.i18n(`виданий {0} р.\n`, dateService.formatDate(item.orderDate))
    })
  }
  if (reason.length > 0) {
    if (orderReason.length > 0) {
      reason = orderReason + '\n' + reason
    }
    const orderStore = UB.DataStore('hr_empOrder')
    orderStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: instanceData.orderID,
        reason: reason
      }
    })
  }
}

me.getTimeSheetAbsences = function (ctx) {
  const mParams = ctx.mParams
  let data = timService.getTimeSheetAbsences(mParams.employeeNumberID, mParams.dateFrom, mParams.dateTo)
  mParams.result = JSON.stringify(data)
  return true
}

me.doPosting = function ({ item, order, isImportOperation, saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeeWorkbookID', 'orderID', 'orderID.orderDate', 'employeeNumberID',
      'employeePositionID', 'employeeWorkbookID.dateTrialEnd', 'employeePositionID.positionID', 'employeePositionID.description'])
    .selectById(item.ID)
  if (!para.employeeWorkbookID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено запис трудової книжки ({0})', para['employeePositionID.description'])}>>>`)
  }
  orderService.updateByOrder({
    store: 'hr_employeeWorkbook',
    params: {
      ID: para.employeeWorkbookID,
      dateTrialEnd: para.dateTo
    },
    saved: saved,
    oldValues: {
      dateTrialEnd: para['employeeWorkbookID.dateTrialEnd']
    }
  })
  let dateFrom = dateService.addDays(para.dateFrom, 1)
  orderService.insertByOrder({
    store: 'hr_employeeTrialPeriod',
    params: {
      employeeNumberID: para.employeeNumberID,
      employeePositionID: para.employeePositionID,
      orderID: order.ID,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      dateFrom: dateFrom,
      dateTo: para.dateTo,
      dateTrialEnd: para.dateTo,
      positionID: para['employeePositionID.positionID']
    },
    saved: saved
  })
}
