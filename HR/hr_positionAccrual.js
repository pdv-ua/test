const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')
const staffService = require('../HR/modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)

me.on('update:after', updatePositionFunds)
me.on('insert:after', updatePositionFunds)
me.on('delete:after', updatePositionFunds)

function beforeDelete (ctx) {
  updatePositionChangesState(ctx)
}

function beforeInsert (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
  if (ctx.mParams && ctx.mParams.method === undefined) {
    ctx.mParams.method = 'insert'
  }
  if (!ctx.mParams.skipUpdatePositionChangesState) {
    updatePositionChangesState(ctx)
  }
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  checkDate(ctx, previousValues)
  entityService.checkPeriod(ctx, previousValues)
  if (ctx.mParams && ctx.mParams.method === undefined) {
    ctx.mParams.method = 'update'
  }
  updatePositionChangesState(ctx)
}

function checkDate (ctx, instanceData) {
  if (ctx.mParams.skipUpdate) {
    return
  }
  const execParams = ctx.mParams.execParams
  let dateFrom = dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom)
  const positionAccrual = UB.Repository('hr_positionAccrual')
    .attrs('ID', 'dateFrom', 'dateTo', 'mi_modifyDate')
    .where('positionID', '=', execParams.positionID || instanceData.positionID)
    .where('payElID', '=', execParams.payElID || instanceData.payElID)
    .where('dateTo', '>=', dateFrom)
    .where('ID', '!=', execParams.ID)
    .selectAsObject()
  positionAccrual.forEach(row => {
    if (new Date(row.dateFrom) >= dateFrom) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата початку дії якого більше або дорівнює даті початку  дії поточного запису')}>>>`)
    }
    if (new Date(row.dateTo) >= new Date(execParams.dateTo || instanceData.dateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Вже існує запис, дата закінчення дії якого більше або дорівнює даті закінчення дії поточного запису')}>>>`)
    }
  })
}

function updatePositionChangesState (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.method === 'insert') {
    const pos = UB.Repository('hr_position')
      .attrs(['state'])
      .misc({ __mip_recordhistory_all: true })
      .selectById(execParams.positionID)
    if (pos && pos['state'] === 'NEW') {
      const store = UB.DataStore('hr_position')
      store.execSQL('UPDATE hr_position  SET isSecondaryChanges = 0 WHERE ID = :ID:', { ID: execParams.positionID })
      store.execSQL('UPDATE hr_staffUnit SET isSecondaryChanges = 0 WHERE ID = :ID:', { ID: execParams.positionID })
      const storeFs = UB.DataStore('hr_positionFundSource')
      UB.Repository('hr_positionFundSource')
        .attrs('ID')
        .where('positionID', '=', execParams.positionID)
        .selectAsObject()
        .forEach(item => {
          storeFs.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            skipBefore: true,
            execParams: {
              ID: item.ID,
              isChanged: 1
            }
          })
        })
    }
  } else {
    const pos = UB.Repository(__entityName)
      .attrs(['positionID', 'positionID.state'])
      .selectById(execParams.ID)
    if (pos && pos['positionID.state'] === 'NEW') {
      const store = UB.DataStore('hr_position')
      store.execSQL('UPDATE hr_position  set isSecondaryChanges = 0 WHERE ID = :ID:', { ID: pos.positionID })
      store.execSQL('UPDATE hr_staffUnit set isSecondaryChanges = 0 WHERE ID = :ID:', { ID: pos.positionID })
      const storeFs = UB.DataStore('hr_positionFundSource')
      UB.Repository('hr_positionFundSource')
        .attrs('ID')
        .where('positionID', '=', pos.positionID)
        .selectAsObject()
        .forEach(item => {
          storeFs.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            skipBefore: true,
            execParams: {
              ID: item.ID,
              isChanged: 1
            }
          })
        })
    }
  }
}

function updatePositionFunds (ctx) {
  if (ctx.mParams.skipRecalcFunds) {
    return
  }
  const item = UB.Repository(__entityName)
    .attrs(['positionID', 'positionID.orgID', 'positionID.accrualSum', 'positionID.quantity', 'payElID.methodID.code',
      'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'positionID.dictTarifCoeffID', 'positionID.paymentType'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(ctx.mParams.execParams.ID)
  const calcAccrualType = settingsService.getByCode('hrCalcSumPosAccrual', item['positionID.orgID'])
  const onDate = dateService.shiftDate(item['positionID.mi_dateFrom'])
  const store = UB.DataStore('hr_positionAccrual')
  if (item['positionID.dictTarifCoeffID'] && item['positionID.paymentType'] === 'TARIF') {
    const addSum = UB.Repository('hr_positionAccrual')
      .attrs(['SUM([calcSum])'])
      .where('positionID', '=', item.positionID)
      .where('payElID.methodID.code', '=', '144')
      .selectScalar() || 0
    const data = UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['accrualSum'])
      .where('dictTarifCoeffID', '=', item['positionID.dictTarifCoeffID'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle() || {}
    item['positionID.accrualSum'] = (data.accrualSum || 0) + addSum
    store.execSQL(`UPDATE hr_position SET accrualSum = :accrualSum: WHERE ID = :ID:`, {
      ID: item.positionID,
      accrualSum: item['positionID.accrualSum']
    })
    store.execSQL(`UPDATE hr_staffUnit SET accrualSum = :accrualSum: WHERE ID = :ID:`, {
      ID: item.positionID,
      accrualSum: item['positionID.accrualSum']
    })
  }

  if (calcAccrualType === 'ACCRUAL') {
    const positionData = staffService.getPlanSumByPosition({
      onDate,
      orgID: item['positionID.orgID'],
      positionIDs: [item.positionID]
    })

    positionData.forEach(position => {
      position.payEl.forEach(accrual => {
        store.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
          ID: accrual.ID,
          calcSum: accrual.planSum || 0
        })
      })
    })
  }

  const funds = staffService.calculatePositionFunds(item['positionID'], item['positionID.orgID'], item['positionID.accrualSum'] || 0, item['positionID.quantity'] || 0)
  UB.DataStore('hr_position').run('update', {
    __skipOptimisticLock: true,
    __skipSelectAfterUpdate: true,
    skipBefore: true,
    execParams: {
      ID: item['positionID'],
      fundBasePay: funds.fundBase,
      fundAddPay: funds.fundAdd,
      fundOtherPay: funds.fundOther,
      fundTotal: funds.fundAll
    }
  })
}
