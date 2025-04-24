/* global HR AC  $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  onBeforeClose,
  clearErrors,
  findOrderAttrConfig
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', me.onFormDataReady, me)
  me.on('recordloaded', me.onRecordLoaded, me)
  me.on('controlChanged', me.onControlChanged, me)
  me.on('beforeClose', me.onBeforeClose, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.errors = []
  me.canClose = true
}

function onRecordLoaded () {
  const me = this
  me.enableValidators = true
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType || 'TEMPSUSPEND')
    me.record.set('textOrder', UB.i18n('ТИМЧАСОВО ПРИЗУПИНИТИ виконання роботи за укладеним трудовим договором'))
  } else {
    if (!me.isInternalRefresh) {
      let rawErrorText = me.record.get('errorText')
      if (rawErrorText) {
        me.errors = JSON.parse(rawErrorText)
        let errorText = HR.controlService.getFormErrorsText(me.errors)
        const errorLabel = me.down('[name=errorText]')
        errorLabel.setText(errorText, false)
      }
    } else {
      me.isInternalRefresh = false
    }
  }
  me.orderForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })
  HR.orderManager.setDefaultValues(me)
}

async function onFormDataReady () {
  const me = this
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.orderConfig = me.findOrderAttrConfig()
  if (me.isNewInstance) {
    if (me.orderConfig) {
      me.attr.payElID.setValueById(me.orderConfig.payElIDMain)
    }
  }
  if (!me.isNewInstance) {
    me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
  }

  setControlState(me)
  me.enableControls()
}

function findOrderAttrConfig () {
  return this.orderAttrConfigList.length ? this.orderAttrConfigList[0] : null
}

function setControlState (me) {
  const isDisabled = !me.attr.dateFrom.getValue()
  me.attr.isTempVacancy.setDisabled(isDisabled)
  me.attr.isTempsuspend.setDisabled(isDisabled)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'dateFrom':
      me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
      setControlState(me)
      break
    case 'isTempVacancy':
      me.attr.isTempsuspend.setValue(value)
  }
}

function enableControls () {
  const me = this
  if (me.orderConfig) {
    me.attr.payElID.setDisabled(!me.orderConfig.canEditPayElMain)
  }
  me.orderForm.enableParaControls(this)
}

function onBeforeClose () {
  /* const me = this
  AC.gridUtils.refreshSenderGrid(me)
  return true */
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
  }
}
