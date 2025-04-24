const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const calcService = require('../HR/modules/calcService')
const timeCostService = require('../HR/modules/timeCostService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addIntComb')

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

function getDescription (dateFrom, dateTo, dayCount) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let dayCountStr = dayCount ? ' тривалістю ' + dayCount + '  днів' : ''
  return UB.i18n(`Продовження відпустки з {0}{1}{2}`, dateFromStr, dateToStr, dayCountStr)
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  let dateTo = execParams.calcDateTo || instanceData.calcDateTo || execParams.dateTo || instanceData.dateTo
  let dayCount = execParams.calcDayCount || instanceData.calcDayCount || execParams.dayCount || instanceData.dayCount
  execParams.description = getDescription(dateFrom, dateTo, dayCount)
}

function setPrimeVacationPara (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.grantVacationParaID) {
    const vacOrder = UB.Repository('hr_empOrderDet')
      .attrs(['empOrderType', 'mi_unityEntity'])
      .selectById(execParams.grantVacationParaID)
    if (vacOrder['mi_unityEntity'] === 'hr_empOrderVacationlongDet') {
      execParams.primeVacationParaID = execParams.grantVacationParaID
    } else if (vacOrder['mi_unityEntity'] === 'hr_empOrderVacationprolonglDet') {
      execParams.primeVacationParaID = UB.Repository('hr_empOrderVacationprolonglDet')
        .attrs('primeVacationParaID').where('ID', '=', execParams.grantVacationParaID).selectScalar()
    }
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
  setPrimeVacationPara(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setPrimeVacationPara(ctx)
  setAttrs(ctx)
}

me.doPosting = function ({ item, order, isImportOperation, saved, isSingle = false, currentPeriod }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'organizationID.mi_data_id', 'employeeID', 'grantVacationParaID',
      'grantVacationParaID.empOrderType', 'employeePositionID', 'employeePositionID.accrualSum', 'employeePositionID.changeOrderID',
      'employeeNumberID', 'employeeNumberID.description', 'orderID', 'orderID.description', 'actingPosition',
      'primeVacationParaID', 'grantVacationParaID.mi_unityEntity'])
    .selectById(item.ID)

  const grantVacationParaID = para['grantVacationParaID.mi_unityEntity'] === 'hr_empOrderVacationprolonglDet' ? para['primeVacationParaID'] : para['grantVacationParaID']
  const longDet = UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['dictVacationKindID', 'isTempVacancy'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(grantVacationParaID)
  const dictVacationKind = UB.Repository('hr_dictVacationKind')
    .attrs(['code', 'name', 'dictTimeCostID', 'dictTimeCostID.timeCostType'])
    .selectById(longDet.dictVacationKindID) || {}

  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  para.mi_unityEntity = item.mi_unityEntity
  para.dictTimeCostID = dictVacationKind['dictTimeCostID']
  if (!para.dictTimeCostID) {
    throw new UB.UBAbort(UB.i18n(`<<<Для виду відпустки "{0}" не вказано елемент обліку робочого часу, проведення неможливе>>`, dictVacationKind['name']))
  }
  para.factHour = 0
  const vacDet = UB.Repository('hr_empOrderVacationprolonglDet')
    .attrs(['errorText'])
    .selectById(para.ID)

  timService.checkCrossTimeSheet(para.employeeNumberID, dictVacationKind['dictTimeCostID'], para.dateFrom, para.dateTo, null, true)

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
      factTimeCostID: dictVacationKind['dictTimeCostID']
    })
    dayDate = dateService.nextDay(dayDate)
  }
  timService.setTimeSheet(params)

  orderService.insertByOrder({
    store: 'hr_employeeVacation',
    params: {
      organizationID: para['organizationID.mi_data_id'],
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderID: para.orderID,
      paraID: para.ID,
      dictVacationKindID: longDet.dictVacationKindID,
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
      vacationStatus: 'PROLONGL',
      orderState: 'POSTED'
    },
    saved: saved
  })
  if (longDet.isTempVacancy) {
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
  let startVac = dateService.shiftDate(para.dateFrom)
  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs('ID', 'isPause', 'dateTo', 'pauseOrderDetID')
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('dateFrom', '<=', startVac)
    .where('dateTo', '>=', startVac)
    .selectAsObject()
  vacPlan.forEach(vacPlanItem => {
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
  })

  let vacPeriod = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'empVacationPlanID.dictVacationKindID.isProportional', 'dayCountPlan'])
    .where('empVacationPlanID', 'in', vacPlan.map(vacPlanItem => vacPlanItem.ID))
    .where('dateFrom', '>=', startVac, 'A1')
    .where('dateFrom', '<=', startVac, 'A2')
    .where('dateTo', '>=', startVac, 'A3')
    .logic('([A1] OR ([A2] AND [A3]))')
    .orderBy('dateFrom')
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID.isProportional': 'isProp'
    })
  vacPeriod.forEach(vacPeriodItem => {
    if (dateService.shiftDate(vacPeriodItem.dateFrom) > startVac) {
      orderService.deleteByOrder({
        store: 'hr_empVacationPeriod',
        params: {
          ID: vacPeriodItem.ID
        },
        saved: saved
      })
    } else {
      let dayCountPlan = vacPeriodItem.dayCountPlan
      if (vacPeriodItem.isProp) {
        const decDay = dateService.dayDiff(startVac, Math.min(new Date(para.dateTo), new Date(vacPeriodItem.dateTo)))
        dayCountPlan = Math.max(0, (vacPeriodItem.dayCountPlan - decDay))
      }
      orderService.updateByOrder({
        store: 'hr_empVacationPeriod',
        params: {
          ID: vacPeriodItem.ID,
          dateTo: startVac,
          dayCountPlan: dayCountPlan
        },
        saved: saved,
        oldValues: {
          dateTo: vacPeriodItem.dateTo,
          dayCountPlan: vacPeriodItem.dayCountPlan
        }
      })
    }
  })

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
  let errorText = vacDet.errorText || null
  if (errorText) {
    orderService.updateByOrder({
      store: para.mi_unityEntity,
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

  const vacSubstitutionDet = UB.Repository('hr_empOrderVacSubstitutionDet')
    .attrs(['*', 'employeePositionID.description'])
    .where('paraID', '=', item.ID)
    .selectAsObject()

  vacSubstitutionDet.forEach(det => {
    const curpos = UB.Repository('hr_employeePositionS')
      .attrs(['dateFrom', 'dateTo', 'changeOrderID'])
      .selectById(det.employeePositionID)
    if (!curpos) {
      throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено поточне призначення для {0}. Перевиберіть призначення в пункті наказу.', det['employeePositionID.description'])}>>>`)
    }
    if (curpos.changeOrderID && curpos.changeOrderID !== para.orderID) {
      let orderDesc = orderService.getOrderDescription(curpos.changeOrderID)
      orderDesc = orderDesc ? ' - ' + orderDesc : ''
      throw new UB.UBAbort(`<<<${UB.i18n('Проведення наказу неможливе - для призначення {0} були зроблені зміни іншим наказом {1}', det['employeePositionID.description'], orderDesc)}>>>`)
    }
    orderService.updateByOrder({
      store: 'hr_employeePosition',
      params: {
        ID: det.employeePositionID,
        dateTo: dateService.addDays(dateService.shiftDate(det.dateFrom), -1),
        changeOrderID: para.orderID
      },
      saved: saved,
      oldValues: {
        dateTo: curpos.dateTo,
        changeOrderID: curpos.changeOrderID
      }
    })
    orderService.cloneEmployeePosition({
      employeePositionID: det.employeePositionID,
      params: {
        dateFrom: det.dateFrom,
        dateTo: det.dateTo,
        appointReason: para['orderID.description'],
        orderID: para.orderID,
        paraID: para.ID
      },
      saved: saved
    })
  })
  if (isSingle) {
    orderService.saveOldValues(item, saved)
  }
}

me.doCancelPosting = function (item, isSingle = false) {
  if (item.orderState === 'CANCELED') {
    return
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
    calcService.addCalcTimeSheetQueue({ employeeNumberID, entityName: 'hr_empOrderVacationprolonglDet' })
  }

  orderService.restoreOldValues(item)
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
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason
  const grantVacationParaID = mParams.grantVacationParaID
  const grantVac = grantVacationParaID && UB.Repository('hr_empOrderVacationlongDet')
    .attrs(['dateFrom', 'dateTo'])
    .where('ID', '=', grantVacationParaID)
    .selectSingle()

  let resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATIONPROLONGL', orderID, employeePositionID, dateFrom,
    dateTo, dayCount, true, (empPosID) => {
      let res
      let empOrderVac
      if (grantVac) {
        let grantDateFrom = dateService.shiftDate(grantVac.dateFrom)
        let grantDateTo = dateService.shiftDate(grantVac.dateTo)
        empOrderVac = UB.Repository('hr_empOrderVacationlongDet')
          .attrs(['ID'])
          .where('employeePositionID', '=', empPosID)
          .where('dateFrom', '=', grantDateFrom)
          .where('dateTo', '=', grantDateTo)
          .where('orderID.orderState', '!=', 'PROJECT')
          .selectSingle()
      }
      if (empOrderVac) {
        res = {
          description: getDescription(dateFrom, dateTo, dayCount),
          reason: reason,
          grantVacationParaID: empOrderVac.ID
        }
      }
      return res
    }, () => {})
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}
