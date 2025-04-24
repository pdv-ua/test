const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
me.entity.addMethod('saveSelection')

me.saveSelection = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const codes = mParams.codes
  const oldRecs = UB.Repository(__entityName)
    .attrs(['ID', 'params'])
    .where('orgID', '=', orgID)
    .selectSingle()
  const store = UB.DataStore(__entityName)
  if (oldRecs) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: oldRecs.ID,
        params: JSON.stringify(codes)
      }
    })
  } else {
    store.run('insert', {
      execParams: {
        ID: store.generateID(),
        params: JSON.stringify(codes),
        orgID: orgID
      }
    })
  }
}
