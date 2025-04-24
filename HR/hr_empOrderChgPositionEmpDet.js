const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('checkBeforeCancelPosting')

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetEmpOrderType: true
  })
}

function beforeInsert (ctx) {
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

me.checkBeforeCancelPosting = function (item) {
  let oldValues = item.changedValues
  if (!oldValues) return
  if (_.isString(oldValues)) {
    oldValues = JSON.parse(oldValues)
  }
  if (oldValues.inserted && _.isArray(oldValues.inserted)) {
    oldValues.inserted.forEach(item => {
      const entName = Object.keys(item)[0]
      if (entName === 'hr_employeePosition') {
        const ID = item[entName]
        const posData = UB.Repository(entName).attrs(['dateTo', 'employeeNumberID']).selectById(ID)
        if (posData) {
          const lastPos = UB.Repository(entName)
            .attrs(['ID', 'description'])
            .where('employeeNumberID', '=', posData.employeeNumberID)
            .where('dateFrom', '>', posData.dateTo)
            .selectSingle()
          if (lastPos) {
            throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе. Для працівника {0} були зроблені зміни іншим наказом', lastPos.description)}>>>`)
          }
        }
      }
    })
  }
}
