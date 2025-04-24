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
  'T1RXXXXG1', 'T1RXXXXG2S', 'T1RXXXXG3S', 'T1RXXXXG4S', 'T1RXXXXG5S', 'T1RXXXXG6', 'T1RXXXXG7S', 'T1RXXXXG8S', 'T1RXXXXG9', 'T1RXXXXG10',
  'T1RXXXXG11D', 'T1RXXXXG12D', 'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG16',
  'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19S', 'T1RXXXXG20D', 'T1RXXXXG21', 'T1RXXXXG22',
  'D1_POSITION', 'D1_PERSON', 'D1_PHONE'
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
    .selectById(params.empRespID1)
  const personPos = UB.Repository('hr_employeePositionS')
    .attrs(['dictPositionID.name'])
    .where('employeeNumberID', '=', params.empRespID1)
    .where('dateTo', '>=', params.dateFill)
    .where('dateFrom', '<=', params.dateFill)
    .where('isActive', '=', 1)
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()

  DECLARBODY.D1_PERSON = person['employeeID.shortFIO']
  DECLARBODY.D1_POSITION = personPos ? personPos['dictPositionID.name'] : ''
  DECLARBODY.D1_PHONE = person['employeeID.phoneWorking'] || person['employeeID.phoneMobile']

  const sicknessRequisData = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'employeeNumberID', 'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'seria', 'number', 'payDaysAll', 'payDays', 'paySumAll', 'paySum', 'payDaysChNPP', 'paySumChNPP',
      'orderID', 'employeeNumberID.employeeID'
    ])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .where('payElID.methodID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.methodID.code', '=', '18', 'ispayElID18')
    .where('payElID.methodID.code', '=', '19', 'ispayElID19')
    .where('payElID.methodID.code', '=', '20', 'ispayElID20')
    .where('payElID.methodID.code', '=', '149', 'ispayElID149')
    .logic('([ispayElID18] OR [ispayElID19] OR [ispayElID20] OR [ispayElID149])')
    .orderBy('employeeNumberID.employeeID.lastName')
    .orderBy('employeeNumberID.employeeID.firstName')
    .orderBy('employeeNumberID.employeeID.middleName')
    .orderBy('employeeNumberID.workPlaceCode')
    .orderBy('sicknessRequisID.periodID.dateFrom')
    .selectAsObject({
      'employeeNumberID': 'employeeNumberID',
      'employeeNumberID.employeeID': 'employeeID',
      'employeeNumberID.employeeID.lastName': 'T1RXXXXG2S',
      'employeeNumberID.employeeID.firstName': 'T1RXXXXG3S',
      'employeeNumberID.employeeID.middleName': 'T1RXXXXG4S',
      'employeeNumberID.employeeID.taxCode': 'T1RXXXXG5S',
      'employeeNumberID.employeeID.empTaxCodeType': 'empTaxCodeType',
      'seria': 'T1RXXXXG7S',
      'number': 'T1RXXXXG8S',
      'payDaysAll': 'T1RXXXXG13',
      'payDays': 'T1RXXXXG14',
      'paySumAll': 'T1RXXXXG15',
      'paySum': 'T1RXXXXG16',
      'payDaysChNPP': 'T1RXXXXG17',
      'paySumChNPP': 'T1RXXXXG18'
    })

  if (sicknessRequisData.length > 0) {
    let orders = sicknessRequisData.map(item => item.orderID).filter(Boolean)

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
      if (!empPos) {
        empPos = UB.Repository('hr_employeePositionS')
          .attrs(['workerType', 'ID', 'employeeNumberID', 'workPlace'])
          .where('organizationID', '=', params.organizationID)
          .where('employeeNumberID', '=', srRow.employeeNumberID)
          .orderBy('dateTo', 'desc')
          .limit(1)
          .selectSingle()
      }
      srRow.T1RXXXXG6 = empPos ? (empPos['workPlace'] === '1' ? '1'
        : ['2', '3'].includes(empPos['workPlace']) ? '2' : '4') : ''
      // srRow.T1RXXXXG6 = empPos ? (['1', '2'].includes(empPos['workerType']) ? (empPos['workPlace'] === '3' ? '2' : '1') : (empPos['workerType'] === '3' ? '2' : '4')) : null
      srRow.T1RXXXXG5S = `${srRow.empTaxCodeType === 'PASSPORT' ? 'БК' : (srRow.empTaxCodeType === 'IDCARD' ? 'П' : '')}${srRow.T1RXXXXG5S}`
    })

    let empOrderSickness = []
    if (orders && orders.length > 0) {
      empOrderSickness = UB.Repository('hr_docRegSickness')
        .attrs([ 'ID', 'employeeNumberID', 'parentSicknessID', 'parentAccrualID', 'dictIllnessReasonID.code', 'dateFrom', 'dateTo',
          'msekDateFrom', 'standingAll', 'standingYearMonth',
          'employeeSickLimitID'
        ])
        .where('ID', 'in', orders)
        .where('mi_deleteDate', '>=', '#maxdate')
        .orderBy('dateFrom')
        .selectAsObject()
    }

    sicknessRequisData.forEach(srRow => {
      let empOrder = empOrderSickness.find(el => el.ID === srRow.orderID)
      srRow.T1RXXXXG9 = empOrder ? empOrder['parentSicknessID'] || empOrder['parentAccrualID'] : null
      srRow.T1RXXXXG10 = empOrder ? empOrder['dictIllnessReasonID.code'] : null
      srRow.T1RXXXXG11D = empOrder ? moment(empOrder['dateFrom']).format('DDMMYYYY') : null
      srRow.T1RXXXXG12D = empOrder ? moment(empOrder['dateTo']).format('DDMMYYYY') : null
      srRow.T1RXXXXG20D = empOrder ? moment(empOrder['msekDateFrom']).format('DDMMYYYY') : null
      srRow.T1RXXXXG21 = empOrder ? empOrder['standingAll'] : null
      srRow.T1RXXXXG22 = empOrder ? empOrder['standingYearMonth'] : null
    })

    const empSickLimit = UB.Repository('hr_employeeSickLimit')
      .attrs([ 'ID', 'employeeID', 'docNumber' ])
      .where('typeSickLimit', 'in', ['2', '3', '4'])
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    sicknessRequisData.forEach(srRow => {
      let sickLimit = empSickLimit.find(el => el.employeeID === srRow.employeeID)
      srRow.T1RXXXXG19S = sickLimit ? sickLimit['docNumber'] : null
    })
  }

  sicknessRequisData.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }
    updateCellInArray(data, 'T1RXXXXG1', rownum, rownum)
    updateCellInArray(data, 'T1RXXXXG2S', rownum, row['T1RXXXXG2S'])
    updateCellInArray(data, 'T1RXXXXG3S', rownum, row['T1RXXXXG3S'])
    updateCellInArray(data, 'T1RXXXXG4S', rownum, row['T1RXXXXG4S'])
    updateCellInArray(data, 'T1RXXXXG5S', rownum, row['T1RXXXXG5S'])

    updateCellInArray(data, 'T1RXXXXG6', rownum, row['T1RXXXXG6'])

    updateCellInArray(data, 'T1RXXXXG7S', rownum, row['T1RXXXXG7S'])
    updateCellInArray(data, 'T1RXXXXG8S', rownum, row['T1RXXXXG8S'])

    updateCellInArray(data, 'T1RXXXXG9', rownum, row['T1RXXXXG9'] ? 2 : 1)
    updateCellInArray(data, 'T1RXXXXG10', rownum, row['T1RXXXXG10'])
    updateCellInArray(data, 'T1RXXXXG11D', rownum, row['T1RXXXXG11D'])
    updateCellInArray(data, 'T1RXXXXG12D', rownum, row['T1RXXXXG12D'])
    updateCellInArray(data, 'T1RXXXXG13', rownum, row['T1RXXXXG13'])
    updateCellInArray(data, 'T1RXXXXG14', rownum, row['T1RXXXXG14'])
    updateCellInArray(data, 'T1RXXXXG15', rownum, row['T1RXXXXG15'])
    updateCellInArray(data, 'T1RXXXXG16', rownum, row['T1RXXXXG16'])
    updateCellInArray(data, 'T1RXXXXG17', rownum, row['T1RXXXXG17'])
    updateCellInArray(data, 'T1RXXXXG18', rownum, row['T1RXXXXG18'])

    updateCellInArray(data, 'T1RXXXXG19S', rownum, row['T1RXXXXG19S'])

    updateCellInArray(data, 'T1RXXXXG20D', rownum, row['T1RXXXXG20D'])
    updateCellInArray(data, 'T1RXXXXG21', rownum, row['T1RXXXXG21'])
    updateCellInArray(data, 'T1RXXXXG22', rownum, row['T1RXXXXG22'])
  })
}

const cellFormats = [
  {
    names: [ 'T1RXXXXG2S', 'T1RXXXXG3S', 'T1RXXXXG4S', 'T1RXXXXG5S',
      'T1RXXXXG7S', 'T1RXXXXG8S',
      'T1RXXXXG11D', 'T1RXXXXG12D', 'T1RXXXXG20D',
      'T1RXXXXG19S',
      'D1_POSITION', 'D1_PERSON', 'D1_PHONE' ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['T1RXXXXG1', 'T1RXXXXG6', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG17',
      'T1RXXXXG21', 'T1RXXXXG22'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG18'],
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
  params.T1 = `<tr><td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px;" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;">{{#rowNumberSpan}}DECLAR.DECLARBODY.T1RXXXXG1##ROWNUM{{{}}}{{/rowNumberSpan}}</td>   
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG2S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG3S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG4S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG5S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG7S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG8S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG11D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG12D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG14##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG15##ROWNUM{{{}}}{{/currencyInput}}</td> 
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG18##ROWNUM{{{}}}{{/currencyInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG19S##ROWNUM{{{}}}{{/textInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG20D##ROWNUM{{{}}}{{/dateInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG21##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG22##ROWNUM{{{}}}{{/intInput}}</td></tr>`
  params.T1BtnAddRow = `
    <tr style="height: 16px;" class="no-print">
      <td style="padding: 3px 5px 0 0; text-align: center; border-width: 0px; height: 18px;">
        <button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button>
      </td>
      <td colspan="22"></td>
    </tr>
  `
}
