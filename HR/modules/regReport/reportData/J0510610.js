const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, correctRowNum } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const experienceService = require('../../../modules/experienceService')
const periodService = require('../../../../HR/modules/periodService')
const stringService = require('../../../../AC/modules/dataServices/stringService')
const payElService = require('../../../../HR/modules/payElService')
const contService = require('../../../../HR/modules/contService')
const accrualService = require('../../../../HR/modules/accrualService')

module.exports = {
  generateData,
  exportConfig: ['xml'],
  xmlExport
}

function generateData(params = {}) {
  const tabsData = []
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
  const infoByOrg = UB.Repository('ac_organization')
    .attrs(['orgBusinessTypeID.code', 'ECBCode'])
    .selectById(params.organizationID) || {}
  DECLARBODY.H01 = infoByOrg['orgBusinessTypeID.code'] === 'БУ'
  DECLARBODY.HNREG = infoByOrg.ECBCode
  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)
  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']
  DECLARBODY.HZ = (params.FORM_TYPE === 'HZ' || params.FORM_TYPE === 'HZD') ? '1' : '0'
  DECLARBODY.HZN = params.FORM_TYPE === 'HZN' ? '1' : '0'
  DECLARBODY.HZU = params.FORM_TYPE === 'HZU' ? '1' : '0'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD' ? '1' : '0'

  DECLARBODY.HZY = params.PERIOD_YEAR
  DECLARBODY.HZKV = parseInt(params.PERIOD_MONTH) / 3
  DECLARBODY.PERIOD_MONTH = parseInt(params.PERIOD_MONTH)
  DECLARHEAD.D_FILL = moment().format('DDMMYYYY')
  DECLARBODY.HFILL = moment(params.HFILL).format('DDMMYYYY')
  if (params.FORM_TYPE === 'HZD') {
    if (params.PERIOD_FROM) {
      const fromPeriod = periodService.getPeriod(params.PERIOD_FROM)
      params.dateFrom = fromPeriod.dateFrom
    }
    if (params.PERIOD_TO) {
      const toPeriod = periodService.getPeriod(params.PERIOD_TO)
      params.dateTo = toPeriod.dateTo
    }
  }
  const cont = {
    orgID: params.organizationID,
    payEl: payElService.getPayEl({}),
    emp: {}
  }
  contService.initDict(cont)
  const periods = periodService.getPeriodsByDate(params.organizationID, params.dateFrom, params.dateTo)
  periods.forEach((period) => {
    const periodData = {
      DECLAR: {
        $: Object.assign({}, data.DECLAR.$),
        DECLARBODY: Object.assign({}, data.DECLAR.DECLARBODY),
        DECLARHEAD: Object.assign({}, data.DECLAR.DECLARHEAD),
        PARAMS: Object.assign({}, data.DECLAR.PARAMS)
      },
      cellSettings: data.cellSettings
    }
    periodData.DECLAR.DECLARHEAD.C_DOC_CNT = periodData.DECLAR.DECLARBODY.HNM = periodData.DECLAR.DECLARBODY.HNUM1 = [0, 3, 6, 9].includes(period.dateFrom.getMonth())
      ? 1 : [1, 4, 7, 10].includes(period.dateFrom.getMonth()) ? 2 : 3
    prepareDataSpecific({ data: periodData, params, periodCalc: period, cont })
    tabsData.push({ data: periodData, errorMessages })
  })
  return tabsData[0]
}

const allBodyAttrNames = [
  'HZ', 'HTIN', 'HTIN1', 'HNAME', 'HZY', 'HZB', 'HZS', 'HZD', 'HZN', 'HZU', 'HNM', 'HNUM1', 'H01',
  'HZKV',
  'T1RXXXXG5', 'T1RXXXXG6S', 'T1RXXXXG7S', 'T1RXXXXG81S', 'T1RXXXXG82S', 'T1RXXXXG83S', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG11',
  'T1RXXXXG121', 'T1RXXXXG122', 'T1RXXXXG131', 'T1RXXXXG132', 'T1RXXXXG133', 'T1RXXXXG14S', 'T1RXXXXG15D', 'T1RXXXXG16', 'T1RXXXXG17',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport(data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J0510610.xsd'
  }
  const excludeCell = Object.keys(data.DECLAR.DECLARBODY).filter(cName => cellNames.indexOf(cName) < 0)
  excludeCell.forEach(cName => {
    delete data.DECLAR.DECLARBODY[cName]
  })
  cellNames.forEach(cName => {
    data.DECLAR.DECLARBODY[cName] = null
  })
}

function prepareQueryParams({ data, params }) {
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0)))
}

function prepareDataSpecific({ data, params, periodCalc, cont }) {
  const infoByOrg = UB.Repository('ac_organization')
    .attrs(['orgBusinessTypeID.code', 'ECBCode', 'hkatottg.code', 'OKPOCode'])
    .selectById(params.organizationID) || {}

  const organizations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .whereIf(params.withoutOwnEDRPOU, 'EDRPOUCode', 'startWith', `${infoByOrg.OKPOCode}%`)
      .where('mi_dateFrom', '<=', periodCalc.dateTo)
      .where('mi_dateTo', '>=', periodCalc.dateTo)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id).concat([params.organizationID])
    : [params.organizationID]

  const resultData = []
  const specCodes = UB.Repository('hr_dictExperienceDt')
    .attrs(['dictPositionID.code'])
    .where('conditionType', '=', '3')
    .where('dictExperienceID.experienceSpecID.code', 'in', ['ЗПЗ055Е1', 'ЗДС037А1'])
  organizations.forEach(orgID => {
    const periods = periodService.getArrayPeriods(orgID, periodCalc.dateFrom)
    const period = periods.find(o => o.dateFrom.getTime() === periodCalc.dateFrom.getTime()) || periodCalc
    if (!period) {
      return
    }
    let employeeNumbers = null
    if (params.contractorID) {
      employeeNumbers = []
      const payObligatoryDep = UB.Repository('hr_payObligatoryDep')
        .attrs(['departmentID', 'positionID', 'dictPositionID', 'employeeNumberID'])
        .where('payObligatoryID.organizationID', '=', orgID)
        .where('payObligatoryID.type', '=', '1')
        .where('contractorID', '=', params.contractorID)
        .where('payObligatoryID.mi_deleteDate', '>=', '#maxdate')
        .selectAsObject()

      payObligatoryDep.forEach(dep => {
        UB.Repository('hr_employeePositionSR')
          .attrs(['employeeNumberID'])
          .where('organizationID', '=', orgID)
          .whereIf(dep.departmentID, 'departmentID', '=', dep.departmentID)
          .whereIf(dep.positionID, 'positionID', '=', dep.positionID)
          .whereIf(dep.dictPositionID, 'dictPositionID', '=', dep.dictPositionID)
          .whereIf(dep.employeeNumberID, 'employeeNumberID', '=', dep.employeeNumberID)
          .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
          .where('employeeNumberID.empWorkPlace', 'isNull')
          .where('dateFrom', '<=', period.dateTo, 'dateFrom')
          .where('dateTo', '>=', period.dateTo, 'dateTo')
          .where('employeeNumberID.dateTo', '<=', period.dateTo, 'empDateTo')
          .where('[employeeNumberID.dateTo]=[dateTo]', 'custom', null, 'dr')
          .logic(`(([dateFrom] AND [dateTo]) OR ([empDateTo] AND [dr]))`)
          .groupBy('employeeNumberID')
          .selectAsObject().forEach(emp => {
            if (!employeeNumbers.find(o => o === emp.employeeNumberID)) {
              employeeNumbers.push(emp.employeeNumberID)
            }
          })
      })
      if (!employeeNumbers.length) {
        employeeNumbers.push(0)
      }
    } else {
      if (params.employeeNumberID) {
        employeeNumbers = [params.employeeNumberID]
      }
    }

    let expDatas = UB.Repository('hr_employeeExperience')
      .where('[employeeID]', 'in',
        UB.Repository('hr_employeeNumberS')
          .where('[orgID]', '=', orgID)
          .whereIf(employeeNumbers, '[ID]', 'in', employeeNumbers)
          .where('[dateFrom]', '<=', period.dateTo)
          .where('[dateTo]', '>=', period.dateFrom)
          .where('[empWorkPlace]', 'isNull')
          .where('[mi_deleteDate]', '>=', '#maxdate')
          .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
          .attrs(['employeeID'])
      ).where('[dictExperienceID.experienceSpecID]', 'isNotNull')
      .where('COALESCE([startCalcDate], \'9999-12-31T00:00:00\')', '>=', period.dateFrom)
      .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate', 'delDate')
      .where('[employeeNumberID.dateFrom]', '<=', period.dateTo, 'ndf')
      .where('[employeeNumberID.dateTo]', '>=', period.dateFrom, 'ndt')
      .where('[employeeNumberID]', 'isNull', undefined, 'nnull')
      .logic('(([ndf] and [ndt] and [delDate]) or [nnull])')
      .attrs(['employeeID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode',
        'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'dictExperienceID.experienceSpecID.code',
        'dictExperienceID.experienceUnits', 'calcDate', 'startCalcDate', 'dictExperienceID.orderNumber',
        'dictExperienceID.orderDate', 'dictExperienceID', 'employeeNumberID'])
      .orderBy('employeeID.lastName')
      .orderBy('employeeID.firstName')
      .orderBy('employeeID.middleName')
      .selectAsObject({
        'dictExperienceID.orderNumber': 'orderNumber',
        'dictExperienceID.orderDate': 'orderDate'
      })
    let empNumIDs = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'workPlace', 'employeeID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo'])
      .where('[employeeID]', 'in', expDatas.map(expData => expData.employeeID))
      .where('[dateFrom]', '<', period.dateTo)
      .where('[dateTo]', '>=', period.dateFrom)
      .where('[organizationID]', '=', orgID)
      .where('employeeNumberID.empWorkPlace', 'isNull')
      .orderBy('workPlace')
      .orderByDesc('dateTo')
      .selectAsObject()

    if (!empNumIDs || empNumIDs.length === 0) {
      console.log("No employeeNumberIDs found, skipping the next query.");
      return
    }
    const batchSize = 1000
    const employeeNumberIDList = [...new Set(empNumIDs.map(item => item.employeeNumberID).filter(Boolean))]
    const findEmployeeNumberIDsWithSpecCodes = []

    for (let i = 0; i < employeeNumberIDList.length; i += batchSize) {
      const batch = employeeNumberIDList.slice(i, i + batchSize)
      const batchResults = UB.Repository('hr_employeePosition')
        .attrs('employeeNumberID')
        .where('employeeNumberID', 'in', batch)
        .where('dictPositionID.code', 'in', specCodes)
        .selectAsArrayOfValues()

      findEmployeeNumberIDsWithSpecCodes.push(...batchResults)
    }

    if (findEmployeeNumberIDsWithSpecCodes.length === 0) {
      console.log("No employeeNumberIDs found, skipping the next query.");
      return
    }
    empNumIDs = empNumIDs.filter(el => findEmployeeNumberIDsWithSpecCodes.includes(el.employeeNumberID));

    expDatas.forEach(row => {
      const emp = empNumIDs.find(o => o.employeeID === row.employeeID && (!row.employeeNumberID || row.employeeNumberID === o.employeeNumberID))
      row.workPlace = emp ? emp.workPlace : '1'
      if (!row.employeeNumberID) {
        row.employeeNumberID = emp ? emp.employeeNumberID : null
      }
      if (emp) {
        row['employeeNumberID.dateFrom'] = dateService.shiftDate(emp['employeeNumberID.dateFrom'])
        row['employeeNumberID.dateTo'] = dateService.shiftDate(emp['employeeNumberID.dateTo'])
      }
    })
    for (let i = expDatas.length - 1; i >= 0; i--) {
      if (expDatas[i].workPlace !== '1') {
        const idx = expDatas.findIndex(o => o.employeeID === expDatas[i].employeeID && o.dictExperienceID === expDatas[i].dictExperienceID && o.workPlace === '1')
        if (idx >= 0) {
          expDatas.splice(i, 1)
        }
      }
    }
    const expEmpNumberIDs = []
    const timeSheetsNumbers = {}
    expDatas.forEach(row => {
      if (['hourWork', 'dayWork', 'minuteWork'].includes(row['dictExperienceID.experienceUnits'])) {
        expEmpNumberIDs.push(row.employeeNumberID)
      }
    })
    if (expEmpNumberIDs.length) {
      const timeSheets = UB.Repository('tim_timeSheet')
        .attrs(['dateWork', 'employeeNumberID', 'factTimeCostID.timeCostType', 'planTimeCostID.timeCostType', 'factHour', 'planHour', 'normHour'])
        .where('employeeNumberID', 'in', expEmpNumberIDs)
        .where('dateWork', '>=', period.dateFrom)
        .where('dateWork', '<=', period.dateTo)
        .where('isActive', '=', 1)
        .orderBy('dateWork')
        .selectAsObject()
      timeSheets.forEach(time => {
        time.dateWork = dateService.shiftDate(time.dateWork)
        if (!timeSheetsNumbers[time.employeeNumberID]) {
          timeSheetsNumbers[time.employeeNumberID] = [time]
        } else {
          timeSheetsNumbers[time.employeeNumberID].push(time)
        }
      })
    }
    expDatas.forEach(row => {
      let startDate = dateService.shiftDate(row['calcDate'])
      let perDateFrom = dateService.shiftDate(Math.max(period.dateFrom, (row['employeeNumberID.dateFrom'] || period.dateFrom)))
      let perDateTo = dateService.shiftDate(Math.min(period.dateTo, (row['employeeNumberID.dateTo'] || period.dateTo)))
      if (!startDate || startDate < perDateFrom) {
        startDate = perDateFrom
      }
      row.startDate = dateService.shiftDate(startDate)

      let stopDate = dateService.shiftDate(row['startCalcDate'])
      if (!stopDate || stopDate > perDateTo) {
        stopDate = perDateTo
      }
      row.stopDate = dateService.unshiftDate(stopDate)
      const seniorityFactObj = experienceService.calculateExperience(row.employeeNumberID, row['dictExperienceID'], row.stopDate, row.startDate, false, cont)
      const seniorityNormObj = experienceService.calculateExperience(row.employeeNumberID, row['dictExperienceID'], period.dateTo, period.dateFrom, true, cont)
      if (['hourWork', 'dayWork', 'minuteWork'].includes(row['dictExperienceID.experienceUnits'])) {
        row.seniorityFact = 0
        row.seniorityNorm = 0
        row.seniorityFactHour = 0
        row.seniorityNormHour = 0
        if (timeSheetsNumbers[row.employeeNumberID]) {
          timeSheetsNumbers[row.employeeNumberID].forEach(time => {
            if (time['factTimeCostID.timeCostType'] === 'WORK' &&
              seniorityFactObj.experiencePeriods && seniorityFactObj.experiencePeriods.find(o => o.dateFrom <= time.dateWork && o.dateTo >= time.dateWork)) {
              row.seniorityFact++
              row.seniorityFactHour = accrualService.round(row.seniorityFactHour + (time.factHour || 0), 3)
            }
            if (time['planTimeCostID.timeCostType'] === 'WORK' &&
              seniorityNormObj.experiencePeriods && seniorityNormObj.experiencePeriods.find(o => o.dateFrom <= time.dateWork && o.dateTo >= time.dateWork)) {
              row.seniorityNorm++
              row.seniorityNormHour = accrualService.round(row.seniorityNormHour + (time.normHour || 0), 3)
            }
          })
        }
      } else {
        row.seniorityFact = (row['dictExperienceID.experienceUnits'] === 'dayСalendar') ? seniorityFactObj.totalDays : 0
        row.seniorityNorm = (row['dictExperienceID.experienceUnits'] === 'dayСalendar') ? seniorityNormObj.totalDays : 0
      }
      if (((row.seniorityFact > 0) || (row.seniorityFactHour > 0)) &&
        !resultData.find(o => o.employeeID === row.employeeID &&
          o['dictExperienceID.experienceSpecID.code'] === row['dictExperienceID.experienceSpecID.code'])) {
        resultData.push(row)
      }
    })
  })
  if (resultData.length === 0) {
    console.log("No resultData found, skipping the next query.");
    return
  }
  resultData.sort((a, b) => {
    return stringService.compareStringUa(a['employeeID.lastName'], b['employeeID.lastName']) === 1 ? 1
      : a['employeeID.lastName'] === b['employeeID.lastName'] ? stringService.compareStringUa(a['employeeID.firstName'], b['employeeID.firstName']) === 1 ? 1
        : a['employeeID.firstName'] === b['employeeID.firstName'] ? stringService.compareStringUa(a['employeeID.middleName'], b['employeeID.middleName']) === 1 ? 1 : -1 : -1 : -1
  }
  ).forEach((row, idx) => {
    const rownum = idx + 1
    updateCellInArray(data, 'T1RXXXXG5', rownum, (row['employeeID.citizenshipID.code'] === 'UKR') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG6S', rownum, `${row['employeeID.empTaxCodeType'] === 'PASSPORT' ? 'БК' : (row['employeeID.empTaxCodeType'] === 'IDCARD' ? 'П' : '')}${row['employeeID.taxCode']}`)
    updateCellInArray(data, 'T1RXXXXG7S', rownum, row['dictExperienceID.experienceSpecID.code'])
    updateCellInArray(data, 'T1RXXXXG81S', rownum, (row['employeeID.lastName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG82S', rownum, (row['employeeID.firstName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG83S', rownum, (row['employeeID.middleName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG9', rownum, row.startDate && row.startDate.getDate())
    updateCellInArray(data, 'T1RXXXXG10', rownum, row.stopDate && row.stopDate.getDate())

    updateCellInArray(data, 'T1RXXXXG11', rownum, (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? row.seniorityFact : null)
    updateCellInArray(data, 'T1RXXXXG121', rownum, (row['dictExperienceID.experienceUnits'] === 'hourWork') ? row.seniorityFactHour : null)
    updateCellInArray(data, 'T1RXXXXG122', rownum, (row['dictExperienceID.experienceUnits'] === 'minuteWork') ? row.seniorityFactHour * 60 : null)
    updateCellInArray(data, 'T1RXXXXG131', rownum, (row['dictExperienceID.experienceUnits'] === 'dayСalendar' || row['dictExperienceID.experienceUnits'] === 'dayWork') ? row.seniorityNorm : null)
    updateCellInArray(data, 'T1RXXXXG132', rownum, (row['dictExperienceID.experienceUnits'] === 'hourWork') ? row.seniorityNormHour : null)
    updateCellInArray(data, 'T1RXXXXG133', rownum, (row['dictExperienceID.experienceUnits'] === 'minuteWork') ? row.seniorityNormHour * 60 : null)

    updateCellInArray(data, 'T1RXXXXG14S', rownum, row['orderNumber'])
    updateCellInArray(data, 'T1RXXXXG15D', rownum, (row['orderDate']) ? moment(row['orderDate']).format('DDMMYYYY') : null)
  })
}

const cellFormats = [
  {
    names: ['HTIN', 'HNAME', 'HFILL', 'HKBOS', 'HBOS'],
    format: {
      type: 'string',
      nillable: false
    }
  },
  {
    names: ['HTIN1', 'T1RXXXXG6S', 'T1RXXXXG7S', 'T1RXXXXG81S', 'T1RXXXXG82S', 'T1RXXXXG83S', 'T1RXXXXG14S', 'T1RXXXXG15D', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZ', 'HZY', 'HZB', 'HZS', 'HZD', 'HNM', 'HNUM1', 'HZKV', 'HZN', 'HZU'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['H01', 'T1RXXXXG5', 'T1RXXXXG9', 'T1RXXXXG10', 'T1RXXXXG11', 'T1RXXXXG121', 'T1RXXXXG122', 'T1RXXXXG131', 'T1RXXXXG132', 'T1RXXXXG133',
      'T1RXXXXG16', 'T1RXXXXG17'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  }
]

function xmlExport({ data, idx }) {
  const { DECLARBODY, DECLARHEAD } = _.get(data, 'data.DECLAR', {})
  if (!(DECLARBODY && DECLARHEAD)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не корректні дані для вивантаження')}>>>`)
  }
  correctRowNum({ DECLARBODY, tabIndex: 'T1' })
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  // const formTypeElementName = DECLARBODY.HZD ? 'HZD' : DECLARBODY.HZS ? 'HZS' : 'HZB'
  // const formTypeElementName = DECLARBODY.HZS === 1 || DECLARBODY.HZS === 'true' ? 'HZS' : DECLARBODY.HZD === 1 || DECLARBODY.HZD === 'true' ? 'HZD' : 'HZB'
  const attrList = allBodyAttrNames.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
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

function addTempleteForCustomRow(params) {
  params.T1 = [
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td rowspan="2"><span class="row_num">ROWNUM</span></td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td colspan="3">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG6S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td colspan="3">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG7S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG9##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG11##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td style="border-right: none">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG121##ROWNUM{{{}}}{{/intSpanInput}}:</td>
      <td style="border-left: none">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG122##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG14S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG16##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG17##ROWNUM{{{}}}{{/intSpanInput}}</td></tr>`,
    `<tr><td colspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG81S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td colspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG82S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td colspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG83S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG10##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG131##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td style="border-right: none">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG132##ROWNUM{{{}}}{{/intSpanInput}}:</td>
      <td style="border-left: none">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG133##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td>{{#dateSpanInput}}DECLAR.DECLARBODY.T1RXXXXG15D##ROWNUM{{{}}}{{/dateSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button></td></tr>`
  ]
}
