/* global HR */
exports.formCode = {
  initComponentDone: function () {
    this.on('formDataReady', function (a) {
      HR.orderManager.requiredIf(this)
    })
  }
}
