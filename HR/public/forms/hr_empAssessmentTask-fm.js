/* global UB AC Ext $App appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onAfterSave,
  onAfterDelete,
  setFieldsReadOnly
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('afterDelete', onAfterDelete, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.duringTheReportingPeriod.on('change', handleChangeDuringTheReportPeriod.bind(me))
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
  if (me.isNewInstance) {
    me.down('[ubID=assessmentResultPanel]').hide()
  }
  let readOnlyFieldList = []
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.ubID === 'empAssessmentTaskResult') {
    me.actions.fDelete.hide()
    me.setActionDisabled('fDelete', true)
    readOnlyFieldList = ['number', 'deadlineDate', 'taskText', 'taskComment']
    me.down('[name=duringTheReportingPeriod]').setReadOnly(true)
    me.down('[name=empAssessmentTaskValues]').setReadOnly(true)
  } else {
    if (grid && grid.isReadOnly) {
      AC.viewUtils.setFormReadOnly(me, [], true)
      me.down('[name=empAssessmentTaskValues]').setReadOnly(true)
    } else {
      const tb = me.down('toolbar')
      if (!me.down('[ubID=btnNextMenu]')) {
        tb.insert(4,
          Ext.create('Ext.Button', {
            ubID: 'btnNextMenu',
            xtype: 'button',
            text: UB.i18n('Наступний (F7)'),
            handler: function () {
              makeNextRecord(me)
            }
          }))
        const wnd = me.getFormWin() || me.up()
        Ext.util.KeyMap({
          target: (wnd && wnd.getEl()) || me,
          binding: [{
            key: Ext.EventObject.F7,
            fn: function (keyCode, e) {
              makeNextRecord(me)
            }
          }]
        })
      }
      readOnlyFieldList = ['doneDate', 'dictTaskScoreID', 'resultDescription', 'resultComment']
    }
  }
  me.setFieldsReadOnly(readOnlyFieldList)
}

function setFieldsReadOnly (list) {
  let me = this
  list.forEach((fieldName) => {
    let field = me.getField(fieldName)
    if (field) field.setReadOnly(true)
  })
}

function handleChangeDuringTheReportPeriod ({ checked }) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  try {
    const yy = me.gridSender.up().up().ownerCt.attr.year.value || (new Date()).getFullYear()
    const deadlineDateValue = checked ? AC.dateService.getYearEnd(yy) : ''
    me.attr.deadlineDate.setValue(deadlineDateValue)
  } catch (e) {}
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  me.defaultValues = me.defaultValues || {}
  let gridSender = me.gridSender
  let formSender = (gridSender && gridSender.up('form')) || {}
  if (formSender.instanceID || me.defaultValues.empAssessmentID) {
    const empAssessmentID = formSender.instanceID || me.defaultValues.empAssessmentID
    me.record.set('empAssessmentID', empAssessmentID)
    UB.Repository('hr_empAssessmentTask')
      .attrs(['MAX([number])'])
      .where('empAssessmentID', '=', empAssessmentID)
      .selectAsObject({
        'MAX([number])': 'number'
      }).then(rows => {
        let maxNum = rows[0].number || 0
        me.record.set('number', ++maxNum)
        me.attr.taskText.focus()
      })
  }
  me.record.set('issueDate', appAC.globalApplicationDate())
}

function onAfterSave () {
  AC.gridUtils.refreshSenderGridForm(this)
  AC.gridUtils.refreshSenderGrid(this)
}

function onAfterDelete () {
  AC.gridUtils.refreshSenderGridForm(this)
  AC.gridUtils.refreshSenderGrid(this)
}

function makeNextRecord (form) {
  const me = form
  me.fromMakeNextRecord = true
  me.saveForm()
    .then(function (saveStatus) {
      if (saveStatus >= 0) {
        const grid = me.sender || AC.gridUtils.getSenderGrid(me)
        const store = grid && grid.getStore && grid.getStore()
        const runParams = {
          cmdType: 'showForm',
          formCode: me.formCode,
          entity: me.entityName,
          instanceID: null,
          isModal: true,
          tabId: null,
          sender: me.gridSender,
          gridSender: me.gridSender,
          cmpInitConfig: {
            gridSender: me.gridSender,
            sender: me.sender,
            defaultValues: {
              empAssessmentID: me.record.get('empAssessmentID')
            }
          }
        }
        if (store) {
          store.load().then(() => {
            $App.doCommand(runParams)
            me.closeWindow(true)
          })
        } else {
          $App.doCommand(runParams)
          me.closeWindow(true)
        }
      }
    })
}
