/* global _ AC */

exports.formCode = {
  initComponentStart,
  onInitComponentDone,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onCheckValidBeforeSaveForm
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['gridDictWorkOperationDt']
  }
  AC.acEditGridManager.init(me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
}

function onInitComponentDone () {
}

function onRecordLoaded (record, data) {
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('dateFrom', AC.dateService.minDate())
    me.record.set('dateTo', AC.dateService.maxDate())
  }
  me.attr.ratePanel = me.down('[name=ratePanel]')
  me.attr.ratePanel[me.attr.payment.getValue() === '1' ? 'hide' : 'show']()
  me.attr.gridDictWorkOperationDt[me.attr.payment.getValue() === '1' ? 'show' : 'hide']()
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  switch (ctrl.name) {
    case 'payment':
      if (value !== oldValue) {
        me.attr.ratePanel[me.attr.payment.getValue() === '1' ? 'hide' : 'show']()
        me.attr.gridDictWorkOperationDt[value === '1' ? 'show' : 'hide']()
        if (value === '1') {
          me.attr.rate.setValue(null)
        }
      }
      break
  }
}

function onCheckValidBeforeSaveForm () {
  return Promise.resolve(true)
}
