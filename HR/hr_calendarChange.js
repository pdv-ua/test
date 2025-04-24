const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterInsert)
me.on('delete:after', afterInsert)

me.entity.addMethod('updateCalendarChangeDt')

function afterInsert () {
  calcService.addCalcPlanQueue({ entityName: 'hr_calendarChange' })
}

function validatePeriod (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.changeDateFrom) {
    execParams.changeDateFrom = dateService.shiftDate(execParams.changeDateFrom)
  }
  if (execParams.changeDateTo) {
    execParams.changeDateTo = dateService.shiftDate(execParams.changeDateTo)
  }

  const changeDateFrom = dateService.shiftDate(execParams.changeDateFrom || instanceData.changeDateFrom)
  const changeDateTo = dateService.shiftDate(execParams.changeDateTo || instanceData.changeDateTo)

  if (changeDateFrom.getTime() === changeDateTo.getTime()) {
    throw new UB.UBAbort(`<<<${UB.i18n('День, який переноситься {0} не може дорівнювати дню, на який переноситься {1}. Збереження неможливо!', dateService.formatDate(changeDateFrom), dateService.formatDate(changeDateTo))}>>>`)
  }

  if (Math.abs(dateService.monthDiff(changeDateFrom, changeDateTo)) > 1) {
    throw new UB.UBAbort(`<<<${UB.i18n('День, який переноситься {0} та день, на який переноситься {1} повинні належати одному місяцю або сусіднім. Збереження неможливо!', dateService.formatDate(changeDateFrom), dateService.formatDate(changeDateTo))}>>>`)
  }

  const exists = UB.Repository('hr_calendarChange')
    .attrs(['changeDateFrom', 'changeDateTo'])
    .where('ID', '<>', execParams.ID, 'ID')
    .where('changeDateFrom', '=', changeDateFrom, 'changeDateFromFrom')
    .where('changeDateTo', '=', changeDateFrom, 'changeDateFromTo')
    .where('changeDateFrom', '=', changeDateTo, 'changeDateToFrom')
    .where('changeDateTo', '=', changeDateTo, 'changeDateToTo')
    .notExists(UB.Repository('hr_calendarChangeDt')
      .correlation('calendarChangeID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .orderBy('changeDateFrom')
    .orderBy('changeDateTo')
    .logic('([ID] AND ([changeDateFromFrom] OR [changeDateFromTo] OR [changeDateToFrom] OR [changeDateToTo]) and [notOrg])')
    .selectAsObject()

  if (exists.length) {
    const data = exists[0]
    const existChangeDateFrom = dateService.formatDate(data.changeDateFrom)
    const currentChangeDateFrom = dateService.formatDate(changeDateFrom)
    const existChangeDateTo = dateService.formatDate(data.changeDateTo)
    const currentChangeDateTo = dateService.formatDate(changeDateTo)
    if (existChangeDateFrom === currentChangeDateFrom) {
      throw new UB.UBAbort(`<<<${UB.i18n('Існує інший запис, у якому день, який переноситься {0} дорівнює дню, який переноситься {1} поточного запису. Збереження неможливо!', existChangeDateFrom, currentChangeDateFrom)}>>>`)
    }
    if (existChangeDateTo === currentChangeDateFrom) {
      throw new UB.UBAbort(`<<<${UB.i18n('Існує інший запис, у якому день, на який переноситься {0} дорівнює дню, який переноситься {1} поточного запису. Збереження неможливо!', existChangeDateTo, currentChangeDateFrom)}>>>`)
    }
    if (existChangeDateFrom === currentChangeDateTo) {
      throw new UB.UBAbort(`<<<${UB.i18n('Існує інший запис, у якому день, який переноситься {0} дорівнює дню, на який переноситься {1} поточного запису. Збереження неможливо!', existChangeDateFrom, currentChangeDateTo)}>>>`)
    }
    if (existChangeDateTo === currentChangeDateTo) {
      throw new UB.UBAbort(`<<<${UB.i18n('Існує інший запис, у якому день, на який переноситься {0} дорівнює дню, на який переноситься {1} поточного запису. Збереження неможливо!', existChangeDateTo, currentChangeDateTo)}>>>`)
    }
  }
}

function beforeInsert (ctx) {
  validatePeriod(ctx)
}

function beforeUpdate (ctx) {
  validatePeriod(ctx)
}

me.updateCalendarChangeDt = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_calendarChangeDt')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        calendarChangeID: mParams.calendarChangeID,
        orgID: ID
      }
    })
  })
  calcService.addCalcPlanQueue({ entityName: 'hr_calendarChange' })
}
