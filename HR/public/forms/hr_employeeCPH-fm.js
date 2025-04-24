/* global AC UB appHR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged

}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['acGrid'])
  me.attr.remindSum.on('blur', changeParams)
  me.attr.remindSum.on('keypress', onKeypress)
  me.attr.paySum.on('blur', changeParams)
  me.attr.paySum.on('keypress', onKeypress)
}

function onKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    try {
      me.record.set('employeeNumberID', me.sender.store.ubRequest.whereList.employeeNumberID.values.value)
    } catch (e) {}
    if (!me.record.get('employeeNumberID')) {
      const grid = AC.gridUtils.getSenderGrid(me)
      if (grid && grid.filters && grid.filters.length) {
        const item = grid.filters.find(item => item.id === 'employeeNumberID')
        if (item) me.record.set('employeeNumberID', item.value)
      }
    }
  } else if (me.record.get('employeeAccrualID')) {
    appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
      UB.Repository('hr_docRegDogCPHPay')
        .attrs(['ID'])
        .where('employeeCPHID', '=', me.instanceID)
        .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
        .selectAsObject().then(orders => {
          const orderIDs = orders.map(o => o.ID)
          UB.Repository('hr_accrual')
            .attrs(['periodCalcID.name', 'periodSalaryID.name', 'paySum', 'periodCalcID', 'sourceID', 'periodCalcID.dateFrom'])
            .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
            .where('sourceID', '=', me.record.get('employeeAccrualID'), 'sourceID')
            .where('orderID', 'in', orderIDs.length ? orderIDs : [0], 'orderID')
            .logic('([sourceID] or [orderID])')
            .orderBy('periodCalcID.dateFrom')
            .orderBy('periodSalaryID.dateFrom')
            .selectAsObject({ 'periodCalcID.dateFrom': 'dateFrom' }).then(data => {
              me.periodSum = 0
              data.forEach(row => {
                if (row.periodCalcID === response.ID || row.sourceID !== me.record.get('employeeAccrualID')) {
                  me.periodSum += row.paySum
                }
              })
              me.attr.accrual.setLocalStoreData(data)
              me.attr.remindSumNext.setValue(AC.currencyService.round(Math.max(0, (me.record.get('remindSum') || 0) - (me.periodSum || 0))))
            })
        })
    })
  }
  me.attr.remindSumNext.setValue(AC.currencyService.round(Math.max(0, (me.record.get('remindSum') || 0) - (me.periodSum || 0))))
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'paySum':

      me.attr.paySumMonth.setMaxValue(value || 0)
      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
        let remindSum = value || 0
        const data = me.attr.accrual.getData()
        data.forEach(row => {
          if (AC.dateService.unshiftDate(row) < response.dateFrom) {
            remindSum -= (row.paySum || 0)
          }
        })
        me.attr.remindSum.setValue(remindSum)
        me.attr.remindSumNext.setValue(AC.currencyService.round(Math.max(0, (me.attr.remindSum.getValue() || 0) - (me.periodSum || 0))))
      })
      break
    case 'remindSum':
    case 'paySumMonth':
      if (value) {
        me.attr.remindSumNext.setValue(AC.currencyService.round(Math.max(0, (me.attr.remindSum.getValue() || 0) - (me.periodSum || 0))))
      }
      break
  }
}

function onControlChanged (field) {
  const me = this
  switch (field.name) {
    case 'dateTo':
      if (me.attr.dateTo.getValue()) {
        me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
      }
      break
    case 'dateFrom':
      if (me.attr.dateFrom.getValue()) {
        me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
      }
      break
  }
}
