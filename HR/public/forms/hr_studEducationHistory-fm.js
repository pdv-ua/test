/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onControlChanged (me, field) {
  switch (me.attributeName) {
    case 'dateFrom':
      me.up('form').attr.dateToEmpty.setMinValue(field)
      break
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: appAC.globalOrganization() })
}

function onPrepareDataBeforeSave (me, params) {
  if (params.execParams.dateFrom) {
    params.execParams.dateFrom = AC.dateService.truncTimeToUtcNull(params.execParams.dateFrom)
  }
  if (params.execParams.dateToEmpty) {
    params.execParams.dateToEmpty = AC.dateService.truncTimeToUtcNull(params.execParams.dateToEmpty)
  }
}
