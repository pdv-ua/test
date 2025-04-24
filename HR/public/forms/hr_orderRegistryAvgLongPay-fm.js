/* global appAC HR AC _ UB $App */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  initOrderComponentDone,
  beforeOrderRegistryCancelPostingSelected
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

  me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()

  if (me.isNewInstance) {
    me.setTitle(UB.i18n(`Тривала оплата за середнім заробітком {0} (Створення)`, me.record.get('orderNumber')))
  } else {
    me.setTitle(UB.i18n(`Тривала оплата за середнім заробітком {0}`, me.record.get('orderNumber')))
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
}

async function beforeOrderRegistryCancelPostingSelected (me, docRegIDs) {
  const details = await UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'employeeNumberID.description', 'periodCalcID.name'])
    .where('orderID', 'in', docRegIDs || [])
    .where('periodCalcID.isClosed', '=', 1)
    .selectAsObject()
  let result = true
  if (details.length) {
    const message = details.map(o => `${o['employeeNumberID.description']} з "${o['periodCalcID.name']}"`).join('<br/>')
    result = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Документ був проведений у закритому періоді! При скасуванні проведення буде виконано перерахунок:<br/>{0}<br/>Продовжити?', message))
  }
  return Promise.resolve({ postingDocRegIDs: result ? docRegIDs : [] })
}
