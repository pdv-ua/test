const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')

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
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'MY_DATE', 'FIRM_KVED',
  'A2010_1', 'A2020_1', 'A2030_1', 'A2040_1', 'A2050_1', 'OBL', 'RAY', 'A2000',
  'REP_PER1', 'MY_DATE', 'S1_1', 'SPATO', 'KVED', 'N1', 'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON'
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
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address || DECLARBODY.FIRM_ADR
  DECLARBODY.KVED = DECLARBODY.HKVED
  DECLARBODY.SPATO = DECLARBODY.HKOATUU_S
  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = DECLARBODY.MY_DATE = dateService.formatDate(dateService.addMonths(paramDateFrom, 1), 'mmm')

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK_RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', paramDateTo)
      .where('mi_dateTo', '>=', paramDateFrom)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]
  let periodN1 = ''
  const periodNames = []
  DECLARBODY.A2000 = DECLARBODY.A2040_1 === 0
  organiozations.forEach(orgID => {
    const period = periodService.getPeriodOnDate(orgID, paramDateFrom)
    const accSum = UB.Repository('hr_accrualBalance')
      .attrs(['SUM([sumFrom] - [sumPay])'])
      .where('periodCalcID', '=', period.ID)
      .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
      .selectScalar() || 0

    DECLARBODY.A2040_1 = accrualService.round((DECLARBODY.A2040_1 || 0) + accrualService.round(accSum / 1000, 1), 1)
    if (accSum > 0) {
      const currentEmployeeNumberBalance = UB.Repository('hr_accrualBalance')
        .attrs(['employeeNumberID', 'sumFrom', 'sumPay', 'sumPlus', 'sumMinus', 'sumTo'])
        .where('periodCalcID', '=', period.ID)
        .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
        .where(`([sumFrom] - [sumPay]) > 0`, 'custom')
        .selectAsObject()
      let employeeNumberIDs = currentEmployeeNumberBalance.map(o => o.employeeNumberID)
      const periods = periodService.getPeriodsByDate(orgID, dateService.addMonths(period.dateFrom, -12), dateService.addMonths(period.dateFrom, -1))
      let i = periods.length - 1
      while (i > 0 && employeeNumberIDs.length) {
        let setPeriod = false
        const employeeNumberBalance = UB.Repository('hr_accrualBalance')
          .attrs(['employeeNumberID', 'sumFrom', 'sumPay', 'sumPlus', 'sumMinus', 'sumTo'])
          .where('employeeNumberID', 'in', employeeNumberIDs)
          .where('periodCalcID', '=', periods[i].ID)
          .where('dictFundSourceID.dictFundTypeID.code', '=', '02')
          .selectAsObject()
        employeeNumberBalance.forEach(row => {
          const empNumIdx = currentEmployeeNumberBalance.findIndex(o => o.employeeNumberID === row.employeeNumberID)
          if (empNumIdx >= 0) {
            if (row.sumTo > 0) {
              if (!setPeriod && (row.sumTo - currentEmployeeNumberBalance[empNumIdx].sumPay) > 0 && (row.sumPlus) > 0) {
                periodNames.push({ name: periods[i].name, dateFrom: periods[i].dateFrom })
                setPeriod = true
              }
              currentEmployeeNumberBalance[empNumIdx].sumPay = currentEmployeeNumberBalance[empNumIdx].sumPay + row.sumPay
            } else {
              currentEmployeeNumberBalance.splice(empNumIdx, 1)
            }
          }
        })

        employeeNumberIDs = currentEmployeeNumberBalance.map(o => employeeNumberBalance.find(eb => eb.employeeNumberID === o.employeeNumberID) ? o.employeeNumberID : 0)
        i--
      }
    }
  })
  if (DECLARBODY.A2040_1 > 0) {
    periodN1 = `- лікарняні за рахунок СС за ${periodNames.sort((a, b) => {
      return (a.dateFrom < b.dateFrom) ? 1 : (a.dateFrom > b.dateFrom) ? -1 : 0
    }).map(o => o.name).join('  р., ')} р.`
  }
  DECLARBODY.N1 = DECLARBODY.A2040_1 > 0 ? `Сума заборгованості ${DECLARBODY.A2040_1} тис.грн ${periodN1}` : ''
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED', 'MY_DATE',
      'OBL', 'RAY', 'S1_1', 'SPATO', 'KVED', 'N1',
      'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A1040', 'A2030_1', 'A2000'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A2010_1', 'A2020_1', 'A2040_1', 'A2050_1'],
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
