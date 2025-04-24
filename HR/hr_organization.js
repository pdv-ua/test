const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const staffService = require('../HR/modules/staffService')
const entityService = require('../HR/modules/entityService')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const idParamService = require('../HR/modules/idParamService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('update:after', afterUpdate)

me.entity.addMethod('allowEditOwn')
me.entity.addMethod('allowEditAll')
me.entity.addMethod('getUserOrgIDsArray')

me.allowEditOwn = () => {}
me.allowEditAll = () => {}

global['ac_organization'].on('insert:after', acOrganizationAfterInsert)
global['ac_organization'].on('update:after', acOrganizationAfterUpdate)
global['ac_organization'].on('delete:after', acOrganizationAfterDelete)

function beforeInsert (ctx) {
  const { execParams } = ctx.mParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.limitEmpNum !== undefined) {
    execParams.quantity = execParams.limitEmpNum
  }
  if (execParams.showGlobal === undefined) {
    execParams.showGlobal = 1
  }
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  staffService.checkUniqueBeforeInsert(ctx)
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameEng', 'EDRPOUCode', 'taxCode',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'shortName'
  ])
}

function beforeUpdate (ctx) {
  const { execParams } = ctx.mParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.limitEmpNum !== undefined) {
    execParams.quantity = execParams.limitEmpNum
  }
  ctx.previousValues = previousValues
  entityService.setAttrs(ctx, true, previousValues)
  staffService.checkParentUnit(ctx, previousValues)
  staffService.setAttr(ctx, previousValues)
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'nameEng', 'EDRPOUCode', 'taxCode',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'shortName'
  ])
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('state') !== 'NEW') {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити діючу організацію.')}>>>`)
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
  if (instanceData.ID === instanceData.mi_data_id) {
    const organization = UB.Repository('ac_organization').attrs(['ID']).where('ID', '=', instanceData.mi_data_id).limit(1).selectSingle()
    if (organization) {
      const store = UB.DataStore('ac_organization')
      store.run('delete', {
        isImportOperation: true,
        __skipOptimisticLock: true,
        entity: 'ac_organization',
        execParams: { ID: organization.ID }
      })
    }
  }
}

function afterUpdate (ctx) {
  const previousValues = ctx.previousValues || {}
  const { execParams } = ctx.mParams
  if (previousValues.state === 'ACTIVE' && (!execParams.state || execParams.state === 'NEW') && !ctx.mParams.isImportOperation) {
    const orgBuilder = UB.Repository('hr_organization')
      .attrs(['ID', 'name', 'priorID', 'mi_dateTo', 'mi_data_id', 'code', 'EDRPOUCode', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen',
        'fullNameDat', 'description', 'parentUnitID', 'liquidate', 'hkved', 'ECBCode', 'hkvedS', 'hkoatuu', 'hkoatuuS',
        'hkopfg', 'hkopfgS', 'hkou', 'hkouS', 'dgoznNpr', 'kpol', 'riv', 'decisionDate', 'decisionNumber',
        'dictDksuID', 'dictSprStiID', 'classRisk', 'hkatottg', 'orgID', 'state', 'showGlobal'
      ])
      .misc({ __mip_recordhistory_all: true })
      .selectById(execParams.ID)
    orderService.updateOrganization(orgBuilder)
  }
}

function acOrganizationAfterInsert (ctx) {
  if (!ctx.mParams.isImportOperation) {
    const orgBuilder = UB.Repository('ac_organization')
      .attrs(['ID', 'parentID', 'name', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description',
        'OKPOCode', 'ECBCode', 'hkved', 'hkvedS', 'hkoatuu', 'hkoatuuS', 'hkopfg', 'hkopfgS', 'hkou', 'hkouS',
        'dgoznNpr', 'kpol', 'riv', 'decisionDate', 'decisionNumber', 'dictDksuID', 'dictSprStiID', 'classRisk', 'hkatottg', 'showGlobal'])
      .selectById(ctx.mParams.execParams.ID)
    createOrganization(orgBuilder)
  }
}
function acOrganizationAfterUpdate (ctx) {
  if (!ctx.mParams.isImportOperation) {
    const hrBuilder = UB.Repository('hr_organization')
      .attrs(['ID', 'mi_data_id', 'mi_dateFrom', 'mi_dateTo'])
      .where('mi_data_id', '=', ctx.mParams.execParams.ID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_recordhistory_all: true })
      .orderByDesc('mi_dateTo')
      .selectSingle()
    const orgBuilder = UB.Repository('ac_organization')
      .attrs(['ID', 'parentID', 'name', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description',
        'OKPOCode', 'ECBCode', 'hkved', 'hkvedS', 'hkoatuu', 'hkoatuuS', 'hkopfg', 'hkou', 'hkouS',
        'dgoznNpr', 'kpol', 'riv', 'decisionDate', 'decisionNumber', 'dictDksuID', 'dictSprStiID', 'classRisk', 'hkatottg', 'showGlobal'])
      .selectById(ctx.mParams.execParams.ID)
    if (hrBuilder) {
      updateOrganization(hrBuilder, orgBuilder, ctx)
    } else {
      createOrganization(orgBuilder)
    }
  }
}
function acOrganizationAfterDelete (ctx) {
  if (!ctx.mParams.isImportOperation) {

  }
}

function createOrganization (orgBuilder) {
  const staffOrder = UB.DataStore('hr_staffOrder')
  const orgStore = UB.DataStore('hr_organization')
  const orderID = staffOrder.generateID()
  const onDate = dateService.shiftDate('2010-01-01')
  staffOrder.run('insert', {
    __skipOptimisticLock: true,
    execParams: {
      ID: orderID,
      orderState: 'POSTED',
      orderDate: onDate,
      entryDate: onDate,
      isImportOrder: 1,
      textOrder: UB.i18n(`Створення організації {0}`, orgBuilder.name)
    }
  })
  if (orgBuilder.parentID) {
    const parentID = UB.Repository('hr_staffUnit')
      .attrs(['ID']).selectById(orgBuilder.parentID)
    if (!parentID) {
      orgBuilder.parentID = null
    }
  }
  orgBuilder.mi_data_id = orgBuilder.ID
  orgBuilder.orgID = orgBuilder.ID
  orgBuilder.parentUnitID = orgBuilder.parentID
  orgBuilder.staffOrderID = orderID
  orgBuilder.mi_dateFrom = onDate
  orgBuilder.state = 'ACTIVE'
  orgBuilder.EDRPOUCode = orgBuilder.OKPOCode
  orgBuilder.code = orgBuilder.OKPOCode

  delete orgBuilder.parentID
  delete orgBuilder.OKPOCode

  orgStore.run('insert', {
    isImportOperation: true,
    execParams: orgBuilder
  })
  periodService.createPeriod({
    orgID: orgBuilder.mi_data_id,
    onDate: dateService.currentDate(),
    setCurrent: true
  })
  idParamService.insertDefaultData(orgBuilder.mi_data_id)
}
function updateOrganization (hrBuilder, orgBuilder, ctx) {
  const orgStore = UB.DataStore('hr_organization')
  if (ctx.mParams.execParams.parentID === null) {
    orgBuilder.parentUnitID = null
  } else if (ctx.mParams.execParams.parentID) {
    const parentID = UB.Repository('hr_staffUnit')
      .attrs(['ID']).selectById(orgBuilder.parentID)
    orgBuilder.parentUnitID = parentID ? parentID.ID : null
  }
  orgBuilder.ID = hrBuilder.ID
  orgBuilder.EDRPOUCode = orgBuilder.OKPOCode

  delete orgBuilder.parentID
  delete orgBuilder.OKPOCode

  orgStore.run('update', {
    isImportOperation: true,
    __skipOptimisticLock: true,
    execParams: orgBuilder
  })
}

/* Отримати масив доступних користувачу організацій
 * @param {object} ctx
 * @return {Array} ctx.mParams.result: масив mi_data_id доступних користувачу організацій */
me.getUserOrgIDsArray = function (ctx) {
  const mParams = ctx.mParams
  mParams.result = global.ac_userOrganization.getUserOrgIDsArray()
}
