/* global UB Ext HR appAC $App saveAs _ Blob AC */

exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  addBaseActions
}

const printCofig = {
  zgodaProvedSpecPerev: { name: UB.i18n('Згода на проведення спеціальної перевірки'), type: 'docx', auditType: '1' },
  zapitPerevVidom: { name: UB.i18n('Запит про перевірку відомостей щодо особи'), type: 'docx', auditType: '1' },
  dovidkaResultSpecPerev: { name: UB.i18n('Довідка про результати спецперевірки'), type: 'docx', auditType: '1' },
  zapitProvedPerev: { name: UB.i18n('Запит про проведення перевірки'), type: 'docx', auditType: '2' },
  povidPochatokPerev: { name: UB.i18n('Повідомлення про початок перевірки'), type: 'docx', auditType: '2' },
  dovidkaResultPerev: { name: UB.i18n('Довідка про результати перевірки'), type: 'docx', auditType: '2' }
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}
function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
function onFormDataReady () {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.organizationAuditID, {
    'auditType': me.sender.ownerCt.auditType
  })

  me.attr.audit.setValue(me.sender.ownerCt.auditType === '1' ? UB.i18n('Спецперевірка') : UB.i18n('Очищення влади'))
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function addBaseActions () {
  let me = this
  me.callParent(arguments)
  let printAction = me.actions.printAction
  if (!printAction) {
    const menu = []

    _.forEach(printCofig, (value, name) => {
      if (value.auditType === me.sender.ownerCt.auditType) {
        menu.push({
          text: value.name,
          code: name,
          type: value.type,
          reportCode: value.reportCode,
          handler: function () {
            getPrintDocument(me, name, value.type, value.reportCode)
          }
        })
      }
    })

    printAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printAction',
      menu: menu,
      disabled: !me.employeeNumberID && me.sender.ownerCt.auditType === '2'
    })
    me.actions.printAction = printAction
  }
}

function getPrintDocument (me, code, type, reportCode) {
  me.setLoading(true)

  $App.connection.run({
    entity: 'hr_employeeAudit',
    method: type === 'docx' ? 'docPrintForm' : 'repPrintForm',
    params: {
      code: code,
      type: type,
      reportCode: reportCode,
      instanceID: me.instanceID,
      onDate: appAC.globalApplicationDate(),
      orgID: appAC.globalOrganization(),
      employeeID: me.record.get('employeeID'),
      positionID: me.record.get('positionID'),
      organizationAudit: me.record.get('organizationAuditID'),
      resultFactID: me.record.get('resultFactID'),
      controlDate: me.record.get('controlDate'),
      ingoingDate: me.record.get('ingoingDate'),
      employeeNumberID: me.employeeNumberID,
      outgoingDate: me.record.get('outgoingDate'),
      ownerID: me.record.get('mi_owner')
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
    }

    if (result.params.type === 'report') {
      let report = Ext.create('UBS.UBReport', {
        code: result.params.reportCode,
        type: 'html',
        params: {
          instanceID: me.instanceID,
          employeeID: me.instanceID
        }
      })
      report.init().then(function () {
        let config = {
          cmdType: 'showForm',
          formCode: 'ac_documentViewer',
          caption: UB.i18n('Друкована форма'),
          cmpInitConfig: { report: report },
          tabId: 'printDocument' + me.report_code + me.instanceID,
          description: me.initialConfig.commandConfig.description,
          target: $App.getViewport().centralPanel
        }
        $App.doCommand(config)
      })
    }
  }).then(function () {
    me.setLoading(false)
  })
}
