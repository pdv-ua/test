/* global AC HR _ $App appAC appHR */
exports.formCode = {
  initComponentStart,
  postInit,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions
}

function initComponentStart () {
  const me = this
  HR.orderManager.init(me)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone () {
  const me = this
  me.attr['paySum'].on('blur', changeParams)
  me.attr['paySum'].on('keypress', onAttrKeypress)
}

function postInit (me) {
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'paySum' :
      if (ctrl.calcValue !== value) {
        if (value && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcFuneral(me)
      }
      break
  }
}

function onFormDataReady () {
  const me = this
  me.baseDoc = me.record.get('empOrderID')
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '135',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
    organizationID: me.record.get('orderRegistryID.organizationID'),
    workPlace: { value: ['1', '4'], condition: 'in' },
    dateTo: { value: me.record.get('orderDate'), condition: '>=' },
    dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
  })
  if (me.record.get('employeeFuneralID.workPlace') !== '4') { // у штаті
    me.attr.employeeFamilyID.setVisible(true)
    AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
      employeeID: me.record.get('employeeFuneralID.employeeID')
    })
  } else {
    me.attr.employeePositionID.setVisible(true)
    if (me.record.get('orderDate')) {
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
        ['dateTo', '<', '#maxdate', 'dismDateTo'],
        ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
        ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
        ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
    }
  }

  const baseDepended = [
    'orderDate',
    'employeeFuneralID',
    'employeePositionID',
    'employeeFamilyID',
    'seriaDoc',
    'numberDoc',
    'dateDoc',
    'addDoc'
  ]
  baseDepended.forEach(attrName => {
    me.attr[attrName].setReadOnly(me.baseDoc)
  })

  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.baseDoc
  baseDepended.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'employeeFuneralID':
      if (me.attr.employeeFuneralID.getFieldValue('workPlace') === '4') { // поза штатом
        me.attr.employeeFamilyID.setVisible(false)
        me.attr.employeeFamilyID.setValue()
        me.attr.employeePositionID.setVisible(true)
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      } else {
        me.attr.employeePositionID.setVisible(false)
        me.attr.employeePositionID.setValue()
        me.attr.employeeFamilyID.setVisible(true)
        AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
          'employeeID': field.getFieldValue('employeeID')
        }, ['clearValue'])
      }
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      break

    case 'orderDate':
      if (field.isValid()) {
        const orderDate = AC.dateService.truncTimeToUtcNull(value)
        AC.viewUtils.setFilterValue(me.attr.employeeFuneralID, {
          organizationID: me.record.get('orderRegistryID.organizationID'),
          dateTo: { value: orderDate, condition: '>=' },
          dateFrom: { value: orderDate, condition: '<=' }
        }, ['clearValue'])
      }
      break

    case 'seriaDoc':
    case 'numberDoc':
      me.attr.orderNumber.setValue(`${me.attr.seriaDoc.getValue() || ''}${me.attr.numberDoc.getValue() || ''}`)
      break
    case 'dictFundSourceID':
      calcFuneral(me)
      break
  }
}

function calcFuneral (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.attr.employeeFuneralID.getValue() || !me.attr.payElID.getValue()) {
    return
  }
  me.setLoading(true)

  let flagsFix = me.record.get('flagsFix')
  if (me.attr.dictFundSourceID.getValue()) {
    me.record.set('flagsFix', flagsFix | 1 << 14)
  } else {
    me.record.set('flagsFix', flagsFix & ~(1 << 14))
  }

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeeFuneralID.getFieldValue('employeeNumberID'),
    payElID: me.attr.payElID.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    paySum: me.record.get('paySum')
  }

  $App.connection.run({
    entity: 'hr_docRegFuneralComp',
    method: 'calc',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    me.attr.accrualDt.setValue(data.accrualDt)
    me.setIsDirty(true)
    me.setLoading(false)
  })
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
