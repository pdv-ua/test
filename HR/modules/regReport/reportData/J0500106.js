const UB = require('@unitybase/ub')
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')
const reportService = require('../../../../HR/modules/reportService')

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

  DECLARBODY.HZ = params.FORM_TYPE === 'HZ' || params.FORM_TYPE === 'HZD'
  DECLARBODY.HZN = params.FORM_TYPE === 'HZN'
  DECLARBODY.HZU = params.FORM_TYPE === 'HZU'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'
  DECLARBODY.HZKV = parseInt(params.PERIOD_MONTH) / 3
  DECLARBODY.HZY = params.PERIOD_YEAR
  DECLARBODY.HNUM = params.C_DOC_TYPE
  DECLARBODY.HJAR = 5
  DECLARHEAD.C_DOC_CNT = 1
  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HZ', 'HZN', 'HZU', 'HZD', 'HZY', 'HZKV', 'HNUM', 'HNAME', 'HTIN', 'HKATOTTG', 'HNAME1', 'HTIN1', /* 'HFIL', */ 'HLOC',
  'HZIP', 'HTEL', 'HFAX', 'HEMAIL', 'HSTI', 'HKVED',
  'R061G3', 'R061G4', 'R062G3', 'R062G4', 'R063G3', 'R063G4', 'R064G3', 'R064G4', 'R065G3', 'R065G4', 'R066G3', 'R066G4',
  'R08G3', 'R091G3', 'R092G3', 'R093G3', 'R094G3', 'R0105G3', 'R0108G3', 'R0207G3', 'R02011G3', 'R02014G3', 'R02016G3',
  'R0305G3', 'R0307G3', 'HJAR', 'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH',
  'H01', 'H02', 'H03'
].concat([
  'R101G', 'R102G', 'R103G', 'R104G', 'R105G', 'R106G', 'R107G', 'R108G', 'R109G', 'R110G',
  'R0101G', 'R01011G', 'R01012G', 'R01013G', 'R01014G', 'R01015G',
  'R0102G', 'R01021G', 'R01022G', 'R01023G', 'R01024G', 'R01025G',
  'R0103G', 'R01031G', 'R01032G', 'R01033G', 'R01034G', 'R01035G', 'R01036G', 'R010321G', 'R010331G', 'R010341G',
  'R0104G', 'R01041G', 'R010411G', 'R010412G', 'R010413G', 'R01042G', 'R01043G',
  'R01051G',
  'R0106G', 'R01061G', 'R010611G', 'R010612G', 'R010613G', 'R01062G', 'R01063G',
  'R0107G',
  'R0201G', 'R0202G', 'R02021G', 'R02022G', 'R0203G', 'R0204G', 'R02041G', 'R02042G',
  'R0205G', 'R02051G', 'R02052G', 'R0206G', 'R02061G', 'R02062G',
  'R02071G',
  'R0208G', 'R02081G', 'R02082G',
  'R0209G', 'R02091G', 'R02092G',
  'R02010G', 'R020101G', 'R020102G',
  'R020111G',
  'R02012G', 'R020121G', 'R020122G',
  'R02013G', 'R02015G',
  'R0301G', 'R0302G', 'R0303G', 'R0304G', 'R03051G', 'R0306G'
].reduce((arr, el) => {
  for (let i = 3; i <= 5; i++) {
    arr.push(`${el}${i}`)
  }
  return arr
}, []))

const cellFormats = [
  {
    names: ['HNAME', 'HTIN', 'HLOC', 'HSTI', 'HKVED', 'R08G3', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HDDGV', 'HNDGV', 'HKATOTTG', 'HNAME1', 'HTIN1', 'HZIP', 'HTEL', 'HFAX', 'HEMAIL', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZ', 'HZN', 'HZU', 'HZD', 'HZY', 'HZKV', 'HNUM', 'HJAR',
      'H01', 'H02', 'H03'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['HFIL', 'R061G3', 'R061G4', 'R062G3', 'R062G4', 'R063G3', 'R063G4',
      'R064G3', 'R064G4', 'R065G3', 'R065G4', 'R066G3', 'R066G4', 'R091G3', 'R092G3', 'R093G3', 'R094G3']
      .concat(['R101G', 'R102G', 'R103G', 'R104G', 'R105G', 'R106G', 'R107G', 'R108G',
        'R109G', 'R110G']
        .reduce((arr, el) => {
          for (let i = 3; i <= 5; i++) {
            arr.push(`${el}${i}`)
          }
          return arr
        }, [])),
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['R0105G3', 'R0108G3', 'R0207G3', 'R02011G3', 'R02014G3', 'R02016G3', 'R0305G3', 'R0307G3'].concat(['R0101G', 'R01011G', 'R01012G', 'R01013G', 'R01014G', 'R01015G',
      'R0102G', 'R01021G', 'R01022G', 'R01023G', 'R01024G', 'R01025G',
      'R0103G', 'R01031G', 'R01032G', 'R01033G', 'R01034G', 'R01035G', 'R01036G', 'R010321G', 'R010331G', 'R010341G',
      'R0104G', 'R01041G', 'R010411G', 'R010412G', 'R010413G', 'R01042G', 'R01043G',
      'R01051G',
      'R0106G', 'R01061G', 'R010611G', 'R010612G', 'R010613G', 'R01062G', 'R01063G',
      'R0107G',
      'R0201G', 'R0202G', 'R02021G', 'R02022G', 'R0203G', 'R0204G', 'R02041G', 'R02042G',
      'R0205G', 'R02051G', 'R02052G', 'R0206G', 'R02061G', 'R02062G',
      'R02071G',
      'R0208G', 'R02081G', 'R02082G',
      'R0209G', 'R02091G', 'R02092G',
      'R02010G', 'R020101G', 'R020102G',
      'R020111G',
      'R02012G', 'R020121G', 'R020122G',
      'R02013G', 'R02015G',
      'R0301G', 'R0302G', 'R0303G', 'R0304G', 'R03051G', 'R0306G'
    ]
      .reduce((arr, el) => {
        for (let i = 3; i <= 5; i++) {
          arr.push(`${el}${i}`)
        }
        return arr
      }, [])),
    format: {
      type: 'number',
      nillable: true,
      precision: 2
    }
  }
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J0500106.xsd'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARBODY } = data.DECLAR

  // add non std data for org
  const infoByOrg = UB.Repository('ac_organization')
    .attrs(['orgBusinessTypeID.code', 'ECBCode'])
    .selectById(params.organizationID) || {}
  const infoByAcc = UB.Repository('hr_payObligatory')
    .attrs(['orgAccountID.bankID.MFO', 'orgAccountID.bankID.name', 'orgAccountID.code'])
    .where('organizationID', '=', params.organizationID)
    .where('type', '=', '3')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.H01 = infoByOrg['orgBusinessTypeID.code'] === 'БУ'
  DECLARBODY.HNREG = infoByOrg.ECBCode
  DECLARBODY.HBANKNAME = infoByAcc['orgAccountID.bankID.name']
  DECLARBODY.HMFO = infoByAcc['orgAccountID.bankID.MFO']
  DECLARBODY.HBANKACC = infoByAcc['orgAccountID.code']
  DECLARBODY.HKATOTTG = DECLARBODY.HKOATUU
  DECLARBODY.R08G3 = DECLARBODY.CLASSRISK

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']
  DECLARBODY.R061G3 = DECLARBODY.R064G3 = DECLARBODY.R066G3 = params.FORM_TYPE === 'HZD' ? 1 : 3
  DECLARBODY.R065G3 = 1
  DECLARBODY.R091G3 = infoByOrg['orgBusinessTypeID.code'] !== 'БУ' ? 1 : 0
  DECLARBODY.R092G3 = infoByOrg['orgBusinessTypeID.code'] === 'БУ' ? 1 : 0

  const reportParams = reportService.getReportParams(params.organizationID, ['notAvgQuantity', 'ECBVAC', 'ECBR012G3', 'ECBR011G3', 'ECBR013G3', 'ECBR014G3', 'ECBR015G3'])
  reportParams.ECBR011G3IDs.push(...reportParams.ECBVACIDs)
  const periods = periodService.getPeriodsByDate(params.organizationID, params.dateFrom, params.dateTo)

  periods.forEach((period, idx) => {
    const m = idx + 3

    const empCount = reportService.getEmpCount(params.organizationID, null, period.dateFrom, period.dateTo, reportParams.notAvgQuantityIDs, ['1'])
    DECLARBODY[`R101G${m}`] = empCount.count
    DECLARBODY[`R102G${m}`] = empCount.invalid
    DECLARBODY[`R103G${m}`] = empCount.addGuarant
    DECLARBODY[`R104G${m}`] = new Set(empCount.empPosData.filter(posData => posData.isMainWork).map(posData => posData.employeeID)).size
    DECLARBODY[`R110G${m}`] = '0'

    const esvDatas = UB.Repository('hr_accrualFund')
      .where('[orgID]', '=', params.organizationID)
      .where('[periodCalcID]', '=', period.ID)
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
      .attrs(['payFundID', 'payFundID.code', 'sourceSum', 'baseSum', 'addMinSum', 'paySum', 'rate', 'employeeNumberID', 'employeeNumberID.employeeID'])
      .selectAsObject()

    const empWithSpecialCodes = new Set(esvDatas.filter(esvData => reportParams.ECBR011G3IDs.indexOf(esvData['payFundID']) >= 0).map(esvData => esvData['employeeNumberID.employeeID']))
    DECLARBODY[`R105G${m}`] = new Set(empCount.empPosData.filter(posData => empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size
    DECLARBODY[`R109G${m}`] = new Set(empCount.empPosData.filter(posData => posData.isMan && empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size
    DECLARBODY[`R108G${m}`] = new Set(empCount.empPosData.filter(posData => posData.isWoman && empWithSpecialCodes.has(posData.employeeID)).map(posData => posData['employeeID'])).size
    esvDatas.forEach(row => {
      if (reportParams.ECBR011G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY[`R01011G${m}`] = accrualService.round((DECLARBODY[`R01011G${m}`] || 0) + row.sourceSum, 6)
      if (reportParams.ECBR012G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY[`R01012G${m}`] = accrualService.round((DECLARBODY[`R01012G${m}`] || 0) + row.sourceSum, 6)
      if (reportParams.ECBR013G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY[`R01013G${m}`] = accrualService.round((DECLARBODY[`R01013G${m}`] || 0) + row.sourceSum, 6)
      if (reportParams.ECBR014G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY[`R01014G${m}`] = accrualService.round((DECLARBODY[`R01014G${m}`] || 0) + row.sourceSum, 6)
      if (reportParams.ECBR015G3IDs.indexOf(row['payFundID']) >= 0) DECLARBODY[`R01015G${m}`] = accrualService.round((DECLARBODY[`R01015G${m}`] || 0) + row.sourceSum, 6)

      switch (row.rate) {
        case 22:
          DECLARBODY[`R01021G${m}`] = accrualService.round((DECLARBODY[`R01021G${m}`] || 0) + row.baseSum - row.addMinSum, 6)
          DECLARBODY[`R01031G${m}`] = accrualService.round((DECLARBODY[`R01031G${m}`] || 0) + row.paySum - (row.addMinSum || 0) * row.rate / 100, 6)
          DECLARBODY[`R01035G${m}`] = accrualService.round((DECLARBODY[`R01035G${m}`] || 0) + ((row.addMinSum >= 0 ? row.addMinSum : 0) || 0) * row.rate / 100, 6)
          if (row.addMinSum < 0) {
            DECLARBODY[`R01061G${m}`] = accrualService.round((DECLARBODY[`R01061G${m}`] || 0) + (-1 * (row.addMinSum || 0)) * row.rate / 100, 6)
          }
          break
        case 8.41:
          DECLARBODY[`R01022G${m}`] = accrualService.round((DECLARBODY[`R01022G${m}`] || 0) + row.baseSum - (row.addMinSum || 0), 6)
          DECLARBODY[`R01032G${m}`] = accrualService.round((DECLARBODY[`R01032G${m}`] || 0) + row.paySum, 6)
          DECLARBODY[`R010321G${m}`] = accrualService.round((DECLARBODY[`R01022G${m}`] || 0) * 0.22, 6)
          break
        case 5.3:
          DECLARBODY[`R01023G${m}`] = accrualService.round((DECLARBODY[`R01023G${m}`] || 0) + row.baseSum - (row.addMinSum || 0), 6)
          DECLARBODY[`R01033G${m}`] = accrualService.round((DECLARBODY[`R01033G${m}`] || 0) + row.paySum, 6)
          break
        case 5.5:
          DECLARBODY[`R01024G${m}`] = accrualService.round((DECLARBODY[`R01024G${m}`] || 0) + row.baseSum - (row.addMinSum || 0), 6)
          DECLARBODY[`R01034G${m}`] = accrualService.round((DECLARBODY[`R01034G${m}`] || 0) + row.paySum, 6)
          break
      }
      DECLARBODY[`R01025G${m}`] = accrualService.round((DECLARBODY[`R01025G${m}`] || 0) + (row.addMinSum >= 0 ? row.addMinSum : 0), 6)
      DECLARBODY[`R01041G${m}`] = DECLARBODY[`R01042G${m}`] = DECLARBODY[`R01043G${m}`] = 0
    })
  })
}

function xmlExport ({ data }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', { })
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<Не корректні дані для вивантаження>>>`)
  }
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  const firmTypeElementName = data.data.DECLAR.DECLARBODY.H01 === 1 || data.data.DECLAR.DECLARBODY.H01 === 'true'
    ? 'H01' : data.data.DECLAR.DECLARBODY.H02 === 1 || data.data.DECLAR.DECLARBODY.H02 === 'true'
      ? 'H02' : data.data.DECLAR.DECLARBODY.H03 === 1 || data.data.DECLAR.DECLARBODY.H03 === 'true' ? 'H03' : null

  const attrList = allBodyAttrNames.filter(aName => aName !== 'H01' && aName !== 'H02' && aName !== 'H03')
  if (data.data.DECLAR.DECLARHEAD.PERIOD_YEAR < 2021) {
    attrList.push('HFIL')
  }
  if (firmTypeElementName) {
    attrList.splice(6, 0, firmTypeElementName)
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

function addTempleteForCustomRow (params) {
  params.T1 = [
    `<tr><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px;" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
                <td class="aroundBorder" align="center"><span class="row_num">ROWNUM</span></td>
                <td class="aroundBorder" align="left">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG2S##ROWNUM##{{{}}}{{/textInput}}</td>
            </tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td style="padding: 3px 5px 0 0; text-align: right; border-width: 1px; height: 18px;" class="no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button></td>
      </tr>`
  ]
}
