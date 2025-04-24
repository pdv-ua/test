const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

function beforeInsert (ctx) {
  entityService.setAttrs(ctx)
  const execParams = ctx.mParams.execParams
  validateData(execParams)
}

function beforeUpdate (ctx) {
  entityService.setAttrs(ctx)
  if (ctx.mParams.skipUpdate || !(ctx.mParams.execParams.dateFrom || ctx.mParams.execParams.dateTo)) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }

  validateData(execParams, instanceData)
}

function beforeDelete (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let date = UB.Repository(__entityName)
    .attrs(['dateFrom', 'dateTo'])
    .where('ID', '=', instanceData.ID)
    .selectSingle()
  let res = UB.Repository(__entityName)
    .attrs(['ID'])
    .where('dateFrom', '<', date.dateFrom)
    .where('ID', '!=', instanceData.ID)
    .orderBy('dateFrom', 'desc')
    .selectSingle()
  if (res) {
    const sumFuneralStore = UB.DataStore(__entityName)
    sumFuneralStore.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: res.ID,
        dateTo: date.dateTo
      }
    })
  }
}

function validateData (execParams, instanceData) {
  const dateFrom = dateService.shiftDate(execParams.dateFrom) || instanceData.dateFrom
  if (execParams.dateFrom) {
    let res = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('dictWorkTypeID', '=', execParams.dictWorkTypeID || instanceData.dictWorkTypeID)
      .where('dateFrom', '=', dateFrom)
      .selectSingle()
    if (res) { throw new UB.UBAbort(`<<<${UB.i18n('Дата початку {0} вже існує')}>>>`, dateService.formatDate(dateFrom)) }
    res = UB.Repository(__entityName)
      .attrs(['dateFrom'])
      .where('dictWorkTypeID', '=', execParams.dictWorkTypeID || instanceData.dictWorkTypeID)
      .where('dateFrom', '>', dateFrom)
      .where('dateFrom', '!=', instanceData ? instanceData.dateFrom : dateFrom)
      .orderBy('dateFrom', 'asc')
      .selectSingle()
    if (res) {
      execParams.dateTo = dateService.shiftDate(dateService.priorDay(res.dateFrom))
      execParams.dateToEmpty = execParams.dateTo
    }
    res = UB.Repository(__entityName)
      .attrs(['ID', 'dateTo'])
      .where('dateFrom', '<', dateFrom)
      .where('dictWorkTypeID', '=', execParams.dictWorkTypeID || instanceData.dictWorkTypeID)
      .orderBy('dateFrom', 'desc')
      .selectSingle()
    if (res) {
      let dateTo = dateService.shiftDate(dateService.priorDay(dateFrom))
      let sumFuneralStore = UB.DataStore(__entityName)
      sumFuneralStore.run('update', {
        __skipOptimisticLock: true,
        skipUpdate: true,
        execParams: {
          ID: res.ID,
          dateTo: dateTo
        }
      })
    }
  } else {
    let dateTo = dateService.shiftDate(execParams.dateTo)
    if (dateFrom <= dateTo) { throw new UB.UBAbort(`<<<${UB.i18n('Дата початку {0} не може бути меншою за дату по {1}', dateService.formatDate(dateFrom), dateService.formatDate(dateTo))}>>>`) }
    let res = UB.Repository(__entityName)
      .attrs(['dateFrom'])
      .where('dictWorkTypeID', '=', execParams.dictWorkTypeID || instanceData.dictWorkTypeID)
      .where('dateFrom', '>', dateFrom)
      .orderBy('dateFrom', 'asc')
      .selectSingle()
    if (res) {
      execParams.dateTo = dateService.shiftDate(dateService.priorDay(res.dateFrom))
      execParams.dateToEmpty = execParams.dateTo
    }
  }
}
