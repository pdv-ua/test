const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')

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
  'HZM', 'HZY', 'HTIN', 'HTIN1', 'HNAME',

  'R0101G1', 'R0101G3', 'R0102G3', 'R01021G3', 'R01022G3', 'R0103G3', 'R01031G3', 'R01032G3', 'R0104G3', 'R01041G3', 'R01042G3', 'R0104G2S', 'R0105G3',
  'R01051G3', 'R01052G3', 'R0105G2S', 'R0106G3', 'R01061G3', 'R01062G3',
  'R0201G1', 'R0201G3', 'R0202G3', 'R02021G3', 'R02022G3', 'R0203G3', 'R02031G3', 'R02032G3', 'R0204G3', 'R02041G3', 'R02042G3', 'R0204G2S', 'R0205G3',
  'R02051G3', 'R02052G3', 'R0205G2S', 'R0206G3', 'R02061G3', 'R02062G3',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3040412.xsd'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(params.dateFrom)
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARBODY } = data.DECLAR

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']

  const esvDatas = UB.Repository('hr_accrualFund')
    .where('[periodCalcID.orgID]', '=', params.organizationID)
    .where('[periodCalcID.dateFrom]', '=', dateService.shiftDate(params.dateFrom))
    .where('[payFundID.payFundMethodID.code]', 'in', ['1', '2'])
    .where('[payFundID.code]', 'in', ['10', '11'])
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .attrs(['payFundID.code', 'sourceSum', 'paySum', 'baseSum', 'addMinSum', 'rate', 'employeeNumberID', 'employeeNumberID.employeeID'])
    .selectAsObject()

  DECLARBODY.R0201G1 = new Set(esvDatas.map(row => row['employeeNumberID.employeeID'])).size

  esvDatas.forEach(row => {
    DECLARBODY.R0201G3 += row.sourceSum
    DECLARBODY.R02021G3 += row.baseSum - row.addMinSum
    DECLARBODY.R02022G3 += row.addMinSum

    switch (row['rate']) {
      case 22:
        DECLARBODY.R02031G3 += row.paySum - Math.round(row.addMinSum * row.rate) / 100
        DECLARBODY.R02032G3 += Math.round(row.addMinSum * row.rate) / 100
        break
    }
  })
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'R0104G2S', 'R0105G2S', 'R0204G2S', 'R0205G2S', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['R0101G1', 'R0201G1'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    namesFn: attrName => /^R\d*X*G\d*/.test(attrName) && ['R0101G1', 'R0104G2S', 'R0105G2S', 'R0201G1', 'R0204G2S', 'R0205G2S'].indexOf(attrName) < 0,
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
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  const attrListExt = buildAttrsExt(allBodyAttrNames, cellFormats)
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
