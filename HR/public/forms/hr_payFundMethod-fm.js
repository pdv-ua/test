/* global AC */
exports.formCode = {
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  initComponentStart
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onControlChanged (field, value) {
  let me = this
  switch (field.name) {
    case 'code':
      switch (value) {
        case '1':
          me.attr.accrueUnSick.hide()
          me.attr.correctByTime.show()
          break
        case '2':
          me.attr.accrueUnSick.show()
          me.attr.correctByTime.hide()
          break
      }
      break
  }
}

function onFormDataReady () {
  const me = this
  switch (me.record.get('code')) {
    case '1':
      me.attr.accrueUnSick.hide()
      me.attr.correctByTime.show()
      break
    case '2':
      me.attr.accrueUnSick.show()
      me.attr.correctByTime.hide()
      break
    default:
      me.attr.accrueUnSick.show()
      me.attr.correctByTime.show()
      break
  }
}
