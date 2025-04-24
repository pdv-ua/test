/* global AC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  controlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', controlChanged, me)
}

function initComponentDone () {
  const me = this
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  HR.orderManager.createShowImportAction(me)
  AC.viewUtils.setAttr(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'dictBranchScienceID':
      setDegreeName(me)
      break
    case 'dictDegreeID':
      setDegreeName(me)
      break
  }
}

function setDegreeName (me) {
  me.record.set('degreeName', `${me.attr.dictDegreeID.getFieldValue('shortName') || ''}${me.attr.dictBranchScienceID.getFieldValue('shortName') || ''}`)
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
