/* global Ext $App Blob _ AC UB HR */
// const moment = require('moment')

module.exports = {
  getTabConfig,
  getPrintMenu,
  setReportMode,
  editHtml,
  generatePdf,
  forceGenerateReport,
  saveReport,
  checkAndSetReport
}

function getTabConfig (cfg) {
  cfg = cfg || {}

  const buttons = [
    {
      xtype: 'button',
      name: 'btnView',
      itemId: 'btmPdf',
      text: 'PDF',
      iconCls: 'iconPdf',
      handler: btn => {
        let me = btn.up('form')
        setReportMode(me, 'view')
      }
    },
    {
      xtype: 'button',
      name: 'btnEdit',
      text: UB.i18n('Редагувати'),
      itemId: 'btmEdit',
      iconCls: 'iconEdit',
      handler: btn => {
        let me = btn.up('form')
        setReportMode(me, 'edit')
      }
    },
    {
      xtype: 'button',
      ubID: 'makeReport',
      text: UB.i18n('Формувати'),
      iconCls: 'iconDoc',
      hidden: true,
      handler: btn => {
        let me = btn.up('form')
        let ed = me.down('ubreporteditor')
        me.record.set('docText', '')
        generateReport(me).then(html => {
          me.record.set('docText', html)
          ed.setValue(html)
        })
      }
    },
    {
      xtype: 'button',
      name: 'btnPrint',
      text: UB.i18n('Друкувати'),
      itemId: 'btnPrint',
      iconCls: 'iconPrinter',
      handler: btn => {
        let me = btn.up('form')
        let ed = me.down('ubreporteditor')
        const iFrame = ed.getEl().down('iframe').dom
        iFrame.contentWindow.print()
      }
    },
    {
      xtype: 'button',
      text: UB.i18n('Налаштування'),
      hidden: true,
      iconCls: 'iconAdvanced',
      ubID: 'pdfSettings',
      menu: [
        {
          xtype: 'ubfieldset',
          name: 'reportSettings',
          title: UB.i18n('Параметри звіту '),
          items: [
            {
              width: 30,
              xtype: 'button',
              name: 'closeSettings',
              style: 'position: absolute; top: ' +
                  (Ext.isIE || Ext.isChrome || Ext.isGecko ? 0 : -20) + 'px; right: 10px;',
              tooltip: {
                title: '',
                text: UB.i18n('Закрити')
              },
              iconCls: 'fa fa-times',
              handler: function (b, e) {
                b.up('menu').hide()
              }
            }
          ]
        },
        {
          xtype: 'ubfieldset',
          title: UB.i18n('Поля'),
          margin: '0 5 0 5',
          border: true,
          items: [
            {
              ignorePosted: true,
              xtype: 'numberfield',
              name: 'topMargin',
              labelWidth: 70,
              fieldLabel: UB.i18n('Зверху'),
              hideTrigger: true,
              value: 20
            },
            {
              ignorePosted: true,
              xtype: 'numberfield',
              name: 'rightMargin',
              labelWidth: 70,
              fieldLabel: UB.i18n('Справа'),
              hideTrigger: true,
              value: 10
            },
            {
              ignorePosted: true,
              xtype: 'numberfield',
              name: 'bottomMargin',
              labelWidth: 70,
              fieldLabel: UB.i18n('Знизу'),
              hideTrigger: true,
              value: 20
            },
            {
              ignorePosted: true,
              xtype: 'numberfield',
              name: 'leftMargin',
              labelWidth: 70,
              fieldLabel: UB.i18n('Зліва'),
              hideTrigger: true,
              value: 20
            }
          ]
        },
        {
          name: 'savePdfParams',
          xtype: 'button',
          text: UB.i18n('Застосувати'),
          iconCls: 'fa fa-thumbs-o-up',
          handler: item => {
            let me = item.up('form')
            let ed = me.down('ubreporteditor')
            setReportSettingsValues(me)
            generatePdf(me, ed.getValue()).then(data => {
              me.down('ubpdf').setSrc({
                blobData: data
              })
              saveReportSettings(me)
            })
          }
        }
      ]
    }
  ]

  if (cfg.addExcel === true) {
    buttons.push({
      xtype: 'button',
      text: 'Excel',
      iconCls: 'fas fa-file-excel',
      cls: 'green-action',
      // iconCls: 'iconExportXls',
      showIf: (c, form) => {
        return !form.isNewInstance
      },
      handler: item => {
        const form = item.up('form')
        doSaveForm(form).then((result) => {
          if (result !== -1) {
            const reportType = 'xlsx'
            const html = form.record.get('docText')
            AC.documentService.generateXLSXFromHtml(html, true).then(data => {
              const blobData = new Blob(
                [data], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
              )
              const dateFomat = AC.dateService.formatDate(form.attr.orderDate.getValue() || new Date())
              const repName = `${dateFomat}-${form.attr.orderNumber.getValue() || 0}-${cfg.excelFileName || 'staffTable'}.${reportType}`
              const fileName = `${repName}`
              window.saveAs(blobData, fileName)
            })
          }
        })
      }
    })
  }

  const tab = {
    title: cfg.title || UB.i18n('Документ'),
    ubID: cfg.ubID || 'report',
    tbar: {
      items: buttons
    },
    layout: {
      type: 'border'
    },
    items: [
      {
        region: 'center',
        flex: 4,
        xtype: 'container',
        layout: 'fit',
        items: [
          {
            xtype: 'ubreporteditor',
            enableTemplateEditor: false,
            attributeName: 'docText',
            labelWidth: 0,
            fieldLabel: '',
            hidden: true,
            isMainEditor: true,
            height: '100%',
            flex: 1,
            style: {
              background: 'white'
            },
            tinyMCEConfig: {
              object_resizing: false,
              // nonbreaking_wrap: false,
              // nonbreaking_force_tab: true,
              entity_encoding: 'named',
              entities: '160,nbsp',
              // entities: '160,nbsp,&nbsp,&nbsp;',
              toolbar1: 'undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | formatselect fontsizeselect | pageOrientation | Colontitle | borderL borderR borderT borderB borderE borderA | forecolor | bullist numlist outdent indent | pagebreak nonbreaking'
            }
          },
          {
            xtype: 'ubpdf',
            height: '100%',
            hidden: false
          }
        ]
      },
      {
        region: 'east',
        flex: 1,
        minWidth: 100,
        maxWidth: 230,
        collapsible: true,
        xtype: 'signlistpanel'
      }
    ],
    listeners: {
      afterrender: function (ctrl) {
        const me = ctrl.up('form')
        initReport(me, cfg)
        me.on('activate', function () {
          reloadPdf(ctrl)
        })
      },
      activate: function (ctrl) {
        reloadPdf(ctrl)
      }
    }
  }
  return tab
}

function reloadPdf (ctrl) {
  const pdfctrl = ctrl.down('[xtype=ubpdf]')
  if (pdfctrl && pdfctrl.getEl) {
    const el = pdfctrl.getEl()
    const iframe = el && el.down && el.down('iframe')
    if (iframe) {
      if (iframe && iframe.dom && iframe.dom.contentDocument) {
        iframe.dom.contentDocument.location.reload()
      }
    }
  }
}

function getPrintMenu (form, cfg) {
  cfg = cfg || {}
  const me = form
  let tab = [
    {
      text: UB.i18n('Формувати'),
      iconCls: 'iconDoc',
      ubID: 'itemMakeReport',
      showIf: (c, form) => (!['POSTED', 'ON_COMPLETION', 'PROCESSED'].includes(form.record.get('orderState'))),
      handler: () => {
        if (['POSTED', 'ON_COMPLETION', 'PROCESSED'].includes(me.record.get('orderState'))) {
          return
        }
        initReport(me, cfg)
        editHtml(me)
      }
    },
    {
      text: UB.i18n('Перегляд'),
      iconCls: 'iconPdf',
      handler: item => {
        initReport(me, cfg)
        setReportMode(me, 'view')
      }
    },
    {
      xtype: 'menuseparator',
      showIf: (c, form) => (me.record.get('orderState') === 'POSTED' && me.record.get('empOrderType') === 'APPOINT')
    },
    {
      text: UB.i18n('Редагувати'),
      iconCls: 'iconEdit',
      ubID: 'itemEditReport',
      showIf: (c, form) => (!['POSTED', 'ON_COMPLETION', 'PROCESSED'].includes(form.record.get('orderState'))),
      handler: () => {
        if (['POSTED', 'ON_COMPLETION', 'PROCESSED'].includes(me.record.get('orderState'))) {
          return
        }
        initReport(me, cfg)
        setReportMode(me, 'edit')
      }
    }
  ]
  if (cfg.addRecPart) {
    tab.push({
      text: UB.i18n('Сторінка підписів'),
      iconCls: 'iconPdf',
      showIf: (c, form) => (!me.isNewInstance),
      handler: item => {
        const state = me.record.get('orderState')
        const isEdit = state === 'NEW'
        const repType = isEdit ? 'html' : 'html'
        formPrintDocument(me, repType, 'hr_empOrderCoreRecpart', { margin: { top: 13.5, right: -2, bottom: 13.5, left: 2 } })
      }
    })
  }
  /*
  tab.push({
    text: UB.i18n('Лист розсилки'),
    iconCls: 'iconPdf',
    showIf: (c, form) => (!me.isNewInstance),
    handler: function () {
      const state = me.record.get('orderState')
      const isEdit = state === 'NEW'
      const repType = isEdit ? 'html' : 'html'
      formPrintDocument(me, repType, 'hr_empOrderMailingLetter', { margin: { top: 13.5, right: -2, bottom: 13.5, left: 2 } })
    }
  })
  */
  tab.push({
    text: UB.i18n('Лист ознайомлення'),
    iconCls: 'iconPdf',
    showIf: (c, form) => (!me.isNewInstance),
    handler: function () {
      const state = me.record.get('orderState')
      const isEdit = state === 'NEW'
      const repType = isEdit ? 'html' : 'html'
      formPrintDocument(me, repType, 'hr_empOrderFamiliarization', { margin: { top: 13.5, right: -2, bottom: 13.5, left: 2 } })
    }
  })

  tab.push({
    text: UB.i18n('Повідомлення про заплановану відпустку'),
    iconCls: 'iconPdf',
    showIf: (c, form) => me.record.get('empOrderType') === 'VACATION',
    handler: function () {
      formPrintDocDocument(me, 'vacationNotification')
    }
  })

  tab.push({
    text: UB.i18n('Друк з реєстраційною відміткою'),
    iconCls: 'fas fa-stamp',
    cls: 'green-action',
    showIf: () => AC.entityUtils.verifyRightsMethod('hr_empOrder', 'getDocumentWithStampData') && ['POSTED', 'PROCESSED', 'RECONCILED'].includes(me.record.get('orderState')),
    handler: async function () {
      let outputBlob
      let url
      me.setLoading(true)

      const recParticipant = await UB.Repository('hr_recparticipant')
        .attrs(['ID', 'employeePosition.employeeID.lastName', 'employeePosition.employeeID.middleName', 'employeePosition.employeeID.firstName'])
        .where('docID', '=', me.instanceID)
        .where('recStageID.entityName', '=', 'hr_recstage')
        .where('recStageID.stageKind.code', '=', 'SIGN')
        .orderBy('ID', 'desc')
        .limit(1)
        .selectSingle({
          'employeePosition.employeeID.lastName': 'lastName',
          'employeePosition.employeeID.middleName': 'middleName',
          'employeePosition.employeeID.firstName': 'firstName'
        })

      const participantRow = {
        name: '',
        kep: '',
        serial: ''
      }
      if (recParticipant && recParticipant.ID) {
        const sign = await UB.Repository('hr_empOrderSignature')
          .attrs(['ID', 'signerName', 'signatureDate'])
          .where('canceled', '=', false)
          .where('participantID', '=', recParticipant.ID)
          .where('docID', '=', me.instanceID)
          .orderBy('signatureDate', 'desc')
          .limit(1)
          .selectSingle()

        let pki
        try {
          pki = await $App.connection.pki()
        } catch (e) {
          console.log('Pki create error: ' + e)
        }

        const employeeName = HR.reportUtils.getFullName(recParticipant.lastName, recParticipant.firstName, recParticipant.middleName, false)
        participantRow.name = employeeName ? UB.i18n('Підписувач') + ' ' + employeeName : ''

        if (sign) {
          sign.certificateIssuedBy = ''
          sign.certificateSerial = '-'
          let signature
          if (pki) {
            try {
              signature = await $App.connection.getDocument({
                entity: 'hr_empOrderSignature',
                attribute: 'signature',
                ID: sign.ID
              }, {
                bypassCache: true,
                resultIsBinary: true
              })
            } catch (e) {
            }

            if (signature) {
              const verifyResult = await pki.verify(signature, {
                entity: 'hr_order',
                attribute: 'document',
                ID: me.instanceID })

              if (verifyResult && verifyResult.valid) {
                sign.certificateSerial = verifyResult.certificate.serial || ''
                sign.signerName = verifyResult.subject.fullName || sign.signerName
                sign.validFrom = verifyResult.certificate.validFrom ? AC.dateService.formatDate(verifyResult.certificate.validFrom, 'dd.mm.yyyy hh:nn:ss') : ''
                sign.validTo = verifyResult.certificate.validTo ? AC.dateService.formatDate(verifyResult.certificate.validTo, 'dd.mm.yyyy hh:nn:ss') : ''
              }
            }
          }

          participantRow.name = sign.signerName ? UB.i18n('Підписувач') + ' ' + sign.signerName : participantRow.name
          participantRow.serial = sign.certificateSerial ? UB.i18n('Сертифікат') + ' ' + sign.certificateSerial : ''
          participantRow.period = sign.validFrom || sign.validTo ? UB.i18n('Дійсний') + (' ' + UB.i18n('з') + ' ' + sign.validFrom)  + (' ' + UB.i18n('по') + ' ' + sign.validTo) : ''
        }
      }
      const signerInfo = [participantRow.name, participantRow.serial, participantRow.period].filter(Boolean).join('\n')
      $App.connection.run({
        entity: 'hr_empOrder',
        method: 'getDocumentWithStampData',
        organizationID: appAC.globalOrganization(),
        orderID: me.instanceID,
        fieldName: me.record.get('documentPrintable') ? 'documentPrintable' : 'document',
        orderDate: me.record.get('orderDate'),
        orderNumber: me.record.get('orderNumber'),
        signerInfo: signerInfo,
        url: UB.format('{0}//{1}{2}#{3}', window.location.protocol, window.location.host, window.location.pathname,
          `cmdType=showForm&entity=hr_empOrder&formCode=hr_empOrder&instanceID=${me.instanceID.toString()}`)
      }).then(function (result) {
        me.setLoading(false)
        if (result.fileContent) {
          let fileContent = JSON.parse(result.fileContent)
          let contentLength = fileContent.data.length
          let pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
          for (let i = 0; i < contentLength; i++) {
            pdfArray[i] = fileContent.data[i]
          }
          outputBlob = new Blob([pdfArray], { type: 'application/pdf' })
          let pdfComponent = new UB.ux.PDFComponent()
          Ext.create('Ext.window.Window', {
            title: 'Друк документу',
            width: 800,
            height: 600,
            maximized: false,
            maximizable: true,
            layout: 'fit',
            listeners: {
              render: function () {
                this.add(pdfComponent)
              }
            }
          }).show()
          pdfComponent.setSrc({
            blobData: outputBlob
          })

        } else {
          $App.dialogError(UB.i18n('Не знайден ПДФ наказу!'), UB.i18n('msgTypeWarning'))
        }

      }, function (err) {
        me.setLoading(false)
        throw err
      })

    }
  })

  return tab
}
function formPrintDocDocument (me, reportCode) {
  me.setLoading(true)

  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_repParamOrderPrint',
    caption: 'Параметри звіту',
    cmpInitConfig: {
      defaultRefSigner: true,
      signerAllowBlank: true,
      reportCode: reportCode,
      // reportViewCode: code,
      orderID: me.instanceID
    }
  })
  me.setLoading(false)

}

function formPrintDocument (form, type, reportCode, reportOptions) {
  form.setLoading(true)
  return Promise.resolve().then(() => {
    const reportDesc = form.initialConfig.commandConfig.description
    const report = Ext.create('UBS.UBReport', {
      code: reportCode,
      type: type,
      params: {
        instanceID: form.instanceID,
        caller: form
      }
    })
    Object.assign(report.reportOptions, reportOptions)
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'ac_documentViewer',
      caption: UB.i18n('Друкована форма'),
      cmpInitConfig: { report: report },
      tabId: 'printDocument_' + reportCode + '_' + form.instanceID,
      description: reportDesc,
      target: $App.getViewport().centralPanel
    })
  }).then(() => {
    form.setLoading(false)
  })
}

function setReportMode (form, mode, isOnlyControls) {
  const me = form
  let ed = me.down('ubreporteditor')
  let pdfEd = me.down('ubpdf')
  let tp = me.down('tabpanel')
  let isPosted = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(me.record.get('orderState')) || !!me.pdfSigned
  if (me.allowChangeDocument) {
    isPosted = isPosted || !me.allowChangeDocument()
  }
  switch (mode) {
    case 'view':
      if (!isOnlyControls && me.reportCfg) {
        setTab(me, tp, me.reportCfg.repTabIndex ? me.reportCfg.repTabIndex : me.reportCfg.repTabIndex === 0 ? 0 : 1)
      }
      // me.down('[ubID=pdfSettings]').show()
      me.down('[ubID=makeReport]').hide()
      me.down('[name=btnEdit]').setVisible(!isPosted)
      me.down('[name=btnEdit]').setDisabled(isPosted)
      me.down('[name=btnView]').hide()
      me.down('[name=btnPrint]').hide()
      me.reportMode = mode
      let values = me.record.getChanges()
      if (!isOnlyControls) {
        let docText = values.docText || me.record.get('docText')
        if (docText && (values.docText || !me.record.get('document'))) {
          generatePdf(me, values.docText || me.record.get('docText'))
            .then(data => {
              ed.hide()
              pdfEd.setSrc({
                blobData: data
              })
              pdfEd.show()
            })
        }
        if (!values.docText && me.record.get('document')) {
          $App.connection.getDocument({
            entity: me.entityName,
            attribute: me.record.get('documentPrintable') ? 'documentPrintable' : 'document',
            ID: me.instanceID
          }, {
            resultIsBinary: true
          })
            .then(data => {
              data = new Blob([data], {
                type: 'application/pdf'
              })
              ed.hide()
              pdfEd.setSrc({
                blobData: data
              })
              pdfEd.show()
            })
        }
      }
      break
    case 'edit':
      if (!isOnlyControls && me.reportCfg) {
        setTab(me, tp, me.reportCfg.repTabIndex ? me.reportCfg.repTabIndex : me.reportCfg.repTabIndex === 0 ? 0 : 1)
      }
      // me.down('[ubID=pdfSettings]').hide()
      me.down('[ubID=makeReport]').setVisible(!isPosted)
      me.down('[name=btnEdit]').setDisabled(isPosted)
      me.down('[name=btnEdit]').hide()
      me.down('[name=btnView]').show()
      me.down('[name=btnPrint]').show()
      me.reportMode = mode
      if (!isOnlyControls) {
        pdfEd.hide()
        ed.show()
      }
      break
  }
  isPosted && ed.setReadOnly(isPosted)
}

function editHtml (form) {
  const me = form
  me.setLoading(UB.i18n('Зачекайте....'))
  generateReport(me).then(html => setHtml(me, html))
}

function generatePdf (form, html, resultType) {
  const me = form
  let repName = getRepName(me)
  return HR.reportUtils.generatePdf(html, repName, me.reportSettings, resultType)
}

function forceGenerateReport () {
  let me = this
  return generateBaseReport(me)
    .then(function (html) {
      me.record.set('docText', html)
      return me.saveForm()
    })
}

function initReport (form, cfg) {
  const me = form
  me.reportCfg = _.merge(me.reportCfg, cfg)
  if (!me.reportSettings) {
    me.reportSettings = me.record && me.record.get('reportSettings')
    if (!me.reportSettings) {
      me.reportSettings = {
        margin: ['APPOINT', 'APPOINT_MOVE', 'APPOINT_LIQ', 'DISM', 'MOVE', 'RANK', 'VACATION', 'MISSION', 'CWSRELAXDONOR',
          'BOUNTY_HELP', 'ADDSALARYGOV', 'CWSHD', 'CWSRELAXHD', 'COMPETITIONAD', 'CHGSALARY', 'ACTINGORD', 'CANCELDISM',
          'VACATIONPROLONG', 'VACATIONREVOKE', 'CWS', 'CWSWORKHOUR', 'CANCELSALARY', 'TRAINING', 'INTERNSHIP', 'BONUS',
          'REWARD', 'PENALTY', 'CHGEMPLOYEE', 'MILSERVICE', 'MILSERVICERET', 'CANCELLATION', 'STAFFTABLE', 'ORGSTRUCTURE',
          'VACATIONAPSCHED', 'STAFFLIST', 'POSITIONINSTRUCTION', 'VACATIONLONG', 'VACATIONRET', 'HRREPORT', 'RECALL',
          'RISKPAY', 'OVERPAY', 'CHGPOSITION', 'PLURALIST', 'VACATIONCOMP', 'OUTPLURAL', 'DOWNTIME', 'EXTRACT', 'ADDPAY',
          'CERTIFICATION', 'TRIALPROLONG', 'STAFFTABLEORGSTRUCTURE', 'STAFFTABLEMOVE', 'ACTINGCLOSE', 'ADDSALARY', 'BOUNTY',
          'TIMESHEETORDER', 'VEHICLEASSIGN', 'MEDEXAMINATION', 'CHANGEMISSION', 'RATINGLISTKPI', 'AVERAGEPAY']
          .includes(me.record.get('empOrderType')) ? {
            top: 13.5, // для відображення в pdf номера сторінки в верхн. колонтитулі треба, щоб topMargin >= 20
            right: -2,
            bottom: 27, // 13.5,
            left: 2
          } : {
            top: 20,
            right: 10,
            bottom: 20,
            left: 20
          }
      }
      if (['TIMESHEETORDER', 'RATINGLISTKPI'].includes(me.record.get('empOrderType'))) {
        me.reportSettings.pageOrientation = 'landscape'
      }
      if (me.isNewInstance) {
        me.record && me.record.set('reportSettings', JSON.stringify(me.reportSettings))
      }
    } else {
      me.reportSettings = JSON.parse(me.reportSettings)
    }
    setReportSettingsControls(me)
  }
}

function saveReport (form) {
  const me = form
  if (me.record.modified.docText !== undefined || (me.record.get('docText') && !me.record.get('document'))) {
    let html = me.record.get('docText')
    return generatePdf(me, html, 'bin').then(data => {
      return $App.connection.setDocument(data, {
        entity: me.entityName,
        attribute: 'document',
        ID: me.instanceID,
        filename: me.instanceID + '.pdf'
      }).then(json => {
        me.record.set('document', json)
        me.record.set('docText', html)
        return true
      })
    })
  }
  return Promise.resolve(true)
}

function checkAndSetReport (form, { isCheckOnly, isSilence } = {}) {
  let me = form
  let docText
  let docLastChangeDate = new Date()
  let fieldLastChangeDate = new Date(docLastChangeDate)
  let isNeedGeneratePdf = () => {
    let result = !me.record.get('docText') || !me.record.get('document')
    if (result) {
      return {
        result: true
      }
    }
    let ignoreFields = ['orderState', 'docText', 'document']
    for (let field in me.record.modified) {
      if (me.record.modified.hasOwnProperty(field) && !ignoreFields.includes(field)) {
        return {
          result: true,
          docChangeDateLessThanFieldChangeDate: true
        }
      }
    }
    if (fieldLastChangeDate > docLastChangeDate) {
      return {
        result: true,
        docChangeDateLessThanFieldChangeDate: true
      }
    }
    if (me.record.modified.docText) {
      return {
        result: true
      }
    }
    return null
  }
  return UB.Repository(me.entityName).attrs(['docLastChangeDate', 'fieldLastChangeDate'])
    .where('ID', '=', me.record.get('ID') || me.instanceID)
    .selectSingle().then(data => {
      if (data) {
        docLastChangeDate = AC.dateService.shiftDate(data.docLastChangeDate)
        fieldLastChangeDate = AC.dateService.shiftDate(data.fieldLastChangeDate)
      }
      let isGenerate = isNeedGeneratePdf()
      if (!isGenerate) {
        return true
      }
      if (isGenerate.docChangeDateLessThanFieldChangeDate && !isSilence) {
        return $App.dialogYesNo(UB.i18n('msgTypeWarning'), 'docChangeDateLessThanFieldChangeDate')
      }
      if (isGenerate.result) {
        if (isCheckOnly) {
          $App.dialogError(UB.i18n('Необхідно сформувати текст наказу. Перейдіть на закладку "Документ" та натисніть "Формувати"'), UB.i18n('msgTypeWarning'))
          return false
        }
        let promise = (!me.record.modified.docText || isGenerate.regenerateText) ? generateBaseReport(me) : Promise.resolve(me.record.get('docText'))
        return promise.then(function (html) {
          docText = html
          return generatePdf(me, docText, 'bin').then(data => {
            return $App.connection.setDocument(data, {
              entity: me.entityName,
              attribute: 'document',
              ID: me.instanceID,
              filename: me.instanceID + '.pdf'
            }).then(json => {
              me.record.set('document', json)
              me.record.set('docText', docText)
              return me.saveForm().then(result => {
                return true
              })
            })
          })
        })
      }
      return true
    })
}

function getRepName (form) {
  const me = form
  if (me.reportCfg) {
    if (me.reportCfg.getRepName) {
      return me[me.reportCfg.getRepName]()
    }
    if (me.reportCfg.repName) {
      return me.reportCfg.repName
    }
  }
  if (me.getReportName) {
    return me.getReportName()
  }

  // return (me.reportCfg && me.reportCfg.getRepName) ? me[me.reportCfg.getRepName]() : ((me.reportCfg && me.reportCfg.repName) || me.getDetailEntityName())
}

function setTab (form, tabPanel, tabNum) {
  const me = form
  me.isInternalTabSet = true
  try {
    tabPanel.setActiveTab(tabNum)
  } finally {
    me.isInternalTabSet = false
  }
}

function setHtml (form, html) {
  const me = form
  let ed = me.down('ubreporteditor')
  setReportMode(me, 'edit')
  let tp = me.down('tabpanel')
  setTab(me, tp, me.reportCfg.repTabIndex || 1)
  // ed.show()
  me.record.set('docText', '')
  me.record.modified.docText = ''

  setTimeout(() => {
    me.record.set('docText', html)
    ed.setValue(html)
    me.setLoading(false)
  }, 1000)
}

async function generateReport (form) {
  const me = form
  if (await me.saveForm() === -1) {
    return
  }
  let result = await generateBaseReport(me)
  return result
}

function saveReportSettings (form) {
  const me = form
  if (me.isNewInstance) {
    me.record.set('reportSettings', JSON.stringify(me.reportSettings))
    return Promise.resolve(true)
  }
  return $App.connection.run({
    entity: 'hr_empOrder',
    method: 'saveReportSettings',
    entityName: me.entityName,
    ID: me.instanceID,
    reportSettings: JSON.stringify(me.reportSettings)
  })
}

function setReportSettingsValues (form) {
  const me = form
  me.reportSettings.margin.top = me.down('[name=topMargin]').getValue() || 0
  me.reportSettings.margin.right = me.down('[name=rightMargin]').getValue() || 0
  me.reportSettings.margin.bottom = me.down('[name=bottomMargin]').getValue() || 0
  me.reportSettings.margin.left = me.down('[name=leftMargin]').getValue() || 0
}

function setReportSettingsControls (form) {
  const me = form
  me.down('[name=topMargin]').setValue(me.reportSettings.margin.top)
  me.down('[name=rightMargin]').setValue(me.reportSettings.margin.right)
  me.down('[name=bottomMargin]').setValue(me.reportSettings.margin.bottom)
  me.down('[name=leftMargin]').setValue(me.reportSettings.margin.left)
}

async function generateBaseReport (form, params = {}) {
  const me = form
  let repName = getRepName(me)
  let result = await HR.reportUtils.generateReport(repName, me.reportOrderID || me.instanceID, me, me.reportExtraParams || {})
  return result
}

function doSaveForm (form) {
  const canSave = AC.entityUtils.verifyRightsMethod(form.entityName, 'update')
  return canSave ? form.saveForm() : Promise.resolve(true)
}
