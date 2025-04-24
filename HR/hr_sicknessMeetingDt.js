const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('addList')

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  let doc
  if (execParams.empOrderSicknessID) {
    doc = UB.Repository('hr_sicknessMeetingDt')
      .attrs('ID', 'empOrderSicknessID.description')
      .where('empOrderSicknessID', '=', execParams.empOrderSicknessID)
      .where('sicknessMeetingID', '=', execParams.sicknessMeetingID)
      .selectSingle({
        'empOrderSicknessID.description': 'description'
      })
  }
  if (execParams.empOrderFuneralID) {
    doc = UB.Repository('hr_sicknessMeetingDt')
      .attrs('ID', 'empOrderFuneralID.description')
      .where('empOrderFuneralID', '=', execParams.empOrderFuneralID)
      .where('sicknessMeetingID', '=', execParams.sicknessMeetingID)
      .selectSingle({
        'empOrderFuneralID.description': 'description'
      })
  }
  if (doc) {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} вже додано до протоколу!', doc['description'])}>>>`)
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  let doc
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  if (execParams.empOrderSicknessID) {
    doc = UB.Repository('hr_sicknessMeetingDt')
      .attrs('ID', 'empOrderSicknessID.description')
      .where('empOrderSicknessID', '=', execParams.empOrderSicknessID)
      .where('sicknessMeetingID', '=', instanceData.sicknessMeetingID)
      .where('employeeNumberID', '=', instanceData.employeeNumberID)
      .where('ID', '!=', execParams.ID)
      .selectSingle({
        'empOrderSicknessID.description': 'description'
      })
  }
  if (execParams.empOrderFuneralID) {
    doc = UB.Repository('hr_sicknessMeetingDt')
      .attrs('ID', 'empOrderFuneralID.description')
      .where('empOrderFuneralID', '=', execParams.empOrderFuneralID)
      .where('sicknessMeetingID', '=', instanceData.sicknessMeetingID)
      .where('ID', '!=', execParams.ID)
      .selectSingle({
        'empOrderFuneralID.description': 'description'
      })
  }
  if (doc) {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} вже додано до протоколу!', doc['description'])}>>>`)
  }
}

me.addList = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.orderID || !mParams.organizationID) {
    return false
  }
  let orderID = mParams.orderID
  let organizationID = mParams.organizationID
  const storeSicknessMeetingDt = UB.DataStore('hr_sicknessMeetingDt')
  let list = UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'orderState'])
    .where('organizationID', '=', organizationID)
    .where('illnessKind', '=', '1')
    .where('orderState', '=', 'POSTED')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderSicknessID', 'ID')
      .where('empOrderSicknessID.organizationID', '=', organizationID)
      .where('empOrderSicknessID.illnessKind', '=', '1')
      .where('empOrderSicknessID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', dateService.maxDate()))
    .orderBy('dateFrom')
    .selectAsObject()
  list.forEach((item) => {
    storeSicknessMeetingDt.run('insert', {
      execParams: {
        sicknessMeetingID: orderID,
        empOrderSicknessID: item.ID,
        decitionStatus: item.orderState === 'NOPAYMENT' ? 'NOPAYMENT' : 'FORCALC'
      }
    })
  })
  storeSicknessMeetingDt.freeNative()
  return true
}
