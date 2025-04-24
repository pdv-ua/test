/* global AC HR $App _ Ext UB appAC */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcBusinessTrip,
  onGridEdit,
  addBaseActions,
  getDimension
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt', 'accrualAvg'],
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
  ['dateFrom', 'dateTo', 'dayCount', 'calendarDayCount', 'dateFromAvg', 'dateToAvg', 'indAvgPlan',
    'planSum', 'avgSum', 'calcSum', 'calcEarnings'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  const flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      setPayElWhereListDate(me, false)
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.dateTo.setValue()
        calcBusinessTrip(me, true, true, ctrl.name)
      }
      break
    case 'calendarDayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.dayCount.calcValue = null
        me.attr.dateTo.setValue()
        me.attr.dayCount.setValue()
        calcBusinessTrip(me, true, false, ctrl.name)
      }
      ctrl.calcValue = null
      break
    case 'dayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.calendarDayCount.calcValue = null
        me.attr.dateTo.setValue()
        me.attr.calendarDayCount.setValue()
        calcBusinessTrip(me, true, false, ctrl.name)
      }
      ctrl.calcValue = null
      break
    case 'dateTo':
      setPayElWhereListDate(me, false)
      if (value && ctrl.calcValue !== value) {
        me.attr.calendarDayCount.calcValue = null
        me.attr.calendarDayCount.setValue()
        calcBusinessTrip(me, true, false, ctrl.name)
      }
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (!ctrl.readOnly) {
        if (ctrl.calcValue !== value) {
          const store = me.attr.orderRegistryDt.getStore()
          const allRecords = store.snapshot || store.data
          if (value && ctrl.isValid()) {
            me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
            allRecords.each(record => {
              record.set('flagsFix', record.get('flagsFix') | ctrl.flagsFix)
            })
          } else {
            me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
            allRecords.each(record => {
              record.set('flagsFix', record.get('flagsFix') & ~ctrl.flagsFix)
            })
          }
          calcBusinessTrip(me, false, true)
        }
      }
      break
    case 'avgSum' :
    case 'planSum' :
    case 'calcSum' :
      if (ctrl.calcValue !== value) {
        const store = me.attr.orderRegistryDt.getStore()
        const allRecords = store.snapshot || store.data
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
          allRecords.each(record => {
            record.set('flagsFix', record.get('flagsFix') | ctrl.flagsFix)
          })
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
          allRecords.each(record => {
            record.set('flagsFix', record.get('flagsFix') & ~ctrl.flagsFix)
          })
        }
        calcBusinessTrip(me, false, false)
      }
      break
    /*
    case 'avgCalcType' :
      if (ctrl.calcValue !== value) {
        flagsRec = flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12))
        me.record.set('flagsRec', flagsRec)
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
        calcBusinessTrip(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
    */
    case 'indAvgPlan':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcBusinessTrip(me, false, false)
      }
      break
    case 'calcEarnings' :
      if (ctrl.calcValue !== value) {
        me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        calcBusinessTrip(me, false, false)
      }
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
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
    if (me.attr.payElID.getFieldValue('calcEarnings') === 'ACCRUAL') {
      me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
    } else {
      me.record.set('calcEarnings', me.attr.payElID.getFieldValue('calcEarnings') || 'DAY')
    }
  }
  setPayElWhereListDate(me, false)

  // AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '21' })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])

  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()
  me.attr.orderRegistryDt.getStore().sort('dateFrom', 'ASC')
  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')

  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.dayCount.calcValue = me.record.get('dayCount')
  me.attr.calendarDayCount.calcValue = me.record.get('calendarDayCount')
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSum.calcValue = me.record.get('avgSum')
  me.attr.planSum.calcValue = me.record.get('planSum')
  me.attr.calcSum.calcValue = me.record.get('calcSum')
  me.attr.calcEarnings.calcValue = me.record.get('calcEarnings')

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'calendarDayCount', 'dayCount', 'dateTo']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })

  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')

  me.actions.printDocumentAction.setDisabled(me.isNewInstance)
  me.actions.calcBusinessTrip.setDisabled(me.record.get('orderState') === 'POSTED')
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  if (!me.isNewInstance && !isReadOnly) setDateRange(me)
}

function setPayElWhereListDate (me, isCleanValue = true) {
  let payElStore = me.attr.payElID.getStore()
  let dateFrom = me.attr.dateFrom.getValue() || me.attr.dateTo.getValue() || null
  let dateTo = me.attr.dateTo.getValue() || me.attr.dateFrom.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFrom.isValid() && me.attr.dateTo.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.code': '21',
      'dateTo': { value: dateFrom, condition: '>=' },
      'dateFrom': { value: dateTo, condition: '<=' }
    })
  } else {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.code': '21'
    })
  }
  if (isCleanValue) {
    me.attr.payElID.setValue()
    payElStore.load()
  }
}

function configureAccrualAvg (state) {
  const me = this
  me.attr.accrualAvg.down('[dataIndex = opKoef]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSumNotIndex]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSum]').setText(state ? UB.i18n('Заробіток, що індексується') : UB.i18n('Заробіток'))
  me.attr.accrualAvg.down('[dataIndex = opDays]')[me.record.get('calcEarnings') !== 'HOUR' ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = opHours]')[me.record.get('calcEarnings') === 'HOUR' ? 'show' : 'hide']()
}

function setDateRange (me) {
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateTo.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
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
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      setDateRange(me)
      calcBusinessTrip(me, true, true)
      break
    case 'payElID':
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      if (field.getFieldValue('calcEarnings') === 'ACCRUAL') {
        me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
      } else {
        me.attr.calcEarnings.setValue(field.getFieldValue('calcEarnings') || 'DAY')
      }
      calcBusinessTrip(me, true, true)
      break
    case 'orderNumber':
      me.attr.orderRegistryDt.getStore().data.items.forEach((row, idx) => { row.set(field.name, value) })
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
          ['dateTo', '>=', value, 'dateTo'],
          ['dateFrom', '<=', value, 'dateFrom'],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearWhereList', 'clearStore'])
      }
      break
    case 'dictFundSourceID':
      calcBusinessTrip(me, false, false)
      break
  }
}

function calcBusinessTrip (me, clear, clearAvg, ctrlName) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }

  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue() ||
    !(me.attr.calendarDayCount.getValue() || me.attr.dayCount.getValue() || me.attr.dateTo.getValue())) {
    return
  }

  if (!me.attr.dateFrom.isValid() && !me.attr.dateTo.isValid()) {
    return
  }

  me.setLoading(true)

  if (me.record.get('empOrderID') || !ctrlName) {
    ctrlName = me.attr.dateTo.getValue() ? 'dateTo' : me.attr.dayCount.getValue() ? 'dayCount' : 'calendarDayCount'
  }

  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    me.attr.orderRegistryDt.removeAll()
  }
  if (clearAvg) {
    me.attr.accrualAvg.removeAll()
  }
  let flagsFix = me.record.get('flagsFix')
  if (me.attr.dictFundSourceID.getValue()) {
    me.record.set('flagsFix', flagsFix | 1 << 14)
  } else {
    me.record.set('flagsFix', flagsFix & ~(1 << 14))
  }

  if (!(me.record.get('flagsFix') & me.attr.indAvgPlan.flagsFix)) {
    const calcIndAvgType = me.attr.payElID.getFieldValue('calcIndAvgType')
    // const flagsRec = me.record.get('flagsRec')
    switch (calcIndAvgType) {
      case 'AVG':
        me.attr.indAvgPlan.setValue('INDAVG')
        me.record.set('flagsFix', flagsFix | me.attr.indAvgPlan.flagsFix)
        break
      case 'PLAN':
        me.attr.indAvgPlan.setValue('INDPLAN')
        me.record.set('flagsFix', flagsFix | me.attr.indAvgPlan.flagsFix)
        me.attr.avgCalcType.setValue('PLAN')
        // me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12)))
        break
    }
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
    // dayAccumCondition: me.attr.payElID.getFieldValue('dayAccumCondition') || me.attr.payElID.getFieldValue('methodID.dayAccumCondition') || 'noDaysOff',
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    calendarDayCount: me.attr.calendarDayCount.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    planSum: me.attr.planSum.getValue(),
    calcSum: me.attr.calcSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    indAvgPlan: me.attr.indAvgPlan.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    calcEarnings: me.attr.calcEarnings.getValue(),
    accruals: [],
    accrualsAvg: []
  }
  if (!clear) {
    me.attr.orderRegistryDt.getData().forEach((data, idx) => {
      params.accruals.push(Object.assign(data, { idx: idx }))
    })
  }
  if (!clearAvg) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  params.accruals.forEach(accr => {
    accr.flagsFix = (accr.flagsFix || 0) & ~(1 << 14)
  })
  $App.connection.run({
    entity: 'hr_docRegBusinessTrip',
    method: 'calcBusinessTrip',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const store = me.attr.orderRegistryDt.getStore()
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateTo.calcValue = AC.dateService.shiftDate(data.dateTo)
    me.attr.dateTo.setValue(AC.dateService.shiftDate(data.dateTo))
    me.attr.dayCount.calcValue = data.dayCount
    me.attr.dayCount.setValue(me.attr.dayCount.calcValue)
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
    me.attr.calcSum.calcValue = data.calcSum
    me.attr.calcSum.setValue(me.attr.calcSum.calcValue)
    me.attr.planSum.calcValue = data.planSum
    me.attr.planSum.setValue(me.attr.planSum.calcValue)
    me.attr.indAvgPlan.calcValue = data.indAvgPlan
    me.attr.indAvgPlan.setValue(me.attr.indAvgPlan.calcValue)
    me.attr.calcEarnings.calcValue = data.calcEarnings
    me.attr.calcEarnings.setValue(me.attr.calcEarnings.calcValue)
    me.configureAccrualAvg(data.avgCalcType === 'PREVIOUS')
    /*
    me.attr.orderRegistryDt.removeAll()
    data.accruals.forEach(accr => {
      accr.orderID = me.instanceID
      accr.orderNumber = me.record.get('orderNumber')
      accr.orderDate = me.record.get('orderDate')
      accr.orderRegistryID = me.record.get('orderRegistryID')
    })
    store.insert(store.data.length, data.accruals)
    */
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
        record.set('avgCalcType', accr.avgCalcType)
        record.set('baseSum', accr.baseSum)
        record.set('dateFromAvg', accr.dateFromAvg)
        record.set('dateToAvg', accr.dateToAvg)
        record.set('paySum', accr.paySum)
        record.set('mask', accr.mask)
        record.set('flagsRec', accr.flagsRec)
        record.set('flagsFix', accr.flagsFix)
        record.set('accrualDt', accr.accrualDt ? JSON.stringify(accr.accrualDt) : null)
      })
    }
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
            record.set('calcSum', accr.calcSum)
            record.set('planSum', accr.planSum)
            record.set('opSum', accr.opSum)
            record.set('opKoef', accr.opKoef)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
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
  me.calcBusinessTrip(me)
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    printDocumentAction: true,
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
  if (!me.actions.calcBusinessTrip) {
    me.actions.calcBusinessTrip = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcBusinessTrip(me, true, true)
      }
    })
  }
  me.actions.empNumAction = new Ext.Action({
    actionId: 'empNumAction',
    eventId: 'empNumAction',
    iconCls: 'el-icon-s-custom',
    cls: 'blue-action',
    tooltip: UB.i18n('Особовий рахунок'),
    text: UB.i18n('Особовий рахунок'),
    handler: function () {
      const employeeNumberID = me.record.get('employeeNumberID')
      if (employeeNumberID) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: employeeNumberID,
          tabId: `hr_employeeNumber-${employeeNumberID}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
  me.actions.rlAction = new Ext.Action({
    actionId: 'rlAction',
    eventId: 'rlAction',
    iconCls: 'el-icon-tickets',
    cls: 'blue-action',
    tooltip: UB.i18n('Розрахунковий лист'),
    text: UB.i18n('Розрахунковий лист'),
    handler: function () {
      const employeeNumberID = me.record.get('employeeNumberID')
      if (employeeNumberID) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: employeeNumberID
            }
          },
          tabId: `hr_rl${employeeNumberID}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
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
            typeData: 'orderRegistryDt',
            readOnly: me.record.get('orderState') === 'POSTED',
            paySum: record.get('paySum'),
            orgID: me.record.get('orderRegistryID.organizationID'),
            employeeNumberID: me.attr.employeeNumberID.getValue(),
            onSave: (accrualDt) => {
              record.set('flagsFix', record.get('flagsFix') | 1 << 14 | 1 << 15 | 1 << 16 | 1 << 17)
              record.set('accrualDt', JSON.stringify(accrualDt))
            }
          }
        })
      })
    }
  }
}
