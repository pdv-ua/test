const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const accrualService = require('../HR/modules/accrualService')
const currencyService = require('../AC/modules/dataServices/currencyService')

me.on('update:before', beforeUpdate)

me.entity.addMethod('fillByTariff')
me.entity.addMethod('fillByScheme')
me.entity.addMethod('fillByAccrual')
me.entity.addMethod('applyChanges')
me.entity.addMethod('cancelChanges')
me.entity.addMethod('clearChanges')
me.entity.addMethod('search')
me.entity.addMethod('calcAccruals')

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  let instanceData = ctx.dataStore.getAsJsObject()[0] || null
  if (execParams.accrualSum) {
    if (!instanceData) {
      instanceData = UB.Repository(__entityName)
        .attrs('accrualSum', 'dictTarifCoeffID', 'dictSalarySchemeLevelID', 'staffTableID')
        .selectById(execParams.ID)
    }
    let accrualSum = execParams.accrualSum
    if (instanceData.dictSalarySchemeLevelID && execParams.onDate) {
      const scheme = UB.Repository('hr_dictSalarySchemeDet')
        .attrs('accrualSumMin', 'accrualSumMax')
        .where('dictSalarySchemeLevelID', '=', instanceData.dictSalarySchemeLevelID)
        .where('dateFrom', '<=', dateService.shiftDate(execParams.onDate))
        .where('dateTo', '>=', dateService.shiftDate(execParams.onDate))
        .selectSingle()
      if (scheme) {
        if (scheme.accrualSumMin > accrualSum) execParams.accrualSum = scheme.accrualSumMin
        if (scheme.accrualSumMax < accrualSum) execParams.accrualSum = scheme.accrualSumMax
      }
    }
    const storeStaffTable = UB.DataStore('hr_staffTable')
    storeStaffTable.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: instanceData.staffTableID,
        salaryChangesApplied: 0
      }
    })
  }
}

me.fillByTariff = function (ctx) {
  const execParams = ctx.mParams.execParams
  const positions = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'departmentID', 'dictSalarySchemeLevelID', 'name', 'depDescription', 'positionCategory',
      'positionType', 'dictStaffCatID', 'dictFundSourceID', 'dictTarifCoeffID'])
    .where('orgID', '=', execParams.orgID)
    .where('state', '=', 'ACTIVE')
    .where('paymentType', '=', 'TARIF')
    .where('dictTarifCoeffID', 'isNotNull')
    .misc({
      __mip_ondate: dateService.shiftDate(execParams.onDate)
    })
    .selectAsObject()
  const dictTarifSum = UB.Repository('hr_dictTarifCoeffDet')
    .attrs('accrualSum', 'dictTarifCoeffID')
    .where('dateFrom', '<=', execParams.dateFrom)
    .where('dateTo', '>=', execParams.dateFrom)
    .selectAsObject()

  const positionAccruals = positions.length ? UB.Repository('hr_positionAccrual')
    .attrs(['ID', 'positionID', 'accrualSum', 'accrualRate'])
    .where('payElID.methodID.code', '=', '144')
    .where('positionID', 'in', positions.map(o => o.ID))
    .selectAsObject() : []

  const store = UB.DataStore(__entityName)

  const curRecords = UB.Repository(__entityName)
    .attrs('ID', 'positionID')
    .where('staffTableID', '=', execParams.staffTableID)
    .selectAsObject()

  curRecords.forEach(row => {
    if (execParams.isDelete || positions.find(o => o.ID === row.positionID)) {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    }
  })

  positions.forEach(pos => {
    const tarifSum = dictTarifSum.find(o => o.dictTarifCoeffID === pos.dictTarifCoeffID)
    let addSum = 0
    if (execParams.recalcTarifAccrual) {
      const posAccruals = positionAccruals.filter(o => o.positionID === pos.ID)
      addSum = posAccruals.reduce((sum, row) => {
        sum += (row.accrualRate ? currencyService.round(tarifSum.accrualSum * row.accrualRate / 100) : row.accrualSum) || 0
        return sum
      }, 0)
    }
    const newAccrualSum = tarifSum ? (tarifSum.accrualSum + addSum) : pos.accrualSum
    store.run('insert', {
      execParams: {
        staffTableID: execParams.staffTableID,
        paymentType: 'TARIF',
        departmentID: pos.departmentID,
        positionID: pos.ID,
        accrualSumCur: (pos.accrualSum || 0),
        accrualSum: newAccrualSum || 0,
        dictTarifCoeffID: pos.dictTarifCoeffID,
        dictSalarySchemeLevelID: pos.dictSalarySchemeLevelID,
        posName: pos.name,
        depName: pos.depDescription,
        positionCategory: pos.positionCategory,
        positionType: pos.positionType,
        dictStaffCatID: pos.dictStaffCatID,
        dictFundSourceID: pos.dictFundSourceID
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      salaryChangesApplied: 0
    }
  })
}

me.fillByScheme = function (ctx) {
  const execParams = ctx.mParams.execParams

  const positions = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'departmentID', 'dictSalarySchemeLevelID', 'name', 'depDescription', 'positionCategory',
      'positionType', 'dictStaffCatID', 'dictFundSourceID', 'dictTarifCoeffID', 'dictSalarySchemeLevelID.description'])
    .where('ID', 'in', JSON.parse(execParams.positions))
    .where('paymentType', '=', 'SCHEME')
    .misc({
      __mip_recordhistory_all: true
    })
    .where('dictSalarySchemeLevelID', 'isNotNull')
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
    let newAccrualSum = pos.accrualSum || 0
    if (execParams.valuation === 'PRC') {
      newAccrualSum = accrualService.roundSum(accrualService.round(newAccrualSum * (1 + execParams.value / 100)), execParams.roundUpTo, execParams.roundingMode)
    } else if (execParams.valuation === 'SUM') {
      newAccrualSum = accrualService.roundSum(newAccrualSum + execParams.value, execParams.roundUpTo, execParams.roundingMode)
    } else if (execParams.valuation === 'RECO') {
      newAccrualSum = 0
    }

    let salarySchemeLevelDesc = pos['dictSalarySchemeLevelID.description']

    const scheme = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('accrualSumMin', 'accrualSumMax', 'accrualSum')
      .where('dictSalarySchemeLevelID', '=', pos.dictSalarySchemeLevelID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.onDate))
      .where('dateTo', '>=', dateService.shiftDate(execParams.onDate))
      .selectSingle()
    if (scheme) {
      if (scheme.accrualSumMin > newAccrualSum) newAccrualSum = scheme.accrualSumMin
      if (scheme.accrualSumMax < newAccrualSum) newAccrualSum = scheme.accrualSumMax
      salarySchemeLevelDesc = `${salarySchemeLevelDesc}, Сума (мін)=${scheme.accrualSumMin || ''}, Сума (макс)=${scheme.accrualSumMax || ''}`
      if (execParams.valuation === 'RECO') {
        newAccrualSum = scheme.accrualSum ? accrualService.roundSum(scheme.accrualSum, execParams.roundUpTo, execParams.roundingMode) : 0
      }
    }

    store.run('insert', {
      execParams: {
        staffTableID: execParams.staffTableID,
        paymentType: 'SCHEME',
        departmentID: pos.departmentID,
        positionID: pos.ID,
        accrualSumCur: pos.accrualSum || 0,
        accrualSum: newAccrualSum || 0,
        accrualSumMin: scheme ? scheme.accrualSumMin : null,
        accrualSumMax: scheme ? scheme.accrualSumMax : null,
        dictTarifCoeffID: pos.dictTarifCoeffID,
        dictSalarySchemeLevelID: pos.dictSalarySchemeLevelID,
        salarySchemeLevelDesc,
        posName: pos.name,
        depName: pos.depDescription,
        positionCategory: pos.positionCategory,
        positionType: pos.positionType,
        dictStaffCatID: pos.dictStaffCatID,
        dictFundSourceID: pos.dictFundSourceID
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      salaryChangesApplied: 0
    }
  })
}

me.fillByAccrual = function (ctx) {
  const execParams = ctx.mParams.execParams

  const positions = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'departmentID', 'dictSalarySchemeLevelID', 'name', 'depDescription', 'positionCategory',
      'positionType', 'dictStaffCatID', 'dictFundSourceID', 'dictTarifCoeffID'])
    .where('ID', 'in', JSON.parse(execParams.positions))
    .where('paymentType', '=', 'ACCRUAL')
    .misc({
      __mip_recordhistory_all: true
    })
    .where('accrualSum', 'isNotNull')
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
    let newAccrualSum = pos.accrualSum || 0
    if (execParams.valuation === 'PRC') {
      newAccrualSum = accrualService.roundSum(accrualService.round(newAccrualSum * (1 + execParams.value / 100)), execParams.roundUpTo, execParams.roundingMode)
    } else if (execParams.valuation === 'SUM') {
      newAccrualSum = accrualService.roundSum(newAccrualSum + execParams.value, execParams.roundUpTo, execParams.roundingMode)
    }

    store.run('insert', {
      execParams: {
        staffTableID: execParams.staffTableID,
        paymentType: 'ACCRUAL',
        departmentID: pos.departmentID,
        positionID: pos.ID,
        accrualSumCur: pos.accrualSum || 0,
        accrualSum: newAccrualSum || 0,
        dictTarifCoeffID: pos.dictTarifCoeffID,
        posName: pos.name,
        depName: pos.depDescription,
        positionCategory: pos.positionCategory,
        positionType: pos.positionType,
        dictStaffCatID: pos.dictStaffCatID,
        dictFundSourceID: pos.dictFundSourceID,
        dictSalarySchemeLevelID: pos.dictSalarySchemeLevelID
      }
    })
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      salaryChangesApplied: 0
    }
  })
}

me.applyChanges = function (ctx) {
  const execParams = ctx.mParams.execParams
  const salaryChanges = UB.Repository(__entityName)
    .attrs('ID', 'positionID', 'positionID.mi_data_id', 'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.mi_treePath', 'accrualSum')
    .where('staffTableID', '=', execParams.staffTableID)
    .where('isDeleted', '=', 0)
    .selectAsObject()
  const store = UB.DataStore('hr_position')
  const entryDate = dateService.shiftDate(execParams.onDate)
  salaryChanges.forEach(item => {
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
        execParams: {
          ID: curPos.ID,
          accrualSum: item.accrualSum
        }
      })
    } else {
      const newID = store.generateID()
      entityBaseService.cloneInstance('hr_position', item.positionID, {
        ID: newID,
        mi_data_id: item['positionID.mi_data_id'],
        mi_treePath: item['positionID.mi_treePath'],
        mi_dateFrom: entryDate,
        mi_dateTo: item['positionID.mi_dateTo'],
        accrualSum: item.accrualSum,
        state: 'NEW',
        staffOrderID: execParams.staffTableID,
        priorID: item.positionID,
        isSecondaryChanges: 0
      }, true)
    }
  })
  const storeStaffTable = UB.DataStore('hr_staffTable')
  storeStaffTable.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: execParams.staffTableID,
      salaryChangesApplied: 1
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
      .where('staffTableID', '=', execParams.staffTableID)
      .where('isDeleted', '=', 0))
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
      salaryChangesApplied: 0
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
      salaryChangesApplied: 0
    }
  })
  storeStaffTable.freeNative()
  store.freeNative()
}

me.search = function (ctx) {
//       ${ctx.mParams.department ? "LEFT JOIN hr_department dictD ON dictD.id = msc.departmentID AND dictD.mi_deleteDate >= '9999-12-31'" : ''}
  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_massSalaryChange msc
      LEFT JOIN hr_position pos ON pos.id = msc.positionID
      ${ctx.mParams.positionType ? "LEFT JOIN ubm_enum e_positionType ON e_positionType.code = msc.positionType and e_positionType.eGroup = 'HR_POSITION_TYPE'" : ''}       
      ${ctx.mParams.positionCategory ? "LEFT JOIN ubm_enum e_positionCategory ON e_positionCategory.code = msc.positionCategory and e_positionCategory.eGroup = 'HR_POSITION_CATEGORY'" : ''}       
      ${ctx.mParams.dictStaffCat ? "LEFT JOIN hr_dictStaffCat dictSC ON dictSC.ID = msc.dictStaffCatID AND dictSC.mi_deleteDate >= '9999-12-31'" : ''}       
      ${ctx.mParams.dictPositionKind ? "LEFT JOIN hr_dictPositionKind dictPK ON dictPK.ID = pos.dictPositionKindID AND dictPK.mi_deleteDate >= '9999-12-31'" : ''}
      ${ctx.mParams.dictPositionGroup ? "LEFT JOIN hr_dictPositionGroup dictPG ON dictPG.ID = pos.dictPositionGroupID AND dictPG.mi_deleteDate >= '9999-12-31'" : ''}
      ${ctx.mParams.dictFundSource ? "LEFT JOIN ac_fundSource dictFS ON dictFS.id = msc.dictFundSourceID AND dictFS.mi_deleteDate >= '9999-12-31'" : ''}       
      ${ctx.mParams.dictEmpCategory ? "LEFT JOIN hr_dictEmpCategory dictEC ON dictEC.id = pos.dictEmpCategoryID AND dictEC.mi_deleteDate >= '9999-12-31'" : ''}       
      ${ctx.mParams.dictSalaryScheme ? "LEFT JOIN hr_dictSalarySchemeLevel dictSSL ON dictSSL.id = msc.dictSalarySchemeLevelID AND dictSSL.mi_deleteDate >= '9999-12-31'" : ''}       
      ${ctx.mParams.dictTarifCoeff ? "LEFT JOIN hr_dictTarifCoeff dictTC ON dictTC.id = msc.dictTarifCoeffID AND dictTC.mi_deleteDate >= '9999-12-31'" : ''}       
    {2}
    {3}
    {4}
    {5}`,
    clauses: {},
    aliases: {
      positionTypeName: { field: 'e_positionType.name' },
      positionCategoryName: { field: 'e_positionCategory.name' },
      dictStaffCatName: { field: 'dictSC.name' },
      dictPositionKindName: { field: 'dictPK.name' },
      dictPositionGroupName: { field: 'dictPG.name' },
      departmentName: { field: 'msc.depName' }, // { field: 'dictD.name' },
      dictFundSourceName: { field: 'dictFS.name' },
      dictEmpCategoryName: { field: 'dictEC.name' },
      dictSalarySchemeLevelName: { field: 'dictSSL.name' },
      dictTarifCoeffName: { field: 'dictTC.name' },
      positionName: { field: 'msc.posName' }, // { field: 'pos.name' },
      accrualSumCur: { field: 'SUM(msc.accrualSumCur)' },
      accrualSum: { field: 'SUM(msc.accrualSum)' },
      sumDelta: { field: 'SUM(msc.accrualSum - msc.accrualSumCur)' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.staffTableID = ctx.mParams.staffTableID
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || ''
  sqlBuilder.clauses.groupClause = `GROUP BY ${ctx.mParams.fieldGroup}`

  const runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.groupClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false

  return true
}

me.getWhereClause = function () {
  return ` msc.staffTableID = :staffTableID: and msc.mi_deleteDate >= '9999-12-31' `
}

me.calcAccruals = function (ctx) {
  const execParams = ctx.mParams.execParams

  const records = UB.Repository('hr_massAccrualChange')
    .attrs('ID')
    .where('staffTableID', '=', execParams.staffTableID)
    .selectAsObject()
  const storeAcc = UB.DataStore('hr_massAccrualChange')
  records.forEach(item => {
    storeAcc.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID
      }
    })
  })
  const calculationMode = execParams.calculationMode

  const salaryChanges = UB.Repository(__entityName)
    .attrs(['ID', 'positionID', 'accrualSum', 'accrualSumCur', 'positionID.departmentID', 'positionID.name', 'positionID.depDescription',
      'positionID.positionCategory', 'positionID.positionType', 'positionID.dictStaffCatID', 'positionID.dictFundSourceID'])
    .where('staffTableID', '=', execParams.staffTableID)
    .where('isDeleted', '=', 0)
    .selectAsObject()

  if (salaryChanges.length) {
    const posAccruals = UB.Repository('hr_positionAccrual')
      .attrs('positionID', 'payElID', 'accrualSum')
      .where('positionID', 'in', salaryChanges.map(o => o.positionID))
      .where('accrualSum', 'isNotNull')
      .selectAsObject()

    posAccruals.forEach(acc => {
      const sal = salaryChanges.find(o => o.positionID === acc.positionID)
      if (sal) {
        const rate = calculationMode === 'PROP' ? accrualService.round(sal.accrualSum / sal.accrualSumCur, 4) : (1 + (execParams.rate || 0) / 100)
        const valueNew = accrualService.roundSum(accrualService.round(acc.accrualSum * rate), execParams.roundUpTo, execParams.roundingMode) || 0
        storeAcc.run('insert', {
          execParams: {
            staffTableID: execParams.staffTableID,
            action: 'CREATE',
            departmentID: sal['positionID.departmentID'],
            positionID: acc.positionID,
            valuation: 'SUM',
            valueNew,
            valueOld: acc.accrualSum || 0,
            valuationOld: 'SUM',
            payElID: acc.payElID,
            posName: sal['positionID.name'],
            depName: sal['positionID.depDescription'],
            positionCategory: sal['positionID.positionCategory'],
            positionType: sal['positionID.positionType'],
            dictStaffCatID: sal['positionID.dictStaffCatID'],
            dictFundSourceID: sal['positionID.dictFundSourceID']
          }
        })
      }
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
  }
}
