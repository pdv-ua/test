/* global AC appAC _ */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
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
