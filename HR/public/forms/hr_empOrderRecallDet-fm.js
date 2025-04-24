/* global appAC HR AC $App UB Ext */
exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  setOrderInfo,
  clearPeriodList,
  onBeforeSave,
  onAfterSave,
  beforeSave
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderRecallListDet']
  }
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', me.beforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  /* me.on('beforeClose', function () {
    AC.gridUtils.refreshSenderUBGrid(me)
  }) */
  me.errors = []
  me.canClose = true
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
    // positionExists: true
  })
  me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('grantVacationParaID')) {
      let grantVacationParaID = me.getField('grantVacationParaID')
      let dateFrom = grantVacationParaID.getFieldValue('dateTo')
      let newDateFrom = me.getField('dateFrom').getValue()
      if (!newDateFrom || newDateFrom <= dateFrom) {
        me.getField('dateFrom').setValue(AC.dateService.addDays(dateFrom, 1))
      }
    }
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
  })
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  }
  me.orderForm.makeReasonSelector(me)
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)

  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      {
        isExternal: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.enableControls()
  if (!me.isNewInstance) {
    AC.viewUtils.setWhereListProperty(me.attr.grantOrderParaID, [
      [ 'employeeNumberID', '=', me.record.get('employeeNumberID') ]
    ], undefined, ['clearStore'])
    me.setOrderInfo()
  }
}

function enableControls () {
  const me = this
  me.orderForm.enableParaControls(me)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  const grid = me.attr.empOrderRecallListDet
  const detStore = grid.getStore()
  switch (field.name) {
    case 'employeePositionID':
      if (detStore.getCount()) {
        me.clearPeriodList(detStore)
      }
      AC.viewUtils.setWhereListProperty(me.attr.grantOrderParaID, [
        [ 'employeeNumberID', '=', field.getFieldValue('employeeNumberID') ]
      ], undefined, ['clearValue', 'clearStore'])
      break
    case 'grantOrderParaID':
      if (detStore.getCount()) {
        me.clearPeriodList(detStore)
      }
      me.setOrderInfo()
      break
  }
}

function setOrderInfo () {
  const me = this
  const orderInfo = me.down('[name=orderInfo]')
  if (me.attr.grantOrderParaID.getValue()) {
    const dateFrom = me.attr.grantOrderParaID.getFieldValue('dateFrom')
    const dateTo = me.attr.grantOrderParaID.getFieldValue('dateTo')
    const dayCount = me.attr.grantOrderParaID.getFieldValue('dayCount')
    const dateToStr = dateTo ? ` ${UB.i18n('по')} ${AC.dateService.formatDate(dateTo)}` : ''
    const dayCountStr = dayCount ? `(${dayCount}${UB.i18n('дн.')})` : ''
    const text = `${me.attr.grantOrderParaID.getFieldValue('orderID.description')} ${UB.i18n('з')} ${dateFrom ? AC.dateService.formatDate(dateFrom) : ''}${dateToStr} ${dayCountStr}`
    orderInfo.setText(text)
  } else {
    orderInfo.setText('')
  }
}

function clearPeriodList (listStore) {
  const me = this
  if (!listStore) {
    listStore = me.attr.empOrderRecallListDet.getStore()
  }
  $App.connection.run({
    entity: 'hr_empOrderRecallListDet',
    method: 'clearDetail',
    paraID: me.record.get('ID')
  }).then(() => {
    listStore.load()
  })
}

function beforeSave (me, params) {
  AC.gridUtils.setDetailGridsFormData(me, params)
}

function onBeforeSave () {
  const me = this
  const grid = me.attr.empOrderRecallListDet
  return grid.getStore().getCount() ? Promise.resolve(true) : $App.dialogError(UB.i18n('Не заповнено періоди відкликання'), UB.i18n('Увага')).then(() => false)
}

function onAfterSave () {
  const me = this
  me.attr.empOrderRecallListDet.getStore().load()
}
