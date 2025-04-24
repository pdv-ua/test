const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('loadPosChanges')
me.entity.addMethod('applyChanges')
me.entity.addMethod('cancelChanges')
me.entity.addMethod('clearChanges')

me.loadPosChanges = function (ctx) {
  const execParams = ctx.mParams.execParams
  const onDate = dateService.shiftDate(execParams.onDate)

  const positions = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'departmentID', 'fundTotal', 'name', 'depDescription', 'positionCategory',
      'positionType', 'dictStaffCatID', 'dictStaffSubCatID', 'workScheduleID', 'dictCostTypeID', 'orgID'])
    .where('ID', 'in', JSON.parse(execParams.positions))
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject()

  const store = UB.DataStore(__entityName)

  const curRecords = UB.Repository(__entityName)
    .attrs('ID', 'positionID')
    .where('staffTableID', '=', execParams.staffTableID)
    .where('positionID', 'in', JSON.parse(execParams.positions))
    .selectAsObject()
  curRecords.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })

  positions.forEach(pos => {
    const depMiTreePath = UB.Repository('hr_department')
      .attrs('mi_treePath')
      .where('orgID', '=', pos.orgID)
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', pos.departmentID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .selectScalar()

    const selfStructDep = UB.Repository('hr_department')
      .attrs(['name', 'description', 'mi_data_id'])
      .where('orgID', '=', pos.orgID)
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', 'in', (depMiTreePath || '').split('/').filter(o => o).map(o => parseInt(o)))
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_treePath')
      .selectSingle() || {}

    store.run('insert', {
      execParams: {
        staffTableID: execParams.staffTableID,
        departmentID: pos.departmentID,
        positionID: pos.ID,
        accrualSum: pos.accrualSum || 0,
        fundTotal: pos.fundTotal || 0,
        posName: pos.name,
        depName: pos.depDescription,
        positionCategory: pos.positionCategory,
        positionType: pos.positionType,
        dictStaffCatID: pos.dictStaffCatID,
        dictStaffSubCatID: pos.dictStaffSubCatID,
        workScheduleID: pos.workScheduleID,
        dictCostTypeID: pos.dictCostTypeID,
        selfStructDepID: selfStructDep['mi_data_id'] || null,
        selfStructDepName: selfStructDep['name'] || null
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      posChangesApplied: 0
    }
  })
}

me.applyChanges = function (ctx) {
  const execParams = ctx.mParams.execParams
  const params = JSON.parse(execParams.params) || []
  const posChanges = UB.Repository(__entityName)
    .attrs('ID', 'positionID', 'positionID.mi_data_id', 'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.mi_treePath', 'accrualSum')
    .where('staffTableID', '=', execParams.staffTableID)
    .selectAsObject()
  const store = UB.DataStore('hr_position')
  const entryDate = dateService.shiftDate(execParams.onDate)
  const newParams = {}
  params.forEach(item => {
    newParams[item.name] = item.value
  })
  const posAttrs = [
    ['checkDictSpecialtyID', 'dictSpecialtyID'],
    ['checkDictEmpCategoryID', 'dictEmpCategoryID'],
    ['checkDictTarifCoeffID', 'dictTarifCoeffID'],
    ['checkDictWagePayID', 'dictWagePayID'],
    ['checkPsCategory', 'psCategory'],
    ['checkDictStatePayID', 'dictStatePayID'],
    ['checkReformer', 'reformer'],
    ['checkPositionCategory', 'positionCategory'],
    ['checkDictStaffCatID', 'dictStaffCatID'],
    ['checkDictStaffSubCatID', 'dictStaffSubCatID'],
    ['checkDictPositionKindID', 'dictPositionKindID'],
    ['checkDictPositionGroupID', 'dictPositionGroupID'],
    ['checkWorkScheduleID', 'workScheduleID'],
    ['checkDictCostTypeID', 'dictCostTypeID'],
    ['checkPositionTypeNew', 'positionTypeNew', 'positionType']
  ]
  const posParams = {}
  posAttrs.forEach(attrs => {
    if (newParams[attrs[0]]) {
      posParams[attrs[2] ? attrs[2] : attrs[1] ] = newParams[attrs[1]]
    }
  })
  posChanges.forEach(item => {
    const curPos = UB.Repository('hr_position')
      .attrs('ID')
      .where('mi_data_id', '=', item['positionID.mi_data_id'])
      .where('state', '=', 'NEW')
      .where('staffOrderID', '=', execParams.staffTableID)
      .misc({
        __mip_ondate: entryDate
      })
      .selectSingle()
    if (curPos) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: Object.assign({ ID: curPos.ID }, posParams)
      })
    } else {
      const newID = store.generateID()
      entityBaseService.cloneInstance('hr_position', item.positionID, Object.assign({
        ID: newID,
        mi_data_id: item['positionID.mi_data_id'],
        mi_treePath: item['positionID.mi_treePath'],
        mi_dateFrom: entryDate,
        mi_dateTo: item['positionID.mi_dateTo'],
        state: 'NEW',
        staffOrderID: execParams.staffTableID,
        priorID: item.positionID,
        isSecondaryChanges: 0
      }, posParams), true)
    }
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      posChangesApplied: 1
    }
  })
  storeStaffTable.freeNative()
  store.freeNative()
}

me.cancelChanges = function (ctx) {
  const execParams = ctx.mParams.execParams

  const changedPositions = UB.Repository('hr_position')
    .attrs('ID')
    .where('state', '=', 'NEW')
    .where('staffOrderID', '=', execParams.staffTableID)
    .misc({
      __mip_recordhistory_all: true
    })
    .where('mi_data_id', 'in', UB.Repository(__entityName)
      .attrs('positionID.mi_data_id')
      .where('staffTableID', '=', execParams.staffTableID))
    .selectAsObject()

  const store = UB.DataStore('hr_position')
  changedPositions.forEach(item => {
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      posChangesApplied: 0
    }
  })
  storeStaffTable.freeNative()
  store.freeNative()
}

me.clearChanges = function (ctx) {
  const execParams = ctx.mParams.execParams

  const records = UB.Repository(__entityName)
    .attrs('ID')
    .where('staffTableID', '=', execParams.staffTableID)
    .selectAsObject()

  const store = UB.DataStore(__entityName)
  records.forEach(item => {
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.execSQL(`update hr_staffTable set posChangesApplied = 0 where ID = :ID:`, {
    ID: execParams.staffTableID
  })
  storeStaffTable.freeNative()
  store.freeNative()
}
