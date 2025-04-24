/* global HR AC $App Ext UB appAC */
exports.formCode = {
  getEmpOrderType,
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  postInit,
  onControlChanged,
  enableControls,
  onAfterOrderSave,
  makeScheduleSelector,
  onValidateGridEdit,
  loadEmployeers,
  exportCSVTemplate,
  loadCsv
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['hr_empOrderCwshdgrpEmp']
  }
  AC.acEditGridManager.init(me)
  me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
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
}

function postInit (me, record, data) {
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('empOrderType', 'CWSHDGRP')
    me.record.set('typeCompensation', 'MONEY')
  } else {
    me.customParams.empOrderType = me.record.get('empOrderType')
  }
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.setTitleByOrderType(me)
  me.makeScheduleSelector(me)
}

async function onFormDataReady () {
  const me = this
  if (me.record.get('typeCompensation') === 'HOLIDAY') {
    me.attr.byRequest.show()
  }
  setControlState(me)
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  if (me.isNewInstance) {
    const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList)
    if (config) {
      me.attr.dictTimeCostID.setValueById(config.dictTimeCostID)
      me.attr.dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
    }
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'byRequest':
      setControlState(me)
      break
    case 'typeCompensation':
      me.attr.byRequest[value === 'HOLIDAY' ? 'show' : 'hide']()
      setControlState(me)
      break
  }
}

function enableControls () {
  const me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
  me.down('[actionId=fillData]').setDisabled(me.isReadOnly)
  me.down('[name=importList]').setDisabled(me.isReadOnly)
  me.down('[name=dexportList]').setDisabled(me.isReadOnly)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function setControlState (me) {
  const byRequest = me.attr.byRequest.getValue() || me.attr.typeCompensation.getValue() !== 'HOLIDAY'
  AC.gridUtils.setGridColumnVisible(me.attr.hr_empOrderCwshdgrpEmp, ['dateRest'], !byRequest)
  me.attr.dictTimeCost2ID.setVisible(me.attr.typeCompensation.getValue() === 'HOLIDAY')
  me.attr.dictTimeCost2ID.setDisabled(byRequest)
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

function onValidateGridEdit (editor, ctx) {
  const employeePositionIDCtrl = editor.query(`[name=employeePositionID.description]`)[0]
  let ctrl = this.getField('dateFrom')
  let date = ctrl.getValue()
  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'isWorkDay',
    dateOf: date,
    workScheduleID: employeePositionIDCtrl.getFieldValue('workScheduleID'),
    organizationID: employeePositionIDCtrl.getFieldValue('organizationID')
  }).then(mParams => {
    if (mParams.isWorkDay === true) {
      const msg = UB.i18n('Вказана дата роботи не є вихідним або святковим днем за графіком роботи працівника')
      AC.viewUtils.showToast(msg, 'Помилка')
      employeePositionIDCtrl.markInvalid(msg)
      return false
    }
    return true
  })
}

function loadEmployeers (data, isDelete) {
  const me = this
  if (data.length) {
    const gridEmp = me.down('[name=hr_empOrderCwshdgrpEmp]')
    if (isDelete) {
      gridEmp.store.removeAll()
    }
    data.forEach(row => {
      gridEmp.addNewRecord(
        {
          'employeePositionID.description': row['description'],
          employeePositionID: row['employeePositionID'],
          description: row['description'],
          workHours: 8
        }
      )
    })
    me.setIsDirty(true)
  }
}

function exportCSVTemplate () {
  const attrs = ['taxCode', 'tabNum', 'numberOfHours', 'date']
  const content = attrs.reduce((res, item, index, arr) => {
    res += index !== arr.length - 1 ? `${item};` : item
    return res
  }, '')
  $App.connection.run({
    entity: 'ac_service',
    method: 'exportCsv',
    content: content
  }).then(({ result }) => {
    AC.filesService.saveAsByBase64Buffer(result, `Шаблон Оплата за середнім.csv`, { type: 'text/plain' })
  })
}

function loadCsv (btn) {
  const me = this

  // Ext.create('UB.view.UploadFileAjax', {
  Ext.create('AC.controls.acUploadFileAjax', {
    scope: this,
    height: 200,
    customArea: {
      xtype: 'panel',
      region: 'center',
      height: 140,
      items: [
        {
          xtype: 'combobox',
          // labelWidth: 100,
          width: 250,
          editable: false,
          name: 'encoding',
          fieldLabel: UB.i18n('Кодування'),
          allowBlank: false,
          // defaultValue: 'utf8',
          store: Ext.create('Ext.data.Store', {
            fields: ['text', 'value'],
            data: [
              {
                text: 'utf8',
                value: 'utf8'
              },
              {
                text: 'win1251',
                value: 'win1251'
              }
            ]
          })
        }
      ]
    },
    listeners: {
      afterrender: function (cmp) {
        this.fieldFile.fileInputEl.set({
          accept: '.csv' // or w/e type
        })
        const encodingCtrl = this.down('[name=encoding]')
        encodingCtrl.setValue('utf8')
      }
    },
    upLoad: function (btn) {
      me.setLoading(true)
      const dialogWindow = btn.up('window')
      const inputDom = this.fieldFile.fileInputEl.dom
      if (inputDom.files.length === 0) {
        return
      }
      const file = inputDom.files[0]
      if (file.name.toLowerCase().indexOf('.csv', file.name.length - 4) === -1) {
        $App.dialogInfo(UB.i18n('Невірний формат файлу, для завантаження використовується формат csv'))
        me.setLoading(false)
        return
      }
      const encodingCtrl = this.down('[name=encoding]')
      const encoding = (encodingCtrl ? encodingCtrl.getValue() : null) || 'utf8'
      UB.connection.post('loadImportDataEx', file, {
        params: {
          entityName: '',
          encoding,
          fileName: file.name
        },
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }).then(response => {
        me.setLoading(false)
        const data = response.data
        const attrs = data[0]
        const sourceRows = data.slice(1, data.length)
        const parsedData = []
        sourceRows.forEach((item, key) => {
          let row = {}
          attrs.forEach((attr, idx) => {
            attr = String(attr).trim()
            row[attr] = item[idx] || ''
          })
          row.idx = key
          parsedData.push(row)
        })
        dialogWindow.close()
        me.setLoading(true)
        const gridEmp = me.down('[name=hr_empOrderCwshdgrpEmp]')

        const execParams = {
          entity: 'hr_empOrderCwshdgrpDet',
          method: 'importList',
          organizationID: me.record.get('organizationID'),
          onDate: appAC.globalApplicationDate(),
          orderID: me.record.get('orderID'),
          paraID: me.instanceID,
          empOrderType: me.record.get('empOrderType'),
          parsedData: JSON.stringify(parsedData)
        }
        $App.connection.run(execParams)
          .then(mParams => {
            gridEmp.getStore().load()
            me.setLoading(false)
            if (mParams.errors) {
              const errors = JSON.parse(mParams.errors)
              $App.dialogInfo(UB.i18n(`Помилки:`) + ' <br /> ' + errors.join('<br />'))
            }
          }, err => {
            me.setLoading(false)
            throw err
          })
      })
    }
  })
}
