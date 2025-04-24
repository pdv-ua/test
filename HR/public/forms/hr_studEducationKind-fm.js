/* global AC */
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

function onControlChanged (field, value) {
  const me = this
  switch (field.attributeName) {
    case 'dateFrom':
      me.attr.dateToEmpty.setMinValue(value)
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
}

function onPrepareDataBeforeSave (me, params) {
  if (params.execParams.dateFrom) {
    params.execParams.dateFrom = AC.dateService.truncTimeToUtcNull(params.execParams.dateFrom)
  }
  if (params.execParams.dateToEmpty) {
    params.execParams.dateToEmpty = AC.dateService.truncTimeToUtcNull(params.execParams.dateToEmpty)
  }
}
