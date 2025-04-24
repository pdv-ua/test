const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const UB = require('@unitybase/ub')

me.entity.addMethod('updateValuesIDs')
me.entity.addMethod('deleteRecordsByCode')
me.entity.addMethod('updateEntryOperationIDs')

me.on('select:before', ctx => {
  const idx = ctx.mParams.fieldList.indexOf('descriptionID.description')
  if (idx >= 0) {
    ctx.mParams.addDescription = true
    ctx.mParams.srcFieldList = ctx.mParams.fieldList
    ctx.mParams.fieldList = ctx.mParams.fieldList.filter(fld => fld !== 'descriptionID.description')
  }
})

me.on('select:after', ctx => {
  if (ctx.mParams.addDescription && ctx.mParams.tableNameForMapping) {
    const data = JSON.parse(ctx.dataStore.asJSONObject)
    const dict = UB.Repository(ctx.mParams.tableNameForMapping)
      .where('ID', 'in', data.map(row => row.descriptionID))
      .attrs(['ID', 'description'])
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    const hash = dict.reduce((accum, row) => {
      accum[row.ID] = row.description
      return accum
    }, {})
    data.forEach(row => {
      row['descriptionID.description'] = hash[row.descriptionID]
    })
    ctx.dataStore.initialize(data, ctx.mParams.srcFieldList)
  }
})

me.on('insert:before', ctx => {
  const { execParams } = ctx.mParams
  if (!Object.keys(execParams).indexOf('orderN') < 0) {
    execParams.orderN = UB.Repository('hr_idParam')
      .where('[listParamID]', '=', execParams.listParamID)
      .attrs(['MAX([orderN])'])
      .selectScalar() || 0
    execParams.orderN++
  }
})

me.updateValuesIDs = ctx => {
  const { mParams } = ctx
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_idParam')
  if (data.remove) {
    data.remove.forEach(ID => {
      store.run('delete', { execParams: { ID: ID } })
    })
  }
  if (data.add) {
    data.add.forEach(rec => {
      store.run('insert', {
        execParams: {
          listParamID: mParams.listParamID,
          orgID: mParams.orgID,
          valuesID: (typeof rec === 'object') ? rec.ID : rec,
          orderN: (typeof rec === 'object') ? rec.orderN : null,
          userID: mParams.byUser ? mParams.userID : null
        }
      })
    })
  }
  if (data.update) {
    data.update.forEach(rec => {
      store.run('update', { __skipOptimisticLock: true, execParams: { ID: rec.ID, orderN: rec.orderN } })
    })
  }
}

me.deleteRecordsByCode = ctx => {
  const params = ctx.mParams.execParams
  const idParamDS = UB.DataStore('hr_idParam')
  UB.Repository('hr_idParam')
    .attrs('ID')
    .where('listParamID.code', '=', params.code)
    .where('orgID', '=', params.orgID)
    .whereIf(params.byUser, 'userID', '=', params.userID)
    .selectAsObject().forEach(item => {
      idParamDS.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
}

me.updateEntryOperationIDs = ctx => {
  const { mParams } = ctx
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_idParam')
  if (data.remove.length) {
    data.remove.forEach(ID => {
      store.run('delete', { execParams: { ID: ID } })
    })
  }
  if (data.add.length) {
    data.add.forEach(rec => {
      store.run('insert', {
        execParams: {
          listParamID: mParams.listParamID,
          orgID: mParams.orgID,
          entryOperationID: rec.entryOperationID,
          userID: mParams.byUser ? mParams.userID : null
        }
      })
    })
  }
}
