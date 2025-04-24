/* global AC appAC _ Ext UB $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  changeAttrsLock
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', function () {
    changeAttrsLock(me)
  })
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this

  if (me.isNewInstance) {
    me.down('[name=dictSpecialRankID.rankType]').setValue(AC.settings.get('hrSpecialRankByDefault', appAC.globalOrganization()))
  } else {
    me.attr['dictSpecialRankID.rankType'].readOnly = !me.isNewInstance
    AC.viewUtils.setFilterValue(me.attr.dictSpecialRankNextID, { rankType: me.record.get('dictSpecialRankID.rankType') })
  }

  const defaultValues = me.defaultValues || _.get(me, 'commandConfig.defaultValues') || _.get(me, 'commandConfig.cmpInitConfig.defaultValues') || null

  if (defaultValues['employeeID']) {
    me.record.set('employeeID', defaultValues.employeeID)
  }

  if (defaultValues['dictSpecialRankNextID']) {
    me.setLoading(true)

    Promise.all([UB.Repository('hr_dictSpecialRank')
      .attrs(['ID', 'rankType'])
      .selectById(defaultValues['dictSpecialRankNextID']).then(nextRank => {
        if (nextRank) {
          me.down('[name=dictSpecialRankID]').setValueById(nextRank['ID'])
          me.down('[name=dictSpecialRankID.rankType]').setValue(nextRank['rankType'])
        }
      }),
    UB.Repository('hr_employeeSpecialRank')
      .attrs(['ID'])
      .where('employeeID', '=', me.defaultValues.employeeID)
      .where('dateTo', '>=', '9999-12-31')
      .selectSingle().then(prevRank => {
        if (prevRank) {
          me.down('[name=dictSpecialRankID]').setValue(prevRank['ID'])

          prevRank['dateFrom'] && $App.connection.update({
            entity: 'hr_employeeSpecialRank',
            __skipOptimisticLock: true,
            execParams: {
              ID: prevRank['ID'],
              dateTo: AC.dateService.shiftDate(AC.dateService.priorDay(me.defaultValues.dateFrom))
            }
          })
        }
      })
    ]).finally(() => me.setLoading(false))
  }
  if (!me.down('[ubID=btnNextMenu]')) {
    const tb = me.down('toolbar')
    tb.insert(4,
      Ext.create('Ext.Button', {
        ubID: 'btnNextMenu',
        xtype: 'button',
        text: UB.i18n('Наступний (F7)'),
        handler: function () {
          makeNextRecord(me)
        }
      }))
    const wnd = me.getFormWin() || me.up()
    const newkeymap = new Ext.util.KeyMap({
      target: (wnd && wnd.getEl()) || me,
      binding: [{
        key: Ext.EventObject.F7,
        fn: function (keyCode, e) {
          makeNextRecord(me)
        }
      }]
    })
  }
}

function onControlChanged (field, value) {
  const me = this
  if (field.getName() === 'dictSpecialRankID.rankType') {
    changeAttrsLock(me)
    AC.viewUtils.setFilterValue(me.attr.dictSpecialRankID, { rankType: value })
  }
}

function changeAttrsLock (me) {
  const rankType = me.attr['dictSpecialRankID.rankType'].getValue()
  me.attr['dictSpecialRankID'].setDisabled(!rankType)
  me.attr['rankAssignKindID'].setDisabled(!rankType)
  me.attr['dateFrom'].setDisabled(!rankType)
  me.attr['dateTo'].setDisabled(!rankType)
  me.attr['orderNumber'].setDisabled(!rankType)
  me.attr['orderDate'].setDisabled(!rankType)
  me.attr['comment'].setDisabled(!rankType)
}

function makeNextRecord (form) {
  const me = form
  me.fromMakeNextRecord = true
  me.saveForm()
    .then(function (saveStatus) {
      if (saveStatus >= 0) {
        const grid = me.sender || AC.gridUtils.getSenderGrid(me)
        const store = grid && grid.getStore && grid.getStore()
        const runParams = {
          cmdType: 'showForm',
          formCode: me.formCode,
          entity: me.entityName,
          instanceID: null,
          isModal: true,
          tabId: null,
          sender: me.sender,
          gridSender: me.gridSender,
          cmpInitConfig: {
            defaultValues: {
              dictSpecialRankNextID: me.record.get('dictSpecialRankID.dictSpecialRankNextID'),
              employeeID: me.record.get('employeeID'),
              dateFrom: me.record.get('dateFrom')
            }
          }
        }
        if (store) {
          store.load().then(() => {
            $App.doCommand(runParams)
            me.closeWindow(true)
          })
        } else {
          $App.doCommand(runParams)
          me.closeWindow(true)
        }
      }
    })
}
