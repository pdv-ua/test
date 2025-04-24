/* global AC */

exports.formCode = {
  initComponentStart,
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('entryType', me.defaultValues.entryType)
  }
  switch (me.record.get('entryType')) {
    case 'SUM':
      let payElEntryType = me.sender.up('form').attr.methodID.getFieldValue('payElEntryType')
      if (payElEntryType) {
        AC.viewUtils.setFilterValue(me.attr.payElBaseID, { 'methodID.methodGroupID.groupType': payElEntryType.replace(/"/g, '').split(',') })
      }
      break
    case 'TIME':
      AC.viewUtils.setFilterValue(me.attr.payElBaseID, { 'methodID.methodGroupID.code': [1] })
      break
  }
}
