/* global ubs_numcounter */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('sendToExecution')

me.details = [
  {
    detailName: 'employeeTaskDt',
    entityName: 'hr_employeeTaskDt',
    docIDName: 'employeeTaskID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID.description', 'taskDtState', 'answer', 'commentDt'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.taskNumber) {
    execParams.taskNumber = ubs_numcounter.getRegnum(__entityName + execParams.organizationID)
  }
}

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

function beforeDelete (ctx) {
  let detail = UB.Repository('hr_employeeTaskDt').attrs('ID').where('employeeTaskID', '=', ctx.mParams.execParams.ID).selectAsObject()
  detail.forEach(item => {
    UB.DataStore('hr_employeeTaskDt').run('delete', {
      execParams: {
        ID: item.ID
      }
    })
  })
}

me.sendToExecution = function sendToExecution (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams

  const selfItem = UB.Repository('hr_employeeTask')
    .attrs(['ID', 'mi_modifyDate', 'taskDateSent'])
    .selectById(execParams.ID)

  if (selfItem) {
    if (selfItem.taskDateSent) {
      return
    }

    const employeeTaskDtStore = UB.DataStore('hr_employeeTaskDt')
    const details = UB.Repository('hr_employeeTaskDt')
      .attrs(['ID', 'mi_modifyDate', 'taskDtState'])
      .where('employeeTaskID', '=', execParams.ID)
      .where('taskDtState', '!=', 'SENDED')
      .selectAsObject()

    details.forEach(ite => {
      employeeTaskDtStore.run('update', {
        execParams: {
          ID: ite.ID,
          mi_modifyDate: ite.mi_modifyDate,
          taskDtState: 'SENDED'
        }
      })
    })
    const curDate = new Date()
    const employeeTaskStore = UB.DataStore('hr_employeeTask')
    employeeTaskStore.run('update', {
      execParams: {
        ID: selfItem.ID,
        mi_modifyDate: selfItem.mi_modifyDate,
        taskDateSent: curDate
      }
    })
  }

  return true
}
