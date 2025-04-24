/* global HR AC $App Ext UB */
exports.formCode = {
  getEmpOrderType,
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onRecordLoaded,
  onBeforeSave,
  onControlChanged,
  enableControls,
  onAfterOrderSave,
  checkIsNotWorkDay,
  showTimPlanRecord,
  makeScheduleSelector
}

function showTimPlanRecord () {
  let me = this
  let ctrl = this.getField('dateFrom')
  let date = ctrl.getValue()
  let employeePositionID = me.getField('employeePositionID')
  if (!employeePositionID.getValue()) {
    AC.viewUtils.showToast(UB.i18n('Не вибраний Працівник'))
    Ext.defer(() => {
      employeePositionID.focus()
    }, 1)
    return
  }
  if (!date) {
    AC.viewUtils.showToast(UB.i18n('Не вибрана дата'))
    Ext.defer(() => {
      ctrl.focus()
    }, 1)
    return
  }

  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'isWorkDay',
    dateOf: date,
    workScheduleID: employeePositionID.getFieldValue('workScheduleID'),
    organizationID: employeePositionID.getFieldValue('organizationID')
  }).then(mParams => {
    if (mParams.planID !== -1) {
      $App.doCommand({
        cmdType: 'showForm',
        entity: 'tim_plan',
        instanceID: mParams.planID,
        cmpInitConfig: {
          listeners: {
            afterrender: function () {
              let form = this
              form.on('recordloaded', () => {
                form.query('[attributeName]').forEach(item => item.setReadOnly(true))
                form.actions.fDelete.hide()
                HR.orderManager.disableContextMenuItems(form.getField('dictTimeCostID'), [ 'editItem', 'showLookup', 'addItem', 'clearValue' ])
              })
            }
          }
        }
      })
    } else {
      AC.viewUtils.showToast(UB.i18n('Не знайдено запис'))
    }
    return true
  })
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function checkIsNotWorkDay ({
  isSilence = false
} = {}) {
  let me = this
  let ctrl = this.getField('dateFrom')
  let date = ctrl.getValue()
  let employeePositionID = me.getField('employeePositionID')
  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'isWorkDay',
    dateOf: date,
    workScheduleID: employeePositionID.getFieldValue('workScheduleID'),
    organizationID: employeePositionID.getFieldValue('organizationID')
  }).then(mParams => {
    if (mParams.isWorkDay === true) {
      !isSilence && AC.viewUtils.showToast(UB.i18n('Введена дата не є вихідним днем'))
      return false
    }
    return true
  })
}

function initComponentStart () {
  const me = this
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  AC.viewUtils.setAttr(me)
  me.orderState = me.orderForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      dateFrom: value => AC.dateService.truncTimeToUtcNull(value),
      isPaymentProp: value => value
    }], 4)
    HR.orderManager.setNextRecordMaker(me,
      [{
        organizationID: value => me.orderForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value,
        dateFrom: value => AC.dateService.addDays(AC.dateService.truncTimeToUtcNull(value), 1),
        employeePositionID: value => value,
        dictTimeCostID: value => value,
        typeCompensation: value => value,
        byRequest: value => value,
        dateRest: value => null,
        dictTimeCost2ID: value => value,
        isPaymentProp: value => value
      }], 5, null, false, true)
  }
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('empOrderType', 'CWSHD')
    me.record.set('typeCompensation', 'MONEY')
  } else {
    me.customParams.empOrderType = me.record.get('empOrderType')
  }
  me.masterForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.setTitleByOrderType(me)
  me.makeScheduleSelector(me)
}

async function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
  if (me.record.get('typeCompensation') === 'HOLIDAY') {
    me.attr.byRequest.show()
    me.attr.dateRest.setVisible(true)
    me.attr.dictTimeCost2ID.setVisible(true)
    if (!me.isNewInstance) {
      setControlState(me)
    }
  }
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig([me.record.get('empOrderType'), 'CWSHD_VAC'], me.record.get('organizationID'))
}

function onBeforeSave () {
  const me = this
  return me.checkIsNotWorkDay({
    isSilence: true
  }).then(result => {
    if (!result) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Введена дата не є вихідним днем. Все одно зберегти?'))
        .then(isAgree => {
          if (!isAgree) {
            Ext.defer(function () {
              me.getField('dateFrom').focus(true, 1)
            }, 100)
          }
          return isAgree
        })
    }
    return true
  })
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'byRequest':
      setControlState(me)
      if (value) {
        me.attr.dateRest.setValue()
      }
      me.attr.dateRest.setAllowBlank(value)
      break
    case 'typeCompensation':
      me.attr.byRequest[value === 'HOLIDAY' ? 'show' : 'hide']()
      me.attr.dateRest.setVisible(value === 'HOLIDAY')
      me.attr.dictTimeCost2ID.setVisible(value === 'HOLIDAY')
      if (value === 'HOLIDAY') {
        const config = HR.orderManager.findOrderAttrConfig((me.orderAttrConfigList || []).filter(o => o.empOrderType === 'CWSHD_VAC') || [], me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
        if (config) {
          me.attr.dictTimeCostID.setValueById(config.dictTimeCostID)
          me.attr.dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
          me.attr.dictTimeCost2ID.setValueById(config.dictTimeCost2ID)
          me.attr.dictTimeCost2ID.setDisabled(!config.canEditDictTimeCost2)
        }
      } else {
        const config = HR.orderManager.findOrderAttrConfig((me.orderAttrConfigList || []).filter(o => o.empOrderType === 'CWSHD') || [], me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
        if (config) {
          me.attr.dictTimeCostID.setValueById(config.dictTimeCostID)
          me.attr.dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
        }
      }
      break
    case 'employeePositionID':
      if (value) {
        const configAttrList = (me.orderAttrConfigList || []).filter(o => me.record.get('typeCompensation') === 'HOLIDAY' ? o.empOrderType === 'CWSHD_VAC' : o.empOrderType === 'CWSHD')
        const config = HR.orderManager.findOrderAttrConfig(configAttrList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
        if (config) {
          me.attr.dictTimeCostID.setValueById(config.dictTimeCostID)
          me.attr.dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
          if (me.record.get('typeCompensation') === 'HOLIDAY') {
            me.attr.dictTimeCost2ID.setValueById(config.dictTimeCost2ID)
            me.attr.dictTimeCost2ID.setDisabled(!config.canEditDictTimeCost2)
          }
        }
      }
      break
  }
}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function setControlState (me) {
  const byRequest = me.attr.byRequest.getValue()
  me.attr.dateRest.setDisabled(byRequest)
  me.attr.dictTimeCost2ID.setDisabled(byRequest)
  me.attr.dateRest.setAllowBlank(byRequest)
}

function makeScheduleSelector (form) {
  const me = this
  const reasonFieldName = 'restDayScheduleDesc'
  const entityName = 'hr_dictRestDaySchedule'
  const attrs = $App.domainInfo.get(entityName, true).attributes
  const reasonField = me.getField(reasonFieldName)
  if (reasonField.contextmenu && reasonField.contextmenu.down(`[ubID=item${reasonFieldName}Selector]`)) {
    return
  }
  const fieldList = ['code', 'name']
  let orderField = (attrs.code && 'code') || (attrs.name && 'name') || fieldList[0]
  const orderList = { orderBy: { expression: orderField } }
  const whereList = {
    orgIsNull: {
      expression: '[organizationID]',
      condition: 'isNull'
    },
    orgInOrder: {
      expression: '[organizationID]',
      condition: 'equal',
      value: form.record.get('organizationID') || me.record.get('organizationID')
    }
  }

  const gridConfig = {
    entity: entityName,
    cmdType: UB.core.UBCommand.commandType.showList,
    description: $App.domainInfo.get(entityName, true).getEntityDescription(),
    isModal: true,
    sender: reasonField,
    hideActions: [],
    onItemSelected: function (selected, a, b, c) {
      let value = reasonField.getValue()
      value = (value ? (value + '\n') : '') + selected.get('name')
      if (!reasonField.readOnly && !reasonField.disabled) {
        reasonField.setValue(value)
      }
      Ext.defer(() => {
        reasonField.focus()
      }, 10)
    },
    cmpInitConfig: {
      onDeterminateForm: function (grid) {},
      entityConfig: {
        entity: entityName,
        method: 'select',
        fieldList: fieldList,
        whereList: whereList,
        logicalPredicates: ['([orgIsNull] OR [orgInOrder])'],
        orderList: orderList
      }
    }
  }
  reasonField.selectHandler = item => $App.doCommand(gridConfig)
  AC.viewUtils.buildContextMenu(reasonField, [{
    text: UB.i18n('Вибрати з довідника'),
    shortcut: 'Alt+T',
    ubID: `item${reasonFieldName}Selector]`,
    ctrl: reasonField,
    handler: reasonField.selectHandler
  }])
}
