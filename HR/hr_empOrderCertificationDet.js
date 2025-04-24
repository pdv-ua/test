const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('getEmployeePositionInfo')
me.entity.addMethod('deleteAccrual')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.deleteAccrual = ctx => {
  let accrualList = UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderDetID', '=', ctx.mParams.ID)
    .selectAsObject().map(item => item.ID)
  if (accrualList.length) {
    UB.DataStore('hr_empOrderAcc').execSQL(`delete from hr_empOrderAcc where ID
    ${entityBaseService.getInExpression('accrualList')}
    `, { accrualList: accrualList })
  }
}
me.getEmployeePositionInfo = ctx => {
  const onDate = dateService.shiftDate(ctx.mParams.onDate || new Date())
  const emPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictFundSourceID', 'dictTarifCoeffID', 'payElID',
      'employeeID',
      'organizationID',
      'positionType',
      'dictContractKindID',
      'dictStaffCatID',
      'dictStaffCatID.name',
      'contractType',
      'workPlace',
      'workerType',
      'workScheduleID',
      'positionID.dictFundSourceID',
      'positionID.positionCategory',
      'positionID.positionCategory.name',
      'positionID.positionType',
      'positionID.dictStaffCatID',
      'positionID.dictStaffCatID.name'
    ])
    .where('ID', '=', ctx.mParams.employeePositionID)
    .joinCondition('positionID.mi_dateFrom', '<=', onDate)
    .joinCondition('positionID.mi_dateTo', '>=', onDate)
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('positionID.state', '=', 'ACTIVE')
    .selectById(ctx.mParams.employeePositionID)
  let dictStaffCatID = emPos['positionID.dictStaffCatID'] || emPos['dictStaffCatID']
  let payElID = emPos.payElID || UB.Repository('hr_positionTypeProps')
    .attrs('payElID')
    .whereIf(emPos.organizationID, 'organizationID', '=', emPos.organizationID)
    .whereIf(emPos['positionID.positionType'], 'positionType', '=', emPos['positionID.positionType'])
    .whereIf(dictStaffCatID, 'dictStaffCatID', '=', dictStaffCatID)
    .whereIf(emPos['positionID.positionCategory'], 'positionCategory', '=', emPos['positionID.positionCategory'])
    .whereIf(emPos['contractType'], 'positionCategory', '=', emPos['contractType'])
    .whereIf(emPos['dictContractKindID'], 'dictContractKindID', '=', emPos['dictContractKindID'])
    .whereIf(emPos['workPlace'], 'workPlace', '=', emPos['workPlace'])
    .whereIf(emPos['workerType'], 'workerType', '=', emPos['workerType'])
    .whereIf(emPos['workScheduleID'], 'workScheduleID', '=', emPos['workScheduleID'])
    .whereIf(emPos['positionID.dictFundSourceID'], 'dictFundSourceID', '=', emPos['positionID.dictFundSourceID'])
    .selectScalar()
  const dictSpecialtyID = UB.Repository('hr_empCertificationAcc')
    .attrs('dictSpecialtyID')
    .where('employeeID', '=', emPos.employeeID)
    .orderByDesc('certificationDate')
    .limit(1)
    .selectScalar()
  const dictTarifCoef = UB.Repository('hr_empTarifCategory')
    .attrs('dictTarifCoeffID', 'dictTarifCoeffID.accrualSum')
    .where('employeeID', '=', emPos.employeeID)
    .orderByDesc('dateFrom')
    .limit(1)
    .selectSingle() || {}

  ctx.mParams.result = {
    dictTarifCoeffID: dictTarifCoef.dictTarifCoeffID || null,
    dictSpecialtyID: dictSpecialtyID || null,
    payElID: payElID || null,
    emPos: emPos['dictStaffCatID.name'] || emPos['positionID.dictStaffCatID.name'],
    destOrganizationName: ctx.mParams.destOrganizationName || null,
    tarifSalary: dictTarifCoef['dictTarifCoeffID.accrualSum'] || null
  }
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: false,
    noSetDescription: true
  })
  let execParams = ctx.mParams.execParams
  if (execParams.certificationType) {
    let certificationType = UB.Repository('ubm_enum')
      .attrs('name')
      .where('eGroup', '=', 'HR_CERTIFICATION_TYPE')
      .where('code', '=', execParams.certificationType)
      .selectScalar()
    execParams.description = certificationType + ' кваліфікації'
  }
}

function beforeInsert (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  global['hr_empOrderDet'].setItemIdx(ctx)
  entityService.setAttrs(ctx, true, previousValues)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, true, previousValues)
  setAttrs(ctx)
}

me.doPosting = function ({
  item,
  order,
  isImportOperation,
  saved,
  isSingle = false
}) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs([
      'ID',
      'itemIdx',
      'orderID',
      'orderState',
      'employeePositionID',
      'employeePositionID.dateFrom',
      'employeePositionID.dateTo',
      'employeePositionID.description',
      'employeeID',
      'employeeID.fullFIO',
      'employeeNumberID',
      'isGroup',
      'organizationID',
      'departmentID',
      'positionID',
      'destOrganizationID',
      'destOrganizationName',
      'orderNumber',
      'orderDate',
      'certificationType',
      'dictTarifCoeffID',
      'tarifSalary',
      'payElID',
      'accrualSum',
      'dictEmpCategoryID',
      'dictSpecialtyID',
      'dateFrom',
      'dateTo',
      'docNumber',
      'reason'
    ]).selectById(item.ID)
  orderService.checkEmployeePositionDate({
    dateFrom: para['employeePositionID.dateFrom'],
    dateTo: para['employeePositionID.dateTo'],
    onDate: para['dateFrom'],
    description: para['employeePositionID.description'],
    isRaise: true
  })
  if (!para) {
    throw UB.UBAbort(`<<<${UB.i18n('Запис про призначення не актуальний на дату {0}. Перевиберіть його в пункті наказу ', dateService.formatDate())}>>>`)
  }
  const dateFrom = dateService.shiftDate(para.dateFrom)
  if (!para.dictEmpCategoryID && settingsService.getByCode('hrCertificationObligAttrs', order.organizationID) !== '2') {
    throw new UB.UBAbort(`<<<${UB.i18n('Не встановлено категорію працівника {0}. Необхідно встановити категорію працівника в пункті наказу', para['employeeID.fullFIO'])}>>>`)
  }
  if (!para.dictTarifCoeffID && settingsService.getByCode('hrCertificationObligAttrs', order.organizationID) === '2') {
    throw new UB.UBAbort(`<<<${UB.i18n('Не встановлено тарифний розряд працівника {0}. Необхідно встановити тарифний розряд працівника в пункті наказу', para['employeeID.fullFIO'])}>>>`)
  }
  if (para.certificationType === 'ASSIGN') {
    if (!para.accrualSum) {
      throw new UB.UBAbort(`<<<${UB.i18n('Проведення неможливо. Не вказано суму окладу для працівника {0}', para['employeeID.fullFIO'])}>>>`)
    }

    const currentAccrual = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'payElID', 'dateFrom', 'dateTo', 'changeOrderID', 'dictFundSourceID'])
      .where('employeeNumberID', '=', para.employeeNumberID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
    const newAccrual = UB.Repository('hr_empOrderAcc')
      .attrs(['payElID', 'dateFrom', 'accrualSum', 'accrualRate'])
      .where('empOrderDetID', '=', para.ID)
      .selectAsObject()
    newAccrual.forEach(newAccrualItem => {
      const currentAccrualItem = currentAccrual.find(o => o.payElID === newAccrualItem.payElID)
      if (currentAccrualItem) {
        orderService.updateByOrder({
          store: 'hr_employeeAccrual',
          params: {
            ID: currentAccrualItem.ID,
            dateTo: dateService.addDays(dateFrom, -1),
            changeOrderID: order.ID
          },
          oldValues: currentAccrualItem,
          saved: saved
        })
      }
      orderService.insertByOrder({
        store: 'hr_employeeAccrual',
        params: {
          employeeID: para.employeeID,
          employeeNumberID: para.employeeNumberID,
          dateFrom: newAccrualItem.dateFrom,
          dateTo: newAccrualItem.dateTo,
          changeOrderID: null,
          accrualSum: newAccrualItem.accrualSum,
          accrualRate: newAccrualItem.accrualRate,
          orderDate: order.orderDate,
          payElID: newAccrualItem.payElID,
          orderID: order.ID,
          orderState: 'POSTED',
          orderNumber: order.orderNumberFull
        },
        saved: saved
      })
    })
    const posAttrs = global.hr_employeePositionS.entity.attributes
    const attrList = Object.keys(posAttrs).filter(attr => attr.indexOf('mi_') !== 0 && !posAttrs[attr].mapping)
    const pos = UB.Repository('hr_employeePositionS')
      .attrs(attrList)
      .where('ID', '=', para.employeePositionID)
      .selectSingle()
    if (!pos) {
      throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено призначення для {0}. Необхідно перевибрати працівника в пункті наказу', para['employeePositionID.description'])}>>>`)
    }
    pos['organizationID.mi_data_id'] = pos.organizationID
    pos['departmentID.mi_data_id'] = pos.departmentID
    pos['positionID.mi_data_id'] = pos.positionID
    pos.orderID = para.orderID
    pos.empOrderType = order.empOrderType
    pos.payElID = para.payElID
    pos.accrualSum = para.accrualSum
    pos.dictTarifCoeffID = para.dictTarifCoeffID
    pos.dictEmpCategoryID = para.dictEmpCategoryID
    pos.appointOrder = para['orderID.description']
    pos.appointReason = 'Присвоєння кваліфікаціїї'
    pos.raiseSalary = null
    const inOneDay = dateService.shiftDate(para['employeePositionID.dateFrom']).getTime() === dateService.shiftDate(para.dateFrom).getTime()
    orderService.closeEmployeePosition({
      params: {
        ID: para.employeePositionID,
        changeOrderID: para.orderID,
        dateTo: inOneDay ? dateService.shiftDate(para.dateFrom) : dateService.addDays(para.dateFrom, -1),
        isActive: inOneDay ? 0 : 1
      },
      oldValues: {
        dateFrom: pos.dateFrom,
        dateTo: pos.dateTo,
        changeOrderID: pos.changeOrderID,
        isActive: 1
      },
      closeWorkbook: false,
      saved: saved
    })
    pos.ID = para.ID
    pos.dateFrom = para.dateFrom
    const newID = orderService.createEmployeePosition({
      para: pos,
      saved: saved,
      isCreateWorkBookRecord: false,
      isImportOperation: false,
      isNotCheckPosition: true
    })
    orderService.copyEmpPosFundSource({ priorID: para.employeePositionID, newID, saved })
    const openCategories = UB.Repository('hr_empCertificationAcc')
      .attrs('ID', 'validityDate')
      .where('employeeID', '=', para.employeeID)
      .where('certificationDate', '<', dateFrom)
      .where('validityDate', '>', dateFrom)
      .selectAsObject()
    const newValidityDate = dateService.addDays(dateFrom, -1)
    openCategories.forEach(row => {
      orderService.updateByOrder({
        store: 'hr_empCertificationAcc',
        params: {
          ID: row.ID,
          validityDate: newValidityDate
        },
        saved: saved,
        oldValues: {
          validityDate: row.validityDate
        }
      })
    })
  }
  const certAcc = UB.Repository('hr_empCertificationAcc')
    .attrs('ID')
    .where('employeeID', '=', para.employeeID)
    .where('typeCertification', '=', para.certificationType)
    .where('certificationDate', '=', dateFrom)
    .where('orderAuthor', '=', para.destOrganizationName)
    .whereIf(para.dictEmpCategoryID,'dictEmpCategoryID', '=', para.dictEmpCategoryID)
    .whereIf(!para.dictEmpCategoryID,'dictEmpCategoryID', 'isNull')
    .whereIf(para.dictSpecialtyID, 'dictSpecialtyID', '=', para.dictSpecialtyID)
    .whereIf(!para.dictSpecialtyID, 'dictSpecialtyID', 'isNull')
    .whereIf(para.dateTo, 'validityDate', '=', para.dateTo)
    .whereIf(!para.dateTo, 'validityDate', 'isNull')
    .whereIf(para.destOrganizationID, 'orderAuthorID', '=', para.destOrganizationID)
    .whereIf(!para.destOrganizationID, 'orderAuthorID', 'isNull')
    .whereIf(para.docNumber, 'docNumber', '=', para.docNumber)
    .whereIf(!para.docNumber, 'docNumber', 'isNull')
    .selectSingle()
  if (!certAcc) {
    orderService.insertByOrder({
      store: 'hr_empCertificationAcc',
      params: {
        employeeID: para.employeeID,
        dictEmpCategoryID: para.dictEmpCategoryID,
        typeCertification: para.certificationType,
        dictSpecialtyID: para.dictSpecialtyID,
        certificationDate: dateFrom,
        validityDate: para.dateTo,
        orderNumber: para.orderNumber,
        orderDate: para.orderDate,
        orderAuthor: para.destOrganizationName,
        orderAuthorID: para.destOrganizationID,
        docNumber: para.docNumber,
        dateIssue: dateFrom,
        comment: para.reason
      },
      saved: saved
    })
  }
  const dateTo = dateService.addDays(dateFrom, -1)
  const entities = ['hr_personCategory', 'hr_empTarifCategory']
  entities.forEach(entityName => {
    const items = UB.Repository(entityName)
      .attrs('ID', 'dateFrom', 'dateTo')
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateService.shiftDate(para.dateTo))
      .selectAsObject()
    items.forEach(item => {
      orderService.updateByOrder({
        store: entityName,
        params: {
          ID: item.ID,
          dateTo: dateService.shiftDate(item.dateFrom) > dateTo ? dateService.shiftDate(item.dateFrom) : dateTo
        },
        oldValues: item,
        saved: saved
      })
    })
    if (entityName === 'hr_personCategory' && para.dictEmpCategoryID) {
      orderService.insertByOrder({
        store: entityName,
        params: {
          employeeID: para.employeeID,
          dictEmpCategoryID: para.dictEmpCategoryID,
          dateFrom: dateFrom,
          dateTo: para.dateTo,
          orderCause: item['orderID.description']
        },
        saved: saved
      })
    } else if (entityName === 'hr_empTarifCategory' && para.dictTarifCoeffID) {
      if (para.dictTarifCoeffID) {
        orderService.insertByOrder({
          store: entityName,
          params: {
            employeeID: para.employeeID,
            dateFrom: dateFrom,
            dateTo: para.dateTo,
            orderCause: item['orderID.description'],
            dictTarifCoeffID: para.dictTarifCoeffID,
            empOrderID: order.ID
          },
          saved: saved
        })
      }
    }
  })
}
me.doCancelPosting = function (item) {
  if (item.orderState === 'CANCELED') {
    return
  }
  orderService.restoreOldValues(item)
}
