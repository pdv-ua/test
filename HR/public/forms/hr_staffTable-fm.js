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
  setInitialOrgStruct,
  setInitialStaffTable,
  postInit,
  setControlFilterByOrgID,
  setOrderDate,
  setFormTitle,
  setNextChangeListNumber,
  addOrgStructure,
  onGridEdit,
  fillSalaryByTarif,
  fillSalaryByScheme,
  fillSalaryByAccrual,
  onAfterMassSalaryChange,
  onAfterMassAccrualChange,
  applySalaryChanges,
  cancelSalaryChanges,
  deleteSalaryChanges,
  applyAccrualChanges,
  cancelAccrualChanges,
  deleteAccrualChanges,
  onValidateSalaryChangeRowEdit,
  fillAccrualChanges,
  askOrderDate,
  setupRespEmployeePosition,
  calculateAccrualsBySalary,
  setFilterOnRespPosition,
  checkReadOnly,
  deletePosChanges,
  applyPosChanges,
  cancelPosChanges,
  loadPosChanges
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
            me.askOrderDate()
          })
        me.record.set('docType', 'NEW')
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
  const reportConfig = {
    settings: {
      pageOrientation: /* AC.settings.get('hrStaffReportShowAccrual', appAC.globalOrganization()) ? 'landscape' : */ 'portrait',
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

  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', beforeSave, me)

  me.gridConfig = {
    detailGrids: ['staffTableAccrual'],
    attrs: ['staffTreeControl']
  }

  me.orderActions = {
    actions: ['fDelete', 'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask', 'checkQuantity', 'createOrder'],
    state: {
      PROJECT: {
        action: ['fDelete', 'startReconciliation', 'checkQuantity', 'createOrder']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation', 'checkQuantity']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation', 'checkQuantity']
      },
      RECONCILED: {
        action: ['checkQuantity', 'createOrder']
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask', 'checkQuantity']
      },
      ON_COMPLETION: {
        action: ['fDelete', 'startReconciliation', 'checkQuantity']
      },
      POSTED: {
        action: ['checkQuantity']
      },
      PROCESSED: {
        action: ['checkQuantity']
      }
    }
  }
  HR.orderManager.setOrderConfig(me)
  AC.acEditGridManager.init(me)
  me.onBeforeSave = onBeforeSave
}

function onInitComponentDone () {
  const me = this
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Переглянути Штатний розпис'),
    name: 'actionShowStaffTable',
    handler: function () {
      const tabPanel = me.down('tabpanel')
      const tabStaffTable = tabPanel.down('[name=staffTreePanel]')
      if (tabStaffTable) {
        tabStaffTable.tab.show()
      }
    }
  })
  allActions.menu.add({
    text: UB.i18n('Вид змін'),
    name: 'isSecondaryChanges',
    hidden: true,
    handler: function (item) {
      const tree = me.down('[name=staffTreeControl]')
      const node = tree.getCurrentRecord()
      const raw = tree.getRawNode(node)
      let message = `${raw.isSecondaryChanges === '' ? 'Змінити ознаку змін з невідомих на неосновні'
        : (raw.isSecondaryChanges ? 'Змінити ознаку змін з неосновних на основні' : 'Змінити ознаку змін з основних на неосновні')}?`
      $App.dialogYesNo(UB.i18n('Попередження'), message)
        .then(isAgree => {
          if (isAgree) {
            $App.connection.run({
              entity: raw.mi_unityEntity,
              method: 'update',
              __skipOptimisticLock: true,
              execParams: {
                ID: raw.ID,
                isSecondaryChanges: !raw.isSecondaryChanges ? 1 : 0
              }
            }).then(() => {
              raw.isSecondaryChanges = !raw.isSecondaryChanges ? 1 : 0
              item.setText(raw.isSecondaryChanges === '' ? UB.i18n('Невідомі зміни') : raw.isSecondaryChanges ? UB.i18n('Неосновні зміни') : UB.i18n('Основні зміни'))
              AC.viewUtils.showToast(UB.i18n('Ознаку успішно змінено'))
            }).catch(e => {
              AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
            })
          }
        })
    }
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
    me.record.set('docType', 'CHANGES')
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
    me.setInitialOrgStruct(me.record.get('orgID'))
    me.attr.docType.setValue('NEW')
    me.record.set('docInfo', AC.settings.get('hrDocInfoForOrgstruct', me.record.get('orgID')))
  }
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED'].includes(me.record.get('orderState'))) {
    HR.reportTab.setReportMode(me, 'view')
    me.down('[name=addPositionBtn]').hide()
    me.down('[name=applyChangesBtn]').hide()
    me.down('[name=applyChangesBtn]').setDisabled(true)
    me.down('[name=cancelChangesBtn]').setDisabled(true)
    me.down('[name=deleteChangesBtn]').setDisabled(true)
    me.down('[name=addAccrualsBtn]').hide()
    me.down('[name=applyAccrualsBtn]').hide()
    me.down('[name=applyAccrualsBtn]').setDisabled(true)
    me.down('[name=cancelAccrualsBtn]').setDisabled(true)
    me.down('[name=deleteAccrualsBtn]').setDisabled(true)
    me.down('[name=calcAccrualsBtn]').setDisabled(true)
    me.down('[name=applyPosChangesBtn]').setDisabled(true)
    me.down('[name=cancelPosChangesBtn]').setDisabled(true)
    me.down('[name=selectPosition]').hide()
    me.down('[name=deletePosChangesBtn]').setDisabled(true)
  } else {
    setSalaryChangesBtnState(me, me.record.get('salaryChangesApplied'))
    setAccrualChangesBtnState(me, me.record.get('accrualChangesApplied'))
    setPosChangesBtnState(me, me.record.get('posChangesApplied'))
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
  const massPosChangeParam = me.record.get('massPosChangeParam')
  if (Array.isArray(massPosChangeParam)) {
    massPosChangeParam.forEach(item => {
      if (item.value) {
        const ctrl = me.attr[item.name]
        ctrl.skipChange = true
        if (ctrl.setValueById) {
          ctrl.setValueById(item.value)
        } else {
          ctrl.setValue(item.value)
        }
      }
    })
  }
  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
    ['organizationID', '=', me.record.get('orgID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])
  Ext.defer(() => {
    AC.viewUtils.setWhereListProperty(me.attr.dictStaffSubCatID, [
      ['dictStaffCatID', '=', me.attr.dictStaffCatID.getValue() || 0]
    ], undefined, ['clearStore', 'clearWhereList'])
  }, 300)
}

function setSalaryChangesBtnState (me, isApplied) {
  me.down('[name=applyChangesBtn]').setDisabled(isApplied)
  me.down('[name=cancelChangesBtn]').setDisabled(!isApplied)
}

function setAccrualChangesBtnState (me, isApplied) {
  me.down('[name=applyAccrualsBtn]').setDisabled(isApplied)
  me.down('[name=cancelAccrualsBtn]').setDisabled(!isApplied)
}

function setPosChangesBtnState (me, isApplied) {
  me.down('[name=applyPosChangesBtn]').setDisabled(isApplied)
  me.down('[name=cancelPosChangesBtn]').setDisabled(!isApplied)
}

function onFormDataReady () {
  const me = this
  const docType = me.record.get('docType')
  const orderState = me.record.get('orderState')
  const readOnly = !(orderState === 'PROJECT')
  me.attr.staffTreeControl.orderID = me.instanceID
  me.attr.staffTreeControl.orderState = orderState
  if (me.isNewInstance) {
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    me.record.set('name', '-')
    me.setInitialStaffTable(me.record.get('orgID'))
    me.actions.createOrder.setDisabled(true)
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
    me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
    me.attr.staffTreeControl.onDate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    me.attr.staffTreeControl.organization = me.record.get('orgID')
    me.attr.staffTreeControl.orgIDs = me.record.get('withChild') ? [] : [me.record.get('orgID')]
    const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
    if (isFundSourceAccounting === 'STAFF') {
      me.attr.staffTreeControl.filterByFundSource = true
      me.attr.staffTreeControl.enableFundSourceDockedItems(me.attr.staffTreeControl.dockedItems.items[0].items)
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
    me.attr.orderDate.setReadOnly(true)
    me.attr.orgID.setReadOnly(true)
    me.attr.withChild.setReadOnly(true)
    me.attr.respEmployeeNumID.setReadOnly(readOnly)
    me.attr.orderNumber.setReadOnly(readOnly)
    me.attr.name.setReadOnly(readOnly)
    me.attr.textOrder.setReadOnly(readOnly)
    me.attr.comment.setReadOnly(readOnly)
    me.attr.staffTreeControl.setReadOnly(readOnly)
    me.attr.docType.setReadOnly(readOnly)
    me.attr.groupJobsPrint.setReadOnly(readOnly)
    me.attr.printNotMajorChanges.setReadOnly(readOnly)
    me.attr.printSignerInfo.setReadOnly(readOnly)
    me.attr.staffTabOrgStructID.setDisabled(readOnly)
    me.down('recpanel').setCanEdit(!readOnly)

    if (!(me.record.get('orderState') === 'PROJECT')) {
      me.attr.hrOrderNumber.setValue(me.record.get('entryOrderID.orderNumber'))
      me.attr.hrOrderDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.orderDate')))
      me.attr.hrEntryDate.setValue(AC.dateService.formatDate(me.record.get('entryOrderID.entryDate')))
      me.attr.hrRespEmployee.setValue(me.record.get('entryOrderID.respEmployeePositionID.employeeID.fullFIO'))
      const tabPanel = me.down('tabpanel')
      const tabStaffTable = tabPanel.down('[name=staffTreePanel]')
      if (tabStaffTable) tabStaffTable.tab.hide()
    } else {
      me.actions.createOrder.setDisabled(false)
      me.attr.staffTreeControl.setReadOnly(false)
    }
    HR.orderManager.changeAction(me)
    if (docType === 'NEW') {
      me.attr.staffTableID.setDisabled(true)
      me.attr.changeListNumber.setDisabled(true)
    } else {
      me.attr.staffTableID.setDisabled(readOnly)
      me.attr.changeListNumber.setReadOnly(readOnly)
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
  if (me.isNewInstance) {
    AC.viewUtils.setWhereListProperty(me.attr.departmentID, [
      ['orgID', '=', me.record.get('orgID')]
    ])
  } else {
    me.attr.departmentID.setReadOnly(true)
  }
  me.attr.staffTableAccrual[['ACCRUAL', 'ACCRUAL_CHANGES'].includes(docType) ? 'show' : 'hide']()
  me.attr.staffTreeControl[['ACCRUAL', 'ACCRUAL_CHANGES'].includes(docType) ? 'hide' : 'show']()
  if (me.hideSigner4) {
    me.down('[name=signer4]').hide()
  }

  respEmployeeNumIDSet(me)
  me.setControlFilterByOrgID(me.record.get('orgID') || appAC.globalOrganization())

  me.setFormTitle()
  const massSalaryChangeGrid = me.down('[name=massSalaryChange]')
  massSalaryChangeGrid.getStore().load().then(store => {
    if (store.getCount() === 0) {
      me.down('[name=applyChangesBtn]').setDisabled(true)
      me.down('[name=cancelChangesBtn]').setDisabled(true)
    }
  })
  const massAccrualChangeGrid = me.down('[name=massAccrualChange]')
  massAccrualChangeGrid.getStore().load().then(store => {
    if (store.getCount() === 0) {
      me.down('[name=applyAccrualsBtn]').setDisabled(true)
      me.down('[name=cancelAccrualsBtn]').setDisabled(true)
    }
  })
  const massPosChangeGrid = me.down('[name=massPosChange]')
  massPosChangeGrid.getStore().load().then(store => {
    if (store.getCount() === 0) {
      me.down('[name=applyPosChangesBtn]').setDisabled(true)
      me.down('[name=cancelPosChangesBtn]').setDisabled(true)
    }
  })
  if (readOnly) {
    massAccrualChangeGrid.setReadOnly(true)
    massSalaryChangeGrid.setReadOnly(true)
    massPosChangeGrid.setReadOnly(true)
  }
  const skipCheckSalaryLevel = !!AC.settings.get('hrSkipCheckSalaryLevel', appAC.globalOrganization())
  if (!readOnly && skipCheckSalaryLevel) {
    HR.controlService.setValidateEditPromise(massSalaryChangeGrid, onValidateSalaryChangeRowEditPromise)
    massSalaryChangeGrid.onValidateEdit = undefined
  }
  const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (isFundSourceAccounting !== 'STAFF') {
    me.attr.byFundSource.setVisible(false)
  }
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

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  // AC.documentManager.addDocumentAction(me)
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
            return createStaffOrder(me)
          }
        })
      },
      scope: me
    })
    me.actions.createOrder = createOrder
  }
  if (!me.actions.printReports) {
    const printMenu = []
    HR.reportUtils.getOrderReportMenu(printMenu, 'STAFFLIST', me)
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

  me.actions.checkQuantity = new Ext.Action({
    disabled: true,
    actionId: 'checkQuantity',
    eventId: 'checkQuantity',
    actionText: UB.i18n('Перевірити'),
    text: UB.i18n('Перевірити'),
    tooltip: UB.i18n('Перевірити'),
    handler: function () {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_staffTable',
        method: 'checkQuantity',
        staffTableID: me.instanceID,
        orgID: me.record.get('orgID'),
        onDate: me.record.get('entryDate')
      }).then(mParams => {
        me.setLoading(false)
        if (mParams.msg) {
          $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
        }
      })
    }
  })
}

async function createStaffOrder (me) {
  if (!me.record.get('salaryChangesApplied') || !me.record.get('accrualChangesApplied')) {
    const str = !me.record.get('salaryChangesApplied') && !me.record.get('accrualChangesApplied') ? ' ' + UB.i18n('та') + ' ' : ''
    const msg = `${UB.i18n('Існують незастосовані зміни')} ${!me.record.get('salaryChangesApplied') ? UB.i18n('окладів') : ''}${str}${!me.record.get('accrualChangesApplied') ? UB.i18n('нарахувань') : ''}. ${UB.i18n('Застосувати ці зміни при введені в дію?')}`
    let choice = await $App.dialogYesNo(UB.i18n('Увага'), msg)
    if (choice) {
      if (!me.record.get('salaryChangesApplied')) {
        await me.applySalaryChanges()
      }
      if (!me.record.get('accrualChangesApplied')) {
        await me.applyAccrualChanges()
      }
    }
  }
  if (!me.record.get('posChangesApplied')) {
    const msg = UB.i18n('Існують незастосовані зміни параметрів посад. Застосувати ці зміни при введені в дію?')
    let choice = await $App.dialogYesNo(UB.i18n('Увага'), msg)
    if (choice) {
      await me.applyPosChanges()
    }
  }
  const empOrder = await UB.Repository('hr_empOrder')
    .attrs('ID')
    .where('staffTableID', '=', me.instanceID)
    .selectSingle()
  return $App.doCommand({
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
        entryDate: AC.dateService.truncTimeToUtcNull(me.record.get('entryDate')),
        respPositionID: me.record.get('respPositionID'),
        respEmployeePositionID: me.record.get('respEmployeePositionID'),
        respPosition2ID: me.record.get('respPosition2ID'),
        respEmployeePosition2ID: me.record.get('respEmployeePosition2ID')
      }
    },
    tabId: new Date().getTime(),
    target: $App.getViewport().centralPanel
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
      case 'docType':
        switch (field.getValue()) {
          case 'NEW':
            me.attr.staffTableID.setDisabled(true)
            me.attr.changeListNumber.setDisabled(true)
            me.attr.changeListNumber.setValue()
            me.attr.staffTableID.clearValue()
            break
          case 'CHANGES':
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
  return docType === 'NEW' ? 'hr_orgplan' : (docType === 'CHANGES' ? 'hr_orgplanChanges' : 'hr_orgplanAccrual2')
}

function setFormTitle () {
  const me = this
  let docType = me.record.get('docType')
  let title = me.record.get('docType.name')
  if (me.isNewInstance || !title) {
    title = UB.core.UBEnumManager.getStore('HR_STUFFDOC_TYPE').getById(docType || 'NEW').get('shortName')
    if (me.isNewInstance) {
      title += UB.i18n(' (створення)')
    }
  }
  me.setTitle(title)
}

function addOrgStructure () {
  const me = this
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_staffTableStructure',
    customParams: {
      orgID: me.record.get('orgID'),
      sender: me
    }
  })
}

function onGridEdit (me, context) {
  if (context.record.raw.nodeType === 'DEPUNIT' || context.record.raw.nodeType === 'POSUNIT') {
    const parentNode = me.attr.staffTreeControl.getCurrentRecord().parentNode
    if (context.record.get('stateCode') === 'NEW') {
      const execParams = {
        ID: context.record.get('ID')
      }
      execParams[context.column.dataIndex] = context.record.get(context.column.dataIndex) ? Number(context.record.get(context.column.dataIndex)) : null
      $App.connection.run({
        entity: context.record.raw.nodeType === 'POSUNIT' ? 'hr_position' : 'hr_department',
        method: 'update',
        __skipOptimisticLock: true,
        execParams
      }).then(() => {
        me.attr.staffTreeControl.refreshNodeQuantity(parentNode)
      })
    } else {
      const attrValues = {}
      attrValues[context.column.dataIndex] = context.record.get(context.column.dataIndex) ? Number(context.record.get(context.column.dataIndex)) : null
      $App.connection.run({
        entity: context.record.raw.nodeType === 'POSUNIT' ? 'hr_position' : 'hr_department',
        method: context.record.raw.nodeType === 'POSUNIT' ? 'newVersionPosition' : 'newVersionDepartment',
        sourceID: context.record.get('ID'),
        onDate: me.attr.staffTreeControl.onDate,
        staffOrderID: me.instanceID,
        attrValues: JSON.stringify(attrValues)
      }).then((resp) => {
        context.record.set('stateCode', 'NEW')
        context.record.set('ID', resp.newID)
        context.record.raw.ID = resp.newID
        context.record.raw.stateCode = 'NEW'
        const node = context.record.parentNode && context.record.parentNode.findChild('ID', resp.newID)
        if (node) {
          node.set('cls', 'org-nodechangedstructure')
        }
        me.attr.staffTreeControl.refreshNodeQuantity(parentNode)
      })
    }
  }
}

async function fillSalaryByTarif () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  const params = await $App.showModal({
    formCode: 'hr_massSalaryChangeTarifDate',
    description: UB.i18n('Параметри для зміни окладів'),
    isClosable: true
  })
  if (params && params.dateFrom) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_massSalaryChange',
      method: 'fillByTariff',
      execParams: {
        dateFrom: AC.dateService.shiftDate(params.dateFrom),
        recalcTarifAccrual: params.recalcTarifAccrual,
        orgID: me.record.get('orgID'),
        onDate: me.record.get('entryDate'),
        staffTableID: me.instanceID
      }
    }).then(() => {
      me.loadInstance()
      grid.onRefresh()
    }).finally(() => {
      me.setLoading(false)
    })
  }
}

async function fillSalaryByScheme () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_massSalaryChangeParams',
    isModal: true,
    description: UB.i18n('Параметри для зміни окладів'),
    cmpInitConfig: {
      orgID: me.record.get('orgID'),
      paymentType: 'SCHEME',
      onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
      selected: grid.getStore().data.items.filter(o => o.get('isDeleted') === 0).map(o => o.get('positionID')),
      onSelectData: (data, params) => {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_massSalaryChange',
          method: 'fillByScheme',
          execParams: {
            staffTableID: me.instanceID,
            onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
            valuation: params.valuation,
            value: params.value,
            roundUpTo: params.roundUpTo,
            roundingMode: params.roundingMode,
            positions: JSON.stringify(data.map(o => o.positionID))
          }
        }).then(() => {
          me.loadInstance()
          grid.onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    }
  })
}

async function fillSalaryByAccrual () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_massSalaryChangeParams',
    isModal: true,
    description: UB.i18n('Параметри для зміни окладів'),
    cmpInitConfig: {
      orgID: me.record.get('orgID'),
      paymentType: 'ACCRUAL',
      onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
      selected: grid.getStore().data.items.filter(o => o.get('isDeleted') === 0).map(o => o.get('positionID')),
      onSelectData: (data, params) => {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_massSalaryChange',
          method: 'fillByAccrual',
          execParams: {
            staffTableID: me.instanceID,
            onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
            valuation: params.valuation,
            value: params.value,
            roundUpTo: params.roundUpTo,
            roundingMode: params.roundingMode,
            positions: JSON.stringify(data.map(o => o.positionID))
          }
        }).then(() => {
          me.loadInstance()
          grid.onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    }
  })
}

function onAfterMassSalaryChange (context) {
  const me = this
  me.setLoading(true)
  const attrs = ['mi_modifyUser.employeeNumberID.description', 'rateDelta', 'sumDelta', 'staffTableID.salaryChangesApplied']
  UB.Repository('hr_massSalaryChange')
    .attrs(attrs)
    .selectById(context.record.get('ID'))
    .then(result => {
      if (result) {
        attrs.forEach(attr => {
          context.record.set(attr, result[attr])
        })
        setSalaryChangesBtnState(me, result['staffTableID.salaryChangesApplied'])
      }
      Ext.defer(function () {
        me.loadInstance()
      }, 300)
    }).finally(() => {
      me.setLoading(false)
    })
}

function onAfterMassAccrualChange (context) {
  const me = this
  Ext.defer(function () {
    me.loadInstance()
  }, 300)
}

function applySalaryChanges () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  me.setLoading(true)
  return $App.connection.run({
    entity: 'hr_massSalaryChange',
    method: 'applyChanges',
    execParams: {
      onDate: me.record.get('entryDate'),
      staffTableID: me.instanceID
    }
  }).then(() => {
    // grid.loadData()
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function cancelSalaryChanges () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_massSalaryChange',
    method: 'cancelChanges',
    execParams: {
      staffTableID: me.instanceID
    }
  }).then(() => {
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function deleteSalaryChanges () {
  const me = this
  const grid = me.down('[name=massSalaryChange]')
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_massSalaryChange',
    method: 'clearChanges',
    execParams: {
      staffTableID: me.instanceID
    }
  }).then(() => {
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function applyAccrualChanges () {
  const me = this
  const grid = me.down('[name=massAccrualChange]')
  me.setLoading(true)
  return $App.connection.run({
    entity: 'hr_massAccrualChange',
    method: 'applyChanges',
    execParams: {
      onDate: me.record.get('entryDate'),
      staffTableID: me.instanceID
    }
  }).then(() => {
    // grid.loadData()
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function cancelAccrualChanges () {
  const me = this
  const grid = me.down('[name=massAccrualChange]')
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_massAccrualChange',
    method: 'cancelChanges',
    execParams: {
      staffTableID: me.instanceID
    }
  }).then(() => {
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function deleteAccrualChanges () {
  const me = this
  const grid = me.down('[name=massAccrualChange]')
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_massAccrualChange',
    method: 'clearChanges',
    execParams: {
      staffTableID: me.instanceID
    }
  }).then(() => {
    me.loadInstance()
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function onValidateSalaryChangeRowEdit (editor, context) {
  if (context.record.get('paymentType') === 'SCHEME') {
    const accrualSum = editor.editor.form.findField('accrualSum').getValue()
    const accrualSumMin = context.record.get('accrualSumMin')
    const accrualSumMax = context.record.get('accrualSumMax')
    let errorMessage
    if (accrualSumMin && accrualSumMin > accrualSum) {
      errorMessage = UB.i18n('Сума повинна бути не менше ніж {0}', accrualSumMin)
      editor.editor.form.findField('accrualSum').markInvalid(errorMessage)
      AC.viewUtils.showToast(errorMessage)
      return false
    }
    if (accrualSumMax && accrualSumMax < accrualSum) {
      errorMessage = UB.i18n('Сума повинна бути не більше ніж {0}', accrualSumMax)
      editor.editor.form.findField('accrualSum').markInvalid(errorMessage)
      AC.viewUtils.showToast(errorMessage)
      return false
    }
  }
  return true
}

async function onValidateSalaryChangeRowEditPromise (editor, context) {
  if (context.record.get('paymentType') === 'SCHEME') {
    const accrualSum = editor.editor.form.findField('accrualSum').getValue()
    const accrualSumMin = context.record.get('accrualSumMin')
    const accrualSumMax = context.record.get('accrualSumMax')
    let errorMessage
    if (accrualSumMin && accrualSumMin > accrualSum) {
      errorMessage = UB.i18n('Сума повинна бути не менше ніж {0}', accrualSumMin)
      const choice = await $App.dialogYesNo('Увага', UB.i18n('Сума повинна бути не менше ніж {0}. Ви дійсно бажаєте зберегти зміни не зважаючи на наявне обмеження?', accrualSumMin))
      if (!choice) {
        editor.editor.form.findField('accrualSum').markInvalid(errorMessage)
        return false
      }
    }
    if (accrualSumMax && accrualSumMax < accrualSum) {
      errorMessage = UB.i18n('Сума повинна бути не більше ніж {0}', accrualSumMax)
      const choice = await $App.dialogYesNo('Увага', UB.i18n('Сума повинна бути не більше ніж {0}. Ви дійсно бажаєте зберегти зміни не зважаючи на наявне обмеження?', accrualSumMax))
      if (!choice) {
        editor.editor.form.findField('accrualSum').markInvalid(errorMessage)
        return false
      }
    }
  }
  return true
}

function fillAccrualChanges () {
  const me = this
  const grid = me.down('[name=massAccrualChange]')
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_massAccrualChangeParams',
    isModal: true,
    description: UB.i18n('Параметри для зміни нарахувань'),
    cmpInitConfig: {
      orgID: me.record.get('orgID'),
      onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
      selected: grid.getStore().data.items.filter(o => o.get('isDeleted') === 0).map(o => o.get('positionID')),
      onSelectData: (data, params) => {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_massAccrualChange',
          method: 'fillChanges',
          execParams: {
            staffTableID: me.instanceID,
            onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
            valuation: params.valuation,
            value: params.value,
            curValue: params.curValue,
            action: params.action,
            payElID: params.payElID,
            positions: JSON.stringify(data.map(o => o.positionID))
          }
        }).then(() => {
          me.loadInstance()
          grid.onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    }
  })
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

function calculateAccrualsBySalary () {
  const me = this
  const massSalaryChangeGrid = me.down('[name=massSalaryChange]')
  const salaryData = massSalaryChangeGrid.getData()

  const massAccrualChangeGrid = me.down('[name=massAccrualChange]')
  massAccrualChangeGrid.getStore().load().then(store => {
    const askPromise = store.getCount() === 0 ? Promise.resolve(true) : $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('На сторінці зміни нарахувань вже є інформація, яка буде видалена. Продовжити?'))
    askPromise.then(choice => {
      if (choice) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_massSalaryCalcAccruals',
          isModal: true,
          description: UB.i18n('Параметри для зміни нарахувань'),
          sender: me,
          cmpInitConfig: {
            staffTableID: me.instanceID,
            orgID: me.record.get('orgID'),
            onDate: me.record.get('entryDate'),
            rate: salaryData.length ? AC.currencyService.round(salaryData[0].rateDelta) : 0
          }
        })
      }
    })
  })
}

function checkReadOnly () {
  return ['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED'].includes(this.record.get('orderState'))
}

function deletePosChanges (skipLoadInstance = false) {
  const me = this
  const grid = me.down('[name=massPosChange]')
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_massPosChange',
    method: 'clearChanges',
    execParams: {
      staffTableID: me.instanceID
    }
  }).then(() => {
    if (!skipLoadInstance) {
      me.loadInstance()
    }
    grid.onRefresh()
  }).finally(() => {
    me.setLoading(false)
  })
}

function applyPosChanges () {
  const me = this
  const grid = me.down('[name=massPosChange]')
  me.saveForm().then(result => {
    if (result !== -1) {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_massPosChange',
        method: 'applyChanges',
        execParams: {
          onDate: me.record.get('entryDate'),
          staffTableID: me.instanceID,
          params: JSON.stringify(getMassPosChangeParam(me))
        }
      }).then(() => {
        me.loadInstance()
        grid.onRefresh()
      }).finally(() => {
        me.setLoading(false)
      })
    }
  })
}

function cancelPosChanges () {
  const me = this
  me.saveForm().then(result => {
    if (result !== -1) {
      const grid = me.down('[name=massPosChange]')
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_massPosChange',
        method: 'cancelChanges',
        execParams: {
          staffTableID: me.instanceID
        }
      }).then(() => {
        me.loadInstance()
        grid.onRefresh()
      }).finally(() => {
        me.setLoading(false)
      })
    }
  })
}

function loadPosChanges (data) {
  if (Array.isArray(data) && data.length) {
    const me = this
    me.saveForm().then(result => {
      if (result !== -1) {
        const grid = me.down('[name=massPosChange]')
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_massPosChange',
          method: 'loadPosChanges',
          execParams: {
            staffTableID: me.instanceID,
            onDate: AC.dateService.shiftDate(me.record.get('entryDate')),
            positions: JSON.stringify(data.map(o => o.positionID))
          }
        }).then(() => {
          me.loadInstance()
          grid.onRefresh()
        }).finally(() => {
          me.setLoading(false)
        })
      }
    })
  }
}

function getMassPosChangeParam (me) {
  const posAttrs = [
    'checkDictSpecialtyID', 'dictSpecialtyID', 'checkDictEmpCategoryID', 'dictEmpCategoryID', 'checkDictTarifCoeffID', 'dictTarifCoeffID',
    'checkDictWagePayID', 'dictWagePayID', 'checkPsCategory', 'psCategory', 'checkDictStatePayID', 'dictStatePayID', 'checkReformer', 'reformer',
    'checkPositionCategory', 'positionCategory', 'checkDictStaffCatID', 'dictStaffCatID', 'checkDictStaffSubCatID', 'dictStaffSubCatID',
    'checkDictPositionKindID', 'dictPositionKindID', 'checkDictPositionGroupID', 'dictPositionGroupID', 'checkWorkScheduleID',
    'workScheduleID', 'checkDictCostTypeID', 'dictCostTypeID', 'positionType', 'checkPositionTypeNew', 'positionTypeNew'
  ]
  const massPosChangeParam = []
  posAttrs.forEach(attr => {
    massPosChangeParam.push({
      name: attr,
      value: me.attr[attr].getValue()
    })
  })
  return massPosChangeParam
}

function beforeSave (me, params) {
  params.execParams.massPosChangeParam = JSON.stringify(getMassPosChangeParam(me))
}
