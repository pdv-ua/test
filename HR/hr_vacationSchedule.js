const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const orderValidator = require('../HR/modules/orderValidator')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('checkDayCount')
me.entity.addMethod('checkDChildDayCount')
me.entity.addMethod('checkContiniousVacation')
me.entity.addMethod('checkVacationCrossPeriod')
me.entity.addMethod('checkYearDays')
me.entity.addMethod('checkVacWithBounty')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const employeeNumberID = execParams.employeeNumberID || instanceData.employeeNumberID
  if (employeeNumberID) {
    let empDesc = UB.Repository('hr_employeeNumberS')
      .attrs('description')
      .where('ID', '=', employeeNumberID)
      .selectScalar()
    if (empDesc) {
      execParams.personDescription = empDesc
    }
  }
}

function beforeInsert (ctx) {
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (instanceData.state !== 'NEW') {
    execParams.state = 'EDIT'
  }
}

/* Перевірка на перевищення доступних днів права на відпустку
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {string} ctx.mParams.execParams.dateFrom дата початку
 * @param {number} ctx.mParams.execParams.dateTo дата закінчення
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {number} ctx.mParams.execParams.orgID організація
 * @param {boolean} ctx.mParams.execParams.isNewVacation тільки залишки нового періоду
 * @return {string} текст помилки
 */
me.checkDayCount = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  const orgID = execParams.orgID
  const isNewVacation = execParams.isNewVacation

  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    let addInfo = {}
    if (isNewVacation) {
      const vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs(['ID'])
        .where('dateFrom', '<=', dateFrom)
        .where('dateTo', '>=', dateFrom)
        .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
        .where('empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
        .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
        .selectSingle()
      addInfo.currPeriodID = vacPeriod && vacPeriod.ID
    }
    global['hr_empVacationPlan'].getAvailableVacationDays(employeeNumberID, orgID, dateFrom, dictVacationKindID, addInfo)
    const daysDiff = isNewVacation ? (addInfo.currentPeriodDaysDiff || 0) : addInfo.totalDaysDiffNoCheck
    const vacKind = UB.Repository('hr_dictVacationKind')
      .attrs(['nameGen', 'name'])
      .selectById(dictVacationKindID)
    let vacKindName = (vacKind && (vacKind.nameGen || vacKind.name)) || ''
    if (dayCount > daysDiff) {
      msg = UB.i18n('Загальна кількість запланованих днів {0} перевищує залишок права на відпустку, який дорівнює {1} днів.',
        vacKindName, daysDiff)
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка на правильність доступних днів додаткової соц. відпустки (7, 10, 17)
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {string} ctx.mParams.execParams.dateFrom дата початку
 * @param {number} ctx.mParams.execParams.dateTo дата закінчення
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {boolean} ctx.mParams.execParams.isNewVacation тільки залишки нового періоду
 * @return {string} текст помилки
 */
me.checkDChildDayCount = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  const isNewVacation = execParams.isNewVacation

  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom) && dateService.isValid(dateTo)) {
    msg = orderValidator.checkDChildPeriodDays({ employeeNumberID, dictVacationKindID, onDate: dateFrom, dayCount, isNewVacation })
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка на безперервность щорічної відпустки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.organizationID організація
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @return {string} текст помилки
 */
me.checkContiniousVacation = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const organizationID = execParams.organizationID
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  const dictVacationKindCode = UB.Repository('hr_dictVacationKind')
    .attrs(['code'])
    .where('ID', '=', dictVacationKindID)
    .selectScalar()

  let msg
  let addInfo = { upToDate: dateTo }
  const hrEmpVacationPlan = global['hr_empVacationPlan']
  hrEmpVacationPlan.getAvailableVacationDays(employeeNumberID, organizationID, dateFrom, dictVacationKindID, addInfo)
  const currentPeriodDaysDiff = addInfo.currentPeriodDaysDiff
  if (dictVacationKindCode === 'dYear') {
    let mainPartCtx = {
      mParams: {
        employeeNumberID: employeeNumberID,
        dateFrom: dateFrom,
        dateTo: dateTo
      }
    }
    hrEmpVacationPlan.getMainPartIsUsed(mainPartCtx)
    const mainPartIsUsed = mainPartCtx.mParams.result
    const yearVacMainPart = timService.CONSTANTS.yearVacMainPart
    if (!mainPartIsUsed && dayCount < yearVacMainPart && (currentPeriodDaysDiff - dayCount) < yearVacMainPart) {
      msg = `Вам потрібно використати нерозривну частину відпустки - 14 календарних днів або вказати меншу тривалість відпустки. Змініть тривалість відпустки.`
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірка на перетин з іншими відпустками працівника
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeePositionID посада
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.ID пункт наказу
 * @return {string} текст помилки
 */
me.checkVacationCrossPeriod = function (ctx) {
  const mParams = ctx.mParams
  const execParams = ctx.mParams.execParams
  const employeePositionID = execParams.employeePositionID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const orderID = execParams.orderID
  const listDetID = execParams.ID
  const vacCtx = { mParams: {} }
  vacCtx.mParams.execParams = Object.assign({}, ctx.mParams.execParams, {
    employeePositionID: employeePositionID,
    dateFrom: dateFrom,
    dateTo: dateTo,
    orderID: orderID,
    listDetID: listDetID
  })
  global['hr_empOrderVacationListDet'].checkVacationCrossPeriod(vacCtx)
  if (vacCtx.mParams.msg) {
    mParams.msg = vacCtx.mParams.msg
  }
  return true
}

/* Перевірка, щоб за рік, що відповідає даті початку відпустки, кількість днів відпустки не перевищувала 59 дн.
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.year рік планування
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @param {number} ctx.mParams.execParams.dayCount кількість днів
 * @param {number} ctx.mParams.execParams.empName працівник
 * @return {string} текст помилки
 */
me.checkYearDays = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const year = execParams.year
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const dayCount = execParams.dayCount
  const empName = execParams.empName

  let msg
  if (year) {
    const yearBegin = dateService.getYearBegin(year)
    const yearEnd = dateService.getYearEnd(year)
    let yearFactDays = timService.getPeriodVacDaysByTimesheet(employeeNumberID, dictVacationKindID, yearBegin, yearEnd, true)
    const yearMaxDays = timService.CONSTANTS.yearVacMaxDays
    if (dateFrom < yearBegin || dateTo > yearEnd) {
      let dateFromInYear = dateFrom > yearBegin ? dateFrom : yearBegin
      let dateToInYear = dateTo < yearEnd ? dateTo : yearEnd
      const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
      let params = {
        dateFrom: dateFromInYear,
        dateTo: dateToInYear,
        dictVacationKindID: dictVacationKindID,
        orgID
      }
      global['hr_empOrder'].getWorkDays4Vac({ mParams: params })
      yearFactDays += params.daysCount || 0
    } else {
      yearFactDays += dayCount
    }
    if (yearMaxDays && yearFactDays > yearMaxDays) {
      msg = UB.i18n(`Сумарна кількість днів щорічних відпусток для працівника {0} за {1} рік перевищує {2} днів`, empName, year, yearMaxDays)
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Перевірити, чи вже існує запланована відпустка з мат. допомогою
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид выдпустки
 * @param {number} ctx.mParams.execParams.year рік
 * @param {number} ctx.mParams.execParams.ID відпустка, яка перевіряється
 * @return {string} текст помилки
 */
me.checkVacWithBounty = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const year = execParams.year
  const ID = execParams.ID

  let msg
  if (employeeNumberID && year) {
    const vacSchedule = UB.Repository('hr_vacationSchedule')
      .attrs(['employeeNumberID.employeeID.fullFIO', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dictVacationKindID', '=', dictVacationKindID)
      .where('year', '=', year)
      .where('isBountyHelp', '=', true)
      .whereIf(ID, 'ID', '!=', ID)
      .selectAsObject({
        'employeeNumberID.employeeID.fullFIO': 'fullFIO'
      })
    if (vacSchedule && vacSchedule.length > 0) {
      const vacRec = vacSchedule[0]
      msg = UB.i18n('На {0} рік для працівника {1} вже заплановане надання матеріальної допомоги у відпустку з {2} по {3}',
        year, vacRec.fullFIO, dateService.formatDate(vacRec.dateFrom), dateService.formatDate(vacRec.dateTo))
    }
  }
  mParams.msg = msg || ''
  return true
}
