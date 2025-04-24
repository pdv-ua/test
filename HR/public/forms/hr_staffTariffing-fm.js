/* global AC appAC HR $App Ext UB */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  addBaseActions,
  onBeforeSave,
  onCheckValidBeforeSaveOrder,
  getReportName,
  postInit,
  setControlFilterByOrgID,
  setupRespEmployeePosition,
  setFilterOnRespPosition,
  checkReadOnly,
  createTariffingGrid,
  loadGridData,
  onGridEdit,
  reloadData,
  beforeCancelPosting
}

function initComponentStart () {
  const me = this

  const reportConfig = {
    settings: {
      pageOrientation: 'landscape',
      margin: {
        top: 13.5,
        right: -2,
        bottom: 13.5,
        left: 2
      }
    }
  }
  me.reportMode = 'view'
  me.reportSettings = reportConfig.settings
  me.hideSigner4 = !AC.settings.get('hrTwoApproverInStaffTable', appAC.globalOrganization())

  me.gridConfig = {
    attrs: ['staffTreeControl']
  }

  me.on('controlChanged', onControlChanged, me)

  HR.orderManager.setOrderConfig(me)
  HR.orderManager.init(me)
}

function initOrderComponentDone () {
  const me = this
  ;['mtCountOrg', 'mtCountVacOrg', 'fundMonthOrg', 'mtCountDep', 'mtCountVacDep', 'fundMonthDep', 'showOnlyVacancy'].forEach(attrName => {
    me.attr[attrName] = me.down(`[name=${attrName}]`)
  })
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
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
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
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED'].includes(me.record.get('orderState'))) {
    HR.reportTab.setReportMode(me, 'view')
  }
  me.readOnly = !(me.record.get('orderState') === 'PROJECT')
  me.createTariffingGrid().then(() => {
    me.attr.grid.setReadOnly(me.readOnly)
  })
}

function onFormDataReady () {
  const me = this
  const orderState = me.record.get('orderState')
  const readOnly = me.readOnly
  me.attr.staffTreeControl.orderID = me.instanceID
  me.attr.staffTreeControl.orderState = orderState
  if (me.isNewInstance) {
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    me.record.set('name', '-')
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
  } else {
    me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('entryDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
    me.attr.staffTreeControl.onDate = AC.dateService.truncTimeToUtcNull(me.record.get('entryDate'))
    me.attr.staffTreeControl.organization = me.record.get('orgID')
    me.attr.staffTreeControl.orgIDs = [me.record.get('orgID')]
    const componentStub = me.attr.staffTreeControl.dockedItems.items[0].items.items.find(o => o.name.startsWith('componentStub'))
    if (componentStub) {
      componentStub.hide()
    }
    const node = me.attr.staffTreeControl.tree.store.getRootNode()
    if (node) {
      me.attr.staffTreeControl.clearTree(node)
      me.attr.staffTreeControl.rootID = me.record.get('departmentID') || me.record.get('orgID')
      me.attr.staffTreeControl.appendItems([me.record.get('departmentID') || me.record.get('orgID')], node)
    }
    /*
    if (['ON_RECONCILATION', 'POSTED', 'PROCESSED'].includes(me.record.get('orderState'))) {
      me.actions.createOrder.setDisabled(true)
    }
    */
    me.attr.entryDate.setReadOnly(true)
    me.attr.orgID.setReadOnly(true)
    me.attr.respEmployeeNumID.setReadOnly(readOnly)
    me.attr.orderNumber.setReadOnly(readOnly)
    me.attr.name.setReadOnly(readOnly)
    me.attr.textOrder.setReadOnly(readOnly)
    me.attr.comment.setReadOnly(readOnly)
    me.attr.staffTreeControl.setReadOnly(readOnly)
    me.down('recpanel').setCanEdit(!readOnly)

    if (!(me.record.get('orderState') === 'PROJECT')) {
      me.attr.staffTreeControl.setReadOnly(true)
    } else {
      me.attr.staffTreeControl.setReadOnly(false)
    }
    HR.orderManager.changeAction(me)
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
  if (me.isNewInstance) {
    AC.viewUtils.setWhereListProperty(me.attr.departmentID, [
      ['orgID', '=', me.record.get('orgID')]
    ])
  } else {
    me.attr.departmentID.setReadOnly(true)
  }

  respEmployeeNumIDSet(me)
  me.setControlFilterByOrgID(me.record.get('orgID') || appAC.globalOrganization())

  me.setFilterOnRespPosition(me.record.get('orderDate') ? AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) : appAC.globalApplicationDate())
  HR.orderManager.showIf(me)
  HR.orderManager.disabledIf(me)
  HR.orderManager.requiredIf(me)
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

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask', 'checkData', 'calculateTariffing', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: {
        action: ['fDelete', 'startReconciliation', 'checkData', 'createOrder', 'postingAction', 'calculateTariffing']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation', 'checkData']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation', 'checkData']
      },
      RECONCILED: {
        action: ['checkData', 'postingAction']
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask', 'checkData']
      },
      ON_COMPLETION: {
        action: ['fDelete', 'startReconciliation', 'checkData', 'postingAction']
      },
      POSTED: {
        action: ['cancelPostingAction']
      },
      PROCESSED: {
        action: []
      }
    }
  }
  me.callParent(arguments)
  if (!me.actions.printReports) {
    const printMenu = []
    HR.reportUtils.getOrderReportMenu(printMenu, 'TARIFFING', me)
    me.actions.printReports = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printReports',
      eventId: 'printReports',
      menu: printMenu
    })
  }
  if (!me.actions.calculateTariffing) {
    me.actions.calculateTariffing = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calculateTariffing',
      eventId: 'calculateTariffing',
      disabled: true,
      handler: function () {
        $App.dialogYesNo('Попередження', UB.i18n('Оновити розрахунок?'))
          .then(function (choice) {
            if (choice) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_staffTariffing',
                method: 'recalcDepData',
                parentUnitID: me.record.get('departmentID') || 0,
                staffTariffingID: me.instanceID
              }).then(() => {
                reloadData(me)
              }).finally(() => {
                me.setLoading(false)
              })
            }
          })
      }
    })
  }
  if (!me.actions.checkData) {
    me.actions.checkData = new Ext.Action({
      iconCls: 'fas fa-check-double',
      cls: 'fill-action',
      actionId: 'checkData',
      eventId: 'checkData',
      tooltip: UB.i18n('Перевірити'),
      text: UB.i18n('Перевірити'),
      handler: function () {
        const reportCode = 'hr_tarriffingPlanCheck'
        $App.doCommand({
          cmdType: 'showReport',
          cmdData: {
            reportCode,
            reportType: 'html',
            reportOptions: {
              allowExportToExcel: true
            },
            reportParams: {
              instanceID: me.instanceID
            }
          },
          tabId: 'report_' + reportCode + '_' + (me.instanceID || 0),
          target: $App.getViewport().centralPanel
        })
      }
    })
  }
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    disabled: true,
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
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_recstage',
            method: 'startReconciliation',
            docID: me.record.get('ID')
          }).then(function () {
            me.setLoading(false)
            return me.loadInstance()
          }).then(function () {
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
    disabled: true,
    handler: function () {
      $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
        .then(function (res) {
          if (res) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_recstage',
              method: 'stopReconciliation',
              docID: me.record.get('ID')
            }).then(function () {
              me.setLoading(false)
              return me.loadInstance()
            }).then(function () {
              me.down('recpanel').updateTree()
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })
  HR.orderManager.addOrderAction(me)
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
            .misc({
              __mip_ondate: AC.dateService.truncTimeToUtcNull(value)
            })
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
  me.reportExtraParams = {
    orgID: me.record.get('orgID'),
    onDate: me.record.get('entryDate')
  }
  return 'hr_tariffingPlan'
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

function checkReadOnly () {
  return ['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED'].includes(this.record.get('orderState'))
}

async function createTariffingGrid () {
  const me = this
  const gridFields = [
    { name: 'ID' },
    { name: 'staffTariffingID' },
    { name: 'mi_modifyDate' },
    { name: 'positionID' },
    { name: 'mi_data_id' },
    { name: 'liquidate' },
    { name: 'state' },
    { name: 'accrualDt' },
    { name: 'employeePositionID' },
    {
      name: 'positionID.name',
      columnConfig: {
        text: UB.i18n('Назва посади'),
        sortBy: 'String',
        filterBy: 'string',
        width: 300,
        renderer: (value, meta, record) => {
          if (record.get('mtCount') < 0) {
            meta.tdCls = 'grd-color-red'
          }
          return value
        }
      }
    },
    { name: 'dictPositionID' },
    {
      name: 'employeePositionID.description',
      columnConfig: {
        text: UB.i18n('Призначення'),
        sortBy: 'String',
        filterBy: 'string',
        width: 300,
        renderer: (value, meta, record) => {
          if (!record.get('employeePositionID') && record.get('mtCount') > 0) {
            meta.tdCls = 'grd-italic'
          }
          return record.get('employeePositionID') ? value : (record.get('mtCount') > 0 ? UB.i18n('(вакансія)') : '')
        },
        editor: {
          dataType: 'Entity',
          hideEntityItemInContext: true,
          associatedEntity: 'hr_employeePositionS',
          allowBlank: true,
          disableClearSelection: true,
          disableContextMenu: true,
          storeAttributeValueField: 'employeePositionID',
          fieldList: ['ID', 'description', 'employeeNumberID', 'employeeID', 'posName', 'employeeID.fullFIO'],
          whereList: {
            organizationID: {
              expression: '[organizationID]',
              condition: '=',
              value: me.record.get('organizationID') || appAC.globalOrganization()
            },
            dateFrom: {
              expression: '[dateFrom]',
              condition: '<=',
              value: me.record.get('entryDate')
            },
            dateTo: {
              expression: '[dateTo]',
              condition: '>=',
              value: me.record.get('entryDate')
            }
          }
        }
      }
    },
    {
      name: 'workPlace',
      columnConfig: {
        dataType: 'Enum',
        enumGroup: 'HR_WORKER_PLACE',
        text: UB.i18n('Місце роботи'),
        sortBy: 'String',
        filterBy: 'string',
        width: 100,
        editor: {
          dataType: 'Enum',
          enumGroup: 'HR_WORKER_PLACE',
          allowBlank: false,
          useForGridEdit: false,
          storeAttributeFieldName: 'code',
          storeAttributeValueField: 'workPlace',
          displayField: 'name',
          ubRequest: {
            entity: 'ubm_enum',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['code', 'name', 'eGroup', 'sortOrder']
          }
        }
      }
    },
    {
      name: 'quantity',
      columnConfig: {
        text: UB.i18n('Посад'),
        width: 100,
        floatFormat: 2,
        align: 'right',
        sortBy: 'Number',
        filterBy: 'float',
        renderer: (value, meta, record) => {
          if (record.get('quantity') < 0) {
            meta.tdCls = 'grd-color-red'
          }
          return value
        }
      }
    },
    {
      name: 'baseSum',
      columnConfig: {
        text: UB.i18n('Оклад'),
        width: 150,
        floatFormat: 2,
        align: 'right',
        sortBy: 'Number',
        filterBy: 'float',
        editor: {
          dataType: 'Currency',
          decimalPrecision: 2,
          minValue: 0
        }
      }
    },
    {
      name: 'mtCount',
      columnConfig: {
        text: UB.i18n('Ставок'),
        width: 150,
        floatFormat: 2,
        align: 'right',
        sortBy: 'Number',
        filterBy: 'float',
        editor: {
          dataType: 'Currency',
          decimalPrecision: 2,
          minValue: 0
        },
        renderer: (value, meta, record) => {
          if (record.get('mtCount') < 0) {
            meta.tdCls = 'grd-color-red'
          }
          return value
        }
      }
    }
  ]
  const tariffingPayEl = await UB.Repository('hr_dictTariffingPayEl')
    .attrs('ID', 'nameColumn', 'itemIdx', 'payElID')
    .where('organizationID', 'isNull', undefined, 'orgIsNull')
    .where('organizationID', '=', me.record.get('orgID'), 'org')
    .orderBy('itemIdx', 'asc')
    .logic('([org] OR [orgIsNull])')
    .selectAsObject()

  tariffingPayEl.forEach(row => {
    gridFields.push({
      name: `payEl_${row['payElID']}`,
      columnConfig: {
        text: row['nameColumn'],
        width: 100,
        sortBy: 'String'
      }
    })
  })
  gridFields.push({
    name: 'fundMonth',
    columnConfig: {
      text: UB.i18n('ФОП'),
      width: 150,
      floatFormat: 2,
      align: 'right',
      sortBy: 'Number',
      filterBy: 'float'
    }
  })
  gridFields.push({ name: 'dictTarifCoeffID' })
  gridFields.push({
    name: 'dictTarifCoeffID.code',
    columnConfig: {
      text: UB.i18n('Тарифний розряд'),
      sortBy: 'String',
      filterBy: 'string',
      width: 100,
      editor: {
        dataType: 'Entity',
        hideEntityItemInContext: true,
        associatedEntity: 'hr_dictTarifCoeff',
        allowBlank: true,
        disableClearSelection: false,
        // disableContextMenu: true,
        storeAttributeValueField: 'dictTarifCoeffID',
        fieldList: ['ID', 'code'],
        whereList: {
          dateFrom: {
            expression: '[dateFrom]',
            condition: '<=',
            value: me.record.get('entryDate')
          },
          dateTo: {
            expression: '[dateTo]',
            condition: '>=',
            value: me.record.get('entryDate')
          }
        }
      }
    }
  })
  gridFields.push({
    name: 'dateFrom',
    columnConfig: {
      text: UB.i18n('Дата початку дії'),
      width: 100,
      dateFormat: 'd.m.Y'
    }
  })
  gridFields.push({
    name: 'dateTo',
    columnConfig: {
      text: UB.i18n('Дата закінчення дії'),
      width: 100,
      renderer: (value, meta, record) => {
        return AC.dateService.isMaxDate(record.get('dateTo')) ? '' : AC.dateService.formatDate(value)
      }
    }
  })

  const grid = Ext.create('AC.controls.AcGrid', {
    xtype: 'acGrid',
    name: 'staffTariffing',
    flex: 1,
    autoScroll: true,
    notWriteChanges: true,
    storeType: 'local',
    split: true,
    region: 'center',
    showToolBar: true,
    margin: '5 0 0 0',
    // enableMultifilter: true,
    disablePaging: true,
    cellEditing: true,
    selType: 'cellmodel',
    loadMaskMessage: UB.i18n('Завантаження даних...'),
    hideActions: ['addNew', 'addNewByCurrent', 'del'],
    includeCustomReadOnly: ['addPos', 'recalcTariffing'],
    fields: gridFields,
    onBeforeEdit: function (ctrl, context) {
      const me = context.grid.up('form')
      if (context.record.get('liquidate')) {
        return false
      }
      /*
      if (context.field === 'mtCount' && !context.record.get('employeePositionID')) {
        return false
      }
      */
      if (context.field === 'employeePositionID.description') {
        AC.viewUtils.setWhereListProperty(context.column.field, [
          [ 'organizationID', '=', me.record.get('orgID') ],
          [ 'dateFrom', '<=', me.record.get('entryDate') ],
          [ 'dateTo', '>=', me.record.get('entryDate') ]
        ])
      }
      if (context.field === 'dictTarifCoeffID.code') {
        AC.viewUtils.setWhereListProperty(context.column.field, [
          [ 'dateFrom', '<=', me.record.get('entryDate') ],
          [ 'dateTo', '>=', me.record.get('entryDate') ]
        ])
      }
    },
    getRowClass: function (record, rowIndex, rowParams, store) {
      return record.get('liquidate') ? 'grd-color-brown' : (record.get('state') === 'NEW' ? (record.get('positionID') === record.get('mi_data_id') ? 'grd-color-lightgreen' : 'grd-color-blue') : '')
    },
    edit: (control, context) => {
      const me = context.grid.up('form')
      return me.onGridEdit(context)
    },
    customToolBarActions: [
      {
        tooltip: UB.i18n('Оновити'),
        name: 'reload',
        iconCls: 'u-icon-refresh',
        handler: function (btn) {
          const me = btn.up('form')
          const selectedNode = me.attr.staffTreeControl.getCurrentRecord()
          me.loadGridData(me.attr.staffTreeControl.getRawNode(selectedNode))
        }
      },
      {
        tooltip: UB.i18n('Додати посаду'),
        name: 'addPos',
        iconCls: 'briefcase-plus-icon',
        hidden: me.readOnly,
        handler: function (btn) {
          const me = btn.up('form')
          const parentNode = me.attr.staffTreeControl.getCurrentRecord()
          if (!parentNode) return
          me.attr.staffTreeControl.addItem(parentNode, 'hr_position', {}, {
            onAfterClose: () => {
              reloadData(me)
            }
          })
        }
      },
      {
        tooltip: UB.i18n('Розрахувати'),
        name: 'recalcTariffing',
        iconCls: 'fas fa-calculator',
        cls: 'fill-action',
        hidden: me.readOnly,
        handler: function (btn) {
          const me = btn.up('form')
          const parentNode = me.attr.staffTreeControl.getCurrentRecord()
          if (!parentNode) return
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_staffTariffing',
            method: 'recalcDepData',
            parentUnitID: parentNode.get('mi_data_id'),
            staffTariffingID: me.instanceID
          }).then(() => {
            reloadData(me)
          }).finally(() => {
            me.setLoading(false)
          })
        }
      },
      {
        tooltip: UB.i18n('Друк тарифікації'),
        name: 'printDepTariffing',
        iconCls: 'fas fa-print',
        cls: 'blue-action',
        handler: function (btn) {
          const me = btn.up('form')
          const selectedNode = me.attr.staffTreeControl.getCurrentRecord()
          if (!selectedNode) return
          const reportCode = me.getReportName()
          let repConfig = {
            cmdType: 'showReport',
            cmdData: {
              reportCode,
              reportType: 'html',
              reportOptions: {
                allowExportToExcel: true
              },
              reportParams: {
                instanceID: me.instanceID,
                onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
                childDepID: selectedNode.get('mi_data_id'),
                rootID: selectedNode.parentNode.get('mi_data_id')
              }
            },
            tabId: 'report_' + reportCode + '_' + (me.instanceID || 0),
            target: $App.getViewport().centralPanel
          }
          $App.doCommand(repConfig)
        }
      }
    ],
    customContextActions: [
      {
        text: UB.i18n('Редагувати посаду'),
        tooltip: UB.i18n('Редагувати посаду'),
        name: 'editPosItem',
        iconCls: 'fa fa-pencil',
        handler: function (btn) {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          editPosition(me, record)
        }
      },
      {
        text: UB.i18n('Редагувати нарахування'),
        tooltip: UB.i18n('Редагувати нарахування'),
        name: 'editAccrualsItem',
        iconCls: 'fas fa-money-check',
        handler: function () {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if (!record.ID || record.liquidate) {
            return
          }
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_staffTariffingPosAccruals',
            cmpInitConfig: {
              recordID: record.ID,
              accrualDt: record.accrualDt
            },
            isModal: true,
            customParams: {
              onClose: function () {
                reloadData(me)
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Копіювати посаду'),
        tooltip: UB.i18n('Копіювати посаду'),
        name: 'copyPosItem',
        iconCls: 'fa fa-copy',
        handler: function () {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          const parentNode = me.attr.staffTreeControl.getCurrentRecord()
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_staffTreeCopyPosParams',
            sender: me.attr.staffTreeControl,
            parentNode: parentNode,
            cmpInitConfig: {
              defaultValues: {
                sourceID: record.positionID,
                staffTableID: me.instanceID,
                onDate: me.record.get('entryDate'),
                parentID: parentNode.get('mi_data_id'),
                rootID: me.attr.staffTreeControl.rootID,
                orgID: me.record.get('orgID')
              }
            },
            customParams: {
              onClose: function () {
                reloadData(me)
              }
            }
          })
        }
      },
      {
        text: UB.i18n('Ліквідувати'),
        tooltip: UB.i18n('Ліквідувати'),
        iconCls: 'fas fa-times-circle',
        name: 'liquidate',
        handler: function () {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if (!record.positionID || record.liquidate) {
            return
          }
          $App.dialogYesNo('Попередження', UB.i18n(`Ліквідувати {0}?`, record['positionID.name']))
            .then(function (choice) {
              if (choice) {
                me.setLoading(true)
                $App.connection.run({
                  entity: 'hr_staffUnit',
                  method: 'liquidate',
                  instanceID: record.positionID,
                  onDate: me.record.get('entryDate'),
                  orderID: me.instanceID,
                  empOrderType: me.attr.staffTreeControl.empOrderType
                }).then(() => {
                  reloadData(me)
                }).finally(() => {
                  me.setLoading(false)
                })
              }
            })
        }
      },
      {
        text: UB.i18n('Відновити ліквідування'),
        tooltip: UB.i18n('Відновити ліквідування'),
        iconCls: 'fa fa-repeat',
        name: 'restore',
        handler: function (item) {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if ((!record.positionID || !record.liquidate) && record.state !== 'NEW') {
            return
          }
          const parentNode = me.attr.staffTreeControl.getCurrentRecord()
          if (parentNode.getData().liquidate) {
            $App.dialogInfo(UB.i18n(`Необхідно спочатку відновити {0}`, parentNode.getData().text))
            return
          }
          $App.dialogYesNo('Попередження', UB.i18n(`Відновити {0}?`, record['positionID.name']))
            .then(function (choice) {
              if (choice) {
                me.setLoading(true)
                $App.connection.run({
                  entity: 'hr_staffUnit',
                  method: 'restore',
                  instanceID: record.positionID,
                  onDate: me.record.get('entryDate'),
                  orderID: me.instanceID
                }).then(() => {
                  reloadData(me)
                }).finally(() => {
                  me.setLoading(false)
                })
              }
            })
        }
      },
      {
        text: UB.i18n('Відновити зміни'),
        tooltip: UB.i18n('Відновити зміни'),
        iconCls: 'fa fa-broom',
        name: 'restoreChanges',
        handler: function () {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if ((!record.positionID || !record.liquidate) && record.state !== 'NEW') {
            return
          }
          $App.dialogYesNo('Попередження', UB.i18n(`Відновити {0}?`, record['positionID.name']))
            .then(function (choice) {
              if (choice) {
                me.setLoading(true)
                $App.connection.run({
                  entity: 'hr_staffUnit',
                  method: 'restoreChanges',
                  instanceID: record.positionID,
                  onDate: me.record.get('entryDate'),
                  orderID: me.instanceID
                }).then(() => {
                  reloadData(me)
                }).finally(() => {
                  me.setLoading(false)
                })
              }
            })
        }
      },
      {
        text: UB.i18n('Встановити нарахування з призначення'),
        tooltip: UB.i18n('Встановити нарахування з призначення'),
        iconCls: 'fas fa-angle-double-down',
        name: 'copyAccrualsFromEmpPos',
        handler: function (item) {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if (!record.employeePositionID) {
            return
          }
          $App.dialogYesNo('Попередження', UB.i18n(`Встановити нарахування з призначення {0}?`, record['employeePositionID.description']))
            .then(function (choice) {
              if (choice) {
                me.setLoading(true)
                $App.connection.run({
                  entity: 'hr_staffTariffing',
                  method: 'copyAccrualsFromEmpPos',
                  employeePositionID: record.employeePositionID,
                  recordID: record.ID,
                  onDate: me.record.get('entryDate'),
                  staffTariffingID: me.instanceID
                }).then(() => {
                  reloadData(me)
                }).finally(() => {
                  me.setLoading(false)
                })
              }
            })
        }
      },
      {
        text: UB.i18n('Розрахувати'),
        tooltip: UB.i18n('Оновити розрахунок'),
        iconCls: 'fas fa-calculator',
        name: 'recalcPosData',
        handler: function () {
          const grid = this.parentMenu.grid
          const me = grid.up('form')
          const record = this.parentMenu.record.raw
          if (!record.positionID) {
            return
          }
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_staffTariffing',
            method: 'recalcPosData',
            recordID: record.ID,
            staffTariffingID: me.instanceID
          }).then(() => {
            reloadData(me)
          }).finally(() => {
            me.setLoading(false)
          })
        }
      }
    ]
  })
  me.down('[name=staffTariffingPanel]').add(grid)
  me.attr.grid = grid
  return true
}

function loadGridData (nodeRecord) {
  const me = this
  const grid = me.down('[name=staffTariffing]')
  grid.setLoading(true)
  return $App.connection.run({
    entity: 'hr_staffTariffing',
    method: 'getDetailsData',
    staffTariffingID: me.instanceID,
    parentUnitID: nodeRecord['mi_data_id'],
    onDate: me.record.get('entryDate'),
    isVacancy: me.attr.showOnlyVacancy.getValue(),
    orgID: me.record.get('orgID') || appAC.globalOrganization()
  }).then((mParams) => {
    const tariffingData = JSON.parse(mParams.resultData)
    const totalData = JSON.parse(mParams.totals)
    me.attr['mtCountOrg'].setText(AC.currencyService.formatAsCurrencyEx(totalData['mtCountOrg']))
    me.attr['mtCountVacOrg'].setText(AC.currencyService.formatAsCurrencyEx(totalData['mtCountVacOrg']))
    me.attr['mtCountDep'].setText(AC.currencyService.formatAsCurrencyEx(totalData['mtCountDep']))
    me.attr['mtCountVacDep'].setText(AC.currencyService.formatAsCurrencyEx(totalData['mtCountVacDep']))
    me.attr['fundMonthOrg'].setText(AC.currencyService.formatAsCurrencyEx(totalData['fundMonthOrg']))
    me.attr['fundMonthDep'].setText(AC.currencyService.formatAsCurrencyEx(totalData['fundMonthDep']))
    grid.setLocalStoreData(tariffingData)
    grid.setLoading(false)
    return true
  }, err => {
    grid.setLoading(false)
    throw err
  })
}

function reloadData (me) {
  const selectedNode = me.attr.staffTreeControl.getCurrentRecord()
  if (selectedNode) {
    me.loadGridData(me.attr.staffTreeControl.getRawNode(selectedNode))
  }
}

function editPosition (me, record) {
  const onDate = AC.dateService.shiftDate(me.record.get('entryDate'))

  function afterNodeEdit () {
    reloadData(me)
  }

  if (record.state !== 'NEW') {
    HR.treeUtils.checkFutureVersion(record.positionID, record['mi_data_id'], onDate).then(result => {
      if (result) {
        HR.treeUtils.newVersionPos(record.positionID, me.instanceID, onDate, afterNodeEdit, {
          rootID: me.attr.staffTreeControl.rootID
        })
      }
    })
  } else {
    const config = {
      cmdType: 'showForm',
      formCode: 'hr_position',
      entity: 'hr_position',
      instanceID: record.positionID,
      sender: me,
      __mip_ondate: false,
      cmpInitConfig: {
        afterClose: afterNodeEdit
      },
      customParams: {
        rootID: me.attr.staffTreeControl.rootID || appAC.globalOrganization()
      }
    }
    if (me.record.get('orderState') && me.record.get('orderState') !== 'PROJECT') {
      config.cmpInitConfig.customSettings = {
        readOnly: true
      }
    }
    $App.doCommand(config)
  }
}

function onGridEdit (context) {
  const me = this
  const record = context.record
  if (Object.keys(record.modified).length > 0) {
    me.setLoading(true)
    const params = record.getData()
    params.modified = record.modified
    $App.connection.run({
      entity: 'hr_staffTariffing',
      method: 'savePosData',
      execParams: params,
      staffTariffingID: me.instanceID
    }).then(() => {
      reloadData(me)
    }).finally(() => {
      me.setLoading(false)
    })
  }
}

function beforeCancelPosting () {
  const me = this
  return UB.Repository('hr_empOrderStafftablemoveDet')
    .attrs('ID', 'orderID', 'orderID.description')
    .where('staffTariffingID', '=', me.instanceID)
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.mi_deleteDate', '=', '#maxdate')
    .limit(1)
    .selectSingle().then(item => {
      if (item) {
        return $App.dialogError(UB.i18n('Неможливо відмінити проведення. {0} проведено!', item['orderID.description']), UB.i18n('Увага!')).then(() => {
          return Promise.resolve(false)
        })
      }
      return Promise.resolve(true)
    })
}
