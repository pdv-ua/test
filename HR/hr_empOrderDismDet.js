const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('canEditDismReason')

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'title', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  return UB.i18n(`{0}, {1},  № {2} від {3}`, d['employeeID.shortFIO'], d['title'], d['orderID.orderNumber'], dateService.formatDate(d['orderID.orderDate']))
}

// метод для перевірки права редагування причини звільнення
me.canEditDismReason = function () {}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx)
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

function closeTimeSheetChangeOrders (para, employeeNumberID, dateFrom, currentPeriod) {
  const timeSheetChangeOrders = UB.Repository('tim_timeSheet')
    .attrs(['orderID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>', dateFrom)
    .where('orderID', 'isNotNull')
    .where('orderID.orderClass.entityName', '=', 'hr_timeSheetChange')
    .groupBy('orderID')
    .selectAsObject()
  timeSheetChangeOrders.forEach(row => {
    timService.cancelTimeSheetByOrder(row.orderID, para.orderID, currentPeriod, dateService.addDays(dateFrom, 1), null, [employeeNumberID])
  })
}

me.doPosting = function ({ order, item, para, saved }) {
  const paraQuery = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'orderID', 'orderID.description', 'employeePositionID',
      'employeePositionID.dateTo', 'employeePositionID.changeOrderID', 'employeePositionID.dateFrom',
      'employeeNumberID', 'employeeID', 'dictReasonDismID.name', 'employeePositionID.workPlace',
      'employeeID.fullFIO', 'employeePositionID.description'
    ]).misc({ __mip_recordhistory_all: true })
  para = paraQuery.selectById(item.ID)
  let onDate = dateService.shiftDate(para.dateFrom)
  let posDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
  para = paraQuery.selectById(item.ID)
  if (posDateTo < onDate) {
    // try to find actual employee position
    const actualEmpPos = UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('employeeNumberID', '=', para.employeeNumberID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle()
    const empPosStore = UB.DataStore(item.mi_unityEntity)
    if (actualEmpPos) {
      empPosStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          employeePositionID: actualEmpPos.ID
        }
      })
      para = paraQuery.selectById(item.ID)
      onDate = dateService.shiftDate(para.dateFrom)
      posDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
    }
  } else if (posDateTo.getFullYear() !== 9999) {
    let nextPosID = UB.Repository('hr_employeePositionS').attrs('ID')
      .where('employeeNumberID', '=', para.employeeNumberID)
      .where('dateTo', '>', posDateTo)
      .selectScalar()
    if (nextPosID) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш пізньою датою', para['employeePositionID.description'])}>>>`)
    }
  }
  if (posDateTo < onDate) {
    throw new UB.UBAbort(`<<<${UB.i18n('Спроба звільнити {0} з закритого призначення. Перевиберіть призначення в пункті наказу.', para['employeePositionID.description'])}>>>`)
  }
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  orderService.checkIsParaOk(para)
  // Спочатку Закрити призначення за сумісництвом
  if (para['employeePositionID.workPlace'] === '1') {
    let partTimePos = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'changeOrderID'])
      .where('employeeID', '=', para.employeeID)
      .where('workPlace', '=', '2')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('organizationID', '=', order.organizationID)
      .selectAsObject()
    partTimePos.forEach(partTimePosItem => {
      orderService.closeEmployeeNumber({
        params: {
          ID: partTimePosItem.employeeNumberID,
          dateTo: onDate,
          changeOrderID: para.orderID,
          changeParaID: para.ID,
          empOrderType: item.empOrderType
        },
        saved: saved
      })
      orderService.closeEmployeePosition({
        params: {
          ID: partTimePosItem.ID,
          dateTo: onDate,
          changeOrderID: para.orderID,
          dischargeReason: para['dictReasonDismID.name'],
          dismOrder: para['orderID.description']
        },
        oldValues: {
          dateFrom: partTimePosItem.dateFrom,
          dateTo: partTimePosItem.dateTo,
          changeOrderID: partTimePosItem.changeOrderID
        },
        mParams: {
          isOrgDismiss: false
        },
        saved: saved
      })
    })
    const openEmpNumbers = UB.Repository('hr_employeeNumberS')
      .attrs('ID')
      .where('employeeID', '=', para.employeeID)
      .where('ID', '!=', para.employeeNumberID)
      .where('orgID', '=', order.organizationID)
      .where('dateTo', '=', '#maxdate')
      .selectAsObject()
    openEmpNumbers.forEach(row => {
      const lastPartTimePos = UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('employeeNumberID', '=', row.ID)
        .where('workPlace', '=', '2')
        .where('organizationID', '=', order.organizationID)
        .orderBy('dateFrom', 'desc')
        .selectSingle()
      const lastEmpPos = UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('employeeNumberID', '=', row.ID)
        .where('organizationID', '=', order.organizationID)
        .orderBy('dateFrom', 'desc')
        .selectSingle()
      if (lastPartTimePos || !lastEmpPos) {
        // close all timeSheetChange rows
        closeTimeSheetChangeOrders(para, row.ID, onDate, currentPeriod)
        orderService.closeEmployeeNumber({
          params: {
            ID: row.ID,
            dateTo: onDate,
            changeOrderID: para.orderID,
            changeParaID: para.ID,
            empOrderType: item.empOrderType
          },
          saved: saved
        })
      }
    })
  }

  const longTermReplace = UB.Repository('hr_longTermReplace')
    .attrs('ID', 'dateTo', 'changeOrderID')
    .where('employeeNumberReplID', '=', para.employeeNumberID, 'n1')
    .where('employeeNumberAbsID', '=', para.employeeNumberID, 'n2')
    .where('dateTo', '>', onDate)
    .logic('([n1] OR [n2])')
    .selectAsObject()
  longTermReplace.forEach(rerm => {
    orderService.updateByOrder({
      store: 'hr_longTermReplace',
      params: {
        ID: rerm.ID,
        dateTo: onDate,
        changeOrderID: para.orderID
      },
      saved: saved,
      oldValues: {
        dateTo: rerm.dateTo,
        changeOrderID: rerm.changeOrderID
      }
    })
  })

  // close all timeSheetChange rows
  closeTimeSheetChangeOrders(para, para.employeeNumberID, onDate, currentPeriod)

  orderService.closeEmployeeNumber({
    params: {
      ID: para.employeeNumberID,
      dateTo: onDate,
      changeOrderID: para.orderID,
      changeParaID: para.ID,
      empOrderType: item.empOrderType
    },
    saved: saved
  })
  orderService.closeEmployeePosition({
    params: {
      ID: para.employeePositionID,
      dateTo: onDate,
      changeOrderID: para.orderID,
      dischargeReason: para['dictReasonDismID.name'],
      dismOrder: para['orderID.description']
    },
    oldValues: {
      dateFrom: para['employeePositionID.dateFrom'],
      dateTo: para['employeePositionID.dateTo'],
      changeOrderID: para['employeePositionID.changeOrderID']
    },
    mParams: {
      isOrgDismiss: true
    },
    saved: saved
  })

  // UBHR-21096 do not close rank
  // orderService.closeRank({ para, saved, isSameDate: true })
  global.hr_empOrderDismVac.closeVacDays({ para, saved })
  /* recalcPlanDays should be after closeVacDays */
  global.hr_empVacationPlan.recalcPlanDays({ employeeNumberID: para.employeeNumberID, dismDate: para.dateFrom, saved: saved })

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
        paraID: para.ID,
        dictContractKindID: det.dictContractKindID
      },
      saved: saved
    })
  })
  orderService.createActingAccrual({ para: para, saved: saved })

  orderService.tryClosePublServRangsExceptLast(para['employeeID'], order, saved)
}

me.doCancelPosting = function ({ order, item }) {
  const dismPara = UB.Repository('hr_empOrderDismDet')
    .attrs(['employeeNumberID', 'employeePositionID', 'dateFrom'])
    .selectById(item.ID)
  if (dismPara) {
    const pos = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'description', 'orderID.description'])
      .where('organizationID', '=', order.organizationID)
      .where('employeeNumberID', '=', dismPara.employeeNumberID)
      .where('ID', '!=', dismPara.employeePositionID)
      .where('dateFrom', '>=', dateService.shiftDate(dismPara.dateFrom))
      .selectSingle()
    if (pos) {
      throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе - для працівника {0} існують інші призначення, які були створені іншим наказом ({1})',
        pos.description, pos['orderID.description'])}>>>`)
    }
  }
}
