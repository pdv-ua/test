const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeUpdate)

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams

  if (execParams.timeFrom) {
    execParams.timeFrom = dateService.formatDate(execParams.timeFrom, 'hh:nn')
  }
  if (execParams.timeTo) {
    execParams.timeTo = dateService.formatDate(execParams.timeTo, 'hh:nn')
  }
  if (execParams.recreationFrom) {
    execParams.recreationFrom = dateService.formatDate(execParams.recreationFrom, 'hh:nn')
  }
  if (execParams.recreationTo) {
    execParams.recreationTo = dateService.formatDate(execParams.recreationTo, 'hh:nn')
  }
}
