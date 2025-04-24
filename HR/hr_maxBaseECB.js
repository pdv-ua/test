const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  validateData(execParams)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.skipUpdate || !ctx.mParams.execParams.dateFrom) {
    return
  }
  const execParams = ctx.mParams.execParams
  validateData(execParams)
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  let dateFrom = instanceData.get('dateFrom')
  let dateTo = instanceData.get('dateTo')
  let res = UB.Repository(__entityName)
    .attrs(['ID'])
    .where('dateFrom', '<', dateFrom)
    .where('ID', '!=', instanceData.get('ID'))
    .orderBy('dateFrom', 'desc')
    .selectSingle()
  if (res) {
    const maxBaseStore = UB.DataStore(__entityName)
    maxBaseStore.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: res.ID,
        dateTo: dateTo
      }
    })
  }
}

function validateData (execParams) {
  const dateFrom = new Date(execParams.dateFrom)
  let res = UB.Repository(__entityName)
    .attrs(['ID'])
    .where('dateFrom', '=', dateFrom)
    .where('ID', '!=', execParams.ID)
    .selectSingle()
  if (res) { throw new UB.UBAbort(`<<<${UB.i18n('Дата початку {0} вже існує', dateService.formatDate(dateFrom))}>>>`) }
  res = UB.Repository(__entityName)
    .attrs(['dateFrom'])
    .where('dateFrom', '>', dateFrom)
    .where('ID', '!=', execParams.ID)
    .orderBy('dateFrom', 'asc')
    .selectSingle()
  if (res) {
    execParams.dateTo = new Date(dateService.priorDay(res.dateFrom))
  } else {
    execParams.dateTo = dateService.maxDate()
  }
  res = UB.Repository(__entityName)
    .attrs(['ID', 'dateTo'])
    .where('dateFrom', '<', dateFrom)
    .where('ID', '!=', execParams.ID)
    .orderBy('dateFrom', 'desc')
    .selectSingle()
  if (res) {
    let dateTo = new Date(dateService.priorDay(dateFrom))
    let maxBaseStore = UB.DataStore(__entityName)
    maxBaseStore.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: res.ID,
        dateTo: dateTo
      }
    })
  }
}
