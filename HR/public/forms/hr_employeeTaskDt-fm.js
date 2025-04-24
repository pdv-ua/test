/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onAfterSave,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onRecordLoaded (record, data) {

}

function onAfterSave () {
  AC.gridUtils.refreshSenderGrid(this)
}

function onFormDataReady () {
  const me = this
  const allowDelete = !['SENDED', 'COMPLITED'].includes(me.record.get('taskDtState'))
  const disAllowEdit = ['COMPLITED'].includes(me.record.get('taskDtState'))
  if (allowDelete) me.actions.fDelete.enable()
  else me.actions.fDelete.disable()
  if (disAllowEdit) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
  }
}
