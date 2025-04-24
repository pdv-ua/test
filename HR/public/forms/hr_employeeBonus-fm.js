/* global AC _ HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onBeforeSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('onBeforeSave', onBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
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

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }

  let srcOrganizationName = me.down('[name=srcOrganizationName]')
  srcOrganizationName.setValue(me.record.get('srcOrganizationName') || me.record.get('srcOrganizationID.name'))
}

function onBeforeSave () {
  const me = this
  me.record.set('srcOrganizationName', me.down('[name=srcOrganizationName]').getRawValue())
}
