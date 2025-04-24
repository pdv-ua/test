/* global _ */
exports.formCode = {
  initComponentStart,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)

  me.actions.fDelete.hide()
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
}
