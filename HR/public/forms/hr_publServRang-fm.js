/* global AC _ HR UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent,
  doFormDataReady,
  onAfterSave,
  onControlChanged,
  setDateNext
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', doFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('afterSave', me.onAfterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  createActions(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
  me.onBeforeSave = onBeforeSave
}

function onBeforeSave () {
  let me = this

}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function doFormDataReady () {
  let me = this
  if (me.isNewInstance) {
    // me.record.set('dateFrom', AC.dateService.todayDate())
    me.record.set('dateNext', AC.dateService.addYears(AC.dateService.todayDate(), 3))
    UB.Repository('hr_publServRang')
      .attrs(['dictRankID.code', 'dictRankID', 'dictRankID.codeAsNumber'])
      .where('employeeID', '=', me.record.get('employeeID'))
      .orderBy('dictRankID.codeAsNumber', 'ASC').limit(1)
      .selectSingle().then(data => {
        if (data && data['dictRankID.code'] !== '1') {
          const code = parseInt(data['dictRankID.code']) - 1
          if (code) {
            UB.Repository('hr_dictRank')
              .attrs('ID')
              .where('code', '=', code.toString())
              .selectSingle().then(item => {
                me.record.set('dictRankID', item.ID)
              })
          }
        }
      })
  }
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
      setDateNext(me)
      break
    case 'dictRankID':
      setDateNext(me)
      break
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Планова дата присвоєння'),
    name: 'actionAllowDateNext',
    handler: function () {
      const rank = me.attr.dictRankID.getFieldValue('code')
      if (rank === '1') {
        AC.viewUtils.showToast(UB.i18n('Встановлено найвищий ранг, неможливо присвоїти наступний ранг'))
      } else {
        me.attr.dateNext.setVisible(true)
      }
    }
  })
}

function onAfterSave () {
  const me = this
  me.setLoading(true)
  me.sender.getStore().load().then(x => {
    me.setLoading(false)
  })
}

function setDateNext (me) {
  if (me.attr.dictRankID.getFieldValue('code') === '1') {
    me.record.set('dateNext', AC.dateService.maxDate())
  } else {
    if (!AC.dateService.isMaxDate(me.record.get('dateNext'))) {
      let dateFrom = me.attr.dateFrom.getValue()
      me.attr.dateNext.setValue(dateFrom && AC.dateService.isValid(dateFrom) ? AC.dateService.addYears(dateFrom, 3) : null)
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
