const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeInsert)

function beforeInsert (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_people')
  if (execParams['peopleID.birthDate']) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: execParams.peopleID || previousValues.peopleID,
        birthDate: execParams['peopleID.birthDate']
      }
    })
  }

  delete execParams['dictKinshipKindID.name']
  delete execParams['peopleID.fullFIO']
  delete execParams['dictBenefitsKindID.name']
  delete execParams['peopleID.description']
  delete execParams['peopleID.birthDate']
  delete execParams['peopleID.age']
  delete execParams['peopleID.phoneMobile']
  delete execParams['peopleID.email']
  delete execParams['employeeID.fullFIO']
}
