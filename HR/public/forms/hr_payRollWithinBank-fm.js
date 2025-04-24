/* global HR AC UB $App _ appAC appHR Ext Blob */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  postInit,
  setFilterSource,
  beforePosting,
  onFormDataReady,
  onAddNewByCurrent,
  onAfterOrderSave,
  onControlChanged,
  addBaseActions,
  beforeGridEdit,
  onGridEdit,
  beforePayGridEdit,
  onPayGridEdit,
  selectOrderRegistry,
  calc,
  showPaymentOrder,
  getPrintDocument,
  setPayOrder,
  onPrepareDataBeforeSaveOrder,
  viewMark,
  exportXLSX,
  setEmployeeNumbers,
  transferToPayOut
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['payRollPerm', 'payRollDt', 'payOrder'],
    customPrepareDataBeforeSaveOrder: true,
    customAddNewByCurrent: true,
    hideEditDocNumber: true
  }
  me.viewReason = false
  me.canUpdateIfPosted = true
  me.settings = JSON.parse(UB.core.UBLocalStorageManager.getItem('hr_payRollPayOrder') || '{"isPayOut":false}')
  HR.orderManager.init(me)
}

function onPrepareDataBeforeSaveOrder (me, params) {
  const formData = { detail: {} }
  formData.detail.payRollDt = me.attr.payRollDt.getAttributeData()
  formData.detail.payRollPerm = me.attr.payRollPerm.getAttributeData()
  params.formData = JSON.stringify(formData)
}

function initOrderComponentDone () {
  const me = this
  me.down('[name=payRollPerm]').on('changeData', (grid, action) => {
    if (action === 'delete') {
      me.calc(me, true)
    }
  })
  me.attr.payRollDt.on('changeChecked', () => {
    me.down('[name=delBtn]').setDisabled(me.attr.payRollDt.getCheckedRow().length === 0 || me.record.get('orderState') === 'POSTED' || !me.attr.periodSalaryID.getFieldValue('isCurrent'))
  })
  const dictSignerStore = me.down('[name=dictSigners]').getStore()
  let depID = me.attr.departmentID.getValue()
  if (depID) {
    dictSignerStore.ubRequest.whereList.departmentID = {
      expression: '[departmentID]',
      condition: 'equal',
      value: depID
    }
  } else {
    dictSignerStore.ubRequest.whereList.departmentID = {
      expression: '[departmentID]',
      condition: 'isNull'
    }
  }

  me.attr.dictFundSourceList.store.ubRequest.orgID = appAC.globalOrganization()
  me.attr.dictFundSourceList.store.ubRequest.method = 'selectByOrg'

  const changeAttrs = ['percentPay', 'dictFundSourceList', 'dictProgClassList', 'dictProjectList']
  changeAttrs.forEach(attrName => {
    me.attr[attrName].on('keypress', (ctrl, e) => {
      if (e.getKey() === e.ENTER) {
        changeParams(ctrl)
      }
    })
    me.attr[attrName].on('focus', (ctrl) => { ctrl.onFocusValue = ctrl.getValue() })
    me.attr[attrName].on('blur', changeParams)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (ctrl.onFocusValue !== ctrl.getValue()) {
    me.calc(me)
  }
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.accrualService.addExportAction(me)
  HR.orderManager.addOrderAction(me)
  me.actions.printAction = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    actionId: 'printDocumentAction',
    text: UB.i18n('Друкувати'),
    eventId: 'printDocumentAction',
    disabled: true,
    menu: [
      {
        text: UB.i18n('Платіжна відомість. Типова форма № 53'),
        handler: function () {
          getPrintDocument(me, 'payForm53', me.instanceID, 'pdf')
        }
      },
      {
        text: UB.i18n('Платіжна відомість. Типова форма № 53 (word)'),
        handler: function () {
          getPrintDocument(me, 'payForm53', me.instanceID, 'docx')
        }
      },
      {
        text: UB.i18n('Список перерахування в банк'),
        handler: function () {
          getPrintDocument(me, 'hr_payRollBank_1', me.instanceID, 'pdf')
        }
      },
      {
        text: UB.i18n('Заявка розрахунок'),
        handler: function () {
          getPrintDocument(me, 'hr_payRoll_calcApplication', me.instanceID, 'pdf')
        }
      }
    ]
  })
  me.actions.filterButtonAction = new Ext.Action({
    xtype: 'button',
    name: 'filterButton',
    iconCls: 'u-icon-layers',
    text: UB.i18n('Додаткові параметри виплати'),
    handler: function (btn) {
      const localStorageData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`) || '{}')
      me.isFilter = !me.isFilter
      if (me.record.get('orderState') === 'PROJECT') {
        if (!me.isFilter && (me.attr.dictFundSourceList.getValue() || me.attr.dictProgClassList.getValue() || me.attr.dictProjectList.getValue())) {
          me.attr.payRollDt.removeAll()
          me.attr.dictFundSourceList.setValue()
          me.attr.dictProgClassList.setValue()
          me.attr.dictProjectList.setValue()
        }
        if (!localStorageData) {
          UB.core.UBLocalStorageManager.setItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`, {
            isFilter: me.isFilter
          })
        } else {
          UB.core.UBLocalStorageManager.setItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`, {
            isFilter: me.isFilter,
            dictFundSourceList: localStorageData.dictFundSourceList || null,
            dictProgClassList: localStorageData.dictProgClassList || null,
            dictProjectList: localStorageData.dictProjectList || null
          })
        }
      }
      me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
      btn.addCls(me.isFilter ? 'custom-action_btn' : '')
      btn.removeCls(!me.isFilter ? 'custom-action_btn' : '')
      btn.setTooltip(me.isFilter ? UB.i18n('Виключити додаткові параметри виплати') : UB.i18n('Додаткові параметри виплати'))
    }
  })
}

function beforePosting () {
  const me = this
  return appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
    if (response.ID !== me.record.get('periodCalcID')) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Платіжну відомість буде проведено по розрахунковим листам поточного розрахункового періоду. Продовжити?'))
        .then(resPeriod => {
          if (resPeriod) {
            if (AC.settings.get('hrExportPayRollToAccounting', me.record.get('organizationID'), null)) {
              if (!me.record.get('payOutID')) {
                return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Не заповнено шаблон виплати. Продовжити?'))
                  .then(res => {
                    return res
                  })
              } else {
                return Promise.resolve(true)
              }
            } else {
              return Promise.resolve(true)
            }
          }
        })
    } else {
      if (AC.settings.get('hrExportPayRollToAccounting', me.record.get('organizationID'), null)) {
        if (!me.record.get('payOutID')) {
          return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Не заповнено шаблон виплати. Продовжити?'))
            .then(res => {
              return res
            })
        } else {
          return Promise.resolve(true)
        }
      } else {
        return Promise.resolve(true)
      }
    }
  })
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.payRollPerm.length')) {
    me.attr.payRollPerm.setLocalStoreData(me.formData.detail.payRollPerm)
  } else if (data.method !== 'addnew') {
    me.attr.payRollPerm.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.payRollDt.length')) {
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt)
    me.viewMark(me)
  } else if (data.method !== 'addnew') {
    me.attr.payRollDt.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.payOrder.length')) {
    if (me.settings.isPayOut) {
      me.setPayOrder(me, _.get(me, 'formData.detail.payRollDt.length') ? me.formData.detail.payRollDt : [])
    } else {
      me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder)
    }
  } else {
    me.attr.payOrder.getStore().removeAll()
  }
  me.setFilterSource(me)
}

function setFilterSource (me) {
  const data = me.attr.payRollPerm.getData()
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'getSourceForWithin',
    orderRegistryIDs: JSON.stringify(data.map(o => o.orderRegistryID))
  }).then(response => {
    const resultData = JSON.parse(response.resultData)
    if (resultData.dictFundSourceIDs.length) {
      AC.viewUtils.setFilterValue(me.attr.dictFundSourceList, { 'ID': resultData.dictFundSourceIDs })
    } else {
      me.attr.dictFundSourceList.getStore().clearFilter()
    }
    if (resultData.dictProjectIDs.length) {
      AC.viewUtils.setFilterValue(me.attr.dictProjectList, { 'ID': resultData.dictProjectIDs })
    } else {
      me.attr.dictProjectList.getStore().clearFilter()
    }
    if (resultData.dictProgClassIDs.length) {
      AC.viewUtils.setFilterValue(me.attr.dictProgClassList, { 'ID': resultData.dictProgClassIDs })
    } else {
      me.attr.dictProgClassList.getStore().clearFilter()
    }
  })
}
function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    if (!me.defaultValues.description) {
      setDescription(me)
    }
  }

  const localData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`) || '{}')
  if (me.isNewInstance) {
    me.isFilter = localData.isFilter
    localData ? me.down('[name=filterPanel]')[localData.isFilter ? 'show' : 'hide']() : me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
    localData && localData.isFilter && me.down('[name=filterButton]').addCls(localData.isFilter ? 'custom-action_btn' : '')
    localData && me.attr.dictFundSourceList.setValue(localData.dictFundSourceList)
    localData && me.attr.dictProgClassList.setValue(localData.dictProgClassList)
    localData && me.attr.dictProjectList.setValue(localData.dictProjectList)
  }

  if (localData && !me.isNewInstance) {
    const filterButton = me.down('[name=filterButton]')
    const filterPanel = me.down('[name=filterPanel]')
    me.isFilter = localData.isFilter
    filterPanel[me.isFilter ? 'show' : 'hide']()
    filterButton.addCls(localData.isFilter ? 'custom-action_btn' : '')
    filterButton.removeCls(!localData.isFilter ? 'custom-action_btn' : '')
    me.isFilter ? filterButton.setTooltip(UB.i18n('Виключити додаткові параметри виплати')) : filterButton.setTooltip(UB.i18n('Додаткові параметри виплати'))
  } else if (!localData && !me.isNewInstance) {
    me.down('[name=filterPanel]').hide()
  }
  me.attr.dictFundSourceList.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()

  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.code': [128, 129] })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
  appHR.getPayOutList(me.record.get('organizationID')).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  AC.viewUtils.setFilterValue(me.attr.dictMultiGroupID, { orgID: me.record.get('organizationID') })
  me.attr.payRollDt.down('[name=delBtn]').setDisabled(true)
  me.actions.printAction.setDisabled(me.isNewInstance)
  me.setActionDisabled('fDelete', true)
  if (me.record.get('orderState') === 'POSTED') {
    const attrNames = ['orderNumber', 'orderDate', 'description', 'payOutID']
    attrNames.forEach(attrName => {
      if (!me.record.get(attrName)) {
        me.attr[attrName].setReadOnly(false)
      }
    })

    // me.down('[name=filterButton]').setDisabled(true)
    if (me.attr.dictFundSourceList.getValue().length || me.attr.dictProgClassList.getValue().length || me.attr.dictProjectList.getValue().length) {
      me.down('[name=filterPanel]').show()
      me.down('[name=filterButton]').addCls('custom-action_btn')
    }
  }

  // if (me.record.get('orderState') === 'PROJECT') me.down('[name=filterButton]').setDisabled(false)

  const payOutBtn = me.down('[name=payOutBtn]')
  payOutBtn.addCls(!me.settings.isPayOut ? 'blue-action' : 'green-action')
  payOutBtn.removeCls(me.settings.isPayOut ? 'blue-action' : 'green-action')
  me.attr.dictFundSourceList.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
  me.attr.dictFundSourceList.show()
  me.attr.dictProgClassList[AC.settings.get('hrProgClassAcc', me.record.get('organizationID')) ? 'show' : 'hide']()
  me.attr.dictProjectList[AC.settings.get('hrProjectAcc', me.record.get('organizationID')) ? 'show' : 'hide']()
  if (me.isNewInstance) {
    me.attr.applyAddRetention.setValue(true)
    appHR.getCurrentPeriod(me.record.get('organizationID')).then(response => {
      me.attr.applyBalance.setValue(response.dateFrom >= AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom')))
    })
  }
  me.attr.includeSubDep.setReadOnly(!me.record.get('departmentID'))
  me.attr.includeSubDepGroup.setReadOnly(!me.record.get('dictMultiGroupID'))

  if (me.record.get('departmentID')) {
    AC.viewUtils.setWhereListProperty(me.attr.dictSigners, [
      ['departmentID', '=', me.record.get('departmentID')]
    ])
  }
}

function onAddNewByCurrent (data) {
  const me = this
  me.formData = {}
  const detail = data.detail || null
  if (detail && me.isNewInstance) {
    me.docConfig.detailGrids.forEach((detName) => {
      me.attr[detName].setLocalStoreData([])
      detail[detName].forEach((item) => {
        delete item.ID
        delete item.mi_modifyDate
        me.attr[detName].addNewRecord(item)
      })
    })
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.payRollPerm.setLocalStoreData(me.formData.detail.payRollPerm, false, true)
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt, false, true)
    me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder, false, true)
    me.viewMark(me)
  }
}

function setDescription (me) {
  me.attr.description.setValue(`${UB.i18n(me.attr.payElID.getFieldValue('name')) || ''}${me.attr.periodSalaryID.getValue()
    ? ` за ${me.attr.periodSalaryID.getFieldValue('name')}` : ''}${me.attr.dictMultiGroupID.getValue()
    ? `, ${UB.i18n('Група підрозділів')}: ${me.attr.dictMultiGroupID.getFieldValue('name') + (me.attr.includeSubDepGroup.getValue() ? `, ${UB.i18n('з підлеглими')}` : '')}` : ''}${me.attr.departmentID.getValue()
    ? `, ${UB.i18n('Підрозділ')}: ${me.attr.departmentID.getFieldValue('name') + (me.attr.includeSubDep.getValue() ? `, ${UB.i18n('з підлеглими')}` : '')}` : ''}`)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'dictProgClassList':
    case 'dictProjectList':
    case 'dictFundSourceList':
      saveFilterValue(me)
      break
    case 'departmentID':
      me.attr.includeSubDep.setValue(false)
      me.attr.includeSubDep.setReadOnly(!value)
      if (value) {
        me.attr.dictMultiGroupID.setValueById(null)
      }
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      me.calc(me, true)
      const dictSignerStore = me.down('[name=dictSigners]').getStore()
      if (!value) {
        dictSignerStore.ubRequest.whereList.departmentID = {
          expression: '[departmentID]',
          condition: 'isNull'
        }
      } else {
        dictSignerStore.ubRequest.whereList.departmentID = {
          expression: '[departmentID]',
          condition: 'equal',
          value: value
        }
      }
      dictSignerStore.load()
      setDescription(me)
      break
    case 'dictMultiGroupID': {
      me.attr.includeSubDepGroup.setValue(false)
      me.attr.includeSubDepGroup.setReadOnly(!value)
      if (value) {
        me.attr.departmentID.setValueById(null)
      }
      me.attr.payRollPerm.removeAll()
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      setDescription(me)
      break
    }
    case 'periodSalaryID': {
      appHR.getCurrentPeriod(me.record.get('organizationID')).then(response => {
        me.attr.applyBalance.setValue(response.dateFrom >= AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom')))
      })
      me.attr.payRollPerm.removeAll()
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      setDescription(me)
      break
    }
    case 'includeSubDepGroup':
    case 'includeSubDep': {
      me.attr.payRollPerm.removeAll()
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      setDescription(me)
      break
    }
  }
}

function beforeGridEdit (me, gridName, context) {
  if (context.column.dataIndex === 'orderRegistryID.description') {
    AC.viewUtils.setFilterValue(context.column.field, {
      organizationID: me.record.get('organizationID'),
      periodID: me.record.get('periodCalcID'),
      orderState: { value: 'POSTED' }
    })
    AC.viewUtils.setValueOnChange(context.column.field,
      {
        'orderNumber': 'orderRegistryID.orderNumber',
        'orderType': 'orderRegistryID.orderType',
        'periodID.name': 'orderRegistryID.periodID.name',
        'lineCount': 'orderRegistryID.lineCount',
        'paySum': 'orderRegistryID.paySum'
      },
      context.record,
      ['clearValue']
    )
  }
  if (_.includes([null, ''], context.record.get('payRollID'))) {
    context.record.set('payRollID', me.record.get('ID'))
  }
}

function onGridEdit (me, gridName, context) {
  if (_.includes([null, ''], context.record.get('orderRegistryID.paySum'))) {
    context.record.set('orderRegistryID.paySum', context.record.get('orderRegistryID.paySum') ? context.record.get('orderRegistryID.paySum') : '0')
  }
  const orderRegistryID = context.record.get('orderRegistryID')
  const data = context.grid.getData()
  if (data.filter(o => o.orderRegistryID === orderRegistryID).length > 1) {
    $App.dialogError(UB.i18n(`Документ нарахування № {0} вже доданий в поточну платіжну відомість!`, context.record.get('orderRegistryID.orderNumber')), 'Помилка!')
    context.store.remove(context.record)
    return
  }
  UB.Repository('hr_RollReg')
    .attrs(['orderRegistryID', 'payRollID.orderNumber'])
    .where('orderRegistryID', '=', orderRegistryID)
    .where('payRollID', '<>', me.record.get('ID'))
    .where('payRollID.mi_deleteDate', '>=', '#maxdate')
    .selectSingle().then(res => {
      if (res) {
        $App.dialogInfo(UB.i18n(`Документ нарахування № {0} вже доданий в платіжну відомість № {1}`, context.record.get('orderRegistryID.orderNumber'), res['payRollID.orderNumber']), 'Увага!')
      } else {
        me.attr.payRollDt.removeAll()
        me.attr.payOrder.removeAll()
        me.calc(me, true)
      }
    })
  me.setFilterSource(me)
}

function beforePayGridEdit (me, gridName, context) {
  if (context.column.dataIndex === 'employeeNumberID.description') {
    if (context.record.phantom && context.record.get('employeeNumberID.description') && context.record.dirtySave !== null) {
      context.record.dirtySave = null
    }
    if (!me.attr.periodSalaryID.getValue()) {
      $App.dialogError(UB.i18n('неприпустиме значення поля "За період"!'), 'Помилка!')
    } else {
      const orderDate = me.record.get('orderDate')
      AC.viewUtils.setWhereListProperty(context.column.field, [
        ['organizationID', '=', me.record.get('organizationID')],
        ['dateTo', '<', '#maxdate', 'dismDateTo'],
        ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
        ['dateTo', '>=', orderDate, 'dateTo'],
        ['dateFrom', '<=', orderDate, 'dateFrom']
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
      AC.viewUtils.setValueOnChange(context.column.field,
        {
          'employeeNumberID': 'employeeNumberID',
          'depName': 'depName',
          'posName': 'posName'
        },
        context.record,
        ['clearValue']
      )
      context.column.field.on('change', (ctrl, value) => {
        if (value) {
          $App.connection.run({
            entity: 'hr_payRoll',
            method: 'getPayOutByEmployee',
            employeeNumbers: JSON.stringify([{ employeeNumberID: ctrl.getFieldValue('employeeNumberID') }]),
            orgID: me.record.get('organizationID'),
            payElID: me.attr.payElID.getValue(),
            paymentMethod: me.record.get('paymentMethod')
          }).then(response => {
            const data = JSON.parse(response.resultData)[0]
            context.record.set('payOutID', data.payOutID)
            context.record.set('employeePayOutID', data.employeePayOutID)
            context.record.set('payRetentionID', data.payRetentionID)
            context.record.set('payOutID.name', data['payOutID.name'])
            context.record.set('payRetentionID.payOutID.name', data['payRetentionID.payOutID.name'])
            context.record.set('employeePayOutID.payOutID.name', data['employeePayOutID.payOutID.name'])
          })
        }
      })
    }
  }
}

function onPayGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (context.field === 'employeeNumberID.description') {
    if (context.originalValue !== context.value) {
      if (context.grid.getData().filter(o => o.employeeNumberID === context.record.get('employeeNumberID')).length > 1) {
        $App.dialogError(UB.i18n(`Працівник "{0}" вже доданий в поточну платіжну відомість!`, context.record.get('employeeNumberID.description')), 'Помилка!')
        context.store.remove(context.record)
      } else {
        if (_.includes([null, ''], context.record.get('paySum'))) {
          context.record.set('paySum', 0)
        }
        const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
        const idx = allRecord.items.findIndex(o => o.internalId === context.record.internalId)
        me.calc(me, false, [Object.assign(context.record.getData(), { idx })])
      }
    }
  } else {
    if (ctrl.flagsFix) {
      if (context.value === null) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
      } else {
        if (context.column.field.prevValue !== context.value) {
          context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
        }
      }
    }
    if (!context.value) { context.record.set(context.field, 0) }
    if (context.value > context.record.get('paySum')) { context.record.set(context.field, context.record.get('paySum')) }
    switch (context.field) {
      case 'paySum':
        if (context.value !== context.originalValue) {
          context.record.set('baseSum', context.value)
          const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
          const idx = allRecord.items.findIndex(o => o.internalId === context.record.internalId)
          context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 21))
          me.calc(me, false, [Object.assign(context.record.getData(), { idx })])
        }
        break
      case 'paidSum':
        if (!(context.record.get('flagsFix') & 1 << 15)) {
          context.record.set('depSum', ((context.record.get('paySum') || 0) - context.value) > 0 ? ((context.record.get('paySum') || 0) - context.value) : 0)
        }
        break
      case 'depSum':
        if (!(context.record.get('flagsFix') & 1 << 16)) {
          context.record.set('paidSum', ((context.record.get('paySum') || 0) - context.value) > 0 ? ((context.record.get('paySum') || 0) - context.value) : 0)
        }
        break
    }
  }
}

function selectOrderRegistry (me, reload) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_payCalcOrderList',
    isModal: true,
    cmpInitConfig: {
      payRollID: me.record.get('ID'),
      orgID: me.record.get('organizationID'),
      isPosted: false,
      defaultValues: {
        periodID: me.record.get('periodCalcID'),
        isPayOut: false
      },
      onSelect: (data) => {
        const addOrderRegistry = []
        const store = me.attr.payRollPerm.getStore()
        const allRecords = me.attr.payRollPerm.getStore().data.items
        if (data.length) { me.attr.payOrder.removeAll() }
        data.forEach(row => {
          const orderRegistry = allRecords.filter(o => o.data['orderRegistryID'] === row.ID)
          if ((!reload && !orderRegistry.length) || (reload)) {
            row['payRollID'] = me.record.get('ID')
            row['orderRegistryID'] = row.ID
            row['orderRegistryID.orderDate'] = row.orderDate
            row['orderRegistryID.description'] = row.description
            row['orderRegistryID.orderNumber'] = row.orderNumber
            row['orderRegistryID.orderType'] = row.orderType
            row['orderRegistryID.periodID.name'] = row['periodID.name']
            row['orderRegistryID.lineCount'] = row.lineCount
            row['orderRegistryID.paySum'] = row.paySum ? row.paySum : 0
            row['ID'] = ''
            row['mi_modifyDate'] = ''
            addOrderRegistry.push(row)
          }
        })
        store.insert(store.data.length, addOrderRegistry)
        me.attr.payRollPerm.GridSummary.dataBind()
        me.calc(me, true)
        me.setFilterSource(me)
      }
    }
  })
}

function calc (me, reload, accruals) {
  if (!me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('неприпустиме значення поля "За період"!'), 'Помилка!')
    return
  }
  if (reload) {
    me.attr.payRollDt.removeAll()
    me.attr.payOrder.removeAll()
  }
  if (me.attr.payRollDt.getStore().getCount() || me.attr.payRollPerm.getStore().getCount()) {
    me.setLoading(true)
    const store = me.attr.payRollDt.getStore()
    const localData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`) || '{}')

    const allData = me.attr.payRollPerm.getStore().data
    const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
    const params = {
      orgID: me.record.get('organizationID'),
      dictMultiGroupID: me.record.get('dictMultiGroupID'),
      includeSubDepGroup: me.attr.includeSubDepGroup.getValue(),
      depID: me.record.get('departmentID'),
      includeSubDep: me.attr.includeSubDep.getValue(),
      orderRegistry: [],
      periodCalcID: me.record.get('periodCalcID'),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      payElID: me.attr.payElID.getValue(),
      payOutID: me.attr.payOutID.getValue(),
      orderID: me.instanceID,
      orderDate: me.attr.orderDate.getValue(),
      paymentMethod: me.record.get('paymentMethod'),
      applyRetention: me.attr.applyRetention.getValue(),
      applyAddRetention: me.attr.applyAddRetention.getValue(),
      applyBalance: me.attr.applyBalance.getValue(),
      rate: me.attr.percentPay.getValue() || 100,
      dictFundSourceList: localData.isFilter ? me.attr.dictFundSourceList.getValue() : null,
      dictProgClassList: localData.isFilter ? me.attr.dictProgClassList.getValue() : null,
      dictProjectList: localData.isFilter ? me.attr.dictProjectList.getValue() : null,
      accruals: []
    }
    if (accruals) {
      params.employeeNumbers = accruals.map(o => o.employeeNumberID)
    }
    if (!reload) {
      if (accruals) {
        params.accruals = accruals
      } else {
        allRecord.items.forEach((row, idx) => {
          params.accruals.push(Object.assign(row.getData(), { idx: idx }))
        })
      }
    }
    allData.items.forEach((row, idx) => {
      params.orderRegistry.push(Object.assign(row.getData(), { idx: idx }))
    })
    $App.connection.run({
      entity: 'hr_payRoll',
      method: 'calcPayWithinPeriod',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      if (reload || data.accruals.length > 1) {
        Ext.suspendLayouts()
        me.attr.payRollDt.suspendEvents()
        store.suspendEvents()
      }
      if (reload) {
        for (let i = data.accruals.length - 1; i >= 0; i--) {
          if (data.accruals[i].remove) {
            data.accruals.splice(i, 1)
          } else {
            data.accruals[i].payRolID = me.instanceID
          }
        }
        store.insert(store.data.length, data.accruals)
        me.setPayOrder(me, data.accruals)
      } else {
        const updateAttrNames = ['docSum', 'deltaSum', 'baseSum', 'taxSum', 'paySum', 'planPaySum', 'paidSum', 'depSum', 'reason', 'payRetentionID',
          'employeePayOutID', 'periodCalc', 'periodSalary', 'periodCalcID', 'periodSalaryID', 'dateFrom', 'dateTo', 'dopTaxSum',
          'mask', 'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
          'basePayment', 'accrualDt', 'paymentDt', 'payOutID', 'payOutID.name', 'payRetentionID.payOutID.name', 'employeePayOutID.payOutID.name'
        ]
        data.accruals.forEach(accr => {
          const record = allRecord.getAt(accr.idx)
          if (record) {
            const priorPaySum = record.get('paySum')
            updateAttrNames.forEach(attrName => {
              record.set(attrName, accr.hasOwnProperty(attrName) ? accr[attrName] : null)
            })
            if (accr.flagsFix & 1 << 3 && !(accr.flagsFix & 1 << 21) && priorPaySum > accr.paySum) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Працівник {0} буде мати борг на кінець місяця! Залишок {0}. Зменьшити суму виплати?', record.get('employeeNumberID.description'), accr.paySum))
                .then(res => {
                  if (res) {
                    record.set('flagsFix', record.get('flagsFix') | 1 << 21)
                  } else {
                    record.set('flagsFix', record.get('flagsFix') | 1 << 21)
                    record.set('paySum', priorPaySum)
                  }
                  me.calc(me, false, [Object.assign(record.getData(), { idx: accr.idx })])
                })
            }
          } else {
            store.insert(store.data.length, accr)
          }
        })
        me.setPayOrder(me, me.attr.payRollDt.getData())
      }
      if (!me.attr.percentPay.getValue()) {
        me.attr.percentPay.setValue(100)
      }
      me.attr.payRollDt.GridSummary.dataBind()
      if (reload || data.accruals.length > 1) {
        me.viewMark(me)
        me.attr.payRollDt.resumeEvents()
        store.resumeEvents()
        Ext.resumeLayouts(true)
        me.attr.payRollDt.getView().refreshView()
      }
      me.setLoading(false)
      me.setIsDirty(true)
    }, (err) => {
      me.setLoading(false)
      throw err
    })
  } else {
    me.attr.payRollDt.GridSummary.dataBind()
  }
}
function setPayOrder (me, data) {
  const payOrderStore = me.attr.payOrder.getStore()
  me.attr.payOrder.suspendEvents()
  payOrderStore.suspendEvents()
  me.attr.payOrder.removeAll()
  const paymentOrder = []
  data.forEach(accr => {
    if (accr.paymentDt) {
      JSON.parse(accr.paymentDt).forEach(paymentDt => {
        const payOrder = paymentOrder.find(o => o.payObligatoryID === paymentDt.payObligatoryID && o.contrAccountID === paymentDt.contrAccountID &&
          (!me.settings.isPayOut || (o['payOutID.name'] === (accr['payOutID.name'] || accr['payRetentionID.payOutID.name'] || accr['employeePayOutID.payOutID.name']))))
        if (payOrder) {
          payOrder.paySum = AC.currencyService.round(payOrder.paySum + paymentDt.paySum, 2)
          payOrder.paymentOrderAccDt.push(...paymentDt.paymentOrderAccDt)
          paymentDt.paymentOrderDt.forEach(payDt => {
            payOrder.paymentOrderDt.push(payDt)
          })
        } else {
          paymentOrder.push(Object.assign(me.settings.isPayOut ? { 'payOutID.name': (accr['payOutID.name'] || accr['payRetentionID.payOutID.name'] || accr['employeePayOutID.payOutID.name']) } : {}, paymentDt))
        }
      })
    }
  })
  paymentOrder.forEach(paymentDt => {
    paymentDt.paymentOrderAccDt = HR.accrualService.calcGroupSumAccrualPaymentDt(paymentDt.paymentOrderAccDt, paymentDt.paySum)
  })
  payOrderStore.insert(payOrderStore.length, paymentOrder)
  me.attr.payOrder.GridSummary.dataBind()
  payOrderStore.resumeEvents()
  me.attr.payOrder.resumeEvents()
  me.attr.payOrder.getView().refreshView()
}

function showPaymentOrder (me, record) {
  const paymentOrderDts = record.get('paymentOrderDt')
  if (typeof paymentOrderDts === 'object') {
    const employeeNumbers = paymentOrderDts.map(o => o.employeeNumberID)
    UB.Repository('hr_employeeNumberSR')
      .attrs('ID', 'posName', 'depName')
      .where('ID', 'in', employeeNumbers.length ? employeeNumbers : [0])
      .selectAsObject().then(responses => {
        paymentOrderDts.forEach(paymentOrderDt => {
          responses.forEach(response => {
            if (paymentOrderDt.employeeNumberID === response.ID) {
              paymentOrderDt.posName = response.posName
              paymentOrderDt.depName = response.depName
            }
          })
        })
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_paymentOrder',
          isModal: true,
          cmpInitConfig: {
            readOnlyAttr: ['payer'],
            defaultValues: {
              payObligatoryID: record.get('payObligatoryID'),
              payObligatoryName: record.get('payObligatoryID.name'),
              payer: record.get('payObligatoryID.orgName'),
              contractor: record.get('contrAccountID.organizationID.name'),
              contrAccount: record.get('contrAccountID.description'),
              paySum: record.get('paySum'),
              payRollName: me.record.get('description'),
              payRollDate: record.get('postedDate'),
              paymentOrderDt: paymentOrderDts,
              orderState: me.record.get('orderState')
            }
          }
        })
      })
  }
}

async function getPrintDocument (me, reportCode, instanceID, type) {
  me.setLoading(false)
  const isSaved = await me.saveForm()

  if (isSaved === -1) {
    return
  }
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'docPrintForm',
    params: {
      instanceID,
      reportCode,
      type,
      signerCode: 'PAYROLLWITHINBANK'
    }
  }).then(function (result) {
    if (result.doc) {
      switch (type) {
        case 'pdf':
          const report = Ext.create('UBS.UBReport', {
            code: reportCode,
            type: 'html',
            params: JSON.parse(result.doc)
          })

          report.init().then(function () {
            report.hiddenActions = ['actionPDF']
            const config = {
              cmdType: 'showForm',
              formCode: 'ac_documentViewer',
              caption: UB.i18n('Друкована форма'),
              cmpInitConfig: { report, settingsPanel: (reportCode === 'hr_payRollBank_1'), reportCode: 'hr_payRollBank_1' },
              tabId: 'printDocument' + reportCode + me.instanceID,
              description: me.initialConfig.commandConfig.description,
              target: $App.getViewport().centralPanel
            }
            $App.doCommand(config)
          })
          break
        case 'docx':
          const doc = JSON.parse(result.doc)
          const fileContent = JSON.parse(doc.fileContent)
          const contentLength = fileContent.length
          const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
          const filename = doc.fileName + '.docx'
          for (let i = 0; i < contentLength; i++) {
            pdfArray[i] = fileContent.charCodeAt(i)
          }
          const dBlob = new Blob([pdfArray], { type: 'application/msword' })
          saveAs(dBlob, filename)
          break
      }
    }
  }).then(function () {
    me.setLoading(false)
  })
}

function viewMark (me) {
  const store = me.attr.payRollDt.getStore()
  if (store.sorters.items.length) {
    store.sorters.removeAll()
  }
  store.filters.removeAtKey('viewReason ')

  store.addFilter({
    id: 'viewReason ',
    filterFn: (row) => {
      return (me.viewReason ? (row.get('reason').includes('1') || row.get('reason').includes('2') || row.get('reason').includes('3') || row.get('reason').includes('4'))
        : row.get('reason').includes('0'))
    }
  })

  if (store.filters.length) {
    store.filter()
  } else {
    store.clearFilter()
  }
  me.attr.payRollDt.GridSummary.dataBind()
}

function exportXLSX (me) {
  const gridData = me.attr.payRollDt.getStore().data.items
  const viewData = []
  gridData.forEach(row => {
    const record = row.getData()
    viewData.push({
      employee: record['employeeNumberID.description'],
      docSum: record['docSum'],
      baseSum: record['baseSum'],
      planPaySum: record['planPaySum'],
      taxSum: record['taxSum'],
      dopTaxSum: record['dopTaxSum'],
      paySum: record['paySum'],
      payOutName: record['payOutID.name'] || record['payRetentionID.payOutID.name'] || record['employeePayOutID.payOutID.name'],
      depName: record['depName'],
      posName: record['posName']
    })
  })
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'generateXLSX',
    viewData: JSON.stringify(viewData),
    exportFrom: 'hr_payRollWithinBank'
  }).then(response => {
    const data = JSON.parse(response.data)
    AC.filesService.saveAsByBase64Buffer(data, `${me.attr.payElID.getFieldValue('description')} ${me.record.get('description')}` + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    me.setLoading(false)
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}

function setEmployeeNumbers (me) {
  if (!me.attr.payElID.getValue() || !me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('неприпустиме значення полів! Поля "За період" та "Вид оплати" повинні бути заповнені'), 'Помилка!')
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('organizationID'),
      readOnlyAttr: ['periodID'],
      defaultValues: {
        periodID: me.record.get('periodSalaryID'),
        depID: me.record.get('departmentID'),
        childDep: me.record.get('includeSubDep'),
        dictMultiGroup: me.record.get('dictMultiGroupID'),
        childDictMultiGroup: me.record.get('includeSubDepGroup')
      },
      onSelect: (data) => {
        let addEmployeeNumbers = []
        const store = me.attr.payRollDt.getStore()
        const allRecords = store.snapshot || store.data
        const existEmployeeNumbers = []
        const bind = () => {
          me.attr.payRollDt.getStore().un('add', bind)
          me.attr.payRollDt.GridSummary.dataBind()
          me.calc(me, false, addEmployeeNumbers)
        }
        let idx = allRecords.getCount()
        data.forEach(row => {
          if (!allRecords.findBy(o => o.get('employeeNumberID') === row.employeeNumberID)) {
            addEmployeeNumbers.push({
              employeeNumberID: row.employeeNumberID,
              'employeeNumberID.description': row['employeeNumberID.description'],
              'employeeNumberID.dateTo': row['employeeNumberID.dateTo'],
              depName: row.depCaption,
              posName: row.posName,
              idx: idx++
            })
          } else {
            existEmployeeNumbers.push(row['employeeNumberID.description'])
          }
        })
        if (addEmployeeNumbers.length) {
          $App.connection.run({
            entity: 'hr_payRoll',
            method: 'getPayOutByEmployee',
            employeeNumbers: JSON.stringify(addEmployeeNumbers),
            orgID: me.record.get('organizationID'),
            payElID: me.attr.payElID.getValue(),
            paymentMethod: me.record.get('paymentMethod')
          }).then(response => {
            addEmployeeNumbers = JSON.parse(response.resultData)
            me.attr.payRollDt.getStore().on('add', bind)
            me.attr.payRollDt.getStore().insert(allRecords.getCount(), addEmployeeNumbers)
          })
        }
        if (existEmployeeNumbers.length) {
          $App.dialogInfo(UB.i18n(`Працівники які вже були додані раніше </br> {0}`, existEmployeeNumbers.join('</br>')))
        }
      }

    }
  })
}

function saveFilterValue (me) {
  UB.core.UBLocalStorageManager.setItem(`hr_payRollWithinBank_${appAC.globalOrganization()}`, {
    dictFundSourceList: me.attr.dictFundSourceList.getValue(),
    dictProgClassList: me.attr.dictProgClassList.getValue(),
    dictProjectList: me.attr.dictProjectList.getValue(),
    isFilter: me.isFilter
  })
}

function transferToPayOut (me, record) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_payRollPayOut',
    entity: 'hr_payRoll',
    cmpInitConfig: {
      employeeNumberID: record.get('employeeNumberID'),
      paySum: record.get('paySum') || 0,
      employeePayOutID: record.get('employeePayOutID'),
      dateFrom: AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom')),
      dateTo: AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateTo')),
      onSave: (data) => {
        me.setIsDirty(true)
        if (record.get('paySum') === data.paySum) {
          record.set('employeePayOutID.payOutID.name', data['employeePayOutID.payOutID.name'])
          record.set('employeePayOutID', data.employeePayOutID)
          record.set('payRetentionID.payOutID.name', null)
          record.set('payRetentionID', null)
          record.set('payOutID.name', null)
          record.set('payOutID', null)
        } else {
          const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
          const idx = allRecord.items.findIndex(o => o.internalId === record.internalId)
          const newRow = record.getData()
          const koef = data.paySum / record.get('paySum')
          newRow['employeePayOutID.payOutID.name'] = data['employeePayOutID.payOutID.name']
          newRow.employeePayOutID = data.employeePayOutID
          newRow.paySum = data.paySum
          newRow.ID = null
          newRow['payRetentionID.payOutID.name'] = null
          newRow.payRetentionID = null
          newRow['payOutID.name'] = null
          newRow.payOutID = null
          newRow.dopTaxSum = AC.currencyService.round((record.get('dopTaxSum') || 0) * koef)
          record.set('dopTaxSum', record.get('dopTaxSum') - newRow.dopTaxSum)
          newRow.baseSum = AC.currencyService.round((record.get('baseSum') || 0) * koef)
          record.set('baseSum', record.get('baseSum') - newRow.baseSum)
          newRow.taxSum = AC.currencyService.round((record.get('taxSum') || 0) * koef)
          record.set('taxSum', record.get('taxSum') - newRow.taxSum)
          newRow.planPaySum = AC.currencyService.round((record.get('planPaySum') || 0) * koef)
          record.set('planPaySum', record.get('planPaySum') - newRow.planPaySum)
          const paySym = AC.currencyService.round(record.get('paySum') - data.paySum)
          newRow.accrualDt = []
          const accrualDt = JSON.parse(record.get('accrualDt'))
          let paySumDt = 0
          accrualDt.forEach((aDt, idx) => {
            const newaDt = Object.assign({}, aDt)
            newaDt.paySum = AC.currencyService.round(aDt.paySum * koef)
            paySumDt = AC.currencyService.round(paySumDt + newaDt.paySum)
            if (idx === (accrualDt.length - 1) && paySumDt !== data.paySum) {
              newaDt.paySum = AC.currencyService.round(newaDt.paySum + data.paySum - paySumDt, 2)
            }
            aDt.paySum = AC.currencyService.round(aDt.paySum - newaDt.paySum)
            newRow.accrualDt.push(newaDt)
          })
          newRow.accrualDt = JSON.stringify(newRow.accrualDt)
          record.set('accrualDt', JSON.stringify(accrualDt))
          newRow.paymentDt = []
          const paymentDt = JSON.parse(record.get('paymentDt') || '[]')
          paymentDt.forEach(pDt => {
            const newpDt = Object.assign({}, pDt)
            delete newpDt.paymentOrderAccDt
            delete newpDt.paymentOrderDt
            newpDt.paySum = AC.currencyService.round(pDt.paySum * koef)
            pDt.paySum -= newpDt.paySum
            newpDt.paymentOrderAccDt = HR.accrualService.correctAccrualDt(pDt.paymentOrderAccDt || [], newpDt.paySum)
            pDt.paymentOrderAccDt = HR.accrualService.correctAccrualDt(pDt.paymentOrderAccDt || [], pDt.paySum)
            newpDt.paymentOrderDt = []
            if (pDt.paymentOrderDt) {
              pDt.paymentOrderDt.forEach(poDt => {
                const newpoDt = Object.assign({}, poDt)
                newpoDt.paySum = AC.currencyService.round(poDt.paySum * koef)
                poDt.paySum -= newpoDt.paySum
                newpDt.paymentOrderDt.push(newpoDt)
              })
            }
            newRow.paymentDt.push(newpDt)
          })
          newRow.paymentDt = JSON.stringify(newRow.paymentDt)
          record.set('paymentDt', JSON.stringify(paymentDt))

          newRow.flagsFix = 1 << 1 | 1 << 22
          record.set('paySum', paySym)
          record.set('flagsFix', (record.get('flagsFix') | 1 << 1) | 1 << 22)
          me.attr.payRollDt.getStore().insert(idx + 1, newRow)
          me.setPayOrder(me, me.attr.payRollDt.getData())
        }
      }
    }
  })
}
