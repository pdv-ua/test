const UB = require('@unitybase/ub')
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('getVacancies')
me.entity.addMethod('getVacanciesWithVacFrom')
me.entity.addMethod('selectVacanciesWithVacFrom')

me.getVacancies = ctx => {
  let mParams = ctx.mParams
  let fieldList = mParams.fieldList
  let oldFieldList = _.clone(fieldList)
  fieldList = fieldList.filter(field => { return !['mtCount', 'vacCount'].includes(field) })
  let hasParentUnit = false
  let hasMiDataId = false
  for (let i = 0; i < mParams.fieldList.length; i++) {
    let field = mParams.fieldList[i]
    if (field.indexOf('parentUnitID') >= 0) {
      hasParentUnit = true
    }
    if (field.indexOf('mi_data_id') >= 0) {
      hasMiDataId = true
    }
  }
  if (!hasMiDataId) {
    fieldList.push('mi_data_id')
  }
  let onDate = mParams.onDate || new Date()
  let orgID = mParams.orgID
  let data = UB.Repository('hr_position')
    .attrs(fieldList)
    .where('orgID', '=', orgID)
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('state', '=', 'ACTIVE')
  _.merge(data.whereList, mParams.whereList)
  if (hasParentUnit) {
    data = data.joinCondition('parentUnitID.mi_dateFrom', '<=', onDate)
      .joinCondition('parentUnitID.mi_dateTo', '>=', onDate)
      .joinCondition('parentUnitID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('parentUnitID.state', '=', 'ACTIVE')
  }
  let deferredOrderObj = { fields: [], orders: [] }
  if (mParams.orderList) {
    for (let key in mParams.orderList) {
      let item = mParams.orderList[key]
      let expr = item.expression
      if (expr) {
        if (['mtCount', 'vacCount'].includes(expr)) {
          deferredOrderObj.fields.push(expr)
          deferredOrderObj.orders.push(item.order)
        } else {
          data = data.orderBy('[' + expr + ']', item.order)
        }
      }
    }
  }
  data = data.selectAsObject()
  let empQntData = UB.Repository('hr_employeePositionS')
    .attrs(['positionID', 'positionID.quantity', 'mtCount'])
    .where('isActive', '=', true)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID.orgID', '=', orgID)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  let vacQntData = UB.Repository('hr_employeePositionS')
    .attrs(['positionID', 'positionID.quantity', 'mtCount'])
    .where('isActive', '=', true)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID.orgID', '=', orgID)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .exists(UB.Repository('hr_empLongTermAbsc')
      .attrs('ID')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  data.forEach(dataItem => {
    let posID = dataItem.mi_data_id
    let posQuantity = dataItem.quantity || 0
    let mtCount = 0.0
    let empPosItems = empQntData.filter(itm => itm.positionID === posID)
    if (empPosItems.length > 0) {
      empPosItems.forEach(itm => {
        mtCount += itm.mtCount
      })
    }
    let vacPosItems = vacQntData.filter(itm => itm.positionID === posID)
    if (vacPosItems.length > 0) {
      vacPosItems.forEach(itm => {
        mtCount -= itm.mtCount
      })
    }
    dataItem.mtCount = mtCount
    dataItem.vacCount = posQuantity - mtCount
  })
  data = data.filter(rec => { return rec.vacCount !== 0 })
  setCalcFields(data)
  if (deferredOrderObj.fields.length) {
    data = _.orderBy(data, deferredOrderObj.fields, deferredOrderObj.orders)
  }
  mParams.fieldList = oldFieldList
  data = storeService.formDataByFieldList(data, oldFieldList)
  storeService.initArrayToStore(ctx.dataStore, data, mParams)
  ctx.inherited = false
  return true
}

function setCalcFields (data) {
  data.forEach(item => {
    if (dateService.isMaxDate(item.mi_dateTo)) {
      item.mi_dateTo = null
    }
  })
}

me.getVacanciesWithVacFrom = function (onDate, orgID, isAll, departmentID, dictFundSourceID, includeChildDepts) {
  let posVacData = []
  const isFundSourceAccounting = settingsService.getByCode('hrFundSourceAccounting', orgID)

  let posData = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'mi_dateFrom', 'mi_dateTo', 'mi_minDateFrom', 'quantity',
      'entryOrderID.entryDate', 'staffOrderID.entryDate'])
    .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity'])
    .whereIf(orgID, 'orgID', '=', orgID)
    .misc({ __mip_ondate: onDate })
    .whereIf(departmentID && includeChildDepts, 'mi_treePath', 'like', '/' + departmentID + '/')
    .whereIf(departmentID && !includeChildDepts, 'parentUnitID', '=', departmentID)
    .whereIf(isFundSourceAccounting === 'STAFF' && dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
    .where('state', '=', 'ACTIVE')
  if (isFundSourceAccounting === 'STAFF') {
    posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
  }
  posData = posData.selectAsObject()

  function getEmployeePositionPromise () {
    return UB.Repository('hr_employeePositionS')
      .where('isActive', '=', true)
      .whereIf(orgID, 'positionID.orgID', '=', orgID)
      .whereIf(departmentID && includeChildDepts, 'positionID.mi_treePath', 'like', '/' + departmentID + '/')
      .whereIf(departmentID && !includeChildDepts, 'departmentID', '=', departmentID)
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
  }
  let empPosData = []
  let empPosDataAbsc = []
  let closedEmpPosData = []
  let newEmpPosData = []
  let empVacPositions = []

  if (!isAll) {
    empPosData = getEmployeePositionPromise()
      .attrs(['ID', 'positionID', 'dateFrom', 'dateTo', 'mtCount', 'employeeNumberID'])
      .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourceEmpPosID.ID', 'fundSourceEmpPosID.dictFundSourceID', 'fundSourceEmpPosID.mtCount'])
      .where('dateTo', '>=', onDate)
      .whereIf(isFundSourceAccounting === 'STAFF' && dictFundSourceID, 'fundSourceEmpPosID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('positionID')
      .orderBy('dateFrom')
    if (isFundSourceAccounting === 'STAFF') {
      empPosData.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
    }
    empPosData = empPosData.selectAsObject({
      'fundSourceEmpPosID.dictFundSourceID': 'dictFundSourceID'
    })

    // призначення у кого сортудники в отпуске
    empPosDataAbsc = getEmployeePositionPromise()
      .attrs(['ID', 'employeeNumberID'])
      .where('dateTo', '>=', onDate)
      .exists(UB.Repository('hr_empLongTermAbsc')
        .attrs('ID')
        .correlation('employeeNumberID', 'employeeNumberID')
        .whereIf(orgID, 'organizationID', '=', orgID)
        .where('dateTo', '>=', onDate)
        .where('mi_deleteDate', '>=', '#maxdate'))
      .selectAsObject()

    closedEmpPosData = getEmployeePositionPromise()
      .attrs(['ID', 'positionID', 'dateFrom', 'dateTo'])
      .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourceEmpPosID.dictFundSourceID'])
      .where('dateTo', '<=', onDate)
      .orderBy('positionID')
      .orderBy('dateTo')
    if (isFundSourceAccounting === 'STAFF') {
      closedEmpPosData.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
    }
    closedEmpPosData = closedEmpPosData.selectAsObject({
      'fundSourceEmpPosID.dictFundSourceID': 'dictFundSourceID'
    })

    newEmpPosData = getEmployeePositionPromise()
      .attrs(['ID', 'positionID', 'dateFrom', 'dateTo'])
      .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourceEmpPosID.dictFundSourceID'])
      .where('dateFrom', '>', onDate)
      .orderBy('positionID')
      .orderBy('dateTo')
    if (isFundSourceAccounting === 'STAFF') {
      newEmpPosData.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
    }
    newEmpPosData = newEmpPosData.selectAsObject({
      'fundSourceEmpPosID.dictFundSourceID': 'dictFundSourceID'
    })

    empVacPositions = empPosDataAbsc.length
      ? UB.Repository('hr_empLongTermAbsc')
        .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
        .whereIf(orgID, 'organizationID', '=', orgID)
        .where('employeeNumberID', 'in', empPosDataAbsc.map(o => o.employeeNumberID))
        .where('dateTo', '>=', onDate)
        .orderBy('employeeNumberID')
        .orderBy('dateFrom')
        .selectAsObject()
      : []
    empPosDataAbsc = empPosDataAbsc && empPosDataAbsc.length ? empPosDataAbsc.map(el => el.ID) : []
  }

  posData.forEach(posItem => {
    let posID = posItem.mi_data_id
    let parentUnitID = posItem.parentUnitID
    let posDateFrom = new Date(posItem['mi_minDateFrom'])
    let quantity = (isFundSourceAccounting === 'STAFF' && posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0

    let posVacItem = {
      mi_data_id: posID,
      dictFundSourceID: isFundSourceAccounting === 'STAFF' && posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.dictFundSourceID'] || null : null,
      parentUnitID: parentUnitID,
      vacFrom: posDateFrom,
      vacTo: new Date(posItem.mi_dateTo),
      quantity: quantity,
      mtCount: 0,
      vacCount: quantity,
      isTempVac: false
    }
    const empPosItems = empPosData.filter(o => o.positionID === posID && (!(isFundSourceAccounting === 'STAFF') || (isFundSourceAccounting === 'STAFF' && ((posVacItem.dictFundSourceID || 0) === (o.dictFundSourceID || 0)))))
    const closedEmpPosItems = closedEmpPosData.filter(o => o.positionID === posID && (!(isFundSourceAccounting === 'STAFF') || (isFundSourceAccounting === 'STAFF' && ((posVacItem.dictFundSourceID || 0) === (o.dictFundSourceID || 0)))))
    const newEmpPosItems = newEmpPosData.filter(o => o.positionID === posID && (!(isFundSourceAccounting === 'STAFF') || (isFundSourceAccounting === 'STAFF' && ((posVacItem.dictFundSourceID || 0) === (o.dictFundSourceID || 0)))))
    let vacFromDates = []
    let vacToDates = []
    let empPosCnt = 0
    let isTempVac = false

    empPosItems.forEach(empPosItem => {
      const flgFS = (!(isFundSourceAccounting === 'STAFF') || (empPosItem.dictFundSourceID === posVacItem.dictFundSourceID))
      let itemIsTempVac = flgFS && empPosDataAbsc.indexOf(empPosItem.ID) !== -1

      if (new Date(empPosItem.dateFrom) <= onDate && new Date(empPosItem.dateTo) >= onDate && !itemIsTempVac) {
        empPosCnt += (isFundSourceAccounting === 'STAFF' && empPosItem['fundSourceEmpPosID.ID'] ? empPosItem['fundSourceEmpPosID.mtCount'] : empPosItem.mtCount) || 0
      }
      isTempVac = isTempVac || itemIsTempVac
    })

    posVacItem.mtCount = empPosCnt
    posVacItem.vacCount = quantity - empPosCnt
    posVacItem.isTempVac = isTempVac

    posVacItem.vacFrom = null
    posVacItem.vacTo = null
    if (posVacItem.vacCount > 0) {
      empPosItems.forEach(empPosItem => {
        if (new Date(empPosItem.dateFrom) < onDate) {
          vacFromDates.push(new Date(empPosItem.dateFrom))
        }
        // let empPosDateTo = !dateService.isMaxDate(empPosItem.dateTo) && dateService.nextDay(empPosItem.dateTo)
        // empPosDateTo && vacToDates.push(empPosDateTo)
        const empPosVacation = empVacPositions.filter(o => o.employeeNumberID === empPosItem.employeeNumberID &&
          new Date(o.dateFrom) <= onDate && new Date(o.dateTo) >= onDate)
        empPosVacation.forEach(row => {
          vacFromDates.push(new Date(row.dateFrom))
          !dateService.isMaxDate(row.dateTo) && vacToDates.push(new Date(row.dateTo))
        })
      })
      closedEmpPosItems.forEach(empPosItem => {
        vacFromDates.push(dateService.nextDay(empPosItem.dateTo))
      })
      newEmpPosItems.forEach(empPosItem => {
        vacToDates.push(dateService.addDays(empPosItem.dateFrom, -1))
        if (dateService.isMaxDate(empPosItem.dateTo)) {
          vacToDates = vacToDates.filter(o => dateService.shiftDate(o) < dateService.shiftDate(empPosItem.dateFrom))
        }
      })

      if (vacFromDates.length) {
        posVacItem.vacFrom = _.max(vacFromDates)
      } else {
        // Немає призначень
        posVacItem.vacFrom = new Date(posItem['mi_minDateFrom']) // _.max([new Date(posItem['entryOrderID.entryDate']), new Date(posItem['staffOrderID.entryDate'])])
      }
      if (vacToDates.length) {
        posVacItem.vacTo = _.max(vacToDates)
      }
    }
    if (posVacItem.vacCount !== 0) {
      posVacData.push(posVacItem)
    }
  })
  return posVacData
}

me.selectVacanciesWithVacFrom = ctx => {
  let mParams = ctx.mParams
  if (mParams.includeChildDepts === undefined) {
    mParams.includeChildDepts = true
  }
  ctx.mParams.resultData = JSON.stringify(me.getVacanciesWithVacFrom(mParams.onDate, mParams.orgID, mParams.isAll, mParams.departmentID, mParams.dictFundSourceID, mParams.includeChildDepts))
}
