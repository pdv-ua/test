const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('delete:before', beforeDelete)

me.entity.addMethod('canEditActive')

me.canEditActive = function () {} // метод для перевірки прав на встановлення ознаки дії

function beforeDelete (ctx) {
  const isActive = ctx.dataStore.get('isActive')
  const canEditActive = me.entity.haveAccessToMethod('canEditActive')
  if (isActive && !canEditActive) {
    throw new UB.UBAbort(`<<<${UB.i18n('Access deny')}>>>`)
  }
}
