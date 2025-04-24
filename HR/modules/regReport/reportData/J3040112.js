const UB = require('@unitybase/ub')
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')
const reportService = require('../../../../HR/modules/reportService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = structureReport()
  prepareStructureReport(data)
  const { DECLARBODY, DECLARHEAD } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })

  prepareQueryParams({ data, params })

  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HZM', 'HZY', 'HTIN', 'HTIN1', 'HNAME', 'HKVED', 'H01', 'H02', 'H03', 'HSPODU', 'HLOC', 'HTEL', 'HKOPFG', 'HNREG', 'HBANKNAME', 'HMFO',
  'HBANKACC', 'H014G1', 'HNACTL', 'HNACTL1', 'HNACTL2', 'HNACTL3', 'HNACTL4', 'HNACTL5', 'HNACTL6', 'HNACTL7',

  'R01G3', 'R011G3', 'R012G3', 'R013G3', 'R014G3', 'R015G3', 'R02G3', 'R021G3', 'R022G3', 'R023G3', 'R024G3', 'R025G3', 'R03G3',
  'R031G3', 'R032G3', 'R0321G3', 'R033G3', 'R0331G3', 'R034G3', 'R0341G3', 'R035G3', 'R04G3', 'R041G3', 'R04101G3', 'R04102G3', 'R04103G3',
  'R04104G3', 'R04105G3', 'R04106G3', 'R04107G3', 'R04108G3', 'R04109G3', 'R04110G3', 'R04111G3', 'R04112G3', 'R04113G3', 'R042G3', 'R043G3',
  'R04301G3', 'R04302G3', 'R04303G3', 'R04304G3', 'R04305G3', 'R044G3', 'R044G2S', 'R05G3', 'R051G3', 'R05101G3', 'R05102G3', 'R05103G3', 'R05104G3',
  'R05105G3', 'R05106G3', 'R05107G3', 'R05108G3', 'R05109G3', 'R05110G3', 'R05111G3', 'R05112G3', 'R05113G3', 'R052G3', 'R053G3', 'R05301G3',
  'R05302G3', 'R05303G3', 'R05304G3', 'R05305G3', 'R054G3', 'R054G2S', 'R06G3', 'R0601G3', 'R0602G3', 'R0603G3', 'R0604G3', 'R0605G3', 'R0606G3',
  'R0607G3', 'R0608G3', 'R0609G3', 'R0610G3', 'R0611G3', 'R0612G3', 'R0613G3', 'R0614G3',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3040112.xsd'
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

  // add non std data for org
  const infoByOrg = UB.Repository('ac_organization')
    .attrs(['orgBusinessTypeID.code', 'ECBCode'])
    .selectById(params.organizationID) || {}
  const infoByAcc = UB.Repository('hr_payObligatory')
    .attrs(['orgAccountID.bankID.MFO', 'orgAccountID.bankID.name', 'orgAccountID.code'])
    .where(['organizationID'], '=', params.organizationID)
    .where(['type'], '=', '3')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.H01 = infoByOrg['orgBusinessTypeID.code'] === 'БУ'
  DECLARBODY.HNREG = infoByOrg.ECBCode
  DECLARBODY.HBANKNAME = infoByAcc['orgAccountID.bankID.name']
  DECLARBODY.HMFO = infoByAcc['orgAccountID.bankID.MFO']
  DECLARBODY.HBANKACC = infoByAcc['orgAccountID.code']

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']

  const reportParams = reportService.getReportParams(params.organizationID, ['ECBAVG', 'ECBVAC', 'ECBR012G3', 'ECBR011G3', 'ECBR013G3', 'ECBR014G3', 'ECBR015G3'])
  reportParams.ECBR011G3IDs.push(...reportParams.ECBVACIDs)
  let periodDateFrom = dateService.shiftDate(params.dateFrom)
  let periodDateTo = dateService.shiftDate(params.dateTo)
  const period = periodService.getPeriodOnDate(params.organizationID, periodDateFrom)

  // load positions which intersects with period
  const empPosDatas = UB.Repository('hr_employeePositionS')
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '<=', periodDateTo)
    .where('[dateTo]', '>=', periodDateFrom)
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .orderBy('dateFrom')
    .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType', 'dictCategoryECBID.dictTypeTaxECBID.code'])
    .selectAsObject()

  // find last position for employee, fill flags
  const empPosDatasByEmp = {}
  empPosDatas.forEach(posData => {
    empPosDatasByEmp[posData.employeeNumberID] = posData
    posData.isMainWork = posData.workPlace === '1'
    posData.isInnerCoWork = posData.workPlace === '2'
    posData.isExtCoWork = posData.workPlace === '3'
    posData.isStaffEmp = posData.isMainWork || posData.isInnerCoWork || posData.isExtCoWork
    posData.isOutStaffEmp = posData.workPlace === '4'
    posData.isMan = posData['employeeNumberID.employeeID.sexType'] === 'M'
    posData.isWoman = posData['employeeNumberID.employeeID.sexType'] === 'W'
  })

  // find all empoyees to count
  const calcEmps = Object.values(empPosDatasByEmp).filter(posData => posData.isStaffEmp || posData.isOutStaffEmp)
  const calcEmpsIDs = calcEmps.map(posData => posData.employeeNumberID)
  const timeSheets = UB.Repository('tim_timeSheet')
    .attrs(['employeeNumberID', 'COUNT(1)'])
    .where('[employeeNumberID]', 'in', calcEmpsIDs)
    .where('[dateWork]', '>=', periodDateFrom)
    .where('[dateWork]', '<=', periodDateTo)
    .where('[isActive]', '=', true)
    .whereIf(reportParams.ECBAVGIDs.length, '[factTimeCostID]', 'notIn', reportParams.ECBAVGIDs)
    // .where('[factTimeCostID]', 'notIn', timeCostExc)
    .groupBy('employeeNumberID')
    .selectAsObject({
      'COUNT(1)': 'cnt'
    })

  if (calcEmpsIDs.length) {
    const store = UB.DataStore('tim_timeSheet')
    store.runSQL(`SELECT A01.employeeNumberID "employeeNumberID" ,(COUNT(1)) AS "cnt" 
     FROM tim_timeSheet A01 
     LEFT JOIN hr_employeeNumber n ON n.ID = A01.employeeNumberID
     WHERE A01.employeeNumberID${entityBaseService.getInExpression('calcEmpsIDs')} 
     AND A01.dateWork>=:periodDateFrom: AND A01.dateWork<=:periodDateTo: AND A01.isActive=1
     ${reportParams.ECBAVGIDs.length ? `AND A01.factTimeCostID${entityBaseService.getNotInExpression('ECBAVGIDs')}` : ''} 
     AND A01.mi_deleteDate>='9999-12-31'
     AND EXISTS (SELECT 1 FROM hr_empAddGuarantees A02 WHERE A02.employeeID=n.employeeID 
     AND A02.dateFrom<=A01.dateWork AND A02.dateTo>=A01.dateWork AND A02.addGuarant <> '0' AND A02.mi_deleteDate>='9999-12-31') 
     GROUP BY A01.employeeNumberID      
  `, {
      calcEmpsIDs,
      periodDateFrom,
      periodDateTo,
      ECBAVGIDs: reportParams.ECBAVGIDs
    })
    const timeSheetsGuarant = store.getAsJsObject()
    timeSheetsGuarant.forEach(ts => {
      empPosDatasByEmp[ts.employeeNumberID].tsCountGuarant = ts.cnt
    })
  }

  timeSheets.forEach(ts => {
    empPosDatasByEmp[ts.employeeNumberID].tsCount = ts.cnt
  })

  const daysInPeriod = dateService.dayDiff(params.dateFrom, params.dateTo)
  DECLARBODY.HNACTL = Math.round(calcEmps.filter(posData => posData.isMainWork)
    .reduce((a, v) => a + (v.tsCount || 0), 0) / daysInPeriod)
  DECLARBODY.HNACTL1 = Math.round(calcEmps.filter(posData => (posData.isMainWork) && (posData['dictCategoryECBID.dictTypeTaxECBID.code'] === '2' || posData['dictCategoryECBID.dictTypeTaxECBID.code'] === '32'))
    .reduce((a, v) => a + (v.tsCount || 0), 0) / daysInPeriod)
  DECLARBODY.HNACTL2 = calcEmps.filter(posData => ((posData.isMainWork) && posData.tsCountGuarant))
    .reduce((a, v) => a + (v.tsCountGuarant || 0), 0) / daysInPeriod

  DECLARBODY.HNACTL3 = new Set(calcEmps.filter(posData => posData.isMainWork).map(posData => posData.employeeID)).size
  DECLARBODY.H014G1 = '0'

  const esvDatas = UB.Repository('hr_accrualFund')
    .where('[orgID]', '=', params.organizationID)
    .where('[periodCalcID]', '=', period.ID)
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .attrs(['payFundID', 'payFundID.code', 'sourceSum', 'baseSum', 'addMinSum', 'paySum', 'rate', 'employeeNumberID', 'employeeNumberID.employeeID'])
    .selectAsObject()

  const empWith03 = new Set(esvDatas.filter(esvData => reportParams.ECBR012G3IDs.indexOf(esvData['payFundID']) >= 0).map(esvData => esvData['employeeNumberID.employeeID']))
  DECLARBODY.HNACTL4 = new Set(calcEmps.filter(posData => posData.isOutStaffEmp && empWith03.has(posData.employeeID)).map(posData => posData['employeeID'])).size

  const empWithSpecialCodes = new Set(esvDatas.filter(esvData => reportParams.ECBR011G3IDs.indexOf(esvData['payFundID']) >= 0).map(esvData => esvData['employeeNumberID.employeeID']))
  DECLARBODY.HNACTL5 = new Set(calcEmps.filter(posData => empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size
  DECLARBODY.HNACTL6 = new Set(calcEmps.filter(posData => posData.isMan && empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size
  DECLARBODY.HNACTL7 = new Set(calcEmps.filter(posData => posData.isWoman && empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size

  esvDatas.forEach(row => {
    if (reportParams.ECBR011G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY.R011G3 += row.sourceSum
    if (reportParams.ECBR012G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY.R012G3 += row.sourceSum
    if (reportParams.ECBR013G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY.R013G3 += row.sourceSum
    if (reportParams.ECBR014G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY.R014G3 += row.sourceSum
    if (reportParams.ECBR015G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY.R015G3 += row.sourceSum

    switch (row.rate) {
      case 22:
        DECLARBODY.R021G3 = accrualService.round(DECLARBODY.R021G3 + row.baseSum - row.addMinSum, 6)
        DECLARBODY.R031G3 = accrualService.round(DECLARBODY.R031G3 + row.paySum - (row.addMinSum || 0) * row.rate / 100, 6)
        DECLARBODY.R035G3 = accrualService.round(DECLARBODY.R035G3 + (row.addMinSum || 0) * row.rate / 100, 6)
        break
      case 8.41:
        DECLARBODY.R022G3 = accrualService.round(DECLARBODY.R022G3 + row.baseSum - (row.addMinSum || 0), 6)
        DECLARBODY.R032G3 = accrualService.round(DECLARBODY.R032G3 + row.paySum, 6)
        break
      case 5.3:
        DECLARBODY.R023G3 = accrualService.round(DECLARBODY.R023G3 + row.baseSum - (row.addMinSum || 0), 6)
        DECLARBODY.R033G3 = accrualService.round(DECLARBODY.R033G3 + row.paySum, 6)
        break
      case 5.5:
        DECLARBODY.R024G3 = accrualService.round(DECLARBODY.R024G3 + row.baseSum - (row.addMinSum || 0), 6)
        DECLARBODY.R034G3 = accrualService.round(DECLARBODY.R034G3 + row.paySum, 6)
        break
    }

    DECLARBODY.R025G3 = accrualService.round(DECLARBODY.R025G3 + row.addMinSum, 6)

    DECLARBODY.R042G3 = DECLARBODY.R04301G3 = DECLARBODY.R04302G3 = DECLARBODY.R04303G3 = DECLARBODY.R04304G3 = DECLARBODY.R04305G3 = DECLARBODY.R052G3 = DECLARBODY.R053G3 = 0
  })
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HKVED', 'HLOC', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'HSPODU', 'HTEL', 'HKOPFG', 'HNREG', 'HBANKNAME', 'HBANKACC', 'R044G2S', 'R054G2S', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'H01', 'H02', 'H03'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['HMFO', 'H014G1', 'HNACTL', 'HNACTL1', 'HNACTL2', 'HNACTL3', 'HNACTL4', 'HNACTL5', 'HNACTL6', 'HNACTL7'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    namesFn: attrName => /^R\d*X*G\d*/.test(attrName) && ['R044G2S', 'R054G2S'].indexOf(attrName) < 0,
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
  const firmTypeElementName = data.data.DECLAR.DECLARBODY.H01 === 1 || data.data.DECLAR.DECLARBODY.H01 === 'true'
    ? 'H01' : data.data.DECLAR.DECLARBODY.H02 === 1 || data.data.DECLAR.DECLARBODY.H02 === 'true'
      ? 'H02' : data.data.DECLAR.DECLARBODY.H03 === 1 || data.data.DECLAR.DECLARBODY.H03 === 'true' ? 'H03' : null

  const attrList = allBodyAttrNames.filter(aName => aName !== 'H01' && aName !== 'H02' && aName !== 'H03')

  if (firmTypeElementName) {
    attrList.splice(6, 0, firmTypeElementName)
  }
  const attrListExt = buildAttrsExt(attrList, cellFormats)
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
