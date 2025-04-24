/* global UB AC appAC HR Ext $App Blob */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  onAfterSave,
  loadTaskValues,
  addBaseActions,
  editHtml,
  generateReport,
  generatePdf,
  setReportMode,
  getAssessmentResultID,
  getReportName,
  onBeforeRefresh,
  onBeforeSave,
  enableControls
}

const reportConfig = {
  name: UB.i18n('Завдання'),
  reportCode: 'hr_empAssessmentTask',
  settings: {
    margin: {
      top: 13.5,
      right: -2,
      bottom: 13.5,
      left: 2
    }
  }
}

function initComponentStart () {
  let me = this
  me.defaultValues = me.defaultValues || {}
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforeRefresh', onBeforeRefresh, me)
  me.on('afterSave', me.onAfterSave, me)
  me.reportSettings = reportConfig.settings
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
  me.isEditable = function () {
    const me = this
    if (me.record) {
      const newState = me.record.get('orderState')
      return ['PROJECT', 'ON_COMPLETION'].includes(newState)
    }
    return true
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  loadEmpAssessmentTask(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
  if (me.sender && !AC.gridUtils.getSenderGrid(me).up('[ubID=employeeAssesment]')) {
    me.getField('employeeNumberID').show(false)
  }
  let employeeNumberCtrl = me.down(`[name=employeeNumberID]`)
  let curDate = AC.dateService.currentDate()
  AC.viewUtils.setWhereListProperty(employeeNumberCtrl, [
    ['dateFrom', '<=', curDate],
    ['dateTo', '>=', curDate],
    ['orgID', '=', appAC.globalOrganization()]
  ], undefined, ['clearStore', 'clearWhereList'])
  const readOnlyFieldList = [
    'avgValue', 'assessmentValue', 'assessmentDescription', 'dictCompetencyID', 'appealDate', 'appealDescription',
    'appealResult', 'appealComment'
  ]
  readOnlyFieldList.forEach((fieldName) => {
    let field = me.getField(fieldName)
    if (field) field.setReadOnly(true)
  })
  if (!me.record.get('empAssessmentResultID')) {
    me.actions.actionCreateResultId.show()
  } else {
    const btn = me.down('[ubID=btnShowResult]')
    if (!btn) {
      const tb = me.down('toolbar')
      tb.insert(11,
        Ext.create('Ext.Button', {
          ubID: 'btnShowResult',
          xtype: 'button',
          tooltip: UB.i18n('Переглянути висновок'),
          scale: 'medium',
          iconCls: 'fas fa-file-invoice',
          cls: 'blue-action',
          handler: function () {
            const empAssessmentResultID = me.record.get('empAssessmentResultID')
            $App.doCommand({
              cmdType: 'showForm',
              entity: 'hr_empAssessmentResult',
              formCode: 'hr_empAssessmentResult',
              isModal: true,
              instanceID: empAssessmentResultID
            })
          }
        }))
    }
  }
  HR.orderManager.changeAction(me)
  me.down('[name=empAssessmentTask]').setReadOnly(!me.isEditable())
}

async function getAssessmentResultID () {
  let me = this
  let result = await UB.Repository('hr_empAssessmentResult')
    .attrs(['ID'])
    .where('assessmentID', '=', me.record.get('ID'))
    .selectSingle()
  return result
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'assessmentType':
      if (value === 'PERYEAR') {
        let yy = me.record.get('year')
        if (!yy) {
          let onDate = appAC.globalApplicationDate()
          yy = onDate.getFullYear()
        }
        me.record.set('dateFrom', AC.dateService.getYearBegin(yy))
        me.record.set('dateTo', AC.dateService.getYearEnd(yy))
      }
      break
    case 'employeeNumberID':
      me.record.set('employeeID', field.getFieldValue('employeeID'))
      me.record.set('employeeNumberID', value)
      setDefaultPosition(me)
      break
    case 'year':
      const assessmentType = me.attr.assessmentType.getValue()
      if (value >= 2000 && (assessmentType === 'PERYEAR' || !assessmentType)) {
        me.record.set('dateFrom', AC.dateService.getYearBegin(value))
        me.record.set('dateTo', AC.dateService.getYearEnd(value))
      }
      break
  }
}

function onAfterSave () {
  const me = this
  let empAssessmentTask = me.down('[name=empAssessmentTask]')
  let empAssessmentParam = empAssessmentTask.getStore().ubRequest.whereList.empAssessmentID
  if (!empAssessmentParam.value) {
    empAssessmentParam.value = me.instanceID || 0
  }
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  let onDate = appAC.globalApplicationDate()
  me.record.set('assessmentTaskType', 'NEW')
  me.record.set('year', onDate.getFullYear())
  me.record.set('organizationID', appAC.globalOrganization())
  if (me.defaultValues.employeeNumberID) {
    me.record.set('employeeNumberID', me.defaultValues.employeeNumberID)
  }
  // to call onControlChanged
  me.attr.assessmentType.setValue('PERYEAR')
  setDefaultPosition(me)
}

function setDefaultPosition (me) {
  let empID = me.record.get('employeeID')
  let empNumberID = me.record.get('employeeNumberID')
  if (!empID) return
  HR.treeUtils.getEmpPosInfo(empID, empNumberID).then(empPosInfo => {
    if (empPosInfo) {
      empPosInfo.departmentID && me.attr.departmentID.setValueById(empPosInfo.departmentID)
      me.attr.positionID.setValueById(empPosInfo.positionID)
    }
  })
}

function loadEmpAssessmentTask (me) {
  let empAssessmentTask = me.down('[name=empAssessmentTask]')
  if (empAssessmentTask) {
    empAssessmentTask.getStore().ubRequest.whereList.empAssessmentID.value = me.instanceID || 0
    empAssessmentTask.loadData()
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

function addBaseActions () {
  let me = this
  me.callParent(arguments)
  me.actions.actionCreateResultId = new Ext.Action({
    actionId: 'actionCreateResultId',
    actionText: UB.i18n('Оформити висновок'),
    hidden: true,
    handler: () => {
      me.getAssessmentResultID()
        .then((assessmentResultID) => {
          if (!assessmentResultID) {
            me.saveForm().then((result) => {
              if (result !== -1) {
                $App.doCommand({
                  cmdType: 'showForm',
                  entity: 'hr_empAssessmentResult',
                  formCode: 'hr_empAssessmentResult',
                  cmpInitConfig: {
                    defaultValues: {
                      assessmentID: me.record.get('ID'),
                      organizationID: me.record.get('organizationID')
                    }
                  }
                })
              }
            }).catch(e => {
              AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
            })
          } else {
            AC.viewUtils.showToast(UB.i18n('Висновок вже оформлено'))
            me.actions.actionCreateResultId.hide()
          }
        })
    }
  })
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
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
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
      me.saveForm().then(result => {
        if (result !== -1) {
          if (!me.record.get('document')) {
            $App.dialogError(UB.i18n('Необхідно сформувати текст наказу. Перейдіть на закладку "Документ" та натисніть "Формувати"'), UB.i18n('msgTypeWarning'))
            return
          }
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'startReconciliation',
            docID: me.record.get('ID')
          }).then(function () {
            return me.loadInstance()
          }).then(function () {
            me.down('recpanel').updateTree()
            me.enableControls(true)
            return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
          })
        }
      })
    }
  })
  me.actions.stopReconciliation = new Ext.Action({
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
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
              me.enableControls(false)
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })
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

function getReportName () {
  return 'hr_empAssessmentTask'
}

function onBeforeSave () {
  const me = this
  if (!me.record.get('docText')) {
    return Promise.resolve(true)
  }
  return HR.reportTab.saveReport(me)
}

function onBeforeRefresh () {
  const me = this
  const grid = me.down('[name=empAssessmentTask]')
  if (grid && grid.onRefresh) grid.onRefresh()
}

function enableControls (startReconciliation = true) {
  const me = this
  for (let attrName in me.attr) {
    me.attr[attrName].setReadOnly(startReconciliation)
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
