/* global Ext AC  HR $App UB appAC */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  setupByState,
  onControlChanged,
  showUser,
  onBeforeEditGrid,
  onAddNewGrid
}

function onAddNewGrid (grid) {
  let me = this
  if (!grid.editingPlugin.editing) {
    if ((me.isDirty() || me.isNewInstance) && !grid.notWriteChanges) {
      grid.notReload = true
      me.saveForm().then(function (result) {
        delete grid.notReload
        if (result !== -1) {
          grid.getStore().load(then => {
            setTimeout(() => {
              grid.addNewRecord(null, true)
            }, 500)
          })
        }
      })
    } else {
      grid.addNewRecord(null, true)
    }
  } else {
    $App.dialogInfo('rowEditing')
  }
}

function onBeforeEditGrid (rowEditor, context) {
  const me = this
  const grid = context.grid
  const entityName = grid.entityName
  grid.optimizeColumnWidth(true)
  if (context.grid.isEditDisabled) {
    return false
  }
  const editor = rowEditor.editor
  if (!me.record.get('ID')) {
    context.record.set('isFromExisted', 0)
  }
  const isDeleteCtrl = editor.query(`[name=isDelete]`)[0]
  const isFromExistedCtrl = editor.query(`[name=isFromExisted]`)[0]

  isFromExistedCtrl.setDisabled(true)
  isDeleteCtrl.setDisabled(!context.record.get('isFromExisted'))
  const mainField = entityName === 'hr_accessRequestGroup' ? 'groupID.name' : entityName === 'hr_accessRequestRole' ? 'roleID.name' : 'organizationID.name'
  editor.query(`[name=${mainField}]`)[0].setDisabled(context.record.get('isFromExisted'))
}

function showUser () {
  const me = this
  const userID = me.getField('userID').getValue()
  if (userID) {
    $App.doCommand({
      cmdType: 'showForm',
      entity: 'uba_user',
      instanceID: userID
    })
  } else {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Користувач не вибраний'))
  }
}

function setupByState () {
  const me = this
  switch (me.requestState) {
    case 'PROJECT':
      if (AC.entityUtils.verifyRightsMethod(me.entityName, 'doSend')) {
        me.actions.actionSendId.show()
      }
      me.actions.actionAcceptId.hide()
      me.actions.actionRejectId.hide()
      me.getField('processingDate').hide()
      me.getField('processEmployeeNumID').hide()
      break
    case 'ONRECONCILATION':
      me.actions.actionSendId.hide()
      if (AC.entityUtils.verifyRightsMethod(me.entityName, 'doAccept')) {
        me.actions.actionAcceptId.show()
      }

      if (AC.entityUtils.verifyRightsMethod(me.entityName, 'doReject')) {
        me.actions.actionRejectId.show()
      }

      me.getField('processingDate').show()
      // me.getField('processUserID').show()
      me.getField('processEmployeeNumID').show()
      break
    case 'RECONCILED':
      me.actions.actionSendId.hide()
      me.actions.actionAcceptId.hide()
      me.actions.actionRejectId.hide()
      me.getField('processingDate').show()
      me.getField('processEmployeeNumID').show()
      // me.getField('processUserID').show()
      break
    case 'CANCELED':
      me.actions.actionSendId.hide()
      me.actions.actionAcceptId.hide()
      me.actions.actionRejectId.hide()
      me.getField('processingDate').show()
      // me.getField('processUserID').show()
      me.getField('processEmployeeNumID').show()

      break
    case 'CHANGED':
      me.actions.actionSendId.hide()
      me.actions.actionAcceptId.hide()
      me.actions.actionRejectId.hide()
      me.getField('processingDate').hide()
      // me.getField('processUserID').hide()
      break
  }
  HR.orderManager.enableControls({
    me,
    isEnabled: me.requestState === 'PROJECT'
  })
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.getField('requestState').setReadOnly(true)
  me.getField('userID').setReadOnly(true)
  me.getField('organizationID').setReadOnly(true)
  me.getField('docNum').setReadOnly(true)
}

function respEmployeeNumIDSetFilter (form) {
  const orgID = form.record.get('organizationID')
  const onDate = form.record.get('docDate') || appAC.globalApplicationDate()

  AC.viewUtils.setFilterValue(form.getField('respEmployeeNumID'), {
    orgID,
    dateTo: {
      value: onDate,
      condition: '>='
    },
    dateFrom: {
      value: onDate,
      condition: '<='
    }
  })
}

function initComponentStart () {
  const me = this
  const { sender } = me
  me.requestState = AC.viewUtils.getFilterValue(sender, 'requestState')
  me.on('formDataReady', function () {
    if (me.isNewInstance) {
      me.record.set('requestState', 'PROJECT')
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('docDate', new Date())
      me.record.set('createUserID', $App.connection.userData().userID)
      const employeeNumberID = $App.connection.userData('employeeNumberID')
      if (employeeNumberID) {
        me.record.set('respEmployeeNumID', employeeNumberID)
      }
    }
    respEmployeeNumIDSetFilter(me)
    HR.orderManager.disableContextMenuItems(me.getField('employeeNumberID'), ['addItem'])
    HR.orderManager.disableContextMenuItems(me.getField('userID'), ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.getField('createUserID'), ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.getField('organizationID'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
    HR.orderManager.disableContextMenuItems(me.getField('respEmployeeNumID'), ['editItem', 'showLookup', 'addItem', 'clearValue'])

    if (me.record.get('requestState') === 'PROJECT') {
      AC.viewUtils.setFilterValue(me.getField('employeeNumberID'), {
        orgID: me.record.get('organizationID')
      })
    }
    Ext.defer(function () {
      me.getField('employeeNumberID').focus(true, 1)
    }, 1)
    me.setupByState()
  })
  me.on('controlChanged', onControlChanged, me)
  me.on('aftersave', function (a) {
    me.query('[xtype=ubdetailgrid]').forEach(item => {
      if (!item.notReload) {
        item.getStore().load()
      }
    })
  })
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  switch (ctrl.name) {
    case 'employeeNumberID':
      if (!value) {
        me.getField('userID').setValueById(null)
        return
      }
      UB.Repository('uba_user')
        .attrs('ID')
        .where('employeeNumberID', '=', value)
        .selectAsObject().then(data => {
          if ((data = data[0])) {
            me.getField('userID').setValueById(data.ID)
          } else {
            me.getField('userID').setValue()
          }
          // me.getField('organizationID').setValueById(ctrl.getFieldValue('orgID'))
        })
      me.query('[xtype=ubdetailgrid]').forEach(item => {
        item.getStore().loadData([])
      })
      break
    case 'isBlocked':
      let blockedReasonCtrl = me.getField('blockedReason')
      blockedReasonCtrl.setVisible(value)
      blockedReasonCtrl.setAllowBlank(!value)
      if (value) {
        Ext.defer(() => { blockedReasonCtrl.focus() }, 1)
      }
      break
  }
}

function addBaseActions () {
  const me = this

  me.callParent(arguments)
  me.actions.actionSendId = new Ext.Action({
    actionId: 'actionSendId',
    actionText: UB.i18n('Відправити'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doSend'),
    handler: () => {
      const state = me.record.get('requestState')
      me.record.set('requestState', 'ONRECONCILATION')
      me.requestState = 'CHANGED'
      me.saveForm()
        .then(result => {
          if (result === -1) {
            me.record.set('requestState', state)
            me.requestState = state
          }
          me.setupByState()
        })
        .catch(e => {
          me.record.set('requestState', state)
          me.requestState = state
          AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
        })
    }
  })
  me.actions.actionAcceptId = new Ext.Action({
    actionId: 'actionAcceptId',
    actionText: UB.i18n('Прийняти'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doAccept'),
    handler: () => {
      let state = me.record.get('requestState')
      me.record.set('requestState', 'RECONCILED')
      me.record.set('processingDate', new Date())
      me.requestState = 'CHANGED'
      me.record.set('processUserID', $App.connection.userData().userID)
      me.record.set('processEmployeeNumID', $App.connection.userData().employeeNumberID)
      me.saveForm()
        .then(result => {
          if (result === -1) {
            me.record.set('requestState', state)
            me.record.set('processingDate', null)
            me.requestState = state
            me.record.set('processUserID', null)
            me.record.set('processEmployeeNumID', null)
          }
          me.setupByState()
        })
        .catch(e => {
          me.record.set('requestState', state)
          me.record.set('processingDate', null)
          me.requestState = state
          me.record.set('processUserID', null)
          me.record.set('processEmployeeNumID', null)
          AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
        })
    }
  })
  me.actions.actionRejectId = new Ext.Action({
    actionId: 'actionRejectId',
    actionText: UB.i18n('Відхилити'),
    hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doReject'),
    handler: btn => {
      let dlg = Ext.Msg.prompt(UB.i18n('Відхилення заявки'), UB.i18n('Вкажіть підставу відхилення заявки'), (btnText, sInput) => {
        if (btnText === 'ok') {
          if (!sInput || !sInput.trim()) {
            AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказано підставу'))
          } else {
            let state = me.record.get('requestState')
            let cancelReason = me.record.get('cancelReason')
            me.record.set('processUserID', $App.connection.userData().userID)
            me.record.set('processEmployeeNumID', $App.connection.userData().employeeNumberID)
            me.record.set('cancelReason', sInput)
            me.record.set('requestState', 'CANCELED')
            me.record.set('processingDate', new Date())
            me.saveForm().then(function (result) {
              if (result === -1) {
                me.record.set('requestState', state)
                me.requestState = state
                me.record.set('cancelReason', cancelReason)
                me.record.set('processingDate', null)
                me.record.set('processUserID', null)
                me.record.set('processEmployeeNumID', null)
              } else {
                me.requestState = 'CHANGED'
              }
              me.setupByState()
            }).catch(e => {
              me.record.set('requestState', state)
              me.requestState = state
              me.record.set('cancelReason', cancelReason)
              me.record.set('processingDate', null)
              me.record.set('processUserID', null)
              me.record.set('processEmployeeNumID', null)
              AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
            })
          }
        }
      })
      dlg.setWidth(700)
      let textbox = dlg.getEl().query('input')[0]
      textbox.setAttribute('maxlength', 400)
    }
  })
}
