/* global AC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  createActions(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.todayDate())
  }
  if (me.record.get('empOrderID')) {
    AC.viewUtils.showToast(UB.i18n('Запис створено наказом. Тільки перегляд', UB.i18n('Увага')))
    AC.viewUtils.setFormReadOnly(me, true)
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  const customReadOnly = me.customSettings && me.customSettings.readOnly

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  !customReadOnly && allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    handler: function () {
      me.attr['dateToEmpty'].setReadOnly(false)
    }
  })
}
