/* global UB Ext HR appAC $App saveAs _ Blob AC */

exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  setAuditOrg,
  initUBComponent
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function onFormDataReady () {
  const me = this
  const grid = AC.gridUtils.getSenderGrid(me)
  const parentForm = grid.up('form')
  AC.viewUtils.setFilterValue(me.attr.organizationAuditName, {
    'auditType': parentForm.record.get('auditType')
  })
  if (me.isNewInstance) {
    me.record.set('employeeID', parentForm.record.get('employeeID'))
    me.record.set('employeeDocAuditID', parentForm.record.get('ID'))
  }
  const auditOrg = me.down('[name=organizationAuditName]')
  auditOrg.setValue(me.record.get('organizationAuditName') || me.record.get('organizationAuditID.contractorID.name'))
}

function setAuditOrg (ctrl) {
  const me = this
  const reco = me.record
  let orgID = ctrl.getValue()
  let txtVal = ctrl.rawValue
  reco.set('organizationAuditName', txtVal)
  if (_.isNumber(orgID)) {
    reco.set('organizationAuditID', orgID)
  } else {
    reco.set('organizationAuditID', null)
  }
}
