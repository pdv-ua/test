const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')

me.entity.addMethod('select')

const operations = {
  exists: 'Існує',
  max: 'Макс.'
}

me.select = function (ctx) {
  let data = []
  let id = 1
  Object.keys(operations).forEach(function (fld) {
    data.push({ ID: id++, code: fld, name: operations[fld] })
  })
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  return true
}
