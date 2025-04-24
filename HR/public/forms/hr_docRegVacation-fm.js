/* global AC HR $App _ Ext UB appAC appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcVacation,
  onGridEdit,
  addBaseActions,
  getDimension,
  setAvgCalcTypeFilter,
  beforePosting,
  setAvgDataFromPriorDocument,
  addVacationPeriods,
  recalcVacPeriodDays,
  onCheckValidBeforeSaveOrder,
  addIntComb
}

const parentVacationAttrs = ['avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'accrualAvg']

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
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.removeAll()
  }
  if (_.get(me, 'formData.detail.accrualAvg.length')) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg)
  } else if (data.method !== 'addnew') {
    me.attr.accrualAvg.removeAll()
  }
  if (_.get(me, 'formData.detail.vacationDt.length')) {
    me.formData.detail.vacationDt.forEach(row => {
      row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
      row.dateTo = AC.dateService.shiftDate(row.dateTo)
    })
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

function beforePosting () {
  const me = this
  me.postMessage = ''
  const dateFrom = AC.dateService.shiftDate(me.record.get('dateFrom'))
  const pDateTo = AC.dateService.addDays(AC.dateService.shiftDate(me.attr.parentID.getFieldValue('dateTo')), 1)
  if (me.record.get('parentID') && pDateTo < dateFrom) {
    return $App.connection.run({
      entity: 'hr_docRegVacation',
      method: 'checkWorkDays',
      execParams: {
        employeeNumberID: me.record.get('employeeNumberID'),
        dateFrom,
        pDateTo
      }
    }).then(response => {
      if (response.workDaysExist) {
        me.postMessage = UB.i18n(`У працівника {0} у періоді з {1} по {2} є робочі дні! `, me.attr.employeePositionID.getFieldValue('description'), AC.dateService.formatDate(pDateTo), AC.dateService.formatDate(AC.dateService.addDays(dateFrom, -1)))
      }
      return true
    })
  }
  return Promise.resolve(true)
}

function initOrderComponentDone (me) {
  ['dateFrom', 'dateTo', 'calendarDayCount', 'dayCount', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum'].forEach(attrName => {
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
  const flagsRec = me.record.get('flagsRec')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.dateTo.setValue()
        calcVacation(me, true, true, ctrl.name, true)
      }
      break
    case 'calendarDayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.dayCount.calcValue = null
        me.attr.dateTo.setValue()
        me.attr.dayCount.setValue()
        calcVacation(me, true, false, ctrl.name, true)
      }
      ctrl.calcValue = null
      break
    case 'dayCount':
      if (value && ctrl.calcValue !== value) {
        me.attr.dateTo.calcValue = null
        me.attr.calendarDayCount.calcValue = null
        me.attr.dateTo.setValue()
        me.attr.calendarDayCount.setValue()
        calcVacation(me, true, false, ctrl.name, true)
      }
      ctrl.calcValue = null
      break
    case 'dateTo':
      if (value && ctrl.calcValue !== value) {
        me.attr.calendarDayCount.calcValue = null
        me.attr.calendarDayCount.setValue()
        calcVacation(me, true, false, ctrl.name, true)
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
          calcVacation(me, false, true)
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
        calcVacation(me, false, false)
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
        calcVacation(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg, false, true)
    me.formData.detail.vacationDt.forEach(row => {
      row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
      row.dateTo = AC.dateService.shiftDate(row.dateTo)
    })
    me.attr.vacationDt.setLocalStoreData(me.formData.detail.vacationDt, false, true)
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
        'methodID.code': ['13', '67', '142', '73'],
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

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'calendarDayCount', 'dayCount', 'dateTo', 'dateFromAvg', 'dateToAvg']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  if (me.record.get('empOrderDetID')) {
    me.down('tabpanel').down('[name=vacationDt]').tab.hide()
  }
  me.attr.vacationDt.setReadOnly(isReadOnly)

  me.attr.parentID.setReadOnly(me.record.get('orderState') === 'POSTED')
  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')

  me.actions.calcVacation.setDisabled(me.record.get('orderState') === 'POSTED')
  me.actions.addIntComb.setDisabled(me.record.get('orderState') !== 'POSTED')
  me.actions.addWorkPlace.setDisabled(me.record.get('orderState') !== 'POSTED')
  setParentVacationFilter(me, false)
  setParentVacationState(me)
  setIntCombActionState(me)
  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 12)
  if (!me.isNewInstance) {
    if (me.record.get('parentID')) {
      parentVacationAttrs.forEach(attrName => {
        me.attr[attrName].setReadOnly(true)
      })
    }
    setDateRange(me)
  }
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  me.setAvgCalcTypeFilter(me.attr.payElID.getFieldValue('methodID.code') !== '73')
}

function setAvgCalcTypeFilter (state) {
  const me = this
  if (state) {
    me.attr['avgCalcType'].store.filter({
      filterFn: function (item) { return item.get('code') !== 'FACT' }
    })
  } else {
    me.attr['avgCalcType'].store.clearFilter()
  }
}

function configureAccrualAvg (state) {
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

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
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
        me.attr.dateFrom.setMinValue(field.getFieldValue('dateFrom'))
        me.attr.dateFrom.setMaxValue(field.getFieldValue('dateTo'))
        me.attr.dateTo.setMinValue(field.getFieldValue('dateFrom'))
        me.attr.dateTo.setMaxValue(field.getFieldValue('dateTo'))
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        me.attr.avgSum.setValue()
        setParentVacationFilter(me)
        setDateRange(me)
        setIntCombActionState(me)
        calcVacation(me, true, true, null, true)
        break
      case 'payElID':
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        me.attr.avgSum.setValue()
        me.setAvgCalcTypeFilter(field.getFieldValue('methodID.code') !== '73')
        setParentVacationState(me)
        setIntCombActionState(me)
        calcVacation(me, true, true, null, true)
        break
      case 'dateFrom':
        setParentVacationFilter(me)
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
            ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
            ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
            (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
          ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
        }
        break
      case 'parentID':
        calcVacationFromParent(me, value)
        break
      case 'dictFundSourceID':
        calcVacation(me, false, false)
        break
    }
  }
}

function calcVacationFromParent (me, value) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }
  if (value) {
    me.attr.dateFrom.calcValue = AC.dateService.addDays(me.attr.parentID.getFieldValue('dateTo'), 1)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
  }
  me.calcVacation(me, true, true, 'dateFrom')

  parentVacationAttrs.forEach(attrName => {
    me.attr[attrName].setReadOnly(!!value)
  })
}

function setParentVacationState (me) {
  const enabled = ['13', '67', '142', '73'].includes(me.attr.payElID.getFieldValue('methodID.code'))
  me.attr.parentID.setDisabled(!enabled)
  if (!enabled) me.attr.parentID.setValue()
}

function setParentVacationFilter (me, clearValue) {
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID') || 0
  const filterParams = [
    [ 'payElID.methodID.code', 'in', ['13', '67', '142', '73'] ],
    [ 'employeeNumberID', '=', employeeNumberID ]
  ]
  const dateFrom = me.attr.dateFrom.getValue()
  if (AC.dateService.isValid(dateFrom)) {
    filterParams.push(['dateTo', '<', dateFrom])
  }
  AC.viewUtils.setWhereListProperty(me.attr.parentID, filterParams, null, [clearValue ? 'clearValue' : '', 'clearWhereList', 'clearStore'])
}

function calcVacation (me, clear, clearAvg, ctrlName, isRecalcVacDt) {
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

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: null, // me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    orderID: me.record.get('empOrderID') || me.instanceID,
    payElID: me.attr.payElID.getValue(),
    parentID: me.attr.parentID.getValue(),
    dayAccumCondition: me.attr.payElID.getFieldValue('methodID.dayAccumCondition') || 'noHolidays',
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    calendarDayCount: me.attr.calendarDayCount.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
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
    entity: 'hr_docRegVacation',
    method: 'calcVacation',
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
    store.sort('dateFrom', 'ASC')
    me.attr.orderRegistryDt.GridSummary.dataBind()
    me.setIsDirty(true)
    me.attr.dateFromAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS' || !!me.attr.parentID.getValue())
    me.attr.dateToAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS' || !!me.attr.parentID.getValue())
    me.setLoading(false)
    if (isRecalcVacDt) {
      recalcVacationDt(me)
    }
  }, (err) => {
    me.setLoading(false)
    throw err
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
  me.calcVacation(me)
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
  if (!me.actions.calcVacation) {
    me.actions.calcVacation = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcVacation(me, true, true)
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
                      me.calcVacation(me, false, false)
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

function addVacationPeriods () {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateTo = me.attr.dateTo.getValue()
  if (me.record.get('employeeNumberID') && me.attr.payElID.getValue() && AC.dateService.isValid(dateFrom) && dateTo && AC.dateService.isValid(dateTo)) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_empOrderVacationDet',
      method: 'addPeriods',
      employeeNumberID: me.record.get('employeeNumberID'),
      dateFrom: AC.dateService.shiftDate(me.attr.dateFrom.getValue()),
      dateTo: AC.dateService.shiftDate(me.attr.dateTo.getValue()),
      orgID: me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization(),
      payElID: me.attr.payElID.getValue(),
      mode: 'ADDONLY',
      virtualAdd: true
    }).then((mParams) => {
      me.setLoading(false)
      if (mParams.addedPeriods) {
        const vacPeriods = JSON.parse(mParams.addedPeriods)
        vacPeriods.forEach(row => {
          row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
          row.dateTo = AC.dateService.shiftDate(row.dateTo)
        })
        me.attr.vacationDt.setLocalStoreData(vacPeriods)
        me.setIsDirty(true)
      }
    }, err => {
      me.setLoading(false)
      throw err
    })
  }
}

function recalcVacPeriodDays (editor, reco) {
  const grid = editor.up('grid')
  if (grid.isInnerChange) {
    return
  }
  const dateFromCtrl = editor.query('[name=dateFrom]')[0]
  const dateToCtrl = editor.query('[name=dateTo]')[0]
  const dayCountCtrl = editor.query('[name=dayCount]')[0]
  let dateFrom = dateFromCtrl && dateFromCtrl.getValue()
  let dateTo = dateToCtrl && dateToCtrl.getValue()
  const dictVacationKindIDCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let vacKindRec = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
  let dictVacationKindID = vacKindRec && vacKindRec.get('ID')
  if (dictVacationKindID && dateFrom && AC.dateService.isValid(dateFrom) && dateTo && AC.dateService.isValid(dateTo)) {
    grid.isInnerChange = true
    $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getWorkDays4Vac',
      dateFrom: dateFrom,
      dateTo: dateTo,
      dictVacationKindID: dictVacationKindID,
      orgID: appAC.globalOrganization(),
      // monkey request prevention
      currTime: Date.now()
    }).then(mParams => {
      try {
        dayCountCtrl.setValue(mParams.daysCount)
      } finally {
        grid.isInnerChange = false
      }
      reco.set('dayCount', mParams.daysCount)
    })
  }
}

function recalcVacationDt (me) {
  if (me.record.get('empOrderID')) return
  me.attr.vacationDt.removeAll()
  if (me.isNewInstance) {
    me.addVacationPeriods()
  } else {
    me.setIsDirty(true)
    me.saveForm().then(() => {
      me.addVacationPeriods()
    })
  }
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  if (me.attr.vacationDt.getStore().count()) {
    const errors = []
    if (me.attr.vacationDt.getData().some(o => o.dayDiff < o.dayCount)) {
      errors.push(UB.i18n('Кількість невикористаних днів меньша ніж кількість днів за документом для періодів роботи!'))
    }
    const dayCount = me.attr.vacationDt.getData().reduce((result, item) => result + item['dayCount'], 0)
    if (dayCount !== me.record.get('dayCount')) {
      errors.push(UB.i18n('Кількість днів, що розподілені по періодам роботи {0} не дорівнює кількості днів відпустки {1}!', dayCount, me.record.get('dayCount')))
    }
    let day = me.attr.dateFrom.getValue()
    const lostDays = []
    const data = me.attr.vacationDt.getData()
    while (day <= me.attr.dateTo.getValue()) {
      if (!data.find(o => o['dateFrom'] <= day && day <= o['dateTo'])) {
        lostDays.push(day)
      }
      day = AC.dateService.addDays(day, 1)
    }
    if (lostDays.length) {
      errors.push(UB.i18n('Для днів {0} не існує запису використання відпустки!', lostDays.map(o => AC.dateService.formatDate(o, 'dd.mm')).join(',')))
    }
    if (errors.length) {
      return $App.dialogYesNo(UB.i18n('Увага'), errors.join('<br/>') + '<br/>' + UB.i18n('Зберегти?'))
    }
  }
  return Promise.resolve(true)
}

function addIntComb (empType = '1') {
  const me = this
  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue() ||
    !(me.attr.calendarDayCount.getValue() || me.attr.dayCount.getValue() || me.attr.dateTo.getValue())) {
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
    entity: 'hr_docRegVacation',
    method: 'addIntComb',
    employeeID: me.attr.employeePositionID.getFieldValue('employeeID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    mainEmpNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID.mainEmpNumberID'),
    dateFrom: me.attr.dateFrom.getValue(),
    dateTo: me.attr.dateTo.getValue(),
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
