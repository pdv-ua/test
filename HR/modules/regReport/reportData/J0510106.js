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
const stringService = require('../../../../AC/modules/dataServices/stringService')
const reportService = require('../../../../HR/modules/reportService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const tabsData = []
  const data = structureReport()
  prepareStructureReport(data)
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR
  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })
  prepareQueryParams({ data, params })
  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  const infoByOrg = UB.Repository('ac_organization')
    .attrs(['orgBusinessTypeID.code', 'ECBCode'])
    .selectById(params.organizationID) || {}
  // DECLARBODY.H01 = infoByOrg['orgBusinessTypeID.code'] === 'БУ'
  DECLARBODY.HNREG = infoByOrg.ECBCode
  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)
  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']
  DECLARBODY.HZ = params.FORM_TYPE === 'HZ' || params.FORM_TYPE === 'HZD'
  DECLARBODY.HZN = params.FORM_TYPE === 'HZN'
  DECLARBODY.HZU = params.FORM_TYPE === 'HZU'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'
  DECLARBODY.HZKV = parseInt(params.PERIOD_MONTH) / 3
  DECLARBODY.HZY = params.PERIOD_YEAR
  const periods = periodService.getPeriodsByDate(params.organizationID, params.dateFrom, params.dateTo)
  const errorMessages = []

  periods.forEach((period, idx) => {
    const periodData = {
      DECLAR: {
        $: Object.assign({}, data.DECLAR.$),
        DECLARBODY: Object.assign({}, data.DECLAR.DECLARBODY),
        DECLARHEAD: Object.assign({}, data.DECLAR.DECLARHEAD),
        PARAMS: Object.assign({}, data.DECLAR.PARAMS)
      },
      cellSettings: data.cellSettings
    }
    periodData.DECLAR.DECLARHEAD.C_DOC_CNT = periodData.DECLAR.DECLARBODY.HNM = periodData.DECLAR.DECLARBODY.HNUM1 = idx + 1
    prepareDataSpecific({ data: periodData, params, period })
    tabsData.push({ data: periodData, errorMessages })
  })
  return tabsData
}

const allBodyAttrNames = ['HZD', 'HZU', 'HZN', 'HZ', 'HZY', 'HZKV', 'HNM', 'HNUM1',
  'HTIN', 'HTIN1', 'HNAME', 'HFIL', 'H01', 'H02', 'HDDGV', 'HNDGV',

  'T1RXXXXG5', 'T1RXXXXG6', 'T1RXXXXG7S', 'T1RXXXXG8', 'T1RXXXXG9', 'T1RXXXXG101', 'T1RXXXXG102', 'T1RXXXXG111S', 'T1RXXXXG112S', 'T1RXXXXG113S',
  'T1RXXXXG12', 'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'T1RXXXXG21', 'T1RXXXXG22',
  'T1RXXXXG23', 'T1RXXXXG24', 'R01G16', 'R01G17', 'R01G18', 'R01G19', 'R01G20', 'R01G21', 'T1RXXXXG25',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J0510106.xsd'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function prepareDataSpecific ({ data, params, period }) {
  const { DECLARBODY } = data.DECLAR

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']

  const periods = periodService.getArrayPeriods(params.organizationID, period.dateFrom)

  const reportParams = reportService.getReportParams(params.organizationID, [ 'ECBVAC', 'ECBT1RG13', 'ECBT1RG14', 'ECBT1RG16' ])
  const esvDatas = UB.Repository('hr_accrualFund')
    .attrs(['periodSalaryID.dateFrom', 'payFundID.typeTaxECBID.code', 'sourceSum', 'baseSum', 'addMinSum', 'rate', 'paySum',
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
    .exists(UB.Repository('hr_employeeAccrual')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('payElID.methodID.code', '=', '140')
      .where('dateFrom', '<=', period.dateTo)
      .where('dateTo', '>=', period.dateFrom),
    'empAccr')
    .logic('([ps] OR [bs] OR [ams] OR [empAccr])')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .orderBy('periodSalaryID.dateFrom')
    .selectAsObject({
      'payFundID.typeTaxECBID.code': 'typeTaxECBIDCode',
      'periodSalaryID.dateFrom': 'periodSalary',
      'employeeNumberID.employeeID.lastName': 'lastName',
      'employeeNumberID.employeeID.firstName': 'firstName',
      'employeeNumberID.employeeID.middleName': 'middleName',
      'employeeNumberID.employeeID.taxCode': 'taxCode',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',
      'employeeNumberID.employeeID.citizenshipID.code': 'citizenshipCode',
      'employeeNumberID.employeeID.sexType': 'sexType',
      'employeeNumberID.dateFrom': 'empDateFrom',
      'employeeNumberID.dateTo': 'empDateTo',
      'employeeNumberID.employeeID': 'employeeID'
    })
  const store = UB.DataStore('tim_timeSheet')
  const numbs = esvDatas.map(esvData => esvData.employeeNumberID)
  store.runSQL(`
    SELECT :dateFrom: "periodSalary", '1' "typeTaxECBIDCode", 0 "sourceSum" , 0 "baseSum", 0 "addMinSum", 0 "rate", 0 "paySum",
    e.lastName "lastName", e.firstName "firstName", e.middleName "middleName", e.taxCode "taxCode", e.empTaxCodeType "empTaxCodeType",
    c.code "citizenshipCode", e.sexType "sexType", n.dateFrom "empDateFrom", n.dateTo "empDateTo", null "payFundID",
    n.ID "employeeNumberID", :periodID: "periodSalaryID", n.employeeID "employeeID", 0 "payCode"
    FROM hr_employeeAccrual a
    JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID and n.mi_deleteDate >= '9999-12-31'
    JOIN hr_payEl pe ON pe.ID = a.payElID
    JOIN hr_method m ON m.ID = pe.methodID
    JOIN hr_employee e ON e.ID = n.employeeID
    LEFT JOIN cdn_country c ON c.ID = e.citizenshipID
    WHERE a.dateFrom <= :dateTo: AND a.dateTo >= :dateFrom: and n.orgID = :orgID: AND a.mi_deleteDate >= '9999-12-31'
    AND m.code = :code: AND a.isActive = 1 ${numbs.length ? `and n.ID ${entityBaseService.getNotInExpression('numbs')}` : ''}
  `, {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    code: '140',
    orgID: params.organizationID,
    periodID: period.ID,
    numbs
  })
  const employeeAccrual = store.getAsJsObject()

  esvDatas.push(...employeeAccrual)

  // load positions which intersects with period
  const empNumIDs = esvDatas.map(esvData => esvData.employeeNumberID)
  let employeeIDs = esvDatas.map(esvData => esvData['employeeID'])
  const numEmpData = esvDatas.map(esvData => {
    return { employeeNumberID: esvData.employeeNumberID,
      employeeID: esvData['employeeID'] }
  })
  const empPosDatas = UB.Repository('hr_employeePositionS')
    .where('[employeeNumberID]', 'in', empNumIDs)
    .where('[dateFrom]', '<', period.dateTo)
    .where('[dateTo]', '>=', period.dateFrom)
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
    if (esvData['periodSalary']) {
      esvData['periodSalary'] = dateService.shiftDate(esvData['periodSalary'])
    }
    esvData.empDateTo = dateService.shiftDate(esvData.empDateTo)
    if (esvData.addMinSum) {
      const copy = Object.assign({}, esvData)
      copy.sourceSum = 0
      copy.baseSum = 0
      copy.factSum = accrualService.round((copy.addMinSum * copy.rate) / 100, 6)
      if (empPosDatasByEmp[copy.employeeNumberID]) {
        copy.dateNew = dateService.shiftDate(empPosDatasByEmp[copy.employeeNumberID].dateNew)
        copy.workPlace = empPosDatasByEmp[copy.employeeNumberID].workPlace
        copy.mtCount = empPosDatasByEmp[copy.employeeNumberID].mtCount
      }
      esvDatasFull.push(copy)
    }
    esvData.baseSum = accrualService.round((esvData.baseSum || 0) - (esvData.addMinSum || 0), 6)
    esvData.factSum = accrualService.round((esvData.paySum || 0) - ((esvData.addMinSum || 0) * esvData.rate) / 100, 6)
    esvData.addMinSum = 0
    if (empPosDatasByEmp[esvData.employeeNumberID]) {
      esvData.dateNew = dateService.shiftDate(empPosDatasByEmp[esvData.employeeNumberID].dateNew)
      esvData.workPlace = empPosDatasByEmp[esvData.employeeNumberID].workPlace
      esvData.mtCount = empPosDatasByEmp[esvData.employeeNumberID].mtCount
    }
    if (esvData.periodSalary < period.dateFrom && esvData.empDateTo >= period.dateFrom &&
      !['29', '36', '37', '39', '42', '43', '44', '45', '50'].includes(esvData['typeTaxECBIDCode']) &&
      reportParams.ECBVACIDs.indexOf(esvData.payFundID) < 0) {
      esvData['periodSalary'] = dateService.shiftDate(period.dateFrom)
      esvData.periodSalaryID = period.ID
    } else if (esvData.empDateTo < period.dateFrom &&
      esvData['periodSalary'] > esvData.empDateTo) {
      const onPeriod = periods.find(o => o.dateTo >= esvData.empDateTo && o.dateFrom <= esvData.empDateTo)
      if (onPeriod) {
        esvData['periodSalary'] = dateService.shiftDate(onPeriod.dateFrom)
        esvData.periodSalaryID = onPeriod.ID
      }
    }
    esvDatasFull.push(esvData)
  })
  esvDatasFull.forEach(row => {
    if (row.empDateTo < row['periodSalary']) {
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
    if ((row['periodSalary'] < period.dateFrom) &&
      (dateService.shiftDate(row.empDateTo) <= period.dateTo) &&
      (reportParams.ECBVACIDs.indexOf(row['payFundID']) >= 0) &&
      (row.sourceSum < 0) &&
      row.addMinSum) {
      row.payCode = 14
      return
    }
    if ((row['periodSalary'] <= period.dateFrom) && row.addMinSum) {
      row.payCode = 13
    }
    if (!row.payCode) {
      row.payCode = 0
    }
  })

  const esvDatasAggs = Object.values(
    esvDatasFull.reduce((aggObj, row) => {
      const aggKey = row.employeeNumberID + '_' + row['typeTaxECBIDCode'] + '_' + row.payCode + '_' + row.periodSalaryID
      const aggRow = aggObj[aggKey]
      if (!aggRow) {
        aggObj[aggKey] = Object.assign({}, row)
      } else {
        aggRow.sourceSum = accrualService.round(aggRow.sourceSum + (row.sourceSum || 0), 6)
        aggRow.baseSum = accrualService.round(aggRow.baseSum + (row.baseSum || 0), 6)
        aggRow.factSum = accrualService.round(aggRow.factSum + (row.factSum || 0), 6)
        aggRow.addMinSum = accrualService.round(aggRow.addMinSum + (row.addMinSum || 0), 6)
      }
      return aggObj
    }, {})
  )
  // taxCode = 1506110186
  // 1 block

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
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.periodSalary.getTime() &&
      ['29', '36'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysSick = ts.daysCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.periodSalary.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysSick = ts.daysCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.periodSalary.getTime() &&
      !['42, 43'].includes(esvDatasAgg['typeTaxECBIDCode']) && esvDatasAgg.payCode !== 13)
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
    AND A01.dateWork >= :dateFrom: AND A01.dateWork <= :dateTo:
    AND A01.isActive=1 AND A01.factTimeCostID${entityBaseService.getInExpression('ECBT1RG14IDs')} 
    AND A01.mi_deleteDate >= '9999-12-31'
    GROUP BY A01.employeeNumberID, ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)::TIMESTAMP`}  
`, {
      empNumIDs,
      ECBT1RG14IDs: reportParams.ECBT1RG14IDs,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo
    })
  }
  let timeSheets = reportParams.ECBT1RG14IDs.length ? store.getAsJsObject() : []

  timeSheets.forEach(ts => {
    ts.dateWork = dateService.shiftDate(ts.dateWork)
    let esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0)
    if (esvDatasAgg) {
      esvDatasAgg.daysWOPay = ts.orderCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime() &&
      !['42, 43'].includes(esvDatasAgg['typeTaxECBIDCode']))
    if (esvDatasAgg) {
      esvDatasAgg.daysWOPay = ts.orderCount
      return
    }
    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime())
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
    AND A01.dateWork >= :dateFrom: AND A01.dateWork <= :dateTo: AND A01.mi_deleteDate >= '9999-12-31'
    AND fc.timeCostType <> 'NOT'
    GROUP BY A01.employeeNumberID, ${App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `CONVERT(DATETIME, CONVERT(VARCHAR(7), A01.dateWork, 120) + '-01')`
    : `date_trunc('month', A01.dateWork)::TIMESTAMP`} 
  `, {
      empNumIDs,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo
    })
  }

  timeSheets = empIDs.length ? store.getAsJsObject() : []

  timeSheets.forEach(ts => {
    ts.dateWork = dateService.shiftDate(ts.dateWork)
    let esvDatasAggAll = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0)

    let esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => (esvDatasAgg.payCode === 0 || !esvDatasAgg.payCode) &&
      (esvDatasAgg.sourceSum || esvDatasAgg.baseSum || esvDatasAgg.addMinSum || esvDatasAgg.factSum))
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }
    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode > 0 && esvDatasAgg.payCode !== 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime() &&
      ['29', '42', '43'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggAll.find(esvDatasAgg => esvDatasAgg.payCode === 13)
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
      return
    }

    esvDatasAgg = esvDatasAggs.find(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === ts.dateWork.getTime())
    if (esvDatasAgg) {
      esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.orderCount
        : (esvDatasAgg.workPlace === '2' &&
        !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
          ? ts.orderCount : null)
    }
  })

  // 4 block
  empIDs = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.workPlace === '4').map(esvDatasAgg => esvDatasAgg.employeeNumberID)

  const empCphDatas = UB.Repository('hr_employeeCPH')
    .where('[employeeNumberID]', 'in', empIDs)
    .where('[dateFrom]', '<', period.dateTo)
    .where('[dateTo]', '>=', period.dateFrom, 'dateTo')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('(([dateTo]) or ([dateToIsNull]))')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .selectAsObject()

  empCphDatas.forEach(ts => {
    ts.dateFrom = dateService.shiftDate(ts.dateFrom)
    ts.dateTo = dateService.shiftDate(ts.dateTo)
    if (ts.dateFrom < period.dateFrom) {
      ts.dateFrom = period.dateFrom
    }
    if (ts.dateTo > period.dateTo) {
      ts.dateTo = period.dateTo
    }
    ts.days = dateService.dayDiff(ts.dateFrom, ts.dateTo) + 1

    let esvDatasAggAll = esvDatasAggs.filter(esvDatasAgg => esvDatasAgg.employeeNumberID === ts.employeeNumberID &&
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === period.dateFrom.getTime() &&
      ['1', '2', '25', '26', '32'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0)

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
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === period.dateFrom.getTime() &&
      ['29', '42', '43'].indexOf(esvDatasAgg['typeTaxECBIDCode']) >= 0)
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
      esvDatasAgg['periodSalary'] && esvDatasAgg['periodSalary'].getTime() === period.dateFrom.getTime())
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
     AND a.periodCalcID = :periodID: AND a.payElID${entityBaseService.getInExpression('ECBT1RG16IDs')}
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
      esvDatasAgg.periodSalary && esvDatasAgg.periodSalary.getTime() === ts.periodSalary.getTime() &&
      (esvDatasAgg.typeTaxECBIDCode === '42' || esvDatasAgg.typeTaxECBIDCode === '43' ||
        esvDatasAgg.typeTaxECBIDCode === '44' || esvDatasAgg.typeTaxECBIDCode === '45' ||
        esvDatasAgg.typeTaxECBIDCode === '50') &&
    !esvDatasAggs.find(o => o.employeeNumberID === esvDatasAgg.employeeNumberID && o.periodSalaryID === esvDatasAgg.periodSalaryID &&
      o.daysWork && o.daysPregn))
    const existEmpLength = existEsvDatasAgg.length
    let esvDatasAgg = existEmpLength ? existEsvDatasAgg[0] : null
    if (esvDatasAgg) {
      esvDatasAgg.daysPregn = ts.daysCount
      if ((existEmpLength > 1 && esvDatasAgg.daysWork) || existEmpLength === 1) {
        if (ind === 0) {
          let enDateFrom = dateService.shiftDate(esvDatasAgg['empDateFrom'])
          let psDateFrom = dateService.shiftDate(esvDatasAgg['periodSalary'])

          if (enDateFrom <= psDateFrom) {
            esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? dateService.daysInMonth(psDateFrom.getFullYear(), psDateFrom.getMonth() + 1)
              : (esvDatasAgg.workPlace === '2' &&
              !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
                ? dateService.daysInMonth(psDateFrom.getFullYear(), psDateFrom.getMonth() + 1) : null)
          } else {
            let dLast = dateService.lastDayOfMonth(psDateFrom)
            esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? dateService.dateDiff(enDateFrom, dLast)
              : (esvDatasAgg.workPlace === '2' &&
              !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
                ? dateService.dateDiff(enDateFrom, dLast) : null)
          }
        } else {
          esvDatasAgg.daysWork = (esvDatasAgg.workPlace === '1' || esvDatasAgg.workPlace === '3') ? ts.daysCount
            : (esvDatasAgg.workPlace === '2' &&
            !esvDatasAggs.find(o => o['employeeID'] === esvDatasAgg['employeeID'] && o.workPlace === '1')
              ? ts.daysCount : null)
        }
      }
    }
  })
  employeeIDs = employeeIDs.filter((el, index, arr) => arr.indexOf(el) === index)
  const empExps = UB.Repository('hr_employeeExperience')
    .where('[dictExperienceID.experienceSpecID]', 'isNotNull')
    .where(`COALESCE([startCalcDate], '9999-12-31T00:00:00')`, '>=', period.dateFrom)
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
          period.dateTo, period.dateFrom, false)
        if (expObj && expObj.totalDays > 0) {
          expSpecEmpNums.push({ employeeNumberID: num, employeeID: item['dictExperienceID.includeSecondJobs'] ? null : item.employeeID })
        }
      })
    }
  })

  expSpecEmpNums.forEach(empNum => {
    let esvDatasAgg = esvDatasAggs.filter(esvDatasAgg => (esvDatasAgg.employeeNumberID === empNum.employeeNumberID || esvDatasAgg.employeeID === empNum.employeeID)
      /* && (esvDatasAgg['periodSalary'] >= period.dateFrom || esvDatasAgg['typeTaxECBIDCode'] === '25') */)
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
    if (row.sourceSum || row.baseSum || row.addMinSum || row.factSum || employeeAccrual.find(o => o.employeeNumberID === row.employeeNumberID)) {
      const existRows = esvDatasAggs.filter((o, idx) => idx !== i && o.employeeID === row.employeeID && row.typeTaxECBIDCode === o.typeTaxECBIDCode &&
        row.payCode === o.payCode && row.periodSalaryID === o.periodSalaryID &&
        ((row.workPlace === '1') ? '1' : '0') === ((o.workPlace === '1') ? '1' : '0') && (row.specExp ? '1' : '0') === (o.specExp ? '1' : '0') &&
        (((row.mtCount < 1) || timeSheetChangesByEmp[row.employeeNumberID]) ? '1' : '0') === (((o.mtCount < 1) || timeSheetChangesByEmp[o.employeeNumberID]) ? '1' : '0') &&
        ((row.dateNew && (row.dateNew < dateService.shiftDate(params.dateTo)) && (row.dateNew >= dateService.addYears(period.dateFrom, -2))) ? '1' : '0') ===
        ((o.dateNew && (o.dateNew < dateService.shiftDate(params.dateTo)) && (o.dateNew >= dateService.addYears(period.dateFrom, -2))) ? '1' : '0')
      )
      if (existRows.length) {
        let existRow = null
        if (row.daysPregn) {
          existRow = existRows.find(o => !!o.daysPregn)
          if (existRow) {
            existRow.daysPregn = Math.max(row.daysPregn, existRow.daysPregn)
          }
        } else if (row.daysWOPay) {
          existRow = existRows.find(o => !!o.daysWOPay)
          if (existRow) {
            if (row.employeeNumberID !== existRow.employeeNumberID) {
              store.runSQL(` SELECT COUNT(*) AS "orderCount" FROM
                            (SELECT ts.dateWork
                            FROM tim_timeSheet ts 
                            JOIN hr_dictTimeCost fc ON fc.ID = ts.factTimeCostID 
                            WHERE ts.employeeNumberID${entityBaseService.getInExpression('empNumIDs')}
                            AND ts.dateWork >= :dateFrom: AND ts.dateWork <= :dateTo: AND ts.isActive=1 AND ts.mi_deleteDate >= '9999-12-31'
                            AND fc.timeCostType <> 'NOT'
                            GROUP BY ts.dateWork ) t
                            `, {
                empNumIDs: [existRow.employeeNumberID, row.employeeNumberID],
                dateFrom: period.dateFrom,
                dateTo: period.dateTo
              })

              let timeSheets = store.getAsJsObject()
              existRow.daysWOPay = (timeSheets && timeSheets.length) ? (timeSheets[0].orderCount || 0) : existRow.daysWOPay
            }
          }
        } else if (row.daysSick) {
          existRow = existRows.find(o => !!o.daysSick)
          if (existRow) {
            if (reportParams.ECBT1RG13IDs.length && row.employeeNumberID !== existRow.employeeNumberID) {
              store.runSQL(` select t.mask, t.flagsRec AS "flagsRec" FROM (
              SELECT a.mask, a.flagsRec, (CASE WHEN a.flagsRec & 512 = 0 THEN 2 ELSE 1 END) AS ord FROM hr_accrual a
              where a.periodCalcID = :periodID: AND a.periodSalaryID = :periodSalaryID: 
              AND a.employeeNumberID in (${row.employeeNumberID},${existRow.employeeNumberID})
              AND a.payElID${entityBaseService.getInExpression('ECBT1RG13IDs')}
              AND a.flagsRec & 4096 = 0 AND a.flagsRec & 8192 = 0) t ORDER BY ord
          `, {
                ECBT1RG13IDs: reportParams.ECBT1RG13IDs,
                periodCalcID: period.ID,
                periodSalaryID: row.periodSalaryID
              })
              const accrs = store.getAsJsObject()
              let setValue = true
              let mask = 0
              accrs.forEach(row => {
                if (row.mask) {
                  mask = (row.flagsRec & 1 << 9) ? (mask & ~row.mask) : (mask | row.mask)
                } else {
                  setValue = false
                }
              })
              if (setValue) {
                existRow.daysSick = ((mask || 0).toString(2).match(/1/g) || []).length
              }
            }
          }
        } else if (row.daysWOPay) {
          existRow = existRows.find(o => !!o.daysWOPay)
          if (existRow) {
            if (reportParams.ECBT1RG14IDs.length && row.employeeNumberID !== existRow.employeeNumberID) {
              store.runSQL(`SELECT COUNT(*) AS "orderCount"
                            FROM tim_timeSheet ts WHERE ts.employeeNumberID = :employeeNumberID:
                            AND ts.dateWork >= :dateFrom: AND ts.dateWork <= :dateTo: AND ts.isActive=1 AND ts.mi_deleteDate >= '9999-12-31'
                            AND ts.factTimeCostID${entityBaseService.getInExpression('ECBT1RG14IDs')}
                            AND EXISTS(SELECT 1 FROM tim_timeSheet ts2 WHERE ts2.employeeNumberID = :employeeNumberID2:
                            AND ts2.dateWork = ts.dateWork AND ts2.isActive=1 AND ts2.mi_deleteDate >= '9999-12-31'
                            AND ts2.factTimeCostID${entityBaseService.getInExpression('ECBT1RG14IDs')})`, {
                employeeNumberID: existRow.employeeNumberID,
                employeeNumberID2: row.employeeNumberID,
                ECBT1RG14IDs: reportParams.ECBT1RG14IDs,
                dateFrom: period.dateFrom,
                dateTo: period.dateTo
              })
            }
            let timeSheets = store.getAsJsObject()
            existRow.daysWOPay = (timeSheets && timeSheets.length) ? (timeSheets[0].orderCount || 0) : 0
          }
        } else {
          existRow = existRows[0]
        }
        if (existRow) {
          existRow.sourceSum = accrualService.round(existRow.sourceSum + row.sourceSum, 6)
          existRow.baseSum = accrualService.round(existRow.baseSum + row.baseSum, 6)
          existRow.addMinSum = accrualService.round(existRow.addMinSum + row.addMinSum, 6)
          existRow.factSum = accrualService.round(existRow.factSum + row.factSum, 6)
          esvDatasAggs.splice(i, 1)
        }
      }
    } else {
      esvDatasAggs.splice(i, 1)
    }
  }
  esvDatasAggs.sort((a, b) =>
    stringService.compareStringUa(a.lastName, b.lastName) === 1 ? 1
      : a.lastName === b.lastName ? stringService.compareStringUa(a.firstName, b.firstName) === 1 ? 1
        : a.firstName === b.firstName ? stringService.compareStringUa(a.middleName, b.middleName) === 1 ? 1
          : a.middleName === b.middleName ? a.periodSalary > b.periodSalary ? 1
            : a.periodSalary.getTime() === b.periodSalary.getTime() ? a.typeTaxECBIDCode > b.typeTaxECBIDCode ? 1
              : a.typeTaxECBIDCode === b.typeTaxECBIDCode ? a.payCode > b.payCode ? 1
                : -1 : -1 : -1 : -1 : -1 : -1
  )
    .forEach((row, idx) => {
      const rownum = idx + 1
      if (rownum > 9999) {
        return
      }
      if (row.factSum < 0 && row.typeTaxECBIDCode === '1' && row.payCode === 13) {
        row.payCode = 3
      }
      updateCellInArray(data, 'T1RXXXXG5', rownum, (row.citizenshipCode === 'UKR') ? '1' : '0')
      updateCellInArray(data, 'T1RXXXXG6', rownum, (row.sexType === 'M') ? 'Ч' : (row.sexType === 'W') ? 'Ж' : null)
      updateCellInArray(data, 'T1RXXXXG7S', rownum, `${row.empTaxCodeType === 'PASSPORT' ? 'БК' : (row.empTaxCodeType === 'IDCARD' ? 'П' : '')}${row.taxCode}`)
      updateCellInArray(data, 'T1RXXXXG8', rownum, row.typeTaxECBIDCode)
      updateCellInArray(data, 'T1RXXXXG9', rownum, row.payCode)
      updateCellInArray(data, 'T1RXXXXG101', rownum, row.periodSalary.getMonth() + 1)
      updateCellInArray(data, 'T1RXXXXG102', rownum, row.periodSalary.getFullYear())
      updateCellInArray(data, 'T1RXXXXG111S', rownum, (row.lastName || '').replace('’', `'`))
      updateCellInArray(data, 'T1RXXXXG112S', rownum, (row.firstName || '').replace('’', `'`))
      updateCellInArray(data, 'T1RXXXXG113S', rownum, (row.middleName || '').replace('’', `'`))
      updateCellInArray(data, 'T1RXXXXG12', rownum, row.daysSick) // Тимчасова непрацездатність
      updateCellInArray(data, 'T1RXXXXG13', rownum, row.daysWOPay) // Непрацездатність Без збереження зп
      updateCellInArray(data, 'T1RXXXXG14', rownum, row.daysWork)
      updateCellInArray(data, 'T1RXXXXG15', rownum, row.daysPregn) // Пологи

      updateCellInArray(data, 'T1RXXXXG16', rownum, row.sourceSum)
      updateCellInArray(data, 'T1RXXXXG17', rownum, row.baseSum)
      updateCellInArray(data, 'T1RXXXXG18', rownum, row.addMinSum)
      updateCellInArray(data, 'T1RXXXXG19', rownum, null)
      updateCellInArray(data, 'T1RXXXXG20', rownum, accrualService.round(row.factSum))
      updateCellInArray(data, 'T1RXXXXG21', rownum, (row.workPlace === '1') ? '1' : '0')
      updateCellInArray(data, 'T1RXXXXG22', rownum, ((row.mtCount < 1) || timeSheetChangesByEmp[row.employeeNumberID]) ? '1' : '0')
      updateCellInArray(data, 'T1RXXXXG23', rownum, row.specExp ? '1' : '0')
      updateCellInArray(data, 'T1RXXXXG24', rownum, (row.dateNew && (row.dateNew < dateService.shiftDate(params.dateTo)) && (row.dateNew >= dateService.addYears(period.dateFrom, -2))) ? '1' : '0')
      updateCellInArray(data, 'T1RXXXXG25', rownum, DECLARBODY.HZU ? 0 : null)
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
    names: ['HDDGV', 'HNDGV', 'HTIN1', 'T1RXXXXG7S', 'T1RXXXXG111S', 'T1RXXXXG112S', 'T1RXXXXG113S', 'HKBUH', 'HBUH', 'HFIL'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZ', 'HZN', 'HZU', 'HZD', 'HZY', 'HZKV', 'HNUM1', 'HNM'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG5', 'T1RXXXXG6', 'T1RXXXXG8', 'T1RXXXXG9', 'T1RXXXXG101', 'T1RXXXXG102', 'T1RXXXXG12', 'T1RXXXXG13',
      'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG21', 'T1RXXXXG22', 'T1RXXXXG23', 'T1RXXXXG24', 'T1RXXXXG25', 'H01', 'H02'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG16', 'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'R01G16', 'R01G17', 'R01G18', 'R01G19', 'R01G20', 'R01G21'],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

function xmlExport ({ data, idx }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  const attrListExt = buildAttrsExt(allBodyAttrNames, cellFormats)
  if (data.data.DECLAR.DECLARBODY.T1RXXXXG6 instanceof Array) {
    data.data.DECLAR.DECLARBODY.T1RXXXXG6.forEach(item => {
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
  if (data.data.DECLAR.DECLARBODY.T1RXXXXG9 instanceof Array) {
    data.data.DECLAR.DECLARBODY.T1RXXXXG9.forEach((item, idx) => {
      if (item._ === 3) {
        if (data.data.DECLAR.DECLARBODY.T1RXXXXG18 instanceof Array && data.data.DECLAR.DECLARBODY.T1RXXXXG18[idx] &&
          data.data.DECLAR.DECLARBODY.T1RXXXXG18[idx]._ < 0) {
          data.data.DECLAR.DECLARBODY.T1RXXXXG18[idx]._ = -1 * data.data.DECLAR.DECLARBODY.T1RXXXXG18[idx]._
        }
        if (data.data.DECLAR.DECLARBODY.T1RXXXXG20 instanceof Array && data.data.DECLAR.DECLARBODY.T1RXXXXG20[idx] &&
          data.data.DECLAR.DECLARBODY.T1RXXXXG20[idx]._ < 0) {
          data.data.DECLAR.DECLARBODY.T1RXXXXG20[idx]._ = -1 * data.data.DECLAR.DECLARBODY.T1RXXXXG20[idx]._
        }
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
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td rowspan="2"><span class="row_num">ROWNUM</span></td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td rowspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG7S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG8##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG101##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG102##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG12##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG14##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/currencySpanInput}}</td>
      <td rowspan="2">{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG18##ROWNUM{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG19##ROWNUM{{{}}}{{/currencySpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG21##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG22##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG25##ROWNUM{{{}}}{{/intSpanInput}}</td></tr>`,
    `<tr><td colspan="1">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG111S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td colspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG112S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td colspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG113S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG15##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG20##ROWNUM{{{}}}{{/currencySpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG23##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG24##ROWNUM{{{}}}{{/intSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1">+</button></td>
      <td colspan="10" rowspan="2"> Усього </td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G16{{{}}}{{/currencyInput}}</td>
      <td rowspan="2">{{#currencyInput}}DECLAR.DECLARBODY.R01G18{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G19{{{}}}{{/currencyInput}}</td>
      <td colspan="2" rowspan="2">&nbsp;</td>
      <td rowspan="2">&nbsp;</td></tr>
      </tr>`,
    `<tr><td>{{#currencyInput}}DECLAR.DECLARBODY.R01G17{{{}}}{{/currencyInput}}</td>
     <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G20{{{}}}{{/currencyInput}}</td></tr>`
  ]
}
