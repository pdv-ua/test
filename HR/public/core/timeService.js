/* global _ $App UB AC appAC */
module.exports = {
  isWorkDay,
  getLastWorkDayBefore,
  getNextToHolidayDate,
  getVacPeriodDays,
  getVacationPeriodDefaultValues,
  loadVacPeriods,
  getConstants,
  getHolidayInfo,
  setHolidayInfo,
  checkStateVac,
  getDictTimeCost,
  recalcVacPeriods
}

const CONSTANTS = {
  yearVacMainPart: 14,
  yearVacMaxDays: 59,
  predefinedPeriodDays: {
    dChild: [7, 10, 17]
  },
  dNotVacDays: 15,
  stateExpCode: '6'
}

let dictTimeCost

async function isWorkDay (dt, orgID) {
  if (!_.isDate(dt)) {
    dt = new Date(dt)
  }
  let mParams = await $App.connection.run({
    entity: 'hr_empOrder',
    method: 'isWorkDay',
    organizationID: orgID,
    dateOf: dt
  })
  return mParams.isWorkDay
}

async function getLastWorkDayBefore (dt, orgID) {
  let res = dt
  for (let i = 0; i < 7; i++) {
    let df = (i === 0) ? dt : AC.dateService.addDays(dt, -1 * i)
    if (isWorkDay(df, orgID)) {
      res = df
      break
    }
  }
  return res
}

async function getNextToHolidayDate (dt, orgID) {
  const checkDayLen = 10
  let res = dt
  let dateFrom = dt
  let dateTo = AC.dateService.addDays(dt, checkDayLen)
  let mParams = await getHolidayInfo(dateFrom, dateTo, orgID)
  let holidays = JSON.parse(mParams.result)
  if (holidays.length) {
    for (let i = 0; i < checkDayLen; i++) {
      let hld = holidays.find(item => new Date(item).getTime() === res.getTime())
      if (!hld) {
        break
      }
      res = AC.dateService.addDays(dt, 1)
    }
  }
  return res
}

function getVacPeriodDays (employeeID, employeeNumberID, dictVacationKindID, periodDateFrom, periodDateTo, planDateTo, planDays, checkLongTerm) {
  return $App.connection.run({
    entity: 'hr_empVacationPlan',
    method: 'getVacPlanDays',
    employeeID: employeeID,
    employeeNumberID: employeeNumberID,
    dictVacationKindID: dictVacationKindID,
    periodDateFrom: periodDateFrom,
    periodDateTo: periodDateTo,
    planDateTo: planDateTo,
    defaultValue: planDays,
    checkLongTerm: checkLongTerm
  })
}

function getVacationPeriodDefaultValues (grid, selectedPlan) {
  if (!grid) {
    return {}
  }
  let form = grid.up('form')
  let isNewRecord = !selectedPlan
  if (isNewRecord) {
    selectedPlan = form.record
  }
  let periodsStore = grid.store
  let defaultValues = {
    empVacationPlanID: selectedPlan.get('ID'),
    dayCountPlan: selectedPlan.get('dayCount')
  }
  let isDate = selectedPlan.get('dictVacationKindID.isDate')
  let planDateFrom = AC.dateService.shiftDate(selectedPlan.get('dateFrom'))
  let planDateTo = selectedPlan.get('dateTo') || selectedPlan.get('dateToEmpty')
  if (planDateTo) {
    planDateTo = AC.dateService.shiftDate(planDateTo)
  }

  if (isDate) {
    if (periodsStore.data.length === 0) {
      defaultValues.dateFrom = planDateFrom
      defaultValues.dateTo = new Date(defaultValues.dateFrom)
    } else {
      const data = [...periodsStore.data.items].sort((a, b) => {
        /* order by dateFrom desc */
        return a.get('dateFrom') < b.get('dateFrom') ? 1 : -1
      })
      const first = data[0]
      defaultValues.dateFrom = AC.dateService.shiftDate(first.get('dateTo'))
      defaultValues.dateFrom.setDate(defaultValues.dateFrom.getDate() + 1)
      defaultValues.dateTo = new Date(defaultValues.dateFrom)
    }
    defaultValues.dateTo.setFullYear(defaultValues.dateTo.getFullYear() + 1)
    defaultValues.dateTo.setDate(defaultValues.dateTo.getDate() - 1)

    if (planDateTo && defaultValues.dateTo > planDateTo) {
      defaultValues.dateTo = planDateTo
    }
  }
  return defaultValues
}

function loadVacPeriods (grid, record, onDate) {
  if (!record.periods) {
    const empVacationPlanID = record.get('ID')
    if (empVacationPlanID) {
      return $App.connection.run({
        entity: 'hr_empVacationPeriod',
        method: 'getData',
        empVacationPlanID: empVacationPlanID,
        onDate: onDate
      }).then(mParams => {
        let strData = mParams.resultData
        let data = strData ? JSON.parse(strData) : []
        return Promise.resolve(data)
      })
    } else {
      return Promise.resolve([])
    }
  } else {
    return Promise.resolve(record.periods)
  }
}

function getConstants () {
  return CONSTANTS
}

function getHolidayInfo (dateFrom, dateTo, orgID) {
  return $App.connection.run({
    entity: 'hr_calendarHoliday',
    method: 'getHolidays',
    dateFrom: dateFrom,
    dateTo: dateTo,
    orgID: orgID
  })
}

function setHolidayInfo (label, dateFrom, dateTo, orgID) {
  if (AC.dateService.isValid(dateFrom) && AC.dateService.isValid(dateTo)) {
    getHolidayInfo(dateFrom, dateTo, orgID).then(mParams => {
      let holidaysText = ''
      let holidays = JSON.parse(mParams.result)
      if (holidays.length) {
        holidaysText = UB.i18n('Свята: ') + holidays.map(dt => AC.dateService.formatDate(dt)).join('; ')
      }
      label.setText(holidaysText)
      label.holidayCount = holidays.length
    })
  } else {
    label.setText('')
    label.holidayCount = 0
  }
}

function checkStateVac (employeeNumberID, vacKindCode, dateFrom, employeeID, orgID) {
  let result
  if (vacKindCode === 'dState' && AC.dateService.isValid(dateFrom)) {
    let toCheck = true
    if (orgID) {
      toCheck = !AC.settings.get('hrCheckNoPublServ', orgID)
    }
    if (toCheck) {
      result = UB.Repository('hr_employeePositionS')
        .attrs(['positionID.positionType'])
        .whereIf(employeeNumberID, 'employeeNumberID', '=', employeeNumberID)
        .whereIf(employeeID, 'employeeID', '=', employeeID)
        .where('dateFrom', '<=', dateFrom)
        .where('dateTo', '>=', dateFrom)
        .joinCondition('positionID.state', '=', 'ACTIVE')
        .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('[positionID.mi_dateTo] = [positionID.mi_maxDateTo]', 'custom')
        .where('positionID.positionType', '=', '1')
        .selectSingle()
    } else {
      result = Promise.resolve({})
    }
  }
  return result
}

async function getDictTimeCost () {
  if (!dictTimeCost) {
    dictTimeCost = await UB.Repository('hr_dictTimeCost').attrs(['ID', 'code', 'nameSmall', 'timeCostType', 'isFactHour']).selectAsObject()
  }
  return dictTimeCost
}

function recalcVacPeriods ({ ID, employeeNumberID, employeeID, dictVacationKindID, orgID }) {
  if (!(ID || employeeNumberID || employeeID || orgID)) {
    return
  }
  return $App.connection.run({
    entity: 'hr_empVacationPeriod',
    method: 'calcFields',
    execParams: {
      ID,
      employeeNumberID,
      employeeID,
      dictVacationKindID,
      orgID,
      onDate: appAC.globalApplicationDate()
    }
  })
}
