/* global HR $App UB appAC AC Ext */
exports.formCode = {
  initComponentStart: function () { // Вызывается прямо перед запуском инициализации формы.
    // В этом событии  можно изменить конфигурацию формы.
    let me = this
    me.on('afterrender', function () {
      let win = this.window
      if (win) {
        if (!win.height) {
          win.height = 600
        }
        if (!win.width) {
          win.width = 800
        }
      }
      HR.orderManager.disableContextMenuItems(me.getField('respEmployeePositionID'), ['editItem', 'addItem'])
      HR.orderManager.disableContextMenuItems(me.getField('linkedEmployeePositionID'), ['editItem', 'addItem'])
      me.makeTaskSelector()
    })
  },
  makeTaskSelector: function () {
    const me = this
    const taskFieldName = 'task'
    const entityName = 'hr_dictTask'
    const attrs = $App.domainInfo.get(entityName, true).attributes
    const taskField = (me.getField(taskFieldName))
    if (!taskField) {
      return
    }
    if (taskField.contextmenu && taskField.contextmenu.down(`[ubID=item${taskFieldName}Selector]`)) {
      return
    }
    const dictTaskField = 'task'
    let whereList = {
      isActive: {
        expression: '[isActive]',
        condition: 'equal',
        value: true
      }
    }

    if (attrs.organizationID) {
      whereList.orgIsNull = {
        expression: '[organizationID]',
        condition: 'isNull'
      }
      whereList.orgInOrder = {
        expression: '[organizationID]',
        condition: 'equal',
        value: me.masterForm.record.get('organizationID')
      }
    }
    const empOrderType = (me.masterForm && me.masterForm.record && me.masterForm.record.get('empOrderType')) ||
      (me.orderForm && me.orderForm.customParams && me.orderForm.customParams.empOrderType)
    if (attrs.empOrderType && empOrderType) {
      whereList.empOrderType = {
        expression: '[empOrderType]',
        condition: 'in',
        values: {
          val: ['COMMON', empOrderType]
        }
      }
    }
    const fieldList = []
    if (attrs.code) {
      fieldList.push('code')
    }
    if (attrs.name) {
      fieldList.push('name')
    }
    fieldList.push(dictTaskField)
    const gridConfig = {
      entity: entityName,
      cmdType: UB.core.UBCommand.commandType.showList,
      description: $App.domainInfo.get(entityName, true).getEntityDescription(),
      isModal: true,
      sender: taskField,
      hideActions: [],
      onItemSelected: function (selected, a, b, c) {
        let value = taskField.getValue()
        value = (value ? (value + '\n') : '') + selected.get(dictTaskField)
        if (!taskField.readOnly && !taskField.disabled) {
          taskField.setValue(value)
        }

        Ext.defer(() => {
          taskField.focus()
        }, 10)
      },
      cmpInitConfig: {
        onDeterminateForm: function (grid) {},
        empOrderType: me.record.get('empOrderType'),
        entityConfig: {
          entity: entityName,
          method: 'select',
          fieldList: fieldList,
          whereList: whereList,
          logicalPredicates: attrs.organizationID ? ['([orgIsNull] OR [orgInOrder])'] : undefined
        }
      }
    }
    taskField.selectHandler = item => $App.doCommand(gridConfig)
    AC.viewUtils.buildContextMenu(taskField, [{
      text: UB.i18n('Вибрати з довідника'),
      shortcut: 'Alt+T',
      ubID: `item${taskFieldName}Selector]`,
      ctrl: taskField,
      handler: taskField.selectHandler
    }])
  },
  addBaseActions: function () {
    this.callParent(arguments)
  },
  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

  },
  enableControls: function () {
    this.masterForm.enableParaControls(this)
  },

  initComponentDone: function () {
    let
      me = this
    if (me.customParams.orderForm) {
      me.orderForm = me.masterForm = me.customParams.orderForm
    } else {
      me.orderForm = me.masterForm = me.sender.up('form')
    }
    me.orderState = me.masterForm.record.get('orderState')
    if (me.orderState === 'PROJECT') {
      HR.orderManager.setNextRecordMaker(me, [{
        organizationID: value => me.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }], 4)
    }
    const onDate = AC.dateService.shiftDate(me.orderForm.record.get('entryDate') || me.orderForm.record.get('orderDate') || appAC.globalApplicationDate())
    const wherelist = {
      dateFrom: {
        expression: '[dateFrom]',
        condition: 'lessEqual',
        value: onDate
      },
      dateTo: {
        expression: '[dateTo]',
        condition: 'moreEqual',
        value: onDate
      },
      organizationID: {
        expression: '[organizationID]',
        condition: 'in',
        value: [me.masterForm.record.get('masterOrganizationID'), me.masterForm.record.get('organizationID')]
      }
    }
    me.getField('respEmployeePositionID').getStore().ubRequest.whereList = wherelist
    me.getField('linkedEmployeePositionID').getStore().ubRequest.whereList = wherelist
    /*    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'respEmployeePositionID'
    })
*/
    this.on('recordloaded', function (a) {
      let
        me = this

      if (me.isNewInstance) {
        me.record.set('organizationID', me.masterForm.record.get('masterOrganizationID'))
        me.record.set('orderID', me.masterForm.instanceID)
      }
      HR.orderManager.setDefaultValues(me)
      me.enableControls()
    })

    /*this.on('formDataReady', function (a) {})
    this.on('beforeSaveForm', function (a) {})
    this.on('aftersave', function (a) {})
    this.on('beforeDelete', function (a) {})
    this.on('afterDelete', function (a) {})
    this.on('beforeClose', function (a) {
      if (me.sender) {
        let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
        if (grid) {
          grid.onRefresh()
        }
      }
    })*/
  }
}
