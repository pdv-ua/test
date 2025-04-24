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
    const psCategory = me.record.get('psCategory')
    if (typeof psCategory === 'number') {
      me.record.set('psCategory', psCategory.toString())
    }
  }
}
