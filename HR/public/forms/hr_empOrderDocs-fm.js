/* global HR */
exports.formCode = {
  enableControls: function () {
    const me = this
    if (me.masterForm && me.masterForm.orderForm) {
      let isPosted = me.masterForm.orderForm.enableParaControls(this)
      me.down('[name=docAttachment]').setReadOnly(isPosted)
    } else {
      HR.orderManager.enableControls({ me: me, isEnabled: false })
      me.down('[name=docAttachment]').setReadOnly(true)
    }
  },

  initComponentDone: function () {
    const me = this
    let masterForm = (me.sender && me.sender.up('form'))
    me.masterForm = masterForm
    me.on('formDataReady', data => {
      if (masterForm) {
        me.enableControls()
        if (me.isNewInstance) {
          me.record.set('employeeID', masterForm.record.get('employeeID'))
        }
      }
    }, me)
  }
}
