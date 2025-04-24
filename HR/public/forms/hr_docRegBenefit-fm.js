/* global AC HR _ appAC appHR */
exports.formCode = {
  initComponentStart,
  postInit,
  onFormDataReady,
  onControlChanged,
  addBaseActions
}

function initComponentStart () {
  const me = this
  HR.orderManager.init(me)
}

function postInit (me) {
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('flagsRec', 2 | 1 << 13)
    me.record.set('flagsFix', 1)
  }
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '141',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'paySum']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
}

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeePositionID':
        const employeeID = field.getFieldValue('employeeID')
        me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
        me.attr.employeeID.setValue(employeeID)
        break
      case 'orderDate':
        if (value && field.isValid()) {
          AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
            ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
            ['dateTo', '<', '#maxdate', 'dismDateTo'],
            ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
            ['dateTo', '>=', value, 'dateTo'],
            ['dateFrom', '<=', value, 'dateFrom']
          ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
        }
        break
    }
  }
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
