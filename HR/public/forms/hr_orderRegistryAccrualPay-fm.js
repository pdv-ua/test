/* global HR AC $App _ UB */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  beforeGridEdit,
  setEmployeeList,
  onGridEdit,
  onCheckValidBeforeSaveOrder,
  fillAccrual,
  loadPayElParams
}

function onCheckValidBeforeSaveOrder () {
  return Promise.resolve(true)
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true,
    hideEditDocNumber: true
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
  HR.orderManager.setSourceOrderDescription(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('periodSalaryID', me.record.get('periodID'))
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  }
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })

  const readOnlyAttr = ['orderDate', 'docNumber', 'periodID', 'periodSalaryID']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.attr.orderRegistryDt.menu.items.items.forEach(act => { if ([].includes(act.name)) act.setDisabled(isReadOnly) })
  me.attr.orderRegistryDt.hideActions = isReadOnly ? ['addNewByCurrent', 'del', 'addNew', 'fillBtn'] : []
  const toolBar = me.attr.orderRegistryDt.down('toolbar')
  if (toolBar && toolBar.items && toolBar.items.items) {
    toolBar.items.items.forEach(item => {
      item.setDisabled(_.includes(me.attr.orderRegistryDt.hideActions, item.name))
    })
  }
  if (isReadOnly) {
    me.down('[actionId=addPayELByList]').hide()
  } else {
    me.down('[actionId=addPayELByList]').show()
  }
  if (!me.isNewInstance) {
    const grid = me.down('[name=orderRegistryPayEls]')
    me.loadPayElParams(grid, JSON.parse(me.record.get('payElParams')))
  }
}

function onControlChanged (me, field, value) {
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function beforeGridEdit (me, gridName, context) {
  if ([null, ''].includes(context.record.get('paySum'))) {
    context.record.set('paySum', 0)
  }
}

function onGridEdit (me, gridName, context, control) {
  const ctrl = context.column.field

  if (ctrl.flagsFix) {
    if (context.value !== null) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    } else {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    }
  }
  switch (context.column.field.name) {
    case 'paySum':
      if (context.value !== context.originalValue) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 9))
        context.record.set('accrualDt', HR.accrualService.correctAccrualDt(context.record.get('accrualDt'), context.record.get('paySum')))
      }
      break
  }
}
function setEmployeeList (me) {
  const payElParams = JSON.parse(me.record.get('payElParams')) || []
  if (!payElParams.length || !me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('Поля "Розрахунковий період" та "Вид оплати" повинні бути заповнені'), 'Помилка!')
    return
  }
  const count = me.attr.orderRegistryDt.getStore().snapshot ? me.attr.orderRegistryDt.getStore().snapshot.getCount() : me.attr.orderRegistryDt.getStore().count()
  if (count) {
    $App.dialogYesNo('Попередження', UB.i18n('Видалити існуючі записи?'))
      .then(res => {
        if (res) {
          me.attr.orderRegistryDt.removeAll()
          me.fillAccrual(me, true)
        }
      })
  } else {
    me.fillAccrual(me, true)
  }
}

function fillAccrual (me) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_orderRegistry',
    method: 'fillRegistryAccrualPay',
    params: {
      orgID: me.record.get('organizationID'),
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      payElID: null,
      payElParams: JSON.parse(me.record.get('payElParams')) || []
    }
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const store = me.attr.orderRegistryDt.getStore()
    me.attr.orderRegistryDt.suspendEvents()
    store.suspendEvents()
    data.forEach(row => {
      delete row.ID
    })
    if (me.attr.isOnlyPositive.value) {
      data = data.filter(value => {
        if (value.paySum >= 0) {
          return value
        }
      })
    }
    store.insert(store.data.length, data)
    store.resumeEvents()
    me.attr.orderRegistryDt.GridSummary.dataBind()
    me.attr.orderRegistryDt.resumeEvents()
    me.attr.orderRegistryDt.getView().refreshView()
    me.setIsDirty(true)
    me.setLoading(false)
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}

function loadPayElParams (grid, payEls) {
  grid.setLoading(true)
  UB.Repository('hr_payEl')
    .attrs(['ID', 'description'])
    .where('ID', 'in', payEls || [])
    .selectAsObject().then(data => {
      grid.removeAll()
      if (data) {
        const store = grid.getStore()
        store.insert(store.data.length, data)
      }
    }).finally(() => {
      grid.setLoading(false)
    })
}
