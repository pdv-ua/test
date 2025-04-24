/* global HR AC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  enableControls,
  addBaseActions,
  setTitleByOrderType,
  filterOrderDet
}
function filterOrderDet ({ orderID, isClear = false, isReload = true }) {
  let me = this
  let paraCtrl = me.getField('initialParaID')
  orderID = orderID || me.record.get('initialOrderID')
  if (!orderID) {
    orderID = -1
  }
  AC.viewUtils.setWhereListProperty(paraCtrl, [
    ['orderID', '=', orderID]
  ])
  isClear && paraCtrl.setValue()
  isReload && paraCtrl.getStore().load()
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  let me = this
  let sender = me.sender
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  }
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonDismID',
      {
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.initialOrderID, ['addItem', 'editItem'])
  me.enableControls()
  if (!me.isNewInstance) {
    me.attr.initialOrderID.skipChange = true
  }
  me.attr.initialOrderID.setValueById(me.record.get('initialOrderID'))
  if (!me.isReadOnly) {
    me.filterOrderDet({ isClear: false, isReload: true })
    AC.viewUtils.setWhereListProperty(me.attr['initialOrderID'], [
      ['organizationID', '=', me.orderForm.record.get('organizationID')]
    ])
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
}

function enableControls () {
  let me = this
  const isProject = me.record.get('orderID.orderState') !== 'POSTED'
  let addPeriodsAction = me.actions.addPeriods
  if (addPeriodsAction) {
    me.actions.addPeriods.setDisabled(!isProject)
  }
  me.isReadOnly = this.orderForm.enableParaControls(this)
  if (me.isReadOnly) {
    me.getField('orderID.mi_modifyUser.employeeNumberID.description').show()
    me.getField('orderID.mi_modifyDate').show()
    me.attr.initialOrderID.setReadOnly(true)
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
    case 'dateTo':
      break
    case 'initialOrderID':
      me.filterOrderDet({
        orderID: value,
        isClear: true,
        isReload: true
      })
      break
    case 'employeePositionID':
      break
  }
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}
