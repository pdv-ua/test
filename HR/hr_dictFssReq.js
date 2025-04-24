const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updatePayElEntry')
me.entity.addMethod('checkPayElEntry')

function findPayElEntry (ID, dictFssReqID, dateFrom, dateTo) {
  return UB.Repository('hr_dictFssReqDt')
    .attrs('ID', 'dictFssReqID', 'dictFssReqID.description', 'payElID.description')
    .where('payElID', '=', ID, 'payEl')
    .where('dictFssReqID', '!=', dictFssReqID, 'dictFssReq')
    .where('dictFssReqID.dateTo', '>=', dateFrom, 'dateTo1')
    .where('dictFssReqID.dateTo', '<=', dateTo, 'dateTo2')
    .where('dictFssReqID.dateFrom', '>=', dateFrom, 'dateFrom1')
    .where('dictFssReqID.dateFrom', '<=', dateTo, 'dateFrom2')
    .where('dictFssReqID.dateFrom', '<=', dateFrom, 'dateFrom3')
    .where('dictFssReqID.dateTo', '>=', dateTo, 'dateTo3')
    .where('dictFssReqID.mi_deleteDate', '>=', '#maxdate', 'deleteDate')
    .logic('([payEl] AND [dictFssReq] AND [deleteDate]) AND (([dateTo1] AND [dateTo2]) OR ([dateFrom1] AND [dateFrom2]) OR ([dateFrom3] AND [dateTo3]))')
    .selectAsObject()
}

function checkPayElList (data, dictFssReqID) {
  const errors = []
  const dictFssReq = UB.Repository('hr_dictFssReq').attrs('dateFrom', 'dateTo').selectById(dictFssReqID)

  data.add.forEach(ID => {
    const payElEntryList = findPayElEntry(ID, dictFssReqID, dictFssReq.dateFrom, dictFssReq.dateTo)
    payElEntryList.forEach(payElEntry => {
      errors.push({ ID: payElEntry.ID, payElID: ID, dictFssReq: payElEntry['dictFssReqID.description'], description: payElEntry['payElID.description'] })
    })
  })
  return errors
}

me.updatePayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_dictFssReqDt')
  const errors = checkPayElList(data, mParams.dictFssReqID)
  if (errors.length) {
    if (mParams.movePayEls) {
      errors.forEach(o => {
        data.remove.push(o.ID)
      })
    } else {
      throw new UB.UBAbort(`<<<${UB.i18n('Вид оплати "{0}" входить до типу "{1}"!', errors[0].description, errors[0].dictFssReq)}>>>`)
    }
  }

  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })

  data.add.forEach(ID => {
    store.run('insert', { execParams: { dictFssReqID: mParams.dictFssReqID, payElID: ID } })
  })
}

me.checkPayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const errors = checkPayElList(data, mParams.dictFssReqID)
  ctx.mParams.errors = JSON.stringify(errors)
}
