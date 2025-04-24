const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const _ = require('lodash')

me.on('delete:before', beforeDelete)

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  let docRegHourPay = UB.Repository('hr_docRegHourPay')
    .attrs(['ID', 'orderRegistryID.description', 'orderRegistryID'])
    .where('dictWorkTypeID', '=', execParams.ID)
    .selectAsObject()
  if (docRegHourPay && docRegHourPay.length) {
    let wrn = []
    docRegHourPay = docRegHourPay.filter(el => {
      if (!wrn.includes(el.orderRegistryID)) {
        wrn.push(el.orderRegistryID)
        return true
      }
      return false
    })
    let warnTxt = docRegHourPay.reduce((wrn, currValue) => wrn + currValue['orderRegistryID.description'] + ', ', '')
    throw new UB.UBAbort(`<<<${UB.i18n('У документах нарахування: ') + warnTxt + UB.i18n('\nбув використаний вказаний вид роботи! Видалити неможливо!')}>>>`)
  }
}
