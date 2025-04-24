/* global AC UB _ Ext HR appAC */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  let me = this
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

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', appAC.globalOrganization()],
    ['dateTo', '>=', me.record.get('dateFrom')],
    ['dateFrom', '<=', me.record.get('dateFrom')],
    ['employeeNumberID', '=', me.record.get('employeeNumberID')]
  ])
  if (me.isNewInstance) {
    const store = me.attr.employeePositionID.getStore()
    store.load().then((store) => {
      if (store.data.items.length) {
        me.attr.employeePositionID.setValueById(store.data.items[0].get('ID'))
        me.attr.positionID.setValueById(store.data.items[0].get('positionID'))
      }
    })
    me.record.set('dateFrom', appAC.globalApplicationDate())
  } else {
    HR.orderManager.enableControls({
      me: me,
      isEnabled: !me.record.get('orderID')
    })
    if (me.record.get('orderID')) {
      me.attr.orderDescription.setVisible(true)
      me.attr.orderDescription.setReadOnly(true)
      me.attr.orderDescription.setValue(me.record.get(`orderID.description`))
    }
  }
}

function onControlChanged (field, value) {
  const me = this
  if (field.skipChange) {
    field.skipChange = false
    delete field.skipChange
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      me.record.set('positionID', field.getFieldValue('positionID'))
      break
    case 'dateTrialEnd':
      me.attr.dateTo.setValue(value)
      break
    case 'dictTrialPeriodID':
      HR.orderManager.calculateDateTrialEnd(me)
      break
    case 'dateFrom':
      HR.orderManager.calculateDateTrialEnd(me, value)
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