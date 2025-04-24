const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const orderValidator = require('../HR/modules/orderValidator')
const employeeService = require('../HR/modules/employeeService')
const periodService = require('../HR/modules/periodService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const Session = require('@unitybase/ub').Session

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('viewPrintForm')
me.entity.addMethod('getCurrentTime')
me.entity.addMethod('checkVacationCrossPeriod')
me.entity.addMethod('checkRequestCrossPeriod')
me.entity.addMethod('checkVacDaydiff')
me.entity.addMethod('checkMainPart')
me.entity.addMethod('checkDnotDays')
me.entity.addMethod('checkImpartibleVac')
me.entity.addMethod('checkBountyInYear')
me.entity.addMethod('showFromEmployeeTabs')
me.entity.addMethod('showSubordinatesInEmpTabs')
me.entity.addMethod('getSignatoriesList')

me.showFromEmployeeTabs = () => {}
me.showSubordinatesInEmpTabs = () => {}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const trackedStatuses = ['AGREED', 'REJECTED', 'COMPLITED']
  if (execParams.requestState) {
    if (execParams.requestState !== instanceData.requestState) {
      if (trackedStatuses.includes(execParams.requestState)) {
        execParams.unread = true
      }
    }
  }
  if (execParams.orderState) {
    switch (execParams.orderState) {
      case 'PROCESSED':
        execParams.requestState = 'COMPLITED'
        break
      case 'REJECTED':
      case 'RETURNED_FROM_RECONCILATION':
      case 'ON_COMPLETION':
        execParams.requestState = 'REJECTED'
        break
      case 'ON_RECONCILATION':
        execParams.requestState = 'INPROGRESS'
        break
      case 'RECONCILED':
        execParams.requestState = 'AGREED'
        break
      case 'PROJECT':
        execParams.requestState = 'NEW'
        break
    }
  }
  if (execParams.requestState === 'REJECTED' && execParams.requestState !== instanceData.requestState) return
  calcDayCount(ctx)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.requestState) {
    if (execParams.requestState === 'AGREED') {
      doPostingRequest(ctx)
    }
    if (execParams.requestState === 'REJECTED') {
      doCancelPostingRequest(ctx)
    }
    const storeHistory = UB.DataStore('hr_orderStateHistory')
    storeHistory.run('insert', {
      execParams: {
        orderID: execParams.ID,
        userID: Session.userID,
        actionDateTime: dateService.unshiftDate(dateService.currentDateTime()),
        actionType: 'CHANGED',
        orderState: execParams.requestState
      }
    })
    storeHistory.freeNative()
  }
}

function doPostingRequest (ctx) {
  const execParams = ctx.mParams.execParams
  const request = UB.Repository('hr_request')
    .attrs(['dictRequestKindID', 'dictRequestKindID.procRule', 'dictRequestKindID.dictTimeCostID', 'employeeNumberID',
      'dateFrom', 'dateTo', 'organizationID'])
    .selectById(execParams.ID)
  switch (request['dictRequestKindID.procRule']) {
    case 'TIMESHEET': {
      const timeSheetParams = []
      if (!request.dateFrom || !request.dateTo) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не заповнено період!')}>>>`)
      }
      if (!request['dictRequestKindID.dictTimeCostID']) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не заповнено елемент обліку робочого часу!')}>>>`)
      }
      const currentPeriod = periodService.getCurrentPeriod(request.organizationID)
      let date = dateService.shiftDate(request.dateFrom)
      const dateTo = dateService.shiftDate(request.dateTo)
      while (date <= dateTo) {
        timeSheetParams.push({
          orderID: execParams.ID,
          entityName: 'hr_request',
          employeeNumberID: request.employeeNumberID,
          periodID: currentPeriod.ID,
          dateWork: date,
          factTimeCostID: request['dictRequestKindID.dictTimeCostID'],
          factHour: 0
        })
        date = dateService.nextDay(date)
      }
      timService.setTimeSheet(timeSheetParams)
      break
    }
  }
}

function doCancelPostingRequest (ctx) {
  const execParams = ctx.mParams.execParams
  const request = UB.Repository('hr_request')
    .attrs(['dictRequestKindID', 'dictRequestKindID.procRule', 'dictRequestKindID.dictTimeCostID', 'employeeNumberID',
      'dateFrom', 'dateTo', 'organizationID'])
    .selectById(execParams.ID)
  switch (request['dictRequestKindID.procRule']) {
    case 'TIMESHEET': {
      const currentPeriod = periodService.getCurrentPeriod(request.organizationID)
      timService.cancelTimeSheetByOrder(execParams.ID, execParams.ID, currentPeriod, request.dateFrom, request.dateTo)
      break
    }
  }
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const { execParams = {} } = ctx.mParams

  if (((!execParams.requestNumber || execParams.requestNumber === '---') && !instanceData.requestNumber) ||
    (execParams.requestNumber === null || execParams.requestNumber === '---')) {
    execParams.requestNumber = orderService.getOrderNum(me.entity.name, execParams.orderDate, execParams.organizationID)
  }
  execParams.description = `${UB.i18n('Заява')} № ${execParams.requestNumber}`
  calcDayCount(ctx)
}

function calcDayCount (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo || instanceData.dateTo)
  // const dictVacationKindID = execParams.vacationKindID || instanceData.vacationKindID
  if (execParams.dateFrom || execParams.dateTo) {
    execParams.dayCount = timService.getCalendarDays(dateFrom, dateTo /*, dictVacationKindID */)
  }
}

me.viewPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.content = JSON.stringify({ instanceID: mParams.instanceID })
}

/* Перевірка щоб у поточному періоді права на відпустку було використано нерозривну частину 14 днів
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {boolean} ctx.mParams.execParams.useInextricablePart використати нерозривну частину відпустки
 * @return {string} текст помилки
 */
me.checkMainPart = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  let useInextricablePart // = execParams.useInextricablePart // UBHR-12406 чек useInextricablePart прибрано з заяви
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo) && dayCount) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['code', 'isDay'])
      .selectById(dictVacationKindID)
    const dictVacationKindCode = dictVacationKindData.code
    const dictVacationKindIsDay = dictVacationKindData.isDay
    const orgID = UB.Repository('hr_employeeNumberS')
      .attrs(['orgID'])
      .where('ID', '=', employeeNumberID)
      .selectScalar()
    let addInfo = { upToDate: dateTo }
    global.hr_empVacationPlan.getAvailableVacationDays(employeeNumberID, orgID, dateFrom, dictVacationKindID, addInfo)
    if (dictVacationKindIsDay) {
      if (dictVacationKindCode.startsWith('dYear')) {
        let checkMainPartMsg = orderValidator.checkMainPart(employeeNumberID, dateFrom, dateTo, dayCount, useInextricablePart, addInfo)
        if (checkMainPartMsg) {
          msg = checkMainPartMsg + ' або вказати меншу тривалість відпустки. Змініть тривалість відпустки у заяві.'
        }
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка по табелю, щоб не було неявок в періоді відпустки, що не дозволено перетинати
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @return {string} текст помилки
 */
me.checkVacationCrossPeriod = function (ctx) {
  global['hr_empOrderVacationListDet'].checkVacationCrossTimeSheet(ctx)
  return true
}

/* Перевірка по табелю, щоб не було неявок в періоді відпустки, що не дозволено перетинати
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.ID ID поточної заявки
 * @return {string} текст помилки
 */
me.checkRequestCrossPeriod = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const ID = execParams.ID || 0
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  let msg
  if (employeeNumberID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    let vacReq = UB.Repository('hr_request')
      .attrs('dateFrom', 'dateTo')
      .where('employeeNumberID', '=', employeeNumberID)
      .where('ID', '!=', ID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('requestState', 'notIn', ['NEW', 'REJECTED'])
      .selectSingle()
    if (vacReq) {
      msg = UB.i18n(`По даному працівнику існує інша заявка на відпустку з {0} р.`, dateService.formatDate(vacReq.dateFrom)) +
        UB.i18n(` по {0} р., що перетинається з даною заявкою`, dateService.formatDate(vacReq.dateTo))
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка, щоб вистачало доступних днів відпустки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkVacDaydiff = function (ctx) {
  const mParams = ctx.mParams
  const execParams = ctx.mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo) && dayCount) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['name', 'isDay'])
      .selectById(dictVacationKindID)
    const dictVacationKindName = dictVacationKindData.name
    const dictVacationKindIsDay = dictVacationKindData.isDay
    if (dictVacationKindIsDay) {
      const orgID = UB.Repository('hr_employeeNumberS')
        .attrs(['orgID'])
        .where('ID', '=', employeeNumberID)
        .selectScalar()
      const mainPosition = employeeService.getMainPosition({
        orgID: orgID,
        employeeNumberID: employeeNumberID,
        dateFrom: dateFrom,
        dateTo: dateTo,
        fields: ['employeeNumberID']
      })
      let mainEmpNumID = (mainPosition && mainPosition.employeeNumberID) || employeeNumberID
      let addInfo = { upToDate: dateTo }
      global['hr_empVacationPlan'].getAvailableVacationDays(mainEmpNumID, orgID, dateFrom, dictVacationKindID, addInfo)
      const totalDaysDiff = addInfo.totalDaysDiffNoCheck
      if (totalDaysDiff < dayCount) {
        msg = UB.i18n(`Кількість доступних днів відпустки {0} = {1}. Потрібно зменшити тривалість відпустки у заяві.`, dictVacationKindName, totalDaysDiff)
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка для відпустки без збереження, щоб кількість днів за поточний рік (на дату початку відпустки) була <= 15
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkDnotDays = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo) && dayCount) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['code'])
      .selectById(dictVacationKindID)
    const dictVacationKindCode = dictVacationKindData.code
    if (dictVacationKindCode.startsWith('dNot')) {
      const orgID = UB.Repository('hr_employeeNumberS')
        .attrs(['orgID'])
        .where('ID', '=', employeeNumberID)
        .selectScalar()
      const currYear = dateFrom.getFullYear()
      let addInfo = { upToDate: dateTo, currYear: currYear }
      global.hr_empVacationPlan.getAvailableVacationDays(employeeNumberID, orgID, dateFrom, dictVacationKindID, addInfo)
      const currYearDaysFact = addInfo.currYearDaysFact
      const dNotVacDays = timService.CONSTANTS.dNotVacDays
      let currYearDaysCount = currYearDaysFact + dayCount
      if (currYearDaysCount > dNotVacDays) {
        msg = UB.i18n(`Кількість днів відпустки без збереження заробітної плати за рік не повинна перевищувати {0} календарних днів. `, dNotVacDays) +
          UB.i18n(`За {0} рік вже було надано {1} днів відпустки. Потрібно зменшити тривалість відпустки у заяві.`, currYear, currYearDaysFact)
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток"
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkImpartibleVac = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dayCount) {
    const dictVacationKindData = UB.Repository('hr_dictVacationKind')
      .attrs(['isDay'])
      .selectById(dictVacationKindID)
    const dictVacationKindIsDay = dictVacationKindData.isDay
    if (dictVacationKindIsDay) {
      const orgID = UB.Repository('hr_employeeNumberS')
        .attrs(['orgID'])
        .where('ID', '=', employeeNumberID)
        .selectScalar()
      const mainPosition = employeeService.getMainPosition({
        orgID: orgID,
        employeeNumberID: employeeNumberID,
        dateFrom: dateFrom,
        dateTo: dateTo,
        fields: ['employeeNumberID']
      })
      let mainEmpNumID = (mainPosition && mainPosition.employeeNumberID) || employeeNumberID
      let addInfo = { upToDate: dateTo }
      global['hr_empVacationPlan'].getAvailableVacationDays(mainEmpNumID, orgID, dateFrom, dictVacationKindID, addInfo)
      const totalDaysDiff = addInfo.totalDaysDiffNoCheck || 0
      msg = orderValidator.checkImpartibleVac(employeeNumberID, dictVacationKindID, dateFrom, dayCount, 0, totalDaysDiff)
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка, щоб у році на який припадає початок відпустки за заявою працівнику ще не надавали матеріальну допомогу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @return {string} текст помилки
 */
me.checkBountyInYear = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  let msg
  if (employeeNumberID && dateService.isValid(dateFrom)) {
    const dateFromYearBegin = dateService.firstDayOfYear(dateFrom)
    const dateFromYearEnd = dateService.lastDayOfYear(dateFrom)
    const moneyHelpYear = UB.Repository('hr_employeeVacation')
      .attrs(['ID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '>=', dateFromYearBegin)
      .where('dateFrom', '<=', dateFromYearEnd)
      .where('isMoneyHelp', '=', 1)
      .selectSingle()
    if (moneyHelpYear) {
      msg = UB.i18n(`За {0} рік вже була надана матеріальна допомога`, dateFrom.getFullYear())
    }
  }
  mParams.msg = msg || ''
  return true
}

me.getCurrentTime = function (ctx) {
  ctx.mParams.currentTime = new Date()
  ctx.mParams.currentStrTime = dateService.formatDate(new Date(), 'dd.mm.yyyy hh:nn')
}

me.getSignatoriesList = function (ctx) {
  const dictRequestKindID = ctx.mParams.dictRequestKindID
  const onDate = ctx.mParams.onDate ? dateService.shiftDate(ctx.mParams.onDate) : dateService.currentDate()
  const orgID = ctx.mParams.orgID
  const employeeNumberID = ctx.mParams.employeeNumberID
  const sqlDialect = entityBaseService.getSQLDialect()

  let signatoriesList = []

  if (dictRequestKindID) {
    const recStage = UB.Repository('hr_dictRequestRecStage')
      .attrs('itemIdx', 'stageKind', 'appRoute', 'respPositionID', 'respEmployeePositionID')
      .where('dictRequestKindID', '=', dictRequestKindID)
      .orderBy('itemIdx')
      .selectAsObject()
    let emp
    recStage.forEach(item => {
      switch (item.appRoute) {
        case 'DEPARTMENT':
          emp = UB.Repository('hr_employeePositionS')
            .attrs('ID', 'departmentID')
            .where('employeeNumberID', '=', employeeNumberID)
            .orderBy('dateFrom', 'desc')
            .limit(1)
            .selectSingle()
          if (emp && emp.departmentID) {
            const positionChiefID = UB.Repository('hr_department')
              .attrs('positionChiefID')
              .where('mi_data_id', '=', emp.departmentID)
              .where('state', '=', 'ACTIVE')
              .orderBy('mi_dateTo', 'DESC')
              .selectScalar()
            if (positionChiefID) {
              emp = UB.Repository('hr_employeePositionS')
                .attrs('ID')
                .where('positionID', '=', positionChiefID)
                .orderBy('dateFrom', 'desc')
                .limit(1)
                .selectSingle()
              if (emp) {
                signatoriesList.push({
                  itemIdx: item.itemIdx,
                  stageKind: item.stageKind,
                  recipientID: emp.ID
                })
              }
            }
          }
          break
        case 'SELF_STRUCT':
          emp = UB.Repository('hr_employeePositionS')
            .attrs('ID', 'departmentID')
            .where('employeeNumberID', '=', employeeNumberID)
            .orderBy('dateFrom', 'desc')
            .limit(1)
            .selectSingle()
          if (emp && emp.departmentID) {
            const store = UB.DataStore('hr_department')
            store.runSQL(`SELECT ${sqlDialect.top} d.mi_data_id 
              from hr_department d 
              where d.orgID = :orgID: 
                  and d.parentUnitID = :orgID: 
                  and state = 'ACTIVE' and ( 
                      select ${sqlDialect.top} dep3.mi_treePath  
                      from hr_department dep3  
                      where dep3.mi_data_id = :departmentID: 
                          and dep3.state = 'ACTIVE'  
                          order by dep3.mi_dateTo desc ${sqlDialect.limit}
                  ) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}`
            , {
              orgID,
              departmentID: emp.departmentID
            })
            const selfStructDep = store.getAsJsObject()[0]
            if (selfStructDep) {
              const positionChiefID = UB.Repository('hr_department')
                .attrs('positionChiefID')
                .where('mi_data_id', '=', selfStructDep.mi_data_id)
                .where('state', '=', 'ACTIVE')
                .orderBy('mi_dateTo', 'DESC')
                .selectScalar()
              if (positionChiefID) {
                emp = UB.Repository('hr_employeePositionS')
                  .attrs('ID')
                  .where('positionID', '=', positionChiefID)
                  .orderBy('dateFrom', 'desc')
                  .limit(1)
                  .selectSingle()
                if (emp) {
                  signatoriesList.push({
                    itemIdx: item.itemIdx,
                    stageKind: item.stageKind,
                    recipientID: emp.ID
                  })
                }
              }
            }
          }
          break
        case 'GROUP':
          const chiefID = UB.Repository('hr_employeeGroupDet')
            .attrs('employeeGroupID.chiefID')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', onDate)
            .where('dateTo', '>=', onDate)
            .selectScalar()
          if (chiefID) {
            const emp = UB.Repository('hr_employeePositionS')
              .attrs('ID')
              .where('employeeNumberID', '=', chiefID)
              .orderBy('dateFrom', 'desc')
              .limit(1)
              .selectSingle()
            if (emp) {
              signatoriesList.push({
                itemIdx: item.itemIdx,
                stageKind: item.stageKind,
                recipientID: emp.ID
              })
            }
          }
          break
        case 'ORG':
          if (orgID) {
            const mainChiefPos = UB.Repository('hr_orgRespPosition')
              .attrs('positionID')
              .where('organizationID', '=', orgID)
              .where('respPosition', '=', 'mainChief')
              .where('dateFrom', '<=', onDate)
              .where('dateTo', '>=', onDate)
              .limit(1)
              .selectSingle()
            if (mainChiefPos) {
              const mainChief = UB.Repository('hr_employeePositionS')
                .attrs('ID')
                .where('positionID', '=', mainChiefPos.positionID)
                .where('dateFrom', '<=', onDate)
                .where('dateTo', '>=', onDate)
                .limit(1)
                .selectSingle()
              if (mainChief) {
                signatoriesList.push({
                  itemIdx: item.itemIdx,
                  stageKind: item.stageKind,
                  recipientID: mainChief.ID
                })
              }
            }
          }
          break
        case 'POSITION':
          if (item.respPositionID) {
            const positionID = UB.Repository('hr_position')
              .attrs('mi_data_id')
              .misc({ __mip_recordhistory_all: true })
              .where('ID', '=', item.respPositionID)
              .selectScalar()
            if (positionID) {
              UB.Repository('hr_employeePositionS')
                .attrs('ID')
                .where('positionID', '=', positionID)
                .where('dateFrom', '<=', onDate)
                .where('dateTo', '>=', onDate)
                .selectAsObject()
                .forEach(emp => {
                  signatoriesList.push({
                    itemIdx: item.itemIdx,
                    stageKind: item.stageKind,
                    recipientID: emp.ID
                  })
                })
            }
          }
          break
        case 'EMPLOYEE':
          if (item.respEmployeePositionID) {
            signatoriesList.push({
              itemIdx: item.itemIdx,
              stageKind: item.stageKind,
              recipientID: item.respEmployeePositionID
            })
          }
          break
      }
    })
  }
  const resultList = []
  signatoriesList.sort((a, b) => b.itemIdx - a.itemIdx)
  signatoriesList.forEach(item => {
    if (!resultList.find(o => o.recipientID === item.recipientID)) {
      resultList.push({
        itemIdx: item.itemIdx,
        stageKind: item.stageKind,
        recipientID: item.recipientID
      })
    }
  })
  resultList.sort((a, b) => a.itemIdx - b.itemIdx)
  ctx.mParams.signatoriesList = JSON.stringify(resultList)
}
