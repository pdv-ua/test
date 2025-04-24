const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')
const srchAttr = require('./hr_searchAttr')

me.entity.addMethod('select')

me.getConditions = function (dataType) {
  let res
  switch (dataType) {
    case 'String':
    case 'Text':
      res = {
        startWith: 'Починається з',
        like: 'Містить',
        equal: 'Дорівнює',
        isNull: 'Порожнє'
      }
      break
    case 'Int':
    case 'Float':
    case 'Currency':
    case 'DateTime':
    case 'Date':
      res = {
        equal: 'Дорівнює',
        more: 'Більше',
        moreEqual: 'Більше або дорівнює',
        less: 'Менше',
        lessEqual: 'Менше або дорівнює',
        isNull: 'Порожнє'
      }
      break
    case 'Boolean':
      res = {
        equal: 'Дорівнює',
        isNull: 'Порожнє'
      }
      break
    case 'Entity':
    case 'Enum':
      res = {
        equal: 'Дорівнює',
        in: 'Одне з',
        isNull: 'Порожнє'
      }
      break
    case 'Document':
      res = {
        isNull: 'Порожнє'
      }
      break
    case 'NotExistentEntity':
      res = {
        exists: 'Існує'
      }
  }
  return res
}

me.select = function (ctx) {
  let data = []
  let id = 1
  let searchTypes = srchAttr.getDataTypes()
  searchTypes.forEach(function (item) {
    let conditions = me.getConditions(item)
    conditions && Object.keys(conditions).forEach(function (fld) {
      data.push({ ID: id++, code: fld, name: conditions[fld], dataType: item })
    })
  })
  if (!ctx.mParams.orderList) {
    ctx.mParams.orderList = {
      name: {
        expression: '[name]',
        order: 'asc'
      }
    }
  }
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  return true
}
