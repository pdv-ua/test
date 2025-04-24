/* global UB, AC, appHR, $App, _ Ext HR Blob */
exports.formCode = {
  initComponentDone,
  onFormDataReady,
  getReportName,
  onControlChanged,
  addBaseActions,
  createActions,
  initComponentStart,
  onCheckValidBeforeSaveOrder
}

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
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  return HR.reportTab.saveReport(me)
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
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
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (me.defaultValues) {

    }
  } else {
    const pdfTab = me.down('[name=registrySheetPDF]')
    if (pdfTab) {
      $App.connection.getDocument({
        entity: 'hr_registrySheet',
        attribute: 'document',
        ID: me.instanceID
      }, {
        resultIsBinary: true
      })
        .then(data => {
          data = new Blob([data], {
            type: 'application/pdf'
          })
          pdfTab.setSrc({
            blobData: data
          })
          pdfTab.show()
        })
        .catch(() => {
          pdfTab.hide()
        })
    }
  }
}

function onControlChanged (field, value) {
  const me = this
}

function getReportName () {
  return 'kpi_combinedRating'
}
