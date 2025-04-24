const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const dateService = require('../../../../AC/modules/dataServices/dateService')
module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = prepareStructureReport()
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setHeadData({ data, params })

  addTempleteForCustomRow(PARAMS, params)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setBodyData({ data, params })
  return { data, errorMessages }
}

const allBodyAttrNames = [
  'UNICODE', 'CST_CAPTION', 'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER', 'ADDRESS',
  'PHONE', 'CSTRAX',
  'T1RXXXXG1', 'T1RXXXXG2S', 'T1RXXXXG3S', 'T1RXXXXG4S', 'T1RXXXXG5S', 'T1RXXXXG6S',
  'T1RXXXXG7S', 'T1RXXXXG8D', 'T1RXXXXG9'
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
    'xsi:noNamespaceSchemaLocation': 'C1100201.xsd'
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
  DECLARBODY.DATE_FORMATION = dateService.formatDate(params.dateFill, 'ddmmyyyy')

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.buhID)

  DECLARBODY.CHIEF = bos ? bos['employeeID.shortFIO'] : null
  DECLARBODY.BOOKKEEPER = buh ? buh['employeeID.shortFIO'] : null

  const rollRequis = UB.Repository('hr_RollRequis')
    .attrs([ 'ID', 'sicknessRequisID' ])
    .where('payRollID', '=', params.payRollID)
    .selectAsObject()

  if (!(rollRequis && rollRequis.length > 0)) return

  const sicknessRequisIDs = rollRequis.map(item => item.sicknessRequisID).filter(Boolean)
  const sicknessRequisData = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'employeeNumberID', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName',
      'employeeNumberID.employeeID.middleName', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'seria', 'number', 'paySum', 'employeeNumberID.employeeID'
    ])
    .where('sicknessRequisID', 'in', sicknessRequisIDs)
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .orderBy('orderDate')
    .selectAsObject({
      'employeeNumberID': 'employeeNumberID',
      'employeeNumberID.employeeID': 'employeeID',

      'employeeNumberID.employeeID.lastName': 'T1RXXXXG2S',
      'employeeNumberID.employeeID.firstName': 'T1RXXXXG3S',
      'employeeNumberID.employeeID.middleName': 'T1RXXXXG4S',
      'employeeNumberID.employeeID.taxCode': 'T1RXXXXG5S',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',
      'seria': 'T1RXXXXG6S',
      'number': 'T1RXXXXG7S',

      'paySum': 'T1RXXXXG9'
    })

  sicknessRequisData.forEach((row, idx) => {
    row.T1RXXXXG5S = `${row.empTaxCodeType === 'PASSPORT' ? 'БК' : (row.empTaxCodeType === 'IDCARD' ? 'П' : '')}${row.T1RXXXXG5S}`
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T1RXXXXG1', rownum, rownum)
    updateCellInArray(data, 'T1RXXXXG2S', rownum, row['T1RXXXXG2S'])
    updateCellInArray(data, 'T1RXXXXG3S', rownum, row['T1RXXXXG3S'])
    updateCellInArray(data, 'T1RXXXXG4S', rownum, row['T1RXXXXG4S'])
    updateCellInArray(data, 'T1RXXXXG5S', rownum, row['T1RXXXXG5S'])
    updateCellInArray(data, 'T1RXXXXG6S', rownum, row['T1RXXXXG6S'])
    updateCellInArray(data, 'T1RXXXXG7S', rownum, row['T1RXXXXG7S'])
    updateCellInArray(data, 'T1RXXXXG8D', rownum, dateService.formatDate(params.datePay, 'ddmmyyyy'))
    updateCellInArray(data, 'T1RXXXXG9', rownum, row['T1RXXXXG9'])
  })
}

const cellFormats = [
  {
    names: ['CST_CAPTION', 'UNICODE', 'ADDRESS', 'PHONE', 'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER', 'CSTRAX',
      'T1RXXXXG2S', 'T1RXXXXG3S', 'T1RXXXXG4S', 'T1RXXXXG5S', 'T1RXXXXG6S', 'T1RXXXXG7S', 'T1RXXXXG8D'
    ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['T1RXXXXG1'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG9'],
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
    zeroFill(params.C_REG, 5),
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

function addTempleteForCustomRow (params, dataParams) {
  let defDatePay = dateService.formatDate(dataParams.datePay, 'ddmmyyyy')
  params.T1 = `<tr><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px;" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;">{{#rowNumberSpan}}DECLAR.DECLARBODY.T1RXXXXG1##ROWNUM{{{}}}{{/rowNumberSpan}}</td>   
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG2S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG3S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG4S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG5S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG6S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG7S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG8D##ROWNUM##{"defaultValue": "${defDatePay}"}{{{}}}{{/dateInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/currencyInput}}</td></tr>`
  params.T1BtnAddRow = `<tr style="height: 16px;" class="no-print"><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px; height: 18px;"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button></td><td colspan="9"></td></tr>`
}
