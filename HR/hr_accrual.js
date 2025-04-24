const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.entity.addMethod('runQueue')

me.runQueue = function () {
  calcService.runNextElementQueue()
}
