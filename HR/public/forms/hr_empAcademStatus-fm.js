/* global AC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'dictAcademStatusID':
      me.attr.setStatus.setValue(field.getFieldValue('setStatus'))
      break
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
