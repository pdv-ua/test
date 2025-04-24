/* global AC _ */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  // me.on('beforeClose', function (a) {
  //   AC.gridUtils.refreshSenderUBGrid(me)
  // })
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
}

function onControlChanged (field) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'dateFromEmpty':
      me.attr.dateToEmpty.setMinValue(me.attr.dateFromEmpty.getValue())
      break
    case 'dateToEmpty':
      me.attr.dateFromEmpty.setMaxValue(me.attr.dateToEmpty.getValue())
      break
  }
}
