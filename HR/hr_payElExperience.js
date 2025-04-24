const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityService = require('../HR/modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const payElExperienceStore = UB.DataStore('hr_payElExperience')
  entityService.setAttrs(ctx, false, {})
  const payElExperience = UB.Repository('hr_payElExperience')
    .attrs('ID', 'dateFrom', 'dateTo', 'years', 'months', 'mi_modifyDate')
    .where('payElID', '=', execParams.payElID)
    .where('dateTo', '>=', execParams.dateFrom)
    .where('ID', '!=', execParams.ID)
    .whereIf(execParams.years !== null && execParams.years, 'years', '=', execParams.years)
    .whereIf(execParams.months !== null && execParams.months, 'months', '=', execParams.months)
    .orderByDesc('dateTo')
    .selectSingle()
  if (payElExperience) {
    execParams.dateFrom = dateService.shiftDate(Math.max(new Date(), dateService.addDays(dateService.shiftDate(payElExperience.dateFrom), 1)))
    payElExperienceStore.run('update', {
      skipUpdate: true,
      execParams: {
        ID: payElExperience.ID,
        mi_modifyDate: payElExperience.mi_modifyDate,
        dateTo: dateService.addDays(execParams.dateFrom, -1)
      }
    })
  }

  entityService.checkPeriod(ctx, {})
}

function beforeUpdate (ctx) {
  let previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  entityService.checkPeriod(ctx, previousValues)
}
