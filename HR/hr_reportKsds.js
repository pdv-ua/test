const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const storeService = require('../AC/modules/dataServices/localStoreService')

me.entity.addMethod('selectWithVacCount')

me.selectWithVacCount = function (ctx) {
  const mParams = ctx.mParams
  const calcFields = ['mtCount', 'vacCount']
  let oldFieldList = _.clone(mParams.fieldList)
  if (mParams.options.noLimit) {
    delete mParams.options.limit
  }
  mParams.fieldList = mParams.fieldList.filter(field => { return !calcFields.includes(field) })
  const whereList = mParams.whereList
  const whereKeys = Object.keys(whereList)
  for (let i = 0; i < whereKeys.length; i++) {
    let key = whereKeys[i]
    if (whereList[key].expression.includes('vacCount')) {
      delete whereList[key]
    }
  }
  const orderList = mParams.orderList
  const orderKeys = Object.keys(orderList)
  orderKeys.length && orderKeys.forEach(key => {
    let expr = orderList[key].expression.replace(/[[\]]/g, '')
    if (calcFields.includes(expr)) {
      delete orderList[key]
    }
  })
  let data = storeService.repositorySelect(ctx, 'hr_position')
  mParams.fieldList = oldFieldList
  data = storeService.formDataByFieldList(data, oldFieldList)
  storeService.initArrayToStore(ctx.dataStore, data, mParams)
  mParams.__totalRecCount = data.length
  ctx.inherited = false
  return true
}
