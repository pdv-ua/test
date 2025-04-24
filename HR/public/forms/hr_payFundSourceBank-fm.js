/* global HR AC $App _ appAC appHR Ext saveAs Blob UB  */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  addBaseActions,
  postInit,
  beforePosting,
  onFormDataReady,
  onControlChanged,
  onAddNewByCurrent,
  onAfterOrderSave,
  beforeGridEdit,
  viewMark,
  setEmployeeList,
  onGridEdit,
  calc,
  setCalcData,
  showPaymentOrder,
  getPrintDocument,
  exportXLSX,
  setPayOrder,
  onPrepareDataBeforeSaveOrder,
  transferToPayOut
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    customPrepareDataBeforeSaveOrder: true,
    detailGrids: ['payRollDt', 'payOrder'],
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
  params.formData = JSON.stringify(formData)
}

function initOrderComponentDone () {
  const me = this
  me.attr.payRollDt.on('changeChecked', () => {
    me.down('[name=delBtn]').setDisabled(me.attr.payRollDt.getCheckedRow().length === 0 || me.record.get('orderState') === 'POSTED')
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
      const localStorageData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_payFundSourceBank_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`) || '{}')
      me.isFilter = !me.isFilter
      if (me.record.get('orderState') === 'PROJECT') {
        if (!localStorageData) {
          UB.core.UBLocalStorageManager.setItem(`hr_payFundSourceBank_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`, {
            isFilter: me.isFilter
          })
        } else {
          UB.core.UBLocalStorageManager.setItem(`hr_payFundSourceBank_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`, {
            isFilter: me.isFilter
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
  me.setLoading(true)
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
  me.setLoading(false)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
      if (!me.defaultValues.description) {
        setDescription(me)
      }
    })
  }
  const localData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_payFundSourceBank_${me.record.get('payElID.methodID.code')}_${appAC.globalOrganization()}`) || '{}')
  if (me.isNewInstance) {
    me.isFilter = localData.isFilter
    localData ? me.down('[name=filterPanel]')[localData.isFilter ? 'show' : 'hide']() : me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
    localData && localData.isFilter && me.down('[name=filterButton]').addCls(localData.isFilter ? 'custom-action_btn' : '')
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

  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodSalarySelectID, { orgID: me.record.get('organizationID') })
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
  appHR.getPayOutList(me.record.get('organizationID')).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  AC.viewUtils.setFilterValue(me.attr.dictMultiGroupID, { orgID: me.record.get('organizationID') })
  me.attr.payRollDt.down('[name=delBtn]').setDisabled(true)
  me.actions.printAction.setDisabled(me.isNewInstance)
  me.setActionDisabled('fDelete', true)
  if (me.isNewInstance) {
    me.attr.applyRetention.setValue(true)
    // me.attr.periodSalarySelectID.setValueById(me.record.get('periodCalcID'))
  }
  if (me.record.get('orderState') === 'POSTED') {
    const attrNames = ['orderNumber', 'orderDate', 'description', 'payOutID']
    attrNames.forEach(attrName => {
      if (!me.record.get(attrName)) {
        me.attr[attrName].setReadOnly(false)
      }
    })
    if (me.attr.departmentID.getValue() || me.attr.dictMultiGroupID.getValue()) {
      me.down('[name=filterPanel]').show()
      me.down('[name=filterButton]').addCls('custom-action_btn')
    }
  }
  me.attr.applyRetention.setReadOnly(true)
  const payOutBtn = me.down('[name=payOutBtn]')
  payOutBtn.addCls(!me.settings.isPayOut ? 'blue-action' : 'green-action')
  payOutBtn.removeCls(me.settings.isPayOut ? 'blue-action' : 'green-action')
  if (['75'].includes(me.record.get('payElID.methodID.code'))) {
    AC.gridUtils.setGridColumnVisible(me.attr.payRollDt, ['payRetentionID.contrAccountID.organizationID.description'], false)
  }
  me.attr.includeSubDep.setReadOnly(!me.record.get('departmentID'))
  me.attr.includeSubDepGroup.setReadOnly(!me.record.get('dictMultiGroupID'))
  if (me.record.get('departmentID')) {
    AC.viewUtils.setWhereListProperty(me.attr.dictSigners, [
      ['departmentID', '=', me.record.get('departmentID')]
    ])
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
    case 'payElID':
      if (value) {
        const store = me.attr.payRollDt.getStore()
        const allRecords = store.snapshot || store.data
        allRecords.each(record => {
          record.set('payElID', value)
          record.set('payElID.description', field.getFieldValue('description'))
        })
        me.setLoading(true)
        me.attr.payRollDt.removeAll()
        me.attr.payOrder.removeAll()
        if (['75'].includes(field.getFieldValue('methodID.code'))) {
          AC.gridUtils.setGridColumnVisible(me.attr.payRollDt, ['payRetentionID.contrAccountID.organizationID.description'], false)
        }
        me.setLoading(false)
        setDescription(me)
      }
      break
    case 'departmentID':
    {
      me.setLoading(true)
      me.attr.includeSubDep.setValue(false)
      me.attr.includeSubDep.setReadOnly(!value)
      if (value) {
        me.attr.dictMultiGroupID.setValueById(null)
      }
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
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
      me.setLoading(false)
      setDescription(me)
      break
    }
    case 'dictMultiGroupID': {
      me.attr.includeSubDepGroup.setValue(false)
      me.attr.includeSubDepGroup.setReadOnly(!value)
      if (value) {
        me.attr.departmentID.setValueById(null)
      }
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      setDescription(me)
      break
    }
    case 'periodSalaryID':
    case 'includeSubDepGroup':
    case 'includeSubDep': {
      me.setLoading(true)
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      setDescription(me)
      me.setLoading(false)
    }
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

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.setLoading(true)
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt, false, true)
    me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder, false, true)
    me.viewMark(me)
    me.setLoading(false)
  }
}

function beforeGridEdit (me, gridName, context) {
}

function onGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (ctrl.flagsFix) {
    if (context.value === null) {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    } else {
      if (context.column.field.prevValue !== context.value) {
        context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
      }
    }
  }
  if (context.field === 'paySum' && context.value !== context.originalValue) {
    context.record.set('reason', (context.record.get('paySum') > 0) ? '0' : '1')
    const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
    const idx = allRecord.items.findIndex(o => o.internalId === context.record.internalId)
    me.calc(me, false, [Object.assign(context.record.getData(), { idx })])
  }
}
function viewMark (me) {
  const store = me.attr.payRollDt.getStore()
  if (store.sorters.items.length) {
    store.sorters.removeAll()
  }
  store.clearFilter()
  store.filter((row) => {
    return (row.get('employeeNumberID.description').toUpperCase().includes(me.attr.searchBox.getValue().toUpperCase()) ||
      (row.get('depName') && row.get('depName').toUpperCase().includes(me.attr.searchBox.getValue().toUpperCase())) ||
      (row.get('posName') && row.get('posName').toUpperCase().includes(me.attr.searchBox.getValue().toUpperCase()))) &&
      (me.viewReason ? (row.get('reason').includes('1') || row.get('reason').includes('2') || row.get('reason').includes('3') || row.get('reason').includes('4'))
        : row.get('reason').includes('0'))
  })
  me.attr.payRollDt.GridSummary.dataBind()
}

function setEmployeeList (me) {
  if (!me.attr.payElID.getValue() || !me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('неприпустиме значення полів! Поля "За період" та "Вид оплати" повинні бути заповнені'), 'Помилка!')
    return
  }
  const count = me.attr.payRollDt.getStore().snapshot ? me.attr.payRollDt.getStore().snapshot.getCount() : me.attr.payRollDt.getStore().count()
  if (count) {
    $App.dialogYesNo('Попередження', UB.i18n('Видалити існуючі записи?'))
      .then(res => {
        if (res) {
          me.attr.payRollDt.removeAll()
          me.calc(me, true)
        }
      })
  } else {
    me.calc(me, true)
  }
}

function calc (me, reload, accruals, saveAfterCalc) {
  if (!me.attr.payElID.getValue() || !me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('неприпустиме значення полів! Поля "За період" та "Вид оплати" повинні бути заповнені'), 'Помилка!')
    return
  }
  if (!accruals || accruals.length > 1) {
    me.setLoading(true)
  }
  const allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
  const params = {
    orgID: me.record.get('organizationID'),
    dictMultiGroupID: me.record.get('dictMultiGroupID'),
    includeSubDepGroup: me.attr.includeSubDepGroup.getValue(),
    depID: me.record.get('departmentID'),
    includeSubDep: me.attr.includeSubDep.getValue(),
    reloadEmployee: reload || false,
    periodCalcID: me.record.get('periodCalcID'),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    periodSalarySelectID: me.attr.periodSalarySelectID.getValue(),
    payElID: me.attr.payElID.getValue(),
    payOutID: me.attr.payOutID.getValue(),
    orderDate: me.attr.orderDate.getValue(),
    orderID: me.instanceID,
    paymentMethod: '1',
    applyRetention: me.attr.applyRetention.getValue(),
    accruals: [],
    employeeOut: []
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
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'calcFundSourceBank',
    instanceID: me.instanceID,
    params: JSON.stringify(params)
  }).then(response => {
    const data = JSON.parse(response.resultData)
    me.setCalcData(me, data, allRecord, reload, saveAfterCalc)
  }, (err) => {
    if (err.config && err.config.timeout) {
      let countAttempt = 1
      let timerId = setTimeout(setCalc, 120000)
      function setCalc () {
        if (countAttempt > 30) {
          clearTimeout(timerId)
          me.setLoading(false)
        } else {
          countAttempt++
          UB.Repository('ac_entityJsonData')
            .attrs(['isActual', 'entityData'])
            .selectById(me.instanceID).then(rersp => {
              if (rersp && rersp.isActual && rersp.entityData) {
                clearTimeout(timerId)
                $App.connection.getDocument({
                  entity: 'ac_entityJsonData',
                  attribute: 'entityData',
                  ID: me.instanceID
                }, { resultIsBinary: false, encoding: 'utf8' })
                  .then(data => {
                    me.setCalcData(me, data, allRecord, reload, saveAfterCalc)
                  }, (errData) => {
                    me.setLoading(false)
                    throw errData
                  })
              } else {
                timerId = setTimeout(setCalc, 120000)
              }
            }, (errS) => {
              timerId = setTimeout(setCalc, 120000)
              throw errS
            })
        }
      }
    } else {
      me.setLoading(false)
      throw err
    }
  })
}
function setCalcData (me, data, allRecord, reload, saveAfterCalc) {
  const store = me.attr.payRollDt.getStore()
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
    const updateAttrNames = ['docSum', 'deltaSum', 'baseSum', 'taxSum', 'paySum', 'planPaySum', 'reason', 'payRetentionID',
      'employeePayOutID', 'periodCalc', 'periodSalary', 'periodCalcID', 'periodSalaryID', 'dateFrom', 'dateTo',
      'mask', 'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
      'basePayment', 'accrualDt', 'paymentDt', 'baseSumAll', 'taxSumAll', 'rollSumAll', 'payOutID', 'payOutID.name',
      'payRetentionID.payOutID.name', 'employeePayOutID.payOutID.name'
    ]
    data.accruals.forEach(accr => {
      const record = allRecord.getAt(accr.idx)
      if (accr.remove) {
        me.attr.payRollDt.getStore().remove(record)
      } else {
        updateAttrNames.forEach(attrName => {
          record.set(attrName, accr.hasOwnProperty(attrName) ? accr[attrName] : null)
        })
        if (data.accruals.length === 1 && record.get('ID')) {
          const recordData = record.getData()
          Object.keys(recordData).forEach(function (name) {
            if ((name.indexOf('.') + 1) || name === 'isChecked') {
              delete recordData[name]
            } else if (recordData[name] === '') {
              recordData[name] = null
            }
          })
          delete recordData.id
          $App.connection.run({
            entity: 'hr_payRollDt',
            method: 'update',
            execParams: recordData
          })
        }
      }
    })
    me.setPayOrder(me, me.attr.payRollDt.getData())
  }
  me.setIsDirty(true)
  if (reload || data.accruals.length > 1) {
    me.viewMark(me)
    me.attr.payRollDt.resumeEvents()
    store.resumeEvents()
    Ext.resumeLayouts(true)
    me.attr.payRollDt.getView().refreshView()
  }
  me.setLoading(false)
  if (data.employeeOut.length) {
    $App.dialogInfo(UB.i18n(`Працівники, у яких не визначено способу виплати зарплати: </br> {0}`, data.employeeOut.join('</br>')))
  }
  if (saveAfterCalc) {
    me.saveForm()
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
      signerCode: 'PAYFUNDSOURCEBANK'
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

function exportXLSX (me) {
  const gridData = me.attr.payRollDt.getStore().data.items
  const viewData = []
  gridData.forEach(row => {
    const record = row.getData()
    viewData.push({
      employee: record['employeeNumberID.description'],
      baseSumAll: record['baseSumAll'],
      taxSumAll: record['taxSumAll'],
      rollSumAll: record['rollSumAll'],
      baseSum: record['baseSum'],
      taxSum: record['taxSum'],
      planPaySum: record['planPaySum'],
      paySum: record['paySum'],
      contractor: record['payRetentionID.contrAccountID.organizationID.description'],
      posName: record['posName'],
      depName: record['depName'],
      reason: record['rendered_reason']
    })
  })
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'generateXLSX',
    viewData: JSON.stringify(viewData),
    exportFrom: 'hr_payFundSourceBank'
  }).then(response => {
    const data = JSON.parse(response.data)
    AC.filesService.saveAsByBase64Buffer(data, `${me.attr.payElID.getFieldValue('description')} ${me.record.get('description')}` + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    me.setLoading(false)
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}

function transferToPayOut (me, record) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_payRollPayOut',
    entity: 'hr_payRoll',
    cmpInitConfig: {
      employeeNumberID: record.get('employeeNumberID'),
      paySum: record.get('paySum'),
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
