/* global HR AC $App _ appAC UB Ext saveAs AC Blob */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  onControlChanged,
  reCalc,
  beforeGridEdit,
  onGridEdit,
  setEmployeeNumbers
}

function onGridEdit (me, context) {
  const ctrl = context.column.field

  function addRecord () {
    const params = {
      orgID: me.record.get('organizationID'),
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      orderParams: {
        orderRate: me.attr.rate.getValue(),
        reCalcRate: true,
        orderDate: me.attr.orderDate.getValue(),
        dailyWage: me.attr.dailyWage.getValue(),
        checkBalance: me.attr.checkBalance.getValue()
      },
      orderRate: me.attr.rate.getValue(),
      payElParams: [{
        employeeNumberID: context.record.get('employeeNumberID'),
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: me.attr.periodSalaryID.getValue(),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateFrom: context.record.get('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateTo: context.record.get('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo'),
        payElID: me.attr.payElID.getValue(),
        baseSum: context.record.get('baseSum'),
        rate: context.record.get('rate'),
        paySumAccrual: 0,
        paySum: context.record.get('paySum') !== '' ? context.record.get('paySum') : null,
        flagsFix: context.record.get('flagsFix'),
        flagsRec: 2,
        idx: context.rowIdx
      }]
    }
    me.calcRegistryRequestEmp(me, params)
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
      context.record.set('periodSalaryID', me.attr.periodID.getValue())
      context.record.set('periodSalary', me.attr.periodID.getFieldValue('dateFrom'))
      context.record.set('mask', 0)
      if (data.filter(o => o.employeeNumberID === context.record.get('employeeNumberID')).length > 1) {
        $App.dialogYesNo('Попередження', UB.i18n(`Табельний номер {0} додано декілька разів! Продовжити?`, context.record.get('employeeNumberID.description')))
          .then(choice => {
            if (!choice) {
              context.store.remove(context.record)
              return false
            } else {
              // addRecord()
            }
          })
      } else {
        // addRecord()
      }
      break
  }
  me.reCalcRate = false
}

function beforeGridEdit (me, context) {
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
    return false
  }
  me.setIsDirty(true)

  if (context.column.dataIndex === 'employeeNumberID.description') {
    AC.viewUtils.setFilterValue(context.column.field, {
      orgID: me.record.get('organizationID'),
      dateFrom: { value: me.attr.periodID.getFieldValue('dateTo'), condition: '<=' }
    })
    AC.viewUtils.setValueOnChange(context.column.field,
      {
        'depName': 'depName',
        'posName': 'posName',
        'tabNum': 'tabNum'
      },
      context.record,
      ['clearValue']
    )
  }

  if ([null, ''].includes(context.record.get('flagsFix'))) {
    context.record.set('flagsFix', me.attr.rate.getValue() ? me.attr.rate.flagsFix : me.attr.baseSum.getValue() ? me.attr.baseSum.flagsFix : 0)
  }
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('periodSalaryID', me.record.get('periodID'))
    me.record.set('correctionSaldoFormat', 'ONPERIODEND')
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('name', 'Коригуванння джерела фінансуванння')
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '43' })
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })

  const readOnlyAttr = ['orderDate', 'orderNumber', 'payElID']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
}

function reCalc (me) {
  const params = {
    orgID: me.record.get('organizationID'),
    periodCalcID: me.attr.periodID.getValue(),
    orderParams: {
      orderDate: me.attr.orderDate.getValue()
    },
    payElParams: []
  }
  /* me.attr.orderRegistryDt.getStore().clearFilter()
  me.attr.orderRegistryDt.getData().forEach((data, idx) => {
    params.payElParams.push({
      employeeNumberID: data.employeeNumberID,
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
      periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
      dateFrom: data.dateFrom || me.attr.periodSalaryID.getFieldValue('dateFrom'),
      dateTo: data.dateTo || me.attr.periodSalaryID.getFieldValue('dateTo'),
      dateFromAvg: data.dateFromAvg,
      dateToAvg: data.dateToAvg,
      payElID: me.attr.payElID.getValue(),
      baseSum: data.baseSum,
      rate: data.rate,
      paySum: data.paySum,
      paySumAccrual: data.paySum,
      flagsFix: data.flagsFix,
      flagsRec: 2,
      idx: idx
    })
  })
  me.calcRegistryRequestEmp(me, params) */
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'periodID':
      if (value) {
        me.reCalc(me)
      }
      break
    case 'payElID':
      if (value) {
        me.reCalc(me)
      }
      break
    case 'dictFundSourceID':
      if (value) {
        me.record.set('name', UB.i18n('Коригуванння джерела фінансуванння') + ' ' + field.getFieldValue('name'))
        me.reCalc(me)
      }
      break
    case 'correctionSaldoFormat':
      if (value) {
        me.reCalc(me)
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
        const flagsFix = 0
        const setData = async () => {
          store.un('clear', setData)
          let employeeAccruals = []
          if (me.attr.payElID.getFieldValue('isIndividualRate')) {
            employeeAccruals = await UB.Repository('hr_employeeAccrual')
              .attrs(['employeeNumberID', 'accrualRate', 'dateFrom', 'dateTo'])
              .where('employeeNumberID', 'in', data.map(o => o.employeeNumberID))
              .where('dateFrom', '<=', me.attr.periodID.getFieldValue('dateTo'))
              .where('dateTo', '>=', me.attr.periodID.getFieldValue('dateFrom'))
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
                  newRow.payElID = me.attr.payElID.getValue()
                  newRow.flagsFix = flagsFix
                  newRow.days = 0
                  newRow.hours = 0
                  newRow['employeeNumberID.dateToEmpty'] = newRow['dateToEmpty']
                  delete newRow['dateToEmpty']
                  newRow['employeeNumberID.workPlaceCode'] = newRow['workPlaceCode']
                  delete newRow['workPlaceCode']
                  if (AC.dateService.shiftDate(acc.dateFrom) > me.attr.periodID.getFieldValue('dateFrom')) {
                    newRow.dateFrom = AC.dateService.shiftDate(acc.dateFrom)
                  } else {
                    newRow.dateFrom = me.attr.periodID.getFieldValue('dateFrom')
                  }
                  if (AC.dateService.shiftDate(acc.dateTo) < me.attr.periodID.getFieldValue('dateTo')) {
                    newRow.dateTo = AC.dateService.shiftDate(acc.dateTo)
                  } else {
                    newRow.dateTo = me.attr.periodID.getFieldValue('dateTo')
                  }
                  addEmployeeNumbers.push(newRow)
                })
              } else {
                if (!me.attr.payElID.getFieldValue('isIndividualRate')) {
                  row.rate = me.attr.rate.getValue() || 0
                  row.payElID = me.attr.payElID.getValue()
                  row.flagsFix = flagsFix
                  row.days = 0
                  row.hours = 0
                  row.dateFrom = me.attr.periodID.getFieldValue('dateFrom')
                  row.dateTo = me.attr.periodID.getFieldValue('dateTo')
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
          $App.dialogYesNo('Попередження', UB.i18n('Видалити раніше внесені записи?'))
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
