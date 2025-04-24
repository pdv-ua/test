/* global appAC appHR HR AC _ UB $App */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  initOrderComponentDone,
  doReversalAction,
  doCancelReversalAction,
  doReversalAllDocAction,
  doCancelReversalAllDocAction
}

function initComponentStart () {
  let me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.getStore().removeAll()
  }
}

function initOrderComponentDone (me) {
  HR.orderManager.orderRegistryInit(me)
  let tb = me.attr.orderRegistryDt.down('toolbar')
  tb.insert(tb.items.length - 2, {
    xtype: 'button',
    scale: 'medium',
    iconCls: 'u-icon-circle-minus',
    cls: 'red-action',
    actionId: 'reversalActionBtn',
    tooltip: UB.i18n('Сторнувати'),
    text: UB.i18n('Сторно'),
    hidden: true,
    handler: function () {
      me.doReversalAction()
    }
  })
  tb.insert(tb.items.length - 2, {
    xtype: 'button',
    scale: 'medium',
    iconCls: 'u-icon-circle-close',
    cls: 'red-action',
    actionId: 'cancelReversalActionBtn',
    hidden: true,
    text: UB.i18n('Скасувати сторно'),
    tooltip: UB.i18n('Скасувати сторнування'),
    handler: function () {
      me.doCancelReversalAction()
    }
  })
}

async function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  // me.attr.orderRegistryDt.setReadOnly(me.record.get('orderState') === 'POSTED')
  // me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  // AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  if (me.isNewInstance) {
    me.setTitle(`${UB.i18n('Лікарняні')} ${me.record.get('orderNumber')} (${UB.i18n('Створення')})`)
  } else {
    me.setTitle(`${UB.i18n('Лікарняні')} ${me.record.get('orderNumber')}`)
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])

  appHR.getCurrentPeriod(appAC.globalOrganization())
    .then(currentPeriod => {
      if (currentPeriod.ID) {
        UB.Repository('hr_orderRegistryDt')
          .attrs(['ID'])
          .where('orderRegistryID', '=', me.instanceID)
          .where('periodCalcID.dateFrom', '<', currentPeriod.dateFrom)
          .where('orderID.orderState', '=', 'POSTED')
          .selectSingle().then(data => {
            if (data) {
              me.down('[actionId=reversalActionBtn]').show()
              // me.down('[actionId=reversalAllActionBtn]').show()
            } else {
              me.down('[actionId=reversalActionBtn]').hide()
              // me.down('[actionId=reversalAllActionBtn]').hide()
            }
          })
      }
    })
  UB.Repository('hr_orderRegistryDt')
    .attrs(['ID'])
    .where('orderRegistryID', '=', me.instanceID)
    .where('periodCalcID', 'isNull')
    .where('storno', '=', '1')
    .selectSingle().then(data => {
      if (data) {
        me.down('[actionId=cancelReversalActionBtn]').show()
        // me.down('[actionId=cancelReversalAllActionBtn]').show()
      } else {
        me.down('[actionId=cancelReversalActionBtn]').hide()
        // me.down('[actionId=cancelReversalAllActionBtn]').hide()
      }
    })
  // }
}

function doReversalAction () {
  const me = this
  const errors = []
  let docRegIDs = HR.orderManager.uniqListOfIDs(HR.orderManager.getSelectedOrderRegistry(me))
  if (!docRegIDs.length) {
    return
  }
  $App.showModal({
    formCode: 'hr_orderRegistryDialog',
    description: UB.i18n('Попередження'),
    isClosable: true,
    customParams: {
      message: UB.i18n(`Документ нарахування було проведено у закритому періоді!`),
      buttons: [UB.i18n('Не сторнувати'), UB.i18n('Тільки сторнувати'), UB.i18n('Сторнувати та розрахувати ')],
      buttonWidth: 210
    }
  }).then(buttonIndex => {
    if (buttonIndex) {
      const action = buttonIndex === 2 ? 'recalc' : 'revers'
      UB.Repository('hr_orderRegistryDt')
        .attrs('orderID')
        .where('orderRegistryID', '=', me.instanceID)
        .where('orderID', 'in', docRegIDs)
        .where('orderID.orderState', '=', 'POSTED')
        .orderBy('employeeNumberID')
        .orderBy('dateFrom', 'desc')
        .selectAsObject().then(data => {
          docRegIDs = HR.orderManager.uniqListOfIDs(data.map(o => o.orderID), true)
          if (docRegIDs.length) {
            me.setLoading(true)
            doReversalSelectedDoc(me, docRegIDs, 0, action, errors)
          }
        })
    }
  })
}

function doCancelReversalAction () {
  const me = this
  const errors = []
  let docRegIDs = HR.orderManager.uniqListOfIDs(HR.orderManager.getSelectedOrderRegistry(me))
  if (!docRegIDs.length) {
    return
  }
  UB.Repository('hr_orderRegistryDt')
    .attrs('orderID')
    .where('orderRegistryID', '=', me.instanceID)
    .where('orderID', 'in', docRegIDs)
    .where('storno', '=', '1')
    .where('periodCalcID', 'isNull')
    .selectAsObject().then(data => {
      docRegIDs = HR.orderManager.uniqListOfIDs(data.map(o => o.orderID), true)
      if (docRegIDs.length) {
        me.setLoading(true)
        doCancelReversalSelectedDoc(me, docRegIDs, 0, errors)
      }
    })
}

function doReversalAllDocAction () {
  const me = this
  const errors = []
  $App.showModal({
    formCode: 'hr_orderRegistryDialog',
    description: UB.i18n('Попередження'),
    isClosable: true,
    customParams: {
      message: UB.i18n(`Документ нарахування було проведено у закритому періоді!`),
      buttons: [UB.i18n('Не сторнувати'), UB.i18n('Тільки сторнувати'), UB.i18n('Сторнувати та розрахувати ')],
      buttonWidth: 210
    }
  }).then(buttonIndex => {
    if (buttonIndex) {
      const action = buttonIndex === 2 ? 'recalc' : 'revers'
      UB.Repository('hr_orderRegistryDt')
        .attrs('orderID')
        .where('orderRegistryID', '=', me.instanceID)
        .where('orderID.orderState', '=', 'POSTED')
        .orderBy('employeeNumberID')
        .orderBy('dateFrom', 'desc')
        .selectAsObject().then(data => {
          const docRegIDs = HR.orderManager.uniqListOfIDs(data.map(o => o.orderID))
          if (docRegIDs.length) {
            me.setLoading(true)
            doReversalSelectedDoc(me, docRegIDs, 0, action, errors)
          }
        })
    }
  })
}

function doCancelReversalAllDocAction () {
  const me = this
  const errors = []
  $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Скасувати сторнування документа?'))
    .then(function (choice) {
      if (choice) {
        UB.Repository('hr_orderRegistryDt')
          .attrs('orderID')
          .where('orderRegistryID', '=', me.instanceID)
          .where('storno', '=', '1')
          .where('periodCalcID', 'isNull')
          .selectAsObject().then(data => {
            const docRegIDs = HR.orderManager.uniqListOfIDs(data.map(o => o.orderID), true)
            if (docRegIDs.length) {
              me.setLoading(true)
              doCancelReversalSelectedDoc(me, docRegIDs, 0, errors)
            }
          })
      }
    })
}

function doReversalSelectedDoc (me, docRegIDs, idx, action, errors) {
  me.setLoading(true)
  if (idx < docRegIDs.length) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'doReversalDocReg',
      execParams: {
        ID: me.instanceID,
        docRegID: docRegIDs[idx],
        action: action
      }
    }).then(() => {
      doReversalSelectedDoc(me, docRegIDs, ++idx, action, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      doReversalSelectedDoc(me, docRegIDs, ++idx, action, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}

function doCancelReversalSelectedDoc (me, docRegIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docRegIDs.length) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'doCancelReversalDocReg',
      execParams: {
        ID: me.instanceID,
        docRegID: docRegIDs[idx]
      }
    }).then(() => {
      doCancelReversalSelectedDoc(me, docRegIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      doCancelReversalSelectedDoc(me, docRegIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}
