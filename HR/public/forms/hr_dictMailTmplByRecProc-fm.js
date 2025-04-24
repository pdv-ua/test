/* global appAC AC Blob _ HR $App */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
}

