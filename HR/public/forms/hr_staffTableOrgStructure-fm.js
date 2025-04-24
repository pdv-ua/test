/* global AC appAC HR $App Ext UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions,
  onBeforeSave,
  onCheckValidBeforeSaveOrder,
  checkOrgStructureQuantity,
  calcPositionCount,
  setControlFilterByOrgID,
  setInitialOrgStruct,
  setControls,
  getReportName,
  setInitialStaffTable,
  setNextChangeListNumber,
  setOrderDate
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', function () {
    if (me.isNewInstance) {
      if (!me.record.get('orderDate')) {
        me.setOrderDate(appAC.globalOrganization())
      }
    }
  }, me)
  me.orderActions = {
    actions: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask'
    ],
    state: {
      PROJECT: {
        action: ['fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation']
      },
      RECONCILED: {
        action: []
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask']
      },
      ON_COMPLETION: {
        action: ['fDelete', 'startReconciliation']
      },
      POSTED: {
        action: []
      },
      PROCESSED: {
        action: []
      }
    }
  }
  HR.orderManager.setOrderConfig(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['staffTreeControl'])
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: UB.i18n('Мінімальна дата для введення змін в дію'),
    name: 'actionEditOrderDate',
    handler: function () {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_staffTableOrderDateEdit',
        sender: me,
        cmpInitConfig: {
          orderDate: me.record.get('orderDate'),
          orgID: me.record.get('orgID'),
          isReadOnly: !me.isNewInstance
        }
      })
    }
  })
}

function setOrderDate (orgID) {
  const me = this
  if (!orgID) {
    orgID = me.record.get('orgID')
  }
  UB.Repository('hr_staffTable')
    .attrs('entryDate')
    .where('orgID', '=', orgID)
    .where('orderState', '=', 'POSTED')
    .orderByDesc('orderDate')
    .limit(1)
    .selectSingle()
    .then(data => {
      if (data) {
        const orderDate = AC.dateService.addDays(AC.dateService.truncTimeToUtcNull(new Date(data.entryDate)), 1)
        me.getField('orderDate').setValue(orderDate)
      } else {
        UB.Repository('hr_organization')
          .attrs('mi_dateFrom')
          .where('mi_data_id', '=', orgID)
          .where('state', '=', 'ACTIVE')
          .orderByDesc('mi_dateFrom', 'desc')
          .limit(1)
          .selectSingle().then(orgData => {
            if (orgData) {
              const orderDate = AC.dateService.shiftDate(orgData['mi_dateFrom'])
              me.getField('orderDate').setValue(orderDate)
            } else {
              me.getField('orderDate').setValue(appAC.globalApplicationDate())
            }
          })
      }
    })
}

function onFormDataReady () {
  const me = this
  me.attr.staffTreeControl.orderID = me.instanceID
  const docType = me.record.get('docType')
  if (me.isNewInstance) {
    me.actions.createOrder.setDisabled(true)
    me.record.set('docType', 'CHG')
    me.setInitialStaffTable(me.record.get('orgID'))
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    me.setInitialOrgStruct(me.record.get('orgID'))
  } else {
    me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
    me.attr.staffTreeControl.onDate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    me.attr.staffTreeControl.organization = me.record.get('orgID')
    me.attr.staffTreeControl.orgIDs = me.record.get('withChild') ? [] : [me.record.get('orgID')]
    const node = me.attr.staffTreeControl.tree.store.getRootNode()
    if (node) {
      me.attr.staffTreeControl.clearTree(node)
      me.attr.staffTreeControl.appendItems([me.record.get('orgID')], node)
    }
    me.attr.orderDate.setReadOnly(true)
    me.attr.orgID.setReadOnly(true)
    // me.attr.withChild.setReadOnly(true)
    if (me.record.get('orderState') === 'POSTED' || me.record.get('orderState') === 'ON_RECONCILATION') {
      me.actions.createOrder.setDisabled(true)
      me.attr.orderNumber.setReadOnly(true)
      me.attr.name.setReadOnly(true)
      me.attr.textOrder.setReadOnly(true)
      me.attr.docType.setReadOnly(true)
      me.attr.comment.setReadOnly(true)
      me.attr.staffTreeControl.setReadOnly(true)
      me.attr.hrOrderNumber.setValue(me.record.get('entryOrderID.orderNumber'))
      me.attr.hrOrderDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.orderDate')))
      me.attr.hrEntryDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.entryDate')))
      me.attr.hrRespEmployee.setValue(me.record.get('entryOrderID.respEmployeePositionID.employeeID.fullFIO'))
      me.down('recpanel').setCanEdit(false)
    } else {
      me.actions.createOrder.setDisabled(false)
      me.attr.staffTreeControl.setReadOnly(false)
    }
    if (docType === 'CHG') {
      me.attr.changeListNumber.setDisabled(false)
    } else {
      me.attr.changeListNumber.setDisabled(true)
    }
  }
  HR.orderManager.changeAction(me)
  me.setControlFilterByOrgID(me.record.get('orgID') || appAC.globalOrganization())
  me.setControls()
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  // AC.documentManager.addDocumentAction(me)
  let createOrder = me.actions.createOrder
  if (!createOrder) {
    createOrder = new Ext.Action({
      actionId: 'createOrder',
      eventId: 'createOrder',
      actionText: UB.i18n('Ввести в дію наказом'),
      text: UB.i18n('Ввести в дію наказом'),
      tooltip: UB.i18n('Ввести в дію наказом'),
      handler: function () {
        UB.Repository('hr_empOrder')
          .attrs('ID')
          .where('staffTableOrgStructureID', '=', me.instanceID)
          .selectSingle().then(instanceEmpOrderID => {
            let config = {
              cmdType: 'showForm',
              formCode: 'hr_empOrder',
              entity: 'hr_empOrder',
              instanceID: instanceEmpOrderID ? instanceEmpOrderID.ID : null,
              cmpInitConfig: {
                defaultValues: {
                  staffTableOrgStructureID: me.instanceID,
                  empOrderType: 'ORGSTRUCTURE',
                  organizationID: me.record.get('orgID'),
                  orderDate: AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')),
                  entryDate: AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
                }
              },
              tabId: new Date().getTime(),
              target: $App.getViewport().centralPanel
            }
            $App.doCommand(config)
          })
      },
      scope: me
    })
    me.actions.createOrder = createOrder
  }
  if (!me.actions.printReports) {
    let printMenu = []
    HR.reportUtils.getOrderReportMenu(printMenu, 'ORGSTRUCTURE', me)
    me.actions.printReports = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printReports',
      eventId: 'printReports',
      menu: printMenu
    })
  }
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    handler: function () {
      $App.connection.run({
        entity: 'hr_recstage',
        method: 'cancelReconciliation',
        docID: me.record.get('ID')
      }).then(function () {
        return me.loadInstance()
      }).then(function () {
        me.down('recpanel').updateTree()
        return $App.dialogInfo(UB.i18n('Документ повернуто на доопрацювання. Всі резолюції було відмінено'))
      })
    }
  })

  function docontinueReconciliation () {
    Ext.Msg.prompt(UB.i18n('Відновити погодження'),
      UB.i18n('Буде відновлено погодження з етапу на якому було відхилого погодженя. Введіть повідомлення для користвача, який відхилив погодження:'),
      function (btn, text) {
        if (btn === 'ok' && text) {
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'continueReconciliation',
            docID: me.record.get('ID'),
            comments: text
          }).then(function () {
            return me.loadInstance()
          }).then(function () {
            me.down('recpanel').updateTree()
            return $App.dialogInfo(UB.i18n('Узгодження продовжено згідно встановленому маршруту'))
          })
        } else if (btn === 'ok' && !text) {
          docontinueReconciliation()
        }
      }, me, true)
  }

  me.actions.renewTask = new Ext.Action({
    iconCls: 'fas fa-thumbs-up',
    cls: 'blue-action',
    tooltip: UB.i18n('Відновити погодження'),
    text: UB.i18n('Відновити погодження'),
    actionId: 'renewTask',
    handler: function () {
      docontinueReconciliation('ON_RECONCILATION')
    }
  })

  me.actions.startReconciliation = new Ext.Action({
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
      me.saveForm().then(result => {
        if (result !== -1) {
          if (!me.record.get('document')) {
            $App.dialogError(UB.i18n('Необхідно сформувати текст наказу. Перейдіть на закладку "Документ" та натисніть "Формувати"'), UB.i18n('msgTypeWarning'))
            return
          }
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'startReconciliation',
            docID: me.record.get('ID')
          }).then(function () {
            return me.loadInstance()
          }).then(function () {
            HR.reportTab.setReportMode(me, 'view')
            me.down('recpanel').updateTree()
            return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
          })
        }
      })
    }
  })

  me.actions.stopReconciliation = new Ext.Action({
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
    handler: function () {
      $App.dialogYesNo(UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
        .then(function (res) {
          if (res) {
            $App.connection.run({
              entity: 'hr_recstage',
              method: 'stopReconciliation',
              docID: me.record.get('ID')
            }).then(function () {
              return me.loadInstance()
            }).then(function () {
              me.down('recpanel').updateTree()
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'orderDate':
        if (field.isValid()) {
          if (!me.record.get('orgID')) {
            me.record.set('orgID', appAC.globalOrganization())
          }
          UB.Repository('hr_organization')
            .attrs('ID')
            .where('mi_data_id', '=', me.record.get('orgID'))
            .misc({ __mip_ondate: AC.dateService.truncTimeToUtcNull(value) })
            .selectSingle()
            .then(orgID => {
              if (!orgID) {
                $App.dialogError(UB.i18n('Вказану організацію не знайдено станом на вказану дату!'))
                me.attr.orgID.clearValue()
              }
            })
        }
        break
      case 'orgID':
        me.setControlFilterByOrgID(value)
        if (me.isNewInstance) {
          me.setInitialOrgStruct(value)
          if (!me.attr.staffTableOrgStructureID.isDisabled()) {
            me.setInitialStaffTable(value)
          }
        }
        break
      case 'docType':
        me.setControls()
        break
      case 'staffTableID':
        if (value) me.setNextChangeListNumber(value)
        break
    }
  }
}

function setInitialStaffTable (orgID) {
  const me = this
  UB.Repository('hr_staffTableOrgStructure')
    .attrs('ID')
    .where('orgID', '=', orgID)
    .where('orderState', '=', 'POSTED')
    .where('docType', '=', 'NEW')
    .orderBy('orderDate', 'desc')
    .selectSingle()
    .then(staff => {
      if (staff) {
        me.attr.staffTableOrgStructureID.setValueById(staff.ID)
        if (!me.attr.changeListNumber.getValue()) {
          me.setNextChangeListNumber(staff.ID)
        }
      } else me.attr.staffTableOrgStructureID.clearValue()
    })
}

function setNextChangeListNumber (staffTableOrgStructureID) {
  const me = this
  UB.Repository('hr_staffTableOrgStructure')
    .attrs('ID', 'changeListNumber')
    .where('staffTableOrgStructureID', '=', staffTableOrgStructureID)
    .orderBy('changeListNumber', 'desc')
    .selectSingle()
    .then(item => {
      if (item) me.attr.changeListNumber.setValue(item.changeListNumber + 1)
      else me.attr.changeListNumber.setValue(1)
    })
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    if (!me.isDirty() && !me.record.dirty) {
      return resolve(true)
    }
    me.onCheckValidBeforeSaveOrder().then((result) => {
      resolve(result !== false)
    })
  })
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  if (!me.record.get('docText')) {
    return Promise.resolve(true)
  }
  return HR.reportTab.saveReport(me)
}

function checkOrgStructureQuantity () {
  const me = this
  $App.connection.run({
    entity: 'hr_staffTableOrgStructure',
    method: 'checkQuantity',
    staffTableID: me.record.get('ID'),
    onDate: AC.dateService.shiftDate(me.record.get('orderDate')),
    orgID: me.record.get('orgID')
  }).then((result) => {
    if (result) {
      const totalQnt = result.totalQuantity
      const limitEmpNum = result.limitEmpNum
      if (limitEmpNum === totalQnt) $App.dialogInfo(UB.i18n(`Загальна кількість посад {0} відповідає встановленій кількості посад для організації`, totalQnt))
      else if (limitEmpNum > totalQnt) $App.dialogInfo(UB.i18n(`Загальна кількість посад {0} менше встановленої кількість посад для організації {1}`, totalQnt, limitEmpNum))
      else $App.dialogInfo(UB.i18n(`Загальна кількість посад {0} перевищує встановлену кількість посад для організації {1}`, totalQnt, limitEmpNum))
    }
  })
}

function calcPositionCount () {
  const me = this
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_staffTablePositionCount',
    customParams: {
      orgID: me.record.get('orgID'),
      onDate: AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')),
      staffOrderID: me.instanceID,
      sender: me
    }
  })
}

function setControlFilterByOrgID (orgID) {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.staffTableOrgStructureID, {
    orgID: orgID,
    orderState: 'POSTED'
  }, ['clearFilter'])
}

function setInitialOrgStruct (orgID) {
  const me = this
  UB.Repository('hr_staffTableOrgStructure')
    .attrs('ID')
    .where('orgID', '=', orgID)
    .where('orderState', '=', 'POSTED')
    .where('docType', '=', 'NEW')
    .orderBy('orderDate', 'desc')
    .selectSingle()
    .then(struct => {
      if (struct) me.attr.staffTableOrgStructureID.setValueById(struct.ID)
      else me.attr.staffTableOrgStructureID.clearValue()
    })
}

function setControls () {
  const me = this
  switch (me.attr.docType.getValue()) {
    case 'NEW':
      me.attr.staffTableOrgStructureID.setDisabled(true)
      me.attr.staffTableOrgStructureID.clearValue()
      me.attr.changeListNumber.setDisabled(true)
      break
    case 'CHG':
      me.attr.staffTableOrgStructureID.setDisabled(false)
      me.attr.changeListNumber.setDisabled(false)
      if (me.isNewInstance) me.setInitialOrgStruct(me.record.get('orgID'))
      break
  }
}

function getReportName () {
  const me = this
  const docType = me.record.get('docType') || me.attr.docType.getValue()
  return docType === 'NEW' ? 'hr_orgplanStruct' : 'hr_orgplanStructChanges'
}
