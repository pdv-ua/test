const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const orderService = require('./modules/orderService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const ebs = require('../AC/modules/entityServices/entityBaseService')
const moment = require('moment')
const timService = require('../HR/modules/timService')
const timeCostService = require('../HR/modules/timeCostService')
const calcService = require('../HR/modules/calcService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const employeePrint = require('../HR/modules/printForm/employeePrint')
const Session = require('@unitybase/ub').Session
const orderValidator = require('../HR/modules/orderValidator')
const timeSheetService = require('../TIM/modules/timeSheetService')
const reconciliationProcess = require('./modules/reconciliationProcess')
const orderPrint = require('../HR/modules/printForm/orderPrint')
const acquaintanceProcess = require('./modules/acquaintanceProcess')

const saveOldValues = orderService.saveOldValues
const restoreOldValues = orderService.restoreOldValues
const getOrderDescription = orderService.getOrderDescription

module.exports = {
  getNotDefaultSaveObj,
  restoreNotDefaultOldValues
}

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)
me.on('delete:after', afterDelete)
me.on('select:before', beforeSelect)

try {
  const orderTypeList = Object.keys(ebs.getEnum('HR_EMPORDRETYPE'))
  orderTypeList.forEach(orderType => {
    ['doPosting', 'doCancelPosting'].forEach(action => {
      const methodCode = action + '_' + orderType
      me[methodCode] = () => {
      } // empty function
      me.entity.addMethod(methodCode)
    })
  })
} catch (error) {
}

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('saveReportSettings')
me.entity.addMethod('fillOrderAccrual')
me.entity.addMethod('fillOrderAccrualWithSave')
me.entity.addMethod('getCalendDays')
me.entity.addMethod('getWorkDays')
me.entity.addMethod('getCalendDays4Vac')
me.entity.addMethod('getWorkDays4Vac')
me.entity.addMethod('getCalendDateTo4Vac')
me.entity.addMethod('getWorkDateTo4Vac')
me.entity.addMethod('setDateAndNumber')
me.entity.addMethod('docPrintForm')
me.entity.addMethod('repPrintForm')
me.entity.addMethod('isWorkDay')
me.entity.addMethod('updateOrderFieldLastChangeDate')
me.entity.addMethod('getValidatorWarning')
me.entity.addMethod('fillOrderExperience')
me.entity.addMethod('clearOrderAccrualsExperience')
me.entity.addMethod('clearOrderAccruals')
me.entity.addMethod('saveEmployeeList')
me.entity.addMethod('deleteDetail')
me.entity.addMethod('canCancelPostingEarlyOrder')
me.entity.addMethod('canEditOrdersSubordinate')
me.entity.addMethod('canEditOrdersMainOrg')
me.entity.addMethod('canEditOnReconciliation')
me.entity.addMethod('editOnReconciliation')
me.entity.addMethod('docPrintForm')
me.entity.addMethod('exchangeReview')
me.entity.addMethod('sendReview')
me.entity.addMethod('addStampData')
me.entity.addMethod('getDocumentWithStampData')

const orderOperation = {}

function cap (str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

/**
 * Додає список осіб (прізвище та ініціали) з пунктів в поле наказу employeeList при видаленні, додаванні або редагуванні пунктів
 * Додаються перші 7 осіб. Якща їх більше, додається "та ін." до списку
 * Викликається в hr_empOrderDet.js
 * @param {number} orderID ID наказу
 * @param {number} paraID ID пункту
 */
me.saveEmployeeList = (orderID, paraID) => {
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
  orderID = orderID || UB.Repository('hr_empOrderDet').attrs('orderID').where('ID', '=', paraID).selectScalar()
  let employeeData = UB.Repository('hr_empOrderDet').attrs('employeeID.shortFIO', 'firstName', 'middleName', 'lastName')
    .where('orderID', '=', orderID)
    // .where('isGroup', '=', 0)
    .where('employeeID', 'isNotNull')
    .where('lastName', 'notLike', '%..%')
    .where('lastName', 'isNotNull')
    .orderBy('itemIdx')
    .limit(50)
    .selectAsObject({
      'employeeID.shortFIO': 'shortFIO'
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
  UB.DataStore(__entityName).execSQL(`update ${__entityName} set employeeList = :employeeList: where ID = :orderID:`, {
    employeeList: employeeList,
    orderID: orderID
  })
}

/**
 * Метод для перевірки права розпроведення наказів для адміністратора
*/
me.canCancelPostingEarlyOrder = () => { }

/**
 * Метод для перевірки права редагування наказів підлеглих організацій
 */
me.canEditOrdersSubordinate = () => { }

/**
 * Метод для перевірки права редагування наказів головної організації
 */
me.canEditOrdersMainOrg = () => { }

/**
 * Метод для перевірки права редагування документу під час погодження
 */
me.canEditOnReconciliation = () => { }

/**
 * Перевірка перед збереженням
 * @param {ubMethodParams} ctx
 * @param {number} ctx.organizationID організація
 * @param {Date} ctx.orderDate дата наказа
 * @param {string} ctx.orderNumber номер наказа
 */
me.checkBeforeInsert = ctx => {
  const execParams = ctx.mParams.execParams
  if (!execParams.orderNumber) {
    execParams.orderNumber = UB.i18n('(проєкт)')
  }
  if (execParams.orderDate) {
    const orgID = execParams.organizationID
    if (!orgID) {
      throw new UB.UBAbort(`<<<${UB.i18n('Організація не вказана')}>>>`)
    }
    if (!ctx.mParams.isImportOperation) {
      const orderDate = execParams.orderDate
      if (!UB.Repository('hr_organization')
        .attrs('ID')
        .where('mi_data_id', '=', orgID)
        .where('mi_dateFrom', '<=', orderDate)
        .where('mi_dateTo', '>=', orderDate)
        .misc({ __mip_recordhistory_all: true })
        .selectScalar()
      ) {
        throw new UB.UBAbort(`<<<${UB.i18n('Організація не дійсна на дату наказу')}>>>`)
      }
    }
  }
}

me.updateOrderFieldLastChangeDate = function (orderID) {
  if (orderOperation[orderID]) {
    return
  }
  UB.DataStore(__entityName).execSQL('update hr_empOrder set fieldLastChangeDate = :fieldLastChangeDate: where ID = :ID:', {
    ID: orderID,
    fieldLastChangeDate: new Date()
  })
}
/**
 * Отримати дані для друкованих форм
 * @param {ubMethodParams} ctx
 * @param {string} ctx.code код форми
 * @param {string} ctx.reportCode код звіта
 * @param {number} ctx.instanceID особа
 * @param {number} ctx.tabNumID працівник
 * @param {Date} ctx.onDate на дату
 * @param {number} ctx.orgID організація
 * @return {object}
 */
me.docPrintForm = function (ctx) {
  const mParams = ctx.mParams
  mParams.docs = employeePrint.getDocx(mParams.params)
}

function beforeSelect (ctxt) {
  const mParams = ctxt.mParams
  if (mParams.whereList) {
    replaceDeep(mParams.whereList, '#currentUserID', Session.userID)
  }
}

function replaceDeep (obj, key, value) {
  for (const prop in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(prop)) {
      const val = obj[prop]
      if (typeof val === 'object') {
        replaceDeep(val, key, value)
      }
      if (val === key) {
        obj[prop] = value
      }
    }
  }
}

me.repPrintForm = function (ctx) {
  const mParams = ctx.mParams
  mParams.content = JSON.stringify({ instanceID: mParams.params.instanceID })
}

/**
 * Отримання кількості календарних днів
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Date} ctx.dateTo Дата закінчення
 */
me.getCalendDays = function (ctx) {
  const mParams = ctx.mParams
  let dateFrom = dateService.shiftDate(mParams.dateFrom)
  let dateTo = dateService.shiftDate(mParams.dateTo)
  mParams.daysCount = timService.getCalendarDays(dateFrom, dateTo)
}

/**
 * Отримання кількості рообочих днів
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Date} ctx.dateTo Дата закінчення
 * @param {number} ctx.mParams.orgID ID організації
 */
me.getWorkDays = function (ctx) {
  const mParams = ctx.mParams
  let dateFrom = dateService.shiftDate(mParams.dateFrom)
  let dateTo = dateService.shiftDate(mParams.dateTo)
  mParams.daysCount = timService.getWorkDays(dateFrom, dateTo, mParams.orgID)
}

/**
 * Отримання кількості календарних днів (для відпустки)
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Date} ctx.dateTo Дата закінчення
 */
me.getCalendDays4Vac = function (ctx) {
  me.getCalendDays(ctx)
}

/**
 * Отримання кількості рообочих днів (для відпустки)
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Date} ctx.dateTo Дата закінчення
 * @param {number} dictVacationKindID вид відпустки
 * @return {number} mParams.daysCount кількість днів
 */
me.getWorkDays4Vac = function (ctx) {
  const mParams = ctx.mParams
  let dateFrom = dateService.shiftDate(mParams.dateFrom)
  let dateTo = dateService.shiftDate(mParams.dateTo)
  let dictVacationKindID = mParams.dictVacationKindID
  mParams.daysCount = timService.getVacDays(dateFrom, dateTo, dictVacationKindID, mParams.orgID)
}

/**
 * Отримання дати закінчення для календарних днів (для відпустки)
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Number} ctx.dayCount Кількість днів
 */
me.getCalendDateTo4Vac = function (ctx) {
  const mParams = ctx.mParams
  mParams.dateTo = timService.getCalendarDateTo(mParams.dateFrom, mParams.dayCount)
}

/**
 * Отримання дати закінчення для робочих днів (для відпустки)
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateFrom Дата початку
 * @param {Number} ctx.dayCount Кількість днів
 */
me.getWorkDateTo4Vac = function (ctx) {
  const mParams = ctx.mParams
  mParams.dateTo = timService.getVacDateTo(mParams.dateFrom, mParams.dayCount, mParams.dictVacationKindID, mParams.orgID)
}

/**
 * Визначення, чи є день робочим для даного розкладу роботи
 * @param {ubMethodParams} ctx
 * @param {Date} ctx.dateOf Дата дня
 * @param {Number} ctx.workScheduleID Розклад роботи
 * @param {Number} ctx.organizationID Організація
 */
me.isWorkDay = function (ctx) {
  const { mParams } = ctx
  let workScheduleID = mParams.workScheduleID
  if (!workScheduleID) {
    workScheduleID = UB.Repository('hr_workSchedule')
      .attrs(['ID'])
      .where('code', '=', 'Std')
      .selectScalar()
  }
  const plan = UB.Repository('tim_plan')
    .attrs('dictTimeCostID.code', 'workHours', 'ID')
    .where('organizationID', '=', mParams.organizationID)
    .where('workScheduleID', '=', workScheduleID)
    .where('dayDate', '=', dateService.shiftDate(mParams.dateOf))
    .limit(1)
    .selectSingle()

  mParams.isWorkDay = plan ? (plan.workHours !== 0) : -1
  mParams.planID = plan ? plan.ID : -1
  return mParams.isWorkDay
}

me.setDateAndNumber = function (ctx) {
  const mParams = ctx.mParams
  const ID = mParams.ID
  const orderNumber = mParams.orderNumber
  const orderDate = mParams.orderDate
  UB.DataStore(__entityName).run('update', {
    execParams: {
      ID: ID,
      orderNumber: orderNumber,
      orderDate: orderDate
    }
  })
}

/**
 * Заповнення нарахувать по наказу
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.empOrderDetID деталь наказу
 * @param {Number} ctx.orderID наказ
 * @param {Number} ctx.positionID посада
 * @param {Date} ctx.dateFrom Дата початку
 * mParams.dateFrom
 */
me.fillOrderAccrual = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.empOrderDetID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}.fillOrderAccrual() -> must specify empOrderDetID', __entityName)}>>>`)
  }
  let orderAccrual = UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderDetID', '=', mParams.empOrderDetID)

  if (mParams.isCheckOnly) {
    mParams.isEmpty = orderAccrual
      .limit(1)
      .select()
      .eof
    return
  }
  if (!mParams.orderID || !mParams.positionID || !mParams.empOrderDetID || !mParams.dateFrom) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}.fillOrderAccrual() -> must specify orderID, empOrderDetID, positionID and dateFrom', __entityName)}>>>`)
  }
  orderAccrual = orderAccrual.select()
  const ds = UB.DataStore('hr_empOrderAcc')
  while (!orderAccrual.eof) {
    ds.run('delete', {
      execParams: {
        ID: orderAccrual.get('ID')
      }
    })
    orderAccrual.next()
  }
  let positionID = mParams.positionID
  const pos = UB.Repository('hr_position')
    .attrs(['mi_data_id'])
    .misc({
      __allowSelectSafeDeleted: true
    })
    .selectById(positionID)
  if (pos) {
    // ищем последний срез для посады на дату dateFrom
    const actualPosition = UB.Repository('hr_position')
      .attrs(['ID'])
      .where('mi_data_id', '=', pos['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .misc({
        __mip_ondate: mParams.dateFrom
      })
      .selectSingle()
    if (actualPosition) {
      positionID = actualPosition.ID
    }
  }
  const accrual = UB.Repository('hr_positionAccrual')
    .attrs([
      'positionID',
      'payElID',
      'accrualSum',
      'accrualRate',
      'dateFrom',
      'dateTo',
      'staffOrderID'
    ])
    .where('positionID', '=', positionID)
    .where('payElID.methodID.methodGroupID.code', '<>', '1')
    .where('payElID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  accrual.forEach(item => {
    ds.run('insert', {
      execParams: {
        empOrderDetID: mParams.empOrderDetID,
        empOrderID: mParams.orderID,
        payElID: item.payElID,
        dateFrom: mParams.dateFrom,
        dateTo: mParams.dateTo || dateService.maxDate(),
        accrualSum: item.accrualSum,
        accrualRate: item.accrualRate
      }
    })
  })
}

me.fillOrderAccrualWithSave = function (ctx) {
  const mParams = ctx.mParams
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const accrual = UB.Repository('hr_employeeAccrual')
    .attrs(['payElID', 'accrualRate', 'accrualSum', 'dateFrom', 'dateTo'])
    .where('employeeNumberID', '=', mParams.employeeNumberID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
  const res = UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderID', '=', mParams.empOrderID)
    .where('empOrderDetID', '=', mParams.empOrderDetID)
    .selectAsArrayOfValues()

  const storeOrderAcc = UB.DataStore('hr_empOrderAcc')
  res.forEach(ID => {
    storeOrderAcc.run('delete', {
      execParams: {
        ID: ID
      }
    })
  })
  accrual.forEach(row => {
    storeOrderAcc.run('insert', {
      skipError: mParams.skipError,
      execParams: {
        empOrderID: mParams.empOrderID,
        empOrderDetID: mParams.empOrderDetID,
        payElID: row.payElID,
        dateFrom: dateFrom,
        dateTo: row.dateTo,
        accrualSum: row.accrualSum,
        accrualRate: row.accrualRate
      }
    })
  })
}

/**
 * Заповнення стажів по наказу
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.empOrderDetID деталь наказу
 * @param {Number} ctx.orderID наказ
 * @param {Number} ctx.employeeID співробітник
 * @param {Number} ctx.positionID посада
 * @param {String} ctx.empOrderType тип наказу
 * @param {Date} ctx.onDate На дату
 */
me.fillOrderExperience = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.empOrderDetID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}.fillOrderExperience() -> must specify empOrderDetID', __entityName)}>>>`)
  }

  let position = UB.Repository('hr_position')
    .attrs('positionType')
  if (ctx.empOrderType === 'APPOINT_LIQ') {
    position = position.misc({ __mip_recordhistory_all: true })
  } else {
    position = position.misc({ __mip_ondate: mParams.onDate })
  }
  position = position.selectById(mParams.positionID)
  if (!position) {
    position = UB.Repository('hr_position')
      .attrs('positionType')
      .misc({ __mip_recordhistory_all: true })
      .selectById(mParams.positionID)
  }
  if (!position) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено запис посади з ID={0}', mParams.positionID)}>>>`)
  }
  const orderExperience = UB.Repository('hr_empOrderExperience')
    .attrs('ID')
    .where('empOrderDetID', '=', mParams.empOrderDetID)
    .selectAsObject()

  const ds = UB.DataStore('hr_empOrderExperience')
  orderExperience.forEach(item => {
    ds.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })

  const calcMethod = settingsService.getByCode('hrCalcExperienceMethod', mParams.orgID)

  const dictExpByPos = UB.Repository('hr_dictExperienceByPos')
    .attrs('dictExperienceID')
    .where('positionType', '=', position.positionType)
    .where('useInOrders', '=', '1')
    .selectAsObject()

  const dictExperienceList = dictExpByPos.map(o => o.dictExperienceID)

  if (dictExperienceList.length) {
    const employeeExp = UB.Repository('hr_employeeExperience')
      .attrs('ID', 'calcDate', 'startCalcDate', 'dictExperienceID')
      .where('employeeID', '=', mParams.employeeID)
      .where('dictExperienceID', 'in', dictExperienceList)
      .selectAsObject()
    const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
    employeeExp.forEach(item => {
      const startCalcDate = item.startCalcDate ? dateService.shiftDate(item.startCalcDate) : null
      let totalDays = dateService.dayDiff(item.calcDate, startCalcDate && startCalcDate < onDate ? startCalcDate : onDate) + (startCalcDate && startCalcDate < onDate ? 1 : 0)
      let exp, calcDate
      calcDate = dateService.addDays(onDate, -1 * totalDays)
      if (calcMethod === 'SIMPLE') {
        exp = dateService.daysToYmd(totalDays)
      } else {
        exp = dateService.getYmd(calcDate, onDate, false)
      }
      if (exp.years !== 0 || exp.months !== 0 || exp.days !== 0 || totalDays !== 0) {
        ds.run('insert', {
          execParams: {
            empOrderID: mParams.orderID,
            empOrderDetID: mParams.empOrderDetID,
            dictExperienceID: item.dictExperienceID,
            employeeExperienceID: item.ID,
            calcDate,
            years: exp.years,
            months: exp.months,
            days: exp.days,
            totalDays
          }
        })
      }
    })
  }
}

/**
 * Очистка стажів та нарахувань по наказу
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.empOrderDetID деталь наказу
 */
me.clearOrderAccrualsExperience = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.empOrderDetID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}.clearOrderAccrualsExperience() -> must specify empOrderDetID', __entityName)}>>>`)
  }
  const orderExperience = UB.Repository('hr_empOrderExperience')
    .attrs('ID')
    .where('empOrderDetID', '=', mParams.empOrderDetID)
    .selectAsObject()

  let ds = UB.DataStore('hr_empOrderExperience')
  orderExperience.forEach(item => {
    ds.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })
  const orderAccruals = UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderDetID', '=', mParams.empOrderDetID)
    .selectAsObject()
  ds = UB.DataStore('hr_empOrderAcc')
  orderAccruals.forEach(item => {
    ds.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })
}

/**
 * Очистка нарахувань по наказу
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.empOrderDetID деталь наказу
 */
me.clearOrderAccruals = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.empOrderDetID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}.clearOrderAccruals() -> must specify empOrderDetID', __entityName)}>>>`)
  }
  const orderAccruals = UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderDetID', '=', mParams.empOrderDetID)
    .selectAsObject()
  let ds = UB.DataStore('hr_empOrderAcc')
  orderAccruals.forEach(item => {
    ds.run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })
}

function changeEmployeePosition ({ params, attrsToChange, saved, usePosDateTo = false, closeWorkbook = true }) {
  const required = ['employeePositionID', 'changeOrderID', 'dateFrom', 'paraID']
  let pos = params.pos
  required.forEach(item => {
    if (!params[item]) {
      if (item === 'employeePositionID') {
        if (params.pos) {
          return
        }
      }
      throw new UB.UBAbort(`<<<${UB.i18n('hr_empOrder.changeEmployeePosition()-> parameter {0} should be specified', item)}>>>`)
    }
  })
  if (pos) {
    const attrs = Object.keys(global.hr_employeePosition.entity.attributes)
    const posAttrs = Object.keys(pos)
    if (attrs.length !== posAttrs.length) {
      throw new UB.UBAbort('<<<hr_empOrder.changeEmployeePosition()-> in params.pos should be specified full attribute list of hr_employeePosition. Use UB.Repository.attrs(\'*\')')
    }
  } else {
    pos = UB.Repository('hr_employeePosition')
      .attrs('*')
      .misc({ __mip_recordhistory_all: true, __allowSelectSafeDeleted: true })
      .selectById(params.employeePositionID)
  }

  if (!pos) {
    throw new UB.UBAbort(`<<<${UB.i18n('hr_empOrder.changeEmployeePosition()-> Посада не знайдена')}>>>`)
  }
  if (new Date(pos.mi_deleteDate).getFullYear() !== 9999) {
    throw new UB.UBAbort(`<<<${UB.i18n('hr_empOrder.changeEmployeePosition()-> Посада {0} ({0}) була видалена', pos.description, pos.ID)}>>>`)
  }
  orderService.clearMiAttrs(pos)

  const inOneDay = dateService.shiftDate(pos.dateFrom).getTime() === dateService.shiftDate(params.dateFrom).getTime()
  orderService.closeEmployeePosition({
    params: {
      ID: pos.ID,
      changeOrderID: params.changeOrderID,
      dateTo: inOneDay ? dateService.shiftDate(params.dateFrom) : dateService.addDays(params.dateFrom, -1),
      isActive: inOneDay ? 0 : 1
    },
    oldValues: {
      dateFrom: pos.dateFrom,
      dateTo: pos.dateTo,
      changeOrderID: pos.changeOrderID,
      isActive: 1
    },
    closeWorkbook: closeWorkbook,
    saved: saved
  })
  for (const attr in attrsToChange) {
    // eslint-disable-next-line no-prototype-builtins
    if (attrsToChange.hasOwnProperty(attr)) {
      pos[attr] = attrsToChange[attr]
    }
  }
  pos['organizationID.mi_data_id'] = pos.organizationID
  pos['departmentID.mi_data_id'] = pos.departmentID
  pos['positionID.mi_data_id'] = pos.positionID
  const priorID = pos.ID
  delete pos.ID
  pos.dateFrom = params.dateFrom
  pos.dateTo = usePosDateTo ? pos.dateTo : dateService.maxDate()
  pos.paraID = params.paraID
  pos.orderID = params.changeOrderID
  return orderService.createEmployeePosition({ para: pos, saved: saved, priorID })
}

/**
 * Провести наказ
 * @param {ubMethodParams} ctx
 * @param {Object} ctx.execParams
 * @param {number} ctx.execParams.ID наказ
 * @param {string} ctx.execParams.orderState стан
 */
me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const isImportOperation = ctx.mParams.execParams
  const order = UB.Repository('hr_empOrder')
    .attrs(['ID', 'orderNumber', 'orderDate', 'entryDate', 'periodID', 'empOrderType', 'staffTableID', 'staffTableOrgStructureID',
      'organizationID', 'orderNumberFull', 'description', 'masterOrganizationID', 'allowPosting'])
    .selectById(execParams.ID)
  const orderDate = dateService.shiftDate(order.orderDate)
  const entryDate = dateService.shiftDate(order.entryDate)
  const orgName = UB.Repository('hr_organization').attrs('name')
    .where('mi_data_id', '=', order.organizationID)
    .where('mi_dateFrom', '<=', orderDate)
    .where('mi_dateTo', '>=', orderDate)
    .where('state', '=', 'ACTIVE')
    .selectScalar()
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if ((currentPeriod && currentPeriod.isBlock) && !order.allowPosting) {
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }

  if (order.orderNumber.toUpperCase().indexOf(UB.i18n('проєкт').toUpperCase()) !== -1) {
    throw new UB.UBAbort(`<<<${UB.i18n('Внесіть номер та дату наказу')}>>>`)
  }
  const allowDoPosting = settingsService.get('allowDoPosting', order.organizationID, null)
  const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', order.organizationID)

  const periodID = order.periodID
  let detail
  let inOneDay
  const globalDate = dateService.currentTruncDate()
  if (!allowDoPosting) {
    if (orderDate > globalDate) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата наказу більша за поточну дату. Проведення неможливо.')}>>>`)
    }
  }
  switch (order.empOrderType) {
    case 'STAFFLIST':
      if (order.staffTableID) {
        orderService.doPostingStaffTable(order.staffTableID, 'hr_staffTable', execParams.ID, entryDate)
      }
      break
    case 'ORGSTRUCTURE':
      if (order.staffTableOrgStructureID) {
        orderService.doPostingStaffTable(order.staffTableOrgStructureID, 'hr_staffTableOrgStructure', execParams.ID, entryDate)
      }
      break
    case 'CHGSALARY':
      orderService.doPostingChgSalary(execParams.ID)
      break
    case 'CWSWORKHOUR': {
      const saved = { inserted: [], updated: [] }
      const det = UB.Repository('hr_empOrderCwsworkhourDet')
        .attrs(['ID', 'dateFrom', 'dateTo', 'isSaveHoursWork'])
        .where('orderID', '=', execParams.ID)
        .where('isGroup', '=', '1')
        .selectAsObject()
      det.forEach(row => {
        if (!row.isSaveHoursWork) {
          const detDay = UB.Repository('hr_empOrderCwsWorkHourDayDet')
            .attrs(['ID', 'numDay', 'dictTimeCostID', 'hoursWorkNew', 'orderID', 'paraID'])
            .where('paraID', '=', row.ID)
            .selectAsObject({
              hoursWorkNew: 'hoursWork'
            })
          const empDet = UB.Repository('hr_empOrderEmployeeDet')
            .attrs('employeeID', 'employeeNumberID', 'employeePositionID')
            .where('paraID', '=', row.ID)
            .selectAsObject()
          if (detDay.length && empDet.length) {
            const employeeNumbers = empDet.map(o => o.employeeNumberID)
            timService.createTimeSheetChange({
              organizationID: order.organizationID,
              orderID: execParams.ID,
              paraID: row.ID,
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              employeeNumbers,
              days: detDay,
              typeSheetChange: '1'
            })
            // переформировываем табель за текущий период
            const dateTo = row.dateTo || dateService.lastDayOfMonth(row.dateFrom)
            const periods = periodService.getPeriodsByDate(order.organizationID, row.dateFrom, dateTo)
            if (periods.length) {
              periods.forEach(period => {
                if (!period.isClosed) {
                  timeSheetService.fillTimeSheet({
                    organizationID: order.organizationID,
                    periodID: period.ID,
                    fillType: 1,
                    departmentID: null,
                    employeeNumbers
                  })
                }
                const nextPeriod = periodService.getPeriod(period.nextPeriodID)
                if (dateService.shiftDate(dateTo) > period.dateTo && !nextPeriod.isClosed) {
                  timeSheetService.fillTimeSheet({
                    organizationID: order.organizationID,
                    periodID: period.nextPeriodID,
                    fillType: 1,
                    departmentID: null,
                    employeeNumbers
                  })
                }
              })
            }
            empDet.forEach(emp => {
              const params = {
                employeeID: emp.employeeID,
                employeeNumberID: emp.employeeNumberID,
                dateFrom: row.dateFrom,
                dateTo: row.dateTo,
                dateToEmpty: row.dateTo,
                orderID: row.orderID,
                paraID: row.ID
              }
              orderService.insertByOrder({ store: 'hr_empWorkShdChange', params: params, saved: saved })
            })
            saved.orderID = execParams.ID
            detail = UB.Repository('hr_empOrderDet')
              .attrs(['ID', 'employeeID', 'orderID.orderDate', 'orderID.orderNumber', 'empOrderType', 'mi_unityEntity',
                'isGroup', 'organizationID.mi_data_id', 'employeeNumberID', 'orderID', 'paraID'])
              .selectById(row.ID)
            saveOldValues(detail, saved)
          }
        }
      })
      break
    }
    case 'MILSERVICE': {
      const det = UB.Repository('hr_empOrderMilserviceDet')
        .attrs(['ID', 'employeeID', 'employeeNumberID', 'employeeNumberID.description', 'orderID', 'employeePositionID', 'dateFrom',
          'employeePositionID.dateFrom', 'dateTo', 'dictTimeCostID', 'dictTimeCostID.nameSmall', 'dictTimeCostID.timeCostType', 'payElID',
          'employeePositionID.description', 'isTempStopVacation'])
        .where('orderID', '=', execParams.ID)
        .selectAsObject()
      det.forEach(row => {
        if (dateService.shiftDate(row.dateFrom) < dateService.shiftDate(row['employeePositionID.dateFrom'])) {
          throw new UB.UBAbort(`<<<${UB.i18n('На вказану дату звільнення працівник {0} не працював', row['employeePositionID.description'])}>>>`)
        }
        timService.checkCrossTimeSheet(row.employeeNumberID, row.dictTimeCostID, row.dateFrom, row.dateTo, null, true)

        const milSrvSaved = getNotDefaultSaveObj(execParams.ID)
        orderService.insertByOrder({
          store: 'hr_employeeAccrual',
          params: {
            employeeID: row.employeeID,
            employeeNumberID: row.employeeNumberID,
            payElID: row.payElID,
            dateFrom: row.dateFrom,
            dateTo: row.dateTo,
            accrualSum: 0,
            accrualRate: 0,
            orderID: execParams.ID,
            orderNumber: order.orderNumberFull,
            orderDate: order.orderDate,
            changeOrderID: null
          },
          saved: milSrvSaved
        })

        /*
        timService.createTimeSheetChange({
          organizationID: order.organizationID,
          orderID: execParams.ID,
          paraID: row.ID,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          employeeNumbers: [row.employeeNumberID],
          typeSheetChange: '4',
          days: [{
            numDay: 0,
            dictTimeCostID: row.dictTimeCostID,
            notChangeHoursWork: row['dictTimeCostID.timeCostType'] === 'WORK' ? 1 : 0
          }]
        })
        */
        orderService.insertByOrder({
          store: 'hr_empLongTermAbsc',
          params: {
            organizationID: order.organizationID,
            employeeNumberID: row.employeeNumberID,
            orderID: row.orderID,
            paraID: row.ID,
            dateFrom: row.dateFrom,
            dateTo: row.dateTo,
            changeOrderID: null
          },
          saved: milSrvSaved
        })
        if (row.isTempStopVacation) {
          const empVacPlans = UB.Repository('hr_empVacationPlan')
            .attrs(['ID', 'isPause', 'dayCount', 'dictVacationKindID'])
            .where('employeeNumberID', '=', row.employeeNumberID)
            .where('dictVacationKindID.isProportional', '=', 1)
            .where('isPause', '=', 0)
            .exists(UB.Repository('hr_empVacationPeriod')
              .correlation('empVacationPlanID', 'ID')
              .where('mi_deleteDate', '>=', '#maxdate')
              .where('dateFrom', '<', row.dateFrom)
              .where('dateTo', '>=', row.dateFrom))
            .selectAsObject()
          empVacPlans.forEach(vacPlan => {
            const vacPeriods = UB.Repository('hr_empVacationPeriod')
              .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayFact'])
              .where('empVacationPlanID', '=', vacPlan.ID)
              .selectAsObject()
            const vacPeriodDateTo = dateService.addDays(row.dateFrom, -1)
            vacPeriods.forEach(item => {
              if (dateService.shiftDate(item.dateFrom) < dateService.shiftDate(row.dateFrom) && dateService.shiftDate(item.dateTo) >= dateService.shiftDate(row.dateFrom)) {
                let dayCountPlan = timeCostService.getVacPlanDays({
                  employeeID: row.employeeID,
                  employeeNumberID: row.employeeNumberID,
                  periodDateFrom: dateService.shiftDate(item.dateFrom),
                  periodDateTo: vacPeriodDateTo,
                  planDateTo: vacPeriodDateTo,
                  dictVacationKindID: vacPlan.dictVacationKindID,
                  defaultValue: vacPlan.dayCount
                })
                orderService.updateByOrder({
                  store: 'hr_empVacationPeriod',
                  params: {
                    ID: item.ID,
                    dateTo: vacPeriodDateTo,
                    dayCountPlan
                  },
                  oldValues: {
                    dateTo: item.dateTo,
                    dayCountPlan: item.dayCountPlan
                  },
                  saved: milSrvSaved
                })
              } else if (dateService.shiftDate(item.dateFrom) > dateService.shiftDate(row.dateFrom) && item.dayFact === 0) {
                orderService.deleteByOrder({
                  store: 'hr_empVacationPeriod',
                  params: {
                    ID: item.ID
                  },
                  saved: milSrvSaved
                })
              }
            })
            orderService.updateByOrder({
              store: 'hr_empVacationPlan',
              params: {
                ID: vacPlan.ID,
                isPause: 1,
                pauseOrderDetID: row.ID
              },
              oldValues: {
                isPause: vacPlan.isPause
              },
              saved: milSrvSaved
            })
          })
        }
        saveNotDefaultOldValues('hr_empOrderMilserviceDet', row.ID, milSrvSaved)
      })
      break
    }
    case 'MILSERVICERET': {
      const det = UB.Repository('hr_empOrderMilserviceretDet')
        .attrs(['ID', 'orderID', 'employeePositionID', 'employeeNumberID', 'dateFrom', 'sourceParaID.orderID', 'sourceParaID', 'employeePositionID.description'])
        .where('orderID', '=', execParams.ID)
        .selectAsObject()
      det.forEach(row => {
        let empOrderMilserviceretDet = UB.Repository('hr_empOrderMilserviceretDet')
          .attrs(['ID', 'sourceParaID', 'orderID.description', 'dateFrom'])
          .where('sourceParaID', 'equal', row.sourceParaID)
          .where('employeePositionID', 'equal', row.employeePositionID)
          .where('orderID.orderState', 'in', ['POSTED'])
          .where('dateFrom', '>', row.dateFrom)
          .selectAsObject()

        if (empOrderMilserviceretDet.length) {
          throw new UB.UBAbort(`<<<${UB.i18n(`Увага. Працівника ${row['employeePositionID.description']} повернуто з військової служби з ${dateService.formatDate(empOrderMilserviceretDet[0].dateFrom)} за ${empOrderMilserviceretDet[0]['orderID.description']}. Для коректної роботи системи потрібно розпровести ${empOrderMilserviceretDet[0]['orderID.description']} перед проведенням поточного наказу.`)}>>>`)
        }

        const newDateTo = dateService.addDays(dateService.shiftDate(row.dateFrom), -1)
        const params = {
          orderID: row['sourceParaID.orderID'],
          changeOrderID: execParams.ID,
          paraID: row.sourceParaID,
          dateTo: newDateTo,
          employeeNumbers: [row.employeeNumberID]
        }
        timService.updateTimeSheetChange(params)

        const milSrvRetSaved = getNotDefaultSaveObj(execParams.ID)
        const longTermReplace = UB.Repository('hr_longTermReplace')
          .attrs('ID', 'dateTo', 'changeOrderID')
          .where('employeeNumberAbsID', '=', row.employeeNumberID)
          .where('dateTo', '>', newDateTo)
          .selectAsObject()
        longTermReplace.forEach(rerm => {
          orderService.updateByOrder({
            store: 'hr_longTermReplace',
            params: {
              ID: rerm.ID,
              dateTo: newDateTo,
              changeOrderID: row.orderID
            },
            saved: milSrvRetSaved,
            oldValues: {
              dateTo: rerm.dateTo,
              changeOrderID: rerm.changeOrderID
            }
          })
        })
        const empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
          .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'changeParaID', 'description'])
          .where('employeeNumberID', '=', row.employeeNumberID)
          .where('paraID', '=', row.sourceParaID)
          .selectSingle()
        if (empLongTermAbsc) {
          orderService.updateByOrder({
            store: 'hr_empLongTermAbsc',
            params: {
              ID: empLongTermAbsc.ID,
              dateTo: newDateTo,
              changeOrderID: row.orderID,
              changeParaID: row.ID
            },
            saved: milSrvRetSaved,
            oldValues: {
              dateTo: empLongTermAbsc.dateTo,
              changeOrderID: empLongTermAbsc.changeOrderID,
              changeParaID: empLongTermAbsc.changeParaID,
              description: empLongTermAbsc.description
            }
          })
        }

        const employeeAccrual = UB.Repository('hr_employeeAccrual')
          .attrs('ID', 'dateFrom', 'dateTo', 'changeOrderID', 'isActive')
          .where('orderID', '=', row['sourceParaID.orderID'])
          .where('employeeNumberID', '=', row.employeeNumberID)
          .where('dateTo', '>', newDateTo)
          .selectSingle()
        if (employeeAccrual) {
          orderService.updateByOrder({
            store: 'hr_employeeAccrual',
            params: {
              ID: employeeAccrual.ID,
              dateTo: newDateTo,
              changeOrderID: execParams.ID
            },
            oldValues: {
              dateTo: employeeAccrual.dateTo,
              changeOrderID: employeeAccrual.changeOrderID
            },
            saved: milSrvRetSaved
          })
        }
        saveNotDefaultOldValues('hr_empOrderMilserviceretDet', row.ID, milSrvRetSaved)
      })
      break
    }
    case 'COMPETITIONAD': {
      const empOrderCompetitionadService = require('./modules/empOrderCompetitionadService')
      empOrderCompetitionadService.doPosting(ctx)
      break
    }
    case 'VEHICLEASSIGN': {
      global.hr_empOrderVehicleassignDet.doPosting(execParams.ID)
      break
    }
    case 'MEDEXAMINATION': {
      global.hr_empOrderMedexaminationDet.doPosting(execParams.ID)
      break
    }
    default:
      detail = UB.Repository('hr_empOrderDet')
        .attrs(orderService.getEmpOrderDetFields())
        .where('orderID', '=', execParams.ID)
        .where('isExternal', '<>', 1)
        .where(`coalesce([orderState], '!') <> 'CANCELED'`, 'custom')
        .where(`coalesce([paraID.orderState], '!') <> 'CANCELED'`, 'custom')
        .orderBy('itemIdx')
        .selectAsObject()
      detail.forEach(item => {
        const saved = { inserted: [], updated: [] }
        let para
        let dateTo
        let pos
        switch (item.empOrderType) {
          case 'BONUS':
          case 'REWARD': {
            para = UB.Repository(item.mi_unityEntity).attrs('bonusID', 'orderID.orderNumber', 'employeeID')
              .where('ID', '=', item.ID)
              .selectSingle()
            orderService.checkIsParaOk(para)
            orderService.insertByOrder({
              store: 'hr_employeeBonus',
              params: {
                orderID: execParams.ID,
                orderDetID: item.ID,
                dictBonusID: para.bonusID,
                docIssued: orgName,
                docIssuedDate: orderDate,
                employeeID: para.employeeID,
                orderDate: orderDate,
                orderNumber: order.orderNumberFull || para['orderID.orderNumber'],
                srcOrganizationID: order.organizationID
              },
              saved: saved
            })
            break
          }
          case 'MOVE':
          case 'PROLONGATION':
            const attrs = ['ID', 'tabNum', 'dateFrom', 'dateTo', 'isResponsible', 'isRankAssign', 'payElID', 'accrualSum',
              'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'employeePositionID.mi_deleteDate',
              'employeeNumberID', 'employeePositionID', 'employeePositionID.changeOrderID.empOrderType',
              'employeeNumberID.description', 'employeePositionID.changeOrderID', 'dictPositionID',
              'organizationID.mi_data_id', 'departmentID.mi_data_id', 'positionID.mi_data_id', 'employeeID',
              'positionID.psCategory.name', 'positionID.positionType', 'positionID.name', 'positionID.fullName',
              'positionID.fullNameNom', 'employeePositionID.dictCategoryECBID', 'employeePositionID.dictFundSourceID',
              'employeePositionID.accountID', 'employeePositionID.workScheduleID', 'employeePositionID.dictStaffCatID',
              'workScheduleID', 'workerType', 'workPlace', 'contractType', 'mtCount', 'dictContractKindID',
              'dictTarifCoeffID', 'dictStaffCatID', 'dictRankID', 'dictRankID.code', 'orderID', 'isSupplSave',
              'dictTrialPeriodID', 'dateTrialEnd', 'orderID.description', 'dictReasonMovingKindID.name',
              'notStoreInWorkBook', 'isOutStaff', 'dictFundSourceID', 'positionID.dictFundSourceID', 'dictCostTypeID',
              'isPreservExistCharges', 'dictCostTypeID.accountID', 'employeePositionID.description', 'dictEmpCategoryID',
              'posNameAddition', 'positionID.fullNameNomF', 'employeeID.sexType', 'dictCategoryECBID',
              'vacPositionID', 'vacPositionID.employeeNumberID']

            if (item.empOrderType === 'MOVE') attrs.push('dictVehicleID')

            const paraQuery = UB.Repository(item.mi_unityEntity).attrs(attrs)
            para = paraQuery.selectById(item.ID)
            const empDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
            const onDate = dateService.shiftDate(para.dateFrom)
            const empPosStore = UB.DataStore(item.mi_unityEntity)
            if (onDate > empDateTo || new Date(para['employeePositionID.mi_deleteDate']).getFullYear() !== 9999) {
              // try to find actual employee position
              const actualEmpPos = UB.Repository('hr_employeePositionS')
                .attrs('ID')
                .where('employeeNumberID', '=', para.employeeNumberID)
                .where('dateFrom', '<=', onDate)
                .where('dateTo', '>=', onDate)
                .selectSingle()
              if (actualEmpPos) {
                empPosStore.run('update', {
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: item.ID,
                    employeePositionID: actualEmpPos.ID
                  }
                })
                para = paraQuery.selectById(item.ID)
              }
            }
            if (new Date(para['employeePositionID.mi_deleteDate']).getFullYear() !== 9999) {
              throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - призначення {0} було видалене, можливо, внаслідок розпроведення наказу, в якому воно було створене. Виберіть ще раз', para['employeePositionID.description'])}>>>`)
            }
            const dictContractKind = UB.Repository('hr_dictContractKind')
              .attrs(['code', 'isTerm']).selectById(para.dictContractKindID)
            const withReturn = dictContractKind && dictContractKind.code === '20' && dictContractKind.isTerm
            orderService.checkIsParaOk(para)
            const curPosition = UB.Repository('hr_employeePosition')
              .attrs('*')
              .selectById(para.employeePositionID)
            if (!curPosition) {
              throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - призначення {0} було видалене, можливо, внаслідок розпроведення наказу, в якому воно було створене. Виберіть ще раз', para['employeePositionID.description'])}>>>`)
            }
            if (curPosition.changeOrderID) {
              const order = UB.Repository('hr_order')
                .attrs('ID', 'orderState', 'empOrderType', 'description')
                .selectById(curPosition.changeOrderID)
              if (order && order.empOrderType === 'DISM' && order.orderState === 'POSTED') {
                throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - працівника {0} було звільнено - {1}', para['employeeNumberID.description'], order.description)}>>>`)
              }
            }
            inOneDay = dateService.shiftDate(para['employeePositionID.dateFrom']).getTime() === dateService.shiftDate(para.dateFrom).getTime()

            orderService.closeEmployeePosition({
              params: {
                changeOrderID: para.orderID,
                dateTo: inOneDay
                  ? (dateService.shiftDate(para['employeePositionID.dateTo']) > dateService.shiftDate(para.dateFrom) ? dateService.shiftDate(para.dateFrom) : dateService.shiftDate(para['employeePositionID.dateTo']))
                  : (dateService.shiftDate(para['employeePositionID.dateTo']) > dateService.addDays(para.dateFrom, -1) ? dateService.addDays(para.dateFrom, -1) : dateService.shiftDate(para['employeePositionID.dateTo'])),
                ID: para.employeePositionID,
                dischargeReason: para['dictReasonMovingKindID.name'],
                dismOrder: para['orderID.description'],
                isActive: inOneDay ? 0 : 1
              },
              closeWorkbook: !para['notStoreInWorkBook'],
              oldValues: {
                dateFrom: para['employeePositionID.dateFrom'],
                dateTo: para['employeePositionID.dateTo'],
                changeOrderID: para['employeePositionID.changeOrderID'],
                isActive: 1
              },
              mParams: {},
              saved: saved
            })

            if (!para['dictFundSourceID']) para['dictFundSourceID'] = para['positionID.dictFundSourceID'] || para['employeePositionID.dictFundSourceID']
            para.dictStaffCatID = para.dictStaffCatID || para['employeePositionID.dictStaffCatID']
            para.workScheduleID = para.isOutStaff ? para.workScheduleID : (para.workScheduleID || para['employeePositionID.workScheduleID'])
            para.dictCategoryECBID = para['dictCategoryECBID'] || para['employeePositionID.dictCategoryECBID']
            para.accountID = para['dictCostTypeID.accountID'] || para['employeePositionID.accountID']
            let coa = global['COA']
            if (coa && coa.dims['ac_dictCostType']) {
              para.d0 = coa.dims['ac_dictCostType'].ID
              para.d0Value = para['dictCostTypeID']
            }
            para.changeOrderID = null
            para.appointOrder = para['orderID.description']
            para.appointReason = para['dictReasonMovingKindID.name']
            para.planDateTo = withReturn ? dateService.shiftDate(para.dateTo) : null
            const workPosition = (isUseSexType && para['employeeID.sexType'] === 'W' ? para['positionID.fullNameNomF'] : para['positionID.fullNameNom']) || para['positionID.fullName']

            const newID = orderService.createEmployeePosition({
              para: para,
              saved: saved,
              isCreateWorkBookRecord: !para['notStoreInWorkBook'],
              mParams: {
                positionCategory: para['positionID.positionType'] === '1' ? para['positionID.psCategory.name'] : null,
                positionType: para['positionID.positionType'],
                workPosition
              }
            })

            const empNumber = UB.Repository('hr_employeeNumberS')
              .attrs(['dateTo', 'changeOrderID'])
              .selectById(para.employeeNumberID)
            if (empNumber && (!withReturn || dateService.shiftDate(empNumber.dateTo) < dateService.shiftDate(para.dateTo))) {
              let isUpdateEmpNumb = !(settingsService.get('hrDontCloseTabNumOnTempMove', order.organizationID) && (para.workPlace === '2' && (!para.dateTo || (dateService.shiftDate(para.dateTo)).getFullYear() !== 9999)))
              if (isUpdateEmpNumb) {
                orderService.updateByOrder({ // Update dateTo
                  store: 'hr_employeeNumber',
                  params: {
                    ID: para.employeeNumberID,
                    changeOrderID: -1,
                    dateTo: para.dateTo
                  },
                  oldValues: {
                    dateTo: empNumber.dateTo
                  },
                  saved: saved
                })
              }
            }
            if (para.isRankAssign && para.dictRankID) {
              orderService.createRank({ para: para, saved: saved, order: order })
            }
            if (para['vacPositionID.employeeNumberID']) {
              orderService.insertByOrder({
                store: 'hr_longTermReplace',
                params: {
                  employeeNumberReplID: para.employeeNumberID,
                  employeeNumberAbsID: para['vacPositionID.employeeNumberID'],
                  organizationID: para['organizationID.mi_data_id'],
                  dateFrom: para.dateFrom,
                  dateToEmpty: para.dateTo,
                  createOrderID: order.ID,
                  changeOrderID: null
                },
                saved: saved
              })
            }
            if (item.empOrderType === 'MOVE') {
              const empVacationPlan = UB.Repository('hr_empVacationPlan')
                .attrs(['ID', 'dateTo', 'employeeID', 'employeeNumberID', 'dictVacationKindID', 'dayCount'])
                .where('employeeNumberID', '=', para.employeeNumberID)
                .selectAsObject()
              empVacationPlan.forEach(empPlan => {
                orderService.updateByOrder({
                  store: 'hr_empVacationPlan',
                  params: {
                    ID: empPlan.ID,
                    dateTo: para.dateTo
                  },
                  saved: saved,
                  oldValues: {
                    dateTo: empPlan.dateTo
                  }
                })
                let empVacationPeriod = UB.Repository('hr_empVacationPeriod')
                  .attrs(['ID', 'dateFrom', 'dateTo', 'dayFact', 'dayCountPlan'])
                  .where('empVacationPlanID', '=', empPlan.ID)
                  .orderBy('dateTo', 'desc')
                  .selectAsObject()
                let lastPeriod = empVacationPeriod.find(empPeriod => dateService.shiftDate(empPeriod.dateTo) >= dateService.shiftDate(empPlan.dateTo))
                if (lastPeriod) {
                  let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(para.dateTo), dateService.shiftDate(dateService.addDays((dateService.addYears(lastPeriod.dateFrom, 1)), -1))))
                  let dayCountPlan = timeCostService.getVacPlanDays({
                    employeeID: empPlan.employeeID,
                    employeeNumberID: empPlan.employeeNumberID,
                    periodDateFrom: dateService.shiftDate(lastPeriod.dateFrom),
                    periodDateTo: dateTo,
                    planDateTo: dateTo,
                    dictVacationKindID: empPlan.dictVacationKindID,
                    defaultValue: empPlan.dayCount
                  })
                  orderService.updateByOrder({
                    store: 'hr_empVacationPeriod',
                    params: {
                      ID: lastPeriod.ID,
                      dateTo: dateTo,
                      dayCountPlan: dayCountPlan || 0
                    },
                    saved: saved,
                    oldValues: {
                      dateTo: lastPeriod.dateTo,
                      dayCountPlan: lastPeriod.dayCountPlan
                    }
                  })
                }
              })
              if (para['dictVehicleID']) {
                const vehicle = UB.Repository('trans_vehicle').attrs(['ID', 'vehicleName'])
                  .where('ID', '=', para['dictVehicleID']).selectSingle()
                if (vehicle) {
                  const empVehicle = UB.Repository('hr_employeeVehicle')
                    .attrs(['ID'])
                    .where('orderID', '=', order.ID)
                    .where('employeeID', '=', para['employeeID'])
                    .where('vehicleID', '=', vehicle.ID)
                    .where('strVehicle', '=', vehicle.vehicleName)
                    .selectSingle()
                  if (!empVehicle) {
                    orderService.insertByOrder({
                      store: 'hr_employeeVehicle',
                      params: {
                        employeeID: para['employeeID'],
                        vehicleID: vehicle.ID,
                        strVehicle: vehicle.vehicleName,
                        dateFrom: para['dateFrom'],
                        dateTo: para['dateTo'] ? para['dateTo'] : dateService.maxDate(),
                        orderID: order.ID
                      },
                      saved: saved
                    })
                    let prevPara = UB.Repository('hr_empOrderDet')
                      .attrs(['paraID', 'empOrderType', 'orderID.orderState'])
                      .where('employeeNumberID', '=', para['employeeNumberID'])
                      .where('empOrderType', 'in', ['APPOINT', 'MOVE'])
                      .where('paraID', '!=', para['ID'])
                      .where('orderID.orderState', '=', 'POSTED')
                      .orderBy('dateFrom', 'desc')
                      .selectAsObject()
                    if (prevPara && prevPara.length) {
                      const prevDet = UB.Repository(prevPara[0].empOrderType === 'APPOINT' ? 'hr_empOrderAppointDet' : 'hr_empOrderMoveDet')
                        .attrs(['dictVehicleID', 'orderID']).selectById(prevPara[0].paraID)
                      if (prevDet) {
                        const prevVehicle = UB.Repository('hr_employeeVehicle')
                          .attrs(['ID', 'orderID', 'dateTo'])
                          .where('orderID', '=', prevDet.orderID)
                          .where('employeeID', '=', para['employeeID'])
                          .where('vehicleID', '=', prevDet.dictVehicleID)
                          .selectSingle()
                        if (prevVehicle) {
                          orderService.updateByOrder({
                            store: 'hr_employeeVehicle',
                            params: {
                              ID: prevVehicle.ID,
                              dateTo: dateService.priorDay(para['dateFrom']),
                              orderID: order.ID
                            },
                            oldValues: {
                              dateTo: prevVehicle.dateTo,
                              orderID: prevVehicle.orderID
                            },
                            saved: saved
                          })
                        }
                      }
                    }
                  }
                }
              }
              orderService.tryClosePublServRangsExceptLast(para['employeeID'], order, saved)
            }
            if (item.empOrderType === 'PROLONGATION') {
              const vacDate = dateService.addDays(onDate, -1)
              const empVacationPlan = UB.Repository('hr_empVacationPlan')
                .attrs(['ID', 'dateTo', 'employeeID', 'employeeNumberID', 'dictVacationKindID', 'dayCount'])
                .where('employeeNumberID', '=', para.employeeNumberID)
                .selectAsObject()
              empVacationPlan.forEach(empPlan => {
                orderService.updateByOrder({
                  store: 'hr_empVacationPlan',
                  params: {
                    ID: empPlan.ID,
                    dateTo: para.dateTo
                  },
                  saved: saved,
                  oldValues: {
                    dateTo: empPlan.dateTo
                  }
                })
                let empVacationPeriod = UB.Repository('hr_empVacationPeriod')
                  .attrs(['ID', 'dateFrom', 'dateTo', 'dayFact', 'dayCountPlan'])
                  .where('empVacationPlanID', '=', empPlan.ID)
                  .orderBy('dateTo', 'desc')
                  .selectAsObject()
                let lastPeriod = empVacationPeriod.find(empPeriod => dateService.shiftDate(empPeriod.dateTo) >= vacDate && dateService.shiftDate(empPeriod.dateFrom) <= vacDate)
                if (lastPeriod) {
                  let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(para.dateTo), dateService.shiftDate(dateService.addDays((dateService.addYears(lastPeriod.dateFrom, 1)), -1))))
                  let dayCountPlan = timeCostService.getVacPlanDays({
                    employeeID: empPlan.employeeID,
                    employeeNumberID: empPlan.employeeNumberID,
                    periodDateFrom: dateService.shiftDate(lastPeriod.dateFrom),
                    periodDateTo: dateTo,
                    planDateTo: dateTo,
                    dictVacationKindID: empPlan.dictVacationKindID,
                    defaultValue: empPlan.dayCount
                  })
                  orderService.updateByOrder({
                    store: 'hr_empVacationPeriod',
                    params: {
                      ID: lastPeriod.ID,
                      dateTo: dateTo,
                      dayCountPlan: dayCountPlan || 0
                    },
                    saved: saved,
                    oldValues: {
                      dateTo: lastPeriod.dateTo,
                      dayCountPlan: lastPeriod.dayCountPlan
                    }
                  })
                  const nextPeriods = empVacationPeriod.filter(empPeriod => dateService.shiftDate(empPeriod.dateFrom) > dateTo)
                  nextPeriods.forEach(empPeriod => {
                    orderService.deleteByOrder({
                      store: 'hr_empVacationPeriod',
                      params: {
                        ID: empPeriod.ID
                      },
                      saved
                    })
                  })
                } else {
                  let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(para.dateTo), dateService.shiftDate(dateService.addDays((dateService.addYears(onDate, 1)), -1))))
                  let dayCountPlan = timeCostService.getVacPlanDays({
                    employeeID: empPlan.employeeID,
                    employeeNumberID: empPlan.employeeNumberID,
                    periodDateFrom: onDate,
                    periodDateTo: dateTo,
                    planDateTo: dateTo,
                    dictVacationKindID: empPlan.dictVacationKindID,
                    defaultValue: empPlan.dayCount
                  })
                  orderService.insertByOrder({
                    store: 'hr_empVacationPeriod',
                    params: {
                      empVacationPlanID: empPlan.ID,
                      dateFrom: onDate,
                      dateTo: dateTo,
                      dayCountPlan: dayCountPlan
                    },
                    saved: saved
                  })
                }
              })
            }
            const dictFundSource = UB.Repository('hr_empOrderFundSource')
              .attrs(['dictFundSourceID', 'mtCount'])
              .where('paraID', '=', para.ID)
              .selectAsObject()
            dictFundSource.forEach(row => {
              orderService.insertByOrder({
                store: 'hr_empPosFundSource',
                params: {
                  employeePositionID: newID,
                  employeeNumberID: para.employeeNumberID,
                  dictFundSourceID: row.dictFundSourceID,
                  mtCount: row.mtCount || 0
                },
                saved: saved
              })
            })
            if (withReturn && newID) {
              const newPosition = UB.Repository('hr_employeePosition')
                .attrs('*')
                .selectById(newID || null)
              if (newPosition) {
                orderService.clearMiAttrs(curPosition)
                orderService.clearMiAttrs(newPosition)
                UB.DataStore('hr_employeePosition').run('update', {
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: newID,
                    changedValues: JSON.stringify({
                      oldValues: curPosition,
                      newValues: newPosition
                    })
                  }
                })
              }
            }
            if (para['dateTrialEnd']) {
              orderService.insertByOrder({
                store: 'hr_employeeTrialPeriod',
                params: {
                  employeeNumberID: para['employeeNumberID'],
                  employeePositionID: newID,
                  orderID: order.ID,
                  orderNumber: order.orderNumber,
                  orderDate: order.orderDate,
                  dateFrom: para['dateFrom'],
                  dateTo: para['dateTrialEnd'],
                  dateTrialEnd: para['dateTrialEnd'],
                  dictTrialPeriodID: para['dictTrialPeriodID'],
                  positionID: para['positionID.mi_data_id']
                },
                saved: saved
              })
            }
            if (!para.isPreservExistCharges) {
              orderService.createOrderAccrual({ para: para, saved: saved, isClosePrev: true, skipAutoCalcCondition: true, isAddMethod74: true, skipNonClosable: true })
            }
            orderService.createWorkSched({
              params: Object.assign({ paraID: para.ID }, para),
              mParams: {
                isClosePrev: true
              },
              saved: saved
            })
            break
          case 'BOUNTY':
            orderService.createOrderAccrual({ para: item, saved: saved, isClosePrev: false })
            break
          case 'BOUNTY_HELP':
            global.hr_empOrderBountyDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          case 'TRIALPROLONG': {
            global.hr_empOrderTrialprolongDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          }
          case 'CHGTIMECOST': {
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['orderID', 'employeeNumberID', 'initialOrderID', 'dictTimeCostID', 'initialOrderID.orderState'])
              .selectById(item.ID)
            if (para['initialOrderID.orderState'] !== 'POSTED' && para['initialOrderID.orderState'] !== 'PROCESSED') {
              throw new UB.UBAbort(`<<<${UB.i18n('Проведення наказу неможливе - наказ {0} не проведено', getOrderDescription(para.initialOrderID))}>>>`)
            }
            const hrTimeChange = UB.Repository('hr_timeSheetChange')
              .attrs(['ID'])
              .where('orderID', '=', para.initialOrderID)
              .selectAsObject()
            const orderIDs = hrTimeChange.map(o => o.ID)
            orderIDs.push(para.initialOrderID)
            const ts = UB.Repository('tim_timeSheet')
              .attrs(['ID', 'changeOrderID', 'factTimeCostID'])
              .where('orderID', 'in', orderIDs)
              .where('employeeNumberID', '=', para.employeeNumberID)
              .selectAsObject()
            ts.forEach(tsItem => {
              orderService.updateByOrder({
                store: 'tim_timeSheet',
                params: {
                  ID: tsItem.ID,
                  changeOrderID: item.orderID,
                  factTimeCostID: para.dictTimeCostID
                },
                oldValues: tsItem,
                saved: saved
              })
            })
            break
          }
          case 'CWSHD': {
            global.hr_empOrderCwshdDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              currentPeriod,
              saved: saved
            })
            break
          }
          case 'CWSHDGRP': {
            if (item.mi_unityEntity === 'hr_empOrderCwshdgrpDet') {
              global.hr_empOrderCwshdgrpDet.doPosting({
                item: item,
                order: order,
                isImportOperation: isImportOperation,
                currentPeriod,
                saved: saved
              })
            }
            break
          }
          case 'CWSRELAXHDGRP': {
            if (item.mi_unityEntity === 'hr_empOrderCwsrelaxhdgrpDet') {
              global.hr_empOrderCwsrelaxhdgrpDet.doPosting({
                item: item,
                order: order,
                isImportOperation: isImportOperation,
                currentPeriod,
                saved: saved
              })
            }
            break
          }
          case 'APPOINT':
            let appoint = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'employeeID'])
              .selectById(item.ID)
            global.hr_empOrderAppointDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })

            let employeeData = UB.Repository('hr_employee')
              .attrs(['ID', 'empOrderAppoint', 'changeOrderID'])
              .where('ID', '=', appoint.employeeID)
              .selectSingle()
            if (employeeData && employeeData.ID) {
              orderService.updateByOrder({
                store: 'hr_employee',
                params: {
                  ID: employeeData.ID,
                  changeOrderID: item.orderID,
                  empOrderAppoint: order.description || ''
                },
                oldValues: {
                  empOrderAppoint: employeeData.empOrderAppoint,
                  changeOrderID: employeeData.changeOrderID
                },
                saved: saved
              })
            }

            break
          case 'APPOINT_LIQ':
          case 'APPOINT_MOVE':
            global.hr_empOrderAppointDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          case 'PLURALIST':
            global.hr_empOrderPluralistDet.doPosting({ item, order, saved, isImportOperation, currentPeriod })
            break
          case 'OUTPLURAL': {
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'employeeNumberID', 'departmentID', 'positionID', 'employeeID', 'reason', 'empOrderType',
                'employeePositionID', 'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'employeePositionID.changeOrderID',
                'organizationID', 'orderID', 'orderID.description', 'positionID.psCategory.name', 'employeeID.fullFIO', 'organizationID.mi_data_id'
              ])
              .selectById(item.ID)
            orderService.checkIsParaOk(para)
            orderService.closeEmployeePosition({
              params: {
                ID: para.employeePositionID,
                dateTo: para.dateFrom,
                changeOrderID: para.orderID,
                dischargeReason: para.reason || 'Припинення сумісництва',
                dismOrder: para['orderID.description']
              },
              oldValues: {
                dateFrom: para['employeePositionID.dateFrom'],
                dateTo: para['employeePositionID.dateTo'],
                changeOrderID: para['employeePositionID.changeOrderID']
              },
              mParams: {
                isOrgDismiss: false
              },
              saved: saved
            })
            orderService.closeAccrual({
              para: {
                employeeNumberID: para.employeeNumberID,
                dateFrom: para.dateFrom,
                orderID: para.orderID,
                empOrderType: para.empOrderType
              },
              saved: saved
            })

            global.hr_empVacationPlan.recalcPlanDays({ employeeNumberID: para.employeeNumberID, dismDate: para.dateFrom, saved: saved })

            const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', ebs.langCodei18n('НіПр')).limit(1).selectScalar()
            const timeSheetParams = []
            let date = dateService.shiftDate(para.dateFrom)
            let dateTo = dateService.lastDayOfMonth(date)
            const nextPos = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'dateFrom'])
              .where('employeeNumberID', '=', para.employeeNumberID)
              .where('dateFrom', '>', para.dateFrom)
              .orderBy('dateFrom', 'asc')
              .selectSingle()
            if (nextPos && dateTo > dateService.shiftDate(nextPos.dateFrom)) {
              dateTo = dateService.addDays(nextPos.dateFrom, -1)
            }
            if (date.getTime() !== dateTo.getTime() && dateTo < dateService.maxDate()) {
              if (dictTimeCost) {
                date = dateService.addDays(date, 1)
                while (date <= dateTo) {
                  timeSheetParams.push({
                    orderID: order.ID,
                    employeeNumberID: para.employeeNumberID,
                    periodID: currentPeriod.ID,
                    dateWork: date,
                    factTimeCostID: dictTimeCost,
                    factHour: 0
                  })
                  date = dateService.nextDay(date)
                }
              }
            }
            if (timeSheetParams.length) {
              timService.setTimeSheet(timeSheetParams)
            } else {
              calcService.addCalcTimeSheetQueue({ employeeNumberID: para.employeeNumberID, description: UB.i18n('Припинення сумісництва'), entityName: 'hr_empOrder' })
            }
            break
          }
          case 'CANCELDISM': {
            // Знайти пункт наказу про призначення на посаду, з якої особа була звільненя
            const newFields = ['ID', 'dateFrom', 'dateTo', 'orderID', 'employeeID', 'organizationID.mi_data_id',
              'orderID.description', 'orderID.reason', 'departmentID.mi_data_id', 'positionID.mi_data_id',
              'employeePositionID.description', 'employeePositionID', 'dismOrderID', 'dismParaID']
            const newPara = UB.Repository(item.mi_unityEntity)
              .attrs(['employeePositionID.paraID', 'employeePositionID.paraID.mi_unityEntity', 'employeeID.sexType'].concat(newFields))
              .selectById(item.ID)
            // check if already canceled
            const prevCancelPara = UB.Repository(item.mi_unityEntity)
              .attrs(['orderID.orderNumber', 'orderID.orderDate'])
              .where('dismParaID', '=', newPara.dismParaID)
              .where('orderID.orderState', '=', 'POSTED')
              .where('ID', '<>', item.ID)
              .selectSingle()
            if (prevCancelPara) {
              throw new UB.UBAbort(`<<<${UB.i18n('Співробітника {0} було вже поновлено наказом № {1} від {2} ', newPara['employeePositionID.description'], prevCancelPara['orderID.orderNumber'], moment(prevCancelPara['orderID.orderDate']).format('DD.MM.YYYY'))}>>>`)
            }
            // копіюємо с останнього призначення
            para = UB.Repository('hr_employeePosition')
              .attrs('*')
              .misc({ __mip_recordhistory_all: true })
              .selectById(newPara['employeePositionID'])
            if (!para) {
              throw new UB.UBAbort(`<<<${UB.i18n('Неможливо знайти наказ про призначення {0} для проведення наказу про скасування', newPara['employeePositionID.description'])}>>>`)
            }
            const empNum = UB.Repository('hr_employeeNumberS')
              .attrs(['dateTo', 'changeOrderID'])
              .selectById(para['employeeNumberID'])
            if (!para.payElID) {
              throw new UB.UBAbort(`<<<${UB.i18n('{0}. Не вказано вид оплати для окладу, проведення неможливе', newPara['employeePositionID.description'])}>>>`)
            }
            orderService.updateByOrder({
              store: 'hr_employeeNumber',
              params: {
                ID: para['employeeNumberID'],
                dateTo: dateService.maxDate(),
                changeOrderID: order.ID
              },
              oldValues: {
                dateTo: empNum['dateTo'],
                changeOrderID: empNum['changeOrderID']
              },
              saved: saved
            })
            // const currentPeriod = periodService.getCurrentPeriod(newPara['organizationID.mi_data_id'])
            // timService.cancelTimeSheetByOrder(newPara['dismOrderID'], order.ID, currentPeriod, para['dateFrom'], null, [para['employeeNumberID']], true)
            para.changeOrderID = null
            para.appointOrder = newPara['orderID.description']
            para.appointReason = newPara['orderID.reason']
            para.dateFrom = newPara['dateFrom']
            para.dateTo = dateService.maxDate()
            orderService.clearMiAttrs(para)

            para.dictTrialPeriodID = null
            para.dateTrialEnd = null
            para['organizationID.mi_data_id'] = para.organizationID
            para['departmentID.mi_data_id'] = para.departmentID
            para['positionID.mi_data_id'] = para.positionID
            para['paraID'] = item.ID
            para['orderID'] = newPara['orderID']

            delete para.ID
            const position = UB.Repository('hr_position')
              .attrs(['ID', 'fullNameNom', 'fullNameNomF', 'fullName'])
              .where('mi_data_id', '=', para.positionID)
              .where('state', '=', 'ACTIVE')
              .misc({ __mip_ondate: newPara['dateFrom'] })
              .selectSingle()
            const workPosition = position
              ? (isUseSexType && newPara['employeeID.sexType'] === 'W' ? position['fullNameNomF'] : position['fullNameNom']) || position['fullName']
              : null

            const newID = orderService.createEmployeePosition({
              para: para,
              saved: saved,
              isCreateWorkBookRecord: true,
              mParams: {
                isOrgAppoint: true,
                positionCategory: para['positionType'] === '1' ? para['psCatName'] : null,
                workPosition,
                positionType: para['positionType']
              }
            })
            // джерела фінансування
            orderService.copyEmpPosFundSource({ priorID: newPara['employeePositionID'], newID: newID, saved })
            // Нарахування
            // orderService.createOrderAccrual({ para: para, saved: saved, isClosePrev: true })
            break
          }
          case 'DISM':
            global.hr_empOrderDismDet.doPosting({ order, item, para, saved })
            break
          case 'TRANSFER':
            global.hr_empOrderTransferDet.doPosting({ order, item, para, saved })
            break
          case 'RANK':
            global.hr_empOrderRankDet.doPosting({ order, item, saved })
            break
          case 'CWSRELAXDONOR':
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'employeeNumberID.orgID', 'employeePositionID', 'employeeID', 'dictTimeCostID', 'orderID'])
              .selectById(item.ID)
            dateTo = para.dateTo ? dateService.shiftDate(para.dateTo) : null
            para.periodID = periodID
            para.factHour = 0
            para.mi_unityEntity = item.mi_unityEntity
            /* День відпочинку */
            if (para.dateFrom) {
              const payEl = UB.Repository('hr_payEl')
                .attrs(['ID', 'includeSecondJobs'])
                .where('methodID.code', '=', '73')
                .where('dateFrom', '<=', dateService.unshiftDate(para.dateFrom))
                .where('dateTo', '>=', dateService.unshiftDate(para.dateFrom))
                .selectSingle()
              para.dateTo = para.dateFrom
              para.includeSecondJobs = payEl ? payEl.includeSecondJobs : false
              orderService.setTimeSheet({ para: para, saved: saved, currentPeriod })
            } else {
              const payEl = UB.Repository('hr_payEl')
                .attrs(['ID', 'includeSecondJobs'])
                .where('methodID.code', '=', '73')
                .where('dateFrom', '<=', dateService.unshiftDate(para.dateTo))
                .where('dateTo', '>=', dateService.unshiftDate(para.dateTo))
                .selectSingle()
              const dictVacationKindID = UB.Repository('hr_dictVacationKind')
                .attrs(['ID'])
                .where('code', '=', 'dDonor')
                .selectScalar()
              const vacDateTo = dateService.addDays(dateService.addYears(dateTo, 1), -1)
              const employeeNumbers = [{
                ID: para.employeeNumberID
              }]
              para.includeSecondJobs = payEl ? payEl.includeSecondJobs : false

              if (payEl && payEl.includeSecondJobs) {
                const staffService = require('../HR/modules/staffService')
                const secJobs = staffService.getSecondJobs(para.employeeID, para.employeeNumberID, para['employeeNumberID.orgID'], dateTo, vacDateTo)
                secJobs.forEach(row => {
                  employeeNumbers.push({
                    ID: row.employeeNumberID
                  })
                })
              }
              employeeNumbers.forEach(row => {
                const empVacPlanID = UB.DataStore('hr_empVacationPlan').generateID()
                orderService.insertByOrder({
                  store: 'hr_empVacationPlan',
                  params: {
                    ID: empVacPlanID,
                    employeeNumberID: row.ID,
                    employeeID: para.employeeID,
                    dictVacationKindID: dictVacationKindID,
                    dateFrom: dateTo,
                    dateTo: vacDateTo,
                    dayCount: 1,
                    orderID: null,
                    orderDetID: item.ID
                  },
                  saved: saved
                })
                orderService.insertByOrder({
                  store: 'hr_empVacationPeriod',
                  params: {
                    empVacationPlanID: empVacPlanID,
                    dateFrom: dateTo,
                    dateTo: vacDateTo,
                    dayCountPlan: 1
                  },
                  saved: saved
                })
              })
            }
            /* День донорства */
            if (dateTo) {
              para.dateFrom = dateTo
              para.dateTo = dateTo
              orderService.setTimeSheet({ para: para, saved: saved, currentPeriod })
            }
            break
          case 'CWSRELAXHD': {
            global.hr_empOrderCwsrelaxhdDet.doPosting({
              item: item,
              isImportOperation: isImportOperation,
              order: order,
              saved: saved,
              currentPeriod
            })
            break
          }
          case 'MISSION':
          case 'MISSION_TRAINING':
            if (!item.isGroup) {
              // let missionDateFrom
              orderService.postMissionOrder(order, item, periodID, currentPeriod, saved)
            }
            break
          case 'CANCELMISSION':
          case 'CHANGEMISSION':
            // posting
            const repo = item.empOrderType === 'CHANGEMISSION'
              ? UB.Repository('hr_empOrderChangemissionDet')
              : UB.Repository('hr_empOrderCancelmissionDet')
            const cancelMissionItem = repo.attrs(['missionOrderID', 'missionOrderDetID', 'employeePositionID'])
              .where('ID', '=', item.ID)
              .selectSingle()
            const cancelMissionOrder = UB.Repository('hr_empOrder')
              .attrs(['ID', 'orderState'])
              .selectById(cancelMissionItem ? cancelMissionItem.missionOrderID : -1)
            if (!cancelMissionOrder || (cancelMissionOrder && cancelMissionOrder.orderState === 'PROJECT')) {
              throw new UB.UBAbort(`<<<${UB.i18n('Проведення наказу про зміни неможливо. Не проведено або не знайдено наказ, який змінюється')}>>>`)
            }
            const missionItems = UB.Repository('hr_empOrderDet')
              .attrs(orderService.getEmpOrderDetFields().concat(['changedValues']))
              .where('orderID', '=', cancelMissionItem.missionOrderID)
              .where('paraID', '=', cancelMissionItem.missionOrderDetID)
              .where('employeePositionID', '=', cancelMissionItem.employeePositionID)
              .selectAsObject()
            if (missionItems && missionItems.length) {
              orderService.cancelMissionOrderItem(missionItems[0])
              if (item.empOrderType === 'CHANGEMISSION') {
                orderService.postMissionOrder(order, item, periodID, currentPeriod, saved, missionItems[0].ID)
              }
            }
            if (cancelMissionItem) {
              const empemployeeDet = UB.Repository('hr_empOrderEmployeeDet').attrs(['ID'])
                .where('paraID', '=', cancelMissionItem.missionOrderDetID)
                .where('employeePositionID', '=', cancelMissionItem.employeePositionID)
                .selectAsObject()
              if (empemployeeDet && empemployeeDet.length) {
                const empOrderActingDet = UB.Repository('hr_empOrderActingDet')
                  .attrs(['ID', 'employeeID', 'employeeNumberID', 'cancelParaID'])
                  .where('paraID', '=', empemployeeDet[0].ID)
                  .selectAsObject()
                if (empOrderActingDet && empOrderActingDet.length) {
                  empOrderActingDet.forEach(ai => {
                    orderService.updateByOrder({
                      store: 'hr_empOrderActingDet',
                      params: {
                        ID: ai.ID,
                        cancelParaID: item.ID
                      },
                      oldValues: {
                        cancelParaID: ai.cancelParaID
                      },
                      saved: saved
                    })
                    const employeeAccrual = UB.Repository('hr_employeeAccrual').attrs(['ID'])
                      .where('orderID', '=', ai.ID)
                      .where('employeeNumberID', '=', ai.employeeNumberID)
                      .selectAsObject()
                    employeeAccrual.forEach(ea => {
                      orderService.deleteByOrder({
                        store: 'hr_employeeAccrual',
                        params: {
                          ID: ea.ID
                        },
                        saved: saved
                      })
                    })
                  })
                }
              }
            }
            break
          case 'ADDSALARY':
          case 'ADDSALARYGOV': {
            if (item.isGroup) {
              break
            }
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'dateTo', 'orderID', 'payElID', 'payElID.methodID.valuation', 'newValue', 'accrualRate',
                'notCancelPrevious', 'cancelPrevAccrual', 'employeeNumberID', 'employeeID', 'dictFundSourceID', 'employeeNumberID.description'])
              .selectById(item.ID)
            const valuation = para['payElID.methodID.valuation']
            let sum
            let rate
            if (order.empOrderType === 'ADDSALARYGOV') {
              switch (valuation) {
                case 'SUM':
                  sum = para.newValue
                  rate = null
                  break
                case 'RATE':
                case 'DICT':
                case 'SUMRATE':
                  sum = null
                  rate = para.accrualRate
                  break
                default:
                  throw new UB.UBAbort(`<<<${UB.i18n('{0}. Невідома оцінка виду нарахування {1}', para['employeeNumberID.description'], valuation)}>>>`)
              }
            } else {
              sum = para.newValue
              rate = para.accrualRate
            }

            let notCancelPrevAccrual = !para.cancelPrevAccrual
            if (item.empOrderType === 'ADDSALARYGOV') {
              notCancelPrevAccrual = para.notCancelPrevious
            }

            if (notCancelPrevAccrual) {
              orderService.insertByOrder({
                store: 'hr_employeeAccrual',
                params: {
                  employeeID: para.employeeID,
                  employeeNumberID: para.employeeNumberID,
                  payElID: para.payElID,
                  dateFrom: para.dateFrom,
                  dateTo: para.dateTo,
                  accrualSum: sum,
                  accrualRate: rate,
                  orderID: para.orderID,
                  orderNumber: order.orderNumberFull,
                  orderDate: order.orderDate,
                  dictFundSourceID: para.dictFundSourceID,
                  changeOrderID: null
                },
                saved: saved
              })
            } else {
              orderService.replaceAccrual({
                employeeID: para.employeeID,
                employeeNumberID: para.employeeNumberID,
                payElID: para.payElID,
                dateFrom: para.dateFrom,
                dateTo: para.dateTo,
                accrualSum: sum,
                accrualRate: rate,
                orderID: para.orderID,
                orderNumber: order.orderNumberFull,
                orderDate: order.orderDate,
                dictFundSourceID: para.dictFundSourceID,
                saved: saved
              })
            }

            break
          }
          case 'CANCELSALARY': {
            if (item.isGroup) {
              break
            }
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'dateTo', 'orderID', 'payElID', 'accrualID', 'employeeNumberID', 'cancelSalaryParaDetID.dateFrom', 'removeAccrual'])
              .selectById(item.ID)
            const dateTo = dateService.shiftDate(para['cancelSalaryParaDetID.dateFrom'])
            let accrual
            if (para.accrualID) {
              accrual = UB.Repository('hr_employeeAccrual')
                .attrs('ID', 'dateFrom', 'dateTo', 'changeOrderID', 'isActive')
                .selectById(para.accrualID)
            } else {
              accrual = UB.Repository('hr_employeeAccrual')
                .attrs('ID', 'dateFrom', 'dateTo', 'changeOrderID', 'isActive')
                .where('payElID', '=', para.payElID)
                .where('dateFrom', '=', dateService.shiftDate(para.dateFrom))
                .where('employeeNumberID', '=', para.employeeNumberID)
                .selectSingle()
            }
            if (accrual) {
              orderService.updateByOrder({
                store: 'hr_employeeAccrual',
                params: {
                  ID: accrual.ID,
                  dateTo: para.dateTo ? dateService.shiftDate(para.dateTo) : dateTo,
                  changeOrderID: para.orderID,
                  isActive: (para.removeAccrual && (para.dateTo ? dateService.shiftDate(para.dateTo) : dateTo).getTime() === dateService.shiftDate(accrual.dateFrom).getTime()) ? 0 : 1
                },
                oldValues: {
                  dateTo: accrual.dateTo,
                  changeOrderID: accrual.changeOrderID,
                  isActive: accrual.isActive
                },
                saved: saved
              })
            }
            break
          }
          case 'TRAINING': {
            if (item.mi_unityEntity !== 'hr_empOrderTrainingDet') {
              break
            }
            const para = UB.Repository(item.mi_unityEntity).attrs([// hr_empOrderTrainingDet
              'ID',
              'itemIdx',
              'orderID',
              'organizationID',
              'dictTimeCostID', // Елемент обліку робочого часу факт
              'isExternal', // Зовнішній
              'empOrderType', // Тип наказу
              'isInsideCountry', // В межах країни
              'countryID', // Країна
              'destOrganizationID', // Заклад освіти
              'destOrganizationName', // Заклад освіти
              'organizationID.name', // Заклад освіти
              'cityID', // Населений пункт
              'cityName', // Населений пункт
              'dateFrom', // Дата з
              'dateTo', // Дата по
              'dayCount', // Днів
              'programm', // Тренінгова програма,
              'isFromCatalog',
              'groupCategory',
              'dictProfCompetencyID',
              'dictProfCompDevelopFormID',
              'dictTrainingTopicID',
              'dictTrainingTopicName',
              'dictSpecialityID',
              'lectureCycle',
              'dictTrainingKindID',
              'trainingDirection'
            ]).selectById(item.ID)
            orderService.checkIsParaOk(para)
            if (!periodID) {
              throw new UB.UBAbort('<<<Для організації не знайдено поточного періоду, проведення неможливе>>')
            }
            const empCertificatnUp = UB.DataStore('hr_empCertificatnUp')
            const emp = UB.Repository('hr_empOrderEmployeeDet').attrs([
              'ID',
              'orderID',
              'paraID',
              'departmentID',
              'positionID',
              'organizationID',
              'employeePositionID',
              'employeeNumberID',
              'employeeID'
            ])
              .where('paraID', '=', para.ID)
              .selectAsObject()
            emp.forEach(empItem => {
              orderService.insertByOrder({
                store: empCertificatnUp,
                params: {
                  orderID: empItem.orderID,
                  paraID: empItem.ID,
                  educationName: para.destOrganizationName,
                  dateFrom: para.dateFrom,
                  dateTo: para.dateTo,
                  isInsideCountry: para.isInsideCountry,
                  countryID: para.countryID,
                  groupCategory: para.isFromCatalog ? para.groupCategory : null,
                  dictProfCompetencyID: para.isFromCatalog ? para.dictProfCompetencyID : null,
                  dictProfCompDevelopFormID: para.dictProfCompDevelopFormID,
                  dictTrainingTopicID: para.dictTrainingTopicID,
                  dictTrainingTopicName: para.dictTrainingTopicName,
                  employeeID: empItem.employeeID,
                  orderNumber: order.orderNumberFull,
                  orderDate: order.orderDate,
                  srcOrganizationName: para['organizationID.name'],
                  srcOrganizationID: order.organizationID,
                  organizationID: order.organizationID,
                  dictSpecialityID: para.dictSpecialityID,
                  lectureCycle: para.lectureCycle,
                  dictTrainingKindID: para.dictTrainingKindID,
                  trainingDirection: para.trainingDirection
                },
                saved: saved
              })
              empItem.periodID = periodID
              empItem.mi_unityEntity = item.mi_unityEntity
              empItem.factHour = 0
              empItem.dateFrom = para.dateFrom
              empItem.dateTo = para.dateTo
              empItem.dictTimeCostID = para.dictTimeCostID
              if (para.dictTimeCostID) {
                orderService.setTimeSheet({ para: empItem, saved: saved, currentPeriod })
              }
              orderService.createActingAccrual({ para: empItem, saved: saved })
            })

            break
          }
          case 'PENALTY':
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['dictPenaltyID', 'dictPenaltyReasonID', 'comission', 'docDescription', 'comment'])
              .where('ID', '=', item.ID)
              .selectSingle()
            orderService.checkIsParaOk(para)
            orderService.insertByOrder({
              store: 'hr_employeePenalty',
              params: {
                orderID: execParams.ID,
                employeeID: item.employeeID,
                orderDetID: item.ID,
                dictPenaltyID: para.dictPenaltyID,
                dictPenaltyReasonID: para.dictPenaltyReasonID,
                docIssued: para.comission,
                docIssuedDate: orderDate,
                docDescription: para.docDescription,
                comment: para.comment
              },
              saved: saved
            })
            break
          case 'CHGEMPLOYEE': {
            const chgFieldList = ['lastName', 'firstName', 'middleName', 'genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName', 'fullFIO', 'shortFIO']
            const oldFieldList = chgFieldList.map(item => item + 'Old')
            para = UB.Repository(item.mi_unityEntity)
              .attrs(chgFieldList.concat(oldFieldList).concat(['employeeID', 'orderID', 'ID', 'employeePositionID', 'itemIdx']))
              .selectById(item.ID)
            orderService.checkIsParaOk(para)
            const emp = UB.Repository('hr_employee').attrs('*').misc({ __mip_recordhistory_all: true }).selectById(para.employeeID)
            if (!emp) {
              throw new UB.UBAbort(`<<<${UB.i18n('Особа {0} видалена, проведення неможливе', para['fullFIOOld'])}>>>`)
            }
            const params = {}
            const oldValues = {}
            chgFieldList.forEach(fld => {
              params[fld] = para[fld]
              oldValues[fld] = emp[fld]
            })
            params.ID = emp.ID
            params.changeOrderID = para.orderID
            oldValues.changeOrderID = emp.changeOrderID
            orderService.updateByOrder({
              store: 'hr_employee',
              params: params,
              oldValues: oldValues,
              saved: saved
            })
            const employeeNumberList = UB.Repository('hr_employeeNumberS')
              .attrs(['ID', 'changeOrderID', 'description'])
              .where('employeeID', '=', para.employeeID)
              .selectAsObject()
            employeeNumberList.forEach(item => {
              orderService.updateByOrder({ // Update description (by beforeUpdate of hr_employeeNumber)
                store: 'hr_employeeNumber',
                params: {
                  ID: item.ID,
                  description: null,
                  changeOrderID: -1
                },
                oldValues: {
                  description: item.description
                },
                saved: saved
              })
            })
            const employeePositionList = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'changeOrderID', 'description'])
              .where('employeeNumberID', 'in', employeeNumberList.map(item => item.ID))
              .where('dateFrom', '>=', dateService.shiftDate(orderDate))
              .selectAsObject()
            employeePositionList.forEach(item => {
              orderService.updateByOrder({ // Update description (by beforeUpdate of hr_employeePosition)
                store: 'hr_employeePosition',
                params: {
                  ID: item.ID,
                  description: null,
                  changeOrderID: -1
                },
                oldValues: {
                  description: item.description
                },
                saved: saved
              })
            })
            const docAttrs = Object.keys(global.hr_empOrderDocs.entity.attributes).filter(aItem => !aItem.startsWith('mi_') && aItem !== 'ID')
            const empOrderDocsList = UB.Repository('hr_empOrderDocs')
              .attrs(docAttrs)
              .where('paraID', '=', item.ID)
              .selectAsObject()
            empOrderDocsList.forEach(aItem => {
              orderService.insertByOrder({
                store: 'hr_employeeDocs',
                params: aItem,
                saved: saved
              })
            })
            para.paraID = para.ID
            delete para.ID
            const chgStoreAttrs = Object.keys(global.hr_employeeChange.entity.attributes).filter(attr => attr.indexOf('mi_') === -1)
            const chgStoreParams = {}
            chgStoreAttrs.forEach(attr => {
              chgStoreParams[attr] = para[attr]
            })
            chgStoreParams.organizationID = order.organizationID
            chgStoreParams.orderDate = order.orderDate
            chgStoreParams.orderNumberFull = order.orderNumberFull
            orderService.insertByOrder({
              store: 'hr_employeeChange',
              params: chgStoreParams,
              saved: saved
            })
            break
          }
          case 'ACTINGORD': {
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'employeePositionID.accrualSum', 'employeePositionID', 'orderID'])
              .selectById(item.ID)
            orderService.createActingAccrual({ para: para, saved: saved })
            break
          }
          case 'VACATION':
          case 'VACATIONPROLONG': {
            global.hr_empOrderVacationDet.doPosting({
              item: item,
              isImportOperation: isImportOperation,
              currentPeriod,
              order: order,
              saved: saved
            })
            break
          }
          case 'VACATIONLONG': {
            global.hr_empOrderVacationlongDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              currentPeriod,
              saved: saved
            })
            break
          }
          case 'VACATIONPROLONGL': {
            global.hr_empOrderVacationprolonglDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          }
          case 'VACATIONREVOKE': {
            global.hr_empOrderVacationrevokeDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          }
          case 'VACRETPROLONG': {
            global.hr_empOrderVacretprolongDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              currentPeriod,
              saved: saved
            })
            break
          }
          case 'CERTIFICATION': {
            global.hr_empOrderCertificationDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          }
          case 'VACATIONRET': {
            global.hr_empOrderVacationretDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          }
          case 'VACATIONCOMP':
            global.hr_empOrderVacationcompDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              saved: saved
            })
            break
          case 'DOWNTIME':
            if (item.isGroup) {
              para = UB.Repository('hr_empOrderDowntimeDet')
                .attrs(['errorText', 'dateFrom', 'dateTo', 'dictTimeCostID', 'dictTimeCostID.timeCostType', 'payElID'])
                .selectById(item.ID)
              if (para && para.errorText) {
                orderService.updateByOrder({
                  store: 'hr_empOrderDowntimeDet',
                  params: {
                    ID: item.ID,
                    errorText: null
                  },
                  saved: saved,
                  oldValues: {
                    errorText: para.errorText
                  }
                })
              }
              let dtList = UB.Repository('hr_empOrderDowntimeListDet')
                .attrs(['employeeNumberID', 'employeeID'])
                .where('paraID', '=', item.ID)
                .selectAsObject()
              if (dtList && dtList.length > 0) {
                let isCreateTimeSheetChange = true
                if (para.payElID) {
                  const payElTimeCostID = UB.Repository('hr_payEl')
                    .attrs('dictTimeCostID')
                    .where('ID', '=', para.payElID)
                    .selectScalar()
                  if (payElTimeCostID) isCreateTimeSheetChange = false
                  dtList.forEach(row => {
                    timService.checkCrossTimeSheet(row.employeeNumberID, para.dictTimeCostID, para.dateFrom, para.dateTo, row.empAccrualID ? [row.empAccrualID] : null, true)
                    row.empAccrualID = orderService.insertByOrder({
                      store: 'hr_employeeAccrual',
                      params: {
                        employeeID: row.employeeID,
                        employeeNumberID: row.employeeNumberID,
                        payElID: para.payElID,
                        dateFrom: para.dateFrom,
                        dateTo: para.dateTo,
                        orderID: execParams.ID,
                        changeOrderID: null
                      },
                      saved: saved
                    })
                  })
                }
                if (isCreateTimeSheetChange) {
                  dtList.forEach(row => {
                    timService.checkCrossTimeSheet(row.employeeNumberID, para.dictTimeCostID, para.dateFrom, para.dateTo, row.empAccrualID ? [row.empAccrualID] : null, true)
                  })
                  timService.createTimeSheetChange({
                    organizationID: order.organizationID,
                    orderID: execParams.ID,
                    paraID: item.ID,
                    orderNumber: order.orderNumber,
                    orderDate: order.orderDate,
                    dateFrom: para.dateFrom,
                    dateTo: para.dateTo,
                    employeeNumbers: dtList.map(itm => itm.employeeNumberID),
                    typeSheetChange: '4',
                    days: [{
                      numDay: 0,
                      dictTimeCostID: para.dictTimeCostID,
                      notChangeHoursWork: para['dictTimeCostID.timeCostType'] === 'WORK' ? 1 : 0
                    }]
                  })
                }
              }
            }
            break
          case 'CWS':
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'employeePositionID.dateFrom', 'employeePositionID.dateTo', 'employeePositionID',
                'employeeNumberID', 'employeeID', 'orderID', 'workScheduleID', 'title', 'employeeID.fullFIO'])
              .selectById(item.ID)
            pos = UB.Repository('hr_employeePosition').attrs(['*'])
              .where('employeeID', '=', para.employeeID)
              .where('employeeNumberID', '=', para.employeeNumberID)
              .where('dateFrom', '<=', dateService.shiftDate(para.dateFrom))
              .where('dateTo', '>=', dateService.shiftDate(para.dateFrom))
              .where('isActive', '=', 1)
              .orderByDesc('dateFrom')
              .limit(1)
              .selectSingle()
            if (!pos) {
              throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено призначення для {0}, можливо, працівник був переведений', para.title)}>>>`)
            }
            if (UB.Repository('hr_employeePosition').attrs(['ID'])
              .where('employeeID', '=', para.employeeID)
              .where('employeeNumberID', '=', para.employeeNumberID)
              .where('dateFrom', '>', dateService.shiftDate(para.dateFrom))
              .where('isActive', '=', 1)
              .limit(1)
              .selectScalar()) {
              throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} є більш пізднє призначення', para['employeeID.fullFIO'])}>>>`)
            }
            changeEmployeePosition({
              params: {
                paraID: para.ID,
                employeePositionID: null,
                changeOrderID: para.orderID,
                dateFrom: dateService.shiftDate(para.dateFrom),
                pos: pos
              },
              attrsToChange: {
                workScheduleID: para.workScheduleID
              },
              closeWorkbook: false,
              saved: saved,
              usePosDateTo: true
            })
            inOneDay = dateService.shiftDate(pos.dateFrom).getTime() === dateService.shiftDate(para.dateFrom).getTime()
            const empWorkShdChanges = UB.Repository('hr_empWorkShdChange')
              .attrs('ID', 'dateTo', 'dateToEmpty')
              .where('dateFrom', '<=', para.dateFrom)
              .where('dateTo', '>=', para.dateFrom)
              .where('employeeID', '=', para.employeeID)
              .where('employeeNumberID', '=', para.employeeNumberID)
              .where('isActive', '=', 1)
              .selectAsObject()
            empWorkShdChanges.forEach(item => {
              orderService.updateByOrder({
                store: 'hr_empWorkShdChange',
                params: {
                  ID: item.ID,
                  dateTo: inOneDay ? dateService.shiftDate(para.dateFrom) : dateService.addDays(para.dateFrom, -1),
                  dateToEmpty: inOneDay ? dateService.shiftDate(para.dateFrom) : dateService.addDays(para.dateFrom, -1),
                  isActive: inOneDay ? 0 : 1
                },
                saved: saved,
                oldValues: {
                  dateTo: item.dateTo,
                  dateToEmpty: item.dateToEmpty,
                  isActive: 1
                }
              })
            })
            const params = {
              employeeID: para.employeeID,
              dateFrom: para.dateFrom,
              workScheduleID: para.workScheduleID,
              orderID: para.orderID,
              paraID: para.ID,
              employeeNumberID: para.employeeNumberID
            }
            orderService.createWorkSched({
              params: params,
              mParams: {
                isClosePrev: true
              },
              saved: saved
            })
            pos = null
            break
          case 'VACATIONAPSCHED': {
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['isCorr'])
              .selectById(item.ID)
            const isCorr = para.isCorr
            const apschedDet = UB.Repository('hr_empOrderVacSchedListDet')
              .attrs(['vacationScheduleID', 'vacationScheduleID.state', 'vacationScheduleID.orderID',
                'vacationScheduleID.orderDetID', 'vacationScheduleID.orderID.orderState'
              ])
              .where('orderDetID', '=', item.ID)
              .selectAsObject()
            apschedDet.forEach(apschedItem => {
              if (apschedItem['vacationScheduleID.orderID.orderState'] === 'POSTED' || apschedItem['vacationScheduleID.orderID.orderState'] === 'PROCESSED') {
                const vacSchedItem = UB.Repository('hr_vacationSchedule')
                  .attrs('orderID.description', 'employeePositionID.description', 'dateFrom', 'dateTo', 'dictVacationKindID.name')
                  .selectById(apschedItem.vacationScheduleID)
                if (vacSchedItem) {
                  throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} запланована відпустка "{1}" з {2} по {3} вже затверджена наказом "{4}"',
                    vacSchedItem['employeePositionID.description'], vacSchedItem['dictVacationKindID.name'],
                    dateService.formatDate(vacSchedItem['dateFrom']), dateService.formatDate(vacSchedItem['dateTo']), vacSchedItem['orderID.description'])}>>>`)
                }
              } else {
                orderService.updateByOrder({
                  store: 'hr_vacationSchedule',
                  params: {
                    ID: apschedItem.vacationScheduleID,
                    orderID: item.orderID,
                    orderDetID: item.ID,
                    state: isCorr ? 'CORRECTION' : 'APPROVED'
                  },
                  saved: saved,
                  oldValues: {
                    orderID: apschedItem['vacationScheduleID.orderID'],
                    orderDetID: apschedItem['vacationScheduleID.orderDetID'],
                    state: apschedItem['vacationScheduleID.state']
                  }
                })
              }
            })
            break
          }
          case 'CHGPOSITION':
            if (item.mi_unityEntity === 'hr_empOrderChgpositionDet') {
              para = UB.Repository('hr_empOrderChgpositionDet')
                .attrs(['ID', 'orderID', 'actionType', 'dateFrom', 'isTemporary', 'planDateTo'])
                .selectById(item.ID)
              const attrList = UB.Repository('hr_empOrderChgPositionAttrsDet')
                .attrs(['dictEmpPosAttrID', 'dictEmpPosAttrID.attrName', 'changeAll', 'curValue', 'newValue'])
                .where('paraID', '=', item.ID)
                .selectAsObject({
                  'dictEmpPosAttrID.attrName': 'attrName'
                })
              const changeAttr = []
              const empPosDataStore = UB.DataStore('hr_employeePosition')
              const entityAttr = empPosDataStore.entity.attributes
              attrList.forEach(row => {
                if (entityAttr[row.attrName]) {
                  const attr = entityAttr[row.attrName]
                  const type = attr.dataType.toUpperCase()
                  let curValue = row.curValue
                  let newValue = row.newValue
                  switch (type) {
                    case 'DATE':
                      curValue = row.curValue ? dateService.shiftDate(row.curValue) : null
                      newValue = row.newValue ? dateService.shiftDate(row.newValue) : null
                      break
                    case 'INT':
                    case 'BIGINT':
                    case 'CURRENCY':
                    case 'FLOAT':
                    case 'BOOLEAN':
                    case 'ENTITY':
                      curValue = row.curValue ? Number(row.curValue) : null
                      newValue = row.newValue ? Number(row.newValue) : null
                      break
                  }
                  changeAttr.push({
                    changeAll: row.changeAll,
                    attrName: row.attrName,
                    curValue: curValue,
                    newValue: newValue
                  })
                }
              })
              const empIDs = UB.Repository('hr_empOrderChgPositionEmpDet')
                .attrs('employeePositionID')
                .where('paraID', '=', item.ID)
                .selectAsObject()
              if (empIDs.length) {
                const empPositions = UB.Repository('hr_employeePosition')
                  .attrs(['*'])
                  .where('ID', 'in', empIDs.map(o => o.employeePositionID))
                  .selectAsObject()
                empIDs.forEach(emp => {
                  const empPos = empPositions.find(o => o.ID === emp.employeePositionID)
                  if (empPos) {
                    const oldValues = {
                      ID: emp.employeePositionID
                    }
                    const params = {}
                    changeAttr.forEach(attr => {
                      if (attr.changeAll || empPos[attr.attrName] === attr.curValue) {
                        params.ID = empPos.ID
                        params[attr.attrName] = attr.newValue
                        oldValues[attr.attrName] = empPos[attr.attrName]
                      }
                    })
                    if (params.ID) {
                      if (para.actionType === 'UPDATE') {
                        params.changeOrderID = -1
                        orderService.updateByOrder({
                          store: empPosDataStore,
                          params: params,
                          saved: saved,
                          oldValues: oldValues
                        })
                      }
                      if (para.actionType === 'CREATE') {
                        params.planDateTo = para.planDateTo
                        params.changedValues = JSON.stringify({
                          oldValues: oldValues,
                          newValues: params
                        })
                        if (dateService.shiftDate(para.dateFrom) < dateService.shiftDate(empPos.dateFrom)) {
                          throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} дата вступу в дію менше ніж дата початку дії призначення', empPos.description)}>>>`)
                        }
                        if (dateService.shiftDate(para.dateFrom) > dateService.shiftDate(empPos.dateTo)) {
                          throw new UB.UBAbort(`<<<${UB.i18n('Для працівника {0} дата вступу в дію більше ніж дата закінчення дії призначення', empPos.description)}>>>`)
                        }
                        params.orderID = item.orderID
                        changeEmployeePosition({
                          params: {
                            paraID: para.ID,
                            employeePositionID: emp.employeePositionID,
                            changeOrderID: para.orderID,
                            dateFrom: dateService.shiftDate(para.dateFrom)
                          },
                          attrsToChange: params,
                          saved: saved,
                          usePosDateTo: true,
                          closeWorkbook: false
                        })
                      }
                    }
                  }
                })
              }
            }
            break
          case 'CANCELPARA':
            global[item.mi_unityEntity].doPosting({
              item: item,
              isImportOperation: isImportOperation,
              order: order,
              saved: saved
            })
            break
          case 'STAFFTABLEMOVE':
          case 'STAFFTABLEMOVE_TARIF':
            global['hr_empOrderStafftablemoveDet'].doPosting({
              item: item,
              order: order,
              saved: saved
            })
            break
          case 'ACTINGCLOSE':
            if (item.isGroup) {
              break
            }
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'dateFrom', 'dateTo', 'orderID', 'employeeNumberID', 'actingID', 'actingID.dateTo', 'actingID.payElID', 'actingID.orderID'])
              .selectById(item.ID)
            const closeDateTo = dateService.shiftDate(para.dateTo)
            if (para['actingID.payElID']) {
              const pAccr = UB.Repository('hr_employeeAccrual')
                .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
                .where('payElID', '=', para['actingID.payElID'])
                .where('employeeNumberID', '=', para.employeeNumberID)
                .where('dateFrom', '<=', closeDateTo)
                .where('dateTo', '>=', closeDateTo)
                .selectAsObject()
              pAccr.forEach(row => {
                orderService.updateByOrder({
                  store: 'hr_employeeAccrual',
                  params: {
                    ID: row.ID,
                    dateTo: closeDateTo,
                    changeOrderID: para.orderID
                  },
                  saved: saved,
                  oldValues: {
                    dateTo: row.dateTo,
                    changeOrderID: row.changeOrderID
                  }
                })
              })
            }
            orderService.updateByOrder({
              store: 'hr_empOrderActingDet',
              params: {
                ID: para.actingID,
                dateTo: closeDateTo
              },
              saved: saved,
              oldValues: {
                dateTo: para['actingID.dateTo']
              }
            })
            break
          case 'RECALL':
            para = UB.Repository(item.mi_unityEntity)
              .attrs(['ID', 'employeeNumberID', 'orderID', 'grantOrderParaID', 'grantOrderParaID.orderID'])
              .selectById(item.ID)
            const periodList = UB.Repository('hr_empOrderRecallListDet')
              .attrs(['dateFrom', 'dateTo'])
              .where('paraID', '=', item.ID)
              .selectAsObject()
            const pAccr = UB.Repository('hr_employeeAccrual')
              .attrs('ID')
              .where('orderID', '=', para['grantOrderParaID.orderID'])
              .where('employeeNumberID', '=', para.employeeNumberID)
              .limit(1)
              .selectSingle()

            periodList.forEach(row => {
              const longTermReplace = UB.Repository('hr_longTermReplace')
                .attrs('ID', 'dateTo', 'changeOrderID')
                .where('employeeNumberAbsID', '=', para.employeeNumberID)
                .where('dateTo', '>', dateService.addDays(dateService.shiftDate(row.dateFrom), -1))
                .selectAsObject()
              longTermReplace.forEach(rerm => {
                orderService.updateByOrder({
                  store: 'hr_longTermReplace',
                  params: {
                    ID: rerm.ID,
                    dateTo: dateService.addDays(dateService.shiftDate(row.dateFrom), -1),
                    changeOrderID: para.orderID
                  },
                  saved: saved,
                  oldValues: {
                    dateTo: rerm.dateTo,
                    changeOrderID: rerm.changeOrderID
                  }
                })
              })

              timService.cancelTimeSheetByOrder(para['grantOrderParaID.orderID'], order.ID, currentPeriod, row.dateFrom, row.dateTo, [para.employeeNumberID], true)
              if (pAccr) {
                timService.cancelTimeSheetByOrder(pAccr['ID'], order.ID, currentPeriod, row.dateFrom, row.dateTo, [para.employeeNumberID], true)
              }
            })
            break
          case 'TEMPSUSPEND':
            para = UB.Repository('hr_empOrderTempsuspendDet')
              .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'employeeID', 'payElID', 'orderID', 'isTempVacancy', 'isTempsuspend'])
              .selectById(item.ID)
            if (para.isTempVacancy) {
              orderService.insertByOrder({
                store: 'hr_empLongTermAbsc',
                params: {
                  organizationID: order.organizationID,
                  employeeNumberID: para.employeeNumberID,
                  orderID: para.orderID,
                  paraID: para.ID,
                  dateFrom: para.dateFrom,
                  dateTo: para.dateTo,
                  changeOrderID: null
                },
                saved: saved
              })
            }
            para.isTempsuspend && global.hr_empOrderTempsuspendDet.doPosting({
              item: item,
              order: order,
              isImportOperation: isImportOperation,
              currentPeriod,
              saved: saved
            })
            orderService.insertByOrder({
              store: 'hr_employeeAccrual',
              params: {
                employeeID: para.employeeID,
                employeeNumberID: para.employeeNumberID,
                payElID: para.payElID,
                dateFrom: para.dateFrom,
                dateTo: para.dateTo || dateService.maxDate(),
                orderID: execParams.ID,
                changeOrderID: null
              },
              saved: saved
            })
            break
          case 'EXITDOWNTIME':
            let empOrderExitdowntimeDet = UB.Repository('hr_empOrderExitdowntimeDet')
              .attrs(['ID', 'grantOrderID', 'dateFrom', 'orderID'])
              .selectById(item.ID)
            let empList = UB.Repository('hr_empOrderExitdowntimeListDet')
              .attrs(['ID', 'employeeNumberID'])
              .where('paraID', '=', item.ID)
              .selectAsObject()
            empList.forEach(emp => {
              let empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
                .attrs(['ID', 'dateTo', 'changeOrderID'])
                .where('employeeNumberID', '=', emp.employeeNumberID)
                .where('dateTo', '>', empOrderExitdowntimeDet.dateFrom)
                .selectAsObject()
              if (empLongTermAbsc && empLongTermAbsc.length) {
                empLongTermAbsc.forEach(row => {
                  orderService.updateByOrder({
                    store: 'hr_empLongTermAbsc',
                    params: {
                      ID: row.ID,
                      changeOrderID: empOrderExitdowntimeDet.orderID,
                      dateTo: empOrderExitdowntimeDet.dateFrom
                    },
                    saved: saved,
                    oldValues: {
                      dateTo: row.dateTo,
                      changeOrderID: row.changeOrderID
                    }
                  })
                })
              }
            })

            global['hr_empOrderExitdowntimeDet'].doPosting({
              item: item,
              order: order,
              saved: saved,
              currentPeriod
            })
            break
          case 'COMBININGPOS':
            global['hr_empOrderCombiningposDet'].doPosting({
              item: item,
              order: order,
              saved: saved,
              currentPeriod
            })
            break
          case 'VEHICLEASSIGN':
            global['hr_empOrderVehicleassignDet'].doPosting(order.ID)
            break
          case 'MEDEXAMINATION':
            global['hr_empOrderMedexaminationDet'].doPosting(order.ID)
            break
          case 'TEMPAVGPAY':
            global['hr_empOrderTempavgpayDet'].doPosting({ item, order, saved })
            break
          case 'AVERAGEPAY':
            global['hr_empOrderAveragepayDet'].doPosting({ item, order, saved })
            break
          case 'CANCELAVGPAY':
            global['hr_empOrderCancelavgpayDet'].doPosting({ item, order, saved })
            break
          case 'INTERNSHIP':
            para = UB.Repository('hr_empOrderInternshipDet')
              .attrs(['ID', 'dateFrom', 'dateTo', 'employeePositionID.employeeNumberID', 'employeePositionID.employeeID', 'payElID', 'bountySum', 'valuationType', 'orderID'])
              .selectById(item.ID)
            if (para) {
              orderService.insertByOrder({
                store: 'hr_employeeAccrual',
                params: {
                  employeeID: para['employeePositionID.employeeID'],
                  employeeNumberID: para['employeePositionID.employeeNumberID'],
                  payElID: para.payElID,
                  dateFrom: para.dateFrom,
                  dateTo: para.dateTo,
                  accrualSum: para.valuationType === 'SUM' ? (para.bountySum || 0) : null,
                  accrualRate: para.valuationType === 'RATE' ? (para.bountySum || 0) : null,
                  orderID: para.orderID,
                  changeOrderID: null
                },
                saved: saved
              })
            }
            break
        }
        saved.orderID = execParams.ID
        saveOldValues(item, saved)
        if (global[item.mi_unityEntity].getDescriptionExt && global[item.mi_unityEntity].entity.attributes.descriptionExt) {
          UB.DataStore(item.mi_unityEntity).run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              descriptionExt: global[item.mi_unityEntity].getDescriptionExt(item.ID)
            }
          })
        }
      })
  }
}

/**
 * Розпровести наказ
 * @param {ubMethodParams} ctx
 * @param {Object} ctx.execParams
 * @param {number} ctx.execParams.ID наказ
 * @param {string} ctx.execParams.orderState стан
 */
me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const order = UB.Repository('hr_empOrder').attrs(['ID', 'empOrderType', 'staffTableID', 'staffTableOrgStructureID', 'isService', 'organizationID', 'allowPosting']).selectById(execParams.ID)
  const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  if (currentPeriod && currentPeriod.isBlock) {
    throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати')}>>>`)
  }
  if (order.isService) {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ додано/проведено в результаті технічнної операції. Скасування такого наказу неможливе.')}>>>`)
  }
  switch (order.empOrderType) {
    case 'STAFFLIST':
      if (order.staffTableID) {
        orderService.doCancelPostingStaffTable(order.staffTableID, 'hr_staffTable')
      }
      break
    case 'ORGSTRUCTURE':
      if (order.staffTableOrgStructureID) {
        orderService.doCancelPostingStaffTable(order.staffTableOrgStructureID, 'hr_staffTableOrgStructure')
      }
      break
    case 'CHGSALARY':
      orderService.doCancelPostingChgSalary(execParams.ID)
      break
    case 'CWSWORKHOUR':
      const detail = UB.Repository('hr_empOrderDet')
        .attrs(['ID', 'employeeID', 'orderID', 'orderID.orderDate', 'orderID.orderNumber', 'empOrderType', 'mi_unityEntity', 'changedValues'])
        .where('orderID', '=', execParams.ID)
        .where('isGroup', '=', '1')
        .where('isExternal', '<>', 1)
        .selectAsObject()
      detail.forEach(item => {
        timService.removeTimeSheetChange(execParams.ID, item.ID)
        restoreOldValues(item)
      })
      break
    case 'MILSERVICE':
      timService.removeTimeSheetChange(execParams.ID)
      restoreNotDefaultOldValues(execParams.ID)
      break
    case 'MILSERVICERET': {
      const det = UB.Repository('hr_empOrderMilserviceretDet')
        .attrs(['ID', 'employeePositionID', 'sourceParaID.orderID', 'sourceParaID', 'sourceParaID.dateTo', 'employeeNumberID'])
        .where('orderID', '=', execParams.ID)
        .selectAsObject()
      det.forEach(para => {
        const dateTo = dateService.shiftDate(para['sourceParaID.dateTo'])
        const params = {
          orderID: para['sourceParaID.orderID'],
          changeOrderID: null,
          paraID: para['sourceParaID'],
          dateTo: dateTo,
          employeeNumbers: [para.employeeNumberID]
        }
        timService.updateTimeSheetChange(params)
      })
      restoreNotDefaultOldValues(execParams.ID)
      break
    }
    case 'COMPETITIONAD': {
      const empOrderCompetitionadService = require('./modules/empOrderCompetitionadService')
      empOrderCompetitionadService.doCancelPosting(ctx)
      break
    }
    case 'VEHICLEASSIGN': {
      global.hr_empOrderVehicleassignDet.doCancelPosting(order)
      break
    }
    case 'MEDEXAMINATION': {
      global.hr_empOrderMedexaminationDet.doCancelPosting(order)
      break
    }
    default: {
      const detail = UB.Repository('hr_empOrderDet')
        .attrs(['ID', 'employeeID', 'orderID', 'orderID.orderDate', 'orderID.orderNumber', 'empOrderType', 'mi_unityEntity',
          'changedValues', 'orderState', 'paraID', 'paraID.orderState', 'organizationID.mi_data_id', 'employeeNumberID'])
        .where('orderID', '=', execParams.ID)
        .where('isExternal', '<>', 1)
        .where(`coalesce([orderState], '!') <> 'CANCELED'`, 'custom')
        .where(`coalesce([paraID.orderState], '!') <> 'CANCELED'`, 'custom')
        .orderBy('itemIdx', 'desc')
        .selectAsObject()
      let employeeDet
      detail.forEach(item => {
        switch (item.empOrderType) {
          case 'ACTINGORD':
            restoreOldValues(item)
            break
          case 'BONUS':
            restoreOldValues(item)
            break
          case 'BOUNTY':
            restoreOldValues(item)
            break
          case 'BOUNTY_HELP':
            restoreOldValues(item)
            break
          case 'REWARD':
            restoreOldValues(item)
            break
          case 'CHGTIMECOST':
            restoreOldValues(item)
            break
          case 'APPOINT':
          case 'APPOINT_MOVE':
            global.hr_empOrderAppointDet.doCancelPosting(item)
            break
          case 'APPOINT_LIQ':
            global[item.mi_unityEntity].doCancelPosting(item)
            break
          case 'PLURALIST':
            // проверям существование других назначений
            const para = UB.Repository('hr_empOrderPluralistDet')
              .attrs('*')
              .selectById(item.ID)
            if (para) {
              const pos = UB.Repository('hr_employeePositionS')
                .attrs(['ID', 'description'])
                .where('organizationID', '=', order.organizationID)
                .where('employeeNumberID', '=', para.employeeNumberID)
                .where('ID', '!=', para.employeePositionID)
                .where('dateFrom', '>=', dateService.shiftDate(para.dateTo))
                .selectSingle()
              if (pos) {
                throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе - для працівника {0} існують інші призначення, які були  створені іншим наказом', pos.description)}>>>`)
              }
            }
            timService.cancelTimeSheet(order.ID)
            timService.restoreTimeSheetByChangeOrder(order.ID, order.organizationID)
            restoreOldValues(item)
            break
          case 'OUTPLURAL':
            timService.cancelTimeSheet(order.ID)
            timService.restoreTimeSheetByChangeOrder(order.ID, order.organizationID)
            restoreOldValues(item)
            break
          case 'TRIALPROLONG':
            restoreOldValues(item)
            break
          case 'DISM':
            global.hr_empOrderDismDet.doCancelPosting({ order, item })
            restoreOldValues(item)
            break
          case 'TRANSFER':
            global.hr_empOrderTransferDet.doCancelPosting({ order, item })
            restoreOldValues(item)
            break
          case 'MOVE':
            global['hr_empOrderMoveDet'].checkBeforeCancelPosting(item)
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            break
          case 'PROLONGATION':
            global['hr_empOrderProlongationDet'].checkBeforeCancelPosting(item)
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            break
          case 'RANK':
            restoreOldValues(item)
            break
          case 'MISSION':
          case 'MISSION_TRAINING':
            let changeOrders = UB.Repository('hr_empOrderChangemissionDet')
              .attrs(['orderID.description'])
              .where('missionOrderID', '=', order.ID)
              .where('orderID.orderState', '!=', 'PROJECT')
              .selectAsObject()
            if (changeOrders && changeOrders.length) {
              throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе. Існують наказ(и) {0} про зміни до цього наказу', changeOrders.map(x => x['orderID.description']).join(','))}>>>`)
            }
            changeOrders = UB.Repository('hr_empOrderCancelmissionDet')
              .attrs(['orderID.description'])
              .where('missionOrderID', '=', order.ID)
              .where('orderID.orderState', '!=', 'PROJECT')
              .selectAsObject()
            if (changeOrders && changeOrders.length) {
              throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе. Існують наказ(и) {0} про скасування цього наказу', changeOrders.map(x => x['orderID.description']).join(','))}>>>`)
            }
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            /* если добавили скриптом в старый наказ, то при откате не удалится */
            let empMissionID = UB.Repository('hr_employeeMission').attrs('ID').where('paraID', '=', item.ID).selectAsObject()
            if (empMissionID.length) {
              const store = UB.DataStore('hr_employeeMission')
              empMissionID.forEach(mItem => {
                store.run('delete', {
                  execParams: {
                    ID: mItem.ID
                  }
                })
              })
            }
            break
          case 'CANCELMISSION':
          case 'CHANGEMISSION':
            // cancel order
            if (item.empOrderType === 'CHANGEMISSION') {
              orderService.cancelMissionOrderItem(item)
            } else {
              restoreOldValues(item)
            }
            const repo = item.empOrderType === 'CHANGEMISSION'
              ? UB.Repository('hr_empOrderChangemissionDet')
              : UB.Repository('hr_empOrderCancelmissionDet')
            const cancelMissionItem = repo.attrs(['missionOrderID', 'missionOrderDetID', 'employeePositionID'])
              .where('ID', '=', item.ID).selectSingle()
            const missionOrder = UB.Repository('hr_empOrder')
              .attrs(['ID', 'orderNumber', 'orderDate', 'entryDate', 'periodID', 'empOrderType', 'staffTableID', 'staffTableOrgStructureID',
                'organizationID', 'orderNumberFull', 'description', 'masterOrganizationID', 'allowPosting'])
              .selectById(cancelMissionItem.missionOrderID)
            const missionOrderCurrentPeriod = periodService.getCurrentPeriod(missionOrder.organizationID)
            if (missionOrderCurrentPeriod && missionOrderCurrentPeriod.isBlock) {
              throw new UB.UBAbort(`<<<${UB.i18n('Скасування проведення тимчасово заборонено фахівцями з розрахунку заробітної плати ' + missionOrder.description)}>>>`)
            }
            const missionItems = UB.Repository('hr_empOrderDet')
              .attrs(orderService.getEmpOrderDetFields().concat(['changedValues']))
              .where('orderID', '=', cancelMissionItem.missionOrderID)
              .where('paraID', '=', cancelMissionItem.missionOrderDetID)
              .where('employeePositionID', '=', cancelMissionItem.employeePositionID)
              .selectAsObject()
            missionItems.forEach(mItem => {
              let saved = mItem['changedValues'] || { inserted: [], updated: [] }
              if (_.isString(saved)) {
                saved = JSON.parse(saved)
              }
              orderService.postMissionOrder(order, mItem, missionOrder.periodID, missionOrderCurrentPeriod, saved)
              saveOldValues(mItem, saved)
            })
            break
          case 'CWSRELAXDONOR':
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            break
          case 'CWSRELAXHD':
            global.hr_empOrderCwsrelaxhdDet.doCancelPosting(item)
            break
          case 'CWSHD':
            global.hr_empOrderCwshdDet.doCancelPosting(item)
            break
          case 'CWSHDGRP':
            if (item.mi_unityEntity === 'hr_empOrderCwshdgrpDet') {
              global.hr_empOrderCwshdgrpDet.doCancelPosting(item)
            }
            break
          case 'CWSRELAXHDGRP':
            if (item.mi_unityEntity === 'hr_empOrderCwsrelaxhdgrpDet') {
              global.hr_empOrderCwsrelaxhdgrpDet.doCancelPosting(item)
            }
            break
          case 'ADDSALARY':
            restoreOldValues(item)
            break
          case 'ADDSALARYGOV':
            restoreOldValues(item)
            break
          case 'CANCELSALARY':
            restoreOldValues(item)
            break
          case 'TRAINING':
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            break
          case 'PENALTY':
            restoreOldValues(item)
            break
          case 'CHGEMPLOYEE':
            restoreOldValues(item)
            break
          case 'VACATION':
          case 'VACATIONPROLONG':
            global.hr_empOrderVacationDet.doCancelPosting(item)
            break
          case 'VACATIONLONG': {
            global.hr_empOrderVacationlongDet.doCancelPosting(item, false)
            break
          }
          case 'VACATIONPROLONGL': {
            global.hr_empOrderVacationprolonglDet.doCancelPosting(item, false)
            break
          }
          case 'CERTIFICATION': {
            global.hr_empOrderCertificationDet.doCancelPosting(item, false)
            break
          }
          case 'VACATIONRET': {
            global.hr_empOrderVacationretDet.doCancelPosting(item, false)
            restoreOldValues(item)
            break
          }
          case 'VACATIONREVOKE': {
            timService.restoreTimeSheetByChangeOrder(item.orderID, order.organizationID)
            restoreOldValues(item)
            break
          }
          case 'VACRETPROLONG': {
            timService.restoreTimeSheetByChangeOrder(item.orderID, order.organizationID)
            timService.cancelTimeSheet(item.orderID)
            restoreOldValues(item)
            break
          }
          case 'VACATIONCOMP':
            global.hr_empOrderVacationcompDet.doCancelPosting(item, false)
            restoreOldValues(item)
            break
          case 'DOWNTIME':
            timService.removeTimeSheetChange(item.orderID)
            restoreOldValues(item)
            break
          case 'CWS':
            restoreOldValues(item)
            break
          case 'CANCELDISM':
            restoreOldValues(item)
            break
          case 'VACATIONAPSCHED':
            restoreOldValues(item)
            break
          case 'CHGPOSITION':
            global.hr_empOrderChgPositionEmpDet.checkBeforeCancelPosting(item)
            restoreOldValues(item)
            break
          case 'STAFFTABLEMOVE':
          case 'STAFFTABLEMOVE_TARIF':
            restoreOldValues(item)
            break
          case 'CANCELPARA':
            global[item.mi_unityEntity].doCancelPosting(item)
            break
          case 'ACTINGCLOSE':
            restoreOldValues(item)
            break
          case 'RECALL':
            timService.restoreTimeSheetByChangeOrder(execParams.ID, order.organizationID)
            break
          case 'TEMPSUSPEND':
            restoreOldValues(item)
            global.hr_empOrderTempsuspendDet.doCancelPosting(item, false)
            break
          case 'EXITDOWNTIME':
            timService.restoreTimeSheetByChangeOrder(execParams.ID, order.organizationID)
            restoreOldValues(item)
            break
          case 'COMBININGPOS':
            restoreOldValues(item)
            break
          case 'VEHICLEASSIGN':
            global.hr_empOrderVehicleassignDet.doCancelPosting(order)
            break
          case 'MEDEXAMINATION':
            global.hr_empOrderMedexaminationDet.doCancelPosting(order)
            break
          case 'INTERNSHIP':
            restoreOldValues(item)
            break
          case 'TEMPAVGPAY':
            restoreOldValues(item)
            break
          case 'AVERAGEPAY':
            employeeDet = UB.Repository('hr_empOrderEmployeeDet')
              .attrs('employeePositionID', 'employeePositionID.employeeNumberID')
              .where('paraID', '=', item.ID)
              .selectAsObject()
            if (employeeDet.length) {
              timService.cancelTimeSheet(order.ID, employeeDet.map(o => o['employeePositionID.employeeNumberID']))
            }
            restoreOldValues(item)
            break
          case 'CANCELAVGPAY':
            employeeDet = UB.Repository('hr_empOrderEmployeeDet')
              .attrs('employeePositionID', 'employeePositionID.employeeNumberID')
              .where('paraID', '=', item.ID)
              .selectAsObject()
            if (employeeDet.length) {
              timService.restoreTimeSheetByChangeOrder(order.ID, order.organizationID)
            }
            restoreOldValues(item)
            break
        }
      })
    }
  }
  /*
  const ds = UB.DataStore(__entityName)
  ds.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.ID,
      documentPrintable: null
    }
  })
  */
}

me.doCalculated = function (ctx) {
}

me.doUnCalculated = function (ctx) {
}

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!execParams.masterOrganizationID) {
    execParams.masterOrganizationID = execParams.organizationID
  }
  me.checkBeforeInsert(ctx)
  if (!execParams.periodID && !mParams.isImportOperation) {
    const orgID = UB.Repository('hr_organization').attrs('mi_data_id')
      .where('ID', '=', execParams.organizationID)
      .misc({ __mip_recordhistory_all: true })
      .limit(1)
      .select()
      .get(0)
    execParams.periodID = periodService.getCurrentPeriod(orgID).ID
    if (!execParams.periodID) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для організації не знайдено поточного періоду')}>>>`)
    }
  }
  execParams.orderClass = UB.Repository('hr_orderClass').attrs('ID').where('entityName', '=', __entityName).select().get(0)
  execParams.fieldLastChangeDate = new Date()
  if (execParams.document) {
    execParams.docLastChangeDate = new Date()
  }
  setDescription(ctx)
}

function afterInsert (ctx) {

}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.description && ctx.mParams.isImportOperation) {
    return
  }
  if (execParams.orderNumber !== undefined || execParams.orderDate !== undefined || execParams.dictEmpOrderIndexID !== undefined) {
    const parts = ebs.getCompositeAttributeValue(ctx, 'description', ['empOrderType.shortName', 'orderNumber', 'orderDate', 'dictEmpOrderIndexID.code'], '^', true).split('^')
    execParams.description = UB.i18n('Наказ про') + ' ' + parts[0].toLowerCase() + ' № ' + parts[1] + (parts[3] ? ('/' + parts[3]) : '') + ' ' + UB.i18n('від') + ' ' + (parts[2] || ' ? ')
    if (UB.App && UB.App.defaultLang === 'az') {
      execParams.description = cap(parts[0]) + ' ' + UB.i18n('Наказ про').toLowerCase() + ' № ' + parts[1] + (parts[3] ? ('/' + parts[3]) : '') + ' ' + (parts[2] || ' ? ')
    }
    execParams.orderNumberFull = `${parts[1]}${(parts[3] ? ('/' + parts[3]) : '')}`
  }
}

const noNeedChangeDocFields = ['ID', 'mi_modifyUser', 'mi_modifyDate', 'mi_createUser', 'mi_createDate', 'mi_deleteDate',
  'orderState', 'fieldLastChangeDate', 'docLastChangeDate']

function changedDocFields (execParams) {
  const fieldNames = Object.keys(execParams)
  return fieldNames.some(field => {
    return !noNeedChangeDocFields.includes(field)
  })
}

function beforeUpdate (ctx) {
  if (ctx.mParams.__internalUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.mParams.oldOrderState = instanceData.orderState
  if (execParams.orderNumber === null) {
    execParams.orderNumber = UB.i18n('(проєкт)')
  }

  if (execParams.organizationID || execParams.orderDate) {
    if (execParams.orderDate) {
      const orgID = instanceData.organizationID
      const orderDate = execParams.orderDate
      if (!UB.Repository('hr_organization')
        .attrs('ID')
        .where('mi_data_id', '=', orgID)
        .where('mi_dateFrom', '<=', orderDate)
        .where('mi_dateTo', '>=', orderDate)
        .misc({ __mip_recordhistory_all: true })
        .selectScalar()
      ) {
        throw new UB.UBAbort(`<<<${UB.i18n('Організація не дійсна на дату наказу')}>>>`)
      }
    }
  }
  if (execParams.isGroup) {
    if (!UB.Repository('hr_empOrderDet').attrs('ID').where('orderID', '=', execParams.ID).limit(1).select().eof) {
      throw new UB.UBAbort(`<<<${UB.i18n('У наказу є детальні записи, зміна виду "Груповий/Не груповий" неможлива ')}>>>`)
    }
  }
  setDescription(ctx)
  const date = new Date()
  if (changedDocFields(execParams)) {
    execParams.fieldLastChangeDate = date
  } else {
    delete execParams.fieldLastChangeDate
  }
  if (execParams.document) {
    execParams.docLastChangeDate = date
    execParams.documentPrintable = null
  } else {
    delete execParams.docLastChangeDate
  }
}

function getNotDefaultSaveObj (orderID) {
  return { orderID: orderID, inserted: [], updated: [] }
}

function saveNotDefaultOldValues (entityName, paraID, values) {
  saveOldValues({ mi_unityEntity: entityName, ID: paraID }, values)
}

function restoreNotDefaultOldValues (paraID) {
  const milSrvDet = UB.Repository('hr_empOrderDet')
    .attrs(['ID', 'orderID', 'changedValues'])
    .where('orderID', '=', paraID)
    .selectAsObject()
  milSrvDet.forEach(item => {
    restoreOldValues(item)
  })
}

/**
 * Зберегти параметри друкованої форми
 * @param {ubMethodParams} ctx
 * @param {object} ctx.reportSettings параметри друкованої форми
 */
me.saveReportSettings = function (ctx) {
  const mParams = ctx.mParams
  const entityName = mParams.entityName || __entityName
  const store = UB.DataStore(entityName)
  store.execSQL(`update ${entityName} set reportSettings = :reportSettings: where id = :ID:`, {
    ID: mParams.ID,
    reportSettings: mParams.reportSettings
  })
}

function afterUpdate (ctx) {
  if (ctx.mParams.__internalUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  const oldOrderState = ctx.mParams.oldOrderState
  if (execParams.isAppendix !== undefined) {
    UB.Repository('hr_empOrderDet')
      .attrs('ID', 'mi_unityEntity')
      .where('orderID', '=', execParams.ID)
      .selectAsObject().forEach(item => {
        if (global[item.mi_unityEntity].entity.attributes.isPrintAddon) {
          UB.DataStore(item.mi_unityEntity).run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              isPrintAddon: execParams.isAppendix
            }
          })
        } else if (global[item.mi_unityEntity].entity.attributes.isPrintAddition) {
          UB.DataStore(item.mi_unityEntity).run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: item.ID,
              isPrintAddition: execParams.isAppendix
            }
          })
        }
      })
  }
  if (ctx.mParams.skipOrderState) {
    return
  }
  if (['PROCESSED', 'ON_PROCESSING'].includes(execParams.orderState) && !ctx.mParams.skipOrderState) {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ в стані "Опрацьований", зміни заборонені')}>>>`)
  }
  if (execParams.organizationID) {
    me.deleteDetail(ctx)
  }
  switch (execParams.orderState) {
    case 'POSTED':
      if (orderValidator.validateOrderOnPost(execParams.ID)) {
        orderOperation[execParams.ID] = true
        me.doPosting(ctx)
        delete orderOperation[execParams.ID]
      }
      break
    case 'RECONCILED':
    case 'PROJECT':
      if (oldOrderState === 'POSTED') {
        if (orderValidator.validateOrderOnCancelPost(execParams.ID)) {
          orderOperation[execParams.ID] = true
          me.doCancelPosting(ctx)
          delete orderOperation[execParams.ID]
        }
      }
      break
    default:
      if (oldOrderState === 'POSTED') {
        if (execParams.reportSettings) {
          for (const param in execParams) {
            // eslint-disable-next-line no-prototype-builtins
            if (execParams.hasOwnProperty(param)) {
              if (param.indexOf('mi_') !== 0 && param !== 'ID' && param !== 'reportSettings') {
                delete execParams[param]
              }
            }
          }
        } else {
          throw new UB.UBAbort(`<<<${UB.i18n('Неможливо редагувати проведений наказ')}>>>`)
        }
      }
      break
  }
}

me.deleteDetail = function (ctx) {
  const detail = UB.Repository(__entityName + 'Det').attrs('ID', 'isGroup', 'mi_unityEntity')
    .where('orderID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  detail.forEach(item => {
    if (!detail.isGroup) {
      const ID = UB.Repository(item.mi_unityEntity).attrs('ID').where('ID', '=', item.ID).selectScalar()
      if (ID) { // Може вже видалилося
        UB.DataStore(item.mi_unityEntity).run('delete', {
          isOrderOperation: true,
          execParams: {
            ID: ID
          }
        })
      }
    }
  })
  detail.forEach(item => {
    const ID = UB.Repository(item.mi_unityEntity).attrs('ID').where('ID', '=', item.ID).selectScalar()
    if (ID) { // Може вже видалилося
      UB.DataStore(item.mi_unityEntity).run('delete', {
        isOrderOperation: true,
        execParams: {
          ID: ID
        }
      })
    }
  })
}

function afterDelete (ctx) {
  me.deleteDetail(ctx)
  const request = UB.DataStore('hr_request')
  UB.Repository('hr_request').attrs('ID').where('orderID', '=', ctx.mParams.execParams.ID).selectAsObject()
    .forEach(item => {
      request.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        execParams: {
          ID: item.ID,
          orderID: null
        }
      })
    })
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  switch (instanceData.get('orderState')) {
    case 'POSTED':
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити проведений наказ')}>>>`)
    case 'ON_RECONCILATION':
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити наказ на погодженні')}>>>`)
  }
}

/**
 * Отримання списку попереджень, що не зупиняють проведення та виводяться при проведенні наказу, відміні проведення
 * Попередження / діалоги при проведенні - також в /public/core/orderManager.getBeforePostPromise
 * @param {ubMethodParams} ctx
 * @param {Function} ctx.validatorFn
 * @param {Number} ctx.orderID наказ
 * @param {String} ctx.empOrderType Тип наказу
 * mParams.dateFrom
 */
me.getValidatorWarning = function (ctx) {
  const mParams = ctx.mParams
  mParams.result = ''
  let validatorFn = mParams.validatorFn
  const empOrderType = mParams.empOrderType
  const orderID = mParams.orderID
  const extra = mParams.extra || {}
  if (!validatorFn && empOrderType) {
    validatorFn = 'getValidateMessage' + empOrderType
  }
  if (validatorFn && orderValidator[validatorFn] && empOrderType && orderID) {
    const errorObj = orderValidator[validatorFn].call(null, empOrderType, orderID, extra)
    if (_.isArray(errorObj)) {
      mParams.resultType = 'text'
      mParams.result = errorObj && errorObj.length && errorObj.join('<br/>')
    } else if (errorObj) {
      let errors = errorObj.messages
      mParams.resultType = errorObj.type || 'text'
      mParams.result = errors && errors.length && errors.join('<br/>')
    }
  }
  return true
}

/**
 * Переведення наказу в стан на доопрацюванні передед редагуванням в процесі погодження
 * @param {ubMethodParams} ctx
 */
me.editOnReconciliation = function (ctx) {
  const orderID = ctx.mParams.orderID
  const order = UB.Repository(__entityName)
    .attrs('orderState')
    .selectById(orderID)
  if (order['orderState'] === 'ON_RECONCILATION') {
    if (!App.domainInfo.isEntityMethodsAccessible(__entityName, 'canEditOnReconciliation')) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ на погодженні, зміни заборонені')}>>>`)
    } else {
      reconciliationProcess.stopProcess(orderID, true)
      UB.DataStore(__entityName).run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: orderID,
          orderState: 'ON_COMPLETION'
        }
      })
      const storeHistory = UB.DataStore('hr_orderStateHistory')
      storeHistory.run('insert', {
        execParams: {
          orderID: orderID,
          userID: Session.userID,
          actionDateTime: dateService.unshiftDate(dateService.currentDateTime()),
          actionType: 'CHANGED',
          orderState: 'ON_RECONCILATION'
        }
      })
    }
  }
}

/**
 * Отримати дані для друкованих форм
 * @param {object} ctx
 * @param {string} ctx.code код форми
 * @param {string} ctx.reportCode код звіта
 * @param {number} ctx.instanceID особа
 * @param {number} ctx.tabNumID працівник
 * @param {Date} ctx.onDate на дату
 * @param {number} ctx.orgID організація
 * @return {object}
 */

me.docPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.docs = orderPrint.getDocx(mParams.params)
}

me.exchangeReview = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.params ? JSON.parse(mParams.params) : ''
  acquaintanceProcess.stopProcess(mParams.docID, params)
}

me.sendReview = function (ctx) {
  const mParams = ctx.mParams
  const params = mParams.params ? JSON.parse(mParams.params) : ''
  acquaintanceProcess.startAcquaintanceProcess(mParams.docID, params)
}

me.addStampData = function (ctx) {
  const settings = App.serverConfig.application.customSettings && App.serverConfig.application.customSettings.toPDFService
  if (!settings) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService" в конфігураційному файлі ubConfig')}>>>`)
  }
  if (!settings.URL) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService.URL" в конфігураційному файлі ubConfig')}>>>`)
  }
  if (!settings.apiKey) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService.apiKey" в конфігураційному файлі ubConfig')}>>>`)
  }

  const orderID = ctx.mParams.orderID
  const orderNumber = ctx.mParams.orderNumber || ''
  const orderDate = ctx.mParams.orderDate ? dateService.shiftDate(ctx.mParams.orderDate) : null

  const printSettings = UB.Repository('ac_docPrintSettings')
    .attrs('coordinatY', 'coordinatXNumber', 'coordinatXDate', 'fontSize', 'dateFormat')
    .where('organizationID', '=', ctx.mParams.organizationID)
    .limit(1)
    .selectSingle() || {}

  if (!printSettings.coordinatY) {
    printSettings.coordinatY = 20
  }
  if (!printSettings.coordinatXNumber) {
    printSettings.coordinatXNumber = 190
  }
  if (!printSettings.coordinatXDate) {
    printSettings.coordinatXDate = 20
  }
  if (!printSettings.fontSize) {
    printSettings.fontSize = 12
  }
  if (!printSettings.dateFormat) {
    printSettings.dateFormat = '1'
  }

  const { addNewFileItem, copyBlob } = require('@unitybase/stamp/generatorStamp/helpers/helpersDoc')
  const { getStampedDocument } = require('@unitybase/stamp/generatorStamp/helpers/funcsStampDoc')
  // const { buildDfxStampTemplateImages, getDfxStampTemplateProps } = require('@unitybase/dfx-stamp/generatorStamp/helpers/resolveTemplate')
  const { getPagesInfoDocument } = require('@unitybase/stamp/generatorStamp/helpers/helpersPDF')
  // const { calculateImagePosition } = require('@unitybase/stamp/generatorStamp/helpers/helpersPos')
  const { buildDfxMark } = require('@unitybase/dfx-stamp/generatorStamp/helpers/buildDfxMark')
  const { buildStampImage } = require('@unitybase/stamp/generatorStamp/builder')
  const { ObjectAssignDeep } = require('@unitybase/stamp/generatorStamp/helpers/helpersObj')
  const { StampImage } = require('@unitybase/stamp/public/cs-shared/generatorStampTypes')

  const props = {
    page: {
      pageNum: 1,
      useBlank: false,
      pagePosition: 'bcppTopLeft'
    },
    text: {
      fontSize: printSettings.fontSize,
      fillStyle: '#021691'
    }
  }
  const entityItemDocument = {
    attributeName: 'document',
    entityName: 'hr_empOrder',
    instanceID: orderID
  }

  const pagesInfoDoc = getPagesInfoDocument({
    entityItemDocument
  })

  const stampImagesList = []

  const fixPosition = function (obj) {
    if (obj && obj.addBlock && obj.addBlock.commands) {
      obj.addBlock.commands.forEach(o => {
        o.y -= 15
      })
    }
  }

  if (orderNumber) {
    const propsNum = Object.assign({}, props)
    propsNum.text.value = '№ ' + String(orderNumber)
    const jsonObjectNum = buildDfxMark(propsNum)
    const stampImageNum = buildStampImage(jsonObjectNum)
    fixPosition(stampImageNum)
    stampImageNum.pageNum = propsNum.page.pageNum || 1
    stampImageNum.position = calcStampPosition(printSettings.coordinatXNumber, printSettings.coordinatY, stampImageNum, pagesInfoDoc)

    const stampImageRect1 = new StampImage()
    ObjectAssignDeep(stampImageRect1, stampImageNum)
    const rectWidth = 595 - stampImageRect1.position.X + 10
    stampImageRect1.addBlock.commands = [{
      type: 'rect',
      fillStyle: '#FFFFFF',
      maxWidth: rectWidth,
      maxHeight: 24
    }]
    stampImageRect1.addBlock.imgWidth = rectWidth
    stampImageRect1.addBlock.imgHeight = 24
    stampImageRect1.size.width = rectWidth
    stampImageRect1.size.height = 24
    stampImageRect1.position.X -= 2
    stampImageRect1.position.Y -= 3
    delete stampImageRect1.commands

    stampImagesList.push(stampImageRect1)
    stampImagesList.push(stampImageNum)
  }

  if (orderDate) {
    const propsDate = Object.assign({}, props)
    propsDate.text.value = printSettings.dateFormat === '2' ? dateService.getStringFormatDate(dateService.shiftDate(orderDate)) : dateService.formatDate(dateService.shiftDate(orderDate))
    const jsonObjectDate = buildDfxMark(propsDate)
    const stampImageDate = buildStampImage(jsonObjectDate)
    fixPosition(stampImageDate)
    stampImageDate.pageNum = propsDate.page.pageNum || 1
    stampImageDate.position = calcStampPosition(printSettings.coordinatXDate, printSettings.coordinatY, stampImageDate, pagesInfoDoc)

    const stampImageRect2 = new StampImage()
    ObjectAssignDeep(stampImageRect2, stampImageDate)
    const rectWidth2 = 135
    stampImageRect2.addBlock.commands = [{
      type: 'rect',
      fillStyle: '#FFFFFF',
      maxWidth: rectWidth2,
      maxHeight: 24
    }]
    stampImageRect2.addBlock.imgWidth = rectWidth2
    stampImageRect2.addBlock.imgHeight = 24
    stampImageRect2.size.width = rectWidth2
    stampImageRect2.size.height = 24
    stampImageRect2.position.Y -= 3
    stampImageRect2.position.X -= 2
    delete stampImageRect2.commands

    stampImagesList.push(stampImageRect2)
    stampImagesList.push(stampImageDate)
  }

  if (stampImagesList.length) {
    const tmpFileItem = addNewFileItem()
    let tmpFileItemValue = copyBlob({
      entityItemSource: entityItemDocument,
      entityItemDest: tmpFileItem
    })

    if (!tmpFileItemValue.attributeValue) {
      throw new UB.UBAbort(`<<<${UB.i18n('source pdf document not exist')}>>>`)
    }

    const respDoc = getStampedDocument({
      entityItemDocument: tmpFileItemValue,
      stampImages: stampImagesList
    })
    tmpFileItemValue = respDoc.entityItemValue

    const entityItemDocumentNew = copyBlob({
      entityItemSource: tmpFileItemValue,
      entityItemDest: {
        attributeName: 'documentPrintable',
        entityName: 'hr_empOrder',
        instanceID: orderID
      }
    })

    const params = {
      ID: orderID,
      documentPrintable: entityItemDocumentNew.attributeValue
    }
    if (orderNumber) {
      params.orderNumber = orderNumber
    }
    if (orderDate) {
      params.orderDate = orderDate
    }
    const ds = UB.DataStore(__entityName)
    ds.run('update', {
      __skipOptimisticLock: true,
      skipOrderState: true,
      execParams: params
    })
  }
}

function calcStampPosition (X, Y, stampImage, pagesInfoDoc) {
  const pageHeight = pagesInfoDoc.pagesInfo[0] ? pagesInfoDoc.pagesInfo[0].height : 842
  // const pageWidth = pagesInfoDoc.pagesInfo[0] || 595
  const pixelPerSm = 28 + 1.0 / 3.0
  return {
    X: Math.round(X / 10 * pixelPerSm),
    Y: pageHeight - Math.round(Y / 10 * pixelPerSm) - stampImage.size.height
  }
}

function geImagePosition (pageInfo, position, imageObj) {
  if (!imageObj) return { X: 0, Y: 0 }
  let offsetX
  let offsetY
  const marginXLeft = 75
  const marginXRight = 20
  const marginY = 15

  const pageWidth = pageInfo.pagesInfo[0] ? pageInfo.pagesInfo[0].width : 595
  const pageHeight = pageInfo.pagesInfo[0] ? pageInfo.pagesInfo[0].height : 842
  const imageWidth = imageObj && imageObj.size ? imageObj.size.width : 0
  const imageHeight = imageObj && imageObj.size ? imageObj.size.height : 0

  switch (position) {
    case 'bcppTopLeft':
      offsetX = marginXLeft
      offsetY = Math.round(pageHeight - imageHeight - marginY)
      break
    case 'bcppTopCenter':
      offsetX = Math.round((pageWidth / 2) - (imageWidth / 2))
      offsetY = Math.round(pageHeight - imageHeight - marginY)
      break
    case 'bcppTopRight':
      offsetX = Math.round(pageWidth - imageWidth - marginXRight)
      offsetY = Math.round(pageHeight - imageHeight - marginY)
      break
    case 'bcppBottomLeft':
      offsetX = marginXLeft
      offsetY = marginY
      break
    case 'bcppBottomCenter':
      offsetX = Math.round((pageWidth / 2) - (imageWidth / 2))
      offsetY = marginY
      break
    case 'bcppBottomRight':
    default:
      offsetX = Math.round(pageWidth - imageWidth - marginXRight)
      offsetY = marginY
  }
  return { X: offsetX, Y: offsetY }
}

me.getDocumentWithStampData = function (ctx) {
  const settings = App.serverConfig.application.customSettings && App.serverConfig.application.customSettings.toPDFService
  if (!settings) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService" в конфігураційному файлі ubConfig')}>>>`)
  }
  if (!settings.URL) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService.URL" в конфігураційному файлі ubConfig')}>>>`)
  }
  if (!settings.apiKey) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування "customSettings.toPDFService.apiKey" в конфігураційному файлі ubConfig')}>>>`)
  }

  const orderID = ctx.mParams.orderID
  const fieldName = ctx.mParams.fieldName || 'document'
  const orderInfo = `${ctx.mParams.orderNumber ? '№' + ctx.mParams.orderNumber : ''}${ctx.mParams.orderNumber && ctx.mParams.orderDate ? ' ' : ''}${ctx.mParams.orderDate ? UB.i18n('від') + ' ' + dateService.formatDate(dateService.shiftDate(ctx.mParams.orderDate)) : null}`

  const organizationName = UB.Repository('hr_organization')
    .attrs(['name'])
    .where('mi_data_id', '=', ctx.mParams.organizationID)
    .where('state', '=', 'ACTIVE')
    .selectScalar() || ''

  const QRInfo = [organizationName, ctx.mParams.signerInfo].filter(Boolean).join('\n')

  const { addNewFileItem, copyBlob, getEntityItemContent } = require('@unitybase/stamp/generatorStamp/helpers/helpersDoc')
  const { getStampedDocument } = require('@unitybase/stamp/generatorStamp/helpers/funcsStampDoc')
  const { getPagesInfoDocument } = require('@unitybase/stamp/generatorStamp/helpers/helpersPDF')
  const { buildDfxQRCode } = require('@unitybase/dfx-stamp/generatorStamp/helpers/buildDfxQRCode')
  const { buildDfxBarCode } = require('@unitybase/dfx-stamp/generatorStamp/helpers/buildDfxBarCode')
  const { buildStampImage } = require('@unitybase/stamp/generatorStamp/builder')

  const entityItemDocument = {
    attributeName: fieldName,
    entityName: 'hr_empOrder',
    instanceID: orderID
  }

  let pagesInfoDoc
  try {
    pagesInfoDoc = getPagesInfoDocument({
      entityItemDocument
    })
  } catch (e) {
    console.log('Error on get information about document (getPagesInfoDocument): ' + e)
    return
  }

  const stampImagesList = []

  // формируем данные для нанесения на ПДФ
  if (QRInfo) {
    const propsQR = {
      page: {
        pageNum: 1,
        useBlank: false,
        pagePosition: 'bcppTopLeft'
      },
      text: {
        fillStyle: '#010101',
        fontSize: 10,
        maxWidth: 350,
        value: QRInfo,
        textPosition: 'right',
        textMargin: 10
      },
      code: {
        value: ctx.mParams.url,
        qrCodeWidth: 16,
        qrCodeHeight: 16
      }
    }

    const jsonObject = buildDfxQRCode(propsQR)
    const stampImage = buildStampImage(jsonObject)
    stampImage.pageNum = propsQR.page.pageNum || 1

    stampImage.position = geImagePosition(pagesInfoDoc, 'bcppBottomLeft', stampImage)
    stampImagesList.push(stampImage)
  }

  if (orderInfo) {
    const propsBC = {
      page: {
        pageNum: 1,
        useBlank: false,
        pagePosition: 'bcppTopLeft'
      },
      text: {
        fillStyle: '#010101',
        fontSize: 10,
        value: orderInfo,
        align: 'taCenter',
        textPosition: 'bottom',
        maxWidth: 190
      },
      code: {
        value: orderID.toString(),
        align: 'taCenter'
      }
    }

    const jsonObject = buildDfxBarCode(propsBC)
    const stampImage = buildStampImage(jsonObject)
    stampImage.pageNum = propsBC.page.pageNum || 1

    stampImage.position = geImagePosition(pagesInfoDoc, 'bcppBottomRight', stampImage)
    stampImagesList.push(stampImage)
  }

  // копия текущего ПДФ
  const tmpFileItem = addNewFileItem()
  let tmpFileItemValue = copyBlob({
    entityItemSource: entityItemDocument,
    entityItemDest: tmpFileItem
  })

  if (!tmpFileItemValue.attributeValue) {
    return
    // throw new UB.UBAbort(`<<<${UB.i18n('source pdf document not exist')}>>>`)
  }

  // добавляем отметки
  const respDoc = getStampedDocument({
    entityItemDocument: tmpFileItemValue,
    stampImages: stampImagesList
  })
  tmpFileItemValue = respDoc.entityItemValue

  // получаем содержимое нового ПДФ с нанесенными отметками
  const DocumentContent = getEntityItemContent(tmpFileItemValue)

  // возвращаем содержимое нового ПДФ, чтобы показать его для печати
  ctx.mParams.fileContent = DocumentContent ? JSON.stringify(DocumentContent.content) : undefined
}
