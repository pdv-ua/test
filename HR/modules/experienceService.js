const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const accrualService = require('../../HR/modules/accrualService')

module.exports = {
  calculateExperience
}

const calculatedMethods = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Розрахунок стажу за видом стажу
 * @param {number} employeeNumberID
 * @param {number} dictExperienceID
 * @param {Date} onCalcDate
 * @param {Date} fromDate
 * @param {Boolean} isPlan (розрахунок планового стажу)
 * @param {Object} cont - контейнер даних (для автоматичного розрахунку)
 *
 * @return {Object} {totalDays: number, days: number, months: number, years: number, autoCalc: boolean}
 *                  nothing if method not in calculatedMethods
 */
function calculateExperience (employeeNumberID, dictExperienceID, onCalcDate, fromDate = null, isPlan = false, cont = null) {
  let totalExperience = 0
  let excludeExperience = 0
  const experiencePeriods = []
  let onDate = dateService.shiftDate(onCalcDate)
  let calcYMD = { years: 0, months: 0, days: 0, calcDate: onDate, autoCalc: true, excludeExperience, totalDays: totalExperience }
  const dictExperience = cont && cont.dict && cont.dict.hr_dictExperience
    ? cont.dict.hr_dictExperience.find(o => o.ID === dictExperienceID)
    : UB.Repository('hr_dictExperience')
      .attrs(['ID', 'methodExpID.code'])
      .selectById(dictExperienceID)

  if (!dictExperience) return calcYMD

  let method = dictExperience['methodExpID.code']

  fromDate = dateService.shiftDate(fromDate) || null

  const employee = cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop
    ? cont.emp[employeeNumberID].prop.employeeNumber
    : UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID', 'orgID'])
      .selectById(employeeNumberID)

  if (employee) {
    const checkContinuation = ['2', '7'].includes(method)

    const startWork = dateService.shiftDate(employee.dateFrom)
    const endWork = isPlan ? onDate : dateService.shiftDate(employee.dateTo)

    if (isPlan) {
      const dateFrom = fromDate || startWork
      totalExperience = dateService.dayDiff(dateFrom, onDate) + 1
      experiencePeriods.push({ dateFrom, dateTo: onDate })
      calcYMD = dateService.getYmd(dateFrom, onDate, true)
      return {
        totalDays: totalExperience,
        years: calcYMD.years,
        months: calcYMD.months,
        days: calcYMD.days,
        calcDate: dateService.getCalcDate(calcYMD.years, calcYMD.months, calcYMD.days, onDate),
        autoCalc: true,
        excludeExperience,
        experiencePeriods
      }
    }

    if (method === '8') {
      const details = cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.experienceDt
        ? cont.emp[employeeNumberID].prop.experienceDt.filter(o => o.dictExperienceID === dictExperienceID)
        : UB.Repository('hr_employeeExperienceDt')
          .attrs(['ID', 'dateFrom', 'dateTo', 'koef'])
          .where('employeeExperienceID.dictExperienceID', '=', dictExperienceID)
          .where('employeeExperienceID.employeeNumberID', '=', employeeNumberID, 'empNum')
          .where('employeeExperienceID.employeeNumberID', 'isNull', undefined, 'empNumNull')
          .where('employeeExperienceID.employeeID', '=', employee.employeeID || null)
          .where('employeeExperienceID.mi_deleteDate', '>=', '#maxdate')
          .logic('([empNum] OR [empNumNull])')
          .where('dateFrom', '<=', onDate)
          .selectAsObject()
      if (details.length) {
        const daysTotal = details.reduce((days, det) => {
          const dateFrom = dateService.shiftDate(det.dateFrom)
          const dateTo = det.dateTo ? dateService.shiftDate(det.dateTo) : onDate
          experiencePeriods.push({ dateFrom, dateTo })
          days += Math.floor(dateService.dateDiff(dateFrom, dateTo < onDate ? dateTo : onDate) * (det.koef || 1))
          return days
        }, 0)
        const calcDate = dateService.addDays(onDate, -1 * daysTotal)
        const calcYMD = dateService.getYmd(calcDate, onDate, true)
        return {
          totalDays: daysTotal,
          years: calcYMD.years,
          months: calcYMD.months,
          days: calcYMD.days,
          calcDate: calcDate,
          autoCalc: true,
          excludeExperience,
          experiencePeriods
        }
      }
    }
    if (method === '4') {
      let dictTimeCostIDs = []
      if (cont && cont.payEl) {
        Object.keys(cont.payEl).forEach(payElID => {
          if (cont.payEl[payElID].method.code === '57' && cont.payEl[payElID].dictTimeCostID) {
            dictTimeCostIDs.push(cont.payEl[payElID].dictTimeCostID)
          }
        })
      } else {
        dictTimeCostIDs = UB.Repository('hr_payEl')
          .attrs(['dictTimeCostID'])
          .where('methodID.code', '=', '57')
          .where('dictTimeCostID', 'isNotNull')
          .selectAsObject().map(o => o.dictTimeCostID)
      }
      if (dictTimeCostIDs.length) {
        excludeExperience = UB.Repository('tim_timeSheet')
          .attrs(['count(*)'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('isActive', '=', 1)
          .where('factTimeCostID', 'in', dictTimeCostIDs)
          .where('dateWork', '<=', onDate)
          .whereIf(fromDate, 'dateWork', '>=', fromDate)
          .selectScalar() || 0
      }
    }
    if (dictExperience) {
      const employeeExperience = cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.experience
        ? cont.emp[employeeNumberID].prop.experience.find(o => o.dictExperienceID === dictExperienceID)
        : UB.Repository('hr_employeeExperience')
          .attrs('*')
          .where('employeeID', '=', employee.employeeID || null)
          .where('dictExperienceID', '=', dictExperience.ID)
          .where('employeeNumberID', '=', employeeNumberID, 'empNum')
          .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
          .logic('([empNum] OR [empNumNull])')
          .orderByDesc('employeeNumberID')
          .limit(1)
          .selectSingle()
      if (employeeExperience) {
        // есть приведенная дата начала
        const startCalcDate = dateService.shiftDate(employeeExperience.startCalcDate)
        const calcDate = dateService.shiftDate(employeeExperience.calcDate)
        let dateTo = startCalcDate && startCalcDate < onDate ? startCalcDate : onDate
        const dateFrom = fromDate && fromDate > calcDate ? fromDate : calcDate
        if (excludeExperience) {
          dateTo = dateService.addDays(dateTo, -1 * excludeExperience)
        }
        if (dateFrom <= dateTo) {
          calcYMD = dateService.getYmd(dateFrom, dateTo, true)
          totalExperience = dateService.dayDiff(dateFrom, dateTo) + 1
          experiencePeriods.push({ dateFrom, dateTo })
        }
        return {
          totalDays: totalExperience,
          years: calcYMD.years,
          months: calcYMD.months,
          days: calcYMD.days,
          calcDate: dateService.getCalcDate(calcYMD.years, calcYMD.months, calcYMD.days, onDate),
          autoCalc: false,
          excludeExperience,
          experiencePeriods
        }
      }
    }

    if (!method || !calculatedMethods.includes(method) || method === '8') {
      return {
        years: 0,
        months: 0,
        days: 0,
        calcDate: dateService.getCalcDate(calcYMD.years, calcYMD.months, calcYMD.days, onDate),
        autoCalc: true,
        excludeExperience,
        totalDays: 0,
        experiencePeriods
      }
    }

    const expList = []
    const excludeOutOf = ['1', '2', '3', '4'].includes(method)
    const onlyGovExp = ['6', '7'].includes(method)
    if (method === '2') method = '1'
    if (method === '7') method = '6'

    let employeePositions = []
    if (method !== '4' && method !== '9') {
      if (cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop.employeePositions) {
        employeePositions = cont.emp[employeeNumberID].prop.employeePositions.filter(o => o.employeeNumberID === employeeNumberID)
      } else {
        employeePositions = UB.Repository('hr_employeePositionS')
          .attrs(['dateFrom', 'dateTo', 'dictStaffCatID', 'dictPositionID', 'workPlace', 'dictStaffCatID.accCategory'])
          .where('employeeNumberID', '=', employeeNumberID)
          .orderBy('dateFrom')
          .selectAsObject()
        employeePositions.forEach(pos => {
          pos.dateFrom = dateService.shiftDate(pos.dateFrom)
          pos.dateTo = !pos.dateTo ? dateService.maxDate() : dateService.shiftDate(pos.dateTo)
        })
      }
      if (excludeOutOf) {
        employeePositions = employeePositions.filter(o => o.workPlace !== '4')
      } else if (onlyGovExp) {
        employeePositions = employeePositions.filter(o => o['dictStaffCatID.accCategory'] === '2')
      }
      const dictExperienceDt = getDictExperienceDt(cont, dictExperienceID)
      employeePositions = applyDictExperienceDt(dictExperienceDt, employee.orgID, fromDate || startWork, onDate, employeePositions)
    }

    if (['1', '2', '3', '6', '7'].includes(method)) {
      employeePositions.forEach(pos => {
        expList.push({
          dateFrom: pos.dateFrom,
          dateTo: pos.dateTo,
          coef: 1
        })
      })
    }

    const expWbList = dictExperience && method !== '9'
      ? (cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop
        ? cont && cont.emp[employeeNumberID].prop.workBookDet.filter(o => o.dateFrom <= onDate && o.dictExperienceID === dictExperience.ID)
        : UB.Repository('hr_employeeWorkbookDt')
          .attrs(['dateFrom', 'dateTo', 'coefficient'])
          .orderBy('dateFrom')
          .where('employeeWorkbookID.employeeID', '=', employee.employeeID)
          .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
          .where('employeeWorkbookID.mi_deleteDate', '>=', '#maxdate')
          .where('dateFrom', '<=', onDate)
          .where('dictExperienceID', '=', dictExperience.ID || null)
          .orderBy('dateFrom', 'asc')
          .selectAsObject())
      : []

    expWbList.forEach(record => {
      expList.push({
        dateFrom: dateService.shiftDate(record.dateFrom),
        dateTo: !record.dateTo ? dateService.maxDate() : dateService.shiftDate(record.dateTo),
        coef: record.coefficient || 1
      })
    })

    if (method === '4') {
      const dictSalaryMinSize = cont
        ? cont.dict.hr_dictSalaryMinSize
        : UB.Repository('hr_dictSalaryMinSize')
          .attrs('*')
          .orderBy('dateFrom', 'desc')
          .selectAsObject()
      let accrualsFund = []
      if (cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop) {
        if (!cont.emp[employeeNumberID].prop.experienceAccrualFundList) {
          cont.emp[employeeNumberID].prop.experienceAccrualFundList = UB.Repository('hr_accrualFund')
            .attrs(['periodSalaryID.dateFrom', 'periodSalaryID.dateTo', 'baseSum'])
            .where('employeeNumberID', '=', employeeNumberID)
            .where('orgID', '=', employee.orgID)
            .where('payFundID.payFundMethodID.code', '=', '1')
            .orderBy('periodSalaryID.dateFrom')
            .selectAsObject({ 'periodSalaryID.dateFrom': 'dateFrom', 'periodSalaryID.dateTo': 'dateTo' })
        }
        accrualsFund = cont.emp[employeeNumberID].prop.experienceAccrualFundList
      } else {
        accrualsFund = UB.Repository('hr_accrualFund')
          .attrs(['periodSalaryID.dateFrom', 'periodSalaryID.dateTo', 'baseSum'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('orgID', '=', employee.orgID)
          .where('periodSalary', '<=', onDate)
          .where('payFundID.payFundMethodID.code', '=', '1')
          .orderBy('periodSalaryID.dateFrom')
          .selectAsObject({ 'periodSalaryID.dateFrom': 'dateFrom', 'periodSalaryID.dateTo': 'dateTo' })
      }
      accrualsFund.forEach(record => {
        let dateFrom = dateService.shiftDate(record.dateFrom)
        if (dateFrom <= onDate) {
          let dateTo = dateService.shiftDate(record.dateTo)
          if (dateFrom <= onDate && onDate < dateTo) {
            dateTo = onDate
          }

          dateFrom = startWork > dateFrom ? startWork : dateFrom
          const daysWork = dateService.dayDiff(dateFrom, dateTo)

          const minSizeDict = dictSalaryMinSize.filter(item => dateService.shiftDate(item.dateFrom) < dateFrom)
          let minSalary = minSizeDict.length ? minSizeDict[0].monthValue : 0
          minSalary = accrualService.round(minSalary * daysWork / dateService.dayDiff(dateService.shiftDate(record.dateFrom), dateService.shiftDate(record.dateTo)))

          expList.push({
            dateFrom: dateFrom,
            dateTo: dateTo,
            coef: Math.min(1, record.baseSum / minSalary)
          })
        }
      })
      let accruals = []
      if (cont && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop) {
        if (!cont.emp[employeeNumberID].prop.experienceAccrualList) {
          cont.emp[employeeNumberID].prop.experienceAccrualList = UB.Repository('hr_accrual')
            .attrs(['periodSalaryID.dateFrom', 'periodSalaryID.dateTo'])
            .where('employeeNumberID', '=', employeeNumberID)
            .where('orgID', '=', employee.orgID)
            .where('payElID.methodID.code', 'in', ['14', '57', '140'])
            .orderBy('periodSalaryID.dateFrom')
            .selectAsObject({ 'periodSalaryID.dateFrom': 'dateFrom', 'periodSalaryID.dateTo': 'dateTo' })
        }
        accruals = cont.emp[employeeNumberID].prop.experienceAccrualList
      } else {
        accruals = UB.Repository('hr_accrual')
          .attrs(['periodSalaryID.dateFrom', 'periodSalaryID.dateTo'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('orgID', '=', employee.orgID)
          .where('periodSalary', '<=', onDate)
          .where('payElID.methodID.code', 'in', ['14', '57', '140'])
          .orderBy('periodSalaryID.dateFrom')
          .selectAsObject({ 'periodSalaryID.dateFrom': 'dateFrom', 'periodSalaryID.dateTo': 'dateTo' })
      }
      accruals.forEach(record => {
        let dateFrom = dateService.shiftDate(record.dateFrom)
        if (dateFrom <= onDate) {
          let dateTo = dateService.shiftDate(record.dateTo)
          if (dateFrom <= onDate && onDate < dateTo) {
            dateTo = onDate
          }

          dateFrom = startWork > dateFrom ? startWork : dateFrom
          dateTo = dateTo > endWork ? endWork : dateTo

          expList.push({
            dateFrom: dateFrom,
            dateTo: dateTo,
            coef: 1
          })
        }
      })
    }

    if (method === '9') {
      let pAccruals = []
      if (cont && cont.payEl && cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop.employeeAccruals) {
        const payElIDs = []
        Object.keys(cont.payEl).forEach(payEl => { if (['14', '57', '140'].includes(cont.payEl[payEl].method.code)) payElIDs.push(cont.payEl[payEl].ID) })
        pAccruals = cont.emp[employeeNumberID].prop.employeeAccruals.filter(o => payElIDs.includes(o.payElID) && o.dateFrom < onDate)
      } else {
        pAccruals = UB.Repository('hr_employeeAccrual')
          .attrs(['dateFrom', 'dateTo'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('payElID.methodID.code', 'in', ['14', '57', '140'])
          .where('dateFrom', '<=', onDate)
          .selectAsObject()
      }

      pAccruals.forEach(record => {
        const dateFrom = dateService.shiftDate(record.dateFrom)
        let dateTo = dateService.shiftDate(record.dateTo)
        if (dateFrom <= onDate && onDate < dateTo) {
          dateTo = onDate
        }

        dateTo = dateTo > endWork ? endWork : dateTo
        expList.push({
          dateFrom: dateFrom,
          dateTo: dateTo,
          coef: 1
        })
      })
    }

    let expListCorrected = joinPeriods(expList.sort((a, b) => a.dateFrom.getTime() - b.dateFrom.getTime()))

    if (fromDate) {
      const tmpExpList = []
      expListCorrected.forEach(period => {
        if (period.dateTo > fromDate) {
          if (period.dateFrom < fromDate) period.dateFrom = fromDate
          tmpExpList.push(period)
        }
      })
      expListCorrected = tmpExpList
    }

    let daysCount = 0
    if (expListCorrected.length) {
      expListCorrected.forEach(row => {
        experiencePeriods.push({
          dateFrom: row.dateFrom,
          dateTo: dateService.shiftDate(row.dateTo) > onDate ? onDate : row.dateTo
        })
      })

      if (checkContinuation) {
        totalExperience = calcMaxPeriod(expListCorrected, 2, onDate)
      } else {
        expListCorrected.forEach(period => {
          daysCount = dateService.dayDiff(period.dateFrom, dateService.shiftDate(period.dateTo) > onDate ? onDate : period.dateTo) + 1
          const coef = period.coef ? period.coef : 1
          totalExperience += Math.floor(daysCount * coef)
        })
      }
      totalExperience -= excludeExperience
      const calcDate = dateService.addDays(onDate, 1 - totalExperience)
      calcYMD = totalExperience > 0 ? dateService.getYmd(calcDate, onDate, true) : { years: 0, months: 0, days: 0 }
    }
    // else {
    //   if (['1', '2', '3', '4'].includes(method)) {
    //     const dateFrom = dateService.shiftDate(employee.dateFrom)
    //     let dateTo = dateService.shiftDate(employee.dateTo)
    //     dateTo = dateTo > onDate ? onDate : dateTo
    //     totalExperience = dateService.dayDiff(dateFrom, dateTo) + 1
    //     totalExperience -= excludeExperience
    //     calcYMD = totalExperience > 0 ? dateService.getYmd(dateFrom, dateTo, true) : { years: 0, months: 0, days: 0 }
    //   }
    // }
  }
  return {
    totalDays: totalExperience,
    years: calcYMD.years,
    months: calcYMD.months,
    days: calcYMD.days,
    calcDate: dateService.getCalcDate(calcYMD.years, calcYMD.months, calcYMD.days, onDate),
    autoCalc: true,
    excludeExperience,
    experiencePeriods
  }
}

function joinPeriods (list) {
  const result = []
  list.forEach(record => {
    const idx = result.findIndex(el => el.dateFrom <= record.dateFrom && record.dateFrom <= el.dateTo)
    if (idx >= 0) {
      if (result[idx].coef >= record.coef) {
        if (result[idx].dateTo < record.dateTo || !record.dateTo) {
          result[idx].dateTo = record.dateTo
        }
      } else {
        if (result[idx].dateTo > record.dateTo) {
          const newDateTo = result[idx].dateTo
          result[idx].dateTo = dateService.addDays(record.dateFrom, -1)
          result.push(record)
          result.push({
            dateFrom: dateService.addDays(record.dateTo, 1),
            dateTo: newDateTo,
            coef: result[idx].coef
          })
        } else {
          result[idx].dateTo = dateService.addDays(record.dateFrom, -1)
          result.push(record)
        }
      }
    } else {
      result.push(record)
    }
  })
  return result
}

function checkDateTo (dateTo, onDate) {
  return !dateTo || dateService.isMaxDate(dateTo) || dateTo > onDate ? onDate : dateTo
}

function calcMaxPeriod (list, maxDiff, onDate) {
  if (!list.length) return 0
  list.forEach((el, i) => {
    const dateTo = checkDateTo(el.dateTo, onDate)
    el.days = dateService.dayDiff(el.dateFrom, dateTo) + 1
    el.ymd = dateService.getYmd(el.dateFrom, dateTo, true)
    el.diff = i === 0 ? 0 : dateService.dayDiff(list[i - 1].dateTo, el.dateFrom)
  })
  let maxDays = list[0].days
  let curPeriodDays = list[0].days
  for (let i = 1; i < list.length; i++) {
    if (list[i].diff < maxDiff) {
      curPeriodDays += list[i].days
    } else {
      if (maxDays < curPeriodDays) {
        maxDays = curPeriodDays
      }
      curPeriodDays = list[i].days
    }
  }
  if (maxDays < curPeriodDays) {
    maxDays = curPeriodDays
  }
  return maxDays
}

/**
 * Довідник Умови застосування стажу
 * @param   {Object}  cont  - контекст
 * @param   {Number}  expID - ID стажу, або null - усі стажі
 * @return  {Array}   dictExperienceDt, або null
 */
function getDictExperienceDt (cont, expID = null) {
  let dictExperienceDt = null
  if (cont && cont.dict && cont.dict.hr_dictExperienceDt) {
    dictExperienceDt = cont.dict.hr_dictExperienceDt
    if (expID) {
      dictExperienceDt = dictExperienceDt.filter(o => o.dictExperienceID === expID)
    }
  }
  if (!dictExperienceDt) {
    dictExperienceDt = UB.Repository('hr_dictExperienceDt')
      .attrs(['ID', 'conditionType', 'dictStaffCatID', 'organizationID', 'dictPositionID', 'dateFrom', 'dateTo'])
      .whereIf(expID, 'dictExperienceID', '=', expID)
      .selectAsObject()
    dictExperienceDt.forEach(rec => {
      rec.dateFrom = dateService.shiftDate(rec.dateFrom)
      rec.dateTo = dateService.shiftDate(rec.dateTo)
    })
  }
  return dictExperienceDt
}

/**
 * Фільтрація призначень працівника за умовами застосування стажу по організаціям, категоріям персоналу, посадам
 * @param   {Array}  dictExperienceDt
 * @param   {Number}  orgID
 * @param   {Date}    dateFrom
 * @param   {Date}    dateTo
 * @param   {Array}   employeePositions
 * @return  {Array}   employeePositions
 */
function applyDictExperienceDt (dictExperienceDt, orgID, dateFrom, dateTo, employeePositions) {
  if (!dictExperienceDt) {
    return employeePositions || []
  }

  // По переліку організацій. Якщо перелік пустий, не обмежувати
  const orgList = dictExperienceDt.filter(o => o.conditionType === '1')
  if (orgList.length && !orgList.find(o => o.organizationID === orgID && o.dateFrom <= dateTo && o.dateTo >= dateFrom)) {
    return []
  }

  // По переліку категорій персоналу. Якщо перелік пустий, не обмежувати
  const catList = dictExperienceDt.filter(o => o.conditionType === '2')
  if (catList.length > 0) {
    employeePositions = employeePositions.filter(pos => catList.find(cat => cat.dictStaffCatID === pos.dictStaffCatID &&
      cat.dateFrom <= pos.dateTo && cat.dateTo >= pos.dateFrom))
  }

  // По переліку посад. Якщо перелік пустий, не обмежувати
  const posList = dictExperienceDt.filter(o => o.conditionType === '3')
  if (posList.length) {
    employeePositions = employeePositions.filter(emp => {
      return posList.find(pos => {
        return pos.dictPositionID === emp.dictPositionID &&
          pos.dateFrom <= emp.dateTo &&
          pos.dateTo >= emp.dateFrom
      })
    })
  }

  return employeePositions || []
}
