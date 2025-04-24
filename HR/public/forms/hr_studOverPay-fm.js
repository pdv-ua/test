/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)

}

function onControlChanged (me, field) {
  switch (me.attributeName) {
    case 'dateFrom':
      me.up('form').attr.dateTo.setMinValue(field)
      break
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
