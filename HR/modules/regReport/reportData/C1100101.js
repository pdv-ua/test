const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = prepareStructureReport()
  const { DECLARBODY, DECLARHEAD } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setHeadData({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setBodyData({ data, params })
  return { data, errorMessages }
}

const allBodyAttrNames = [
  'UNICODE', 'CST_CAPTION', 'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER', 'ADDRESS',
  'PHONE', 'CAPTION', 'ACCOUNT', 'MFO',

  'TVP_DAYS', 'TVP_SUM', 'MATERNITY_DAYS', 'MATERNITY_SUM', 'FUNERAL_COUNT', 'FUNERAL_SUM',
  'ACCEDENT_DAYS', 'ACCEDENT_SUM', 'SIMPLIFIED_DAYS', 'SIMPLIFIED_SUM', 'GRAVE_COUNT', 'GRAVE_SUM', 'SUM_ALL',
  'TVP_CHAES_DAYS', 'TVP_CHAES_SUM', 'MATERNITY_CHAES_DAYS', 'MATERNITY_CHAES_SUM',

  'D1_POSITION', 'D1_PERSON', 'D1_PHONE',
  'D2_POSITION', 'D2_PERSON', 'D2_PHONE',
  'D3_POSITION', 'D3_PERSON', 'D3_PHONE',
  'D4_POSITION', 'D4_PERSON', 'D4_PHONE',
  'D5_POSITION', 'D5_PERSON', 'D5_PHONE',

  'N16', 'N17', 'N18', 'N19', 'N20', 'N21',
  'CSTRAX'
]

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_REG', 'PERIOD_MONTH', 'PERIOD_TYPE',
  'PERIOD_YEAR', 'C_DOC_STAN', 'C_DOC_CNT', 'SOFTWARE']

function prepareStructureReport () {
  let data = {
    DECLAR: {
      DECLARHEAD: {
      },
      DECLARBODY: {
      },
      PARAMS: {
        REPORTNAME: null
      }
    }
  }

  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'C1100101.xsd'
  }

  allHeadAttrNames.forEach(cName => {
    data.DECLAR.DECLARHEAD[cName] = null
  })

  allBodyAttrNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
  return data
}

function setBodyData ({ data, params }) {
  const { DECLARBODY } = data.DECLAR
  const nameOrg = UB.Repository('hr_organization')
    .attrs(['ID', 'fullName', 'EDRPOUCode'])
    .where('mi_data_id', '=', params.organizationID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle()
  DECLARBODY.CST_CAPTION = nameOrg && nameOrg['fullName'] ? nameOrg['fullName'] : ''

  DECLARBODY.UNICODE = nameOrg && nameOrg['EDRPOUCode'] ? nameOrg['EDRPOUCode'] : ''

  const orgAddress = UB.Repository('ac_address')
    .attrs(['address', 'postIndex'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle()

  DECLARBODY.ADDRESS = orgAddress && orgAddress['address'] ? orgAddress['address'] : ''

  const orgPhone = UB.Repository('cdn_contact')
    .attrs(['value'])
    .where('subjectID', '=', params.organizationID)
    .where('contactTypeID.code', '=', 'phone')
    .limit(1)
    .selectSingle()

  DECLARBODY.PHONE = orgPhone && orgPhone['value'] ? orgPhone['value'] : ''

  const orgAccount = UB.Repository('ac_orgAccount')
    .attrs(['bankID.name', 'bankID.MFO', 'code'])
    .where('organizationID', '=', params.organizationID)
    .where('acctype', '=', 'FSS')
    .limit(1)
    .selectSingle()

  DECLARBODY.CAPTION = orgAccount && orgAccount['bankID.name'] ? orgAccount['bankID.name'] : ''
  DECLARBODY.MFO = orgAccount && orgAccount['bankID.MFO'] ? orgAccount['bankID.MFO'] : ''
  DECLARBODY.ACCOUNT = orgAccount && orgAccount['code'] ? orgAccount['code'] : ''

  DECLARBODY.DATE_FORMATION = dateService.formatDate(params.dateFill, 'ddmmyyyy')

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.buhID)

  DECLARBODY.CHIEF = bos['employeeID.shortFIO']
  DECLARBODY.BOOKKEEPER = buh['employeeID.shortFIO']

  setResponPersonData(DECLARBODY, params, params.empRespID1, 'D1')
  setResponPersonData(DECLARBODY, params, params.empRespID2, 'D2')
  setResponPersonData(DECLARBODY, params, params.empRespID3, 'D3')
  setResponPersonData(DECLARBODY, params, params.empRespID4, 'D4')
  setResponPersonData(DECLARBODY, params, params.empRespID5, 'D5')

  const sicknessRequisDt = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'sum([payDaysChNPP])', 'sum([paySumChNPP])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '18', 'ispayElID18')
    .where('payElID.methodID.code', '=', '19', 'ispayElID19')
    .where('payElID.methodID.code', '=', '149', 'ispayElID149')
    .logic('([ispayElID18] OR [ispayElID19] OR [ispayElID149])')
    .limit(1)
    .selectSingle()

  DECLARBODY.TVP_DAYS = sicknessRequisDt && sicknessRequisDt['sum([payDays])'] ? sicknessRequisDt['sum([payDays])'] : 0

  DECLARBODY.TVP_SUM = sicknessRequisDt && sicknessRequisDt['sum([paySum])'] ? sicknessRequisDt['sum([paySum])'] : 0

  DECLARBODY.N16 = sicknessRequisDt && sicknessRequisDt['count(*)'] > 0

  DECLARBODY.TVP_CHAES_DAYS = sicknessRequisDt && sicknessRequisDt['sum([payDaysChNPP])'] ? sicknessRequisDt['[sum(payDaysChNPP])'] : 0
  DECLARBODY.TVP_CHAES_SUM = sicknessRequisDt && sicknessRequisDt['sum([paySumChNPP])'] ? sicknessRequisDt['sum([paySumChNPP])'] : 0

  const sicknessRequisDt20 = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'sum([payDaysChNPP])', 'sum([paySumChNPP])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '20')
    .limit(1)
    .selectSingle()

  DECLARBODY.MATERNITY_DAYS = sicknessRequisDt20 && sicknessRequisDt20['sum([payDays])'] ? sicknessRequisDt20['sum([payDays])'] : 0
  DECLARBODY.MATERNITY_SUM = sicknessRequisDt20 && sicknessRequisDt20['sum([paySum])'] ? sicknessRequisDt20['sum([paySum])'] : 0
  DECLARBODY.MATERNITY_CHAES_DAYS = sicknessRequisDt20 && sicknessRequisDt20['sum([payDaysChNPP])'] ? sicknessRequisDt20['sum([payDaysChNPP])'] : 0
  DECLARBODY.MATERNITY_CHAES_SUM = sicknessRequisDt20 && sicknessRequisDt20['sum([paySumChNPP])'] ? sicknessRequisDt20['sum([paySumChNPP])'] : 0
  DECLARBODY.N17 = sicknessRequisDt20 && sicknessRequisDt20['count(*)'] > 0

  const sicknessRequisDt38 = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '38')
    .limit(1)
    .selectSingle()

  DECLARBODY.FUNERAL_COUNT = sicknessRequisDt38 && sicknessRequisDt38['count(*)'] ? sicknessRequisDt38['count(*)'] : 0
  DECLARBODY.FUNERAL_SUM = sicknessRequisDt38 && sicknessRequisDt38['sum([paySum])'] ? sicknessRequisDt38['sum([paySum])'] : 0
  DECLARBODY.N18 = sicknessRequisDt38 && sicknessRequisDt38['count(*)'] > 0

  const sicknessRequisDt40 = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '40')
    .limit(1)
    .selectSingle()
  DECLARBODY.ACCEDENT_DAYS = sicknessRequisDt40 && sicknessRequisDt40['sum([payDays])'] ? sicknessRequisDt40['sum([payDays])'] : 0
  DECLARBODY.ACCEDENT_SUM = sicknessRequisDt40 && sicknessRequisDt40['sum([paySum])'] ? sicknessRequisDt40['sum([paySum])'] : 0
  DECLARBODY.N19 = sicknessRequisDt40 && sicknessRequisDt40['count(*)'] > 0

  const sicknessRequisDt50 = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '50')
    .limit(1)
    .selectSingle()

  DECLARBODY.SIMPLIFIED_DAYS = sicknessRequisDt50 && sicknessRequisDt50['sum([payDays])'] ? sicknessRequisDt50['sum([payDays])'] : 0
  DECLARBODY.SIMPLIFIED_SUM = sicknessRequisDt50 && sicknessRequisDt50['sum([paySum])'] ? sicknessRequisDt50['sum([paySum])'] : 0
  DECLARBODY.N20 = sicknessRequisDt50 && sicknessRequisDt50['count(*)'] > 0

  const sicknessRequisDt52 = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'sum([payDays])', 'sum([paySum])', 'count(*)' ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '52')
    .limit(1)
    .selectSingle()

  DECLARBODY.GRAVE_COUNT = sicknessRequisDt52 && sicknessRequisDt52['count(*)'] ? sicknessRequisDt52['count(*)'] : 0
  DECLARBODY.GRAVE_SUM = sicknessRequisDt52 && sicknessRequisDt52['sum([paySum])'] ? sicknessRequisDt52['sum([paySum])'] : 0
  DECLARBODY.N21 = sicknessRequisDt52 && sicknessRequisDt52['count(*)'] > 0

  DECLARBODY.SUM_ALL = DECLARBODY.TVP_SUM + DECLARBODY.MATERNITY_SUM + DECLARBODY.FUNERAL_SUM + DECLARBODY.ACCEDENT_SUM + DECLARBODY.SIMPLIFIED_SUM + DECLARBODY.GRAVE_SUM

  let sumNames = ['TVP_SUM', 'TVP_CHAES_SUM', 'MATERNITY_SUM', 'MATERNITY_CHAES_SUM', 'FUNERAL_SUM', 'ACCEDENT_SUM', 'SIMPLIFIED_SUM', 'SIMPLIFIED_SUM', 'GRAVE_SUM', 'SUM_ALL',
    'TVP_DAYS', 'TVP_CHAES_DAYS', 'MATERNITY_DAYS', 'MATERNITY_CHAES_DAYS',
    'FUNERAL_COUNT', 'ACCEDENT_DAYS', 'SIMPLIFIED_DAYS', 'GRAVE_COUNT', 'SUM_ALL']
  sumNames.forEach(item => {
    DECLARBODY[item] = String(DECLARBODY[item])
  })
}

const cellFormats = [
  {
    names: [ 'CST_CAPTION', 'UNICODE', 'ADDRESS', 'PHONE', 'CAPTION', 'MFO', 'ACCOUNT', 'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER',
      'D1_POSITION', 'D1_PERSON', 'D1_PHONE',
      'D2_POSITION', 'D2_PERSON', 'D2_PHONE',
      'D3_POSITION', 'D3_PERSON', 'D3_PHONE',
      'D4_POSITION', 'D4_PERSON', 'D4_PHONE',
      'D5_POSITION', 'D5_PERSON', 'D5_PHONE', 'CSTRAX'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['TVP_DAYS', 'TVP_CHAES_DAYS', 'MATERNITY_DAYS', 'MATERNITY_CHAES_DAYS',
      'FUNERAL_COUNT', 'ACCEDENT_DAYS', 'SIMPLIFIED_DAYS', 'GRAVE_COUNT',
      'N16', 'N17', 'N18', 'N19', 'N20', 'N21'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['TVP_SUM', 'TVP_CHAES_SUM', 'MATERNITY_SUM', 'MATERNITY_CHAES_SUM', 'FUNERAL_SUM', 'ACCEDENT_SUM', 'SIMPLIFIED_SUM', 'SIMPLIFIED_SUM', 'GRAVE_SUM', 'SUM_ALL'],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

// non std xml file name
function generateFileName (params) {
  return [
    zeroFill(params.C_REG, 5), // почему 5
    zeroFill(params.TIN, 10),
    zeroFill(params.C_DOC, 3),
    zeroFill(params.C_DOC_SUB, 3),
    zeroFill(params.C_DOC_VER, 2),
    zeroFill(params.C_DOC_STAN, 1),
    zeroFill(params.PERIOD_MONTH, 2),
    zeroFill(params.PERIOD_TYPE, 1),
    zeroFill(params.PERIOD_YEAR, 4),
    zeroFill(params.C_DOC_CNT, 2)
  ].join('')
}

function zeroFill (number = 0, width) {
  if (typeof number === 'object') {
    number = 0
  }
  return ('0000000000' + number).slice(-width)
}

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

function setHeadData ({ data, params }) {
  const { DECLARHEAD } = data.DECLAR

  DECLARHEAD.C_REG = params.FCCUCode
  DECLARHEAD.TIN = params.EDRPOUCode

  const repVersion = UB.Repository('ac_dictRepVersion').attrs(['code', 'subCode', 'version']).selectById(params.repConfig.dictRepVersionID) || {}
  DECLARHEAD.C_DOC = repVersion.code
  DECLARHEAD.C_DOC_SUB = repVersion.subCode
  DECLARHEAD.C_DOC_VER = Number.parseInt(repVersion.version)

  const repType = UB.Repository('ac_dictRepType').attrs(['namePerType', 'name', 'periodMonth', 'periodType']).selectById(params.dictRepTypeID) || {}
  DECLARHEAD.PERIOD_TYPE = repType.periodType
  DECLARHEAD.PERIOD_MONTH = repType.periodMonth
  DECLARHEAD.PERIOD = String(repType.name)

  DECLARHEAD.PERIOD_YEAR = params.PERIOD_YEAR

  DECLARHEAD.SOFTWARE = 'A5'
  DECLARHEAD.C_DOC_STAN = 1
}

function setResponPersonData (DECLARBODY, params, empRespID, aliasRespPerson = 'D1') {
  const person = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.shortFIO', 'employeeID.phoneWorking'])
    .selectById(empRespID)
  const personPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID.name'])
    .where('employeeNumberID', '=', empRespID)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()

  DECLARBODY[`${aliasRespPerson}_PERSON`] = person['employeeID.shortFIO']
  DECLARBODY[`${aliasRespPerson}_POSITION`] = personPos ? personPos['dictPositionID.name'] : ''
  DECLARBODY[`${aliasRespPerson}_PHONE`] = person['employeeID.phoneWorking']
}
