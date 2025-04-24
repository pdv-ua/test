/* global appAC HR AC _ UB */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  initOrderComponentDone
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
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }

  const readOnlyAttr = ['orderRegistryDt', 'orderNumber', 'name']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })

  // me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  // AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()

  if (me.isNewInstance) {
    me.setTitle(`${UB.i18n('Оплата за середнім заробітком')} ${me.record.get('orderNumber')} (${UB.i18n('Створення')})`)
  } else {
    me.setTitle(`${UB.i18n('Оплата за середнім заробітком')} ${me.record.get('orderNumber')}`)
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
}
