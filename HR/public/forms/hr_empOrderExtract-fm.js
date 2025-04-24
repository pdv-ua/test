/* jshint maxerr: 10000 */
/* global UB Ext HR appAC $App _ AC */

exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  createActions,
  filterDepartment,
  beforePosting,
  addBaseActions,
  onFormDataReady,
  onControlChanged,
  enableControls,
  onAfterOrderSave,
  onAfterOrderDelete,
  getReportName,
  isGlobalOrgOfType,
  initUBComponent,
  getOrderTypeName,
  initOrderComponentDone,
  allowChangeDocument,
  isStateChangable,
  setupRespEmployeePosition,
  onBeforeSave,
  filterOrder,
  filterDepartmentAndEmployee,
  fillAcquaintanceList,
  onCheckValidBeforeSaveOrder,
  filterOrganization,
  getMasterOrganizationName
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  if (!me.record.get('entryDate')) {
    me.record.set('entryDate', AC.dateService.truncTimeToUtcNull(me.record.get('orderDate')))
  }
  return HR.reportTab.saveReport(me)
}

function filterOrder (orgID) {
  const me = this
  if (me.isPosted) {
    return
  }
  const orderIDCtrl = me.attr.orderID
  orderIDCtrl.getStore().ubRequest.whereList = {
    masterOrganizationID: {
      expression: '[masterOrganizationID]',
      condition: 'equal',
      value: me.record.get('masterOrganizationID') || appAC.globalOrganization()
    },
    organizationID: {
      expression: '[organizationID]',
      condition: 'equal',
      value: orgID || me.attr.organizationID.getValue() || me.record.get('organizationID')
    },
    hasDetails: {
      expression: '',
      condition: 'subquery',
      'subQueryType': 'exists',
      value: {
        entity: 'hr_empOrderDet',
        method: 'select',
        fieldList: [
          'ID'
        ],
        whereList: {
          employeePositionNotDeleted: {
            expression: '[employeePositionID.mi_deleteDate]',
            condition: 'moreEqual',
            value: '#maxdate'

          },
          departmentNotDeleted: {
            expression: '[departmentID.mi_deleteDate]',
            condition: 'moreEqual',
            value: '#maxdate'

          },
          departmentNotDeleted1: {
            expression: '[employeePositionID.positionID.departmentID.mi_deleteDate]',
            condition: 'moreEqual',
            value: '#maxdate'

          },
          notDeleted: {
            expression: '[mi_deleteDate]',
            condition: 'moreEqual',
            value: '#maxdate'
          },
          depIsNotNull: {
            expression: '[departmentID]',
            condition: 'isNotNull'
          },
          depIsNotNull1: {
            expression: '[employeePositionID.positionID.departmentID]',
            condition: 'isNotNull'
          },
          empIsNotNull: {
            expression: '[employeePositionID]',
            condition: 'isNotNull'
          },

          correlat: {
            expression: '[orderID]=[{master}.ID]',
            condition: 'custom'
          }
        },
        logicalPredicates: ['((([depIsNotNull] AND [departmentNotDeleted]) OR ([empIsNotNull] AND [employeePositionNotDeleted])  OR ([depIsNotNull1] AND [departmentNotDeleted1])))']
      }
    },
    empOrderType: {
      expression: '[empOrderType]',
      condition: 'notIn',
      value: ['STAFFLIST', 'ORGSTRUCTURE', 'EXTRACT']
    }
  }
  orderIDCtrl.getStore().load().then(() => {
    if (!AC.viewUtils.checkValidComboVal(orderIDCtrl)) orderIDCtrl.clearValue()
  })
}

async function filterDepartmentAndEmployee (orderID, entryDate) {
  const me = this
  if (me.isPosted) {
    return
  }
  let idList = []
  if (orderID) {
    idList = await UB.Repository('hr_empOrderDet')
      .attrs('employeePositionID.departmentID', 'employeePositionID', 'departmentID')
      .where('orderID', '=', orderID)
      .where('departmentID', 'isNotNull', '', 'depIsNotNull')
      .where('employeePositionID', 'isNotNull', '', 'empIsNotNull')
      .where('employeePositionID.positionID.departmentID', 'isNotNull', '', 'depIsNotNull1')
      .misc({ __mip_recordhistory_all: true })
      .logic('([depIsNotNull] OR [empIsNotNull] OR [depIsNotNull1])')
      .selectAsObject()
  }
  me.attr.departmentID.getStore().ubRequest.__mip_recordhistory_all = true
  me.attr.departmentID.getStore().ubRequest.whereList = {
    ID: {
      expression: '[ID]',
      condition: 'in',
      value: idList.length ? [...new Set(idList.map(item => item.departmentID || item['employeePositionID.departmentID'] || 20))] : [20]
    }
  }

  me.attr.employeePositionID.getStore().ubRequest.whereList = {
    ID: {
      expression: '[ID]',
      condition: 'in',
      value: idList.length ? [...new Set(idList.map(item => item.employeePositionID || 20))] : [20]
    }
  }
  if (idList.length) {
    me.attr.departmentID.getStore().load()
    me.attr.employeePositionID.getStore().load()
  } else {
    me.attr.departmentID.getStore().loadData([])
    me.attr.employeePositionID.getStore().loadData([])
  }
}

function setTitleByOrderType (form) {
  HR.orderManager.setTitleByOrderType(form)
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
                  HR.reportTab.setReportMode(me, 'view')
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
    hidden: !AC.entityUtils.verifyRightsMethod('hr_recstage', 'canVisibleStopReconciliation'),
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
}

async function filterDepartment ({
  form,
  isReload = false,
  isClear = false,
  orgAttr = '',
  ctrl = null,
  onDate = appAC.globalApplicationDate() // this.record.get('orderDate')
} = {}) {
  // eslint-disable-next-line no-unused-vars
  const me = this
}

function beforePosting () {
  return Promise.resolve(true)
}

function initComponentStart () {
  const me = this
  me.defaultValues = me.defaultValues || {}
  me.on('afterrender', afterRender, me)
  me.on('beforeclose', () => {}, me)
  me.on('afterdelete', onAfterOrderDelete, me)

  me.reportMode = 'view'

  HR.orderManager.init(me)
}

function afterRender () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.getField('respEmployeePositionID'), ['editItem', 'addItem'])
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
  HR.orderManager.removeHidddenActions(me)
  me.createActions()
}

function getMasterOrganizationName () {
  const me = this
  const onDate = me.record.get('orderDate') || me.record.get('entryDate') || appAC.globalApplicationDate()
  UB.Repository('hr_organization')
    .attrs('name', 'description')
    .where('mi_data_id', '=', me.record.get('masterOrganizationID'))
    .where('state', '=', 'ACTIVE')
    .misc({
      __mip_ondate: onDate
    })
    .selectSingle().then(org => {
      if (org) me.down('[name=masterOrganizationName]').setValue(org.description)
    })
}

function onFormDataReady () {
  const me = this
  const onDate = appAC.globalApplicationDate()
  me.enableControls()
  if (me.isNewInstance) {
    if (me.defaultValues.organizationID) {
      me.record.set('organizationID', me.defaultValues.organizationID)
    }
    if (me.defaultValues.orderDate) {
      me.record.set('orderDate', me.defaultValues.orderDate)
    } else {
      me.record.set('orderDate', new Date())
    }
    me.record.set('orderNumber', UB.i18n('(проєкт)'))
    if (!me.record.get('respEmployeeNumID')) {
      me.record.set('respEmployeeNumID', $App.connection.userData('employeeNumberID') || null)
    }
    if (!me.record.get('respEmployeeID')) {
      $App.connection.run({
        entity: 'hr_employeePosition',
        method: 'getOrderSignerInfo',
        empOrderType: null,
        organizationID: appAC.globalOrganization()
      })
        .then(mParams => {
          me.attr.respEmployeePositionID.setValueById(mParams.result.employeePositionID)
          me.attr.respPositionID.setValueById(mParams.result.positionID)
          mParams.result.positionID && me.setupRespEmployeePosition({
            isReload: false,
            isClear: false,
            positionID: mParams.result.positionID
          })
        })
    }
    me.filterDepartmentAndEmployee()
  } else {
    me.reportOrderID = me.record.get('orderID')
    me.filterDepartmentAndEmployee(me.record.get('orderID'), me.record.get('entryDate'))
  }

  me.getMasterOrganizationName()

  me.filterOrganization(onDate)
  me.filterOrder()

  me.setupRespEmployeePosition({
    isReload: false
  })

  AC.viewUtils.setWhereListProperty(me.attr.respPositionID, [
    ['orgID', '=', me.record.get('organizationID')],
    ['mi_dateFrom', '<=', onDate],
    ['mi_dateTo', '>=', onDate],
    ['state', '=', 'ACTIVE']
  ], ['([isOrgBoss] OR [positionCategory])'])
}

function setupRespEmployeePosition ({
  positionID = this.record.get('respPositionID'),
  onDate = AC.dateService.truncTimeToUtcNull(this.record.get('orderDate') || this.record.get('entryDate')),
  isReload = false,
  isClear = false
}) {
  const me = this
  const respEmployeePosition = me.getField('respEmployeePositionID')
  const store = respEmployeePosition.getStore()
  store.ubRequest.positionID = positionID
  store.ubRequest.onDate = onDate
  store.ubRequest.method = 'getTempExecution'
  if (isClear) {
    respEmployeePosition.setValue(null)
  }
  if (isReload) {
    store.load().then(() => {
      respEmployeePosition.clearIsPhantom()
      me.attr.respPositionID.clearIsPhantom()
    })
  }
  respEmployeePosition.clearIsPhantom()
  me.attr.respPositionID.clearIsPhantom()
}

function onControlChanged (me, field, value, oldValue) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'entryDate':
        const entryDate = me.attr.entryDate.getValue() && me.attr.entryDate.isValid() ? me.attr.entryDate.getValue() : new Date()
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
        break
      case 'organizationID':
        if (field.skipChange) {
          field.skipChange = false
          return
        }
        setTimeout(() => {
          AC.viewUtils.setFilterValue(me.attr.respEmployeeNumID, {
            orgID: me.record.get('organizationID')
          })
        }, 300)
        me.filterOrder()
        break
      case 'orderID':
        me.reportOrderID = value
        if (field.getFieldValue('empOrderType') === 'CHGEMPLOYEE') {
          me.attr.departmentID.setValue()
          me.attr.departmentID.setDisabled(true)
        } else {
          me.attr.departmentID.setDisabled(false)
        }
        break
      case 'respPositionID':
        me.setupRespEmployeePosition({
          positionID: value,
          isReload: true
        })
        break
    }
  }
}

function enableControls () {
  const me = this
  const isPosted = !me.allowChangeDocument()
  me.isPosted = isPosted
  me.down('[ubID=pdfSettings]').query('[ignorePosted]').forEach(item => {
    item.setReadOnly(false)
    item.setDisabled(false)
  })
  me.actions.printDocumentAction.items[0].menu.down('[ubID=itemMakeReport]').setDisabled(isPosted)
  me.actions.printDocumentAction.items[0].menu.down('[ubID=itemEditReport]').setDisabled(isPosted)

  const empOrderType = me.record.get('empOrderType') || me.customParams.empOrderType
  // me.down('[actionId=addFromOrder]').setVisible(!isPosted)
  let canDelete = AC.entityUtils.verifyRightsMethod(me.entityName, 'delete')
  if ((!canDelete && !me.isAdmin) || !me.isStateChangable()) {
    me.actions['fDelete'].hide()
  } else {
    me.actions['fDelete'].show()
  }

  const canPost = AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting_' + empOrderType) || me.isAdmin
  if (!canPost) me.actions['postingAction'].setDisabled(true)
  const canCancelPost = AC.entityUtils.verifyRightsMethod(me.entityName, 'doCancelPosting_' + empOrderType) || me.isAdmin
  if (!canCancelPost) me.actions['cancelPostingAction'].setDisabled(true)

  HR.reportTab.setReportMode(me, me.reportMode, true)
  if (me.record.get('orderState') && me.record.get('orderState') !== 'POSTED') {
    if (AC.entityUtils.verifyRightsMethod(me.entityName, 'update') || me.isAdmin) {
      me.getField('orderNumber').setReadOnly(false)
      me.getField('orderDate').setReadOnly(false)
    }
  }
}

const allowChangeDocStates = ['PROJECT', 'ON_COMPLETION']
const allowChangeRouteStates = ['PROJECT', 'ON_COMPLETION', 'ON_RECONCILATION']

function isStateChangable () {
  return allowChangeDocStates.indexOf(this.record.get('orderState')) >= 0
}

function allowChangeDocument () {
  const me = this
  me.isAdmin = $App.connection.userData().roles.toUpperCase().split(',').includes('ADMIN')
  if (!me.isStateChangable()) {
    return false
  }
  if (me.isAdmin) {
    return true
  }
  return AC.entityUtils.verifyRightsMethod('hr_empOrder', 'update')
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
  /*
                  me.canEdit = !allowChangeDocStates.includes(newState)
                  if (me.canEdit) {
                    me.enableEdit()
                  } else {
                    me.disableEdit()
                  }
                  */
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
}

function onAfterOrderDelete () {
  const me = this
  if (me.forceRefreshSenderGrid) {
    AC.gridUtils.refreshSenderGrid(me)
  }
}

function getReportName () {
  const me = this
  me.reportExtraParams = {
    orderExtraID: me.instanceID
  }
  const empOrderType = me.attr.orderID.getFieldValue('empOrderType')
  if (empOrderType === 'BOUNTY_HELP') {
    return 'hr_empOrderBountyHelp'
  }
  if (empOrderType === 'CHGSALARYEMP') {
    return 'hr_empOrderChgsalary'
  }
  return HR.orderManager.getDetailEntityName(empOrderType, 'hr_empOrder', '')
}

function isGlobalOrgOfType (typeCode) {
  const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  return funcOrgType === typeCode
}

function initUBComponent () {
  const me = this
  stateChanged.bind(me)(me.record.get('orderState'))
}

function getOrderTypeName () {
  return UB.core.UBEnumManager.getStore('HR_EMPORDRETYPE').getById(this.record.get('empOrderType')).get('shortName')
}

function onBeforeSave () {
  // eslint-disable-next-line no-unused-vars
  const me = this
  if (!me.record.get('employeePositionID') && !me.record.get('departmentID')) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Необхідно заповнити або поле "Працівник" або поле "Підрозділ"'))
    return Promise.resolve(false)
  }
  return Promise.resolve(true)
}

function initComponentDone () {
  const me = this
  me.on('recordloaded', function (a) {
    const respEmployeePosition = me.getField('respEmployeePositionID')
    respEmployeePosition.getStore().ubRequest.positionID = me.attr.respPositionID.getValue()
    respEmployeePosition.getStore().ubRequest.method = 'getTempExecution'
    respEmployeePosition.getStore().load()
    if (me.isNewInstance) {
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('orderNumber', UB.i18n('(проєкт)'))
      me.record.set('empOrderType', 'EXTRACT')
      me.record.set('masterOrganizationID', appAC.globalOrganization())
    }

    return respEmployeeNumIDSetFilter(me)
  })
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
      .where('orderID', '=', form.record.get('orderID'))
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
        .where('evaluationType', '=', 'SIGN')
        .selectAsObject().then(async accList => {
          await Promise.all(needAdd.map(async (ite) => {
            const exist = accList.find(itm => {
              if (
                (ite.employeeID && itm.employeeID === ite.employeeID) ||
                (ite.employeePositionID && itm.employeePositionID === ite.employeePositionID)
              ) {
                return itm
              }
            })
            if (exist === undefined) {
              const execParams = {
                orderID: orderID,
                evaluationType: 'SIGN'
              }
              if (ite.employeePositionID) {
                execParams.employeePositionID = ite.employeePositionID
              } else if (ite.employeeID) {
                execParams.employeeID = ite.employeeID
              }
              if (execParams.employeePositionID || execParams.employeeID) {
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

function filterOrganization (onDate) {
  const me = this
  const orgStore = me.attr.organizationID.getStore()
  if (orgStore.ubRequest.whereList) {
    return
  }

  orgStore.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(onDate || new Date())
  orgStore.ubRequest.whereList = {
    state: {
      expression: '[state]',
      condition: 'equal',
      value: 'ACTIVE'
    },
    masterPath: {
      expression: '[mi_treePath]',
      condition: 'startWith',
      value: '/' + me.record.get('masterOrganizationID') + '/'
    },
    masterID: {
      expression: '[mi_data_id]',
      condition: 'equal',
      value: me.record.get('masterOrganizationID')
    }
  }
  orgStore.ubRequest.logicalPredicates = ['([masterPath] OR [masterID])']
  me.attr.organizationID.setValueById(me.record.get('organizationID'))
  me.attr.organizationID.clearIsPhantom()
}
