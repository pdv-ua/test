/* eslint-disable no-unused-vars */
/* global AC HR $App Ext UB */
/* jshint maxerr: 10000 */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  onFormRefresh,
  enableControls,
  addBaseActions,
  onCheckValidBeforeSaveForm
}

function onCheckValidBeforeSaveForm () {
  const me = this
  return Promise.resolve(true)
}
function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('refresh', me.onFormRefresh, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else if (me.sender) {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (me.orderForm) {
    me.orderState = me.orderForm.record.get('orderState')
  }

 /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  })*/
  me.errors = []
  me.canClose = true
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    // HR.orderManager.showIf(me)
    // HR.orderManager.requiredIf(me)
    // HR.orderManager.disabledIf(me)
  })
  if (me.attr.employeePositionID) {
    HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  }
  if (me.attr.dateFrom && me.attr.dateTo) {
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.attr.dateFrom,
      dateTo: me.attr.dateTo
    })
  }
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }

  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {

  })
  if (me.isNewInstance) {
    if (me.orderForm) {
      me.record.set('orderID', me.orderForm.instanceID)
      me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    }
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  } else {
    let rawErrorText = me.record.get('errorText')
    if (rawErrorText) {
      me.errors = JSON.parse(rawErrorText)
      let errorText = HR.controlService.getFormErrorsText(me.errors)
      const errorLabel = me.down('[name=errorText]')
      if (errorLabel) {
        errorLabel.setText(errorText, false)
      }
    }
  }
  if (me.orderForm) {
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'reason',
      entityName: 'hr_dictReasonVacation'
    })
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'reasonDoc',
      entityName: 'hr_dictOrderDetReasonDoc'
    })
  }
  HR.orderManager.setDefaultValues(me)
}

function onFormDataReady () {
  const me = this
  me.enableControls()
}

function onBeforeSave () {
  return Promise.resolve(true)
}

function onAfterSave () {
  const me = this
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function onFormRefresh () {
  const me = this
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let dummyAction = me.actions.dummyAction
  if (!dummyAction) {
    dummyAction = new Ext.Action({
      actionId: 'dummyAction',
      eventId: 'dummyAction',
      text: 'Dummy Action',
      iconCls: 'fa fa-clone',
      handler: function () {

      }
    })
    me.actions.dummyAction = dummyAction
  }
}

function enableControls () {
  let me = this
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  if (me.orderForm) {
    me.orderForm.enableParaControls(me)
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
    case 'dateTo':
      if (AC.dateService.isValid(value)) {

      }
      break
  }
}
