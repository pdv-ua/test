/* global AC HR appAC */
exports.formCode = {
  initComponentStart,
  initUBComponent,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}
function onFormDataReady () {
  const me = this
  const hrFuncOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  if (hrFuncOrgType === '2') {
    AC.viewUtils.setWhereListProperty(me.attr.contactTypeID, [
      ['code', 'in', ['email', 'other', 'phone', 'phoneTgBot']]
    ], undefined, ['clearStore', 'clearWhereList'])
  }
  me.attr.isSystemNotificationAddress[(me.attr.contactTypeID.getFieldValue('code') === 'email') ? 'show' : 'hide']()
}
function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)

  me.on('formDataReady', data => {
    if (!me.record.get('employeeID') && me.defaultValues && me.defaultValues.employeeID) {
      me.record.set('employeeID', me.defaultValues.employeeID)
    }
  }, me)
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
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

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'contactTypeID':
        me.attr.isSystemNotificationAddress.setValue(false)
        me.attr.isSystemNotificationAddress[(me.attr.contactTypeID.getFieldValue('code') === 'email') ? 'show' : 'hide']()
        break
    }
  }
}
