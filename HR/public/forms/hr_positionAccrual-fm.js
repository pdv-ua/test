/* global AC HR */

exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  HR.orderManager.createShowImportAction(me)
}

function onFormDataReady () {
  const me = this

  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.code': {
    value: 1,
    condition: (me.sender && me.sender.ownerCt && me.sender.ownerCt.groupCode === 1) ? '=' : '!='
  } })
  me.attr.accrualRate[(me.sender && me.sender.ownerCt && me.sender.ownerCt.groupCode === 1) ? 'hide' : 'show']()
  if (me.record.get('payElID.methodID.methodGroupID.code') === 1) {
    me.attr.accrualSum.setAllowBlank(false)
    me.attr.accrualRate.setReadOnly(true)
  }
  if (me.isNewInstance) {
    const parentForm = me.sender.up('form')
    if (parentForm) {
      if (!me.record.get('accrualSum') && me.sender && me.sender.ownerCt && me.sender.ownerCt.groupCode === 1) {
        me.attr.accrualSum.setValue(parentForm.attr.dictWagePayID.getFieldValue('paySum'))
      }
      me.attr.staffOrderID.setValue(parentForm.record.get('staffOrderID'))
    }
  }
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  if (notShowSalary) {
    me.attr.accrualSum.hide()
  }
}

function onControlChanged (field) {
  const me = this
  switch (field.name) {
    case 'payElID':
      if (field.getFieldValue('methodID.methodGroupID.code') === 1) {
        me.attr.accrualSum.setAllowBlank(false)
        me.attr.accrualRate.setReadOnly(true)
      } else {
        me.attr.accrualSum.setAllowBlank(true)
        me.attr.accrualRate.setReadOnly(false)
      }
      break
  }
}
