/* global appAC */
exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  this.on('recordloaded', function (a) {
    const me = this
    if (me.isNewInstance) {
      me.record.set('name', null)
      me.record.set('organizationID', appAC.globalOrganization())
    }
  })
}
