const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const accrualService = require('../../HR/modules/accrualService')
const calendarService = require('../../HR/modules/calendarService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const periodService = require('../../HR/modules/periodService')
const currencyService = require('../../AC/modules/dataServices/currencyService')

module.exports = {
  getReportParams, // Налаштування для звітів з hr_idParam
  getReportParamProps, // Деталізація налаштування для звітів з hr_idParam
  getReportValuesParams, // Налаштування для звітів hr_valuesParam
  getEmpCount,
  getListEmpCount, // розрахунку спискової чисельності
  getAvgListEmpCount, // розрахунок середньоспискової чисельності працівників
  getAvgListEmpCountOnDate, // розрахунок середньоспискової чисельності працівників на дату
  getAvgListEmpCountFull, // розрахунок Середньоспискової чисельності працівників в еквіваленті повної зайнятості
  getAvgListEmpCountFullEnergo, // розрахунок Середньоспискової чисельності працівників в еквіваленті повної зайнятості для Обленерго
  getHrOrg, // назва організації для звітів
  getAccrualReportPrintConfig // налаштування звітів
}

function getReportParams (orgID, paramCodes, excludeCodes = []) {
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID'])
    .where('[listParamID.code]', 'in', paramCodes.concat(excludeCodes))
    .where('[orgID]', '=', Number(parentOrdID || orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject()

  const excludeIdParams = idParams.filter(idParam => excludeCodes.includes(idParam['listParamID.code'])).map(idParam => idParam.valuesID)
  const result = {}
  paramCodes.forEach(paramCode => {
    result[`${paramCode}IDs`] = idParams.filter(idParam => idParam['listParamID.code'] === paramCode).map(idParam => idParam.valuesID).filter(el => !excludeIdParams.includes(el))
  })
  return result
}

function getReportParamProps (orgID, paramCodes) {
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
  const idParams = UB.Repository('hr_idParam')
    .where('[listParamID.code]', 'in', paramCodes)
    .where('[orgID]', '=', Number(parentOrdID || orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .attrs(['listParamID.code', 'valuesID', 'orderN'])
    .orderBy('listParamID.code')
    .orderBy('orderN')
    .selectAsObject()
  const result = {}
  paramCodes.forEach(paramCode => {
    result[`${paramCode}IDs`] = idParams.filter(idParam => idParam['listParamID.code'] === paramCode)
  })
  return result
}

function getReportValuesParams (orgID, paramCodes) {
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
  const valuesParams = UB.Repository('hr_valuesParam')
    .where('[listParamID.code]', 'in', paramCodes)
    .where('[orgID]', '=', Number(parentOrdID || orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .attrs(['listParamID.code', 'orderN', 'valuesFloat'])
    .orderBy('orderN')
    .selectAsObject()
  const result = {}
  paramCodes.forEach(paramCode => {
    result[`${paramCode}IDs`] = valuesParams.filter(idParam => idParam['listParamID.code'] === paramCode)
  })
  return result
}
function getEmpCount (orgID, employeeNumbers, dateFrom, dateTo, notAvgQuantityIDs = [], workPlace = ['1'], disability = false, detail = false) {
  const empPosData = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.tabNum', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'dictCategoryECBID.dictTypeTaxECBID.code', 'dictStaffCatID.accCategory'])
    .where('[organizationID]', typeof orgID === 'object' ? 'in' : '=', orgID)
    .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
    .where('employeeNumberID.empWorkPlace', 'isNull')
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .selectAsObject({
      'dictCategoryECBID.dictTypeTaxECBID.code': 'dictTypeTaxECBCode',
      'employeeNumberID.employeeID.sexType': 'sexType',
      'dictStaffCatID.accCategory': 'accCategory'
    })

  // load corresponding timesheets within month
  const timeSheets = empPosData.length ? UB.Repository('tim_timeSheet')
    .where('[employeeNumberID]', 'in', empPosData.map(o => o.employeeNumberID))
    .where('[isActive]', '=', true)
    // .where('[factTimeCostID]', 'notIn', reportParams.notAvgQuantityIDs ? reportParams.notAvgQuantityIDs : [0])
    .where('[dateWork]', '>=', dateFrom)
    .where('[dateWork]', '<=', dateTo)
    .groupBy(['employeeNumberID', 'dateWork'])
    .attrs(['employeeNumberID', 'dateWork'])
    .selectAsObject() : []

  const empAddGuarantees = []
  if (empPosData.length) {
    const guarantees = UB.Repository('hr_empAddGuarantees')
      .attrs(['employeeID', 'dateFrom', 'dateTo', 'addGuarant'])
      .where('employeeID', 'in', empPosData.map(o => o.employeeID))
      .where('addGuarant', '!=', '0')
      .where('addGuarant', 'isNotNull')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('employeeID')
      .orderBy('dateFrom')
      .selectAsObject()

    guarantees.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      const empGuarantees = empAddGuarantees.find(o => o.employeeID === row.employeeID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
      if (empGuarantees) {
        empGuarantees.dateFrom = dateService.shiftDate(Math.min(empGuarantees.dateFrom, row.dateFrom))
        empGuarantees.dateTo = dateService.shiftDate(Math.max(empGuarantees.dateTo, row.dateTo))
      } else {
        empAddGuarantees.push(row)
      }
    })
  }

  const empAddDisability = []
  if (empPosData.length && disability) {
    const disab = UB.Repository('hr_employeeDisability')
      .attrs('ID', 'employeeID', 'dateFrom', 'dateTo')
      .where('[dateFrom]', '<=', dateTo)
      .where('[dateTo]', '>=', dateFrom)
      .where('employeeID', 'in', empPosData.map(o => o.employeeID))
      .orderBy('dateFrom')
      .selectAsObject()
    disab.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      const empDisability = empAddDisability.find(o => o.employeeID === row.employeeID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
      if (empDisability) {
        empDisability.dateFrom = dateService.shiftDate(Math.min(empDisability.dateFrom, row.dateFrom))
        empDisability.dateTo = dateService.shiftDate(Math.max(empDisability.dateTo, row.dateTo))
      } else {
        empAddDisability.push(row)
      }
    })
  }

  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  let empDayCount = 0
  let addGuarantDayCount = 0
  let invalidDayCount = 0
  let disabilityDayCount = 0
  const empPosDataByEmp = {}
  const empNumIds = []
  const addGuarantNumIds = []
  const addDisabilityNumIds = []
  const empDetails = {}
  empPosData.forEach(posData => {
    const addEmp = !empPosDataByEmp[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmp[posData.employeeNumberID] = posData
      posData.isMainWork = posData.workPlace === '1'
      posData.isInnerCoWork = posData.workPlace === '2'
      posData.isExtCoWork = posData.workPlace === '3'
      posData.isStaffEmp = posData.isMainWork || posData.isInnerCoWork || posData.isExtCoWork
      posData.isOutStaffEmp = posData.workPlace === '4'
      posData.isMan = posData.sexType !== 'W'
      posData.isWoman = posData.sexType === 'W'
      posData.invalidDayCount = 0
    }
    if (workPlace.includes(posData.workPlace)) {
      const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData.dateFrom)))
      const perDateTo = dateService.shiftDate(Math.min(dateTo, dateService.shiftDate(posData.dateTo)))
      let dayCount = 0
      if (timeSheets.find(o => o.employeeNumberID === posData.employeeNumberID && dateService.shiftDate(o.dateWork).getTime() >= perDateFrom && dateService.shiftDate(o.dateWork).getTime() <= perDateTo)) {
        dayCount = dateService.dayDiff(perDateFrom, perDateTo) + 1
      } else if (posData.accCategory === '7') {
        const empCphDatas = UB.Repository('hr_employeeCPH')
          .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
          .where('[employeeNumberID]', '=', posData.employeeNumberID)
          .where('[dateFrom]', '<', perDateTo)
          .where('[dateTo]', '>=', perDateFrom, 'dateTo')
          .where('dateTo', 'isNull', undefined, 'dateToIsNull')
          .logic('(([dateTo]) or ([dateToIsNull]))')
          .selectAsObject()
        empCphDatas.forEach(ts => {
          ts.dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(ts.dateFrom), perDateFrom))
          ts.dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(ts.dateTo || perDateTo), perDateTo))
          dayCount = (dateService.dayDiff(ts.dateFrom, ts.dateTo) + 1)
        })
      }

      if (detail) {
        if (empDetails[posData.employeeNumberID]) {
          empDetails[posData.employeeNumberID].dayCount += dayCount
        } else {
          empDetails[posData.employeeNumberID] = { dayCount: dayCount }
        }
      }
      posData.dayCount = dayCount
      empDayCount += dayCount
      empAddGuarantees.forEach(empAddGuarant => {
        if (empAddGuarant.employeeID === posData.employeeID && perDateFrom <= empAddGuarant.dateTo && perDateTo >= empAddGuarant.dateFrom) {
          const garDateFrom = dateService.shiftDate(Math.max(perDateFrom, empAddGuarant.dateFrom))
          const garDateTo = dateService.shiftDate(Math.min(perDateTo, empAddGuarant.dateTo))
          const empAddGuarantDayCount = (Math.max(0, dateService.dayDiff(garDateFrom, garDateTo) + 1) || 0)
          addGuarantDayCount += empAddGuarantDayCount
          if (addEmp) {
            addGuarantNumIds.push(posData.employeeNumberID)
          }
          if (detail && detail.guarant) {
            empDetails[posData.employeeNumberID].addGuarantDayCount = (empDetails[posData.employeeNumberID].addGuarantDayCount || 0) + empAddGuarantDayCount
          }
        }
      })
      empAddDisability.forEach(empAddDis => {
        if (empAddDis.employeeID === posData.employeeID && perDateFrom <= empAddDis.dateTo && perDateTo >= empAddDis.dateFrom) {
          const garDateFrom = dateService.shiftDate(Math.max(perDateFrom, empAddDis.dateFrom))
          const garDateTo = dateService.shiftDate(Math.min(perDateTo, empAddDis.dateTo))
          const empDisabilityDayCount = (Math.max(0, dateService.dayDiff(garDateFrom, garDateTo) + 1) || 0)
          disabilityDayCount += empDisabilityDayCount
          if (addEmp) {
            addDisabilityNumIds.push(posData.employeeNumberID)
          }
          if (detail && detail.disability) {
            empDetails[posData.employeeNumberID].disabilityDayCount = (empDetails[posData.employeeNumberID].addGuarantDayCount || 0) + empDisabilityDayCount
          }
        }
      })
      if (['2', '32'].includes(posData.dictTypeTaxECBCode)) {
        const excludeDay = notAvgQuantityIDs.length ? (UB.Repository('tim_timeSheet')
          .attrs(['COUNT(1)'])
          .where('[employeeNumberID]', '=', posData.employeeNumberID)
          .where('[dateWork]', '>=', perDateFrom)
          .where('[dateWork]', '<=', perDateTo)
          .where('[isActive]', '=', true)
          .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
          .groupBy('employeeNumberID')
          .selectScalar() || 0) : 0
        invalidDayCount += (dayCount || 0) - excludeDay
        if (detail && detail.invalid) {
          empDetails[posData.employeeNumberID].invalidDayCount = (empDetails[posData.employeeNumberID].invalidDayCount || 0) + (dayCount || 0) - excludeDay
        }
      }
      if (addEmp) {
        empNumIds.push(posData.employeeNumberID)
      }
    }
  })
  const excludeDayCount = (notAvgQuantityIDs.length && empNumIds.length) ? (UB.Repository('tim_timeSheet')
    .attrs(['COUNT(*)'])
    .where('[employeeNumberID]', 'in', empNumIds)
    .where('[dateWork]', '>=', dateFrom)
    .where('[dateWork]', '<=', dateTo)
    .where('[isActive]', '=', true)
    .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
    .selectScalar() || 0) : 0
  if (detail && detail.count && notAvgQuantityIDs.length && empNumIds.length) {
    const excludeDet = UB.Repository('tim_timeSheet')
      .attrs(['employeeNumberID', 'COUNT(*)'])
      .where('[employeeNumberID]', 'in', empNumIds)
      .where('[dateWork]', '>=', dateFrom)
      .where('[dateWork]', '<=', dateTo)
      .where('[isActive]', '=', true)
      .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
      .groupBy('employeeNumberID')
      .selectAsObject({ 'COUNT(*)': 'eCount' })
    excludeDet.forEach(row => {
      if (empDetails[row.employeeNumberID]) {
        empDetails[row.employeeNumberID].excludeDayCount = row.eCount
      }
    })
  }

  const excludeAddGuarantDayCount = (notAvgQuantityIDs.length && addGuarantNumIds.length) ? (UB.Repository('tim_timeSheet')
    .attrs(['COUNT(*)'])
    .where('[employeeNumberID]', 'in', addGuarantNumIds)
    .where('[dateWork]', '>=', dateFrom)
    .where('[dateWork]', '<=', dateTo)
    .where('[isActive]', '=', true)
    .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
    .selectScalar() || 0) : 0
  if (detail && detail.guarant) {
    const guarantDet = UB.Repository('tim_timeSheet')
      .attrs(['employeeNumberID', 'COUNT(*)'])
      .where('[employeeNumberID]', 'in', addGuarantNumIds)
      .where('[dateWork]', '>=', dateFrom)
      .where('[dateWork]', '<=', dateTo)
      .where('[isActive]', '=', true)
      .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
      .groupBy('employeeNumberID')
      .selectAsObject({ 'COUNT(*)': 'eCount' })
    guarantDet.forEach(row => {
      if (empDetails[row.employeeNumberID]) {
        empDetails[row.employeeNumberID].excludeGuarantCount = row.eCount
      }
    })
  }
  const excludeDisabilityDayCount = (notAvgQuantityIDs.length && addDisabilityNumIds.length) ? (UB.Repository('tim_timeSheet')
    .attrs(['COUNT(*)'])
    .where('[employeeNumberID]', 'in', addDisabilityNumIds)
    .where('[dateWork]', '>=', dateFrom)
    .where('[dateWork]', '<=', dateTo)
    .where('[isActive]', '=', true)
    .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
    .selectScalar() || 0) : 0

  if (detail && detail.disability) {
    const disabilityDet = UB.Repository('tim_timeSheet')
      .attrs(['employeeNumberID', 'COUNT(*)'])
      .where('[employeeNumberID]', 'in', addDisabilityNumIds)
      .where('[dateWork]', '>=', dateFrom)
      .where('[dateWork]', '<=', dateTo)
      .where('[isActive]', '=', true)
      .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
      .groupBy('employeeNumberID')
      .selectAsObject({ 'COUNT(*)': 'eCount' })
    disabilityDet.forEach(row => {
      if (empDetails[row.employeeNumberID]) {
        empDetails[row.employeeNumberID].excludeDisabilityCount = row.eCount
      }
    })
  }

  const empDetail = []
  if (detail) {
    Object.keys(empDetails).forEach(empNumID => {
      const newRow = {
        enID: Number(empNumID)
      }
      if (detail.count) {
        newRow.c = currencyService.round((empDetails[empNumID].dayCount - (empDetails[empNumID].excludeDayCount || 0)) / periodDayCount, 4)
        newRow.dC = empDetails[empNumID].dayCount
        newRow.eC = (empDetails[empNumID].excludeDayCount || 0)
      }
      if (detail.invalid) {
        newRow.i = currencyService.round((empDetails[empNumID].invalidDayCount || 0) / periodDayCount, 4)
      }
      if (detail.guarant) {
        newRow.g = currencyService.round(((empDetails[empNumID].addGuarantDayCount || 0) - (empDetails[empNumID].excludeGuarantCount || 0)) / periodDayCount, 4)
        newRow.gC = (empDetails[empNumID].addGuarantDayCount || 0)
        newRow.egC = (empDetails[empNumID].excludeGuarantCount || 0)
      }
      if (detail.disability) {
        newRow.d = currencyService.round(((empDetails[empNumID].disabilityDayCount || 0) - (empDetails[empNumID].excludeDisabilityCount || 0)) / periodDayCount, 4)
        newRow.dC = (empDetails[empNumID].disabilityDayCount || 0)
        newRow.edC = (empDetails[empNumID].excludeDisabilityCount || 0)
      }
      empDetail.push(newRow)
    })
  }
  return {
    count: currencyService.gaussRound((empDayCount - excludeDayCount) / periodDayCount, 0),
    addGuarant: currencyService.gaussRound((addGuarantDayCount - excludeAddGuarantDayCount) / periodDayCount, 0),
    invalid: currencyService.gaussRound(invalidDayCount / periodDayCount, 0),
    disabilityCount: currencyService.gaussRound((disabilityDayCount - excludeDisabilityDayCount) / periodDayCount, 0),
    empPosData,
    empDetail
  }
}

function getListEmpCount ({ onDate, orgID, departmentID, avgCount = false, holidays }) {
  if (!holidays) {
    holidays = calendarService.getHolidays(dateService.addDays(onDate, -30), onDate, orgID)
  }
  let calcDate
  let date = dateService.shiftDate(onDate)
  while (!calcDate) {
    if (!holidays.find(o => o.getTime() === date.getTime())) {
      calcDate = date
    } else {
      date = dateService.addDays(date, -1)
    }
  }
  const empPosDataBuilder = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID'])
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', calcDate)
    .where('dateTo', '>=', calcDate)
    .whereIf(departmentID, 'departmentID', '=', departmentID)
    .where('workPlace', '=', '1')
    .where('payElID.methodID.code', '!=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
  if (avgCount) {
    /* empPosDataBuilder
      .where('employeeID.citizenshipID.code', '=', 'UKR', 'CIT1')
      .where('employeeID.citizenshipID', 'isNull', null, 'CIT2')
      .logic('([CIT1] OR [CIT2])') */

    empPosDataBuilder.notExists(UB.Repository('hr_employeeEducation')
      .correlation('employeeID', 'employeeID')
      .where('worksAndStudies', '=', 1)
      .where('dateTo', 'isNull', undefined, 'dateToNull')
      .where('dateTo', '>', calcDate, 'dateToMore')
      .logic('([dateToNull] OR [dateToMore])')
      .where('mi_deleteDate', '>=', '#maxdate'))
  }
  const employeeNumbers = empPosDataBuilder.selectAsObject()

  return employeeNumbers.length
}

function getAvgListEmpCountOnDate ({ orgID, onDate, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1'], avgCount = false, withCPH = false, dec = 3 }) {
  // const periods = periodService.getPeriodsByDate(orgID, dateFrom, dateTo)
  const resultData = {
    dayCount: 0,
    workDayCount: 0,
    periodDayCount: 0,
    employeeNumbers: {}
  }
  // periods.forEach(period => {
  const periodData = getAvgListEmpCountMounth({ orgID, dateFrom: onDate, dateTo: onDate, departmentID, includeChildDepts, employeeNumbers, workPlace, avgCount, withCPH, dec })
  resultData.dayCount = accrualService.round(resultData.dayCount + periodData.dayCount, dec)
  resultData.periodDayCount += periodData.periodDayCount
  resultData.workDayCount += periodData.workDayCount
  Object.keys(periodData.employeeNumbers).forEach(employeeNumberID => {
    const addEmp = resultData.employeeNumbers[employeeNumberID]
    if (!addEmp) {
      resultData.employeeNumbers[employeeNumberID] = {
        workPlace: periodData.employeeNumbers[employeeNumberID].workPlace,
        dayCount: periodData.employeeNumbers[employeeNumberID].dayCount,
        sexType: periodData.employeeNumbers[employeeNumberID].sexType,
        workDayCount: periodData.employeeNumbers[employeeNumberID].workDayCount
      }
    } else {
      resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount +
          periodData.employeeNumbers[employeeNumberID].dayCount, dec)
      resultData.employeeNumbers[employeeNumberID].workPlace = periodData.employeeNumbers[employeeNumberID].workPlace
      resultData.employeeNumbers[employeeNumberID].sexType = periodData.employeeNumbers[employeeNumberID].sexType
      resultData.employeeNumbers[employeeNumberID].workDayCount += periodData.employeeNumbers[employeeNumberID].workDayCount
    }
  })
  // })
  /* Object.keys(resultData.employeeNumbers).forEach(employeeNumberID => {
    resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount /
      periods.length, dec)
  }) */

  // resultData.dayCount = accrualService.round(resultData.dayCount / periods.length, dec)
  return resultData
}
function getAvgListEmpCount ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1'], avgCount = false, withCPH = false, dec = 3, addGuarant }) {
  const periods = periodService.getPeriodsByDate(orgID, dateFrom, dateTo)
  const resultData = {
    dayCount: 0,
    workDayCount: 0,
    periodDayCount: 0,
    addGuarantCount: 0,
    employeeNumbers: {}
  }
  periods.forEach(period => {
    const periodData = getAvgListEmpCountMounth({ orgID, dateFrom: period.dateFrom, dateTo: period.dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace, avgCount, withCPH, dec, addGuarant })
    resultData.dayCount = accrualService.round(resultData.dayCount + periodData.dayCount, dec)
    resultData.periodDayCount += periodData.periodDayCount
    resultData.workDayCount += periodData.workDayCount
    resultData.addGuarantCount += (periodData.addGuarantCount || 0)
    Object.keys(periodData.employeeNumbers).forEach(employeeNumberID => {
      const addEmp = resultData.employeeNumbers[employeeNumberID]
      if (!addEmp) {
        resultData.employeeNumbers[employeeNumberID] = {
          workPlace: periodData.employeeNumbers[employeeNumberID].workPlace,
          dayCount: periodData.employeeNumbers[employeeNumberID].dayCount,
          sexType: periodData.employeeNumbers[employeeNumberID].sexType,
          workDayCount: periodData.employeeNumbers[employeeNumberID].workDayCount,
          addGuarantCount: (periodData.employeeNumbers[employeeNumberID].addGuarant || 0)
        }
      } else {
        resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount +
          periodData.employeeNumbers[employeeNumberID].dayCount, dec)
        resultData.employeeNumbers[employeeNumberID].workPlace = periodData.employeeNumbers[employeeNumberID].workPlace
        resultData.employeeNumbers[employeeNumberID].sexType = periodData.employeeNumbers[employeeNumberID].sexType
        resultData.employeeNumbers[employeeNumberID].workDayCount += periodData.employeeNumbers[employeeNumberID].workDayCount
        resultData.employeeNumbers[employeeNumberID].addGuarantCount += (periodData.employeeNumbers[employeeNumberID].addGuarant || 0)
      }
    })
  })
  Object.keys(resultData.employeeNumbers).forEach(employeeNumberID => {
    resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount /
      periods.length, dec)
    resultData.employeeNumbers[employeeNumberID].addGuarantCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].addGuarantCount /
      periods.length, dec)
  })

  resultData.dayCount = accrualService.round(resultData.dayCount / periods.length, dec)
  resultData.addGuarantCount = accrualService.round(resultData.addGuarantCount / periods.length, dec)
  return resultData
}

function getAvgListEmpCountMounth ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1'], avgCount = false, withCPH = false, dec = 3, addGuarant }) {
  const notAvgQuantityIDs = getReportParams(orgID, ['notAvgQuantity']).notAvgQuantityIDs
  const store = UB.DataStore('tim_timeSheet')
  const existNumber = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.tabNum', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'employeeID.citizenshipID', 'employeeID.citizenshipID.code'])
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', 'in', workPlace)
    .where('payElID.methodID.code', '!=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

  const existNumberCPH = UB.Repository('hr_employeePositionS')
    .correlation('employeeNumberID', 'employeeNumberID')
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', '=', '4')
    .where('payElID.methodID.code', '=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

  if (departmentID) {
    if (includeChildDepts) {
      const depData = UB.Repository('hr_department')
        .attrs(['mi_treePath', 'orgID'])
        .where('orgID', '=', orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_data_id', '=', departmentID)
        .misc({ __mip_recordhistory_all: true })
        .groupBy(['mi_data_id', 'mi_treePath', 'orgID'])
        .limit(1)
        .selectSingle()
      const departments = depData ? UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', depData.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_treePath', 'startsWith', depData.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject() : []
      if (departments.length) {
        existNumber.where('departmentID', 'in', departments.map(o => o.mi_data_id))
        existNumberCPH.where('departmentID', 'in', departments.map(o => o.mi_data_id))
      } else {
        existNumber.where('departmentID', '=', departmentID)
        existNumberCPH.where('departmentID', '=', departmentID)
      }
    } else {
      existNumber.where('departmentID', '=', departmentID)
      existNumberCPH.where('departmentID', '=', departmentID)
    }
  }

  const empPosData = existNumber
    .orderBy('employeeNumberID').orderBy('dateFrom')
    .selectAsObject({
      'employeeNumberID.employeeID.sexType': 'sexType',
      'employeeID.citizenshipID.code': 'citizenshipCode'
    })

  const empPosDataCPH = withCPH ? UB.Repository('hr_employeeCPH')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo',
      'employeeNumberID.tabNum', 'employeeNumberID.employeeID', 'employeeNumberID.employeeID.sexType',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'employeeNumberID.employeeID.citizenshipID', 'employeeNumberID.employeeID.citizenshipID.code'
    ])
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('(([dateTo]) or ([dateToIsNull]))')
    .exists(existNumberCPH)
    .selectAsObject({
      'employeeNumberID.employeeID': 'employeeID',
      'employeeNumberID.employeeID.sexType': 'sexType',
      'employeeNumberID.employeeID.citizenshipID': 'employeeID.citizenshipID',
      'employeeNumberID.employeeID.citizenshipID.code': 'citizenshipCode'
    }) : []
  empPosData.push(...empPosDataCPH)

  const empAddGuarantees = []
  if (addGuarant && empPosData.length) {
    const guarantees = UB.Repository('hr_empAddGuarantees')
      .attrs(['employeeID', 'dateFrom', 'dateTo', 'addGuarant'])
      .where('employeeID', 'in', empPosData.map(o => o.employeeID))
      .whereIf(addGuarant.exclude, 'addGuarant', 'notIn', addGuarant.exclude)
      .whereIf(addGuarant.include, 'addGuarant', 'in', addGuarant.include)
      .where('addGuarant', 'isNotNull')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('employeeID')
      .orderBy('dateFrom')
      .selectAsObject()

    guarantees.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      const empGuarantees = empAddGuarantees.find(o => o.employeeID === row.employeeID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
      if (empGuarantees) {
        empGuarantees.dateFrom = dateService.shiftDate(Math.min(empGuarantees.dateFrom, row.dateFrom))
        empGuarantees.dateTo = dateService.shiftDate(Math.max(empGuarantees.dateTo, row.dateTo))
      } else {
        empAddGuarantees.push(row)
      }
    })
  }

  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  let empDayCount = 0
  let workDayCount = 0
  let empAddGuarant = 0
  const empPosDataByEmp = {}
  empPosData.forEach(posData => {
    const addEmp = !empPosDataByEmp[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmp[posData.employeeNumberID] = {
        workPlace: posData.workPlace,
        sexType: posData.sexType,
        dayCount: 0,
        workDayCount: 0,
        addGuarant: 0
      }
    }
    const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData['dateFrom'])))
    const perDateTo = dateService.shiftDate(Math.min(dateTo, (dateService.shiftDate(posData['dateTo'] || dateService.maxDate()))))
    let dayCount = Math.max(0, dateService.dayDiff(perDateFrom, perDateTo) + 1)
    let addGuarantDayCount = 0
    if (addGuarant) {
      empAddGuarantees.forEach(empAddGuarant => {
        if (empAddGuarant.employeeID === posData.employeeID && perDateFrom <= empAddGuarant.dateTo && perDateTo >= empAddGuarant.dateFrom) {
          const garDateFrom = dateService.shiftDate(Math.max(perDateFrom, empAddGuarant.dateFrom))
          const garDateTo = dateService.shiftDate(Math.min(perDateTo, empAddGuarant.dateTo))
          addGuarantDayCount += (Math.max(0, dateService.dayDiff(garDateFrom, garDateTo) + 1) || 0)
        }
      })
    }
    if (workPlace.includes(posData.workPlace)) {
      if (!avgCount) {
        const excludeEducation = UB.Repository('hr_employeeEducation')
          .attrs(['dateFrom', 'dateTo'])
          .where('employeeID', '=', posData.employeeID)
          .where('worksAndStudies', '=', 1)
          .where('dateFrom', '<=', perDateTo)
          .where('dateTo', '>=', perDateFrom, 'dateTo')
          .where('dateTo', 'isNull', undefined, 'dateToIsNull')
          .logic('(([dateTo]) or ([dateToIsNull]))')
          .limit(1)
          .selectSingle()
        let excludeEducationDay = 0
        if (excludeEducation) {
          excludeEducation.dateFrom = dateService.shiftDate(excludeEducation.dateFrom)
          excludeEducation.dateTo = dateService.shiftDate(excludeEducation.dateTo || perDateTo)
          excludeEducationDay = dateService.dayDiff(dateService.shiftDate(Math.max(perDateFrom, excludeEducation.dateFrom)),
            dateService.shiftDate(Math.min(perDateTo, excludeEducation.dateTo))) + 1
          if (addGuarant) {
            empAddGuarantees.forEach(empAddGuarant => {
              if (empAddGuarant.employeeID === posData.employeeID && excludeEducation.dateFrom <= empAddGuarant.dateTo && excludeEducation.dateTo >= empAddGuarant.dateFrom) {
                const garDateFrom = dateService.shiftDate(Math.max(excludeEducation.dateFrom, empAddGuarant.dateFrom))
                const garDateTo = dateService.shiftDate(Math.min(excludeEducation.dateTo, empAddGuarant.dateTo))
                addGuarantDayCount = Math.max(0, addGuarantDayCount - (dateService.dayDiff(garDateFrom, garDateTo) + 1))
              }
            })
          }
        }
        dayCount = Math.max(0, dayCount - excludeEducationDay)
        const excludeDay = notAvgQuantityIDs.length ? (UB.Repository('tim_timeSheet')
          .attrs(['COUNT(1)'])
          .where('[employeeNumberID]', '=', posData.employeeNumberID)
          .where('[dateWork]', '>=', perDateFrom)
          .where('[dateWork]', '<=', perDateTo)
          .where('[isActive]', '=', true)
          .where('[factTimeCostID]', 'in', notAvgQuantityIDs)
          .selectScalar() || 0) : 0
        dayCount = Math.max(0, dayCount - excludeDay)
        if (addGuarant) {
          store.runSQL(`SELECT A01.employeeNumberID "employeeNumberID" ,(COUNT(1)) AS "cnt" 
                           FROM tim_timeSheet A01 
                           LEFT JOIN hr_employeeNumber n ON n.ID = A01.employeeNumberID
                           WHERE A01.employeeNumberID = :employeeNumberID: 
                           AND A01.dateWork>=:perDateFrom: AND A01.dateWork<=:perDateTo: AND A01.isActive=1
                           ${notAvgQuantityIDs.length ? `AND A01.factTimeCostID${entityBaseService.getInExpression('notAvgQuantityIDs')}` : ''} 
                           AND A01.mi_deleteDate>='9999-12-31'
                           AND EXISTS (SELECT 1 FROM hr_empAddGuarantees A02 WHERE A02.employeeID=n.employeeID 
                           AND A02.dateFrom<=A01.dateWork AND A02.dateTo>=A01.dateWork AND A02.addGuarant IS NOT NULL AND A02.mi_deleteDate>='9999-12-31'
                            ${addGuarant.exclude ? ` AND A02.addGuarant${entityBaseService.getNotInExpression('exclude')}` : ''} 
                            ${addGuarant.include ? ` AND A02.addGuarant${entityBaseService.getInExpression('include')}` : ''}
                           ) GROUP BY A01.employeeNumberID`, {
            employeeNumberID: posData.employeeNumberID,
            perDateFrom,
            perDateTo,
            notAvgQuantityIDs,
            exclude: addGuarant.exclude,
            include: addGuarant.include
          })
          const timeSheetsGuarant = store.getAsJsObject()
          if (timeSheetsGuarant && timeSheetsGuarant.length) {
            addGuarantDayCount = Math.max(0, addGuarantDayCount - (timeSheetsGuarant[0].cnt || 0))
          }
        }
      }
    }
    empPosDataByEmp[posData.employeeNumberID].dayCount += dayCount
    empPosDataByEmp[posData.employeeNumberID].addGuarant += addGuarantDayCount
  })
  Object.keys(empPosDataByEmp).forEach(employeeNumberID => {
    if (empPosDataByEmp[employeeNumberID].dayCount) {
      empPosDataByEmp[employeeNumberID].workDayCount = empPosDataByEmp[employeeNumberID].dayCount
      empPosDataByEmp[employeeNumberID].dayCount = accrualService.round(empPosDataByEmp[employeeNumberID].dayCount / periodDayCount, dec)
      empDayCount = accrualService.round(empDayCount + empPosDataByEmp[employeeNumberID].dayCount, dec)
      workDayCount = accrualService.round(workDayCount + empPosDataByEmp[employeeNumberID].workDayCount, dec)
      empPosDataByEmp[employeeNumberID].addGuarant = accrualService.round(empPosDataByEmp[employeeNumberID].addGuarant / periodDayCount, dec)
      empAddGuarant = accrualService.round(empAddGuarant + empPosDataByEmp[employeeNumberID].addGuarant, dec)
    }
  })
  return {
    dayCount: empDayCount,
    workDayCount: workDayCount,
    periodDayCount: periodDayCount,
    employeeNumbers: empPosDataByEmp,
    addGuarantCount: empAddGuarant
  }
}

function getAvgListEmpCountFull ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1', '2', '3'], avgCount = false, dec = 3 }) {
  const periods = periodService.getPeriodsByDate(orgID, dateFrom, dateTo)
  const resultData = {
    dayCount: 0,
    periodDayCount: 0,
    employeeNumbers: {}
  }

  periods.forEach(period => {
    const periodData = getAvgListEmpCountPeriodFull({ orgID, dateFrom: period.dateFrom, dateTo: period.dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace, avgCount, dec })
    resultData.dayCount = accrualService.round(resultData.dayCount + periodData.dayCount, dec)
    resultData.periodDayCount += periodData.periodDayCount
    Object.keys(periodData.employeeNumbers).forEach(employeeNumberID => {
      const addEmp = resultData.employeeNumbers[employeeNumberID]
      if (!addEmp) {
        resultData.employeeNumbers[employeeNumberID] = {
          workPlace: periodData.employeeNumbers[employeeNumberID].workPlace,
          dayCount: periodData.employeeNumbers[employeeNumberID].dayCount
        }
      } else {
        resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount +
          periodData.employeeNumbers[employeeNumberID].dayCount, dec)
      }
    })
  })
  Object.keys(resultData.employeeNumbers).forEach(employeeNumberID => {
    resultData.employeeNumbers[employeeNumberID].dayCount = accrualService.round(resultData.employeeNumbers[employeeNumberID].dayCount /
      periods.length, dec)
  })
  resultData.dayCount = accrualService.round(resultData.dayCount / periods.length, dec)
  return resultData
}

function getAvgListEmpCountPeriodFull ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1', '2', '3'], avgCount = false, dec = 3 }) {
  const store = UB.DataStore('tim_timeSheet')
  const notAvgQuantityAllIDs = getReportParams(orgID, ['notAvgQuantityAll']).notAvgQuantityAllIDs
  const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
  const existNumber = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.tabNum', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'dictCategoryECBID.dictTypeTaxECBID.code',
      'employeeID.citizenshipID', 'employeeID.citizenshipID.code', 'workScheduleID.isSummarized', 'workScheduleID.periodSummarized',
      'workScheduleID.planScheduleID', 'workScheduleID', 'workScheduleID.isMtCount', 'mtCount'
    ])
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', 'in', workPlace)
    .where('payElID.methodID.code', '!=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

  const existNumberCPH = UB.Repository('hr_employeePositionS')
    .correlation('employeeNumberID', 'employeeNumberID')
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', '=', '4')
    .where('payElID.methodID.code', '=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
  if (departmentID) {
    if (includeChildDepts) {
      const depData = UB.Repository('hr_department')
        .attrs(['mi_treePath', 'orgID'])
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_data_id', '=', departmentID)
        .misc({ __mip_recordhistory_all: true })
        .groupBy(['mi_data_id', 'mi_treePath', 'orgID'])
        .limit(1)
        .selectSingle()
      const departments = depData ? UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', depData.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_treePath', 'startsWith', depData.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject() : []
      if (departments.length) {
        existNumber.where('departmentID', 'in', departments.map(o => o.mi_data_id))
        existNumberCPH.where('departmentID', 'in', departments.map(o => o.mi_data_id))
      }
    } else {
      existNumber.where('departmentID', '=', departmentID)
      existNumberCPH.where('departmentID', '=', departmentID)
    }
  }
  const empPosData = existNumber
    .orderBy('employeeNumberID').orderBy('dateFrom')
    .selectAsObject({
      'dictCategoryECBID.dictTypeTaxECBID.code': 'dictTypeTaxECBCode',
      'employeeNumberID.employeeID.sexType': 'sexType',
      'employeeID.citizenshipID.code': 'citizenshipCode',
      'workScheduleID.periodSummarized': 'periodSummarized'
    })

  const empPosDataCPH = UB.Repository('hr_employeeCPH')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('[dateFrom]', '<=', dateTo)
    .where('dateTo', '>=', dateFrom, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('(([dateTo]) or ([dateToIsNull]))')
    .exists(existNumberCPH)
    .selectAsObject()
  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  let empDayCount = 0
  const empPosDataByEmp = {}
  empPosData.forEach(posData => {
    const addEmp = !empPosDataByEmp[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmp[posData.employeeNumberID] = {
        workPlace: posData.workPlace,
        dayCount: 0
      }
    }
    if (workPlace.includes(posData.workPlace)) {
      const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData['dateFrom'])))
      const perDateTo = dateService.shiftDate(Math.min(dateTo, (dateService.shiftDate(posData['dateTo'] || dateService.maxDate()))))

      store.runSQL(`
        SELECT
        SUM(CASE WHEN tc.isFactHour = 1 OR tc.timeCostType = 'WORK' THEN COALESCE(ts.factHour, 0) ELSE CASE WHEN tc.timeCostType <> 'FREE' OR wh.isDayAsPlan = 1 THEN COALESCE(ts.normHour, 0) ELSE 0 END END) "hour", 
        SUM(CASE WHEN tc.timeCostType <> 'FREE' OR wh.isDayAsPlan = 1 THEN COALESCE(ts.normHour, 0) ELSE 0 END) "normHour"
        FROM tim_timeSheet ts 
        JOIN hr_dictTimeCost tc ON tc.ID = ts.factTimeCostID
        LEFT JOIN tim_plan pl ON pl.ID = ts.planID 
        LEFT JOIN hr_workSchedule wh ON wh.ID = pl.workScheduleID
        where ts.employeeNumberID = :employeeNumberID: AND ts.dateWork >= :dateFrom: AND ts.dateWork <= :dateTo:
        ${notAvgQuantityAllIDs.length ? `AND ts.factTimeCostID${entityBaseService.getNotInExpression('notAvgQuantityAllIDs')}` : ''}
        AND ts.isActive=1 AND ts.mi_deleteDate >= '9999-12-31'
  `, {
        dateFrom: perDateFrom,
        dateTo: perDateTo,
        notAvgQuantityAllIDs,
        employeeNumberID: posData.employeeNumberID
      })
      const workData = store.getAsJsObject()
      const workScheduleID = posData['workScheduleID.planScheduleID'] || posData.workScheduleID
      if (workScheduleID && (!empPosDataByEmp[posData.employeeNumberID].norm || empPosDataByEmp[posData.employeeNumberID].workScheduleID !== workScheduleID)) {
        let timeSheetDateFrom = dateService.shiftDate(dateFrom)
        let timeSheetDateTo = dateService.shiftDate(dateTo)
        switch (posData.periodSummarized) {
          case 'QUARTER' : {
            if ([2, 5, 8, 11].includes(timeSheetDateFrom.getMonth())) {
              timeSheetDateFrom = dateService.addMonths(timeSheetDateFrom, timeSheetDateFrom.getMonth() - 2)
            } else if ([1, 4, 7, 10].includes(timeSheetDateFrom.getMonth())) {
              timeSheetDateFrom = dateService.addMonths(timeSheetDateFrom, timeSheetDateFrom.getMonth() - 1)
              timeSheetDateTo = dateService.addMonths(timeSheetDateTo, timeSheetDateTo.getMonth() + 1)
            } else {
              timeSheetDateTo = dateService.addMonths(timeSheetDateTo, timeSheetDateTo.getMonth() + 2)
            }
            break
          }
          case 'HALFYEAR' : {
            if (timeSheetDateFrom.getMonth() < 6) {
              timeSheetDateFrom = dateService.firstDayOfYear(timeSheetDateFrom)
              timeSheetDateTo = dateService.lastDayOfMonth(dateService.addMonths(timeSheetDateFrom, 6))
            } else {
              timeSheetDateTo = dateService.lastDayOfYear(timeSheetDateTo)
              timeSheetDateFrom = dateService.firstDayOfMonth(dateService.addMonths(timeSheetDateTo, -6))
            }
            break
          }
          case 'YEAR' : {
            timeSheetDateFrom = dateService.firstDayOfYear(timeSheetDateFrom)
            timeSheetDateTo = dateService.lastDayOfYear(timeSheetDateTo)
            break
          }
        }
        empPosDataByEmp[posData.employeeNumberID].norm = UB.Repository('tim_plan')
          .attrs(['sum([workHours])'])
          .where('organizationID', '=', planByOrgID || orgID)
          .where('workScheduleID', '=', workScheduleID)
          .where('workHours', '>', 0)
          .where('dayDate', '>=', timeSheetDateFrom)
          .where('dayDate', '<=', timeSheetDateTo)
          .selectScalar() / (posData.periodSummarized === 'QUARTER' ? 3 : posData.periodSummarized === 'HALFYEAR' ? 6 : posData.periodSummarized === 'YEAR' ? 12 : 1)
      }
      empPosDataByEmp[posData.employeeNumberID].workScheduleID = workScheduleID
      const hours = (workData && workData.length) ? ((!posData.periodSummarized) ? Math.min((workData[0].hour || 0), (workData[0].normHour || 0)) : (workData[0].hour || 0)) : 0

      let dayCount = empPosDataByEmp[posData.employeeNumberID].norm > 0 ? (hours / ((empPosDataByEmp[posData.employeeNumberID].norm))) : 0
      empPosDataByEmp[posData.employeeNumberID].dayCount = accrualService.round(empPosDataByEmp[posData.employeeNumberID].dayCount + dayCount, dec)
    }
  })

  const empPosDataByEmpCPH = {}
  empPosDataCPH.forEach(posData => {
    const addEmp = !empPosDataByEmpCPH[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmpCPH[posData.employeeNumberID] = {
        mask: 0
      }
    }
    const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData['dateFrom'])))
    const perDateTo = dateService.shiftDate(Math.min(dateTo, dateService.shiftDate(posData['dateTo'] || dateTo)))
    let date = dateService.shiftDate(perDateFrom)
    for (let day = perDateFrom.getDate(); day <= perDateTo.getDate(); day++) {
      empPosDataByEmpCPH[posData.employeeNumberID].mask = empPosDataByEmpCPH[posData.employeeNumberID].mask | 1 << (day - 1)
      date = dateService.addDays(date, 1)
    }
  })
  Object.keys(empPosDataByEmpCPH).forEach(employeeNumberID => {
    const addEmp = !empPosDataByEmp[employeeNumberID]
    const dayCPH = ((empPosDataByEmpCPH[employeeNumberID].mask || 0).toString(2).match(/1/g) || []).length / periodDayCount
    if (addEmp) {
      empPosDataByEmp[employeeNumberID] = {
        dayCount: dayCPH
      }
    } else {
      empPosDataByEmp[employeeNumberID].dayCount = accrualService.round(empPosDataByEmp[employeeNumberID].dayCount + dayCPH, dec)
    }
  })

  Object.keys(empPosDataByEmp).forEach(employeeNumberID => {
    if (empPosDataByEmp[employeeNumberID].dayCount) {
      empDayCount = accrualService.round(empDayCount + empPosDataByEmp[employeeNumberID].dayCount, dec)
    }
  })

  return {
    dayCount: empDayCount,
    periodDayCount: periodDayCount,
    employeeNumbers: empPosDataByEmp
  }
}
function getAvgListEmpCountFullEnergo ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1', '3'], avgCount = false, dec = 3 }) {
  const periods = periodService.getPeriodsByDate(orgID, dateFrom, dateTo)
  const resultData = {
    dayCount: 0,
    periodDayCount: 0,
    employeeNumbers: {}
  }

  periods.forEach(period => {
    const periodData = getAvgListEmpCountPeriodFullEnergo({ orgID, dateFrom: period.dateFrom, dateTo: period.dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace, avgCount, dec })
    resultData.dayCount = currencyService.gaussRound(resultData.dayCount + periodData.dayCount, dec)
    resultData.periodDayCount += periodData.periodDayCount
    Object.keys(periodData.employeeNumbers).forEach(employeeNumberID => {
      const addEmp = resultData.employeeNumbers[employeeNumberID]
      if (!addEmp) {
        resultData.employeeNumbers[employeeNumberID] = {
          workPlace: periodData.employeeNumbers[employeeNumberID].workPlace,
          dayCount: periodData.employeeNumbers[employeeNumberID].dayCount
        }
      } else {
        resultData.employeeNumbers[employeeNumberID].dayCount = currencyService.gaussRound(resultData.employeeNumbers[employeeNumberID].dayCount +
          periodData.employeeNumbers[employeeNumberID].dayCount, dec)
      }
    })
  })
  Object.keys(resultData.employeeNumbers).forEach(employeeNumberID => {
    resultData.employeeNumbers[employeeNumberID].dayCount = currencyService.gaussRound(resultData.employeeNumbers[employeeNumberID].dayCount /
      periods.length, dec)
  })
  resultData.dayCount = currencyService.gaussRound(resultData.dayCount / periods.length, dec)
  return resultData
}

function getAvgListEmpCountPeriodFullEnergo ({ orgID, dateFrom, dateTo, departmentID, includeChildDepts, employeeNumbers, workPlace = ['1', '2', '3'], avgCount = false, dec = 3 }) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('tim_timeSheet')
  const notAvgQuantityAllIDs = getReportParams(orgID, ['notAvgQuantityAll']).notAvgQuantityAllIDs
  const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
  const existNumber = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.tabNum', 'employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
      'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'dictCategoryECBID.dictTypeTaxECBID.code',
      'employeeID.citizenshipID', 'employeeID.citizenshipID.code', 'workScheduleID.isSummarized', 'workScheduleID.periodSummarized',
      'workScheduleID.planScheduleID', 'workScheduleID', 'workScheduleID.isMtCount', 'mtCount'
    ])
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', 'in', workPlace)
    .where('payElID.methodID.code', '!=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

  const existNumberCPH = UB.Repository('hr_employeePositionS')
    .correlation('employeeNumberID', 'employeeNumberID')
    .where('[organizationID]', '=', orgID)
    .whereIf(employeeNumbers && employeeNumbers.length, 'employeeNumberID', 'in', employeeNumbers)
    .where('[dateFrom]', '<=', dateTo)
    .where('[dateTo]', '>=', dateFrom)
    .where('workPlace', '=', '4')
    .where('payElID.methodID.code', '=', '3')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
  if (departmentID) {
    if (includeChildDepts) {
      const depData = UB.Repository('hr_department')
        .attrs(['mi_treePath', 'orgID'])
        .where('orgID', '=', orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_data_id', '=', departmentID)
        .misc({ __mip_recordhistory_all: true })
        .groupBy(['mi_data_id', 'mi_treePath', 'orgID'])
        .limit(1)
        .selectSingle()
      const departments = depData ? UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', depData.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_treePath', 'startsWith', depData.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject() : []
      if (departments.length) {
        existNumber.where('departmentID', 'in', departments.map(o => o.mi_data_id))
        existNumberCPH.where('departmentID', 'in', departments.map(o => o.mi_data_id))
      }
    } else {
      existNumber.where('departmentID', '=', departmentID)
      existNumberCPH.where('departmentID', '=', departmentID)
    }
  }
  const empPosData = existNumber
    .orderBy('employeeNumberID').orderBy('dateFrom')
    .selectAsObject({
      'dictCategoryECBID.dictTypeTaxECBID.code': 'dictTypeTaxECBCode',
      'employeeNumberID.employeeID.sexType': 'sexType',
      'employeeID.citizenshipID.code': 'citizenshipCode',
      'workScheduleID.periodSummarized': 'periodSummarized'
    })
  const empPosDataCPH = UB.Repository('hr_employeeCPH')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('[dateFrom]', '<=', dateTo)
    .where('dateTo', '>=', dateFrom, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('(([dateTo]) or ([dateToIsNull]))')
    .exists(existNumberCPH)
    .exists(UB.Repository('hr_accrual')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('orgID', '=', orgID)
      .where('payElID.methodID.code', '=', '3')
      .where('periodSalary', '<=', dateTo)
      .where('periodSalary', '>=', dateFrom))
    .selectAsObject()

  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  let empDayCount = 0
  const empPosDataByEmp = {}
  empPosData.forEach(posData => {
    const addEmp = !empPosDataByEmp[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmp[posData.employeeNumberID] = {
        workPlace: posData.workPlace,
        dayCount: 0
      }
    }
    if (workPlace.includes(posData.workPlace)) {
      const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData['dateFrom'])))
      const perDateTo = dateService.shiftDate(Math.min(dateTo, (dateService.shiftDate(posData['dateTo'] || dateService.maxDate()))))
      store.runSQL(`
        SELECT
        SUM(CASE WHEN tc.isFactHour = 1 OR tc.timeCostType = 'WORK' THEN COALESCE(ts.factHour, 0) 
        ELSE CASE WHEN tc.isFactHour = 0 AND ts.orderID IS NOT NULL AND t.entityName = 'hr_timeSheetChange' 
          THEN (CASE WHEN (t.isFactHour = 1 OR t.timeCostType = 'WORK') THEN COALESCE(t.factHour, 0) ELSE COALESCE(t.normHour, 0) END)
        ELSE CASE WHEN tc.timeCostType <> 'FREE' OR wh.isDayAsPlan = 1 THEN COALESCE(ts.normHour, 0) 
        ELSE 0 END END END) "hour", 
        SUM(CASE WHEN tc.timeCostType <> 'FREE' OR wh.isDayAsPlan = 1 THEN COALESCE(ts.normHour, 0) ELSE 0 END) "normHour"
        FROM tim_timeSheet ts 
        JOIN hr_dictTimeCost tc ON tc.ID = ts.factTimeCostID
        LEFT JOIN tim_plan pl ON pl.ID = ts.planID 
        LEFT JOIN hr_workSchedule wh ON wh.ID = pl.workScheduleID
        LEFT JOIN (SELECT
              ts1.factHour, 
              ts1.normHour,
              c.entityName,
              ts1.dateWork,
              tc1.timeCostType,
              tc1.isFactHour
            FROM tim_timeSheet ts1
             JOIN hr_dictTimeCost tc1 ON tc1.ID = ts1.factTimeCostID
            LEFT JOIN hr_order o
              ON o.ID = ts1.orderID
            LEFT JOIN hr_orderClass c
              ON c.ID = o.orderClass
            WHERE ts1.employeeNumberID = :employeeNumberID:
            AND ts1.dateWork >= :dateFrom: AND ts1.dateWork <= :dateTo:
            AND ts1.isCanceled = 0
            AND c.entityName = 'hr_timeSheetChange'
            AND ts1.mi_deleteDate >= '9999-12-31') t ON t.dateWork = ts.dateWork
        
        
        where ts.employeeNumberID = :employeeNumberID: AND ts.dateWork >= :dateFrom: AND ts.dateWork <= :dateTo:
        ${notAvgQuantityAllIDs.length ? `AND ts.factTimeCostID${entityBaseService.getNotInExpression('notAvgQuantityAllIDs')}` : ''}
        AND ts.isActive=1 AND ts.mi_deleteDate >= '9999-12-31'
  `, {
        dateFrom: perDateFrom,
        dateTo: perDateTo,
        notAvgQuantityAllIDs,
        employeeNumberID: posData.employeeNumberID
      })
      const workData = store.getAsJsObject()
      const workScheduleID = posData['workScheduleID.planScheduleID'] || posData.workScheduleID
      if (workScheduleID && (!empPosDataByEmp[posData.employeeNumberID].norm || empPosDataByEmp[posData.employeeNumberID].workScheduleID !== workScheduleID)) {
        let timeSheetDateFrom = dateService.shiftDate(dateFrom)
        let timeSheetDateTo = dateService.shiftDate(dateTo)
        empPosDataByEmp[posData.employeeNumberID].norm = UB.Repository('tim_plan')
          .attrs(['sum([workHours])'])
          .where('organizationID', '=', planByOrgID || orgID)
          .where('workScheduleID', '=', workScheduleID)
          .where('workHours', '>', 0)
          .where('dayDate', '>=', timeSheetDateFrom)
          .where('dayDate', '<=', timeSheetDateTo)
          .selectScalar()
      }
      empPosDataByEmp[posData.employeeNumberID].workScheduleID = workScheduleID
      const hours = (workData && workData.length) ? ((!posData.periodSummarized) ? Math.min((workData[0].hour || 0), (workData[0].normHour || 0)) : (workData[0].normHour || 0)) : 0

      let dayCount = empPosDataByEmp[posData.employeeNumberID].norm > 0 ? (hours / ((empPosDataByEmp[posData.employeeNumberID].norm))) : 0
      empPosDataByEmp[posData.employeeNumberID].dayCount = currencyService.gaussRound(empPosDataByEmp[posData.employeeNumberID].dayCount + dayCount, dec)
    }
  })

  const empPosDataByEmpCPH = {}
  empPosDataCPH.forEach(posData => {
    const addEmp = !empPosDataByEmpCPH[posData.employeeNumberID]
    if (addEmp) {
      empPosDataByEmpCPH[posData.employeeNumberID] = {
        mask: 0
      }
    }
    const perDateFrom = dateService.shiftDate(Math.max(dateFrom, dateService.shiftDate(posData.dateFrom)))
    const perDateTo = dateService.shiftDate(Math.min(dateTo, dateService.shiftDate(posData.dateTo || dateTo)))
    let date = dateService.shiftDate(perDateFrom)
    for (let day = perDateFrom.getDate(); day <= perDateTo.getDate(); day++) {
      empPosDataByEmpCPH[posData.employeeNumberID].mask = empPosDataByEmpCPH[posData.employeeNumberID].mask | 1 << (day - 1)
      date = dateService.addDays(date, 1)
    }
  })
  Object.keys(empPosDataByEmpCPH).forEach(employeeNumberID => {
    const addEmp = !empPosDataByEmp[employeeNumberID]
    const dayCPH = ((empPosDataByEmpCPH[employeeNumberID].mask || 0).toString(2).match(/1/g) || []).length / periodDayCount
    if (addEmp) {
      empPosDataByEmp[employeeNumberID] = {
        dayCount: dayCPH
      }
    } else {
      empPosDataByEmp[employeeNumberID].dayCount = currencyService.gaussRound(empPosDataByEmp[employeeNumberID].dayCount + dayCPH, dec)
    }
  })

  Object.keys(empPosDataByEmp).forEach(employeeNumberID => {
    if (empPosDataByEmp[employeeNumberID].dayCount) {
      empDayCount = currencyService.gaussRound(empDayCount + empPosDataByEmp[employeeNumberID].dayCount, dec)
    }
  })

  return {
    dayCount: empDayCount,
    periodDayCount: periodDayCount,
    employeeNumbers: empPosDataByEmp
  }
}

/**
 * Назва організації для звітів
 * @param {Number} orgID
 * @param {Date} onDate
 * @return {Object}
 */
function getHrOrg (orgID, onDate) {
  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'description', 'nameGen', 'nameDat', 'nameLoc', 'EDRPOUCode')
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .orderBy('mi_dateFrom', 'desc')
    .limit(1)
    .selectSingle()
  return hrOrg || { name: '' }
}

/**
 * налаштування звітів
 * @param {Number} orgID
 * @return {Object}
 */
function getAccrualReportPrintConfig (orgID) {
  let logoSettings = {}
  const orgData = UB.Repository('hr_accrualReportPrintSettings')
    .attrs(['ID', 'logo', 'logoWidth', 'logoHeight'])
    .where('organizationID', '=', orgID)
    .selectSingle() || {}
  if (orgData.logo) {
    const logoData = JSON.parse(orgData.logo)
    try {
      const logoBuf = App.blobStores.getContent({
        ID: orgData.ID,
        entity: 'hr_accrualReportPrintSettings',
        attribute: 'logo'
      }, { encoding: 'bin' })
      const logoBase64 = new Buffer.from(logoBuf).toString('base64')
      logoSettings.emblem = `data:${logoData.ct || 'image/jpeg'};base64,${logoBase64}`
    } catch (e) {
    }

    logoSettings.logoWidth = orgData.logoWidth || 20
    logoSettings.logoHeight = orgData.logoHeight || 20
    logoSettings.fontSize = 14
    logoSettings.lineHeight = 1.35
    logoSettings.logoWidthPx = Math.round(logoSettings.logoWidth / 0.264583333)
    logoSettings.logoHeightPx = Math.round(logoSettings.logoHeight / 0.264583333)
    logoSettings.logoPaddingLeft = Math.max(Math.ceil((640 - logoSettings.logoWidthPx) / 2 - 66), 0)
  }
  logoSettings.isAddLogo = !!logoSettings.emblem
  return logoSettings
}
