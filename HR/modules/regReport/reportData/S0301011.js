const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
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
  const { DECLARBODY, DECLARHEAD } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  setMainData({ data, params })
  prepareQueryParams({ data, params })

  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']

const allBodyAttrNames = [
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'FIRM_KVED', 'FIRM_FAXORG',
  'A1020', 'A1030', 'A1040', 'A1060', 'A1070', 'A2010', 'A2020', 'A2030', 'A2040', 'A2050', 'A2060', 'A2070', 'NOMER', 'N_1', 'N_2', 'N_3', 'OBL', 'RAY',
  'REP_PER1', 'S1_1', 'TER_STRUK', 'SPATO', 'KVED', 'N1', 'N2', 'N3', 'VIK_RUK', 'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'S0301011.xsd'
  }
  data.DECLAR.DECLARHEAD.C_DOC_STAN = 1
  data.DECLAR.DECLARHEAD.C_DOC_TYPE = 0
  delete data.DECLAR.DECLARHEAD.C_STI_ORIG
  delete data.DECLAR.DECLARHEAD.LINKED_DOCS

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
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  let paramDateFrom = dateService.shiftDate(params.dateFrom)
  let paramDateTo = dateService.shiftDate(params.dateTo)
  const period = periodService.getPeriodOnDate(params.organizationID, paramDateFrom)
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })

  // add non std data for org
  const orgAddress = UB.Repository('ac_address')
    .attrs(['address'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address
  DECLARBODY.N_2 = DECLARBODY.HKVED || orgInfo['hkved']
  DECLARBODY.VIK_TEL = orgInfo['phone']
  DECLARBODY.FIRM_FAXORG = orgInfo['fax']
  DECLARBODY.VIK_EMAIL = orgInfo['email']

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = UB.Repository('ac_dictRepType')
    .where('[periodType]', '=', DECLARHEAD.PERIOD_TYPE)
    .where('[periodMonth]', '=', DECLARBODY.REP_PER1)
    .attrs(['name'])
    .selectScalar()

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID) : {}
  const resp = (params.respID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.respID) : {}

  DECLARBODY.VIK_RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK = resp['employeeID.shortFIO']

  const reportParams = reportService.getReportParams(params.organizationID, ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity'])
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

  // calculate fop sum
  DECLARBODY.A1020 = UB.Repository('hr_accrual')
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
    .where('periodCalcID', '=', period.ID, 'case1')
    .where('periodSalary', '<=', paramDateTo, 'cond1')
    .where('periodCalc', '<', paramDateFrom, 'case2')
    .where('periodSalaryID', '=', period.ID, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
    .attrs(['SUM([paySum])'])
    .selectScalar() || 0
  DECLARBODY.A1020 = Math.round(DECLARBODY.A1020 / 100) / 10

  // load pdfo by employee+period
  const pdfoData = UB.Repository('hr_accrual')
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('[payElID.methodID.code]', '=', '26')
    .where('periodCalcID', '=', period.ID, 'case1')
    .where('periodSalary', '<=', paramDateTo, 'cond1')
    .where('periodCalc', '<', paramDateFrom, 'case2')
    .where('periodSalaryID', '=', period.ID, 'cond2')

    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
    .groupBy(['periodSalary', 'employeeNumberID'])
    .attrs(['periodSalary', 'employeeNumberID', 'SUM([paySum])', 'SUM([baseSum])'])
    .selectAsObject({
      'SUM([paySum])': 'paySum',
      'SUM([baseSum])': 'baseSum'
    })

  const fopDataForPdfo = UB.Repository('hr_accrual')
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('[payElID]', 'in', pdfoPayElIDs)
    .where('periodCalcID', '=', period.ID, 'case1')
    .where('periodSalary', '<=', paramDateTo, 'cond1')
    .where('periodCalc', '<', paramDateFrom, 'case2')
    .where('periodSalaryID', '=', period.ID, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
    .groupBy(['periodSalary', 'employeeNumberID'])
    .attrs(['periodSalary', 'employeeNumberID', 'SUM([paySum])'])
    .selectAsObject({
      'SUM([paySum])': 'paySum'
    })

  // claculate pdfo
  let sumPdfoFop = 0
  pdfoData.forEach(el => {
    let fopPdfo = fopDataForPdfo.find(fopRow => fopRow.employeeNumberID === el.employeeNumberID && fopRow.periodSalary === el.periodSalary)
    fopPdfo = fopPdfo ? fopPdfo.paySum : 0
    sumPdfoFop += el.baseSum > 0 ? (el.paySum / el.baseSum) * fopPdfo : 0
  })
  DECLARBODY.A1030 = sumPdfoFop
  DECLARBODY.A1030 = Math.round(DECLARBODY.A1030 / 100) / 10

  // load positons
  const empPosDatas = UB.Repository('hr_employeePositionS')
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '<=', paramDateTo)
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
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
    .filter(empPos => dateService.shiftDate(empPos['employeeNumberID.dateTo']) < paramDateTo)
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
Group by tp.workScheduleID, en.ID
    `
    const tmStore = UB.DataStore('tim_plan')
    tmStore.runSQL(minDayDateSQL,
      {
        orgID: params.organizationID
      })
    minDayDateData = tmStore.getAsJsObject()
    tmStore.freeNative()
  }
  const empNumIds = []
  const empNums = workEmps
    .map(empPosData => {
      const dateTo = dateService.shiftDate(empPosData['employeeNumberID.dateTo'])
      let minDayData = minDayDateData.find(ep => ep.employeeNumberID === empPosData['employeeNumberID.dateTo'] && ep.workScheduleID === empPosData.workScheduleID)
      let dateToCorr = dateTo
      if (minDayData) {
        dateToCorr = dateService.addDays(dateService.shiftDate(minDayData.minDay), -1)
      }
      if (empPosData.workPlace === '1') {
        empNumIds.push(empPosData.employeeNumberID)
      }
      return {
        employeeNumberID: empPosData.employeeNumberID,
        dateFrom: dateService.shiftDate(empPosData['employeeNumberID.dateFrom']),
        dateTo: dateTo,
        dateToCorr: dateToCorr
      }
    })

  // index by employeeNumberID
  const empNumsByEmp = empNums.reduce((accum, row) => {
    accum[row.employeeNumberID] = row
    return accum
  }, {})

  // load corresponding timesheets within month

  const timeSheets = UB.Repository('tim_timeSheet')
    .where('[employeeNumberID]', 'in', empNumIds)
    .where('[isActive]', '=', true)
    .whereIf(reportParams.notAvgQuantityIDs.length, '[factTimeCostID]', 'notIn', reportParams.notAvgQuantityIDs)
    .where('[dateWork]', '>=', paramDateFrom)
    .where('[dateWork]', '<=', paramDateTo)
    .groupBy(['employeeNumberID', 'dateWork'])
    .attrs(['employeeNumberID', 'dateWork'])
    .selectAsObject()

  // intersect with hire-fire dates and count days
  const timeSheetsDays = timeSheets.reduce((accum, timeSheet) => {
    timeSheet.dateWork = dateService.shiftDate(timeSheet.dateWork)
    const empNum = empNumsByEmp[timeSheet.employeeNumberID]
    if (empNum.dateFrom <= timeSheet.dateWork && timeSheet.dateWork <= empNum.dateToCorr) {
      accum++
    }
    return accum
  }, 0)

  DECLARBODY.A1040 = Math.round(timeSheetsDays / dateService.lastDayOfMonth(paramDateFrom, false).getDate())

  // load hour from timesheets
  DECLARBODY.A1060 = Math.round(UB.Repository('tim_timeSheet')
    .where('[employeeNumberID]', 'in', workEmps.map(o => o.employeeNumberID))
    .where('[isActive]', '=', true)
    .where('[factTimeCostID.timeCostType]', '=', 'WORK', 'workType')
    .where('[factTimeCostID.code]', '=', 'Вдр', 'businessTrip')
    .where('[dateWork]', '>=', paramDateFrom)
    .where('[dateWork]', '<=', paramDateTo)
    .logic('([workType] OR [businessTrip])')
    .attrs(['SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [planHour] END)'])
    .selectScalar() || 0)

  // calculate fop filtered by workPlace
  DECLARBODY.A1070 = UB.Repository('hr_accrual')
    .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
    .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
    .where('periodCalc', '<=', paramDateTo)
    .where('periodSalary', '<=', paramDateTo)
    .where('periodCalcID', '=', period.ID, 'case1')
    .where('periodCalc', '<', paramDateFrom, 'case2')
    .where('periodSalaryID', '=', period.ID, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .logic('([case1] OR ([case2] AND [cond2]))')
    .attrs(['SUM([paySum])'])
    .selectScalar() || 0
  DECLARBODY.A1070 = Math.round(DECLARBODY.A1070 / 100) / 10

  // load hr_accrualBalance
  DECLARBODY.A2040 = UB.Repository('hr_accrualBalance')
    .attrs(['SUM([sumTo])'])
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('periodCalcID', '=', period.ID)
    .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .selectScalar() || 0

  DECLARBODY.A2070 = UB.Repository('hr_accrualBalance')
    .attrs(['SUM([sumTo])'])
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('periodCalcID', '=', period.ID)
    .where('dictFundSourceID.name', '=', 'Фонд ЧАЕС')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .selectScalar() || 0
}

// non std xml file name
function generateFileName (params) {
  return [
    zeroFill(params.C_REG, 2),
    zeroFill(params.C_RAJ, 3),
    zeroFill(params.TIN, 10),
    zeroFill(params.C_DOC, 3),
    zeroFill(params.C_DOC_SUB, 3),
    zeroFill(params.C_DOC_VER, 2),
    '1',
    '00',
    zeroFill(params.C_DOC_CNT, 5),
    zeroFill(params.PERIOD_MONTH, 2),
    zeroFill(params.PERIOD_YEAR, 4)
  ].join('')
}

function zeroFill (number = 0, width) {
  if (typeof number === 'object') {
    number = 0
  }
  return ('0000000000' + number).slice(-width)
}

const cellFormats = [
  {
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED', 'FIRM_FAXORG', 'N_1', 'N_2', 'N_3', 'OBL', 'RAY', 'REP_PER1', 'S1_1', 'TER_STRUK', 'SPATO', 'KVED', 'N1', 'N2', 'N3', 'VIK_RUK', 'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A1040', 'A1060', 'A2030', 'NOMER'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A1030', 'A1070', 'A2010', 'A2020', 'A2040', 'A2050', 'A2060', 'A2070'],
    format: {
      type: 'number',
      nillable: true,
      precision: 1
    }
  }
]

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListExt = buildAttrsExt(allBodyAttrNames, cellFormats)
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.data.DECLAR.DECLARHEAD, attrList: allHeadAttrNames }),
      DECLARBODY: createDeclarExt({ declar: data.data.DECLAR.DECLARBODY, attrListExt })
    }
  }
  const xmlFileName = `${generateFileName(DECLARHEAD)}.xml`
  return { xmlData, xmlFileName }
}
