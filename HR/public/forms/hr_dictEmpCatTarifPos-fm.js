/* global AC appAC _ */
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
      if (me.isNewInstance && me.defaultValues) {
        _.forEach(me.defaultValues, (value, name) => {
          me.record.set(name, value)
        })
      }
      if (!me.record.get('organizationID')) {
        me.record.set('organizationID', appAC.globalOrganization())
      }
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
  if (me.defaultValues && me.defaultValues.dictPositionID) {
    me.attr.dictPositionID.setReadOnly(true)
  }
}
