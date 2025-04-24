/* global HR */
exports.formCode = {
  initComponentStart
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', function (a) {
    HR.orderManager.showIf(me)
  })
  me.actions.fDelete.hide()
}
