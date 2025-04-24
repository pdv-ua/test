/* global AC UB $App */

exports.formCode = {
  initComponentDone,
  onBeforeSave,
  onAfterSave,
  onBeforeDelete
}

function initComponentDone () {
  const me = this
  me.on('aftersave', onAfterSave, me)
  me.on('beforesave', onBeforeSave, me)
  me.on('beforeDelete', onBeforeDelete, me)
  AC.viewUtils.setAttr(me)
}

function onBeforeDelete () {
  const me = this
}

function onBeforeSave () {
  const me = this
}

function onAfterSave () {
  const me = this
  me.down('ubdetailgrid').getStore().load()
}
