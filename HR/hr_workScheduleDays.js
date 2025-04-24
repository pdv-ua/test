const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const moment = require('moment')

function setTimeFields (ctx, fieldNames = []) {
  const { execParams } = ctx.mParams
  fieldNames.forEach(fieldName => {
    if (execParams[fieldName] && execParams[fieldName].length !== 5) {
      const field = moment(execParams[fieldName])
      if (field.isValid()) {
        execParams[fieldName] = field.format('HH:mm')
      }
    }
  })
}
me.on('insert:before', ctx => {
  setTimeFields(ctx, ['timeFrom', 'timeTo', 'recreationFrom', 'recreationTo'])
})
me.on('update:before', ctx => {
  setTimeFields(ctx, ['timeFrom', 'timeTo', 'recreationFrom', 'recreationTo'])
})
