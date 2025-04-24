const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('delete:before', beforeDelete)

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (ctx.externalCall === 1) {
    const sickDtData = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('empOrderSicknessID', '=', instanceData.get('empOrderSicknessID'))
      .selectAsObject()
    if (sickDtData.length <= 1) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити останній запис періоду звільнення від роботи.')}>>>`)
    }
  }
}
