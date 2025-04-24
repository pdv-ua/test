/* global HR AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  afterrender,
  recordLoaded,
  formDataReady,
  addBaseActions,
  enableControls,
  onAfterOrderSave,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', recordLoaded, me)
  me.on('formDataReady', formDataReady, me)
  me.on('afterrender', afterrender, me)
  me.on('controlChanged', onControlChanged, me)
  // me.on('beforeClose', beforeClose, me)
}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else {
    me.orderForm = me.sender.up('form')
  }
  AC.viewUtils.setAttr(me)
}

function afterrender () {
  const me = this
  const win = this.window
  if (win) {
    if (!win.height) {
      win.height = 600
    }
    if (!win.width) {
      win.width = 800
    }
  }
  me.orderConfig = {
    detailGrids: []
  }
  me.orderForm.makeReasonSelector(me)
}

function recordLoaded () {
  const me = this
  me.masterForm = me.sender.up('form')
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('orderID', me.masterForm.instanceID)
  }
  me.orderState = me.masterForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      isExternal: value => value,
      bonusID: value => value,
      organizationID: value => me.masterForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value
    }], 4)
    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'employeePositionID'
    })
  }
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
}

function formDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  switch (ctrl.name) {
    case 'dictPenaltyReasonID':
      let name4Rep = me.attr.dictPenaltyReasonID.getFieldValue('name4Rep')
      me.attr.penaltyReason4Rep.setValue(name4Rep)
      break
  }
}

function addBaseActions () {
  this.callParent(arguments)
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

/*function beforeClose () {
  const me = this
  if (me.sender) {
    let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.onRefresh()
    }
  }
}*/
