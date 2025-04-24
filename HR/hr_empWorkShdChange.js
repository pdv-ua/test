const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')

me.on('insert:before', beforeInsert)
me.on('update:after', afterUpdate)
me.on('update:before', beforeUpdate)

me.entity.addMethod('fillWorkShdByOrder')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams

  if (execParams.workScheduleID && !ctx.mParams.isImportOperation) {
    const dateFrom = dateService.shiftDate(execParams.dateFrom)
    const dateTo = execParams.dateToEmpty ? dateService.shiftDate(execParams.dateToEmpty) : dateService.maxDate()
    const data1 = dateFrom ? UB.Repository(__entityName)
      .attrs(['ID', 'employeeID.fullFIO'])
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('workScheduleID', 'isNotNull')
      .where('employeeID', '=', execParams.employeeID)
      .where('isActive', '=', 1)
      .whereIf(execParams.employeeNumberID, 'employeeNumberID', '=', execParams.employeeNumberID)
      .selectSingle() : false
    const data2 = UB.Repository(__entityName)
      .attrs(['ID', 'employeeID.fullFIO'])
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateTo)
      .where('workScheduleID', 'isNotNull')
      .where('employeeID', '=', execParams.employeeID)
      .where('isActive', '=', 1)
      .whereIf(execParams.employeeNumberID, 'employeeNumberID', '=', execParams.employeeNumberID)
      .selectSingle()
    if (data1 || data2) {
      const dataEmp = data1 ? data1['employeeID.fullFIO'] : data2['employeeID.fullFIO']
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0}, на вказаний період вже існує діючий графік! Перетин періодів неможливий!', dataEmp)}>>>`)
    }
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.dateToEmpty && !instanceData.workScheduleID) {
    const order = UB.Repository('hr_empOrder')
      .attrs('organizationID')
      .selectById(instanceData.orderID)
    if (!order) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено!')}>>>`)
    }
    const period = UB.Repository('hr_dictPeriod')
      .attrs(['dateFrom'])
      .where('orgID', '=', order.organizationID || 0)
      .where('isCurrent', '=', true)
      .selectSingle()
    if (period) {
      const periodDateFrom = dateService.shiftDate(period.dateFrom)
      const dateTo = dateService.shiftDate(execParams.dateToEmpty)
      if (periodDateFrom.getTime() > dateTo.getTime()) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінити табель у закритому періоді!')}>>>`)
      }
    }
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = UB.Repository(__entityName).attrs('*').misc({ __skipRls: true }).selectById(execParams.ID)

  if (execParams.dateToEmpty && !instanceData.workScheduleID) {
    const params = {
      orderID: instanceData.orderID,
      changeOrderID: instanceData.orderID,
      paraID: instanceData.paraID,
      dateTo: execParams.dateToEmpty,
      employeeNumbers: instanceData.employeeNumberID ? [instanceData.employeeNumberID] : null
    }
    timService.updateTimeSheetChange(params)
  }
}

me.fillWorkShdByOrder = function (ctx) {
  const ordersDet = UB.Repository('hr_empOrderAppointDet')
    .attrs(['ID', 'employeeID', 'orderID', 'dateFrom', 'workScheduleID', 'changedValues', 'employeeNumberID'])
    .where('orderID.orderState', '=', 'POSTED')
    .where('workScheduleID', 'isNotNull')
    .selectAsObject()

  const store = UB.DataStore('hr_empWorkShdChange')
  const orderStore = UB.DataStore('hr_empOrderAppointDet')

  ordersDet.forEach(det => {
    const saved = JSON.parse(det.changedValues)

    const empWorkShdChangeID = store.generateID()
    const params = {
      employeeID: det.employeeID,
      dateFrom: det.dateFrom,
      workScheduleID: det.workScheduleID,
      orderID: det.orderID,
      paraID: det.ID,
      ID: empWorkShdChangeID,
      employeeNumberID: det.employeeNumberID
    }

    store.run('insert', {
      isOrderOperation: true,
      isImportOperation: true,
      execParams: params
    })

    if (!saved.inserted) {
      saved.inserted = []
    }
    saved.inserted.forEach((item, idx) => { if (item && Object.keys(item).includes('hr_empWorkShdChange')) delete saved.inserted[idx] })
    saved.inserted = saved.inserted.filter(item => !!item)

    const savedObj = {}
    savedObj['hr_empWorkShdChange'] = empWorkShdChangeID
    saved.inserted.push(savedObj)

    saved.orderID = det.orderID
    orderStore.run('update', {
      execParams: {
        ID: det.ID,
        changedValues: JSON.stringify(saved)
      },
      isOrderOperation: true,
      __skipSelectAfterUpdate: true,
      __skipOptimisticLock: true
    })
  })
}
