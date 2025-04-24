
const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
const reportService = require('../../../../HR/modules/reportService')
const currencyService = require('../../../../AC/modules/dataServices/currencyService')
const periodService = require('../../../../HR/modules/periodService')
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
  const { DECLARBODY, DECLARHEAD } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  data.detailData = { detailType: 'HR' }
  setMainData({ data, params })

  prepareQueryParams({ data, params })

  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })
  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']
const allBodyAttrNames = [
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_FAXORG', 'FIRM_NAME', 'FIRM_SPATO', 'SPATO', 'KVED', 'REP_NYEAR', 'FIRM_KVED', 'REP_PERNM',
  'A3020_1', 'A3020_2', 'A3040_1', 'A3040_2', 'A3050_1', 'A3050_2', 'A3060_1', 'A3060_2', 'A3070_1', 'A3070_2', 'A3080_1', 'A3080_2', 'A3090_2',
  'AREACODE_KATOTTG', 'KATOTTG', 'KATOTTG_FACT', 'TER_GROM1', 'TER_GROM2', 'CODE_ECONOMICTYPE', 'REASON2', 'REASON3', 'REASON4', 'REASON5', 'REASON6', 'ZERO_ZVIT',
  'A4080', 'A4090', 'A4100',
  'A5030', 'A5040', 'A5050', 'A5060', 'A5070', 'A5080', 'A5090',
  'A6010', 'A6020', 'A6030', 'A6040', 'A6050', 'A6060', 'A6070', 'A6080', 'A6090', 'A6100', 'A6130', 'A6140', 'A6150',
  'A7010', 'A7030', 'A7040',
  'A8010', 'A8020', 'A8030', 'A8040',
  'A9010', 'A9020', 'A9030', 'A9040', 'A9050', 'A9060', 'A9070',
  'B4080', 'B4090', 'B4100',
  'B7010', 'B7030', 'B7040',
  'C7010',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8',
  'N10', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8',
  'NOMER', 'OBL', 'RAY', 'TER_STRUK', 'VIK', 'MY_DATE', 'RUK', 'VIK_TEL', 'VIK_EMAIL',
  'N9', 'N11',
  'A5051', 'A5052', 'A5010', 'A5020', 'N1',
  'A3100_1', 'A3100_2',
  'N12',
  'K12',
  'A6110', 'A6120'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'S0301121.xsd'
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
  params.dateFrom = dateService.shiftDate(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 3, 1, 0, 0, 0, 0)))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR
  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  const resp = (params.respID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.respID) : {}
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })

  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK = resp['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  // add non std data for org
  const orgAddressLegal = UB.Repository('ac_address')
    .attrs([
      'address', 'nameTerGrom',
      'postIndex', 'regionID.name', 'districtID.name', /*'nameTerGrom',*/ 'cityID.name', 'cityDistrictID.name', /*'streetType',*/ 'street', 'house', 'section', 'apartment',
    ])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle() || {}

  const orgAddressFact = UB.Repository('ac_address')
    .attrs([
      'address', 'nameTerGrom',
      'postIndex', 'regionID.name', 'districtID.name', /*'nameTerGrom',*/ 'cityID.name', 'cityDistrictID.name', /*'streetType',*/ 'street', 'house', 'section', 'apartment',
    ])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.PERIOD = DECLARHEAD.PERIOD
  DECLARBODY.PERIOD_YEAR_2SYMBOLS = DECLARHEAD.PERIOD_YEAR.toString().slice(2)
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = orgAddressLegal.address
  DECLARBODY.TER_GROM1 = orgAddressLegal.nameTerGrom
  DECLARBODY.FIRM_ADR_FIZ = orgAddressFact.address
  DECLARBODY.TER_GROM2 = orgAddressFact.nameTerGrom
  DECLARBODY.N1 = DECLARBODY.HKVED_S || orgInfo['hkvedS']
  DECLARBODY.FIRM_FAXORG = orgInfo['fax']
  DECLARBODY.FIRM_KVED = DECLARBODY.KVED = DECLARBODY.HKVED || orgInfo['hkved']
  DECLARBODY.TER_STRUK = DECLARBODY.HKOATUU || orgInfo['hkoatuu']
  DECLARBODY.FIRM_SPATO = DECLARBODY.TER_STRUK
  DECLARBODY.SPATO = DECLARBODY.TER_STRUK
  DECLARBODY.AREACODE_KATOTTG = orgInfo['hkatottg.code'] || ''

  DECLARBODY.ADDR_J_POST_INDEX = orgAddressLegal['postIndex']
  DECLARBODY.ADDR_J_REGION = orgAddressLegal['regionID.name']
  DECLARBODY.ADDR_J_DISTRICT = orgAddressLegal['districtID.name']
  DECLARBODY.ADDR_J_TER_GROM = orgAddressLegal['nameTerGrom']
  DECLARBODY.ADDR_J_CITY = orgAddressLegal['cityID.name']
  DECLARBODY.ADDR_J_CITY_DISTRICT = orgAddressLegal['cityDistrictID.name']
  // 'streetType', 
  DECLARBODY.ADDR_J_STEET = orgAddressLegal['street']
  DECLARBODY.ADDR_J_HOUSE = orgAddressLegal['house']
  DECLARBODY.ADDR_J_SECTION = orgAddressLegal['section']
  DECLARBODY.ADDR_J_APARTMENT = orgAddressLegal['apartment']

  DECLARBODY.ADDR_F_POST_INDEX = orgAddressFact['postIndex'] || orgAddressLegal['postIndex'] || ''
  DECLARBODY.ADDR_F_REGION = orgAddressFact['regionID.name'] || orgAddressLegal['regionID.name'] || ''
  DECLARBODY.ADDR_F_DISTRICT = orgAddressFact['districtID.name'] || orgAddressLegal['districtID.name'] || ''
  DECLARBODY.ADDR_F_TER_GROM = orgAddressFact['nameTerGrom'] || orgAddressLegal['nameTerGrom'] || ''
  DECLARBODY.ADDR_F_CITY = orgAddressFact['cityID.name'] || orgAddressLegal['cityID.name'] || ''
  DECLARBODY.ADDR_F_CITY_DISTRICT = orgAddressFact['cityDistrictID.name'] || orgAddressLegal['cityDistrictID.name'] || ''
  // 'streetType', 
  DECLARBODY.ADDR_F_STEET = orgAddressFact['street'] || orgAddressLegal['street'] || ''
  DECLARBODY.ADDR_F_HOUSE = orgAddressFact['house'] || orgAddressLegal['house'] || ''
  DECLARBODY.ADDR_F_SECTION = orgAddressFact['section'] || orgAddressLegal['section'] || ''
  DECLARBODY.ADDR_F_APARTMENT = orgAddressFact['apartment'] || orgAddressLegal['apartment'] || ''

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PYEAR = DECLARBODY.REP_NYEAR - 1

  const periodMonths = [-3, -2, -1].map(monthNum => {
    return {
      dateFrom: dateService.shiftDate(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH + monthNum, 1, 0, 0, 0, 0))),
      dateTo: dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH + monthNum, 1, 0, 0, 0, 0)))
    }
  })

  const reportParams = reportService.getReportParams(params.organizationID, ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', '3050', '3060', '3090', '3100', '4080', '4100', '5040', '5050', '5051', '5052', '5070', '5080', '5090', '6020-6120', '6150', 'notFOPS03'])
  const payElIDsFOP = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const valueParams = reportService.getReportValuesParams(params.organizationID, ['<K>'])['<K>IDs']
  const minSalarySum = UB.Repository('hr_dictSalaryMinSize')
    .where('[dateFrom]', '<=', dateService.shiftDate(periodMonths[2].dateFrom))
    .orderBy('dateFrom', 'desc')
    .attrs(['monthValue'])
    .limit(1)
    .selectScalar() || 0
  const salaryRanges = [{ valueFrom: Number.NEGATIVE_INFINITY, valueTo: minSalarySum }]
  const salaryKeys = [['K1', 'N2'], ['K2', 'N3'], ['K3', 'N4'], ['K4', 'N5'], ['K5', 'N6'], ['K6', 'N7'], ['K7', 'N8'], ['K8', 'N12'], ['K12', 'N10']]
  valueParams.forEach((param, i) => {
    salaryRanges.push({ valueFrom: salaryRanges[salaryRanges.length - 1].valueTo, valueTo: param.valuesFloat })
    if (salaryKeys[i]) {
      DECLARBODY[salaryKeys[i][0]] = DECLARBODY[salaryKeys[i][1]] = param.valuesFloat.toFixed(2)
    }
  })
  salaryRanges.push({ valueFrom: salaryRanges[salaryRanges.length - 1].valueTo, valueTo: Number.POSITIVE_INFINITY })

  /* const pmSum = UB.Repository('hr_dictLivingCost')
      .where('[dateFrom]', '<=', periodMonths[2].dateFrom)
      .orderBy('dateFrom', 'desc')
      .attrs(['workingPerson'])
      .limit(1)
      .selectScalar() || 0 */

  const organizations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .whereIf(params.dictOrgGroupId, 'dictOrgGroupId', '=', params.dictOrgGroupId)
      .whereIf(params.withoutOwnEDRPOU, 'EDRPOUCode', 'startWith', `${orgInfo.OKPOCode}_%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id).concat([params.organizationID])
    : [params.organizationID]
  DECLARBODY.MY_DATE = dateService.formatDate(params.dateTo, 'mmmm yyyy')

  // Details Params
  let keys = ['A3020_1', 'A3020_2', 'A3040_1', 'A3040_2', 'A3050_1', 'A3050_2', 'A3060_1', 'A3060_2']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'dt', entityName: null, name: UB.i18n('Дата'), type: 'string' }
      ],
      onDate: params.dateTo,
      openForm: [{ name: 'or', enID: 'enID' }]
    }
  })
  keys = ['A3080_1', 'A3080_2', 'A3090_1', 'A3090_2', 'A3100_1', 'A3100_2']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' }
      ],
      onDate: params.dateTo,
      openForm: [{ name: 'or', enID: 'enID' }]
    }
  })
  keys = ['A3070_1', 'A3070_2']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' }
      ],
      onDate: params.dateTo,
      openForm: [{ name: 'or', enID: 'enID' }]
    }
  })
  keys = ['A4080', 'A4090', 'A4100']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'eID', entityName: 'hr_employee', name: UB.i18n('Працівник'), descAttr: 'fullFIO', type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' },
        { attr: 'h', entityName: null, name: UB.i18n('Кількість годин'), type: 'float', summary: 'sum' }
      ],
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })
  keys = ['B4080', 'B4090', 'B4100']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'eID', entityName: 'hr_employee', name: UB.i18n('Працівник'), descAttr: 'fullFIO', type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' }
      ],
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })

  keys = ['A7010', 'A7030', 'A7040']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' },
        { attr: 'c', entityName: null, name: UB.i18n('Середньооблікова чисельність'), type: 'float', summary: 'sum' }
        // { attr: 'dC', entityName: null, name: UB.i18n('Днів'), type: 'float', summary: 'sum' }
      ],
      onDate: params.dateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })
  keys = ['B7010', 'B7030', 'B7040']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
        { attr: 'psID', entityName: 'hr_dictPeriod', name: UB.i18n('Обліковий період'), descAttr: 'name', type: 'string' },
        { attr: 'plID', entityName: 'hr_payEl', name: UB.i18n('Вид оплати'), descAttr: 'description', type: 'string' },
        { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
      ],
      onDate: params.dateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' }, { name: 'pe', plID: 'plID' } ]
    }
  })
  keys = ['C7010']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' },
        { attr: 'h', entityName: null, name: UB.i18n('Кількість годин'), type: 'float', summary: 'sum' }
      ],
      onDate: params.dateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })

  organizations.forEach(orgID => {
    const hiredEmpsBuld = UB.Repository('hr_employeePositionS')
      .where('[organizationID]', '=', orgID)
      .where('[dateFrom]', '>=', params.dateFrom)
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[workPlace]', '=', '1')
      .where('employeeNumberID.empWorkPlace', 'isNull')
      .where('[employeeNumberID.dateFrom]=[dateFrom]', 'custom')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .whereIf(params.includeSubOrg, 'employeeNumberID.parentEmpNumberID', 'isNull')
      .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType', 'dateFrom'])
      .groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType', 'dateFrom'])
      .selectAsObject({
        'employeeNumberID.employeeID.sexType': 'sexType'
      })
    const hiredCount = hiredEmpsBuld.reduce((accum, row) => {
      accum.c_all++
      if (row.sexType === 'W') {
        accum.c_women++
        data.detailData['A3020_2'].data.push({ enID: row.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(row.dateFrom)) })
      }
      data.detailData['A3020_1'].data.push({ enID: row.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(row.dateFrom)) })

      return accum
    }, { c_all: 0, c_women: 0 })

    DECLARBODY.A3020_1 = (DECLARBODY.A3020_1 || 0) + hiredCount.c_all
    DECLARBODY.A3020_2 = (DECLARBODY.A3020_2) + hiredCount.c_women
    let firedEmpsBuld = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType', 'employeeNumberID.parentEmpNumberID', 'dateTo'])
      .where('[organizationID]', '=', orgID)
      .where('[dateTo]', '>=', params.nextDayDiss ? dateService.addDays(params.dateFrom, -1) : params.dateFrom)
      .where('[dateTo]', '<=', params.nextDayDiss ? dateService.addDays(params.dateTo, -1) : params.dateTo)
      .where('[workPlace]', '=', '1')
      .where('employeeNumberID.empWorkPlace', 'isNull')
      .where('[employeeNumberID.dateTo]=[dateTo]', 'custom')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    if (params.includeSubOrg) {
      firedEmpsBuld = firedEmpsBuld.notExists(UB.Repository('hr_employeeNumber')
        .correlation('parentEmpNumberID', 'employeeNumberID')
        .where('mi_deleteDate', '>=', '#maxdate'))
    }
    const firedEmps = firedEmpsBuld.groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType', 'employeeNumberID.parentEmpNumberID', 'dateTo'])
      .selectAsObject({
        'employeeNumberID.employeeID.sexType': 'sexType'
      })
    const firedCount = firedEmps.reduce((accum, row) => {
      accum.c_all++
      if (row.sexType === 'W') {
        accum.c_women++
        data.detailData['A3040_2'].data.push({ enID: row.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })
      }
      data.detailData['A3040_1'].data.push({ enID: row.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })

      return accum
    }, { c_all: 0, c_women: 0 })
    DECLARBODY.A3040_1 = (DECLARBODY.A3040_1 || 0) + firedCount.c_all
    DECLARBODY.A3040_2 = (DECLARBODY.A3040_2 || 0) + firedCount.c_women

    const store = UB.DataStore('hr_orderPay')
    if (firedEmps.length && reportParams['3050IDs'].length) {
      store.runSQL(`SELECT n.ID "ID", e.sexType "sexType", n.dateTo "dateTo"
  from hr_employeeNumber n 
  JOIN hr_employee e on e.ID = n.employeeID
  join hr_order o on o.ID = n.changeOrderID
  JOIN hr_orderClass c on c.ID = o.orderClass
  where n.ID${entityBaseService.getInExpression('firedEmps')} and
  (CASE WHEN c.entityName = 'hr_empOrder' THEN 
    (select dd.dictReasonDismID from hr_empOrderDismDet dd where dd.orderID = o.ID and dd.employeeNumberID = n.ID and dd.mi_deleteDate >= '9999-12-31') 
    ELSE (select op.reasonDismID from hr_orderPay op where op.ID = o.ID)  END)${entityBaseService.getInExpression('p3050IDs')}
    
  `, {
        firedEmps: firedEmps.map(row => row.employeeNumberID),
        p3050IDs: reportParams['3050IDs']
      })
      const fireOrdersData3050 = store.getAsJsObject()
      const fireOrders3050 = fireOrdersData3050.reduce((accum, row) => {
        accum.c_all++
        if (row.sexType === 'W') {
          accum.c_women++
          data.detailData['A3050_2'].data.push({ enID: row.ID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })
        }
        data.detailData['A3050_1'].data.push({ enID: row.ID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })

        return accum
      }, { c_all: 0, c_women: 0 })

      DECLARBODY.A3050_1 = (DECLARBODY.A3050_1 || 0) + (fireOrders3050.c_all)
      DECLARBODY.A3050_2 = (DECLARBODY.A3050_2 || 0) + (fireOrders3050.c_women)
    } else {
      DECLARBODY.A3050_1 = (DECLARBODY.A3050_1 || 0)
      DECLARBODY.A3050_2 = (DECLARBODY.A3050_2 || 0)
    }
    if (firedEmps.length && reportParams['3060IDs'].length) {
      store.runSQL(`SELECT n.ID "ID", e.sexType "sexType", n.dateTo "dateTo"
    from hr_employeeNumber n 
    JOIN hr_employee e on e.ID = n.employeeID
    join hr_order o on o.ID = n.changeOrderID
    JOIN hr_orderClass c on c.ID = o.orderClass
    where n.ID${entityBaseService.getInExpression('firedEmps')} and
    (CASE WHEN c.entityName = 'hr_empOrder' THEN 
      (select dd.dictReasonDismID from hr_empOrderDismDet dd where dd.orderID = o.ID and dd.employeeNumberID = n.ID and dd.mi_deleteDate >= '9999-12-31') 
      ELSE (select op.reasonDismID from hr_orderPay op where op.ID = o.ID)  END)${entityBaseService.getInExpression('p3060IDs')}
  `, {
        firedEmps: firedEmps.map(row => row.employeeNumberID),
        p3060IDs: reportParams['3060IDs']
      })
      const fireOrdersData3060 = store.getAsJsObject()
      const fireOrders3060 = fireOrdersData3060.reduce((accum, row) => {
        accum.c_all++
        if (row.sexType === 'W') {
          accum.c_women++
          data.detailData['A3060_2'].data.push({ enID: row.ID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })
        }
        data.detailData['A3060_1'].data.push({ enID: row.ID, dt: dateService.formatDate(dateService.shiftDate(row.dateTo)) })

        return accum
      }, { c_all: 0, c_women: 0 })

      DECLARBODY.A3060_1 = (DECLARBODY.A3060_1 || 0) + (fireOrders3060.c_all)
      DECLARBODY.A3060_2 = (DECLARBODY.A3060_2 || 0) + (fireOrders3060.c_women)
    } else {
      DECLARBODY.A3060_1 = (DECLARBODY.A3060_1 || 0)
      DECLARBODY.A3060_2 = (DECLARBODY.A3060_2 || 0)
    }

    const workingEmps = UB.Repository('hr_employeePositionS')
      .where('[organizationID]', '=', orgID)
      .where('[dateFrom]', '<=', params.dateTo)
      .where('[dateTo]', '>=', params.dateTo)
      .where('[workPlace]', '=', '1')
      .where('employeeNumberID.empWorkPlace', 'isNull')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType', 'accrualSum'])
      .selectAsObject({
        'employeeNumberID.employeeID.sexType': 'sexType'
      })
    const workingCount = workingEmps.reduce((accum, row) => {
      accum.c_all++
      if (row.sexType === 'W') {
        accum.c_women++
        data.detailData['A3070_2'].data.push({ enID: row.employeeNumberID })
      }
      data.detailData['A3070_1'].data.push({ enID: row.employeeNumberID })
      return accum
    }, { c_all: 0, c_women: 0 })
    DECLARBODY.A3070_1 = (DECLARBODY.A3070_1 || 0) + workingCount.c_all
    DECLARBODY.A3070_2 = (DECLARBODY.A3070_2 || 0) + workingCount.c_women
    if (data.DECLAR.DECLARHEAD.PERIOD_MONTH === 12) {
      const partialEmps = UB.Repository('hr_timeSheetChangeEmp')
        .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
        .where('[timeSheetChangeID.orderState]', '=', 'POSTED')
        .where('[timeSheetChangeID.dateFrom]', '<=', params.dateTo)
        .where('[timeSheetChangeID.dateTo]', '>=', params.dateTo)
        .where('[timeSheetChangeID.typeSheetChange]', '<>', '2')
        .where('[timeSheetChangeID.mi_deleteDate]', '>=', '#maxdate')
        .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .selectAsObject({
          'employeeNumberID.employeeID.sexType': 'sexType'
        })
      const partialCount = partialEmps.reduce((accum, row) => {
        accum.c_all++
        if (row.sexType === 'W') {
          accum.c_women++
          data.detailData['A3080_2'].data.push({ enID: row.employeeNumberID })
        }
        data.detailData['A3080_1'].data.push({ enID: row.employeeNumberID })
        return accum
      }, { c_all: 0, c_women: 0 })

      DECLARBODY.A3080_1 = (DECLARBODY.A3080_1 || 0) + partialCount.c_all
      DECLARBODY.A3080_2 = (DECLARBODY.A3080_2 || 0) + partialCount.c_women

      const timeSheets3090Emps = reportParams['3090IDs'].length ? UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
        .where('[isActive]', '=', true)
        .where('[factTimeCostID]', 'in', reportParams['3090IDs'])
        .where('[dateWork]', '=', params.dateTo)
        .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .selectAsObject({
          'employeeNumberID.employeeID.sexType': 'sexType'
        }) : []
      const timeSheets3090Count = timeSheets3090Emps.reduce((accum, row) => {
        accum.c_all++
        if (row.sexType === 'W') {
          accum.c_women++
          data.detailData['A3090_2'].data.push({ enID: row.employeeNumberID })
        }
        data.detailData['A3090_1'].data.push({ enID: row.employeeNumberID })
        return accum
      }, { c_all: 0, c_women: 0 })

      DECLARBODY.A3090_1 = (DECLARBODY.A3090_1 || 0) + timeSheets3090Count.c_all
      DECLARBODY.A3090_2 = (DECLARBODY.A3090_2 || 0) + timeSheets3090Count.c_women

      const timeSheets100Emps = reportParams['3100IDs'].length ? UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
        .where('[isActive]', '=', true)
        .where('[factTimeCostID]', 'in', reportParams['3100IDs'])
        .where('[dateWork]', '=', params.dateTo)
        .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
        .selectAsObject({
          'employeeNumberID.employeeID.sexType': 'sexType'
        }) : []
      const timeSheets1000Count = timeSheets100Emps.reduce((accum, row) => {
        accum.c_all++
        if (row.sexType === 'W') {
          accum.c_women++
          data.detailData['A3100_2'].data.push({ enID: row.employeeNumberID })
        }
        data.detailData['A3100_1'].data.push({ enID: row.employeeNumberID })
        return accum
      }, { c_all: 0, c_women: 0 })

      DECLARBODY.A3100_1 = (DECLARBODY.A3100_1 || 0) + timeSheets1000Count.c_all
      DECLARBODY.A3100_2 = (DECLARBODY.A3100_2 || 0) + timeSheets1000Count.c_women
    }

    // Part II
    periodMonths.forEach(periodMonth => {
      if (!periodMonth[orgID]) {
        periodMonth[orgID] = periodService.getPeriodOnDate(orgID, periodMonth.dateFrom) || { ID: null }
      }

      //.where('employeeNumberID.empWorkPlace', 'isNull')

      const empPosDatas = UB.Repository('hr_employeePositionS')
        .where('[organizationID]', '=', orgID)
        .where('[dateFrom]', '<=', periodMonth.dateTo, 'dF')
        .where('[dateTo]', '>=', periodMonth.dateFrom, 'dTo')
        .where('[employeeNumberID.dateTo]', '>=', periodMonth.dateFrom, 'ndTo')
        .where('[employeeNumberID.dateFrom]', '<=', periodMonth.dateTo, 'ndF')
        .where('[employeeNumberID.mi_deleteDate]', '>=', periodMonth.dateFrom)
        .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
        .logic('(([dF] AND [dTo]) OR ([ndTo] AND [ndF]))')
        .orderBy('dateFrom')
        .attrs(['employeeNumberID', 'workPlace', 'workScheduleID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
          'employeeNumberID.employeeID.sexType', 'dictFundSourceID',
          'dictStaffCatID.accCategory'])
        .selectAsObject({
          'employeeNumberID.dateFrom': 'employeeDateFrom',
          'employeeNumberID.dateTo': 'employeeDateTo',
          'employeeNumberID.employeeID.sexType': 'sexType',
          'dictStaffCatID.accCategory': 'accCategory'
        })

      const lastWorkPlaceByEmp = {}
      empPosDatas.forEach(empPosData => {
        lastWorkPlaceByEmp[empPosData.employeeNumberID] = empPosData
      })
      periodMonth.lastWorkPlaces = Object.values(lastWorkPlaceByEmp)
      periodMonth.empNumIDs = periodMonth.lastWorkPlaces
        .filter(empPosData => ['1', '2'].indexOf(empPosData.workPlace) >= 0)
        .map(empPosData => empPosData.employeeNumberID)
        periodMonth.empNum5IDs = periodMonth.lastWorkPlaces
        .filter(empPosData => ['5'].indexOf(empPosData.workPlace) >= 0)
        .map(empPosData => empPosData.employeeNumberID)
      periodMonth.empNumCurrentIDs = periodMonth.lastWorkPlaces
        .filter(empPosData => empPosData.workPlace === '1')
        .map(empPosData => empPosData.employeeNumberID)
    })

    const notWorkedTime4080 = periodMonths.map(periodMonth => {
      return UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', periodMonth.empNum5IDs)
        .where('[isActive]', '=', true)
        .where('[factTimeCostID]', 'in', reportParams['4080IDs'].length ? reportParams['4080IDs'] : [0])
        .where('[dateWork]', '>=', periodMonth.dateFrom)
        .where('[dateWork]', '<=', periodMonth.dateTo)
        .attrs(['employeeNumberID.employeeID', 'SUM([normHour])'])
        .groupBy('employeeNumberID.employeeID')
        .selectAsObject({
          'employeeNumberID.employeeID': 'employeeID',
          'SUM([normHour])': 'c_hour'
        }).reduce((accum, row) => {
          accum.c_hour += row.c_hour
          accum.employeeIDs.push(row.employeeID)
          data.detailData['A4080'].data.push({ eID: row.employeeID, h: row.c_hour, pcID: periodMonth[orgID].ID })
          data.detailData['B4080'].data.push({ eID: row.employeeID, pcID: periodMonth[orgID].ID })
          return accum
        }, { c_hour: 0, employeeIDs: [] })
    }).reduce((accum, row) => {
      accum.c_hour += row.c_hour
      accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
      return accum
    }, { c_hour: 0, employeeIDs: [] })
    DECLARBODY.A4080 = currencyService.round((DECLARBODY.A4080 || 0) + currencyService.round(notWorkedTime4080.c_hour, 0), 0)
    DECLARBODY.B4080 = (DECLARBODY.B4080 || 0) + (new Set(notWorkedTime4080.employeeIDs)).size

    const notWorkedTime4090 = periodMonths.map(periodMonth => {
      return UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', periodMonth.empNum5IDs)
        .where('[isActive]', '=', true)
        .where('[orderID.orderClass.entityName]', '=', 'hr_timeSheetChange')
        .where('[dateWork]', '>=', periodMonth.dateFrom)
        .where('[dateWork]', '<=', periodMonth.dateTo)
        .exists(
          UB.Repository('hr_timeSheetChangeEmp')
            .where('[timeSheetChangeID.typeSheetChange]', '=', '3')
            .where('[timeSheetChangeID.orderState]', '=', 'POSTED')
            .where('[timeSheetChangeID.mi_deleteDate]', '>=', '#maxdate')
            .correlation('timeSheetChangeID', 'orderID')
        )
        .attrs(['employeeNumberID.employeeID', 'SUM([normHour]-[factHour])'])
        .groupBy('employeeNumberID.employeeID')
        .selectAsObject({
          'employeeNumberID.employeeID': 'employeeID',
          'SUM([normHour]-[factHour])': 'c_hour'
        }).reduce((accum, row) => {
          accum.c_hour += row.c_hour
          accum.employeeIDs.push(row.employeeID)
          data.detailData['A4090'].data.push({ eID: row.employeeID, h: row.c_hour, pcID: periodMonth[orgID].ID })
          data.detailData['B4090'].data.push({ eID: row.employeeID, pcID: periodMonth[orgID].ID })
          return accum
        }, { c_hour: 0, employeeIDs: [] })
    }).reduce((accum, row) => {
      accum.c_hour += row.c_hour
      accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
      return accum
    }, { c_hour: 0, employeeIDs: [] })
    DECLARBODY.A4090 = currencyService.round((DECLARBODY.A4090 || 0) + currencyService.round(notWorkedTime4090.c_hour, 0), 0)
    DECLARBODY.B4090 = (DECLARBODY.B4090) + (new Set(notWorkedTime4090.employeeIDs)).size

    const notWorkedTime4100 = periodMonths.map(periodMonth => {
      return UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', periodMonth.empNum5IDs)
        .where('[isActive]', '=', true)
        .where('[factTimeCostID]', 'in', reportParams['4100IDs'].length ? reportParams['4100IDs'] : [0])
        .where('[dateWork]', '>=', periodMonth.dateFrom)
        .where('[dateWork]', '<=', periodMonth.dateTo)
        .attrs(['employeeNumberID.employeeID', 'SUM([normHour])'])
        .groupBy('employeeNumberID.employeeID')
        .selectAsObject({
          'employeeNumberID.employeeID': 'employeeID',
          'SUM([normHour])': 'c_hour'
        }).reduce((accum, row) => {
          accum.c_hour += row.c_hour
          accum.employeeIDs.push(row.employeeID)
          data.detailData['A4100'].data.push({ eID: row.employeeID, h: row.c_hour, pcID: periodMonth[orgID].ID })
          data.detailData['B4100'].data.push({ eID: row.employeeID, pcID: periodMonth[orgID].ID })
          return accum
        }, { c_hour: 0, employeeIDs: [] })
    }).reduce((accum, row) => {
      accum.c_hour += row.c_hour
      accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
      return accum
    }, { c_hour: 0, employeeIDs: [] })
    DECLARBODY.A4100 = currencyService.round((DECLARBODY.A4100 || 0) + currencyService.round(notWorkedTime4100.c_hour, 0), 0)
    DECLARBODY.B4100 = (DECLARBODY.B4100 || 0) + (new Set(notWorkedTime4100.employeeIDs)).size

    // Part III

    function part3Alg (rowCode, mainPayElIDs, addPayElIDs, excludePayElIDs) {
      if (!data.detailData[rowCode]) {
        data.detailData[rowCode] = {
          data: [],
          columns: [
            { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
            { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
            { attr: 'psID', entityName: 'hr_dictPeriod', name: UB.i18n('Обліковий період'), descAttr: 'name', type: 'string' },
            { attr: 'plID', entityName: 'hr_payEl', name: UB.i18n('Вид оплати'), descAttr: 'description', type: 'string' },
            { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
          ],
          onDate: params.dateTo,
          openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' }, { name: 'pe', plID: 'plID' } ]
        }
      }

      const paySum = periodMonths.reduce((accum, periodMonth) => {
        const accruals = UB.Repository('hr_accrual')
          .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
          .where('[payElID]', 'in', mainPayElIDs)
          .whereIf(addPayElIDs, '[payElID]', 'in', addPayElIDs)
          .whereIf(excludePayElIDs && excludePayElIDs.length, '[payElID]', 'notIn', excludePayElIDs)
          .where('periodCalc', '<=', periodMonth.dateTo)
          .where('periodSalary', '<=', periodMonth.dateTo)
          .where('periodCalc', '=', periodMonth.dateFrom, 'case1')
          .where('periodCalc', '<', periodMonth.dateFrom, 'case2')
          .where('periodSalary', '=', periodMonth.dateFrom, 'cond2')
          .where('employeeNumberID.empWorkPlace', 'isNull')
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .logic('([case1] OR ([case2] AND [cond2]))')
          .attrs(['employeeNumberID', 'payElID', 'periodSalaryID', 'periodCalcID', 'SUM([paySum])'])
          .groupBy(['employeeNumberID', 'periodCalcID', 'periodSalaryID', 'payElID'])
          .selectAsObject({
            'employeeNumberID': 'enID',
            'payElID': 'plID',
            'periodSalaryID': 'psID',
            'periodCalcID': 'pcID',
            'SUM([paySum])': 'ps'
          })
        data.detailData[rowCode].data.push(...accruals)

        return accum + (UB.Repository('hr_accrual')
          .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
          .where('[payElID]', 'in', mainPayElIDs)
          .whereIf(addPayElIDs, '[payElID]', 'in', addPayElIDs)
          .whereIf(excludePayElIDs && excludePayElIDs.length, '[payElID]', 'notIn', excludePayElIDs)
          .where('periodCalc', '<=', periodMonth.dateTo)
          .where('periodSalary', '<=', periodMonth.dateTo)
          .where('periodCalc', '=', periodMonth.dateFrom, 'case1')
          .where('periodCalc', '<', periodMonth.dateFrom, 'case2')
          .where('periodSalary', '=', periodMonth.dateFrom, 'cond2')
          .where('employeeNumberID.empWorkPlace', 'isNull')
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .logic('([case1] OR ([case2] AND [cond2]))')
          .attrs(['SUM([paySum])'])
          .selectScalar() || 0)
      }, 0)
      return Math.round(paySum / 100) / 10
    }
    DECLARBODY.A5020 = (DECLARBODY.A5020 || 0) + part3Alg('A5020', reportParams.FOZPIDs, null, reportParams.notFOPS03IDs)
    DECLARBODY.A5030 = (DECLARBODY.A5030 || 0) + part3Alg('A5030', reportParams.FDZPIDs, null, reportParams.notFOPS03IDs)
    DECLARBODY.A5040 = (DECLARBODY.A5040 || 0) + part3Alg('A5040', reportParams.FDZPIDs, reportParams['5040IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5050 = (DECLARBODY.A5050 || 0) + part3Alg('A5050', reportParams.FDZPIDs, reportParams['5050IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5051 = (DECLARBODY.A5051 || 0) + part3Alg('A5051', reportParams.FDZPIDs, reportParams['5051IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5052 = (DECLARBODY.A5052 || 0) + part3Alg('A5052', reportParams.FDZPIDs, reportParams['5052IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5060 = (DECLARBODY.A5060 || 0) + part3Alg('A5060', reportParams.ZKVIDs, null, reportParams.notFOPS03IDs)
    DECLARBODY.A5070 = (DECLARBODY.A5070 || 0) + part3Alg('A5070', reportParams.ZKVIDs, reportParams['5070IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5080 = (DECLARBODY.A5080 || 0) + part3Alg('A5080', reportParams.ZKVIDs, reportParams['5080IDs'], reportParams.notFOPS03IDs)
    DECLARBODY.A5090 = (DECLARBODY.A5090 || 0) + part3Alg('A5090', reportParams.FDZPIDs.concat(reportParams.ZKVIDs), reportParams['5090IDs'], reportParams.notFOPS03IDs)

    // part V
    const part5Data = {
      '7010': { days: 0, factHour: 0, paySum: 0 },
      '7030': { days: 0, factHour: 0, paySum: 0 },
      '7040': { days: 0, factHour: 0, paySum: 0 },
      totalDays: 0
    }
    periodMonths.map(periodMonth => {
      const totalDays = dateService.lastDayOfMonth(periodMonth.dateFrom).getDate()
      part5Data.totalDays += totalDays
      periodMonth.lastWorkPlaces.forEach(empPosData => {
        empPosData.part5rows = []
        empPosData.part5rowsDet = {}
        if (empPosData.workPlace === '1' && (empPosData.sexType === 'W')) {
          empPosData.part5rows.push('7010')
          empPosData.part5rowsDet['7010'] = { days: 0, factHour: 0, accrual: [] }
        }
        if (empPosData.workPlace === '5' && (empPosData.sexType === 'W')) {
          empPosData.part5rows.push('7010')
          empPosData.part5rowsDet['7010'] = { days: 0, factHour: 0, accrual: [] }
        }
        if (empPosData.workPlace === '3') {
          empPosData.part5rows.push('7030')
          empPosData.part5rowsDet['7030'] = { days: 0, factHour: 0, accrual: [] }
        }
        if (empPosData.accCategory === '7') {
          empPosData.part5rows.push('7040')
          empPosData.part5rowsDet['7040'] = { days: 0, factHour: 0, accrual: [] }
        }
      })

      // filter by workPlace and correct fire date 111
      let workEmps = periodMonth.lastWorkPlaces
        .filter(empPosData => empPosData.part5rows.length > 0)
      let workEmpNumIDs = workEmps
        .filter(empPos => dateService.shiftDate(empPos.employeeDateTo) < dateService.shiftDate(dateService.lastDayOfMonth(periodMonth.dateTo)))
        .map(empPosData => empPosData.employeeNumberID)
        .filter(Boolean)
        .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
      let workScheduleIDs = workEmps
        .map(empPosData => empPosData.workScheduleID)
        .filter(Boolean)
        .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
      let minDayDateData = []
      if (workEmpNumIDs && workEmpNumIDs.length > 0 && workScheduleIDs && workScheduleIDs.length > 0) {
        const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
        const tmStore = UB.DataStore('tim_plan')
        tmStore.runSQL(`
          SELECT tp.workScheduleID as "workScheduleID", MIN(tp.dayDate) as "minDay", en.ID as "employeeNumberID"
        FROM tim_plan tp
        INNER JOIN hr_dictTimeCost dt ON dt.ID=tp.dictTimeCostID
        INNER JOIN hr_employeePosition ep ON ep.workScheduleID = tp.workScheduleID AND ep.isActive = 1
        INNER JOIN hr_employeeNumber en ON en.ID=ep.employeeNumberID
        WHERE tp.organizationID= :orgID:
        AND tp.dayDate>en.dateTo
        AND dt.timeCostType='WORK'
        AND tp.mi_deleteDate>= '9999-12-31'
        AND en.ID${entityBaseService.getInExpression('workEmpNumIDs')}
        AND tp.workScheduleID${entityBaseService.getInExpression('workScheduleIDs')}
        Group by tp.workScheduleID, en.ID `,
        {
          orgID: planByOrgID || orgID,
          workEmpNumIDs: workEmpNumIDs.length ? workEmpNumIDs : [0],
          workScheduleIDs: workScheduleIDs.length ? workScheduleIDs : [0]
        })
        minDayDateData = tmStore.getAsJsObject()
        tmStore.freeNative()
      }

      /*const empNums5 = periodMonth.lastWorkPlaces.filter(empPosData => empPosData.workPlace === '5' && empPosData.sexType === 'W')
        .map(empPosData => {
          const dateTo = dateService.shiftDate(empPosData.employeeDateTo)
          let minDayData = minDayDateData.find(ep => ep.employeeNumberID === empPosData.employeeNumberID && ep.workScheduleID === empPosData.workScheduleID)
          let dateToCorr = dateTo
          if (minDayData) {
            dateToCorr = dateService.addDays(dateService.shiftDate(minDayData.minDay), -1)
          }
          return {
            employeeNumberID: empPosData.employeeNumberID,
            part5rows: empPosData.part5rows,
            part5rowsDet: empPosData.part5rowsDet,
            dateFrom: dateService.shiftDate(empPosData.employeeDateFrom),
            dateTo: dateTo,
            dateToCorr: dateToCorr
          }
        })*/

      const empNums = workEmps
        .map(empPosData => {
          const dateTo = dateService.shiftDate(empPosData.employeeDateTo)
          let minDayData = minDayDateData.find(ep => ep.employeeNumberID === empPosData.employeeNumberID && ep.workScheduleID === empPosData.workScheduleID)
          let dateToCorr = dateTo
          if (minDayData) {
            dateToCorr = dateService.addDays(dateService.shiftDate(minDayData.minDay), -1)
          }
          return {
            employeeNumberID: empPosData.employeeNumberID,
            part5rows: empPosData.part5rows,
            part5rowsDet: empPosData.part5rowsDet,
            dateFrom: dateService.shiftDate(empPosData.employeeDateFrom),
            dateTo: dateTo,
            dateToCorr: dateToCorr,
            workPlace: empPosData.workPlace
          }
        })

      // index by employeeNumberID
      

      const empNumsByEmp = empNums.reduce((accum, row) => {
        accum[row.employeeNumberID] = row
        // accum[row.employeeNumberID].
        return accum
      }, {})

      // load corresponding timesheets within month
      const timeSheets = UB.Repository('tim_timeSheet')
        .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
        .where('[isActive]', '=', true)
        .where('[factTimeCostID]', 'notIn', reportParams.notAvgQuantityIDs ? reportParams.notAvgQuantityIDs : [0])
        .where('[dateWork]', '>=', periodMonth.dateFrom)
        .where('[dateWork]', '<=', periodMonth.dateTo)
        .groupBy(['employeeNumberID', 'dateWork'])
        .attrs(['employeeNumberID', 'dateWork', 'SUM([factHour])'])
        .selectAsObject({
          'SUM([factHour])': 'factHour'
        })
      // intersect with hire-fire dates and count days and factHours
      timeSheets.forEach(timeSheet => {
        timeSheet.dateWork = dateService.shiftDate(timeSheet.dateWork)
        const empNum = empNumsByEmp[timeSheet.employeeNumberID]
        if (empNum.dateFrom <= timeSheet.dateWork && timeSheet.dateWork <= empNum.dateToCorr) {
          empNum.part5rows.forEach(rowCode => {
            if (rowCode==='7010') {
              if (empNum.workPlace==='1') part5Data[rowCode].days++
            } else part5Data[rowCode].days++
            if (rowCode==='7010') {
              if (empNum.workPlace==='5') part5Data[rowCode].factHour += timeSheet.factHour
            } else part5Data[rowCode].factHour += timeSheet.factHour
            if (rowCode==='7010') {
              if (empNum.workPlace==='1') empNum.part5rowsDet[rowCode].days++
            } else empNum.part5rowsDet[rowCode].days++  
            if (rowCode==='7010') {
              if (empNum.workPlace==='5') empNum.part5rowsDet[rowCode].factHour += timeSheet.factHour
            } else empNum.part5rowsDet[rowCode].factHour += timeSheet.factHour
          })
        }
      })
      const empCphIDs = []
      Object.keys(empNumsByEmp).forEach(empNumID => {
        if (empNumsByEmp[empNumID].part5rowsDet && empNumsByEmp[empNumID].part5rowsDet['7040'] && !empNumsByEmp[empNumID].part5rowsDet['7040'].days) {
          empCphIDs.push(Number(empNumID))
        }
      })
      const empCphDatas = empCphIDs.length ? UB.Repository('hr_employeeCPH')
        .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
        .where('[employeeNumberID]', 'in', empCphIDs)
        .where('[dateFrom]', '<', periodMonth.dateTo)
        .where('[dateTo]', '>=', periodMonth.dateFrom, 'dateTo')
        .where('dateTo', 'isNull', undefined, 'dateToIsNull')
        .logic('(([dateTo]) or ([dateToIsNull]))')
        .selectAsObject() : []

      empCphDatas.forEach(ts => {
        ts.dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(ts.dateFrom), periodMonth.dateFrom))
        ts.dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(ts.dateTo || periodMonth.dateTo), periodMonth.dateTo))
        const days = (dateService.dayDiff(ts.dateFrom, ts.dateTo) + 1)
        empNumsByEmp[ts.employeeNumberID].part5rowsDet['7040'].days += days
        part5Data['7040'].days += days
      })
      // find fop sum
      const payTotals = UB.Repository('hr_accrual')
        .where('[employeeNumberID]', 'in', empNums.filter(empNum => empNum.workPlace !== '5').map(row => row.employeeNumberID))
        .where('[payElID]', 'in', payElIDsFOP)
        .whereIf(reportParams.notFOPS03IDs.length, '[payElID]', 'notIn', reportParams.notFOPS03IDs)
        .where('periodCalc', '<=', dateService.shiftDate(periodMonth.dateTo))
        .where('periodSalary', '<=', dateService.shiftDate(periodMonth.dateTo))
        .where('periodCalc', '=', dateService.shiftDate(periodMonth.dateFrom), 'case1')
        .where('periodCalc', '<', dateService.shiftDate(periodMonth.dateFrom), 'case2')
        .where('periodSalary', '=', dateService.shiftDate(periodMonth.dateFrom), 'cond2')
        .where(`(flagsRec & 8192 != 8192)`, 'custom')
        .logic('([case1] OR ([case2] AND [cond2]))')
        .attrs(['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID', 'SUM([paySum])'])
        .groupBy(['employeeNumberID', 'payElID', 'periodCalcID', 'periodSalaryID'])
        .selectAsObject({
          'employeeNumberID': 'enID',
          'payElID': 'plID',
          'periodCalcID': 'pcID',
          'periodSalaryID': 'psID',
          'SUM([paySum])': 'ps'
        })
      payTotals.forEach(row => {
        const empNum = empNumsByEmp[row.enID]
        empNum.part5rows.forEach(rowCode => {
          part5Data[rowCode].paySum += row.ps
          empNum.part5rowsDet[rowCode].accrual.push(row)
        })
      })
      Object.keys(empNumsByEmp).forEach(empNumID => {
        if (empNumsByEmp[empNumID].part5rowsDet) {
          const part5rowsDet = empNumsByEmp[empNumID].part5rowsDet
          if (part5rowsDet['7010']) {
            data.detailData['A7010'].data.push({
              enID: Number(empNumID),
              pcID: periodMonth[orgID].ID,
              c: currencyService.round(part5rowsDet['7010'].days / totalDays, 3),
              dC: part5rowsDet['7010'].days
            })
            data.detailData['B7010'].data.push(...part5rowsDet['7010'].accrual)
            data.detailData['C7010'].data.push({
              enID: Number(empNumID),
              pcID: periodMonth[orgID].ID,
              h: part5rowsDet['7010'].factHour
            })
          }
          if (part5rowsDet['7030']) {
            data.detailData['A7030'].data.push({
              enID: Number(empNumID),
              pcID: periodMonth[orgID].ID,
              c: currencyService.round(part5rowsDet['7030'].days / totalDays, 3),
              dC: part5rowsDet['7030'].days
            })
            data.detailData['B7030'].data.push(...part5rowsDet['7030'].accrual)
          }
          if (part5rowsDet['7040']) {
            data.detailData['A7040'].data.push({
              enID: Number(empNumID),
              pcID: periodMonth[orgID].ID,
              c: currencyService.round(part5rowsDet['7040'].days / totalDays, 3),
              dC: part5rowsDet['7040'].days
            })
            data.detailData['B7040'].data.push(...part5rowsDet['7040'].accrual)
          }
        }
      })
    })

    DECLARBODY.A7010 = currencyService.gaussRound((DECLARBODY.A7010 || 0) + currencyService.gaussRound(part5Data['7010'].days / part5Data.totalDays))
    DECLARBODY.A7030 = currencyService.gaussRound((DECLARBODY.A7030 || 0) + currencyService.gaussRound(part5Data['7030'].days / part5Data.totalDays))
    DECLARBODY.A7040 = currencyService.gaussRound((DECLARBODY.A7040 || 0) + currencyService.gaussRound(part5Data['7040'].days / part5Data.totalDays))
    DECLARBODY.B7010 = (DECLARBODY.B7010 || 0) + Math.round(part5Data['7010'].paySum / 100) / 10
    DECLARBODY.B7030 = (DECLARBODY.B7030 || 0) + Math.round(part5Data['7030'].paySum / 100) / 10
    DECLARBODY.B7040 = (DECLARBODY.B7040 || 0) + Math.round(part5Data['7040'].paySum / 100) / 10
    DECLARBODY.C7010 = Math.round((DECLARBODY.C7010 || 0) + Math.round(part5Data['7010'].factHour))
  })
  if (DECLARBODY.A7030 === 0 && DECLARBODY.B7030 !== 0) DECLARBODY.A7030 = 1
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'TER_GROM1', 'TER_GROM2', 'REASON', 'FIRM_EDRPOU', 'FIRM_FAXORG', 'FIRM_NAME', 'FIRM_SPATO', 'FIRM_KVED', 'SPATO', 'KVED', 'REP_PERNM', 'OBL', 'RAY', 'TER_STRUK', 'VIK', 'MY_DATE', 'RUK', 'VIK_TEL', 'VIK_EMAIL', 'N9', 'N11', 'N1', 'N12', 'K12'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A3020_1', 'A3020_2', 'A3040_1', 'A3040_2', 'A3050_1', 'A3050_2', 'A3060_1', 'A3060_2', 'A3070_1', 'A3070_2', 'A3080_1', 'A3080_2', 'A3090_2', 'A4080', 'A4090', 'A4100',
      'A6010', 'A6020', 'A6030', 'A6040', 'A6050', 'A6060', 'A6070', 'A6080', 'A6090', 'A6100', 'A6130', 'A6140', 'A6150', 'A7010', 'A7030', 'A7040', 'A8010', 'A8020',
      'ZERO_ZVIT', 'REASON2', 'REASON3', 'REASON4', 'REASON5', 'REASON6',
      'AREACODE_KATOTTG', 'KATOTTG', 'KATOTTG_FACT', 'B4080', 'B4090', 'B4100', 'C7010', 'NOMER', 'CODE_ECONOMICTYPE', 'A3100_1', 'A3100_2', 'A6110', 'A6120', 'A9070'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A5030', 'A5040', 'A5050', 'A5060', 'A5070', 'A5080', 'A5090', 'B7010', 'B7030', 'B7040', 'A5051', 'A5052', 'A5010', 'A5020', 'A9010', 'A9020', 'A9030', 'A9040', 'A9050', 'A9060'],
    format: {
      type: 'number',
      nillable: true,
      precision: 1
    }
  },
  {
    names: ['A8030', 'A8040', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'N10', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'],
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
  DECLARBODY.KATOTTG = (DECLARBODY.AREACODE_KATOTTG && DECLARBODY.AREACODE_KATOTTG !== '') ? DECLARBODY.AREACODE_KATOTTG : ''
  DECLARBODY.KATOTTG_FACT = DECLARBODY.KATOTTG
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
