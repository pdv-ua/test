const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('copyRecord')

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const store = UB.DataStore(__entityName)
  const newID = store.generateID()
  entityBaseService.cloneInstance(__entityName, params.ID, {
    ID: newID
  })
  const dictRateTaxECB = UB.Repository('hr_dictRateTaxECB')
    .attrs(['ID'])
    .where('dictTypeTaxECBID', '=', params.ID)
    .selectAsObject()
  dictRateTaxECB.forEach(row => {
    entityBaseService.cloneInstance('hr_dictRateTaxECB', row.ID, {
      dictTypeTaxECBID: newID
    })
  })
  ctx.mParams.newID = newID
}
