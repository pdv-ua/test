/* global AC */
exports.formCode = {
  initComponentStart,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.todayDate())
  }
}
