/* global  HR AC  Ext $App appAC appHR UB */
/* jshint maxerr: 10000 */
exports.formCode = {
  initComponentStart,
  createActions,
  addBaseActions,
  setPayElID,
  enableControls,
  initComponentDone,
  getEmpOrderType,
  setupView,
  gridEditing,
  loadEmployeers,
  onFormDataReady,
  onPayTypeChanged,
  onControlChanged,
  enablePayType,
  setPeriodID,
  findOrderAttrConfig,
  makeReasonSelector,
  getPayTypeText,
  setDateControl,
  changeDetail,
  loadCsv
}

function gridEditing (mode) {
  let me = this
  me.gridEditingMode = mode
  me.getField('payElID').setDisabled(mode === 'start')
  if (mode !== 'start') {
    const config = me.findOrderAttrConfig()
    if (config) {
      me.getField('payElID').setDisabled(!config.canEditPayElMain)
    }
  }
  me.getField('bountySum').setDisabled(mode === 'start')
  if (mode === 'start') {
    me.getField('payType').setDisabled(mode === 'start')
  } else {
    me.enablePayType(false)
  }
}

function onPayTypeChanged (field, newVal, oldVal) {
  let me = this
  if (!newVal) {
    newVal = me.record.get('payType')
  }
  const payTypeSign = me.down('[name=payTypeSign]')
  const text = me.getPayTypeText(newVal)
  payTypeSign.update(text)
}

function getPayTypeText (payType) {
  let text = ''
  switch (payType) {
    case 'PRC':
      text = '%'
      break
    case 'SUM':
      text = UB.i18n('грн')
      break
    case 'PLAN':
      text = UB.i18n('окладів')
      break
    case 'AVG':
      text = UB.i18n('середніх заробітків')
      break
  }
  return text
}

function setupView () {
  let me = this
  let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
  if (me.getEmpOrderType() === 'BOUNTY') {
    grid.down('[dataIndex=newValue]').setText(UB.i18n('Сума преміювання'))
    grid.down('[dataIndex=avgCount]').hide()
    // grid.down('[dataIndex=accrualCount]').hide()
  }
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  const me = this
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('workPlace'), [ 'editItem', 'showLookup', 'addItem' ])
  })

  me.on('aftersave', () => {
    setTimeout(function () {
      let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
      if (!grid) { // Зберегти та закрити
        return
      }
      grid.actions.refresh.setDisabled(false)
      let editor = grid.editingPlugin.editor
      if (editor && !editor.hidden) {
        return
      }
      grid.getStore().load()
    }, 1000)
  }, me)
  me.on('controlChanged', onControlChanged, me)
}

function createActions () {
  let me = this
  if (!me.actions.fillData) {
    me.actions.fillData = new Ext.Action({
      actionId: 'fillData',
      iconCls: 'fas fa-angle-double-down',
      cls: 'fill-action',
      eventId: 'fillData',
      text: UB.i18n('Завантажити згідно вибраним параметрам'),
      handler: async item => {
        let me = item.up('form')
        if (await me.saveForm() === -1) {
          return
        }
        let gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_empOrder-params',
          sender: me,
          customParams: {
            onClose: () => {
              // gridEmp.onRefresh()
            },
            onRender: paramsForm => {
              paramsForm.down('[name=positionType]').hide()
              paramsForm.down('[name=positionCategory]').hide()
              paramsForm.down('[name=isDeleteExisting]').show()
            },
            onAccept: (paramsForm, resultData) => {
              resultData.entity = 'hr_empOrderBountyDet'
              resultData.method = 'fillEmployee'
              resultData.organizationID = me.record.get('organizationID')
              resultData.onDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
              resultData.payType = me.record.get('payType')
              resultData.roundUpTo = me.record.get('roundUpTo')
              resultData.changeKind = me.record.get('changeKind')
              resultData.bountySum = me.record.get('bountySum')
              resultData.paraID = me.record.get('ID')
              resultData.payElID = me.record.get('payElID')
              resultData.orderID = me.record.get('orderID')
              resultData.empOrderType = me.getEmpOrderType()
              paramsForm.up('window').close()
              // DevUtils.inspect(resultData)
              $App.connection.run(resultData)
                .then(mParams => {
                  // DevUtils.inspect(mParams)
                  gridEmp.getStore().load()
                })
            }

          }
        })
      }

    })
  }
  if (!me.actions.fillDataAll) {
    me.actions.fillDataAll = new Ext.Action({
      actionId: 'fillDataAll',
      iconCls: 'fa fa-download',
      text: UB.i18n('Завантажити всі'),
      showText: false,
      handler: async item => {
        let me = item.up('form')
        if (await me.saveForm() === -1) {
          return
        }
        let gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
        let resultData = {}
        resultData.entity = 'hr_empOrderBountyDet'
        resultData.method = 'fillEmployee'
        resultData.organizationID = me.record.get('organizationID')
        resultData.onDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
        resultData.payType = me.record.get('payType')
        resultData.roundUpTo = me.record.get('roundUpTo')
        resultData.changeKind = me.record.get('changeKind')
        resultData.bountySum = me.record.get('bountySum')
        resultData.paraID = me.record.get('ID')
        resultData.payElID = me.record.get('payElID')
        resultData.orderID = me.record.get('orderID')
        resultData.empOrderType = me.getEmpOrderType()
        $App.connection.run(resultData)
          .then(mParams => {
            // DevUtils.inspect(mParams)
            gridEmp.getStore().load()
          })
      }

    })
  }
}

function loadEmployeers (data, isDelete) {
  const me = this
  me.setLoading(true)
  const empOrderType = me.getEmpOrderType()
  const gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
  const execParams = {
    entity: 'hr_empOrderBountyDet',
    method: 'loadEmployeeList',
    organizationID: me.record.get('organizationID'),
    onDate: AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate')),
    dateFrom: empOrderType === 'BOUNTY' ? AC.dateService.truncTimeToUtcNull(new Date(me.record.get('year'), me.record.get('month') - 1, 1)) : null,
    payType: me.record.get('payType'),
    roundUpTo: me.record.get('roundUpTo'),
    changeKind: me.record.get('changeKind'),
    bountySum: me.record.get('bountySum'),
    paraID: me.record.get('ID'),
    payElID: me.record.get('payElID'),
    orderID: me.record.get('orderID'),
    dictFundSourceID: me.record.get('dictFundSourceID'),
    empOrderType: me.getEmpOrderType(),
    isDeleteExisting: isDelete,
    records: data.map(o => o.employeePositionID) || []
  }
  $App.connection.run(execParams)
    .then(() => {
      gridEmp.getStore().load()
      me.setLoading(false)
    })
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function setPeriodID () {

}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function setPayElID () {
  let me = this
  let empOrderType = me.getEmpOrderType()
  let payElID = me.getField('payElID')
  if (empOrderType === 'BOUNTY') {
    AC.viewUtils.setWhereListProperty(payElID, [
      ['methodID.methodGroupID.code', '=', '3']
    ])
    AC.viewUtils.setWhereListProperty(me.getField('payType'), [
      ['code', 'in', ['SUM', 'PRC', 'PLAN']]
    ])
  } else if (empOrderType === 'BOUNTY_HELP') {
    AC.viewUtils.setWhereListProperty(payElID, [
      ['dictFundSourceID.dictFundTypeID.code', '<>', '02', 'notFSS'],
      ['dictFundSourceID', 'IsNull', null, 'dictFundSourceIDIsNull'],
      ['methodID.methodGroupID.code', '=', '7']
    ], ['([notFSS] OR [dictFundSourceIDIsNull])'])
  }
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
  me.enablePayType(true)
  const config = me.findOrderAttrConfig()
  const payElCtrl = me.getField('payElID')
  if (config) {
    payElCtrl.setDisabled(!config.canEditPayElMain)
  } else {
    payElCtrl.setDisabled(false)
  }
  me.down('[actionId=recalc]').setDisabled(me.isReadOnly)
  me.down('[actionId=fillData]').setDisabled(me.isReadOnly)
  me.attr.year.setReadOnly(me.isReadOnly)
  me.attr.month.setReadOnly(me.isReadOnly)
  me.attr.quarter.setReadOnly(me.isReadOnly)
  me.attr.month.setAllowBlank(me.getEmpOrderType() === 'BOUNTY_HELP' || me.isReadOnly)
  if (me.getEmpOrderType() !== 'BOUNTY_HELP') {
    const grid = me.down('[name=hr_empOrderChgSalEmpDet]')
    const col = grid && grid.columns.find(o => o.dataIndex === 'employeeFamilyID.description')
    if (col) {
      col.setVisible(false)
      col.setDisabled(true)
    }
  }
}

function findOrderAttrConfig () {
  return this.orderAttrConfigList.length ? this.orderAttrConfigList[0] : null
}

async function onControlChanged (field, value, oldValue) {
  let me = this
  if (me.record.get('empOrderType') === 'BOUNTY_HELP') {
    if (field.skipChanged) {
      delete field.skipChanged
    }
  }
  switch (field.name) {
    case 'payElID':
      if (me.getEmpOrderType() === 'BOUNTY') {
        const dictFundSourceID = field.getFieldValue('dictFundSourceID')
        if (dictFundSourceID) me.attr.dictFundSourceID.setValueById(dictFundSourceID)
        appHR.getCurrentPeriod(appAC.globalOrganization()).then(currentPeriod => {
          const methodCode = field.getFieldValue('methodID.code')
          switch (methodCode) {
            case '46': // Річна премія
              me.attr.yearPeriod.setValue(1)
              me.attr.month.setValue(1)
              me.attr.month.hide()
              me.attr.quarter.hide()
              me.attr.yearPeriod.show()
              me.attr.yearPeriod.setReadOnly(true)
              me.attr.year.setValue(currentPeriod.dateFrom.getFullYear())
              break
            case '45': // Квартальна премія
              me.attr.month.setValue(1)
              me.attr.quarter.setValue(1)
              me.attr.month.hide()
              me.attr.yearPeriod.hide()
              me.attr.quarter.show()
              me.attr.yearPeriod.setReadOnly(false)
              break
            default:
              me.attr.year.setValue(currentPeriod.dateFrom.getFullYear())
              me.attr.month.show()
              me.attr.quarter.hide()
              me.attr.yearPeriod.hide()
              me.attr.month.setValue(currentPeriod.dateFrom.getMonth() + 1)
              me.attr.yearPeriod.setReadOnly(false)
              break
          }
        })
      }
      break
  }
}

function changeDetail (me) {
  if (me.attr.payElID.getValue() && me.attr.bountySum.getValue()) {
    me.saveForm().then(result => {
      if (result !== -1) {
        me.setLoading(UB.i18n('Виконується перерахунок...'))
        $App.connection.run({
          entity: me.entityName,
          method: 'updateBountyPayEl',
          ID: me.instanceID,
          payElID: me.attr.payElID.getValue(),
          dateFrom: AC.dateService.truncTimeToUtcNull(new Date(me.record.get('year'), me.record.get('month') - 1, 1))
        }).then(mParams => {
          me.down('[name=hr_empOrderChgSalEmpDet]').onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    })
  }
}

function enablePayType (isModify) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  if (me.getEmpOrderType() === 'BOUNTY_HELP') {
    let payTypeValue = me.getField('payElID').getFieldValue('calcAvgType') || me.getField('payElID').getFieldValue('calcSumType')
    let payType = me.getField('payType')
    payType.setDisabled(false)
    payType.getStore().clearFilter()
    if (['PLAN', 'AVG'].includes(payTypeValue)) {
      isModify && payType.setValue(payTypeValue)
      payType.setDisabled(true)
    } else {
      payTypeValue = me.getField('payElID').getFieldValue('methodID.valuation')
      if (payTypeValue === 'SUM') {
        isModify && payType.setValue('SUM')
        payType.setDisabled(true)
      } else if (payTypeValue === 'RATE') {
        isModify && payType.setValue('PRC')
        payType.setDisabled(true)
      } else if (payTypeValue === 'SUMRATE') {
        payType.getStore().filter(rec => {
          const code = rec.get('code')
          return ['SUM', 'PRC'].includes(code)
        })
        if (isModify && payType.getValue() !== 'SUM') {
          payType.setValue('PRC')
        }
        payType.setDisabled(false)
      }
    }
  }
}

function initComponentDone () {
  let me = this
  AC.viewUtils.setAttr(me)
  let sender = me.sender

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (sender) {
    let reco = AC.gridUtils.getCurrentRecord(sender)
    if (reco) {
      let tab = me.down(`[name=${reco.get('mi_unityEntity')}]`)
      if (tab) {
        tab.show()
      }
    }
  }
  me.orderState = me.masterForm.record.get('orderState')

  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })

  me.on('recordloaded', async function (a) {
    const me = this
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('roundUpTo', '1')
      me.setPeriodID()
      me.record.set('empOrderType', me.customParams.empOrderType)
      me.record.set('payType', 'PRC')
      me.record.set('workPlace', '1')
      me.record.set('month', AC.dateService.todayDate().getMonth() + 1)
      me.record.set('dateFrom', AC.dateService.todayDate())
    }
    if (me.record.get('year') !== me.down('[name=year]').getValue()) {
      me.down('[name=year]').skipChange = true
    }
    me.down('[name=year]').setValue(me.record.get('year'))
    if (me.record.get('month') !== me.down('[name=month]').getValue()) {
      me.down('[name=month]').skipChange = true
    }
    me.down('[name=month]').setValue(me.record.get('month'))

    HR.orderManager.setTitleByOrderType(me)
    me.onBeforeSave = () => {
      me.record.set('tabDate', me.record.get('dateFrom'))
      if (!me.record.get('payElID')) {
        AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не заповнене поле "Вид оплати"'))
        return Promise.resolve(false)
      }
      return Promise.resolve(true)
    }
    me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
    HR.orderManager.setDefaultValues(me)
    // me.masterForm.makeReasonSelector(me)
    me.makeReasonSelector(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'orderWord',
      dictReasonField: 'orderWord',
      entityName: 'hr_dictOrderDetOrderWord'
    })
  })
  me.on('aftersave', function (a) {
    let grid = me.down('[name=hr_empOrderChgSalEmpDet]')
    grid.actions.refresh.setDisabled(true)
  })
  me.on('formDataReady', onFormDataReady, me)
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('payElID')) {
      me.enablePayType(true)
    }
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
  })
  loadYearFieldStore(me)
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()
}

function loadYearFieldStore (me) {
  const yearList = []
  const curYear = AC.dateService.currentDate().getFullYear()
  for (let i = 20; i > -20; i--) {
    yearList.push({
      value: curYear + i,
      name: String(curYear + i)
    })
  }
  const yearField = me.down('[name=year]')
  const store = Ext.create('Ext.data.Store', {
    fields: [
      { name: 'value' },
      { name: 'name' }
    ],
    data: yearList
  })
  yearField.bindStore(store)
}

async function onFormDataReady () {
  const me = this

  const empOrderType = me.getEmpOrderType()
  if (empOrderType === 'BOUNTY_HELP') {
    me.attr.year.hide()
    me.attr.month.hide()
    me.attr.quarter.hide()
    me.attr.yearPeriod.hide()
    me.attr.reason.hide()
    me.down('[name=reasonButton]').hide()
    // me.attr.dictFundSourceID.hide()
  }
  if (empOrderType === 'BOUNTY') {
    me.down('[name=orderWordPanel]').show()
  }

  HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.setPayElID()
  me.onPayTypeChanged()
  me.enableControls()
  me.setupView()
  me.setDateControl(me.getField('payElID').getValue())
  HR.orderManager.findMasterRecord(me, me.down('[name=hr_empOrderChgSalEmpDet]'), 'employeePositionID')
}

function setDateControl (value) {
  const me = this
  if (me.getEmpOrderType() !== 'BOUNTY') {
    return
  }
  appHR.getCurrentPeriod(appAC.globalOrganization()).then(currentPeriod => {
    UB.Repository('hr_payEl')
      .attrs(['ID', 'methodID.code'])
      .selectById(value)
      .then(payEl => {
        if (payEl && payEl['methodID.code']) {
          switch (payEl['methodID.code']) {
            case '46': // Річна премія
              me.attr.month.hide()
              me.attr.quarter.hide()
              me.attr.yearPeriod.show()
              me.attr.yearPeriod.setReadOnly(true)
              if (me.attr.yearPeriod.getValue() !== 1) {
                me.attr.yearPeriod.skipChange = true
              }
              me.attr.yearPeriod.setValue(1)
              if (me.attr.year.getValue() !== (me.record.get('year') || currentPeriod.dateFrom.getFullYear())) {
                me.attr.year.skipChange = true
              }
              me.attr.year.setValue(me.record.get('year') || currentPeriod.dateFrom.getFullYear())
              break
            case '45': // Квартальна премія
              if (me.attr.month.getValue() !== me.record.get('month')) {
                me.attr.month.skipChange = true
              }
              me.attr.month.setValue(me.record.get('month'))
              if (me.attr.quarter.getValue() !== me.record.get('month')) {
                me.attr.quarter.skipChange = true
              }
              me.attr.quarter.setValue(me.record.get('month'))
              me.attr.month.hide()
              me.attr.yearPeriod.hide()
              me.attr.quarter.show()
              me.attr.yearPeriod.setReadOnly(false)
              break
            default:
              me.attr.month.show()
              me.attr.quarter.hide()
              me.attr.yearPeriod.hide()
              if (me.attr.year.getValue() !== (me.record.get('year') || currentPeriod.dateFrom.getFullYear())) {
                me.attr.year.skipChange = true
              }
              me.attr.year.setValue(me.record.get('year') || currentPeriod.dateFrom.getFullYear())
              if (me.attr.month.getValue() !== me.record.get('month')) {
                me.attr.month.skipChange = true
              }
              me.attr.month.setValue(me.record.get('month'))
              me.attr.yearPeriod.setReadOnly(false)
              break
          }
        } else {
          me.attr.month.show()
          me.attr.quarter.hide()
          if (me.attr.year.getValue() !== (me.record.get('year') || currentPeriod.dateFrom.getFullYear())) {
            me.attr.year.skipChange = true
          }
          me.attr.year.setValue(me.record.get('year') || currentPeriod.dateFrom.getFullYear())
          me.attr.month.skipChange = true
          if (me.attr.month.getValue() !== me.record.get('month')) {
            me.attr.month.setValue(me.record.get('month'))
          }
          me.attr.month.setReadOnly(false)
          me.attr.month.setFieldLabel(UB.i18n('За період'))
        }
      })
  })
}

function makeReasonSelector () {
  const me = this
  const reasonFieldName = 'reason'
  const entityName = 'hr_dictReasonBounty'
  const attrs = $App.domainInfo.get(entityName, true).attributes
  const reasonField = me.getField(reasonFieldName)
  if (reasonField.contextmenu && reasonField.contextmenu.down(`[ubID=item${reasonFieldName}Selector]`)) {
    return
  }
  const fieldList = ['code', 'name']
  let orderField = (attrs.name && 'name') || (attrs.description && 'description') || fieldList[0]
  const orderList = { orderBy: { expression: orderField } }
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
        whereList: [],
        logicalPredicates: undefined,
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

function loadCsv (btn) {
  const me = btn.up('form')

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
            row[attr] = item[idx] || ''
          })
          row.idx = key
          parsedData.push(row)
        })
        if (!attrs.includes('taxCode') || !attrs.includes('tabNum') || !attrs.includes('rate') || !attrs.includes('total')) {
          $App.dialogInfo(UB.i18n('Невірний формат файлу!'))
          me.setLoading(false)
          return
        }
        me.setLoading(true)
        const empOrderType = me.getEmpOrderType()
        const gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')

        const execParams = {
          entity: 'hr_empOrderBountyDet',
          method: 'importList',
          organizationID: me.record.data.organizationID,
          onDate: AC.dateService.truncTimeToUtcNull(me.orderForm.record.data.orderDate || me.orderForm.record.data.entryDate),
          dateFrom: empOrderType === 'BOUNTY' ? AC.dateService.truncTimeToUtcNull(new Date(me.record.data.year, me.record.data.month - 1, 1)) : null,
          payType: me.record.data.payType,
          changeKind: me.record.data.changeKind,
          bountySum: me.record.data.bountySum,
          paraID: me.record.data.ID,
          payElID: me.record.data.payElID,
          orderID: me.record.data.orderID,
          dictFundSourceID: me.record.data.dictFundSourceID,
          empOrderType: empOrderType,
          parsedData: JSON.stringify(parsedData)
        }
        $App.connection.run(execParams)
          .then(({ resultData }) => {
            gridEmp.getStore().load()
            me.setLoading(false)
            dialogWindow.close()
            $App.dialogInfo(resultData.msg)
          })
      })
    }
  })
}
