const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('update:before', beforeUpdate)

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  if (execParams.empVacationPeriodID) {
    /* UBHR-9108, виправлення помилки ubcombobox в гріді: для однакових empVacationPeriodID.description підтягується 1-е знайдене empVacationPeriodID */
    delete execParams.empVacationPeriodID
  }
}
