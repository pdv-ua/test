/* global  HR AC  Ext $App UB appAC */
exports.formCode = {
  initComponentStart,
  setPayElID,
  enableControls,
  initComponentDone,
  getEmpOrderType,
  loadEmployeers,
  onFormDataReady,
  findOrderAttrConfig,
  loadCsv,
  postInit,
  onCheckValidBeforeSaveForm,
  controlChanged,
  exportCSVTemplate
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['hr_empOrderEmployeeDet']
  }
  AC.acEditGridManager.init(me)
  me.onBeforeSave = onCheckValidBeforeSaveForm
  me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
  me.on('controlChanged', controlChanged, me)
}

function loadEmployeers (data, isDelete) {
  const me = this
  if (data.length) {
    const gridEmp = me.down('[name=hr_empOrderEmployeeDet]')
    if (isDelete) {
      gridEmp.store.removeAll()
    }
    data.forEach(row => {
      gridEmp.addNewRecord(
        {
          'employeePositionID.description': row['description'],
          employeePositionID: row['employeePositionID'],
          description: row['description'],
          dateFrom: AC.dateService.truncTimeToUtcNull(AC.dateService.currentDate()),
          dateTo: AC.dateService.truncTimeToUtcNull(AC.dateService.currentDate())
        }
      )
    })
    me.setIsDirty(true)
  }
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function setPayElID () {
  let me = this
  if (me.isNewInstance) {
    const config = me.findOrderAttrConfig()
    const payElCtrl = me.getField('payElID')
    if (config) {
      payElCtrl.setValueById(config.payElIDMain)
    }
  }
}

function enableControls () {
  const me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
  const config = me.findOrderAttrConfig()
  const payElCtrl = me.getField('payElID')
  if (config) {
    payElCtrl.setDisabled(!config.canEditPayElMain)
  } else {
    payElCtrl.setDisabled(false)
  }
  me.down('[actionId=fillData]').setDisabled(me.isReadOnly)
  me.down('[name=orderWordButton]').setVisible(!me.isReadOnly)
  me.down('[name=importList]').setDisabled(me.isReadOnly)
  me.down('[name=dexportList]').setDisabled(me.isReadOnly)
}

function findOrderAttrConfig () {
  return this.orderAttrConfigList.length ? this.orderAttrConfigList[0] : null
}

function initComponentDone () {
  let me = this
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.masterForm.record.get('orderState')
}

function postInit (me, record, data) {
  if (me.isNewInstance) {
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.customParams.empOrderType)
  }
  HR.orderManager.setTitleByOrderType(me)
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'orderWord',
    dictReasonField: 'orderWord',
    entityName: 'hr_dictOrderDetOrderWord'
  })
}

async function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.setPayElID()
  me.enableControls()
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
        const gridEmp = me.down('[name=hr_empOrderEmployeeDet]')

        const execParams = {
          entity: 'hr_empOrderAveragepayDet',
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

function onCheckValidBeforeSaveForm () {
  const me = this
  return new Promise(function (resolve) {
    if (me.getGridEditState()) {
      $App.dialogInfo(UB.i18n('Необхідно завершити редагування даних'))
      resolve(false)
    } else {
      const grid = me.down('[name=hr_empOrderEmployeeDet]')
      const store = grid.getStore()
      const errorMessages = []
      store.each(record => {
        if (!record.get('dateFrom') || !record.get('dateTo')) {
          errorMessages.push(record.get('description'))
        }
      })
      if (errorMessages.length) {
        $App.dialogInfo(UB.i18n(`Неможливо зберегти. Не заповнена "дата з" або "дата по" для працівників: {0}`, errorMessages.join('<br>')))
        resolve(false)
      }
      resolve(true)
    }
  })
}

function controlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'payElID':
      me.record.set('dictTimeCostID', field.getFieldValue('dictTimeCostID'))
      break
  }
}

function exportCSVTemplate () {
  const attrs = ['taxCode', 'tabNum', 'dateFrom', 'dateTo']
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
