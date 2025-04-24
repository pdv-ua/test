const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const { generateFileName, structureReport, setDataProps, setMainData, getCellSettings, createDeclarAt, buildAttrsExt, createDeclarExt } = require('../../../../AC/modules/regReport/index')
const dateService = require('../../../../AC/modules/dataServices/dateService')
const { updateCellInArray } = require('../../../../AC/modules/regReport/taxInvoice')
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
  const { DECLARBODY, DECLARHEAD, PARAMS } = data.DECLAR

  setDataProps({ data: DECLARBODY, source: params })
  setDataProps({ data: DECLARHEAD, source: params })
  setMainData({ data, params })

  prepareQueryParams({ data, params })

  addTempleteForCustomRow(PARAMS)
  data.cellSettings = getCellSettings(params.repConfig.dictRepID)
  prepareDataSpecific({ data, params })

  return { data, errorMessages }
}

const allBodyAttrNames = [
  'HTIN', 'HTIN1', 'HNAME', 'HZM', 'HZY', 'HZB', 'HZS', 'HZD',

  'T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8', 'T1RXXXXG9S', 'T1RXXXXG101S', 'T1RXXXXG102S', 'T1RXXXXG103S', 'T1RXXXXG111', 'T1RXXXXG112',
  'T1RXXXXG12S', 'T1RXXXXG13', 'T1RXXXXG14S', 'T1RXXXXG15S', 'T1RXXXXG16S', 'T1RXXXXG17S', 'T1RXXXXG18D', 'T1RXXXXG19S',

  'HFILL', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH'
]

function prepareStructureReport (data) {
  const cellNames = allBodyAttrNames
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3040512.xsd'
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
  params.dateFrom = new Date(Date.UTC(data.DECLAR.DECLARHEAD.PERIOD_YEAR, data.DECLAR.DECLARHEAD.PERIOD_MONTH - 1, 1, 0, 0, 0, 0))
  params.dateTo = dateService.lastDayOfMonth(params.dateFrom)
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
  const lastDayPriorMounth = dateService.addDays(params.dateFrom, -1)
  let empPosDatas = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'isActive', 'orderID', 'changeOrderID', 'departmentID', 'positionID', 'dictPositionID',
      'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeNumberID.tabNum',
      'employeeID.taxCode', 'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'employeeID.sexType', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'changeOrderID.empOrderType',
      'dictStaffCatID.accCategory', 'ID'])
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '>=', params.dateFrom, 'dff')
    .where('[dateFrom]', '<=', params.dateTo, 'dft')
    .where('[dateTo]', '>=', lastDayPriorMounth, 'dtf')
    .where('[dateTo]', '<=', params.dateTo, 'dtt')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .where('workPlace', 'in', ['1', '3'])
    .logic('(([dff] AND [dft]) OR ([dtf] AND [dtt]))')
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .orderBy('isActive')
    .misc({ __skipRls: true })
    .selectAsObject({ 'ID': 'employeePositionID' })

  let posDataByEmp = {}

  let curEmpNumber
  let prevPositionID
  let previosDepID
  let dictPositionID
  const resultData = []
  empPosDatas.filter((row, index) => {
    if (row.employeeNumberID !== curEmpNumber) {
      curEmpNumber = row.employeeNumberID
      prevPositionID = null
      previosDepID = null
      dictPositionID = null
    }
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    row['employeeNumberID.dateTo'] = dateService.shiftDate(row['employeeNumberID.dateTo'])
    if (row.dateTo >= params.dateFrom && row.isActive) {
      if (params.isInclude5 && row['orderID.empOrderType'] !== 'APPOINT' && row['changeOrderID.empOrderType'] !== 'DISM' &&
        ((row.positionID !== prevPositionID) || (!row.positionID && (row.dictPositionID !== dictPositionID)) ||
        (row.departmentID !== previosDepID))) {
        row.eventType = 1 // робота
        row.empOrderType = 'MOVE'
        const lastChangeIdx = row.dateTo <= params.dateTo ? empPosDatas.indexOf(o => (o.employeeNumber === row.employeeNumber && !o.isActive &&
        ((row.positionID !== o.positionID) || (!o.positionID && (row.dictPositionID !== o.dictPositionID)) ||
            (row.departmentID !== o.departmentID))), index + 1) : -1
        row.dateTo = row.dateTo > params.dateTo ? null : (lastChangeIdx >= 0 ? dateService.addDays(dateService.shiftDate(empPosDatas[lastChangeIdx].dateFrom), -1) : null)
        if (row.dateTo <= params.dateTo && lastChangeIdx >= 0) {
          row.changeOrderID = empPosDatas[lastChangeIdx].orderID
          row['changeOrderID.orderDate'] = empPosDatas[lastChangeIdx]['orderID.orderDate']
          row['changeOrderID.orderNumber'] = empPosDatas[lastChangeIdx]['orderID.orderNumber']
          row['changeOrderID.empOrderType'] = empPosDatas[lastChangeIdx]['orderID.empOrderType']
        }
        resultData.push(Object.assign({}, row))
      } else {
        if (row['orderID.empOrderType'] === 'APPOINT' && row.dateFrom.getTime() === dateService.shiftDate(row['employeeNumberID.dateFrom']).getTime() &&
          row.dateFrom >= params.dateFrom && row.dateFrom <= params.dateTo) {
          row.eventType = 1 // робота
          row.empOrderType = 'APPOINT'
          const lastChangeIdx = row.dateTo <= params.dateTo ? empPosDatas.indexOf(o => (o.employeeNumber === row.employeeNumber && !o.isActive &&
            ((row.positionID !== o.positionID) || (!o.positionID && (row.dictPositionID !== o.dictPositionID)) ||
              (row.departmentID !== o.departmentID))), index + 1) : -1
          row.dateTo = row.dateTo > params.dateTo ? null : (lastChangeIdx >= 0 ? dateService.addDays(dateService.shiftDate(empPosDatas[lastChangeIdx].dateFrom), -1)
            : (row['employeeNumberID.dateTo'] >= params.dateFrom && row['employeeNumberID.dateTo'] <= params.dateTo) ? row['employeeNumberID.dateTo'] : null)
          if (row.dateTo <= params.dateTo && lastChangeIdx >= 0) {
            row.changeOrderID = empPosDatas[lastChangeIdx].orderID
            row['changeOrderID.orderDate'] = empPosDatas[lastChangeIdx]['orderID.orderDate']
            row['changeOrderID.orderNumber'] = empPosDatas[lastChangeIdx]['orderID.orderNumber']
            row['changeOrderID.empOrderType'] = empPosDatas[lastChangeIdx]['orderID.empOrderType']
          }
          resultData.push(Object.assign(Object.assign({}, row),
            (lastChangeIdx < 0 && (row['changeOrderID.empOrderType'] === 'DISM' || (row.dateTo && row.dateTo.getTime() === row['employeeNumberID.dateTo'].getTime())) && row.changeOrderID !== row.orderID)
              ? { dateTo: null, 'changeOrderID.empOrderType': null } : {}
          ))
        }
        if ((row['changeOrderID.empOrderType'] === 'DISM' || (row.dateTo && row.dateTo.getTime() === row['employeeNumberID.dateTo'].getTime())) && row.dateTo >= params.dateFrom && row.dateTo <= params.dateTo) {
          row.eventType = 1 // робота
          row.empOrderType = 'DISM'
          row['changeOrderID.empOrderType'] = 'DISM'
          row.dateFrom = null
          resultData.push(Object.assign({}, row))
        }
      }
    }
    prevPositionID = row.positionID
    previosDepID = row.departmentID
    dictPositionID = row.dictPositionID
  })
  const empAccrDatas = UB.Repository('hr_employeeAccrual')
    .attrs(['employeeNumberID', 'employeeID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID', 'payElID.methodID.code',
      'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeNumberID.tabNum',
      'employeeID.taxCode', 'employeeID.empTaxCodeType', 'employeeID.citizenshipID.code', 'employeeID.sexType',
      'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'changeOrderID.empOrderType'])
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('[payElID.methodID.code]', 'in', ['14', '57', '134', '140'])
    .where('[dateFrom]', '>=', params.dateFrom, 'dff')
    .where('[dateFrom]', '<=', params.dateTo, 'dft')
    .where('[dateTo]', '>=', params.dateFrom, 'dtf')
    .where('[dateTo]', '<=', params.dateTo, 'dtt')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.workPlaceCode]', 'in', ['1', '3'])
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
      priorRow.dateTo = row.dateTo <= params.dateTo ? row.dateTo : null
      if (row.dateTo <= params.dateTo) {
        priorRow.changeOrderID = row.changeOrderID
        priorRow['changeOrderID.orderDate'] = row['changeOrderID.orderDate']
        priorRow['changeOrderID.orderNumber'] = row['changeOrderID.orderNumber']
        priorRow['changeOrderID.empOrderType'] = row['changeOrderID.empOrderType']
      }
    } else {
      priorRow = row
      row.dateFrom = (row.dateFrom >= params.dateFrom && row.dateFrom <= params.dateTo) ? row.dateFrom : null
      row.dateTo = (row.dateTo >= params.dateFrom && row.dateTo <= params.dateTo) ? row.dateTo : null
      row.empOrderType = 'VAC'
      resultData.push(row)
    }
  })

  let empOrderDtDatas = UB.Repository('hr_orderRegistryDt')
    .attrs(['employeeNumberID', 'employeeNumberID.employeeID', 'orderDateFrom', 'orderDateTo', 'orderID', 'payElID.methodID.code',
      'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeNumberID.tabNum', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'employeeNumberID.employeeID.citizenshipID.code', 'employeeNumberID.employeeID.sexType',
      'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType'])
    .where('[employeeNumberID.orgID]', '=', params.organizationID)
    .where('[payElID.methodID.code]', '=', '20')
    .where('[payElID.dictTimeCostID]', 'isNotNull')
    .where('[orderDateFrom]>=[periodSalaryID.dateFrom]', 'custom')
    .where('[orderDateFrom]<=[periodSalaryID.dateTo]', 'custom')
    .where('[orderDateFrom]', '>=', params.dateFrom, 'dff')
    .where('[orderDateFrom]', '<=', params.dateTo, 'dft')
    .where('[orderDateTo]', '>=', params.dateFrom, 'dtf')
    .where('[orderDateTo]', '<=', params.dateTo, 'dtt')
    .where('[employeeNumberID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.employeeID.mi_deleteDate]', '>=', '#maxdate')
    .where('[employeeNumberID.workPlaceCode]', 'in', ['1', '3'])
    .where(`(flagsRec & 512 = 0)`, 'custom')
    .where('periodCalcID', 'isNotNull')
    .logic('([dff] AND [dft]) OR ([dtf] AND [dtt])')
    .groupBy(['employeeNumberID', 'employeeNumberID.employeeID', 'orderDateFrom', 'orderDateTo', 'orderID', 'payElID.methodID.code',
      'employeeNumberID.employeeID.lastName', 'employeeNumberID.employeeID.firstName', 'employeeNumberID.employeeID.middleName',
      'employeeNumberID.tabNum', 'employeeNumberID.employeeID.taxCode', 'employeeNumberID.employeeID.empTaxCodeType',
      'employeeNumberID.employeeID.citizenshipID.code', 'employeeNumberID.employeeID.sexType',
      'orderID.orderDate', 'orderID.orderNumber', 'orderID.empOrderType'])
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
      'employeeNumberID.employeeID.empTaxCodeType': 'employeeID.empTaxCodeType'
    })
  priorRow = null
  empOrderDtDatas.forEach(row => {
    // ищем приказ
    const vacOrder = UB.Repository('hr_empOrderVacationlongDet')
      .attrs(['orderID.orderDate', 'orderID.orderNumber'])
      .where('empOrderSicknessID', 'in', UB.Repository('hr_docRegSickness').attrs('empOrderSicknessID').where('ID', '=', row.orderID))
      .limit(1)
      .selectSingle()
    if (vacOrder) {
      row['orderID.orderDate'] = vacOrder['orderID.orderDate']
      row['orderID.orderNumber'] = vacOrder['orderID.orderNumber']
    }
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    row.eventType = 2
    if (priorRow && (row.employeeNumberID !== priorRow.employeeNumberID || row['payElID.methodID.code'] !== priorRow['payElID.methodID.code'] ||
        (!priorRow.dateTo || dateService.addDays(priorRow.dateTo).getTime() !== row.dateFrom))) {
      priorRow = null
    }
    if (priorRow) {
      priorRow.dateTo = row.dateTo <= params.dateTo ? row.dateTo : null
      if (row.dateTo <= params.dateTo) {
        priorRow.changeOrderID = row.changeOrderID
        priorRow['changeOrderID.orderDate'] = row['changeOrderID.orderDate']
        priorRow['changeOrderID.orderNumber'] = row['changeOrderID.orderNumber']
        priorRow['changeOrderID.empOrderType'] = row['changeOrderID.empOrderType']
      }
    } else {
      priorRow = row
      row.dateFrom = (row.dateFrom >= params.dateFrom && row.dateFrom <= params.dateTo) ? row.dateFrom : null
      row.dateTo = (row.dateTo >= params.dateFrom && row.dateTo <= params.dateTo) ? row.dateTo : null
      if (!row.dateFrom && !row['changeOrderID.orderDate']) row['changeOrderID.orderDate'] = row['orderID.orderDate']
      if (!row.dateFrom && !row['changeOrderID.orderNumber']) priorRow['changeOrderID.orderNumber'] = row['orderID.orderNumber']
      row.empOrderType = 'REG'
      resultData.push(row)
    }
  })

  const allDatas = resultData

  posDataByEmp = {}
  let epData = []
  if (allDatas.length > 0) {
    let allEmpNumbers = allDatas.map(el => el.employeeNumberID).filter((empNum, index, arr) => arr.indexOf(empNum) === index).join(', ')
    let empPosDatasIDs = empPosDatas.map(el => el.employeePositionID).filter((empNum, index, arr) => arr.indexOf(empNum) === index).join(', ')
    let wherePosClause = empPosDatasIDs ? ` or (ep.ID in (${empPosDatasIDs}))` : ''

    const empPositionDS = UB.DataStore('hr_employeePosition')
    empPositionDS.runSQL(`SELECT 
          ep.ID as employeePositionID, ep.employeeID as employeeID, ep.dateFrom as dateFrom, ep.dateTo as dateTo
          , ep.workPlace as workPlace, ep.dateNew as dateNew, dsc.accCategory as accCategory
          , ep.positionID as positionID
          , ep.dictPositionID as dictPositionID
          , ep.departmentID as departmentID
          , dictPos.name as posName 
          , dp.code as profCode  
          , dp.name as profName 
          , dp.codeZKPPTR as codeZKPPTR 
          , ep.employeeNumberID as employeeNumberID
          FROM hr_employeePosition ep 
          LEFT JOIN hr_dictStaffCat dsc ON dsc.ID = ep.dictStaffCatID and dsc.mi_deleteDate >= '9999-12-31' 
          LEFT JOIN hr_dictPosition dictPos ON dictPos.ID = ep.dictPositionID and dictPos.mi_deleteDate >= '9999-12-31' 
          LEFT JOIN hr_dictProfession dp ON dp.ID = dictPos.dictProfessionID and dp.mi_deleteDate >= '9999-12-31' 
          WHERE ep.organizationID = :orgID: 
          AND ((ep.dateFrom <= :dateTo: and ep.dateTo >= :dateFrom: ) ${wherePosClause})
          AND ep.employeeNumberID in (${allEmpNumbers}) 
          AND ep.workPlace in ('1', '3') 
          AND ep.isActive = 1
          AND ep.mi_deleteDate >= '9999-12-31' 
          ORDER BY ep.dateFrom`
    , {
      orgID: params.organizationID,
      dateTo: params.dateTo,
      dateFrom: params.dateFrom
    })

    epData = empPositionDS.getAsJsObject()

    epData.forEach(empPosData => {
      empPosData.dateFrom = dateService.shiftDate(empPosData.dateFrom)
      empPosData.dateTo = dateService.shiftDate(empPosData.dateTo)
      empPosData.dateNew = dateService.shiftDate(empPosData.dateNew)
      let group = posDataByEmp[empPosData.employeeNumberID]
      if (!group) {
        group = posDataByEmp[empPosData.employeeNumberID] = []
      }
      group.push(empPosData)
    })
  }

  const firedEmps = allDatas.filter(row => !row['dateFrom'] && row['changeOrderID.empOrderType'] === 'DISM').map(row => row.employeeNumberID)
  const store = UB.DataStore('hr_order')
  store.runSQL(` SELECT
  (CASE WHEN c.entityName = 'hr_empOrder' THEN 
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
  const orderDatas = store.getAsJsObject()
  const deps = UB.Repository('hr_department')
    .where('[orgID]', '=', params.organizationID)
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
          if (empPosData['workPlace'] === '4' && empPosData['accCategory'] === '26') {
            return 3
          }
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
      }
    }
    const empPosData = row.empPosData = posDataByEmp[row.employeeNumberID] ? (posDataByEmp[row.employeeNumberID].filter(posData => posData.dateFrom <= (row.dateFrom || dateService.shiftDate(params.dateFrom)) && (row.dateFrom || dateService.shiftDate(params.dateFrom)) <= posData.dateTo)[0] || {}) : {}
    empPosData.depPosName = ((empPosData['posName'] || '') + formatDepName(empPosData.departmentID, (row.dateFrom || dateService.shiftDate(params.dateFrom)))).trim()
    row.cat = calcCat(row, empPosData)
  })
  allDatas.sort((a, b) =>
    a['employeeID.taxCode'] > b['employeeID.taxCode'] ? 1
      : a['employeeID.taxCode'] === b['employeeID.taxCode'] ? a.cat > b.cat ? 1
        : a.cat === b.cat ? a['employeeNumberID.tabNum'] > b['employeeNumberID.tabNum'] ? 1
          : a['employeeNumberID.tabNum'] === b['employeeNumberID.tabNum'] ? (a.dateFrom || a.dateTo) > (b.dateFrom || b.dateTo) ? 1 : -1 : -1 : -1 : -1
  ).forEach((row, idx) => {
    if (!row.dateFrom && !row.dateTo) {
      return
    }
    const rownum = idx + 1
    if (rownum > 9999) {
      return
    }

    function formatOrder (orderDate, orderNumber) {
      if (!orderDate && !orderNumber) {
        return null
      }
      return `Наказ${orderDate ? (' від ' + dateService.formatDate(orderDate)) : ''}${orderNumber ? (' № ' + orderNumber) : ''}`
    }

    updateCellInArray(data, 'T1RXXXXG6', rownum, (row['employeeID.citizenshipID.code'] === 'UKR') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG7', rownum, (row.empPosData['accCategory'] === '7') ? '1' : '0')
    updateCellInArray(data, 'T1RXXXXG8', rownum, row.cat)
    updateCellInArray(data, 'T1RXXXXG9S', rownum, `${row['employeeID.empTaxCodeType'] === 'PASSPORT' ? 'БК' : (row['employeeID.empTaxCodeType'] === 'IDCARD' ? 'П' : '')}${row['employeeID.taxCode']}`)
    updateCellInArray(data, 'T1RXXXXG101S', rownum, row['employeeID.lastName'])
    updateCellInArray(data, 'T1RXXXXG102S', rownum, row['employeeID.firstName'])
    updateCellInArray(data, 'T1RXXXXG103S', rownum, row['employeeID.middleName'])
    updateCellInArray(data, 'T1RXXXXG111', rownum, row['dateFrom'] ? row['dateFrom'].getDate() : null)
    updateCellInArray(data, 'T1RXXXXG112', rownum, row['dateTo'] ? row['dateTo'].getDate() : null)

    updateCellInArray(data, 'T1RXXXXG12S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData['profName'])
    updateCellInArray(data, 'T1RXXXXG13', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData['codeZKPPTR'])
    updateCellInArray(data, 'T1RXXXXG14S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData['profCode'])
    updateCellInArray(data, 'T1RXXXXG15S', rownum, [3, 4, 5, 6, 7].includes(row.cat) ? null : row.empPosData.depPosName)
    // Якщо дата початку пуста, то Документ підстава закінчення, інакше Документ підстава початку /*row.empOrderType */
    updateCellInArray(data, 'T1RXXXXG16S', rownum, (!row['dateFrom'] ? formatOrder(row['changeOrderID.orderDate'], row['changeOrderID.orderNumber']) : formatOrder(row['orderID.orderDate'], row['orderID.orderNumber'])))
    updateCellInArray(data, 'T1RXXXXG17S', rownum, (row['dateTo'] && row.empOrderType === 'DISM') // && row['changeOrderID.empOrderType'] === 'DISM')
      ? (orderDatas.find(o => o.employeeNumberID === row.employeeNumberID) || {})['reasonDismLaw']
      // ? (orderDataByID[row.changeOrderID] || {})['reasonDismName']
      : (['MOVE', 'APPOINT'].indexOf(!row['dateFrom'] && row['changeOrderID.empOrderType']) >= 0) ? 'Переведення на іншу посаду в межах однієї організації' : '')

    updateCellInArray(data, 'T1RXXXXG18D', rownum, (row.empPosData['dateNew'] && (row.empPosData['dateNew'] < dateService.shiftDate(row.empPosData.dateTo)) && (row.empPosData['dateNew'] >= dateService.addYears(dateService.shiftDate(row.empPosData.dateTo), -2))) ? dateService.formatDate(row.empPosData['dateNew']) : null)
    updateCellInArray(data, 'T1RXXXXG19S', rownum, null)
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
    names: ['HTIN1', 'T1RXXXXG9S', 'T1RXXXXG101S', 'T1RXXXXG102S', 'T1RXXXXG103S', 'T1RXXXXG12S', 'T1RXXXXG14S', 'T1RXXXXG15S', 'T1RXXXXG16S', 'T1RXXXXG17S', 'T1RXXXXG18D', 'T1RXXXXG19S', 'HKBUH', 'HBUH'],
    format: {
      type: 'string',
      nillable: true
    }
  },
  {
    names: ['HZM', 'HZY', 'HZB', 'HZS', 'HZD'],
    format: {
      type: 'number',
      nillable: false,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG6', 'T1RXXXXG7', 'T1RXXXXG8', 'T1RXXXXG111', 'T1RXXXXG112', 'T1RXXXXG13'],
    format: {
      type: 'number',
      nillable: true,
      precision: 0
    }
  },
  {
    names: ['T1RXXXXG17', 'T1RXXXXG18', 'T1RXXXXG19', 'T1RXXXXG20', 'T1RXXXXG21', 'R01G17', 'R01G18', 'R01G19', 'R01G20', 'R01G21'],
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
  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
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
  params.T1 = `<tr style="height: 45px;"><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px;" class="no-print">
        <button class="btn del-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">X</button></td>
      <td style="border: 1px solid black;text-align: center;"><span class="row_num">ROWNUM</span></td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG6##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG7##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG8##ROWNUM{{{}}}{{/intInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG9S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG101S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG102S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG103S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG111##ROWNUM##{{{}}}{{/intInput}}</td>
      <td>{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG112##ROWNUM##{{{}}}{{/intInput}}</td>
      <td style="padding: 0 0"><table style="table-layout: fixed; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="100%" height="45px"><tr><td style="border-bottom: 1px solid black" height="22">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG12S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr><tr><td height="23">{{#intInput}}DECLAR.DECLARBODY.T1RXXXXG13##ROWNUM{{{}}}{{/intInput}}</td></tr></table></td>
      <td style="padding: 0 0"><table style="table-layout: fixed; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="100%" height="45px"><tr><td style="border-bottom: 1px solid black" height="22">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG14S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr><tr><td height="23">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG15S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr></table></td>
      <td style="padding: 0 0"><table style="table-layout: fixed; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="100%" height="45px"><tr><td style="border-bottom: 1px solid black" height="22">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG16S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr><tr><td height="23">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG17S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr></table></td><td style="padding: 0 0"><table style="table-layout: fixed; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="100%" height="45px"><tr><td style="border-bottom: 1px solid black" height="22">{{#dateInput}}DECLAR.DECLARBODY.T1RXXXXG18D##ROWNUM{{{}}}{{/dateInput}}</td></tr><tr><td height="23">{{#textInput}}DECLAR.DECLARBODY.T1RXXXXG19S##ROWNUM##{"style": "height: 22px;"}{{{}}}{{/textInput}}</td></tr></table></td></tr>`
  params.T1BtnAddRow = `<tr style="height: 16px;" class="no-print"><td style="padding: 3px 5px 0 0; text-align: right; border-width: 0px; height: 18px;"><button class="btn add-row no-print" data-rownum="ROWNUM" data-source="T1" style="height: 20px;">+</button></td><td colspan="14"></td></tr>`
}
