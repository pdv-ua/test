// /* global AC appAC HR AC */
/* global AC HR */
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

}

function onFormDataReady () {
  const me = this
  const templateForm = me.sender.up('[formCode=hr_recstage]').sender.up('form')
  const organizationID = templateForm.record.get('organizationID')
  let orderForm
  let empOrderType
  if (templateForm.recPanel) {
    empOrderType = templateForm.recPanel._empOrderType
    orderForm = templateForm.recPanel.up('form')
  } else {
    empOrderType = templateForm.record.get('empOrderType')
  }
  const employeePositionCtrl = me.getField('employeePosition')

  let onDate = orderForm ? (orderForm.orderDate || orderForm.record.get('entryDate') || AC.dateService.currentDate()) : AC.dateService.currentDate()
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  let store = employeePositionCtrl.getStore()
  let stageKind = me.sender.up('form').record.get('stageKind')
  if (empOrderType === 'STAFFTABLE') {
    store.ubRequest.method = 'getAcceptEmployee'
    store.ubRequest.onDate = onDate
    store.ubRequest.organizationID = organizationID
    store.ubRequest.empOrderType = empOrderType
  } else if (stageKind && stageKind.indexOf('_EXT') !== -1) {
    store.ubRequest.method = 'getAcceptEmployeeExternal'
    store.ubRequest.onDate = onDate
    store.ubRequest.empOrderType = empOrderType
  } else {
    store.ubRequest.__mip_recordhistory_all = true
    AC.viewUtils.setWhereListProperty(employeePositionCtrl, [
      ['organizationID', '=', organizationID],
      ['dateFrom', 'lessEqual', onDate],
      ['dateTo', 'moreEqual', onDate]
    ])
  }
  HR.orderManager.disableContextMenuItems(employeePositionCtrl, ['editItem', 'showLookup', 'addItem'])
}
