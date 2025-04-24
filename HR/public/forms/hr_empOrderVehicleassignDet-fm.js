/* global AC HR UB $App appAC Ext */
exports.formCode = {
  enableControls,
  initComponentDone,
  onCheckValidBeforeSaveForm,
  recordLoaded,
  beforeSave
}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
  }

  me.orderState = me.orderForm && me.orderForm.record.get('orderState')

  me.onBeforeSave = () => {
    return me.onCheckValidBeforeSaveForm()
  }

  me.on('recordloaded', recordLoaded)
  me.on('formDataReady', async () => {
    HR.orderManager.setTitleByOrderType(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
  })
  me.on('beforesave', beforeSave, me)

  AC.viewUtils.setAttr(me)

  if (me.masterForm.customParams.empOrderType === 'VEHICLEASSIGN') {
    me.attr.orderDetEmployeeID.hide()
  } else {
    me.attr.employeePositionID.hide()
    const orderedEmps = me.attr.orderDetEmployeeID
    orderedEmps.getStore().ubRequest.whereList = {
      OrderID: {
        expression: '[orderID]',
        condition: '=',
        value: me.orderForm.instanceID
      },
      OrderType: {
        expression: '[empOrderType]',
        condition: '!=',
        value: 'VEHICLEASSIGN'
      }

    }
    orderedEmps.getStore().reload()
  }
}

function enableControls () {
  const me = this
  const isPosted = me.orderForm ? me.orderForm.enableParaControls(me) : true
  if (!me.orderForm) {
    HR.orderManager.enableControls({
      me: me,
      isEnabled: false
    })
  }
  return isPosted
}

function recordLoaded () {
  const me = this
  if (!me.orderForm) {
    return
  }
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
  }

  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.orderForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
  })
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

  me.down('[name=strVehiclePanel]').down('[name=vehicleButton]').setVisible(isProject)
  if (isProject) { makeTransVehicleSelector(me) }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (me.attr.dateTo.getValue() && me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
    $App.dialogInfo(UB.i18n(`Дата початку ${AC.dateService.formatDate(me.attr.dateFrom.getValue())} не може бути більшою за завершення ${AC.dateService.formatDate(me.attr.dateTo.getValue())}!`))
    return false
  }

  if (!me.attr.orderDetEmployeeID.value && me.masterForm.customParams.empOrderType !== 'VEHICLEASSIGN') {
    $App.dialogInfo(UB.i18n(`Поле Працівник повинно бути заповнено!`))
    return false
  }

  return true
}

function makeTransVehicleSelector (form) {
  const strVehicleField = form.getField('strVehicle')
  const vehicleIdField = form.getField('vehicleID')
  const gridConfig = {
    entity: 'trans_vehicle',
    cmdType: UB.core.UBCommand.commandType.showList,
    isModal: true,
    hideActions: [],
    cmpInitConfig: {
      entityConfig: {
        entity: 'trans_vehicle',
        method: 'select',
        fieldList: ['vehicleName'],
        whereList: {
          organizationID: {
            expression: '[organizationID]',
            condition: 'equal',
            value: appAC.globalOrganization()
          }
        }
      }
    },
    onItemSelected: function (selected, a, b, c) {
      strVehicleField.setValue(selected.data.vehicleName)
      vehicleIdField.setValue(selected.data.ID)
      Ext.defer(() => {
        strVehicleField.focus()
      }, 10)
    }
  }
  strVehicleField.selectHandler = item => $App.doCommand(gridConfig)
  AC.viewUtils.buildContextMenu(strVehicleField, [{
    text: UB.i18n('Вибрати з довідника'),
    shortcut: 'Alt+T',
    ubID: `item${strVehicleField}Selector]`,
    ctrl: strVehicleField,
    handler: strVehicleField.selectHandler
  }])
}

function beforeSave (me, params) {
  if (me.masterForm.customParams.empOrderType !== 'VEHICLEASSIGN') {
    const ctrl = me.attr.orderDetEmployeeID
    params.execParams.positionID = ctrl.getFieldValue('positionID')
    params.execParams.employeeID = ctrl.getFieldValue('employeeID')
    params.execParams.employeeNumberID = ctrl.getFieldValue('employeeNumberID')
    params.execParams.firstName = ctrl.getFieldValue('firstName')
    params.execParams.lastName = ctrl.getFieldValue('lastName')
    params.execParams.middleName = ctrl.getFieldValue('middleName')
    params.execParams.title = ctrl.getFieldValue('positionID.description')
  }
}
