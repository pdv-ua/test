const UB = require('@unitybase/ub')
const App = UB.App
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')
const dataService = require('../AC/modules/dataServices/dataService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const entities = App.domainInfo.entities

module.exports = {
  getDataTypes,
  getCatDataHistory
}

me.entity.addMethod('selectHistoryCondition')
me.entity.addMethod('select4emp')
me.entity.addMethod('selectAttr4emp')
me.entity.addMethod('selectCategories4emp')
me.entity.addMethod('selectAttr4person')
me.entity.addMethod('selectCategories4person')
me.entity.addMethod('selectAttr4salary')
me.entity.addMethod('selectCategories4salary')
me.entity.addMethod('selectAttr4pos')
me.entity.addMethod('selectCategories4pos')

/* searchAttrTypes - типи атрибутів, що приймають участь в пошуку */
const searchAttrTypes = ['String', 'Int', 'Float', 'Currency', 'Boolean', 'DateTime', 'Text', 'Entity', 'Enum', 'Date',
  'Document', 'NotExistentEntity']

/* noSearchGlobalAttrs - атрибути, що не входять в список атрибутів для пошуку для любої категорії */
const noSearchGlobalAttrList = ['ID', 'isActive', 'isAuto', 'state', 'orderID',
  'genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName', 'nameNom', 'nameGen', 'nameDat', 'nameAcc',
  'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc',
  'fullNameVoc', 'changedValues', 'paraID', 'itemIdx', 'dateFromEmpty', 'dateToEmpty', 'nextID', 'priorID', 'changeOrderID',
  'maxDateTo', 'treePath'
]

/* noSearchGlobalAttrStartMasks - масив початкової маски атрибутів, що не приймають участь у пошуку для любої категорії */
const noSearchGlobalAttrStartMasks = ['mi_', 'imp']

/* noSearchGlobalAttrs - атрибути, що не будуть приймати участі в пошуку в розрізі категорії */
const noSearchGlobalAttrs = {
  hr_employee: ['tabNum', 'dictEducationLevelID', 'dictTarifCoeffID', 'pensionDocID'],
  hr_employeeNumber: ['workScheduleName', 'tabNumSort'],
  hr_employeeBenefits: ['avgSum', 'catCode', 'birthDate', 'fullFIO', 'taxCode'],
  hr_employeeBonus: ['orderDetID', 'birthDate', 'fullFIO', 'taxCode', ''],
  hr_employeeChange: ['organizationID', 'orderNumberFull', 'genNameOld', 'datNameOld', 'accusativeNameOld', 'insNameOld', 'locNameOld'],
  hr_employeeDisability: ['employeeDocID'],
  hr_employeePosition: ['employeeNumberID', 'posName', 'depName', 'orgName'],
  ac_address: ['addressType', 'taxCode', 'fullFIO', 'birthDate'],
  hr_position: ['changeStaffOrderID', 'parentUnitID', 'dictFundSourceID', 'fundSourcePositionID'],
  hr_department: ['parentUnitID', 'parentName'],
  hr_employeeExperience: ['birthDate', 'fullFIO', 'taxCode'],
  hr_employeeLanguage: ['birthDate', 'fullFIO', 'taxCode'],
  hr_empAcademStatus: ['birthDate', 'fullFIO', 'taxCode', 'academStatusCode', 'specCode', 'yearOf'],
  hr_empStateMilitary: ['birthDate', 'fullFIO', 'taxCode'],
  hr_employeeDocs: ['birthDate', 'fullFIO', 'taxCode'],
  hr_employeeContact: ['birthDate', 'fullFIO', 'taxCode'],
  hr_empRangeScience: ['birthDate', 'fullFIO', 'taxCode', 'theme', 'yearOf', 'degreeCode', 'specCode'],
  hr_employeeEducation: ['birthDate', 'fullFIO', 'taxCode', 'actualCurOrg', 'UNESCO', 'intlCert', 'byStateMoney',
    'byStateDir', 'retraining', 'courseYear', 'specCode', 'accreditationLevel', 'shortEducationName', 'educationLevelCode'],
  hr_empCertificatnUp: ['birthDate', 'fullFIO', 'taxCode'],
  hr_empCertificationAcc: ['birthDate', 'fullFIO', 'taxCode', 'orderAuthorID'],
  hr_publServRang: ['birthDate', 'fullFIO', 'taxCode'],
  hr_empAssessment: ['reportSettings', 'description', 'docText', 'employeeBenefitsID'],
  hr_employeeFamily: ['birthDate', 'fullFIO', 'taxCode'],
  hr_employeePenalty: ['birthDate', 'fullFIO', 'taxCode'],
  hr_employeeVacation: ['organizationID', 'description'],
  hr_empVacationPlan: ['orderDetID', 'description', 'employeeBenefitsID', 'pauseOrderDetID'],
  hr_employeeMission: ['departmentID', 'positionID', 'organizationID', 'employeePositionID', 'employeeNumberID', 'requisites', 'dictTimeCostID'],
  hr_employeeWorkbook: ['birthDate', 'fullFIO', 'taxCode'],
  hr_positionAccrual: ['staffOrderID', 'fullName']
}

/* categoryDataHistory - категорії, в яких застосовується фільтрація по даті */
const categoryDataHistory = {
  // hr_employeeAccrual: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeeBenefits: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeID' },
  // hr_employeeCPH: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeeChange: { onMax: false, dateField: 'orderDate', joinField: 'employeeID' },
  hr_employeeDisability: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeID' },
  hr_employeeEducation: { onMax: true, dateField: 'dateFrom', joinField: 'employeeID' },
  hr_employeeNumber: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeID' },
  // hr_employeePayOut: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeePosition: { onMax: true, dateField: 'dateFrom', joinField: 'employeeNumberID' },
  // hr_employeeTaxLimit: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeeWorkbook: { onMax: true, dateField: 'dateFrom', joinField: 'employeeID' },
  hr_publServRang: { onMax: true, dateField: 'dateFrom', joinField: 'employeeID' },
  // hr_empOrderRanktDet: { onMax: true, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  // hr_empOrderSickness: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeeMission: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_employeeVacation: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_empVacationPlan: { onMax: false, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_empAssessment: { onMax: true, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeNumberID' },
  hr_empCertificatnUp: { onMax: true, dateField: 'dateFrom', joinField: 'employeeID' },
  hr_empCertificatnAcc: { onMax: true, dateField: 'certificationDate', dateToField: 'validityDate', joinField: 'employeeID' },
  hr_personCategory: { onMax: true, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeID' },
  hr_empTarifCategory: { onMax: true, dateField: 'dateFrom', dateToField: 'dateTo', joinField: 'employeeID' },
  hr_empRangeScience: { onMax: true, dateField: 'docDate', joinField: 'employeeID' },
  hr_empAcademStatus: { onMax: true, dateField: 'docDate', joinField: 'employeeID' },
  hr_employeePenalty: { onMax: false, dateField: 'docIssuedDate', joinField: 'employeeID' },
  hr_position: { onMax: true, dateField: 'mi_dateFrom', dateToField: 'mi_dateTo', joinField: 'mi_data_id' },
  hr_department: { onMax: true, dateField: 'mi_dateFrom', dateToField: 'mi_dateTo', joinField: 'mi_data_id' },
  hr_organization: { onMax: true, dateField: 'mi_dateFrom', dateToField: 'mi_dateTo', joinField: 'mi_data_id' }
}

/*****************************************************/
/**                   Base functions                **/
/*****************************************************/

/* categoryGroups - розбивка великих сутностей на групи */
const categoryGroups = {
  hr_employee: {
    'default': 'Загальні дані працівника',
    'civilCommon': 'Загальні дані держслужбовця',
    'addInfo': 'Додаткові дані працівника'
  }
}

/* Загальні атрибути для всіх категорій, які не приймають участі в пошуку */
const noSearchEmployeeAttrList = ['employeeID', 'employeeNumberID']

function getDataTypes () {
  return searchAttrTypes
}

function getCatDataHistory (entityName) {
  return categoryDataHistory[entityName]
}

me.getHistoryCondition = function (entityName) {
  let hasHistory = entityName ? !!(categoryDataHistory[entityName]) : false
  return {
    historyField: hasHistory && categoryDataHistory[entityName].dateField ? categoryDataHistory[entityName].dateField : null,
    historyField2: hasHistory && categoryDataHistory[entityName].dateField2 ? categoryDataHistory[entityName].dateField2 : null,
    historyDateTo: hasHistory && categoryDataHistory[entityName].dateToField ? categoryDataHistory[entityName].dateToField : null,
    historyOnMax: hasHistory && categoryDataHistory[entityName].onMax ? categoryDataHistory[entityName].onMax : false
  }
}

me.selectHistoryCondition = function (ctx) {
  let execParams = ctx.mParams.execParams
  let entity = execParams && execParams.entity ? execParams.entity : ''
  execParams.result = me.getHistoryCondition(entity)
  return true
}

me.getCategoryArray = function ({ catEntity, noGroup = false, fnCheckCategory }) {
  let data = []
  let id = 1
  const categories = global[catEntity].entity.attributes
  let catKeys = Object.keys(categories)
  if (catKeys.length && categories[catKeys[0]].customSettings && categories[catKeys[0]].customSettings.order) {
    catKeys = _.sortBy(catKeys, o => categories[o].customSettings.order)
  }
  for (let i = 0; i < catKeys.length; i++) {
    let personCat = categories[catKeys[i]]
    let categoryCode = personCat.name
    if (personCat) {
      if (fnCheckCategory && !fnCheckCategory(categoryCode)) {
        continue
      }
      let histCond = me.getHistoryCondition(categoryCode)
      let catGroup = categoryGroups[categoryCode]
      if (catGroup && !noGroup) {
        // Додавання груп категорії
        Object.keys(catGroup).forEach(function (groupKey) {
          let groupName = catGroup[groupKey]
          data.push({
            ID: id++,
            categoryCode: categoryCode,
            categoryName: UB.i18n(groupName),
            historyField: histCond.historyField,
            historyField2: histCond.historyField2,
            historyDateTo: histCond.historyDateTo,
            historyOnMax: histCond.historyOnMax,
            groupCode: groupKey
          })
        })
      } else {
        data.push({
          ID: id++,
          categoryCode: categoryCode,
          categoryName: UB.i18n(personCat.caption || ''),
          historyField: histCond.historyField,
          historyField2: histCond.historyField2,
          historyDateTo: histCond.historyDateTo,
          historyOnMax: histCond.historyOnMax,
          groupCode: null
        })
      }
    }
  }
  return data
}

me.getCategoryGroups = function (entity) {
  let res = []
  let entityName = entity.name
  let catGroup = categoryGroups[entityName]
  if (catGroup) {
    Object.keys(catGroup).forEach(function (groupKey) {
      let groupName = catGroup[groupKey]
      res.push({ categoryCode: entityName, groupCode: groupKey, groupName: UB.i18n(groupName) })
    })
  } else {
    res.push({ categoryCode: entityName, groupCode: null, groupName: UB.i18n(entity.caption) })
  }
  return res
}

me.getCategoryAttributes = function (entity, group) {
  let attrs = entity.attributes
  if (!group) return attrs
  let res = {}
  for (let i = 0; i < Object.keys(attrs).length; i++) {
    let attrName = Object.keys(attrs)[i]
    let attr = attrs[attrName]
    let attrGroup = (attr.customSettings) ? attr.customSettings.searchGroup : null
    if (group === 'default') {
      if (!attrGroup) {
        res[attrName] = attr
      }
    } else {
      if (attrGroup === group) {
        res[attrName] = attr
      }
    }
  }
  return res
}

me.getDataArray = function (fnCheckCategory, fnCheckAttr, fnAddCatToAttr, parentCategory, parentGroupCode, noSearchAttrs = noSearchGlobalAttrs) {
  let data = []
  let id = 1
  const notShowSalary = (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin())
  for (let i = 0; i < Object.keys(entities).length; i++) {
    let entity = entities[Object.keys(entities)[i]]
    let entityName = entity.name
    let groups = me.getCategoryGroups(entity)
    // let isCategoryInSearch = false
    groups.forEach(groupObj => {
      let groupCode = groupObj.groupCode
      let isGroupInSearch = fnCheckCategory({ entityName, groupCode })
      if (isGroupInSearch) {
        let attrs = me.getCategoryAttributes(entity, groupCode)
        let attrKeys = Object.keys(attrs)
        for (let j = 0; j < attrKeys.length; j++) {
          let attrName = attrKeys[j]
          let attr = attrs[attrName]
          let dataType = attr.dataType
          if (attr.caption /* filter system sttrs */ && fnCheckAttr({ attrName: attr.name, dataType: dataType })) {
            let useInSearch = !(noSearchAttrs[entityName] && noSearchAttrs[entityName].includes(attr.name)) && !(attr.name === 'accrualSum' && notShowSalary)
            let histCond = me.getHistoryCondition(attr.associatedEntity)
            let mapExpression = attr.mapping && attr.mapping.expression
            data.push({
              ID: id++,
              categoryCode: entityName,
              categoryName: UB.i18n(groupObj.groupName || ''),
              attributeCode: attr.name,
              attributeName: UB.i18n(attr.caption || ''),
              attributeDesc: UB.format('{0} ({1})', UB.i18n(attr.caption), UB.i18n(attr.name)),
              associatedEntity: attr.associatedEntity,
              associationAttr: attr.associationAttr,
              dataType: dataType,
              size: attr.size,
              useInSearch: useInSearch,
              priority: 10,
              historyField: histCond.historyField,
              historyField2: histCond.historyField2,
              historyDateTo: histCond.historyDateTo,
              historyOnMax: histCond.historyOnMax,
              mapExpression: mapExpression,
              parentGroupCode: parentGroupCode,
              groupCode: (attr.customSettings) ? attr.customSettings.searchGroup : null,
              noEntityDetails: (attr.customSettings) ? attr.customSettings.noEntityDetails : null
            })
          }
        }
        // isCategoryInSearch = true
      }
    })
    if (/* isCategoryInSearch && */ fnAddCatToAttr) {
      let addCatCount = fnAddCatToAttr({ data, entityName, id, parentCategory, parentGroupCode })
      id += addCatCount
    }
  }
  return data
}

me.selectCategories = function ({ ctx, catEntity, orderField = 'categoryName', noGroup = false, fnCheckCategory }) {
  let data = me.getCategoryArray({ catEntity: catEntity, noGroup: noGroup, fnCheckCategory })
  if (!ctx.mParams.orderList && orderField) {
    ctx.mParams.orderList = {
      categoryName: {
        expression: orderField,
        order: 'asc'
      }
    }
  }
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  return true
}

me.getDataArray4cat = function ({ categoryCode, searchCardEntity, parentGroupCode, noSearchAttrList = noSearchGlobalAttrList,
  noSearchAttrStartMasks = noSearchGlobalAttrStartMasks, fnCheckCategory, fnAddCatToAttr, parentCategory, noSearchCatAttrList = noSearchEmployeeAttrList }) {
  searchCardEntity = searchCardEntity || 'hr_searchEmpCard'
  return me.getDataArray(function ({ entityName, groupCode }) {
    let catCheck = fnCheckCategory ? fnCheckCategory({ entityName, parentGroupCode, searchCardEntity }) : true
    return catCheck && ((entityName === categoryCode) || _.find(global[searchCardEntity].entity.attributes, { name: entityName })) &&
      (!parentGroupCode || parentGroupCode === groupCode)
  }, function ({ attrName, dataType }) {
    return searchAttrTypes.includes(dataType) && !noSearchAttrList.includes(attrName) &&
      !dataService.isStartWithArray(attrName, noSearchAttrStartMasks) && !noSearchCatAttrList.includes(attrName)
  }, fnAddCatToAttr, parentCategory, parentGroupCode)
}

me.selectAttrs = function ({ ctx, searchCardEntity, fnCheckCategory, fnAddCatToAttr, parentCategory, noSearchCatAttrList, noSearchAttrStartMasks }) {
  searchCardEntity = searchCardEntity || 'hr_searchEmpCard'
  let hasCategoryFilter = (ctx.mParams.whereList && ctx.mParams.whereList.categoryCode)
  let categoryCode = hasCategoryFilter ? ctx.mParams.whereList.categoryCode.values.value : null
  let hasGroupFilter = (ctx.mParams.whereList && ctx.mParams.whereList.parentGroupCode)
  let parentGroupCode = hasGroupFilter ? ctx.mParams.whereList.parentGroupCode.values.value : null
  let data = me.getDataArray4cat({ categoryCode, searchCardEntity, parentGroupCode, fnCheckCategory, fnAddCatToAttr, parentCategory, noSearchCatAttrList, noSearchAttrStartMasks })
  if (hasGroupFilter && !parentGroupCode) delete ctx.mParams.whereList.parentGroupCode
  if (!ctx.mParams.orderList) {
    ctx.mParams.orderList = {
      attributeDesc: {
        expression: 'attributeDesc',
        order: 'asc'
      }
    }
  }
  let fltInSearch = {
    useInSearch: {
      expression: '[useInSearch]',
      condition: 'equal',
      values: {
        value: true
      }
    }
  }
  if (ctx.mParams.whereList) {
    _.merge(ctx.mParams.whereList, fltInSearch)
  } else {
    ctx.mParams.whereList = fltInSearch
  }
  /* ctx.mParams.whereList фільтрує по вибраній категорії (в попередньому контролі ліворуч) */
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  return true
}

/*****************************************************/
/**                  Employee search                **/
/*****************************************************/

me.select4emp = function (ctx) {
  let data = me.getDataArray4cat({ categoryCode: 'hr_employee' })
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  return true
}

me.selectCategories4emp = function (ctx) {
  return me.selectCategories({ ctx: ctx, catEntity: 'hr_searchEmpCard' })
}

me.selectAttr4emp = function (ctx) {
  return me.selectAttrs({ ctx: ctx, searchCardEntity: 'hr_searchEmpCard' })
}

/*****************************************************/
/**                  Person search                  **/
/*****************************************************/

me.selectCategories4person = function (ctx) {
  return me.selectCategories({ ctx: ctx, catEntity: 'hr_searchPersonCard' })
}

me.selectAttr4person = function (ctx) {
  return me.selectAttrs({ ctx: ctx, searchCardEntity: 'hr_searchPersonCard' })
}

/*****************************************************/
/**                  Salary search                  **/
/*****************************************************/

me.selectCategories4salary = function (ctx) {
  return me.selectCategories({ ctx: ctx, catEntity: 'hr_searchEmpSalaryCard' })
}

me.selectAttr4salary = function (ctx) {
  return me.selectAttrs({ ctx: ctx, searchCardEntity: 'hr_searchEmpSalaryCard' })
}

/*****************************************************/
/**                 Position search                 **/
/*****************************************************/

me.selectCategories4pos = function (ctx) {
  const hrSearchOrgMode = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('[constantID.code]', '=', 'hrSearchOrgMode')
    .selectScalar() || 'CURRENT'
  return me.selectCategories({
    ctx: ctx,
    catEntity: 'hr_searchPositionCard',
    orderField: null,
    noGroup: true,
    fnCheckCategory: function (categoryCode) {
      let res = true
      if (categoryCode === 'hr_organization') {
        res = hrSearchOrgMode !== 'CURRENT'
      }
      return res
    }
  })
}

me.selectAttr4pos = function (ctx) {
  let parentCategory = ctx.mParams.parentCategory
  let searchCardEntity = parentCategory === 'hr_employee' ? 'hr_searchEmpCard' : 'hr_searchPositionCard'
  return me.selectAttrs({
    ctx: ctx,
    searchCardEntity: searchCardEntity,
    fnCheckCategory: me.checkPosCategory,
    fnAddCatToAttr: me.addPosCatInAttrList,
    parentCategory: parentCategory,
    noSearchCatAttrList: ['positionID']
  })
}

me.checkPosCategory = function ({ entityName, parentGroupCode, searchCardEntity }) {
  /* Не відображати атрибути категорії "Працівники", якщо це 1-ша категорія */
  return entityName !== 'hr_employee' || parentGroupCode
}

const posEmpCatExlusion = ['hr_employeePosition']

me.addPosCatInAttrList = function ({ data, entityName, id, parentCategory, parentGroupCode }) {
  let res = 0
  if (entityName === 'hr_employee' && !parentGroupCode) {
    let addCat = me.getCategoryArray({ catEntity: 'hr_searchEmpCard' })
    addCat.forEach(item => {
      if (posEmpCatExlusion.includes(item.categoryCode)) {
        return
      }
      let histCond = me.getHistoryCondition(item.categoryCode)
      data.push({
        ID: id++,
        categoryCode: entityName,
        categoryName: UB.i18n('Працівники'),
        attributeCode: 'employeeID',
        attributeName: UB.i18n(item.categoryName),
        attributeDesc: `${UB.i18n(item.categoryName)} (${item.categoryCode})`,
        associatedEntity: item.categoryCode,
        dataType: 'NotExistentEntity',
        size: null,
        useInSearch: true,
        priority: 2,
        historyField: histCond.historyField,
        historyField2: histCond.historyField2,
        historyOnMax: histCond.historyOnMax,
        mapExpression: null,
        parentGroupCode: parentGroupCode,
        groupCode: item.groupCode
      })
      res++
    })
  }
  return res
}
