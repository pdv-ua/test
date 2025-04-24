const UB = require('@unitybase/ub')
const _ = require('lodash')
const moment = require('moment')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt, correctRowNum } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
const entityBaseService = require('../../../../AC/modules/entityServices/entityBaseService')
const periodService = require('../../../../HR/modules/periodService')
const stringService = require('../../../../AC/modules/dataServices/stringService')
const settingsService = require('../../../../AC/modules/entityServices/settingsService')
const staffService = require('../../../../HR/modules/staffService')

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
  params.useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true

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
  DECLARBODY.HZNUM1 = 1
  DECLARHEAD.C_DOC_CNT = DECLARBODY.HNUM1 = 1

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HTIN', 'HTIN1', 'HNAME', 'HZM', 'HZY', 'HZKV', 'HZNUM1', 'HZN', 'HZU', 'HZ', 'HZB', 'HZS', 'HZD', 'HFIL', 'H01', 'H02', 'HNUM1',

  'T1RXXXXG5', 'T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8S', 'T1RXXXXG91S', 'T1RXXXXG92S', 'T1RXXXXG93S', 'T1RXXXXG101D', 'T1RXXXXG102D', 'T1RXXXXG11', 'T1RXXXXG12',
  'T1RXXXXG13S', 'T1RXXXXG14S', 'T1RXXXXG15S', 'T1RXXXXG16S', 'T1RXXXXG17S', 'T1RXXXXG18D', 'T1RXXXXG19S', 'T1RXXXXG11', 'T1RXXXXG12', 'T1RXXXXG20',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J0510508.xsd'
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

  DECLARBODY.HZB = params.FORM_TYPE === 'HZB'
  DECLARBODY.HZS = params.FORM_TYPE === 'HZS'
  DECLARBODY.HZD = params.FORM_TYPE === 'HZD'

  const bos = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.bosID)
  const buh = UB.Repository('hr_employeeNumberS').attrs(['employeeID.shortFIO', 'employeeID.taxCode']).selectById(params.buhID)

  DECLARBODY.HKBOS = bos['employeeID.taxCode']
  DECLARBODY.HBOS = bos['employeeID.shortFIO']

  DECLARBODY.HKBUH = buh['employeeID.taxCode']
  DECLARBODY.HBUH = buh['employeeID.shortFIO']
  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
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
  const reportData = []
  const orderDatas = []

  const organiozations = params.includeSubOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [params.organizationID]
  organiozations.forEach(orgID => {
    const periods = periodService.getPeriodsByDate(orgID, params.dateFrom, params.dateTo)
    periods.forEach((period) => {
      const lastDayPriorMounth = dateService.addDays(period.dateFrom, -1)
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
            .where('dateFrom', '<=', period.dateTo, 'dateFrom')
            .where('dateTo', '>=', period.dateTo, 'dateTo')
            .where('employeeNumberID.dateTo', '<=', period.dateTo, 'empDateTo')
            .where('[employeeNumberID.dateTo]=[dateTo]', 'custom', null, 'dr')
            .logic(`(([dateFrom] AND [dateTo]) OR ([empDateTo] AND [dr]))`)
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

      let empPosDatas = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'isActive', 'orderID', 'changeOrderID', 'departmentID', 'positionID', 'dictPositionID',
          'dictPositionID.dictProfessionID',
          'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeNumberID.tabNum', 'workPlace',
          'employeeID.taxCode', 'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'employeeID.sexType', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
          'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'changeOrderID.empOrderType',
          'dictStaffCatID.accCategory', 'ID', 'employeeNumberID.parentEmpNumberID', 'employeeNumberID.childEmpNumberID'])
        .where('[organizationID]', '=', orgID)
        .whereIf(employeeNumbers, '[employeeNumberID]', 'in', employeeNumbers)
        .where('[dateFrom]', '>=', period.dateFrom, 'dff')
        .where('[dateFrom]', '<=', period.dateTo, 'dft')
        .where('[dateTo]', '>=', lastDayPriorMounth, 'dtf')
        .where('[dateTo]', '<=', period.dateTo, 'dtt')
        .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
        .where('workPlace', 'in', params.isIncludePluralist5 ? ['1', '2', '3'] : ['1', '3'], 'wp')
        .where('workPlace', '=', '4', 'cph')
        .where('payElID.methodID.code', '=', '3', 'cphp')
        // .where('dictStaffCatID.accCategory', '!=', '7')
        .logic('((([dff] AND [dft]) OR ([dtf] AND [dtt])) AND ([wp] OR ([cph] AND [cphp])))')
        .orderBy('employeeNumberID')
        .orderBy('dateFrom')
        .orderBy('isActive')
        .misc({ __skipRls: true })
        .selectAsObject({
          'ID': 'employeePositionID',
          'employeeNumberID.dateTo': 'empDateTo',
          'employeeNumberID.dateFrom': 'empDateFrom',
          'dictPositionID.dictProfessionID': 'dictProfessionID'
        })

      let posDataByEmp = {}

      let curEmpNumber
      let dictProfessionID
      let previosDepID
      let dictPositionID
      const resultData = []
      empPosDatas.forEach((row, index) => {
        if (row.employeeNumberID !== curEmpNumber) {
          curEmpNumber = row.employeeNumberID
          dictProfessionID = null
          previosDepID = null
          dictPositionID = null
        }
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        row.empDateFrom = dateService.shiftDate(row.empDateFrom)
        row.empDateTo = dateService.shiftDate(row.empDateTo)
        if (row.dateTo >= period.dateFrom && row['dictStaffCatID.accCategory'] !== '7') {
          if (params.isInclude5 && ((row['orderID.empOrderType'] !== 'APPOINT' && row['changeOrderID.empOrderType'] !== 'DISM' &&
              ((params.isIncludeProf5 && row.dictProfessionID !== dictProfessionID) ||
                (!params.isIncludeProf5 && (row.dictPositionID !== dictPositionID || (!params.isIncludePos5 && row.departmentID !== previosDepID)))) &&
              row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo) ||
              (row['employeeNumberID.parentEmpNumberID'] && row['orderID.empOrderType'] === 'APPOINT' && row.dateFrom.getTime() === row.empDateFrom.getTime() &&
                row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo))) {
            row.eventType = 1 // робота
            row.empOrderType = 'MOVE'
            const lastChangeIdx = row.dateTo <= period.dateTo ? empPosDatas.findIndex((o, idx) => (idx > index && o.employeeNumberID === row.employeeNumberID && /*! o.isActive && */
              ((params.isIncludeProf5 && row.dictProfessionID !== dictProfessionID) ||
                (!params.isIncludeProf5 && (row.dictPositionID !== o.dictPositionID || (!params.isIncludePos5 && row.departmentID !== o.departmentID))))
            )) : -1
            // if (resultData.isIncludeTwoRow5 || resultData[i].dateFrom.getMonth() !== resultData[i].dateTo.getMonth() || resultData[i].changeOrderID !== resultData[i].orderID)
            row.dateTo = row.dateTo > period.dateTo ? null : (lastChangeIdx >= 0 ? dateService.addDays(dateService.shiftDate(empPosDatas[lastChangeIdx].dateFrom), -1) : null)
            if (row.dateTo <= period.dateTo && lastChangeIdx >= 0) {
              row.changeOrderID = empPosDatas[lastChangeIdx].orderID
              row['changeOrderID.orderDate'] = empPosDatas[lastChangeIdx]['orderID.orderDate']
              row['changeOrderID.orderNumber'] = empPosDatas[lastChangeIdx]['orderID.orderNumber']
              row['changeOrderID.empOrderType'] = empPosDatas[lastChangeIdx]['orderID.empOrderType']
            }
            if (params.isIncludeTwoRow5) {
              const priorRow = empPosDatas[index - 1] // .find((o, idx) => (idx < index && o.employeeNumberID === row.employeeNumberID))
              if (priorRow && priorRow.employeeNumberID === row.employeeNumberID) {
                priorRow.eventType = 1 // робота
                priorRow.empOrderType = 'MOVE'
                priorRow.dateFrom = null
                priorRow.dateTo = dateService.addDays(row.dateFrom, -1)
                priorRow.orderID = row.orderID
                priorRow['orderID.orderDate'] = row['orderID.orderDate']
                priorRow['orderID.orderNumber'] = row['orderID.orderNumber']
                priorRow['orderID.empOrderType'] = row['orderID.empOrderType']
                priorRow.changeOrderID = row.orderID
                priorRow['changeOrderID.orderDate'] = row['orderID.orderDate']
                priorRow['changeOrderID.orderNumber'] = row['orderID.orderNumber']
                priorRow['changeOrderID.empOrderType'] = row['orderID.empOrderType']
                resultData.push(Object.assign({}, priorRow))
              }
            }
            resultData.push(Object.assign({}, row))
          } else {
            if (row['orderID.empOrderType'] === 'APPOINT' && row.dateFrom.getTime() === row.empDateFrom.getTime() &&
              row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo && !row['employeeNumberID.parentEmpNumberID']) {
              row.eventType = 1 // робота
              row.empOrderType = 'APPOINT'
              const lastChangeIdx = row.dateTo <= period.dateTo ? empPosDatas.findIndex((o, idx) => (idx > index && o.employeeNumberID === row.employeeNumberID && /*! o.isActive && */
                ((row.dictPositionID !== o.dictPositionID) ||
                  (row.departmentID !== o.departmentID)))) : -1
              row.dateTo = row.dateTo > period.dateTo ? null : (lastChangeIdx >= 0 ? dateService.addDays(dateService.shiftDate(empPosDatas[lastChangeIdx].dateFrom), -1)
                : (row.empDateTo >= period.dateFrom && row.empDateTo <= period.dateTo &&
                  empPosDatas.findIndex((o, idx) => (idx > index && o.employeeNumberID === row.employeeNumberID && o.isActive)) < 0
                ) ? row.empDateTo : null)
              if (row.dateTo <= period.dateTo && lastChangeIdx >= 0) {
                row.changeOrderID = empPosDatas[lastChangeIdx].orderID
                row['changeOrderID.orderDate'] = empPosDatas[lastChangeIdx]['orderID.orderDate']
                row['changeOrderID.orderNumber'] = empPosDatas[lastChangeIdx]['orderID.orderNumber']
                row['changeOrderID.empOrderType'] = null // empPosDatas[lastChangeIdx]['orderID.empOrderType']
              }
              resultData.push(Object.assign(Object.assign({}, row),
                (lastChangeIdx < 0 && (row['changeOrderID.empOrderType'] === 'DISM' || (row.dateTo && row.dateTo.getTime() === row.empDateTo.getTime())) && row.changeOrderID !== row.orderID)
                  ? { dateTo: null, 'changeOrderID.empOrderType': null } : { isAppoint: true }
              ))
            }
            if ((row['changeOrderID.empOrderType'] === 'DISM' || (row.dateTo && row.dateTo.getTime() === row.empDateTo.getTime())) &&
              row.dateTo >= period.dateFrom && row.dateTo <= period.dateTo &&
              (params.isInclude5 || !row['employeeNumberID.childEmpNumberID'])) {
              row.eventType = 1 // робота
              row.empOrderType = 'DISM'
              row['changeOrderID.empOrderType'] = 'DISM'
              row.dateFrom = null
              resultData.push(Object.assign({}, row))
            }
          }
        }
        dictProfessionID = row.dictProfessionID
        previosDepID = row.departmentID
        dictPositionID = row.dictPositionID
      })
      const empAccrDatas = UB.Repository('hr_employeeAccrual')
        .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID', 'payElID.methodID.code',
          'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeNumberID.tabNum',
          'employeeID.taxCode', 'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'employeeID.sexType',
          'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'changeOrderID.empOrderType'])
        .where('[employeeNumberID.orgID]', '=', orgID)
        .whereIf(employeeNumbers, '[employeeNumberID]', 'in', employeeNumbers)
        .where('[payElID.methodID.code]', 'in', ['14', '57', '134', '140'])
        .where('[dateFrom]', '>=', period.dateFrom, 'dff')
        .where('[dateFrom]', '<=', period.dateTo, 'dft')
        .where('[dateTo]', '>=', period.dateFrom, 'dtf')
        .where('[dateTo]', '<=', period.dateTo, 'dtt')
        .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeNumberID.workPlaceCode]', 'in', params.isIncludePluralist5 ? ['1', '2', '3'] : ['1', '3'])
        .logic('(([dff] AND [dft]) OR ([dtf] AND [dtt]))')
        .orderBy('employeeNumberID')
        .orderBy('payElID.methodID.code')
        .orderBy('dateFrom')
        .selectAsObject()

      let priorRow
      empAccrDatas.forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        row.eventType = (row['payElID.methodID.code'] === '134') ? 2 : (row['payElID.methodID.code'] === '14') ? 3 : 4
        if (priorRow && (row.employeeNumberID !== priorRow.employeeNumberID || row['payElID.methodID.code'] !== priorRow['payElID.methodID.code'] ||
            (!priorRow.dateTo || dateService.addDays(priorRow.dateTo, 1).getTime() !== row.dateFrom.getTime()))) {
          priorRow = null
        }
        if (priorRow) {
          priorRow.dateTo = row.dateTo <= period.dateTo ? row.dateTo : null
          if (row.dateTo <= period.dateTo) {
            priorRow.changeOrderID = row.changeOrderID
            priorRow['changeOrderID.orderDate'] = row['changeOrderID.orderDate']
            priorRow['changeOrderID.orderNumber'] = row['changeOrderID.orderNumber']
            priorRow['changeOrderID.empOrderType'] = row['changeOrderID.empOrderType']
          }
        } else {
          priorRow = row
          row.dateFrom = (row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo) ? row.dateFrom : null
          row.dateTo = (row.dateTo >= period.dateFrom && row.dateTo <= period.dateTo) ? row.dateTo : null
          row.empOrderType = 'VAC'
          resultData.push(row)
        }
      })
      let empOrderDtDatas = UB.Repository('hr_orderRegistryDt')
        .attrs(['employeeNumberID', 'employeeNumberID.employeeID', 'orderDateFrom', 'orderDateTo', 'orderID', 'payElID.methodID.code',
          'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
          'employeeNumberID.tabNum', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
          'employeeNumberID.employeeID.citizenshipID.code', 'employeeNumberID.employeeID.sexType',
          'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'orderID.orderClass.entityName'])
        .where('[employeeNumberID.orgID]', '=', orgID)
        .whereIf(employeeNumbers, '[employeeNumberID]', 'in', employeeNumbers)
        .where('[payElID.methodID.code]', '=', '20')
        .where('[payElID.dictTimeCostID]', 'isNotNull')
        .where('[orderDateFrom]>=[periodSalaryID.dateFrom]', 'custom')
        .where('[orderDateFrom]<=[periodSalaryID.dateTo]', 'custom')
        .where('[orderDateFrom]', '>=', period.dateFrom, 'dff')
        .where('[orderDateFrom]', '<=', period.dateTo, 'dft')
        .where('[orderDateTo]', '>=', period.dateFrom, 'dtf')
        .where('[orderDateTo]', '<=', period.dateTo, 'dtt')
        .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeNumberID.workPlaceCode]', 'in', params.isIncludePluralist5 ? ['1', '2', '3'] : ['1', '3'])
        .where(`(flagsRec & 512 = 0)`, 'custom')
        .where('periodCalcID', 'isNotNull')
        .logic('([dff] AND [dft]) OR ([dtf] AND [dtt])')
        .groupBy(['employeeNumberID', 'employeeNumberID.employeeID', 'orderDateFrom', 'orderDateTo', 'orderID', 'payElID.methodID.code',
          'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
          'employeeNumberID.tabNum', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
          'employeeNumberID.employeeID.citizenshipID.code', 'employeeNumberID.employeeID.sexType',
          'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'orderID.orderClass.entityName'])
        .orderBy('employeeNumberID')
        .orderBy('payElID.methodID.code')
        .orderBy('orderDateFrom')
        .selectAsObject({
          'orderDateFrom': 'dateFrom',
          'orderDateTo': 'dateTo',
          'employeeNumberID.employeeID': 'employeeID',
          'employeeNumberID.employeeID.lastName': 'employeeID.lastName',
          'employeeNumberID.employeeID.firstName': 'employeeID.firstName',
          'employeeNumberID.employeeID.middleName': 'employeeID.middleName',
          'employeeNumberID.employeeID.taxCode': 'employeeID.taxCode',
          'employeeNumberID.employeeID.citizenshipID.code': 'employeeID.citizenshipID.code',
          'employeeNumberID.employeeID.sexType': 'employeeID.sexType',
          'employeeNumberID.employeeID.empTaxCodeType': 'employeeID.empTaxCodeType',
          'orderID.orderClass.entityName': 'entityName'
        })
      priorRow = null
      const docRegSicknessIDs = []
      empOrderDtDatas.forEach(row => {
        if (row.entityName === 'hr_docRegSickness' && row.orderID) {
          docRegSicknessIDs.push(row.orderID)
        }
      })
      let empOrders = []
      if (docRegSicknessIDs.length) {
        const empOrderStore = UB.DataStore('hr_empOrder')
        empOrderStore.runSQL(`
          SELECT drs.ID "orderID", eo.orderNumberFull "orderNumber", eo.orderDate "orderDate", eo.empOrderType "empOrderType" 
          FROM hr_docRegSickness drs
          JOIN hr_empOrderVacationlongDet eovd ON eovd.empOrderSicknessID = drs.empOrderSicknessID
          JOIN hr_empOrder eo ON eo.ID = eovd.orderID
          WHERE drs.ID${entityBaseService.getInExpression('docRegSicknessIDs')}
          AND eovd.mi_deleteDate >= '9999-12-31' AND eo.mi_deleteDate >= '9999-12-31'`
        , {
          docRegSicknessIDs
        })

        empOrders = empOrderStore.getAsJsObject()
      }
      empOrderDtDatas.forEach(row => {
        const empOrder = empOrders.find(o => o.orderID === row.orderID)
        if (empOrder) {
          row['orderID.orderDate'] = empOrder.orderDate
          row['orderID.orderNumber'] = empOrder.orderNumber
        }
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        row.eventType = 2
        if (priorRow && (row.employeeNumberID !== priorRow.employeeNumberID || row['payElID.methodID.code'] !== priorRow['payElID.methodID.code'] ||
            (!priorRow.dateTo || dateService.addDays(priorRow.dateTo, 1).getTime() !== row.dateFrom.getTime()))) {
          priorRow = null
        }
        if (priorRow) {
          priorRow.dateTo = row.dateTo <= period.dateTo ? row.dateTo : null
          if (row.dateTo <= period.dateTo) {
            priorRow.changeOrderID = row.changeOrderID
            priorRow['changeOrderID.orderDate'] = row['orderID.orderDate']
            priorRow['changeOrderID.orderNumber'] = row['orderID.orderNumber']
            priorRow['changeOrderID.empOrderType'] = row['orderID.empOrderType']
          }
        } else {
          priorRow = row
          row.dateFrom = (row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo) ? row.dateFrom : null
          row.dateTo = (row.dateTo >= period.dateFrom && row.dateTo <= period.dateTo) ? row.dateTo : null
          if (!row.dateFrom && !row['changeOrderID.orderDate']) row['changeOrderID.orderDate'] = row['orderID.orderDate']
          if (!row.dateFrom && !row['changeOrderID.orderNumber']) row['changeOrderID.orderNumber'] = row['orderID.orderNumber']
          if (!row.dateFrom && !row['changeOrderID.empOrderType']) row['changeOrderID.empOrderType'] = row['orderID.empOrderType']
          row.empOrderType = 'REG'
          resultData.push(row)
        }
      })

      const empCphDatas = UB.Repository('hr_employeeCPH')
        .attrs(['employeeNumberID', 'employeeNumberID.employeeID', 'dateFrom', 'dateTo', 'reasonRegReport',
          'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
          'employeeNumberID.tabNum', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
          'employeeNumberID.employeeID.citizenshipID.code', 'employeeNumberID.employeeID.sexType', 'orderDate', 'orderNumber'])
        .where('[employeeNumberID.orgID]', '=', orgID)
        .whereIf(employeeNumbers, '[employeeNumberID]', 'in', employeeNumbers)
        .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
        .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
        .orderBy('employeeNumberID')
        .orderBy('dateFrom')
        .selectAsObject({
          'employeeNumberID.employeeID': 'employeeID',
          'employeeNumberID.employeeID.lastName': 'employeeID.lastName',
          'employeeNumberID.employeeID.firstName': 'employeeID.firstName',
          'employeeNumberID.employeeID.middleName': 'employeeID.middleName',
          'employeeNumberID.employeeID.taxCode': 'employeeID.taxCode',
          'employeeNumberID.employeeID.empTaxCodeType': 'employeeID.empTaxCodeType',
          'employeeNumberID.employeeID.citizenshipID.code': 'employeeID.citizenshipID.code',
          'employeeNumberID.employeeID.sexType': 'employeeID.sexType'
        })

      empCphDatas.forEach(row => {
        row.dateFrom = row.dateFrom ? dateService.shiftDate(row.dateFrom) : dateService.minDate()
        row.dateTo = row.dateTo ? dateService.shiftDate(row.dateTo) : dateService.maxDate()

        if ((row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo) || (row.dateTo >= period.dateFrom && row.dateTo <= period.dateTo)) {
          row.eventType = 5 // ЦПХ
          row.dateFrom = (row.dateFrom >= period.dateFrom && row.dateFrom <= period.dateTo) ? row.dateFrom : null
          row.dateTo = (row.dateTo >= period.dateFrom && row.dateTo <= period.dateTo) ? row.dateTo : null
          row.empOrderType = 'CPH'
          row['orderID.orderDate'] = row['orderDate']
          row['orderID.orderNumber'] = row['orderNumber']
          row['changeOrderID.orderDate'] = row['orderDate']
          row['changeOrderID.orderNumber'] = row['orderNumber']
          delete row['orderDate']
          delete row['orderNumber']

          if (params.isIncludeTwoRow5 && row.dateFrom && row.dateTo) {
            const newRow = Object.assign({}, row)
            newRow.dateFrom = null
            newRow['orderID.orderDate'] = null
            newRow['orderID.orderNumber'] = null
            row.dateTo = null
            row['changeOrderID.orderDate'] = null
            row['changeOrderID.orderNumber'] = null
            resultData.push(row)
            resultData.push(newRow)
          } else {
            resultData.push(row)
          }
        }
      })

      const allDatas = resultData

      posDataByEmp = {}
      let epData = []
      if (allDatas.length > 0) {
        let allEmpNumbers = allDatas.map(el => el.employeeNumberID).filter((empNum, index, arr) => arr.indexOf(empNum) === index)
        let empPosDatasIDs = empPosDatas.map(el => el.employeePositionID).filter((empNum, index, arr) => arr.indexOf(empNum) === index)
        let wherePosClause = empPosDatasIDs.length ? ` or (ep.ID${entityBaseService.getInExpression('empPosDatasIDs')})` : ''
        const empPositionDS = UB.DataStore('hr_employeePosition')
        empPositionDS.runSQL(`SELECT 
          ep.ID as "employeePositionID", ep.employeeID as "employeeID", ep.dateFrom as "dateFrom", ep.dateTo as "dateTo"
          , ep.workPlace as "workPlace", ep.dateNew as "dateNew", dsc.accCategory as "accCategory"
          , ep.positionID as "positionID"
          , ep.dictPositionID as "dictPositionID"
          , ep.departmentID as "departmentID"
          , dictPos.name as "posName" 
          , ${staffService.getPosFldOnDateSql2(':onDate:', 'ep.positionID', 'name', 'ep.dictPositionID')} as "positionName"  
          , dp.code as "profCode" 
          , dp.name as "profName" 
          , ep.employeeNumberID as "employeeNumberID"
          , ep.factPosName as "factPosName"
          FROM hr_employeePosition ep 
          LEFT JOIN hr_dictStaffCat dsc ON dsc.ID = ep.dictStaffCatID and dsc.mi_deleteDate >= '9999-12-31' 
          LEFT JOIN hr_dictPosition dictPos ON dictPos.ID = ep.dictPositionID and dictPos.mi_deleteDate >= '9999-12-31' 
          LEFT JOIN hr_dictProfession dp ON dp.ID = dictPos.dictProfessionID and dp.mi_deleteDate >= '9999-12-31' 
          WHERE ep.organizationID = :orgID: 
          AND ep.employeeNumberID${entityBaseService.getInExpression('allEmpNumbers')}
          AND ((ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: ) ${wherePosClause})
          AND ep.isActive = 1
          AND ep.mi_deleteDate >= '9999-12-31' 
          ORDER BY ep.dateFrom`
        , {
          orgID,
          dateTo: period.dateTo,
          dateFrom: lastDayPriorMounth, // period.dateFrom,
          onDate: period.dateTo,
          empPosDatasIDs,
          allEmpNumbers
        })
        epData = empPositionDS.getAsJsObject()

        epData.forEach(empPosData => {
          empPosData.dateFrom = dateService.shiftDate(empPosData.dateFrom)
          empPosData.dateTo = dateService.shiftDate(empPosData.dateTo)
          empPosData.dateNew = dateService.shiftDate(empPosData.dateNew)
          if (!posDataByEmp[empPosData.employeeNumberID]) {
            posDataByEmp[empPosData.employeeNumberID] = []
          }
          posDataByEmp[empPosData.employeeNumberID].push(empPosData)
        })
      }

      const firedEmps = allDatas.filter(row => !row['dateFrom'] && row['changeOrderID.empOrderType'] === 'DISM').map(row => row.employeeNumberID)
      const store = UB.DataStore('hr_order')
      store.runSQL(` SELECT  (CASE WHEN c.entityName = 'hr_empOrder' THEN 
        (select rd.lawName from hr_empOrderDismDet dd 
             join hr_dictReasonDism rd on rd.ID = dd.dictReasonDismID 
        where dd.orderID = o.ID and dd.employeeNumberID = n.ID and dd.mi_deleteDate >= '9999-12-31') 
        ELSE (select rd.lawName  from hr_orderPay op  join hr_dictReasonDism rd on rd.ID = op.reasonDismID where op.ID = o.ID )  END) "reasonDismLaw",
        n.ID "employeeNumberID"
       from hr_employeeNumber n 
      join hr_order o on o.ID = n.changeOrderID
      JOIN hr_orderClass c on c.ID = o.orderClass
      where n.ID${entityBaseService.getInExpression('firedEmps')} 
      `, { firedEmps: firedEmps.length ? firedEmps : [0] })
      orderDatas.push(...store.getAsJsObject())

      const deps = UB.Repository('hr_department')
        .where('[orgID]', '=', orgID)
        .attrs(['mi_data_id', 'name', 'nameGen', 'parentUnitID', 'mi_dateFrom', 'mi_dateTo'])
        .orderBy('mi_dateFrom')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()

      const depsGrouped = {}
      deps.forEach(dep => {
        dep.mi_dateFrom = dateService.shiftDate(dep.mi_dateFrom)
        dep.mi_dateTo = dateService.shiftDate(dep.mi_dateTo)
        let depGroup = depsGrouped[dep.mi_data_id]
        if (!depGroup) {
          depGroup = depsGrouped[dep.mi_data_id] = []
        }
        depGroup.push(dep)
      })

      function formatDepName (depID, onDate) {
        if (!depID) {
          return ''
        }
        const depGroup = depsGrouped[depID]
        if (!depGroup) { // unit is not department
          return ''
        }
        const dep = depGroup.filter(d => d.mi_dateFrom <= onDate && onDate < d.mi_dateTo)[0] || depGroup[depGroup.length - 1]
        return ' ' + (dep.nameGen || dep.name) + formatDepName(dep.parentUnitID, onDate)
      }

      allDatas.forEach((row) => {
        function calcCat (row, empPosData) {
          switch (row.eventType) {
            case 1:
              if (empPosData['workPlace'] === '1' && empPosData['accCategory'] !== '4') {
                return 1
              }
              if ((empPosData['workPlace'] === '2' || empPosData['workPlace'] === '3') && empPosData['accCategory'] !== '4') {
                return 2
              }
              /*
              if (empPosData['workPlace'] === '4' && (empPosData['accCategory'] === '26' || empPosData['accCategory'] === '7')) {
                return 3
              }
              */
              if (empPosData['accCategory'] === '4') {
                return 8
              }
              break
            case 2:
              if (empPosData['accCategory'] === '4') {
                return 7
              } else {
                return 5
              }
            case 3:
              return 6
            case 4:
              return 4
            case 5:
              return 3
          }
        }

        let empPosData = row.empPosData = {}
        if (posDataByEmp[row.employeeNumberID]) {
          const posData = posDataByEmp[row.employeeNumberID].filter(posData => posData.dateFrom <= (row.dateTo || period.dateTo) && (row.dateFrom || lastDayPriorMounth) <= posData.dateTo)
          if (posData.length) {
            empPosData = row.empPosData = posData[row.dateFrom ? 0 : posData.length - 1]
          }
        }
        empPosData.depPosName = ((params.useActualPositionName
          ? empPosData['factPosName'] || ''
          : empPosData['positionName'] || '') +
          formatDepName(empPosData.departmentID, (row.dateFrom || period.dateFrom))).trim()
        row.cat = calcCat(row, empPosData)
        row.isNotOutStaff = epData.filter(o => o.employeeID === row.employeeID && o.dateFrom <= (row.dateTo || period.dateTo) && (row.dateFrom || lastDayPriorMounth) <= o.dateTo).some(o => o.workPlace !== '4')
      })
      reportData.push(...allDatas)
    })
  })
  reportData.sort((a, b) =>
    stringService.compareStringUa(a['employeeID.lastName'], b['employeeID.lastName']) === 1 ? 1
      : a['employeeID.lastName'] === b['employeeID.lastName'] ? stringService.compareStringUa(a['employeeID.firstName'], b['employeeID.firstName']) === 1 ? 1
        : a['employeeID.firstName'] === b['employeeID.firstName'] ? stringService.compareStringUa(a['employeeID.middleName'], b['employeeID.middleName']) === 1 ? 1
          : a['employeeID.middleName'] === b['employeeID.middleName'] ? (a.dateFrom || a.dateTo) > (b.dateFrom || b.dateTo) ? 1 : -1 : -1 : -1 : -1
  ).forEach((row, idx) => {
    if (!row.dateFrom && !row.dateTo) {
      return
    }
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }

    function formatOrder (orderDate, orderNumber, isCph) {
      if (!orderDate && !orderNumber) {
        return null
      }
      return isCph
        ? `Договір${orderNumber ? (' № ' + orderNumber) : ''}${orderDate ? (' від ' + dateService.formatDate(orderDate)) : ''}`
        : `Наказ${orderDate ? (' від ' + dateService.formatDate(orderDate)) : ''}${orderNumber ? (' № ' + orderNumber) : ''}`
    }
    updateCellInArray(data, 'T1RXXXXG5', rownum, (row['employeeID.citizenshipID.code'] === 'UKR') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG6', rownum, (row['eventType'] === 5 && row.isNotOutStaff) ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG7', rownum, row.cat)
    updateCellInArray(data, 'T1RXXXXG8S', rownum, `${row['employeeID.empTaxCodeType'] === 'PASSPORT' ? 'БК' : (row['employeeID.empTaxCodeType'] === 'IDCARD' ? 'П' : '')}${row['employeeID.taxCode']}`)
    updateCellInArray(data, 'T1RXXXXG91S', rownum, (row['employeeID.lastName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG92S', rownum, (row['employeeID.firstName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG93S', rownum, (row['employeeID.middleName'] || '').replace('’', `'`))
    updateCellInArray(data, 'T1RXXXXG101D', rownum, row['dateFrom'] ? moment(row['dateFrom']).format('DDMMYYYY') : null)
    updateCellInArray(data, 'T1RXXXXG102D', rownum, row['dateTo'] ? moment(row['dateTo']).format('DDMMYYYY') : null)
    updateCellInArray(data, 'T1RXXXXG11', rownum, row.empPosData['workPlace'] === '2' ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG12', rownum, ([3, 4, 5, 6, 7].includes(row.cat) ? '0'
      : ((row['dateFrom'] && row.empOrderType === 'MOVE') || (!row['dateFrom'] && row['dateTo'] && row.empOrderType === 'MOVE') || (row.empOrderType === 'DISM' && row['employeeNumberID.childEmpNumberID'])) ? '1' : '0'))

    updateCellInArray(data, 'T1RXXXXG13S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData['profName'])
    updateCellInArray(data, 'T1RXXXXG14S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData['profCode'])
    updateCellInArray(data, 'T1RXXXXG15S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData.depPosName)
    // Якщо дата початку пуста, то Документ підстава закінчення, інакше Документ підстава початку /*row.empOrderType */
    const isCph = row['eventType'] === 5
    const docFrom = formatOrder(row['orderID.orderDate'], row['orderID.orderNumber'], isCph)
    const docTo = formatOrder(row['changeOrderID.orderDate'], row['changeOrderID.orderNumber'], isCph)
    updateCellInArray(data, 'T1RXXXXG16S', rownum, row['dateFrom'] && !row['dateTo'] ? docFrom : (!row['dateFrom'] && row['dateTo'] ? docTo : (row['dateFrom'] && row['dateTo']
      ? (docFrom === docTo ? docFrom : `${docFrom}, ${docTo}`)
      : null))
    )
    updateCellInArray(data, 'T1RXXXXG17S', rownum, row['eventType'] === 5 && row['dateTo'] ? row['reasonRegReport']
      : ((row['dateTo'] && row.empOrderType === 'DISM' && !row['employeeNumberID.childEmpNumberID'])
        ? (orderDatas.find(o => o.employeeNumberID === row.employeeNumberID) || {})['reasonDismLaw']
        : ((row['dateTo'] && (['MOVE'].indexOf(row['changeOrderID.empOrderType']) >= 0 || row['employeeNumberID.childEmpNumberID'])) ||
      (row['dateFrom'] && (['MOVE'].indexOf(row['orderID.empOrderType']) >= 0 || row['employeeNumberID.childEmpNumberID']))) ? 'Переведення на іншу посаду в межах однієї організації' : ''))

    updateCellInArray(data, 'T1RXXXXG18D', rownum, (row.empPosData['dateNew'] && (row.empPosData['dateNew'] < dateService.shiftDate(row.empPosData.dateTo)) && (row.empPosData['dateNew'] >= dateService.addYears(dateService.shiftDate(row.empPosData.dateTo), -2))) ? dateService.formatDate(row.empPosData['dateNew']) : null)
    updateCellInArray(data, 'T1RXXXXG19S', rownum, null)
    updateCellInArray(data, 'T1RXXXXG20', rownum, null)
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
    names: ['HTIN1', 'T1RXXXXG8S', 'T1RXXXXG91S', 'T1RXXXXG92S', 'T1RXXXXG93S', 'T1RXXXXG13S', 'T1RXXXXG14S', 'T1RXXXXG101D',
      'T1RXXXXG102D', 'T1RXXXXG15S', 'T1RXXXXG16S', 'T1RXXXXG17S', 'T1RXXXXG18D', 'T1RXXXXG19S', 'HKBUH', 'HBUH', 'HFIL'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: [ 'HZ', 'HZM', 'HZY', 'HZKV', 'HNUM1', 'HZB', 'HZS', 'HZD', 'HZN', 'HZU' ],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG5', 'T1RXXXXG6', 'T1RXXXXG7', 'H01', 'H02', 'T1RXXXXG11', 'T1RXXXXG12', 'T1RXXXXG20'],
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
  correctRowNum({ DECLARBODY, tabIndex: 'T1' })
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  // const formTypeElementName = parseInt(DECLARBODY.HZS) ? 'HZS' : parseInt(DECLARBODY.HZD) ? 'HZD' : 'HZB'
  // const formTypeElementName = DECLARBODY.HZS ? 'HZS' : DECLARBODY.HZD ? 'HZD' : 'HZB'
  const formTypeElementName = DECLARBODY.HZS === 1 || DECLARBODY.HZS === 'true' ? 'HZS' : DECLARBODY.HZD === 1 || DECLARBODY.HZD === 'true' ? 'HZD' : 'HZB'
  const attrList = allBodyAttrNames.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
  attrList.splice(5, 0, formTypeElementName)
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
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1">X</button></td>
      <td rowspan="2"><span class="row_num">ROWNUM</span></td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG5##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td rowspan="2">{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td rowspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td rowspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG8S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td colspan="3" rowspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG91S##ROWNUM##{{{}}}{{/textSpanInput}} {{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG92S##ROWNUM##{{{}}}{{/textSpanInput}} {{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG93S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td rowspan="2">{{#dateSpanInput}}DECLAR.DECLARBODY.T1RXXXXG101D##ROWNUM##{{{}}}{{/dateSpanInput}}</td>
      <td rowspan="2">{{#dateSpanInput}}DECLAR.DECLARBODY.T1RXXXXG102D##ROWNUM##{{{}}}{{/dateSpanInput}}</td>
      <td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG11##ROWNUM{{{}}}{{/intSpanInput}}</td>
      <td align="left">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG13S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG14S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG16S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG18D##ROWNUM##{{{}}}{{/textSpanInput}}</td>
      <td rowspan="2">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG20##ROWNUM##{{{}}}{{/textSpanInput}}</td></tr>`,
    `<tr><td>{{#intSpanInput}}DECLAR.DECLARBODY.T1RXXXXG12##ROWNUM{{{}}}{{/intSpanInput}}</td>
    <td colspan="2" align="left">{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG15S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
    <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG17S##ROWNUM##{{{}}}{{/textSpanInput}}</td>
    <td>{{#textSpanInput}}DECLAR.DECLARBODY.T1RXXXXG19S##ROWNUM##{{{}}}{{/textSpanInput}}</td></tr>`
  ]
  params.T1BtnAddRow = [
    `<tr><td rowspan="2" class="td_btn_row no-print"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1">+</button></td></tr>`
  ]
}
