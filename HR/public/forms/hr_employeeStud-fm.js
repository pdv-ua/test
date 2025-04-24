/* global UB UBS HR AC $App appAC _ Ext appHR saveAs Blob */
exports.formCode = {
  initUBComponent,
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onRecordLoaded,
  addBaseActions,
  activateTab,
  treepanelSelect,
  checkNodeSelection,
  onControlChanged,
  togglePhoto,
  refreshBasePhoto,
  checkTabVisibility,
  checkTabReadOnly,
  onBeforeSave,
  onPrepareDataBeforeSave
}

const printConfig = {
  osobovaKartka: { name: UB.i18n('Особова картка працівника'), type: 'docx' },
  dovidkaZMiscyaRoboty: { name: UB.i18n('Довідка з місця роботи'), type: 'report', reportCode: 'hr_employee_1', reportIdx: '1' }
}

const printConfig2 = {
  income: { name: UB.i18n('Довідка про доходи'), reportCode: 'hr_accrual-income' },
  incomeTax: { name: UB.i18n('Довідка про доходи для податкової'), reportCode: 'hr_accrual-incomeTax' },
  incomeAccrual: { name: UB.i18n('Довідка про доходи для субсидії'), reportCode: 'hr_accrual-income' },
  payIndexSalary: { name: UB.i18n('Довідка про розрахунок індексації заробітної плати'), reportCode: 'hr_accrual-payIndexSalary', allowExportToExcel: true },
  credit: { name: UB.i18n('Довідка про заробітну плату для отримання кредиту'), reportCode: 'hr_accrual-credit' },
  payrollEmbassy: { name: UB.i18n('Довідка про заробітну плату для посольства'), reportCode: 'hr_accrual-payrollEmbassy' },
  payrollRequire: { name: UB.i18n('Довідка про заробітну плату за місцем вимоги'), reportCode: 'hr_accrual-payrollRequire' },
  avgSalary13: { name: UB.i18n('Довідка про середню заробітну плату (для призначення допомоги) (Додаток 1 до Постанови № 13)'), reportCode: 'hr_accrual-avgSalary13' },
  avgSalaryMain: { name: UB.i18n('Довідка про середню заробітну плату за основним місцем роботи'), reportCode: 'hr_accrual-avgSalaryMain' },
  avgSalaryFSS: { name: UB.i18n('Довідка для СС (безробіття)'), reportCode: 'hr_accrual-avgSalaryFSS' },
  N6: { name: UB.i18n('Форма № П-6 "Розрахунково-платіжна відомість працівника"'), reportCode: 'hr_accrual-N6' },
  rl: { name: UB.i18n('Розрахунковий лист за період'), reportCode: 'hr_accrual-rl' },
  rlMonth: { name: UB.i18n('Розрахунковий лист'), reportCode: 'hr_accrual-rlMonth' },
  infoCard: { name: UB.i18n('Картка-довідка'), reportCode: 'hr_accrual-infoCard' }
}

function onControlChanged (ctrl, value) {
  const me = this
  switch (ctrl.name) {
    case 'empTaxCodeType':
      const dictTaxCodeReasonID = me.getField('dictTaxCodeReasonID')
      dictTaxCodeReasonID.setVisible(value !== 'TAXCODE')
      dictTaxCodeReasonID.setAllowBlank(value === 'TAXCODE')
      break
    case 'photo':
      me.togglePhoto(value)
      me.refreshBasePhoto(value)
      break
  }
}

function initUBComponent () {
  const me = this
  me.dataBind = {
    fullFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?") + ({middleName} ? " " + {middleName}:"")'
    },
    shortFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?")[0].toUpperCase() + "." + ({middleName} ? {middleName}[0].toUpperCase() + "." : "")'
    }
  }
  UBS.dataBinder.applyBinding(me)
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
  me.on('aftersave', afterSave, me)
  me.on('manualsaving', manualSaving, me)
  me.setIsDirty = function (value) {
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  const tree = me.down('[ubID=treeInfo]')
  tree.view.up('[ubId=menuPanel]').activateTab(me.targetTab || 'hr_basicInfo', me)
  tree.updateNodes()
  me.actions.fDelete.hide()
  me.attr.taxCode.on('change', (ctrl, value) => {
    let newVal = value.toUpperCase()
    if ($App.connection.userData('appDefaultLang') === 'uk') {
      newVal = newVal.replace(/E/, UB.i18n('Е'))
      newVal = newVal.replace(/T/, UB.i18n('Т'))
      newVal = newVal.replace(/I/, 'І')
      newVal = newVal.replace(/O/, UB.i18n('О'))
      newVal = newVal.replace(/P/, UB.i18n('Р'))
      newVal = newVal.replace(/A/, UB.i18n('А'))
      newVal = newVal.replace(/H/, UB.i18n('Н'))
      newVal = newVal.replace(/K/, UB.i18n('К'))
      newVal = newVal.replace(/X/, UB.i18n('Х'))
      newVal = newVal.replace(/C/, UB.i18n('С'))
      newVal = newVal.replace(/B/, UB.i18n('В'))
      newVal = newVal.replace(/M/, UB.i18n('Щ'))
    }
    ctrl.setValue(newVal)
  })
  _.forEach(me.attr, attr => {
    if (attr.formParams) {
      attr.on('change', (ctrl, value) => {
        if (ctrl.recordValue) {
          if (ctrl.xtype === 'checkboxfield') {
            if ((!!value) !== (!!me.startValue[ctrl.recordValue])) {
              me.setIsDirty(true)
            }
          } else if (ctrl.xtype === 'ubdatefield') {
            if ((!me.startValue[ctrl.recordValue] || (!value && me.startValue[ctrl.recordValue]) ||
              (value && !me.startValue[ctrl.recordValue]) ||
              (value && ctrl.isValid() && value.getTime() !== me.startValue[ctrl.recordValue].getTime()))) {
              me.setIsDirty(true)
            }
          } else if (value !== me.startValue[ctrl.recordValue]) {
            me.setIsDirty(true)
          }
        } else {
          me.setIsDirty(true)
        }
      })
    }
  })
}

async function onFormDataReady () {
  const me = this
  if (me.notRefreshAfterSave) {
    return
  }
  me.isStudentForm = true
  me.checkTabVisibility()
  me.startValue = {}
  if (me.employeeNumberID) {
    const rec = await UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'payOutID', 'tabNum', 'orgID', 'personalAccount', 'bankSubAccount', 'dateFrom', 'dateToEmpty',
        'limitedAccess', 'addDescrPerson'])
      .selectById(me.employeeNumberID)
    if (rec) {
      me.startValue = rec
      Object.keys(me.attr)
        .filter(key => me.attr[key].recordValue)
        .forEach(key => {
          if (me.attr[key].setValueById) {
            me.attr[key].setValueById(me.startValue[me.attr[key].recordValue])
          } else {
            me.attr[key].setValue(me.startValue[me.attr[key].recordValue])
          }
        })
      me.startValue['dateFrom'] = AC.dateService.unshiftDate(AC.dateService.truncTimeToUtcNull(me.startValue['dateFrom']))
      me.startValue['dateToEmpty'] = rec['dateToEmpty'] ? AC.dateService.unshiftDate(AC.dateService.truncTimeToUtcNull(me.startValue['dateToEmpty'])) : null
      me.setTitle(Ext.String.format('{0} {1}', rec.tabNum, me.record.get('fullFIO')))
      me.limitedAccess = rec.limitedAccess
    } else {
      // Проявляється для видалених employeeNumberID, але які ще є в посиланнях, наприклад, в hr_employeePosition.employeeNumberID
      if (me.record.get('fullFIO')) {
        me.setTitle(me.record.get('fullFIO'))
      }
    }
    const onDate = appAC.globalApplicationDate()
    Promise.all([
      UB.Repository('hr_studEducationHistory')
        .attrs('semester', 'groupID.name', 'depName')
        .where('employeeNumberID', '=', me.employeeNumberID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .limit(1)
        .selectSingle(),
      UB.Repository('hr_studEducationKind')
        .attrs('typeStudy.description', 'formStudy.name', 'dictLevelID.name')
        .where('employeeNumberID', '=', me.employeeNumberID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .limit(1)
        .selectSingle(),
      UB.Repository('hr_studStipend')
        .attrs('averageScore', 'sumStipend', 'typeStipend.description')
        .where('employeeNumberID', '=', me.employeeNumberID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .limit(1)
        .selectSingle(),
      UB.Repository('hr_employeePositionS')
        .attrs('payElID.description', 'dictStaffCatID.name')
        .where('employeeNumberID', '=', me.employeeNumberID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .limit(1)
        .selectSingle()
    ]).then(([eduHistory, eduKind, studStipend, empPos]) => {
      if (eduHistory) {
        me.attr.facultyName.setValue(eduHistory['depName'])
        me.attr.groupName.setValue(eduHistory['groupID.name'])
      }
      if (empPos) {
        me.attr.dictStaffCatName.setValue(empPos['dictStaffCatID.name'])
        me.attr.payElName.setValue(empPos['payElID.description'])
      }
      if (eduKind) {
      }
      if (studStipend) {
        me.attr.stipendAmount.setValue(studStipend['sumStipend'])
        me.attr.averageScore.setValue(studStipend['averageScore'])
      }
    })
  } else {
    if (me.record.get('fullFIO')) {
      me.setTitle(me.record.get('fullFIO'))
    }
  }
  me.togglePhoto()
  const dictTaxCodeReasonID = me.getField('dictTaxCodeReasonID')
  dictTaxCodeReasonID.setVisible(me.record.get('empTaxCodeType') !== 'TAXCODE')
  dictTaxCodeReasonID.setAllowBlank(me.record.get('empTaxCodeType') === 'TAXCODE')
  me.setActionDisabled('fDelete', true)
  appHR.getPayOutList(appAC.globalOrganization()).then(payOutList => {
    AC.viewUtils.setFilterValue(me.attr.payOutID, { ID: payOutList })
  })
  AC.viewUtils.setWhereListProperty(me.attr['hr_employeePayOut'], [['employeeNumberID', 'equal', me.employeeNumberID]], null, [])
}

function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance) {
    me.employeeNumberID = null
  }
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    if (!me.record.get('organizationID')) {
      me.record.set('organizationID', appAC.globalOrganization())
    }
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let rlAction = me.actions.rlAction
  if (!rlAction) {
    rlAction = new Ext.Action({
      actionId: 'rlAction',
      eventId: 'rlAction',
      iconCls: 'el-icon-tickets',
      cls: 'blue-action',
      tooltip: UB.i18n('Розрахунковий лист'),
      text: UB.i18n('Розрахунковий лист'),
      handler: function () {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: me.employeeNumberID
            }
          },
          tabId: `hr_rl${me.instanceID}`,
          target: $App.getViewport().centralPanel
        })
      },
      scope: me
    })
    me.actions.rlAction = rlAction
  }
  let printAction = me.actions.printAction
  if (!printAction) {
    const menu = []

    _.forEach(printConfig, (value, name) => {
      menu.push({
        text: value.name,
        code: name,
        type: value.type,
        reportCode: value.reportCode,
        handler: function () {
          getPrintDocument(me, name, value.type, value.reportCode)
        }
      })
    })

    _.forEach(printConfig2, (value, name) => {
      menu.push({
        text: value.name,
        code: name,
        type: value.type,
        reportCode: value.reportCode,
        handler: function () {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_accrual-report',
            tabId: name + Date.now(),
            target: $App.getViewport().centralPanel,
            cmpInitConfig: {
              defaultEmployeeNumberID: me.employeeNumberID
            },
            cmdData: {
              reportCode: value.reportCode,
              reportOptions: { allowExportToExcel: value.allowExportToExcel }
            }
          })
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
      hidden: false
    })
    me.actions.printAction = printAction
  }
}

function activateTab (nodeId, me) {
  if (!nodeId) {
    return
  }
  me.activeNodeId = nodeId
  const tabPanel = me.down('tabpanel')
  const tabs = tabPanel.items.items
  let tab = tabPanel.down('[nodeId=' + nodeId + ']')
  if (!tab) {
    tab = HR.employeeTabs.getTabConfig(nodeId, me)
    if (!tab) {
      return
    }
    tab = tabPanel.add(tab)
  }
  tabs.forEach(function (item) {
    item.tab.hide()
  })
  tab.tab.show()
  me.checkTabReadOnly(tab)
  tabPanel.setActiveTab(tab)
}

function treepanelSelect (tree, record) {
  const me = tree.view.up('form')
  tree.view.up('[ubId=menuPanel]').activateTab(record.raw.nodeId, me)
  if (tree.current) {
    tree.current.set('cls', '')
  }
  tree.current = record
  tree.current.set('cls', 'biz-person-tree-selected-text')
}

function checkNodeSelection (tree, me) {
  const nodeId = me.customParams && me.customParams.nodeId
  if (!nodeId) {
    return
  }
  const nodeToSelect = tree.findNodeId(nodeId)
  nodeToSelect && tree.getSelectionModel().select(nodeToSelect)
}

function togglePhoto (value) {
  const me = this
  const emptyPhoto = me.down('[name=emptyPhoto]')
  if (value === undefined) {
    value = me.attr.photo.getValue()
  }
  if (value) {
    me.attr.photo.show()
    emptyPhoto.hide()
  } else {
    me.attr.photo.hide()
    emptyPhoto.show()
  }
}

function refreshBasePhoto (value) {
  const me = this
  if (me.employeeNumberID) {
    const basePhoto = me.down('[name=basePhoto]')
    basePhoto && basePhoto.setValue(value, me.instanceID, true)
  }
}

function checkTabVisibility () {
  const me = this
  const visibleNodes = me.customParams && me.customParams.visibleNodes
  if (visibleNodes) {
    const tree = me.down('[ubID=treeInfo]')
    const treeFilters = tree.filters
    const checkChildNodes = function (rootNode) {
      rootNode.children && rootNode.children.forEach(node => {
        checkChildNodes(node)
        let nodeId = node.nodeId
        if (nodeId && !visibleNodes.includes(nodeId) && !treeFilters.includes(nodeId)) {
          treeFilters.push(nodeId)
        }
      })
    }
  }
}

function checkTabReadOnly (tab) {
  const me = this
  const readOnlyExceptActive = me.customParams.readOnlyExceptActive
  const initialActiveNodeId = me.customParams.nodeId || ''
  if (readOnlyExceptActive && me.activeNodeId !== initialActiveNodeId) {
    HR.orderManager.enableControls({
      me: tab,
      isEnabled: false
    })
  }
}

async function onBeforeSave () {
  return true
}

function onPrepareDataBeforeSave (me, params) {
  params.formData = {
    ID: me.employeeNumberID || null,
    kind: 'STUD',
    orgID: appAC.globalOrganization()
  }
  Object.keys(me.attr)
    .filter(key => me.attr[key].formParams).forEach(attrName => {
      if (['dateFrom', 'dateToEmpty'].includes(attrName)) {
        if (me.startValue[attrName] && me.attr[attrName].getValue() && me.startValue[attrName].getTime() !== me.attr[attrName].getValue().getTime()) {
          params.formData[attrName] = AC.dateService.truncTimeToUtcNull(me.attr[attrName].getValue())
        } else {
          params.formData[attrName] = me.attr[attrName].getValue() ? AC.dateService.truncTimeToUtcNull(me.attr[attrName].getValue()) : null
        }
      } else if (me.startValue[attrName] !== me.attr[attrName].getValue()) {
        params.formData[attrName] = me.attr[attrName].getValue()
      }
    })
}

function afterSave (me, data) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    if (!me.employeeNumberID) {
      me.employeeNumberID = data.employeeNumberID
    }
  }
}

function manualSaving (me, action) {
  if (action && action.length) {
    action = action[0]
  }
  me.notRefreshAfterSave = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose)
}

function getPrintDocument (me, code, type, reportCode, reportIdx) {
  if (code === 'dergSlugOsobovaKartka') {
    (UB.Repository('hr_employeePositionSR')
      .attrs(['*'])
      .where('employeeID', '=', me.instanceID)
      .where('organizationID', '=', appAC.globalOrganization())
      .where('employeeNumberID', '=', me.employeeNumberID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('positionID.positionType', '=', 1)
      .orderBy('dateFrom', 'asc')
      .selectSingle()).then(res => {
      if (res) {
        formPrintDocument(me, code, 'docx')
      } else {
        $App.dialogInfo(UB.i18n('Особа не є державним службовцем, використайте іншу особову картку'))
      }
    })
  } else {
    formPrintDocument(me, code, type, reportCode, reportIdx)
  }
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
      orgID: appAC.globalOrganization(),
      tabNumID: me.instanceID
    }
  }).then(function (result) {
    me.setLoading(false)
    if (result.params.type === 'docx') {
      if (result.docs) {
        const docs = JSON.parse(result.docs)
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
      const reportDesc = me.initialConfig.commandConfig.description
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_repParamEmpInfo',
        caption: reportDesc,
        cmpInitConfig: {
          signerAllowBlank: true,
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
      const reportDesc = me.initialConfig.commandConfig.description
      const report = Ext.create('UBS.UBReport', {
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
    } else if (result.params.type === 'excel') {
      $App.doCommand({
        cmdType: 'showReport',
        caption: UB.i18n('Друкована форма'),
        tabId: 'printDocument_' + result.params.reportCode + Date.now(),
        target: $App.getViewport().centralPanel,
        cmdData: {
          reportCode: result.params.reportCode,
          reportParams: {
            instanceID: me.instanceID
          },
          reportOptions: {
            allowExportToExcel: true,
            isModal: false
          }
        }
      })
    }
  }).then(function () {
    me.setLoading(false)
  })
}
