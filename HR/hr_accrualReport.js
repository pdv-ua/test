const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const dateService = require('../AC/modules/dataServices/dateService')
const currencyService = require('../AC/public/core/currencyService')
const accrualService = require('../HR/modules/accrualService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const periodService = require('../HR/modules/periodService')
const reportService = require('../HR/modules/reportService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const nameCaseService = require('../HR/modules/nameCaseService')
const nameCase = require('../HR/modules/nameCase')
const treeUtils = require('../HR/public/core/treeUtils')

const accrualReport = require('../HR/modules/salaryReport/accrualReports')
const consolReport = require('../HR/modules/salaryReport/consolReports')
const controlReport = require('../HR/modules/salaryReport/controlReports')
const employeeReport = require('../HR/modules/salaryReport/employeeReports')

me.entity.addMethod('get1NC') //
me.entity.addMethod('getAlimentData') //
me.entity.addMethod('getBonusData') //
me.entity.addMethod('getCalcFundsData') //
me.entity.addMethod('getConsolCateg') //
me.entity.addMethod('getControlCalcVacReserveData') //
me.entity.addMethod('getDeducMilitaryTaxData') //
me.entity.addMethod('getDeducTaxData') //
me.entity.addMethod('getDepartmentByOrgsData')
me.entity.addMethod('getFOPData') //
me.entity.addMethod('getGeneralRegistry') //
me.entity.addMethod('getGroupReportData')
me.entity.addMethod('getIncTaxReportData') //
me.entity.addMethod('getIndividualEmpContractData') //
me.entity.addMethod('getMinWageData') //
me.entity.addMethod('getNReportData') //
me.entity.addMethod('getPaySummary') //
me.entity.addMethod('getSickRegister') //
me.entity.addMethod('getSummarizedCostItems') //
me.entity.addMethod('getUnionPayData') //
me.entity.addMethod('getVacationData') //
me.entity.addMethod('selectAccrualForPayment')
me.entity.addMethod('getListDebtEmployees')
me.entity.addMethod('getListAppointDismissEmployes')
me.entity.addMethod('getAccrualReleasedData')
me.entity.addMethod('getListByLongVacation')
me.entity.addMethod('getTimeCostData')
me.entity.addMethod('getPayIndexSalaryData')
me.entity.addMethod('getAvgSalary13Data')
me.entity.addMethod('getAvgSalaryFSSData')
me.entity.addMethod('getAvgSalaryMainData')
me.entity.addMethod('getCreditReportData')
me.entity.addMethod('getIncomeReportData')
me.entity.addMethod('getIncomeTaxReportData')
me.entity.addMethod('getInfoCard')
me.entity.addMethod('getPayrollEmbassyData')
me.entity.addMethod('getPayrollRequireData')
me.entity.addMethod('getRLData')
me.entity.addMethod('getRLMonthData')
me.entity.addMethod('getRLMonthDataEdu')

me.entity.addMethod('getListStudents')
me.entity.addMethod('getPaymentReportData')
me.entity.addMethod('getPeriodDepartmentData')
me.entity.addMethod('getPosGroupReportData')
me.entity.addMethod('getWorkReport')
me.entity.addMethod('getAverageStatisticsData')
me.entity.addMethod('getEmployeeAccrualList')
me.entity.addMethod('getInformationAboutSystemUsers')

me.getListByLongVacation = function (ctx) {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getLongVacationData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPayIndexSalaryData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getPayIndexSalaryData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPosGroupReportData = ctx => {
  let params = ctx.mParams.execParams
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  params.objPeriodFromDateFrom = dateService.shiftDate(params.objPeriodFromDateFrom)
  params.objPeriodToDateTo = dateService.shiftDate(params.objPeriodToDateTo)

  const periods = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'name'])
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '>=', params.objPeriodFromDateFrom)
    .where('dateTo', '<=', params.objPeriodToDateTo)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()

  let employeePositions = UB.Repository('hr_employeePositionSR') // все в самом широком периоде
    .attrs('ID', 'employeeNumberID', 'dateFrom', 'dateTo')
    .where('organizationID', '=', params.orgID)
    .where('dateFrom', '<=', params.objPeriodToDateTo)
    .where('dateTo', '>=', params.objPeriodFromDateFrom)
    .where('mi_deleteDate', '>=', '#maxdate')
    .exists(
      UB.Repository('hr_idParam')
        .correlation('valuesID', 'positionID')
        .where('listParamID', '=', params.listParamTabs.posPosition.ID)
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()

  let payElCells = []
  let payData = []
  let payTableData = []
  let totalSumCells = []
  let totalEmpCount = 0
  let totalAvgCells = []
  let fixedColumnCount = 4
  let fixedColumnWidth = 400
  let payColumnWidth = 100
  let allColumsCount = fixedColumnCount
  let tableWidth = fixedColumnWidth
  let leftWidth = 0
  let rightWidth = 0
  let fixedWidthHead = 400

  if (params.listParamTabs.posPosition.ID && params.listParamTabs.payElPosition.ID) {
    // nameColumns payElPosition
    let store = UB.DataStore('hr_accrual')
    store.runSQL(` SELECT 
pl.ID as "ID",
pl.name as "payElName"
FROM hr_idParam ip
JOIN hr_payEl pl on ip.valuesID = pl.ID
WHERE 
ip.mi_deleteDate>= '9999-12-31'  
AND pl.mi_deleteDate>= '9999-12-31'  
AND ip.listParamID = :idParamPayEl:
order by ip.orderN asc `,
    {
      idParamPayEl: params.listParamTabs.payElPosition.ID
    })
    payElCells = store.getAsJsObject()
    store.freeNative()

    allColumsCount = fixedColumnCount + payElCells.length
    tableWidth = fixedColumnWidth + payElCells.length * payColumnWidth

    let restWidth = tableWidth - fixedWidthHead
    leftWidth = Math.floor(restWidth / 2)
    rightWidth = restWidth - leftWidth

    // allPayData
    let arrPeriodSalaryID = periods.map(per => per.ID)
    store = UB.DataStore('hr_accrual')
    store.runSQL(` SELECT 
sum(A01.paySum) AS "paySum"
,count(distinct A01.employeeNumberID) as "empCount"
,A01.payElID as "payElID"
,A01.periodSalaryID as "periodSalaryID" 
FROM hr_accrual A01  
JOIN hr_payEl A02 ON A02.ID=A01.payElID 
JOIN hr_dictPeriod A03 ON A03.ID=A01.periodSalaryID 
${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = A01.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
WHERE A01.periodSalaryID IN (${arrPeriodSalaryID}) 
AND A01.flagsRec & 8192 != 8192 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
and A01.employeeNumberID IN ( SELECT 
distinct ep1.employeeNumberID
FROM hr_employeePosition ep1 
LEFT JOIN hr_position pos1 ON pos1.mi_data_id=ep1.positionID 
WHERE ep1.organizationID=:orgID: and ep1.isActive = 1
AND ep1.dateFrom<=:objPeriodTo: 
AND ep1.dateTo>=:objPeriodFrom:
AND ep1.mi_deleteDate>= '9999-12-31'  
AND EXISTS (SELECT 1  FROM hr_idParam idpar  WHERE idpar.valuesID=ep1.positionID AND idpar.listParamID=:idParamPos: AND idpar.mi_deleteDate>= '9999-12-31' ) 
AND pos1.mi_deleteDate>= '9999-12-31' 
)
AND A01.payElID IN (
(SELECT pl2.ID  FROM hr_payEl pl2  WHERE EXISTS (SELECT 1  FROM hr_idParam idpar  WHERE idpar.valuesID=pl2.ID AND idpar.listParamID=:idParamPayEl: AND idpar.mi_deleteDate>= '9999-12-31' ) 
 )
)
GROUP BY A01.payElID, A01.periodSalaryID `,
    {
      orgID: params.orgID,
      objPeriodTo: params.objPeriodToDateTo,
      objPeriodFrom: params.objPeriodFromDateFrom,
      idParamPos: params.listParamTabs.posPosition.ID,
      idParamPayEl: params.listParamTabs.payElPosition.ID
    })
    payData = store.getAsJsObject()
    store.freeNative()

    getReportResultData()
  }

  function getReportResultData () {
    let k = 1
    let totalAllSum = 0
    let totalPayElSum = Array(payElCells.length).fill(0)

    periods.filter(period => employeePositions.some(pos => pos.dateFrom <= period.dateTo && pos.dateTo >= period.dateFrom)).forEach(period => {
      let row = {}
      row['pn'] = k
      row.periodName = period.name
      let curPayData = payData.filter(item => item.periodSalaryID === period.ID)
      row.empCount = curPayData.reduce((c, o) => { return c > o.empCount ? c : o.empCount }, 0)
      totalEmpCount += row.empCount

      row.payElCells = []
      row.periodSum = 0

      payElCells.forEach((payCell, index) => {
        let curPayEl = curPayData.find(el => el.payElID === payCell.ID)
        let curValue = curPayEl && curPayEl['paySum'] ? curPayEl['paySum'] : 0
        row.payElCells.push({ paySum: curValue || 0 })

        row.periodSum += curValue
        totalAllSum += curValue
        totalPayElSum[index] += curValue
      })
      row.periodSum = row.periodSum || 0

      payTableData.push(row)
      k++
    })

    // totalSumCells.push({ totalSum: totalEmpCount || 0 })
    totalPayElSum.forEach(el => {
      totalSumCells.push({ totalSum: el || 0 })
      let avg = totalEmpCount ? el / totalEmpCount : 0
      totalAvgCells.push({ avg: avg || 0 })
    })
    totalSumCells.push({ totalSum: totalAllSum || 0 })

    let avgTotalSum = totalEmpCount ? totalAllSum / totalEmpCount : 0
    totalAvgCells.push({ avg: avgTotalSum || 0 })
  }

  ctx.mParams.resultData = JSON.stringify({
    objPeriodFrom: params.objPeriodFrom,
    objPeriodTo: params.objPeriodTo,
    posGroupName: params.posGroupName,
    payTableData,
    payNameCells: payElCells,
    allColumsCount,
    tableWidth,
    totalSumCells,
    totalEmpCount,
    totalAvgCells,
    leftWidth,
    rightWidth
  })
}

me.getNReportData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = consolReport.getNReportData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

function getFixed2Val (v, checkField) {
  if (checkField) return v && v[checkField] ? v[checkField].toFixed(2) : '0.00'
  else return v && v ? v.toFixed(2) : '0.00'
}

me.getIncomeReportData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getIncomeReportData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getIncomeTaxReportData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getIncomeTaxReportData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPaymentReportData = ctx => {
  function getFactNameGen (employeePositionID, onDate, useSexType) {
    let pos = ''

    const epData = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'employeeID.sexType', 'dictPositionID', 'positionID.mi_treePath', 'dictPositionID.nameGen', 'organizationID',
        'dictPositionID.name', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'posNameAddition'])
      .attrsIf(useSexType, ['dictPositionID.nameGenF'])
      .selectById(employeePositionID)

    if (epData) {
      const department = epData['positionID.mi_treePath'] ? UB.Repository('hr_department')
        .attrs(['name', 'nameGen'])
        .where('mi_data_id', 'in', _.compact(epData['positionID.mi_treePath'].split('/')).map(o => Number(o)))
        .where('state', '=', 'ACTIVE')
        .where('orgID', '=', epData.organizationID || 0)
        .misc({
          __mip_ondate: onDate
        })
        .orderBy('mi_treePath', 'desc')
        .selectAsObject() : []

      let depName = ''
      department.forEach(dep => {
        const name = dep['nameGen'] || dep['name'] || ''
        depName += (depName ? ' ' : '') + name
      })
      depName = nameCaseService.removeDuplicateWords(depName)

      if (epData.dictPositionID) {
        const dictName = useSexType && epData['employeeID.sexType'] === 'W'
          ? epData['dictPositionID.nameGenF'] || epData['dictPositionID.nameGen'] || epData['dictPositionID.name']
          : epData['dictPositionID.nameGen'] || epData['dictPositionID.name']
        pos = nameCaseService.removeDuplicateWords([dictName, epData.posNameAddition, epData['dictEmpCategoryID.genName'] || epData['dictEmpCategoryID.name'], depName].filter(Boolean).join(' ') || '')
      }
    }
    return pos
  }

  let params = ctx.mParams.execParams
  let data = []
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const useSexType = settingsService.getByCode('hrUseSexTypeInOrders', params.orgID) === true

  const accEmployeeShortFIO = params.accEmployeeNumberID ? UB.Repository('hr_employeeNumberS')
    .attrs('employeeID.shortFIO')
    .where('ID', '=', params.accEmployeeNumberID)
    .selectScalar() : '&nbsp;'
  const dataExAcc = params.accEmployeePositionID ? UB.Repository('hr_dictTempExecution')
    .attrs(['employeePositionTempID', 'employeePositionTempID.positionID.name', 'employeePositionTempID.positionID.nameGen'])
    .where('employeePositionID', '=', params.accEmployeePositionID)
    .where('organizationID', '=', params.orgID)
    .where('dateFrom', '<=', dateService.shiftDate(params.currDate))
    .where('dateTo', '>=', dateService.shiftDate(params.currDate))
    .where('employeePositionTempID.positionID.mi_dateFrom', '<=', dateService.shiftDate(params.currDate))
    .where('employeePositionTempID.positionID.state', '=', 'ACTIVE')
    .orderBy('numQueue')
    .orderByDesc('employeePositionTempID.positionID.mi_dateTo')
    .selectSingle() : null
  let accEmployeePos
  if (dataExAcc) {
    const responsAbbr = UB.Repository('ac_settingsOrg')
      .attrs(['value'])
      .where('organizationID', '=', params.orgID)
      .where('[constantID.code]', '=', 'hrResponsAbbr')
      .selectScalar() || 'В.о.'
    let posName = (dataExAcc['employeePositionTempID.positionID.nameGen'] || dataExAcc['employeePositionTempID.positionID.name'] || '').toLowerCase()
    if (useActualPositionName && dataExAcc.employeePositionTempID) {
      const posGen = getFactNameGen(dataExAcc.employeePositionTempID, params.periodTo, useSexType)
      posName = posGen || posName
    }
    accEmployeePos = (responsAbbr) + ' ' + posName
  } else {
    accEmployeePos = params.accEmployeePositionID ? UB.Repository('hr_employeePositionSR')
      .attrsIf(!useActualPositionName, 'posName')
      .attrsIf(useActualPositionName, 'factPosition')
      .where('ID', '=', params.accEmployeePositionID)
      .selectScalar() : ''
  }
  const signEmp2ShortFIO = params.employeeNumberID ? UB.Repository('hr_employeeNumberS')
    .attrs('employeeID.shortFIO')
    .where('ID', '=', params.employeeNumberID)
    .selectScalar() : '&nbsp;'
  const dataEx = params.employeePositionID ? UB.Repository('hr_dictTempExecution')
    .attrs(['employeePositionTempID', 'employeePositionTempID.positionID.name', 'employeePositionTempID.positionID.nameGen'])
    .where('employeePositionID', '=', params.employeePositionID)
    .where('organizationID', '=', params.orgID)
    .where('dateFrom', '<=', dateService.shiftDate(params.currDate))
    .where('dateTo', '>=', dateService.shiftDate(params.currDate))
    .where('employeePositionTempID.positionID.mi_dateFrom', '<=', dateService.shiftDate(params.currDate))
    .where('employeePositionTempID.positionID.state', '=', 'ACTIVE')
    .orderBy('numQueue')
    .orderByDesc('employeePositionTempID.positionID.mi_dateTo')
    .selectSingle() : null
  let signEmp2Pos
  if (dataEx) {
    const responsAbbr = UB.Repository('ac_settingsOrg')
      .attrs(['value'])
      .where('organizationID', '=', params.orgID)
      .where('[constantID.code]', '=', 'hrResponsAbbr')
      .selectScalar() || 'В.о.'
    // signEmp2Pos = (responsAbbr) + ' ' + (dataEx['employeePositionTempID.positionID.nameGen'] || dataEx['employeePositionTempID.positionID.name'] || '').toLowerCase()
    let posName = (dataEx['employeePositionTempID.positionID.nameGen'] || dataEx['employeePositionTempID.positionID.name'] || '').toLowerCase()
    if (useActualPositionName && dataEx.employeePositionTempID) {
      const posGen = getFactNameGen(dataEx.employeePositionTempID, params.periodTo, useSexType)
      posName = posGen || posName
    }
    signEmp2Pos = (responsAbbr) + ' ' + posName
  } else {
    signEmp2Pos = params.employeePositionID ? UB.Repository('hr_employeePositionSR')
      .attrsIf(!useActualPositionName, 'posName')
      .attrsIf(useActualPositionName, 'factPosition')
      .where('ID', '=', params.employeePositionID)
      .selectScalar() : ''
  }

  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)

  const hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)
  const orgName = hrOrg['name']
  const dateFromArr = dateService.formatDate(params.periodFrom, 'dd.mmm.yy').split('.')
  const dateToArr = dateService.formatDate(params.periodTo, 'dd.mmm.yy').split('.')

  const selectedRows = JSON.parse(params.selectedRows)
  const allSourceIDs = selectedRows.map(row => row.sourceID)
  const allAccrual = {}

  let accrualDS = UB.DataStore('hr_accrual')
  accrualDS.runSQL(`SELECT A01.sourceID as "sourceID", A01.employeeNumberID as "employeeNumberID", A02.pYear as "year", A06.name as "month",
  COALESCE(CASE WHEN A01.rate > 0 THEN A01.basePayment ELSE A01.baseSum END,0) as "paymentSum", 
  COALESCE(CASE WHEN A01.rate > 0 THEN (A01.basePayment - A01.baseSum) ELSE 0 END,0) as "taxSum",
  A01.rate, COALESCE(A01.paySum, 0) as "paySum", A07.orderNumber as "orderNumber", A07.orderDate as "orderDate",
  (COALESCE(A01.incomingDebtSum, 0) + COALESCE(A01.calculatedSum, 0) - COALESCE(A01.repaymentDebtSum, 0) -
   COALESCE(A01.repaymentSum, 0)) AS "debtSum", A01.orderID as "orderID", A01.periodCalcID as "periodCalcID"
FROM hr_accrual A01 
INNER JOIN hr_dictPeriod A02 ON A02.ID = A01.periodCalcID AND A02.orgID = :orgID: AND A02.mi_deleteDate >= '9999-12-31' 
INNER JOIN hr_employeeNumber A03 on A03.ID = a01.employeeNumberID AND A03.orgID = :orgID: AND A03.mi_deleteDate >= '9999-12-31' 
INNER JOIN hr_payEl A04 on A04.ID = A01.payElID 
INNER JOIN hr_method A05 on A05.ID = A04.methodID AND A05.code in ('31', '61')
LEFT JOIN ac_dictMonth A06 ON A06.ID = A02.dictMonthID 
LEFT JOIN hr_payRoll A07 on A07.ID=A01.orderID AND A07.mi_deleteDate >= '9999-12-31' 
WHERE A01.sourceID in (${allSourceIDs.join(',') || -1})
${limitedAccess ? ' AND A03.limitedAccess = 0 ' : ''} 
AND A02.dateFrom <= :dateTo: AND A02.dateTo >= :dateFrom: AND (A01.flagsRec & 8192) = 0 AND (A01.flagsRec & 4096) = 0 
ORDER BY A02.dateFrom`, { orgID: params.orgID, dateFrom: params.periodFrom, dateTo: params.periodTo })

  accrualDS.getAsJsObject().forEach(item => {
    if (!allAccrual[item.sourceID]) allAccrual[item.sourceID] = []
    allAccrual[item.sourceID].push(item)
  })

  const allPayRetention = {}
  UB.Repository('hr_payRetention')
    .attrs('ID', 'docDate', 'docNumber', "COALESCE([execNameDoc], '&nbsp;')", 'docExecutive')
    .where('ID', 'in', allSourceIDs)
    .selectAsObject({
      "COALESCE([execNameDoc], '&nbsp;')": 'execNameDoc'
    }).forEach(payRetention => {
      allPayRetention[payRetention.ID] = payRetention
    })

  const allEmployeeFullFIO = {}
  UB.Repository('hr_employeeNumberS')
    .attrs('ID', 'employeeID.fullFIO')
    .where('ID', 'in', selectedRows.map(row => row.employeeNumberID))
    .selectAsObject({ 'employeeID.fullFIO': 'fullFIO' }).forEach(employee => {
      allEmployeeFullFIO[employee.ID] = employee
    })

  selectedRows.forEach(row => {
    const accrual = allAccrual[row.sourceID]
    const payRetention = allPayRetention[row.sourceID] || {}

    if (payRetention.docDate) payRetention.docDate = dateService.formatDate(payRetention.docDate)
    if (!payRetention.execNameDoc) payRetention.execNameDoc = '&nbsp;'
    const employeeFullFIO = allEmployeeFullFIO[row.employeeNumberID] ? allEmployeeFullFIO[row.employeeNumberID].fullFIO : '&nbsp;'

    const accrualGrouped = {}

    let summary = {
      paySum: 0,
      paySum1: 0,
      paySum2: 0
    }
    accrual.forEach(item => {
      // 2.Згрупувати вибрані записи (Період; Відсоток; Відомість виплати)
      const group = item.periodCalcID + item.rate + item.orderID
      let currGroup
      if (!accrualGrouped[group]) {
        accrualGrouped[group] = {
          year: item.year,
          month: item.month,
          paySum1: 0, // 10. sum(hr_accrual.paySum)
          paySum2: 0, // 11. sum(hr_accrual.paySum)
          rate: item.rate,
          paySum: 0,
          orderNumberDate: item.orderNumber ? UB.i18n(`{0} від {1}`, item.orderNumber, dateService.formatDate(item.orderDate)) : '',
          debtSum: 0
        }
      }
      currGroup = accrualGrouped[group]
      item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
      item.debtSum = item.debtSum ? currencyService.round(item.debtSum, 2) : 0
      item.paymentSum = item.paymentSum ? currencyService.round(item.paymentSum, 2) : 0
      item.taxSum = item.taxSum ? currencyService.round(item.taxSum, 2) : 0

      summary.paySum += item.paySum ? currencyService.round(item.paySum, 2) : 0
      summary.paySum1 += item.paymentSum ? currencyService.round(item.paymentSum, 2) : 0
      summary.paySum2 += item.taxSum ? currencyService.round(item.taxSum, 2) : 0

      currGroup.paySum = currencyService.round(currGroup.paySum += item.paySum, 2) // Сума
      currGroup.debtSum = currencyService.round(currGroup.debtSum += item.debtSum, 2)// Сума заборгованості
      currGroup.paySum1 = currencyService.round(currGroup.paySum1 += item.paymentSum, 2) // Нараховано
      currGroup.paySum2 = currencyService.round(currGroup.paySum2 += item.taxSum, 2)// Утримано
    })

    summary.paySum = getFixed2Val(summary.paySum)
    summary.paySum1 = getFixed2Val(summary.paySum1)
    summary.paySum2 = getFixed2Val(summary.paySum2)

    const tableRows = []
    Object.keys(accrualGrouped).forEach(group => {
      let currGroup = accrualGrouped[group]
      currGroup.paySum1 = getFixed2Val(currGroup.paySum1)
      currGroup.paySum2 = getFixed2Val(currGroup.paySum2)
      currGroup.paySum = getFixed2Val(currGroup.paySum)

      currGroup.debtSum = currGroup.debtSum > 0 ? UB.i18n(`Залишок несплаченої суми заборгованості складає {0}`, getFixed2Val(currGroup.debtSum)) : ''

      tableRows.push(currGroup)
    })

    data.push({
      payRetention,
      orgName,
      signEmp2ShortFIO,
      signEmp2Pos,
      signEmp2: !!params.employeeNumberID,
      accEmployeePos,
      accEmployeeShortFIO,
      employeeFullFIO,
      tableRows,
      summary,
      dateFromD: dateFromArr[0],
      dateFromM: dateFromArr[1],
      dateFromY: dateFromArr[2],
      dateToD: dateToArr[0],
      dateToM: dateToArr[1],
      dateToY: dateToArr[2]
    })
  })

  if (data.length) data[data.length - 1].isLast = true
  ctx.mParams.resultData = JSON.stringify({ docs: data })
}

me.selectAccrualForPayment = ctx => {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const sqlDialect = entityBaseService.getSQLDialect()
  ctx.dataStore.runSQL(`SELECT accrual.C1 AS "tabNum", accrual.C2 AS "fullFIO",
  CONCAT('№ ', B01.docNumber, ' від ', ${sqlDialect.dialect === 'MSSQL2012'
    ? `convert(varchar, B01.docDate, 104)` : `to_char(B01.docDate, 'DD.MM.YYYY')`}) AS "docNumberDate", B02.fullName AS "contractorFullName",
  B01.dateFrom AS "dateFrom", (case ${sqlDialect.dialect === 'MSSQL2012' ? 'year(B01.dateTo)' : 'Extract(YEAR from B01.dateTo)'} when 9999 then null else B01.dateTo end) AS "dateTo",
   accrual.C3 AS "paySum", accrual.sourceID as "sourceID", accrual.employeeNumberID as "employeeNumberID", B01.payElID as "payElID"
from
(SELECT
  A02.tabNum AS C1,
  A03.fullFIO     AS C2,
  sum(A01.paySum) AS C3,
  A01.sourceID,
  A01.employeeNumberID
FROM hr_accrual A01 INNER JOIN hr_employeeNumber A02 ON A02.ID = A01.employeeNumberID AND A02.mi_deleteDate>='9999-12-31'
  LEFT JOIN hr_payEl A06 ON A06.ID = A01.payElID
  LEFT JOIN hr_employee A03 ON A03.ID = A02.employeeID
  LEFT JOIN hr_method A07 ON A07.ID = A06.methodID
  LEFT JOIN hr_dictPeriod A08 ON A08.ID=A01.periodCalcID
WHERE A07.code in ('31', '61') AND A08.dateFrom <= :dateTo: AND A08.dateTo >= :dateFrom: and A02.orgID=:orgID:
AND A01.flagsRec & 8192 != 8192
${limitedAccess ? ' AND A02.limitedAccess = 0 ' : ''}
GROUP BY A01.employeeNumberID, A02.tabNum, A03.fullFIO, A01.sourceID) accrual
LEFT JOIN hr_payRetention B01 ON B01.ID=accrual.sourceID AND B01.mi_deleteDate >='9999-12-31'
LEFT JOIN ac_contractor B02 ON B02.ID = B01.contractorID AND B02.mi_deleteDate >='9999-12-31'
ORDER BY accrual.C2, B02.fullName`, {
    dateFrom: ctx.mParams.customParams.dateFrom,
    dateTo: ctx.mParams.customParams.dateTo,
    orgID: ctx.mParams.customParams.orgID
  })
}

me.getCreditReportData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getCreditReportData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getIncTaxReportData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getIncTaxData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPayrollEmbassyData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getPayrollEmbassyData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPayrollRequireData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getPayrollRequireData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAvgSalary13Data = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getAvgSalary13Data(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAvgSalaryMainData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getAvgSalaryMainData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAvgSalaryFSSData = ctx => {
  let params = ctx.mParams.execParams
  const reportData = employeeReport.getAvgSalaryFSSData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getCalcFundsData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getCalcFundsData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getMinWageData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getMinWageData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPeriodDepartmentData = ctx => {
  const params = ctx.mParams.execParams
  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  const period = UB.Repository('hr_dictPeriod').attrs('name', 'dateFrom', 'dateTo')
    .where('ID', '=', params.periodID).selectSingle()

  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs('name')
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodTo })
    .selectScalar() : null

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  staffUnitStore.runSQL(`  SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
   u.mi_unityEntity as "mi_unityEntity", dep.description as "depdescription"
    FROM hr_staffUnit u 
      LEFT JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID = :orgID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :orgID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
    orgID: params.orgID,
    dateTo: params.periodTo
  })
  const orgStruct = staffUnitStore.getAsJsObject()
  staffUnitStore.freeNative()

  ctx.mParams.resultData = JSON.stringify({
    period: period.name,
    department: department && params.includeSubDep ? UB.i18n(`{0} (з підлеглими)`, department) : department || '',
    orgStruct
  })
}

me.getDeducTaxData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getDeducTaxData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getDeducMilitaryTaxData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getDeducMilitaryTaxData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAccrualReleasedData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getAccrualReleasedData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAlimentData = ctx => {
  const params = ctx.mParams.execParams
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let extendedFieldList = params.extendedFieldList ? JSON.parse(params.extendedFieldList) : null
  let gridData = params.gridData ? JSON.parse(params.gridData) : []
  let filtersItems = params.filtersItems ? JSON.parse(params.filtersItems) : []
  let sortersItems = params.sortersItems ? JSON.parse(params.sortersItems) : []
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  let orgIDs = []
  let orgNames = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
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
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    const org = UB.Repository('hr_organization')
      .attrs(['treePath', 'description'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    orgNames.push({
      ID: orgID,
      treePath: org ? org.treePath : '',
      description: org ? org.description : ''
    })
  })
  orgNames.sort((a, b) => a.treePath < b.treePath ? -1 : 1)

  const periodIds = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom')
    .where('ID', 'in', periodIds)
    .orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })
  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.periodTo)
        .where('mi_dateTo', '>=', params.periodTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }

  const accrualDt = UB.Repository('hr_accrualDt')
    .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictFundSourceID.name'])
    .where('accrualID', 'in', gridData.map(o => o.accrualID))
    .orderBy('accrualID')
    .selectAsObject()

  let dictFundSourceList = []
  accrualDt.forEach(el => {
    if (!dictFundSourceList.find(o => o.dictFundSourceID === el.dictFundSourceID)) {
      dictFundSourceList.push({
        dictFundSourceID: el.dictFundSourceID,
        dictFundSourceName: el['dictFundSourceID.name'] || 'Без джерела фінансування'
      })
    }
  })
  if (!dictFundSourceList.length) {
    dictFundSourceList.push({
      dictFundSourceID: null,
      dictFundSourceName: 'Без джерела фінансування'
    })
  }

  let fundSourceColCount = (params.includeFundSourceBlock ? dictFundSourceList.length : 0)
  let fundSourceColWidth = fundSourceColCount * 100
  let allColumnCount = 20 + fundSourceColCount
  let sheetWidth = 1540 + fundSourceColWidth

  function compareEmps (a, b) {
    return a.tabNumSort === b.tabNumSort ? b.tabNumSort - a.tabNumSort : a.tabNumSort - b.tabNumSort
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { incomingDebtSum: 0, calculatedSum: 0, paySum: 0, debt: 0, fundSumList: [] }
    }
    dictFundSourceList.forEach(el => curNode.calcSum.allSum.fundSumList.push({ fundSum: 0 }))

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.incomingDebtSum = currencyService.round(curNode.calcSum.allSum.incomingDebtSum += el.incomingDebtSum || 0, 2)
          curNode.calcSum.allSum.calculatedSum = currencyService.round(curNode.calcSum.allSum.calculatedSum += el.calculatedSum || 0, 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.debt = currencyService.round(curNode.calcSum.allSum.debt += el.debt || 0, 2)

          let idx = 0
          curNode.calcSum.allSum.fundSumList = curNode.calcSum.allSum.fundSumList.map(o => {
            o.fundSum = currencyService.round(o.fundSum += el.dictFundList[idx].paySumFund || 0, 2)
            idx++
            return o
          })
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)

        curNode.calcSum.allSum.incomingDebtSum = currencyService.round(curNode.calcSum.allSum.incomingDebtSum += cur.calcSum.allSum.incomingDebtSum || 0, 2)
        curNode.calcSum.allSum.calculatedSum = currencyService.round(curNode.calcSum.allSum.calculatedSum += cur.calcSum.allSum.calculatedSum || 0, 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.debt = currencyService.round(curNode.calcSum.allSum.debt += cur.calcSum.allSum.debt || 0, 2)

        let idx = 0
        curNode.calcSum.allSum.fundSumList = curNode.calcSum.allSum.fundSumList.map(o => {
          o.fundSum = currencyService.round(o.fundSum += cur.calcSum.allSum.fundSumList[idx].fundSum || 0, 2)
          idx++
          return o
        })
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
      }

      depts.push(depart)
    }
    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  const allSum = {
    incomingDebtSum: 0,
    calculatedSum: 0,
    paySum: 0,
    debt: 0
  }
  const notes = []
  let sorter
  let depts = []

  filtersItems.forEach(filt => {
    const curFilter = extendedFieldList.find(el => el.name === filt.property)
    notes.push({ filterName: `${curFilter.description}:`, value: filt.value })
  })

  // round and num
  gridData.forEach((item, i) => {
    item.incomingDebtSum = item.incomingDebtSum ? currencyService.round(item.incomingDebtSum, 2) : 0
    item.calculatedSum = item.calculatedSum ? currencyService.round(item.calculatedSum, 2) : 0
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.debt = item.debt ? currencyService.round(item.debt, 2) : 0

    // const sumsArr = ['incomingDebtSum', 'calculatedSum', 'paySum', 'debt']
    allSum.incomingDebtSum = currencyService.round(allSum.incomingDebtSum += item.incomingDebtSum, 2)
    allSum.calculatedSum = currencyService.round(allSum.calculatedSum += item.calculatedSum, 2)
    allSum.paySum = currencyService.round(allSum.paySum += item.paySum, 2)
    allSum.debt = currencyService.round(allSum.debt += item.debt, 2)

    item.dictFundList = []
    let accrualDtRow = accrualDt.filter(o => o.accrualID === item.accrualID)
    item.includeFundSourceBlock = params.includeFundSourceBlock
    dictFundSourceList.forEach(el => {
      let paySumFund = accrualDtRow.find(o => o.dictFundSourceID === el.dictFundSourceID) ? accrualDtRow.find(o => o.dictFundSourceID === el.dictFundSourceID).paySum : 0
      item.dictFundList.push({ paySumFund: currencyService.round(paySumFund, 2) })
    })
  })

  if (sortersItems[0]) sorter = sortersItems[0].property

  orgNames.forEach(org => {
    if (gridData.filter(o => o.orgID === org.ID).length) {
      if (params.organizationID && params.includeSubOrg) {
        depts.push({
          emps: [],
          isGroupDep: true,
          isOrg: true,
          dept: { colCount: allColumnCount, deptName: org.description }
        })
      }
      staffUnitStore.runSQL(`  SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
     u.mi_unityEntity as "mi_unityEntity", dep.description as "depdescription", u.idxNum
      FROM hr_staffUnit u 
        LEFT JOIN hr_department dep ON dep.ID = u.ID      
      WHERE
        u.orgID = :orgID:
        and u.mi_deleteDate >= '9999-12-31' 
        and u.state = 'ACTIVE' 
        and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = u.orgID 
        and u2.mi_data_id = u.mi_data_id 
        and u2.mi_deleteDate >= '9999-12-31' 
        and u2.state = 'ACTIVE' 
        order by u2.mi_dateFrom desc ${sqlDialect.limit})    
      ORDER BY u.treePath   
    `, {
        orgID: org.ID,
        dateTo: params.periodTo
      })
      const orgStruct = staffUnitStore.getAsJsObject()
      const orgTree = treeUtils.orgTree(org.ID, gridData.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)

      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
      depts.forEach(dep => {
        dep.emps.sort(compareEmps)
      })
    }
  })

  staffUnitStore.freeNative()

  let num = 0
  depts.forEach((item) => { item.emps.forEach((emp) => { emp.num = num + 1; num++ }) })

  ctx.mParams.resultData = JSON.stringify({
    period: periodName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    department: depName,
    allSum,
    notes,
    sorter,
    depts,
    allColumnCount,
    fundSourceColCount,
    sheetWidth,
    dictFundSourceList,
    includeFundSourceBlock: params.includeFundSourceBlock
  })
}

me.getUnionPayData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getUnionPayData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getPaySummary = ctx => {
  const params = ctx.mParams.execParams
  const resultData = consolReport.getPaySummaryData(params)
  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getTimeCostData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getTimeCostData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getControlCalcVacReserveData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getControlCalcVacReserveData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getBonusData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getBonusData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getVacationData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getVacationData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getConsolCateg = ctx => {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getConsolCategData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getSickRegister = ctx => {
  const params = ctx.mParams.execParams
  const reportData = accrualReport.getSickRegisterData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getRLData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = employeeReport.getRLData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getRLMonthData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = employeeReport.getRLMonthData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}
me.getRLMonthDataEdu = ctx => {
  const params = ctx.mParams.execParams
  const reportData = employeeReport.getRLMonthDataEdu(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}
me.getInfoCard = ctx => {
  const params = ctx.mParams.execParams
  const reportData = employeeReport.getInfoCardData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getFOPData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getFOPData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getListAppointDismissEmployes = ctx => {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getAppointDismissEmployesData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getInformationAboutSystemUsers = ctx => {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getInformationAboutSystemUsersData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

function getFOPSectionData (colListYesCostWorkList, colListNotCostWorkList, payElList, periodSalaryIDList, periodCalcName, payElIDsOfSection, params, periods, isExclude = false) {
  let section = []
  let sectionSummary = {
    periodCalcName: periodCalcName,
    yesCostWorkCatSum: { },
    notCostWorkCatSum: { },
    staffSum_all: 0,
    otherSum_all: 0,
    allSum_all: 0,

    yesCostWorkCatSum_calc: { },
    notCostWorkCatSum_calc: { },
    staffSum_calc: 0,
    otherSum_calc: 0,
    allSum_calc: 0,

    yesCostWorkCatSum_otherPeriods: { },
    notCostWorkCatSum_otherPeriods: { },
    staffSum_otherPeriods: 0,
    otherSum_otherPeriods: 0,
    allSum_otherPeriods: 0
  }
  colListYesCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.yesCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  colListNotCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.notCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  if (!sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  if (!sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  payElList.forEach(payEl => {
    let cond = (!isExclude ? payElIDsOfSection.includes(payEl.payElID) : !payElIDsOfSection.includes(payEl.payElID))
    if (cond) {
      let lineCounter = 0
      let colListYesCostWorkPayEl = []
      let colListNotCostWorkPayEl = []
      let staffSumPayEl = 0
      let otherSumPayEl = 0
      let allSumPayEl = 0

      let periodSalaryList = periodSalaryIDList.map(periodSalary => {
        let tempListYesCostWork = {}
        Object.keys(payEl.listYesCostWork).forEach(key => {
          tempListYesCostWork[key] = payEl.listYesCostWork[key].filter(o => o.periodSalary === periodSalary)
        })

        let tempListNotCostWork = {}
        Object.keys(payEl.listNotCostWork).forEach(key => {
          tempListNotCostWork[key] = payEl.listNotCostWork[key].filter(o => o.periodSalary === periodSalary)
        })

        let tempListOtherWork = {}
        Object.keys(payEl.listOtherWork).forEach(key => {
          tempListOtherWork[key] = payEl.listOtherWork[key].filter(o => o.periodSalary === periodSalary)
        })
        return {
          periodSalary,
          listYesCostWork: tempListYesCostWork,
          listNotCostWork: tempListNotCostWork,
          listOtherWork: tempListOtherWork
        }
      })
      periodSalaryList.forEach(period => {
        let colListYesCostWork = []
        let colListNotCostWork = []
        let staffSum = 0
        let otherSum = 0
        let yesCostWorkSum = 0
        let notCostWorkSum = 0

        Object.keys(period.listYesCostWork).forEach(key => {
          let sumForCat = 0
          period.listYesCostWork[key].forEach(accrual => {
            sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
            // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
              sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? sectionSummary.yesCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_calc += accrual['sum([paySum])']
            } else {
              sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? sectionSummary.yesCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
            }
          })
          staffSum += sumForCat
          yesCostWorkSum += sumForCat
          colListYesCostWork.push({
            catName: key,
            value: currencyService.round(sumForCat)
          })
          let index = colListYesCostWorkPayEl.findIndex(el => el.catName === key)
          if (index >= 0) {
            colListYesCostWorkPayEl[index].value = currencyService.round(colListYesCostWorkPayEl[index].value + sumForCat)
          } else {
            colListYesCostWorkPayEl.push({
              catName: key,
              value: currencyService.round(sumForCat)
            })
          }
          sectionSummary.yesCostWorkCatSum[key] = sectionSummary.yesCostWorkCatSum[key] ? sectionSummary.yesCostWorkCatSum[key] + sumForCat : sumForCat
          sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_calc[key]) : 0
          sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_otherPeriods[key]) : 0
        })
        colListYesCostWork.push({
          catName: 'Всього',
          value: currencyService.round(yesCostWorkSum)
        })
        let index = colListYesCostWorkPayEl.findIndex(el => el.catName === 'Всього')
        if (index >= 0) {
          colListYesCostWorkPayEl[index].value = currencyService.round(colListYesCostWorkPayEl[index].value + yesCostWorkSum)
        } else {
          colListYesCostWorkPayEl.push({
            catName: 'Всього',
            value: currencyService.round(yesCostWorkSum)
          })
        }
        sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] + yesCostWorkSum)

        Object.keys(period.listNotCostWork).forEach(key => {
          let sumForCat = 0
          period.listNotCostWork[key].forEach(accrual => {
            sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
            // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
              sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? sectionSummary.notCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_calc += accrual['sum([paySum])']
            } else {
              sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? sectionSummary.notCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
            }
          })
          staffSum += sumForCat
          notCostWorkSum += sumForCat
          colListNotCostWork.push({
            catName: key,
            value: currencyService.round(sumForCat)
          })
          let index = colListNotCostWorkPayEl.findIndex(el => el.catName === key)
          if (index >= 0) {
            colListNotCostWorkPayEl[index].value = currencyService.round(colListNotCostWorkPayEl[index].value + sumForCat)
          } else {
            colListNotCostWorkPayEl.push({
              catName: key,
              value: currencyService.round(sumForCat)
            })
          }
          sectionSummary.notCostWorkCatSum[key] = sectionSummary.notCostWorkCatSum[key] ? sectionSummary.notCostWorkCatSum[key] + sumForCat : sumForCat
          sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_calc[key]) : 0
          sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_otherPeriods[key]) : 0
        })
        colListNotCostWork.push({
          catName: 'Всього',
          value: currencyService.round(notCostWorkSum)
        })
        index = colListNotCostWorkPayEl.findIndex(el => el.catName === 'Всього')
        if (index >= 0) {
          colListNotCostWorkPayEl[index].value = currencyService.round(colListNotCostWorkPayEl[index].value + notCostWorkSum)
        } else {
          colListNotCostWorkPayEl.push({
            catName: 'Всього',
            value: currencyService.round(notCostWorkSum)
          })
        }
        sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] + notCostWorkSum)

        Object.keys(period.listOtherWork).forEach(key => {
          period.listOtherWork[key].forEach(accrual => {
            otherSum += accrual['sum([paySum])']
            // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
              sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc + accrual['sum([paySum])'])
            } else {
              sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods + accrual['sum([paySum])'])
            }
          })
        })

        sectionSummary.staffSum_all += staffSum
        sectionSummary.otherSum_all += otherSum
        sectionSummary.allSum_all += otherSum + staffSum

        staffSumPayEl = currencyService.round(staffSumPayEl + staffSum)
        otherSumPayEl = currencyService.round(otherSumPayEl + otherSum)
        allSumPayEl = currencyService.round(staffSumPayEl + otherSumPayEl)

        sectionSummary.allSum_calc = sectionSummary.staffSum_calc + sectionSummary.otherSum_calc
        sectionSummary.allSum_otherPeriods = sectionSummary.staffSum_otherPeriods + sectionSummary.otherSum_otherPeriods

        if (staffSum !== 0 || otherSum !== 0) {
          const periodSalaryName = periods.find(o => o.dateFrom.getTime() === dateService.shiftDate(period.periodSalary).getTime())
          lineCounter++
          section.push({
            isPayElLine: true,
            payElName: payEl.payElName,
            payElCode: payEl.payElCode,
            periodSalaryName: periodSalaryName ? periodSalaryName.name : '',
            colListYesCostWork,
            colListNotCostWork,
            staffSum: currencyService.round(staffSum),
            otherSum: currencyService.round(otherSum),
            allSum: currencyService.round(staffSum + otherSum)
          })
        }
      })

      if (lineCounter > 1) {
        section.push({
          isSubSumLine: true,
          payElName: payEl.payElName,
          colListYesCostWork: colListYesCostWorkPayEl,
          colListNotCostWork: colListNotCostWorkPayEl,
          staffSum: currencyService.round(staffSumPayEl),
          otherSum: currencyService.round(otherSumPayEl),
          allSum: currencyService.round(allSumPayEl)
        })
      }
    }
  })

  let yesCostWorkCatSumList = []
  let notCostWorkCatSumList = []
  let yesCostWorkCatSumListCalc = []
  let notCostWorkCatSumListCalc = []
  let yesCostWorkCatSumListOtherPeriods = []
  let notCostWorkCatSumListOtherPeriods = []
  Object.keys(sectionSummary.yesCostWorkCatSum).forEach(key => yesCostWorkCatSumList.push({ value: sectionSummary.yesCostWorkCatSum[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum).forEach(key => notCostWorkCatSumList.push({ value: sectionSummary.notCostWorkCatSum[key] }))
  sectionSummary.yesCostWorkCatSum = yesCostWorkCatSumList
  sectionSummary.notCostWorkCatSum = notCostWorkCatSumList

  Object.keys(sectionSummary.yesCostWorkCatSum_calc).forEach(key => yesCostWorkCatSumListCalc.push({ value: sectionSummary.yesCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_calc).forEach(key => notCostWorkCatSumListCalc.push({ value: sectionSummary.notCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.yesCostWorkCatSum_otherPeriods).forEach(key => yesCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.yesCostWorkCatSum_otherPeriods[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_otherPeriods).forEach(key => notCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.notCostWorkCatSum_otherPeriods[key] }))

  let yesCostWorkCatSumCalcSum = 0
  let notCostWorkCatSumCalcSum = 0
  let yesCostWorkCatSumOtherPeriodsSum = 0
  let notCostWorkCatSumOtherPeriodsSum = 0

  yesCostWorkCatSumListCalc.forEach(el => {
    yesCostWorkCatSumCalcSum += el.value
  })
  yesCostWorkCatSumListCalc.push({ value: currencyService.round(yesCostWorkCatSumCalcSum) })
  sectionSummary.yesCostWorkCatSum_calc = yesCostWorkCatSumListCalc

  notCostWorkCatSumListCalc.forEach(el => {
    notCostWorkCatSumCalcSum += el.value
  })
  notCostWorkCatSumListCalc.push({ value: currencyService.round(notCostWorkCatSumCalcSum) })
  sectionSummary.notCostWorkCatSum_calc = notCostWorkCatSumListCalc

  yesCostWorkCatSumListOtherPeriods.forEach(el => {
    yesCostWorkCatSumOtherPeriodsSum += el.value
  })
  yesCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(yesCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.yesCostWorkCatSum_otherPeriods = yesCostWorkCatSumListOtherPeriods

  notCostWorkCatSumListOtherPeriods.forEach(el => {
    notCostWorkCatSumOtherPeriodsSum += el.value
  })
  notCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(notCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.notCostWorkCatSum_otherPeriods = notCostWorkCatSumListOtherPeriods

  sectionSummary.staffSum_all = currencyService.round(sectionSummary.staffSum_all)
  sectionSummary.otherSum_all = currencyService.round(sectionSummary.otherSum_all)
  sectionSummary.allSum_all = currencyService.round(sectionSummary.allSum_all)
  sectionSummary.staffSum_calc = currencyService.round(sectionSummary.staffSum_calc)
  sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc)
  sectionSummary.allSum_calc = currencyService.round(sectionSummary.allSum_calc)
  sectionSummary.staffSum_otherPeriods = currencyService.round(sectionSummary.staffSum_otherPeriods)
  sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods)
  sectionSummary.allSum_otherPeriods = currencyService.round(sectionSummary.allSum_otherPeriods)

  return { section, sectionSummary }
}

function getFOPDepSectionData (colListYesCostWorkList, colListNotCostWorkList, departmentList, periodCalcName, payElIDsOfSection, params) {
  let section = []
  let sectionSummary = {
    periodCalcName: periodCalcName,
    yesCostWorkCatSum: { },
    notCostWorkCatSum: { },
    staffSum_all: 0,
    otherSum_all: 0,
    allSum_all: 0,

    yesCostWorkCatSum_calc: { },
    notCostWorkCatSum_calc: { },
    staffSum_calc: 0,
    otherSum_calc: 0,
    allSum_calc: 0,

    yesCostWorkCatSum_otherPeriods: { },
    notCostWorkCatSum_otherPeriods: { },
    staffSum_otherPeriods: 0,
    otherSum_otherPeriods: 0,
    allSum_otherPeriods: 0
  }
  colListYesCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.yesCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  colListNotCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.notCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  if (!sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  if (!sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }

  departmentList.forEach(department => {
    let colListYesCostWork = []
    let colListNotCostWork = []
    let staffSum = 0
    let otherSum = 0
    let yesCostWorkSum = 0
    let notCostWorkSum = 0

    Object.keys(department.listYesCostWork).forEach(key => {
      let sumForCat = 0
      department.listYesCostWork[key].forEach(accrual => {
        sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
          sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? sectionSummary.yesCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_calc += accrual['sum([paySum])']
        } else {
          sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? sectionSummary.yesCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
        }
      })
      staffSum += sumForCat
      yesCostWorkSum += sumForCat
      colListYesCostWork.push({
        catName: key,
        value: currencyService.round(sumForCat)
      })
      sectionSummary.yesCostWorkCatSum[key] = sectionSummary.yesCostWorkCatSum[key] ? sectionSummary.yesCostWorkCatSum[key] + sumForCat : sumForCat
      sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_calc[key]) : 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_otherPeriods[key]) : 0
    })
    colListYesCostWork.push({
      catName: 'Всього',
      value: currencyService.round(yesCostWorkSum)
    })
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] + yesCostWorkSum)

    Object.keys(department.listNotCostWork).forEach(key => {
      let sumForCat = 0
      department.listNotCostWork[key].forEach(accrual => {
        sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
          sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? sectionSummary.notCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_calc += accrual['sum([paySum])']
        } else {
          sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? sectionSummary.notCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
        }
      })
      staffSum += sumForCat
      notCostWorkSum += sumForCat
      colListNotCostWork.push({
        catName: key,
        value: currencyService.round(sumForCat)
      })
      sectionSummary.notCostWorkCatSum[key] = sectionSummary.notCostWorkCatSum[key] ? sectionSummary.notCostWorkCatSum[key] + sumForCat : sumForCat
      sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_calc[key]) : 0
      sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_otherPeriods[key]) : 0
    })
    colListNotCostWork.push({
      catName: 'Всього',
      value: currencyService.round(notCostWorkSum)
    })
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] + notCostWorkSum)

    Object.keys(department.listOtherWork).forEach(key => {
      department.listOtherWork[key].forEach(accrual => {
        otherSum += accrual['sum([paySum])']
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodFrom.getTime()) {
          sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc + accrual['sum([paySum])'])
        } else {
          sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods + accrual['sum([paySum])'])
        }
      })
    })

    sectionSummary.staffSum_all += staffSum
    sectionSummary.otherSum_all += otherSum
    sectionSummary.allSum_all += otherSum + staffSum

    sectionSummary.allSum_calc = sectionSummary.staffSum_calc + sectionSummary.otherSum_calc
    sectionSummary.allSum_otherPeriods = sectionSummary.staffSum_otherPeriods + sectionSummary.otherSum_otherPeriods

    if (staffSum !== 0 || otherSum !== 0) {
      section.push({
        departmentName: department.departmentName ? department.departmentName : !params.departmentID ? params.organizationName : params.departmentName,
        colListYesCostWork,
        colListNotCostWork,
        staffSum: currencyService.round(staffSum),
        otherSum: currencyService.round(otherSum),
        allSum: currencyService.round(staffSum + otherSum)
      })
    }
  })

  let yesCostWorkCatSumList = []
  let notCostWorkCatSumList = []
  let yesCostWorkCatSumListCalc = []
  let notCostWorkCatSumListCalc = []
  let yesCostWorkCatSumListOtherPeriods = []
  let notCostWorkCatSumListOtherPeriods = []
  Object.keys(sectionSummary.yesCostWorkCatSum).forEach(key => yesCostWorkCatSumList.push({ value: sectionSummary.yesCostWorkCatSum[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum).forEach(key => notCostWorkCatSumList.push({ value: sectionSummary.notCostWorkCatSum[key] }))
  sectionSummary.yesCostWorkCatSum = yesCostWorkCatSumList
  sectionSummary.notCostWorkCatSum = notCostWorkCatSumList

  Object.keys(sectionSummary.yesCostWorkCatSum_calc).forEach(key => yesCostWorkCatSumListCalc.push({ value: sectionSummary.yesCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_calc).forEach(key => notCostWorkCatSumListCalc.push({ value: sectionSummary.notCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.yesCostWorkCatSum_otherPeriods).forEach(key => yesCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.yesCostWorkCatSum_otherPeriods[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_otherPeriods).forEach(key => notCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.notCostWorkCatSum_otherPeriods[key] }))

  let yesCostWorkCatSumCalcSum = 0
  let notCostWorkCatSumCalcSum = 0
  let yesCostWorkCatSumOtherPeriodsSum = 0
  let notCostWorkCatSumOtherPeriodsSum = 0

  yesCostWorkCatSumListCalc.forEach(el => {
    yesCostWorkCatSumCalcSum += el.value
  })
  yesCostWorkCatSumListCalc.push({ value: currencyService.round(yesCostWorkCatSumCalcSum) })
  sectionSummary.yesCostWorkCatSum_calc = yesCostWorkCatSumListCalc

  notCostWorkCatSumListCalc.forEach(el => {
    notCostWorkCatSumCalcSum += el.value
  })
  notCostWorkCatSumListCalc.push({ value: currencyService.round(notCostWorkCatSumCalcSum) })
  sectionSummary.notCostWorkCatSum_calc = notCostWorkCatSumListCalc

  yesCostWorkCatSumListOtherPeriods.forEach(el => {
    yesCostWorkCatSumOtherPeriodsSum += el.value
  })
  yesCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(yesCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.yesCostWorkCatSum_otherPeriods = yesCostWorkCatSumListOtherPeriods

  notCostWorkCatSumListOtherPeriods.forEach(el => {
    notCostWorkCatSumOtherPeriodsSum += el.value
  })
  notCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(notCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.notCostWorkCatSum_otherPeriods = notCostWorkCatSumListOtherPeriods

  sectionSummary.staffSum_all = currencyService.round(sectionSummary.staffSum_all)
  sectionSummary.otherSum_all = currencyService.round(sectionSummary.otherSum_all)
  sectionSummary.allSum_all = currencyService.round(sectionSummary.allSum_all)
  sectionSummary.staffSum_calc = currencyService.round(sectionSummary.staffSum_calc)
  sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc)
  sectionSummary.allSum_calc = currencyService.round(sectionSummary.allSum_calc)
  sectionSummary.staffSum_otherPeriods = currencyService.round(sectionSummary.staffSum_otherPeriods)
  sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods)
  sectionSummary.allSum_otherPeriods = currencyService.round(sectionSummary.allSum_otherPeriods)

  return { section, sectionSummary }
}

function getListCostWork (displaySection, accrual, payElIDsGroupCats) {
  let colListCostWork = []
  let listCostWork = {}
  let listCostWorkOther = []
  accrual.filter(el => el.displaySection === displaySection).forEach(el => {
    if (el.displayCategory.length) {
      el.displayCategory.forEach(cat => {
        let catName = payElIDsGroupCats.find(o => o['listParamID.code'] === cat)['listParamID.shortName']
        if (listCostWork[catName]) {
          listCostWork[catName].push(el)
        } else {
          listCostWork[catName] = [el]
          colListCostWork.push({ colName: catName, colCode: cat })
        }
      })
    } else {
      listCostWorkOther.push(el)
    }
  })

  colListCostWork = colListCostWork.sort((a, b) => (a.colCode > b.colCode) ? 1 : ((b.colCode > a.colCode) ? -1 : 0))

  let sortedList = {}
  colListCostWork.forEach(el => {
    sortedList[el.colName] = listCostWork[el.colName]
  })

  listCostWork = sortedList
  if (listCostWorkOther.length) {
    listCostWork['Категорії групи Інші'] = listCostWorkOther
    colListCostWork.push({ colName: 'Інші' })
  }
  colListCostWork.push({ colName: 'Всього' })
  return { colListCostWork, listCostWork }
}

me.getIndividualEmpContractData = ctx => {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getIndividualEmpContractData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getAverageStatisticsData = ctx => {
  const params = ctx.mParams.execParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const typeReport = params.typeReport
  const organizationID = params.organizationID || 0
  const departmentID = params.departmentID || 0
  const dateFrom = dateService.shiftDate(typeReport === 'type3' ? params.onDate : params.dateFrom)
  const dateTo = dateService.shiftDate(typeReport === 'type3' ? params.onDate : params.dateTo)
  const onDate = dateService.shiftDate(typeReport === 'type3' ? params.onDate : params.dateTo)
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true

  const titlePeriod = params.typeReport === 'type3'
    ? UB.i18n(`станом на ${dateService.formatDate(params.onDate)}`)
    : UB.i18n(`за період з ${dateService.formatDate(params.dateFrom)} по ${dateService.formatDate(params.dateTo)}`)

  /*
  if (params.dateFrom) {
    params.dateFrom = dateService.shiftDate(params.dateFrom)
  }
  if (params.dateTo) {
    params.dateTo = dateService.shiftDate(params.dateTo)
  }
   */

  const orgs = UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'nameDat', 'nameGen', 'name'])
    .whereIf(params.includeSubOrg, 'mi_treePath', 'like', `/${organizationID}/`)
    .whereIf(!params.includeSubOrg, 'mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('mi_treePath')
    .selectAsObject()
  const childOrgIDs = orgs.map(itm => itm.mi_data_id)

  let npp = 1
  const result = {
    data: [],
    empData: [], // перелік осіб, яких є сумма нарахувань, але ми їх не враховуємо у звіті
    showEmpData: params.showPersons,
    title: [{ text: params.typeReportName }],
    departmentName: '',
    columsTitle: [
      { npp: npp++, colWidth: 70, text: '№ п/п' },
      { npp: npp++, colWidth: params.typeData === 'byPos' ? 150 : 350, text: params.typeData === 'byProfession' ? UB.i18n('Професія') : params.typeData === 'byDep' ? UB.i18n('Підрозділ') : params.typeData === 'byOrg' ? UB.i18n('Організація') : UB.i18n('Посада') }
    ]
  }
  if (params.typeData === 'byPos') {
    result.columsTitle.push({ npp: npp++, colWidth: 100, text: 'Табельний номер' })
    result.columsTitle.push({ npp: npp++, colWidth: 200, text: 'ПІБ' })
    if (params.typeReport === 'type1' || params.typeReport === 'type4') {
      result.columsTitle.push({ npp: npp++, colWidth: 80, text: 'Планова кількість  днів' })
      result.columsTitle.push({ npp: npp++, colWidth: 80, text: 'Фактична кількість  днів' })
    }
  }
  result.columsTitle.push({ npp: npp++, colWidth: 100, text: 'Чисельність' })
  result.columsTitle.push({ npp: npp++, colWidth: 100, text: 'ФОП' })
  if (params.typeData !== 'byPos' && (params.typeReport === 'type1' || params.typeReport === 'type2')) {
    result.columsTitle.push({ npp: npp++, colWidth: 100, text: 'Середня заробітна плата' })
  }
  if (params.typeData === 'byPos') {
    result.columsTitle.push({ npp: npp++, colWidth: 100, text: 'Примітки' })
  }

  result.widthTable = _.sumBy(result.columsTitle, 'colWidth')
  result.colSpan = result.columsTitle.length
  result.columsNpp = result.columsTitle.map(el => { return { npp: el.npp } })
  result.columsColWidth = result.columsTitle.map(el => { return { colWidth: el.colWidth } })
  result.columsText = result.columsTitle.map(el => { return { text: el.text } })

  const orgNames = _.find(orgs, { 'mi_data_id': organizationID })
  let str = ((orgNames && (orgNames.nameGen || orgNames.name)) || '')
  result.organizationName = typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str

  let departments = []
  if (departmentID) {
    if (params.includeSubDep) {
      const departmentData = UB.Repository('hr_department')
        .attrs(['mi_treePath'])
        .where('orgID', 'in', childOrgIDs)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_data_id', '=', departmentID)
        .misc({ __mip_recordhistory_all: true })
        .groupBy(['mi_data_id', 'mi_treePath'])
        .selectSingle()
      departments = departmentData ? UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', 'in', childOrgIDs)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_treePath', 'startsWith', departmentData.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject() : [{ 'mi_data_id': departmentID }]
      departments = departments.map(o => o.mi_data_id)
    } else {
      departments = [departmentID]
    }
  }

  const orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'orgID', 'idxNum'])
    .where('state', '=', 'ACTIVE')
    /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .whereIf(organizationID, 'orgID', 'in', childOrgIDs)
    .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
    .where('mi_unityEntity', '=', 'hr_department')
    .whereIf(departments.length, 'mi_data_id', 'in', departments)
    .orderBy('idxNum')
    .selectAsObject()

  if (!orgStruct) {
    return result
  }

  const posData = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'quantity', 'name', 'orgID', 'mi_dateFrom', 'mi_dateTo', 'dictStaffCatID', 'dictPositionKindID'])
    .attrsIf(params.typeData === 'byCategory', ['positionCategory', 'positionCategory.name', 'positionCategory.sortOrder', 'positionCategory.mi_deleteDate'])
    .attrsIf(params.typeData === 'byDictPos', ['dictPositionID', 'dictPositionID.name', 'dictPositionID.code', 'dictPositionID.mi_deleteDate'])
    .attrsIf(params.typeData === 'byProfession', ['dictPositionID.dictProfessionID', 'dictPositionID.dictProfessionID.code', 'dictPositionID.dictProfessionID.name', 'dictPositionID.dictProfessionID.mi_deleteDate'])
    .where('state', '=', 'ACTIVE')
    .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
    // .whereIf(params.dictStaffCatID, 'dictStaffCatID', '=', params.dictStaffCatID)
    // .whereIf(params.dictPositionKindID, 'dictPositionKindID', '=', params.dictPositionKindID)
    .whereIf(departments.length, 'parentUnitID', 'in', departments)
    .orderBy('ID')
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  const deptData = UB.Repository('hr_department')
    .attrs(['ID', 'dictDepTypeID.name', 'dictDepTypeID.nameGen', 'nameGen', 'nameDat', 'mi_data_id'])
    .where('orgID', 'in', childOrgIDs)
    .whereIf(departmentID, 'mi_treePath', 'like', '/' + departmentID + '/')
    .misc({ __mip_ondate: onDate })
    .joinCondition('dictDepTypeID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  orgStruct.forEach(item => {
    const deptItem = _.find(deptData, { ID: item.ID })
    const depType = deptItem ? nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || '') : ''
    item.depType = deptItem ? depType || deptItem.nameDat || item.name || '' : item.name
    item.nameDat = nameCase.cap(deptItem ? deptItem.nameDat || item.name || '' : item.name)
    if (departmentID && (item.ID === departmentID || item.mi_data_id === departmentID)) {
      result.departmentName = nameCase.cap(item.nameGen || item.name || '')
    }
  })

  const attrs = ['positionID', 'employeeID', 'employeeNumberID', 'employeeNumberID.tabNum', 'employeeNumberID.tabNumSort',
    'employeeID.shortFIO', 'workPlace', 'departmentID', 'organizationID', 'dateFrom', 'dateTo', 'employeeNumberID.dateTo']
  if (useActualPositionName) {
    attrs.push('factPosName')
  }
  const empData = UB.Repository('hr_employeePositionS')
    .attrs(attrs)
    .groupBy(attrs)
    .where('isActive', '=', true)
    .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(departments.length, 'departmentID', 'in', departments)
    .whereIf(childOrgIDs.length, 'organizationID', 'in', childOrgIDs)
    .orderBy('employeeID.shortFIO')
    .orderBy('employeeNumberID.tabNum')
    .where('dateFrom', '<=', params.typeReport === 'type3' ? onDate : params.dateTo)
    .where('dateTo', '>=', params.typeReport === 'type3' ? onDate : params.dateFrom)
    .selectAsObject({
      'employeeNumberID.tabNum': 'tabNum',
      'employeeNumberID.tabNumSort': 'tabNumSort',
      'employeeID.shortFIO': 'shortFIO',
      'employeeNumberID.dateTo': 'empDateTo'
    })
  const employeeNumbers = _.uniq(empData.map(el => el.employeeNumberID))
  let employeeNumbers4 = _.uniq(empData.filter(el => el.workPlace === '4').map(el => el.employeeNumberID))

  let empPosDataCPH = []
  if (employeeNumbers4 && employeeNumbers4.length) {
    const existNumberCPH = UB.Repository('hr_employeePositionS')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('[organizationID]', 'in', childOrgIDs)
      .where('employeeNumberID', 'in', employeeNumbers4)
      .where('[dateFrom]', '<=', params.typeReport === 'type3' ? onDate : params.dateTo)
      .where('[dateTo]', '>=', params.typeReport === 'type3' ? onDate : params.dateFrom)
      .where('workPlace', '=', '4')
      .where('payElID.methodID.code', '=', '3')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

    empPosDataCPH = UB.Repository('hr_employeeCPH')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
      .where('[dateFrom]', '<=', params.typeReport === 'type3' ? onDate : params.dateTo)
      .where('dateTo', '>=', params.typeReport === 'type3' ? onDate : params.dateFrom, 'dateTo')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      .logic('(([dateTo]) or ([dateToIsNull]))')
      .exists(existNumberCPH)
      .selectAsObject()
  }

  _.forEach(empData, empItem => {
    // если это позаштатник с договором ЦПХ, то признак увольнение не ставим
    if (empPosDataCPH.find(el => el.employeeNumberID === empItem.employeeNumberID)) {
      empItem.dismissed = false
    } else {
      empItem.dismissed = dateService.shiftDate(empItem.empDateTo) < (params.typeReport === 'type3' ? onDate : params.dateTo)
    }
  })
  /*
  empDataAll = _.groupBy(empDataAll, 'employeeNumberID')
  const empData = [] // Берем последнее назначение сотрудника
  _.forEach(empDataAll, empItems => {
    empItems = empItems.sort((a, b) => (a.dateFrom < b.dateFrom) ? 1 : -1)
    empItems[0].dismissed = dateService.shiftDate(empItems[0].empDateTo) < (params.typeReport === 'type3' ? onDate : params.dateTo)
    empData.push(empItems[0])
    employeeNumbers.push(empItems[0].employeeNumberID)
  })
  */
  const store = UB.DataStore('hr_employeeNumber')
  store.runSQL(`SELECT n.employeeID "employeeID", n.ID "employeeNumberID", n.tabNum "tabNum", n.tabNumSort "tabNumSort", 
  e.shortFIO "shortFIO", n.orgID "organizationID",
  ep.positionID "positionID", ep.workPlace "workPlace", ep.departmentID "departmentID",
  ep.dateFrom "dateFrom", ep.dateTo "dateTo", n.dateTo "empDateTo" ${useActualPositionName ? ', ep.factPosName' : ''}
FROM hr_employeeNumber n
  JOIN hr_employee e ON e.ID = n.employeeID
  JOIN hr_employeePosition ep ON ep.employeeNumberID = n.ID AND ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31'
         AND ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2
                        WHERE ep2.employeeNumberID = n.ID AND ep2.mi_deleteDate >= '9999-12-31' AND ep2.isActive = 1
                        AND ep2.dateTo < :dateFrom:
                        ${departments.length ? ` and ep2.departmentID${entityBaseService.getInExpression('departments')}` : ''}
                          order by ep2.dateTo desc ${sqlDialect.limit})
  where n.orgID${entityBaseService.getInExpression('childOrgIDs')} AND n.mi_deleteDate >= '9999-12-31'
  ${employeeNumbers.length ? `AND n.ID${entityBaseService.getNotInExpression('employeeNumbers')}` : ''}
  AND NOT EXISTS (SELECT 1 FROM hr_employeePosition p1 WHERE p1.employeeNumberID = n.ID AND 
  p1.dateFrom <= :dateTo: AND p1.dateTo >= :dateFrom: AND p1.isActive = 1 AND p1.mi_deleteDate >= '9999-12-31')
  AND EXISTS (SELECT 1 FROM hr_accrual a WHERE a.employeeNumberID = n.ID 
    AND ((a.periodCalc >= :dateFrom: AND a.periodCalc <= :dateTo:) OR (a.periodSalary >= :dateFrom: AND a.periodSalary <= :dateTo:)))  
  `, {
    childOrgIDs,
    departments: departments || [0],
    employeeNumbers,
    dateFrom: params.typeReport === 'type3' ? dateService.firstDayOfMonth(onDate) : params.dateFrom,
    dateTo: params.typeReport === 'type3' ? dateService.lastDayOfMonth(onDate) : params.dateTo
  })
  const accrualEmpData = store.getAsJsObject()
  employeeNumbers4 = _.uniq(accrualEmpData.filter(el => el.workPlace === '4').map(el => el.employeeNumberID))

  empPosDataCPH = []
  if (employeeNumbers4 && employeeNumbers4.length) {
    const existNumberCPH = UB.Repository('hr_employeePositionS')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('[organizationID]', 'in', childOrgIDs)
      .where('employeeNumberID', 'in', employeeNumbers4)
      .where('[dateFrom]', '<=', params.typeReport === 'type3' ? onDate : params.dateTo)
      .where('[dateTo]', '>=', params.typeReport === 'type3' ? onDate : params.dateFrom)
      .where('workPlace', '=', '4')
      .where('payElID.methodID.code', '=', '3')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')

    empPosDataCPH = UB.Repository('hr_employeeCPH')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
      .where('[dateFrom]', '<=', params.typeReport === 'type3' ? onDate : params.dateTo)
      .where('dateTo', '>=', params.typeReport === 'type3' ? onDate : params.dateFrom, 'dateTo')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      .logic('(([dateTo]) or ([dateToIsNull]))')
      .exists(existNumberCPH)
      .selectAsObject()
  }

  accrualEmpData.forEach(row => {
    // если это позаштатник с договором ЦПХ, то признак увольнение не ставим
    if (empPosDataCPH.find(el => el.employeeNumberID === row.employeeNumberID)) {
      row.dismissed = false
    } else {
      row.dismissed = dateService.shiftDate(row.empDateTo) < (params.typeReport === 'type3' ? onDate : params.dateTo)
    }
  })
  empData.push(...accrualEmpData)

  let employeeIDs = empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
  const configVacation = [{
    type: 'VACATION',
    ub: 'hr_empOrderVacationListDet',
    whereAttr: 'dictVacationKindID.code'
  }, {
    type: 'VACATIONLONG',
    ub: 'hr_empOrderVacationlongDet',
    whereAttr: 'dictVacationKindID.code'
  }, {
    type: 'VACATIONPROLONGL',
    ub: 'hr_empOrderVacationprolonglDet',
    whereAttr: 'primeVacationParaID.dictVacationKindID.code'
  }]

  let empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'description', 'paraID', 'paraID.empOrderType'])
    .whereIf(employeeIDs && employeeIDs.length > 0, 'employeeNumberID', 'in', employeeIDs)
    .whereIf(params.typeData !== 'byPos', 'paraID.empOrderType', 'in', configVacation.map(item => item.type).concat('MILSERVICE')) // без деталізації посад нас цікавят записи по війсковій службі або довга відпустка
    .where('organizationID', 'in', childOrgIDs)
    .whereIf(params.typeReport !== 'type3', 'dateFrom', '<=', params.dateTo)
    .whereIf(params.typeReport !== 'type3', 'dateTo', '>=', params.dateFrom)
    .whereIf(params.typeReport === 'type3', 'dateFrom', '<=', params.onDate)
    .whereIf(params.typeReport === 'type3', 'dateTo', '>=', params.onDate)
    .selectAsObject({
      'paraID.empOrderType': 'empOrderType'
    })

  const vacationAbs = empLongTermAbsc.filter(el => configVacation.map(item => item.type).includes(el.empOrderType))
  if (vacationAbs.length) {
    const longVacCodes = ['dCh3Y', 'dCh6Y', 'dPrCh']
    configVacation.forEach(configItem => {
      const ids = vacationAbs.filter(el => el.empOrderType === configItem.type).map(el => el.paraID)
      if (ids.length) {
        const orderIDs = _.chunk(ids, 1000)
        for (let i = 0; i < orderIDs.length; i++) {
          const orderDet = UB.Repository(configItem.ub)
            .attrs('ID')
            .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
            .where(configItem.whereAttr, 'in', longVacCodes)
            .where('ID', 'in', orderIDs[i])
            .selectAsObject()
          if (orderDet.length) {
            orderDet.forEach(det => {
              vacationAbs.filter(el => el.paraID === det.ID).forEach(el => {
                el.empOrderType = 'VACATION_WITH_CHILD'
              })
            })
          }
        }
      }
    })
  }
  empLongTermAbsc = empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : {}
  const allowableAbsenceType = ['VACATION_WITH_CHILD', 'MILSERVICE']

  // let accrualData = []
  // let avgListData = {}

  const periods = params.typeReport === 'type3'
    ? [{ ID: 0, dateFrom: dateService.shiftDate(params.onDate), dateTo: dateService.shiftDate(params.onDate) }]
    : params.typeData === 'byCategory'
      ? periodService.getPeriodsByDate(organizationID, params.dateFrom, params.dateTo)
      : [{ ID: 0, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo) }]

  // const dFrom = params.typeReport === 'type3' ? params.onDate : params.dateFrom
  // const dTo = params.typeReport === 'type3' ? params.onDate : params.dateTo
  /*
      periodCalcID Розрахунковий період належить вибраному періоду
      periodSalaryID Обліковий період <= останньому місяцю вибраному періоду
      або
      periodCalcID Розрахунковий період < першого місяця вибраного періоду
      periodSalaryID Обліковий період належить вибраному періоду
   */

  const limitedAccess = !!departments.length && !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let reportParams = reportService.getReportParams(organizationID, ['FOZP', 'FDZP', 'ZKV'], params.typeReport === 'type5' ? [] : ['notFOPS03'])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const empDataToReport = []

  function getWorkPlace (workPlace) {
    if (!workPlace) return ' місце роботи не вказано'
    if (workPlace === '1') return ''
    if (workPlace === '2') return ' вн. сум.'
    if (workPlace === '3') return ' зовн. сум.'
    if (workPlace === '4') return ' поза штат.'
    return ' помилкове місце роботи'
  }
  periods.forEach(periodItem => {
    // let empDataByPeriod = empData.filter(el => new Date(el.dateFrom) <= periodItem.dateTo && new Date(el.dateTo >= periodItem.dateFrom))
    if (empData.length) {
      let empDataByPeriod = _.groupBy(empData, 'employeeNumberID')
      const currentEmpData = []
      _.forEach(empDataByPeriod, empItems => {
        let empItemsByPeriod = empItems.filter(el => new Date(el.dateFrom) <= periodItem.dateTo && new Date(el.dateTo >= periodItem.dateFrom))
        empItemsByPeriod = empItemsByPeriod || empItems // если не нашли за указнный период, то возьмем последнее с того, что есть
        if (empItemsByPeriod.length > 1) {
          empItemsByPeriod = empItemsByPeriod.sort((a, b) => (a.dateFrom > b.dateFrom) ? -1 : 1) // нужен самый последний срез
        }

        const empItem = Object.assign({}, empItemsByPeriod[0], {
          paySum: 0,
          limitedAccess: 0,
          dayCount: 0,
          workDayCount: 0,
          notes: ''
        })
        const onAllowableAbsence = empLongTermAbsc && empLongTermAbsc[empItem.employeeNumberID]
          ? empLongTermAbsc[empItem.employeeNumberID].filter(el => allowableAbsenceType.includes(el.empOrderType) && new Date(el.dateFrom) <= periodItem.dateTo && new Date(el.dateTo) >= periodItem.dateFrom).length > 0
          : false
        empItem.onAllowableAbsence = onAllowableAbsence

        if (params.typeData === 'byPos' && empLongTermAbsc && empLongTermAbsc[empItem.employeeNumberID]) {
          empItem.notes = empLongTermAbsc[empItem.employeeNumberID].map(el => {
            return ` ${dateService.formatDate(el.dateFrom)} - ${dateService.formatDate(el.dateTo)}${el.description ? ' ' + el.description : el.description}`
          }).join(';')
        }

        if (empItem.workPlace !== '1') {
          empItem.notes += (empItem.notes ? ' ' : '') + getWorkPlace(empItem.workPlace)
        }

        currentEmpData.push(empItem)
      })
      for (let i = 0; i < orgs.length; i++) {
        const parametrs = {
          orgID: orgs[i].mi_data_id,
          dateFrom: periodItem.dateFrom, // dateService.shiftDate(params.typeReport === 'type3' ? params.onDate : params.dateFrom),
          dateTo: periodItem.dateTo, // dateService.shiftDate(params.typeReport === 'type3' ? params.onDate : params.dateTo),
          onDate: periodItem.dateFrom, // dateService.shiftDate(params.typeReport === 'type3' ? params.onDate : params.dateTo),
          avgCount: params.typeReport === 'type3',
          departmentID: params.departmentID,
          includeChildDepts: params.includeSubDep
        }
        if (params.typeReport === 'type4') {
          parametrs.workPlace = ['1', '3']
          parametrs.withCPH = true
        }

        let aList
        if (params.typeReport === 'type2') {
          aList = reportService.getAvgListEmpCountFull(parametrs)
        } else if (params.typeReport === 'type5') {
          aList = reportService.getAvgListEmpCountFullEnergo(parametrs)
        } else if (params.typeReport === 'type3') {
          aList = reportService.getAvgListEmpCountOnDate(parametrs)
        } else {
          aList = reportService.getAvgListEmpCount(parametrs)
        }

        if (aList && aList.dayCount !== 0) {
          // avgListData[orgs[i].mi_data_id] = aList

          if (aList && aList.employeeNumbers) {
            _.forEach(currentEmpData.filter(el => el.organizationID === orgs[i].mi_data_id), empItem => {
              empItem.dayCount += aList.employeeNumbers[empItem.employeeNumberID] ? aList.employeeNumbers[empItem.employeeNumberID].dayCount : 0
              empItem.workDayCount += aList.employeeNumbers[empItem.employeeNumberID] ? aList.employeeNumbers[empItem.employeeNumberID].workDayCount : 0
            })
          }
        }

        let employeeIDs = params.departmentID ? _.compact(_.uniq(currentEmpData.map(el => el.employeeNumberID))) : []

        const accrualOrg = UB.Repository('hr_accrual')
          .attrs(['sum([paySum])', 'employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.limitedAccess'])
          .where('periodCalc', '>=', periodItem.dateFrom, 'pc1')
          .where('periodCalc', '<=', periodItem.dateTo, 'pc2')
          .where('periodSalary', '<=', periodItem.dateTo, 'pc3')
          .where('periodSalary', '>=', periodItem.dateFrom, 'ps1')
          .where('periodSalary', '<=', periodItem.dateTo, 'ps2')
          .where('periodCalc', '<', periodItem.dateFrom, 'ps3')
          .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
          .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1000, 'employeeNumberID', 'in', employeeIDs)
          .where('employeeNumberID.orgID', '=', orgs[i].mi_data_id)
          .where('flagsRecSum', '!=', 8192)
          .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
          .where('payElID', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
          .groupBy(['employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.limitedAccess'])
          .selectAsObject({
            'sum([paySum])': 'paySum',
            'employeeNumberID.limitedAccess': 'limitedAccess'
          })
        // все, что не вошло в ФОП
        const excludeAccrualOrg = result.showEmpData ? UB.Repository('hr_accrual')
          .attrs(['sum([paySum])', 'employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.limitedAccess'])
          .where('periodCalc', '>=', periodItem.dateFrom, 'pc1')
          .where('periodCalc', '<=', periodItem.dateTo, 'pc2')
          .where('periodSalary', '<=', periodItem.dateTo, 'pc3')
          .where('periodSalary', '>=', periodItem.dateFrom, 'ps1')
          .where('periodSalary', '<=', periodItem.dateTo, 'ps2')
          .where('periodCalc', '<', periodItem.dateFrom, 'ps3')
          .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
          .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1000, 'employeeNumberID', 'in', employeeIDs)
          .where('employeeNumberID.orgID', '=', orgs[i].mi_data_id)
          .where('flagsRecSum', '!=', 8192)
          .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
          .whereIf(fopPayElIDs.length, 'payElID', 'notIn', fopPayElIDs)
          .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
          .groupBy(['employeeNumberID', 'employeeNumberID.orgID', 'employeeNumberID.limitedAccess'])
          .selectAsObject({
            'sum([paySum])': 'paySum',
            'employeeNumberID.limitedAccess': 'limitedAccess'
          }) : []
        // if (accrualOrg && accrualOrg.length) {
        //  accrualData.push(...accrualOrg)
        // }
        accrualOrg.forEach(accrualItem => {
          const empItem = currentEmpData.find(el => el.employeeNumberID === accrualItem.employeeNumberID && el.organizationID === orgs[i].mi_data_id)
          if (empItem) {
            if (empItem.dayCount || empItem.workPlace === '2' || (empItem.dismissed && empItem.workPlace !== '3') || empItem.onAllowableAbsence || (empItem.workPlace === '3' && ['type2', 'type4', 'type5'].indexOf(typeReport) !== -1)) {
              empItem.paySum = accrualItem.paySum
              empItem.limitedAccess = accrualItem.limitedAccess
            } else {
              // console.debug('!!! AVG. Not cals FOP for employee: ', `${empItem.employeeNumberID} ${empItem.tabNum} ${empItem.shortFIO} ${empItem.workPlace} - ${accrualItem.paySum}` )
              if (result.showEmpData && accrualItem.paySum !== 0) {
                const wp = getWorkPlace(empItem.workPlace)
                const exItem = result.empData.find(el => el.employeeNumberID === empItem.employeeNumberID)
                if (exItem) {
                  exItem.paySum += accrualItem.paySum
                } else {
                  result.empData.push({
                    isTotal: false,
                    employeeNumberID: empItem.employeeNumberID,
                    sortBy: empItem.tabNumSort,
                    name: `${empItem.tabNum} ${empItem.shortFIO}${wp}`,
                    paySum: accrualItem.paySum
                  })
                }
              }
            }
          }
        })
        if (result.showEmpData) {
          excludeAccrualOrg.forEach(accrualItem => {
            if (accrualItem.paySum !== 0) {
              const empItem = currentEmpData.find(el => el.employeeNumberID === accrualItem.employeeNumberID && el.organizationID === orgs[i].mi_data_id)
              if (empItem) {
                const wp = getWorkPlace(empItem.workPlace)
                const exItem = result.empData.find(el => el.employeeNumberID === empItem.employeeNumberID)
                if (exItem) {
                  exItem.paySum += accrualItem.paySum
                } else {
                  result.empData.push({
                    isTotal: false,
                    employeeNumberID: empItem.employeeNumberID,
                    sortBy: empItem.tabNumSort,
                    name: `${empItem.tabNum} ${empItem.shortFIO}${wp}`,
                    paySum: accrualItem.paySum
                  })
                }
              }
            }
          })
        }
      }

      currentEmpData.forEach(empItem => {
        // посаду ищем на дату По, т.е. будет последняя активная посада
        let fltPosData = posData.filter(el => el.mi_data_id === empItem.positionID && new Date(el.mi_dateFrom) <= periodItem.dateTo && new Date(el.mi_dateTo) >= periodItem.dateTo)
        if (!fltPosData.length) {
          fltPosData = posData.filter(el => el.mi_data_id === empItem.positionID)
        }
        if (fltPosData.length > 1) {
          fltPosData = fltPosData.sort((a, b) => (a.ID > b.ID) ? -1 : 1) // нужен самый последний срез
        }
        let posItem = fltPosData.length ? fltPosData[0] : undefined

        if (!posItem) {
          posItem = {
            mi_data_id: null,
            'positionCategory.name': '',
            'positionCategory.sortOrder': '',
            'dictPositionID.name': '',
            'dictPositionID.code': '',
            dictStaffCatID: null,
            dictPositionKindID: null
          }
        }
        if ((!params.dictStaffCatID || posItem.dictStaffCatID === params.dictStaffCatID) && (!params.dictPositionKindID || posItem.dictPositionKindID === params.dictPositionKindID)) {
          empItem.groupID = empItem.positionID

          if (params.typeData === 'byOrg') {
            empItem.groupID = empItem.organizationID
            empItem.groupName = ''// orgItem ? orgItem.name : ''
            empItem.sortBy1 = ''
            empItem.sortBy2 = ''
            empItem.needIndexNum = true
            empItem.textColor = '#000000'
          }
          if (params.typeData === 'byDep') {
            empItem.groupID = empItem.departmentID || -1
            empItem.groupName = ''
            empItem.sortBy1 = ''
            empItem.sortBy2 = ''
            empItem.needIndexNum = true
            empItem.textColor = '#000000'
          }
          if (params.typeData === 'byCategory') {
            empItem.groupID = posItem.positionCategory || -1
            empItem.groupName = posItem['positionCategory.name'] || UB.i18n('Без категорії')
            empItem.sortBy1 = posItem['positionCategory.sortOrder'] || '99999999'
            empItem.sortBy2 = ''
            empItem.needIndexNum = false
            empItem.textColor = posItem.positionCategory && posItem['positionCategory.mi_deleteDate'] && new Date(posItem['positionCategory.mi_deleteDate']) <= dateTo ? '#808080' : '#000000'
          }
          if (params.typeData === 'byDictPos') {
            empItem.groupID = posItem.dictPositionID || -1
            empItem.groupName = nameCase.cap(posItem['dictPositionID.name'] || UB.i18n('Без посади'))
            empItem.sortBy1 = posItem['dictPositionID.code'] || '99999999'
            empItem.sortBy2 = nameCase.cap(posItem['dictPositionID.name'] || UB.i18n('Без посади'))
            empItem.needIndexNum = false
            empItem.textColor = posItem.dictPositionID && posItem['dictPositionID.mi_deleteDate'] && new Date(posItem['dictPositionID.mi_deleteDate']) <= dateTo ? '#808080' : '#000000'
          }
          if (params.typeData === 'byProfession') {
            empItem.groupID = posItem['dictPositionID.dictProfessionID'] || -1
            empItem.groupName = nameCase.cap(posItem['dictPositionID.dictProfessionID.name'] || UB.i18n('Без професії'))
            empItem.sortBy1 = posItem['dictPositionID.dictProfessionID.code'] || '99999999'
            empItem.sortBy2 = nameCase.cap(posItem['dictPositionID.dictProfessionID.name'] || UB.i18n('Без професії'))
            empItem.needIndexNum = false
            empItem.textColor = posItem['dictPositionID.dictProfessionID'] && posItem['dictPositionID.dictProfessionID.mi_deleteDate'] && new Date(posItem['dictPositionID.dictProfessionID.mi_deleteDate']) <= dateTo ? '#808080' : '#000000'
          }

          const item = empDataToReport.find(el =>
            el.employeeNumberID === empItem.employeeNumberID &&
            el.organizationID === empItem.organizationID &&
            el.groupID === empItem.groupID
          )
          if (item) {
            item.paySum += empItem.paySum
            item.dayCount += currencyService.round(empItem.dayCount, 3)
          } else {
            empDataToReport.push(Object.assign({}, empItem))
          }
        }
      })
    }
  })
  if (periods.length > 1) {
    empDataToReport.forEach(empItem => {
      empItem.dayCount = empItem.dayCount ? currencyService.round(empItem.dayCount / periods.length, 3) : 0
    })
  }

  // accrualData = accrualData.filter(el => empData.map(e => e.employeeNumberID).indexOf(el.employeeNumberID) !== -1)
  function getSettingsOrgForPlans (organizationID = params.orgID) {
    const result = {
      showTotals: !settingsService.getByCode('hrTotalsOnlyIndepStructUnit', organizationID),
      roundTo: settingsService.getByCode('hrRoundAccrualStaffTable', organizationID) === '1' ? 'decimal2' : 'numberGroup',
      roundToQuantity: '',
      boldMainDep: settingsService.getByCode('hrStaffReportMainDepInBold', organizationID),
      autoSetDepIdxNum: settingsService.getByCode('hrAutoSetDepIdxNum', organizationID),
      hrFuncOrgType: settingsService.getByCode('hrFuncOrgType', organizationID),
      namePosition: settingsService.getByCode('hrStaffReportNamePosition', organizationID),
      hrStaffReportShowAccrual: settingsService.getByCode('hrStaffReportShowAccrual', organizationID),
      twoApprover: settingsService.getByCode('hrTwoApproverInStaffTable', organizationID) === true
    }

    const roundToQuantity = settingsService.getByCode('hrStaffUnitQuantityRound', organizationID)
    if (roundToQuantity) {
      switch (roundToQuantity) {
        case '1':
          result.roundToQuantity = 'numberGroup'
          break
        case '2':
          result.roundToQuantity = 'decimal1'
          break
        case '3':
          result.roundToQuantity = 'decimal2'
          break
        default:
          result.roundToQuantity = ''
          break
      }
    }

    return result
  }
  const settingsOrg = getSettingsOrgForPlans(params.orgID)
  result.roundTo = settingsOrg.roundTo <= 0 ? 'numberGroup' : 'decimal2'
  result.showTotals = settingsOrg.showTotals

  const tree = generateDataForStructReport(dateFrom, dateTo, orgs, departmentID, orgStruct, posData, empDataToReport,
    params.typeData === 'byPos' ? dateService.dateDiff(params.dateFrom, params.dateTo) : 0,
    params.typeReport, params.typeData,
    { roundTo: result.roundTo, colSpan: result.colSpan, showLevelTotals: result.showTotals ? 2 : 1, useActualPositionName })

  result.data = tree && tree.data ? tree.data : []
  result.showEmpData = !!result.empData.length
  if (result.empData.length) {
    result.empData.sort((a, b) => a.sortBy < b.sortBy ? -1 : 1)
    const allSumma = result.empData.reduce((sum, curValue) => sum + curValue.paySum, 0)
    result.empData.push(
      { isTotal: true, name: 'Всього по не врахованим', paySum: allSumma },
      { isTotal: true, name: 'Всього ФОП', paySum: allSumma + (tree.fop || 0) }
    )
  }

  let typeDataName = UB.Repository('ubm_enum').attrs('name')
    .where('eGroup', '=', 'HR_TYPE_DATA')
    .where('code', '=', params.typeData)
    .selectScalar()

  result.title.push({ text: UB.i18n(`в розрізі {0} для {1}{2}`, typeDataName || '', result.departmentName ? result.departmentName + ' ' : '', result.organizationName) })
  result.title.push({ text: titlePeriod })

  ctx.mParams.resultData = JSON.stringify(result)
}

function generateDataForStructReport (dateFrom, dateTo, orgs, itemID, orgStruct, positionData, empData, planDays, typeReport, typeData, config) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const countMonth = Math.max(dateService.monthDiff(dateFrom, dateTo, true), 1)
  const emptyObj = {
    textColor: 'black',
    needIndexNum: false,
    sortBy2: '',
    textAlign: 'left',
    addInfo1: typeData === 'byPos',
    addInfo2: typeData === 'byPos' && (typeReport === 'type1' || typeReport === 'type4'),
    addInfo3: typeData !== 'byPos' && (typeReport === 'type1' || typeReport === 'type2'),
    roundTo: config.roundTo,
    roundToQuantity: 'decimal3',
    colSpan: config.colSpan,
    isOnlyName: false,
    boldInfo: '',
    parentID: 0,
    indexNum: '',
    id: 0,
    name: '',
    tab: '',
    fio: '',
    planDays: undefined,
    factDays: undefined,
    quantity: 0,
    fop: 0,
    avrgSalary: 0,
    fop_NoLimitedAccess: 0,
    notes: ''
  }
  function sortFunc (a, b) {
    if (a.id === -1) {
      return 1
    }
    if (b.id === -1) {
      return -1
    }
    if (a.sortBy1 < b.sortBy1) {
      return -1
    }
    if (a.sortBy1 > b.sortBy1) {
      return 1
    }
    if (a.sortBy2 < b.sortBy2) {
      return -1
    }
    if (a.sortBy2 > b.sortBy2) {
      return 1
    }
    return 0
  }

  function getData (indexNpp, orgID, parentID, level = 1) {
    const result = {
      data: [],
      quantity: 0,
      fop: 0,
      fop_NoLimitedAccess: 0, // сумма по всем сотрудникам без учета limitedAccess
      haveSubData: false,
      indexNpp: indexNpp
    }

    const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
    let styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''
    const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)

    const depItem = parentID
      ? _.find(orgStruct, { mi_data_id: parentID })
      : { name: UB.i18n('Без підрозділу') }
    if (!depItem) {
      return result
    }

    const depObj = Object.assign({}, emptyObj, {
      needIndexNum: typeData === 'byDep',
      name: typeData === 'byDep'
        ? `${str}${nameCase.cap(depItem.name || '')}`
        : `${str}${styleBegin}${level === 1 ? (depItem.name || '').toUpperCase() : nameCase.cap(depItem.name || '')}${styleEnd}`,
      isOnlyName: typeData !== 'byDep'
    })
    result.data.push(depObj)
    const departmentData = [] // для сортировки будем использовать этот массив

    if (typeData === 'byDep') {
      const employeeNumberByDep = empData.filter(emp => emp.departmentID === parentID && emp.organizationID === orgID)
      if (!parentID && !employeeNumberByDep.length) {
        result.data.pop(depObj)
      } else {
        depObj.quantity = employeeNumberByDep.reduce((acc, item) => (acc + (item.dayCount || 0)), 0)
        depObj.summaFOPNoLimitedAccess = employeeNumberByDep.reduce((acc, item) => (acc + (item.paySum || 0)), 0)
        depObj.summaFOP = employeeNumberByDep.reduce((acc, item) => (acc + (limitedAccess && item.limitedAccess ? 0 : item.paySum || 0)), 0)
        depObj.avrgSalary = depObj.summaFOP && depObj.quantity ? currencyService.round((depObj.summaFOP / depObj.quantity) / countMonth, 2) : 0

        result.quantity += depObj.quantity
        result.fop += depObj.summaFOP
        result.fop_NoLimitedAccess += depObj.summaFOPNoLimitedAccess
      }
    } else {
      const positions = _.uniq(empData.filter(el => el.departmentID === parentID && el.organizationID === orgID).map(el => el.positionID))
      _.forEach(positions, posItemID => {
        // посаду ищем на дату По, т.е. будет последняя активная посада
        let posItem
        posItem = _.find(positionData, el => el.orgID === orgID && el.parentUnitID === (parentID || orgID) && el.mi_data_id === posItemID && new Date(el.mi_dateFrom) <= dateTo && new Date(el.mi_dateTo) >= dateTo)
        if (!posItem) {
          posItem = _.find(positionData, el => el.orgID === orgID && el.parentUnitID === (parentID || orgID) && el.mi_data_id === posItemID)
        }
        if (!posItem) {
          posItem = {
            mi_data_id: posItemID,
            idxNum: 99999999,
            name: UB.i18n('Не визначено'),
            dictStaffCatID: null,
            dictPositionKindID: null
          }
        }

        if (posItem) {
          let obj = Object.assign({}, emptyObj, {
            sortBy1: posItem.idxNum,
            sortBy2: nameCase.cap(posItem['name'] || ''),
            needIndexNum: true,
            name: nameCase.cap(posItem['name'] || ''),
            id: posItem.mi_data_id
          })
          departmentData.push(obj)

          let quantity = 0
          let summaFOPNoLimitedAccess = 0
          let summaFOP = 0

          const empItems = empData.filter(emp => emp.departmentID === parentID && emp.organizationID === orgID && emp.positionID === posItemID &&
            (!emp.dismissed || (emp.paySum || emp.dayCount)) // UBHR-20557
          )
          for (let i = 0; i < empItems.length; i++) {
            const empItem = empItems[i]
            let objEmp = i === 0
              ? obj // будем добавлять инфо в строку посады
              : Object.assign({}, emptyObj, {
                id: obj.id,
                name: obj.name,
                sortBy1: obj.sortBy1
              })
            if (i !== 0) {
              departmentData.push(objEmp)
            }

            if (config.useActualPositionName) {
              objEmp.name = nameCase.cap(empItem.factPosName || '')
            }
            objEmp.sortBy2 = config.useActualPositionName ? `${nameCase.cap(empItem.factPosName || '')}/${empItem.shortFIO}/${empItem.tabNum}/` : `${empItem.shortFIO}/${empItem.tabNum}/`
            objEmp.notes = empItem.notes
            objEmp.tab = empItem.tabNum
            objEmp.fio = empItem.shortFIO
            objEmp.planDays = planDays
            objEmp.factDays = empItem.workDayCount || 0
            objEmp.quantity = empItem.dayCount || 0
            objEmp.fopNoLimitedAccess = empItem.paySum || 0
            objEmp.fop = limitedAccess && empItem.limitedAccess ? 0 : empItem.paySum || 0

            quantity += objEmp.quantity
            summaFOPNoLimitedAccess += objEmp.fopNoLimitedAccess
            summaFOP += objEmp.fop
          }
          depObj.fop += summaFOP
          depObj.fop_NoLimitedAccess += summaFOPNoLimitedAccess
          depObj.quantity += quantity

          result.quantity += quantity
          result.fop += summaFOP
          result.fop_NoLimitedAccess += summaFOPNoLimitedAccess
        }
      })
    }
    // если есть подчиненные подразделения
    const curStruct = parentID ? orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID) : []
    curStruct.forEach(orgItem => {
      const subTree = getData(-1, orgID, orgItem.mi_data_id, level + 1)
      const subTreeHasData = (subTree.data && subTree.data.length)
      if (subTree && subTreeHasData) {
        result.haveSubData = true
        if (subTreeHasData) {
          const subObj = {
            sortBy1: orgItem.idxNum,
            data: subTree.data
          }

          if ((subTree.haveSubData || typeData !== 'byDep') && config.showLevelTotals > 0 && (level === config.showLevelTotals || config.showLevelTotals === 2)) {
            const totalObj = Object.assign({}, emptyObj, {
              name: UB.i18n(`{0}Всього по {1}`, str, orgItem.depType),
              quantity: subTree.quantity,
              fop: subTree.fop,
              fop_NoLimitedAccess: subTree.fop_NoLimitedAccess,
              avrgSalary: undefined,
              isTotal: true,
              boldInfo: ' font-weight: bold;'
            })
            subObj.data.push(totalObj)
          }
          departmentData.push(subObj)
        }

        result.quantity += subTree.quantity
        result.fop += subTree.fop
        result.fop_NoLimitedAccess += subTree.fop_NoLimitedAccess
      }
    })

    if (parentID || departmentData.length) {
      departmentData.sort(sortFunc)

      let prevObj = { id: 0, name: '' }
      _.forEach(departmentData, el => {
        if (el.data) {
          _.forEach(el.data, subEl => {
            if (prevObj.id === subEl.id && prevObj.name === subEl.name) {
              subEl.name = ''
            } else {
              prevObj.id = subEl.id
              prevObj.name = subEl.name
            }
            subEl.needIndexNum = subEl.isTotal || subEl.isOnlyName ? subEl.needIndexNum : !!subEl.name
            result.data.push(subEl)
          })
        } else {
          if (prevObj.id === el.id && prevObj.name === el.name) {
            el.name = ''
          } else {
            prevObj.id = el.id
            prevObj.name = el.name
          }
          el.needIndexNum = el.isTotal || el.isOnlyName ? el.needIndexNum : !!el.name
          result.data.push(el)
        }
      })
    }
    if (!parentID && !departmentData.length && typeData === 'byPos') { // если нет сотрудников для "Без підрозділу", то возвращаем пусто
      result.data = []
    }

    if (indexNpp !== -1) {
      _.forEach(result.data, el => {
        el.indexNum = el.needIndexNum ? indexNpp++ : ''
      })
    }

    result.indexNpp = indexNpp
    return result
  }

  const orgTree = {
    data: [],
    quantity: 0,
    fop: 0
  }
  let indexNpp = 1

  if (['byOrg', 'byCategory', 'byDictPos', 'byProfession'].includes(typeData)) {
    let depName = ''
    if (itemID) {
      const depItem = orgStruct.find(el => el.mi_data_id === itemID)
      depName = depItem ? depItem.nameDat || depItem.name || '' : ''
    }

    for (let i = 0; i < orgs.length; i++) {
      if (orgs.length > 1 && typeData !== 'byOrg') {
        const title = {
          colSpan: config.colSpan,
          textAlign: 'center',
          name: `<font color="blue">${orgs[i].name}</font>`,
          isOnlyName: true
        }
        orgTree.data.push(title)
      }
      const orgTotalObj = Object.assign({}, emptyObj, {
        name: UB.i18n(`Всього по {0}`, itemID ? depName : orgs[i].nameDat || orgs[i].name || ''),
        quantity: 0,
        fop: 0,
        avrgSalary: undefined,
        isTotal: true,
        boldInfo: ' font-weight: bold;'
      })
      let empDataByOrg = empData.filter(el => el.organizationID === orgs[i].mi_data_id)
      empDataByOrg = empDataByOrg.length ? _.groupBy(empDataByOrg, 'groupID') : {}
      const dataByOrg = []
      _.forEach(empDataByOrg, groupItems => {
        const obj = Object.assign({}, emptyObj, {
          // needIndexNum: groupItems[0].needIndexNum,
          id: groupItems[0].groupID,
          name: typeData === 'byOrg' ? orgs[i].name : groupItems[0].groupName,
          indexNum: typeData === 'byOrg' ? indexNpp++ : '',
          quantity: groupItems.reduce((acc, item) => (acc + (item.dayCount || 0)), 0),
          fop_NoLimitedAccess: groupItems.reduce((acc, item) => (acc + (item.paySum || 0)), 0),
          fop: groupItems.reduce((acc, item) => (acc + (limitedAccess && item.limitedAccess ? 0 : item.paySum || 0)), 0),
          textColor: groupItems[0].textColor,
          sortBy1: groupItems[0].sortBy1,
          sortBy2: groupItems[0].sortBy2
        })
        obj.avrgSalary = obj.fop && obj.quantity ? currencyService.round((obj.fop / obj.quantity) / countMonth, 2) : 0
        dataByOrg.push(obj)

        orgTotalObj.quantity += obj.quantity
        orgTotalObj.fop += obj.fop_NoLimitedAccess
      })
      if (dataByOrg.length) {
        if (typeData !== 'byOrg') {
          dataByOrg.sort(sortFunc)
          dataByOrg.forEach(obj => {
            obj.indexNum = indexNpp++
          })
        }
        orgTree.data.push(...dataByOrg)
      }
      if (typeData !== 'byOrg' || itemID) {
        orgTree.data.push(orgTotalObj)
      }
      orgTree.quantity += orgTotalObj.quantity
      orgTree.fop += orgTotalObj.fop
    }

    if (orgs.length > 1) {
      const orgTreeLastObj = Object.assign({}, emptyObj, {
        name: UB.i18n('Всього'),
        quantity: orgTree.quantity || 0,
        fop: orgTree.fop || 0,
        avrgSalary: undefined,
        isTotal: true,
        boldInfo: ' font-weight: bold;'
      })
      orgTree.data.push(orgTreeLastObj)
    }
  } else {
    for (let i = 0; i < orgs.length; i++) {
      if (orgs.length > 1) {
        const title = {
          colSpan: config.colSpan,
          textAlign: 'center',
          name: `<font color="blue">${orgs[i].name}</font>`,
          isOnlyName: true
        }
        orgTree.data.push(title)
      }
      const orgObj = Object.assign({}, emptyObj, {
        indexNum: i + 1,
        name: orgs[i].name || ''
      })

      const curStruct = itemID
        ? orgStruct.filter(el => el.mi_data_id === itemID && el.orgID === orgs[i].mi_data_id)
        : orgStruct.filter(el => el.parentUnitID === orgs[i].mi_data_id && el.orgID === orgs[i].mi_data_id)
      // для сотрудников, которые на прямую подчиняются организации или договора ЦПХ
      if (!itemID) {
        curStruct.push({
          mi_data_id: null,
          depType: UB.i18n('без підрозділу'),
          name: UB.i18n('Без підрозділу')
        })
      }
      const emppp = empData.filter(emp => emp.departmentID && orgStruct.map(el => el.mi_data_id).indexOf(emp.departmentID) === -1)
      _.forEach(emppp, empItemID => {
        empItemID.departmentID = null
      })
      _.forEach(curStruct, depItemID => {
        const aTree = getData(indexNpp, orgs[i].mi_data_id, depItemID.mi_data_id, 1)
        indexNpp = aTree.indexNpp || 0

        orgObj.quantity += aTree.quantity
        orgObj.fop += aTree.fop_NoLimitedAccess
        orgObj.avrgSalary = orgObj.fop && orgObj.quantity ? currencyService.round((orgObj.fop / orgObj.quantity) / countMonth, 2) : 0

        if (aTree && aTree.data && aTree.data.length) {
          orgTree.data.push(...aTree.data)

          const orgTreeLastObj = Object.assign({}, emptyObj, {
            name: UB.i18n(`{0}Всього по {1}`, '', depItemID.depType),
            quantity: aTree.quantity || 0,
            fop: aTree.fop || 0,
            avrgSalary: undefined,
            isTotal: true,
            boldInfo: ' font-weight: bold;'
          })
          orgTree.data.push(orgTreeLastObj)
        }
      })
      orgObj.avrgSalary = orgObj.fop && orgObj.quantity ? currencyService.round((orgObj.fop / orgObj.quantity) / countMonth, 2) : 0

      if (!itemID) {
        const orgTotalObj = Object.assign({}, emptyObj, {
          name: UB.i18n(`{0}Всього по {1}`, '', orgs[i].nameDat || orgs[i].name || ''),
          quantity: orgObj.quantity || 0,
          fop: orgObj.fop || 0,
          avrgSalary: undefined,
          isTotal: true,
          boldInfo: ' font-weight: bold;'
        })
        orgTree.data.push(orgTotalObj)
      }

      orgTree.quantity += orgObj.quantity
      orgTree.fop += orgObj.fop
    }
  }

  return orgTree || {}
}

me.getDepartmentByOrgsData = ctx => {
  const params = ctx.mParams.execParams
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.organizationID || params.orgID, params.periodTo)

  let orgIDs = []
  let orgNames = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
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
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    const org = UB.Repository('hr_organization')
      .attrs(['treePath', 'description'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    orgNames.push({
      ID: orgID,
      treePath: org ? org.treePath : '',
      description: org ? org.description : ''
    })
  })
  orgNames.sort((a, b) => a.treePath < b.treePath ? -1 : 1)

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }
  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs('name')
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodTo })
    .selectScalar() : null

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  staffUnitStore.runSQL(`  SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
   u.mi_unityEntity as "mi_unityEntity", dep.description as "depdescription", u.orgID as "orgID"
    FROM hr_staffUnit u 
      LEFT JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID${entityBaseService.getInExpression('orgIDs')}
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID${entityBaseService.getInExpression('orgIDs')} 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
    orgIDs: orgIDs,
    dateTo: params.periodTo
  })
  const orgStruct = staffUnitStore.getAsJsObject()
  staffUnitStore.freeNative()

  ctx.mParams.resultData = JSON.stringify({
    period: periodName,
    // orgName: hrOrg ? hrOrg.name || '' : '',
    orgName: hrOrg && hrOrg.name && params.includeSubOrg ? UB.i18n(`{0} (з підлеглими)`, hrOrg.name) : hrOrg.name || '' || '',
    orgNames,
    department: department && params.includeSubDep ? UB.i18n(`{0} (з підлеглими)`, department) : department || '',
    orgStruct
  })
}

me.getWorkReport = function (ctx) {
  const params = ctx.mParams.execParams
  const sqlDialect = entityBaseService.getSQLDialect()

  const resultData = {
    A1020_1: 0,
    A1020_2: 0,
    A1030_1: 0,
    A1030_2: 0,
    A1040_1: 0,
    A1040_2: 0,
    A1060_1: 0,
    A1060_2: 0,
    A1070_1: 0,
    A1070_2: 0,
    A2040: 0,
    A2070: 0
  }

  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const periodToDateFrom = dateService.shiftDate(params.periodToDateFrom)

  const reportParams = reportService.getReportParams(params.organizationID, ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', 'notFOPS03'])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const pdfoTaxIndividIDs = UB.Repository('hr_payElTaxIndividEntry')
    .where('[payElID.methodID.code]', '=', '26')
    .attrs(['taxIndividID'])
    .selectAsObject()
    .map(row => row.taxIndividID)

  const pdfoPayElIDs = (fopPayElIDs.length ? UB.Repository('hr_payElTaxIndivid')
    .where('[taxIndividID]', 'in', pdfoTaxIndividIDs)
    .where('[payElID]', 'in', fopPayElIDs)
    .attrs('payElID')
    .selectAsObject() : [])
    .map(row => row.payElID)

  const periodIds = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '>=', params.periodFromDateFrom)
    .where('dateTo', '<=', params.periodToDateTo)
    .selectAsArrayOfValues()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom', 'dateTo')
    .where('ID', 'in', periodIds)
    .orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })

  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

  resultData.orgName = hrOrg.name

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.periodTo)
        .where('mi_dateTo', '>=', params.periodTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }
  if (params.dictMultiGroupID) {
    depName = UB.Repository('hr_dictMultiGroup')
      .attrs('name')
      .where('ID', '=', params.dictMultiGroupID)
      .selectScalar()
    const depts = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', params.dictMultiGroupID)
      .selectAsObject()
    deptIDs = depts.map(o => o.departmentID)
    if (params.includeSubMultiGroup) {
      depName += ' (з підлеглими)'
      depts.forEach(dep => {
        const subDepts = UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', params.orgID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.periodTo)
          .where('mi_dateTo', '>=', params.periodTo)
          .where('mi_treePath', 'like', `%/${dep.departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
  }
  let deptClause = ''
  if (Array.isArray(deptIDs) && deptIDs.length) {
    deptClause = `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}`
  }

  const orgIDs = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.periodTo)
      .where('mi_dateTo', '>=', params.periodFrom)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]

  const empNumberDS = UB.DataStore('hr_employeeNumber')
  empNumberDS.runSQL(`SELECT 
      en.ID as "employeeNumberID"
      ,en.orgID as "orgID"
    FROM hr_employeeNumber en   
    LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
     ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
     ep2.employeeNumberID = en.ID 
     and ep2.isActive = 1
     and ep2.dateFrom <= :dateTo:   
     and ep2.mi_deleteDate >= '9999-12-31' 
     order by ep2.dateFrom desc ${sqlDialect.limit}) 
    WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
    AND en.mi_deleteDate >= '9999-12-31'
    ${deptClause}
  `, {
    orgIDs,
    deptIDs,
    dateTo: params.periodTo,
    dateFrom: params.periodFrom
  })

  const empNumberIDs = empNumberDS.getAsJsObject().map(o => o.employeeNumberID)
  if (!empNumberIDs.length) {
    empNumberIDs.push(0)
  }

  periodList.forEach(period => {
    const periodDateFrom = dateService.shiftDate(period.dateFrom)
    const periodDateTo = dateService.shiftDate(period.dateTo)
    // calculate fop sum
    const value1020 = UB.Repository('hr_accrual')
      .attrs(['SUM([paySum])'])
      .where('employeeNumberID', 'in', empNumberIDs)
      .where('payElID', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .where('periodCalc', '>=', periodDateFrom, 'pc1')
      .where('periodCalc', '<=', periodDateTo, 'pc2')
      .where('periodSalary', '<=', periodDateTo, 'pc3')
      .where('periodSalary', '>=', periodDateFrom, 'ps1')
      .where('periodSalary', '<=', periodDateTo, 'ps2')
      .where('periodCalc', '<', periodDateFrom, 'ps3')
      .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
      .selectScalar() || 0

    resultData.A1020_2 = (resultData.A1020_2 || 0) + value1020

    // load pdfo by employee+period
    /* const fopDataForPdfo = UB.Repository('hr_accrual')
      .attrs(['periodSalaryID', 'employeeNumberID', 'SUM([paySum])'])
      .where('employeeNumberID', 'in', empNumberIDs)
      .where('[payElID]', 'in', pdfoPayElIDs)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .where('periodCalc', '>=', periodDateFrom, 'pc1')
      .where('periodCalc', '<=', periodDateTo, 'pc2')
      .where('periodSalary', '<=', periodDateTo, 'pc3')
      .where('periodSalary', '>=', periodDateFrom, 'ps1')
      .where('periodSalary', '<=', periodDateTo, 'ps2')
      .where('periodCalc', '<', periodDateFrom, 'ps3')
      .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
      .groupBy(['periodSalaryID', 'employeeNumberID'])
      .selectAsObject({
        'SUM([paySum])': 'paySum'
      }) */
    const accrualStore = UB.DataStore('hr_accrual')
    accrualStore.runSQL(`
SELECT t.periodSalaryID "periodSalaryID", t.employeeNumberID "employeeNumberID", SUM(t.paySum) "paySum", t.taxIndividID "taxIndividID"
FROM ( SELECT A01.periodSalaryID ,A01.employeeNumberID ,SUM(A01.paySum) paySum
 ,(SELECT ${sqlDialect.top} e.taxIndividID FROM hr_payElTaxIndivid e WHERE e.payElID = A01.payElID ${sqlDialect.limit}) taxIndividID
FROM hr_accrual A01
INNER JOIN hr_employeeNumber A02 ON A02.ID = A01.employeeNumberID
INNER JOIN hr_employee A03 ON A03.ID = A02.employeeID
WHERE A01.employeeNumberID${entityBaseService.getInExpression('empNumberIDs')}
AND A01.payElID${entityBaseService.getInExpression('pdfoPayElIDs')}
AND (A01.flagsRec & 8192 != 8192)
AND ((A01.periodCalc >= :periodDateFrom: AND A01.periodCalc <= :periodDateTo: AND A01.periodSalary <= :periodDateTo:) OR 
 (A01.periodSalary >= :periodDateFrom: AND A01.periodSalary <= :periodDateTo: AND A01.periodCalc < :periodDateFrom:))
AND A02.mi_deleteDate >= '9999-12-31'
AND A03.mi_deleteDate >= '9999-12-31'
GROUP BY A01.periodSalaryID,A01.employeeNumberID,A01.payElID) t
GROUP BY t.periodSalaryID,t.employeeNumberID,t.taxIndividID `,
    {
      empNumberIDs,
      pdfoPayElIDs: pdfoPayElIDs.length ? pdfoPayElIDs : [0],
      periodCalcID: period.ID,
      periodDateTo,
      periodDateFrom
    })
    const fopDataForPdfo = accrualStore.getAsJsObject()
    const periodSalarys = [0]
    fopDataForPdfo.forEach(row => {
      if (!periodSalarys.includes(row.periodSalaryID)) {
        periodSalarys.push(row.periodSalaryID)
      }
    })

    /* const pdfoData = UB.Repository('hr_accrual')
      .where('periodSalaryID', 'in', periodSalarys)
      .where('employeeNumberID', 'in', empNumberIDs)
      .where('[payElID.methodID.code]', '=', '26')
      .where('periodCalc', '<=', periodDateFrom)
      .where('periodSalary', '<=', periodDateFrom)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .groupBy(['periodSalaryID', 'employeeNumberID'])
      .attrs(['periodSalaryID', 'employeeNumberID', 'SUM([paySum])', 'SUM([baseSum])'])
      .selectAsObject({
        'SUM([paySum])': 'paySum',
        'SUM([baseSum])': 'baseSum'
      }) */
    const pdfoData = UB.Repository('hr_taxIndividAcc')
      .where('[accrualID.employeeNumberID]', 'in', empNumberIDs)
      .where('[accrualID.periodSalaryID]', 'in', periodSalarys)
      .where('[accrualID.payElID.methodID.code]', '=', '26')
      .where('[accrualID.periodCalc]', '<=', periodDateFrom)
      .where('[accrualID.periodSalary]', '<=', periodDateFrom)
      .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
      .groupBy(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID'])
      .attrs(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID', 'SUM([taxSum])', 'SUM([incomeSum])'])
      .selectAsObject({
        'accrualID.periodSalaryID': 'periodSalaryID',
        'accrualID.employeeNumberID': 'employeeNumberID',
        'SUM([taxSum])': 'paySum',
        'SUM([incomeSum])': 'baseSum'
      })

    // calculate pdfo
    let sumPdfoFop = 0
    fopDataForPdfo.forEach(fopPdfo => {
      let el = pdfoData.find(o => o.employeeNumberID === fopPdfo.employeeNumberID && o.periodSalaryID === fopPdfo.periodSalaryID && o.taxIndividID === fopPdfo.taxIndividID)
      if (fopPdfo.paySum !== 0 && el) {
        if (el.baseSum !== 0) {
          sumPdfoFop += (el.paySum / el.baseSum) * fopPdfo.paySum
        } else {
          const empPdfoData = UB.Repository('hr_taxIndividAcc')
            .where('[accrualID.employeeNumberID]', '=', fopPdfo.employeeNumberID)
            .where('[taxIndividID]', '=', fopPdfo.taxIndividID)
            .where('[accrualID.payElID.methodID.code]', '=', '26')
            .where('[accrualID.periodCalc]', '=', periodDateFrom)
            .where('[accrualID.periodSalaryID]', '=', fopPdfo.periodSalaryID)
            .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
            .where('[accrualID.employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
            .where('[accrualID.employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
            .groupBy(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID'])
            .attrs(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID', 'SUM([taxSum])', 'SUM([incomeSum])'])
            .selectAsObject({
              'accrualID.periodSalaryID': 'periodSalaryID',
              'accrualID.employeeNumberID': 'employeeNumberID',
              'SUM([taxSum])': 'paySum',
              'SUM([incomeSum])': 'baseSum'
            })
          if (empPdfoData && empPdfoData.length) {
            sumPdfoFop += (empPdfoData[0].paySum / empPdfoData[0].baseSum) * fopPdfo.paySum
          }
        }
      }
    })

    /* let sumPdfoFop = 0
    pdfoData.forEach(el => {
      let fopPdfo = fopDataForPdfo.find(fopRow => fopRow.employeeNumberID === el.employeeNumberID && fopRow.periodSalaryID === el.periodSalaryID)
      fopPdfo = fopPdfo ? fopPdfo.paySum : 0
      sumPdfoFop += el.baseSum > 0 ? (el.paySum / el.baseSum) * fopPdfo : 0
    }) */
    const value1030 = sumPdfoFop
    resultData.A1030_2 = (resultData.A1030_2 || 0) + value1030

    empNumberDS.runSQL(`SELECT
        en.ID as "employeeNumberID"
        ,en.orgID as "orgID"
      FROM hr_employeeNumber en
      LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where
       ep2.employeeNumberID = en.ID
       and ep2.isActive = 1
       and ep2.dateFrom <= :dateTo:
       and ep2.mi_deleteDate >= '9999-12-31'
       order by ep2.dateFrom desc ${sqlDialect.limit})
      WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
      AND en.dateFrom <= :dateTo:
      AND en.dateTo >= :dateFrom:
      AND en.mi_deleteDate >= '9999-12-31'
      ${deptClause}
    `, {
      orgIDs,
      deptIDs,
      dateTo: periodDateTo,
      dateFrom: periodDateFrom
    })
    const empNumberList = empNumberDS.getAsJsObject()

    let value1040 = 0
    let value1060 = 0
    let value1070 = 0
    orgIDs.forEach(orgID => {
      const empNumOrgIDs = empNumberList.filter(o => o.orgID === orgID).map(o => o.employeeNumberID)
      const empCountAll = reportService.getEmpCount(orgID, empNumOrgIDs, periodDateFrom, periodDateTo, reportParams.notAvgQuantityIDs, ['1'])
      value1040 = value1040 + empCountAll.count

      // load positons
      const empPosDatas = UB.Repository('hr_employeePositionS')
        .where('dateFrom', '<=', periodDateTo)
        .where('employeeNumberID', 'in', empNumberIDs)
        .where('organizationID', '=', orgID)
        .orderBy('dateFrom')
        .attrs(['employeeNumberID', 'workPlace', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'workScheduleID'])
        .selectAsObject()

      // find last position for employee
      const lastWorkPlaceByEmp = {}
      empPosDatas.forEach(empPosData => {
        lastWorkPlaceByEmp[empPosData.employeeNumberID] = empPosData
      })

      // filter by workPlace and correct fire date
      let workEmps = Object.values(lastWorkPlaceByEmp)
        .filter(empPosData => ['1', '2'].indexOf(empPosData.workPlace) >= 0)
      let workEmpNumIDs = workEmps
        .filter(empPos => dateService.shiftDate(empPos['employeeNumberID.dateTo']) < periodDateTo)
        .map(empPosData => empPosData.employeeNumberID)
        .filter(Boolean)
        .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
        .join(', ')

      let workScheduleIDs = workEmps
        .map(empPosData => empPosData.workScheduleID)
        .filter(Boolean)
        .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
        .join(', ')

      let minDayDateData = []
      if (workEmpNumIDs && workEmpNumIDs.length > 0 && workScheduleIDs && workScheduleIDs.length > 0) {
        const minDayDateSQL = `
        SELECT tp.workScheduleID as "workScheduleID", MIN(tp.dayDate) as "minDay", en.ID as "employeeNumberID"
      FROM tim_plan tp
      INNER JOIN hr_dictTimeCost dt ON dt.ID = tp.dictTimeCostID
      INNER JOIN hr_employeePosition ep ON ep.workScheduleID = tp.workScheduleID AND ep.isActive = 1
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
      WHERE tp.organizationID= :orgID:
      AND tp.dayDate>en.dateTo
      AND dt.timeCostType='WORK'
      AND tp.mi_deleteDate>= '9999-12-31'
      AND en.ID IN (${workEmpNumIDs})
      AND tp.workScheduleID IN (${workScheduleIDs})
      GROUP BY tp.workScheduleID, en.ID
    `
        const tmStore = UB.DataStore('tim_plan')
        tmStore.runSQL(minDayDateSQL, { orgID })
        minDayDateData = tmStore.getAsJsObject()
        tmStore.freeNative()
      }
      const empNums = workEmps
        .map(empPosData => {
          const dateTo = dateService.shiftDate(empPosData['employeeNumberID.dateTo'])
          let minDayData = minDayDateData.find(ep => ep.employeeNumberID === empPosData['employeeNumberID.dateTo'] && ep.workScheduleID === empPosData.workScheduleID)
          let dateToCorr = dateTo
          if (minDayData) {
            dateToCorr = dateService.addDays(dateService.shiftDate(minDayData.minDay), -1)
          }
          return {
            employeeNumberID: empPosData.employeeNumberID,
            dateFrom: dateService.shiftDate(empPosData['employeeNumberID.dateFrom']),
            dateTo: dateTo,
            dateToCorr: dateToCorr
          }
        })

      // load hour from timesheets
      value1060 = value1060 + Math.round(UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', workEmps.map(o => o.employeeNumberID))
        .where('[isActive]', '=', true)
        .where('[factTimeCostID.timeCostType]', '=', 'WORK', 'workType')
        .where('[factTimeCostID.code]', '=', 'Вдр', 'businessTrip')
        .where('[dateWork]', '>=', periodDateFrom)
        .where('[dateWork]', '<=', periodDateTo)
        .logic('([workType] OR [businessTrip])')
        .attrs(['SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [planHour] END)'])
        .selectScalar() || 0)

      // calculate fop filtered by workPlace
      value1070 = value1070 + (UB.Repository('hr_accrual')
        .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
        .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
        .whereIf(reportParams.notFOPS03IDs.length, '[payElID]', 'notIn', reportParams.notFOPS03IDs)
        .where(`(flagsRec & 8192 != 8192)`, 'custom')
        .where('periodCalc', '>=', periodDateFrom, 'pc1')
        .where('periodCalc', '<=', periodDateTo, 'pc2')
        .where('periodSalary', '<=', periodDateTo, 'pc3')
        .where('periodSalary', '>=', periodDateFrom, 'ps1')
        .where('periodSalary', '<=', periodDateTo, 'ps2')
        .where('periodCalc', '<', periodDateFrom, 'ps3')
        .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
        .attrs(['SUM([paySum])'])
        .selectScalar() || 0)
    })
    resultData.A1040_2 = (resultData.A1040_2 || 0) + value1040
    resultData.A1060_2 = (resultData.A1060_2 || 0) + value1060
    resultData.A1070_2 = (resultData.A1070_2 || 0) + value1070
    if (periodToDateFrom.getTime() === periodDateFrom.getTime()) {
      resultData.A1020_1 = Math.round(value1020 / 100) / 10
      resultData.A1030_1 = Math.round(value1030 / 100) / 10
      resultData.A1060_1 = value1060
      resultData.A1070_1 = Math.round(value1070 / 100) / 10
      resultData.A1040_1 = value1040
    }
  })

  resultData.A1040_2 = Math.round((resultData.A1040_2 || 0) / periodList.length)
  resultData.A1020_2 = Math.round(resultData.A1020_2 / 100) / 10
  resultData.A1030_2 = Math.round(resultData.A1030_2 / 100) / 10
  resultData.A1070_2 = Math.round(resultData.A1070_2 / 100) / 10
  if (params.row1030rate && (resultData.A1030_1 / resultData.A1020_1 * 100) > params.row1030rate) {
    resultData.A1030_1 = resultData.A1030_1 - 0.1
  }
  if (params.row1030rate && (resultData.A1030_2 / resultData.A1020_2 * 100) > params.row1030rate) {
    resultData.A1030_2 = resultData.A1030_2 - 0.1
  }

  const fssFundTypeID = UB.Repository('ac_dictFundType')
    .attrs('ID')
    .where('code', '=', '02')
    .selectScalar()

  const chaesFundTypeID = UB.Repository('ac_dictFundType')
    .attrs('ID')
    .where('code', '=', '03')
    .selectScalar()

  const getSumDebtByFundType = function (dictFundTypeID) {
    let resultSum = 0
    if (dictFundTypeID) {
      const dictFundSourceIDs = UB.Repository('ac_fundSource')
        .attrs('ID')
        .where('dictFundTypeID', '=', dictFundTypeID)
        .selectAsArrayOfValues()
      if (dictFundSourceIDs.length) {
        const accrualBalance = UB.Repository('hr_accrualBalance')
          .attrs('employeeNumberID', 'SUM([sumFrom])', 'SUM([sumPay])')
          .where('periodCalcID.dateFrom', '=', periodToDateFrom)
          .where('dictFundSourceID', 'in', dictFundSourceIDs)
          .where('employeeNumberID', 'in', empNumberIDs)
          .groupBy('employeeNumberID')
          .selectAsObject({
            'SUM([sumFrom])': 'sumFrom',
            'SUM([sumPay])': 'sumPay'
          })
        resultSum = accrualBalance.reduce((sum, row) => {
          if ((row['sumFrom'] - row['sumPay']) > 0) {
            sum = accrualService.round(sum + (row['sumFrom'] - row['sumPay']))
          }
          return sum
        }, 0)
      }
    }
    return resultSum
  }

  const value2040 = getSumDebtByFundType(fssFundTypeID)
  const value2070 = getSumDebtByFundType(chaesFundTypeID)
  resultData.A2040 = Math.round(value2040 / 100) / 10
  resultData.A2070 = Math.round(value2070 / 100) / 10

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }
  resultData.periodName = periodName
  resultData.curPeriodName = params.periodToRaw
  resultData.nextPeriodName = UB.Repository('hr_dictPeriod')
    .attrs('nextPeriodID.name')
    .where('ID', '=', params.periodToID)
    .selectScalar() || ''
  resultData.depName = depName

  resultData.signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []

  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getGeneralRegistry = function (ctx) {
  const params = ctx.mParams.execParams
  const resultData = consolReport.getGeneralRegistryData(params)
  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.get1NC = function (ctx) {
  const params = ctx.mParams.execParams
  const reportData = consolReport.get1NCData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getGroupReportData = function (ctx) {
  const params = ctx.mParams.execParams

  const resultData = {}

  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  resultData.orgName = hrOrg.name

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.periodTo)
        .where('mi_dateTo', '>=', params.periodTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }
  if (params.dictMultiGroupID) {
    depName = UB.Repository('hr_dictMultiGroup')
      .attrs('name')
      .where('ID', '=', params.dictMultiGroupID)
      .selectScalar()
    const depts = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', params.dictMultiGroupID)
      .selectAsObject()
    deptIDs = depts.map(o => o.departmentID)
    if (params.includeSubMultiGroup) {
      depName += ' (з підлеглими)'
      depts.forEach(departmentID => {
        const subDepts = UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', params.orgID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.periodTo)
          .where('mi_dateTo', '>=', params.periodTo)
          .where('mi_treePath', 'like', `%/${departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
  }

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }
  resultData.periodName = periodName
  resultData.depName = depName
  resultData.reportName = UB.Repository('hr_groupReport')
    .attrs('name')
    .where('ID', '=', params.groupReportID || 0)
    .selectScalar() || ''

  resultData.signers = UB.Repository('hr_dictSigners')
    .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
    .where('orgID', '=', params.orgID)
    .where('signerCode', '=', 'ACCRUALREPORTS')
    .where('departmentID', 'isNull')
    .orderBy('orderN')
    .selectAsObject({
      'employeeNumberID.employeeID.shortFIO': 'signerShortName'
    }) || []

  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getListDebtEmployees = function (ctx) {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getDebtEmployeesData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getListStudents = function (ctx) {
  const params = ctx.mParams.execParams
  params.onDate = dateService.shiftDate(params.onDate)
  params.showDismDate = params.showDismDate ? dateService.shiftDate(params.showDismDate) : null
  params.onlyDismDate = params.onlyDismDate ? dateService.shiftDate(params.onlyDismDate) : null
  const resultData = {
    reportTitle: params.reportTitle || UB.i18n('Список студентів'),
    onDate: params.onDate ? dateService.formatDate(params.onDate) : '',
    tableWidth: 1950,
    data: [],
    colSpan: 18,
    title: []
  }

  const sqlDialect = entityBaseService.getSQLDialect()
  // params.organizationID = appAC.globalOrganization()
  /*
  const orgNames = UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'name'])
    .where('state', '=', 'ACTIVE')
    .whereIf(params.includeSubOrg, 'mi_treePath', 'like', `%/${params.organizationID}/%`)
    .whereIf(!params.includeSubOrg, 'mi_data_id', '=', params.organizationID)
    .where('mi_dateFrom', '<=', params.periodTo)
    .where('mi_dateTo', '>=', params.periodFrom)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('treePath')
    .selectAsObject()
  const orgIDs = orgNames.map(o => o.mi_data_id)
  */
  const orgClause = staffService.getOrganizationClause(params.organizationID, false)
  let faculityClause = ''
  let studGroupClause = ''
  let typeStudyClause = ''
  let dictLevelClause = ''
  let formStudyClause = ''
  let yearClause = ''
  let inVacationClause = ''
  let haveBenefitsClause = ''
  if (params.facultyName) {
    resultData.title.push({ text: `${UB.i18n('Факультет')}: ${params.facultyName}` })
  }
  if (params.studGroupName) {
    resultData.title.push({ text: `${UB.i18n('Група')}: ${params.studGroupName}` })
  }
  if (params.typeStudyName) {
    resultData.title.push({ text: `${UB.i18n('Вид навчання')}: ${params.typeStudyName}` })
  }
  if (params.dictLevelIDName) {
    resultData.title.push({ text: `${UB.i18n('Освітній рівень')}: ${params.dictLevelIDName}` })
  }
  if (params.formStudyName) {
    resultData.title.push({ text: `${UB.i18n('Форма навчання')}: ${params.formStudyName}` })
  }

  if (params.facultyID) {
    faculityClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and  st.departmentID = ${params.facultyID} and 
      :onDate: between st.dateFrom and st.dateTo and st.mi_deleteDate >= '9999-12-31') `
  }

  if (params.studGroup) {
    studGroupClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and  st.groupID = ${params.studGroup} and 
      :onDate: between st.dateFrom and st.dateTo and st.mi_deleteDate >= '9999-12-31') `
  }

  if (params.typeStudy) {
    typeStudyClause = ` and exists (select 1 from hr_studEducationKind studKind
      where studKind.employeeNumberID = en.ID and  studKind.typeStudy = ${params.typeStudy} and 
      :onDate: between studKind.dateFrom and studKind.dateTo and studKind.mi_deleteDate >= '9999-12-31') `
  }

  if (params.dictLevelID) {
    dictLevelClause = ` and exists (select 1 from hr_studEducationKind studKind
      where studKind.employeeNumberID = en.ID and  studKind.dictLevelID = ${params.dictLevelID} and 
      :onDate: between studKind.dateFrom and studKind.dateTo and studKind.mi_deleteDate >= '9999-12-31') `
  }

  if (params.formStudy) {
    formStudyClause = ` and exists (select 1 from hr_studEducationKind studKind
      where studKind.employeeNumberID = en.ID and  studKind.formStudy = ${params.formStudy} and 
      :onDate: between studKind.dateFrom and studKind.dateTo and studKind.mi_deleteDate >= '9999-12-31') `
  }

  if (params.yearStudy) {
    resultData.title.push({ text: `${UB.i18n('Курс')}: ${params.yearStudy}` })
    yearClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and st.semester in (${params.yearStudy * 2 - 1}, ${params.yearStudy * 2}) and 
            :onDate: between st.dateFrom and st.dateTo and st.mi_deleteDate >= '9999-12-31') `
  }

  if (params.inVacation) {
    resultData.title.push({ text: `${UB.i18n('У відпустці')}` })
    inVacationClause = ` and exists (select 1 from hr_empLongTermAbsc vac
      where vac.employeeNumberID = en.ID and :onDate: between vac.dateFrom and vac.dateTo and vac.mi_deleteDate >= '9999-12-31') `
  }

  if (params.haveBenefits) {
    resultData.title.push({ text: `${UB.i18n('Мають пільги')}` })
    haveBenefitsClause = ` and exists (select 1 from hr_employeeBenefits bn
      where bn.employeeID = en.employeeID and :onDate: between bn.dateFrom and bn.dateTo and bn.mi_deleteDate >= '9999-12-31') `
  }

  let dateClause = ' and :onDate: between en.dateFrom and en.dateTo'
  if (params.showDismDate) {
    dateClause = ' and ((:onDate: between en.dateFrom and en.dateTo) or (en.dateTo >= :showDismDate: and en.dateTo <= :onDate:)) '
  }
  if (params.onlyDismDate) {
    resultData.title.push({ text: `${UB.i18n('Звільнені з')}: ${dateService.formatDate(params.onlyDismDate)}` })
    dateClause = 'and en.dateTo >= :onlyDismDate: and en.dateTo <= :onDate:'
  }

  const sqlTable = `from hr_studStipend stipend
  inner join hr_dictTypeStipend TypeStipend on TypeStipend.id = stipend.typeStipend and TypeStipend.mi_deleteDate >= '9999-12-31'
  where stipend.employeeNumberID = en.ID and :onDate: between stipend.dateFrom and stipend.dateTo
  and stipend.mi_deleteDate >= '9999-12-31' order by stipend.dateFrom desc `

  const sqlTypeStipendName = sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + typeStipend.name + ' ' + (case when sumStipend is not null then format(sumStipend, '#.##') else '' end) ${sqlTable} FOR XML PATH ('')), 1, 2, '')`
    : `(SELECT STRING_AGG(typeStipend.name, ' ', (case when sumStipend is not null then Cast(sumStipend::real as varchar) else '' end), ', ') ${sqlTable})`

  const ds = UB.DataStore('hr_employeeNumber')
  ds.runSQL(` SELECT en.id as "enID", en.tabNum as "tabNum", emp.fullFIO as "fullFIO",
  en.dateTo as "dateTo",
  en.employeeID as "employeeID", 
  emp.lastName as "lastName", emp.firstName as "firstName", emp.middleName as "middleName",  
  emp.empTaxCodeType as "empTaxCodeType",
  emp.taxCode as "taxCode",
  emp.birthDate as "birthDate",
  st.name as "sexType",
  country.name as "citizenship",
  faculity.name as "faculityName",
  (select ${sqlDialect.top} benefits.id from hr_employeeBenefits benefits where benefits.employeeID = en.employeeID and :onDate: between benefits.dateFrom and benefits.dateTo and benefits.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) as "benefits",
  
  (select ${sqlDialect.top} stud.semester from hr_studEducationHistory stud 
   where stud.employeeNumberID = en.ID and :onDate: between stud.dateFrom and stud.dateTo and stud.mi_deleteDate >= '9999-12-31' order by stud.dateFrom desc ${sqlDialect.limit}) as "semester",
  (select ${sqlDialect.top} studGroup.name from hr_studEducationHistory stud inner join hr_dictStudGroup studGroup on studGroup.id = stud.groupID 
  where stud.employeeNumberID = en.ID and :onDate: between stud.dateFrom and stud.dateTo and stud.mi_deleteDate >= '9999-12-31' order by stud.dateFrom desc ${sqlDialect.limit}) as "groupName",

  (select ${sqlDialect.top} formStudy.name from hr_studEducationKind studKind
  inner join ubm_enum formStudy on formStudy.code = studKind.formStudy and formStudy.eGroup = 'HR_EDUC_FORM'
  where studKind.employeeNumberID = en.ID and :onDate: between studKind.dateFrom and studKind.dateTo 
  and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "formStudyName",

  (select ${sqlDialect.top} typeStudy.name from hr_studEducationKind studKind
  inner join hr_dictTypeStudy typeStudy on typeStudy.id = studKind.typeStudy and typeStudy.mi_deleteDate >= '9999-12-31' 
  where studKind.employeeNumberID = en.ID and :onDate: between studKind.dateFrom and studKind.dateTo 
  and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "typeStudyName",

  (select ${sqlDialect.top} eduLevel.name from hr_studEducationKind studKind
  inner join hr_dictEducLevel eduLevel on eduLevel.id = studKind.dictLevelID and eduLevel.mi_deleteDate >= '9999-12-31' 
  where studKind.employeeNumberID = en.ID and :onDate: between studKind.dateFrom and studKind.dateTo 
  and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "eduLevelName",

  (select ${sqlDialect.top} averageScore from hr_studStipend stipend
  where stipend.employeeNumberID = en.ID and :onDate: between stipend.dateFrom and stipend.dateTo 
  and stipend.mi_deleteDate >= '9999-12-31' order by stipend.dateFrom desc ${sqlDialect.limit}) as "averageScore",

  (select sum(sumStipend) from hr_studStipend stipend
  where stipend.employeeNumberID = en.ID and :onDate: between stipend.dateFrom and stipend.dateTo 
  and stipend.mi_deleteDate >= '9999-12-31' ) as "sumStipend",
 
  ${sqlTypeStipendName} as "typeStipendName"

  FROM hr_employeeNumber en 
  JOIN hr_employee emp on en.employeeID = emp.ID 
  JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1 
     and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.isActive = 1
     and ep2.mi_deleteDate >= '9999-12-31' and ep2.employeeNumberID = ep.employeeNumberID    
     and ep2.dateFrom <= :onDate: order by ep2.dateFrom desc ${sqlDialect.limit})
  LEFT JOIN hr_department faculity on faculity.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2 INNER join hr_studEducationHistory stud2 on stud2.departmentID = dep2.mi_data_id   
     Where stud2.employeeNumberID = en.ID  and dep2.orgID = en.orgID                      
       and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :onDate:) then :onDate: 
                                   when en.dateTo <= :onDate: then en.dateTo end)                
       and dep2.mi_deleteDate >= '9999-12-31' and dep2.state = 'ACTIVE'
       and stud2.mi_deleteDate >= '9999-12-31'              
     order by dep2.mi_dateFrom desc ${sqlDialect.limit})
  LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
  LEFT JOIN cdn_country country ON country.ID = emp.citizenshipID and country.mi_deleteDate >='9999-12-31'
  WHERE
    en.kind = 'STUD' and en.mi_deleteDate >= '9999-12-31' and ep.mi_deleteDate >= '9999-12-31' and emp.mi_deleteDate >= '9999-12-31'

    ${dateClause}
    ${orgClause}
    ${faculityClause} 
    ${yearClause} 
    ${studGroupClause} 
    ${typeStudyClause} 
    ${dictLevelClause} 
    ${formStudyClause} 
    ${inVacationClause} 
    ${haveBenefitsClause} 
 
  ORDER BY emp.fullFIO`, {
    organizationID: params.organizationID,
    onDate: params.onDate,
    onlyDismDate: params.onlyDismDate,
    showDismDate: params.showDismDate
  })
  resultData.data = ds.getAsJsObject()

  let vacancy = UB.Repository('hr_empLongTermAbsc')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('organizationID', '=', params.organizationID)
    .where('dateFrom', '<=', params.onDate)
    .where('dateTo', '>=', params.onDate)
    .selectAsObject()
  vacancy = vacancy.length ? _.groupBy(vacancy, 'employeeNumberID') : {}

  const employeeIDs = resultData.data.filter(e => e.benefits).map(e => e.employeeID)
  let benefits = []
  if (employeeIDs.length) {
    const ids = _.chunk(employeeIDs, 1000)
    for (let i = 0; i < ids.length; i++) {
      const employeeBenefits = UB.Repository('hr_employeeBenefits')
        .attrs(['employeeID', 'dateFrom', 'dateTo', 'dictBenefitsKindID.name'])
        .where('employeeID', 'in', ids[i])
        .where('dateFrom', '<=', params.onDate)
        .where('dateTo', '>=', params.onDate)
        .selectAsObject()
      benefits.push(...employeeBenefits)
    }
  }
  benefits = benefits.length ? _.groupBy(benefits, 'employeeID') : {}

  resultData.data.forEach((item, i) => {
    item.npp = i + 1
    item.taxCode = item.empTaxCodeType === 'TAXCODE' ? item.taxCode : ''
    item.name = `${item.lastName ? item.lastName.toUpperCase() : ''}${item.firstName || item.middleName ? ' ' : ''}${item.firstName ? item.firstName.charAt(0).toUpperCase() + '.' : ''}${item.middleName ? item.middleName.charAt(0).toUpperCase() + '.' : ''}`
    item.birthDate = item.birthDate ? dateService.formatDate(item.birthDate) : ''
    item.dateTo = item.dateTo && dateService.formatDate(item.dateTo) !== '31.12.9999' ? dateService.formatDate(item.dateTo) : ''
    item.yearStudy = ''
    if (item.semester) {
      item.yearStudy = '' + Math.trunc((item.semester + 1) / 2)
    }
    item.stipendInfo = item.typeStipendName || ''
    // item.stipendInfo = `${item.typeStipendName || ''}${item.typeStipendName && item.typeStipendName ? ' ' : ''}${item.sumStipend ? currencyService.formatAsCurrencyEx(item.sumStipend, 2, '.', true, '') : ''}`

    item.vacancyInfo = ''
    if (vacancy[item.enID]) {
      item.vacancyInfo = vacancy[item.enID].map(v => {
        return `${v.dateFrom ? dateService.formatDate(v.dateFrom) : ''}${v.dateFrom && v.dateTo ? ' - ' : ''}${v.dateTo ? dateService.formatDate(v.dateTo) : ''}`
      }).filter(Boolean).join(', ')
    }

    item.benefitsInfo = ''
    if (benefits[item.employeeID]) {
      item.benefitsInfo = benefits[item.employeeID].map(v => {
        let text = (v['dictBenefitsKindID.name'] || '') + ' '
        text += v.dateFrom ? dateService.formatDate(v.dateFrom) : ''
        text += v.dateTo && dateService.formatDate(v.dateTo) !== '31.12.9999' ? (v.dateFrom ? ' - ' : '') + dateService.formatDate(v.dateTo) : ''
        return text
      }).join(', ')
    }
  })

  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.getSummarizedCostItems = function (ctx) {
  const params = ctx.mParams.execParams
  const reportData = consolReport.getCostItemsData(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}

me.getEmployeeAccrualList = function (ctx) {
  const params = ctx.mParams.execParams
  const reportData = controlReport.getEmployeeAccrualList(params)
  ctx.mParams.resultData = JSON.stringify(reportData)
}
