const UB = require('@unitybase/ub')
const _ = require('lodash')
const { setDataProps, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, updateCellInArray } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')

module.exports = {
  generateData,
  exportConfig: ['json'],
  jsonExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = prepareStructureReport()
  const { DECLARBODY, DECLARHEAD } = data.DECLAR
  addTempleteForCustomRow(data.DECLAR.PARAMS)
  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setHeadData({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setBodyData({ data, params })
  return { data, errorMessages }
}

const allBodyAttrNames = [ 'ORD', 'DEP', 'FILE_NAME',
  'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER', 'ADDRESS',
  'PHONE', 'CAPTION', 'ACCOUNT', 'MFO',
  'D1_POSITION', 'D1_PERSON', 'D1_PHONE',
  'T1WIC_NUM', 'T1WIC_NUMBER_ALL', 'T1WIC_NUMBER_PFU', 'T1WIC_SUMM_ALL', 'T1WIC_SUMM_PFU', 'T1WIC_NUMBER_CHAES',
  'T1WIC_SUMM_CHAES', 'T1WIC_CH_NUM', 'T1WIC_MSEK_DT', 'T1WIC_BENIFIT', 'T1WIC_CAUSE', 'T1WIC_CAUSE_ADD', 'T1WIC_NUMBER_ALL_SUM',
  'T1WIC_NUMBER_PFU_SUM', 'T1WIC_SUMM_ALL_SUM', 'T1WIC_SUMM_PFU_SUM', 'T1WIC_NUMBER_CHAES_SUM', 'T1WIC_SUMM_CHAES_SUM'
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
    'xsi:noNamespaceSchemaLocation': 'H0401001.xsd'
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
  DECLARBODY.ORG = nameOrg && nameOrg['fullName'] ? nameOrg['fullName'] : ''
  DECLARBODY.DEP = ''
  DECLARBODY.FILE_NAME = `Заявка ПФ №.json`
  DECLARBODY.DATE_FORMATION = dateService.formatDate(params.dateFill, 'ddmmyyyy')
  const sicknessRequis = UB.Repository('hr_sicknessRequis')
    .attrs(['departmentID', 'includeSubDep', 'periodID.dateTo', 'orderNumber'])
    .selectById(params.sicknessRequisID)
  if (sicknessRequis) {
    DECLARBODY.FILE_NAME = `Заявка ПФ №${sicknessRequis.orderNumber}${sicknessRequis.orderNumber}.json`
  }

  if (sicknessRequis.departmentID) {
    const department = UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', sicknessRequis.departmentID)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', sicknessRequis['periodID.dateTo'])
      .misc({ __mip_recordhistory_all: true })
      .orderByDesc('mi_dateTo')
      .limit(1)
      .selectSingle()
    DECLARBODY.DEP = `${department ? department.name : ''}${sicknessRequis.includeSubDep ? ' (з підлеглими)' : ''}`
  }
  if (sicknessRequis) {
    DECLARBODY.FILE_NAME = `Заявка ПФ №${sicknessRequis.orderNumber}${DECLARBODY.DATE_FORMATION}.json`
  }
  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO']).selectById(params.buhID)

  DECLARBODY.CHIEF = bos['employeeID.shortFIO']
  DECLARBODY.BOOKKEEPER = buh['employeeID.shortFIO']

  setResponPersonData(DECLARBODY, params, params.empRespID1, 'D1')

  const sicknessRequisDt = UB.Repository('hr_sicknessRequisDt')
    .attrs([ 'number', 'payDaysAll', 'payDays', 'paySumAll', 'paySum', 'payDaysChNPP', 'paySumChNPP', 'employeeDocID.docNumber',
      'msekDateTo', 'dictSicknessCauseID.code', 'employeeSickLimitID.dictSickLimitID.code', 'sicknessCauseText'])
    .where('sicknessRequisID', '=', params.sicknessRequisID)
    .selectAsObject()
  sicknessRequisDt.forEach((row, idx) => {
    const rownum = idx + 1
    updateCellInArray(data, 'T1WIC_NUM', rownum, row.number)
    updateCellInArray(data, 'T1WIC_NUMBER_ALL', rownum, row.payDaysAll)
    updateCellInArray(data, 'T1WIC_NUMBER_PFU', rownum, row.payDays)
    updateCellInArray(data, 'T1WIC_SUMM_ALL', rownum, row.paySumAll)
    updateCellInArray(data, 'T1WIC_SUMM_PFU', rownum, row.paySum)
    updateCellInArray(data, 'T1WIC_NUMBER_CHAES', rownum, row.payDaysChNPP)
    updateCellInArray(data, 'T1WIC_SUMM_CHAES', rownum, row.paySumChNPP)
    updateCellInArray(data, 'T1WIC_CH_NUM', rownum, row['employeeDocID.docNumber'])
    updateCellInArray(data, 'T1WIC_MSEK_DT', rownum, row['msekDateTo'] ? dateService.formatDate(row['msekDateTo'], 'ddmmyyyy') : null)
    updateCellInArray(data, 'T1WIC_BENIFIT', rownum, row['employeeSickLimitID.dictSickLimitID.code'] ? Number(row['employeeSickLimitID.dictSickLimitID.code']) : null)
    updateCellInArray(data, 'T1WIC_CAUSE', rownum, row['dictSicknessCauseID.code'] ? Number(row['dictSicknessCauseID.code']) : null)
    updateCellInArray(data, 'T1WIC_CAUSE_ADD', rownum, row.sicknessCauseText)
  })
}

const cellFormats = [
  {
    names: [ 'ORD', 'DEP', 'FILE_NAME', 'ADDRESS', 'PHONE', 'CAPTION', 'MFO', 'ACCOUNT', 'DATE_FORMATION', 'CHIEF', 'BOOKKEEPER',
      'D1_POSITION', 'D1_PERSON', 'D1_PHONE'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: [],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: [],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

function jsonExport ({ data }) {
  const attrNames = ['T1WIC_NUM', 'T1WIC_NUMBER_ALL', 'T1WIC_NUMBER_PFU', 'T1WIC_SUMM_ALL', 'T1WIC_SUMM_PFU',
    'T1WIC_NUMBER_CHAES', 'T1WIC_SUMM_CHAES', 'T1WIC_CH_NUM', 'T1WIC_MSEK_DT', 'T1WIC_BENIFIT', 'T1WIC_CAUSE', 'T1WIC_CAUSE_ADD'
  ]
  const format = {
    T1WIC_MSEK_DT: (str) => { return str ? `${str.substr(4, 4)}-${str.substr(2, 2)}-${str.substr(0, 2)}` : null }
  }
  const { DECLARBODY } = _.get(data, 'data.DECLAR', { })
  const jsonData = []

  if (DECLARBODY[attrNames[0]] && DECLARBODY[attrNames[0]].length) {
    DECLARBODY[attrNames[0]].forEach((row, idx) => {
      const newRow = {}
      attrNames.forEach(fullAttrName => {
        newRow[fullAttrName.substr(2)] = format[fullAttrName] ? format[fullAttrName](DECLARBODY[fullAttrName][idx]._ || null) : DECLARBODY[fullAttrName][idx]._ || null
      })
      jsonData.push(newRow)
    })
  }
  return { data: JSON.stringify(jsonData), fileName: DECLARBODY.FILE_NAME }
}

function setHeadData ({ data, params }) {
  const { DECLARHEAD } = data.DECLAR

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
  params.T1 = [
    `<tr><td class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td><span class="row_num">ROWNUM</span></td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1WIC_NUM##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1WIC_NUMBER_ALL##ROWNUM##{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1WIC_NUMBER_PFU##ROWNUM##{{{}}}{{/intSpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1WIC_SUMM_ALL##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1WIC_SUMM_PFU##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1WIC_NUMBER_CHAES##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1WIC_SUMM_CHAES##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1WIC_CH_NUM##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#dateSpanInput}}DECLAR.DECLARBODY.T1WIC_MSEK_DT##ROWNUM##{{{}}}{{/dateSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1WIC_BENIFIT##ROWNUM##{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1WIC_CAUSE##ROWNUM##{{{}}}{{/intSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1WIC_CAUSE_ADD##ROWNUM##{{{}}}{{/textSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td  class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" data-table="tableT1">+</button></td>
      <td colspan="2"> Всього </td>
      <td>{{#intInput}}DECLAR.DECLARBODY.WIC_NUMBER_ALL_SUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.WIC_NUMBER_PFU_SUM{{{}}}{{/intInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.WIC_SUMM_ALL_SUM{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.WIC_SUMM_PFU_SUM{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.WIC_NUMBER_CHAES_SUM{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.WIC_SUMM_CHAES_SUM{{{}}}{{/currencyInput}}</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      </tr>`
  ]
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
