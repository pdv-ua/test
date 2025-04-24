const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const impModule = require('../AC/modules/importData/types/emp.js')
// const dateService = require('../AC/modules/dataServices/dateService')
// me.on('insert:after', createOrder)
me.on('delete:before', deleteOrder)

// me.entity.addMethod('afterImportInsert')
me.afterImportInsert = ctx => {
  createOrder(ctx)
}
function deleteOrder (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  // const execParams = ctx.mParams.execParams
  let orderState = UB.Repository('hr_empOrder').attrs('orderState').where('ID', '=', instanceData.orderID).selectScalar()
  if (!orderState) {
    return
  }
  if (orderState === 'POSTED') {
    UB.DataStore('hr_empOrder').run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: instanceData.orderID,
        orderState: 'PROJECT'
      }
    })
  }
  UB.DataStore('hr_empOrderAppointDet').run('delete', {
    execParams: {
      ID: instanceData.paraID
    }
  })
  UB.DataStore('hr_empOrder').run('delete', {
    execParams: {
      ID: instanceData.orderID
    }
  })
}
function createOrder (ctx) {
  let departmentID = null
  let orderParams = {}
  let execParams = ctx.mParams.execParams
  let importInfo = impModule.getImportInfo()
  if (!importInfo) {
    return
  }
  let employeeID = execParams.employeeID /* UB.Repository('hr_employee').attrs('ID')
    .where('impID', '=', execParams.impEmployeeID)
    .where('impSourceID', '=', execParams.impSourceID)
    .selectSingle() */
  if (!employeeID) {
    importInfo.error = 'Не знайдено працівника ' + execParams.impEmployeeID
    return
  }
  // employeeID = employeeID.ID
  if (!importInfo.orgIDs) {
    let orgImpSourceID = UB.Repository('hr_organization').attrs('impSourceID').where('ID', '=', execParams.impSourceID).selectScalar()
    importInfo.orgIDs = UB.Repository('hr_organization').attrs('ID').where('impSourceID', '=', orgImpSourceID).selectAsObject().map(item => item.ID)
  }
  let position = UB.Repository('hr_position').attrs('ID', 'parentUnitID', 'parentUnitID.mi_unityEntity', 'orgID', 'payElID', 'accrualSum', 'mi_dateFrom')
    .where('impID', '=', execParams.impPosID)
    .where('orgID', 'in', importInfo.orgIDs)
    .misc({ __mip_recordhistory_all: true })
    .selectSingle()
  if (!position || !position.ID) {
    importInfo.error = 'Не знайдено посаду ' + execParams.impPosID
    return
  }
  if (position['parentUnitID.mi_unityEntity'] === 'hr_department') {
    departmentID = position.parentUnitID
  }
  let orderDate = impModule.makeDate(execParams.docDateFrom)
  orderParams.employeeID = employeeID
  orderParams.positionID = position.ID
  orderParams.organizationID = position.orgID
  // orderParams.organizationID = mParams.organizationID
  orderParams.departmentID = departmentID
  orderParams.contractType = '1'
  orderParams.workerType = '1'
  orderParams.dateFrom = orderDate
  if (execParams.isMainWork) {
    orderParams.workerPlace = '1'
  }
  importInfo.position = position
  if (!importInfo.dictContractKindID) {
    importInfo.dictContractKindID = UB.Repository('hr_dictContractKind').attrs('ID').where('code', '=', '01').selectScalar()
  }
  if (!importInfo.workScheduleID) {
    if (importInfo.workScheduleID !== null) {
      importInfo.workScheduleID = UB.Repository('hr_workSchedule').attrs('ID').where('code', '=', 'Std').selectScalar()
      if (!importInfo.workScheduleID) {
        importInfo.workScheduleID = null
      }
    }
  }

  let store = UB.DataStore('hr_empOrder')
  let orderID = store.generateID()
  try {
    store.run('insert', {
      isImportOperation: true,
      execParams: {
        ID: orderID,
        orderNumber: execParams.docNumFrom,
        orderDate: orderDate,
        organizationID: orderParams.organizationID,
        empOrderType: 'APPOINT',
        orderState: 'PROJECT',
        comment: 'import ' + importInfo.dateOf,
        reason: 'import',
        entryDate: orderDate
      }
    })
  } catch (e) {
    importInfo.error = e.message
    return
  }
  let paraID = store.generateID()
  let tabNum = execParams.impTabNum
  if (!tabNum) {
    if (execParams.impEmployeeID) {
      tabNum = 'imp' + execParams.impEmployeeID
    } else {
      tabNum = global['hr_employeeNumber'].getNextTabNum({
        mParams: {
          orderItemID: me.paraID,
          orderEntity: 'hr_empOrderAppointDet',
          organizationID: orderParams.organizationID,
          employeeID
        }
      })
    }
  }
  store = UB.DataStore('hr_empOrderAppointDet')

  store.run('insert', {
    isImportOperation: true,
    execParams: {
      ID: paraID,
      orderID: orderID,
      departmentID: departmentID,
      organizationID: orderParams.organizationID,
      employeeID: employeeID,
      empOrderType: 'APPOINT',
      dateFrom: execParams.dateFrom,
      dateTo: '#maxdate',
      workPlace: execParams.isMainWork ? '1' : null,
      positionID: position.ID,
      contractType: '1',
      workerType: 1,
      mtCount: 1,
      accrualSum: position.accrualSum,
      payElID: position.payElID,
      dictContractKindID: importInfo.dictContractKindID,
      workScheduleID: importInfo.workScheduleID,
      tabNum: tabNum
    }
  })
  if (!importInfo.ac_employeeOrg) {
    importInfo.ac_employeeOrg = {}
  }
  if (!importInfo.ac_employeeOrg[orderParams.organizationID]) {
    importInfo.ac_employeeOrg[orderParams.organizationID] =
        UB.Repository('ac_employeeOrg')
          .attrs('employeeID')
          .where('organizationID', '=', orderParams.organizationID)
          .selectAsObject().map(item => item.employeeID)
  }
  if (!importInfo.ac_employeeOrg[orderParams.organizationID].find(item => item === employeeID)) {
    UB.DataStore('ac_employeeOrg').run('insert', {
      execParams: {
        employeeID: employeeID,
        organizationID: orderParams.organizationID
      }
    })
    importInfo.ac_employeeOrg[orderParams.organizationID].push(employeeID)
  }

  execParams.orderID = orderID
  execParams.paraID = paraID
  // if (new Date(position.mi_dateFrom) > orderDate) {
  //   importInfo.error = UB.i18n(`На дату {0} не дійсна вибрана посада`, dateService.formatDate(orderDate, 'dd.mm.yyyy'))
  //   return
  // }
  try {
    UB.DataStore('hr_empOrder').run('update', {
      __skipOptimisticLock: true,
      isImportOperation: true,
      execParams: {
        ID: orderID,
        orderState: 'POSTED'
      }
    })
  } catch (e) {
    importInfo.error = e.message
  }
}
