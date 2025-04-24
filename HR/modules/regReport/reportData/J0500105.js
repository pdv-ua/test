const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, setHeadData, getCellSettings, updateCell, updateCellInArray, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const glService = require('../../../../GL/modules/glService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

const bodyAttrs = [
  'HTIN',
  'HPAGES',
  'HZ', 'HZN', 'HZU',

  'HNAME',
  'HLOC',
  'HSTI',
  'HZKV', 'HZY',

  'R00G01I', 'R00G02I', 'R00G03I',

  'T1RXXXXG02', 'T1RXXXXG03A', 'T1RXXXXG03', 'T1RXXXXG04A', 'T1RXXXXG04', 'T1RXXXXG05', 'T1RXXXXG06D', 'T1RXXXXG07D', 'T1RXXXXG08', 'T1RXXXXG09',

  'R01G03A', 'R01G03', 'R01G04A', 'R01G04',
  'R0201G03A', 'R0201G04A', 'R0201G04',
  'R0202G03A', 'R0202G04A', 'R0202G04',
  'R0203G03A', 'R0203G03', 'R0203G04A', 'R0203G04',
  'R0204G03A', 'R0204G03', 'R0204G04A', 'R0204G04',
  'R0205G03A', 'R0205G03', 'R0205G04A', 'R0205G04',
  'R0206G03A', 'R0206G03', 'R0206G04A', 'R0206G04',

  'R02G01I', 'R02G02I', 'R02G03I',

  'HFILL', 'HKBOS', 'HBOS', 'HTELBOS',
  'HKBUH', 'HBUH', 'HTELBUH'
]

const cellFormats = [
  {
    names: [
      'HTIN', 'HNAME', 'HLOC', 'HSTI', 'T1RXXXXG08',
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
      'T1RXXXXG03A', 'T1RXXXXG03', 'T1RXXXXG04A', 'T1RXXXXG04',
      'R01G03A', 'R01G03', 'R01G04A', 'R01G04',
      'R0201G03A', 'R0201G04A', 'R0201G04',
      'R0202G03A', 'R0202G04A', 'R0202G04',
      'R0203G03A', 'R0203G03', 'R0203G04A', 'R0203G04',
      'R0204G03A', 'R0204G03', 'R0204G04A', 'R0204G04',
      'R0205G03A', 'R0205G03', 'R0205G04A', 'R0205G04',
      'R0206G03A', 'R0206G03', 'R0206G04A', 'R0206G04'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  },
  {
    names: [
      'HPAGES',
      'HZ', 'HZN', 'HZU',
      'HZKV', 'HZY',
      'R00G01I', 'R00G02I', 'R00G03I',
      'R02G01I', 'R02G02I', 'R02G03I'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: [
      'T1RXXXXG09'
    ],
    format: {
      type: 'number',
      nillableValue: '0',
      nillable: true,
      precision: 0
    }
  }
]

function generateData (params = {}) {
  params.dateFrom = new Date(Date.UTC(params.PERIOD_YEAR, ((parseInt(params.PERIOD_MONTH) / 3) - 1) * 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(params.PERIOD_YEAR, params.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
  const { taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerTaxCode, taxPayersContainerPassport, tabCountPassport, tabCountTaxCode } = getAllData({}, params)

  let tabsData = []

  let k = 1
  for (let i = 0; i < tabCountTaxCode + tabCountPassport; i++) {
    const errorMessages = []
    const data = prepareStructureReport()
    const { PARAMS } = data.DECLAR
    setHeadData({ data, params })
    data.cellSettings = getCellSettings(params.repConfig.dictRepID)
    addTempleteForCustomRow(PARAMS)

    // params.Military = 'Military'
    if (i === 0) {
      addTemplateMilitary(PARAMS)
    }

    prepareMainData(data, params)

    if (i < tabCountTaxCode) {
      prepareData(data, params, taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerTaxCode, i + 1, i + 1)
    } else {
      prepareData(data, params, taxPayersList, taxLimitList, taxPayersSum, taxPayersContainerPassport, i + 1, k)
      k++
    }

    tabsData.push({ data, errorMessages })
  }
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
    'xsi:noNamespaceSchemaLocation': 'J0500105.xsd'
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
    .selectSingle() || {}
  DECLARBODY.HLOC = orgAddress['address']

  DECLARBODY.HZ = params.C_DOC_STAN === '1'
  DECLARBODY.HZN = params.C_DOC_STAN === '2'
  DECLARBODY.HZU = params.C_DOC_STAN === '3'

  DECLARBODY.HZKV = parseInt(params.PERIOD_MONTH) / 3

  DECLARBODY.HZY = params.PERIOD_YEAR

  DECLARHEAD.LINKED_DOCS = {
    $: {
      'xsi:nil': 'true'
    }
  }

  DECLARHEAD.D_FILL = moment().format('DDMMYYYY')

  DECLARBODY.HFILL = moment(params.HFILL).format('DDMMYYYY')
  params.dateFrom = new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, (DECLARBODY.HZKV - 1) * 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}
function addMutualSettlements (entityName, data, params) {
  const mutualSettlements = UB.Repository(`${entityName}Dt`)
    .attrs(['contractorID.OKPOCode', 'dictCodePersonIncID.code', 'totalSum1', 'totalSum2', 'totalSum3', 'totalSum4'])
    .where('docMutualSettleID.organizationID', '=', params.organizationID)
    .where('docMutualSettleID.docState', '=', 'POSTED')
    .where('docMutualSettleID.docState', '=', 'POSTED')
    .where('docMutualSettleID.dateFrom', '<=', params.dateTo)
    .where('docMutualSettleID.dateTo', '>=', params.dateFrom)
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

function getAllData (data, params) {
  const taxPayersList = getTaxPayersList(params)
  const taxLimitList = getTaxLimitList(data, params)
  const taxPayersSum = getTaxPayersSum(data, params)
  const taxPayersContainer = taxPayersSum.reduce((res, item) => {
    if (!params.isInclude157 && item.code === 157) {
      return res
    }
    item.recordFlag = 0
    const taxPayer = taxPayersList.find(period => period.taxCode === item.taxCode)
    if (taxPayer) {
      item.dateFrom = taxPayer.dateFrom >= params.dateFrom && taxPayer.dateFrom <= params.dateTo ? taxPayer.dateFrom : null
      item.dateTo = taxPayer.dateTo <= params.dateTo ? taxPayer.dateTo : null
    }
    const taxLimit = taxLimitList.find(limit => limit.taxCode === item.taxCode && limit.code === item.code)
    if (taxLimit) {
      item.taxLimit = taxLimit.limit1
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
    addMutualSettlements(`sia_docMutualSettlements`, taxPayersContainer, params)
  }

  const taxPayersContainerTaxCode = taxPayersContainer.filter(el => el.empTaxCodeType === 'TAXCODE' && el.taxCode && el.taxCode.length === 10)
  const taxPayersContainerPassport = taxPayersContainer.filter(el => !(el.empTaxCodeType === 'TAXCODE' && el.taxCode && el.taxCode.length === 10))

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
  const militaryTaxSum = getMilitaryTaxSum(data, params)
  militaryTaxSum.forEach((row, idx) => {
    updateCell(data, row['recordFlag'] ? 'R0206G03A' : 'R0205G03A', row['incomeSum'])
    updateCell(data, row['recordFlag'] ? 'R0206G03' : 'R0205G03', row['incomeSum'] /* row['incomePaidSum'] */)
    updateCell(data, row['recordFlag'] ? 'R0206G04A' : 'R0205G04A', row['taxSum'])
    updateCell(data, row['recordFlag'] ? 'R0206G04' : 'R0205G04', row['taxSum'] /* row['taxPaidSum'] */)
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
  params.T1 = `
    <tr style="height: 16px;">
      <td class="a-right">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button>
      </td>
      <td colspan="1" class="b a-center">
        <span class="row_num">ROWNUM</span>
      </td>
      <td colspan="5" class="b">
        {{#textInput}}DECLAR.DECLARBODY.T1RXXXXG02##ROWNUM##{{{}}}{{/textInput}}
      </td>
      <td colspan="2" class="b">
        {{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG03A##ROWNUM##{{{}}}{{/currencyInput}}
      </td>
      <td colspan="2" class="b">
        {{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG03##ROWNUM##{{{}}}{{/currencyInput}}
      </td>
      <td colspan="2" class="b">
        {{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG04A##ROWNUM##{{{}}}{{/currencyInput}}
      </td>
      <td colspan="2" class="b">
        {{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG04##ROWNUM##{{{}}}{{/currencyInput}}
      </td>
      <td colspan="2" class="b">
        {{#intInput}}DECLAR.DECLARBODY.T1RXXXXG05##ROWNUM##{{{}}}{{/intInput}}
      </td>
      <td colspan="2" class="b">
        {{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG06D##ROWNUM##{{{}}}{{/dateInput}}
      </td>
      <td colspan="2" class="b">
        {{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG07D##ROWNUM##{{{}}}{{/dateInput}}
      </td>
      <td colspan="2" class="b">
        {{#textInput}}DECLAR.DECLARBODY.T1RXXXXG08##ROWNUM##{{{}}}{{/textInput}}
      </td>
      <td class="b">
        {{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG09##ROWNUM##{"printType":"number"}{{{}}}{{/booleanInput}}
      </td>
    </tr>
  `
  params.T1BtnAddRow = `
    <tr class="no-print">
      <td class="a-right" style="height: 18px;">
        <button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button>
      </td>
      <td colspan="23"></td>
    </tr>
  `
}

function addTemplateMilitary (params) {
  params.Military = `<tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Військовий збір</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G03{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0205G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>
            <tr><td></td>
            <td colspan="1" class="b a-center">x</td>
            <td colspan="5" class="b">Військовий збір - виключення<sup>****</sup></td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G03{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04A{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">{{#currencyInput}}DECLAR.DECLARBODY.R0206G04{{{}}}{{/currencyInput}}</td>
          <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td colspan="2" class="b a-center">x</td>
            <td class="b a-center">x</td>
            </tr>`
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

function getTaxPayersSum (data, params) {
  const SQL = `
  SELECT empID "empID", empTaxCodeType "empTaxCodeType", taxCode "taxCode", code, sum(incomeSum) "incomeSum", sum(taxSum) "taxSum"
  from (
    select 
      emp.ID as empID, 
      emp.empTaxCodeType empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,tax.incomeSum
      ,tax.taxSum taxSum
    from hr_taxIndividAcc tax
    inner join hr_accrual acc on acc.ID = tax.accrualID 
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '26'
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID and per.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateFrom <= :dateTo:
      and empNum.dateTo >= :dateFrom:
      and per.dateFrom between :dateFrom: and :dateTo:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
    UNION ALL
    select
      emp.ID as empID, 
      emp.empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,tax.incomeSum incomeSum
      ,tax.taxSum
    from hr_taxIndividAcc tax
    inner join hr_accrual acc on acc.ID = tax.accrualID
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '26'
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID and per.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateTo < :dateFrom:
      and per.dateFrom between :dateFrom: and :dateTo:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
    UNION ALL
    select 
      emp.ID as empID, 
      emp.empTaxCodeType, 
      emp.taxCode
      ,dictIncom.code
      ,acc.paySum incomeSum
      ,0 taxSum
    from hr_accrual acc
    inner join hr_payElTaxIndivid individ on individ.payElID = acc.payElID and individ.mi_deleteDate >= '9999-12-31'
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID and per.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = individ.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateFrom <= :dateTo:
      and empNum.dateTo >= :dateFrom:
      and per.dateFrom between :dateFrom: and :dateTo:
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
    from hr_accrual acc
    inner join hr_payElTaxIndivid individ on individ.payElID = acc.payElID and individ.mi_deleteDate >= '9999-12-31'
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID and per.mi_deleteDate >= '9999-12-31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_employee emp on emp.ID = empNum.employeeID and emp.mi_deleteDate >= '9999-12-31'
    inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = individ.taxIndividID and dictIncom.mi_deleteDate >= '9999-12-31'
    where empNum.orgID = :orgID:
      and empNum.dateTo < :dateTo:
      and per.dateFrom between :dateFrom: and :dateTo:
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
    from hr_accrual acc
    join hr_payEl pe on pe.ID = acc.payElID
    join hr_method m on m.ID = pe.methodID and m.code = '31'
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID and empNum.mi_deleteDate >= '9999-12-31'
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID and per.mi_deleteDate >= '9999-12-31'
    inner join hr_payRetention ret on acc.employeeNumberID = ret.employeeNumberID
      and acc.payElID = ret.payElID
      and ret.ID = acc.sourceID
    inner join ac_contractor con on con.ID = ret.contractorID
    inner join hr_dictTaxIndivid dictTax on dictTax.code = '140'
    where empNum.orgID = :orgID:
    and acc.source = 'hr_payRetention'
    and per.dateFrom between :dateFrom: and :dateTo: 
    and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0 
  ) t
  group by empID, empTaxCodeType, taxCode, code
  order by taxCode
`
  const store = UB.DataStore('hr_taxIndividAcc')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID
    })
  const items = store.getAsJsObject()
  store.freeNative()
  return items
}

function getTaxLimitList (data, params) {
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
inner join hr_dictPeriod per on per.ID = acc.periodCalcID
inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID
inner join hr_employee emp on emp.ID = empNum.employeeID
inner join hr_dictTaxIndivid dictIncom on dictIncom.ID = tax.taxIndividID
left join hr_taxLimit limit1 on limit1.ID = tax.taxLimitID1
left join hr_taxLimit limit2 on limit2.ID = tax.taxLimitID2
left join hr_taxLimit limit3 on limit3.ID = tax.taxLimitID3
where empNum.orgID = :orgID:
and empNum.dateFrom <= :dateTo:
and empNum.dateTo >= :dateFrom:
and empNum.mi_deleteDate >= '9999-12-31'
and per.dateFrom between :dateFrom: and :dateTo:
and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
and taxLimitID1 is not null
GROUP BY emp.empTaxCodeType, emp.taxCode, dictIncom.code, limit1.codeForReport, limit2.codeForReport, limit3.codeForReport
  `
  const store = UB.DataStore('hr_taxIndividAcc')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID
    })
  const items = store.getAsJsObject()
  store.freeNative()
  return items
}

function getMilitaryTaxSum (data, params) {
  const SQL = ` select
      sum(case when (acc.flagsRec & 1024) <> 0 then -acc.baseSum else acc.baseSum end) "incomeSum" -- Сумма облагаемого дохода
      ,sum(acc.paySum) "taxSum" -- Сумма военного сбора
    from hr_accrual acc
    inner join hr_dictPeriod per on per.ID = acc.periodCalcID
    inner join hr_employeeNumber empNum on empNum.ID = acc.employeeNumberID
    where empNum.orgID = :orgID:
      and empNum.mi_deleteDate >= '9999-12-31'
      and per.dateFrom between :dateFrom: and :dateTo:
      and acc.flagsRec & 4096 = 0 and acc.flagsRec & 8192 = 0
      and acc.payElID in (
        select payEl.ID
        from hr_payEl payEl
        inner join hr_method method on method.ID = payEl.methodID
        where method.code = '27' -- Военный сбор
      )
  `

  const store = UB.DataStore('hr_accrual')
  store.runSQL(SQL,
    {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      orgID: params.organizationID
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
  if (data.data.repCode !== 'J05001051') {
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
  DECLARHEAD.C_DOC_CNT = idx
  const xmlFileName = `${generateFileName(DECLARHEAD)}.xml`
  return { xmlData, xmlFileName }
}
