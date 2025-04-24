/* global UB UBS Ext $App _ */
exports.formCode = {
  initUBComponent,
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  addBaseActions,
  formPrintDocument
}

const printCofig = {
  profileWinner: { name: UB.i18n('Профіль особи з порталу вакансій'), type: 'reportPDF', reportCode: 'hr_employeeInfoPortalVac' }
}

function initUBComponent () {
  const me = this
  me.dataBind = {
    // fullFIO: {
    //   value: '({lastName} || "?") + " " + ({firstName} || "?") + ({middleName} ? " " + {middleName}:"")'
    // },
    // shortFIO: {
    //   value: '({lastName} || "?") + " " + ({firstName} || "?")[0].toUpperCase() + "." + ({middleName} ? {middleName}[0].toUpperCase() + "." : "")'
    // }
  }
  UBS.dataBinder.applyBinding(me)
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('beforesave', beforeSave, me)
}

function initComponentDone () {
  // const me = this
  // const tree = me.down('[ubID=treeInfo]')
  // AC.viewUtils.setAttr(me)
  // me.actions.fDelete.hide()
}

function onFormDataReady () {
  const form = this
  const printAction = form.actions.printAction
  if (printAction) {
    printAction.setDisabled(form.isNewInstance)
  }
}

function beforeSave () {
  const me = this
  const document = me.record.get('document')
  if (!document) {
    throw new UB.UBError(UB.i18n(`Відсутнє вкладення з Порталу вакансій`))
  }
}

function addBaseActions () {
  const form = this
  form.callParent(arguments)
  let printAction = form.actions.printAction
  if (!printAction) {
    const menu = []
    _.forEach(printCofig, (value, code) => {
      menu.push({
        text: value.name,
        code: code,
        name: value.name,
        type: value.type,
        reportCode: value.reportCode,
        reportIdx: value.reportIdx,
        handler: function (btn) {
          getPrintDocument(form, btn.code, btn.type, btn.reportCode, btn.reportIdx)
        }
      })
    })

    printAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printAction',
      menu: menu,
      hidden: false,
      handler: function () {
      }
    })

    form.actions.printAction = printAction
  }
}

function formPrintDocument (me, code, type, reportCode, reportIdx) {
  me.setLoading(true)
  return Promise.resolve().then((result) => {
    me.setLoading(false)
    if (type === 'reportPDF') {
      const reportDesc = me.initialConfig.commandConfig.description
      const report = Ext.create('UBS.UBReport', {
        code: reportCode,
        type: 'pdf',
        params: {
          instanceID: me.instanceID,
          reportDescription: reportDesc
        }
      })

      const pageConfig = {
        margin: {
          top: 20,
          right: 25,
          bottom: 20,
          left: 15
        }
      }

      report.onTransformConfig = function (config) {
        _.merge(config, pageConfig)
        config.align = 'center'
        return config
      }

      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'ac_documentViewer',
        caption: UB.i18n('Друкована форма'),
        cmpInitConfig: { report: report },
        tabId: 'printDocument_' + reportCode + '_' + me.instanceID,
        description: reportDesc,
        target: $App.getViewport().centralPanel
      })
    } else {
      throw new UB.UBAbort(`Unknown type: ${type}`)
    }
  }).then(function () {
    me.setLoading(false)
  })
}

function getPrintDocument (form, code, type, reportCode, reportIdx) {
  formPrintDocument(form, code, type, reportCode, reportIdx)
}
