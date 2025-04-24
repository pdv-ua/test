/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onControlChanged (me, field) {
  switch (me.attributeName) {
    case 'dateFrom':
      me.up('form').attr.dateTo.setMinValue(field)
      break
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('organizationID', appAC.globalOrganization())
  }
  /*
  if (me.record.get('orderID')) {
    me.disableEdit()
    me.setActionDisabled('fDelete', true)
  }
  */
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
