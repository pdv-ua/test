/* global HR AC $App _ Ext UB appAC appHR */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  beforeGridEdit,
  setEmployeeNumbers,
  onGridEdit,
  calcRegistryExtraPay,
  initOrderComponentDone,
  reCalc,
  onCheckValidBeforeSaveOrder,
  getDimension,
  setRate,
  setBaseSum
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  allRecords.each(function (record) {
    if (!record.get('employeeNumberID') && !record.get('ID')) {
      store.remove(record)
    }
  })
  return Promise.resolve(true)
}

function initComponentStart () {
  const me = this
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

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.formData.detail.orderRegistryDt.forEach(row => {
      row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
      row.dateTo = AC.dateService.shiftDate(row.dateTo)
    })
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.getStore().removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
}

function initOrderComponentDone (me) {
  ['rate', 'baseSum'].forEach(attr => {
    me.attr[attr].on('blur', changeParams)
    me.attr[attr].on('keypress', onKeypress)
  })
}

function onKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  if (me.record.get('orderState') !== 'PROJECT' || ctrl.readOnly) {
    return
  }
  switch (ctrl.name) {
    case 'rate':
      if (ctrl.calcValue !== value) {
        me.setRate(value)
        ctrl.calcValue = value
      }
      break
    case 'baseSum':
      if (ctrl.calcValue !== value) {
        me.setBaseSum(value)
        ctrl.calcValue = value
      }
      break
  }
}

async function setRate (value) {
  const me = this
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  me.setLoading(true)
  store.suspendEvents()
  try {
    let employeeAccruals = []
    if (me.attr.payElID.getFieldValue('isIndividualRate')) {
      employeeAccruals = await UB.Repository('hr_employeeAccrual')
        .attrs('employeeNumberID', 'accrualRate')
        .where('employeeNumberID', 'in', allRecords.items.map(o => o.get('employeeNumberID')))
        .where('dateFrom', '<=', me.attr.periodSalaryID.getFieldValue('dateTo'))
        .where('dateTo', '>=', me.attr.periodSalaryID.getFieldValue('dateFrom'))
        .where('payElID', '=', me.attr.payElID.getValue())
        .selectAsObject()
    }
    if (value) {
      allRecords.each(record => {
        let extraRate = 1
        if (me.attr.payElID.getFieldValue('isIndividualRate')) {
          const acc = employeeAccruals.find(o => o.employeeNumberID === record.get('employeeNumberID'))
          extraRate = ((acc ? acc.accrualRate : 0) || 0) / 100
        }
        let flagsFix = record.get('flagsFix')
        if (flagsFix & 2) {
          flagsFix -= 2
        }
        if (!(flagsFix & me.attr.rate.flagsFix)) {
          flagsFix += me.attr.rate.flagsFix
        }
        if (flagsFix & me.attr.baseSum.flagsFix) {
          flagsFix = flagsFix ^ me.attr.baseSum.flagsFix
        }
        record.set('flagsFix', flagsFix)
        record.set('rate', value * extraRate)
      })
    } else {
      allRecords.each(record => {
        let rate = null
        if (me.attr.payElID.getFieldValue('isIndividualRate')) {
          const acc = employeeAccruals.find(o => o.employeeNumberID === record.get('employeeNumberID'))
          rate = (acc ? acc.accrualRate : 0) || null
        }
        let flagsFix = record.get('flagsFix')
        if (flagsFix & 1 << 9) {
          flagsFix = flagsFix ^ 1 << 9
        }
        if (flagsFix & me.attr.baseSum.flagsFix) {
          flagsFix = flagsFix ^ me.attr.baseSum.flagsFix
        }
        record.set('flagsFix', flagsFix)
        record.set('rate', rate)
      })
    }
    store.resumeEvents()
    me.setLoading(false)
    me.attr.orderRegistryDt.getView().refreshView()
    me.attr.baseSum.setValue(null)
    me.attr.baseSum.calcValue = null
    me.reCalc(me)
  } catch (e) {
    store.resumeEvents()
    me.setLoading(false)
    me.attr.orderRegistryDt.getView().refreshView()
  }
}

async function reCalc (me, clear, clearPeriod = false, clearFundSource = false) {
  me.setLoading(true)
  const params = {
    orgID: me.record.get('organizationID'),
    periodCalcID: me.attr.periodID.getValue(),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    baseSum: me.attr.baseSum.getValue(),
    payElParams: []
  }
  const store = me.attr.orderRegistryDt.getStore()
  me.attr.orderRegistryDt.suspendEvents()
  store.suspendEvents()
  const allRecords = store.snapshot || store.data
  let employeeAccruals = []
  try {
    if (clear && me.attr.payElID.getFieldValue('isIndividualRate')) {
      employeeAccruals = await UB.Repository('hr_employeeAccrual')
        .attrs('employeeNumberID', 'accrualRate')
        .where('employeeNumberID', 'in', allRecords.items.map(o => o.get('employeeNumberID')))
        .where('dateFrom', '<=', me.attr.periodSalaryID.getFieldValue('dateTo'))
        .where('dateTo', '>=', me.attr.periodSalaryID.getFieldValue('dateFrom'))
        .where('payElID', '=', me.attr.payElID.getValue())
        .selectAsObject()
    }
    me.attr.orderRegistryDt.getData().forEach((data, idx) => {
      const record = store.getAt(idx)
      if (clear) {
        record.set('payElID', me.attr.payElID.getValue())
        record.set('payElID.description', me.attr.payElID.getFieldValue('description'))
      }
      let rate = me.attr.rate.getValue()
      if (me.attr.payElID.getFieldValue('isIndividualRate')) {
        const acc = employeeAccruals.find(o => o.employeeNumberID === record.get('employeeNumberID'))
        rate = (rate || 100) * ((acc ? acc.accrualRate : 0) || 0) / 100
      }
      let newFlagsFix = 0
      if (record.get('flagsFixDoc') & 1 << 6) {
        newFlagsFix = newFlagsFix | 1 << 6
      }
      if (record.get('flagsFixDoc') & 1 << 7) {
        newFlagsFix = newFlagsFix | 1 << 7
      }
      if (record.get('flagsFixDoc') & 1 << 9) {
        newFlagsFix = newFlagsFix | 1 << 9
      }
      if (params.baseSum) {
        newFlagsFix = newFlagsFix | me.attr.baseSum.flagsFix
      }
      params.payElParams.push({
        employeeNumberID: data.employeeNumberID,
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: clearPeriod ? me.attr.periodSalaryID.getValue() : (data.periodSalaryID || me.attr.periodSalaryID.getValue()),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: clearPeriod ? me.attr.periodSalaryID.getFieldValue('dateFrom') : (data.periodSalary || me.attr.periodSalaryID.getFieldValue('dateFrom')),
        dateFrom: clearPeriod ? me.attr.periodSalaryID.getFieldValue('dateFrom') : data.dateFrom,
        dateTo: clearPeriod ? me.attr.periodSalaryID.getFieldValue('dateTo') : data.dateTo,
        payElID: clear ? me.attr.payElID.getValue() : data.payElID,
        planDays: clear && !(record.get('flagsFixDoc') & 4) ? 0 : data.planDays,
        planHours: clear && !(record.get('flagsFixDoc') & 5) ? 0 : data.planHours,
        days: data.days,
        hours: data.hours,
        baseSum: clear && !(record.get('flagsFixDoc') & 1) && !params.baseSum ? 0 : data.baseSum,
        rate: clear && !(record.get('flagsFixDoc') & 9) ? (rate || 0) : data.rate,
        paySum: clear && !(record.get('flagsFixDoc') & 2) ? 0 : data.paySum,
        flagsFix: clear ? newFlagsFix : data.flagsFix,
        flagsRec: 2 | (data.hours > 0 ? 1 << 5 : 0),
        idx: idx,
        dictFundSourceID: clearFundSource ? me.attr.dictFundSourceID.getValue() : data.dictFundSourceID
      })
    })
    store.resumeEvents()
    me.attr.orderRegistryDt.resumeEvents()
    me.setLoading(false)
    me.attr.orderRegistryDt.getView().refreshView()
    me.calcRegistryExtraPay(me, params)
  } catch (e) {
    store.resumeEvents()
    me.attr.orderRegistryDt.resumeEvents()
    me.setLoading(false)
    me.attr.orderRegistryDt.getView().refreshView()
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('periodSalaryID', me.record.get('periodID'))
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  }

  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.methodGroupID.code': '2',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })

  AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['employeeNumberID.mtCount'], !!me.attr.payElID.getFieldValue('isMtCount'))
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodToAvg, { orgID: me.record.get('organizationID') })
  me.attr.rate.calcValue = me.record.get('rate')
  me.attr.baseSum.calcValue = me.record.get('baseSum')

  const readOnlyAttr = ['orderDate', 'docNumber', 'payElID', 'rate']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  if (!(me.record.get('orderState') === 'POSTED') && me.record.get('empOrderID')) {
    me.attr.rate.setReadOnly((me.record.get('flagsFixDoc') || 0) & 1 << 9)
    me.attr.periodSalaryID.setReadOnly((me.record.get('flagsFixDoc') || 0) & 1 << 23)
  }
  if (me.record.get('empOrderID')) {
    me.attr.orderRegistryDt.hideActions = ['addNewByCurrent', 'del', 'addNew', 'addEmployeesBtn']
    me.attr.orderRegistryDt.menu.items.items.forEach(act => { if ([].includes(act.name)) act.setDisabled(true) })
    const toolBar = me.attr.orderRegistryDt.down('toolbar')
    if (toolBar && toolBar.items && toolBar.items.items) {
      toolBar.items.items.forEach(item => {
        item.setDisabled(_.includes(me.attr.orderRegistryDt.hideActions, item.name))
      })
    }
    me.attr.dictFundSourceID.hide()
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'payElID':
      AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['employeeNumberID.mtCount'], !!me.attr.payElID.getFieldValue('isMtCount'))
      if (value) {
        me.reCalc(me, true)
      }
      break
    case 'periodSalaryID':
      if (value) {
        me.reCalc(me, false, true)
      }
      break
    case 'dictFundSourceID':
      me.reCalc(me, false, false, true)
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function beforeGridEdit (me, gridName, context) {
  if (me.record.get('empOrderID') && ['employeeNumberID.description', 'payElID.description', 'periodSalaryID.name'].includes(context.column.dataIndex)) {
    context.column.field.setReadOnly(true)
    return false
  }
  if (me.record.get('empOrderID') && ((me.record.get('flagsFixDoc') || 0) & (context.column.field.flagsFix || 0))) {
    context.column.field.setReadOnly(true)
    return false
  }
  me.setIsDirty(true)

  if (context.column.dataIndex === 'employeeNumberID.description') {
    AC.viewUtils.setFilterValue(context.column.field, {
      orgID: me.record.get('organizationID'),
      dateFrom: { value: me.attr.periodID.getFieldValue('dateTo'), condition: '<=' },
      dateTo: { value: me.attr.periodID.getFieldValue('dateFrom'), condition: '>=' }
    })
    context.column.field.on('change', async (ctrl) => {
      let employeeAccrualRate = 100
      if (me.attr.payElID.getFieldValue('isIndividualRate')) {
        employeeAccrualRate = await UB.Repository('hr_employeeAccrual')
          .attrs('accrualRate')
          .where('employeeNumberID', '=', ctrl.getFieldValue('ID'))
          .where('dateFrom', '<=', me.attr.periodSalaryID.getFieldValue('dateTo'))
          .where('dateTo', '>=', me.attr.periodSalaryID.getFieldValue('dateFrom'))
          .where('payElID', '=', me.attr.payElID.getValue())
          .selectScalar() || 0
      }
      let flagsFix = 0
      if (me.attr.baseSum.getValue()) {
        flagsFix = flagsFix + me.attr.baseSum.flagsFix
      }

      context.record.set('depName', ctrl.getFieldValue('depName'))
      context.record.set('posName', ctrl.getFieldValue('posName'))
      context.record.set('employeeNumberID.workPlaceCode', ctrl.getFieldValue('workPlaceCode'))
      context.record.set('employeeNumberID.dateToEmpty', ctrl.getFieldValue('dateToEmpty'))
      context.record.set('flagsFix', flagsFix)
      context.record.set('baseSum', me.attr.baseSum.getValue())
      context.record.set('rate', me.attr.rate.getValue() * (employeeAccrualRate || 0) / 100 || 0)
      context.record.set('payElID', me.attr.payElID.getValue())
      context.record.set('payElID.description', me.attr.payElID.getFieldValue('description'))
      context.record.set('days', 0)
      context.record.set('hours', 0)
    })
  }
  if (context.column.dataIndex === 'dictFundSourceID.name') {
    context.column.field.store.ubRequest.method = 'selectByOrg'
    context.column.field.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
  }
  if ([null, ''].includes(context.record.get('paySum'))) {
    context.record.set('paySum', 0)
  }
}

function onGridEdit (me, gridName, context, control) {
  const ctrl = context.column.field

  async function addRecord () {
    let recDateFrom = context.record.get('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom')
    let recDateTo = context.record.get('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo')
    if (recDateFrom && recDateFrom < me.attr.periodSalaryID.getFieldValue('dateFrom')) {
      recDateFrom = me.attr.periodSalaryID.getFieldValue('dateFrom')
    }
    if (recDateFrom && recDateFrom > me.attr.periodSalaryID.getFieldValue('dateTo')) {
      recDateFrom = me.attr.periodSalaryID.getFieldValue('dateTo')
    }
    if (recDateTo && recDateTo > me.attr.periodSalaryID.getFieldValue('dateTo')) {
      recDateTo = me.attr.periodSalaryID.getFieldValue('dateTo')
    }
    if (recDateTo && recDateTo < me.attr.periodSalaryID.getFieldValue('dateFrom')) {
      recDateTo = me.attr.periodSalaryID.getFieldValue('dateFrom')
    }
    if (recDateTo < recDateFrom) {
      recDateTo = recDateFrom
    }
    const params = {
      orgID: me.record.get('organizationID'),
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      baseSum: me.attr.baseSum.getValue(),
      payElParams: [{
        employeeNumberID: context.record.get('employeeNumberID'),
        periodCalcID: context.record.get('periodCalcID') || me.attr.periodID.getValue(),
        periodSalaryID: context.record.get('periodSalaryID') || me.attr.periodSalaryID.getValue(),
        periodCalc: context.record.get('periodCalc') || me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: context.record.get('periodSalary') || me.attr.periodSalaryID.getFieldValue('dateFrom'),
        'periodSalaryID.name': context.record.get('periodSalaryID.name') || me.attr.periodSalaryID.getFieldValue('name'),
        dateFrom: recDateFrom,
        dateTo: recDateTo,
        payElID: context.record.get('payElID') || me.attr.payElID.getValue(),
        baseSum: context.record.get('baseSum'),
        rate: context.record.get('rate') || me.attr.rate.getValue() || 0,
        days: context.record.get('days') || 0,
        hours: context.record.get('hours') || 0,
        planDays: context.record.get('planDays'),
        planHours: context.record.get('planHours'),
        paySum: context.record.get('paySum') !== '' ? context.record.get('paySum') : null,
        flagsFix: context.record.get('flagsFix'),
        flagsRec: 2 | (context.record.get('hours') > 0 ? 1 << 5 : 0),
        idx: context.rowIdx,
        dictFundSourceID: context.record.get('dictFundSourceID') || me.attr.dictFundSourceID.getValue()
      }]
    }
    me.calcRegistryExtraPay(me, params)
  }
  if (ctrl.flagsFix) {
    if (context.value !== null) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    } else {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    }
  }

  const data = context.grid.getData()
  switch (context.column.field.name) {
    case 'employeeNumberID.description':
      if (data.filter(o => o.employeeNumberID === context.record.get('employeeNumberID')).length > 1) {
        $App.dialogYesNo('Попередження', UB.i18n(`Табельний номер {0} додано декілька разів! Продовжити?`, context.record.get('employeeNumberID.description')))
          .then(choice => {
            if (!choice) {
              context.store.remove(context.record)
              return false
            } else {
              addRecord()
            }
          })
      } else {
        addRecord()
      }
      break
    case 'baseSum':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
    case 'rate':
      if (context.value !== context.originalValue) {
        const coef = context.record.get('hours') ? context.record.get('hours') / context.record.get('planHours') : context.record.get('days') / context.record.get('planDays')
        context.record.set('paySum', AC.currencyService.round(context.record.get('baseSum') * context.record.get('rate') * (coef || 0) / 100))
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 1))
        addRecord()
      }
      break
    case 'paySum':
      if (context.value !== context.originalValue) {
        const coef = context.record.get('hours') ? context.record.get('hours') / context.record.get('planHours') : context.record.get('days') / context.record.get('planDays')
        context.record.set('rate', context.record.get('baseSum') ? AC.currencyService.round(context.record.get('paySum') / context.record.get('baseSum') / (coef || 1) * 100) : 0)
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 9))
        context.record.set('accrualDt', HR.accrualService.correctAccrualDt(context.record.get('accrualDt'), context.record.get('paySum')))
        addRecord()
      }
      break
    case 'days':
      if (context.value !== context.originalValue) {
        context.record.set('hours', 0)
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 7) | 1 << 6)
        addRecord()
      }
      break
    case 'hours':
      if (context.value !== context.originalValue) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 6) | 1 << 7)
        context.record.set('days', 0)
        addRecord()
      }
      break
    case 'planDays':
      if (context.value !== context.originalValue) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 5) | 1 << 4)
        addRecord()
      }
      break
    case 'planHours':
      if (context.value !== context.originalValue) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 4) | 1 << 5)
        addRecord()
      }
      break
    case 'payElID.description':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
    case 'dictFundSourceID.name':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
    case 'dateFrom':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
    case 'dateTo':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
  }
}

function setEmployeeNumbers (me) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('organizationID'),
      readOnlyAttr: ['periodID'],
      defaultValues: {
        periodID: me.record.get('periodID')
      },
      onSelect: (data) => {
        const addEmployeeNumbers = []
        const store = me.attr.orderRegistryDt.getStore()
        const flagsFix = me.attr.baseSum.getValue() ? me.attr.baseSum.flagsFix : 0
        const setData = async () => {
          store.un('clear', setData)
          let employeeAccruals = []
          if (me.attr.payElID.getFieldValue('isIndividualRate')) {
            employeeAccruals = await UB.Repository('hr_employeeAccrual')
              .attrs(['employeeNumberID', 'accrualRate', 'dateFrom', 'dateTo'])
              .where('employeeNumberID', 'in', data.map(o => o.employeeNumberID))
              .where('dateFrom', '<=', me.attr.periodSalaryID.getFieldValue('dateTo'))
              .where('dateTo', '>=', me.attr.periodSalaryID.getFieldValue('dateFrom'))
              .where('payElID', '=', me.attr.payElID.getValue())
              .selectAsObject()
          }
          data.forEach(row => {
            if (!store.findRecord('employeeNumberID', row.employeeNumberID)) {
              const empAccruals = employeeAccruals.filter(o => o.employeeNumberID === row.employeeNumberID)
              if (empAccruals.length) {
                empAccruals.forEach(acc => {
                  const newRow = Object.assign({}, row)
                  const extraRate = (acc.accrualRate || 0) / 100
                  newRow.rate = (me.attr.rate.getValue() || 100) * extraRate || 0
                  newRow.baseSum = me.attr.baseSum.getValue()
                  newRow.payElID = me.attr.payElID.getValue()
                  newRow.flagsFix = flagsFix
                  newRow.days = 0
                  newRow.hours = 0
                  newRow['employeeNumberID.dateToEmpty'] = newRow['dateToEmpty']
                  delete newRow['dateToEmpty']
                  newRow['employeeNumberID.workPlaceCode'] = newRow['workPlaceCode']
                  delete newRow['workPlaceCode']
                  if (AC.dateService.shiftDate(acc.dateFrom) > me.attr.periodSalaryID.getFieldValue('dateFrom')) {
                    newRow.dateFrom = AC.dateService.shiftDate(acc.dateFrom)
                  } else {
                    newRow.dateFrom = me.attr.periodSalaryID.getFieldValue('dateFrom')
                  }
                  if (AC.dateService.shiftDate(acc.dateTo) < me.attr.periodSalaryID.getFieldValue('dateTo')) {
                    newRow.dateTo = AC.dateService.shiftDate(acc.dateTo)
                  } else {
                    newRow.dateTo = me.attr.periodSalaryID.getFieldValue('dateTo')
                  }
                  addEmployeeNumbers.push(newRow)
                })
              } else {
                if (!me.attr.payElID.getFieldValue('isIndividualRate')) {
                  row.rate = me.attr.rate.getValue() || 0
                  row.baseSum = me.attr.baseSum.getValue()
                  row.payElID = me.attr.payElID.getValue()
                  row.flagsFix = flagsFix
                  row.days = 0
                  row.hours = 0
                  row.dateFrom = me.attr.periodSalaryID.getFieldValue('dateFrom')
                  row.dateTo = me.attr.periodSalaryID.getFieldValue('dateTo')
                  row['employeeNumberID.dateToEmpty'] = row['dateToEmpty']
                  delete row['dateToEmpty']
                  row['employeeNumberID.workPlaceCode'] = row['workPlaceCode']
                  delete row['workPlaceCode']
                  addEmployeeNumbers.push(row)
                }
              }
            }
          })
          if (addEmployeeNumbers.length) {
            const bind = () => {
              me.attr.orderRegistryDt.getStore().un('add', bind)
              me.attr.orderRegistryDt.GridSummary.dataBind()
              me.reCalc(me)
            }
            Ext.suspendLayouts()
            me.attr.orderRegistryDt.suspendEvents()
            me.attr.orderRegistryDt.getStore().on('add', bind)
            me.attr.orderRegistryDt.getStore().insert(me.attr.orderRegistryDt.getStore().data.length, addEmployeeNumbers)
            me.attr.orderRegistryDt.resumeEvents()
            Ext.resumeLayouts()
            me.attr.orderRegistryDt.getView().refreshView()
          }
        }
        if (me.attr.orderRegistryDt.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити раніше внесені нарахування?'))
            .then(res => {
              if (res) {
                me.attr.orderRegistryDt.getStore().on('clear', setData)
                me.attr.orderRegistryDt.removeAll()
              } else {
                setData()
              }
            })
        } else {
          setData()
        }
      }
    }
  })
}

function calcRegistryExtraPay (me, params) {
  if (!!params.payElParams.length && !!params.periodSalaryID && !!me.attr.payElID.getValue()) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'calcRegistryExtraPay',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const store = me.attr.orderRegistryDt.getStore()
      me.attr.orderRegistryDt.suspendEvents()
      store.suspendEvents()
      data.forEach(row => {
        const record = store.getAt(row.idx)
        record.set('rate', row.rate)
        record.set('baseSum', row.baseSum)
        record.set('paySum', row.paySum)
        record.set('periodCalcID', null)
        record.set('periodCalc', null)
        record.set('periodSalaryID', row.periodSalaryID)
        record.set('periodSalary', row.periodSalary)
        record.set('periodSalaryID.name', row['periodSalaryID.name'])
        record.set('dateFrom', AC.dateService.shiftDate(row.dateFrom))
        record.set('dateTo', AC.dateService.shiftDate(row.dateTo))
        record.set('mask', row.mask)
        record.set('days', row.days)
        record.set('hours', row.hours)
        record.set('planHours', row.planHours)
        record.set('planDays', row.planDays)
        record.set('payElID', row.payElID)
        record.set('flagsRec', row.flagsRec)
        record.set('flagsFix', row.flagsFix)
        record.set('calcSum', row.sumAvg)
        record.set('accrualDt', JSON.stringify(row.accrualDt))
        record.set('dictFundSourceID', row.dictFundSourceID)
        record.set('dictFundSourceID.name', row['dictFundSourceID.name'])
      })
      store.resumeEvents()
      me.attr.orderRegistryDt.GridSummary.dataBind()
      me.attr.orderRegistryDt.resumeEvents()
      me.attr.orderRegistryDt.getView().refreshView()
      me.setIsDirty(true)
      me.setLoading(false)
    }, function (err) {
      me.setLoading(false)
      throw err
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
        orgID: me.record.get('organizationID')
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

function setBaseSum (value) {
  const me = this
  me.attr.rate.setValue(null)
  me.attr.rate.calcValue = null
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  me.setLoading(true)
  store.suspendEvents()
  allRecords.each(record => {
    let flagsFix = record.get('flagsFix')
    if (flagsFix & 2) {
      flagsFix -= 2
    }
    if (flagsFix & 1 << 9) {
      flagsFix = flagsFix ^ 1 << 9
    }
    if (!(flagsFix & me.attr.baseSum.flagsFix)) {
      flagsFix += me.attr.baseSum.flagsFix
    }
    if (!value) {
      if (flagsFix & me.attr.baseSum.flagsFix) {
        flagsFix = flagsFix ^ me.attr.baseSum.flagsFix
      }
    }
    record.set('flagsFix', flagsFix)
    record.set('rate', null)
    record.set('baseSum', value)
  })
  store.resumeEvents()
  me.setLoading(false)
  me.attr.orderRegistryDt.getView().refreshView()
  me.reCalc(me)
}
