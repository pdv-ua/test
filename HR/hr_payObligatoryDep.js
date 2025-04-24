const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', validateDefault)
me.on('update:before', validateDefault)

function validateDefault (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const payObligatoryDep = UB.Repository(__entityName)
    .attrs(['ID'])
    .where('ID', '!=', execParams.ID)
    .where('payObligatoryID', '=', execParams.payObligatoryID || instanceData.payObligatoryID)
    .whereIf(execParams.departmentID !== null && (execParams.departmentID || instanceData.departmentID), 'departmentID', '=', execParams.departmentID || instanceData.departmentID)
    .whereIf(execParams.departmentID === null || (!execParams.departmentID && instanceData.departmentID === null), 'departmentID', 'isNull')
    .whereIf(execParams.positionID !== null && (execParams.positionID || instanceData.positionID), 'positionID', '=', execParams.positionID || instanceData.positionID)
    .whereIf(execParams.positionID === null || (!execParams.positionID && instanceData.positionID === null), 'positionID', 'isNull')
    .whereIf(execParams.dictPositionID !== null && (execParams.dictPositionID || instanceData.dictPositionID), 'dictPositionID', '=', execParams.dictPositionID || instanceData.dictPositionID)
    .whereIf(execParams.dictPositionID === null || (!execParams.dictPositionID && instanceData.dictPositionID === null), 'dictPositionID', 'isNull')
    .whereIf(execParams.employeeNumberID !== null && (execParams.employeeNumberID || instanceData.employeeNumberID), 'employeeNumberID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
    .whereIf(execParams.employeeNumberID === null || (!execParams.employeeNumberID && instanceData.employeeNumberID === null), 'employeeNumberID', 'isNull')
    .selectSingle()
  if (payObligatoryDep) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вже є запис з такими параметрами')}>>>`)
  }
}
