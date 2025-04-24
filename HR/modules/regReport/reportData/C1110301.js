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
  'T3RXXXXG1', 'T3RXXXXG2S', 'T3RXXXXG3S', 'T3RXXXXG4S',
  'T3RXXXXG5S',
  'T3RXXXXG6', 'T3RXXXXG7D', 'T3RXXXXG8S',
  'T3RXXXXG9S', 'T3RXXXXG10S',
  'T3RXXXXG11',
  'T3RXXXXG12D', 'T3RXXXXG13D', 'T3RXXXXG14', 'T3RXXXXG15',
  'D3_POSITION', 'D3_PERSON', 'D3_PHONE'
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
    .selectById(params.empRespID3)
  const personPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID.name'])
    .where('employeeNumberID', '=', params.empRespID3)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()

  DECLARBODY.D3_PERSON = person['employeeID.shortFIO']
  DECLARBODY.D3_POSITION = personPos ? personPos['dictPositionID.name'] : ''
  DECLARBODY.D3_PHONE = person['employeeID.phoneWorking'] || person['employeeID.phoneMobile']

  const sicknessRequisData = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'employeeNumberID', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName',
      'employeeNumberID.employeeID.middleName', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'seria', 'number', 'payDays', 'paySumAll',
      'orderID'
    ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '40')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .selectAsObject({
      'employeeNumberID': 'employeeNumberID',
      'employeeNumberID.employeeID.lastName': 'T3RXXXXG2S',
      'employeeNumberID.employeeID.firstName': 'T3RXXXXG3S',
      'employeeNumberID.employeeID.middleName': 'T3RXXXXG4S',
      'employeeNumberID.employeeID.taxCode': 'T3RXXXXG5S',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',

      'seria': 'T3RXXXXG9S',
      'number': 'T3RXXXXG10S',

      'payDays': 'T3RXXXXG14',
      'paySumAll': 'T3RXXXXG15',
      'orderID': 'orderID'
    })

  if (sicknessRequisData.length === 0) {
    return
  }

  let orders = sicknessRequisData.map(item => item.orderID)
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs(['workerType', 'ID', 'employeeNumberID', 'workPlace'])
    .where('organizationID', '=', params.organizationID)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  sicknessRequisData.forEach(srRow => {
    let empPos = employeePosition.find(el => el.employeeNumberID === srRow.employeeNumberID)
    srRow.T3RXXXXG6 = empPos ? (['1', '2'].includes(empPos['workerType']) ? (empPos['workPlace'] === '3' ? '2' : '1') : (empPos['workerType'] === '3' ? '2' : '4')) : null
    srRow.T3RXXXXG5S = `${srRow.empTaxCodeType === 'PASSPORT' ? 'БК' : (srRow.empTaxCodeType === 'IDCARD' ? 'П' : '')}${srRow.T3RXXXXG5S}`
  })

  const docRegSickness = UB.Repository('hr_docRegSickness')
    .attrs([ 'ID', 'employeeNumberID', 'actDate', 'actNumber', 'dictIllnessReasonID.code',
      'dateFrom', 'dateTo'
    ])
    .where('ID', 'in', orders)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject()

  sicknessRequisData.forEach(srRow => {
    let empOrder = docRegSickness.find(el => el.ID === srRow.orderID)
    srRow.T3RXXXXG7D = empOrder ? moment(empOrder['actDate']).format('DDMMYYYY') : null
    srRow.T3RXXXXG8S = empOrder ? empOrder['actNumber'] : null
    srRow.T3RXXXXG11 = empOrder ? empOrder['dictIllnessReasonID.code'] : null
    srRow.T3RXXXXG12D = empOrder ? moment(empOrder['dateFrom']).format('DDMMYYYY') : null
    srRow.T3RXXXXG13D = empOrder ? moment(empOrder['dateTo']).format('DDMMYYYY') : null
  })

  sicknessRequisData.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T3RXXXXG1', rownum, rownum)
    updateCellInArray(data, 'T3RXXXXG2S', rownum, row['T3RXXXXG2S'])
    updateCellInArray(data, 'T3RXXXXG3S', rownum, row['T3RXXXXG3S'])
    updateCellInArray(data, 'T3RXXXXG4S', rownum, row['T3RXXXXG4S'])
    updateCellInArray(data, 'T3RXXXXG5S', rownum, row['T3RXXXXG5S'])

    updateCellInArray(data, 'T3RXXXXG6', rownum, row['T3RXXXXG6'])

    updateCellInArray(data, 'T3RXXXXG7D', rownum, row['T3RXXXXG7D'])

    updateCellInArray(data, 'T3RXXXXG8S', rownum, row['T3RXXXXG8S'])
    updateCellInArray(data, 'T3RXXXXG9S', rownum, row['T3RXXXXG9S'])
    updateCellInArray(data, 'T3RXXXXG10S', rownum, row['T3RXXXXG10S'])
    updateCellInArray(data, 'T3RXXXXG11', rownum, row['T3RXXXXG11'])

    updateCellInArray(data, 'T3RXXXXG12D', rownum, row['T3RXXXXG12D'])
    updateCellInArray(data, 'T3RXXXXG13D', rownum, row['T3RXXXXG13D'])

    updateCellInArray(data, 'T3RXXXXG14', rownum, row['T3RXXXXG14'])
    updateCellInArray(data, 'T3RXXXXG15', rownum, row['T3RXXXXG15'])
  })
}

const cellFormats = [
  {
    names: [ 'T3RXXXXG2S', 'T3RXXXXG3S', 'T3RXXXXG4S', 'T3RXXXXG5S',
      'T3RXXXXG7D', 'T3RXXXXG8S', 'T3RXXXXG9S', 'T3RXXXXG10S',
      'T3RXXXXG12D', 'T3RXXXXG13D',
      'D3_POSITION', 'D3_PERSON', 'D3_PHONE' ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['T3RXXXXG1', 'T3RXXXXG6', 'T3RXXXXG11', 'T3RXXXXG14'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T3RXXXXG15'],
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
  params.T3 = `<tr><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px;" class="no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T3" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;">{{#rowNumberSpan}}DECLAR.DECLARBODY.T3RXXXXG1##ROWNUM{{{}}}{{/rowNumberSpan}}</td>   
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG2S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG3S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG4S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG5S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T3RXXXXG6##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T3RXXXXG7D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG8S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG9S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T3RXXXXG10S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T3RXXXXG11##ROWNUM{{{}}}{{/intInput}}</td>   
      <td>{{#dateInput}}DECLAR.DECLARBODY.T3RXXXXG12D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T3RXXXXG13D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T3RXXXXG14##ROWNUM{{{}}}{{/intInput}}</td>  
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T3RXXXXG15##ROWNUM{{{}}}{{/currencyInput}}</td></tr>`

  params.T3BtnAddRow = `<tr style="height: 16px;" class="no-print"><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px; height: 18px;"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T3" style="height: 20px;">+</button></td><td colspan="15"></td></tr>`
}
