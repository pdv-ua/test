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
    detailName: 'gridDictTechMaterial',
    entityName: 'hr_dictTechMaterial',
    docIDName: 'dictTechID',
    fieldList: documentService.setFieldListAttribute([
      'lineNum', 'nomenclatureID', 'nomenclatureID.description', 'quantity', 'nomenclatureID.dictMeasureID.symbolUkr'
    ], ['lineNum']),
    orderBy: 'lineNum'
  },
  {
    detailName: 'gridDictTechOperation',
    entityName: 'hr_dictTechOperation',
    docIDName: 'dictTechID',
    fieldList: documentService.setFieldListAttribute([
      'lineNum', 'dictWorkOperationID', 'dictWorkOperationID.description', 'quantity',
      'dictWorkOperationID.dictMeasureID.symbolUkr', 'employeeNumberID', 'employeeNumberID.description'
    ], ['lineNum']),
    orderBy: 'orderNumber'
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
//   if (UB.Repository('hr_employeePositionS')
//     .attrs(['ID'])
//     .where('workScheduleID', '=', ctx.mParams.execParams.ID)
//     .selectSingle()) {
//     throw new UB.UBAbort(`<<<${UB.i18n('Графік роботи не може бути видалений, так як використовується в призначеннях працівників.')}>>>`)
//   }
}
