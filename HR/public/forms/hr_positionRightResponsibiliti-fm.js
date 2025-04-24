/* global UB Ext HR appAC AC */

exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (me.record.get('type')) {
      me.attr.type.hide()
      let el = me.down('[id=typeName]')
      if (el) {
        el.setText(UB.core.UBEnumManager.getStore('HR_POSITION_RIGHTRESP').getById(me.record.get('type')).get('name'))
      }
    }
  } else {
    me.down('[id=typeNameBox]').hide()
  }
}
