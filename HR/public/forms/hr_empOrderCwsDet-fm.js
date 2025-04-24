/* global HR AC appAC */
exports.formCode = {
  getEmpOrderType,
  initComponentStart,
  filterWorkSchedule,
  initUBComponent,
  initComponentDone,
  enableControls,
  onAfterOrderSave,
  setWorkSchedule
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function initComponentStart () {
  let me = this
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('formDataReady', function () {
    me.getField('workScheduleOldID').setReadOnly(true)
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    HR.orderManager.disableContextMenuItems(me.getField('workScheduleID'), ['addItem', 'editItem'])
    me.filterWorkSchedule()
  })
  me.on('recordloaded', function (a) {
    let me = this
    if (me.isNewInstance) {
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('empOrderType', me.customParams.empOrderType)
    } else {
      me.customParams.empOrderType = me.record.get('empOrderType')
    }
    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'employeePositionID',
      onDate: me.record.get('dateFrom') || appAC.globalApplicationDate()
    })

    me.enableControls()
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.setTitleByOrderType(me)
  })
  me.onBeforeSave = () => {
    return Promise.resolve(true)
  }
  me.on('controlChanged', function (field, newValue) {
    if (field.name === 'dateFrom') {
      if (AC.dateService.isValid(newValue)) {
        me.filterWorkSchedule({
          onDate: newValue
        })
        me.masterForm.filterEmployeePosition(me, {
          attrToFilter: 'employeePositionID',
          onDate: AC.dateService.shiftDate(newValue)
        })
      }
    }
  }, me)
}

function filterWorkSchedule ({
  isClear = false,
  isReload = false,
  onDate = null
} = {}) {
  let me = this
  let workSchedule = me.getField('workScheduleID')
  let dateFrom = onDate || AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))

  AC.viewUtils.setWhereListProperty(workSchedule, [
    ['organizationID', '=', me.orderForm.record.get('organizationID.mi_data_id'), 'orgID'],
    ['organizationID', '=', null, 'orgIsNull'],
    ['dateFrom', '<=', dateFrom],
    ['dateTo', '>=', dateFrom]
  ], ['([orgID] OR [orgIsNull])'])
  if (isClear) {
    workSchedule.setValue()
  }
  if (isReload) {
    workSchedule.getStore().load()
  }
}

function setWorkSchedule () {
  let me = this
  let employeePosition = me.getField('employeePositionID')
  let workScheduleOld = me.getField('workScheduleOldID')
  let reco = AC.gridUtils.getCurrentRecord(employeePosition)
  workScheduleOld.setValueById(reco ? reco.get('workScheduleID') : null)
}

function initUBComponent () {
  const me = this
  me.orderState = me.orderForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      dateFrom: value => AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')),
      workScheduleID: value => value,
      isPaymentProp: value => value
    }], 4)
  }
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('employeePositionID')) {
      me.setWorkSchedule()
    }
  })
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}
