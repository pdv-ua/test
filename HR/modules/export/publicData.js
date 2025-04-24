/* eslint-disable camelcase */
const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const dateService = require('../../../AC/modules/dataServices/dateService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
const requestService = require('./requestService')
const publicTotals = require('./publicTotals')

module.exports = {
  exportPublicData,
  uploadPublicData,
  getOrgStructure
}

const mainFields = ['mi_data_id', 'code', 'objectType', 'organizationID', 'parentUnitID', 'idxNum', 'organization_Name',
  'organization_NameEng', 'organization_FullName', 'organization_GovernmentType', 'organization_BranchID',
  'organization_EDRPOUCode', 'organization_TaxCode', 'organization_ParentUnitTypeID', 'organization_AreasActivityID',
  'organization_Address', 'organization_RegionID', 'department_Name', 'department_DepType', 'department_Kind',
  'department_PosCount', 'department_VacancyCount',
  'position_Name', 'position_Category', 'position_PsCategory', 'position_PersonalType', 'position_PositionType',
  'position_StaffCat', 'position_Proffession', 'position_WagePay', 'position_StatePay', 'position_AccrualSum',
  'position_PayEl', 'position_IsBoss', 'position_IsVacant', 'position_VacantFrom',
  'employee_FirstName', 'employee_LastName', 'employee_MiddleName', 'employee_SexType', 'employee_EducationLevel',
  'employee_PhoneMobile', 'employee_PhoneWorking', 'employee_Email', 'employee_Photo', 'employee_Age', 'employee_Rank',
  'employee_Experience', 'employee_AppointedFrom', 'employee_rangeScience']

const dictFields = ['ID', 'code', 'name', 'description']
const codeNameFields = ['ID', 'code', 'name']
const enumFields = ['code', 'name', 'shortName', 'sortOrder']
const enumExpFields = ['ID', 'name', 'shortName', 'sortOrder']
const allowedPubFileEntity = ['hr_employee', 'ac_portalDoc', 'ac_portalInfo', 'ac_portalContact']

const fileNamesToExport = {
  exportPublicData_public_json: 'public.json',
  exportPublicData_exportPublicTotals: 'publicTotals.json',
  exportPublicData_hr_dictOrganizationBranch_json: 'hr_dictOrganizationBranch.json',
  exportPublicData_hr_dictParentUnitType: 'hr_dictParentUnitType.json',
  exportPublicData_hr_dictAreasActivity: 'hr_dictAreasActivity.json',
  exportPublicData_cdn_regiontype: 'cdn_regiontype.json',
  // exportPublicData_cdn_city: 'cdn_city.json',
  exportPublicData_cdn_region: 'cdn_region.json',
  exportPublicData_hr_dictPositionPsCategory: 'hr_dictPositionPsCategory.json',
  exportPublicData_hr_dictPositionType: 'hr_dictPositionType.json',
  exportPublicData_hr_dictEducationLevel: 'hr_dictEducationLevel.json',
  exportPublicData_hr_dictRank: 'hr_dictRank.json',
  exportPublicData_hr_dictDegree: 'hr_dictDegree.json',
  exportPublicData_ac_portalDoc: 'ac_portalDoc.json',
  exportPublicData_ac_portalInfo: 'ac_portalInfo.json',
  exportPublicData_ac_portalContact: 'ac_portalContact.json'
}

const filesGroup = {
  'Основний': [
    fileNamesToExport.exportPublicData_public_json
  ],
  'Сумарні': [
    fileNamesToExport.exportPublicData_exportPublicTotals
  ],
  'Довідники': [
    fileNamesToExport.exportPublicData_hr_dictOrganizationBranch_json,
    fileNamesToExport.exportPublicData_hr_dictParentUnitType,
    fileNamesToExport.exportPublicData_hr_dictAreasActivity,
    fileNamesToExport.exportPublicData_cdn_regiontype,
    // fileNamesToExport.exportPublicData_cdn_city,
    fileNamesToExport.exportPublicData_cdn_region,
    fileNamesToExport.exportPublicData_hr_dictPositionPsCategory,
    fileNamesToExport.exportPublicData_hr_dictPositionType,
    fileNamesToExport.exportPublicData_hr_dictEducationLevel,
    fileNamesToExport.exportPublicData_hr_dictRank,
    fileNamesToExport.exportPublicData_hr_dictDegree
  ],
  'Документи': [
    fileNamesToExport.exportPublicData_ac_portalDoc
  ],
  'Інформація на портал': [
    fileNamesToExport.exportPublicData_ac_portalInfo
  ],
  'Контакти': [
    fileNamesToExport.exportPublicData_ac_portalContact
  ]
}

const breakLineExpression = '<br/>'

function loadDocumentPubLink (entity, attribute, id, refValue) {
  if (refValue) {
    const res = `getDocumentHRPub?entity=${entity}&attribute=${attribute}&ID=${id}`
    return res
  }
  return null
}

function exportPublicData_public_json (onDate, exportPath, fileName) {
  if (settingsService.get('publicPortalReceiveEmployeeID')) {
    mainFields.push('employee_ID')
  }
  const isReceiveEducation = settingsService.get('publicPortalReceiveEducation')
  if (isReceiveEducation) {
    mainFields.push('employee_Education')
  }
  let mainData = []
  const untransefedPosTypes = requestService.getUntransefedPosTypesArray()
  const staffUnits = UB.Repository('hr_staffUnit')
    .attrs(['mi_data_id', 'mi_unityEntity', 'parentUnitID', 'code', 'name', 'fullName', 'idxNum', 'orgID'])
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .notExists(
      UB.Repository('hr_organization')
        .correlation('ID', 'ID')
        .where('parentUnitTypeID.code', '=', 'non')
        .where('parentUnitTypeID.mi_deleteDate', '>=', '#maxdate'))
    .notExists(
      UB.Repository('hr_position')
        .correlation('ID', 'ID')
        .where('positionType', 'in', untransefedPosTypes))
    .selectAsObject()
  const orgData = UB.Repository('hr_organization')
    .attrs(['ID', 'mi_data_id', 'nameEng', 'dictGovernmTypeID.name', 'powerBranch', 'EDRPOUCode', 'taxCode', 'parentUnitTypeID',
      'dictAreasActivityID', 'doNotTransfer'])
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .joinCondition('parentUnitTypeID.code', '!=', 'non')
    .joinCondition('parentUnitTypeID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictGovernmTypeID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  const deptData = UB.Repository('hr_department')
    .attrs(['mi_data_id', 'dictDepTypeID.name', 'departmentKindID.name'])
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
    .joinCondition('orgID.parentUnitTypeID.code', '!=', 'non')
    .where('orgID.mi_deleteDate', '>=', '#maxdate')
    .where('orgID.mi_dateFrom', '<=', onDate)
    .where('orgID.mi_dateTo', '>=', onDate)
    .where('orgID.state', '=', 'ACTIVE')
    .joinCondition('orgID.parentUnitTypeID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictDepTypeID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  const posData = UB.Repository('hr_position')
    .attrs(['mi_data_id', 'positionCategory.name', 'psCategory.shortName', 'personalType.name', 'positionType', 'dictStaffCatID.name',
      'dictPositionID.name', 'dictWagePayID.name', 'dictStatePayID.name', 'accrualSum', 'payElID.name', 'isOrgBoss',
      'vacancyRate'])
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
    .where('orgID.doNotTransfer', '=', false)
    .joinCondition('orgID.parentUnitTypeID.code', '!=', 'non')
    .where('orgID.state', '=', 'ACTIVE')
    .where('orgID.mi_deleteDate', '>=', '#maxdate')
    .where('orgID.mi_dateFrom', '<=', onDate)
    .where('orgID.mi_dateTo', '>=', onDate)
    .joinCondition('orgID.parentUnitTypeID.mi_deleteDate', '>=', '#maxdate')
    .where('positionType', 'notIn', untransefedPosTypes)
    .joinCondition('dictStaffCatID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictPositionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictWagePayID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('dictStatePayID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('payElID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  const orgAddr = UB.Repository('ac_address')
    .attrs(['ownerID', 'address', 'regionID'])
    .where('addressType', '=', '2')
    .selectAsObject()
  const posVac = global['hr_positionVac'].getVacanciesWithVacFrom(onDate)
  const empRankData = UB.Repository('hr_publServRang')
    .attrs(['employeeID', 'dictRankID'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
  const expMethodType = settingsService.get('hrExportCfgExperienceType')
  const empExpData = UB.Repository('hr_employeeExperience')
    .attrs(['employeeID', 'calcDate'])
    .whereIf(expMethodType, 'dictExperienceID.methodExpID', '=', expMethodType)
    .whereIf(!expMethodType, 'dictExperienceID.methodExpID.code', '=', '6')
    .selectAsObject()
  const empScienceData = UB.Repository('hr_empRangeScience')
    .attrs(['employeeID', 'dictDegreeID'])
    .orderByDesc('docDate')
    .selectAsObject()
  const empEduData = isReceiveEducation
    ? UB.Repository('hr_employeeEducation')
      .attrs('employeeID', 'dictEducationLevelID.name', 'educationName', 'educationOrgID.name', 'dateFrom', 'dateTo', 'dictSpecialtyID.name')
      .selectAsObject({
        'dictEducationLevelID.name': 'educationLevel',
        'dictSpecialtyID.name': 'specialty'
      })
    : []
  empEduData.forEach(row => {
    if (!row['educationName']) {
      row['educationName'] = row['educationOrgID.name']
    }
    row.dateFrom = row.dateFrom ? dateService.formatDate(dateService.shiftDate(row.dateFrom), 'yyyy-mm-dd') : null
    row.dateTo = row.dateTo ? dateService.formatDate(dateService.shiftDate(row.dateTo), 'yyyy-mm-dd') : null
    delete row['educationOrgID.name']
  })
  const doNotTransferOrgIDs = orgData.filter(ite => !!ite.doNotTransfer).map(ite => ite.mi_data_id)
  staffUnits.forEach(item => {
    let doNotTransfer = false
    switch (item.mi_unityEntity) {
      case 'hr_organization':
        item.objectType = 'organization'
        item.organizationID = item.mi_data_id
        item.organization_Name = item.name
        item.organization_FullName = item.fullName
        let orgItem = _.find(orgData, { mi_data_id: item.mi_data_id })
        if (orgItem) {
          item.organization_NameEng = orgItem.nameEng
          item.organization_GovernmentType = orgItem['dictGovernmTypeID.name']
          item.organization_BranchID = orgItem.powerBranch
          item.organization_EDRPOUCode = orgItem.EDRPOUCode
          item.organization_TaxCode = orgItem.taxCode
          item.organization_ParentUnitTypeID = orgItem.parentUnitTypeID
          item.organization_AreasActivityID = orgItem.dictAreasActivityID
          let addrItem = _.find(orgAddr, { ownerID: item.mi_data_id })
          if (addrItem) {
            item.organization_Address = addrItem.address
            item.organization_RegionID = addrItem.regionID
          }
        }
        break
      case 'hr_department':
        item.objectType = 'department'
        item.organizationID = item.orgID
        item.department_Name = item.name
        let deptItem = _.find(deptData, { mi_data_id: item.mi_data_id })
        if (deptItem) {
          item.department_DepType = deptItem['dictDepTypeID.name']
          item.department_Kind = deptItem['departmentKindID.name']
        }
        item.department_PosCount = 0
        item.department_VacancyCount = 0
        let posVacItems = posVac.filter(vacItem => vacItem.parentUnitID === item.mi_data_id)
        if (posVacItems.length) {
          item.department_PosCount = posVacItems.length
          posVacItems.forEach(posVacItem => {
            (posVacItem.vacCount > 0) && item.department_VacancyCount++
          })
        }
        doNotTransfer = doNotTransferOrgIDs.includes(item.organizationID)
        break
      case 'hr_position':
        item.objectType = 'position'
        item.organizationID = item.orgID
        item.position_Name = item.name
        let posItem = _.find(posData, { mi_data_id: item.mi_data_id })
        if (posItem) {
          item.position_Category = posItem['positionCategory.name']
          item.position_PsCategory = posItem['psCategory.shortName']
          item.position_PersonalType = posItem['personalType.name']
          item.position_PositionType = posItem.positionType
          item.position_StaffCat = posItem['dictStaffCatID.name']
          item.position_Proffession = posItem['dictPositionID.name']
          item.position_WagePay = posItem['dictWagePayID.name']
          item.position_StatePay = posItem['dictStatePayID.name']
          item.position_AccrualSum = posItem.accrualSum
          item.position_PayEl = posItem['payElID.name']
          item.position_IsBoss = posItem.isOrgBoss
          let posVacItem = _.find(posVac, { mi_data_id: item.mi_data_id })
          if (posVacItem) {
            let isVacant = (posVacItem.vacCount > 0)
            item.position_IsVacant = isVacant
            item.position_VacantFrom = isVacant ? posVacItem.vacFrom : null
          }
        }
        doNotTransfer = doNotTransferOrgIDs.includes(item.organizationID)
        break
    }
    if (!doNotTransfer) {
      addMainRecord(mainData, item)
    }
  })

  const hrExportCfgExportPhoto = settingsService.get('hrExportCfgExportPhoto')
  const hrExportCfgExportEmployee = settingsService.get('hrExportCfgExportEmployee')

  const hrExportPubCfg = {
    exportPhoto: hrExportCfgExportPhoto,
    exportEmployee: hrExportCfgExportEmployee
  }

  const exportEmployee = hrExportPubCfg && hrExportPubCfg.exportEmployee
  if (exportEmployee) {
    const exportPhoto = hrExportPubCfg && hrExportPubCfg.exportPhoto
    const empPosData = UB.Repository('hr_employeePositionS')
      .attrs(['employeeID', 'organizationID', 'positionID', 'employeeID.firstName', 'employeeID.lastName',
        'employeeID.middleName', 'employeeID.sexType.name', 'employeeID.lastEducationLevelID', 'employeeID.phoneMobile',
        'employeeID.phoneWorking', 'employeeID.email', 'employeeID.photo', 'employeeID.age', 'dateFrom'])
      .where('isActive', '=', true)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .joinCondition('positionID.mi_dateFrom', '<=', onDate)
      .joinCondition('positionID.mi_dateTo', '>=', onDate)
      .joinCondition('positionID.state', '=', 'ACTIVE')
      .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('positionID.positionType', 'notIn', untransefedPosTypes)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('organizationID.parentUnitTypeID.code', '!=', 'non')
      .joinCondition('organizationID.state', '=', 'ACTIVE')
      .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('organizationID.mi_dateFrom', '<=', onDate)
      .joinCondition('organizationID.mi_dateTo', '>=', onDate)
      .joinCondition('organizationID.parentUnitTypeID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    empPosData.forEach(item => {
      item.objectType = 'employee'
      item.parentUnitID = item.positionID
      item.employee_FirstName = item['employeeID.firstName']
      item.employee_LastName = item['employeeID.lastName']
      item.employee_MiddleName = item['employeeID.middleName']
      item.employee_SexType = item['employeeID.sexType.name']
      item.employee_EducationLevel = item['employeeID.lastEducationLevelID']
      item.employee_PhoneMobile = item['employeeID.phoneMobile']
      item.employee_PhoneWorking = item['employeeID.phoneWorking']
      item.employee_Email = item['employeeID.email']
      item.employee_Photo = exportPhoto ? loadDocumentPubLink('hr_employee', 'photo', item.employeeID, item['employeeID.photo']) : null
      item.employee_Age = item['employeeID.age']
      item.employee_ID = item['employeeID']
      if (isReceiveEducation) {
        item.employee_Education = empEduData.filter(o => o.employeeID === item.employeeID)
      }

      let empRankItem = _.find(empRankData, { employeeID: item.employeeID })
      if (empRankItem) {
        item.employee_Rank = empRankItem.dictRankID
      }
      let empExpItem = _.find(empExpData, { employeeID: item.employeeID })
      if (empExpItem) {
        item.employee_Experience = empExpItem.calcDate
      }
      item.employee_AppointedFrom = item.dateFrom
      let empScienceItem = _.find(empScienceData, { employeeID: item.employeeID })
      if (empScienceItem) {
        item.employee_rangeScience = empScienceItem.dictDegreeID
      }
      const doNotTransfer = doNotTransferOrgIDs.includes(item.organizationID)
      if (!doNotTransfer) {
        addMainRecord(mainData, item)
      }
    })
  }

  const mainTable = {
    fields: mainFields,
    data: mainData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(mainTable))
}

function exportPublicData_hr_dictOrganizationBranch_json (onDate, exportPath, fileName) {
  /* hr_dictOrganizationBranch (Гілки влади організації) */
  const orgBranch = UB.Repository('ubm_enum')
    .attrs(enumFields)
    .where('eGroup', '=', 'HR_POWERBRANCH')
    .orderBy('sortOrder')
    .selectAsObject()
  let orgBranchData = []
  orgBranch.forEach(item => {
    orgBranchData.push([item.code, item.name, item.shortName, item.sortOrder])
  })
  let orgBranchTable = {
    fields: enumExpFields,
    data: orgBranchData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(orgBranchTable))
}

function exportPublicData_hr_dictParentUnitType (onDate, exportPath, fileName) {
  /* hr_dictParentUnitType (Тип підпорядкування організації) */
  const dictParentUnitType = UB.Repository('hr_dictParentUnitType')
    .attrs(dictFields)
    .where('code', '!=', 'non')
    .orderBy('code')
    .selectAsObject()
  let dictParentUnitTypeData = []
  dictParentUnitType.forEach(item => {
    dictParentUnitTypeData.push([item.ID, item.code, item.name, item.description])
  })
  let dictParentUnitTypeTable = {
    fields: dictFields,
    data: dictParentUnitTypeData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(dictParentUnitTypeTable))
}

function exportPublicData_hr_dictAreasActivity (onDate, exportPath, fileName) {
  /* hr_dictAreasActivity (Напрям діяльності організації) */
  const areaFields = ['ID', 'code', 'name', 'section']
  const dictAreasActivity = UB.Repository('hr_dictAreasActivity')
    .attrs(areaFields)
    .orderBy('code')
    .selectAsObject()
  let dictAreasActivityData = []
  dictAreasActivity.forEach(item => {
    dictAreasActivityData.push([item.ID, item.code, item.name, item.section])
  })
  let dictAreasActivityTable = {
    fields: areaFields,
    data: dictAreasActivityData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(dictAreasActivityTable))
}

function exportPublicData_cdn_regiontype (onDate, exportPath, fileName) {
  /* cdn_regiontype (Область/район) */
  const regiontype = UB.Repository('cdn_regiontype')
    .attrs(codeNameFields)
    .selectAsObject()
  let regiontypeData = []
  regiontype.forEach(item => {
    regiontypeData.push([item.ID, item.code, item.name])
  })
  let regiontypeTable = {
    fields: codeNameFields,
    data: regiontypeData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(regiontypeTable))
}

/* UBHR-6823 - не передавати cdn_city */
/* function exportPublicData_cdn_city (onDate, exportPath, fileName) {
  // cdn_city (Обласні центри)
  const city = UB.Repository('cdn_city')
    .attrs(codeNameFields)
    .selectAsObject()
  let cityData = []
  city.forEach(item => {
    cityData.push([item.ID, item.code, item.name])
  })
  let cityTable = {
    fields: codeNameFields,
    data: cityData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(cityTable))
} */

function exportPublicData_cdn_region (onDate, exportPath, fileName) {
  /* cdn_region (Область організації) */
  const region = UB.Repository('cdn_region')
    .attrs(['ID', 'parentAdminUnitID', 'code', 'regionTypeID', 'name', 'caption', 'description', 'phoneCode', 'centerID'])
    .where('regionTypeID.code', '=', 'REGION')
    .selectAsObject()
  let regionData = []
  region.forEach(item => {
    regionData.push([item.ID, item.parentAdminUnitID, item.code, item.regionTypeID, item.name, item.caption,
      item.description, item.phoneCode, item.centerID])
  })
  let regionTable = {
    fields: ['ID', 'parentID', 'code', 'regionTypeID', 'name', 'caption', 'description', 'phoneCode', 'cityCenterID'],
    data: regionData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(regionTable))
}

function exportPublicData_hr_dictPositionPsCategory (onDate, exportPath, fileName) {
  /* hr_dictPositionPsCategory (Категорія посади держслужбовця) */
  const psCategory = UB.Repository('ubm_enum')
    .attrs(enumFields)
    .where('eGroup', '=', 'HR_POSITION_PSCATEGORY')
    .orderBy('sortOrder')
    .selectAsObject()
  let psCategoryData = []
  psCategory.forEach(item => {
    psCategoryData.push([item.code, item.name, item.shortName, item.sortOrder])
  })
  let psCategoryTable = {
    fields: enumExpFields,
    data: psCategoryData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(psCategoryTable))
}

function exportPublicData_hr_dictPositionType (onDate, exportPath, fileName) {
  /* hr_dictPositionType (Тип посади) */
  const posType = UB.Repository('ubm_enum')
    .attrs(enumFields)
    .where('eGroup', '=', 'HR_POSITION_TYPE')
    .orderBy('sortOrder')
    .selectAsObject()
  let posTypeData = []
  posType.forEach(item => {
    posTypeData.push([item.code, item.name, item.shortName, item.sortOrder])
  })
  let posTypeTable = {
    fields: enumExpFields,
    data: posTypeData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(posTypeTable))
}

function exportPublicData_hr_dictEducationLevel (onDate, exportPath, fileName) {
  /* hr_dictEducationLevel (Рівень освіти) */
  const eduFields = ['ID', 'code', 'name', 'level']
  const dictEducationLevel = UB.Repository('hr_dictEducationLevel')
    .attrs(eduFields)
    .orderBy('level')
    .orderBy('code')
    .selectAsObject()
  let dictEducationLevelData = []
  dictEducationLevel.forEach(item => {
    dictEducationLevelData.push([item.ID, item.code, item.name, item.level])
  })
  let dictEducationLevelTable = {
    fields: eduFields,
    data: dictEducationLevelData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(dictEducationLevelTable))
}

function exportPublicData_hr_dictRank (onDate, exportPath, fileName) {
  /* hr_dictRank (Ранг працівника) */
  const dictRank = UB.Repository('hr_dictRank')
    .attrs(dictFields)
    .orderBy('code')
    .selectAsObject()
  let dictRankData = []
  dictRank.forEach(item => {
    dictRankData.push([item.ID, item.code, item.name, item.description])
  })
  let dictRankTable = {
    fields: dictFields,
    data: dictRankData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(dictRankTable))
}

function exportPublicData_hr_dictDegree (onDate, exportPath, fileName) {
  /* hr_dictDegree (Наукова ступінь) */
  const dictDegree = UB.Repository('hr_dictDegree')
    .attrs(codeNameFields)
    .selectAsObject()
  let dictDegreeData = []
  dictDegree.forEach(item => {
    dictDegreeData.push([item.ID, item.code, item.name])
  })
  let dictDegreeTable = {
    fields: codeNameFields,
    data: dictDegreeData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(dictDegreeTable))
}

function exportPublicData_ac_portalDoc (onDate, exportPath, fileName) {
  const acPortalDocFields = ['ID', 'code', 'name', 'document']
  const acPortalDoc = UB.Repository('ac_portalDoc')
    .attrs(acPortalDocFields)
    .where('isNotActive', '=', false)
    .orderBy('code')
    .selectAsObject()
  const acPortalDocData = []
  acPortalDoc.forEach(item => {
    const line = acPortalDocFields.map(fieldName => {
      const value = item[fieldName]
      if (fieldName === 'document' && value) {
        const buff = App.blobStores.getContent({
          entity: 'ac_portalDoc',
          attribute: 'document',
          ID: item.ID
        }, { encoding: 'bin' })
        return buff && Buffer.from(buff).toString('base64')
      }
      return value
    })
    acPortalDocData.push(line)
  })
  const acPortalDocTable = {
    fields: acPortalDocFields,
    data: acPortalDocData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(acPortalDocTable))
}

function exportPublicData_ac_portalInfo (onDate, exportPath, fileName) {
  const acPortalInfoFields = ['ID', 'code', 'title', 'titleEng', 'text', 'textEng']
  const acPortalInfo = UB.Repository('ac_portalInfo')
    .attrs(acPortalInfoFields)
    .where('isNotActive', '=', false)
    .orderBy('code')
    .selectAsObject()
  const acPortalInfoData = []
  acPortalInfo.forEach(item => {
    const line = acPortalInfoFields.map(fieldName => {
      const value = item[fieldName]
      if (['text', 'textEng'].includes(fieldName)) {
        return value && value.split(breakLineExpression)
      }
      return value
    })
    acPortalInfoData.push(line)
  })
  const acPortalInfoTable = {
    fields: acPortalInfoFields,
    data: acPortalInfoData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(acPortalInfoTable))
}

function exportPublicData_ac_portalContact (onDate, exportPath, fileName) {
  const acPortalContactFields = ['ID', 'code', 'type', 'value']
  const acPortalContact = UB.Repository('ac_portalContact')
    .attrs(acPortalContactFields)
    .where('isNotActive', '=', false)
    .orderBy('code')
    .selectAsObject()
  const acPortalContactData = []
  acPortalContact.forEach(item => {
    const line = acPortalContactFields.map(fieldName => {
      const value = item[fieldName]
      if (fieldName === 'document') {
        return loadDocumentPubLink('ac_portalContact', 'document', item.ID, value)
      }
      return value
    })
    acPortalContactData.push(line)
  })
  const acPortalContactTable = {
    fields: acPortalContactFields,
    data: acPortalContactData
  }
  fs.writeFileSync(path.join(exportPath, fileName), JSON.stringify(acPortalContactTable))
}

/* Експорт сумарних публічних даних по шедулєру */
function exportPublicData_exportPublicTotals (onDate, exportPath, fileName) {
  const hrExportCfgFillPublicTotals = settingsService.get('hrExportCfgFillPublicTotals')
  if (hrExportCfgFillPublicTotals) {
    let expTotals = UB.Repository('hr_exportTotals')
      .attrs(['orgTotalAll', 'appointPercent', 'refreshCurrentData', 'orgTotal', 'orgTotal01', 'empTotal', 'empTotal01',
        'fillOrgPrc', 'fillOrgPrc01'])
      .selectById(1)
    let orgTotalAll = expTotals && expTotals.orgTotalAll
    let appointPercent = expTotals && expTotals.appointPercent
    let refreshCurrentData = expTotals && expTotals.refreshCurrentData
    publicTotals.fillPublicTotalsInternal({
      onDate: new Date(),
      orgTotalAll,
      appointPercent,
      refreshCurrentData,
      formData: expTotals
    })
  }
  publicTotals.exportPublicTotals(onDate, path.join(exportPath, fileName))
}

function exportPublicData (onDate, exportPath) {
  onDate = (onDate && dateService.shiftDate(onDate)) || new Date()

  exportPublicData_exportPublicTotals(onDate, exportPath, fileNamesToExport.exportPublicData_exportPublicTotals)
  exportPublicData_public_json(onDate, exportPath, fileNamesToExport.exportPublicData_public_json)
  exportPublicData_hr_dictOrganizationBranch_json(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictOrganizationBranch_json)
  exportPublicData_hr_dictParentUnitType(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictParentUnitType)
  exportPublicData_hr_dictAreasActivity(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictAreasActivity)
  exportPublicData_cdn_regiontype(onDate, exportPath, fileNamesToExport.exportPublicData_cdn_regiontype)
  // exportPublicData_cdn_city(onDate, exportPath, fileNamesToExport.exportPublicData_cdn_city)
  exportPublicData_cdn_region(onDate, exportPath, fileNamesToExport.exportPublicData_cdn_region)
  exportPublicData_hr_dictPositionPsCategory(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictPositionPsCategory)
  exportPublicData_hr_dictPositionType(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictPositionType)
  exportPublicData_hr_dictEducationLevel(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictEducationLevel)
  exportPublicData_hr_dictRank(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictRank)
  exportPublicData_hr_dictDegree(onDate, exportPath, fileNamesToExport.exportPublicData_hr_dictDegree)
  exportPublicData_ac_portalDoc(onDate, exportPath, fileNamesToExport.exportPublicData_ac_portalDoc)
  exportPublicData_ac_portalInfo(onDate, exportPath, fileNamesToExport.exportPublicData_ac_portalInfo)
  exportPublicData_ac_portalContact(onDate, exportPath, fileNamesToExport.exportPublicData_ac_portalContact)

  const files = _.map(fileNamesToExport, (objVal) => objVal)
  return {
    path: exportPath,
    filesGroup: filesGroup,
    files: files
  }
}

function uploadPublicData (exportPath, groups, uploadFileName) {
  groups = groups || filesGroup
  const jsonObj = {}
  _.forEach(groups, (group) => {
    for (let i = 0; i < group.length; i++) {
      const fileName = group[i]
      const fileJson = fs.readFileSync(path.join(exportPath, fileName), 'utf8')
      const fileJsonObj = JSON.parse(fileJson)
      jsonObj[fileName.slice(0, -5)] = fileJsonObj
    }
  })
  fs.writeFileSync(path.join(exportPath, uploadFileName), JSON.stringify(jsonObj))
}

function addMainRecord (data, record) {
  let newRecord = []
  mainFields.forEach(field => {
    newRecord.push(record[field] || null)
  })
  data.push(newRecord)
}

function getDocumentHRPub (req, resp) {
  try {
    const querystring = require('querystring')
    const params = querystring.parse(req.parameters)
    const ID = parseInt(params.id || params.ID, 10)
    const entity = params.entity
    const attribute = params.attribute

    if (!allowedPubFileEntity.includes(entity)) {
      throw new UB.UBAbort('deny access')
    }

    let ct = null
    const data = UB.Repository(entity)
      .attrs([attribute])
      .selectById(ID)
    if (data) {
      const val = data[attribute]
      if (val) {
        try {
          const parsed = JSON.parse(val)
          ct = parsed.ct
        } catch (error) {
          console.error(error)
        }
      }
    }

    const buff = App.blobStores.getContent({
      entity: entity,
      attribute: attribute,
      ID: ID
    }, { encoding: 'bin' })

    resp.statusCode = 200
    if (ct) {
      resp.writeHead(`Content-type: ${ct}`)
    }
    resp.writeEnd(buff)
    resp.validateETag()
  } catch (error) {
    console.error('error', error)
    resp.statusCode = 500
    resp.writeEnd(error)
  }
}

App.registerEndpoint('getDocumentHRPub', getDocumentHRPub, false)

function getOrgStructure (onDate, edrpou) {
  onDate = onDate ? dateService.shiftDate(onDate) : dateService.currentDate()
  const resultData = []
  const orgData = UB.Repository('hr_organization')
    .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'fullName', 'EDRPOUCode', 'taxCode', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat'])
    .misc({ __mip_ondate: onDate })
    .where('state', '=', 'ACTIVE')
    .whereIf(edrpou, 'EDRPOUCode', '=', edrpou)
    .orderBy('mi_treePath')
    .selectAsObject()
  orgData.forEach(org => {
    const organization = {
      ID: org.mi_data_id,
      parentID: org.parentUnitID,
      edrpou: org.EDRPOUCode,
      code: org.code,
      name: org.name,
      fullName: org.fullName,
      taxCode: org.taxCode,
      nameGen: org.nameGen,
      nameDat: org.nameDat,
      fullNameGen: org.fullNameGen,
      fullNameDat: org.fullNameDat,
      division: [],
      staff: [],
      person: [],
      appointment: []
    }
    if (organization.ID !== organization.mi_data_id) {
      const orgDate = UB.Repository('hr_organization')
        .attrs(['MIN([mi_dateFrom])', 'MAX([mi_dateTo])'])
        .where('mi_data_id', '=', organization.ID)
        .where('orgID', '=', org.mi_data_id)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_recordhistory_all: true })
        .limit(1)
        .selectSingle()
      organization.startdate = dateService.formatDate(dateService.shiftDate(orgDate['MIN([mi_dateFrom])'] || org.mi_dateFrom))
      organization.enddate = dateService.formatDate(dateService.shiftDate(orgDate['MAX([mi_dateTo])'] || org.mi_dateTo))
    } else {
      organization.startdate = dateService.formatDate(dateService.shiftDate(org.mi_dateFrom))
      organization.enddate = dateService.formatDate(dateService.shiftDate(org.mi_dateTo))
    }
    const deptData = UB.Repository('hr_department')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'fullName', 'mi_dateFrom', 'mi_dateTo', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat'])
      .where('orgID', '=', org.mi_data_id)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_treePath')
      .selectAsObject()
    deptData.forEach(dep => {
      const division = {
        ID: dep.mi_data_id,
        parentID: dep.parentUnitID,
        code: dep.code,
        name: dep.name,
        fullName: dep.fullName,
        nameGen: dep.nameGen,
        nameDat: dep.nameDat,
        fullNameGen: dep.fullNameGen,
        fullNameDat: dep.fullNameDat
      }
      if (dep.ID !== dep.mi_data_id) {
        const depDate = UB.Repository('hr_department')
          .attrs(['MIN([mi_dateFrom])', 'MAX([mi_dateTo])'])
          .where('mi_data_id', '=', dep.mi_data_id)
          .where('orgID', '=', org.mi_data_id)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_recordhistory_all: true })
          .limit(1)
          .selectSingle()
        division.startdate = dateService.formatDate(dateService.shiftDate(depDate['MIN([mi_dateFrom])'] || dep.mi_dateFrom))
        division.enddate = dateService.formatDate(dateService.shiftDate(depDate['MAX([mi_dateTo])'] || dep.mi_dateTo))
      } else {
        division.startdate = dateService.formatDate(dateService.shiftDate(dep.mi_dateFrom))
        division.enddate = dateService.formatDate(dateService.shiftDate(dep.mi_dateTo))
      }
      organization.division.push(division)
    })

    const posData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'fullName', 'mi_dateFrom', 'mi_dateTo', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'isOrgBoss'])
      .where('orgID', '=', org.mi_data_id)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_treePath')
      .selectAsObject()
    posData.forEach(pos => {
      const staff = {
        ID: pos.mi_data_id,
        parentID: pos.parentUnitID,
        code: pos.code,
        name: pos.name,
        fullName: pos.fullName,
        isOrgBoss: pos.isOrgBoss,
        nameGen: pos.nameGen,
        nameDat: pos.nameDat,
        fullNameGen: pos.fullNameGen,
        fullNameDat: pos.fullNameDat
      }
      if (pos.ID !== pos.mi_data_id) {
        const posDate = UB.Repository('hr_position')
          .attrs(['MIN([mi_dateFrom])', 'MAX([mi_dateTo])'])
          .where('mi_data_id', '=', pos.mi_data_id)
          .where('orgID', '=', org.mi_data_id)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_recordhistory_all: true })
          .limit(1)
          .selectSingle()
        staff.startdate = dateService.formatDate(dateService.shiftDate(posDate['MIN([mi_dateFrom])'] || pos.mi_dateFrom))
        staff.enddate = dateService.formatDate(dateService.shiftDate(posDate['MAX([mi_dateTo])'] || pos.mi_dateTo))
      } else {
        staff.startdate = dateService.formatDate(dateService.shiftDate(pos.mi_dateFrom))
        staff.enddate = dateService.formatDate(dateService.shiftDate(pos.mi_dateTo))
      }
      organization.staff.push(staff)
    })
    const employeeData = UB.Repository('hr_employeeNumber')
      .attrs(['ID', 'tabNum', 'employeeID', 'employeeID.taxCode', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName',
        'employeeID.shortFIO', 'employeeID.fullFIO', 'employeeID.birthDate', 'employeeID.sexType'])
      .where('orgID', '=', org.mi_data_id)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    employeeData.forEach(per => {
      const person = {
        ID: per.employeeID,
        tabNum: per.tabNum,
        code: per['employeeID.taxCode'],
        firstName: per['employeeID.firstName'],
        lastName: per['employeeID.lastName'],
        middleName: per['employeeID.middleName'],
        shortFIO: per['employeeID.shortFIO'],
        fullFIO: per['employeeID.fullFIO'],
        birthDate: per['employeeID.birthDate'] ? dateService.formatDate(dateService.unshiftDate(per['employeeID.birthDate'])) : null,
        sexType: (!per['employeeID.sexType'] || per['employeeID.sexType'] === 'N') ? '?' : (per['employeeID.sexType'] === 'W' ? 'F' : 'M')
      }
      organization.person.push(person)
    })
    const employeePositionData = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'employeeID', 'positionID', 'employeeNumberID', 'dateFrom', 'dateTo', 'workPlace'])
      .where('organizationID', '=', org.mi_data_id)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('positionID', 'isNotNull')
      .selectAsObject()
    employeePositionData.forEach(empPos => {
      empPos.dateFrom = dateService.shiftDate(empPos.dateFrom)
      empPos.dateTo = dateService.shiftDate(empPos.dateTo)
      const appointment = {
        appointmentID: empPos.ID,
        personID: empPos.employeeID,
        positionID: empPos.positionID,
        stafftype: empPos.workPlace === '1' ? 'PERMANENT' : empPos.workPlace === '2' ? 'PARTTIME' : empPos.workPlace === '3' ? 'EXTERNALPARTTIME' : 'OUTOFSTATE'
      }
      const employeePositionHist = UB.Repository('hr_employeePosition')
        .attrs(['ID', 'employeeID', 'positionID', 'employeeNumberID', 'dateFrom', 'dateTo'])
        .where('employeeNumberID', '=', empPos.employeeNumberID)
        .where('organizationID', '=', org.mi_data_id)
        .selectAsObject()
      const onDateIdx = employeePositionHist.findIndex(o => o.ID === empPos.ID)
      let i = onDateIdx - 1
      while (i > 0) {
        if (employeePositionHist[i].positionID === appointment.positionID) {
          empPos.dateFrom = dateService.shiftDate(employeePositionHist[i].dateFrom)
        } else {
          i = 0
        }
        i--
      }
      i = onDateIdx + 1
      while (i < employeePositionHist.length) {
        if (employeePositionHist[i].positionID === appointment.positionID) {
          empPos.dateTo = dateService.shiftDate(employeePositionHist[i].dateTo)
        } else {
          i = employeePositionHist.length
        }
        i++
      }
      appointment.startdate = dateService.formatDate(empPos.dateFrom)
      appointment.enddate = dateService.formatDate(empPos.dateTo)

      organization.appointment.push(appointment)
    })

    resultData.push(organization)
  })
  return JSON.stringify(resultData)
}
