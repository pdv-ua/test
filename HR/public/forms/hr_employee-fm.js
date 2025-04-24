/* global UB UBS Ext HR appAC $App saveAs _ Blob AC $App appHR */
exports.formCode = {
  initUBComponent,
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onRecordLoaded,
  addBaseActions,
  setRootInitial,
  activateTab,
  treepanelSelect,
  checkNodeSelection,
  controlChanged,
  togglePhoto,
  refreshBasePhoto,
  checkTabVisibility,
  checkTabReadOnly,
  onBeforeSave
}

function controlChanged (ctrl, value) {
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
  me.on('controlChanged', me.controlChanged)
}

function initComponentDone () {
  const me = this
  const tree = me.down('[ubID=treeInfo]')
  AC.viewUtils.setAttr(me)
  if (!me.employeeNumberID) {
    tree.filters = ['hr_employeeNumberInfo', 'hr_payOut', 'hr_employeeAccrualPayment', 'hr_payRetention', 'hr_accrual',
      'hr_accrualBalance', 'hr_empAssessment', 'hr_empAssessment1', 'hr_employeeAccessInfo', 'hr_employeeOrgInfo']
    me.attr.tabNum.hide()
    me.attr.addDescrPerson.hide()
  } else {
    tree.filters = ['hr_employeeNumberInfo']
    me.attr.tabNum.show()
    me.attr.addDescrPerson.show()
  }

  const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  if (funcOrgType !== '1') {
    /* Сфера діяльності організації != Загальна */
    tree.filters.push('hr_empQualification')
    tree.filters.push('hr_empTarifCategory')
  }
  if (funcOrgType !== '2') {
    /* Сфера діяльності організації != Державна служба */
    tree.filters.push('hr_employeeCivilCommon')
    tree.filters.push('hr_publServRang')
    tree.filters.push('hr_empAssessment')
    tree.filters.push('grpPublServ')
    tree.filters.push('hr_empCertificatnUp')
  } else {
    tree.filters.push('hr_empAssessment1')
  }

  me.actions.fDelete.hide()
  HR.orderManager.createShowImportAction(me)
  activateTab('hr_employee', me)
  me.attr.taxCode.on('change', (ctrl, value) => {
    let me = ctrl.up('form')
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

    if (me.attr.taxCode.isValid() && value.length === 10 && me.attr.empTaxCodeType.getValue() === 'TAXCODE') {
      const { sex, birthday } = HR.nameCase.decyptionRNOKPP(value)
      me.attr.sexType.setValue(sex)
      if (birthday) {
        if (AC.dateService.shiftDate(birthday) < AC.dateService.currentDate()) {
          me.attr.birthDate.setValue(birthday)
        } else {
          $App.dialogInfo(UB.i18n(`Перевірте коректність вводу РНОКПП, дата народження з РНОКПП {0}`, AC.dateService.formatDate(birthday)), 'Інформація')
        }
      }
    }
  })

  if (AC.entityUtils.verifyRightsMethod('hr_employee', 'viewMilitary') && !AC.entityUtils.isAdmin()) {
    me.customParams = {
      visibleNodes: ['grpCommon', 'militaryService', 'hr_employee', 'hr_empStateMilitary', 'hr_employeePluralList'],
      nodeId: 'hr_empStateMilitary'
    }
    const tabPanel = me.down('tabpanel')
    let tab = tabPanel.down('[nodeId=hr_employee]')
    HR.orderManager.enableControls({
      me: tab,
      isEnabled: false
    })
  }

  createActions(me)
}

async function onFormDataReady () {
  const me = this
  me.checkTabVisibility()

  const panel = me.down('[name=panelEmpContact]')

  if (AC.settings.get('hrHideEmployeeContact', appAC.globalOrganization())) {
    const empContacts = await UB.Repository('hr_employeeContact')
      .attrs(['value', 'contactTypeID.name'])
      .where('employeeID', '=', me.instanceID)
      .where('dateFrom', '<=', appAC.globalApplicationDate())
      .where('dateTo', '>=', appAC.globalApplicationDate())
      .selectAsObject()

    if (Object.keys(empContacts).length) {
      panel.height = 14
      let empContactHtml = ''
      empContacts.forEach(contact => {
        panel.height += 16
        empContactHtml += ` <div
        style=""
      >
      <span
        style="color: rgba(33, 150, 243, 0.8); padding-left: 15px; font-weight: 500;
        line-height: 15px;"
      >
        ${UB.i18n(contact['contactTypeID.name'])}
      </span>
        ${contact.value}
      </div>`
      })

      panel.getEl().setHTML(empContactHtml)
      me.updateLayout()
    } else {
      panel.hide()
    }
  } else {
    panel.hide()
  }

  if (me.employeeNumberID) {
    const rec = await UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'payOutID', 'tabNum', 'orgID', 'personalAccount', 'limitedAccess', 'addDescrPerson', 'dateFrom'])
      .selectById(me.employeeNumberID)
    if (rec) {
      me.attr.tabNum.setValue(rec.tabNum)
      me.attr.addDescrPerson.setValue(rec.addDescrPerson)
      me.startValue = rec
      if (me.down('[name=payOutID]')) {
        me.down('[name=payOutID]').setValueById(rec.payOutID)
        me.down('[name=personalAccount]').setValue(rec.personalAccount)
      }
      me.setTitle(Ext.String.format('{0}, {1}', rec.tabNum, me.record.get('fullFIO')))
      me.limitedAccess = rec.limitedAccess
      me.employeeNumberDateFrom = rec.dateFrom
    } else {
      // Проявляється для видалених employeeNumberID, але які ще є в посиланнях, наприклад, в hr_employeePosition.employeeNumberID
      if (me.record.get('fullFIO')) {
        me.setTitle(me.record.get('fullFIO'))
      }
    }

    const firedDate = await UB.Repository('hr_employeeNumberS')
      .attrs('MAX([dateTo])')
      .where('ID', '=', me.employeeNumberID)
      .where('orgID', '=', appAC.globalOrganization())
      .selectScalar()
    if (!firedDate || (firedDate && AC.dateService.shiftDate(firedDate).getTime() === AC.dateService.maxDate().getTime())) {
      const printAction = me.actions.printAction
      if (printAction && printAction.items[0] && printAction.items[0].menu && printAction.items[0].menu.items && printAction.items[0].menu.items.items) {
        printAction.items[0].menu.items.items.forEach(act => {
          if (['dovidkaZMiscyaRoboty3'].includes(act.code)) {
            act.hide()
          }
        })
      }
    }
  } else {
    if (me.record.get('fullFIO')) {
      me.setTitle(me.record.get('fullFIO'))
    }
    if (me.record.get('ID')) {
      const epData = await UB.Repository('hr_employeePosition')
        .attrs('ID')
        .where('employeeID', '=', me.record.get('ID'))
        .where('organizationID', '=', appAC.globalOrganization())
        .where('dateFrom', '<=', appAC.globalApplicationDate())
        .where('dateTo', '>=', appAC.globalApplicationDate())
        .limit(1)
        .selectScalar()
      if (epData) {
        const printAction = me.actions.printAction
        if (printAction && printAction.items[0] && printAction.items[0].menu && printAction.items[0].menu.items && printAction.items[0].menu.items.items) {
          printAction.items[0].menu.items.items.forEach(act => {
            if (['employeeWorkbookDt6'].includes(act.code)) {
              act.hide()
            }
          })
        }
      }
    }
  }
  if (me.isNewInstance) {
    me.setTitle(UB.i18n('Особа (створення)'))
    if (!me.record.get('organizationID')) {
      let orgID = null
      const grid = AC.gridUtils.getSenderGrid(me)
      if (grid && grid.filters && grid.filters.length) {
        grid.filters.forEach(item => {
          if (item.id === 'organizationID') orgID = item.value
        })
      }
      if (!orgID && grid) {
        const masterForm = grid.up('form')
        if (masterForm) {
          orgID = masterForm.record.get('organizationID')
          if (masterForm.formCode === 'hr_empOrderAppointDet' && masterForm.masterForm && masterForm.masterForm.record && masterForm.masterForm.record.get) {
            orgID = masterForm.masterForm.record.get('masterOrganizationID') || masterForm.record.get('organizationID')
          }
        }
      }
      me.record.set('organizationID', orgID || appAC.globalOrganization())
    }
    me.record.set('isCitizen', true)
    if (!me.record.get('citizenshipID')) {
      const rec = await UB.Repository('cdn_country').attrs(['ID', 'code']).where('code', '=', appAC.getDefaultCountryCode()).limit(1).selectSingle()
      if (rec) { me.record.set('citizenshipID', rec.ID) }
    }
    const taxData = await UB.Repository('hr_dictTaxCodeReason').attrs('ID').where('code', '=', '01').selectSingle()
    if (taxData) {
      me.getField('dictTaxCodeReasonID').setValueById(taxData.ID)
    }
  } else {
    const checkEdit = AC.settings.get('onlyOwnerCanEditEmployee', null, null)
    if (checkEdit) {
      const curDate = AC.dateService.shiftDate(AC.dateService.todayDate())
      me.setLoading(true)
      if (me.employeeNumberID) {
        const item = await UB.Repository('hr_employeeNumberS')
          .attrs('ID')
          .where('employeeID', '=', me.record.get('ID'))
          .where('dateFrom', '<=', curDate)
          .where('dateTo', '>=', curDate)
          .where('orgID', '=', appAC.globalOrganization())
          .selectSingle()
        if (!item) {
          me.readOnly = true
          setReadOnlyMode(me)
        }
        me.setLoading(false)
      } else {
        const firedDate = await UB.Repository('hr_employeeNumberS')
          .attrs('MAX([dateTo])')
          .where('employeeID', '=', me.record.get('ID'))
          .where('orgID', '=', appAC.globalOrganization())
          .selectScalar()
        const firedDateOther = await UB.Repository('hr_employeeNumberS')
          .attrs('MAX([dateTo])')
          .where('employeeID', '=', me.record.get('ID'))
          .where('orgID', '!=', appAC.globalOrganization())
          .selectScalar()
        if ((firedDate && AC.dateService.shiftDate(firedDate) < curDate) || (!firedDate && firedDateOther && AC.dateService.shiftDate(firedDateOther) > curDate)) {
          me.readOnly = true
          setReadOnlyMode(me)
        }
        me.setLoading(false)
      }
    }
  }

  me.togglePhoto()
  me.down('[name=oathOrgName]').setValue(me.record.get('oathOrgName'))
  const dictTaxCodeReasonID = me.getField('dictTaxCodeReasonID')
  dictTaxCodeReasonID.setVisible(me.record.get('empTaxCodeType') !== 'TAXCODE')
  dictTaxCodeReasonID.setAllowBlank(me.record.get('empTaxCodeType') === 'TAXCODE')

  me.setActionDisabled('fDelete', true)
  AC.viewUtils.setFilterValue(me.attr.pensionDocID, {
    employeeID: me.instanceID
  })
}

function onRecordLoaded (record, data) {
  const me = this
  if (!me.isFirstLoad) {
    me.isFirstLoad = true
  }
}

function setReadOnlyMode (me) {
  AC.viewUtils.showToast(UB.i18n('Тільки перегляд'))
  AC.viewUtils.setFormReadOnly(me, true, [], true)
  me.setTitle('<i class="fa fa-lock"></i> ' + (me.title || (me.window && me.window.title ? me.window.title : me.record.get('fullFIO'))))
}

async function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let printAction = me.actions.printAction
  if (!printAction) {
    let refList = HR.refSettings.getRefList(appAC.globalOrganization())
    let dictUniversalRef = refList.addRefList
    let dictRef = refList.refList
    let empRefSettings = HR.refSettings.getSettings(appAC.globalOrganization())

    const settingsData = empRefSettings.settingsData
    const printCofig = {}
    const menu = []

    _.forEach(settingsData, (settingsValue, refCode) => {
      if (settingsValue.empValue) {
        let ref = dictRef.find(ref => ref.code === refCode) || dictUniversalRef.find(ref => ref.code === refCode)
        if (ref) printCofig[refCode] = { name: ref.name, refParams: ref.refParams || {} }
      }
    })

    _.forEach(printCofig, (value, refCode) => {
      menu.push({
        text: value.name,
        code: refCode,
        type: value.refParams.type || null,
        reportCode: value.refParams.reportCode || null,
        handler: function (btn) {
          if (me.employeeNumberID && dictUniversalRef.map(o => o.code).includes(btn.code)) {
            appHR.getPrintUniRef(me, refCode, me.instanceID, me.employeeNumberID)
          } else if (me.employeeNumberID || (!me.employeeNumberID && !['dovidkaZMiscyaRoboty', 'dovidkaZMiscyaRoboty2', 'dovidkaZMiscyaRoboty3', 'dovidkaZMiscyaRobotyPregnVac',
            'dovidkaZMiscyaRobotyMission', 'osobovaKartka', 'dergSlugOsobovaKartka', 'dergSlugOsobovaKartka2020', 'empOath', 'empCommitment',
            'empCivilMemo', 'dovidkaNotUsedVacation', 'povidomZminaOblikData', 'employeeWorkbook', 'employeeWorkbookDt', 'calcExperience', 'agreementProcessingData'].includes(btn.code))) {
            appHR.getPrintDocument(me, refCode, value, me.instanceID, me.employeeNumberID)
          }
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
      hidden: AC.entityUtils.verifyRightsMethod('hr_employee', 'viewMilitary') && !AC.entityUtils.isAdmin(),
      handler: function () {
        if (!me.employeeNumberID) {
          this.menu.items.items.forEach(act => {
            if (['dovidkaZMiscyaRoboty', 'dovidkaZMiscyaRoboty2', 'dovidkaZMiscyaRoboty3', 'dovidkaZMiscyaRobotyPregnVac', 'dovidkaZMiscyaRobotyMission', 'osobovaKartka',
              'dergSlugOsobovaKartka', 'dergSlugOsobovaKartka2020', 'empOath', 'empCommitment', 'empCivilMemo', 'dovidkaNotUsedVacation',
              'povidomZminaOblikData', 'employeeWorkbook', 'employeeWorkbookDt', 'calcExperience', 'agreementProcessingData'].includes(act.code)) {
              act.hide()
            }
          })
        }
      }
    })
    me.actions.printAction = printAction
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  if (AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'canEditDates') && me.employeeNumberID) {
    allActions.menu.add({
      xtype: 'menuseparator'
    })
    allActions.menu.add({
      text: UB.i18n('Редагування дат'),
      name: 'actionEditTabNum',
      iconCls: 'iconEdit',
      handler: function () {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumberEdit',
          entity: 'hr_employeeNumber',
          instanceID: me.employeeNumberID
        })
      }
    })
  }
  if (AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'updateAddPersonDescription') && me.employeeNumberID) {
    allActions.menu.add({
      xtype: 'menuseparator'
    })
    allActions.menu.add({
      text: UB.i18n('Оновити додаткову інформацію'),
      name: 'actionUpdateAddDescrPerson',
      handler: function () {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_employeeNumber',
          method: 'updateAddPersonDescription',
          employeeNumberID: me.employeeNumberID
        }).then(() => {
          me.setLoading(false)
          me.loadInstance()
        }, (err) => {
          me.setLoading(false)
          throw err
        })
      }
    })
  }
}

async function setRootInitial () {
  const me = this
  const tree = me.down('[ubID=treeInfo]')
  const createGrid = (paramsList) => {
    if (!(paramsList && paramsList.length)) {
      tree.rootInitial.children = [
        {
          text: UB.i18n('<span style="font-weight: bold">Загальні відомості</span>'),
          expanded: true,
          nodeId: 'grpCommon',
          children: [
            {
              text: UB.i18n('Загальні дані'),
              leaf: true,
              nodeId: 'hr_employee'
            },
            {
              text: UB.i18n('Адреси'),
              leaf: true,
              nodeId: 'ac_address'
            },
            {
              text: UB.i18n('Інші контакти'),
              leaf: true,
              nodeId: 'hr_employeeContact'
            },
            {
              text: UB.i18n('Члени сім\'ї'),
              leaf: true,
              nodeId: 'hr_employeeFamily'
            },
            {
              text: UB.i18n('Документи'),
              leaf: true,
              nodeId: 'hr_employeeDocs'
            },
            {
              text: UB.i18n('Право на пільги'),
              leaf: true,
              nodeId: 'hr_employeeBenefits'
            },
            {
              text: UB.i18n('Нагороди'),
              leaf: true,
              nodeId: 'hr_employeeBonus'
            },
            {
              text: UB.i18n('Стягнення'),
              leaf: true,
              nodeId: 'hr_employeePenalty'
            },
            {
              text: UB.i18n('Зміна облікових даних'),
              leaf: true,
              nodeId: 'hr_employeeCgh'
            },
            {
              text: UB.i18n('Інвалідність'),
              leaf: true,
              nodeId: 'hr_employeeDisability'
            },
            {
              text: UB.i18n('Додаткові гарантії працевлаштування'),
              leaf: true,
              nodeId: 'hr_empAddGuarantees'
            },
            {
              text: UB.i18n('Додаткові дані за організацією'),
              leaf: true,
              nodeId: 'hr_employeeOrgInfo'
            }
          ]
        },
        {
          text: UB.i18n('<span style="font-weight: bold">Трудова діяльність</span>'),
          expanded: true,
          nodeId: 'grpWork',
          children: [
            {
              text: UB.i18n('Трудова книжка'),
              leaf: true,
              nodeId: 'hr_employeeWorkbook'
            },
            {
              text: UB.i18n('Просування в органі'),
              leaf: true,
              nodeId: 'hr_employeePositionOrg'
            },
            {
              text: UB.i18n('Стаж'),
              leaf: true,
              nodeId: 'hr_employeeExperience'
            }
          ]
        },
        {
          text: UB.i18n('<span style="font-weight: bold">Державна служба</span>'),
          expanded: true,
          nodeId: 'grpPublServ',
          children: [
            {
              text: UB.i18n('Загальні дані держслужбовця'),
              leaf: true,
              nodeId: 'hr_employeeCivilCommon'
            },
            {
              text: UB.i18n('Ранг держслужбовця'),
              leaf: true,
              nodeId: 'hr_publServRang'
            },
            {
              text: UB.i18n('Оцінювання'),
              leaf: true,
              nodeId: 'hr_empAssessment'
            }
          ]
        },
        {
          text: UB.i18n('<span style="font-weight: bold">Військова служба</span>'),
          expanded: true,
          nodeId: 'militaryService',
          children: [
            {
              text: UB.i18n('Військові звання'),
              leaf: true,
              nodeId: 'hr_empMilitaryRanks'
            },
            {
              text: UB.i18n('Військовий облік'),
              leaf: true,
              nodeId: 'hr_empStateMilitary'
            },
            {
              text: UB.i18n('Призов на ВС'),
              leaf: true,
              nodeId: 'hr_empConscription'
            },
            {
              text: UB.i18n('Контракт'),
              leaf: true,
              nodeId: 'hr_empMilitaryContract'
            }
          ]
        },
        {
          text: UB.i18n('<span style="font-weight: bold">Освіта</span>'),
          expanded: true,
          nodeId: 'grpEdu',
          children: [
            {
              text: UB.i18n('Освіта'),
              leaf: true,
              nodeId: 'hr_employeeEducation'
            },
            {
              text: UB.i18n('Володіння мовами'),
              leaf: true,
              nodeId: 'hr_employeeLanguage'
            },
            {
              text: UB.i18n('Науковий ступінь'),
              leaf: true,
              nodeId: 'hr_empRangeScience'
            },
            {
              text: UB.i18n('Вчене звання'),
              leaf: true,
              nodeId: 'hr_empAcademStatus'
            },
            {
              text: UB.i18n('Професійне навчання'),
              leaf: true,
              nodeId: 'hr_empCertificatnUp'
            },
            {
              text: UB.i18n('Професійне навчання'),
              leaf: true,
              nodeId: 'hr_empQualification'
            },
            {
              text: UB.i18n('Атестація/Кваліфікація'),
              leaf: true,
              nodeId: 'hr_empCertificationAcc'
            },
            {
              text: UB.i18n('Патенти та публікації'),
              leaf: true,
              nodeId: 'hr_employeeSuccess'
            },
            {
              text: UB.i18n('Тарифні розряди'),
              leaf: true,
              nodeId: 'hr_empTarifCategory'
            }
          ]
        },
        {
          text: UB.i18n('<span style="font-weight: bold">Заяви</span>'),
          expanded: true,
          nodeId: 'hr_request',
          children: [
          ]
        }
      ]

      if (me.employeeNumberID) {
        tree.rootInitial.children[0].children.unshift({
          text: UB.i18n('Основні дані'),
          leaf: true,
          nodeId: 'hr_employeeNumberInfo',
          children: []
        })

        tree.rootInitial.children.push({
          text: UB.i18n('<span style="font-weight: bold">Накази з персоналу</span>'),
          expanded: true,
          nodeId: 'grpOrder',
          children: [
            {
              text: UB.i18n('Накази'),
              leaf: true,
              nodeId: 'hr_empOrder'
            },
            {
              text: UB.i18n('Історія змін'),
              leaf: true,
              nodeId: 'hr_employeePosition'
            },
            {
              text: UB.i18n('Призначення / Переведення'),
              leaf: true,
              nodeId: 'hr_employeePositionOrder'
            },
            {
              text: UB.i18n('Зміна окладів'),
              leaf: true,
              nodeId: 'hr_employeePositionStaffTable'
            },
            {
              text: UB.i18n('Лікарняні'),
              leaf: true,
              nodeId: 'hr_empOrderSickness'
            },
            {
              text: UB.i18n('Інші невиходи'),
              leaf: true,
              nodeId: 'hr_empOrderUni'
            },
            {
              text: UB.i18n('Відрядження'),
              leaf: true,
              nodeId: 'hr_empMission'
            },
            {
              text: UB.i18n('Покладання обов\'язків'),
              leaf: true,
              nodeId: 'hr_employeeActing'
            },
            {
              text: UB.i18n('Зміна графіку роботи'),
              leaf: true,
              nodeId: 'hr_empWorkShdChange'
            }
          ]
        })

        tree.rootInitial.children.push({
          text: UB.i18n('<span style="font-weight: bold">Відпустки</span>'),
          expanded: true,
          nodeId: 'grpVac',
          children: [
            {
              text: UB.i18n('Право на відпустки, відгули'),
              leaf: true,
              nodeId: 'hr_empVacationPlan'
            },
            {
              text: UB.i18n('Відпустки'),
              leaf: true,
              nodeId: 'hr_employeeVacation'
            },
            {
              text: UB.i18n('Довготривала відсутність'),
              leaf: true,
              nodeId: 'hr_empLongTermAbsc'
            },
            {
              text: UB.i18n('Заміщення довготривалої відсутності'),
              leaf: true,
              nodeId: 'hr_longTermReplace'
            }
          ]
        })

        const children = [
          {
            text: UB.i18n('Постійні нарахування'),
            leaf: true,
            nodeId: 'hr_employeeAccrualPayment'
          },
          {
            text: UB.i18n('Постійні утримання'),
            leaf: true,
            nodeId: 'hr_payRetention'
          },
          {
            text: UB.i18n('Виплата зарплати'),
            leaf: true,
            nodeId: 'hr_payOut'
          },
          {
            text: UB.i18n('Пільги ПДФО'),
            leaf: true,
            nodeId: 'hr_employeeTaxLimit'
          },
          {
            text: UB.i18n('Пільги лікарняних'),
            leaf: true,
            nodeId: 'hr_employeeSickLimit'
          }
        ]

        if (AC.entityUtils.verifyRightsMethod('hr_employee', 'viewAccrualBalance')) {
          children.push({
            text: UB.i18n('Розрахункова відомість заробітної плати'),
            leaf: true,
            nodeId: 'hr_accrualBalance'
          })
        }

        if (AC.entityUtils.verifyRightsMethod('hr_employeeAssets', 'viewEmployeeAssets')) {
          children.push({
            text: UB.i18n('Майно організації у працівника'),
            leaf: true,
            nodeId: 'hr_employeeAssets'
          })
        }

        if (AC.entityUtils.verifyRightsMethod('hr_employeeVehicle', 'viewEmployeeVehicle')) {
          children.push({
            text: UB.i18n('Транспортні засоби працівника'),
            leaf: true,
            nodeId: 'hr_employeeVehicle'
          })
        }

        tree.rootInitial.children.push({
          text: UB.i18n('<span style="font-weight: bold">Заробітна плата</span>'),
          expanded: true,
          nodeId: 'grpSa',
          children
        })
        const grpWork = tree.rootInitial.children.find(o => o.nodeId === 'grpWork')
        if (grpWork) {
          grpWork.children.push({
            text: UB.i18n('Випробувальний термін'),
            leaf: true,
            nodeId: 'hr_employeeTrialPeriod'
          })
          grpWork.children.push({
            text: UB.i18n('Оцінювання'),
            leaf: true,
            nodeId: 'hr_empAssessment1'
          })
        }
      }
      tree.rootInitial.children.push({
        text: UB.i18n('<span style="font-weight: bold">Перевірки</span>'),
        expanded: true,
        nodeId: 'grpAudit',
        children: [
          {
            text: UB.i18n('Спецперевірка'),
            leaf: true,
            nodeId: 'hr_employeeAuditSpec'
          },
          {
            text: UB.i18n('Очищення влади'),
            leaf: true,
            nodeId: 'hr_employeeAuditClear'
          }
        ]
      })
      tree.rootInitial.children.push({
        text: UB.i18n('<span style="font-weight: bold">Інше</span>'),
        expanded: true,
        nodeId: 'grpOther',
        children: [
          {
            text: UB.i18n('Додаткова інформація'),
            leaf: true,
            nodeId: 'hr_empAddInform'
          },
          {
            text: UB.i18n('Пенсія'),
            leaf: true,
            nodeId: 'hr_employeePension'
          },
          {
            text: UB.i18n('Профіль особи з порталу вакансій'),
            leaf: true,
            nodeId: 'hr_employeeInfoPortalVac'
          },
          {
            text: UB.i18n('Форми допуску до інформації'),
            leaf: true,
            nodeId: 'hr_employeeAccessInfo'
          },
          {
            text: UB.i18n('Медогляд'),
            leaf: true,
            nodeId: 'hr_empCheckMedical'
          }
        ]
      })
      tree.rootInitial.children.push({
        text: UB.i18n('<span style="font-weight: bold">Особові рахунки</span>'),
        expanded: true,
        nodeId: 'hr_employeePluralList',
        children: [
        ]
      })
    } else {
      if (!AC.entityUtils.verifyRightsMethod('hr_employeeAssets', 'viewEmployeeAssets')) {
        paramsList = paramsList.filter(x => x.code !== 'hr_employeeAssets')
      }
      if (!AC.entityUtils.verifyRightsMethod('hr_employeeVehicle', 'viewEmployeeVehicle')) {
        paramsList = paramsList.filter(x => x.code !== 'hr_employeeVehicle')
      }

      if (AC.entityUtils.verifyRightsMethod('hr_employee', 'viewMilitaryEXP') && !AC.entityUtils.isAdmin()) {
        paramsList = paramsList.filter(x =>
          ['hr_employee', 'hr_employeePluralList', 'grpEdu', 'grpCommon'].includes(x.groupCode) ||
          (x.groupCode === 'militaryService' && x.code === 'hr_empStateMilitary') ||
          (x.groupCode === 'grpOrder' && x.code === 'hr_employeePositionOrder')
        )
      }

      tree.rootInitial.children = []

      const fillInitialGroup = (groupCodeList) => {
        groupCodeList.forEach(groupCode => {
          let groupToInsert = paramsList.filter(el => el.groupCode === groupCode)
          let groupName
          switch (groupCode) {
            case 'grpCommon':
              groupName = UB.i18n('Загальні відомості')
              break
            case 'grpWork':
              groupName = UB.i18n('Трудова діяльність')
              break
            case 'grpPublServ':
              groupName = UB.i18n('Державна служба')
              break
            case 'militaryService':
              groupName = UB.i18n('Військова служба')
              break
            case 'grpEdu':
              groupName = UB.i18n('Освіта')
              break
            case 'grpOrder':
              groupName = UB.i18n('Накази з персоналу')
              break
            case 'grpVac':
              groupName = UB.i18n('Відпустки')
              break
            case 'grpSa':
              groupName = UB.i18n('Заробітна плата')
              break
            case 'grpAudit':
              groupName = UB.i18n('Перевірки')
              break
            case 'grpOther':
              groupName = UB.i18n('Інше')
              break
            case 'hr_employeePluralList':
              groupName = UB.i18n('Особові рахунки')
              break
            case 'hr_request':
              groupName = UB.i18n('Заяви')
              break
            default:
              groupName = UB.i18n('Інші')
              break
          }
          if (groupToInsert && groupToInsert.length) {
            let children = []
            if (!me.employeeNumberID) {
              switch (groupCode) {
                case 'grpWork': {
                  groupToInsert = groupToInsert.filter(o => o.code !== 'hr_employeeTrialPeriod' || o.code !== 'hr_empAssessment1')
                  break
                }
              }
            } else {
              switch (groupCode) {
                case 'grpSa': {
                  if (!AC.entityUtils.verifyRightsMethod('hr_employee', 'viewAccrualBalance')) {
                    groupToInsert = groupToInsert.filter(o => o.code !== 'hr_accrualBalance')
                  }
                  break
                }
              }
            }
            switch (groupCode) {
              case 'hr_employeePluralList':
                tree.rootInitial.children.push({
                  text: UB.i18n(`<span style="font-weight: bold">${groupName}</span>`),
                  expanded: true,
                  nodeId: groupCode,
                  children: [
                  ]
                })
                break
              case 'hr_request':
                tree.rootInitial.children.push({
                  text: UB.i18n(`<span style="font-weight: bold">${groupName}</span>`),
                  expanded: true,
                  nodeId: groupCode,
                  children: [
                  ]
                })
                break
              default:
                groupToInsert.forEach(el => {
                  children.push({
                    text: UB.i18n(`${el.caption}`),
                    leaf: true,
                    nodeId: `${el.code}`
                  })
                })
                if (children.length) {
                  tree.rootInitial.children.push({
                    text: UB.i18n(`<span style="font-weight: bold">${groupName}</span>`),
                    expanded: true,
                    nodeId: groupCode,
                    children
                  })
                }
                break
            }
          }
        })
      }
      fillInitialGroup(['grpCommon', 'grpWork', 'grpPublServ', 'militaryService', 'grpEdu', 'hr_request'])
      if (me.employeeNumberID) {
        fillInitialGroup(['hr_employeeNumberInfo', 'grpOrder', 'grpVac', 'grpSa'])
      }
      fillInitialGroup(['grpAudit', 'grpOther', 'hr_employeePluralList'])
    }
  }

  const [shortcutBaze, shortcutForOrg] = await Promise.all([
    UB.Repository('hr_employeeCardShortcutList')
      .attrs(['ID', 'params'])
      .where('orgID', '=', 0)
      .selectSingle()
      .then(empShortcutBaze => {
        if (empShortcutBaze) {
          return empShortcutBaze.params.constructor === Array ? empShortcutBaze.params : JSON.parse(empShortcutBaze.params)
        }
      }),

    UB.Repository('hr_employeeCardShortcutList')
      .attrs(['ID', 'params'])
      .where('orgID', '=', appAC.globalOrganization())
      .selectSingle()
      .then(empShortcutForOrg => {
        if (empShortcutForOrg) {
          return empShortcutForOrg.params.constructor === Array ? empShortcutForOrg.params : JSON.parse(empShortcutForOrg.params)
        }
      })
  ])

  if (shortcutForOrg) {
    const shortcutUpdate = shortcutForOrg.map(({ code, caption, groupCode }) => (
      { code,
        caption: (shortcutBaze.find(shortBaze => shortBaze.code === code) || {}).caption || caption,
        groupCode
      }
    ))
    me.paramsList = shortcutUpdate
    createGrid(me.paramsList)
  } else {
    me.paramsList = shortcutBaze
    createGrid(me.paramsList)
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
  if (nodeId !== 'hr_employeeExperienceFix' && nodeId !== 'hr_employeeExperienceCont') {
    tabs.forEach(function (item) {
      item.tab.hide()
    })
  }
  tab.tab.show()
  if (tab.nodeId === 'hr_payOut' && me.startValue) {
    tab.down('[name=payOutID]').setValueById(me.startValue.payOutID)
    tab.down('[name=personalAccount]').setValue(me.startValue.personalAccount)
    appHR.getPayOutList(me.startValue.orgID).then(payOutList => {
      AC.viewUtils.setFilterValue(tab.down('[name=payOutID]'), { ID: payOutList })
    })
  }
  if (nodeId === 'hr_employeeExperience') {
    activateTab('hr_employeeExperienceFix', me)
    activateTab('hr_employeeExperienceCont', me)
  }
  if (nodeId !== 'hr_employeeExperienceFix' && nodeId !== 'hr_employeeExperienceCont') {
    me.checkTabReadOnly(tab)
    tabPanel.setActiveTab(tab)
  }
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
    me.setRootInitial().then(() => {
      const rootNode = _.clone(tree.rootInitial)
      checkChildNodes(rootNode)
      tree.updateNodes()
    })
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
  const me = this
  let valueTaxCode = me.attr.taxCode.getValue()

  if (me.attr.taxCode.isValid() && valueTaxCode.length === 10 && me.attr.empTaxCodeType.getValue() === 'TAXCODE') {
    const { sex, birthday } = HR.nameCase.decyptionRNOKPP(valueTaxCode)

    if (me.attr.birthDate.getValue() && me.attr.birthDate.getValue().getTime() !== AC.dateService.shiftDate(birthday).getTime()) {
      return Promise.resolve($App.dialogYesNo(UB.i18n(`Увага! Ідентифікаційний код не відповідає даті народження! Все одно зберегти?`)).then(result => {
        if (result) {
          return true
        } else {
          return false
        }
      }))
    }
    if (me.attr.sexType.getValue() !== sex) {
      return Promise.resolve($App.dialogYesNo(UB.i18n(`Увага! Ідентифікаційний код не відповідає статі! Все одно зберегти?`)).then(result => {
        if (result) {
          return true
        } else {
          return false
        }
      }))
    }
  }

  if (me.query('[caseName]').find(el => el.getValue() === '')) {
    return Promise.resolve($App.dialogYesNo(UB.i18n(`Відмінки не внесені. Заповнити відмінки?`)).then(result => {
      if (result) {
        const surname = me.getField('lastName')
        const name = me.getField('firstName')
        const lastname = me.getField('middleName')
        let gender = me.record.get('sexType') === 'W' ? 'female' : me.record.get('sexType') === 'M' ? 'male' : null
        return HR.nameCase.getNameCase((surname.getValue() || '').trim(), (name.getValue() || '').trim(), (lastname.getValue() || '').trim(), gender).then(nc => {
          me.query('[caseName]').forEach(item => {
            const value = nc.getSurName(item.caseName) + ' ' + nc.getName(item.caseName) + ' ' + nc.getLastName(item.caseName)
            me.record.set(item.attributeName, value.trim())
            // me.attr[item.attributeName].setValue(value.trim())
          })
          return true
        })
      } else {
        return true
      }
    }))
  } else {
    return Promise.resolve(true)
  }
}
