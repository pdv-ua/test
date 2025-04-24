const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('./modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.entity.addMethod('getDescriptionExt')

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

me.doPosting = function ({ order, item, para, saved }) {
  const paraQuery = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'orderID', 'orderID.description', 'employeePositionID', 'employeePositionID.changeOrderID',
      'employeePositionID.dateTo', 'employeePositionID.dateFrom', 'employeeNumberID', 'employeeID', 'dictReasonDismID.name',
      'employeePositionID.workPlace', 'employeeID.fullFIO', 'transferOrgID', 'transferDepartmentID', 'transferPositionID',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeePositionID.dictStaffCatID',
      'employeePositionID.dictCategoryECBID', 'employeePositionID.accrualSum', 'employeePositionID.payElID',
      'employeePositionID.mtCount', 'employeePositionID.contractType', 'employeePositionID.workerType',
      'employeePositionID.workScheduleID', 'employeePositionID.dictTarifCoeffID',
      'employeePositionID.workScheduleID.organizationID', 'mtCount', 'transferPositionID.positionType',
      'transferPositionID.accrualSum', 'transferPositionID.dictTarifCoeffID', 'employeePositionID.description'
    ]).misc({ __mip_recordhistory_all: true })
  para = paraQuery.selectById(item.ID)

  const position = UB.Repository('hr_position')
    .attrs(['dictPositionID', 'positionCategory', 'personalType', 'positionType', 'dictStaffCatID', 'dictStaffSubCatID',
      'accrualSum', 'payElID', 'dictFundSourceID', 'workScheduleID', 'dictTarifCoeffID', 'dictCostTypeID'])
    .selectById(para['transferPositionID']) || {}

  let onDate = dateService.shiftDate(para.dateFrom)
  let posDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
  if (posDateTo <= onDate) {
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
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш пізньою датою', para['employeeID.fullFIO'])}>>>`)
    }
  }
  if (posDateTo < onDate) {
    throw new UB.UBAbort(`<<<${UB.i18n('Спроба звільнити {0} з закритого призначення. Перевиберіть призначення в пункті наказу.', para['employeePositionID.description'])}>>>`)
  }
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

  const vacPeriods = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dayDiff', 'dayCountFactCorr', 'empVacationPlanID.dictVacationKindID', 'dayDiffDism',
      'dayCountFact', 'dayCountPlan', 'dateFrom', 'dateTo', 'comment'])
    .where('empVacationPlanID.employeeNumberID', '=', para.employeeNumberID)
    .where('dayDiff', '>', 0)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID'
    })

  const comment = (item.comment || '') + ' ' + (order.description || '')
  vacPeriods.forEach(item => {
    orderService.updateByOrder({
      store: 'hr_empVacationPeriod',
      params: {
        ID: item.ID,
        dateTo: dateService.shiftDate(item.dateTo) > onDate ? onDate : item.dateTo,
        dayDiffDism: item.dayDiff,
        dayCountFactCorr: item.dayDiff,
        comment: comment.trim() || null
      },
      saved: saved,
      oldValues: {
        dateTo: item.dateTo,
        dayDiff: item.dayDiff,
        dayCountFactCorr: item.dayCountFactCorr,
        dayDiffDism: item.dayDiffDism,
        comment: item.comment
      }
    })
  })
  orderService.closeRank({ para, saved, isSameDate: true })
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
  const orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  const empOrg = UB.Repository('ac_employeeOrg')
    .attrs('ID')
    .where('employeeID', '=', para.employeeID)
    .where('organizationID', '=', para.transferOrgID)
    .selectSingle()
  if (!empOrg) {
    orderService.insertByOrder({
      store: 'ac_employeeOrg',
      params: {
        employeeID: para.employeeID,
        organizationID: para.transferOrgID
      },
      saved: saved
    })
  }
  const empOrderStore = UB.DataStore('hr_empOrder')
  const orderID = empOrderStore.generateID()
  orderService.insertByOrder({
    store: empOrderStore,
    params: {
      ID: orderID,
      orderNumber: UB.i18n('(проєкт)'),
      orderDate: order['orderDate'],
      entryDate: order['orderDate'],
      organizationID: para.transferOrgID,
      empOrderType: 'APPOINT',
      orderClass: orderClass,
      periodID: (periodService.getCurrentPeriod(para.transferOrgID) || {}).ID,
      reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
    },
    saved: saved
  })

  const tabNum = global['hr_employeeNumber'].getNextTabNum({
    mParams: {
      orderItemID: me.paraID,
      orderEntity: 'hr_empOrderAppointDet',
      organizationID: para.transferOrgID,
      employeeID: para.emp
    }
  })
  const srcOrganizationName = UB.Repository('hr_organization')
    .attrs('name')
    .where('mi_data_id', '=', order.organizationID)
    .where('state', '=', 'ACTIVE')
    .orderBy('mi_dateFrom', 'desc')
    .selectScalar() || null

  const dictAppointKindID = UB.Repository('hr_dictAppointKind').attrs('ID').where('code', '=', '2').selectScalar() || null

  const posProp = UB.Repository('hr_positionTypeProps')
    .attrs(['contractType', 'dictContractKindID', 'dictStaffCatID', 'payElID', 'workPlace', 'workScheduleID', 'workerType', 'dictFundSourceID'])
    .where('positionType', '=', para['transferPositionID.positionType'] || null)
    .selectSingle() || {}

  const defDictContractKindID = UB.Repository('hr_dictContractKind')
    .attrs('ID').orderBy('code').selectScalar()

  const orderDetID = orderService.insertByOrder({
    store: 'hr_empOrderAppointDet',
    params: {
      orderID: orderID,
      itemIdx: 1,
      employeeID: para.employeeID,
      tabNum,
      firstName: para['employeeID.firstName'],
      lastName: para['employeeID.lastName'],
      middleName: para['employeeID.middleName'],
      empOrderType: 'APPOINT',
      srcOrganizationID: order.organizationID,
      srcOrganizationName,
      isTransfer: 1,
      organizationID: para.transferOrgID,
      departmentID: para.transferDepartmentID,
      positionID: para.transferPositionID,
      dateFrom: dateService.addDays(para['dateFrom'], 1),
      dictContractKindID: posProp['dictContractKindID'] || defDictContractKindID,
      dictStaffCatID: posProp['dictStaffCatID'] || position['dictStaffCatID'],
      dictCategoryECBID: para['employeePositionID.dictCategoryECBID'],
      accrualSum: position['accrualSum'] || para['transferPositionID.accrualSum'] || 0,
      payElID: posProp['payElID'] || position['payElID'],
      mtCount: para.mtCount || 1,
      contractType: posProp['contractType'],
      workerType: posProp['workerType'],
      workPlace: posProp['workPlace'],
      workScheduleID: posProp['workScheduleID'] || position['workScheduleID'],
      dictAppointKindID,
      dictTarifCoeffID: position['dictTarifCoeffID'] || para['transferPositionID.dictTarifCoeffID'],
      dictFundSourceID: posProp['dictFundSourceID'] || position['dictFundSourceID'],
      dictCostTypeID: position['dictCostTypeID'],
      parentEmpNumberID: para.employeeNumberID
    },
    saved: saved
  })

  orderService.updateByOrder({
    store: 'hr_empOrderTransferDet',
    params: {
      ID: item.ID,
      appointOrderID: orderID
    },
    oldValues: {
      appointOrderID: null
    },
    saved: saved
  })

  vacPeriods.forEach(row => {
    orderService.insertByOrder({
      store: 'hr_empOrderVacationPlan',
      params: {
        orderDetID,
        dictVacationKindID: row.dictVacationKindID,
        dateFrom: row['dateFrom'],
        dateTo: row['dateTo'],
        dayCount: row.dayCountPlan,
        dayFact: row.dayCountFact,
        isRest: true
      },
      saved: saved
    })
  })
}

me.doCancelPosting = function ({ order, item }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'appointOrderID', 'appointOrderID.description', 'appointOrderID.orderState', 'employeePositionID.description', 'appointOrderID.organizationName'])
    .misc({ __mip_recordhistory_all: true })
    .selectById(item.ID)
  if (para['appointOrderID.orderState'] !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе! Наказ "{0}" для працівника {1} вже оброблено в організації "{2}"!',
      para['appointOrderID.description'], para['employeePositionID.description'], para['appointOrderID.organizationName'])}>>>`)
  }
}
