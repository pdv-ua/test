/* global AC appAC _ $App UB */
exports.formCode = {
    initComponentStart,
    onRecordLoaded,
    onControlChanged,
    initComponentDone
  }
  
  function initComponentStart () {
    const me = this
    me.on('controlChanged', onControlChanged, me) 
    me.on('recordloaded', onRecordLoaded, me)
  }
  
  function initComponentDone () {
    const me = this
    AC.viewUtils.setAttr(me)
  }

  function onRecordLoaded (record, data) {
    const me = this
    if (!me.isNewInstance) {
      me.attr.dateTo.setValue(record.data.dateToEmpty)
    }
    makeTransVehicleSelector(me)
  }
  
  function onControlChanged (field, value) {
    const me = this
    AC.viewUtils.setAttr(me)
  
    switch (field.name) {
      case 'dateFrom':
      case 'dateTo':
        if (me.attr.dateTo.getValue() &&   me.attr.dateFrom.getValue() > me.attr.dateTo.getValue() ) {
          $App.dialogInfo(UB.i18n('Увага! Внесена дата початку більша за дату закінчення.'))
          me.attr.dateTo.setValue('')
        }
        break
    }
  }

  function makeTransVehicleSelector (form) {
    const me = this
    const strVehicleField = form.getField("strVehicle")
    const vehicleIdField = form.getField("vehicleID")
    const gridConfig = {
      entity: "trans_vehicle",
      cmdType: UB.core.UBCommand.commandType.showList,
      isModal: true,
      hideActions: [],
      cmpInitConfig: {
        entityConfig: {
          entity: "trans_vehicle",
          method: 'select',
          fieldList: ['vehicleName'],
          whereList: {
            organizationID: {
              expression: '[organizationID]',
              condition: 'equal',
              value: appAC.globalOrganization()
            }
          },
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
      ubID: `itemStrVehicleSelector]`,
      ctrl: strVehicleField,
      handler: strVehicleField.selectHandler
    }])
  }
  