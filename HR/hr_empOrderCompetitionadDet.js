// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
// const accrualService = require('../HR/modules/accrualService')
me.on('insert:before', beforeInsert)
// me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
// me.on('delete:before', beforeDelete)

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    [
      'departmentID.description',
      'organizationID.name'
    ], '^', true).split('^')
  execParams.description = parts[0] || parts[1]
  execParams.title = parts[0] || parts[1]
}

function beforeInsert (ctx) {
  //   checkDuplicates(ctx)
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  //   checkDuplicates(ctx)
  setDescription(ctx)
}
