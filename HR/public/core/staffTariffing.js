/* global _ $App AC HR UB */
module.exports = {
  getReportData,
  accrualSumGetPosSum,
  accrualSumGetEmpSum
}

async function getReportData (reportParams, reportKind = 'fact', isPayrollFund = false) {
  if (!reportParams.params) reportParams.params = {}
  const orgID = reportParams.orgID || reportParams.params.orgID || 0
  const orgName = reportParams.orgName || ''
  const orgNameDat = reportParams.orgNameDat || ''
  const structDepID = reportParams.structDepID || 0
  const structDepName = reportParams.structDepName || ''
  const childDepID = reportParams.childDepID || 0
  const childDepName = reportParams.childDepName || ''
  const onDate = reportParams.onDate || reportParams.params.onDate
  const onDate4Sql = AC.dateService.shiftDate(onDate)
  const dictFundSourceID = reportParams.dictFundSourceID || 0

  const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(orgID)
  const isMed = !AC.settings.get('hrTariffReportGroupByCategory', orgID) && !isPayrollFund // await HR.reportUtils.isOrgOfBusinessType(orgID, 'med')
  const useCoef = true // reportParams.useCoef

  const result = {
    data: [],
    signData: [],
    orgName: orgName || '',
    orgNameDat: orgNameDat || '',
    structDepName: structDepName || '',
    childDepName: childDepName || '',
    fundName: '',
    progClassName: '',
    onDate: onDate,
    onDateStr: AC.dateService.formatDate(onDate),
    roundTo: settingsOrg.roundTo || 'decimal2',
    roundToQuantity: settingsOrg.roundToQuantity || 'numberGroup',
    isMed: isMed,
    reportKind,
    useCoef
  }

  const depFilter = childDepID || structDepID
  const depIDs = []
  structDepID && depIDs.push(structDepID)
  childDepID && depIDs.push(childDepID)
  const orgIDs = [orgID]
  let orgStruct = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath', 'treePath'])
    .attrsIf(reportKind === 'fact', ['code'])
    .where('orgID', '=', orgID)
    .where('liquidate', '=', 0)
    .where('state', '=', 'ACTIVE', 'active')
    .where('mi_dateFrom', '<=', onDate4Sql, 'dateFrom')
    .where('mi_dateTo', '>=', onDate4Sql, 'dateTo')
  if (structDepID || childDepID) {
    orgStruct = orgStruct
      .where('mi_treePath', 'like', `%/${depFilter}/%`, 'treePath')
      .where('mi_data_id', 'in', depIDs, 'IDs')
      .logic('([treePath] OR [IDs])')
  }
  if (reportKind === 'plan') {
    orgStruct = orgStruct
      .where('liquidate', '=', 0, 'liqu')
      .where('staffOrderID', '=', reportParams.instanceID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', reportParams.instanceID)
        .where('mi_deleteDate', '>=', '#maxdate'), 'notExist')
      .logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
  }
  orgStruct = await orgStruct.orderBy('treePath')
    .selectAsObject()
  if (!orgStruct.length) {
    return result
  }
  const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate4Sql, undefined, ['nameDat', 'positionChiefID'])
  orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
    const deptItem = deptData.find(dItem => dItem.ID === item.ID)
    item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    item.positionChiefID = deptItem ? deptItem.positionChiefID : undefined
  })

  const reportData = reportKind === 'plan'
    ? await $App.connection.run({
      entity: 'hr_staffTariffing',
      method: 'getReportData',
      execParams: {
        instanceID: reportParams.instanceID,
        structDepID,
        childDepID,
        onDateReport: reportParams.onDateReport
      }
    }).then(mParams => {
      return JSON.parse(mParams.resultData)
    })
    : await $App.connection.run({
      entity: 'hr_tariffing',
      method: 'getReportDataFact',
      execParams: {
        orgID,
        structDepID,
        childDepID,
        onDate,
        dictFundSourceID
      }
    }).then(mParams => {
      return JSON.parse(mParams.resultData)
    })

  const empPosData = reportData.empPosData

  if (dictFundSourceID) {
    const fundSource = await UB.Repository('ac_dictFundSource')
      .attrs(['dictFundTypeID.name'].concat($App.domainInfo.entities.ac_dictFundSource.dictProgClassID ? ['dictProgClassID.description'] : []))
      .where('organizationID', '=', orgID)
      .where('fundSourceID', '=', dictFundSourceID)
      .selectSingle()
    result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
    result.progClassName = HR.nameCase.cap((fundSource && fundSource['dictProgClassID.description']) || '')
  }

  result.minSalarySum = await UB.Repository('hr_dictSalaryMinSize')
    .attrs(['monthValue'])
    .where('[dateFrom]', '<=', onDate4Sql)
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectScalar() || 0

  const longVacCodes = ['dCh3Y', 'dCh6Y']
  const empPosInfo = await HR.treeUtils.getPosInfo([], empPosData.map(o => o.ID), onDate, undefined, longVacCodes)
  const tempVacPosData = empPosInfo.employeePosition

  const repCode = '07'
  const payelData = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, repCode)

  const repParamPref = 'tariffing'
  const accrualData = HR.accrualService.accrualSumInit(repParamPref, repParamPref)
  accrualData.sciencePercent = HR.accrualService.accrualSumGetItemCfg(repParamPref, '16', { percentOnly: true, fillPos: false })
  accrualData.scienceSum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '16', { fillPos: false, useCoef: useCoef })
  accrualData.workexpPercent = HR.accrualService.accrualSumGetItemCfg(repParamPref, '18', {
    percentOnly: true,
    getPercentByElmExp: true,
    fillPos: false
  })
  accrualData.workexpSum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '18', { useCoef: useCoef })
  accrualData.desertsPercent = HR.accrualService.accrualSumGetItemCfg(repParamPref, '21', { percentOnly: true, fillPos: false })
  accrualData.desertsSum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '21', { useCoef: useCoef })
  accrualData.addpayPercent = HR.accrualService.accrualSumGetItemCfg(repParamPref, '23', { percentOnly: true, fillPos: false })
  accrualData.addpaySum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '23', { useCoef: useCoef })
  accrualData.obligatoryPercent = HR.accrualService.accrualSumGetItemCfg(repParamPref, '28', { percentOnly: true, fillPos: false })
  accrualData.obligatorySum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '28', { useCoef: useCoef })
  accrualData.addMinSum = HR.accrualService.accrualSumGetItemCfg(repParamPref, '26', { useCoef: true }) // всегда с учетом ставки

  const setElements = reportData.repSetElements || []
  const accDataKeys = Object.keys(accrualData)
  for (let i in accDataKeys) {
    let key = accDataKeys[i]
    let accrualItem = accrualData[key]
    accrualItem.elms = setElements.filter(elm => elm.reportCode === accrualItem.code).map(elm => elm.elementID)
  }

  const par = {
    respPositionID1: reportParams.respPositionID1,
    respEmp1: reportParams.respEmp1,
    respPositionID2: reportParams.respPositionID2,
    respEmp2: reportParams.respEmp2
  }
  await HR.orgStructReportUtils.getSingers(result, par, onDate4Sql)

  const tree = generateDataForReport({
    rootID: reportParams.rootID || orgID,
    orgStruct,
    posData: reportData.posData,
    empPosData,
    accrualData,
    payelData,
    minSalarySum: result.minSalarySum,
    onDate,
    orgNameDat,
    depFilter,
    tempVacPosData,
    isMed,
    indexInVacancy: reportParams.indexInVacancy,
    byStaff: reportParams.byStaff,
    useCoef
  })
  result.data = tree.data || []
  result.totals = tree.totals || []
  result.quantity = tree.quantity
  result.fundSum = tree.fundSum

  HR.reportUtils.clearZeroes(result, ['quantity', 'basepay', 'basepayAdd1', 'basepayAdd2', 'basepayAdd3', 'basepayAdd4',
    'basepayAdd5', 'basepayAdd6', 'basepaySum', 'quantityBase', 'quantityAdd', 'sciencePercent', 'scienceSum', 'workexpPercent',
    'workexpSum', 'desertsPercent', 'desertsSum', 'addpayPercent', 'addpaySum', 'fundMonth', 'fundAddpay', 'obligatoryPercent',
    'obligatorySum', 'fundSum'])

  HR.reportUtils.setRoundToQuantity(result.data.filter(orgItem => !orgItem.isDepartment), settingsOrg.roundToQuantity,
    [
      { name: 'quantity', nameRound: 'roundToQuantity' },
      { name: 'quantityBase', nameRound: 'roundToQuantityBase' },
      { name: 'quantityAdd', nameRound: 'roundToQuantityAdd' }
    ]
  )
  HR.reportUtils.setRoundToQuantity(result.totals.filter(orgItem => !orgItem.isTitle), settingsOrg.roundToQuantity,
    [
      { name: 'quantity', nameRound: 'roundToQuantity' },
      { name: 'quantity1', nameRound: 'roundToQuantity1' },
      { name: 'quantity2', nameRound: 'roundToQuantity2' },
      { name: 'quantity3', nameRound: 'roundToQuantity3' },
      { name: 'quantity4', nameRound: 'roundToQuantity4' },
      { name: 'quantity5', nameRound: 'roundToQuantity5' }
    ]
  )
  return result
}

function accrualSumGetPosSum ({ accrualItem, posItem, quantity }) {
  let empSum = 0
  posItem.accruals.forEach(acc => {
    if (accrualItem.elms.includes(acc.payElID)) {
      empSum += accrualItem.percentOnly ? (acc.rate || 0) : AC.currencyService.round((accrualItem.useCoef ? quantity || 0 : 1) * (acc.planSum || 0), 2)
    }
  })
  return empSum
}

function accrualSumGetEmpSum ({ accrualItem, accumObj, empPosItem, payelData = [] }) {
  let empSum = 0
  let hasPayPerm = empPosItem.permanentAccruals && empPosItem.permanentAccruals.length > 0
  if (hasPayPerm) {
    let payPerm = empPosItem.permanentAccruals.filter(ppItem => accrualItem.elms.includes(ppItem.payElID))
    payPerm.forEach(payPermItem => {
      empSum += accrualItem.percentOnly ? (payPermItem.rate || 0) : accrualItem.useCoef ? (payPermItem.paySumForCount || 0) : (payPermItem.paySum || 0)
    })
  }
  if (accrualItem.getPercentByElmExp && hasPayPerm) {
    /* Надбавка за стаж */
    for (let j = 0; j < accrualItem.elms.length; j++) {
      let payElID = accrualItem.elms[j]
      let payPermItem = empPosItem.permanentAccruals.find(ppItem => ppItem.payElID === payElID)
      if (payPermItem) {
        let payElItem = payElID && payelData.find(itm => itm.ID === payElID)
        if (payElItem) {
          let empExpItem = empPosItem.expData.find(o => o.dictExperienceID === payElItem.dictExperienceID)
          if (empExpItem) {
            let ymd = empExpItem.ymd
            empSum = accrualItem.percentOnly ? (payPermItem.rate || 0) : (accrualItem.useCoef ? payPermItem.paySumForCount || 0 : payPermItem.paySum || 0)
            if (accumObj) {
              accumObj.workexp = UB.i18n(`{0}р. {1}м.`, ymd.years, ymd.months)
            }
          }
        }
      }
    }
  }
  return empSum
}

function generateDataForReport ({ rootID, orgStruct, posData, empPosData, accrualData, payelData,
  minSalarySum, onDate, orgNameDat, depFilter, tempVacPosData, isMed, indexInVacancy, byStaff, useCoef }) {
  const medStaffCats = ['1', '2', '3']
  const maxDepNameLen = 67
  const mainDeptRowStyle = 'font-weight: bold; height: 36px;'
  const boldRowStyle = 'font-weight: bold;'
  const sumColumns = isMed
    ? { scienceSum: 0, workexpSum: 0, desertsSum: 0, addpaySum: 0, fundMonth: 0, fundAddpay: 0, obligatorySum: 0, fundSum: 0 }
    : {
      basepay: 0,
      basepayAdd1: 0,
      basepayAdd2: 0,
      basepayAdd3: 0,
      basepayAdd4: 0,
      basepayAdd5: 0,
      basepayAdd6: 0,
      basepaySum: 0,
      scienceSum: 0,
      workexpSum: 0,
      desertsPercent: 0,
      desertsSum: 0,
      addpaySum: 0,
      fundMonth: 0,
      fundAddpay: 0,
      obligatorySum: 0,
      fundSum: 0
    }
  const sumColumnsQnt = ['basepay', 'basepayAdd1', 'basepayAdd2', 'basepayAdd3', 'basepayAdd4', 'basepayAdd5', 'basepayAdd6', 'basepaySum']

  const joinColumns1 = ['fundMonth', 'fundAddpay', 'fundSum']
  // const joinColumns2 = isMed ? [] : ['basepay', 'basepayAdd1', 'basepayAdd2', 'basepayAdd3', 'basepayAdd4', 'basepayAdd5', 'basepayAdd6', 'basepaySum' ]
  const joinColumns3 = ['scienceSum', 'workexpSum', 'desertsSum', 'obligatorySum', 'addpaySum']

  const qntColumns = { quantityBase: 0, quantityAdd: 0, quantity: 0 }
  const totalColumns = Object.assign({}, qntColumns, sumColumns)
  const catData = HR.reportUtils.getPosCategories({ isMed, initObj: totalColumns, posData, byStaff })

  function cutDepName (depName) {
    let res = depName
    if (res && res.length > maxDepNameLen) {
      res = res.substring(0, maxDepNameLen) + '...'
    }
    return res
  }

  function initSum (obj) {
    Object.keys(accrualData).forEach(key => {
      let accrualItem = accrualData[key]
      if (accrualItem.hasData) {
        obj[key] = 0
      }
    })
  }

  function accumSumColumns ({ srcObj, destObj, quantity, sumCoef = 1, qntCoef = 1, withQuantity = false }) {
    if (!Number.isFinite(sumCoef)) {
      sumCoef = 0
    }
    Object.keys(Object.assign({ quantity: quantity }, qntColumns)).forEach(key => {
      let srcVal = qntCoef * ((key === 'quantity' && quantity !== undefined) ? quantity : (srcObj[key] || 0))
      if (destObj[key]) {
        destObj[key] += srcVal
      } else {
        destObj[key] = srcVal
      }
    })
    Object.keys(sumColumns).forEach(key => {
      let srcVal = AC.currencyService.round(srcObj[key] * sumCoef, 2)
      if (withQuantity && sumColumnsQnt.includes(key)) { // нужно учеть количество
        srcVal = AC.currencyService.round(srcObj[key] * srcObj.quantity, 2)
      }
      if (destObj[key]) {
        destObj[key] = AC.currencyService.round(destObj[key] + srcVal, 2)
      } else {
        destObj[key] = srcVal
      }
    })
  }

  function changeColumns (attrNames, srcObj, destObj, sumCoef = 1) {
    if (!attrNames.length) {
      return
    }
    if (!Number.isFinite(sumCoef)) {
      sumCoef = 0
    }

    attrNames.forEach(key => {
      let srcVal = srcObj[key] ? AC.currencyService.round(srcObj[key] * sumCoef, 2) : 0
      if (destObj[key]) {
        destObj[key] = AC.currencyService.round(destObj[key] + srcVal, 2)
      } else {
        destObj[key] = srcVal
      }
    })
  }

  function joinEmpVacItems (items, resObject) {
    const result = []
    items.forEach(item => {
      if (item.isEmpVac) {
        const curItem = result.find(o => o.dictPositionID === item.dictPositionID && o.isEmpVac)
        if (!curItem) {
          result.push(item)
        } else {
          curItem.quantityBase = (curItem.quantityBase || 0) + (item.quantityBase || 0)
          curItem.quantityAdd = (curItem.quantityAdd || 0) + (item.quantityAdd || 0)
          curItem.quantity += item.quantity

          if (useCoef) {
            changeColumns(joinColumns3, item, curItem, 1) // добавим суммы набавок
          } else {
            changeColumns(joinColumns3, item, resObject, -1)
          }

          // уберем лишние суммы
          // из-за округления эти суммы убираем с обоих записей, потом добавим новый рассчет
          changeColumns(joinColumns1, item, resObject, -1)
          changeColumns(joinColumns1, curItem, resObject, -1)
          // changeColumns(joinColumns2, item, resObject, -1)

          curItem.fundMonth = AC.currencyService.round(useCoef
            ? (curItem.basepaySum * curItem.quantity) + AC.currencyService.round(curItem.scienceSum + curItem.workexpSum + curItem.desertsSum + curItem.addpaySum, 2)
            : AC.currencyService.round((curItem.basepaySum + curItem.scienceSum + curItem.workexpSum + curItem.desertsSum + curItem.addpaySum), 2) * curItem.quantity
          , 2)
          curItem.fundAddpay = AC.currencyService.round(curItem.addMinSum > 0 ? curItem.addMinSum : (minSalarySum * curItem.quantity > curItem.fundMonth) ? minSalarySum * curItem.quantity - curItem.fundMonth : 0, 2)
          curItem.fundSum = AC.currencyService.round((curItem.fundMonth + curItem.fundAddpay + (useCoef ? curItem.obligatorySum : AC.currencyService.round(curItem.obligatorySum * curItem.quantity, 2))), 2)

          changeColumns(joinColumns1, curItem, resObject, 1) // добавим суммы к итогам
        }
      } else {
        result.push(item)
      }
    })
    return result
  }

  function makePositons (orgItem, parentID, level, indexNum) {
    const result = Object.assign({}, {
      level: level,
      data: [],
      catData: _.cloneDeep(catData)
    }, totalColumns)
    if (!parentID || (!orgItem && !isMed)) return result

    const parent = orgStruct.find(el => el.mi_data_id === (orgItem ? orgItem.parentUnitID : parentID) && el.mi_unityEntity === 'hr_department')
    const parentName = parent ? parent.name : ''
    const positionChiefID = byStaff && parent ? parent.positionChiefID : undefined

    const posItems = orgItem ? [orgItem] : orgStruct.filter(el => el.parentUnitID === parentID && el.mi_unityEntity !== 'hr_department')
    if (!posItems || !posItems.length) return result
    const identStr = HR.reportUtils.getSpaceIdent(false, level)
    const identHtml = HR.reportUtils.getSpaceIdent(true, level)
    let cnt = 0

    let positionObjs = []
    posItems.forEach(orgItem => {
      let obj1 = {
        isPositionChief: positionChiefID ? positionChiefID === orgItem.mi_data_id : false,
        treePath: orgItem.treePath,
        mi_data_id: orgItem.mi_data_id,
        name: orgItem.name,
        text: '',
        isDepartment: false,
        isTotal: false,
        level: level,
        depType: orgItem.depType || '',
        rowStyle: '',
        catCode2: false
      }
      obj1.isPositionChiefOrder = obj1.isPositionChief ? 1 : 2
      const objs = [obj1]
      const posItem = posData.find(itm => itm.ID === orgItem.ID)
      if (posItem) {
        obj1.isPosition = true
        obj1.dictPositionID = posItem.dictPositionID
        obj1.name = HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
        obj1.text = obj1.name
        let staffCatCode = posItem['dictStaffCatID.code'] || '99999999999'
        obj1.catCode2 = staffCatCode === '2'

        let posQnt = posItem.quantity || 0
        const empPos = empPosData.filter(item => item.positionID === posItem.mi_data_id)
        if (empPos.length === 0) {
          obj1.tarifCode = '' // posItem.tarifCode
          obj1.quantityBase = posQnt
          obj1.basepay = posItem.basepay || 0
          obj1.vacationChildText = ''
          obj1.isEmpVac = true
          obj1.empPosID = undefined
          obj1.empName = ` (${UB.i18n('вакансія')})`
          obj1.empNameText = `&nbsp;(${UB.i18n('вакансія')})`
          initSum(obj1)
          Object.keys(accrualData).forEach(key => {
            let accrualItem = accrualData[key]
            if (accrualItem.hasData) {
              obj1[key] = accrualSumGetPosSum({
                accrualItem,
                posItem,
                quantity: (obj1.quantityBase || 0) + (obj1.quantityAdd || 0)
              })
            }
          })
        } else {
          let empQntSum = 0
          for (let i = 0; i < empPos.length; i++) {
            let empPosItem = empPos[i]
            let tempVacPosItem = tempVacPosData.find(itm => itm.ID === empPosItem.ID)
            let vacDateTo = tempVacPosItem && tempVacPosItem.vacationDateTo && new Date(tempVacPosItem.vacationDateTo)
            let isTempVac = vacDateTo && vacDateTo > onDate
            let empQnt = (!isTempVac && empPosItem.mtCount) || 0
            empQntSum += !isTempVac ? (empPosItem.mtCount || 0) : 0
            let obj
            if (i === 0) {
              obj = obj1
            } else {
              obj = Object.assign({}, obj1)
              obj.name = HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
              obj.text = obj.name
              objs.push(obj)
            }
            if (posItem.nameAddition) {
              obj.name = obj.name + ' ' + posItem.nameAddition
              obj.text = obj.name
            }
            obj.empPosID = empPosItem.ID
            obj.empName = empPosItem.fullFIO
            obj.permanentAccruals = empPosItem['permanentAccruals']
            obj.dateFrom = empPosItem['dateFrom']
            obj.tabNum = empPosItem['employeeNumberID.tabNum']
            obj.workPlace = empPosItem['workPlace']
            obj.workPlaceName = empPosItem['workPlace.name']
            obj1.department = parentID
            obj1.departmentName = parentName
            obj.empNameText = isTempVac ? `<font color="red">${empPosItem.fullFIO}</font>` : empPosItem.fullFIO
            let vacationDateToChild = tempVacPosItem && tempVacPosItem.vacationDateToChild && new Date(tempVacPosItem.vacationDateToChild)
            obj.vacationChildText = isTempVac && vacationDateToChild ? UB.i18n('декретна відпустка по') + ' ' + AC.dateService.formatDate(vacationDateToChild) : ''
            if (isTempVac) {
              obj.empNameIsRed = true // для Excel звіту
            }
            obj.tarifCode = empPosItem.tarifCode
            if (empPosItem.workPlace === '1') {
              obj.quantityBase = empQnt
              obj.quantityAdd = undefined
            } else {
              obj.quantityAdd = empQnt
              obj.quantityBase = undefined
            }
            obj.basepay = empPosItem.basepay
            if (empPosItem.extraPosName) {
              obj.name += ' ' + empPosItem.extraPosName
              obj.text = obj.name
            }
          }
          if (posQnt > empQntSum) {
            let posVacItem = posData.find(itm => itm.ID === orgItem.ID && itm.isVacancy === 1) || posItem
            // вакансія
            let newObj
            newObj = Object.assign({}, obj1)
            newObj.catCode2 = false // UBHR-22872
            newObj.vacationChildText = ''
            newObj.isEmpVac = true
            newObj.dictPositionID = posItem.dictPositionID
            newObj.empPosID = undefined
            newObj.name = HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
            newObj.text = newObj.name
            newObj.empName = ` (${UB.i18n('вакансія')})`
            newObj.empNameText = `&nbsp;(${UB.i18n('вакансія')})`
            newObj.tarifCode = '' // posItem.tarifCode
            newObj.quantityBase = posQnt - empQntSum
            newObj.quantityAdd = undefined
            newObj.basepay = posVacItem.basepay || 0
            initSum(newObj)
            Object.keys(accrualData).forEach(key => {
              let accrualItem = accrualData[key]
              if (accrualItem.hasData) {
                newObj[key] = accrualSumGetPosSum({
                  accrualItem,
                  posItem: posVacItem,
                  quantity: newObj.quantityBase
                })
              }
            })
            objs.push(newObj)
          } else if (posQnt < empQntSum) {
            // Призначень більше ніж штатних посад
            obj1.text = `<font color="red">${obj1.name}</font>`
            obj1.nameIsRed = true // для Excel звіту
          }
        }
        /* Заповнення колонок 6-11,16,18,21,23,28 */
        Object.keys(accrualData).forEach(key => {
          let accrualItem = accrualData[key]
          if (empPos.length > 0) {
            // Існують призначення
            for (let i = 0; i < empPos.length; i++) {
              let empPosItem = empPos[i]
              if (accrualItem.hasData) {
                let obj = objs[i]
                obj[key] = accrualSumGetEmpSum({
                  accrualItem,
                  accumObj: obj,
                  empPosItem,
                  payelData,
                  onDate
                })
                obj.scienceName = empPosItem.scienceName
              }
            }
          } else {
            // Посада вакантна
            if (accrualItem.hasData) {
              obj1[key] = accrualSumGetPosSum({
                accrualItem,
                posItem,
                quantity: (obj1.quantityBase || 0) + (obj1.quantityAdd || 0)
              })
            }
          }
        })

        // Обчислення формул та ітогів
        objs.forEach(obj => {
          if (!obj.isEmpVac || indexInVacancy) {
            obj.indexNum = indexNum + cnt
            cnt++
          }
          obj.basepaySum = HR.accrualService.accrualSumGetBasepayByObj(obj)
          obj.quantity = ((obj.quantityBase || 0) + (obj.quantityAdd || 0))
          if (useCoef) {
            obj.fundMonth = obj.catCode2
              ? AC.currencyService.round((obj.basepaySum * obj.quantity), 2) + AC.currencyService.round(obj.scienceSum + obj.workexpSum + obj.desertsSum + obj.addpaySum + obj.obligatorySum, 2)
              : AC.currencyService.round((obj.basepaySum * obj.quantity), 2) + AC.currencyService.round(obj.scienceSum + obj.workexpSum + obj.desertsSum + obj.addpaySum, 2)
          } else {
            obj.fundMonth = obj.catCode2
              ? AC.currencyService.round(AC.currencyService.round((obj.basepaySum + obj.scienceSum + obj.workexpSum + obj.desertsSum + obj.addpaySum + obj.obligatorySum), 2) * obj.quantity, 2)
              : AC.currencyService.round(AC.currencyService.round((obj.basepaySum + obj.scienceSum + obj.workexpSum + obj.desertsSum + obj.addpaySum), 2) * obj.quantity, 2)
          }

          obj.fundAddpay = AC.currencyService.round(obj.addMinSum > 0 ? obj.addMinSum : (minSalarySum * obj.quantity > obj.fundMonth) ? minSalarySum * obj.quantity - obj.fundMonth : 0, 2)
          obj.fundSum = obj.catCode2
            ? AC.currencyService.round(obj.fundMonth + obj.fundAddpay, 2)
            : AC.currencyService.round(obj.fundMonth + obj.fundAddpay + (useCoef ? obj.obligatorySum : obj.obligatorySum * obj.quantity), 2)

          positionObjs.push(obj)

          /* Ітоги безпосереднього підрозділу */
          accumSumColumns({ srcObj: obj, destObj: result, withQuantity: true })
          if (isMed) {
            if (staffCatCode && medStaffCats.includes(staffCatCode)) {
              // Категорії: 1 - Лікарі, 2 - Середній медперсонал, 3 - Молодший медперсонал
              let catItem = result.catData.find(itm => itm.code === staffCatCode)
              if (catItem) {
                accumSumColumns({ srcObj: obj, destObj: catItem, withQuantity: true })
                obj.staffCatCodeID = catItem.id
              }
            } else {
              let highEduCount = 0
              const objEmpPos = (empPos.length > 0) && obj.empPosID && empPos.find(itm => itm.ID === obj.empPosID)
              if (objEmpPos && objEmpPos.hasHighEdu) {
                highEduCount += objEmpPos.mtCount || 0
              }
              let otherCount = obj.quantity - highEduCount
              // Інші спеціалісти з в/о
              let cat4Item = result.catData.find(itm => itm.code === undefined && itm.hasHighEdu === true)
              let other4Coef = obj.quantity ? highEduCount / obj.quantity : 0
              accumSumColumns({ srcObj: obj, destObj: cat4Item, quantity: highEduCount, sumCoef: other4Coef, withQuantity: true })
              // Інші
              let cat5Item = result.catData.find(itm => itm.code === undefined && !itm.hasHighEdu)
              let other5Coef = 1 - other4Coef // obj.quantity ? otherCount / obj.quantity : 0
              accumSumColumns({ srcObj: obj, destObj: cat5Item, quantity: otherCount, sumCoef: other5Coef, withQuantity: true })
              obj.staffCatCodeID = highEduCount ? cat4Item.id : cat5Item.id
            }
          } else {
            let catItem = result.catData.find(itm => itm.code === staffCatCode)
            obj.staffCatCode = staffCatCode
            if (catItem) {
              accumSumColumns({ srcObj: obj, destObj: catItem, withQuantity: true })
            }
          }
        })
      }
    })
    // return positionObjs
    if (isMed) {
      positionObjs = _.sortBy(positionObjs, ['staffCatCodeID', 'treePath'])
      if (positionObjs.length && byStaff && positionChiefID) {
        // посаду керівника завжди враховувати у першому підсумковому запису;
        const staffCatCodeID1Row = positionObjs[0].staffCatCodeID
        positionObjs.filter(el => el.isPositionChief).forEach(el => {
          if (el.staffCatCodeID !== staffCatCodeID1Row) {
            let catItemBefore = result.catData.find(itm => itm.id === el.staffCatCodeID)
            let catItemAfter = result.catData.find(itm => itm.id === staffCatCodeID1Row)
            if (catItemBefore) {
              accumSumColumns({ srcObj: el, destObj: catItemBefore, sumCoef: -1, qntCoef: -1 })
            }
            if (catItemAfter) {
              accumSumColumns({ srcObj: el, destObj: catItemAfter })
            }

            el.staffCatCodeID = staffCatCodeID1Row
          }
        })
        // посаду керівника підрозділу завжди виводити першою (в картці підрозділу в атрибуті <Керівник (посада)>
        // визначено посаду керівника відповідного підрозділу);
        positionObjs = _.sortBy(positionObjs, ['staffCatCodeID', 'isPositionChiefOrder', 'treePath'])
      }

      positionObjs = _.groupBy(positionObjs, 'staffCatCodeID')
      let npp = 1
      _.forEach(positionObjs, posItems => {
        const items = joinEmpVacItems(posItems, result)
        items.forEach(obj => {
          if (!obj.isEmpVac || indexInVacancy) {
            obj.indexNum = npp++
          }
          result.data.push(obj)
        })
        if (items[0].staffCatCodeID) {
          let catItem = result.catData.find(itm => itm.id === items[0].staffCatCodeID)
          if (catItem) {
            let catObj = {
              mi_data_id: parentID,
              name: identStr + catItem.nameTotal,
              text: identHtml + catItem.nameTotal,
              isDepartment: false,
              isTotal: true,
              // isCatTotal: true,
              level: level,
              rowStyle: '', // boldRowStyle,
              hasPos: true
            }
            accumSumColumns({ srcObj: catItem, destObj: catObj })
            result.data.push(catObj)
          }
        }
      })
    } else {
      const items = joinEmpVacItems(positionObjs, result)
      result.data.push(...items)
    }
    return result
  }

  function getData (parentID, level = 1) {
    const result = Object.assign({}, {
      level: level,
      data: [],
      catData: _.cloneDeep(catData)
    }, totalColumns)

    const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
    const identStr = HR.reportUtils.getSpaceIdent(false, level)
    const identHtml = HR.reportUtils.getSpaceIdent(true, level)
    const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
    const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''
    let indexNum = 1

    if (isMed) {
      const positionsData = makePositons(undefined, parentID, level, indexNum)
      if (positionsData.data.length) {
        result.data.push(...positionsData.data)
        indexNum += positionsData ? positionsData.data.filter(el => !el.isTotal && (!el.isEmpVac || indexInVacancy)).length : 0
        accumSumColumns({ srcObj: positionsData, destObj: result })
        result.catData.forEach(catItem => {
          let positionsDataCatItem = positionsData.catData.find(itm => itm.id === catItem.id)
          accumSumColumns({ srcObj: positionsDataCatItem, destObj: catItem })
        })
      }
    }

    curStruct.forEach(orgItem => {
      let isDept = orgItem.mi_unityEntity === 'hr_department'
      let obj1 = {
        mi_data_id: orgItem.mi_data_id,
        name: `${orgItem.code || ''}${orgItem.code && orgItem.name ? ' ' : ''}${orgItem.name || ''}`,
        text: isDept ? `${identHtml}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
          : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
        isDepartment: isDept,
        isTotal: false,
        level: level,
        depType: orgItem.depType || '',
        rowStyle: (isDept && level <= 2) ? mainDeptRowStyle : ''
      }

      if (!obj1.isDepartment) {
        if (!isMed) {
          const positionsData = makePositons(orgItem, orgItem.mi_data_id, level, indexNum)
          result.data.push(...positionsData.data)
          accumSumColumns({ srcObj: positionsData, destObj: result })
          result.data = joinEmpVacItems(result.data, result)
          indexNum += positionsData.data ? positionsData.data.filter(el => !el.isTotal && (!el.isEmpVac || indexInVacancy)).length : 0
          result.catData.forEach(catItem => {
            let positionsDataCatItem = positionsData.catData.find(itm => itm.id === catItem.id)
            accumSumColumns({ srcObj: positionsDataCatItem, destObj: catItem })
          })
        }
      } else {
        const subTree = getData(orgItem.mi_data_id, level + 1)
        let hasPos = !!subTree.data.find(itm => itm.isPosition === true && (itm.quantity > 0))
        obj1.hasPos = hasPos
        if (hasPos) {
          result.data.push(obj1)
          result.data.push(...subTree.data)

          let depTypeStr = obj1.depType // cutDepName(obj1.depType)
          let totalName = UB.i18n(`Всього{0}`, depTypeStr ? ' по ' + depTypeStr : '')
          const totalObj = {
            mi_data_id: obj1.mi_data_id,
            name: identStr + totalName,
            text: totalName,
            deptName: obj1.name,
            isDepartment: false,
            isTotal: true,
            isTotal2Rows: true,
            row1: true,
            row2: false,
            level: level,
            hasPos: hasPos,
            quantityBase: subTree.quantityBase,
            quantityAdd: subTree.quantityAdd,
            fundSum: subTree.fundSum,
            basepay: subTree.basepay,
            basepayAdd1: subTree.basepayAdd1,
            basepayAdd2: subTree.basepayAdd2,
            basepayAdd3: subTree.basepayAdd3,
            basepayAdd4: subTree.basepayAdd4,
            basepayAdd5: subTree.basepayAdd5,
            basepayAdd6: subTree.basepayAdd6,
            basepaySum: subTree.basepaySum,
            scienceSum: subTree.scienceSum,
            workexpSum: subTree.workexpSum,
            desertsSum: subTree.desertsSum,
            addpaySum: subTree.addpaySum,
            fundMonth: subTree.fundMonth,
            fundAddpay: subTree.fundAddpay,
            obligatorySum: subTree.obligatorySum,
            rowStyle: (level <= 2) ? mainDeptRowStyle : boldRowStyle,
            borderStyle: 'border-left: 1px solid; border-top: 1px solid; border-right: 1px solid;'
          }
          result.data.push(totalObj)
          const totalObj2 = {
            mi_data_id: obj1.mi_data_id,
            name: obj1.name,
            isDepartment: false,
            isTotal: true,
            isTotal2Rows: true,
            row1: false,
            row2: true,
            level: level,
            hasPos: hasPos,
            rowStyle: boldRowStyle,
            borderStyle: 'border-left: 1px solid; border-bottom: 1px solid; border-right: 1px solid;'
          }
          accumSumColumns({ srcObj: subTree, destObj: totalObj2 })
          result.data.push(totalObj2)
          if (!isMed || level <= 2) {
            subTree.catData.forEach(catItem => {
              if (catItem.quantity) {
                let deptCatTotalObj = {
                  mi_data_id: obj1.mi_data_id,
                  name: identStr + catItem.name,
                  text: identHtml + catItem.name,
                  isDepartment: false,
                  isTotal: true,
                  isCatTotal: true,
                  level: level,
                  rowStyle: '', // boldRowStyle,
                  hasPos: hasPos
                }
                accumSumColumns({ srcObj: catItem, destObj: deptCatTotalObj })
                result.data.push(deptCatTotalObj)
              }
            })
            totalObj2.catData = subTree.catData
          }
          /* Ітоги підпорядкованих підрозділів */
          accumSumColumns({ srcObj: subTree, destObj: result })
          result.catData.forEach(catItem => {
            let subTreeCatItem = subTree.catData.find(itm => itm.id === catItem.id)
            accumSumColumns({ srcObj: subTreeCatItem, destObj: catItem })
          })
        }
      }
    })
    return result
  }

  /* Нижня таблиця ітогів по підрозділам */
  const orgTree = getData(rootID)
  if (isMed) {
    const depts = orgTree.data.filter(orgItem => ((orgItem.isDepartment && orgItem.level === 1) /* Department header */ ||
      (orgItem.isTotal && orgItem.row2 && !orgItem.isCatTotal && orgItem.level <= 2)) && orgItem.hasPos)
    orgTree.totals = []
    let depObjs
    depts.forEach(dept => {
      let isLevel1 = dept.level === 1
      if (dept.isDepartment && isLevel1) {
        orgTree.totals.push({ isTitle: true, name: dept.name }) /* cutDepName(dept.name) */
        depObjs = []
        const depObj = {
          isTitle: false,
          isTotal: false,
          name: dept.name, // cutDepName(dept.name),
          quantity: 0
        }
        catData.forEach(catItem => {
          depObj['quantity' + catItem.id] = 0
        })
        depObjs.push(depObj)
      } else {
        if (depObjs && depObjs.length) {
          depObjs[0].quantity += (isLevel1 ? 1 : -1) * dept.quantity
          if (dept.catData && dept.catData.length > 0) {
            dept.catData.forEach(catItem => {
              depObjs[0]['quantity' + catItem.id] = (depObjs[0]['quantity' + catItem.id] || 0) + (isLevel1 ? 1 : -1) * catItem.quantity
            })
          }
        }

        let totalObj = {
          isTitle: false,
          isTotal: isLevel1,
          name: isLevel1 ? UB.i18n('Всього ') : dept.name, // cutDepName(dept.name),
          quantity: dept.quantity
        }
        if (dept.catData && dept.catData.length > 0) {
          dept.catData.forEach(catItem => {
            totalObj['quantity' + catItem.id] = catItem.quantity
          })
        }

        if (isLevel1) {
          if (depObjs.length > 1) {
            let npp = 1
            for (let i = (depObjs[0].quantity ? 0 : 1); i < depObjs.length; i++) {
              depObjs[i].indexNum = npp++
              orgTree.totals.push(depObjs[i])
            }
          }
          orgTree.totals.push(totalObj)
        } else {
          depObjs.push(totalObj)
        }
      }
    })
  }

  if (!depFilter) {
    let orgTotalName = UB.i18n('РАЗОМ ПО ОРГАНІЗАЦІЇ')
    let orgTotalObj = {
      mi_data_id: rootID,
      name: orgTotalName,
      text: orgTotalName,
      isDepartment: false,
      isTotal: true,
      isTotalAll: true,
      isTotalOrg: true,
      level: 0,
      hasPos: true,
      rowStyle: mainDeptRowStyle
    }
    accumSumColumns({ srcObj: orgTree, destObj: orgTotalObj })
    orgTree.data.push(orgTotalObj)
    orgTree.catData.forEach(catItem => {
      if (catItem.quantity) {
        let orgCatTotalObj = {
          mi_data_id: rootID,
          name: catItem.name,
          text: catItem.name,
          isDepartment: false,
          isTotal: true,
          isTotalAll: true,
          isCatTotal: true,
          level: 0,
          hasPos: true
        }
        accumSumColumns({ srcObj: catItem, destObj: orgCatTotalObj })
        orgTree.data.push(orgCatTotalObj)
      }
    })
    if (isMed) {
      /* Ітоговий рядок таблиці підсумків */
      const orgTotalCatObj = {
        isTitle: false,
        isTotal: true,
        name: UB.i18n(`Всього по {0}`, orgNameDat),
        quantity: orgTree.quantity
      }
      orgTree.catData.forEach(catItem => {
        orgTotalCatObj['quantity' + catItem.id] = catItem.quantity
      })
      orgTree.totals.push(orgTotalCatObj)
    }
    /* В тому числі по самостійним підрозділам */
    const ident1Str = HR.reportUtils.getSpaceIdent(false, 2)
    const ident1Html = HR.reportUtils.getSpaceIdent(true, 2)
    const ident2Str = HR.reportUtils.getSpaceIdent(false, 4)
    const ident2Html = HR.reportUtils.getSpaceIdent(true, 4)
    const depts1 = orgTree.data.filter(orgItem => orgItem.isTotal && orgItem.row2 && !orgItem.isCatTotal && orgItem.level === 1 && orgItem.hasPos)
    depts1.forEach(dept => {
      let deptTotalName = `${dept.name} ${UB.i18n('в т.ч.')}:`
      let orgTotalObj = {
        mi_data_id: dept.mi_data_id,
        name: ident1Str + deptTotalName,
        text: ident1Html + deptTotalName,
        isDepartment: false,
        isTotal: true,
        isTotalAll: true,
        level: 0,
        hasPos: true,
        rowStyle: mainDeptRowStyle
      }
      accumSumColumns({ srcObj: dept, destObj: orgTotalObj })
      orgTree.data.push(orgTotalObj)
      dept.catData.forEach(catItem => {
        if (catItem.quantity) {
          let orgCatTotalObj = {
            mi_data_id: dept.mi_data_id,
            name: ident2Str + catItem.name,
            text: ident2Html + catItem.name,
            isDepartment: false,
            isTotal: true,
            isTotalAll: true,
            isCatTotal: true,
            level: 0,
            hasPos: true
          }
          accumSumColumns({ srcObj: catItem, destObj: orgCatTotalObj })
          orgTree.data.push(orgCatTotalObj)
        }
      })
    })
  }
  return orgTree || {}
}
