const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.ID && execParams.isMain) {
    resetIsMain(execParams.ID)
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.ID && execParams.isMain) {
    resetIsMain(execParams.ID)
  }
}

function resetIsMain (ID) {
  const dictPart = UB.Repository('trf_dictPart').attrs(['ID'])
    .where('ID', '<>', ID)
    .selectAsObject()
  dictPart.forEach(row => {
    const store = UB.DataStore('trf_dictPart')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        isMain: false
      }
    })
  })
}
