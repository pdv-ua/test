/* global Ext AC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  postInit,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  let formShell = Ext.create('AC.formShell')
  formShell.init(me, postInit)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  AC.viewUtils.setWhereListProperty(me.attr.payElID, [
    ['methodID.methodGroupID.code', '=', 4, 'groupVac'],
    ['methodID.code', '=', '73', 'donor']
  ], ['([groupVac] OR [donor])'])
}

function postInit () {
}

function onFormDataReady () {
  const me = this
  me.shell.requiredIf()
  me.shell.readOnlyIf()
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'isDate':
        me.shell.requiredIf()
        break
      case 'isDay':
        if (!value) {
          me.attr.isProportionalCompensate.setValue(false)
          me.attr.isYearBeginStart.setValue(false)
        }
        me.shell.readOnlyIf()
        break
    }
  }
}
