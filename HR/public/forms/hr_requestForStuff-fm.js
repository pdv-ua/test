/* global AC appAC UB Ext $App HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  loadRespPosition,
  addBaseActions,
  getReportName,
  onCheckValidBeforeSaveForm
}

function initComponentStart () {
  let me = this
  me.reportMode = 'view'
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.gridConfig = {
    detailGrids: ['requestStuffEducation', 'requestStuffExperience', 'requestStuffProfi', 'requestStuffPcLiteracy',
      'requestStuffComp', 'requestStuffPrivat']
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
  AC.acEditGridManager.init(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
  me.gridConfig.detailGrids.forEach(gridName => {
    me.down(`[name=${gridName}]`).on('afterdel', function () {
      me.setIsDirty(true)
    })
  })
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    if (me.addByCurrent) {
      me.record.set('orderState', 'PROJECT')
      me.record.set('docText', null)
      me.record.set('document', null)
    }
  } else {
    AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
    AC.viewUtils.setWhereListProperty(me.attr.positionID, [
      [ 'mi_treePath', 'startWith', me.record.get('departmentID.mi_treePath') || '%' ],
      [ 'orgID', '=', me.record.get('organizationID') ],
      ['state', '=', 'ACTIVE']
    ], null, [])
  }
  const readOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.record.get('orderState'))
  if (readOnly) {
    me.disableEdit()
  } else {
    me.enableEdit()
  }
  me.down('[ubID=btnSelectByTree]')[readOnly ? 'hide' : 'show']()
  me.attr.requestStuffEducation.setReadOnly(readOnly)
  me.attr.requestStuffExperience.setReadOnly(readOnly)
  me.attr.requestStuffProfi.setReadOnly(readOnly)
  me.attr.requestStuffPcLiteracy.setReadOnly(readOnly)
  me.attr.requestStuffComp.setReadOnly(readOnly)
  me.attr.requestStuffPrivat.setReadOnly(readOnly)
  me.attr.descOfExtRelatins.setReadOnly(true)

  HR.orderManager.changeAction(me)

  me.attr.requestStuffExperience.setReadOnly(!me.record.get('needExperience') || readOnly)
  me.isPdfCreated = false
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'departmentID':
      AC.viewUtils.setWhereListProperty(me.attr.positionID, [
        ['mi_treePath', 'startWith', me.attr.departmentID.getFieldValue('mi_treePath') || '%'],
        ['orgID', '=', me.record.get('organizationID')],
        ['state', '=', 'ACTIVE']
      ], null, ['clearWhereList', 'clearValue', 'clearStore'])
      break
    case 'positionID':
      me.attr.assignmentType.setValue()
      me.attr.positionInstruction.setValue()
      me.attr.positionResp.setValue()
      me.attr.sphereOfResp.setValue()
      me.attr.futuresOfWork.setValue()
      me.attr.descOfExtRelatins.setValue()
      if (field.value) {
        UB.Repository('hr_positionInstruction')
          .attrs(['ID', 'positionID', 'description'])
          .where('positionID', '=', field.value)
          .selectAsObject().then(data => {
            const positionInstructions = {}
            data.forEach(row => {
              positionInstructions[row.ID] = row.description
            })
            const positionInstructionIDs = Object.keys(positionInstructions)
            if (positionInstructionIDs.length) {
              UB.Repository('hr_positionServiceCommunication')
                .attrs(['ID', 'positionInstructionID', 'description'])
                .where('positionInstructionID', 'in', positionInstructionIDs)
                .selectAsObject().then(data => {
                  data.forEach(row => {
                    positionInstructions[row.positionInstructionID] += `, ${row.description}`
                  })
                  let desc = ''
                  positionInstructionIDs.forEach(id => {
                    desc += `${desc === '' ? '' : ', '}${positionInstructions[id]}`
                  })
                  me.record.set('descOfExtRelatins', desc)
                })
            } else {
              me.record.set('descOfExtRelatins', null)
            }
          })
      } else {
        me.record.set('descOfExtRelatins', null)
      }
      break
    case 'needExperience':
      me.attr.requestStuffExperience.setReadOnly(!value)
      if (!value) {
        me.attr.requestStuffExperience.store.removeAll()
      }
      break
  }
}

function loadRespPosition (me, attrName) {
  if (me.attr.positionID.getValue()) {
    UB.Repository('hr_positionResp')
      .attrs(['responsibility'])
      .where('positionID', '=', me.attr.positionID.getValue())
      .selectAsObject().then(data => {
        let responsibility = ''
        data.forEach(row => {
          responsibility += (responsibility !== '' ? '\r\n' : '') + row.responsibility
        })
        me.attr[attrName].setValue(responsibility)
      })
  }
}

function addBaseActions () {
  const me = this
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
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Узгодження буде завершено та відмінено всі задачі. Продовжити?'))
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
  me.callParent(arguments)
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (!me.record.get('docText')) {
    return Promise.resolve(true)
  }
  return HR.reportTab.saveReport(me)
}

function getReportName () {
  return 'hr_requestForStuff'
}
