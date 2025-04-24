/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  doSaveForm,
  setupControls,
  filterEmployeePosition
}

const isDateValid = aDate => aDate && aDate.getFullYear
function filterEmployeePosition ({
  dateFrom = this.record.get('dateFrom'),
  isClear = true

} = {}) {
  const me = this
  let employeePositionCtrl = me.getField('employeePositionID')
  const store = employeePositionCtrl.getStore()
  const onDate = isDateValid(dateFrom) ? dateFrom : appAC.globalApplicationDate()
  store.ubRequest.whereList = {
    employee: {
      expression: '[organizationID]',
      condition: 'equal',
      value: me.record.get('organizationID')
    },
    dateFrom: {
      expression: '[dateFrom]',
      condition: '<=',
      value: onDate
    },
    dateTo: {
      expression: '[dateTo]',
      condition: '>=',
      value: onDate
    },
    workPlace: {
      expression: '[workPlace]',
      condition: '=',
      value: '2'
    }
  }
  store.load()
  if (isClear) {
    employeePositionCtrl.setValue()
  }
}
function setupControls (ctrl) {

}

function initComponentStart () {
  const me = this

  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('onBeforeSave', onBeforeSave, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })
  // me.on('beforeClose', me.onBeforeClose)
}

function initComponentDone () {
  const me = this

  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else {
    me.orderForm = me.sender.up('form')
  }

  AC.viewUtils.setAttr(me)
  me.on('afterrender', () => {
  })
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
  })
}

function onRecordLoaded () {
  const me = this
  me.masterForm = me.customParams.orderForm
    ? me.customParams.orderForm
    : (me.sender ? me.sender.up('form') : null)

  if (me.isNewInstance) {
    me.record.set('isGroup', false)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('empOrderType', me.masterForm.record.get('empOrderType'))
  }
}

function onFormDataReady () {
  const me = this
  let isReadOnly = !me.masterForm || me.masterForm.enableParaControls(me)
  me.setupControls()
  if (!isReadOnly) {
    me.filterEmployeePosition({
      isClear: false
    })
  }
}

function onControlChanged (field, value) {
  // eslint-disable-next-line no-unused-vars
  const me = this
  switch (field.name) {
    case 'dateFrom':
      me.filterEmployeePosition({
        dateFrom: value
      })
      break
  }
}

function onBeforeSave () {
  return Promise.resolve(true)
}

/*function onBeforeClose () {
  const me = this
  if (me.sender) {
    let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.getStore().load()
    }
  }
}*/

function doSaveForm () {
  const me = this
  if (me.isFormDirty()) {
    return me.saveForm()
  } else {
    return Promise.resolve(1)
  }
}
