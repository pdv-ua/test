/* global ubs_numcounter */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.entity.addMethod('updateDictExperience')

me.updateDictExperience = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_dictExperienceDt')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        dictExperienceID: mParams.dictExperienceID,
        conditionType: mParams.conditionType,
        dictPositionID: mParams.conditionType === '3' ? ID : null,
        dictStaffCatID: mParams.conditionType === '2' ? ID : null,
        organizationID: mParams.conditionType === '1' ? ID : null
      }
    })
  })
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.code) {
    execParams.code = (ubs_numcounter.getRegnum(__entityName)).toString().padStart(2, '0')
  }
}
