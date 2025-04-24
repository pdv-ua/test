/* global AC appAC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  controlChanged,
  calcFinish,
  calcDateTo
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

function calcFinish () {
  const me = this
  const onDate = appAC.globalApplicationDate()
  const dateTo = me.attr.dateToEmpty.getValue()
  if (dateTo) {
    if (dateTo >= onDate) {
      if (me.attr.dictTermMilitaryContractID.getFieldValue('months')) {
        const ymd = AC.dateService.getYmd(onDate, dateTo)
        me.attr.finish.setValue(UB.i18n('{0}р. {1}м. {2}д.', ymd.years, ymd.months, ymd.days))
      } else {
        me.attr.finish.setValue(UB.i18n('безстроковий'))
      }
    } else {
      me.attr.finish.setValue(UB.i18n('припинений'))
    }
  } else {
    me.attr.finish.setValue(UB.i18n('безстроковий'))
  }
}

function calcDateTo () {
  const me = this
  if (me.attr.dateFrom.getValue()) {
    const months = me.attr.dictTermMilitaryContractID.getFieldValue('months') || 0
    if (months) {
      me.attr.dateToEmpty.setValue(AC.dateService.addMonths(me.attr.dateFrom.getValue(), months))
    } else {
      me.attr.dateToEmpty.setValue()
    }
  }
}

function onFormDataReady () {
  const me = this

  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  if (!me.isNewInstance) {
    me.calcFinish()
  }
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'dictTermMilitaryContractID':
        me.calcDateTo()
        me.calcFinish()
        break
      case 'dateFrom':
        if (value && AC.dateService.isValid(value)) {
          me.calcDateTo()
          me.calcFinish()
        } else {
          me.attr.dateToEmpty.setValue()
        }
        break
      case 'dateToEmpty':
        if (value && AC.dateService.isValid(value)) {
          me.calcFinish()
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
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
