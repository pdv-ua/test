const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeSave)
me.on('update:before', beforeSave)
me.on('delete:before', beforeDelete)

function beforeSave (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const storeListParam = UB.DataStore('hr_listParam')
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || null

  // if update
  if (instanceData) {
    // to fix value
    if (execParams.exportFieldsID === null && instanceData.listParamsIds) {
      clearListParams(instanceData)
      execParams.listParamsIds = null
    }
    // from fix value
    else if (execParams.exportFieldsID && !instanceData.listParamsIds) {
      tryInsertListParams(execParams, instanceData)
    }
    // change exportFields
    else if (execParams.exportFieldsID && instanceData.listParamsIds) {
      clearListParams(instanceData)
      tryInsertListParams(execParams, instanceData)
    }
    // update name
    else {
      const _listParamsIds = JSON.parse(instanceData.listParamsIds)
      if (_listParamsIds) {
        _listParamsIds.forEach(row => {
          const entityDescription = row.pfx ? row.pfx : App.domainInfo.entities[row.tn].description
          storeListParam.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.pid,
              code: (execParams.name || '').substring(0, 32),
              fullName: (`${entityDescription} (${execParams.name})`).substring(0, 200),
              shortName: (`${entityDescription} (${execParams.name})`).substring(0, 100)
            }
          })
        })
      }
    }
  }
  // if insert
  else if (execParams.exportFieldsID) {
    tryInsertListParams(execParams)
  }
}

function beforeDelete (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  clearListParams(instanceData)
}

function clearListParams (instanceData) {
  if (instanceData.listParamsIds) {
    const storeListParam = UB.DataStore('hr_listParam')
    const _listParamsIds = JSON.parse(instanceData.listParamsIds)
    if (_listParamsIds) {
      _listParamsIds.forEach(row => {
        const listParamExists = UB.Repository('hr_listParam').attrs('ID').selectById(row.pid)
        if (listParamExists) {
          storeListParam.run('delete', {
            execParams: { ID: row.pid }
          })
        }
      })
    }
  }
}

function tryInsertListParams (execParams, instanceData) {
  const storeListParam = UB.DataStore('hr_listParam')
  const exportFields = UB.Repository('hr_exportFields')
    .attrs(['ID', 'code', 'name', 'type', 'tableName', 'tableName1', 'requiredTables'])
    .where('requiredTables', 'isNotNull')
    .selectById(execParams.exportFieldsID)
  if (exportFields) {
    if (exportFields.requiredTables) {
      const _requiredTables = JSON.parse(exportFields.requiredTables)
      const _listParamsIds = []
      _requiredTables.forEach(row => {
        const paramID = storeListParam.generateID()
        const entityDescription = row.pfx ? row.pfx : App.domainInfo.entities[row.tn].description

        storeListParam.run('insert', {
          __skipOptimisticLock: true,
          execParams: {
            ID: paramID,
            code: (execParams.name || instanceData.name || '').substring(0, 32),
            fullName: (`${entityDescription} (${execParams.name || instanceData.name || ''})`).substring(0, 200),
            shortName: (`${entityDescription} (${execParams.name || instanceData.name || ''})`).substring(0, 100),
            tableName: row.tn
          }
        })
        const p = Object.assign({}, row)
        p.pid = paramID
        _listParamsIds.push(p)
      })

      if (_listParamsIds.length) {
        execParams.listParamsIds = JSON.stringify(_listParamsIds)
      }
    }
  }
}
