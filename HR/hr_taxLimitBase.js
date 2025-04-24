const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.on('update:before', ctx => {
  const execParams = ctx.mParams.execParams
  if (execParams.yearFrom) {
    validateData(execParams.yearFrom)
  }
})
me.on('insert:before', ctx => {
  const execParams = ctx.mParams.execParams
  validateData(execParams.yearFrom)
})

function validateData (yearFrom) {
  const checkYear = UB.Repository('hr_taxLimitBase')
    .attrs('ID')
    .where('yearFrom', '=', yearFrom)
    .selectSingle()
  if (checkYear) throw new UB.UBAbort(`<<<${UB.i18n('Існує запис де рік початку {0}! Зберігти неможливо!', yearFrom)}>>>`)
}
