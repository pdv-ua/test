const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')

module.exports = {
  getConditionSQL,
  isOrOperation
}

me.entity.addMethod('select')

const operations = {
  and: 'ТА',
  or: 'АБО',
  andNot: 'ТА ні',
  orNot: 'АБО ні'
}
const operationSql = {
  and: 'AND',
  or: 'OR',
  andNot: 'AND NOT',
  orNot: 'OR NOT'
}

function getConditionSQL (operation) {
  return operationSql[operation] || ''
}

function isOrOperation (operation) {
  return operation === 'or' || operation === 'orNot'
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
