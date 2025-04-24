const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const documentService = require('../AC/modules/entityServices/documentService')

me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)
me.on('delete:before', beforeDelete)

me.details = [
  {
    detailName: 'gridDictWorkOperationDt',
    entityName: 'hr_dictWorkOperationDt',
    docIDName: 'dictWorkOperationID',
    fieldList: documentService.setFieldListAttribute([
      // 'lineNum',
      'quantity', 'rate'
    ], ['lineNum']),
    orderBy: 'quantity'
  }
]

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  documentService.saveDetails(ctx, me.details)
  ctx.mParams.detail = documentService.getEntityDetail(execParams.ID, me.details)
}

function beforeUpdate (ctx) {
  documentService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = documentService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = documentService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeDelete (ctx) {
}
