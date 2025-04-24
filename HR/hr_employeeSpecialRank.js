const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  calcDayNext(ctx)
  replaceRankType(ctx)
}

function beforeUpdate (ctx) {
  calcDayNext(ctx)
  replaceRankType(ctx)
}

function replaceRankType (ctx) {
  const execParams = ctx.mParams.execParams
  delete execParams['dictSpecialRankID.rankType']
}

function calcDayNext (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const dictSpecialRankID = instanceData.dictSpecialRankID || execParams.dictSpecialRankID
  const dateFrom = instanceData.dateFrom || execParams.dateFrom
  const { nextRankMonth } = UB.Repository('hr_dictSpecialRank')
    .attrs('nextRankMonth')
    .selectById(dictSpecialRankID)
  if (nextRankMonth) {
    execParams.dateNext = dateService.addMonths(dateFrom, nextRankMonth)
  }
}
