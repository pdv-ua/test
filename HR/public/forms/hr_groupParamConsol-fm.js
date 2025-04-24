/* global AC */
exports.formCode = {
  initComponentDone,
  initComponentStart
}

function initComponentStart () {
  let me = this
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', afterSave, me)
  me.on('formDataReady', function () {
    //me.record.set('code', 'consolidatedStatement')
    //me.attr.code.hide()
    me.actions.refresh.hide()
    me.actions.save.hide()
  })
}
function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function beforeSave (me, params) {
  if (me.isNewInstance && me.bindToReport) {
    params.bindToReport = me.bindToReport
  }
}

function afterSave () {
  const me = this
  me.sender && me.sender.onRefresh && me.sender.onRefresh()
}

