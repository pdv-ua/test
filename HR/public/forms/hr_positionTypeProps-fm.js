/* global appAC */
exports.formCode = {
  initComponentStart,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
}
