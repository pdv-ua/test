/* global UB AC appAC HR Ext $App  Blob */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  loadTaskValues,
  editHtml,
  generateReport,
  generatePdf,
  setReportMode,
  setAssessmentValues,
  setDefaultValues,
  loadEmpAssessmentTask,
  assessmentChanged,
  createActions,
  addBaseActions,
  stateChanged,
  getReportName,
  onCheckValidBeforeSaveOrder
}

const reportConfig = {
  name: UB.i18n('Оцінювання'),
  reportCode: 'hr_empAssessmentResult',
  settings: {
    margin: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 20
    }
  }
}

function getReportName () {
  return reportConfig.reportCode
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction', 'calculatedAction', 'unCalculatedAction',
      'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask'
    ],
    state: {
      PROJECT: {
        action: ['postingAction', 'fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation']
      },
      RECONCILED: {
        action: ['postingAction']
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask']
      },
      ON_COMPLETION: {
        action: ['postingAction', 'fDelete', 'startReconciliation']
      },
      POSTED: {
        action: ['cancelPostingAction']
      },
      PROCESSED: {
        action: []
      }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
  me.createActions()
}
// const allowChangeDocStates = ['PROJECT', 'ON_COMPLETION']
const allowChangeRouteStates = ['PROJECT', 'ON_COMPLETION', 'ON_RECONCILATION']

function stateChanged (newState) {
  const me = this
  const canEdit = allowChangeRouteStates.includes(newState)
  const recpanel = me.down('recpanel')
  if (!(recpanel && recpanel.setCanEdit)) {
    return
  }
  recpanel.setCanEdit(canEdit)
  const btmEdit = me.down('#btmEdit')
  btmEdit.setDisabled(!me.isEditable())
}
function createActions () {
  const me = this
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    // hidden: true,
    handler: function () {
      $App.connection.run({
        entity: 'hr_recstage',
        method: 'cancelReconciliation',
        docID: me.record.get('ID')
      }).then(function () {
        return me.loadInstance()
      }).then(function () {
        me.down('recpanel').updateTree()
        return $App.dialogInfo(UB.i18n('Документ повернуто на доопрацювання. Всі резолюції було відмінено'))
      })
    }
  })

  function docontinueReconciliation () {
    Ext.Msg.prompt(UB.i18n('Відновити погодження'),
      UB.i18n('Буде відновлено погодження з етапу на якому було відхилого погодженя. Введіть повідомлення для користвача, який відхилив погодження:'),
      function (btn, text) {
        if (btn === 'ok' && text) {
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'continueReconciliation',
            docID: me.record.get('ID'),
            comments: text
          }).then(function () {
            return me.loadInstance()
          }).then(function () {
            me.down('recpanel').updateTree()
            return $App.dialogInfo(UB.i18n('Узгодження продовжено згідно встановленому маршруту'))
          })
        } else if (btn === 'ok' && !text) {
          docontinueReconciliation()
        }
      }, me, true)
  }

  me.actions.renewTask = new Ext.Action({
    iconCls: 'fas fa-thumbs-up',
    cls: 'blue-action',
    tooltip: UB.i18n('Відновити погодження'),
    text: UB.i18n('Відновити погодження'),
    actionId: 'renewTask',
    handler: function () {
      docontinueReconciliation('ON_RECONCILATION')
    }
  })

  me.actions.startReconciliation = new Ext.Action({
    // actionText: 'Розпочати узгодження',
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
      me.saveForm().then(result => {
        if (result !== -1) {
          HR.reportTab.checkAndSetReport(me, {
            isCheckOnly: true
          })
            .then(result => {
              if (result) {
                return $App.connection.run({
                  entity: 'hr_recstage',
                  method: 'startReconciliation',
                  docID: me.record.get('ID')
                }).then(function () {
                  return me.loadInstance()
                }).then(function () {
                  HR.reportTab.setReportMode(me, 'view', true)
                  me.down('recpanel').updateTree()
                  return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
                })
              }
            })
        }
      })
    }
  })

  me.actions.stopReconciliation = new Ext.Action({
    // actionText: 'Розпочати узгодження',
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
    // eventId: 'startReconciliation',
    // hidden: true, // me.record.get('orderState') !== 'ON_RECONCILATION',
    handler: function () {
      $App.dialogYesNo(UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
        .then(function (res) {
          if (res) {
            $App.connection.run({
              entity: 'hr_recstage',
              method: 'stopReconciliation',
              docID: me.record.get('ID')
            }).then(function () {
              return me.loadInstance()
            }).then(function () {
              me.down('recpanel').updateTree()
              // me.actions.stopReconciliation.hide()
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })
}
function initComponentStart () {
  let me = this
  me.defaultValues = me.defaultValues || {}
  me.reportSettings = reportConfig.settings
  me.on('formDataReady', onFormDataReady, me)
  me.orderActions = {
    actions: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask'
    ],
    state: {
      PROJECT: {
        action: ['fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation']
      },
      RECONCILED: {
        action: []
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask']
      },
      ON_COMPLETION: {
        action: ['fDelete', 'startReconciliation']
      },
      POSTED: {
        action: []
      },
      PROCESSED: {
        action: []
      }
    }
  }
  HR.orderManager.init(me)
  me.isEditable = function () {
    const me = this
    if (me.record) {
      const newState = me.record.get('orderState')
      return allowChangeRouteStates.includes(newState)
    }
    return true
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.actions.fDelete.hide()
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  return HR.reportTab.saveReport(me)
}

function onFormDataReady () {
  const me = this
  me.setDefaultValues()
  const assessmentID = me.record.get('assessmentID')
  if (assessmentID) {
    me.setAssessmentValues(assessmentID)
  } else {
    let assessmentCtrl = me.down(`[name=assessmentID]`)
    assessmentCtrl.show()
  }
  me.loadEmpAssessmentTask()
  me.setActionDisabled('fDelete', true)
  HR.orderManager.changeAction(me)
  if (!me.isNewInstance) {
    me.setTitle(UB.i18n('Результат виконання завдань'))
  }
}

function assessmentChanged (ctrl, value) {
  const me = this
  me.setAssessmentValues(value)
}

function setDefaultValues () {
  const me = this
  if (me.isEditMode) {
    return
  }
  if (me.defaultValues.assessmentID) {
    me.record.set('assessmentID', me.defaultValues.assessmentID)
  }
  if (me.defaultValues.organizationID) {
    me.record.set('organizationID', me.defaultValues.organizationID)
  } else {
    me.record.set('organizationID', appAC.globalOrganization())
  }
}

function setAssessmentValues (assessmentID) {
  const me = this
  if (!assessmentID) return
  let el = null
  UB.Repository('hr_empAssessment')
    .attrs(['employeeID.fullFIO', 'assessmentType', 'assessmentTaskType', 'year', 'periodTypeID.name', 'dateFrom', 'dateTo',
      'departmentID.name', 'positionID.name', 'positionID.psCategory'])
    .selectById(assessmentID)
    .then((assessment) => {
      el = me.down('[name=employeeDescription]')
      if (el) el.setValue(assessment['employeeID.fullFIO'])
      el = me.down('[name=assessmentType]')
      if (el) el.setValue(UB.core.UBEnumManager.getStore('HR_ASSESSMENT_TYPE').getById(assessment['assessmentType']).get('name'))
      el = me.down('[name=assessmentTaskType]')
      if (el) el.setValue(UB.core.UBEnumManager.getStore('HR_ASSESSMENT_TASK_TYPE').getById(assessment['assessmentTaskType']).get('name'))
      el = me.down('[name=assessmentYear]')
      if (el) el.setValue(assessment['year'])
      el = me.down('[name=assessmentPeriod]')
      if (el) el.setValue(assessment['periodTypeID.name'])
      el = me.down('[name=assessmentDateFrom]')
      if (el) el.setValue(assessment['dateFrom'])
      el = me.down('[name=assessmentDateTo]')
      if (el) el.setValue(assessment['dateTo'])
      el = me.down('[name=assessmentDepartment]')
      if (el) el.setValue(assessment['departmentID.name'])
      el = me.down('[name=assessmentPosition]')
      if (el) el.setValue(assessment['positionID.name'])
      AC.viewUtils.setWhereListProperty(me.attr.dictCompetencyID, [
        ['psCategory', '=', assessment['positionID.psCategory']]
      ], undefined, ['clearWhereList'])
    })
}

function loadEmpAssessmentTask () {
  const me = this
  let empAssessmentTask = me.down('[name=empAssessmentTask]')
  if (empAssessmentTask) {
    const assessmentID = me.record.get('assessmentID') || 0
    empAssessmentTask.getStore().ubRequest.whereList.empAssessmentID.value = assessmentID
    if (assessmentID) empAssessmentTask.loadData()
  }
}

function loadTaskValues (grid, record) {
  if (!record.tasks) {
    return UB.Repository('hr_empAssessmentTaskValue')
      .attrs(['number', 'valueText', 'deadlineDate', 'comment'])
      .where('empAssessmentTaskID', '=', record.get('ID') || 0)
      .orderBy('number')
      .selectAsObject()
  } else {
    return Promise.resolve(record.tasks)
  }
}

function editHtml () {
  let me = this
  me.setLoading(UB.i18n('Зачекайте....'))
  me.generateReport().then(html => setHtml(me, html))
}

async function generateReport () {
  let me = this
  if (await me.saveForm() === -1) {
    return
  }
  let repName = reportConfig.reportCode
  let result = await HR.reportUtils.generateReport(repName, me.instanceID, me)
  return result
}

function setHtml (caller, html) {
  let me = caller
  let ed = me.down('ubreporteditor')
  me.setReportMode('edit')
  ed.show()
  me.record.set('docText', '')
  me.record.modified.docText = ''
  setTimeout(() => {
    me.setLoading(false)
    me.record.set('docText', html)
    ed.setValue(html)
  }, 1000)
}

function setReportMode (mode, isOnlyControls) {
  let me = this
  let ed = me.down('ubreporteditor')
  let pdfEd = me.down('ubpdf')
  switch (mode) {
    case 'view':
      me.down('[ubID=makeReport]').hide()
      me.down('[name=btnEdit]').show()
      me.down('[name=btnView]').hide()
      me.reportMode = mode
      let values = me.record.getChanges()
      if (!isOnlyControls) {
        let docText = values.docText || me.record.get('docText')
        if (docText && (values.docText || !me.record.get('document'))) {
          me.generatePdf(values.docText || me.record.get('docText'))
            .then(data => {
              ed.hide()
              pdfEd.setSrc({
                blobData: data
              })
              pdfEd.show()
            })
        }
        if (!values.docText && me.record.get('document')) {
          $App.connection.getDocument({
            entity: me.entityName,
            attribute: 'document',
            ID: me.instanceID
          }, {
            resultIsBinary: true
          })
            .then(data => {
              data = new Blob([data], {
                type: 'application/pdf'
              })
              ed.hide()
              pdfEd.setSrc({
                blobData: data
              })
              pdfEd.show()
            })
        }
      }
      break
    case 'edit':
      me.down('[ubID=makeReport]').show()
      me.down('[name=btnEdit]').hide()
      me.down('[name=btnView]').show()
      me.reportMode = mode
      if (!isOnlyControls) {
        pdfEd.hide()
        ed.show()
      }
      break
  }
}

function generatePdf (html, resultType) {
  let me = this
  let repCode = reportConfig.reportCode
  return HR.reportUtils.generatePdf(html, repCode, me.reportSettings, resultType)
}
