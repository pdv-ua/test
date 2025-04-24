/* global UB HR AC $App Ext appAC saveAs _ Blob */
exports.formCode = {
  isValidDate,
  setTitleByOrderType,
  initComponentStart,
  enableControls,
  initComponentDone,
  controlChanged,
  fillPosInfo,
  selectGoal,
  onBeforeEditGrid,
  addBaseActions,
  formPrintDocument,
  onBeforeSave,
  onCheckValidBeforeSaveForm
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  if (!me.actions.printReports) {
    let printMenu = []
    HR.reportUtils.getOrderReportMenu(printMenu, 'STUFFMOTION', me)

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
    hidden: true,
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
  me.actions.renewTask.setHidden(true)

  me.actions.startReconciliation = new Ext.Action({
    iconCls: 'fas fa-handshake',
    cls: 'blue-action',
    tooltip: UB.i18n('Розпочати узгодження'),
    text: UB.i18n('Розпочати узгодження'),
    actionId: 'startReconciliation',
    handler: function () {
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
        return $App.dialogInfo(UB.i18n('Узгодження розпочато згідно встановленому маршруту'))
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

function onBeforeEditGrid (rowEditor, context) {
  let me = this
  let grid = context.grid
  // let entityName = grid.entityName
  grid.optimizeColumnWidth(true)
  if (context.grid.isEditDisabled) {
    return false
  }
  let editor = rowEditor.editor
  let field = editor.query(`[name=employeePositionID.description]`)[0]
  delete field.getStore().ubRequest.whereList
  let now = AC.dateService.truncTimeToUtcNull(new Date())
  field.getStore().ubRequest.whereList = {
    dateFrom: {
      expression: '[dateFrom]',
      condition: 'lessEqual',
      value: now
    },
    dateTo: {
      expression: '[dateTo]',
      condition: 'moreEqual',
      value: now
    },
    organizationID: {
      expression: `[organizationID]`,
      condition: 'equal',
      value: me.record.get('organizationID')
    }

  }
  field.getStore().load()
}

function selectGoal () {
  let me = this
  let entityName = 'hr_dictMotionGoal'
  let gridConfig = {
    entity: entityName,
    cmdType: UB.core.UBCommand.commandType.showList,
    description: $App.domainInfo.get(entityName, true).getEntityDescription(),
    isModal: true,
    sender: me,
    hideActions: [],
    onItemSelected: function (selected, a, b, c) {
      if (me.record.get('orderState') !== 'POSTED') {
        me.record.set('requestStaffMotionGoal', selected.get('goal'))
      }
      Ext.defer(function () {
        me.getField('requestStaffMotionGoal').focus(false, 1)
      }, 500)
    },
    cmpInitConfig: {
      onDeterminateForm: function (grid) {

      },
      entityConfig: {
        entity: entityName,
        method: 'select',
        fieldList: ['code', 'name', 'goal', 'isActive']

      }
    }
  }
  $App.doCommand(gridConfig)
}

function fillPosInfo (sourceCtrl) {
  let me = this
  let onDate = appAC.globalApplicationDate()
  UB.Repository(sourceCtrl.store.ubRequest.entity)
    .attrs(['positionID.name', 'positionID', 'positionID.positionCategory.name', 'departmentID.name'])
    .where('positionID.mi_deleteDate', '>=', '#maxdate', 'posDelete')
    .where('positionID.mi_dateFrom', '<=', onDate, 'posFrom')
    .where('positionID.mi_dateTo', '>=', onDate, 'posTo')
    .where('positionID.state', '=', 'ACTIVE', 'posActive')
    .where('departmentID.mi_deleteDate', '>=', '#maxdate', 'depDelete')
    .where('departmentID.mi_dateFrom', '<=', onDate, 'depFrom')
    .where('departmentID.mi_dateTo', '>=', onDate, 'depTo')
    .where('departmentID.state', '=', 'ACTIVE', 'depActive')
    .where('ID', '=', sourceCtrl.getValue())
    .join('depDelete').join('depFrom').join('depTo').join('depActive')
    .selectSingle().then(data => {
      if (data) {
        me.down('[name=departmentID.name]').setValue(data['departmentID.name'])
        me.down('[name=positionID.name]').setValue(data['positionID.name'])
        me.down('[name=positionID.positionCategory.name]').setValue(data['positionID.positionCategory.name'])
      } else {
        me.down('[name=departmentID.name]').setValue()
        me.down('[name=positionID.name]').setValue()
        me.down('[name=positionID.positionCategory.name]').setValue()
      }
    })
}

function controlChanged (ctrl, value, oldValue) {
  let me = this
  switch (ctrl.name) {
    case 'requestForStuffID':
      me.fillPosInfo(ctrl)
      break
  }
}

function isValidDate (d) {
  return d instanceof Date && !isNaN(d)
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    let field = me.getField('requestStaffMotionGoal')
    AC.viewUtils.buildContextMenu(field, [{
      text: UB.i18n('Вибрати з довідника'),
      handler: function (item) {
        me.selectGoal()
      }
    }])
  })

  me.on('controlChanged', me.controlChanged, me)
}

function enableControls () {
  const me = this
  const isPosted = me.orderState !== 'NEW'
  HR.orderManager.enableControls({
    me: me,
    isEnabled: !isPosted,
    controls: []
  })
  me.getField('orderCompetitionID').setReadOnly(true)
  return isPosted
}

function initComponentDone () {
  let me = this
  let sender = me.sender

  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid && !grid.destroying) {
        grid.getStore().load()
      }
    }
  })
  me.on('formDataReady', () => {
    AC.gridUtils.setGlobalOrganization(me.getField('requestForStuffID'), 'organizationID')
    AC.gridUtils.setGlobalOrganization(me.getField('orderCompetitionID'), 'organizationID')
    HR.orderManager.disableContextMenuItems(me.getField('requestForStuffID'), ['addItem', 'editItem'])
    if (me.isNewInstance) {
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('orderDate', new Date())
      me.record.set('orderState', 'NEW')
      me.record.set('document', null)
      me.record.set('docText', null)
    } else {
      me.fillPosInfo(me.down('[name=requestForStuffID]'))
    }
  })
}

function formPrintDocument (me, code, type, reportCode, reportIdx) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employee',
    method: type === 'docx' ? 'docPrintForm' : 'repPrintForm',
    params: {
      code: code,
      type: type,
      reportCode: reportCode,
      instanceID: me.instanceID,
      onDate: appAC.globalApplicationDate(),
      orgID: appAC.globalOrganization()
    }
  }).then(function (result) {
    me.setLoading(false)
    if (result.params.type === 'docx') {
      if (result.docs) {
        let docs = JSON.parse(result.docs)
        _.forEach(docs, function (item) {
          const fileContent = JSON.parse(item.fileContent)
          const contentLength = fileContent.length
          const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
          const filename = item.fileName + '.docx'
          for (let i = 0; i < contentLength; i++) {
            pdfArray[i] = fileContent.charCodeAt(i)
          }
          const dBlob = new Blob([pdfArray], { type: 'application/msword' })
          saveAs(dBlob, filename)
        })
      }
    } else if (result.params.type === 'report') {
      let reportDesc = me.initialConfig.commandConfig.description
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_repParamEmpInfo',
        caption: reportDesc,
        cmpInitConfig: {
          reportCode: result.params.reportCode,
          reportViewCode: code,
          employeeID: me.instanceID,
          reportDescription: reportDesc,
          reportIdx: reportIdx,
          employeeNumberID: me.employeeNumberID,
          onDate: appAC.globalApplicationDate()
        }
      })
    } else if (result.params.type === 'reportPDF') {
      let reportDesc = me.initialConfig.commandConfig.description
      let report = Ext.create('UBS.UBReport', {
        code: result.params.reportCode,
        type: 'pdf',
        params: {
          employeeID: me.instanceID,
          employeeNumberID: me.employeeNumberID,
          tabNum: me.tabNum,
          reportDescription: reportDesc
        }
      })
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'ac_documentViewer',
        caption: UB.i18n('Друкована форма'),
        cmpInitConfig: { report: report },
        tabId: 'printDocument_' + result.params.reportCode + '_' + me.instanceID,
        description: reportDesc,
        target: $App.getViewport().centralPanel
      })
    }
  }).then(function () {
    me.setLoading(false)
  })
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    if (!me.isDirty() && !me.record.dirty) {
      return resolve(true)
    }
    me.onCheckValidBeforeSaveForm().then((result) => {
      resolve(result !== false)
    })
  })
}
function onCheckValidBeforeSaveForm () {
  const me = this
  if (!me.record.get('docText')) {
    return Promise.resolve(true)
  }
  return HR.reportTab.saveReport(me)
}
