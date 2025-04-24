/* global UB, AC, appHR, $App, _ Ext HR */
exports.formCode = {
  initComponentDone,
  onFormDataReady,
  treePanelSelect,
  activateTab,
  makeAddByTypeItemsMenu,
  getPrintDocument,
  getReportName,
  onControlChanged,
  showStaffTree,
  setSupervisorPosition,
  addNewPositionRight,
  getOrgMiDataId,
  filterEmployeePosition,
  addBaseActions,
  createActions,
  initComponentStart,
  onCheckValidBeforeSaveOrder
}
// const allowChangeRouteStates = ['PROJECT', 'ON_COMPLETION', 'ON_RECONCILATION']

function initComponentStart () {
  let me = this
  me.defaultValues = me.defaultValues || {}
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
  HR.orderManager.init(me)
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  return HR.reportTab.saveReport(me)
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction', 'calculatedAction', 'unCalculatedAction',
      'startReconciliation', 'stopReconciliation', 'toCompletion', 'renewTask'
    ],
    state: {
      PROJECT: {
        action: ['postingAction', 'fDelete', 'startReconciliation']
      },
      ON_RECONCILATION: {
        action: ['stopReconciliation']
      },
      REJECTED: {
        action: ['fDelete', 'startReconciliation']
      },
      RECONCILED: {
        action: ['postingAction']
      },
      RETURNED_FROM_RECONCILATION: {
        action: ['toCompletion', 'renewTask']
      },
      ON_COMPLETION: {
        action: ['postingAction', 'fDelete', 'startReconciliation']
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
  me.createActions()
}
function createActions () {
  const me = this
  me.actions.toCompletion = new Ext.Action({
    iconCls: 'fas fa-thumbs-down',
    cls: 'blue-action',
    tooltip: UB.i18n('На доопрацювання'),
    text: UB.i18n('На доопрацювання'),
    actionId: 'toCompletion',
    // hidden: true,
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
    // actionText: 'Розпочати узгодження',
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
      me.saveForm().then(result => {
        if (result !== -1) {
          HR.reportTab.checkAndSetReport(me, {
            isCheckOnly: true
          })
            .then(result => {
              if (result) {
                return $App.connection.run({
                  entity: 'hr_recstage',
                  method: 'startReconciliation',
                  docID: me.record.get('ID')
                }).then(function () {
                  return me.loadInstance()
                }).then(function () {
                  HR.reportTab.setReportMode(me, 'view', true)
                  me.down('recpanel').updateTree()
                  return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
                })
              }
            })
        }
      })
    }
  })

  me.actions.stopReconciliation = new Ext.Action({
    // actionText: 'Розпочати узгодження',
    iconCls: 'fas fa-stop',
    cls: 'blue-action',
    tooltip: UB.i18n('Відмінити узгодження'),
    text: UB.i18n('Відмінити узгодження'),
    actionId: 'stopReconciliation',
    // eventId: 'startReconciliation',
    // hidden: true, // me.record.get('orderState') !== 'ON_RECONCILATION',
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
              // me.actions.stopReconciliation.hide()
              return $App.dialogInfo(UB.i18n('Узгодження відмінено'))
            })
          }
        })
    }
  })
}
function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('controlChanged', onControlChanged, me)
}

async function getDep (thisID) {
  let doThis = true

  while (doThis) {
    const res = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'mi_unityEntity', 'parentUnitID'])
      .where('mi_data_id', '=', thisID)
      .selectSingle()
    if (!res) {
      doThis = false
    }
    if (doThis) {
      if (res.mi_unityEntity === 'hr_department') {
        return res.mi_data_id
      }
      thisID = res.parentUnitID
    }
  }
  return null
}

function setSupervisorPosition (positionID) {
  const me = this
  $App.connection.run({
    entity: 'hr_position',
    method: 'getSupervisorPosition',
    onDate: appAC.globalApplicationDate(),
    positionID: positionID
  }).then((superData) => {
    const supervisor = superData.supervisor
    if (supervisor && supervisor.mi_data_id) {
      me.attr.supervisorPosID.setValueById(supervisor.mi_data_id)
    } else {
      me.attr.supervisorPosID.setValueById(null)
    }
    if (superData && superData.indepStruct) {
      me.attr.indepStructUnitID.setValueById(superData.indepStruct.mi_data_id)
    } else {
      me.attr.indepStructUnitID.setValueById(null)
    }
    if (superData && superData.headIndStrUnitPos) {
      me.attr.headIndStrUnitPosID.setValueById(superData.headIndStrUnitPos.mi_data_id)
    } else {
      me.attr.headIndStrUnitPosID.setValueById(null)
    }
  })
}

function onFormDataReady () {
  const me = this
  const positionID = me.record.get('positionID')
  const grid = AC.gridUtils.getSenderGrid(me)
  if (!me.sender || grid.name === 'positionInstructionDt') {
    me.attr.positionID.setReadOnly(true)
    me.attr.departmentID.setReadOnly(true)
    me.attr.departmentID.clearListeners()
    me.attr.positionID.clearListeners()
    me.down('[ubID=btnSelectByTree]').hide()
  }

  if (me.isNewInstance) {
    if (positionID) {
      UB.Repository('hr_position')
        .attrs(['orgID', 'name', 'parentUnitID', 'parentUnitID.mi_unityEntity'])
        .where('mi_data_id', '=', positionID)
        .selectSingle(positionID)
        .then(async (data) => {
          me.record.set('namePosition', data ? data.name : '')
          const depID = await getDep(positionID)
          me.record.set('departmentID', depID)
        })
      me.setSupervisorPosition(positionID)
    }

    if (!me.record.get('employeePositionID')) {
      const onDate = appAC.globalApplicationDate() // AC.dateService.truncTimeToUtcNull(me.record.get('orderDate') || new Date())
      UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('organizationID', '=', me.record.get('organizationID') || appAC.globalOrganization())
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.isOrgBoss', '=', 1)
        .where('positionID.mi_dateFrom', '<=', onDate)
        .where('positionID.mi_dateTo', '>=', onDate)
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .selectScalar().then(employeePositionID => {
          if (employeePositionID) {
            me.attr.employeePositionID.setValueById(employeePositionID)
          }
        })
    }
    me.record.set('organizationID', appAC.globalOrganization())
  }

  me.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID',
    logicalPredicates: ['(([isOrgBoss]) OR ([positionCategory]))'],
    params: [
      ['organizationID', '=', appAC.globalOrganization()],
      ['dateTo', '>=', appAC.globalApplicationDate()],
      ['dateFrom', '<=', appAC.globalApplicationDate()],
      ['positionID.isOrgBoss', '=', 1, 'isOrgBoss'],
      ['positionID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
      ['positionID.mi_dateTo', '>=', appAC.globalApplicationDate()],
      ['positionID.positionCategory', '=', '1', 'positionCategory'],
      ['positionID.state', '=', 'ACTIVE'],
      ['positionID.mi_deleteDate', '>=', '#maxdate']
    ]
  })

  AC.viewUtils.setWhereListProperty(me.attr.indepStructUnitID, [
    ['orgID', '=', appAC.globalOrganization()],
    ['state', '=', 'ACTIVE'],
    ['mi_dateTo', '>=', appAC.globalApplicationDate()],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()]
  ])
  AC.viewUtils.setWhereListProperty(me.attr.supervisorPosID, [
    ['orgID', '=', appAC.globalOrganization()],
    ['state', '=', 'ACTIVE'],
    ['mi_dateTo', '>=', appAC.globalApplicationDate()],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()]
  ])
  AC.viewUtils.setWhereListProperty(me.attr.headIndStrUnitPosID, [
    ['orgID', '=', appAC.globalOrganization()],
    ['state', '=', 'ACTIVE'],
    ['mi_dateTo', '>=', appAC.globalApplicationDate()],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()]
  ])
  AC.viewUtils.setWhereListProperty(me.attr.coordActUnitPosID, [
    ['orgID', '=', appAC.globalOrganization()],
    ['state', '=', 'ACTIVE'],
    ['mi_dateTo', '>=', appAC.globalApplicationDate()],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()]
  ])

  const isDisabled = !me.isEditable()
  me.down('[actionId=addByType]').setDisabled(isDisabled)
  me.down('[ubID=btnSelectByTree]').setDisabled(isDisabled)
  me.down('[ubID=btnSelectByTree1]').setDisabled(isDisabled)
  me.down('[ubID=btnSelectByTree2]').setDisabled(isDisabled)
  me.down('[ubID=btnSelectByTree3]').setDisabled(isDisabled)
  me.down('[ubID=btnSelectByTree4]').setDisabled(isDisabled)
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'positionID':
      me.setSupervisorPosition(value)
      me.record.set('namePosition', field.getFieldValue('name'))
      break
    case 'dateTo':
      if (me.attr.dateTo.getValue()) {
        me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
      }
      break
    case 'dateFrom':
      if (me.attr.dateFrom.getValue()) {
        me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
      }
      break
  }
}

function treePanelSelect (tree, record) {
  const me = tree.view.up('form')
  tree.view.up('[ubId=menuPanel]').activateTab(record.raw.nodeId, me)
  if (tree.current) {
    tree.current.set('cls', '')
  }
  tree.current = record
  tree.current.set('cls', 'biz-person-tree-selected-text')
}

function activateTab (nodeId, me) {
  if (!nodeId) {
    return
  }
  const tabPanel = me.down('tabpanel')
  const tabs = tabPanel.items.items
  let tab = tabPanel.down('[nodeId=' + nodeId + ']')
  const alwaysVisibleTabs = ['hr_positionInstructionAcqListTab', 'hr_positionDocumentTab', 'hr_positionDirectionTab']
  tabs.forEach(function (item) {
    if (alwaysVisibleTabs.indexOf(item.nodeId) === -1 && item.ubID !== 'report') {
      item.tab.hide()
    }
  })
  tab.tab.show()
  tabPanel.setActiveTab(tab)
}

function makeAddByTypeItemsMenu (btn) {
  let me = this
  if (me.isItemsMenuCreated) {
    return
  }
  const grid = btn.up('ubdetailgrid')
  me.isItemsMenuCreated = true
  let actionControls = me.query('[actionId=addByType]')
  actionControls.forEach(ctrl => {
    ctrl.menu.items.removeAll()
  })
  UB.core.UBEnumManager.getStore('HR_POSITION_RIGHTRESP').each(item => {
    let menuItem = {
      text: item.data.name,
      typeCode: item.data.code,
      handler: menuItem => {
        $App.doCommand({
          cmdType: 'showForm',
          entity: grid.entityName,
          sender: grid,
          formCode: 'hr_positionRightResponsibiliti',
          isModal: true,
          parentContext:
          {
            positionInstructionID: me.record.get('ID'),
            type: menuItem.typeCode,
            itemIdx: grid.getStore().getCount() + 1
          },
          onClose: function () {
            grid.onRefresh()
          }
        })
      }
    }
    actionControls.forEach(ctrl => {
      ctrl.menu.add(menuItem)
    })
  })
}

function addNewPositionRight (btn) {
  const me = this
  const grid = btn.up('ubdetailgrid')
  $App.doCommand({
    cmdType: 'showForm',
    entity: grid.entityName,
    sender: grid,
    formCode: 'hr_positionRightResponsibiliti',
    isModal: true,
    parentContext:
      {
        positionInstructionID: me.record.get('ID'),
        type: 'COMMON',
        itemIdx: grid.getStore().getCount() + 1
      },
    onClose: function () {
      grid.onRefresh()
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
    entity: 'hr_positionInstruction',
    method: 'repPrintForm',
    params: {
      instanceID,
      type
    }
  }).then(function (result) {
    const reportCode = 'hr_positionInstruction'
    let report = Ext.create('UBS.UBReport', {
      code: reportCode,
      type: 'html',
      params: JSON.parse(result.content)
    })

    report.init().then(function () {
      let config = {
        cmdType: 'showForm',
        formCode: 'ac_documentViewer',
        caption: UB.i18n('Друкована форма'),
        cmpInitConfig: { report },
        tabId: 'printDocument' + reportCode + me.instanceID,
        description: me.initialConfig.commandConfig.description,
        target: $App.getViewport().centralPanel
      }
      $App.doCommand(config)
    })
  }).then(function () {
    me.setLoading(false)
  })
}

function getReportName () {
  return 'hr_positionInstruction'
}

function showStaffTree (ctrl, nodeType = 'POSUNIT') {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_staffTreeSelect',
    customParams: {
      organizationID: appAC.globalOrganization(),
      onDate: appAC.globalApplicationDate(),
      onSelectNodeHandler: function (tree) {
        const record = tree.getCurrentRecord()
        const data = record.raw
        if (data.nodeType === nodeType) {
          ctrl.setValueById(data.ID)
        }
        Ext.defer(function () {
          ctrl.focus(true)
        }, 1000)
        return Promise.resolve(true)
      }
    }
  })
}

function filterEmployeePosition (form, {
  ctrlToFilter = null,
  attrToFilter = 'employeePositionID',
  clearValue = false,
  departmentMiDataId = null,
  onDate = appAC.globalApplicationDate(),
  logicalPredicates = null,
  params = null
} = {}) {
  const me = this
  onDate = AC.dateService.truncTimeToUtcNull(onDate)
  let filterValue
  const filters = [
    ['dateFrom', '<=', onDate],
    ['dateTo', '>=', onDate],
    ['employeeID.mi_deleteDate', '>=', '#maxdate']
  ]
  if (departmentMiDataId) {
    filters.push(
      ['departmentID', '=', departmentMiDataId], ['departmentID.mi_dateFrom', '<=', onDate], ['departmentID.mi_dateTo', '>=', onDate], ['departmentID.mi_deleteDate', '>=', '#maxdate'])
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
        AC.viewUtils.showToast('Помилка', UB.i18n(`hr_positionInstruction.js->filterEmployeePosition() - на формі {0} не знайдено поле {1}`, form.formCode, item))
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
  })
}

function getOrgMiDataId (customOrgID) {
  const me = this
  if (me.record.get('organizationID.mi_data_id')) {
    return Promise.resolve(me.record.get('organizationID.mi_data_id'))
  }
  customOrgID = customOrgID || appAC.globalOrganization()
  return UB.Repository('hr_organization').attrs(['mi_data_id', 'description']).misc({
    __allowSelectSafeDeleted: true,
    __mip_recordhistory_all: true
  }).selectById(customOrgID).then(data => {
    return data.mi_data_id
  })
}
