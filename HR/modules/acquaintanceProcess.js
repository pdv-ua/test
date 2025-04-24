/* global UB, TubDataStore */
const messageService = require('../../HR/modules/messageService')
const dateService = require('../../AC/modules/dataServices/dateService')
module.exports = {
  startAcquaintanceProcess,
  stopProcess,
  acquaintanceTackComplete
}
function acquaintanceTackComplete (taskID) {
  AcquaintanceProcess.tackComplete(taskID)
}
function stopProcess (docID, removeRecord) {
  let process = new AcquaintanceProcess(docID)
  process.stopProcess(removeRecord)
}

function startAcquaintanceProcess (docID, addTask) {
  let process = new AcquaintanceProcess(docID)
  if (!process.isCompleteOrder()) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо виконати дію. Документ не в стані "Опрацьовано"')}>>>`)
  }
  process.initNextStage(addTask)
}
class AcquaintanceProcess {
  constructor (docID) {
    this.docID = docID
    let order = UB.Repository('hr_order').attrs(['ID', 'orderClass.entityName', 'empOrderType']).selectById(this.docID)
    if (order) {
      this.orderEntityName = order.empOrderType === 'EXTRACT' ? 'hr_empOrderExtract' : order['orderClass.entityName']
    } else {
      this.orderEntityName = 'hr_order'
    }
    this.parentField = 'orderID'
    this.loadData()
  }

  loadData () {
    this.doc = UB.Repository(this.orderEntityName)
      .attrs(['ID', 'organizationID', 'orderState', 'mi_modifyDate', 'orderDate'])
      .where('ID', '=', this.docID)
      .selectSingle()
    this.stages = UB.Repository('hr_acquaintanceList')
      .attrs(['*', 'employeePositionID.positionID', 'employeePositionID.employeeNumberID', 'employeePositionID.employeeNumberID.employeeID', 'participantID', 'employeeResponsibleID.employeeID', 'employeeResponsibleID.employeeNumberID'])
      .where(this.parentField, '=', this.docID)
      .selectAsObject({ 'employeePositionID.positionID': 'positionID', 'employeePositionID.employeeNumberID': 'employeeNumberID', 'employeePositionID.employeeNumberID.employeeID': 'emplID', 'employeeResponsibleID.employeeID': 'responsibleEmployeeID', 'employeeResponsibleID.employeeNumberID': 'respEmployeeNumberID' })
    this.mainEmployeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID'])
      .where('employeeID', 'in', this.stages.map(o => o.employeeID || o.emplID || o.responsibleEmployeeID))
      .where('workPlace', '=', '1')
      .where('dateFrom', '<=', dateService.shiftDate(this.doc.orderDate))
      .where('dateTo', '>=', dateService.shiftDate(this.doc.orderDate))
      .where('organizationID', '=', this.doc.organizationID)
      .selectAsObject()
    this.employeeTask = UB.Repository('hr_task').attrs(['*']).where('organizationID', '=', this.doc.organizationID).where('docID', '=', this.docID).where('employeePositionID', 'in', this.mainEmployeePosition.map(o => o.ID)).where('participantID.recStageID.entityName', '=', 'hr_acquaintanceList').where('mi_wfState', '=', 'NEW').misc({ __skipRls: true, __skipAclRls: true }).selectAsObject()
  }

  initNextStage (addTask) {
    const mainEmployeePositions = this.mainEmployeePosition
    let stages = this.stages.filter((o, index, arr) => {
      o.employeeID = o.employeeID || o.emplID || o.responsibleEmployeeID
      const mainEmployeePosition = mainEmployeePositions.find(el => o.employeeID === el.employeeID)
      if (mainEmployeePosition && (!o.employeePositionID || o.employeePositionID !== mainEmployeePosition.employeePositionID)) {
        o.employeePositionID = mainEmployeePosition.ID
        o.positionID = mainEmployeePosition.positionID
      }
      return o.positionID && ((arr.findIndex(el => el.employeeID === o.employeeID) === index) || (!addTask || (addTask.ID === o.ID))) && (addTask.selectRowID ? o.ID === addTask.selectRowID : true) && mainEmployeePositions.find(el => o.employeeID === el.employeeID) && !['ACQUAINTED', 'GETTING_KNOW'].includes(o.acquaintanceStatus)
    })
    let currentIdx = 0
    let newStage = stages[currentIdx]
    while (currentIdx < stages.length) {
      newStage = stages[currentIdx]
      this.createTask(newStage)
      currentIdx++
    }
  }

  isCompleteOrder () {
    return this.doc && ['POSTED', 'PROCESSED'].includes(this.doc.orderState)
  }

  createTask (data, comments) {
    const store = new TubDataStore('hr_task')
    const storeAcquaintanceList = new TubDataStore('hr_acquaintanceList')
    const ID = store.generateID()
    let execParams = {
      ID,
      organizationID: this.doc.organizationID,
      docID: this.docID,
      positionID: data.positionID,
      employeePositionID: data.employeePositionID,
      plannedEmployeePositionID: data.employeePositionID,
      isVerificationAct: 0,
      participantID: data.participantID
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
      employeeNumberIDs: [data.employeeNumberID || data.respEmployeeNumberID],
      text: `Вам призначено нове завдання з  документа ${docData ? docData.description + (docData.employeeList ? ` (${docData.employeeList})` : '') : ''}.</br>` +
        `Для опрацювання Ви можете перейти до переліку завдань ("Мої завдання" на робочому столі "Документи"),</br>` +
        `або просто перейти за цим посиланням: {0}`
    })
    try {
      messageService.mailTaskNotification({
        orgID: this.doc.organizationID,
        instanceID: ID,
        subject: UB.i18n('Завдання'),
        entity: 'hr_task',
        showForm: 'hr_task-main',
        docID: this.docID,
        employeeNumberID: data.employeeNumberID || data.respEmployeeNumberID,
        employeePositionID: data.employeePositionID || data.employeeResponsibleID,
        taskData: execParams
      })
    } catch (e) {
    }

    store.run('insert', {
      execParams
    })
    storeAcquaintanceList.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: data.ID,
        acquaintanceStatus: 'GETTING_KNOW'
      }
    })
  }
  stopProcess (removeRecord) {
    const mainEmployeePositions = this.mainEmployeePosition
    let stages = this.stages.map(el => {
      el.employeeID = el.employeeID || el.emplID || el.responsibleEmployeeID
      const mainEmployeePosition = mainEmployeePositions.find(o => o.employeeID === el.employeeID)
      if (mainEmployeePosition && (!el.employeePositionID || (el.employeePositionID !== mainEmployeePosition.employeePositionID))) {
        el.employeePositionID = mainEmployeePosition.ID
        el.positionID = mainEmployeePosition.positionID
      }
      return el
    }).filter(o => o.positionID && (!removeRecord || (removeRecord.ID === o.ID)))
    const employeeTask = this.employeeTask
    if (!stages.length) return
    const store = new TubDataStore('hr_task')
    const acquaintanceListStore = new TubDataStore('hr_acquaintanceList')
    stages.forEach(o => {
      const findOldTask = employeeTask.find(t => (t.docID === o.orderID) && (t.positionID === o.positionID) && (t.employeePositionID === o.employeePositionID))
      findOldTask && store.run('delete', {
        __skipOptimisticLock: true,
        execParams: {
          ID: findOldTask.ID
        }
      })
      acquaintanceListStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: o.ID,
          acquaintanceStatus: ''
        }
      })
      UB.Repository('hr_empOrderSignature')
        .attrs(['ID', 'participantID'])
        .where('docID', '=', o.orderID)
        .selectAsObject().forEach(o => {
          new TubDataStore('hr_empOrderSignature').run('delete', {
            __skipOptimisticLock: true,
            execParams: {
              ID: o.ID
            }
          })
        })
    })
  }

  static tackComplete (taskID) {
    const task = UB.Repository('hr_task')
      .attrs(['ID', 'docID', 'resolution', 'resolutionText', 'participantID', 'mi_wfState', 'executionDate'])
      .where('ID', '=', taskID)
      .selectSingle()
    const acquaintanceList = UB.Repository('hr_acquaintanceList')
      .attrs(['ID'])
      .where('participantID', '=', task.participantID)
      .where('orderID', '=', task.docID)
      .selectSingle()
    const store = new TubDataStore('hr_acquaintanceList')
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: acquaintanceList.ID,
        acquaintanceStatus: task.resolution === 'REJECTED' ? 'APPEALED' : 'ACQUAINTED',
        introductionDate: dateService.currentDateTime(),
        comment: task.resolution === 'REJECTED' ? task.resolutionText : ''
      }
    })
  }
}
