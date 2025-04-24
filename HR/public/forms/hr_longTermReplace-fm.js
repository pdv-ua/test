/* global AC appAC */
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
  }
  if (me.isNewInstance && me.defaultValues) {
    me.attr.employeeNumberReplID.setValueById(me.defaultValues.employeeNumberReplID || null)
    me.attr.employeeNumberAbsID.setValueById(me.defaultValues.employeeNumberAbsID || null)
  }
  AC.viewUtils.setFilterValue(me.attr.employeeNumberReplID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.employeeNumberAbsID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.createOrderID, { organizationID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.changeOrderID, { organizationID: me.record.get('organizationID') })
  me.attr.employeeNumberReplID[(me.defaultValues && me.defaultValues.employeeNumberReplID) ? 'hide' : 'show']()
  me.attr.employeeNumberAbsID[(me.defaultValues && me.defaultValues.employeeNumberAbsID) ? 'hide' : 'show']()
  /* if (me.isNewInstance && me.defaultValues) {

    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })

  } */
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
