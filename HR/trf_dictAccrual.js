const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('updatePayEl')
me.entity.addMethod('updateRecord')
me.entity.addMethod('updateDictAccrualCond')

me.updatePayEl = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('trf_dictAccrual')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })

  data.add.forEach(ID => {
    const record = UB.Repository('trf_dictAccrual')
      .attrs('ID')
      .misc({ __allowSelectSafeDeleted: true })
      .where('payElID', '=', ID)
      .orderBy('ID')
      .selectSingle()
    if (record) {
      store.execSQL(`update trf_dictAccrual set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: record.ID })
    } else {
      store.run('insert', { execParams: { payElID: ID } })
    }
  })
}

me.updateRecord = function (ctx) {
  const mParams = ctx.mParams
  const execParams = JSON.parse(mParams.execParams)
  execParams.mi_modifyDate = new Date()
  UB.DataStore('trf_dictAccrual').run('update', {
    __skipOptimisticLock: true,
    execParams
  })
}

me.updateDictAccrualCond = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('trf_dictAccrualCond')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        dictAccrualDtID: mParams.dictAccrualDtID,
        conditionType: mParams.conditionType,
        orgID: mParams.conditionType === '1' ? ID : null,
        dictPositionID: mParams.conditionType === '3' ? ID : null,
        dictQualificationID: mParams.conditionType === '8' ? ID : null,
        dictSubjectID: mParams.conditionType === '9' ? ID : null,
        dictPupilID: mParams.conditionType === '10' ? ID : null
      }
    })
  })
}
