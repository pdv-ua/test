const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const reportService = require('../../../../HR/modules/reportService')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const currencyService = require('../../../../AC/modules/dataServices/currencyService')
const settingsService = require('../../../../AC/modules/entityServices/settingsService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')

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
  addTempleteForCustomRow(PARAMS)
  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  params.C_DOC_STAN = DECLARHEAD.C_DOC_STAN
  params.C_DOC_TYPE = DECLARHEAD.C_DOC_TYPE
  params.C_RAJ = DECLARHEAD.C_RAJ
  params.C_REG = DECLARHEAD.C_REG
  data.detailData = { detailType: 'HR' }
  setMainData({ data, params })

  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })
  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE', 'TER_STRUK']
const allBodyAttrNames = [
  'FIRM_EDRPOU', 'REP_Y', 'FIRM_NAME', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'TER_STRUK', 'ZERO_ZVI', 'REASON1', 'REASON2', 'REASON3', 'REASON4', 'REASON5', 'REASON6',
  'N1_1', 'N1_2', 'N2_1', 'N2_2', 'A730_1', 'A730_2', 'A735_1', 'A735_2', 'A735_3',
  'REP_NYE', 'REP_NY', 'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL',
  'A740_1', 'A740_2', 'A750_1', 'A750_2', 'A760_1', 'A770_1', 'A780_1', 'A790_1',
  'A7110_1', 'A7110_2', 'A7120_1', 'A7120_2', 'A7120_3','A7120_4', 'A7130_1', 'A7130_2', 'A71311_1', 'A71312_1', 'A71313_1', 'A71311_2', 'A71312_2', 'A71313_2',
  'A7140_1', 'A7140_2', 'A7150_11',
  'A71501_1', 'A71502_1', 'A71503_1', 'A71504_1', 'A71505_1', 'A71506_1', 'A71507_1', 'A71508_1', 'A71509_1',
  'A71501_2', 'A71502_2', 'A71503_2', 'A71504_2', 'A71505_2', 'A71506_2', 'A71507_2', 'A71508_2', 'A71509_2',
  'A71601_1', 'A71602_1', 'A71602_1', 'A71603_2', 'A71701_1', 'A71702_1', 'A71701_2', 'A71702_2', 'A7171_1', 'A7171_2',
  'A71801_1', 'A71802_1', 'A71803_1', 'A71801_2', 'A71802_2', 'A71803_2', 'A7190_1', 'A7190_2', 'A7191_1', 'A7191_2',
  'A7210_1', 'A7210_2', 'A7220_1', 'A7220_2', 'A7230_1', 'A7230_2', 'A7310_1', 'A7310_2', 'A7320_1', 'A7320_2', 'A7330_1', 'A7330_2',
  'A7340_1', 'A7340_2', 'A7350_1', 'A7350_2', 'A7410_1', 'A7410_2', 'A7420_1', 'A7420_2', 'A7430_1', 'A7430_2', 'A7440_1', 'A7440_2',
  'A7450_1', 'A7450_2', 'A7510_1', 'A7510_2', 'A7520_1', 'A7520_2', 'A7530_1', 'A7530_2', 'A7540_1', 'A7540_2', 'A7550_1', 'A7550_2',
  'A7551_1', 'A7551_2', 'A7552_1', 'A7552_2', 'A7560_1', 'A7560_2', 'A7570_1', 'A7570_2', 'A7580_1', 'A7580_2',
  'T1RXXXXG2', 'T1RXXXXG3', 'T1RXXXXG4', 'T1RXXXXG5', 'T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG11',
  'T1RXXXXG12', 'T1RXXXXG13', 'T1RXXXXG14', 'T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG10', 'T1RXXXXG21',
  'T1RXXXXG22', 'T1RXXXXG23', 'T1RXXXXG24', 'T1RXXXXG25', 'T1RXXXXG26', 'T1RXXXXG27', 'T1RXXXXG28', 'T1RXXXXG29', 'T1RXXXXG30', 'T1RXXXXG31',
  'T1RXXXXG32', 'T1RXXXXG33', 'T1RXXXXG34', 'T1RXXXXG35', 'T1RXXXXG36', 'T1RXXXXG37', 'T1RXXXXG38', 'T1RXXXXG39', 'T1RXXXXG40', 'T1RXXXXG41',
  'T1RXXXXG42', 'T1RXXXXG43', 'T1RXXXXG44', 'T1RXXXXG45', 'T1RXXXXG46', 'T1RXXXXG47', 'T1RXXXXG48', 'T1RXXXXG49', 'T1RXXXXG50', 'T1RXXXXG51',
  'T1RXXXXG52S', 'T1RXXXXG53S', 'T1RXXXXG54S', 'T1RXXXXG55S', 'T1RXXXXG56', 'T1RXXXXG57', 'T1RXXXXG58', 'T1RXXXXG59', 'T1RXXXXG60', 'T1RXXXXG61',
  'T1RXXXXG62', 'T1RXXXXG63', 'T1RXXXXG64', 'T1RXXXXG65', 'T1RXXXXG66', 'T1RXXXXG67', 'T1RXXXXG68', 'T1RXXXXG69', 'T1RXXXXG70', 'T1RXXXXG71',
  'T1RXXXXG72', 'T1RXXXXG73', 'T1RXXXXG74', 'T1RXXXXG75', 'T1RXXXXG76', 'T1RXXXXG77', 'T1RXXXXG78', 'T1RXXXXG79', 'T1RXXXXG80', 'T1RXXXXG81',
  'T1RXXXXG82', 'T1RXXXXG83', 'T1RXXXXG84', 'T1RXXXXG85', 'T1RXXXXG86', 'T1RXXXXG87', 'T1RXXXXG88', 'T1RXXXXG89', 'T1RXXXXG90', 'T1RXXXXG91',
  'T1RXXXXG92', 'T1RXXXXG93', 'T1RXXXXG94', 'T1RXXXXG95', 'T1RXXXXG96', 'T1RXXXXG97', 'T1RXXXXG98', 'T1RXXXXG99', 'T1RXXXXG100', 'T1RXXXXG101'
  ]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'S0303003.xsd'
  }
  data.DECLAR.DECLARHEAD.C_DOC_STAN = 1
  data.DECLAR.DECLARHEAD.C_DOC_TYPE = 1
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

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })

  let paramDateFrom = dateService.firstDayOfYear(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, 0, 1, 0, 0, 0, 0)))
  let paramDateTo = dateService.lastDayOfYear(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, 0, 1, 0, 0, 0, 0)))

  let paramDateFrom10 = dateService.firstDayOfMonth(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, 9, 1, 0, 0, 0, 0)))
  let paramDateTo10 = dateService.lastDayOfMonth(new Date(Date.UTC(DECLARHEAD.PERIOD_YEAR, 9, 1, 0, 0, 0, 0)))

  // Details Params
  let keys = ['A760_1']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' }
      ],
      onDate: paramDateTo10,
      openForm: [{ name: 'or', enID: 'enID' }]
    }
  })
  keys = ['A770_1']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'npp', entityName: null, name: UB.i18n('№ п/п'), type: 'number' },
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' }
      ],
      onDate: paramDateTo10,
      openForm: [{ name: 'or', enID: 'enID' }]
    }
  })

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
  DECLARBODY.VIK_RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['employeeID.phoneWorking']
  DECLARBODY.VIK_EMAIL = bos['email']

  const orgAddressLegal = UB.Repository('ac_address')
    .attrs(['address', 'nameTerGrom', 'regionID.name'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '2')
    .limit(1)
    .selectSingle() || {}

  const orgAddressFact = UB.Repository('ac_address')
    .attrs(['address', 'nameTerGrom'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  let reportParams = reportService.getReportParams(params.organizationID,
    ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', 'SPV71501', 'SPV71502', 'SPV71503', 'SPV71504', 'SPV71505', 'SPV71506', 'SPV71507', 'SPV71508',
      'SPV71509', 'notSicknessPayedTime', 'SPV7340', 'SPV7350', 'RewardsSurcharge', 'PremCompens', 'OvertimeHoliday',
      'SPV7540', 'SPV7551', 'SPV7552', 'SPV7570', 'SPV7580']
  )
  const payElIDsFOP = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
  const valueB = UB.Repository('hr_valuesParam')
    .attrs(['valuesFloat', 'valuesFloat1'])
    .where('[listParamID.code]', '=', '<B>')
    .where('[orgID]', '=', parentOrdID || params.organizationID)
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .orderBy('orderN')
    .selectAsObject()

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', paramDateTo)
      .where('mi_dateTo', '>=', paramDateFrom)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]

  DECLARBODY.FIRM_ADR_FIZ = orgAddressFact.address || orgAddressLegal.address
  DECLARBODY.FIRM_ADR = orgAddressLegal.address
  DECLARBODY.TER_GROM2 = orgAddressFact.nameTerGrom
  DECLARBODY.TER_GROM1 = orgAddressLegal.nameTerGrom
  DECLARBODY.KATOTTG_FACT = DECLARBODY.KATOTTG
  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.TER_STRUK = DECLARBODY.HKOATUU || orgInfo['hkoatuu']
  DECLARBODY.REP_Y = DECLARHEAD.PERIOD_YEAR
  DECLARBODY.REP_NY = DECLARHEAD.PERIOD_YEAR + ' ' + UB.i18n('року')
  DECLARBODY.REP_NYE = DECLARHEAD.PERIOD_YEAR + ' ' + UB.i18n('рік')

  DECLARBODY.N1_1 = params.chkContract
  DECLARBODY.N1_2 = !params.chkContract
  DECLARBODY.N2_1 = params.typePay1
  DECLARBODY.N2_2 = params.typePay2
  DECLARBODY.N3_1 = params.chkTarif
  DECLARBODY.N3_2 = !params.chkTarif
  DECLARBODY.N4_1 = params.typeActivity1
  DECLARBODY.N5_1 = params.typeActivity2
  DECLARBODY.N6_1 = params.typeActivity3

  DECLARBODY.A740_1 = 0
  DECLARBODY.A740_2 = 0
  DECLARBODY.A750_1 = 0
  DECLARBODY.A750_2 = 0
  DECLARBODY.A760_1 = 0
  DECLARBODY.A760_2 = 0
  organiozations.forEach(orgID => {
    let parametrs = {
      workPlace: ['1'],
      orgID: orgID,
      dateFrom: paramDateFrom10,
      dateTo: paramDateTo10
    }
    let result = reportService.getAvgListEmpCount(parametrs)
    DECLARBODY.A740_1 += result.dayCount
    parametrs = {
      workPlace: ['1'],
      orgID: orgID,
      dateFrom: paramDateFrom,
      dateTo: paramDateTo
    }
    result = reportService.getAvgListEmpCount(parametrs)
    DECLARBODY.A740_2 += currencyService.round(result.dayCount, 0)

    let paySum = UB.Repository('hr_accrual')
    .where('[employeeNumberID.orgID]', '=', orgID)
    .where('[payElID]', 'in', payElIDsFOP)
    //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
    //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
    .where('periodCalc', '<=', paramDateTo10, 'case11')
    .where('periodCalc', '>=', paramDateFrom10, 'case12')
    .where('periodSalary', '<=', paramDateTo10, 'cond1')
    .where('periodSalary', '>=', paramDateFrom10, 'case21')
    .where('periodSalary', '<=', paramDateTo10, 'case22')
    .where('periodCalc', '<', paramDateFrom10, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
    .attrs(['SUM([paySum])'])
    .selectScalar() || 0
    DECLARBODY.A750_1 += paySum ? currencyService.round(paySum / 1000, 1) : 0

    paySum= UB.Repository('hr_accrual')
    .where('[employeeNumberID.orgID]', '=', orgID)
    .where('[payElID]', 'in', payElIDsFOP)
    //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
    //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
    .where('periodCalc', '<=', paramDateTo, 'case11')
    .where('periodCalc', '>=', paramDateFrom, 'case12')
    .where('periodSalary', '<=', paramDateTo, 'cond1')
    .where('periodSalary', '>=', paramDateFrom, 'case21')
    .where('periodSalary', '<=', paramDateTo, 'case22')
    .where('periodCalc', '<', paramDateFrom, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
    .attrs(['SUM([paySum])'])
    .selectScalar() || 0
    DECLARBODY.A750_2 += paySum ? currencyService.round(paySum / 1000, 1) : 0

    parametrs = {
      orgID: orgID,
      onDate: paramDateTo10,
      avgCount: true,
    }
    result = reportService.getAvgListEmpCountOnDate(parametrs)
    DECLARBODY.A760_1 += currencyService.round(result.dayCount, 0)
    if (result && result.employeeNumbers) {
      for (let employeeNumberID in result.employeeNumbers) {
        data.detailData['A760_1'].data.push({ enID: employeeNumberID })
      }
    }
  })
  DECLARBODY.A770_1 = 0
  valueB.forEach(el => {
    if (DECLARBODY.A760_1 >= el.valuesFloat) DECLARBODY.A770_1 = currencyService.round(el.valuesFloat1, 0)
  })

  // DECLARBODY.A770_1 = 6

  DECLARBODY.A780_1 = currencyService.round(DECLARBODY.A760_1 && DECLARBODY.A770_1 ? DECLARBODY.A760_1 / DECLARBODY.A770_1 : 0, 1)
  DECLARBODY.A790_1 = currencyService.round(Math.random() * DECLARBODY.A780_1, 0)
  if (DECLARBODY.A790_1 === 0) {
    DECLARBODY.A790_1 = 1
  }

  const empPosDatas = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeNumberID.tabNum', 'employeeID.sexType', 'employeeID.citizenshipID', 'employeeID.citizenshipID.symbol2',
      'employeeID.birthDate', 'employeeID', 'mtCount', 'dictTrialPeriodID', 'dateTrialEnd', 'dictContractKindID.code',
      'dictPositionID.dictProfessionID.name', 'dictPositionID.dictProfessionID.codeZKPPTR',
      'workPlace', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'workScheduleID', 'workScheduleID.weekHours'])
    .where('[organizationID]', 'in', organiozations)
    .where('[dateFrom]', '<=', paramDateTo10)
    .where('[dateTo]', '>=', paramDateTo10)
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .orderBy('employeeNumberID.tabNum')
    .selectAsObject({
      'employeeID.sexType': 'sexType',
      'employeeID.citizenshipID': 'citizenshipID',
      'employeeID.citizenshipID.symbol2': 'citizenship',
      'employeeNumberID.tabNum': 'tabNum',
      'employeeID.birthDate': 'birthDate',
      'workScheduleID.weekHours': 'weekHours',
      'dictPositionID.dictProfessionID.name': 'profession',
      'dictPositionID.dictProfessionID.codeZKPPTR': 'codeZKPPTR'
    })

  empPosDatas.forEach((row, npp) => {
    data.detailData['A770_1'].data.push({ npp: npp + 1, enID: row.employeeNumberID })
  })

  function getEmplInfo(obj, num, colNum, firstTable) {
    if (num > empPosDatas.length) num = empPosDatas.length
    if (num <= 0) num = 1
    const employee = empPosDatas[num - 1]
    obj = obj || {}
    obj.tabNum = employee.tabNum
    obj[firstTable ? colNum  === 1 ? 'A7110_1' : 'A7110_2' : colNum  === 1 ? 'T1RXXXXG2' : 'T1RXXXXG3'] = num // employee.tabNum
    // obj[firstTable ? colNum  === 1 ? 'A7110_1' : 'A7110_2' : colNum  === 1 ? 'T1RXXXXG2' : 'T1RXXXXG3'] = employee.tabNum
    obj[firstTable ? colNum  === 1 ? 'A7120_1' : 'A7120_3' : colNum  === 1 ? 'T1RXXXXG4' : 'T1RXXXXG6'] = (employee.sexType || '') !== 'W'
    obj[firstTable ? colNum  === 1 ? 'A7120_2' : 'A7120_4' : colNum  === 1 ? 'T1RXXXXG5' : 'T1RXXXXG7'] = (employee.sexType || '') === 'W'

    obj[firstTable ? colNum  === 1 ? 'A7130_1' : 'A7130_2' : colNum  === 1 ? 'T1RXXXXG8' : 'T1RXXXXG9'] = dateService.yearsDiff(employee.birthDate, paramDateTo10)

    obj[firstTable ? colNum  === 1 ? 'A71311_1' : 'A71311_2' : colNum  === 1 ? 'T1RXXXXG10' : 'T1RXXXXG11'] = ((employee.citizenshipID || 0) !== 0 && (employee.citizenship || '') === 'UA')
    obj[firstTable ? colNum  === 1 ? 'A71312_1' : 'A71312_2' : colNum  === 1 ? 'T1RXXXXG12' : 'T1RXXXXG13'] = ((employee.citizenshipID || 0) !== 0 && (employee.citizenship || '') !== 'UA')
    obj[firstTable ? colNum  === 1 ? 'A71313_1' : 'A71313_2' : colNum  === 1 ? 'T1RXXXXG14' : 'T1RXXXXG15'] = (employee.citizenshipID || 0) === 0

    obj[firstTable ? colNum  === 1 ? 'A7140_1' : 'A7140_2' : colNum  === 1 ? 'T1RXXXXG16' : 'T1RXXXXG17'] = employee['employeeNumberID.dateFrom'] ? dateService.yearsDiff(employee['employeeNumberID.dateFrom'], paramDateTo10) : 0

    const educationLevel = UB.Repository('hr_employeeEducation')
      .attrs('dictEducationLevelID')
      .where('employeeID', '=', employee.employeeID)
      .selectAsObject()

    let level = 9
    if (educationLevel && educationLevel.length) {
      for (let i = 1; i <= 8; i++) {
        const valueParam = reportParams[`SPV7150${i}IDs`]
        if (valueParam && valueParam.length) {
          educationLevel.forEach(el => {
            if (valueParam.includes(el.dictEducationLevelID)) {
              level = i
              i = 8
            }
          })
        }
      }
    }
    obj[firstTable ? colNum  === 1 ? 'A71501_1' : 'A71501_2' : colNum  === 1 ? 'T1RXXXXG18' : 'T1RXXXXG19'] = level === 1
    obj[firstTable ? colNum  === 1 ? 'A71502_1' : 'A71502_2' : colNum  === 1 ? 'T1RXXXXG20' : 'T1RXXXXG21'] = level === 2
    obj[firstTable ? colNum  === 1 ? 'A71503_1' : 'A71503_2' : colNum  === 1 ? 'T1RXXXXG22' : 'T1RXXXXG23'] = level === 3
    obj[firstTable ? colNum  === 1 ? 'A71504_1' : 'A71504_2' : colNum  === 1 ? 'T1RXXXXG24' : 'T1RXXXXG25'] = level === 4
    obj[firstTable ? colNum  === 1 ? 'A71505_1' : 'A71505_2' : colNum  === 1 ? 'T1RXXXXG26' : 'T1RXXXXG27'] = level === 5
    obj[firstTable ? colNum  === 1 ? 'A71506_1' : 'A71506_2' : colNum  === 1 ? 'T1RXXXXG28' : 'T1RXXXXG29'] = level === 6
    obj[firstTable ? colNum  === 1 ? 'A71507_1' : 'A71507_2' : colNum  === 1 ? 'T1RXXXXG30' : 'T1RXXXXG31'] = level === 7
    obj[firstTable ? colNum  === 1 ? 'A71508_1' : 'A71508_2' : colNum  === 1 ? 'T1RXXXXG32' : 'T1RXXXXG33'] = level === 8
    obj[firstTable ? colNum  === 1 ? 'A71509_1' : 'A71509_2' : colNum  === 1 ? 'T1RXXXXG34' : 'T1RXXXXG35'] = level === 9

    obj[firstTable ? colNum  === 1 ? 'A71601_1' : 'A71601_2' : colNum  === 1 ? 'T1RXXXXG36' : 'T1RXXXXG37'] = params.typePay1
    obj[firstTable ? colNum  === 1 ? 'A71602_1' : 'A71602_2' : colNum  === 1 ? 'T1RXXXXG38' : 'T1RXXXXG39'] = params.typePay2

    let fullMt = 0
    if (employee.mtCount < 1) {
      fullMt = 0
    } else {
      fullMt = 1
      const timeSheetChangeID = UB.Repository('hr_timeSheetChangeEmp')
        .attrs(['timeSheetChangeID'])
        .where('employeeNumberID', '=', employee.employeeNumberID)
        .where('timeSheetChangeID.typeSheetChange', 'in', ['1', '3'])
        .where('timeSheetChangeID.orderState', '=', 'POSTED')
        .where('orderState', '=', 'POSTED')
        .where('timeSheetChangeID.dateFrom', '<=', paramDateTo10)
        .where('dateTo', '>=', paramDateTo10)
        .where('[timeSheetChangeID.mi_deleteDate]', '>=', '#maxdate')
        .selectAsObject()

      if (timeSheetChangeID && timeSheetChangeID.length) {
        fullMt = 0
      }
    }
    obj[firstTable ? colNum  === 1 ? 'A71701_1' : 'A71701_2' : colNum  === 1 ? 'T1RXXXXG40' : 'T1RXXXXG41'] = fullMt === 1
    obj[firstTable ? colNum  === 1 ? 'A71702_1' : 'A71702_2' : colNum  === 1 ? 'T1RXXXXG42' : 'T1RXXXXG43'] = fullMt === 0

    obj[firstTable ? colNum  === 1 ? 'A7171_1' : 'A7171_2' : colNum  === 1 ? 'T1RXXXXG44' : 'T1RXXXXG45'] = employee.weekHours


    //'dictTrialPeriodID', 'dateTrialEnd', 'dictContractKindID.contractType',
    let typeWork = 1
    if (employee.dictTrialPeriodID && employee.dateTrialEnd && employee.dateTrialEnd > paramDateTo10) {
      typeWork = 3
    } else {
      typeWork = employee['dictContractKindID.code'] === '01' ? 1 : 2
    }
    obj[firstTable ? colNum  === 1 ? 'A71801_1' : 'A71801_2' : colNum  === 1 ? 'T1RXXXXG46' : 'T1RXXXXG47'] = typeWork === 1
    obj[firstTable ? colNum  === 1 ? 'A71802_1' : 'A71802_2' : colNum  === 1 ? 'T1RXXXXG48' : 'T1RXXXXG49'] = typeWork === 2
    obj[firstTable ? colNum  === 1 ? 'A71803_1' : 'A71803_2' : colNum  === 1 ? 'T1RXXXXG50' : 'T1RXXXXG51'] = typeWork === 3

    obj[firstTable ? colNum  === 1 ? 'A7190_1' : 'A7190_2' : colNum  === 1 ? 'T1RXXXXG52S' : 'T1RXXXXG53S'] = employee.profession || ''

    obj[firstTable ? colNum  === 1 ? 'A7191_1' : 'A7191_2' : colNum  === 1 ? 'T1RXXXXG54S' : 'T1RXXXXG55S'] = employee.codeZKPPTR || ''

    let worktHour1 = 0
    let worktHour2 = 0
    let worktHour3 = 0

    const timeSheet = UB.Repository('tim_timeSheet')
      .attrs(['dateWork', 'factHour', 'factTimeCostID.code', 'employeeNumberID', 'normHour', 'planHour', 'factTimeCostID',
        'factTimeCostID.timeCostType', 'factTimeCostID.isFactHour'])
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[dateWork]', '>=', paramDateFrom)
      .where('[dateWork]', '<=', paramDateTo)
      .where('isActive', '=', 1)
      .selectAsObject({
        'factTimeCostID.timeCostType': 'factTimeCostType',
        'factTimeCostID.isFactHour': 'isFactHour'
      })

    const timeSheet10 = timeSheet.filter(el => new Date(el.dateWork) >= paramDateFrom10 && new Date(el.dateWork) <= paramDateTo10)
    /*
      .attrs(['dateWork', 'factHour', 'factTimeCostID.code', 'employeeNumberID', 'normHour', 'planHour', 'factTimeCostID',
        'factTimeCostID.timeCostType', 'factTimeCostID.isFactHour', 'planID.workScheduleID.isPayHoliday'])
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[dateWork]', '>=', paramDateFrom10)
      .where('[dateWork]', '<=', paramDateTo10)
      .where('isActive', '=', 1)
      .selectAsObject({
        'factTimeCostID.timeCostType': 'factTimeCostType',
        'factTimeCostID.isFactHour': 'isFactHour',
        'planID.workScheduleID.isPayHoliday': 'isPayHoliday'
      })

     */
    timeSheet10.forEach(item => {
      let worktHour
      if (item.factTimeCostType === 'WORK') {
        worktHour = item.factHour
      } else {
        worktHour = item.isFactHour ? item.factHour : item.planHour /*item.normHour*/
      }
      if (reportParams['notSicknessPayedTimeIDs'] && reportParams['notSicknessPayedTimeIDs'].includes(item.factTimeCostID)) {
        worktHour1 += worktHour
      }
      worktHour2 += worktHour

      if (item.factTimeCostType === 'WORK' || item.factTimeCostType === 'FREE') {
        worktHour3 += item.factHour - item.normHour
      }
    })

    obj[firstTable ? colNum  === 1 ? 'A7210_1' : 'A7210_2' : colNum  === 1 ? 'T1RXXXXG56' : 'T1RXXXXG57'] = currencyService.round(worktHour1, 0)
    obj[firstTable ? colNum  === 1 ? 'A7220_1' : 'A7220_2' : colNum  === 1 ? 'T1RXXXXG58' : 'T1RXXXXG59'] = currencyService.round(worktHour2, 0)
    obj[firstTable ? colNum  === 1 ? 'A7230_1' : 'A7230_2' : colNum  === 1 ? 'T1RXXXXG60' : 'T1RXXXXG61'] = worktHour3 > 0 ? currencyService.round(worktHour3, 0) : 0

    worktHour1 = 0
    worktHour2 = 0
    worktHour3 = 0
    let worktHour4 = 0
    let worktHour5 = 0

    timeSheet.forEach(item => {
      let worktHour
      if (item.factTimeCostType === 'WORK') {
        worktHour = item.factHour
      } else {
        worktHour = item.isFactHour ? item.factHour : item.planHour /*item.normHour*/
      }
      if (reportParams['notSicknessPayedTimeIDs'] && reportParams['notSicknessPayedTimeIDs'].includes(item.factTimeCostID)) {
        worktHour1 += worktHour
      }
      worktHour2 += worktHour

      if (item.factTimeCostType === 'WORK' || item.factTimeCostType === 'FREE') {
        worktHour3 += item.factHour - item.normHour
      }

      if (reportParams['SPV7340IDs'] && reportParams['SPV7340IDs'].includes(item.factTimeCostID)) {
        worktHour4 += worktHour
      }
      if (reportParams['SPV7350IDs'] && reportParams['SPV7350IDs'].includes(item.factTimeCostID)) {
        worktHour5 += worktHour
      }
    })
    obj[firstTable ? colNum  === 1 ? 'A7310_1' : 'A7310_2' : colNum  === 1 ? 'T1RXXXXG62' : 'T1RXXXXG63'] = currencyService.round(worktHour1, 0)
    obj[firstTable ? colNum  === 1 ? 'A7320_1' : 'A7320_2' : colNum  === 1 ? 'T1RXXXXG64' : 'T1RXXXXG65'] = currencyService.round(worktHour2, 0)
    obj[firstTable ? colNum  === 1 ? 'A7330_1' : 'A7330_2' : colNum  === 1 ? 'T1RXXXXG66' : 'T1RXXXXG67'] = worktHour3 > 0 ? currencyService.round(worktHour3, 0) : 0
    obj[firstTable ? colNum  === 1 ? 'A7340_1' : 'A7340_2' : colNum  === 1 ? 'T1RXXXXG68' : 'T1RXXXXG69'] = currencyService.round(worktHour4, 0)
    obj[firstTable ? colNum  === 1 ? 'A7350_1' : 'A7350_2' : colNum  === 1 ? 'T1RXXXXG70' : 'T1RXXXXG71'] = currencyService.round(worktHour5, 0)

    let paySum = payElIDsFOP && payElIDsFOP ? UB.Repository('hr_accrual')
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[payElID]', 'in', payElIDsFOP)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo10, 'case11')
      .where('periodCalc', '>=', paramDateFrom10, 'case12')
      .where('periodSalary', '<=', paramDateTo10, 'cond1')
      .where('periodSalary', '>=', paramDateFrom10, 'case21')
      .where('periodSalary', '<=', paramDateTo10, 'case22')
      .where('periodCalc', '<', paramDateFrom10, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0 : 0

    obj[firstTable ? colNum  === 1 ? 'A7410_1' : 'A7410_2' : colNum  === 1 ? 'T1RXXXXG72' : 'T1RXXXXG73'] = paySum

    paySum = reportParams.FOZPIDs && reportParams.FOZPIDs.length ? UB.Repository('hr_accrual')
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[payElID]', 'in', reportParams.FOZPIDs)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo10, 'case11')
      .where('periodCalc', '>=', paramDateFrom10, 'case12')
      .where('periodSalary', '<=', paramDateTo10, 'cond1')
      .where('periodSalary', '>=', paramDateFrom10, 'case21')
      .where('periodSalary', '<=', paramDateTo10, 'case22')
      .where('periodCalc', '<', paramDateFrom10, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0 : 0

    obj[firstTable ? colNum  === 1 ? 'A7420_1' : 'A7420_2' : colNum  === 1 ? 'T1RXXXXG74' : 'T1RXXXXG75'] = paySum

    paySum = reportParams.FDZPIDs && reportParams.FDZPIDs.length && reportParams.RewardsSurchargeIDs && reportParams.RewardsSurchargeIDs.length ? UB.Repository('hr_accrual')
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[payElID]', 'in', reportParams.FDZPIDs)
      .where('[payElID]', 'in', reportParams.RewardsSurchargeIDs)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo10, 'case11')
      .where('periodCalc', '>=', paramDateFrom10, 'case12')
      .where('periodSalary', '<=', paramDateTo10, 'cond1')
      .where('periodSalary', '>=', paramDateFrom10, 'case21')
      .where('periodSalary', '<=', paramDateTo10, 'case22')
      .where('periodCalc', '<', paramDateFrom10, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0 : 0

    obj[firstTable ? colNum  === 1 ? 'A7430_1' : 'A7430_2' : colNum  === 1 ? 'T1RXXXXG76' : 'T1RXXXXG77'] = paySum

    paySum = reportParams.FDZPIDs && reportParams.FDZPIDs.length && reportParams.PremCompensIDs && reportParams.PremCompensIDs.length ? UB.Repository('hr_accrual')
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[payElID]', 'in', reportParams.FDZPIDs)
      .where('[payElID]', 'in', reportParams.PremCompensIDs)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo10, 'case11')
      .where('periodCalc', '>=', paramDateFrom10, 'case12')
      .where('periodSalary', '<=', paramDateTo10, 'cond1')
      .where('periodSalary', '>=', paramDateFrom10, 'case21')
      .where('periodSalary', '<=', paramDateTo10, 'case22')
      .where('periodCalc', '<', paramDateFrom10, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0 : 0

    obj[firstTable ? colNum  === 1 ? 'A7440_1' : 'A7440_2' : colNum  === 1 ? 'T1RXXXXG78' : 'T1RXXXXG79'] = paySum

    paySum = reportParams.FDZPIDs && reportParams.FDZPIDs.length && reportParams.OvertimeHolidayIDs && reportParams.OvertimeHolidayIDs.length ? UB.Repository('hr_accrual')
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      .where('[payElID]', 'in', reportParams.FDZPIDs)
      .where('[payElID]', 'in', reportParams.OvertimeHolidayIDs)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo10, 'case11')
      .where('periodCalc', '>=', paramDateFrom10, 'case12')
      .where('periodSalary', '<=', paramDateTo10, 'cond1')
      .where('periodSalary', '>=', paramDateFrom10, 'case21')
      .where('periodSalary', '<=', paramDateTo10, 'case22')
      .where('periodCalc', '<', paramDateFrom10, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .attrs(['SUM([paySum])'])
      .selectScalar() || 0 : 0

    obj[firstTable ? colNum  === 1 ? 'A7450_1' : 'A7450_2' : colNum  === 1 ? 'T1RXXXXG80' : 'T1RXXXXG81'] = paySum

    const paySums = []
    for (let i = 1; i <= 10; i++) {
      paySums.push(0)
    }
    const accruals = payElIDsFOP && payElIDsFOP ? UB.Repository('hr_accrual')
      .attrs(['payElID', 'SUM([paySum])'])
      .groupBy(['payElID'])
      .where('[employeeNumberID]', '=', employee.employeeNumberID)
      //.where('[payElID]', 'in', payElIDsFOP)
      //.whereIf(params.typePay1, 'payElID.methodID.code', 'in', ['1', '2'])
      //.whereIf(params.typePay2, 'payElID.methodID.code', '=', '63')
      .where('periodCalc', '<=', paramDateTo, 'case11')
      .where('periodCalc', '>=', paramDateFrom, 'case12')
      .where('periodSalary', '<=', paramDateTo, 'cond1')
      .where('periodSalary', '>=', paramDateFrom, 'case21')
      .where('periodSalary', '<=', paramDateTo, 'case22')
      .where('periodCalc', '<', paramDateFrom, 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
      .selectAsObject({
        'SUM([paySum])': 'paySum'
      }) : []
    accruals.forEach(el => {
      paySums[0] += payElIDsFOP && payElIDsFOP.includes(el.payElID) ? el.paySum : 0
      paySums[1] += reportParams.FOZPIDs && reportParams.FOZPIDs.includes(el.payElID) ? el.paySum : 0
      paySums[2] += reportParams.RewardsSurchargeIDs && reportParams.RewardsSurchargeIDs.includes(el.payElID) ? el.paySum : 0
      paySums[3] += reportParams['SPV7540IDs'] && reportParams['SPV7540IDs'].includes(el.payElID) ? el.paySum : 0
      paySums[4] += reportParams.PremCompensIDs && reportParams.PremCompensIDs.includes(el.payElID) ? el.paySum : 0
      paySums[5] += reportParams['SPV7551IDs'] && reportParams['SPV7551IDs'].includes(el.payElID) ? el.paySum : 0
      paySums[6] += reportParams['SPV7552IDs'] && reportParams['SPV7552IDs'].includes(el.payElID) ? el.paySum : 0
      paySums[7] += reportParams.OvertimeHolidayIDs && reportParams.OvertimeHolidayIDs.includes(el.payElID) ? el.paySum : 0
      paySums[8] += reportParams['SPV7552IDs'] && reportParams['SPV7570IDs'].includes(el.payElID) ? el.paySum : 0
      paySums[9] += reportParams['SPV7580IDs'] && reportParams['SPV7580IDs'].includes(el.payElID) ? el.paySum : 0

    })
    let xx = 1
    let k = 0
    for (let i = 1; i <= 8; i++) {
      obj[firstTable ? colNum  === 1 ? `A75${i}0_1` : `A75${i}0_2` : colNum  === 1 ? `T1RXXXXG${81 + (xx++)}` : `T1RXXXXG${81 + (xx++)}`] = paySums[k++]
      if (i === 5) {
        obj[firstTable ? colNum  === 1 ? `A75${i}1_1` : `A75${i}1_2` : colNum  === 1 ? `T1RXXXXG${81 + (xx++)}` : `T1RXXXXG${81 + (xx++)}`] = paySums[k++]
        obj[firstTable ? colNum  === 1 ? `A75${i}2_1` : `A75${i}2_2` : colNum  === 1 ? `T1RXXXXG${81 + (xx++)}` : `T1RXXXXG${81 + (xx++)}`] = paySums[k++]
      }
    }

  }

  let numNPP = currencyService.round(DECLARBODY.A790_1, 0)
  if (empPosDatas && empPosDatas.length && numNPP >= 0) {
    getEmplInfo(DECLARBODY, numNPP, 1, true)
    numNPP = currencyService.round(numNPP + DECLARBODY.A780_1, 0)
    getEmplInfo(DECLARBODY, numNPP, 2, true)
    numNPP = currencyService.round(numNPP + DECLARBODY.A780_1, 0)

    if (DECLARBODY.A770_1 > 2) {
			const addEmployeeTable = []
      for (let i = 0; i < (DECLARBODY.A770_1 - 2); i = i + 2) {
        const rowInfo = {}
        getEmplInfo(rowInfo, numNPP, 1, false)
        numNPP = currencyService.round(numNPP + DECLARBODY.A780_1, 0)
        getEmplInfo(rowInfo, numNPP, 2, false)
        numNPP = currencyService.round(numNPP + DECLARBODY.A780_1, 0)
        addEmployeeTable.push(rowInfo)
      }
			addEmployeeTable.forEach((row, idx) => {
				// console.log('!! addEmployeeTable. rowNum: ', idx + 1, '. Obj = ', row)
			  for (let i = 2; i <= 101; i++) {
					const rownum = idx + 1
					const name = `T1RXXXXG${i}${[52, 53, 54, 55].includes(i) ? 'S' : ''}`
					updateCellInArray(data, name, rownum, row[name])
				}
			})
		}
  }
}

function addTempleteForCustomRow (params) {
  params.T1 = [
    `<br clear="none">
    <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td align="right" nowrap="nowrap" style="border: 0" >форма № 7-ПВ (один раз на чотири роки)</td>
  </tr>
  </tbody>
  </table>`, `
  <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td width="(100% - 580px)">&nbsp;</td>
  <td align="center" nowrap="nowrap" width="315px" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
  <td align="center" width="265px" style="border: 1px solid black">{{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
  </tr>
  </tbody>
  </table>`, `
  <br clear="none">

    <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td align="center" ><h3>Продовження Розділу IІІ. Відомості щодо відібраних працівників</h3></td>
  </tr>
  </tbody>
  </table>`, `
  <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 10pt; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
  	<tbody>`, `
          <tr>
            <td align="center" valign="middle" width="100px">Код рядка</td>
            <td width="(100% - 795px)">&nbsp;</td>
            <td width="215px">&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7110</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Порядковий номер працівника у вибірці (від 1 до КВ)</b><i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG2##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG3##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="left" valign="middle" width="100px"></td>
            <td class="borderDataA" align="center" valign="middle" colspan="14" width="(100% - 100px)"><b>Постійні індивідуальні дані працівника станом на 31 жовтня {{DECLAR.DECLARBODY.REP_Y}} року</b> (позначається один обраний варіант відповіді "ν" або заповнюється)</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7120</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стать</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG4##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7130</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Вік, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG8##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7131</td>
            <td class="borderTopBottom" align="left" valign="top" width="(100% - 795px)" rowspan="3">Громадянство:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">громадянин України - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG11##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">іноземець - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG12##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">особа без громадянства - 3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG14##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG15##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7140</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стаж роботи на підприємстві, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="9">7150</td>
            <td class="borderTopBottom" align="left" valign="top" width="(100% - 795px)" rowspan="9">Освіта:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">докторантура або її еквівалент - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG18##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG19##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">магістратура або її еквівалент - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG20##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG21##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">бакалаврат або його еквівалент - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG22##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG23##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">короткий цикл вищої освіти - 4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG24##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG25##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">післясередня не вища освіта - 5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG26##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG27##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">другий етап середньої освіти - 6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG28##ROWNUM{{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG29##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">перший етап середньої освіти - 7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG30##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG31##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">початкова освіта - 8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG32##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG33##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">дошкільна освіта - 9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG34##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG35##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
        </tr>`, `      
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7160</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="2">Форма оплати праці:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">почасова - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG36##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG37##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">відрядна - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG38##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG39##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7170</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="2">Умови робочого часу:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">повний робочий день - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG40##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG41##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">неповний робочий день - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG42##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG43##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7171</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Норма тривалості робочого часу на тиждень, годин</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.T1RXXXXG44##ROWNUM{{{}}}{{/float1Input}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.T1RXXXXG45##ROWNUM{{{}}}{{/float1Input}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7180</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="3">Тип трудового договору (контракту):</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">безстроковий - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG46##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG47##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">на визначений строк - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG48##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG49##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">проходить випробування - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG50##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG51##ROWNUM{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7190</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Професія (посада)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG52S##ROWNUM{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG53S##ROWNUM{{{}}}{{/textInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7191</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Код професії заповнюється в органі державної статистики (у разі подання електронної звітності – самостійно)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG54S##ROWNUM{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG55S##ROWNUM{{{}}}{{/textInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7210</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин</b><i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG56##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG57##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7220</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7210)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG58##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG59##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7230</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7220)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG60##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG61##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7310</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у  {{DECLAR.DECLARBODY.REP_Y}} році, годин </b><i>(у цілих числах) (сума рядків 7320, 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG62##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG63##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7320</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG64##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG65##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7330</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7320)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG66##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG67##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7340</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого оплаченого робочого часу (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG68##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG69##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7350</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого робочого часу з причин щорічних відпусток у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG70##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG71##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `             
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7410</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7420, 7430, 7440, 7450)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG72##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG73##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7420</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG74##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG75##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7430</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG76##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG77##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7440</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG78##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG79##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7450</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG80##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG81##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7510</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7520, 7530, 7540, 7550, 7560, 7570, 7580)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG82##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG83##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7520</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG84##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG85##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7530</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG86##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG87##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7540</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума доплати за роботу у важких і шкідливих умовах та в особливо важких і особливо шкідливих умовах праці у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG88##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG89##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7550</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у {{DECLAR.DECLARBODY.REP_Y}} році – усього, гривень <i>(із двома десятковими знаками) (≥ сумі рядків 7551, 7552)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG90##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG91##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7551</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород, що носять систематичний характер, у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG92##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG93##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7552</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума винагород за підсумками роботи у {{DECLAR.DECLARBODY.REP_Y}} році, щорічні винагороди за вислугу років (стаж роботи), гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG94##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG95##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7560</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG96##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG97##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7570</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати за невідпрацьований час (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG98##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG99##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7580</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума матеріальної допомоги у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG100##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG101##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
		</tbody>
</table>
        `
  ]
  params.T1BtnAddRow = ``

  params.T11 = [
    `<br clear="none">
    <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td align="right" nowrap="nowrap" style="border: 0" >форма № 7-ПВ (один раз на чотири роки)</td>
  </tr>
  </tbody>
  </table>`, `
  <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td width="(100% - 580px)">&nbsp;</td>
  <td align="center" nowrap="nowrap" width="315px" style="border: 1px solid black">Ідентифікаційний код ЄДРПОУ</td>
  <td align="center" width="265px" style="border: 1px solid black">{{#textInput}}DECLAR.DECLARBODY.FIRM_EDRPOU####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}</td>
  </tr>
  </tbody>
  </table>`, `
  <br clear="none">

    <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
    <tr>
    <td align="center" ><h3>Продовження Розділу IІІ. Відомості щодо відібраних працівників</h3></td>
  </tr>
  </tbody>
  </table>`, `
  <table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 10pt; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="0" bordercolor="black" cellspacing="0">
  	<tbody>`, `
          <tr>
            <td align="center" valign="middle" width="100px">Код рядка</td>
            <td width="(100% - 795px)">&nbsp;</td>
            <td width="215px">&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>

            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
            <td width="40px" >&nbsp;</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7110</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Порядковий номер працівника у вибірці (від 1 до КВ)</b><i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG2##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG3##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="left" valign="middle" width="100px"></td>
            <td class="borderDataA" align="center" valign="middle" colspan="14" width="(100% - 100px)"><b>Постійні індивідуальні дані працівника станом на 31 жовтня {{DECLAR.DECLARBODY.REP_Y}} року</b> (позначається один обраний варіант відповіді "ν" або заповнюється)</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7120</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стать</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG4##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG5"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG4"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">чоловік</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG7"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottom" align="left" valign="middle" width="40px">-1</td>
            <td class="borderTopBottom" align="right" valign="middle" width="40px">жінка</td>
            <td class="borderTopBottom" align="center" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG6"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopBottomRight" align="left" valign="middle" width="40px">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7130</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Вік, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG8##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7131</td>
            <td class="borderTopBottom" align="left" valign="top" width="(100% - 795px)" rowspan="3">Громадянство:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">громадянин України - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG12", "DECLAR.DECLARBODY.T1RXXXXG14"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG11##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG13", "DECLAR.DECLARBODY.T1RXXXXG15"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">іноземець - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG12##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG10", "DECLAR.DECLARBODY.T1RXXXXG14"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG11", "DECLAR.DECLARBODY.T1RXXXXG15"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">особа без громадянства - 3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG14##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG10", "DECLAR.DECLARBODY.T1RXXXXG12"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG15##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG11", "DECLAR.DECLARBODY.T1RXXXXG13"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7140</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Стаж роботи на підприємстві, повних років</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="9">7150</td>
            <td class="borderTopBottom" align="left" valign="top" width="(100% - 795px)" rowspan="9">Освіта:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">докторантура або її еквівалент - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG18##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG19##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">магістратура або її еквівалент - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG20##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG21##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">бакалаврат або його еквівалент - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG22##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG23##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">короткий цикл вищої освіти - 4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG24##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG25##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-4</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">післясередня не вища освіта - 5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG26##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG27##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-5</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">другий етап середньої освіти - 6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG28##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG29##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-6</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">перший етап середньої освіти - 7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG30##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG32", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG31##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG33", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-7</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">початкова освіта - 8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG32##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG34"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG33##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.T1RXXXXG25", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG35"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-8</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">дошкільна освіта - 9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG34##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG18", "DECLAR.DECLARBODY.T1RXXXXG20", "DECLAR.DECLARBODY.T1RXXXXG22", "DECLAR.DECLARBODY.T1RXXXXG24", "DECLAR.DECLARBODY.T1RXXXXG26", "DECLAR.DECLARBODY.T1RXXXXG28", "DECLAR.DECLARBODY.T1RXXXXG30", "DECLAR.DECLARBODY.T1RXXXXG32"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG35##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG19", "DECLAR.DECLARBODY.T1RXXXXG21", "DECLAR.DECLARBODY.T1RXXXXG23", "DECLAR.DECLARBODY.A71504_2", "DECLAR.DECLARBODY.T1RXXXXG27", "DECLAR.DECLARBODY.T1RXXXXG29", "DECLAR.DECLARBODY.T1RXXXXG31", "DECLAR.DECLARBODY.T1RXXXXG33"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-9</td>
        </tr>`, `      
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7160</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="2">Форма оплати праці:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">почасова - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG36##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG38"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG37##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG39"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">відрядна - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG38##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG36"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG39##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG37"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="2">7170</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="2">Умови робочого часу:</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">повний робочий день - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG40##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG42"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG41##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG43"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderBottomRight" align="left" valign="middle" width="215px">неповний робочий день - 2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG42##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG40"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td class="borderBottom" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderBottom" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG43##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG41"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderBottomRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7171</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Норма тривалості робочого часу на тиждень, годин</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.T1RXXXXG44##ROWNUM{{{}}}{{/float1Input}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#float1Input}}DECLAR.DECLARBODY.T1RXXXXG45##ROWNUM{{{}}}{{/float1Input}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px" rowspan="3">7180</td>
            <td class="borderTop" align="left" valign="top" width="(100% - 795px)" rowspan="3">Тип трудового договору (контракту):</td>
            <td class="borderTopRight" align="left" valign="middle" width="215px">безстроковий - 1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG46##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG48", "DECLAR.DECLARBODY.T1RXXXXG50"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
            <td class="borderTop" align="right" width="80px" colspan="2">&nbsp;</td>
            <td class="borderTop" align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG47##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG49", "DECLAR.DECLARBODY.T1RXXXXG51"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderTopRight" align="left" valign="middle" width="120px" colspan="3">-1</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">на визначений строк - 2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG48##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG46", "DECLAR.DECLARBODY.T1RXXXXG50"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px">{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG49##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG47", "DECLAR.DECLARBODY.T1RXXXXG51"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-2</td>
        </tr>`, `
        <tr>
            <td class="borderRight" align="left" valign="middle" width="215px">проходить випробування - 3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG50##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG46", "DECLAR.DECLARBODY.T1RXXXXG48"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
            <td align="right" width="80px" colspan="2">&nbsp;</td>
            <td align="right" width="40px" >{{#booleanInput}}DECLAR.DECLARBODY.T1RXXXXG51##ROWNUM{"printType":"box", "linkedPath": ["DECLAR.DECLARBODY.T1RXXXXG47", "DECLAR.DECLARBODY.T1RXXXXG49"]}{{{}}}{{/booleanInput}}</td>
            <td class="borderRight" align="left" valign="middle" width="120px" colspan="3">-3</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7190</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Професія (посада)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG52S##ROWNUM{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG53S##ROWNUM{{{}}}{{/textInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7191</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Код професії заповнюється в органі державної статистики (у разі подання електронної звітності – самостійно)</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG54S##ROWNUM{{{}}}{{/textInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG55S##ROWNUM{{{}}}{{/textInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7210</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин</b><i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG56##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG57##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7220</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7210)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG58##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG59##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7230</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, годин <i>(у цілих числах) (із рядка 7220)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG60##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG61##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7310</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Кількість оплаченого робочого часу (без тимчасової непрацездатності) у  {{DECLAR.DECLARBODY.REP_Y}} році, годин </b><i>(у цілих числах) (сума рядків 7320, 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG62##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG63##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7320</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG64##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG65##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7330</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість надурочно відпрацьованого робочого часу у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7320)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG66##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG67##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7340</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого оплаченого робочого часу (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG68##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG69##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7350</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Кількість невідпрацьованого робочого часу з причин щорічних відпусток у {{DECLAR.DECLARBODY.REP_Y}} році, годин <i>(у цілих числах) (із рядка 7340)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG70##ROWNUM{{{}}}{{/intInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG71##ROWNUM{{{}}}{{/intInput}}</td>
        </tr>`, `             
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7410</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7420, 7430, 7440, 7450)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG72##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG73##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7420</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG74##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG75##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7430</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG76##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG77##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7440</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG78##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG79##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7450</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні в жовтні {{DECLAR.DECLARBODY.REP_Y}} року, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG80##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG81##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7510</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2"><b>Сума нарахованої заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень </b><i>(із двома десятковими знаками) (≥ сумі рядків 7520, 7530, 7540, 7550, 7560, 7570, 7580)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG82##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG83##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7520</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума основної заробітної плати у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG84##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG85##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7530</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума надбавок та доплат за роботу в багатозмінному та безперервному режимі виробництва, у нічний час у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG86##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG87##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7540</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума доплати за роботу у важких і шкідливих умовах та в особливо важких і особливо шкідливих умовах праці у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG88##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG89##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7550</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород у {{DECLAR.DECLARBODY.REP_Y}} році – усього, гривень <i>(із двома десятковими знаками) (≥ сумі рядків 7551, 7552)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG90##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG91##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7551</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума премій та винагород, що носять систематичний характер, у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG92##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG93##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7552</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума винагород за підсумками роботи у {{DECLAR.DECLARBODY.REP_Y}} році, щорічні винагороди за вислугу років (стаж роботи), гривень <i>(із двома десятковими знаками) (із рядка 7550)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG94##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG95##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7560</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати роботи в надурочний час, у святкові та неробочі дні у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG96##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG97##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7570</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума оплати за невідпрацьований час (без тимчасової непрацездатності) у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG98##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG99##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
        <tr>
            <td class="borderDataA" align="center" valign="middle" width="100px">7580</td>
            <td class="borderDataA" align="left" valign="middle" width="(100% - 580px)" colspan="2">Сума матеріальної допомоги у {{DECLAR.DECLARBODY.REP_Y}} році, гривень <i>(із двома десятковими знаками)</i></td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG100##ROWNUM{{{}}}{{/currencyInput}}</td>
            <td class="borderDataA" align="left" valign="middle" width="240px" colspan="6">{{#currencyInput}}DECLAR.DECLARBODY.T1RXXXXG101##ROWNUM{{{}}}{{/currencyInput}}</td>
        </tr>`, `
		</tbody>
</table>
        `
  ]
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
    zeroFill(params.PERIOD_MONTH, 12),
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
    names: ['FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'OBL', 'RAY', 'YY', 'TER_GROM1', 'TER_GROM2', 'RUK', 'VIK_TEL', 'VIK_EMAIL',
      'A7190_1', 'A7190_2', 'A7191_1', 'A7191_2',
      'T1RXXXXG52S', 'T1RXXXXG53S', 'T1RXXXXG54S', 'T1RXXXXG55S'
    ],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A740_1', 'A740_2', 'A760_1', 'A760_2', 'A770_1', 'A770_2', 'A790_1', 'A7110_1', 'A7110_2', 'A7120_1', 'A7120_2', 'A7120_3', 'A7120_4',
      'A7110_1', 'A7110_2', 'A7120_1', 'A7120_2', 'A7120_3', 'A7120_4', 'A7130_1', 'A7130_2', 'A71311_1', 'A71311_2', 'A71312_1', 'A71312_2', 'A71313_1', 'A71313_2', 'A7140_1', 'A7140_2',
      'A71501_1', 'A71502_1', 'A71503_1', 'A71504_1', 'A71505_1', 'A71506_1', 'A71507_1', 'A71508_1', 'A71509_1',
      'A71501_2', 'A71502_2', 'A71503_2', 'A71504_2', 'A71505_2', 'A71506_2', 'A71507_2', 'A71508_2', 'A71509_2',
      'A71601_1', 'A71601_2', 'A71602_1', 'A71602_2', 'A71701_1', 'A71701_2', 'A71702_1', 'A71702_2', 'A7171_1', 'A7171_2',
      'A71801_1', 'A71802_1', 'A71803_1', 'A71801_2', 'A71802_2', 'A71803_2', 'A7210_1', 'A7210_2',

      'T1RXXXXG2', 'T1RXXXXG3','T1RXXXXG4', 'T1RXXXXG5','T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG11','T1RXXXXG12', 'T1RXXXXG13','T1RXXXXG14',
      'T1RXXXXG15', 'T1RXXXXG16', 'T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'T1RXXXXG21', 'T1RXXXXG22', 'T1RXXXXG23', 'T1RXXXXG24', 'T1RXXXXG25','T1RXXXXG26',
      'T1RXXXXG27', 'T1RXXXXG28', 'T1RXXXXG29', 'T1RXXXXG30', 'T1RXXXXG31', 'T1RXXXXG32', 'T1RXXXXG33', 'T1RXXXXG34', 'T1RXXXXG35', 'T1RXXXXG36', 'T1RXXXXG37', 'T1RXXXXG38',
      'T1RXXXXG39', 'T1RXXXXG40', 'T1RXXXXG41', 'T1RXXXXG42', 'T1RXXXXG43', 'T1RXXXXG44', 'T1RXXXXG45', 'T1RXXXXG46', 'T1RXXXXG47', 'T1RXXXXG48', 'T1RXXXXG49', 'T1RXXXXG50',
      'T1RXXXXG51', 'T1RXXXXG56', 'T1RXXXXG57'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A750_1', 'A750_2', 'A780_1', 'A780_2'
    ],
    format: {
      type: 'number',
      nillable: true,
      precision: 1
    }
  },
  {
    names: ['A7410_1', 'A7410_2', 'A7420_1', 'A7420_1',  'A7430_1', 'A7430_2', 'A7440_1', 'A7440_2', 'A7450_1', 'A7450_2',
      'A7510_1', 'A7510_2', 'A7520_1', 'A7520_2', 'A7530_1', 'A7530_2', 'A7540_1', 'A7540_2', 'A7550_1', 'A7550_2',
      'A7551_1', 'A7551_2', 'A7552_1', 'A7552_2', 'A7560_1', 'A7560_2', 'A7570_1', 'A7570_2', 'A7580_1', 'A7580_2',
      'T1RXXXXG72', 'T1RXXXXG73', 'T1RXXXXG74', 'T1RXXXXG75', 'T1RXXXXG76', 'T1RXXXXG77', 'T1RXXXXG78', 'T1RXXXXG79',
      'T1RXXXXG80', 'T1RXXXXG81', 'T1RXXXXG82', 'T1RXXXXG83', 'T1RXXXXG84', 'T1RXXXXG85', 'T1RXXXXG86', 'T1RXXXXG87',
      'T1RXXXXG88', 'T1RXXXXG89', 'T1RXXXXG90', 'T1RXXXXG91', 'T1RXXXXG92', 'T1RXXXXG93', 'T1RXXXXG94', 'T1RXXXXG95',
      'T1RXXXXG96', 'T1RXXXXG97', 'T1RXXXXG98', 'T1RXXXXG99', 'T1RXXXXG100', 'T1RXXXXG101'
    ],
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
  // TER_STRUK
  //DECLARBODY.KATOTTG = (DECLARBODY.AREACODE_KATOTTG && DECLARBODY.AREACODE_KATOTTG !== '') ? DECLARBODY.AREACODE_KATOTTG : ''
  //DECLARBODY.KATOTTG_FACT = DECLARBODY.KATOTTG
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
