/* global AC HR */
exports.formCode = {
  initUBComponent,
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('docAttachment').setReadOnly(true)
  }
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (!me.record.get('employeeID')) {
      if (me.defaultValues && me.defaultValues.employeeID) {
        me.record.set('employeeID', me.defaultValues.employeeID)
      }
      if (!me.record.get('employeeID')) {
        let sender = me.sender
        if (sender) {
          let employeeID = AC.viewUtils.getFilterValue(sender, 'employeeID')
          if (employeeID) {
            me.record.set('employeeID', employeeID)
          }
        }
      }
    }
    me.record.set('state', '1')
  }
  if (me.record.get('dictDocKindID.docType') === '4') {
    me.attr.dateFrom.show()
    me.attr.dateTo.show()
    me.attr.mtCount.show()
    me.attr.mtCount.setAllowBlank(false)
    me.attr.docValidUntil.hide()
    me.attr.state.hide()
  }
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'dictDocKindID':
      const docType = field.getFieldValue('docType')
      if (docType === '4') {
        me.attr.dateFrom.show()
        me.attr.dateTo.show()
        me.attr.mtCount.show()
        me.attr.mtCount.setAllowBlank(false)
        me.attr.docValidUntil.hide()
        me.attr.state.hide()
      } else {
        me.attr.dateFrom.hide()
        me.attr.dateTo.hide()
        me.attr.mtCount.hide()
        me.attr.mtCount.setAllowBlank(true)
        me.attr.docValidUntil.show()
        me.attr.state.show()
      }
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
