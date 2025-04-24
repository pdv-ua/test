const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')

me.details = [
  {
    detailName: 'empOrderSTMovePosDet',
    entityName: 'hr_empOrderSTMovePosDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'organizationID', 'empOrderType', 'positionID', 'posName', 'posFullName',
      'prevPosName', 'prevPosFullName', 'employeePositionID.employeeID.fullFIO', 'employeeNumberID', 'employeeID',
      'prevAccrualSum', 'accrualSum', 'empOrderType', 'employeePositionID.accrualSum', 'posFullNameNom', 'prevPosFullNameNom'
    ], ['lineNum'])
  },
  {
    detailName: 'empOrderTarifficationPosDet',
    entityName: 'hr_empOrderSTMovePosDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'organizationID', 'empOrderType', 'positionID', 'posName', 'posFullName',
      'prevPosName', 'prevPosFullName', 'employeePositionID.employeeID.fullFIO', 'employeeNumberID', 'employeeID',
      'prevAccrualSum', 'accrualSum', 'empOrderType', 'employeePositionID.accrualSum', 'posFullNameNom', 'prevPosFullNameNom',
      'mtCount', 'workPlace', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'departmentID', 'depName', 'dictPositionID',
      'employeeNumberID.tabNum'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}
function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}
function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}
function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}
function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.title = execParams.description = `Рознесення змін за штатним розписом`
}

me.doPosting = function ({
  item,
  order,
  saved
}) {
  if (item.mi_unityEntity === 'hr_empOrderSTMovePosDet') return
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'staffTableID', 'staffTableID.entryOrderID', 'organizationID', 'staffTariffingID', 'empOrderType'])
    .selectById(item.ID)

  if (para.empOrderType === 'STAFFTABLEMOVE_TARIF') {
    const entryOrder = UB.Repository('hr_staffTariffing')
      .attrs(['entryDate', 'orderState', 'description', 'orderNumber', 'orderDate'])
      .selectById(para['staffTariffingID'])

    if (entryOrder.orderState !== 'POSTED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Проведення наказу неможливе - наказ {0} не проведено', entryOrder.description)}>>>`)
    }
    const entryDate = dateService.shiftDate(entryOrder['entryDate'])
    const empPosDet = UB.Repository('hr_empOrderSTMovePosDet')
      .attrs(['ID', 'employeePositionID', 'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'employeeID.fullFIO',
        'employeePositionID.description', 'employeePositionID.changeOrderID', 'mtCount', 'accrualSum', 'dictTarifCoeffID',
        'positionID', 'departmentID', 'dictPositionID', 'positionID.mi_data_id', 'departmentID.mi_data_id',
        'employeePositionID.accrualSum', 'employeePositionID.mtCount', 'employeePositionID.dictTarifCoeffID'])
      .where('paraID', '=', item.ID)
      .selectAsObject()

    empPosDet.forEach(row => {
      if (dateService.shiftDate(row['employeePositionID.dateFrom']) > entryDate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш пізньою датою', row['employeePositionID.description'])}>>>`)
      }
      if (dateService.shiftDate(row['employeePositionID.dateTo']) < entryDate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш ранньою датою', row['employeePositionID.description'])}>>>`)
      }
      const curPosition = UB.Repository('hr_employeePosition')
        .attrs('*')
        .selectById(row.employeePositionID)

      const inOneDay = dateService.shiftDate(row['employeePositionID.dateFrom']).getTime() === entryDate.getTime()
      orderService.closeEmployeePosition({
        params: {
          changeOrderID: item.orderID,
          dateTo: inOneDay ? entryDate : dateService.addDays(entryDate, -1),
          isActive: inOneDay ? 0 : 1,
          ID: row.employeePositionID,
          dismOrder: item['orderID.description']
        },
        closeWorkbook: false,
        oldValues: {
          dateTo: row['employeePositionID.dateTo'],
          changeOrderID: row['employeePositionID.changeOrderID'],
          isActive: 1
        },
        mParams: {},
        saved: saved
      })
      curPosition.dateFrom = entryDate
      curPosition.accrualSum = row.accrualSum
      curPosition.mtCount = row.mtCount
      curPosition['organizationID.mi_data_id'] = curPosition.organizationID
      curPosition['departmentID.mi_data_id'] = row['departmentID.mi_data_id']
      curPosition['positionID.mi_data_id'] = row['positionID.mi_data_id']
      curPosition['dictPositionID'] = row['dictPositionID']
      delete curPosition.ID
      curPosition.paraID = item.ID
      curPosition.appointOrder = item['orderID.description']
      curPosition.orderID = item.orderID
      curPosition.appointOrder = UB.i18n(`Наказ №{0} від {1}`, entryOrder.orderNumber, dateService.formatDate(entryOrder.orderDate))
      curPosition.appointReason = entryOrder.description
      curPosition.raiseSalary = null
      const newID = orderService.createEmployeePosition({
        para: curPosition,
        saved: saved,
        isCreateWorkBookRecord: false
      })
      orderService.copyEmpPosFundSource({ priorID: row.employeePositionID, newID, saved })
    })
  } else {
    const entryOrder = UB.Repository('hr_empOrder')
      .attrs(['entryDate', 'orderState', 'description', 'orderNumberFull', 'orderDate'])
      .selectById(para['staffTableID.entryOrderID'])

    if (entryOrder.orderState !== 'POSTED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Проведення наказу неможливе - наказ {0} не проведено', entryOrder.description)}>>>`)
    }

    const entryDate = dateService.shiftDate(entryOrder['entryDate'])

    const empPosDet = UB.Repository('hr_empOrderSTMovePosDet')
      .attrs(['ID', 'employeePositionID', 'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'employeeID.fullFIO',
        'employeePositionID.description', 'employeePositionID.changeOrderID', 'posFullName', 'prevPosFullName', 'prevAccrualSum', 'accrualSum',
        'positionID', 'positionID.positionType', 'positionID.psCategory.name'])
      .where('paraID', '=', item.ID)
      .selectAsObject()

    empPosDet.forEach(row => {
      if (dateService.shiftDate(row['employeePositionID.dateFrom']) > entryDate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш пізньою датою', row['employeePositionID.description'])}>>>`)
      }
      if (dateService.shiftDate(row['employeePositionID.dateTo']) < entryDate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ, працівник {0} має зміни за призначенням більш ранньою датою', row['employeePositionID.description'])}>>>`)
      }
      const closeWorkBook = row['posFullName'] !== row['prevPosFullName']

      const curPosition = UB.Repository('hr_employeePositionS')
        .attrs('*')
        .selectById(row.employeePositionID)

      const inOneDay = dateService.shiftDate(row['employeePositionID.dateFrom']).getTime() === entryDate.getTime()
      orderService.closeEmployeePosition({
        params: {
          changeOrderID: item.orderID,
          dateTo: inOneDay ? entryDate : dateService.addDays(entryDate, -1),
          isActive: inOneDay ? 0 : 1,
          ID: row.employeePositionID,
          dismOrder: item['orderID.description']
        },
        closeWorkbook: closeWorkBook,
        oldValues: {
          dateTo: row['employeePositionID.dateTo'],
          changeOrderID: row['employeePositionID.changeOrderID'],
          isActive: 1
        },
        mParams: {},
        saved: saved
      })
      curPosition.dateFrom = entryDate
      if (row.prevAccrualSum !== row.accrualSum) curPosition.accrualSum = row.accrualSum
      curPosition['organizationID.mi_data_id'] = curPosition.organizationID
      curPosition['departmentID.mi_data_id'] = curPosition.departmentID
      curPosition['positionID.mi_data_id'] = curPosition.positionID
      delete curPosition.ID
      curPosition.paraID = item.ID
      curPosition.appointOrder = item['orderID.description']
      curPosition.orderID = item.orderID
      curPosition.appointOrder = UB.i18n(`Наказ №{0} від {1}`, entryOrder.orderNumberFull, dateService.formatDate(entryOrder.orderDate))
      curPosition.appointReason = 'у зв\'язку із перейменуванням (зміни у штатному розписі)'
      curPosition.raiseSalary = null
      const newID = orderService.createEmployeePosition({
        para: curPosition,
        saved: saved,
        isCreateWorkBookRecord: closeWorkBook,
        mParams: {
          positionCategory: row['positionID.positionType'] === '1' ? row['positionID.psCategory.name'] : null,
          positionType: row['positionID.positionType'],
          workPosition: row['posFullName']
        }
      })
      orderService.copyEmpPosFundSource({ priorID: row.employeePositionID, newID, saved })
    })
  }
}
