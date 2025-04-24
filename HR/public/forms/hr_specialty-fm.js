exports.formCode = {
  initComponentStart,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    const specialityType = me.record.get('specialityType')
    if (typeof specialityType === 'number') {
      me.record.set('specialityType', specialityType.toString())
    }
  }
}
