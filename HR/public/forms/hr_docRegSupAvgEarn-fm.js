/* global AC HR $App _ Ext UB appAC appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcSupAvgEarn,
  onGridEdit,
  addBaseActions
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['accrualAvg'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.accrualAvg.length')) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg)
  } else if (data.method !== 'addnew') {
    me.attr.accrualAvg.removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'dateTo', 'calendarDayCount', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  let flagsRec = me.record.get('flagsRec')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        calcSupAvgEarn(me, true, true, ctrl.name)
      }
      break
    case 'calendarDayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        calcSupAvgEarn(me, true, false, ctrl.name)
      }
      ctrl.calcValue = null
      break
    case 'dateTo':
      if (value && ctrl.calcValue !== value) {
        me.attr.calendarDayCount.setValue()
        calcSupAvgEarn(me, true, false, ctrl.name)
      }
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (ctrl.calcValue !== value) {
        if (value && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcSupAvgEarn(me, false, true)
      }
      break
    case 'avgSum' :
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcSupAvgEarn(me, false, false)
      }
      break
    case 'avgCalcType' :
      if (ctrl.calcValue !== value) {
        if (value) {
          const flag = value === 'FACT' ? (1 << 7) : value === 'PLAN' ? (1 << 8) : (1 << 6)
          me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12)) | flag)
        } else {
          me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12)))
        }
        me.attr.dateFromAvg.calcValue = null
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.calcValue = null
        me.attr.dateToAvg.setValue()
        me.record.set('flagsFix', flagsFix & ~(me.attr.dateFromAvg.flagsFix | me.attr.dateToAvg.flagsFix))
        calcSupAvgEarn(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg, false, true)
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
        'methodID.code': '50',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  const isTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') && isTariffingEducational ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')

  me.attr.workPlaceOnly[isTariffingEducational ? 'show' : 'hide']()
  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.calendarDayCount.calcValue = me.record.get('calendarDayCount')
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSum.calcValue = me.record.get('avgSum')

  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'calendarDayCount', 'dateTo', 'dateFromAvg', 'dateToAvg']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcSupAvgEarn.setDisabled(me.record.get('orderState') === 'POSTED')
  // me.actions.printDocumentAction.setDisabled(me.isNewInstance)
  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 6)
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  if (!me.isNewInstance) setDateRange(me)
}

function configureAccrualAvg (state) {
  const me = this
  me.attr.accrualAvg.down('[dataIndex = opKoef]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSumNotIndex]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSum]').setText(state ? UB.i18n('Заробіток, що індексується') : UB.i18n('Заробіток'))
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
      me.attr.dateTo.setValue()
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      setDateRange(me)
      calcSupAvgEarn(me, true, true)
      break
    case 'payElID':
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      calcSupAvgEarn(me, true, true)
      break
    case 'orderDate':
      if (field.isValid()) {
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        me.attr.avgSum.setValue()
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      }
      break
  }
}

function calcSupAvgEarn (me, clear, clearAvg, ctrlName) {
  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue() ||
    !(me.attr.calendarDayCount.getValue() || me.attr.dateTo.getValue())) {
    return
  }

  if (!checkDateRange(me)) {
    return
  }

  me.setLoading(true)

  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }
  if (clearAvg) {
    me.attr.accrualAvg.removeAll()
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
    dayAccumCondition: me.attr.payElID.getFieldValue('methodID.dayAccumCondition') || 'noDaysOff',
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    calendarDayCount: me.attr.calendarDayCount.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    accruals: [],
    accrualsAvg: []
  }
  if (!clearAvg) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  $App.connection.run({
    entity: 'hr_docRegSupAvgEarn',
    method: 'calcSupAvgEarn',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateTo.calcValue = AC.dateService.shiftDate(data.dateTo)
    me.attr.dateTo.setValue(AC.dateService.shiftDate(data.dateTo))
    me.attr.calendarDayCount.calcValue = data.calendarDayCount
    me.attr.calendarDayCount.setValue(me.attr.calendarDayCount.calcValue)
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.avgSum.calcValue = data.baseSum
    me.attr.avgSum.setValue(me.attr.avgSum.calcValue)
    me.configureAccrualAvg(data.avgCalcType === 'PREVIOUS')

    if (data.accrualsAvg) {
      if (clearAvg || !storeAvg.count()) {
        data.accrualsAvg.forEach(accr => {
          accr.orderID = me.instanceID
          accr.accrualDt = JSON.stringify(accr.accrualDt)
        })
        storeAvg.insert(storeAvg.data.length, data.accrualsAvg)
      } else {
        data.accrualsAvg.forEach(accr => {
          const record = storeAvg.getAt(accr.idx)
          accr.accrualDt = JSON.stringify(accr.accrualDt)
          if (record) {
            record.set('flagsFix', accr.flagsFix)
            record.set('opDays', accr.opDays)
            record.set('baseSum', accr.baseSum)
            record.set('baseSumNotIndex', accr.baseSumNotIndex)
            record.set('opSum', accr.opSum)
            record.set('opKoef', accr.opKoef)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
    me.setIsDirty(true)
    me.attr.dateFromAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
    me.attr.dateToAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
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
  me.calcSupAvgEarn(me)
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

  if (!me.actions.calcSupAvgEarn) {
    me.actions.calcSupAvgEarn = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcSupAvgEarn(me, true, true)
      }
    })
  }
}
