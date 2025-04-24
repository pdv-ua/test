const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
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
  'FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_FAXORG', 'FIRM_NAME', 'FIRM_SPATO', 'REP_NYEAR', 'FIRM_KVED', 'REP_PERNM',
  'A3020_1', 'A3020_2', 'A3040_1', 'A3040_2', 'A3050_1', 'A3050_2', 'A3060_1', 'A3060_2', 'A3070_1', 'A3070_2', 'A3080_1', 'A3080_2', 'A3090_2',
  'A4080', 'A4090', 'A4100',
  'A5030', 'A5040', 'A5050', 'A5060', 'A5070', 'A5080', 'A5090',
  'A6010', 'A6020', 'A6030', 'A6040', 'A6050', 'A6060', 'A6070', 'A6080', 'A6090', 'A6100', 'A6130', 'A6140', 'A6150',
  'A7010', 'A7020', 'A7030', 'A7040',
  'A8010', 'A8020', 'A8030', 'A8040',
  'A9010', 'A9020', 'A9030', 'A9040', 'A9050', 'A9060', 'A9070',
  'B4080', 'B4090', 'B4100',
  'B7010', 'B7020', 'B7030', 'B7040',
  'C7010',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8',
  'N10', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8',
  'NOMER', 'OBL', 'RAY', 'TER_STRUK', 'VIK', 'MY_DATE', 'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL',
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
    'xsi:noNamespaceSchemaLocation': 'S0301116.xsd'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 3, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function prepareDataSpecific ({ data, params }) {
  const { DECLARHEAD, DECLARBODY } = data.DECLAR

  const bos = (params.bosID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode', 'employeeID']).selectById(params.bosID) : {}
  const resp = (params.respID) ? UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.respID) : {}
  const orgInfo = getInfoByOrg({ organizationID: params.organizationID })

  if (bos['employeeID']) {
    UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.code'])
      .where('employeeID', '=', bos['employeeID'])
      .where('contactTypeID.code', 'in', ['email', 'phone', 'mobPhone', 'fax'])
      .selectAsObject()
      .forEach(contact => { bos[contact['contactTypeID.code']] = contact.value })
  }
  DECLARBODY.VIK_RUK = bos['employeeID.shortFIO']
  DECLARBODY.VIK = resp['employeeID.shortFIO']
  DECLARBODY.VIK_TEL = bos['phone']
  DECLARBODY.VIK_EMAIL = bos['email']

  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

  // add non std data for org
  const orgAddress = UB.Repository('ac_address')
    .attrs(['address'])
    .where('ownerID', '=', params.organizationID)
    .where('addressType', '=', '1')
    .limit(1)
    .selectSingle() || {}

  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD + ' ' + DECLARHEAD.PERIOD_YEAR
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.FIRM_ADR = DECLARBODY.HLOC
  DECLARBODY.FIRM_ADR_FIZ = orgAddress.address
  DECLARBODY.N1 = DECLARBODY.HKVED_S || orgInfo['hkvedS']
  DECLARBODY.FIRM_FAXORG = orgInfo['fax']

  if (DECLARHEAD.PERIOD_MONTH === 12) {
    DECLARBODY.REP_PER1 = 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR + 1
  } else {
    DECLARBODY.REP_PER1 = DECLARHEAD.PERIOD_MONTH + 1
    DECLARBODY.REP_NYEAR = DECLARHEAD.PERIOD_YEAR
  }
  DECLARBODY.REP_PYEAR = DECLARBODY.REP_NYEAR - 1

  const periodMonths = [-3, -2, -1].map(monthNum => {
    return {
      dateFrom: new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH + monthNum, 1, 0, 0, 0, 0)),
      dateTo: dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH + monthNum, 1, 0, 0, 0, 0)))
    }
  })
  const reportParams = reportService.getReportParams(params.organizationID, ['FOZP', 'FDZP', 'ZKV', 'notAvgQuantity', '3050', '3060', '3090', '3100', '4080', '4100', '5040', '5050', '5051', '5052', '5070', '5080', '5090', '6020-6120', '6150'])
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

  const pmSum = UB.Repository('hr_dictLivingCost')
    .where('[dateFrom]', '<=', dateService.shiftDate(periodMonths[2].dateFrom))
    .orderBy('dateFrom', 'desc')
    .attrs(['workingPerson'])
    .limit(1)
    .selectScalar() || 0

  // Part I

  const hiredCount = UB.Repository('hr_employeePositionS')
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '>=', dateService.shiftDate(params.dateFrom))
    .where('[dateFrom]', '<=', dateService.shiftDate(params.dateTo))
    .where('[workPlace]', '=', '1')
    .where('[employeeNumberID.dateFrom]=[dateFrom]', 'custom')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .attrs(['COUNT(*)', 'SUM(CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN 1 ELSE 0 END)'])
    .selectSingle({
      'COUNT(*)': 'c_all',
      'SUM(CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN 1 ELSE 0 END)': 'c_women'
    })
  DECLARBODY.A3020_1 = hiredCount.c_all
  DECLARBODY.A3020_2 = hiredCount.c_women

  const firedEmps = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateTo]', '>=', dateService.shiftDate(params.dateFrom))
    .where('[dateTo]', '<=', dateService.shiftDate(params.dateTo))
    .where('[workPlace]', '=', '1')
    .where('[employeeNumberID.dateTo]=[dateTo]', 'custom')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .groupBy(['employeeNumberID', 'employeeNumberID.employeeID.sexType'])
    .selectAsObject({
      'employeeNumberID.employeeID.sexType': 'sexType'
    })

  const firedCount = firedEmps.reduce((accum, row) => {
    accum.c_all++
    if (row.sexType === 'W') {
      accum.c_women++
    }
    return accum
  }, { c_all: 0, c_women: 0 })
  DECLARBODY.A3040_1 = firedCount.c_all
  DECLARBODY.A3040_2 = firedCount.c_women

  const store = UB.DataStore('hr_orderPay')
  if (firedEmps.length && reportParams['3050IDs'].length) {
    store.runSQL(` select count(*) as "c_all",
  SUM(CASE WHEN e.sexType ='W' THEN 1 ELSE 0 END) as "c_women"
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
    const fireOrders3050 = store.getAsJsObject()
    DECLARBODY.A3050_1 = fireOrders3050.length ? fireOrders3050[0].c_all : 0
    DECLARBODY.A3050_2 = fireOrders3050.length ? (fireOrders3050[0].c_women || 0) : 0
  } else {
    DECLARBODY.A3050_1 = 0
    DECLARBODY.A3050_2 = 0
  }
  if (firedEmps.length && reportParams['3060IDs'].length) {
    store.runSQL(` select count(*) as "c_all",
  SUM(CASE WHEN e.sexType ='W' THEN 1 ELSE 0 END) as "c_women"
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
    const fireOrders3060 = store.getAsJsObject()
    DECLARBODY.A3060_1 = fireOrders3060.length ? fireOrders3060[0].c_all : 0
    DECLARBODY.A3060_2 = fireOrders3060.length ? (fireOrders3060[0].c_women || 0) : 0
  } else {
    DECLARBODY.A3060_1 = 0
    DECLARBODY.A3060_2 = 0
  }

  const workingEmps = UB.Repository('hr_employeePositionS')
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '<=', dateService.shiftDate(params.dateTo))
    .where('[dateTo]', '>=', dateService.shiftDate(dateService.truncTime(params.dateTo)))
    .where('[workPlace]', '=', '1')
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
    }
    return accum
  }, { c_all: 0, c_women: 0 })
  DECLARBODY.A3070_1 = workingCount.c_all
  DECLARBODY.A3070_2 = workingCount.c_women

  if (data.DECLAR.DECLARHEAD.PERIOD_MONTH === 12) {
    const partialTimeCount = UB.Repository('hr_timeSheetChangeEmp')
      .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
      .where('[timeSheetChangeID.dateFrom]', '<=', dateService.shiftDate(params.dateTo))
      .where('[timeSheetChangeID.dateTo]', '>', dateService.shiftDate(dateService.truncTime(params.dateTo)))
      .where('[timeSheetChangeID.typeSheetChange]', '<>', '2')
      .attrs(['COUNT(DISTINCT [employeeNumberID])', 'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)'])
      .selectSingle({
        'COUNT(DISTINCT [employeeNumberID])': 'c_all',
        'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)': 'c_women'
      })
    DECLARBODY.A3080_1 = partialTimeCount.c_all
    DECLARBODY.A3080_2 = partialTimeCount.c_women

    const timeSheets3090 = reportParams['3090IDs'].length ? UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
      .where('[isActive]', '=', true)
      .where('[factTimeCostID]', 'in', reportParams['3090IDs'])
      .where('[dateWork]', '=', dateService.shiftDate(dateService.truncTime(params.dateTo)))
      .attrs(['COUNT(DISTINCT [employeeNumberID])', 'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)'])
      .selectSingle({
        'COUNT(DISTINCT [employeeNumberID])': 'c_all',
        'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)': 'c_women'
      }) : {}
    DECLARBODY.A3090_1 = timeSheets3090.c_all
    DECLARBODY.A3090_2 = timeSheets3090.c_women

    const timeSheets3100 = reportParams['3100IDs'].length ? UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', workingEmps.map(row => row.employeeNumberID))
      .where('[isActive]', '=', true)
      .where('[factTimeCostID]', 'in', reportParams['3100IDs'])
      .where('[dateWork]', '=', dateService.shiftDate(dateService.truncTime(params.dateTo)))
      .attrs(['COUNT(DISTINCT [employeeNumberID])', 'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)'])
      .selectSingle({
        'COUNT(DISTINCT [employeeNumberID])': 'c_all',
        'COUNT(DISTINCT CASE WHEN [employeeNumberID.employeeID.sexType]=\'W\' THEN [employeeNumberID] ELSE NULL END)': 'c_women'
      }) : {}
    DECLARBODY.A3100_1 = timeSheets3100.c_all
    DECLARBODY.A3100_2 = timeSheets3100.c_women
  }

  const dictFundSource = UB.Repository('ac_dictFundSource')
    .attrs('fundSourceID', 'dictBudgetID.budgetTypeID.groupBudget')
    .where('organizationID', '=', params.organizationID)
    .selectAsObject({
      'dictBudgetID.budgetTypeID.groupBudget': 'groupBudget'
    })
  const fundFource = {}
  dictFundSource.forEach(row => {
    fundFource[row.fundSourceID] = row.groupBudget
  })

  // Part II

  periodMonths.forEach(periodMonth => {
    const empPosDatas = UB.Repository('hr_employeePositionS')
      .where('[organizationID]', '=', params.organizationID)
      .where('[dateFrom]', '<=', dateService.shiftDate(periodMonth.dateTo))
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .orderBy('dateFrom')
      .attrs(['employeeNumberID', 'workPlace', 'workScheduleID', 'employeeNumberID.dateFrom',
        'employeeNumberID.dateTo', 'employeeNumberID.employeeID.sexType', 'dictFundSourceID',
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
      empPosData.groupBudget = fundFource[empPosData['dictFundSourceID']]
    })
    periodMonth.lastWorkPlaces = Object.values(lastWorkPlaceByEmp)
    periodMonth.empNumIDs = periodMonth.lastWorkPlaces
      .filter(empPosData => ['1', '2'].indexOf(empPosData.workPlace) >= 0)
      .map(empPosData => empPosData.employeeNumberID)
    periodMonth.empNumCurrentIDs = periodMonth.lastWorkPlaces
      .filter(empPosData => empPosData.workPlace === '1')
      .map(empPosData => empPosData.employeeNumberID)
  })

  const notWorkedTime4080 = periodMonths.map(periodMonth => {
    return UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
      .where('[isActive]', '=', true)
      .where('[factTimeCostID]', 'in', reportParams['4080IDs'].length ? reportParams['4080IDs'] : [0])
      .where('[dateWork]', '>=', dateService.shiftDate(periodMonth.dateFrom))
      .where('[dateWork]', '<=', dateService.shiftDate(periodMonth.dateTo))
      .attrs(['employeeNumberID.employeeID', 'SUM([planHour])'])
      .groupBy('employeeNumberID.employeeID')
      .selectAsObject({
        'employeeNumberID.employeeID': 'employeeID',
        'SUM([planHour])': 'c_hour'
      }).reduce((accum, row) => {
        accum.c_hour += row.c_hour
        accum.employeeIDs.push(row.employeeID)
        return accum
      }, { c_hour: 0, employeeIDs: [] })
  }).reduce((accum, row) => {
    accum.c_hour += row.c_hour
    accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
    return accum
  }, { c_hour: 0, employeeIDs: [] })
  DECLARBODY.A4080 = Math.round(notWorkedTime4080.c_hour)
  DECLARBODY.B4080 = (new Set(notWorkedTime4080.employeeIDs)).size

  const notWorkedTime4090 = periodMonths.map(periodMonth => {
    return UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
      .where('[isActive]', '=', true)
      .where('[orderID.orderClass.entityName]', '=', 'hr_timeSheetChange')
      .where('[dateWork]', '>=', dateService.shiftDate(periodMonth.dateFrom))
      .where('[dateWork]', '<=', dateService.shiftDate(periodMonth.dateTo))
      .exists(
        UB.Repository('hr_timeSheetChangeEmp')
          .where('[timeSheetChangeID.typeSheetChange]', '=', '3')
          .correlation('timeSheetChangeID', 'orderID')
      )
      .attrs(['employeeNumberID.employeeID', 'SUM([planHour])'])
      .groupBy('employeeNumberID.employeeID')
      .selectAsObject({
        'employeeNumberID.employeeID': 'employeeID',
        'SUM([planHour])': 'c_hour'
      }).reduce((accum, row) => {
        accum.c_hour += row.c_hour
        accum.employeeIDs.push(row.employeeID)
        return accum
      }, { c_hour: 0, employeeIDs: [] })
  }).reduce((accum, row) => {
    accum.c_hour += row.c_hour
    accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
    return accum
  }, { c_hour: 0, employeeIDs: [] })
  DECLARBODY.A4090 = Math.round(notWorkedTime4090.c_hour)
  DECLARBODY.B4090 = (new Set(notWorkedTime4090.employeeIDs)).size

  const notWorkedTime4100 = periodMonths.map(periodMonth => {
    return UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
      .where('[isActive]', '=', true)
      .where('[factTimeCostID]', 'in', reportParams['4100IDs'].length ? reportParams['4100IDs'] : [0])
      .where('[dateWork]', '>=', dateService.shiftDate(periodMonth.dateFrom))
      .where('[dateWork]', '<=', dateService.shiftDate(periodMonth.dateTo))
      .attrs(['employeeNumberID.employeeID', 'SUM([planHour])'])
      .groupBy('employeeNumberID.employeeID')
      .selectAsObject({
        'employeeNumberID.employeeID': 'employeeID',
        'SUM([planHour])': 'c_hour'
      }).reduce((accum, row) => {
        accum.c_hour += row.c_hour
        accum.employeeIDs.push(row.employeeID)
        return accum
      }, { c_hour: 0, employeeIDs: [] })
  }).reduce((accum, row) => {
    accum.c_hour += row.c_hour
    accum.employeeIDs = accum.employeeIDs.concat(row.employeeIDs)
    return accum
  }, { c_hour: 0, employeeIDs: [] })
  DECLARBODY.A4100 = Math.round(notWorkedTime4100.c_hour)
  DECLARBODY.B4100 = (new Set(notWorkedTime4100.employeeIDs)).size

  // Part III

  function part3Alg (mainPayElIDs, addPayElIDs) {
    const paySum = periodMonths.reduce((accum, periodMonth) => {
      return accum + (UB.Repository('hr_accrual')
        .where('[employeeNumberID]', 'in', periodMonth.empNumIDs)
        .where('[payElID]', 'in', mainPayElIDs)
        .whereIf(addPayElIDs, '[payElID]', 'in', addPayElIDs)
        .where('periodCalc', '<=', dateService.shiftDate(periodMonth.dateTo))
        .where('periodSalary', '<=', dateService.shiftDate(periodMonth.dateTo))
        .where('periodCalc', '=', dateService.shiftDate(periodMonth.dateFrom), 'case1')
        .where('periodCalc', '<', dateService.shiftDate(periodMonth.dateFrom), 'case2')
        .where('periodSalary', '=', dateService.shiftDate(periodMonth.dateFrom), 'cond2')
        .where(`(flagsRec & 8192 != 8192)`, 'custom')
        .logic('([case1] OR ([case2] AND [cond2]))')
        .attrs(['SUM([paySum])'])
        .selectScalar() || 0)
    }, 0)
    return Math.round(paySum / 100) / 10
  }
  DECLARBODY.A5020 = part3Alg(reportParams.FOZPIDs)
  DECLARBODY.A5030 = part3Alg(reportParams.FDZPIDs)
  DECLARBODY.A5040 = part3Alg(reportParams.FDZPIDs, reportParams['5040IDs'])
  DECLARBODY.A5050 = part3Alg(reportParams.FDZPIDs, reportParams['5050IDs'])
  DECLARBODY.A5051 = part3Alg(reportParams.FDZPIDs, reportParams['5051IDs'])
  DECLARBODY.A5052 = part3Alg(reportParams.FDZPIDs, reportParams['5052IDs'])
  DECLARBODY.A5060 = part3Alg(reportParams.ZKVIDs)
  DECLARBODY.A5070 = part3Alg(reportParams.ZKVIDs, reportParams['5070IDs'])
  DECLARBODY.A5080 = part3Alg(reportParams.ZKVIDs, reportParams['5080IDs'])
  DECLARBODY.A5090 = part3Alg(reportParams.FDZPIDs.concat(reportParams.ZKVIDs), reportParams['5090IDs'])

  // part IV

  let lastMonthDateFrom = dateService.shiftDate(periodMonths[2].dateFrom)
  let lastMonthDateTo = dateService.shiftDate(periodMonths[2].dateTo)

  const workedTimeData = UB.Repository('tim_timeSheet')
    .where('[employeeNumberID]', 'in', periodMonths[2].empNumCurrentIDs) // periodMonths[2].empNumIDs)
    .where('[isActive]', '=', true)
    .where('[dateWork]', '>=', lastMonthDateFrom)
    .where('[dateWork]', '<=', lastMonthDateTo)
    .attrs(['employeeNumberID', 'factTimeCostID.timeCostType',
      'CASE WHEN [orderID.orderClass.entityName]=\'hr_timeSheetChange\' THEN [orderID] END',
      'CASE WHEN [factTimeCostID.timeCostType]<>\'WORK\' THEN [factTimeCostID] END',
      'SUM([planHour])', 'SUM([factHour])'])
    .groupBy('employeeNumberID')
    .groupBy('factTimeCostID.timeCostType')
    .groupBy('orderID')
    .groupBy('orderID.orderClass.entityName')
    .groupBy('CASE WHEN [factTimeCostID.timeCostType]<>\'WORK\' THEN [factTimeCostID] END')
    .selectAsObject({
      'SUM([planHour])': 'planHour',
      'SUM([factHour])': 'factHour',
      'factTimeCostID.timeCostType': 'timeCostType',
      'CASE WHEN [orderID.orderClass.entityName]=\'hr_timeSheetChange\' THEN [orderID] END': 'orderID',
      'CASE WHEN [factTimeCostID.timeCostType]<>\'WORK\' THEN [factTimeCostID] END': 'factTimeCostID'
    })

  const timeSheetChangeIDs = workedTimeData.map(row => row.orderID).filter(orderID => !!orderID)
  const timeSheetChangeType2IDs = UB.Repository('hr_timeSheetChange')
    .where('[ID]', 'in', timeSheetChangeIDs)
    .where('[typeSheetChange]', '=', 2)
    .attrs(['ID'])
    .selectAsObject()
    .reduce((accum, row) => {
      accum[row.ID] = true
      return accum
    }, {})
  const hourTotalsByEmployee = workedTimeData.reduce((accum, row) => {
    let employeeHours = accum[row.employeeNumberID]
    if (!employeeHours) {
      employeeHours = accum[row.employeeNumberID] = { employeeNumberID: row.employeeNumberID, planHour: 0, fullHour: 0, shortHour: 0, absenseHour: 0, paySum: 0 }
    }
    employeeHours.planHour += row.planHour
    if ((row.timeCostType === 'WORK') && !timeSheetChangeType2IDs[row.orderID]) {
      employeeHours.fullHour += row.factHour
    }
    if ((row.timeCostType === 'WORK') && timeSheetChangeType2IDs[row.orderID]) {
      employeeHours.shortHour += row.planHour
    }
    if ((row.timeCostType !== 'WORK') && (reportParams['6020-6120IDs'].indexOf(row.factTimeCostID) >= 0)) {
      employeeHours.absenseHour += row.planHour
    }
    return accum
  }, {})
  const hourTotals = Object.values(hourTotalsByEmployee)
  hourTotals.forEach(hourTotals => {
    hourTotals.timePerc = Math.round((hourTotals.fullHour + hourTotals.shortHour + hourTotals.absenseHour) / hourTotals.planHour * 100)
  })

  const payTotals = UB.Repository('hr_accrual')
    .where('[employeeNumberID]', 'in', Object.values(hourTotalsByEmployee).map(row => row.employeeNumberID))
    .where('[payElID]', 'in', payElIDsFOP)
    .where('periodCalc', '<=', lastMonthDateTo, 'case11')
    .where('periodCalc', '>=', lastMonthDateFrom, 'case12')
    .where('periodSalary', '<=', lastMonthDateTo, 'cond1')
    .where('periodSalary', '>=', lastMonthDateFrom, 'case21')
    .where('periodSalary', '<=', lastMonthDateTo, 'case22')
    .where('periodCalc', '<', lastMonthDateFrom, 'cond2')
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .logic('(([case11] AND [case12] AND [cond1]) OR ([case21] AND [case22] AND [cond2]))')
    .attrs(['employeeNumberID', 'SUM([paySum])'])
    .groupBy('employeeNumberID')
    .selectAsObject({
      'SUM([paySum])': 'paySum'
    })
  payTotals.forEach(row => {
    hourTotalsByEmployee[row.employeeNumberID].paySum = row.paySum
  })

  DECLARBODY.A6020 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[0] && (salaryRanges[0].valueFrom <= row.paySum) && (row.paySum < salaryRanges[0].valueTo)).length
  DECLARBODY.A6030 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[1] && (salaryRanges[1].valueFrom <= row.paySum) && (row.paySum < salaryRanges[1].valueTo)).length
  DECLARBODY.A6040 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[2] && (salaryRanges[2].valueFrom <= row.paySum) && (row.paySum < salaryRanges[2].valueTo)).length
  DECLARBODY.A6050 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[3] && (salaryRanges[3].valueFrom <= row.paySum) && (row.paySum < salaryRanges[3].valueTo)).length
  DECLARBODY.A6060 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[4] && (salaryRanges[4].valueFrom <= row.paySum) && (row.paySum < salaryRanges[4].valueTo)).length
  DECLARBODY.A6070 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[5] && (salaryRanges[5].valueFrom <= row.paySum) && (row.paySum < salaryRanges[5].valueTo)).length
  DECLARBODY.A6080 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[6] && (salaryRanges[6].valueFrom <= row.paySum) && (row.paySum < salaryRanges[6].valueTo)).length
  DECLARBODY.A6090 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[7] && (salaryRanges[7].valueFrom <= row.paySum) && (row.paySum < salaryRanges[7].valueTo)).length
  DECLARBODY.A6100 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[8] && (salaryRanges[8].valueFrom <= row.paySum) && (row.paySum < salaryRanges[8].valueTo)).length
  DECLARBODY.A6110 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[9] && (salaryRanges[9].valueFrom <= row.paySum) && (row.paySum < salaryRanges[9].valueTo)).length
  DECLARBODY.A6120 = hourTotals.filter(row => row.timePerc >= 50 && salaryRanges[10] && (salaryRanges[10].valueFrom <= row.paySum) && (row.paySum < salaryRanges[10].valueTo)).length
  DECLARBODY.A6130 = hourTotals.filter(row => row.timePerc >= 100).length
  DECLARBODY.A6140 = hourTotals.filter(row => row.timePerc >= 100 && row.paySum < minSalarySum).length

  DECLARBODY.A6150 = UB.Repository('tim_timeSheet')
    .where('[employeeNumberID]', 'in', workingEmps.filter(row => row.accrualSum < pmSum).map(row => row.employeeNumberID))
    .where('[isActive]', '=', true)
    .where('[factTimeCostID]', 'notIn', reportParams['6150IDs'].length ? reportParams['6150IDs'] : [0])
    .where('[dateWork]', '=', dateService.shiftDate(dateService.truncTime(params.dateTo)))
    .attrs(['COUNT(DISTINCT [employeeNumberID])'])
    .selectScalar()

  DECLARBODY.MY_DATE = dateService.formatDate(params.dateTo, 'mmmm yyyy')

  // part V
  const part5Data = {
    '7010': { days: 0, factHour: 0, paySum: 0 },
    '7020': { days: 0, factHour: 0, paySum: 0 },
    '7030': { days: 0, factHour: 0, paySum: 0 },
    '7040': { days: 0, factHour: 0, paySum: 0 },
    totalDays: 0
  }

  periodMonths.map(periodMonth => {
    part5Data.totalDays += dateService.lastDayOfMonth(periodMonth.dateFrom).getDate()
    periodMonth.lastWorkPlaces.forEach(empPosData => {
      empPosData.part5rows = []
      if (empPosData.workPlace === '1' && (empPosData.sexType === 'W')) { empPosData.part5rows.push('7010') }
      if (empPosData.workPlace === '1' && (empPosData.groupBudget === 'state')) { empPosData.part5rows.push('7020') }
      if (empPosData.workPlace === '3') { empPosData.part5rows.push('7030') }
      if (empPosData.accCategory === '7') { empPosData.part5rows.push('7040') }
    })

    // filter by workPlace and correct fire date 111
    let workEmps = periodMonth.lastWorkPlaces
      .filter(empPosData => empPosData.part5rows.length > 0)
    let workEmpNumIDs = workEmps
      .filter(empPos => dateService.shiftDate(empPos.employeeDateTo) < dateService.shiftDate(dateService.lastDayOfMonth(periodMonth.dateTo)))
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
INNER JOIN hr_dictTimeCost dt ON dt.ID=tp.dictTimeCostID
INNER JOIN hr_employeePosition ep ON ep.workScheduleID = tp.workScheduleID AND ep.isActive = 1
INNER JOIN hr_employeeNumber en ON en.ID=ep.employeeNumberID
WHERE tp.organizationID= :orgID:
AND tp.dayDate>en.dateTo
AND dt.timeCostType='WORK'
AND tp.mi_deleteDate>= '9999-12-31'
AND en.ID IN (${workEmpNumIDs})
AND tp.workScheduleID IN (${workScheduleIDs})
Group by tp.workScheduleID, en.ID
    `
      const tmStore = UB.DataStore('tim_plan')
      tmStore.runSQL(minDayDateSQL,
        {
          orgID: params.organizationID
        })
      minDayDateData = tmStore.getAsJsObject()
      tmStore.freeNative()
    }

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
          dateFrom: dateService.shiftDate(empPosData.employeeDateFrom),
          dateTo: dateTo,
          dateToCorr: dateToCorr
        }
      })
    // index by employeeNumberID
    const empNumsByEmp = empNums.reduce((accum, row) => {
      accum[row.employeeNumberID] = row
      return accum
    }, {})

    // load corresponding timesheets within month
    const timeSheets = UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', empNums.map(empNum => empNum.employeeNumberID))
      .where('[isActive]', '=', true)
      .where('[factTimeCostID]', 'notIn', reportParams.notAvgQuantityIDs ? reportParams.notAvgQuantityIDs : [0])
      .where('[dateWork]', '>=', dateService.shiftDate(periodMonth.dateFrom))
      .where('[dateWork]', '<=', dateService.shiftDate(periodMonth.dateTo))
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
          part5Data[rowCode].days++
          part5Data[rowCode].factHour += timeSheet.factHour
        })
      }
    })

    // find fop sum
    const payTotals = UB.Repository('hr_accrual')
      .where('[employeeNumberID]', 'in', empNums.map(row => row.employeeNumberID))
      .where('[payElID]', 'in', payElIDsFOP)
      .where('periodCalc', '<=', dateService.shiftDate(periodMonth.dateTo))
      .where('periodSalary', '<=', dateService.shiftDate(periodMonth.dateTo))
      .where('periodCalc', '=', dateService.shiftDate(periodMonth.dateFrom), 'case1')
      .where('periodCalc', '<', dateService.shiftDate(periodMonth.dateFrom), 'case2')
      .where('periodSalary', '=', dateService.shiftDate(periodMonth.dateFrom), 'cond2')
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .logic('([case1] OR ([case2] AND [cond2]))')
      .attrs(['employeeNumberID', 'SUM([paySum])'])
      .groupBy('employeeNumberID')
      .selectAsObject({
        'SUM([paySum])': 'paySum'
      })
    payTotals.forEach(row => {
      const empNum = empNumsByEmp[row.employeeNumberID]
      empNum.part5rows.forEach(rowCode => {
        part5Data[rowCode].paySum += row.paySum
      })
    })
  })

  DECLARBODY.A7010 = Math.round(part5Data['7010'].days / part5Data.totalDays)
  DECLARBODY.A7020 = Math.round(part5Data['7020'].days / part5Data.totalDays)
  DECLARBODY.A7030 = Math.round(part5Data['7030'].days / part5Data.totalDays)
  DECLARBODY.A7040 = Math.round(part5Data['7040'].days / part5Data.totalDays)
  DECLARBODY.B7010 = Math.round(part5Data['7010'].paySum / 100) / 10
  DECLARBODY.B7020 = Math.round(part5Data['7020'].paySum / 100) / 10
  DECLARBODY.B7030 = Math.round(part5Data['7030'].paySum / 100) / 10
  DECLARBODY.B7040 = Math.round(part5Data['7040'].paySum / 100) / 10
  DECLARBODY.C7010 = Math.round(part5Data['7010'].factHour)
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
    names: ['FIRM_ADR', 'FIRM_ADR_FIZ', 'FIRM_EDRPOU', 'FIRM_FAXORG', 'FIRM_NAME', 'FIRM_SPATO', 'FIRM_KVED', 'REP_PERNM', 'OBL', 'RAY', 'TER_STRUK', 'VIK', 'MY_DATE', 'VIK_RUK', 'VIK_TEL', 'VIK_EMAIL', 'N9', 'N11', 'N1', 'N12', 'K12'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR', 'A3020_1', 'A3020_2', 'A3040_1', 'A3040_2', 'A3050_1', 'A3050_2', 'A3060_1', 'A3060_2', 'A3070_1', 'A3070_2', 'A3080_1', 'A3080_2', 'A3090_2', 'A4080', 'A4090', 'A4100',
      'A6010', 'A6020', 'A6030', 'A6040', 'A6050', 'A6060', 'A6070', 'A6080', 'A6090', 'A6100', 'A6130', 'A6140', 'A6150', 'A7010', 'A7020', 'A7030', 'A7040', 'A8010', 'A8020',
      'B4080', 'B4090', 'B4100', 'C7010', 'NOMER', 'A3100_1', 'A3100_2', 'A6110', 'A6120', 'A9070'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['A5030', 'A5040', 'A5050', 'A5060', 'A5070', 'A5080', 'A5090', 'B7010', 'B7020', 'B7030', 'B7040', 'A5051', 'A5052', 'A5010', 'A5020', 'A9010', 'A9020', 'A9030', 'A9040', 'A9050', 'A9060'],
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
