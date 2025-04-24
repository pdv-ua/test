const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('createMoveOrder')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

/**
 * Створення наказу про переміщення
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.paraID пункт наказу
 * @param {Date} ctx.dateFrom дата пункту наказу
 * @param {Number} ctx.organizationID  організація
 */
me.createMoveOrder = function (ctx) {
  const { mParams } = ctx
  let para = UB.Repository(__entityName).attrs([
    'orderID.respEmployeePositionID',
    'orderID.respEmployeeNumID',
    'employeePositionID',
    'employeeNumberID',
    'employeeID',
    'empOrderVacationLongID.employeePositionID.payElID',
    'empOrderVacationLongID.employeePositionID.accrualSum',
    'empOrderVacationLongID.employeePositionID.workerType',
    'empOrderVacationLongID.employeePositionID.workScheduleID',
    'empOrderVacationLongID.employeePositionID.contractType',
    'empOrderVacationLongID.employeePositionID.mtCount',
    'empOrderVacationLongID.employeePositionID.dictContractKindID',
    'empOrderVacationLongID.employeePositionID.dictTarifCoeffID',
    'empOrderVacationLongID.employeePositionID.dictStaffCatID',
    'empOrderVacationLongID.positionID',
    'retPositionID',
    'retPositionID.mi_data_id',
    'retPositionID.departmentID',
    'organizationID',
    'orderID.masterOrganizationID',
    'orderID.masterOrganizationName',
    'dateFrom',
    'moveParaID',
    'moveOrderID'])
    .selectById(mParams.paraID)
  let moveParaID = para.moveParaID
  let moveOrderID = para.moveOrderID
  let store = UB.DataStore('hr_empOrder')
  if (moveOrderID) {
    const moveOrder = UB.Repository('hr_empOrder').attrs('ID', 'masterOrganizationID', 'masterOrganizationName').where('ID', '=', moveOrderID).selectSingle()
    if (moveOrder) {
      moveOrderID = moveOrder.ID
      if (!moveOrder.masterOrganizationID || !moveOrder.masterOrganizationName) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: moveOrderID,
            masterOrganizationID: para['orderID.masterOrganizationID'],
            masterOrganizationName: para['orderID.masterOrganizationName']
          }
        })
      }
    } else {
      moveOrderID = null
      moveParaID = null
    }
  }
  if (moveParaID) {
    moveParaID = UB.Repository('hr_empOrderMoveDet').attrs('ID').where('ID', '=', moveParaID).selectScalar()
  }
  if (moveOrderID && moveParaID) {
    ctx.mParams.moveParaID = moveParaID
    ctx.mParams.moveOrderID = moveOrderID
    return
  }
  if (!moveOrderID) {
    moveOrderID = store.generateID()
    store.run('insert', {
      execParams: {
        ID: moveOrderID,
        empOrderType: 'MOVE',
        entryDate: para.dateFrom,
        orderDate: para.dateFrom,
        orderState: 'PROJECT',
        organizationID: para.organizationID,
        masterOrganizationID: para['orderID.masterOrganizationID'],
        masterOrganizationName: para['orderID.masterOrganizationName']
      }
    })
  }
  let movePara = UB.Repository('hr_empOrderMoveDet')
    .attrs('ID')
    .where('orderID', '=', moveOrderID)
    .where('employeePositionID', '=', para['employeePositionID'])
    .selectSingle()
  moveParaID = movePara && movePara.ID
  if (!moveParaID) {
    let store = UB.DataStore('hr_empOrderMoveDet')
    moveParaID = store.generateID()
    const rank = UB.Repository('hr_publServRang').attrs(['ID', 'dictRankID']).where('employeeID', '=', para.employeeID).orderByDesc('dateFrom').limit(1).selectSingle()
    let dictContractKindID = para['empOrderVacationLongID.employeePositionID.dictContractKindID']
    if (!dictContractKindID) {
      dictContractKindID = UB.Repository('hr_dictContractKind').attrs(['ID']).where('name', '=', 'безстроковий').selectScalar()
    }
    if (!dictContractKindID) {
      dictContractKindID = UB.Repository('hr_dictContractKind').attrs(['ID']).limit(1).selectScalar()
    }
    store.run('insert', {
      execParams: {
        ID: moveParaID,
        empOrderType: 'MOVE',
        orderID: moveOrderID,
        dateFrom: para.dateFrom,
        organizationID: para.organizationID,
        destOrganizationID: para.organizationID,
        dictReasonMovingKindID: UB.Repository('hr_dictReasonMoving').attrs('ID').where('code', '=', '01').selectScalar(), // переведення на іншу роботу на тому ж підприємстві
        employeeNumberID: para['employeeNumberID'],
        employeePositionID: para['employeePositionID'],
        employeeID: para['employeeID'],
        positionID: para['retPositionID'] || para['empOrderVacationLongID.positionID'],
        departmentID: para['retPositionID.mi_data_id'] ? para['retPositionID.departmentID'] : para['empOrderVacationLongID.departmentID'],
        payElID: para['empOrderVacationLongID.employeePositionID.payElID'],
        accrualSum: para['empOrderVacationLongID.employeePositionID.accrualSum'],
        workerType: para['empOrderVacationLongID.employeePositionID.workerType'],
        workScheduleID: para['empOrderVacationLongID.employeePositionID.workScheduleID'],
        contractType: para['empOrderVacationLongID.employeePositionID.contractType'] || '1',
        mtCount: para['empOrderVacationLongID.employeePositionID.mtCount'],
        dictContractKindID: dictContractKindID,
        dictTarifCoeffID: para['empOrderVacationLongID.employeePositionID.dictTarifCoeffID'],
        dictStaffCatID: para['empOrderVacationLongID.employeePositionID.dictStaffCatID'],
        dictRankID: rank ? rank.dictRankID : null,
        dateTo: '#maxdate'
      }
    })
  }

  UB.DataStore(__entityName).execSQL(
    `update ${__entityName} set moveOrderID = :moveOrderID:, moveParaID = :moveParaID: where ID = :paraID:`,
    {
      paraID: mParams.paraID,
      moveOrderID: moveOrderID,
      moveParaID: moveParaID
    })
  ctx.mParams.moveOrderID = moveOrderID
  ctx.mParams.moveParaID = moveParaID
}

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

function getDescription (dateFrom) {
  let dateFromStr = dateService.formatDate(dateFrom)
  return UB.i18n(`Вихід із неоплачуваної відпустки з {0}`, dateFromStr)
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
  execParams.description = getDescription(dateFrom)
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
  setAttrs(ctx)
  setPrimeVacationPara(ctx)
}

function setPrimeVacationPara (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.empOrderVacationLongID) {
    const vacOrder = UB.Repository('hr_empOrderDet')
      .attrs(['empOrderType', 'mi_unityEntity'])
      .selectById(execParams.empOrderVacationLongID)
    if (vacOrder['mi_unityEntity'] === 'hr_empOrderVacationlongDet') {
      execParams.primeVacationParaID = execParams.empOrderVacationLongID
    } else if (vacOrder['mi_unityEntity'] === 'hr_empOrderVacationprolonglDet') {
      execParams.primeVacationParaID = UB.Repository('hr_empOrderVacationprolonglDet')
        .attrs('primeVacationParaID').where('ID', '=', execParams.empOrderVacationLongID).selectScalar()
    }
  }
}

me.doPosting = function ({ item, order, isImportOperation, saved, isSingle = false }) {
  // eslint-disable-next-line prefer-destructuring
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'orderID', 'dateFrom', 'empOrderVacationLongID', 'empOrderType',
      'empOrderVacationLongID.orderID',
      'empOrderVacationLongID.dateTo',
      'empOrderVacationLongID.dateFrom',
      'empOrderVacationLongID.employeeID',
      'empOrderVacationLongID.employeePositionID',
      'empOrderVacationLongID.employeeNumberID',
      'empOrderVacationLongID.employeePositionID.changeOrderID',
      'primeVacationParaID',
      'primeVacationParaID.dictVacationKindID',
      'primeVacationParaID.dictVacationKindID.code',
      'title'
    ])
    .where('ID', '=', item.ID)
    .selectAsObject({
      'empOrderVacationLongID.orderID': 'vacOrderID',
      'empOrderVacationLongID.dateTo': 'oldDateTo',
      'empOrderVacationLongID.dateFrom': 'oldDateFrom',
      'empOrderVacationLongID.employeePositionID.changeOrderID': 'empPosChangeOrderID',
      'empOrderVacationLongID.employeePositionID': 'employeePositionID',
      'empOrderVacationLongID.employeeNumberID': 'employeeNumberID',
      'empOrderVacationLongID.employeeID': 'employeeID'
    })[0]
  const oldDateTo = dateService.shiftDate(para.oldDateTo)
  const newDateTo = dateService.shiftDate(para.dateFrom)

  const params = {
    orderID: para.vacOrderID,
    changeOrderID: item.orderID,
    dateTo: dateService.addDays(newDateTo, -1),
    paraID: para['empOrderVacationLongID'],
    employeeNumbers: [para.employeeNumberID]
  }
  timService.updateTimeSheetChange(params)

  let currentPeriod = { ID: order.periodID }
  timService.cancelTimeSheetByOrder(para.vacOrderID, item.orderID, currentPeriod, newDateTo, null, [para.employeeNumberID], true)

  const accrual = UB.Repository('hr_employeeAccrual')
    .attrs('ID', 'dateFrom', 'dateTo', 'changeOrderID')
    .where('orderID', '=', para.vacOrderID)
    .where('dateFrom', '<=', newDateTo)
    .where('dateTo', '>=', newDateTo)
    .where('employeeNumberID', '=', para.employeeNumberID)
    .selectSingle()
  if (accrual) {
    orderService.updateByOrder({
      store: 'hr_employeeAccrual',
      params: {
        ID: accrual.ID,
        dateTo: dateService.addDays(newDateTo, -1),
        changeOrderID: para.orderID
      },
      oldValues: {
        dateTo: accrual.dateTo,
        changeOrderID: accrual.changeOrderID
      },
      saved: saved
    })
  }

  const empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
    .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'changeParaID', 'description'])
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('paraID', '=', para.empOrderVacationLongID)
    .selectSingle()
  if (empLongTermAbsc) {
    orderService.updateByOrder({
      store: 'hr_empLongTermAbsc',
      params: {
        ID: empLongTermAbsc.ID,
        dateTo: dateService.addDays(newDateTo, -1),
        changeOrderID: para.orderID,
        changeParaID: para.ID
      },
      saved: saved,
      oldValues: {
        dateTo: empLongTermAbsc.dateTo,
        changeOrderID: empLongTermAbsc.changeOrderID,
        changeParaID: empLongTermAbsc.changeParaID,
        description: empLongTermAbsc.description
      }
    })
  }
  const longTermReplace = UB.Repository('hr_longTermReplace')
    .attrs('ID', 'dateTo', 'changeOrderID')
    .where('employeeNumberAbsID', '=', para.employeeNumberID)
    .where('dateTo', '>', dateService.addDays(newDateTo, -1))
    .selectAsObject()
  longTermReplace.forEach(rerm => {
    orderService.updateByOrder({
      store: 'hr_longTermReplace',
      params: {
        ID: rerm.ID,
        dateTo: dateService.addDays(newDateTo, -1),
        changeOrderID: para.orderID
      },
      saved: saved,
      oldValues: {
        dateTo: rerm.dateTo,
        changeOrderID: rerm.changeOrderID
      }
    })
  })

  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs('ID', 'isPause', 'dateTo', 'pauseOrderDetID')
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('dateFrom', '<=', newDateTo)
    .where('dateTo', '>=', newDateTo)
    .selectAsObject()
  vacPlan.forEach(vacPlanItem => {
    orderService.updateByOrder({
      store: 'hr_empVacationPlan',
      params: {
        ID: vacPlanItem.ID,
        isPause: false,
        pauseOrderDetID: null
      },
      saved: saved,
      oldValues: {
        isPause: vacPlanItem.isPause,
        pauseOrderDetID: vacPlanItem.pauseOrderDetID
      }
    })
  })
  const rank = UB.Repository('hr_publServRang')
    .attrs(['ID', 'dateNext'])
    .where('employeeID', '=', para.employeeID)
    .orderByDesc('dateFrom').limit(1)
    .selectSingle()
  if (rank) {
    orderService.updateByOrder({
      store: 'hr_publServRang',
      params: {
        ID: rank.ID,
        dateNext: dateService.addDays(rank.dateNext, -dateService.dateDiff(newDateTo, oldDateTo))
      },
      oldValues: {
        dateNext: rank.dateNext
      },
      saved: saved
    })
  }
  const vacation = UB.Repository('hr_employeeVacation')
    .attrs(['ID', 'organizationID', 'employeeID', 'employeeNumberID', 'employeePositionID', 'dateTo', 'dictVacationKindID',
      'empVacationPeriodID'])
    .where('paraID', '=', para.empOrderVacationLongID)
    .selectSingle()
  if (vacation) {
    let dateTo = dateService.addDays(para.dateFrom, -1)
    let dayCount = dateService.dayDiff(dateTo, vacation.dateTo)
    orderService.insertByOrder({
      store: 'hr_employeeVacation',
      params: {
        organizationID: vacation.organizationID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderID: order.ID,
        paraID: para.ID,
        dictVacationKindID: vacation.dictVacationKindID,
        employeeID: vacation.employeeID,
        employeePositionID: vacation.employeePositionID,
        employeeNumberID: vacation.employeeNumberID,
        dayCount: -dayCount,
        dateFrom: null,
        dateTo: dateTo,
        dictPeriodID: order.periodID,
        empVacationPeriodID: vacation.empVacationPeriodID,
        avgSum: 0,
        vacationStatus: 'RETURN',
        orderState: 'POSTED'
      },
      saved: saved
    })
  }
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
        dateTo: det.dateFrom,
        changeOrderID: para.orderID
      },
      saved: saved,
      oldValues: {
        dateTo: curpos.dateTo,
        changeOrderID: curpos.changeOrderID
      }
    })
  })
}

me.doCancelPosting = function (item, isSingle) {
  timService.restoreTimeSheetByChangeOrder(item.orderID, item['organizationID.mi_data_id'])
  orderService.restoreOldValues(item)
}
