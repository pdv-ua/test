const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const reportService = require('../../../../HR/modules/reportService')
const currencyService = require('../../../../AC/modules/dataServices/currencyService')

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
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  setMainData({ data, params })
  prepareQueryParams({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']

const allBodyAttrNames = [
  'FIRM_ADR', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_TELORG', 'FIRM_EMAIL', 'FIRM_FAX', 'VIK_EMAIL', 'VIK_TEL', 'STAFFING', 'STAFFING_PREVIOUS', 'PERIOD', 'DATE', 'STAFFING_ADDGRUARANT', 'STAFFING_QUOTA', 'STAFFING_PENSION', 'STAFFING_PLAN'
]
function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'S0301011.xsd'
  }
  data.DECLAR.DECLARHEAD.C_DOC_STAN = 1
  data.DECLAR.DECLARHEAD.C_DOC_TYPE = 0
  delete data.DECLAR.DECLARHEAD.C_STI_ORIG
  delete data.DECLAR.DECLARHEAD.LINKED_DOCS

  const excludeCell = Object.keys(data.DECLAR.DECLARBODY).filter(cName => cellNames.indexOf(cName) < 0)
  excludeCell.forEach(cName => {
    delete data.DECLAR.DECLARBODY[cName]
  })
  cellNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
}

function prepareQueryParams ({ data, params }) {
  params.dateFrom = dateService.firstDayOfYear(dateService.shiftDate(new Date(data.DECLAR.DECLARHEAD.PERIOD_YEAR, 0, 1, 0, 0, 0, 0)))
  params.dateTo = dateService.lastDayOfYear(params.dateFrom)
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })
  DECLARBODY.FIRM_NAME = orgInfo['fullName']
  DECLARBODY.FIRM_EDRPOU = orgInfo['OKPOCode']
  DECLARBODY.FIRM_ADR = orgInfo['address']
  DECLARBODY.FIRM_TELORG = orgInfo['phone'] || orgInfo['mobPhone']
  DECLARBODY.FIRM_EMAIL = orgInfo['email']
  DECLARBODY.FIRM_FAX = orgInfo['fax']

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  const dateFrom = dateService.shiftDate(params.dateFrom)
  const dateTo = dateService.shiftDate(params.dateTo)

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]
  organiozations.forEach((orgID) => {
    if (params.staffing <= 20) {
      DECLARBODY.STAFFING_QUOTA = 0
      DECLARBODY.STAFFING_ADDGRUARANT = 0
    }
    if (params.staffing > 20) {
      const resultPrevious = reportService.getAvgListEmpCount({
        orgID: orgID,
        dateFrom: dateService.addYears(dateFrom, -1),
        dateTo: dateService.addYears(dateTo, -1)
      })
      DECLARBODY.STAFFING_PREVIOUS = Math.round((DECLARBODY.STAFFING_PREVIOUS || 0) + resultPrevious.dayCount)
      const employeeNumbersAddGuarant = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID'])
        .where('organizationID', '=', orgID)
        .where('dateFrom', '<=', dateTo)
        .where('dateTo', '>=', dateFrom)
        .where('workPlace', '=', '1')
        .where('mtCount', '>=', '1')
        .exists(
          UB.Repository('hr_empAddGuarantees')
            .correlation('employeeID', 'employeeID')
            .where('addGuarant', 'notIn', ['0', '8'])
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateFrom)
            .where('mi_deleteDate', '>=', '#maxdate')
        )
        .selectAsObject().map(o => o.employeeNumberID)
      if (employeeNumbersAddGuarant.length) {
        const result = reportService.getAvgListEmpCount({
          orgID: orgID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          employeeNumbers: employeeNumbersAddGuarant,
          addGuarant: { exclude: ['0', '8'] }
        })
        /* let t = ''
        Object.keys(result.employeeNumbers).forEach(employeeNumberID => {
          const en = UB.Repository('hr_employeeNumber').attrs('description').selectById(Number(employeeNumberID))
          t += `${en.description}  - ${result.employeeNumbers[employeeNumberID].addGuarantCount} ` +'\r\n'
        }) */

        DECLARBODY.STAFFING_ADDGRUARANT = currencyService.gaussRound(DECLARBODY.STAFFING_ADDGRUARANT + result.addGuarantCount)
      }
      DECLARBODY.STAFFING_QUOTA = Math.round((DECLARBODY.STAFFING_PREVIOUS || 0) * 0.05)
    }
    if (params.staffing > 20 || params.staffing < 8) {
      DECLARBODY.STAFFING = 0
      DECLARBODY.STAFFING_PENSION = 0
    }
    if (params.staffing >= 8 && params.staffing <= 20) {
      const resultStaffing = reportService.getAvgListEmpCount({
        orgID: orgID,
        dateFrom: dateFrom,
        dateTo: dateTo
      })
      DECLARBODY.STAFFING = Math.round((DECLARBODY.STAFFING || 0) + resultStaffing.dayCount)
      const employeeNumbersPension = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID'])
        .where('organizationID', '=', orgID)
        .where('dateFrom', '<=', dateTo)
        .where('dateTo', '>=', dateFrom)
        .where('workPlace', '=', '1')
        .exists(
          UB.Repository('hr_empAddGuarantees')
            .correlation('employeeID', 'employeeID')
            .where('addGuarant', '=', '7')
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateFrom)
            .where('mi_deleteDate', '>=', '#maxdate')
        )
        .selectAsObject().map(o => o.employeeNumberID)
      if (employeeNumbersPension.length) {
        const resultPension = reportService.getAvgListEmpCount({
          orgID: orgID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          employeeNumbers: employeeNumbersPension,
          addGuarant: { include: ['7'] }
        })
        DECLARBODY.STAFFING_PENSION = Math.round((DECLARBODY.STAFFING_PENSION || 0) + resultPension.addGuarantCount)
      }
    }
  })
  DECLARBODY.PERIOD = params.yearOfCurrentPeriod
  DECLARBODY.DATE = dateService.formatDate(params.HFILL)
  DECLARBODY.STAFFING_PLAN = 0
}

// non std xml file name
function generateFileName (params) {
  return [
    zeroFill(params.C_REG, 2),
    zeroFill(params.C_RAJ, 3),
    zeroFill(params.TIN, 10),
    zeroFill(params.C_DOC, 3),
    zeroFill(params.C_DOC_SUB, 3),
    zeroFill(params.C_DOC_VER, 2),
    '1',
    '00',
    zeroFill(params.C_DOC_CNT, 5),
    zeroFill(params.PERIOD_MONTH, 2),
    zeroFill(params.PERIOD_YEAR, 4)
  ].join('')
}

function zeroFill (number = 0, width) {
  if (typeof number === 'object') {
    number = 0
  }
  return ('0000000000' + number).slice(-width)
}

const cellFormats = [
  {
    names: ['FIRM_ADR', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_TELORG', 'FIRM_EMAIL', 'FIRM_FAX', 'PERIOD', 'VIK_EMAIL', 'VIK_TEL' ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['DATE'],
    format: {
      type: 'date',
      nillable: true
    }
  },
  {
    names: ['STAFFING', 'STAFFING_PREVIOUS', 'STAFFING_ADDGRUARANT', 'STAFFING_QUOTA', 'STAFFING_PENSION', 'STAFFING_PLAN'],
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
