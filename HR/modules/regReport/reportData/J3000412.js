const UB = require('@unitybase/ub')
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')

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
  'HZM', 'HZY', 'HZB', 'HZS', 'HZD', 'HTIN', 'HTIN1', 'HNAME', 'HLOC', 'HTEL', 'HKSTI',

  'R001G3', 'R002G3', 'R003G3', 'R004G3', 'R005G3', 'R006G3', 'R007G3', 'R008G3', 'R009G3',

  'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3000412.xsd'
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
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARBODY } = data.DECLAR

  DECLARBODY.HZB = params.FORM_TYPE === 'HZB'
  DECLARBODY.HZS = params.FORM_TYPE === 'HZS'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'
  DECLARBODY.R001G3 = true
  DECLARBODY.R002G3 = false
  DECLARBODY.R003G3 = false
  DECLARBODY.R004G3 = true
  DECLARBODY.R005G3 = true
  DECLARBODY.R006G3 = true
  DECLARBODY.R007G3 = true
  DECLARBODY.R008G3 = false
  DECLARBODY.R009G3 = false

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos ? bos['employeeID.taxCode'] : null
  DECLARBODY.HBOS = bos ? bos['employeeID.shortFIO'] : null

  DECLARBODY.HKBUH = buh ? buh['employeeID.taxCode'] : null
  DECLARBODY.HBUH = buh ? buh['employeeID.shortFIO'] : null
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HLOC', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'HTEL', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'HZB', 'HZS', 'HZD', 'HKSTI', 'R001G3', 'R002G3', 'R003G3', 'R004G3', 'R005G3', 'R006G3', 'R007G3', 'R008G3', 'R009G3'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  }
]

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  const formTypeElementName = DECLARBODY.HZS === '1' || DECLARBODY.HZS === 'true' ? 'HZS' : DECLARBODY.HZD === '1' || DECLARBODY.HZD === 'true' ? 'HZD' : 'HZB'

  const attrList = allBodyAttrNames.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
  attrList.splice(2, 0, formTypeElementName)
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
