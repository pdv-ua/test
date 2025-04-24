const UB = require('@unitybase/ub')
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const reportService = require('../../../../HR/modules/reportService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
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

  const periodStart = periodService.getPeriod(params.periodStartID)
  const periodEnd = periodService.getPeriod(params.periodEndID)
  params.useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true

  params.accrualPeriodStart = periodStart.dateFrom
  params.accrualPeriodEnd = periodEnd.dateTo
  setParams(params, DECLARHEAD)
  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  setData(DECLARBODY, params)
  return { data, errorMessages }
}

function setParams (params, DECLARHEAD) {
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
}

function setData (DECLARBODY, params) {
  setHeaderData(DECLARBODY, params)
  setFooterData(DECLARBODY, params)
  setTableData(DECLARBODY, params)
}

function setHeaderData (DECLARBODY, params) {
  DECLARBODY.HEDRPLOU = getHEDRPLOU(params.organizationID)
  DECLARBODY.HDATE = dateService.formatDate(params.dateStateOn, 'dd mmm yyyy')
}

function getHEDRPLOU (id) {
  const data = UB.Repository('hr_organization')
    .attrs('name', 'EDRPOUCode')
    .where('mi_data_id', '=', id)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle()
  return `${data.name}, ${data.EDRPOUCode}`
}

function setFooterData (DECLARBODY, params) {
  DECLARBODY.HBOS = getShortFio(params.bosID)
  DECLARBODY.HBUH = getShortFio(params.respID)
  const periodEnd = periodService.getPeriod(params.periodEndID)
  DECLARBODY.PBOS = getPosition(params.bosID, params.useActualPositionName, params.dateStateOn)
  DECLARBODY.PBUH = getPosition(params.respID, params.useActualPositionName, params.dateStateOn)
}

function getShortFio (id) {
  const data = UB.Repository('hr_employeeNumberS')
    .attrs('ID', 'employeeID.shortFIO')
    .where('ID', '=', id)
    .selectSingle({
      'employeeID.shortFIO': 'shortFIO'
    })
  return data.shortFIO
}

function getPosition (id, useActualPositionName, onDate) {
  let data = UB.Repository('hr_employeePositionS')
    .attrsIf(useActualPositionName, ['factPosName'])
    .attrsIf(!useActualPositionName, ['posNameDiff'])
    .where('employeeNumberID', '=', id)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .orderByDesc('dateTo')
    .limit(1)
    .selectScalar()
  if (!data) {
    data = UB.Repository('hr_employeePositionS')
      .attrsIf(useActualPositionName, ['factPosName'])
      .attrsIf(!useActualPositionName, ['posNameDiff'])
      .where('employeeNumberID', '=', id)
      .orderByDesc('dateTo')
      .limit(1)
      .selectScalar()
  }
  return data
}

function setTableData (DECLARBODY, params) {
  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.accrualPeriodEnd)
      .where('mi_dateTo', '>=', params.accrualPeriodEnd)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]

  const reportParams = reportService.getReportParams(params.organizationID, ['VacChAES', 'DismChAES', 'ChAES1', 'ChAES2', 'ChAES3', 'ChAESCh'])
  organiozations.forEach(orgID => {
    setAllData(orgID, DECLARBODY, params, reportParams)
  })
  setSumma(DECLARBODY)
}

function setAllData (orgID, DECLARBODY, p, reportParams) {
  const yearPeriodStart = periodService.getPeriodOnDate(orgID, dateService.shiftDate(new Date(p.yearOfCurrentPeriod, 0, 1)))
  const yearDateStart = yearPeriodStart.dateFrom

  const SQL = getSQLCounter()
  DECLARBODY.F1211 = (DECLARBODY.F1211 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQL, reportParams)
  DECLARBODY.F1212 = (DECLARBODY.F1212 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQL, reportParams)
  DECLARBODY.F1213 = (DECLARBODY.F1213 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQL, reportParams)
  DECLARBODY.F1311 = (DECLARBODY.F1311 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQL, reportParams)
  DECLARBODY.F1312 = (DECLARBODY.F1312 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQL, reportParams)
  DECLARBODY.F1313 = (DECLARBODY.F1313 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQL, reportParams)

  DECLARBODY.F6211 = (DECLARBODY.F6211 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQL, reportParams)
  DECLARBODY.F6212 = (DECLARBODY.F6212 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQL, reportParams)
  DECLARBODY.F6213 = (DECLARBODY.F6213 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQL, reportParams)
  DECLARBODY.F6311 = (DECLARBODY.F6311 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQL, reportParams)
  DECLARBODY.F6312 = (DECLARBODY.F6312 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQL, reportParams)
  DECLARBODY.F6313 = (DECLARBODY.F6313 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQL, reportParams)

  const SQLAcc = getSQLSum()
  const SQLFund = getSQLSumFund()
  DECLARBODY.F1511 = (DECLARBODY.F1511 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQLFund, reportParams)
  DECLARBODY.F1512 = (DECLARBODY.F1512 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQLFund, reportParams)
  DECLARBODY.F1513 = (DECLARBODY.F1513 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQLFund, reportParams)
  DECLARBODY.F1611 = (DECLARBODY.F1611 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'VacChAES', SQLFund, reportParams)
  DECLARBODY.F1612 = (DECLARBODY.F1612 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'VacChAES', SQLFund, reportParams)
  DECLARBODY.F1613 = (DECLARBODY.F1613 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAESCh', 'VacChAES', SQLFund, reportParams)

  DECLARBODY.F6511 = (DECLARBODY.F6511 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQLFund, reportParams)
  DECLARBODY.F6512 = (DECLARBODY.F6512 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQLFund, reportParams)
  DECLARBODY.F6513 = (DECLARBODY.F6513 || 0) + getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQLAcc, reportParams) +
    getCellData(yearDateStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQLFund, reportParams)
  DECLARBODY.F6611 = (DECLARBODY.F6611 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES1', 'DismChAES', SQLFund, reportParams)
  DECLARBODY.F6612 = (DECLARBODY.F6612 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES2', 'DismChAES', SQLFund, reportParams)
  DECLARBODY.F6613 = (DECLARBODY.F6613 || 0) + getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQLAcc, reportParams) +
    getCellData(p.accrualPeriodStart, p.accrualPeriodEnd, orgID, 'ChAES3', 'DismChAES', SQLFund, reportParams)
}

function getCellData (dateFrom, dateTo, organizationID, codeChAES, categoryChAES, SQL, reportParams) {
  const p = {
    dateFrom: dateService.shiftDate(dateFrom),
    dateTo: dateService.shiftDate(dateTo),
    organizationID,
    codeChAES: reportParams[`${codeChAES}IDs`].length ? reportParams[`${codeChAES}IDs`] : [0],
    categoryChAES: reportParams[`${categoryChAES}IDs`].length ? reportParams[`${categoryChAES}IDs`] : [0]
  }
  const store = UB.DataStore('hr_payEl')
  store.runSQL(SQL, p)
  const data = store.getAsJsObject()
  return (data.length ? data[0].col_1 : 0) || 0
}

function getSQLSum () {
  return `
  select SUM(a1.paySum) as "col_1" from hr_accrual a1
    inner join hr_employeeNumber n1 on n1.ID = a1.employeeNumberID
        and n1.orgID = :organizationID:
    where a1.periodCalc <= :dateTo: and a1.periodCalc >= :dateFrom: and (a1.flagsRec & 8192 = 0)
    and payElID${entityBaseService.getInExpression('categoryChAES')}
    and exists (
      select 1
        from hr_employeeBenefits b1
        where b1.employeeID = n1.employeeID and b1.mi_deleteDate >= '9999-12-31'
          and b1.dateFrom <= :dateTo: and b1.dateTo >= :dateFrom:
          and dictBenefitsKindID${entityBaseService.getInExpression('codeChAES')} 
    )
  `
}

function getSQLSumFund () {
  return `
  select SUM(a1.paySum) as "col_1"  from hr_accrualFundDt a1
    inner join hr_accrualFund af ON a1.accrualFundID=af.ID
    inner join hr_employeeNumber n1 on n1.ID = af.employeeNumberID
        and n1.orgID = :organizationID:
    where af.periodCalc <= :dateTo: and af.periodCalc >= :dateFrom:
    and payElID${entityBaseService.getInExpression('categoryChAES')}
    and exists (
      select 1
        from hr_employeeBenefits b1
        where b1.employeeID = n1.employeeID and b1.mi_deleteDate >= '9999-12-31'
          and b1.dateFrom <= :dateTo: and b1.dateTo >= :dateFrom:
          and dictBenefitsKindID${entityBaseService.getInExpression('codeChAES')} 
    )
  `
}

function getSQLCounter () {
  return `
    select COUNT(*) as "col_1", n1.employeeID
      from hr_employeeNumber n1
      inner join hr_employeeBenefits b1 on b1.employeeID = n1.employeeID and b1.mi_deleteDate >= '9999-12-31'
      where n1.orgID = :organizationID:
      and n1.mi_deleteDate >= '9999-12-31'
      and n1.dateFrom <= :dateTo: and n1.dateTo >= :dateFrom:
      and b1.dateFrom <= :dateTo: and b1.dateTo >= :dateFrom:
      and b1.dictBenefitsKindID${entityBaseService.getInExpression('codeChAES')}
      and exists (
        select null from hr_accrual a1
        where a1.employeeNumberID = n1.ID and a1.periodCalc <= :dateTo: and a1.periodCalc >= :dateFrom: and (a1.flagsRec & 8192 = 0)
        and payElID${entityBaseService.getInExpression('categoryChAES')}
       )
    group by n1.employeeID   
   `
}

function setSumma (DECLARBODY) {
  DECLARBODY.F7 = DECLARBODY.F17 + DECLARBODY.F67
  DECLARBODY.F8 = DECLARBODY.F18 + DECLARBODY.F68
  DECLARBODY.F651 = DECLARBODY.F6511 + DECLARBODY.F6512 + DECLARBODY.F6513
  DECLARBODY.F661 = DECLARBODY.F6611 + DECLARBODY.F6612 + DECLARBODY.F6613
  DECLARBODY.F65 = DECLARBODY.F651
  DECLARBODY.F66 = DECLARBODY.F661
  DECLARBODY.F151 = DECLARBODY.F1511 + DECLARBODY.F1512 + DECLARBODY.F1513
  DECLARBODY.F161 = DECLARBODY.F1611 + DECLARBODY.F1612 + DECLARBODY.F1613

  DECLARBODY.F15 = DECLARBODY.F151
  DECLARBODY.F16 = DECLARBODY.F161

  DECLARBODY.F5 = DECLARBODY.F15 + DECLARBODY.F65
  DECLARBODY.F6 = DECLARBODY.F16 + DECLARBODY.F66
  DECLARBODY.F621 = DECLARBODY.F6211 + DECLARBODY.F6212 + DECLARBODY.F6213
  DECLARBODY.F631 = DECLARBODY.F6311 + DECLARBODY.F6312 + DECLARBODY.F6313
  DECLARBODY.F62 = DECLARBODY.F621
  DECLARBODY.F63 = DECLARBODY.F631
  DECLARBODY.F121 = DECLARBODY.F1211 + DECLARBODY.F1212 + DECLARBODY.F1213
  DECLARBODY.F131 = DECLARBODY.F1311 + DECLARBODY.F1312 + DECLARBODY.F1313
  DECLARBODY.F12 = DECLARBODY.F121
  DECLARBODY.F13 = DECLARBODY.F131
  DECLARBODY.F2 = DECLARBODY.F12 + DECLARBODY.F62
  DECLARBODY.F3 = DECLARBODY.F13 + DECLARBODY.F63

  DECLARBODY.F1411 = DECLARBODY.F1611 / DECLARBODY.F1311
  DECLARBODY.F1412 = DECLARBODY.F1612 / DECLARBODY.F1312
  DECLARBODY.F1413 = DECLARBODY.F1613 / DECLARBODY.F1313
  DECLARBODY.F141 = DECLARBODY.F161 / DECLARBODY.F131
  DECLARBODY.F14 = DECLARBODY.F16 / DECLARBODY.F13

  DECLARBODY.F6411 = DECLARBODY.F6611 / DECLARBODY.F6311
  DECLARBODY.F6412 = DECLARBODY.F6612 / DECLARBODY.F6312
  DECLARBODY.F6413 = DECLARBODY.F6613 / DECLARBODY.F6313
  DECLARBODY.F641 = DECLARBODY.F661 / DECLARBODY.F631
  DECLARBODY.F64 = DECLARBODY.F66 / DECLARBODY.F63
}

const allHeadAttrNames = [
  'dateStateOn', 'accrualPeriodStart', 'accrualPeriodEnd', 'monthOfCurrentPeriod',
  'yearOfCurrentPeriod', 'bosID', 'respID'
]

const allBodyAttrNames = [
  'HDATE', 'HEDRPLOU',
  'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18',
  'F121', 'F131', 'F141', 'F151', 'F161', 'F171', 'F181',
  'F1211', 'F1311', 'F1411', 'F1511', 'F1611', 'F1711', 'F1811',
  'F1212', 'F1312', 'F1412', 'F1512', 'F1612', 'F1712', 'F1812',
  'F1213', 'F1313', 'F1413', 'F1513', 'F1613', 'F1713', 'F1813',
  'F62', 'F63', 'F64', 'F65', 'F66', 'F67', 'F68',
  'F621', 'F631', 'F641', 'F651', 'F661', 'F671', 'F681',
  'F6211', 'F6311', 'F6411', 'F6511', 'F6611', 'F6711', 'F6811',
  'F6212', 'F6312', 'F6412', 'F6512', 'F6612', 'F6712', 'F6812',
  'F6213', 'F6313', 'F6413', 'F6513', 'F6613', 'F6713', 'F6813',
  'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8',
  'PBOS', 'HBOS', 'PBUH', 'HBUH'
]

const cellFormats = [
  {
    names: ['HDATE', 'HEDRPLOU', 'PBOS', 'HBOS', 'PBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: [
      'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18',
      'F121', 'F131', 'F141', 'F151', 'F161', 'F171', 'F181',
      'F1211', 'F1311', 'F1411', 'F1511', 'F1611', 'F1711', 'F1811',
      'F1212', 'F1312', 'F1412', 'F1512', 'F1612', 'F1712', 'F1812',
      'F1213', 'F1313', 'F1413', 'F1513', 'F1613', 'F1713', 'F1813',
      'F62', 'F63', 'F64', 'F65', 'F66', 'F67', 'F68',
      'F621', 'F631', 'F641', 'F651', 'F661', 'F671', 'F681',
      'F6211', 'F6311', 'F6411', 'F6511', 'F6611', 'F6711', 'F6811',
      'F6212', 'F6312', 'F6412', 'F6512', 'F6612', 'F6712', 'F6812',
      'F6213', 'F6313', 'F6413', 'F6513', 'F6613', 'F6713', 'F6813',
      'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'
    ],
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

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'H0301011.xsd'
  }
  const excludeCell = Object.keys(data.DECLAR.DECLARBODY).filter(cName => cellNames.indexOf(cName) < 0)
  excludeCell.forEach(cName => {
    delete data.DECLAR.DECLARBODY[cName]
  })
  cellNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
}
