const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const periodService = require('../HR/modules/periodService')
const entityService = require('../HR/modules/entityService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const timeSheetService = require('../TIM/modules/timeSheetService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)
me.on('select:after', afterSelect)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('deleteEmployee')
me.entity.addMethod('postingEmployee')
me.entity.addMethod('cancelPostingEmployee')
me.entity.addMethod('updateEmployee')

me.details = [
  {
    detailName: 'timeSheetChangeDay',
    entityName: 'hr_timeSheetChangeDay',
    docIDName: 'timeSheetChangeID',
    fieldList: orderService.setFieldListAttribute([
      'numDay', 'dictTimeCostID.nameSmall', 'hoursWork'
    ], ['lineNum'])
  },
  {
    detailName: 'timeSheetChangeEmp',
    entityName: 'hr_timeSheetChangeEmp',
    docIDName: 'timeSheetChangeID',
    fieldList: orderService.setFieldListAttribute(['employeeNumberID.description', 'employeeNumberID.posName',
      'employeeNumberID.depName', 'orderState', 'dateToEmpty', 'flagsFix'
    ],
    ['lineNum'])
  }
]

function beforeInsert (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!ctx.mParams.execParams.periodID) {
    ctx.mParams.execParams.periodID = periodService.getCurrentPeriod(ctx.mParams.execParams.organizationID).ID
  }
  setDefaultAttribute(ctx, previousValues)
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = previousValues
  setDefaultAttribute(ctx, previousValues)
  orderService.saveDetails(ctx, me.details)
}

/**
 * @param {ubMethodParams }ctx
 * @param {object} instanceData
 */
function setDefaultAttribute (ctx, instanceData) {
  const execParams = ctx.mParams.execParams
  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }

  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
  entityService.setAttrs(ctx, true, instanceData, false)
  const attr = ctx.dataStore.entity.attributes['description']
  if (attr && attr.customSettings) {
    const caption = (attr.customSettings.caption !== undefined) ? UB.i18n(attr.customSettings.caption) : ctx.dataStore.entity.caption
    let compositeValue = entityBaseService.getCompositeAttributeValue(ctx, 'description')
    const execParams = ctx.mParams.execParams
    execParams.description = `${caption ? (UB.i18n(caption) + ' ') : ''}${compositeValue || ''}`
  }
  if (execParams.orderID || instanceData.orderID) {
    const order = UB.Repository('hr_order')
      .attrs(['description'])
      .selectById(execParams.orderID || instanceData.orderID)
    if (order && order.description) execParams.description = order.description
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  saveEmployeeList(execParams.ID)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState) {
    if (execParams.orderState === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.orderState === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
  saveEmployeeList(execParams.ID)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_timeSheetChange').attrs(['ID', 'organizationID', 'dateFrom', 'dateToEmpty', 'orderID', 'orderState']).selectById(execParams.ID)
  const dateFrom = dateService.shiftDate(order.dateFrom)

  if (order && order.orderState !== 'POSTED') {
    const tStore = UB.DataStore('hr_timeSheetChange')
    tStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: order.ID,
        orderState: 'POSTED'
      }
    })
    tStore.freeNative()
    return
  }

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  if (currentPeriod.isBlock && !canEditBlocked) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}>>>`)
  }

  const employeeNumberList = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['ID', 'employeeNumberID'])
    .where('timeSheetChangeID', '=', execParams.ID)
    .where('orderState', '=', 'PROJECT')
    .selectAsObject()
  const employeeNumbers = employeeNumberList.map(o => o.employeeNumberID)

  const tsEmpStore = UB.DataStore('hr_timeSheetChangeEmp')
  employeeNumberList.forEach(row => {
    tsEmpStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        orderState: 'POSTED'
      }
    })
  })
  tsEmpStore.freeNative()

  let dateTo = order.dateToEmpty ? dateService.shiftDate(order.dateToEmpty) : dateService.addMonths(currentPeriod.dateTo, 2)
  let timeSheetChange = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['ID', 'employeeNumberID.description', 'timeSheetChangeID.description'])
    .where('timeSheetChangeID.organizationID', '=', order.organizationID)
    .where('timeSheetChangeID', '!=', execParams.ID)
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('timeSheetChangeID.dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .where('timeSheetChangeID.orderState', '=', 'POSTED')
    .where('[timeSheetChangeID.mi_deleteDate]', '>=', '#maxdate')
    .selectAsObject()

  if (timeSheetChange && timeSheetChange.length) {
    let messageTxt = 'Для працівників вже існує проведене скорочення дня/тижня на цей період:<br>'
    timeSheetChange.forEach(change => {
      messageTxt += `${change['employeeNumberID.description']} у ${change['timeSheetChangeID.description']}<br>`
    })
    messageTxt += 'Проведення не можливо!'
    throw new UB.UBAbort(`<<<${messageTxt}>>>`)
  }

  const paraOrder = order.orderID ? UB.Repository('hr_empOrder').attrs('empOrderType').selectById(order.orderID) : null
  const checkIntersect = paraOrder && paraOrder.empOrderType && ['VACATIONLONG'].includes(paraOrder.empOrderType)

  if (dateFrom < currentPeriod.dateFrom) {
    timService.cancelTimeSheet(execParams.ID)
    if (execParams.orderID || order.orderID) {
      timService.cancelTimeSheet(execParams.orderID || order.orderID)
    }
  }
  const reCalcPeriods = periodService.getPeriodsByDate(order.organizationID, dateFrom, dateTo)
  reCalcPeriods.forEach(period => {
    timeSheetService.fillTimeSheet({
      organizationID: order.organizationID,
      periodID: period.ID,
      employeeNumbers,
      checkPeriod: false,
      checkIntersect: checkIntersect
    })
  })
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_timeSheetChange').attrs(['ID', 'orderID', 'organizationID', 'orderState']).selectById(execParams.ID)

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  if (currentPeriod.isBlock && !canEditBlocked) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}>>>`)
  }

  if (order && order.orderState !== 'PROJECT') {
    const tStore = UB.DataStore('hr_timeSheetChange')
    tStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: order.ID,
        orderState: 'PROJECT'
      }
    })
    tStore.freeNative()
    return
  }
  timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod)
  if (execParams.orderID || order.orderID) {
    timService.cancelTimeSheetByOrder(execParams.orderID || order.orderID, execParams.ID, currentPeriod)
  }



  const employeeList = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['ID'])
    .where('timeSheetChangeID', '=', execParams.ID)
    .where('orderState', '=', 'POSTED')
    .selectAsObject()
  const tsEmpStore = UB.DataStore('hr_timeSheetChangeEmp')
  employeeList.forEach(row => {
    tsEmpStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        orderState: 'PROJECT'
      }
    })
  })
  tsEmpStore.freeNative()
  /*
  timService.cancelTimeSheet(execParams.ID)
  if (execParams.orderID || order.orderID) {
    timService.cancelTimeSheet(execParams.orderID || order.orderID)
  }
  */
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

/**
 * Додає список осіб (прізвище та ініціали) з пунктів в поле наказу employeeList при видаленні, додаванні або редагуванні пунктів
 * Додаються перші 7 осіб. Якща їх більше, додається "та ін." до списку
 * Викликається в hr_empOrderDet.js
 * @param {number} orderID ID наказу
 * @param {number} paraID ID пункту
 */
function saveEmployeeList (timeSheetChangeID) {
  const getShortFIO = (firstName, middleName, lastName) => {
    lastName = (lastName || '').trim()
    firstName = (firstName || '').trim()
    middleName = (middleName || '').trim()

    firstName = firstName && firstName.substr(0, 1).toUpperCase() + '.'
    middleName = middleName && middleName.substr(0, 1).toUpperCase() + '.'
    return (lastName + ' ' + firstName + ' ' + middleName).trim()
  }
  const maxCount = 7
  let employeeList = []

  let employeeData = UB.Repository('hr_timeSheetChangeEmp')
    .attrs('ID', 'employeeNumberID.employeeID.shortFIO', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName', 'employeeNumberID.employeeID.lastName')
    .where('timeSheetChangeID', '=', timeSheetChangeID)
    .limit(50)
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'shortFIO',
      'employeeNumberID.employeeID.firstName': 'firstName',
      'employeeNumberID.employeeID.middleName': 'middleName',
      'employeeNumberID.employeeID.lastName': 'lastName'
    })

  for (let i = 0, len = employeeData.length; i < len && employeeList.length < maxCount + 1; i++) {
    let item = employeeData[i]
    let name = item.shortFIO || getShortFIO(item.firstName, item.middleName, item.lastName)
    !employeeList.includes(name) && employeeList.push(name)
  }
  if (employeeList.length > maxCount) {
    employeeList = employeeList.slice(0, maxCount).join(', ') + ' та ін.'
  } else {
    employeeList = employeeList.join(', ')
  }
  UB.DataStore(__entityName).execSQL(`update ${__entityName} set employeeList = :employeeList: where ID = :timeSheetChangeID:`, {
    employeeList,
    timeSheetChangeID
  })
}

me.deleteEmployee = function (ctx) {
  const timeSheetChangeEmp = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['ID', 'employeeNumberID', 'orderState'])
    .limit(1)
    .selectById(ctx.mParams.execParams.ID)

  if (!timeSheetChangeEmp) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис не знайдено. Можливо його вже було видалено')}>>>`)
  }

  if (timeSheetChangeEmp.orderState === 'POSTED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис має статус "Проведено"')}>>>`)
  }

  const store = UB.DataStore('hr_timeSheetChangeEmp')
  store.run('delete', {
    __skipOptimisticLock: true,
    execParams: {
      ID: ctx.mParams.execParams.ID
    }
  })
  store.freeNative()
}

me.postingEmployee = function (ctx) {
  const execParams = ctx.mParams.execParams

  const employeeData = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['employeeNumberID', 'orderState', 'timeSheetChangeID', 'employeeNumberID.orgID'])
    .limit(1)
    .selectById(execParams.ID)

  if (!employeeData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис не знайдено. Можливо його вже було видалено')}>>>`)
  }

  if (employeeData.orderState === 'POSTED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис має статус "Проведено"')}>>>`)
  }

  const order = UB.Repository('hr_timeSheetChange').attrs(['organizationID', 'dateFrom', 'dateToEmpty', 'orderID']).selectById(employeeData.timeSheetChangeID)
  const dateFrom = dateService.shiftDate(order.dateFrom)

  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  if (currentPeriod.isBlock && !canEditBlocked) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}>>>`)
  }

  const store = UB.DataStore('hr_timeSheetChangeEmp')
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.ID,
      orderState: 'POSTED'
    }
  })
  store.freeNative()

  const hasProject = UB.Repository('hr_timeSheetChangeEmp')
      .attrs('ID')
      .where('timeSheetChangeID', '=', employeeData.timeSheetChangeID)
      .where('orderState', '=', 'PROJECT')
      .limit(1)
      .selectSingle()
  if (!hasProject) {
    const tStore = UB.DataStore('hr_timeSheetChange')
    tStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: employeeData.timeSheetChangeID,
        orderState: 'POSTED'
      }
    })
  }

  let dateTo = order.dateToEmpty ? dateService.shiftDate(order.dateToEmpty) : dateService.addMonths(currentPeriod.dateTo, 2)
  let timeSheetChange = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['ID', 'employeeNumberID.description', 'timeSheetChangeID.description'])
    .where('timeSheetChangeID.organizationID', '=', order.organizationID)
    .where('timeSheetChangeID', '!=', employeeData.timeSheetChangeID)
    .where('employeeNumberID', '=', employeeData.employeeNumberID)
    .where('timeSheetChangeID.dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .where('timeSheetChangeID.orderState', '=', 'POSTED')
    .where('[timeSheetChangeID.mi_deleteDate]', '>=', '#maxdate')
    .selectAsObject()

  if (timeSheetChange && timeSheetChange.length) {
    let messageTxt = 'Для працівників вже існує проведене скорочення дня/тижня на цей період:<br>'
    timeSheetChange.forEach(change => {
      messageTxt += `${change['employeeNumberID.description']} у ${change['timeSheetChangeID.description']}<br>`
    })
    messageTxt += 'Проведення не можливо!'
    throw new UB.UBAbort(`<<<${messageTxt}>>>`)
  }

  const paraOrder = order.orderID ? UB.Repository('hr_empOrder').attrs('*').selectById(order.orderID) : null
  const checkIntersect = paraOrder && paraOrder.empOrderType && ['VACATIONLONG'].includes(paraOrder.empOrderType)

  if (dateFrom < currentPeriod.dateFrom) {
    timService.cancelTimeSheet(employeeData.timeSheetChangeID, [employeeData.employeeNumberID])
    if (execParams.orderID || order.orderID) {
      timService.cancelTimeSheet(execParams.orderID || order.orderID, [employeeData.employeeNumberID])
    }
  }
  const reCalcPeriods = periodService.getPeriodsByDate(order.organizationID, dateFrom, dateTo)
  reCalcPeriods.forEach(period => {
    timeSheetService.fillTimeSheet({
      organizationID: order.organizationID,
      periodID: period.ID,
      employeeNumbers: [employeeData.employeeNumberID],
      checkPeriod: false,
      checkIntersect: checkIntersect
    })
  })
  /*
  if (dateFrom < currentPeriod.dateFrom) {
    accrualService.setRecalculatePeriod({
      orgID: employeeData['employeeNumberID.orgID'],
      employeeNumberID: employeeData.employeeNumberID,
      periodCalcID: currentPeriod.ID,
      dateFrom: dateFrom,
      entityName: __entityName,
      initiatorID: employeeData['timeSheetChangeID'],
      description: `${UB.i18n('Проведено скорочення робочого дня/тижня працівника')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
    })
  }
  */
}

me.cancelPostingEmployee = function (ctx) {
  const execParams = ctx.mParams.execParams

  const employeeData = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['employeeNumberID', 'orderState', 'timeSheetChangeID', 'timeSheetChangeID.dateFrom', 'employeeNumberID.orgID'])
    .limit(1)
    .selectById(execParams.ID)

  if (!employeeData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис не знайдено. Можливо його вже було видалено')}>>>`)
  }

  if (employeeData.orderState === 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис має статус "Не проведено"')}>>>`)
  }

  const order = UB.Repository('hr_timeSheetChange').attrs(['orderID', 'organizationID']).selectById(employeeData.timeSheetChangeID)
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  if (currentPeriod.isBlock && !canEditBlocked) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}>>>`)
  }
  const store = UB.DataStore('hr_timeSheetChangeEmp')
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.ID,
      orderState: 'PROJECT'
    }
  })
  const hasPosted = UB.Repository('hr_timeSheetChangeEmp')
    .attrs('ID')
    .where('timeSheetChangeID', '=', employeeData.timeSheetChangeID)
    .where('orderState', '=', 'POSTED')
    .limit(1)
    .selectSingle()
  if (!hasPosted) {
    const tStore = UB.DataStore('hr_timeSheetChange')
    tStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: employeeData.timeSheetChangeID,
        orderState: 'PROJECT'
      }
    })
  }
  timService.cancelTimeSheetByOrder(employeeData.timeSheetChangeID, employeeData.timeSheetChangeID, currentPeriod, null, null, [employeeData.employeeNumberID])
  if (order.orderID) {
    timService.cancelTimeSheetByOrder(order.orderID, employeeData.timeSheetChangeID, currentPeriod, null, null, [employeeData.employeeNumberID])
  }
  /*
  const dateFrom = dateService.shiftDate(employeeData['timeSheetChangeID.dateFrom'])
  if (dateFrom < currentPeriod.dateFrom) {
    accrualService.setRecalculatePeriod({
      orgID: employeeData['employeeNumberID.orgID'],
      employeeNumberID: employeeData.employeeNumberID,
      periodCalcID: currentPeriod.ID,
      dateFrom: dateFrom,
      entityName: __entityName,
      initiatorID: employeeData['timeSheetChangeID'],
      description: `${UB.i18n('Скасовано скорочення робочого дня/тижня працівника')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
    })
  }
  */
  store.freeNative()
}

me.updateEmployee = function (ctx) {
  const execParams = ctx.mParams.execParams
  const employeeData = UB.Repository('hr_timeSheetChangeEmp')
    .attrs(['employeeNumberID', 'orderState', 'timeSheetChangeID', 'timeSheetChangeID.dateToEmpty'])
    .limit(1)
    .selectById(execParams.ID)

  if (!employeeData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис не знайдено. Можливо його було видалено')}>>>`)
  }

  if (employeeData.orderState === 'POSTED') {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис має статус "Проведено"')}>>>`)
  }
  const isEqualDateTo = (!execParams.dateToEmpty && !employeeData['timeSheetChangeID.dateToEmpty']) || (execParams.dateToEmpty && employeeData['timeSheetChangeID.dateToEmpty'] && dateService.shiftDate(execParams.dateToEmpty).getTime() === dateService.shiftDate(employeeData['timeSheetChangeID.dateToEmpty']).getTime())
  const store = UB.DataStore('hr_timeSheetChangeEmp')
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.ID,
      employeeNumberID: execParams.employeeNumberID,
      dateToEmpty: dateService.shiftDate(execParams.dateToEmpty),
      flagsFix: isEqualDateTo ? 0 : 1
    }
  })
  store.freeNative()
}
