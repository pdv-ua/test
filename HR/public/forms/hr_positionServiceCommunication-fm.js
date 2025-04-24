/* global AC */

exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  const grid = AC.gridUtils.getSenderGrid(me)
  if (me.isNewInstance && grid) {
    me.record.set('itemIdx', grid.getStore().getCount() + 1)
  }
}
