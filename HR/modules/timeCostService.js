const UB = require('@unitybase/ub')
const _ = require('lodash')
const dateService = require('../../AC/modules/dataServices/dateService')
const timService = require('../../HR/modules/timService')
const calendarService = require('../../HR/modules/calendarService')
const orderService = require('../../HR/modules/orderService')
const settingsService = require('../../AC/modules/entityServices/settingsService')

module.exports = {
  getCalendarianDays,
  getPeriodDays,
  getVacPlanDays,
  getVacPlanDateFrom,
  getProportDays,
  getDayDiffOnDate,
  getVacFactDays,
  addOrderItems,
  addIntCombVacOrderItems,
  addIntCombOrderItems,
  isVacLong,
  addEmployeeVacation,
  calcVacPeriods
}

/** Отримати кількість календарних днів між датами
 * @param {date} dateFrom період з
 * @param {date} dateTo період по
 * @return {number}
 */
function getCalendarianDays (dateFrom, dateTo) {
  let result
  if (dateFrom && dateTo && dateService.isDate(dateFrom) && dateService.isDate(dateTo)) {
    const holidays = UB.Repository('hr_dictHoliday')
      .attrs(['COUNT(*)'])
      .where('onDate', '>=', dateService.shiftDate(dateFrom))
      .where('onDate', '<=', dateService.shiftDate(dateTo))
      .selectAsObject({
        'COUNT(*)': 'cnt'
      })[0]
    let hldCount = holidays ? holidays.cnt : 0
    result = dateService.dayDiff(dateFrom, dateTo) + 1 - hldCount
  }
  return result
}

/** Пропорційне розбиття днів за рік на період dateFrom/dateTo
 * @param {date} dateFrom період з
 * @param {date} dateTo період по
 * @param {number} planDays кількість днів
 * @return {number}
 */
function getPeriodDays (dateFrom, dateTo, planDays) {
  let res = planDays || 0
  let dateDiff = dateService.dateDiff(dateFrom, dateTo)
  if (dateDiff < 365) {
    res = Math.round(res * dateDiff / 365.0)
  }
  return res
}

/** Отримати кількість планових днів відпустки за видом та періодом
 * @param {number} employeeID працівник
 * @param {number} employeeNumberID ID запису з табю номером
 * @param {date} periodDateFrom період з
 * @param {date} periodDateTo період по
 * @param {date} planDateTo дата закінчення дії права на відпустку
 * @param {number} dictVacationKindID вид відпустки
 * @param {number} defaultValue кількість днів за замовченням
 * @return {number}
 */
function getVacPlanDays ({ employeeID, employeeNumberID, periodDateFrom, periodDateTo, planDateTo, dictVacationKindID, defaultValue, expData, isPartYear }) {
  let dayCountPlan = defaultValue
  const dictVacKind = UB.Repository('hr_dictVacationKind')
    .attrs(['code', 'isProportional'])
    .where('ID', '=', dictVacationKindID)
    .limit(1)
    .selectSingle() || {}
  if ((periodDateTo && planDateTo && periodDateTo > planDateTo) || (!periodDateTo && planDateTo)) {
    periodDateTo = planDateTo
  }
  let isPeriodDateFrom = periodDateFrom && dateService.isValid(periodDateFrom)
  if (isPeriodDateFrom && periodDateTo) {
    let yearDiff = dateService.yearsDiff(periodDateFrom, periodDateTo)
    if (dictVacKind.isProportional && yearDiff < 1) {
      const orgID = UB.Repository('hr_employeeNumberS')
        .attrs(['orgID'])
        .selectById(employeeNumberID)
        .orgID
      dayCountPlan = getProportDays({
        orgID,
        fromDate: periodDateFrom,
        toDate: periodDateTo,
        onDate: periodDateTo,
        employeeNumberID,
        planDays: dayCountPlan,
        isPartYear
      })
    }
  }
  if (dictVacKind.code === 'dState' && isPeriodDateFrom) {
    /* Відпустка за стаж держслужби */
    let empStatePos
    let isEmployeeNumberID = !!employeeNumberID
    if (isEmployeeNumberID) {
      if (!employeeID) {
        employeeID = UB.Repository('hr_employeeNumberS')
          .attrs(['employeeID'])
          .where('ID', '=', employeeNumberID)
          .selectScalar()
      }
      empStatePos = UB.Repository('hr_employeePositionS')
        .attrs(['positionID.positionType'])
        .where('employeeNumberID', '=', employeeNumberID)
        .where('[dateTo] = [maxDateTo]', 'custom')
        .joinCondition('positionID.state', '=', 'ACTIVE')
        .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('[positionID.mi_dateTo] = [positionID.mi_maxDateTo]', 'custom')
        .where('positionID.positionType', '=', '1')
        .selectAsObject()
    }
    let expPromise = UB.Repository('hr_employeeExperience')
      .attrs(['employeeID', 'calcDate', 'startCalcDate'])
      .where('employeeID', '=', employeeID)
      .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    if (isEmployeeNumberID) {
      expPromise = expPromise
        .where('employeeNumberID', '=', employeeNumberID, 'empNum')
        .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
        .logic('([empNum] OR [empNumNull])')
    }
    let exp = expPromise
      .orderByDesc('employeeNumberID')
      .limit(1)
      .selectSingle()
    if (expData) {
      if (exp) {
        exp = Object.assign(exp, expData)
      } else {
        exp = expData
      }
    }
    dayCountPlan = 0
    if (exp && ((employeeNumberID && empStatePos.length > 0) || !employeeNumberID)) {
      let startCalcDate = exp.startCalcDate && new Date(exp.startCalcDate)
      let calcDateTo = (startCalcDate && startCalcDate < periodDateFrom) ? startCalcDate : periodDateFrom
      let expYmd = dateService.getYmd(exp.calcDate, calcDateTo, true)
      /* По старому законодавству */
      if (periodDateFrom < new Date(2016, 4, 1)) {
        if (expYmd.years >= 10) {
          switch (expYmd.years) {
            case 10:
              dayCountPlan = 5
              break
            case 11:
              dayCountPlan = 7
              break
            case 12:
              dayCountPlan = 9
              break
            case 13:
              dayCountPlan = 11
              break
            case 14:
              dayCountPlan = 13
              break
            default:
              dayCountPlan = 15
              break
          }
        }
      } else {
        /* По новому законодавству */
        if (expYmd.years >= 5) {
          dayCountPlan = (expYmd.years < 19) ? (expYmd.years - 4) : 15
        }
        if (isEmployeeNumberID) {
          /* UBHR-5800 - Повинно бути не менше за кількість днів у попередньому періоді */
          const maxDayCountRows = UB.Repository('hr_empVacationPeriod')
            .attrs(['dayCountPlan'])
            .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
            .where('empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
            .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
            .where('dateTo', '<', periodDateFrom)
            .orderByDesc('dateTo')
            .selectAsObject()
          let maxDayCount = (maxDayCountRows.length > 0 && maxDayCountRows[0].dayCountPlan) || 0
          if (dayCountPlan < maxDayCount) {
            dayCountPlan = maxDayCount
          }
        }
      }
    }
  }
  return dayCountPlan
}

/** Отримати дату початку дії права на відпустку
 * @param {number} employeeNumberID ID запису з табю номером
 * @param {number} employeeID працівник
 * @param {number} dictVacationKindID вид відпустки
 * @param {Date} acceptDate дата призначення на посаду
 * @return {date}
 */
function getVacPlanDateFrom (employeeNumberID, employeeID, dictVacationKindID, acceptDate) {
  let res = null
  const vacKind = UB.Repository('hr_dictVacationKind')
    .attrs(['code'])
    .selectById(dictVacationKindID)
  if (vacKind.code === 'dState') {
    const exp = UB.Repository('hr_employeeExperience')
      .attrs(['calcDate'])
      .where('employeeID', '=', employeeID)
      .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .limit(1)
      .selectSingle()
    if (!acceptDate) {
      const enData = UB.Repository('hr_employeePositionS')
        .attrs(['MIN([dateFrom])'])
        .where('employeeNumberID', '=', employeeNumberID)
        .selectScalar()
      acceptDate = new Date(enData)
    }
    let expCalcDate = exp && exp.calcDate && new Date(exp.calcDate)
    if (expCalcDate) {
      if (acceptDate > expCalcDate) {
        let yy = dateService.yearsDiff(expCalcDate, acceptDate)
        res = dateService.addYears(expCalcDate, yy + 1)
      } else {
        res = expCalcDate
      }
    }
  }
  return res
}

/** Отримати дні відпустки по пропорційному розрахунку
 * @param {number} orgID організація
 * @param {Date} fromDate початок періоду планування відпустки
 * @param {Date} onDate на дату
 * @param {number} employeeNumberID таб. номер
 * @param {number} planDays кількість днів відпустки по плану
 * @return {number}
 */
function getProportDays ({ orgID, fromDate, toDate, onDate, employeeNumberID, planDays, isPartYear }) {
  toDate = toDate || onDate
  let monthCount
  if (isPartYear) {
    monthCount = dateService.monthDiffAvg(fromDate, toDate)
  } else {
    monthCount = calendarService.getMonthCount({ orgID, fromDate, onDate, employeeNumberID })
    if (monthCount && monthCount === 12) {
      return planDays || 0
    }
  }
  return Math.round((planDays / (monthCount || 12)) * (dateService.dateDiff(fromDate, onDate) / 30.44)) || 0
}

/** Отримати дні відпустки, що залишилися на дату
 * @param {object} perItem запис періоду планування відпустки з полями (dateFrom, dateTo, dayDiff, dayCountPlan, dayCountFact, dayComp, 'empVacationPlanID.dictVacationKindID.isProportional')
 * @param {Date} onDate на дату
 * @param {Date} upToDate не враховувати від дати
 * @param {Number} orgID
 * @param {Number} employeeNumberID
 * @param {boolean} fixMonth
 * @return {number}
 */
function getDayDiffOnDate ({ perItem, onDate, upToDate, orgID, employeeNumberID, fixMonth }) {
  let res = perItem.dayDiff
  if (onDate) {
    let dOnDate = new Date(onDate)
    let perDateFrom = new Date(perItem.dateFrom)
    let perDateTo = new Date(perItem.dateTo)
    let dUpToDate = upToDate && new Date(upToDate)
    if ((dUpToDate && dUpToDate < perDateFrom) || dOnDate < perDateFrom) {
      res = 0
    } else {
      let isCurrentPeriod = perDateFrom <= dOnDate && perDateTo >= dOnDate
      let isProportional = perItem.isProportional
      if (isCurrentPeriod && isProportional) {
        let daysPlan = getProportDays({
          orgID,
          fromDate: perDateFrom,
          toDate: perDateTo,
          onDate,
          employeeNumberID,
          planDays: perItem.dayCountPlan,
          isPartYear: perItem.isPartYear
        })
        res = daysPlan - ((perItem.dayCountFact || 0) + (perItem.dayComp || 0) + (perItem.dayRecalc || 0) + (perItem.dayReturn || 0) + (fixMonth ? (perItem.dayFix || 0) : 0))
        if (res < 0) {
          res = 0
        }
      }
    }
  }
  return res
}

/** Отримати масив об'єктів: період, вид відпустки, фактичні дні
 * @param {number} employeeNumberID працівник
 * @param {number} employeeID особа
 * @param {number} dictVacationKindID вид вілпустки
 * @param {number} orgID організація
 * @param {number} currPeriodID поточний період планування
 * @param {Date} upToDate обмеження дати закінчення виборки
 * @param {Date} dateFrom дата з отримання факту
 * @param {Date} dateTo дата по отримання факту
 * @param {Array} fieldList
 * @param {Array} addFields
 * @param {Date} onDate на дату
 * @param {Boolean} toRecalc перераховувати
 * @param {Boolean} currentOnly
 * @param {number} fixMonth
 * @return {Array}
 */
function getVacFactDays ({ employeeNumberID, employeeID, dictVacationKindID, orgID,
  currPeriodID, upToDate, dateFrom, dateTo, fieldList, addFields, onDate,
  toRecalc = true, currentOnly = false }) {
  let fields
  let baseFields = ['ID', 'empVacationPlanID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayFact', 'dayComp', 'dayCountFactCorr', 'isPartYear',
    'dayRecalc', 'dayReturn', 'dayCountFact', 'dayDiff', 'isCanceled', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.employeeID',
    'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.dayAccumCondition', 'empVacationPlanID.dictVacationKindID.isProportional',
    'empVacationPlanID.employeeNumberID.orgID', 'empVacationPlanID.employeeNumberID.dateFrom', 'empVacationPlanID.employeeNumberID.dateTo',
    'empVacationPlanID.mi_deleteDate', 'empVacationPlanID.employeeNumberID.mi_deleteDate', 'comment', 'dayFix'
  ]
  if (fieldList) {
    fields = _.union(fieldList, fieldList.concat(baseFields))
  } else {
    if (addFields) {
      fields = _.union(baseFields, baseFields.concat(addFields))
    } else {
      fields = baseFields
    }
  }
  const vacPeriod = UB.Repository('hr_empVacationPeriod')
    .attrs(fields)
    .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
    .whereIf(employeeNumberID, 'empVacationPlanID.employeeNumberID', '=', employeeNumberID)
    .whereIf(employeeID, 'empVacationPlanID.employeeID', '=', employeeID)
    .whereIf(orgID, 'empVacationPlanID.employeeNumberID.orgID', '=', orgID)
    .whereIf(!employeeNumberID, 'empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(currPeriodID, 'ID', '=', currPeriodID)
    .whereIf(!currPeriodID && upToDate, 'dateFrom', '<=', upToDate)
    .whereIf(currentOnly && onDate, 'dateFrom', '<=', onDate)
    .whereIf(currentOnly && onDate, 'dateTo', '>=', onDate)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('empVacationPlanID.employeeNumberID')
    .orderBy('empVacationPlanID.dictVacationKindID.name')
    .orderBy('dateFrom')
    .selectAsObject({
      'empVacationPlanID.employeeNumberID': 'employeeNumberID',
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
      'empVacationPlanID.dictVacationKindID.dayAccumCondition': 'dayAccumCondition',
      'empVacationPlanID.employeeNumberID.orgID': 'orgID',
      'empVacationPlanID.employeeNumberID.dateFrom': 'empDateFrom',
      'empVacationPlanID.employeeNumberID.dateTo': 'empDateTo',
      'empVacationPlanID.dictVacationKindID.isProportional': 'isProportional'
    })

  const fixMonth = orgID || vacPeriod.length ? (settingsService.get('hrVacFixMonth', orgID || vacPeriod[0]['orgID']) || 0) : 0

  vacPeriod.forEach(perItem => {
    perItem.empVacationPeriodID = perItem.ID
    if (toRecalc) {
      perItem.dayFact = 0
      perItem.dayCountFact = perItem.dayCountFactCorr || 0
      perItem.dayFix = fixMonth > 0 ? (perItem.dayFix || 0) : 0
      perItem.dayDiff = (perItem.dayCountPlan > (perItem.dayCountFact + perItem.dayComp + perItem.dayRecalc - perItem.dayReturn - perItem.dayFix))
        ? perItem.dayCountPlan - (perItem.dayCountFact + perItem.dayComp + perItem.dayRecalc - perItem.dayReturn + perItem.dayFix) : 0
    }
    perItem.dayDiffOnDate = getDayDiffOnDate({ perItem, onDate, upToDate, orgID: perItem.orgID, employeeNumberID: perItem.employeeNumberID, fixMonth })
    perItem.hasDayDiff = perItem.dayDiff > 0
  })
  const vacFact = UB.Repository('hr_employeeVacation')
    .attrs(['employeeNumberID', 'empVacationPeriodID', 'dictVacationKindID', 'dictVacationKindID.dictTimeCostID',
      'dictVacationKindID.payElID.dictTimeCostID', 'dateFrom', 'dateTo', 'dayCount', 'orderID'])
    .whereIf(dictVacationKindID, 'dictVacationKindID', '=', dictVacationKindID)
    .whereIf(employeeNumberID, 'employeeNumberID', '=', employeeNumberID)
    .whereIf(employeeID, 'employeeID', '=', employeeID)
    .whereIf(!employeeNumberID, 'employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(orgID, 'employeeNumberID.orgID', '=', orgID)
    .whereIf(currPeriodID, 'empVacationPeriodID', '=', currPeriodID)
    .whereIf(dateFrom, 'dateTo', '>=', dateFrom)
    .whereIf(dateTo, 'dateFrom', '<=', dateTo)
    .where('vacationStatus', 'in', ['GRANT', 'GRANTLONG', 'PROLONG', 'RETPROLONG'])
    // .where('orderID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'dictVacationKindID.dictTimeCostID': 'dictTimeCostID',
      'dictVacationKindID.payElID.dictTimeCostID': 'peDictTimeCostID'
    })
  const isQueryPeriod = !!(dateFrom && dateTo)
  vacFact.forEach(factItem => {
    let perItem
    if (factItem.empVacationPeriodID) {
      perItem = vacPeriod.find(itm => itm.empVacationPeriodID === factItem.empVacationPeriodID)
      if (!perItem) {
        return
      }
    } else {
      if (!isQueryPeriod) {
        return
      }
    }
    let factDays
    if (toRecalc) {
      let factDateFrom = factItem.dateFrom && new Date(factItem.dateFrom)
      let factDateTo = factItem.dateTo && new Date(factItem.dateTo)
      let empDateTo = perItem && new Date(perItem.empDateTo)
      if (factDateFrom && factDateTo && empDateTo && factDateTo <= empDateTo /* UBHR-14915 для звільнених періодів брати дні по наказу про відпустку */) {
        factDateFrom = dateFrom && new Date(dateFrom) > factDateFrom ? dateFrom : factDateFrom
        factDateTo = dateTo && new Date(dateTo) < factDateTo ? dateTo : factDateTo
        let factTimeCostID = factItem.peDictTimeCostID || factItem.dictTimeCostID
        let holidays = (perItem && perItem.dayAccumCondition === 'noHolidays') ? calendarService.getHolidays(factDateFrom, factDateTo, perItem.orgID) : null
        factDays = UB.Repository('tim_timeSheet')
          .attrs(['COUNT(*)'])
          .where('employeeNumberID', '=', factItem.employeeNumberID)
          .where('dateWork', '>=', dateService.shiftDate(factDateFrom))
          .where('dateWork', '<=', dateService.shiftDate(factDateTo))
          .whereIf(holidays && holidays.length > 0, 'dateWork', 'notIn', holidays)
          .whereIf(factItem.orderID, 'orderID', '=', factItem.orderID)
          .where('isActive', '=', 1)
          .where('factTimeCostID', '=', factTimeCostID)
          .selectScalar()
      } else {
        factDays = factItem.dayCount || 0
      }
    }
    if (perItem) {
      if (toRecalc) {
        perItem.dayFact += factDays || 0
        perItem.dayCountFact += factDays || 0 // враховує ручне коригування dayCountFactCorr
        perItem.dayDiff = perItem.isCanceled ? 0 : perItem.dayCountPlan - (perItem.dayCountFact + perItem.dayComp + perItem.dayRecalc - perItem.dayReturn + perItem.dayFix)
      }
      perItem.dayDiffOnDate = getDayDiffOnDate({ perItem, onDate, upToDate, orgID: perItem.orgID, employeeNumberID: perItem.employeeNumberID, fixMonth })
      perItem.hasDayDiff = perItem.dayDiff > 0
    } else {
      vacPeriod.push({
        empVacationPeriodID: null,
        employeeNumberID: factItem.employeeNumberID,
        dictVacationKindID: factItem.dictVacationKindID,
        dayFact: factDays || 0,
        dayCountFact: factDays || 0,
        dayDiff: 0,
        dayFix: 0,
        dayDiffOnDate: 0,
        hasDayDiff: false,
        comment: perItem ? perItem.comment : null
      })
    }
  })
  return vacPeriod
}

/**
 * Додати пункти наказу для списку працівників
 * @param {string} entity наказ
 * @param {string} empOrderType тип наказу
 * @param {number} orderID наказ
 * @param {array} employeeNumberIDs масив посад працівників
 * @param {date} dateFrom дата початку відпустки
 * @param {date} dateTo дата закінчення відпустки
 * @param {number} dayCount кількість днів
 * @param {function} isGroup чи являється наказ груповим
 * @param {object} otherAttrs інші аттрибути для нових пунктів
 * @param {function} addListItemFn функція (orderDetID)=>{} додавання видів відпустки
 */
function addOrderItems (entity, empOrderType, orderID, employeeNumberIDs, dateFrom, dateTo, dayCount, isGroup, otherAttrs, addListItemFn) {
  const resInfo = {
    res: true
  }
  if (!employeeNumberIDs || !employeeNumberIDs.length || !dateFrom || !dateTo || !orderID) {
    resInfo.res = false
    return resInfo
  }
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  otherAttrs = otherAttrs || {}

  const posData = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'departmentID', 'positionID', 'organizationID', 'description',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'])
    .where('employeeNumberID', 'in', employeeNumberIDs)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .where('positionID', 'isNotNull')
    .selectAsObject()
  const orderData = UB.Repository(entity)
    .attrs(['employeePositionID', 'dictVacationKindID'])
    .where('orderID', '=', orderID)
    .whereIf(isGroup, 'isGroup', '=', isGroup)
    .selectAsObject()
  const maxItemIdx = UB.Repository('hr_empOrderDet')
    .attrs(['max([itemIdx])'])
    .where('orderID', '=', orderID)
    .whereIf(isGroup, 'isGroup', '=', isGroup)
    .selectScalar()
  let itemIdx = (maxItemIdx || 0) + 1
  const store = UB.DataStore(entity)
  let execParamArray = []
  for (let i = 0; i < posData.length; i++) {
    let posItem = posData[i]
    let existItem = otherAttrs.dictVacationKindID
      ? orderData.find(item => item.employeePositionID === posItem.ID && item.dictVacationKindID === otherAttrs.dictVacationKindID)
      : orderData.find(item => item.employeePositionID === posItem.ID)
    if (!existItem) {
      let newID = store.generateID()
      let attrs = otherAttrs
      let execParams = Object.assign({
        ID: newID,
        itemIdx: itemIdx++,
        orderID: orderID,
        organizationID: posItem.organizationID,
        departmentID: posItem.departmentID,
        positionID: posItem.positionID,
        employeePositionID: posItem.ID,
        employeeNumberID: posItem.employeeNumberID,
        employeeID: posItem.employeeID,
        firstName: posItem['employeeID.firstName'],
        lastName: posItem['employeeID.lastName'],
        middleName: posItem['employeeID.middleName'],
        title: posItem.description,
        empOrderType: empOrderType,
        isGroup: isGroup,
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: dayCount
      }, attrs)
      execParamArray.push(execParams)
    }
  }
  execParamArray.forEach(execParams => {
    store.run('insert', {
      execParams: execParams
    })
    addListItemFn && addListItemFn(execParams.ID)
  })
  store.freeNative()
  return resInfo
}

/**
 * Додати пункти наказу відпусток для внутріншнього сумісництва
 * @param {string} entity наказ
 * @param {string} empOrderType тип наказу
 * @param {number} orderID наказ
 * @param {number} employeePositionID основне місце роботи працівника
 * @param {date} dateFrom дата початку відпустки
 * @param {date} dateTo дата закінчення відпустки
 * @param {number} dayCount кількість днів
 * @param {function} isGroup чи являється наказ груповим
 * @param {object} otherAttrs інші аттрибути для нових пунктів
 * @param {function} addListItemFn функція (orderDetID)=>{} додавання видів відпустки
 */
function addIntCombVacOrderItems (entity, empOrderType, orderID, employeePositionID, dateFrom, dateTo, dayCount, isGroup, otherAttrs, addListItemFn) {
  const resInfo = {
    res: true
  }
  if (!employeePositionID || !dateFrom || !dateTo || !orderID) {
    resInfo.res = false
    return resInfo
  }
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  otherAttrs = otherAttrs || {}

  const posData = UB.Repository('hr_employeePositionS')
    .attrs(['employeeID', 'workPlace', 'organizationID'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(employeePositionID)
  if (posData.workPlace !== '1') {
    resInfo.res = false
    return resInfo
  }

  let intCombData = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'departmentID', 'positionID', 'organizationID', 'description',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'])
    .where('employeeID', '=', posData.employeeID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .where('workPlace', '=', '2')
    .where('positionID', 'isNotNull')
    .selectAsObject()
  // беремо всі таб.номери з відкритою датою закінчення з закритим призначенням
  const openTabNum = UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('employeeID', '=', posData.employeeID)
    .where('orgID', '=', posData.organizationID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '=', '#maxdate')
    .where('ID', 'notIn', intCombData.map(o => o.employeeNumberID))
    .selectAsObject()
  openTabNum.forEach(item => {
    // шукаємо останнє призачення за сумісництвом
    const lastIntCombData = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'employeeID', 'departmentID', 'positionID', 'organizationID', 'description',
        'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'])
      .where('employeeNumberID', '=', item.ID)
      .where('workPlace', '=', '2')
      .where('positionID', 'isNotNull')
      .orderBy('dateTo', 'desc')
      .limit(1)
      .selectSingle()
    if (lastIntCombData) {
      intCombData.push(lastIntCombData)
    }
  })

  if (!intCombData.length) {
    resInfo.res = false
    resInfo.msg = 'У працівника немає призначення за внутрішнім сумісництвом'
    return resInfo
  }

  const orderData = UB.Repository('hr_empOrderDet')
    .attrs(['employeePositionID'])
    .where('orderID', '=', orderID)
    .whereIf(isGroup, 'isGroup', '=', isGroup)
    .selectAsObject()
  let itemIdx = orderData.length + 1
  const isGetAttrsFunction = _.isFunction(otherAttrs)
  const store = UB.DataStore(entity)
  let execParamArray = []
  for (let i = 0; i < intCombData.length; i++) {
    let combItem = intCombData[i]
    let existItem = orderData.find(item => item.employeePositionID === combItem.ID)
    if (!existItem) {
      let newID = store.generateID()
      let attrs
      if (isGetAttrsFunction) {
        attrs = otherAttrs(combItem.ID)
        if (!attrs) {
          resInfo.res = false
          resInfo.msg = UB.i18n(`Для посади внутрішнього сумісника у працівника {0} немає відпустки для продовження з '{1}' по '{2}'`,
            combItem.description, dateService.formatDate(dateFrom), dateService.formatDate(dateTo))
          return resInfo
        }
      } else {
        attrs = otherAttrs
      }
      let execParams = Object.assign({
        ID: newID,
        itemIdx: itemIdx++,
        orderID: orderID,
        organizationID: combItem.organizationID,
        departmentID: combItem.departmentID,
        positionID: combItem.positionID,
        employeePositionID: combItem.ID,
        employeeNumberID: combItem.employeeNumberID,
        employeeID: combItem.employeeID,
        firstName: combItem['employeeID.firstName'],
        lastName: combItem['employeeID.lastName'],
        middleName: combItem['employeeID.middleName'],
        title: combItem.description,
        empOrderType: empOrderType,
        isGroup: isGroup,
        dateFrom: dateFrom,
        dateTo: dateTo,
        dayCount: dayCount
      }, attrs)
      execParamArray.push(execParams)
    }
  }
  execParamArray.forEach(execParams => {
    store.run('insert', {
      execParams: execParams
    })
    addListItemFn && addListItemFn(execParams.ID)
  })
  store.freeNative()
  return resInfo
}

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {string} entity наказ
 * @param {string} empOrderType тип наказу
 * @param {number} orderID наказ
 * @param {number} employeePositionID основне місце роботи працівника
 * @param {date} dateFrom дата початку відпустки
 * @param {date} dateTo дата закінчення відпустки
 * @param {function} isGroup чи являється наказ груповим
 * @param {object} otherAttrs інші аттрибути для нових пунктів
 */
function addIntCombOrderItems (entity, empOrderType, orderID, employeePositionIDs, dateFrom, dateTo, isGroup, otherAttrs) {
  const resInfo = {
    res: true
  }

  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  otherAttrs = otherAttrs || {}
  // шукаємо останнє призачення за сумісництвом
  const intCombData = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'departmentID', 'positionID', 'organizationID', 'description',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'])
    .where('ID', 'in', employeePositionIDs)
    .orderBy('dateTo', 'desc')
    .selectAsObject()

  const orderData = UB.Repository('hr_empOrderDet')
    .attrs(['employeePositionID'])
    .where('orderID', '=', orderID)
    .where('isGroup', '=', isGroup)
    .selectAsObject()
  let itemIdx = orderData.length + 1

  const store = UB.DataStore(entity)
  let execParamArray = []
  let existMilserviceDet = []
  if (empOrderType === 'MILSERVICERET') {
    existMilserviceDet = UB.Repository('hr_empOrderMilserviceDet')
      .attrs(['ID', 'employeePositionID'])
      .where('employeePositionID', 'in', employeePositionIDs)
      .where('empOrderType', '=', 'MILSERVICE')
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateService.addDays(dateFrom, -1), 'exp1')
      .where('dateTo', 'isNull', undefined, 'exp2')
      .logic('(([exp1]) or ([exp2]))')
      .where('orderID.orderState', '=', 'POSTED', 'orderStatePOSTED')
      .where('orderID.orderState', '=', 'PROCESSED', 'orderStatePROCESSED')
      .where('mi_deleteDate', '>=', '#maxdate')
      .logic('([orderStatePOSTED] OR [orderStatePROCESSED])')
      .selectAsObject()
  }
  for (let i = 0; i < intCombData.length; i++) {
    let combItem = intCombData[i]
    let existItem = orderData.find(item => item.employeePositionID === combItem.ID)
    if (!existItem) {
      let newID = store.generateID()
      if (isGroup) otherAttrs.isGroup = isGroup
      if (existMilserviceDet.length) {
        otherAttrs.sourceParaID = existMilserviceDet.find(el => el.employeePositionID === combItem.ID).ID
      }
      let execParams = Object.assign({
        ID: newID,
        itemIdx: itemIdx++,
        orderID: orderID,
        organizationID: combItem.organizationID,
        departmentID: combItem.departmentID,
        positionID: combItem.positionID,
        employeePositionID: combItem.ID,
        employeeNumberID: combItem.employeeNumberID,
        employeeID: combItem.employeeID,
        firstName: combItem['employeeID.firstName'],
        lastName: combItem['employeeID.lastName'],
        middleName: combItem['employeeID.middleName'],
        title: combItem.description,
        empOrderType: empOrderType,
        dateFrom: dateFrom,
        dateTo: dateTo
      }, otherAttrs)
      execParamArray.push(execParams)
    }
  }
  execParamArray.forEach(execParams => {
    store.run('insert', {
      execParams: execParams
    })
  })
  store.freeNative()
  return resInfo
}

/** Чи є відпустка - довготривалою чи без збереження
 * @param {number} dictVacationKindID вид вілпустки
 * @return {Boolean}
 */
function isVacLong (dictVacationKindID) {
  if (!dictVacationKindID) {
    return false
  }
  const dictVac = UB.Repository('hr_dictVacationKind')
    .attrs(['code', 'isDay'])
    .selectById(dictVacationKindID)
  return dictVac.isDay || dictVac.code === 'dNot'
}

/** Додати корегування днів відпустки в картку відпусток hr_employeeVacation
 * @param {number} employeeNumberID таб. номер
 * @param {number} orderID ID наказу
 * @param {string} orderNumber номер наказу
 * @param {date} orderDate дата наказу
 * @param {string} vacationStatus код причини корегування ('SICKNESS', 'PROLONG')
 * @param {number} orgID організація
 * @param {date} dateFrom дата початку
 * @param {date} dateTo дата закінчення
 * @param {string} description опис наказу
 */
function addEmployeeVacation ({ employeeNumberID, orderID, orderNumber, orderDate, vacationStatus, orgID,
  dictVacationKindID, dateFrom, dateTo, empVacationPeriodID, description, daysCoef = 1, saved }) {
  const isForSickness = vacationStatus === 'SICKNESS'
  const groupCode = isForSickness ? 'LST_SICKNESS' : 'LST_VACATION'
  const vacStatuses = isForSickness ? ['SICKNESS'] : undefined
  const vacationList = timService.getTimeSheetPeriodDate({ employeeNumberID, dateFrom, dateTo, groupCode, vacStatuses })
  vacationList.forEach(vacItem => {
    let periodFromIsOver = (new Date(vacItem.dateFrom) < new Date(dateFrom))
    let periodToIsOver = (new Date(vacItem.dateTo) > new Date(dateTo))
    let vacDateFrom = periodFromIsOver ? dateFrom : vacItem.dateFrom
    let vacDateTo = periodToIsOver ? dateTo : vacItem.dateTo
    let vacDayCount = vacItem.dayCount
    if (periodFromIsOver || periodToIsOver) {
      vacDayCount = timService.getCalendarDays(vacDateFrom, vacDateTo)
    }
    orderService.insertByOrder({
      store: 'hr_employeeVacation',
      params: {
        employeeID: vacItem.employeeID,
        orderID: orderID,
        orderNumber: orderNumber,
        orderDate: orderDate,
        orderState: 'POSTED',
        vacationStatus,
        organizationID: orgID,
        employeeNumberID: employeeNumberID,
        employeePositionID: vacItem.employeePositionID,
        dictVacationKindID: dictVacationKindID || vacItem.dictVacationKindID,
        dateFrom: vacDateFrom,
        dateTo: vacDateTo,
        dayCount: daysCoef * vacDayCount,
        empVacationPeriodID: empVacationPeriodID || vacItem.empVacationPeriodID,
        description: description
      },
      saved: saved
    })
  })
}

/* Обчислення розрахункових полів dayFact, dayCountFact, dayDiff таблиці періодів відпустки
* @param {object} ctx
* @param {number} ctx.mParams.ID період відпустки
* @param {number} ctx.mParams.employeeNumberID таб. номер
* @param {number} ctx.mParams.employeeID працівник
* @param {number} ctx.mParams.dictVacationKindID вид відпустки
* @param {number} ctx.mParams.orgID організація
*/
function calcVacPeriods (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams || {}
  const ID = execParams.ID
  const employeeNumberID = execParams.employeeNumberID
  const employeeID = execParams.employeeID
  const dictVacationKindID = execParams.dictVacationKindID
  const orgID = execParams.orgID
  const onDate = execParams.onDate
  const calcFields = mParams.calcFields || ['dayFact', 'dayDiff']
  const currentOnly = mParams.currentOnly

  if (!(ID || employeeNumberID || employeeID || dictVacationKindID || orgID) && !mParams.forceCalc) {
    /* Не розраховувати всі записи, якщо не проставлено mParams.forceCalc */
    return
  }
  timService.recalcExtraVacPeriods({
    empVacationPeriodID: ID,
    employeeNumberID,
    employeeID,
    orgID,
    dictVacationKindID,
    skipCalcFields: true
  })
  const vacPeriod = getVacFactDays({
    currPeriodID: ID,
    employeeNumberID: employeeNumberID,
    employeeID: employeeID,
    dictVacationKindID: dictVacationKindID,
    orgID: orgID,
    onDate: onDate,
    currentOnly: currentOnly
  })
  if (vacPeriod.length > 0) {
    const vacPeriodStore = UB.DataStore('hr_empVacationPeriod')
    vacPeriod.forEach(vacItem => {
      let updateParams = {
        ID: vacItem.ID
      }
      calcFields.forEach(fld => {
        updateParams[fld] = vacItem[fld]
      })
      vacPeriodStore.run('update', {
        __skipSelectAfterUpdate: true,
        __skipOptimisticLock: true,
        skipCalcFields: true,
        execParams: updateParams
      })
    })
    vacPeriodStore.freeNative()
  }
}
