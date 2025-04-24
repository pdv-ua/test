const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const moment = require('moment')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')

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
  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setBodyData({ data, params })

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'T4RXXXXG1', 'T4RXXXXG2S', 'T4RXXXXG3S', 'T4RXXXXG4S', 'T4RXXXXG5S',
  'T4RXXXXG6D',
  'T4RXXXXG7S', 'T4RXXXXG8S', 'T4RXXXXG9S',
  'T4RXXXXG10',
  'T4RXXXXG11D', 'T4RXXXXG12D',
  'T4RXXXXG13', 'T4RXXXXG14',
  'D4_POSITION', 'D4_PERSON', 'D4_PHONE'
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

  const person = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.shortFIO', 'employeeID.phoneWorking', 'employeeID.phoneMobile'])
    .selectById(params.empRespID4)
  const personPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID.name'])
    .where('employeeNumberID', '=', params.empRespID4)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()

  DECLARBODY.D4_PERSON = person['employeeID.shortFIO']
  DECLARBODY.D4_POSITION = personPos ? personPos['dictPositionID.name'] : ''
  DECLARBODY.D4_PHONE = person['employeeID.phoneWorking'] || person['employeeID.phoneMobile']

  const sicknessRequisData = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'employeeNumberID', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName',
      'employeeNumberID.employeeID.middleName', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'seria', 'number', 'payDays', 'paySumAll', 'orderID'
    ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '50')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .selectAsObject({
      'employeeNumberID': 'employeeNumberID',
      'employeeNumberID.employeeID.lastName': 'T4RXXXXG2S',
      'employeeNumberID.employeeID.firstName': 'T4RXXXXG3S',
      'employeeNumberID.employeeID.middleName': 'T4RXXXXG4S',
      'employeeNumberID.employeeID.taxCode': 'T4RXXXXG5S',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',

      'seria': 'T4RXXXXG8S',
      'number': 'T4RXXXXG9S',

      'payDays': 'T4RXXXXG13',
      'paySumAll': 'T4RXXXXG14',
      'orderID': 'orderID'
    })

  if (sicknessRequisData.length === 0) {
    return
  }

  let orders = sicknessRequisData.map(item => item.orderID)

  const docRegSickness = UB.Repository('hr_docRegSickness')
    .attrs([ 'ID', 'employeeNumberID', 'actDate', 'actNumber', 'dateFrom', 'dateTo' ])
    .where('ID', 'in', orders)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject()

  sicknessRequisData.forEach(srRow => {
    let empOrder = docRegSickness.find(el => el.ID === srRow.orderID)
    srRow.T4RXXXXG6D = empOrder ? moment(empOrder['actDate']).format('DDMMYYYY') : null
    srRow.T4RXXXXG7S = empOrder ? empOrder['actNumber'] : null
    srRow.T4RXXXXG11D = empOrder ? moment(empOrder['dateFrom']).format('DDMMYYYY') : null
    srRow.T4RXXXXG12D = empOrder ? moment(empOrder['dateTo']).format('DDMMYYYY') : null
    srRow.T4RXXXXG5S = `${srRow.empTaxCodeType === 'PASSPORT' ? 'БК' : (srRow.empTaxCodeType === 'IDCARD' ? 'П' : '')}${srRow.T4RXXXXG5S}`
  })

  // НЕТ таблицы hr_empOrderEasyWork  для T4RXXXXG10

  sicknessRequisData.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T4RXXXXG1', rownum, rownum)
    updateCellInArray(data, 'T4RXXXXG2S', rownum, row['T4RXXXXG2S'])
    updateCellInArray(data, 'T4RXXXXG3S', rownum, row['T4RXXXXG3S'])
    updateCellInArray(data, 'T4RXXXXG4S', rownum, row['T4RXXXXG4S'])
    updateCellInArray(data, 'T4RXXXXG5S', rownum, row['T4RXXXXG5S'])

    updateCellInArray(data, 'T4RXXXXG6D', rownum, row['T4RXXXXG6D'])
    updateCellInArray(data, 'T4RXXXXG7S', rownum, row['T4RXXXXG7S'])

    updateCellInArray(data, 'T4RXXXXG8S', rownum, row['T4RXXXXG8S'])

    updateCellInArray(data, 'T4RXXXXG9S', rownum, row['T4RXXXXG9S'])
    updateCellInArray(data, 'T4RXXXXG10', rownum, row['T4RXXXXG10'])

    updateCellInArray(data, 'T4RXXXXG11D', rownum, row['T4RXXXXG11D'])
    updateCellInArray(data, 'T4RXXXXG12D', rownum, row['T4RXXXXG12D'])

    updateCellInArray(data, 'T4RXXXXG13', rownum, row['T4RXXXXG13'])
    updateCellInArray(data, 'T4RXXXXG14', rownum, row['T4RXXXXG14'])
  })
}

const cellFormats = [
  {
    names: [ 'T4RXXXXG2S', 'T4RXXXXG3S', 'T4RXXXXG4S', 'T4RXXXXG5S',
      'T4RXXXXG6D', 'T4RXXXXG7S', 'T4RXXXXG8S', 'T4RXXXXG9S',
      'T4RXXXXG11D', 'T4RXXXXG12D',
      'D4_POSITION', 'D4_PERSON', 'D4_PHONE' ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['T4RXXXXG1', 'T4RXXXXG10', 'T4RXXXXG13'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T4RXXXXG14'],
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

function addTempleteForCustomRow (params) {
  params.T4 = `<tr><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px;" class="no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T4" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;">{{#rowNumberSpan}}DECLAR.DECLARBODY.T4RXXXXG1##ROWNUM{{{}}}{{/rowNumberSpan}}</td>   
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG2S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG3S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG4S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG5S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T4RXXXXG6D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG7S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG8S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T4RXXXXG9S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T4RXXXXG10##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T4RXXXXG11D##ROWNUM{{{}}}{{/dateInput}}</td>  
      <td>{{#dateInput}}DECLAR.DECLARBODY.T4RXXXXG12D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T4RXXXXG13##ROWNUM{{{}}}{{/intInput}}</td>  
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T4RXXXXG14##ROWNUM{{{}}}{{/currencyInput}}</td></tr>`
  params.T4BtnAddRow = `<tr style="height: 16px;" class="no-print"><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px; height: 18px;"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T4" style="height: 20px;">+</button></td><td colspan="14"></td></tr>`
}
