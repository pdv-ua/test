const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.details = [
  {
    detailName: 'entryAcc',
    entityName: 'hr_entryAcc',
    docIDName: 'entryOperationID',
    fieldList: orderService.setFieldListAttribute([
      'dictFundSourceID.name', 'accountDtID.code', 'operPeriod', 'operSum', 'isReversal', 'excludeOrg', 'excludeDepartment',
      'excludeFundSource', 'excludeWorkPlace', 'entryAccDt',
      'dimensionDt0.description', 'dimensionDt0Value.caption', 'dimensionDt1.description', 'dimensionDt1Value.caption',
      'dimensionDt2.description', 'dimensionDt2Value.caption', 'dimensionDt3.description', 'dimensionDt3Value.caption',
      'dimensionDt4.description', 'dimensionDt4Value.caption', 'dimensionDt5.description', 'dimensionDt5Value.caption',
      'dimensionDt6.description', 'dimensionDt6Value.caption', 'dimensionDt7.description', 'dimensionDt7Value.caption',
      'dimensionDt8.description', 'dimensionDt8Value.caption', 'dimensionDt9.description', 'dimensionDt9Value.caption',
      'accountKtID.code',
      'dimensionKt0.description', 'dimensionKt0Value.caption', 'dimensionKt1.description', 'dimensionKt1Value.caption',
      'dimensionKt2.description', 'dimensionKt2Value.caption', 'dimensionKt3.description', 'dimensionKt3Value.caption',
      'dimensionKt4.description', 'dimensionKt4Value.caption', 'dimensionKt5.description', 'dimensionKt5Value.caption',
      'dimensionKt6.description', 'dimensionKt6Value.caption', 'dimensionKt7.description', 'dimensionKt7Value.caption',
      'dimensionKt8.description', 'dimensionKt8Value.caption', 'dimensionKt9.description', 'dimensionKt9Value.caption'
    ], ['lineNum']),
    JSONAttr: ['entryAccDt']
  }
]

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}
