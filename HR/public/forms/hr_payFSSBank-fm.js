/* global HR AC Ext UB $App _ appAC appHR Blob saveAs */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  postInit,
  beforePosting,
  onFormDataReady,
  onAfterOrderSave,
  onControlChanged,
  addBaseActions,
  beforeGridEdit,
  onGridEdit,
  beforePayGridEdit,
  onPayGridEdit,
  selectSicknessRequis,
  setEmployeeList,
  showPaymentOrder,
  setPayOrder,
  onPrepareDataBeforeSaveOrder,
  viewMark,
  exportXLSX
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['payRollSicknessRequis', 'payRollDt', 'payOrder'],
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
  formData.detail.payRollSicknessRequis = me.attr.payRollSicknessRequis.getAttributeData()
  params.formData = JSON.stringify(formData)
}

function initComponentDone () {
  const me = this
  me.down('[name=payRollSicknessRequis]').on('changeData', (grid, action) => {
    if (action === 'delete') setEmployeeList(me, true)
  })
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
  HR.accrualService.addExportAction(me)
  HR.orderManager.addOrderAction(me)
  const printAction = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    actionId: 'printAction',
    text: UB.i18n('Друкувати'),
    eventId: 'printAction',
    disabled: true,
    menu: [
      {
        text: UB.i18n('Звіт'),
        handler: function () {
          if (me.isValid()) {
            UB.Repository('ac_regReport').attrs(['ID'])
              .where('sourceID', '=', me.instanceID)
              .selectScalar()
              .then(regReportID => {
                if (regReportID) {
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: 'ac_regReport',
                    entity: 'ac_regReport',
                    tabId: `ac_regReport-${regReportID}`,
                    target: $App.getViewport().centralPanel,
                    instanceID: regReportID
                  })
                } else {
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: 'ac_regReportSelect',
                    entity: 'ac_regReportSelect',
                    isModal: true,
                    cmpInitConfig: {
                      shortcutCode: 'hr_regReportSalaryRun',
                      caption: UB.i18n('Сформувати звіт'),
                      tip: UB.i18n('Сформувати звіт'),
                      repCode: [
                        'J05001',
                        'J30004', 'J30401', 'J30402', 'J30403', 'J30404', 'J30405', 'J30406', 'J30407', 'J30408', 'J30409',
                        'S03010', 'S03011',
                        'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105', 'C11002'
                      ],
                      repGroup: ['statistical', 'taxation', 'fssu'],
                      model: 'HR',
                      defaultParams: {
                        sourceID: me.instanceID,
                        repGroup: 'fssu',
                        subCode: '002',
                        periodCode: me.attr.periodSalaryID.getFieldValue('dictMonthID.code'),
                        year: me.attr.periodSalaryID.getFieldValue('pYear'),
                        disableRepCode: true,
                        disableOrg: true
                      }
                    }
                  })
                }
              })
          }
        }
      },
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
        text: UB.i18n('Розрахунково-платіжна відомість виплати коштів СС'),
        handler: function () {
          getPrintDocumentFSS(me, 'payFormFSS', me.instanceID, 'pdf')
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
  me.actions.printAction = printAction
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
  if (_.get(me, 'formData.detail.payRollSicknessRequis.length')) {
    me.attr.payRollSicknessRequis.setLocalStoreData(me.formData.detail.payRollSicknessRequis)
  } else if (data.method !== 'addnew') {
    me.attr.payRollSicknessRequis.getStore().removeAll()
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
}

function onFormDataReady () {
  const me = this
  const orgID = me.record.get('organizationID')
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  if (me.isNewInstance) {
    me.setTitle(me.record.get('paymentMethod') === '2' ? `${UB.i18n(me.title)} ${UB.i18n('в касу')}` : `${me.title} ${UB.i18n('в банк')}`)
  }
  if (me.record.get('paymentMethod') === '2') {
    me.actions.exportAction.hide()
    me.attr.payOutID.hide()
    AC.gridUtils.setGridColumnVisible(me.attr.payRollDt, ['paidSum'], true)
    AC.gridUtils.setGridColumnVisible(me.attr.payRollDt, ['depSum'], true)
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.code': [128, 129] })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID })
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID })
  appHR.getPayOutList(me.record.get('organizationID')).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  me.actions.printAction.setDisabled(me.isNewInstance)

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

  if (!me.record.get('applyRetention')) {
    me.record.set('applyRetention', true)
  }
  if (me.record.get('orderState') === 'POSTED') {
    const attrNames = ['orderNumber', 'orderDate', 'description', 'payOutID']
    attrNames.forEach(attrName => {
      if (!me.record.get(attrName)) {
        me.attr[attrName].setReadOnly(false)
      }
    })
  }
  const payOutBtn = me.down('[name=payOutBtn]')
  payOutBtn.addCls(!me.settings.isPayOut ? 'blue-action' : 'green-action')
  payOutBtn.removeCls(me.settings.isPayOut ? 'blue-action' : 'green-action')

  if (me.record.get('departmentID') || depID) {
    AC.viewUtils.setWhereListProperty(me.attr.dictSigners, [
      ['departmentID', '=', me.record.get('departmentID') || depID]
    ])
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.setLoading(true)
    me.attr.payRollSicknessRequis.setLocalStoreData(me.formData.detail.payRollSicknessRequis, false, true)
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt, false, true)
    me.attr.payOrder.setLocalStoreData(me.formData.detail.payOrder, false, true)
    me.viewMark(me)
    me.setLoading(false)
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'periodSalaryID': {
      me.attr.payRollSicknessRequis.removeAll()
      me.attr.payRollDt.removeAll()
      me.attr.payOrder.removeAll()
      me.attr.payRollSicknessRequis.GridSummary.dataBind()
      me.attr.payRollDt.GridSummary.dataBind()
      me.attr.payOrder.GridSummary.dataBind()
      break
    }
    case 'departmentID':
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
      break
  }
}

function beforeGridEdit (me, gridName, context) {
  if (context.record.phantom && context.record.get('sicknessRequisID') && context.record.dirtySave !== null) {
    context.record.dirtySave = null
  }

  if (context.column.dataIndex === 'sicknessRequisID.description') {
    AC.viewUtils.setValueOnChange(context.column.field,
      {
        'lineCount': 'sicknessRequisID.lineCount',
        'totalPaySum': 'sicknessRequisID.totalPaySum',
        'orderState': 'sicknessRequisID.orderState'
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
  if (_.includes([null, ''], context.record.get('sicknessRequisID.totalPaySum'))) {
    context.record.set('sicknessRequisID.totalPaySum', context.record.get('sicknessRequisID.totalPaySum') ? context.record.get('sicknessRequisID.totalPaySum') : '0')
  }
  const sicknessRequisID = context.record.get('sicknessRequisID')
  const data = context.grid.getData()
  if (data.filter(o => o.sicknessRequisID === sicknessRequisID).length > 1) {
    $App.dialogError(UB.i18n(`Заява-розрахунок СС {0} вже додана в поточну платіжну відомість!`, context.record.get('sicknessRequisID.description')), 'Помилка!')
    context.store.remove(context.record)
    me.attr.payRollSicknessRequis.GridSummary.dataBind()
  } else {
    setEmployeeList(me, true)
    me.setIsDirty(true)
  }
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
          'posName': 'posName',
          'employeeNumberID.description': 'employeeNumberID.description'
        },
        context.record,
        ['clearValue']
      )
    }
  }
}

function onPayGridEdit (me, gridName, context) {
  const employeeNumberID = context.record.get('employeeNumberID')
  const data = context.grid.getData()
  if (data.filter(o => o.employeeNumberID === employeeNumberID).length > 1) {
    $App.dialogError(UB.i18n(`Працівник "{0}" вже доданий в поточну платіжну відомість!`, context.record.get('employeeNumberID.description')), 'Помилка!')
    context.store.remove(context.record)
  } else {
    UB.Repository('hr_dictPeriod')
      .attrs(['dateFrom', 'dateTo'])
      .selectById(me.record.get('periodSalaryID')).then(period => {
        const ctrl = context.column.field
        if (_.includes([null, ''], context.record.get('paySum'))) {
          context.record.set('paySum', context.record.get('paySum') ? context.record.get('paySum') : 0)
        }
        if (_.includes([null, ''], context.record.get('taxSum'))) {
          context.record.set('taxSum', context.record.get('taxSum') ? context.record.get('taxSum') : 0)
        }
        if (_.includes([null, ''], context.record.get('baseSum'))) {
          context.record.set('baseSum', context.record.get('baseSum') ? context.record.get('baseSum') : 0)
        }
        if (_.includes([null, ''], context.record.get('paidSum'))) {
          context.record.set('paidSum', context.record.get('paidSum') ? context.record.get('paidSum') : 0)
        }
        if (_.includes([null, ''], context.record.get('depSum'))) {
          context.record.set('depSum', context.record.get('depSum') ? context.record.get('depSum') : 0)
        }
        if (_.includes([null, ''], context.record.get('periodSalaryID'))) {
          context.record.set('periodSalaryID', me.record.get('periodSalaryID'))
        }
        if (_.includes([null, ''], context.record.get('periodCalcID'))) {
          context.record.set('periodCalcID', me.record.get('periodCalcID'))
        }
        if (_.includes([null, ''], context.record.get('periodSalary'))) {
          context.record.set('periodSalary', period.dateFrom)
        }
        if (_.includes([null, ''], context.record.get('periodCalc'))) {
          context.record.set('periodCalc', period.dateFrom)
        }
        if (_.includes([null, ''], context.record.get('dateFrom'))) {
          context.record.set('dateFrom', period.dateFrom)
        }
        if (_.includes([null, ''], context.record.get('dateTo'))) {
          context.record.set('dateTo', period.dateTo)
        }
        if (_.includes([null, ''], context.record.get('mask'))) {
          context.record.set('mask', 0)
        }
        if (_.includes([null, ''], context.record.get('flagsFix'))) {
          context.record.set('flagsFix', 0)
        }
        if (ctrl.flagsFix) {
          if (context.value !== null) {
            context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
          } else {
            context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
          }
        }
        me.setIsDirty(true)
        calc(me)
      })
    me.attr.payRollDt.GridSummary.dataBind()
  }
}

function selectSicknessRequis (me, reload) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_payFSSRequisList',
    isModal: true,
    cmpInitConfig: {
      payRollID: me.record.get('ID'),
      orgID: me.record.get('organizationID'),
      onSelect: (data) => {
        const addSicknessRequis = []
        const store = me.attr.payRollSicknessRequis.getStore()
        const allRecords = me.attr.payRollSicknessRequis.getStore().data.items
        data.forEach(row => {
          const requis = allRecords.filter(o => o.data['sicknessRequisID'] === row.ID)
          if ((!reload && !requis.length) || (reload)) {
            row['payRollID'] = me.record.get('ID')
            row['sicknessRequisID'] = row.ID
            row['sicknessRequisID.orgID'] = row.orgID
            row['sicknessRequisID.orderDate'] = row.orderDate
            row['sicknessRequisID.description'] = row.description
            row['sicknessRequisID.orderNumber'] = row.orderNumber
            row['sicknessRequisID.orderState'] = row.orderState
            row['sicknessRequisID.periodID'] = row.periodID
            row['sicknessRequisID.lineCount'] = row.lineCount
            row['sicknessRequisID.totalPaySum'] = row.totalPaySum ? row.totalPaySum : 0
            row['ID'] = ''
            row['mi_modifyDate'] = ''
            addSicknessRequis.push(row)
          }
        })
        if (addSicknessRequis.length) {
          store.insert(store.data.length, addSicknessRequis)
          me.attr.payRollSicknessRequis.GridSummary.dataBind()
          setEmployeeList(me, true)
          me.setIsDirty(true)
        }
      }
    }
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

function setEmployeeList (me, reload) {
  if (me.attr.periodSalaryID.getValue()) {
    me.setLoading(true)
    me.attr.payOrder.removeAll()
    const store = me.attr.payRollDt.getStore()
    const allRec = me.attr.payRollSicknessRequis.getStore().data
    const params = {
      orgID: me.record.get('organizationID'),
      sicknessRequis: [],
      reloadEmployee: reload || false,
      periodCalcID: me.record.get('periodCalcID'),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      payElID: me.attr.payElID.getValue(),
      payOutID: me.attr.payOutID.getValue(),
      orderID: me.instanceID,
      orderDate: me.attr.orderDate.getValue(),
      accruals: []
    }
    allRec.items.forEach((row, idx) => {
      params.sicknessRequis.push(Object.assign(row.getData(), { idx: idx }))
    })
    $App.connection.run({
      entity: 'hr_payRoll',
      method: 'calcPaySicknessRequis',
      params: JSON.stringify(params)
    }).then(response => {
      const delRec = []
      store.data.items.forEach(row => {
        if (!row.get('flagsFix') || (row.get('flagsFix') >> 20 === 2)) delRec.push(row)
      })
      if (delRec.length) {
        store.remove(delRec)
        store.removed = store.removed.concat(delRec.map(row => row.getData()).filter(row => row.ID))
        me.setIsDirty(true)
      }
      const data = JSON.parse(response.resultData)
      if (data.accruals.length) {
        const employeeList = []
        const allRecWith = store.data.items
        data.accruals.forEach(row => {
          const employee = allRecWith.find(o => o.data['employeeNumberID'] === row.employeeNumberID)
          if (!employee || (employee && !employee.data.flagsFix)) {
            employeeList.push(row)
          }
        })
        if (employeeList.length) {
          store.insert(store.data.length, employeeList)
          me.setIsDirty(true)
        }
        calc(me)
      }
      me.setPayOrder(me, me.attr.payRollDt.getData())
      me.setLoading(false)
    })
  } else {
    $App.dialogError(UB.i18n('неприпустиме значення поля "За період"!'), 'Помилка!')
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

function calc (me) {
  const store = me.attr.payRollDt.getStore()
  store.data.items.forEach(row => {
    const flagsFix = row.get('flagsFix')
    if (flagsFix >> 22 & 1) {
      row.set('taxSum', 0)
    } else {
      let paySum = row.get('baseSum') - row.get('taxSum')
      if (paySum < 0) paySum = 0
      row.set('paySum', paySum)
      if ((flagsFix >> 15 & 1) && !(flagsFix >> 14 & 1)) {
        row.set('paidSum', (paySum - row.get('depSum') > 0) ? (paySum - row.get('depSum')) : 0)
      } else {
        if ((flagsFix >> 14 & 1) && !(flagsFix >> 15 & 1)) {
          row.set('depSum', (paySum - row.get('paidSum') > 0) ? (paySum - row.get('paidSum')) : 0)
        } else {
          if (!(flagsFix >> 15 & 1) && !(flagsFix >> 14 & 1)) {
            row.set('paidSum', paySum)
            row.set('depSum', 0)
          }
        }
      }
    }
  })
  me.attr.payRollDt.GridSummary.dataBind()
}

function showPaymentOrder (me, record) {
  const paymentOrderDts = record.get('paymentOrderDt')
  if (typeof paymentOrderDts === 'object') {
    const employeeNumbers = paymentOrderDts.map(o => o.employeeNumberID)
    UB.Repository('hr_employeeNumberS')
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

async function getPrintDocumentFSS (me, reportCode, instanceID, type) {
  me.setLoading(false)
  const isSaved = await me.saveForm()
  if (isSaved === -1) {
    return
  }
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'docPrintFormFSS',
    params: {
      instanceID,
      reportCode,
      type
    }
  }).then(function (result) {
    const params = JSON.parse(result.doc)
    const report = Ext.create('UBS.UBReport', {
      code: reportCode,
      type: 'html',
      params
    })
    report.init().then(function () {
      const customActions = [
        {
          tooltip: UB.i18n('Експорт'),
          name: 'exportBtn',
          iconCls: 'fas fa-file-excel',
          hidden: me.commandConfig.isHidden,
          cls: 'green-action',
          handler: () => {
            const data = report.incomeParams
            const fileName = UB.i18n('Вивантаження')
            $App.connection.run({
              entity: 'hr_payRoll',
              method: 'generateXLSXFSS',
              viewData: JSON.stringify(data),
              title: fileName
            }).then(response => {
              const data = JSON.parse(response.data)
              AC.filesService.saveAsByBase64Buffer(data, `${fileName}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
              me.setLoading(false)
            }, function (err) {
              me.setLoading(false)
              throw err
            })
          }
        }
      ]
      report.hiddenActions = ['actionPDF']
      const config = {
        cmdType: 'showForm',
        formCode: 'ac_documentViewer',
        caption: UB.i18n('Друкована форма СС'),
        cmpInitConfig: { report, customActions },
        tabId: `printDocument${reportCode}${me.instanceID}`,
        description: '',
        isHidden: false,
        target: $App.getViewport().centralPanel
      }
      $App.doCommand(config)
    })
  }).then(function () {
    me.setLoading(false)
  })
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
      signerCode: 'PAYFSSBANK'
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
              tabId: `printDocument${reportCode}${me.instanceID}`,
              description: me.initialConfig.commandConfig.description,
              target: $App.getViewport().centralPanel,
              isHidden: true
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
      baseSum: record['baseSum'],
      taxSum: record['taxSum'],
      paySum: record['paySum'],
      paidSum: record['paidSum'],
      payOutName: record['payOutID.name'] || record['payRetentionID.payOutID.name'] || record['employeePayOutID.payOutID.name'],
      depSum: record['depSum'],
      depName: record['depName'],
      posName: record['posName']
    })
  })
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'generateXLSX',
    viewData: JSON.stringify(viewData),
    exportFrom: 'hr_payFSSBank'
  }).then(response => {
    const data = JSON.parse(response.data)
    AC.filesService.saveAsByBase64Buffer(data, `${me.attr.payElID.getFieldValue('description')} ${me.record.get('description')}` + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    me.setLoading(false)
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}
