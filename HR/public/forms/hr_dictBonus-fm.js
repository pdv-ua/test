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
  if (!AC.entityUtils.verifyRightsMethod(me.entityName, 'canEditActive')) {
    if (me.isNewInstance) {
      me.record.set('isActive', 0)
    }
    if (me.record.get('isActive')) {
      me.disableEdit()
    }
    me.attr.isActive.setDisabled(true)
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
