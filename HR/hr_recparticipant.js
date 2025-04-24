const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.on('delete:before', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.mParams.recStageID = instanceData.recStageID || UB.Repository(__entityName).attrs('recStageID').where('ID', '=', ctx.mParams.execParams.ID).selectScalar()
})

me.on('delete:after', ctx => {
  global.hr_recstage.saveEmployeeList(ctx.mParams.recStageID, null)
})

me.on('update:after', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  global.hr_recstage.saveEmployeeList(instanceData.recStageID, ctx.mParams.execParams.ID)
})

me.on('insert:after', ctx => {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  global.hr_recstage.saveEmployeeList(instanceData.recStageID, ctx.mParams.execParams.ID)
})

me.on('insert:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  if (execParams.employeePosition) {
    execParams.positionID = UB.Repository('hr_employeePositionS').attrs(['positionID']).where('ID', '=', execParams.employeePosition).selectScalar() || null
    execParams.plannedEmployeePosition = execParams.employeePosition
  }
  const item = UB.Repository('hr_recstage').attrs(['mi_wfState', 'docID', 'orderIndex', 'entityName', 'ID']).selectById(execParams.recStageID)
  if (!['CANCELED', 'REJECTED', 'NEW'].includes(item.mi_wfState)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Редагування заборонено')}>>>`)
  }
})

me.on('update:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  if (execParams.employeePosition) {
    execParams.positionID = UB.Repository('hr_employeePositionS').attrs(['positionID']).where('ID', '=', execParams.employeePosition).selectScalar()
    let resolution = execParams.resolution || UB.Repository('hr_recparticipant').attrs(['resolution']).where('ID', '=', execParams.ID).selectScalar()
    if (['CANCELED', 'REJECTED', 'NEW'].includes(resolution) && !execParams.plannedEmployeePosition) {
      execParams.plannedEmployeePosition = execParams.employeePosition
    }
  }

  if (!['CANCELED', 'REJECTED', 'NEW'].includes(execParams.resolution)) {
    const item = UB.Repository(__entityName).attrs(['recStageID.mi_wfState', 'resolution']).where('ID', '=', execParams.ID).selectSingle()
    if (ctxt.externalCall) {
      if (!['CANCELED', 'REJECTED', 'NEW'].includes(item['recStageID.mi_wfState'])) {
        throw new UB.UBAbort(`<<<${UB.i18n('Редагування заборонено')}>>>`)
      }
      if (item.resolution !== 'NEW') {
        throw new UB.UBAbort(`<<<${UB.i18n('Редагування заборонено')}>>>`)
      }
    }
  }
})

me.on('delete:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  const item = UB.Repository(__entityName).attrs(['recStageID.mi_wfState', 'resolution']).where('ID', '=', execParams.ID).selectSingle()
  if (ctxt.externalCall) {
    if (!['CANCELED', 'REJECTED', 'NEW'].includes(item['recStageID.mi_wfState'])) {
      throw new UB.UBAbort(`<<<${UB.i18n('Видалення заборонено')}>>>`)
    }
    if (item.resolution !== 'NEW') {
      throw new UB.UBAbort(`<<<${UB.i18n('Видалення заборонено')}>>>`)
    }
  }
  let taskList = UB.Repository('hr_task').attrs(['ID']).where('participantID', '=', execParams.ID).selectAsObject()
  if (taskList.length) {
    let taskStore = UB.DataStore('hr_task')
    taskList.forEach(item => {
      taskStore.run('delete', { execParams: { ID: item.ID } })
    })
  }
})
