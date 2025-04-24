const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.on('beforedelete:after', ctx => {
  ctx.mParams.listParamsToCheck = ctx.dataStore.get('listParamID')
})

me.on('delete:after', ctx => {
  const cnt = UB.Repository('hr_reportParam')
    .where('[listParamID]', '=', ctx.mParams.listParamsToCheck)
    .attrs('COUNT(*)')
    .selectScalar()
  if (!cnt) {
    const idParams = UB.Repository('hr_idParam')
      .where('[listParamID]', '=', ctx.mParams.listParamsToCheck)
      .attrs(['ID'])
      .selectAsObject()
    idParams.forEach(row => {
      UB.DataStore('hr_idParam').run('delete', { execParams: { ID: row.ID } })
    })
    const valueParams = UB.Repository('hr_valuesParam')
      .where('[listParamID]', '=', ctx.mParams.listParamsToCheck)
      .attrs(['ID'])
      .selectAsObject()
    valueParams.forEach(row => {
      UB.DataStore('hr_valuesParam').run('delete', { execParams: { ID: row.ID } })
    })
    const isInDB = UB.Repository('hr_listParam') // row in hr_listParam can be safeDeleted - need to check
      .where('[ID]', '=', ctx.mParams.listParamsToCheck)
      .attrs('COUNT(*)')
      .selectScalar()
    if (isInDB) {
      UB.DataStore('hr_listParam').run('delete', { execParams: { ID: ctx.mParams.listParamsToCheck } })
    }
  }
})
