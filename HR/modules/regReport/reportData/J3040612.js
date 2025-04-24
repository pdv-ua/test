const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const experienceService = require('../../../../HR/modules/experienceService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
const reportService = require('../../../../HR/modules/reportService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = structureReport()
  prepareStructureReport(data)
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })

  prepareQueryParams({ data, params })

  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HTIN', 'HTIN1', 'HNAME', 'HZM', 'HZY', 'HZB', 'HZS',

  'T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8S', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG111', 'T1RXXXXG112', 'T1RXXXXG121S', 'T1RXXXXG122S', 'T1RXXXXG123S',
  'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'T1RXXXXG21', 'T1RXXXXG22', 'T1RXXXXG23',
  'T1RXXXXG24', 'T1RXXXXG25', 'R01G17', 'R01G18', 'R01G19', 'R01G20', 'R01G21',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3040612.xsd'
  }
  const excludeCell = Object.keys(data.DECLAR.DECLARBODY).filter(cName => cellNames.indexOf(cName) < 0)
  excludeCell.forEach(cName => {
    delete data.DECLAR.DECLARBODY[cName]
  })
  cellNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
}

function prepareQueryParams ({ data, params }) {
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(params.dateFrom)
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARBODY } = data.DECLAR

  DECLARBODY.HZB = params.FORM_TYPE === 'HZB'
  DECLARBODY.HZS = params.FORM_TYPE === 'HZS'

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']

  let periodDateFrom = dateService.shiftDate(params.dateFrom)
  let periodDateTo = dateService.shiftDate(params.dateTo)
  const period = periodService.getPeriodOnDate(params.organizationID, periodDateFrom)
  const periods = periodService.getArrayPeriods(params.organizationID, periodDateFrom)

  const reportParams = reportService.getReportParams(params.organizationID, [ 'ECBVAC', 'ECBT1RG13', 'ECBT1RG14', 'ECBT1RG16' ])
  const esvDatas = UB.Repository('hr_accrualFund')
    .attrs(['periodSalaryID.dateFrom', 'payFundID.code', 'payFundID.typeTaxECBID.code', 'sourceSum', 'baseSum', 'addMinSum', 'rate', 'paySum',
      'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType', 'employeeNumberID.employeeID.citizenshipID.code',
      'employeeNumberID.employeeID.sexType', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'employeeNumberID', 'periodSalaryID', 'payFundID', 'employeeNumberID.employeeID'])
    .where('[periodCalcID.orgID]', '=', params.organizationID)
    .where('[periodCalcID]', '=', period.ID)
    .where('[payFundID.payFundMethodID.code]', 'in', ['1', '2'])
    .where('[paySum]', '!=', 0, 'ps')
    .where('[baseSum]', '!=', 0, 'bs')
    .where('[addMinSum]', '!=', 0, 'ams')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .logic('([ps] OR [bs] OR [ams])')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject()

  const esvData140 = UB.Repository('hr_employeeAccrual')
    .attrs(['employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType', 'employeeNumberID.employeeID.citizenshipID.code',
      'employeeNumberID.employeeID.sexType', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID', 'employeeNumberID.employeeID'])
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '140')
    .where('dateFrom', '<=', period.dateTo)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject()

  esvData140.forEach(row => {
    row['periodSalaryID.dateFrom'] = dateService.formatDate(period.dateFrom, 'yyyy-mm-dd hh:nn:ss.000')
    row['payFundID.code'] = null
    row['payFundID.typeTaxECBID.code'] = null
    row['sourceSum'] = null
    row['baseSum'] = null
    row['addMinSum'] = null
    row['rate'] = null
    row['paySum'] = null
    row['periodSalaryID'] = period.ID
    row['payFundID'] = null
    row['isVac140'] = true
    esvDatas.push(row)
  })

  esvDatas.sort((a, b) => {
    const objStrA = a['employeeNumberID.employeeID.lastName'] + a['employeeNumberID.employeeID.firstName'] + a['employeeNumberID.employeeID.middleName'] + a['periodSalaryID.dateFrom']
    const objStrB = b['employeeNumberID.employeeID.lastName'] + b['employeeNumberID.employeeID.firstName'] + b['employeeNumberID.employeeID.middleName'] + b['periodSalaryID.dateFrom']
    return objStrA < objStrB ? -1 : (objStrA === objStrB ? 0 : 1)
  })

  // load positions which intersects with period
  const empNumIDs = esvDatas.map(esvData => esvData.employeeNumberID)
  let employeeIDs = esvDatas.map(esvData => esvData['employeeNumberID.employeeID'])
  const numEmpData = esvDatas.map(esvData => {
    return { employeeNumberID: esvData.employeeNumberID,
      employeeID: esvData['employeeNumberID.employeeID'] }
  })
  const empPosDatas = UB.Repository('hr_employeePositionS')
    .where('[employeeNumberID]', 'in', empNumIDs)
    .where('[dateFrom]', '<', periodDateTo)
    .where('[dateTo]', '>=', periodDateFrom)
    .orderBy('dateFrom')
    .attrs(['employeeNumberID', 'dateNew', 'workPlace', 'mtCount'])
    .selectAsObject()

  // find last position for employee, fill flags
  const empPosDatasByEmp = {}
  empPosDatas.forEach(posData => {
    empPosDatasByEmp[posData.employeeNumberID] = posData
  })

  const esvDatasFull = []
  esvDatas.forEach(esvData => {
    if (esvData['periodSalaryID.dateFrom']) {
      esvData['periodSalaryID.dateFrom'] = dateService.shiftDate(esvData['periodSalaryID.dateFrom'])
    }
    esvData['employeeNumberID.dateTo'] = dateService.shiftDate(esvData['employeeNumberID.dateTo'])
    if (esvData.addMinSum) {
      const copy = Object.assign({}, esvData)
      copy.sourceSum = 0
      copy.baseSum = 0
      copy.factSum = accrualService.round((copy.addMinSum * copy.rate) / 100, 2)
      if (empPosDatasByEmp[copy.employeeNumberID]) {
        copy.dateNew = dateService.shiftDate(empPosDatasByEmp[copy.employeeNumberID].dateNew)
        copy.workPlace = empPosDatasByEmp[copy.employeeNumberID].workPlace
        copy.mtCount = empPosDatasByEmp[copy.employeeNumberID].mtCount
      }
      esvDatasFull.push(copy)
    }
    esvData.baseSum = accrualService.round((esvData.baseSum || 0) - (esvData.addMinSum || 0), 2)
    esvData.factSum = accrualService.round((esvData.paySum || 0) - ((esvData.addMinSum || 0) * esvData.rate) / 100, 2)
    esvData.addMinSum = 0
    if (empPosDatasByEmp[esvData.employeeNumberID]) {
      esvData.dateNew = dateService.shiftDate(empPosDatasByEmp[esvData.employeeNumberID].dateNew)
      esvData.workPlace = empPosDatasByEmp[esvData.employeeNumberID].workPlace
      esvData.mtCount = empPosDatasByEmp[esvData.employeeNumberID].mtCount
    }
    if (esvData.periodSalaryID !== period.ID && esvData['employeeNumberID.dateTo'] >= period.dateFrom &&
      !['29', '36', '37', '39', '42', '43', '44', '45', '50'].includes(esvData['payFundID.typeTaxECBID.code'])) {
      esvData['periodSalaryID.dateFrom'] = dateService.shiftDate(period.dateFrom)
      esvData.periodSalaryID = period.ID
    } else if (esvData['employeeNumberID.dateTo'] < period.dateFrom &&
      esvData['periodSalaryID.dateFrom'] > esvData['employeeNumberID.dateTo']) {
      const onPeriod = periods.find(o => o.dateTo >= esvData['employeeNumberID.dateTo'] && o.dateFrom <= esvData['employeeNumberID.dateTo'])
      if (onPeriod) {
        esvData['periodSalaryID.dateFrom'] = dateService.shiftDate(onPeriod.dateFrom)
        esvData.periodSalaryID = onPeriod.ID
      }
    }
    esvDatasFull.push(esvData)
  })
  esvDatasFull.forEach(row => {
    if (row['employeeNumberID.dateTo'] < row['periodSalaryID.dateFrom']) {
      row.payCode = 1
      return
    }
    if (!row.paySum && row.baseSum > 0) {
      row.payCode = 2
      return
    }
    if (!row.paySum && row.baseSum < 0) {
      row.payCode = 3
      return
    }

    if (reportParams.ECBVACIDs.indexOf(row['payFundID']) >= 0) {
      row.payCode = 10
      return
    }
    if ((row['periodSalaryID.dateFrom'] < periodDateFrom) &&
      (dateService.shiftDate(row['employeeNumberID.dateTo']) <= periodDateTo) &&
      (reportParams.ECBVACIDs.indexOf(row['payFundID']) >= 0) &&
      (row.sourceSum < 0) &&
      row.addMinSum) {
      row.payCode = 14
      return
    }
    if ((row['periodSalaryID.dateFrom'] <= periodDateFrom) && row.addMinSum) {
      row.payCode = 13
    }
  })

  const esvDatasAggs = Object.values(
    esvDatasFull.reduce((aggObj, row) => {
      const aggKey = row.employeeNumberID + '_' + row['payFundID.typeTaxECBID.code'] + '_' + row.payCode + '_' + row.periodSalaryID
      const aggRow = aggObj[aggKey]
      if (!aggRow) {
        aggObj[aggKey] = Object.assign({}, row)
      } else {
        aggRow.sourceSum = accrualService.round(aggRow.sourceSum + (row.sourceSum || 0), 6)
        aggRow.baseSum = accrualService.round(aggRow.baseSum + (row.baseSum || 0), 6)
        aggRow.factSum = accrualService.round(aggRow.factSum + (row.factSum || 0), 6)
        aggRow.addMinSum = accrualService.round(aggRow.addMinSum + (row.addMinSum || 0), 6)
        aggRow.isVac140 = row['isVac140']
      }
      return aggObj
    }, {})
  )
  // taxCode = 1506110186
  // 1 block
  let store = UB.DataStore('tim_timeSheet')
  if (reportParams.ECBT1RG13IDs.length && empNumIDs.length) {
    store.runSQL(`
    SELECT a.employeeNumberID "employeeNumberID", a.periodSalary "periodSalary",
     sum(CASE WHEN a.flagsRec & 1024 = 0 THEN a.days ELSE 0 END) "daysCount",
     sum(CASE WHEN a.flagsRec & 1024 = 0 and a.flagsRec & 512 = 0 THEN a.days ELSE 0 END) "daysCountSt",
     sum(CASE WHEN a.flagsRec & 1024 = 1024 THEN a.days ELSE 0 END) "daysCountD"
    FROM hr_accrual a
    where a.periodCalcID = :periodID: AND a.employeeNumberID${entityBaseService.getInExpression('empNumIDs')}
     AND a.payElID${entityBaseService.getInExpression('ECBT1RG13IDs')}
    and a.flagsRec & 4096 = 0 and a.flagsRec & 8192 = 0
    GROUP BY a.employeeNumberID, a.periodSalary
  `, {
      empNumIDs,
      ECBT1RG13IDs: reportParams.ECBT1RG13IDs,
      periodID: period.ID
    })
  }
  let accruals = reportParams.ECBT1RG13IDs.length ? store.getAsJsObject() : []

  accruals.forEach(ts => {
    if (ts.daysCount <= 0) {
      if (ts.daysCountSt > 0) {
        ts.daysCount = ts.daysCountSt
      } else if (ts.daysCountD > 0) {
        ts.daysCount = ts.daysCountD
      } else {
        ts.daysCount = 0
      }
    }
    ts.periodSalary = dateService.shiftDate(ts.periodSalary)
    let esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.periodSalary.getTime() &&
      ['29', '36'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysSick = ts.daysCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.periodSalary.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysSick = ts.daysCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.periodSalary.getTime() &&
      !['42, 43'].includes(esvDatasAgg['payFundID.typeTaxECBID.code']) && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysSick = ts.daysCount
    }
  })

  // 2 block
  if (reportParams.ECBT1RG14IDs.length && empNumIDs.length) {
    store.runSQL(`SELECT A01.employeeNumberID "employeeNumberID", (COUNT(*)) AS "orderCount", 
     ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)`} AS "dateWork"
      FROM tim_timeSheet A01  
      WHERE A01.employeeNumberID${entityBaseService.getInExpression('empNumIDs')}
    AND A01.isActive=1 AND A01.periodID = :periodID: AND A01.factTimeCostID IN (SELECT * FROM :ECBT1RG14IDs:) 
    AND A01.dateWork >= :periodDateFrom: AND A01.dateWork <= :periodDateTo: AND A01.mi_deleteDate >= '9999-12-31'
    GROUP BY A01.employeeNumberID, ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)::TIMESTAMP`}  
`, {
      empNumIDs,
      ECBT1RG14IDs: reportParams.ECBT1RG14IDs,
      periodID: period.ID,
      periodDateFrom,
      periodDateTo
    })
  }
  let timeSheets = reportParams.ECBT1RG14IDs.length ? store.getAsJsObject() : []

  timeSheets.forEach(ts => {
    ts.dateWork = dateService.shiftDate(ts.dateWork)
    let esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0)
    if (esvDatasAgg) {
      esvDatasAgg.daysWOPay = ts.orderCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime() &&
      !['42, 43'].includes(esvDatasAgg['payFundID.typeTaxECBID.code']))
    if (esvDatasAgg) {
      esvDatasAgg.daysWOPay = ts.orderCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime())
    if (esvDatasAgg) {
      esvDatasAgg.daysWOPay = ts.orderCount
    }
  })

  // 3 block
  let empIDs = esvDatasAggs.map(esvDatasAgg => esvDatasAgg.employeeNumberID)
  if (empIDs.length && empNumIDs.length) {
    store.runSQL(`SELECT A01.employeeNumberID "employeeNumberID", (COUNT(*)) AS "orderCount",
     ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)`} AS "dateWork"
    FROM tim_timeSheet A01 
    JOIN hr_dictTimeCost fc ON fc.ID = A01.factTimeCostID 
    WHERE A01.employeeNumberID${entityBaseService.getInExpression('empNumIDs')}
    AND A01.isActive=1 
    AND A01.dateWork >= :periodDateFrom: AND A01.dateWork <= :periodDateTo: AND A01.mi_deleteDate >= '9999-12-31'
    AND fc.timeCostType <> 'NOT'
    GROUP BY A01.employeeNumberID, ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)::TIMESTAMP`} 
  `, {
      empNumIDs,
      periodDateFrom,
      periodDateTo
    })
  }

  timeSheets = empIDs.length ? store.getAsJsObject() : []

  timeSheets.forEach(ts => {
    ts.dateWork = dateService.shiftDate(ts.dateWork)
    let esvDatasAggAll = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime() &&
          ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0)

    let esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => (esvDatasAgg.payCode === 0 || !esvDatasAgg.payCode) &&
      (esvDatasAgg.sourceSum || esvDatasAgg.baseSum || esvDatasAgg.addMinSum || esvDatasAgg.factSum))
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }
    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode > 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime() &&
          ['29', '42', '43'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode === 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.dateWork.getTime())
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
    }
  })

  // 4 block
  empIDs = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.workPlace === '4').map(esvDatasAgg => esvDatasAgg.employeeNumberID)

  const empCphDatas = UB.Repository('hr_employeeCPH')
    .where('[employeeNumberID]', 'in', empIDs)
    .where('[dateFrom]', '<', periodDateTo)
    .where('[dateTo]', '>=', periodDateFrom, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('(([dateTo]) or ([dateToIsNull]))')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .selectAsObject()

  empCphDatas.forEach(ts => {
    ts.dateFrom = dateService.shiftDate(ts.dateFrom)
    ts.dateTo = dateService.shiftDate(ts.dateTo)
    if (ts.dateFrom < periodDateFrom) {
      ts.dateFrom = periodDateFrom
    }
    if (ts.dateTo > dateService.lastDayOfMonth(periodDateFrom)) {
      ts.dateTo = dateService.lastDayOfMonth(periodDateFrom)
    }
    ts.days = dateService.dayDiff(ts.dateFrom, ts.dateTo) + 1

    let esvDatasAggAll = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === periodDateFrom.getTime() &&
          ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0)

    let esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode === 0 || !esvDatasAgg.payCode)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = ts.days
      return
    }
    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode > 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = ts.days
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === periodDateFrom.getTime() &&
          ['29', '42', '43'].indexOf(esvDatasAgg['payFundID.typeTaxECBID.code']) >= 0)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = ts.days
      return
    }

    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode === 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = ts.days
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === periodDateFrom.getTime())
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = ts.days
    }
  })
  // 5 block
  // документи-підстави для вагітності і пологам
  if (reportParams.ECBT1RG16IDs.length && empNumIDs.length) {
    store.runSQL(`
    SELECT a.employeeNumberID "employeeNumberID", a.periodSalary "periodSalary",
    sum(CASE WHEN a.flagsRec & 1024 = 0 THEN a.days ELSE 0 END) "daysCount",
     sum(CASE WHEN a.flagsRec & 1024 = 0 and a.flagsRec & 512 = 0 THEN a.days ELSE 0 END) "daysCountSt",
     sum(CASE WHEN a.flagsRec & 1024 = 1024 THEN a.days ELSE 0 END) "daysCountD"
    FROM hr_accrual a
    where a.employeeNumberID${entityBaseService.getInExpression('empNumIDs')}
     AND a.periodCalcID = :periodID: AND a.payElID IN (SELECT * FROM :ECBT1RG16IDs:) 
    and a.flagsRec & 4096 = 0 and a.flagsRec & 8192 = 0
    GROUP BY a.employeeNumberID, a.periodSalary
  `, {
      empNumIDs,
      ECBT1RG16IDs: reportParams.ECBT1RG16IDs,
      periodID: period.ID
    })
  }
  accruals = reportParams.ECBT1RG13IDs.length ? store.getAsJsObject() : []
  // вагітності і пологам
  accruals.forEach((ts, ind) => {
    if (ts.daysCount <= 0) {
      if (ts.daysCountSt > 0) {
        ts.daysCount = ts.daysCountSt
      } else if (ts.daysCountD > 0) {
        ts.daysCount = ts.daysCountD
      } else {
        ts.daysCount = 0
      }
    }
    ts.periodSalary = dateService.shiftDate(ts.periodSalary)
    const existEsvDatasAgg = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalaryID.dateFrom'] && esvDatasAgg['periodSalaryID.dateFrom'].getTime() === ts.periodSalary.getTime() &&
      (esvDatasAgg['payFundID.typeTaxECBID.code'] === '42' || esvDatasAgg['payFundID.typeTaxECBID.code'] === '43' ||
        esvDatasAgg['payFundID.typeTaxECBID.code'] === '44' || esvDatasAgg['payFundID.typeTaxECBID.code'] === '45' ||
        esvDatasAgg['payFundID.typeTaxECBID.code'] === '50'))
    const existEmpLength = existEsvDatasAgg.length
    let esvDatasAgg = existEmpLength ? existEsvDatasAgg[0] : null
    if (esvDatasAgg) {
      esvDatasAgg.daysPregn = ts.daysCount
      if ((existEmpLength > 1 && esvDatasAgg.daysWork) || existEmpLength === 1) {
        if (ind === 0) {
          let enDateFrom = dateService.shiftDate(esvDatasAgg['employeeNumberID.dateFrom'])
          let psDateFrom = dateService.shiftDate(esvDatasAgg['periodSalaryID.dateFrom'])

          if (enDateFrom <= psDateFrom) {
            esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? dateService.daysInMonth(psDateFrom.getFullYear(), psDateFrom.getMonth() + 1)
              : (esvDatasAgg.workPlace === '2' &&
              !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
                ? dateService.daysInMonth(psDateFrom.getFullYear(), psDateFrom.getMonth() + 1) : null)
          } else {
            let dLast = dateService.lastDayOfMonth(psDateFrom)
            esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? dateService.dateDiff(enDateFrom, dLast)
              : (esvDatasAgg.workPlace === '2' &&
              !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
                ? dateService.dateDiff(enDateFrom, dLast) : null)
          }
        } else {
          esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.daysCount
            : (esvDatasAgg.workPlace === '2' &&
            !esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === esvDatasAgg['employeeNumberID.employeeID'] && o.workPlace === '1')
              ? ts.daysCount : null)
        }
      }
    }
  })
  employeeIDs = employeeIDs.filter((el, index, arr) => arr.indexOf(el) === index)

  const empExps = UB.Repository('hr_employeeExperience')
    .where('[dictExperienceID.experienceSpecID]', 'isNotNull')
    .where(`COALESCE([startCalcDate], '9999-12-31T00:00:00')`, '>=', periodDateFrom)
    .where('employeeID', 'in', employeeIDs)
    .attrs(['ID', 'employeeID', 'dictExperienceID', 'dictExperienceID.includeSecondJobs'])
    .selectAsObject()
  // 6 block
  let expSpecEmpNums = []
  empExps.forEach(item => {
    // определение спец.стаж > 0 или нет
    let empNums = numEmpData.filter(el => el.employeeID === item.employeeID)
    if (empNums && empNums.length > 0) {
      empNums = empNums.map(el => el.employeeNumberID)
      empNums = empNums.filter((el, index, arr) => arr.indexOf(el) === index)
      empNums.forEach(num => {
        let expObj = experienceService.calculateExperience(num, item['dictExperienceID'],
          periodDateTo, periodDateFrom, false)
        if (expObj && expObj.totalDays > 0) {
          expSpecEmpNums.push({ employeeNumberID: num, employeeID: item['dictExperienceID.includeSecondJobs'] ? null : item.employeeID })
        }
      })
    }
  })

  expSpecEmpNums.forEach(empNum => {
    let esvDatasAgg = esvDatasAggs.filter(esvDatasAgg => (esvDatasAgg.employeeNumberID === empNum.employeeNumberID || esvDatasAgg.employeeID === empNum.employeeID) &&
      (esvDatasAgg['periodSalaryID.dateFrom'] >= periodDateFrom || esvDatasAgg['payFundID.typeTaxECBID.code'] === '25'))
    esvDatasAgg.forEach(ed => {
      ed.specExp = true
    })
  })

  const timeSheetChanges = UB.Repository('hr_timeSheetChangeEmp')
    .where('[employeeNumberID]', 'in', empNumIDs)
    .where('[timeSheetChangeID.typeSheetChange]', 'in', ['1', '3'])
    .where('[timeSheetChangeID.dateFrom]', '<', dateService.shiftDate(params.dateTo))
    .where('[timeSheetChangeID.dateTo]', '>=', dateService.shiftDate(params.dateTo))
    .groupBy('employeeNumberID')
    .attrs(['employeeNumberID', 'COUNT(*)'])
    .selectAsObject()

  const timeSheetChangesByEmp = {}
  timeSheetChanges.forEach(tsc => {
    timeSheetChangesByEmp[tsc.employeeNumberID] = true
  })
  for (let i = esvDatasAggs.length - 1; i >= 0; i--) {
    const row = esvDatasAggs[i]
    if (row.sourceSum || row.baseSum || row.addMinSum || row.factSum || row.isVac140) {
      const existRow = esvDatasAggs.find(o => o['employeeNumberID.employeeID'] === row['employeeNumberID.employeeID'] &&
        row['payFundID.typeTaxECBID.code'] === o['payFundID.typeTaxECBID.code'] && row.employeeNumberID !== o.employeeNumberID &&
        row.payCode === o.payCode && row.daysSick === o.daysSick && row.daysWOPay === o.daysWOPay && row.daysPregn === o.daysPregn &&
      ((row.workPlace === '1') ? '1' : '0') === ((o.workPlace === '1') ? '1' : '0') && (row.specExp ? '1' : '0') === (o.specExp ? '1' : '0') &&
        (((row.mtCount < 1) || timeSheetChangesByEmp[row.employeeNumberID]) ? '1' : '0') === (((o.mtCount < 1) || timeSheetChangesByEmp[o.employeeNumberID]) ? '1' : '0') &&
      ((row.dateNew && (row.dateNew < dateService.shiftDate(params.dateTo)) && (row.dateNew >= dateService.addYears(periodDateFrom, -2))) ? '1' : '0') ===
      ((o.dateNew && (o.dateNew < dateService.shiftDate(params.dateTo)) && (o.dateNew >= dateService.addYears(periodDateFrom, -2))) ? '1' : '0')
      )
      if (existRow) {
        existRow.sourceSum = accrualService.round(existRow.sourceSum + row.sourceSum, 6)
        existRow.baseSum = accrualService.round(existRow.baseSum + row.baseSum, 6)
        existRow.addMinSum = accrualService.round(existRow.addMinSum + row.addMinSum, 6)
        existRow.factSum = accrualService.round(existRow.factSum + row.factSum, 6)
        esvDatasAggs.splice(i, 1)
      }
    } else {
      esvDatasAggs.splice(i, 1)
    }
  }
  esvDatasAggs.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T1RXXXXG6', rownum, (row['employeeNumberID.employeeID.citizenshipID.code'] === 'UKR') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG7', rownum, (row['employeeNumberID.employeeID.sexType'] === 'M') ? 'Ч' : (row['employeeNumberID.employeeID.sexType'] === 'W') ? 'Ж' : null)
    updateCellInArray(data, 'T1RXXXXG8S', rownum, `${row['employeeNumberID.employeeID.empTaxCodeType'] === 'PASSPORT' ? 'БК' : (row['employeeNumberID.employeeID.empTaxCodeType'] === 'IDCARD' ? 'П' : '')}${row['employeeNumberID.employeeID.taxCode']}`)
    updateCellInArray(data, 'T1RXXXXG9', rownum, row['payFundID.typeTaxECBID.code'])
    updateCellInArray(data, 'T1RXXXXG10', rownum, row.payCode)
    updateCellInArray(data, 'T1RXXXXG111', rownum, dateService.shiftDate(row['periodSalaryID.dateFrom']).getMonth() + 1)
    updateCellInArray(data, 'T1RXXXXG112', rownum, dateService.shiftDate(row['periodSalaryID.dateFrom']).getFullYear())
    updateCellInArray(data, 'T1RXXXXG121S', rownum, row['employeeNumberID.employeeID.lastName'])
    updateCellInArray(data, 'T1RXXXXG122S', rownum, row['employeeNumberID.employeeID.firstName'])
    updateCellInArray(data, 'T1RXXXXG123S', rownum, row['employeeNumberID.employeeID.middleName'])
    updateCellInArray(data, 'T1RXXXXG13', rownum, row.daysSick) // Тимчасова непрацездатність
    updateCellInArray(data, 'T1RXXXXG14', rownum, row.daysWOPay) // Непрацездатність Без збереження зп
    updateCellInArray(data, 'T1RXXXXG15', rownum, row.daysWork)
    updateCellInArray(data, 'T1RXXXXG16', rownum, row.daysPregn) // Пологи

    updateCellInArray(data, 'T1RXXXXG17', rownum, row.sourceSum)
    updateCellInArray(data, 'T1RXXXXG18', rownum, row.baseSum)
    updateCellInArray(data, 'T1RXXXXG19', rownum, row.addMinSum)
    updateCellInArray(data, 'T1RXXXXG20', rownum, null)
    updateCellInArray(data, 'T1RXXXXG21', rownum, row.factSum)
    updateCellInArray(data, 'T1RXXXXG22', rownum, (row.workPlace === '1') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG23', rownum, row.specExp ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG24', rownum, ((row.mtCount < 1) || timeSheetChangesByEmp[row.employeeNumberID]) ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG25', rownum, (row.dateNew && (row.dateNew < dateService.shiftDate(params.dateTo)) && (row.dateNew >= dateService.addYears(periodDateFrom, -2))) ? '1' : '0')
  })
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'T1RXXXXG8S', 'T1RXXXXG121S', 'T1RXXXXG122S', 'T1RXXXXG123S', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'HZB', 'HZS'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG111', 'T1RXXXXG112', 'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG22', 'T1RXXXXG23', 'T1RXXXXG24', 'T1RXXXXG25'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'T1RXXXXG21', 'R01G17', 'R01G18', 'R01G19', 'R01G20', 'R01G21'],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  const formTypeElementName = DECLARBODY.HZS === 1 || DECLARBODY.HZS === 'true' ? 'HZS' : 'HZB'

  const attrList = allBodyAttrNames.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
  attrList.splice(5, 0, formTypeElementName)
  const attrListExt = buildAttrsExt(attrList, cellFormats)
  if (data.data.DECLAR.DECLARBODY.T1RXXXXG7 instanceof Array) {
    data.data.DECLAR.DECLARBODY.T1RXXXXG7.forEach(item => {
      switch (item._) {
        case 'Ч':
          item._ = '1'
          break
        case 'Ж':
          item._ = '0'
          break
      }
    })
  }
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.data.DECLAR.DECLARHEAD, attrList: attrListHead }),
      DECLARBODY: createDeclarExt({ declar: data.data.DECLAR.DECLARBODY, attrListExt })
    }
  }
  const xmlFileName = `${generateFileName(DECLARHEAD)}.xml`
  return { xmlData, xmlFileName }
}

function addTempleteForCustomRow (params) {
  params.T1 = [
    `<tr><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px;" rowspan="2" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;" rowspan="2"><span class="row_num">ROWNUM</span></td>
      <td rowspan="2">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG8S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG111##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG112##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG15##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td rowspan="2">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG19##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG20##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG22##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG24##ROWNUM{{{}}}{{/intInput}}</td></tr>`,
    `<tr><td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG121S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG122S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG123S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG14##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG18##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG21##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG23##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG25##ROWNUM{{{}}}{{/intInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px; height: 18px;" rowspan="2"  class="no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button></td>
      <td colspan="10" rowspan="2"> Усього </td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G17{{{}}}{{/currencyInput}}</td>
      <td rowspan="2">{{#currencyInput}}DECLAR.DECLARBODY.R01G19{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G20{{{}}}{{/currencyInput}}</td>
      <td colspan="2" rowspan="2">&nbsp;</td></tr>`,
    `<tr><td>{{#currencyInput}}DECLAR.DECLARBODY.R01G18{{{}}}{{/currencyInput}}</td><td>{{#currencyInput}}DECLAR.DECLARBODY.R01G21{{{}}}{{/currencyInput}}</td></tr>`
  ]
}
