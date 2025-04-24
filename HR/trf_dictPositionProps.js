/* global */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updateDictPositionProps')

me.updateDictPositionProps = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('trf_dictPositionProps')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        dictPositionID: ID,
        subject: '2',
        pupil: '2'
      }
    })
  })
}
