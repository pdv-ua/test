/* global appAC appHR HR AC Ext $App _ UB */

exports.formCode = {
  initComponentStart,
  addBaseActions,
  onAfterOrderSave,
  postInit,
  onFormDataReady,
  onControlChanged,
  setDescription,
  setOrderList,
  calc,
  setControlsByIncludeSubOrg,
  setPayRoll,
  selectOrgList,
  beforeGridEdit,
  onGridEdit
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['sicknessRequisDt'],
    customAddNewByCurrent: false
  }
  HR.orderManager.init(me)
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

  const printAction = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    actionId: 'printAction',
    text: UB.i18n('Друкувати'),
    eventId: 'printAction',
    menu: [
      {
        text: UB.i18n('Звіт до СС'),
        handler: function () {
          if (me.isValid()) {
            UB.Repository('ac_regReport').attrs(['ID'])
              .where('sourceID', '=', me.instanceID)
              .where('dictRepID.repGroup', '=', 'fssu')
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
                        subCode: '001',
                        periodCode: me.attr.periodID.getFieldValue('dictMonthID.code'),
                        year: me.attr.periodID.getFieldValue('pYear'),
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
        text: UB.i18n('Звіт до ПФ'),
        handler: function () {
          if (me.isValid()) {
            UB.Repository('ac_regReport').attrs(['ID'])
              .where('sourceID', '=', me.instanceID)
              .where('dictRepID.repGroup', '=', 'pf')
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
                        'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105', 'C11002', 'H04010'
                      ],
                      repGroup: ['statistical', 'taxation', 'fssu', 'pf'],
                      model: 'HR',
                      defaultParams: {
                        sourceID: me.instanceID,
                        repGroup: 'pf',
                        subCode: '010',
                        periodCode: me.attr.periodID.getFieldValue('dictMonthID.code'),
                        year: me.attr.periodID.getFieldValue('pYear'),
                        disableRepCode: true,
                        disableOrg: true
                      }
                    }
                  })
                }
              })
          }
        }
      }
    ]
  })
  me.actions.printAction = printAction
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.sicknessRequisDt.length')) {
    me.attr.sicknessRequisDt.setLocalStoreData(me.formData.detail.sicknessRequisDt, false, true)
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.sicknessRequisDt.setLocalStoreData(me.formData.detail.sicknessRequisDt, false, true)
  }
}

function onFormDataReady () {
  const me = this

  if (me.isNewInstance) {
    me.record.set('orgID', appAC.globalOrganization())
  }
  const orgID = me.record.get('orgID')
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  setControlsByIncludeSubOrg(me)
  me.actions.printAction.setDisabled(!AC.entityUtils.verifyRightsMethod('ac_regReport', 'addnew') || me.record.get('orderState') !== 'POSTED')
  me.attr.dictFssReqID.setAllowBlank(me.record.get('orderState') === 'POSTED')
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: orgID }, [])
  if (!me.attr.periodID.getValue()) {
    appHR.getCurrentPeriod(orgID).then(response => {
      me.attr.periodID.setValueById(response.ID)
    })
  }
  if (!me.attr.orderNumber.getValue()) {
    $App.connection.run({
      entity: 'hr_sicknessRequis',
      method: 'getOrderNum',
      orgID: orgID,
      onDate: me.attr.periodID.getFieldValue('dateFrom')
    }).then((result) => {
      me.attr.orderNumber.setValue(result.orderNumber)
    })
  }
  AC.viewUtils.setWhereListProperty(me.attr.departmentID, [
    ['orgID', '=', appAC.globalOrganization()],
    ['state', '=', 'ACTIVE']
  ])
  AC.viewUtils.setFilterValue(me.attr.dictMultiGroupID, { orgID })
  me.attr.includeSubDep.setReadOnly(!me.record.get('departmentID'))
  me.attr.includeSubDepGroup.setReadOnly(!me.record.get('dictMultiGroupID'))

  setPayRoll(me)
}

function setDescription (me) {
  me.record.set('description', `№ ${me.attr.orderNumber.getValue() || ''} від ${AC.dateService.formatDate(AC.dateService.shiftDate(me.attr.orderDate.getValue()), 'dd.mm.yyyy')}`)
}

function setOrderList (me) {
  if (!me.attr.dictFssReqID.getValue()) {
    $App.dialogInfo(UB.i18n('Не заповнено тип заявки СС'))
    return
  }
  me.setLoading(true)
  me.attr.sicknessRequisDt.removeAll()
  const store = me.attr.sicknessRequisDt.getStore()
  let data = []
  const params = {
    orgID: appAC.globalOrganization(),
    sicknessID: me.record.get('ID'),
    periodSalary: AC.dateService.shiftDate(me.attr.periodID.getFieldValue('dateFrom')),
    dictFssReqID: me.attr.dictFssReqID.getValue(),
    includeSubOrg: me.attr.includeSubOrg.getValue(),
    departmentID: me.attr.departmentID.getValue(),
    includeSubDep: me.attr.includeSubDep.getValue(),
    dictMultiGroupID: me.attr.dictMultiGroupID.getValue(),
    includeSubDepGroup: me.attr.includeSubDepGroup.getValue()
  }
  $App.connection.run({
    entity: 'hr_sicknessRequis',
    method: 'getSicknessList',
    execParams: params
  }).then(response => {
    data = JSON.parse(response.resultData)
    if (data.length) {
      store.insert(store.data.length, data)
      me.setIsDirty(true)
    } else {
      $App.dialogInfo(UB.i18n('Відсутні нарахування для вибраного типу заявки'))
    }
    const errors = JSON.parse(response.errors)
    if (errors.length) {
      $App.dialogInfo(UB.i18n(`Увага! Види оплат {0} не додано ні до одного типу заявки! Для них не буде сформована заявка!`, errors.join(',')))
    }
    const accrualErrors = JSON.parse(response.accrualErrors)
    if (accrualErrors.length) {
      $App.dialogInfo(UB.i18n(`Нарахування за рахунок СС вже частично додані до інших заявок: <br/>{0}`, accrualErrors.join('<br/>')))
    }
    me.attr.sicknessRequisDt.GridSummary.dataBind()
    me.setLoading(false)
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}

function calc (me) {
  const store = me.attr.sicknessRequisDt.getStore()
  const allOrders = store.data.items
  allOrders.forEach(async row => {
    const ID = row.getData().ID
    const params = {}
    params.payElName = row.getData()['payElID.name']
    params.payElID = row.getData().payElID
    params.orderID = row.getData().orderID
    params.sicknessDtID = ID
    await $App.connection.run({
      entity: 'hr_sicknessRequis',
      method: 'calc',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const newRecords = []
      if (data.length) {
        data.forEach(item => {
          if (!store.data.items.filter(o => o.data.employeeNumberID === item.employeeNumberID).length) {
            newRecords.push(item)
          } else {
            store.data.items.forEach(record => {
              if (record.get('ID') === ID) {
                record.set('paySum', item.paySum)
                record.set('payDays', item.payDays)
              }
            })
          }
        })
        if (newRecords.length) store.insert(store.data.length, newRecords)
        me.setIsDirty(true)
      } else {
        store.data.items.forEach(record => {
          if (record.get('ID') === ID) {
            record.set('paySum', 0)
            record.set('payDays', 0)
          }
        })
      }
      me.attr.sicknessRequisDt.GridSummary.dataBind()
    })
  })
}

function setControlsByIncludeSubOrg (me, grid = null) {
  const orgID = me.record.get('orgID')
  if (!AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')) {
    me.attr.includeSubOrg.setValue(false)
    me.down('[name=includeSubOrgPanel]').setVisible(false)
  } else {
    UB.Repository('hr_organization')
      .attrs(['ID'])
      .limit(1)
      .where('parentUnitID', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectAsObject()
      .then(result => {
        const hasSubOrg = !!result.length
        if (!hasSubOrg) {
          me.attr.includeSubOrg.setValue(false)
          me.down('[name=includeSubOrgPanel]').setVisible(false)
        }
        me.attr.departmentID.setDisabled(me.attr.includeSubOrg.getValue())
        me.attr.includeSubDep.setDisabled(me.attr.includeSubOrg.getValue())
        me.attr.dictMultiGroupID.setDisabled(me.attr.includeSubOrg.getValue())
        me.attr.includeSubDepGroup.setDisabled(me.attr.includeSubOrg.getValue())
        const tabs = me.down('[name=tabs]')
        const child = tabs.child('[name=tabOrgList]')
        const { tab } = child
        if (tab) {
          if (me.attr.includeSubOrg.getValue()) {
            normalizeSicknessRequisOrg(orgID)
              .then(() => {
                if (grid) {
                  grid.getStore().load()
                  tabs.setActiveTab(1)
                }
                tab.show()
              })
          } else {
            const activeTab = tabs.getActiveTab()
            if (activeTab.name === 'tabOrgList') {
              tabs.setActiveTab(0)
            }
            tab.hide()
          }
        }
      })
  }
}

function setPayRoll (me) {
  const payRollPanel = me.down('[name=payRollPanel]')
  const payRollField = me.down('[name=payRollNameAndPeriod]')
  payRollField.setValue(null)
  if (!me.instanceID) {
    payRollPanel.setVisible(false)
  } else {
    UB.Repository('hr_RollRequis')
      .attrs(['payRollID', 'payRollID.orderNumber', 'payRollID.description', 'payRollID.orderDate', 'payRollID.orderState'])
      .limit(1)
      .where('sicknessRequisID', '=', me.instanceID)
      .selectAsObject({
        'payRollID.orderNumber': 'orderNumber',
        'payRollID.description': 'description',
        'payRollID.orderDate': 'orderDate',
        'payRollID.orderState': 'orderState'
      })
      .then(res => {
        if (res.length) {
          const orderDate = AC.dateService.formatDate(res[0].orderDate)
          payRollField.setValue(`${res[0].description} № ${res[0].orderNumber} ${UB.i18n('від')} ${orderDate} (${res[0].orderState === 'POSTED' ? UB.i18n('проведено') : UB.i18n('чорновик')
          })`)
          payRollPanel.setVisible(true)
        } else {
          payRollField.setValue(`Документ виплати ще не створено`)
          payRollPanel.setVisible(false)
        }
      })
  }
}
function selectOrgList (me, grid) {
  const orgID = me.record.get('orgID')
  UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'description'])
    .where('state', '=', 'ACTIVE', 'state')
    .where('mi_treePath', 'like', `/${orgID}/`)
    .orderBy('description')
    .selectAsObject({ 'mi_data_id': 'ID' })
    .then(available => {
      UB.Repository('hr_sicknessRequisOrg')
        .attrs(['ID', 'subOrgID'])
        .where('orgID', '=', orgID)
        .selectAsObject({ 'subOrgID': 'value' })
        .then(selected => {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_elementSelect',
            cmpInitConfig: {
              sourceData: available,
              selectData: selected,
              onSelectData: (data) => {
                if (data.remove.length || data.add.length) {
                  $App.connection.run({
                    entity: 'hr_sicknessRequis',
                    method: 'updateSicknessRequisOrg',
                    orgID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    grid.getStore().load()
                  })
                }
              }
            }
          })
        })
    })
}

function normalizeSicknessRequisOrg (orgID) {
  return $App.connection.run({
    entity: 'hr_sicknessRequis',
    method: 'normalizeSicknessRequisOrg',
    orgID
  })
}

function onControlChanged (me, field, value, oldValue) {
  if (me.formDataReady) {
    if (field.skipChange) {
      delete field.skipChange
      return
    }
    switch (field.name) {
      case 'departmentID':
      case 'includeSubDep':
      case 'includeSubOrg':
      case 'dictMultiGroupID':
      case 'includeSubDepGroup':
        const askPromise = me.attr.sicknessRequisDt.getStore().getCount() === 0 ? Promise.resolve(true) : $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Список документів буде очищено. Продовжити?'))
        askPromise.then(result => {
          if (result) {
            me.attr.sicknessRequisDt.removeAll()
            me.attr.sicknessRequisDt.GridSummary.dataBind()
            if (field.name === 'includeSubOrg') {
              me.attr.departmentID.skipChange = true
              me.attr.departmentID.setValueById()
              me.attr.includeSubDep.skipChange = true
              me.attr.includeSubDep.setValue()
              me.attr.dictMultiGroupID.skipChange = true
              me.attr.dictMultiGroupID.setValueById()
              me.attr.includeSubDepGroup.skipChange = true
              me.attr.includeSubDepGroup.setValue()
              const grid = me.down('[name=ogranization]')
              me.setControlsByIncludeSubOrg(me, grid)
            } else if (field.name === 'departmentID') {
              if (value) {
                me.attr.dictMultiGroupID.skipChange = true
                me.attr.dictMultiGroupID.setValueById()
                me.attr.includeSubDepGroup.skipChange = true
                me.attr.includeSubDepGroup.setValue()
                me.attr.includeSubDepGroup.setReadOnly(true)
              }
              me.attr.includeSubDep.setReadOnly(!value)
            } else if (field.name === 'dictMultiGroupID') {
              if (value) {
                me.attr.departmentID.skipChange = true
                me.attr.departmentID.setValueById()
                me.attr.includeSubDep.skipChange = true
                me.attr.includeSubDep.setValue()
                me.attr.includeSubDep.setReadOnly(true)
              }
              me.attr.includeSubDepGroup.setReadOnly(!value)
            }
          } else {
            field.skipChange = true
            if (field.setValueById) {
              field.setValueById(oldValue)
            } else {
              field.setValue(oldValue)
            }
          }
        })
        break
    }
  }
}

function beforeGridEdit (me, context) {
  me.setIsDirty(true)
  if (context.record.phantom && context.record.dirtySave !== null) {
    context.record.dirtySave = null
  }
   if (context.column.dataIndex === 'sicknessCauseText' && !context.record.get('dictSicknessCauseID.isOther')) {
    return false
  }
  if (context.column.dataIndex === 'dictSicknessCauseID.name') {
    context.column.field.on('change', (ctrl) => {
      context.record.set('dictSicknessCauseID.isOther', ctrl.getFieldValue('isOther'))
      if (!ctrl.getFieldValue('isOther')) {
        context.record.set('sicknessCauseText', null)
      }
    })
  }
  if (context.column.dataIndex === 'employeeSickLimitID.dictSickLimitID.name') {
    AC.viewUtils.setFilterValue(context.column.field, {
      employeeID: context.record.get('employeeNumberID.employeeID'),
      'dictSickLimitID.typeSickLimit': ['2', '4'],
      dateFrom: { value: AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), condition: '<=' },
      dateTo: { value: AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), condition: '>=' }
    })
  }
  if (context.column.dataIndex === 'employeeDocID.description') {
    AC.viewUtils.setWhereListProperty(context.column.field, [
      ['employeeID', '=', context.record.get('employeeNumberID.employeeID')],
      ['dictDocKindID.docType', '=', '2'],
      ['dateFrom', 'isNull', null, 'dateFromNull'],
      ['dateTo', 'isNull', null, 'dateToNull'],
      ['dateFrom', '<=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), 'dateFrom'],
      ['dateTo', '>=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), 'dateTo']
    ],
    ['(([dateFromNull] OR [dateFrom]) AND ([dateToNull] OR [dateTo]))']
    )
  }
}

function onGridEdit (me, context) {
  if (context.column.field.name === 'payDaysChNPP') {
    context.record.set('paySumChNPP', AC.currencyService.round((context.record.get('payDaysAll') ? ((context.record.get('paySumAll') || 0) / context.record.get('payDaysAll')) : 0) * (context.value || 0)))
    if (context.value) {
      Promise.all([
        UB.Repository('hr_employeeSickLimit')
          .attrs(['ID', 'dictSickLimitID.name'])
          .where('employeeID', '=', context.record.get('employeeNumberID.employeeID'))
          .where('dictSickLimitID.typeSickLimit', 'in', ['2', '4'])
          .where('dateFrom', '<=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()))
          .where('dateTo', '>=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()))
          .orderByDesc('dateFrom')
          .limit(1)
          .selectSingle(),
        UB.Repository('hr_employeeDocs')
          .attrs(['ID', 'description'])
          .where('employeeID', '=', context.record.get('employeeNumberID.employeeID'))
          .where('dictDocKindID.docType', '=', '2')
          .where('dateFrom', '<=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), 'dateFrom')
          .where('dateTo', '>=', AC.dateService.shiftDate(context.record.get('dateFirst') || AC.dateService.todayDate()), 'dateTo')
          .where('dateFrom', 'isNull', undefined, 'dateFromNull')
          .where('dateTo', 'isNull', undefined, 'dateToNull')
          .logic('(([dateFromNull] OR [dateFrom]) AND ([dateToNull] OR [dateTo]))')
          .orderByDesc('dateFrom')
          .limit(1)
          .selectSingle()
      ]).then(([employeeSickLimit, employeeDocs]) => {
        if (employeeSickLimit && !context.record.get('employeeSickLimitID.dictSickLimitID.name')) {
          context.record.set('employeeSickLimitID.dictSickLimitID.name', employeeSickLimit['dictSickLimitID.name'])
          context.record.set('employeeSickLimitID', employeeSickLimit.ID)
        }
        if (employeeDocs && !context.record.get('employeeDocID.description')) {
          context.record.set('employeeDocID.description', employeeDocs.description)
          context.record.set('employeeDocID', employeeDocs.ID)
        }
      })
    }
  }
}
