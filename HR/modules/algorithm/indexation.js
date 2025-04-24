/**
 * Індексація
 */
const UB = require('@unitybase/ub')
const accrualService = require('../../../HR/modules/accrualService')
const algorithmService = require('../../../HR/modules/algorithmService')
const postingService = require('../../../HR/modules/postingService')
const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  let correctDateTo
  if (!(flagsFix & 1 << 9)) {
    const lastPosition = algorithmService.getLastPosition(cont.emp[cont.employeeNumberID].prop.employeePositions, params.dateFrom, params.dateTo)
    params.baseDate = flagsFix & 1 << 10
      ? dateService.shiftDate(params.baseDate)
      : (lastPosition && lastPosition.raiseSalary) ? dateService.shiftDate(lastPosition.raiseSalary) : null
    if (!(flagsFix & 1 << 10) && lastPosition && lastPosition.raiseSalary &&
        periodSalary.dateFrom <= params.baseDate && periodSalary.dateTo >= params.baseDate) {
      params.baseDate = null
      correctDateTo = dateService.addDays(params.baseDate, -1)
    }
    if (!params.baseDate && lastPosition) {
      if (lastPosition.dateFrom.getTime() === cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom.getTime()) {
        params.baseDate = dateService.shiftDate(lastPosition.dateFrom)
        if (periodSalary.dateFrom <= lastPosition.dateTo && periodSalary.dateTo >= lastPosition.dateTo) {
          correctDateTo = dateService.addDays(lastPosition.dateFrom, -1)
        }
      } else {
        for (let index = cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1; index >= 0; index--) {
          const curPos = cont.emp[cont.employeeNumberID].prop.employeePositions[index]
          if (!params.baseDate && curPos.dateTo < lastPosition.dateFrom &&
            (curPos.raiseSalary || curPos.accrualSum < lastPosition.accrualSum)) {
            params.baseDate = (curPos.accrualSum < lastPosition.accrualSum && !(periodSalary.dateFrom <= curPos.dateTo && periodSalary.dateTo >= curPos.dateTo))
              ? dateService.addMonths(curPos.dateTo, 1)
              : dateService.shiftDate(curPos.raiseSalary)
            if (curPos.accrualSum < lastPosition.accrualSum && (periodSalary.dateFrom <= curPos.dateTo && periodSalary.dateTo >= curPos.dateTo)) {
              correctDateTo = dateService.shiftDate(curPos.dateTo)
            }
          }
        }
        if (!params.baseDate) {
          params.baseDate = dateService.shiftDate(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom)
        }
      }
    }
    if (params.baseDate && !(periodSalary.dateFrom <= params.baseDate && periodSalary.dateTo >= params.baseDate)) {
      let koef = 1
      let date = params.dateFrom <= dateService.shiftDate(params.baseDate) && params.dateTo >= dateService.shiftDate(params.baseDate)
        ? dateService.shiftDate(params.baseDate)
        : dateService.addMonths(dateService.shiftDate(params.baseDate), 1)
      if (params.dateFrom <= dateService.shiftDate(params.baseDate) && params.dateTo >= dateService.shiftDate(params.baseDate)) {
        correctDateTo = dateService.shiftDate(Math.max(dateService.addDays(params.baseDate, -1), params.dateFrom))
      }
      let subIndex = 1
      const salaryDateFrom = dateService.addMonths(periodSalary.dateFrom, -1)
      while (date < salaryDateFrom) {
        const indexSalary = cont.dict.hr_dictIndexSalary.find(o => date >= o.dateFrom)
        if (indexSalary) {
          subIndex = accrualService.round(subIndex * indexSalary.indexValue / 100, 8)
        }
        if (accrualService.round(subIndex, 3) > 1.03) {
          koef = accrualService.round(koef * accrualService.round(subIndex, 3), 8)
          subIndex = 1
        }
        date = dateService.addMonths(date, 1)
      }
      params.rate = accrualService.round((koef - 1) * 100, 1)
    } else {
      params.rate = 1
    }
  }
  let mtCount = params.mtCount
  let position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= params.dateFrom && o.dateTo >= params.dateFrom) || {}
  if (position && position.workPlace === '2' && !(flagsFix & 1 << 8)) {
    const mainPosition = UB.Repository('hr_employeePositionS')
      .attrs(['mtCount', 'payElID'])
      .where('employeeID', '=', position.employeeID)
      .where('organizationID', '=', position.organizationID)
      .where('employeeNumberID', '!=', position.employeeNumberID)
      .where('dateFrom', '<=', params.dateFrom)
      .where('dateTo', '>=', params.dateFrom)
      .where('workPlace', 'in', ['1', '2'])
      .selectAsObject()
    let allMtCount = 0
    mainPosition.forEach(row => {
      if (row.payElID) {
        allMtCount += (cont.payEl[row.payElID].isMtCount ? (row.mtCount || 0) : 1)
      }
    })
    mtCount = Math.max(Math.min(params.mtCount, 1 - Math.min(1, allMtCount)), 0)
  } else if (position && position.workPlace === '3' && !(flagsFix & 1 << 8)) {
    mtCount = 0
    const employeeDocs = UB.Repository('hr_employeeDocs')
      .attrs(['mtCount', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', position.employeeID)
      .where('dictDocKindID.docType', '=', '4')
      .selectAsObject()
    employeeDocs.forEach(row => {
      row.dateFrom = row.dateFrom ? dateService.shiftDate(row.dateFrom) : params.dateFrom
      row.dateTo = row.dateTo ? dateService.shiftDate(row.dateTo) : params.dateTo
      if (row.dateFrom <= params.dateTo && row.dateTo >= params.dateFrom) {
        mtCount = Math.max(Math.min(row.mtCount, 1 - Math.min(1, params.mtCount)), 0)
      }
    })
  } else {
    mtCount = params.mtCount
  }

  //add pdv 02.09.24
  //add sort 12.08.24
  // Индексация считается по первому посадовому месту

  const empList =[]
  
    const empListTmp = Object.keys(cont.emp).map(numberIDD => cont.emp[numberIDD])
      .filter(e =>e.prop && e.prop.employeeNumber && e.prop.employeeNumber.empWorkPlace === "5" 
      && e.accrual && e.accrual.length && e.salaryAccrual && e.salaryAccrual.length &&
      (e.prop.timeSheets
        ? e.prop.timeSheets.filter(o => o.dateWork >= periodSalary.dateFrom && o.dateWork <= periodSalary.dateTo && (!o.employeeNumberID || o.employeeNumberID === e.prop.employeeNumber.ID))
        : []).length)
      .sort((a,b) => (a && a.prop && a.prop.employeeNumber?a.prop.employeeNumber.tabNumSort:9999) - (b && b.prop && b.prop.employeeNumber?b.prop.employeeNumber.tabNumSort:9999))

    
    const accrarr = []
    empListTmp.map(e => e.salaryAccrual).forEach(e => e.forEach(ee => accrarr.push(ee)))
    const filterd = accrarr.filter(sa => sa.dateFrom >= periodSalary.dateFrom && sa.dateTo <= periodSalary.dateTo).sort((a,b) => b.mtCount - a.mtCount).sort((a,b) => a.dateFrom - b.dateFrom)
      
    filterd.forEach(sa => {
        if (!empList.length || empList[empList.length-1].dateTo<sa.dateFrom) 
          //|| empList.map(e => e.mtCount).reduce((partialSum, a) => partialSum + a, 0)<1) 
          empList.push(sa)
    })

    // Если в массиве более 1 посадового, то разные периоды (возможно смена посадового)
    if (empList.length>1) params.diffPeriods = 1

    // Если ставка меньше 1, добавляем другие посадовые чтоб добрать до 1 ставки
    //if (empList.map(e => e.mtCount).reduce((partialSum, a) => partialSum + a, 0)<1) {
      filterd.forEach(sa => {
        if (!empList.map(e=>e.ID).includes(sa.ID)) {
          empList.push(sa)
          params.fixDays = 1
        }  
      })
    //}
  
  // Если не нашли посадовые, то прилетели прошлые периоды
  if (!empList.length&&empListTmp.length) {
    const emp = cont.employeeNumberID
    empListTmp.forEach(el => {
      if (empList.map(e => e.mtCount).reduce((partialSum, a) => partialSum + a, 0)<1) {
        cont.employeeNumberID = el.prop.employeeNumber.ID
        const sa = accrualService.getSalaryAccrual({ orgID: cont.orgID, cont, periodSalary })
        if (sa) sa.forEach(s => {
          if (!s.planDays) {
            const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
            const payTime = algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, s.dateFrom, s.dateTo)
            s.days = payTime.days
            s.hours = payTime.hours
            s.planDays = payTime.planDays
            s.planHours = payTime.planHours
            params.fixDays = 1
          }
        empList.push(s)})
      }  
    })
    cont.employeeNumberID = emp
  }

  if (correctDateTo && !(params.flagsFix & 1 << 3)) {
    //cont.employeeNumberID = e.employeeNumberPartID
    params.dateTo = correctDateTo
    const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
    const payTime = algorithmService.getTimeByAccrual(cont, params.payElID, timeSheets, params.dateFrom, params.dateTo)
    //cont.employeeNumberID = IDD
    params.days = payTime.days
    params.hours = payTime.hours
    params.mask = payTime.mask
    params.hoursByDays = payTime.hoursByDays
    params.planHoursByDays = payTime.planHoursByDays
  }

  const livingCost = cont.dict.hr_dictLivingCost.find(o => o.dateFrom <= params.dateFrom)
  let paySum = 0

  if (empList.length > 0) {
     
    const empID = cont.employeeNumberID
    let allworkingPerson = 0
    let allmt = []
    //let allmtCount = 0

    empList.forEach(emp => {
     cont.employeeNumberID = emp.employeeNumberID
     let allmtCount = allmt[emp.dateFrom] || 0
     let baseSum = 0      
     if (params.fixDays) {
      const timeSheets = algorithmService.getTimeSheetByPeriod(periodSalary, cont)
      const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets: timeSheets, dateFrom: params.dateFrom, dateTo: params.dateTo, isCorrection: periodSalary.dateFrom > periodCalc.dateTo, planByNorm: true })
      params.days = payTime.days
      params.hours = payTime.hours
      params.mask = payTime.mask
      params.planDays = payTime.planDays
      params.planHours = payTime.planHours
      params.hoursByDays = payTime.hoursByDays
      params.planHoursByDays = payTime.planHoursByDays
      params.fixDays = 0
     }

     const timeKoef = Math.min(1,
       cont.payEl[params.payElID].calcSumType !== 'FACT'
         ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? emp.planHours : emp.planDays)
           ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? emp.hours : emp.days) /
             ((!params.flagsRec || params.flagsRec & 1 << 5) ? emp.planHours : emp.planDays)
           ) : 0) : 1)

           if (!(params.flagsFix & 1)) {
             if (cont.payEl[params.payElID].calcSumType !== 'FACT') {
               baseSum *= emp.mtCount
             }
             
             if (livingCost && livingCost.workingPerson) {

               //add pdv 07.08.2024
               //не может быть начисленна индексация более чем на 1 ставку
               if ((allmtCount+emp.mtCount)>1) emp.mtCount = 1 - allmtCount;
               allmtCount +=emp.mtCount
               allmt[emp.dateFrom] = allmtCount

               let workingPerson = cont.payEl[params.payElID].calcSumType !== 'FACT' ? livingCost.workingPerson
                 : (livingCost.workingPerson / (((!params.flagsRec || params.flagsRec & 1 << 5) ? emp.planHours : emp.planDays) /
                 ((!params.flagsRec || params.flagsRec & 1 << 5) ? emp.hours : emp.days))) * (emp.mtCount)
               
                 if (!workingPerson || workingPerson === NaN) workingPerson = 0
               //add pdv 27.08.2024
               if (livingCost && livingCost.workingPerson && (allworkingPerson+workingPerson)>livingCost.workingPerson) workingPerson = livingCost.workingPerson - allworkingPerson
               baseSum = timeKoef === 0 ? 0 : Math.min(params.baseSum, workingPerson)
               allworkingPerson += workingPerson
             }
           }
           paySum += params.rate > 1 ? ((flagsFix & 1 << 1)
             ? params.paySum
             : (baseSum * timeKoef * (params.rate / 100)) || 0
           ) : 0      

    })
    paySum = accrualService.roundPayEl(paySum || 0, cont.payEl[params.payElID].roundUpTo)
    params.baseSum = paySum === 0 ? 0 : Math.min(params.baseSum, allworkingPerson)
    cont.employeeNumberID = empID
   
 } else {
  const timeKoef = Math.min(1,
    cont.payEl[params.payElID].calcSumType !== 'FACT'
      ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays)
        ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days) /
          ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays)
        ) : 0) : 1)


      
  if (!(params.flagsFix & 1)) {
    if (cont.payEl[params.payElID].calcSumType !== 'FACT') {
      params.baseSum *= params.mtCount
    }
    if (mtCount !== params.mtCount) {
      params.baseSum = params.baseSum / params.mtCount * mtCount
    }
    if (livingCost && livingCost.workingPerson) {
      let workingPerson = cont.payEl[params.payElID].calcSumType !== 'FACT' ? livingCost.workingPerson
        : (livingCost.workingPerson / (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) /
        ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)))
      //add pdv 07.08.2024
      //не может быть начисленна индексация более чем на 1 ставку
      if (mtCount>1) mtCount = 1
      //add pdv 27.08.2024
      if (livingCost && livingCost.workingPerson && workingPerson>livingCost.workingPerson) workingPerson = livingCost.workingPerson
      params.baseSum = timeKoef === 0 ? 0 : Math.min(params.baseSum, workingPerson * (mtCount || 1))
    }
  }
    paySum = params.rate > 1 ? ((flagsFix & 1 << 1)
    ? params.paySum
    : accrualService.roundPayEl((params.baseSum * timeKoef * (params.rate / 100)) || 0, cont.payEl[params.payElID].roundUpTo)
  ) : 0
 }

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    baseSum: accrualService.round(params.baseSum),
    rate: params.rate,
    baseDate: params.baseDate,
    paySum,
    mask: params.mask,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    dictFundSourceID: params.dictFundSourceID,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr,
      params: {
        flagsFix,
        periodSalary,
        dictFundSourceID: params.dictFundSourceID || null,
        dictProgClassID: params.dictProgClassID || null,
        dictProjectID: params.dictProjectID || null,
        accrualDt: params.accrualDt || null,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        payElID: params.payElID,
        paySum
      }
    })
  }
}
