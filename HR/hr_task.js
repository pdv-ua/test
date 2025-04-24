/* global UB */
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const Session = require('@unitybase/ub').Session
const { tackComplete } = require('./modules/reconciliationProcess')
const { acquaintanceTackComplete } = require('./modules/acquaintanceProcess')
const allowedResolutions = ['NEW', 'ACCEPTED', 'REJECTED']

me.entity.addMethod('setResolution')
me.entity.addMethod('massProcessingTasks')

me.on('insert:before', insertBefore)
me.on('update:before', updateBefore)
me.on('update:after', updateAfter)

function insertBefore (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.resolution && !allowedResolutions.includes(execParams.resolution)) {
    throw new UB.UBAbort('Invalid resolution')
  }
}

function updateBefore (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.resolution && !allowedResolutions.includes(execParams.resolution)) {
    throw new UB.UBAbort('Invalid resolution')
  }
  if (execParams.resolution && execParams.resolution !== 'NEW') {
    execParams.mi_wfState = 'CLOSED'
  }
  if (execParams.resolution === 'REJECTED') {
    const task = UB.Repository('hr_task')
      .attrs(['ID', 'docID'])
      .selectById(execParams.ID)
    const storeHistory = UB.DataStore('hr_orderStateHistory')
    storeHistory.run('insert', {
      execParams: {
        orderID: task.docID,
        userID: Session.userID,
        actionDateTime: dateService.unshiftDate(dateService.currentDateTime()),
        comments: execParams.resolutionText,
        actionType: 'REJECTED',
        orderState: 'RETURNED_FROM_RECONCILATION'
      }
    })
  }
  if (execParams.resolution === 'ACCEPTED') {
    setPrevParticipant(execParams.ID)
  }
}
function setPrevParticipant (taskID) {
  const curTask = UB.Repository('hr_task')
    .attrs(['participantID', 'docID'])
    .selectById(taskID)
  const participants = UB.Repository('hr_recparticipant')
    .attrs(['*', 'employeePosition.employeeID.shortFIO'])
    .where('ID', '<>', curTask.participantID)
    .where('resolution', '<>', 'ACCEPTED')
    .where('recStageID.docID', '=', curTask.docID)
    .where('recStageID.entityName', '=', 'hr_recstage')
    .selectAsObject()
  participants.forEach(participant => {
    UB.DataStore('hr_recparticipant').run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: participant.ID,
        executionDate: dateService.unshiftDate(dateService.currentDateTime()),
        prevParticipantID: curTask.participantID
      }
    })
  })
}
function updateAfter (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.mi_wfState === 'CLOSED') {
    const task = UB.Repository('hr_task')
      .attrs(['participantID.recStageID.entityName'])
      .where('ID', '=', execParams.ID)
      .selectSingle({ 'participantID.recStageID.entityName': 'participantEntityName' })

    switch (task.participantEntityName) {
      case 'hr_recstage':
        tackComplete(execParams.ID)
        break
      case 'hr_acquaintanceList':
        acquaintanceTackComplete(execParams.ID)
        break
      default:
        tackComplete(execParams.ID)
    }
  }
}

me.rls = function () {
  return '(1=1)'
}
function setResolution (ctx) {
  const { ID, resolution } = ctx.mParams
  const task = UB.Repository('hr_task')
    .attrs(['ID', 'docID', 'docID.empOrderType', 'participantID', 'participantID.recStageID.stageKind'])
    .selectById(ID)
  const rectages = UB.Repository('hr_recstage')
    .attrs(['ID', 'mi_wfState'])
    .where('docID', '=', task.docID)
    .selectAsObject()

  const currentEmployeeNumberID = UB.Session.uData.employeeNumberID !== -1 ? UB.Session.uData.employeeNumberID : null
  if (currentEmployeeNumberID) {
    const date = dateService.currentTruncDate()
    const currEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('employeeNumberID', '=', currentEmployeeNumberID)
      .where('dateFrom', '<=', date)
      .where('dateTo', '>=', date)
      .where('isActive', '=', 1)
      .selectAsObject()

    if (currEmployeePosition.length) {
      UB.DataStore('hr_recparticipant').run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: task['participantID'],
          executionDate: dateService.unshiftDate(dateService.currentDateTime()),
          tempExecEmpPosition: currEmployeePosition[0]['ID']
        }
      })
    }
  }
  const isAllRectageCompleted = rectages.every(recstage => recstage['mi_wfState'] === 'COMPLETED')
  const isSomeRectageRejected = rectages.some(recstage => recstage['mi_wfState'] === 'REJECTED')
  const store = UB.DataStore(me.entity.name)
  if (!allowedResolutions.includes(resolution)) {
    throw new UB.UBAbort('Invalid resolution')
  }
  store.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID,
      resolution,
      executionDate: dateService.unshiftDate(dateService.currentDateTime()),
      mi_wfState: 'CLOSED'
    }
  })
  if (resolution === 'ACCEPTED') {
    const storeHistory = UB.DataStore('hr_orderStateHistory')
    storeHistory.run('insert', {
      execParams: {
        orderID: task.docID,
        userID: Session.userID,
        actionDateTime: dateService.unshiftDate(dateService.currentDateTime()),
        actionType: ['SIGN', 'ACQUAINTANCELIST_SIGN'].includes(task['participantID.recStageID.stageKind']) ? 'SIGNED' : 'RECONCILED',
        orderState: isAllRectageCompleted ? 'RECONCILED' : 'ON_RECONCILATION'
      }
    })
  }
  if (
    // task['participantID.recStageID.stageKind'] === 'VISA' &&
    task['docID.empOrderType'] === 'REQUEST' &&
    // resolution === 'ACCEPTED' &&
    isAllRectageCompleted
  ) {
    UB.DataStore('hr_request')
      .run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: task['docID'],
          requestState: 'AGREED'
        }
      })
  }
  if (
    // task['participantID.recStageID.stageKind'] === 'VISA' &&
    task['docID.empOrderType'] === 'REQUEST' && isSomeRectageRejected
    // resolution === 'REJECTED'
  ) {
    UB.DataStore('hr_request')
      .run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: task['docID'],
          requestState: 'REJECTED'
        }
      })
  }
}
me.setResolution = function (ctx) {
  setResolution(ctx)
}

me.massProcessingTasks = (ctx) => {
  const { mParams } = ctx
  const docIDs = JSON.parse(mParams.IDs)
  // const tasks = UB.Repository('hr_task')
  //   .attrs(['*'])
  //   .where('ID', 'in', docIDs)
  //   .selectAsObject()
  docIDs.forEach(o => {
    ctx.mParams.ID = o
    setResolution(ctx)
  })
}
