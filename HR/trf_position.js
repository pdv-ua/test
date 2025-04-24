const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (execParams.accrual) {
    mParams.accrual = execParams.accrual
    delete execParams.accrual
  }
  delete execParams['workNormID.weekHours']
  setDescription(ctx, execParams)
}

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.accrual) {
    const accruals = JSON.parse(mParams.accrual)
    const store = UB.DataStore('trf_accrual')
    accruals.forEach(row => {
      delete row['payElID.description']
      delete row['payElID.methodID.code']
      delete row['dictPupilID.name']
      delete row['employeeAccrualID.dateFrom']
      delete row['employeeAccrualID.dateTo']
      delete row.internalId
      delete row.ID
      delete row.mi_modifyDate
      row.positionID = mParams.execParams.ID
      store.run('insert', {
        execParams: row
      })
    })
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  delete execParams['workNormID.weekHours']
  if (execParams.accrual) {
    const accruals = JSON.parse(execParams.accrual)
    const store = UB.DataStore('trf_accrual')
    const existAccruals = UB.Repository('trf_accrual')
      .attrs(['ID'])
      .where('positionID', '=', execParams.ID)
      .selectAsObject()

    existAccruals.forEach(acc => {
      const accrual = accruals.find(o => o.ID === acc.ID)
      if (!accrual) {
        store.run('delete', {
          execParams: {
            ID: acc.ID
          }
        })
      } else {
        delete accrual['payElID.description']
        delete accrual['payElID.methodID.code']
        delete accrual['dictPupilID.name']
        delete accrual['employeeAccrualID.dateFrom']
        delete accrual['employeeAccrualID.dateTo']

        delete accrual.internalId
        if (accrual.ID === '') {
          delete accrual.ID
        }
        if (accrual.mi_modifyDate === '') {
          delete accrual.mi_modifyDate
        }
        store.run('update', {
          skipOldCode: true,
          __skipOptimisticLock: true,
          execParams: accrual
        })
        accrual.update = true
      }
    })
    accruals.forEach(row => {
      if (!row.update) {
        delete row['payElID.description']
        delete row['payElID.methodID.code']
        delete row['dictPupilID.name']
        delete row['employeeAccrualID.dateFrom']
        delete row['employeeAccrualID.dateTo']
        delete row.internalId
        delete row.ID
        delete row.mi_modifyDate
        row.positionID = execParams.ID
        store.run('insert', {
          skipOldCode: true,
          execParams: row
        })
      }
    })
    delete execParams.accrual
  }
  setDescription(ctx, execParams)
}

function setDescription (ctx, execParams) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const workPlaceDescription = (execParams.workPlaceID || previousValues.workPlaceID)
    ? (UB.Repository('trf_workPlace')
      .attrs(['employeeNumberID.description'])
      .where('ID', '=', (execParams.workPlaceID || previousValues.workPlaceID))
      .selectScalar() || 'Вакансія') : 'Вакансія'
  const positionDescription = (execParams.dictPositionID || previousValues.dictPositionID)
    ? (UB.Repository('hr_dictPosition')
      .attrs(['description'])
      .where('ID', '=', (execParams.dictPositionID || previousValues.dictPositionID))
      .selectScalar() || '') : ''
  execParams.description = `${workPlaceDescription}${positionDescription ? ` / ${positionDescription}` : ''}`
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const accrual = UB.Repository('trf_accrual')
    .attrs(['ID'])
    .where('positionID', '=', execParams.ID)
    .selectAsObject()

  if (accrual.length > 0) {
    const store = UB.DataStore('trf_accrual')
    accrual.forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
  }
}
