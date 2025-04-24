const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.entity.addMethod('editPastPeriod')
me.entity.addMethod('getAllowedDepartments')

me.entity.addMethod('canViewFirstDep')
me.entity.addMethod('canViewOneDep')
me.entity.addMethod('canViewAllDep')

me.editPastPeriod = function () {} // метод для проверки прав на редактирование прошлых периодов
me.canViewFirstDep = function () {} // метод для перевірки прав на перегляд документів структурного підрозділу і підпорядкованих
me.canViewOneDep = function () {} // метод для перевірки прав на перегляд документів підрозділу, в якому працює користувач
me.canViewAllDep = function () {} // метод для перевірки прав на перегляд табеля всіх підрозділів

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.orderNumber = orderService.getOrderNum(__entityName, execParams.orderDate, execParams.organizationID)
  if (execParams.dateFrom) {
    execParams.dateFrom = dateService.shiftDate(execParams.dateFrom)
  }
  if (execParams.dateTo) {
    execParams.dateTo = dateService.shiftDate(execParams.dateTo)
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.dateFrom = dateService.shiftDate(execParams.dateFrom)
  }
  if (execParams.dateTo) {
    execParams.dateTo = dateService.shiftDate(execParams.dateTo)
  }
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
}

me.getAllowedDepartments = function (ctx) {
  const params = ctx.mParams
  const onDate = dateService.shiftDate(params.onDate)
  const orgID = params.orgID
  const employeeNumberID = params.employeeNumberID
  const isFirstDep = params.isFirstDep
  const depList = getUserDeparments(employeeNumberID, onDate, orgID, isFirstDep).filter(Boolean)
  if (!depList.length) depList.push(0)
  ctx.mParams.departments = JSON.stringify(depList)
}

function getUserDeparments (employeeNumberID, onDate, orgID, isFirstDep) {
  const userDep = UB.Repository('hr_employeePositionS')
    .attrs(['departmentID', 'depMiTreePath'])
    .where('employeeNumberID', '=', employeeNumberID || 0)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle()
  if (userDep) {
    if (isFirstDep) {
      const miTreePath = userDep['depMiTreePath'] || ''
      const indepDep = UB.Repository('hr_department')
        .attrs(['mi_treePath', 'mi_data_id'])
        .where('orgID', '=', orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_data_id', 'in', (miTreePath).split('/').filter(o => o).map(o => parseInt(o)))
        .misc({ __mip_ondate: onDate })
        .orderBy('mi_treePath').limit(1)
        .selectSingle()
      if (indepDep) {
        const depList = UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', orgID)
          .where('state', '=', 'ACTIVE')
          .where('mi_treePath', 'startWith', indepDep['mi_treePath'])
          .misc({ __mip_ondate: onDate })
          .selectAsObject()
        return depList.map(o => o['mi_data_id'])
      }
    }
    return [userDep.departmentID]
  }
  return []
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const period = periodService.getPeriod(execParams.periodID || instanceData.periodID)
  orderService.beforeDeleteOrder(ctx)
  const timesheet = UB.Repository('tim_timeSheet')
    .attrs(['ID'])
    .where('orderID', '=', execParams.ID)
    .selectSingle()
  if (timesheet) {
    if (period.isClosed) {
      throw new UB.UBAbort(`<<<${UB.i18n('Документ коригував табель у попередніх періодах! Видалення не можливе!')}>>>`)
    }
    timService.cancelTimeSheet(execParams.ID)
  }
}

me.doPosting = function (ctx) {
  const { execParams } = ctx.mParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let period = periodService.getPeriod(execParams.periodID || instanceData.periodID)
  const currentPeriod = periodService.getCurrentPeriod(execParams.organizationID || instanceData.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  const dateFrom = dateService.shiftDate(instanceData.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  const periodList = periodService.getPeriodsByDate(execParams.organizationID || instanceData.organizationID, dateFrom, dateService.shiftDate(instanceData.dateTo))
  let fromPeriodList = false
  if (!canEditBlocked && periodList.find(o => o.isBlock)) {
    let periodNames = ''
    const blockPeriod = periodList.filter(o => o.isBlock)
    blockPeriod.forEach(p => {
      periodNames += `</br>${p.name}`
    })
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}:${periodNames}>>>`)
  }
  if (!canEditBlocked) {
    const timeSheetBlock = UB.Repository('tim_timeSheetBlock')
      .attrs(['employeeNumberID.description', 'periodSalaryID.name'])
      .where('periodSalaryID.dateFrom', '<=', dateTo)
      .where('periodSalaryID.dateTo', '>=', dateFrom)
      .where('employeeNumberID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
      .groupBy(['employeeNumberID.description', 'periodSalaryID.name'])
      .selectAsObject()
    if (timeSheetBlock.length) {
      let errorMessage = ''
      timeSheetBlock.forEach(empData => {
        errorMessage += `${UB.i18n('Період {0} заблокований для працівника {1}!', empData['periodSalaryID.name'], empData['employeeNumberID.description'])}</br>`
      })
      throw new UB.UBAbort(`<<<${errorMessage}${UB.i18n('Проведення не можливо')}!>>>`)
    }
  }

  if (dateFrom > currentPeriod.dateTo) {
    fromPeriodList = true
  } else {
    if (currentPeriod.isBlock && !canEditBlocked) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')} ${currentPeriod.name}>>>`)
    }
    if (currentPeriod.isClosed) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')} ${currentPeriod.name}>>>`)
    }
    period = currentPeriod
  }

  const isFirstDepRole = App.domainInfo.isEntityMethodsAccessible('hr_empOrderUni', 'canViewFirstDep')
  const isOneDepRole = App.domainInfo.isEntityMethodsAccessible('hr_empOrderUni', 'canViewOneDep')
  const isAllDepRole = App.domainInfo.isEntityMethodsAccessible('hr_empOrderUni', 'canViewAllDep')
  if (!isAllDepRole && (isFirstDepRole || isOneDepRole) && UB.Session.uData.employeeNumberID) {
    const employeeNumberID = UB.Repository(__entityName)
      .attrs(['employeePositionID.employeeNumberID'])
      .where('ID', '=', execParams.ID)
      .selectScalar()
    const empDepartmentID = UB.Repository('hr_employeePositionS')
      .attrs(['departmentID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('organizationID', '=', execParams.organizationID || instanceData.organizationID)
      .selectScalar()
    if (empDepartmentID) {
      const depList = getUserDeparments(UB.Session.uData.employeeNumberID, dateFrom, execParams.organizationID || instanceData.organizationID, isFirstDepRole)
      if (depList.indexOf(empDepartmentID) === -1) {
        throw new UB.UBAbort(`<<<${UB.i18n('Працівник з {0} по {1} працював у підрозділі, на який відсутні права! Проведення не можливо!', dateService.formatDate(dateFrom), dateService.formatDate(dateTo))}>>>`)
      }
    }
  }
  const timeSheetParams = []
  let date = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'mainEmpNumberID']).selectById(execParams.employeeNumberID || instanceData.employeeNumberID)
  const empDateFrom = dateService.shiftDate(employeeNumber.dateFrom)
  const empDateTo = dateService.shiftDate(employeeNumber.dateTo)
  if (date < empDateFrom || dateTo > empDateTo) {
    if (dateService.isMaxDate(empDateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Табельний номер діє лише з {0}. Проведення неможливе!', dateService.formatDate(empDateFrom))}>>>`)
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Табельний номер діє лише у періоді {0} - {1}. Проведення неможливе!', dateService.formatDate(empDateFrom), dateService.formatDate(empDateTo))}>>>`)
    }
  }
  const orderEmployeePosition = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
    .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
    .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
    .where('employeeNumberID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
    .selectAsObject()
  orderEmployeePosition.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  let addEmployeePosition = []
  if (employeeNumber.mainEmpNumberID) {
    addEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
      .where('employeeNumberID', '=', employeeNumber.mainEmpNumberID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
      .selectAsObject()
  } else {
    addEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'dictPositionID'])
      .where('organizationID', '=', employeeNumber.orgID)
      .where('employeeNumberID.mainEmpNumberID', '=', employeeNumber.ID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo || instanceData.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
      .selectAsObject()
  }
  addEmployeePosition.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })

  while (date <= dateTo) {
    if (fromPeriodList) {
      period = periodList.find(o => o.dateFrom <= date && date <= o.dateTo)
    }
    timeSheetParams.push({
      orderID: execParams.ID,
      entityName: 'hr_empOrderUni',
      employeeNumberID: execParams.employeeNumberID || instanceData.employeeNumberID,
      periodID: period.ID,
      dateWork: date,
      factTimeCostID: execParams.dictTimeCostID || instanceData.dictTimeCostID,
      factHour: execParams.hourDay || instanceData.hourDay || 0
    })
    if (addEmployeePosition.length) {
      const mainPos = orderEmployeePosition.find(o => o.employeeNumberID === (execParams.employeeNumberID || instanceData.employeeNumberID) && o.dateFrom <= date && o.dateTo >= date)
      if (mainPos) {
        const addNumber = []
        addEmployeePosition.filter(o => (!employeeNumber.mainEmpNumberID || o.dictPositionID === mainPos.dictPositionID) && o.dateFrom <= date && o.dateTo >= date).forEach(addPos => {
          if (!addNumber.find(o => o === addPos.employeeNumberID)) {
            timeSheetParams.push({
              orderID: execParams.ID,
              entityName: 'hr_empOrderUni',
              employeeNumberID: addPos.employeeNumberID,
              periodID: period.ID,
              dateWork: date,
              factTimeCostID: execParams.dictTimeCostID || instanceData.dictTimeCostID,
              factHour: execParams.hourDay || instanceData.hourDay || 0
            })
            addNumber.push(addPos.employeeNumberID)
          }
        })
      }
    }
    date = dateService.nextDay(date)
  }
  timService.setTimeSheet(timeSheetParams)
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let period = periodService.getPeriod(execParams.periodID || instanceData.periodID)
  const currentPeriod = periodService.getCurrentPeriod(execParams.organizationID || instanceData.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  const canEditPastPeriods = me.entity.haveAccessToMethod('editPastPeriod')
  const canUpdateFuturePeriod = global['tim_timeSheet'].entity.haveAccessToMethod('canUpdateFuturePeriod')
  const canEditBlocked = global['tim_timeSheet'].entity.haveAccessToMethod('editBlockedPeriod')
  const dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  const periodList = periodService.getPeriodsByDate(execParams.organizationID || instanceData.organizationID, dateFrom, dateTo)
  if (!canEditBlocked && periodList.find(o => o.isBlock)) {
    let periodNames = ''
    const blockPeriod = periodList.filter(o => o.isBlock)
    blockPeriod.forEach(p => {
      periodNames += `</br>${p.name}`
    })
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')}:${periodNames}>>>`)
  }
  if (!canEditBlocked) {
    const timeSheetBlock = UB.Repository('tim_timeSheetBlock')
      .attrs(['employeeNumberID.description', 'periodSalaryID.name'])
      .where('periodSalaryID.dateFrom', '<=', dateTo)
      .where('periodSalaryID.dateTo', '>=', dateFrom)
      .where('employeeNumberID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
      .groupBy(['employeeNumberID.description', 'periodSalaryID.name'])
      .selectAsObject()
    if (timeSheetBlock.length) {
      let errorMessage = ''
      timeSheetBlock.forEach(empData => {
        errorMessage += `${UB.i18n('Період {0} заблокований для працівника {1}!', empData['periodSalaryID.name'], empData['employeeNumberID.description'])}</br>`
      })
      throw new UB.UBAbort(`<<<${errorMessage}${UB.i18n('Скасування не можливо!')}>>>`)
    }
  }
  if (!canUpdateFuturePeriod) {
    if (dateFrom > currentPeriod.dateTo) {
      const periodList = periodService.getPeriodsByDate(execParams.organizationID || instanceData.organizationID, dateFrom, dateService.shiftDate(instanceData.dateTo))
      if (periodList.length === 1) {
        timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, periodList[0], execParams.dateFrom || instanceData.dateFrom, execParams.dateTo || instanceData.dateTo)
      } else {
        periodList.forEach(period => {
          const cancelDateFrom = dateFrom > period.dateFrom ? dateFrom : period.dateFrom
          const cancelDateTo = dateTo < period.dateTo ? dateTo : period.dateTo
          timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, period, cancelDateFrom, cancelDateTo)
        })
      }
    } else {
      if (currentPeriod.isBlock && !canEditBlocked) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')} ${currentPeriod.name}>>>`)
      }
      if (currentPeriod.isClosed) {
        throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')} ${currentPeriod.name}>>>`)
      }
      timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod, execParams.dateFrom || instanceData.dateFrom, execParams.dateTo || instanceData.dateTo)
    }
  } else {
    if (period.isClosed && !canEditPastPeriods) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')} ${period.name}>>>`)
    }
    if ((period.isBlock || currentPeriod.isBlock) && !canEditBlocked) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в заблокованому Розрахунковому періоді')} ${period.name}>>>`)
    }
    timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod, execParams.dateFrom || instanceData.dateFrom, execParams.dateTo || instanceData.dateTo)
  }
}
