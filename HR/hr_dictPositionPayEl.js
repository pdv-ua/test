const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updatePayEl')
me.entity.addMethod('loadByCategory')
const dateService = require('../AC/modules/dataServices/dateService')

me.updatePayEl = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_dictPositionPayEl')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID } })
  })

  data.add.forEach(payElID => {
    const record = UB.Repository('hr_dictPositionPayEl')
      .attrs('ID')
      .misc({ __allowSelectSafeDeleted: true })
      .where('dictPositionID', '=', data.dictPositionID)
      .where('payElID', '=', payElID)
      .orderBy('ID')
      .selectSingle()
    if (record) {
      store.execSQL(`update hr_dictPositionPayEl set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: record.ID })
    } else {
      store.run('insert', {
        execParams: {
          dictPositionID: data.dictPositionID,
          payElID,
          dateFrom: dateService.minDate(),
          dateTo: dateService.maxDate()
        }
      })
    }
  })
}

me.loadByCategory = function (ctx) {
  const mParams = ctx.mParams
  const dictPositionID = mParams.dictPositionID
  const onDate = mParams.onDate
  const store = UB.DataStore('hr_dictPositionPayEl')
  let itemsCount = 0

  let payEls = UB.Repository('hr_dictStaffCatAccrual')
    .attrs('payElID', 'value', 'valuation')
    .where('organizationID', '=', mParams.organizationID)
    .where('dictStaffCatID', '=', mParams.dictStaffCatID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
  itemsCount += payEls.length

  payEls.forEach(row => {
    const rec = UB.Repository('hr_dictPositionPayEl')
      .attrs('ID')
      .where('dictPositionID', '=', dictPositionID)
      .where('payElID', '=', row.payElID)
      .selectSingle()
    if (!rec) {
      store.run('insert', {
        execParams: {
          dictPositionID: dictPositionID,
          payElID: row.payElID,
          value: row.value,
          valuation: row.valuation,
          dateFrom: dateService.minDate(),
          dateTo: dateService.maxDate()
        }
      })
    }
  })
  payEls = UB.Repository('hr_dictStaffCatAccrual')
    .attrs('payElID', 'value', 'valuation')
    .where('organizationID', 'isNull')
    .where('dictStaffCatID', '=', mParams.dictStaffCatID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
  itemsCount += payEls.length

  payEls.forEach(row => {
    const rec = UB.Repository('hr_dictPositionPayEl')
      .attrs('ID')
      .where('dictPositionID', '=', dictPositionID)
      .where('payElID', '=', row.payElID)
      .selectSingle()
    if (!rec) {
      store.run('insert', {
        execParams: {
          dictPositionID: dictPositionID,
          payElID: row.payElID,
          value: row.value,
          valuation: row.valuation,
          dateFrom: dateService.minDate(),
          dateTo: dateService.maxDate()
        }
      })
    }
  })
  mParams.itemsCount = itemsCount
}
