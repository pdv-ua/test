/* global AC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('caseType', 'GEN')
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
