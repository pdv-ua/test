/* global AC */
exports.formCode = {
  onFormDataReady,
  initComponentStart,
  initComponentDone,
  onControlChanged,
  onBeforeSave,
  onShowGrid
}

function onFormDataReady () {
  const me = this
  me.attr.amountChild.setVisible(me.record.get('taxLimitID.taxLimitType') === '2')
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  me.on('recordloaded', function () {
    const me = this
    if (me.isNewInstance && me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  })
  AC.viewUtils.setAttr(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onControlChanged (field) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'taxLimitID':
      me.attr.amountChild.setVisible(field.getFieldValue('taxLimitType') === '2')
      break
  }
}

function onBeforeSave () {
  const me = this
  return new Promise(resolve => {
    if (me.record.get('dateFromEmpty')) {
      me.record.set('dateFromEmpty', AC.dateService.firstDayOfMonth(me.record.get('dateFromEmpty')))
    }
    if (me.record.get('dateToEmpty')) {
      me.record.set('dateToEmpty', AC.dateService.lastDayOfMonth(me.record.get('dateToEmpty')))
    }
    resolve(true)
  })
}

function onShowGrid () {
  const me = this
  me.showLookup()
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
