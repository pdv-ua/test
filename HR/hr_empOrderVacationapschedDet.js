const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('./modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('./modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('createOrder')
me.entity.addMethod('addList')

function setAttrs (ctx, op) {
  const departmentID = ctx.mParams.execParams.departmentID
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: false,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let year = execParams.year || instanceData.year
  let orderID = execParams.orderID || instanceData.orderID
  let orderDesc = UB.Repository('hr_empOrder')
    .attrs(['description'])
    .where('ID', '=', orderID)
    .selectScalar()
  execParams.description = UB.i18n(`{0}, графік відпусток на {1}`, orderDesc, year)
  let orgID = execParams.organizationID || instanceData.organizationID
  if (orgID) {
    let dateTo = execParams.dateTo || instanceData.dateTo
    let orgName = UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: dateTo })
      .selectScalar()
    if (orgName) {
      execParams.description += UB.i18n(` по організації '{0}'`, orgName)
    }
  }
  if (departmentID !== undefined) {
    execParams.departmentID = departmentID
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

me.createOrder = ctx => {
  let mParams = ctx.mParams
  let organizationID = mParams.organizationID
  let year = mParams.year
  let positionCategory = mParams.positionCategory
  let employeePositionID = mParams.employeePositionID
  let employeeNumberID = mParams.employeeNumberID
  let dateFrom = mParams.dateFrom ? new Date(mParams.dateFrom) : null
  let dateTo = mParams.dateTo ? new Date(mParams.dateTo) : null
  let vacScheduleID = mParams.ID

  let orderNumber = UB.i18n('(проєкт)')
  let orderDate = dateService.currentTruncDate()
  let orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  const empOrderStore = UB.DataStore('hr_empOrder')
  let orderID = empOrderStore.generateID()
  empOrderStore.run('insert', {
    execParams: {
      ID: orderID,
      orderNumber: orderNumber,
      orderDate: orderDate,
      entryDate: orderDate,
      organizationID: organizationID,
      empOrderType: 'VACATIONAPSCHED',
      orderClass: orderClass,
      periodID: periodService.getCurrentPeriod(organizationID).ID,
      reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
    }
  })
  empOrderStore.freeNative()

  const empOrderDetStore = UB.DataStore('hr_empOrderVacationapschedDet')
  empOrderDetStore.run('insert', {
    execParams: {
      orderID: orderID,
      itemIdx: 1,
      organizationID: organizationID,
      year: year,
      positionCategory: positionCategory,
      employeePositionID: employeePositionID,
      employeeNumberID: employeeNumberID,
      empOrderType: 'VACATIONAPSCHED',
      dateFrom: dateFrom,
      dateTo: dateTo
    }
  })
  empOrderDetStore.freeNative()

  const vacScheduleStore = UB.DataStore('hr_vacationSchedule')
  vacScheduleStore.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: vacScheduleID,
      orderID: orderID
    }
  })
  vacScheduleStore.freeNative()

  mParams.orderID = orderID
  return true
}

me.addList = ctx => {
  let mParams = ctx.mParams
  let paraID = mParams.paraID
  let vacList = UB.Repository('hr_empOrderVacSchedListDet')
    .attrs(['ID'])
    .where('orderDetID', '=', paraID)
    .selectAsObject()
  const empOrderVacSchedListDetStore = UB.DataStore('hr_empOrderVacSchedListDet')

  vacList.forEach(dataItem => {
    empOrderVacSchedListDetStore.run('delete', {
      execParams: {
        ID: dataItem.ID
      }
    })
  })

  let positionCategory = mParams.positionCategory
  let isBosses = positionCategory && positionCategory === '1'
  let isOthers = positionCategory && positionCategory !== '1'
  let isCorr = mParams.isCorr
  const state = isCorr ? 'EDIT' : 'NEW'
  let orgID = mParams.organizationID
  let dateFrom = dateService.shiftDate(mParams.dateFrom)
  let dateTo = dateService.shiftDate(mParams.dateTo)

  let deptIDs = []
  if (mParams.departmentID) {
    if (mParams.withChild && mParams.depTreePath) {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'startsWith', mParams.depTreePath)
        .misc({ __mip_ondate: mParams.onDate })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [mParams.departmentID]
      }
    } else {
      deptIDs = [mParams.departmentID]
    }
  }

  let vacSched = UB.Repository('hr_vacationSchedule')
    .attrs(['ID'])
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', dateTo)
    .where('dateFrom', '>=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .where('state', '=', state)
    .whereIf(deptIDs.length, 'employeePositionID.departmentID', 'in', deptIDs)
    .whereIf(isBosses, 'employeePositionID.posCatCode', '=', '1')
    .whereIf(isOthers, 'employeePositionID.posCatCode', '!=', '1')
    .selectAsObject()

  vacSched.forEach(dataItem => {
    empOrderVacSchedListDetStore.run('insert', {
      execParams: {
        orderDetID: paraID,
        vacationScheduleID: dataItem.ID
      }
    })
  })
  empOrderVacSchedListDetStore.freeNative()
  mParams.result = true
}
