const messageService = require('../../HR/modules/messageService')
/* global UB TubDataStore */
module.exports = {
  startProcess,
  stopProcess,
  continueProcess,
  tackComplete
}
// const Session = require('@unitybase/ub').Session
function tackComplete (taskID) {
  ReconciliationProcess.tackComplete(taskID)
}

/**
 *
 * @param {Number} docID
 * @param {Boolean} [resetRoute=false]
 */
function stopProcess (docID, resetRoute) {
  let process = new ReconciliationProcess(docID)
  if (process.isPosted()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо виконати дію. Документ у стані "Опрацьовано"')}>>>`)
  }
  /* const authorID = UB.Repository(process.orderEntityName).attrs(['mi_createUser']).where('ID', '=', docID).selectScalar()
  if (authorID !== Session.userID) {
    throw new UB.UBAbort('Access deny')
  } */
  process.closeAllTask()
  process.updateProcessState('PROJECT')
  if (resetRoute) {
    process.resetRoute()
  }
}

/**
 *
 * @param {Number} docID
 * @param {Boolean} [resetRoute=false]
 */
function startProcess (docID, resetRoute) {
  let process = new ReconciliationProcess(docID)
  if (resetRoute) {
    process.resetRoute()
  }
  if (process.isPosted()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо виконати дію. Документ у стані "Опрацьовано"')}>>>`)
  }
  if (process.isStarted()) {
    throw new UB.UBAbort('<<<processIsNowStarted>>>')
  }
  if (!process.existsStages()) {
    throw new UB.UBAbort('<<<NoStages>>>')
  }
  process.initNextStage()
}

function continueProcess (docID, comments) {
  console.log('###continueProcess')
  const process = new ReconciliationProcess(docID)
  if (process.isPosted()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо виконати дію. Документ у стані "Опрацьовано"')}>>>`)
  }
  const stages = process.getStageWithState(['REJECTED'])
  if (stages.length === 0) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено етап у стані відхилений')}>>>`)
  }
  const stage = stages[0]
  process.setStageStatus(stage, 'WAIT_RESOLUTION', '')
  const items = process.loadPart(stage.ID)
  const store = new TubDataStore('hr_recparticipant')
  items.forEach(participant => {
    if (participant.resolution === 'REJECTED') {
      store.run('update', {
        execParams: {
          ID: participant.ID,
          resolution: 'NEW',
          resolutionText: '',
          mi_modifyDate: participant.mi_modifyDate
        }
      })
    }
    if (participant.resolution !== 'ACCEPTED') {
      process.createTask(participant, comments)
    }
  })
  const canceledStages = process.getStageWithState(['CANCELED'])
  canceledStages.forEach(f => {
    process.setStageStatus(f, 'NEW')
  })
  const docStore = new TubDataStore(process.orderEntityName)
  docStore.run('update', {
    execParams: {
      ID: process.doc.ID,
      mi_modifyDate: process.doc.mi_modifyDate,
      orderState: 'ON_RECONCILATION'
    }
  })
}

class ReconciliationProcess {
  constructor (docID) {
    this.docID = docID
    let order = UB.Repository('hr_order').attrs(['ID', 'orderClass.entityName', 'empOrderType']).selectById(this.docID)
    if (order) {
      this.orderEntityName = order.empOrderType === 'EXTRACT' ? 'hr_empOrderExtract' : order['orderClass.entityName']
    } else {
      this.orderEntityName = 'hr_order'
    }
    this.parentField = 'docID'
    this.loadData()
  }

  loadData () {
    this.doc = UB.Repository(this.orderEntityName).attrs(['ID', 'organizationID', 'orderState', 'mi_modifyDate']).where('ID', '=', this.docID).selectSingle()
    this.stages = UB.Repository('hr_recstage').attrs(['ID', 'orderIndex', 'mi_wfState', 'mi_modifyDate'])
      .where(this.parentField, '=', this.docID).where('entityName', '=', 'hr_recstage').orderBy('orderIndex').selectAsObject()
  }

  getStageWithState (states) {
    if (!Array.isArray(states)) {
      states = [states]
    }
    return this.stages.filter(f => states.find(s => s === f.mi_wfState))
  }

  getStageByID (ID) {
    return this.stages.find(f => f.ID === ID)
  }

  isPosted () {
    return this.doc && this.doc.orderState === 'POSTED'
  }

  isStarted () {
    let current = this.getStageWithState('WAIT_RESOLUTION')
    return current.length > 0
  }

  existsStages () {
    let newItem = this.getStageWithState(['NEW'])
    console.log('#####PR.existsStages', newItem.length > 0)
    if (newItem.length > 0) {
      let parts = this.loadParts(newItem.map(f => f.ID))
      return parts.length > 0
    }
    return false
  }

  loadPart (stageID) {
    return UB.Repository('hr_recparticipant').attrs(['ID', 'recStageID', 'positionID', 'executionTerm', 'executionDate',
      'employeePosition', 'plannedEmployeePosition', 'resolution', 'resolutionText', 'mi_modifyDate', 'employeePosition.employeeNumberID', 'prevParticipantID'])
      .where('recStageID', '=', stageID).selectAsObject({ 'employeePosition.employeeNumberID': 'employeeNumberID' })
  }

  loadParts (stageList) {
    return UB.Repository('hr_recparticipant').attrs(['ID', 'recStageID', 'positionID', 'executionTerm', 'executionDate',
      'employeePosition', 'plannedEmployeePosition', 'resolution', 'resolutionText', 'mi_modifyDate', 'employeePosition.employeeNumberID'])
      .where('recStageID', 'in', stageList).selectAsObject({ 'employeePosition.employeeNumberID': 'employeeNumberID' })
  }

  closeAllTask (fix) {
    let current
    if (fix) {
      current = this.stages
    } else {
      current = this.getStageWithState('WAIT_RESOLUTION')
    }
    console.log('#####PR.closeAllTask', current)
    if (current.length === 0) return
    // current = current[0]
    current.forEach(c => {
      let items = this.loadPart(c.ID)
      if (items.length > 0) {
        const tasks = UB.Repository('hr_task').attrs(['ID', 'docID', 'resolution', 'resolutionText', 'participantID', 'mi_wfState', 'mi_modifyDate'])
          .where('mi_wfState', '=', 'NEW')
          .where('participantID', 'in', items.map(f => f.ID))
          .misc({ __skipRls: true, __skipAclRls: true })
          .selectAsObject()
        const store = new TubDataStore('hr_task')
        tasks.forEach(task => {
          store.run('update', {
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              ID: task.ID,
              mi_wfState: 'CANCELED',
              mi_modifyDate: task.mi_modifyDate
            }
          })
        })
        items.forEach(participant => {
          participant.prevParticipantID && UB.DataStore('hr_recparticipant').run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: participant.ID,
              executionDate: null,
              prevParticipantID: null
            }
          })
        })
      }
    })
  }

  resetRoute () {
    const store = new TubDataStore('hr_recparticipant')
    this.closeAllTask(true)
    this.stages.forEach(stage => {
      if (stage.mi_wfState !== 'NEW') {
        this.setStageStatus(stage, 'NEW')
      }
      let items = this.loadPart(stage.ID)
      items.forEach(item => {
        if (item.resolution !== 'NEW') {
          store.run('update', {
            execParams: {
              ID: item.ID,
              resolution: 'NEW',
              resolutionText: '',
              mi_modifyDate: item.mi_modifyDate
            }
          })
        }
      })
    })
    UB.Repository('hr_empOrderSignature').attrs(['ID', 'mi_modifyDate'])
      .where('docID', '=', this.docID)
      .where('participantID', 'isNotNull')
      .where('canceled', '=', false)
      .selectAsObject()
      .forEach(function (sign) {
        store.run('update', {
          entity: 'hr_empOrderSignature',
          execParams: {
            ID: sign.ID,
            canceled: true,
            mi_modifyDate: sign.mi_modifyDate
          }
        })
      })
  }

  initNextStage () {
    console.log('#####PR.initNextStage')
    let stages = this.getStageWithState(['NEW'])
    let currentIdx = 0
    let newStage = stages[currentIdx]
    let existsItem = false
    while (!existsItem && (currentIdx < stages.length)) {
      newStage = stages[currentIdx]
      let items = this.loadPart(newStage.ID)
      if (items.length > 0) {
        existsItem = true
        items.forEach(f => {
          this.checkPositionEmployee(f)
          this.createTask(f)
        })
        this.setStageStatus(newStage, 'WAIT_RESOLUTION')
      }
      currentIdx++
    }

    if (existsItem && this.doc.orderState !== 'ON_RECONCILATION') {
      const store = new TubDataStore(this.orderEntityName)
      store.run('update', {
        execParams: {
          ID: this.doc.ID,
          mi_modifyDate: this.doc.mi_modifyDate,
          orderState: 'ON_RECONCILATION'
        }
      })
    }
  }

  checkPositionEmployee (participant) {
    const employeePosition = UB.Repository('hr_employeePositionS').attrs(['ID', 'dateFrom', 'dateTo', 'positionID', 'organizationID', 'description'])
      .where('ID', '=', participant.employeePosition).selectSingle()
    if (!employeePosition.positionID) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо виконати дію. Маршрут містить виконавця для якого не вказана штатна посада: {0}', employeePosition.description)}>>>`)
    }
    const current = new Date()
    if (!employeePosition ||
      (new Date(employeePosition.dateFrom) > current) ||
      (new Date(employeePosition.dateTo) < current)) {
      const store = new TubDataStore('hr_recparticipant')
      const employeePositionNew = UB.Repository('hr_employeePositionS').attrs(['ID', 'dateFrom', 'dateTo', 'positionID', 'organizationID', 'employeeNumberID'])
        .where('positionID', '=', participant.positionID)
        .where('dateTo', '>', current)
        .where('dateFrom', '<', current)
        .selectAsObject()
      let empNum = employeePositionNew && employeePositionNew.find(el => el.employeeNumberID === participant.employeeNumberID)
      if (employeePositionNew && empNum) {
        participant.employeePosition = empNum.ID
        store.run('update', {
          fieldList: ['mi_modifyDate'],
          execParams: {
            ID: participant.ID,
            employeePosition: empNum.ID,
            plannedEmployeePosition: participant.employeePosition,
            mi_modifyDate: participant.mi_modifyDate
          }
        })
        participant.mi_modifyDate = store.get('mi_modifyDate')
      } else if (employeePositionNew) {
        participant.employeePosition = employeePositionNew.ID
        store.run('update', {
          fieldList: ['mi_modifyDate'],
          execParams: {
            ID: participant.ID,
            employeePosition: employeePositionNew.ID,
            plannedEmployeePosition: participant.employeePosition,
            mi_modifyDate: participant.mi_modifyDate
          }
        })
        participant.mi_modifyDate = store.get('mi_modifyDate')
      }
    }
  }

  createTask (participant, comments) {
    const store = new TubDataStore('hr_task')
    const ID = store.generateID()

    let recstage = UB.Repository('hr_recstage')
      .attrs(['ID', 'stageKind', 'stageKind.name'])
      .selectById(participant.recStageID)

    let execParams = {
      ID,
      organizationID: this.doc.organizationID,
      participantID: participant.ID,
      docID: this.docID,
      positionID: participant.positionID,
      employeePositionID: participant.employeePosition,
      plannedEmployeePositionID: participant.plannedEmployeePosition,
      comments: comments,
      isVerificationAct: 0
    }

    let docData = ''
    if (this.orderEntityName && this.docID) {
      switch (this.orderEntityName) {
        case 'hr_empOrder':
          docData = UB.Repository(this.orderEntityName)
            .attrs(['ID', 'description', 'employeeList'])
            .selectById(this.docID)
          break
        case 'hr_request':
          docData = UB.Repository(this.orderEntityName)
            .attrs(['ID', 'description', 'dictRequestKindID.name', 'employeeNumberID.employeeID.shortFIO'])
            .selectById(this.docID)
          docData.description = `${docData.description ? docData.description +
            (docData['dictRequestKindID.name'] ? ` ${docData['dictRequestKindID.name']}` : '') +
            (docData['employeeNumberID.employeeID.shortFIO'] ? ` (${docData['employeeNumberID.employeeID.shortFIO']})` : '')
            : ''}`
          break
      }
    }

    messageService.taskMessage({
      orgID: this.doc.organizationID,
      entity: 'hr_task',
      instanceID: ID,
      description: UB.i18n('Завдання'),
      employeeNumberIDs: [participant.employeeNumberID],
      text: `Вам призначено нове завдання з ${recstage ? recstage['stageKind.name'] : 'Погодження'} документа ${docData ? docData.description + (docData.employeeList ? ` (${docData.employeeList})` : '') : ''}.</br>` +
        `Для опрацювання Ви можете перейти до переліку завдань ("Мої завдання" на робочому столі "Документи"),</br>` +
        `або просто перейти за цим посиланням: {0}`
    })
    messageService.mailTaskNotification({
      orgID: this.doc.organizationID,
      instanceID: ID,
      subject: UB.i18n('Завдання'),
      entity: 'hr_task',
      showForm: 'hr_task-main',
      docID: this.docID,
      employeeNumberID: participant.employeeNumberID,
      employeePositionID: participant.employeePosition,
      taskData: execParams
    })

    execParams[this.parentField] = this.docID
    console.log('createTask >>> ', execParams)
    store.run('insert', {
      execParams: execParams
    })
  }

  /**
   *
   * @param {Object} stage
   * @param {String} status
   * @param {String} [resolutionText]
   */
  setStageStatus (stage, status, resolutionText) {
    console.log('#####PR.setStageStatus', status, stage.ID, resolutionText)
    const store = new TubDataStore('hr_recstage')
    store.run('update', {
      fieldList: ['mi_modifyDate'],
      execParams: {
        ID: stage.ID,
        mi_wfState: status,
        resolutionText: resolutionText,
        mi_modifyDate: stage.mi_modifyDate
      }
    })
    stage.mi_modifyDate = store.get('mi_modifyDate')
    stage.mi_wfState = status
  }

  /**
   *
   * @param {Number} stageID
   */
  closeStage (stageID) {
    console.log('#####PR.closeStage', stageID)
    const stage = this.getStageByID(stageID)
    const items = this.loadPart(stageID)

    let finishState = 'RECONCILED'
    const rejectedItem = items.find(f => f.resolution === 'REJECTED')
    console.log('---rejectedItem', rejectedItem)
    if (rejectedItem) {
      this.setStageStatus(stage, 'REJECTED', rejectedItem.resolutionText)
      this.stages.forEach(f => {
        if (f.mi_wfState === 'NEW' || f.mi_wfState === 'WAIT_RESOLUTION') {
          this.setStageStatus(f, 'CANCELED')
        }
      })
      finishState = 'RETURNED_FROM_RECONCILATION' // 'REJECTED'
    } else {
      this.setStageStatus(stage, 'COMPLETED')
    }

    if (this.existsStages()) {
      this.initNextStage()
    } else {
      this.updateProcessState(finishState)
    }
  }

  updateProcessState (state) {
    const store = new TubDataStore(this.orderEntityName)
    store.run('update', {
      execParams: {
        ID: this.doc.ID,
        orderState: state,
        mi_modifyDate: this.doc.mi_modifyDate
      }
    })
  }

  checkStage (stageID) {
    console.log('#####PR.checkStage')
    // let items = this.loadPart(stageID)
    let items = UB.Repository('hr_recparticipant').attrs(['ID'])
      .where('recStageID', '=', stageID)
      .where('resolution', '=', 'REJECTED')
      .selectAsObject()
    if (items.length > 0) {
      this.closeAllTask()
      this.closeStage(stageID)
      return
    }
    items = UB.Repository('hr_recparticipant').attrs(['ID'])
      .where('recStageID', '=', stageID)
      .where('resolution', '=', 'NEW')
      .selectAsObject()
    if (items.length === 0) {
      this.closeStage(stageID)
    }
  }

  static tackComplete (taskID) {
    const task = UB.Repository('hr_task').attrs(['ID', 'docID', 'resolution', 'resolutionText', 'participantID', 'mi_wfState', 'executionDate'])
      .where('ID', '=', taskID).selectSingle()
    const participant = UB.Repository('hr_recparticipant').attrs(['recStageID', 'resolution', 'mi_modifyDate'])
      .where('ID', '=', task.participantID).selectSingle()
    const store = new TubDataStore('hr_recparticipant')
    store.run('update', {
      execParams: {
        ID: task.participantID,
        resolution: task.resolution,
        executionDate: task.executionDate,
        resolutionText: task.resolutionText,
        mi_modifyDate: participant.mi_modifyDate
      }
    })
    const process = new ReconciliationProcess(task.docID)
    process.checkStage(participant.recStageID)
  }
}
