/* global AC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  me.attr.minAge.setDisabled(!me.record.get('isAge'))
  me.attr.maxAge.setDisabled(!me.record.get('isAge'))
  me.attr.minAge.setAllowBlank(!me.record.get('isAge'))
  me.attr.maxAge.setAllowBlank(!me.record.get('isAge'))
  me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
  me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
}

function onControlChanged (field) {
  const me = this
  switch (field.name) {
    case 'dateFrom': {
      me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
      break
    }
    case 'dateTo': {
      me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
      break
    }
    case 'isAge': {
      const isAge = me.attr.isAge.getValue()
      me.attr.minAge.setDisabled(!isAge)
      me.attr.maxAge.setDisabled(!isAge)
      if (!isAge) {
        me.attr.minAge.setValue()
        me.attr.maxAge.setValue()
      }
      me.attr.minAge.setAllowBlank(!isAge)
      me.attr.maxAge.setAllowBlank(!isAge)
      break
    }
    case 'minAge': {
      me.attr.maxAge.setMinValue(me.attr.minAge.getValue())
      break
    }
    case 'maxAge': {
      me.attr.minAge.setMaxValue(me.attr.maxAge.getValue())
      break
    }
  }
}
