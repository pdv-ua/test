/* global AC */
exports.formCode = {
  initComponentDone,
  onFormDataReady
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    const parentForm = me.sender.up('form')
    if (parentForm) {
      me.attr.staffOrderID.setValue(parentForm.record.get('staffOrderID'))
    }
  }
}
