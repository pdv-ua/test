/* jshint maxerr: 10000 */
/* global UB Ext HR appAC $App _ appHR AC Blob moment */
exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  moveToCompletion,
  createActions,
  getTextFields,
  setTextFields,
  makeReasonSelector,
  makeSelectTextMenuItems,
  filterPeriod,
  filterEmployeePosition,
  getFilterValueByAttr,
  filterDepartment,
  filterPosition,
  beforePosting,
  beforeCancelPosting,
  addBaseActions,
  onFormDataReady,
  onControlChanged,
  onCheckValidBeforeSaveOrder,
  enableParaControls,
  enableControls,
  filterOrg,
  onAfterOrderSave,
  onAfterOrderDelete,
  getDetailEntityName,
  getReportName,
  isGlobalOrgOfType,
  canAddOrderType,
  makeOrderItemsMenu,
  initUBComponent,
  getOrgMiDataId,
  getOrderTypeName,
  selectPreamble,
  initOrderComponentDone,
  allowChangeDocument,
  detailDelete,
  fillAcquaintanceList,
  fillReason,
  isStateChangable,
  setupRespEmployeePosition,
  setFilterOnRespPosition,
  setupOrganization,
  afterPosting,
  setDetailsFilter,
  addAccrualChangesFromStaffTable,
  addAccrualChangesFromTariffing,
  makeMailingLetterTemplateMenu,
  makeSignersTemplateMenu,
  setDocumentOrderType,
  fillEmpOrdListAppruvList,
  getRecparticipant,
  makeEmpOrdListAppruvTemplateMenu,
  fillEvaluationType,
  makeAcquaintanceListTemplateMenu,
  reviewEmpl
}

const empOrgStructOrderTypes = ['STAFFLIST', 'ORGSTRUCTURE', 'CHGSALARY']
const groupOnlyOrders = ['VACATION', 'VACATIONPROLONG', 'VACATIONREVOKE']

function setupOrganization () {
  const me = this
  const orgStore = me.attr.organizationID.getStore()
  if (!me.attr.organizationID.store.ubRequest.__mip_recordhistory_all) {
    return
  }
  delete me.attr.organizationID.store.ubRequest.__mip_recordhistory_all
  if (me.isNewInstance) {
    me.record.set('masterOrganizationName', appAC.globalOrganizationName())
    me.record.set('mOrganizationName', appAC.globalOrganizationName())
    me.record.set('masterOrganizationID', appAC.globalOrganization())
  }

  const isOrdersSubordinate = HR.orderManager.isUserOrdersSubordinate()
  orgStore.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('entryDate') || new Date())
  orgStore.ubRequest.whereList = {
    state: {
      expression: '[state]',
      condition: 'equal',
      value: 'ACTIVE'
    },
    masterPath: {
      expression: '[mi_treePath]',
      condition: 'like',
      value: '%/' + me.record.get('masterOrganizationID') + '/%'
    },
    masterID: {
      expression: '[mi_data_id]',
      condition: isOrdersSubordinate ? 'notEqual' : 'equal',
      value: me.record.get('masterOrganizationID')
    }
  }
  orgStore.ubRequest.logicalPredicates = !isOrdersSubordinate ? ['([masterPath] OR [masterID])'] : []
  if (me.isNewInstance) {
    if (isOrdersSubordinate) {
      orgStore.load().then(store => {
        if (store.data.items.length) {
          me.record.set('organizationID', store.data.items[0].get('mi_data_id'))
          me.record.set('organizationID.description', store.data.items[0].get('description'))
        }
      })
    } else {
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('organizationID.description', appAC.globalOrganizationName())
    }
  }
  me.attr.organizationID.setValueById(me.record.get('organizationID'))
  me.attr.organizationID.clearIsPhantom()
}

function setTitleByOrderType (form) {
  HR.orderManager.setTitleByOrderType(form)
}

function moveToCompletion () {
  const me = this
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

function createActions () {
  const me = this
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    hidden: !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canVisibleCancelReconciliation'),
    handler: function () {
      me.moveToCompletion()
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
    hidden: !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canVisibleContinueReconciliation'),
    handler: function () {
      docontinueReconciliation('ON_RECONCILATION')
    }
  })

  me.actions.startReconciliation = new Ext.Action({
    // actionText: 'Розпочати узгодження',
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    hidden: !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canVisibleStartReconciliation'),
    actionId: 'startReconciliation',
    disabled: true,
    handler: function () {
      me.isForcedPreservation = true
      me.saveForm().then(result => {
        me.isForcedPreservation = false
        if (result !== -1) {
          HR.reportTab.checkAndSetReport(me, {
            isCheckOnly: true
          }).then(result => {
            if (result) {
              return UB.Repository('hr_recparticipant')
                .attrs(['employeePosition.description'])
                .where('recStageID.docID', '=', me.record.get('ID'))
                .where('positionID', 'isNull')
                .where('recStageID.entityName', '=', 'hr_recstage')
                .selectSingle().then(item => {
                  if (item) {
                    return $App.dialogInfo(UB.i18n(`В маршруті погодження є учасник {0}, який на поточний час знаходиться поза штатом. Потрібно змінити маршрут погодження`, item['employeePosition.description'] || ''))
                  } else {
                    return $App.connection.run({
                      entity: 'hr_recstage',
                      method: 'startReconciliation',
                      docID: me.record.get('ID')
                    }).then(function () {
                      return me.loadInstance()
                    }).then(function () {
                      return UB.Repository('hr_recparticipant')
                        .attrs(['ID', 'employeePosition.description', 'employeePosition'])
                        .where('recStageID.docID', '=', me.record.get('ID'))
                        .where('recStageID.orderIndex', '=', 1)
                        .where('recStageID.entityName', '=', 'hr_recstage')
                        .where('employeePosition.employeeNumberID', '=', $App.connection.userData('employeeNumberID'))
                        .selectSingle({ 'employeePosition.employeeNumberID': 'employeeNumberID' }).then(recparticipant => {
                          if (recparticipant) {
                            return $App.dialogYesNo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'), UB.i18n('Бажаєте погодити цей документ?')).then(isStartRec => {
                              if (isStartRec) {
                                HR.reportTab.setReportMode(me, 'view')
                                me.down('recpanel').updateTree()
                                return UB.Repository('hr_task')
                                  .attrs(['ID'])
                                  .where('participantID', '=', recparticipant.ID)
                                  .where('mi_wfState', '=', 'NEW')
                                  .selectSingle().then(task => {
                                    if (task) {
                                      $App.doCommand({
                                        cmdType: 'showForm',
                                        formCode: 'hr_task-main',
                                        entity: 'hr_task',
                                        instanceID: task.ID,
                                        tabId: `hr_task-${$App.connection.userData('employeeNumberID')}-${task.ID}`,
                                        target: $App.getViewport().centralPanel,
                                        cmpInitConfig: {
                                          defaultValues: {
                                            isClickApprove: true
                                          }
                                        }
                                      })
                                    }
                                  })
                              } else {
                                HR.reportTab.setReportMode(me, 'view')
                                me.down('recpanel').updateTree()
                                return true
                              }
                            })
                          } else {
                            HR.reportTab.setReportMode(me, 'view')
                            me.down('recpanel').updateTree()
                            return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
                          }
                        })
                    })
                  }
                })
            }
          })
        }
      })
    }
  })

  me.actions.stopReconciliation = new Ext.Action({
    // actionText: 'Відмінити узгодження',
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
    hidden: !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canVisibleStopReconciliation'),
    // eventId: 'startReconciliation',
    // hidden: true, // me.record.get('orderState') !== 'ON_RECONCILATION',
    handler: function () {
      $App.dialogYesNo('Попередження', UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
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
              // me.actions.stopReconciliation.hide()
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })

  if (!me.actions.printDocumentAction) {
    let empOrderType = _.get(me, 'store.ubRequest.whereList.orderType.values') && me.store.ubRequest.whereList.orderType.values.empOrderType
    if (!empOrderType) {
      empOrderType = me.customParams.empOrderType || (me.defaultValues && me.defaultValues.empOrderType)
    }
    const printMenu = HR.reportTab.getPrintMenu(me, {
      addRecPart: true,
      getRepName: 'getReportName'
    })
    /* Всі звіти по наказам в залежності від empOrderType додаються в функції getOrderReportMenu */
    HR.reportUtils.getOrderReportMenu(printMenu, empOrderType, me)

    me.actions.printDocumentAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printDocumentAction',
      eventId: 'printDocumentAction',
      menu: printMenu
    })
  }
  me.actions.setMarkAction = new Ext.Action({
    iconCls: 'fas fa-stamp',
    cls: 'green-action',
    actionId: 'setMarkAction',
    eventId: 'setMarkAction',
    hidden: !AC.entityUtils.verifyRightsMethod('hr_empOrder', 'addStampData'),
    handler: function () {
      $App.showModal({
        formCode: 'hr_empOrderStampParams',
        description: UB.i18n('Реєстраційні дані наказу'),
        isClosable: true,
        customParams: {
          orderDate: me.record.get('orderDate'),
          orderNumber: me.record.get('orderNumber')
        }
      }).then(params => {
        if (params) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_empOrder',
            method: 'addStampData',
            orderID: me.instanceID,
            organizationID: appAC.globalOrganization(),
            orderNumber: params.orderNumber,
            orderDate: params.orderDate
          }).then(() => {
            me.setLoading(false)
            me.loadInstance()
            me.isPdfCreated = false
          }, err => {
            me.setLoading(false)
            throw err
          })
        }
      })
    }
  })
}

function getTextFields () {
  const me = this
  const empOrderType = me.record.get('empOrderType')
  if (empOrderType) {
    return UB.Repository('hr_dictEmpOrderText')
      .attrs(['titleOrder', 'preamble'])
      .where('empOrderType', '=', empOrderType)
      .limit(0)
      .selectAsObject().then(data => {
        return data[0] || null
      })
  } else {
    return Promise.resolve(null)
  }
}

function setTextFields () {
  const me = this
  return me.getTextFields().then(data => {
    if (data) {
      if (!me.record.get('titleOrder')) {
        me.record.set('titleOrder', data.titleOrder)
        me.attr.titleOrder.setValue(data.titleOrder)
      }
      if (!me.record.get('preamble')) {
        me.attr.preamble.setValue(data.preamble)
        me.record.set('preamble', data.preamble)
      }
    }
  })
}

function makeReasonSelector (form, data = {}) {
  const me = this
  const reasonFieldName = data.reasonFieldName || 'reason'
  const entityName = data.entityName ? data.entityName : 'hr_dictOrderDetReason'
  const attrs = $App.domainInfo.get(entityName, true).attributes
  const reasonField = data.reasonField || (form && form.getField(reasonFieldName))
  if (!reasonField) {
    return
  }
  if (reasonField.contextmenu && reasonField.contextmenu.down(`[ubID=item${reasonFieldName}Selector]`)) {
    return
  }
  const dictReasonField = data.dictReasonField || 'reason'
  let whereList = {}
  if (attrs.organizationID) {
    whereList = {
      orgIsNull: {
        expression: '[organizationID]',
        condition: 'isNull'
      },
      orgInOrder: {
        expression: '[organizationID]',
        condition: 'equal',
        value: form.record.get('organizationID') || me.record.get('organizationID')
      }
    }
  }
  if (attrs.empOrderType) {
    whereList.empOrderType = {
      expression: '[empOrderType]',
      condition: 'equal',
      values: {
        val: (form.record && form.record.get('empOrderType')) ||
          form.customParams.empOrderType ||
          (form.masterForm && form.masterForm.record.get('empOrderType')) ||
          (form.orderForm && form.orderForm.customParams.empOrderType)
      }
    }
  }
  const fieldList = data.fieldList || []
  if (attrs.code) {
    fieldList.push('code')
  }
  if (attrs.name) {
    fieldList.push('name')
  }
  fieldList.push(dictReasonField)
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
      value = (value ? (value + '\n') : '') + selected.get(dictReasonField)
      if (!reasonField.readOnly && !reasonField.disabled) {
        reasonField.setValue(value)
      }

      Ext.defer(() => {
        reasonField.focus()
      }, 10)
    },
    cmpInitConfig: {
      onDeterminateForm: function (grid) { },
      entityConfig: {
        entity: entityName,
        method: 'select',
        fieldList: fieldList,
        whereList: whereList,
        logicalPredicates: attrs.organizationID ? ['([orgIsNull] OR [orgInOrder])'] : undefined,
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

function selectPreamble () {
  const me = this
  const entityName = 'hr_dictEmpOrderText'
  const gridConfig = {
    entity: entityName,
    cmdType: UB.core.UBCommand.commandType.showList,
    description: $App.domainInfo.get(entityName, true).getEntityDescription(),
    isModal: true,
    sender: me,
    hideActions: [],
    onItemSelected: function (selected, a, b, c) {
      if (!['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(me.record.get('orderState'))) {
        me.record.set('preamble', selected.get('preamble'))
        me.record.set('titleOrder', selected.get('titleOrder'))
      }
      Ext.defer(function () {
        me.attr.preamble.focus(false, 1)
      }, 500)
    },
    cmpInitConfig: {
      onDeterminateForm: function (grid) {

      },
      entityConfig: {
        entity: entityName,
        method: 'select',
        fieldList: ['titleOrder', 'preamble', 'comment'],
        whereList: {
          empOrderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              val: me.record.get('empOrderType') || me.customParams.empOrderType
            }
          },
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          },
          orgInOrder: {
            expression: '[organizationID]',
            condition: 'equal',
            value: me.record.get('organizationID') || -1
          }

        },
        logicalPredicates: ['([orgIsNull] OR [orgInOrder])']
      }
    }
  }
  $App.doCommand(gridConfig)
}

function makeSelectTextMenuItems () {
  const me = this

  AC.viewUtils.buildContextMenu(me.attr.preamble, [{
    text: UB.i18n('Очистити'),
    handler: function (item) {
      if (!['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(me.record.get('orderState'))) {
        me.attr.preamble.setValue()
        me.attr.titleOrder.setValue()
      }
    }
  }])
}

function filterPeriod (orgMiDataId) {
  const me = this
  const p = me.getField('periodID')
  if (!p || p.hidden) {
    return
  }
  AC.viewUtils.setWhereListProperty(p, [
    ['isClosed', '=', false],
    ['orgID', '=', orgMiDataId]
  ],
  null, ['clearWhereList'])
  p.clearValue()
  if (!orgMiDataId || orgMiDataId === -1) {
    p.getStore().loadData([])
  } else {
    p.getStore().load()
  }
}

function filterEmployeePosition (form, {
  ctrlToFilter = null,
  attrToFilter = 'employeePositionID',
  clearValue = false,
  departmentMiDataId = null,
  onDate = null,
  logicalPredicates = null,
  params = null,
  positionExists = false
} = {}) {
  const me = this
  if (!onDate) {
    onDate = form.record.get('dateFrom') || me.record.get('orderDate') || me.record.get('entryDate') || appAC.globalApplicationDate()
  }
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  let filterValue
  const filters = [
    ['dateFrom', '<=', onDate, 'empPosDateFrom'],
    ['dateTo', '>=', onDate, 'empPosDateTo'],
    ['employeeID.mi_deleteDate', '>=', '#maxdate']
  ]
  if (departmentMiDataId) {
    filters.push(
      ['departmentID', '=', departmentMiDataId], ['departmentID.mi_dateFrom', '<=', onDate], ['departmentID.mi_dateTo', '>=', onDate], ['departmentID.state', '=', 'ACTIVE'], ['departmentID.mi_deleteDate', '>=', '#maxdate']
    )
  }
  if (positionExists) {
    filters.push(['positionID', 'isNotNull'])
  }
  if (params) {
    params.forEach(item => filters.push(item))
  }

  return me.getOrgMiDataId().then(orgMiDataId => {
    filterValue = orgMiDataId
    filters.push(['organizationID', '=', filterValue])
    if (ctrlToFilter) {
      if (!_.isArray(ctrlToFilter)) {
        ctrlToFilter = [ctrlToFilter]
      }

      ctrlToFilter.forEach(aField => {
        AC.viewUtils.setWhereListProperty(aField, filters,
          logicalPredicates, ['clearWhereList'])
        if (filterValue !== -1) {
          aField.getStore().load()
        } else {
          aField.getStore().loadData([])
        }
        if (clearValue) {
          aField.clearValue()
        }
      })
      return
    }
    if (!_.isArray(attrToFilter)) {
      attrToFilter = [attrToFilter]
    }

    attrToFilter.forEach(item => {
      const aField = form.getField(item)
      if (!aField) {
        AC.viewUtils.showToast('Помилка', UB.i18n(`hr_empOrder.js->filterEmployeePosition() - на формі {0} не знайдено поле {1}`, form.formCode, item))
      }
      AC.viewUtils.setWhereListProperty(aField, filters, logicalPredicates, ['clearWhereList'])
      if (filterValue !== -1) {
        aField.getStore().load()
      } else {
        aField.getStore().loadData([])
      }
      if (clearValue) {
        aField.clearValue()
      }
    })
    me.filterPeriod(filterValue)
  })
}

function getFilterValueByAttr ({
  form,
  attrName
}) {
  const ctrl = form.getField(attrName)
  if (!ctrl) {
    return Promise.resolve(-1)
  }

  const entity = ctrl.getStore().ubRequest.entity
  const ID = form.record.get(attrName)
  const reco = AC.gridUtils.getCurrentRecord(ctrl)
  if (reco) {
    return Promise.resolve(reco.get('mi_data_id'))
  }
  if (!ID) {
    return Promise.resolve(ID)
  }
  return UB.Repository(entity)
    .attrs(['mi_data_id'])
    .where('ID', '=', ID)
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject().then(data => {
      return data[0].mi_data_id
    })
}

async function filterDepartment ({
  form,
  isReload = false,
  isClear = false,
  orgAttr = '',
  ctrl = null,
  onDate = appAC.globalApplicationDate() // this.record.get('orderDate')
} = {}) {
  const me = this
  let filterValue
  if (!orgAttr) {
    filterValue = me.record.get('organizationID.mi_data_id')
  } else {
    filterValue = await me.getFilterValueByAttr({
      form: form,
      attrName: orgAttr
    })
    if (filterValue === -1) {
      filterValue = me.record.get('organizationID.mi_data_id')
    }
  }
  if (!ctrl) {
    ctrl = form.getField('departmentID')
  }
  if (!ctrl) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), 'hr_empOrder.filterDepartment()=>unknown departmentID control')
    return
  }
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  ctrl.getStore().ubRequest.__mip_recordhistory_all = true
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['orgID', '=', filterValue || -1],
    ['state', '=', 'ACTIVE' || -1],
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate]

  ])
  if (isReload) {
    if (filterValue) {
      ctrl.getStore().load()
    } else {
      ctrl.getStore().loadData([])
    }
  }
  if (isClear) {
    ctrl.clearValue()
  }
}

async function filterPosition ({
  form,
  isReload = false,
  isClear = false,
  orgAttr = 'organizationID',
  depAttr = 'departmentID',
  depCtrl = null,
  posCtrl = null,
  onDate = appAC.globalApplicationDate(), // this.record.get('orderDate')
  byMiTreePath = false
} = {}) {
  const me = this
  let filterValue
  let filterMiTreePath

  if (depCtrl) {
    filterValue = depCtrl.getFieldValue('mi_data_id')
    filterMiTreePath = depCtrl.getFieldValue('mi_treePath')
  } else if (depAttr !== -1) {
    filterValue = await me.getFilterValueByAttr({
      form: form,
      attrName: depAttr
    })
  }

  if (!filterValue) {
    filterValue = await me.getFilterValueByAttr({
      form: form,
      attrName: orgAttr
    })
  }
  if (!filterValue || filterValue === -1) {
    filterValue = me.record.get(orgAttr || 'organizationID' + '.mi_data_id')
  }
  const posField = posCtrl || form.getField('positionID')
  const posStore = posField.getStore()
  posStore.ubRequest.__mip_recordhistory_all = true
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  if (byMiTreePath && filterMiTreePath) {
    AC.viewUtils.setWhereListProperty(posField, [
      // [(depFilter && depFilter !== -1) ? 'parentUnitID' : 'orgID', '=', filterValue || -1],
      ['mi_treePath', 'like', filterMiTreePath || '-1'],
      ['state', '=', 'ACTIVE'],
      ['mi_dateFrom', '<=', onDate],
      ['mi_dateTo', '>=', onDate]
    ], null, ['clearWhereList'])
  } else {
    AC.viewUtils.setWhereListProperty(posField, [
      // [(depFilter && depFilter !== -1) ? 'parentUnitID' : 'orgID', '=', filterValue || -1],
      ['parentUnitID', '=', filterValue || -1],
      ['state', '=', 'ACTIVE'],
      ['mi_dateFrom', '<=', onDate],
      ['mi_dateTo', '>=', onDate]
    ], null, ['clearWhereList'])
  }

  if (isReload) {
    if (filterValue) {
      posStore.load()
    } else {
      posStore.loadData([])
    }
  }
  if (isClear) {
    posField.clearValue()
  }
}

function beforePosting () {
  const me = this
  let focusField = null
  let message = ''
  me.postMessage = ''
  if (me.record.get('orderNumber') === UB.i18n('(проєкт)')) {
    message += UB.i18n('Введіть номер наказу')
    focusField = me.getField('orderNumber')
    focusField.setReadOnly(false)
  }
  if (!me.record.get('orderDate')) {
    message += (focusField ? UB.i18n(' та дату наказу') : UB.i18n('Введіть дату наказу'))
    focusField = focusField || me.getField('orderDate')
    me.getField('orderDate').setReadOnly(false)
  }
  if (message) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), message)
    me.down('tabpanel').setActiveTab(0)
    me.down('[expandTitle]').expand()
    me.getField('orderNumber').setReadOnly(false)
    // me.getField('orderDate').setReadOnly(false)
    me.getField('dictEmpOrderIndexID').setReadOnly(false)
    Ext.defer(function () {
      focusField.focus(true, 1000)
    }, 1)
    return Promise.resolve(false)
  }
  let empOrderType = me.record.get('empOrderType')
  if (['STAFFLIST', 'ORGSTRUCTURE', 'STAFFTABLE', 'STAFFTABLEORGSTRUCTURE'].includes(empOrderType)) {
    let staffTableID = me.record.get('staffTableID') || me.record.get('staffTableOrgStructureID')
    if (!staffTableID) {
      if (['ORGSTRUCTURE'].includes(empOrderType)) {
        return $App.dialogYesNo('Попередження', UB.i18n('Не вказаний документ (Структура або Перелік змін) на закладці "Структура". Продовжити?'))
          .then(isYes => {
            if (isYes) {
              return empOrderType === 'STAFFLIST' ? HR.orderManager.doCheckStaffList(me) : Promise.resolve(true)
            } else {
              return Promise.resolve(false)
            }
          })
      } else {
        return $App.dialogYesNo('Попередження', UB.i18n('Не вказаний документ (Штатний розпис або Перелік змін) на закладці "Штатний розпис". Продовжити?'))
          .then(isYes => {
            if (isYes) {
              return empOrderType === 'STAFFLIST' ? HR.orderManager.doCheckStaffList(me) : Promise.resolve(true)
            } else {
              return Promise.resolve(false)
            }
          })
      }
    } else {
      return empOrderType === 'STAFFLIST' ? HR.orderManager.doCheckStaffList(me) : Promise.resolve(true)
    }
  }
  let customPromise = HR.orderManager.getBeforePostPromise(me)
  return customPromise.then(res => {
    if (res) {
      let checkEmpPromise
      if (!['VACATION', 'VACATIONPROLONG'].includes(empOrderType)) {
        checkEmpPromise = UB.Repository('hr_empOrderDet')
          .attrs('ID')
          .where('isGroup', '=', 0)
          .where('orderID', '=', me.instanceID)
          .limit(1)
          .selectAsObject()
      } else {
        checkEmpPromise = Promise.resolve(false)
      }
      return checkEmpPromise
        .then(data => {
          if (data && !data[0]) {
            me.postMessage = UB.i18n('Працівника не додано до наказу. ')
            return true
          }
          return me.saveForm().then(result => {
            if (result === -1) {
              return Promise.resolve({
                result: false
              })
            }
            return HR.orderManager.getPostWarning(me)
          }).then(resObj => {
            if (resObj.postMessage) {
              me.postMessage = resObj.postMessage
            }
            return resObj.result
          })
        })
    } else {
      return Promise.resolve(false)
    }
  })
}

function beforeCancelPosting () {
  const me = this
  function getOrderWarning () {
    return Promise.resolve(HR.orderManager.getCancelPostWarning(me)).then(warning => {
      let res = warning.result
      if (warning.message) {
        if (warning.isDialog) {
          return $App.dialogYesNo(UB.i18n('Увага!'), UB.i18n(`{0}. Продовжити?`, warning.message))
        } else {
          return $App.dialogError(warning.message, UB.i18n('Увага!')).then(() => {
            return Promise.resolve(res)
          })
        }
      }
      return Promise.resolve(res)
    })
  }
  const isCanCancelEarlyOrder = AC.entityUtils.verifyRightsMethod(me.entityName, 'canCancelPostingEarlyOrder')
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'exchangeReview',
    docID: me.record.get('ID')
  })
  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getValidatorWarning',
    validatorFn: 'getCancelPostWarningAllType',
    empOrderType: me.record.get('empOrderType'),
    orderID: me.instanceID
  }).then(mParams => {
    const warnMessage = (mParams.result || '')
    if (warnMessage) {
      if (mParams.resultType === 'emplist') {
        const errMessage = UB.i18n(`Для Працівників {0} існують накази із більш пізньою датою`, warnMessage)
        if (isCanCancelEarlyOrder) {
          return $App.dialogYesNo('Увага!', UB.i18n(`{0}. Продовжити?`, errMessage)).then(res => {
            if (!res) {
              return Promise.resolve(false)
            }
            return getOrderWarning()
          })
        } else {
          $App.dialogError(errMessage, UB.i18n('Увага!'))
          return Promise.resolve(false)
        }
      } else {
        $App.dialogInfo(warnMessage, UB.i18n('Увага!'))
        return getOrderWarning()
      }
    } else {
      return getOrderWarning()
    }
  })
}

function initComponentStart () {
  const me = this
  me.defaultValues = me.defaultValues || {}
  me.on('afterrender', afterRender, me)
  me.on('beforeclose', closePanel, me)
  me.on('afterdelete', onAfterOrderDelete, me)

  if (me.isRunFromText && me.dfm.customParams) {
    me.customParams = me.dfm.customParams
  } else if (me.defaultValues.empOrderType) {
    me.customParams.empOrderType = me.defaultValues.empOrderType
  } else if (!me.customParams.empOrderType && me.sender) {
    me.customParams.empOrderType = AC.viewUtils.getFilterValue(me.sender, 'empOrderType')
  }

  me.reportMode = 'view'

  me.orderConfig = {
  }
  HR.orderManager.init(me)
  // eslint-disable-next-line no-caller
  callParentFromCmdConfig(me, arguments.callee.name)
}

function afterRender () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.getField('respEmployeePositionID'), ['editItem', 'addItem'])
  if (me.externalOnAfterRender) {
    me.externalOnAfterRender(me)
  }
}

function closePanel () {
  const me = this
  if (me.isDeleted) {
    return true
  }
  if (me.checkDetailOnClose && !me.isNewInstance) {
    const grid = me.down('[name=hr_empOrderDet]')
    let result = !!grid.store.data.items.length
    if (result) {
      const detItems = grid.store.data.items.filter(item => item.get('empOrderType') !== 'TASK')
      result = !!detItems.length
    }
    if (!result) {
      Ext.Msg.confirm({
        buttons: Ext.MessageBox.YESNOCANCEL,
        icon: Ext.MessageBox.WARNING,
        buttonText: {
          yes: UB.i18n('doNotSave'),
          no: UB.i18n('cancel')
        },
        minWidth: 320,
        title: UB.i18n('unsavedData'),
        msg: UB.i18n('При закритті наказу без доданих пунктів (не враховуючи завдань) він не буде збережений. Продовжити?'),
        fn: function (btn) {
          if (btn === 'yes') {
            HR.orderManager.internalDelete(me, () => {
              AC.gridUtils.refreshSenderGrid(me)
            })
          }
        }
      })
    }
    return result
  }
}

function callParentFromCmdConfig (form, funcName) {
  const func = form.commandConfig && form.commandConfig.cmpInitConfig && form.commandConfig.cmpInitConfig[funcName]
  if (func) {
    return func.apply(form, null)
  }
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction', 'calculatedAction', 'unCalculatedAction',
      'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask', 'setMarkAction'
    ],
    state: {
      PROJECT: {
        action: ['postingAction', 'fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation', 'setMarkAction']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation', 'setMarkAction']
      },
      RECONCILED: {
        action: ['postingAction', 'setMarkAction']
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask', 'setMarkAction']
      },
      ON_COMPLETION: {
        action: ['postingAction', 'fDelete', 'startReconciliation', 'setMarkAction']
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
  HR.orderManager.addOrderAction(me)
  HR.orderManager.removeHidddenActions(me)
  me.createActions()
}

function detailDelete () {
  const me = (this.name === 'hr_empOrderDet') ? this.up('form') : this
  const grid = (this.name === 'hr_empOrderDet') ? this : me.down('[name=hr_empOrderDet]')
  if (['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(me.record.get('orderState'))) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Неможливо видалити запис з проведеного наказу'))
    return
  }
  const promise = this === grid ? $App.dialogYesNo(UB.i18n('Підтвердіть видалення'), UB.i18n("Буде видалено запис з 'Опис пунктів'. Ви впевнені?")) : Promise.resolve(true)
  promise.then(isAgree => {
    if (isAgree) {
      const reco = AC.gridUtils.getCurrentRecord(grid)
      reco && $App.connection.run({
        entity: reco.get('mi_unityEntity'),
        method: 'delete',
        execParams: {
          ID: reco.get('ID')
        }
      }).then(() => {
        grid.onRefresh()
      })
    }
  })
}

function onFormDataReady () {
  const me = this
  me.enableControls()
  if (!['APPOINT', 'APPOINT_MOVE', 'PLURALIST', 'CANCELPARA'].includes(me.customParams.empOrderType)) {
    AC.gridUtils.setGridColumnVisible(me.attr.acquaintanceList, ['employeeID.description'], false)
  }
  if (me.isNewInstance) {
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    } else if (me.defaultValues.empOrderType) {
      me.record.set('empOrderType', me.defaultValues.empOrderType)
    }
    if (me.customParams.HR_POSITION_TYPE) {
      me.record.set('positionType', me.customParams.HR_POSITION_TYPE)
    }
    if (me.defaultValues.organizationID) {
      me.record.set('organizationID', me.defaultValues.organizationID)
    }
    if (me.defaultValues.orderDate) {
      me.record.set('orderDate', me.defaultValues.orderDate)
    } else {
      me.record.set('orderDate', null)
    }
    if (me.defaultValues.entryDate) {
      me.record.set('entryDate', me.defaultValues.entryDate)
    } else {
      me.record.set('entryDate', appAC.globalApplicationDate())
    }
    if (me.defaultValues.staffTableID) {
      me.record.set('staffTableID', me.defaultValues.staffTableID)
    }
    if (me.defaultValues.staffTableOrgStructureID) {
      me.record.set('staffTableOrgStructureID', me.defaultValues.staffTableOrgStructureID)
    }
    if (me.defaultValues.respEmployeeNumID) {
      me.record.set('respEmployeeNumID', me.defaultValues.respEmployeeNumID)
    } else {
      if (!me.record.get('respEmployeeNumID')) {
        me.record.set('respEmployeeNumID', $App.connection.userData('employeeNumberID') || null)
      }
    }

    if (!me.record.get('respEmployeeID')) {
      const empOrderType = me.record.get('empOrderType')
      $App.connection.run({
        entity: 'hr_employeePosition',
        method: 'getOrderSignerInfo',
        empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
        onDate: me.record.get('orderDate') ? AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) : appAC.globalApplicationDate(),
        organizationID: me.record.get('organizationID')
      }).then(mParams => {
        if (mParams.result.employeePositionID) {
          me.attr.respPositionID.skipChange = true
        }
        if (me.defaultValues.respPositionID) {
          me.record.set('respPositionID', me.defaultValues.respPositionID)
        } else {
          me.record.set('respPositionID', mParams.result.positionID)
        }
        // me.attr.respPositionID.setValueById(mParams.result.positionID)
        me.attr.respEmployeePositionID.getStore().ubRequest.positionID = mParams.result.positionID
        if (me.defaultValues.respEmployeePositionID) {
          me.record.set('respEmployeePositionID', me.defaultValues.respEmployeePositionID)
        } else {
          me.record.set('respEmployeePositionID', mParams.result.employeePositionID)
        }
        // me.attr.respEmployeePositionID.setValueById(mParams.result.employeePositionID)
        mParams.result.positionID && me.setupRespEmployeePosition({
          isReload: false,
          isClear: false,
          positionID: mParams.result.positionID
        })
      })

      $App.connection.run({
        entity: 'hr_employeePosition',
        method: 'getOrderSignerInfo',
        empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
        onDate: me.record.get('orderDate') ? AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) : appAC.globalApplicationDate(),
        isGetSecondSigner: true,
        organizationID: me.record.get('organizationID')
      }).then(mParams => {
        if (mParams.result.employeePositionID) {
          me.attr.respPosition2ID.skipChange = true
        }
        if (me.defaultValues.respPosition2ID) {
          me.record.set('respPosition2ID', me.defaultValues.respPosition2ID)
        } else {
          me.record.set('respPosition2ID', mParams.result.positionID)
        }
        // me.attr.respPosition2ID.setValueById(mParams.result.positionID)
        me.attr.respEmployeePosition2ID.getStore().ubRequest.positionID = mParams.result.positionID
        if (me.defaultValues.respEmployeePosition2ID) {
          me.record.set('respEmployeePosition2ID', me.defaultValues.respEmployeePosition2ID)
        } else {
          me.record.set('respEmployeePosition2ID', mParams.result.employeePositionID)
        }
        // me.attr.respEmployeePosition2ID.setValueById(mParams.result.employeePositionID)
        mParams.result.positionID && me.setupRespEmployeePosition({
          isReload: false,
          isClear: false,
          positionID: mParams.result.positionID,
          attrName: 'respPosition2ID'
        })
      })
    }
    if (['BOUNTY'].includes(me.record.get('empOrderType'))) {
      me.record.set('isGroupDepart', true)
    }
  }
  if (!AC.settings.get('hrTwoSignatoriesInOrders', appAC.globalOrganization())) {
    me.down('[name=signer2]').hide()
    me.attr.respPositionID.setFieldLabel(UB.i18n('Підписант (посада)'))
  }
  if (!me.record.get('entryDate')) {
    me.record.set('entryDate', me.record.get('orderDate'))
  }
  const entryDate = AC.dateService.truncTimeToUtcNull(me.record.get('entryDate') || new Date())
  if (['STAFFLIST', 'ORGSTRUCTURE'].includes(me.record.get('empOrderType'))) {
    AC.viewUtils.setFilterValue(me.attr.staffTableID, {
      orderState: {
        value: ['PROJECT', 'RECONCILED'],
        condition: 'in'
      },
      orgID: me.record.get('organizationID') || appAC.globalOrganization() /*,
      entryDate: {
        value: entryDate,
        condition: '<='
      }
      */
    })
    AC.viewUtils.setFilterValue(me.attr.staffTableOrgStructureID, {
      orderState: {
        value: ['PROJECT', 'RECONCILED'],
        condition: 'in'
      },
      orgID: me.record.get('organizationID') || appAC.globalOrganization() /* ,
      entryDate: {
        value: entryDate,
        condition: '<='
      }
      */
    })
  }

  UB.Repository('hr_organization')
    .attrs('description')
    .misc({
      __mip_recordhistory_all: true
    })
    .where('mi_dateFrom', '<=', entryDate)
    .where('mi_dateTo', '>=', entryDate)
    .where('mi_data_id', '=', me.record.get('organizationID.mi_data_id'))
    .selectAsObject().then(data => {
      let orgNameCtrl = me.down('[ubID=orgName]')
      if (data[0]) {
        orgNameCtrl && orgNameCtrl.setValue(data[0].description)
      }

      if (!me.isNewInstance) {
        let expandTitleCtrl = me.down('[expandTitle]')
        expandTitleCtrl && expandTitleCtrl.refreshTitle()
      }
    })

  me.setupRespEmployeePosition({
    isReload: false,
    isClear: false,
    positionID: me.record.get('respPositionID')
  })
  me.setupRespEmployeePosition({
    attrName: 'respPosition2ID',
    isReload: false,
    isClear: false,
    positionID: me.record.get('respPosition2ID')
  })
  const orderType = me.record.get('empOrderType')
  me.setFilterOnRespPosition(me.record.get('orderDate') ? AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) : appAC.globalApplicationDate(), orderType)
  let staffTableID = me.record.get('staffTableID')
  let staffTableOrgStructureID = me.record.get('staffTableOrgStructureID')
  let isStaffTable = (staffTableID && orderType === 'STAFFLIST')
  let isOrgStructure = (staffTableOrgStructureID && orderType === 'ORGSTRUCTURE')
  if (isStaffTable || isOrgStructure) {
    let docEntity = isStaffTable ? 'hr_staffTable' : 'hr_staffTableOrgStructure'
    let docID = isStaffTable ? staffTableID : staffTableOrgStructureID
    const pdfEd = me.down('[name=staffTablePdf]')
    if (pdfEd) {
      $App.connection.getDocument({
        entity: docEntity,
        attribute: 'document',
        ID: docID
      }, {
        resultIsBinary: true
      })
        .then(data => {
          data = new Blob([data], {
            type: 'application/pdf'
          })
          pdfEd.setSrc({
            blobData: data
          })
          pdfEd.show()
        })
        .catch(() => {
          pdfEd.hide()
        })
    }
  }

  if (['ORGSTRUCTURE', 'STAFFLIST'].includes(orderType)) {
    me.attr['hr_empOrderDet.employeeNumberID.tabNum'].setVisible(false)
    me.attr['hr_empOrderDet.employeeFullName'].setVisible(false)
    me.attr['hr_empOrderDet.title'].setVisible(false)
    me.attr['hr_empOrderDet.dateToEmpty'].setVisible(false)
    me.attr['hr_empOrderDet.dateFrom'].setVisible(false)
    me.attr['hr_empOrderDet.departmentID.name'].setVisible(false)
  }

  const orderState = me.record.get('orderState')
  if (['VACATION', 'ADDSALARY', 'BOUNTY', 'BOUNTY_HELP', 'ADDSALARYGOV'].includes(orderType) && !['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(orderState)) {
    me.getField('isGroupDepart').setDisabled(false)
  }
  me.getField('isGroupDepart').hide()
  if (['ADDSALARYGOV', 'BOUNTY', 'BOUNTY_HELP', 'CWSHD', 'MISSION', 'MISSION_TRAINING', 'TRAINING'].includes(orderType) &&
    !['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(orderState)) {
    me.getField('isAppendix').setDisabled(false)
  }
  me.attr.organizationID.skipChange = true
  me.setupOrganization()
  me.setDetailsFilter()
  if (me.isNewInstance) {
    me.setDocumentOrderType()
  }
  const isAnyNumberSigners = AC.settings.get('hrEmpOrderAnyNumberSigners', me.record.get('organizationID'))
  me.down('[ubID=empOrderSigners]').tab[isAnyNumberSigners ? 'show' : 'hide']()
  if (isAnyNumberSigners) {
    const onDate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')) || appAC.globalApplicationDate()
    const store = me.down('[name=empOrderSignersGrid]').getStore()
    if (!store.ubRequest.whereList) {
      store.ubRequest.whereList = {}
    }
    store.ubRequest.whereList.respPositionState = {
      expression: '[respPositionID.state]',
      condition: '=',
      value: 'ACTIVE'
    }
    store.ubRequest.whereList.miDateFrom = {
      condition: '<=',
      expression: '[respPositionID.mi_dateFrom]',
      value: onDate
    }
    store.ubRequest.whereList.miDateTo = {
      condition: '>=',
      expression: '[respPositionID.mi_dateTo]',
      value: onDate
    }
    store.load()
  }
  me.down('[actionId=addFromRoute]').setVisible(me.addItems)
  HR.orderManager.showIf(me)
  me.attr.acquaintanceList.getStore().on('load', (store, data) => {
    const evaluationTypeCrtl = me.down('[name=evaluationType]')
    me.down('[actionId=acquaintAll]').setDisabled(!['POSTED', 'PROCESSED'].includes(me.record.get('orderState')))
    if (!evaluationTypeCrtl.getValue() && data.length) {
      UB.Repository('ubm_enum').attrs(['name', 'code']).where('eGroup', '=', 'HR_RECSTAGEKIND').selectAsObject().then(res => {
        const similarEvaluationType = data.find((o, i, arr) => {
          return arr.every(a => a.data.evaluationType === o.data.evaluationType)
        })
        const evaluationType = me.isNewInstance ? res.find(o => o.code === 'INFO').name || '' : similarEvaluationType && similarEvaluationType.data.evaluationType ? res.find(o => o.code === similarEvaluationType.data.evaluationType).name || '' : ''
        evaluationTypeCrtl.originalValue = evaluationType
        evaluationTypeCrtl.setValue(evaluationType)

        evaluationTypeCrtl.getStore().reload()
      })
    }
  })
}

function setFilterOnRespPosition (onDate, empOrderType) {
  const me = this
  const globalOrganization = appAC.globalOrganization()
  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateFrom.value = onDate
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.dateTo.value = onDate
  me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = globalOrganization
  me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.organizationID.value = globalOrganization

  let orgID = me.record.get('organizationID') || appAC.globalOrganization()
  const installedConstant = AC.settings.get('hrEmpOrderPrintType', orgID)

  switch (empOrderType) {
    case 'EMPORDER':
      if (installedConstant === 'APPOINTMENT') {
        me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signerAppointment'
        me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signerAppointment'
      } else {
        me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4EmpOrder'
        me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4EmpOrderSecond'
      }
      break
    case 'ORGSTRUCTURE':
      me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4Orgstruct'
      me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4OrgstructSecond'
      break
    case 'STAFFLIST':
      me.attr.respPositionID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4Stafflist'
      me.attr.respPosition2ID.getStore().ubRequest.whereList.isOrgBoss.value.whereList.signer4EmpOrder.value = 'signer4StafflistSecond'
      break
  }

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
}

function setupRespEmployeePosition ({
  positionID = false,
  attrName = 'respPositionID',
  onDate,
  isReload = false,
  isClear = false
}) {
  const me = this
  if (!onDate || !AC.dateService.isValid(onDate)) {
    onDate = AC.dateService.isValid(this.record.get('orderDate')) ? AC.dateService.truncTimeToUtcNull(this.record.get('orderDate')) : AC.dateService.truncTimeToUtcNull(appAC.globalApplicationDate())
  }
  let respEmployeePosition
  if (attrName === 'respPositionID') {
    positionID = positionID || 0
    respEmployeePosition = me.getField('respEmployeePositionID')
  } else {
    positionID = positionID || 0
    respEmployeePosition = me.getField('respEmployeePosition2ID')
  }
  const store = respEmployeePosition.getStore()
  store.ubRequest.positionID = positionID
  store.ubRequest.onDate = onDate
  store.ubRequest.currTime = Date.now() // monkey request prevention
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

async function onControlChanged (me, field, value, oldValue) {
  if (me.formDataReady) {
    switch (field.name) {
      /*
      case 'entryDate':
        if (['STAFFLIST', 'ORGSTRUCTURE'].includes(me.record.get('empOrderType'))) {
          const entryDate = AC.dateService.truncTimeToUtcNull(me.attr.entryDate.getValue() && me.attr.entryDate.isValid() ? me.attr.entryDate.getValue() : new Date())
          if ((me.attr.staffTableOrgStructureID.getFieldValue('entryDate') && me.attr.staffTableOrgStructureID.getFieldValue('entryDate') > entryDate) ||
            (me.attr.staffTableID.getFieldValue('entryDate') && me.attr.staffTableID.getFieldValue('entryDate') > entryDate)) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Дата вступу в дію менша ніж Мінімальна дата для введення змін в дію. Продовжити?'))
              .then(res => {
                if (res) {
                  AC.viewUtils.setFilterValue(me.attr.staffTableID, {
                    orderState: 'PROJECT',
                    orgID: me.record.get('organizationID'),
                    entryDate: {
                      value: entryDate,
                      condition: '<='
                    }
                  }, me.attr.staffTableID.getFieldValue('entryDate') > entryDate ? ['clearValue'] : [])
                  AC.viewUtils.setFilterValue(me.attr.staffTableOrgStructureID, {
                    orderState: 'PROJECT',
                    orgID: me.record.get('organizationID'),
                    entryDate: {
                      value: entryDate,
                      condition: '<='
                    }
                  }, me.attr.staffTableOrgStructureID.getFieldValue('entryDate') > entryDate ? ['clearValue'] : [])
                } else {
                  field.setValue(oldValue)
                }
              })
          } else {
            AC.viewUtils.setFilterValue(me.attr.staffTableID, {
              orderState: 'PROJECT',
              orgID: me.record.get('organizationID'),
              entryDate: {
                value: entryDate,
                condition: '<='
              }
            }, me.attr.staffTableID.getFieldValue('entryDate') > entryDate ? ['clearValue'] : [])
            AC.viewUtils.setFilterValue(me.attr.staffTableOrgStructureID, {
              orderState: 'PROJECT',
              orgID: me.record.get('organizationID'),
              entryDate: {
                value: entryDate,
                condition: '<='
              }
            }, me.attr.staffTableOrgStructureID.getFieldValue('entryDate') > entryDate ? ['clearValue'] : [])
          }
        }
        break
      */
      case 'organizationID':
        if (field.skipChange) {
          delete field.skipChange
          return
        }
        if (value && !me.isNewInstance) {
          let data = await UB.Repository('hr_empOrderDet').attrs('ID')
            .where('orderID', '=', me.instanceID)
            .selectSingle()
          if (data) {
            if (!await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Наказ містить пункти, які будуть видалені. Продовжити ?'))) {
              field.skipChange = true
              me.record.set(field.name, oldValue)
              return
            } else {
              me.setLoading(UB.i18n('Зачекайте....'))
              await $App.connection.run({
                entity: me.entityName,
                method: 'deleteDetail',
                execParams: {
                  ID: me.instanceID
                }
              })
              await me.down('[name=hr_empOrderDet]').getStore().load()
              me.setLoading(false)
            }
          }
        }
        AC.viewUtils.setFilterValue(me.attr.respEmployeeNumID, {
          orgID: me.record.get('organizationID')
        })
        break
      case 'respPositionID':
      {
        if (!me.attr.respPositionID.skipChange) {
          me.attr.respEmployeePositionID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            isReload: true
          })
        } else {
          me.attr.respPositionID.skipChange = false
        }
        break
      }
      case 'orderDate':
      {
        let onDate = value && (typeof value !== 'string') ? AC.dateService.truncTimeToUtcNull(value) : appAC.globalApplicationDate()
        if (!moment(onDate)._isValid) return

        let empOrderType = me.record.get('empOrderType')
        me.setFilterOnRespPosition(onDate, empOrderType)
        me.getField('respPositionID').getStore().load()
        me.getField('respPosition2ID').getStore().load()
        let respPositionID = me.record.get('respPositionID')
        let respPosition2ID = me.record.get('respPosition2ID')
        let respEmployeePositionID = me.record.get('respEmployeePositionID')
        let respEmployeePosition2ID = me.record.get('respEmployeePosition2ID')
        $App.connection.run({
          entity: 'hr_employeePosition',
          method: 'getOrderSignerList',
          onDate: onDate,
          empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
          positionID: respPositionID || 0,
          organizationID: me.record.get('organizationID'),
          // monkey request prevention
          currTime: Date.now()
        }).then(mParamsList => {
          if (mParamsList && mParamsList.result) {
            if (!(mParamsList.result.respPositionIDList.includes(respPositionID)) || !(mParamsList.result.respEmployeePositionIDList.includes(respEmployeePositionID))) {
              $App.connection.run({
                entity: 'hr_employeePosition',
                method: 'getOrderSignerInfo',
                positionID: (mParamsList.result.respPositionIDList.includes(respPositionID)) ? respPositionID : false,
                empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
                onDate: onDate,
                organizationID: me.record.get('organizationID'),
                // monkey request prevention
                currTime: Date.now()
              }).then(mParams => {
                me.record.set('respPositionID', mParams.result.positionID)
                me.attr.respEmployeePositionID.getStore().ubRequest.positionID = mParams.result.positionID
                me.record.set('respEmployeePositionID', mParams.result.employeePositionID)
                mParams.result.positionID && me.setupRespEmployeePosition({
                  isReload: true,
                  onDate: onDate,
                  positionID: mParams.result.positionID,
                  attrName: 'respPositionID'
                })
              })
            }
          }
        })

        $App.connection.run({
          entity: 'hr_employeePosition',
          method: 'getOrderSignerList',
          onDate: onDate,
          empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
          positionID: respPosition2ID || 0,
          isGetSecondSigner: true,
          organizationID: me.record.get('organizationID'),
          // monkey request prevention
          currTime: Date.now()
        }).then(mParamsList => {
          if (mParamsList && mParamsList.result) {
            if (!(mParamsList.result.respPositionIDList.includes(respPosition2ID)) || !(mParamsList.result.respEmployeePositionIDList.includes(respEmployeePosition2ID))) {
              $App.connection.run({
                entity: 'hr_employeePosition',
                method: 'getOrderSignerInfo',
                positionID: (mParamsList.result.respPositionIDList.includes(respPosition2ID)) ? respPosition2ID : false,
                empOrderType: ['STAFFLIST', 'ORGSTRUCTURE', 'VACATIONAPSCHED'].includes(empOrderType) ? empOrderType : null,
                onDate: onDate,
                isGetSecondSigner: true,
                organizationID: me.record.get('organizationID'),
                // monkey request prevention
                currTime: Date.now()
              }).then(mParams => {
                me.record.set('respPosition2ID', mParams.result.positionID)
                me.attr.respEmployeePosition2ID.getStore().ubRequest.positionID = mParams.result.positionID
                me.record.set('respEmployeePosition2ID', mParams.result.employeePositionID)
                mParams.result.positionID && me.setupRespEmployeePosition({
                  isReload: true,
                  onDate: onDate,
                  positionID: mParams.result.positionID,
                  attrName: 'respPosition2ID'
                })
              })
            }
          }
        })
        break
      }
      case 'respPosition2ID':
      {
        if (!me.attr.respPosition2ID.skipChange) {
          me.attr.respEmployeePosition2ID.clearValue()
          me.setupRespEmployeePosition({
            positionID: value,
            attrName: 'respPosition2ID',
            isReload: true
          })
        } else {
          me.attr.respPosition2ID.skipChange = false
        }
        break
      }
    }
  }
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  if (!me.record.get('entryDate')) {
    me.record.set('entryDate', AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')))
  }

  const isCheckReason = AC.settings.get('checkReason', me.record.get('organizationID'))
  if (isCheckReason && (me.record.modified.orderState === 'PROJECT' || me.isNewInstance || me.isForcedPreservation) && !me.record.get('reason')) {
    return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Увага! Поле "Підстава" не заповнено, бажаєте продовжити?'))
      .then(function (choice) {
        if (choice) {
          return HR.reportTab.saveReport(me)
        } else {
          return Promise.resolve(false)
        }
      })
  } else {
    return HR.reportTab.saveReport(me)
  }
}

function enableParaControls (form, additionalControls = []) {
  const orderState = this.record.get('orderState')
  let isPosted = (['POSTED', 'RECONCILED', 'ON_RECONCILATION'].includes(orderState)) || !this.allowChangeDocument()
  HR.orderManager.enableControls({
    me: form,
    isEnabled: !isPosted,
    controls: additionalControls
  })
  return isPosted
}

function enableControls () {
  const me = this
  const disableChange = !me.allowChangeDocument()
  me.down('[ubID=pdfSettings]').query('[ignorePosted]').forEach(item => {
    item.setReadOnly(false)
    item.setDisabled(false)
  })
  if (disableChange) {
    me.query('[attributeName]').forEach(item => {
      item.setReadOnly && item.setReadOnly(true)
    })
  }
  if (!AC.entityUtils.verifyRightsMethod('hr_orderAttachment', 'canEditPostedOrderAttachments') &&
    me.record.get('orderState') === 'POSTED' &&
    (disableChange || (me.isEditable && !me.isEditable()))) {
    me.down('[xtype=docAttachment]').setReadOnly(true)
  }
  HR.reportTab.setReportMode(me, disableChange ? 'VIEW' : me.reportMode, true)
  let printItem = me.actions.printDocumentAction.items[0].menu.down('[ubID=itemMakeReport]')
  printItem.setDisabled(disableChange)
  printItem.setVisible(!disableChange)
  printItem = me.actions.printDocumentAction.items[0].menu.down('[ubID=itemEditReport]')
  printItem.setDisabled(disableChange)
  printItem.setVisible(!disableChange)

  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  const detailEntityName = empOrderType === 'ORGSTRUCTURE' || empOrderType === 'STAFFLIST'
    ? 'hr_empOrder' : me.getDetailEntityName({
      tail: 'Det'
    })
  const grid = me.down('[name=hr_empOrderDet]')
  if (grid) {
    const customActions = [
      grid.down('[actionId=copyRecord]'),
      grid.down('[actionId=addByList]'),
      grid.down('[actionId=addByType]'),
      grid.down('[actionId=del]')
    ]
    customActions.forEach(item => {
      if (item) {
        item.setVisible(!disableChange)
      }
    })
    AC.gridUtils.checkActionByUserRights(grid, detailEntityName)
  }
  me.down('[actionId=addFromOrder]').setVisible(!disableChange)
  let canDelete = AC.entityUtils.verifyRightsMethod(detailEntityName, 'delete') && AC.entityUtils.verifyRightsMethod(me.entityName, 'delete') && !disableChange
  if ((!canDelete && !me.isAdmin) || disableChange) {
    me.actions['fDelete'].hide()
  } else {
    me.actions['fDelete'].show()
  }

  const canPost = (AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting_' + empOrderType)) && !me.customParams.isMasterOrg && me.record.get('orderState') !== 'POSTED'
  if (!canPost) me.actions['postingAction'].setDisabled(true)
  const canCancelPost = AC.entityUtils.verifyRightsMethod(me.entityName, 'doCancelPosting_' + empOrderType) && !me.customParams.isMasterOrg && me.record.get('orderState') === 'POSTED'
  me.actions['cancelPostingAction'].setDisabled(!canCancelPost)

  me.down('[name=preambleButton]').setDisabled(disableChange)
  me.down('[ubID=orderstructure]').setDisabled(me.isNewInstance)
  if (me.record.get('orderState') && me.record.get('orderState') !== 'POSTED') {
    if (!disableChange && (AC.entityUtils.verifyRightsMethod('hr_empOrder', 'update') || me.isAdmin)) {
      me.getField('orderNumber').setReadOnly(false)
      me.getField('orderDate').setReadOnly(false)
      me.getField('dictEmpOrderIndexID').setReadOnly(false)
    }
  }
  // const roles = $App.connection.userData().roles.toUpperCase().split(',')
  // const accMainOrdSubordinat = roles.some(item => ['ACC_MAINORDSUBORDINATE', 'ADMIN'].includes(item))
  if (!AC.entityUtils.verifyRightsMethod('hr_empOrder', 'canEditOrdersSubordinate')) {
    me.attr.organizationID.setReadOnly(true)
  }
  if (me.record.get('empOrderType') === 'ADDSALARY' && !disableChange) {
    me.down('[actionId=addFromStaffTable]').show()
  } else {
    me.down('[actionId=addFromStaffTable]').hide()
  }
}

function filterOrg ({
  reload = false
} = {}) {
  const me = this
  const org = me.getField('organizationID')
  const orderDate = appAC.globalApplicationDate() // me.getField('orderDate').getValue()
  const orgStore = org.getStore()
  if (orgStore.ubRequest.__mip_ondate !== orderDate) {
    orgStore.ubRequest.__mip_ondate = orderDate
    AC.viewUtils.setWhereListProperty(org, [
      ['mi_dateFrom', '<=', orderDate],
      ['mi_dateTo', '>=', orderDate]
    ])
    reload && orgStore.load().then(store => {
      if (org.getValue() && !store.getById(org.getValue())) {
        org.clearValue()
      }
    })
  }
}

const allowChangeDocStates = ['PROJECT', 'ON_COMPLETION', 'POSTED']
const allowChangeRouteStates = ['PROJECT', 'ON_COMPLETION', 'ON_RECONCILATION']

function isStateChangable () {
  return allowChangeDocStates.indexOf(this.record.get('orderState')) >= 0
}

function allowChangeDocument () {
  const me = this
  if (me.customParams && me.customParams.isMasterOrg) {
    return false
  }
  /* if (me.record.get('orderState') === 'POSTED') {
    return false
  } */
  const roles = $App.connection.userData().roles.toUpperCase().split(',')
  me.isAdmin = HR.orderManager.isAdmin()
  if (!me.isStateChangable()) {
    return false
  }
  const canEdit = AC.entityUtils.verifyRightsMethod('hr_empOrder', 'update')
  let canEditDet = canEdit
  if (canEditDet) {
    canEditDet = AC.entityUtils.verifyRightsMethod(this.getDetailEntityName({
      tail: 'Det'
    }), 'update') || ['STAFFLIST', 'ORGSTRUCTURE'].includes(me.record.get('empOrderType'))
  }
  const accMainOrdSubordinat = roles.some(item => ['ACC_MAINORDSUBORDINATE'].includes(item))
  return canEdit && canEditDet && (!me.isMasterOrg || accMainOrdSubordinat || me.isAdmin)
}

function stateChanged (newState) {
  const me = this
  const canEdit = allowChangeRouteStates.includes(newState)
  const recpanel = me.down('recpanel')
  if (!(recpanel && recpanel.setCanEdit)) {
    return
  }
  recpanel.setCanEdit(canEdit)
  // const actionVisible = (newState === 'RETURNED_FROM_RECONCILATION')
  // me.actions.renewTask.setHidden(!actionVisible)
  // me.actions.toCompletion.setHidden(!actionVisible)
  // const currentUserIsAuthor = me.record.get('mi_createUser') === $App.connection.userData().userID
  // me.actions.stopReconciliation.setHidden(/* newState !== 'ON_RECONCILATION' || */ !currentUserIsAuthor)
  const btmEdit = me.down('#btmEdit')
  btmEdit.setDisabled(!me.isEditable())

  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  const forceToCompletion = allActions && allActions.down('[actionId=forceToCompletion]')
  // const forceToReconcile = allActions && allActions.down('[actionId=forceToReconcile]')
  let forceActionIsHidden = newState !== 'RECONCILED'
  if (forceActionIsHidden) {
    forceToCompletion.setVisible(!forceActionIsHidden)
    // forceToReconcile.setVisible(!forceActionIsHidden)
  } else {
    AC.entityUtils.userIsMemberOf(['acc_editorOrderTable', 'acc_editorOrderPerson']).then(mParams => {
      forceActionIsHidden = !mParams.result
      forceToCompletion.setVisible(!forceActionIsHidden)
      // forceToReconcile.setVisible(!forceActionIsHidden)
    })
  }
}

function onAfterOrderSave () {
  const me = this
  // const empOrderType = me.record.get('empOrderType')
  // const titleOrder = me.record.get('titleOrder')
  // const preamble = me.record.get('preamble')
  // me.enableControls() // enableControls дублюється в onFormDataReady
  if (me.newStateBeforeSave) {
    stateChanged.bind(me)(me.newStateBeforeSave)
  }

  if (!me.record.get('docText') && me.newStateBeforeSave && me.newStateBeforeSave !== 'PROJECT') {
    // generate report after save form and state was changed
    setTimeout(HR.reportTab.forceGenerateReport.bind(me), 10)
  }

  if (me.forceRefreshSenderGrid) {
    AC.gridUtils.refreshSenderGrid(me)
  }

  if (me.externalOnAfterOrderSave) {
    me.externalOnAfterOrderSave(me)
  }
}

function onAfterOrderDelete () {
  const me = this
  if (me.forceRefreshSenderGrid) {
    AC.gridUtils.refreshSenderGrid(me)
  }
}

function getDetailEntityName ({
  tail = '',
  empOrderType = this.record.get('empOrderType') || this.customParams.empOrderType
} = {}) {
  const me = this
  tail = (tail || '')
  if (empOrderType === 'BOUNTY_HELP') {
    return 'hr_empOrderBounty' + (tail || 'Help')
  }
  if (empOrderType === 'CHGSALARYEMP') {
    return 'hr_empOrderChgsalary' + (tail)
  }
  return HR.orderManager.getDetailEntityName(empOrderType, me.entityName, tail)
}

function getReportName () {
  const me = this
  let repName = me.customParams.repName
  if (!repName) {
    repName = me.getDetailEntityName()
  }
  return repName
}

function isGlobalOrgOfType (typeCode) {
  const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  return funcOrgType === typeCode
}

function canAddOrderType (empOrderType, empOrderItemType) {
  let res = true
  switch (empOrderType) {
    case 'PLURALIST':
      if (['COMBININGPOS'].includes(empOrderItemType)) {
        res = isGlobalOrgOfType('1') // 'Загальна' сфера діяльності організації
      }
      break
    case 'VACATION':
      if (['VACATION_G', 'VACATIONLONG_G', 'MATERIALTRANSFER'].includes(empOrderItemType)) {
        res = isGlobalOrgOfType('1') // 'Загальна' сфера діяльності організації
      }
      break
    case 'MISSION':
      // UBHR-4580 Скрыть пункт приказа: "Відрядження". Оставить только: "Відрядження (групове)" - но его назвать "Відрядження"
      res = empOrderItemType !== 'MISSION'
      break
  }
  return res
}

function makeOrderItemsMenu (addByTypeButton) {
  const me = this
  if (me.isOrderItemsMenuCreated) {
    return
  }
  me.isOrderItemsMenuCreated = true
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType

  const actionControls = me.query('[actionId=addByType]')
  actionControls.forEach(ctrl => {
    ctrl.menu.items.removeAll()
  })
  const excludeTypes = ['CWSHD_VAC']
  const hrFuncOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  if (hrFuncOrgType === '2') {
    excludeTypes.push('TRANSFER')
  }
  me.down('[actionId=addByType]').hide()
  UB.Repository('hr_dictOrderRef')
    .attrs(['empOrderType', 'empOrderItemType', 'empOrderItemType.name', 'ID'])
    .where('empOrderType', '=', empOrderType)
    .where('empOrderType.mi_deleteDate', '>=', '#maxdate')
    .where('empOrderItemType.mi_deleteDate', '>=', '#maxdate')
    .whereIf(excludeTypes.length, 'empOrderItemType', 'notIn', excludeTypes)
    .orderBy('[numCode]')
    .selectAsObject().then(data => {
      const processed = []
      data.forEach(item => {
        const code = item.empOrderItemType + item.empOrderType
        if (processed.indexOf(code) !== -1) {
          return
        }
        processed.push(code)
        if (canAddOrderType(item.empOrderType, item.empOrderItemType)) {
          const menuItem = {
            text: item['empOrderItemType.name'],
            empOrderType: item.empOrderItemType,
            handler: menuItem => {
              return me.saveForm()
                .then(function (result) {
                  if (result !== -1) {
                    const grid = me.down('[name=hr_empOrderDet]')
                    if (item.empOrderItemType === 'CHGSALARY' && grid.getStore().find('empOrderType', 'CHGSALARYEMP') > 0) {
                      $App.dialogInfo(UB.i18n('Вже додано встановлення посадового окладу'))
                    } else if (item.empOrderItemType === 'STAFFTABLEMOVE' && grid.getStore().find('empOrderType', 'STAFFTABLEMOVE') > 0) {
                      $App.dialogInfo(UB.i18n('Вже додано Рознесення змін за штатним розписом'))
                    } else {
                      const empOrderTypeParts = menuItem.empOrderType.split('_')
                      let empOrderType = empOrderTypeParts[0].toLowerCase()
                      empOrderType = empOrderType.charAt(0).toUpperCase() + empOrderType.slice(1)
                      const entityName = me.entityName + empOrderType + 'Det'
                      const isGroup = empOrderTypeParts[1] && empOrderTypeParts[1] === 'G'
                      let formCode = entityName
                      if (isGroup) {
                        let groupFormCode = me.entityName + empOrderType + 'GDet'
                        if (appHR.checkFormByCode(groupFormCode)) {
                          formCode = groupFormCode
                        }
                      }
                      $App.doCommand({
                        cmdType: 'showForm',
                        entity: entityName,
                        sender: me.query('[paraGrid=true]')[0],
                        formCode: formCode,
                        isModal: true,
                        customParams: {
                          isGroup: isGroup,
                          empOrderType: menuItem.empOrderType
                        }
                      })
                    }
                  }
                }, function (err) {
                  throw err
                })
            }
          }
          actionControls.forEach(ctrl => {
            ctrl.menu.add(menuItem)
          })
        }
      })
    })
}

function initUBComponent () {
  const me = this
  me.makeSelectTextMenuItems()
  me.dontSaveEmptyModified = true
  stateChanged.bind(me)(me.record.get('orderState'))
}

function getOrgMiDataId (customOrgID) {
  const me = this
  if (me.record.get('organizationID.mi_data_id')) {
    return Promise.resolve(me.record.get('organizationID.mi_data_id'))
  }
  customOrgID = customOrgID || me.record.get('organizationID') || me.customParams.organizationID || appAC.globalOrganization()
  return UB.Repository('hr_organization').attrs(['mi_data_id', 'description']).misc({
    __allowSelectSafeDeleted: true,
    __mip_recordhistory_all: true
  }).selectById(customOrgID).then(data => {
    return data.mi_data_id
  })
}

function getOrderTypeName () {
  return UB.core.UBEnumManager.getStore('HR_EMPORDRETYPE').getById(this.record.get('empOrderType')).get('shortName')
}

function onBeforeSave () {
  const me = this
  if (me.externalOnBeforeSave) {
    return me.externalOnBeforeSave(me)
  }
  return Promise.resolve(true)
}

function initComponentDone () {
  const me = this
  let empOrderType
  const detailGrid = me.down('[name=hr_empOrderDet]')
  detailGrid.menu.down('[eventId=del]').handler = function () {
    $App.dialogYesNo(UB.i18n('Підтвердіть видалення'), UB.i18n("Буде видалено запис з 'Опис пунктів'. Ви впевнені?")).then(isAgree => {
      isAgree && me.detailDelete()
    })
  }
  AC.gridUtils.replaceListener(detailGrid, 'del', detailGrid.onDel, me.detailDelete)
  me.on('beforeSaveForm', function (pull) {
    pull.push([1, onBeforeSave.bind(me)])
  })
  me.on('recordloaded', function () {
    if (!me.customParams) {
      me.customParams = {}
    }
    if (!me.customParams.isMasterOrg && !me.isNewInstance) {
      me.isMasterOrg = (me.record.get('masterOrganizationID') !== appAC.globalOrganization() || me.record.get('masterOrganizationID') !== me.record.get('organizationID'))
    } else {
      me.isMasterOrg = me.customParams.isMasterOrg
    }
    empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType

    AC.viewUtils.setWhereListProperty(me.getField('dictEmpOrderIndexID'), [
      ['empOrderType', '=', empOrderType],
      ['isActive', '=', true]
    ],
    null, ['clearWhereList'])

    const respEmployeePosition = me.getField('respEmployeePositionID')
    respEmployeePosition.getStore().ubRequest.positionID = me.getField('respPositionID').getValue()
    respEmployeePosition.getStore().ubRequest.method = 'getTempExecution'
    respEmployeePosition.getStore().load()
    me.getOrgMiDataId(me.defaultValues.organizationID).then(miDataId => {
      if (me.isNewInstance) {
        me.record.set('organizationID', miDataId)
        me.record.set('organizationID.mi_data_id', miDataId)
        me.record.set('empOrderType', empOrderType)
        let title = UB.i18n('Наказ про ') + me.getOrderTypeName() + UB.i18n(' (створення)')
        if ($App.connection.userData('appDefaultLang') === 'az') {
          title = HR.nameCase.cap(me.getOrderTypeName()) + ' ' + UB.i18n('Наказ про ').toLowerCase() + UB.i18n(' (створення)')
        }
        me.setTitle(title)
      }
      HR.orderManager.showIf(me)
      // me.enableControls() // enableControls дублюється в onFormDataReady
      if (me.record.get('empOrderType') !== 'STAFFLIST' && me.record.get('empOrderType') !== 'ORGSTRUCTURE') {
        me.down('[ubID=staffTable]').tab.hide()
      } else if (me.record.get('empOrderType') === 'ORGSTRUCTURE') {
        me.down('[ubID=staffTable]').tab.setText(UB.i18n('Структура'))
      }
      me.makeReasonSelector(me)
      me.makeMailingLetterTemplateMenu()
      me.makeAcquaintanceListTemplateMenu()
      me.makeEmpOrdListAppruvTemplateMenu()
      me.makeSignersTemplateMenu()
    }).then(() => {
      return respEmployeeNumIDSetFilter(me)
    })
    const empOrdListAppruvGrid = me.down('[name=empOrdListAppruv]')
    const empOrdListAppruvGridStore = empOrdListAppruvGrid.getStore()
    empOrdListAppruvGridStore.on('add', o => {
      if (!o.getNewRecords()[0].data.stageKind) o.getNewRecords()[0].data.stageKind = 'VISA'
    })
  })
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function initOrderComponentDone (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    name: 'actionAllowEditOrderTitle',
    text: UB.i18n('Редагувати заголовок'),
    handler: function () {
      if (['ON_RECONCILATION', 'RECONCILED', 'POSTED', 'PROCESSED', 'ON_PROCESSING'].includes(me.record.get('orderState'))) {
        $App.dialogInfo(UB.i18n('Редагування неможливе'))
        return
      }
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Редагувати заголовок?'))
        .then(function (choice) {
          if (choice) {
            me.down('[expandTitle]').expand()
            me.getField('titleOrder').setReadOnly(false)
            me.getField('titleOrder').setDisabled(false)
            Ext.defer(function () {
              me.attr.titleOrder.focus(false, 1)
            })
          }
        })
    }
  })

  allActions.menu.add({
    name: 'actionToCompletion',
    actionId: 'forceToCompletion',
    text: UB.i18n('Повернути на доопрацювання'),
    hidden: true,
    handler: function () {
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Наказ буде повернутий автору на доопрацювання. Ви дійсно бажаєте скасувати погодження документа?'))
        .then(function (choice) {
          if (choice) {
            me.moveToCompletion()
          }
        })
    }
  })

  /* UBHR-13005, відкладено */
  /* allActions.menu.add({
    name: 'actionToReconcile',
    actionId: 'forceToReconcile',
    text: UB.i18n('Повернути на доузгодження'),
    hidden: true,
    handler: function () {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_recstage-toCompletionParams',
        sender: me,
        customParams: {
          empOrderType: me.record.get('empOrderType')
        }
      })
    }
  }) */
}

function respEmployeeNumIDSetFilter (form) {
  const orgID = form.record.get('organizationID')
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

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}

async function fillAcquaintanceList (form) {
  const orderID = form.instanceID
  if (orderID) {
    const needAdd = []
    const itemsDet = await UB.Repository('hr_empOrderDet')
      .attrs([
        'ID',
        'orderID',
        'employeeID',
        'employeePositionID',
        'dateFrom'
      ])
      .where('orderID', '=', orderID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
      .then((list) => {
        return list
      })
    itemsDet.forEach(ite => {
      if (ite.employeePositionID) {
        if (needAdd.find(itm => itm.employeePositionID === ite.employeePositionID) === undefined) {
          needAdd.push({
            employeePositionID: ite.employeePositionID
          })
        }
      } else if (ite.employeeID) {
        if (needAdd.find(itm => itm.employeeID === ite.employeeID) === undefined) {
          needAdd.push({
            employeeID: ite.employeeID
          })
        }
      }
    })
    if (needAdd.length) {
      UB.Repository('hr_acquaintanceList')
        .attrs(['employeePositionID', 'employeeID'])
        .where('orderID', '=', orderID)
        .where('evaluationType', '=', 'ACQUAINTANCELIST_SIGN')
        .selectAsObject().then(async accList => {
          await Promise.all(needAdd.map(async (ite) => {
            const exist = accList.find(itm => {
              if (
                (ite.employeeID && (itm.employeeID === ite.employeeID)) ||
                (ite.employeePositionID && (itm.employeePositionID === ite.employeePositionID))
              ) {
                return itm
              }
            })
            if (exist === undefined) {
              const execParams = {
                orderID: orderID,
                evaluationType: 'ACQUAINTANCELIST_SIGN'
              }
              if (ite.employeePositionID) {
                execParams.employeePositionID = ite.employeePositionID
              } else if (ite.employeeID) {
                execParams.employeeID = ite.employeeID
              }
              if ((execParams.employeePositionID || execParams.employeeID) && (!accList.find(o => (o.employeeID === execParams.employeeID) || (o.employeePositionID === execParams.employeePositionID)))) {
                await $App.connection.insert({
                  entity: 'hr_acquaintanceList',
                  execParams
                })
              }
            }
          }))
        })
    }
    form.onRefresh()
  }
}

function fillReason (me) {
  const empOrderType = me.record.get('empOrderType')
  const orderID = me.record.get('ID')
  switch (empOrderType) {
    case 'VACATION':
      UB.Repository('hr_empOrderVacationDet')
        .attrs(['reasonDoc'])
        .where('orderID', '=', orderID)
        .selectAsObject()
        .then(data => {
          if (data.length) {
            me.record.set('reason', data.map(item => item.reasonDoc).join('; '))
          }
        })
      break
  }
}

function afterPosting (me) {
  if (appHR && me.record.get('empOrderType') === 'ORGSTRUCTURE') {
    appAC.refreshGlobalOrganization()
  }
}

function setDetailsFilter () {
  const me = this
  const grid = me.down('[name=hr_empOrderDet]')
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  if (groupOnlyOrders.includes(empOrderType)) {
    AC.viewUtils.setWhereListProperty(grid, [
      ['isGroup', 'notEqual', 0]
    ], grid.store.ubRequest.logicalPredicates)
    const gridMenuItem = grid.menu.down('[ubID=showIsGroup]')
    gridMenuItem.setChecked(true)
    gridMenuItem.setDisabled(true)
    const allActions = grid.down('[menuId=AllActions]')
    const allActionsItem = allActions.menu.down('[ubID=showIsGroup]')
    allActionsItem.setChecked(true)
    allActionsItem.setDisabled(true)
  }
  // set custom filter for MISSION orders
  if (empOrderType === 'MISSION') {
    grid.store.ubRequest.whereList.noDetail = {
      expression: '[detailCount]',
      condition: '=',
      value: 0
    }
    grid.store.ubRequest.logicalPredicates = ['([isGroup] OR [notGroupOrders] OR [noDetail])']
  }
  grid.onRefresh()
  if (me.onDetailChangedRefreshSenderGrid) {
    const gridStore = grid.getStore()
    gridStore.on('load', store => {
      if (!store.isLoaded) {
        store.isLoaded = true
      } else if (store.data.items.length) {
        AC.gridUtils.refreshSenderGrid(me)
      }
    })
  }
}

function addAccrualChangesFromStaffTable () {
  const me = this
  if (me.record.get('orderState') !== 'PROJECT') {
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_empOrderAddsalaryStaffTable',
    isModal: true,
    cmpInitConfig: {
      staffTableID: me.record.get('staffTableID'),
      entryDate: me.record.get('entryDate'),
      organizationID: me.record.get('organizationID'),
      onSelect: (params) => {
        me.record.set('staffTableID', params.staffTableID)
        me.saveForm().then(result => {
          if (result !== -1) {
            const grid = me.down('[name=hr_empOrderDet]')
            const gridStore = grid.getStore()
            gridStore.load().then(store => {
              const promise = store.data.items.length
                ? $App.dialogYesNo('Увага', UB.i18n('Раніше внесені дані будуть видалені. Продовжити?'))
                : Promise.resolve(true)
              promise.then(result => {
                if (result) {
                  me.setLoading(true)
                  $App.connection.run({
                    entity: 'hr_empOrderAddsalaryDet',
                    method: 'loadAccrualChangesFromStaffTable',
                    orderID: me.instanceID,
                    staffTableID: params.staffTableID,
                    datePosCheck: params.datePosCheck,
                    posAccrualCheck: params.posAccrualCheck
                  }).then(() => {
                    grid.onRefresh()
                  }).finally(() => {
                    me.setLoading(false)
                  })
                }
              })
            })
          }
        })
      }
    }
  })
}

function addAccrualChangesFromTariffing () {
  const me = this
  if (me.record.get('orderState') !== 'PROJECT') {
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_empOrderAddsalaryStaffTariffing',
    isModal: true,
    cmpInitConfig: {
      staffTariffingID: me.record.get('staffTariffingID'),
      organizationID: me.record.get('organizationID'),
      onSelect: (params) => {
        me.record.set('staffTariffingID', params.staffTariffingID)
        me.saveForm().then(result => {
          if (result !== -1) {
            const grid = me.down('[name=hr_empOrderDet]')
            const gridStore = grid.getStore()
            gridStore.load().then(store => {
              const promise = store.data.items.length
                ? $App.dialogYesNo('Увага', UB.i18n('Раніше внесені дані будуть видалені. Продовжити?'))
                : Promise.resolve(true)
              promise.then(result => {
                if (result) {
                  me.setLoading(true)
                  $App.connection.run({
                    entity: 'hr_empOrderAddsalaryDet',
                    method: 'loadAccrualChangesFromStaffTariffing',
                    orderID: me.instanceID,
                    organizationID: me.record.get('organizationID'),
                    staffTariffingID: params.staffTariffingID
                  }).then(() => {
                    grid.onRefresh()
                  }).finally(() => {
                    me.setLoading(false)
                  })
                }
              })
            })
          }
        })
      }
    }
  })
}

function makeMailingLetterTemplateMenu () {
  const me = this
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  const organizationID = me.record.get('organizationID') || appAC.globalOrganization()
  if (!me.isMailingLetterTemplateMenuCreated) {
    me.isMailingLetterTemplateMenuCreated = true
    const grid = me.down('[name=mailingLetterList]')
    let tb = grid.down('toolbar')
    tb.insert(tb.items.length - 2, {
      xtype: 'button',
      scale: 'medium',
      text: UB.i18n('По шаблону'),
      cls: 'fill-action',
      actionId: 'mailingByTemplate',
      menu: []
    })
  }
  const templateBtn = me.down('[actionId=mailingByTemplate]')
  if (templateBtn) {
    templateBtn.menu.removeAll(true)
    templateBtn.menu.add({
      text: UB.i18n('Створити шаблон'),
      cls: 'add-new-action',
      handler: () => {
        UB.Repository('hr_mailingLetter')
          .attrs('ID')
          .where('empOrderID', '=', me.instanceID)
          .limit(1)
          .selectScalar()
          .then(ID => {
            if (!ID) {
              $App.dialogError(UB.i18n('Неможливо створити шаблон листа розсилки, оскільки у документі відсутні учасники.<br>Додайте учасників і після цього створіть шаблон листа розсилки'), UB.i18n('Помилка'))
              return
            }
            $App.doCommand({
              cmdType: 'showForm',
              entity: 'hr_mailingLetterTemplate',
              instanceID: null,
              cmpInitConfig: {
                orderID: me.instanceID,
                defaultValues: {
                  empOrderType,
                  organizationID
                },
                initComponentDone: function () {
                  let form = this
                  form.on('beforeClose', function () {
                    me.makeMailingLetterTemplateMenu()
                  })
                }
              }
            })
          })
      }
    })
    UB.Repository('hr_mailingLetterTemplate').attrs(['ID', 'name'])
      .where('organizationID', '=', organizationID, 'organizationID')
      .where('organizationID', 'isNull', '', 'orgIsNull')
      .where('empOrderType', '=', empOrderType, 'empOrderType')
      .where('empOrderType', 'isNull', '', 'typeIsNull')
      .logic('(([organizationID] OR [orgIsNull]) AND ([empOrderType] OR [typeIsNull]))')
      .orderBy('name')
      .selectAsObject().then(data => {
        data.forEach((item, idx) => {
          if (idx === 0) {
            templateBtn.menu.add(
              {
                xtype: 'menuseparator'
              })
          }
          templateBtn.menu.add({
            text: item.name,
            menu: {
              items: [
                {
                  text: UB.i18n('Додати учасників'),
                  iconCls: 'fas fa-plus-circle',
                  handler: () => {
                    $App.connection.run({
                      entity: 'hr_mailingLetterTemplate',
                      method: 'loadFromTemplate',
                      mailLetterTemplateID: item.ID,
                      orderID: me.instanceID,
                      organizationID,
                      isDeleteExisting: true
                    }).then(mParams => {
                      const grid = me.down('[name=mailingLetterList]')
                      grid && grid.onRefresh()
                    })
                  }
                },
                {
                  text: UB.i18n('Редагувати'),
                  iconCls: 'fas fa-edit',
                  handler: () => {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_mailingLetterTemplate',
                      instanceID: item.ID,
                      cmpInitConfig: {
                        initComponentDone: function () {
                          let form = this
                          form.on('beforeClose', function () {
                            me.makeMailingLetterTemplateMenu()
                          })
                        }
                      }
                    })
                  }
                },
                {
                  text: UB.i18n('Видалити'),
                  iconCls: 'far fa-trash-alt',
                  handler: () => {
                    $App.dialogYesNo('Попередження', `Дійсно видалити шаблон "${item.name}"?`)
                      .then(res => {
                        if (res) {
                          $App.connection.run({
                            entity: 'hr_mailingLetterTemplate',
                            method: 'delete',
                            execParams: {
                              ID: item.ID
                            }
                          }).then(() => {
                            me.makeMailingLetterTemplateMenu()
                          })
                        }
                      })
                  }
                }
              ]
            }
          })
        })
      })
  }
}

function makeSignersTemplateMenu () {
  const me = this
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  const organizationID = me.record.get('organizationID') || appAC.globalOrganization()
  if (!me.isSignersTemplateMenuCreated) {
    me.isSignersTemplateMenuCreated = true
    const grid = me.down('[name=empOrderSignersGrid]')
    let tb = grid.down('toolbar')
    tb.insert(tb.items.length - 2, {
      xtype: 'button',
      scale: 'medium',
      text: UB.i18n('По шаблону'),
      cls: 'fill-action',
      actionId: 'signersByTemplate',
      menu: []
    })
  }
  const templateBtn = me.down('[actionId=signersByTemplate]')
  if (templateBtn) {
    templateBtn.menu.removeAll(true)
    templateBtn.menu.add({
      text: UB.i18n('Створити шаблон'),
      cls: 'add-new-action',
      handler: () => {
        UB.Repository('hr_empOrderSignDet')
          .attrs('ID')
          .where('orderID', '=', me.instanceID)
          .limit(1)
          .selectScalar()
          .then(ID => {
            if (!ID) {
              $App.dialogError(UB.i18n('Неможливо створити шаблон підписантів, оскільки у документі відсутні учасники.<br>Додайте учасників і після цього створіть шаблон підписантів'), UB.i18n('Помилка'))
              return
            }
            $App.doCommand({
              cmdType: 'showForm',
              entity: 'hr_empOrderSignTemplate',
              instanceID: null,
              cmpInitConfig: {
                orderID: me.instanceID,
                defaultValues: {
                  empOrderType,
                  organizationID
                },
                initComponentDone: function () {
                  let form = this
                  form.on('beforeClose', function () {
                    me.makeSignersTemplateMenu()
                  })
                }
              }
            })
          })
      }
    })
    UB.Repository('hr_empOrderSignTemplate').attrs(['ID', 'name'])
      .where('organizationID', '=', organizationID, 'organizationID')
      .where('organizationID', 'isNull', '', 'orgIsNull')
      .where('empOrderType', '=', empOrderType, 'empOrderType')
      .where('empOrderType', 'isNull', '', 'typeIsNull')
      .logic('(([organizationID] OR [orgIsNull]) AND ([empOrderType] OR [typeIsNull]))')
      .orderBy('name')
      .selectAsObject().then(data => {
        data.forEach((item, idx) => {
          if (idx === 0) {
            templateBtn.menu.add(
              {
                xtype: 'menuseparator'
              })
          }
          templateBtn.menu.add({
            text: item.name,
            menu: {
              items: [
                {
                  text: UB.i18n('Додати учасників'),
                  iconCls: 'fas fa-plus-circle',
                  handler: () => {
                    $App.connection.run({
                      entity: 'hr_empOrderSignTemplate',
                      method: 'loadFromTemplate',
                      empOrderSignTemplateID: item.ID,
                      orderID: me.instanceID,
                      organizationID,
                      isDeleteExisting: true
                    }).then(mParams => {
                      const grid = me.down('[name=empOrderSignersGrid]')
                      grid && grid.onRefresh()
                    })
                  }
                },
                {
                  text: UB.i18n('Редагувати'),
                  iconCls: 'fas fa-edit',
                  handler: () => {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_empOrderSignTemplate',
                      instanceID: item.ID,
                      cmpInitConfig: {
                        initComponentDone: function () {
                          let form = this
                          form.on('beforeClose', function () {
                            me.makeSignersTemplateMenu()
                          })
                        }
                      }
                    })
                  }
                },
                {
                  text: UB.i18n('Видалити'),
                  iconCls: 'far fa-trash-alt',
                  handler: () => {
                    $App.dialogYesNo('Попередження', `Дійсно видалити шаблон "${item.name}"?`)
                      .then(res => {
                        if (res) {
                          $App.connection.run({
                            entity: 'hr_empOrderSignTemplate',
                            method: 'delete',
                            execParams: {
                              ID: item.ID
                            }
                          }).then(() => {
                            me.makeSignersTemplateMenu()
                          })
                        }
                      })
                  }
                }
              ]
            }
          })
        })
      })
  }
}

function setDocumentOrderType () {
  const me = this
  const { documentOrderType } = me.attr
  if (documentOrderType.getValue()) return

  let orgID = me.attr.organizationID.getValue() || appAC.globalOrganization()
  const installedConstant = AC.settings.get('hrEmpOrderPrintType', orgID)
  installedConstant === 'APPOINTMENT' ? documentOrderType.setValue('APPOINTMENT') : documentOrderType.setValue('ORDER')
}

async function fillEmpOrdListAppruvList (form) {
  const orderID = form.instanceID
  if (orderID) {
    $App.connection.run({
      entity: 'hr_empOrdListAppruv',
      method: 'insertEmpOrdListAppruvList',
      orderID
    }).then(res => {
      if (!res.addItems) {
        $App.dialogInfo('На сторінці маршруту погодження не внесені дані про погодження документу')
      } else {
        form.addItems = res.addItems
        form.down('[actionId=addFromRoute]').setVisible(res.addItems)
      }
    })
  }
  form.onRefresh()
}

function getRecparticipant (instanceID) {
  const result = UB.Repository('hr_recparticipant')
    .attrs(['ID', 'employeePosition.positionID', 'employeePosition', 'executionDate', 'recStageID.stageKind'])
    .where('recStageID.docID.empOrderID', '=', instanceID)
    .where('recStageID.entityName', '=', 'hr_recstage')
    .orderBy('recStageID.orderIndex', 'asc')
    .selectAsObject({
      'employeePosition.positionID': 'positionID',
      'employeePosition': 'employeePositionID',
      'recStageID.stageKind': 'stageKind'
    })
  return result
}
function makeEmpOrdListAppruvTemplateMenu () {
  const me = this
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  const organizationID = me.record.get('organizationID') || appAC.globalOrganization()
  if (!me.isAppruvByTemplateMenuCreated) {
    me.isAppruvByTemplateMenuCreated = true
    const grid = me.down('[name=empOrdListAppruv]')
    let tb = grid.down('toolbar')
    tb.insert(tb.items.length - 3, {
      xtype: 'button',
      scale: 'medium',
      text: UB.i18n('По шаблону'),
      cls: 'fill-action',
      actionId: 'appruvByTemplate',
      menu: []
    })
  }
  const templateBtn = me.down('[actionId=appruvByTemplate]')
  if (templateBtn) {
    templateBtn.menu.removeAll(true)
    templateBtn.menu.add({
      text: UB.i18n('Створити шаблон'),
      cls: 'add-new-action',
      handler: () => {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_empOrdListAppruvTemplate',
          instanceID: null,
          cmpInitConfig: {
            orderID: me.instanceID,
            defaultValues: {
              empOrderType,
              organizationID
            },
            initComponentDone: function () {
              let form = this
              form.on('beforeClose', function () {
                me.makeEmpOrdListAppruvTemplateMenu()
              })
            }
          }
        })
      }
    })
    UB.Repository('hr_empOrdListAppruvTemplate').attrs(['ID', 'name'])
      .where('organizationID', '=', organizationID, 'organizationID')
      .where('organizationID', 'isNull', '', 'orgIsNull')
      .where('empOrderType', '=', empOrderType, 'empOrderType')
      .where('empOrderType', 'isNull', '', 'typeIsNull')
      .logic('(([organizationID] OR [orgIsNull]) AND ([empOrderType] OR [typeIsNull]))')
      .orderBy('name')
      .selectAsObject()
      .then(data => {
        data.forEach((item, idx) => {
          if (idx === 0) {
            templateBtn.menu.add(
              {
                xtype: 'menuseparator'
              })
          }
          templateBtn.menu.add({
            text: item.name,
            menu: {
              items: [
                {
                  text: UB.i18n('Додати учасників'),
                  iconCls: 'fas fa-plus-circle',
                  handler: () => {
                    $App.connection.run({
                      entity: 'hr_empOrdListAppruvTemplate',
                      method: 'loadFromTemplate',
                      empOrdListAppruvTemplateID: item.ID,
                      orderID: me.instanceID,
                      organizationID,
                      isDeleteExisting: true
                    }).then(mParams => {
                      const grid = me.down('[name=empOrdListAppruv]')
                      grid && grid.onRefresh()
                    })
                  }
                },
                {
                  text: UB.i18n('Редагувати'),
                  iconCls: 'fas fa-edit',
                  handler: () => {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_empOrdListAppruvTemplate',
                      instanceID: item.ID,
                      cmpInitConfig: {
                        initComponentDone: function () {
                          let form = this
                          form.on('beforeClose', function () {
                            me.makeEmpOrdListAppruvTemplateMenu()
                          })
                        }
                      }
                    })
                  }
                },
                {
                  text: UB.i18n('Видалити'),
                  iconCls: 'far fa-trash-alt',
                  handler: () => {
                    $App.dialogYesNo('Попередження', `Дійсно видалити шаблон "${item.name}"?`)
                      .then(res => {
                        if (res) {
                          $App.connection.run({
                            entity: 'hr_empOrdListAppruvTemplate',
                            method: 'delete',
                            execParams: {
                              ID: item.ID
                            }
                          }).then(() => {
                            me.makeEmpOrdListAppruvTemplateMenu()
                          })
                        }
                      })
                  }
                }
              ]
            }
          })
        })
      })
  }
}

async function fillEvaluationType (form, evaluationType) {
  const orderID = form.instanceID
  const grid = form.attr.acquaintanceList
  const gridItems = JSON.stringify(grid.getStore() && grid.getStore().data ? grid.getStore().data.items.map(o => {
    return {
      ID: o.data.ID,
      recStageID: o.data['participantID.recStageID'],
      acquaintanceStatus: o.data.acquaintanceStatus
    }
  }) : [])
  grid.setLoading(true)
  if (orderID) {
    $App.connection.run({
      entity: 'hr_acquaintanceList',
      method: 'addEvaluationType',
      orderID,
      orgID: appAC.globalOrganization(),
      gridItems,
      evaluationType
    }).finally(() => {
      grid.setLoading(false)
      grid.onRefresh()
    })
  }
}

function makeAcquaintanceListTemplateMenu () {
  const me = this
  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  const organizationID = me.record.get('organizationID') || appAC.globalOrganization()
  if (!me.isAcquaintanceListTemplateMenu) {
    me.isAcquaintanceListTemplateMenu = true
    const grid = me.down('[name=acquaintanceList]')
    let tb = grid.down('toolbar')
    tb.insert(tb.items.length - 2, {
      xtype: 'button',
      scale: 'medium',
      text: UB.i18n('По шаблону'),
      cls: 'fill-action',
      actionId: 'acquaintanceByTemplate',
      menu: []
    })
    tb.insert(tb.items.length - 4, {
      xtype: 'ubcombobox',
      name: 'evaluationType',
      fieldLabel: UB.i18n('Тип ознайомлення'),
      disableContextMenu: true,
      editable: false,
      pageSize: 50,
      width: 400,
      labelWidth: 160,
      valueField: 'code',
      displayField: 'name',
      ubRequest: {
        entity: 'ubm_enum',
        method: UB.core.UBCommand.methodName.SELECT,
        fieldList: ['code', 'name', 'eGroup'],
        whereList: {
          eGroup: {
            expression: '[eGroup]',
            condition: 'equal',
            values: { eGroup: 'HR_RECSTAGEKIND' }
          },
          code: {
            expression: '[code]',
            condition: 'in',
            value: ['INFO', 'ACQUAINTANCELIST_SIGN']
          }
        }
      },
      listeners: {
        change: async function (fld) {
          const me = fld.up('form')
          if (fld.getValue() !== fld.originalValue) {
            await me.fillEvaluationType(me, fld.getValue())
            fld.originalValue = fld.getValue()
          }
        }
      }
    })
  }
  const templateBtn = me.down('[actionId=acquaintanceByTemplate]')
  if (templateBtn) {
    templateBtn.menu.removeAll(true)
    templateBtn.menu.add({
      text: UB.i18n('Створити шаблон'),
      cls: 'add-new-action',
      handler: () => {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_empOrderAcquaintListTpl',
          cmpInitConfig: {
            orderID: me.instanceID,
            defaultValues: {
              empOrderType,
              organizationID
            },
            initComponentDone: function () {
              let form = this
              form.on('beforeClose', function () {
                me.makeAcquaintanceListTemplateMenu()
              })
            }
          }
        })
      }
    })
    UB.Repository('hr_empOrderAcquaintListTpl').attrs(['ID', 'name'])
      .where('organizationID', '=', organizationID)
      .where('empOrderType', '=', empOrderType)
      .orderBy('name')
      .selectAsObject().then(data => {
        data.forEach((item, idx) => {
          if (idx === 0) {
            templateBtn.menu.add(
              {
                xtype: 'menuseparator'
              })
          }
          templateBtn.menu.add({
            text: item.name,
            menu: {
              items: [
                {
                  text: UB.i18n('Додати учасників'),
                  iconCls: 'fas fa-plus-circle',
                  handler: () => {
                    (me.record.get('orderState') !== 'POSTED') && $App.connection.run({
                      entity: 'hr_empOrderAcquaintListTpl',
                      method: 'empOrdAcquaintanceLoadFromTemplate',
                      empOrdAcquaintanceListTemplateID: item.ID,
                      orderID: me.instanceID,
                      organizationID
                    }).then(mParams => {
                      const grid = me.down('[name=acquaintanceList]')
                      grid && grid.onRefresh()
                    })
                  }
                },
                {
                  text: UB.i18n('Редагувати'),
                  iconCls: 'fas fa-edit',
                  handler: () => {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_empOrderAcquaintListTpl',
                      instanceID: item.ID,
                      cmpInitConfig: {
                        initComponentDone: function () {
                          let form = this
                          form.on('beforeClose', function () {
                            me.makeAcquaintanceListTemplateMenu()
                          })
                        }
                      }
                    })
                  }
                },
                {
                  text: UB.i18n('Видалити'),
                  iconCls: 'far fa-trash-alt',
                  handler: () => {
                    $App.dialogYesNo('Попередження', `Дійсно видалити шаблон "${item.name}"?`)
                      .then(res => {
                        if (res) {
                          $App.connection.run({
                            entity: 'hr_empOrderAcquaintListTpl',
                            method: 'delete',
                            execParams: {
                              ID: item.ID
                            }
                          }).then(() => {
                            me.makeAcquaintanceListTemplateMenu()
                          })
                        }
                      })
                  }
                }
              ]
            }
          })
        })
      })
  }
}

async function reviewEmpl (form) {
  form.setLoading(true)
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'sendReview',
    docID: form.record.get('ID')
  }).then(res => {
    form.attr.acquaintanceList.store.reload()
    form.setLoading(false)
  })
}
