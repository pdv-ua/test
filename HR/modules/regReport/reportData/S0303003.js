
const UB = require('@unitybase/ub')
const _ = require('lodash')
const { structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, getInfoByOrg } = require('../../../../AC/modules/regReport/index')
const reportService = require('../../../../HR/modules/reportService')
const dateService = require('../../../../AC/modules/dataServices/dateService')

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

  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })
  return { data, errorMessages }
}

const allHeadAttrNames = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'D_FILL', 'SOFTWARE']
const allBodyAttrNames = [
  'FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'OBL', 'RAY', 'YY', 'TER_GROM1', 'TER_GROM2', 'KATOTTG_FACT', 'ZERO_ZVIT',
  'A010_1', 'A020_1', 'A030_1', 'A010_2', 'A020_2', 'A030_2', 'A010_3', 'A020_3', 'A030_3',
  'A10_1', 'A11_1', 'A12_1', 'A13_1', 'A14_1', 'A16_1', 'A17_1', 'A18_1', 'A15_2', 'A16_2', 'A19_1', 'A20_1', 'A21_1', 'A22_1',
  'RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVEDNM', 'REASON', 'REASON_KOD', 'NOMER'
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
  DECLARBODY.PERIOD_MONTH = 12
  DECLARHEAD.C_REG = params.C_REG
  DECLARHEAD.C_RAJ = params.C_RAJ

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

  DECLARBODY.KVEDNM = DECLARBODY.HKVED_S || orgInfo['hkvedS']
  DECLARBODY.KVED1 = DECLARBODY.HKVED || orgInfo['hkved']
  DECLARBODY.OBL = orgAddressLegal['regionID.name'] || ''
  DECLARBODY.NOMER = params.C_DOC_CNT
  DECLARBODY.FIRM_ADR_FIZ = orgAddressFact.address || orgAddressLegal.address
  DECLARBODY.FIRM_ADR = orgAddressLegal.address
  DECLARBODY.TER_GROM2 = orgAddressFact.nameTerGrom
  DECLARBODY.TER_GROM1 = orgAddressLegal.nameTerGrom
  DECLARBODY.KATOTTG_FACT = DECLARBODY.KATOTTG
  DECLARBODY.FIRM_EDRPOU = DECLARBODY.HTIN
  DECLARBODY.FIRM_NAME = DECLARBODY.HNAME
  DECLARBODY.REP_PERNM = DECLARHEAD.PERIOD_YEAR

  let reportParam = reportService.getReportParams(params.organizationID, ['notSickPayedTime', 'RegularDirectPaym', 'IrregularDirectPaym', 'RS12', 'RS13', 'RS14', 'RS16', 'RS17', 'RS18'])

  let keys = ['A010_1', 'A010_2']
  keys.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'dt', entityName: null, name: UB.i18n('Дата'), type: 'string' }
      ],
      onDate: new Date(DECLARHEAD.PERIOD_YEAR, 12, 0),
      openForm: [ { name: 'or', enID: 'enID' } ]
    }
  })

  let keysTable1 = ['A020_1', 'A020_2', 'A030_1', 'A030_2']
  keysTable1.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'worktime', entityName: null, name: UB.i18n('Кількість годин'), type: 'number' },
        { attr: 'dt', entityName: null, name: UB.i18n('Дата'), type: 'string' }
      ],
      onDate: new Date(DECLARHEAD.PERIOD_YEAR, 12, 0),
      openForm: [ { name: 'or', enID: 'enID' } ]
    }
  })

  let keysTable2 = ['A10_1', 'A11_1', 'A13_1', 'A14_1', 'A16_1', 'A16_2', 'A17_1', 'A18_1']
  keysTable2.forEach(key => {
    data.detailData[key] = {
      data: [],
      columns: [
        { attr: 'enID', entityName: 'hr_employeeNumber', name: UB.i18n('Працівник'), type: 'string' },
        { attr: 'paySum', entityName: null, name: UB.i18n('Сума'), type: 'number' },
        { attr: 'dt', entityName: null, name: UB.i18n('Дата'), type: 'string' }
      ],
      onDate: new Date(DECLARHEAD.PERIOD_YEAR, 12, 0),
      openForm: [ { name: 'or', enID: 'enID' } ]
    }
  })

  for (let month = 0; month < 12; month++) {
    const startDate = new Date(DECLARHEAD.PERIOD_YEAR, month, 1)
    const endDate = new Date(DECLARHEAD.PERIOD_YEAR, month + 1, 0)
    const periodToString = dateService.formatDate(dateService.shiftDate(startDate)) + ' - ' + dateService.formatDate(dateService.shiftDate(endDate))

    let resulttimeSheetChange = UB.Repository('hr_timeSheetChange')
      .attrs(['employeeList', 'typeSheetChange'])
      .where('[dateFrom]', '>=', startDate)
      .where('[dateFrom]', '<=', endDate)
      .where('typeSheetChange', 'in', [1, 3])
      .where('employeeList', '<>', null)
      .selectAsObject()

    let massiveEmployeeNumberIDFullDay = []
    let massiveEmployeeNumberIDNotFullDay = []
    let massiveEmployeeNumberID = []
    UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'workPlace', 'dictStaffCatID.accCategory', 'employeeID.shortFIO', 'mtCount', 'employeeNumberID', 'dateFrom'])
      .where('[organizationID]', '=', params.organizationID)
      .where('[dateTo]', '>=', startDate)
      .where('[dateTo]', '<=', endDate)
      .where('workPlace', 'in', ['1', '3', '4'])
      .where('[employeeNumberID.dateTo]=[dateTo]', 'custom')
      .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject().forEach(item => {
        let filteredEmployees = resulttimeSheetChange.filter(employee => {
          return employee.employeeList.includes(item['employeeID.shortFIO'])
        })

        if (!filteredEmployees.length) {
          if (item.mtCount >= 1 && (item.workPlace === '1' || item.workPlace === '3' || item.workPlace === '4')) {
            DECLARBODY.A010_1 = DECLARBODY.A010_1 + 1
            massiveEmployeeNumberIDFullDay.push(item.employeeNumberID)
            data.detailData['A010_1'].data.push({ enID: item.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(item.dateFrom)) })
          } else if (item.mtCount >= 1 && item.workPlace === '4' && item['dictStaffCatID.accCategory'] === '7') {
            DECLARBODY.A010_1 = DECLARBODY.A010_1 + 1
            massiveEmployeeNumberIDFullDay.push(item.employeeNumberID)
            data.detailData['A010_1'].data.push({ enID: item.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(item.dateFrom)) })
          }
        }

        let filteredTypeSheetChange = filteredEmployees.filter(employee => {
          return employee.typeSheetChange === 3 || employee.typeSheetChange === 1
        })

        if (item.mtCount < 1 && (item.workPlace === '1' || item.workPlace === '3' || item.workPlace === '4')) {
          DECLARBODY.A010_2 = DECLARBODY.A010_2 + 1
          massiveEmployeeNumberIDNotFullDay.push(item.employeeNumberID)
          data.detailData['A010_2'].data.push({ enID: item.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(item.dateFrom)) })
        } else if (item.mtCount < 1 && item.workPlace === '4' && item['dictStaffCatID.accCategory'] === '7') {
          DECLARBODY.A010_2 = DECLARBODY.A010_2 + 1
          massiveEmployeeNumberIDNotFullDay.push(item.employeeNumberID)
          data.detailData['A010_2'].data.push({ enID: item.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(item.dateFrom)) })
        } else if (item.mtCount === 1 && filteredTypeSheetChange > 0) {
          DECLARBODY.A010_2 = DECLARBODY.A010_2 + 1
          massiveEmployeeNumberIDNotFullDay.push(item.employeeNumberID)
          data.detailData['A010_2'].data.push({ enID: item.employeeNumberID, dt: dateService.formatDate(dateService.shiftDate(item.dateFrom)) })
        }

        if (item.workPlace === '4' && item['dictStaffCatID.accCategory'] === '7') {
          massiveEmployeeNumberID.push(item.employeeNumberID)
        } else if (item.workPlace !== '5' && item.workPlace !== '4') {
          massiveEmployeeNumberID.push(item.employeeNumberID)
        }
      })
    // працівники з повною зайнятістю
    UB.Repository('tim_timeSheet')
      .attrs(['factHour', 'factTimeCostID.code', 'employeeNumberID', 'normHour'])
      .where('dateWork', '>=', startDate)
      .where('dateWork', '<=', endDate)
      .where('isActive', '=', 1)
      .where('employeeNumberID', 'in', massiveEmployeeNumberIDFullDay)
      .selectAsObject().forEach(item => {
        if (item['factTimeCostID.code'] === 'РбДн') {
          DECLARBODY.A020_1 = DECLARBODY.A020_1 + item.factHour
          DECLARBODY.A030_1 = DECLARBODY.A030_1 + item.factHour
          let foundObject = data.detailData['A020_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A020_1'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }

          foundObject = data.detailData['A030_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A030_1'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }
        } else if (item['factTimeCostID.code'] === 'Вдр') {
          DECLARBODY.A020_1 = DECLARBODY.A020_1 + item.normHour
          DECLARBODY.A030_1 = DECLARBODY.A030_1 + item.factHour + item.normHour

          let foundObject = data.detailData['A020_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A020_1'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }

          foundObject = data.detailData['A030_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour + item.normHour
          } else {
            data.detailData['A030_1'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }
        }
      })
    // працівники з частковою зайнятістю
    UB.Repository('tim_timeSheet')
      .attrs(['factHour', 'factTimeCostID.code', 'employeeNumberID', 'normHour'])
      .where('dateWork', '>=', startDate)
      .where('dateWork', '<=', endDate)
      .where('isActive', '=', 1)
      .where('employeeNumberID', 'in', massiveEmployeeNumberIDNotFullDay)
      .selectAsObject().forEach(item => {
        if (item['factTimeCostID.code'] === 'РбДн') {
          DECLARBODY.A020_2 = DECLARBODY.A020_2 + item.factHour
          DECLARBODY.A030_2 = DECLARBODY.A030_2 + item.factHour

          let foundObject = data.detailData['A020_2'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A020_2'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }

          foundObject = data.detailData['A030_2'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A030_2'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }
        } else if (item['factTimeCostID.code'] === 'Вдр') {
          DECLARBODY.A020_2 = DECLARBODY.A020_2 + item.normHour
          DECLARBODY.A030_2 = DECLARBODY.A030_2 + item.factHour + item.normHour

          let foundObject = data.detailData['A020_2'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A020_2'].data.push({ enID: item.employeeNumberID, worktime: item.factHour, dt: periodToString, dtID: month })
          }

          foundObject = data.detailData['A030_2'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.worktime = foundObject.worktime + item.factHour
          } else {
            data.detailData['A030_2'].data.push({ enID: item.employeeNumberID, worktime: item.factHour + item.normHour, dt: periodToString, dtID: month })
          }
        }
      })

    if (reportParam.RegularDirectPaymIDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RegularDirectPaymIDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A10_1 = DECLARBODY.A10_1 + item.paySum

          let foundObject = data.detailData['A10_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A10_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.IrregularDirectPaymIDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.IrregularDirectPaymIDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A11_1 = DECLARBODY.A11_1 + item.paySum

          let foundObject = data.detailData['A11_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A11_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS12IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS12IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A12_1 = DECLARBODY.A12_1 + item.paySum

          let foundObject = data.detailData['A12_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A12_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS13IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS13IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A13_1 = DECLARBODY.A13_1 + item.paySum

          let foundObject = data.detailData['A13_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A13_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS14IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS14IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A14_1 = DECLARBODY.A14_1 + item.paySum

          let foundObject = data.detailData['A14_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A14_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS16IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS16IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A16_1 = DECLARBODY.A16_1 + item.paySum

          let foundObject = data.detailData['A16_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A16_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS17IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS17IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A17_1 = DECLARBODY.A17_1 + item.paySum

          let foundObject = data.detailData['A17_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A17_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }

    if (reportParam.RS18IDs.length && massiveEmployeeNumberID.length) {
      UB.Repository('hr_accrual')
        .attrs(['paySum', 'employeeNumberID'])
        .where('periodCalc', '>=', startDate)
        .where('periodCalc', '<=', endDate)
        .where('payElID', 'in', reportParam.RS18IDs)
        .where('orgID', '=', params.organizationID)
        .whereIf(massiveEmployeeNumberID && massiveEmployeeNumberID.length, 'employeeNumberID', 'in', massiveEmployeeNumberID)
        .groupBy(['paySum', 'employeeNumberID'])
        .selectAsObject().forEach(item => {
          DECLARBODY.A18_1 = DECLARBODY.A18_1 + item.paySum

          let foundObject = data.detailData['A18_1'].data.find(fitem => fitem.enID === item.employeeNumberID && fitem.dtID === month)
          if (foundObject) {
            foundObject.paySum = foundObject.paySum + item.paySum
          } else {
            data.detailData['A18_1'].data.push({ enID: item.employeeNumberID, paySum: item.paySum, dt: periodToString, dtID: month })
          }
        })
    }
  }
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
    names: ['FIRM_EDRPOU', 'FIRM_NAME', 'FIRM_ADR', 'FIRM_ADR_FIZ', 'OBL', 'RAY', 'YY', 'TER_GROM1', 'TER_GROM2', 'RUK', 'VIK_TEL', 'VIK_EMAIL', 'KVEDNM'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['REP_NYEAR',
      'ZERO_ZVIT', 'REASON1', 'REASON2', 'REASON3', 'REASON4', 'REASON5', 'REASON6',
      'KATOTTG_FACT', 'NOMER',
      'A010_1', 'A020_1', 'A030_1', 'A010_2', 'A020_2', 'A030_2', 'A010_3', 'A020_3', 'A030_3',
      'A10_1', 'A11_1', 'A12_1', 'A13_1', 'A14_1', 'A16_1', 'A17_1', 'A18_1', 'A15_2', 'A16_2', 'A19_1', 'A20_1', 'A21_1', 'A22_1' ],
    format: {
      type: 'number',
      nillable: true
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
