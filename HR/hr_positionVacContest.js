const UB = require('@unitybase/ub')
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('selectVacancies')
me.entity.addMethod('getVacancies')
me.entity.addMethod('getVacanciesWithVacFrom')
me.entity.addMethod('selectVacanciesWithVacFrom')

me.selectVacancies = ctx => {
  const oldFieldList = _.clone(ctx.mParams.fieldList)
  // let onDate = mParams.onDate || new Date()
  let data = getVacancyData(ctx)

  setCalcFields(data)
  ctx.mParams.fieldList = oldFieldList
  setContestFields(data, ctx.mParams.orgID)

  data = storeService.formDataByFieldList(data, oldFieldList)
  if (ctx.mParams.greaterThanZero) {
    data = data.filter(item => item.vacCount > 0)
  }

  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  ctx.inherited = false
  return true
}

me.getVacancies = ctx => {
  const data = getVacancyData(ctx)
  ctx.mParams.resultData = JSON.stringify(data)
}

function getVacancyData (ctx) {
  const mParams = ctx.mParams
  let isFundSourceAccounting = settingsService.getByCode('hrFundSourceAccounting', mParams.orgID)
  if (mParams.skipFundSource) {
    isFundSourceAccounting = 'WITHOUT'
  }
  let fieldList = mParams.fieldList
  const nonPositionFields = ['mtCount', 'vacCount', 'contestOrder', 'contestState', 'contestPortal', 'contestID',
    'isTempVac', 'parentUnitIDName', 'dictProfessionCode', 'staffOrderDescription', 'fundSourceName',
    'indepStructUnit', 'empList', 'vacancyDateFrom', 'vacancyDateTo', 'vacancyDays', 'positionID']
  fieldList = fieldList.filter(field => { return !nonPositionFields.includes(field) })
  const onDate = mParams.onDate || new Date()

  let hasMiDataId = false
  for (let i = 0; i < mParams.fieldList.length; i++) {
    const field = mParams.fieldList[i]
    if (field.indexOf('mi_data_id') >= 0) {
      hasMiDataId = true
    }
  }
  if (!hasMiDataId) {
    fieldList.push('mi_data_id')
  }
  fieldList.push('mi_treePath')

  const positionVac = global['hr_positionVac']
  let posVacData = positionVac.getVacanciesWithVacFrom(onDate, mParams.orgID)
  posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : []

  let whereList = {}
  if (mParams.whereList) {
    Object.keys(mParams.whereList).forEach(key => {
      let valueObj = mParams.whereList[key]
      let expression = valueObj.expression.replace('[', '').replace(']', '')
      if (!nonPositionFields.includes(expression)) {
        whereList[key] = valueObj
      }
    })
  }
  Object.assign({}, mParams.whereList)

  fieldList = fieldList.concat(['parentUnitID.name', 'dictPositionID.dictProfessionID.code', 'staffOrderID.description'])

  let data = UB.Repository('hr_position')
    .attrs(fieldList)
    .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourcePositionID.positionID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.dictFundSourceID.name', 'fundSourcePositionID.quantity'])
    .where('orgID', '=', mParams.orgID)
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
  _.merge(data.whereList, whereList)
  data = data.where('parentUnitID.mi_dateFrom', '<=', onDate)
    .where('parentUnitID.mi_dateTo', '>=', onDate)
    .where('parentUnitID.mi_deleteDate', '>=', '#maxdate')
    .where('parentUnitID.state', '=', 'ACTIVE')
  if (isFundSourceAccounting === 'STAFF') {
    data.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
  }

  const deferredOrderObj = { fields: [], orders: [] }
  if (mParams.orderList) {
    for (const key in mParams.orderList) {
      const item = mParams.orderList[key]
      const expr = item.expression
      if (expr) {
        if (['mtCount', 'vacCount', 'contestOrder', 'contestState', 'contestPortal',
          'isTempVac', 'parentUnitIDName', 'dictProfessionCode', 'staffOrderDescription', 'indepStructUnit', 'empList'].includes(expr)) {
          deferredOrderObj.fields.push(expr)
          deferredOrderObj.orders.push(item.order)
        } else {
          data = data.orderBy('[' + expr + ']', item.order)
        }
      }
    }
  }
  data = data.selectAsObject({ 'parentUnitID.name': 'parentUnitIDName',
    'dictPositionID.dictProfessionID.code': 'dictProfessionCode',
    'staffOrderID.description': 'staffOrderDescription' })

  // для визначення: Працівник тимчасово відсутній
  const empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
    .attrs('employeeNumberID', 'dateFrom')
    .where('organizationID', '=', mParams.orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject()

  let existNumber = UB.Repository('hr_employeePositionS')
    .attrs(['positionID', 'employeeID.shortFIO', 'dateToEmpty', 'tabNum', 'employeeNumberID'])
    .attrsIf(isFundSourceAccounting === 'STAFF', ['fundSourceEmpPosID.ID', 'fundSourceEmpPosID.dictFundSourceID'])
    .where('mi_deleteDate', '<=', '#maxdate')
    .where('employeeID.mi_deleteDate', '<=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('dateTo', '<=', '#maxdate')
    .exists(UB.Repository('hr_empLongTermAbsc')
      .attrs('ID')
      .correlation('employeeNumberID', 'employeeNumberID')
      .where('organizationID', '=', mParams.orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .where('organizationID', '=', mParams.orgID)
    .orderBy('positionID')

  const objList = { 'employeeID.shortFIO': 'FIO' }
  if (isFundSourceAccounting === 'STAFF') {
    existNumber.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
    objList['fundSourceEmpPosID.dictFundSourceID'] = 'dictFundSourceID'
  }

  existNumber = existNumber.selectAsObject(objList)

  existNumber.forEach(dataItem => {
    const flt = empLongTermAbsc.filter(el => el.employeeNumberID === dataItem.employeeNumberID)
    dataItem.dateFrom = flt && flt.length ? flt[0].dateFrom : undefined
  })
  const empEmpty = _.groupBy(existNumber, 'positionID')
  const depts = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'name'])
    .where('orgID', '=', mParams.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .orderBy('treePath')
    .selectAsObject()

  const indepStructUnits = {}
  data.forEach(dataItem => {
    dataItem.positionID = dataItem.ID
    dataItem.ID = isFundSourceAccounting === 'STAFF' && dataItem['fundSourcePositionID.positionID'] ? dataItem['fundSourcePositionID.positionID'] : dataItem.ID
    dataItem.dictFundSourceID = isFundSourceAccounting === 'STAFF' && dataItem['fundSourcePositionID.positionID'] ? dataItem['fundSourcePositionID.dictFundSourceID'] || null : null
    dataItem.fundSourceName = isFundSourceAccounting === 'STAFF' && dataItem['fundSourcePositionID.positionID'] ? dataItem['fundSourcePositionID.dictFundSourceID.name'] || '' : ''
    dataItem.quantity = (isFundSourceAccounting === 'STAFF' && dataItem['fundSourcePositionID.positionID'] ? dataItem['fundSourcePositionID.quantity'] : dataItem.quantity) || 0

    const vacItems = posVacData && posVacData[dataItem.mi_data_id]
    const vacItem = _.find(vacItems, { dictFundSourceID: dataItem.dictFundSourceID })
    dataItem.mtCount = (vacItem && vacItem.mtCount) || 0
    dataItem.vacCount = (vacItem && vacItem.vacCount) || 0

    const vacFrom = vacItem && vacItem.vacFrom ? dateService.shiftDate(vacItem.vacFrom) : null
    dataItem.vacancyDateFrom = vacFrom || null

    const vacTo = vacItem && vacItem.vacTo ? dateService.shiftDate(vacItem.vacTo) : null
    dataItem.vacancyDateTo = vacTo || null
    if (dataItem.vacancyDateTo && dataItem.vacancyDateTo.getFullYear() === 9999) {
      dataItem.vacancyDateTo = null
    }

    dataItem.vacancyDays = dataItem.vacancyDateFrom ? dateService.dateDiff(dataItem.vacancyDateFrom, onDate) : null

    dataItem.isTempVac = (vacItem && vacItem.isTempVac) || false
    if (!indepStructUnits[dataItem.mi_treePath]) {
      const itemDepts = depts.filter(item => dataItem.mi_treePath.includes(item.mi_data_id.toString()))
      if (itemDepts) {
        indepStructUnits[dataItem.mi_treePath] = itemDepts[0]
      }
    }
    dataItem.indepStructUnit = (indepStructUnits[dataItem.mi_treePath]) ? indepStructUnits[dataItem.mi_treePath].name : null

    dataItem.empList = ''
    if (empEmpty[dataItem.mi_data_id]) {
      let flt = empEmpty[dataItem.mi_data_id].filter(el => (el.dictFundSourceID || 0) === (dataItem.dictFundSourceID || 0))
      if (flt.length) {
        flt = _.sortBy(flt, 'dateFrom')
        dataItem.empList = (flt[0].tabNum ? flt[0].tabNum + ' ' : '') + (flt[0].FIO || '')
      }
    }
  })
  data = data.filter(rec => { return rec.vacCount !== 0 })
  if (deferredOrderObj.fields.length) {
    data = _.orderBy(data, deferredOrderObj.fields, deferredOrderObj.orders)
  }
  return data
}

function setCalcFields (data) {
  data.forEach(item => {
    if (dateService.isMaxDate(item.mi_dateTo)) {
      item.mi_dateTo = null
    }
  })
}

function setContestFields (data, orgID) {
  const listPosContest = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'positionID', 'mi_createDate', 'orderID.description', 'state', 'state.name', 'portalCode'])
    .where('organizationID', '=', orgID)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  if (listPosContest.length === 0) return

  data.forEach(empPos => {
    empPos.contestOrder = null
    empPos.contestState = null
    empPos.contestPortal = null
    empPos.contestID = null

    const filt = listPosContest.filter(item => item.positionID === empPos.mi_data_id)
    if (filt.length > 0) {
      const curPos = filt.reduce((prev, cur) => {
        return prev.mi_createDate <= cur.mi_createDate ? cur : prev
      })
      if (curPos.state !== 'COMPLETED') {
        empPos.contestOrder = curPos['orderID.description']
        empPos.contestState = curPos['state.name']
        empPos.contestPortal = curPos['portalCode']
        empPos.contestID = curPos['ID']
      }
    }
  })
}

me.getVacanciesWithVacFrom = function (onDate, orgID) {
  let posVacData = []
  let posData = UB.Repository('hr_position')
    .attrs(['mi_data_id', 'parentUnitID', 'mi_dateFrom', 'mi_dateTo', 'quantity'])
    .whereIf(orgID, 'orgID', '=', orgID)
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('state', '=', 'ACTIVE')

    .where('parentUnitID.mi_deleteDate', '>=', '#maxdate')
    .where('parentUnitID.mi_dateFrom', '<=', onDate)
    .where('parentUnitID.mi_dateTo', '>=', onDate)
    .where('parentUnitID.state', '=', 'ACTIVE')
    .selectAsObject()
  let empPosData = UB.Repository('hr_employeePositionS')
    .attrs(['positionID', 'dateFrom', 'dateTo', 'mtCount'])
    .where('isActive', '=', true)
    .where('dateTo', '>=', onDate)
    .whereIf(orgID, 'positionID.orgID', '=', orgID)
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')

    .where('positionID.parentUnitID.mi_deleteDate', '>=', '#maxdate')
    .where('positionID.parentUnitID.mi_dateFrom', '<=', onDate)
    .where('positionID.parentUnitID.mi_dateTo', '>=', onDate)
    .where('positionID.parentUnitID.state', '=', 'ACTIVE')
    .orderBy('positionID')
    .orderBy('dateFrom')
    .selectAsObject()
  posData.forEach(posItem => {
    let posID = posItem.mi_data_id
    let parentUnitID = posItem.parentUnitID
    let posDateFrom = posItem.mi_dateFrom
    let quantity = posItem.quantity || 0
    let posVacItem = {
      mi_data_id: posID,
      parentUnitID: parentUnitID,
      vacFrom: posDateFrom,
      quantity: quantity,
      mtCount: 0,
      vacCount: quantity
      // posDateFrom: posDateFrom // new future
    }
    let empPosItems = empPosData.filter(itm => itm.positionID === posID)
    if (empPosItems.length) {
      let empPosDates = []
      empPosItems.forEach(empPosItem => {
        empPosDates.push(empPosItem.dateFrom)
        empPosDates.push(empPosItem.dateTo)
      })
      empPosDates.sort()
      /* Шукаємо наявність вакантних ставок по посаді по датам призначення на посаду в оберненому порядку від самих старших дат */
      for (let i = empPosDates.length - 2; i >= 0; i--) {
        let empPosDate = empPosDates[i]
        let empPosCnt = 0.0
        empPosItems.forEach(empPosItem => {
          if (empPosItem.dateFrom <= empPosDate && empPosItem.dateTo >= empPosDate) {
            empPosCnt += empPosItem.mtCount || 0
          }
        })
        let vacCount = (quantity > empPosCnt) ? quantity - empPosCnt : 0
        if (i === empPosDates.length - 2) {
          /* Записуємо кількість вакантних ставок лише для останнього по даті запису */
          posVacItem.vacCount = vacCount
          posVacItem.mtCount = empPosCnt
        } else if (vacCount === 0) {
          /* Якщо найшли період, коли не було вакантних ставок, то початок вакансії посади брати попередню старшу дату */
          posVacItem.vacFrom = empPosDates[i + 1]
          break
        }
      }
    }
    posVacData.push(posVacItem)
  })
  return posVacData
}

me.selectVacanciesWithVacFrom = ctx => {
  const mParams = ctx.mParams
  ctx.mParams.resultData = JSON.stringify(me.getVacanciesWithVacFrom(mParams.onDate, mParams.orgID))
}
