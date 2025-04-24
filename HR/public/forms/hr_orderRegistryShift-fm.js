/* global appAC UB HR AC _ */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  initOrderComponentDone,
  onControlChanged
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

function initOrderComponentDone (me) {
  HR.orderManager.orderRegistryInit(me)

  me.attr.orderRegistryDt.on('changeData', (grid, event) => {
    setReadOnlySalaryPeriod(me, !!grid.getStore().count())
  })
  me.attr.orderRegistryDt.getStore().on('load', store => {
    setReadOnlySalaryPeriod(me, !!store.count())
  })
}

function setReadOnlySalaryPeriod (me, readOnly) {
  me.attr.periodSalaryID.setReadOnly(readOnly)
  me.down('[name=priorSalaryPeriod]').setVisible(!readOnly)
  me.down('[name=nextSalaryPeriod]').setVisible(!readOnly)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    if (me.periods && me.periods.periodName) {
      me.attr.name.setValue(`${UB.i18n('Заміна за')} ${me.periods.periodName || ''}`)
    }
  }
  me.attr.orderRegistryDt.setReadOnly(me.record.get('orderState') === 'POSTED')
  me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  if (me.isNewInstance) {
    me.setTitle(`${UB.i18n('Заміна')} ${me.record.get('orderNumber')} (${UB.i18n('Створення')})`)
  } else {
    me.setTitle(`${UB.i18n('Заміна')} ${me.record.get('orderNumber')}`)
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '150' })
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
  if (me.isNewInstance) {
    UB.Repository('hr_payEl')
      .attrs('ID')
      .where('methodID.code', '=', '150')
      .selectSingle().then(rec => {
        if (rec) {
          me.attr.payElID.setValueById(rec.ID)
        }
      })
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'periodSalaryID':
      me.attr.name.setValue(`Заміна за ${me.attr.periodSalaryID.getFieldValue('name') || ''}`)
      break
  }
}
