/* global AC HR $App _ appAC appHR Ext UB */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcVacationCompensation,
  onGridEdit,
  onVacationGridEdit,
  addBaseActions,
  getDimension,
  setAvgDataFromPriorDocument,
  addVacationPeriods,
  beforePosting,
  recalcVacationDt,
  addIntComb
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt', 'accrualAvg', 'vacationDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
    me.attr.paySum.setReadOnly(!me.formData.detail.orderRegistryDt.length)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.removeAll()
  }
  if (_.get(me, 'formData.detail.accrualAvg.length')) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg)
  } else if (data.method !== 'addnew') {
    me.attr.accrualAvg.removeAll()
  }
  if (_.get(me, 'formData.detail.vacationDt.length')) {
    me.attr.vacationDt.setLocalStoreData(me.formData.detail.vacationDt)
  } else if (data.method !== 'addnew') {
    me.attr.vacationDt.removeAll()
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
  ['dateFrom', 'dayCount', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'paySum', 'compensationPeriod'].forEach(attrName => {
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
        appHR.getCurrentPeriod(me.record.get('orderRegistryID.organizationID'))
          .then(curPeriod => {
            const maxDate = AC.dateService.addYears(curPeriod.dateTo, 1)
            if (AC.dateService.isValid(curPeriod.dateTo) && AC.dateService.isValid(value) && maxDate >= value) {
              calcVacationCompensation(me, true, true, ctrl.name, true)
            } else {
              ctrl.setValue(ctrl.calcValue)
              $App.dialogError(UB.i18n(`Дата компенсації не може бути більшою ніж {0}`, AC.dateService.formatDate(maxDate)))
            }
          })
      }
      break
    case 'dayCount':
      if (value !== null && ctrl.calcValue !== value) {
        calcVacationCompensation(me, true, false, ctrl.name, true)
      }
      ctrl.calcValue = null
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (!ctrl.readOnly) {
        const store = me.attr.orderRegistryDt.getStore()
        const allRecords = store.snapshot || store.data
        if (ctrl.calcValue !== value) {
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
          calcVacationCompensation(me, false, true)
        }
      }
      break
    case 'avgSum' :
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
        calcVacationCompensation(me, false, false)
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
        calcVacationCompensation(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
    case 'paySum' :
      if (me.attr.orderRegistryDt.getStore().count()) {
        const record = me.attr.orderRegistryDt.getStore().getAt(0)
        if (ctrl.calcValue !== value) {
          if (value === null) {
            record.set('flagsFix', record.get('flagsFix') & ~ctrl.flagsFix)
          } else {
            record.set('flagsFix', record.get('flagsFix') | ctrl.flagsFix)
          }
          record.set('paySum', value)
          calcVacationCompensation(me, false, false)
        }
      }
      break
    case 'dictFundSourceID':
      calcVacationCompensation(me, false, false)
      break
    case 'compensationPeriod':
      if (ctrl.calcValue !== value) {
        me.record.set('flagsFix', flagsFix | me.attr.compensationPeriod.flagsFix)
        calcVacationCompensation(me, false, true)
      }
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg, false, true)
    me.attr.vacationDt.setLocalStoreData(me.formData.detail.vacationDt, false, true)
    me.attr.paySum.setReadOnly(!me.formData.detail.orderRegistryDt.length)
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

  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': ['16', '71'], 'ID': { value: AC.dataService.getUniqueInt(), condition: '!=' } })
  AC.viewUtils.setFilterValue(me.attr.payElRollID, { 'methodID.code': '72', 'ID': { value: AC.dataService.getUniqueInt(), condition: '!=' } })
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    let payElRollStore = me.attr.payElRollID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': ['16', '71'],
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' },
        'ID': { value: AC.dataService.getUniqueInt(), condition: '!=' }
      })
      AC.viewUtils.setFilterValue(me.attr.payElRollID, {
        'methodID.code': '72',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' },
        'ID': { value: AC.dataService.getUniqueInt(), condition: '!=' }
      })
    }
    payElStore.load()
    payElRollStore.load()
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

  me.attr.orderRegistryDt.getStore().sort('dateFrom', 'ASC')
  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')
  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dayCount.calcValue = me.record.get('dayCount')
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSum.calcValue = me.record.get('avgSum')
  me.attr.paySum.calcValue = me.record.get('paySum')
  me.attr.compensationPeriod.calcValue = me.record.get('compensationPeriod')
  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr['avgCalcType'].store.filter({
    filterFn: function (item) { return item.get('code') !== 'FACT' }
  })

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dayCount', 'dateFrom']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.attr.vacationDt.setReadOnly(isReadOnly)
  if (me.record.get('empOrderDetID')) {
    // me.down('tabpanel').down('[name=vacationDt]').tab.hide()
  }
  me.actions.calcVacationCompensation.setDisabled(me.record.get('orderState') === 'POSTED')
  me.actions.addIntComb.setDisabled(me.record.get('orderState') !== 'POSTED')
  me.actions.addWorkPlace.setDisabled(me.record.get('orderState') !== 'POSTED')
  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 12)
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  setIntCombActionState(me)
  if (!me.isNewInstance) {
    setDateRange(me)
    setAccountControls(me)
  }
}

function configureAccrualAvg (state) {
  const me = this
  me.attr.accrualAvg.down('[dataIndex = opKoef]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSumNotIndex]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSum]').setText(state ? UB.i18n('Заробіток, що індексується') : UB.i18n('Заробіток'))
}

function setDateRange (me) {
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateFrom.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo') > me.maxDateTo ? me.maxDateTo : me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
}

function setIntCombActionState (me) {
  if (me.attr.employeePositionID.getFieldValue('workPlace') === '1' && !me.attr.payElID.getFieldValue('includeSecondJobs')) {
    me.actions.addIntComb.show()
  } else {
    me.actions.addIntComb.hide()
  }
  if (me.attr.employeePositionID.getFieldValue('employeeNumberID.empWorkPlace') === '5') {
    me.actions.addWorkPlace.show()
  } else {
    me.actions.addWorkPlace.hide()
  }
}

function checkDateRange (me) {
  if (!AC.dateService.isValid(me.record.get('dateFrom'))) return false
  const dateVal = AC.dateService.formatDate(me.record.get('dateFrom'))
  if (me.record.get('dateFrom') < AC.dateService.shiftDate(me.attr.dateFrom.minValue)) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку {0} не може бути раніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.minValue)))
    return false
  }
  if (me.record.get('dateFrom') > AC.dateService.shiftDate(me.attr.dateFrom.maxValue)) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку  {0} не може бути пізніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.maxValue)))
    return false
  }
  return true
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'workPlaceOnly':
      me.attr.dateFrom.setValue()
      me.attr.dayCount.setValue()
      me.attr.paySum.setValue()
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
      setIntCombActionState(me)
      calcVacationCompensation(me, true, true, null, true)
      break
    case 'payElID':
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      setAccountControls(me)
      setIntCombActionState(me)
      calcVacationCompensation(me, true, true)
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
        const orderDate = AC.dateService.truncTimeToUtcNull(value)
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', orderDate, 'dateTo'],
          ['dateFrom', '<=', orderDate, 'dateFrom'],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      }
      break
    case 'contractorID':
      const modes = value !== me.attr.contrAccountID.getFieldValue('organizationID') ? ['clearValue'] : []
      AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: value }, modes)
      break
    case 'contrAccountID':
      if (value) me.attr.contractorID.setValueById(field.getFieldValue('organizationID'))
      break
  }
}

function setAccountControls (me) {
  const method = me.attr.payElID.getFieldValue('methodID.code')
  me.down('[ubID=contrAccountTab]').setDisabled(method !== '71')
  me.attr.payElRollID.setAllowBlank(method !== '71')
  if (method !== '71') {
    me.attr.payElRollID.setValue()
    me.attr.contractorID.setValue()
    me.attr.contrAccountID.setValue()
    me.attr.vacRecalcDescription.setValue()
  }
}

function calcVacationCompensation (me, clear, clearAvg, ctrlName, isRecalcVacDt) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }

  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() ||
    !me.attr.dateFrom.getValue() || me.attr.dayCount.getValue() === null) {
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

  if (clearAvg) {
    me.attr.accrualAvg.removeAll()
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
    orderID: me.instanceID,
    payElID: me.attr.payElID.getValue(),
    dayAccumCondition: me.attr.payElID.getFieldValue('methodID.dayAccumCondition') || 'noHolidays',
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    compensationPeriod: me.attr.compensationPeriod.getValue(),
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
    entity: 'hr_docRegVacationCompensation',
    method: 'calcCompensation',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const store = me.attr.orderRegistryDt.getStore()
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dayCount.calcValue = data.dayCount
    me.attr.dayCount.setValue(me.attr.dayCount.calcValue)
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.avgSum.calcValue = data.baseSum
    me.attr.avgSum.setValue(me.attr.avgSum.calcValue)
    me.attr.paySum.calcValue = data.paySum
    me.attr.paySum.setValue(me.attr.paySum.calcValue)
    me.attr.compensationPeriod.calcValue = me.attr.compensationPeriod.getValue()
    me.configureAccrualAvg(data.avgCalcType === 'PREVIOUS')
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
        record.set('days', accr.days)
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
            record.set('opSum', accr.opSum)
            record.set('opKoef', accr.opKoef)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
    me.attr.paySum.setReadOnly(!me.attr.orderRegistryDt.getStore().data.length)
    me.setIsDirty(true)
    me.setLoading(false)
    if (isRecalcVacDt) {
      me.recalcVacationDt()
    }
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
  me.calcVacationCompensation(me)
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

  if (!me.actions.calcVacationCompensation) {
    me.actions.calcVacationCompensation = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcVacationCompensation(me, true, true)
      }
    })
  }
  if (!me.actions.analytic) {
    me.actions.analytic = new Ext.Action({
      iconCls: 'el-icon-notebook-2',
      cls: 'blue-action',
      actionId: 'analyticBtn',
      text: UB.i18n('Аналітика'),
      eventId: 'analyticBtn',
      handler: function () {
        const allRecords = me.attr.orderRegistryDt.getStore().snapshot || me.attr.orderRegistryDt.getStore().data
        allRecords.each(record => {
          me.getDimension(me, record)
        })
      }
    })
  }
  if (!me.actions.addIntComb) {
    me.actions.addIntComb = new Ext.Action({
      cls: 'fill-action',
      actionId: 'addIntComb',
      text: UB.i18n('Додати для сумісників'),
      iconCls: 'fa fa-clone',
      eventId: 'addIntComb',
      hidden: true,
      handler: function () {
        return HR.controlService.checkAndSaveForm(me, function () {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Додати документи нарахування для сумісників?'))
            .then(function (choice) {
              if (choice) {
                me.addIntComb()
              }
            })
        })
      }
    })
  }
  if (!me.actions.addWorkPlace) {
    me.actions.addWorkPlace = new Ext.Action({
      cls: 'green-action',
      actionId: 'addWorkPlace',
      text: UB.i18n('Додати для посадових місць'),
      iconCls: 'fa fa-clone',
      eventId: 'addWorkPlace',
      hidden: true,
      handler: function () {
        return HR.controlService.checkAndSaveForm(me, function () {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Додати документи нарахування для посадових місць?'))
            .then(function (choice) {
              if (choice) {
                me.addIntComb('5')
              }
            })
        })
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

function setAvgDataFromPriorDocument (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.record.get('employeeNumberID') || !me.attr.accrualAvg.getStore().count()) {
    return
  }
  UB.Repository('hr_docRegVacation')
    .attrs(['ID', 'dateFrom', 'dateTo', 'payElID.description'])
    .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
    .where('ID', '<>', me.instanceID)
    .orderByDesc('dateFrom')
    .selectAsObject().then(docs => {
      docs.forEach(row => {
        row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
        row.dateTo = AC.dateService.shiftDate(row.dateTo)
      })
      UB.Repository('hr_docRegVacationCompensation')
        .attrs(['ID', 'dateFrom', 'payElID.description'])
        .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
        .where('ID', '<>', me.instanceID)
        .orderByDesc('dateFrom')
        .selectAsObject().then(docsc => {
          if (docs.length || docsc.length) {
            docs.forEach(row => {
              row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
              row.dateTo = AC.dateService.shiftDate(row.dateTo)
            })
            docs.push(...docsc)
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_docRegSelect',
              isModal: true,
              cmpInitConfig: {
                sourceData: docs,
                onSelect: (doc) => {
                  UB.Repository('hr_accrualAvg')
                    .attrs(['periodID', 'flagsFix', 'opDays', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'])
                    .where('orderID', '=', doc.ID)
                    .selectAsObject().then(accrualAvgs => {
                      const store = me.attr.accrualAvg.getStore()
                      const allRecords = store.snapshot || store.data
                      allRecords.each(record => {
                        if (!record.get('opSum')) {
                          const accrualAvg = accrualAvgs.find(o => o.periodID === record.get('periodID'))
                          if (accrualAvg) {
                            record.set('opDays', accrualAvg.opDays)
                            record.set('baseSum', accrualAvg.baseSum)
                            record.set('baseSumNotIndex', accrualAvg.baseSumNotIndex)
                            record.set('opSum', accrualAvg.opSum)
                            record.set('opKoef', accrualAvg.opKoef)
                            record.set('accrualDt', JSON.stringify(accrualAvg.accrualDt || []))
                            record.set('flagsFix', 143425) // 1 << 13 | 1 << 12 | 1 << 0 | 1 << 6 | 1 << 17
                          }
                        }
                      })
                      me.calcVacationCompensation(me, false, false)
                    })
                }
              }
            })
          } else {
            $App.dialogInfo(UB.i18n(`Попередні документи нарахування відсутні!`))
          }
        })
    })
}

function addVacationPeriods (isRecalcDays) {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  if (me.record.get('employeeNumberID') && me.attr.payElID.getValue() && AC.dateService.isValid(dateFrom) && me.attr.dayCount.getValue()) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_empOrderVacationcompDet',
      method: 'addPeriods',
      employeeNumberID: me.record.get('employeeNumberID'),
      onDate: AC.dateService.shiftDate(me.attr.dateFrom.getValue()),
      onlyCalculate: true
    }).then((mParams) => {
      me.setLoading(false)
      if (mParams.vacPeriods) {
        const vacPeriods = JSON.parse(mParams.vacPeriods) || []
        vacPeriods.forEach(row => {
          row['empVacationPeriodID.dateFrom'] = row.dateFrom
          row['empVacationPeriodID.dateTo'] = row.dateTo
          row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
          row.dateTo = AC.dateService.shiftDate(row.dateTo)
        })
        vacPeriods.sort((a, b) => a['dateFrom'].getTime() === b['dateFrom'].getTime() ? String(a['dictVacationKindID.code']).localeCompare(b['dictVacationKindID.code']) : a['dateFrom'] - b['dateFrom'])
        const dayCount = me.attr.dayCount.getValue()
        let dayComp = vacPeriods.reduce((result, item) => result + item['dayComp'], 0)
        if (!isRecalcDays) {
          let restDays = dayCount
          vacPeriods.forEach(item => {
            if (item.dayDiff < restDays) {
              item.dayComp = item.dayDiff
            } else {
              item.dayComp = restDays > 0 ? restDays : 0
            }
            restDays -= item.dayDiff || 0
          })
          if (restDays > 0 && vacPeriods.length) {
            vacPeriods[vacPeriods.length - 1].dayComp += restDays
          }
        }
        const hasBefore2024 = vacPeriods.find(o => o['dayComp'] > 0 && AC.dateService.shiftDate(o['empVacationPeriodID.dateTo']) < new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)))
        const hasAfter2024 = vacPeriods.find(o => o['dayComp'] > 0 && AC.dateService.shiftDate(o['empVacationPeriodID.dateTo']) >= new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)))
        if (!(me.record.get('flagsFix') & me.attr.compensationPeriod.flagsFix)) {
          if (hasBefore2024 && me.attr.compensationPeriod.getValue() !== '2') {
            me.attr.compensationPeriod.setValue('2')
            me.record.set('compensationPeriod', '2')
          } else if (hasAfter2024 && me.attr.compensationPeriod.getValue() !== '3') {
            me.attr.compensationPeriod.setValue('3')
            me.record.set('compensationPeriod', '3')
          }
        }
        me.attr.vacationDt.setLocalStoreData(vacPeriods)
        me.attr.vacationDt.GridSummary.dataBind()
        if (isRecalcDays && dayCount !== dayComp) {
          me.attr.dayCount.setValue(dayComp)
          me.attr.dayCount.calcValue = null
          me.record.set('dayCount', dayComp)
          calcVacationCompensation(me, false, false, me.attr.dayCount.name, false)
        } else if (me.attr.compensationPeriod.getValue() !== me.attr.compensationPeriod.calcValue) {
          calcVacationCompensation(me, false, true, me.attr.dayCount.name, false)
        }
        me.setIsDirty(true)
      }
    }, err => {
      me.setLoading(false)
      throw err
    })
  }
}

function recalcVacationDt (isRecalcDays) {
  const me = this
  if (me.record.get('empOrderID')) return
  me.attr.vacationDt.removeAll()
  if (me.isNewInstance) {
    me.addVacationPeriods(isRecalcDays)
  } else {
    me.setIsDirty(true)
    me.saveForm().then(() => {
      me.addVacationPeriods(isRecalcDays)
    })
  }
}

function onVacationGridEdit (grid) {
  const me = this
  const vacData = grid.getData()
  let dayComp = vacData.reduce((result, item) => result + item['dayComp'], 0)
  const hasBefore2024 = vacData.find(o => o['dayComp'] > 0 && AC.dateService.shiftDate(o['empVacationPeriodID.dateTo']) < new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)))
  const hasAfter2024 = vacData.find(o => o['dayComp'] > 0 && AC.dateService.shiftDate(o['empVacationPeriodID.dateTo']) >= new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)))
  if (!(me.record.get('flagsFix') & me.attr.compensationPeriod.flagsFix)) {
    if (hasBefore2024 && me.attr.compensationPeriod.getValue() !== '2') {
      me.attr.compensationPeriod.setValue('2')
      me.record.set('compensationPeriod', '2')
    } else if (hasAfter2024 && me.attr.compensationPeriod.getValue() !== '3') {
      me.attr.compensationPeriod.setValue('3')
      me.record.set('compensationPeriod', '3')
    }
  }
  if (me.attr.dayCount.getValue() !== dayComp || me.attr.compensationPeriod.getValue() !== me.attr.compensationPeriod.calcValue) {
    me.attr.dayCount.setValue(dayComp)
    me.attr.dayCount.calcValue = null
    calcVacationCompensation(me, false, false, me.attr.dayCount.name, false)
  }
}

function beforePosting () {
  const me = this
  if (!me.record.get('empOrderID') && me.attr.vacationDt.getStore().count()) {
    let hasError = me.attr.vacationDt.getData().some(o => o.dayDiff < o.dayComp)
    if (hasError) {
      me.postMessage = UB.i18n('Кількість днів компенсації більша ніж кількість невикористаних днів!')
    }
  }
  return Promise.resolve(true)
}

function addIntComb (empType = '1') {
  const me = this
  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue() ||
    !(me.attr.dayCount.getValue())) {
    return
  }

  if (!checkDateRange(me)) {
    return
  }
  if ((empType === '1' && (me.attr.employeePositionID.getFieldValue('workPlace') !== '1' || me.attr.payElID.getFieldValue('includeSecondJobs'))) ||
    (empType === '5' && me.attr.employeePositionID.getFieldValue('employeeNumberID.empWorkPlace') !== '5')) {
    return
  }
  if (!me.record.get('orderRegistryID')) {
    return
  }

  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_docRegVacationCompensation',
    method: 'addIntComb',
    employeeID: me.attr.employeePositionID.getFieldValue('employeeID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    mainEmpNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID.mainEmpNumberID'),
    dateFrom: me.attr.dateFrom.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    payElID: me.attr.payElID.getValue(),
    orderRegistryID: me.record.get('orderRegistryID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    empType
  }).then((mParams) => {
    me.setLoading(false)
    if (mParams.result) {
      const result = JSON.parse(mParams.result) || { errors: [], added: [] }
      let msg = []
      if (result.added.length) {
        msg.push(`${UB.i18n('Створено документи для')}:<br/>${result.added.join('<br/>')}`)
      }
      if (result.errors.length) {
        msg.push(`${UB.i18n('Виявлені помилки')}:<br/>${result.errors.join('<br/>')}`)
      }
      AC.gridUtils.refreshSenderUBGrid(me)
      $App.dialogInfo(msg.join('<br/><br/>'), UB.i18n('Увага'))
    }
  }, err => {
    me.setLoading(false)
    throw err
  })
}
