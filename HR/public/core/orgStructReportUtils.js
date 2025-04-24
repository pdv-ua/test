/* global Ext UB _ AC HR appAC $App */
module.exports = {
  getResultObj,
  fundSumToStr,
  getOrganizationData,
  getDepartmentIDs,
  getStaffUnitData,
  getPositionData,
  getEmployeePositionData,
  getEmpLongTermAbscData,
  getEmpCertificationAccData,
  getParamsOrgStructConsolidated,
  generateDataConsolidated,
  generateGroupedData,
  getSettingsForReport,
  getSingers,
  getEmployeeAccrualData,
  getEmployeeRankData,
  getPayElExperience,
  getEmployeeExperience,
  getEmployeeTarifCategoryData,
  getSingerInfo,
  getSignatoryCombos,
  getColumnsAccrualData,
  fillPositionByTarifAndSchemeInfo,
  generateDataForReportWithAccrual,
  setZeroToNullValue,
  getPayPermInfo,
  getConfigAddToMinimum
}

async function getSingerInfo (employeePositionID, positionID, onDate, role = '') {
  const result = {
    positionName: '',
    employeeFIO: '',
    employeeName: '',
    organizationID: '',
    organizationName: ''
  }
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  if (!employeePositionID) {
    return undefined // result
  }
  let respPosID
  if (employeePositionID) {
    const fieldList = ['employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName',
      'positionID.name', 'positionID.fullName', 'positionID.mi_data_id', 'organizationID' /* , 'organizationID.name' */]

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

    if (respPosInfo.length) {
      const respPosItem = respPosInfo[0]
      result.positionName = HR.nameCase.cap(respPosItem['positionID.fullName'] || respPosItem['positionID.name'] || '')
      result.employeeName = [respPosItem['employeeID.firstName'], (respPosItem['employeeID.lastName'] || '').toUpperCase()].join(' ')
      result.employeeFIO = HR.reportUtils.formatSignerName(respPosItem['employeeID.lastName'], respPosItem['employeeID.firstName'], respPosItem['employeeID.middleName'])
      result.organizationID = respPosItem['organizationID']
      // result.organizationName = respPosItem['organizationID'] === appAC.globalOrganization() ? '' : respPosItem['organizationID.name']
      respPosID = respPosItem['positionID.mi_data_id']
    }
  }

  // для виконуючих обов'язків
  if (positionID && respPosID && positionID !== respPosID) {
    const responsAbbr = AC.settings.get('hrResponsAbbr', appAC.globalOrganization()) || UB.i18n('В.о.')

    for (let k = 0; k < 2; k++) {
      const posInfoData = await UB.Repository('hr_position')
        .attrs(['fullNameGen', 'nameGen', 'fullName', 'name', 'orgID'])
        .where('mi_data_id', '=', positionID)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
        .whereIf(k === 0, 'mi_dateFrom', '<=', onDate)
        .whereIf(k === 0, 'mi_dateTo', '>=', onDate)
        .orderBy('mi_dateFrom', 'desc')
        .orderBy('mi_dateTo', 'desc')
        .selectAsObject()
      if (posInfoData && posInfoData.length) {
        result.positionName = responsAbbr + ' ' + (posInfoData[0]['fullNameGen'] || posInfoData[0]['nameGen'] || posInfoData[0]['fullName'] || posInfoData[0]['name'] || '')
        result.organizationID = posInfoData[0].orgID
        k = 2
      }
    }
  }

  // получим название организации
  if (result.organizationID && /* positionID && */ role) {
    const respData = await UB.Repository('hr_orgRespPosition')
      .attrs(['useFullNamePosition'])
      // .where('positionID', '=', positionID)
      .where('organizationID', '=', appAC.globalOrganization())
      .where('[dateFrom]', '<=', onDate)
      .where('[dateTo]', '>=', onDate, 'dt1')
      .where('[dateTo]', 'isNull', undefined, 'dt2')
      .where('respPosition', 'in', role)
      .where('mi_deleteDate', '>=', '#maxdate')
      .logic('([dt1] OR [dt2])')
      .selectAsObject()
    if (respData && respData.length) {
      const useFullNamePosition = respData[0].useFullNamePosition
      if (!useFullNamePosition) {
        const orgData = await UB.Repository('hr_organization')
          .attrs(['conditionalName', 'name'])
          .where('mi_data_id', '=', result.organizationID)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectSingle()
        result.organizationName = orgData ? orgData.conditionalName || orgData.name || '' : ''
      }
    }
  }
  return Promise.resolve(result)
}

async function getResultObj (reportParams) {
  const onDate = reportParams.onDate || AC.dateService.todayDate()
  const result = {
    data: [],
    showTotals: true,
    onDate: AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.')),
    year: onDate.getFullYear(),
    positionCategoryName: reportParams.positionCategoryName || 'керівників, професіоналів, фахівців, технічних службовців та робітників',
    departmentName: '',
    fundSourceName: reportParams.dictFundSourceName || '',
    progClassName: reportParams.dictProgClass || '',
    fundName: reportParams.dictFundTypeName ? reportParams.dictFundTypeName + UB.i18n(' фонд') : '',
    showNn: (reportParams.showNn !== undefined) ? reportParams.showNn : true,
    showCategory: (reportParams.showCategory !== undefined) ? reportParams.showCategory : true,
    showTarifTable: (reportParams.showTarifTable !== undefined) ? reportParams.showTarifTable : true,
    showWokers: (reportParams.showWokers !== undefined) ? reportParams.showWokers : true,
    showEmpInfo: (reportParams.showEmpInfo !== undefined) ? reportParams.showEmpInfo : false,
    groupPos: reportParams.groupPos || false,
    showDeptCodes: (reportParams.showDeptCodes !== undefined) ? reportParams.showDeptCodes : true,
    showAddInfo: (reportParams.dontShowAddInfo !== undefined) ? !reportParams.dontShowAddInfo : true,
    monthsFop: (reportParams.monthsFop !== undefined) ? reportParams.monthsFop : 0,
    showFop: ((reportParams.monthsFop !== undefined) ? reportParams.monthsFop : 0) !== 0,
    totalFunsSumToWord: '',
    signData: [],
    agreeData: [],
    docInfo: reportParams.docInfo ? reportParams.docInfo.split('/').map(el => { return { text: el } }) : [],
    positionCategoryGroupBy: reportParams.positionCategoryGroupBy === undefined ? [] : reportParams.positionCategoryGroupBy ? reportParams.positionCategoryGroupBy.replace(/\"/g, '').replace(/"/g, '').split(',').sort() : []
  }
  result.monthsFopStr = result.monthsFop ? `${result.monthsFop}&nbsp;${AC.dateService.plural(UB.i18n('місяць_місяці_місяців'), result.monthsFopStr)}` : ''
  getSettingsForReport(result, reportParams.roundTo) //, reportParams.organizationID)
  await getSingers(result, reportParams, onDate)

  if (reportParams.departmentID) {
    const depNames = await UB.Repository('hr_department')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
  }

  return result
}

async function getSingers (result, reportParams, onDate) {
  if (reportParams.respEmp1) {
    const respPosInfo = await getSingerInfo(reportParams.respEmp1, reportParams.respPositionID1, onDate, 'signer4Stafflist')
    result.signData.push({
      posName: (respPosInfo && respPosInfo.positionName) || '',
      empName: (respPosInfo && respPosInfo.employeeName) || '',
      orgName: (respPosInfo && respPosInfo.organizationName) || ''
    })
    if (reportParams.respEmp2 && reportParams.respEmp2 === reportParams.respEmp1 && reportParams.respPositionID2 === reportParams.respPositionID1) {
      result.signData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp2 = null
      reportParams.respPositionID2 = null
    }
    if (reportParams.respEmp3 && reportParams.respEmp3 === reportParams.respEmp1 && reportParams.respPositionID3 === reportParams.respPositionID1) {
      result.agreeData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp3 = null
      reportParams.respPositionID3 = null
    }
    if (result.twoApprover && reportParams.respEmp4 && reportParams.respEmp4 === reportParams.respEmp1 && reportParams.respPositionID4 === reportParams.respPositionID1) {
      result.agreeData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp4 = null
      reportParams.respPositionID4 = null
    }
  }
  if (reportParams.respEmp2) {
    const respPosInfo = await getSingerInfo(reportParams.respEmp2, reportParams.respPositionID2, onDate, 'signer4StafflistSecond')
    result.signData.push({
      posName: (respPosInfo && respPosInfo.positionName) || '',
      empName: (respPosInfo && respPosInfo.employeeName) || '',
      orgName: (respPosInfo && respPosInfo.organizationName) || ''
    })
    if (reportParams.respEmp3 && reportParams.respEmp3 === reportParams.respEmp2 && reportParams.respPositionID3 === reportParams.respPositionID2) {
      result.agreeData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp3 = null
      reportParams.respPositionID3 = null
    }
    if (result.twoApprover && reportParams.respEmp4 && reportParams.respEmp4 === reportParams.respEmp2 && reportParams.respPositionID4 === reportParams.respPositionID2) {
      result.agreeData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp4 = null
      reportParams.respPositionID4 = null
    }
  }
  if (reportParams.respEmp3) {
    const respPosInfo = await getSingerInfo(reportParams.respEmp3, reportParams.respPositionID3, onDate, 'approver4Stafflist')
    result.agreeData.push({
      posName: (respPosInfo && respPosInfo.positionName) || '',
      empName: (respPosInfo && respPosInfo.employeeName) || '',
      orgName: (respPosInfo && respPosInfo.organizationName) || ''
    })
    if (result.twoApprover && reportParams.respEmp4 && reportParams.respEmp4 === reportParams.respEmp3 && reportParams.respPositionID4 === reportParams.respPositionID3) {
      result.agreeData.push({
        posName: (respPosInfo && respPosInfo.positionName) || '',
        empName: (respPosInfo && respPosInfo.employeeName) || '',
        orgName: (respPosInfo && respPosInfo.organizationName) || ''
      })
      reportParams.respEmp4 = null
      reportParams.respPositionID4 = null
    }
  }
  if (result.twoApprover && reportParams.respEmp4) {
    const respPosInfo = await getSingerInfo(reportParams.respEmp4, reportParams.respPositionID4, onDate, 'approver4StafflistSecond')
    result.agreeData.push({
      posName: (respPosInfo && respPosInfo.positionName) || '',
      empName: (respPosInfo && respPosInfo.employeeName) || '',
      orgName: (respPosInfo && respPosInfo.organizationName) || ''
    })
  }
  if (reportParams.respEmp5) {
    const respPosInfo = await getSingerInfo(reportParams.respEmp5, reportParams.respPositionID5, onDate, 'approverOfStaffList')
    result.approverData.push({
      approverPosName: (respPosInfo && respPosInfo.positionName) || '',
      approverEmpName: (respPosInfo && respPosInfo.employeeName) || '',
      approverOrgName: (respPosInfo && respPosInfo.organizationName) || '',
      approverOrgID: (respPosInfo && respPosInfo.organizationID) || null
    })
  } else if (reportParams.respPositionID5) {
    const posInfoData = await UB.Repository('hr_position')
      .attrs(['fullName', 'name', 'orgID', 'orgID.name'])
      .where('mi_data_id', '=', reportParams.respPositionID5)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .orderBy('mi_dateFrom', 'desc')
      .orderBy('mi_dateTo', 'desc')
      .selectAsObject()
    if (posInfoData && posInfoData.length) {
      result.approverData.push({
        approverPosName: posInfoData[0]['fullName'] || posInfoData[0]['name'] || '',
        approverOrgName: posInfoData[0]['orgID'] === appAC.globalOrganization() ? '' : posInfoData[0]['orgID.name']
      })
    }
  }
}

function fundSumToStr (fundSum, roundTo) {
  let result = ''
  if (fundSum > 0) {
    let currencyStr = AC.currencyService.currencyToWordsUkr(fundSum, false)
    if (roundTo === 'numberGroup') {
      currencyStr = currencyStr.split(' ')
      currencyStr = currencyStr.filter((val, key) => key < (currencyStr.length - 2)).join(' ')
    } else {
      currencyStr = currencyStr.replace(UB.i18n(' копійка'), UB.i18n('&nbsp;копійка'))
      currencyStr = currencyStr.replace(UB.i18n(' копійки'), UB.i18n('&nbsp;копійки'))
      currencyStr = currencyStr.replace(UB.i18n(' копійок'), UB.i18n('&nbsp;копійок'))
    }
    currencyStr = currencyStr.replace(UB.i18n(' гривня'), UB.i18n('&nbsp;гривня'))
    currencyStr = currencyStr.replace(UB.i18n(' гривні'), UB.i18n('&nbsp;гривні'))
    currencyStr = currencyStr.replace(UB.i18n(' гривень'), UB.i18n('&nbsp;гривень'))
    result = ` (${currencyStr.toLowerCase()})`
  }
  return result
}

async function getOrganizationData (onDate, organizationID, includeChildOrgs) {
  return await UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'nameLoc', 'nameGen', 'name', 'shortName', 'parentUnitID', 'parentUnitID.shortName@hr_organization', 'parentUnitID.name@hr_organization'])
    .whereIf(includeChildOrgs, 'mi_treePath', 'like', `/${organizationID}/`)
    .whereIf(!includeChildOrgs, 'mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .where('mi_deleteDate', '>=', '#maxdate')
    .joinCondition('parentUnitID.state@hr_organization', '=', 'ACTIVE')
    .joinCondition('parentUnitID.mi_dateFrom@hr_organization', '<=', onDate)
    .joinCondition('parentUnitID.mi_dateTo@hr_organization', '>=', onDate)
    .joinCondition('parentUnitID.mi_deleteDate@hr_organization', '>=', '#maxdate')
    .orderBy('mi_treePath')
    .selectAsObject()
}

async function getDepartmentIDs (onDate, childOrgIDs, departmentID, includeChildDepts) {
  let departments = []
  if (departmentID) {
    if (includeChildDepts) {
      const departmentData = await UB.Repository('hr_department')
        .attrs(['mi_treePath'])
        .where('orgID', 'in', childOrgIDs)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
        .where('mi_data_id', '=', departmentID)
        .misc({ __mip_recordhistory_all: true })
        .groupBy(['mi_data_id', 'mi_treePath'])
        .selectSingle()
      departments = await UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', 'in', childOrgIDs)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
        .where('mi_treePath', 'startsWith', departmentData.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      departments = departments.map(o => o.mi_data_id)
    } else {
      departments = [departmentID]
    }
  }
  return departments
}

async function getStaffUnitData (onDate, childOrgIDs, departmentID, includeChildDepts, departments, additionalInfoDepartment = true) {
  let orgStruct = await UB.Repository('hr_staffUnit')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'orgID'])
    .where('liquidate', '=', 0)
    .where('state', '=', 'ACTIVE')
    /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
    .whereIf(!childOrgIDs || childOrgIDs.length === 0, 'parentUnitID', 'isNotNull')
    .orderBy('idxNum')
  if (departmentID && includeChildDepts) {
    orgStruct
      .where('mi_treePath', 'like', '/' + departmentID + '/', 'u1')
      .where('ID', '=', departmentID, 'u2')
      .where('mi_data_id', '=', departmentID, 'u2')
      .logic('([u1] or [u2])')
  }
  if (departmentID && !includeChildDepts) {
    orgStruct
      .where('parentUnitID', '=', departmentID, 'u1')
      .where('mi_data_id', '=', departmentID, 'u2')
      .where('mi_unityEntity', '=', 'hr_position', 'u3')
      .logic('(([u1] and [u3]) or [u2])')
  }

  orgStruct = await orgStruct.selectAsObject()

  if (additionalInfoDepartment) {
    const deptData = await UB.Repository('hr_department')
      .attrs(['ID', 'dictDepTypeID.name', 'dictDepTypeID.nameGen', 'nameDat'])
      .where('orgID', 'in', childOrgIDs)
      .whereIf(departments.length, 'mi_data_id', 'in', departments)
      .misc({ __mip_ondate: onDate })
      .joinCondition('dictDepTypeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('departmentKindID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })
  }

  return orgStruct
}

async function getPositionData (onDate, childOrgIDs, departments, dictFundSourceID, positionCategory, showAddInfo = false, showTarifInfo = false, military = false) {
  const posData = UB.Repository('hr_position')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.dictProfessionID.code', 'dictPositionID.name', 'quantity',
      'paymentType', 'positionCategory', 'positionCategory.sortOrder', 'positionCategory.name', 'name', 'comment'])
    .attrsIf(showAddInfo, ['dictCostTypeID.name', 'dictCostTypeID.accountID.description', 'dictEmpCategoryID.name', 'dictSalarySchemeLevelID.name'])
    .attrsIf(showAddInfo || showTarifInfo, ['dictTarifCoeffID.name'])
    .attrsIf(showTarifInfo, ['dictTarifCoeffID.accrualSum', 'dictTarifCoeffID.code', 'dictTarifCoeffID'])
    .attrsIf(military, ['dictTarifCoeffID.name', 'positionType', 'dictMilitarySpecialityID.code', 'dictMilitaryRankID.name'])
    .attrsIf(dictFundSourceID, ['fundSourcePositionID.ID', 'fundSourcePositionID.quantity'])
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
    .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
    .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
    .whereIf(positionCategory, 'positionCategory', '=', positionCategory)
    .whereIf(departments.length, 'parentUnitID', 'in', departments)
    .orderBy('dictPositionID.fullName')
    .orderBy('dictPositionID.name')

  if (dictFundSourceID) {
    posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
  }

  return await posData.selectAsObject()
}

function getEmployeePositionData (onDate, childOrgIDs, departments, dictFundSourceID, positionCategory, showTarifInfo = false) {
  const empData = UB.Repository('hr_employeePositionS')
    .attrs(['organizationID', 'positionID', 'employeeID', 'employeeNumberID', 'employeeID.shortFIO', 'mtCount', 'accrualSum', 'employeeNumberID.limitedAccess'])
    .attrsIf(showTarifInfo, ['dictTarifCoeffID.name'])
    .attrsIf(dictFundSourceID, ['fundSourceEmpPosID.ID', 'fundSourceEmpPosID.mtCount'])
    .where('isActive', '=', true)
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(childOrgIDs.length, 'positionID.orgID', 'in', childOrgIDs)
    .whereIf(departments.length, 'departmentID', 'in', departments)
    .whereIf(dictFundSourceID, 'fundSourceEmpPosID.dictFundSourceID', '=', dictFundSourceID)
    .whereIf(positionCategory, 'positionID.positionCategory', '=', positionCategory)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')

  if (dictFundSourceID) {
    empData.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
  }

  return empData
}

async function getEmpLongTermAbscData (onDate, employeeIDs, empDataPromise) {
  let empLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'orderID', 'paraID', 'description'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)

  if (employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024) {
    empLongTermAbsc.where('employeeNumberID', 'in', employeeIDs)
  } else {
    empLongTermAbsc.exists(empDataPromise)
  }

  empLongTermAbsc = await empLongTermAbsc.selectAsObject()

  const config = [{
    type: 'VACATION',
    ub: 'hr_empOrderVacationListDet',
    attr: ['dictVacationKindID.shortName', 'dictVacationKindID.name'],
    alias: {}
  }, {
    type: 'VACATIONLONG',
    ub: 'hr_empOrderVacationlongDet',
    attr: ['dictVacationKindID.shortName', 'dictVacationKindID.name'],
    alias: {}
  }, {
    type: 'VACATIONPROLONGL',
    ub: 'hr_empOrderVacationprolonglDet',
    attr: ['primeVacationParaID.dictVacationKindID.shortName', 'primeVacationParaID.dictVacationKindID.name'],
    alias: {
      'primeVacationParaID.dictVacationKindID.shortName': 'dictVacationKindID.shortName',
      'primeVacationParaID.dictVacationKindID.name': 'dictVacationKindID.name'
    }
  }]

  for (let i = 0; i < empLongTermAbsc.length; i++) {
    const item = empLongTermAbsc[i]
    item.vacationKind = (item.description || 'довготривала відпустка').substr(0, 30)

    if (item.orderID && item.paraID) {
      const empOrderType = await UB.Repository('hr_empOrderDet')
        .attrs('empOrderType')
        .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
        .where('orderID', '=', item.orderID)
        .where('ID', '=', item.paraID)
        .selectScalar()

      if (empOrderType && empOrderType === 'MILSERVICE') {
        item.vacationKind = 'військ.'
      }
      if (empOrderType && empOrderType !== 'MILSERVICE') {
        const flt = _.find(config, { type: empOrderType })
        if (flt) {
          const orderDet = await UB.Repository(flt.ub)
            .attrs(flt.attr)
            .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
            .where('ID', '=', item.paraID)
            .selectSingle(flt.alias)
          item.vacationKind = orderDet ? orderDet['dictVacationKindID.shortName'] || orderDet['dictVacationKindID.name'] || '' : ''
        }
      }
    }
  }
  return empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : {}
}

async function getEmpCertificationAccData (employeeIDs, empDataPromise) {
  let empCertificationAcc = UB.Repository('hr_empCertificationAcc')
    .attrs(['ID', 'employeeID', 'dictSpecialtyID', 'dictEmpCategoryID.name', 'certificationDate', 'validityDate',
      'orderAuthor', 'orderDate', 'orderNumber', 'dictSpecialtyID.name'])
    .orderBy('certificationDate')

  if (employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024) {
    empCertificationAcc.where('employeeID', 'in', employeeIDs)
  } else {
    empCertificationAcc.exists(empDataPromise)
  }

  empCertificationAcc = await empCertificationAcc.selectAsObject()
  return empCertificationAcc && empCertificationAcc.length ? _.groupBy(empCertificationAcc, 'employeeID') : {}
}

function getSignatoryCombos (config) {
  config = config || {}
  const noOrgRespPosition = config.noOrgRespPosition || true
  const onDate = config.onDate || appAC.globalApplicationDate()

  function filterRespEmpSignatoryCombos (form, posID, ctrlName) {
    const respEmpIDCtrl = form.down(`[name=${ctrlName}]`)
    let store = respEmpIDCtrl.getStore ? respEmpIDCtrl.getStore() : respEmpIDCtrl.store
    let onDateToRequest = onDate
    if (config.onDateControl) {
      const dateCtrl = form.down(`[name=${config.onDateControl}]`)
      onDateToRequest = dateCtrl.getValue() || onDate
    }
    store.ubRequest.positionID = posID
    store.ubRequest.onDate = onDateToRequest
    store.ubRequest.method = 'getTempExecution'

    store.load().then(() => {
      respEmpIDCtrl.clearIsPhantom()
    })
  }
  const resWhereList = {
    state: {
      expression: '[state]',
      condition: '=',
      value: 'ACTIVE'
    },
    mi_dateFrom: {
      expression: '[mi_dateFrom]',
      condition: '<=',
      value: onDate
    },
    mi_dateTo: {
      expression: '[mi_dateTo]',
      condition: '>=',
      value: onDate
    }
  }
  if (noOrgRespPosition) {
    resWhereList.orgID = {
      expression: '[orgID]',
      condition: '=',
      value: appAC.globalOrganization()
    }
  } else {
    resWhereList.isSigner = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'exists',
      value: {
        entity: 'hr_orgRespPosition',
        fieldList: ['ID'],
        method: 'select',
        whereList: {
          cond: {
            expression: '[positionID]=[{master}.mi_data_id]',
            condition: 'custom'
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          },
          orgID: {
            expression: '[organizationID]',
            condition: '=',
            value: appAC.globalOrganization()
          },
          signer4Ref: {
            expression: '[respPosition]',
            condition: 'equal',
            value: config.signer4EmpOrder || 'signer4Ref'
          }
        }
      }
    }
  }
  const res = {
    layout: { type: 'vbox', align: 'stretch' },
    items: [
      {
        xtype: 'ubcombobox',
        name: config.name1 || 'respPositionID',
        fieldLabel: config.fieldLabel1 || UB.i18n('Підписант (посада)'),
        valueField: 'mi_data_id',
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        labelWidth: config.labelWidth || 160,
        width: config.width || 650,
        allowBlank: config.allowBlank,
        disableContextMenu: true,
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_position',
          fieldList: ['mi_data_id', 'description', 'nameGen'],
          whereList: resWhereList,
          orderList: { orderBy: { expression: 'description' } }
        },
        listeners: {
          change: function (ctrl) {
            const form = ctrl.up('form')
            const posID = ctrl.getValue() || 0
            filterRespEmpSignatoryCombos(form, posID, config.name2 || 'respEmp')
          }
        }
      },
      {
        xtype: 'ubcombobox',
        name: config.name2 || 'respEmp',
        fieldLabel: config.fieldLabel2 || UB.i18n('Підписав'),
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        labelWidth: config.labelWidth || 160,
        width: config.width || 650,
        allowBlank: config.allowBlank,
        disableContextMenu: true,
        disableModifyEntity: true,
        fieldList: ['ID', 'description', 'positionID', 'employeeID', 'employeeNumberID'],
        valueField: 'ID',
        ubRequest: {
          entity: 'hr_employeePositionS',
          method: 'getTempExecution',
          fieldList: ['ID', 'description', 'positionID', 'employeeID', 'employeeNumberID'],
          gridFieldList: ['description'],
          orderList: { orderBy: { expression: 'description' } }
        },
        listeners: {
          render: function (ctrl) {
            const store = ctrl.store
            function setFirstVal () {
              const storeItems = ctrl.store.data.items
              const form = ctrl.up('form')
              const respPositionIDCtrl = form.down(`[name=${config.name1 || 'respPositionID'}]`)
              const posID = respPositionIDCtrl.getValue() || 0
              const selItem = _.find(storeItems, { data: { positionID: posID } })
              if (selItem && storeItems.length === 1) {
                ctrl.setValue(selItem.data.ID)
              }
            }
            store.on('load', setFirstVal)
            store.load()
          }
        }
      }
    ]
  }
  return _.merge(res, config)
}

function getParamsOrgStructConsolidated (me, typeReport) {
  const organizationID = appAC.globalOrganization()
  const funcOrgType = AC.settings.get('hrFuncOrgType', organizationID)
  const docInfo = AC.settings.get('hrDocInfoForOrgstruct', organizationID) || ''
  const incomeParams = this.incomeParams || {}
  const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
  const showTarifInfo = AC.settings.get('hrStaffReportShowTarifCategory', organizationID) === true
  const twoApprover = AC.settings.get('hrTwoApproverInStaffTable', organizationID) === true
  const shortNamePayEl = AC.settings.get('hrShortNamePayEl', organizationID) === true

  function getListParamTabs (currTabs, tabListToAdd, fieldList = [], formCode, formListCode = null, enablePayElOrderN = false,
    btAddListName = UB.i18n('Додати списком'), isEditable = false, otherParams = {}) {
    if (!me.listParamTabs) me.listParamTabs = {}
    const tabsCode = tabListToAdd.map(tab => tab.code)
    UB.Repository('hr_listParam')
      .attrs('ID', 'code')
      .where('code', 'in', tabsCode)
      .selectAsObject().then(res => {
        res.forEach(item => {
          me.listParamTabs[item.code] = item.ID
        })
      })
    const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
    tabListToAdd.forEach(({ code, title, hidden = false }) => {
      currTabs.push({
        itemId: code,
        title: title,
        hidden: hidden,
        height: 400,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'entitygridpanel',
            cmdType: 'showList',
            autoScroll: true,
            pageSize: 10000,
            flex: 1,
            hideActions: ['showPreview', 'itemLink', 'commandLink', 'addNewByCurrent', 'detail', !isEditable ? 'edit' : '', formListCode ? 'addNew' : ''],
            openForm: function () { },
            entityConfig: {
              entity: 'hr_idParam',
              method: 'select',
              fieldList,
              whereList: {
                byTab: {
                  expression: '[listParamID.code]',
                  condition: 'equal',
                  values: { code: code }
                },
                byOrgID: {
                  expression: '[orgID]',
                  condition: 'equal',
                  values: { orgID: Number(parentOrdID || appAC.globalOrganization()) }
                }
              }
            },
            onAddNew: function () {
              const grid = this
              const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
              $App.doCommand({
                cmdType: 'showForm',
                formCode,
                entity: 'hr_idParam',
                initialFieldValues: {
                  listParamID: me.listParamTabs[code],
                  orgID: Number(parentOrdID || appAC.globalOrganization())
                },
                cmpInitConfig: {
                  tabsCode
                },
                store: grid.getStore()
              })
            },
            onEdit: function (ev) {
              const grid = this
              const record = AC.gridUtils.getCurrentRecord(grid)

              $App.doCommand({
                cmdType: 'showForm',
                formCode,
                entity: 'hr_idParam',
                instanceID: record.get('ID'),
                cmpInitConfig: {
                  tabsCode,
                  editFld: 'dopName'
                },
                store: grid.getStore(),
                sender: grid
              })
            },
            onItemDblClick: function (grid, record) {
              if (!formListCode) {
                const item = this
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode,
                  entity: 'hr_idParam',
                  instanceID: record.get('ID'),
                  cmpInitConfig: {
                    tabsCode
                  },
                  store: grid.getStore(),
                  sender: item
                })
              }
            },
            customActions: [
              {
                itemId: 'addList',
                text: btAddListName,
                actionId: 'addByList',
                iconCls: 'fas fa-edit',
                scale: 'medium',
                cls: 'fill-action',
                hidden: !formListCode,
                handler: function (btn) {
                  const grid = btn.up('entitygridpanel')
                  const sourceData = (grid.getStore().snapshot || grid.getStore().data).items.map(o => o.getData())
                  const selectData = sourceData.map(o => o.valuesID)
                  const sourceAttr = formListCode === 'hr_payElSelect' ? 'valuesID' : null
                  const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: formListCode,
                    entity: 'hr_idParam',
                    cmpInitConfig: {
                      selectData,
                      sourceData,
                      sourceAttr,
                      exclude: ['OTHER'],
                      isAutoCalc: otherParams.isAutoCalc && otherParams.isAutoCalc === 1 ? 1 : null,
                      methodGroupCode: otherParams.methodGroupCode || null,
                      methodCode: otherParams.methodCode || null,
                      payElEntryType: otherParams.groupType ? otherParams.groupType : ['FOZP', 'FDZP', 'ZKV'].includes(code) ? ['PAYMENT'] : null,
                      listParamID: me.listParamTabs[code],
                      tabsCode,
                      orgID: Number(parentOrdID || appAC.globalOrganization()),
                      enableOrderN: enablePayElOrderN,
                      onSelectData: (data) => {
                        if (data.remove.length || data.add.length || data.update.length) {
                          $App.connection.run({
                            entity: 'hr_idParam',
                            method: 'updateValuesIDs',
                            listParamID: me.listParamTabs[code],
                            orgID: Number(parentOrdID || appAC.globalOrganization()),
                            data: JSON.stringify(data)
                          }).then(() => {
                            grid.getStore().load()
                          })
                        }
                      }
                    },
                    store: grid.getStore()
                  })
                }
              },
              {
                itemId: 'deleteAll',
                text: UB.i18n('Видалити все'),
                actionId: 'deleteAll',
                iconCls: 'fa fa-eraser',
                cls: 'add-list-action',
                hidden: !!formListCode,
                handler: function (btn) {
                  const grid = btn.up('entitygridpanel')
                  const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
                  grid.store.data.items.length && $App.dialogYesNo('Попередження', UB.i18n('Видалити всі записи?'))
                    .then(res => {
                      if (res) {
                        $App.connection.run({
                          entity: 'hr_idParam',
                          method: 'deleteRecordsByCode',
                          execParams: {
                            code,
                            orgID: Number(parentOrdID || appAC.globalOrganization())
                          }
                        }).then(() => {
                          grid.onRefresh()
                        })
                      }
                    })
                }
              }
            ],
            listeners: {
              refresh: function () {
                const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
                this.store.ubRequest.whereList.byOrgID.values.orgID = Number(parentOrdID || appAC.globalOrganization())
              },
              beforeQuerySend: function () {
                const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', appAC.globalOrganization())
                this.store.ubRequest.whereList.byOrgID.values.orgID = Number(parentOrdID || appAC.globalOrganization())
              }
            }
          }
        ]
      })
    })
  }

  const panelParam = {
    xtype: 'panel',
    layout: { type: 'vbox', align: 'stretch' },
    overflowX: false,
    overflowY: true,
    maxHeight: 450,
    items: [
      HR.controlService.getCollapseInfoPanel('Звіт формується по даним по окладу та нарахуванням, які взяті з карток посад штатної книги станом на вказану дату.'),
      {
        layout: { type: 'hbox' },
        items: [
          HR.controlService.getOrgCombo({
            labelWidth: 160,
            flex: 1,
            readOnly: !accMainReportsSubOrg,
            ubRequest: {
              entity: 'hr_organization',
              fieldList: ['mi_data_id', 'description', 'mi_treePath'],
              whereList: {
                state: {
                  expression: '[state]',
                  condition: '=',
                  values: {
                    state: 'ACTIVE'
                  }
                },
                path: {
                  expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                  condition: accMainReportsSubOrg ? 'like' : '=',
                  values: {
                    state: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                  }
                }
              },
              orderList: { orderBy: { expression: 'description' } },
              __mip_ondate: appAC.globalApplicationDate()
            },
            listeners: {
              change: function (ctrl) {
                const form = ctrl.up('form')
                HR.controlService.onChangeIncludeChildOrgs(form)
              }
            }
          }),
          HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg)
        ]
      },
      {
        layout: { type: 'hbox' },
        items: [
          HR.controlService.getDepCombo({
            labelWidth: 160,
            displayField: 'description',
            flex: 1,
            listeners: {
              change: function (ctrl, value) {
                const form = ctrl.up('form')
                form.down('[name=includeChildDepts]').setReadOnly(!value)
                if (!value) {
                  form.down('[name=includeChildDepts]').setValue()
                }
              }
            }
          }),
          HR.controlService.getIncludeChildDepts()
        ]
      },
      {
        xtype: 'ubcombobox',
        name: 'dictFundSourceID',
        fieldLabel: UB.i18n('Джерело фінансування'),
        labelWidth: 160,
        width: 500,
        hideEntityItemInContext: true,
        gridFieldList: ['ID', 'name', 'description'],
        valueField: 'ID',
        displayField: 'name',
        ubRequest: {
          entity: 'ac_fundSource',
          method: 'selectByOrg',
          fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
        },
        listeners: {
          afterrender: function (ctrl) {
            ctrl.store.ubRequest.orgID = appAC.globalOrganization()
          }
        }
      },
      {
        xtype: 'ubcombobox',
        name: 'positionCategory',
        fieldLabel: UB.i18n('Категорія посади'),
        labelWidth: 160,
        width: 500,
        valueField: 'code',
        displayField: 'name',
        ubRequest: {
          entity: 'ubm_enum',
          method: UB.core.UBCommand.methodName.SELECT,
          fieldList: ['ID', 'name', 'code', 'eGroup'],
          whereList: {
            enumGroupFilter: {
              expression: '[eGroup]',
              condition: 'equal',
              values: {
                val: 'HR_POSITION_CATEGORY'
              }
            }
          }
        }
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'datefield',
            name: 'onDate',
            labelWidth: 160,
            width: 270,
            fieldLabel: UB.i18n('Станом на'),
            value: appAC.globalApplicationDate()
          },
          HR.reportUtils.roundToCombo({
            labelWidth: 160,
            width: 350,
            defaultValue: 0,
            simpleRound: true
          }),
          {
            xtype: 'numberfield',
            name: 'monthsFop',
            fieldLabel: UB.i18n('Кількість місяців для розрахунку ФОП'),
            vtype: 'numberValidator',
            labelWidth: 280,
            width: 370,
            minValue: 0,
            maxValue: 1200,
            value: 0
          }
        ]
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'checkboxfield',
            name: 'showNn',
            fieldLabel: UB.i18n('Колонка № з/п'),
            labelWidth: 160,
            width: 270,
            value: true
          },
          {
            xtype: 'checkboxfield',
            name: 'showEmpInfo',
            fieldLabel: UB.i18n('Показати працівників'),
            labelWidth: 160,
            width: 190,
            value: false
          },
          {
            xtype: 'checkboxfield',
            name: 'showCategory',
            fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
            labelWidth: showTarifInfo && typeReport === 2 ? 320 : 250,
            value: typeReport === 3 ? false : funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
            hidden: funcOrgType === '2'
          },
          {
            xtype: 'checkboxfield',
            name: 'dontShowAddInfo',
            fieldLabel: UB.i18n('Без додаткових полів'),
            labelWidth: typeReport === 1 ? 210 : 160,
            value: false,
            hidden: typeReport !== 1
          }
        ]
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'checkboxfield',
            name: 'showDeptCodes',
            fieldLabel: UB.i18n('Коди підрозділів'),
            labelWidth: 160,
            width: 270,
            value: true
          },
          {
            xtype: 'checkboxfield',
            name: 'groupPos',
            fieldLabel: UB.i18n('Групувати посади'),
            labelWidth: 160,
            width: 190,
            value: false
          },
          {
            xtype: 'checkboxfield',
            name: 'showWokers',
            fieldLabel: UB.i18n('Окремо підсумки по робітникам'),
            labelWidth: 250,
            value: funcOrgType === '2' || typeReport === 3 ? false : (typeReport !== 1 ? true : !showTarifInfo), /* Сфера діяльності організації = Державна служба */
            hidden: funcOrgType === '2' || typeReport === 3 ? true : (typeReport !== 1 ? false : showTarifInfo)
          },
          {
            xtype: 'checkboxfield',
            name: 'showTarifTable',
            fieldLabel: UB.i18n('Формувати підсумки за тарифними розрядами'),
            labelWidth: 320,
            value: showTarifInfo,
            hidden: showTarifInfo ? typeReport !== 2 : true
          },
          {
            xtype: 'checkboxfield',
            name: 'shortNamePay',
            fieldLabel: UB.i18n('Cкорочена назва нарахувань'),
            labelWidth: 210,
            value: shortNamePayEl,
            hidden: typeReport !== 1
          }
        ]
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'checkboxfield',
            name: 'onlyRowsOnExport',
            fieldLabel: UB.i18n('Вивантажити в Excel без групування'),
            labelWidth: 160,
            width: 270,
            value: false
          }
        ]
      },
      {
        xtype: 'ubboxselect',
        name: 'positionCategoryGroupBy',
        fieldLabel: UB.i18n('Окремо підсумки по категоріям посади'),
        labelWidth: 160,
        width: 500,
        valueField: 'code',
        displayField: 'name',
        hidden: showTarifInfo ? typeReport !== 2 : true,
        ubRequest: {
          entity: 'ubm_enum',
          method: UB.core.UBCommand.methodName.SELECT,
          fieldList: ['ID', 'name', 'code', 'eGroup'],
          whereList: {
            enumGroupFilter: {
              expression: '[eGroup]',
              condition: 'equal',
              values: {
                val: 'HR_POSITION_CATEGORY'
              }
            }
          }
        }
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            layout: {
              type: 'vbox',
              align: 'stretch'
            },
            flex: 1,
            items: [
              {
                xtype: 'fieldset',
                name: 'signer1',
                layout: { type: 'vbox', align: 'stretch' },
                margin: '5 0 5 10',
                padding: '0 0 5 0',
                flex: 1,
                style: 'border-color: #2f7c94',
                items: [
                  getSignatoryCombos({
                    signer4EmpOrder: 'signer4Stafflist',
                    labelWidth: 100,
                    width: 700,
                    allowBlank: true,
                    name1: 'respPositionID1',
                    fieldLabel1: UB.i18n('Підписант 1 (посада)'),
                    name2: 'respEmp1',
                    fieldLabel2: UB.i18n('Підписав')
                  })
                ]
              },
              {
                xtype: 'fieldset',
                name: 'signer2',
                layout: { type: 'vbox', align: 'stretch' },
                margin: '5 0 5 10',
                padding: '0 0 5 0',
                flex: 1,
                style: 'border-color: #2f7c94',
                items: [
                  getSignatoryCombos({
                    signer4EmpOrder: 'signer4StafflistSecond',
                    labelWidth: 100,
                    width: 700,
                    allowBlank: true,
                    name1: 'respPositionID2',
                    fieldLabel1: UB.i18n('Підписант 2 (посада)'),
                    name2: 'respEmp2',
                    fieldLabel2: UB.i18n('Підписав')
                  })
                ]
              }
            ]
          },
          {
            layout: {
              type: 'vbox',
              align: 'stretch'
            },
            flex: 1,
            items: [
              {
                xtype: 'fieldset',
                name: 'signer3',
                layout: { type: 'vbox', align: 'stretch' },
                margin: '5 15 5 10',
                padding: '0 0 5 0',
                flex: 1,
                style: 'border-color: #2f7c94',
                items: [
                  getSignatoryCombos({
                    signer4EmpOrder: 'approver4Stafflist',
                    labelWidth: 100,
                    width: 700,
                    allowBlank: true,
                    name1: 'respPositionID3',
                    fieldLabel1: UB.i18n('Затвердив 1 (посада)'),
                    name2: 'respEmp3',
                    fieldLabel2: UB.i18n('Підписав')
                  })
                ]
              },
              {
                xtype: 'fieldset',
                name: 'signer4',
                layout: { type: 'vbox', align: 'stretch' },
                margin: '5 15 5 10',
                padding: '0 0 5 0',
                flex: 1,
                style: 'border-color: #2f7c94',
                hidden: !twoApprover,
                items: [
                  getSignatoryCombos({
                    signer4EmpOrder: 'approver4StafflistSecond',
                    hidden: !twoApprover,
                    labelWidth: 100,
                    width: 750,
                    allowBlank: true,
                    name1: 'respPositionID4',
                    fieldLabel1: UB.i18n('Затвердив 2 (посада)'),
                    name2: 'respEmp4',
                    fieldLabel2: UB.i18n('Підписав')
                  })
                ]
              }
            ]
          }
        ]
      },
      {
        xtype: 'textfield',
        name: 'docInfo',
        fieldLabel: UB.i18n('Затверджено документом'),
        labelWidth: 160,
        value: docInfo
      }
    ]
  }
  const tabs = [{
    itemId: 'tabReport',
    title: 'Параметри',
    autoScroll: true,
    margin: '0, 0, 0, 0',
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    items: panelParam
  }]

  if (typeReport !== 3) {
    getListParamTabs(tabs, [{ code: 'ReportConsolidated', title: UB.i18n('Види оплати персоналу') }],
      [
        {
          name: 'listParamID',
          visibility: false
        },
        {
          name: 'valuesID',
          visibility: false
        },
        {
          name: 'orgID',
          visibility: false
        },
        {
          name: 'payElID.name',
          description: UB.i18n('Вид оплати'),
          config: {
            flex: 1
          }
        },
        {
          name: 'payElID.methodID.methodGroupID.groupType',
          description: UB.i18n('Тип'),
          config: {
            flex: 1
          }
        },
        {
          name: 'payElID.methodID.methodGroupID.name',
          description: UB.i18n('Група'),
          config: {
            flex: 1
          }
        },
        {
          name: 'orderN',
          config: {
            flex: 0.5,
            align: 'center'
          }
        }

      ],
      'hr_idParam-payEl',
      'hr_payElSelect',
      true,
      UB.i18n('Додати списком'), false, { groupType: ['PAYMENT'] }
    )
  }

  me.paramForm = Ext.create('UBS.ReportParamForm', {
    collapsible: true,
    listeners: {
      afterrender: function () {
        HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
      }
    },
    items: typeReport === 3 ? panelParam : [{
      xtype: 'tabpanel',
      itemId: 'cmpTabPanel',
      flex: 1,
      minWidth: 250,
      margin: '10 10 10 10',
      plain: true,
      items: tabs
    }],
    getParameters: function (owner) {
      const frm = owner.getForm()
      const dictFundSourceID = frm.findField('dictFundSourceID')
      const reco = AC.gridUtils.getCurrentRecord(dictFundSourceID)
      const dictFundTypeName = reco && reco.get('dictFundTypeName')
      const dictProgClass = reco && reco.get('dictProgClass')
      const params = {
        organizationID: frm.findField('organizationID').getValue() || 0,
        departmentID: frm.findField('departmentID').getValue() || 0,
        includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
        positionCategory: frm.findField('positionCategory').getValue() || 0,
        positionCategoryName: frm.findField('positionCategory').getRawValue() || '',
        dictFundSourceID: frm.findField('dictFundSourceID').getValue() || 0,
        dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
        dictFundTypeName: dictFundTypeName,
        dictProgClass: dictProgClass,
        includeChildOrgs: !frm.findField('departmentID').getValue() ? frm.findField('includeChildOrgs').getValue() || false : false,
        onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
        groupPos: frm.findField('groupPos').getValue() || false,
        roundTo: frm.findField('roundToCombo').getValue(),
        showNn: frm.findField('showNn').getValue() === true,
        showEmpInfo: frm.findField('showEmpInfo').getValue() === true,
        showDeptCodes: frm.findField('showDeptCodes').getValue() === true,
        showCategory: frm.findField('showCategory').getValue() === true,
        showWokers: frm.findField('showWokers').getValue() === true,
        dontShowAddInfo: frm.findField('dontShowAddInfo').getValue() === true,
        shortNamePay: frm.findField('shortNamePay').getValue() === true,
        onlyRowsOnExport: frm.findField('onlyRowsOnExport').getValue() === true,
        respPositionID1: frm.findField('respPositionID1').getValue(),
        respEmp1: frm.findField('respEmp1').getValue(),
        respPositionID2: frm.findField('respPositionID2').getValue(),
        respEmp2: frm.findField('respEmp2').getValue(),
        respPositionID3: frm.findField('respPositionID3').getValue(),
        respEmp3: frm.findField('respEmp3').getValue(),
        respPositionID4: frm.findField('respPositionID4').getValue(),
        respEmp4: frm.findField('respEmp4').getValue(),
        docInfo: frm.findField('docInfo').getValue(),
        monthsFop: frm.findField('monthsFop').getValue() || 0,
        showTarifTable: frm.findField('showTarifTable').getValue() === true,
        positionCategoryGroupBy: frm.findField('positionCategoryGroupBy').getValue()
      }
      // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
      owner.ownerCt.report.incomeParams = params
      return params
    }
  })

  me.paramForm.on('afterrender', () => {
    if (incomeParams.dictFundSourceID) {
      me.paramForm.down('[name=dictFundSourceID]').setValueById(incomeParams.dictFundSourceID)
    }

    $App.connection.run({
      entity: 'hr_employeePosition',
      method: 'getStaffTableSignerList',
      onDate: appAC.globalApplicationDate(),
      organizationID: appAC.globalOrganization()
    }).then(mParams => {
      for (let i = 1; i <= (twoApprover ? 4 : 3); i++) {
        if (mParams.result[`signer${i}`].respPositionID) {
          me.paramForm.down(`[name=respPositionID${i}]`).setValueById(mParams.result[`signer${i}`].respPositionID)
        }
      }
    })
  })
  return me.paramForm
}

function generateDataConsolidated (typeReport, onDate, showNn, colSpan, colSpanPaymentType,
  orgs, itemID, orgStruct, positionData, paData, accrualData, empData, empLongTermAbsc, empCertificationAcc,
  employeeAccrualData, organizationAccrualData, employeeExperience, employeeRankData, dictSalaryRanks, payelExpData, minSalarySum,
  groupJobsPrint, roundTo, roundToQuantity, showLevelTotals = 0, showDeptCodes = false,
  showWokers = false, namePosition = false, showEmpInfo = false, showAddInfo = false,
  monthsFop = 0, showTarifInfo, showTarifTable, positionCategoryGroupBy, shortNamePay = false, showDepColumn = false, separateRounding = false) {
  if (!orgStruct || !orgStruct.length) return {}

  const limitedAccess = !AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess')
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  minSalarySum = notShowSalary ? 0 : minSalarySum

  const sumRoundTo = roundTo === 'numberGroup' ? 0 : 2
  const qntRoundTo = HR.reportUtils.getRountToByCode(roundToQuantity)

  const totalAccrualValues = []
  for (let i = 0; i < accrualData.length; i++) {
    totalAccrualValues.push({ value: 0 })
  }

  function getSum (value, rate, basepay) {
    value = value || 0
    return AC.currencyService.round(rate ? basepay * rate / 100 : value, sumRoundTo)
  }

  function calcTotal (resultObj, qnt, basepay, accrualTotal, addToMinSalary, fundSum, fundSumByMonths, accrualSum, accrualValues,
    accrualEmpTotal, tarifAccrualSum, fromTotal, addToTotal, addToWokers) {
    if (addToTotal) {
      resultObj.total.quantity += qnt
      resultObj.total.basepay += basepay
      resultObj.total.accrualTotal += accrualTotal
      resultObj.total.addToMinSalary += addToMinSalary
      resultObj.total.fundSum += fundSum
      resultObj.total.fundSumByMonths += fundSumByMonths
      resultObj.total.accrualSum += accrualSum
      resultObj.total.accrualEmpTotal += accrualEmpTotal
      resultObj.total.tarifAccrualSum += tarifAccrualSum
      resultObj.total.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(resultObj.total.quantity)
    }
    if (addToWokers) {
      resultObj.wokers.quantity += qnt
      resultObj.wokers.basepay += basepay
      resultObj.wokers.accrualTotal += accrualTotal
      resultObj.wokers.addToMinSalary += addToMinSalary
      resultObj.wokers.fundSum += fundSum
      resultObj.wokers.fundSumByMonths += fundSumByMonths
      resultObj.wokers.accrualSum += accrualSum
      resultObj.wokers.accrualEmpTotal += accrualEmpTotal
      resultObj.wokers.tarifAccrualSum += tarifAccrualSum
      resultObj.wokers.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(resultObj.wokers.quantity)
    }
    if (accrualValues.length) {
      for (let i = 0; i < accrualValues.length; i++) {
        if (addToTotal) {
          resultObj.total.accrualValues[i].value += fromTotal ? accrualValues[i].value : accrualValues[i].valueQuantity
        }
        if (addToWokers) {
          resultObj.wokers.accrualValues[i].value += fromTotal ? accrualValues[i].value : accrualValues[i].valueQuantity
        }
      }
    }
  }

  function newDataAccrualValues (oldArray, onlyValue = true) {
    const newArray = []
    _.forEach(oldArray, arr => {
      if (onlyValue) {
        newArray.push({
          value: arr.value
        })
      } else {
        newArray.push({
          elements: arr.elements || [],
          value: arr.value,
          valueQuantity: arr.valueQuantity
        })
      }
    })
    return newArray
  }

  function getPositionCategoryGroupObj (positionCategoryItem, aTree, str) {
    const items = aTree.filter(item => /* item.parentID === itemID && */ item.positionCategory === positionCategoryItem && !item.isDepartment && !item.isTotal)
    if (!items || !items.length) {
      return undefined
    }
    const itemName = HR.nameCase.uncap(items[0].positionCategoryName)
    const totalObj = {
      roundTo: roundTo,
      colSpan: colSpan,
      showEmpInfo: showEmpInfo,
      showAddInfo: showAddInfo,
      showTarifInfo: showTarifInfo,
      showFop: monthsFop !== 0,
      indexNum: '',
      name: UB.i18n(`{0}в т.ч. {1}`, str, itemName),
      isDepartment: false,
      isTotal: true,
      quantity: items.reduce((res, item) => res + item.quantity, 0),
      basepay: items.reduce((res, item) => res + item.basepayQuantity, 0),
      accrualValues: typeReport === 1 ? [] : newDataAccrualValues(totalAccrualValues),
      accrualTotal: items.reduce((res, item) => res + item.accrualTotalQuantity, 0),
      tarifAccrualSum: items.reduce((res, item) => res + item.tarifAccrualSumQuantity, 0),
      accrualEmpTotal: items.reduce((res, item) => res + item.accrualEmpTotal, 0),
      accrualSum: items.reduce((res, item) => res + item.accrualSum, 0),
      addToMinSalary: items.reduce((res, item) => res + item.addToMinSalary, 0),
      fundSum: items.reduce((res, item) => res + item.fundSum, 0),
      fundSumByMonths: items.reduce((res, item) => res + item.fundSumByMonths, 0)
    }

    totalObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
    if (typeReport !== 1) {
      _.forEach(items, treeItem => {
        for (let i = 0; i < totalObj.accrualValues.length; i++) {
          totalObj.accrualValues[i].value += treeItem.accrualValues[i].valueQuantity
        }
      })
    }
    return totalObj
  }

  function findPosition (data, parentID, basepay, name, accrualTotal, payIDs, accrualValues) {
    function arrayEquals (a, b) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
        a.every((val, index) => val.value === b[index].value)
    }
    if (!groupJobsPrint || !data || !data.length) return undefined

    let foundItem
    // result.data, { parentID: parentID, name: obj.name, basepay: basepay, accrualTotal: accrualTotal, payIDs: payIDString,  }

    const fnd = data.filter(el => el.parentID === parentID && el.basepay === basepay && el.name === name && el.accrualTotal === accrualTotal && el.payIDs === payIDs && !el.isDepartment && !el.isTotal)
    fnd.forEach(posItem => {
      if (arrayEquals(posItem.accrualValues, accrualValues) || typeReport === 1) {
        foundItem = posItem
        return foundItem
      }
    })

    return foundItem
  }
  let employeeAccrual
  let organizationAccrual

  function getData (indexNpp, orgID, parentID, level = 1, parentName) {
    const result = {
      data: [],
      total: {
        quantity: 0,
        basepay: 0,
        accrualSum: 0,
        accrualValues: typeReport === 1 ? [] : newDataAccrualValues(totalAccrualValues),
        accrualTotal: 0,
        accrualEmpTotal: 0,
        tarifAccrualSum: 0,
        addToMinSalary: 0,
        fundSum: 0,
        fundSumByMonths: 0
      },
      wokers: {
        quantity: 0,
        basepay: 0,
        accrualSum: 0,
        accrualValues: typeReport === 1 ? [] : newDataAccrualValues(totalAccrualValues),
        accrualTotal: 0,
        accrualEmpTotal: 0,
        tarifAccrualSum: 0,
        addToMinSalary: 0,
        fundSum: 0,
        fundSumByMonths: 0
      }
    }

    const curStruct = orgStruct.filter(el => el.parentUnitID === parentID && el.orgID === orgID)
    const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
    const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
    const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

    curStruct.forEach(orgItem => {
      const isDept = orgItem.mi_unityEntity !== 'hr_position'

      let obj = {
        parentName: parentName,
        showDepColumn: showDepColumn,
        isDepartment: isDept,
        isTotal: false,
        showNn: showNn,
        colSpan: colSpan,
        showEmpInfo: showEmpInfo,
        showAddInfo: showAddInfo,
        showTarifInfo: showTarifInfo,
        showFop: monthsFop !== 0,
        colSpanPaymentType: colSpanPaymentType,
        parentID: parentID,
        textAlign: 'left',
        needAdd: true,
        name: isDept ? `${str}${styleBegin}${showDeptCodes && orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
          : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
        depType: orgItem.depType || '',
        info: '',
        infoArray: []
      }

      if (!obj.isDepartment) {
        const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
        if (posItem) {
          obj.name = namePosition
            ? HR.nameCase.cap(posItem['name'] || '')
            : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
          let basepay = _.isNumber(orgItem.accrualSum) ? orgItem.accrualSum : 0
          //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
          basepay = notShowSalary || posItem.paymentType === 'CONTRACT' ? 0 : basepay
          basepay = AC.currencyService.round(basepay || 0, sumRoundTo)

          let qnt = (posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0
          qnt = !roundToQuantity ? qnt : AC.currencyService.round(qnt, qntRoundTo)

          const paDataFlt = notShowSalary ? [] : paData.filter(item => item.positionID === posItem.ID)
          const currentInfoArray = []
          const currentAccrualValues = typeReport === 1 ? [] : newDataAccrualValues(accrualData, false)
          const payIDs = []
          let accrualTotal = 0
          let accrualTotalQuantity = 0
          if (paDataFlt && paDataFlt.length && posItem.paymentType !== 'CONTRACT') {
            _.forEach(paDataFlt, item => {
              payIDs.push(item.payElID)
              const value = AC.currencyService.round(item.calcSum || 0, sumRoundTo) // getSum(item.accrualSum, item.accrualRate, basepay)
              if (typeReport === 1) {
                const qRate = item.accrualRate ? HR.reportUtils.getQuantityFractional(item.accrualRate) : ''
                const payName = shortNamePay ? item.shortPayElName || item.payElName : item.payElName
                currentInfoArray.push(
                  (payName ? payName + ' ' : '') +
                  (item.accrualRate
                    ? HR.reportUtils.quantityToString(item.accrualRate, qRate) + `&nbsp;% (${HR.reportUtils.quantityToString(value, roundTo)}&nbsp;${UB.i18n('грн')})`
                    : HR.reportUtils.quantityToString(value, roundTo) + UB.i18n('&nbsp;грн')))
                accrualTotal += value
                accrualTotalQuantity += AC.currencyService.round(value * qnt, sumRoundTo)
              }

              if (typeReport === 2 || typeReport === 3) {
                _.forEach(currentAccrualValues, acc => {
                  if (acc.elements.indexOf(item.payElID) !== -1) {
                    acc.value += value
                    acc.valueQuantity += AC.currencyService.round(value * qnt, sumRoundTo)
                    accrualTotal += value
                    accrualTotalQuantity += AC.currencyService.round(value * qnt, sumRoundTo)
                  }
                })
              }
            })
          }
          const payIDString = payIDs.join(';')
          // const foundItem = groupJobsPrint ? _.find(result.data, { parentID: parentID, name: obj.name, basepay: basepay, accrualTotal: accrualTotal, payIDs: payIDString, isDepartment: false, isTotal: false }) : undefined
          const foundItem = groupJobsPrint ? findPosition(result.data, parentID, basepay, obj.name, accrualTotal, payIDString, currentAccrualValues) : undefined
          if (foundItem) {
            obj = foundItem
            obj.needAdd = false
          } else {
            obj.roundTo = roundTo
            obj.fundSum = 0
            obj.fundSumByMonths = 0
            obj.accrualSum = 0
            obj.accrualSumQuantity = 0
            obj.quantity = 0
            obj.accrualTotal = accrualTotal
            obj.accrualTotalQuantity = accrualTotalQuantity
            obj.accrualEmpTotal = 0
            obj.accrualEmpTotalNoLimit = 0
            obj.basepayQuantity = 0
            obj.addToMinSalary = 0
            obj.accrualValues = typeReport === 1 ? [] : currentAccrualValues // newDataAccrualValues(accrualData, false)
            obj.positionCategorySortOrder = posItem['positionCategory.sortOrder'] || '9999999'
            obj.positionCategory = posItem['positionCategory'] || ''
            obj.positionCategoryName = posItem['positionCategory.name'] || ''
            obj.paymentType = posItem.paymentType === 'CONTRACT' ? UB.i18n('Згідно умов трудового договору') : ''
            obj.military = typeReport === 3 && posItem.positionType === '4' ? 1 : 2
            obj.militaryName = typeReport === 3 && posItem.positionType === '4' ? UB.i18n('Військовослужбовці') : UB.i18n('Робітники та службовці')
            obj.militarySort = typeReport === 3 && posItem.positionType === '4' ? 1 : 2
            obj.KPcode = typeReport === 3
              ? (posItem.positionType === '4' ? posItem['dictMilitarySpecialityID.code'] || '' : posItem['dictPositionID.dictProfessionID.code'] || '')
              : posItem['dictPositionID.dictProfessionID.code'] || ''
            obj.militaryRank = posItem['dictMilitaryRankID.name'] || ''
            obj.comment = posItem.comment || ''
            if (showAddInfo) {
              obj.costType = posItem['dictCostTypeID.name'] || ''
              obj.accountInfo = posItem['dictCostTypeID.accountID.description'] || ''
              obj.empCategory = posItem['dictEmpCategoryID.name'] || ''
              obj.salaryScheme = posItem['dictSalarySchemeLevelID.name'] || ''
            }
            obj.infoArray = currentInfoArray
            obj.payIDs = payIDs.join(';')
            obj.empInfo1 = ''
            obj.empInfoArray1 = []
            obj.empInfo2 = ''
            obj.empInfoArray2 = []
            obj.empInfo3 = ''
            obj.empInfoArray3 = []
            obj.empAccrualData = ''
            obj.empAccrualDataArray = []
            obj.empTarifInfo = ''
            obj.empTarifInfoArray = []
            if (showTarifTable || showTarifInfo || showAddInfo || typeReport === 3) {
              obj.tarifName = posItem['dictTarifCoeffID.name'] || ''
            }
            if (showTarifInfo || showTarifTable) {
              obj.tarifAccrualSum = 0
              obj.tarifAccrualSumQuantity = 0
              obj.tarifSortOrder = posItem['dictTarifCoeffID.code'] || '9999999'
              obj.dictTarifCoeffID = posItem['dictTarifCoeffID'] || ''
            }
          }

          const tarifAccrualSum = notShowSalary ? 0 : showTarifInfo || showTarifTable ? posItem['dictTarifCoeffID.accrualSum'] || 0 : 0
          obj.tarifAccrualSum += tarifAccrualSum
          obj.tarifAccrualSumQuantity += AC.currencyService.round(tarifAccrualSum * qnt, sumRoundTo)

          const fundSum = separateRounding
            ? AC.currencyService.round(qnt * basepay, sumRoundTo) + AC.currencyService.round(qnt * accrualTotal, sumRoundTo)
            : AC.currencyService.round(qnt * (basepay + accrualTotal), sumRoundTo)
          let addToMinSalary = AC.currencyService.round(minSalarySum * qnt, sumRoundTo) - fundSum
          addToMinSalary = addToMinSalary > 0 ? addToMinSalary : 0
          const fundSumByMonths = monthsFop !== 0 ? AC.currencyService.round(monthsFop * AC.currencyService.round(fundSum + addToMinSalary, sumRoundTo), sumRoundTo) : 0

          const empItems = showEmpInfo ? empData.filter(emp => emp.positionID === posItem.mi_data_id) : []

          let accrualSum = 0
          let accrualSumQuantity = 0
          let accrualEmpTotal = 0
          let accrualEmpTotalNoLimit = 0
          _.forEach(empItems, empItem => {
            empItem.mtCount = (empItem['fundSourceEmpPosID.ID'] ? empItem['fundSourceEmpPosID.mtCount'] : empItem.mtCount) || 0
            empItem.accrualSum = notShowSalary ? 0 : !(limitedAccess && empItem['employeeNumberID.limitedAccess']) ? (empItem.accrualSum || 0) : 0
            accrualSum += notShowSalary ? 0 : !(limitedAccess && empItem['employeeNumberID.limitedAccess']) ? (empItem.accrualSum || 0) : 0
            accrualSumQuantity += AC.currencyService.round((empItem.accrualSum || 0) * (empItem.mtCount || 0), sumRoundTo)

            let vacInfo = ''
            if (empLongTermAbsc && empLongTermAbsc[empItem.employeeNumberID]) {
              vacInfo = empLongTermAbsc[empItem.employeeNumberID].map(el => {
                return ` ${el.vacationKind ? HR.nameCase.uncap(el.vacationKind) + ' ' : ''}${UB.i18n('до&nbsp;') + AC.dateService.formatDate(el.dateTo)}`
              }).join(', ')
            }
            obj.empInfoArray1.push(`${empItem['employeeID.shortFIO']}${HR.reportUtils.formatAsNumberStr(empItem.mtCount) ? ' ' + empItem.mtCount : ''}${vacInfo}`)

            let category = ''
            if (empCertificationAcc[empItem.employeeID]) {
              let sertifications = empCertificationAcc[empItem.employeeID] // .filter(el => el.dictSpecialtyID === posSpecialtyID)
              sertifications = _.orderBy(sertifications, ['certificationDate'], ['desc'])
              category = sertifications[0]['dictEmpCategoryID.name'] || ''
              const orderInfo = _.compact([
                sertifications[0]['orderNumber'] || '',
                sertifications[0]['orderDate'] ? AC.dateService.formatDate(sertifications[0]['orderDate']) : '',
                sertifications[0]['dictSpecialtyID.name'] ? `(${sertifications[0]['dictSpecialtyID.name']})` : ''
              ]).join(' ')
              if (orderInfo.length) {
                category += (category.length ? ', ' : ' ') + orderInfo
              }
            }
            if (category) {
              obj.empInfoArray2.push({
                info1: `${empItem['employeeID.shortFIO']} ${category}`, // если на данной посаде более 1 сотрудника будем выводить с ФИО
                info2: category
              })
            }
            if (!(limitedAccess && empItem['employeeNumberID.limitedAccess']) && !notShowSalary) {
              const accrualSumStr = HR.reportUtils.quantityToString(empItem.accrualSum || 0, result.roundTo)
              obj.empInfoArray3.push({
                info1: `${empItem['employeeID.shortFIO']} ${accrualSumStr}`, // если на данной посаде более 1 сотрудника будем выводить с ФИО
                info2: accrualSumStr
              })
            }

            const empAccruals = employeeAccrual && employeeAccrual[empItem.employeeNumberID] ? employeeAccrual[empItem.employeeNumberID] : []
            organizationAccrual.forEach(acc => {
              if (!empAccruals.find(o => o.payElID === acc.payElID) &&
                !((acc.excludeDepartment && acc.departmentID.includes(posItem.departmentID)) || (!acc.excludeDepartment && acc.departmentID.length && !acc.departmentID.includes(posItem.departmentID))) &&
                !((acc.excludePosition && acc.dictPositionID.includes(posItem.dictPositionID)) || (!acc.excludePosition && acc.dictPositionID.length && !acc.dictPositionID.includes(posItem.dictPositionID))) &&
                !((acc.excludeStaff && acc.dictStaffCatID.includes(posItem.dictStaffCatID)) || (!acc.excludeStaff && acc.dictStaffCatID.length && !acc.dictStaffCatID.includes(posItem.dictStaffCatID))) &&
                !((acc.excludeEmpCategory && acc.dictEmpCategoryID.includes(posItem.dictEmpCategoryID)) || (!acc.excludeEmpCategory && acc.dictEmpCategoryID.length && !acc.dictEmpCategoryID.includes(posItem.dictEmpCategoryID))) &&
                !((acc.excludeWorkPlace && acc.workPlace.includes(posItem.workPlace)) || (!acc.excludeWorkPlace && acc.workPlace.length && !acc.workPlace.includes(posItem.workPlace))) &&
                !((acc.excludeWorkerType && acc.workerType.includes(posItem.workerType)) || (!acc.excludeWorkerType && acc.workerType.length && !acc.workerType.includes(posItem.workerType)))
              ) {
                acc.accrualSum = acc.paySum
                acc.accrualRate = acc.rate
                empAccruals.push(acc)
              }
            })

            if (empAccruals.length) {
              const acccInfo = []
              _.forEach(empAccruals, item => {
                let value = 0
                let qRate = ''
                if (item.methodCode === '6') {
                  const empExpItem = employeeExperience.find(itm => itm.employeeID === empItem.employeeID && itm.dictExperienceID === item.dictExperienceID)
                  if (empExpItem) {
                    const ymd = AC.dateService.getYmd(empExpItem.calcDate, onDate, true)
                    qRate = HR.accrualService.getPercentByElmExp(payelExpData, item.payElID, ymd.years, ymd.months)
                    value = getSum(0, qRate, (empItem.accrualSum || 0))
                    qRate = ''
                  }
                } else if (item.methodCode === '5') {
                  const empRank = employeeRankData.find(itm => itm.employeeID === empItem.employeeID)
                  if (empRank) {
                    let salRank = dictSalaryRanks.find(itm => itm.dictRankID === empRank.dictRankID)
                    if (salRank && salRank.paySum) {
                      value = salRank.paySum
                    }
                  }
                } else {
                  value = getSum(item.accrualSum, item.accrualRate, (empItem.accrualSum || 0))
                  qRate = item.accrualRate ? HR.reportUtils.getQuantityFractional(item.accrualRate) : ''
                }

                if (!(limitedAccess && empItem['employeeNumberID.limitedAccess']) && !notShowSalary) {
                  acccInfo.push(
                    (item.shortPayElName ? (item.shortPayElName + ' ') : (item.payElName ? item.payElName + ' ' : '')) +
                    (qRate
                      ? HR.reportUtils.quantityToString(item.accrualRate, qRate) + `&nbsp;% (${HR.reportUtils.quantityToString(value, roundTo)}${UB.i18n('&nbsp;грн')})`
                      : HR.reportUtils.quantityToString(value, roundTo) + UB.i18n('&nbsp;грн')))
                  accrualEmpTotal += value
                }
                accrualEmpTotalNoLimit += value
              })
              if (acccInfo.length) {
                obj.empAccrualDataArray.push({
                  info1: `${empItem['employeeID.shortFIO']} ${acccInfo.join(', ')}`, // если на данной посаде более 1 сотрудника будем выводить с ФИО
                  info2: acccInfo.join(', ')
                })
              }
            }

            if (showTarifInfo && empItem['dictTarifCoeffID.name']) {
              obj.empTarifInfoArray.push({
                info1: `${empItem['employeeID.shortFIO']} ${empItem['dictTarifCoeffID.name']}`, // если на данной посаде более 1 сотрудника будем выводить с ФИО
                info2: empItem['dictTarifCoeffID.name']
              })
            }
          })

          obj.info = obj.infoArray.join('; ')
          if (posItem.comment) {
            obj.info = obj.info ? obj.info + '; ' + posItem.comment : posItem.comment
          }

          obj.empInfo1 = obj.empInfoArray1.join('; ')
          // если на данной посаде более 1 сотрудника будем выводить с ФИО
          obj.empInfo2 = obj.empInfoArray1.length > 1 ? obj.empInfoArray2.map(e => e.info1).join('; ') : obj.empInfoArray2.map(e => e.info2).join('; ')
          obj.empInfo3 = obj.empInfoArray1.length > 1 ? obj.empInfoArray3.map(e => e.info1).join(';<br />') : obj.empInfoArray3.map(e => e.info2).join(';<br />')
          obj.empAccrualData = obj.empInfoArray1.length > 1 ? obj.empAccrualDataArray.map(e => e.info1).join(';<br />') : obj.empAccrualDataArray.map(e => e.info2).join(';<br />')
          obj.empTarifInfo = obj.empInfoArray1.length > 1 ? obj.empTarifInfoArray.map(e => e.info1).join(';<br />') : obj.empTarifInfoArray.map(e => e.info2).join(';<br />')

          obj.quantity += qnt
          obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
          obj.basepay = basepay
          // obj.accrualTotal += accrualTotal
          // obj.accrualTotalQuantity += accrualTotalQuantity
          obj.basepayQuantity += AC.currencyService.round(basepay * qnt, sumRoundTo)
          obj.addToMinSalary += addToMinSalary
          obj.fundSum += fundSum + obj.addToMinSalary
          obj.fundSumByMonths += fundSumByMonths
          obj.accrualSum += accrualSum
          obj.accrualSumQuantity += accrualSumQuantity
          obj.accrualEmpTotal += accrualEmpTotal
          obj.accrualEmpTotalNoLimit += accrualEmpTotalNoLimit

          // для итоговых строк нужно сумма с учетом количества
          calcTotal(result, qnt, AC.currencyService.round(basepay * qnt, sumRoundTo), accrualTotalQuantity, obj.addToMinSalary,
            fundSum + obj.addToMinSalary, fundSumByMonths, accrualSumQuantity, obj.accrualValues, accrualEmpTotal, obj.tarifAccrualSumQuantity,
            false, true, showWokers && ((obj.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1)
        } else {
          obj.needAdd = false
        }
      }
      if (obj.needAdd) {
        obj.indexNum = obj.isDepartment ? '' : indexNpp++
        result.data.push(obj)
      }
      if (obj.isDepartment) {
        const subTree = getData(indexNpp, orgID, orgItem.mi_data_id, level + 1, (parentName ? parentName + '/' : '') + orgItem.name)
        const subTreeHasData = (subTree.data && subTree.data.length)
        if (subTree /* && subTreeHasData */) {
          indexNpp = subTree.indexNpp || 1

          subTreeHasData && result.data.push(...subTree.data)

          if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
            const totalObj = {
              roundTo: roundTo,
              colSpan: colSpan,
              showEmpInfo: showEmpInfo,
              showAddInfo: showAddInfo,
              showTarifInfo: showTarifInfo,
              showFop: monthsFop !== 0,
              indexNum: '',
              name: UB.i18n(`{0}Всього по {1}`, str, obj.depType),
              isDepartment: false,
              isTotal: true,
              quantity: subTree.total.quantity,
              roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.total.roundToQuantity || 0),
              basepay: subTree.total.basepay,
              accrualValues: typeReport === 1 ? [] : newDataAccrualValues(subTree.total.accrualValues),
              accrualTotal: subTree.total.accrualTotal,
              tarifAccrualSum: subTree.total.tarifAccrualSum,
              accrualEmpTotal: subTree.total.accrualEmpTotal,
              accrualSum: subTree.total.accrualSum,
              addToMinSalary: subTree.total.addToMinSalary,
              fundSum: subTree.total.fundSum,
              fundSumByMonths: subTree.total.fundSumByMonths
            }
            result.data.push(totalObj)
            if (showWokers) {
              const totalObj = {
                roundTo: roundTo,
                colSpan: colSpan,
                showEmpInfo: showEmpInfo,
                showAddInfo: showAddInfo,
                showTarifInfo: showTarifInfo,
                showFop: monthsFop !== 0,
                indexNum: '',
                name: UB.i18n(`{0}в т.ч. робітники`, str),
                isDepartment: false,
                isTotal: true,
                quantity: subTree.wokers.quantity,
                roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.wokers.roundToQuantity || 0),
                basepay: subTree.wokers.basepay,
                accrualValues: typeReport === 1 ? [] : newDataAccrualValues(subTree.wokers.accrualValues),
                accrualTotal: subTree.wokers.accrualTotal,
                tarifAccrualSum: subTree.wokers.tarifAccrualSum,
                accrualEmpTotal: subTree.wokers.accrualEmpTotal,
                accrualSum: subTree.wokers.accrualSum,
                addToMinSalary: subTree.wokers.addToMinSalary,
                fundSum: subTree.wokers.fundSum,
                fundSumByMonths: subTree.wokers.fundSumByMonths
              }
              totalObj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
              if (totalObj.quantity || totalObj.fundSum) {
                result.data.push(totalObj)
              }
            }
            if (positionCategoryGroupBy && positionCategoryGroupBy.length) {
              _.forEach(positionCategoryGroupBy, positionCategoryItem => {
                const totalObj = getPositionCategoryGroupObj(positionCategoryItem, subTree.data, str)
                if (totalObj && (totalObj.quantity || totalObj.fundSum)) {
                  result.data.push(totalObj)
                }
              })
            }
          }

          calcTotal(result, subTree.total.quantity, subTree.total.basepay, subTree.total.accrualTotal, subTree.total.addToMinSalary,
            subTree.total.fundSum, subTree.total.fundSumByMonths, subTree.total.accrualSum, subTree.total.accrualValues, subTree.total.accrualEmpTotal,
            subTree.total.tarifAccrualSum, true, true, false)
          calcTotal(result, subTree.wokers.quantity, subTree.wokers.basepay, subTree.wokers.accrualTotal, subTree.wokers.addToMinSalary,
            subTree.wokers.fundSum, subTree.wokers.fundSumByMonths, subTree.wokers.accrualSum, subTree.wokers.accrualValues, subTree.wokers.accrualEmpTotal,
            subTree.wokers.tarifAccrualSum, true, false, true)
        }
      }
    })

    result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantity)
    result.indexNpp = indexNpp
    return result
  }

  const orgTree = {
    data: [],
    total: {
      quantity: 0,
      basepay: 0,
      accrualValues: typeReport === 1 ? [] : newDataAccrualValues(totalAccrualValues),
      accrualTotal: 0,
      tarifAccrualSum: 0,
      accrualEmpTotal: 0,
      accrualSum: 0,
      addToMinSalary: 0,
      fundSum: 0,
      fundSumByMonths: 0
    },
    wokers: {
      quantity: 0,
      basepay: 0,
      accrualValues: typeReport === 1 ? [] : newDataAccrualValues(totalAccrualValues),
      accrualTotal: 0,
      tarifAccrualSum: 0,
      accrualEmpTotal: 0,
      accrualSum: 0,
      addToMinSalary: 0,
      fundSum: 0,
      fundSumByMonths: 0
    }
  }
  let indexNpp = 1
  for (let i = 0; i < orgs.length; i++) {
    employeeAccrual = employeeAccrualData ? employeeAccrualData[orgs[i].mi_data_id] || {} : {}
    organizationAccrual = organizationAccrualData ? organizationAccrualData[orgs[i].mi_data_id] || [] : []

    const aTree = getData(indexNpp, orgs[i].mi_data_id, i === 0 ? itemID : orgs[i].mi_data_id, 1, '')
    if (aTree && aTree.data && aTree.data.length) {
      if (orgs.length > 1) {
        const title = {
          colSpan: colSpan,
          textAlign: 'center',
          name: `<font color="blue">${orgs[i].name}</font>`,
          isDepartment: true
        }
        orgTree.data.push(title)
      }
      orgTree.data.push(...aTree.data)

      calcTotal(orgTree, aTree.total.quantity, aTree.total.basepay, aTree.total.accrualTotal, aTree.total.addToMinSalary,
        aTree.total.fundSum, aTree.total.fundSumByMonths, aTree.total.accrualSum, aTree.total.accrualValues, aTree.total.accrualEmpTotal,
        aTree.total.tarifAccrualSum, true, true, false)
      calcTotal(orgTree, aTree.wokers.quantity, aTree.wokers.basepay, aTree.wokers.accrualTotal, aTree.wokers.addToMinSalary,
        aTree.wokers.fundSum, aTree.wokers.fundSumByMonths, aTree.wokers.accrualSum, aTree.wokers.accrualValues, aTree.wokers.accrualEmpTotal,
        aTree.wokers.tarifAccrualSum, true, false, true)

      let tName = orgs[i].nameLoc || orgs[i].name
      let isDepTotal = false
      if (i === 0 && itemID !== orgs[i].mi_data_id) {
        const tObj = _.find(orgStruct, { mi_data_id: itemID })
        tName = tObj && tObj.depType ? tObj.depType : ''
        isDepTotal = true
      }
      const orgTreeLastObj = {
        colSpan: colSpan,
        showEmpInfo: showEmpInfo,
        showAddInfo: showAddInfo,
        showTarifInfo: showTarifInfo,
        roundTo: roundTo,
        showFop: monthsFop !== 0,
        indexNum: '',
        name: UB.i18n(`{0}Всього по {1}`, '', tName),
        isDepartment: false,
        isTotal: true,
        depType: '',
        quantity: aTree.total.quantity || 0,
        roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(aTree.total.quantity || 0),
        basepay: aTree.total.basepay || 0,
        accrualValues: typeReport === 1 ? [] : newDataAccrualValues(aTree.total.accrualValues),
        accrualTotal: aTree.total.accrualTotal || 0,
        accrualEmpTotal: aTree.total.accrualEmpTotal || 0,
        tarifAccrualSum: aTree.total.tarifAccrualSum || 0,
        accrualSum: aTree.total.accrualSum || 0,
        addToMinSalary: aTree.total.addToMinSalary || 0,
        fundSum: aTree.total.fundSum || 0,
        fundSumByMonths: aTree.total.fundSumByMonths || 0
      }

      if (typeReport === 3) {
        const sumArray = ['basepayQuantity', 'fundSum']

        if (monthsFop !== 0) {
          sumArray.push('fundSumByMonths')
        }
        const dataMilitaryInfo = generateGroupedData(aTree.data, '',
          'militaryName', '', 'militarySort', accrualData.length, sumArray, roundTo, roundToQuantity,
          showNn, showEmpInfo, false, monthsFop !== 0, false)
        // если формируем по подразделению, то итог выводим до блока по ВС
        if (isDepTotal) {
          orgTree.data.push(orgTreeLastObj)
        }
        dataMilitaryInfo.forEach(mItem => {
          mItem.isDepartment = false
          mItem.isTotal = true
          mItem.basepay = mItem.basepayQuantity
          orgTree.data.push(mItem)
        })
        if (!isDepTotal) {
          orgTree.data.push(orgTreeLastObj)
        }
      } else {
        orgTree.data.push(orgTreeLastObj)
      }

      if (showWokers && i === 0 && itemID !== orgs[i].mi_data_id) {
        const totalObj = {
          colSpan: colSpan,
          showEmpInfo: showEmpInfo,
          showAddInfo: showAddInfo,
          showTarifInfo: showTarifInfo,
          roundTo: roundTo,
          showFop: monthsFop !== 0,
          indexNum: '',
          name: UB.i18n(`{0}в т.ч. робітники`, ''),
          isDepartment: false,
          isTotal: true,
          quantity: aTree.wokers.quantity || 0,
          roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(aTree.wokers.quantity || 0),
          basepay: aTree.wokers.basepay || 0,
          accrualValues: typeReport === 1 ? [] : newDataAccrualValues(aTree.wokers.accrualValues),
          accrualTotal: aTree.wokers.accrualTotal || 0,
          accrualEmpTotal: aTree.wokers.accrualEmpTotal || 0,
          tarifAccrualSum: aTree.wokers.tarifAccrualSum || 0,
          accrualSum: aTree.wokers.accrualSum || 0,
          addToMinSalary: aTree.wokers.addToMinSalary || 0,
          fundSum: aTree.wokers.fundSum || 0,
          fundSumByMonths: aTree.wokers.fundSumByMonths || 0
        }
        if (totalObj.quantity || totalObj.fundSum) {
          orgTree.data.push(totalObj)
        }
      }
      if (positionCategoryGroupBy && positionCategoryGroupBy.length && i === 0 && itemID !== orgs[i].mi_data_id) {
        _.forEach(positionCategoryGroupBy, positionCategoryItem => {
          const totalObj = getPositionCategoryGroupObj(positionCategoryItem, aTree.data, '')
          if (totalObj && (totalObj.quantity || totalObj.fundSum)) {
            orgTree.data.push(totalObj)
          }
        })
      }
    }
    indexNpp = aTree.indexNpp || 1
  }

  if (orgs.length > 1) {
    const orgTreeLastObj = {
      colSpan: colSpan,
      showEmpInfo: showEmpInfo,
      showAddInfo: showAddInfo,
      showTarifInfo: showTarifInfo,
      showFop: monthsFop !== 0,
      roundTo: roundTo,
      indexNum: '',
      name: UB.i18n('РАЗОМ'),
      isDepartment: false,
      isTotal: true,
      depType: '',
      quantity: orgTree.total.quantity || 0,
      roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.total.quantity || 0),
      basepay: orgTree.total.basepay || 0,
      accrualValues: typeReport === 1 ? [] : newDataAccrualValues(orgTree.total.accrualValues),
      accrualTotal: orgTree.total.accrualTotal || 0,
      accrualEmpTotal: orgTree.total.accrualEmpTotal || 0,
      tarifAccrualSum: orgTree.total.tarifAccrualSum || 0,
      accrualSum: orgTree.total.accrualSum || 0,
      addToMinSalary: orgTree.total.addToMinSalary || 0,
      fundSum: orgTree.total.fundSum || 0,
      fundSumByMonths: orgTree.total.fundSumByMonths || 0
    }
    orgTree.data.push(orgTreeLastObj)
  }

  return orgTree || {}
}

function generateGroupedData (data, titleText, fieldName, fieldNameEmpty, fieldSortName, accrualDataLength, sumArray, roundTo,
  roundToQuantity, showNn, showEmpInfo, showAddInfo = true, showFop = false, showTarifInfo = false, zeroToNull = false) {
  const treeGrouped = _.groupBy(data.filter(item => !item.isDepartment && !item.isTotal), fieldName)
  if (fieldName === 'militaryName') {
    for (let i = 1; i <= 2; i++) {
      const obj = {
        militaryName: i === 1 ? UB.i18n('Військовослужбовці') : UB.i18n('Робітники та службовці'),
        militarySort: i
      }
      if (!treeGrouped[obj.militaryName]) {
        obj.quantity = 0
        if (accrualDataLength) {
          obj.accrualValues = []
          for (let i = 0; i < accrualDataLength; i++) {
            obj.accrualValues.push({ value: 0, valueQuantity: 0 })
          }
        }

        _.forEach(sumArray, itemName => {
          obj[itemName] = 0
        })

        treeGrouped[obj.militaryName] = [obj]
      }
    }
  }

  const totalPC = {
    bold: 'font-weight: bold;',
    isTotal: true,
    name: titleText,
    quantity: 0,
    roundTo: roundTo,
    showEmpInfo: showEmpInfo,
    showAddInfo: showAddInfo,
    showTarifInfo: showTarifInfo,
    showFop: showFop,
    showNn: showNn,
    accrualValues: []
  }
  _.forEach(sumArray, itemName => {
    totalPC[itemName] = 0
  })
  if (accrualDataLength) {
    for (let i = 0; i < accrualDataLength; i++) {
      totalPC.accrualValues.push({ value: 0 })
    }
  }

  const result = []
  _.forEach(treeGrouped, groupItems => {
    const obj = {
      bold: '',
      sortOrder: groupItems[0][fieldSortName],
      name: groupItems[0][fieldName] || (fieldNameEmpty || UB.i18n('Не вказано')),
      quantity: groupItems.reduce((res, item) => res + item.quantity, 0),
      roundTo: roundTo,
      showEmpInfo: showEmpInfo,
      showAddInfo: showAddInfo,
      showTarifInfo: showTarifInfo,
      showFop: showFop,
      showNn: showNn,
      accrualValues: []
    }

    if (accrualDataLength) {
      for (let i = 0; i < accrualDataLength; i++) {
        obj.accrualValues.push({ value: 0 })
      }
    }

    _.forEach(sumArray, itemName => {
      obj[itemName] = groupItems.reduce((res, item) => res + item[itemName], 0)
      totalPC[itemName] += obj[itemName]
    })
    obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
    totalPC.quantity += obj.quantity

    if (accrualDataLength) {
      for (let i = 0; i < accrualDataLength; i++) {
        const value = groupItems.reduce((res, item) => res + item.accrualValues[i].valueQuantity, 0)
        obj.accrualValues[i].value = zeroToNull && !value ? undefined : value
        totalPC.accrualValues[i].value += value
      }
    }

    result.push(obj)
  })

  if (titleText) {
    totalPC.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(totalPC.quantity)
    if (zeroToNull) {
      totalPC.accrualValues.forEach(acc => {
        acc.value = acc.value ? acc.value : undefined
      })
    }
    return [totalPC].concat(_.sortBy(result, 'sortOrder'))
  } else {
    return _.sortBy(result, 'sortOrder')
  }
}

function getSettingsForReport (theObj, reportParamsRoundTo, organizationID = appAC.globalOrganization()) {
  const hrFuncOrgType = AC.settings.get('hrFuncOrgType', organizationID)
  theObj.showTotals = !(AC.settings.get('hrTotalsOnlyIndepStructUnit', organizationID) === true)
  theObj.namePosition = AC.settings.get('hrStaffReportNamePosition', organizationID) === true
  theObj.showTarifInfo = (AC.settings.get('hrStaffReportShowTarifCategory', organizationID) === true) && theObj.showAddInfo
  theObj.showCategory = hrFuncOrgType !== '2' ? theObj.showCategory : false
  theObj.showWokers = hrFuncOrgType !== '2' ? theObj.showWokers : false
  theObj.twoApprover = AC.settings.get('hrTwoApproverInStaffTable', organizationID) === true
  theObj.separateRounding = AC.settings.get('hrSeparateRounding', organizationID) === true

  const roundToQuantity = AC.settings.get('hrStaffUnitQuantityRound', organizationID)
  if (roundToQuantity) {
    switch (roundToQuantity) {
      case '1':
        theObj.roundToQuantity = 'numberGroup'
        break
      case '2':
        theObj.roundToQuantity = 'decimal1'
        break
      case '3':
        theObj.roundToQuantity = 'decimal2'
        break
      default:
        theObj.roundToQuantity = ''
        break
    }
  }

  if (reportParamsRoundTo === undefined) {
    theObj.roundTo = AC.settings.get('hrRoundAccrualStaffTable', organizationID) === '1' ? 'decimal2' : 'numberGroup'
  } else {
    theObj.roundTo = reportParamsRoundTo <= 0 ? 'numberGroup' : 'decimal2'
  }
}

async function getEmployeeAccrualData (onDate, employeeIDs, organizationID, paramCode = 'ReportConsolidated') {
  const employeeAccrualData = []
  if (employeeIDs.length) {
    const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', organizationID)
    const ids = _.chunk(employeeIDs, 1000)
    for (let i = 0; i < ids.length; i++) {
      const aData = await UB.Repository('hr_employeeAccrual')
        .attrs(['employeeNumberID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.name', 'payElID.dictExperienceID', 'payElID.shortPrintName', 'payElID.methodID.code'])
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
        .exists(UB.Repository('hr_idParam')
          .correlation('valuesID', 'payElID')
          .where('listParamID.code', '=', paramCode)
          .where('listParamID.tableName', '=', 'hr_payEl')
          .where('orgID', '=', parentOrdID || organizationID)
          .where('mi_deleteDate', '>=', '#maxdate'))
        .where('employeeNumberID', 'in', ids[i])
        .selectAsObject({
          'payElID.name': 'payElName',
          'payElID.shortPrintName': 'shortPayElName',
          'payElID.methodID.code': 'methodCode',
          'payElID.dictExperienceID': 'dictExperienceID'
        })
      employeeAccrualData.push(...aData)
    }
  }
  return employeeAccrualData && employeeAccrualData.length ? _.groupBy(employeeAccrualData, 'employeeNumberID') : {}
}

async function getEmployeeRankData (onDate, employeeIDs, empDataPromise) {
  const employeeRankData = UB.Repository('hr_publServRang')
    .attrs(['employeeID', 'dictRankID'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)

  if (employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024) {
    employeeRankData.where('employeeID', 'in', employeeIDs)
  } else {
    employeeRankData.exists(empDataPromise)
  }

  return await employeeRankData.selectAsObject()
}

async function getPayElExperience (onDate) {
  return await UB.Repository('hr_payElExperience')
    .attrs('payElID', 'years', 'months', 'rate')
    .where('payElID.methodID.code', '=', '6')
    .where('dateFrom', '<=', onDate, 'dateFromOnDate')
    .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
    .where('dateTo', '>=', onDate, 'dateToOnDate')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])')
    .orderBy('years', 'desc') // сортировка нужна для правильного вычисления %
    .orderBy('months', 'desc')
    .selectAsObject()
}

async function getEmployeeExperience (employeeIDs, empDataPromise) {
  const employeeExperience = UB.Repository('hr_employeeExperience')
    .attrs(['employeeID', 'dictExperienceID', 'calcDate'])

  if (employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024) {
    employeeExperience.where('employeeID', 'in', employeeIDs)
  } else {
    employeeExperience.exists(empDataPromise)
  }

  return await employeeExperience.selectAsObject()
}

async function getEmployeeTarifCategoryData (onDate, employeeIDs, empDataPromise) {
  const employeeTarifCategoryData = UB.Repository('hr_empTarifCategory')
    .attrs(['employeeID', 'dictTarifCoeffID.name'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)

  if (employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024) {
    employeeTarifCategoryData.where('employeeID', 'in', employeeIDs)
  } else {
    employeeTarifCategoryData.exists(empDataPromise)
  }

  return await employeeTarifCategoryData.selectAsObject()
}

async function getColumnsAccrualData (nextOnDate, result) {
  const accrualDataConfig = []
  const repCode = '12'
  const config = [
    { typeCol: 1, oper: 'startWith', repCode: 'incSlr', name: UB.i18n('Підвищення посадового окладу (грн)'), colToSum: 'tarif' },
    { typeCol: 2, oper: 'startWith', repCode: 'premSlr', name: UB.i18n('Надбавки (грн)'), colToSum: 'fundSum' },
    { typeCol: 3, oper: 'startWith', repCode: 'overSlr', name: UB.i18n('Доплати (грн)'), colToSum: 'fundSum' },
    { typeCol: 4, oper: '=', repCode: 'appMin1', name: UB.i18n('Доплата до МЗП (грн)'), colToSum: 'fundSum' },
    { typeCol: 5, oper: '=', repCode: 'appMin2', name: '', colToSum: 'fundSum' }, // назва з налаштування
    { typeCol: 6, oper: '=', repCode: 'varOver', name: '', colToSum: 'fundSum' } // назва з налаштування
  ]
  for (let i = 0; i < config.length; i++) {
    const repSetParam = await UB.Repository('hr_repSetParam')
      .attrs(['ID', 'name'])
      .where('dictStReportID.code', '=', repCode)
      .where('code', config[i].oper, config[i].repCode)
      .orderBy('reportNumStrPadded')
      .selectAsObject()
    let repSetElement = await UB.Repository('hr_repSetElement')
      .attrs(['elementID', 'repSetParamID'])
      .where('repSetParamID.dictStReportID.code', '=', repCode)
      .where('repSetParamID.code', config[i].oper, config[i].repCode)
      .where('dateFromNotEmpty', '<=', nextOnDate)
      .where('dateToNotEmpty', '>=', nextOnDate)
      .where('repSetParamID.dateFrom', '<=', nextOnDate)
      .where('repSetParamID.dateTo', '>=', nextOnDate)
      .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    repSetElement = _.groupBy(repSetElement, 'repSetParamID')

    if (repSetParam.length) {
      if (config[i].typeCol <= 3) {
        result.colNameRow1.push({ name: config[i].name, namecolspan: repSetParam.length, rowspan: 1 })
      }
      for (let j = 0; j < repSetParam.length; j++) {
        accrualDataConfig.push({
          typeCol: config[i].typeCol,
          repCode: config[i].repCode,
          toMinCol: config[i].typeCol === 4 || config[i].typeCol === 5,
          colToSum: config[i].colToSum,
          elements: repSetElement[repSetParam[j].ID] ? repSetElement[repSetParam[j].ID].map(el => el.elementID) : [],
          value: 0,
          valueQuantity: 0
        })
        if (config[i].typeCol >= 4) {
          result.colNameRow1.push({ name: repSetParam[j].name, namecolspan: repSetParam.length, rowspan: 2 })
        } else {
          result.colNameRow2.push({ name: repSetParam[j].name })
          result.colNameRow2Exist = true
        }
        result.colNames2.push({ name: ' ' })
      }
    }
    if (i === 0) {
      // добавим колонку №9
      const col1 = accrualDataConfig.filter(el => el.typeCol === 1)
      result.colNameRow1.push({ name: UB.i18n('Посадовий оклад з урахуванням підвищення (грн)'), namecolspan: 1, rowspan: 2 })
      result.colNames2.push({ name: ' ' })
      accrualDataConfig.push({
        elements: col1 ? _.flatten(col1.map(el => el.elements)) : [],
        col9: true,
        colToSum: 'tarif',
        value: 0,
        valueQuantity: 0
      })
    }
    if (i === 2) {
      // Разом надбавки та доплати
      const col23 = accrualDataConfig.filter(el => el.typeCol === 2 || el.typeCol === 3)
      if (col23.length) {
        result.colNameRow1.push({ name: UB.i18n('Разом надбавки та доплати'), namecolspan: 1, rowspan: 2 })
        result.colNames2.push({ name: ' ' })
        accrualDataConfig.push({
          elements: _.flatten(col23.map(el => el.elements)),
          colToSum: '',
          value: 0,
          valueQuantity: 0
        })
      }
    }
  }
  if (!result.colNameRow2Exist) {
    result.colNameRow1.forEach(row => {
      row.rowspan = 1
    })
  }
  result.rowspancol = result.colNameRow2Exist ? 2 : 1
  return accrualDataConfig
}

async function fillPositionByTarifAndSchemeInfo (posData, onDate) {
  if (!posData || !posData.length) return

  const tarifData = await UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['dictTarifCoeffID', 'accrualSum'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const schemeData = await UB.Repository('hr_dictSalarySchemeDet')
    .attrs('accrualSum', 'accrualSumAvg', 'dictSalarySchemeLevelID')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  posData.forEach(pos => {
    pos.isTarif = false
    pos.isTarifOrScheme = false
    pos.tarifOrScheme = ''
    pos.tarifOrSchemeValue = undefined
    if (pos.paymentType === 'TARIF' && pos.dictTarifCoeffID) {
      pos.isTarif = true
      pos.isTarifOrScheme = true
      pos.tarifOrScheme = pos['dictTarifCoeffID.name'] || ''
      const tarif = _.find(tarifData, { dictTarifCoeffID: pos.dictTarifCoeffID })
      pos.tarifOrSchemeValue = (tarif && tarif.accrualSum) || 0
    } if (pos.paymentType === 'SCHEME' && pos.dictSalarySchemeLevelID) {
      pos.isTarifOrScheme = true
      pos.tarifOrScheme = pos['dictSalarySchemeLevelID.name'] || ''
      const scheme = _.find(schemeData, { dictSalarySchemeLevelID: pos.dictSalarySchemeLevelID })
      pos.tarifOrSchemeValue = scheme ? scheme.accrualSum || scheme.accrualSumAvg || 0 : 0
    }
  })
}

function generateDataForReportWithAccrual (organizationID, itemID, orgStruct, accrualData, positionData, paData, accrualDataConfig, minConfig, config) {
  if (!orgStruct || !orgStruct.length) return {}
  const sumRoundTo = config.roundTo === 'numberGroup' ? 0 : 2
  const qntRoundTo = HR.reportUtils.getRountToByCode(config.roundToQuantity)
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()

  const totalAccrualValues = []
  for (let i = 0; i < accrualDataConfig.length; i++) {
    totalAccrualValues.push({ value: 0 })
  }

  function calcTotal (resultObj, qnt, tarifOrSchemeValue, basepay, fundSum, fundSumByMonths, accrualValues,
    fromTotal, addToTotal, addToWokers) {
    if (addToTotal) {
      resultObj.total.quantity += qnt
      resultObj.total.tarifOrSchemeValue += tarifOrSchemeValue
      resultObj.total.basepay += basepay
      resultObj.total.fundSum += fundSum
      resultObj.total.fundSumByMonths += fundSumByMonths
      resultObj.total.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(resultObj.total.quantity)
    }
    if (addToWokers) {
      resultObj.wokers.quantity += qnt
      resultObj.wokers.tarifOrSchemeValue += tarifOrSchemeValue
      resultObj.wokers.basepay += basepay
      resultObj.wokers.fundSum += fundSum
      resultObj.wokers.fundSumByMonths += fundSumByMonths
      resultObj.wokers.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(resultObj.wokers.quantity)
    }
    if (accrualValues.length) {
      for (let i = 0; i < accrualValues.length; i++) {
        if (addToTotal) {
          resultObj.total.accrualValues[i].value += fromTotal ? accrualValues[i].value : accrualValues[i].valueQuantity
        }
        if (addToWokers) {
          resultObj.wokers.accrualValues[i].value += fromTotal ? accrualValues[i].value : accrualValues[i].valueQuantity
        }
      }
    }
  }

  function newDataAccrualValues (oldArray, onlyValue = true) {
    const newArray = []
    _.forEach(oldArray, arr => {
      if (onlyValue) {
        newArray.push({
          value: arr.value
        })
      } else {
        newArray.push({
          elements: arr.elements || [],
          colToSum: arr.colToSum,
          col9: arr.col9 || false,
          toMinCol: arr.toMinCol || false,
          value: arr.value,
          valueQuantity: arr.valueQuantity
        })
      }
    })
    return newArray
  }

  function findPosition (data, parentID, basepay, name, tarifOrScheme, accrualValues) {
    function arrayEquals (a, b) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
        a.every((val, index) => val.value === b[index].value)
    }
    if (!config.groupJobsPrint || !data || !data.length) return undefined

    let foundItem
    const fnd = data.filter(el => el.parentID === parentID && el.basepay === basepay && el.name === name && el.tarifOrScheme === tarifOrScheme && !el.isDepartment && !el.isTotal)
    fnd.forEach(posItem => {
      if (arrayEquals(posItem.accrualValues, accrualValues)) {
        foundItem = posItem
        return foundItem
      }
    })

    return foundItem
  }

  function getData (indexNpp, parentID, level = 1) {
    const result = {
      data: [],
      total: {
        quantity: 0,
        tarifOrSchemeValue: 0,
        accrualValues: newDataAccrualValues(totalAccrualValues),
        basepay: 0,
        fundSum: 0,
        fundSumByMonths: 0
      },
      wokers: {
        quantity: 0,
        tarifOrSchemeValue: 0,
        accrualValues: newDataAccrualValues(totalAccrualValues),
        basepay: 0,
        fundSum: 0,
        fundSumByMonths: 0
      }
    }

    const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
    const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
    const styleBegin = level === 1 ? '<font color="blue">' : level === 2 ? '<u>' : ''
    const styleEnd = level === 1 ? '</font>' : level === 2 ? '</u>' : ''

    curStruct.forEach(orgItem => {
      const isDept = orgItem.mi_unityEntity !== 'hr_position'

      let obj = {
        isDepartment: isDept,
        isTotal: false,
        showNn: config.showNn,
        colSpan: config.colSpan,
        colSpanPaymentType: config.colSpanPaymentType,
        parentID: parentID,
        textAlign: 'left',
        needAdd: true,
        name: isDept ? `${str}${styleBegin}${config.showDeptCodes && orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
          : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
        depType: orgItem.depType || ''
      }

      if (!obj.isDepartment) {
        const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
        if (posItem) {
          obj.name = config.namePosition
            ? HR.nameCase.cap(posItem['name'] || '')
            : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
          let basepay = (posItem.isTarif ? posItem.tarifOrSchemeValue : orgItem.accrualSum) || 0
          //  Тип оплати = За трудовою угодою, то  такая сумма должна быть равна нулю.
          basepay = notShowSalary || posItem.paymentType === 'CONTRACT' ? 0 : basepay
          basepay = AC.currencyService.round(basepay || 0, sumRoundTo)

          let qnt = (posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0
          qnt = !config.roundToQuantity ? qnt : AC.currencyService.round(qnt, qntRoundTo)
          const tarifOrSchemeValue = notShowSalary ? 0 : posItem.tarifOrSchemeValue || 0

          // calucating accrual
          const paDataFlt = notShowSalary ? [] : paData.filter(item => item.positionID === posItem.ID)
          let accrualTotalFundSum = 0
          const currentAccrualValues = newDataAccrualValues(accrualDataConfig, false)
          if (paDataFlt && paDataFlt.length && posItem.paymentType !== 'CONTRACT') {
            _.forEach(paDataFlt, item => {
              const value = AC.currencyService.round(item.calcSum || 0, sumRoundTo) // getSum(item.accrualSum, item.accrualRate, basepay)
              _.forEach(currentAccrualValues, acc => {
                if (acc.elements.indexOf(item.payElID) !== -1) {
                  let accValue = 0
                  if (!acc.toMinCol) {
                    accValue = acc.colToSum === 'tarif' ? (posItem.isTarifOrScheme ? value : 0) : value
                    acc.value += accValue
                    acc.valueQuantity += AC.currencyService.round(accValue * qnt, sumRoundTo)
                    accrualTotalFundSum += acc.colToSum && !acc.col9 ? accValue : 0
                  }
                }
              })
            })
          }
          _.forEach(currentAccrualValues.filter(el => el.toMinCol && el.elements.length), acc => {
            let accValue = 0
            if (minConfig.min25.length && acc.elements.filter(el => minConfig.min25.indexOf(el) !== -1).length) {
              accValue = notShowSalary ? 0 : minConfig.minSalarySum || 0
            }
            if (minConfig.min49.length && acc.elements.filter(el => minConfig.min49.indexOf(el) !== -1).length) {
              const paySums = minConfig.payPerm.filter(el =>
                (acc.elements.indexOf(el.payElID) !== -1) &&
                ((el.excludeDepartment && !el.departmentID.includes(posItem.departmentID)) ||
                  (!el.excludeDepartment && el.departmentID.length && el.departmentID.includes(posItem.departmentID)) ||
                  (!el.excludeDepartment && !el.departmentID.length)
                ) &&
                ((el.excludePosition && !el.dictPositionID.includes(posItem.dictPositionID)) ||
                  (!el.excludePosition && el.dictPositionID.length && el.dictPositionID.includes(posItem.dictPositionID)) ||
                  (!el.excludePosition && !el.dictPositionID.length)
                ) &&
                ((el.excludeStaff && !el.dictStaffCatID.includes(posItem.dictStaffCatID)) ||
                  (!el.excludeStaff && el.dictStaffCatID.length && el.dictStaffCatID.includes(posItem.dictStaffCatID)) ||
                  (!el.excludeStaff && !el.dictStaffCatID.length)
                ) &&
                ((el.excludeEmpCategory && !el.dictEmpCategoryID.includes(posItem.dictEmpCategoryID)) ||
                  (!el.excludeEmpCategory && el.dictEmpCategoryID.length && el.dictEmpCategoryID.includes(posItem.dictEmpCategoryID)) ||
                  (!el.excludeEmpCategory && !el.dictEmpCategoryID.length)
                )
              )

              accValue = paySums && paySums.length ? paySums.sort((a, b) => (a.paySum > b.paySum) ? -1 : 1)[0]['paySum'] || 0 : 0
            }
            accValue = accValue - (basepay + accrualTotalFundSum) > 0 ? accValue - (basepay + accrualTotalFundSum) : 0
            acc.value += accValue
            acc.valueQuantity += AC.currencyService.round(accValue * qnt, sumRoundTo)
            accrualTotalFundSum += accValue
          })

          const col9 = _.find(currentAccrualValues, { col9: true })
          if (col9) {
            col9.value += basepay
            col9.valueQuantity += AC.currencyService.round(basepay * qnt, sumRoundTo)
          }

          const foundItem = config.groupJobsPrint ? findPosition(result.data, parentID, basepay, obj.name, posItem.tarifOrScheme, currentAccrualValues) : undefined
          if (foundItem) {
            obj = foundItem
            obj.needAdd = false
          } else {
            obj.roundTo = config.roundTo
            obj.fundSum = 0
            obj.fundSumByMonths = 0
            obj.quantity = 0
            obj.accrualValues = newDataAccrualValues(currentAccrualValues, false)
            obj.positionCategorySortOrder = posItem['positionCategory.sortOrder'] || '9999999'
            obj.positionCategory = posItem['positionCategory'] || ''
            obj.positionCategoryName = posItem['positionCategory.name'] || ''
            obj.paymentType = posItem.paymentType === 'CONTRACT' ? UB.i18n('Згідно умов трудового договору') : ''
            obj.KPcode = posItem['dictPositionID.dictProfessionID.code'] || ''
            obj.tarifOrScheme = posItem.tarifOrScheme
            obj.tarifOrSchemeValue = 0
          }
          const fundSum = config.separateRounding
            ? AC.currencyService.round(qnt * basepay, sumRoundTo) + AC.currencyService.round(qnt * accrualTotalFundSum, sumRoundTo)
            : AC.currencyService.round(qnt * (basepay + accrualTotalFundSum), sumRoundTo)
          const fundSumByMonths = config.monthsFop !== 0 ? AC.currencyService.round(config.monthsFop * fundSum, sumRoundTo) : 0

          obj.quantity += qnt
          obj.basepay = basepay
          obj.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
          obj.fundSum += fundSum
          obj.fundSumByMonths += fundSumByMonths
          obj.tarifOrSchemeValue += tarifOrSchemeValue

          calcTotal(result, qnt, tarifOrSchemeValue, AC.currencyService.round(basepay * qnt, sumRoundTo), fundSum, fundSumByMonths, currentAccrualValues, false, true, config.showWokers && ((obj.positionCategoryName || '').toLowerCase()).indexOf('робітник') !== -1)
        } else {
          obj.needAdd = false
        }
      }
      if (obj.needAdd) {
        obj.indexNum = obj.isDepartment ? '' : indexNpp++
        result.data.push(obj)
      }
      if (obj.isDepartment) {
        const subTree = getData(indexNpp, orgItem.mi_data_id, level + 1)
        const subTreeHasData = (subTree.data && subTree.data.length)
        if (subTree) {
          indexNpp = subTree.indexNpp || 1

          subTreeHasData && result.data.push(...subTree.data)

          if (config.showLevelTotals > 0 && (level === config.showLevelTotals || config.showLevelTotals === 2)) {
            const totalObj = {
              roundTo: config.roundTo,
              colSpan: config.colSpan,
              colSpanPaymentType: config.colSpanPaymentType,
              showFop: config.monthsFop !== 0,
              indexNum: '',
              name: UB.i18n(`{0}Всього по {1}`, str, obj.depType),
              isDepartment: false,
              isTotal: true,
              quantity: subTree.total.quantity,
              basepay: subTree.total.basepay,
              roundToQuantity: config.roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.total.quantity || 0),
              tarifOrSchemeValue: subTree.total.tarifOrSchemeValue,
              accrualValues: newDataAccrualValues(subTree.total.accrualValues),
              fundSum: subTree.total.fundSum,
              fundSumByMonths: subTree.total.fundSumByMonths
            }
            result.data.push(totalObj)
            if (config.showWokers) {
              const totalObj = {
                roundTo: config.roundTo,
                colSpan: config.colSpan,
                colSpanPaymentType: config.colSpanPaymentType,
                showFop: config.monthsFop !== 0,
                indexNum: '',
                name: UB.i18n(`{0}в т.ч. робітники`, str),
                isDepartment: false,
                isTotal: true,
                quantity: subTree.wokers.quantity,
                basepay: subTree.wokers.basepay,
                roundToQuantity: config.roundToQuantity || HR.reportUtils.getQuantityFractional(subTree.wokers.quantity || 0),
                tarifOrSchemeValue: subTree.wokers.tarifOrSchemeValue,
                accrualValues: newDataAccrualValues(subTree.wokers.accrualValues),
                fundSum: subTree.wokers.fundSum,
                fundSumByMonths: subTree.wokers.fundSumByMonths
              }
              totalObj.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
              if (totalObj.quantity || totalObj.fundSum) {
                result.data.push(totalObj)
              }
            }
          }

          calcTotal(result, subTree.total.quantity, subTree.total.tarifOrSchemeValue, subTree.total.basepay, subTree.total.fundSum, subTree.total.fundSumByMonths,
            subTree.total.accrualValues, true, true, false)
          calcTotal(result, subTree.wokers.quantity, subTree.wokers.tarifOrSchemeValue, subTree.wokers.basepay, subTree.wokers.fundSum, subTree.wokers.fundSumByMonths,
            subTree.wokers.accrualValues, true, false, true)
        }
      }
    })

    result.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantity)
    result.indexNpp = indexNpp
    return result
  }

  const orgTree = getData(1, itemID)
  let tName = UB.i18n('ВСЬОГО')
  if (organizationID !== itemID) {
    const tObj = _.find(orgStruct, { mi_data_id: itemID })
    tName = tObj && tObj.depType ? tObj.depType : ''
    tName = UB.i18n(`{0}Всього по {1}`, '', tName)
  }
  const orgTreeLastObj = {
    showNn: config.showNn,
    colSpan: config.colSpan,
    roundTo: config.roundTo,
    indexNum: '',
    name: tName,
    isDepartment: false,
    isTotal: true,
    quantity: orgTree.total.quantity || 0,
    basepay: orgTree.total.basepay || 0,
    roundToQuantity: config.roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.total.quantity || 0),
    accrualValues: newDataAccrualValues(orgTree.total.accrualValues),
    fundSum: orgTree.total.fundSum || 0,
    fundSumByMonths: orgTree.total.fundSumByMonths || 0
  }
  orgTree.data.push(orgTreeLastObj)

  if (organizationID !== itemID && config.showWokers) {
    const totalObj = {
      showNn: config.showNn,
      colSpan: config.colSpan,
      roundTo: config.roundTo,
      indexNum: '',
      name: UB.i18n(`{0}в т.ч. робітники`, ''),
      isDepartment: false,
      isTotal: true,
      quantity: orgTree.wokers.quantity || 0,
      basepay: orgTree.wokers.basepay || 0,
      roundToQuantity: config.roundToQuantity || HR.reportUtils.getQuantityFractional(orgTree.wokers.quantity || 0),
      accrualValues: newDataAccrualValues(orgTree.wokers.accrualValues),
      fundSum: orgTree.wokers.fundSum || 0,
      fundSumByMonths: orgTree.wokers.fundSumByMonths || 0
    }
    totalObj.roundToQuantity = config.roundToQuantity || HR.reportUtils.getQuantityFractional(totalObj.quantity)
    if (totalObj.quantity || totalObj.fundSum) {
      orgTree.data.push(totalObj)
    }
  }

  return orgTree || {}
}

function setZeroToNullValue (data) {
  data.forEach(obj => {
    if (!obj.isDepartment) {
      obj.accrualValues.forEach(acc => {
        acc.value = acc.value ? acc.value : undefined
      })
    }
  })
}

async function getPayPermInfo (orgID, payElIDs, dateFrom, dateTo, payType, permType, paramCode) {
  let orgAccrual = UB.Repository('hr_payPerm')
    .attrs(['ID', 'payElID', 'paySum', 'rate', 'excludeStaff', 'excludePosition', 'excludeDepartment',
      'payElID.name', 'payElID.dictExperienceID', 'payElID.shortPrintName', 'payElID.methodID.code',
      'excludeWorkPlace', 'excludeWorkerType', 'excludeEmpCategory'
    ])
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .whereIf(payElIDs && payElIDs.length, 'payElID', 'in', payElIDs)
    .whereIf(dateFrom, 'dateTo', '>=', dateFrom)
    .whereIf(dateTo, 'dateFrom', '<=', dateTo)
    .whereIf(payType && payType.length, 'payType', 'in', payType)
    .exists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org')
    .notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_payPermDt')
      .correlation('payPermID', 'ID')
      .where('orgID', '=', orgID)
      .where('permType', '=', '1')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg')
    .logic('(([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))')

  if (paramCode) {
    const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', orgID)
    orgAccrual.exists(UB.Repository('hr_idParam')
      .correlation('valuesID', 'payElID')
      .where('listParamID.code', '=', paramCode)
      .where('listParamID.tableName', '=', 'hr_payEl')
      .where('orgID', '=', parentOrdID || orgID)
      .where('mi_deleteDate', '>=', '#maxdate'))
  }

  orgAccrual = await orgAccrual.selectAsObject({
    'payElID.name': 'payElName',
    'payElID.shortPrintName': 'shortPayElName',
    'payElID.methodID.code': 'methodCode',
    'payElID.dictExperienceID': 'dictExperienceID'
  })

  const payPermDt = orgAccrual.length ? await UB.Repository('hr_payPermDt')
    .attrs(['ID', 'payPermID', 'orgID', 'dictStaffCatID', 'dictPositionID', 'permType', 'departmentID', 'workPlace', 'workerType', 'dictEmpCategoryID'])
    .whereIf(!permType, 'permType', '!=', '1')
    .whereIf(permType, 'permType', 'in', permType)
    .where('payPermID', 'in', orgAccrual.map(o => o.ID))
    .selectAsObject() : []

  orgAccrual.forEach(orgAccr => {
    orgAccr.departmentID = payPermDt.filter(o => o.permType === '4' && o.payPermID === orgAccr.ID).map(o => o.departmentID)
    orgAccr.dictPositionID = payPermDt.filter(o => o.permType === '3' && o.payPermID === orgAccr.ID).map(o => o.dictPositionID)
    orgAccr.dictStaffCatID = payPermDt.filter(o => o.permType === '2' && o.payPermID === orgAccr.ID).map(o => o.dictStaffCatID)
    orgAccr.workPlace = payPermDt.filter(o => o.permType === '5' && o.payPermID === orgAccr.ID).map(o => o.workPlace)
    orgAccr.workerType = payPermDt.filter(o => o.permType === '6' && o.payPermID === orgAccr.ID).map(o => o.workerType)
    orgAccr.dictEmpCategoryID = payPermDt.filter(o => o.permType === '11' && o.payPermID === orgAccr.ID).map(o => o.dictEmpCategoryID)
  })
  return orgAccrual
}

async function getConfigAddToMinimum (orgID, onDate, accrualDataConfig) {
  const payElIDs = _.flatten(accrualDataConfig.filter(el => el.repCode === 'appMin1' || el.repCode === 'appMin2').map(el => el.elements))

  const minConfig = {
    min25: payElIDs ? await UB.Repository('hr_payEl')
      .attrs(['ID'])
      .where('ID', 'in', payElIDs)
      .where('methodID.code', '=', '25') // Доплата до мінімальної зарплати
      .selectAsObject() : [],
    min49: payElIDs ? await UB.Repository('hr_payEl')
      .attrs(['ID'])
      .where('ID', 'in', payElIDs)
      .where('methodID.code', '=', '49') // Доплата до мінімальної суми
      .selectAsObject() : [],
    minSalarySum: await UB.Repository('hr_dictSalaryMinSize')
      .attrs(['monthValue'])
      .where('[dateFrom]', '<=', onDate)
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectScalar() || 0
  }
  minConfig.min25 = minConfig.min49.length ? minConfig.min25.map(el => el.ID) : []
  minConfig.min49 = minConfig.min49.length ? minConfig.min49.map(el => el.ID) : []
  minConfig.payPerm = minConfig.min49.length ? await getPayPermInfo(orgID, minConfig.min49, onDate, onDate, ['2', '3', '4']) : []
  return minConfig
}
