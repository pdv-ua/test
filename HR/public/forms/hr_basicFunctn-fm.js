/* global Ext AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'basicFunctnID':
        me.attr.serviceFunctions.setValue(me.attr.basicFunctnID.getFieldValue('descrFunc'))
        break
    }
  }
}
