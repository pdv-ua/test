/* global AC HR $App _ Ext UB appAC */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  calcUnpaidAbsence,
  postInit,
  onAfterOrderSave,
  onGridEdit,
  addBaseActions,
  getDimension
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'calendarDayCount', 'dayCount', 'dateTo'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        calcUnpaidAbsence(me, true, ctrl.name)
      }
      break
    case 'calendarDayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        me.attr.dayCount.setValue()
        calcUnpaidAbsence(me, true, ctrl.name)
      }
      ctrl.calcValue = null
      break
    case 'dayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        me.attr.calendarDayCount.setValue()
        calcUnpaidAbsence(me, true, ctrl.name)
      }
      ctrl.calcValue = null
      break
    case 'dateTo':
      if (value && ctrl.calcValue !== value) {
        me.attr.calendarDayCount.setValue()
        calcUnpaidAbsence(me, true, ctrl.name)
      }
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }

  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': ['15', '41'],
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
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  me.attr.orderRegistryDt.getStore().sort('dateFrom', 'ASC')
  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.dayCount.calcValue = me.record.get('dayCount')
  me.attr.calendarDayCount.calcValue = me.record.get('calendarDayCount')

  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 12)
  if (!me.isNewInstance) setDateRange(me)
  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'calendarDayCount', 'dayCount', 'dateTo']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcUnpaidAbsence.setDisabled(me.record.get('orderState') === 'POSTED')
}

function setDateRange (me) {
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateFrom.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
  me.attr.dateTo.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateTo.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo') > me.maxDateTo ? me.maxDateTo : me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
}

function checkDateRange (me) {
  if (AC.dateService.unshiftDate(me.record.get('dateFrom')) < me.attr.dateFrom.minValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата початку не може бути раніше ніж {0}!`, AC.dateService.formatDate(me.attr.dateFrom.minValue)))
    return false
  }
  if (AC.dateService.unshiftDate(me.record.get('dateTo')) > me.attr.dateTo.maxValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата закінчення не може бути пізніше ніж {0}!`, AC.dateService.formatDate(me.attr.dateTo.maxValue)))
    return false
  }
  return true
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'workPlaceOnly':
      me.attr.dateFrom.setValue()
      me.attr.calendarDayCount.setValue()
      me.attr.dayCount.setValue()
      me.attr.dateTo.setValue()
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      setDateRange(me)
      calcUnpaidAbsence(me, true)
      break
    case 'payElID':
      calcUnpaidAbsence(me, true)
      break
    case 'orderNumber':
      me.attr.orderRegistryDt.getStore().data.items.forEach((row, idx) => { row.set(field.name, value) })
      break
    case 'orderDate':
      if (field.isValid()) {
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      }
      break
  }
}

function calcUnpaidAbsence (me, clear, ctrlName) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }

  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue() ||
    !(me.attr.calendarDayCount.getValue() || me.attr.dayCount.getValue() || me.attr.dateTo.getValue())) {
    return
  }

  if (!checkDateRange(me)) {
    return
  }

  me.setLoading(true)

  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    me.attr.orderRegistryDt.removeAll()
  }

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    orderID: me.instanceID,
    payElID: me.attr.payElID.getValue(),
    dayAccumCondition: 'calend', // завжди беремо календарні дні
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    calendarDayCount: me.attr.calendarDayCount.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    ctrlName: ctrlName || (me.attr.dateTo.getValue() ? 'dateTo' : (me.attr.dayCount.getValue() ? 'dayCount' : (me.attr.calendarDayCount.getValue() ? 'calendarDayCount' : 'dateTo'))),
    accruals: []
  }
  if (!clear) {
    me.attr.orderRegistryDt.getData().forEach((data, idx) => {
      params.accruals.push(Object.assign(data, { idx: idx }))
    })
  }

  $App.connection.run({
    entity: 'hr_docRegUnpaidAbsence',
    method: 'calcUnpaidAbsence',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const store = me.attr.orderRegistryDt.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateTo.calcValue = AC.dateService.shiftDate(data.dateTo)
    me.attr.dateTo.setValue(AC.dateService.shiftDate(data.dateTo))
    me.attr.dayCount.calcValue = data.dayCount
    me.attr.dayCount.setValue(me.attr.dayCount.calcValue)
    me.attr.calendarDayCount.calcValue = data.calendarDayCount
    me.attr.calendarDayCount.setValue(me.attr.calendarDayCount.calcValue)
    if (clear || !store.count()) {
      data.accruals.forEach(accr => {
        accr.orderID = me.instanceID
        accr.orderNumber = me.record.get('orderNumber')
        accr.orderDate = me.record.get('orderDate')
        accr.orderRegistryID = me.record.get('orderRegistryID')
      })
      store.insert(store.data.length, data.accruals)
    } else {
      data.accruals.forEach(accr => {
        const record = store.getAt(accr.idx)
        record.set('baseSum', accr.baseSum)
        record.set('paySum', accr.paySum)
        record.set('workDays', accr.workDays)
        record.set('mask', accr.mask)
        record.set('flagsRec', accr.flagsRec)
        record.set('flagsFix', accr.flagsFix)
      })
    }

    store.sort('dateFrom', 'ASC')
    me.attr.orderRegistryDt.GridSummary.dataBind()
    me.setIsDirty(true)
    me.setLoading(false)
  })
}

function onGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (ctrl.flagsFix) {
    if (context.value === null) {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    } else {
      if (context.column.field.prevValue !== context.value) {
        context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
      }
    }
  }
  me.calcUnpaidAbsence(me)
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

  if (!me.actions.calcUnpaidAbsence) {
    me.actions.calcUnpaidAbsence = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcUnpaidAbsence(me, true, 'dateTo')
      }
    })
  }
}

function getDimension (me, record) {
  if (record) {
    const accrualDt = record.get('accrualDt')
    if (accrualDt) {
      $App.connection.run({
        entity: 'hr_rl',
        method: 'getDimension',
        params: typeof accrualDt === 'object' ? JSON.stringify(accrualDt) : accrualDt,
        orgID: me.record.get('orderRegistryID.organizationID')
      }).then(response => {
        const data = JSON.parse(response.resultData)
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rlDimension',
          isModal: true,
          cmpInitConfig: {
            defaultValues: data,
            typeData: 'orderRegistryDt'
          }
        })
      })
    }
  }
}
