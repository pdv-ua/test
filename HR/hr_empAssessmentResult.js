// const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

const noNeedChangeDocFields = ['ID', 'mi_modifyUser', 'mi_modifyDate', 'mi_createUser', 'mi_createDate', 'mi_deleteDate',
  'orderState', 'fieldLastChangeDate', 'docLastChangeDate']

function changedDocFields (execParams) {
  const fieldNames = Object.keys(execParams)
  return fieldNames.some(field => !noNeedChangeDocFields.includes(field))
}

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  execParams.fieldLastChangeDate = new Date()
  if (execParams.document) {
    execParams.docLastChangeDate = new Date()
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const date = new Date()
  if (changedDocFields(execParams)) {
    execParams.fieldLastChangeDate = date
  } else {
    delete execParams.fieldLastChangeDate
  }
  if (execParams.document) {
    execParams.docLastChangeDate = date
  } else {
    delete execParams.docLastChangeDate
  }
}
