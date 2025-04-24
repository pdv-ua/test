/* global AC _ appAC HR UB Ext */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onBeforeSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['accountDimensionsControl'])
  me.attr.dictFundSourceID.store.ubRequest.orgID = appAC.globalOrganization()
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Коригувати дату закінчення'),
    name: 'actionAllowEdit',
    handler: function () {
      let editable = ['dateToEmpty']
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      Ext.defer(() => {
        me.attr.dateToEmpty.focus()
      }, 1)
    }
  })
  me.attr.accrualSum.on('blur', changeSumRate)
  me.attr.accrualRate.on('blur', changeSumRate)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  HR.orderManager.setSourceOrderDescription(me, 'orderID', 'orderDescription')
  HR.orderManager.setSourceOrderDescription(me, 'changeOrderID', 'orderCanceledDescription')
  me.attr.dimControl.setValue(me.record.getData())
  setCtrlVisible(me, me.record.get('payElID.methodID.valuation'), me.record.get('payElID.methodID.code'), me.record.get('payElID.calcAlgorithm'))
  me.attr.dateFromEmpty.setMinValue(me.attr.employeeNumberID.getFieldValue('dateFrom'))
  if (me.isNewInstance) { me.attr.dateFromEmpty.setValue(AC.dateService.currentDate()) }
  if (me.record.get('orderID')) {
    me.attr.dateFromEmpty.setReadOnly(true)
    me.attr.dateToEmpty.setReadOnly(true)
  }
  me.attr.changeOrderNumber[me.record.get('changeOrderID') ? 'hide' : 'show']()
  me.attr.changeOrderDate[me.record.get('changeOrderID') ? 'hide' : 'show']()
  setPayElWhereListDate(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function changeSumRate (ctrl) {
  const me = ctrl.up('form')
  if (ctrl.attributeName === 'accrualRate' && ctrl.getValue() && me.attr.payElID.getFieldValue('methodID.code') !== '33') {
    ctrl.up('form').attr.accrualSum.setValue()
  }

  if (ctrl.attributeName === 'accrualSum' && ctrl.getValue() && me.attr.payElID.getFieldValue('methodID.code') !== '33') {
    ctrl.up('form').attr.accrualRate.setValue()
  }
}

function onBeforeSave () {
  const me = this
  const dimValue = me.attr.dimControl.getValue(true)

  _.forEach(dimValue, (value, key) => {
    if (me.record.get(key) !== value) {
      me.record.set(key, value)
    }
  })
}

function setPayElWhereListDate (me) {
  let payElStore = me.attr.payElID.getStore()
  let dateFrom = me.attr.dateFromEmpty.getValue() || me.attr.dateToEmpty.getValue() || null
  let dateTo = me.attr.dateToEmpty.getValue() || me.attr.dateFromEmpty.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFromEmpty.isValid() && me.attr.dateToEmpty.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      dateFrom: { value: dateTo, condition: '<=' },
      dateTo: { value: dateFrom, condition: '>=' }
    })
  } else {
    if (payElStore.ubRequest.whereList.dateFrom) delete payElStore.ubRequest.whereList.dateFrom
    if (payElStore.ubRequest.whereList.dateTo) delete payElStore.ubRequest.whereList.dateTo
  }
}

function onControlChanged (field) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'dateFromEmpty':
      if (AC.dateService.isValid(field.value)) {
        me.attr.dateToEmpty.setMinValue(me.attr.dateFromEmpty.getValue())
        setPayElWhereListDate(me)
      }
      break
    case 'dateToEmpty':
      if (AC.dateService.isValid(field.value)) {
        me.attr.dateFromEmpty.setMaxValue(me.attr.dateToEmpty.getValue())
        setPayElWhereListDate(me)
      }
      break
    case 'payElID':
      setCtrlVisible(me, field.getFieldValue('methodID.valuation'), field.getFieldValue('methodID.code'), field.getFieldValue('calcAlgorithm'))
      me.attr.accrualSum.setValue()
      me.attr.accrualRate.setValue()
      me.attr.limitSum.setValue()
      me.attr.remindSum.setValue()
      me.attr.isFactHourHarmful.setValue(false)
      break
  }
}

function setCtrlVisible (me, valuation, code, calcAlgorithm) {
  me.attr.missingEmployeeNumberID.setVisible(code === '33' && ['1', '2'].includes(calcAlgorithm))
  if (code === '33') {
    AC.viewUtils.setFilterValue(me.attr.missingEmployeeNumberID, { orgID: appAC.globalOrganization(), ID: { value: me.record.get('employeeNumberID'), condition: '<>' } })
  }
  let rateVisible = true
  let sumVisible = true
  if (code === '33') {
    rateVisible = calcAlgorithm !== '1'
    sumVisible = calcAlgorithm === '4'
  }
  switch (valuation) {
    case 'SUMRATE':
      me.attr.accrualRate.setVisible(rateVisible)
      me.attr.accrualSum.setVisible(sumVisible)
      break
    case 'SUM':
      me.attr.accrualRate.setVisible(false)
      me.attr.accrualSum.setVisible(sumVisible)
      break
    case 'RATE':
      me.attr.accrualRate.setVisible(rateVisible)
      me.attr.accrualSum.setVisible(false)
      break
    default:
      me.attr.accrualRate.setVisible(false)
      me.attr.accrualSum.setVisible(false)
      break
  }
  me.attr.limitSum[['204', '205', '6'].includes(code) ? 'show' : 'hide']()
  me.attr.isFactHourHarmful[['153'].includes(code) ? 'show' : 'hide']()
  me.attr.remindSum[['3'].includes(code) ? 'show' : 'hide']()
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  if (notShowSalary) {
    me.attr.accrualSum.hide()
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
