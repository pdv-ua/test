const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const staffService = require('../HR/modules/staffService')
const entityService = require('../HR/modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')
const nameCaseService = require('../HR/modules/nameCaseService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('update:after', afterUpdate)

me.entity.addMethod('getPosCount')
me.entity.addMethod('recalcCases')
me.entity.addMethod('getWithQuantityFact')
me.entity.addMethod('editBorderQuantity')
me.entity.addMethod('newVersionDepartment')

const attrsToCopy = ['mi_data_id', 'orgID', 'code', 'idxNum', 'name', 'fullName', 'parentUnitID', 'dictDepTypeID',
  'departmentKindID', 'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom',
  'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'quantity', 'quantityLead',
  'excludeNameInPos', 'positionChiefID', 'employeeChiefID', 'curatorID']

function beforeInsert (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if ((ctx.mParams.isDirectCreate || ctx.mParams.isSalaryOperation) && !ctx.mParams.execParams.staffOrderID) {
    createStaffOrder(ctx)
    orderService.updateDepartment(execParams)
  }
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  staffService.checkUniqueBeforeInsert(ctx)
  if (ctx.mParams.execParams.liquidate) {
    ctx.mParams.execParams.isSecondaryChanges = 0
  } else if (ctx.mParams.execParams.isSecondaryChanges === undefined || ctx.mParams.execParams.isSecondaryChanges === null) {
    ctx.mParams.execParams.isSecondaryChanges = 1
  }
  if (execParams.code) {
    let codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameEng', 'caption',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen',
    'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc'
  ])
}

function afterInsert (ctx) {
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  if (ctx.mParams.recalcCases) {
    const onDate = instanceData.state === 'NEW' ? (instanceData['staffOrderID.entryDate'] || instanceData['mi_dateFrom']) : dateService.currentDate()
    let staffOrderID = instanceData.state === 'NEW' ? instanceData.staffOrderID : null
    if (staffOrderID) {
      const order = UB.Repository('hr_order').attrs('orderState').selectById(staffOrderID)
      if (!order || order.orderState === 'POSTED') staffOrderID = null
    }
    setCasesChild(instanceData, dateService.shiftDate(onDate), staffOrderID, null)
  }
}

function createStaffOrder (ctx) {
  const execParams = ctx.mParams.execParams
  const orderUnityStore = UB.DataStore('hr_order')
  orderUnityStore.run('insert', {
    execParams: {
      ID: execParams.ID,
      orderDate: execParams.mi_dateFrom,
      orderState: 'POSTED',
      entryDate: execParams.mi_dateFrom,
      organizationID: execParams.orgID || null
    }
  })
  execParams.staffOrderID = execParams.ID
}

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  ctx.previousValues = previousValues
  if (ctx.mParams.execParams.liquidate) {
    ctx.mParams.execParams.isSecondaryChanges = 0
  }
  if (execParams.code) {
    let codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameEng', 'caption',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen',
    'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc'
  ])
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('ID') !== instanceData.get('staffOrderID')) {
    if (instanceData.get('state') !== 'NEW') {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити діючий підрозділ.')}>>>`)
    }
    const orgUnits = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'state', 'mi_dateFrom', 'mi_dateTo', 'staffOrderID', 'mi_unityEntity', 'liquidate', 'mi_treePath',
        'mi_data_id'])
      .where('orgID', '=', instanceData.get('orgID'))
      .where('mi_treePath', 'startsWith', instanceData.get('mi_treePath'))
      .where('state', '=', 'NEW')
      .where('staffOrderID', '=', instanceData.get('staffOrderID'))
      .where('ID', '!=', instanceData.get('ID'))
      .misc({ __mip_recordhistory_all: true })
      .orderByDesc('mi_treePath')
      .selectAsObject()
    orgUnits.forEach(row => {
      const store = UB.DataStore(row.mi_unityEntity)
      if (row.state === 'NEW') {
        store.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      }
    })
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.previousValues && ctx.previousValues.name !== execParams.name && execParams.state === 'ACTIVE' && (ctx.previousValues.state === 'ACTIVE' || ctx.previousValues.state === 'NEW')) {
    // update hr_employeePosition
    const curDate = new Date()
    UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('dateFrom', '<=', curDate)
      .where('dateTo', '>=', curDate)
      .where('departmentID', '=', execParams.mi_data_id || ctx.previousValues.mi_data_id)
      .selectAsObject()
      .forEach((item) => {
        UB.DataStore('hr_employeePosition').run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: item.ID,
            description: null
          }
        })
      })
  }
  if (ctx.mParams.isSalaryOperation && !ctx.mParams.execParams.staffOrderID) {
    orderService.updateDepartment(UB.Repository('hr_department').attrs(['*']).selectById(execParams.ID))
  }
}

me.getPosCount = ctx => {
  const onDate = ctx.mParams.onDate ? dateService.shiftDate(ctx.mParams.onDate) : dateService.currentDate()
  const dictFundSourceID = ctx.mParams.dictFundSourceID
  const staffOrderID = ctx.mParams.staffOrderID
  const items = ctx.mParams.items ? JSON.parse(ctx.mParams.items) : null

  let itemID = ctx.mParams.ID
  let departmentID = ctx.mParams.departmentID
  if (items && Array.isArray(items) && items.length) {
    const depQuantity = UB.Repository(__entityName)
      .attrs(['ID', 'mi_data_id', 'quantity'])
      .misc({ __mip_recordhistory_all: true })
      .where('ID', 'in', items.map(o => o.ID))
      .selectAsObject()
    let posCount = []
    if (dictFundSourceID) {
      const posQuery = UB.Repository('hr_position')
        .attrs('ID')
        .where('parentUnitID', 'in', items.map(o => o.departmentID))
        .where('state', '=', 'ACTIVE', 'active')
        .where('mi_dateFrom', 'lessEqual', onDate)
        .where('mi_dateTo', 'moreEqual', onDate)
        .where('liquidate', '=', 0)
        .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
        .misc({ __mip_recordhistory_all: true })
      if (staffOrderID) {
        posQuery.notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', staffOrderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        posQuery.logic('(([active] AND [notExist]) or [order])')
      }
      posCount = UB.Repository('hr_positionFundSource')
        .attrs(['positionID.parentUnitID', 'SUM([quantity])'])
        .where('positionID', 'in', posQuery)
        .where('dictFundSourceID', '=', dictFundSourceID)
        .groupBy('positionID.parentUnitID')
        .selectAsObject({
          'SUM([quantity])': 'posCount',
          'positionID.parentUnitID': 'parentUnitID'
        })
    } else {
      const posCountQuery = UB.Repository('hr_position')
        .attrs('parentUnitID', 'SUM([quantity])')
        .where('parentUnitID', 'in', items.map(o => o.departmentID))
        .where('state', '=', 'ACTIVE', 'active')
        .where('mi_dateFrom', 'lessEqual', onDate)
        .where('mi_dateTo', 'moreEqual', onDate)
        .where('liquidate', '=', 0)
        .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
      if (staffOrderID) {
        posCountQuery.notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', staffOrderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        posCountQuery.logic('(([active] AND [notExist]) or [order])')
      }
      posCount = posCountQuery
        .misc({ __mip_recordhistory_all: true })
        .groupBy('parentUnitID')
        .selectAsObject({
          'SUM([quantity])': 'posCount'
        })
    }
    depQuantity.forEach(row => {
      const pos = posCount.find(o => o.parentUnitID === row['mi_data_id'])
      row.posCount = pos ? pos.posCount : 0
    })
    ctx.mParams.result = JSON.stringify(depQuantity)
  } else {
    const department = UB.Repository(__entityName).attrs(['quantity']).misc({ __mip_recordhistory_all: true }).selectById(itemID)

    if (dictFundSourceID) {
      const posQuery = UB.Repository('hr_position')
        .attrs('ID')
        .where('parentUnitID', '=', departmentID)
        .where('state', '=', 'ACTIVE', 'active')
        .where('mi_dateFrom', 'lessEqual', onDate)
        .where('mi_dateTo', 'moreEqual', onDate)
        .where('liquidate', '=', 0)
        .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
        .misc({ __mip_recordhistory_all: true })
      if (staffOrderID) {
        posQuery.notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', staffOrderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        posQuery.logic('(([active] AND [notExist]) or [order])')
      }
      ctx.mParams.posCount = UB.Repository('hr_positionFundSource')
        .attrs(['SUM([quantity])'])
        .where('positionID', 'in', posQuery)
        .where('dictFundSourceID', '=', dictFundSourceID)
        .misc({ __mip_recordhistory_all: true })
        .selectScalar() || 0
    } else {
      const posCountQuery = UB.Repository('hr_position')
        .attrs('sum([quantity])')
        .where('parentUnitID', '=', departmentID)
        .where('state', '=', 'ACTIVE', 'active')
        .where('mi_dateFrom', 'lessEqual', onDate)
        .where('mi_dateTo', 'moreEqual', onDate)
        .where('liquidate', '=', 0)
        .whereIf(dictFundSourceID, 'dictFundSourceID', '=', dictFundSourceID)
        .whereIf(staffOrderID, 'staffOrderID', '=', staffOrderID, 'order')
      if (staffOrderID) {
        posCountQuery.notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', staffOrderID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        posCountQuery.logic('(([active] AND [notExist]) or [order])')
      }
      ctx.mParams.posCount = posCountQuery
        .misc({ __mip_recordhistory_all: true })
        .selectScalar() || 0
    }
    ctx.mParams.depQuantity = department ? department.quantity || 0 : 0
  }
}

const log = []

me.recalcCases = ctx => {
  const { ID, name, withChild, orgStructureID, onlyPosWithChild } = ctx.mParams
  let staffOrderID = ctx.mParams.staffOrderID || null
  if (staffOrderID) {
    const order = UB.Repository('hr_order').attrs('orderState').selectById(staffOrderID)
    if (!order || order.orderState === 'POSTED') staffOrderID = null
  }
  if (withChild || onlyPosWithChild) {
    setCasesChild(ctx.mParams, dateService.shiftDate(ctx.mParams.onDate), staffOrderID, orgStructureID, ctx.mParams.onlyPos, onlyPosWithChild)
  } else {
    setCasesDepartment(ID, name)
  }
  ctx.mParams.log = JSON.stringify(log)
}

function setCasesChild (node, onDate, staffOrderID, orgStructureID, onlyPos, onlyPosWithChild) {
  let childrenQuery = UB.Repository('hr_staffUnit')
    .attrs(['ID', 'name', 'mi_data_id', 'staffOrderID', 'mi_treePath', 'mi_unityEntity', 'state', 'description', 'mi_dateTo'])
    .where('parentUnitID', '=', node.mi_data_id)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('liquidate', '=', 0, 'liqu')
    .where('staffOrderID', '=', staffOrderID, 'order')
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffOrderID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')

  if (orgStructureID) {
    childrenQuery.notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', orgStructureID)
      .where('liquidate', '=', 1)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExistOrgStruct')
    childrenQuery.logic('(([active] and [liqu] and [notExist] and [notExistOrgStruct] and [dateFrom] and [dateTo]) or ([order]))')
  } else {
    childrenQuery.logic('(([active] and [liqu] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
  }

  const children = childrenQuery.selectAsObject()
  children.forEach(node => {
    if (staffOrderID && node.staffOrderID !== staffOrderID) {
      if (node.state === 'ACTIVE' && !children.find(o => (o.state === 'NEW' && o.mi_data_id === node.mi_data_id &&
          o.staffOrderID === staffOrderID))) {
        const store = UB.DataStore(node.mi_unityEntity)
        const newID = store.generateID()
        entityBaseService.cloneInstance(node.mi_unityEntity, node.ID, {
          ID: newID,
          mi_data_id: node.mi_data_id,
          mi_treePath: node.mi_treePath,
          mi_dateFrom: onDate,
          mi_dateTo: node.mi_dateTo,
          state: 'NEW',
          staffOrderID: staffOrderID,
          priorID: node.ID
        }, true)
        node.ID = newID
        store.freeNative()
      }
    }

    if (onlyPosWithChild) {
      if (node.mi_unityEntity === 'hr_department') {
        setCasesChild(node, onDate, staffOrderID, orgStructureID = null, onlyPos = false, true)
      }
      if (node.mi_unityEntity === 'hr_position') {
        setCasesPosition(node.ID, onDate, staffOrderID)
      }
    } else {
      if (node.mi_unityEntity === 'hr_department') {
        if (!onlyPos) {
          setCasesDepartment(node.ID, node.name) // @TODO не удалять
        }
        setCasesChild(node, onDate, staffOrderID)
      }
      if (node.mi_unityEntity === 'hr_position') {
        setCasesPosition(node.ID, onDate, staffOrderID)
      }
    }
  })
}

function setCasesDepartment (ID, name) {
  const parentType = UB.Repository('hr_department')
    .attrs('parentUnitID.mi_unityEntity')
    .selectById(ID)

  const storeDepartment = UB.DataStore('hr_department')
  const cases = UB.Repository('hr_dictCases')
    .attrs('*')
    .selectAsObject()

  const newCases = {
    nameNom: name,
    nameGen: name,
    nameDat: name,
    nameAcc: name,
    nameOr: name,
    nameLoc: name,
    nameVoc: name
  }
  cases.forEach(item => {
    const reg = new RegExp(`^${item.name}`, 'i')
    if (name.match(reg)) {
      newCases.nameNom = item.nameNom ? name.replace(reg, item.nameNom) : ''
      newCases.nameGen = item.nameGen ? name.replace(reg, item.nameGen) : ''
      newCases.nameDat = item.nameDat ? name.replace(reg, item.nameDat) : ''
      newCases.nameAcc = item.nameAcc ? name.replace(reg, item.nameAcc) : ''
      newCases.nameOr = item.nameOr ? name.replace(reg, item.nameOr) : ''
      newCases.nameLoc = item.nameLoc ? name.replace(reg, item.nameLoc) : ''
      newCases.nameVoc = item.nameVoc ? name.replace(reg, item.nameVoc) : ''
    }
  })

  storeDepartment.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID,
      nameNom: firstLevelToUp(parentType, newCases.nameNom),
      nameGen: firstLevelToUp(parentType, newCases.nameGen),
      nameDat: firstLevelToUp(parentType, newCases.nameDat),
      nameAcc: firstLevelToUp(parentType, newCases.nameAcc),
      nameOr: firstLevelToUp(parentType, newCases.nameOr),
      nameLoc: firstLevelToUp(parentType, newCases.nameLoc),
      nameVoc: firstLevelToUp(parentType, newCases.nameVoc)
    }
  })
}

function firstLevelToUp (type = [], str) {
  if (!str) return false
  return type['parentUnitID.mi_unityEntity'] === 'hr_organization' ? str[0].toUpperCase() + str.slice(1) : str[0].toLowerCase() + str.slice(1)
}

function setCasesPosition (positionID, onDate, staffOrderID) {
  const pos = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'dictPositionID', 'orgID', 'parentUnitID', 'nameAddition', 'description', 'state',
      'dictPositionID.nameNom', 'dictPositionID.name'])
    .misc({
      __mip_recordhistory_all: true
    }).selectById(positionID)

  if (!pos.dictPositionID) {
    return
  }
  const newCases = nameCaseService.getPositionNameCases(pos.dictPositionID, onDate, pos.orgID, pos.parentUnitID, staffOrderID, pos.nameAddition)

  const storePosition = UB.DataStore('hr_position')
  const maxNameLength = entityService.getFieldSize(storePosition, 'nameNom') || 256
  const maxFullNameLength = entityService.getFieldSize(storePosition, 'fullNameNom') || 500

  newCases.fullName = nameCaseService.getPositionFullName(pos.dictPositionID, onDate, pos.orgID, pos.parentUnitID, staffOrderID, pos.nameAddition)
  newCases.name = pos.name
  if (pos.nameAddition) {
    newCases.name = nameCaseService.capitalize(pos['dictPositionID.nameNom'] || pos['dictPositionID.name']) + ' ' + pos.nameAddition || ''
  }
  log.push({ description: pos.description, state: pos.state, cases: newCases })

  storePosition.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: positionID,
      name: newCases.name.substr(0, maxNameLength),
      nameNom: newCases.nameNom.substr(0, maxNameLength),
      nameGen: newCases.nameGen.substr(0, maxNameLength),
      nameDat: newCases.nameDat.substr(0, maxNameLength),
      nameAcc: newCases.nameAcc.substr(0, maxNameLength),
      nameOr: newCases.nameOr.substr(0, maxNameLength),
      nameLoc: newCases.nameLoc.substr(0, maxNameLength),
      nameVoc: newCases.nameVoc.substr(0, maxNameLength),
      fullName: newCases.fullName.substr(0, maxFullNameLength),
      fullNameNom: newCases.fullNameNom.substr(0, maxFullNameLength),
      fullNameAcc: newCases.fullNameAcc.substr(0, maxFullNameLength),
      fullNameGen: newCases.fullNameGen.substr(0, maxFullNameLength),
      fullNameDat: newCases.fullNameDat.substr(0, maxFullNameLength),
      fullNameOr: newCases.fullNameOr.substr(0, maxFullNameLength),
      fullNameLoc: newCases.fullNameLoc.substr(0, maxFullNameLength),
      fullNameVoc: newCases.fullNameVoc.substr(0, maxFullNameLength)
    }
  })
}

me.getWithQuantityFact = ctx => {
  let mParams = ctx.mParams

  let store = UB.DataStore('hr_department')
  store.runSQL(` SELECT dep.ID "ID", dep.quantity, dep.idxNum "idxNum", A02.code AS "dictDepTypeID.code", A03.code AS "departmentKindID.code",
 (select sum(p.quantity) from hr_position p 
where p.parentUnitID = dep.mi_data_id and p.state = 'ACTIVE' and p.liquidate = 0 
and p.mi_dateFrom <= :onDate: and p.mi_dateTo >= :onDate: and p.mi_deleteDate >= '9999-12-31') as "quantityFact"
FROM hr_department dep 
LEFT JOIN hr_dictDepType A02 ON A02.ID=dep.dictDepTypeID  
LEFT JOIN hr_departmentKind A03 ON A03.ID=dep.departmentKindID
WHERE dep.state='ACTIVE' AND dep.orgID=:orgID: AND (:onDate: BETWEEN dep.mi_dateFrom AND dep.mi_dateTo) AND dep.mi_deleteDate>='9999-12-31'
 `,
  {
    orgID: mParams.orgID,
    onDate: mParams.onDate
  })
  let empData = store.getAsJsObject()
  store.freeNative()

  ctx.mParams.resultData = JSON.stringify(empData)
}

me.editBorderQuantity = () => {}

/**
 * Нова версія підрозділа
 * @param {object} ctx
 * @param {number} ctx.sourceID підрозділ
 * @param {date} ctx.onDate з дати
 * @param {object} ctx.attrValues значення
 * @param {number} ctx.staffOrderID наказ
 */
me.newVersionDepartment = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.sourceID) return
  const store = UB.DataStore('hr_department')
  const sourcePosition = UB.Repository('hr_department')
    .attrs(attrsToCopy)
    .selectById(mParams.sourceID)
  const onDate = dateService.shiftDate(mParams.onDate) || dateService.currentDate()
  sourcePosition.mi_dateFrom = onDate
  sourcePosition.staffOrderID = mParams.staffOrderID
  sourcePosition.priorID = mParams.sourceID
  mParams.newID = store.generateID()
  sourcePosition.ID = mParams.newID
  store.run('insert', { execParams: Object.assign(sourcePosition, mParams.attrValues ? JSON.parse(mParams.attrValues) : {}) })
}
