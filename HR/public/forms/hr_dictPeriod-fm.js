/* global AC UB Ext  $App appAC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  openPeriod,
  runOpenPeriod,
  onRecordLoaded,
  onAfterSave,
  onPrepareDataBeforeSave,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('aftersave', onAfterSave, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.setActionDisabled('fDelete', true)
  createActions(me)
  me.attr.current.on('change', (ctrl, value) => {
    if (value !== me.record.get('isCurrent')) {
      me.setIsDirty(true)
    }
    if (value) {
      me.attr.closed.setValue(false)
    }
  })
  me.attr.closed.on('change', (ctrl, value) => {
    if (value !== me.record.get('isClosed')) {
      me.setIsDirty(true)
    }
    if (value) {
      me.attr.current.setValue(false)
    }
  })
  me.attr.current.setValue(true)
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)
  let openPeriodAction = me.actions.openPeriodAction
  if (!openPeriodAction) {
    openPeriodAction = new Ext.Action({
      iconCls: 'fas fa-unlock-alt',
      cls: 'green-action',
      actionId: 'openPeriodAction',
      text: UB.i18n('Відкрити період'),
      tooltip: UB.i18n('Відкрити період'),
      actionText: UB.i18n('Відкрити період'),
      eventId: 'openPeriodAction',
      hidden: !AC.entityUtils.verifyRightsMethod('hr_dictPeriod', 'openPeriod'),
      disabled: !AC.entityUtils.verifyRightsMethod('hr_dictPeriod', 'openPeriod'),
      handler: function () {
        me.openPeriod(me)
      }
    })
    me.actions.openPeriodAction = openPeriodAction
  }
}

function openPeriod (me) {
  $App.dialogYesNo('Попередження', UB.i18n(`Відкрити період {0}?`, me.record.get('name')))
    .then(res => {
      if (res) {
        if (AC.settings.get('hrLinkToBuh', appAC.globalOrganization())) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_paySummary',
            method: 'doCancelPosting',
            openPeriod: true,
            orgID: appAC.globalOrganization()
          }).then(response => {
            me.setLoading(false)
            if (response.message !== '') {
              $App.dialogInfo(UB.i18n(`Відклик проводок не виконано. Причина: </br> {0}</br>. Відкриття розрахункового періоду неможливе. Виконайте розблокування проводок у Бухгалтерському обліку і повторіть відкриття розрахункового періоду зарплати`, response.message))
            } else {
              me.runOpenPeriod(me)
            }
          }, function (err) {
            me.setLoading(false)
            $App.dialogInfo(UB.i18n(`Відклик проводок не виконано. Причина: </br> {0}</br>. Відкриття розрахункового періоду неможливе. Виконайте розблокування проводок у Бухгалтерському обліку і повторіть відкриття розрахункового періоду зарплати`, err.message))
          })
        } else {
          me.runOpenPeriod(me)
        }
      }
    })
}

function runOpenPeriod (me) {
  me.setLoading(UB.i18n('Зачекайте. Іде відкриття періода'))
  $App.connection.run({
    entity: 'hr_dictPeriod',
    method: 'openPeriod',
    orgID: appAC.globalOrganization(),
    period: {
      ID: me.instanceID,
      nextPeriodID: me.record.get('nextPeriodID'),
      mi_modifyDate: me.record.get('mi_modifyDate')
    }
  }).then(() => {
    me.setLoading(false)
    me.record.dirty = false
    me.onRefresh()
    me.sender.getStore().load()
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}

function onFormDataReady () {
  const me = this
  me.actions.openPeriodAction.setDisabled(!(me.record.get('isClosed') && me.record.get('nextPeriodID.isCurrent')))
}

function onRecordLoaded () {
  const me = this
  setStartData(me)
}

function onAfterSave () {
  const me = this
  setStartData(me)
}

function setStartData (me) {
  me.attr.current.setValue(!!me.record.get('isCurrent'))
  me.attr.closed.setValue(!!me.record.get('isClosed'))
}

function onPrepareDataBeforeSave (me, params) {
  params.formData = {
    isCurrent: me.attr.current.getValue(),
    isClosed: me.attr.closed.getValue()
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
    text: UB.i18n('Коригування ознак періоду'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    disabled: !HR.orderManager.isAdmin(),
    handler: function () {
      me.attr.current.setReadOnly(me.record.get('nextPeriodID.isClosed'))
      me.attr.closed.setReadOnly(me.record.get('nextPeriodID.isClosed'))
      const priorClose = me.record.get('priorPeriodID.isClosed') || me.record.get('priorPeriodID.isClosed') === null
      if (me.record.get('isClosed')) {
        me.attr.closed.setReadOnly(!priorClose || me.record.get('nextPeriodID.isClosed'))
        me.attr.current.setReadOnly(!priorClose || me.record.get('nextPeriodID.isClosed'))
      } else {
        me.attr.closed.setReadOnly(!priorClose)
        me.attr.current.setReadOnly(!priorClose)
      }
    }
  })
}
