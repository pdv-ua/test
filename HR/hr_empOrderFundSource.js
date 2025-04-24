const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('getPosFundSourceData')
me.entity.addMethod('getOrderFundSourceData')

me.getPosFundSourceData = function (ctx) {
  const mParams = ctx.mParams
  const posFundSource = selectPosFundSource(mParams.positionID, dateService.shiftDate(mParams.onDate), mParams.dictFundSourceID)
  ctx.mParams.result = JSON.stringify(posFundSource)
}

me.getPosFundSource = function (positionID, onDate, dictFundSourceID) {
  return selectPosFundSource(positionID, onDate, dictFundSourceID)
}

function selectPosFundSource (positionID, onDate, dictFundSourceID) {
  if (!positionID) return []
  const miDataID = UB.Repository('hr_position')
    .attrs('mi_data_id')
    .where('ID', '=', positionID)
    .misc({ __allowSelectSafeDeleted: true })
    .selectScalar()
  const posFundSource = UB.Repository('hr_positionFundSource')
    .attrs(['dictFundSourceID', 'dictFundSourceID.description', 'quantity', 'dictFundSourceID.mi_deleteUser'])
    .where('positionID', '=', positionID)
    .whereIf(dictFundSourceID, 'dictFundSourceID', '=', dictFundSourceID)
    .selectAsObject()
  posFundSource.forEach(row => {
    const mtCountTotal = UB.Repository('hr_empPosFundSource')
      .attrs('sum([mtCount])')
      .where('employeePositionID.positionID', '=', miDataID)
      .where('employeePositionID.dateFrom', '<=', onDate)
      .where('employeePositionID.dateTo', '>=', onDate)
      .where('employeePositionID.isActive', '=', 1)
      .where('employeePositionID.mi_deleteDate', '=', '#maxdate')
      .where('dictFundSourceID', '=', row.dictFundSourceID)
      .selectScalar() || 0
    row.posVac = (row.quantity || 0) - mtCountTotal
    row.posTotal = row.quantity
  })
  return posFundSource
}

me.getOrderFundSourceData = function (ctx) {
  const mParams = ctx.mParams
  const posFundSource = selectPosFundSource(mParams.positionID, dateService.shiftDate(mParams.onDate))
  const orderFundSource = UB.Repository(__entityName)
    .attrs(['ID', 'dictFundSourceID', 'dictFundSourceID.description', 'mtCount', 'orderID', 'dictFundSourceID.mi_deleteUser'])
    .where('paraID', '=', mParams.paraID)
    .selectAsObject()
  const store = UB.DataStore(__entityName)
  posFundSource.forEach(row => {
    const item = orderFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)
    row.mtCount = item && !mParams.isClear ? item.mtCount : 0
    row.orderID = item ? item.orderID : null
    row.ID = item ? item.ID : store.generateID()
  })
  if (!mParams.isClear) {
    orderFundSource.forEach(row => {
      const item = posFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)
      if (!item) {
        posFundSource.push({
          ID: row.ID,
          dictFundSourceID: row.dictFundSourceID,
          'dictFundSourceID.description': row['dictFundSourceID.description'],
          mtCount: row.mtCount,
          orderID: row.orderID
        })
      }
    })
  }
  if (mParams.isClear && posFundSource.length === 1) {
    posFundSource[0].mtCount = 1
  }
  mParams.result = JSON.stringify(posFundSource)
}
