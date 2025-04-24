/* global Ext Blob UB UBS _ saveAs $App AC HR appAC */
module.exports = {
  getEmblem,
  getEmpOrder,
  getEmpOrderDet,
  getFullNameCase,
  getResponsiblesIncaseInfo,
  getPosIncaseInfo,
  getPosIncaseInfoAz,
  getPosByEmpOrgIncase,
  getDeptNameIncase,
  getEmpIncaseInfo,
  getFullName,
  getNameParts,
  formatSignerName,
  formatFullName,
  formatShortName,
  getTaskInfo,
  getOrgAddress,
  getCityName,
  getRankInfo,
  getBasePayInfo,
  delRepeatedSpaces,
  replaceEnterToken,
  suffixesOfYears,
  generateReport,
  generatePdf,
  getOrderPrintDocument,
  getOrderReportMenu,
  getTask,
  formatAsCurrency,
  formatAsCurrencyStr,
  formatAsNumberStr,
  roundToCombo,
  reportViewerBtnHiding,
  getOrgBossInfo,
  getRefSignerInfo,
  getRoundToByCode,
  buildRecpartData,
  runExcelReport,
  generateExcelReport,
  getEmpPosInfo,
  getShortFIO,
  runReport,
  fixOrganizationName,
  getPositionName,
  getDepStructName,
  getReportDepStructFld,
  getCalendarHoliday,
  getSliceStrArr,
  isTempVac,
  getUnitsName,
  getDepartmentsName,
  quantityToString,
  getSettingsOrgForPlans,
  getOrgBusinessTypeCode,
  isOrgOfBusinessType,
  getQuantityFractional,
  getRountToByCode,
  getDepartmentTypeNames,
  generateDataForStructReport,
  getDepartmentStructName,
  getStaffAgreedOrgName,
  roundToComboOrgpos,
  getEmpOrderExtract,
  getRespPosition,
  getReasonOrder,
  makePositionName,
  CompareStringUa,
  compareDates,
  clearZeroes,
  checkLastChar,
  getOrderPrintConfig,
  getPosCategories,
  getSpaceIdent,
  generateDataForStructReportByPositionCategory,
  getResponsiblesForOrder,
  getSetParams,
  getSetElements,
  getSetElementIDs,
  addAgeCol,
  getEmpNumDates,
  setFieldsDateType,
  getOrganizationQuery,
  getDepartmentQuery,
  getNameOrganization,
  getNameDepartment,
  getMilitaryRanks,
  funcOrderTreePathSort,
  funcOrderFioTabNumSort,
  setRoundToQuantity,
  getPromiseEmployeePositionForOrders,
  getInfoItemOrderInCase,
  getFullDepartmentNameByTree,
  getPositionNameFromEmployeePositionByParams,
  getInfoFromEmployeePositionByParams,
  removeDuplicateWords,
  formatFullNameInOrder,
  formatShortNameInOrder,
  copyToParams,
  getEmployeeChange,
  checkEmployeeChange
}

function getReportDepStructFld (depFldData, depStructFldData) {
  return depStructFldData || (depFldData && !depStructFldData ? UB.i18n('Не визначено') : '')
}

async function getEmpOrder (orderID, addFieldList, addWhereList) {
  const empOrder = await UB.Repository('hr_empOrder')
    .attrs(['orderDate', 'entryDate'])
    .selectById(orderID)
  const orderDate = (empOrder && (empOrder.orderDate || empOrder.entryDate)) || new Date()
  const onDate = AC.dateService.shiftDate(orderDate)
  let fieldList = ['ID', 'orderNumber', 'orderDate', 'positionType', 'titleOrder', 'preamble', 'organizationID', 'organizationID.name',
    'entryDate', 'organizationID.nameGen', 'organizationID.nameNom', 'organizationID.nameAcc', 'respEmployeePositionID', 'respEmployeeNumID',
    'dictEmpOrderIndexID.code', 'reason', 'respPositionID', 'isAppendix', 'masterOrganizationID', 'masterOrganizationID.nameGen',
    'masterOrganizationID.nameNom', 'masterOrganizationID.name', 'isGroupDepart', 'respEmployeePosition2ID', 'respPosition2ID',
    'sortItems', 'organizationID.treePath', 'masterOrganizationID.treePath', 'organizationID.mi_treePath', 'masterOrganizationID.mi_treePath',
    'documentOrderType', 'empOrderType']
  if (addFieldList) {
    fieldList = fieldList.concat(addFieldList)
    fieldList = _.uniq(fieldList)
  }
  let data = UB.Repository('hr_empOrder')
    .attrs(fieldList)
    .where('organizationID.mi_dateFrom', '<=', onDate)
    .where('organizationID.mi_dateTo', '>=', onDate)
    .where('organizationID.mi_deleteDate', '>=', '#maxdate')
    .where('organizationID.state', '=', 'ACTIVE')
    .where('masterOrganizationID.mi_dateFrom', '<=', onDate)
    .where('masterOrganizationID.mi_dateTo', '>=', onDate)
    .where('masterOrganizationID.mi_deleteDate', '>=', '#maxdate')
    .where('masterOrganizationID.state', '=', 'ACTIVE')
  if (addWhereList) {
    addWhereList.forEach(whereItem => {
      data = data.where(whereItem[0], whereItem[1], whereItem[2])
    })
  }
  const resultData = await data.selectById(orderID)
  if (resultData) {
    resultData.orderDate = resultData.orderDate ? AC.dateService.truncTimeToUtcNull(resultData.orderDate) : null
    resultData.orderNumber = resultData.orderNumber === UB.i18n('(проєкт)') ? '_______' : resultData.orderNumber
    resultData.subOrganization = resultData.organizationID !== resultData.masterOrganizationID
  } else {
    return null
  }
  const mi_treePath = resultData.subOrganization
    ? resultData['masterOrganizationID.mi_treePath']
    : resultData['organizationID.mi_treePath']

  const organizations = mi_treePath ? await UB.Repository('hr_organization')
    .attrs(['name', 'nameNom'])
    .where('state', '=', 'ACTIVE')
    .where('mi_data_id', 'in', (mi_treePath || '').split('/').filter(o => o).map(o => parseInt(o)))
    .misc({ __mip_ondate: onDate })
    .orderBy('mi_treePath', 'desc')
    .limit(2)
    .selectAsObject() : []

  resultData.orderOrganizationName = organizations && organizations.length ? organizations.reverse().map(el => {
    return fixOrganizationName((el.nameNom || el.name).toUpperCase())
  }).join('<br />') : ''

  // check count variant empOrderType in det
  const orderDet = await UB.Repository('hr_empOrderDet')
    .attrs(['empOrderType'])
    .where('empOrderType', '<>', 'TASK')
    .where('orderID', '=', orderID)
    .selectAsObject()
  let empOrderTypes = orderDet && orderDet.length ? _.uniq(orderDet.map(el => el.empOrderType)) : []
  if (empOrderTypes.length > 1) {
    empOrderTypes = empOrderTypes.map(el => {
      if (el === 'MISSION') {
        el = 'MISSION_G'
      }
      if (el === 'APPOINT_MOVE' || el === 'APPOINT_LIQ') {
        el = 'APPOINT'
      }
      return el
    })
    // if some type have showTabNumInPrintForm = 1, use it for all
    let empOrderDetConfig = empOrderTypes.length ? await UB.Repository('hr_empOrderDetConfig')
      .attrs(['showTabNumInPrintForm', 'empOrderType'])
      .where('empOrderType', 'in', empOrderTypes)
      .where('showTabNumInPrintForm', '=', 1)
      .where('organizationID', '=', resultData.organizationID || resultData.masterOrganizationID)
      .selectAsObject() : []
    resultData.showTabNum = !!(empOrderDetConfig && empOrderDetConfig.length)
  } else {
    let empOrderType = (orderDet && orderDet.length ? empOrderTypes[0] : resultData.empOrderType) || ''
    if (empOrderType === 'MISSION') {
      empOrderType = 'MISSION_G'
    }
    if (empOrderType === 'APPOINT_MOVE' || empOrderType === 'APPOINT_LIQ') {
      empOrderType = 'APPOINT'
    }
    const cnfg = await UB.Repository('hr_empOrderDetConfig')
      .attrs(['showTabNumInPrintForm'])
      .where('empOrderType', '=', empOrderType)
      .where('organizationID', '=', resultData.organizationID || resultData.masterOrganizationID)
      .selectSingle()
    resultData.showTabNum = cnfg ? cnfg.showTabNumInPrintForm === true : false
  }
  return resultData
}

async function getEmpOrderDet (orderID, onDate, addFieldList, addWhereList, addDeptInfo, ignoreEmployeePositionID = false) {
  let fieldList = ['ID', 'paraID', 'itemIdx', 'empOrderType', 'employeeID', 'organizationID', 'employeeID.genName',
    'employeeID.datName', 'employeeID.accusativeName', 'employeeID.insName', 'employeeID.locName', 'lastName', 'firstName',
    'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.fullFIO',
    'middleName', 'employeeID.sexType', 'employeePositionID', 'positionID', 'employeeNumberID.tabNum']
  if (addFieldList) {
    fieldList = fieldList.concat(addFieldList)
  }

  onDate = AC.dateService.shiftDate(onDate || new Date())
  let data = UB.Repository('hr_empOrderDet')
    .attrs(fieldList)
    .where('orderID', '=', orderID)

  if (addWhereList) {
    addWhereList.forEach(whereItem => {
      data = data.where(whereItem[0], whereItem[1], whereItem[2], whereItem[3])
    })
  }

  const orderDet = await data.orderBy('itemIdx').selectAsObject()
  if (!orderDet || !orderDet.length) return Promise.resolve(orderDet)
  const useSexType = AC.settings.get('hrUseSexTypeInOrders', orderDet[0].organizationID || appAC.globalOrganization()) === true
  const useActualPositionName = AC.settings.get('hrOrderActualPositionName', orderDet[0].organizationID || appAC.globalOrganization()) === true
  const showPositionCategory = AC.settings.get('hrOrderРositionCategory', orderDet[0].organizationID || appAC.globalOrganization()) === true

  const cases = ['Nom', 'Gen', 'Dat', 'Acc', 'Or', 'Loc', 'Voc']
  const casesF = useSexType ? ['NomF', 'GenF', 'DatF', 'AccF', 'OrF', 'LocF', 'VocF'] : []

  let fieldListHRPosition = ['idxNum', 'name', 'fullName', 'isOrgBoss', 'positionType', 'treePath', 'positionCategory', 'nameAddition',
    'dictMilitaryRankID', 'dictMilitaryRankID.name', 'parentUnitID', 'mi_treePath']
  if (showPositionCategory) {
    fieldListHRPosition.push('positionCategory.name')
  }

  let fieldListEmployeePosition = ['positionID', 'dictPositionID', 'dictPositionID.name', 'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'posNameAddition', 'workPlace']

  fieldListHRPosition.forEach(el => {
    fieldListEmployeePosition.push(`positionID.${el}`)
  })

  cases.concat(casesF).forEach(el => {
    fieldListEmployeePosition.push(`positionID.name${el}`)
    fieldListEmployeePosition.push(`positionID.fullName${el}`)
    fieldListEmployeePosition.push(`dictPositionID.name${el}`)

    fieldListHRPosition.push(`name${el}`)
    fieldListHRPosition.push(`fullName${el}`)
  })

  let fieldDepAdd = []
  if (addDeptInfo) {
    fieldDepAdd = ['idxNum', 'treePath', 'mi_treePath']
    if (fieldListEmployeePosition.indexOf('departmentID') === -1) {
      fieldListEmployeePosition.push('departmentID')
    }
    if (fieldListHRPosition.indexOf('departmentID') === -1) {
      fieldListHRPosition.push('departmentID')
    }

    fieldDepAdd.concat(['name']).forEach(el => {
      fieldListEmployeePosition.push(`departmentID.${el}`)
      fieldListHRPosition.push(`departmentID.${el}`)
    })
    cases.forEach(el => {
      fieldDepAdd.push(`name${el}`)
      fieldListEmployeePosition.push(`departmentID.name${el}`)
      fieldListHRPosition.push(`departmentID.name${el}`)
    })
  }

  if (orderDet.length > 0) {
    await checkEmployeeChange(onDate, ['lastName', 'firstName', 'middleName', 'fullFIO', 'shortFIO', 'genName', 'datName', 'accusativeName', 'insName', 'locName'], orderDet, orderID)

    const employeePositionIDs = ignoreEmployeePositionID
      ? []
      : orderDet.filter(item => item.employeePositionID).map(item => ({
        employeePositionID: item.employeePositionID,
        organizationID: item.organizationID
      }))
    const positionIDs = ignoreEmployeePositionID
      ? orderDet.filter(item => item.positionID).map(item => ({
        positionID: item.positionID,
        organizationID: item.organizationID
      }))
      : orderDet.filter(item => !item.employeePositionID && item.positionID).map(item => ({
        positionID: item.positionID,
        organizationID: item.organizationID
      }))

    const employeePositions = [] // orderDet[i]
    for (let i = 0; i < employeePositionIDs.length; i++) {
      const item = employeePositionIDs[i]
      if (item.employeePositionID && !employeePositions[item.employeePositionID]) {
        employeePositions[item.employeePositionID] = []
        fieldListEmployeePosition.forEach(el => {
          employeePositions[item.employeePositionID]['employeePositionID.' + el] = ''
        })
        for (let k = 0; k < 2; k++) {
          let posInfo = UB.Repository('hr_employeePositionS')
            .attrs(fieldListEmployeePosition)
            .where('ID', '=', item.employeePositionID)
            .where('organizationID', '=', item.organizationID)
            .where('positionID.state', '=', 'ACTIVE')
            .where('positionID.mi_deleteDate', '>=', '#maxdate')
          if (addDeptInfo) {
            posInfo = posInfo.joinCondition('departmentID.mi_dateFrom', '<=', onDate)
              .joinCondition('departmentID.mi_dateTo', '>=', onDate)
              .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
              .joinCondition('departmentID.state', '=', 'ACTIVE')
          }
          if (k === 0) {
            posInfo
              .where('positionID.mi_dateFrom', '<=', onDate)
              .where('positionID.mi_dateTo', '>=', onDate)
          } else {
            posInfo
              .orderBy('positionID.mi_dateFrom', 'desc')
              .orderBy('positionID.mi_dateTo', 'desc')
          }
          const posInfoData = await posInfo.selectSingle()
          if (posInfoData) {
            fieldListEmployeePosition.forEach(el => {
              employeePositions[item.employeePositionID]['employeePositionID.' + el] = posInfoData[el] || ''
            })

            // если у призначення не заполнен departmentID
            if (addDeptInfo && !posInfoData['departmentID'] && posInfoData['positionID.parentUnitID']) {
              const id = posInfoData['positionID.parentUnitID']
              const depNames = await HR.reportUtils.getDepartmentsName([id], ['name'], onDate, item.organizationID, fieldDepAdd)
              employeePositions[item.employeePositionID]['employeePositionID.departmentID'] = posInfoData['positionID.parentUnitID']
              employeePositions[item.employeePositionID]['employeePositionID.departmentID.name'] = depNames[id].name
              fieldDepAdd.forEach(el => {
                employeePositions[item.employeePositionID]['employeePositionID.departmentID.' + el] = depNames[id][el] || ''
              })
            }
            k = 2
          }
        }
      }
    }

    const positions = []
    for (let i = 0; i < positionIDs.length; i++) {
      const item = positionIDs[i]
      if (item.positionID && !positions[item.positionID]) {
        positions[item.positionID] = []
        fieldListHRPosition.forEach(el => {
          // positions[item.positionID]['employeePositionID.positionID.' + el] = ''
          if (el.indexOf('departmentID') === -1) { positions[item.positionID]['positionID.' + el] = '' } else { positions[item.positionID][el] = '' }
        })
        for (let k = 0; k < 2; k++) {
          const posInfo = UB.Repository('hr_position')
            .attrs(fieldListHRPosition)
            .where('ID', '=', item.positionID)
            .where('orgID', '=', item.organizationID)
            .where('state', '=', 'ACTIVE')
            .where('mi_deleteDate', '>=', '#maxdate')
          if (addDeptInfo) {
            posInfo.joinCondition('departmentID.mi_dateFrom', '<=', onDate)
              .joinCondition('departmentID.mi_dateTo', '>=', onDate)
              .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
              .joinCondition('departmentID.state', '=', 'ACTIVE')
          }
          if (k === 0) {
            posInfo
              .where('mi_dateFrom', '<=', onDate)
              .where('mi_dateTo', '>=', onDate)
          } else {
            posInfo
              .orderBy('mi_dateFrom', 'desc')
              .orderBy('mi_dateTo', 'desc')
          }
          const posInfoData = await posInfo.selectSingle()
          if (posInfoData) {
            fieldListHRPosition.forEach(el => {
              // positions[item.positionID]['employeePositionID.positionID.' + el] = posInfoData[el] || ''
              if (el.indexOf('departmentID') === -1) { positions[item.positionID]['positionID.' + el] = posInfoData[el] || '' } else { positions[item.positionID][el] = posInfoData[el] || '' }
            })
            k = 2
          }
        }
      }
    }

    const fulllDepartmentNames = {} // полний перелік назв підрозділів
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      if (!ignoreEmployeePositionID && item.employeePositionID && employeePositions[item.employeePositionID]) {
        fieldListEmployeePosition.forEach(el => {
          item['employeePositionID.' + el] = employeePositions[item.employeePositionID]['employeePositionID.' + el]
        })
        if (useActualPositionName && addDeptInfo && item['employeePositionID.departmentID']) {
          if (fulllDepartmentNames[item['employeePositionID.departmentID']]) {
            item['employeePositionID.departmentID.fullNameGen'] = fulllDepartmentNames[item['employeePositionID.departmentID']]
          } else {
            const fullName = await getFullDepartmentNameByTree(item['employeePositionID.departmentID.mi_treePath'], item.organizationID, onDate)
            fulllDepartmentNames[item['employeePositionID.departmentID']] = fullName
            item['employeePositionID.departmentID.fullNameGen'] = fullName
          }
        }
      } else if ((!item.employeePositionID || ignoreEmployeePositionID) && item.positionID && positions[item.positionID]) {
        fieldListHRPosition.forEach(el => {
          // item['employeePositionID.positionID.' + el] = positions[item.positionID]['employeePositionID.positionID.' + el]
          if (el.indexOf('departmentID') === -1) { item['positionID.' + el] = positions[item.positionID]['positionID.' + el] } else { item[el] = positions[item.positionID][el] }
        })
        if (useActualPositionName && addDeptInfo && item['positionID.parentUnitID']) {
          if (fulllDepartmentNames[item['positionID.parentUnitID']]) {
            item['departmentID.fullNameGen'] = fulllDepartmentNames[item['positionID.parentUnitID']]
          } else {
            const fullName = await getFullDepartmentNameByTree(item['positionID.mi_treePath'], item['organizationID'], onDate)
            fulllDepartmentNames[item['positionID.parentUnitID']] = fullName
            item['departmentID.fullNameGen'] = fullName
          }
        }
      } else {
        fieldListEmployeePosition.forEach(el => {
          item['employeePositionID.' + el] = ''
        })
      }
    }
  }

  return Promise.resolve(orderDet)
}

function getFullNameCase (surName, name, lastName, gender, caseCode, lastNameInUpperCase) {
  /* UBHR-828 - Якщо в картці персони не вказані відмінки, то використовувати називний відмінок */
  return getFullName(surName, name, lastName, lastNameInUpperCase)

  /* if (!caseCode) {
    caseCode = 'gen'
  }
  let nc = HR.nameCase.getNameCase(surName, name, lastName, gender)
  let sName = nc.getSurName(caseCode)
  if (lastNameInUpperCase) {
    sName = sName.toUpperCase()
  } else {
    sName = HR.nameCase.cap(sName)
  }
  return sName + ' ' + HR.nameCase.cap(nc.getName(caseCode)) + ' ' + HR.nameCase.cap(nc.getLastName(caseCode))
  */
}

/*
  empInfo = { 'employeeID.sexType', 'employeeID.genName/datName/accusativeName/insName', 'lastName', 'firstName', 'middleName',
    'employeePositionID.positionID.fullNameGen/Dat/Or', 'employeePositionID.positionID.fullName',
    'employeePositionID.positionID.nameGen/Dat/Or', 'employeePositionID.positionID.name' }
  caseCode = 'gen'/'dat'/'acc'/'ins'
*/

async function getPosIncaseInfoAz (empInfo, orgID) {
  let posName = empInfo['employeePositionID.positionID.fullName'] || empInfo['employeePositionID.positionID.name'] || empInfo['positionID.name']
  let depName = ''
  if (empInfo.positionID) {
    const info = await UB.Repository('hr_staffUnit')
      .attrs(['mi_treePath'])
      .where('ID', '=', empInfo.positionID)
      .selectSingle()
    if (info) {
      const department = await UB.Repository('hr_department')
        .attrs(['name', 'fullName'])
        .where('mi_data_id', 'in', _.compact(info.mi_treePath.split('/')).map(o => Number(o)))
        .where('state', '=', 'ACTIVE')
        .where('orgID', '=', orgID)
        .misc({
          __mip_ondate: appAC.globalApplicationDate()
        })
        .orderBy('mi_treePath')
        .selectAsObject()

      department.forEach(dep => {
        depName += `${depName !== '' ? ' ' : ''}${dep.fullName || dep.name}`
      })
    }
  }
  return `${depName} ${posName}`
}

function getPosIncaseInfo (empInfo, caseCode, lastNameInUpperCase, fullPositionName = true) {
  const useSexType = AC.settings.get('hrUseSexTypeInOrders', empInfo.organizationID || appAC.globalOrganization()) === true
  const useActualPositionName = empInfo['employeePositionID.dictPositionID'] || empInfo['positionID.dictPositionID']
    ? AC.settings.get('hrOrderActualPositionName', empInfo.organizationID || appAC.globalOrganization()) === true
    : false

  fullPositionName = useActualPositionName ? false : fullPositionName
  const result = {}
  let empName
  let posName = fullPositionName
    ? empInfo['employeePositionID.positionID.fullName'] || empInfo['employeePositionID.positionID.name'] || empInfo['positionID.name']
    : empInfo['employeePositionID.positionID.name'] || empInfo['positionID.name']
  let posNameF = posName
  let dictPosName = empInfo['employeePositionID.dictPositionID.name'] || empInfo['positionID.dictPositionID.name']
  let dictPosNameF = dictPosName
  const sexType = empInfo['employeeID.sexType']
  const gender = sexType === 'M' ? 'male' : (sexType === 'W' ? 'female' : 'any')
  caseCode = caseCode.toLowerCase()
  switch (caseCode) {
    case 'nom':
      empName = getFullName(empInfo['employeeID.lastName'], empInfo['employeeID.firstName'], empInfo['employeeID.middleName'], lastNameInUpperCase)
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameNom'] || empInfo['employeePositionID.positionID.nameNom'] || empInfo['positionID.fullNameNom'] || empInfo['positionID.nameNom'] || posName
        : empInfo['employeePositionID.positionID.nameNom'] || empInfo['positionID.nameNom'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameNomF'] || empInfo['employeePositionID.positionID.nameNomF'] || empInfo['positionID.fullNameNomF'] || empInfo['positionID.nameNomF'] || posName
        : empInfo['employeePositionID.positionID.nameNomF'] || empInfo['positionID.nameNomF'] || posName
      dictPosName = empInfo['employeePositionID.dictPositionID.nameNom'] || empInfo['positionID.dictPositionID.nameNom'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameNomF'] || empInfo['positionID.dictPositionID.nameNomF'] || dictPosName
      break
    case 'gen':
      empName = empInfo['employeeID.genName']
      if (!empName) {
        if (empInfo['employeeID.lastName']) {
          empName = getFullNameCase(empInfo['employeeID.lastName'], empInfo['employeeID.firstName'], empInfo['employeeID.middleName'], gender, 'gen', lastNameInUpperCase)
        } else {
          empName = getFullNameCase(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], gender, 'gen', lastNameInUpperCase)
        }
      } else {
        empName = formatFullName(empName, lastNameInUpperCase)
      }
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameGen'] || empInfo['employeePositionID.positionID.nameGen'] || empInfo['positionID.fullNameGen'] || empInfo['positionID.nameGen'] || posName
        : empInfo['employeePositionID.positionID.nameGen'] || empInfo['positionID.nameGen'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameGenF'] || empInfo['employeePositionID.positionID.nameGenF'] || empInfo['positionID.fullNameGenF'] || empInfo['positionID.nameGenF'] || posName
        : empInfo['employeePositionID.positionID.nameGenF'] || empInfo['positionID.nameGenF'] || posName
      dictPosName = empInfo['employeePositionID.dictPositionID.nameGen'] || empInfo['positionID.dictPositionID.nameGen'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameGenF'] || empInfo['positionID.dictPositionID.nameGenF'] || dictPosName
      break
    case 'dat':
      empName = empInfo['employeeID.datName']
      if (!empName) {
        empName = getFullNameCase(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], gender, 'dat', lastNameInUpperCase)
      } else {
        empName = formatFullName(empName, lastNameInUpperCase)
      }
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameDat'] || empInfo['employeePositionID.positionID.nameDat'] || empInfo['positionID.fullNameDat'] || empInfo['positionID.nameDat'] || posName
        : empInfo['employeePositionID.positionID.nameDat'] || empInfo['positionID.nameDat'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameDatF'] || empInfo['employeePositionID.positionID.nameDatF'] || empInfo['positionID.fullNameDatF'] || empInfo['positionID.nameDatF'] || posName
        : empInfo['employeePositionID.positionID.nameDatF'] || empInfo['positionID.nameDatF'] || posName
      dictPosName = empInfo['employeePositionID.dictPositionID.nameDat'] || empInfo['positionID.dictPositionID.nameDat'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameDatF'] || empInfo['positionID.dictPositionID.nameDatF'] || dictPosName
      break
    case 'acc':
      empName = empInfo['employeeID.accusativeName']
      if (!empName) {
        empName = getFullNameCase(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], gender, 'acc', lastNameInUpperCase)
      } else {
        empName = formatFullName(empName, lastNameInUpperCase)
      }
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameAcc'] || empInfo['employeePositionID.positionID.nameAcc'] || empInfo['positionID.fullNameAcc'] || empInfo['positionID.nameAcc'] || posName
        : empInfo['employeePositionID.positionID.nameAcc'] || empInfo['positionID.nameAcc'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameAccF'] || empInfo['employeePositionID.positionID.nameAccF'] || empInfo['positionID.fullNameAccF'] || empInfo['positionID.nameAccF'] || posName
        : empInfo['employeePositionID.positionID.nameAccF'] || empInfo['positionID.nameAccF'] || posName
      dictPosName = empInfo['employeePositionID.dictPositionID.nameAcc'] || empInfo['positionID.dictPositionID.nameAcc'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameAccF'] || empInfo['positionID.dictPositionID.nameAccF'] || dictPosName
      break
    case 'ins':
      empName = empInfo['employeeID.insName']
      if (!empName) {
        empName = getFullNameCase(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], gender, 'ins', lastNameInUpperCase)
      } else {
        empName = formatFullName(empName, lastNameInUpperCase)
      }
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameOr'] || empInfo['employeePositionID.positionID.nameOr'] || empInfo['positionID.fullNameOr'] || empInfo['positionID.nameOr'] || posName
        : empInfo['employeePositionID.positionID.nameOr'] || empInfo['positionID.nameOr'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameOrF'] || empInfo['employeePositionID.positionID.nameOrF'] || empInfo['positionID.fullNameOrF'] || empInfo['positionID.nameOrF'] || posName
        : empInfo['employeePositionID.positionID.nameOrF'] || empInfo['positionID.nameOrF'] || posName
      dictPosName = empInfo['employeePositionID.dictPositionID.nameOr'] || empInfo['positionID.dictPositionID.nameOr'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameOrF'] || empInfo['positionID.dictPositionID.nameOrF'] || dictPosName
      break
    case 'loc':
      empName = empInfo['employeeID.locName']
      if (!empName) {
        empName = getFullNameCase(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], gender, 'loc', lastNameInUpperCase)
      } else {
        empName = formatFullName(empName, lastNameInUpperCase)
      }
      posName = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameLoc'] || empInfo['employeePositionID.positionID.nameLoc'] || empInfo['positionID.fullNameLoc'] || empInfo['positionID.nameLoc'] || posName
        : empInfo['employeePositionID.positionID.nameLoc'] || empInfo['positionID.nameLoc'] || posName
      posNameF = fullPositionName
        ? empInfo['employeePositionID.positionID.fullNameLocF'] || empInfo['employeePositionID.positionID.nameLocF'] || empInfo['positionID.fullNameLocF'] || empInfo['positionID.nameLocF'] || posName
        : empInfo['employeePositionID.positionID.nameLocF'] || empInfo['positionID.nameLocF'] || posName

      dictPosName = empInfo['employeePositionID.dictPositionID.nameLoc'] || empInfo['positionID.dictPositionID.nameLoc'] || dictPosName
      dictPosNameF = empInfo['employeePositionID.dictPositionID.nameLocF'] || empInfo['positionID.dictPositionID.nameLocF'] || dictPosName
      break
    default:
      empName = getFullName(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'], lastNameInUpperCase)
      break
  }
  result.depName = empInfo['employeePositionID.departmentID.nameGen'] || empInfo['employeePositionID.departmentID.name'] || empInfo['departmentID.nameGen'] || empInfo['departmentID.name'] || ''
  result.empName = empName || ''
  result.positionName = useSexType && gender === 'female' ? posNameF || posName || '' : posName || ''
  result.dictPosName = useSexType && gender === 'female' ? dictPosNameF || dictPosName || '' : dictPosName || ''
  result.posName = useActualPositionName ? result.dictPosName : result.positionName
  if (useActualPositionName) {
    const nameAddition = empInfo['employeePositionID.posNameAddition'] || empInfo['positionID.nameAddition'] || ''
    const empCategory = empInfo['employeePositionID.dictEmpCategoryID.genName'] || empInfo['dictEmpCategoryID.genName'] || ''
    result.posName += nameAddition ? (result.posName ? ' ' : '') + nameAddition : ''
    result.posName += empCategory ? (result.posName ? ' ' : '') + empCategory : ''
    result.posName += result.depName ? (result.posName ? ' ' : '') + result.depName : ''
  }
  return result
}

async function getPosByEmpOrgIncase (empInfo, caseCode, onDate) {
  let result = ''
  let employeeID = empInfo.employeeID
  let orgID = empInfo.organizationID || empInfo.orgID
  if (employeeID && orgID) {
    let fieldList = ['positionID.name']
    if (caseCode) {
      caseCode = caseCode.toLowerCase()
      switch (caseCode) {
        case 'nom':
          fieldList.push('positionID.nameNom')
          break
        case 'gen':
          fieldList.push('positionID.nameGen')
          break
        case 'dat':
          fieldList.push('positionID.nameDat')
          break
        case 'acc':
          fieldList.push('positionID.nameAcc')
          break
        case 'ins':
          fieldList.push('positionID.nameOr')
          break
        case 'loc':
          fieldList.push('positionID.nameLoc')
          break
      }
    }
    const posInfo = await UB.Repository('hr_employeePositionS')
      .attrs(fieldList)
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', orgID)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('dateFrom', 'desc')
      .selectAsObject()

    if (posInfo.length) {
      let posItem = posInfo[0]
      result = posItem['positionID.name']
      switch (caseCode) {
        case 'nom':
          result = posItem['positionID.nameNom'] || result
          break
        case 'gen':
          result = posItem['positionID.nameGen'] || result
          break
        case 'dat':
          result = posItem['positionID.nameDat'] || result
          break
        case 'acc':
          result = posItem['positionID.nameAcc'] || result
          break
        case 'ins':
          result = posItem['positionID.nameOr'] || result
          break
        case 'loc':
          result = posItem['positionID.nameLoc'] || result
          break
      }
    }
  }
  return Promise.resolve(result)
}

function getDeptNameIncase (deptInfo, caseCode) {
  let deptName
  caseCode = caseCode.toLowerCase()
  switch (caseCode) {
    case 'nom':
      deptName = deptInfo['employeePositionID.departmentID.nameNom'] || deptInfo['departmentID.nameNom']
      break
    case 'gen':
      deptName = deptInfo['employeePositionID.departmentID.nameGen'] || deptInfo['departmentID.nameGen']
      break
    case 'dat':
      deptName = deptInfo['employeePositionID.departmentID.nameDat'] || deptInfo['departmentID.nameDat']
      break
    case 'acc':
      deptName = deptInfo['employeePositionID.departmentID.nameAcc'] || deptInfo['departmentID.nameAcc']
      break
    case 'ins':
      deptName = deptInfo['employeePositionID.departmentID.nameOr'] || deptInfo['departmentID.nameOr']
      break
    case 'loc':
      deptName = deptInfo['employeePositionID.departmentID.nameLoc'] || deptInfo['departmentID.nameLoc']
      break
  }
  if (!deptName) {
    deptName = deptInfo['employeePositionID.departmentID.name'] || deptInfo['departmentID.name']
  }
  return deptName || ''
}

function getEmpIncaseInfo (empInfo, caseCode, lastNameInUpperCase) {
  let result = {}
  if (!empInfo) {
    return result
  }
  let empName
  caseCode = caseCode.toLowerCase()
  switch (caseCode) {
    case 'nom':
      empName = getFullName(empInfo['employeeID.lastName'], empInfo['employeeID.firstName'], empInfo['employeeID.middleName'] || '', lastNameInUpperCase)
      break
    case 'gen':
      empName = empInfo['employeeID.genName'] || empInfo['genName']
      break
    case 'dat':
      empName = empInfo['employeeID.datName'] || empInfo['datName']
      break
    case 'acc':
      empName = empInfo['employeeID.accusativeName'] || empInfo['accusativeName']
      break
    case 'ins':
      empName = empInfo['employeeID.insName'] || empInfo['insName']
      break
    case 'loc':
      empName = empInfo['employeeID.locName'] || empInfo['locName']
      break
  }
  if (!empName) {
    empName = getFullName(empInfo['employeeID.lastName'], empInfo['employeeID.firstName'], empInfo['employeeID.middleName'] || '', lastNameInUpperCase) ||
            getFullName(empInfo['lastName'], empInfo['firstName'], empInfo['middleName'] || '', lastNameInUpperCase)
  } else {
    empName = formatFullName(empName, lastNameInUpperCase)
  }
  result.empName = empName || ''
  return result
}

async function getResponsiblesIncaseInfo (respEmployeePositionID, onDate, caseCode, toShortName = true, respPositionID) {
  const result = {}
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  if (!respEmployeePositionID) {
    return undefined // result
  }
  let respName
  let respPosID
  let respPos
  let respPosFull
  let respFirstName
  let respEmpName
  let positionType
  if (respEmployeePositionID) {
    const fieldList = ['employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName',
      'positionID.name', 'positionID.fullName', 'positionID.positionType', 'positionID.mi_data_id']
    if (caseCode) {
      caseCode = caseCode.toLowerCase()
      switch (caseCode) {
        case 'nom':
          fieldList.push('positionID.nameNom')
          fieldList.push('positionID.fullNameNom')
          break
        case 'gen':
          fieldList.push('employeeID.genName')
          fieldList.push('positionID.nameGen')
          fieldList.push('positionID.fullNameGen')
          break
        case 'dat':
          fieldList.push('employeeID.datName')
          fieldList.push('positionID.nameDat')
          fieldList.push('positionID.fullNameDat')
          break
        case 'acc':
          fieldList.push('employeeID.accusativeName')
          fieldList.push('positionID.nameAcc')
          fieldList.push('positionID.fullNameAcc')
          break
        case 'ins':
          fieldList.push('employeeID.insName')
          fieldList.push('positionID.nameOr')
          fieldList.push('positionID.fullNameOr')
          break
        case 'loc':
          fieldList.push('employeeID.locName')
          fieldList.push('positionID.nameLoc')
          fieldList.push('positionID.fullNameLoc')
          break
      }
    }
    let respPosInfo
    for (let k = 0; k < 2; k++) {
      respPosInfo = await UB.Repository('hr_employeePositionS')
        .attrs(fieldList)
        .where('ID', '=', respEmployeePositionID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .whereIf(k === 0, 'positionID.mi_dateFrom', '<=', onDate)
        .whereIf(k === 0, 'positionID.mi_dateTo', '>=', onDate)
        .orderBy('positionID.mi_dateFrom', 'desc')
        .orderBy('positionID.mi_dateTo', 'desc')
        .selectAsObject()
      if (respPosInfo && respPosInfo.length) {
        k = 2
      }
    }

    if (respPosInfo.length) {
      const respPosItem = respPosInfo[0]
      positionType = respPosItem['positionID.positionType'] || ''
      if (toShortName) {
        respName = formatSignerName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName'],
          respPosItem['employeeID.middleName'])
      } else {
        respName = getFullName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName'],
          respPosItem['employeeID.middleName'], false)
      }
      respEmpName = getFullName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName'],
        respPosItem['employeeID.middleName'], true)

      if (!caseCode) {
        const posFullName = respPosItem['positionID.fullName']
        respPosFull = posFullName && (posFullName[0].toUpperCase() + posFullName.slice(1))
        respPos = posFullName && (posFullName[0].toUpperCase() + posFullName.slice(1))
      } else {
        respPos = respPosItem['positionID.name']
        respPosFull = respPosItem['positionID.fullName']
      }
      respPosID = respPosItem['positionID.mi_data_id']
      respFirstName = respPosItem['employeeID.firstName'] + (respPosItem['employeeID.lastName'] ? ' ' + respPosItem['employeeID.lastName'].toUpperCase() : '')
      switch (caseCode) {
        case 'nom':
          respPos = respPosItem['positionID.nameNom'] || respPos
          respPosFull = respPosItem['positionID.fullNameNom'] || respPosFull
          break
        case 'gen':
          respName = respPosItem['employeeID.genName'] || respName
          respPos = respPosItem['positionID.nameGen'] || respPos
          respPosFull = respPosItem['positionID.fullNameGen'] || respPosFull
          respEmpName = respPosItem['employeeID.genName'] ? formatFullName(respPosItem['employeeID.genName'], true) : respEmpName
          break
        case 'dat':
          respName = respPosItem['employeeID.datName'] || respName
          respPos = respPosItem['positionID.nameDat'] || respPos
          respPosFull = respPosItem['positionID.fullNameDat'] || respPosFull
          respEmpName = respPosItem['employeeID.datName'] ? formatFullName(respPosItem['employeeID.datName'], true) : respEmpName
          break
        case 'acc':
          respName = respPosItem['employeeID.accusativeName'] || respName
          respPos = respPosItem['positionID.nameAcc'] || respPos
          respPosFull = respPosItem['positionID.fullNameAcc'] || respPosFull
          respEmpName = respPosItem['employeeID.accusativeName'] ? formatFullName(respPosItem['employeeID.accusativeName'], true) : respEmpName
          break
        case 'ins':
          respName = respPosItem['employeeID.insName'] || respName
          respPos = respPosItem['positionID.nameOr'] || respPos
          respPosFull = respPosItem['positionID.fullNameOr'] || respPosFull
          respEmpName = respPosItem['employeeID.insName'] ? formatFullName(respPosItem['employeeID.insName'], true) : respEmpName
          break
        case 'loc':
          respName = respPosItem['employeeID.locName'] || respName
          respPos = respPosItem['positionID.nameLoc'] || respPos
          respPosFull = respPosItem['positionID.fullNameLoc'] || respPosFull
          respEmpName = respPosItem['employeeID.locName'] ? formatFullName(respPosItem['employeeID.locName'], true) : respEmpName
          break
      }
    }
  }

  result.respName = respName || ''
  result.respFirstName = respFirstName || ''
  result.respEmpName = respEmpName
  result.respPosID = respPosID

  // для виконуючих обов'язків
  if (respPositionID && respPosID && respPositionID !== respPosID) {
    const responsAbbr = AC.settings.get('hrResponsAbbr', appAC.globalOrganization()) || UB.i18n('В.о.')

    let respPosition = ''
    let respPositionFull = ''
    let respPositionType = ''
    for (let k = 0; k < 2; k++) {
      const posInfoData = await UB.Repository('hr_position')
        .attrs(['fullNameGen', 'nameGen', 'fullName', 'name', 'positionType'])
        .where('mi_data_id', '=', respPositionID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
        .whereIf(k === 0, 'mi_dateFrom', '<=', onDate)
        .whereIf(k === 0, 'mi_dateTo', '>=', onDate)
        .orderBy('mi_dateFrom', 'desc')
        .orderBy('mi_dateTo', 'desc')
        .selectAsObject()
      if (posInfoData && posInfoData.length) {
        respPosition = posInfoData[0]['nameGen'] || posInfoData[0]['name'] || ''
        respPositionFull = posInfoData[0]['fullNameGen'] || posInfoData[0]['nameGen'] || posInfoData[0]['fullName'] || posInfoData[0]['name'] || ''
        respPositionType = posInfoData[0]['positionType'] || ''
        k = 2
      }
    }
    if (respPosition) {
      result.respPos = responsAbbr + ' ' + respPosition
      result.respPosFull = responsAbbr + ' ' + respPositionFull
      result.positionType = respPositionType
    } else {
      result.respPos = HR.nameCase.cap(respPos || '')
      result.respPosFull = HR.nameCase.cap(respPosFull || respPos || '')
      result.positionType = positionType
    }
  } else {
    result.respPos = HR.nameCase.cap(respPos || '')
    result.respPosFull = HR.nameCase.cap(respPosFull || respPos || '')
    result.positionType = positionType
  }

  return Promise.resolve(result)
}

function getFullName (lastName, firstName, middleName, lastNameInUpperCase = true) {
  if (lastNameInUpperCase) {
    lastName = lastName ? lastName.toUpperCase() : ''
  } else {
    lastName = lastName ? lastName.toLowerCase().split('-').map(HR.nameCase.cap).join('-') : ''
  }
  return (lastName) + (firstName ? ' ' + firstName.trim().toLowerCase().split('-').map(HR.nameCase.cap).join('-') : '') + (middleName ? ' ' + middleName.trim().toLowerCase().split('-').map(HR.nameCase.cap).join('-') : '')
}

function getNameParts (fullName, lastNameInUpperCase) {
  if (!fullName.split) {
    return fullName
  }
  fullName = delRepeatedSpaces(fullName)
  const parts = fullName.split(' ')
  if (lastNameInUpperCase) {
    parts[0] = parts[0].toUpperCase()
  }
  return parts
}

function formatFullName (fullName, lastNameInUpperCase = false, delimiters = [' ', ' ']) {
  fullName = delRepeatedSpaces(fullName)
  const parts = fullName.split(' ')
  let result = parts[0] || ''
  if (lastNameInUpperCase) {
    result = result.toUpperCase()
  } else {
    result = result ? result.toLowerCase().split('-').map(HR.nameCase.cap).join('-') : ''
  }

  if (parts[1]) {
    result += delimiters[0] + parts[1].toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  if (parts[2]) {
    result += delimiters[1] + parts[2].toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  return result
}

function formatShortName (fullName, lastNameInUpperCase, separator = ' ') {
  fullName = delRepeatedSpaces(fullName)
  const parts = fullName.split(' ')
  let result = parts[0]
  if (lastNameInUpperCase) {
    result = result.toUpperCase()
  } else {
    result = result.toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  if (parts[1]) {
    result += separator + parts[1].charAt(0).toUpperCase() + '.'
    if (parts[2]) {
      result += parts[2].charAt(0).toUpperCase() + '.'
    }
  }
  return result
}

function formatSignerName (surName, name, lastName) {
  return (name ? name.charAt(0).toUpperCase() + '. ' : '') + (lastName ? lastName.charAt(0).toUpperCase() + '. ' : '') + (surName ? surName.toUpperCase() : '')
}

async function getTaskInfo (orderID) {
  const data = await UB.Repository('hr_empOrderTaskDet')
    .attrs(['ID', 'itemIdx', 'task', 'respEmployeePositionID'])
    .where('orderID', '=', orderID)
    .orderBy('itemIdx')
    .selectAsObject()
  return Promise.resolve({
    data: data,
    getText: async function (itemID, onDate, noItemIdx, caseCode = 'dat') {
      let result
      let taskDetItem = _.find(data, { ID: itemID })
      if (taskDetItem) {
        let taskText = taskDetItem.task || ''
        let respPosInfo = await getResponsiblesIncaseInfo(taskDetItem.respEmployeePositionID, onDate, caseCode, false)
        let respPos = respPosInfo && respPosInfo.respPos ? ' ' + HR.nameCase.uncap(respPosInfo.respPos) : ''
        let respName = respPosInfo && respPosInfo.respName ? ' ' + respPosInfo.respName : ''
        let itemIdx = noItemIdx ? '' : taskDetItem.itemIdx + '. '
        result = `${itemIdx}${taskText}${respPos}${respName}`
        result = checkLastChar(result, '.')
      }
      return Promise.resolve(result)
    }
  })
}

async function getTask (orderID, onDate, showTabNum, notUseMiddleNameInOrder) {
  const orderData = await UB.Repository('hr_empOrder')
    .attrs(['organizationID', 'organizationID.name', 'organizationID.nameGen', 'masterOrganizationID', 'orderDate', 'entryDate'])
    .where('organizationID.mi_dateFrom', '<=', onDate)
    .where('organizationID.mi_dateTo', '>=', onDate)
    .where('masterOrganizationID.mi_dateFrom', '<=', onDate)
    .where('masterOrganizationID.mi_dateTo', '>=', onDate)
    .selectById(orderID) || {}

  if (!orderData) return {}

  orderData.subOrganization = orderData.organizationID !== orderData.masterOrganizationID
  const orgGen = orderData.subOrganization && (orderData['organizationID.nameGen'] || orderData['organizationID.name'])
    ? ' ' + (orderData['organizationID.nameGen'] || orderData['organizationID.name']) : ''

  const useSexType = AC.settings.get('hrUseSexTypeInOrders', orderData.organizationID || appAC.globalOrganization()) === true
  const tasks = await UB.Repository('hr_empOrderTaskDet')
    .attrs(['ID', 'task', 'employeeID', 'employeeID.fullFIO', 'employeeID.accusativeName', 'employeeID.sexType', 'respEmployeePositionID', 'organizationID', 'positionID'])
    .attrsIf(showTabNum, ['employeeNumberID.tabNum'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  await HR.reportUtils.checkEmployeeChange(onDate, ['fullFIO', 'accusativeName'], tasks)

  if (tasks.length > 0) {
    const employeePositionIDs = tasks.filter(item => item.respEmployeePositionID).map(item => item.respEmployeePositionID)
    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, orderData.masterOrganizationID || orderData.organizationID, orderData.organizationID, orderData.orderDate || orderData.entryDate, ['Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length > 0 ? _.groupBy(employeePosition, 'ID') : []

    const positionIDs = tasks.filter(item => !item.respEmployeePositionID && item.positionID).map(item => item.positionID)
    const positions = await HR.reportUtils.getPositionName(positionIDs, ['fullNameAcc', 'fullName'], orderData.orderDate || orderData.entryDate, orderData.organizationID, ['isOrgBoss'], 'ID')

    for (let i = 0; i < tasks.length; i++) {
      const item = tasks[i]
      item.positionName = ''
      item.employeeName = notUseMiddleNameInOrder
        ? formatFullNameInOrder(item['employeeID.accusativeName'] || item['employeeID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder })
        : item['employeeID.accusativeName'] || item['employeeID.fullFIO'] || ''
      item.empSexType = item['employeeID.sexType']
      item.employeeName += showTabNum && item['employeeNumberID.tabNum'] ? ' ' + UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

      if (item.respEmployeePositionID && employeePosition[item.respEmployeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[item.respEmployeePositionID][0], 'acc', true, notUseMiddleNameInOrder, '')
        item.positionName = posInfo.posName ? posInfo.posName + orgGen + ',' : ''
      } else {
        if (!item.respEmployeePositionID && item.positionID && positions[item.positionID]) {
          item.positionName = HR.reportUtils.makePositionName(positions[item.positionID].name, positions[item.positionID].isOrgBoss)
        }
      }
    }
  }

  return Promise.resolve({
    tasks: tasks
  })
}

async function getOrgAddress (orgID) {
  return UB.Repository('ac_address')
    .attrs(['cityID.name', 'addressType'])
    .where('ownerID', '=', orgID)
    .selectAsObject()
}

async function getCityName (orgID) {
  let orgAddr = await getOrgAddress(orgID)
  let cityname = ((orgAddr && orgAddr[0]) ? orgAddr[0]['cityID.name'] : '') || ''
  if (orgAddr && orgAddr.length) {
    orgAddr = _.groupBy(orgAddr, 'addressType')
    if (orgAddr[2]) {
      cityname = orgAddr[2][0]['cityID.name'] || ''
    } else if (orgAddr[1]) {
      cityname = orgAddr[1][0]['cityID.name'] || ''
    }
  }
  return cityname
}

async function getRankInfo (orderID) {
  return UB.Repository('hr_publServRang')
    .attrs(['employeeID', 'dictRankID.code', 'dictRankID.name', 'dictRankID.printName', 'dateFrom', 'dateTo'])
    .exists(UB.Repository('hr_empOrderDet')
      .correlation('employeeID', 'employeeID')
      .where('orderID', '=', orderID)
      .where('dateTo', '=', '#maxdate')
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
}

/* deprecated, оклад винесено в детальні таблиці наказів */
async function getBasePayInfo (orderID) {
  return UB.Repository('hr_empOrderAcc')
    .attrs(['empOrderDetID', 'accrualSum'])
    .where('empOrderID', '=', orderID)
    .where('payElID.code', '=', '1')
    .selectAsObject()
}

function delRepeatedSpaces (str) {
  str = str || ''
  if (!str.trim) {
    return str
  }
  let result = str.trim()
  let n = result.indexOf('  ')
  while (n >= 0) {
    result = result.replace('  ', ' ')
    n = result.indexOf('  ')
  }
  return result
}

function replaceEnterToken (str) {
  if (!str || !str.replace) {
    return str
  }
  return str.replace('#enter#', '<br/>')
}

function suffixesOfYears (stageOfYears) {
  let suffixe = UB.i18n('років')
  if (!isStageOfYearsExeption(stageOfYears)) {
    suffixe = getSuffixeForNotExeption(stageOfYears)
  }
  return suffixe
}

function isStageOfYearsExeption (stageOfYears) {
  const exeptionYears = [11, 12, 13, 14]
  let includesAnswer = exeptionYears.includes(stageOfYears)
  return includesAnswer
}

function getSuffixeForNotExeption (stageOfYears) {
  let suffixe
  let lastDigit = stageOfYears % 10
  switch (lastDigit) {
    case 1:
      suffixe = UB.i18n('рік')
      break
    case 2:
    case 3:
    case 4:
      suffixe = UB.i18n('роки')
      break
    default:
      suffixe = UB.i18n('років')
  }
  return suffixe
}

async function generateReport (repName, orderID, caller, params = {}) {
  let data = await UB.Repository('ubs_report')
    .attrs(['ID', 'report_code', 'name', 'template', 'code', 'model'])
    .where('[report_code]', '=', repName)
    .selectSingle()
  if (!data) {
    repName = 'hr_empOrderEmpty'
  }

  let report = Ext.create('UBS.UBReport', {
    code: repName,
    type: 'html',
    params: {
      instanceID: orderID,
      caller: caller,
      params: params
    }
  })
  return report.init()
    .then(function () {
      return report.makeReport()
    })
    .then(function (data) {
      if (data && data.reportData) {
        return data.reportData
      } else {
        return UB.i18n('<h1>Не знайдено шаблону звіту</h1>')
      }
    })
}

/**
 *
 * @param html
 * @param repName
 * @param pageConfig
 * @param {String} [resultType=blob] bin|blob
 * @returns {Promise<Blob>}
 */
function generatePdf (html, repName, pageConfig, resultType) {
  let report = Ext.create('UBS.UBReport', {
    code: repName
  })
  report.onTransformConfig = function (config) {
    _.merge(config, pageConfig, {})
    config.align = 'center'
    config.listeners = {
      initColontitle: function (pdf, result) {
        if (result.colontitle.isTop && pdf.pageNumber !== 1) {
          pdf.setFontType('TimesNewRoman', 'Normal')
          pdf.setFontSize(14)
          pdf.writeSimpleText({
            isXml: false,
            text: pdf.pageNumber,
            align: 'center',
            top: pdf.page.innerSize.topColon - 8.5,
            left: pdf.page.innerSize.left,
            width: pdf.page.innerSize.width,
            noChangePosition: true,
            noCheckPage: true,
            verticalAlign: 'top'
          })
        }
      }
    }
    return config
  }

  if (pageConfig.pageOrientation) {
    report.reportOptions.pageOrientation = pageConfig.pageOrientation
  }
  return report.transformToPdf(html
    .replace(/strong>/g, 'b>')
    .replace(/padding: 0px 1px 0px 1px;/g, 'padding: 0px 5px 0px 5px;')
    .replace(/height: 15px;/g, 'height: 16px;')
    .replace(/height: 48px;/g, 'height: 49px;')
    .replace(/height: 41px;/g, 'height: 42px;')
    .replace(/line-height: 1.1/g, 'line-height: 1.12')
    .replace(/line-height: 1.35/g, 'line-height: 1.39')
    .replace(/data-style-pdf/g, 'style')
  )

    // .replace(/margin: 10px 10px 0px 70px;/g, 'margin: 0px 10px 0px 70px;'))
    .then(data => {
      if (resultType === 'bin') return data
      data = new Blob([data], {
        type: 'application/pdf'
      })
      return data
    })
}

async function getOrderPrintDocument (orderForm, code, type, reportCode, config) {
  let saveResult = await orderForm.saveForm()
  if (saveResult === -1) {
    return
  }
  config = config || {}
  orderForm.setLoading(true)
  $App.connection.run({
    entity: 'hr_empOrder',
    method: type === 'docx' ? 'docPrintForm' : 'repPrintForm',
    params: {
      code: code,
      type: type,
      reportCode: reportCode,
      instanceID: orderForm.instanceID,
      onDate: appAC.globalApplicationDate(),
      orgID: appAC.globalOrganization()
    }
  }).then(function (result) {
    switch (type) {
      case 'docx':
        if (result.docs) {
          let docs = JSON.parse(result.docs)
          _.forEach(docs, function (item) {
            const fileContent = JSON.parse(item.fileContent)
            const contentLength = fileContent.length
            const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
            const filename = item.fileName + '.docx'
            for (let i = 0; i < contentLength; i++) {
              pdfArray[i] = fileContent.charCodeAt(i)
            }
            const dBlob = new Blob([pdfArray], { type: 'application/msword' })
            saveAs(dBlob, filename)
          })
        }
        break
      case 'excel':
        let repConfig = _.merge({
          cmdType: 'showReport',
          cmdData: {
            reportCode: reportCode,
            reportType: 'html',
            reportOptions: {
              allowExportToExcel: true
            }
          },
          callback: (reportViewer) => {
            const report = reportViewer.report
            report.onAfterRender = function () {
              if (config.paramFormReadOnly) {
                const paramForm = reportViewer.paramForm
                paramForm && AC.viewUtils.setFormReadOnly(paramForm, true, [], true)
              }
            }
          },
          tabId: 'report_' + reportCode + '_' + (orderForm.instanceID || 0),
          target: $App.getViewport().centralPanel
        }, config)
        $App.doCommand(repConfig)
        break
      case 'pdf':
        let report = Ext.create('UBS.UBReport', {
          code: reportCode,
          type: 'html',
          params: {
            instanceID: orderForm.instanceID,
            employeeID: orderForm.instanceID
          }
        })
        report.init().then(function () {
          let repConfig = {
            cmdType: 'showForm',
            formCode: 'ac_documentViewer',
            caption: UB.i18n('Друкована форма'),
            cmpInitConfig: { report: report },
            tabId: 'printDocument' + orderForm.report_code + orderForm.instanceID,
            description: orderForm.initialConfig.commandConfig.description,
            target: $App.getViewport().centralPanel
          }
          $App.doCommand(repConfig)
        })
        break
      case 'pdfpdf':
        let reportPdf = Ext.create('UBS.UBReport', _.merge({
          code: reportCode,
          type: 'pdf',
          params: {
            instanceID: orderForm.instanceID,
            employeeID: orderForm.instanceID
          }
        }, config))
        reportPdf.init().then(function () {
          let repConfig = {
            cmdType: 'showForm',
            formCode: 'ac_documentViewer',
            caption: UB.i18n('Друкована форма'),
            cmpInitConfig: { report: reportPdf },
            tabId: 'printDocument' + orderForm.report_code + orderForm.instanceID,
            description: orderForm.initialConfig.commandConfig.description,
            target: $App.getViewport().centralPanel
          }
          $App.doCommand(repConfig)
        })
        break
    }
  }).then(function () {
    orderForm.setLoading(false)
  })
}

function getOrderReportMenu (menu, empOrderType, orderForm) {
  if (!orderForm) {
    return
  }

  function getShowIfFn (ifPosted) {
    return function (c, form) {
      const orderState = form.record && form.record.get('orderState')
      return ifPosted ? orderState === 'POSTED' : orderState !== 'POSTED'
    }
  }
  function getShowIfEmpOrderType (type) {
    return function (c, form) {
      const value = form.record && form.record.get('empOrderType')
      return value === type
    }
  }
  const orderUpdateMenu = {
    STAFFLIST: {
      oldText: UB.i18n('Формувати'),
      newText: UB.i18n('Наказ')
    },
    STAFFLISTACCRUAL: {
      oldText: UB.i18n('Формувати'),
      newText: UB.i18n('Наказ')
    }
  }
  const orderPrintMenu = {
    STAFFLISTACCRUAL: [
      {
        text: UB.i18n('Штатний розпис'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplan', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                staffTableReadOnly: true,
                staffTableID: orderForm.record.get('docType') === 'ACCRUAL_CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate')),
                docInfo: orderForm.record.get('docInfo') || '',
                ecoPrint: (orderForm.attr.ecoPrint && orderForm.attr.ecoPrint.getValue()) || false
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Перелік змін'),
        iconCls: 'iconDoc',
        handler: function () {
          const recData = orderForm.record.data
          let staffTableID = null
          if (orderForm.entityName === 'hr_empOrder' && recData.hasOwnProperty('staffTableID')) {
            staffTableID = recData.staffTableID || 0
          } else {
            staffTableID = orderForm.instanceID
          }
          if (!staffTableID) {
            $App.dialogInfo(UB.i18n('Не заповнено поле <Штатний розпис>'), UB.i18n('Увага'))
            return
          }
          const repConfig = {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                orderID: orderForm.instanceID,
                staffTableID: orderForm.entityName === 'hr_empOrder' ? staffTableID : null,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate')),
                docInfo: orderForm.record.get('docInfo') || '',
                ecoPrint: (orderForm.attr.ecoPrint && orderForm.attr.ecoPrint.getValue()) || false
              }
            }
          }
          if (!orderForm.isEditMode) {
            orderForm.saveForm().then(result => {
              if (result !== -1) {
                getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanChanges', repConfig)
              }
            })
          } else {
            getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanChanges', repConfig)
          }
        }
      },
      {
        text: UB.i18n('Список працівників'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, 'orgplanAccrualEmployeeList', 'excel', 'hr_orgplanAccrualEmployeeList', {
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Список посад'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, 'orgplanAccrualPositionList', 'excel', 'hr_orgplanAccrualPositionList', {
            cmdData: {
              reportParams: {
                showCurrentAccrual: true,
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      }
    ],
    STAFFLIST: [
      {
        text: UB.i18n('Штатний розпис'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(false),
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplan', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                staffTableReadOnly: true,
                staffTableID: orderForm.record.get('docType') === 'CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate')),
                docInfo: orderForm.record.get('docInfo') || '',
                ecoPrint: (orderForm.attr.ecoPrint && orderForm.attr.ecoPrint.getValue()) || false,
                printSubTitle: orderForm.attr.printSubTitle ? orderForm.attr.printSubTitle.getValue() : true
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Штатний розпис з нарахуваннями'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(false),
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanWithAccrual', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                staffTableReadOnly: true,
                staffTableID: orderForm.record.get('docType') === 'CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate')),
                docInfo: orderForm.record.get('docInfo') || ''
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Перелік змін'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(false),
        handler: function () {
          const recData = orderForm.record.data
          let staffTableID = null
          if (orderForm.entityName === 'hr_empOrder' && recData.hasOwnProperty('staffTableID')) {
            staffTableID = recData.staffTableID || 0
            if (!staffTableID) {
              $App.dialogInfo(UB.i18n('Не заповнено поле <Штатний розпис>'), UB.i18n('Увага'))
              return
            }
          } else {
            staffTableID = orderForm.instanceID
            if (!staffTableID) {
              $App.dialogInfo(UB.i18n('Не заповнено поле <Штатний розпис>'), UB.i18n('Увага'))
              return
            }
          }
          const repConfig = {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                orderID: orderForm.instanceID,
                staffTableID: orderForm.entityName === 'hr_empOrder' ? staffTableID : null,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate')),
                docInfo: orderForm.record.get('docInfo') || '',
                ecoPrint: (orderForm.attr.ecoPrint && orderForm.attr.ecoPrint.getValue()) || false,
                printSubTitle: orderForm.attr.printSubTitle ? orderForm.attr.printSubTitle.getValue() : true
              }
            }
          }
          if (!orderForm.isEditMode) {
            orderForm.saveForm().then(result => {
              if (result !== -1) {
                getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanChanges', repConfig)
              }
            })
          } else {
            getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanChanges', repConfig)
          }
        }
      },
      {
        text: UB.i18n('Попередження про скорочення'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'pdfpdf', 'hr_printNoticeLiquidation', {
            params: {
              empOrderType: orderForm.record.get('empOrderType'),
              staffTableID: orderForm.record.get('docType') === 'CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
              orderID: orderForm.instanceID,
              onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
            }
          })
        }
      },
      {
        text: UB.i18n('Перелік посад працівників, що виконують функції обслуговування'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_reportServicePosList', {
            cmdData: {
              reportParams: {
                staffTableID: orderForm.record.get('docType') === 'CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
                orderDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Звіт щодо кількості посад у штатному розписі'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgPlanPosCounts', {
            cmdData: {
              reportParams: {
                staffTableID: orderForm.record.get('docType') === 'CHANGES' ? orderForm.instanceID : orderForm.record.get('staffTableID') || orderForm.instanceID,
                orderDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Таблиця змін'),
        iconCls: 'iconDoc',
        showIf: getShowIfEmpOrderType('STAFFTABLE'),
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanChangesOrg', {
            cmdData: {
              reportParams: {
                staffTableID: orderForm.instanceID,
                orderDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Перегляд зміна окладів (з групуванням)'),
        iconCls: 'iconDoc',
        showIf: getShowIfEmpOrderType('STAFFTABLE'),
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanSalaryChange', {
            cmdData: {
              reportParams: {
                staffTableID: orderForm.instanceID,
                orderDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              },
              reportOptions: {
                showParamForm: true,
                allowExportToExcel: true,
                isModal: false
              }
            }
          })
        }
      }
    ],
    TARIFFING: [
      {
        text: UB.i18n('Тарифікаційний список'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_tariffingPlan', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Штатний розпис з доплатами та надбавками (по видам нарахувань)'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_TypicalOrgPlanByPayGroup', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('entryDate')),
                orgID: orderForm.record.get('orgID'),
                respPositionID: orderForm.record.get('respPositionID'),
                respEmployeePositionID: orderForm.record.get('respEmployeePositionID'),
                childDepID: orderForm.record.get('departmentID'),
                reportKind: 'tariffing'
              },
              reportOptions: {
                showParamForm: true,
                allowExportToExcel: true,
                isModal: false
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Список змін тарифікації'),
        iconCls: 'iconDoc',
        // showIf: getShowIfFn(true),
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_tariffingPlanChanges', {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('entryDate'))
              }
            }
          })
        }
      }
    ],
    ORGSTRUCTURE: [
      {
        text: UB.i18n('Структура організації'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgPlanCounts', {
            paramFormReadOnly: false,
            cmdData: {
              reportParams: {
                entityName: 'hr_staffTableOrgStructure',
                staffTableID: orderForm.record.get('orderState') === 'POSTED' ? orderForm.record.get('staffTableOrgStructureID') || orderForm.instanceID : orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Перелік змін'),
        iconCls: 'iconDoc',
        handler: function () {
          const recData = orderForm.record.data
          if (recData.hasOwnProperty('staffTableOrgStructureID')) {
            if (!recData.staffTableOrgStructureID && recData.orderState === 'POSTED') {
              $App.dialogInfo(UB.i18n('Не заповнено поле <Структура>'), UB.i18n('Увага'))
              return
            }
          }

          const repConfig = {
            // paramFormReadOnly: true,
            cmdData: {
              reportParams: {
                orderID: orderForm.instanceID,
                entityName: 'hr_staffTableOrgStructure',
                // staffTableID: recData.orderState === 'POSTED' ? orderForm.record.get('staffTableOrgStructureID') || orderForm.instanceID : orderForm.instanceID,
                // staffTableID: orderForm.instanceID, // recData.staffTableOrgStructureID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          }
          if (!orderForm.isEditMode) {
            orderForm.saveForm().then(result => {
              if (result !== -1) {
                getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanOrgChanges', repConfig)
              }
            })
          } else {
            getOrderPrintDocument(orderForm, empOrderType, 'excel', 'hr_orgplanOrgChanges', repConfig)
          }
        }
      }
    ],
    APPOINT: [
      {
        text: UB.i18n('Присяга'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(true),
        handler: function () {
          getOrderPrintDocument(orderForm, 'empOrderOath', 'docx')
        }
      },
      {
        text: UB.i18n('Зобов\'язання'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(true),
        handler: function () {
          getOrderPrintDocument(orderForm, 'empOrderCommitment', 'docx')
        }
      },
      {
        text: UB.i18n('Пам\'ятка'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(true),
        handler: function () {
          getOrderPrintDocument(orderForm, 'empOrderCivilMemo', 'docx')
        }
      }
    ],
    BOUNTY: [
      {
        text: UB.i18n('Додаток до наказу'),
        iconCls: 'iconDoc',
        showIf: getShowIfFn(false),
        handler: function () {
          getOrderPrintDocument(orderForm, 'empOrderBounty', 'excel', 'hr_orderBountyAnnex', {
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: orderForm.record.get('orderDate') || orderForm.record.get('entryDate'),
                orgID: orderForm.record.get('organizationID.mi_data_id')
              }
            }
          })
        }
      }
    ],
    VACATIONAPSCHED: [
      {
        text: UB.i18n('Додаток до наказу'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, 'empOrderVacationapschedAdd', 'excel', 'hr_empOrderVacationapschedAdd', {
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID
              }
            }
          })
        }
      }
    ],
    STUFFMOTION: [
      {
        text: UB.i18n('Умови проведення конкурсу на посаду'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, empOrderType, 'pdf', 'hr_reqStuffTerms', {
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID,
                onDate: AC.dateService.shiftDate(orderForm.record.get('orderDate') || orderForm.record.get('entryDate'))
              }
            }
          })
        }
      }
    ],
    CHGSALARY: [
      {
        text: UB.i18n('Список працівників'),
        iconCls: 'iconDoc',
        handler: function () {
          getOrderPrintDocument(orderForm, 'reportChgsalary', 'excel', 'hr_reportChgsalary', {
            cmdData: {
              reportParams: {
                instanceID: orderForm.instanceID
              }
            }
          })
        }
      }
    ]
  }
  const updateMenu = orderUpdateMenu[empOrderType]
  if (updateMenu) {
    if (updateMenu.oldText) {
      const itemToUpdate = _.find(menu, { text: updateMenu.oldText })
      if (itemToUpdate) {
        itemToUpdate.text = updateMenu.newText
      }
    }
  }
  const addMenu = orderPrintMenu[empOrderType]
  if (addMenu) {
    menu.push(...addMenu)
  }
}

function getEmblem () {
  return `data:image/jpeg;base64,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`
}

function formatAsCurrency (value, decimalsLength = 2, separator = ',', allowZero = true, thousandSeparator = '&nbsp;') {
  return AC.currencyService.formatAsCurrencyEx(value, decimalsLength, separator, allowZero, thousandSeparator)
}

function formatAsCurrencyStr (value, decimalsLength = 2, separator = ',', allowZero = true, thousandSeparator = ' ') {
  return value > 0 ? AC.currencyService.formatAsCurrencyEx(value, decimalsLength, separator, allowZero, thousandSeparator) : ''
}

function formatAsNumberStr (value) {
  if (!value) {
    return ''
  }
  if (typeof value !== 'string') {
    value = value.toString()
  }
  return value.replace('.', ',')
}

function roundToCombo (cfg) {
  cfg = cfg || {}
  const roundValues = cfg.simpleRound
    ? [
      {
        id: 2,
        value: UB.i18n('До копійок')
      },
      {
        id: 0,
        value: UB.i18n('До гривні')
      }
    ]
    : [
      {
        id: 2,
        value: UB.i18n('До копійок')
      },
      {
        id: 1,
        value: UB.i18n('До десятків копійок')
      },
      {
        id: 0,
        value: UB.i18n('До гривні')
      },
      {
        id: -1,
        value: UB.i18n('До десятків гривень')
      },
      {
        id: -2,
        value: UB.i18n('До сотень гривень')
      },
      {
        id: -3,
        value: UB.i18n('До тисяч гривень')
      }
    ]
  let res = {
    xtype: 'combobox',
    name: 'roundToCombo',
    fieldLabel: UB.i18n('Округлювати суму'),
    labelWidth: 120,
    editable: false,
    width: 300,
    store: Ext.create('Ext.data.Store', {
      fields: ['id', 'value'],
      data: roundValues
    }),
    displayField: 'value',
    valueField: 'id',
    defaultValue: 2,
    listeners: {
      afterrender: function (ctrl) {
        let organizationID = appAC.globalOrganization()
        const form = ctrl.up('form')
        if (form) {
          const organizationCtrl = form.down('[name=organizationID]')
          organizationID = organizationCtrl ? organizationCtrl.getValue() || appAC.globalOrganization() : appAC.globalOrganization()
        }
        UB.Repository('ac_settingsOrg')
          .attrs(['value', 'constantID.code'])
          .where('organizationID', '=', organizationID)
          .where('[constantID.code]', '=', 'hrRoundAccrualStaffTable')
          .selectSingle()
          .then(res => {
            res && res.value === '1' ? this.setValue(2) : res && res.value === '3' ? this.setValue(0)
              : /* res ? this.setValue(Number(res.value)) : */ this.setValue(this.defaultValue)
          })
      }
    }
  }
  return _.merge(res, cfg)
}

function roundToComboOrgpos (cfg) {
  cfg = cfg || {}
  let res = {
    xtype: 'combobox',
    name: 'roundToCombo',
    fieldLabel: UB.i18n('Округлювати суму'),
    labelWidth: 120,
    editable: false,
    width: 300,
    store: Ext.create('Ext.data.Store', {
      fields: ['id', 'value'],
      data: [
        {
          id: 2,
          value: UB.i18n('До копійок')
        },
        {
          id: 1,
          value: UB.i18n('До десятків копійок')
        },
        {
          id: 0,
          value: UB.i18n('До гривні')
        },
        {
          id: -1,
          value: UB.i18n('До десятків гривень')
        },
        {
          id: -2,
          value: UB.i18n('До сотень гривень')
        },
        {
          id: -3,
          value: UB.i18n('До тисяч гривень')
        },
        {
          id: 3,
          value: UB.i18n('До одного')
        },
        {
          id: 4,
          value: UB.i18n('До десяти')
        },
        {
          id: 5,
          value: UB.i18n('До ста')
        },
        {
          id: 6,
          value: UB.i18n('До тисячі')
        },
        {
          id: 7,
          value: UB.i18n('До десяти тисяч')
        },
        {
          id: 8,
          value: UB.i18n('До ста тисяч')
        }
      ]
    }),
    displayField: 'value',
    valueField: 'id',
    defaultValue: 2,
    listeners: {
      afterrender: function (ctrl) {
        if (this.defValSettingsOrg) {
          const form = ctrl.up('form')
          const organizationCtrl = form.down('[name=organizationID]')
          const organizationID = organizationCtrl.getValue() || appAC.globalOrganization()
          UB.Repository('ac_settingsOrg')
            .attrs(['value', 'constantID.code'])
            .where('organizationID', '=', organizationID)
            .where('[constantID.code]', '=', 'hrRoundAccrualStaffTable')
            .selectSingle({
              'constantID.code': 'code'
            }).then(res => {
              res && res.value === '1' ? this.setValue(2) : res && res.value === '2' ? this.setValue(1)
                : res ? this.setValue(Number(res.value)) : this.setValue(this.defaultValue)
            })
        } else {
          this.setValue(this.defaultValue)
        }
      }
    }
  }
  return _.merge(res, cfg)
}

/* ReportViewer: приховується панель з кнопками "Друкувати", "Excel", якщо звіт ще не формувався */
function reportViewerBtnHiding () {
  let onBoxReady = UBS.ReportViewer.prototype.onBoxReady
  UBS.ReportViewer.prototype.onBoxReady = function () {
    let me = this
    onBoxReady = onBoxReady.bind(me)
    onBoxReady()
    if (me.items && me.items.items) {
      let container = me.items.items[0]
      if (container && container.items && container.items.items) {
        let prntBtnPanel = container.items.items[1]
        if (prntBtnPanel) {
          let showReport = me.showReport.bind(me)
          me.showReport = function (data) {
            showReport(data)
            prntBtnPanel.show()
          }
          prntBtnPanel.hide()
        }
      }
    }
  }
}

/* Отримання даних про керівника організації
  Params: orgID, onDate,
  addFieldList - додаткові поля, які треба отримати по базовій сутності hr_employeePosition */
function getOrgBossInfo (orgID, onDate, addFieldList) {
  orgID = orgID || appAC.globalOrganization()
  onDate = (onDate && new Date(onDate)) || appAC.globalApplicationDate()
  let fieldList = ['ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.fullFIO', 'positionID.name']
  if (addFieldList) {
    fieldList = fieldList.concat(addFieldList)
  }
  return UB.Repository('hr_employeePositionS')
    .attrs(fieldList)
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.isOrgBoss', '=', 1)
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .selectSingle()
}

/* Отримання даних про підписувача довідок організації
  Params: orgID, onDate,
  addFieldList - додаткові поля, які треба отримати по базовій сутності hr_orgRespPosition */
function getRefSignerInfo (orgID, onDate, ctrl, addFieldList, respPosition = 'mainChief', onlyRespPosition = false) {
  orgID = orgID || appAC.globalOrganization()
  onDate = (onDate && new Date(onDate)) || appAC.globalApplicationDate()
  let fieldList = ['ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.fullFIO',
    'employeeID.shortFIO', 'positionID.name', 'positionID']
  if (addFieldList) {
    fieldList = fieldList.concat(addFieldList)
  }
  let positionsList = []

  function checkStore () {
    if (ctrl) {
      if (!positionsList.length) {
        ctrl.getStore().ubRequest.whereList.positionID = {
          expression: '[positionID]',
          condition: '=',
          value: 0
        }
      } else {
        ctrl.getStore().ubRequest.whereList.positionID = {
          expression: '[positionID]',
          condition: 'in',
          value: positionsList.map(o => o)
        }
      }
    }
  }

  return UB.Repository('hr_orgRespPosition')
    .attrs('positionID')
    .where('organizationID', '=', orgID)
    .whereIf(onlyRespPosition, 'respPosition', '=', respPosition)
    .whereIf(!onlyRespPosition, 'respPosition', 'in', [respPosition, 'signer4Ref'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .orderBy('respPosition')
    .selectAsObject().then(positions => {
      if (positions.length && positions[0].positionID) {
        positions = positions.map(o => o.positionID)
        positionsList = positionsList.concat(positions)
        checkStore()
        return UB.Repository('hr_employeePositionS')
          .attrs(fieldList)
          .where('organizationID', '=', orgID)
          .where('positionID', 'in', positions)
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .joinCondition('employeeID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('positionID.state', '=', 'ACTIVE')
          .joinCondition('positionID.mi_dateFrom', '<=', onDate)
          .joinCondition('positionID.mi_dateTo', '>=', onDate)
          .selectAsObject().then(employeePositions => {
            if (employeePositions.length > 0) {
              return employeePositions[0]
            } else {
              return null
            }
          })
      } else {
        checkStore()
        return null
      }
    })
}

function getRoundToByCode (code) {
  const rounds = {
    '1': 2,
    '2': 1,
    '3': 2,
    '4': 3
  }
  return rounds[code]
}

async function buildRecpartData (orderID, respEmployeeNumID, orderDateSrc, needEmployee) {
  const result = {
    orderDate: null,
    orderYear: null,
    respName: '',
    rec1Name: '',
    rec1NameDep: '',
    rec1OrderYear: '',
    recs: [],
    recsVerification: [],
    fams: []
  }

  const orderDate = orderDateSrc ? new Date(orderDateSrc) : new Date()
  const orderYear = orderDate ? orderDate.getFullYear() : null
  const allData = await getRecpartAll(orderID, ['VISA', 'ONLAW'])

  result.orderDate = AC.dateService.getStringFormatDate(orderDate, '', '')
  result.orderYear = orderYear
  // const taks = allData.taks ? _.groupBy(allData.taks, 'participantID') : []
  let haveFirstRec = false
  for (let i = 0; i < allData.recparticipant.length; i++) {
    const ite = allData.recparticipant[i]
    const info = await getEmpPosInfo(ite.employeePosition, orderDate, false, '. ')
    // if (taks[ite.ID] && taks[ite.ID].length > 0 && taks[ite.ID][0].isVerificationAct) {
    if (ite['recStageID.stageKind'] === 'ONLAW') {
      result.recsVerification.push({
        name: info.name,
        nameDep: info.nameDep,
        orderYear: '20__' // orderYear
      })
    } else {
      if (!haveFirstRec) {
        haveFirstRec = true
        result.rec1Name = info.name
        result.rec1NameDep = info.nameDep
        result.rec1OrderYear = '20__' // orderYear
      } else {
        result.recs.push({
          name: info.name,
          nameDep: info.nameDep,
          orderYear: '20__' // orderYear
        })
      }
    }
  }

  if (allData.fams.length > 0) {
    if (needEmployee) {
      const flt = allData.fams.filter(e => e.employeeID)
      const arr = _.uniq(flt.map(e => e.employeeID))
      if (arr && arr.length > 0) {
        let employeeData = await UB.Repository('hr_employee')
          .attrs(['ID', 'shortFIO', 'lastName', 'firstName', 'sexType'])
          .whereIf(arr.length > 0, 'ID', 'in', arr)
          .whereIf(arr.length === 1, 'ID', '=', arr[0])
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectAsObject()
        if (employeeData && employeeData.length > 0) {
          employeeData = _.groupBy(employeeData, 'ID')
          flt.forEach(item => {
            const name = employeeData[item.employeeID]
              ? `${employeeData[item.employeeID][0]['firstName'] ? employeeData[item.employeeID][0]['firstName'].charAt(0).toUpperCase() + '. ' : ''} ${employeeData[item.employeeID][0]['lastName'] || ''}`
              : ''
            result.fams.push({
              famName: name,
              famSexType: employeeData[item.employeeID] ? employeeData[item.employeeID][0]['sexType'] : '',
              orderYear: '20__'
            })
          })
        }
      }
    }
    await Promise.all(allData.fams.filter(e => e.employeePositionID).map(async (ite) => {
      const famPosInfo = await getEmpPosInfo(ite.employeePositionID, orderDate, false, '. ')
      if (famPosInfo) {
        result.fams.push({
          famName: famPosInfo.name,
          famSexType: famPosInfo.sexType,
          orderYear: '20__'
        })
      }
    }))
  }

  const respPosInfo = await getEmpNumInfo(respEmployeeNumID, orderDate)
  if (respPosInfo) {
    result.respName = respPosInfo.name
  }
  return result
}

async function getEmpPosInfo (employeePositionID, onDate, needMiddleName = true, separator = '.') {
  function formatSignerName (surName, name, lastName, separator) {
    return (name ? name.charAt(0).toUpperCase() + (separator || '.') : '') + (lastName ? lastName.charAt(0).toUpperCase() + (separator || '.') : '') + (surName || '')
  }

  const result = {
    name: '',
    namePos: '',
    nameFullPos: '',
    nameDep: '',
    fullNameDep: '',
    sexType: ''
  }
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  if (!employeePositionID) {
    return result
  }
  let respName
  let respFullName
  let respPos
  let respDepName
  let sexType
  let respFullPos

  if (employeePositionID) {
    const fieldList = ['employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'positionID', 'positionID.name', 'employeeID.sexType',
      'employeeID.fullFIO', 'organizationID', 'positionID.mi_dateFrom', 'positionID.fullName']
    let respPosInfo
    for (let k = 0; k < 2; k++) {
      respPosInfo = await UB.Repository('hr_employeePositionS')
        .attrs(fieldList)
        .where('ID', '=', employeePositionID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .whereIf(k === 0, 'positionID.mi_dateFrom', '<=', onDate)
        .whereIf(k === 0, 'positionID.mi_dateTo', '>=', onDate)
        .orderBy('positionID.mi_dateFrom', 'desc')
        .orderBy('positionID.mi_dateTo', 'desc')
        .selectAsObject()
      if (respPosInfo && respPosInfo.length) {
        k = 2
      }
    }

    if (respPosInfo.length > 0) {
      const respPosItem = respPosInfo[0]
      respFullName = respPosItem['employeeID.fullFIO']
      respName = formatSignerName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName'],
        needMiddleName ? respPosItem['employeeID.middleName'] : '', separator)
      respDepName = await getDepStructName(respPosItem['positionID'], respPosItem['organizationID'], onDate)
      respPos = respPosItem['positionID.name']
      respFullPos = respPosItem['positionID.fullName']
      sexType = respPosItem['employeeID.sexType']
    }
  }
  result.fullName = respFullName || ''
  result.name = respName || ''
  result.namePos = respPos || ''
  result.nameFullPos = respFullPos || ''
  result.nameDep = respDepName ? respDepName.name || '' : ''
  result.fullNameDep = respDepName ? respDepName.fullName || '' : ''
  result.sexType = sexType || ''
  return result
}

async function getEmpNumInfo (respEmployeeNumID, onDate) {
  function formatSignerName (lastName, name) {
    return (name ? name.charAt(0).toUpperCase() + '.' : '') + (lastName || '')
  }

  const result = {
    name: '',
    namePos: '',
    nameDep: ''
  }
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  if (!respEmployeeNumID) {
    return result
  }

  if (respEmployeeNumID) {
    const respPosInfo = await UB.Repository('hr_employeeNumberS')
      .attrs(['employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'posName', 'depName'])
      .where('ID', '=', respEmployeeNumID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()

    if (respPosInfo.length > 0) {
      const respPosItem = respPosInfo[0]
      result.name = formatSignerName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName']) || ''
      result.namePos = respPosItem['depName'] || ''
      result.nameDep = respPosItem['posName'] || ''
    }
  }
  return result
}

async function getRecparticipant (orderID, stageKind = []) {
  return UB.Repository('hr_recparticipant')
    .attrs([
      'ID',
      'docID',
      'recStageID',
      'positionID',
      'executionTerm',
      'executionDate',
      'executionComment',
      'resolution',
      'resolutionText',
      'employeePosition',
      'plannedEmployeePosition',
      'plannedOrgUnitCaption',
      'recStageID.stageKind'
    ])
    .where('docID', '=', orderID)
    .whereIf(stageKind && stageKind.length === 1, 'recStageID.stageKind', '=', stageKind[0])
    .whereIf(stageKind && stageKind.length > 1, 'recStageID.stageKind', 'in', stageKind)
    .where('recStageID.entityName', '=', 'hr_recstage')
    .orderBy('ID')
    .selectAsObject()
    .then((listRecparticipant) => {
      return listRecparticipant
    })
}

async function getTaskConsideration (orderID) {
  return UB.Repository('hr_task')
    .attrs(['docID', 'participantID', 'isVerificationAct'])
    .where('docID', '=', orderID)
    .where('participantID.recStageID.entityName', '=', 'hr_recstage')
    .orderBy('ID')
    .selectAsObject()
    .then((listRecparticipant) => {
      return listRecparticipant
    })
}

async function getFams (orderID) {
  return UB.Repository('hr_acquaintanceList')
    .attrs([
      'ID',
      'orderID',
      'employeeID',
      'employeePositionID'
    ])
    .where('orderID', '=', orderID)
  // .where('evaluationType', '=', 'SIGN')
    .selectAsObject()
    .then((list) => {
      return list
    })
}

async function getRecstage (orderID) {
  return UB.Repository('hr_recstage')
    .attrs(['docID', 'orderIndex', 'mi_wfState', 'stageKind', 'stagePosition', 'resolutionText'])
    .where('docID', '=', orderID)
    .where('entityName', '=', 'hr_recstage')
    .selectAsObject()
    .then((listRecstage) => {
      return listRecstage
    })
}

async function getRecpartAll (orderID, stageKind) {
  const recparticipant = await getRecparticipant(orderID, stageKind)
  const recstage = await getRecstage(orderID)
  const fams = await getFams(orderID)
  const taks = await getTaskConsideration(orderID)
  return {
    recparticipant,
    recstage,
    fams,
    taks
  }
}

function runExcelReport (fileName, params) {
  $App.connection.run({
    entity: 'hr_report',
    method: 'generateXlsx',
    fileName: fileName,
    params: JSON.stringify(params)
  }).then(({ content }) => {
    const fileContent = JSON.parse(content)
    const contentLength = fileContent.length
    const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
    for (let i = 0; i < contentLength; i++) {
      pdfArray[i] = fileContent.charCodeAt(i)
    }
    const dBlob = new Blob([pdfArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(dBlob, fileName)
  }, function (err) {
    throw err
  })
}

function generateExcelReport (entity, method, fileName, params, me) {
  me && me.setLoading(true)
  $App.connection.run({
    entity: entity,
    method: method,
    params: JSON.stringify(params)
  }).then(repObj => {
    let report = JSON.parse(repObj.resp)
    AC.filesService.saveAsByBase64Buffer(report, fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }).finally(() => {
    me && me.setLoading(false)
  })
}

function getShortFIO (fullFIO) {
  if (!fullFIO) return ''
  fullFIO = fullFIO.replace(/\s+/g, ' ').trim()
  const lastName = fullFIO.split(' ')[0]
  let firstName = fullFIO.split(' ')[1] || ''
  let middleName = fullFIO.split(' ')[2] || ''
  if (firstName) {
    firstName = firstName.substr(0, 1).toUpperCase() + '.'
  }
  if (middleName) {
    middleName = middleName.substr(0, 1).toUpperCase() + '.'
  }
  return (lastName + ' ' + firstName + '' + middleName).trim()
}

function runReport (reportCode, params, caption, description, uniqueId) {
  const report = Ext.create('UBS.UBReport', {
    code: reportCode,
    type: 'html',
    params: params
  })
  report.init().then(function () {
    const config = {
      cmdType: 'showForm',
      formCode: 'ac_documentViewer',
      caption: caption || UB.i18n('Друкована форма'),
      cmpInitConfig: { report: report },
      tabId: 'printDocument_' + reportCode + '_' + uniqueId,
      description: description,
      target: $App.getViewport().centralPanel
    }
    $App.doCommand(config)
  })
}

function fixOrganizationName (name) {
  return name ? name.replace(/&&/g, '<br />').replace(/\r\n/g, '<br />').replace(/\r/g, '<br />').replace(/\n/g, '<br />') : ''
}

/*
* arrayIDs - Массив mi_data_id ( или ID)
* fieldName - поле, по которому будет выборка
* attArray - название сущностей (+ алтернативные) которые нужно веруть. Вернется первое заполенное. Например ['fullNameGen', 'nameGen', 'name']
* * additionaAtt - ддополнительные название сущностей, назчения которых нужно вернуть

 */
async function getPositionName (arrayIDs, attArray, pDate, pOrgID, additionaAtt = [], fieldName = 'mi_data_id') {
  if (!arrayIDs || !attArray) {
    return null
  }
  pDate = pDate || appAC.globalApplicationDate()
  const positions = {}
  arrayIDs = _.uniq(arrayIDs)
  const atts = attArray
  if (additionaAtt && additionaAtt.length) {
    atts.push(...additionaAtt)
  }

  for (let i = 0; i < arrayIDs.length; i++) {
    for (let k = 0; k < 2; k++) {
      const empPosition = UB.Repository('hr_position')
        .attrs(atts)
        .where(fieldName, '=', arrayIDs[i] || 0)
        .whereIf(pOrgID, 'orgID', '=', pOrgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
      if (k === 0) {
        empPosition.misc({ __mip_ondate: pDate })
      } else {
        empPosition
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }
      const empPositionData = await empPosition.selectAsObject()
      let positionName = ''
      if (empPositionData && empPositionData.length > 0) {
        attArray.forEach(el => {
          if (!positionName) {
            positionName = empPositionData[0][el] || ''
          }
        })
        positions[arrayIDs[i]] = { name: positionName }
        additionaAtt.forEach(el => {
          positions[arrayIDs[i]][el] = empPositionData[0][el]
        })

        k = 2
      }
    }
  }
  return positions
}

async function getDepStructName (positionID, orgID, onDateSql) {
  const result = {
    name: '',
    fullName: ''
  }
  if (!positionID) return result

  const info = await UB.Repository('hr_staffUnit')
    .attrs(['mi_treePath'])
    .where('ID', '=', positionID)
    .selectSingle()
  if (info) {
    const department = await UB.Repository('hr_department')
      .attrs(['name', 'fullName'])
      .where('mi_data_id', 'in', _.compact(info.mi_treePath.split('/')).map(o => Number(o)))
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', orgID)
      .misc({
        __mip_ondate: onDateSql
      })
      .orderBy('mi_treePath')
      .selectAsObject()
    if (department && department.length > 0) {
      result.name = department[0].name || ''
      result.fullName = department[0].fullName || ''
    }
  }
  return result
}

async function getCalendarHoliday (dateFrom, dateTo, orgID) {
  function includes (arr, dt) {
    let res = false
    if (arr && arr.length) {
      res = !!arr.find(item => { return item.getTime() === dt.getTime() })
    }
    return res
  }
  if (!dateFrom || !dateTo || dateFrom > dateTo) {
    return []
  }

  const calendarHoliday = await UB.Repository('hr_calendarHoliday').attrs(['dayHoliday', 'monthHoliday.code', 'yearHoliday', 'dateFrom', 'dateTo'])
    .where('yearHoliday', '>=', dateFrom.getFullYear(), 'yearFrom')
    .where('yearHoliday', '<=', dateTo.getFullYear(), 'yearTo')
    .where('yearHoliday', 'isNull', undefined, 'yearNull')
    .where('dateFrom', '<=', dateTo, 'dateFrom')
    .where('dateTo', '>=', dateFrom, 'dateTo')
    .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
  // condition by orgID {
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .exists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org'
    ).notExists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg'
    )
  // condition by orgID }
    .logic('(([yearFrom] and [yearTo]) or ([yearNull])) and (([dateFrom]) or [dateFromIsNull]) and (([dateTo]) or [dateToIsNull])' +
            ' AND (([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))' // condition by orgID
    )
    .selectAsObject()

  if (!calendarHoliday || calendarHoliday.length === 0) {
    return []
  }

  const result = []
  calendarHoliday.forEach(holiday => {
    holiday.dateFrom = (holiday.dateFrom && AC.dateService.shiftDate(holiday.dateFrom)) || AC.dateService.minDate()
    holiday.dateTo = (holiday.dateTo && AC.dateService.shiftDate(holiday.dateTo)) || AC.dateService.maxDate()
    if (holiday.yearHoliday) {
      const date = AC.dateService.shiftDate(new Date(holiday.yearHoliday, holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
      if ((dateFrom <= date) && (dateTo >= date) && !includes(result, date) && holiday.dateFrom <= date && date <= holiday.dateTo) {
        result.push(date)
      }
    } else {
      let dt = AC.dateService.shiftDate(new Date(dateFrom.getFullYear(), holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
      while (dt <= dateTo) {
        if ((dateFrom <= dt) && (dateTo >= dt) && !includes(result, dt) && holiday.dateFrom <= dt && dt <= holiday.dateTo) {
          result.push(dt)
        }
        dt = AC.dateService.addYears(dt, 1)
      }
    }
  })

  result.sort((date1, date2) => {
    if (date1 < date2) {
      return -1
    }
    if (date1 > date2) {
      return 1
    }

    return 0
  })
  return Promise.resolve(result)
}

function getSliceStrArr (strData, arrLength) {
  const re = /\s(\S*)$/
  const res = []
  const resFull = []
  let start = 0
  let end = 0
  let failedReg = 0

  for (let i = 0; i < arrLength.length; i++) {
    end = arrLength[i] + start
    let str = strData.slice(start, end + 1)

    if (str.length < arrLength[i] + 1) {
      start = strData.length
      end = strData.length + 1
      res.push(str)
      continue
    }

    const arrRegResult = re.exec(str)
    if (arrRegResult) {
      if (arrRegResult[1].length === 0) {
        str = strData.slice(start, end)
        res.push(str)
        start = end + 1
      }
      if (arrRegResult[1].length > 0) {
        end = end - (str.length - arrRegResult['index'] - 1)
        str = strData.slice(start, end)
        res.push(str)
        start = end + 1
      }
    } else {
      res.push('')
      failedReg++
    }
  }
  if (failedReg > 1) {
    arrLength.forEach(len => {
      end = len + start
      const str = strData.slice(start, end)
      resFull.push(str)
      start = end
    })
    resFull.push(strData.slice(start))
    return resFull
  } else {
    res.push(strData.slice(start))
    return res
  }
}

function isTempVac (vacancyDateFrom, vacancyDateTo, onDate) {
  if (vacancyDateFrom && !_.isDate(vacancyDateFrom)) {
    vacancyDateFrom = AC.dateService.shiftDate(vacancyDateFrom)
  }
  if (vacancyDateTo && !_.isDate(vacancyDateTo)) {
    vacancyDateTo = AC.dateService.shiftDate(vacancyDateTo)
  }
  if (!_.isDate(onDate)) {
    onDate = AC.dateService.shiftDate(onDate)
  }
  return (vacancyDateFrom || vacancyDateTo) && (((vacancyDateFrom && vacancyDateFrom <= onDate) || (!vacancyDateFrom)) &&
        ((vacancyDateTo && vacancyDateTo >= onDate) || (!vacancyDateTo)))
}

/*
* arrayIDs - Массив mi_data_id
* attArray - название сущностей (+ алтернативные) которые нужно веруть. Вернется первое заполенное. Например ['fullNameGen', 'nameGen', 'name']
 */
async function getUnitsName (arrayIDs, attArray, pDate, pOrgID) {
  if (!arrayIDs || !attArray) {
    return null
  }
  pDate = pDate || appAC.globalApplicationDate()
  const positions = {}
  arrayIDs = _.uniq(arrayIDs)
  for (let i = 0; i < arrayIDs.length; i++) {
    for (let k = 0; k < 2; k++) {
      const empPosition = UB.Repository('hr_staffUnit')
        .attrs(attArray)
        .where('mi_data_id', '=', arrayIDs[i] || 0)
        .whereIf(pOrgID, 'orgID', '=', pOrgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
      if (k === 0) {
        empPosition.misc({ __mip_ondate: pDate })
      } else {
        empPosition
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }
      const empPositionData = await empPosition.selectAsObject()
      let positionName = ''
      if (empPositionData && empPositionData.length > 0) {
        attArray.forEach(el => {
          if (!positionName) {
            positionName = empPositionData[0][el] || ''
          }
        })
        k = 2
      }
      positions[arrayIDs[i]] = { name: positionName }
    }
  }
  return positions
}

/*
* arrayIDs - Массив mi_data_id
* attArray - название сущностей (+ алтернативные) которые нужно веруть. Вернется первое заполенное. Например ['fullNameGen', 'nameGen', 'name']
* additionaAtt - ддополнительные название сущностей, назчения которых нужно вернуть
 */
async function getDepartmentsName (arrayIDs, attArray, pDate, pOrgID, additionaAtt = []) {
  if (!arrayIDs || !attArray) {
    return null
  }
  pDate = pDate || appAC.globalApplicationDate()
  const departments = {}
  arrayIDs = _.uniq(arrayIDs)
  const atts = attArray
  if (additionaAtt && additionaAtt.length) {
    atts.push(...additionaAtt)
  }
  for (let i = 0; i < arrayIDs.length; i++) {
    departments[arrayIDs[i]] = { name: '' }
    for (let k = 0; k < 2; k++) {
      const department = UB.Repository('hr_department')
        .attrs(atts)
        .where('mi_data_id', '=', arrayIDs[i] || 0)
        .whereIf(pOrgID, 'orgID', '=', pOrgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
      if (k === 0) {
        department.misc({ __mip_ondate: pDate })
      } else {
        department
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }
      const empPositionData = await department.selectAsObject()
      let departmentName = ''
      if (empPositionData && empPositionData.length > 0) {
        attArray.forEach(el => {
          if (!departmentName) {
            departmentName = empPositionData[0][el] || ''
          }
        })
        departments[arrayIDs[i]].name = departmentName

        additionaAtt.forEach(el => {
          departments[arrayIDs[i]][el] = empPositionData[0][el]
        })
        k = 2
      }
    }
  }
  return departments
}

function quantityToString (value, dec, separator = ',', thousandSeparator = '&nbsp;') {
  if (dec === 'numberGroup') {
    return value === undefined ? '' : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator).replace('.', separator)
  } else {
    return value === undefined ? '' : value.toFixed(dec === 'decimal1' ? 1 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator).replace('.', separator)
  }
}

async function getSettingsOrgForPlans (organizationID = appAC.globalOrganization()) {
  const result = {
    showTotals: !AC.settings.get('hrTotalsOnlyIndepStructUnit', organizationID),
    roundTo: AC.settings.get('hrRoundAccrualStaffTable', organizationID) === '1' ? 'decimal2' : 'numberGroup',
    roundToQuantity: '',
    boldMainDep: AC.settings.get('hrStaffReportMainDepInBold', organizationID),
    autoSetDepIdxNum: AC.settings.get('hrAutoSetDepIdxNum', organizationID),
    hrFuncOrgType: AC.settings.get('hrFuncOrgType', organizationID),
    namePosition: AC.settings.get('hrStaffReportNamePosition', organizationID),
    hrStaffReportShowAccrual: AC.settings.get('hrStaffReportShowAccrual', organizationID),
    twoApprover: AC.settings.get('hrTwoApproverInStaffTable', organizationID) === true,
    shortNamePayEl: AC.settings.get('hrShortNamePayEl', organizationID) === true,
    separateRounding: AC.settings.get('hrSeparateRounding', organizationID) === true
  }

  const roundToQuantity = AC.settings.get('hrStaffUnitQuantityRound', organizationID)
  if (roundToQuantity) {
    switch (roundToQuantity) {
      case '1':
        result.roundToQuantity = 'numberGroup'
        break
      case '2':
        result.roundToQuantity = 'decimal1'
        break
      case '3':
        result.roundToQuantity = 'decimal2'
        break
      default:
        result.roundToQuantity = ''
        break
    }
  }

  return result
}

async function getOrgBusinessTypeCode (orgID) {
  const orgBusinessTypeID = AC.settings.get('hrOrgBusinessType', orgID || appAC.globalOrganization()) || null
  const orgBusinessType = await UB.Repository('cdn_orgbusinesstype').attrs('ID', 'code').selectById(orgBusinessTypeID) || {}
  return orgBusinessType.code
}

async function isOrgOfBusinessType (orgID, businessTypeCode) {
  let orgBusinessTypeCode = await getOrgBusinessTypeCode(orgID)
  return businessTypeCode === orgBusinessTypeCode
}

function getQuantityFractional (value) {
  if (value === undefined || value % 1 === 0) {
    return 'numberGroup'
  }
  const splited = value.toString().split(/[.,]+/)
  if (splited.length === 1) {
    return 'numberGroup'
  }
  return splited[1].length === 1 ? 'decimal1' : 'decimal2'
}

function getRountToByCode (code) {
  return code === 'numberGroup' ? 0 : code === 'decimal1' ? 1 : 2
}

async function getDepartmentTypeNames (orgIDs, onDate, departmentID, addFields) {
  let attrs = ['ID', 'dictDepTypeID.name', 'dictDepTypeID.nameGen']
  if (addFields && addFields.length) {
    attrs.push(...addFields)
  }
  return UB.Repository('hr_department')
    .attrs(attrs)
    .where('orgID', 'in', orgIDs)
    .whereIf(departmentID, 'mi_treePath', 'like', '/' + departmentID + '/')
    .misc({ __mip_ondate: onDate })
    .joinCondition('dictDepTypeID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
}

/*
  showLevelTotals: 0 без итогов, 1 - итоги 1го уровня , 2 -  все итоги
*/
function generateDataForStructReport (reportName, organizationID, itemID, orgStruct, positionData, accrualData, groupJobsPrint, roundTo,
  roundToQuantity, showLevelTotals = 0, showDeptCodes = false, dontSumChildPos = true,
  compareFact = false, boldMainDep = false, showWokers = false,
  paData = [], showAccrual = false, namePosition = false, colSpan = 1, showNn = false, fontSize = 14,
  shortNamePayEl = false, separateRounding = false) {
  if (!orgStruct || !orgStruct.length) return {}
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  const sumRoundTo = roundTo === 'numberGroup' ? 0 : 2
  const qntRoundTo = HR.reportUtils.getRountToByCode(roundToQuantity)
  const isOrgCountsReport = reportName === 'orgCounts'

  function getData (indexNpp, parentID, level = 1) {
    const result = {
      data: [],
      roundTo: roundTo,
      quantity: 0,
      quantityHighLevel: 0,
      basepay: 0,
      basepay5: 0,
      fundSum: 0
    }
    if (compareFact) result.quantityFact = 0

    const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
    const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
    let styleBegin = ''
    let styleEnd = ''
    if (level === 1) {
      styleBegin = '<font color="blue">' + (isOrgCountsReport ? '<b>' : '')
      styleEnd = (isOrgCountsReport ? '</b>' : '') + '</font>'
    }
    if (level === 2 && !isOrgCountsReport) {
      styleBegin = '<u>'
      styleEnd = '</u>'
    }
    curStruct.forEach(orgItem => {
      const quantity = !roundToQuantity ? orgItem.quantity || 0 : AC.currencyService.round(orgItem.quantity || 0, qntRoundTo)
      const qntFact = compareFact && !roundToQuantity ? orgItem.quantityFact || 0 : AC.currencyService.round(orgItem.quantityFact || 0, qntRoundTo)
      const isDept = orgItem.mi_unityEntity === 'hr_department'

      const comp2 = isDept && reportName === 'orgCounts' && level > 1 && boldMainDep && orgItem['dictDepTypeID.code'] === '2' && orgItem['departmentKindID.code'] === '2'
      const customStyleBegin = comp2 ? '<font color="#274059"><i><b>' : ''
      const customStyleEnd = comp2 ? '</b></i></font>' : ''

      let obj = {
        showAccrual: showAccrual,
        showNn: showNn,
        colSpan: colSpan,
        fontSize: fontSize,
        parentID: parentID,
        needAdd: isOrgCountsReport ? (isDept || orgItem.parentUnitID === itemID) : true,
        roundTo: roundTo,
        code: orgItem.code,
        name: orgItem.mi_unityEntity === 'hr_department' ? `${str}${customStyleBegin || styleBegin}${showDeptCodes && orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
          : HR.nameCase.cap(orgItem.name || '')}${customStyleEnd || styleEnd}` : '',
        isDepartment: isDept,
        isTotal: false,
        depType: orgItem.depType || '',
        quantity: isOrgCountsReport && isDept ? quantity : 0,
        roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(orgItem.mi_unityEntity === 'hr_department' ? quantity || 0 : 0),
        basepay: 0,
        basepay5: 0,
        fundSum: 0,
        basepayQuantity: 0,
        basepay5Quantity: 0,
        infoArray: [],
        info: ''
      }
      if (compareFact) obj.quantityFact = orgItem.mi_unityEntity === 'hr_department' ? qntFact : 0

      if (!obj.isDepartment) {
        const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
        if (posItem) {
          obj.KPcode = posItem['dictPositionID.dictProfessionID.code'] || ''
          obj.name = namePosition
            ? HR.nameCase.cap(posItem['name'] || '')
            : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
          obj.paymentType = posItem.paymentType === 'CONTRACT' ? UB.i18n('Згідно умов трудового договору') : ''
          obj.positionCategorySortOrder = posItem['positionCategory.sortOrder'] || 9999999
          obj.positionCategory = posItem['positionCategory'] || ''
          obj.positionCategoryName = posItem['positionCategory.name'] || ''

          let qnt = (posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0
          qnt = !roundToQuantity ? qnt : AC.currencyService.round(qnt, qntRoundTo)
          // const qnt = !roundToQuantity ? posItem.quantity || 0 : AC.currencyService.round(posItem.quantity || 0, qntRoundTo)

          let accrualItem = accrualData.find(item => item.dictPositionID === posItem.dictPositionID &&
                        item.positionID === posItem.ID && item.staffTableAccrualID &&
                        ((posItem.dictStatePayID && item.dictStatePayID === posItem.dictStatePayID && item.positionType === posItem.positionType) ||
                            (!posItem.dictStatePayID && !item.dictStatePayID && item.positionType === posItem.positionType)))

          accrualItem = accrualItem || accrualData.find(item => item.dictPositionID === posItem.dictPositionID &&
                        !item.staffTableAccrualID &&
                        ((posItem.dictStatePayID && item.dictStatePayID === posItem.dictStatePayID && item.positionType === posItem.positionType) ||
                            (!posItem.dictStatePayID && !item.dictStatePayID && item.positionType === posItem.positionType)))

          let basepay = (accrualItem && _.isNumber(accrualItem.accrualSum)) ? accrualItem.accrualSum : (_.isNumber(orgItem.accrualSum) ? orgItem.accrualSum : 0)
          //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
          basepay = posItem.paymentType === 'CONTRACT' ? 0 : basepay
          basepay = AC.currencyService.round(notShowSalary ? 0 : (basepay || 0), sumRoundTo)
          let basepay5 = 0
          let basepay5Quantity = 0
          if (showAccrual) {
            const paDataFlt = paData.filter(item => item.positionID === posItem.ID)
            if (paDataFlt && paDataFlt.length && posItem.paymentType !== 'CONTRACT') {
              _.forEach(paDataFlt, item => {
                const value = AC.currencyService.round(item.calcSum || 0, sumRoundTo) // getSum(item.accrualSum, item.accrualRate, basepay)
                const qRate = item.accrualRate ? HR.reportUtils.getQuantityFractional(item.accrualRate) : ''
                const payName = shortNamePayEl ? item.shortPayElName || item.payElName || '' : item.payElName || ''
                obj.infoArray.push(
                  // (item.payElShortName ? (item.payElShortName + ' ') : (item.payElName ? item.payElName + ' ' : '')) +
                  (payName ? payName + ' ' : '') +
                  (item.accrualRate
                    ? HR.reportUtils.quantityToString(item.accrualRate, qRate) + `&nbsp;% (${HR.reportUtils.quantityToString(value, roundTo)}${UB.i18n('&nbsp;грн')})`
                    : HR.reportUtils.quantityToString(value, roundTo) + UB.i18n('&nbsp;грн')))
                basepay5 += notShowSalary ? 0 : value
                basepay5Quantity += AC.currencyService.round((notShowSalary ? 0 : value) * qnt, sumRoundTo)
              })
            }
          }
          const fundSum = notShowSalary
            ? 0
            : separateRounding
              ? AC.currencyService.round(qnt * basepay, sumRoundTo) + AC.currencyService.round(qnt * basepay5, sumRoundTo)
              : AC.currencyService.round(qnt * (basepay + basepay5), sumRoundTo)

          if (groupJobsPrint) {
            const foundItem = _.find(result.data, { parentID: parentID, name: obj.name, basepay: basepay, isDepartment: false })
            if (foundItem) {
              obj = foundItem
              obj.needAdd = false
            }
          }
          if (!notShowSalary) {
            obj.info = obj.infoArray.join('; ')
            if (posItem.comment) {
              obj.info = obj.info ? obj.info + '; ' + posItem.comment : posItem.comment
            }
          } else {
            obj.info = ''
          }

          obj.quantity += qnt
          obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
          obj.basepay = basepay
          obj.basepay5 += basepay5
          obj.basepayQuantity = AC.currencyService.round(basepay * qnt, sumRoundTo)
          obj.basepay5Quantity += basepay5Quantity
          obj.fundSum += fundSum
          if (compareFact) {
            obj.quantityFact += qnt
            result.quantityFact += qnt
          }
          result.quantity += qnt
          result.quantityHighLevel += orgItem.parentUnitID === itemID ? qnt : 0
          result.basepay += AC.currencyService.round(basepay * qnt, sumRoundTo) // для итоговых строк нужно сумма с учетом количества
          result.basepay5 += basepay5Quantity // для итоговых строк нужно сумма с учетом количества
          result.fundSum += fundSum
        } else {
          obj.needAdd = false
        }
        if (obj.needAdd) {
          if (isOrgCountsReport) {
            obj.indexNum = `${indexNpp++}.`
          } else {
            obj.indexNum = obj.isDepartment ? '' : indexNpp++
          }
          result.data.push(obj)
        }
      }

      /*
      if (obj.needAdd) {
        if (isOrgCountsReport) {
          obj.indexNum = `${indexNpp++}.`
        } else {
          obj.indexNum = obj.isDepartment ? '' : indexNpp++
        }
        result.data.push(obj)
      }

       */

      if (obj.isDepartment) {
        result.quantity += obj.quantity
        result.quantityHighLevel += orgItem.parentUnitID === itemID ? obj.quantity : 0
        if (compareFact) result.quantityFact += obj.quantityFact

        const subTree = getData(isOrgCountsReport ? 1 : indexNpp, orgItem.mi_data_id, level + 1)
        const subTreeHasData = (subTree.data && subTree.data.length)
        if (subTree && ((reportName === 'orgStruct') || (reportName === 'orgPlan') || isOrgCountsReport || subTreeHasData || orgItem.state !== 'ACTIVE')) {
          if (isOrgCountsReport) {
            obj.indexNum = `${indexNpp++}.`
          } else {
            indexNpp = subTree.indexNpp || 1
          }
          result.data.push(obj)

          if (isOrgCountsReport) {
            subTreeHasData && subTree.data.forEach(el => {
              el.indexNum = `${obj.indexNum || ''}${el.indexNum || ''}`
            })
          }
          if (!dontSumChildPos) {
            obj.quantity += reportName === 'orgCounts' ? 0 : subTree.quantity || 0
            obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity || 0)
            if (compareFact) obj.quantityFact += subTree.quantityFact || 0
          }
          subTreeHasData && result.data.push(...subTree.data)

          if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
            const totalObj = {
              showAccrual: showAccrual,
              showNn: showNn,
              colSpan: colSpan,
              fontSize: fontSize,
              roundTo: roundTo,
              indexNum: '',
              name: UB.i18n(`{0}Всього по {1}`, str, obj.depType),
              isDepartment: false,
              isTotal: true,
              quantity: subTree.quantity,
              roundToQuantity: subTree.roundToQuantity,
              basepay: subTree.basepay,
              basepay5: subTree.basepay5,
              fundSum: subTree.fundSum
            }
            result.data.push(totalObj)
            if (showWokers) {
              const workers = subTree.data.filter(item => ((item.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !item.isDepartment && !item.isTotal)
              const totalObj = {
                showAccrual: showAccrual,
                showNn: showNn,
                colSpan: colSpan,
                fontSize: fontSize,
                roundTo: roundTo,
                indexNum: '',
                name: UB.i18n(`{0}в т.ч. робітники`, str),
                isDepartment: false,
                isTotal: true,
                quantity: workers.reduce((res, item) => res + item.quantity, 0),
                basepay: workers.reduce((res, item) => res + item.basepayQuantity, 0),
                basepay5: workers.reduce((res, item) => res + item.basepay5Quantity, 0),
                fundSum: workers.reduce((res, item) => res + item.fundSum, 0)
              }
              totalObj.roundToQuantity = roundToQuantity || getQuantityFractional(totalObj.quantity)
              if (totalObj.quantity || totalObj.fundSum) {
                result.data.push(totalObj)
              }
            }
          }
          result.quantity += subTree.quantity
          result.quantityHighLevel += subTree.quantityHighLevel
          result.basepay += subTree.basepay
          result.basepay5 += subTree.basepay5
          result.fundSum += subTree.fundSum
          if (compareFact) result.quantityFact += subTree.quantityFact
        }
      }
    })

    result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantity)
    result.roundToQuantityHL = roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantityHighLevel)
    result.indexNpp = indexNpp
    return result
  }

  const orgTree = getData(1, itemID)
  if (reportName !== 'orgPlanChanges') {
    let tName = isOrgCountsReport ? UB.i18n('ВСЬОГО') : UB.i18n('РАЗОМ')
    if (organizationID !== itemID) {
      const tObj = _.find(orgStruct, { mi_data_id: itemID })
      tName = tObj && tObj.depType ? tObj.depType : ''
      tName = UB.i18n(`{0}Всього по {1}`, '', tName)
    }
    const orgTreeLastObj = {
      showAccrual: showAccrual,
      showNn: showNn,
      colSpan: colSpan,
      fontSize: fontSize,
      roundTo: roundTo,
      indexNum: '',
      name: tName,
      isDepartment: false,
      isTotal: true,
      quantity: isOrgCountsReport ? orgTree.quantityHighLevel || 0 : orgTree.quantity || 0,
      roundToQuantity: isOrgCountsReport
        ? orgTree.roundToQuantityHL || HR.reportUtils.getQuantityFractional(orgTree.quantityHighLevel || 0)
        : orgTree.roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.quantity || 0),
      basepay: orgTree.basepay || 0,
      basepay5: orgTree.basepay5 || 0,
      fundSum: orgTree.fundSum || 0
    }
    if (compareFact) orgTreeLastObj.quantityFact = orgTree.quantityFact || 0
    orgTree.data.push(orgTreeLastObj)

    if (organizationID !== itemID && showWokers) {
      const workers = orgTree.data.filter(item => ((item.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1 && !item.isDepartment && !item.isTotal)
      const totalObj = {
        showAccrual: showAccrual,
        showNn: showNn,
        colSpan: colSpan,
        fontSize: fontSize,
        roundTo: roundTo,
        indexNum: '',
        name: UB.i18n(`{0}в т.ч. робітники`, ''),
        isDepartment: false,
        isTotal: true,
        quantity: workers.reduce((res, item) => res + item.quantity, 0),
        basepay: workers.reduce((res, item) => res + item.basepayQuantity, 0),
        basepay5: workers.reduce((res, item) => res + item.basepay5Quantity, 0),
        fundSum: workers.reduce((res, item) => res + item.fundSum, 0)
      }
      totalObj.roundToQuantity = roundToQuantity || getQuantityFractional(totalObj.quantity)
      if (totalObj.quantity || totalObj.fundSum) {
        orgTree.data.push(totalObj)
      }
    }
  }

  return orgTree || {}
}

async function getDepartmentStructName (arrPositionID, orgID, onDateSql, byID = false) {
  const result = []
  if (!arrPositionID || !arrPositionID.length) {
    return result
  }
  onDateSql = onDateSql || appAC.globalApplicationDate()
  orgID = orgID || appAC.globalOrganization()

  const info = await UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_treePath', 'mi_data_id'])
    .where(byID ? 'ID' : 'mi_data_id', 'in', arrPositionID)
    .whereIf(!byID, 'mi_dateFrom', '<=', onDateSql)
    .whereIf(!byID, 'mi_dateTo', '>=', onDateSql)
    .where('state', '=', 'ACTIVE')
    .where('orgID', '=', orgID)
    .selectAsObject()
  for (let i = 0; i < info.length; i++) {
    const department = await UB.Repository('hr_department')
      .attrs(['name', 'nameGen', 'fullName', 'idxNum', 'departmentKindID.code', 'treePath'])
      .where('mi_data_id', 'in', _.compact(info[i].mi_treePath.split('/')).map(o => Number(o)))
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', orgID)
      .misc({
        __mip_ondate: onDateSql
      })
      .orderBy('mi_treePath')
      .selectAsObject()
    if (department && department.length > 0) {
      const flt = department

      result[info[i][byID ? 'ID' : 'mi_data_id']] = {
        treePath: flt[0].treePath || '',
        idxNum: flt[0].idxNum || '',
        name: flt[0].name || '',
        nameGen: flt[0].nameGen || '' || flt[0].name || '',
        fullName: flt[0].fullName || flt[0].name || ''
      }
    }
  }

  return result
}

async function getStaffAgreedOrgName (orgID) {
  let res
  orgID = orgID || appAC.globalOrganization()
  const agreedOrgID = AC.settings.get('hrStaffAgreedOrg', orgID)
  if (agreedOrgID) {
    res = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('ID', '=', agreedOrgID)
      .selectScalar()
  }
  return res
}

async function getEmpOrderExtract (orderID, addFieldList, addWhereList) {
  let fieldList = ['ID', 'empOrderType', 'description', 'organizationID', 'orderState', 'entryDate',
    'orderDate', 'orderNumber', 'mi_modifyDate', 'departmentID', 'employeePositionID',
    'respEmployeeNumID', 'respEmployeeNumberID', 'respEmployeePositionID', 'respPositionID', 'respEmployeeID']
  if (addFieldList) {
    fieldList = fieldList.concat(addFieldList)
  }

  if (!orderID) {
    const resultData = {}
    fieldList.forEach(item => {
      resultData[item] = null
    })
    return resultData
  }
  const empOrder = await UB.Repository('hr_empOrderExtract')
    .attrs(['orderDate', 'entryDate'])
    .selectById(orderID)
  const orderDate = (empOrder && (empOrder.orderDate || empOrder.entryDate)) || new Date()
  const onDate = AC.dateService.shiftDate(orderDate)
  let data = UB.Repository('hr_empOrderExtract')
    .attrs(fieldList)
    .where('organizationID.mi_dateFrom', '<=', onDate)
    .where('organizationID.mi_dateTo', '>=', onDate)
  if (addWhereList) {
    addWhereList.forEach(whereItem => {
      data = data.where(whereItem[0], whereItem[1], whereItem[2])
    })
  }
  const resultData = await data.selectById(orderID)
  if (resultData) {
    resultData.orderDate = resultData.orderDate ? AC.dateService.truncTimeToUtcNull(resultData.orderDate) : null
    resultData.orderNumber = resultData.orderNumber === UB.i18n('(проєкт)') ? '_______' : resultData.orderNumber
  }
  return resultData
}

/**
 * Повертає відповідальних осіб організації
 * @param organizationID
 * @param onDate
 * @param respPositions ['mainChief', 'accChief']
 * @returns Promise
 */
function getRespPosition (organizationID, onDate, respPositions) {
  return new Promise(resolve => {
    $App.connection.run({
      entity: 'hr_report',
      method: 'getRespPosition',
      params: JSON.stringify({
        organizationID,
        onDate,
        respPositions
      })
    }).then(result => {
      resolve(JSON.parse(result.resultData))
    })
  })
}

/**
 * Підстава наказу
 * @param reason
 */
function getReasonOrder (reason) {
  if (!reason || reason.length === 0) {
    return ''
  }
  return UB.i18n(`Підстава: {0}{1}`, reason, reason.substr(-1) === '.' ? '' : '.')
}

function makePositionName (positionName, isBoss) {
  if (!positionName) {
    return ''
  }
  return isBoss ? positionName : HR.nameCase.uncap(positionName)
}

/**
 * Сортировка по украинскому алфавиту
 * @param firstStr
 * @param secondStr
 * @returns {number}
 * @constructor
 */
function CompareStringUa (firstStr, secondStr) {
  firstStr = String(firstStr || '').toLowerCase()
  secondStr = String(secondStr || '').toLowerCase()
  function checkAscii (a) {
    let Ascii = (a !== undefined ? a.charCodeAt(0) : 32)
    switch (Ascii) {
      case 1169:// ґ
        return 1075.5
      case 1108:// є
        return 1077.5
      case 1110:// і
        return 1080.5
      case 1111:// ї
        return 1080.6
      case 1168:// Ґ
        return 1043.5
      case 1028:// Є
        return 1045.5
      case 1030:// І
        return 1048.5
      case 1031:// Ї
        return 1048.6
      case 8217:// '
        return 39
      default:
        return Ascii
    }
  }

  if (firstStr === secondStr) { return 0 }
  let asciiFirst
  let asciiSecond
  let firstlength = firstStr.length
  let secondlength = secondStr.length
  if (firstlength === 0) { return -1 }
  if (secondlength === 0) { return 1 }

  for (let i = 0; i < (firstlength > secondlength ? secondlength : firstlength); i++) {
    asciiFirst = checkAscii(firstStr[i])
    asciiSecond = checkAscii(secondStr[i])
    if (asciiFirst !== asciiSecond) {
      return (asciiFirst > asciiSecond ? 1 : -1)
    }
  }
  if (firstlength === secondlength) {
    return 0
  } else {
    return (firstlength > secondlength ? -1 : 1)
  }
}

function compareDates (d1, d2) {
  let i = 0
  if (d1 && d2) {
    i = d1 > d2 ? 1 : -1
  } else if (d1 && !d2) {
    i = 1
  } else if (!d1 && d2) {
    i = -1
  }
  return i
}

/* Заміна 0 на undefined в об'єкті для ключів з масиву keyArray - для виводу пустих комірок замість нулів */
function clearZeroes (obj, keyArray) {
  AC.dataService.parseObjectProperties(obj, function (prop, key) {
    if (keyArray.includes(key) && !prop[key]) {
      prop[key] = undefined
    }
  })
}

function checkLastChar (text, aChar = '.') {
  if (!text || text.length === 0) {
    return ''
  }
  return `${text}${text.substr(-1) === aChar ? '' : aChar}`
}

async function getOrderPrintConfig (reportObj, orgID) {
  if (reportObj) {
    let printSettings
    let isDefaultLogo
    const attrsToCopy = ['ecoPrint', 'smallOrderWord', 'normalFullName', 'salaryText', 'notUseMiddleNameInOrder'] // attr list for simple copy
    function copyValues (objFrom, objTo) {
      attrsToCopy.forEach(itemName => {
        objTo[itemName] = objFrom[itemName]
      })
    }
    if (HR.printSettings[orgID]) {
      printSettings = HR.printSettings[orgID].params
      reportObj.logoWidth = HR.printSettings[orgID].isDefaultLogo ? 14.8 : (printSettings.logoWidth || 20)
      reportObj.logoHeight = HR.printSettings[orgID].isDefaultLogo ? 19 : (printSettings.logoHeight || 20)
      reportObj.emblem = HR.printSettings[orgID].logoImage
      isDefaultLogo = HR.printSettings[orgID].isDefaultLogo
    } else {
      printSettings = await $App.connection.run({
        entity: 'ac_docPrintSettings',
        method: 'getOrgPrintSettings',
        orgID: orgID
      })
      isDefaultLogo = !printSettings.logo

      reportObj.logoWidth = isDefaultLogo ? 14.8 : printSettings.logoWidth || 20
      reportObj.logoHeight = isDefaultLogo ? 19 : printSettings.logoHeight || 20
      reportObj.emblem = isDefaultLogo ? getEmblem() : printSettings.logo
      const params = {
        hideFromInDate: printSettings.hideFromInDate,
        boldOrganizationName: printSettings.boldOrganizationName,
        titleOrderParams: printSettings.titleOrderParams,
        logoWidth: reportObj.logoWidth,
        logoHeight: reportObj.logoHeight
      }
      copyValues(printSettings, params)
      HR.printSettings[orgID] = {
        logoImage: reportObj.emblem,
        isDefaultLogo,
        params: params
      }
    }
    copyValues(printSettings, reportObj)
    reportObj.fromDate = printSettings.hideFromInDate ? '' : UB.i18n('від') + ' '
    reportObj.boldOrganizationName = printSettings.boldOrganizationName ? 'font-weight: bold; ' : ''
    reportObj.titleOrderParams = (reportObj.titleOrderParams || '') + printSettings.boldTitleOrder ? 'font-weight: bold; ' : ''

    if (reportObj.printDocumentView === 'APPOINTMENT') {
      reportObj.titleFontSize = 16
      reportObj.headFontSize = 20
      reportObj.appointmentNumberFontSize = 13
      reportObj.appointmentTitleFontSize = 12
      reportObj.fontSize = 12
      reportObj.appointmentLinesWidth = 640
      reportObj.appointmentLinesHeight = 8
      reportObj.appointmentLinesFoto = getAppointmentLinesFoto()
    } else {
      reportObj.titleFontSize = printSettings.ecoPrint ? 12 : 14
      reportObj.fontSize = printSettings.ecoPrint ? 12 : 14
    }
    // reportObj.fontSize = printSettings.ecoPrint ? 12 : 14
    reportObj.lineHeight = printSettings.ecoPrint ? 1.1 : 1.35
    reportObj.logoWidthPx = isDefaultLogo ? 56 : Math.round(reportObj.logoWidth / 0.264583333)
    reportObj.logoHeightPx = isDefaultLogo ? 72 : Math.round(reportObj.logoHeight / 0.264583333)
    reportObj.logoPaddingLeft = Math.max(Math.ceil((640 - reportObj.logoWidthPx) / 2 - 66), 0)
  }
  return reportObj
}

function getPosCategories ({ isMed, initObj, posData, catIDAlias = 'dictStaffCatID', catCodeAlias = 'dictStaffCatID.code',
  catNameAlias = 'dictStaffCatID.name', byStaff = false }) {
  let res
  if (isMed) {
    res = [
      { id: 1, code: '1', name: UB.i18n('Лікарі'), nameTotal: byStaff ? UB.i18n('Разом') : UB.i18n('Всього по лікарям'), quantity: 0 },
      { id: 2, code: '2', name: UB.i18n('Середній медперсонал'), nameTotal: byStaff ? UB.i18n('Разом') : UB.i18n('Всього по середньому медперсоналу'), quantity: 0 },
      { id: 3, code: '3', name: UB.i18n('Молодший медперсонал'), nameTotal: byStaff ? UB.i18n('Разом') : UB.i18n('Всього по молодшому медперсоналу'), quantity: 0 },
      { id: 4, name: UB.i18n('Спеціалісти немедики з в/о'), nameTotal: byStaff ? UB.i18n('Разом') : UB.i18n('Всього по спеціалістам немедикам з в/о'), hasHighEdu: true, quantity: 0 },
      { id: 5, name: UB.i18n('Інші'), nameTotal: byStaff ? UB.i18n('Разом') : UB.i18n('Всього по іншим'), quantity: 0 }
    ]
  } else {
    res = []
    if (posData && posData.length) {
      let catIDs = _.groupBy(posData, catIDAlias)
      let catData = []
      _.forEach(catIDs, items => {
        const pos = items[0]
        catData.push({
          id: pos[catIDAlias] || -1,
          code: pos[catCodeAlias] || '99999999999',
          codeInt: parseInt(pos[catCodeAlias]) || 99999999999,
          name: pos[catNameAlias] || UB.i18n('Без категорії'),
          quantity: 0
        })
      })
      res = _.sortBy(catData, ['codeInt'])
    }
  }
  if (initObj) {
    Object.keys(initObj).forEach(key => {
      res.forEach(resItem => {
        let initVal = initObj[key]
        if (_.isArray(initVal)) {
          initVal = [...initVal]
        } else if (_.isObject(initVal)) {
          initVal = Object.assign({}, initVal)
        }
        resItem[key] = initVal
      })
    })
  }
  return res
}

function getSpaceIdent (isHtml = false, level = 1) {
  if (isHtml) {
    return '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level - 1)
  } else {
    return '  '.repeat(level - 1)
  }
}

function generateDataForStructReportByPositionCategory (data, sumArray, roundTo, roundToQuantity, addValues = []) {
  const treePositionCategory = _.groupBy(data.filter(item => !item.isDepartment && !item.isTotal), 'positionCategoryName')
  const totalPC = {
    ID: -1,
    isTotal: true,
    name: UB.i18n('Всього за категоріями персоналу'),
    quantity: 0,
    roundTo: roundTo,
    bold: 'font-weight: bold;',
    sortOrder: ''
  }
  _.forEach(addValues, itemName => {
    totalPC[itemName.name] = itemName.value
  })
  _.forEach(sumArray, itemName => {
    totalPC[itemName] = 0
  })
  const result = []
  _.forEach(treePositionCategory, categoryItems => {
    const obj = {
      ID: categoryItems[0].positionCategory || 0,
      sortOrder: categoryItems[0].positionCategorySortOrder,
      name: categoryItems[0].positionCategoryName || UB.i18n('Без категорії'),
      quantity: categoryItems.reduce((res, item) => res + item.quantity, 0),
      roundTo: roundTo,
      bold: ''
    }
    _.forEach(addValues, itemName => {
      obj[itemName.name] = itemName.value
    })
    _.forEach(sumArray, itemName => {
      obj[itemName] = categoryItems.reduce((res, item) => res + item[itemName], 0)
      totalPC[itemName] += obj[itemName]
    })
    obj.roundToQuantity = roundToQuantity || getQuantityFractional(obj.quantity)
    totalPC.quantity += obj.quantity
    result.push(obj)
  })
  totalPC.roundToQuantity = roundToQuantity || getQuantityFractional(totalPC.quantity)
  return [totalPC].concat(_.sortBy(result, 'sortOrder'))
}

async function getResponsiblesForOrder (order, forAppointment = false, entity = 'hr_empOrderSignDet', addFromGeneral = true, excludeCodes = [], onlyCode = []) {
  function pushInfo (info) {
    if (info) {
      result.push({
        respPosition: info.respPosition,
        respEmployeePositionID: info.respEmployeePositionID,
        respPositionID: info.respPositionID,
        bold: forAppointment ? '' : 'font-weight:bold; ',
        respName: info.respName,
        respPos: forAppointment ? info.respPos.toUpperCase() : info.respPos,
        respFirstName: info.respFirstName,
        align: result.length ? 'left' : 'right'
      })
    }
    if (result.length > 1) { // если больше одного подписанта, то меняем выравнивание
      result[0].align = 'left'
    }
  }

  const result = []
  if (!order) {
    return result
  }
  const organizationID = order.masterOrganizationID || order.organizationID
  const onDate = order.orderDate || order.entryDate
  const twoSignatories = AC.settings.get('hrTwoSignatoriesInOrders', organizationID) === true
  const responsAbbr = AC.settings.get('hrResponsAbbr', appAC.globalOrganization()) || UB.i18n('В.о.')
  const useSexType = AC.settings.get('hrUseSexTypeInOrders', organizationID) === true
  const useActualPositionName = false
  // UBHR-18984 // const useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true
  const hrEmpOrderAnyNumberSigners = AC.settings.get('hrEmpOrderAnyNumberSigners', organizationID) === true

  let responsibles = []
  if (hrEmpOrderAnyNumberSigners && !['hr_empOrderSignDet', 'hr_empOrdListAppruv'].includes(entity)) {
    responsibles = await UB.Repository(entity) // ('hr_empOrderSignDet')
      .attrs(['respPositionID', 'respEmployeePositionID', 'respPosition'])
      .where('orderID', '=', order.ID)
      .whereIf(excludeCodes.length === 1, 'respPosition', '!=', excludeCodes[0])
      .whereIf(excludeCodes.length > 1, 'respPosition', 'notIn', excludeCodes)
      .whereIf(onlyCode.length === 1, 'respPosition', '=', onlyCode[0])
      .whereIf(onlyCode.length > 1, 'respPosition', 'in', onlyCode)
      .orderBy(entity === 'hr_empOrderSignDet' ? 'respNum' : 'ID')
      .selectAsObject({
        'respPositionID': 'posID',
        'respEmployeePositionID': 'epID'
      })
  } else if (['hr_empOrdListAppruv'].includes(entity)) {
    responsibles = await UB.Repository(entity)
      .attrs(['ID', 'respPositionID', 'respEmployeePositionID'])
      .where('orderID', '=', order.ID)
      .orderBy(entity === 'hr_empOrderSignDet' ? 'respNum' : 'ID')
      .selectAsObject({
        'respPositionID': 'posID',
        'respEmployeePositionID': 'epID'
      })
  }
  if (addFromGeneral && (!hrEmpOrderAnyNumberSigners || !responsibles.length)) { // Якщо на сторінці "Підписувачі" дані не заповнені, тоді брати із сторінки Загальне.
    if (order.respEmployeePositionID) {
      responsibles.push({
        epID: order.respEmployeePositionID,
        posID: order.respPositionID,
        respPosition: ''
      })
    }
    if (twoSignatories && order.respEmployeePosition2ID) {
      responsibles.push({
        epID: order.respEmployeePosition2ID,
        posID: order.respPosition2ID,
        respPosition: ''
      })
    }
  }
  const employeePositionIDs = {}
  const positionIDs = {}
  const fulllDepartmentNames = {}

  const employeeChangeNamesData = {}
  for (let i = 0; i < responsibles.length; i++) {
    const item = responsibles[i]
    let epData
    if (employeePositionIDs[item.epID]) {
      epData = employeePositionIDs[item.epID]
    } else {
      for (let k = 0; k < 2; k++) {
        epData = await UB.Repository('hr_employeePositionS')
          .attrs('ID', 'employeeID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.sexType',
            'employeeID.fullFIO', 'departmentID', 'departmentID.mi_treePath', 'organizationID',
            'positionID', 'positionID.isOrgBoss', 'positionID.fullNameNom', 'positionID.fullName', 'positionID.name')
          .attrsIf(useActualPositionName, 'posNameAddition', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name',
            'dictPositionID', 'dictPositionID.nameNom', 'dictPositionID.name')
          .attrsIf(useSexType, 'positionID.fullNameNomF')
          .attrsIf(useActualPositionName && useSexType, 'dictPositionID.nameNomF')
          .where('ID', '=', item.epID)
          // .where('organizationID', '=', organizationID)  // can by any org
          .where('positionID.state', '=', 'ACTIVE')
          .where('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.mi_dateTo', '>=', onDate)
          .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.state', '=', 'ACTIVE')
          .whereIf(k === 0, 'positionID.mi_dateFrom', '<=', onDate)
          .whereIf(k === 0, 'positionID.mi_dateTo', '>=', onDate)
          .orderBy('positionID.mi_dateFrom', 'desc')
          .orderBy('positionID.mi_dateTo', 'desc')
          .limit(1)
          .selectSingle()
        if (epData) {
          if (useActualPositionName && epData.departmentID) {
            if (fulllDepartmentNames[epData.departmentID]) {
              epData['departmentID.fullNameGen'] = fulllDepartmentNames[epData.departmentID]
            } else {
              const fullName = await getFullDepartmentNameByTree(epData['departmentID.mi_treePath'], epData.organizationID, onDate)
              fulllDepartmentNames[epData.departmentID] = fullName
              epData['departmentID.fullNameGen'] = fullName
            }
          }
          employeePositionIDs[item.epID] = epData
          k = 2
        }
      }
    }
    if (epData) {
      const employeeAttrs = ['lastName', 'firstName', 'middleName', 'fullFIO']
      let employeeChangeNames
      if (!employeeChangeNamesData[epData.employeeID]) {
        employeeChangeNames = await HR.reportUtils.getEmployeeChange(employeeAttrs, onDate, undefined, [epData.employeeID])
        employeeChangeNamesData[epData.employeeID] = JSON.parse(JSON.stringify(employeeChangeNames))
      } else {
        employeeChangeNames = JSON.parse(JSON.stringify(employeeChangeNamesData[epData.employeeID]))
      }

      if (employeeChangeNames[epData.employeeID]) { // if employee have changes in names
        const lastValues = employeeChangeNames[epData.employeeID].sort((a, b) => b.orderDate >= a.orderDate)[0]
        employeeAttrs.forEach(attr => {
          epData[`employeeID.${attr}`] = lastValues[attr] || ''
        })
      }

      const posInfo = getInfoItemOrderInCase(epData, 'nom', false, false, '', { useIsOrgBoss: false })
      const objResp = {
        respPosition: item.respPosition,
        respEmployeePositionID: item.epID,
        respPositionID: item.posID,
        respName: posInfo.empName,
        respPos: HR.nameCase.cap(posInfo.posName),
        respFirstName: epData['employeeID.firstName'] + (epData['employeeID.lastName'] ? ' ' + epData['employeeID.lastName'].toUpperCase() : '')
      }

      if (item.posID && epData.positionID !== item.posID) {
        let posData
        if (positionIDs[item.posID]) {
          posData = positionIDs[item.posID]
        } else {
          for (let k = 0; k < 2; k++) {
            posData = await UB.Repository('hr_position')
              .attrs(['fullNameGen', 'fullName', 'name', 'orgID'])
              .attrsIf(useActualPositionName, 'mi_treePath', 'parentUnitID', 'nameAddition', 'dictPositionID',
                'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'dictPositionID.nameGen', 'dictPositionID.name')
              .attrsIf(useSexType, ['fullNameGenF'])
              .attrsIf(useActualPositionName && useSexType, ['dictPositionID.nameGenF'])
              .where('mi_data_id', '=', item.posID)
              // .where('orgID', '=', organizationID) // can by any org ?
              .where('state', '=', 'ACTIVE')
              .where('mi_deleteDate', '>=', '#maxdate')
              .whereIf(k === 0, 'mi_dateFrom', '<=', onDate)
              .whereIf(k === 0, 'mi_dateTo', '>=', onDate)
              .orderBy('mi_dateFrom', 'desc')
              .orderBy('mi_dateTo', 'desc')
              .limit(1)
              .selectSingle()
            if (posData) {
              positionIDs[item.posID] = posData
              k = 2
            }
          }
        }
        if (posData) {
          let positionName = (useSexType && epData['employeeID.sexType'] === 'W'
            ? posData.fullNameGenF || posData.fullNameGen || posData.fullName || posData.name || ''
            : posData.fullNameGen || posData.fullName || posData.name || '')

          if (useActualPositionName && posData.parentUnitID) {
            let departmentName
            if (fulllDepartmentNames[posData.parentUnitID]) {
              departmentName = fulllDepartmentNames[posData.parentUnitID]
            } else {
              departmentName = await getFullDepartmentNameByTree(posData.mi_treePath, posData.orgID, onDate)
              fulllDepartmentNames[posData.parentUnitID] = departmentName
            }
            const dictPosName = useSexType && epData['employeeID.sexType'] === 'W'
              ? posData['dictPositionID.nameGenF'] || posData['dictPositionID.nameGen'] || posData['dictPositionID.name'] || ''
              : posData[`dictPositionID.nameGen`] || posData['dictPositionID.name'] || ''

            positionName = removeDuplicateWords([dictPosName, posData.nameAddition || '', posData['dictEmpCategoryID.genName'] || '', departmentName || ''].filter(Boolean).join(' ') || '')
          }
          objResp.respPos = responsAbbr + ' ' + positionName
        }
      }
      pushInfo(objResp)
    }
  }
  return result
}

async function getSetParams (repCode, notInCodes) {
  const setParamData = await UB.Repository('hr_repSetParam')
    .attrs(['code', 'name', 'reportNumStr'])
    .where('dictStReportID.code', '=', repCode)
    .whereIf(notInCodes && notInCodes.length, 'code', 'notIn', notInCodes)
    .orderBy('reportNumStrPadded')
    .selectAsObject()
  return setParamData
}

async function getSetElements (repCode, onDate, paramCodes) {
  const setElemData = await UB.Repository('hr_repSetElement')
    .attrs(['repSetParamID', 'elementID', 'repSetParamID.code'])
    .where('repSetParamID.dictStReportID.code', '=', repCode)
    .whereIf(paramCodes, 'repSetParamID.code', 'in', paramCodes)
    .where('dateFromNotEmpty', '<=', onDate)
    .where('dateToNotEmpty', '>=', onDate)
    .where('repSetParamID.dateFrom', '<=', onDate)
    .where('repSetParamID.dateTo', '>=', onDate)
    .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  return setElemData
}

function getSetElementIDs (setElementsData, paramCode, inverse = false) {
  const res = []
  if (!setElementsData || !paramCode) {
    return res
  }
  let paramElements
  if (Array.isArray(paramCode)) {
    if (inverse) {
      paramElements = setElementsData.filter(itm => !paramCode.includes(itm['repSetParamID.code']))
    } else {
      paramElements = setElementsData.filter(itm => paramCode.includes(itm['repSetParamID.code']))
    }
  } else {
    if (inverse) {
      paramElements = setElementsData.filter(itm => itm['repSetParamID.code'] !== paramCode)
    } else {
      paramElements = setElementsData.filter(itm => itm['repSetParamID.code'] === paramCode)
    }
  }
  paramElements.forEach(itm => {
    res.push(itm.elementID)
  })
  return res
}

function addAgeCol (data, onDate, birthDateAlias = 'birthDate') {
  data.forEach(dataItem => {
    dataItem.age = AC.dateService.yearsDiff(dataItem[birthDateAlias], onDate)
  })
}

function getEmpNumDates ({ orgID, orgIDs, onDate, dateFrom, dateTo, minDateFromAlias, maxDateFromAlias, minDateToAlias, maxDateToAlias,
  groupByField = 'employeeNumberID', dateFromInPeriod, dateToInPeriod, addWhereList, depID, withDepChilds, logicValue, employeePositionIDs }) {
  let isEmpNumGroup = groupByField === 'employeeNumberID'
  let res = UB.Repository('hr_employeePositionS')
    .attrs([groupByField, 'MIN([dateFrom])', 'MAX([dateFrom])', 'MIN([dateTo])', 'MAX([dateTo])'])
    .where('isActive', '=', true)
    .whereIf(orgID, 'organizationID', '=', orgID)
    .whereIf(orgIDs, 'organizationID', 'in', orgIDs)
    .whereIf(employeePositionIDs, 'ID', 'in', employeePositionIDs)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .whereIf(dateFromInPeriod, 'dateFrom', '>=', dateFrom)
    .whereIf(dateToInPeriod, 'dateTo', '<=', dateTo)
    .whereIf(isEmpNumGroup || dateFromInPeriod, 'employeeNumberID.dateFrom', '>=', dateFrom)
    .whereIf(isEmpNumGroup, 'employeeNumberID.dateFrom', '<=', dateTo)
    .whereIf(dateToInPeriod, 'employeeNumberID.dateTo', '<=', dateTo)
    .whereIf(isEmpNumGroup, 'employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(depID && !withDepChilds, 'departmentID', '=', depID)
    .whereIf(depID && withDepChilds, 'departmentID.mi_treePath', 'like', `/${depID}/`)
    .whereIf(depID && withDepChilds, 'departmentID.state', '=', 'ACTIVE')
    .whereIf(depID && withDepChilds, 'departmentID.mi_deleteDate', '=', '#maxdate')
    .whereIf(depID && withDepChilds, '[departmentID.mi_dateTo] = [departmentID.mi_maxDateTo]', 'custom')
  // monkey request prevention
    .where('ID', '!=', AC.dataService.getUniqueInt())
  if (addWhereList) {
    addWhereList.forEach(whereItem => {
      if (whereItem[3]) {
        res = res.where(whereItem[0], whereItem[1], whereItem[2], whereItem[3])
      } else {
        res = res.where(whereItem[0], whereItem[1], whereItem[2])
      }
    })
  }
  if (logicValue) {
    res = res.logic(logicValue)
  }
  return res.groupBy([groupByField])
    .orderBy(groupByField)
    .selectAsObject({
      'MIN([dateFrom])': minDateFromAlias || 'minDateFrom',
      'MAX([dateFrom])': maxDateFromAlias || 'maxDateFrom',
      'MIN([dateTo])': minDateToAlias || 'minDateTo',
      'MAX([dateTo])': maxDateToAlias || 'maxDateTo'
    })
}

function setFieldsDateType (data, dateFields) {
  data && data.forEach(dataItem => {
    dateFields.forEach(field => {
      dataItem[field] = AC.dateService.unshiftDate(dataItem[field])
    })
  })
}

function getOrganizationQuery (onDate, organizationID) {
  return {
    entity: 'hr_organization',
    fieldList: ['mi_data_id', 'name'],
    method: 'select',
    __mip_ondate: onDate,
    whereList: {
      c1: { expression: '[mi_data_id]', condition: 'equal', value: organizationID }
    }
  }
}

function getDepartmentQuery (onDate, organizationID, departmentID) {
  return {
    entity: 'hr_department',
    fieldList: ['mi_data_id', 'name'],
    method: 'select',
    __mip_ondate: onDate,
    whereList: {
      c1: { expression: '[mi_data_id]', condition: 'equal', value: departmentID || 0 },
      c2: { expression: '[orgID]', condition: 'equal', value: organizationID }
    }
  }
}

async function getNameOrganization (onDate, organizationID) {
  return await UB.Repository('hr_organization')
    .attrs(['name'])
    .where('mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectScalar()
}

async function getNameDepartment (onDate, organizationID, departmentID) {
  return departmentID ? await UB.Repository('hr_department')
    .attrs(['name'])
    .where('mi_data_id', '=', departmentID)
    .where('orgID', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .where('mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_ondate: onDate })
    .selectScalar() : ''
}

function getMilitaryRanks (empMilitaryRanks, orderDate, fieldName) {
  let militaryRank = ''
  if (empMilitaryRanks) {
    let flt = empMilitaryRanks.filter(e => e.orderDate)
    if (flt.length) {
      flt = flt.filter(e => e.orderDate <= (orderDate || appAC.globalApplicationDate()))
      if (flt.length) {
        flt.sort((a, b) => a.orderDate > b.orderDate ? -1 : 1)
      }
    } else {
      flt = empMilitaryRanks.filter(e => !e.orderDate)
      if (flt.length) {
        flt.sort((a, b) => b.ID - a.ID)
      }
    }
    if (flt.length) {
      militaryRank = flt[0][`dictMilitaryRankID.${fieldName}`] || flt[0]['dictMilitaryRankID.name'] || ''
    }
  }
  return militaryRank
}

function funcOrderTreePathSort (s1, s2) {
  let i = (s1['employeePositionID.positionID.treePath'] || s1['positionID.treePath'] || '').localeCompare((s2['employeePositionID.positionID.treePath'] || s2['positionID.treePath'] || ''))
  if (i === 0) {
    i = HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
    if (i === 0) {
      i = (s1['employeeNumberID.tabNum'] || '').localeCompare((s2['employeeNumberID.tabNum'] || ''))
    }
    if (i === 0) {
      i = s1.ID > s2.ID ? 1 : -1
    }
  }
  return i
}

function funcOrderFioTabNumSort (s1, s2) {
  let i = HR.reportUtils.CompareStringUa((s1['employeeID.fullFIO'] || ''), (s2['employeeID.fullFIO'] || ''))
  if (i === 0) {
    i = (s1['employeeNumberID.tabNum'] || '').localeCompare((s2['employeeNumberID.tabNum'] || ''))
  }
  return i
}

function setRoundToQuantity (dataObj, roundToQuantity, config) {
  if (!dataObj || !dataObj.length) return

  dataObj.forEach(obj => {
    config.forEach(item => {
      obj[item.nameRound] = roundToQuantity || getQuantityFractional(obj[item.name])
    })
  })
}

async function getPromiseEmployeePositionForOrders (employeePositionIDs, masterOrganizationID, organizationID, onDate, caseCodes, useSexType, ignoreUseActualPositionName = false) {
  const useActualPositionName = ignoreUseActualPositionName ? false : AC.settings.get('hrOrderActualPositionName', masterOrganizationID) === true
  const atts = ['ID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'posNameAddition', 'dictPositionID',
    'employeeID.sexType', 'employeeID.fullFIO', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName',
    'positionID.fullName', 'positionID.name', 'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.isOrgBoss',
    'positionID.positionType', 'positionID.psCategory.name', 'positionID',
    'departmentID', 'departmentID.nameGen', 'departmentID.name', 'departmentID.mi_treePath']

  caseCodes.forEach(code => {
    if (code.toLowerCase === 'ins') code = 'Or'
    atts.push(`dictPositionID.name${code}`)
    atts.push(`positionID.name${code}`)
    atts.push(`positionID.fullName${code}`)
    if (useSexType) {
      atts.push(`dictPositionID.name${code}F`)
      atts.push(`positionID.name${code}F`)
      atts.push(`positionID.fullName${code}F`)
    }
    switch (code) {
      case 'Gen':
        atts.push('employeeID.genName')
        break
      case 'Dat':
        atts.push('employeeID.datName')
        break
      case 'Acc':
        atts.push('employeeID.accusativeName')
        break
      case 'Or':
      case 'Ins':
        atts.push('employeeID.insName')
        break
      case 'Loc':
        atts.push('employeeID.locName')
        break
    }
  })

  const employeePosition = await UB.Repository('hr_employeePositionS')
    .attrs(_.uniq(atts))
    .whereIf(employeePositionIDs && employeePositionIDs.length > 0, 'ID', 'in', employeePositionIDs)
    .whereIf(!employeePositionIDs || employeePositionIDs.length === 0, 'ID', '=', 0)
    .where('organizationID', '=', organizationID)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
    .joinCondition('departmentID.mi_dateTo', '>=', onDate)
    .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentID.state', '=', 'ACTIVE')
    .orderBy('ID')
    .orderBy('positionID.mi_dateFrom', 'desc')
    .orderBy('positionID.mi_dateTo', 'desc')
    .selectAsObject()

  if (employeePosition.length && useActualPositionName) {
    const fulllDepartmentNames = {} // полний перелік назв підрозділів
    for (let i = 0; i < employeePosition.length; i++) {
      const item = employeePosition[i]
      if (item['departmentID']) {
        if (fulllDepartmentNames[item.departmentID]) {
          item['departmentID.fullNameGen'] = fulllDepartmentNames[item.departmentID]
        } else {
          const fullName = await HR.reportUtils.getFullDepartmentNameByTree(item['departmentID.mi_treePath'], organizationID, onDate)
          fulllDepartmentNames[item.departmentID] = fullName
          item['departmentID.fullNameGen'] = fullName
        }
      }
    }
  }
  return Promise.resolve(employeePosition)
}

function removeDuplicateWords (str) {
  const data = (str || '').replace('  ', ' ').split(' ').filter(o => o)
  const result = []

  for (let i = 0; i < data.length; i++) {
    if (
      typeof data[i + 1] === 'string' &&
      data[i].toLowerCase() !== data[i + 1].toLowerCase() &&
      (data[i] + data[i + 1]).toString().toLowerCase() !== (data[i + 2] + data[i + 3]).toString().toLowerCase() &&
      (data[i - 1] + data[i]).toString().toLowerCase() !== (data[i + 1] + data[i + 2]).toString().toLowerCase()
    ) {
      result.push(data[i].trim())
    } else {
      if (i === data.length - 1) result.push(data[i].trim())
    }
  }
  return result.join(' ').replace('  ', ' ').trim()
}

async function getFullDepartmentNameByTree (treePath, orgID, onDate, caseName = 'nameGen') {
  let result = ''
  if (!treePath) return result

  const department = await UB.Repository('hr_department')
    .attrs(['name', caseName])
    .where('mi_data_id', 'in', _.compact(treePath.split('/')).map(o => Number(o)))
    .where('state', '=', 'ACTIVE')
    .where('orgID', '=', orgID)
    .misc({
      __mip_ondate: onDate
    })
    .orderBy('mi_treePath', 'desc')
    .selectAsObject()

  department.forEach(dep => {
    const name = dep[caseName] || dep['name'] || ''
    result += (result ? ' ' : '') + name
  })
  result = removeDuplicateWords(result)
  return result
}

function getInfoItemOrderInCase (orderItem, caseCode, lastNameInUpperCase, notUseMiddleNameInOrder = false, epFieldName = 'employeePositionID.', config) {
  const fullFieldName = `${epFieldName || ''}positionID.`
  caseCode = HR.nameCase.cap(caseCode.toLowerCase())
  if (caseCode === 'ins') caseCode = 'or'
  config = _.merge({
    fullPositionName: true,
    notActualPositionName: false,
    yesActualPositionName: false,
    useIsOrgBoss: true,
    notUseMiddleNameInOrder,
    lastNameInUpperCase
  }, config)

  function getNameValue (femaleName, toCase = caseCode) {
    const name = config.fullPositionName
      ? orderItem[`${fullFieldName}fullName${toCase}`] || orderItem[`${fullFieldName}.fullName`] || ''
      : orderItem[`${fullFieldName}.name${toCase}`] || orderItem[`${fullFieldName}.name`] || ''
    const nameF = femaleName
      ? config.fullPositionName
        ? orderItem[`${fullFieldName}fullName${toCase}F`] || orderItem[`${fullFieldName}.fullName`] || ''
        : orderItem[`${fullFieldName}.name${toCase}F`] || orderItem[`${fullFieldName}.name`] || ''
      : ''
    return nameF || name
  }

  const useSexType = AC.settings.get('hrUseSexTypeInOrders', orderItem.organizationID || appAC.globalOrganization()) === true
  const useActualPositionName = config.notActualPositionName || !orderItem[`${epFieldName}dictPositionID`]
    ? false
    : config.yesActualPositionName
      ? true
      : AC.settings.get('hrOrderActualPositionName', orderItem.organizationID || appAC.globalOrganization()) === true

  const sexType = orderItem['employeeID.sexType']
  const gender = sexType === 'M' ? 'male' : (sexType === 'W' ? 'female' : 'any')

  const result = {}
  let empName
  let posName = getNameValue(false, '')
  let dictPosName = orderItem[`${epFieldName}dictPositionID.name`] || ''
  if (['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc'].includes(caseCode)) {
    posName = getNameValue(useSexType && gender === 'female', caseCode)
    dictPosName = useSexType && gender === 'female'
      ? orderItem[`${epFieldName}dictPositionID.name${caseCode}F`] || orderItem[`${epFieldName}dictPositionID.name${caseCode}`] || dictPosName
      : orderItem[`${epFieldName}dictPositionID.name${caseCode}`] || dictPosName
  }

  switch (caseCode) {
    case 'Nom':
      empName = getFullName(orderItem['employeeID.lastName'], orderItem['employeeID.firstName'], config.notUseMiddleNameInOrder ? '' : orderItem['employeeID.middleName'], lastNameInUpperCase)
      break
    case 'Gen':
      empName = orderItem['employeeID.genName']
      break
    case 'Dat':
      empName = orderItem['employeeID.datName']
      break
    case 'Acc':
      empName = orderItem['employeeID.accusativeName']
      break
    case 'Ins':
      empName = orderItem['employeeID.insName']
      break
    case 'Loc':
      empName = orderItem['employeeID.locName']
      break
  }
  if (!empName) {
    empName = getFullName(orderItem['employeeID.lastName'], orderItem['employeeID.firstName'], config.notUseMiddleNameInOrder ? '' : orderItem['employeeID.middleName'], lastNameInUpperCase)
  } else {
    empName = formatFullNameInOrder(empName, config)
  }

  result.depName = orderItem[`${fullFieldName}departmentID.nameGen`] || orderItem[`${fullFieldName}departmentID.name`] || ''
  result.empName = empName || ''
  result.positionName = posName || ''
  result.dictPosName = dictPosName || ''
  if (config.useIsOrgBoss) {
    result.posName = makePositionName(useActualPositionName ? result.dictPosName : result.positionName, orderItem[`${fullFieldName}isOrgBoss`])
  } else {
    result.posName = useActualPositionName ? result.dictPosName : result.positionName
  }
  if (useActualPositionName) {
    const nameAddition = orderItem[`${epFieldName}posNameAddition`] || ''
    const empCategory = orderItem[`${epFieldName}dictEmpCategoryID.genName`] || ''
    const depName = config.fullPositionName
      ? orderItem[`${epFieldName}departmentID.fullNameGen`] || orderItem[`${epFieldName}departmentID.nameGen`] || orderItem[`${epFieldName}departmentID.name`] || ''
      : orderItem[`${epFieldName}departmentID.nameGen`] || orderItem[`${epFieldName}departmentID.name`] || ''

    result.posName = removeDuplicateWords([result.posName, nameAddition, empCategory, depName].filter(Boolean).join(' ') || '')
  }
  return result
}

async function getPositionNameFromEmployeePositionByParams (whereList, organizationID, onDate, caseCode, config) {
  let result
  if (!whereList || !caseCode) return ''
  config = _.merge({
    fullPositionName: true,
    useSexType: false,
    notUseMiddleNameInOrder: false,
    useActualPositionName: AC.settings.get('hrOrderActualPositionName', organizationID || appAC.globalOrganization()) === true
  }, config)

  const atts = ['ID', 'employeeID.sexType', 'positionID.name', 'positionID.mi_treePath', 'positionID.mi_dateFrom', 'positionID.mi_dateTo',
    'positionID.isOrgBoss', 'posNameAddition', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'dictPositionID', 'workPlace']

  atts.push(`positionID.name${caseCode}`)
  if (config.fullPositionName) {
    atts.push(`positionID.fullName${caseCode}`)
  }
  if (config.useSexType) {
    atts.push(`positionID.name${caseCode}F`)
    if (config.fullPositionName) {
      atts.push(`positionID.fullName${caseCode}F`)
    }
  }
  if (config.showPositionCategory) {
    atts.push(`positionID.positionCategory.name`)
  }
  let positionCategoryName = ''

  if (config.useActualPositionName) {
    atts.push(`departmentID.nameGen`)
    atts.push(`departmentID.name`)
    atts.push(`dictPositionID.name${caseCode}`)
    if (config.useSexType) {
      atts.push(`dictPositionID.name${caseCode}F`)
    }
  }

  for (let k = 0; k < 2; k++) {
    let data = UB.Repository('hr_employeePositionS')
      .attrs(atts)
      .where('organizationID', '=', organizationID)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .limit(1)
      .orderBy('workPlace')
    if (config.useActualPositionName) {
      data.joinCondition('departmentID.mi_dateFrom', '<=', onDate)
        .joinCondition('departmentID.mi_dateTo', '>=', onDate)
        .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('departmentID.state', '=', 'ACTIVE')
    }
    if (k === 0) {
      data
        .where('positionID.mi_dateFrom', '<=', onDate)
        .where('positionID.mi_dateTo', '>=', onDate)
    } else {
      data
        .orderBy('positionID.mi_dateFrom', 'desc')
        .orderBy('positionID.mi_dateTo', 'desc')
    }
    whereList.forEach(whereItem => {
      data.where(whereItem[0], whereItem[1], whereItem[2])
    })

    const itemData = await data.selectSingle()
    if (itemData) {
      if (config.useActualPositionName) {
        const fullName = await getFullDepartmentNameByTree(itemData['positionID.mi_treePath'], organizationID, onDate)
        itemData['departmentID.fullNameGen'] = fullName
      }
      itemData.organizationID = organizationID
      result = HR.reportUtils.getInfoItemOrderInCase(itemData, caseCode, false, config.notUseMiddleNameInOrder, '', config)
      if (config.showPositionCategory) {
        positionCategoryName = itemData['positionID.positionCategory.name'] ? ` (${UB.i18n('категорія посади')}: ${itemData['positionID.positionCategory.name']})` : ''
      }

      k = 2
    }
  }
  return result ? result.posName + (result.posName ? positionCategoryName : '') : ''
}

function getAppointmentLinesFoto () {
  return `data:image/jpg;base64,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`
}

async function getInfoFromEmployeePositionByParams (attsArray, whereList, organizationID, onDate, caseCode, config) {
  let result = {
    posName: ''
  }
  attsArray.forEach(el => {
    result[el] = ''
  })

  if (!whereList || !caseCode) return ''
  config = _.merge({
    fullPositionName: true,
    useSexType: false,
    notUseMiddleNameInOrder: false,
    useActualPositionName: AC.settings.get('hrOrderActualPositionName', organizationID || appAC.globalOrganization()) === true
  }, config)

  let atts = ['ID', 'employeeID.sexType', 'positionID.name', 'positionID.mi_treePath', 'positionID.mi_dateFrom', 'positionID.mi_dateTo',
    'positionID.isOrgBoss', 'posNameAddition', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'dictPositionID', 'workPlace']
  if (attsArray) {
    atts.push(...attsArray)
  }

  atts.push(`positionID.name${caseCode}`)
  if (config.fullPositionName) {
    atts.push(`positionID.fullName${caseCode}`)
  }
  if (config.useSexType) {
    atts.push(`positionID.name${caseCode}F`)
    if (config.fullPositionName) {
      atts.push(`positionID.fullName${caseCode}F`)
    }
  }
  if (config.showPositionCategory) {
    atts.push(`positionID.positionCategory.name`)
  }
  let positionCategoryName = ''

  if (config.useActualPositionName) {
    atts.push(`departmentID.nameGen`)
    atts.push(`departmentID.name`)
    atts.push(`dictPositionID.name${caseCode}`)
    if (config.useSexType) {
      atts.push(`dictPositionID.name${caseCode}F`)
    }
  }
  atts = _.uniq(atts)
  for (let k = 0; k < 2; k++) {
    let data = UB.Repository('hr_employeePositionS')
      .attrs(atts)
      .where('organizationID', '=', organizationID)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .limit(1)
      .orderBy('workPlace')
    if (config.useActualPositionName) {
      data.joinCondition('departmentID.mi_dateFrom', '<=', onDate)
        .joinCondition('departmentID.mi_dateTo', '>=', onDate)
        .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('departmentID.state', '=', 'ACTIVE')
    }
    if (k === 0) {
      data
        .where('positionID.mi_dateFrom', '<=', onDate)
        .where('positionID.mi_dateTo', '>=', onDate)
    } else {
      data
        .orderBy('positionID.mi_dateFrom', 'desc')
        .orderBy('positionID.mi_dateTo', 'desc')
    }
    whereList.forEach(whereItem => {
      data.where(whereItem[0], whereItem[1], whereItem[2])
    })

    const itemData = await data.selectSingle()
    if (itemData) {
      if (config.useActualPositionName) {
        const fullName = await getFullDepartmentNameByTree(itemData['positionID.mi_treePath'], organizationID, onDate)
        itemData['departmentID.fullNameGen'] = fullName
      }
      itemData.organizationID = organizationID
      const data = HR.reportUtils.getInfoItemOrderInCase(itemData, caseCode, false, config.notUseMiddleNameInOrder, '', config)
      if (config.showPositionCategory) {
        positionCategoryName = itemData['positionID.positionCategory.name'] ? ` (${UB.i18n('категорія посади')}: ${itemData['positionID.positionCategory.name']})` : ''
      }
      result.posName = data.posName ? data.posName + (data.posName ? positionCategoryName : '') : ''
      attsArray.forEach(el => {
        result[el] = itemData[el]
      })

      k = 2
    }
  }
  return result
}

function formatFullNameInOrder (fullName, config) {
  config = config || {}
  config = _.merge({
    lastNameInUpperCase: true,
    notUseMiddleNameInOrder: false,
    delimiters: [' ', ' ']
  }, config)

  fullName = delRepeatedSpaces(fullName)
  const parts = fullName.split(' ')
  let result = parts[0] || ''
  if (config.lastNameInUpperCase) {
    result = result.toUpperCase()
  } else {
    result = result ? result.toLowerCase().split('-').map(HR.nameCase.cap).join('-') : ''
  }

  if (parts[1]) {
    result += (config.delimiters[0] || ' ') + parts[1].toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  if (!config.notUseMiddleNameInOrder && parts[2]) {
    result += (config.delimiters[1] || ' ') + parts[2].toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  return result
}

function formatShortNameInOrder (fullName, config) {
  config = config || {}
  config = _.merge({
    lastNameInUpperCase: false,
    notUseMiddleNameInOrder: false,
    separator: ' '
  }, config)

  fullName = delRepeatedSpaces(fullName)
  const parts = fullName.split(' ')
  let result = parts[0]
  if (config.lastNameInUpperCase) {
    result = result.toUpperCase()
  } else {
    result = result.toLowerCase().split('-').map(HR.nameCase.cap).join('-')
  }
  if (parts[1]) {
    result += (config.separator || ' ') + parts[1].charAt(0).toUpperCase() + '.'
    if (!config.notUseMiddleNameInOrder && parts[2]) {
      result += parts[2].charAt(0).toUpperCase() + '.'
    }
  }
  return result
}

function copyToParams (params, configObj) {
  if (params && configObj) {
    for (let key in configObj) {
      params[key] = configObj[key]
    }
  }
}

async function getEmployeeChange (employeeAttrs, onDate, orderID, employeeIDs = []) {
  if (!employeeAttrs || !employeeAttrs.length) return {}
  if (!orderID && !employeeIDs.length) return {}

  const employeeAttrsOld = []
  const alias = {}
  employeeAttrs.forEach(attr => {
    employeeAttrsOld.push(`${attr}Old`)
    alias[`${attr}Old`] = attr
  })

  let employeeChangeNames = UB.Repository('hr_employeeChange')
    .attrs(['orderDate', 'employeeID'])
    .attrs(employeeAttrsOld)
    .where('orderDate', '>', onDate)
    .whereIf(employeeIDs && employeeIDs.length > 1, 'employeeID', 'in', employeeIDs)
    .whereIf(employeeIDs && employeeIDs.length === 1, 'employeeID', '=', employeeIDs[0])

  if (orderID) {
    employeeChangeNames.exists(UB.Repository('hr_empOrderDet')
      .correlation('employeeID', 'employeeID')
      .where('orderID', '=', orderID)
      .where('mi_deleteDate', '>=', '#maxdate'))
  }

  employeeChangeNames = await employeeChangeNames.selectAsObject(alias)
  employeeChangeNames = employeeChangeNames.length ? _.groupBy(employeeChangeNames, 'employeeID') : {}
  return employeeChangeNames
}

async function checkEmployeeChange (onDate, employeeAttrs, orderDet, orderID, fieldName = 'employeeID') {
  if (!onDate) return
  if (!employeeAttrs || !employeeAttrs.length) return

  const employeeIDs = !orderID && orderDet && orderDet.length ? _.uniq(orderDet.filter(el => el[fieldName]).map(el => el[fieldName])) : []
  if (!employeeIDs || !employeeIDs.length) return

  const employeeChangeNames = orderID
    ? await HR.reportUtils.getEmployeeChange(employeeAttrs, onDate, orderID)
    : employeeIDs && employeeIDs.length ? await HR.reportUtils.getEmployeeChange(employeeAttrs, onDate, undefined, employeeIDs) : {}

  orderDet.forEach(el => {
    if (el[fieldName] && employeeChangeNames[el[fieldName]]) { // if employee have changes in names
      const lastValues = employeeChangeNames[el[fieldName]].sort((a, b) => b.orderDate >= a.orderDate)[0]
      employeeAttrs.forEach(attr => {
        el[`${fieldName}.${attr}`] = lastValues[attr] || ''
      })
    }
  })
}
