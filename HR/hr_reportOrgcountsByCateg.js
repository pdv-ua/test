const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const positionVac = global['hr_positionVac']
const storeService = require('../AC/modules/dataServices/localStoreService')
const dataService = require('../AC/modules/dataServices/dataService')
const dateService = require('../AC/modules/dataServices/dateService')
const reportService = require('../HR/modules/reportService')
const ident = '....'

me.entity.addMethod('selectEmpPosData')
me.entity.addMethod('getGrouppedByParentUnitData')
me.entity.addMethod('getGrouppedByParentUnitAndCategData')

me.selectEmpPosData = function (ctx) {
  let mParams = ctx.mParams
  let isCateg = mParams.isCateg
  let oldFieldList = _.clone(ctx.mParams.fieldList)
  let data = isCateg ? me.getEmpPosData(ctx) : me.getEmpPosDataWithTotals(ctx)
  mParams.fieldList = oldFieldList
  mParams.whereList = {}
  data = storeService.formDataByFieldList(data, oldFieldList)
  storeService.initArrayToStore(ctx.dataStore, data, mParams)
  ctx.inherited = false
  return true
}

me.getGrouppedByParentUnitData = ctx => {
  ctx.mParams.resultData = JSON.stringify(me.getGrouppedByParentUnit(ctx))
}

me.getGrouppedByParentUnitAndCategData = ctx => {
  ctx.mParams.resultData = JSON.stringify(me.getGrouppedByParentUnitAndCateg(ctx))
}

me.getEmpPosData = ctx => {
  let mParams = ctx.mParams
  let notZeroFields = mParams.notZeroFields
  let posData = me.getData(ctx)
  if (notZeroFields) {
    if (notZeroFields.includes('quantity')) {
      posData = posData.filter(item => item.quantity)
    }
    if (notZeroFields.includes('vacCount')) {
      posData = posData.filter(item => item.vacCount)
    }
    if (notZeroFields.includes('mtCount')) {
      posData = posData.filter(item => item.mtCount)
    }
  }
  return posData
}

me.getEmpPosDataWithTotals = ctx => {
  let res = []
  const mParams = ctx.mParams
  const orgs = dataService.getNumberArray(mParams.orgs)
  const depts = dataService.getNumberArray(mParams.depts)
  const staffTableID = mParams.staffTableID
  const onDate = mParams.onDate ? new Date(mParams.onDate) : new Date()
  let orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['mi_data_id', 'parentUnitID', 'idxNum', 'code', 'fullName', 'mi_unityEntity'])
    .where('orgID', 'in', orgs)
    .where('state', '=', 'ACTIVE', 'stateAct')
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
  if (staffTableID) {
    orgStruct = orgStruct.where('staffOrderID', '=', staffTableID || 0, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notOtherThanOrder')
      .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order])')
  }
  orgStruct = orgStruct.orderBy('idxNum')
    .selectAsObject()
  let posData = me.getData(ctx)
  if (orgStruct.length && posData.length) {
    let rootUnitID = (depts.length && depts[0] !== 0) ? depts[0] : orgs[0]
    let rootUnit = orgStruct.find(orgItem => orgItem.mi_data_id === rootUnitID)
    let totals
    if (rootUnit) {
      totals = {
        ID: rootUnit.mi_data_id,
        idxNum: null,
        name: `${rootUnit.code} ${rootUnit.fullName}`.toUpperCase(),
        shortFIO: null,
        quantity: 0,
        mtCount: 0,
        vacCount: 0,
        fundSum: 0,
        employeeNumberID: null,
        parentUnitID: rootUnit.parentUnitID,
        psCategory: null,
        parentIdxNum: rootUnit.idxNum
      }
      res.push(totals)
    }
    let isTotals = !!totals
    let rootPos = posData.filter(pos => pos.parentUnitID === rootUnitID)
    let orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === rootUnitID)
    if (rootPos && rootPos.length) {
      let rootPosObjs = me.getPosItems(rootPos, rootUnitID)
      res.push(...rootPosObjs.pos)
      if (isTotals) {
        totals.quantity += rootPosObjs.quantity || 0
        totals.mtCount += rootPosObjs.mtCount || 0
        totals.vacCount += rootPosObjs.vacCount || 0
        totals.fundSum += rootPosObjs.fundSum || 0
      }
    }
    for (let i1 = 0; i1 < orgStruct1.length; i1++) {
      let orgUnit1 = orgStruct1[i1]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      let posItems1 = posData.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
      if (orgUnits1.length || posItems1.length) {
        let posItemObjs1 = me.getPosItems(posItems1, orgUnit1.mi_data_id)
        let totals1 = {
          ID: orgUnit1.mi_data_id,
          idxNum: null,
          name: `${ident.repeat(1)}${orgUnit1.code} ${orgUnit1.fullName}`,
          shortFIO: null,
          quantity: posItemObjs1.quantity,
          mtCount: posItemObjs1.mtCount,
          vacCount: posItemObjs1.vacCount,
          fundSum: posItemObjs1.fundSum,
          employeeNumberID: null,
          parentUnitID: orgUnit1.parentUnitID,
          psCategory: null,
          parentIdxNum: orgUnit1.idxNum
        }
        res.push(totals1)
        res.push(...posItemObjs1.pos)
        for (let i2 = 0; i2 < orgUnits1.length; i2++) {
          let orgUnit2 = orgUnits1[i2]
          let orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          let posItems2 = posData.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
          if (orgUnits2.length || posItems2.length) {
            let posItemObjs2 = me.getPosItems(posItems2, orgUnit2.mi_data_id)
            let totals2 = {
              ID: orgUnit2.mi_data_id,
              idxNum: null,
              name: `${ident.repeat(2)}${orgUnit2.code} ${orgUnit2.fullName}`,
              shortFIO: null,
              quantity: posItemObjs2.quantity,
              mtCount: posItemObjs2.mtCount,
              vacCount: posItemObjs2.vacCount,
              fundSum: posItemObjs2.fundSum,
              employeeNumberID: null,
              parentUnitID: orgUnit2.parentUnitID,
              psCategory: null,
              parentIdxNum: orgUnit2.idxNum
            }
            res.push(totals2)
            res.push(...posItemObjs2.pos)
            for (let i3 = 0; i3 < orgUnits2.length; i3++) {
              let orgUnit3 = orgUnits2[i3]
              let orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              let posItems3 = posData.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
              if (orgUnits3.length || posItems3.length) {
                let posItemObjs3 = me.getPosItems(posItems3, orgUnit3.mi_data_id)
                let totals3 = {
                  ID: orgUnit3.mi_data_id,
                  idxNum: null,
                  name: `${ident.repeat(3)}${orgUnit3.code} ${orgUnit3.fullName}`,
                  shortFIO: null,
                  quantity: posItemObjs3.quantity,
                  mtCount: posItemObjs3.mtCount,
                  vacCount: posItemObjs3.vacCount,
                  fundSum: posItemObjs3.fundSum,
                  employeeNumberID: null,
                  parentUnitID: orgUnit3.parentUnitID,
                  psCategory: null,
                  parentIdxNum: orgUnit3.idxNum
                }
                res.push(totals3)
                res.push(...posItemObjs3.pos)
                for (let i4 = 0; i4 < orgUnits3.length; i4++) {
                  let orgUnit4 = orgUnits3[i4]
                  let orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  let posItems4 = posData.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                  if (orgUnits4.length || posItems4.length) {
                    let posItemObjs4 = me.getPosItems(posItems4, orgUnit4.mi_data_id)
                    let totals4 = {
                      ID: orgUnit4.mi_data_id,
                      idxNum: null,
                      name: `${ident.repeat(4)}${orgUnit4.code} ${orgUnit4.fullName}`,
                      shortFIO: null,
                      quantity: posItemObjs4.quantity,
                      mtCount: posItemObjs4.mtCount,
                      vacCount: posItemObjs4.vacCount,
                      fundSum: posItemObjs4.fundSum,
                      employeeNumberID: null,
                      parentUnitID: orgUnit4.parentUnitID,
                      psCategory: null,
                      parentIdxNum: orgUnit4.idxNum
                    }
                    res.push(totals4)
                    res.push(...posItemObjs4.pos)
                    for (let i5 = 0; i5 < orgUnits4.length; i5++) {
                      let orgUnit5 = orgUnits4[i5]
                      let orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      let posItems5 = posData.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                      if (orgUnits5.length || posItems5.length) {
                        let posItemObjs5 = me.getPosItems(posItems5, orgUnit5.mi_data_id)
                        let totals5 = {
                          ID: orgUnit5.mi_data_id,
                          idxNum: null,
                          name: `${ident.repeat(5)}${orgUnit5.code} ${orgUnit5.fullName}`,
                          shortFIO: null,
                          quantity: posItemObjs5.quantity,
                          mtCount: posItemObjs5.mtCount,
                          vacCount: posItemObjs5.vacCount,
                          fundSum: posItemObjs5.fundSum,
                          employeeNumberID: null,
                          parentUnitID: orgUnit5.parentUnitID,
                          psCategory: null,
                          parentIdxNum: orgUnit5.idxNum
                        }
                        res.push(totals5)
                        res.push(...posItemObjs5.pos)
                        for (let i6 = 0; i6 < orgUnits5.length; i6++) {
                          let orgUnit6 = orgUnits5[i6]
                          let orgUnits6 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          let posItems6 = posData.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                          if (orgUnits6.length || posItems6.length) {
                            let posItemObjs6 = me.getPosItems(posItems6, orgUnit6.mi_data_id)
                            let totals6 = {
                              ID: orgUnit6.mi_data_id,
                              idxNum: null,
                              name: `${ident.repeat(6)}${orgUnit6.code} ${orgUnit6.fullName}`,
                              shortFIO: null,
                              quantity: posItemObjs6.quantity,
                              mtCount: posItemObjs6.mtCount,
                              vacCount: posItemObjs6.vacCount,
                              fundSum: posItemObjs6.fundSum,
                              employeeNumberID: null,
                              parentUnitID: orgUnit6.parentUnitID,
                              psCategory: null,
                              parentIdxNum: orgUnit6.idxNum
                            }
                            res.push(totals6)
                            res.push(...posItemObjs6.pos)

                            totals5.quantity += totals6.quantity || 0
                            totals5.mtCount += totals6.mtCount || 0
                            totals5.vacCount += totals6.vacCount || 0
                            totals5.fundSum += totals6.fundSum || 0
                          }
                        }
                        totals4.quantity += totals5.quantity || 0
                        totals4.mtCount += totals5.mtCount || 0
                        totals4.vacCount += totals5.vacCount || 0
                        totals4.fundSum += totals5.fundSum || 0
                      }
                    }
                    totals3.quantity += totals4.quantity || 0
                    totals3.mtCount += totals4.mtCount || 0
                    totals3.vacCount += totals4.vacCount || 0
                    totals3.fundSum += totals4.fundSum || 0
                  }
                }
                totals2.quantity += totals3.quantity || 0
                totals2.mtCount += totals3.mtCount || 0
                totals2.vacCount += totals3.vacCount || 0
                totals2.fundSum += totals3.fundSum || 0
              }
            }
            totals1.quantity += totals2.quantity || 0
            totals1.mtCount += totals2.mtCount || 0
            totals1.vacCount += totals2.vacCount || 0
            totals1.fundSum += totals2.fundSum || 0
          }
        }
        if (isTotals) {
          totals.quantity += totals1.quantity || 0
          totals.mtCount += totals1.mtCount || 0
          totals.vacCount += totals1.vacCount || 0
          totals.fundSum += totals1.fundSum || 0
        }
      }
    }
  }
  res = me.removeEmptyDepts(res)
  /* Для покращення наочності виводяться ітоги лише верхньої оргодиниці */
  for (let i = 1; i < res.length; i++) {
    let resItem = res[i]
    if (resItem.idxNum === null && resItem.employeeNumberID === null) {
      resItem.quantity = null
      resItem.mtCount = null
      resItem.vacCount = null
    }
  }
  return res
}

function getFundsData (ctx) {
  let mParams = ctx.mParams
  let orgs = dataService.getNumberArray(mParams.orgs)
  let depts = dataService.getNumberArray(mParams.depts)
  let depID = mParams.depid
  let onDate = mParams.onDate ? new Date(mParams.onDate) : new Date()
  const dFrom = dateService.firstDayOfMonth(onDate)
  const dTo = dateService.lastDayOfMonth(onDate)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const parametrs = {
    orgID: orgs[0],
    dateFrom: onDate,
    dateTo: onDate,
    avgCount: true,
    departmentID: depID,
    includeChildDepts: true
  }

  const avgListData = reportService.getAvgListEmpCount(parametrs)

  let posData = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'positionID', 'departmentID'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('isActive', '=', true)
    .where('organizationID', 'in', orgs)
    .whereIf(depts && depts.length && depts[0] !== 0, 'departmentID', 'in', depts)
    .selectAsObject()
  if (posData.length) {
    let accrData = UB.Repository('hr_accrual')
      .attrs(['sum([paySum])', 'employeeNumberID', 'employeeNumberID.limitedAccess'])
      .where('periodCalc', '>=', dFrom, 'pc1')
      .where('periodCalc', '<=', dTo, 'pc2')
      .where('periodSalary', '<=', dTo, 'pc3')
      .where('periodSalary', '>=', dFrom, 'ps1')
      .where('periodSalary', '<=', dTo, 'ps2')
      .where('periodCalc', '<', dFrom, 'ps3')
      .logic('(([pc1] and [pc2] and [pc3]) or ([ps1] and [ps2] and [ps3]))')
      .where('employeeNumberID.orgID', 'in', orgs)
      .where('flagsRecSum', '!=', 8192)
      .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
      .exists(UB.Repository('hr_idParam')
        .correlation('valuesID', 'payElID')
        .where('listParamID.code', 'in', ['FOZP', 'FDZP', 'ZKV'])
        .where('listParamID.tableName', '=', 'hr_payEl')
        .where('orgID', 'in', orgs)
        .where('mi_deleteDate', '>=', '#maxdate'))
      .groupBy(['employeeNumberID', 'employeeNumberID.limitedAccess'])
      .selectAsObject({
        'sum([paySum])': 'paySum',
        'employeeNumberID.limitedAccess': 'limitedAccess'
      })
    posData.forEach(posItem => {
      posItem.cnt = 0
      if (avgListData && avgListData.employeeNumbers[posItem.employeeNumberID]) {
        posItem.cnt = avgListData.employeeNumbers[posItem.employeeNumberID].dayCount || 0
      }
      let paySum = 0
      if (posItem.cnt > 0) {
        let accrPosData = accrData.filter(itm => itm.employeeNumberID === posItem.employeeNumberID)
        accrPosData.forEach(accrPosItem => {
          paySum += accrPosItem.paySum || 0
        })
      }
      posItem.paySum = paySum
    })
  }
  return posData
}

me.getData = ctx => {
  let res = []
  const mParams = ctx.mParams
  const orgs = dataService.getNumberArray(mParams.orgs)
  const onDate = mParams.onDate ? new Date(mParams.onDate) : new Date()
  let depts = dataService.getNumberArray(mParams.depts)
  let depid = mParams.depid ? parseInt(mParams.depid) : undefined
  const toSumMtCount = mParams.toSumMtCount
  const notZeroFields = mParams.notZeroFields
  const hasNotZeroFilter = !!notZeroFields
  const isCateg = mParams.isCateg

  let posDataAll = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'positionType', 'psCategory', 'name', 'quantity', 'mi_dateFrom', 'mi_dateTo'])
    .misc({ __mip_recordhistory_all: true })
    // .misc({ __mip_ondate: onDate })
    .where('orgID', 'in', orgs)
    .where('liquidate', '=', 0)
    // .where('parentUnitID.state', '=', 'ACTIVE', 'parentState')
    // .where('parentUnitID.mi_dateFrom', '<=', onDate, 'parentDateFrom')
    // .where('parentUnitID.mi_dateTo', '>=', onDate, 'parentDateTo')
    // .where('parentUnitID.mi_deleteDate', '>=', '#maxdate', 'parentDelDate')
    .where('positionType', '=', '1', 'isStateWorker')
    .where('positionType', '!=', '1', 'isNotStateWorker')
    .where('psCategory', 'isNotNull', undefined, 'categIsNotNull')
    .where('state', '=', 'ACTIVE', 'stateAct')
    .logic('(([isStateWorker] and [categIsNotNull]) or ([isNotStateWorker]))')

  storeService.addWhereListToRepoObj(posDataAll, mParams)
  posDataAll = posDataAll.selectAsObject()

  const empPosData = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'positionID', 'employeeID.shortFIO', 'mtCount'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('isActive', '=', true)
    .where('organizationID', 'in', orgs)
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  const posData = posDataAll.filter(posItem => new Date(posItem.mi_dateFrom) <= onDate && new Date(posItem.mi_dateTo) >= onDate)
  const positionIDs = _.uniq(posData.map(e => e.mi_data_id))
  // поищем ликвидированные посады, на которых есть назначения
  const LiqPositionIDs = _.uniq(empPosData.filter(e => positionIDs.indexOf(e.positionID) === -1).map(e => e.positionID))
  LiqPositionIDs.forEach(posItemID => {
    const posItem = _.find(posDataAll, el => el.mi_data_id === posItemID)
    if (posItem) {
      // ликвидированные посады не учитываем quantity
      posItem.liq = true
      posItem.quantity = 0
      posData.push(posItem)
    }
  })

  if (posData.length) {
    let accrData = getFundsData({
      mParams: {
        orgs: orgs,
        onDate: onDate,
        depts: depts,
        depid: depid
      }
    })

    let posVacData = positionVac.getVacanciesWithVacFrom(onDate, orgs[0], undefined, depid, undefined) // JSON.parse(posVacObj.resultData)
    posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : []

    let idxNum = 0
    posData.forEach(posItem => {
      let dataToAdd = []
      const vacItems = posVacData[posItem.mi_data_id]
      posItem.vacCount = vacItems ? vacItems.reduce((result, item) => (result + item.vacCount > 0 ? item.vacCount : 0), 0) : 0
      let quantity = posItem.quantity || 0
      let mtCountSum = 0
      let shortFIO = ''
      let employeeNumberID
      let firstEmpPosRec
      let empPosItems = empPosData.filter(itm => itm.positionID === posItem.mi_data_id)
      if (!empPosItems.length) {
        empPosItems.push({
          'employeeID.shortFIO': null,
          employeeNumberID: null,
          mtCount: 0
        })
      }
      for (let i = 0; i < empPosItems.length; i++) {
        let empPosItem = empPosItems[i]
        shortFIO = empPosItem['employeeID.shortFIO']
        employeeNumberID = empPosItem.employeeNumberID
        let mtCount = empPosItem.mtCount || 0
        mtCountSum += mtCount
        let accrPosData = accrData.filter(itm => empPosItem.employeeNumberID ? itm.employeeNumberID === empPosItem.employeeNumberID : false)
        let fundSum = 0
        accrPosData.forEach(accrPosItem => {
          fundSum += accrPosItem.paySum || 0
        })
        let isFirstEmpPos = (i === 0)
        let rec = {
          ID: empPosItem.ID,
          idxNum: isFirstEmpPos ? ++idxNum : null,
          name: isFirstEmpPos ? posItem.name : null,
          shortFIO: shortFIO,
          quantity: isFirstEmpPos ? quantity : null,
          mtCount: mtCount,
          vacCount: isFirstEmpPos ? posItem.vacCount : null,
          fundSum: isCateg ? null : fundSum,
          employeeNumberID: employeeNumberID,
          positionID: posItem.mi_data_id,
          parentUnitID: posItem.parentUnitID,
          positionType: posItem.positionType,
          psCategory: posItem.psCategory,
          parentIdxNum: posItem['parentUnitID.idxNum']
        }
        if (isFirstEmpPos) {
          firstEmpPosRec = rec
          dataToAdd.push(rec)
        } else if (!toSumMtCount) {
          dataToAdd.push(rec)
        }
      }
      if (firstEmpPosRec) {
        // firstEmpPosRec.vacCount = (quantity > mtCountSum) ? quantity - mtCountSum : 0
        if (toSumMtCount) {
          firstEmpPosRec.mtCount = mtCountSum
        }
      }
      for (let i = 0; i < dataToAdd.length; i++) {
        let dataItemToAdd = dataToAdd[i]
        let toAdd = true
        if (hasNotZeroFilter) {
          for (let i = 0; i < notZeroFields.length; i++) {
            let field = notZeroFields[i]
            toAdd = dataItemToAdd[field] && dataItemToAdd[field] > 0
            if (!toAdd) {
              break
            }
          }
        }
        if (toAdd) {
          res.push(dataItemToAdd)
        }
      }
    })
  }
  return res
}

me.getGrouppedByParentUnit = ctx => {
  let data = me.getData(ctx)
  return me.getGrouppedByParentUnitFromData(data)
}

me.getGrouppedByParentUnitFromData = function (data) {
  let res = []
  if (data.length) {
    let parentUnits = dataService.distinct(data, ['parentUnitID'])
    parentUnits.forEach(unitID => {
      let unitData = data.filter(dataItem => dataItem.parentUnitID === unitID)
      let quantity = 0
      let mtCount = 0
      let fundSum = 0
      unitData.forEach(unitItem => {
        quantity += unitItem.quantity || 0
        mtCount += unitItem.mtCount || 0
        fundSum += unitItem.fundSum || 0
      })
      res.push({
        parentUnitID: unitID,
        quantity: quantity,
        mtCount: mtCount,
        vacCount: (quantity > mtCount) ? quantity - mtCount : 0,
        fundSum: fundSum
      })
    })
  }
  return res
}

me.getGrouppedByParentUnitAndCateg = ctx => {
  let res = []
  let data = me.getData(ctx)
  if (data.length) {
    let parentUnitsAndCategs = dataService.distinct(data, ['parentUnitID', 'positionType', 'psCategory'])
    parentUnitsAndCategs.forEach(groupItem => {
      let parentUnitID = groupItem.parentUnitID
      let positionType = groupItem.positionType
      let psCategory = groupItem.psCategory
      let unitData
      if (positionType === '1') {
        unitData = data.filter(dataItem => dataItem.parentUnitID === parentUnitID && dataItem.positionType === positionType && dataItem.psCategory === psCategory)
      } else {
        unitData = data.filter(dataItem => dataItem.parentUnitID === parentUnitID && dataItem.positionType === positionType)
      }
      let quantity = 0
      let mtCount = 0
      let fundSum = 0
      unitData.forEach(unitItem => {
        quantity += unitItem.quantity || 0
        mtCount += unitItem.mtCount || 0
        fundSum += unitItem.fundSum || 0
      })
      res.push({
        parentUnitID: parentUnitID,
        positionType: positionType,
        psCategory: psCategory,
        quantity: quantity,
        mtCount: mtCount,
        vacCount: (quantity > mtCount) ? quantity - mtCount : 0,
        fundSum: fundSum
      })
    })
  }
  return res
}

me.getPosItems = function (posItems, parentUnitID) {
  let result = {
    pos: [],
    quantity: 0,
    mtCount: 0,
    vacCount: 0,
    fundSum: 0
  }
  if (posItems.length) {
    let idxNum = 1
    for (let i = 0; i < posItems.length; i++) {
      let posItem = posItems[i]
      posItem.idxNum = (posItem.idxNum === null) ? null : idxNum++
      result.quantity += posItem.quantity || 0
      result.mtCount += posItem.mtCount || 0
      result.vacCount += posItem.vacCount || 0
      result.fundSum += posItem.fundSum || 0
      /* Не виводити ФОП для посад, вимога від Артеменко */
      posItem.fundSum = null
      result.pos.push(posItem)
    }
  }
  return result
}

me.removeEmptyDepts = function (data) {
  let res = []
  let posItems = data.filter(item => item.idxNum !== null || item.employeeNumberID !== null)
  if (posItems.length) {
    posItems.forEach(posItem => {
      posItem.isUsed = true
      me.doOnBranchUp(data, posItem, function (item) {
        item.isUsed = true
      })
    })
    data.forEach(item => {
      if (item.isUsed) {
        res.push(item)
      }
    })
  }
  return res
}

me.doOnBranchUp = function (data, startItem, fnCallback) {
  let parentItem = data.find(item => item.ID === startItem.parentUnitID && item.ID !== startItem.ID)
  if (parentItem) {
    fnCallback(parentItem)
    me.doOnBranchUp(data, parentItem, fnCallback)
  }
}
