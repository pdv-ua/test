/* global AC appAC HR $App Ext UB */
exports.formCode = {
  initComponentStart,
  onInitComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions,
  onBeforeSave,
  onCheckValidBeforeSaveOrder,
  getReportName,
  postInit,
  setOrderDate,
  exportXLSX,
  onExpandGridRow,
  setInitialOrgStruct,
  setControlFilterByOrgID,
  setInitialStaffTable,
  setNextChangeListNumber,
  setAccrualSumByTarif,
  askOrderDate,
  setupRespEmployeePosition,
  setFilterOnRespPosition
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
    .orderByDesc('entryDate')
    .limit(1)
    .selectSingle()
    .then(data => {
      if (data) {
        const orderDate = AC.dateService.addDays(AC.dateService.truncTimeToUtcNull(new Date(data.entryDate)), 1)
        me.getField('orderDate').setValue(orderDate)
        me.askOrderDate()
      } else {
        me.getField('orderDate').setValue(appAC.globalApplicationDate())
        me.record.set('docType', 'ACCRUAL')
        me.askOrderDate()
      }
    })
}

function askOrderDate () {
  const me = this
  if (me.isNewInstance) {
    const askStaffTableEntryDate = AC.settings.get('hrAskStaffTableEntryDate', me.record.get('orgID') || appAC.globalOrganization())
    if (askStaffTableEntryDate) {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_staffTableOrderDateEdit',
        sender: me,
        cmpInitConfig: {
          orderDate: me.record.get('orderDate'),
          orgID: me.record.get('orgID'),
          askingMode: true
        }
      })
    }
  }
}

function initComponentStart () {
  const me = this
  me.reportMode = 'view'
  me.hideSigner4 = !AC.settings.get('hrTwoApproverInStaffTable', appAC.globalOrganization())
  me.on('controlChanged', onControlChanged, me)
  me.gridConfig = {
    detailGrids: ['staffTableAccrual']
  }

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
  AC.acEditGridManager.init(me)
  me.onBeforeSave = onBeforeSave
}

function onInitComponentDone () {
  const me = this
  me.approvedFilter = Ext.create('Ext.util.Filter', {
    id: 'approvedFilter',
    filterFn: function (row) {
      return ((!me.attr.searchText.getValue() || me.attr.searchText.getValue() === '') ||
        ((row.get('dictPositionID.name') || '').toUpperCase().includes(me.attr.searchText.getValue().toUpperCase()) ||
        (row.get('positionType') || '').toUpperCase().includes(me.attr.searchText.getValue().toUpperCase())))
    }
  })
  const tb = me.attr.staffTableAccrual.down('toolbar')
  if (tb) {
    const accrualChangeKindCombo = Ext.create('UB.ux.form.field.UBComboBox', {
      xtype: 'ubcombobox',
      name: 'accrualChangeKind',
      fieldLabel: UB.i18n('Встановлювати оклади'),
      labelWidth: 200,
      width: 600,
      valueField: 'code',
      ubRequest: {
        entity: 'ubm_enum',
        method: UB.core.UBCommand.methodName.SELECT,
        fieldList: ['ID', 'name', 'code', 'eGroup'],
        whereList: {
          enumGroupFilter: {
            expression: '[eGroup]',
            condition: 'equal',
            values: {
              val: 'HR_ACCRUAL_CHANGE_KIND'
            }
          }
        }
      },
      listeners: {
        change: function (ctrl, value) {
          me.record.set('accrualChangeKind', value)
        }
      }
    })
    tb.insert(3, accrualChangeKindCombo)
  }
  const mtb = me.down('toolbar')
  const allActions = mtb && mtb.query('[menuId=AllActions]')[0]
  if (allActions && AC.entityUtils.verifyRightsMethod('hr_staffTable', 'fixEntryOrderState')) {
    allActions.menu.add({
      xtype: 'menuseparator'
    })
    allActions.menu.add({
      text: 'Виправлення стану наказу',
      handler: function () {
        $App.connection.run({
          entity: 'hr_staffTable',
          method: 'fixEntryOrderState',
          staffTableID: me.instanceID
        }).then(response => {
          let errorMessages = response.errorMessages ? JSON.parse(response.errorMessages) : []
          if (errorMessages.length) {
            $App.dialogInfo(errorMessages.join('<br>'))
          } else {
            $App.dialogInfo('Виправлення стану наказу виконано успішно')
          }
        })
      }
    })
  }
}

function respEmployeeNumIDSet (form) {
  const orgID = form.record.get('orgID')
  const onDate = form.record.get('docDate') || appAC.globalApplicationDate()

  AC.viewUtils.setFilterValue(form.getField('respEmployeeNumID'), {
    orgID,
    dateTo: {
      value: onDate,
      condition: '>='
    },
    dateFrom: {
      value: onDate,
      condition: '<='
    }
  })
}

function postInit (me) {
  if (!me.defaultValues) {
    me.defaultValues = {}
  }
  if (me.isNewInstance) {
    me.actions.createOrder.setDisabled(true)
    me.record.set('docType', 'ACCRUAL_CHANGES')
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    if (!me.record.get('orderDate')) {
      me.setOrderDate(me.record.get('orgID'))
    }
    if (me.defaultValues.respEmployeeNumID) {
      me.record.set('respEmployeeNumID', me.defaultValues.respEmployeeNumID)
    } else {
      const respEmployeeNumID = me.record.get('respEmployeeNumID')
      if (!respEmployeeNumID) {
        const employeeNumberID = $App.connection.userData('employeeNumberID')
        if (employeeNumberID) {
          me.record.set('respEmployeeNumID', employeeNumberID)
        }
      }
    }
  }
  const orgID = me.record.get('orgID')
  if (AC.settings.get('hrStaffReportShowAccrual', orgID)) {
    me.attr.ecoPrint.setValue(true)
  } else {
    $App.connection.run({
      entity: 'ac_docPrintSettings',
      method: 'getOrgPrintSettings',
      orgID: orgID
    }).then(printSettings => {
      me.attr.ecoPrint.setValue(printSettings.ecoPrint)
    })
  }
}

function onFormDataReady () {
  const me = this
  const docType = me.record.get('docType')
  const readOnly = !(me.record.get('orderState') === 'PROJECT')
  if (me.isNewInstance) {
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    me.record.set('name', '-')
    me.actions.createOrder.setDisabled(true)
    me.setInitialStaffTable(me.record.get('orgID'))
    // me.attr.staffTableID.setDisabled(true)
    // me.attr.changeListNumber.setDisabled(true)
    respEmployeeNumIDSet(me)
    $App.connection.run({
      entity: 'hr_employeePosition',
      method: 'getStaffTableSignerList',
      onDate: appAC.globalApplicationDate(),
      organizationID: me.record.get('orgID')
    }).then(mParams => {
      if (mParams.result.signer1.respPositionID) {
        me.record.set('respPositionID', mParams.result.signer1.respPositionID)
        if (mParams.result.signer1.respEmployeePositionID) {
          me.record.set('respEmployeePositionID', mParams.result.signer1.respEmployeePositionID)
        }
      }
      me.setupRespEmployeePosition({
        positionID: mParams.result.signer1.respPositionID || false,
        isReload: false,
        attrName: 'respPositionID'
      })

      if (mParams.result.signer2.respPositionID) {
        me.record.set('respPosition2ID', mParams.result.signer2.respPositionID)
        if (mParams.result.signer2.respEmployeePositionID) {
          me.record.set('respEmployeePosition2ID', mParams.result.signer2.respEmployeePositionID)
        }
      }
      me.setupRespEmployeePosition({
        positionID: mParams.result.signer2.respPositionID || false,
        isReload: false,
        attrName: 'respPosition2ID'
      })

      if (mParams.result.signer5.respPositionID) {
        me.record.set('respPosition5ID', mParams.result.signer5.respPositionID)
        if (mParams.result.signer5.respEmployeePositionID) {
          me.record.set('respEmployeePosition5ID', mParams.result.signer5.respEmployeePositionID)
        }
      }
      me.setupRespEmployeePosition({
        positionID: mParams.result.signer5.respPositionID || false,
        isReload: false,
        attrName: 'respPosition5ID'
      })

      if (mParams.result.signer3.respPositionID) {
        me.record.set('respPosition3ID', mParams.result.signer3.respPositionID)
        if (mParams.result.signer3.respEmployeePositionID) {
          me.record.set('respEmployeePosition3ID', mParams.result.signer3.respEmployeePositionID)
        }
      }
      me.setupRespEmployeePosition({
        positionID: mParams.result.signer3.respPositionID || false,
        isReload: false,
        attrName: 'respPosition3ID'
      })

      if (mParams.result.signer4.respPositionID) {
        me.record.set('respPosition4ID', mParams.result.signer4.respPositionID)
        if (mParams.result.signer4.respEmployeePositionID) {
          me.record.set('respEmployeePosition4ID', mParams.result.signer4.respEmployeePositionID)
        }
      }
      me.setupRespEmployeePosition({
        positionID: mParams.result.signer4.respPositionID || false,
        isReload: false,
        attrName: 'respPosition4ID'
      })
    })
    me.setTitle(UB.i18n(`Зміна окладу (Створення)`))
  } else {
    let orderNumber = me.record.get('orderNumber') || ''
    let orderDate = AC.dateService.formatDate(me.record.get('orderDate'))
    let orderState = UB.core.UBEnumManager.getStore('HR_ORDER_STATE').getById(me.record.get('orderState')).data.name
    me.setTitle(UB.i18n('Зміна окладу') + ` ${orderNumber} ` + UB.i18n('від') + ` ${orderDate}(${orderState})`)
    me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
    me.attr.orderDate.setReadOnly(true)
    me.attr.orgID.setReadOnly(true)
    me.attr.withChild.setReadOnly(true)
    me.attr.respEmployeeNumID.setReadOnly(readOnly)
    me.actions.createOrder.setDisabled(readOnly)
    me.attr.orderNumber.setReadOnly(readOnly)
    me.attr.name.setReadOnly(readOnly)
    me.attr.textOrder.setReadOnly(readOnly)
    me.attr.comment.setReadOnly(readOnly)
    me.attr.docType.setReadOnly(readOnly)
    me.attr.groupJobsPrint.setReadOnly(readOnly)
    me.attr.staffTabOrgStructID.setDisabled(readOnly)

    const accrualChangeKindCtrl = me.down('[name=accrualChangeKind]')
    if (accrualChangeKindCtrl) {
      accrualChangeKindCtrl.setValueById(me.record.get('accrualChangeKind'))
      accrualChangeKindCtrl.setReadOnly(readOnly)
    }

    if (['POSTED'].includes(me.record.get('orderState'))) {
      me.attr.hrOrderNumber.setValue(me.record.get('entryOrderID.orderNumber'))
      me.attr.hrOrderDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.orderDate')))
      me.attr.hrEntryDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.entryDate')))
      me.attr.hrRespEmployee.setValue(me.record.get('entryOrderID.respEmployeePositionID.employeeID.fullFIO'))
    } else {
      me.actions.createOrder.setDisabled(false)
    }
    HR.orderManager.changeAction(me)
    if (docType === 'ACCRUAL') {
      me.attr.staffTableID.setDisabled(true)
      me.attr.changeListNumber.setDisabled(true)
    } else {
      me.attr.staffTableID.setDisabled(false)
      me.attr.changeListNumber.setDisabled(false)
    }
    me.setupRespEmployeePosition({
      positionID: me.record.get('respPositionID') || false,
      isReload: false,
      attrName: 'respPositionID'
    })
    me.setupRespEmployeePosition({
      positionID: me.record.get('respPosition2ID') || false,
      isReload: false,
      attrName: 'respPosition2ID'
    })
    me.setupRespEmployeePosition({
      positionID: me.record.get('respPosition3ID') || false,
      isReload: false,
      attrName: 'respPosition3ID'
    })
    me.setupRespEmployeePosition({
      positionID: me.record.get('respPosition4ID') || false,
      isReload: false,
      attrName: 'respPosition4ID'
    })
    me.setupRespEmployeePosition({
      positionID: me.record.get('respPosition5ID') || false,
      isReload: false,
      attrName: 'respPosition5ID'
    })
  }
  if (me.hideSigner4) {
    me.down('[name=signer4]').hide()
  }
  respEmployeeNumIDSet(me)

  me.setControlFilterByOrgID(me.record.get('orgID') || appAC.globalOrganization())

  HR.orderManager.disabledIf(me)
  if (me.isNewInstance) {
    AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('orgID') })
  } else {
    me.attr.departmentID.setReadOnly(true)
  }

  if (me.attr.staffTableAccrual.getStore().filters.items.length) {
    me.attr.staffTableAccrual.getStore().filters.items.forEach(item => {
      me.attr.staffTableAccrual.getStore().removeFilter(item)
    })
  }
  me.attr.staffTableAccrual.getStore().addFilter(row => !row.get('staffTableAccrualID'))
  me.setFilterOnRespPosition(me.record.get('orderDate') ? AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) : appAC.globalApplicationDate())
}

function setNextChangeListNumber (staffTableID) {
  const me = this
  UB.Repository('hr_staffTable')
    .attrs('changeListNumber')
    .where('staffTableID', '=', staffTableID)
    .orderBy('changeListNumber', 'desc')
    .selectSingle()
    .then(item => {
      if (item) me.attr.changeListNumber.setValue(item.changeListNumber + 1)
      else me.attr.changeListNumber.setValue(1)
    })
}

function setControlFilterByOrgID (orgID) {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.staffTableID, {
    orgID: orgID,
    orderState: 'POSTED'
  }, ['clearFilter'])
  AC.viewUtils.setFilterValue(me.attr.staffTabOrgStructID, {
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
    .orderBy('orderDate', 'desc')
    .selectSingle()
    .then(struct => {
      if (struct) me.attr.staffTabOrgStructID.setValueById(struct.ID)
      else me.attr.staffTabOrgStructID.clearValue()
    })
}

function setInitialStaffTable (orgID) {
  const me = this
  UB.Repository('hr_staffTable')
    .attrs('ID')
    .where('orgID', '=', orgID)
    .where('orderState', '=', 'POSTED')
    .where('docType', '=', 'NEW')
    .orderBy('orderDate', 'desc')
    .selectSingle()
    .then(staff => {
      if (staff) {
        me.attr.staffTableID.setValueById(staff.ID)
        if (!me.attr.changeListNumber.getValue()) {
          me.setNextChangeListNumber(staff.ID)
        }
      } else me.attr.staffTableID.clearValue()
    })
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  AC.documentManager.addDocumentAction(me)
  let createOrder = me.actions.createOrder
  if (!createOrder) {
    createOrder = new Ext.Action({
      actionId: 'createOrder',
      eventId: 'createOrder',
      // iconCls: 'iconCreateDoc',
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'canCreateOrder'),
      actionText: UB.i18n('Ввести в дію наказом'),
      text: UB.i18n('Ввести в дію наказом'),
      tooltip: UB.i18n('Ввести в дію наказом'),
      handler: function () {
        me.saveForm().then(result => {
          if (result !== -1) {
            UB.Repository('hr_empOrder')
              .attrs('ID')
              .where('staffTableID', '=', me.instanceID)
              .selectSingle().then(empOrder => {
                $App.doCommand({
                  cmdType: 'showForm',
                  entity: 'hr_empOrder',
                  formCode: 'hr_empOrder',
                  instanceID: empOrder && empOrder.ID,
                  cmpInitConfig: {
                    defaultValues: {
                      staffTableID: me.instanceID,
                      empOrderType: 'STAFFLIST',
                      organizationID: me.record.get('orgID'),
                      orderDate: AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')),
                      entryDate: AC.dateService.truncTimeToUtcNull(me.record.get('entryDate'))
                    }
                  },
                  tabId: new Date().getTime(),
                  target: $App.getViewport().centralPanel
                })
              })
          }
        })
      },
      scope: me
    })
    me.actions.createOrder = createOrder
  }
  if (!me.actions.printReports) {
    const printMenu = []
    HR.reportUtils.getOrderReportMenu(printMenu, 'STAFFLISTACCRUAL', me)
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
    disabled: true,
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
    disabled: true,
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
    disabled: true,
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
            me.down('recpanel').updateTree()
            HR.reportTab.setReportMode(me, 'view')
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
    disabled: true,
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
          if (!me.attr.staffTableID.isDisabled()) {
            me.setInitialStaffTable(value)
          }
        }
        break
      case 'docType':
        switch (field.getValue()) {
          case 'ACCRUAL':
            me.attr.staffTableID.setDisabled(true)
            me.attr.changeListNumber.setDisabled(true)
            me.attr.changeListNumber.setValue()
            me.attr.staffTableID.clearValue()
            break
          case 'ACCRUAL_CHANGES':
            me.attr.staffTableID.setDisabled(false)
            me.attr.changeListNumber.setDisabled(false)
            if (me.isNewInstance) me.setInitialStaffTable(me.record.get('orgID'))
            break
        }
        break
      case 'staffTableID':
        if (value) me.setNextChangeListNumber(value)
        break
      case 'respPositionID':
        if (!me.attr.respPositionID.skipChange) {
          me.attr.respEmployeePositionID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true,
            attrName: field.name
          })
        } else {
          me.attr.respPositionID.skipChange = false
        }
        me.record.set('respPosDescription', field.getFieldValue('description'))
        break
      case 'respPosition2ID':
        if (!me.attr.respPosition2ID.skipChange) {
          me.attr.respEmployeePosition2ID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true,
            attrName: field.name
          })
        } else {
          me.attr.respPosition2ID.skipChange = false
        }
        me.record.set('respPos2Description', field.getFieldValue('description'))
        break
      case 'respPosition3ID':
        if (!me.attr.respPosition3ID.skipChange) {
          me.attr.respEmployeePosition3ID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true,
            attrName: field.name
          })
        } else {
          me.attr.respPosition3ID.skipChange = false
        }
        me.record.set('respPos3Description', field.getFieldValue('description'))
        break
      case 'respPosition4ID':
        if (!me.attr.respPosition4ID.skipChange) {
          me.attr.respEmployeePosition4ID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true,
            attrName: field.name
          })
        } else {
          me.attr.respPosition4ID.skipChange = false
        }
        me.record.set('respPos4Description', field.getFieldValue('description'))
        break
      case 'respPosition5ID':
        if (!me.attr.respPosition5ID.skipChange) {
          me.attr.respEmployeePosition5ID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true,
            attrName: field.name
          })
        } else {
          me.attr.respPosition5ID.skipChange = false
        }
        me.record.set('respPos5Description', field.getFieldValue('description'))
        break
    }
  }
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

function getReportName () {
  const me = this
  const docType = me.record.get('docType') || me.attr.docType.getValue()
  return docType === 'ACCRUAL_CHANGES' ? 'hr_orgplanChanges' : 'hr_orgplanAccrual2'
}

function exportXLSX (me) {
  const gridData = me.attr.staffTableAccrual.getData()
  const viewData = []
  gridData.forEach(row => {
    if (row['staffTableAccrualID']) {
      viewData.push({
        positionType: row.positionType ? UB.core.UBEnumManager.getStore('HR_POSITION_TYPE').getById(row.positionType).get('name') : '',
        posName: row['dictPositionID.name'] || '',
        statePay: row['dictTarifCoeffID.description'] || row['dictStatePayID.description'] || '',
        fullName: row['positionID.fullName'],
        fullFIO: row['employeePositionID.employeeID.fullFIO'],
        quantity: row.quantity,
        previousAccrualSum: row.previousAccrualSum,
        accrualSum: row.accrualSum
      })
    }
  })
  $App.connection.run({
    entity: 'hr_staffTable',
    method: 'generateXLSX',
    viewData: JSON.stringify(viewData)
  }).then(response => {
    const data = JSON.parse(response.data)
    AC.filesService.saveAsByBase64Buffer(data, me.record.get('name') + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    me.setLoading(false)
  }, function (err) {
    me.setLoading(false)
    throw err
  })
}
function setAccrualSumByTarif (me) {
  me.setLoading(true)
  const store = me.attr.staffTableAccrual.getStore()
  const allRecords = store.snapshot || store.data
  const dictTarifCoeffIDs = []
  allRecords.each(record => {
    if (record.get('dictTarifCoeffID') && !dictTarifCoeffIDs.find(o => o === record.get('dictTarifCoeffID'))) {
      dictTarifCoeffIDs.push(record.get('dictTarifCoeffID'))
    }
  })
  if (dictTarifCoeffIDs.length) {
    me.setIsDirty(true)
    UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['dictTarifCoeffID', 'accrualSum'])
      .where('dictTarifCoeffID', 'in', dictTarifCoeffIDs)
      .where('dateFrom', '<=', AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')))
      .where('dateTo', '>=', AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')))
      .selectAsObject()
      .then(data => {
        Ext.suspendLayouts()
        me.attr.staffTableAccrual.suspendEvents()
        store.suspendEvents()
        data.forEach(row => {
          allRecords.each(record => {
            if (record.get('dictTarifCoeffID') === row.dictTarifCoeffID) {
              record.set('accrualSum', row.accrualSum)
            }
          })
        })
        me.setLoading(false)
        me.attr.staffTableAccrual.resumeEvents()
        store.resumeEvents()
        Ext.resumeLayouts(true)
        me.attr.staffTableAccrual.getView().refreshView()
      })
  } else {
    me.setLoading(false)
  }
}

function onExpandGridRow (me, rowNode, record, body, rowIndex) {
  const targetId = 'NestedGridRow-' + record.get('ID')
  if (Ext.getCmp(targetId + '_grid') == null || !rowNode.grid || !Ext.getElementById(`NestedGridRow-${record.get('ID')}_grid-body`)) {
    if (rowNode.grid) {
      rowNode.grid = null
    }
    const nestedGrid = Ext.create('AC.controls.AcGrid', {
      renderTo: targetId,
      id: targetId + '_grid',
      xtype: 'acGrid',
      name: `nestedGrid${record.get('ID')}`,
      flex: 1,
      autoScroll: true,
      cellEditing: true,
      notWriteChanges: true,
      storeType: 'local',
      showToolBar: false,
      disablePaging: true,
      loadMaskMessage: UB.i18n('Завантаження даних...'),
      hideActions: ['addNew', 'addNewByCurrent', 'del'],
      fields: [
        { name: 'ID' },
        { name: 'staffTableID' },
        { name: 'mi_modifyDate' },
        { name: 'positionType' },
        { name: 'staffTableAccrualID' },
        { name: 'quantity' },
        {
          name: 'positionID.fullName',
          columnConfig: {
            text: UB.i18n('Повна назва посади'),
            flex: 1
          }
        },
        { name: 'positionID' },
        {
          name: 'employeePositionID.employeeID.fullFIO',
          columnConfig: {
            text: UB.i18n('ПІБ'),
            flex: 1
          }
        },
        { name: 'employeePositionID' },
        {
          name: 'previousAccrualSum',
          columnConfig: {
            text: UB.i18n('Оклад'),
            width: 150,
            floatFormat: 2,
            align: 'right'
          }
        },
        {
          name: 'accrualSum',
          columnConfig: {
            text: UB.i18n('Новий оклад'),
            width: 150,
            floatFormat: 2,
            align: 'right',
            editor: {
              dataType: 'Currency',
              decimalPrecision: 2,
              minValue: 0
            }
          }
        }
      ],
      onBeforeEdit: (control, context) => {
        if (['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.record.get('orderState'))) {
          return false
        }
      },
      edit: function (control, context) {
        const parentData = me.attr.staffTableAccrual.getStore()
        const parentRecord = parentData.snapshot.findBy(record => { return record.get('ID') === context.record.get('ID') })
        if (parentRecord) {
          parentRecord.set('accrualSum', context.record.get('accrualSum'))
        }
        me.setIsDirty(true)
      }
    })

    rowNode.grid = nestedGrid
    nestedGrid.getEl().swallowEvent(['mousedown', 'mouseup', 'click',
      'contextmenu', 'mouseover', 'mouseout', 'dblclick', 'mousemove', 'focusmove',
      'focuschange', 'focusin', 'focusenter'])
    nestedGrid.fireEvent('bind', nestedGrid, { guid: record.get('guid') })
  }
  const gridData = me.attr.staffTableAccrual.getData()
  const nestedData = []
  gridData.forEach(row => {
    if (row.staffTableAccrualID === record.get('ID')) {
      nestedData.push(row)
    }
  })
  rowNode.grid.setLocalStoreData(nestedData)
}

function setupRespEmployeePosition ({
  positionID = false,
  attrName = 'respPositionID',
  isReload = false,
  isClear = false
}) {
  const me = this
  let respEmployeePosition
  switch (attrName) {
    case 'respPositionID':
      positionID = positionID || 0
      respEmployeePosition = me.getField('respEmployeePositionID')
      break
    case 'respPosition2ID':
      positionID = positionID || 0
      respEmployeePosition = me.getField('respEmployeePosition2ID')
      break
    case 'respPosition3ID':
      positionID = positionID || 0
      respEmployeePosition = me.getField('respEmployeePosition3ID')
      break
    case 'respPosition4ID':
      positionID = positionID || 0
      respEmployeePosition = me.getField('respEmployeePosition4ID')
      break
    case 'respPosition5ID':
      positionID = positionID || 0
      respEmployeePosition = me.getField('respEmployeePosition5ID')
      break
  }
  const store = respEmployeePosition.getStore()
  store.ubRequest.positionID = positionID
  store.ubRequest.onDate = appAC.globalApplicationDate()
  store.ubRequest.method = 'getTempExecution'
  if (isClear) {
    respEmployeePosition.setValue(null)
  }
  if (isReload) {
    store.load().then(() => {
      respEmployeePosition.clearIsPhantom()
      me.attr[attrName].clearIsPhantom()
    })
  }
  respEmployeePosition.clearIsPhantom()
  me.attr[attrName].clearIsPhantom()
}
function setFilterOnRespPosition (onDate) {
  const me = this
  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPosition3ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPosition3ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPosition4ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPosition4ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPosition5ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPosition5ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate

  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = me.record.get('orgID')
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = me.record.get('orgID')
  me.attr.respPosition3ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = me.record.get('orgID')
  me.attr.respPosition4ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = me.record.get('orgID')
  me.attr.respPosition5ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = me.record.get('orgID')

  AC.viewUtils.setWhereListProperty(me.attr.respPositionID, [
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])

  AC.viewUtils.setWhereListProperty(me.attr.respPosition2ID, [
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])

  AC.viewUtils.setWhereListProperty(me.attr.respPosition3ID, [
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])

  AC.viewUtils.setWhereListProperty(me.attr.respPosition4ID, [
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])

  AC.viewUtils.setWhereListProperty(me.attr.respPosition5ID, [
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ])
}
