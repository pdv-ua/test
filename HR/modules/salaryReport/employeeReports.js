const UB = require('@unitybase/ub')
const App = UB.App

const _ = require('lodash')
const dateService = require('../../../AC/modules/dataServices/dateService')
const currencyService = require('../../../AC/public/core/currencyService')
const reportService = require('../../../HR/modules/reportService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')
const staffService = require('../staffService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
const periodService = require('../../../HR/modules/periodService')
const employeeService = require('../../../HR/modules/employeeService')
const algorithmService = require('../../../HR/modules/algorithmService')
const orgService = require('../../../HR/modules/orgService')
const payElService = require('../../../HR/modules/payElService')
const payFundService = require('../../../HR/modules/payFundService')
const accrualService = require('../../../HR/modules/accrualService')
const contService = require('../../../HR/modules/contService')
const experienceService = require('../../../HR/modules/experienceService')

module.exports = {
  getPayIndexSalaryData,
  getAvgSalary13Data,
  getAvgSalaryFSSData,
  getAvgSalaryMainData,
  getCreditReportData,
  getIncomeReportData,
  getIncomeTaxReportData,
  getInfoCardData,
  getPayrollEmbassyData,
  getPayrollRequireData,
  getRLData,
  getRLMonthData,
  getRLMonthDataEdu
}

function getSigners(orgID) {
  const orgParent = settingsService.get('hrUseSignersParentOrg', orgID)
  if (orgParent) orgID = orgParent

  return  UB.Repository('hr_dictSigners')
  .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
  .where('orgID', '=', orgID)
  .where('signerCode', '=', 'ACCRUALREPORTS')
  .where('departmentID', 'isNull')
  .orderBy('orderN')
  .selectAsObject({
    'employeeNumberID.employeeID.shortFIO': 'signerShortName'
  }) || []
}

function formatOrderNumber (orderNumber, orderDate) {
  return UB.i18n(`№ {0} від {1}`, orderNumber || '_____', orderDate ? dateService.formatDate(orderDate) : '________')
}

function getFixed2Val (v, checkField) {
  if (checkField) return v && v[checkField] ? v[checkField].toFixed(2) : '0.00'
  else return v && v ? v.toFixed(2) : '0.00'
}

function getFVal (v, checkField) {
  return checkField ? (v && v[checkField] ? v[checkField] : 0) : 0
}

function getPayIndexSalaryData (params) {
  let orgID = params.orgID
  let dateFrom = dateService.shiftDate(params.periodFrom)
  let dateTo = dateService.shiftDate(params.periodTo)
  let employeeNumberID = params.employeeNumberID
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let dateReport = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()

  let result = {
    payTable: [],
    totalPaySum: 0,
    totalBaseSum: 0,
    planSum: 0
  }

  result.dateTo = dateService.formatDate(dateTo)
  result.dateReport = dateService.formatDate(dateReport)

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  const orgName = reportService.getHrOrg(orgID, dateReport)
  result.orgName = orgName['nameLoc'] || orgName['name']

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const posField = useActualPositionName
    ? 'ep.factPosition '
    : staffService.getPosFldOnDateSql(':dateReport:', 'ep.positionID', 'name')
  store.runSQL(
    ` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${posField} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", 
ep.raiseSalary as "raiseSalary", wt.name as "workerType", employeeNumberID "employeeNumberID" 
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID
join ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' 
${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
 `,
    {
      dateReport,
      employeePositionID: params.employeePositionID
    })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employeeData = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employeeData.dateFrom > el.dateFrom) employeeData.dateFrom = el.dateFrom
    if (employeeData.dateTo < el.dateTo) employeeData.dateTo = el.dateTo
  })
  result.workerType = employeeData['workerType'] ? employeeData['workerType'].toLowerCase() : ''
  result.position = employeeData.posName || ''
  result.raiseSalary = employeeData['raiseSalary'] ? dateService.formatDate(employeeData['raiseSalary']) : ''
  result.emp = employeeData ? employeeData['datName'] || employeeData['fullFIO'] : ''
  if (employeeData.employeeID) {
    const employeeChange = UB.Repository('hr_employeeChange')
      .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
      .where('employeeID', '=', employeeData.employeeID)
      .where('orderDate', '>', dateTo)
      .orderBy('orderDate', 'asc')
      .selectSingle()
    if (employeeChange) {
      result.emp = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
    }
  }
  result.taxCode = employeeData && employeeData['taxCode'] ? employeeData['taxCode'] : ''

  let accEmployee = params.accEmployeePositionID ? empData.find(emp => emp.epID === params.accEmployeePositionID) : null
  if (!accEmployee) accEmployee = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.shortFIO'])
    .where('ID', '=',  params.accEmployeeNumberID)
    .selectSingle({
      'employeeID.shortFIO': 'shortFIO'
    })
  result.accountantFIO = accEmployee ? accEmployee.shortFIO : ''

  if (!employeeData.employeeNumberID) {
    return result
  }

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }

  // payTable
  const pay = UB.Repository('hr_accrual')
    .attrs(['periodSalaryID', 'periodSalaryID.name', 'periodSalaryID.dateFrom', 'mtCount', 'sum([baseSum])', 'koef', 'sum([paySum])'])
    .where('periodCalc', '>=', dateFrom)
    .where('periodCalc', '<=', dateTo)
    .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
    .where('payElID.methodID.code', '=', '24')
    // 24 надо, а 4 - для Debug
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .groupBy(['periodSalaryID', 'periodSalaryID.name', 'periodSalaryID.dateFrom', 'mtCount', 'koef'])
    .selectAsObject({
      'periodSalaryID.name': 'periodSalary', 'periodSalaryID.dateFrom': 'periodDateFrom', 'mtCount': 'mtCount', 'sum([baseSum])': 'baseSum', 'koef': 'koef', 'sum([paySum])': 'paySum'
    })

  if (pay) {
    pay.forEach(row => {
      result.totalPaySum += row['paySum']
      result.totalBaseSum += row['baseSum']
    })
    result.payTable = pay
  }

  const selectPayElIDfirst = UB.Repository('hr_payEl')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .where('methodID.code', '=', '24')
    .selectSingle()

  const selectPayElID = UB.Repository('hr_accrual')
    .attrs(['payElID', 'payElID.dateFrom', 'payElID.dateTo'])
    .where('periodCalc', '>=', dateFrom)
    .where('periodCalc', '<=', dateTo)
    .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
    .where('payElID.methodID.code', '=', '24')
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .orderBy('dateFrom', 'desc')
    .selectSingle()

  const selectPayEl = {
    payElID: selectPayElID ? selectPayElID.payElID : (selectPayElIDfirst ? selectPayElIDfirst.ID : null),
    dateFrom: selectPayElID ? selectPayElID['payElID.dateFrom'] : (selectPayElIDfirst ? selectPayElIDfirst.dateFrom : null),
    dateTo: selectPayElID ? selectPayElID['payElID.dateTo'] : (selectPayElIDfirst ? selectPayElIDfirst.dateTo : null)
  }

  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('orgID', '=', orgID)
    .where('dateFrom', '<=', dateReport)
    .where('dateTo', '>=', dateReport)
    .selectSingle()

  const periods = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'name', 'isClosed', 'isCurrent', 'isBlock', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .where('dateTo', '>=', dateFrom)
    .where('dateFrom', '<=', dateTo)
    .orderBy('dateFrom')
    .selectAsObject()
  periods.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })

  let calcParams = {
    orgID,
    dateFrom,
    dateTo,
    employeeNumberID,
    dateReport,
    period,
    selectPayEl
  }
  result.planSum = selectPayEl.payElID ? calcPlan() : 0
  result.upMarginValue = params.upMarginValue
  result.leftMarginValue = params.leftMarginValue

  function calcPlan () {
    const params = calcParams
    const orgID = params.orgID
    const cont = { emp: { }, periods: periods }
    // Дані організації
    cont.orgID = orgID
    cont.org = orgService.getOrgData(orgID)
    cont.constants = orgService.getOrgConstant(orgID)

    // Завантаження загальних довідників
    contService.initDict(cont)
    // Види оплат
    cont.payEl = payElService.getPayEl({ orgID })

    // Фонди
    cont.payFund = payFundService.getPayFund()
    if (params.dateFrom) {
      params.dateFrom = dateService.shiftDate(params.dateFrom)
    }
    if (params.dateTo) {
      params.dateTo = dateService.shiftDate(params.dateTo)
    }

    if (dateReport) {
      dateReport = dateService.shiftDate(dateReport)
    }

    if (!params.payElParams) {
      params.payElParams = []
    }
    params.payElParams.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    // Дані працівника (призначення, нарахування, табель)
    cont.employeeNumberID = params.employeeNumberID
    cont.emp = { [cont.employeeNumberID]: {} }

    cont.emp[cont.employeeNumberID].prop = employeeService.getEmpData(params.employeeNumberID, dateReport, dateReport)
    cont.emp[params.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, params.employeeNumberID, cont, params.period)

    // Постійні нарахування
    const accr = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => dateService.shiftDate(o.dateFrom) <= params.dateTo && dateService.shiftDate(o.dateTo) >= params.dateTo)
    const permanentAccrual = {
      payElID: params.selectPayEl.payElID,
      dateFrom: params.selectPayEl.dateFrom,
      dateTo: params.selectPayEl.dateTo
    }

    return algorithmService.getPlanSum(params.dateTo, cont, permanentAccrual, accr, cont.emp[params.employeeNumberID].permanentAccrual) * (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1)
  }
  return result
}

function getAvgSalary13Data (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", emp.ID as "employeeID", en.dateFrom as "dateFrom"  
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate,
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employee.employeeID)
    .where('orderDate', '>', params.periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employee.datName = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
  } else {
    employee.datName = employee ? employee['datName'] || employee['fullFIO'] : ''
  }
  if (employee && employee.dateFrom) employee.dateFrom = employee.dateFrom ? dateService.formatDate(employee.dateFrom) : ''

  let headEmployeeName = params.headEmployeePositionID ? empData.find(emp => emp.epID === params.headEmployeePositionID) : null
  let accEmployeeName = params.accEmployeePositionID ? empData.find(emp => emp.epID === params.accEmployeePositionID) : null
  headEmployeeName = headEmployeeName ? headEmployeeName.shortFIO : ''
  accEmployeeName = accEmployeeName ? accEmployeeName.shortFIO : ''

  let orgDat = reportService.getHrOrg(params.orgID, onDate)
  orgDat = orgDat.nameLoc || orgDat.name

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom')
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom'])
    .orderBy('dateFrom')
    .selectAsObject()

  const timeSheetByPeriod = {}
  const reportParams = reportService.getReportParams(params.orgID, ['CertfFSSUAbs', 'CertfFSSUFund'])
  const timeSheetDS = UB.DataStore('tim_timeSheet')
  timeSheetDS.runSQL(`SELECT SUM(CASE WHEN t.sum > 0 THEN 1 ELSE 0 END) AS "sum1", t.dateFrom AS "periodDateFrom" FROM (
  SELECT count(ts.ID) AS sum, dp.dateFrom 
  FROM tim_timeSheet ts 
  inner JOIN hr_dictPeriod dp on ts.dateWork>=dp.dateFrom and ts.dateWork<=dp.dateTo and dp.orgID${entityBaseService.getInExpression('orgIDs')}
  inner JOIN hr_employeeNumber en on en.ID=ts.employeeNumberID AND en.orgID${entityBaseService.getInExpression('orgIDs')} AND en.mi_deleteDate >= '9999-12-31T00:00:00'
  WHERE
  en.employeeID = :employeeID:
  AND ts.dateWork >= :periodFrom:
  AND ts.dateWork <= :periodTo:
  AND ts.isActive = 1
  AND ts.mi_deleteDate >= '9999-12-31'
  ${reportParams.CertfFSSUAbsIDs.length ? `and ts.factTimeCostID${entityBaseService.getNotInExpression('certfFSSUAbsIDs')}` : ''}
  GROUP BY dp.dateFrom, ts.dateWork) t
   GROUP BY t.dateFrom`, {
    employeeID: employee.employeeID,
    orgIDs: empNumbers.map(o => o.orgID),
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    certfFSSUAbsIDs: reportParams.CertfFSSUAbsIDs
  })
  timeSheetDS.getAsJsObject().forEach(item => {
    timeSheetByPeriod[item.periodDateFrom] = item
  })

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  const accrualFundByPeriod = {}
  UB.Repository('hr_accrualFund')
    .attrs('sum([baseSum] - [addMinSum])', 'periodSalaryID.dateFrom')
    .where('employeeNumberID.employeeID', '=', employee.employeeID)
    .where('employeeNumberID', 'in', [params.employeeNumberID, ...empNumbers.map(o => o.employeeNumberID)])
    .where('periodSalaryID.dateFrom', '>=', params.periodFrom)
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where('payFundID.payFundMethodID.code', '=', '1')
    .where('payFundID.isRecSum', '=', 0)
    .whereIf(reportParams.CertfFSSUFundIDs.length, 'payFundID', 'notIn', reportParams.CertfFSSUFundIDs)
    .exists(
      UB.Repository('hr_employeePositionSR')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('workPlace', '=', '1')
        .where('dateFrom', '<=', params.periodTo)
        .where('dateTo', '>=', params.periodFrom)
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .groupBy('periodSalaryID.dateFrom')
    .selectAsObject({ 'sum([baseSum] - [addMinSum])': 'sum2' }).forEach(item => {
      if (accrualFundByPeriod[item['periodSalaryID.dateFrom']]) {
        accrualFundByPeriod[item['periodSalaryID.dateFrom']].sum2 += item.sum2
      } else {
        accrualFundByPeriod[item['periodSalaryID.dateFrom']] = item
      }
    })

  const accrualFund2ByPeriod = {}
  UB.Repository('hr_accrualFund')
    .attrs('sum([baseSum] - [addMinSum])', 'periodSalaryID.dateFrom')
    .where('employeeNumberID', 'in', [ params.employeeNumberID, ...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID) ])
    .where('periodSalaryID.dateFrom', '>=', params.periodFrom)
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where('payFundID.payFundMethodID.code', '=', '1')
    .where('payFundID.isRecSum', '=', 0)
    .whereIf(reportParams.CertfFSSUFundIDs.length, 'payFundID', 'notIn', reportParams.CertfFSSUFundIDs)
    .groupBy(['periodSalaryID', 'periodSalaryID.dateFrom'])
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject({ 'sum([baseSum] - [addMinSum])': 'sum3' }).forEach(item => {
      if (accrualFund2ByPeriod[item['periodSalaryID.dateFrom']]) {
        accrualFund2ByPeriod[item['periodSalaryID.dateFrom']].sum3 += item.sum3
      } else {
        accrualFund2ByPeriod[item['periodSalaryID.dateFrom']] = item
      }
    })

  const timeSheetData = []
  let allSum = {
    sum1: 0,
    sum2: 0,
    sum3: 0,
    sum4: 0
  }

  periods.forEach((period, i) => {
    const currTimeShit = timeSheetByPeriod[period.dateFrom]
    const currAccrualFund1 = accrualFundByPeriod[period.dateFrom]
    const currAccrualFund2 = accrualFund2ByPeriod[period.dateFrom]

    const sums = {
      sum1: currTimeShit ? currencyService.round(currTimeShit.sum1, 2) : 0,
      sum2: currAccrualFund1 ? currencyService.round(currAccrualFund1.sum2, 2) : 0,
      sum3: currAccrualFund2 ? currencyService.round(currAccrualFund2.sum3, 2) : 0
    }
    sums.sum3 = currencyService.round(sums.sum3 -= sums.sum2, 2)
    sums.sum4 = currencyService.round(sums.sum4 = sums.sum2 + sums.sum3, 2)
    for (let j = 1; j <= 4; j++) {
      allSum['sum' + j] = currencyService.round(allSum['sum' + j] += sums['sum' + j], 2)
    }

    timeSheetData.push({
      num: i + 1,
      periodDesc: period.name,
      sum1: sums.sum1,
      sum2: getFixed2Val(sums.sum2),
      sum3: getFixed2Val(sums.sum3),
      sum4: getFixed2Val(sums.sum4)
    })
  })

  for (let i = 2; i <= 4; i++) {
    allSum['sum' + i] = getFixed2Val(allSum['sum' + i])
  }
  const avgSalary = getFixed2Val(allSum.sum1 ? allSum.sum4 / allSum.sum1 : 0)

  return {
    employee,
    orgDat,
    timeSheetData,
    allSum,
    avgSalary,
    headEmployeeName,
    accEmployeeName,
    upMarginValue: params.upMarginValue,
    leftMarginValue: params.leftMarginValue
  }
}

function getAvgSalaryFSSData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", en.dateFrom as "dateFrom", en.dateTo as "dateTo" 
FROM hr_employeePosition ep 
left join hr_employee emp on emp.ID = ep.employeeID
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate,
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employee.employeeID)
    .where('orderDate', '>', params.periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employee.datName = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
  } else {
    employee.datName = employee ? employee['datName'] || employee['fullFIO'] : ''
  }
  let signers = getSigners(params.orgID)
  /*UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []*/

  let orgDat = reportService.getHrOrg(params.orgID, onDate)
  orgDat = orgDat.nameLoc || orgDat.name

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom', 'dateTo')
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom', 'dateTo'])
    .orderBy('dateFrom')
    .selectAsObject()

  let genDateFrom = dateService.shiftDate(periods[0].dateFrom)
  let genDateTo = dateService.shiftDate(periods[periods.length - 1].dateTo)

  const timeSheetByPeriod = {}
  const timeSheetDS = UB.DataStore('tim_timeSheet')
  const reportParams = reportService.getReportParams(params.orgID, ['CertfFSSUFund', 'CertfFSSUAbs', 'CertfFSSUPay'])
  timeSheetDS.runSQL(`SELECT count(A01.ID) AS "sum1",
   A05.dateFrom as "periodDateFrom"
  FROM tim_timeSheet A01 inner JOIN hr_dictPeriod A05 on A01.dateWork>=A05.dateFrom and A01.dateWork<=A05.dateTo 
  and A05.orgID${entityBaseService.getInExpression('orgIDs')}
  WHERE
  A01.employeeNumberID${entityBaseService.getInExpression('employeeNumberIDs')}
  AND A01.dateWork >= :periodFrom:
  AND A01.dateWork <= :periodTo: 
  AND  A01.isActive = 1
  AND A01.mi_deleteDate >= '9999-12-31'
  AND A01.factTimeCostID${entityBaseService.getInExpression('certfFSSUAbsIDs')}
  GROUP BY A05.dateFrom`, {
    employeeNumberIDs: empNumbers.map(o => o.employeeNumberID),
    orgIDs: empNumbers.map(o => o.orgID),
    periodFrom: genDateFrom,
    periodTo: genDateTo,
    certfFSSUAbsIDs: reportParams.CertfFSSUAbsIDs.length ? reportParams.CertfFSSUAbsIDs : [0]
  })

  timeSheetDS.getAsJsObject().forEach(item => {
    timeSheetByPeriod[item.periodDateFrom] = item
  })

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  const accrualFundByPeriod = {}
  UB.Repository('hr_accrualFund')
    .attrs('sum([baseSum]-[addMinSum])', 'sum([paySum])', 'periodSalaryID.dateFrom', 'rate')
    .whereIf(params.withComb, 'employeeNumberID', 'in', [ params.employeeNumberID, ...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID) ])
    .whereIf(!params.withComb, 'employeeNumberID', 'in', [params.employeeNumberID, ...empNumbers.map(o => o.employeeNumberID)])
    .where('periodSalaryID.dateTo', '>=', genDateFrom)
    .where('periodSalaryID.dateFrom', '<=', genDateTo)
    .where('payFundID.isRecSum', '=', 0)
    .whereIf(reportParams.CertfFSSUFundIDs.length, 'payFundID', 'notIn', reportParams.CertfFSSUFundIDs)
    .groupBy(['periodSalaryID.dateFrom', 'rate'])
    .selectAsObject({ 'sum([baseSum]-[addMinSum])': 'sum2', 'sum([paySum])': 'sum3', 'periodSalaryID.dateFrom': 'periodDateFrom' }).forEach(item => {
      accrualFundByPeriod[item.periodDateFrom] = item
    })

  const validReasonList = UB.Repository('tim_timeSheet')
    .attrs('distinct [factTimeCostID.name]')
    .whereIf(params.withComb, 'employeeNumberID', 'in', [ params.employeeNumberID, ...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID) ])
    .whereIf(!params.withComb, 'employeeNumberID', 'in', [params.employeeNumberID, ...empNumbers.map(o => o.employeeNumberID)])
    .where('dateWork', '>=', genDateFrom)
    .where('dateWork', '<=', genDateTo)
    .where('isActive', '=', 1)
    .where('factTimeCostID', 'in', reportParams.CertfFSSUAbsIDs.length ? reportParams.CertfFSSUAbsIDs : [0])
    .selectAsObject().map(item => item['distinct [factTimeCostID.name]']).join(', ') || '&nbsp;'

  const payElList = UB.Repository('hr_accrual')
    .attrs('distinct [payElID.name]')
    .where('payElID', 'in', reportParams.CertfFSSUPayIDs.length ? reportParams.CertfFSSUPayIDs : [0])
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('periodSalaryID.dateTo', '>=', genDateFrom)
    .where('periodSalaryID.dateFrom', '<=', genDateTo)
    .whereIf(!params.withComb, `((flagsRec & 4096 = 0) AND (flagsRec & 8192 = 0))`, 'custom')
    .whereIf(params.withComb, `(((flagsRec & 4096 = 0) AND (flagsRec & 8192 = 0)) OR (flagsRec & 4096 = 4096) AND (flagsRec & 262144 = 0))`, 'custom')
    .selectAsObject().map(item => item['distinct [payElID.name]']).join(', ')

  const timeSheetData = []
  let allBaseSum = 0

  employee.dateFrom = new Date(employee.dateFrom)
  employee.dateTo = new Date(employee.dateTo)

  periods.forEach(period => {
    const currTimeShit = timeSheetByPeriod[period.dateFrom]
    const currAccrualFund = accrualFundByPeriod[period.dateFrom]

    const periodFromTime = dateService.shiftDate(period.dateFrom).getTime()
    const periodToTime = dateService.shiftDate(period.dateTo).getTime()
    const empFromTime = dateService.shiftDate(employee.dateFrom).getTime()
    const empToTime = dateService.shiftDate(employee.dateTo).getTime()
    let days = 0
    if (empFromTime <= periodToTime && periodFromTime <= empToTime) {
      const start = Math.max(periodFromTime, empFromTime)
      const end = Math.min(periodToTime, empToTime)
      days = dateService.dateDiff(start, end)
    }

    days = days ? days - (currTimeShit && currTimeShit.sum1 ? currTimeShit.sum1 : 0) : 0

    timeSheetData.push({
      periodDesc: period.name,
      sum1: days,
      sum2: getFixed2Val(currAccrualFund, 'sum2'),
      sum3: getFixed2Val(currAccrualFund, 'sum3'),
      rate: currAccrualFund ? currAccrualFund.rate : 0
    })
    allBaseSum = currencyService.round(allBaseSum += currAccrualFund ? currAccrualFund.sum2 : 0, 2)
  })

  allBaseSum = currencyService.currencyToWordsUkr(allBaseSum)

  let logoSettings = reportService.getAccrualReportPrintConfig(params.orgID)

  return {
    employee,
    orgDat,
    signers,
    logoSettings: logoSettings.isAddLogo ? logoSettings : false,
    validReasonList,
    payElList: payElList || '&nbsp',
    payDate: payElList && params.payDate ? dateService.formatDate(params.payDate) : '&nbsp',
    timeSheetData,
    allBaseSum,
    upMarginValue: params.upMarginValue,
    leftMarginValue: params.leftMarginValue
  }
}

function getAvgSalaryMainData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", en.dateFrom as "dateFrom", en.dateTo as "dateTo"
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate,
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employee.employeeID)
    .where('orderDate', '>', params.periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employee.datName = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
  } else {
    employee.datName = employee ? employee['datName'] || employee['fullFIO'] : ''
  }
  let headEmployeeName = params.headEmployeePositionID ? empData.find(emp => emp.epID === params.headEmployeePositionID) : null
  let accEmployeeName = params.accEmployeePositionID ? empData.find(emp => emp.epID === params.accEmployeePositionID) : null
  headEmployeeName = headEmployeeName ? headEmployeeName.shortFIO : ''
  accEmployeeName = accEmployeeName ? accEmployeeName.shortFIO : ''

  let orgDat = reportService.getHrOrg(params.orgID, onDate)
  orgDat = orgDat.nameLoc || orgDat.name

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom', 'dateTo')
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom', 'dateTo'])
    .orderBy('dateFrom')
    .selectAsObject()

  let genDateFrom = dateService.shiftDate(periods[0].dateFrom)
  let genDateTo = dateService.shiftDate(periods[periods.length - 1].dateTo)

  const timeSheetByPeriod = {}
  const timeSheetDS = UB.DataStore('tim_timeSheet')
  const reportParams = reportService.getReportParams(params.orgID, ['CertfFSSUAbs', 'CertfFSSUFund'])
  timeSheetDS.runSQL(`SELECT count(A01.ID) AS "sum1",
  A05.dateFrom as "periodDateFrom"
  FROM tim_timeSheet A01 inner JOIN hr_dictPeriod A05 on A01.dateWork>=A05.dateFrom and A01.dateWork<=A05.dateTo 
  and A05.orgID${entityBaseService.getInExpression('orgIDs')}
  WHERE
  A01.employeeNumberID${entityBaseService.getInExpression('employeeNumberIDs')}
  AND A01.dateWork >= :periodFrom:
  AND A01.dateWork <= :periodTo: 
  AND  A01.isActive = 1
  AND A01.mi_deleteDate >= '9999-12-31'
  AND A01.factTimeCostID${entityBaseService.getInExpression('certfFSSUAbsIDs')}
  GROUP BY A05.dateFrom`, {
    employeeNumberIDs: empNumbers.map(o => o.employeeNumberID),
    orgIDs: empNumbers.map(o => o.orgID),
    periodFrom: genDateFrom,
    periodTo: genDateTo,
    certfFSSUAbsIDs: reportParams.CertfFSSUAbsIDs.length ? reportParams.CertfFSSUAbsIDs : [0]
  })

  timeSheetDS.getAsJsObject().forEach(item => {
    timeSheetByPeriod[item.periodDateFrom] = item
  })

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  const accrualFundByPeriod = {}
  UB.Repository('hr_accrualFund')
    .attrs('sum([baseSum]-[addMinSum])', 'sum([paySum])', 'periodSalaryID.dateFrom', 'rate')
    .whereIf(params.withComb, 'employeeNumberID', 'in', [ params.employeeNumberID, ...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID) ])
    .whereIf(!params.withComb, 'employeeNumberID', 'in', [params.employeeNumberID, ...empNumbers.map(o => o.employeeNumberID)])
    .where('periodSalaryID.dateTo', '>=', genDateFrom)
    .where('periodSalaryID.dateFrom', '<=', genDateTo)
    .where('payFundID.isRecSum', '=', 0)
    .whereIf(reportParams.CertfFSSUFundIDs.length, 'payFundID', 'notIn', reportParams.CertfFSSUFundIDs)
    .groupBy(['periodSalaryID.dateFrom', 'rate'])
    .selectAsObject({ 'sum([baseSum]-[addMinSum])': 'sum2', 'sum([paySum])': 'sum3', 'periodSalaryID.dateFrom': 'periodDateFrom' }).forEach(item => {
      accrualFundByPeriod[item.periodDateFrom] = item
    })

  const validReasonList = UB.Repository('tim_timeSheet')
    .attrs('distinct [factTimeCostID.name]')
    .whereIf(params.withComb, 'employeeNumberID', 'in', [ params.employeeNumberID, ...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID) ])
    .whereIf(!params.withComb, 'employeeNumberID', 'in', [params.employeeNumberID, ...empNumbers.map(o => o.employeeNumberID)])
    .where('dateWork', '>=', genDateFrom)
    .where('dateWork', '<=', genDateTo)
    .where('isActive', '=', 1)
    .where('factTimeCostID', 'in', reportParams.CertfFSSUAbsIDs.length ? reportParams.CertfFSSUAbsIDs : [0])
    .selectAsObject().map(item => item['distinct [factTimeCostID.name]']).join(', ') || '&nbsp;'

  const timeSheetData = []
  let allBaseSum = 0

  employee.dateFrom = new Date(employee.dateFrom)
  employee.dateTo = new Date(employee.dateTo)

  periods.forEach(period => {
    const currTimeShit = timeSheetByPeriod[period.dateFrom]
    const currAccrualFund = accrualFundByPeriod[period.dateFrom]

    const periodFromTime = dateService.shiftDate(period.dateFrom).getTime()
    const periodToTime = dateService.shiftDate(period.dateTo).getTime()
    const empFromTime = dateService.shiftDate(employee.dateFrom).getTime()
    const empToTime = dateService.shiftDate(employee.dateTo).getTime()

    let days = 0
    if (empFromTime <= periodToTime && periodFromTime <= empToTime) {
      const start = Math.max(periodFromTime, empFromTime)
      const end = Math.min(periodToTime, empToTime)

      days = dateService.dateDiff(start, end)
    }
    days = days ? days - (currTimeShit && currTimeShit.sum1 ? currTimeShit.sum1 : 0) : 0

    timeSheetData.push({
      periodDesc: period.name,
      sum1: days,
      sum2: getFixed2Val(currAccrualFund, 'sum2'),
      sum3: getFixed2Val(currAccrualFund, 'sum3'),
      rate: currAccrualFund ? currAccrualFund.rate : 0
    })
    allBaseSum = currencyService.round(allBaseSum += currAccrualFund ? currAccrualFund.sum2 : 0, 2)
  })

  allBaseSum = currencyService.currencyToWordsUkr(allBaseSum)
  return {
    employee,
    orgDat,
    headEmployeeName,
    accEmployeeName,
    validReasonList,
    timeSheetData,
    allBaseSum,
    upMarginValue: params.upMarginValue,
    leftMarginValue: params.leftMarginValue
  }
}

function getCreditReportData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const posField = useActualPositionName
    ? 'ep.factPosition '
    : staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${posField} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", en.dateFrom as "dateFrom" 
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID and emp.mi_deleteDate>= '9999-12-31'
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
`,
  {
    onDate
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employee.employeeID)
    .where('orderDate', '>', params.periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employee.datName = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
  } else {
    employee.datName = employee ? employee['datName'] || employee['fullFIO'] : ''
  }

  if (employee && employee.dateFrom) employee.dateFrom = employee.dateFrom ? dateService.formatDate(employee.dateFrom) : ''

  /*let signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []*/
    let signers = getSigners(params.orgID)

  const accrualSum = UB.Repository('hr_employeePositionSR')
    .attrs('accrualSum')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectScalar()

  let orgDat = reportService.getHrOrg(params.orgID, onDate)
  orgDat = orgDat.nameLoc || orgDat.name

  const months = dateService.monthDiff(params.periodFrom, params.periodTo) + 1

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom')
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom'])
    .orderBy('dateFrom')
    .selectAsObject()

  let currPeriod = periodService.getCurrentPeriod(params.orgID)

  const accrualBalanceMonth = new Date(params.periodTo.getFullYear(), params.periodTo.getMonth(), 1) < new Date(currPeriod.pYear, currPeriod.pMonth, 1) ? params.periodTo : currPeriod.dateTo

  let accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs('sum([sumFrom]-[sumPay])')
    .where('periodCalcID.dateFrom', '<=', accrualBalanceMonth)
    .where('periodCalcID.dateTo', '>=', accrualBalanceMonth)
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectScalar() || 0

  if (accrualBalance <= 0) {
    accrualBalance = 'не було'
  } else {
    let accrualBalanceStr = currencyService.currencyToWordsUkr(accrualBalance).toLowerCase()
    const accrualBalanceArr = accrualBalance.toFixed(2).split('.')
    const indexOfGrn = accrualBalanceStr.indexOf(' грив')
    accrualBalance = UB.i18n(`складає {0} ({1}){2}`, accrualBalanceArr[0], accrualBalanceStr.substr(0, indexOfGrn), accrualBalanceStr.substr(indexOfGrn, accrualBalanceStr.length))
  }

  const accrualByPeriod = {}
  UB.Repository('hr_accrual')
    .attrs('periodSalaryID.name', 'periodSalaryID.dateFrom',
      `sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)`,
      `sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)`,
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 129 THEN [paySum] ELSE 0 END)',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 130 or [payElID.methodID.methodGroupID.code] = 131 or [payElID.methodID.methodGroupID.code] = 132 or [payElID.methodID.methodGroupID.code] = 133 THEN [paySum] ELSE 0 END)')
    .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
    .where('periodSalaryID.dateTo', '>=', params.periodFrom)
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .groupBy(['periodSalaryID.name', 'periodSalaryID.dateFrom'])
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject({
      'periodSalaryID.name': 'periodName',
      'periodSalaryID.dateFrom': 'periodDateFrom',
      "sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)": 'sum1',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)': 'sum2',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 129 THEN [paySum] ELSE 0 END)': 'sum3',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 130 or [payElID.methodID.methodGroupID.code] = 131 or [payElID.methodID.methodGroupID.code] = 132 or [payElID.methodID.methodGroupID.code] = 133 THEN [paySum] ELSE 0 END)': 'sum5'
    }).forEach(item => {
      accrualByPeriod[item.periodDateFrom] = item
    })

  const accrualData = []
  let allSum = {
    sum1: 0,
    sum2: 0,
    sum3: 0,
    sum4: 0,
    sum5: 0
  }

  periods.forEach(period => {
    const currData = accrualByPeriod[period.dateFrom]

    if (currData) {
      currData.sum4 = (currData.sum1 || 0) - (currData.sum2 || 0) - (currData.sum3 || 0) - (currData.sum5 || 0)

      let currObj = {
        periodDesc: period.name
      }
      let currSum
      for (let i = 1; i <= 5; i++) {
        currSum = 'sum' + i
        currObj[currSum] = getFixed2Val(currData[currSum])
        allSum[currSum] = currencyService.round(allSum[currSum] += currData[currSum] || 0, 2)
      }

      accrualData.push(currObj)
    } else {
      accrualData.push({
        periodDesc: period.name,
        sum1: '0.00',
        sum2: '0.00',
        sum3: '0.00',
        sum4: '0.00',
        sum5: '0.00'
      })
    }
  })

  const allSum1Word = currencyService.currencyToWordsUkr(allSum.sum1)
  const allSum4Word = currencyService.currencyToWordsUkr(allSum.sum4)

  for (let i = 1; i <= 5; i++) {
    allSum['sum' + i] = getFixed2Val(allSum['sum' + i])
  }

  let logoSettings = reportService.getAccrualReportPrintConfig(params.orgID)

  return {
    employee,
    accrualSum,
    orgDat,
    months,
    accrualData,
    allSum,
    allSum1Word,
    allSum4Word,
    accrualBalance,
    signers,
    logoSettings: logoSettings.isAddLogo ? logoSettings : false,
    upMarginValue: params.upMarginValue
  }
}

function getIncomeReportData (params) {
  const periodFrom = dateService.shiftDate(params.periodFrom)
  const periodTo = dateService.shiftDate(params.periodTo)
  const accrFieldName = params.accPeriodCode === 'CALC' ? 'periodCalcID' : 'periodSalaryID'
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const hrOrg = reportService.getHrOrg(params.orgID, periodTo)
  const orgAddress = UB.Repository('ac_address').attrs('address').where('ownerID', '=', params.orgID)
    .where('addressType', '=', '2').selectScalar()
  const orgPhone = UB.Repository('cdn_contact').attrs('value').where('subjectID', '=', params.orgID)
    .where('contactTypeID.code', '=', 'phone').selectScalar()
  const orgOKPOCode = hrOrg.EDRPOUCode || null

  let empKind = UB.Repository('hr_employeeNumber')
    .attrs('kind')
    .where('ID', '=', params.employeeNumberID)
    .selectScalar()
  const isStudent = !((!empKind || (empKind && empKind !== 'STUD')))
  const employeeNumber = UB.Repository('hr_employeeNumber')
    .attrs(['ID', 'employeeID'])
    .selectById(params.employeeNumberID)
  let studData = {}
  if (isStudent) {
    studData = UB.Repository('hr_studEducationHistory')
      .attrs(['ID', 'groupID.description', 'departmentID.name'])
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('employeeID', '=', employeeNumber.employeeID)
      .orderBy('dateTo', 'desc')
      .orderBy('departmentID.mi_dateTo', 'desc')
      .orderBy('mi_createDate', 'desc')
      .limit(1)
      .selectAsObject({
        'groupID.description': 'groupName',
        'departmentID.name': 'facultyName'
      })
    if (!studData.length) {
      studData = {
        groupName: '______',
        facultyName: '_________'
      }
    } else {
      studData = studData[0]
    }
  }

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const posField = useActualPositionName
    ? 'ep.factPosition '
    : staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')

  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", wp.name as "workPlace", ${posField} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", emp.ID "empID"
FROM hr_employeePosition ep 
left join ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' 
join hr_employee emp on emp.ID = ep.employeeID
 ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
WHERE ep.ID${entityBaseService.getInExpression('emps')} 
and ep.isActive = 1 
and ep.mi_deleteDate >= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate: dateService.shiftDate(params.currDate),
    employeePositionID: params.employeePositionID,
    emps: emps.split(',')
  })
  let empData = store.getAsJsObject()
  store.freeNative()
  let employeeData = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employeeData.dateFrom > el.dateFrom) employeeData.dateFrom = el.dateFrom
    if (employeeData.dateTo < el.dateTo) employeeData.dateTo = el.dateTo
  })
  if (employeeData) employeeData.datName = employeeData.datName || employeeData.fullFIO || ''
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employeeData.employeeID)
    .where('orderDate', '>', periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employeeData.datName = employeeChange.datNameOld || employeeChange.fullFIOOld
  }

  if (isStudent) {
    let resp = UB.Repository('hr_studEducationKind')
      .attrs(['ID', 'typeStudy.code'])
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('employeeID', '=', employeeNumber.employeeID)
      .orderBy('dateTo', 'desc')
      .orderBy('mi_createDate', 'desc')
      .limit(1)
      .selectSingle({
        'typeStudy.code': 'typeStudyCode'
      })
    employeeData.workPlace = resp ? `Навчання${resp.typeStudyCode ? (resp.typeStudyCode === '01' ? ' - безоплатне' : (resp.typeStudyCode === '02' ? ' - платне' : ``)) : ``}` : ``
  }

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }
  /*let signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []*/
    let signers = getSigners(params.orgID)

  function getQueryPaySum () {
    return UB.Repository('hr_accrual')
      .attrs('sum([paySum])', accrFieldName, `${accrFieldName}.dateFrom`)
      .where('employeeNumberID', 'in', [...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID)])
      .where(`(flagsRec & 8192 = 0)`, 'custom')
      .where(`${accrFieldName}.dateFrom`, '<=', periodTo)
      .where(`${accrFieldName}.dateTo`, '>=', periodFrom)
      .groupBy([accrFieldName, `${accrFieldName}.dateFrom`])
      .orderBy(`${accrFieldName}.dateFrom`)
  }

  function groupByPeriod (data) {
    const obj = {}
    data.forEach(row => {
      if (obj[row[`${accrFieldName}.dateFrom`]]) {
        obj[row[`${accrFieldName}.dateFrom`]]['sum([paySum])'] = currencyService.round(row['sum([paySum])'] + obj[row[`${accrFieldName}.dateFrom`]]['sum([paySum])'], 2)
      } else {
        obj[row[`${accrFieldName}.dateFrom`]] = row
      }
    })
    return obj
  }

  function groupByPeriodArr (data) {
    const obj = {}
    data.forEach(row => {
      if (!obj[row[`${accrFieldName}.dateFrom`]]) obj[row[`${accrFieldName}.dateFrom`]] = []
      obj[row[`${accrFieldName}.dateFrom`]].push(row)
    })
    return obj
  }

  const accrual1 = groupByPeriod(getQueryPaySum() // Отриманий дохід
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectAsObject())
  const reportParams = reportService.getReportParams(params.orgID, ['FOZP', 'FDZP', 'ZKV'])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const accrual2 = groupByPeriod(getQueryPaySum() // Заробітна плата
    .where('payElID', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
    .selectAsObject())
  const accrual3 = groupByPeriod(getQueryPaySum() // Податки
    .where('payElID.methodID.methodGroupID.code', '=', 127)
    .selectAsObject())
  const accrual4 = groupByPeriod(getQueryPaySum() // Аліменти
    .where('payElID.methodID.code', '=', '31')
    .selectAsObject())

  const dictPeriod = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom', 'dateTo')
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom', 'dateTo'])
    .orderBy('dateFrom')
    .selectAsObject()

  let allAccrual = []

  let accrual5 = UB.Repository('hr_accrual')
    .attrs(accrFieldName, `${accrFieldName}.dateFrom`, 'payElID', 'payElID.methodID.code', 'sum([paySum])', 'sum([baseSum])')
    .where('employeeNumberID', 'in', [...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID)])
    .where(`${accrFieldName}.dateFrom`, '<=', periodTo)
    .where(`${accrFieldName}.dateTo`, '>=', periodFrom)
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .where('payElID.methodID.methodGroupID.code', '=', 127)
    .groupBy([accrFieldName, `${accrFieldName}.dateFrom`, 'payElID', 'payElID.methodID.code'])
    .selectAsObject({
      'sum([paySum])': 'paySum',
      'sum([baseSum])': 'baseSum',
      'payElID.methodID.code': 'methodCode'
    })

  if (!params.withComb) {
    // корректируем базовую сумму для ПДФО с учетом суммы совместителя
    const accrual26Comb = UB.Repository('hr_accrual')
      .attrs(accrFieldName, `${accrFieldName}.dateFrom`, 'payElID', 'sum([baseSum])')
      .where('employeeNumberID', 'in', [...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID)])
      .where('employeeNumberID', '!=', params.employeeNumberID)
      .where(`${accrFieldName}.dateFrom`, '<=', periodTo)
      .where(`${accrFieldName}.dateTo`, '>=', periodFrom)
      .where(`(flagsRec & 8192 = 0)`, 'custom')
      .where('payElID.methodID.code', '=', '26')
      .groupBy([accrFieldName, `${accrFieldName}.dateFrom`, 'payElID'])
      .selectAsObject({
        'sum([baseSum])': 'baseSum'
      })

    accrual26Comb.forEach(row => {
      const item = accrual5.find(o => o['periodSalaryID.dateFrom'] === row['periodSalaryID.dateFrom'] && o.payElID === row.payElID)
      if (item) {
        item.baseSum -= row.baseSum || 0
      }
    })
  }
  accrual5 = groupByPeriodArr(accrual5)

  let accrualTotal = { c2: 0, c3: 0, c4: 0, c5: 0, c6: 0 }
  dictPeriod.forEach(period => {
    let obj = {
      c1: period.name,
      c2: getFixed2Val(accrual2[period.dateFrom], 'sum([paySum])'),
      c3: 0,
      c4: getFixed2Val(((accrual1[period.dateFrom] ? accrual1[period.dateFrom]['sum([paySum])'] : 0) - (accrual2[period.dateFrom] ? accrual2[period.dateFrom]['sum([paySum])'] || 0 : 0))),
      c5: '0.00',
      c6: getFixed2Val(accrual4[period.dateFrom], 'sum([paySum])')
    }

    if (accrual2[period.dateFrom] && accrual1[period.dateFrom] && accrual2[period.dateFrom]['sum([paySum])'] === accrual1[period.dateFrom]['sum([paySum])']) obj.c3 = accrual3[period.dateFrom] ? accrual3[period.dateFrom]['sum([paySum])'] : 0
    else {
      const currAcc = accrual5[period.dateFrom] || []
      currAcc.forEach(row => {
        let zpSumByTax = UB.Repository('hr_accrual')
          .attrs('sum([paySum])')
          .where('employeeNumberID', 'in', [...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID)])
          .where(`${accrFieldName}.dateFrom`, '<=', period.dateTo)
          .where(`${accrFieldName}.dateTo`, '>=', period.dateFrom)
          .where(`(flagsRec & 8192 = 0)`, 'custom')
          .where('payElID', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
        if (row.methodCode === '26') {
          zpSumByTax.exists(
            UB.Repository('hr_payElTaxIndivid')
              .correlation('payElID', 'payElID')
              .exists(
                UB.Repository('hr_payElTaxIndividEntry')
                  .correlation('taxIndividID', 'taxIndividID')
                  .where('payElID', '=', row.payElID)
                  .where('mi_deleteDate', '>=', '#maxdate')
              )
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        } else {
          zpSumByTax.exists(
            UB.Repository('hr_payElEntry')
              .correlation('payElBaseID', 'payElID')
              .where('payElID', '=', row.payElID)
              .where('mi_deleteDate', '>=', '#maxdate')
          )
        }
        zpSumByTax = zpSumByTax.selectScalar() || 0
        row.paySum = row.paySum ? currencyService.round(row.paySum, 2) : 0
        row.baseSum = row.baseSum ? currencyService.round(row.baseSum, 2) : 0
        obj.c3 = currencyService.round(obj.c3 += (zpSumByTax * row.paySum / row.baseSum), 2)
      })
    }

    obj.c5 = getFixed2Val((accrual3[period.dateFrom] ? accrual3[period.dateFrom]['sum([paySum])'] : 0) - obj.c3)
    obj.c3 = getFixed2Val(obj.c3)

    Object.keys(accrualTotal).forEach(sum => {
      accrualTotal[sum] = currencyService.round(accrualTotal[sum] += Number(obj[sum]), 2)
    })
    allAccrual.push(obj)
  })

  const allSum = currencyService.currencyToWordsUkr(accrualTotal.c2 + accrualTotal.c4 - accrualTotal.c3 - accrualTotal.c5)

  Object.keys(accrualTotal).forEach(sum => {
    accrualTotal[sum] = getFixed2Val(accrualTotal[sum])
  })

  const periodFromYTable = dateService.formatDate(periodFrom, 'yy')
  const periodToYTable = dateService.formatDate(periodTo, 'yy')

  let logoSettings = reportService.getAccrualReportPrintConfig(params.orgID)

  return {
    orgName: hrOrg.name || '&nbsp;',
    orgNameDat: !isStudent ? hrOrg.nameDat : `${studData.groupName} групі ${studData.facultyName} факультету ${hrOrg.nameDat} _____  рівня акредитації`,
    orgAddress,
    orgPhone,
    orgOKPOCode,
    employeeData,
    allAccrual,
    accrualTotal,
    periodFromYTable,
    periodToYTable: periodFromYTable !== periodToYTable ? periodToYTable : null,
    periodFromM: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'mmm') : '',
    periodFromY: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'yy') : '',
    periodToM: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'mmmm').toLocaleLowerCase() : '',
    periodToY: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'yy') : '',
    allSum: allSum ? allSum.toLocaleLowerCase() : null,
    accountant: params.accEmployeePositionID ? UB.Repository('hr_employeePositionS').attrs('employeeNumberID.employeeID.shortFIO').where('ID', '=', params.accEmployeePositionID).selectScalar() : null,
    currDateD: dateService.formatDate(params.currDate, 'dd'),
    currDateM: dateService.formatDate(params.currDate, 'mmmm'),
    currDateY: dateService.formatDate(params.currDate, 'yy'),
    signers,
    logoSettings: logoSettings.isAddLogo ? logoSettings : false,
    upMarginValue: params.upMarginValue,
    leftMarginValue: params.leftMarginValue
  }
}

function getIncomeTaxReportData (params) {
  const periodFrom = dateService.shiftDate(params.periodFrom)
  const periodTo = dateService.shiftDate(params.periodTo)
  const accrFieldName = params.accPeriodCode === 'CALC' ? 'periodCalcID' : 'periodSalaryID'
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const hrOrg = reportService.getHrOrg(params.orgID, periodTo)
  const orgAddress = UB.Repository('ac_address').attrs('address').where('ownerID', '=', params.orgID)
    .where('addressType', '=', '2').selectScalar()
  const orgPhone = UB.Repository('cdn_contact').attrs('value').where('subjectID', '=', params.orgID)
    .where('contactTypeID.code', '=', 'phone').selectScalar()
  const orgOKPOCode = hrOrg.EDRPOUCode || null

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  const posField = useActualPositionName
    ? 'ep.factPosition '
    : staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')
  let store = UB.DataStore('hr_employeePosition')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", wp.name as "workPlace", ${posField} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", emp.ID "empID"
FROM hr_employeePosition ep 
join ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' 
join hr_employee emp on emp.ID = ep.employeeID
 ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
 `, {
    onDate: dateService.shiftDate(params.currDate),
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employeeData = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employeeData.dateFrom > el.dateFrom) employeeData.dateFrom = el.dateFrom
    if (employeeData.dateTo < el.dateTo) employeeData.dateTo = el.dateTo
  })
  if (employeeData && !employeeData.datName) employeeData.datName = employeeData.fullFIO
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employeeData.employeeID)
    .where('orderDate', '>', periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employeeData.datName = employeeChange.datNameOld || employeeChange.fullFIOOld
  }

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }

  /*let signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []*/
    let signers = getSigners(params.orgID)

  function getQueryPaySum () {
    return UB.Repository('hr_accrual')
      .attrs('sum([paySum])', accrFieldName, `${accrFieldName}.dateFrom`)
      .where('employeeNumberID', 'in', [...params.secondaryJobsNumbers, ...empNumbers.map(o => o.employeeNumberID)])
      .where(`(flagsRec & 8192 = 0)`, 'custom')
      .where(`${accrFieldName}.dateFrom`, '<=', periodTo)
      .where(`${accrFieldName}.dateTo`, '>=', periodFrom)
      .groupBy([accrFieldName, `${accrFieldName}.dateFrom`])
      .orderBy(`${accrFieldName}.dateFrom`)
  }

  function groupByPeriod (data) {
    const obj = {}
    data.forEach(row => {
      if (obj[row[`${accrFieldName}.dateFrom`]]) {
        obj[row[`${accrFieldName}.dateFrom`]]['sum([paySum])'] = currencyService.round(row['sum([paySum])'] + obj[row[`${accrFieldName}.dateFrom`]]['sum([paySum])'], 2)
      } else {
        obj[row[`${accrFieldName}.dateFrom`]] = row
      }
    })
    return obj
  }

  function getKopStr (x) {
    const kop = currencyService.round((x - Math.trunc(x)) * 100, 0)
    return (kop < 10 ? '0' : '') + kop.toFixed(0)
  }

  const accrual1 = groupByPeriod(getQueryPaySum() // Отриманий дохід
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectAsObject())

  const accrual2 = groupByPeriod(getQueryPaySum() // Матеріальна допомога
    .where('payElID.methodID.methodGroupID.code', '=', '7')
    .selectAsObject())

  const accrual3 = groupByPeriod(getQueryPaySum() // ПДФО
    .where('payElID.methodID.code', '=', '26')
    .selectAsObject())

  const accrual4 = groupByPeriod(getQueryPaySum() // Військовий збір
    .where('payElID.methodID.code', '=', '27')
    .selectAsObject())

  const accrual5 = groupByPeriod(getQueryPaySum() // Виконавчі листи
    .where('payElID.methodID.methodGroupID.code', '=', '129')
    .selectAsObject())

  const dictPeriod = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom', 'dateTo')
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom', 'dateTo'])
    .orderBy('dateFrom')
    .selectAsObject()

  let allAccrual = []
  let accrualTotal = { c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0 }

  dictPeriod.forEach(period => {
    let obj = {
      c1: period.name,
      c2: getFVal(accrual1[period.dateFrom], 'sum([paySum])'),
      c3: getFVal(accrual2[period.dateFrom], 'sum([paySum])'),
      c4: getFVal(accrual3[period.dateFrom], 'sum([paySum])'),
      c5: getFVal(accrual4[period.dateFrom], 'sum([paySum])'),
      c6: getFVal(accrual5[period.dateFrom], 'sum([paySum])'),
      c7: 0
    }

    obj.c7 = obj.c2 - obj.c4 - obj.c5 - obj.c6

    Object.keys(accrualTotal).forEach(sum => {
      accrualTotal[sum] = currencyService.round(accrualTotal[sum] += Number(obj[sum]), 2)
    })

    obj.c2 = currencyService.formatAsCurrencyEx(obj.c2, 2, '.', false)
    obj.c3 = currencyService.formatAsCurrencyEx(obj.c3, 2, '.', false)
    obj.c4 = currencyService.formatAsCurrencyEx(obj.c4, 2, '.', false)
    obj.c5 = currencyService.formatAsCurrencyEx(obj.c5, 2, '.', false)
    obj.c6 = currencyService.formatAsCurrencyEx(obj.c6, 2, '.', false)
    obj.c7 = currencyService.formatAsCurrencyEx(obj.c7, 2, '.', false)

    allAccrual.push(obj)
  })

  const allSumTotal = currencyService.currencyToWordsUkr(Math.trunc(accrualTotal.c2), true)
  const allSumTotalKop = getKopStr(accrualTotal.c2)

  const allSumPay = currencyService.currencyToWordsUkr(Math.trunc(accrualTotal.c7), true)
  const allSumPayKop = getKopStr(accrualTotal.c7)

  const avgSum = dictPeriod.length ? currencyService.round(accrualTotal.c2 / dictPeriod.length, 2) : 0

  const allSumAvg = currencyService.currencyToWordsUkr(Math.trunc(avgSum), true)
  const allSumAvgKop = getKopStr(avgSum, 2)

  Object.keys(accrualTotal).forEach(sum => {
    accrualTotal[sum] = currencyService.formatAsCurrencyEx(accrualTotal[sum], 2, '.', false)
  })

  const periodFromYTable = dateService.formatDate(periodFrom, 'yy')
  const periodToYTable = dateService.formatDate(periodTo, 'yy')

  let logoSettings = reportService.getAccrualReportPrintConfig(params.orgID)

  return {
    orgName: hrOrg.name || '&nbsp;',
    orgNameGen: hrOrg.nameGen || hrOrg.name,
    orgNameLoc: hrOrg.nameLoc || hrOrg.name,
    orgAddress,
    orgPhone,
    orgOKPOCode,
    employeeData,
    allAccrual,
    accrualTotal,
    periodFromYTable,
    upMarginValue: params.upMarginValue,
    periodToYTable: periodFromYTable !== periodToYTable ? periodToYTable : null,
    periodFrom: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom) : '',
    periodFromM: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'mmm') : '',
    periodFromY: dictPeriod[0] ? dateService.formatDate(dictPeriod[0].dateFrom, 'yy') : '',
    periodTo: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo) : '',
    periodToM: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'mmmm').toLocaleLowerCase() : '',
    periodToY: dictPeriod[dictPeriod.length - 1] ? dateService.formatDate(dictPeriod[dictPeriod.length - 1].dateTo, 'yy') : '',
    allSumTotal: allSumTotal ? allSumTotal.toLocaleLowerCase() : null,
    allSumTotalKop,
    allSumPay: allSumPay ? allSumPay.toLocaleLowerCase() : null,
    allSumPayKop,
    allSumAvg: allSumAvg ? allSumAvg.toLocaleLowerCase() : null,
    allSumAvgKop,
    accountant: params.accEmployeePositionID ? UB.Repository('hr_employeePositionS').attrs('employeeNumberID.employeeID.shortFIO').where('ID', '=', params.accEmployeePositionID).selectScalar() : null,
    currDateD: dateService.formatDate(params.currDate, 'dd'),
    currDateM: dateService.formatDate(params.currDate, 'mmmm'),
    currDateY: dateService.formatDate(params.currDate, 'yy'),
    signers,
    logoSettings: logoSettings.isAddLogo ? logoSettings : false
  }
}

function getInfoCardData (params) {
  const startTime = new Date()
  const periodFrom = dateService.shiftDate(params.periodFrom)
  const periodTo = dateService.shiftDate(params.periodTo)
  const globalDate = dateService.shiftDate(params.currDate)
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let hrOrg = reportService.getHrOrg(params.orgID, periodTo)
  const idParamStore = UB.DataStore('hr_idParam')
  // надбавки динамические из параметров
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  idParamStore.runSQL(`SELECT ip.ID as "ipID", pl.ID as "payElID", pl.name, pl.dateFrom as "dateFrom", pl.dateTo as "dateTo", ip.orderN  as "orderN"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE ip.orgID = :orgID: and lp.code = 'СardEmployeeNumberPrm' and ip.mi_deleteDate >= '9999-12-31' 
    ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  const paramPayElsPrm = idParamStore.getAsJsObject()
  const paramPayElIDs = paramPayElsPrm.map(el => el.payElID)

  // надбавки динамические из параметров
  idParamStore.runSQL(`SELECT ip.ID as "ipID", pl.ID as "payElID", pl.name, pl.dateFrom as "dateFrom", pl.dateTo as "dateTo", ip.orderN  as "orderN"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE ip.orgID = :orgID: and lp.code = 'СardEmployeeNumberDop' and ip.mi_deleteDate >= '9999-12-31' 
    ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  const paramPayElsDop = idParamStore.getAsJsObject()
  paramPayElIDs.push(...paramPayElsDop.map(el => el.payElID))

  paramPayElsDop.forEach(el => {
    el.orderN = 1000000 + el.orderN
  })

  // надбавки динамические из параметров
  idParamStore.runSQL(`SELECT ip.ID as "ipID", pl.ID as "payElID", pl.name, pl.dateFrom as "dateFrom", pl.dateTo as "dateTo", ip.orderN  as "orderN"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE ip.orgID = :orgID: and lp.code = 'СardEmployeeNumberFixed' and ip.mi_deleteDate >= '9999-12-31' 
    ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  const paramPayElsFixed = idParamStore.getAsJsObject()

  const paramPayEls = []
  paramPayEls.push(...paramPayElsPrm)
  paramPayEls.push(...paramPayElsDop)

  idParamStore.runSQL(`SELECT ip.ID as "ipID", pl.ID as "payElID", pl.name, pl.dateFrom as "dateFrom", pl.dateTo as "dateTo" 
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE ip.orgID = :orgID: and lp.code = 'СardEmployeeNumberVac' and ip.mi_deleteDate >= '9999-12-31'  
    ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  const paramVacPayEls = idParamStore.getAsJsObject()
  const paramVacPayElIDs = paramVacPayEls.map(el => el.payElID)

  let fixTable2ColCount = 6
  let cellTable2Width = 80
  const sheetWidth = 1400

  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodTo })
      .selectSingle()
    if (params.includeSubDep) {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', periodTo)
        .where('mi_dateTo', '>=', periodTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id).join(', ')
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }

  let deptWhere = deptIDs ? ` and ep.departmentID in (${deptIDs}) ` : ''
  let empClause = params.employeeNumberID ? `and en.ID = ${params.employeeNumberID} ` : ''
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true

  // данные сотрудника по последнему назначению в году
  const empPositionDS = UB.DataStore('hr_employeePosition')
  const sql = `SELECT en.ID as "employeeNumberID"
      ,en.tabNum as "tabNum"
      ,en.employeeID as "employeeID"
      ,en.dateFrom as "dateFrom"
      ,en.dateTo as "dateTo"
      ,ep.ID as "employeePositionID" 
      ,emp.lastName as "lastName" 
      ,emp.firstName as "firstName"
      ,emp.middleName as "secondName" 
      ,emp.birthDate as "birthDate"
      ,emp.taxCode as "taxCode" 
      ,ep.accrualSum as "accrualSum"
      ,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "position" 
      ,dep.caption as "departmentName" 
      ,${sqlDialect.scheme}depNamePath(ep.departmentID, :dateTo:, :orgID:, '}{') as "depTree" 
      ,(select ${sqlDialect.top} edl.nominalName from hr_employeeEducation edu 
      join hr_dictEducationLevel edl on edl.ID = edu.dictEducationLevelID and edl.mi_deleteDate >= '9999-12-31'
      where edu.employeeID = en.employeeID and edu.dateTo <= :dateTo: and edu.mi_deleteDate >= '9999-12-31' order by edu.dateTo desc ${sqlDialect.limit}) as "education" 
      ,${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + concat('з ', FORMAT(bon.docIssuedDate, 'dd.MM.yyyy', 'en-US'), ' - ', dictBon.name) from hr_employeeBonus bon  
       join hr_dictBonus dictBon on dictBon.ID = bon.dictBonusID and dictBon.mi_deleteDate >= '9999-12-31' 
       join hr_dictBonusKind dbk on dbk.ID = dictBon.bonusKindID and dbk.mi_deleteDate >= '9999-12-31' 
      where bon.employeeID = en.employeeID and bon.docIssuedDate <= :dateTo: and dbk.code = '10' and bon.mi_deleteDate >= '9999-12-31' FOR XML PATH('')), 1, 1, '')`
    : `(SELECT STRING_AGG(concat('з ', to_char(bon.docIssuedDate, 'DD.MM.YYYY'), ' - ', dictBon.name), ', ') from hr_employeeBonus bon  
       join hr_dictBonus dictBon on dictBon.ID = bon.dictBonusID and dictBon.mi_deleteDate >= '9999-12-31' 
       join hr_dictBonusKind dbk on dbk.ID = dictBon.bonusKindID and dbk.mi_deleteDate >= '9999-12-31' 
      where bon.employeeID = en.employeeID and bon.docIssuedDate <= :dateTo: and dbk.code = '10' and bon.mi_deleteDate >= '9999-12-31')`} as "bonus"  
      ,(select ${sqlDialect.top} concat('з ', ${sqlDialect.dialect === 'MSSQL2012' ? `FORMAT(rs.docDate, 'dd.MM.yyyy', 'en-US' )` : `to_char(rs.docDate, 'DD.MM.YYYY')`}, ' - ', dd.name) from hr_empRangeScience rs  
      join hr_dictDegree dd on dd.ID = rs.dictDegreeID and dd.mi_deleteDate >= '9999-12-31' 
      where rs.employeeID = en.employeeID 
      and rs.docDate <= :dateTo: and rs.mi_deleteDate >= '9999-12-31' order by rs.docDate desc ${sqlDialect.limit}) as "rangeScience" 
      
      ,${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + dis.description 
      from hr_employeeDisability dis      
      where dis.employeeID = en.employeeID and dis.dateFrom <= :dateTo: and dis.dateTo >= :dateFrom: and dis.mi_deleteDate >= '9999-12-31' 
      order by dis.dateFrom FOR XML PATH('')), 1, 1, '')`
    : `(SELECT STRING_AGG(dis.description, ', ') from hr_employeeDisability dis      
      where dis.employeeID = en.employeeID and dis.dateFrom <= :dateTo: and dis.dateTo >= :dateFrom: and dis.mi_deleteDate >= '9999-12-31' 
      group by dis.dateFrom order by dis.dateFrom)`} as "disability" 
      , case when emp.pensionDate is not null and emp.pensionDate < '9999-12-31' then concat('з ', ${sqlDialect.dialect === 'MSSQL2012' ? `FORMAT( emp.pensionDate, 'dd.MM.yyyy', 'en-US' )` : `to_char(emp.pensionDate, 'DD.MM.YYYY')`}, ' ', 
      (select ${sqlDialect.top} pt.name from hr_dictPensionType pt where pt.ID = emp.pensionTypeID and pt.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) ) 
      else '' end as "pension" 
      
      ,en.appointmentOrderDate as "appointmentOrderDate"
      ,en.appointmentOrderNumber as "appointmentOrderNumber"
      ,ord.orderNumber as "orderNumber"
      ,ord.orderDate as "orderDate"
      ,(select ${sqlDialect.top} dictPos.name from hr_dictPosition dictPos where dictPos.ID = ep.dictPositionID and dictPos.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as "dictPosName"
      ,workPlace 
      FROM hr_employeeNumber en 
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31'   
      INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and 
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1 
       and ep2.dateFrom <= :dateTo: and ep2.dateTo >= :dateFrom: 
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit})   
      LEFT JOIN hr_position pos ON pos.ID = (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ  where posSubQ.mi_data_id = ep.positionID   
      and posSubQ.state = 'ACTIVE' and posSubQ.mi_deleteDate >= '9999-12-31'  order by posSubQ.mi_dateFrom desc ${sqlDialect.limit}) 
      LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID')} 
      LEFT JOIN hr_order ord on ord.ID = en.orderID and ord.mi_deleteDate >= '9999-12-31' 
      WHERE en.orgID = :orgID: 
      and en.mi_deleteDate >= '9999-12-31' 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      ${deptWhere} 
      ${empClause} 
      ORDER BY emp.lastName, emp.firstName`
  empPositionDS.runSQL(sql, {
    orgID: params.orgID,
    dateTo: periodTo,
    dateFrom: periodFrom
  })

  let cards = empPositionDS.getAsJsObject()

  let arrEnIDs = cards.map(en => en.employeeNumberID)

  const plurals = []
  cards.forEach(emp => {
    if (emp.workPlace === '1') {
      const empPlurals = UB.Repository('hr_employeeNumberS')
        .attrs(['ID', 'tabNum'])
        .where('employeeID', '=', emp.employeeID)
        .where('ID', '!=', emp.employeeNumberID)
        .where('orgID', '=', params.orgID)
        .selectAsObject()
      empPlurals.forEach(row => {
        arrEnIDs.push(row.ID)
        plurals.push({ employeeNumberID: emp.employeeNumberID, ID: row.ID, tabNum: row.tabNum })
      })
    }
  })
  // 2 все призначення на год для каждого сотрудника
  empPositionDS.runSQL(`SELECT ep.employeeNumberID as "employeeNumberID"
    ,ep.ID as "employeePositionID"
    ,ep.dictPositionID as "dictPositionID" 
    ,ep.dateFrom as "dateFrom"
    ,ep.dateTo as "dateTo" 
    ,ep.workScheduleID as "workScheduleID"
    ,ep.mtCount as "mtCount"
    ,ep.payElID as "payElID" 
    ,ep.accrualSum as "accrualSum"   
    ,ep.departmentID as "departmentID" 
    ,ep.dictPositionID as "dictPositionID"
    ,ep.dictStaffCatID as "dictStaffCatID" 
    ,ep.workPlace as "workPlace" 
    ,ep.workerType as "workerType" 
    ,sc.accCategory as "accCategory"
    ,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "dictPosName"
    ,ord.orderNumber as "orderNumber"
    ,ord.orderDate as "orderDate"
    ,hoc.entityName as "entityName"
    ,ep.orderID as "orderID"
    ,ep.changeOrderID as "changeOrderID"
    ,${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'caption')} as "departmentName"
    ,dtc.code as "dictTarifCoeffCode"
    FROM hr_employeePosition ep 
    JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID and en.mi_deleteDate >= '9999-12-31'
    JOIN hr_employee emp ON emp.ID = ep.employeeID and emp.mi_deleteDate >= '9999-12-31' 
    LEFT JOIN hr_dictStaffCat sc ON sc.ID = ep.dictStaffCatID
    LEFT JOIN hr_dictPosition dictPos ON dictPos.ID = ep.dictPositionID
    LEFT JOIN hr_order ord ON ord.ID = ep.orderID and ord.mi_deleteDate >= '9999-12-31'  
    LEFT JOIN hr_orderClass hoc ON ord.orderClass = hoc.ID and hoc.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictTarifCoeff dtc ON dtc.ID =  ep.dictTarifCoeffID and dtc.mi_deleteDate >= '9999-12-31'  
    WHERE ep.organizationID = :orgID: and ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31' 
    ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
     ${arrEnIDs.length ? ` and ep.employeeNumberID${entityBaseService.getInExpression('arrEnIDs')}` : ''}
    ORDER BY ep.employeeNumberID, ep.dateFrom`
  , {
    orgID: params.orgID,
    arrEnIDs,
    dateTo: periodTo,
    dateFrom: periodFrom
  })
  let allEmpPositionsNoGroup = empPositionDS.getAsJsObject()

  const dictSalaryRank = UB.Repository('hr_dictSalaryRank')
    .attrs(['ID', 'dictRankID', 'paySum', 'dateFrom', 'dateTo'])
    .orderBy('dateFrom')
    .selectAsObject()
  dictSalaryRank.forEach(o => {
    o.dateFrom = dateService.shiftDate(o.dateFrom)
    o.dateTo = dateService.shiftDate(o.dateTo)
  })
  const employeeIDs = cards.map(en => en.employeeID)
  const publServRang = UB.Repository('hr_publServRang')
    .attrs(['ID', 'dictRankID', 'dateFrom', 'dateTo', 'employeeID'])
    .where('employeeID', 'in', employeeIDs)
    .orderBy('dateFrom')
    .selectAsObject()

  // объединить одинаковые назначения, подразделение Посада Оклад, идущие подряд
  cards.forEach(card => {
    const empNumberList = [card.employeeNumberID]
    plurals.filter(o => o.employeeNumberID === card.employeeNumberID).forEach(o => {
      empNumberList.push(o.ID)
    })
    card.employeePositions = []
    empNumberList.forEach(empNumberID => {
      const employeePosition = allEmpPositionsNoGroup.filter(o => o.employeeNumberID === empNumberID)
      employeePosition.forEach(pos => {
        pos.dateFrom = dateService.shiftDate(pos.dateFrom)
        pos.dateTo = dateService.shiftDate(pos.dateTo)
        if (pos.dateFrom <= periodTo && pos.dateTo >= periodFrom) {
          if (!card.employeePositions.length || card.employeePositions[card.employeePositions.length - 1].accrualSum !== pos.accrualSum ||
            card.employeePositions[card.employeePositions.length - 1].mtCount !== pos.mtCount ||
            card.employeePositions[card.employeePositions.length - 1].payElID !== pos.payElID ||
            card.employeePositions[card.employeePositions.length - 1].departmentID !== pos.departmentID ||
            card.employeePositions[card.employeePositions.length - 1].dictPositionID !== pos.dictPositionID
          ) {
            if (pos.workPlace === '2') {
              const tmpDateFrom = dateService.shiftDate(pos.dateFrom)
              const tmpDateTo = dateService.shiftDate(pos.dateTo)
              const cardPos = card.employeePositions.find(o => o.dateFrom <= tmpDateFrom && tmpDateTo <= o.dateTo &&
                o.departmentID === pos.departmentID && o.dictPositionID === pos.dictPositionID)
              if (!cardPos) {
                card.employeePositions.push(Object.assign(pos, {
                  dateFrom: tmpDateFrom,
                  dateTo: tmpDateTo,
                  'dictStaffCatID.accCategory': pos.accCategory
                }))
              }
            } else {
              card.employeePositions.push(Object.assign(pos, {
                dateFrom: dateService.shiftDate(pos.dateFrom),
                dateTo: dateService.shiftDate(pos.dateTo),
                'dictStaffCatID.accCategory': pos.accCategory
              }))
            }
          } else {
            card.employeePositions[card.employeePositions.length - 1].dateTo = dateService.shiftDate(Math.min(periodTo, pos.dateTo))
          }
        }
      })
    })
  })
  if (cards && cards.length > 0 && arrEnIDs && arrEnIDs.length > 0) {
    const cont = {
      orgID: params.orgID,
      org: orgService.getOrgData(params.orgID),
      payEl: payElService.getPayEl({ orgID: params.orgID }),
      payFund: payFundService.getPayFund(),
      periods: periodService.getArrayPeriods(params.orgID, periodFrom),
      emp: {}
    }
    contService.initDict(cont)
    cards.forEach((card, ind) => {
      card.orgName = hrOrg.name
      card.year = params.year
      card.department = [{ depPart: '' }, { depPart: '' }]
      if (card.depTree) {
        card.depTree.split('}{').forEach((el, ind) => {
          ind < 2 ? card.department[ind].depPart = el : card.department.push({ depPart: el })
        })
      }
      const empNumberList = [card.employeeNumberID]
      plurals.filter(o => o.employeeNumberID === card.employeeNumberID).forEach(o => {
        empNumberList.push(o.ID)
      })
      cont.employeeNumberID = card.employeeNumberID
      empNumberList.forEach(employeeNumberID => {
        cont.emp[employeeNumberID] = {}
        cont.emp[employeeNumberID].prop = {
          employeeNumber: {
            dateFrom: dateService.shiftDate(card.dateFrom),
            startWork: dateService.shiftDate(card.dateFrom),
            dateTo: dateService.shiftDate(card.dateTo),
            finishWork: dateService.shiftDate(card.dateTo),
            employeeID: card.employeeID,
            workPlace: card.workPlace
          },
          employeePositions: card.employeePositions.filter(o => o.employeeNumberID === employeeNumberID),
          employeeAccruals: UB.Repository('hr_employeeAccrual')
            .attrs(['ID', 'employeeID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'accrualRate', 'missingEmployeeNumberID',
              'orderID', 'orderID.orderNumber', 'orderNumber'])
            .where('employeeNumberID', '=', employeeNumberID)
            .where('dateFrom', '<=', periodTo)
            .where('dateTo', '>=', periodFrom)
            .where('payElID', 'in', paramPayElIDs.length ? paramPayElIDs : [0])
            .orderBy('dateFrom')
            .selectAsObject(),
          payPermDisable: UB.Repository('hr_payPermDisable')
            .attrs(['payPermID', 'employeeNumberID'])
            .where('employeeNumberID', '=', employeeNumberID)
            .selectAsObject(),
          employeeRetentions: [],
          workBookDet: UB.Repository('hr_employeeWorkbookDt')
            .attrs(['ID', 'dateFrom', 'dateTo', 'dictExperienceID', 'coefficient'])
            .where('employeeWorkbookID.employeeID', '=', card.employeeID)
            .orderBy('dateFrom')
            .selectAsObject(),
          experience: [],
          timeSheets: [],
          salaryRank: []
        }
      })

      publServRang.filter(o => o.employeeID === card.employeeID).forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        const salaryRank = dictSalaryRank.filter(o => o.dictRankID === row.dictRankID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
        salaryRank.forEach(rank => {
          empNumberList.forEach(employeeNumberID => {
            cont.emp[employeeNumberID].prop.salaryRank.push({
              ID: row.ID,
              dictRankID: row.dictRankID,
              paySum: rank.paySum,
              dateFrom: rank.dateFrom >= row.dateFrom ? rank.dateFrom : row.dateFrom,
              dateTo: rank.dateTo <= row.dateTo ? rank.dateTo : row.dateTo
            })
          })
        })
      })

      card.dateFrom = card.dateFrom ? dateService.formatDate(card.dateFrom) : ''
      card.birthDate = card.birthDate ? dateService.formatDate(card.birthDate) : ''
      card.workStart = UB.i18n(`{0} Нак. {1}`, card.dateFrom, formatOrderNumber(card.appointmentOrderNumber || card.orderNumber, card.appointmentOrderDate || card.orderDate))

      // employeeChange
      const employeeChange = UB.Repository('hr_employeeChange')
        .attrs(['firstNameOld', 'lastNameOld', 'middleNameOld'])
        .where('employeeID', '=', card.employeeID)
        .where('orderDate', '<=', periodTo)
        .where('orderDate', '>=', periodFrom)
        .orderBy('orderDate', 'desc')
        .selectSingle()
      if (employeeChange) {
        card.firstNameOld = employeeChange.firstNameOld !== card.firstName ? employeeChange.firstNameOld : ''
        card.lastNameOld = employeeChange.lastNameOld !== card.lastName ? employeeChange.lastNameOld : ''
        card.secondNameOld = employeeChange.middleNameOld !== card.secondName ? employeeChange.middleNameOld : ''
      } else {
        card.firstNameOld = ''
        card.lastNameOld = ''
        card.secondNameOld = ''
      }

      empNumberList.forEach(employeeNumberID => {
        cont.emp[employeeNumberID].prop.employeeAccruals.forEach(row => {
          row.dateFrom = dateService.shiftDate(row.dateFrom)
          row.dateTo = dateService.shiftDate(row.dateTo)
        })
        cont.emp[employeeNumberID].prop.workBookDet.forEach(row => {
          row.dateFrom = dateService.shiftDate(row.dateFrom)
          row.dateTo = dateService.shiftDate(row.dateTo)
        })
        const experience = UB.Repository('hr_employeeExperience')
          .attrs(['ID', 'dictExperienceID', 'calcDate', 'employeeNumberID', 'startCalcDate'])
          .where('employeeID', '=', card.employeeID)
          .where('employeeNumberID', '=', employeeNumberID, 'empNum')
          .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
          .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
          .logic('([empNum] OR [empNumNull])')
          .orderBy('dictExperienceID')
          .orderBy('employeeNumberID')
          .selectAsObject()
        experience.forEach(row => {
          if (row.employeeNumberID || !experience.find(o => o.dictExperienceID === row.dictExperienceID && !!o.employeeNumberID)) {
            row.calcDate = dateService.shiftDate(row.calcDate)
            cont.emp[employeeNumberID].prop.experience.push(row)
          }
        })
      })
      // Стаж
      const onExpDate = globalDate > periodTo ? periodTo : globalDate < periodFrom ? periodFrom : globalDate
      let exp = experienceService.calculateExperience(card.employeeNumberID, params.dictExperienceID, onExpDate, null, false, cont)
      card.exp = exp ? UB.i18n(`На {0} {1}р. {2}м. {3}дн.`, dateService.formatDate(onExpDate), exp.years, exp.months, exp.days) : ''

      if (ind !== cards.length - 1) card.isPageBreak = true
      if (paramPayElIDs.length) {
        empNumberList.forEach(employeeNumberID => {
          const empDateFrom = dateService.shiftDate(Math.min(...cont.emp[employeeNumberID].prop.employeePositions.map(o => o.dateFrom)))
          const empDateTo = dateService.shiftDate(Math.max(...cont.emp[employeeNumberID].prop.employeePositions.map(o => o.dateTo)))
          cont.emp[employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(params.orgID, employeeNumberID, cont,
            { dateFrom: empDateFrom, dateTo: empDateTo }, ['4', '5', '6', '12'], paramPayElIDs, true)
          for (let i = cont.emp[employeeNumberID].permanentAccrual.length - 1; i >= 0; i--) {
            const currPermAccrual = cont.emp[employeeNumberID].permanentAccrual[i]
            const priorDateTo = dateService.addDays(currPermAccrual.dateFrom, -1).getTime()
            const priorPermAccrual = cont.emp[employeeNumberID].permanentAccrual.find(o =>
              o.payElID === currPermAccrual.payElID && o.baseSum === currPermAccrual.baseSum && o.rate === currPermAccrual.rate &&
              o.dateTo.getTime() === priorDateTo
            )
            if (priorPermAccrual) {
              priorPermAccrual.dateTo = currPermAccrual.dateTo
              cont.emp[employeeNumberID].permanentAccrual.splice(i, 1)
            }
          }
          const newAccruals = []
          cont.emp[employeeNumberID].permanentAccrual.forEach(row => {
            if (cont.payEl[row.payElID].method.code === '6') {
              const experienceFrom = algorithmService.getExpiriencePeriods(cont, row.payElID, row.dateFrom, row.dateFrom)
              const experienceTo = algorithmService.getExpiriencePeriods(cont, row.payElID, row.dateTo, row.dateTo)
              let rateFrom = experienceFrom.length ? experienceFrom[0].rate : 0
              let rateTo = experienceTo.length ? experienceTo[0].rate : 0
              row.rate = rateFrom
              if (rateFrom !== rateTo) {
                // ищем период, когда меняется надбавка
                let dateFrom = dateService.firstDayOfMonth(dateService.addMonths(row.dateFrom), 1)
                while (dateFrom < row.dateTo) {
                  const dateTo = dateService.addDays(dateService.addMonths(dateFrom, 1), -1)
                  const experience = algorithmService.getExpiriencePeriods(cont, row.payElID, dateFrom, dateTo)
                  if (experience.length) {
                    experience.forEach(exp => {
                      const rate = exp.rate
                      if (rate !== rateFrom) {
                        rateFrom = rate
                        const newPerAccrual = {}
                        Object.assign(newPerAccrual, row)
                        newPerAccrual.dateFrom = exp.dateFrom
                        newPerAccrual.rate = rate
                        newPerAccrual.orderNumber = ''
                        row.dateTo = dateService.addDays(exp.dateFrom, -1)
                        newAccruals.push(newPerAccrual)
                      }
                    })
                  }
                  dateFrom = dateService.addMonths(dateFrom, 1)
                }
              }
            }
            if (cont.payEl[row.payElID].method.code === '5' && !row.accrualSum) {
              const rankPeriod = cont.emp[employeeNumberID].prop.salaryRank.filter(o => o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
              rankPeriod.forEach(rank => {
                if (rank.dateFrom > row.dateFrom && rank.dateFrom < row.dateTo) {
                  const newPerAccrual = {}
                  Object.assign(newPerAccrual, row)
                  newPerAccrual.dateFrom = rank.dateFrom
                  newPerAccrual.orderNumber = ''
                  row.dateTo = dateService.addDays(rank.dateFrom, -1)
                  newAccruals.push(newPerAccrual)
                }
              })
            }
          })
          cont.emp[employeeNumberID].permanentAccrual.push(...newAccruals)
        })

        const accRows = [] // строки периодов
        card.payEls = []
        empNumberList.forEach(employeeNumberID => {
          cont.emp[employeeNumberID].prop.employeePositions.forEach(row => {
            const permanentAccrual = cont.emp[employeeNumberID].permanentAccrual.filter(o =>
              (o.dateFrom > row.dateFrom && o.dateFrom < row.dateTo) || (o.dateTo > row.dateFrom && o.dateTo < row.dateTo)
            )
            accRows.push({
              dateFrom: row.dateFrom,
              dateTo: row.dateTo,
              accID: null,
              payElID: row.payElID,
              paySum: null,
              rate: null,
              epID: row.employeePositionID,
              employeeNumberID,
              workPlace: row.workPlace,
              departmentName: row.departmentName,
              dictPosName: `${row.dictPosName}${(row.mtCount && row.mtCount !== 1) ? ` (${row.mtCount} ${UB.i18n('ст')})` : ''}`,
              dictTarifCoeffCode: row.dictTarifCoeffCode,
              accrualSum: row.accrualSum,
              orderNumber: row.orderNumber,
              orderDate: row.orderDate
            })
            if (permanentAccrual.length) {
              const accrualPeriods = []
              permanentAccrual.forEach(acc => {
                if (acc.dateFrom > row.dateFrom && acc.dateFrom < row.dateTo && !accrualPeriods.find(o => o.dateFrom.getTime() === acc.dateFrom.getTime())) {
                  accrualPeriods.push({
                    dateFrom: acc.dateFrom,
                    accID: acc.ID,
                    payElID: acc.payElID
                  })
                }
                if (acc.dateTo > row.dateFrom && acc.dateTo < row.dateTo && !accrualPeriods.find(o => o.dateFrom.getTime() === dateService.addDays(acc.dateTo, 1).getTime())) {
                  accrualPeriods.push({
                    dateFrom: dateService.addDays(acc.dateTo, 1),
                    accID: acc.ID,
                    payElID: acc.payElID
                  })
                }
              })
              accrualPeriods.sort((a, b) => a.dateFrom > b.dateFrom ? 1 : -1).forEach((p, idx) => {
                if (idx === 0 && accRows.length) {
                  accRows[accRows.length - 1].dateTo = dateService.addDays(p.dateFrom, -1)
                }
                accRows.push({
                  dateFrom: p.dateFrom,
                  dateTo: p.dateTo,
                  accID: p.accID,
                  payElID: row.payElID,
                  epID: row.employeePositionID,
                  employeeNumberID,
                  workPlace: row.workPlace,
                  dictTarifCoeffCode: row.dictTarifCoeffCode,
                  departmentName: row.departmentName,
                  dictPosName: `${row.dictPosName}${(row.mtCount && row.mtCount !== 1) ? ` (${row.mtCount} ${UB.i18n('ст')})` : ''}`,
                  accrualSum: row.accrualSum,
                  orderNumber: '',
                  orderDate: null
                })
              })
            }
          })

          cont.emp[employeeNumberID].permanentAccrual.forEach(row => {
            if (!card.payEls.find(o => o.payElID === row.payElID)) {
              const paramPayEl = paramPayEls.find(o => o.payElID === row.payElID)
              card.payEls.push({
                payElID: row.payElID,
                name: cont.payEl[row.payElID].name,
                orderN: paramPayEl ? paramPayEl.orderN : 0
              })
            }
          })
        })
        paramPayElsFixed.forEach(el => {
          const cardPayEl = card.payEls.find(o => o.payElID === el.payElID)
          if (!cardPayEl) {
            const paramPayEl = paramPayEls.find(o => o.payElID === el.payElID)
            card.payEls.push({
              payElID: el.payElID,
              name: el.name,
              orderN: paramPayEl ? paramPayEl.orderN : 0
            })
          }
        })

        card.payEls.sort((a, b) => a.orderN - b.orderN)
        // к каждой строке присоединить набор надбавок  и высчитать плановую сумму для каждой надбавки
        accRows.forEach((row, ind) => {
          row.bold = 1
          row.acc = []
          row.totalSum = row.accrualSum || 0
          card.payEls.forEach((pl, ind) => {
            const leftBorder = pl.orderN > 1000000 && ind > 0 && card.payEls[ind - 1].orderN < 1000000 ? 2 : 1
            pl.leftBorder = leftBorder
            const perAccr = cont.emp[row.employeeNumberID].permanentAccrual.find(o => o.payElID === pl.payElID && o.dateFrom <= row.dateFrom && row.dateFrom <= o.dateTo)
            if (perAccr) {
              if (perAccr.baseSum) {
                row.acc.push({ rate: '', sum: currencyService.formatAsCurrency(perAccr.baseSum), rightBorder: 0 })
                row.totalSum = currencyService.round(row.totalSum + perAccr.baseSum)
              } else {
                if (cont.payEl[perAccr.payElID].method.code === '5') {
                  const planSum = algorithmService.getPlanSum(row.dateFrom, cont, perAccr, row, cont.emp[row.employeeNumberID].permanentAccrual, false, [], false)
                  const baseSum = currencyService.round(planSum || 0)
                  row.totalSum = currencyService.round(row.totalSum + baseSum)
                  row.acc.push({
                    rate: '',
                    sum: baseSum !== 0 ? currencyService.formatAsCurrency(baseSum) : null,
                    rightBorder: 0,
                    leftBorder
                  })
                } else {
                  const planSum = algorithmService.getPlanSum(row.dateFrom, cont, perAccr, row, cont.emp[row.employeeNumberID].permanentAccrual, false, [], false)
                  const baseSum = currencyService.round((planSum || 0) * ((perAccr.rate || 0) / 100))
                  row.totalSum = currencyService.round(row.totalSum + baseSum)
                  row.acc.push({
                    rate: perAccr.rate ? perAccr.rate + '%' : '',
                    sum: baseSum !== 0 ? currencyService.formatAsCurrency(baseSum) : null,
                    rightBorder: 1,
                    leftBorder
                  })
                }
              }
            } else {
              row.acc.push({ rate: '-', sum: null, rightBorder: 0, leftBorder })
            }
          })
          row.accrualSum = row.accrualSum ? currencyService.formatAsCurrency(currencyService.round(row.accrualSum, 2)) : null
          row.totalSum = currencyService.formatAsCurrency(row.totalSum)
          row.dateFromStr = dateService.isMinDate(row.dateFrom) ? '' : dateService.formatDate(row.dateFrom)
          row.dateToStr = dateService.isMaxDate(row.dateTo) ? '' : dateService.formatDate(row.dateTo)
          let tabNum = UB.i18n(`(осн {0})`, card.tabNum)
          if (row.workPlace === '2') {
            const sec = plurals.find(o => o.ID === row.employeeNumberID)
            tabNum = sec ? UB.i18n(`(сум {0})`, sec.tabNum) : ''
          }
          row.orderDescription = `${formatOrderNumber(row['orderNumber'], row['orderDate'])} ${tabNum}`
        })
        card.accRows = accRows.sort((a, b) => a.dateFrom > b.dateFrom ? 1 : -1)

        if (card.accRows.length) {
          card.accRows[card.accRows.length - 1].bold = 2
        }

        let table2ColCount = fixTable2ColCount + card.payEls.length * 2 + 2
        let fixedTable2Width = 120 + 60 + 60 + 150 + 150 + 50 + 80

        let workStartColSpan = 6
        let dictPosNameColSpan = 2

        card.table2Width = Math.max(fixedTable2Width + (30 + 70) * card.payEls.length + table2ColCount * 5, sheetWidth)

        card.detDynT2ColWidth = Math.trunc((card.table2Width - fixedTable2Width) / (card.payEls.length * 2))
        card.dynT2ColWidth = 100 // Math.min(Math.max(card.detDynT2ColWidth * 2, 100), 100)
        card.leftDynT2ColWidth = 30 // Math.max(Math.trunc(card.dynT2ColWidth * 0.3), 30)
        card.rightDynT2ColWidth = 70 // Math.max(card.dynT2ColWidth - card.leftDynT2ColWidth, 70)

        if (card.payEls.length) {
          dictPosNameColSpan += card.payEls.length * 2
        }

        card.table2ColCount = table2ColCount
        card.cellTable2Width = cellTable2Width
        card.workStartColSpan = workStartColSpan
        card.dictPosNameColSpan = dictPosNameColSpan
      }
      const vacations = []
      card.vacations = []
      if (paramVacPayElIDs.length) {
        const vacList = UB.Repository('hr_accrual')
          .attrs(['orderID', 'orderDtID', 'empOrderID', 'flagsRec', 'sourceID', 'dateFrom', 'dateTo', 'days', 'sum([paySum])', 'payElID.description'])
          .where('periodCalcID.pYear', '=', params.year)
          .where('employeeNumberID', '=', card.employeeNumberID)
          // .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .where('payElID', 'in', paramVacPayElIDs)
          .groupBy(['orderID', 'orderDtID', 'empOrderID', 'flagsRec', 'sourceID', 'dateFrom', 'dateTo', 'days', 'payElID.description'])
          .orderBy('dateFrom', 'asc')
          .selectAsObject({
            'sum([paySum])': 'paySum'
          })
        vacList.forEach(vac => {
          const vacDetID = UB.Repository('hr_orderRegistryDt').attrs('empOrderDetID').where('ID', '=', vac.orderDtID).selectScalar()
          let vacPeriod = ''
          if (vacDetID) {
            const vacPeriodPara = UB.Repository('hr_empOrderVacationListDet').attrs(['empVacationPeriodID.description']).selectById(vacDetID)
            vacPeriod = vacPeriodPara ? vacPeriodPara['empVacationPeriodID.description'] : ''
          }
          let vacSourceID = vac.empOrderID || vac.orderID
          if ((vac.flagsRec || 0) & 1 << 9) {
            if (vac.sourceID) {
              vacSourceID = vac.sourceID
            } else {
              // try to get sourceID from tim_timeSheet
              const tsRevoke = UB.Repository('tim_timeSheet')
                .attrs('changeOrderID')
                .where('orderID', '=', vac.empOrderID || vac.orderID)
                .where('isCanceled', '=', 1)
                .selectSingle()
              if (tsRevoke && tsRevoke.changeOrderID) {
                vacSourceID = tsRevoke.changeOrderID
              }
            }
          }
          const sourceOrder = UB.Repository('hr_order')
            .attrs(['orderDate', 'orderNumber'])
            .selectById(vacSourceID) || {}
          let orderDate = dateService.shiftDate(sourceOrder['orderDate'])

          vacations.push({
            order: UB.i18n(`Нак. {0}`, formatOrderNumber(sourceOrder['orderNumber'], orderDate)),
            dateFrom: dateService.formatDate(dateService.shiftDate(vac['dateFrom'])),
            dateTo: dateService.formatDate(dateService.shiftDate(vac['dateTo'])),
            period: vacPeriod,
            days: vac.days,
            payEl: vac['payElID.description'],
            paySumMain: ((vac.flagsRec || 0) & 1 << 12) ? 0 : vac.paySum,
            paySumSec: ((vac.flagsRec || 0) & 1 << 12) ? vac.paySum : 0,
            bold: 1
          })
        })
        vacations.forEach(row => {
          const cv = card.vacations.find(o => o.orderDate === row.orderDate && o.orderNumber === row.orderNumber && o.dateFrom === row.dateFrom &&
            o.dateTo === row.dateTo && o.period === row.period && o.days === row.days && o.payEl === row.payEl)
          if (cv) {
            cv.paySumMain += row.paySumMain
            cv.paySumSec += row.paySumSec
          } else {
            card.vacations.push(row)
          }
        })
        if (card.vacations.length) {
          card.vacations[card.vacations.length - 1].bold = 2
        }
        card.vacations.forEach(row => {
          row.paySumMain = row.paySumMain !== 0 ? currencyService.formatAsCurrency(row.paySumMain) : null
          row.paySumSec = row.paySumSec !== 0 ? currencyService.formatAsCurrency(row.paySumSec) : null
        })
      }

      // Деталі наказів з персоналу працівника
      const empOrderTypeList = ['BONUS', 'APPOINT', 'DISM', 'MOVE', 'BOUNTY_HELP', 'MISSION', 'MISSION_TRAINING', 'CWS',
        'VACATIONREVOKE', 'VACATIONPROLONG', 'VACATIONLONG', 'VACATIONRET', 'ADDSALARY', 'ADDSALARYGOV', 'TRAINING',
        'CWSHD', 'CWSRELAXDONOR', 'CANCELLATION', 'ADDPAY', 'CHGEMPLOYEE', 'PLURALIST', 'CWSWORKHOUR', 'VACATIONCOMP',
        'RISKPAY', 'VACATION', 'BOUNTY'
      ]
      const skipEntityList = ['hr_empOrderVacationprolongDet', 'hr_empOrderVacationListDet']
      card.orders = []
      const empOrderDet = UB.Repository('hr_empOrderDet')
        .attrs(['ID', 'paraID', 'orderID.orderNumber', 'orderID.orderDate', 'empOrderType', 'description', 'mi_unityEntity',
          'dateFrom', 'dateTo', 'employeeNumberID.tabNum', 'employeePositionID.workPlace'])
        .where('employeeNumberID', 'in', empNumberList)
        .where('empOrderType', 'in', empOrderTypeList)
        .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
        .where('orderID.orderDate', '>=', params.periodFrom, 'orderdatefrom')
        .where('orderID.orderDate', '<=', params.periodTo, 'orderdateto')
        .where('dateFrom', '>=', params.periodFrom, 'orderfrom')
        .where('dateFrom', '<=', params.periodTo, 'orderto')
        .where('orderID.periodCalcID.pYear', '=', params.year, 'period')
        .where('mi_unityEntity', 'notIn', skipEntityList)
        .logic('(([orderdatefrom] AND [orderdateto]) OR ([orderfrom] AND [orderto]) OR [period])')
        .orderBy('orderID.orderDate')
        .selectAsObject({
          'orderID.orderNumber': 'orderNumber',
          'orderID.orderDate': 'orderDate',
          'employeeNumberID.tabNum': 'tabNum',
          'employeePositionID.workPlace': 'workPlace'
        })
      empOrderDet.forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        let text = ''
        let para
        let strDateTo = ''
        let empSalDet
        let period = ''
        let strYear = ''
        switch (row.empOrderType) {
          case 'BONUS':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['bonusID.name'])
              .selectById(row.paraID) || {}
            text = 'про нагородження ' + (para['bonusID.name'] || '')
            break
          case 'APPOINT':
          case 'PLURALIST':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['positionID.name', 'departmentID.name', 'dateFrom'])
              .selectById(row.paraID) || {}
            text = UB.i18n(`про призначення на посаду {0} {1} з {2}`, para['positionID.name'] || '', para['departmentID.name'] || '', dateService.formatDate(para['dateFrom']))
            break
          case 'DISM':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['dateFrom', 'dictReasonDismID.name'])
              .selectById(row.paraID) || {}
            text = UB.i18n(`про звільнення з {0} {1}`, dateService.formatDate(para['dateFrom']), para['dictReasonDismID.name'] || '')
            break
          case 'MOVE':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['positionID.name', 'departmentID.name', 'dateFrom'])
              .selectById(row.paraID) || {}
            text = UB.i18n(`про переведення на посаду {0} {1} з {2}`, para['positionID.name'] || '', para['departmentID.name'] || '', dateService.formatDate(para['dateFrom']))
            break
          case 'BOUNTY_HELP':
            para = UB.Repository('hr_empOrderBountyDet')
              .attrs(['payType', 'bountySum', 'payElID.name', 'payElID.printName'])
              .selectById(row.paraID) || {}
            let unitName = 'грн'
            let value = currencyService.round(para.bountySum, 2)
            switch (para.payType) {
              case 'AVG':
                unitName = 'середніх заробітків'
                break
              case 'PLAN':
                unitName = 'окладів'
                break
              case 'PRC':
                unitName = '%'
                break
            }
            text = UB.i18n(`про виплату {0} у розмірі {1} {2}`, para['payElID.printName'] || para['payElID.name'] || '', value, unitName)
            break
          case 'MISSION':
            strDateTo = row['dateTo'] && !dateService.isMaxDate(row['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(row['dateTo'])) : ''
            text = UB.i18n(`про направлення у відрядження з {0} {1}`, dateService.formatDate(row['dateFrom']), strDateTo)
            break
          case 'MISSION_TRAINING':
            strDateTo = row['dateTo'] && !dateService.isMaxDate(row['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(row['dateTo'])) : ''
            text = UB.i18n(`про направлення у відрядження на навчання з {0} {1}`, dateService.formatDate(row['dateFrom']), strDateTo)
            break
          /*
          case 'ACTINGORD':
            para = UB.Repository('hr_empOrderActingordDet')
              .attrs(['positionID.name', 'positionID.nameGen', 'dateFrom', 'dateToEmpty'])
              .selectById(row.paraID) || {}
            strDateTo = para['dateToEmpty'] ? UB.i18n(`по {0}`, dateService.formatDate(para['dateToEmpty'])) : ''
            text = UB.i18n(`про виконання обов'язків за посадою {0} з {1} {2}`, para['positionID.nameGen'] || para['positionID.name'] || '', dateService.formatDate(para['dateFrom']), strDateTo)
            break
           */
          case 'VACATIONREVOKE':
            strDateTo = row['dateTo'] && !dateService.isMaxDate(row['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(row['dateTo'])) : ''
            text = UB.i18n(`про відкликання з відпустки з {0} {1}`, dateService.formatDate(row['dateFrom']), strDateTo)
            break
          case 'VACATIONPROLONG':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['dictVacationKindID.name', 'dictVacationKindID.nameGen', 'dayCount'])
              .selectById(row.ID) || {}
            text = UB.i18n(`про продовження {0} на {1} кал. д.`, para['dictVacationKindID.nameGen'] || para['dictVacationKindID.name'] || '', para['dayCount'] || '0')
            break
          case 'VACATIONLONG':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['dictVacationKindID.name', 'dictVacationKindID.nameGen', 'dateFrom', 'dateTo'])
              .selectById(row.ID) || {}
            strDateTo = para['dateTo'] ? UB.i18n(`по {0}`, dateService.formatDate(para['dateTo'])) : ''
            text = UB.i18n(`про надання {0} з {1} {2}`, para['dictVacationKindID.nameGen'] || para['dictVacationKindID.name'] || '', dateService.formatDate(para['dateFrom']), strDateTo)
            break
          case 'VACATIONRET':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['primeVacationParaID.dictVacationKindID.name', 'primeVacationParaID.dictVacationKindID.nameGen', 'dateFrom', 'retPositionID.name'])
              .selectById(row.ID) || {}
            text = UB.i18n(`про вихід з {0} з {1}`, para['primeVacationParaID.dictVacationKindID.nameGen'] || para['primeVacationParaID.dictVacationKindID.name'] || '', dateService.formatDate(para['dateFrom']))
            if (para['retPositionID.name']) text += UB.i18n(` на посаду {0}`, para['retPositionID.name'] || '')
            break
          case 'ADDSALARY':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['newValue', 'accrualRate', 'payElID.name', 'payElID.printName', 'dateFrom', 'dateTo'])
              .selectById(row.ID) || {}
            strDateTo = para['dateTo'] && !dateService.isMaxDate(para['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(para['dateTo'])) : ''
            text = UB.i18n(`про встановлення {0} {1} з {2} {3}`, para['newValue'] ? currencyService.round(para['newValue']) + ' грн' : currencyService.round(para['accrualRate']) + '%', para['payElID.printName'] || para['payElID.name'] || '', dateService.formatDate(para['dateFrom']), strDateTo)
            break
          case 'ADDSALARYGOV':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['newValue', 'payElID.name', 'payElID.printName', 'dateFrom'])
              .selectById(row.ID) || {}
            text = UB.i18n(`про встановлення {0}% {1} з {2}`, currencyService.round(para['newValue']), para['payElID.printName'] || para['payElID.name'] || '', dateService.formatDate(para['dateFrom']))
            break
          case 'TRAINING':
            strDateTo = row['dateTo'] && !dateService.isMaxDate(row['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(row['dateTo'])) : ''
            text = UB.i18n(`про направлення на навчання з {0} {1}`, dateService.formatDate(row['dateFrom']), strDateTo)
            break
          case 'CWS':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['workScheduleID.name', 'dateFrom'])
              .selectById(row.paraID) || {}
            text = UB.i18n(`про встановлення з {0} графіку роботи {1}`, dateService.formatDate(para['dateFrom']), para['workScheduleID.name'])
            break
          case 'CWSHD':
            text = UB.i18n(`про роботу в вихідний день {0}`, dateService.formatDate(row['dateFrom']))
            break
          case 'VEHICLEASSIGN':
            text = UB.i18n(`про закріплення автотранспортного засобу {0}`, dateService.formatDate(row['dateFrom']))
            break
          case 'CWSRELAXDONOR':
            text = UB.i18n(`про надання {0} дня відпочинку за день донорства {1}`, dateService.formatDate(row['dateFrom']), dateService.formatDate(row['dateTo']))
            break
          case 'ADDPAY':
            para = UB.Repository('hr_empOrderAddpayDet')
              .attrs(['isWeekend', 'dateFrom', 'dateTo', 'reason'])
              .selectById(row.paraID) || {}
            if (dateService.formatDate(para['dateFrom']) === dateService.formatDate(para['dateTo'])) {
              period = UB.i18n(`{0} з {1} години до {2} години`, dateService.formatDate(para['dateFrom']), dateService.formatDate(para['dateFrom'], 'hh:nn'), dateService.formatDate(para['dateTo'], 'hh:nn'))
            } else {
              period = UB.i18n(`з {0} до {1}`, dateService.formatDate(para['dateFrom'], 'dd.mm.yyyy hh:nn'), dateService.formatDate(para['dateTo'], 'dd.mm.yyyy hh:nn'))
            }
            text = UB.i18n(`про оплату {0} {1} {2}`, para['isWeekend'] ? 'в подвійному розмірі за роботу у вихідний день' : 'додаткової роботи', period, para['reason'])
            break
          case 'CWSWORKHOUR':
            strDateTo = row['dateTo'] ? dateService.formatDate(row['dateTo']) : ''
            text = UB.i18n(`про зміну тривалості робочого часу з {0} по {1}`, dateService.formatDate(row['dateFrom']), strDateTo)
            break
          case 'VACATIONCOMP':
            text = `про виплату компенсації за невикористані дні відпустки`
            break
          case 'RISKPAY':
            para = UB.Repository('hr_empOrderRiskpayDet')
              .attrs(['payRate', 'payElID.name', 'payElID.printName', 'periodID.name'])
              .selectById(row.paraID) || {}
            empSalDet = UB.Repository(row.mi_unityEntity)
              .attrs(['newValue'])
              .selectById(row.ID) || {}
            text = UB.i18n(`про виплату {0} у розмірі {1}% за {2} годин за {3}`, para['payElID.printName'] || para['payElID.name'] || '', para.payRate || '', empSalDet.newValue || 0, para['periodID.name'])
            break
          case 'BOUNTY':
            const bountyDet = UB.Repository('hr_empOrderBountyDet')
              .attrs(['month', 'quarter', 'year', 'payType'])
              .selectById(row.paraID) || {}
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['newValue', 'accrualRate', 'accrualCount', 'avgCount', 'valuation', 'payElID.name', 'payElID.printName', 'payElID.methodID.code'])
              .selectById(row.ID) || {}
            if (para['payElID.methodID.code'] === '46') {
              period = bountyDet['year'] ? UB.i18n(`{0} рік`, bountyDet['year']) : ''
            } else if (para['payElID.methodID.code'] === '45') {
              let quarter = ''
              switch (bountyDet['quarter'] || bountyDet['month']) {
                case 1:
                  quarter = 'I квартал'
                  break
                case 4:
                  quarter = 'II квартал'
                  break
                case 7:
                  quarter = 'III квартал'
                  break
                case 10:
                  quarter = 'IV квартал'
                  break
              }
              strYear = bountyDet['year'] ? UB.i18n(`{0} року`, bountyDet['year']) : ''
              period = `${quarter} ${strYear}`
            } else {
              const months = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень']
              strYear = bountyDet['year'] ? UB.i18n(`{0} року`, bountyDet['year']) : ''
              period = `${months[(bountyDet['month'] || 0) - 1] || ''} ${strYear}`
            }
            let unit = ''
            let val = ''
            switch (para['valuation']) {
              case 'PRC':
                unit = '%'
                val = currencyService.round(para['accrualRate'], 2)
                break
              case 'SUM':
                unit = 'грн'
                val = currencyService.round(para['newValue'], 2)
                break
              case 'PLAN':
                unit = 'окладів'
                val = para['accrualCount']
                break
              case 'AVG':
                unit = 'середніх заробітків'
                val = para['avgCount']
                break
              default:
                unit = ''
                val = ''
            }
            text = UB.i18n(`про преміювання {0} у розмірі {1} {2} за {3}`, para['payElID.printName'] || para['payElID.name'] || '', val || '', unit || '', period)
            break
          case 'VACATION':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['dateFrom', 'dateTo', 'isMoneyHelp'])
              .selectById(row.ID) || {}
            strDateTo = para['dateTo'] ? UB.i18n(`по {0}`, dateService.formatDate(para['dateTo'])) : ''
            text = UB.i18n(`про надання відпустки з {0} {1}{2}`, dateService.formatDate(para['dateFrom']), strDateTo, para['isMoneyHelp'] ? ' з виплатою матеріальної допомоги' : '')
            break
          case 'CHGEMPLOYEE':
            para = UB.Repository(row.mi_unityEntity)
              .attrs(['fullFIO', 'fullFIOOld', 'genNameOld', 'employeePositionID.positionID', 'employeePositionID.dictPositionID', 'employeePositionID.departmentID'])
              .selectById(row.paraID, {
                'employeePositionID.positionID': 'positionID',
                'employeePositionID.dictPositionID': 'dictPositionID',
                'employeePositionID.departmentID': 'departmentID'
              }) || {}
            const pos = para.positionID
              ? UB.Repository('hr_position')
                .attrs(['name', 'nameGen'])
                .where('ID', '=', para.positionID)
                .where('state', '=', 'ACTIVE')
                .misc({ __mip_ondate: dateService.shiftDate(row.orderDate) })
                .selectSingle()
              : UB.Repository('hr_dictPosition').attrs(['name', 'nameGen']).selectById(para.dictPositionID || -1)
            const dep = UB.Repository('hr_department')
              .attrs(['name', 'nameGen'])
              .where('ID', '=', para.departmentID || -1)
              .where('state', '=', 'ACTIVE')
              .misc({ __mip_ondate: dateService.shiftDate(row.orderDate) })
              .selectSingle()
            const namePos = pos ? pos['nameGen'] || pos['name'] || '' : ''
            const nameDep = dep ? dep['nameGen'] || pos['name'] || '' : ''
            text = UB.i18n(`змінити прізвище на {0}, у трудовій книжці, облікових та бухгалтерських документах {1}, {2} {3}`, para.fullFIO, para.genNameOld || para.fullFIOOld, namePos, nameDep)
            break
        }
        const tabNum = (row.workPlace === '1' || !row.workPlace) ? `(${UB.i18n('осн')} ${row.tabNum})` : `(${UB.i18n('сум')} ${row.tabNum})`
        card.orders.push({
          orderDate: dateService.shiftDate(row.orderDate),
          orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(row.orderNumber, row.orderDate), tabNum),
          orderText: text
        })
      })

      empNumberList.forEach(employeeNumberID => {
        const sec = plurals.find(o => o.ID === employeeNumberID)
        let tabNum = sec ? `(${UB.i18n('сум')} ${sec.tabNum})` : `(${UB.i18n('осн')} ${card.tabNum})`
        const employeeAccrual = cont.emp[employeeNumberID].prop.employeeAccruals.filter(o => o.orderID === null && o.dateFrom.getFullYear() === params.year)
        employeeAccrual.forEach(row => {
          const value = row.accrualSum && row.accrualSum > 0 ? currencyService.round(row.accrualSum) + UB.i18n(' грн.') : currencyService.round(row.accrualRate) + '%'
          const strDateTo = dateService.isMaxDate(row['dateTo']) || !row['dateTo'] ? '' : UB.i18n(`по {0}`, dateService.formatDate(row['dateTo']))
          const payElName = cont.payEl[row.payElID].printName || cont.payEl[row.payElID].name || ''
          const text = UB.i18n(`Призначити з {0} {1} {2} у розмірі {3} {4}`, dateService.formatDate(row['dateFrom']), strDateTo, payElName, value, tabNum)
          card.orders.push({
            orderDate: dateService.shiftDate(row['dateFrom']),
            orderDescription: '',
            orderText: text
          })
        })
      })

      const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
        .attrs(['ID', 'orderRegistryID.docNumber', 'orderRegistryID.orderDate', 'dateFrom', 'dateTo', 'payElID.name',
          'payElID.printName', 'paySum', 'rate', 'countMonth', 'payElID.methodID.code', 'payElID.methodID.methodGroupID.code',
          'payElID.calcAvgType', 'avgCalcType', 'employeeNumberID.tabNum', 'employeeNumberID.workPlaceCode'])
        .where('employeeNumberID', 'in', empNumberList)
        .where('periodCalcID.pYear', '=', params.year)
        .where('orderRegistryID.empOrderID', 'isNull')
        .where('payElID.methodID.methodGroupID.code', 'in', [4, 6, 7])
        .orderBy('orderID.orderDate')
        .selectAsObject({
          'employeeNumberID.tabNum': 'tabNum',
          'employeeNumberID.workPlaceCode': 'workPlace'
        })
      orderRegistryDt.forEach(row => {
        let text = ``
        if (row['payElID.methodID.methodGroupID.code'] === 4) {
          text = UB.i18n(`про надання {0} з {1} по {2}`, row['payElID.printName'] || row['payElID.name'] || '', dateService.formatDate(row['dateFrom']), dateService.formatDate(row['dateTo']))
        } else if (row['payElID.methodID.code'] === '21') {
          text = UB.i18n(`про направлення у відрядження з {0} по {1}`, dateService.formatDate(row['dateFrom']), dateService.formatDate(row['dateTo']))
        } else if (row['payElID.methodID.methodGroupID.code'] === 6) {
          text = UB.i18n(`про надання {0} з {1} по {2}`, row['payElID.printName'] || row['payElID.name'] || '', dateService.formatDate(row['dateFrom']), dateService.formatDate(row['dateTo']))
        } else if (row['payElID.methodID.methodGroupID.code'] === 7) {
          let value = currencyService.round(row['paySum']) + ' грн.'
          if (row['payElID.calcAvgType'] === 'AVG') {
            value = UB.i18n(`{0} {1}`, row['countMonth'], row['avgCalcType'] === 'PLAN' ? 'окладів' : 'середньомісячних зарплат')
          }
          text = UB.i18n(`про виплату {0} у розмірі {1}`, row['payElID.printName'] || row['payElID.name'] || '', value)
        }
        const tabNum = (row.workPlace === '1' || !row.workPlace) ? `(${UB.i18n('осн')} ${row.tabNum})` : `(${UB.i18n('сум')} ${row.tabNum})`
        card.orders.push({
          orderDate: dateService.shiftDate(row['orderRegistryID.orderDate']),
          orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(row['orderRegistryID.docNumber'], row['orderRegistryID.orderDate']), tabNum),
          orderText: text
        })
      })

      const employeePosition = allEmpPositionsNoGroup.filter(o => o.employeeNumberID === card.employeeNumberID)
      // призначення, які починаються у вказаному році та наказ-підстава не є наказом з персоналу
      employeePosition.forEach((item, idx) => {
        let tabNum = UB.i18n(`(осн {0})`, card.tabNum)
        if (item.workPlace === '2') {
          const sec = plurals.find(o => o.ID === item.employeeNumberID)
          tabNum = sec ? UB.i18n(`(сум {0})`, sec.tabNum) : ''
        }
        let text = ``
        if (item.entityName === 'hr_orderPay' && item.dateFrom.getFullYear() === params.year) {
          if (idx > 0) {
            const attrs = []
            if (item.dictPositionID !== employeePosition[idx - 1].dictPositionID) attrs.push(UB.i18n(`змінити Посаду на {0}`, item['dictPosName']))
            if (item.departmentID !== employeePosition[idx - 1].departmentID) attrs.push(UB.i18n(`змінити Підрозділ на {0}`, item['departmentName']))
            if (item.payElID !== employeePosition[idx - 1].payElID) {
              const payElName = cont.payEl[item['payElID']].name || cont.payEl[item['payElID']].printName || ''
              attrs.push(UB.i18n(`змінити Система оплати на {0}`, payElName))
            }
            if (item.accrualSum !== employeePosition[idx - 1].accrualSum) attrs.push(UB.i18n(`змінити Оклад на {0} грн.`, item['accrualSum'] || ''))
            if (item.mtCount !== employeePosition[idx - 1].mtCount) attrs.push(UB.i18n(`змінити Кількість ставок на {0}`, item['mtCount']))
            if (item.workScheduleID !== employeePosition[idx - 1].workScheduleID) {
              const ws = UB.Repository('hr_workSchedule').attrs('name').misc({ __allowSelectSafeDeleted: true }).selectById(item['workScheduleID'])
              attrs.push(UB.i18n(`змінити Графік роботи {0}`, ws ? 'на ' + ws.name : ''))
            }
            text = attrs.join(', ')
            card.orders.push({
              orderDate: dateService.shiftDate(item.orderDate || item.dateFrom),
              orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(item['orderNumber'], item['orderDate'] || item.dateFrom), tabNum),
              orderText: text
            })
          } else {
            if (dateService.equals(cont.emp[cont.employeeNumberID].prop.employeeNumber.dateFrom, item.dateFrom)) {
              text = UB.i18n(`про призначення на посаду {0} з {1}`, item['dictPosName'] || '', dateService.formatDate(item['dateFrom']))
              card.orders.push({
                orderDate: dateService.shiftDate(item.orderDate || item.dateFrom),
                orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(item['orderNumber'], item['orderDate'] || item.dateFrom), tabNum),
                orderText: text
              })
            }
          }
        }
      })

      const vacSubstDet = UB.Repository('hr_empOrderVacSubstitutionDet')
        .attrs(['ID', 'paraID', 'orderID.orderNumber', 'orderID.orderDate', 'dateFrom', 'dateTo',
          'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.workPlace'])
        .where('employeePositionID.employeeNumberID', 'in', empNumberList)
        .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
        .where('orderID.orderDate', '>=', params.periodFrom, 'orderdatefrom')
        .where('orderID.orderDate', '<=', params.periodTo, 'orderdateto')
        .where('dateFrom', '>=', params.periodFrom, 'orderfrom')
        .where('dateFrom', '<=', params.periodTo, 'orderto')
        .where('orderID.periodCalcID.pYear', '=', params.year, 'period')
        .logic('(([orderdatefrom] AND [orderdateto]) OR ([orderfrom] AND [orderto]) OR [period])')
        .orderBy('orderID.orderDate')
        .selectAsObject({
          'orderID.orderNumber': 'orderNumber',
          'orderID.orderDate': 'orderDate',
          'employeePositionID.employeeNumberID.tabNum': 'tabNum',
          'employeePositionID.workPlace': 'workPlace'
        })
      vacSubstDet.forEach(row => {
        const text = UB.i18n(`про продовження перебування на посаді з {0}`, dateService.formatDate(row['dateFrom']))
        const tabNum = (row.workPlace === '1' || !row.workPlace) ? `(${UB.i18n('осн')} ${row.tabNum})` : `(${UB.i18n('сум')} ${row.tabNum})`
        card.orders.push({
          orderDate: dateService.shiftDate(row.orderDate),
          orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(row['orderNumber'], row['orderDate']), tabNum),
          orderText: text
        })
      })

      const actingDet = UB.Repository('hr_empOrderActingDet')
        .attrs(['ID', 'paraID', 'orderID.orderNumber', 'orderID.orderDate', 'paraID.positionID.nameGen', 'paraID.positionID.name',
          'dateFrom', 'dateTo', 'paraID.empOrderType', 'condition', 'paraID.description',
          'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.workPlace'])
        .where('employeeNumberID', 'in', empNumberList)
        .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
        .where('orderID.orderDate', '>=', params.periodFrom, 'orderdatefrom')
        .where('orderID.orderDate', '<=', params.periodTo, 'orderdateto')
        .where('dateFrom', '>=', params.periodFrom, 'orderfrom')
        .where('dateFrom', '<=', params.periodTo, 'orderto')
        .where('orderID.periodCalcID.pYear', '=', params.year, 'period')
        .logic('(([orderdatefrom] AND [orderdateto]) OR ([orderfrom] AND [orderto]) OR [period])')
        .orderBy('orderID.orderDate')
        .selectAsObject({
          'orderID.orderNumber': 'orderNumber',
          'orderID.orderDate': 'orderDate',
          'employeePositionID.employeeNumberID.tabNum': 'tabNum',
          'employeePositionID.workPlace': 'workPlace'
        })
      actingDet.forEach(row => {
        const tabNum = (row.workPlace === '1' || !row.workPlace) ? `(${UB.i18n('осн')} ${row.tabNum})` : `(${UB.i18n('сум')} ${row.tabNum})`
        const strDateTo = row['dateTo'] && !dateService.isMaxDate(row['dateTo']) ? UB.i18n(`по {0}`, dateService.formatDate(row['dateTo'])) : ''
        const text = UB.i18n(`про покладання обов'язків {0} з {1} {2} {3}`, row['paraID.positionID.nameGen'] || row['paraID.positionID.name'], dateService.formatDate(row['dateFrom']), strDateTo, row['condition'] || '')

        card.orders.push({
          orderDate: dateService.shiftDate(row.orderDate),
          orderDescription: UB.i18n(`Нак. {0} {1}`, formatOrderNumber(row['orderNumber'], row['orderDate']), tabNum),
          orderText: text
        })
      })

      card.orders.sort((a, b) => a.orderDate - b.orderDate)
    })
  } else if (cards && cards.length === 0) cards = [{ orgName: hrOrg.name, year: params.year, table2ColCount: fixTable2ColCount, cellTable2Width: cellTable2Width, workStartColSpan: 1, dictPosNameColSpan: 2 }]

  const timeCalc = currencyService.round(((new Date()).getTime() - startTime.getTime()) / 1000, 4)
  return {
    cards,
    timeCalc,
    sheetWidth
  }
}

function getPayrollEmbassyData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()

  const orgData = reportService.getHrOrg(params.orgID, onDate)

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const posField = useActualPositionName
    ? 'ep.factPosition '
    : staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')
  store.runSQL(` SELECT 
ep.ID as "epID", ${posField} as "posName", 
emp.genName as "genName", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", en.dateFrom as "dateFrom" 
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate,
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  if (employee && !employee.datName) employee.datName = employee.fullFIO
  if (employee && !employee.genName) employee.genName = employee.fullFIO
  if (employee && employee.dateFrom) employee.dateFrom = employee.dateFrom ? dateService.formatDate(employee.dateFrom) : ''

  let headEmployeeName = params.headEmployeePositionID ? empData.find(emp => emp.epID === params.headEmployeePositionID) : null
  let accEmployeeName = params.accEmployeePositionID ? empData.find(emp => emp.epID === params.accEmployeePositionID) : null
  headEmployeeName = headEmployeeName ? headEmployeeName.shortFIO : ''
  accEmployeeName = accEmployeeName ? accEmployeeName.shortFIO : ''

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }

  let paySum = UB.Repository('hr_accrual')
    .attrs('sum([paySum])')
    .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where('periodSalaryID.dateTo', '>=', params.periodFrom)
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .selectScalar()

  const paySumWords = currencyService.currencyToWordsUkr(paySum).toLowerCase()
  paySum = getFixed2Val(paySum)

  return {
    periodFrom: dateService.formatDate(params.periodFrom),
    periodTo: dateService.formatDate(params.periodTo),
    orgData,
    paySum,
    paySumWords,
    embassy: params.embassy,
    employee,
    headEmployeeName,
    accEmployeeName,
    upMarginValue: params.upMarginValue
  }
}

function getPayrollRequireData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  let onDate = params.issueDate ? dateService.shiftDate(params.issueDate)
    : params.currDate ? dateService.shiftDate(params.currDate) : new Date()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  let empNumbers = [{ employeeNumberID: params.employeeNumberID, orgID: params.orgID }]
  employeeService.getParentEmpNumberIDs(params.employeeNumberID, empNumbers)

  let empPosIDs = UB.Repository('hr_employeePositionSR')
    .attrs('ID')
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .selectAsArrayOfValues()

  let emps = [params.employeePositionID, params.headEmployeePositionID, params.accEmployeePositionID, ...empPosIDs].filter(Boolean).join(', ')
  let store = UB.DataStore('hr_employeePosition')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const posField = useActualPositionName
    ? 'ep.factPosName '
    : staffService.getPosFldOnDateSql2(':onDate:', 'ep.positionID', 'name', 'ep.dictPositionID')
  store.runSQL(` SELECT 
ep.ID as "epID", ep.employeeID as "employeeID", ${posField} as "posName", 
emp.taxCode as "taxCode", emp.datName as "datName", emp.shortFIO as "shortFIO", emp.fullFIO as "fullFIO", en.dateFrom as "dateFrom"
FROM hr_employeePosition ep 
join hr_employee emp on emp.ID = ep.employeeID
join hr_employeeNumber en on en.ID = ep.employeeNumberID and en.mi_deleteDate>= '9999-12-31'
WHERE ep.ID in (${emps}) and ep.isActive = 1 and ep.mi_deleteDate>= '9999-12-31'
${limitedAccess ? ' AND (en.limitedAccess = 0 OR ep.ID <> :employeePositionID:)' : ''}
`,
  {
    onDate,
    employeePositionID: params.employeePositionID
  })
  let empData = store.getAsJsObject()

  store.freeNative()

  const idParamStore = UB.DataStore('hr_idParam')
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  idParamStore.runSQL(`  SELECT pl.ID as "payElID"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE      
      ip.mi_deleteDate >= '9999-12-31' 
      and ip.orgID = :orgID:
      and lp.code = 'ReportPayrollRequire' 
      ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  const payEls = idParamStore.getAsJsObject()
  idParamStore.freeNative()
  const payElIDs = payEls.map(el => el.payElID)

  let employee = empData.find(emp => emp.epID === params.employeePositionID) || {}
  empData.filter(o => empPosIDs.includes(o.epID)).forEach(el => {
    if (employee.dateFrom > el.dateFrom) employee.dateFrom = el.dateFrom
    if (employee.dateTo < el.dateTo) employee.dateTo = el.dateTo
  })
  const employeeChange = UB.Repository('hr_employeeChange')
    .attrs(['ID', 'fullFIOOld', 'datNameOld', 'orderDate'])
    .where('employeeID', '=', employee.employeeID)
    .where('orderDate', '>', params.periodTo)
    .orderBy('orderDate', 'asc')
    .selectSingle()
  if (employeeChange) {
    employee.datName = employeeChange.datNameOld || employeeChange.fullFIOOld || ''
  } else {
    employee.datName = employee ? employee['datName'] || employee['fullFIO'] : ''
  }
  if (employee && employee.dateFrom) employee.dateFrom = employee.dateFrom ? dateService.formatDate(employee.dateFrom) : ''

  /*let signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []*/
    let signers = getSigners(params.orgID)

  let orgDat = reportService.getHrOrg(params.orgID, onDate)
  orgDat = orgDat.nameLoc || orgDat.name

  params.employeeIDs = UB.Repository('hr_employeeNumber')
    .attrs('employeeID')
    .where('ID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectAsArrayOfValues()

  params.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('employeeID', 'in', params.employeeIDs)
    .where('organizationID', 'in', empNumbers.map(o => o.orgID))
    .where('workPlace', 'in', ['2', '3', '4'])
    .groupBy(['employeeNumberID'])
    .selectAsArrayOfValues()

  if (!params.withComb) {
    params.secondaryJobsNumbers = []
  }

  const periods = UB.Repository('hr_dictPeriod')
    .attrs('name', 'dateFrom')
    .where('dateFrom', '<=', params.periodTo)
    .where('dateTo', '>=', params.periodFrom)
    .where('orgID', 'in', empNumbers.map(o => o.orgID))
    .groupBy(['name', 'dateFrom'])
    .orderBy('dateFrom')
    .selectAsObject()

  let currPeriod = periodService.getCurrentPeriod(params.orgID)

  const accrualBalanceMonth = new Date(params.periodTo.getFullYear(), params.periodTo.getMonth(), 1) < new Date(currPeriod.pYear, currPeriod.pMonth, 1) ? params.periodTo : currPeriod.dateTo

  let accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs('sum([sumFrom]-[sumPay])')
    .where('periodCalcID.dateFrom', '<=', accrualBalanceMonth)
    .where('periodCalcID.dateTo', '>=', accrualBalanceMonth)
    .where('employeeNumberID', 'in', empNumbers.map(o => o.employeeNumberID))
    .selectScalar() || 0

  if (accrualBalance <= 0) {
    accrualBalance = 'не було'
  } else {
    let accrualBalanceStr = currencyService.currencyToWordsUkr(accrualBalance).toLowerCase()
    const accrualBalanceArr = accrualBalance.toFixed(2).split('.')
    const indexOfGrn = accrualBalanceStr.indexOf(' грив')
    accrualBalance = UB.i18n(`складає {0} ({1}){2}`, accrualBalanceArr[0], accrualBalanceStr.substr(0, indexOfGrn), accrualBalanceStr.substr(indexOfGrn, accrualBalanceStr.length))
  }

  const accrualByPeriod = {}
  UB.Repository('hr_accrual')
    .attrs('periodSalaryID.name', 'periodSalaryID.dateFrom',
      `sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)`,
      `sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)`)
    .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
    .where('periodSalaryID.dateFrom', '>=', params.periodFrom)
    .where('periodSalaryID.dateFrom', '<=', params.periodTo)
    .where(`(flagsRec & 8192 = 0)`, 'custom')
    .groupBy(['periodSalaryID.name', 'periodSalaryID.dateFrom'])
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject({
      'periodSalaryID.name': 'periodName',
      'periodSalaryID.dateFrom': 'periodDateFrom',
      "sum(CASE WHEN [payElID.methodID.methodGroupID.groupType] = 'PAYMENT' THEN [paySum] ELSE 0 END)": 'sum1',
      'sum(CASE WHEN [payElID.methodID.methodGroupID.code] = 127 THEN [paySum] ELSE 0 END)': 'sum2'
    }).forEach(item => {
      item.sum3 = 0
      accrualByPeriod[item.periodDateFrom] = item
    })
  if (payElIDs && payElIDs.length) {
    UB.Repository('hr_accrual')
      .attrs('periodSalaryID.name', 'periodSalaryID.dateFrom',
        'sum([paySum])')
      .where('employeeNumberID', 'in', [...empNumbers.map(o => o.employeeNumberID), ...params.secondaryJobsNumbers])
      .where('periodSalaryID.dateFrom', '>=', params.periodFrom)
      .where('periodSalaryID.dateFrom', '<=', params.periodTo)
      .where('payElID', 'in', payElIDs)
      .where('payElID.methodID.methodGroupID.code', '=', 129)
      .where(`(flagsRec & 8192 = 0)`, 'custom')
      .groupBy(['periodSalaryID.name', 'periodSalaryID.dateFrom'])
      .orderBy('periodSalaryID.dateFrom')
      .selectAsObject({
        'periodSalaryID.name': 'periodName',
        'periodSalaryID.dateFrom': 'periodDateFrom',
        'sum([paySum])': 'sum3'
      }).forEach(item => {
        if (accrualByPeriod[item.periodDateFrom]) {
          accrualByPeriod[item.periodDateFrom].sum3 = item.sum3
        } else {
          item.sum1 = 0
          item.sum2 = 0
          accrualByPeriod[item.periodDateFrom] = item
        }
      })
  }
  const accrualData = []
  let allSum = {
    sum1: 0,
    sum2: 0,
    sum3: 0,
    sum4: 0
  }

  periods.forEach(period => {
    const currData = accrualByPeriod[period.dateFrom]

    if (currData) {
      currData.sum4 = (currData.sum1 || 0) - (currData.sum2 || 0) - (currData.sum3 || 0)

      let currObj = {
        periodDesc: period.name
      }
      let currSum
      for (let i = 1; i <= 4; i++) {
        currSum = 'sum' + i
        currObj[currSum] = getFixed2Val(currData[currSum])
        allSum[currSum] = currencyService.round(allSum[currSum] += currData[currSum] || 0, 2)
      }

      accrualData.push(currObj)
    } else {
      accrualData.push({
        periodDesc: period.name,
        sum1: '0.00',
        sum2: '0.00',
        sum3: '0.00',
        sum4: '0.00'
      })
    }
  })

  const allSum1Word = currencyService.currencyToWordsUkr(allSum.sum1)
  const allSum4Word = currencyService.currencyToWordsUkr(allSum.sum4)

  for (let i = 1; i <= 4; i++) {
    allSum['sum' + i] = getFixed2Val(allSum['sum' + i])
  }

  let logoSettings = reportService.getAccrualReportPrintConfig(params.orgID)

  return {
    periodFrom: dateService.formatDate(params.periodFrom),
    periodTo: dateService.formatDate(params.periodTo),
    employee,
    orgDat,
    accrualData,
    allSum,
    allSum1Word,
    allSum4Word,
    signers,
    logoSettings: logoSettings.isAddLogo ? logoSettings : false,
    accrualBalance,
    upMarginValue: params.upMarginValue,
    leftMarginValue: params.leftMarginValue
  }
}

function getRLData (params) {
  let periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  let periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true
  const monthData = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo', 'dictMonthID.name')
    .where('orgID', '=', params.organizationID)
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('dictMonthID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject({ 'dictMonthID.name': 'monthName' })

  let months = []
  if (periodFrom.getFullYear() === periodTo.getFullYear()) {
    monthData.forEach(m => {
      months.push({ month: m.monthName })
    })
  } else {
    monthData.forEach(m => {
      months.push({ month: m.name })
    })
  }

  const hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

  let orgIDs = [params.organizationID]
  if (params.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  let depName
  let deptIDs = null
  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs(['name', 'mi_treePath', 'description', 'fullName'])
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodTo })
    .selectSingle() : null
  if (department) {
    depName = department.description || department.fullName
    department.fullPath = department.mi_treePath.slice(0, -1).slice(1).split('/')
    department.fullPath = department.fullPath.map(depID => {
      let dep = UB.Repository('hr_department')
        .attrs(['ID', 'name'])
        .selectById(parseInt(depID, 10))
      return { depName: dep ? dep.name : false }
    }).filter(el => el.depName)
    department.fullPath[department.fullPath.length - 1].depName += params.includeSubDep ? UB.i18n(` з підлеглими`) : ''
  }

  if (params.includeSubDep) {
    depName += ' (з підлеглими)'
    const departments = UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', 'in', orgIDs)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', periodTo)
      .where('mi_dateTo', '>=', periodTo)
      .where('mi_treePath', 'startsWith', department.mi_treePath)
      .misc({ __mip_recordhistory_all: true })
      .groupBy('mi_data_id')
      .selectAsObject()
    if (departments.length) {
      deptIDs = departments.map(o => o.mi_data_id).join(', ')
    } else {
      deptIDs = [params.departmentID]
    }
  } else {
    deptIDs = params.departmentID ? [params.departmentID] : null
  }

  params.periodTo = periodTo
  params.periodFrom = periodFrom
  let strPeriodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    strPeriodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    strPeriodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    strPeriodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')
  let orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':dateTo:')

  let accPeriodJoin = params.accPeriodCode === 'CALC' ? `INNER JOIN hr_dictPeriod accPeriod ON accPeriod.ID = acc.periodCalcID and accPeriod.mi_deleteDate >= '9999-12-31' `
    : `INNER JOIN hr_dictPeriod accPeriod ON accPeriod.ID = acc.periodSalaryID and accPeriod.mi_deleteDate >= '9999-12-31' `

  let empClause = params.employeeNumberID ? `and en.ID = ${params.employeeNumberID} ` : ''

  // 1 employees not Work
  const accrualDS = UB.DataStore('hr_accrual')
  accrualDS.runSQL(`SELECT  en.ID as "ID"
FROM hr_employeeNumber en 
  INNER JOIN hr_accrual acc ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
  ${accPeriodJoin}   
  INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1 
 and ep2.dateFrom <= :dateTo: 
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit})   
WHERE accPeriod.dateFrom <= :dateTo: and accPeriod.dateTo >= :dateFrom: 
AND not (en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom:)  
AND acc.flagsRec & 8192 != 8192 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${deptClause} 
${orgClause} 
${empClause} 
group by en.ID`
  , {
    organizationID: params.organizationID,
    dateTo: periodTo,
    dateFrom: periodFrom,
    departmentID: params.departmentID
  })

  const notWorkPeriodEmpNumber = accrualDS.getAsJsObject()
  let notWorkPeriodEmpNumberIDs = notWorkPeriodEmpNumber.map(en => en.ID)

  // 2 get all data employeers
  let empNotWorkClause = notWorkPeriodEmpNumberIDs && notWorkPeriodEmpNumberIDs.length > 0
    ? `AND ((en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom:) or en.ID in (${notWorkPeriodEmpNumberIDs.join(',')}))`
    : `AND en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom:`

  const empPositionDS = UB.DataStore('hr_employeePosition')
  empPositionDS.runSQL(`SELECT  en.ID as "enID" 
, en.tabNum as "tabNum" 
, emp.fullFIO as "fullFIO" 
,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName" 
,ep.accrualSum as "accrualSum" 
,emp.taxCode as "taxCode" 
, ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name')} as "depName" 
,en.dateFrom as "dateFrom" 
,${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + tl.name from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31' FOR XML PATH('')), 1, 1, '')`
    : `(SELECT STRING_AGG(tl.name, ', ') from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31')`} as "taxLimit"  
FROM hr_employeeNumber en 
  INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31'         
  INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1 
 and ep2.dateFrom <= :dateTo: 
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit}) 
LEFT JOIN hr_position pos ON pos.ID = (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ  where posSubQ.mi_data_id = ep.positionID   
and posSubQ.state = 'ACTIVE' and posSubQ.mi_deleteDate >= '9999-12-31'  order by posSubQ.mi_dateFrom desc ${sqlDialect.limit}) 
LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID')} 
WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}  
and en.mi_deleteDate >= '9999-12-31' 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${empNotWorkClause}     
${empClause} 
${deptClause} 
ORDER BY dep.treePath, pos.idxNum, emp.fullFIO`
  , {
    orgIDs: orgIDs,
    dateTo: periodTo,
    dateFrom: periodFrom,
    departmentID: params.departmentID
  })

  const rls = empPositionDS.getAsJsObject()

  let enIDs = rls.map(en => en.enID).join(', ')

  // 3 get accrual by methGr.groupType
  function getAccrual (payGroupType = 'PAYMENT') {
    accrualDS.runSQL(`SELECT  en.ID as "enID"
    ,accPeriod.ID as "periodID"
    ,accPeriod.name as "periodName"
    ,pl.ID as "plID" 
    ,pl.description as "payElDescription"
    ,pl.codeSort
    ,sum(acc.paySum) as "paySum"
  FROM hr_accrual acc
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_payEl pl ON pl.ID = acc.payElID
    INNER JOIN hr_method meth on pl.methodID = meth.ID
    INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID
    ${accPeriodJoin}    
  WHERE acc.orgID${entityBaseService.getInExpression('orgIDs')}
  AND accPeriod.dateFrom <= :dateTo: and accPeriod.dateTo >= :dateFrom:
  AND acc.flagsRec & 8192 != 8192
  AND acc.employeeNumberID in (${enIDs})
  and methGr.groupType = '${payGroupType}' 
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''} 
  group by en.ID, pl.ID, pl.description, pl.codeSort     
  ,accPeriod.ID
  ,accPeriod.name
  ,accPeriod.dateFrom 
  order by pl.codeSort`
    , {
      orgIDs,
      dateTo: periodTo,
      dateFrom: periodFrom
    })

    let result = accrualDS.getAsJsObject()
    return result
  }

  function fillPayObj (payObj, payTypeSource, empID) {
    let accFilter = payTypeSource.filter(acc => acc.enID === empID)
    let groupPayEl = _.groupBy(accFilter, 'plID')
    for (let accObj in groupPayEl) {
      let payElSum = 0
      let monthSum = []
      monthSum = monthData.map(m => {
        return { ID: m.ID, paySum: 0 }
      })

      groupPayEl[accObj].forEach(el => {
        el.paySum = el.paySum ? currencyService.round(el.paySum, 2) : 0
        let month = monthSum.find(m => m.ID === el.periodID)
        if (month && month.ID === el.periodID) month.paySum = el.paySum
        payElSum = currencyService.round(payElSum + el.paySum, 2)
      })

      payObj.push({ payElDescription: groupPayEl[accObj][0].payElDescription, totalPaySum: payElSum, monthSum })
    }
  }

  function fillTotalPayObj (monthTotalObj, payTypeSource) {
    // { payElDescription: groupPayEl[accObj][0].payElDescription, totalPaySum: payElSum, monthSum }
    let totalSum = 0
    payTypeSource.forEach(obj => {
      totalSum = currencyService.round(totalSum + obj.totalPaySum, 2)
      monthTotalObj.forEach((m, ind) => {
        m.paySum = currencyService.round(m.paySum + obj.monthSum[ind].paySum, 2)
      })
    })
    return totalSum
  }

  function getAccBalance (sumAttr = 'sumFrom', periodID) {
    const accBalanceDS = UB.DataStore('hr_accrualBalance')
    accBalanceDS.runSQL(`SELECT  accBal.employeeNumberID as "enID", sum(accBal.${sumAttr}) as "${sumAttr}" 
  FROM hr_accrualBalance accBal 
   ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = accBal.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
    WHERE accBal.periodCalcID = :periodID: 
    AND accBal.employeeNumberID in (${enIDs}) 
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''} 
  group by accBal.employeeNumberID `
    , {
      periodID: periodID
    })

    let result = accBalanceDS.getAsJsObject()
    return result
  }

  function fillMonthPDFO (arrMonthPDFO, accSource, attrSumName, enID) {
    let accFilter = accSource.filter(acc => acc.enID === enID)
    let totalSum = 0

    accFilter.forEach(el => {
      el[attrSumName] = el[attrSumName] ? currencyService.round(el[attrSumName], 2) : 0
      let month = arrMonthPDFO.find(m => m.ID === el.periodID)
      if (month && month.ID === el.periodID) month.sum = el[attrSumName]
      totalSum = currencyService.round(totalSum + el[attrSumName], 2)
    })
    return totalSum
  }

  function fillMonthWorkTimeSum (emp, workTime, monthWorkTimeSum) {
    monthWorkTimeSum.map(el => {
      const timeSheetsPlan = UB.Repository('tim_timeSheet')
        .attrs('employeeNumberID', 'count([ID])', 'sum([normHour])')
        .where('employeeNumberID', '=', emp.enID)
        .where('dateWork', '>=', new Date(el.dateFrom))
        .where('dateWork', '<=', new Date(el.dateTo))
        .where('normHour', '>', 0)
        .where('isActive', '=', 1)
        .groupBy('employeeNumberID')
        .selectSingle({
          'count([ID])': 'planDay',
          'sum([normHour])': 'normHour'
        })

      const timeSheetsFact = UB.Repository('tim_timeSheet')
        .attrs('employeeNumberID', 'count([ID])', 'sum([factHour])')
        .where('employeeNumberID', '=', emp.enID)
        .where('dateWork', '>=', new Date(el.dateFrom))
        .where('dateWork', '<=', new Date(el.dateTo))
        .where('factTimeCostID.timeCostType', '=', 'WORK')
        .where('isActive', '=', 1)
        .groupBy('employeeNumberID')
        .selectSingle({
          'count([ID])': 'factDay',
          'sum([factHour])': 'factHour'
        })

      if (timeSheetsFact) {
        workTime.daysFactSum += timeSheetsFact.factDay
        workTime.hoursFactSum += timeSheetsFact.factHour

        el.daysFact = timeSheetsFact.factDay
        el.hoursFact = timeSheetsFact.factHour
      }

      if (timeSheetsPlan) {
        workTime.daysSum += timeSheetsPlan.planDay
        workTime.hoursSum += timeSheetsPlan.normHour

        el.hours = timeSheetsPlan.normHour
        el.days = timeSheetsPlan.planDay
      }

      return el
    })
  }

  function getAccPDFO () {
    accrualDS.runSQL(`SELECT en.ID as "enID"
    ,accPeriod.ID as "periodID"    
    ,sum(tax.incomeSum) as "baseSum"
    ,sum(tax.taxSum) as "paySum" 
    ,sum(tax.privilegeSum) as "privilegeSum" 
  FROM hr_accrual acc
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = acc.payElID
    INNER JOIN hr_method meth on pl.methodID = meth.ID     
    ${accPeriodJoin}  
    LEFT JOIN hr_taxIndividAcc tax on tax.accrualID = acc.ID     
  WHERE acc.orgID${entityBaseService.getInExpression('orgIDs')} 
  AND accPeriod.dateFrom <= :dateTo: and accPeriod.dateTo >= :dateFrom:
  AND acc.flagsRec & 8192 != 8192
  AND acc.employeeNumberID in (${enIDs})
  and meth.code = '26'  
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''} 
  group by en.ID, accPeriod.ID  
  order by en.ID `
    , {
      orgIDs,
      dateTo: periodTo,
      dateFrom: periodFrom
    })

    let result = accrualDS.getAsJsObject()
    return result
  }
  let fixedColumn = 5
  let dynamicColumn = months && months.length
  let allColumnCount = fixedColumn + dynamicColumn

  let fixedColWidth = 150 + 100 + 100 + 100 + 100
  let dynamicColWidth = 100
  let sheetWidth = fixedColWidth + dynamicColWidth * dynamicColumn

  if (rls && rls.length > 0 && enIDs && enIDs.length > 0) {
    let accBalanceFrom = getAccBalance('sumFrom', params.periodFromID)
    let accPDFO = getAccPDFO()

    let accrualPayment = getAccrual('PAYMENT')
    let accrualOfftake = getAccrual('OFFTAKE')
    let accrualForpay = getAccrual('FORPAY')

    rls.forEach((emp, ind) => {
      emp.orgName = `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `
      emp.dateFrom = emp.dateFrom ? dateService.formatDate(emp.dateFrom) : ''

      emp.paymentPayEls = []
      emp.offtakePayEls = []
      emp.forpayPayEls = []

      fillPayObj(emp.paymentPayEls, accrualPayment, emp.enID)
      fillPayObj(emp.offtakePayEls, accrualOfftake, emp.enID)
      fillPayObj(emp.forpayPayEls, accrualForpay, emp.enID)

      emp.totalPayment = 0
      emp.monthTotalPayment = monthData.map(m => {
        return { ID: m.ID, paySum: 0 }
      })

      emp.totalOfftake = 0
      emp.monthTotalOfftake = monthData.map(m => {
        return { ID: m.ID, paySum: 0 }
      })

      emp.totalForpay = 0
      emp.monthTotalForpay = monthData.map(m => {
        return { ID: m.ID, paySum: 0 }
      })

      emp.totalPayment = fillTotalPayObj(emp.monthTotalPayment, emp.paymentPayEls)
      emp.totalOfftake = fillTotalPayObj(emp.monthTotalOfftake, emp.offtakePayEls)
      emp.totalForpay = fillTotalPayObj(emp.monthTotalForpay, emp.forpayPayEls)

      if (ind !== rls.length - 1 && params.reportType !== 'xlsx') emp.isPageBreak = true

      let accBalFromFilter = accBalanceFrom.find(acc => acc.enID === emp.enID)
      emp.sumFrom = accBalFromFilter ? accBalFromFilter.sumFrom : 0
      emp.sumTo = emp.sumFrom + emp.totalPayment - emp.totalOfftake - emp.totalForpay

      emp.monthPDFOBase = monthData.map(m => {
        return { ID: m.ID, sum: 0 }
      })
      emp.monthPrivilege = monthData.map(m => {
        return { ID: m.ID, sum: 0 }
      })
      emp.monthPDFOPay = monthData.map(m => {
        return { ID: m.ID, sum: 0 }
      })

      emp.PDFObaseSum = fillMonthPDFO(emp.monthPDFOBase, accPDFO, 'baseSum', emp.enID)
      emp.PDFOprivilegeSum = fillMonthPDFO(emp.monthPrivilege, accPDFO, 'privilegeSum', emp.enID)
      emp.PDFOpaySum = fillMonthPDFO(emp.monthPDFOPay, accPDFO, 'paySum', emp.enID)

      emp.strPeriodName = strPeriodName
      emp.allColumnCount = allColumnCount
      emp.partColumn = allColumnCount - 1
      emp.months = months

      emp.workTime = {
        daysSum: 0,
        daysFactSum: 0,
        hoursSum: 0,
        hoursFactSum: 0
      }
      let monthWorkTimeSum = monthData.map(m => {
        return {
          ID: m.ID,
          dateFrom: m.dateFrom,
          dateTo: m.dateTo,
          days: 0,
          daysFact: 0,
          hours: 0,
          hoursFact: 0
        }
      })
      fillMonthWorkTimeSum(emp, emp.workTime, monthWorkTimeSum)
      emp.workTime.monthWorkTimeSum = monthWorkTimeSum
    })
  } else {
    let emp = {}
    emp.orgName = `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `
    emp.dateFrom = ''

    emp.paymentPayEls = []
    emp.offtakePayEls = []
    emp.forpayPayEls = []

    emp.totalPayment = 0
    emp.monthTotalPayment = monthData.map(m => {
      return { ID: m.ID, paySum: 0 }
    })

    emp.totalOfftake = 0
    emp.monthTotalOfftake = monthData.map(m => {
      return { ID: m.ID, paySum: 0 }
    })

    emp.totalForpay = 0
    emp.monthTotalForpay = monthData.map(m => {
      return { ID: m.ID, paySum: 0 }
    })

    emp.sumFrom = 0
    emp.sumTo = 0

    emp.monthPDFOBase = monthData.map(m => {
      return { ID: m.ID, sum: 0 }
    })
    emp.monthPrivilege = monthData.map(m => {
      return { ID: m.ID, sum: 0 }
    })
    emp.monthPDFOPay = monthData.map(m => {
      return { ID: m.ID, sum: 0 }
    })
    emp.PDFObaseSum = 0
    emp.PDFOprivilegeSum = 0
    emp.PDFOpaySum = 0
    emp.strPeriodName = strPeriodName
    emp.allColumnCount = allColumnCount
    emp.partColumn = allColumnCount - 1
    emp.months = months

    emp.workTime = {
      daysSum: 0,
      daysFactSum: 0,
      hoursSum: 0,
      hoursFactSum: 0
    }
    let monthWorkTimeSum = monthData.map(m => {
      return {
        ID: m.ID,
        days: 0,
        daysFact: 0,
        hours: 0,
        hoursFact: 0
      }
    })
    emp.workTime.monthWorkTimeSum = monthWorkTimeSum
    rls.push(emp)
  }

  return {
    strPeriodName,
    allColumnCount,
    sheetWidth,
    partColumn: allColumnCount - 1,
    months,
    rls
  }
}

function getRLMonthData (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo', 'priorPeriodID')
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .orderBy('dateFrom')
    .selectAsObject()

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')
  let empClause = params.employeeNumberID ? `and en.ID = ${params.employeeNumberID} ` : ''
  const dictFundSourceFSSU = UB.Repository('ac_fundSource').attrs(['ID']).where('dictFundTypeID.code', '=', '02').selectAsObject().map(o => o.ID)

  let resultRls = []
  const orderBy = params.sortByRl === '4' ? 'en.tabNumSort' : params.sortByRl === '3' ? 'emp.fullFIO' : params.sortByRl === '2' ? 'dep.code, en.tabNumSort' : 'dep.code, emp.fullFIO'
  periodList.forEach(period => {
    let periodFrom = dateService.shiftDate(period.dateFrom)
    let periodTo = dateService.shiftDate(period.dateTo)

    let balanceIn = UB.Repository('hr_accrualBalance')
      .attrs('employeeNumberID', 'SUM([sumTo])')
      .where('sumTo', '<>', 0)
      .where('periodCalcID', '=', period.priorPeriodID)
      .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
      .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
      .where('dictFundSourceID', 'notIn', dictFundSourceFSSU, 'fundin')
      .where('dictFundSourceID', 'isNull', undefined, 'fundnull')
      .logic('([fundin] OR [fundnull])')
      .groupBy('employeeNumberID')
      .selectAsObject({ 'SUM([sumTo])': 'sumTo' })
    let arrBalEnIDs = balanceIn.map(en => en.employeeNumberID)

    let balanceInFssu = []
    let balanceOutFssu = []
    if (dictFundSourceFSSU.length) {
      balanceInFssu = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('sumTo', '<>', 0)
        .where('periodCalcID', '=', period.priorPeriodID)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .where('dictFundSourceID', 'in', dictFundSourceFSSU)
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

      balanceOutFssu = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('periodCalcID', '=', period.ID)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .where('dictFundSourceID', 'in', dictFundSourceFSSU)
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })
    }
    let arrBalFSSUEnIDs = balanceInFssu ? balanceInFssu.map(en => en.employeeNumberID) : []
    if (arrBalEnIDs && arrBalEnIDs.length && arrBalFSSUEnIDs && arrBalFSSUEnIDs.length) arrBalEnIDs = arrBalEnIDs.concat(arrBalFSSUEnIDs)
    if (arrBalEnIDs && !arrBalEnIDs.length && arrBalFSSUEnIDs && arrBalFSSUEnIDs.length) arrBalEnIDs = arrBalFSSUEnIDs
    let balEnIDs = arrBalEnIDs.length ? arrBalEnIDs.join(', ') : '0'

    let balanceOut = UB.Repository('hr_accrualBalance')
      .attrs('employeeNumberID', 'SUM([sumTo])')
      .where('periodCalcID', '=', period.ID)
      .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
      .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
      .where('dictFundSourceID', 'notIn', dictFundSourceFSSU, 'fundin')
      .where('dictFundSourceID', 'isNull', undefined, 'fundnull')
      .logic('([fundin] OR [fundnull])')
      .groupBy('employeeNumberID')
      .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

    const empPositionDS = UB.DataStore('hr_employeePosition')
    empPositionDS.runSQL(`SELECT  en.ID as "enID"
,en.tabNum as "tabNum"
,emp.ID as "employeeID"
, ep.ID as "epID"
, emp.fullFIO as "fullFIO"
,ep.accrualSum as "sumAccrual"  
,(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit}) as "workPlace"
,${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((select ', ' + tl.name from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31' FOR XML PATH('')), 1, 1, '')`
    : `(SELECT STRING_AGG(tl.name, ', ') from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31')`} as "taxLimit" 
,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "position" 
,dep.caption as "departmentName" 
FROM hr_employeeNumber en 
INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31'   
INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1 
 and ep2.dateFrom <= :dateTo: 
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit})   
LEFT JOIN hr_position pos ON pos.ID = (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ  where posSubQ.mi_data_id = ep.positionID   
and posSubQ.state = 'ACTIVE' and posSubQ.mi_deleteDate >= '9999-12-31'  order by posSubQ.mi_dateFrom desc ${sqlDialect.limit}) 
LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID')} 
WHERE en.orgID = :orgID: 
and ((en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom:) or (exists(select acc.ID from hr_accrual acc where en.ID = acc.employeeNumberID and acc.orgID = :orgID: 
  AND acc.periodCalcID = :periodID: 
  AND acc.flagsRec & 8192 != 8192 )) or (en.ID in (${balEnIDs}))) 
and en.empWorkPlace IS NULL
and en.mi_deleteDate >= '9999-12-31' 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${deptClause} 
${empClause} 
ORDER BY ${orderBy}`
    , {
      orgID: params.orgID,
      dateTo: periodTo,
      dateFrom: periodFrom,
      periodID: period.ID,
      departmentID: params.departmentID
    })

    let rls = empPositionDS.getAsJsObject()

    let arrEnIDs = rls.map(en => en.enID)
    let enIDs = arrEnIDs.join(', ')

    const timeSheetsPlan = UB.Repository('tim_timeSheet')
      .attrs('employeeNumberID', 'count([ID])', 'sum([planHour])')
      .where('employeeNumberID', 'in', arrEnIDs)
      .where('dateWork', '>=', periodFrom)
      .where('dateWork', '<=', periodTo)
      .where('normHour', '>', 0)
      .where('isActive', '=', 1)
      .groupBy('employeeNumberID')
      .selectAsObject({
        'count([ID])': 'planDay',
        'sum([planHour])': 'planHour'
      })
    const timeSheetsFact = UB.Repository('tim_timeSheet')
      .attrs('employeeNumberID', 'count([ID])', 'sum([factHour])')
      .where('employeeNumberID', 'in', arrEnIDs)
      .where('dateWork', '>=', periodFrom)
      .where('dateWork', '<=', periodTo)
      .where('factHour', '>', 0)
      .where('isActive', '=', 1)
      .groupBy('employeeNumberID')
      .selectAsObject({
        'count([ID])': 'factDay',
        'sum([factHour])': 'factHour'
      })

    const accrualDS = UB.DataStore('hr_accrual')

    // 3 get accrual by methGr.groupType
    function getAccrual (payGroupType = 'PAYMENT') {
      accrualDS.runSQL(`SELECT  
     acc.ID "ID"
    ,en.ID as "enID"     
    ,periodSalary.ID as "periodID"
    ,periodSalary.name as "periodName"
    ,periodSalary.dateFrom as "periodDateFrom"     
    ,acc.dateFrom as "dateFrom"
    ,acc.dateTo as "dateTo"
    ,acc.days "days" 
    ,acc.rate as "rate" 
    ,acc.hours "hours" 
    ,pl.ID as "payElID"  
    ,pl.name as "payElName" 
    ,pl.description as "payElDescription" 
    ,pl.code as "plCode" 
    ,acc.paySum as "paySum" 
    ,ord.entryDate as "dateEntry" 
    ,ord.orderDate as "orderDate" 
    ,acc.flagsRec "flagsRec"
    ,acc.linkToParentID "linkToParentID"
  FROM hr_accrual acc
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_payEl pl ON pl.ID = acc.payElID     
    INNER JOIN hr_method meth on pl.methodID = meth.ID
    INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
    LEFT JOIN hr_order ord on ord.ID = acc.orderID and ord.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_dictPeriod periodSalary ON periodSalary.ID = acc.periodSalaryID and periodSalary.mi_deleteDate >= '9999-12-31'      
  WHERE acc.orgID = :orgID: 
  AND acc.periodCalcID = :periodID:
  AND acc.flagsRec & 8192 != 8192 
  AND acc.employeeNumberID in (${enIDs})
  and methGr.groupType = '${payGroupType}' 
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
  order by en.ID, periodSalary.dateFrom, pl.code, acc.dateFrom, acc.ID `
      , {
        orgID: params.orgID,
        dateTo: periodTo,
        dateFrom: periodFrom,
        periodID: period.ID
      })

      let result = accrualDS.getAsJsObject()
      return result
    }

    function fillPayObj (payObj, payTypeSource, empID, payElGroupName) {
      let accFilter = payTypeSource.filter(acc => acc.enID === empID)

      // group
      let prevPeriodSalaryID = null
      let groupAccrual = []
      accFilter.forEach(acc => {
        if ((payElGroupName === 'PAYMENT' && (acc.days || acc.hours || acc.paySum)) || (payElGroupName === 'OFFTAKE' && (acc.paySum || acc.rate)) || payElGroupName === 'FORPAY') {
          let groupObj = groupAccrual.find(obj => obj.payType === acc.payType && obj.payElID === acc.payElID && obj.dateFrom === acc.dateFrom && obj.dateTo === acc.dateTo &&
            ((!acc.rate && !obj.rate) || obj.rate === acc.rate))

          if (!groupObj) {
            if (prevPeriodSalaryID !== acc.periodID) {
              if (payElGroupName === 'PAYMENT') groupAccrual.push({ periodSalaryAcc: { perSalAccName: acc['periodName'] } })
              if (payElGroupName === 'OFFTAKE') groupAccrual.push({ periodSalaryKeep: { perSalKeepName: acc['periodName'] } })
              prevPeriodSalaryID = acc.periodID
            }

            if (acc.rate === 0)acc.rate = null
            groupAccrual.push(Object.assign({}, acc))
          } else {
            groupObj.days = groupObj.days || 0
            groupObj.hours = groupObj.hours || 0
            groupObj.paySum = currencyService.round(groupObj.paySum + acc.paySum)
            // if (!(acc.flagsRec & 1 << 10 && acc.linkToParentID === groupObj.ID)) {
            groupObj.days = currencyService.round(groupObj.days + acc.days)
            groupObj.hours = currencyService.round(groupObj.hours + acc.hours)
            // }
          }
        }
      })

      let totalSum = 0
      switch (payElGroupName) {
        case 'PAYMENT':
          groupAccrual.forEach(acc => {
            if (acc.periodSalaryAcc)payObj.push(acc)
            else {
              let accPeriod = acc.dateFrom && acc.dateTo ? `${dateService.formatDate(acc.dateFrom, 'dd.mm.yy')}-${dateService.formatDate(acc.dateTo, 'dd.mm.yy')}` : ''

              payObj.push({
                payElNameAcc: acc.payElDescription.substr(0, 52),
                paySumAcc: currencyService.formatAsCurrency(acc.paySum),
                periodAcc: accPeriod,
                daysAcc: acc.days || acc.hours ? `${acc.days ? acc.days : 0}/${acc.hours ? acc.hours : 0}` : '',
                // daysAcc: acc.days && acc.hours ? `${acc.days}/${acc.hours}` : '',
                payRate: currencyService.quantityToString(acc.rate, ',', '')
              })

              totalSum += acc.paySum
            }
          })
          break
        case 'OFFTAKE':
          let payObjLen = payObj.length
          groupAccrual.forEach((acc, ind) => {
            if (acc.periodSalaryKeep) {
              ind < payObjLen ? payObj[ind].periodSalaryKeep = acc.periodSalaryKeep : payObj.push(acc)
            } else {
              let accPeriod = acc.dateFrom && acc.dateTo ? `${dateService.formatDate(acc.dateFrom, 'dd.mm.yy')}-${dateService.formatDate(acc.dateTo, 'dd.mm.yy')}` : ''

              if (ind < payObjLen) {
                payObj[ind].payElNameKeep = acc.payElDescription.substr(0, 43)
                payObj[ind].paySumKeep = currencyService.formatAsCurrency(acc.paySum)
                payObj[ind].periodKeep = accPeriod
                payObj[ind].keepRate = currencyService.quantityToString(acc.rate, ',', '')
              } else {
                payObj.push({
                  paymentPayElName: '',
                  payElNameKeep: acc.payElDescription,
                  paySumKeep: currencyService.formatAsCurrency(acc.paySum),
                  keepRate: currencyService.quantityToString(acc.rate, ',', ''),
                  periodKeep: accPeriod
                })
              }
              totalSum += acc.paySum
            }
          })
          break

        case 'FORPAY':
          groupAccrual.forEach(acc => {
            let accPeriod = acc.dateFrom && acc.dateTo ? `${dateService.formatDate(acc.dateFrom, 'dd.mm.yy')}-${dateService.formatDate(acc.dateTo, 'dd.mm.yy')}` : ''
            payObj.push({
              payoutName: acc.payElName.substr(0, 43),
              payoutSum: currencyService.formatAsCurrency(acc.paySum),
              payoutPeriod: accPeriod,
              payoutDate: dateService.formatDate(acc.orderDate)
              // payoutDate: acc.dateEntry ? dateService.formatDate(acc.dateEntry) : ''
            })

            totalSum += acc.paySum
          })
          break
      }

      return totalSum
    }
    if (rls && rls.length > 0 && enIDs && enIDs.length > 0) {
      let accrualPayment = getAccrual('PAYMENT')
      let accrualOfftake = getAccrual('OFFTAKE')
      let accrualForpay = getAccrual('FORPAY')
      let pageHeight = 0
      let porInd = 0
      rls.forEach((emp) => {
        let tsPlan = timeSheetsPlan.filter(tm => tm.employeeNumberID === emp.enID)
        let tmFact = timeSheetsFact.filter(tm => tm.employeeNumberID === emp.enID)

        emp.periodDescription = period.name
        emp.periodFrom = period.dateFrom
        emp.periodID = period.ID
        emp.taxLimit = (emp.taxLimit && emp.taxLimit.length) || 'Відсутні'
        emp.timeSheetsPlan = tsPlan && tsPlan[0] ? UB.i18n(`{0} днів / {1} год.`, tsPlan[0].planDay, tsPlan[0].planHour) : ''
        emp.timeSheetsFact = tmFact && tmFact[0] ? UB.i18n(`{0} днів / {1} год.`, tmFact[0].factDay, tmFact[0].factHour) : ''

        emp.employee = `${emp.tabNum} ${emp.fullFIO}`

        emp.payEl = []
        emp.payouts = []

        emp.paySumAccTotal = ''
        emp.paySumKeepTotal = ''
        emp.payoutSumTotal = ''

        let orgSumFrom = balanceIn.find(bal => bal.employeeNumberID === emp.enID)
        emp.orgSumFrom = orgSumFrom && orgSumFrom.sumTo ? currencyService.formatAsCurrency(orgSumFrom.sumTo) : '0,00'

        let fssuSumFrom = balanceInFssu.find(bal => bal.employeeNumberID === emp.enID)
        emp.fssuSumFrom = fssuSumFrom && fssuSumFrom.sumTo ? currencyService.formatAsCurrency(fssuSumFrom.sumTo) : '0,00'

        let debtFirst = balanceOut.find(bal => bal.employeeNumberID === emp.enID)
        emp.debtFirst = debtFirst && debtFirst.sumTo ? currencyService.formatAsCurrency(debtFirst.sumTo) : '0,00'

        let debtSec = balanceOutFssu.find(bal => bal.employeeNumberID === emp.enID)
        emp.debtSec = debtSec && debtSec.sumTo ? currencyService.formatAsCurrency(debtSec.sumTo) : '0,00'

        emp.paySumAccTotal = fillPayObj(emp.payEl, accrualPayment, emp.enID, 'PAYMENT')
        emp.paySumKeepTotal = fillPayObj(emp.payEl, accrualOfftake, emp.enID, 'OFFTAKE')
        emp.payoutSumTotal = fillPayObj(emp.payouts, accrualForpay, emp.enID, 'FORPAY')

        emp.paySumTotal = emp.paySumAccTotal - emp.paySumKeepTotal
        emp.paySumAccTotal = currencyService.formatAsCurrency(emp.paySumAccTotal)
        emp.paySumKeepTotal = currencyService.formatAsCurrency(emp.paySumKeepTotal)
        emp.payoutSumTotal = currencyService.formatAsCurrency(emp.payoutSumTotal)

        emp.paySumTotal = currencyService.formatAsCurrency(emp.paySumTotal)

        if (params.withSumNotNull && emp.orgSumFrom === '0,00' && emp.fssuSumFrom === '0,00' &&
          ((emp.paySumAccTotal === '0,00' && emp.paySumAccTotal === '0,00') || !emp.payEl.length) &&
          (emp.payoutSumTotal === '0,00' || !emp.payouts.length)) return false

        let payElLength = 0
        emp.payEl.forEach(el => {
          payElLength++
          let rowCountToAdd = 0
          if (el.payElNameAcc && el.payElNameAcc.length > 31) {
            el.payElNameAcc = el.payElNameAcc.slice(0, 31)
            // rowCountToAdd = Math.ceil(el.payElNameAcc.length / 31) - 1
          }
          if (el.payElNameKeep && el.payElNameKeep.length > 31) {
            // rowCountToAdd = Math.max(rowCountToAdd, (Math.ceil(el.payElNameKeep.length / 31) - 1))
            el.payElNameKeep = el.payElNameKeep.slice(0, 31)
          }
          payElLength += rowCountToAdd
        })
        let payoutLength = 0
        emp.payouts.forEach(el => {
          payoutLength++
          let rowCountToAdd = 0
          if (el.payoutName && el.payoutName.length > 45) {
            // rowCountToAdd = Math.ceil(el.payoutName.length / 45) - 1
            el.payoutName = el.payoutName.slice(0, 45)
          }
          payElLength += rowCountToAdd
        })

        let currentHeight = 5 + payElLength * 0.3 + payoutLength * 0.3

        if ((pageHeight + currentHeight) > 23.8) {
          if (porInd > 0) {
            resultRls[porInd - 1].isPageBreak = true
          }
          pageHeight = currentHeight
        } else {
          pageHeight += currentHeight
        }
        porInd++
        resultRls.push(emp)
        return true
      })
    }
  })
  if (!resultRls.length) {
    let emp = {}
    emp.periodDescription = ''
    emp.payEl = []
    emp.enID = 0
    emp.periodFrom = null
    emp.payouts = []

    emp.paySumAccTotal = ''
    emp.paySumKeepTotal = ''
    emp.payoutSumTotal = ''
    emp.paySumTotal = ''

    emp.orgSumFrom = ''
    emp.fssuSumFrom = ''
    emp.debtFirst = ''
    emp.debtSec = ''

    resultRls.push(emp)
  }
  resultRls = resultRls.sort((a, b) => a.enID < b.enID ? 1 : (a.periodFrom < b.periodFrom ? -1 : 1))

  return {
    rls: resultRls
  }
}

function getRLMonthDataEdu (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo', 'priorPeriodID')
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .orderBy('dateFrom')
    .selectAsObject()

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')
  let empClause = params.employeeNumberID ? `and en.ID = ${params.employeeNumberID} ` : ''
  const dictFundSourceFSSU = UB.Repository('ac_fundSource').attrs(['ID']).where('dictFundTypeID.code', '=', '02').selectAsObject().map(o => o.ID)
  const dictFundSourceCHAES = UB.Repository('ac_fundSource').attrs(['ID']).where('dictFundTypeID.code', '=', '03').selectAsObject().map(o => o.ID)
  const excludeFundSource = [].concat(dictFundSourceFSSU).concat(dictFundSourceCHAES)

  let pages = []
  let pageHeight = 0
  let leftTable = []
  let rightTable = []
  let pushRightTable = false
  const orderBy = params.sortByRl === '4' ? 'en.tabNumSort' : params.sortByRl === '3' ? 'emp.fullFIO' : params.sortByRl === '2' ? 'dep.code, en.tabNumSort' : 'dep.code, emp.fullFIO'
  periodList.forEach((period, perIndex, perArr) => {
    let periodFrom = dateService.shiftDate(period.dateFrom)
    let periodTo = dateService.shiftDate(period.dateTo)

    let balanceIn = UB.Repository('hr_accrualBalance')
      .attrs('employeeNumberID', 'SUM([sumTo])')
      .where('sumTo', '<>', 0)
      .where('periodCalcID', '=', period.priorPeriodID)
      .where('dictFundSourceID', 'notIn', excludeFundSource, 'fundin')
      .where('dictFundSourceID', 'isNull', undefined, 'fundnull')
      .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
      .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
      .logic('([fundin] OR [fundnull])')
      .groupBy('employeeNumberID')
      .selectAsObject({ 'SUM([sumTo])': 'sumTo' })
    let arrBalEnIDs = balanceIn.map(en => en.employeeNumberID)

    let balanceInFssu = []
    let balanceOutFssu = []
    if (dictFundSourceFSSU.length) {
      balanceInFssu = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('sumTo', '<>', 0)
        .where('periodCalcID', '=', period.priorPeriodID)
        .where('dictFundSourceID', 'in', dictFundSourceFSSU)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

      balanceOutFssu = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('periodCalcID', '=', period.ID)
        .where('dictFundSourceID', 'in', dictFundSourceFSSU)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })
    }
    let balanceInCHAES = []
    let balanceOutCHAES = []
    if (dictFundSourceCHAES.length) {
      balanceInCHAES = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('sumTo', '<>', 0)
        .where('periodCalcID', '=', period.priorPeriodID)
        .where('dictFundSourceID', 'in', dictFundSourceCHAES)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

      balanceOutCHAES = UB.Repository('hr_accrualBalance')
        .attrs('employeeNumberID', 'SUM([sumTo])')
        .where('periodCalcID', '=', period.ID)
        .where('dictFundSourceID', 'in', dictFundSourceCHAES)
        .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
        .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
        .groupBy('employeeNumberID')
        .selectAsObject({ 'SUM([sumTo])': 'sumTo' })
    }
    const balEnIDs = arrBalEnIDs.concat(balanceInFssu.map(en => en.employeeNumberID)).concat(balanceInCHAES.map(en => en.employeeNumberID))
    let balanceOut = UB.Repository('hr_accrualBalance')
      .attrs('employeeNumberID', 'SUM([sumTo])')
      .where('periodCalcID', '=', period.ID)
      .where('dictFundSourceID', 'notIn', excludeFundSource, 'fundin')
      .where('dictFundSourceID', 'isNull', undefined, 'fundnull')
      .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
      .whereIf(!params.employeeNumberID, 'employeeNumberID.empWorkPlace', 'isNull')
      .logic('([fundin] OR [fundnull])')
      .groupBy('employeeNumberID')
      .selectAsObject({ 'SUM([sumTo])': 'sumTo' })

    const empPositionDS = UB.DataStore('hr_employeePosition')

    empPositionDS.runSQL(`SELECT  en.ID as "enID"
,en.tabNum as "tabNum"
,emp.ID as "employeeID"
, ep.ID as "epID"
, org.name as "orgName"
, emp.fullFIO as "fullFIO"
, emp.taxCode as "taxCode"
,ep.accrualSum as "sumAccrual"
, payEl.calcProportion as "calcProportion"  
,(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit}) as "workPlace"
,${sqlDialect.dialect === 'MSSQL2012' ? `STUFF((select ', ' + tl.name from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31' FOR XML PATH('')), 1, 1, '')` : `(SELECT STRING_AGG(tl.name, ', ') from hr_employeeTaxLimit emptl 
 LEFT JOIN hr_taxLimit tl ON tl.ID = emptl.taxLimitID and tl.mi_deleteDate >= '9999-12-31'
 where en.ID = emptl.employeeNumberID and emptl.mi_deleteDate >= '9999-12-31')`} as "taxLimit" 
,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "position" 
,dep.caption as "departmentName" 
FROM hr_employeeNumber en 
INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31'   
INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1 
 and ep2.dateFrom <= :dateTo: 
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit})   
LEFT JOIN hr_position pos ON pos.ID = (select ${sqlDialect.top} posSubQ.ID from hr_position posSubQ  where posSubQ.mi_data_id = ep.positionID   
and posSubQ.state = 'ACTIVE' and posSubQ.mi_deleteDate >= '9999-12-31'  order by posSubQ.mi_dateFrom desc ${sqlDialect.limit}) 
LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID')} 
LEFT JOIN hr_organization org ON org.mi_data_id = :orgID: and org.mi_dateFrom <= :dateTo: and org.mi_dateTo >= :dateFrom:
LEFT JOIN hr_payEl payEl ON payEl.ID = ep.payElID
WHERE en.orgID = :orgID: 
and ((en.dateFrom <= :dateTo: and en.dateTo >= :dateFrom:) or (exists(select acc.ID from hr_accrual acc where en.ID = acc.employeeNumberID and acc.orgID = :orgID: 
  AND acc.periodCalcID = :periodID: 
  AND acc.flagsRec & 8192 != 8192 )) or (en.ID${entityBaseService.getInExpression('balEnIDs')})) 
and en.mi_deleteDate >= '9999-12-31' 
and org.mi_deleteDate >= '9999-12-31'
and org.state = 'ACTIVE'
and en.empWorkPlace IS NULL
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${deptClause} 
${empClause} 
ORDER BY ${orderBy}`
    , {
      orgID: params.orgID,
      dateTo: periodTo,
      dateFrom: periodFrom,
      periodID: period.ID,
      departmentID: params.departmentID,
      balEnIDs: balEnIDs.length ? balEnIDs : [0]
    })

    let rls = empPositionDS.getAsJsObject()

    let arrEnIDs = rls.map(en => en.enID)
    const timeSheetsPlan = UB.Repository('tim_timeSheet')
      .attrs('employeeNumberID', 'count([ID])', 'sum([normHour])')
      .where('employeeNumberID', 'in', arrEnIDs)
      .where('dateWork', '>=', periodFrom)
      .where('dateWork', '<=', periodTo)
      .where('planTimeCostID.timeCostType', '=', 'WORK')
      .where('isActive', '=', 1)
      .groupBy('employeeNumberID')
      .selectAsObject({
        'count([ID])': 'planDay',
        'sum([normHour])': 'normHour'
      })
    let position
    if (settingsService.get('hrTariffingEducational', params.orgID)) {
      position = UB.Repository('trf_position').attrs(['dictPositionID', 'dictPositionID.name', 'dictFundSourceID', 'dictFundSourceID.name', 'posIndex', 'workPlaceID.employeeNumberID', 'workPlaceID.employeeNumberID.tabNum'])
        .where('workPlaceID.employeeNumberID', 'in', arrEnIDs)
        .where('workPlaceID.dateTo', '>=', periodTo)
        .where('workPlaceID.documentID.orgID', '=', params.orgID)
        .where('workPlaceID.employeeNumberID.workPlaceCode', '<>', 5)
        .where('workPlaceID.state', '=', 'POSTED')
        .where('workPlaceID.documentID.type', '=', 'FACT')
        .selectAsObject({
          'dictFundSourceID.name': 'dictPositionFundSource',
          'dictPositionID.name': 'dictPositionName',
          'workPlaceID.employeeNumberID': 'employeeNumberID'
        })
    } else {
      position = UB.Repository('hr_employeePositionS')
        .attrs(['dictPositionID', 'dictPositionID.name', 'dictFundSourceID', 'dictFundSourceID.name', 'employeeNumberID', 'employeeNumberID.tabNumSort'])
        .where('organizationID', '=', params.orgID)
        .where('employeeNumberID', 'in', arrEnIDs)
        .where('employeeNumberID.workPlaceCode', '<>', 5)
        .where('dateFrom', '<=', dateService.shiftDate(periodFrom))
        .where('dateTo', '>=', dateService.shiftDate(periodTo))
        .where('isActive', '=', 1)
        .selectAsObject({
          'dictFundSourceID.name': 'dictPositionFundSource',
          'dictPositionID.name': 'dictPositionName'
        })
    }
    const accrualDS = UB.DataStore('hr_accrual')

    function getAccrual (payGroupType = 'PAYMENT') {
      accrualDS.runSQL(`SELECT  
     acc.ID "ID"
    ,en.ID as "enID"     
    ,periodSalary.ID as "periodID"
    ,periodSalary.name as "periodName"
    ,periodSalary.dateFrom as "periodDateFrom"     
    ,acc.dateFrom as "dateFrom"
    ,acc.dateTo as "dateTo"
    ,acc.days as "days" 
    ,acc.rate as "rate" 
    ,acc.hours as "hours" 
    ,pl.ID as "payElID"  
    ,pl.name as "payElName" 
    ,pl.description as "payElDescription" 
    ,pl.code as "plCode" 
    ,acc.paySum as "paySum" 
    ,ord.entryDate as "dateEntry" 
    ,ord.orderDate as "orderDate" 
    ,acc.flagsRec "flagsRec"
    ,acc.linkToParentID "linkToParentID"
    ,acc.dictPositionID "dictPositionID"
    ,dp.name as "dictPositionName"
    ,en.empWorkPlace as "workPlace"
    ,meth.code as "methodCode"
  FROM hr_accrual acc
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_payEl pl ON pl.ID = acc.payElID     
    INNER JOIN hr_method meth on pl.methodID = meth.ID
    INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
    LEFT JOIN hr_dictPosition dp on dp.ID = acc.dictPositionID
    LEFT JOIN hr_order ord on ord.ID = acc.orderID and ord.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_dictPeriod periodSalary ON periodSalary.ID = acc.periodSalaryID and periodSalary.mi_deleteDate >= '9999-12-31'      
  WHERE acc.orgID = :orgID: 
  AND acc.employeeNumberID${entityBaseService.getInExpression('arrEnIDs')}
  AND acc.periodCalcID = :periodID:
  AND acc.flagsRec & 8192 != 8192 
  and methGr.groupType = '${payGroupType}' 
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
  order by en.ID, periodSalary.dateFrom, pl.code, acc.dateFrom, acc.ID `
      , {
        orgID: params.orgID,
        dateTo: periodTo,
        dateFrom: periodFrom,
        periodID: period.ID,
        arrEnIDs: arrEnIDs.length ? arrEnIDs : [0]
      })

      let result = accrualDS.getAsJsObject()
      return result
    }
    function fillPayObj (payObj, payTypeSource, empID, payElGroupName) {
      let accFilter = payTypeSource.filter(acc => (acc.enID === empID) && acc.paySum).sort((a, b) => {
        return a.dictPositionID === b.dictPositionID ? dateService.shiftDate(a.dateFrom) - dateService.shiftDate(b.dateFrom) : a.dictPositionID - b.dictPositionID
      })

      let groupAccrual = []
      const dictPositionIDs = []
      const getMainWorkPlace = accFilter.find(el => (el.workPlace === '1') && el.dictPositionID && el.dictPositionName)
      accFilter.forEach((acc, i, arr) => {
        if (!acc.dictPositionName && getMainWorkPlace) {
          dictPositionIDs.push(getMainWorkPlace.dictPositionID)
          groupAccrual.push({
            dictPosition: {
              dictPositionName: getMainWorkPlace.dictPositionName
            }
          })
        }
        if (!dictPositionIDs.find(o => o === acc.dictPositionID) && acc.dictPositionID && acc.dictPositionName) {
          dictPositionIDs.push(acc.dictPositionID)
          groupAccrual.push({
            dictPosition: {
              dictPositionName: acc.dictPositionName
            }
          })
        }
        if ((payElGroupName === 'PAYMENT' && (acc.days || acc.hours || acc.paySum)) || (payElGroupName === 'OFFTAKE' && (acc.paySum || acc.rate)) || payElGroupName === 'FORPAY') {
          let groupObj = groupAccrual.find(obj => (obj.payType === acc.payType) && (obj.dictPositionID === acc.dictPositionID) &&
          (obj.payElID === acc.payElID) && (obj.dateFrom === acc.dateFrom) && (obj.dateTo === acc.dateTo) &&
          ((!acc.rate && !obj.rate) || (obj.rate === acc.rate)))
          if (!groupObj) {
            groupAccrual.push(Object.assign({}, acc))
          } else {
            groupObj.days = groupObj.days || 0
            groupObj.hours = groupObj.hours || 0
            groupObj.paySum = currencyService.round(groupObj.paySum + acc.paySum)
            groupObj.days = currencyService.round(groupObj.days + acc.days)
            groupObj.hours = currencyService.round(groupObj.hours + acc.hours)
          }
        }
      })
      let totalSum = 0
      switch (payElGroupName) {
        case 'PAYMENT':
          groupAccrual.forEach(acc => {
            if (acc.periodSalaryAcc) payObj.push(acc)
            else {
              let accPeriod = acc.dateFrom && acc.dateTo ? dateService.formatDate(acc.dateFrom, 'mm.yy') : ''
              if (acc.dictPosition) {
                payObj.push(acc)
              } else {
                payObj.push({
                  payElNameAcc: acc.payElDescription && acc.payElDescription.length > 30 ? acc.payElDescription.substr(0, 31) : acc.payElDescription,
                  paySumAcc: currencyService.formatAsCurrency(acc.paySum),
                  periodAcc: accPeriod,
                  daysAcc: acc.days || acc.hours ? `${acc.days ? acc.days : 0}/${acc.hours ? currencyService.formatAsCurrency(acc.hours) : 0}` : '',
                  payRate: currencyService.quantityToString(acc.rate, ',', '')
                })
              }
              if (acc.paySum) totalSum += acc.paySum
            }
          })
          break
        case 'OFFTAKE':
          groupAccrual.forEach((acc, i, array) => {
            let accPeriod = acc.dateFrom && acc.dateTo ? dateService.formatDate(acc.dateFrom, 'mm.yy') : ''
            payObj.push({
              firstSalKeep: !i,
              payElNameKeep: acc.payElDescription && acc.payElDescription.length > 30 ? acc.payElDescription.substr(0, 31) : acc.payElDescription,
              paySumKeep: currencyService.formatAsCurrency(acc.paySum),
              periodKeep: accPeriod
            })

            totalSum += acc.paySum
          })
          break
        case 'FORPAY':
          groupAccrual.forEach(acc => {
            let accPeriod = acc.dateFrom && acc.dateTo ? dateService.formatDate(acc.dateFrom, 'mm.yy') : ''
            payObj.push({
              payoutName: acc.payElName.substr(0, 43),
              payoutSum: currencyService.formatAsCurrency(acc.paySum),
              payoutPeriod: accPeriod,
              payoutDate: acc.orderDate ? dateService.formatDate(acc.orderDate) : ''
            })

            totalSum += acc.paySum
          })
          break
      }
      return currencyService.round(totalSum)
    }
    function getCardHeight (empl) {
      const cardMargin = 10
      const orgLine = 10
      const depLine = 10
      const taxCodeLine = 10
      const fioLine = 19.5
      const headOfTable = 24
      const total = 12
      const payment = 40 // 102.5
      const payElBlock = empl.payEl && empl.payEl.length ? empl.payEl.reduce((acc, cur) => {
        const curElLength = cur.payElNameAcc ? Math.ceil(cur.payElNameAcc.length / 36) * 16 : 0
        return acc + curElLength
      }, 0.5) : 0
      const leaveBlock = empl.leaveBlock && empl.leaveBlock.length ? empl.leaveBlock.length * 18 : 0
      const keepsBlock = empl.keeps && empl.keeps.length ? empl.keeps.reduce((acc, cur) => {
        const curElLength = cur.payElNameKeep ? Math.ceil(cur.payElNameKeep.length / 36) * 16 : 0
        return acc + curElLength
      }, 0.5) : 0

      const payOutBlock = empl.payouts && empl.payouts.length ? empl.payouts.reduce((acc, cur) => {
        const curElLength = cur.payoutName ? Math.ceil(cur.payoutName.length / 36) * 16 : 0
        return acc + curElLength
      }, 0.5) : 0

      const balanceInBlock = empl.balanceIn ? (empl.balanceInData.length * 16 + 16) : 0
      const balanceOutBlock = empl.balanceOut ? (empl.balanceOutData.length * 16 + 16) : 0
      const positionBlock = empl.dictEmployeePositions && empl.dictEmployeePositions ? empl.dictEmployeePositions.length * 10 : 0
      return cardMargin + orgLine + depLine + taxCodeLine + fioLine + headOfTable + total + payment + payElBlock + keepsBlock + positionBlock + leaveBlock + payOutBlock + balanceInBlock + balanceOutBlock
    }

    if (rls && rls.length && arrEnIDs && arrEnIDs.length) {
      let accrualPayment = getAccrual('PAYMENT')
      let accrualOfftake = getAccrual('OFFTAKE')
      let accrualForpay = getAccrual('FORPAY')
      rls.forEach((emp, i, array) => {
        let tsPlan = timeSheetsPlan.filter(tm => tm.employeeNumberID === emp.enID)

        emp.periodDescription = period.name
        emp.periodFrom = period.dateFrom
        emp.periodID = period.ID
        emp.taxLimit = (emp.taxLimit && emp.taxLimit.length) || 'Відсутні'
        emp.timeSheetsPlan = tsPlan && tsPlan[0] ? tsPlan[0].planDay : ''

        emp.payEl = []
        emp.keeps = []
        emp.payouts = []

        emp.paySumAccTotal = ''
        emp.paySumKeepTotal = ''
        emp.payoutSumTotal = ''
        emp.dictEmployeePositions = settingsService.get('hrTariffingEducational', params.orgID) ? position.filter(o => o.employeeNumberID === emp.enID).filter((o, i, arr) => i === arr.findIndex(t => t.dictPositionID === o.dictPositionID)).sort((a, b) => a.posIndex - b.posIndex) : position.filter(o => o.employeeNumberID === emp.enID).filter((o, i, arr) => i === arr.findIndex(t => t.dictPositionID === o.dictPositionID)).sort((a, b) => a.tabNumSort - b.tabNumSort)

        emp.balanceInData = []
        emp.balanceOutData = []

        let orgSumFrom = balanceIn.find(bal => bal.employeeNumberID === emp.enID)
        if (orgSumFrom && orgSumFrom.sumTo) {
          emp.balanceInData.push({ balanceName: UB.i18n(orgSumFrom.sumTo < 0 ? 'Борг на початок періоду ФП' : 'Борг на початок періоду за підприємством'), balanceSum: currencyService.formatAsCurrency(orgSumFrom.sumTo) })
          emp.balanceIn = true
        }
        let fssuSumFrom = balanceInFssu.find(bal => bal.employeeNumberID === emp.enID)
        if (fssuSumFrom && fssuSumFrom.sumTo) {
          emp.balanceInData.push({ balanceName: UB.i18n('Борг на початок періоду за СС'), balanceSum: currencyService.formatAsCurrency(fssuSumFrom.sumTo) })
          emp.balanceIn = true
        }
        let chaesSumFrom = balanceInCHAES.find(bal => bal.employeeNumberID === emp.enID)
        if (chaesSumFrom && chaesSumFrom.sumTo) {
          emp.balanceInData.push({ balanceName: UB.i18n('Борг на початок періоду за фондом ЧАЕС'), balanceSum: currencyService.formatAsCurrency(chaesSumFrom.sumTo) })
          emp.balanceIn = true
        }
        let orgSumTo = balanceOut.find(bal => bal.employeeNumberID === emp.enID)
        if (orgSumTo && orgSumTo.sumTo) {
          emp.balanceOutData.push({ balanceName: UB.i18n(orgSumTo.sumTo < 0 ? 'Борг на кінець періоду ФП' : 'Борг на кінець періоду за підприємством'), balanceSum: currencyService.formatAsCurrency(orgSumTo.sumTo) })
          emp.balanceOut = true
        }
        let fssuSumTo = balanceOutFssu.find(bal => bal.employeeNumberID === emp.enID)
        if (fssuSumTo && fssuSumTo.sumTo) {
          emp.balanceOutData.push({ balanceName: UB.i18n('Борг на кінець періоду за СС'), balanceSum: currencyService.formatAsCurrency(fssuSumTo.sumTo) })
          emp.balanceOut = true
        }
        let chaesSumTo = balanceOutCHAES.find(bal => bal.employeeNumberID === emp.enID)
        if (chaesSumTo && chaesSumTo.sumTo) {
          emp.balanceInData.push({ balanceName: UB.i18n('Борг на кінець періоду за фондом ЧАЕС'), balanceSum: currencyService.formatAsCurrency(chaesSumTo.sumTo) })
          emp.balanceOut = true
        }

        const leaveAccr = accrualPayment.filter(acc => (emp.enID === acc.enID) && (acc.methodCode === '15'))
        if (leaveAccr.length) {
          leaveAccr.forEach(o => { o.workNorm = emp.calcProportion && (emp.calcProportion === 'HOUR') ? o.hours : o.days })
          emp.leaveBlock = leaveAccr
        }
        emp.paySumAccTotal = fillPayObj(emp.payEl, accrualPayment, emp.enID, 'PAYMENT')
        emp.paySumKeepTotal = fillPayObj(emp.keeps, accrualOfftake, emp.enID, 'OFFTAKE')
        emp.payoutSumTotal = currencyService.formatAsCurrency(fillPayObj(emp.payouts, accrualForpay, emp.enID, 'FORPAY'))
        emp.paySumTotal = emp.paySumAccTotal - emp.paySumKeepTotal
        emp.paySumAccTotal = currencyService.formatAsCurrency(emp.paySumAccTotal)
        emp.paySumKeepTotal = currencyService.formatAsCurrency(emp.paySumKeepTotal)
        emp.paySumTotal = currencyService.formatAsCurrency(emp.paySumTotal)

        if (params.withSumNotNull && emp.orgSumFrom === '0,00' && emp.fssuSumFrom === '0,00' && ((emp.paySumAccTotal === '0,00' && emp.paySumAccTotal === '0,00') || !emp.payEl.length) && (emp.payoutSumTotal === '0,00' || !emp.payouts.length)) return false

        const cardHeight = getCardHeight(emp)
        if (((pageHeight + cardHeight) > 940)) {
          if (pushRightTable) {
            rightTable[rightTable.length - 1].isPageBreak = true
            pages.push({ leftTable, rightTable })
            pageHeight = cardHeight
            leftTable = []
            rightTable = []
          } else {
            if (leftTable.length) leftTable[leftTable.length - 1].isPageBreak = true
            pageHeight = cardHeight
          }
          pushRightTable = !pushRightTable
          pushRightTable ? rightTable.push(emp) : leftTable.push(emp)
        } else {
          pageHeight += cardHeight
          pushRightTable ? rightTable.push(emp) : leftTable.push(emp)
        }
        if ((perIndex === perArr.length - 1) && (i === array.length - 1)) {
          pages.push({ leftTable, rightTable })
          if (pages && pages.length && pages[pages.length - 1].leftTable.length) pages[pages.length - 1].leftTable[pages[pages.length - 1].leftTable.length - 1].isPageBreak = true
          if (pages && pages.length && pages[pages.length - 1].rightTable.length) pages[pages.length - 1].rightTable[pages[pages.length - 1].rightTable.length - 1].isPageBreak = true
        }
        return true
      })
    }
  })
  if (pages.length) {
    if (pages && pages.length && pages[pages.length - 1].leftTable.length) pages[pages.length - 1].leftTable[pages[pages.length - 1].leftTable.length - 1].isPageBreak = false
    if (pages && pages.length && pages[pages.length - 1].rightTable.length) pages[pages.length - 1].rightTable[pages[pages.length - 1].rightTable.length - 1].isPageBreak = false
  }
  return {
    pages
  }
}
