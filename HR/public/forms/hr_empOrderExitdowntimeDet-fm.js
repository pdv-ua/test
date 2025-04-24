/* global HR AC  $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  beforeSave,
  onBeforeSave,
  onAfterSave,
  onBeforeClose,
  loadEmployees,
  clearEmployees,
  loadEmployeeList,
  filterEmployeePosition
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderExitdowntimeListDet']
  }
  me.employeeList = []
  me.on('formDataReady', me.onFormDataReady, me)
  me.on('recordloaded', me.onRecordLoaded, me)
  me.on('controlChanged', me.onControlChanged, me)
  me.on('beforesave', me.beforeSave, me)
  me.on('beforeClose', me.onBeforeClose, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.errors = []
  me.canClose = true
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType || 'EXITDOWNTIME')
  }
  HR.orderManager.setDefaultValues(me)
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'orderWord',
    dictReasonField: 'orderWord',
    entityName: 'hr_dictOrderDetOrderWord'
  })

}

function onFormDataReady () {
  const me = this
  me.enableControls()
  if (!me.isNewInstance) {
    const orderState = me.record.get('orderID.orderState') || 'PROJECT'
    if (orderState === 'PROJECT') {
      me.loadEmployeeList(me.record.get('grantOrderID'), me.record.get('dateFrom'))
    }
  }
  AC.viewUtils.setWhereListProperty(me.attr.grantOrderID, [
    ['organizationID', '=', me.record.get('organizationID')]
  ], undefined, ['clearStore'])
}

async function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  if (field.skipOnChanged) {
    delete field.skipOnChanged
    return
  }
  let agree
  switch (field.name) {
    case 'grantOrderID':
      agree = me.attr.empOrderExitdowntimeListDet.getStore().getCount() ? await $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено.Продовжити?')) : true
      if (agree) {
        me.clearEmployees()
        if (value) {
          me.loadEmployeeList(value, me.record.get('dateFrom'))
        }
      } else {
        field.skipOnChanged = true
        field.setValueById(oldValue)
      }
      break
    case 'dateFrom':
      agree = me.attr.empOrderExitdowntimeListDet.getStore().getCount() ? await $App.dialogYesNo('Попередження', UB.i18n('Список працівників буде очищено.Продовжити?')) : true
      if (agree) {
        me.clearEmployees()
        if (value && AC.dateService.isValid(value)) {
          me.loadEmployeeList(me.record.get('grantOrderID'), AC.dateService.shiftDate(value))
        }
      } else {
        field.skipOnChanged = true
        field.setValue(oldValue)
      }
      break
  }
}

function enableControls () {
  const me = this
  const orderState = me.record.get('orderID.orderState') || 'PROJECT'
  let enabled = orderState === 'PROJECT'
  const grid = me.attr.empOrderExitdowntimeListDet
  const fillPersonsAction = grid.down('[actionId=fillPersons]')
  if (fillPersonsAction) {
    fillPersonsAction.setDisabled(!enabled)
  }
  const clearPersonsAction = grid.down('[actionId=clearPersons]')
  if (clearPersonsAction) {
    clearPersonsAction.setDisabled(!enabled)
  }
  me.orderForm.enableParaControls(this)
}

function getEmployees (me, orderID, dateFrom) {
  return $App.connection.run({
    entity: 'hr_empOrderExitdowntimeDet',
    method: 'loadEmployeeList',
    grantOrderID: orderID,
    orderID: me.record.get('orderID'),
    dateFrom
  })
}

function loadEmployeeList (orderID, dateFrom) {
  const me = this
  if (orderID && dateFrom) {
    me.setLoading(true)
    getEmployees(me, orderID, dateFrom).then((mParams) => {
      me.employeeList = JSON.parse(mParams.result) || []
      console.log(me.employeeList)
    }).finally(() => {
      me.setLoading(false)
    })
  }
}

function beforeSave (me, params) {
  AC.gridUtils.setDetailGridsFormData(me, params)
}

function onBeforeSave () {
  const me = this
  const grid = me.attr.empOrderExitdowntimeListDet
  return grid.getStore().getCount() ? Promise.resolve(true) : $App.dialogError(UB.i18n('Не вибрано жодного працівника'), UB.i18n('Увага')).then(() => false)
}

function onAfterSave () {
  const me = this
  me.attr.empOrderExitdowntimeListDet.getStore().load()
}

function onBeforeClose () {
  const me = this
  AC.gridUtils.refreshSenderUBGrid(me)
  return true
}

function filterEmployeePosition (ctrl) {
  const me = this
  ctrl.getStore().ubRequest.whereList = {
    inOrder: {
      expression: '[ID]',
      condition: 'in',
      value: me.employeeList.length ? me.employeeList.map(o => o.employeePositionID) : [0]
    }
  }
  ctrl.getStore().load()
}

function loadEmployees () {
  const me = this
  if (me.record.get('grantOrderID') && me.record.get('dateFrom')) {
    me.setLoading(true)
    getEmployees(me, me.record.get('grantOrderID'), me.record.get('dateFrom')).then(mParams => {
      me.employeeList = JSON.parse(mParams.result) || []
      if (me.employeeList.length) {
        const grid = me.attr.empOrderExitdowntimeListDet
        const gridStore = grid.getStore()
        const paraID = me.instanceID
        const orderID = me.record.get('orderID')
        const empOrderType = me.record.get('empOrderType')
        const rows = []
        gridStore.removeAll()
        me.employeeList.forEach(item => {
          let isAdd = true
          if (item.dateStart && AC.dateService.shiftDate(item.dateStart) > me.record.get('dateFrom')) {
            isAdd = false
          }
          if (item.dateEnd && AC.dateService.shiftDate(item.dateEnd) < me.record.get('dateFrom')) {
            isAdd = false
          }
          if (isAdd) {
            rows.push({
              employeePositionID: item.employeePositionID,
              'employeePositionID.description': item.description,
              dateFrom: me.record.get('dateFrom'),
              dateStart: AC.dateService.shiftDate(item.dateStart),
              paraID: paraID,
              orderID: orderID,
              empOrderType: empOrderType
            })
          }
        })
        AC.gridUtils.insert(grid, rows)
        HR.orderManager.setIsDirty(me, true)
      }
    }).finally(() => {
      me.setLoading(false)
    })
  }
}

function clearEmployees () {
  const me = this
  me.attr.empOrderExitdowntimeListDet.getStore().removeAll()
  HR.orderManager.setIsDirty(me, true)
}
