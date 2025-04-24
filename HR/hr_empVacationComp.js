const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const timeCostService = require('./modules/timeCostService')

me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)
me.on('delete:after', afterDelete)

function recalcVacPeriods (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const isDeleting = execParams.method === 'delete'
  if (!mParams.skipCalcFields && (execParams.dayComp !== undefined || isDeleting)) {
    let instanceData
    let empVacationPeriodID
    if (isDeleting) {
      empVacationPeriodID = mParams.empVacationPeriodID
    } else {
      instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
      empVacationPeriodID = execParams.empVacationPeriodID || instanceData.empVacationPeriodID
    }
    timeCostService.calcVacPeriods({
      mParams: {
        execParams: {
          ID: empVacationPeriodID
        }
      }
    })
  }
}

function afterInsert (ctx) {
  recalcVacPeriods(ctx)
}

function afterUpdate (ctx) {
  recalcVacPeriods(ctx)
}

function beforeDelete (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = UB.Repository(__entityName)
    .attrs('empVacationPeriodID')
    .selectById(execParams.ID)
  mParams.empVacationPeriodID = instanceData.empVacationPeriodID
}

function afterDelete (ctx) {
  ctx.mParams.execParams.method = 'delete'
  recalcVacPeriods(ctx)
}
