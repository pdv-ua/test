const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeUpdate)

me.entity.addMethod('fillChanges')
me.entity.addMethod('applyChanges')
me.entity.addMethod('cancelChanges')
me.entity.addMethod('clearChanges')

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  let instanceData = ctx.dataStore.getAsJsObject()[0] || null
  if (execParams.valueNew || execParams.valuation) {
    if (!instanceData) {
      instanceData = UB.Repository(__entityName)
        .attrs('staffTableID')
        .selectById(execParams.ID)
    }
    const storeStaffTable = UB.DataStore('hr_staffTable')
    storeStaffTable.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: instanceData.staffTableID,
        accrualChangesApplied: 0
      }
    })
  }
}

me.fillChanges = function (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore(__entityName)

  const action = execParams.action
  if (action === 'CANCEL') {
    const accruals = UB.Repository('hr_positionAccrual')
      .attrs(['ID', 'positionID', 'accrualSum', 'accrualRate', 'positionID.departmentID', 'positionID.name',
        'positionID.depDescription', 'positionID.positionCategory', 'positionID.positionType', 'positionID.dictStaffCatID',
        'positionID.dictFundSourceID'])
      .where('positionID', 'in', JSON.parse(execParams.positions))
      .where('payElID', '=', execParams.payElID)
      .selectAsObject({
        'positionID.departmentID': 'departmentID',
        'positionID.name': 'posName',
        'positionID.depDescription': 'depName',
        'positionID.positionCategory': 'positionCategory',
        'positionID.positionType': 'positionType',
        'positionID.dictStaffCatID': 'dictStaffCatID',
        'positionID.dictFundSourceID': 'dictFundSourceID'
      })
    const curRecords = UB.Repository(__entityName)
      .attrs('ID', 'positionID')
      .where('staffTableID', '=', execParams.staffTableID)
      .where('action', '=', 'CANCEL')
      .where('payElID', '=', execParams.payElID)
      .selectAsObject()

    curRecords.forEach(row => {
      if (execParams.isDelete || accruals.find(o => o.positionID === row.positionID)) {
        store.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      }
    })
    accruals.forEach(acc => {
      store.run('insert', {
        execParams: {
          staffTableID: execParams.staffTableID,
          action: 'CANCEL',
          departmentID: acc.departmentID,
          positionID: acc.positionID,
          payElID: execParams.payElID,
          posName: acc.posName,
          depName: acc.depName,
          valueOld: acc ? (acc.accrualSum || acc.accrualRate) : null,
          valuationOld: acc ? (acc.accrualSum ? 'SUM' : (acc.accrualRate ? 'PRC' : null)) : null,
          positionCategory: acc.positionCategory,
          positionType: acc.positionType,
          dictStaffCatID: acc.dictStaffCatID,
          dictFundSourceID: acc.dictFundSourceID
        }
      })
    })
  }
  if (action === 'CREATE' || action === 'CHANGE') {
    const positions = UB.Repository('hr_position')
      .attrs(['ID', 'departmentID', 'name', 'depDescription', 'positionCategory',
        'positionType', 'dictStaffCatID', 'dictFundSourceID'])
      .where('ID', 'in', JSON.parse(execParams.positions))
      .misc({
        __mip_recordhistory_all: true
      })
      .selectAsObject()

    const curRecords = UB.Repository(__entityName)
      .attrs('ID', 'positionID', 'payElID')
      .where('staffTableID', '=', execParams.staffTableID)
      .where('payElID', '=', execParams.payElID)
      .where('action', '=', 'CREATE')
      .selectAsObject()

    curRecords.forEach(row => {
      if (execParams.isDelete || positions.find(o => o.positionID === row.positionID)) {
        store.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      }
    })

    const posAccruals = UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'payElID', 'accrualSum', 'accrualRate'])
      .where('positionID', 'in', positions.length ? positions.map(o => o.ID) : [0])
      .selectAsObject()

    positions.forEach(pos => {
      const acc = posAccruals.find(o => o.positionID === pos.ID && o.payElID === execParams.payElID)
      store.run('insert', {
        execParams: {
          staffTableID: execParams.staffTableID,
          action,
          departmentID: pos.departmentID,
          positionID: pos.ID,
          valuation: execParams.valuation,
          valueNew: execParams.value,
          valueOld: acc ? (acc.accrualSum || acc.accrualRate) : null,
          valuationOld: acc ? (acc.accrualSum ? 'SUM' : (acc.accrualRate ? 'PRC' : null)) : null,
          payElID: execParams.payElID,
          posName: pos.name,
          depName: pos.depDescription,
          positionCategory: pos.positionCategory,
          positionType: pos.positionType,
          dictStaffCatID: pos.dictStaffCatID,
          dictFundSourceID: pos.dictFundSourceID
        }
      })
    })
  }
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      accrualChangesApplied: 0
    }
  })
}

me.applyChanges = function (ctx) {
  const execParams = ctx.mParams.execParams
  const salaryChanges = UB.Repository(__entityName)
    .attrs(['ID', 'positionID', 'positionID.mi_data_id', 'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.mi_treePath',
      'action', 'valuation', 'valueNew', 'payElID', 'positionID.accrualSum'])
    .where('staffTableID', '=', execParams.staffTableID)
    .selectAsObject()
  const store = UB.DataStore('hr_position')
  const accStore = UB.DataStore('hr_positionAccrual')
  const entryDate = dateService.shiftDate(execParams.onDate)
  salaryChanges.forEach(item => {
    let positionID
    const curPos = UB.Repository('hr_position')
      .attrs(['ID', 'mi_dateFrom', 'mi_dateTo'])
      .where('mi_data_id', '=', item['positionID.mi_data_id'])
      .where('state', '=', 'NEW')
      .misc({
        __mip_ondate: entryDate
      })
      .where('staffOrderID', '=', execParams.staffTableID)
      .selectSingle()
    if (curPos) {
      positionID = curPos.ID
    } else {
      const newID = store.generateID()
      entityBaseService.cloneInstance('hr_position', item.positionID, {
        ID: newID,
        mi_data_id: item['positionID.mi_data_id'],
        mi_treePath: item['positionID.mi_treePath'],
        mi_dateFrom: entryDate,
        mi_dateTo: item['positionID.mi_dateTo'],
        state: 'NEW',
        staffOrderID: execParams.staffTableID,
        priorID: item.positionID,
        isSecondaryChanges: 0
      }, true)
      positionID = newID
    }
    const calcSum = item.valuation === 'SUM' ? item.valueNew : ((item['positionID.accrualSum'] || 0) * (item.valueNew || 0) / 100 || null)
    if (item.action === 'CREATE') {
      const accrual = UB.Repository('hr_positionAccrual')
        .attrs(['ID'])
        .where('positionID', '=', positionID)
        .where('payElID', '=', item.payElID)
        .selectSingle()
      if (accrual) {
        accStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: accrual.ID,
            accrualSum: item.valuation === 'SUM' ? item.valueNew : null,
            accrualRate: item.valuation === 'PRC' ? item.valueNew : null,
            calcSum
          }
        })
      } else {
        accStore.run('insert', {
          execParams: {
            positionID: positionID,
            payElID: item.payElID,
            accrualSum: item.valuation === 'SUM' ? item.valueNew : null,
            accrualRate: item.valuation === 'PRC' ? item.valueNew : null,
            dateFrom: curPos ? curPos['mi_dateFrom'] : dateService.shiftDate(execParams.onDate),
            dateTo: curPos ? curPos['mi_dateTo'] : item['positionID.mi_dateTo'],
            calcSum
          }
        })
      }
    }
    if (item.action === 'CHANGE') {
      const accruals = UB.Repository('hr_positionAccrual')
        .attrs(['ID'])
        .where('positionID', '=', positionID)
        .where('payElID', '=', item.payElID)
        .whereIf(item.valuationOld === 'SUM', 'accrualSum', '=', item.valueOld)
        .whereIf(item.valuationOld === 'PRC', 'accrualRate', '=', item.valueOld)
        .selectAsObject()
      accruals.forEach(acc => {
        accStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: acc.ID,
            accrualSum: item.valuation === 'SUM' ? item.valueNew : null,
            accrualRate: item.valuation === 'PRC' ? item.valueNew : null,
            calcSum
          }
        })
      })
    }
    if (item.action === 'CANCEL') {
      const accruals = UB.Repository('hr_positionAccrual')
        .attrs(['ID'])
        .where('positionID', '=', positionID)
        .where('payElID', '=', item.payElID)
        .selectAsObject()
      accruals.forEach(acc => {
        accStore.run('delete', {
          __skipOptimisticLock: true,
          execParams: {
            ID: acc.ID
          }
        })
      })
    }
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      accrualChangesApplied: 1
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
      accrualChangesApplied: 0
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
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      accrualChangesApplied: 0
    }
  })
  storeStaffTable.freeNative()
  store.freeNative()
}
