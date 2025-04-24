/* global AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  const employeePositionID = me.attr.employeePosition.getValue()
  me.attr.employeePosition.clearValue()
  if (me.record.get('resolution') !== 'NEW' || (!me.isNewInstance && me.record.get('recStageID.mi_wfState') !== 'NEW')) {
    me.disableEdit()
    me.actions.fDelete.disable()
    me.attr.executionDate.show()
    me.attr.resolution.show()
    me.attr.resolutionText.show()
  }

  let orderForm = me.sender.up('form').up('form')
  me.empOrderType = orderForm.record.get('empOrderType')
  let store = me.attr.employeePosition.getStore()
  let onDate = AC.dateService.truncTimeToUtcNull(new Date(me.empOrderType === 'STAFFTABLE' ? appAC.globalApplicationDate() : orderForm.record.get('orderDate') || appAC.globalApplicationDate()))
  let stageKind = me.sender.up('form').record.get('stageKind')
  if (stageKind && stageKind.indexOf('_EXT') !== -1) {
    store.ubRequest.method = 'getAcceptEmployeeExternal'
    store.ubRequest.onDate = onDate
    store.ubRequest.empOrderType = me.empOrderType
  } else {
    store.ubRequest.__mip_recordhistory_all = true
    AC.viewUtils.setWhereListProperty(me.attr.employeePosition, [
      ['organizationID', '=', orderForm.record.get('masterOrganizationID') || orderForm.record.get('orderID.masterOrganizationID') || orderForm.record.get('organizationID') || appAC.globalOrganization()],
      ['dateFrom', 'lessEqual', onDate],
      ['dateTo', 'moreEqual', onDate]
    ])
  }
  HR.orderManager.disableContextMenuItems(me.attr.employeePosition, [ 'editItem', 'showLookup', 'addItem' ])
  me.attr.employeePosition.setValueById(employeePositionID)
}
