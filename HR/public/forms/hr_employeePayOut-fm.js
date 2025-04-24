/* global AC appAC appHR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.isEditable && !me.isEditable()) {
    me.actions.fDelete.hide()
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  appHR.getPayOutList(appAC.globalOrganization()).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  const isBank = me.record.get('paymentMethod') === '1'
  const isCashbox = me.record.get('paymentMethod') === '2'
  me.attr.payOutID.setVisible(isBank || isCashbox)
  me.attr.bankID.setVisible(isBank)
  me.attr.bankAccount.setVisible(isBank)
  me.attr.personalAccount.setVisible(isBank)
  me.attr.personalSubAccount.setVisible(isBank)
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'paymentMethod':
        const isBank = value === '1'
        const isCashbox = value === '2'
        me.attr.payOutID.setVisible(isBank || isCashbox)
        me.attr.bankID.setValueById(null)
        me.attr.bankID.setVisible(isBank)
        me.attr.bankAccount.setValue()
        me.attr.bankAccount.setVisible(isBank)
        me.attr.personalAccount.setValue()
        me.attr.personalAccount.setVisible(isBank)
        me.attr.personalSubAccount.setValue()
        me.attr.personalSubAccount.setVisible(isBank)
        break
    }
  }
}
