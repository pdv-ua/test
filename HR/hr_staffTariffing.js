const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const staffTariffingService = require('../HR/modules/staffTariffingService')
const payElService = require('../HR/modules/payElService')
const dateService = require('../AC/modules/dataServices/dateService')
const currencyService = require('../AC/modules/dataServices/currencyService')
const entityService = require('../HR/modules/entityService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', orderService.beforeDeleteOrder)

me.entity.addMethod('getDetailsData')
me.entity.addMethod('calculateTariffing')
me.entity.addMethod('recalcPosData')
me.entity.addMethod('recalcDepData')
me.entity.addMethod('savePosData')
me.entity.addMethod('copyAccrualsFromEmpPos')
me.entity.addMethod('savePosAccruals')
me.entity.addMethod('getReportData')
me.entity.addMethod('checkData')
me.entity.addMethod('getStaffTariffingMoveEmployees')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function beforeInsert (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  entityService.setAttrs(ctx)
  execParams.description = `${UB.i18n('Тарифікаційний список')} ${execParams.description || ''}`.trim()
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const onDate = dateService.shiftDate(execParams.entryDate)
  initTarificationData({ staffTariffingID: execParams.ID, orgID: execParams.orgID, onDate, depFilter: execParams.departmentID || null })
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  orderService.setDefaultAttribute(me.entity.name, execParams, instanceData)
  orderService.checkOrderUpdate(ctx)
  entityService.setAttrs(ctx)
  execParams.description = `${UB.i18n('Тарифікаційний список')} ${execParams.description || ''}`.trim()
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderState === 'POSTED') {
    me.doPosting(ctx)
  } else if (execParams.orderState === 'PROJECT') {
    me.doCancelPosting(ctx)
  }
}

function initTarificationData ({ staffTariffingID, orgID, onDate, depFilter = null }) {
  const cont = initCont(orgID, onDate)
  const result = staffTariffingService.calculateStaffTariffing({
    cont,
    onDate,
    payElIDs: cont.payElIDs,
    depFilter
  })
  savePosTariffing(result, staffTariffingID)
}

function initCont (orgID, onDate, payElIDs) {
  if (!payElIDs) {
    payElIDs = UB.Repository('hr_dictTariffingPayEl')
      .attrs('payElID')
      .where('organizationID', 'isNull', undefined, 'orgIsNull')
      .where('organizationID', '=', orgID, 'org')
      .groupBy('payElID')
      .logic('([org] OR [orgIsNull])')
      .selectAsArrayOfValues()

    if (!payElIDs.length) {
      payElIDs.push(0)
    }
  }
  const payElExperience = UB.Repository('hr_payElExperience')
    .attrs(['payElID', 'years', 'months', 'rate'])
    .where('payElID', 'in', payElIDs)
    .orderBy('payElID')
    .orderBy('years', 'desc')
    .orderBy('months', 'desc')
    .selectAsObject()

  const dictSalaryRank = UB.Repository('hr_dictSalaryRank')
    .attrs('dictRankID', 'paySum')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  return {
    orgID,
    payEl: payElService.getPayElEntrySum(),
    payElExperience,
    dictSalaryRank,
    payElIDs
  }
}

function calcFund (accruals, payElIDs) {
  if (!Array.isArray(accruals) || !Array.isArray(payElIDs)) {
    return 0
  }
  return accruals.reduce((sum, acc) => {
    sum += payElIDs.includes(acc.payElID) ? (acc.planSum || acc.paySum || 0) : 0
    return sum
  }, 0)
}

function savePosTariffing (tarification, staffTariffingID) {
  const store = UB.DataStore('hr_staffTariffingPos')
  const empPosData = tarification.empPosData
  const positionDetails = []
  tarification.posData.forEach(pos => {
    const empPos = empPosData.filter(o => o.positionID === pos['mi_data_id'])
    const posDt = {}
    posDt['positionID'] = pos['mi_data_id']
    posDt['dictPositionID'] = pos.dictPositionID
    posDt['baseSum'] = pos.basepay || pos.baseSum
    posDt['dictTarifCoeffID'] = pos.dictTarifCoeffID
    posDt['employeePositionID'] = null
    posDt['dateFrom'] = pos['mi_dateFrom']
    posDt['dateTo'] = pos['mi_dateTo']
    posDt['accruals'] = pos.accruals || []
    if (empPos.length === 0) {
      posDt['isVacancy'] = 1
      posDt['mtCount'] = pos['quantity']
      positionDetails.push(posDt)
    } else {
      let posQnt = pos.quantity || 0
      empPos.forEach(emp => {
        const empDt = {}
        posQnt -= (emp.mtCount || 0)
        empDt['positionID'] = pos['mi_data_id']
        empDt['dictPositionID'] = pos.dictPositionID
        empDt['employeePositionID'] = emp.ID
        empDt['baseSum'] = emp.baseSum
        empDt['dictTarifCoeffID'] = emp.dictTarifCoeffID
        empDt['accruals'] = emp.permanentAccruals
        empDt['mtCount'] = emp.mtCount || 0
        empDt['workPlace'] = emp.workPlace
        empDt['dateFrom'] = emp.dateFrom
        empDt['dateTo'] = emp.dateTo
        positionDetails.push(empDt)
      })
      if (posQnt > 0) {
        const newDt = {}
        newDt['positionID'] = pos['mi_data_id']
        newDt['dictPositionID'] = pos.dictPositionID
        newDt['baseSum'] = pos.basepay || pos.baseSum
        newDt['dictTarifCoeffID'] = pos.dictTarifCoeffID
        newDt['employeePositionID'] = null
        newDt['dateFrom'] = pos['mi_dateFrom']
        newDt['dateTo'] = pos['mi_dateTo']
        newDt['accruals'] = pos.accruals || []
        newDt['isVacancy'] = 1
        newDt['mtCount'] = posQnt
        positionDetails.push(newDt)
      }
    }
  })
  positionDetails.forEach(pos => {
    const params = Object.assign({}, pos)
    params.accrualDt = JSON.stringify(pos.accruals)
    params.staffTariffingID = staffTariffingID
    const fund = currencyService.round(calcFund(pos['accruals'], tarification.payElIDs || []))
    params.fundMonth = currencyService.round((params.baseSum + fund) * (pos.mtCount || 0))
    delete params.accruals
    params.ID = store.generateID()
    store.run('insert', {
      execParams: params
    })
  })
}

function recalcData (recordID, staffTariffingID, cont, onDate) {
  const positionData = UB.Repository('hr_staffTariffingPos')
    .attrs(['ID', 'positionID', 'employeePositionID', 'baseSum', 'mtCount', 'dictTarifCoeffID',
      'dictTarifCoeffID.code', 'employeePositionID.employeeNumberID', 'employeePositionID.employeeID',
      'employeePositionID.employeeID.fullFIO', 'employeePositionID.accrualSum', 'workPlace',
      'employeePositionID.fundSources', 'employeePositionID.departmentID', 'dictPositionID',
      'employeePositionID.workerType', 'employeePositionID.payElID', 'employeePositionID.dictEmpCategoryID',
      'employeePositionID.employeeNumberID.description', 'employeePositionID.employeeNumberID.tabNum',
      'employeePositionID.description', 'employeePositionID.dateFrom', 'employeePositionID.dateTo',
      'isVacancy', 'accrualDt'])
    .selectById(recordID, {
      'employeePositionID.employeeNumberID': 'employeeNumberID',
      'employeePositionID.employeeID': 'employeeID',
      'employeePositionID.employeeID.fullFIO': 'employeeID.fullFIO',
      'employeePositionID.accrualSum': 'accrualSum',
      'employeePositionID.fundSources': 'fundSources',
      'employeePositionID.departmentID': 'departmentID',
      'employeePositionID.workerType': 'workerType',
      'employeePositionID.payElID': 'payElID',
      'employeePositionID.dictEmpCategoryID': 'dictEmpCategoryID',
      'employeePositionID.employeeNumberID.description': 'employeeNumberID.description',
      'employeePositionID.employeeNumberID.tabNum': 'employeeNumberID.tabNum',
      'employeePositionID.description': 'description',
      'employeePositionID.dateFrom': 'dateFrom',
      'employeePositionID.dateTo': 'dateTo'
    })

  if (!positionData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено запис. Можливо його було видалено')}>>>`)
  }

  const pos = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name',
      'mi_dateFrom', 'mi_dateTo', 'name', 'nameAddition', 'quantity', 'payElID', 'dictPositionID', 'accrualSum',
      'dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name'
    ])
    .misc({ __mip_recordhistory_all: true })
    .where('mi_data_id', '=', positionData.positionID)
    .where('staffOrderID', '=', staffTariffingID, 'order')
    .where('state', '=', 'ACTIVE', 'active')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectSingle()
  if (!pos) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено посаду. Можливо її було видалено')}>>>`)
  }

  if (!positionData.employeePositionID) {
    if (!positionData.baseSum) {
      if (positionData.dictTarifCoeffID) {
        positionData.baseSum = UB.Repository('hr_dictTarifCoeffDet')
          .attrs('accrualSum')
          .where('dictTarifCoeffID', '=', positionData.dictTarifCoeffID)
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .selectScalar() || 0
      } else {
        const dictEmpCatTarifPos = UB.Repository('hr_dictEmpCatTarifPos')
          .attrs('dictTarifCoeffID.accrualSum')
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .where('dictTarifCoeffID.dateFrom', '<=', onDate)
          .where('dictTarifCoeffID.dateTo', '>=', onDate)
          .where('dictPositionID', '=', positionData.dictPositionID)
          .where('organizationID', '=', cont.orgID, 'org')
          .where('organizationID', 'isNull', undefined, 'orgNull')
          .logic('([org] OR [orgNull])')
          .selectAsObject()
        positionData.baseSum = currencyService.round(dictEmpCatTarifPos.reduce((sum, row) => {
          sum += row['dictTarifCoeffID.accrualSum'] || 0
          return sum
        }, 0) / (dictEmpCatTarifPos.length || 1))
      }
    }
    pos.accruals = JSON.parse(positionData.accrualDt) || []
  } else {
    pos.accruals = []
  }
  pos.accrualSum = positionData.baseSum
  pos.basepay = positionData.baseSum
  pos.dictTarifCoeffID = positionData.dictTarifCoeffID
  pos['dictTarifCoeffID.code'] = positionData['dictTarifCoeffID.code']

  const empPosData = positionData.employeePositionID ? [positionData] : []

  empPosData.forEach(emp => {
    emp.ID = emp.employeePositionID
    emp.accrualSum = emp.baseSum
    emp.basepay = emp.baseSum
    emp.permanentAccruals = JSON.parse(emp.accrualDt) || []
  })

  const tarification = staffTariffingService.calculateStaffTariffing({
    cont,
    onDate,
    payElIDs: cont.payElIDs,
    posData: [pos],
    empPosData,
    skipFillPosBaseSum: true,
    skipFillEmpBaseSum: true
  })

  if (tarification.posData.length) {
    const store = UB.DataStore('hr_staffTariffingPos')
    const pos = tarification.posData[0]
    const empPos = tarification.empPosData.find(o => o.positionID === pos['mi_data_id'])

    const params = {
      ID: recordID
    }
    params['baseSum'] = pos.basepay || pos.baseSum
    params['dictTarifCoeffID'] = pos.dictTarifCoeffID
    if (!empPos) {
      params['employeePositionID'] = null
      params['accruals'] = pos.accruals || []
    } else {
      params['employeePositionID'] = empPos.ID
      params['baseSum'] = empPos.baseSum
      params['accruals'] = empPos.permanentAccruals
    }
    params.accrualDt = JSON.stringify(params.accruals)
    const fund = currencyService.round(calcFund(params['accruals'], tarification.payElIDs || []))
    params.fundMonth = currencyService.round((params.baseSum + fund) * (positionData['mtCount'] || 0))
    delete params.accruals
    store.run('update', {
      __skipSelectAfterUpdate: true,
      __skipOptimisticLock: true,
      execParams: params
    })
  }
}

me.recalcPosData = function (ctx) {
  const mParams = ctx.mParams
  const recordID = mParams.recordID || 0
  const staffTariffingID = mParams.staffTariffingID

  const staffOrder = UB.Repository(__entityName)
    .attrs('orgID', 'entryDate')
    .selectById(staffTariffingID)
  if (!staffOrder) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено документ. Можливо його було видалено')}>>>`)
  }
  const onDate = dateService.shiftDate(staffOrder['entryDate'])
  const cont = initCont(staffOrder['orgID'], onDate)
  recalcData(recordID, staffTariffingID, cont, onDate)
}

me.recalcDepData = function (ctx) {
  const mParams = ctx.mParams
  const parentUnitID = mParams.parentUnitID || 0
  const staffTariffingID = mParams.staffTariffingID

  const staffOrder = UB.Repository(__entityName)
    .attrs('orgID', 'entryDate')
    .selectById(staffTariffingID)
  if (!staffOrder) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено документ. Можливо його було видалено')}>>>`)
  }
  const onDate = dateService.shiftDate(staffOrder['entryDate'])
  const cont = initCont(staffOrder['orgID'], onDate)

  const positionData = UB.Repository('hr_staffTariffingPos')
    .attrs(['ID'])
    .where('staffTariffingID', '=', staffTariffingID)
    .whereIf(parentUnitID, 'positionID.parentUnitID', '=', parentUnitID)
    .where('positionID.staffOrderID', '=', mParams.staffTariffingID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', mParams.staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()
  positionData.forEach(row => {
    recalcData(row.ID, staffTariffingID, cont, onDate)
  })
}

me.getDetailsData = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  const parentUnitID = mParams.parentUnitID
  const isVacancy = mParams.isVacancy
  const workPlaceEnum = UB.Repository('ubm_enum')
    .attrs(['code', 'name'])
    .where('eGroup', '=', 'HR_WORKER_PLACE')
    .selectAsObject()
  const positionData = UB.Repository('hr_staffTariffingPos')
    .attrs(['ID', 'staffTariffingID', 'positionID.ID', 'positionID', 'positionID.parentUnitID', 'positionID.dictPositionID',
      'positionID.quantity', 'employeePositionID', 'baseSum', 'mtCount', 'dictTarifCoeffID', 'dateFrom', 'dateTo',
      'employeePositionID.description', 'workPlace', 'dictTarifCoeffID.code', 'accrualDt', 'mi_modifyDate',
      'positionID.liquidate', 'positionID.state', 'positionID.name', 'fundMonth', 'positionID.idxNum'])
    .where('staffTariffingID', '=', mParams.staffTariffingID)
    .whereIf(mParams.positionID, 'positionID', '=', mParams.positionID)
    .whereIf(parentUnitID, 'positionID.parentUnitID', '=', parentUnitID)
    .whereIf(isVacancy, 'isVacancy', '=', 1)
    .where('positionID.staffOrderID', '=', mParams.staffTariffingID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', mParams.staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .orderBy('positionID.idxNum')
    .orderBy(('isVacancy'))
    .selectAsObject({
      'positionID.parentUnitID': 'parentUnitID',
      'positionID.dictPositionID': 'dictPositionID',
      'positionID.quantity': 'quantity',
      'positionID.liquidate': 'liquidate',
      'positionID.state': 'state',
      'positionID.idxNum': 'idxNum'
    })

  const posUnits = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'mi_dateFrom', 'mi_dateTo', 'liquidate', 'state',
      'dictTarifCoeffID', 'dictTarifCoeffID.code', 'dictPositionID', 'name', 'quantity', 'accrualSum'])
    .where('staffOrderID', '=', mParams.staffTariffingID)
    .whereIf(parentUnitID, 'parentUnitID', '=', parentUnitID)
    .notExists(UB.Repository('hr_staffTariffingPos')
      .correlation('positionID', 'mi_data_id')
      .where('staffTariffingID', '=', mParams.staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  positionData.forEach(pos => {
    const wp = workPlaceEnum.find(o => o.code === pos.workPlace)
    pos['mi_data_id'] = pos['positionID']
    pos['positionID'] = pos['positionID.ID']
    pos['workPlaceName'] = wp ? wp['name'] : null
    const accruals = JSON.parse(pos.accrualDt) || []
    accruals.forEach(acc => {
      pos[`payEl_${acc['payElID']}`] = acc.rate ? `${currencyService.round(acc.rate)}% (${currencyService.formatAsCurrencyEx(acc.paySum || acc.planSum)})` : currencyService.formatAsCurrencyEx(acc.paySum || acc.planSum)
    })
  })
  posUnits.forEach(pos => {
    // const posItem = positionData.find(o => o['mi_data_id'] === pos['mi_data_id'])
    pos.dateFrom = pos.mi_dateFrom
    pos.positionID = pos.ID
    pos.dateTo = pos.mi_dateTo
    pos.baseSum = pos.accrualSum
    pos['positionID.name'] = pos.name
    pos.accruals = []
    delete pos.ID
    positionData.push(pos)
  })
  const totalsDep = UB.Repository('hr_staffTariffingPos')
    .attrs('sum([mtCount])', 'sum([fundMonth])')
    .where('staffTariffingID', '=', mParams.staffTariffingID)
    .where('positionID.mi_treePath', 'like', `%/${parentUnitID || 0}/%`)
    .where('positionID.staffOrderID', '=', mParams.staffTariffingID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', mParams.staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectSingle({
      'sum([mtCount])': 'mtCount',
      'sum([fundMonth])': 'fundMonth'
    })
  const mtCountVacDep = UB.Repository('hr_staffTariffingPos')
    .attrs('sum([mtCount])')
    .where('staffTariffingID', '=', mParams.staffTariffingID)
    .where('isVacancy', '=', 1)
    .where('positionID.mi_treePath', 'like', `%/${parentUnitID || 0}/%`)
    .where('positionID.staffOrderID', '=', mParams.staffTariffingID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', mParams.staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectScalar() || 0
  const mtCountVacOrg = UB.Repository('hr_staffTariffingPos')
    .attrs('sum([mtCount])')
    .where('staffTariffingID', '=', mParams.staffTariffingID)
    .where('isVacancy', '=', 1)
    .selectScalar() || 0
  const totalsOrg = UB.Repository('hr_staffTariffingPos')
    .attrs('sum([mtCount])', 'sum([fundMonth])')
    .where('staffTariffingID', '=', mParams.staffTariffingID)
    .selectSingle({
      'sum([mtCount])': 'mtCount',
      'sum([fundMonth])': 'fundMonth'
    })
  ctx.mParams.resultData = JSON.stringify(positionData)
  ctx.mParams.totals = JSON.stringify({
    mtCountDep: totalsDep.mtCount || 0,
    fundMonthDep: totalsDep.fundMonth || 0,
    mtCountOrg: totalsOrg.mtCount || 0,
    fundMonthOrg: totalsOrg.fundMonth || 0,
    mtCountVacDep,
    mtCountVacOrg
  })
}

me.calculateTariffing = function (ctx) {
  // const mParams = ctx.mParams
  // const onDate = dateService.shiftDate(mParams.onDate)
  // initTarificationData({ staffTariffingID: mParams.staffTariffingID, orgID: mParams.orgID, onDate })
}

me.savePosData = function (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_staffTariffingPos')
  const params = {
    staffTariffingID: ctx.mParams.staffTariffingID
  }
  const attrList = ['employeePositionID', 'baseSum', 'mtCount', 'dictTarifCoeffID', 'workPlace']
  attrList.forEach(attr => {
    params[attr] = execParams[attr]
  })
  const modified = Object.keys(Object(execParams.modified))
  if (modified.includes('dictTarifCoeffID') && params.dictTarifCoeffID) {
    const onDate = UB.Repository(__entityName)
      .attrs('entryDate')
      .where('ID', '=', params.staffTariffingID)
      .selectScalar()
    const tarifSum = UB.Repository('hr_dictTarifCoeffDet')
      .attrs('accrualSum')
      .where('dictTarifCoeffID', '=', params.dictTarifCoeffID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectScalar()
    if (tarifSum) {
      params.baseSum = tarifSum
    }
  }
  const instanceData = UB.Repository('hr_staffTariffingPos')
    .attrs(['staffTariffingID', 'positionID', 'dictPositionID', 'employeePositionID', 'baseSum', 'mtCount', 'isVacancy',
      'staffTariffingID.entryDate'])
    .selectById(execParams.ID || 0)
  if (modified.includes('employeePositionID') && instanceData && !instanceData.employeePositionID && params.employeePositionID) {
    const empPos = UB.Repository('hr_employeePosition')
      .attrs('mtCount', 'dictTarifCoeffID')
      .where('ID', '=', params.employeePositionID)
      .selectSingle() || {}
    params.mtCount = empPos.mtCount || 0
    params.baseSum = UB.Repository('hr_dictTarifCoeffDet')
      .attrs('accrualSum')
      .where('dictTarifCoeffID', '=', empPos.dictTarifCoeffID || params.dictTarifCoeffID)
      .where('dateFrom', '<=', instanceData['staffTariffingID.entryDate'])
      .where('dateTo', '>=', instanceData['staffTariffingID.entryDate']).limit(1)
      .selectScalar() || 0
    params.isVacancy = false
    modified.push('mtCount')
  }
  if (execParams.ID) {
    params.ID = execParams.ID
    store.run('update', {
      __skipSelectAfterUpdate: true,
      __skipOptimisticLock: true,
      execParams: params
    })
  } else {
    params.ID = store.generateID()
    store.run('insert', {
      execParams: params
    })
  }
  if (modified.includes('mtCount') && instanceData && !instanceData.isVacancy) {
    const delta = (instanceData['mtCount'] || 0) - (params['mtCount'] || 0)
    const vacancyRec = UB.Repository('hr_staffTariffingPos')
      .attrs(['positionID', 'employeePositionID', 'mtCount', 'baseSum', 'isVacancy', 'ID'])
      .where('staffTariffingID', '=', params.staffTariffingID)
      .where('positionID', '=', instanceData.positionID)
      .where('ID', '!=', execParams.ID)
      .where('isVacancy', '=', 1)
      .selectSingle()
    if (vacancyRec) {
      const newMtCount = (vacancyRec['mtCount'] || 0) + delta
      if (newMtCount > 0) {
        store.run('update', {
          __skipSelectAfterUpdate: true,
          __skipOptimisticLock: true,
          execParams: {
            ID: vacancyRec.ID,
            mtCount: newMtCount
          }
        })
      } else {
        store.run('delete', {
          __skipSelectAfterUpdate: true,
          __skipOptimisticLock: true,
          execParams: {
            ID: vacancyRec.ID
          }
        })
      }
    } else if (delta > 0) {
      const accruals = []
      const dictPosPayEl = UB.Repository('hr_dictPositionPayEl')
        .attrs('dictPositionID', 'payElID', 'valuation', 'value')
        .where('dictPositionID', '=', instanceData.dictPositionID)
        .where('dateFrom', '<=', instanceData['staffTariffingID.entryDate'])
        .where('dateTo', '>=', instanceData['staffTariffingID.entryDate'])
        .selectAsObject()
      dictPosPayEl.forEach(acc => {
        accruals.push({
          payElID: acc.payElID,
          accrualSum: acc.valuation === 'SUM' ? (acc.value || 0) : 0,
          accrualRate: acc.valuation === 'RATE' ? (acc.value || 0) : 0
        })
      })
      const newRecordID = store.generateID()
      store.run('insert', {
        execParams: {
          ID: newRecordID,
          positionID: instanceData['positionID'],
          dictPositionID: instanceData['dictPositionID'],
          dateFrom: instanceData['mi_dateFrom'],
          dateTo: instanceData['mi_dateTo'],
          staffTariffingID: instanceData['staffTariffingID'],
          accrualDt: JSON.stringify(accruals),
          isVacancy: 1,
          mtCount: delta
        }
      })
      const recalcCtx = {
        mParams: {
          recordID: newRecordID,
          staffTariffingID: params.staffTariffingID
        }
      }
      me.recalcPosData(recalcCtx)
    }
  }
  const recalcCtx = {
    mParams: {
      recordID: params.ID,
      staffTariffingID: params.staffTariffingID
    }
  }
  me.recalcPosData(recalcCtx)
}

me.copyAccrualsFromEmpPos = function (ctx) {
  const mParams = ctx.mParams
  const employeePositionID = mParams.employeePositionID
  const recordID = mParams.recordID
  const onDate = dateService.shiftDate(mParams.onDate)
  const empPos = UB.Repository('hr_employeePosition')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.fullFIO', 'positionID', 'mtCount', 'accrualSum',
      'workPlace', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'departmentID', 'dictPositionID',
      'positionID.dictStaffCatID', 'workerType', 'payElID', 'dictEmpCategoryID', 'employeeNumberID.description',
      'employeeNumberID.tabNum', 'description', 'dateFrom', 'dateTo', 'organizationID'
    ])
    .selectById(employeePositionID)
  if (!empPos) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено призначення. Можливо його було видалено')}>>>`)
  }
  const posData = UB.Repository('hr_staffTariffingPos')
    .attrs('baseSum', 'mtCount', 'dictTarifCoeffID', 'dictTarifCoeffID.code')
    .selectById(recordID)
  empPos['accrualSum'] = posData.baseSum
  empPos['mtCount'] = posData.mtCount
  empPos['dictTarifCoeffID'] = posData.dictTarifCoeffID
  empPos['dictTarifCoeffID.code'] = posData['dictTarifCoeffID.code']

  const employeeAccrual = UB.Repository('hr_employeeAccrual')
    .attrs('payElID', 'accrualSum', 'accrualRate', 'payElID.description')
    .where('employeeNumberID', '=', empPos.employeeNumberID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const permanentAccruals = []
  employeeAccrual.forEach(acc => {
    permanentAccruals.push({
      payElID: acc.payElID,
      payEl: acc['payElID.description'],
      source: 'hr_employeeAccrual',
      baseSum: acc.accrualSum || 0,
      rate: acc.accrualRate
    })
  })
  if (permanentAccruals.length) {
    const dictTarifCoeffDet = UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['dictTarifCoeffID', 'accrualSum'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()

    const tarifData = {}
    dictTarifCoeffDet.forEach(item => {
      tarifData[item.dictTarifCoeffID] = item.accrualSum || 0
    })

    const payElExperience = UB.Repository('hr_payElExperience')
      .attrs(['payElID', 'years', 'months', 'rate'])
      .where('payElID', 'in', permanentAccruals.map(o => o.payElID))
      .orderBy('payElID')
      .orderBy('years', 'desc')
      .orderBy('months', 'desc')
      .selectAsObject()

    const dictSalaryRank = UB.Repository('hr_dictSalaryRank')
      .attrs('dictRankID', 'paySum')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()

    const cont = {
      orgID: empPos.organizationID,
      payEl: payElService.getPayElEntrySum(),
      payElExperience,
      dictSalaryRank,
      tarifData
    }

    permanentAccruals.forEach(pAccr => {
      const planSum = employeeService.getPlanSum(onDate, cont, pAccr, empPos, permanentAccruals, [], true)
      pAccr.paySum = currencyService.round(planSum)
    })
  }
  const payElIDs = UB.Repository('hr_dictTariffingPayEl')
    .attrs('payElID')
    .where('organizationID', 'isNull', undefined, 'orgIsNull')
    .where('organizationID', '=', empPos.organizationID, 'org')
    .groupBy('payElID')
    .logic('([org] OR [orgIsNull])')
    .selectAsArrayOfValues()
  const fund = currencyService.round(calcFund(permanentAccruals, payElIDs || []))
  const fundMonth = currencyService.round((empPos.baseSum + fund) * (empPos.mtCount || 0))

  const store = UB.DataStore('hr_staffTariffingPos')
  store.run('update', {
    __skipSelectAfterUpdate: true,
    __skipOptimisticLock: true,
    execParams: {
      ID: recordID,
      accrualDt: JSON.stringify(permanentAccruals),
      fundMonth
    }
  })
}

me.savePosAccruals = function (ctx) {
  const mParams = ctx.mParams
  const posData = UB.Repository('hr_staffTariffingPos')
    .attrs('employeePositionID', 'staffTariffingID')
    .selectById(mParams.recordID)
  if (!posData) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено запис. Можливо його було видалено')}>>>`)
  }
  const accrualData = JSON.parse(mParams.data) || []
  const accrualDt = []
  accrualData.forEach(acc => {
    accrualDt.push({
      payElID: acc.payElID,
      baseSum: acc.accrualSum,
      rate: acc.accrualRate,
      payEl: acc['payElID.description']
    })
  })
  const store = UB.DataStore('hr_staffTariffingPos')
  store.run('update', {
    __skipSelectAfterUpdate: true,
    __skipOptimisticLock: true,
    execParams: {
      ID: mParams.recordID,
      accrualDt: JSON.stringify(accrualDt)
    }
  })
  const recalcCtx = {
    mParams: {
      recordID: mParams.recordID,
      staffTariffingID: posData.staffTariffingID
    }
  }
  me.recalcPosData(recalcCtx)
}

me.getReportData = function (ctx) {
  const execParams = ctx.mParams.execParams

  const staffTariffing = UB.Repository(__entityName)
    .attrs('orgID', 'entryDate')
    .selectById(execParams.instanceID)

  const orgID = staffTariffing.orgID || 0
  const onDate = dateService.shiftDate(staffTariffing.entryDate)
  const depFilter = execParams.departmentID || execParams.childDepID || ''
  const isOrgPlan = ctx.mParams.isOrgPlan
  const onDateReport = execParams.onDateReport ? dateService.shiftDate(execParams.onDateReport) : execParams.onDateReport

  const repCode = '07'
  const repSetElements = UB.Repository('hr_repSetElement')
    .attrs(['elementID', 'repSetParamID.code'])
    .where('repSetParamID.dictStReportID.code', '=', repCode)
    .where('dateFromNotEmpty', '<=', onDate)
    .where('dateToNotEmpty', '>=', onDate)
    .where('repSetParamID.dateFrom', '<=', onDate)
    .where('repSetParamID.dateTo', '>=', onDate)
    .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'repSetParamID.code': 'reportCode'
    })

  const reportPayElIDs = repSetElements.map(o => o.elementID)

  if (!reportPayElIDs.length) {
    reportPayElIDs.push(0)
  }

  const posVacData = !onDateReport && isOrgPlan ? UB.Repository('hr_staffTariffingPos')
    .attrs(['positionID', 'baseSum'])
    .where('staffTariffingID', '=', execParams.instanceID)
    .where('isVacancy', '=', 1)
    .whereIf(depFilter, 'positionID.mi_treePath', 'like', `%/${depFilter}/%`)
    .where('positionID.staffOrderID', '=', execParams.instanceID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', execParams.instanceID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject() : []

  const posData = !onDateReport ? UB.Repository('hr_staffTariffingPos')
    .attrs(['positionID', 'positionID.ID', 'positionID.parentUnitID', 'positionID.idxNum', 'dictPositionID.fullName',
      'dictPositionID.name', 'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.name', 'positionID.nameAddition',
      'positionID.quantity', 'positionID.payElID', 'dictPositionID', 'baseSum', 'positionID.dictStaffCatID',
      'positionID.dictStaffCatID.code', 'positionID.dictStaffCatID.name', 'dictTarifCoeffID', 'dictTarifCoeffID.code',
      'accrualDt', 'positionID.dictStaffSubCatID', 'positionID.dictPositionID.dictProfessionID.code', 'mtCount', 'isVacancy'
    ])
    .where('staffTariffingID', '=', execParams.instanceID)
    .whereIf(depFilter, 'positionID.mi_treePath', 'like', `%/${depFilter}/%`)
    .where('positionID.staffOrderID', '=', execParams.instanceID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', execParams.instanceID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject({
      'positionID.parentUnitID': 'parentUnitID',
      'positionID.idxNum': 'idxNum',
      'positionID.mi_dateFrom': 'mi_dateFrom',
      'positionID.mi_dateTo': 'mi_dateTo',
      'positionID.name': 'name',
      'positionID.nameAddition': 'nameAddition',
      'positionID.quantity': 'quantity',
      'positionID.payElID': 'payElID',
      'positionID.dictStaffCatID': 'dictStaffCatID',
      'positionID.dictStaffCatID.code': 'dictStaffCatID.code',
      'positionID.dictStaffCatID.name': 'dictStaffCatID.name',
      'positionID.dictStaffSubCatID': 'dictStaffSubCatID',
      'positionID.dictPositionID.dictProfessionID.code': 'profCode'
    }) : []
  posData.forEach(row => {
    row['mi_data_id'] = row.positionID
    row.ID = row['positionID.ID']
    if (isOrgPlan) {
      row.quantity = row.mtCount
      const posVacItem = posVacData.find(o => o.positionID === row.positionID)
      if (posVacItem) {
        row.baseSum = posVacItem.baseSum
      }
    }
    row.accrualSum = row.baseSum
    row.basepay = row.baseSum
    row.accruals = JSON.parse(row.accrualDt) || []
    row['tarifCode'] = row['dictTarifCoeffID.code']
  })

  const empPosData = !onDateReport ? UB.Repository('hr_staffTariffingPos')
    .attrs(['employeePositionID', 'employeePositionID.employeeNumberID', 'employeePositionID.employeeID',
      'employeePositionID.employeeID.fullFIO', 'positionID', 'mtCount', 'baseSum',
      'workPlace', 'workPlace.name', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'employeePositionID.departmentID',
      'dictPositionID', 'positionID.dictStaffCatID', 'employeePositionID.workerType', 'employeePositionID.payElID',
      'employeePositionID.dictEmpCategoryID', 'employeePositionID.employeeNumberID.description',
      'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.description', 'employeePositionID.dateFrom',
      'employeePositionID.dateTo', 'accrualDt', 'employeePositionID.dictEmpCategoryID.name'
    ])
    .where('staffTariffingID', '=', execParams.instanceID)
    .where('employeePositionID', 'isNotNull')
    .whereIf(depFilter, 'positionID.mi_treePath', 'like', `%/${depFilter}/%`)
    .where('positionID.staffOrderID', '=', execParams.instanceID, 'order')
    .where('positionID.state', '=', 'ACTIVE', 'active')
    .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'positionID')
      .where('staffOrderID', '=', execParams.instanceID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject({
      'employeePositionID.employeeNumberID': 'employeeNumberID',
      'employeePositionID.employeeID': 'employeeID',
      'employeePositionID.employeeID.fullFIO': 'fullFIO',
      'employeePositionID.departmentID': 'departmentID',
      'positionID.dictStaffCatID': 'dictStaffCatID',
      'employeePositionID.workerType': 'workerType',
      'employeePositionID.payElID': 'payElID',
      'employeePositionID.dictEmpCategoryID': 'dictEmpCategoryID',
      'employeePositionID.employeeNumberID.description': 'employeeNumberID.description',
      'employeePositionID.employeeNumberID.tabNum': 'employeeNumberID.tabNum',
      'employeePositionID.description': 'description',
      'employeePositionID.dateFrom': 'dateFrom',
      'employeePositionID.dateTo': 'dateTo',
      'dictTarifCoeffID.code': 'tarifCode',
      'employeePositionID.dictEmpCategoryID.name': 'dictEmpCategoryName'
    }) : []

  empPosData.forEach(row => {
    row.ID = row.employeePositionID
    row.accrualSum = row.baseSum
    row.basepay = row.baseSum
    row.permanentAccruals = JSON.parse(row.accrualDt) || []
  })

  const cont = initCont(orgID, onDateReport ? onDateReport : onDate, /*onDateReport ? undefined : */ reportPayElIDs)
  const result = staffTariffingService.calculateStaffTariffing({
    cont,
    onDate: onDateReport ? onDateReport : onDate,
    depFilter,
    posData: onDateReport ? null : posData,
    empPosData: onDateReport ? null : empPosData,
    payElIDs: onDateReport ? cont.payElIDs : reportPayElIDs,
    dictFundSourceID: null,
    skipCalcAccruals: onDateReport ? false: true,
    skipFillPosBaseSum: onDateReport ? false: true,
    skipFillEmpBaseSum: onDateReport ? false: true
  })

  result.repSetElements = repSetElements
  result.payElExpData = cont.payElExperience
  result.payElData = cont.payEl

  ctx.mParams.resultData = JSON.stringify(result)
  return result
}

me.checkData = function (ctx) {
  const staffTariffingID = ctx.mParams.staffTariffingID
  const resultData = {
    check1data: [],
    check2data: [],
    check3data: []
  }

  const staffTariffing = UB.Repository(__entityName)
    .attrs('orgID', 'entryDate')
    .selectById(staffTariffingID)

  const onDate = dateService.shiftDate(staffTariffing.entryDate)

  let orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath', 'treePath'])
    .where('orgID', '=', staffTariffing['orgID'])
    .where('liquidate', '=', 0)
    .where('state', '=', 'ACTIVE', 'active')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('liquidate', '=', 0, 'liqu')
    .where('staffOrderID', '=', staffTariffingID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTariffingID)
      .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
    .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()

  const workPlaceEnum = UB.Repository('ubm_enum')
    .attrs(['code', 'name'])
    .where('eGroup', '=', 'HR_WORKER_PLACE')
    .selectAsObject()

  // Список працівників більше ніж на 1,5 ставки
  let empPosData = UB.Repository('hr_staffTariffingPos')
    .attrs(['employeePositionID.employeeID', 'SUM([mtCount])'])
    .where('staffTariffingID', '=', staffTariffingID)
    .where('employeePositionID', 'isNotNull')
    .groupBy(['employeePositionID.employeeID'])
    .selectAsObject({
      'SUM([mtCount])': 'mtCount',
      'employeePositionID.employeeID': 'employeeID'
    })
  const errEmpPos1 = []
  empPosData.forEach(row => {
    if (row['mtCount'] > 1.5) {
      errEmpPos1.push(row['employeeID'])
    }
  })
  if (errEmpPos1.length) {
    empPosData = UB.Repository('hr_staffTariffingPos')
      .attrs(['employeePositionID.employeeID', 'employeePositionID.employeeNumberID.tabNum',
        'employeePositionID.employeeID.fullFIO', 'positionID', 'mtCount', 'workPlace',
        'dictTarifCoeffID.code'
      ])
      .where('staffTariffingID', '=', staffTariffingID)
      .where('employeePositionID', 'isNotNull')
      .where('employeePositionID.employeeID', 'in', errEmpPos1)
      .orderBy('employeePositionID.employeeID.fullFIO')
      .orderBy('employeePositionID.employeeNumberID.tabNum')
      .selectAsObject({
        'employeePositionID.employeeID': 'employeeID',
        'employeePositionID.employeeNumberID.tabNum': 'tabNum',
        'employeePositionID.employeeID.fullFIO': 'fullFIO'
      })
    empPosData.forEach(row => {
      const pos = orgStruct.find(o => o['mi_data_id'] === row.positionID)
      row.posName = pos ? pos.name : ''
      const dep = pos ? orgStruct.find(o => o['mi_data_id'] === pos.parentUnitID) : null
      row.depName = dep ? dep.name : ''
      const wp = workPlaceEnum.find(o => o.code === row['workPlace'])
      row.workPlace = wp ? wp.name : ''
      row['tarifCode'] = row['dictTarifCoeffID.code']
      resultData.check1data.push(row)
    })
  }

  // Список працівників більше ніж на 1 ставку основного місця роботи
  empPosData = UB.Repository('hr_staffTariffingPos')
    .attrs(['employeePositionID.employeeID', 'SUM([mtCount])'])
    .where('staffTariffingID', '=', staffTariffingID)
    .where('employeePositionID', 'isNotNull')
    .where('workPlace', '=', '1')
    .groupBy(['employeePositionID.employeeID'])
    .selectAsObject({
      'SUM([mtCount])': 'mtCount',
      'employeePositionID.employeeID': 'employeeID'
    })
  const errEmpPos2 = []
  empPosData.forEach(row => {
    if (row['mtCount'] > 1) {
      errEmpPos2.push(row['employeeID'])
    }
  })
  if (errEmpPos2.length) {
    empPosData = UB.Repository('hr_staffTariffingPos')
      .attrs(['employeePositionID.employeeID', 'employeePositionID.employeeNumberID.tabNum',
        'employeePositionID.employeeID.fullFIO', 'positionID', 'mtCount', 'workPlace',
        'dictTarifCoeffID.code'
      ])
      .where('staffTariffingID', '=', staffTariffingID)
      .where('employeePositionID', 'isNotNull')
      .where('employeePositionID.employeeID', 'in', errEmpPos2)
      .where('workPlace', '=', '1')
      .orderBy('employeePositionID.employeeID.fullFIO')
      .orderBy('employeePositionID.employeeNumberID.tabNum')
      .selectAsObject({
        'employeePositionID.employeeID': 'employeeID',
        'employeePositionID.employeeNumberID.tabNum': 'tabNum',
        'employeePositionID.employeeID.fullFIO': 'fullFIO'
      })
    empPosData.forEach(row => {
      const pos = orgStruct.find(o => o['mi_data_id'] === row.positionID)
      row.posName = pos ? pos.name : ''
      const dep = pos ? orgStruct.find(o => o['mi_data_id'] === pos.parentUnitID) : null
      row.depName = dep ? dep.name : ''
      const wp = workPlaceEnum.find(o => o.code === row['workPlace'])
      row.workPlace = wp ? wp.name : ''
      row['tarifCode'] = row['dictTarifCoeffID.code']
      resultData.check2data.push(row)
    })
  }
  const dictEmpCatTarifPos = UB.Repository('hr_dictEmpCatTarifPos')
    .attrs('dictTarifCoeffID', 'dictEmpCategoryID', 'dictPositionID')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('organizationID', '=', staffTariffing.orgID, 'org')
    .where('organizationID', 'isNull', undefined, 'orgNull')
    .logic('([org] OR [orgNull])')
    .selectAsObject()

  empPosData = UB.Repository('hr_staffTariffingPos')
    .attrs(['employeePositionID.employeeID', 'employeePositionID.employeeNumberID.tabNum',
      'employeePositionID.employeeID.fullFIO', 'positionID', 'mtCount', 'workPlace',
      'dictTarifCoeffID', 'dictPositionID', 'dictTarifCoeffID.code',
      'employeePositionID.dictEmpCategoryID', 'employeePositionID.dictEmpCategoryID.name'
    ])
    .where('staffTariffingID', '=', staffTariffingID)
    .where('employeePositionID', 'isNotNull')
    .where('workPlace', '=', '1')
    .orderBy('employeePositionID.employeeID.fullFIO')
    .orderBy('employeePositionID.employeeNumberID.tabNum')
    .selectAsObject({
      'employeePositionID.employeeID': 'employeeID',
      'employeePositionID.employeeNumberID.tabNum': 'tabNum',
      'employeePositionID.employeeID.fullFIO': 'fullFIO',
      'employeePositionID.dictEmpCategoryID': 'dictEmpCategoryID',
      'employeePositionID.dictEmpCategoryID.name': 'dictEmpCategoryID.name'
    })

  empPosData.forEach(row => {
    const empCatTarifPos = dictEmpCatTarifPos.filter(o => o.dictPositionID === row.dictPositionID && o.dictEmpCategoryID === row.dictEmpCategoryID)
    const tarifItem = empCatTarifPos.find(o => o.dictTarifCoeffID === row.dictTarifCoeffID)
    if (!empCatTarifPos.length || !tarifItem) {
      const pos = orgStruct.find(o => o['mi_data_id'] === row.positionID)
      row.remark = empCatTarifPos.length ? '' : UB.i18n('Немає інформації в довіднику')
      row.posName = pos ? pos.name : ''
      const dep = pos ? orgStruct.find(o => o['mi_data_id'] === pos.parentUnitID) : null
      row.depName = dep ? dep.name : ''
      const wp = workPlaceEnum.find(o => o.code === row['workPlace'])
      row.workPlace = wp ? wp.name : ''
      row['tarifCode'] = row['dictTarifCoeffID.code']
      row['dictEmpCategoryName'] = row['dictEmpCategoryID.name']
      resultData.check3data.push(row)
    }
  })
  ctx.mParams.resultData = JSON.stringify(resultData)
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams

  const entryDate = UB.Repository(__entityName)
    .attrs('entryDate')
    .where('ID', '=', execParams.ID)
    .selectScalar()

  const entryOrderID = execParams.ID
  const errorMessages = []

  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')

  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_dateTo', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat',
      'parentUnitID', 'mi_data_id', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', execParams.ID)
    .joinCondition('priorID.nextID.mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'fullName', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_data_id', 'mi_dateFrom', 'mi_dateTo', 'parentUnitID', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', execParams.ID)
    .joinCondition('priorID.nextID.mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  const dateFrom = dateService.shiftDate(entryDate)
  const dateTo = dateService.addDays(dateFrom, -1)

  depBuilder.forEach(row => {
    if (!row['priorID.nextID']) {
      if (row.priorID) {
        if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
          if (row.liquidate) {
            depStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.priorID,
                mi_dateTo: row['priorID.mi_dateFrom'],
                changeStaffOrderID: execParams.ID,
                nextID: row.ID
              }
            })
          } else {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']).getTime() === dateFrom.getTime()) {
              depStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID,
                  state: 'CHANGES'
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено більш ранньою датою`, row.name))
            }
          }
        } else if (!errorMessages.length) {
          const updParams = {
            ID: row.priorID,
            mi_dateTo: dateTo,
            changeStaffOrderID: execParams.ID,
            nextID: row.ID
          }
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: updParams
          })
        }
      }
      if (!errorMessages.length) {
        if ((dateService.shiftDate(row.mi_dateTo) > dateFrom || row.liquidate)) {
          const updParams = {
            ID: row.ID,
            state: 'ACTIVE',
            entryOrderID: entryOrderID
          }
          updParams.mi_dateFrom = dateFrom
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: Object.assign(updParams, row.liquidate ? { mi_dateTo: dateFrom } : {})
          })
          orderService.updateDepartment(row)
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено іншим наказом {1}`, row.name, row['priorID.nextID.entryOrderID.description']))
    }
  })
  posBuilder.forEach(row => {
    if (!row['priorID.nextID']) {
      if (row.priorID) {
        if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
          if (row.liquidate) {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']) < dateFrom) {
              posStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Посаду {0} було створено більш пізньою датою {1}`, row.fullName, dateService.formatDate(row['priorID.mi_dateFrom'])))
            }
          } else {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']).getTime() === dateFrom.getTime()) {
              posStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID,
                  state: 'CHANGES'
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Посаду {0} вже було змінено більш ранньою датою`, row.fullName))
            }
          }
        } else if (!errorMessages.length) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: dateTo,
              changeStaffOrderID: execParams.ID,
              nextID: row.ID
            }
          })
        }
      }
      if (!errorMessages.length) {
        if (dateService.shiftDate(row.mi_dateTo) > dateFrom || row.liquidate) {
          if (row.liquidate) {
            const allowPostSettingsOrg = UB.Repository('ac_settingsOrg')
              .attrs(['value'])
              .where('organizationID', '=', row.orgID)
              .where('[constantID.code]', '=', 'allowDelBusyPositions')
              .selectScalar()

            const employeePosition = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'employeeID.fullFIO'])
              .where('positionID', '=', row.mi_data_id)
              .where('dateTo', '>', dateFrom)
              .selectAsObject()

            if (!allowPostSettingsOrg) {
              employeePosition.forEach(empPos => {
                errorMessages.push(UB.i18n(`Для посади {0} існує діюче призначення {1}`, row.fullName, empPos['employeeID.fullFIO']))
              })
            }
          }
          if (!errorMessages.length) {
            const updParams = {
              ID: row.ID,
              state: 'ACTIVE',
              entryOrderID: entryOrderID
            }
            updParams.mi_dateFrom = dateFrom
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: Object.assign(updParams, row.liquidate ? { mi_dateTo: dateFrom } : {})
            })
            orderService.updatePosition(row)
          }
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Посаду {0} вже було змінено іншим наказом {1}`, row.fullName, row['priorID.nextID.entryOrderID.description']))
    }
  })
  depStore.freeNative()
  posStore.freeNative()
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }
}

me.doCancelPosting = function (ctx) {
  const execParams = ctx.mParams.execParams

  const errorMessages = []

  const orderEntryDate = UB.Repository(__entityName)
    .attrs('entryDate')
    .where('ID', '=', execParams.ID)
    .selectScalar()

  const entryDate = dateService.shiftDate(orderEntryDate)

  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')
  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'nextID', 'nextID.entryOrderID.description', 'state'])
    .where('staffOrderID', '=', execParams.ID)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'priorID', 'nextID', 'nextID.entryOrderID.description', 'state', 'liquidate'])
    .where('staffOrderID', '=', execParams.ID)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  const maxDate = dateService.maxDate()
  depBuilder.forEach(row => {
    if (!row.nextID) {
      if (!errorMessages.length) {
        if (row.priorID) {
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: maxDate,
              changeStaffOrderID: null,
              nextID: null
            }
          })
        }

        depStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            mi_dateFrom: entryDate,
            entryOrderID: null,
            state: 'NEW'
          }
        })
      }
    } else {
      errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено іншим наказом {1}`, row.name, row['nextID.entryOrderID.description']))
    }
  })
  posBuilder.forEach(row => {
    if (!row.nextID) {
      if (!errorMessages.length) {
        if (row.priorID) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: maxDate,
              changeStaffOrderID: null,
              nextID: null,
              state: 'ACTIVE'
            }
          })
        }
        if (row.liquidate) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              mi_dateTo: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        } else {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Посаду {0} вже було змінено іншим наказом {1}`, row.name, row['nextID.entryOrderID.description']))
    }
  })
  depStore.freeNative()
  posStore.freeNative()
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }
}

me.getStaffTariffingMoveEmployees = function (ctx) {
  const resultData = []
  const staffTariffingID = ctx.mParams.staffTariffingID
  if (staffTariffingID) {
    const staffTariffing = UB.Repository('hr_staffTariffing')
      .attrs('entryDate', 'orgID')
      .selectById(staffTariffingID)
    const entryDate = dateService.shiftDate(staffTariffing['entryDate'])

    const orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath', 'treePath'])
      .where('orgID', '=', staffTariffing['orgID'])
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE', 'active')
      .where('mi_dateFrom', '<=', entryDate, 'dateFrom')
      .where('mi_dateTo', '>=', entryDate, 'dateTo')
      .selectAsObject()

    const empPosData = UB.Repository('hr_staffTariffingPos')
      .attrs(['employeePositionID', 'employeePositionID.employeeNumberID', 'employeePositionID.employeeID',
        'employeePositionID.employeeID.fullFIO', 'positionID', 'mtCount', 'baseSum',
        'workPlace', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'dictPositionID',
        'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.accrualSum',
        'employeePositionID.mtCount', 'employeePositionID.dictTarifCoeffID',
        'employeePositionID.positionID', 'employeePositionID.departmentID'
      ])
      .where('staffTariffingID', '=', staffTariffingID)
      .where('employeePositionID', 'isNotNull')
      .where('employeePositionID.isActive', '=', 1)
      .where('employeePositionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    empPosData.forEach(row => {
      if (row['accrualSum'] !== row['employeePositionID.accrualSum'] || row['mtCount'] !== row['employeePositionID.mtCount'] || row['dictTarifCoeffID'] !== row['employeePositionID.dictTarifCoeffID']) {
        const pos = orgStruct.find(o => o['mi_data_id'] === row.positionID)
        const dep = pos ? orgStruct.find(o => o['mi_data_id'] === pos.parentUnitID && o['mi_unityEntity'] === 'hr_department') : null
        resultData.push({
          employeeNumberID: row['employeePositionID.employeeNumberID'],
          employeeID: row['employeePositionID.employeeID'],
          'employeePositionID.employeeID.fullFIO': row['employeePositionID.employeeID.fullFIO'],
          'employeeNumberID.tabNum': row['employeePositionID.employeeNumberID.tabNum'],
          employeePositionID: row['employeePositionID'],
          posName: pos ? pos.name : '',
          depName: dep ? dep.name : '',
          positionID: pos ? pos['ID'] : null,
          departmentID: dep ? dep['ID'] : null,
          dictPositionID: row['dictPositionID'],
          dictTarifCoeffID: row['dictTarifCoeffID'],
          'dictTarifCoeffID.code': row['dictTarifCoeffID.code'],
          mtCount: row['mtCount'],
          accrualSum: row['baseSum'],
          'employeePositionID.accrualSum': row['employeePositionID.accrualSum']
        })
      }
    })
  }
  ctx.mParams.resultData = JSON.stringify(resultData)
}
