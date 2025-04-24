/* global UB AC appAC Ext $App HR _ appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  addBaseActions,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  openFillWorkPlace,
  loadFormWorkPlace,
  fillWorkPlace,
  onAfterDelete,
  workPlaceActionInit
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['workPlaceDt'],
    stateAttrName: 'docState',
    orderDateAttrName: 'docDate'
  }
  HR.orderManager.init(me)
  me.on('afterDelete', onAfterDelete, me)
  me.on('beforesave', beforeSave, me)
  me.on('beforeClose', onBeforeClose, me)
}

function onAfterOrderSave () {
  /* const me = this
  AC.gridUtils.refreshSenderGrid(me) */
}

function onAfterDelete () {
  AC.gridUtils.refreshSenderGrid(this)
}

function initOrderComponentDone () {
  const me = this
  me.workPlaceActionInit(me)
}

async function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    // me.attr.name.setValue(UB.i18n('Тарифікація'))
    me.record.set('orgID', appAC.globalOrganization())
    me.currentPeriod = await appHR.getCurrentPeriod(me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization())
    me.record.set('dateFrom', me.currentPeriod.dateFrom)
    const settings = JSON.parse(UB.core.UBLocalStorageManager.getItem('trf_document') || '{}')
    me.record.set('type', settings.type || 'FACT')
  }
  me.setTitle(`Тарифікація № ${me.record.get('docNumber')} вiд ${AC.dateService.formatDate(me.record.get('docDate'), 'dd.mm.yyyy')} Наказ № ${me.record.get('docNumber') || ''} вiд ${AC.dateService.formatDate(me.record.get('orderDate'), 'dd.mm.yyyy') || ''}`)
  HR.orderManager.setOrderRegistryActions(me)
}

function onControlChanged (me, field, value, oldValue) {
  // if (field.name === 'type' && (me.isNewInstance || oldValue) && me.attr.dateFrom.getValue() === null) {
  //   const dateNow = new Date()
  //   const month = dateNow.getMonth()
  //   if (value === 'PLAN') {
  //     me.attr.dateFrom.setValue(new Date(dateNow.getFullYear(), month === 11 ? 0 : month + 1, 1))
  //   } else if (value === 'FACT') {
  //     me.attr.dateFrom.setValue(new Date(dateNow.getFullYear(), month, 1))
  //   }
  // }
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction', 'calcDocumentAction'],
    state: {
      PROJECT: { action: ['fDelete', 'postingAction', 'calcDocumentAction'] },
      PARTIALLY: { action: ['fDelete', 'postingAction', 'cancelPostingAction', 'calcDocumentAction'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
  me.actions.calcDocumentAction = new Ext.Action({
    iconCls: 'fas fa-calculator',
    cls: 'green-action',
    scale: 'medium',
    tooltip: UB.i18n('Розрахувати'),
    text: UB.i18n('Розрахувати'),
    actionId: 'calcDocumentAction',
    handler: function () {
      me.setLoading(true)
      UB.Repository('trf_workPlace')
        .attrs(['ID'])
        .where('documentID', '=', me.instanceID)
        .where('state', '=', 'PROJECT')
        .selectAsObject()
        .then((workPlaces) => {
          if (workPlaces.length) {
            $App.connection.run({
              entity: 'trf_workPlace',
              method: 'calcWorkPlaces',
              documentID: me.instanceID,
              IDs: JSON.stringify(workPlaces)
            }).then(function () {
              AC.gridUtils.refreshSenderGridForm(me)
              me.initialConfig.sender.getStore().load()
              me.loadInstance()
              me.setLoading(false)
            }).catch((err) => {
              me.setLoading(false)
              $App.dialogError(err, UB.i18n('Помилка'))
            })
          }
        }).catch((err) => {
          me.setLoading(false)
          $App.dialogError(err, UB.i18n('Помилка'))
        })
    }
  })
  me.actions.cleanDocument = new Ext.Action({
    iconCls: 'el-icon-document-delete',
    cls: 'blue-action',
    scale: 'medium',
    tooltip: UB.i18n('Видалення нарахувань'),
    text: UB.i18n('Видалення нарахувань'),
    actionId: 'cleanDocumentAction',
    handler: function () {
      me.setLoading(true)
      $App.dialogYesNo('Видалення нарахувань',
        `<strong>Увага!</strong></br></br>
        Для всіх робочих місць будуть видалені записи нарахувань, окрім: 
        <ul>
          <li>Тарифної ставки</li>
          <li>Підвищення тарифної ставки</li>
          <li>Тарифна ставка з підвищенням</li> 
        </ul>
        Продовжити?`).then(choice => {
        if (choice) {
          $App.connection.run({
            entity: 'trf_document',
            method: 'cleanPositionAccrual',
            documentID: me.instanceID,
            orgID: appAC.globalOrganization()
          }).then(() => {
            AC.gridUtils.refreshSenderGridForm(me)
            me.initialConfig.sender.getStore().load()
            me.loadInstance()
            me.setLoading(false)
          }).catch((err) => {
            me.setLoading(false)
            $App.dialogError(err, UB.i18n('Помилка'))
          })
        } else {
          me.setLoading(false)
        }
      })
    }
  })
  const printAction = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    text: UB.i18n('Друкувати'),
    actionId: 'printAction',
    eventId: 'printAction',
    menu: [
      {
        text: UB.i18n('Тарифікаційні листки'),
        handler: function () {
          const params = {
            documentID: me.instanceID,
            colCount: 1,
            showPostedWorkPlace: false,
            dateReport: new Date(Math.max.apply(null, me.attr.workPlaceDt.getData().map(o => Date.parse(o.dateFrom)))),
            tarificationType: me.attr.type.getValue()
          }
          doReport(me, 'trf_reportList', params)
        }
      },
      {
        text: UB.i18n('Тарифікаційний список працівників'),
        handler: function () {
          const params = {
            documentID: me.instanceID,
            showPostedWorkPlace: false,
            dateReport: new Date(Math.max.apply(null, me.attr.workPlaceDt.getData().map(o => Date.parse(o.dateFrom)))),
            tarificationType: me.attr.type.getValue(),
            allowBlank: true
          }
          doReport(me, 'trf_reportEmpList', params)
        }
      }
    ]
  })
  me.actions.printAction = printAction
}

function loadFormWorkPlace (me, grid, record) {
  const instanceID = record ? record.get('ID') : null
  $App.doCommand({
    cmdType: 'showForm',
    entity: 'trf_workPlace',
    formCode: 'trf_workPlaceEdit',
    instanceID,
    tabId: `trf_workPlace-${instanceID || (new Date()).getTime()}`,
    // title: record ? (record.get('employeeNumberID') ? record.raw[7] : UB.i18n('Робоче місце')) : UB.i18n('Робоче місце'),
    target: $App.getViewport().centralPanel,
    sender: grid,
    cmpInitConfig: {
      defaultValues: {
        documentID: me.instanceID,
        dateFrom: AC.dateService.shiftDate(me.record.get('dateFrom')),
        dateTo: me.record.get('dateToEmpty'),
        'documentID.orgID': me.record.get('orgID'),
        'documentID.docNumber': me.record.get('docNumber'),
        'documentID.type': me.record.get('type'),
        'documentID.docDate': me.record.get('docDate'),
        'documentID.name': me.record.get('name'),
        'documentID.dateFrom': me.record.get('dateFrom'),
        'documentID.dateTo': me.record.get('dateTo'),
        orderNumber: me.record.get('docNumber'),
        orderDate: me.record.get('dateFrom')
      },
      instanceID, // Удалить
      documentID: me.instanceID // Удалить
    }
  })
}

function fillWorkPlace (me, grid, addEmployee) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'trf_workPlace',
    method: 'setWorkPlaces',
    addEmployee: addEmployee
  }).then(() => {
    grid.getStore().load()
    me.setLoading(false)
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}

function openFillWorkPlace (me, grid) {
  const params = {
    periodDate: me.record.get('dateFrom') || me.record.get('docDate'),
    orgID: me.record.get('orgID'),
    docID: me.instanceID,
    docType: me.record.get('type'),
    dateFrom: me.record.get('dateFrom'),
    dateTo: me.record.get('dateToEmpty'),
    orderNumber: me.record.get('docNumber'),
    orderDate: me.record.get('orderDate') || me.record.get('dateFrom')
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: params.orgID,
      withoutQuittedEmployees: true,
      nullMainEmpNumberID: true,
      defaultValues: {
        periodID: null,
        dateFrom: me.record.get('dateFrom'),
        dateTo: me.record.get('dateToEmpty')
      },
      onSelect: (data) => {
        const addEmployee = {
          Numbers: [],
          orgID: params.orgID,
          docID: params.docID,
          docType: params.docType,
          orderNumber: params.orderNumber,
          orderDate: params.orderDate,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo || AC.dateService.unshiftDate(AC.dateService.maxDate())
        }
        const store = grid.getStore()
        const allRecords = store.snapshot || store.data
        const overlapEmployeeNumbers = []
        data.forEach(row => {
          const found = allRecords.items.find(o => o.get('employeeNumberID') === row.employeeNumberID)
          if (found) {
            overlapEmployeeNumbers.push(row['employeeNumberID.description'])
          }
          addEmployee.Numbers.push(row.employeeNumberID)
        })
        if (addEmployee.Numbers.length) {
          if (overlapEmployeeNumbers.length >= 1) {
            $App.dialogYesNo('Попередження', `Працівники які вже були додані раніше </br> ${overlapEmployeeNumbers.join('</br>')} </br> Додати повторно?`)
              .then(isYes => {
                if (isYes) {
                  fillWorkPlace(me, grid, addEmployee)
                } else {
                  addEmployee.Numbers = addEmployee.Numbers.filter(id => !allRecords.items.find(o => o.get('employeeNumberID') === id))
                  fillWorkPlace(me, grid, addEmployee)
                }
              })
          } else {
            fillWorkPlace(me, grid, addEmployee)
          }
        }
      }
    }
  })
}

function workPlaceActionInit (me) {
  const tb = me.attr.workPlaceDt.down('toolbar')

  tb.insert(2,
    Ext.create('Ext.Button', {
      scale: 'medium',
      iconCls: 'u-icon-file-export',
      tooltip: UB.i18n('Перемістити обрані записи'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting'), // TODO: doMove
      cls: 'blue-action',
      handler: function () {
        const workPlaceIDs = getSelectedDoc(me)
        if (!workPlaceIDs.length) {
          $App.dialogInfo(UB.i18n('Не відмічено робочі місця для переміщення'), UB.i18n('Увага'))
          return
        }
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'trf_documentSelect',
          sender: me,
          cmpInitConfig: {
            actionText: UB.i18n('Перемістити'),
            onSelect: (document) => {
              if (document.ID !== me.instanceID) {
                me.setLoading(true)
                const errors = []
                moveSelected(me, document.ID, workPlaceIDs, 0, errors)
              }
            }
          }
        })
      }
    })
  )
  tb.insert(3,
    Ext.create('Ext.Button', {
      cls: 'add-new-action',
      scale: 'medium',
      iconCls: 'iconApprove',
      tooltip: UB.i18n('Провести обрані документи'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting'),
      handler: function () {
        const docIDs = getSelectedDoc(me)
        if (!docIDs.length) {
          return
        }
        const errors = []
        me.saveForm()
          .then(function (result) {
            if (result !== -1) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Провести обрані документи?'))
                .then(function (choice) {
                  if (choice) {
                    me.setLoading(true)
                    postingSelected(me, docIDs, 0, errors)
                  }
                })
            }
          })
      }
    })
  )
  tb.insert(4,
    Ext.create('Ext.Button', {
      cls: 'red-action',
      scale: 'medium',
      iconCls: 'iconReject',
      tooltip: UB.i18n('Відмінити проведення обраних документів'),
      hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doCancelPosting'),
      handler: function () {
        const docIDs = getSelectedDoc(me)
        if (!docIDs.length) {
          return
        }
        const errors = []
        me.saveForm()
          .then(function (result) {
            if (result !== -1) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Відмінити проведення обраних документів?'))
                .then(function (choice) {
                  if (choice) {
                    me.setLoading(true)
                    cancelPostingSelected(me, docIDs, 0, errors)
                  }
                })
            }
          })
      }
    })
  )
  tb.insert(5,
    Ext.create('Ext.Button', {
      scale: 'medium',
      iconCls: 'u-icon-delete',
      cls: 'grey-action',
      tooltip: UB.i18n('Видалити обрані записи'),
      handler: function () {
        const docIDs = getSelectedDoc(me)
        if (!docIDs.length) {
          return
        }
        const errors = []
        me.saveForm().then(function (result) {
          if (result !== -1) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити обрані документи ?'))
              .then(function (choice) {
                if (choice) {
                  me.deleteInstanceID(true)
                  deleteSelected(me, docIDs, 0, errors)
                }
              })
          }
        })
      }
    })
  )
  const store = me.attr.workPlaceDt.getStore()
  store.on('load', function () {
    const el = me.attr.workPlaceDt.columns[0].el
    el.removeCls(Ext.baseCSSPrefix + 'grid-hd-checker-on')
  }, me)
}

function postingSelected (me, docIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docIDs.length) {
    $App.connection.run({
      entity: 'trf_document',
      method: 'doPostingWorkPlace',
      execParams: {
        ID: me.instanceID,
        workPlaceID: docIDs[idx]
      }
    }).then(() => {
      postingSelected(me, docIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      postingSelected(me, docIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}
function deleteSelected (me, docIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docIDs.length) {
    $App.connection.run({
      entity: 'trf_workPlace',
      method: 'delete',
      execParams: {
        ID: docIDs[idx]
      }
    }).then(() => {
      deleteSelected(me, docIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      deleteSelected(me, docIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}

function cancelPostingSelected (me, docIDs, idx, errors) {
  me.setLoading(true)
  if (idx < docIDs.length) {
    $App.connection.run({
      entity: 'trf_document',
      method: 'doCancelPostingWorkPlace',
      execParams: {
        ID: me.instanceID,
        workPlaceID: docIDs[idx]
      }
    }).then(() => {
      cancelPostingSelected(me, docIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      cancelPostingSelected(me, docIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}

function getSelectedDoc (me) {
  const selected = []
  me.attr.workPlaceDt.getStore().data.items.forEach(item => {
    if (item.get('checked')) {
      selected.push(item.get('ID'))
    }
  })
  return _.uniq(selected)
}

function moveSelected (me, documentID, workPlaceIDs, idx, errors) {
  me.setLoading(true)
  if (idx < workPlaceIDs.length) {
    $App.connection.run({
      entity: 'trf_document',
      method: 'moveWorkPlace',
      execParams: {
        workPlaceID: workPlaceIDs[idx],
        documentID
      }
    }).then(() => {
      moveSelected(me, documentID, workPlaceIDs, ++idx, errors)
    }).catch((err) => {
      if (err.message.indexOf('HTTP Error 500 - Internal Server Error') < 0) {
        errors.push(err.message)
      }
      moveSelected(me, documentID, workPlaceIDs, ++idx, errors)
    })
  } else {
    me.setLoading(false)
    me.onRefresh()
    if (errors.length) {
      $App.dialogError(errors.join('<br/>'), UB.i18n('Увага!'))
    }
  }
}
function doReport (me, code, params) {
  $App.doCommand({
    cmdType: 'showForm',
    entity: code,
    formCode: 'trf_constructorReports',
    isModal: false,
    target: $App.getViewport().centralPanel,
    cmdData: {
      reportCode: code,
      reportType: 'html',
      reportColum: 1,
      cmpInitConfig: {
        reportParams: params
      },
      reportOptions: {
        allowExportToExcel: true
      }
    }
  })
}

function beforeSave (me, params) {
  const settings = JSON.parse(UB.core.UBLocalStorageManager.getItem('trf_document') || '{}')
  settings['type'] = me.attr.type.getValue() || null
  UB.core.UBLocalStorageManager.setItem('trf_document', JSON.stringify(settings))

  HR.orderManager.beforeSave(me, params)
}
function onBeforeClose () {
  const me = this
  const settings = JSON.parse(UB.core.UBLocalStorageManager.getItem('trf_document') || '{}')
  settings['type'] = me.attr.type.getValue() || null
  UB.core.UBLocalStorageManager.setItem('trf_document', JSON.stringify(settings))
  HR.orderManager.beforeClose(me)
  return true
}
