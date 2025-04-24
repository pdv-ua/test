const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const accrualService = require('../../../../HR/modules/accrualService')

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
  data.detailData = { detailType: 'HR' }
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
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'MY_DATE', 'FIRM_KVED', 'TER_GROM1', 'TER_GROM2',
  'A2010_1', 'A2020_1', 'A2030_1', 'A2040_1', 'A2050_1', 'OBL', 'RAY', 'A2000',
  'REP_PER1', 'MY_DATE', 'S1_1', 'TER_STRUK', 'KVED', 'N1', 'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(params.dateFrom)
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  let paramDateFrom = dateService.shiftDate(params.dateFrom)
  let paramDateTo = dateService.shiftDate(params.dateTo)
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })
  const orgAddress = UB.Repository('ac_address')
    .attrs(['addressType', 'address', 'nameTerGrom'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', 'in', ['1', '2'])
    .selectAsObject()
  const orgAddress1 = orgAddress.find(o => o.addressType === '1') || {}
  const orgAddress2 = orgAddress.find(o => o.addressType === '2') || {}

  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress1.address || DECLARBODY.FIRM_ADR
  DECLARBODY.TER_GROM1 = orgAddress2.nameTerGrom || ''
  DECLARBODY.TER_GROM2 = orgAddress1.nameTerGrom || orgAddress2.nameTerGrom || ''
  DECLARBODY.KVED = DECLARBODY.HKVED
  DECLARBODY.TER_STRUK = orgInfo['hkatottg.code'] || ''
  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = DECLARBODY.MY_DATE = dateService.formatDate(dateService.addMonths(paramDateFrom, 1), 'mmm')

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking']).selectById(params.bosID) : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK_RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']
  if (params.minDebtEmp) {
    DECLARBODY.minDebtEmp = params.minDebtEmp
  }
  const organizations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .whereIf(params.withoutOwnEDRPOU, 'EDRPOUCode', 'startWith', `${orgInfo.OKPOCode}_%`)
      .where('mi_dateFrom', '<=', paramDateTo)
      .where('mi_dateTo', '>=', paramDateFrom)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id).concat([params.organizationID])
    : [params.organizationID]
  let periodN1 = ''
  const periodNames = []
  DECLARBODY.A2000 = DECLARBODY.A2010_1 = DECLARBODY.A2020_1 = DECLARBODY.A2030_1 = DECLARBODY.A2040_1 === 0
  data.detailData['A2010_1'] = {
    data: [],
    columns: [
      { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
      { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
      { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
    ],
    onDate: paramDateTo,
    openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' } ]
  }
  data.detailData['A2020_1'] = {
    data: [],
    columns: [
      { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
      { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
      { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
    ],
    onDate: paramDateTo,
    openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' } ]
  }
  data.detailData['A2030_1'] = {
    data: [],
    columns: [
      { attr: 'eID', entityName: 'hr_employee', name: UB.i18n('Працівник'), descAttr: 'fullFIO', type: 'string', summary: 'count' }
    ],
    openForm: [ { name: 'or', enID: 'enID' } ]
  }
  data.detailData['A2040_1'] = {
    data: [],
    columns: [
      { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
      { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
      { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
    ],
    onDate: paramDateTo,
    openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' } ]
  }
  const minDebt = !params.minDebtEmp ? 0 : params.minDebtEmp
  organizations.forEach(orgID => {
    const period = periodService.getPeriodOnDate(orgID, paramDateFrom)
    let empBalance = UB.Repository('hr_accrualBalance')
      .attrs(['SUM([sumFrom])', 'SUM([sumPay])', 'employeeNumberID.employeeID', 'employeeNumberID'])
      .where('periodCalcID', '=', period.ID)
      .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
      .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
      .logic('([fund] OR [notFund])')
      .groupBy(['employeeNumberID.employeeID', 'employeeNumberID'])
      .selectAsObject()
    let accSum = 0
    let empCount = 0
    const empData = {}
    let employeeNumberIDs = []
    empBalance.forEach(row => {
      const ps = row['SUM([sumFrom])'] > 0 ? accrualService.round(row['SUM([sumFrom])'] - row['SUM([sumPay])']) : 0
      if (ps > minDebt) {
        accSum = accrualService.round(accSum + ps)
        data.detailData['A2010_1'].data.push({ enID: row.employeeNumberID, ps })
        if (!data.detailData['A2030_1'].data.find(o => o.eID === row['employeeNumberID.employeeID'])) {
          empCount++
          data.detailData['A2030_1'].data.push({ eID: row['employeeNumberID.employeeID'] })
        }
        empData[row.employeeNumberID] = [{
          periodID: period.ID,
          periodDate: period.dateFrom,
          sumFrom: row['SUM([sumFrom])'] || 0,
          sumPlus: 0,
          sumPay: row['SUM([sumPay])'] || 0,
          sumMinus: 0,
          sumTo: 0,
          sumSaldo: 0,
          sicknesSum: 0
        }]
        employeeNumberIDs.push(row.employeeNumberID)
      }
    })
    DECLARBODY.A2010_1 = accrualService.round((DECLARBODY.A2010_1 || 0) + accrualService.round(accSum / 1000, 1), 1)
    DECLARBODY.A2030_1 = (DECLARBODY.A2030_1 || 0) + empCount
    const sicknesPayEls = UB.Repository('hr_payEl').attrs(['ID']).where('methodID.code', 'in', ['17', '19', '20', '40', '41', '48']).misc({ __allowSelectSafeDeleted: true }).selectAsObject().map(o => o.ID)

    if (accSum > 0 && sicknesPayEls.length) {
      const firstDayOfYear = dateService.firstDayOfYear(period.dateFrom)
      const periods = [{
        period: Object.assign({}, period),
        sumSaldo: 0,
        sicknesSum: 0
      }]
      let priorPeriod = periodService.getPeriodOnDate(orgID, dateService.addMonths(period.dateFrom, -1))
      while (priorPeriod && employeeNumberIDs.length) {
        const currentEmployeeNumberBalance = UB.Repository('hr_accrualBalance')
          .attrs(['employeeNumberID', 'SUM([sumFrom])', 'SUM([sumPay])', 'SUM([sumPlus])', 'SUM([sumMinus])', 'SUM([sumTo])'])
          .where('employeeNumberID', 'in', employeeNumberIDs)
          .where('periodCalcID', '=', priorPeriod.ID)
          .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
          .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
          .logic('([fund] OR [notFund])')
          .groupBy(['employeeNumberID'])
          .selectAsObject()
        employeeNumberIDs = []
        currentEmployeeNumberBalance.forEach(row => {
          if (accrualService.round((row['SUM([sumFrom])'] || 0) + (row['SUM([sumPlus])'] || 0) - (row['SUM([sumMinus])'] || 0) - (row['SUM([sumPay])'] || 0)) >= minDebt) {
            empData[row.employeeNumberID].push({
              periodID: priorPeriod.ID,
              periodDate: priorPeriod.dateFrom,
              sumFrom: row['SUM([sumFrom])'] || 0,
              sumPlus: row['SUM([sumPlus])'] || 0,
              sumPay: row['SUM([sumPay])'] || 0,
              sumMinus: row['SUM([sumMinus])'] || 0,
              sumTo: row['SUM([sumTo])'] || 0,
              sumSaldo: (row['SUM([sumPlus])'] || 0) - (row['SUM([sumMinus])'] || 0),
              sicknesSum: 0
            })
            employeeNumberIDs.push(row.employeeNumberID)
          }
        })
        let sicknesAccrual = UB.Repository('hr_accrual')
          .attrs(['SUM([paySum])', 'employeeNumberID'])
          .where('[employeeNumberID]', 'in', employeeNumberIDs.length ? employeeNumberIDs : [0])
          .where('[payElID]', 'in', sicknesPayEls)
          .where('periodCalcID', '=', priorPeriod.ID)
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .groupBy(['employeeNumberID'])
          .selectAsObject()
        sicknesAccrual.forEach(row => {
          const empPeriod = empData[row.employeeNumberID].find(o => o.periodID === priorPeriod.ID)
          empPeriod.sicknesSum = accrualService.round((row['SUM([paySum])'] || 0) / empPeriod.sumPlus * empPeriod.sumSaldo)
          empPeriod.sumSaldo = accrualService.round(empPeriod.sumSaldo - empPeriod.sicknesSum)
        })
        if (employeeNumberIDs.length) {
          periods.push({
            period: Object.assign({}, priorPeriod),
            sumSaldo: 0,
            sicknesSum: 0
          })
        }
        priorPeriod = periodService.getPeriodOnDate(orgID, dateService.addMonths(priorPeriod.dateFrom, -1))
      }

      Object.keys(empData).forEach(empNumID => {
        for (let i = empData[empNumID].length - 1; i >= 0; i--) {
          if (empData[empNumID][i].sicknesSum > 0) {
            for (let j = i; j >= 0; j--) {
              if (empData[empNumID][i].sicknesSum > 0) {
                if (empData[empNumID][j].sicknesSum < 0) {
                  let calcSum = accrualService.round(Math.min(empData[empNumID][i].sicknesSum, -1 * empData[empNumID][j].sicknesSum))
                  empData[empNumID][i].sicknesSum = accrualService.round(empData[empNumID][i].sicknesSum - calcSum)
                  empData[empNumID][j].sicknesSum = accrualService.round(empData[empNumID][j].sicknesSum + calcSum)
                }
                if (empData[empNumID][j].sumPay > 0 && empData[empNumID][i].sicknesSum > 0) {
                  let calcSum = Math.min(empData[empNumID][i].sicknesSum, empData[empNumID][j].sumPay)
                  empData[empNumID][i].sicknesSum = accrualService.round(empData[empNumID][i].sicknesSum - calcSum)
                  empData[empNumID][j].sumPay = accrualService.round(empData[empNumID][j].sumPay - calcSum)
                }
              }
            }
          }
          if (empData[empNumID][i].sumSaldo !== 0) {
            for (let j = i; j >= 0; j--) {
              if (empData[empNumID][j].sumPay > 0) {
                let calcSum = Math.min(empData[empNumID][i].sumSaldo, empData[empNumID][j].sumPay)
                empData[empNumID][i].sumSaldo = accrualService.round(empData[empNumID][i].sumSaldo - calcSum)
                empData[empNumID][j].sumPay = accrualService.round(empData[empNumID][j].sumPay - calcSum)
              }
            }
          }
          if (empData[empNumID][i].sicknesSum > 0) {
            const debtPeriod = periods.find(o => o.period.ID === empData[empNumID][i].periodID)
            debtPeriod.sicknesSum = accrualService.round(debtPeriod.sicknesSum + empData[empNumID][i].sicknesSum)
          }
          if (empData[empNumID][i].sumSaldo > 0) {
            const debtPeriod = periods.find(o => o.period.ID === empData[empNumID][i].periodID)
            debtPeriod.sumSaldo = accrualService.round(debtPeriod.sumSaldo + empData[empNumID][i].sumSaldo)
          }
        }
      })
      Object.keys(empData).forEach(empNumID => {
        empData[empNumID].forEach(emp => {
          if (emp.sumSaldo > 0 && emp.periodDate < firstDayOfYear) {
            data.detailData['A2020_1'].data.push({
              enID: Number(empNumID),
              pcID: emp.periodID,
              ps: emp.sumSaldo
            })
          }
          if (emp.sicknesSum > 0) {
            data.detailData['A2040_1'].data.push({
              enID: Number(empNumID),
              pcID: emp.periodID,
              ps: emp.sicknesSum
            })
          }
        })
      })
      let sumSaldo = 0
      let sicknesSum = 0
      let lastYearSumSaldo = 0
      periods.forEach(resPeriod => {
        sicknesSum = accrualService.round(sicknesSum + resPeriod.sicknesSum)
        sumSaldo = accrualService.round(sumSaldo + resPeriod.sicknesSum + resPeriod.sumSaldo)
        if (resPeriod.sumSaldo > 0 && resPeriod.period.dateFrom < firstDayOfYear) {
          lastYearSumSaldo = accrualService.round(lastYearSumSaldo + resPeriod.sicknesSum + resPeriod.sumSaldo)
        }
        resPeriod.sumSaldo = accrualService.round((resPeriod.sicknesSum + resPeriod.sumSaldo) / 1000, 1)
        if (resPeriod.sumSaldo > 0) {
          const periodName = periodNames.find(o => o.dateFrom.getTime() === resPeriod.period.dateFrom.getTime())
          if (periodName) {
            periodName.sum = accrualService.round(periodName.sum + resPeriod.sumSaldo, 1)
          } else {
            periodNames.push({
              name: resPeriod.period.name,
              dateFrom: resPeriod.period.dateFrom,
              sum: resPeriod.sumSaldo
            })
          }
        }
      })
      DECLARBODY.A2020_1 = accrualService.round((DECLARBODY.A2020_1 || 0) + accrualService.round(lastYearSumSaldo / 1000, 1), 1)
      DECLARBODY.A2040_1 = accrualService.round((DECLARBODY.A2040_1 || 0) + accrualService.round(sicknesSum / 1000, 1), 1)
    }
  })

  if (DECLARBODY.A2010_1 > 0) {
    periodN1 = `- ${periodNames.sort((a, b) => {
      return (a.dateFrom < b.dateFrom) ? 1 : (a.dateFrom > b.dateFrom) ? -1 : 0
    }).map(o => `${o.sum} тис.грн за ${o.name}  р.`).join(' , ')}`
  } else {
    DECLARBODY.A2000 = 1
    DECLARBODY.REASON = `Відсутнє явище, яке спостерігається`
  }
  DECLARBODY.N1 = DECLARBODY.A2010_1 > 0 ? `Сума заборгованості ${DECLARBODY.A2010_1} тис.грн ${periodN1}` : ''
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED', 'MY_DATE',
      'OBL', 'RAY', 'S1_1', 'TER_STRUK', 'KVED', 'N1',
      'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'REASON', 'TER_GROM1', 'TER_GROM2'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A1040', 'A2030_1', 'A2000'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A2010_1', 'A2020_1', 'A2040_1', 'A2050_1'],
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
