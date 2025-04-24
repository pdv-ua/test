const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, updateCellInArray } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const reportService = require('../../../../HR/modules/reportService')
const accrualService = require('../../../../HR/modules/accrualService')
const settingsService = require('../../../../AC/modules/entityServices/settingsService')

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
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  setMainData({ data, params })
  prepareQueryParams({ data, params })
  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']

const allBodyAttrNames = [
  'VIK', 'VIK_TEL', 'VIK_EMAIL'
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

  let paramDateFrom = dateService.shiftDate(params.dateFrom)
  // const period = periodService.getPeriodOnDate(params.organizationID, paramDateFrom)
  // add non std data for org

  const infoByAcc = UB.Repository('hr_payObligatory')
    .attrs(['orgAccountID.bankID.MFO', 'orgAccountID.bankID.name', 'orgAccountID.code'])
    .where(['organizationID'], '=', params.organizationID)
    .where(['type'], '=', '3')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.CAPTION = infoByAcc['orgAccountID.bankID.name']
  DECLARBODY.MFO = infoByAcc['orgAccountID.bankID.MFO']
  DECLARBODY.ACCOUNT = infoByAcc['orgAccountID.code']

  const respCode = UB.Repository('hr_organization')
    .attrs(['EDRPOUCode', 'hkoatuu', 'hkved', 'dgoznNpr', 'hkopfg'])
    .where('mi_data_id', '=', params.organizationID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.EDRPOU = respCode['EDRPOUCode']
  DECLARBODY.KOATUU = respCode['hkoatuu']
  DECLARBODY.KVED = respCode['hkved']
  DECLARBODY.ONPR = respCode['dgoznNpr']
  DECLARBODY.KOPFD = respCode['hkopfg']
  DECLARBODY.FFINANCE = 1

  const orgAddress = UB.Repository('ac_address')
    .attrs(['address'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address || DECLARBODY.FIRM_ADR
  DECLARBODY.KVED = DECLARBODY.HKVED
  DECLARBODY.SPATO = DECLARBODY.HKOATUU_S

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = DECLARBODY.MY_DATE = dateService.formatDate(dateService.addMonths(paramDateFrom, 1), 'd mmm')

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

  const staffWorkPlaceList = ['1']
  const reportParams = reportService.getReportParams(params.organizationID, [ 'notAvgQuantity', 'city10PI' ])
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

  organiozations.forEach((orgID, idx) => {
    const rownum = idx + 1
    const organization = UB.Repository('hr_organization')
      .attrs(['EDRPOUCode', 'name', 'FSZIAddress', 'fullName'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .limit(1)
      .selectSingle() || {}
    const orgAddress = UB.Repository('ac_address')
      .attrs(['address', 'postIndex'])
      .where('ownerID', '=', orgID)
      .where('addressType', '=', '1')
      .limit(1)
      .selectSingle() || {}
    const empPosData = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'workPlace', 'employeeNumberID.employeeID.sexType',
        'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID.employeeID.birthDate', 'workScheduleID'
      ])
      .where('[organizationID]', '=', orgID)
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[dateTo]', '>=', params.dateFrom)
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .orderBy('employeeNumberID')
      .orderBy('dateFrom')
      .selectAsObject({
        'employeeNumberID.employeeID.sexType': 'sexType',
        'employeeNumberID.employeeID.birthDate': 'birthDate'
      })

    /* const empDisability = UB.Repository('hr_employeeDisability')
      .attrs('ID', 'employeeID', 'dateFrom', 'dateTo')
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[dateTo]', '>=', params.dateFrom)
      .where('employeeID', 'in', empPosData.map(o => o.employeeID))
      .orderBy('dateFrom')
      .selectAsObject()
    empDisability.forEach(item => {
      item.dateFrom = dateService.shiftDate(item.dateFrom)
      item.dateTo = dateService.shiftDate(item.dateTo)
    }) */

    const empCityResident = reportParams.city10PIIDs.length ? UB.Repository('ac_address')
      .attrs('ownerID')
      .where('ownerID', 'in', empPosData.map(o => o.employeeID))
      .where('addressType', '=', '1')
      .where('cityID.cityTypeID', 'in', reportParams.city10PIIDs)
      .selectAsObject() : []

    // const empDisData = []
    const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
    empPosData.forEach(emp => {
      emp['dateFrom'] = dateService.shiftDate(emp['dateFrom'])
      emp['dateTo'] = dateService.shiftDate(emp['dateTo'])
      emp['employeeNumberID.dateFrom'] = dateService.shiftDate(emp['employeeNumberID.dateFrom'])
      emp['employeeNumberID.dateTo'] = dateService.shiftDate(emp['employeeNumberID.dateTo'])
      emp['birthDate'] = dateService.shiftDate(emp['birthDate'])
      emp.age = emp['birthDate'] ? dateService.getYmd(emp['birthDate'], params.dateTo, false).years : 0
      emp.isWoman = emp.sexType === 'W'
      emp.isMan = !emp.isWoman
      emp.isCity = !!empCityResident.find(o => o.ownerID === emp.employeeID)
      emp.dateFrom = dateService.shiftDate(Math.max(params.dateFrom, emp.dateFrom))
      if (emp.dateTo >= params.dateTo) {
        emp.dateTo = params.dateTo
      } else if (emp['dateTo'].getTime() === emp['employeeNumberID.dateTo'].getTime() && emp.workScheduleID) {
        const firstWorkDay = UB.Repository('tim_plan')
          .attrs(['dayDate'])
          .where('organizationID', '=', planByOrgID || orgID)
          .where('workScheduleID', '=', emp.workScheduleID)
          .where('dayDate', '>', emp['dateTo'])
          .where('dictTimeCostID.timeCostType', '=', 'WORK')
          .orderBy('dayDate')
          .limit(1)
          .selectSingle()
        if (firstWorkDay) {
          emp.dateTo = dateService.shiftDate(Math.min(params.dateTo, dateService.addDays(dateService.shiftDate(firstWorkDay.dayDate), -1)))
        }
      }
      /* const dis = empDisability.find(o => o.employeeID === emp.employeeID)
      if (dis) {
        empDisData.push(Object.assign({}, emp))
      } */
    })

    const allEmpIDs = empPosData.map(o => o.employeeNumberID)
    let B0101 = 0
    let B0201 = 0
    const year = params.dateFrom.getFullYear()
    let empData = { count: 0 }
    for (let month = 0; month < 12; month++) {
      const mDateFrom = dateService.shiftDate(new Date(year, month, 1, 0, 0, 0))
      const mDateTo = dateService.lastDayOfMonth(mDateFrom)
      empData = reportService.getEmpCount(orgID, allEmpIDs, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, staffWorkPlaceList, true)
      B0101 += empData.count
      B0201 += empData.disabilityCount

      /*
        B0201 += calcDisDayCount(empDisData, mDateFrom, mDateTo, reportParams.notAvgQuantityIDs, empDisability) */
    }
    const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
    const b03Params = UB.Repository('hr_valuesParam')
      .attrs(['valuesFloat', 'valuesFloat1', 'valuesFloat2', 'valuesFloat3'])
      .where('[listParamID.code]', '=', '<Б>')
      .where('[orgID]', '=', parentOrdID || orgID)
      .where('valuesFloat', '<', (B0101 || 0) / 12)
      .orderBy('valuesFloat', 'DESC')
      .where('[listParamID.mi_deleteUser]', 'isNull')
      .limit(1)
      .selectSingle()

    let B03 = 0
    if (b03Params) {
      if (b03Params.valuesFloat1 > 0) B03 = b03Params.valuesFloat1
      else if (b03Params.valuesFloat1 === 0) B03 = Math.round(b03Params.valuesFloat2 * ((B0101 || 0) / 12) / 100)
    }

    updateCellInArray(data, 'T1RXXXXG1', rownum, `${organization.fullName || organization.name || ''}`)
    updateCellInArray(data, 'T1RXXXXG2', rownum, `${orgAddress.address || ''}`)
    updateCellInArray(data, 'T1RXXXXG3', rownum, `${organization.EDRPOUCode || ''}`)
    updateCellInArray(data, 'T1RXXXXG4', rownum, `${accrualService.round(B0101 / 12, 0)}`)
    updateCellInArray(data, 'T1RXXXXG5', rownum, `${accrualService.round(B0201 / 12, 0)}`)
    updateCellInArray(data, 'T1RXXXXG6', rownum, `${B03}`)
    updateCellInArray(data, 'T1RXXXXG7', rownum, `${organization.FSZIAddress || ''}`)
  })
}

/* function calcDisDayCount (empData, dateFrom, dateTo, notAvgQuantityIDs = [], empDisability = []) {
  const periodDayCount = dateService.dayDiff(dateFrom, dateTo) + 1
  let totalDayCount = 0
  empData.forEach(emp => {
    if (emp.dateFrom <= dateTo && emp.dateTo >= dateFrom) {
      const empDisData = empDisability.filter(o => o.employeeID === emp.employeeID)
      const disPeriods = []
      empDisData.forEach(item => {
        const idx = disPeriods.findIndex(el => el.dateFrom <= item.dateFrom && item.dateFrom <= el.dateTo)
        if (idx < 0) {
          disPeriods.push({
            dateFrom: item.dateFrom,
            dateTo: item.dateTo
          })
        } else {
          if (disPeriods[idx].dateTo < item.dateTo) {
            disPeriods[idx].dateTo = item.dateTo
          }
        }
      })
      disPeriods.forEach(dis => {
        let perDateFrom = dateService.shiftDate(Math.max(dateFrom, emp.dateFrom))
        let perDateTo = dateService.shiftDate(Math.min(dateTo, emp.dateTo))
        if (dis.dateFrom < perDateTo && dis.dateTo > perDateFrom) {
          perDateFrom = dateService.shiftDate(Math.max(perDateFrom, dis.dateFrom))
          perDateTo = dateService.shiftDate(Math.min(perDateTo, dis.dateTo))
          const dayCount = dateService.dayDiff(perDateFrom, perDateTo) + 1
          const excludeDay = notAvgQuantityIDs.length ? (UB.Repository('tim_timeSheet')
            .attrs(['COUNT(1)'])
            .where('[employeeNumberID]', '=', emp.employeeNumberID)
            .where('[dateWork]', '>=', perDateFrom)
            .where('[dateWork]', '<=', perDateTo)
            .where('[isActive]', '=', true)
            .whereIf(notAvgQuantityIDs.length, '[factTimeCostID]', 'in', notAvgQuantityIDs)
            .groupBy('employeeNumberID')
            .selectScalar() || 0) : 0
          totalDayCount += (dayCount || 0) - excludeDay
        }
      })
    }
  })
  return accrualService.round(totalDayCount / periodDayCount, 0)
} */

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
    names: ['VIK', 'VIK_TEL', 'VIK_EMAIL'],
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
      precision: 1
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

function addTempleteForCustomRow (params) {
  params.T1 = [
    `<tr><td class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td><span class="row_num">ROWNUM</span></td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG1##ROWNUM{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG2##ROWNUM{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG3##ROWNUM{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG4##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intSpanInput}}</td> 
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM{{{}}}{{/textSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1">+</button></td></tr>`
  ]
}
