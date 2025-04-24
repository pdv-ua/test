/* global AC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormIsDataReady,
  onControlChanged
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormIsDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormIsDataReady () {
  const me = this
  if (me.record.get('methodGroupID.groupType')) {
    me.down('[name=groupType]').setText(UB.core.UBEnumManager.getById('HR_PAY_TYPE', me.record.get('methodGroupID.groupType')).get('name'))
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'methodGroupID':
        me.down('[name=groupType]').setText(value ? UB.core.UBEnumManager.getById('HR_PAY_TYPE', field.getFieldValue('groupType')).get('name') : '')
        break
      case 'payElEntrySumField':
        break
    }
  }
}
