/* global HR AC UB $App _ appAC appHR Ext Blob */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  postInit,
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
  onPrepareDataBeforeSaveOrder
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
    if (action === 'delete') calc(me)
  })
  me.down('[name=percentPay]').on('blur', changeParams)
  me.down('[name=percentPay]').on('keypress', onKeypress)
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  me.calc(me)
}

function onKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    const me = ctrl.up('form')
    me.calc(me)
  }
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
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
          getPrintDocument(me, me.instanceID, 'pdf')
        }
      },
      {
        text: UB.i18n('Платіжна відомість. Типова форма № 53 (word)'),
        handler: function () {
          getPrintDocument(me, me.instanceID, 'docx')
        }
      }
    ]
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
  } else if (data.method !== 'addnew') {
    me.attr.payRollDt.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.payOrder.length')) {
    me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder)
    me.attr.payOrder.getStore().data.payOrderItems = []
    me.attr.payOrder.getStore().data.payOrderItems = me.attr.payOrder.getStore().data.items.slice()
  } else {
    me.attr.payOrder.getStore().removeAll()
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.code': [128, 129] })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
  me.actions.printAction.setDisabled(me.isNewInstance)
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
    me.attr.payRollPerm.setLocalStoreData(me.formData.detail.payRollPerm, false, true)
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt, false, true)
    me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder, false, true)
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'periodSalaryID': {
      me.attr.payRollPerm.removeAll()
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      break
    }
    case 'percentPay':
      break
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
        $App.dialogError(UB.i18n(`Документ нарахування № {0} вже доданий в платіжну відомість № {1}`, context.record.get('orderRegistryID.orderNumber'), res['payRollID.orderNumber']), 'Помилка!')
        context.store.remove(context.record)
      } else {
        calc(me)
      }
    })
}

function beforePayGridEdit (me, gridName, context) {
  if (context.column.dataIndex === 'employeeNumberID.description') {
    if (!me.attr.periodSalaryID.getValue()) {
      $App.dialogError(UB.i18n('неприпустиме значення поля "За період"!'), 'Помилка!')
    } else {
      const orderDate = me.record.get('orderDate')
      AC.viewUtils.setFilterValue(context.column.field, {
        organizationID: me.record.get('organizationID'),
        dateFrom: { value: orderDate, condition: '<=' },
        dateTo: { value: orderDate, condition: '>=' }
      })
      AC.viewUtils.setValueOnChange(context.column.field,
        {
          'employeeNumberID': 'employeeNumberID',
          'depName': 'depName',
          'posName': 'posName'
        },
        context.record,
        ['clearValue']
      )
    }
  }
}

function onPayGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (context.field === 'employeeNumberID.description') {
    if (context.grid.getData().filter(o => o.employeeNumberID === context.record.get('employeeNumberID')).length > 1) {
      $App.dialogError(UB.i18n(`Працівник "{0}" вже доданий в поточну платіжну відомість!`, context.record.get('employeeNumberID.description')), 'Помилка!')
      context.store.remove(context.record)
    } else {
      if (_.includes([null, ''], context.record.get('paySum'))) {
        context.record.set('paySum', 0)
      }
    }
  } else {
    if (ctrl.flagsFix) {
      if (context.value === null) {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
      } else {
        if (context.originalValue !== context.value) {
          context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
        }
      }
    }
    if (!context.value) { context.record.set(context.field, 0) }
    if (context.value > context.record.get('paySum')) { context.record.set(context.field, context.record.get('paySum')) }
    switch (context.field) {
      case 'paySum':
        if (context.value !== context.originalValue) {
          me.calc(me)
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
    me.attr.payRollDt.GridSummary.dataBind()
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
      // readOnlyAttr: ['periodID', 'isPayOut'],
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
        me.calc(me)
      }
    }
  })
}

function calc (me) {
  if (!me.attr.periodSalaryID.getValue()) {
    $App.dialogError(UB.i18n('неприпустиме значення поля "За період"!'), 'Помилка!')
    return
  }
  if (me.attr.payRollDt.getStore().getCount() || me.attr.payRollPerm.getStore().getCount()) {
    me.setLoading(true)
    const store = me.attr.payRollDt.getStore()
    const allData = me.attr.payRollPerm.getStore().data
    me.attr.payOrder.removeAll()
    const params = {
      orgID: me.record.get('organizationID'),
      depID: me.record.get('departmentID'),
      orderRegistry: [],
      periodCalcID: me.record.get('periodCalcID'),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      payElID: me.attr.payElID.getValue(),
      orderID: me.instanceID,
      orderDate: me.attr.orderDate.getValue(),
      paymentMethod: me.record.get('paymentMethod'),
      applyRetention: me.attr.applyRetention.checked,
      rate: me.attr.percentPay.getValue() || 100,
      accruals: []
    }
    allData.items.forEach((row, idx) => {
      params.orderRegistry.push(Object.assign(row.getData(), { idx: idx }))
    })
    store.data.items.forEach((row, idx) => {
      if (row.getData().flagsFix & 2) {
        params.accruals.push(Object.assign(row.getData(), { idx: idx, docSum: 0, baseSum: row.getData().paySum }))
      }
    })
    $App.connection.run({
      entity: 'hr_payRoll',
      method: 'calcPayWithinPeriod',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const allRec = store.data.items
      const employeeList = data.accruals.map(o => o.employeeNumberID)
      const delRec = []
      allRec.forEach(row => {
        if (!employeeList.includes(row.get('employeeNumberID')) && !(row.get('flagsFix') & 2)) {
          delRec.push(row)
        }
      })
      if (delRec.length) {
        store.remove(delRec)
        store.removed = store.removed.concat(delRec.map(row => row.getData()).filter(row => row.ID))
      }
      const updateAttrNames = ['docSum', 'deltaSum', 'baseSum', 'taxSum', 'paySum', 'planPaySum', 'paidSum', 'depSum', 'reason', 'payRetentionID',
        'employeePayOutID', 'periodCalc', 'periodSalary', 'periodCalcID', 'periodSalaryID', 'dateFrom', 'dateTo',
        'mask', 'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
        'basePayment', 'accrualDt', 'paymentDt'
      ]
      data.accruals.forEach(accr => {
        const row = allRec.find(o => o.get('employeeNumberID') === accr.employeeNumberID)
        if (row) {
          updateAttrNames.forEach(attrName => {
            row.set(attrName, accr.hasOwnProperty(attrName) ? accr[attrName] : null)
          })
        } else {
          store.insert(store.data.length, accr)
        }
      })
      me.setPayOrder(me, me.attr.payRollDt.getData())
      if (!me.attr.percentPay.getValue()) {
        me.attr.percentPay.setValue(100)
      }
      me.attr.payRollDt.GridSummary.dataBind()

      me.setLoading(false)
      me.setIsDirty(true)
    }, (err) => {
      me.setLoading(false)
      throw err
    })
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
        const payOrder = paymentOrder.find(o => o.payObligatoryID === paymentDt.payObligatoryID && o.contrAccountID === paymentDt.contrAccountID)
        if (payOrder) {
          payOrder.paySum = AC.currencyService.round(payOrder.paySum + paymentDt.paySum, 2)
          payOrder.paymentOrderAccDt.push(...paymentDt.paymentOrderAccDt)
          paymentDt.paymentOrderDt.forEach(payDt => {
            payOrder.paymentOrderDt.push(payDt)
          })
        } else {
          paymentOrder.push(paymentDt)
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
        paymentOrderDt: record.get('paymentOrderDt'),
        orderState: me.record.get('orderState')
      }
    }
  })
}

async function getPrintDocument (me, instanceID, type) {
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
      type
    }
  }).then(function (result) {
    if (result.doc) {
      switch (type) {
        case 'pdf':
          const reportCode = 'payForm53'
          const report = Ext.create('UBS.UBReport', {
            code: reportCode,
            type: 'html',
            params: JSON.parse(result.doc)
          })

          report.init().then(function () {
            const config = {
              cmdType: 'showForm',
              formCode: 'ac_documentViewer',
              caption: UB.i18n('Друкована форма'),
              cmpInitConfig: { report }, //, reportData: data.reportData},
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
