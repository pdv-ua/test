const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, setHeadData, getCellSettings, updateCell, updateCellInArray, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const glService = require('../../../../GL/modules/glService')
const periodService = require('../../../../HR/modules/periodService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

const bodyAttrs = ['HZ', 'HZN', 'HZU', 'HZD', 'HNM', 'HNUM', 'HNUM1', 'HNAME', 'HTIN', 'HKATOTTG',
  'HPAGES',
  'HLOC',
  'HSTI',
  'HZKV', 'HZY',
  'R00G01I', 'R00G02I', 'R00G03I',

  'T1RXXXXG02', 'T1RXXXXG03A', 'T1RXXXXG03', 'T1RXXXXG04A', 'T1RXXXXG04', 'T1RXXXXG05', 'T1RXXXXG06D', 'T1RXXXXG07D', 'T1RXXXXG08', 'T1RXXXXG09',
  'T1RXXXXG5A', 'T1RXXXXG5',
  'R01G03A', 'R01G03', 'R01G04A', 'R01G04', 'R01G5', 'R01G5A',
  'R0201G03A', 'R0201G04A', 'R0201G04', 'R0201G5', 'R0201G5A',
  'R0202G03A', 'R0202G04A', 'R0202G04', 'R0202G5', 'R0202G5A',
  'R0203G03A', 'R0203G03', 'R0203G04A', 'R0203G04', 'R0203G5', 'R0203G5A',
  'R0204G03A', 'R0204G03', 'R0204G04A', 'R0204G04', 'R0204G5', 'R0204G5A',
  'R0205G03A', 'R0205G03', 'R0205G04A', 'R0205G04', 'R0205G5', 'R0205G5A',
  'R0206G03A', 'R0206G03', 'R0206G04A', 'R0206G04', 'R0206G5', 'R0206G5A',

  'R02G01I', 'R02G02I', 'R02G03I',

  'HFILL', 'HKBOS', 'HBOS', 'HTELBOS',
  'HKBUH', 'HBUH', 'HTELBUH'
]

const cellFormats = [
  {
    names: [
      'HTIN', 'HNAME', 'HLOC', 'HSTI', 'T1RXXXXG08', 'HKATOTTG',
      'HKBOS', 'HBOS', 'HTELBOS',
      'HKBUH', 'HBUH', 'HTELBUH',
      'HFILL', 'T1RXXXXG06D', 'T1RXXXXG07D', 'T1RXXXXG05', 'T1RXXXXG02'
    ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: [
      'T1RXXXXG03A', 'T1RXXXXG03', 'T1RXXXXG04A', 'T1RXXXXG04', 'T1RXXXXG5A', 'T1RXXXXG5',
      'R01G03A', 'R01G03', 'R01G04A', 'R01G04', 'R01G5', 'R01G5A',
      'R0201G03A', 'R0201G04A', 'R0201G04', 'R0201G5', 'R0201G5A',
      'R0202G03A', 'R0202G04A', 'R0202G04', 'R0202G5', 'R0202G5A',
      'R0203G03A', 'R0203G03', 'R0203G04A', 'R0203G04', 'R0203G5', 'R0203G5A',
      'R0204G03A', 'R0204G03', 'R0204G04A', 'R0204G04', 'R0204G5', 'R0204G5A',
      'R0205G03A', 'R0205G03', 'R0205G04A', 'R0205G04', 'R0205G5', 'R0205G5A',
      'R0206G03A', 'R0206G03', 'R0206G04A', 'R0206G04', 'R0206G5', 'R0206G5A'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  },
  {
    names: ['HZ', 'HZN', 'HZU', 'HZD', 'HNM', 'HNUM', 'HNUM1',
      'HPAGES',
      'HZKV', 'HZY',
      'R00G01I', 'R00G02I', 'R00G03I',
      'R02G01I', 'R02G02I', 'R02G03I', 'T1RXXXXG09'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  }
]

function generateData (params = {}) {
  const tabsData = []
  const errorMessages = []
  const data = prepareStructureReport()
  setHeadData({ data, params })
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareMainData(data, params)

  addTempleteForCustomRow(data.DECLAR.PARAMS)

  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))

  const periods = periodService.getPeriodsByDate(params.organizationID, params.dateFrom, params.dateTo)
  periods.forEach((period, idx) => {
    let k = 1
    params.dateFrom = period.dateFrom
    params.dateTo = period.dateTo
    const { taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerTaxCode, taxPayersContainerPassport, tabCountPassport, tabCountTaxCode } = getAllData({}, params, period)
    for (let i = 0; i < tabCountTaxCode + tabCountPassport; i++) {
      const periodData = {
        DECLAR: {
          $: Object.assign({}, data.DECLAR.$),
          DECLARBODY: Object.assign({}, data.DECLAR.DECLARBODY),
          DECLARHEAD: Object.assign({}, data.DECLAR.DECLARHEAD),
          PARAMS: Object.assign({}, data.DECLAR.PARAMS)
        },
        cellSettings: data.cellSettings
      }
      periodData.DECLAR.DECLARBODY.HNM = idx + 1
      periodData.DECLAR.DECLARBODY.HNUM = params.C_DOC_TYPE
      periodData.DECLAR.DECLARHEAD.C_DOC_CNT = periodData.DECLAR.DECLARBODY.HNUM1 = idx + i + 1
      if (i < tabCountTaxCode) {
        prepareData(periodData, params, taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerTaxCode, i + 1, i + 1)
      } else {
        prepareData(periodData, params, taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerPassport, i + 1, k)
        k++
      }
      tabsData.push({ data: periodData, errorMessages })
    }
  })
  return tabsData
}

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
    'xsi:noNamespaceSchemaLocation': 'J0510406.xsd'
  }

  bodyAttrs.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
  return data
}

function prepareMainData (data, params) {
  const { DECLARBODY, DECLARHEAD } = data.DECLAR
  const toDate = new Date()

  const HBUH = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID.phoneWorking'])
    .selectById(params.buhID || null) || {}
  DECLARBODY.HKBUH = HBUH['employeeID.taxCode']
  DECLARBODY.HBUH = HBUH['employeeID.shortFIO']
  DECLARBODY.HTELBUH = HBUH['employeeID.phoneWorking']

  const HBOS = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID.phoneWorking'])
    .selectById(params.bosID || null) || {}
  DECLARBODY.HKBOS = HBOS['employeeID.taxCode']
  DECLARBODY.HBOS = HBOS['employeeID.shortFIO']
  DECLARBODY.HTELBOS = HBOS['employeeID.phoneWorking']

  const organization = UB.Repository('hr_organization')
    .attrs(['EDRPOUCode', 'name'])
    .where('mi_data_id', '=', params.organizationID)
    .where('mi_dateFrom', '<=', toDate)
    .where('mi_dateTo', '>=', toDate)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectSingle() || {}
  DECLARBODY.HNAME = organization.name
  DECLARBODY.HTIN = organization.EDRPOUCode
  DECLARHEAD.TIN = organization.EDRPOUCode
  DECLARBODY.HKATOTTG = DECLARBODY.HKOATUU
  // DECLARBODY.HSTI = organization['dictSprStiID.nameSti']

  const dictSprStiOrig = params.hkstiOrig ? UB.Repository('ac_dictSprSti').attrs(['cReg', 'cRaj', 'hksti']).selectById(params.hkstiOrig) || {} : {}
  DECLARHEAD.C_STI_ORIG = dictSprStiOrig.hksti

  const dictSprStiCopy = params.hkstiCopy ? UB.Repository('ac_dictSprSti').attrs(['cReg', 'cRaj', 'hksti', 'nameSti']).selectById(params.hkstiCopy) || {} : {}
  DECLARHEAD.C_REG = dictSprStiCopy.cReg
  DECLARHEAD.C_RAJ = dictSprStiCopy.cRaj
  DECLARBODY.HSTI = dictSprStiCopy.nameSti
  DECLARHEAD.C_DOC_TYPE = params.C_DOC_TYPE

  const orgAddress = UB.Repository('ac_address')
    .attrs(['address', 'postIndex'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle() || {}
  DECLARBODY.HLOC = orgAddress['address']
  DECLARBODY.HZ = params.FORM_TYPE === 'HZ' || params.FORM_TYPE === 'HZD'
  DECLARBODY.HZN = params.FORM_TYPE === 'HZN'
  DECLARBODY.HZU = params.FORM_TYPE === 'HZU'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'

  DECLARBODY.HZKV = parseInt(params.PERIOD_MONTH) / 3
  DECLARBODY.HZY = params.PERIOD_YEAR

  DECLARHEAD.LINKED_DOCS = {
    $: {
      'xsi:nil': 'true'
    }
  }

  DECLARHEAD.D_FILL = moment().format('DDMMYYYY')

  DECLARBODY.HFILL = moment(params.HFILL).format('DDMMYYYY')
}
function addMutualSettlements (entityName, data, params, period) {
  const mutualSettlements = UB.Repository(`${entityName}Dt`)
    .attrs(['contractorID.OKPOCode', 'dictCodePersonIncID.code', 'totalSum1', 'totalSum2', 'totalSum3', 'totalSum4'])
    .where('docMutualSettleID.organizationID', '=', params.organizationID)
    .where('docMutualSettleID.docState', '=', 'POSTED')
    .where('docMutualSettleID.docState', '=', 'POSTED')
    .where('docMutualSettleID.dateFrom', '<=', period.dateTo)
    .where('docMutualSettleID.dateTo', '>=', period.dateFrom)
    .where('docMutualSettleID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'contractorID.OKPOCode': 'taxCode',
      'dictCodePersonIncID.code': 'code',
      'totalSum1': 'incomeSum',
      'totalSum2': 'incomePaidSum',
      'totalSum3': 'taxSum',
      'totalSum4': 'taxPaidSum'
    })

  mutualSettlements.forEach(row => {
    if (row.taxCode && row.taxCode.length === 10) {
      row.empTaxCodeType = 'TAXCODE'
    }
    row.code = String(row.code || '').replace(/[^\d]/g, '') || 0
    data.push(row)
  })
  if (mutualSettlements.length) {
    data = data.sort((a, b) => {
      return a.taxCode < b.taxCode ? -1 : (a.taxCode > b.taxCode ? 1 : 0)
    })
  }
}

function getAllData (data, params, period) {
  const taxPayersList = getTaxPayersList(params)
  const taxLimitList = getTaxLimitList(params, period)
  const militaryTaxSumList = getMilitaryTaxSum(params, period)
  const taxPayersSum = getTaxPayersSum(params, period)
  const taxPayersContainer = taxPayersSum.reduce((res, item) => {
    if (!params.isInclude157 && item.code === 157) {
      return res
    }
    item.recordFlag = 0
    const taxPayer = taxPayersList.find(o => o.taxCode === item.taxCode)
    if (taxPayer) {
      item.dateFrom = taxPayer.dateFrom >= params.dateFrom && taxPayer.dateFrom <= params.dateTo ? taxPayer.dateFrom : null
      item.dateTo = taxPayer.dateTo <= params.dateTo ? taxPayer.dateTo : null
    }
    const taxLimit = taxLimitList.find(limit => limit.taxCode === item.taxCode && limit.code === item.code)
    if (taxLimit) {
      item.taxLimit = taxLimit.limit1
    }
    if (item.code === 101 || item.code === 102) {
      const militaryTaxSum = militaryTaxSumList.find(o => o.taxCode === item.taxCode)
      if (militaryTaxSum) {
        item.militaryTaxSum = militaryTaxSum.taxSum
      }
    }

    if (params.isCalculatePaidIncome) {
      // TODO Расчёт сумм выплаченного дохода
    } else {
      item.incomePaidSum = item.incomeSum
    }
    if (params.isCalculatePaidTax) {
      // TODO Расчёт сумм перечисленного налога
    } else {
      item.taxPaidSum = item.taxSum
    }
    if (item.incomeSum || item.incomePaidSum || item.taxSum || item.taxPaidSum) {
      res.push(item)
    }
    return res
  }, [])

  if (global[`sia_docMutualSettlements`]) {
    addMutualSettlements(`sia_docMutualSettlements`, taxPayersContainer, params, period)
  }

  const taxPayersContainerTaxCode = taxPayersContainer
  // taxPayersContainer.filter(el => el.empTaxCodeType === 'TAXCODE' && el.taxCode && el.taxCode.length === 10)
  const taxPayersContainerPassport = [] // taxPayersContainer.filter(el => !(el.empTaxCodeType === 'TAXCODE' && el.taxCode && el.taxCode.length === 10))

  let tabCountPassport = 0
  if (taxPayersContainerPassport && taxPayersContainerPassport.length > 0) {
    let rest = taxPayersContainerPassport.length % params.recordsAmount
    tabCountPassport = ((taxPayersContainerPassport.length - rest) / params.recordsAmount) + (rest > 0 ? 1 : 0)
  }

  let tabCountTaxCode = 1
  if (taxPayersContainerTaxCode && taxPayersContainerTaxCode.length > 0) {
    let rest = taxPayersContainerTaxCode.length % params.recordsAmount
    tabCountTaxCode = ((taxPayersContainerTaxCode.length - rest) / params.recordsAmount) + (rest > 0 ? 1 : 0)
  }
  return { taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerTaxCode, taxPayersContainerPassport, tabCountPassport, tabCountTaxCode }
}

function prepareData (data, params, taxPayersList, taxLimitList, taxPayersSum, taxPayersContainer, partNumber, partIndex) {
  const dateInputFormat = 'YYYY-MM-DD'

  let filterTaxPayersContainer = taxPayersContainer.filter((el, ind) => ind >= (partIndex - 1) * params.recordsAmount && ind < partIndex * params.recordsAmount)

  const R00G01I = new Set()
  const R00G02I = new Set()

  filterTaxPayersContainer.forEach((row, idx) => {
    const rownum = idx + 1
    updateCellInArray(data, 'T1RXXXXG02', rownum, `${row.taxCode.replace(/ /g, '')}`)
    updateCellInArray(data, 'T1RXXXXG03A', rownum, row['incomeSum'] || null)
    updateCellInArray(data, 'T1RXXXXG03', rownum, row['incomePaidSum'] || null)
    updateCellInArray(data, 'T1RXXXXG04A', rownum, row['taxSum'] || null)
    updateCellInArray(data, 'T1RXXXXG04', rownum, row['taxPaidSum'] || null)
    updateCellInArray(data, 'T1RXXXXG5', rownum, row['militaryTaxSum'] || null)
    updateCellInArray(data, 'T1RXXXXG5A', rownum, row['militaryTaxSum'] || null)
    updateCellInArray(data, 'T1RXXXXG05', rownum, row['code'])
    updateCellInArray(data, 'T1RXXXXG06D', rownum, row['dateFrom'] ? moment(row['dateFrom']).format(dateInputFormat) : null)
    updateCellInArray(data, 'T1RXXXXG07D', rownum, row['dateTo'] ? moment(row['dateTo']).format(dateInputFormat) : null)
    updateCellInArray(data, 'T1RXXXXG08', rownum, row['taxLimit'] || '')
    updateCellInArray(data, 'T1RXXXXG09', rownum, (row['recordFlag'] && row['recordFlag'] !== 0) ? row['recordFlag'] : null)
    if (row['code'] === 101) {
      R00G01I.add(row['taxCode'])
    }
    // Количество налогоплательщиков у которых есть доход с кодом "102"
    if (row['code'] === 102) {
      R00G02I.add(row['taxCode'])
    }
  })
  updateCell(data, 'R00G01I', R00G01I.size)
  updateCell(data, 'R00G02I', R00G02I.size)
  updateCell(data, 'R00G03I', partNumber)

  // const R02G01I = taxPayersContainer.length
  const R02G01I = filterTaxPayersContainer.length // ???
  updateCell(data, 'R02G01I', R02G01I)
  updateCell(data, 'R02G02I', taxPayersList.length) // ??? это всего или в порции, сейчас всего

  const MIN_PAGES = 2 // Минимальное количество страниц (шапка + подвал)
  const FIRST_PAGE_ROWS_AMOUNT = 10 // Количество строк на странице с шапкой
  const PAGE_ROWS_AMOUNT = 29 // Количество строк на странице без шапки

  const pagesCount = MIN_PAGES +
    Math.round((R02G01I - FIRST_PAGE_ROWS_AMOUNT) / PAGE_ROWS_AMOUNT) +
    (((R02G01I - FIRST_PAGE_ROWS_AMOUNT) % PAGE_ROWS_AMOUNT) > 0 ? 1 : 0)

  updateCell(data, 'R02G03I', pagesCount)
  updateCell(data, 'HPAGES', pagesCount)
}
function addTempleteForCustomRow (params) {
  params.T1 = [
    `<tr><td class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td><span class="row_num">ROWNUM</span></td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG02##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG03A##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG03##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG04A##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG04##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG5A##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#currencySpanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM##{{{}}}{{/currencySpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG05##ROWNUM##{{{}}}{{/intSpanInput}}</td>
      <td>{{#dateSpanInput}}DECLAR.DECLARBODY.T1RXXXXG06D##ROWNUM##{{{}}}{{/dateSpanInput}}</td>
      <td>{{#dateSpanInput}}DECLAR.DECLARBODY.T1RXXXXG07D##ROWNUM##{{{}}}{{/dateSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG08##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG09##ROWNUM##{{{}}}{{/intSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td  class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1">+</button></td>
      <td> Усього </td>
      <td align="center">х</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G03A{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G03{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G04A{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G04{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G5A{{{}}}{{/currencyInput}}</td>
      <td>{{#currencyInput}}DECLAR.DECLARBODY.R01G5{{{}}}{{/currencyInput}}</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      <td align="center">х</td>
      </tr>`
  ]
}

function getTaxPayersList (params) {
  return UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.taxCode', 'MIN([dateFrom])', 'MAX([dateTo])'])
    .where('orgID', '=', params.organizationID)
    .where('dateFrom', '<=', params.dateTo)
    .where('dateTo', '>=', params.dateFrom)
    .groupBy(['employeeID.taxCode'])
    .selectAsObject({
      'employeeID.taxCode': 'taxCode',
      'MIN([dateFrom])': 'dateFrom',
      'MAX([dateTo])': 'dateTo'
    }).map(item => {
      item.dateFrom = dateService.shiftDate(item.dateFrom)
      item.dateTo = dateService.shiftDate(item.dateTo)
      return item
    })
}

function getTaxPayersSum (params, period) {
  const SQL = `
  SELECT empID "empID", empTaxCodeType "empTaxCodeType", taxCode "taxCode", code, sum(incomeSum) "incomeSum", sum(taxSum) "taxSum",
  min(dateFrom), max(dateTo)
  from (
    select 
      emp.ID as empID, 
      emp.empTaxCodeType empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,tax.incomeSum
      ,tax.taxSum taxSum
      ,empNum.dateFrom
      ,empNum.dateTo  
    from hr_taxIndividAcc tax
    inner join hr_accrual acc on acc.ID = tax.accrualID 
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '26'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateFrom <= :dateTo:
      and empNum.dateTo >= :dateFrom:
      and acc.periodCalcID =:periodID:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
    UNION ALL
    select
      emp.ID as empID, 
      emp.empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,tax.incomeSum incomeSum
      ,tax.taxSum
      ,empNum.dateFrom
      ,empNum.dateTo  
    from hr_taxIndividAcc tax
    inner join hr_accrual acc on acc.ID = tax.accrualID
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '26'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateTo < :dateFrom:
      and acc.periodCalcID =:periodID:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
    UNION ALL
    select 
      emp.ID as empID, 
      emp.empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,acc.paySum incomeSum
      ,0 taxSum
      ,empNum.dateFrom
      ,empNum.dateTo  
    from hr_accrual acc
    inner join hr_payElTaxIndivid individ on individ.payElID = acc.payElID and individ.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = individ.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateFrom <= :dateTo:
      and empNum.dateTo >= :dateFrom:
      and acc.periodCalcID =:periodID:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
      and individ.taxIndividID not in (
        select taxIndividID 
        from hr_payElTaxIndividEntry entry2
        inner join hr_payEl el2 on el2.ID = entry2.payElID
        where entry2.mi_deleteDate >= '9999-12-31'
        and el2.mi_deleteDate >= '9999-12-31'
      )
   UNION ALL
   select 
      emp.ID as empID, 
      emp.empTaxCodeType, 
      emp.taxCode taxCode
      ,dictIncom.code
      ,acc.paySum incomeSum
      ,0 taxSum
      ,empNum.dateFrom
      ,empNum.dateTo  
    from hr_accrual acc
    inner join hr_payElTaxIndivid individ on individ.payElID = acc.payElID and individ.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = individ.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateTo < :dateTo:
      and acc.periodCalcID =:periodID:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
      and individ.taxIndividID not in (
        select taxIndividID 
        from hr_payElTaxIndividEntry entry2
        inner join hr_payEl el2 on el2.ID = entry2.payElID
        where entry2.mi_deleteDate >= '9999-12-31'
        and el2.mi_deleteDate >= '9999-12-31'
      )
    UNION ALL
    select 
       con.ID as empID, 
       'TAXCODE' empTaxCodeType, 
       con.OKPOCode as taxCode
      ,dictTax.code
      ,acc.paySum incomeSum
      ,null taxSum
      ,empNum.dateFrom
      ,empNum.dateTo  
    from hr_accrual acc
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_payRetention ret on acc.employeeNumberID = ret.employeeNumberID
      and acc.payElID = ret.payElID
      and ret.ID = acc.sourceID
    inner join ac_contractor con on con.ID = ret.contractorID
    inner join hr_dictTaxIndivid dictTax on dictTax.code = '140'
    where empNum.orgID = :orgID:
    and acc.periodCalcID =:periodID:
    and acc.source = 'hr_payRetention'
    and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0 
  ) t
  group by empID, empTaxCodeType, taxCode, code
  order by 3,4,7,8
`
  const store = UB.DataStore('hr_taxIndividAcc')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID,
      periodID: period.ID
    })
  const items = store.getAsJsObject()
  store.freeNative()
  return items
}

function getTaxLimitList (params, period) {
  const SQL = `
select
   emp.empTaxCodeType "empTaxCodeType",
  emp.taxCode "taxCode" -- T1RXXXXG02 Податковий номер або серія та номер паспорта
  ,dictIncom.code -- T1RXXXXG05 ознака доходу
  ,limit1.codeForReport as "limit1" -- ID пільги 1
  ,limit2.codeForReport as "limit2" -- ID пільги 2
  ,limit3.codeForReport as "limit3" -- ID пільги 3
from hr_taxIndividAcc tax
inner join hr_accrual acc on acc.ID = tax.accrualID
 join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '26'
inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID
inner join hr_employee emp on emp.ID = empNum.employeeID
inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID
left join hr_taxLimit limit1 on limit1.ID = tax.taxLimitID1
left join hr_taxLimit limit2 on limit2.ID = tax.taxLimitID2
left join hr_taxLimit limit3 on limit3.ID = tax.taxLimitID3
where 
acc.periodCalcID = :periodID:
and empNum.orgID = :orgID:
and empNum.dateFrom <= :dateTo:
and empNum.dateTo >= :dateFrom:
and empNum.mi_deleteDate >= '9999-12-31'
and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
and tax.taxLimitID1 is not null
GROUP BY emp.empTaxCodeType, emp.taxCode, dictIncom.code, limit1.codeForReport, limit2.codeForReport, limit3.codeForReport
  `
  const store = UB.DataStore('hr_taxIndividAcc')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID,
      periodID: period.ID
    })
  const items = store.getAsJsObject()
  store.freeNative()
  return items
}

function getMilitaryTaxSum (params, period) {
  const SQL = ` select 
      emp.taxCode "taxCode",
      sum(acc.paySum) "taxSum"
    FROM hr_accrual acc
    JOIN hr_payEl pe ON pe.ID = acc.payElID 
    JOIN hr_method m ON m.ID = pe.methodID
    JOIN hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID
    JOIN hr_employee emp on emp.ID = empNum.employeeID
    where acc.periodCalcID = :periodID: AND m.code = '27' -- Военный сбор
    and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
    and empNum.orgID = :orgID: and empNum.mi_deleteDate >= '9999-12-31'
    GROUP BY emp.taxCode
  `

  const store = UB.DataStore('hr_accrual')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID,
      periodID: period.ID
    })
  const items = store.getAsJsObject()
  store.freeNative()
  return items
}

function xmlExport ({ data, idx }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  // const formTypeElementName = DECLARBODY.HZ ? 'HZ' : DECLARBODY.HZN ? 'HZN' : 'HZU'

  const formTypeElementName = ['1', 'true'].includes(DECLARBODY.HZ) ? 'HZ' : ['1', 'true'].includes(DECLARBODY.HZN) ? 'HZN' : 'HZU'

  // const attrList = bodyAttrs.filter(aName => ['HZ', 'HZN', 'HZU', 'T1RXXXXG06D', 'T1RXXXXG07D'].indexOf(aName) === -1)
  let attrList = bodyAttrs.filter(aName => [ 'HZ', 'HZN', 'HZU', (['1', 'true'].includes(DECLARBODY.HZ) ? 'T1RXXXXG09' : '') ].indexOf(aName) === -1)
  // del Military data
  if (data.data.repCode !== 'J05104061') {
    attrList = attrList.filter(aName => ['R0205G03A', 'R0205G03', 'R0205G04A', 'R0205G04', 'R0206G03A', 'R0206G03', 'R0206G04A', 'R0206G04'].indexOf(aName) === -1)
  }
  if (formTypeElementName) {
    attrList.splice(2, 0, formTypeElementName)
  }
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
