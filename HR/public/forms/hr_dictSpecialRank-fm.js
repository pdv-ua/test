/* global AC appAC _ */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  afterSave,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('aftersave', afterSave, me)
}

function initComponentDone () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  me.attr.rankType.setReadOnly(!me.isNewInstance)
  AC.viewUtils.setFilterValue(me.attr.dictSpecialRankNextID, { rankType: me.record.get('rankType') })
}

function onControlChanged (field, value) {
  const me = this
  if (field.getName() === 'rankType') {
    AC.viewUtils.setFilterValue(me.attr.dictSpecialRankNextID, { rankType: value })
  }
}

function afterSave (me, data) {
  me.attr.rankType.readOnly = true
}
