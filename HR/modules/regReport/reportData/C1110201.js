const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
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
  'T2RXXXXG1', 'T2RXXXXG2S', 'T2RXXXXG3S', 'T2RXXXXG4S',
  'T2RXXXXG5S',
  'T2RXXXXG6S', 'T2RXXXXG7S', 'T2RXXXXG8S',
  'T2RXXXXG9S', 'T2RXXXXG10S',
  'T2RXXXXG11',
  'T2RXXXXG12',
  'D2_POSITION', 'D2_PERSON', 'D2_PHONE'
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
    .selectById(params.empRespID2)
  const personPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID.name'])
    .where('employeeNumberID', '=', params.empRespID2)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()

  DECLARBODY.D2_PERSON = person['employeeID.shortFIO']
  DECLARBODY.D2_POSITION = personPos ? personPos['dictPositionID.name'] : ''
  DECLARBODY.D2_PHONE = person['employeeID.phoneWorking'] || person['employeeID.phoneMobile']

  data.T2RG12 = 1

  const sicknessRequisData = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'employeeNumberID', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName',
      'employeeNumberID.employeeID.middleName', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'seria', 'number', 'paySum', 'orderID'
    ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '38')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .selectAsObject({
      'employeeNumberID': 'employeeNumberID',
      'employeeNumberID.employeeID.lastName': 'T2RXXXXG2S',
      'employeeNumberID.employeeID.firstName': 'T2RXXXXG3S',
      'employeeNumberID.employeeID.middleName': 'T2RXXXXG4S',
      'employeeNumberID.employeeID.taxCode': 'T2RXXXXG5S',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',

      'seria': 'T2RXXXXG9S',
      'number': 'T2RXXXXG10S',

      'paySum': 'T2RXXXXG11',
      'orderID': 'orderID'
    })

  if (sicknessRequisData.length === 0) {
    return
  }

  let orders = sicknessRequisData.map(item => item.orderID)

  const docRegFuneral = UB.Repository('hr_docRegFuneral')
    .attrs(['ID', 'employeeNumberID',
      'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeFamilyID.peopleID.lastName', 'employeeFamilyID.peopleID.firstName', 'employeeFamilyID.peopleID.middleName', 'employeeFuneralID.workPlace'])
    .where('ID', 'in', orders)
    .selectAsObject()

  sicknessRequisData.forEach(srRow => {
    let empData = docRegFuneral.find(el => el.ID === srRow.orderID)
    srRow.T2RXXXXG6S = empData ? (empData['employeeFuneralID.workPlace'] !== '4' ? empData['employeeFamilyID.peopleID.lastName'] : empData['employeeNumberID.employeeID.lastName']) : null
    srRow.T2RXXXXG7S = empData ? (empData['employeeFuneralID.workPlace'] !== '4' ? empData['employeeFamilyID.peopleID.firstName'] : empData['employeeNumberID.employeeID.firstName']) : null
    srRow.T2RXXXXG8S = empData ? (empData['employeeFuneralID.workPlace'] !== '4' ? empData['employeeFamilyID.peopleID.middleName'] : empData['employeeNumberID.employeeID.middleName']) : null
    srRow.T2RXXXXG5S = `${srRow.empTaxCodeType === 'PASSPORT' ? 'БК' : (srRow.empTaxCodeType === 'IDCARD' ? 'П' : '')}${srRow.T2RXXXXG5S}`
  })

  sicknessRequisData.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T2RXXXXG1', rownum, rownum)
    updateCellInArray(data, 'T2RXXXXG2S', rownum, row['T2RXXXXG2S'])
    updateCellInArray(data, 'T2RXXXXG3S', rownum, row['T2RXXXXG3S'])
    updateCellInArray(data, 'T2RXXXXG4S', rownum, row['T2RXXXXG4S'])
    updateCellInArray(data, 'T2RXXXXG5S', rownum, row['T2RXXXXG5S'])

    updateCellInArray(data, 'T2RXXXXG6S', rownum, row['T2RXXXXG6S'])
    updateCellInArray(data, 'T2RXXXXG7S', rownum, row['T2RXXXXG7S'])
    updateCellInArray(data, 'T2RXXXXG8S', rownum, row['T2RXXXXG8S'])

    updateCellInArray(data, 'T2RXXXXG9S', rownum, row['T2RXXXXG9S'])
    updateCellInArray(data, 'T2RXXXXG10S', rownum, row['T2RXXXXG10S'])
    updateCellInArray(data, 'T2RXXXXG11', rownum, row['T2RXXXXG11'])

    updateCellInArray(data, 'T2RXXXXG12', rownum, data.T2RG12)
  })
}

const cellFormats = [
  {
    names: [ 'T2RXXXXG2S', 'T2RXXXXG3S', 'T2RXXXXG4S', 'T2RXXXXG5S',
      'T2RXXXXG6S', 'T2RXXXXG7S', 'T2RXXXXG8S',
      'T2RXXXXG9S', 'T2RXXXXG10S',
      'D2_POSITION', 'D2_PERSON', 'D2_PHONE' ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['T2RXXXXG1', 'T2RXXXXG12'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T2RXXXXG11'],
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
  let isExport = true
  if (data.data.DECLAR.DECLARBODY.T2RXXXXG2S && data.data.DECLAR.DECLARBODY.T2RXXXXG2S.length === 1 &&
    data.data.DECLAR.DECLARBODY.T2RXXXXG2S[0]._ === '') {
    isExport = false
  }
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.data.DECLAR.DECLARHEAD, attrList: allHeadAttrNames }),
      DECLARBODY: isExport ? createDeclarExt({ declar: data.data.DECLAR.DECLARBODY, attrListExt }) : {}
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
  params.T2 = `<tr><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px;" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T2" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;">{{#rowNumberSpan}}DECLAR.DECLARBODY.T2RXXXXG1##ROWNUM{{{}}}{{/rowNumberSpan}}</td>   
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG2S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG3S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG4S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG5S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG6S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG7S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG8S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG9S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T2RXXXXG10S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T2RXXXXG11##ROWNUM{{{}}}{{/currencyInput}}</td>   
      <td>{{#defIntInput}}DECLAR.DECLARBODY.T2RXXXXG12##ROWNUM##{"valuePath": "T2RG12"}{{{}}}{{/defIntInput}}</td></tr>`
  params.T2BtnAddRow = `<tr style="height: 16px;" class="no-print"><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px; height: 18px;"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T2" style="height: 20px;">+</button></td><td colspan="11"></td></tr>`
}
