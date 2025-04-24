const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timeCostService = require('../HR/modules/timeCostService')
const timService = require('../HR/modules/timService')
const calcService = require('../HR/modules/calcService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addOrderItems')
me.entity.addMethod('addIntComb')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('addMultiOrder')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let data = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'dateFrom', 'dateTo', 'dayCount', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  let dateFrom = dateService.formatDate(data['dateFrom'])
  let dateTo = data.dateTo
  let dateToStr = UB.i18n(` по {0}  на  {1} днів`, dateService.formatDate(dateTo), data.dayCount)
  return UB.i18n(`{0}, з {1}{2}, № {3} від {4}`, data['employeeID.shortFIO'], dateFrom, dateToStr, data['orderID.orderNumber'], dateService.formatDate(data['orderID.orderDate']))
}

function getDescription (dateFrom, dateTo, dayCount, dictVacationKindID) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let dayCountStr = dayCount ? ' тривалістю ' + dayCount + '  днів' : ''
  let dictVacationKind = UB.Repository('hr_dictVacationKind').attrs(['ID', 'name']).selectById(dictVacationKindID)
  return (dictVacationKind && dictVacationKind.name) || UB.i18n(`Неоплачувана відпустка з {0}{1}{2}`, dateFromStr, dateToStr, dayCountStr)
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
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.dateTo || instanceData.dateTo
  let dayCount = execParams.dayCount || instanceData.dayCount
  execParams.description = getDescription(dateFrom, dateTo, dayCount, execParams.dictVacationKindID || instanceData.dictVacationKindID)
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
 * Додати пункти наказу для списку працівників
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {array} mParams.employeeNumberIDs масив таб. номерів працівників
 * @param {number} mParams.dictVacationKindID вид відпустки
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 */
me.addOrderItems = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeeNumberIDs = mParams.employeeNumberIDs
  const dictVacationKindID = mParams.dictVacationKindID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason

  let resInfo = timeCostService.addOrderItems(__entityName, 'VACATIONLONG', orderID, employeeNumberIDs, dateFrom,
    dateTo, dayCount, true, {
      dictVacationKindID: dictVacationKindID,
      description: getDescription(dateFrom, dateTo, dayCount, dictVacationKindID),
      reason: reason
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.employeePositionID основне місце роботи працівника
 * @param {number} mParams.dictVacationKindID вид відпустки
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 */
me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeePositionID = mParams.employeePositionID
  const dictVacationKindID = mParams.dictVacationKindID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason

  let resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATIONLONG', orderID, employeePositionID, dateFrom,
    dateTo, dayCount, true, {
      dictVacationKindID: dictVacationKindID,
      description: getDescription(dateFrom, dateTo, dayCount, dictVacationKindID),
      reason: reason
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

me.doPosting = function ({ item, order, isImportOperation, saved, isSingle = false, currentPeriod }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'organizationID.mi_data_id', 'employeeID', 'dictVacationKindID',
      'employeePositionID', 'employeePositionID.accrualSum', 'employeePositionID.changeOrderID', 'employeeNumberID',
      'employeeNumberID.description', 'dictVacationKindID.code', 'dictVacationKindID.name', 'dictVacationKindID.dictTimeCostID',
      'dictVacationKindID.dictTimeCostID.timeCostType', 'orderID', 'orderID.orderNumber', 'orderID.orderDate',
      'orderID.description', 'dictVacationKindID.isRankAssignment'
    ])
    .selectById(item.ID)
  para.mi_unityEntity = item.mi_unityEntity
  para.dictTimeCostID = para['dictVacationKindID.dictTimeCostID']
  if (!para.dictTimeCostID) {
    throw new UB.UBAbort(UB.i18n(`<<<Для виду відпустки "{0}" не вказано елемент обліку робочого часу, проведення неможливе>>`, para['dictVacationKindID.name']))
  }
  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  para.factHour = 0
  const vacDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['isTempVacancy', 'isSuspendVacPlan', 'errorText'])
    .selectById(para.ID)
  timService.checkCrossTimeSheet(para.employeeNumberID, para['dictVacationKindID.dictTimeCostID'], para.dateFrom, para.dateTo, null, true)

  const params = []
  let dayDate = dateService.shiftDate(para.dateFrom)
  let dateTo = dateService.shiftDate(para.dateTo)
  while (dayDate <= dateTo) {
    params.push({
      orderID: para.orderID,
      entityName: 'hr_empOrder',
      employeeNumberID: para.employeeNumberID,
      periodID: currentPeriod.ID,
      dateWork: dayDate,
      factTimeCostID: para['dictVacationKindID.dictTimeCostID']
    })
    dayDate = dateService.nextDay(dayDate)
  }
  timService.setTimeSheet(params)

  const vacationStatus = 'GRANTLONG'
  orderService.insertByOrder({
    store: 'hr_employeeVacation',
    params: {
      organizationID: para['organizationID.mi_data_id'],
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderID: para.orderID,
      paraID: para.ID,
      dictVacationKindID: para.dictVacationKindID,
      employeeID: para.employeeID,
      employeePositionID: para.employeePositionID,
      employeeNumberID: para.employeeNumberID,
      dayCount: para.dayCount,
      cntDay: para.dayCount,
      dateFrom: para.dateFrom,
      dateTo: para.dateTo,
      dictPeriodID: order.periodID,
      empVacationPeriodID: null,
      avgSum: 0,
      vacationStatus,
      orderState: 'POSTED'
    },
    saved: saved
  })

  const isTempVacancy = vacDet.isTempVacancy
  const isSuspendVacPlan = vacDet.isSuspendVacPlan
  const isRankAssignment = para['dictVacationKindID.isRankAssignment']
  const startVac = dateService.shiftDate(para.dateFrom)
  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs('ID', 'isPause', 'dateFrom', 'dateTo', 'pauseOrderDetID', 'dictVacationKindID.isProportional')
    .where('employeeNumberID', '=', para.employeeNumberID)
    // .where('dateFrom', '<=', startVac)
    .where('dateTo', '>=', startVac)
    .selectAsObject()

  if (isTempVacancy) {
    orderService.insertByOrder({
      store: 'hr_empLongTermAbsc',
      params: {
        organizationID: order.organizationID,
        employeeNumberID: para.employeeNumberID,
        orderID: para.orderID,
        paraID: para.ID,
        dateFrom: para.dateFrom,
        dateToEmpty: para.dateTo,
        changeOrderID: null
      },
      saved: saved
    })
  }
  if (isSuspendVacPlan) {
    vacPlan.forEach(vacPlanItem => {
      const vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan'])
        .where('empVacationPlanID', '=', vacPlanItem.ID)
        .selectAsObject()
      vacPeriod.forEach(perItem => {
        const periodDateFrom = dateService.shiftDate(perItem.dateFrom)
        const periodDateTo = dateService.shiftDate(perItem.dateTo)
        if (periodDateFrom > startVac) {
          orderService.deleteByOrder({
            store: 'hr_empVacationPeriod',
            params: {
              ID: perItem.ID
            },
            saved
          })
        } else if (periodDateFrom <= startVac && startVac < periodDateTo) {
          const params = {
            ID: perItem.ID,
            dateTo: dateService.addDays(startVac, -1)
          }
          const oldValues = {
            dateTo: perItem.dateTo
          }
          if (vacPlanItem['dictVacationKindID.isProportional']) {
            oldValues.dayCountPlan = perItem.dayCountPlan
            params.dayCountPlan = Math.round(perItem.dayCountPlan * dateService.dateDiff(periodDateFrom, params.dateTo) / (dateService.dateDiff(periodDateFrom, periodDateTo)))
          }
          orderService.updateByOrder({
            store: 'hr_empVacationPeriod',
            params,
            saved: saved,
            oldValues
          })
        }
      })
      if (dateService.shiftDate(vacPlanItem.dateFrom) <= startVac) {
        orderService.updateByOrder({
          store: 'hr_empVacationPlan',
          params: {
            ID: vacPlanItem.ID,
            isPause: true,
            pauseOrderDetID: para.ID
          },
          saved: saved,
          oldValues: {
            isPause: vacPlanItem.isPause,
            pauseOrderDetID: vacPlanItem.pauseOrderDetID
          }
        })
      } else {
        orderService.deleteByOrder({
          store: 'hr_empVacationPlan',
          params: {
            ID: vacPlanItem.ID
          },
          saved: saved
        })
      }
    })
  }

  if (isRankAssignment) {
    const rank = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dateNext', 'comment'])
      .where('employeeID', '=', para.employeeID)
      .orderByDesc('dateFrom')
      .limit(1)
      .selectSingle()
    if (rank && !dateService.isMaxDate(rank.dateNext)) {
      orderService.updateByOrder({
        store: 'hr_publServRang',
        params: {
          ID: rank.ID,
          dateNext: dateService.addDays(rank.dateNext, para.dayCount),
          comment: `${rank.comment ? rank.comment + '; ' : 'Перенесення: '}${para['orderID.description'] ? para['orderID.description'] : ''}`
        },
        oldValues: {
          dateNext: rank.dateNext,
          comment: rank.comment
        },
        saved: saved
      })
    }
  }

  let errorText = vacDet.errorText || null
  if (errorText) {
    orderService.updateByOrder({
      store: 'hr_empOrderVacationlongDet',
      params: {
        ID: para.ID,
        errorText: null
      },
      saved: saved,
      oldValues: {
        errorText: errorText
      }
    })
  }
  orderService.createActingAccrual({ para: para, saved: saved })
  if (isSingle) {
    orderService.saveOldValues(item, saved)
  }
}

me.doCancelPosting = function (item, isSingle = false) {
  if (item.orderState === 'CANCELED') {
    return
  }

  let isVacProlongExist = UB.Repository('hr_empOrderVacationprolonglDet')
    .attrs('orderID')
    .where('grantVacationParaID', '=', item.paraID)
    .selectAsArrayOfValues()
  if (isVacProlongExist) {
    let orderProlong = UB.Repository('hr_empOrder')
      .attrs('ID')
      .where('ID', 'in', isVacProlongExist)
      .where('orderState', '=', 'POSTED')
      .selectAsArrayOfValues()
    if (orderProlong.length) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо відмінити проведення наказу!')}>>>`)
    }
  }
  if (!isSingle) {
    timService.removeTimeSheetChange(item.orderID)
    timService.cancelTimeSheet(item.orderID)
  } else {
    let employeeNumberID = item.employeeNumberID

    if (!employeeNumberID) {
      employeeNumberID = UB.Repository(item.mi_unityEntity).attrs('employeeNumberID').selectById(item.ID).employeeNumberID
    }
    if (!employeeNumberID) {
      throw new UB.UBAbort(`${__entityName}.doCancelPosting -> no employeeNumberID found`)
    }
    timService.removeTimeSheetChange(item.orderID, item.ID)
    timService.cancelTimeSheet(item.orderID, [employeeNumberID])
    calcService.addCalcTimeSheetQueue({ employeeNumberID, entityName: 'hr_empOrderVacationlongDet' })
  }
  orderService.restoreOldValues(item)
}

/**
 * Додати пункти наказу для всіх організацій
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.paraID пункт наказу
 */
me.addMultiOrder = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const paraID = mParams.paraID
  const empOrder = UB.Repository('hr_empOrder')
    .attrs('titleOrder', 'preamble', 'reason', 'empOrderType', 'orderDate', 'entryDate', 'orderClass', 'organizationID', 'documentOrderType')
    .selectById(orderID)
  if (!empOrder) {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено, можливо його було видалено')}>>>`)
  }
  const para = UB.Repository(__entityName)
    .attrs('employeePositionID', 'employeeID', 'dictVacationKindID', 'empOrderType', 'isTempVacancy', 'isSuspendVacPlan',
      'dayCount', 'dateFrom', 'dateTo', 'reason', 'reasonDoc', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'
    )
    .selectById(paraID)
  if (!para) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено пункт наказу, можливо його було видалено')}>>>`)
  }
  const orgList = []
  const empPosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'organizationID', 'departmentID', 'positionID', 'employeeNumberID', 'description')
    .where('employeeID', '=', para.employeeID)
    .where('organizationID', '!=', empOrder.organizationID)
    .where('dateFrom', '<=', para.dateFrom)
    .where('dateTo', '>=', para.dateFrom)
    .selectAsObject()
  if (empPosition.length) {
    const empOrderStore = UB.DataStore('hr_empOrder')
    const vacDetStore = UB.DataStore(__entityName)
    empPosition.forEach(emp => {
      const periodID = (periodService.getCurrentPeriod(emp.organizationID) || {}).ID
      const masterOrganizationName = UB.Repository('hr_organization')
        .attrs('name')
        .where('mi_data_id', '=', emp.organizationID)
        .where('state', '=', 'ACTIVE')
        .orderBy('mi_dateFrom', 'desc')
        .selectScalar() || null
      orgList.push(masterOrganizationName)
      const newOrderID = empOrderStore.generateID()
      empOrderStore.run('insert', {
        execParams: {
          ID: newOrderID,
          orderNumber: UB.i18n('(проєкт)'),
          orderDate: empOrder['orderDate'],
          entryDate: empOrder['entryDate'],
          organizationID: emp.organizationID,
          masterOrganizationName,
          masterOrganizationID: emp.organizationID,
          empOrderType: empOrder['empOrderType'],
          orderClass: empOrder['orderClass'],
          titleOrder: empOrder['titleOrder'],
          preamble: empOrder['preamble'],
          reason: empOrder['reason'],
          periodID,
          documentOrderType: empOrder['documentOrderType'],
          reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
        }
      })
      const orderDetID = vacDetStore.generateID()
      vacDetStore.run('insert', {
        execParams: {
          ID: orderDetID,
          itemIdx: 1,
          orderID: newOrderID,
          departmentID: emp.departmentID,
          positionID: emp.positionID,
          organizationID: emp.organizationID,
          employeePositionID: emp.ID,
          dictVacationKindID: para['dictVacationKindID'],
          employeeNumberID: emp.employeeNumberID,
          employeeID: para['employeeID'],
          firstName: para['employeeID'],
          lastName: para['employeeID'],
          middleName: para['employeeID'],
          title: emp['description'],
          empOrderType: para['empOrderType'],
          isTempVacancy: para['isTempVacancy'],
          isSuspendVacPlan: para['isSuspendVacPlan'],
          dayCount: para['dayCount'],
          dateFrom: para['dateFrom'],
          dateTo: para['dateTo'],
          periodID,
          reason: para['reason'],
          reasonDoc: para['reasonDoc']
        }
      })
    })
    if (orgList.length) {
      mParams.msg = `${UB.i18n('Створено накази в таких організаціях')}: <br/>${orgList.join('<br/>')}`
    }
  } else {
    mParams.msg = UB.i18n('Не знайдено призначень в інших організаціях')
  }
}
