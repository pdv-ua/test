const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)
me.entity.addMethod('importMapDelete')

function beforeInsert (ctx) {
  const store = UB.DataStore('hr_importParams')
  ctx.mParams.execParams.ID = store.generateID()
}

me.importMapDelete = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_importMap')
  const importMap = UB.Repository('hr_importMap')
    .attrs(['ID', 'orgID'])
    .where('orgID', '=', mParams.orgID)
    .where('entityName', '=', mParams.entityName)
    .selectAsObject()
  importMap.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
}
