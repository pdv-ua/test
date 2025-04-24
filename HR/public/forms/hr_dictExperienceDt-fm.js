/* global appAC AC */

exports.formCode = {
  initComponentStart,
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('conditionType', me.defaultValues.conditionType)
  }
  delete me.attr.organizationID.store.ubRequest.__mip_recordhistory_all
  me.attr.organizationID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate() || AC.dateService.todayDate()
  switch (me.record.get('conditionType')) {
    case '1':
      me.attr.organizationID.show()
      me.attr.organizationID.setAllowBlank(false)
      me.attr.dictStaffCatID.setAllowBlank(true)
      me.attr.dictPositionID.setAllowBlank(true)
      break
    case '2':
      me.attr.dictStaffCatID.show()
      me.attr.dictStaffCatID.setAllowBlank(false)
      me.attr.organizationID.setAllowBlank(true)
      me.attr.dictPositionID.setAllowBlank(true)
      break
    case '3':
      me.attr.dictPositionID.show()
      me.attr.dictPositionID.setAllowBlank(false)
      me.attr.organizationID.setAllowBlank(true)
      me.attr.dictStaffCatID.setAllowBlank(true)
      break
  }
}
