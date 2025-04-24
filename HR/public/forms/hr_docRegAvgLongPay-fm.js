/* global AC HR $App _ Ext UB appAC */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcAvgPay,
  onGridEdit,
  addBaseActions,
  customCancelPosting
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
  ['dateFrom', 'dateTo', 'dateFromAvg', 'dateToAvg', 'avgSum', 'calcEarnings'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

async function customCancelPosting () {
  const me = this
  const detail = await UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'periodCalcID.name', 'periodCalcID.isClosed'])
    .where('orderID', '=', me.instanceID)
    .selectSingle() || {}
  let result
  if (detail['periodCalcID.isClosed']) {
    result = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Документ був проведений у закритому періоді! При скасуванні проведення буде виконано перерахунок з "{0}"! Продовжити?', detail['periodCalcID.name']))
  } else {
    result = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити проведення документу?'))
  }
  if (result) {
    try {
      await $App.connection.update({
        entity: me.entityName,
        __skipOptimisticLock: true,
        skipCheckPeriod: true,
        execParams: {
          ID: me.instanceID,
          orderState: 'PROJECT'
        }
      })
      me.loadInstance()
    } catch (e) {
      await $App.dialogError(e.message, UB.i18n('Увага!'))
    }
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      setPayElWhereListDate(me, false)
      if (value && typeof value !== 'string' && ctrl.calcValue !== value) {
        me.attr.dateTo.setValue()
        calcAvgPay(me, true, true, ctrl.name)
      }
      break
    case 'dateTo':
      setPayElWhereListDate(me, false)
      if (value && typeof value !== 'string' && ctrl.calcValue !== value) {
        calcAvgPay(me, true, false, ctrl.name)
      }
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (ctrl.calcValue !== value) {
        if (value && typeof value !== 'string' && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcAvgPay(me, false, true)
      }
      break
    case 'avgSum' :
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcAvgPay(me, false, false)
      }
      break
    case 'calcEarnings' :
      if (ctrl.calcValue !== value) {
        me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        calcAvgPay(me, false, false)
      }
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
    if (me.attr.payElID.getFieldValue('calcEarnings') === 'ACCRUAL') {
      me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
    } else {
      me.record.set('calcEarnings', me.attr.payElID.getFieldValue('calcEarnings') || 'DAY')
    }
  }

  me.attr['calcEarnings'].store.filter({
    filterFn: function (item) { return item.get('code') !== 'ACCRUAL' }
  })

  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])

  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')

  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.calcEarnings.calcValue = me.record.get('calcEarnings')
  me.attr.avgSum.calcValue = me.record.get('avgSum')

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'dateTo']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })

  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')

  me.actions.printDocumentAction.hide() // setDisabled(me.isNewInstance)
  me.actions.calcAvgPay.setDisabled(me.record.get('orderState') === 'POSTED')
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  if (!me.isNewInstance) setDateRange(me)
  setPayElWhereListDate(me, false)
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '44', accrueFuturePeriod: 'FUTURE', isAutoCalc: 1 })
}

function setPayElWhereListDate (me, isCleanValue = true) {
  let payElStore = me.attr.payElID.getStore()
  let dateFrom = me.attr.dateFrom.getValue() || me.attr.dateTo.getValue() || null
  let dateTo = me.attr.dateTo.getValue() || me.attr.dateFrom.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFrom.isValid() && me.attr.dateTo.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.code': '44',
      'accrueFuturePeriod': 'FUTURE',
      'isAutoCalc': 1,
      'dateTo': { value: dateFrom, condition: '>=' },
      'dateFrom': { value: dateTo, condition: '<=' }
    })
  } else {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.code': '44',
      'accrueFuturePeriod': 'FUTURE',
      'isAutoCalc': 1
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
  me.attr.accrualAvg.down('[dataIndex = opDays]')[['DAY', 'DAYNORM'].includes(me.record.get('calcEarnings')) ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = opHours]')[me.record.get('calcEarnings') === 'HOUR' ? 'show' : 'hide']()
}

function setDateRange (me) {
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateFrom.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
  me.attr.dateTo.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateTo.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
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
  if (field.skipChange) {
    field.skipChange = false
    delete field.skipChange
    return
  }
  switch (field.name) {
    case 'workPlaceOnly':
      me.attr.dateFrom.setValue()
      me.attr.dateTo.setValue()
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      setDateRange(me)
      calcAvgPay(me, true, true)
      break
    case 'payElID':
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      if (field.getFieldValue('calcEarnings') === 'ACCRUAL') {
        me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
      } else {
        me.attr.calcEarnings.setValue(field.getFieldValue('calcEarnings') || 'DAY')
      }
      calcAvgPay(me, true, true, 'dateTo')
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
          ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      }
      break
    case 'avgCalcType' :
      if (field.calcValue !== value) {
        let flagsFix = me.record.get('flagsFix')
        let flagsRec = me.record.get('flagsRec')
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
        calcAvgPay(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
    case 'dictFundSourceID':
      calcAvgPay(me, false, false)
      break
  }
}

function calcAvgPay (me, clear, clearAvg, ctrlName) {
  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue()) {
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
  if (!ctrlName) {
    ctrlName = 'dateTo'
  }
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
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    orderID: me.record.get('empOrderID') || me.instanceID,
    payElID: me.attr.payElID.getValue(),
    dayAccumCondition: me.attr.payElID.getFieldValue('methodID.dayAccumCondition') || 'noDaysOff',
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    calcEarnings: me.attr.calcEarnings.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    accruals: [],
    accrualsAvg: []
  }
  if (!clearAvg) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  $App.connection.run({
    entity: 'hr_docRegAvgLongPay',
    method: 'calcAvgPay',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.calcEarnings.calcValue = data.calcEarnings
    me.attr.calcEarnings.setValue(me.attr.calcEarnings.calcValue)
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
            record.set('opHours', accr.opHours)
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
    me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
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
  me.calcAvgPay(me)
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

  if (!me.actions.printDocumentAction) {
    me.actions.printDocumentAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printAction',
      handler: function () {
        $App.doCommand({
          cmdType: 'showReport',
          caption: UB.i18n('Друкована форма. Оплата за середнім заробітком'),
          tabId: 'printDocument_hr_printDocRegAvgPay' + Date.now(),
          target: $App.getViewport().centralPanel,
          cmdData: {
            reportCode: 'hr_printDocRegAvgPay',
            reportParams: {
              instanceID: me.instanceID
            },
            reportOptions: {
              allowExportToExcel: true,
              isModal: false
            }
          }
        })
      }
    })
  }

  if (!me.actions.calcAvgPay) {
    me.actions.calcAvgPay = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcAvgPay(me, true, true)
      }
    })
  }
}
