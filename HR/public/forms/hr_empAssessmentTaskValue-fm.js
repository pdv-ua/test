/* global UB AC Ext $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onAfterSave
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.duringTheReportingPeriod.on('change', handleChangeDuringTheReportPeriod.bind(me))
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  } else {
    if (!me.down('[ubID=btnNextMenu]')) {
      const tb = me.down('toolbar')
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
      const newkeymap = new Ext.util.KeyMap({
        target: (wnd && wnd.getEl()) || me,
        binding: [{
          key: Ext.EventObject.F7,
          fn: function (keyCode, e) {
            makeNextRecord(me)
          }
        }]
      })
    }
  }
}

function handleChangeDuringTheReportPeriod ({ checked }) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  try {
    const yy = me.sender.up('form').gridSender.up().up().ownerCt.attr.year.value || (new Date()).getFullYear()
    const deadlineDateValue = checked ? AC.dateService.getYearEnd(yy) : ''
    me.attr.deadlineDate.setValue(deadlineDateValue)
  } catch (e) {}
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  me.defaultValues = me.defaultValues || {}
  const senderGrid = me.sender && me.sender.ownerCt
  if (senderGrid || me.defaultValues.empAssessmentTaskID) {
    const senderForm = (senderGrid && senderGrid.up('form')) || {}
    const empAssessmentTaskID = senderForm.instanceID || me.defaultValues.empAssessmentTaskID
    me.record.set('empAssessmentTaskID', empAssessmentTaskID)
    UB.Repository('hr_empAssessmentTaskValue')
      .attrs(['MAX([number])'])
      .where('empAssessmentTaskID', '=', empAssessmentTaskID)
      .selectAsObject({
        'MAX([number])': 'number'
      }).then(rows => {
        let maxNum = rows[0].number || 0
        me.record.set('number', ++maxNum)
        me.attr.valueText.focus()
      })
  }
}

function onAfterSave () {
  let me = this
  let gridSender = me.sender
  if (gridSender) {
    let formSender = gridSender.up('form')
    let gridParent = formSender.gridSender
    if (gridParent) {
      gridParent.loadData()
    }
  }
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
          sender: me.sender,
          gridSender: me.gridSender,
          cmpInitConfig: {
            defaultValues: {
              empAssessmentTaskID: me.record.get('empAssessmentTaskID')
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
