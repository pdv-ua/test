/* global AC UB appAC */
exports.formCode = {
  initComponentDone,
  onFormDataReady
}

function initComponentDone () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', function () {
    const me = this
    if (me.isNewInstance) {
      me.record.set('organizationID', appAC.globalOrganization())
    }
  })
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.organizationID,
    {
      mi_dateFrom: { value: appAC.globalApplicationDate(), condition: 'lessEqual' },
      mi_dateTo: { value: appAC.globalApplicationDate(), condition: 'moreEqual' }
    })
}
