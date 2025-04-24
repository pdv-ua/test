const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updateAttrEntry')

me.updateAttrEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore(__entityName)

  const attrEntry = UB.Repository(__entityName)
    .attrs('*')
    .selectAsObject()

  attrEntry.forEach(row => {
    const item = data.find(o => o.empOrderType === row.empOrderType && o.attrName === row.attrName)
    if (!item) {
      store.run('delete', { execParams: { ID: row.ID } })
    }
  })

  data.forEach(item => {
    const row = attrEntry.find(o => o.empOrderType === item.empOrderType && o.attrName === item.attrName)
    if (!row) {
      store.run('insert', {
        execParams: {
          empOrderType: item.empOrderType,
          attrName: item.attrName
        }
      })
    }
  })
}
