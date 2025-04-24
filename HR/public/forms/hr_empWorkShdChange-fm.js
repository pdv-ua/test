/* global Ext _ UB AC $App appAC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onAfterSave,
  onRecordLoaded,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.actions['fDelete'].hide()
  me.setActionDisabled('fDelete', true)
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
}

function onFormDataReady () {
  const me = this
  if (me.record.get('orderID')) {
    me.attr.dateToEmpty.setReadOnly(!!me.record.get('workScheduleID'))
  }
  me.attr.dateToEmpty.setMinValue(me.record.get('dateFrom'))
}

function onAfterSave () {
  // let me = this
  // AC.gridUtils.refreshSenderGrid(me)
}
