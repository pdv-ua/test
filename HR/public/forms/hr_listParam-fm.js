/* globals */

exports.formCode = {
  initComponentStart
}

function initComponentStart () {
  let me = this
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', afterSave, me)
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
