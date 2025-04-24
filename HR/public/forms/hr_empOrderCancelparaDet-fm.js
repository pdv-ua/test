/* eslint-disable no-unused-vars */
/* global AC HR $App Ext UB */
/* jshint maxerr: 10000 */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  onFormRefresh,
  enableControls,
  addBaseActions,
  filterEmployeePosition,
  filterCanceledPara,
  filterEmployee
}

function filterEmployee ({
  isClear = false,
  isReload = true,
  onDate = this.record.get('dateFrom')
} = {}) {
  const me = this
  if (!me.attr.employeeID || me.isReadOnly) {
    return
  }
  const store = me.attr.employeeID.getStore()
  store.ubRequest.whereList = {
    inOrg: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'exists',
      value: {
        entity: 'ac_employeeOrg',
        fieldList: ['ID'],
        method: 'select',
        whereList: {
          cond: {
            expression: '[employeeID]=[{master}.ID]',
            condition: 'custom'
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          },
          organizationID: {
            condition: 'equal',
            expression: '[organizationID]',
            value: me.record.get('organizationID')
          }
        }
      }
    }
  }
  if (isReload) {
    me.attr.employeeID.getStore().load()
  }
  if (isClear) {
    me.attr.employeeID.clearValue()
    me.record.set('employeeID', null)
  }
  setTimeout(function () {
    // me.attr.employeeID.clearIsPhantom()
    // me.attr.canceledParaID.clearIsPhantom()
  }, 100)
}

function filterCanceledPara ({
  isClear = false,
  isReload = true,
  employeeID = this.record.get('employeeID')
} = {}) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  const filters = [
    ['organizationID', '=', me.record.get('organizationID')],
    ['orderID.orderState', 'in', ['POSTED']],
    ['orderStateEx', '<>', 'CANCELED'],
    ['mi_unityEntity', 'in', ['hr_empOrderVacationDet', 'hr_empOrderVacationprolongDet', 'hr_empOrderAppointDet', 'hr_empOrderVacationlongDet']]
  ]
  if (employeeID) {
    filters.push(['employeeID', '=', employeeID])
  } else {
    AC.viewUtils.deleteWhereListProperty(me.attr.canceledParaID, 'employeeID')
  }
  AC.viewUtils.setWhereListProperty(me.attr.canceledParaID, filters)
  if (isReload) {
    me.attr.canceledParaID.getStore().load()
  }
  if (isClear) {
    me.attr.canceledParaID.clearValue()
  }
}

function filterEmployeePosition ({
  isClear = false,
  isReload = true,
  onDate = this.record.get('dateFrom')
} = {}) {
  const me = this
  if (!me.attr.employeePositionID || me.isReadOnly) {
    return
  }
  const store = me.attr.employeePositionID.getStore()
  if (!onDate) {
    if (me.orderForm) {
      onDate = AC.dateService.shiftDate(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate') || new Date())
    } else {
      onDate = AC.dateService.shiftDate(new Date())
    }
  }
  store.ubRequest.whereList = {
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
    organizationID: {
      expression: '[organizationID]',
      condition: '=',
      value: me.record.get('organizationID')
    }
  }
  if (isReload) {
    me.attr.employeePositionID.getStore().load()
  }
  if (isClear) {
    me.attr.employeePositionID.clearValue()
    me.record.set('employeePositionID', null)
  }
  setTimeout(function () {
    me.attr.employeePositionID.clearIsPhantom()
    me.attr.canceledParaID.clearIsPhantom()
  }, 100)
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('refresh', me.onFormRefresh, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else if (me.sender) {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (me.orderForm) {
    me.orderState = me.orderForm.record.get('orderState')
  }

  /*me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  })*/
  me.errors = []
  me.canClose = true
  me.attr.canceledParaID.on('select', ctrl => {
    const employeeID = ctrl.getFieldValue('employeeID')
    me.attr.employeeID.setValueById(employeeID)
  })
  /*    me.attr.employeePositionID.on('select', ctrl => {
        me.filterCanceledPara({
            isClear: true,
            isReload: true,
            employeePositionID: me.record.get('employeePositionID')
        })
    })
*/
  me.attr.employeeID.on('select', ctrl => {
    me.filterCanceledPara({
      isClear: true,
      isReload: true,
      employeeID: me.record.get('employeeID')
    })
  })
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('employeeID')) {
      if (!me.record.get('employeeID')) {
        me.filterCanceledPara({
          isClear: true,
          isReload: true,
          employeeID: null
        })
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
  } else {
    let rawErrorText = me.record.get('errorText')
    if (rawErrorText) {
      me.errors = JSON.parse(rawErrorText)
      let errorText = HR.controlService.getFormErrorsText(me.errors)
      const errorLabel = me.down('[name=errorText]')
      if (errorLabel) {
        errorLabel.setText(errorText, false)
      }
    }
  }

  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reason',
    entityName: 'hr_dictReasonVacation'
  })
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
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
  me.enableControls()
  if (me.attr.employeePositionID) {
    HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  }
  if (me.attr.dateFrom && me.attr.dateTo) {
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.attr.dateFrom,
      dateTo: me.attr.dateTo
    })
  }
  /*    me.filterEmployeePosition({
            isReload: false
        })
    */
  me.filterEmployee({
    isReload: false
  })
  me.filterCanceledPara({
    isReload: false
  })
}

function onBeforeSave () {
  return Promise.resolve(true)
}

function onAfterSave () {
  const me = this
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function onFormRefresh () {
  const me = this
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let dummyAction = me.actions.dummyAction
  if (!dummyAction) {
    dummyAction = new Ext.Action({
      actionId: 'dummyAction',
      eventId: 'dummyAction',
      text: UB.i18n('Наказ на сумісника'),
      iconCls: 'fa fa-clone',
      handler: function () {

      }
    })
    me.actions.dummyAction = dummyAction
  }
}

function enableControls () {
  let me = this
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  me.isReadOnly = me.orderForm.enableParaControls(me)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'canceledParaID':
      let employeeNumberID = field.getFieldValue('employeeNumberID')
      let employeePositionID = field.getFieldValue('employeePositionID')
      if (employeeNumberID) {
        me.record.set('employeeNumberID', field.getFieldValue('employeeNumberID'))
      }
      if (employeePositionID) {
        me.record.set('employeePositionID', field.getFieldValue('employeePositionID'))
      }
      break
    case 'dateFrom':
    case 'dateTo':
      if (AC.dateService.isValid(value)) {

      }
      break
  }
}
