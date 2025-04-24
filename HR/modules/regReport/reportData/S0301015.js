const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const periodService = require('../../../../HR/modules/periodService')
const reportService = require('../../../../HR/modules/reportService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')

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
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'REP_PERNM', 'FIRM_KVED', 'TER_GROM1', 'TER_GROM2',
  'A1020', 'A1030', 'A1040', 'A1060', 'A1070', 'NOMER', 'N_1', 'N_2', 'N_3', 'OBL', 'RAY', 'TER_STRUK',
  'REP_PER1', 'S1_1', 'TER_STRUK', 'KVED', 'N1', 'N2', 'RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'ZERO_ZVI',
  'REASON2', 'REASON3', 'REASON4', 'REASON5', 'REASON6', 'KATOTTG', 'KATOTTG_FACT'
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
  const sqlDialect = entityBaseService.getSQLDialect()
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ
  let paramDateFrom = dateService.shiftDate(params.dateFrom)
  let paramDateTo = dateService.shiftDate(params.dateTo)
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })

  // add non std data for org
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
  DECLARBODY.TER_GROM1 = orgAddress2.nameTerGrom || ''
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress1.address || DECLARBODY.FIRM_ADR
  DECLARBODY.TER_GROM2 = orgAddress1.nameTerGrom || orgAddress2.nameTerGrom || ''
  DECLARBODY.N_3 = orgAddress1.address || DECLARBODY.FIRM_ADR
  DECLARBODY.N_2 = DECLARBODY.HKVED_S
  DECLARBODY.KVED = DECLARBODY.HKVED || orgInfo['hkved']
  DECLARBODY.TER_STRUK = DECLARBODY.HKOATUU || orgInfo['hkoatuu']
  DECLARBODY.FIRM_KVED = DECLARBODY.KVED
  DECLARBODY.FIRM_SPATO = DECLARBODY.TER_STRUK

  DECLARBODY.TER_STRUK = orgInfo['hkatottg.code'] || ''

  DECLARBODY.FIRM_FAXORG = orgInfo['fax']

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PER1 = UB.Repository('ac_dictRepType')
    .where('[periodType]', '=', DECLARHEAD.PERIOD_TYPE)
    .where('[periodMonth]', '=', DECLARBODY.REP_PER1)
    .attrs(['name'])
    .selectScalar()

  const bos = (params.respID)
    ? UB.Repository('hr_employeeNumberS')
      .attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID', 'employeeID.phoneWorking'])
      .selectById(params.respID)
    : {}
  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', '=', 'email')
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  const reportParams = reportService.getReportParams(params.organizationID, ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', 'notFOPS03'])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const pdfoTaxIndividIDs = UB.Repository('hr_payElTaxIndividEntry')
    .where('[payElID.methodID.code]', '=', '26')
    .attrs(['taxIndividID'])
    .selectAsObject()
    .map(row => row.taxIndividID)

  const pdfoPayElIDs = (fopPayElIDs.length ? UB.Repository('hr_payElTaxIndivid')
    .where('[taxIndividID]', 'in', pdfoTaxIndividIDs)
    .where('[payElID]', 'in', fopPayElIDs)
    .attrs('payElID')
    .selectAsObject() : [])
    .map(row => row.payElID)

  const organizations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .whereIf(params.dictOrgGroupId, 'dictOrgGroupId', '=', params.dictOrgGroupId)
      .whereIf(params.withoutOwnEDRPOU, 'EDRPOUCode', 'startWith', `${orgInfo.OKPOCode}_%`)
      .where('mi_dateFrom', '<=', paramDateTo)
      .where('mi_dateTo', '>=', paramDateFrom)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id).concat([params.organizationID])
    : [params.organizationID]

  let keys = ['A1020', 'A1070']
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
      onDate: paramDateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' }, { name: 'pe', plID: 'plID' } ]
    }
  })
  keys = ['A1030']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Розрахунковий період'), descAttr: 'name', type: 'string' },
        { attr: 'psID', entityName: 'hr_dictPeriod', name: UB.i18n('Обліковий період'), descAttr: 'name', type: 'string' },
        { attr: 'plID', entityName: 'hr_payEl', name: UB.i18n('Вид оплати'), descAttr: 'description', type: 'string' },
        { attr: 'tiID', entityName: 'hr_dictTaxIndivid', name: UB.i18n('Вид доходів'), descAttr: 'name', type: 'string' },
        { attr: 'bs', entityName: null, name: UB.i18n('Базова сума'), type: 'float', summary: 'sum' },
        { attr: 'prs', entityName: null, name: UB.i18n('Пільга'), type: 'float', summary: 'sum' },
        { attr: 'fs', entityName: null, name: UB.i18n('Неоподаткована сума'), type: 'float', summary: 'sum' },
        { attr: 'ps', entityName: null, name: UB.i18n('Сума'), type: 'float', summary: 'sum' }
      ],
      onDate: paramDateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'rl', enID: 'enID', pcID: 'pcID' }, { name: 'pe', plID: 'plID' } ]
    }
  })
  keys = ['A1040']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' },
        { attr: 'c', entityName: null, name: UB.i18n('Середньооблікова чисельність'), type: 'float', summary: 'sum' }
        /* { attr: 'dC', entityName: null, name: UB.i18n('Днів'), type: 'float', summary: 'sum' },
                { attr: 'eC', entityName: null, name: UB.i18n('Виключення днів'), type: 'float', summary: 'sum' } */
      ],
      onDate: paramDateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })
  keys = ['A1060']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'pcID', entityName: 'hr_dictPeriod', name: UB.i18n('Період'), descAttr: 'name', type: 'string' },
        { attr: 'h', entityName: null, name: UB.i18n('Кількість годин'), type: 'float', summary: 'sum' }
      ],
      onDate: paramDateTo,
      openForm: [ { name: 'or', enID: 'enID' }, { name: 'ts', enID: 'enID', pcID: 'pcID' } ]
    }
  })

  organizations.forEach(orgID => {
    const period = periodService.getPeriodOnDate(orgID, paramDateFrom)
    // calculate fop sum
    // let A1020Sum = 0
    const accruals = UB.Repository('hr_accrual')
      .where('[orgID]', '=', orgID)
      .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .where('periodCalcID', '=', period.ID, 'case1')
      .where('periodSalary', '<=', paramDateTo, 'cond1')
      .where('periodCalc', '<', paramDateFrom, 'case2')
      .where('periodSalaryID', '=', period.ID, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.empWorkPlace]', 'isNull')
      .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
      .attrs(['employeeNumberID', 'payElID', 'periodSalaryID', 'periodCalcID', 'SUM([paySum])'])
      .groupBy(['employeeNumberID', 'periodCalcID', 'periodSalaryID', 'payElID'])
      .selectAsObject({
        'employeeNumberID': 'enID',
        'payElID': 'plID',
        'periodSalaryID': 'psID',
        'periodCalcID': 'pcID',
        'SUM([paySum])': 'ps'
      })
    data.detailData['A1020'].data.push(...accruals)

    DECLARBODY.A1020 = (DECLARBODY.A1020 || 0) + Math.round((UB.Repository('hr_accrual')
      .attrs(['SUM([paySum])'])
      .where('[orgID]', '=', orgID)
      .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .where('periodCalcID', '=', period.ID, 'case1')
      .where('periodSalary', '<=', paramDateTo, 'cond1')
      .where('periodCalc', '<', paramDateFrom, 'case2')
      .where('periodSalaryID', '=', period.ID, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.empWorkPlace]', 'isNull')
      .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
      .selectScalar() || 0) / 100) / 10
    // load pdfo by employee+period
    const accrualStore = UB.DataStore('hr_accrual')
    accrualStore.runSQL(`
      SELECT t.periodSalaryID "periodSalaryID", t.employeeNumberID "employeeNumberID", SUM(t.paySum) "paySum", t.taxIndividID "taxIndividID"
      FROM ( SELECT A01.periodSalaryID ,A01.employeeNumberID ,SUM(A01.paySum) paySum
       ,(SELECT ${sqlDialect.top} e.taxIndividID FROM hr_payElTaxIndivid e WHERE e.payElID = A01.payElID AND e.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) taxIndividID
      FROM hr_accrual A01
      INNER JOIN hr_employeeNumber A02 ON A02.ID = A01.employeeNumberID
      INNER JOIN hr_employee A03 ON A03.ID = A02.employeeID
      WHERE A01.orgID = :orgID:
        AND A01.payElID${entityBaseService.getInExpression('pdfoPayElIDs')}
        AND (A01.flagsRec & 8192 != 8192)
        AND ((A01.periodCalcID = :periodCalcID:
        AND A01.periodSalary <= :paramDateTo:)
        OR (A01.periodCalc < :paramDateFrom:
        AND A01.periodSalaryID = :periodCalcID:))
        AND A02.mi_deleteDate >= '9999-12-31'
        AND A03.mi_deleteDate >= '9999-12-31'
        AND A02.empWorkPlace IS NULL
      GROUP BY A01.periodSalaryID,A01.employeeNumberID,A01.payElID) t
      GROUP BY t.periodSalaryID,t.employeeNumberID,t.taxIndividID
    `, {
      orgID,
      pdfoPayElIDs: pdfoPayElIDs.length ? pdfoPayElIDs : [0],
      periodCalcID: period.ID,
      paramDateTo,
      paramDateFrom
    })
    const fopDataForPdfo = accrualStore.getAsJsObject()

    const periodSalarys = [0]
    fopDataForPdfo.forEach(row => {
      if (!periodSalarys.includes(row.periodSalaryID)) {
        periodSalarys.push(row.periodSalaryID)
      }
    })
    const pdfoData = UB.Repository('hr_taxIndividAcc')
      .where('[accrualID.orgID]', '=', orgID)
      .where('[accrualID.periodSalaryID]', 'in', periodSalarys)
      .where('[accrualID.payElID.methodID.code]', '=', '26')
      .where('[accrualID.periodCalc]', '<=', period.dateFrom)
      .where('[accrualID.periodSalary]', '<=', period.dateFrom)
      .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
      .where('[accrualID.employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[accrualID.employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
      .where('[accrualID.employeeNumberID.empWorkPlace]', 'isNull')
      .groupBy(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID'])
      .attrs(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID', 'SUM([taxSum])', 'SUM([incomeSum])'])
      .selectAsObject({
        'accrualID.periodSalaryID': 'periodSalaryID',
        'accrualID.employeeNumberID': 'employeeNumberID',
        'SUM([taxSum])': 'paySum',
        'SUM([incomeSum])': 'baseSum'
      })
    const pdfoDetailData = UB.Repository('hr_taxIndividAcc')
      .where('[accrualID.orgID]', '=', orgID)
      .where('[accrualID.periodSalaryID]', 'in', periodSalarys)
      .where('[accrualID.payElID.methodID.code]', '=', '26')
      .where('[accrualID.periodCalc]', '<=', period.dateFrom)
      .where('[accrualID.periodSalary]', '<=', period.dateFrom)
      .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
      .where('[accrualID.employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[accrualID.employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
      .where('[accrualID.employeeNumberID.empWorkPlace]', 'isNull')
      .groupBy(['accrualID.employeeNumberID', 'accrualID.periodSalaryID', 'accrualID.periodCalcID', 'accrualID.payElID', 'taxIndividID'])
      .attrs(['accrualID.employeeNumberID', 'accrualID.periodSalaryID', 'accrualID.periodCalcID', 'accrualID.payElID', 'taxIndividID',
        'SUM([taxSum])', 'SUM([incomeSum])', 'SUM([privilegeSum])', 'SUM([taxFreeSum])'])
      .selectAsObject({
        'accrualID.employeeNumberID': 'enID',
        'accrualID.payElID': 'plID',
        'accrualID.periodSalaryID': 'psID',
        'accrualID.periodCalcID': 'pcID',
        'SUM([taxSum])': 'ps',
        'SUM([incomeSum])': 'bs',
        'SUM([privilegeSum])': 'prs',
        'SUM([taxFreeSum])': 'fs',
        'taxIndividID': 'tiID'
      })
    // claculate pdfo
    let sumPdfoFop = 0
    fopDataForPdfo.forEach(fopPdfo => {
      let el = pdfoData.find(o => o.employeeNumberID === fopPdfo.employeeNumberID && o.periodSalaryID === fopPdfo.periodSalaryID && o.taxIndividID === fopPdfo.taxIndividID)
      if (fopPdfo.paySum !== 0 && el) {
        if (el.baseSum !== 0) {
          sumPdfoFop += (el.paySum / el.baseSum) * fopPdfo.paySum
          data.detailData['A1030'].data.push(...pdfoDetailData.filter(o => o.enID === fopPdfo.employeeNumberID && o.psID === fopPdfo.periodSalaryID && o.pcID === period.ID && o.tiID === fopPdfo.taxIndividID))
        } else {
          const empPdfoData = UB.Repository('hr_taxIndividAcc')
            .where('[accrualID.employeeNumberID]', '=', fopPdfo.employeeNumberID)
            .where('[taxIndividID]', '=', fopPdfo.taxIndividID)
            .where('[accrualID.payElID.methodID.code]', '=', '26')
            .where('[accrualID.periodCalcID]', '=', period.ID)
            .where('[accrualID.periodSalaryID]', '=', fopPdfo.periodSalaryID)
            .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
            .where('[accrualID.employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
            .where('[accrualID.employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
            .where('[accrualID.employeeNumberID.empWorkPlace]', 'isNull')
            .groupBy(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID'])
            .attrs(['accrualID.periodSalaryID', 'accrualID.employeeNumberID', 'taxIndividID', 'SUM([taxSum])', 'SUM([incomeSum])'])
            .selectAsObject({
              'accrualID.periodSalaryID': 'periodSalaryID',
              'accrualID.employeeNumberID': 'employeeNumberID',
              'SUM([taxSum])': 'paySum',
              'SUM([incomeSum])': 'baseSum'
            })
          if (empPdfoData && empPdfoData.length) {
            sumPdfoFop += (empPdfoData[0].paySum / empPdfoData[0].baseSum) * fopPdfo.paySum

            data.detailData['A1030'].data.push(...UB.Repository('hr_taxIndividAcc')
              .where('[accrualID.orgID]', '=', orgID)
              .where('[accrualID.employeeNumberID]', '=', fopPdfo.employeeNumberID)
              .where('[taxIndividID]', '=', fopPdfo.taxIndividID)
              .where('[accrualID.payElID.methodID.code]', '=', '26')
              .where('[accrualID.periodCalcID]', '=', period.ID)
              .where('[accrualID.periodSalaryID]', '=', fopPdfo.periodSalaryID)
              .where(`([accrualID.flagsRec] & 8192 != 8192)`, 'custom')
              .where('[accrualID.employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
              .where('[accrualID.employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
              .where('[accrualID.employeeNumberID.empWorkPlace]', 'isNull')
              .groupBy(['accrualID.employeeNumberID', 'accrualID.periodSalaryID', 'accrualID.periodCalcID', 'accrualID.payElID', 'taxIndividID'])
              .attrs(['accrualID.employeeNumberID', 'accrualID.periodSalaryID', 'accrualID.periodCalcID', 'accrualID.payElID', 'taxIndividID',
                'SUM([taxSum])', 'SUM([incomeSum])', 'SUM([privilegeSum])', 'SUM([taxFreeSum])'])
              .selectAsObject({
                'accrualID.employeeNumberID': 'enID',
                'accrualID.payElID': 'plID',
                'accrualID.periodSalaryID': 'psID',
                'accrualID.periodCalcID': 'pcID',
                'SUM([taxSum])': 'ps',
                'SUM([incomeSum])': 'bs',
                'SUM([privilegeSum])': 'prs',
                'SUM([taxFreeSum])': 'fs',
                'taxIndividID': 'tiID'
              }))
          }
        }
      }
    })

    DECLARBODY.A1030 = ((DECLARBODY.A1030 || 0) + Math.round(sumPdfoFop / 100) / 10) -
            ((params.row1030rate && (((DECLARBODY.A1030 || 0) + Math.round(sumPdfoFop / 100) / 10) / DECLARBODY.A1020 * 100) > params.row1030rate) ? 0.1 : 0)

    // load positons
    const empPosDatas = UB.Repository('hr_employeePositionS')
      .where('[organizationID]', '=', orgID)
      .where('[dateFrom]', '<=', paramDateTo)
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .orderBy('dateFrom')
      .attrs(['employeeNumberID', 'workPlace', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'workScheduleID'])
      .selectAsObject()

    // find last position for employee
    const lastWorkPlaceByEmp = {}
    empPosDatas.forEach(empPosData => {
      lastWorkPlaceByEmp[empPosData.employeeNumberID] = empPosData
    })

    // filter by workPlace and correct fire date
    let workEmps = Object.values(lastWorkPlaceByEmp)
      .filter(empPosData => ['1', '2'].indexOf(empPosData.workPlace) >= 0)
    let workEmpNumIDs = workEmps
      .filter(empPos => dateService.shiftDate(empPos['employeeNumberID.dateTo']) < paramDateTo)
      .map(empPosData => empPosData.employeeNumberID)
      .filter(Boolean)
      .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
      .join(', ')

    let workScheduleIDs = workEmps
      .map(empPosData => empPosData.workScheduleID)
      .filter(Boolean)
      .filter((empNum, index, arr) => arr.indexOf(empNum) === index)
      .join(', ')

    let minDayDateData = []
    if (workEmpNumIDs && workEmpNumIDs.length > 0 && workScheduleIDs && workScheduleIDs.length > 0) {
      const minDayDateSQL = `
        SELECT tp.workScheduleID as "workScheduleID", MIN(tp.dayDate) as "minDay", en.ID as "employeeNumberID"
      FROM tim_plan tp  
      INNER JOIN hr_dictTimeCost dt ON dt.ID = tp.dictTimeCostID  
      INNER JOIN hr_employeePosition ep ON ep.workScheduleID = tp.workScheduleID AND ep.isActive = 1 
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID  
      WHERE tp.organizationID= :orgID: 
      AND tp.dayDate>en.dateTo 
      AND dt.timeCostType='WORK' 
      AND tp.mi_deleteDate>= '9999-12-31' 
      AND en.ID IN (${workEmpNumIDs})
      AND tp.workScheduleID IN (${workScheduleIDs})
      Group by tp.workScheduleID, en.ID
    `
      const tmStore = UB.DataStore('tim_plan')
      tmStore.runSQL(minDayDateSQL, { orgID })
      minDayDateData = tmStore.getAsJsObject()
      tmStore.freeNative()
    }
    const empNumIds = []
    const empNums = workEmps
      .map(empPosData => {
        const dateTo = dateService.shiftDate(empPosData['employeeNumberID.dateTo'])
        let minDayData = minDayDateData.find(ep => ep.employeeNumberID === empPosData['employeeNumberID.dateTo'] && ep.workScheduleID === empPosData.workScheduleID)
        let dateToCorr = dateTo
        if (minDayData) {
          dateToCorr = dateService.addDays(dateService.shiftDate(minDayData.minDay), -1)
        }
        if (empPosData.workPlace === '1') {
          empNumIds.push(empPosData.employeeNumberID)
        }
        return {
          employeeNumberID: empPosData.employeeNumberID,
          dateFrom: dateService.shiftDate(empPosData['employeeNumberID.dateFrom']),
          dateTo: dateTo,
          dateToCorr: dateToCorr
        }
      })

    const empCount = reportService.getEmpCount(orgID, empNumIds, period.dateFrom, period.dateTo, reportParams.notAvgQuantityIDs, ['1'], false, { count: true })
    DECLARBODY.A1040 = (DECLARBODY.A1040 || 0) + empCount.count
    empCount.empDetail.forEach(row => {
      row.pcID = period.ID
    })
    data.detailData['A1040'].data.push(...empCount.empDetail)

    workEmps = Object.values(lastWorkPlaceByEmp)
      .filter(empPosData => ['5'].indexOf(empPosData.workPlace) >= 0)

    // load hour from timesheets
    DECLARBODY.A1060 = (DECLARBODY.A1060 || 0) + Math.round(UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', workEmps.map(o => o.employeeNumberID))
      .where('[isActive]', '=', true)
      .where('[factTimeCostID.timeCostType]', '=', 'WORK', 'workType')
      .where('[factTimeCostID.code]', '=', 'Вдр', 'businessTrip')
      .where('[dateWork]', '>=', paramDateFrom)
      .where('[dateWork]', '<=', paramDateTo)
      .logic('([workType] OR [businessTrip])')
      .attrs(['SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [planHour] END)'])
      .selectScalar() || 0)

    const A1060details = UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', workEmps.map(o => o.employeeNumberID))
      .where('[isActive]', '=', true)
      .where('[factTimeCostID.timeCostType]', '=', 'WORK', 'workType')
      .where('[factTimeCostID.code]', '=', 'Вдр', 'businessTrip')
      .where('[dateWork]', '>=', paramDateFrom)
      .where('[dateWork]', '<=', paramDateTo)
      .logic('([workType] OR [businessTrip])')
      .attrs(['employeeNumberID', 'SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [planHour] END)'])
      .groupBy(['employeeNumberID'])
      .selectAsObject({
        'employeeNumberID': 'enID',
        'SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [planHour] END)': 'h'
      })
    A1060details.forEach(row => {
      row.pcID = period.ID
    })
    data.detailData['A1060'].data.push(...A1060details)
    // calculate fop filtered by workPlace
    DECLARBODY.A1070 = (DECLARBODY.A1070 || 0) + Math.round((UB.Repository('hr_accrual')
      .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
      .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .whereIf(reportParams.notFOPS03IDs.length, '[payElID]', 'notIn', reportParams.notFOPS03IDs)
      .where('periodCalcID', '=', period.ID, 'case1')
      .where('periodSalary', '<=', paramDateTo, 'cond1')
      .where('periodCalc', '<', paramDateFrom, 'case2')
      .where('periodSalaryID', '=', period.ID, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0) / 100) / 10

    const A1070accruals = UB.Repository('hr_accrual')
      .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
      .where('[payElID]', 'in', fopPayElIDs.length ? fopPayElIDs : [0])
      .whereIf(reportParams.notFOPS03IDs.length, '[payElID]', 'notIn', reportParams.notFOPS03IDs)
      .where('periodCalcID', '=', period.ID, 'case1')
      .where('periodSalary', '<=', paramDateTo, 'cond1')
      .where('periodCalc', '<', paramDateFrom, 'case2')
      .where('periodSalaryID', '=', period.ID, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('([case1] AND [cond1]) OR ([case2] AND [cond2])')
      .attrs(['employeeNumberID', 'payElID', 'periodSalaryID', 'periodCalcID', 'SUM([paySum])'])
      .groupBy(['employeeNumberID', 'periodCalcID', 'periodSalaryID', 'payElID'])
      .selectAsObject({
        'employeeNumberID': 'enID',
        'payElID': 'plID',
        'periodSalaryID': 'psID',
        'periodCalcID': 'pcID',
        'SUM([paySum])': 'ps'
      })
    data.detailData['A1070'].data.push(...A1070accruals)
  })
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_SPATO', 'REP_PERNM', 'FIRM_KVED',
      'N_1', 'N_2', 'N_3', 'OBL', 'RAY', 'S1_1', 'TER_STRUK', 'KVED', 'N1', 'N2',
      'RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVED1', 'TER_GROM1', 'TER_GROM2', 'TER_STRUK', 'KATOTTG', 'KATOTTG_FACT'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A1040', 'A1060', 'NOMER', 'ZERO_ZVI', 'REASON2', 'REASON3', 'REASON4',
      'REASON5', 'REASON6'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A1020', 'A1030', 'A1070'],
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
  DECLARBODY.KATOTTG = (DECLARBODY.TER_STRUK && DECLARBODY.TER_STRUK !== '') ? DECLARBODY.TER_STRUK : ''
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
