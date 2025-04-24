const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const UB = require('@unitybase/ub')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('loadEmployeeList')
me.entity.addMethod('setInitWorkHour')

me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderEmployeeDet')

  if (mParams.isDeleteExisting) {
    const existing = UB.Repository('hr_empOrderEmployeeDet')
      .attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .selectAsObject()
    existing.forEach(row => {
      ds.run('delete', { execParams: { ID: row.ID } })
    })
  }

  mParams.records.forEach(ID => {
    const workSchedule = UB.Repository('hr_employeePosition')
      .attrs('workScheduleID.name')
      .where('ID', '=', ID)
      .selectSingle()
    ds.run('insert', {
      execParams: {
        organizationID: mParams.organizationID,
        employeePositionID: ID,
        orderID: mParams.orderID,
        paraID: mParams.paraID,
        empOrderType: mParams.empOrderType,
        workScheduleName: workSchedule['workScheduleID.name']
      }
    })
  })
}

me.setInitWorkHour = function (ctx) {
  const execParams = ctx.mParams
  if (!execParams.workScheduleID) return
  let ds = UB.DataStore('hr_empOrderCwsWorkHourDayDet')

  let detDays = UB.Repository('hr_empOrderCwsWorkHourDayDet')
    .attrs('ID')
    .where('paraID', '=', execParams.paraID)
    .selectAsObject()

  detDays.forEach(item => {
    ds.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })

  let days = UB.Repository('hr_workScheduleDays')
    .attrs(['numDay', 'workScheduleID', 'dictTimeCostID', 'hoursWork', 'hoursWorkNight', 'hoursWorkEvening',
      'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo'])
    .where('workScheduleID', '=', execParams.workScheduleID)
    .selectAsObject()
  days.forEach(item => {
    ds.run('insert', {
      execParams: {
        orderID: execParams.orderID,
        paraID: execParams.paraID,
        numDay: item.numDay,
        workScheduleID: item.workScheduleID,
        dictTimeCostID: item.dictTimeCostID,
        hoursWork: item.hoursWork,
        hoursWorkNew: item.hoursWork,
        hoursWorkNight: item.hoursWorkNight,
        hoursWorkEvening: item.hoursWorkEvening,
        timeFrom: item.timeFrom,
        timeTo: item.timeTo,
        recreationFrom: item.recreationFrom,
        recreationTo: item.recreationTo
      }
    })
  })
}

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true
  })
}

function beforeInsert (ctx) {
  let execParams = ctx.mParams.execParams
  if (!execParams.description) {
    execParams.description = '..'
  }
  if (execParams.isGroup) {
    execParams.dateFrom = new Date()
  }

  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  let execParams = ctx.mParams.execParams
  if (execParams.description !== undefined && !execParams.description) {
    execParams.description = '..'
  }
  if (execParams.dateFrom || execParams.dateTo) {
    const params = {}
    if (execParams.dateFrom) {
      params.dateFrom = execParams.dateFrom
    }
    if (execParams.dateTo) {
      params.dateTo = execParams.dateTo
    }
    const store = UB.DataStore('hr_empOrderEmployeeDet')
    UB.Repository('hr_empOrderEmployeeDet')
      .attrs('ID')
      .where('paraID', '=', execParams.ID)
      .selectAsObject().forEach(item => {
        params.ID = item.ID
        store.run('update', {
          __skipOptimisticLock: true,
          isOrderOperation: true,
          execParams: params
        })
      })
  }
  setAttrs(ctx)
}
