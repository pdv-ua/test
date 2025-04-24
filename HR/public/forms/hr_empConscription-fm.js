/* global AC HR */
/* global Ext $App _ XLSX Blob saveAs FileReader js_beautify  JSLINT js_beautify DevUtils localStorage UB AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  controlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
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
  AC.viewUtils.setFilterValue(me.attr.employeeDocID, {
    employeeID: me.record.get('employeeID')
  })

  if (me.record.get('employeeDocID')) {
    ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
      if (me.record.get(`employeeDocID.${me.attr[attrName].recordField}`)) {
        me.attr[attrName].setReadOnly(true)
      }
    })
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  if (!me.isNewInstance) {
    me.attr.dismissDate.setMinValue(me.record.get('startDate'))
  }
  me.down('[name=office]').setValue(me.record.get('office'))
  HR.orderManager.readOnlyIf(me)
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeeDocID':
        ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
          const attrValue = attrName === 'dateIssue'
            ? AC.dateService.shiftDate(field.getFieldValue(me.attr[attrName].recordField))
            : field.getFieldValue(me.attr[attrName].recordField)
          me.attr[attrName][me.attr[attrName].setValueById ? 'setValueById' : 'setValue'](attrValue)
          me.attr[attrName].setReadOnly(!!value && !!attrValue)
        })
        break
      case 'startDate':
        if (value && AC.dateService.isValid(value)) {
          me.attr.dismissDate.setMinValue(value)
        } else {
          me.attr.dismissDate.setMinValue()
        }
        break
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
      DevUtils.showg(me.entityName)
    }
  })
}
