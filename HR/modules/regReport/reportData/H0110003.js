const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const currencyService = require('../../../../AC/modules/dataServices/currencyService')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')
const reportService = require('../../../../HR/modules/reportService')
const settingsService = require('../../../../AC/modules/entityServices/settingsService')

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
  const currentPeriod = periodService.getCurrentPeriod(params.organizationID)
  DECLARHEAD.NOTFULLYEAR = ''
  if (params.yearOfCurrentPeriod === currentPeriod.dateFrom.getFullYear() && currentPeriod.dateFrom.getMonth() !== 11) {
    DECLARHEAD.NOTFULLYEAR = `Увага! Звіт розрахован за даними з Січня ${params.yearOfCurrentPeriod} по ${currentPeriod.name}`
  }

  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  setMainData({ data, params })
  prepareQueryParams({ data, params, currentPeriod })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']

const allBodyAttrNames = [
  'HZY', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'MY_DATE', 'FIRM_KVED',
  'A2010_1', 'A2020_1', 'A2030_1', 'A2040_1', 'A2050_1', 'OBL', 'RAY', 'A2000',
  'REP_PER1', 'MY_DATE', 'S1_1', 'SPATO', 'KVED', 'N1', 'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON', 'CAPTION', 'MFO', 'ACCOUNT',
  'KOATUU', 'KVED', 'ONPR', 'KOPFD', 'Б01', 'Б02', 'Б04', 'Б05'
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

function prepareQueryParams ({ data, params, currentPeriod }) {
  params.dateFrom = dateService.firstDayOfYear(dateService.shiftDate(new Date(data.DECLAR.DECLARHEAD.PERIOD_YEAR, 0, 1, 0, 0, 0, 0)))
  params.dateTo = dateService.lastDayOfYear(params.dateFrom) <= currentPeriod.dateTo ? dateService.lastDayOfYear(params.dateFrom) : currentPeriod.dateTo
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  const infoByAcc = UB.Repository('ac_orgAccount')
    .attrs(['bankID.MFO', 'bankID.name', 'code'])
    .where('organizationID', '=', params.organizationID)
    .where('isbase', '=', 1)
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.CAPTION = infoByAcc['bankID.name']
  DECLARBODY.MFO = infoByAcc['bankID.MFO']
  DECLARBODY.ACCOUNT = infoByAcc['code']

  DECLARBODY.EDRPOU = DECLARBODY.HTIN
  DECLARBODY.KOATUU = DECLARBODY.HKOATUU
  DECLARBODY.KVED = DECLARBODY.HKVED
  DECLARBODY.ONPR = DECLARBODY.H08G0
  DECLARBODY.KOPFD = DECLARBODY.HKOPFG
  DECLARBODY.FFINANCE = 1

  const orgAddress = UB.Repository('ac_address')
    .attrs(['address'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address || DECLARBODY.FIRM_ADR
  DECLARBODY.SPATO = DECLARBODY.HKOATUU_S

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = DECLARBODY.MY_DATE = dateService.formatDate(dateService.addMonths(params.dateFrom, 1), 'd mmm')

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  const staffWorkPlaceList = ['1']

  const reportParams = reportService.getReportParams(params.organizationID, [ 'FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', 'city10PI', 'notFOPS03' ])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]
  organiozations.forEach(orgID => {
    const empPosData = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
        'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID.employeeID.birthDate', 'workScheduleID'
      ])
      .where('[organizationID]', '=', orgID)
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[dateTo]', '>=', params.dateFrom)
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .orderBy('employeeNumberID')
      .orderBy('dateFrom')
      .selectAsObject({
        'employeeNumberID.employeeID.sexType': 'sexType',
        'employeeNumberID.employeeID.birthDate': 'birthDate'
      })

    const empDisability = UB.Repository('hr_employeeDisability')
      .attrs('ID', 'employeeID', 'dateFrom', 'dateTo')
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[dateTo]', '>=', params.dateFrom)
      .where('employeeID', 'in', empPosData.map(o => o.employeeID))
      .orderBy('dateFrom')
      .selectAsObject()
    empDisability.forEach(item => {
      item.dateFrom = dateService.shiftDate(item.dateFrom)
      item.dateTo = dateService.shiftDate(item.dateTo)
    })

    const empCityResident = reportParams.city10PIIDs.length ? UB.Repository('ac_address')
      .attrs('ownerID')
      .where('ownerID', 'in', empPosData.map(o => o.employeeID))
      .where('addressType', '=', '1')
      .where('cityID.cityTypeID', 'in', reportParams.city10PIIDs)
      .selectAsObject() : []

    const empDisData = []
    const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
    empPosData.forEach(emp => {
      emp['dateFrom'] = dateService.shiftDate(emp['dateFrom'])
      emp['dateTo'] = dateService.shiftDate(emp['dateTo'])
      emp['employeeNumberID.dateFrom'] = dateService.shiftDate(emp['employeeNumberID.dateFrom'])
      emp['employeeNumberID.dateTo'] = dateService.shiftDate(emp['employeeNumberID.dateTo'])
      emp['birthDate'] = dateService.shiftDate(emp['birthDate'])
      emp.age = emp['birthDate'] ? dateService.getYmd(emp['birthDate'], params.dateTo, false).years : 0
      emp.isWoman = emp.sexType === 'W'
      emp.isMan = !emp.isWoman
      emp.isCity = !!empCityResident.find(o => o.ownerID === emp.employeeID)
      emp.dateFrom = dateService.shiftDate(Math.max(params.dateFrom, emp.dateFrom))
      if (emp.dateTo >= params.dateTo) {
        emp.dateTo = params.dateTo
      } else if (emp['dateTo'].getTime() === emp['employeeNumberID.dateTo'].getTime() && emp.workScheduleID) {
        const firstWorkDay = UB.Repository('tim_plan')
          .attrs(['dayDate'])
          .where('organizationID', '=', planByOrgID || orgID)
          .where('workScheduleID', '=', emp.workScheduleID)
          .where('dayDate', '>', emp['dateTo'])
          .where('dictTimeCostID.timeCostType', '=', 'WORK')
          .orderBy('dayDate')
          .limit(1)
          .selectSingle()
        if (firstWorkDay) {
          emp.dateTo = dateService.shiftDate(Math.min(params.dateTo, dateService.addDays(dateService.shiftDate(firstWorkDay.dayDate), -1)))
        }
      }
      const dis = empDisability.find(o => o.employeeID === emp.employeeID)
      if (dis && emp.workPlace !== '2') {
        empDisData.push(Object.assign({}, emp))
      }
    })
    let B0101 = 0
    let B0103 = 0
    let B0104 = 0
    let B0105 = 0
    let B0108 = 0
    let B0109 = 0
    let B0112 = 0
    let B0113 = 0

    let B0201 = 0
    let B0203 = 0
    let B0204 = 0
    let B0205 = 0
    let B0208 = 0
    let B0209 = 0
    let B0212 = 0
    let B0213 = 0
    const allEmpIDs = empPosData.filter(o => o.workPlace === '1').map(o => o.employeeNumberID)
    const allWomanIDs = empPosData.filter(o => o.isWoman && o.workPlace === '1').map(o => o.employeeNumberID)
    const allManCityIDs = empPosData.filter(o => o.isCity && o.workPlace === '1').map(o => o.employeeNumberID)
    const allWomanCityIDs = empPosData.filter(o => o.isWoman && o.isCity && o.workPlace === '1').map(o => o.employeeNumberID)
    const allManAge1IDs = empPosData.filter(o => o.isMan && o.age >= 18 && o.age < 36 && o.workPlace === '1').map(o => o.employeeNumberID)
    const allWomanAge1IDs = empPosData.filter(o => o.isWoman && o.age >= 18 && o.age < 36 && o.workPlace === '1').map(o => o.employeeNumberID)
    const allManAge3IDs = empPosData.filter(o => o.isMan && o.age >= 60 && o.workPlace === '1').map(o => o.employeeNumberID)
    const allWomanAge3IDs = empPosData.filter(o => o.isWoman && o.age >= 60 && o.workPlace === '1').map(o => o.employeeNumberID)

    const year = params.dateFrom.getFullYear()
    const mounthCount = params.dateTo.getMonth() + 1
    let empData = { count: 0 }
    for (let month = 0; month < mounthCount; month++) {
      const mDateFrom = dateService.shiftDate(new Date(year, month, 1, 0, 0, 0))
      const mDateTo = dateService.lastDayOfMonth(mDateFrom)
      empData = reportService.getEmpCount(orgID, allEmpIDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0101 += empData.count
      B0201 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allWomanIDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0103 += empData.count
      B0203 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allManCityIDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0104 += empData.count
      B0204 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allWomanCityIDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0105 += empData.count
      B0205 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allManAge1IDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0108 += empData.count
      B0208 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allWomanAge1IDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0109 += empData.count
      B0209 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allManAge3IDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0112 += empData.count
      B0212 += empData.disabilityCount
      empData = reportService.getEmpCount(orgID, allWomanAge3IDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0113 += empData.count
      B0213 += empData.disabilityCount
    }

    DECLARBODY.B0101 = accrualService.round((DECLARBODY.B0101 || 0) + B0101 / mounthCount, 0)
    DECLARBODY.B0103 = accrualService.round((DECLARBODY.B0103 || 0) + B0103 / mounthCount, 0)
    DECLARBODY.B0102 = DECLARBODY.B0101 - DECLARBODY.B0103

    DECLARBODY.B0105 = accrualService.round((DECLARBODY.B0105 || 0) + B0105 / mounthCount, 0)
    DECLARBODY.B0104 = accrualService.round((DECLARBODY.B0104 || 0) + B0104 / mounthCount - DECLARBODY.B0105, 0)

    DECLARBODY.B0106 = accrualService.round((DECLARBODY.B0106 || 0) + DECLARBODY.B0102 - DECLARBODY.B0104)
    DECLARBODY.B0107 = accrualService.round((DECLARBODY.B0107 || 0) + DECLARBODY.B0103 - DECLARBODY.B0105, 0)

    DECLARBODY.B0109 = Math.min(DECLARBODY.B0103, accrualService.round((DECLARBODY.B0109 || 0) + B0109 / mounthCount, 0))
    DECLARBODY.B0108 = Math.min(DECLARBODY.B0102, accrualService.round((DECLARBODY.B0108 || 0) + B0108 / mounthCount, 0))
    DECLARBODY.B0113 = Math.min(DECLARBODY.B0103 - DECLARBODY.B0109, accrualService.round((DECLARBODY.B0113 || 0) + B0113 / mounthCount, 0))

    DECLARBODY.B0112 = Math.min(DECLARBODY.B0102 - DECLARBODY.B0108, accrualService.round((DECLARBODY.B0112 || 0) + B0112 / mounthCount, 0))
    DECLARBODY.B0111 = DECLARBODY.B0103 - DECLARBODY.B0109 - DECLARBODY.B0113
    DECLARBODY.B0110 = DECLARBODY.B0102 - DECLARBODY.B0108 - DECLARBODY.B0112
    DECLARBODY.B0201 = accrualService.round((DECLARBODY.B0201 || 0) + B0201 / mounthCount, 0)
    DECLARBODY.B0203 = accrualService.round((DECLARBODY.B0203 || 0) + B0203 / mounthCount, 0)
    DECLARBODY.B0202 = DECLARBODY.B0201 - DECLARBODY.B0203
    DECLARBODY.B0205 = accrualService.round((DECLARBODY.B0205 || 0) + B0205 / mounthCount, 0)
    DECLARBODY.B0204 = accrualService.round((DECLARBODY.B0204 || 0) + B0204 / mounthCount, 0) - DECLARBODY.B0205

    DECLARBODY.B0206 = accrualService.round((DECLARBODY.B0206 || 0) + DECLARBODY.B0202 - DECLARBODY.B0204)
    DECLARBODY.B0207 = accrualService.round((DECLARBODY.B0207 || 0) + DECLARBODY.B0203 - DECLARBODY.B0205, 0)
    DECLARBODY.B0209 = Math.min(DECLARBODY.B0203, accrualService.round((DECLARBODY.B0209 || 0) + B0209 / mounthCount, 0))
    DECLARBODY.B0208 = Math.min(DECLARBODY.B0202, accrualService.round((DECLARBODY.B0208 || 0) + B0208 / mounthCount, 0))
    DECLARBODY.B0213 = Math.min(DECLARBODY.B0203 - DECLARBODY.B0209, accrualService.round((DECLARBODY.B0213 || 0) + B0213 / mounthCount, 0))
    DECLARBODY.B0212 = Math.min(DECLARBODY.B0202 - DECLARBODY.B0208, accrualService.round((DECLARBODY.B0212 || 0) + B0212 / mounthCount, 0))
    DECLARBODY.B0211 = DECLARBODY.B0203 - DECLARBODY.B0209 - DECLARBODY.B0213
    DECLARBODY.B0210 = DECLARBODY.B0202 - DECLARBODY.B0208 - DECLARBODY.B0212
    const staffEmpIDs = empPosData.filter(o => ['1', '2'].includes(o.workPlace)).map(o => o.employeeNumberID)

    DECLARBODY.B04 = accrualService.round((DECLARBODY.B04 || 0) + (UB.Repository('hr_accrual')
      .attrs(['SUM([paySum])'])
      .where('employeeNumberID', 'in', staffEmpIDs)
      .where('payElID', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .whereIf(reportParams.notFOPS03IDs.length, '[payElID]', 'notIn', reportParams.notFOPS03IDs)
      .where('periodCalc', '>=', params.dateFrom, 'case1_1')
      .where('periodCalc', '<=', params.dateTo, 'case1_2')
      .where('periodSalary', '<=', params.dateTo, 'case1_3')
      .where('periodCalc', '<', params.dateFrom, 'case2_1')
      .where('periodSalary', '>=', params.dateFrom, 'case2_2')
      .where('periodSalary', '<=', params.dateTo, 'case2_3')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case1_1] AND [case1_2] AND [case1_3]) OR ([case2_1] AND [case2_2] AND [case2_3]))')
      .selectScalar() || 0))
  })
  DECLARBODY.B05 = accrualService.round(DECLARBODY.B04 / DECLARBODY.B0101, 2)
  DECLARBODY.B04 = accrualService.round(DECLARBODY.B04 / 1000, 1)
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
  const b03Params = UB.Repository('hr_valuesParam')
    .attrs(['valuesFloat', 'valuesFloat1', 'valuesFloat2', 'valuesFloat3'])
    .where('[listParamID.code]', '=', '<Б>')
    .where('[orgID]', '=', parentOrdID || params.organizationID)
    .where('valuesFloat', '<', DECLARBODY.B0101 || 0)
    .orderBy('valuesFloat', 'DESC')
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .limit(1)
    .selectSingle()

  DECLARBODY.B02 = DECLARBODY.B0201
  DECLARBODY.B03 = 0
  if (b03Params) {
    if (b03Params.valuesFloat1 > 0) DECLARBODY.B03 = b03Params.valuesFloat1
    else if (b03Params.valuesFloat1 === 0) DECLARBODY.B03 = Math.round(b03Params.valuesFloat2 * (DECLARBODY.B0101 || 0) / 100)
  }

  DECLARBODY.B06 = 0
  if (DECLARBODY.B03 > DECLARBODY.B02) {
    const coefPenalty = b03Params ? b03Params.valuesFloat3 : 0
    DECLARBODY.B06 = accrualService.round((coefPenalty || 0) * (DECLARBODY.B03 - DECLARBODY.B02) * DECLARBODY.B05, 2)
  }

  const maxB = Math.max(DECLARBODY.B04, DECLARBODY.B05, DECLARBODY.B06)
  DECLARBODY.widthMaxB = ''
  if (maxB) {
    const l = currencyService.formatAsCurrency(maxB).length
    DECLARBODY.widthMaxB = Math.max(30, Math.ceil(l * 5.5))
  }
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED', 'MY_DATE',
      'OBL', 'RAY', 'S1_1', 'SPATO', 'KVED', 'N1', 'CAPTION', 'ACCOUNT', 'KOATUU', 'KVED', 'ONPR', 'KOPFD',
      'VIK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZY', 'REP_NYEAR', 'A1040', 'A2030_1', 'A2000', 'MFO', 'B01', 'B02'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A2010_1', 'A2020_1', 'A2040_1', 'A2050_1', 'B04'],
    format: {
      type: 'number',
      nillable: true,
      precision: 1
    }
  },
  {
    names: ['B05', 'B06'],
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
