const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const _ = require('lodash')
const periodService = require('../../HR/modules/periodService')
const payElService = require('../../HR/modules/payElService')
const dateService = require('../../AC/modules/dataServices/dateService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')

module.exports = {
  getID,
  getPermanentAccrual,
  getPermanentFund,
  getMask,
  getAccrual,
  getAccrualAvgByAccrual,
  getAccrualByPeriodForEmployeeNumbers,
  getAccrualFundByPeriodForEmployeeNumbers,
  getFundAccrual,
  removeAutoCalcAccrual,
  removeIncorrectAccrual,
  getReCalcDate,
  setRecalculatePeriod,
  getRecalculatePeriod,
  saveAutoCalcAccrual,
  saveAccrual,
  saveAccruals,
  saveFundAccruals,
  saveAutoCalcAccrualFund,
  deleteAccrual,
  deleteAccrualsByOrder,
  deleteFundAccrualsByOrder,
  round,
  trunc,
  roundPayEl,
  roundSum,
  roundValue,
  getBalanceAccrual,
  savePeriodEmpBalance,
  getAccrualForRl,
  getAccrualBalance,
  getAccrualBalanceByFund,
  getAccrualBalanceForEmployeeNumbers,
  getAccrualBalanceForEmployeeNumbersNext,
  getAccrualBalanceByFundForEmployeeNumbers,
  getAccrualBalanceByFundForEmployeeNumbersNext,
  getPaymentInNextPeriod,
  orderAccrualReversal,
  calcReversalAccrual,
  binarySearch,
  getSalaryAccrual,
  getChangeSalaryAccrual,
  getParentAccrual,
  getHoursByMask,
  getWorkOperationRate,
  getIDsFromString,
  getKpiAccrual,
  getDepIDs,
  getCalcParams,
  setCalcParams,
  mtCountByTariffing,
  getTariffingAccrualList
}

let accrualGenerateStore

const seq = {}

function getID (sequenceName, count = 100) {
  let result = 0
  if (!seq[sequenceName]) {
    seq[sequenceName] = { value: 0, lastValue: 0 }
  }
  if (!seq[sequenceName].value || seq[sequenceName].value > seq[sequenceName].lastValue) {
    if (!accrualGenerateStore) {
      accrualGenerateStore = UB.DataStore('hr_accrual')
    }

    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      accrualGenerateStore.runSQL(` DECLARE @FirstValue SQL_VARIANT, @LastValue SQL_VARIANT;
                                  EXEC sys.sp_sequence_get_range
                                    @sequence_name     = ${sequenceName},
                                    @range_size        = ${count},
                                    @range_first_value = @FirstValue OUTPUT,
                                    @range_last_value  = @LastValue OUTPUT;
                                  SELECT 
                                    firstValue = CONVERT(BIGINT, @FirstValue), 
                                    lastValue = CONVERT(BIGINT, @LastValue)
  `, {})
      const data = accrualGenerateStore.getAsJsObject()[0]
      result = data.firstValue
      seq[sequenceName].value = data.firstValue + 1
      seq[sequenceName].lastValue = data.lastValue
    } else {
      accrualGenerateStore.runSQL(`  SELECT NEXTVAL('${sequenceName}') AS "firstValue" from generate_series(1,${count}) `, {})
      const data = accrualGenerateStore.getAsJsObject()[0]
      result = data.firstValue
      seq[sequenceName].value = data.firstValue + 1
      seq[sequenceName].lastValue = data.firstValue + count - 1
    }
  } else {
    result = seq[sequenceName].value
    seq[sequenceName].value++
  }
  return result
}

function removePeriod (a, dateFrom, dateTo) {
  const result = []
  a.forEach(row => {
    if (row.dateFrom <= dateTo && row.dateTo >= dateFrom) {
      if (row.dateFrom < dateFrom) {
        result.push({ dateFrom: row.dateFrom, dateTo: dateService.addDays(dateFrom, -1) })
      }
      if (row.dateTo > dateTo) {
        result.push({ dateFrom: dateService.addDays(dateTo, 1), dateTo: row.dateTo })
      }
    } else {
      result.push(row)
    }
  })
  return result
}

function getPermanentAccrual (orgID, employeeNumberID, cont, period, calcMethods, payElIDs, notCorrectWorking) {
  const permanentAccrual = []
  if (!notCorrectWorking && period.dateFrom > cont.emp[cont.employeeNumberID].prop.employeeNumber.dateTo) {
    return permanentAccrual
  }
  const periodPos = cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom)

  const finishWork = periodPos.length ? dateService.shiftDate(Math.min(periodPos[periodPos.length - 1].dateTo, period.dateTo))
    : cont.emp[cont.employeeNumberID].prop.employeeNumber.finishWork
  const periodDateFrom = notCorrectWorking
    ? dateService.shiftDate(period.dateFrom)
    : dateService.shiftDate(Math.max(cont.emp[cont.employeeNumberID].prop.employeeNumber.startWork, period.dateFrom))
  const periodDateTo = notCorrectWorking
    ? dateService.shiftDate(period.dateTo)
    : dateService.shiftDate(Math.min(finishWork, period.dateTo))
  const employeeAccruals = cont.emp[cont.employeeNumberID].prop.employeeAccruals.filter(o => o.employeeNumberID === employeeNumberID &&
    o.dateFrom <= periodDateTo && o.dateTo >= periodDateFrom && (!calcMethods || calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
    (!payElIDs || payElIDs.includes(o.payElID)))
  const employeeRetentions = cont.emp[cont.employeeNumberID].prop.employeeRetentions.filter(o => o.employeeNumberID === employeeNumberID &&
    o.dateFrom <= periodDateTo && o.dateTo >= periodDateFrom && (!calcMethods || calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
    (!payElIDs || payElIDs.includes(o.payElID)))
  permanentAccrual.push(...employeeAccruals.map(o => {
    return Object.assign(Object.assign({}, o), {
      employeeNumberID: employeeNumberID,
      source: 'hr_employeeAccrual',
      dateFrom: dateService.shiftDate(Math.max(periodDateFrom, o.dateFrom)),
      dateTo: dateService.shiftDate(Math.min(periodDateTo, o.dateTo)),
      baseSum: o.accrualSum,
      rate: o.accrualRate,
      accrualDateTo: o.dateTo
    })
  }))
  if (cont.emp[employeeNumberID].prop.useTariffing && cont.emp[cont.employeeNumberID].prop.tariffingAccruals) {
    let asd = []
    cont.emp[cont.employeeNumberID].prop.tariffingAccruals.forEach(o=>{
      let a = cont.payEl[o.payElID]
      let ok = o.dateFrom <= periodDateTo && o.dateTo >= periodDateFrom && (!calcMethods || calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
      (!payElIDs || payElIDs.includes(o.payElID))
      if (ok) asd.push(a)
    })
    const tariffingAccruals = cont.emp[cont.employeeNumberID].prop.tariffingAccruals.filter(o =>
      o.dateFrom <= periodDateTo && o.dateTo >= periodDateFrom && (!calcMethods || calcMethods.includes(cont.payEl[o.payElID].method.code)) &&
      (!payElIDs || payElIDs.includes(o.payElID)))
    permanentAccrual.push(...tariffingAccruals.map(o => {
      return Object.assign(Object.assign({}, o), {
        employeeNumberID,
        source: 'trf_accrual',
        dateFrom: dateService.shiftDate(Math.max(periodDateFrom, o.dateFrom)),
        dateTo: dateService.shiftDate(Math.min(periodDateTo, o.dateTo)),
        baseSum: o.flagsFix & 1 << 4 ? o.accrualSum : o.baseSum,
        rate: o.flagsFix & 1 << 4 ? null : o.rate,
        workNormID: o.workNormID,
        loadHours: o.loadHours,
        accrualDateTo: o.dateTo,
        trfPositionID: o.ID,
        dictPupilID: o.dictPupilID
      })
    }))
  }

  permanentAccrual.push(...employeeRetentions.map(o => {
    return Object.assign(Object.assign({}, o), {
      employeeNumberID: employeeNumberID,
      source: 'hr_payRetention',
      dateFrom: dateService.shiftDate(Math.max(periodDateFrom, o.dateFrom)),
      dateTo: dateService.shiftDate(Math.min(periodDateTo, o.dateTo)),
      accrualDateTo: o.dateTo,
      'employeeFamilyID.peopleID.birthDate': o['employeeFamilyID.peopleID.birthDate']
    })
  }))
  const pos = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= periodDateTo && o.dateTo >= periodDateFrom)
    .forEach(p => {
      pos.push({
        dateFrom: dateService.shiftDate(Math.max(periodDateFrom, p.dateFrom)),
        dateTo: dateService.shiftDate(Math.min(periodDateTo, p.dateTo)),
        departmentID: p.departmentID,
        dictPositionID: p.dictPositionID,
        dictStaffCatID: p.dictStaffCatID,
        workPlace: p.workPlace,
        workerType: p.workerType,
        dictEmpCategoryID: p.dictEmpCategoryID
      })
    })
  if (!pos.length && cont.emp[cont.employeeNumberID].prop.employeePositions.length) {
    const lastPos = cont.emp[cont.employeeNumberID].prop.employeePositions[cont.emp[cont.employeeNumberID].prop.employeePositions.length - 1]
    pos.push({
      dateFrom: dateService.shiftDate(Math.max(periodDateFrom, lastPos.dateFrom)),
      dateTo: dateService.shiftDate(Math.min(periodDateTo, lastPos.dateTo)),
      departmentID: lastPos.departmentID,
      dictPositionID: lastPos.dictPositionID,
      dictStaffCatID: lastPos.dictStaffCatID,
      workPlace: lastPos.workPlace,
      workerType: lastPos.workerType,
      dictEmpCategoryID: lastPos.dictEmpCategoryID
    })
  }

  if (pos.length && pos[pos.length - 1].dateTo < periodDateTo) {
    pos[pos.length - 1].dateTo = periodDateTo
  }
  cont.org.orgAccrual.forEach(acc => {
    if (acc.dateFrom <= periodDateTo && acc.dateTo >= periodDateFrom && (!calcMethods || calcMethods.includes(cont.payEl[acc.payElID].method.code)) &&
      (!payElIDs || payElIDs.includes(acc.payElID)) && !cont.emp[cont.employeeNumberID].prop.payPermDisable.find(o => o.employeeNumberID === cont.employeeNumberID && o.payPermID === acc.ID)) {
      let accr = [{ dateFrom: dateService.shiftDate(Math.max(periodDateFrom, acc.dateFrom)), dateTo: dateService.shiftDate(Math.min(periodDateTo, acc.dateTo)) }]
      pos.forEach((position, idx) => {
        const pDateFrom = (idx > 0 && dateService.addDays(position.dateFrom, -1) > pos[idx - 1].dateTo) ? dateService.addDays(pos[idx - 1].dateTo, 1) : position.dateFrom
        const posDateFrom = (idx === 0 && position.dateFrom > accr[0].dateFrom) ? accr[0].dateFrom : pDateFrom
        const posDateTo = (idx === pos.length && position.dateTo < accr[0].dateTo) ? accr[0].dateTo : position.dateTo
        if ((acc.excludeDepartment && acc.department.includes(position.departmentID)) || (!acc.excludeDepartment && acc.department.length && !acc.department.includes(position.departmentID))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
        if (accr.length && ((acc.excludePosition && acc.position.includes(position.dictPositionID)) || (!acc.excludePosition && acc.position.length && !acc.position.includes(position.dictPositionID)))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
        if (accr.length && ((acc.excludeStaff && acc.category.includes(position.dictStaffCatID)) || (!acc.excludeStaff && acc.category.length && !acc.category.includes(position.dictStaffCatID)))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
        if (accr.length && ((acc.excludeWorkPlace && acc.workPlace.includes(position.workPlace)) || (!acc.excludeWorkPlace && acc.workPlace.length && !acc.workPlace.includes(position.workPlace)))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
        if (accr.length && ((acc.excludeWorkerType && acc.workerType.includes(position.workerType)) || (!acc.excludeWorkerType && acc.workerType.length && !acc.workerType.includes(position.workerType)))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
        if (accr.length && ((acc.excludeEmpCategory && acc.empCategory.includes(position.dictEmpCategoryID)) || (!acc.excludeEmpCategory && acc.empCategory.length && !acc.empCategory.includes(position.dictEmpCategoryID)))) {
          accr = removePeriod(accr, posDateFrom, posDateTo)
        }
      })

      accr.forEach(addAccr => {
        const empAccr = permanentAccrual.filter(o => o.payElID === acc.payElID).sort((a, b) => (a.dateFrom.getTime() - b.dateFrom.getTime()))
        if (!empAccr.length) {
          permanentAccrual.push(
            Object.assign(Object.assign({}, acc),
              {
                employeeNumberID: employeeNumberID,
                source: 'hr_payPerm',
                dateFrom: addAccr.dateFrom,
                dateTo: addAccr.dateTo,
                baseSum: acc.paySum,
                accrualDateTo: acc.dateTo
              })
          )
        } else {
          let dateFrom = dateService.shiftDate(addAccr.dateFrom)
          let addDays = true
          empAccr.forEach(pAccr => {
            if (pAccr.dateFrom > dateFrom) {
              permanentAccrual.push(
                Object.assign(Object.assign({}, acc),
                  {
                    employeeNumberID: employeeNumberID,
                    source: 'hr_payPerm',
                    dateFrom: dateFrom,
                    dateTo: dateService.addDays(pAccr.dateFrom, -1),
                    baseSum: acc.paySum,
                    accrualDateTo: acc.dateTo
                  })
              )
            }
            addDays = false
            dateFrom = dateService.addDays(pAccr.dateTo, 1)
          })
          if (dateFrom < addAccr.dateTo) {
            permanentAccrual.push(
              Object.assign(Object.assign({}, acc),
                {
                  employeeNumberID: employeeNumberID,
                  source: 'hr_payPerm',
                  dateFrom: addDays ? dateService.addDays(dateFrom, 1) : dateFrom,
                  dateTo: addAccr.dateTo,
                  baseSum: acc.paySum,
                  accrualDateTo: acc.dateTo
                })
            )
          }
        }
      })
    }
  })
  return permanentAccrual
}

function getPermanentFund (cont, period) {
  const permanentFund = []
  const pos = []
  let tabNumId = cont.emp[cont.employeeNumberID].prop.employeeNumber.mainEmpNumberID
  if (!tabNumId) tabNumId = cont.employeeNumberID
  cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= period.dateTo && o.dateTo >= period.dateFrom)
    .forEach(p => {
      pos.push({
        dateFrom: dateService.shiftDate(Math.max(period.dateFrom, p.dateFrom)),
        dateTo: dateService.shiftDate(Math.min(period.dateTo, p.dateTo)),
        departmentID: p.departmentID,
        dictPositionID: p.dictPositionID,
        dictStaffCatID: p.dictStaffCatID,
        workPlace: p.workPlace,
        workerType: p.workerType,
        dictEmpCategoryID: p.dictEmpCategoryID
      })
    })
  if (!pos.length && cont.emp[cont.employeeNumberID].prop.employeePositions.length) {
    const lastPos = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateTo <= period.dateFrom) ||
      cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateTo >= period.dateFrom)
    pos.push({
      dateFrom: dateService.shiftDate(period.dateFrom),
      dateTo: dateService.shiftDate(period.dateTo),
      departmentID: lastPos ? lastPos.departmentID : null,
      dictPositionID: lastPos ? lastPos.dictPositionID : null,
      dictStaffCatID: lastPos ? lastPos.dictStaffCatID : null,
      workPlace: lastPos ? lastPos.workPlace : null,
      workerType: lastPos ? lastPos.workerType : null,
      dictEmpCategoryID: lastPos ? lastPos.dictEmpCategoryID : null
    })
  }
  if (pos.length) {
    if (pos[pos.length - 1].dateTo < period.dateTo) {
      pos[pos.length - 1].dateTo = period.dateTo
    }
    if (pos[0].dateFrom > period.dateFrom) {
      pos[0].dateFrom = period.dateFrom
    }
  }

  cont.org.orgFund.forEach(acc => {
    if (acc.dateFrom <= period.dateTo && acc.dateTo >= period.dateFrom) {
      const fund = cont.payFund.find(o => o.ID === acc.payFundID)
        if (fund) {
        let accr = [{ dateFrom: dateService.shiftDate(Math.max(period.dateFrom, acc.dateFrom, fund.dateFrom)), dateTo: dateService.shiftDate(Math.min(period.dateTo, acc.dateTo, fund.dateTo)) }]
        pos.forEach((position, idx) => {
          const posDateFrom = (idx === 0 && position.dateFrom > accr[0].dateFrom) ? accr[0].dateFrom : position.dateFrom
          const posDateTo = (idx === pos.length && position.dateTo < accr[0].dateTo) ? accr[0].dateTo : position.dateTo
          if ((acc.excludeDepartment && acc.department.includes(position.departmentID)) || (!acc.excludeDepartment && acc.department.length && !acc.department.includes(position.departmentID))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          if (accr.length && ((acc.excludePosition && acc.position.includes(position.dictPositionID)) || (!acc.excludePosition && acc.position.length && !acc.position.includes(position.dictPositionID)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          if (accr.length && ((acc.excludeStaff && acc.category.includes(position.dictStaffCatID)) || (!acc.excludeStaff && acc.category.length && !acc.category.includes(position.dictStaffCatID)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          if (accr.length && ((acc.excludeWorkPlace && acc.workPlace.includes(position.workPlace)) || (!acc.excludeWorkPlace && acc.workPlace.length && !acc.workPlace.includes(position.workPlace)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          if (accr.length && ((acc.excludeWorkerType && acc.workerType.includes(position.workerType)) || (!acc.excludeWorkerType && acc.workerType.length && !acc.workerType.includes(position.workerType)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          if (accr.length && ((acc.excludeEmpCategory && acc.empCategory.includes(position.dictEmpCategoryID)) || (!acc.excludeEmpCategory && acc.empCategory.length && !acc.empCategory.includes(position.dictEmpCategoryID)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }          
          //Add pdv 27/07/24
          if (accr.length && ((acc.excludeTabNum && acc.tabNums.includes(tabNumId)) || (!acc.excludeTabNum && acc.tabNums.length && !acc.tabNums.includes(tabNumId)))) {
            accr = removePeriod(accr, posDateFrom, posDateTo)
          }
          // if (accr.length && acc.excludeOrg) {
          //   accr = removePeriod(accr, posDateFrom, posDateTo)
          // }
        })

        accr.forEach(addAccr => {
          permanentFund.push(
            Object.assign(Object.assign({}, fund),
              {
                dateFrom: addAccr.dateFrom,
                dateTo: addAccr.dateTo,
                permData: acc
              })
          )
        })
      }
    }
  })
  return permanentFund
}

function getMask (value, len) {
  return (value ? value.toString(2) : '').padStart(len || 31, '0')
}

function getFundAccrual (orgID, employeeNumberID, dateFrom, periodDateTo) {
  const accrual = UB.Repository('hr_accrualFund')
    .attrs(['*'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodCalc', '>=', dateFrom)
    .whereIf(periodDateTo, 'periodCalc', '<', periodDateTo)
    .orderBy('ID')
    .selectAsObject()
  let accIDs = []
  accrual.forEach(accr => {
    accr.periodCalc = dateService.shiftDate(accr.periodCalc)
    accr.periodSalary = dateService.shiftDate(accr.periodSalary)
    accIDs.push(accr.ID)
  })
  let accrualDt = UB.Repository('hr_accrualFundDt')
    .attrs(['ID', 'payElID', 'accrualFundID', 'paySum', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'departmentID', 'accountID',
      'baseSum', 'sourceSum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
    .where('accrualFundID', 'in', accIDs)
    .orderBy('accrualFundID')
    .selectAsObject()
  let accr
  accrualDt.forEach(row => {
    if (!accr || accr.ID !== row.accrualFundID) {
      accr = binarySearch(accrual, row.accrualFundID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.accrualFundDt) {
        accr.accrualFundDt.push(row)
      } else {
        accr.accrualFundDt = [row]
      }
    }
  })

  return accrual
}

function getAccrualAvgByAccrual (accrual, fieldList) {
  const accIDs = []
  const orderIDs = []
  accrual.forEach(accr => {
    accIDs.push(accr.ID)
    if (accr.orderID) {
      orderIDs.push(accr.orderID)
    }
  })
  const accrualAvg = accIDs.length ? UB.Repository('hr_accrualAvg')
    .attrs(fieldList || ['ID', 'accrualID', 'orderID', 'periodID', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .selectAsObject() : []
  const accrualAvgOrder = orderIDs.length ? UB.Repository('hr_accrualAvg')
    .attrs(fieldList || ['ID', 'accrualID', 'orderID', 'periodID', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'])
    .where('orderID', 'in', orderIDs)
    .where('accrualID', 'isNull')
    .orderBy('accrualID')
    .selectAsObject() : []
  accrualAvgOrder.forEach(avg => {
    accrualAvg.push(avg)
  })
  return accrualAvg
}

function getAccrual (orgID, employeeNumberID, dateFrom, skipAutoCalcPeriod, periodDateTo) {
  const accrual = UB.Repository('hr_accrual')
    .attrs(['*'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodCalc', '>=', dateFrom, 'periodCalc')
    .where('periodSalary', '>=', dateFrom, 'periodSalary')
    .whereIf(skipAutoCalcPeriod, `(periodCalcID != ${skipAutoCalcPeriod} OR ( periodCalcID = ${skipAutoCalcPeriod} AND flagsRec & 1 != 1 AND flagsRec & 1048576 = 0) )`, 'custom')
    .whereIf(periodDateTo, 'periodCalc', '<=', periodDateTo)
    .logic('([periodCalc] OR [periodSalary])')
    .orderBy('ID')
    .selectAsObject()
  let accIDs = []
  const orderIDs = []

  accrual.forEach(accr => {
    accr.dateFrom = dateService.shiftDate(accr.dateFrom)
    accr.dateTo = dateService.shiftDate(accr.dateTo)
    accr.dateFromAvg = accr.dateFromAvg ? dateService.shiftDate(accr.dateFromAvg) : accr.dateFromAvg
    accr.dateToAvg = accr.dateToAvg ? dateService.shiftDate(accr.dateToAvg) : accr.dateToAvg
    accr.periodCalc = dateService.shiftDate(accr.periodCalc)
    accr.periodSalary = dateService.shiftDate(accr.periodSalary)
    accIDs.push(accr.ID)
    if (accr.orderID) {
      orderIDs.push(accr.orderID)
    }
  })
  let taxIndividAcc = UB.Repository('hr_taxIndividAcc')
    .attrs(['ID', 'taxIndividID', 'taxSum', 'incomeSum', 'taxFreeSum', 'privilegeSum', 'accrualID'])
    .where('accrualID', 'in', accIDs.length ? accIDs : [0])
    .orderBy('accrualID')
    .selectAsObject()
  let accrualDt = UB.Repository('hr_accrualDt')
    .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'departmentID', 'accountID',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
    .where('accrualID', 'in', accIDs.length ? accIDs : [0])
    .orderBy('accrualID')
    .selectAsObject()
  accIDs = null
  let accr
  taxIndividAcc.forEach(row => {
    if (!accr || accr.ID !== row.accrualID) {
      accr = binarySearch(accrual, row.accrualID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.taxIndividAcc) {
        accr.taxIndividAcc.push(row)
      } else {
        accr.taxIndividAcc = [row]
      }
    }
  })
  taxIndividAcc = null
  accr = null
  accrualDt.forEach(row => {
    if (!accr || accr.ID !== row.accrualID) {
      accr = binarySearch(accrual, row.accrualID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.accrualDt) {
        accr.accrualDt.push(row)
      } else {
        accr.accrualDt = [row]
      }
    }
  })
  accrualDt = null
  return accrual
}

function getAccrualByPeriodForEmployeeNumbers (cont, employeeNumbers, periodCalcID, periodSalaryID, payElIDs) {
  const accrual = UB.Repository('hr_accrual')
    .attrs(['*'])
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('orgID', '=', cont.orgID)
    .whereIf(periodCalcID, 'periodCalcID', '=', periodCalcID)
    .whereIf(periodSalaryID, 'periodSalaryID', '=', periodSalaryID)
    .whereIf(payElIDs, 'payElID', 'in', payElIDs)
    .orderBy('ID')
    .selectAsObject()
  let accIDs = []
  employeeNumbers.forEach(employeeNumberID => {
    cont.emp[employeeNumberID].accrual = []
  })
  accrual.forEach(accr => {
    accr.dateFrom = dateService.shiftDate(accr.dateFrom)
    accr.dateTo = dateService.shiftDate(accr.dateTo)
    accr.periodCalc = dateService.shiftDate(accr.periodCalc)
    accr.periodSalary = dateService.shiftDate(accr.periodSalary)
    accIDs.push(accr.ID)
    cont.emp[accr.employeeNumberID].accrual.push(accr)
  })
  let accrualDt = UB.Repository('hr_accrualDt')
    .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'departmentID', 'accountID',
      'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .selectAsObject()
  accIDs = null
  let accr
  accrualDt.forEach(row => {
    if (!accr || accr.ID !== row.accrualID) {
      accr = binarySearch(accrual, row.accrualID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.accrualDt) {
        accr.accrualDt.push(row)
      } else {
        accr.accrualDt = [row]
      }
    }
  })
  accrualDt = null
}

function getAccrualFundByPeriodForEmployeeNumbers (cont, employeeNumbers, periodCalcID, periodSalaryID) {
  const accrual = UB.Repository('hr_accrualFund')
    .attrs(['*'])
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('orgID', '=', cont.orgID)
    .whereIf(periodCalcID, 'periodCalcID', '=', periodCalcID)
    .whereIf(periodSalaryID, 'periodSalaryID', '=', periodSalaryID)
    .orderBy('ID')
    .selectAsObject()
  let accIDs = []
  employeeNumbers.forEach(employeeNumberID => {
    cont.emp[employeeNumberID].accrualFund = []
  })
  accrual.forEach(accr => {
    accr.periodCalc = dateService.shiftDate(accr.periodCalc)
    accr.periodSalary = dateService.shiftDate(accr.periodSalary)
    accIDs.push(accr.ID)
    cont.emp[accr.employeeNumberID].accrualFund.push(accr)
  })
  let accrualDt = UB.Repository('hr_accrualFundDt')
    .attrs(['ID', 'accrualFundID', 'paySum', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'departmentID', 'accountID',
      'baseSum', 'sourceSum', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
      'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
    .where('accrualFundID', 'in', accIDs)
    .orderBy('accrualFundID')
    .selectAsObject()
  accIDs = null
  let accr
  accrualDt.forEach(row => {
    if (!accr || accr.ID !== row.accrualFundID) {
      accr = binarySearch(accrual, row.accrualFundID, 0, accrual.length - 1, 'ID')
    }
    if (accr) {
      if (accr.accrualFundDt) {
        accr.accrualFundDt.push(row)
      } else {
        accr.accrualFundDt = [row]
      }
    }
  })
  accrualDt = null
}
function removeAutoCalcAccrual (params, retry = true) {
  const store = UB.DataStore('hr_accrual')
  try {
    store.runSQL(`SELECT ID "ID" FROM hr_accrual WHERE 
    ${params.employeeNumberID ? 'employeeNumberID = :employeeNumberID: AND ' : ''}
    orgID = :orgID: AND periodCalcID = :periodID: AND (flagsRec & 1 = 1 OR flagsRec & 1048576 = 1048576) `, params)
    let dataIDs = store.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      store.execSQL(`DELETE FROM hr_accrual WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
    store.runSQL(`SELECT ID "ID" FROM hr_accrualFund WHERE
     ${params.employeeNumberID ? 'employeeNumberID = :employeeNumberID: AND' : ''}
     orgID = :orgID: AND periodCalcID = :periodID: AND orderID IS NULL`, params)
    dataIDs = store.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      store.execSQL(`DELETE FROM hr_accrualFund WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
    store.execSQL(`DELETE FROM hr_accrualBalance WHERE periodCalcID = :periodID:
   ${params.employeeNumberID ? ' AND employeeNumberID = :employeeNumberID:' : ''}`, params)
    store.freeNative()
  } catch (e) {
    if (retry) {
      removeAutoCalcAccrual(params, false)
    }
  }
}

function removeIncorrectAccrual (params) {
  const store = UB.DataStore('hr_accrual')
  store.runSQL(`SELECT a.ID "ID" FROM hr_accrual a 
            LEFT JOIN hr_dictPeriod p ON p.ID =a.periodCalcID left 
            JOIN hr_employeeNumber n On n.ID = a.employeeNumberID
      WHERE a.orgID = :orgID: AND ((p.orgID <> a.orgID OR n.orgID <> p.orgID OR a.orgID <> n.orgID) OR n.mi_deleteDate < '9999-12-31')
  `, params)
  let dataIDs = store.getAsJsObject().map(o => o.ID)
  if (dataIDs.length) {
    store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    store.execSQL(`DELETE FROM hr_accrual WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
  }
  store.runSQL(`SELECT a.ID "ID" FROM hr_accrualFund a JOIN hr_employeeNumber n On n.ID = a.employeeNumberID WHERE a.orgID = :orgID: AND n.mi_deleteDate < '9999-12-31'`, params)
  dataIDs = store.getAsJsObject().map(o => o.ID)
  if (dataIDs.length) {
    store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    store.execSQL(`DELETE FROM hr_accrualFund WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
  }
  store.runSQL(`SELECT n.ID "ID" FROM hr_employeeNumber n WHERE n.orgID = :orgID: AND n.mi_deleteDate < '9999-12-31'`, params)
  dataIDs = store.getAsJsObject().map(o => o.ID)
  if (dataIDs.length) {
    store.execSQL(`DELETE FROM hr_accrualBalance WHERE employeeNumberID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
  }
  store.freeNative()
}

function getReCalcDate ({ orgID, employeeNumberID, periodID, reCalcDate, minReCalcDate, calculateProperty = { calcType: 0 } }) {
  const result = {
    dateFrom: reCalcDate ? dateService.shiftDate(reCalcDate) : null,
    dateTo: reCalcDate ? dateService.shiftDate(reCalcDate) : null
  }
  const employeeNumber = UB.Repository('hr_employeeNumber').attrs(['dateTo']).selectById(employeeNumberID)
  if (!employeeNumber) {
    return result
  }
  const payCalcDateFrom = UB.Repository('hr_payCalcDateFrom')
    .attrs(['periodSalaryID.dateFrom'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('periodCalcID', '=', periodID)
    .selectScalar()
  if (payCalcDateFrom) {
    result.dateFrom = dateService.shiftDate(Math.min(result.dateFrom, dateService.shiftDate(payCalcDateFrom)))
  }

  // pdv add 22.11.24
  if (result.dateFrom < dateService.shiftDate('2023-12-01')) {
    result.dateFrom = dateService.shiftDate('2023-12-01')
  }
  //
  if (dateService.shiftDate(employeeNumber.dateTo) >= reCalcDate) {
    const dateTimeSheet = periodID ? UB.Repository('tim_timeSheet')
      .attrs(['MIN([dateWork])', 'MAX([dateWork])'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('isActive', '=', 1, 'active')
      .where('periodID', '=', periodID, 'period')
      .where('canceledPeriodID', '=', periodID, 'canPeriod')
      .where('dateWork', '>=', minReCalcDate || dateService.minDate())
      .logic('(([period] AND [active]) OR [canPeriod])')
      .limit(1)
      .selectSingle() : null
    if ((!result.dateFrom && dateTimeSheet) || (dateTimeSheet && dateTimeSheet['MIN([dateWork])'] && dateService.shiftDate(dateTimeSheet['MIN([dateWork])']) < result.dateFrom)) {
      result.dateFrom = dateService.shiftDate(dateTimeSheet['MIN([dateWork])'])
    }
    if ((!result.dateTo && dateTimeSheet) || (dateTimeSheet && dateTimeSheet['MAX([dateWork])'] && dateService.shiftDate(dateTimeSheet['MAX([dateWork])']) > result.dateTo)) {
      result.dateTo = dateService.shiftDate(dateTimeSheet['MAX([dateWork])'])
    }
  }
  const dateAccrual = periodID ? UB.Repository('hr_accrual')
    .attrs(['MIN([periodSalary])', 'MAX([periodSalary])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodCalcID', '=', periodID)
    .where('payElID.methodID.methodGroupID.groupType', '!=', 'FORPAY')
    .whereIf(!(calculateProperty.calcType & 1 << 6), `(flagsRec & 1 != 1) `, 'custom')
    .whereIf(minReCalcDate, 'periodSalary', '>=', minReCalcDate)
    .limit(1)
    .selectSingle() : null
  if ((!result.dateFrom && dateAccrual) || (dateAccrual && dateAccrual['MIN([periodSalary])'] && dateService.shiftDate(dateAccrual['MIN([periodSalary])']) < result.dateFrom)) {
    result.dateFrom = dateService.shiftDate(dateAccrual['MIN([periodSalary])'])
  }
  if ((!result.dateTo && dateAccrual) || (dateAccrual && dateAccrual['MAX([periodSalary])'] && dateService.shiftDate(dateAccrual['MAX([periodSalary])']) > result.dateTo)) {
    result.dateTo = dateService.shiftDate(dateAccrual['MAX([periodSalary])'])
  }
  if (result.dateFrom && result.dateTo && periodID) {
    reCalcPeriodDate(orgID, employeeNumberID, periodID, result, minReCalcDate)
  }
  return result
}

function reCalcPeriodDate (orgID, employeeNumberID, periodID, result, minReCalcDate) {
  let changeDate = false
  const dateSalaryAccrual = UB.Repository('hr_accrual')
    .attrs(['MIN([periodSalary])', 'MAX([periodSalary])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodCalc', '>=', result.dateFrom)
    .where('periodCalc', '<=', result.dateTo)
    .where('periodCalcID', '!=', periodID)
    .whereIf(minReCalcDate, 'periodSalary', '>=', minReCalcDate)
    .where('payElID.methodID.methodGroupID.groupType', '!=', 'FORPAY')
    .limit(1)
    .selectSingle()
  if ((dateSalaryAccrual && dateSalaryAccrual['MIN([periodSalary])'] && dateService.shiftDate(dateSalaryAccrual['MIN([periodSalary])']) < result.dateFrom)) {
    result.dateFrom = dateService.shiftDate(dateSalaryAccrual['MIN([periodSalary])'])
    changeDate = true
  }
  if ((dateSalaryAccrual && dateSalaryAccrual['MAX([periodSalary])'] && dateService.shiftDate(dateSalaryAccrual['MAX([periodSalary])']) > result.dateTo)) {
    result.dateTo = dateService.shiftDate(dateSalaryAccrual['MAX([periodSalary])'])
    changeDate = true
  }
  const dateCalcAccrual = UB.Repository('hr_accrual')
    .attrs(['MIN([periodCalc])', 'MAX([periodCalc])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('periodSalary', '>=', result.dateFrom)
    .where('periodSalary', '<=', result.dateTo)
    .where('periodCalcID', '!=', periodID)
    .whereIf(minReCalcDate, 'periodCalc', '>=', minReCalcDate)
    .where('payElID.methodID.methodGroupID.groupType', '!=', 'FORPAY')
    .limit(1)
    .selectSingle()
  if ((dateCalcAccrual && dateCalcAccrual['MIN([periodCalc])'] && dateService.shiftDate(dateCalcAccrual['MIN([periodCalc])']) < result.dateFrom)) {
    result.dateFrom = dateService.shiftDate(dateCalcAccrual['MIN([periodCalc])'])
    changeDate = true
  }
  if ((dateCalcAccrual && dateCalcAccrual['MAX([periodCalc])'] && dateService.shiftDate(dateCalcAccrual['MAX([periodCalc])']) > result.dateTo)) {
    result.dateTo = dateService.shiftDate(dateCalcAccrual['MAX([periodCalc])'])
    changeDate = true
  }
  if (changeDate) {
    reCalcPeriodDate(orgID, employeeNumberID, periodID, result, minReCalcDate)
  }
}

function setRecalculatePeriod ({ orgID, employeeNumberID, periodCalcID, periodSalaryID, dateFrom, entityName, initiatorID, description,
  autoSetRecalcDate = true, nextPeriod = false, alwaysChangePeriod = false }) {
  if (autoSetRecalcDate && settingsService.getByCode('hrAutoSetRecalcDate', orgID) === false) {
    return
  }
  const currentPeriod = periodCalcID ? periodService.getPeriod(periodCalcID) : periodService.getCurrentPeriod(orgID)
  const minReCalcDate = settingsService.getByCode('hrMinReCalcDate', orgID)
  let dateFromCalc = dateFrom ? dateService.shiftDate(dateFrom) : null
  if (dateFromCalc && minReCalcDate) {
    dateFromCalc = dateService.shiftDate(Math.max(dateFromCalc, dateService.shiftDate(new Date(Number(minReCalcDate.substr(6, 4)), Number(minReCalcDate.substr(3, 2)) - 1, Number(minReCalcDate.substr(0, 2))))))
  }
  if (!periodCalcID) {
    periodCalcID = currentPeriod ? currentPeriod.ID : null
  }
  const periodSalary = periodSalaryID ? periodService.getPeriod(periodSalaryID) : (dateFromCalc ? periodService.getPeriodOnDate(orgID, dateFromCalc) : null)
  if (dateFromCalc) {
    periodSalaryID = periodSalary ? periodSalary.ID : null
  }
  if (!periodCalcID || (autoSetRecalcDate && (!periodSalaryID || periodSalary.dateFrom >= currentPeriod.dateFrom))) {
    return
  }
  const store = UB.DataStore('hr_payCalcDateFrom')
  const payCalcDateFrom = UB.Repository('hr_payCalcDateFrom')
    .attrs(['ID', 'periodSalaryID.dateFrom'])
    .where('periodCalcID', '=', periodCalcID)
    .where('employeeNumberID', '=', employeeNumberID)
    .limit(1)
    .selectSingle()
  if (payCalcDateFrom) {
    if (periodCalcID === periodSalaryID || !periodSalaryID) {
      store.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: payCalcDateFrom.ID
        }
      })
    } else {
      if (!periodSalary || alwaysChangePeriod || dateService.shiftDate(payCalcDateFrom['periodSalaryID.dateFrom']) > periodSalary.dateFrom) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: payCalcDateFrom.ID,
            periodSalaryID,
            entityName: entityName || null,
            initiatorID: initiatorID || null,
            description: description || null
          }
        })
      }
    }
  } else {
    if (periodCalcID !== periodSalaryID || (nextPeriod && periodSalaryID)) {
      store.run('insert', {
        execParams: {
          employeeNumberID,
          periodCalcID,
          periodSalaryID,
          entityName: entityName || null,
          initiatorID: initiatorID || null,
          description: description || null
        }
      })
    }
  }
  store.freeNative()
}

function getRecalculatePeriod (employeeNumberID, periodCalcID) {
  return UB.Repository('hr_payCalcDateFrom')
    .attrs(['periodSalaryID'])
    .where('periodCalcID', '=', periodCalcID)
    .where('employeeNumberID', '=', employeeNumberID)
    .selectScalar() || null
}

function saveAccrual ({ accrual }) {
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualDtStore = UB.DataStore('hr_accrualDt')
  const taxIndividAccStore = UB.DataStore('hr_taxIndividAcc')
  const accrualAvgStore = UB.DataStore('hr_accrualAvg')
  const accrualDt = accrual.accrualDt
  delete accrual.accrualDt

  const taxIndividAcc = accrual.taxIndividAcc
  delete accrual.taxIndividAcc
  const accrualAvg = accrual.accrualAvg
  delete accrual.accrualAvg

  accrual.calculateDate = new Date()
  accrual.createUserID = Session.uData.userID

  if (!accrual.ID) {
    accrual.ID = getID('S_HR_ACCRUAL')
    accrualStore.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: accrual
    })
  } else {
    accrualStore.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: accrual
    })
  }
  accrualDtStore.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID  = :accrualID:`, { accrualID: accrual.ID })
  taxIndividAccStore.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID = :accrualID:`, { accrualID: accrual.ID })
  if (accrualDt) {
    accrualDt.forEach(row => {
      row.accrualID = accrual.ID
      row.ID = getID('S_HR_ACCRUALDT')
      accrualDtStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: row
      })
    })
  }
  if (taxIndividAcc) {
    taxIndividAcc.forEach(row => {
      row.accrualID = accrual.ID
      row.ID = getID('S_HR_TAXINDIVIDACC')
      taxIndividAccStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: row
      })
    })
  }
  if (accrualAvg) {
    accrualDtStore.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID  = :accrualID:`, { accrualID: accrual.ID })
    accrualAvg.forEach(row => {
      row.accrualID = accrual.ID
      row.ID = accrualAvgStore.generateID()
      accrualAvgStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: row
      })
    })
  }
  accrualStore.freeNative()
  accrualDtStore.freeNative()
  taxIndividAccStore.freeNative()
  return accrual.ID
}
function saveAutoCalcAccrual (cont) {
  const store = UB.DataStore('hr_accrual')
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualAvgStore = UB.DataStore('hr_accrualAvg')
  const accrual = []
  const taxIndividAcc = []
  const accrualAvg = []
  const accrualDt = []

  cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
    if (acc.insert && (acc.paySum >= 0 || acc.paySum < 0) /* typeof acc.paySum === 'number' */) {
      delete acc.insert
      delete acc.importAccrual
      acc.ID = getID('S_HR_ACCRUAL')
      acc.orgID = cont.orgID
      accrual.push({
        ID: acc.ID,
        orgID: acc.orgID,
        periodCalcID: acc.periodCalcID,
        periodSalaryID: acc.periodSalaryID,
        periodCalc: acc.periodCalc,
        periodSalary: acc.periodSalary,
        employeeNumberID: acc.employeeNumberID,
        employeeNumberPartID: acc.employeeNumberPartID || null,
        payElID: acc.payElID,
        orderID: acc.orderID || null,
        empOrderID: acc.empOrderID || null,
        timeSheetID: acc.timeSheetID || null,
        orderDtID: acc.orderDtID || null,
        flagsRec: acc.flagsRec || 0,
        flagsFix: acc.flagsFix || 0,
        planHours: typeof acc.planHours === 'number' ? acc.planHours : null,
        planDays: typeof acc.planDays === 'number' ? acc.planDays : null,
        baseSum: typeof acc.baseSum === 'number' ? acc.baseSum : null,
        rate: typeof acc.rate === 'number' ? acc.rate : null,
        days: typeof acc.days === 'number' ? acc.days : null,
        hours: typeof acc.hours === 'number' ? acc.hours : null,
        mask: acc.mask || 0,
        maskAdd: acc.maskAdd || 0,
        mtCount: typeof acc.mtCount === 'number' ? acc.mtCount : null,
        paySum: acc.paySum,
        minSalarySum: typeof acc.minSalarySum === 'number' ? acc.minSalarySum : null,
        dateFrom: acc.dateFrom,
        dateTo: acc.dateTo,
        orderDateFrom: acc.orderDateFrom ? (typeof acc.orderDateFrom === 'string' ? dateService.shiftDate(acc.orderDateFrom) : acc.orderDateFrom) : null,
        orderDateTo: acc.orderDateTo ? (typeof acc.orderDateTo === 'string' ? dateService.shiftDate(acc.orderDateTo) : acc.orderDateTo) : null, //  acc.orderDateTo || null,
        avgCalcType: acc.avgCalcType || null,
        dateFromAvg: acc.dateFromAvg ? (typeof acc.dateFromAvg === 'string' ? dateService.shiftDate(acc.dateFromAvg) : acc.dateFromAvg) : null, // acc.dateFromAvg || null,
        dateToAvg: acc.dateToAvg ? (typeof acc.dateToAvg === 'string' ? dateService.shiftDate(acc.dateToAvg) : acc.dateToAvg) : null, // acc.dateToAvg || null,
        sumAvg: typeof acc.sumAvg === 'number' ? acc.sumAvg : null,
        planSumAvg: typeof acc.planSumAvg === 'number' ? acc.planSumAvg : null,
        avgDays: typeof acc.avgDays === 'number' ? acc.avgDays : null,
        koef: typeof acc.koef === 'number' ? acc.koef : null,
        calculateDate: new Date(),
        createUserID: Session.uData.userID,
        linkToParentID: acc.linkToParentID || null,
        linkToChildID: acc.linkToChildID || null,
        source: acc.source || null,
        sourceID: acc.sourceID || null,
        paymentID: acc.paymentID || null,
        incomingDebtSum: typeof acc.incomingDebtSum === 'number' ? acc.incomingDebtSum : null,
        repaymentDebtSum: typeof acc.repaymentDebtSum === 'number' ? acc.repaymentDebtSum : null,
        calculatedSum: typeof acc.calculatedSum === 'number' ? acc.calculatedSum : null,
        calendarDays: typeof acc.calendarDays === 'number' ? acc.calendarDays : null,
        repaymentSum: typeof acc.repaymentSum === 'number' ? acc.repaymentSum : null,
        hoursByDays: acc.hoursByDays ? (typeof acc.hoursByDays === 'object' ? JSON.stringify(acc.hoursByDays) : acc.hoursByDays) : null,
        planHoursByDays: acc.planHoursByDays ? (typeof acc.planHoursByDays === 'object' ? JSON.stringify(acc.planHoursByDays) : acc.planHoursByDays) : null,
        leadingHoursByDays: acc.leadingHoursByDays ? (typeof acc.leadingHoursByDays === 'object' ? JSON.stringify(acc.leadingHoursByDays) : acc.leadingHoursByDays) : null,
        isAvg: acc.isAvg ? 1 : 0,
        extraRate: typeof acc.extraRate === 'number' ? acc.extraRate : null,
        basePayment: typeof acc.basePayment === 'number' ? acc.basePayment : null,
        missingEmployeeNumberID: acc.missingEmployeeNumberID || null,
        baseDate: acc.baseDate ? (typeof acc.baseDate === 'string' ? dateService.shiftDate(acc.baseDate) : acc.baseDate) : null,
        dictIllnessReasonID: acc.dictIllnessReasonID || null,
        standingYearMonth: acc.standingYearMonth || null,
        standingAll: acc.standingAll || null,
        workScheduleID: acc.workScheduleID || null,
        dictFundSourceID: acc.dictFundSourceID || null,
        dictProgClassID: acc.dictProgClassID || null,
        dictProjectID: acc.dictProjectID || null,
        dictPositionID: acc.dictPositionID || null,
        calcEarnings: acc.calcEarnings || null,
        paySumAccrual: typeof acc.paySumAccrual === 'number' ? acc.paySumAccrual : null,
        paySumOff: typeof acc.paySumOff === 'number' ? acc.paySumOff : null,
        rateOff: typeof acc.rateOff === 'number' ? acc.rateOff : null,
        workNormID: typeof acc.workNormID === 'number' ? acc.workNormID : null,
        loadHours: typeof acc.loadHours === 'number' ? acc.loadHours : null,
        calcParams: acc.calcParams ? (typeof acc.calcParams === 'object' ? JSON.stringify(acc.calcParams) : acc.calcParams) : null
      })
      if (acc.taxIndividAcc) {
        acc.taxIndividAcc.forEach(row => {
          taxIndividAcc.push({
            ID: getID('S_HR_TAXINDIVIDACC'),
            accrualID: acc.ID,
            taxIndividID: row.taxIndividID,
            taxSum: row.taxSum,
            incomeSum: typeof row.incomeSum === 'number' ? row.incomeSum : 0,
            taxFreeSum: typeof row.taxFreeSum === 'number' ? row.taxFreeSum : 0,
            privilegeSum: typeof row.privilegeSum === 'number' ? row.privilegeSum : null,
            taxLimitID1: row.taxLimitID1 || null,
            taxLimitID2: row.taxLimitID2 || null,
            taxLimitID3: row.taxLimitID3 || null
          })
        })
      }
      if (acc.accrualDt) {
        acc.accrualDt.forEach(row => {
          if (row.paySum !== 0 || (acc.paySum === 0 && row.paySum === 0)) {
            if (!row.paySum) {
              console.log(`accrualDt paySum = null`)
              console.log(cont.payEl[acc.payElID].description)
              console.log(acc)
              console.log(row)
              row.paySum = 0
            }
            accrualDt.push({
              ID: getID('S_HR_ACCRUALDT'),
              accrualID: acc.ID,
              paySum: row.paySum,
              dictFundSourceID: row.dictFundSourceID || null,
              dictProjectID: row.dictProjectID || null,
              dictProgClassID: row.dictProgClassID || null,
              departmentID: row.departmentID || null,
              accountID: row.accountID || null,
              d0: row.d0 || null,
              d0Value: row.d0Value || null,
              d1: row.d1 || null,
              d1Value: row.d1Value || null,
              d2: row.d2 || null,
              d2Value: row.d2Value || null,
              d3: row.d3 || null,
              d3Value: row.d3Value || null,
              d4: row.d4 || null,
              d4Value: row.d4Value || null,
              d5: row.d5 || null,
              d5Value: row.d5Value || null,
              d6: row.d6 || null,
              d6Value: row.d6Value || null,
              d7: row.d7 || null,
              d7Value: row.d7Value || null,
              d8: row.d8 || null,
              d8Value: row.d8Value || null,
              d9: row.d9 || null,
              d9Value: row.d9Value || null
            })
          }
        })
      }
      if (acc.accrualAvg) {
        acc.accrualAvg.forEach(row => {
          accrualAvg.push({
            ID: accrualAvgStore.generateID(),
            accrualID: acc.ID,
            orderID: row.orderID || null,
            periodID: row.periodID,
            baseSum: row.baseSum,
            baseSumNotIndex: row.baseSumNotIndex || 0,
            dateFrom: dateService.shiftDate(row.dateFrom),
            dateTo: dateService.shiftDate(row.dateTo),
            flagsFix: row.flagsFix || 0,
            opDays: row.opDays || 0,
            opHours: row.opHours || 0,
            opKoef: row.opKoef || 0,
            opSum: row.opSum || 0,
            accrualDt: row.accrualDt || '[]'
          })
        })
      }
    }
    if (acc.update && (acc.paySum >= 0 || acc.paySum < 0)) {
      const accrualDtUpd = acc.accrualDt || []
      const taxIndividAccUpd = acc.taxIndividAcc || []
      delete acc.update
      delete acc.accrualDt
      delete acc.taxIndividAcc
      store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID = :accrualID:`, { accrualID: acc.ID })
      accrualStore.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: acc
      })
      if (accrualDtUpd) {
        accrualDtUpd.forEach(row => {
          accrualDt.push({
            ID: getID('S_HR_ACCRUALDT'),
            accrualID: acc.ID,
            paySum: row.paySum,
            dictFundSourceID: row.dictFundSourceID || null,
            dictProjectID: row.dictProjectID || null,
            dictProgClassID: row.dictProgClassID || null,
            departmentID: row.departmentID || null,
            accountID: row.accountID || null,
            d0: row.d0 || null,
            d0Value: row.d0Value || null,
            d1: row.d1 || null,
            d1Value: row.d1Value || null,
            d2: row.d2 || null,
            d2Value: row.d2Value || null,
            d3: row.d3 || null,
            d3Value: row.d3Value || null,
            d4: row.d4 || null,
            d4Value: row.d4Value || null,
            d5: row.d5 || null,
            d5Value: row.d5Value || null,
            d6: row.d6 || null,
            d6Value: row.d6Value || null,
            d7: row.d7 || null,
            d7Value: row.d7Value || null,
            d8: row.d8 || null,
            d8Value: row.d8Value || null,
            d9: row.d9 || null,
            d9Value: row.d9Value || null
          })
        })
      }
      acc.accrualDt = accrualDtUpd
      acc.taxIndividAcc = taxIndividAccUpd
    }
  })
  if (accrual.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrual(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
        employeeNumberPartID, payElID, orderID, empOrderID, timeSheetID, orderDtID, flagsRec, flagsFix, planHours, planDays,
        baseSum, rate, days, hours, mask, maskAdd, mtCount, paySum, minSalarySum, dateFrom, dateTo, orderDateFrom,
        orderDateTo, avgCalcType, dateFromAvg, dateToAvg, sumAvg, planSumAvg, avgDays, koef, calculateDate, createUserID, linkToParentID,
        linkToChildID, source, sourceID, paymentID, incomingDebtSum, repaymentDebtSum, calculatedSum, calendarDays, repaymentSum,
        hoursByDays, planHoursByDays, leadingHoursByDays, isAvg, extraRate, basePayment, missingEmployeeNumberID,
        baseDate, dictIllnessReasonID, standingYearMonth, standingAll, workScheduleID, dictFundSourceID, dictProjectID,
        dictProgClassID, dictPositionID, calcEarnings, paySumAccrual, paySumOff, rateOff, workNormID, loadHours, calcParams)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID', orgID bigint '$.orgID',
        periodCalcID bigint '$.periodCalcID',
        periodSalaryID bigint '$.periodSalaryID',
        periodCalc datetime '$.periodCalc',
        periodSalary datetime '$.periodSalary',
        employeeNumberID bigint '$.employeeNumberID',
        employeeNumberPartID bigint '$.employeeNumberPartID',
        payElID bigint '$.payElID',
        orderID bigint '$.orderID',
        empOrderID bigint '$.empOrderID',
        timeSheetID bigint '$.timeSheetID',
        orderDtID bigint '$.orderDtID',
        flagsRec bigint '$.flagsRec',
        flagsFix bigint '$.flagsFix',
        planHours numeric(19, 6) '$.planHours',
        planDays numeric(19, 2) '$.planDays',
        baseSum numeric(19, 6) '$.baseSum',
        rate numeric(19, 6) '$.rate',
        days numeric(19, 2) '$.days',
        hours numeric(19, 6) '$.hours',
        mask bigint '$.mask',
        maskAdd bigint '$.maskAdd',
        mtCount numeric(19, 6) '$.mtCount',
        paySum numeric(19, 2) '$.paySum',
        minSalarySum numeric(19, 2) '$.minSalarySum',
        dateFrom datetime '$.dateFrom',
        dateTo datetime '$.dateTo',
        orderDateFrom datetime '$.orderDateFrom',
        orderDateTo datetime '$.orderDateTo',
        avgCalcType nvarchar(32) '$.avgCalcType',
        dateFromAvg datetime '$.dateFromAvg',
        dateToAvg datetime '$.dateToAvg',
        sumAvg numeric(19, 6) '$.sumAvg',
        planSumAvg numeric(19, 6) '$.planSumAvg',
        avgDays numeric(19, 6) '$.avgDays',
        koef numeric(19, 2) '$.koef',
        calculateDate datetime '$.calculateDate',
        createUserID bigint '$.createUserID',
        linkToParentID bigint '$.linkToParentID',
        linkToChildID bigint '$.linkToChildID',
        source nvarchar(32) '$.source',
        sourceID bigint '$.sourceID',
        paymentID bigint '$.paymentID',
        incomingDebtSum numeric(19, 2) '$.incomingDebtSum',
        repaymentDebtSum numeric(19, 2) '$.repaymentDebtSum',
        calculatedSum numeric(19, 2) '$.calculatedSum',
        calendarDays numeric(19, 6) '$.calendarDays',
        repaymentSum numeric(19, 2) '$.repaymentSum',
        hoursByDays nvarchar(max) '$.hoursByDays',
        planHoursByDays nvarchar(max) '$.planHoursByDays',
        leadingHoursByDays nvarchar(max) '$.leadingHoursByDays',
        isAvg numeric(1) '$.isAvg',
        extraRate numeric(19, 6) '$.extraRate',
        basePayment numeric(19, 2) '$.basePayment',
        missingEmployeeNumberID bigint '$.missingEmployeeNumberID',
        baseDate datetime '$.baseDate',
        dictIllnessReasonID bigint '$.dictIllnessReasonID',
        standingYearMonth int '$.standingYearMonth',
        standingAll int '$.standingAll',
        workScheduleID bigint '$.workScheduleID',
        dictFundSourceID bigint '$.dictFundSourceID',
        dictProjectID bigint '$.dictProjectID',
        dictProgClassID bigint '$.dictProgClassID',
        dictPositionID bigint '$.dictPositionID',
        calcEarnings nvarchar(32) '$.calcEarnings',
        paySumAccrual numeric(19, 2) '$.paySumAccrual',
        paySumOff numeric(19, 2) '$.paySumOff',
        rateOff numeric(19, 2) '$.rateOff',
        workNormID bigint '$.workNormID',
        loadHours bigint '$.loadHours',
        calcParams nvarchar(max) '$.calcParams'
      )`, { p1: JSON.stringify(accrual) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrual(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
        employeeNumberPartID, payElID, orderID, empOrderID, timeSheetID, orderDtID, flagsRec, flagsFix, planHours, planDays,
        baseSum, rate, days, hours, mask, maskAdd, mtCount, paySum, minSalarySum, dateFrom, dateTo, orderDateFrom,
        orderDateTo, avgCalcType, dateFromAvg, dateToAvg, sumAvg, planSumAvg, avgDays, koef, calculateDate, createUserID, linkToParentID,
        linkToChildID, source, sourceID, paymentID, incomingDebtSum, repaymentDebtSum, calculatedSum, calendarDays, repaymentSum,
        hoursByDays, planHoursByDays, leadingHoursByDays, isAvg, extraRate, basePayment, missingEmployeeNumberID,
        baseDate, dictIllnessReasonID, standingYearMonth, standingAll, workScheduleID, dictFundSourceID, dictProjectID,
        dictProgClassID, dictPositionID, calcEarnings, paySumAccrual, paySumOff, rateOff, workNormID, loadHours, calcParams)(
        SELECT (data->>'ID')::BIGINT, 
        (data->>'orgID')::BIGINT, 
        (data->>'periodCalcID')::BIGINT, 
        (data->>'periodSalaryID')::BIGINT, 
        (data->>'periodCalc')::TIMESTAMP, 
        (data->>'periodSalary')::TIMESTAMP,
        (data->>'employeeNumberID')::BIGINT, 
        (data->>'employeeNumberPartID')::BIGINT, 
        (data->>'payElID')::BIGINT,  
        (data->>'orderID')::BIGINT, 
        (data->>'empOrderID')::BIGINT, 
        (data->>'timeSheetID')::BIGINT, 
        (data->>'orderDtID')::BIGINT, 
        (data->>'flagsRec')::BIGINT, 
        (data->>'flagsFix')::BIGINT, 
        (data->>'planHours')::numeric(19, 6),
        (data->>'planDays'):: numeric(19, 2), 
        (data->>'baseSum')::numeric(19, 6),
        (data->>'rate')::numeric(19, 6),
        (data->>'days')::numeric(19, 2), 
        (data->>'hours')::numeric(19, 6),
        (data->>'mask')::BIGINT,
        (data->>'maskAdd')::BIGINT,
        (data->>'mtCount')::numeric(19, 6),
        (data->>'paySum')::numeric(19, 2),
        (data->>'minSalarySum')::numeric(19, 2),
        (data->>'dateFrom')::TIMESTAMP,
        (data->>'dateTo')::TIMESTAMP,
        (data->>'orderDateFrom')::TIMESTAMP,
        (data->>'orderDateTo')::TIMESTAMP,
        (data->>'avgCalcType')::CHARACTER VARYING(32),
        (data->>'dateFromAvg')::TIMESTAMP,
        (data->>'dateToAvg')::TIMESTAMP,
        (data->>'sumAvg')::numeric(19, 6),
        (data->>'planSumAvg')::numeric(19, 6),
        (data->>'avgDays')::numeric(19, 6),
        (data->>'koef')::numeric(19, 2),
        (data->>'calculateDate')::TIMESTAMP,
        (data->>'createUserID')::BIGINT,
        (data->>'linkToParentID')::BIGINT,
        (data->>'linkToChildID')::BIGINT,
        (data->>'source')::CHARACTER VARYING(30),
        (data->>'sourceID')::BIGINT,
        (data->>'paymentID')::BIGINT,
        (data->>'incomingDebtSum')::numeric(19, 2),
        (data->>'repaymentDebtSum')::numeric(19, 2),
        (data->>'calculatedSum')::numeric(19, 2),
        (data->>'calendarDays')::numeric(19, 6), 
        (data->>'repaymentSum')::numeric(19, 2),
        (data->>'hoursByDays')::JSONB,
        (data->>'planHoursByDays')::JSONB,
        (data->>'leadingHoursByDays')::JSONB,
        (data->>'isAvg')::SMALLINT,
        (data->>'extraRate')::numeric(19, 6),
        (data->>'basePayment')::numeric(19, 2),
        (data->>'missingEmployeeNumberID')::BIGINT,
        (data->>'baseDate')::TIMESTAMP,
        (data->>'dictIllnessReasonID')::BIGINT,
        (data->>'standingYearMonth')::INT,
        (data->>'standingAll')::INT,
        (data->>'workScheduleID')::BIGINT,
        (data->>'dictFundSourceID')::BIGINT,
        (data->>'dictProjectID')::BIGINT,
        (data->>'dictProgClassID')::BIGINT,
        (data->>'dictPositionID')::BIGINT,
        (data->>'calcEarnings')::CHARACTER VARYING(32),
        (data->>'paySumAccrual')::numeric(19, 2),
        (data->>'paySumOff')::numeric(19, 2),
        (data->>'rateOff')::numeric(19, 6),
        (data->>'workNormID')::BIGINT,
        (data->>'loadHours')::numeric(19, 2),
        (data->>'calcParams')::JSONB
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrual) }
      )
    }
  }
  if (accrualDt.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrualDt(ID, accrualID, paySum, dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID,
       d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         paySum numeric(19, 2) '$.paySum', 
         dictFundSourceID bigint '$.dictFundSourceID',
         dictProjectID bigint '$.dictProjectID',
         dictProgClassID bigint '$.dictProgClassID',
         departmentID bigint '$.departmentID',
         accountID bigint '$.accountID',
         d0 bigint '$.d0', d0Value bigint '$.d0Value', d1 bigint '$.d1', d1Value bigint '$.d1Value',
         d2 bigint '$.d2', d2Value bigint '$.d2Value', d3 bigint '$.d3', d3Value bigint '$.d3Value',
         d4 bigint '$.d4', d4Value bigint '$.d4Value', d5 bigint '$.d5', d5Value bigint '$.d5Value',
         d6 bigint '$.d6', d6Value bigint '$.d6Value', d7 bigint '$.d7', d7Value bigint '$.d7Value',
         d8 bigint '$.d8', d8Value bigint '$.d8Value', d9 bigint '$.d9', d9Value bigint '$.d9Value'
        
       )`, { p1: JSON.stringify(accrualDt) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrualDt(ID, accrualID, paySum, dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID,
       d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)(
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualID')::BIGINT, 
            (data->>'paySum')::numeric(19, 2),
            (data->>'dictFundSourceID')::BIGINT, 
            (data->>'dictProjectID')::BIGINT,
            (data->>'dictProgClassID')::BIGINT,
            (data->>'departmentID')::BIGINT,
            (data->>'accountID')::BIGINT,
            (data->>'d0')::BIGINT,(data->>'d0Value')::BIGINT,(data->>'d1')::BIGINT,(data->>'d1Value')::BIGINT,
            (data->>'d2')::BIGINT,(data->>'d2Value')::BIGINT,(data->>'d3')::BIGINT,(data->>'d3Value')::BIGINT,
            (data->>'d4')::BIGINT,(data->>'d4Value')::BIGINT,(data->>'d5')::BIGINT,(data->>'d5Value')::BIGINT,
            (data->>'d6')::BIGINT,(data->>'d6Value')::BIGINT,(data->>'d7')::BIGINT,(data->>'d7Value')::BIGINT,
            (data->>'d8')::BIGINT,(data->>'d8Value')::BIGINT,(data->>'d9')::BIGINT,(data->>'d9Value')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualDt) }
      )
    }
  }
  if (taxIndividAcc.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_taxIndividAcc(ID, accrualID, taxIndividID, taxSum, incomeSum, taxFreeSum, privilegeSum, taxLimitID1, taxLimitID2, taxLimitID3)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         taxIndividID bigint '$.taxIndividID',
         taxSum numeric(19, 6) '$.taxSum',
         incomeSum numeric(19, 6) '$.incomeSum', 
         taxFreeSum numeric(19, 6) '$.taxFreeSum',
         privilegeSum numeric(19, 6) '$.privilegeSum', 
         taxLimitID1 bigint '$.taxLimitID1',
         taxLimitID2 bigint '$.taxLimitID2',
         taxLimitID3 bigint '$.taxLimitID3'
       )`, { p1: JSON.stringify(taxIndividAcc) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_taxIndividAcc(ID, accrualID, taxIndividID, taxSum, incomeSum, taxFreeSum, privilegeSum, taxLimitID1, taxLimitID2, taxLimitID3) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualID')::BIGINT, 
            (data->>'taxIndividID')::BIGINT, 
            (data->>'taxSum')::numeric(19, 6),
            (data->>'incomeSum')::numeric(19, 2),
            (data->>'taxFreeSum')::numeric(19, 2),
            (data->>'privilegeSum')::numeric(19, 2),
            (data->>'taxLimitID1')::BIGINT,
            (data->>'taxLimitID2')::BIGINT,
            (data->>'taxLimitID3')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(taxIndividAcc) }
      )
    }
  }

  if (accrualAvg.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrualAvg(ID, accrualID, orderID, periodID, dateFrom, dateTo, flagsFix, baseSum, baseSumNotIndex, opSum, opDays, opHours, opKoef, accrualDt)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualID bigint '$.accrualID',
         orderID bigint '$.orderID',
         periodID bigint '$.periodID',
         dateFrom datetime '$.dateFrom',
         dateTo datetime '$.dateTo',
         flagsFix bigint '$.flagsFix',
         baseSum numeric(19, 6) '$.baseSum',
         baseSumNotIndex numeric(19, 6) '$.baseSumNotIndex',
         opSum numeric(19, 6) '$.opSum',
         opDays numeric(19, 6) '$.opDays',
         opHours numeric(19, 6) '$.opHours',
         opKoef numeric(19, 6) '$.opKoef',
         accrualDt nvarchar(max) '$.accrualDt'
       )`, { p1: JSON.stringify(accrualAvg) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrualAvg(ID, accrualID, orderID, periodID, dateFrom, dateTo, flagsFix, baseSum, baseSumNotIndex, opSum, opDays, opHours, opKoef, accrualDt) (
         SELECT (data->>'ID')::BIGINT, 
         (data->>'accrualID')::BIGINT, 
         (data->>'orderID')::BIGINT, 
         (data->>'periodID')::BIGINT, 
         (data->>'dateFrom')::TIMESTAMP, 
         (data->>'dateTo')::TIMESTAMP, 
         (data->>'flagsFix')::BIGINT, 
         (data->>'baseSum')::numeric(19, 6),
         (data->>'baseSumNotIndex')::numeric(19, 6),
         (data->>'opSum')::numeric(19, 6),
         (data->>'opDays')::numeric(19, 6),
         (data->>'opHours')::numeric(19, 6),
         (data->>'opKoef')::numeric(19, 6),
         (data->>'accrualDt')::JSONB
         FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualAvg) }
      )
    }
  }
  store.freeNative()
  accrualStore.freeNative()
}
function saveAutoCalcAccrualFund (cont) {
  const store = UB.DataStore('hr_accrualFund')
  const accrualFund = []
  const accrualFundDt = []
  cont.emp[cont.employeeNumberID].accrualFund.forEach(acc => {
    if (acc.insert && (acc.paySum >= 0 || acc.paySum < 0)) {
      delete acc.insert
      acc.ID = getID('S_HR_ACCRUALFUND')
      acc.orgID = cont.orgID
      accrualFund.push({
        ID: acc.ID,
        orgID: acc.orgID,
        periodCalcID: acc.periodCalcID,
        periodSalaryID: acc.periodSalaryID,
        periodCalc: acc.periodCalc,
        periodSalary: acc.periodSalary,
        employeeNumberID: acc.employeeNumberID,
        paySum: acc.paySum,
        payFundID: acc.payFundID,
        sourceSum: typeof acc.sourceSum === 'number' ? acc.sourceSum : null,
        baseSum: typeof acc.baseSum === 'number' ? acc.baseSum : null,
        addMinSum: typeof acc.addMinSum === 'number' ? acc.addMinSum : null,
        rate: typeof acc.rate === 'number' ? acc.rate : null,
        calculateDate: new Date()
      })
      if (acc.accrualFundDt) {
        acc.accrualFundDt.forEach(row => {
          accrualFundDt.push({
            ID: getID('S_HR_ACCRUALFUNDDT'),
            accrualFundID: acc.ID,
            payElID: row.payElID || null,
            paySum: row.paySum,
            sourceSum: typeof row.sourceSum === 'number' ? row.sourceSum : null,
            baseSum: typeof row.baseSum === 'number' ? row.baseSum : null,
            dictFundSourceID: row.dictFundSourceID || null,
            dictProjectID: row.dictProjectID || null,
            dictProgClassID: row.dictProgClassID || null,
            departmentID: row.departmentID || null,
            accountID: row.accountID || null,
            d0: row.d0 || null,
            d0Value: row.d0Value || null,
            d1: row.d1 || null,
            d1Value: row.d1Value || null,
            d2: row.d2 || null,
            d2Value: row.d2Value || null,
            d3: row.d3 || null,
            d3Value: row.d3Value || null,
            d4: row.d4 || null,
            d4Value: row.d4Value || null,
            d5: row.d5 || null,
            d5Value: row.d5Value || null,
            d6: row.d6 || null,
            d6Value: row.d6Value || null,
            d7: row.d7 || null,
            d7Value: row.d7Value || null,
            d8: row.d8 || null,
            d8Value: row.d8Value || null,
            d9: row.d9 || null,
            d9Value: row.d9Value || null
          })
        })
      }
    }
  })
  if (accrualFund.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrualFund(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
       paySum, payFundID, sourceSum, baseSum, addMinSum, rate, calculateDate)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        orgID bigint '$.orgID',
        periodCalcID bigint '$.periodCalcID',
        periodSalaryID bigint '$.periodSalaryID',
        periodCalc datetime '$.periodCalc',
        periodSalary datetime '$.periodSalary',
        employeeNumberID bigint '$.employeeNumberID',
        paySum numeric(19, 6) '$.paySum',
        payFundID bigint '$.payFundID',
        sourceSum numeric(19, 6) '$.sourceSum',
        baseSum numeric(19, 6) '$.baseSum',
        addMinSum numeric(19, 6) '$.addMinSum',
        rate numeric(19, 6) '$.rate',
        calculateDate datetime '$.calculateDate'
      )`, { p1: JSON.stringify(accrualFund) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrualFund(ID, orgID, periodCalcID, periodSalaryID, periodCalc, periodSalary, employeeNumberID,
       paySum, payFundID, sourceSum, baseSum, addMinSum, rate, calculateDate) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'orgID')::BIGINT, 
            (data->>'periodCalcID')::BIGINT, 
            (data->>'periodSalaryID')::BIGINT, 
            (data->>'periodCalc')::TIMESTAMP, 
            (data->>'periodSalary')::TIMESTAMP,
            (data->>'employeeNumberID')::BIGINT, 
            (data->>'paySum')::numeric(19, 6),
            (data->>'payFundID')::BIGINT,
            (data->>'sourceSum')::numeric(19, 6),
            (data->>'baseSum')::numeric(19, 6),
            (data->>'addMinSum')::numeric(19, 6),
            (data->>'rate')::numeric(19, 6),
            (data->>'calculateDate')::TIMESTAMP
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualFund) }
      )
    }
  }
  if (accrualFundDt.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrualFundDt(ID, accrualFundID, payElID, paySum, sourceSum, baseSum, 
       dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID, d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value)
       select * from OPENJSON(?) 
       WITH (   
         ID bigint '$.ID',
         accrualFundID bigint '$.accrualFundID',
         payElID bigint '$.payElID',
         paySum numeric(19, 6) '$.paySum', 
         sourceSum numeric(19, 6) '$.sourceSum',
         baseSum numeric(19, 6) '$.baseSum',
         dictFundSourceID bigint '$.dictFundSourceID',
         dictProjectID bigint '$.dictProjectID',
         dictProgClassID bigint '$.dictProgClassID',
         departmentID bigint '$.departmentID',
         accountID bigint '$.accountID',
         d0 bigint '$.d0', d0Value bigint '$.d0Value', d1 bigint '$.d1', d1Value bigint '$.d1Value',
         d2 bigint '$.d2', d2Value bigint '$.d2Value', d3 bigint '$.d3', d3Value bigint '$.d3Value',
         d4 bigint '$.d4', d4Value bigint '$.d4Value', d5 bigint '$.d5', d5Value bigint '$.d5Value',
         d6 bigint '$.d6', d6Value bigint '$.d6Value', d7 bigint '$.d7', d7Value bigint '$.d7Value',
         d8 bigint '$.d8', d8Value bigint '$.d8Value', d9 bigint '$.d9', d9Value bigint '$.d9Value'
       )`, { p1: JSON.stringify(accrualFundDt) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrualFundDt(ID, accrualFundID, payElID, paySum, sourceSum, baseSum, 
       dictFundSourceID, dictProjectID, dictProgClassID, departmentID, accountID, d0, d0Value, d1, d1Value, d2, d2Value, d3, d3Value, d4, d4Value,
       d5, d5Value, d6, d6Value, d7, d7Value, d8, d8Value, d9, d9Value) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'accrualFundID')::BIGINT, 
            (data->>'payElID')::BIGINT,
            (data->>'paySum')::numeric(19, 6),
            (data->>'sourceSum')::numeric(19, 6),
            (data->>'baseSum')::numeric(19, 6),
            (data->>'dictFundSourceID')::BIGINT,
            (data->>'dictProjectID')::BIGINT,
            (data->>'dictProgClassID')::BIGINT,
            (data->>'departmentID')::BIGINT,
            (data->>'accountID')::BIGINT,
            (data->>'d0')::BIGINT,(data->>'d0Value')::BIGINT,(data->>'d1')::BIGINT,(data->>'d1Value')::BIGINT,
            (data->>'d2')::BIGINT,(data->>'d2Value')::BIGINT,(data->>'d3')::BIGINT,(data->>'d3Value')::BIGINT,
            (data->>'d4')::BIGINT,(data->>'d4Value')::BIGINT,(data->>'d5')::BIGINT,(data->>'d5Value')::BIGINT,
            (data->>'d6')::BIGINT,(data->>'d6Value')::BIGINT,(data->>'d7')::BIGINT,(data->>'d7Value')::BIGINT,
            (data->>'d8')::BIGINT,(data->>'d8Value')::BIGINT,(data->>'d9')::BIGINT,(data->>'d9Value')::BIGINT
       FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualFundDt) }
      )
    }
  }
  store.freeNative()
}

function deleteAccrual (accrualID) {
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualDtStore = UB.DataStore('hr_accrualDt')
  const accrualAvgStore = UB.DataStore('hr_accrualAvg')
  const taxIndividAccStore = UB.DataStore('hr_taxIndividAcc')
  const accrual = UB.Repository('hr_accrual').attrs(['periodCalcID.isClosed', 'flagsRec', 'payElID.methodID.code']).selectById(accrualID)
  if (accrual) {
    if ((!accrual['periodCalcID.isClosed'] && (accrual.flagsRec & 4)) || accrual['payElID.methodID.code'] === '151') {
      UB.Repository('hr_accrualAvg').attrs(['ID']).where('accrualID', '=', accrualID).selectAsObject()
        .forEach((row) => {
          accrualAvgStore.run('delete', { execParams: { ID: row.ID } })
        })
      UB.Repository('hr_accrualDt').attrs(['ID']).where('accrualID', '=', accrualID).selectAsObject()
        .forEach((row) => {
          accrualDtStore.run('delete', { execParams: { ID: row.ID } })
        })
      UB.Repository('hr_taxIndividAcc').attrs(['ID']).where('accrualID', '=', accrualID).selectAsObject()
        .forEach((row) => {
          taxIndividAccStore.run('delete', { execParams: { ID: row.ID } })
        })
      accrualStore.run('delete', {
        execParams: { ID: accrualID }
      })
    } else {
      if (accrual['periodCalcID.isClosed']) {
        throw new UB.UBAbort(`<<<${UB.i18n('Заборонео видалення Нарахувань або Утримань в закритому періоді')}>>>`)
      }
    }
  }
  accrualStore.freeNative()
  accrualDtStore.freeNative()
  taxIndividAccStore.freeNative()
}

function saveAccruals ({ accruals, checkPeriod = true, checkPayElInCalcPayAttr = false, payEls = [], calcBalance = 0, description = '' }) {
  const calcService = require('../../HR/modules/calcService')
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualDtStore = UB.DataStore('hr_accrualDt')
  const periodsCalc = [...new Set(accruals.map(o => o.periodCalcID))]
  const calcPeriods = periodService.getPeriods(periodsCalc)
  const employeeNumbers = []
  if (checkPeriod && calcPeriods.find(o => !!o.isClosed)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')}>>>`)
  }
  if (accruals.some(o => o.paySum === null || o.paySum === undefined)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Існують записи в яких не заповнена фактична сума')}>>>`)
  }
  accruals.forEach(accr => {
    let accrualDt = accr.accrualDt || []
    delete accr.accrualDt
    if (!accr.ID) {
      accr.ID = getID('S_HR_ACCRUAL')
    }
    accr.calculateDate = new Date()
    accr.createUserID = Session.uData.userID
    accr.baseSum = accr.baseSum ? round(accr.baseSum, 6) : 0
    if (checkPayElInCalcPayAttr) {
      accr.flagsRec = accr.flagsRec | (payEls[accr.payElID].ignoreInCalcPay ? 1 << 13 : 0)
    }

    if (!accr.hours && accr.orderID && accr.dateFrom && accr.dateTo) {
      accr.hours = UB.Repository('tim_timeSheet')
        .attrs(['SUM([planHour])'])
        .where('dateWork', '>=', dateService.shiftDate(accr.dateFrom))
        .where('dateWork', '<=', dateService.shiftDate(accr.dateTo))
        .where('orderID', '=', accr.orderID)
        .where('isActive', '=', 1)
        .where('employeeNumberID', '=', accr.employeeNumberID)
        .selectScalar() || null
    }

    accrualStore.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: accr
    })
    if (!accrualDt || !accrualDt.length) {
      accrualDt.push({ paySum: accr.paySum })
    } else {
      let sumDt = 0
      accrualDt.forEach(accrDt => {
        sumDt = round(sumDt + accrDt.paySum)
      })
      if (sumDt !== accr.paySum) {
        accrualDt[0].paySum = round(accrualDt[0].paySum + accr.paySum - sumDt)
      }
    }
    accrualDt.forEach(row => {
      row.accrualID = accr.ID
      row.ID = getID('S_HR_ACCRUALDT')
      accrualDtStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: row
      })
    })

    if (!employeeNumbers.find(o => o === accr.employeeNumberID)) {
      employeeNumbers.push(accr.employeeNumberID)
    }
  })
  if (employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, calcBalance, description })
  }
  accrualStore.freeNative()
  accrualDtStore.freeNative()
}

function saveFundAccruals ({ accrualFunds, checkPeriod = true, startCalc = true, calcBalance = 0, description = '' }) {
  const calcService = require('../../HR/modules/calcService')
  const accrualFundStore = UB.DataStore('hr_accrualFund')
  const accrualFundDtStore = UB.DataStore('hr_accrualFundDt')
  const periodsCalc = [...new Set(accrualFunds.map(o => o.periodCalcID))]
  const calcPeriods = periodService.getPeriods(periodsCalc)
  const employeeNumbers = []
  if (checkPeriod && calcPeriods.find(o => !!o.isClosed)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')}>>>`)
  }
  accrualFunds.forEach(accr => {
    let accrualFundDt = accr.accrualFundDt || []
    delete accr.accrualFundDt
    if (!accr.ID) {
      accr.ID = getID('S_HR_ACCRUALFUND')
    }
    accr.calculateDate = new Date(),
    accr.baseSum = accr.baseSum ? round(accr.baseSum, 6) : 0
    accrualFundStore.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: accr
    })
    if (!accrualFundDt || !accrualFundDt.length) {
      accrualFundDt.push({ paySum: accr.paySum })
    } else {
      let sumDt = 0
      accrualFundDt.forEach(accrDt => {
        sumDt = round(sumDt + accrDt.paySum)
      })
      if (sumDt !== accr.paySum) {
        accrualFundDt[0].paySum = round(accrualFundDt[0].paySum + accr.paySum - sumDt)
      }
    }
    accrualFundDt.forEach(row => {
      row.accrualFundID = accr.ID
      row.ID = getID('S_HR_ACCRUALFUNDDT')
      accrualFundDtStore.run('insert', {
        __skipOptimisticLock: true,
        __skipSelectAfterInsert: true,
        __skipRls: true,
        __skipAclRls: true,
        execParams: row
      })
    })

    if (startCalc && !employeeNumbers.find(o => o === accr.employeeNumberID)) {
      employeeNumbers.push(accr.employeeNumberID)
    }
  })
  if (startCalc && employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, calcBalance, description })
  }
  accrualFundStore.freeNative()
  accrualFundDtStore.freeNative()
}

function deleteAccrualsByOrder ({ orderID, periodCalcID, calcBalance = 0, description = '', checkSicknessRequis = true }) {
  const calcService = require('../../HR/modules/calcService')
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualDtStore = UB.DataStore('hr_accrualDt')
  const accruals = UB.Repository('hr_accrual')
    .attrs(['ID', 'periodCalcID.isClosed', 'employeeNumberID'])
    .where('orderID', '=', orderID)
    .whereIf(periodCalcID, 'periodCalcID', '=', periodCalcID)
    .selectAsObject()
  if (checkSicknessRequis && accruals.length) {
    const sicknessRequis = UB.Repository('hr_sicknessRequisAccrual')
      .attrs('sicknessRequisDtID.sicknessRequisID.description')
      .where('accrualID', 'in', accruals.map(o => o.ID))
      .limit(1)
      .selectSingle()
    if (sicknessRequis) {
      throw new UB.UBAbort(`<<<${UB.i18n('Частина нарахуваннь документу додані до Заяви-розрахунку СС {0}', sicknessRequis['sicknessRequisDtID.sicknessRequisID.description'])}>>>`)
    }
  }
  const employeeNumbers = []
  accruals.forEach(accr => {
    if (accr['periodCalcID.isClosed']) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')}>>>`)
    }
    if (!employeeNumbers.find(o => o === accr.employeeNumberID)) {
      employeeNumbers.push(accr.employeeNumberID)
    }
  })
  if (periodCalcID) {
    accrualStore.runSQL(`SELECT ID "ID" FROM hr_accrual WHERE (orderID = :orderID: OR sourceID = :orderID:) AND periodCalcID = :periodCalcID:`, { orderID: orderID, periodCalcID: periodCalcID })
    let dataIDs = accrualStore.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      accrualStore.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualStore.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualStore.execSQL(`DELETE FROM hr_accrual WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
  } else {
    accrualStore.runSQL(`SELECT ID "ID" FROM hr_accrual WHERE orderID = :orderID: OR sourceID = :orderID:`, { orderID: orderID })
    let dataIDs = accrualStore.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      accrualStore.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualStore.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualStore.execSQL(`DELETE FROM hr_accrual WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
  }
  if (employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, calcBalance, description })
  }
  accrualStore.freeNative()
  accrualDtStore.freeNative()
}

function deleteFundAccrualsByOrder ({ orderID, periodCalcID, startCalc = true, calcBalance = 0, description = '' }) {
  const calcService = require('../../HR/modules/calcService')
  const accrualFundStore = UB.DataStore('hr_accrualFund')
  const accrualFundDtStore = UB.DataStore('hr_accrualFundDt')
  const accrualFunds = UB.Repository('hr_accrualFund')
    .attrs(['ID', 'periodCalcID.isClosed', 'employeeNumberID'])
    .where('orderID', '=', orderID)
    .whereIf(periodCalcID, 'periodCalcID', '=', periodCalcID)
    .selectAsObject()
  const employeeNumbers = []
  accrualFunds.forEach(accr => {
    if (accr['periodCalcID.isClosed']) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо змінювати дані в закритому Розрахунковому періоді')}>>>`)
    }
    if (startCalc && !employeeNumbers.find(o => o === accr.employeeNumberID)) {
      employeeNumbers.push(accr.employeeNumberID)
    }
  })
  if (periodCalcID) {
    accrualFundStore.runSQL(`SELECT ID "ID" FROM hr_accrualFund WHERE orderID = :orderID: AND periodCalcID = :periodCalcID:`, { orderID: orderID, periodCalcID: periodCalcID })
    let dataIDs = accrualFundStore.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      accrualFundStore.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualFundStore.execSQL(`DELETE FROM hr_accrualFund WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
  } else {
    accrualFundStore.runSQL(`SELECT ID "ID" FROM hr_accrualFund WHERE orderID = :orderID:`, { orderID: orderID })
    let dataIDs = accrualFundStore.getAsJsObject().map(o => o.ID)
    if (dataIDs.length) {
      accrualFundStore.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
      accrualFundStore.execSQL(`DELETE FROM hr_accrualFund WHERE ID${entityBaseService.getInExpression('dataIDs')}`, { dataIDs })
    }
  }
  if (startCalc && employeeNumbers.length) {
    calcService.addCalcQueue({ employeeNumbers, calcBalance, description })
  }
  accrualFundStore.freeNative()
  accrualFundDtStore.freeNative()
}

function round (n, dec = 2) {
  let X = n * Math.pow(10, dec) + (n >= 0 ? 0.000000001 : -0.000000001)
  X = Math.round(X)
  return Number((X / Math.pow(10, dec)).toFixed(dec))
}

function trunc (n, dec = 2) {
  return Math.trunc(n * Math.pow(10, dec)) / Math.pow(10, dec)
}

function roundPayEl (sum, roundUpTo, trunc) {
  let X
  switch (roundUpTo) {
    case '1':
      X = sum * 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X / 100).toFixed(2))
    case '2':
      X = sum * 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X / 10).toFixed(1))
    case '3':
      X = trunc ? Math.trunc(sum) : Math.round(sum)
      return Number(X.toFixed(0))
    case '4':
      X = sum / 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 10).toFixed(0))
    case '5':
      X = sum / 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 100).toFixed(0))
    case '6':
      X = sum / 1000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 1000).toFixed(0))
    case '7':
      X = sum / 10000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 10000).toFixed(0))
    case '8':
      X = sum / 100000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 100000).toFixed(0))
    case '9':
      X = sum / 5 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X * 5).toFixed(0))
    default:
      X = sum * 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = trunc ? Math.trunc(X) : Math.round(X)
      return Number((X / 100).toFixed(2))
  }
}

function roundValue (x, roundWay = 'DEF') {
  return roundWay === 'DOWN' ? Math.trunc(x) : (roundWay === 'UP' ? Math.ceil(x) : Math.round(x))
}

function roundSum (sum, roundUpTo, roundWay = 'DEF') {
  let X
  switch (roundUpTo) {
    case '1':
      X = sum * 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X / 100).toFixed(2))
    case '2':
      X = sum * 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X / 10).toFixed(1))
    case '3':
      X = roundValue(sum, roundWay)
      return Number(X.toFixed(0))
    case '4':
      X = sum / 10 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 10).toFixed(0))
    case '5':
      X = sum / 100 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 100).toFixed(0))
    case '6':
      X = sum / 1000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 1000).toFixed(0))
    case '7':
      X = sum / 10000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 10000).toFixed(0))
    case '8':
      X = sum / 100000 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 100000).toFixed(0))
    case '9':
      X = sum / 5 + (sum >= 0 ? 0.000000001 : -0.000000001)
      X = roundValue(X, roundWay)
      return Number((X * 5).toFixed(0))
    default:
      if (roundWay === 'UP') {
        sum = roundSum(sum, 6)
      }
      X = sum * 100 + (roundWay !== 'UP' ? (sum >= 0 ? 0.000000001 : -0.000000001) : 0)
      X = roundValue(X, roundWay)
      return Number((X / 100).toFixed(2))
  }
}

function getBalanceAccrual (cont, periodID) {
  return cont.emp[cont.employeeNumberID].accrual.reduce((sum, accr) => {
    if (accr.periodCalcID === periodID && !(accr.flagsRec & 1 << 13) && !(accr.flagsRec & 1 << 16)) {
      sum = round(sum + ((cont.payEl[accr.payElID].method.groupType !== 'PAYMENT' ? -1 : 1) * accr.paySum), 2)
    }
    return sum
  }, 0)
}

function savePeriodEmpBalance (cont, period) {
  const store = UB.DataStore('hr_accrualBalance')
  const accrualBalance = []
  store.execSQL(`DELETE FROM hr_accrualBalance WHERE employeeNumberID  = :employeeNumberID:
                 AND periodCalcID = :periodCalcID: `,
  { employeeNumberID: cont.employeeNumberID, periodCalcID: period.ID })
  if (cont.emp[cont.employeeNumberID].prop && cont.emp[cont.employeeNumberID].prop.employeeNumber && cont.emp[cont.employeeNumberID].prop.employeeNumber.empWorkPlace === '5') {
    return 0
  }
  const priorAccrualBalance = UB.Repository('hr_accrualBalance')
    .attrs(['SUM([sumTo])', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID'])
    .where('employeeNumberID', '=', cont.employeeNumberID)
    .where('periodCalcID', '=', period.priorPeriodID)
    .groupBy(['dictFundSourceID', 'dictProgClassID', 'dictProjectID'])
    .selectAsObject({
      'SUM([sumTo])': 'sumTo'
    })
  const balanceDt = []
  let sumTo = 0
  priorAccrualBalance.forEach(row => {
    if (row.sumTo !== 0) {
      balanceDt.push({
        sumFrom: row.sumTo,
        sumTo: row.sumTo,
        dictFundSourceID: row.dictFundSourceID,
        dictProjectID: row.dictProjectID,
        dictProgClassID: row.dictProgClassID,
        employeeNumberID: cont.employeeNumberID,
        periodCalcID: period.ID,
        sumPlus: 0,
        sumMinus: 0,
        sumPay: 0
      })
    }
  })
  cont.emp[cont.employeeNumberID].accrual.forEach(accr => {
    if (accr.periodCalcID === period.ID && !(accr.flagsRec & 1 << 13) && !(accr.flagsRec & 1 << 16)) {
      if (accr.accrualDt && accr.accrualDt.length) {
        let sumDt = 0
        accr.accrualDt.forEach(accrDt => {
          sumDt = round(sumDt + accrDt.paySum)
        })
        if (sumDt !== accr.paySum) {
          accr.accrualDt[0].paySum = round(accr.accrualDt[0].paySum + accr.paySum - sumDt)
        }
        accr.accrualDt.forEach(accrDt => {
          const balance = balanceDt.find(o => o.dictFundSourceID === (accrDt.dictFundSourceID || null) &&
            o.dictProjectID === (accrDt.dictProjectID || null) && o.dictProgClassID === (accrDt.dictProgClassID || null))
          if (balance) {
            balance.sumPlus = round(balance.sumPlus + (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (accrDt.paySum || 0) : 0))
            balance.sumMinus = round(balance.sumMinus + (cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (accrDt.paySum || 0) : 0))
            balance.sumPay = round(balance.sumPay + (cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (accrDt.paySum || 0) : 0))
            balance.sumTo = round(balance.sumFrom + balance.sumPlus - balance.sumMinus - balance.sumPay)
          } else {
            balanceDt.push({
              sumFrom: 0,
              sumTo: (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * (accrDt.paySum || 0),
              dictFundSourceID: accrDt.dictFundSourceID || null,
              dictProjectID: accrDt.dictProjectID || null,
              dictProgClassID: accrDt.dictProgClassID || null,
              employeeNumberID: cont.employeeNumberID,
              periodCalcID: period.ID,
              sumPlus: cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (accrDt.paySum || 0) : 0,
              sumMinus: cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (accrDt.paySum || 0) : 0,
              sumPay: cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (accrDt.paySum || 0) : 0
            })
          }
        })
      } else {
        const balance = balanceDt.find(o => o.dictFundSourceID === null && o.dictProjectID === null && o.dictProgClassID === null)
        if (balance) {
          balance.sumPlus = round(balance.sumPlus + (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (accr.paySum || 0) : 0))
          balance.sumMinus = round(balance.sumMinus + (cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (accr.paySum || 0) : 0))
          balance.sumPay = round(balance.sumPay + (cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (accr.paySum || 0) : 0))
          balance.sumTo = round(balance.sumFrom + balance.sumPlus - balance.sumMinus - balance.sumPay)
        } else {
          balanceDt.push({
            sumFrom: 0,
            sumTo: (cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * (accr.paySum || 0),
            dictFundSourceID: null,
            dictProgClassID: null,
            dictProjectID: null,
            employeeNumberID: cont.employeeNumberID,
            periodCalcID: period.ID,
            sumPlus: cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? (accr.paySum || 0) : 0,
            sumMinus: cont.payEl[accr.payElID].method.groupType === 'OFFTAKE' ? (accr.paySum || 0) : 0,
            sumPay: cont.payEl[accr.payElID].method.groupType === 'FORPAY' ? (accr.paySum || 0) : 0
          })
        }
      }
    }
  })

  balanceDt.forEach(accrDt => {
    sumTo = round(sumTo + accrDt.sumTo, 2)
    accrualBalance.push({
      ID: getID('S_HR_ACCRUALBALANCE'),
      employeeNumberID: accrDt.employeeNumberID,
      periodCalcID: accrDt.periodCalcID,
      dictFundSourceID: accrDt.dictFundSourceID || null,
      dictProjectID: accrDt.dictProjectID || null,
      dictProgClassID: accrDt.dictProgClassID || null,
      sumFrom: round(accrDt.sumFrom, 2),
      sumPlus: round(accrDt.sumPlus, 2),
      sumMinus: round(accrDt.sumMinus, 2),
      sumPay: round(accrDt.sumPay, 2),
      sumTo: round(accrDt.sumTo, 2),
      isImport: 0
    })
  })
  if (accrualBalance.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_accrualBalance(ID, employeeNumberID, periodCalcID, dictFundSourceID, dictProjectID, dictProgClassID, sumFrom, sumPlus, sumMinus,
       sumPay, sumTo, isImport)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        employeeNumberID bigint '$.employeeNumberID',
        periodCalcID bigint '$.periodCalcID',
        dictFundSourceID bigint '$.dictFundSourceID',
        dictProjectID bigint '$.dictProjectID',
        dictProgClassID bigint '$.dictProgClassID',
        sumFrom numeric(19, 6) '$.sumFrom',
        sumPlus numeric(19, 6) '$.sumPlus',
        sumMinus numeric(19, 6) '$.sumMinus',
        sumPay numeric(19, 6) '$.sumPay',
        sumTo numeric(19, 6) '$.sumTo',
        isImport numeric(1) '$.isImport'
       )`, { p1: JSON.stringify(accrualBalance) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_accrualBalance(ID, employeeNumberID, periodCalcID, dictFundSourceID, dictProjectID, dictProgClassID, sumFrom, sumPlus, sumMinus,
       sumPay, sumTo, isImport) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'employeeNumberID')::BIGINT, 
            (data->>'periodCalcID')::BIGINT, 
            (data->>'dictFundSourceID')::BIGINT,
            (data->>'dictProjectID')::BIGINT,
            (data->>'dictProgClassID')::BIGINT,
            (data->>'sumFrom')::numeric(19, 6),
            (data->>'sumPlus')::numeric(19, 6),
            (data->>'sumMinus')::numeric(19, 6),
            (data->>'sumPay')::numeric(19, 6),
            (data->>'sumTo')::numeric(19, 6), 
            (data->>'isImport')::SMALLINT
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(accrualBalance) }
      )
    }
  }

  store.freeNative()
  return sumTo
}

function getAccrualForRl ({ employeeNumberID, period, noEmployeePart, dictFundSourceIDs, dictProgClassIDs, dictProjectIDs, includeSecEmp }) {
  const result = {
    dictFundSourceIDs: [],
    dictProgClassIDs: [],
    dictProjectIDs: [],
    secondaryJobsNumbers: []
  }
  if (includeSecEmp) {
    const employeeID = UB.Repository('hr_employeePositionS')
      .attrs(['employeeID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('workPlace', '=', '1')
      .limit(1)
      .selectScalar()
    result.secondaryJobsNumbers = employeeID ? UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID'])
      .where('employeeID', '=', employeeID)
      .where('employeeNumberID', '!=', employeeNumberID)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('organizationID', '=', period.orgID)
      .where('workPlace', '=', '2')
      .groupBy('employeeNumberID')
      .selectAsObject() : []
  }
  result.accrual = UB.Repository('hr_accrual')
    .attrs(['ID', 'orgID', 'periodSalaryID', 'periodCalcID', 'periodCalc', 'periodSalary', 'calculateDate',
      'createUserID.employeeNumberID.employeeID.fullFIO', 'createUserID.fullName', 'createUserID.name',
      'periodSalaryID.name', 'employeeNumberID', 'employeeNumberPartID', 'payElID', 'linkToParentID', 'paymentID',
      'payElID.methodID.algorithm', 'flagsRec', 'flagsFix', 'dateFrom', 'dateTo', 'orderID', 'orderID.orderDate', 'orderID.orderNumber',
      'payElID.methodID.methodGroupID.groupType', 'payElID.methodID.code', 'payElID.code', 'payElID.name', 'payElID.mi_deleteUser',
      'payElID.description', 'payElID.ignoreInCalcPay', 'orderID.orderClass.entityName',
      'days', 'hours', 'rate', 'paySum', 'planDays', 'planHours', 'baseSum', 'mask', 'maskAdd', 'mtCount', 'source', 'baseDate',
      'avgCalcType', 'dateFromAvg', 'dateToAvg', 'sumAvg', 'planSumAvg', 'avgDays', 'sourceID', 'koef', 'minSalarySum', 'incomingDebtSum',
      'repaymentDebtSum', 'calculatedSum', 'paySumAccrual', 'repaymentSum', 'planHoursByDays', 'hoursByDays', 'leadingHoursByDays', 'extraRate',
      'missingEmployeeNumberID', 'orderDateFrom', 'orderDateTo', 'calendarDays', 'orderID.description', 'orderDtID', 'empOrderID', 'timeSheetID',
      'workScheduleID.caption', 'workScheduleID', 'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'dictPositionID',
      'basePayment', 'dictPositionID.name', 'standingAll', 'calcParams', 'payElID.calcProportion', 'calcEarnings'])

    .where('employeeNumberID', '=', employeeNumberID)
    .where('orgID', '=', period.orgID)
    .where('periodCalcID', '=', period.ID)
    .whereIf(noEmployeePart, `(flagsRec & 8192 != 8192)`, 'custom')
    .selectAsObject({
      'payElID.methodID.methodGroupID.groupType': 'payType',
      'payElID.code': 'code',
      'payElID.name': 'name',
      'payElID.description': 'description',
      'payElID.ignoreInCalcPay': 'ignoreInCalcPay',
      'payElID.methodID.code': 'methodCode',
      'payElID.mi_deleteUser': 'payElDeleted',
      'orderID.orderDate': 'orderDate',
      'dictPositionID.name': 'dictPositionName',
      'createUserID.employeeNumberID.employeeID.fullFIO': 'createUserFullFIO',
      'createUserID.fullName': 'createUserFullName',
      'createUserID.name': 'createUserName',
      'orderID.orderClass.entityName': 'orderEntityName',
      'payElID.calcProportion': 'calcProportion'
    })
  result.accrualFund = UB.Repository('hr_accrualFund')
    .attrs(['ID', 'periodSalaryID', 'periodCalcID', 'periodCalc', 'periodSalary',
      'periodSalaryID.name', 'employeeNumberID', 'payFundID', 'payFundID.name', 'payFundID.code', 'payFundID.isRecSum',
      'rate', 'paySum', 'baseSum', 'sourceSum', 'calculateDate'])
    .whereIf(!result.secondaryJobsNumbers.length, 'employeeNumberID', '=', employeeNumberID)
    .whereIf(result.secondaryJobsNumbers.length, 'employeeNumberID', 'in', [employeeNumberID].concat(result.secondaryJobsNumbers.map(o => o.employeeNumberID)))
    .where('orgID', '=', period.orgID)
    .where('periodCalcID', '=', period.ID)
    .selectAsObject({
      'periodSalaryID.name': 'periodName',
      'payFundID.code': 'code',
      'payFundID.name': 'name',
      'payFundID.isRecSum': 'isRecSum'
    })

  const accIDs = result.accrual.map(o => o.ID)
  const accFundIDs = result.accrualFund.map(o => o.ID)
  const taxIndividAcc = UB.Repository('hr_taxIndividAcc')
    .attrs(['ID', 'taxIndividID', 'taxIndividID.name', 'taxSum', 'incomeSum', 'taxFreeSum', 'privilegeSum', 'accrualID', 'taxIndividID.priority'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .orderBy('taxIndividID.priority')
    .selectAsObject()

  const accrualAvg = getAccrualAvgByAccrual(result.accrual,
    ['ID', 'accrualID', 'orderID', 'periodID', 'periodID.name', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'opHours', 'baseSum',
      'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'])

  const accrualDt = UB.Repository('hr_accrualDt')
    .attrs(['*'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .selectAsObject()

  const accrualFundDt = UB.Repository('hr_accrualFundDt')
    .attrs(['*'])
    .where('accrualFundID', 'in', accFundIDs)
    .selectAsObject()

  const accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs(['dictFundSourceID', 'dictProgClassID', 'dictProjectID'])
    .whereIf(!result.secondaryJobsNumbers.length, 'employeeNumberID', '=', employeeNumberID)
    .whereIf(result.secondaryJobsNumbers.length, 'employeeNumberID', 'in', [employeeNumberID].concat(result.secondaryJobsNumbers.map(o => o.employeeNumberID)))
    .where('periodCalcID', '=', period.priorPeriodID)
    .where('dictFundSourceID', 'isNotNull', undefined, 'fundSource')
    .where('dictProgClassID', 'isNotNull', undefined, 'progClass')
    .where('dictProjectID', 'isNotNull', undefined, 'dictProject')
    .logic('(([fundSource]) OR ([progClass]) OR ([dictProject]))')
    .selectAsObject()

  accrualDt.forEach(o => {
    if (o.dictFundSourceID !== null && !result.dictFundSourceIDs.includes(o.dictFundSourceID)) {
      result.dictFundSourceIDs.push(o.dictFundSourceID)
    }
    if (o.dictProjectID !== null && !result.dictProjectIDs.includes(o.dictProjectID)) {
      result.dictProjectIDs.push(o.dictProjectID)
    }
    if (o.dictProgClassID !== null && !result.dictProgClassIDs.includes(o.dictProgClassID)) {
      result.dictProgClassIDs.push(o.dictProgClassID)
    }
  })
  accrualFundDt.forEach(o => {
    if (o.dictFundSourceID !== null && !result.dictFundSourceIDs.includes(o.dictFundSourceID)) {
      result.dictFundSourceIDs.push(o.dictFundSourceID)
    }
    if (o.dictProjectID !== null && !result.dictProjectIDs.includes(o.dictProjectID)) {
      result.dictProjectIDs.push(o.dictProjectID)
    }
    if (o.dictProgClassID !== null && !result.dictProgClassIDs.includes(o.dictProgClassID)) {
      result.dictProgClassIDs.push(o.dictProgClassID)
    }
  })
  accrualBalance.forEach(o => {
    if (o.dictFundSourceID !== null && !result.dictFundSourceIDs.includes(o.dictFundSourceID)) {
      result.dictFundSourceIDs.push(o.dictFundSourceID)
    }
    if (o.dictProjectID !== null && !result.dictProjectIDs.includes(o.dictProjectID)) {
      result.dictProjectIDs.push(o.dictProjectID)
    }
    if (o.dictProgClassID !== null && !result.dictProgClassIDs.includes(o.dictProgClassID)) {
      result.dictProgClassIDs.push(o.dictProgClassID)
    }
  })

  const isIncludeEmptyDictFundSourceID = dictFundSourceIDs && dictFundSourceIDs.includes(0)
  const isIncludeEmptyDictProgClassID = dictProgClassIDs && dictProgClassIDs.includes(0)
  const isIncludeEmptyDictProjectID = dictProjectIDs && dictProjectIDs.includes(0)
  result.accrual.forEach(acc => {
    acc.taxIndividAcc = JSON.stringify(taxIndividAcc.filter(o => o.accrualID === acc.ID))
    let accrualAvgByAccrual = accrualAvg.filter(o => o.accrualID === acc.ID)
    acc.accrualAvg = JSON.stringify(accrualAvgByAccrual.length ? accrualAvgByAccrual : (acc.orderID ? accrualAvg.filter(o => o.orderID === acc.orderID && o.accrualID === null) : []))
    const accrualDts = accrualDt.filter((o) => {
      return o.accrualID === acc.ID &&
        (!dictFundSourceIDs || dictFundSourceIDs.includes(o.dictFundSourceID) || (isIncludeEmptyDictFundSourceID && !o.dictFundSourceID)) &&
        (!dictProjectIDs || dictProjectIDs.includes(o.dictProjectID) || (isIncludeEmptyDictProjectID && !o.dictProjectID)) &&
        (!dictProgClassIDs || dictProgClassIDs.includes(o.dictProgClassID) || (isIncludeEmptyDictProgClassID && !o.dictProgClassID))
    })
    if (dictFundSourceIDs || dictProgClassIDs || dictProjectIDs) {
      acc.paySum = 0
      accrualDts.forEach(o => { acc.paySum = round(acc.paySum + o.paySum) })
    }
    acc.accrualDt = JSON.stringify(accrualDts)
  })

  result.accrualFund.forEach(acc => {
    const accrualFundDts = accrualFundDt.filter((o) => {
      return o.accrualFundID === acc.ID &&
        (!dictFundSourceIDs || dictFundSourceIDs.includes(o.dictFundSourceID) || (isIncludeEmptyDictFundSourceID && !o.dictFundSourceID)) &&
        (!dictProjectIDs || dictProjectIDs.includes(o.dictProjectID) || (isIncludeEmptyDictProjectID && !o.dictProjectID)) &&
        (!dictProgClassIDs || dictProgClassIDs.includes(o.dictProgClassID) || (isIncludeEmptyDictProgClassID && !o.dictProgClassID))
    })
    if (dictFundSourceIDs || dictProgClassIDs || dictProjectIDs) {
      acc.paySum = 0
      acc.baseSum = 0
      acc.sourceSum = 0
      accrualFundDts.forEach(o => {
        acc.paySum = round(acc.paySum + o.paySum)
        acc.baseSum = round(acc.baseSum + o.baseSum)
        acc.sourceSum = round(acc.sourceSum + o.sourceSum)
      })
    }
    acc.accrualFundDt = JSON.stringify(accrualFundDts)
  })

  return result
}

function getAccrualBalance (employeeNumberID, periodID, excludeDictFundSource, includeDictFundSource,
  excludeDictProgClass, includeDictProgClass, excludeDictProject, includeDictProject) {
  if (!excludeDictFundSource && !includeDictFundSource && !excludeDictProgClass && !includeDictProgClass &&
    !excludeDictProject && !includeDictProject) {
    return UB.Repository('hr_accrualBalance')
      .attrs('SUM([sumTo])')
      .where('employeeNumberID', '=', employeeNumberID)
      .where('periodCalcID', '=', periodID)
      .selectScalar() || 0
  } else {
    const accrualBalance = UB.Repository('hr_accrualBalance')
      .attrs(['dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'sumTo'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('periodCalcID', '=', periodID)
      .selectAsObject()
    const sumTo = accrualBalance.reduce((a, b) => {
      if (excludeDictFundSource && excludeDictFundSource.includes(b.dictFundSourceID || 0)) { return a }
      if (excludeDictProgClass && excludeDictProgClass.includes(b.dictProgClassID || 0)) { return a }
      if (excludeDictProject && excludeDictProject.includes(b.dictProjectID || 0)) { return a }
      if (includeDictFundSource && !includeDictFundSource.includes(b.dictFundSourceID || 0)) { return a }
      if (includeDictProgClass && !includeDictProgClass.includes(b.dictProgClassID || 0)) { return a }
      if (includeDictProject && !includeDictProject.includes(b.dictProjectID || 0)) { return a }
      return a + b.sumTo
    }, 0)
    return sumTo
  }
}

function getAccrualBalanceByFund (employeeNumberID, periodID, dictFundSource = [0], dictProgClass, dictProject) {
  return UB.Repository('hr_accrualBalance')
    .attrs('SUM([sumTo])')
    .where('employeeNumberID', '=', employeeNumberID)
    .where('periodCalcID', '=', periodID)
    .where('dictFundSourceID', 'in', dictFundSource)
    .whereIf(dictProgClass, 'dictProgClassID', 'in', dictProgClass)
    .whereIf(dictProject, 'dictProjectID', 'in', dictProject)
    .selectScalar() || 0
}

function getAccrualBalanceForEmployeeNumbers (cont, employeeNumbers, periodID, attrName, excludeDictFundSource = [0], excludeDictProgClass, excludeDictProject) {
  const balance = UB.Repository('hr_accrualBalance')
    .attrs('SUM([sumTo])', 'employeeNumberID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID')
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('periodCalcID', '=', periodID)
    .where('dictFundSourceID', 'notIn', excludeDictFundSource, 'fundIn')
    .where('dictFundSourceID', 'isNull', undefined, 'fundNull')
    .whereIf(excludeDictProgClass, 'dictProgClassID', 'notIn', excludeDictProgClass, 'progClassIn')
    .whereIf(excludeDictProgClass, 'dictProgClassID', 'isNull', undefined, 'progClassNull')
    .whereIf(excludeDictProject, 'dictProjectID', 'notIn', excludeDictProject, 'projectIn')
    .whereIf(excludeDictProject, 'dictProjectID', 'isNull', undefined, 'projectNull')
    .logic(`(([fundIn] OR [fundNull])${excludeDictProject ? ' AND ([projectIn] OR [projectNull])' : ''}${excludeDictProgClass ? ' AND ([progClassIn] OR [progClassNull])' : ''} )`)
    .groupBy(['employeeNumberID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID'])
    .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

  balance.forEach(row => {
    if (!cont.emp[row.employeeNumberID][attrName]) {
      cont.emp[row.employeeNumberID][attrName] = row.sumTo
      cont.emp[row.employeeNumberID][`${attrName}FundSource`] = [{ dictFundSourceID: row.dictFundSourceID, dictProgClassID: row.dictProgClassID, dictProjectID: row.dictProjectID, paySum: row.sumTo }]
    } else {
      cont.emp[row.employeeNumberID][attrName] = round(cont.emp[row.employeeNumberID][attrName] + row.sumTo)
      cont.emp[row.employeeNumberID][`${attrName}FundSource`].push({ dictFundSourceID: row.dictFundSourceID, dictProgClassID: row.dictProgClassID, dictProjectID: row.dictProjectID, paySum: row.sumTo })
    }
  })
}

function getAccrualBalanceForEmployeeNumbersNext (cont, employeeNumbers, currentPeriod, period, attrName, addBalance, excludeDictFundSource = [0]) {
  if (employeeNumbers && employeeNumbers.length) {
    let store = UB.DataStore('hr_accrual')
    store.runSQL(` SELECT 
    SUM(CASE WHEN g.groupType = 'PAYMENT' THEN adt.paySum ELSE adt.paySum * -1 END) as "paySum",
    a.employeeNumberID "employeeNumberID"
  FROM hr_accrual a
    JOIN hr_payEl p ON a.payElID = p.ID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    JOIN hr_accrualDt adt ON adt.accrualID = a.ID
  WHERE a.employeeNumberID${entityBaseService.getInExpression('employeeNumbers')} AND
  a.periodCalc > :dateFrom: AND a.periodCalc <= :dateTo:  AND a.flagsRec & 8192 = 0 AND
  (adt.dictFundSourceID${entityBaseService.getNotInExpression('excludeDictFundSource')} OR adt.dictFundSourceID is NULL)
  GROUP BY a.employeeNumberID
  `,
    {
      employeeNumbers,
      excludeDictFundSource,
      dateFrom: currentPeriod.dateTo,
      dateTo: period.dateTo
    })
    const balances = store.getAsJsObject()
    employeeNumbers.forEach(employeeNumberID => {
      const balance = balances.find(o => o.employeeNumberID === employeeNumberID) || { paySum: 0 }
      cont.emp[employeeNumberID][attrName] = balance.paySum + (addBalance ? (cont.emp[employeeNumberID][addBalance] || 0) : 0)
    })
  }
}

function getAccrualBalanceByFundForEmployeeNumbers (cont, employeeNumbers, periodID, attrName, fundSource, dictProgClassIDs, dictProject) {
  const balance = UB.Repository('hr_accrualBalance')
    .attrs('SUM([sumTo])', 'employeeNumberID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID')
    .where('employeeNumberID', 'in', employeeNumbers)
    .where('periodCalcID', '=', periodID)
    .whereIf(fundSource, 'dictFundSourceID', 'in', fundSource)
    .whereIf(dictProgClassIDs, 'dictProgClassID', 'in', dictProgClassIDs)
    .whereIf(dictProject, 'dictProjectID', 'in', dictProject)
    .groupBy(['employeeNumberID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID'])
    .selectAsObject({
      'SUM([sumTo])': 'sumTo'
    })

  balance.forEach(row => {
    if (!cont.emp[row.employeeNumberID][attrName]) {
      cont.emp[row.employeeNumberID][attrName] = row.sumTo
      cont.emp[row.employeeNumberID][`${attrName}FundSource`] = [{ dictFundSourceID: row.dictFundSourceID, dictProgClassID: row.dictProgClassID, dictProjectID: row.dictProjectID, paySum: row.sumTo }]
    } else {
      cont.emp[row.employeeNumberID][attrName] = round(cont.emp[row.employeeNumberID][attrName] + row.sumTo)
      cont.emp[row.employeeNumberID][`${attrName}FundSource`].push({ dictFundSourceID: row.dictFundSourceID, dictProgClassID: row.dictProgClassID, dictProjectID: row.dictProjectID, paySum: row.sumTo })
    }
  })
}
function getAccrualBalanceByFundForEmployeeNumbersNext (cont, employeeNumbers, currentPeriod, period, attrName, addBalance, fundSource, dictProgClassIDs, dictProject) {
  if (employeeNumbers && employeeNumbers.length) {
    let store = UB.DataStore('hr_accrual')
    store.runSQL(` SELECT 
    SUM(CASE WHEN g.groupType = 'PAYMENT' THEN adt.paySum ELSE adt.paySum * -1 END) as "paySum",
    adt.dictFundSourceID "dictFundSourceID",
    adt.dictProgClassID "dictProgClassID",
    adt.dictProjectID "dictProjectID",
    a.employeeNumberID "employeeNumberID"
  FROM hr_accrual a
    JOIN hr_payEl p ON a.payElID = p.ID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    JOIN hr_accrualDt adt ON adt.accrualID = a.ID
  WHERE a.employeeNumberID${entityBaseService.getInExpression('employeeNumbers')} AND
  a.periodCalc > :dateFrom: AND a.periodCalc <= :dateTo:  AND a.flagsRec & 8192 = 0 AND
  ${fundSource ? ` AND adt.dictFundSourceID${entityBaseService.getInExpression('fundSource')}` : ''}
  ${dictProgClassIDs ? ` AND adt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
  ${dictProject ? ` AND adt.dictProjectID${entityBaseService.getInExpression('dictProject')}` : ''}
    GROUP BY a.employeeNumberID, adt.dictFundSourceID, adt.dictProgClassID, adt.dictProjectID
`,
    {
      employeeNumbers,
      fundSource,
      dictProgClassIDs,
      dictProject,
      dateFrom: currentPeriod.dateTo,
      dateTo: period.dateTo
    })
    const balances = store.getAsJsObject()
    employeeNumbers.forEach(employeeNumberID => {
      const balance = balances.find(o => o.employeeNumberID === employeeNumberID) || { paySum: 0 }
      if (!cont.emp[employeeNumberID][attrName]) {
        cont.emp[employeeNumberID][attrName] = balance.paySum + (addBalance ? (cont.emp[employeeNumberID][addBalance] || 0) : 0)
        cont.emp[employeeNumberID][`${attrName}FundSource`] = [{ dictFundSourceID: balance.dictFundSourceID, dictProgClassID: balance.dictProgClassID, dictProjectID: balance.dictProjectID, paySum: balance.paySum }]
      } else {
        cont.emp[employeeNumberID][attrName] = round(cont.emp[employeeNumberID][attrName] + balance.paySum)
        cont.emp[employeeNumberID][`${attrName}FundSource`].push({ dictFundSourceID: balance.dictFundSourceID, dictProgClassID: balance.dictProgClassID, dictProjectID: balance.dictProjectID, paySum: balance.paySum })
      }
    })
  }
}

function getPaymentInNextPeriod (cont, employeeNumbers, currentPeriod, period, attrName, excludeDictFundSource, fundSource, dictProgClassIDs, dictProject) {
  if (employeeNumbers && employeeNumbers.length) {
    let store = UB.DataStore('hr_accrual')
    store.runSQL(` SELECT 
    SUM(adt.paySum) as "paySum",
    a.employeeNumberID "employeeNumberID"
  FROM hr_accrual a
    JOIN hr_payEl p ON a.payElID = p.ID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    JOIN hr_accrualDt adt ON adt.accrualID = a.ID
  WHERE a.employeeNumberID${entityBaseService.getInExpression('employeeNumbers')} AND
  g.code = 128  AND a.flagsRec & 8192 = 0
  AND ((a.periodSalaryID = :periodID: AND a.periodCalc > :dateFrom:) OR (a.periodCalcID = :currentPeriodID: AND a.periodSalary < :currentPeriod:)) 
  ${excludeDictFundSource ? ` AND (adt.dictFundSourceID${entityBaseService.getNotInExpression('excludeDictFundSource')} OR adt.dictFundSourceID is NULL)` : ''}
   ${fundSource ? ` AND adt.dictFundSourceID${entityBaseService.getInExpression('fundSource')}` : ''}
   ${dictProgClassIDs ? ` AND adt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
  ${dictProject ? `AND adt.dictProjectID${entityBaseService.getInExpression('dictProject')}` : ''}
      GROUP BY a.employeeNumberID
`,
    {
      employeeNumbers,
      excludeDictFundSource,
      dateFrom: period.dateFrom,
      periodID: period.ID,
      currentPeriodID: currentPeriod.ID,
      currentPeriod: currentPeriod.dateFrom,
      fundSource,
      dictProgClassIDs,
      dictProject
    })
    const balances = store.getAsJsObject()
    employeeNumbers.forEach(employeeNumberID => {
      const balance = balances.find(o => o.employeeNumberID === employeeNumberID) || { paySum: 0 }
      cont.emp[employeeNumberID][attrName] = (cont.emp[employeeNumberID][attrName] || 0) - balance.paySum
      cont.emp[employeeNumberID].accrualBalance = (cont.emp[employeeNumberID].accrualBalance || 0) - balance.paySum
    })
  }
}

function orderAccrualReversal ({ accruals, cont = null }) {
  const algorithmService = require('../../HR/modules/algorithmService')
  if (!cont) cont = { payEl: payElService.getPayEl({ }) }
  accruals.forEach(accr => {
    if (accr.mask && accr.days) {
      const employeeNumbers = [accr.employeeNumberID]
      if (cont.payEl[accr.payElID].includeSecondJobs) {
        const employeePosition = UB.Repository('hr_employeePositionS')
          .attrs(['employeeID', 'organizationID'])
          .where('employeeNumberID', '=', accr.employeeNumberID)
          .where('workPlace', '=', '1')
          .where('dateFrom', '<=', dateService.shiftDate(accr.dateTo))
          .where('dateTo', '>=', dateService.shiftDate(accr.dateFrom))
          .limit(1)
          .selectSingle()
        if (employeePosition) {
          const secJobs = UB.Repository('hr_employeePositionS')
            .attrs(['employeeNumberID'])
            .where('employeeID', '=', employeePosition.employeeID)
            .where('employeeNumberID', '!=', accr.employeeNumberID)
            .where('organizationID', '=', employeePosition['organizationID'])
            .where('workPlace', '=', '2')
            .where('dateFrom', '<=', dateService.shiftDate(accr.dateTo))
            .where('dateTo', '>=', dateService.shiftDate(accr.dateFrom))
            .groupBy(['employeeNumberID'])
            .selectAsObject()
          secJobs.forEach(row => {
            employeeNumbers.push(row.employeeNumberID)
          })
        }
      }
      employeeNumbers.forEach(employeeNumberID => {
        UB.Repository('hr_accrual')
          .attrs(['*'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
          .where('dateTo', '>=', dateService.shiftDate(accr.dateFrom))
          .where('dateFrom', '<=', dateService.shiftDate(accr.dateTo))
          .where(`(((flagsRec & 512) != 512 OR (flagsRec & 8 = 8)) AND (flagsRec & 1 != 1) AND (flagsRec & 4096 != 4096) AND (flagsRec & 1048576 = 0)) `, 'custom')
          .selectAsObject().forEach(acc => {
            if ((cont.payEl[acc.payElID].isAutoCalc) || (['3', '4', '12', '204', '205'].includes(cont.payEl[acc.payElID].method.code) && !cont.payEl[acc.payElID].isTimeSheet)) {
              return
            }
            let payDays = 0
            let revMask = 0
            let revMaskAdd = 0
            let revPayDays = 0
            let hours = 0
            let paySum = 0
            let mask = acc.mask
            let maskAdd = acc.maskAdd || 0
            if (!mask && acc.flagsRec & 1 << 3 && [4, 5].includes(cont.payEl[acc.payElID].method.groupCode) &&
              !['16', '71'].includes(cont.payEl[acc.payElID].method.code)) {
              mask = algorithmService.getFillMaskByPeriod(dateService.shiftDate(acc.dateFrom), dateService.shiftDate(acc.dateTo))
            }
            if (mask) {
              const reversal = UB.Repository('hr_accrual')
                .attrs(['ID', 'mask', 'maskAdd', 'dateFrom', 'dateTo', 'flagsRec', 'paySum', 'days', 'periodCalcID.isClosed'])
                .where('employeeNumberID', '=', employeeNumberID)
                .where('linkToParentID', '=', acc.ID)
                .where(`((flagsRec & 4096 != 4096) AND ((flagsRec & 512 = 512) OR (flagsRec & 1024 = 1024)))`, 'custom')
                .selectAsObject()
              reversal.forEach(rev => {
                if (rev.flagsRec & 1 << 9) {
                  mask = mask & ~rev.mask
                  maskAdd = maskAdd & ~rev.maskAdd
                }
              })
              payDays = ((mask || 0).toString(2).match(/1/g) || []).length
              revMask = mask & accr.mask
              if (revMask > 0 && payDays > 0) {
                revMaskAdd = maskAdd & accr.maskAdd
                revPayDays = ((revMask || 0).toString(2).match(/1/g) || []).length
                let days = acc.mask ? ((acc.mask & ~(acc.maskAdd || 0)).toString(2).match(/1/g) || []).length : acc.days
                paySum = days ? round(acc.paySum / days * revPayDays) : 0
                hours = days ? round(-1 * acc.hours / days * revPayDays) : 0
                reversal.forEach(rev => {
                  if (rev.flagsRec & 1 << 10 && rev.mask && rev['periodCalcID.isClosed']) {
                    const additMask = rev.mask & revMask
                    if (additMask > 0 && rev.days > 0) {
                      paySum = round(paySum + rev.paySum / rev.days * ((additMask).toString(2).match(/1/g) || []).length)
                    }
                  }
                })
              }
            } else if (cont.payEl[acc.payElID].method.groupCode === 1 && acc.days) {
              const timeSheets = UB.Repository('tim_timeSheet')
                .attrs(['ID', 'dateWork', 'planTimeCostID', 'factTimeCostID', 'factHour', 'factHourNight',
                  'factHourEvening', 'planHour', 'planHourNight', 'planHourEvening', 'planTimeCostID.timeCostType',
                  'factTimeCostID.timeCostType', 'mtCount', 'orderID', 'isCorrection', 'factTimeCostID.isFactHour',
                  'planID.workScheduleID.isDayAsPlan', 'factHourHarmful', 'normMonthDay', 'normMonthHour'])
                .where('employeeNumberID', '=', acc.employeeNumberID)
                .where('isActive', '=', 1)
                .where('dateWork', '>=', dateService.shiftDate(acc.periodSalary))
                .where('dateWork', '<=', dateService.addMonths(dateService.shiftDate(acc.periodSalary), 1))
                .orderBy('dateWork')
                .selectAsObject({
                  'factTimeCostID.timeCostType': 'factTimeCostType',
                  'planTimeCostID.timeCostType': 'planTimeCostType',
                  'factTimeCostID.isFactHour': 'isFactHour',
                  'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan'
                })
              timeSheets.forEach(row => {
                row.dateWork = dateService.shiftDate(row.dateWork)
              })
              const payTime = algorithmService.getTimeByTimeSheet({ cont, payElID: acc.payElID, timeSheets, dateFrom: dateService.shiftDate(acc.dateFrom), dateTo: dateService.shiftDate(acc.dateTo) })
              if (acc.days > payTime.days) {
                revPayDays = acc.days - payTime.days
                paySum = round(acc.paySum / acc.days * revPayDays)
                hours = round(-1 * acc.hours / acc.days * revPayDays)
              }
            }
            if (revPayDays > 0) {
              if (acc.flagsRec & 1 << 3) {
                if (acc.paySum < 0 && paySum > 0) { paySum *= -1 }
                if (acc.days < 0 && revPayDays > 0) { revPayDays *= -1 }
                if (acc.hours < 0 && hours < 0) { hours *= -1 }
              }
              const accrualDt = algorithmService.correctAccrualDt(UB.Repository('hr_accrualDt')
                .attrs(['*'])
                .where('accrualID', '=', acc.ID)
                .selectAsObject(), paySum)
              accrualDt.forEach(accDt => {
                delete accDt.ID
                accDt.paySum *= -1
              })
              accruals.push(Object.assign(Object.assign({}, acc), {
                ID: getID('S_HR_ACCRUAL'),
                orderID: acc.orderID,
                orderDtID: acc.orderDtID,
                sourceID: accr.orderID,
                source: 'hr_orderRegistry',
                periodCalcID: accr.periodCalcID,
                periodCalc: accr.periodCalc,
                flagsRec: 2 | 1 << 9,
                planHours: -1 * (acc.planHours || 0),
                planDays: -1 * (acc.planDays || 0),
                baseSum: -1 * (acc.baseSum || 0),
                rate: acc.rate,
                days: -1 * revPayDays,
                hours,
                mask: revMask,
                maskAdd: revMaskAdd,
                paySum: -1 * paySum,
                calculateDate: new Date(),
                linkToParentID: acc.ID,
                linkToChildID: null,
                accrualDt
              }))
            }
          })
      })
    }
  })
}

function calcSumAccrualDt (detail) {
  const result = []
  const det = []
  let paySum = 0
  detail.forEach(row => {
    const dt = {}
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        dt[`d${i}`] = row[`d${i}`]
        if (row[`d${i}Value`]) {
          dt[`d${i}Value`] = row[`d${i}Value`]
        }
      }
    }
    dt.dimValues = Object.values(dt)

    dt.paySum = row.paySum
    dt.dictFundSourceID = row.dictFundSourceID || null
    dt.dictProgClassID = row.dictProgClassID || null
    dt.dictProjectID = row.dictProjectID || null
    dt.departmentID = row.departmentID || null
    dt.accountID = row.accountID || null
    paySum = round(paySum + row.paySum, 6)
    det.push(dt)
  })
  det.forEach(row => {
    const sumRow = result.find(o => o.accountID == row.accountID && o.departmentID == row.departmentID &&
      o.dictProgClassID == row.dictProgClassID && o.dictProjectID == row.dictProjectID &&
      o.dictFundSourceID == row.dictFundSourceID && !_.difference(o.dimValues, row.dimValues).length && !_.difference(row.dimValues, o.dimValues).length)
    if (sumRow) {
      sumRow.paySum = round(sumRow.paySum + row.paySum, 6)
    } else {
      row.paySum = round(row.paySum, 2)
      if (row.paySum !== 0) {
        result.push(row)
      }
    }
  })
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].paySum === 0 && paySum !== 0) {
      result.splice(i, 1)
    } else {
      delete result[i].dimValues
    }
  }
  return result
}

function calcReversalAccrual (cont, accrual, reversals) {
  let ident = true
  let skipCheckDt = false
  let reversal = reversals[0]
  let notCheckDetail = reversal.importAccrual
  if (!reversal.accrualDt) { reversal.accrualDt = [{ paySum: reversal.paySum }] }
  for (let i = 1; i < reversals.length; i++) {
    const acc = reversals[i]
    if (acc.importAccrual) { notCheckDetail = true }
    reversal.paySum = round(reversal.paySum + acc.paySum, 4)
    reversal.baseSum = round(reversal.baseSum + acc.baseSum, 4)
    if (acc.accrualDt) {
      acc.accrualDt.forEach(accDt => {
        reversal.accrualDt.push(accDt)
      })
    } else {
      reversal.accrualDt.push({ paySum: acc.paySum })
    }
    if (['26', '27'].includes(cont.payEl[accrual.payElID].method.code)) {
      if (acc.taxIndividAcc && !reversals.find(o => !o.taxIndividAcc && o.paySum)) {
        if (!reversal.taxIndividAcc) {
          reversal.taxIndividAcc = []
        }
        acc.taxIndividAcc.forEach(taxIndAcc => {
          const taxIndAccReversal = reversal.taxIndividAcc.find(o => o.taxIndividID === taxIndAcc.taxIndividID)
          if (taxIndAccReversal) {
            taxIndAccReversal.taxSum = round(taxIndAcc.taxSum + taxIndAccReversal.taxSum, 2)
            taxIndAccReversal.incomeSum = round((taxIndAcc.incomeSum || 0) + (taxIndAccReversal.incomeSum || 0), 2)
            taxIndAccReversal.taxFreeSum = round(taxIndAcc.taxFreeSum + taxIndAccReversal.taxFreeSum, 2)
            taxIndAccReversal.privilegeSum = round(taxIndAcc.privilegeSum + taxIndAccReversal.privilegeSum, 2)
          } else {
            reversal.taxIndividAcc.push(taxIndAcc)
          }
        })
      }
    }
  }
  if (reversals.length > 1) {
    reversal.accrualDt = calcSumAccrualDt(reversal.accrualDt)
  }

  if (round(Math.abs(reversal.paySum + accrual.paySum)) >= 0.01) {
    ident = false
  }
  const accrualPaySum = accrual.paySum
  accrual.paySum = round(accrual.paySum + reversal.paySum, 2)
  accrual.baseSum = round(accrual.baseSum + reversal.baseSum, 2)
  if (cont.constants.hrSkipCheckDt && ident && accrual.periodSalary < cont.periodCalc.dateFrom) {
    skipCheckDt = true
  }
  if (!skipCheckDt && (!notCheckDetail || !ident)) {
    if (!reversal.accrualDt || !reversal.accrualDt.length) { reversal.accrualDt = [{ paySum: reversal.paySum }] }
    if (!accrual.accrualDt || (accrualPaySum !== 0 && !accrual.accrualDt.length)) { accrual.accrualDt = [{ paySum: accrualPaySum }] }
    reversal.accrualDt.forEach(revDt => {
      let correct = false
      let i = 0
      while (!correct && i < accrual.accrualDt.length) {
        const accDt = accrual.accrualDt[i]
        if (!accDt.processed && accDt.dictFundSourceID == revDt.dictFundSourceID &&
            accDt.dictProgClassID == revDt.dictProgClassID && accDt.dictProjectID == revDt.dictProjectID &&
            accDt.departmentID == revDt.departmentID && accDt.accountID == revDt.accountID) {
          let equalR = true
          let r = 0
          while (equalR && r < 10) {
            let equalA = false
            let k = 0
            while (!equalA && k < 10) {
              if (revDt[`d${r}`] == accDt[`d${k}`] && revDt[`d${r}Value`] == accDt[`d${k}Value`]) {
                equalA = true
              }
              k++
            }
            if (!equalA) {
              equalR = false
            }
            r++
          }
          let equalR1 = true
          let r1 = 0
          while (equalR1 && r1 < 10) {
            let equalA1 = false
            let k1 = 0
            while (!equalA1 && k1 < 10) {
              if (revDt[`d${k1}`] == accDt[`d${r1}`] && revDt[`d${k1}Value`] == accDt[`d${r1}Value`]) {
                equalA1 = true
              }
              k1++
            }
            if (!equalA1) {
              equalR1 = false
            }
            r1++
          }
          if (equalR && equalR1) {
            // Нашили запись в accrual.accrualDt c такими же аналитиками
            correct = true
            accDt.processed = true
            if (round(Math.abs(accDt.paySum + revDt.paySum)) < 0.01) {
              accrual.accrualDt.splice(i, 1)
            } else {
              ident = false
              accDt.paySum = round(accDt.paySum + revDt.paySum, 2)
            }
          }
        }
        i++
      }
      if (!correct) {
        revDt.processed = true
        ident = false
        revDt.accrualID = accrual.ID
        accrual.accrualDt.push(revDt)
      }
    })
    accrual.accrualDt.forEach(accDt => {
      if (!accDt.processed) {
        ident = false
      }
      delete accDt.processed
    })
  } else if (skipCheckDt && ['26', '27'].includes(cont.payEl[accrual.payElID].method.code)) {
    correctAccrualDt(accrual.accrualDt, accrual.paySum)
  }

  if (!notCheckDetail || !ident) {
    if (['26', '27'].includes(cont.payEl[accrual.payElID].method.code)) {
      if (!accrual.taxIndividAcc) { accrual.taxIndividAcc = [] }
      if (reversal.taxIndividAcc) {
        reversal.taxIndividAcc.forEach(revDt => {
          let correct = false
          let i = 0
          while (!correct && i < accrual.taxIndividAcc.length) {
            const taxIndAcc = accrual.taxIndividAcc[i]
            if (revDt.taxIndividID === taxIndAcc.taxIndividID) {
              correct = true
              taxIndAcc.processed = true
              if (round(Math.abs(taxIndAcc.taxSum + revDt.taxSum)) < 0.01 && round(Math.abs(taxIndAcc.incomeSum + revDt.incomeSum)) < 0.01 &&
                round(Math.abs(taxIndAcc.privilegeSum + revDt.privilegeSum)) < 0.01 && round(Math.abs((taxIndAcc.taxFreeSum || 0) + (revDt.taxFreeSum || 0))) < 0.01) {
                accrual.taxIndividAcc.splice(i, 1)
              } else {
                ident = false
                taxIndAcc.taxSum = round(taxIndAcc.taxSum + revDt.taxSum, 2)
                taxIndAcc.incomeSum = round((taxIndAcc.incomeSum || 0) + (revDt.incomeSum || 0), 2)
                taxIndAcc.taxFreeSum = round((taxIndAcc.taxFreeSum || 0) + (revDt.taxFreeSum || 0), 2)
                taxIndAcc.privilegeSum = round(taxIndAcc.privilegeSum + revDt.privilegeSum, 2)
              }
            }
            i++
          }
          if (!correct && (round(revDt.taxSum) !== 0 || round(revDt.incomeSum) !== 0 || round(revDt.taxFreeSum) !== 0 || round(revDt.privilegeSum) !== 0)) {
            revDt.processed = true
            ident = false
            revDt.accrualID = accrual.ID
            accrual.taxIndividAcc.push(revDt)
          }
        })
        accrual.taxIndividAcc.forEach(accDt => {
          if (!accDt.processed && accDt.taxSum !== 0) {
            ident = false
          }
          delete accDt.processed
        })
      } else {
        let taxSum = accrual.paySum
        accrual.taxIndividAcc.forEach(accDt => {
          if (taxSum === 0) {
            accDt.taxSum = 0
            accDt.incomeSum = 0
          } else if (accDt.taxSum > taxSum && accDt.taxSum !== 0) {
            accDt.incomeSum = round(accDt.incomeSum / accDt.taxSum * taxSum, 2)
            accDt.taxSum = taxSum
            taxSum = 0
          } else if (accDt.taxSum < taxSum && accDt.taxSum > 0) {
            taxSum = round(taxSum - accDt.taxSum, 2)
          }
        })
      }
    }
  }

  return ident
}

function correctAccrualDt (detail, sum, detPaySum) {
  let paySum = 0
  if (!detPaySum) {
    detPaySum = detail.reduce((sum, row) => {
      return round(sum + row.paySum, 2)
    }, 0)
  }

  detail.forEach(row => {
    row.paySum = round(row.paySum / (detPaySum || 1) * sum, 2)
    paySum = round(paySum + row.paySum, 2)
    delete row.ID
    delete row.accrualID
  })

  if (paySum !== sum && detail.length) {
    detail[0].paySum = round(detail[0].paySum + sum - paySum, 2)
  }
  return detail
}

function binarySearch (data, target, start, end, attrName) {
  if (end < 1) {
    return (end === 0 && data[end] && target === data[end][attrName]) ? data[end] : null
  }
  const middle = Math.floor(start + (end - start) / 2)
  if (target === data[middle][attrName]) return data[middle]
  if (end - 1 === start) {
    return target === data[start][attrName] ? data[start] : (target === data[end][attrName] ? data[end] : null)
  }

  if (target > data[middle][attrName]) return binarySearch(data, target, middle, end, attrName)
  if (target < data[middle][attrName]) return binarySearch(data, target, start, middle, attrName)
}

function getSalaryAccrual ({ orgID, cont, periodSalary }) {
  const salaryAccrual = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.filter(o => o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
    .forEach(pos => {
      const payEl = cont.payEl[pos.payElID]
      if (payEl && payEl.method.groupCode === 1) {
        salaryAccrual.push({
          ID: pos.ID,
          orgID: orgID,
          employeeNumberID: pos.employeeNumberID,
          payElID: pos.payElID,
          dateFrom: dateService.shiftDate(Math.max(periodSalary.dateFrom, pos.dateFrom)),
          dateTo: dateService.shiftDate(Math.min(periodSalary.dateTo, pos.dateTo)),
          baseSum: pos.accrualSum,
          mtCount: pos.mtCount,
          raiseSalary: pos.raiseSalary,
          isIndex: pos.isIndex,
          workScheduleID: pos.workScheduleID,
          flagsRec: 1
        })
      }
    })
  return salaryAccrual
}

function getChangeSalaryAccrual ({ cont, periodSalary, isSummarized }) {
  const salaryAccrual = []
  cont.emp[cont.employeeNumberID].prop.employeePositions.forEach(accr => {
    if (accr.dateFrom <= periodSalary.dateTo && accr.dateTo >= periodSalary.dateFrom && accr.workScheduleID) {
      const workSchedule = isSummarized ? cont.dict.hr_workSchedule.find(o => o.ID === accr.workScheduleID && o.isSummarized) : null
      if (!isSummarized || workSchedule) {
        if (salaryAccrual.length && salaryAccrual[salaryAccrual.length - 1].dateTo.getTime() === dateService.addDays(accr.dateFrom, -1).getTime() &&
          salaryAccrual[salaryAccrual.length - 1].payElID === accr.payElID &&
          salaryAccrual[salaryAccrual.length - 1].workScheduleID === accr.workScheduleID &&
          salaryAccrual[salaryAccrual.length - 1].accrualSum === accr.accrualSum &&
          salaryAccrual[salaryAccrual.length - 1].mtCount === accr.mtCount) {
          salaryAccrual[salaryAccrual.length - 1].dateTo = dateService.shiftDate(Math.min(accr.dateTo, periodSalary.dateTo))
        } else {
          salaryAccrual.push({
            dateFrom: dateService.shiftDate(Math.max(accr.dateFrom, periodSalary.dateFrom)),
            dateTo: dateService.shiftDate(Math.min(accr.dateTo, periodSalary.dateTo)),
            payElID: isSummarized ? workSchedule.payElID : accr.payElID,
            workScheduleID: accr.workScheduleID,
            accrualSum: accr.accrualSum,
            mtCount: accr.mtCount,
            isMtCount: accr.payElID ? cont.payEl[accr.payElID].isMtCount : 1
          })
        }
      }
    }
  })
  return salaryAccrual
}

function getParentAccrual (employeeNumberID, accruals, parentOrderID) {
  let linkToParentID = null
  for (let idx = accruals.length - 1; idx >= 0; idx--) {
    if (accruals[idx].orderID === parentOrderID && accruals[idx].employeeNumberID === employeeNumberID) {
      linkToParentID = accruals[idx].ID
      break
    }
  }
  if (!linkToParentID) {
    const parentAccr = UB.Repository('hr_accrual')
      .attrs(['ID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('orderID', '=', parentOrderID)
      .where(`(flagsRec & 4096 != 4096)`, 'custom')
      .where(`(flagsRec & 512 != 512)`, 'custom')
      .where(`(flagsRec & 1024 != 1024)`, 'custom')
      .orderBy('dateTo', 'desc')
      .limit(1)
      .selectSingle()
    if (parentAccr) {
      linkToParentID = parentAccr.ID
    }
  }
  return linkToParentID
}

function getTariffingAccrualList ({ orgID, cont, periodSalary, methodCodeList = null }) {
  const tariffingAccrualList = []
  cont.emp[cont.employeeNumberID].prop.tariffingAccruals.filter(o => o.dateFrom <= periodSalary.dateTo && o.dateTo >= periodSalary.dateFrom)
    .forEach(pos => {
      const payEl = cont.payEl[pos.payElID]
      if (payEl && (!methodCodeList || methodCodeList.includes(payEl.method.code))) {
        tariffingAccrualList.push({
          ID: pos.ID,
          orgID: orgID,
          employeeNumberID: pos.employeeNumberID,
          payElID: pos.payElID,
          dateFrom: dateService.shiftDate(Math.max(periodSalary.dateFrom, pos.dateFrom)),
          dateTo: dateService.shiftDate(Math.min(periodSalary.dateTo, pos.dateTo)),
          baseSum: pos.baseSum,
          mtCount: pos.mtCount,
          paySum: pos.paySum,
          raiseSalary: pos.raiseSalary,
          isIndex: false,
          workScheduleID: pos.workScheduleID,
          flagsRec: 1,
          flagsFix: pos.flagsFix,
          dictFundSourceID: pos.dictFundSourceID,
          dictProgClassID: pos.dictProgClassID,
          dictPositionID: pos.dictPositionID,
          source: 'trf_accrual',
          workNormID: pos.workNormID,
          weekHours: pos.weekHours,
          loadHours: pos.loadHours,
          trfPositionID: pos.ID,
          dictPupilID: pos.dictPupilID,
          groupID: pos.groupID
        })
      }
    })
  return tariffingAccrualList
}

function getHoursByMask (mask, hoursByDays) {
  let hours = 0
  for (let n = 0; n < 31; n++) {
    if (mask & (1 << n)) {
      hours += hoursByDays[ n + 1 ]
    }
  }
  return hours
}

function getWorkOperationRate (cont, operationID, workYield) {
  if (!operationID) {
    return 0
  }
  const idx = cont.dict.hr_dictWorkOperation.findIndex(o => o.ID === operationID)
  if (idx < 0 || !cont.dict.hr_dictWorkOperation[idx].payment) {
    return 0
  }
  const payment = cont.dict.hr_dictWorkOperation[idx].payment
  switch (payment) {
    case '1':
      const operationDt = cont.dict.hr_dictWorkOperationDt
        .filter(o => o.dictWorkOperationID === operationID && o.quantity <= workYield)
        .slice(-1)
      return operationDt.length ? (operationDt[0].rate || 0) : 0
    case '2':
    case '3':
      return cont.dict.hr_dictWorkOperation[idx].rate || 0
    default:
      throw new UB.UBAbort(`<<<${UB.i18n('Невідома форма оплати:')} ${payment}. getWorkOperationRate>>>`)
  }
}

function getIDsFromString (source) {
  return source ? source.split(',').map(q => Number(q.trim().replace(/"/g, ''))) : null
}

function getKpiAccrual (cont, payElID, onDate, KPI) {
  const orgID = cont.orgID
  const employeePosition = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  const staffCat = employeePosition ? employeePosition.dictStaffCatID : null
  const position = employeePosition ? employeePosition.dictPositionID : null
  const department = employeePosition ? employeePosition.departmentID : null
  const workPlace = employeePosition ? employeePosition.workPlace : null
  const workerType = employeePosition ? employeePosition.workerType : null
  const accrual = cont.dict.hr_dictKpiAccrual.find(accr => {
    return accr.dateFrom <= onDate && accr.dateTo >= onDate &&
      accr.payEl.includes(payElID) &&
      (!accr.org.length || (accr.excludeOrg && !accr.org.includes(orgID)) || (!accr.excludeOrg && accr.org.includes(orgID))) &&
      (!accr.staffCat.length || (accr.excludeStaff && !accr.staffCat.includes(staffCat)) || (!accr.excludeStaff && accr.staffCat.includes(staffCat))) &&
      (!accr.position.length || (accr.excludePosition && !accr.position.includes(position)) || (!accr.excludePosition && accr.position.includes(position))) &&
      (!accr.department.length || (accr.excludeDepartment && !accr.department.includes(department)) || (!accr.excludeDepartment && accr.department.includes(department))) &&
      (!accr.workPlace.length || (accr.excludeWorkPlace && !accr.workPlace.includes(workPlace)) || (!accr.excludeWorkPlace && accr.workPlace.includes(workPlace))) &&
      (!accr.workerType.length || (accr.excludeWorkerType && !accr.workerType.includes(workerType)) || (!accr.excludeWorkerType && accr.workerType.includes(workerType)))
  })
  if (accrual) {
    KPI = KPI || 0
    return accrual.rate.reduce((a, b) => {
      return b.KPI > KPI ? a : b.KPI > a.KPI ? b : a
    }, { KPI: 0, rate: 0, paySum: 0 })
  }
  return null
}

function getDepIDs (params) {
  let deptIDs = null
  if (params.depID) {
    if (params.includeSubDep) {
      const dept = UB.Repository('hr_department')
        .attrs(['description', 'fullName', 'mi_treePath'])
        .where('mi_data_id', '=', params.depID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: dateService.shiftDate(params.orderDate) })
        .selectSingle()
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateService.shiftDate(params.orderDate))
        .where('mi_dateTo', '>=', dateService.shiftDate(params.orderDate))
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.depID]
      }
    } else {
      deptIDs = [params.depID]
    }
  }
  if (params.dictMultiGroupID) {
    const dictMultiGroupDeps = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', params.dictMultiGroupID)
      .selectAsArrayOfValues()
    if (dictMultiGroupDeps.length) {
      if (params.includeSubDepGroup) {
        let allDeptsID = []
        for (let i = 0; i < dictMultiGroupDeps.length; i++) {
          const childDep = UB.Repository('hr_department')
            .attrs('mi_data_id')
            .where('mi_treePath', 'like', `%${dictMultiGroupDeps[i]}%`)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '9999-12-31')
            .where('mi_dateFrom', '<=', dateService.shiftDate(params.orderDate))
            .where('mi_dateTo', '>=', dateService.shiftDate(params.orderDate))
            .misc({ __mip_recordhistory_all: true })
            .selectAsArrayOfValues()
          allDeptsID = allDeptsID.concat(childDep)
        }
        deptIDs = allDeptsID.length ? allDeptsID : null
      } else {
        deptIDs = dictMultiGroupDeps
      }
    }
  }
  return deptIDs
}

function getCalcParams (calcParams, attrName) {
  return !calcParams ? null : (typeof calcParams === 'object') ? calcParams[attrName] : JSON.parse(calcParams)[attrName]
}

function setCalcParams (calcParams, attrName, value) {
  const params = calcParams ? (typeof calcParams === 'object') ? calcParams : JSON.parse(calcParams) : {}
  params[attrName] = value
  return params
}

function mtCountByTariffing (cont) {
  let result = 0
  const group = {}
  cont.emp[cont.employeeNumberID].salaryAccrual.forEach(row => {
    if (row.source === 'trf_accrual' && ['1', '146', '147', '156'].includes(cont.payEl[row.payElID].method.code)) {
      if (!group[row.ID || 1]) {
        group[row.ID || 1] = (row.ID || 1)
        result += (row.mtCount || 0)
      }
    }
  })
  return result
}
