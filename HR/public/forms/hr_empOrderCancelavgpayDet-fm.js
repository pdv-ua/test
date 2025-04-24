/* global HR AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  enableControls,
  getEmpOrderType,
  onFormDataReady,
  postInit,
  controlChanged
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['hr_empOrderEmployeeDet']
  }
  AC.acEditGridManager.init(me)
  // me.onBeforeSave = onCheckValidBeforeSaveForm
  me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
  me.on('controlChanged', controlChanged, me)
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function enableControls () {
  const me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
}

function initComponentDone () {
  let me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
}

function postInit (me, record, data) {
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType)
  }
  HR.orderManager.setTitleByOrderType(me)
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.orderForm && me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  AC.viewUtils.setWhereListProperty(me.attr.empOrderAveragePayID, [
    ['organizationID', 'equal', me.record.get('organizationID')]
  ])
}

function onFormDataReady () {
  const me = this
  me.enableControls()
}

function controlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'empOrderAveragePayID':
      const gridEmp = me.down('[name=hr_empOrderEmployeeDet]')
      gridEmp.store.removeAll()
      break
  }
}
