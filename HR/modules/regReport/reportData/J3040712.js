const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const experienceService = require('../../../modules/experienceService')
const periodService = require('../../../../HR/modules/periodService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData (params = {}) {
  const errorMessages = []
  const data = structureReport()
  prepareStructureReport(data)
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })

  prepareQueryParams({ data, params })

  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HTIN', 'HTIN1', 'HNAME', 'HZM', 'HZY', 'HZB', 'HZS', 'HZD',

  'T1RXXXXG6', 'T1RXXXXG7S', 'T1RXXXXG8S', 'T1RXXXXG91S', 'T1RXXXXG92S', 'T1RXXXXG93S', 'T1RXXXXG10', 'T1RXXXXG11', 'T1RXXXXG12', 'T1RXXXXG131',
  'T1RXXXXG132', 'T1RXXXXG141', 'T1RXXXXG142', 'T1RXXXXG143', 'T1RXXXXG15S', 'T1RXXXXG16D', 'T1RXXXXG17',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3040712.xsd'
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

  DECLARBODY.HZB = params.FORM_TYPE === 'HZB'
  DECLARBODY.HZS = params.FORM_TYPE === 'HZS'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']

  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
  const period = periodService.getPeriodOnDate(params.organizationID, params.dateFrom)
  const expDatas = UB.Repository('hr_employeeExperience')
    .where('[employeeID]', 'in',
      UB.Repository('hr_employeeNumberS')
        .where('[orgID]', '=', params.organizationID)
        .where('[dateFrom]', '<=', params.dateTo)
        .where('[dateTo]', '>=', params.dateFrom)
        .where('[mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
        .attrs(['employeeID'])
    ).where('[dictExperienceID.experienceSpecID]', 'isNotNull')
    .where('COALESCE([startCalcDate], \'9999-12-31T00:00:00\')', '>=', params.dateFrom)
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate', 'delDate')
    .where('[employeeNumberID.dateFrom]', '<', params.dateTo, 'ndf')
    .where('[employeeNumberID.dateTo]', '>=', params.dateFrom, 'ndt')
    .where('[employeeNumberID]', 'isNull', undefined, 'nnull')
    .logic('(([ndf] and [ndt] and [delDate]) or [nnull])')
    .attrs(['employeeID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode',
      'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'dictExperienceID.experienceSpecID.code',
      'dictExperienceID.experienceUnits', 'calcDate', 'startCalcDate', 'dictExperienceID.orderNumber',
      'dictExperienceID.orderDate', 'dictExperienceID', 'employeeNumberID'])
    .orderBy('employeeID.lastName')
    .orderBy('employeeID.firstName')
    .orderBy('employeeID.middleName')
    .selectAsObject()
  // to make a call to experienceService.calculateExperience in case we have hr_employeeExperience filled we need any employeeNumberID for employeeID
  const empNumIDs = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'workPlace', 'employeeID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
    .where('[employeeID]', 'in', expDatas.map(expData => expData.employeeID))
    .where('[dateFrom]', '<', params.dateTo)
    .where('[dateTo]', '>=', params.dateFrom)
    .where('[organizationID]', '=', params.organizationID)
    .orderBy('workPlace')
    .orderByDesc('dateTo')
    .selectAsObject()

  const accrualFunds = UB.Repository('hr_accrualFund')
    .attrs(['employeeNumberID'])
    .where('periodCalcID', '=', period.ID)
    .where('employeeNumberID', 'in', empNumIDs.length ? empNumIDs.map(o => o.employeeNumberID) : [0])
    .selectAsObject()

  expDatas.forEach(row => {
    const emp = empNumIDs.find(o => o.employeeID === row.employeeID && (!row.employeeNumberID || row.employeeNumberID === o.employeeNumberID))
    row.workPlace = emp ? emp.workPlace : '1'
    if (!row.employeeNumberID) {
      row.employeeNumberID = emp ? emp.employeeNumberID : null
    }
    if (emp) {
      row['employeeNumberID.dateFrom'] = dateService.shiftDate(emp['employeeNumberID.dateFrom'])
      row['employeeNumberID.dateTo'] = dateService.shiftDate(emp['employeeNumberID.dateTo'])
    }
  })
  for (let i = expDatas.length - 1; i >= 0; i--) {
    if (!accrualFunds.find(o => o.employeeNumberID === expDatas[i].employeeNumberID)) {
      expDatas.splice(i, 1)
    } else if (expDatas[i].workPlace !== '1') {
      const idx = expDatas.findIndex(o => o.employeeID === expDatas[i].employeeID && o.dictExperienceID === expDatas[i].dictExperienceID && o.workPlace === '1')
      if (idx >= 0) {
        expDatas.splice(i, 1)
      }
    }
  }
  const resultData = []
  expDatas.forEach(row => {
    let startDate = dateService.shiftDate(row['calcDate'])
    let perDateFrom = dateService.shiftDate(Math.max(params.dateFrom, (row['employeeNumberID.dateFrom'] || params.dateFrom)))
    let perDateTo = dateService.shiftDate(Math.min(params.dateTo, (row['employeeNumberID.dateTo'] || params.dateTo)))
    if (!startDate || startDate < perDateFrom) {
      startDate = perDateFrom
    }
    row.startDate = dateService.unshiftDate(startDate)

    let stopDate = dateService.shiftDate(row['startCalcDate'])
    if (!stopDate || stopDate > perDateTo) {
      stopDate = perDateTo
    }
    row.stopDate = dateService.unshiftDate(stopDate)
    const seniorityFactObj = experienceService.calculateExperience(row.employeeNumberID, row['dictExperienceID'], row.stopDate, row.startDate, false)
    const seniorityNormObj = experienceService.calculateExperience(row.employeeNumberID, row['dictExperienceID'], params.dateTo, row.startDate, true)
    row.seniorityFact = (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? seniorityFactObj.totalDays : 0
    row.seniorityNorm = (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? seniorityNormObj.totalDays : 0

    if (((row.seniorityFact > 0) || (row.seniorityNorm > 0)) &&
      !resultData.find(o => o.employeeID === row.employeeID &&
        o['dictExperienceID.experienceSpecID.code'] === row['dictExperienceID.experienceSpecID.code'])) {
      resultData.push(row)
    }
  })

  resultData.forEach((row, idx) => {
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }

    updateCellInArray(data, 'T1RXXXXG6', rownum, (row['employeeID.citizenshipID.code'] === 'UKR') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG7S', rownum, `${row['employeeID.empTaxCodeType'] === 'PASSPORT' ? 'БК' : (row['employeeID.empTaxCodeType'] === 'IDCARD' ? 'П' : '')}${row['employeeID.taxCode']}`)
    updateCellInArray(data, 'T1RXXXXG8S', rownum, row['dictExperienceID.experienceSpecID.code'])
    updateCellInArray(data, 'T1RXXXXG91S', rownum, row['employeeID.lastName'])
    updateCellInArray(data, 'T1RXXXXG92S', rownum, row['employeeID.firstName'])
    updateCellInArray(data, 'T1RXXXXG93S', rownum, row['employeeID.middleName'])
    updateCellInArray(data, 'T1RXXXXG10', rownum, row.startDate && row.startDate.getDate())
    updateCellInArray(data, 'T1RXXXXG11', rownum, row.stopDate && row.stopDate.getDate())

    updateCellInArray(data, 'T1RXXXXG12', rownum, (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? row.seniorityFact : null)
    updateCellInArray(data, 'T1RXXXXG131', rownum, (row['dictExperienceID.experienceUnits'] === 'hourWork') ? row.seniorityFact : null)
    updateCellInArray(data, 'T1RXXXXG132', rownum, (row['dictExperienceID.experienceUnits'] === 'minuteWork') ? row.seniorityFact : null)
    updateCellInArray(data, 'T1RXXXXG141', rownum, (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? row.seniorityNorm : null)
    updateCellInArray(data, 'T1RXXXXG142', rownum, (row['dictExperienceID.experienceUnits'] === 'hourWork') ? row.seniorityNorm : null)
    updateCellInArray(data, 'T1RXXXXG143', rownum, (row['dictExperienceID.experienceUnits'] === 'minuteWork') ? row.seniorityNorm : null)

    updateCellInArray(data, 'T1RXXXXG15S', rownum, row['orderNumber'])
    updateCellInArray(data, 'T1RXXXXG16D', rownum, (row['orderDate']) ? moment(row['orderDate']).format('DDMMYYYY') : null)
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
    names: ['HTIN1', 'T1RXXXXG7S', 'T1RXXXXG8S', 'T1RXXXXG91S', 'T1RXXXXG92S', 'T1RXXXXG93S', 'T1RXXXXG15S', 'T1RXXXXG16D', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'HZB', 'HZS', 'HZD'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG6', 'T1RXXXXG10', 'T1RXXXXG11', 'T1RXXXXG12', 'T1RXXXXG131', 'T1RXXXXG132', 'T1RXXXXG141', 'T1RXXXXG142', 'T1RXXXXG143', 'T1RXXXXG17'],
    format: {
      type: 'number',
      nillable: true,
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
  const formTypeElementName = DECLARBODY.HZS === 1 || DECLARBODY.HZS === 'true' ? 'HZS' : DECLARBODY.HZD === 1 || DECLARBODY.HZD === 'true' ? 'HZD' : 'HZB'
  const attrList = allBodyAttrNames.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
  attrList.splice(5, 0, formTypeElementName)
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

function addTempleteForCustomRow (params) {
  params.T1 = [`<tr><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px;" rowspan="2" class="no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;" rowspan="2"><span class="row_num">ROWNUM</span></td>
      <td rowspan="2">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intInput}}</td>
      <td colspan="3">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG7S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td colspan="3">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG8S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG12##ROWNUM{{{}}}{{/intInput}}</td>
      <td style="border-right: none">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG131##ROWNUM{{{}}}{{/intInput}}:</td>
      <td style="border-left: none">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG132##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG15S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td rowspan="2">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/intInput}}</td>
    </tr>`,
  `<tr><td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG91S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG92S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td colspan="2">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG93S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG11##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG141##ROWNUM{{{}}}{{/intInput}}</td>
      <td style="border-right: none">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG142##ROWNUM{{{}}}{{/intInput}}:</td>
      <td style="border-left: none">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG143##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG16D##ROWNUM{{{}}}{{/dateInput}}</td>
    </tr>`
  ]
  params.T1BtnAddRow = [`
    <tr class="no-print">
      <td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px; height: 18px;" class="no-print">
        <button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button>
      </td>
      <td colspan="14">&nbsp;</td>
    </tr>
  `]
}
