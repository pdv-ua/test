const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const timeCostService = require('../HR/modules/timeCostService')
const periodService = require('../HR/modules/periodService')

me.details = [
  {
    detailName: 'empOrderVacationListDet',
    entityName: 'hr_empOrderVacationListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'employeePositionID', 'empVacationPeriodID', 'dictVacationKindID', 'dayCount',
      'dateFrom', 'dateTo'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('addPeriods')
me.entity.addMethod('checkSourceParaIDCross')

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.description = `${UB.i18n('День відпочинку за роботу у вихіднй день')} ${dateService.getStringFormatDate(execParams.dateFrom, false, UB.i18n(' р.'))}`
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

function afterInsert (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

/* Перевірка на існування наказу про роботу в іншому пункті наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeePositionID посада
 * @param {number} ctx.mParams.execParams.sourceParaID наказ на роботу
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.paraID пункт наказу
 * @return {string} текст помилки
 */
me.checkSourceParaIDCross = ctx => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeePositionID = execParams.employeePositionID
  const sourceParaID = execParams.sourceParaID || 0
  const orderID = execParams.orderID || 0
  const paraID = execParams.paraID || 0

  let msg
  if (employeePositionID && sourceParaID) {
    let crossRec = UB.Repository(__entityName)
      .attrs(['ID', 'orderID.orderNumber', 'orderID.orderDate'])
      .where('employeePositionID', '=', employeePositionID)
      .where('ID', '!=', paraID)
      .where('sourceParaID', '=', sourceParaID)
      .where('orderID', '=', orderID, 'innerOrder')
      .where('orderID', '!=', orderID, 'outOrder')
      .where('orderID.orderState', '!=', 'PROJECT', 'notProject')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .logic('([innerOrder] or ([outOrder] and [notProject]))')
      .selectSingle()
    if (crossRec) {
      let orderDateStr = dateService.formatDate(crossRec['orderID.orderDate'])
      msg = `Вибраний наказ про роботу вже застосовано в наказі № ${crossRec['orderID.orderNumber']} від ${orderDateStr}`
    }
  }
  mParams.msg = msg || ''
  return true
}

/**
 * Додати період відпустки
 * @param {object} ctx
 * @param {number} ctx.mParams.paraID ID деталі
 * @param {number} ctx.mParams.orderID ID наказу
 * @param {number} ctx.mParams.orgID ID організації
 * @param {number} ctx.mParams.dictVacationKindCode код виду відпустки
 * @param {number} ctx.mParams.employeeNumberID ID запису з таб. номер працівника
 * @param {Date} ctx.mParams.dateFrom дата початку
 * @param {Date} ctx.mParams.dateTo дата закінчення
 */
me.addPeriods = function (ctx) {
  const mParams = ctx.mParams
  const paraID = mParams.paraID
  const orderID = mParams.orderID
  const orgID = mParams.orgID
  const employeeNumberID = mParams.employeeNumberID
  const dictVacationKindCode = mParams.dictVacationKindCode
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.shiftDate(mParams.dateTo)
  const dictVacationKindID = UB.Repository('hr_dictVacationKind')
    .attrs(['ID'])
    .where('code', '=', dictVacationKindCode)
    .selectScalar()
  const toInsert = false

  const periods = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.code',
      'empVacationPlanID.dictVacationKindID.name', 'empVacationPlanID.dictVacationKindID.vactAccum', 'descriptionEx',
      'isMainPart', 'dayCountPlan'])
    .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
    .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(dateFrom, 'dateFrom', '<=', dateFrom)
    .orderBy('dateFrom')
    .selectAsObject()
  if (periods.length > 0) {
    const addedPeriods = []
    const storeEmpVacListDet = UB.DataStore('hr_empOrderVacationListDet')
    // clear previous data
    const mdfDate = new Date()
    const empVacListDet = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID'])
      .where('paraID', '=', paraID)
      .selectAsObject()
    if (toInsert) {
      empVacListDet.forEach(vacItem => {
        storeEmpVacListDet.run('delete', {
          skipOrderDelete: true,
          execParams: {
            ID: vacItem.ID,
            mi_modifyDate: mdfDate
          }
        })
      })
    }

    let calcDateFrom = dateFrom
    for (let i = 0; i < periods.length; i++) {
      let period = periods[i]
      let vacFact = timeCostService.getVacFactDays({ currPeriodID: period.ID, orgID: orgID })
      let dayDiff = (vacFact[0] && vacFact[0].dayDiff) || 0
      let calcDayCount = timService.getVacDays(calcDateFrom, dateTo, dictVacationKindID, orgID)

      let isPeriodPart = calcDayCount < dayDiff
      let periodDayCount
      let periodDateTo
      if (isPeriodPart) {
        /* Доступні дні періода покриваються всю кількість днів відпустки */
        periodDayCount = calcDayCount
        periodDateTo = dateTo
      } else {
        periodDayCount = dayDiff
        periodDateTo = timService.getVacDateTo(calcDateFrom, periodDayCount, dictVacationKindID, orgID)
      }
      if (periodDayCount > 0) {
        periodDateTo = timService.getVacDateTo(calcDateFrom, periodDayCount, dictVacationKindID, orgID)
      }
      if (periodDayCount > 0) {
        let isContinuous = !period.isMainPart && periodDayCount >= me.yearVacMainPart
        let description = UB.i18n(`Відпустка з {0} по {1} тривалістю {2} днів`, dateService.formatDate(calcDateFrom), dateService.formatDate(periodDateTo), periodDayCount)
        let newPeriodRecord = {
          itemIdx: i + 1,
          paraID: paraID,
          orderID: orderID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: calcDateFrom,
          dateTo: periodDateTo,
          dayCount: periodDayCount,
          empVacationPeriodID: period.ID,
          description: description,
          isContinuous: isContinuous,
          isPart: period.dayCountPlan > periodDayCount,
          isGroup: true
        }
        if (toInsert) {
          storeEmpVacListDet.run('insert', {
            execParams: newPeriodRecord
          })
        } else {
          newPeriodRecord['dictVacationKindID.name'] = period['empVacationPlanID.dictVacationKindID.name']
          newPeriodRecord['empVacationPeriodID.descriptionEx'] = period.descriptionEx
          addedPeriods.push(newPeriodRecord)
        }
        calcDateFrom = dateService.addDays(periodDateTo, 1)
        if (calcDateFrom > dateTo) {
          break
        }
      }
    }
    if (!toInsert && addedPeriods.length) {
      mParams.addedPeriods = JSON.stringify(addedPeriods)
    }
    storeEmpVacListDet.freeNative()
  }
  return true
}

me.doPosting = function ({ item, order, isImportOperation, saved, currentPeriod }) {
  if (item.mi_unityEntity === 'hr_empOrderVacationListDet') {
    const listItem = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['paraID', 'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID', 'empVacationPeriodID', 'employeeNumberID',
        'employeeID', 'employeePositionID', 'organizationID.mi_data_id', 'dictVacationKindID.payElID.dictTimeCostID',
        'dictVacationKindID.dictTimeCostID'])
      .selectById(item.ID)
    const para = UB.Repository(__entityName)
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'employeeID', 'employeePositionID', 'employeeNumberID.description',
        'dictTimeCostID', 'orderID'])
      .selectById(listItem.paraID)

    let cwsDateFrom = dateService.shiftDate(para.dateFrom)
    let cwsDateTo = dateService.shiftDate(para.dateTo)
    if (cwsDateFrom <= cwsDateTo) {
      throw new UB.UBAbort(`<<<${UB.i18n('День відпочінку для {0} не може бути раніше або той же, що відпрацьований вихідний день. Змініть день відпочінку',
        para['employeeNumberID.description'])}>>>`)
    }
    if (!currentPeriod) {
      currentPeriod = periodService.getCurrentPeriod(order.organizationID)
    }
    para.periodID = currentPeriod.ID
    para.factHour = 0
    para.mi_unityEntity = item.mi_unityEntity
    para.dateTo = para.dateFrom
    para.dictTimeCostID = listItem['dictVacationKindID.payElID.dictTimeCostID'] || listItem['dictVacationKindID.dictTimeCostID']
    orderService.setTimeSheet({ para: para, saved: saved, currentPeriod })

    const orgID = listItem['organizationID.mi_data_id']
    orderService.insertByOrder({
      store: 'hr_employeeVacation',
      params: {
        organizationID: orgID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderID: order.ID,
        paraID: listItem.paraID,
        dictVacationKindID: listItem.dictVacationKindID,
        employeeID: listItem.employeeID,
        employeePositionID: listItem.employeePositionID,
        employeeNumberID: listItem.employeeNumberID,
        dayCount: listItem.dayCount,
        cntDay: listItem.dayCount,
        dateFrom: listItem.dateFrom,
        dateTo: listItem.dateTo,
        dictPeriodID: order.periodID,
        empVacationPeriodID: listItem.empVacationPeriodID,
        avgSum: 0,
        vacationStatus: 'GRANT',
        orderState: 'POSTED',
        isMoneyHelp: false
      },
      saved: saved
    })
  }
}

me.doCancelPosting = function (item) {
  timService.cancelTimeSheet(item.orderID)
  orderService.restoreOldValues(item)
}
