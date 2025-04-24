/* global Ext $App _ XLSX Blob saveAs FileReader js_beautify appAC JSLINT js_beautify DevUtils localStorage UB AC */
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
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  } else {
    me.attr.dateNext.setMinValue(AC.dateService.addDays(me.record.get('dateCheck'), 1))
    if (me.record.get('dateNext')) {
      me.attr.dateCheck.setMaxValue(AC.dateService.addDays(me.record.get('dateNext'), -1))
    }
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  me.attr.dateCheck.on('change', (ctrl, newValue) => {
    if (AC.dateService.isValid(newValue) && me.attr.dateCheck.rawValue.length === 10) {
      me.attr.dateNext.setValue(AC.dateService.addYears(newValue, 3))
      me.attr.dateNext.setMinValue(AC.dateService.addDays(me.record.get('dateCheck'), 1))
      if (me.record.get('dateCheck') > AC.dateService.currentDate()) {
        $App.dialogInfo(UB.i18n('Увага! Внесена дата більша за поточну дату.'))
      }
    } else {
      me.attr.dateNext.setValue()
    }
  })
  me.attr.dateNext.on('change', (ctrl, newValue) => {
    me.attr.dateCheck.setMaxValue(AC.dateService.addDays(me.record.get('dateNext'), -1))
  })
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
