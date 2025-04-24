const UB = require('@unitybase/ub')
const Session = UB.Session
const _ = require('lodash')
const dateService = require('../../AC/modules/dataServices/dateService')
const calendarService = require('./calendarService')
const periodService = require('../../HR/modules/periodService')
const timeSheetService = require('../../TIM/modules/timeSheetService')
const calcService = require('../../HR/modules/calcService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const settingsService = require('../../AC/modules/entityServices/settingsService')

const CONSTANTS = {
  yearVacMainPart: 14,
  yearVacMaxDays: 59,
  predefinedPeriodDays: {
    dChild: [7, 10, 17]
  },
  dNotVacDays: 15,
  stateExpCode: '6',
  vacGrantStatuses: ['GRANT', 'GRANTLONG', 'PROLONG', 'PROLONGL']
}

module.exports = {
  CONSTANTS,
  getHolidayTimeCostID,
  setTimeSheet,
  cancelTimeSheet,
  cancelTimeSheetByOrder,
  cancelTimeSheetByTimeCost,
  restoreTimeSheetByChangeOrder,
  getIsActive,
  getCalendarDays,
  getCalendarDateTo,
  getVacDays,
  getVacDateTo,
  getWorkDays,
  getDaysOff,
  isWorkDay,
  getDaysByTimeCostGroup,
  getDaysByCondition,
  getMaskByCondition,
  getTimeSheetPeriodDateSql,
  getTimeSheetPeriodDateSqlEx,
  getTimeSheetPeriodDate,
  createTimeSheetChange,
  removeTimeSheetChange,
  updateTimeSheetChange,
  getPeriodVacDays,
  getPeriodVacDaysByTimesheet,
  getOrderMinDate,
  getVacDaysSql,
  getPeriodPlanVacDays,
  getTimeSheetAbsences,
  getTimeSheetSickness,
  getTimeSheetByVacationKind,
  getTimeSheetWithoutOrder,
  changeActive,
  changeActiveByDateWork,
  getTimPlan,
  checkCrossTimeSheet,
  checkCrossTimeSheetInfo,
  recalcExtraVacPeriods,
  recalcExtraVacBalance
}

function getHolidayTimeCostID () {
  return UB.Repository('hr_dictTimeCost')
    .attrs(['ID'])
    .where('code', '=', entityBaseService.langCodei18n('Свт'))
    .selectScalar()
}

function getOrderMinDate (item, orderMinDateStore) {
  if (!orderMinDateStore[item.orderID]) {
    orderMinDateStore[item.orderID] = item.isCorrection ? dateService.addSeconds(dateService.shiftDate(item.dateWork), -1)
      : dateService.shiftDate(UB.Repository('tim_timeSheet')
        .attrs('min([dateWork])')
        .where('orderID', '=', item.orderID)
        .select()
        .get(0) || item.dateWork)
  }
  return orderMinDateStore[item.orderID]
}

/* setTimeSheet-> params = [{orderID, employeeNumberID, periodID, dateWork, factTimeCostID, factHour}, ...] */
function setTimeSheet (params, ignoreTimeCostIdent) {
  if (!global['tim_timeSheet'] || !params || !params.length) {
    return
  }

  const recalcEmpVacList = []
  const employeeNumbers = []
  let orderMinDateStore = {}
  const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['*']).selectAsObject()
  let rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['ID', 'dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  let timTimeSheet = UB.DataStore('tim_timeSheet')
  const dictTimeCostExcludeExtraVac = dictTimeCost.filter(o => o.isExcludeExtraVac).map(o => o.ID)
  params.forEach(item => {
    if (!_.isDate(item.dateWork)) {
      item.dateWork = dateService.shiftDate(item.dateWork)
    }
    if (!employeeNumbers.find(o => o === item.employeeNumberID)) {
      employeeNumbers.push(item.employeeNumberID)
    }
    if (dictTimeCostExcludeExtraVac.includes(item.factTimeCostID) && !recalcEmpVacList.find(o => o === item.employeeNumberID)) {
      recalcEmpVacList.push(item.employeeNumberID)
    }
    const schedule = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'planID', 'planNormID', 'planPlanID', 'planTimeCostID', 'planHour', 'planMonthDay', 'planMonthHour', 'planHourNight', 'planHourEvening', 'orderID',
        'isSchedule', 'isCorrection', 'isCorrectionPlan', 'isActive', 'factHour', 'factHourNight', 'factHourEvening', 'factTimeCostID',
        'normHour', 'normMonthDay', 'normMonthHour', 'normTimeCostID', 'mtCount',
        'dateWork', 'orderID.orderClass.entityName', 'isCanceled', 'factHourHarmful', 'factHourDop', 'factHourPlus', 'createPeriodID',
        'orderID.periodCalcID.dateFrom', 'orderID.orderDate'])
      .where('employeeNumberID', '=', item.employeeNumberID)
      .where('dateWork', '=', item.dateWork)
      .where('isCanceled', '=', 0)
      .selectAsObject({
        'orderID.periodCalcID.dateFrom': 'dateFrom',
        'orderID.orderDate': 'orderDate',
        'orderID.orderClass.entityName': 'entityName'
      })
    const scheduleRow = schedule.find(o => o.isSchedule === 1)
    const workSheetRow = getWorkSheetLastRow(schedule)
    const correctionRow = schedule.find(o => o.isCorrection === 1 && !o.isCorrectionPlan)
    const correctionPlanRow = schedule.find(o => o.isCorrectionPlan === 1)
    const existRow = item.orderID ? schedule.find(o => o.orderID === item.orderID && !item.import /* && !o.isCanceled */) : null
    const activeRow = schedule.find(o => o.isActive === 1)
    item.isSchedule = 0
    if (item.entityName === 'wfm_workSheet') {
      if (!activeRow || activeRow.isSchedule || (activeRow.entityName === 'wfm_workSheet' && compareScheduleRows(item, activeRow) > 0)) {
        item.isActive = 1
      }
      if (item.isActive && activeRow) {
        timTimeSheetStore.execSQL('UPDATE tim_timeSheet SET isActive = :isActive:  WHERE ID = :ID:', { ID: activeRow.ID, isActive: 0 })
      }
      if (!item.isActive && activeRow && !(activeRow.entityName === 'wfm_workSheet')) {
        // Замінити план у активному записі
        timTimeSheetStore.execSQL('UPDATE tim_timeSheet SET planID = :planID:, planTimeCostID = :planTimeCostID:, planHour = :planHour:, planHourNight = :planHourNight:, planHourEvening = :planHourEvening: WHERE ID = :ID:',
          { ID: activeRow.ID, planID: null, planTimeCostID: item.planTimeCostID, planHour: item.planHour || 0, planHourNight: item.planHourNight || 0, planHourEvening: item.planHourEvening || 0 })
      }
    } else {
      item.isActive = 1
      if (activeRow /* && !activeRow.isSchedule (план теж може не перекриватися, наприклад свята) */) {
        activeRow.dateWork = dateService.shiftDate(activeRow.dateWork)
        if (ignoreTimeCostIdent || (activeRow.factTimeCostID !== item.factTimeCostID || activeRow.entityName === item.entityName)) {
          let rule = rules.find(rule => rule.dictTimeCost1ID === activeRow.factTimeCostID && rule.dictTimeCost2ID === item.factTimeCostID)
          if (rule) {
            let minDateForCurrent = null
            let minDateForActive = null
            if (rule.isDateFirst) {
              if (!orderMinDateStore[item.orderID]) {
                minDateForCurrent = item.dateWork
                params.forEach(row => {
                  if (row.orderID === item.orderID && dateService.shiftDate(row.dateWork) < minDateForCurrent) {
                    minDateForCurrent = dateService.shiftDate(row.dateWork)
                  }
                })
                orderMinDateStore[item.orderID] = minDateForCurrent
              } else {
                minDateForCurrent = orderMinDateStore[item.orderID]
              }
              minDateForActive = getOrderMinDate(activeRow, orderMinDateStore)
            }
            item.isActive = getIsActive(rule.isDateFirst, rule.isElemFirst, minDateForActive, minDateForCurrent)
          } else {
            const employee = UB.Repository('hr_employeeNumberS').attrs(['description']).selectById(item.employeeNumberID) || {}
            const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['name']).selectById(item.factTimeCostID)
            if (!dictTimeCost) {
              throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено відповідний елемент обліку робочого часу для обраного виду оплати! Скоригуйте дані!')}>>>`)
            } else {
              throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} у табелі ({1}) вказані невиходи, для яких неможливий перетин з "{2}". Скоригуйте дані!', employee['description'], dateService.formatDate(activeRow.dateWork), dictTimeCost.name)}>>>`)
            }
          }
        } else if (activeRow.factTimeCostID === item.factTimeCostID) {
          item.isActive = 1
        }
        if (item.isActive) {
          timTimeSheetStore.execSQL('UPDATE tim_timeSheet SET isActive = :isActive:  WHERE ID = :ID:', { ID: activeRow.ID, isActive: 0 })
        }
      }
    }

    if (existRow) {
      item.ID = existRow.ID
      item.isCanceled = 0
      if (existRow.createPeriodID) {
        item.periodID = existRow.createPeriodID
      }
      delete item.entityName
      delete item.import
      // delete item.isActive
      item.createPeriodID = null
      item.canceledPeriodID = null
      let updateSQL = 'UPDATE tim_timeSheet set '
      const paramsName = Object.keys(item)
      paramsName.forEach((attrName, idx) => {
        updateSQL = `${updateSQL} ${attrName} = :${attrName}:${idx !== (paramsName.length - 1) ? ',' : ''}`
      })
      timTimeSheetStore.execSQL(`${updateSQL} WHERE ID = :ID:`, item)
    } else {
      const planRow = workSheetRow || scheduleRow
      if (planRow && !(item.entityName === 'wfm_workSheet')) {
        item.planID = planRow.planID
        item.planTimeCostID = correctionPlanRow ? correctionPlanRow.planTimeCostID : planRow.planTimeCostID
        item.planHour = (correctionPlanRow ? correctionPlanRow.planHour : planRow.planHour) || 0
        item.normTimeCostID = planRow.normTimeCostID
        item.normHour = (correctionRow ? correctionRow.normHour : planRow.normHour) || 0
        item.mtCount = (correctionRow ? correctionRow.mtCount : planRow.mtCount) || 0
        item.normMonthDay = (correctionRow ? correctionRow.normMonthDay : planRow.normMonthDay) || 0
        item.normMonthHour = (correctionRow ? correctionRow.normMonthHour : planRow.normMonthHour) || 0
        item.planMonthDay = (correctionPlanRow ? correctionPlanRow.planMonthDay : planRow.planMonthDay) || 0
        item.planMonthHour = (correctionPlanRow ? correctionPlanRow.planMonthHour : planRow.planMonthHour) || 0
        item.planHourNight = planRow.planHourNight || 0
        item.planHourEvening = planRow.planHourEvening || 0
      }
      if (item.factHour === undefined || item.factHour === null) {
        item.factHour = 0
      }
      if (item.factHourNight === undefined || item.factHourNight === null) {
        item.factHourNight = 0
      }
      if (item.factHourEvening === undefined || item.factHourEvening === null) {
        item.factHourEvening = 0
      }
      if (item.factHourHarmful === undefined || item.factHourHarmful === null) {
        item.factHourHarmful = 0
      }
      if (item.factHourDop === undefined || item.factHourDop === null) {
        item.factHourDop = 0
      }
      if (item.factHourPlus === undefined || item.factHourPlus === null) {
        item.factHourPlus = 0
      }
      if (item.planHour === undefined || item.planHour === null) {
        item.planHour = 0
      }
      if (item.planHourNight === undefined || item.planHourNight === null) {
        item.planHourNight = 0
      }
      if (item.planHourEvening === undefined || item.planHourEvening === null) {
        item.planHourEvening = 0
      }

      const dictTimeCostEl = dictTimeCost.find(o => o.ID === item.factTimeCostID) || {}
      if (!item.overridePlanHours && (dictTimeCostEl.timeCostType === 'WORK' || dictTimeCostEl.isFactHour)) {
        item.factHour = item.planHour
      }
      delete item.overridePlanHours
      delete item.entityName
      const canceledRow = item.orderID ? schedule.find(o => o.orderID === item.orderID && o.isCanceled && !item.import) : null
      delete item.import
      if (canceledRow) {
        item.ID = canceledRow.ID
        item.isCanceled = 0
        let updateSQL = 'UPDATE tim_timeSheet set '
        const paramsName = Object.keys(item)
        paramsName.forEach((attrName, idx) => {
          updateSQL = `${updateSQL} ${attrName} = :${attrName}:${idx !== (paramsName.length - 1) ? ',' : ''}`
        })
        timTimeSheetStore.execSQL(`${updateSQL} WHERE ID = :ID:`, item)
      } else {
        item.ID = timTimeSheet.generateID()
        item.mi_owner = item.mi_createUser = item.mi_modifyUser = Session.uData.userID
        item.mi_createDate = item.mi_modifyDate = new Date()
        const allowAttrs = ['planHour', 'normMonthDay', 'normMonthHour', 'planHourNight', 'planHourEvening', 'factHour', 'factPlanHour', 'factHourNight',
          'factHourEvening', 'factHourHarmful', 'factHourDop', 'isCorrection', 'isCanceled', 'planMonthDay', 'planMonthHour', 'normHour', 'factHourPlus']
        allowAttrs.forEach(attrName => {
          if (item[attrName] === undefined) {
            item[attrName] = 0
          }
        })
        if (item.mtCount === undefined) { item.mtCount = 1 }
        let columnsSQL = ''
        let paramsSQL = ''
        Object.keys(item).forEach((attrName, idx) => {
          columnsSQL = `${columnsSQL}${idx > 0 ? ',' : ''}${attrName}`
          paramsSQL = `${paramsSQL}${idx > 0 ? ',' : ''}:${attrName}:`
        })
        timTimeSheetStore.execSQL(`INSERT INTO tim_timeSheet (${columnsSQL}) VALUES (${paramsSQL})`, item)
      }
    }
  })
  if (employeeNumbers.length) {
    employeeNumbers.forEach(employeeNumberID => {
      calcService.addCalcTimeSheetQueue({ employeeNumberID: employeeNumberID, description: UB.i18n('Внесення змін в табель документом') })
    })
  }
  recalcEmpVacList.forEach(employeeNumberID => {
    recalcExtraVacPeriods({ employeeNumberID })
  })
  timTimeSheet.freeNative()
  timTimeSheetStore.freeNative()
}

function sortTimeSheetRows (rows) {
  rows.forEach(row => {
    if (row['periodID.dateFrom'] && row['mi_createDate'] && row.entityName) {
      let sortPrefix = ''
      if (row.isSchedule) {
        sortPrefix = 'A'
      } else if (row.entityName === 'wfm_workSheet') {
        sortPrefix = 'B'
      } else if (row.entityName === 'hr_timeSheetChange') {
        sortPrefix = 'C'
      } else if (row.isCorrection) {
        sortPrefix = 'D'
      } else {
        sortPrefix = 'E'
      }
      row.sortKey = `${sortPrefix}_${dateService.formatDate(dateService.shiftDate(row['periodID.dateFrom']), 'yyyy-mm-dd hh:nn:ss')}_${dateService.formatDate(dateService.shiftDate(row['mi_createDate']), 'yyyy-mm-dd hh:nn:ss')}`
    } else {
      row.sortKey = String(row.ID)
    }
  })
  rows.sort((a, b) => {
    return (a.sortKey > b.sortKey ? 1 : -1)
  })
}
function changeActiveByDateWork (employeeNumberID, dateWork, rules) {
  let remainsRows = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'isCorrection', 'isCorrectionPlan', 'isSchedule', 'dateWork',
      'orderID', 'orderID.orderClass.entityName', 'factTimeCostID.timeCostType', 'periodID.dateFrom', 'mi_createDate'])
    .where('dateWork', '=', dateWork)
    .where('employeeNumberID', '=', employeeNumberID)
    .where('isCanceled', '=', 0)
    .orderBy('ID')
    .selectAsObject({
      'factTimeCostID.timeCostType': 'factTimeCostType',
      'orderID.orderClass.entityName': 'entityName'
    })

  if (remainsRows.length) {
    if (!rules) {
      rules = UB.Repository('hr_dictTimeCostInt')
        .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
        .selectAsObject()
    }
    changeActive(remainsRows, rules)
  }
}
function changeActive (rows, rules) {
  let processed = []
  let clearActive = []
  let orderMinDateStore = {}
  let activeRow
  sortTimeSheetRows(rows)
  rows.forEach(item => {
    if (item.isActive) {
      clearActive.push(item.ID)
      item.isActive = 0
    }
    activeRow = activeRow || processed.find(item => item.isActive)
    if (activeRow) {
      let rule = rules.find(rule => rule.dictTimeCost1ID === activeRow.factTimeCostID && rule.dictTimeCost2ID === item.factTimeCostID)
      if (!rule || ((item.isCorrection || item.isSchedule || item.entityName === 'hr_timeSheetChange') &&
        (activeRow.isCorrection || activeRow.isSchedule || activeRow.entityName === 'hr_timeSheetChange'))) {
        if (/* ['WORK', 'FREE'].includes(activeRow.factTimeCostType) && ['WORK', 'FREE'].includes(item.factTimeCostType) && */
          (activeRow.isCorrection || activeRow.isSchedule || activeRow.entityName === 'hr_timeSheetChange' ||
            item.isCorrection || item.isSchedule || item.entityName === 'hr_timeSheetChange')) {
          if (item.isCorrection && !item.isCorrectionPlan && activeRow.entityName === 'hr_timeSheetChange') {
            item.isActive = 1
          }
          if (item.isCorrection && activeRow.isSchedule) {
            item.isActive = 1
          }
          if (item.isCorrection && !item.isCorrectionPlan && activeRow.isCorrectionPlan) {
            item.isActive = 1
          }
          if (item.entityName === 'hr_timeSheetChange' && activeRow.isCorrectionPlan) {
            item.isActive = 1
          }
          if ((item.entityName === 'hr_timeSheetChange' && activeRow.isSchedule && !activeRow.isCorrection) && ['WORK', 'FREE'].includes(item.factTimeCostType)) {
            item.isActive = 1
          } else if ((item.entityName === 'hr_timeSheetChange' && activeRow.isSchedule) ||
            (item.entityName === 'hr_timeSheetChange' && !['WORK', 'FREE'].includes(item.factTimeCostType) && activeRow.isCorrection && !activeRow.isCorrectionPlan) ||
            (item.entityName && activeRow.entityName && item.entityName !== 'hr_timeSheetChange')
          ) {
            if (rule) {
              let minDateForCurrent = null
              let minDateForActive = null
              if (rule.isDateFirst) {
                minDateForCurrent = getOrderMinDate(item, orderMinDateStore)
                minDateForActive = getOrderMinDate(activeRow, orderMinDateStore)
              }
              item.isActive = getIsActive(rule.isDateFirst, rule.isElemFirst, minDateForActive, minDateForCurrent) ? 1 : 0
            } else {
              item.isActive = 1
            }
          }
        }
        if (item.entityName && activeRow.entityName === 'hr_employeeAccrual' && activeRow.factTimeCostID === item.factTimeCostID) {
          item.isActive = 1
        }
      } else {
        let minDateForCurrent = null
        let minDateForActive = null
        if (rule.isDateFirst) {
          minDateForCurrent = getOrderMinDate(item, orderMinDateStore)
          minDateForActive = getOrderMinDate(activeRow, orderMinDateStore)
        }
        item.isActive = getIsActive(rule.isDateFirst, rule.isElemFirst, minDateForActive, minDateForCurrent) ? 1 : 0
      }
    } else {
      item.isActive = 1
    }
    if (item.isActive) {
      activeRow && (activeRow.isActive = 0)
      activeRow = item
    }
    processed.push(item)
  })
  if (activeRow) {
    let timTimeSheet = UB.DataStore('tim_timeSheet')
    clearActive.forEach(ID => {
      if (ID !== activeRow.ID) {
        timTimeSheet.execSQL('UPDATE tim_timeSheet SET isActive = :isActive:  WHERE ID = :ID:', { ID, isActive: 0 })
      }
    })
    if (!clearActive.find(o => o === activeRow.ID)) {
      timTimeSheet.execSQL('UPDATE tim_timeSheet SET isActive = :isActive:  WHERE ID = :ID:', {
        ID: activeRow.ID,
        isActive: 1
      })
    }
    timTimeSheet.freeNative()
  }
}

function cancelTimeSheet (orderID, empNumbers = null, dateFrom = null) {
  let dates = []
  let timTimeSheetRows = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'dateWork'])
    .where('orderID', typeof orderID === 'object' ? 'in' : '=', orderID)
    .whereIf(empNumbers && empNumbers.length, 'employeeNumberID', 'in', empNumbers)
    .whereIf(dateFrom, 'dateWork', '>=', dateFrom)
    .selectAsObject()

  const recalcEmpVacList = []
  const dictTimeCostExcludeExtraVac = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('isExcludeExtraVac', '=', 1).selectAsArrayOfValues()

  const timTimeSheet = UB.DataStore('tim_timeSheet')
  const employeeNumbers = []
  timTimeSheetRows.forEach(item => {
    if (!employeeNumbers.find(o => o === item.employeeNumberID)) {
      employeeNumbers.push(item.employeeNumberID)
    }
    if (dictTimeCostExcludeExtraVac.includes(item.factTimeCostID) && !recalcEmpVacList.find(o => o === item.employeeNumberID)) {
      recalcEmpVacList.push(item.employeeNumberID)
    }
    dates.push({ dateWork: dateService.shiftDate(item.dateWork), employeeNumberID: item.employeeNumberID, isActive: item.isActive })
    timTimeSheet.execSQL('DELETE FROM tim_timeSheet WHERE ID = :ID:', { ID: item.ID })
  })
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  dates.forEach(item => {
    if (item.isActive) {
      changeActiveByDateWork(item.employeeNumberID, item.dateWork, rules)
    }
  })
  if (employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, description: `Змінено табель (розпроведення документів)` })
  }
  recalcEmpVacList.forEach(employeeNumberID => {
    recalcExtraVacPeriods({ employeeNumberID })
  })
  timTimeSheet.freeNative()
}

function cancelTimeSheetByOrder (orderID, changeOrderID, currentPeriod, dateFrom = null, dateTo = null, employeeNumbers = null, canRestore = false) {
  const dates = []
  const timTimeSheetBuild = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'dateWork', 'periodID', 'createPeriodID'])
    .where('orderID', typeof orderID === 'object' ? 'in' : '=', orderID)
    .whereIf(dateFrom, 'dateWork', '>=', dateService.shiftDate(dateFrom))
    .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
  if (dateTo) {
    timTimeSheetBuild.where('dateWork', '<=', dateService.shiftDate(dateTo))
  }
  if (!employeeNumbers) {
    employeeNumbers = []
  }
  const timTimeSheetRows = timTimeSheetBuild.selectAsObject()
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  const recalcEmpVacList = []
  const dictTimeCostExcludeExtraVac = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('isExcludeExtraVac', '=', 1).selectAsArrayOfValues()
  timTimeSheetRows.forEach(item => {
    dates.push({ dateWork: dateService.shiftDate(item.dateWork), employeeNumberID: item.employeeNumberID, isActive: item.isActive })
    if (!employeeNumbers.find(o => o === item.employeeNumberID)) {
      employeeNumbers.push(item.employeeNumberID)
    }
    if (currentPeriod.dateFrom > dateService.shiftDate(item.dateWork) || canRestore) {
      timTimeSheetStore.execSQL(`UPDATE tim_timeSheet SET 
        changeOrderID = :changeOrderID:, isCanceled = :isCanceled:, periodID = :periodID:, createPeriodID = :createPeriodID:,
        canceledPeriodID = :canceledPeriodID:, isActive = :isActive: WHERE ID = :ID:`,
      {
        ID: item.ID,
        changeOrderID: changeOrderID,
        isCanceled: 1,
        periodID: currentPeriod.ID,
        createPeriodID: item.createPeriodID || item.periodID,
        canceledPeriodID: currentPeriod.ID,
        isActive: 0
      })
    } else {
      timTimeSheetStore.execSQL('DELETE FROM tim_timeSheet WHERE ID = :ID:', { ID: item.ID })
    }
    if (dictTimeCostExcludeExtraVac.includes(item.factTimeCostID) && !recalcEmpVacList.find(o => o === item.employeeNumberID)) {
      recalcEmpVacList.push(item.employeeNumberID)
    }
  })
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  dates.forEach(function (item) {
    if (item.isActive) {
      changeActiveByDateWork(item.employeeNumberID, item.dateWork, rules)
    }
  })
  if (employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, description: `Змінено табель (розпроведення документів)` })
  }
  recalcEmpVacList.forEach(employeeNumberID => {
    recalcExtraVacPeriods({ employeeNumberID })
  })
  timTimeSheetStore.freeNative()
}

function cancelTimeSheetByTimeCost (employeeNumberID, currentPeriod, dictTimeCostIDs, changeOrderID, dateFrom, dateTo) {
  const dates = []
  const timTimeSheetBuild = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'dateWork', 'periodID', 'createPeriodID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orderID', 'isNotNull')
    .where('factTimeCostID', 'in', dictTimeCostIDs)
    .where('dateWork', '>=', dateService.shiftDate(dateFrom))
  if (dateTo) {
    timTimeSheetBuild.where('dateWork', '<=', dateService.shiftDate(dateTo))
  }
  const timTimeSheetRows = timTimeSheetBuild.selectAsObject()
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  const recalcEmpVacList = []
  const dictTimeCostExcludeExtraVac = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('isExcludeExtraVac', '=', 1).selectAsArrayOfValues()
  timTimeSheetRows.forEach(item => {
    dates.push({ dateWork: dateService.shiftDate(item.dateWork), employeeNumberID: item.employeeNumberID, isActive: item.isActive })
    timTimeSheetStore.execSQL(`UPDATE tim_timeSheet SET 
        changeOrderID = :changeOrderID:, isCanceled = :isCanceled:, periodID = :periodID:, createPeriodID = :createPeriodID:,
        canceledPeriodID = :canceledPeriodID:, isActive = :isActive: WHERE ID = :ID:`,
    {
      ID: item.ID,
      changeOrderID: changeOrderID,
      isCanceled: 1,
      periodID: currentPeriod.ID,
      createPeriodID: item.createPeriodID || item.periodID,
      canceledPeriodID: currentPeriod.ID,
      isActive: 0
    })
    if (dictTimeCostExcludeExtraVac.includes(item.factTimeCostID) && !recalcEmpVacList.find(o => o === item.employeeNumberID)) {
      recalcEmpVacList.push(item.employeeNumberID)
    }
  })
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  dates.forEach(function (item) {
    if (item.isActive) {
      changeActiveByDateWork(item.employeeNumberID, item.dateWork, rules)
    }
  })
  recalcEmpVacList.forEach(employeeNumberID => {
    recalcExtraVacPeriods({ employeeNumberID })
  })
  timTimeSheetStore.freeNative()
}

function restoreTimeSheetByChangeOrder (orderID, orgID, excludeTimeCostID) {
  if (!orderID) return
  const dates = []
  const timTimeSheetRows = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'dateWork', 'periodID', 'createPeriodID'])
    .where('changeOrderID', '=', orderID)
    .selectAsObject()
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  const recalcEmpVacList = []
  const dictTimeCostExcludeExtraVac = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('isExcludeExtraVac', '=', 1).selectAsArrayOfValues()
  timTimeSheetRows.forEach(item => {
    if (item.factTimeCostID !== excludeTimeCostID) {
      dates.push({ dateWork: dateService.shiftDate(item.dateWork), employeeNumberID: item.employeeNumberID })
      timTimeSheetStore.execSQL(`UPDATE tim_timeSheet SET 
      changeOrderID = :changeOrderID:, periodID = :periodID:, canceledPeriodID = :canceledPeriodID:,
      isCanceled = :isCanceled: WHERE ID = :ID:`,
      {
        ID: item.ID,
        changeOrderID: null,
        periodID: currentPeriod.ID,
        canceledPeriodID: null,
        isCanceled: 0
      })
    }
    if (dictTimeCostExcludeExtraVac.includes(item.factTimeCostID) && !recalcEmpVacList.find(o => o === item.employeeNumberID)) {
      recalcEmpVacList.push(item.employeeNumberID)
    }
  })
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  dates.forEach(function (item) {
    changeActiveByDateWork(item.employeeNumberID, item.dateWork, rules)
  })
  recalcEmpVacList.forEach(employeeNumberID => {
    recalcExtraVacPeriods({ employeeNumberID })
  })
  timTimeSheetStore.freeNative()
}

function getIsActive (isDateFirst, isElemFirst, orderDateFrom1, orderDateFrom2) {
  let result
  if (isDateFirst && (!orderDateFrom1 || !orderDateFrom2)) {
    throw new UB.UBAbort('timService.getIsActive() -> when isDateFirst === true then must specify orderDateFrom1 and orderDateFrom2')
  }
  /* https://dev.intecracy.com/confluence/pages/viewpage.action?pageId=133665110 */
  if (isDateFirst && isElemFirst) {
    /* більш пріорітетним вважається елемент, який відповідає документу, який почався раніше */
    result = (orderDateFrom2 < orderDateFrom1)
  } else if (isDateFirst && !isElemFirst && orderDateFrom1 && orderDateFrom2) {
    /* більш пріорітетним вважається елемент, який відповідає документу, який почався пізніше */
    result = (orderDateFrom2 > orderDateFrom1)
  } else if (!isDateFirst && isElemFirst) {
    /* більш пріорітетним вважаеться 1 елемент */
    result = false
  } else if (!isDateFirst && !isElemFirst) {
    /* більш пріорітетним вважається 2 елемент */
    result = true
  }
  return result
}

function getCalendarDays (dateFrom, dateTo) {
  let result = 0
  if (dateFrom && dateTo) {
    dateFrom = dateService.shiftDate(dateFrom)
    dateTo = dateService.shiftDate(dateTo)
    result = dateService.dateDiff(dateFrom, dateTo)
  }
  return result
}

function getCalendarDateTo (dateFrom, dayCount) {
  let result = dateFrom
  if (dateFrom && dayCount) {
    dateFrom = dateService.shiftDate(dateFrom)
    result = dateService.addDays(dateFrom, dayCount - 1)
  }
  return result
}

function getVacDays (dateFrom, dateTo, dictVacationKindID, orgID) {
  let result
  const dayAccumCondition = dictVacationKindID ? UB.Repository('hr_dictVacationKind')
    .attrs('dayAccumCondition')
    .where('ID', '=', dictVacationKindID)
    .selectScalar() : ''
  switch (dayAccumCondition) {
    case 'noDaysOff':
      result = getWorkDays(dateFrom, dateTo, orgID)
      break
    case 'noHolidays':
      const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
      result = dateService.dateDiff(dateFrom, dateTo) - holidays.length
      break
    default:
      result = getCalendarDays(dateFrom, dateTo)
      break
  }
  return result
}

function getVacDateTo (dateFrom, dayCount, dictVacationKindID, orgID) {
  let result
  let dateTo = dateService.addDays(dateFrom, dayCount - 1)
  let datePartFrom
  let datePartTo = dateTo
  const dayAccumCondition = dictVacationKindID ? UB.Repository('hr_dictVacationKind')
    .attrs('dayAccumCondition')
    .where('ID', '=', dictVacationKindID)
    .selectScalar() : ''
  switch (dayAccumCondition) {
    case 'noDaysOff':
      let daysOff = getDaysOff(dateFrom, dateTo, orgID)
      while (daysOff > 0) {
        datePartFrom = dateService.addDays(datePartTo, 1)
        datePartTo = dateService.addDays(datePartFrom, daysOff - 1)
        daysOff = getDaysOff(datePartFrom, datePartTo, orgID)
      }
      result = datePartTo
      break
    case 'noHolidays':
      let holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
      while (holidays.length > 0) {
        datePartFrom = dateService.addDays(datePartTo, 1)
        datePartTo = dateService.addDays(datePartFrom, holidays.length - 1)
        holidays = calendarService.getHolidays(datePartFrom, datePartTo, orgID)
      }
      result = datePartTo
      break
    default:
      result = getCalendarDateTo(dateFrom, dayCount)
      break
  }
  return result
}

function getDaysByCondition (dateFrom, dateTo, dayAccumCondition, orgID) {
  let result
  switch (dayAccumCondition) {
    case 'noDaysOff':
      result = getWorkDays(dateFrom, dateTo, orgID)
      break
    case 'noHolidays':
      const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
      result = dateService.dateDiff(dateFrom, dateTo) - holidays.length
      break
    default:
      result = getCalendarDays(dateFrom, dateTo)
      break
  }
  return result
}

function getMaskByCondition (dateFrom, dateTo, dayAccumCondition, orgID) {
  let mask = 0
  const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
  for (let dayDate = dateFrom; dayDate <= dateTo; dayDate = dateService.addDays(dayDate, 1)) {
    switch (dayAccumCondition) {
      case 'noDaysOff':
        if (isWorkDay(dayDate, holidays, orgID)) {
          mask = mask | 1 << (dayDate.getDate() - 1)
        }
        break
      case 'noHolidays':
        if (!holidays.find(d => d.getTime() === dayDate.getTime())) {
          mask = mask | 1 << (dayDate.getDate() - 1)
        }
        break
      default:
        mask = mask | 1 << (dayDate.getDate() - 1)
        break
    }
  }
  return mask
}

/* Кількість робочих днів (крім суботи та неділі) за період */
function getWorkDays (dateFrom, dateTo, orgID) {
  let result = 0
  if (dateFrom && dateTo) {
    dateFrom = dateService.shiftDate(dateFrom)
    dateTo = dateService.shiftDate(dateTo)
    const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
    for (let dayDate = dateFrom; dayDate <= dateTo; dayDate = dateService.addDays(dayDate, 1)) {
      if (isWorkDay(dayDate, holidays, orgID)) {
        result++
      }
    }
  }
  return result
}

function isWorkDay (dt, holidays, orgID) {
  let result = false
  if (!dateService.isValid(dt)) {
    return result
  }
  if (!holidays) {
    holidays = calendarService.getHolidays(dt, dt, orgID)
  }
  if (!holidays.find(d => d.getTime() === dt.getTime())) {
    const dayOfWeek = dt.getDay()
    result = dayOfWeek >= 1 && dayOfWeek <= 5
  }
  return result
}

/* Кількість вихідних (субота, неділя) за період */
function getDaysOff (dateFrom, dateTo, orgID) {
  if (dateFrom > dateTo) {
    return 0
  }
  const workDays = getWorkDays(dateFrom, dateTo, orgID)
  const days = dateService.dateDiff(dateFrom, dateTo)
  return days - workDays
}

function getDaysByTimeCostGroup (employeeNumberID, groupCode, dateFrom, dateTo, orderIDNotIn) {
  const rec = UB.Repository('tim_timeSheet')
    .attrs(['COUNT(*)'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('isActive', '=', 1)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .whereIf(orderIDNotIn, 'orderID', '!=', orderIDNotIn)
    .exists(UB.Repository('hr_dictTimeCostGroup')
      .correlation('dictTimeCostID', 'factTimeCostID')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateTo)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('dictTimeGroupID.code', '=', groupCode)
      .where('dictTimeGroupID.mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject({
      'COUNT(*)': 'cnt'
    })
  return (rec[0] && rec[0].cnt) || 0
}

function getTimeSheetPeriodDateSql ({ dateFromPar, dateToPar, orgIDPar, groupCode, addFieldsSql, includeChildOrgs = false }) {
  addFieldsSql = addFieldsSql ? ', ' + addFieldsSql : ''
  let tsFilter = ''
  if (orgIDPar) {
    let orgClause = ''
    if (includeChildOrgs) {
      orgClause = ` and en.orgID IN (select org.mi_data_id from hr_organization org
      where org.mi_treePath like '%/${orgIDPar}/%' and org.mi_deleteDate >= '9999-12-31' )`
    } else if (!includeChildOrgs) {
      orgClause = ` and en.orgID = ${orgIDPar} `
    }

    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID ${orgClause}`
  }
  return `(SELECT ts.employeeNumberID, ts.orderID, vk.name as vacKindName, v.dateFrom as vacDateFrom,
      v.dateTo as vacDateTo, o.description as vacDescription
      ${addFieldsSql}
    FROM tim_timeSheet ts
      ${tsFilter}
      LEFT JOIN hr_timeSheetChange tsc ON tsc.ID = ts.orderID
      LEFT JOIN hr_employeeVacation v
          INNER JOIN hr_dictVacationKind vk ON vk.ID = v.dictVacationKindID
        ON v.orderID = COALESCE(tsc.orderID, ts.orderID)
          and v.employeeNumberID = ts.employeeNumberID 
          and v.mi_deleteDate >= '9999-12-31'
          and v.vacationStatus in ('${CONSTANTS.vacGrantStatuses.join("','")}')
    LEFT JOIN hr_order o ON o.id = ts.orderID
    WHERE ts.isActive = 1
      and ts.dateWork between :${dateFromPar}: and :${dateToPar}:
      and ts.mi_deleteDate >= '9999-12-31'
      and EXISTS (SELECT 1 FROM hr_dictTimeCostGroup tcgr
        INNER JOIN hr_dictTimeGroup gr ON gr.ID = tcgr.dictTimeGroupID
          and gr.mi_deleteDate >= '9999-12-31'
        WHERE tcgr.dictTimeCostID = ts.factTimeCostID
          and :${dateFromPar}: between tcgr.dateFrom and tcgr.dateTo
          and tcgr.mi_deleteDate >= '9999-12-31'
          and gr.code = '${groupCode}') 
     GROUP BY ts.employeeNumberID, ts.orderID, vk.name, v.dateFrom, v.dateTo, o.description
    )`
}

/* Sql для списку неявок по коду групи за період (вакансії, лікарняні, відрядження) по табелю */
function getTimeSheetPeriodDateSqlEx ({ dateFromPar, dateToPar, orgIDPar, empNumIDPar, groupCode,
  vacStatuses = CONSTANTS.vacGrantStatuses, orgID, includeChildOrgs = false, noHoliday = true, showDetails = false }) {
  let tsFilter = ''
  if (empNumIDPar) {
    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID and en.ID = :${empNumIDPar}:`
  } else if (orgIDPar) {
    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID and en.orgID = :${orgIDPar}:`
  } else if (orgID) {
    let orgClause = ''
    if (includeChildOrgs) {
      orgClause = ` and en.orgID IN (select org.mi_data_id from hr_organization org
      where org.mi_treePath like '%/${orgID}/%' and org.mi_deleteDate >= '9999-12-31' )`
    } else if (!includeChildOrgs) {
      orgClause = ` and en.orgID = ${orgID} `
    }

    tsFilter = `INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID ${orgClause}`
  }

  let vacStatusFilter = ''
  if (vacStatuses && vacStatuses.length > 0) {
    vacStatusFilter = `and v.vacationStatus in ('${vacStatuses.join("','")}')`
  }
  let holiday = ''
  if (noHoliday) {
    holiday = `and tc.code not in ('${entityBaseService.langCodei18n('Свт')}')`
  }
  let showDetailSql = ''
  if (showDetails) {
    showDetailSql = 'LEFT JOIN hr_empVacationPeriod vp on vp.id = v.empVacationPeriodID'
  }
  return `(SELECT ts.employeeNumberID, ts.factTimeCostID, ts.orderID, o.description as vacDescription,
    v.empVacationPeriodID, COALESCE(v.dateFrom, MIN(ts.dateWork)) as vacDateFrom,
    COALESCE(v.dateTo, MAX(ts.dateWork)) as vacDateTo, COALESCE(v.dayCount, COUNT(*)) as vacDayCount,
    v.dictVacationKindID as vacKindID,     
    v.dictVacationKindName as vacKindName
     ${showDetails ? ', v.periodValue as periodValue ' : ''} 
  FROM
  (SELECT ts.employeeNumberID, ts.factTimeCostID, COALESCE(tsc.orderID, ts.orderID) as orderID, ts.dateWork, ts.isActive ` +
    //      , ROW_NUMBER() OVER (PARTITION BY ts.employeeNumberID ORDER BY ts.dateWork) - ROW_NUMBER() OVER (PARTITION BY ts.employeeNumberID, ts.factTimeCostID ORDER BY ts.dateWork) as rnk
    ` FROM tim_timeSheet ts
      ${tsFilter}
      INNER JOIN hr_dictTimeCost tc ON tc.ID = ts.factTimeCostID
      LEFT JOIN hr_timeSheetChange tsc ON tsc.ID = ts.orderID
    WHERE ts.isActive = 1
      and ts.mi_deleteDate >= '9999-12-31'
      and ts.dateWork between :${dateFromPar}: and :${dateToPar}:
      ${holiday}) ts
    LEFT JOIN hr_order o ON o.id = ts.orderID
    LEFT JOIN
      (SELECT v.employeeNumberID, v.orderID, v.dictVacationKindID, vk.name as dictVacationKindName, v.empVacationPeriodID, MIN(v.dateFrom) as dateFrom,
        vk.dictTimeCostID, MAX(v.dateTo) as dateTo, SUM(v.dayCount) as dayCount ${showDetails ? ', vp.description as periodValue ' : ''}
      FROM hr_employeeVacation v
      INNER JOIN hr_dictVacationKind vk ON vk.ID = v.dictVacationKindID    
      ${showDetailSql}
      
      WHERE v.dateFrom <= :dateTo:
        and v.dateTo >= :dateFrom:
        and v.mi_deleteDate >= '9999-12-31'
        ${vacStatusFilter}
      GROUP BY v.employeeNumberID, v.orderID, v.dictVacationKindID, vk.name, v.empVacationPeriodID, vk.dictTimeCostID ${showDetails ? ', vp.description' : ''}
      ) v ON v.orderID = ts.orderID and v.employeeNumberID = ts.employeeNumberID and v.dictTimeCostID = ts.factTimeCostID 
  WHERE
    EXISTS (SELECT 1 FROM hr_dictTimeCostGroup tcgr
      INNER JOIN hr_dictTimeGroup gr ON gr.ID = tcgr.dictTimeGroupID
        and gr.mi_deleteDate >= '9999-12-31'
      WHERE tcgr.dictTimeCostID = ts.factTimeCostID
        and :${dateFromPar}: between tcgr.dateFrom and tcgr.dateTo
        and tcgr.mi_deleteDate >= '9999-12-31'
        and gr.code = '${groupCode}')   
  GROUP BY
    ts.employeeNumberID, ts.factTimeCostID, ts.orderID, ` + // ts.rnk,
    ` o.description, v.empVacationPeriodID, v.dateFrom, v.dateTo,
      v.dayCount, v.dictVacationKindID, v.dictVacationKindName  ${showDetails ? ', v.periodValue ' : ''}
    )`
}

/* Список неявок по коду групи за період (вакансії, лікарняні, відрядження) по табелю */
function getTimeSheetPeriodDate ({ employeeNumberID, dateFrom, dateTo, groupCode, vacStatuses }) {
  const store = UB.DataStore('tim_timeSheet')
  const sqlDialect = entityBaseService.getSQLDialect()
  const sql = ` SELECT en.employeeID "employeeID", ts.employeeNumberID "employeeNumberID", ep.ID as "employeePositionID",
      ts.factTimeCostID "factTimeCostID", ts.orderID "orderID", ts.vacDateFrom as "dateFrom", ts.vacDateTo as "dateTo",
      ts.vacDayCount as "dayCount", ts.vacKindID as "dictVacationKindID", ts.vacKindName as "dictVacationKindName", 
      ts.vacDescription as "description", ts.empVacationPeriodID "empVacationPeriodID"
    FROM ${getTimeSheetPeriodDateSqlEx({ dateFromPar: 'dateFrom', dateToPar: 'dateTo', empNumIDPar: 'employeeNumberID', groupCode, vacStatuses })} ts
      INNER JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID
      LEFT JOIN hr_employeePosition ep ON 
        ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
          ep2.employeeNumberID = ts.employeeNumberID
          and ep2.isActive = 1
          and ep2.dateFrom <= :dateTo:   
          and ep2.mi_deleteDate >= '9999-12-31' 
          order by ep2.dateFrom desc ${sqlDialect.limit})
    WHERE
      ts.employeeNumberID = :employeeNumberID:`
  store.runSQL(sql, {
    employeeNumberID: employeeNumberID,
    dateFrom: dateFrom,
    dateTo: dateTo
  })
  let res = store.getAsJsObject()
  store.freeNative()
  return res
}

function getVacDaysSql (dateFromParam = 'ts.vacDateFrom', dateToParam = 'ts.vacDateTo') {
  const sqlDialect = entityBaseService.getSQLDialect()
  return ` (CASE 
  WHEN ${dateFromParam} is not null and ${dateToParam} is not null 
  THEN ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(day, ${dateFromParam}, ${dateToParam})` : `date_part('days', ${dateToParam} - ${dateFromParam})`} + 1
  ELSE 
    null
  END 
  ) 
`
}

function createTimeSheetChange (params) {
  const orderStore = UB.DataStore('hr_timeSheetChange')
  const orderDayStore = UB.DataStore('hr_timeSheetChangeDay')
  const orderEmpStore = UB.DataStore('hr_timeSheetChangeEmp')
  const orderID = orderStore.generateID()
  const dateTo = params.dateTo ? dateService.shiftDate(params.dateTo) : dateService.maxDate()
  orderStore.run('insert', {
    __skipSelectAfterInsert: true,
    execParams: {
      ID: orderID,
      orderID: params.orderID,
      paraID: params.paraID,
      orderNumber: params.orderNumber,
      orderDate: params.orderDate,
      organizationID: params.organizationID,
      dateFrom: dateService.shiftDate(params.dateFrom),
      dateTo,
      typeSheetChange: params.typeSheetChange || '1',
      empOrderType: 'TIMESHEETCHANGE',
      orderState: 'PROJECT'
    }
  })
  params.employeeNumbers.forEach(employeeNumberID => {
    orderEmpStore.run('insert', {
      __skipSelectAfterInsert: true,
      execParams: {
        timeSheetChangeID: orderID,
        employeeNumberID: employeeNumberID,
        dateTo
      }
    })
  })
  params.days.forEach(day => {
    orderDayStore.run('insert', {
      __skipSelectAfterInsert: true,
      execParams: {
        timeSheetChangeID: orderID,
        numDay: day.numDay,
        dictTimeCostID: day.dictTimeCostID,
        hoursWork: day.hoursWork || 0,
        notChangeHoursWork: day.notChangeHoursWork || 0
      }
    })
  })

  orderStore.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: orderID,
      orderState: 'POSTED'
    }
  })

  params.employeeNumbers.forEach(employeeNumberID => {
    calcService.addCalcTimeSheetQueue({ employeeNumberID, entityName: 'hr_timeSheetChange' })
  })

  orderStore.freeNative()
  orderDayStore.freeNative()
  orderEmpStore.freeNative()
}

function removeTimeSheetChange (orderID, paraID) {
  const orderStore = UB.DataStore('hr_timeSheetChange')
  let orders = UB.Repository('hr_timeSheetChange')
    .attrs(['ID', 'orderID'])
    .where('orderID', '=', orderID)
    .whereIf(paraID, 'paraID', '=', paraID)
    .selectAsObject()
  orders.forEach(order => {
    orderStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: order.ID,
        orderState: 'PROJECT'
      }
    })
    orderStore.run('delete', { skipOrderDelete: true, execParams: { ID: order.ID } })
  })
  orders = null
  orderStore.freeNative()
}

function updateTimeSheetChange (params) {
  const orderStore = UB.DataStore('hr_timeSheetChange')
  const orderEmpStore = UB.DataStore('hr_timeSheetChangeEmp')
  const orders = UB.Repository('hr_timeSheetChange')
    .attrs(['ID', 'dateFrom', 'dateTo', 'orderID', 'organizationID'])
    .where('orderID', '=', params.orderID)
    .whereIf(params.paraID, 'paraID', '=', params.paraID)
    .selectAsObject()
  const newDateTo = params.dateTo ? dateService.shiftDate(params.dateTo) : dateService.maxDate()
  orders.forEach(order => {
    orderStore.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: order.ID,
        dateTo: newDateTo,
        changeOrderID: params.changeOrderID || null
      }
    })
    UB.Repository('hr_timeSheetChangeEmp')
      .attrs('ID')
      .where('timeSheetChangeID', '=', order.ID)
      .selectAsArrayOfValues().forEach(rowID => {
        orderEmpStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: rowID,
            dateTo: newDateTo
          }
        })
      })
    // Переформування табеля
    const currentPeriod = periodService.getCurrentPeriod(order.organizationID)
    if (params.dateTo) {
      cancelTimeSheetByOrder(order.ID, params.orderID, currentPeriod, dateService.addDays(params.dateTo, 1), null, params.employeeNumbers, true)
      cancelTimeSheetByOrder(order.orderID, params.orderID, currentPeriod, dateService.addDays(params.dateTo, 1), null, params.employeeNumbers, true)
    }

    const dateFrom = params.dateTo ? dateService.shiftDate(params.dateTo) : (order.dateTo ? dateService.shiftDate(order.dateTo) : dateService.shiftDate(order.dateFrom))
    const dateTo = dateService.addMonths(params.dateTo ? dateService.shiftDate(params.dateTo) : currentPeriod.dateTo, 2)
    const employeeNumbers = params.employeeNumbers || UB.Repository('hr_timeSheetChangeEmp')
      .attrs(['employeeNumberID'])
      .where('timeSheetChangeID', '=', order.ID)
      .selectAsObject().map(o => o.employeeNumberID)
    const reCalcPeriod = periodService.getPeriodsByDate(order.organizationID, dateFrom, dateTo)
    reCalcPeriod.forEach(period => {
      timeSheetService.fillTimeSheet({ organizationID: order.organizationID, periodID: period.ID, employeeNumbers, checkPeriod: false })
    })
  })
  orderStore.freeNative()
  orderEmpStore.freeNative()
}

function getPeriodVacDays (employeeNumberID, dictVacationKindID, dateFrom, dateTo, isForYear = false) {
  let res = 0
  const empVac = UB.Repository('hr_employeeVacation')
    .attrs(['dateFrom', 'dateTo'])
    .where('dictVacationKindID', '=', dictVacationKindID)
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .whereIf(isForYear, 'dictVacationKindID.isForYear', '=', true)
    .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject()
  empVac.forEach(item => {
    let vacDateFrom = new Date(item.dateFrom)
    if (vacDateFrom < dateFrom) {
      vacDateFrom = dateFrom
    }
    let vacDateTo = new Date(item.dateTo)
    if (vacDateTo > dateTo) {
      vacDateTo = dateTo
    }
    const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
    res += getVacDays(vacDateFrom, vacDateTo, dictVacationKindID, orgID)
  })
  return res
}

function getPeriodVacDaysByTimesheet (employeeNumberID, dictVacationKindID, dateFrom, dateTo, isForYear = false) {
  let res = 0
  const dictTimeCostID = UB.Repository('hr_dictVacationKind')
    .attrs(['dictTimeCostID'])
    .where('ID', '=', dictVacationKindID)
    .whereIf(isForYear, 'isForYear', '=', isForYear)
    .selectScalar()
  if (!dictTimeCostID) {
    return res
  }

  const timeSheetData = UB.Repository('tim_timeSheet')
    .attrs(['dateWork'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('factTimeCostID', '=', dictTimeCostID)
    .where('isActive', '=', 1)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .orderBy('dateWork')
    .selectAsObject()
  const holidayTimeCostID = getHolidayTimeCostID()
  const holidayPriority = global.hr_dictTimeCostInt.getPriority(holidayTimeCostID, dictTimeCostID, dateFrom)
  if (holidayPriority === 'elemFirst') {
    const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
    const holidays = calendarService.getHolidays(dateFrom, dateTo, orgID)
    timeSheetData.forEach(dataItem => {
      let dayDate = new Date(dataItem.dateWork)
      let isHoliday = holidays.find(hld => dateService.equals(hld, dayDate))
      if (!isHoliday) {
        res++
      }
    })
  } else {
    res = timeSheetData.length
  }
  return res
}

function getPeriodPlanVacDays (dateFrom, dateTo, periodDateFrom, periodDateTo, dictVacationKindID, defVal, orgID) {
  if (!_.isDate(dateFrom)) {
    dateFrom = new Date(dateFrom)
  }
  if (!_.isDate(dateTo)) {
    dateTo = new Date(dateTo)
  }
  if (!_.isDate(periodDateFrom)) {
    periodDateFrom = new Date(periodDateFrom)
  }
  if (!_.isDate(periodDateTo)) {
    periodDateTo = new Date(periodDateTo)
  }
  let hasDateCut = false
  if (dateFrom < periodDateFrom) {
    dateFrom = periodDateFrom
    hasDateCut = true
  }
  if (dateTo > periodDateTo) {
    dateTo = periodDateTo
    hasDateCut = true
  }
  let res = hasDateCut ? getVacDays(dateFrom, dateTo, dictVacationKindID, orgID) : defVal
  return res
}

function getTimeSheetAbsences (employeeNumberID, dateFrom, dateTo) {
  let res = { totalDayCount: 0, data: [] }
  if (!employeeNumberID || !dateService.isValid(dateFrom) || !dateService.isValid(dateTo)) {
    return res
  }
  const absData = UB.Repository('tim_timeSheet')
    .attrs(['orderID', 'dateWork', 'factTimeCostID', 'factTimeCostID.name'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', true)
    .where('factTimeCostID.timeCostType', '=', 'ABSENCE')
    .orderBy('dateWork')
    .selectAsObject()
  if (absData.length > 0) {
    let prevOrderID = 0
    let dictTimeCostID
    let dictTimeCostName
    let dateFrom
    let prevDateTo
    let totalDayCount = 0
    let dayCount
    for (let i = 0; i < absData.length; i++) {
      let absItem = absData[i]
      if (absItem.orderID !== prevOrderID) {
        if (prevOrderID > 0) {
          dayCount = dateService.dateDiff(dateFrom, prevDateTo)
          res.data.push({
            dictTimeCostID: dictTimeCostID,
            name: dictTimeCostName,
            dateFrom: dateFrom,
            dateTo: prevDateTo,
            dayCount: dayCount
          })
          totalDayCount += dayCount
        }
        dictTimeCostID = absItem.factTimeCostID
        dictTimeCostName = absItem['factTimeCostID.name']
        dateFrom = absItem.dateWork
      }
      prevOrderID = absItem.orderID
      prevDateTo = absItem.dateWork
    }
    dayCount = dateService.dateDiff(dateFrom, prevDateTo)
    res.data.push({
      dictTimeCostID: dictTimeCostID,
      name: dictTimeCostName,
      dateFrom: dateFrom,
      dateTo: prevDateTo,
      dayCount: dayCount
    })
    totalDayCount += dayCount
    res.totalDayCount = totalDayCount
  }
  return res
}

function getTimeSheetSickness (employeeNumberID, dateFrom, dateTo) {
  let res = []
  if (!employeeNumberID || !dateFrom || !dateTo) {
    return res
  }
  const sickData = UB.Repository('tim_timeSheet')
    .attrs(['orderID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', true)
    .exists(UB.Repository('hr_dictTimeCostGroup')
      .correlation('dictTimeCostID', 'factTimeCostID')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateTo)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('dictTimeGroupID.code', '=', 'LST_SICKNESS')
      .where('dictTimeGroupID.mi_deleteDate', '>=', '#maxdate'))
    .orderBy('orderID.orderDate')
    .groupBy(['orderID', 'orderID.orderDate'])
    .selectAsObject()
  if (sickData.length > 0) {
    res = UB.Repository('hr_empOrderSickness')
      .attrs(['serie', 'number', 'orderDate'])
      .where('ID', 'in', sickData.map(item => item.orderID))
      .orderBy('orderDate')
      .selectAsObject()
  }
  return res
}

function getTimeSheetByVacationKind (employeeNumberIDs, dictVacationKindID, dateFrom, dateTo) {
  let res = []
  if (!employeeNumberIDs || employeeNumberIDs.length === 0 || !dateFrom || !dateTo) {
    return res
  }
  const dictTimeCostID = UB.Repository('hr_dictVacationKind')
    .attrs(['dictTimeCostID'])
    .where('ID', '=', dictVacationKindID)
    .selectScalar() || 0
  res = UB.Repository('tim_timeSheet')
    .attrs(['dateWork'])
    .where('employeeNumberID', 'in', employeeNumberIDs)
    .where('factTimeCostID', '=', dictTimeCostID)
    .where('isActive', '=', 1)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .orderBy('dateWork')
    .selectAsObject()
  return res
}

function getTimeSheetWithoutOrder (employeeNumberID, dateFrom, orderID, dayAccumCondition, source) {
  const result = []
  const sourceIDs = []
  if (source && source.sourceID) {
    sourceIDs.push(source.sourceID)
    if (source && source.orderID) {
      sourceIDs.push(source.orderID)
      sourceIDs.push(...UB.Repository('hr_timeSheetChange').attrs(['ID']).where('orderID', '=', source.orderID).selectAsObject().map(o => o.ID))
    }
  }
  const timeSheets = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'dateWork', 'orderID', 'factTimeCostID', 'planHour', 'normHour', 'factHour', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType' ])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .whereIf(sourceIDs.length, 'orderID', sourceIDs.length === 1 ? '=' : 'in', sourceIDs.length === 1 ? sourceIDs[0] : sourceIDs)
    .where('isActive', '=', 1)
    .orderBy('dateWork')
    .selectAsObject({
      'planTimeCostID.timeCostType': 'planTimeCostType',
      'normTimeCostID.timeCostType': 'normTimeCostType'
    })
  if (source && source.sourceID) {
    timeSheets.forEach(sheet => {
      sheet.dateWork = dateService.shiftDate(sheet.dateWork)
      if (sheet.ID && (dayAccumCondition !== 'noDaysOff' || sheet.planTimeCostType === 'WORK')) {
        result.push(sheet)
      }
    })
    return result
  }
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  timeSheets.forEach(sheet => {
    sheet.dateWork = dateService.shiftDate(sheet.dateWork)
    if (sheet.orderID === orderID) {
      const remainsRows = UB.Repository('tim_timeSheet')
        .attrs(['ID', 'employeeNumberID', 'factTimeCostID', 'isActive', 'isCorrection', 'isSchedule', 'dateWork',
          'planHour', 'normHour', 'factHour', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType', 'orderID'])
        .where('dateWork', '=', sheet.dateWork)
        .where('employeeNumberID', '=', employeeNumberID)
        .where('isCanceled', '=', 0)
        .where('isActive', '=', 0)
        .orderBy('ID')
        .selectAsObject({
          'planTimeCostID.timeCostType': 'planTimeCostType',
          'normTimeCostID.timeCostType': 'normTimeCostType'
        })
      if (remainsRows.length) {
        const activeRow = findActiveSheet(remainsRows, rules)
        if (activeRow) {
          sheet.ID = activeRow.ID
          sheet.orderID = activeRow.orderID
          sheet.factTimeCostID = activeRow.factTimeCostID
          sheet.planHour = activeRow.planHour
          sheet.normHour = activeRow.normHour
          sheet.factHour = activeRow.factHour
          sheet.planTimeCostType = activeRow.planTimeCostType
          sheet.normTimeCostType = activeRow.normTimeCostType
        } else {
          delete sheet.ID
        }
      } else {
        delete sheet.ID
      }
    }
    if (sheet.ID && (dayAccumCondition !== 'noDaysOff' || sheet.planTimeCostType === 'WORK')) {
      result.push(sheet)
    }
  })

  return result
}

function findActiveSheet (rows, rules) {
  let processed = []
  let clearActive = []
  let orderMinDateStore = {}
  let activeRow
  rows.forEach(item => {
    if (item.isActive) {
      clearActive.push(item.ID)
      item.isActive = false
    }
    activeRow = activeRow || processed.find(item => item.isActive)
    if (activeRow) {
      let rule = rules.find(rule => rule.dictTimeCost1ID === activeRow.factTimeCostID && rule.dictTimeCost2ID === item.factTimeCostID)
      if (rule) {
        let minDateForCurrent = null
        let minDateForActive = null
        if (rule.isDateFirst) {
          minDateForCurrent = getOrderMinDate(item, orderMinDateStore)
          minDateForActive = getOrderMinDate(activeRow, orderMinDateStore)
        }
        item.isActive = getIsActive(rule.isDateFirst, rule.isElemFirst, minDateForActive, minDateForCurrent)
      } else {
        if (item.isCorrection && activeRow.isSchedule) {
          item.isActive = true
        }
      }
    } else {
      item.isActive = true
    }
    if (item.isActive) {
      activeRow && (activeRow.isActive = false)
      activeRow = item
    }
    processed.push(item)
  })
  return activeRow
}

function getTimPlan (workScheduleID, dateFrom, dateTo, orgID, cont) {
  const planByOrgID = ((cont && cont.constants) ? cont.constants.hrUsePlanByOrg : settingsService.getByCode('hrUsePlanByOrg', orgID))
  const planDays = UB.Repository('tim_plan')
    .attrs(['ID', 'workScheduleID', 'workScheduleDaysID.numDay', 'dayDate', 'dictTimeCostID',
      'dictTimeCostID.timeCostType', 'workHours', 'nightHours', 'eveningHours', 'isMtCount'])
    .where('organizationID', '=', planByOrgID || orgID)
    .where('workScheduleID', '=', workScheduleID)
    .where('dayDate', '>=', dateFrom)
    .where('dayDate', '<=', dateTo)
    .orderBy('dayDate')
    .selectAsObject({
      'workScheduleDaysID.numDay': 'numDay',
      'dictTimeCostID.timeCostType': 'timeCostType'
    })
  planDays.forEach(row => {
    row.dayDate = dateService.shiftDate(row.dayDate)
  })
  return planDays
}

function checkCrossTimeSheet (employeeNumberID, dictTimeCostID, dateFrom, dateTo, orderListID, toRaiseError = false, actionStr = '') {
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateTo ? dateService.shiftDate(dateTo) : dateService.maxDate()

  const errors = []
  const timeSheets = UB.Repository('tim_timeSheet')
    .attrs(['dateWork', 'factTimeCostID.nameShort'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', 1)
    .where('orderID.orderClass.entityName', '!=', 'hr_orderPay', 'entityName')
    .where('orderID.orderClass.entityName', 'isNull', undefined, 'entityNull')
    .whereIf(orderListID && orderListID.length, 'orderID', 'notIn', orderListID)
    .notExists(UB.Repository('hr_dictTimeCostInt')
      .correlation('dictTimeCost1ID', 'factTimeCostID')
      .where('dictTimeCost2ID', '=', dictTimeCostID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .logic('([entityName] OR [entityNull])')
    .orderBy('dateWork')
    .selectAsObject()
  if (timeSheets.length) {
    timeSheets.forEach(item => {
      errors.push(`${dateService.formatDate(item.dateWork, 'dd.mm')} "${item['factTimeCostID.nameShort']}"`)
    })
  }
  if (errors.length) {
    const employee = UB.Repository('hr_employeeNumberS').attrs(['description']).misc({ __allowSelectSafeDeleted: true }).selectById(employeeNumberID)
    const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['nameSmall']).misc({ __allowSelectSafeDeleted: true }).selectById(dictTimeCostID)
    const msg = UB.i18n(`У табелі працівника {0} існують елементи, для яких неможливий перетин з "{1}"`, employee['description'], dictTimeCost.nameSmall)
    if (actionStr) {
      actionStr += '. '
    }
    if (!toRaiseError) {
      throw new UB.UBAbort(`<<<${actionStr}${msg}: ${errors.slice(0, 49).join(', ') + (errors.length > 50 ? '...' : '')}>>>`)
    }
  }
  return errors
}

function checkCrossTimeSheetInfo ({ employeeNumberID, dateFrom, dateTo, dictTimeCostID, timeSheetParams, orderListID }) {
  let message = null
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateTo ? dateService.shiftDate(dateTo) : dateService.addMonths(dateFrom, 3)
  const dictTimeCosts = dictTimeCostID ? [dictTimeCostID] : []
  if (timeSheetParams) {
    timeSheetParams.forEach(row => {
      if (!dictTimeCosts.find(o => o === row.factTimeCostID)) {
        dictTimeCosts.push(row.factTimeCostID)
      }
    })
  }
  const store = UB.DataStore('tim_timeSheet')
  store.runSQL(`SELECT ts.dateWork "dateWork", ts.factTimeCostID "factTimeCostID", tcf.nameShort "nameShort",
                  ts.orderID "orderID", c.entityName "entityName",
                  tci.dictTimeCost2ID "dictTimeCost2ID", tci.isCrossInfo "isCrossInfo"
                FROM tim_timeSheet ts 
                join hr_dictTimeCost tcf ON tcf.ID = ts.factTimeCostID
                left join hr_order o ON o.ID = ts.orderID
                left join hr_orderClass c ON c.ID = o.orderClass
                left join hr_dictTimeCostInt tci ON tci.dictTimeCost1ID = ts.factTimeCostID AND tci.dictTimeCost2ID${entityBaseService.getInExpression('dictTimeCosts')} AND tci.mi_deleteDate >= '9999-12-31'
                WHERE ts.employeeNumberID = :employeeNumberID: AND ts.isActive = 1 AND ts.dateWork >= :dateFrom: AND ts.dateWork <= :dateTo:
                AND (ts.orderID IS NULL OR c.entityName <> 'hr_orderPay')
                ${orderListID && orderListID.length ? `AND ts.orderID${entityBaseService.getNotInExpression('orderListID')}` : ''}
                  
`, {
    employeeNumberID,
    dateFrom,
    dateTo,
    dictTimeCosts: dictTimeCosts.length ? dictTimeCosts : [0],
    orderListID
  })

  const timeSheets = store.getAsJsObject()
  const notAllowedErrors = []
  const allowedErrors = []
  let date = dateService.shiftDate(dateFrom)
  for (let day = dateFrom.getDate(); day <= dateTo.getDate(); day++) {
    const timeSheetByDay = timeSheets.filter(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())
    if (timeSheetByDay.length) {
      let dictTimeCostDayID = dictTimeCostID
      if (timeSheetParams) {
        const tsParam = timeSheetParams.find(o => o.dateWork.getTime() === date.getTime())
        if (tsParam) {
          dictTimeCostDayID = tsParam.factTimeCostID
        }
      }
      const timeSheetDay = timeSheetByDay.find(o => o.dictTimeCost2ID === dictTimeCostDayID)
      if (timeSheetDay) {
        if (timeSheetDay.isCrossInfo) {
          allowedErrors.push(`${dateService.formatDate(date, 'dd.mm')} "${timeSheetDay.nameShort}"`)
        }
      } else {
        notAllowedErrors.push(`${dateService.formatDate(date, 'dd.mm')} "${timeSheetByDay[0].nameShort}"`)
      }
    }
    date = dateService.addDays(date, 1)
  }
  if (notAllowedErrors.length || allowedErrors.length) {
    message = `${UB.i18n(`В табелі працівника на період з {0} по {1} існують наступні елементи обліку`, dateService.formatDate(dateFrom, 'dd.mm.yyyy'), dateService.formatDate(dateTo, 'dd.mm.yyyy'))}</br>`
    if (notAllowedErrors.length) {
      message += `${UB.i18n('Недопустимі перетини')}:</br><ul><li>${notAllowedErrors.slice(0, 49).join(', ') + (notAllowedErrors.length > 50 ? '...' : '')}</li></ul>`
    }
    if (allowedErrors.length) {
      message += `${UB.i18n('Допустимі перетини')}:</br><ul><li>${allowedErrors.slice(0, 49).join(', ') + (allowedErrors.length > 50 ? '...' : '')}</li></ul>`
    }
  }
  return message
}

function compareScheduleRows (a, b) {
  return a.dateFrom && b.dateFrom && (dateService.shiftDate(a.dateFrom).getTime() - dateService.shiftDate(b.dateFrom).getTime())
    ? dateService.shiftDate(a.dateFrom).getTime() - dateService.shiftDate(b.dateFrom).getTime()
    : a.orderDate && b.orderDate && (dateService.shiftDate(a.orderDate).getTime() - dateService.shiftDate(b.orderDate).getTime())
      ? dateService.shiftDate(a.orderDate).getTime() - dateService.shiftDate(b.orderDate).getTime()
      : (a.orderID || 0) - (b.orderID || 0)
}

// Останній запис індивідуального графіку роботи працівника (коригування планового робочого часу)
function getWorkSheetLastRow (schedule) {
  const workSheet = schedule.filter(o => o.entityName === 'wfm_workSheet')
    .sort(compareScheduleRows)
  return workSheet.length ? workSheet[workSheet.length - 1] : null
}

function recalcExtraVacPeriods ({ empVacationPeriodID, employeeNumberID, employeeID, orgID, dictVacationKindID, skipCalcFields }) {
  if (!(employeeNumberID || employeeID || empVacationPeriodID || dictVacationKindID || orgID)) return

  const vacPeriods = UB.Repository('hr_empVacationPeriod')
    .attrs('ID', 'dateFrom', 'dateTo', 'dayCountFactCorr', 'dayCountPlan', 'empVacationPlanID.employeeNumberID')
    .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
    .whereIf(employeeNumberID, 'empVacationPlanID.employeeNumberID', '=', employeeNumberID)
    .whereIf(employeeID, 'empVacationPlanID.employeeID', '=', employeeID)
    .whereIf(orgID, 'empVacationPlanID.employeeNumberID.orgID', '=', orgID)
    .whereIf(!employeeNumberID, 'empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(empVacationPeriodID, 'ID', '=', empVacationPeriodID)
    .where('empVacationPlanID.dictVacationKindID.isProportionalCalc', '=', 1)
    .selectAsObject({
      'empVacationPlanID.employeeNumberID': 'employeeNumberID'
    })

  if (!vacPeriods.length) return

  const dictTimeCostExcludeExtraVacIDs = UB.Repository('hr_dictTimeCost')
    .attrs(['ID'])
    .where('isExcludeExtraVac', '=', 1)
    .selectAsArrayOfValues()

  if (!dictTimeCostExcludeExtraVacIDs.length) return

  const store = UB.DataStore('hr_empVacationPeriod')
  vacPeriods.forEach(vac => {
    const dateFrom = dateService.shiftDate(vac.dateFrom)
    const dateTo = dateService.shiftDate(vac.dateTo)
    const timeSheetData = UB.Repository('tim_timeSheet')
      .attrs('orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.orderClass.entityName', 'COUNT([ID])')
      .where('employeeNumberID', '=', vac.employeeNumberID)
      .where('dateWork', '>=', dateFrom)
      .where('dateWork', '<=', dateTo)
      .where('isActive', '=', 1)
      .where('factTimeCostID', 'in', dictTimeCostExcludeExtraVacIDs)
      .groupBy(['orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.orderClass.entityName'])
      .selectAsObject({
        'COUNT([ID])': 'countDays'
      })
    const empAccrualOrderData = UB.Repository('hr_employeeAccrual')
      .attrs('ID', 'orderID.orderNumber', 'orderID.orderDate')
      .where('ID', 'in', timeSheetData.map(o => o.orderID).filter(Boolean).concat([0]))
      .selectAsObject()
    timeSheetData.forEach(row => {
      if ((!row['orderID.orderNumber'] || !row['orderID.orderDate']) && row['orderID.orderClass.entityName'] === 'hr_employeeAccrual') {
        const accOrder = empAccrualOrderData.find(o => o.ID === row.orderID)
        if (accOrder) {
          row['orderID.orderNumber'] = accOrder['orderID.orderNumber'] || row['orderID.orderNumber']
          row['orderID.orderDate'] = accOrder['orderID.orderDate'] || row['orderID.orderDate']
        }
      }
    })
    const countDays = timeSheetData.reduce((s, o) => s + (o.countDays || 0), 0)
    const usedDays = Math.round(vac.dayCountPlan * countDays / dateService.dateDiff(dateFrom, dateTo)) || 0
    const comment = timeSheetData.map(o => {
      return o.orderID ? UB.i18n('№ {0} від {1}', o['orderID.orderNumber'] || '', dateService.formatDate(o['orderID.orderDate']) || '?') : ''
    }).filter(Boolean).join(',')
    store.run('update', {
      __skipOptimisticLock: true,
      skipCalcFields,
      execParams: {
        ID: vac.ID,
        dayCountFactCorr: usedDays,
        comment: usedDays > 0 ? comment : null
      }
    })
  })
}

function recalcExtraVacBalance (employeeNumbers, dateFrom, dateTo) {
  if (!employeeNumbers || !employeeNumbers.length || !dateFrom || !dateTo) return

  const dictTimeCostExcludeExtraVacIDs = UB.Repository('hr_dictTimeCost')
    .attrs(['ID'])
    .where('isExcludeExtraVac', '=', 1)
    .selectAsArrayOfValues()

  if (!dictTimeCostExcludeExtraVacIDs.length) return

  const timeSheetData = UB.Repository('tim_timeSheet')
    .attrs('employeeNumberID', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.orderClass.entityName', 'COUNT([ID])')
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', 1)
    .where('factTimeCostID', 'in', dictTimeCostExcludeExtraVacIDs)
    .groupBy(['employeeNumberID', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.orderClass.entityName'])
    .selectAsObject({
      'COUNT([ID])': 'countDays'
    })
  if (timeSheetData.length) {
    const empAccrualOrderData = UB.Repository('hr_employeeAccrual')
      .attrs('ID', 'orderID.orderNumber', 'orderID.orderDate')
      .where('ID', 'in', timeSheetData.map(o => o.orderID).filter(Boolean).concat([0]))
      .selectAsObject()
    timeSheetData.forEach(row => {
      if ((!row['orderID.orderNumber'] || !row['orderID.orderDate']) && row['orderID.orderClass.entityName'] === 'hr_employeeAccrual') {
        const accOrder = empAccrualOrderData.find(o => o.ID === row.orderID)
        if (accOrder) {
          row['orderID.orderNumber'] = accOrder['orderID.orderNumber'] || row['orderID.orderNumber']
          row['orderID.orderDate'] = accOrder['orderID.orderDate'] || row['orderID.orderDate']
        }
      }
    })
    const vacPeriods = UB.Repository('hr_empVacationPeriod')
      .attrs('ID', 'dateFrom', 'dateTo', 'dayCountFactCorr', 'dayCountPlan', 'empVacationPlanID.employeeNumberID')
      .where('empVacationPlanID.employeeNumberID', 'in', employeeNumbers)
      .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPlanID.dictVacationKindID.isProportionalCalc', '=', 1)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject({
        'empVacationPlanID.employeeNumberID': 'employeeNumberID'
      })
    const store = UB.DataStore('hr_empVacationPeriod')
    vacPeriods.forEach(vac => {
      const vacDateFrom = dateService.shiftDate(vac.dateFrom)
      const vacDateTo = dateService.shiftDate(vac.dateTo)
      const empTimeSheetData = timeSheetData.filter(o => o.employeeNumberID === vac.employeeNumberID)
      const countDays = empTimeSheetData.reduce((s, o) => s + (o.countDays || 0), 0)
      const usedDays = Math.round(vac.dayCountPlan * countDays / dateService.dateDiff(vacDateFrom, vacDateTo)) || 0
      const comment = empTimeSheetData.map(o => {
        return o.orderID ? UB.i18n('№ {0} від {1}', o['orderID.orderNumber'] || '', dateService.formatDate(o['orderID.orderDate']) || '?') : ''
      }).filter(Boolean).join(',')
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: vac.ID,
          dayCountFactCorr: usedDays,
          comment: usedDays > 0 ? comment : null
        }
      })
    })
  }
}
