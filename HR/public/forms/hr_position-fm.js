/* global Ext _ $App UB AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  onClose,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  beforeGridEdit,
  onBeforeSave,
  setCases,
  setFullName,
  showSalarySchemeAccruals,
  setPositionTypeProps,
  showFunds,
  calcFunds,
  calcPositionPlanSum
}

const POSITION_TYPE = {
  CIVIL_SERVANT: '1', // Держслужбовець
  OFFICIAL: '2', // Службовець
  EMPLOYEE_BY_SERVICE_FUNCTIONS: '3', // Працівник, з функцій обслуговування
  ENLISTEE: '4', // Військовослужбовець
  POLITICAL_POSITION: '5', // Політична посада
  PATRONAGE_SERVICE: '6', // Патронатна служба
  EMPLOYEE: '7', // Робітник
  TARIFF: '8', // Працівник за тарифним розрядом
  WORKER: '12' // Працівник виробництва
}

const cases = ['Nom', 'Gen', 'Dat', 'Acc', 'Or', 'Loc', 'Voc', 'Eng', 'NomF', 'GenF', 'DatF', 'AccF', 'OrF', 'LocF', 'VocF', 'EngF']

function initComponentStart () {
  const me = this
  me.isEditing = false
  me.gridConfig = {
    detailGrids: ['positionEducation', 'positionExperience', 'positionProfi', 'positionPcLiteracy',
      // 'positionDegreeLevel', 'positionAcademStatus',
      'positionFundSourceDt', 'tariffAccrualDt', 'positionAccrualDt'
    ]
  }

  me.caseAttrName = ['nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'nameEng', 'fullNameNom',
    'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'fullNameEng',
    'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF', 'nameLocF', 'nameVocF', 'nameEngF', 'fullNameNomF',
    'fullNameGenF', 'fullNameDatF', 'fullNameAccF', 'fullNameOrF', 'fullNameLocF', 'fullNameVocF', 'fullNameEngF']

  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', onAfterSave, me)
  me.on('manualsaving', manualSaving, me)

  me.allowEmptyAccrual = AC.settings.get('allowEmptyAccrualSum', appAC.globalOrganization(), null)

  me.getGridEditState = function () {
    let edit = false
    me.query('ubdetailgrid').forEach(function (grid) {
      if (grid.editingPlugin && grid.editingPlugin.editing) {
        edit = true
      }
    })
    me.query('acGrid').forEach(function (grid) {
      if (_.get(grid.down('grid'), 'editingPlugin.editing')) {
        edit = true
      }
    })
    return edit
  }
  me.on('afterrender', function () {
    if (me.externalOnAfterRender) {
      me.externalOnAfterRender(me)
    }
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid', 'docAttachment', 'acGrid'])
  createActions(me)
  const quantityPosition = AC.settings.get('quantityPosition', me.record.get('orgID'))
  if (quantityPosition) {
    me.attr.quantity.setMaxValue(quantityPosition)
  }
  me.gridConfig.detailGrids.forEach(gridName => {
    me.down(`[name=${gridName}]`).on('afterdel', function () {
      HR.orderManager.setIsDirty(me, true)
    })
  })
  me.attr.positionType.store.on('load', function () {
    me.on('controlChanged', onControlChanged, me)
  })
  me.attr.tariffAccrualDt.on('changeData', onChangeTariffData)
  // me.attr.positionAccrualDt.on('changeData', onChangeAccrualData)
  me.attr.positionFundSourceDt.on('changeData', onFundSourceGridChange)
  const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (isFundSourceAccounting !== 'STAFF') {
    const panel = me.down('[name=fundSourcePanel]')
    panel && panel.hide()
  }
  me.attr.accrualSum.on('blur', changeParams)
  me.attr.accrualSum.on('keypress', onAttrKeypress)
  me.attr.quantity.on('blur', changeParams)
  me.attr.quantity.on('keypress', onAttrKeypress)
  me.attr.dictSalarySchemeLevelID.store.ubRequest.whereList.exists = {
    expression: '',
    condition: 'subquery',
    subQueryType: 'Exists',
    value: {
      entity: 'hr_dictSalarySchemeOrg',
      fieldList: [],
      method: 'select',
      whereList: {
        cond: {
          expression: '[dictSalarySchemeID]=[{master}.dictSalarySchemeID]',
          condition: 'custom'
        },
        orgID: {
          condition: 'equal',
          expression: '[orgID]',
          value: appAC.globalOrganization()
        }
      }
    }
  }
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  if (value && ctrl.calcValue !== value) {
    ctrl.calcValue = value
    me.calcFunds(me.attr.accrualSum.getValue(), me.attr.quantity.getValue())
  }
}

function manualSaving (me, action) {
  if (action && action.length) {
    action = action[0]
  }
  me.notRefreshAfterSave = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose)
}

function beforeSave (me, params) {
  const formData = { detail: {} }
  if (me.gridConfig.detailGrids) {
    me.gridConfig.detailGrids.forEach((item) => {
      let grid = me.down(`[name=${item}]`)
      formData.detail[item] = grid.getAttributeData()
    })
    params.formData = JSON.stringify(formData)
  }
  params.isDirectCreate = me.isDirectCreate
}

async function onBeforeSave () {
  const me = this
  if (me.getGridEditState()) {
    await $App.dialogInfo(UB.i18n('Необхідно завершити редагування даних'))
    return false
  } else {
    if (me.record.get('paymentType') === 'SCHEME' && me.record.get('dictSalarySchemeLevelID')) {
      const value = me.record.get('accrualSum')
      const schemeVal = me.attr.accrualSum.schemeVal
      if (schemeVal && value < schemeVal.accrualSumMin) {
        const result = await $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Вказана сума окладу нижча за мінімально допустимий рівень окладу за вказаною схемою посадових окладів. Встановити мінімальний оклад?'))
        if (result) {
          me.record.set('accrualSum', schemeVal.accrualSumMin)
        }
        return true
      }
      if (schemeVal && value > schemeVal.accrualSumMax) {
        const result = await $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Вказана сума окладу перевищує максимально допустимий рівень окладу за вказаною схемою посадових окладів. Встановити максимальний оклад?'))
        if (result) {
          me.record.set('accrualSum', schemeVal.accrualSumMax)
        }
        return true
      }
    }
    const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
    if (isFundSourceAccounting === 'STAFF') {
      const quantityTotal = me.attr.positionFundSourceDt.getStore().data.items.reduce((sum, item) => {
        return sum + AC.currencyService.round(item.get('quantity'))
      }, 0)
      if (me.attr.positionFundSourceDt.getStore().data.items.length && AC.currencyService.round(quantityTotal) !== me.record.get('quantity')) {
        await $App.dialogError(UB.i18n('Загальна кількість посад не дорівнює кількості посад по джерелам фінансування!'))
        return false
      }
      const emptyItem = me.attr.positionFundSourceDt.getStore().data.items.find(o => !o.get('quantity'))
      if (emptyItem) {
        await $App.dialogError(UB.i18n('Не вказана кількість посад по джерелу "{0}"!', emptyItem.get('dictFundSourceID.description')))
        return false
      }
    }
    if (!me.record.get('accrualSum') && !me.allowEmptyAccrual) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Не вказано суму Окладу. Продовжити?'))
    } else {
      return true
    }
  }
}

function onAfterSave (me, data) {
  if (!me.notRefreshAfterSave) {
    me.gridConfig.detailGrids.forEach(gridName => {
      me.attr[gridName].onRefresh && me.attr[gridName].onRefresh()
    })
    me.formData = {}
    me.formData.detail = data.detail ? JSON.parse(data.detail) : []
    if (_.get(me, 'formData.detail.positionFundSourceDt.length')) {
      me.attr.positionFundSourceDt.setLocalStoreData(me.formData.detail.positionFundSourceDt)
    }
    me.loadInstance()
  }
}

function onClose () {
  const me = this
  if (me.afterClose && typeof me.afterClose === 'function') {
    me.afterClose()
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let createNewVersion = me.actions.createNewVersion
  if (!createNewVersion) {
    createNewVersion = new Ext.Action({
      actionId: 'createNewVersion',
      eventId: 'createNewVersion',
      iconCls: 'iconCreateDoc',
      text: UB.i18n('Внести зміни'),
      hidden: true,
      handler: function () {
        HR.treeUtils.newVersionPos(me.instanceID)
      },
      scope: me
    })
    me.actions.createNewVersion = createNewVersion
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  const customReadOnly = me.customSettings && me.customSettings.readOnly

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  !customReadOnly && allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    disabled: !AC.entityUtils.verifyRightsMethod('hr_position', 'accPositionEditAlways'),
    handler: function () {
      let editable = ['idxNum', 'name', 'fullName', 'dictPositionID', 'positionCategory', 'dictStaffCatID',
        'dictStaffSubCatID', 'workScheduleID', 'dictPositionKindID', 'dictPositionGroupID', 'paymentType',
        'dictSalarySchemeLevelID', 'dictCostTypeID', 'accrualSum', 'addDescrPosition', 'comment', 'nameAddition'
      ]
      if (me.record.get('positionType') === POSITION_TYPE.CIVIL_SERVANT) {
        editable = editable.concat(['dictWagePayID', 'psCategory', 'dictStatePayID', 'reformer'])
      }
      if (me.record.get('positionType') === POSITION_TYPE.TARIFF) {
        editable = editable.concat(['dictSpecialtyID', 'dictEmpCategoryID', 'dictTarifCoeffID', 'dictAcademStatusID', 'dictDegreeID'])
      }
      if (me.record.get('positionType') === POSITION_TYPE.OFFICIAL) {
        editable = editable.concat(['dictAcademStatusID', 'dictDegreeID'])
      }
      if (me.record.get('positionType') === POSITION_TYPE.WORKER) {
        editable = editable.concat(['dictSpecialtyID', 'dictEmpCategoryID', 'dictTarifCoeffID'])
      }
      if (me.record.get('positionType') === POSITION_TYPE.ENLISTEE) {
        editable = editable.concat(['dictMilitaryRankID', 'dictMilitarySpecialityID'])
      }
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      me.attr.idxNum.setDisabled(false)
      me.caseAttrName.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      me.down('[name=sexTypeCases]').setReadOnly(false)
      me.attr.positionAccrualDt.setReadOnly(false)
      me.attr.tariffAccrualDt.setReadOnly(false)
      me.attr.positionFundSourceDt.setReadOnly(false)
      me.isEditing = true
    }
  })

  allActions.menu.add({
    text: UB.i18n('Оновити відмінки'),
    name: 'actionAllowregenerateCases',
    iconCls: 'u-icon-refresh',
    handler: function () {
      me.setCases()
      me.setFullName()
    }
  })

  allActions.menu.add({
    text: UB.i18n('Оновити ФОП'),
    name: 'actionUpdateFunds',
    iconCls: 'u-icon-refresh',
    disabled: me.isNewInstance || !AC.entityUtils.verifyRightsMethod('hr_position', 'updateFunds'),
    handler: function () {
      $App.connection.run({
        entity: 'hr_position',
        method: 'updateFunds',
        positionID: me.instanceID
      }).then(() => {
        me.loadInstance()
      })
    }
  })

  allActions.menu.add({
    text: UB.i18n('Оновити Додаткову інформацію'),
    name: 'actionUpdateAddDesc',
    iconCls: 'u-icon-refresh',
    disabled: me.isNewInstance || !AC.entityUtils.verifyRightsMethod('hr_position', 'updateAddDescription'),
    handler: function () {
      $App.connection.run({
        entity: 'hr_position',
        method: 'updateAddDescription',
        positionID: me.instanceID
      }).then(() => {
        me.loadInstance()
      })
    }
  })
}

function onRecordLoaded (record, data) {
  const me = this
  const readOnly = me.record.get('state') === 'ACTIVE' || me.record.get('staffOrderID.orderState') === 'POSTED'
  if (!readOnly && me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        const control = me.getField(name)
        if (control) {
          /* control.setValueById - не встановлює значення, якщо кількість записів в комбо > store.pageSize (30) */
          control.setValue(value)
        }
        me.record.set(name, value)
      })
    }
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    const defaultPositionType = AC.settings.get('hrDefaultPositionType', appAC.globalOrganization())
    if ((!me.defaultValues || !me.defaultValues['positionType']) && defaultPositionType) {
      me.record.set('positionType', defaultPositionType)
      me.setPositionTypeProps(defaultPositionType)
    }
    if (!me.record.get('mi_data_id')) {
      me.record.set('mi_data_id', me.instanceID)
    }
    if (me.record.get('priorID')) {
      // load fund source from previous version
      UB.Repository('hr_positionFundSource')
        .attrs('dictFundSourceID', 'dictFundSourceID.description', 'quantity', 'mi_deleteDate')
        .where('positionID', '=', me.record.get('priorID'))
        .selectAsObject().then(data => {
          const store = me.attr.positionFundSourceDt.getStore()
          store.insert(store.data.length, data)
          me.attr.positionFundSourceDt.GridSummary.dataBind()
        })
    }
  }
  me.formData = {}
  me.formData.detail = data.detail ? JSON.parse(data.detail) : []
  if (_.get(me, 'formData.detail.positionFundSourceDt.length')) {
    me.attr.positionFundSourceDt.setLocalStoreData(me.formData.detail.positionFundSourceDt)
  }
  me.attr.parentUnitID.setDisabled(!record.get('staffOrderID'))
  me.method = data.method
  if (!readOnly && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'staffOrderID',
      'positionType',
      'parentUnitID',
      'quantity',
      'mi_dateFrom'
    ], 4, (form) => {
      form.afterClose = me.afterClose
    })
  }
}

function setParentUnitExtraFilterParams (filterParams, me) {
  const allowLinkToPos = AC.settings.get('hrStaffTableDisallowLinkToPos') === false
  if (!allowLinkToPos) {
    filterParams.push(['mi_unityEntity', 'in', ['hr_organization', 'hr_department']])
    if (!me.isReadOnly && me.attr.parentUnitID.getFieldValue('mi_unityEntity') === 'hr_position') {
      me.attr.parentUnitID.clearValue()
    }
  }
}

function onFormDataReady () {
  const me = this
  const customReadOnly = me.customSettings && me.customSettings.readOnly
  const orderState = me.record.get('staffOrderID.orderState')
  const readOnly = (me.record.get('state') === 'ACTIVE' || (orderState && orderState !== 'PROJECT') || customReadOnly) && !me.isDirectCreate
  me.isReadOnly = readOnly
  if (!readOnly) {
    AC.viewUtils.setFilterValue(me.attr.staffOrderID, {
      orderState: 'PROJECT'
    })
  }
  // me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orgID') || appAC.globalOrganization()
  const tabpanel = me.down('tabpanel')
  tabpanel.items.items.forEach((item, idx) => {
    if (idx !== 0) {
      item.setDisabled(me.isNewInstance)
    }
  })
  if (me.defaultValues && me.defaultValues.setFullReadOnly) {
    AC.viewUtils.setFormReadOnly(me, me.defaultValues.setFullReadOnly, [], true)
    const toolbar = me.down('toolbar')
    toolbar.items.items.forEach((item, idx) => {
      if (idx !== 0) {
        item.setDisabled(true)
      }
    })
    me.attr.positionInstructionDt.setReadOnly(true)
    me.attr.positionResp.setReadOnly(true)
    me.attr.positionPcLiteracy.setReadOnly(true)
    // me.attr.positionDegreeLevel.setReadOnly(true)
    // me.attr.positionAcademStatus.setReadOnly(true)
    me.attr.positionProfi.setReadOnly(true)
    me.attr.positionExperience.setReadOnly(true)
    me.attr.positionEducation.setReadOnly(true)
    me.attr.positionAccrualDt.setReadOnly(true)
    me.attr.tariffAccrualDt.setReadOnly(true)
    me.attr.positionHarmful.setReadOnly(true)
    me.attr.docAttachment.setReadOnly(true)
    me.attr.requestForStuff.setReadOnly(true)
    me.attr.positionFundSourceDt.setReadOnly(true)
  } else {
    AC.viewUtils.setFormReadOnly(me, readOnly, ['mi_dateFrom', 'dateToEmpty', 'staffOrderID', 'entryOrderID', 'name'])
  }
  if (readOnly && me.attr.positionType.readOnly) {
    me.attr.positionType.clearListeners()
  }
  me.attr.positionAccrualDt.setReadOnly(readOnly)
  me.attr.tariffAccrualDt.setReadOnly(readOnly)
  me.attr.positionFundSourceDt.setReadOnly(readOnly)

  if (me.record.get('staffOrderID.entryDate')) {
    const filterParams = [
      ['state', '=', 'ACTIVE', 'active'],
      ['state', '=', 'NEW', 'new'],
      ['mi_dateFrom', '<=', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
      ['mi_dateTo', '>', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
      ['staffOrderID', '=', me.record.get('staffOrderID'), 'order'],
      ['mi_data_id', '!=', me.record.get('mi_data_id')],
      ['orgID', '=', me.record.get('orgID') || appAC.globalOrganization()]
    ]
    if (me.defaultValues && me.defaultValues.rootID) {
      filterParams.push(['mi_treePath', 'like', `%/${me.defaultValues.rootID}/%`])
    } else if (me.customParams && me.customParams.rootID) {
      filterParams.push(['mi_treePath', 'like', `%/${me.customParams.rootID}/%`])
    }
    setParentUnitExtraFilterParams(filterParams, me)
    AC.viewUtils.setWhereListProperty(me.attr.parentUnitID,
      filterParams, ['([active] OR ([new] AND [order]))']
    )
  }
  controlJurisdict(me)
  me.actions.createNewVersion.setDisabled(!readOnly)
  me.storedData = {}

  me.caseAttrName.forEach(attrName => {
    me.storedData[attrName] = me.record.get(attrName)
  })
  const isStateService = me.record.get('positionType') === POSITION_TYPE.CIVIL_SERVANT

  me.attr.dictWagePayID.setDisabled(!isStateService)
  me.attr.psCategory.setDisabled(!isStateService)
  me.attr.dictStatePayID.setDisabled(!isStateService)
  me.attr.psCategory.setAllowBlank(!isStateService)
  me.attr.dictStatePayID.setAllowBlank(!isStateService)

  me.attr.accrualSum.calcValue = me.attr.accrualSum.getValue()
  me.attr.quantity.calcValue = me.attr.quantity.getValue()
  me.showFunds()

  if (me.record.get('positionType') === '1') {
    me.attr.reformer.setDisabled(false)
  }

  AC.viewUtils.setWhereListProperty(me.attr.dictSpecialtyID, [
    ['specialityType', '=', '2']
  ], undefined, [])

  AC.viewUtils.setWhereListProperty(me.attr.dictStaffSubCatID, [
    ['dictStaffCatID', 'isNull', undefined, 'dictNull'],
    ['dictStaffCatID', '=', me.record.get('dictStaffCatID') || 0, 'dictValue']
  ], ['([dictNull] OR [dictValue])'], [])

  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
    ['organizationID', '=', me.record.get('orgID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  AC.viewUtils.setWhereListProperty(me.attr.dictCostTypeID, [
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()]
  ], undefined, [])

  AC.viewUtils.setWhereListProperty(me.attr.dictStaffCatID, [
    ['usage', 'isNull', undefined, 'usageIsNull'],
    ['usage', 'in', ['1', '3'], 'usageIn']
  ], ['([usageIsNull] OR [usageIn])'], [])

  const copyNamesFromSource = AC.settings.get('hrCopyNamesFromSource', me.record.get('orgID'))
  if (me.isNewInstance && me.method === 'addnew') {
    if (!copyNamesFromSource) {
      me.setFullName()
      me.setCases()
    }
    me.calcFunds(me.attr.accrualSum.getValue(), me.attr.quantity.getValue())
  }

  if (copyNamesFromSource && !readOnly) {
    me.attr.name.setReadOnly(false)
  }

  if (me.record.get('positionType')) {
    AC.viewUtils.setWhereListProperty(me.attr.dictPositionID, [
      ['positionType', 'isNull', undefined, 'dictNull'],
      ['positionType', '=', me.record.get('positionType'), 'dictValue']
    ], ['([dictNull] OR [dictValue])'], [])
  }
  setControlsByPositionType(me, me.record.get('positionType'))
  setControlsByPaymentType(me, me.record.get('paymentType'))
  if (me.record.get('dictSalarySchemeLevelID')) {
    const onDate = appAC.globalApplicationDate() // AC.dateService.shiftDate(me.record.get('mi_dateFrom'))
    me.showSalarySchemeAccruals(me.record.get('dictSalarySchemeLevelID'), onDate)
  }
  if (me.record.get('dictTarifCoeffID') && me.record.get('paymentType') === 'TARIF') {
    showTarifAccrualSum(me, me.record.get('dictTarifCoeffID'))
  }
  if (me.record.get('dictCostTypeID')) {
    me.attr.accountDescription.setValue(me.attr.dictCostTypeID.getFieldValue('accountID.description') || '')
  }
  me.down('[name=sexTypeCases]').setReadOnly(false)
  if (me.isDirectCreate) {
    me.attr.staffOrderID.setAllowBlank(true)
    me.attr.staffOrderID.hide()
    me.attr.entryOrderID.hide()
    me.attr.mi_dateFrom.setReadOnly(false)
    me.attr.dateToEmpty.setReadOnly(false)
  }
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  if (notShowSalary) {
    me.attr.accrualSum.hide()
  }
}

function setControlsByPositionType (me, value) {
  const isGov = [POSITION_TYPE.CIVIL_SERVANT, POSITION_TYPE.POLITICAL_POSITION, POSITION_TYPE.PATRONAGE_SERVICE].includes(value)

  const attrsHide = ['dictWagePayID', 'psCategory', 'dictStatePayID', 'reformer']
  attrsHide.forEach(attrName => {
    me.attr[attrName].setVisible(isGov)
  })

  const attrsShow = ['dictSpecialtyID', 'dictEmpCategoryID', 'dictTarifCoeffID']
  attrsShow.forEach(attrName => {
    me.attr[attrName].setVisible(!isGov)
  })

  me.attr['dictAcademStatusID'].setVisible(value === POSITION_TYPE.TARIFF || value === POSITION_TYPE.OFFICIAL)
  me.attr['dictDegreeID'].setVisible(value === POSITION_TYPE.TARIFF || value === POSITION_TYPE.OFFICIAL)
  const attrsEnlistee = ['dictMilitaryRankID', 'dictMilitarySpecialityID']
  attrsEnlistee.forEach(attrName => {
    me.attr[attrName].setVisible(value === POSITION_TYPE.ENLISTEE)
  })
}

function setControlsByPaymentType (me, value) {
  me.attr.dictSalarySchemeLevelID.setVisible(value === 'SCHEME')
  me.down('[ubID=accrualLabel]').setVisible(value === 'TARIF')
  me.down('[ubID=accrualLabel1]').setVisible(value === 'SCHEME')
  me.down('[ubID=accrualLabel2]').setVisible(value === 'SCHEME')
  me.down('[ubID=accrualLabel]').setText('')
  me.down('[ubID=accrualLabel1]').setText('')
  me.down('[ubID=accrualLabel2]').setText('')
  if (!me.isReadOnly || me.isEditing) {
    if (value !== 'SCHEME') {
      me.attr.dictSalarySchemeLevelID.setValue()
    }
  }
}

function setPositionTypeProps (positionType) {
  if (!positionType) return
  const me = this
  UB.Repository('hr_positionTypeProps')
    .attrs(['dictStaffCatID', 'positionCategory', 'positionType', 'payElID', 'dictFundSourceID', 'paymentType', 'canEditPayElAccrual'])
    .where('positionType', '=', positionType)
    .selectSingle()
    .then(data => {
      if (!data) return
      me.attr.dictStaffCatID.setValueById(data.dictStaffCatID)
      me.attr.payElID.setValueById(data.payElID)
      me.attr.payElID.setReadOnly(!data.canEditPayElAccrual)
      /*
      if (!(me.customParams && me.customParams.dictFundSourceID)) {
        me.attr.dictFundSourceID.setValueById(data.dictFundSourceID)
      }
      */
      me.attr.positionCategory.setValue(data.positionCategory)
      me.attr.positionType.setValue(data.positionType)
      me.attr.paymentType.setValue(data.paymentType)
    })
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'staffOrderID':
        me.attr.mi_dateFrom.setValue(field.getFieldValue('entryDate'))
        if (value) {
          const entryDate = AC.dateService.shiftDate(field.getFieldValue('entryDate'))
          let clearValue = true
          if (me.attr.parentUnitID.getValue() &&
            ((new Date(me.attr.parentUnitID.getFieldValue('mi_dateFrom')) <= entryDate) &&
              (me.attr.parentUnitID.getFieldValue('state') === 'ACTIVE' || me.attr.parentUnitID.getFieldValue('staffOrderID') === value))
          ) {
            clearValue = false
          }

          const filterParams = [
            ['state', '=', 'ACTIVE', 'active'],
            ['state', '=', 'NEW', 'new'],
            ['mi_dateFrom', '<=', entryDate],
            ['mi_dateTo', '>', entryDate],
            ['staffOrderID', '=', value, 'order'],
            ['mi_data_id', '!=', me.record.get('mi_data_id')]
          ]
          if (me.record.get('mi_data_id') !== me.instanceID) {
            filterParams.push(['orgID', '=', me.record.get('orgID')])
          }
          if (me.defaultValues && me.defaultValues.rootID) {
            filterParams.push(['mi_treePath', 'like', `%/${me.defaultValues.rootID}/%`])
          } else if (me.customParams && me.customParams.rootID) {
            filterParams.push(['mi_treePath', 'like', `%/${me.customParams.rootID}/%`])
          }
          setParentUnitExtraFilterParams(filterParams, me)
          AC.viewUtils.setWhereListProperty(me.attr.parentUnitID,
            filterParams, ['([active] OR ([new] AND [order]))'],
            clearValue ? ['clearWhereList', 'clearValue', 'clearStore'] : []
          )
        }
        me.attr.parentUnitID.setDisabled(!value)
        break
      case 'dictPositionID':
        me.setCases()
        me.setFullName(value)
        const record = AC.gridUtils.getCurrentRecord(field)
        if (record) {
          me.attr.code.setValue(record.get('code'))
          if (record.get('positionCategory')) me.attr.positionCategory.setValue(record.get('positionCategory'))
          if (record.get('workScheduleID')) me.attr.workScheduleID.setValueById(record.get('workScheduleID'))
          if (record.get('dictCostTypeID')) me.attr.dictCostTypeID.setValueById(record.get('dictCostTypeID'))
          if (record.get('dictSalarySchemeLevelID')) me.attr.dictSalarySchemeLevelID.setValueById(record.get('dictSalarySchemeLevelID'))
          if (record.get('dictStaffCatID')) me.attr.dictStaffCatID.setValueById(record.get('dictStaffCatID'))
          if (record.get('dictStaffSubCatID')) me.attr.dictStaffSubCatID.setValueById(record.get('dictStaffSubCatID'))
          if (record.get('dictWagePayID')) me.attr.dictWagePayID.setValueById(record.get('dictWagePayID'))
          if (record.get('psCategory')) me.attr.psCategory.setValue(record.get('psCategory'))
          if (record.get('dictStatePayID')) me.attr.dictStatePayID.setValueById(record.get('dictStatePayID'))
          if ([POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(me.record.get('positionType'))) {
            if (record.get('dictSpecialtyID')) me.attr.dictSpecialtyID.setValueById(record.get('dictSpecialtyID'))
            if (record.get('dictEmpCategoryID')) me.attr.dictEmpCategoryID.setValueById(record.get('dictEmpCategoryID'))
            if (record.get('dictTarifCoeffID')) me.attr.dictTarifCoeffID.setValueById(record.get('dictTarifCoeffID'))
          }
          if ([POSITION_TYPE.TARIFF, POSITION_TYPE.OFFICIAL].includes(me.record.get('positionType'))) {
            if (record.get('dictAcademStatusID')) me.attr.dictAcademStatusID.setValueById(record.get('dictAcademStatusID'))
            if (record.get('dictDegreeID')) me.attr.dictDegreeID.setValueById(record.get('dictDegreeID'))
          }
        }
        break
      case 'fullName':
        break
      case 'parentUnitID':
        me.record.set('orgID', me.attr.parentUnitID.getFieldValue('orgID'))
        me.setCases()
        me.setFullName()
        controlJurisdict(me)
        break
      case 'positionType':
        const isStateService = value === POSITION_TYPE.CIVIL_SERVANT
        me.attr.dictWagePayID.setDisabled(!isStateService)
        me.attr.psCategory.setDisabled(!isStateService)
        me.attr.dictStatePayID.setDisabled(!isStateService)

        me.attr.psCategory.setAllowBlank(!isStateService)
        me.attr.dictStatePayID.setAllowBlank(!isStateService)

        me.attr.dictWagePayID.setValue(null)
        me.attr.psCategory.setValue(null)
        me.attr.dictStatePayID.setValue(null)

        if (isStateService) {
          me.attr.reformer.setDisabled(false)
        } else {
          me.attr.reformer.setDisabled(true)
        }

        setControlsByPositionType(me, value)
        AC.viewUtils.setWhereListProperty(me.attr.dictPositionID, [
          ['positionType', 'isNull', undefined, 'dictNull'],
          ['positionType', '=', value || 0, 'dictValue']
        ], ['([dictNull] OR [dictValue])'], [])

        me.setPositionTypeProps(value)
        break
      case 'dictEmpCategoryID':
        const dictTarifCoeffID = field.getFieldValue('dictTarifCoeffID')
        if (dictTarifCoeffID) me.attr.dictTarifCoeffID.setValueById(dictTarifCoeffID)
        break
      case 'dictStaffCatID':
        AC.viewUtils.setWhereListProperty(me.attr.dictStaffSubCatID, [
          ['dictStaffCatID', 'isNull', undefined, 'dictNull'],
          ['dictStaffCatID', '=', me.attr.dictStaffCatID.getValue() || 0, 'dictValue']
        ], ['([dictNull] OR [dictValue])'], ['clearValue', 'clearStore'])
        break
      case 'dictTarifCoeffID':
        if (value && me.attr.paymentType.getValue() === 'TARIF') {
          calcTarifAccrualSum(me, value)
          showTarifAccrualSum(me, value)
        }
        break
      case 'paymentType':
        setControlsByPaymentType(me, value)
        if (value === 'TARIF' && me.attr.dictTarifCoeffID.getValue()) {
          calcTarifAccrualSum(me, me.attr.dictTarifCoeffID.getValue())
          showTarifAccrualSum(me, me.attr.dictTarifCoeffID.getValue())
        }
        break
      case 'dictSalarySchemeLevelID':
        if (value) {
          const onDate = appAC.globalApplicationDate() // AC.dateService.shiftDate(me.attr.mi_dateFrom.getValue())
          me.showSalarySchemeAccruals(value, onDate, true)
        }
        break
      case 'dictCostTypeID':
        me.attr.accountDescription.setValue(field.getFieldValue('accountID.description') || '')
        break
    }
  }
}

function calcTarifAccrualSum (me, dictTarifCoeffID) {
  const entryDate = AC.dateService.shiftDate(me.attr.mi_dateFrom.getValue())
  const calcAccrualType = AC.settings.get('hrCalcSumPosAccrual', me.record.get('orgID') || appAC.globalOrganization()) || null
  if (calcAccrualType === 'ACCRUAL') {
    me.setLoading(true)
    me.calcPositionPlanSum({ dictTarifCoeffID, calcTariff: true }).then(data => {
      const position = data.find(o => o.ID === me.instanceID)
      if (position) {
        const store = me.attr.tariffAccrualDt.getStore()
        Ext.suspendLayouts()
        me.attr.tariffAccrualDt.suspendEvents()
        store.suspendEvents()
        me.attr.tariffAccrualDt.getStore().each(rec => {
          const payEl = position.payEl.find(o => o.ID === rec.internalId)
          if (payEl) {
            rec.set('calcSum', payEl.planSum || 0)
          }
        })
        me.attr.tariffAccrualDt.resumeEvents()
        store.resumeEvents()
        Ext.resumeLayouts(true)
        me.attr.tariffAccrualDt.getView().refreshView()
        if (me.attr.accrualSum.getValue() !== position.planAccrualSum) {
          me.attr.accrualSum.setValue(AC.currencyService.round(position.planAccrualSum))
          me.calcPositionPlanSum({ dictTarifCoeffID, accrualSum: position.planAccrualSum, calcTariff: false, calcAccruals: true })
            .then(data => {
              const position = data.find(o => o.ID === me.instanceID)
              if (position) {
                const store = me.attr.positionAccrualDt.getStore()
                Ext.suspendLayouts()
                me.attr.positionAccrualDt.suspendEvents()
                store.suspendEvents()
                me.attr.positionAccrualDt.getStore().each(rec => {
                  const payEl = position.payEl.find(o => o.ID === rec.internalId)
                  if (payEl) {
                    rec.set('calcSum', payEl.planSum || 0)
                  }
                })
                me.attr.positionAccrualDt.resumeEvents()
                store.resumeEvents()
                Ext.resumeLayouts(true)
                me.attr.positionAccrualDt.getView().refreshView()
              }
            })
        }
      }
      me.setLoading(false)
    }, err => {
      me.setLoading(false)
      throw err
    })
  } else {
    const dictTarifCoeffList = [dictTarifCoeffID]
    me.attr.tariffAccrualDt.getStore().each(rec => {
      if (rec.get('payElID.dictTarifCoeffID')) {
        dictTarifCoeffList.push(rec.get('payElID.dictTarifCoeffID'))
      }
    })
    UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['dictTarifCoeffID', 'accrualSum'])
      .where('dictTarifCoeffID', 'in', dictTarifCoeffList)
      .where('dateFrom', '<=', entryDate)
      .where('dateTo', '>=', entryDate)
      .where('ID', '!=', AC.dataService.getUniqueInt())
      .selectAsObject().then(data => {
        const row = data.find(o => o['dictTarifCoeffID'] === dictTarifCoeffID)
        const accrualTarifSum = row ? (row.accrualSum || 0) : 0
        let addSum = 0
        const store = me.attr.tariffAccrualDt.getStore()
        Ext.suspendLayouts()
        me.attr.tariffAccrualDt.suspendEvents()
        store.suspendEvents()
        me.attr.tariffAccrualDt.getStore().each(rec => {
          let row = null
          if (rec.get('payElID.dictTarifCoeffID')) {
            row = data.find(o => o['dictTarifCoeffID'] === rec.get('payElID.dictTarifCoeffID'))
          } else {
            row = data.find(o => o['dictTarifCoeffID'] === dictTarifCoeffID)
          }
          let accrualSum = row ? (row.accrualSum || 0) : 0
          const calcSum = rec.get('accrualSum') || AC.currencyService.round(accrualSum * rec.get('accrualRate') / 100) || 0
          rec.set('calcSum', calcSum || 0)
          addSum += calcSum
        })
        me.attr.tariffAccrualDt.resumeEvents()
        store.resumeEvents()
        Ext.resumeLayouts(true)
        me.attr.tariffAccrualDt.getView().refreshView()
        me.attr.accrualSum.setValue(AC.currencyService.round(accrualTarifSum + addSum))
      }, err => {
        me.setLoading(false)
        throw err
      })
  }
}

function showTarifAccrualSum (me, dictTarifCoeffID) {
  const entryDate = AC.dateService.shiftDate(me.attr.mi_dateFrom.getValue())
  UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['accrualSum'])
    .where('dictTarifCoeffID', '=', dictTarifCoeffID)
    .where('dateFrom', '<=', entryDate)
    .where('dateTo', '>=', entryDate)
    .where('ID', '!=', AC.dataService.getUniqueInt())
    .selectSingle().then(data => {
      if (data && data.accrualSum) {
        const labelText = UB.i18n('Сума тарифного окладу: {0}', AC.currencyService.formatAsCurrencyEx(data.accrualSum))
        me.down('[ubID=accrualLabel]').setText(labelText)
      }
    })
}

function showSalarySchemeAccruals (dictSalarySchemeLevelID, onDate, autoSetAccrual) {
  const me = this
  me.setLoading(true)
  UB.Repository('hr_dictSalarySchemeDet')
    .attrs(['accrualSum', 'accrualSumMin', 'accrualSumMax', 'accrualSumAvg'])
    .where('dictSalarySchemeLevelID', '=', dictSalarySchemeLevelID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle().then(det => {
      if (det) {
        const labelText = UB.i18n('Сума окладу (мін): {0}, Сума окладу (макс): {1}', AC.currencyService.formatAsCurrencyEx(det.accrualSumMin), AC.currencyService.formatAsCurrencyEx(det.accrualSumMax))
        me.down('[ubID=accrualLabel1]').setText(labelText)
        const labelText2 = UB.i18n('Сума середня: {0}, Сума рекомендована: {1}', AC.currencyService.formatAsCurrencyEx(det.accrualSumAvg), AC.currencyService.formatAsCurrencyEx(det.accrualSum))
        me.down('[ubID=accrualLabel2]').setText(labelText2)
        me.attr.accrualSum.schemeVal = det
        if (autoSetAccrual && AC.settings.get('hrAutoSetAccrualByScheme', appAC.globalOrganization())) {
          me.attr.accrualSum.setValue(det.accrualSum)
          me.calcFunds(me.attr.accrualSum.getValue(), me.attr.quantity.getValue())
        }
      }
    }).finally(() => {
      me.setLoading(false)
    })
}

function setFullName (dictPositionID) {
  const me = this
  if (!me.record.get('parentUnitID')) {
    return
  }
  if (!dictPositionID) dictPositionID = me.record.get('dictPositionID') || null
  const name = me.attr.dictPositionID.getFieldValue('nameNom') || me.attr.dictPositionID.getFieldValue('name')
  $App.connection.run({
    entity: 'hr_position',
    method: 'getFullName',
    ID: me.isNewInstance ? null : me.instanceID,
    dictPositionID: dictPositionID,
    orgID: me.record.get('orgID'),
    onDate: me.record.get('state') === 'NEW' ? AC.dateService.shiftDate(me.attr.mi_dateFrom.getValue()) : appAC.globalApplicationDate(),
    staffOrderID: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID') : null,
    parentUnitID: me.record.get('parentUnitID'),
    nameAddition: me.record.get('nameAddition')
  }).then(mParams => {
    const fullName = mParams.fullName || name || ''
    me.record.set('fullName', capitalize(fullName.substr(0, me.attr.fullName.maxLength)))
  })
}

function setCases () {
  const me = this
  if (!me.attr.dictPositionID.getValue() || !me.attr.parentUnitID.getValue()) {
    return
  }
  $App.connection.run({
    entity: 'hr_position',
    method: 'getNameCases',
    dictPositionID: me.attr.dictPositionID.getValue(),
    orgID: me.record.get('orgID'),
    onDate: me.record.get('state') === 'NEW' ? AC.dateService.shiftDate(me.attr.mi_dateFrom.getValue()) : appAC.globalApplicationDate(),
    staffOrderID: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID') : null,
    parentUnitID: me.record.get('parentUnitID'),
    nameAddition: me.record.get('nameAddition')
  }).then(mParams => {
    const nameCases = JSON.parse(mParams.nameCases) || {}
    cases.forEach(_case => {
      me.record.set('fullName' + _case, nameCases['fullName' + _case].substr(0, me.attr['fullName' + _case].maxLength))
      me.record.set('name' + _case, nameCases['name' + _case].substr(0, me.attr['name' + _case].maxLength))
    })
  })
  let nameAddition = me.record.get('nameAddition') || ''
  if (nameAddition) {
    nameAddition = ' ' + nameAddition
  }
  me.record.set('name', capitalize(me.attr.dictPositionID.getFieldValue('nameNom') || me.attr.dictPositionID.getFieldValue('name')) + nameAddition)
}

function controlJurisdict (me) {
  if (me.attr.parentUnitID.getFieldValue('mi_treePath')) {
    UB.Repository('hr_organization')
      .attrs('jurisdiction')
      .where('mi_data_id', 'in', _.compact(me.attr.parentUnitID.getFieldValue('mi_treePath').split('/')).map(o => Number(o)))
      .where('jurisdiction', 'isNotNull')
      .where('state', '=', 'ACTIVE', 'active')
      .where('state', '=', 'NEW', 'new')
      .where('staffOrderID', '=', me.attr.staffOrderID.getValue(), 'order')
      .logic('([active] OR ([new] AND [order]))')
      .misc({
        __mip_ondate: AC.dateService.shiftDate(me.attr.staffOrderID.getFieldValue('entryDate'))
      })
      .orderBy('mi_treePath', 'desc')
      .orderBy('ID', 'desc')
      .selectSingle()
      .then(orgJurisdiction => {
        if (orgJurisdiction) {
          AC.viewUtils.setWhereListProperty(me.attr.dictWagePayID, [
            ['jurisdiction', '=', orgJurisdiction.jurisdiction]
          ], undefined, [])
        }
      })
  }
}

async function calcPositionPlanSum ({ context, payElID, typeSum, value, calcAccruals, calcTariff, accrualSum, dictTarifCoeffID }) {
  const me = this
  const allRecord = me.attr.positionAccrualDt.getStore().data
  const allRecordTariff = me.attr.tariffAccrualDt.getStore().data
  if (!accrualSum) {
    accrualSum = await UB.Repository('hr_dictTarifCoeffDet')
      .attrs(['accrualSum'])
      .where('dictTarifCoeffID', '=', dictTarifCoeffID || me.record.get('dictTarifCoeffID'))
      .where('dateFrom', '<=', me.record.get('mi_dateFrom'))
      .where('dateTo', '>=', me.record.get('mi_dateFrom'))
      .selectScalar()
  }
  const params = {
    onDate: appAC.globalApplicationDate(),
    orgID: me.record.get('orgID'),
    positionIDs: [me.instanceID],
    positionAccrualData: [],
    positionData: [{
      ID: me.instanceID,
      mi_data_id: me.record.get('mi_data_id'),
      payElID: me.record.get('payElID'),
      accrualSum: accrualSum || me.record.get('accrualSum'),
      dictTarifCoeffID: dictTarifCoeffID || me.record.get('dictTarifCoeffID'),
      mi_dateFrom: me.record.get('mi_dateFrom')
    }]
  }
  if (calcAccruals) {
    allRecord.items.forEach(rec => {
      const data = rec.getData()
      params.positionAccrualData.push({
        ID: rec.internalId,
        positionID: me.instanceID,
        payElID: context ? (rec.internalId === context.record.internalId ? payElID : data.payElID) : data.payElID,
        accrualSum: (context ? (rec.internalId === context.record.internalId ? (typeSum === 'sum' ? (value || 0) : 0) : data.accrualSum) : data.accrualSum) || 0,
        accrualRate: (context ? (rec.internalId === context.record.internalId ? (typeSum === 'rate' ? (value || 0) : 0) : data.accrualRate) : data.accrualRate) || 0
      })
    })
  }
  if (calcTariff) {
    allRecordTariff.items.forEach(rec => {
      const data = rec.getData()
      params.positionAccrualData.push({
        ID: rec.internalId,
        positionID: me.instanceID,
        payElID: context ? (rec.internalId === context.record.internalId ? payElID : data.payElID) : data.payElID,
        accrualSum: (context ? (rec.internalId === context.record.internalId ? (typeSum === 'sum' ? (value || 0) : 0) : data.accrualSum) : data.accrualSum) || 0,
        accrualRate: (context ? (rec.internalId === context.record.internalId ? (typeSum === 'rate' ? (value || 0) : 0) : data.accrualRate) : data.accrualRate) || 0
      })
    })
  }
  const response = await $App.connection.run({
    entity: 'hr_position',
    method: 'getPlanSumByPosition',
    params: JSON.stringify(params)
  })
  return response.resultData ? JSON.parse(response.resultData) : []
}

function setPlanSumRecord (me, context, gridName, payElID, typeSum, value, calcSumCtrl, methodCode, dictTarifCoeffID) {
  const calcAccrualType = AC.settings.get('hrCalcSumPosAccrual', me.record.get('orgID') || appAC.globalOrganization()) || null
  if (payElID) {
    me.setLoading(true)
    if (calcAccrualType === 'ACCRUAL') {
      me.attr[gridName].calcProc = true
      me.calcPositionPlanSum({ context, payElID, typeSum, value, calcAccruals: true, calcTariff: true }).then(data => {
        const position = data.find(o => o.ID === me.instanceID)
        if (position) {
          const payEl = position.payEl.find(o => o.ID === context.record.internalId)
          if (payEl) {
            calcSumCtrl.setValue(payEl.planSum || 0)
          }
        }
        me.setLoading(false)
        me.attr[gridName].calcProc = false
      }, function (err) {
        me.setLoading(false)
        me.attr[gridName].calcProc = false
        throw err
      })
    } else {
      if (methodCode === '144' && typeSum === 'rate') {
        me.attr[gridName].calcProc = true
        UB.Repository('hr_dictTarifCoeffDet')
          .attrs(['accrualSum'])
          .where('dictTarifCoeffID', '=', dictTarifCoeffID || me.record.get('dictTarifCoeffID') || 0)
          .where('dateFrom', '<=', appAC.globalApplicationDate())
          .where('dateTo', '>=', appAC.globalApplicationDate())
          .selectScalar().then(accrualSum => {
            calcSumCtrl.setValue(((accrualSum || 0) * (value || 0) / 100) || null)
            me.setLoading(false)
            me.attr[gridName].calcProc = false
          })
      } else {
        calcSumCtrl.setValue(typeSum === 'sum' ? value : ((me.record.get('accrualSum') || 0) * (value || 0) / 100 || null))
        me.setLoading(false)
      }
    }
  }
}

function beforeGridEdit (rowEditor, context, gridName) {
  let editor = rowEditor.editor
  let me = this
  AC.viewUtils.setWhereListProperty(editor.query(`[name=payElID.description]`)[0], [
    ['methodID.methodGroupID.code', 'notEqual', 1]
  ])

  if (context.record.get('positionID') === null) {
    context.record.set('positionID', me.record.get('ID'))
  }
  if (context.record.get('staffOrderID') === null) {
    if (me.record.get('state') === 'NEW') context.record.set('staffOrderID', me.record.get('staffOrderID'))
    context.record.set('dateFromEmpty', me.record.get('mi_dateFrom'))
    context.record.set('dateToEmpty', me.record.get('dateToEmpty'))
  }
  const accrualSumCtrl = editor.query(`[name=accrualSum]`)[0]
  const accrualRateCtrl = editor.query(`[name=accrualRate]`)[0]
  const calcSumCtrl = editor.query(`[name=calcSum]`)[0]
  const payElCtrl = editor.query(`[name=payElID.description]`)[0]
  if (typeof accrualSumCtrl.events.blur.clearListeners === 'function') {
    accrualSumCtrl.events.blur.clearListeners()
  }
  if (typeof accrualRateCtrl.events.blur.clearListeners === 'function') {
    accrualRateCtrl.events.blur.clearListeners()
  }
  payElCtrl.on('change', (ctrl) => {
    if (ctrl.skipChange) {
      delete ctrl.skipChange
      return
    }
    const methodCode = payElCtrl.getFieldValue('methodID.code')
    const dictTarifCoeffID = methodCode === '144' ? ctrl.getFieldValue('dictTarifCoeffID') : null
    setPlanSumRecord(me, context, gridName, payElCtrl.getFieldValue('ID'), accrualRateCtrl.getValue() ? 'rate' : 'sum', accrualRateCtrl.getValue() || calcSumCtrl.getValue(), calcSumCtrl, methodCode, dictTarifCoeffID)
    context.record.set('payElID.methodID.code', ctrl.getFieldValue('methodID.code'))
    context.record.set('payElID.dictTarifCoeffID', ctrl.getFieldValue('dictTarifCoeffID'))
  })
  accrualSumCtrl.on('change', (ctrl, value) => {
    if (ctrl.skipChange) {
      delete ctrl.skipChange
      return
    }
    const methodCode = payElCtrl.getFieldValue('methodID.code')
    const dictTarifCoeffID = methodCode === '144' ? context.record.get('payElID.dictTarifCoeffID') : null
    setPlanSumRecord(me, context, gridName, payElCtrl.getFieldValue('ID'), 'sum', value, calcSumCtrl, methodCode, dictTarifCoeffID)
    accrualRateCtrl.skipChange = true
    accrualRateCtrl.setValue()
  })
  accrualRateCtrl.on('change', (ctrl, value) => {
    if (ctrl.skipChange) {
      delete ctrl.skipChange
      return
    }
    const methodCode = payElCtrl.getFieldValue('methodID.code')
    const dictTarifCoeffID = methodCode === '144' ? context.record.get('payElID.dictTarifCoeffID') : null
    setPlanSumRecord(me, context, gridName, payElCtrl.getFieldValue('ID'), 'rate', value, calcSumCtrl, methodCode, dictTarifCoeffID)
    accrualSumCtrl.skipChange = true
    accrualSumCtrl.setValue()
  })
  accrualSumCtrl.on('blur', (ctrl) => {
    if (ctrl.getValue()) {
      accrualRateCtrl.setValue()
    }
    delete accrualRateCtrl.skipChange
  })
  accrualRateCtrl.on('blur', (ctrl) => {
    if (ctrl.getValue()) {
      accrualSumCtrl.setValue()
    }
    delete accrualSumCtrl.skipChange
  })
  return true
}

function onChangeTariffData (grid) {
  const me = grid.up('form')
  if (me.attr.paymentType.getValue() === 'TARIF' && me.record.get('dictTarifCoeffID')) {
    calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'))
  }
}

/*
function onChangeAccrualData (grid) {
  const me = grid.up('form')
  me.calcFunds(me.attr.accrualSum.getValue(), me.attr.quantity.getValue())
}
*/

function capitalize (str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.substr(1) : str
}

function onFundSourceGridChange (grid) {
  const me = grid.up('form')
  const quantityTotal = grid.getStore().data.items.reduce((sum, item) => {
    return sum + AC.currencyService.round(item.get('quantity'))
  }, 0)
  if (grid.getStore().data.items.length) {
    me.record.set('quantity', AC.currencyService.round(quantityTotal))
    me.calcFunds(me.attr.accrualSum.getValue(), quantityTotal)
  }
  me.record.set('isSecondaryChanges', 0)
  HR.orderManager.setIsDirty(me, true)
}

function showFunds (funds = {}) {
  const me = this
  const fundAttrList = ['fundBasePay', 'fundAddPay', 'fundOtherPay', 'fundTotal']
  fundAttrList.forEach(fname => {
    const el = me.down(`[name=${fname}]`)
    el && el.setText(AC.currencyService.formatAsCurrencyEx(funds[fname] || me.record.get(fname) || 0))
  })
}

function calcFunds (accrualSum, quantity) {
  const me = this
  $App.connection.run({
    method: 'calcFunds',
    entity: 'hr_position',
    positionID: me.instanceID,
    orgID: me.record.get('orgID'),
    accrualSum,
    quantity
  }).then(mParams => {
    if (mParams.resultData) {
      const result = JSON.parse(mParams.resultData) || {}
      me.showFunds({
        fundBasePay: result.fundBase,
        fundAddPay: result.fundAdd,
        fundOtherPay: result.fundOther,
        fundTotal: result.fundAll
      })
    }
  })
}
