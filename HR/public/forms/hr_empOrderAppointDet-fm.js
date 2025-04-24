/* global appAC AC UB $App HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  onBeforeClose,
  getNextTabNum,
  manageRankControls,
  fillOrderExperience,
  doSaveForm,
  setupPosLiq,
  setNextRank,
  filterVacPositionID,
  recalcCalcDate,
  setControlsByWorkPlace,
  setControlsForAppointHours,
  setPaymentControls,
  onChangeEmpAccData
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

function recalcCalcDate ({ record, years, months, days, calcDate, totalDays }) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  const calcMethod = AC.settings.get('hrCalcExperienceMethod', appAC.globalOrganization())
  me.isInnerChange = true
  try {
    if (calcMethod === 'SIMPLE') {
      const dayCount = AC.dateService.ymdToDays({ years, months, days })
      let calcDateVal = AC.dateService.addDays(me.getField('dateFrom').getValue(), -1 * dayCount)
      totalDays && totalDays.setValue(dayCount)
      calcDate.setValue(calcDateVal)
    } else {
      const onDate = AC.dateService.addDays(me.getField('dateFrom').getValue(), -1 * (!years && !months && !days ? 0 : 1))
      let calcDateVal = AC.dateService.getCalcDate(years, months, days, onDate, true)
      calcDate.setValue(calcDateVal)
      totalDays && totalDays.setValue(calcDateVal.getTime() === onDate.getTime() ? 0 : AC.dateService.dayDiff(calcDateVal, onDate))
    }
  } finally {
    me.isInnerChange = false
  }
}

function initComponentStart () {
  const me = this

  me.gridConfig = {
    detailGrids: ['positionFundSourceDt']
  }

  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('onBeforeSave', onBeforeSave, me)
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', onAfterSave, me)
  me.on('beforeClose', me.onBeforeClose)
}

function initComponentDone () {
  const me = this

  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else if (me.sender) {
    me.orderForm = me.sender.up('form')
  } else {
    me.isReadOnly = true
  }

  AC.viewUtils.setAttr(me, ['acGrid'])
  me.curRankCode = null

  me.attr.vacPositionID.getStore().on('load', store => {
    if (store.getCount() > 0) {
      me.attr.vacPositionID.show()
    } else {
      me.attr.vacPositionID.setValueById()
      me.attr.vacPositionID.hide()
    }
  })
  me.down('[name=hr_empOrderAcc]').on('changeData', onChangeEmpAccData)
  let tb = me.down('[name=hr_empOrderExperience]').down('toolbar')
  tb.insert(tb.items.length - 2, {
    xtype: 'button',
    scale: 'medium',
    iconCls: 'fas fa-info-circle',
    cls: 'blue-action',
    actionId: 'reversalActionBtn',
    tooltip: UB.i18n('Інформація'),
    handler: function (btn) {
      const msgs = [
        UB.i18n('На формі наказу потрібно внести стажі, які потребують відображення в згенерованому тексті наказу.'),
        '',
        UB.i18n('При додаванні в наказ стажів з картки особи (кнопка "Додати з даних особи"), вони будуть автоматично перераховані станом на дату призначення.'),
        '',
        UB.i18n('Внесені у наказі стажі будуть автоматично перенесені на картку працівника на сторінку "Стажі" при проведенні наказу.'),
        '',
        `<span class="field-label-red">${UB.i18n('Увага!')}</span>`,
        '',
        UB.i18n('Внесені в наказі стажі у картці працівника відображаються на сторінці "Стажі" чорним кольором.'),
        UB.i18n('Синім кольором на сторінці "Стажі" картки працівника будуть відображені пропоновані системою стажі, які налаштовані для подальшого автоматичного нарахування стажів по посаді такого типу.')
      ]
      $App.dialogInfo(msgs.join('<br/>'), '')
    }
  })
  const useSingleTabNum = AC.settings.get('hrUseSingleEmployeeTabNum', appAC.globalOrganization())
  if (useSingleTabNum) {
    me.attr.tabNum.vtype = 'tabNumExtraValidator'
  }
  me.attr.positionFundSourceDt.on('changeData', onFundSourceGridChange)
  me.isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (!me.isFundSourceAccounting || me.isFundSourceAccounting === 'WITHOUT') {
    const panel = me.down('[name=fundSourcePanel]')
    panel && panel.hide()
  }
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
  me.allowSelectDictPosition = AC.settings.get('hrOrderAllowSelectDictPosition', appAC.globalOrganization())

  createActions(me)
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    handler: function () {
      let editable = ['dictAppointKindID']
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
    }
  })
}

function onRecordLoaded (record, data) {
  const me = this
  me.masterForm = me.customParams.orderForm
    ? me.customParams.orderForm
    : (me.sender ? me.sender.up('form') : null)

  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('isRankSave', true)
    me.record.set('empOrderType', me.masterForm.record.get('empOrderType'))
    const hrDefaultCategoryECBID = AC.settings.get('hrDefaultCategoryECBID')
    if (hrDefaultCategoryECBID) {
      me.record.set('dictCategoryECBID', hrDefaultCategoryECBID)
      me.getField('dictCategoryECBID').setValueById(hrDefaultCategoryECBID)
    }
    if (me.customParams.empOrderType === 'APPOINT_OUTSTAFF') {
      me.record.set('isOutStaff', 1)
      me.record.set('workPlace', '4')
    }
    if (me.customParams.empOrderType === 'APPOINT_HOUR') {
      me.record.set('mtCount', 0)
      me.record.set('notStoreInWorkBook', 1)
      me.record.set('isByHours', 1)
      me.record.set('contractType', '3')
      const defWorkScheduleID = AC.settings.get('hrOrderHourDefWorkSchedule', me.record.get('organizationID') || appAC.globalOrganization())
      me.record.set('workScheduleID', defWorkScheduleID)
    }
  }
  if (me.record.get('isByHours')) {
    const tabs = me.down('[xtype=tabpanel]')
    tabs && tabs.down('[name=empOrderExperienceAcrrualTab]').tab.hide()
    tabs && tabs.down('[name=empOrderVacationPlanGrid]').tab.hide()
  }
  me.filterVacPositionID(true)
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonDismID',
      {
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
  me.orderForm && me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  if (!me.isNewInstance) {
    HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'))
  }
  if (me.record.data['positionID.dictPositionID.isVehicle']) {
    me.attr.dictVehicleID.show()
    me.attr.addOrderText.show()
  } else {
    me.attr.dictVehicleID.hide()
    me.attr.addOrderText.hide()
  }
}

async function onFormDataReady () {
  const me = this
  const organizationID = me.record.get('organizationID')
  const masterOrganizationID = me.masterForm.record.get('masterOrganizationID')
  me.attr.employeeID.getStore().ubRequest.whereList.exist.value.whereList.orgID = {
    condition: 'in',
    expression: '[organizationID]',
    value: [organizationID, masterOrganizationID]
  }

  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
    ['organizationID', '=', organizationID, 'org'],
    ['organizationID', 'isNull', null, 'orgNull'],
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()]
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  const isReadOnly = !me.masterForm || !(me.masterForm.isEditable && me.masterForm.isEditable()) || me.isReadOnly
  if (isReadOnly) {
    me.down('[ubID=btnSelectByTree]').setDisabled(true)
    const empOrderExperienceGrid = me.down('[name=hr_empOrderExperience]')
    empOrderExperienceGrid && AC.gridUtils.enableCustomAction(empOrderExperienceGrid, 'fillFromExperience', false)
    const empOrderAccGrid = me.down('[name=hr_empOrderAcc]')
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillFromStaff', false)
    me.down('[name=dateToHour]').setReadOnly(true)
    me.attr.positionFundSourceDt.setReadOnly(true)
    me.down('[name=reasonButton]').setVisible(false)
  }
  HR.orderManager.enableControls({ me: me, isEnabled: !isReadOnly })

  me.down('[name=generateTabNumButton]').setDisabled(isReadOnly)
  me.query('[xtype=ubdetailgrid]').forEach(item => {
    item.setReadOnly(isReadOnly)
  })
  if (!me.masterForm) {
    me.down('[xtype=tabpanel]').items.items[1].tab.hide()
  }

  let srcOrganizationName = me.down('[name=srcOrganizationName]')
  HR.orderManager.disableContextMenuItems(srcOrganizationName, ['editItem', 'addItem'])
  if (me.isNewInstance) {
    me.attr.dictRankID.hide()
    me.attr.isRankSave.hide()
    me.attr.isRankAssign.hide()
    me.attr.isTransfer.hide()
    me.down('[ubID=factPositionBlock]').hide()
    me.getNextTabNum()
  } else {
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    if (notShowSalary) {
      me.attr.accrualSum.hide()
    }
    const isTrialPeriod = !!me.record.get('isTrialPeriod')
    me.attr.dictTrialPeriodID.setDisabled(!isTrialPeriod)
    me.attr.dictTrialPeriodID.setAllowBlank(!isTrialPeriod)
    me.attr.dateTrialEnd.setDisabled(!isTrialPeriod)
    me.attr.dateTrialEnd.setAllowBlank(!isTrialPeriod)

    const positionType = me.attr.positionID.getFieldValue('positionType')
    const isCivilServatesPositionType = positionType === POSITION_TYPE.CIVIL_SERVANT
    const isTariff = !me.record.get('isByHours') && positionType === POSITION_TYPE.TARIFF
    const showFactPos = !me.record.get('isByHours') && [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

    me.attr.dictRankID[['hide', 'show'][+(isCivilServatesPositionType)]]()
    me.attr.isRankSave[['hide', 'show'][+(isCivilServatesPositionType)]]()
    me.attr.isRankAssign[['hide', 'show'][+(isCivilServatesPositionType)]]()
    me.attr.isTransfer[['hide', 'show'][+(isCivilServatesPositionType)]]()

    me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()

    me.attr.dateToEmpty[['hide', 'show'][+(me.record.get('dictContractKindID.isTerm'))]]()

    const isTransfer = me.record.get('isTransfer')
    if (!isReadOnly) {
      me.down('[name=srcOrganizationName]').setDisabled(!(isTransfer && isCivilServatesPositionType))
    } else {
      me.down('[name=srcOrganizationName]').setReadOnly(true)
    }

    AC.viewUtils.setWhereListProperty(me.attr.positionID, [
      ['mi_treePath', 'startWith', me.record.get('departmentID.mi_treePath') || '%'],
      ['orgID', '=', me.record.get('organizationID')]
    ], null, [])
  }

  if (AC.settings.get('hrEmpOrderNotNullAppointKind', appAC.globalOrganization())) {
    me.attr.dictAppointKindID.setAllowBlank(false)
  } else if (me.attr.isTransfer.getValue()) {
    me.attr.dictAppointKindID.setAllowBlank(false)
  }

  if (!isReadOnly) {
    me.attr.dictRankID.setReadOnly(!me.attr.isRankAssign.getValue())
  }
  me.setupPosLiq()
  if (!me.isNewInstance && !me.curRankCode && me.masterForm) {
    let onDate = me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')
    onDate && $App.connection.run({
      entity: 'hr_employee',
      method: 'getNextPublServRang',
      onDate: new Date(onDate),
      employeeID: me.record.get('employeeID')
    }).then(mParams => {
      me.curRankCode = parseInt(mParams.curRankCode) || null
    })
  }
  const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
  if (funcOrgType === '2') {
    me.attr.dictCostTypeID.hide()
  }
  const isAppointMove = me.record.get('empOrderType') === 'APPOINT_MOVE'
  me.down('[ubID=appointMoveBlock]').setVisible(isAppointMove)
  me.attr.isMove.setVisible(isAppointMove)
  me.attr.isAppoint.setVisible(isAppointMove)
  me.attr.dateStartWork.setVisible(isAppointMove)
  me.attr.appointmentOrderDate.setVisible(isAppointMove)
  me.attr.appointmentOrderNumber.setVisible(isAppointMove)
  me.attr.dateStartWork.setDisabled(me.record.get('isAppoint'))
  me.attr.appointmentOrderDate.setDisabled(me.record.get('isAppoint'))
  me.attr.appointmentOrderNumber.setDisabled(me.record.get('isAppoint'))
  me.attr.positionID.setAllowBlank(false)
  me.setControlsByWorkPlace(me.attr.workPlace.getValue())
  const empOrderType = (me.customParams.empOrderType === 'APPOINT_HOUR' || me.record.get('isByHours')) ? 'APPOINT_HOUR' : me.record.get('empOrderType')
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(empOrderType, me.record.get('organizationID'))
  me.setControlsForAppointHours()
  me.setPaymentControls()
  if (me.record.get('dictTarifCoeffID') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
    me.down('[ubID=accrualLabel]').show()
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'), true)
  }
  if (me.attr.dictFundSourceID.store) {
    me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
    me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
  }
  me.fireEvent('formDataReadyFinished')
}

function setupPosLiq () {
  const me = this
  const empOrderType = me.record.get('empOrderType')
  if (empOrderType !== 'APPOINT_LIQ') {
    return
  }
  const posCtrl = me.getField('positionID')
  posCtrl.setReadOnly(true)
  if (me.isSetupPosLiq) {
    return
  }
  me.isSetupPosLiq = true
  me.setTitle(UB.i18n('Наказ про призначення на ліквідовану посаду'))
  me.getField('departmentID').setDisabled(true)
  const btnSelectByTree = me.down('[ubID=btnSelectByTree]')
  btnSelectByTree.setTooltip(UB.i18n('Створення ліквідованої посади'))
  btnSelectByTree.suspendEvents()

  btnSelectByTree.handler = () => {
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'hr_position',
      entity: 'hr_position',
      instanceID: me.record.get('positionID'),
      cmpInitConfig: {
        externalOnAfterRender: form => {
          const staffOrderCtrl = form.getField('staffOrderID')
          delete staffOrderCtrl.getStore().ubRequest.whereList
          staffOrderCtrl.setAllowBlank(true)
          form.getField('name').setReadOnly(false)
          form.getField('mi_dateFrom').setReadOnly(false)
          form.getField('dateToEmpty').setReadOnly(false)
          form.getField('parentUnitID').setReadOnly(true)
          form.on('formDataReady', () => {
            if (form.isNewInstance) {
              form.record.set('mi_dateFrom', AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom')))
              staffOrderCtrl.setValueById(me.record.get('orderID'))
              form.record.set('state', 'LIQ')
              form.getField('parentUnitID').setValueById(me.record.get('organizationID'))
            }
          })
          form.on('beforeClose', () => {
            UB.Repository('hr_position')
              .attrs('ID', 'name')
              .misc({
                __mip_recordhistory_all: true
              })
              .selectById(form.instanceID).then(rec => {
                if (rec) {
                  posCtrl.setRawValue(req.name)
                  posCtrl.setValue()
                  posCtrl.setValueById(rec.ID)
                  me.record.set('positionID', rec.ID)
                } else {
                  posCtrl.setValue()
                }
                // me.loadInstance()
              })
          })
        }
      }
    })
  }
  const store = posCtrl.getStore()
  const req = store.ubRequest
  req.__mip_recordhistory_all = true
  delete req.whereList
  const el = posCtrl.inputEl
  posCtrl.getStore().load().then(() => {
    el.removeCls('ub-combo-deleted')
  })
}

function onChangeEmpAccData (grid, event) {
  const me = grid.up('form')
  if (!me.record.get('isByHours') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'))
  }
}

function getEmployeeRank (me, employeeID) {
  UB.Repository('hr_publServRang')
    .attrs(['dictRankID', 'dictRankID.code'])
    .orderBy('dictRankID.codeAsNumber')
    .where('employeeID', '=', employeeID || null)
    .where('dictRankID.mi_deleteDate', '>=', '#maxdate').limit(1)
    .selectSingle()
    .then(data => {
      const dictRankID = (data && data.dictRankID) ? data.dictRankID : null
      me.attr.dictRankID.setValueById(dictRankID)
    })
}

function getEmployeeTarifCoeff (me, employeeID, onDate) {
  const positionType = me.attr.positionID.getFieldValue('positionType')
  const positionID = me.attr.positionID.getValue()
  if ([POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)) {
    UB.Repository('hr_empTarifCategory')
      .attrs(['dictTarifCoeffID'])
      .where('employeeID', '=', employeeID || null)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle().then(data => {
        if (data && data.dictTarifCoeffID) {
          me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
        } else if (positionID) {
          UB.Repository('hr_position')
            .attrs(['dictTarifCoeffID'])
            .where('ID', '=', positionID)
            .selectSingle().then(data => {
              if (data && data.dictTarifCoeffID) {
                me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
              }
            })
        }
      })
  }
}

async function setEmployeePositionName (me, employeeID) {
  if (me.customParams.empOrderType === 'APPOINT_HOUR' || me.record.get('isByHours')) {
    if (!employeeID) {
      me.attr.empPositionName.setValue()
      return
    }
    const onDate = me.attr.dateFrom.getValue() || appAC.globalApplicationDate()
    const empPosID = await UB.Repository('hr_employeePositionS')
      .attrs('positionID')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', me.record.get('organizationID'))
      .where('workPlace', 'in', ['1', '3'])
      .selectScalar()
    if (empPosID) {
      const empPosName = await UB.Repository('hr_position')
        .attrs(['fullName', 'fullNameGen', 'fullNameGenF'])
        .where('mi_data_id', '=', empPosID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()

      let sexType = me.attr.employeeID.getFieldValue('sexType') || 'M'
      me.attr.empPositionName.setValue(sexType === 'M' ? (empPosName.fullNameGen || empPosName.fullName) : (empPosName.fullNameGenF || empPosName.fullName))
    } else {
      const empWbData = await UB.Repository('hr_employeeWorkbook')
        .attrs(['workPosition', 'workPlace', 'organizationID'])
        .where('employeeID', '=', employeeID)
        .orderBy('dateFrom', 'desc')
        .selectSingle()
      if (empWbData) {
        let orgName = empWbData.workPlace
        if (!orgName && empWbData.organizationID) {
          const org = await UB.Repository('hr_organization')
            .attrs(['fullName'])
            .where('mi_data_id', '=', empWbData.organizationID)
            .where('state', '=', 'ACTIVE')
            .selectSingle()
          orgName = org.fullName
        }
        me.attr.empPositionName.setValue(`${empWbData.workPosition} ${orgName || ''}`)
      } else {
        me.attr.empPositionName.setValue()
      }
    }
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'employeeID':
      if (me.attr.isRankSave.getValue()) {
        getEmployeeRank(me, field.getValue())
      }
      getEmployeeTarifCoeff(me, value, me.attr.dateFrom.getValue() || appAC.globalApplicationDate())
      const empOrderExperience = me.down('[name=hr_empOrderExperience]')
      Promise.all([empOrderExperience.onRefresh(), me.down('[name=hr_empOrderAcc]').onRefresh()])
        .then(() => {
          if (empOrderExperience.getStore().getCount() || me.down('[name=hr_empOrderAcc]').getStore().getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити існуючі записи зі стажами та нарахуваннями?')).then(isAgree => {
              if (isAgree) {
                doClearExpAndAccruals(me)
              }
            })
          }
        })
      const useSingleTabNum = AC.settings.get('hrUseSingleEmployeeTabNum', appAC.globalOrganization())
      if (useSingleTabNum) {
        me.getNextTabNum()
      }
      setEmployeePositionName(me, value)
      break
    case 'positionID':
      const positionType = me.attr.positionID.getFieldValue('positionType')
      const isCivilServant = positionType === POSITION_TYPE.CIVIL_SERVANT
      const isTariff = positionType === POSITION_TYPE.TARIFF
      const isWorker = positionType === POSITION_TYPE.WORKER
      const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

      me.attr.dictRankID[['hide', 'show'][+(isCivilServant)]]()
      me.attr.isRankSave[['hide', 'show'][+(isCivilServant)]]()
      me.attr.isRankAssign[['hide', 'show'][+(isCivilServant)]]()
      me.attr.isTransfer[['hide', 'show'][+(isCivilServant)]]()
      if (!me.record.get('isByHours')) {
        const accrualSum = me.attr.positionID.getFieldValue('accrualSum')
        me.attr.accrualSum.setValue(accrualSum)
        me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
        me.attr.dictPositionID[me.allowSelectDictPosition || me.record.get('isOutStaff') ? 'show' : 'hide']()
        me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
        me.attr.posNameAddition.setValue(me.allowSelectDictPosition ? field.getFieldValue('nameAddition') : null)
        me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition || me.record.get('isOutStaff') ? 'show' : 'hide']()
        if ((isTariff || isWorker) && value) {
          me.attr.dictEmpCategoryID.setValueById(field.getFieldValue('dictEmpCategoryID'))
        } else {
          me.attr.dictEmpCategoryID.setValue()
        }
        const dictTarifCoeffFromPosition = me.attr.positionID.getFieldValue('dictTarifCoeffID')
        const dictTarifCoeffFromEmployee = me.attr.employeeID.getFieldValue('dictTarifCoeffID')
        if (dictTarifCoeffFromPosition) {
          me.attr.dictTarifCoeffID.setValue(dictTarifCoeffFromPosition)
        } else if (dictTarifCoeffFromEmployee) {
          me.attr.dictTarifCoeffID.setValue(dictTarifCoeffFromEmployee)
        }
      }
      const posWorkScheduleID = field.getFieldValue('workScheduleID')
      if (!me.record.get('isByHours') || !me.record.get('workScheduleID')) {
        if (posWorkScheduleID) me.attr.workScheduleID.setValueById(posWorkScheduleID)
      }
      me.attr.dictCostTypeID.setValueById(field.getFieldValue('dictCostTypeID'))
      UB.Repository('hr_positionTypeProps')
        .attrs(['contractType', 'dictContractKindID', 'dictStaffCatID', 'payElID', 'workPlace', 'workScheduleID', 'workerType'])
        .where('positionType', '=', positionType || null)
        .selectSingle()
        .then(data => {
          const posDictStaffSubCatID = field.getFieldValue('dictStaffSubCatID')
          const querySubCat = posDictStaffSubCatID
            ? UB.Repository('hr_dictStaffSubCat')
              .attrs('payStaffCatID')
              .selectById(posDictStaffSubCatID)
            : Promise.resolve(null)
          querySubCat.then((item) => {
            if (item && item.payStaffCatID) {
              me.attr.dictStaffCatID.setValueById(item.payStaffCatID)
            } else {
              const posDictStaffCatID = field.getFieldValue('dictStaffCatID')
              if (posDictStaffCatID) me.attr.dictStaffCatID.setValueById(posDictStaffCatID)
              else if (data && data.dictStaffCatID) me.attr.dictStaffCatID.setValueById(data.dictStaffCatID)
            }
          })
          if (data) {
            me.attr.dictContractKindID.setValueById(data.dictContractKindID)
            if (!me.record.get('isByHours')) {
              me.attr.payElID.setValueById(data.payElID)
              me.attr.contractType.setValue(data.contractType)
            }
            if (!me.record.get('isOutStaff')) {
              me.attr.workPlace.setValue(data.workPlace)
            }
            if (!me.record.get('isByHours') || !me.record.get('workScheduleID')) {
              if (!posWorkScheduleID && data.workScheduleID) me.attr.workScheduleID.setValueById(data.workScheduleID)
            }
            me.attr.workerType.setValue(data.workerType)
          }
        })
      if (!me.record.get('isByHours') && [POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)) {
        getEmployeeTarifCoeff(me, me.attr.employeeID.getValue(), me.attr.dateFrom.getValue() || appAC.globalApplicationDate())
      } else {
        me.attr.dictTarifCoeffID.setValue()
      }
      if (value) {
        me.filterVacPositionID(false)
        me.attr.dictPositionID.setValueById(field.getFieldValue('dictPositionID'))
      } else {
        me.attr.vacPositionID.setValueById()
        me.attr.vacPositionID.hide()
      }
      if (me.isFundSourceAccounting === 'STAFF' && !me.record.get('isByHours')) {
        HR.orderManager.loadOrderFundSource(me, value, true)
      }
      if (me.attr.positionID.getFieldValue('dictPositionID.isVehicle')) {
        me.attr.dictVehicleID.show()
        me.attr.addOrderText.show()
      } else {
        me.attr.dictVehicleID.hide()
        me.attr.addOrderText.hide()
        me.attr.addOrderText.setValue(null)
        me.attr.dictVehicleID.setValue(null)
      }
      break

    case 'isTrialPeriod':
      const isTrialPeriod = field.getValue()
      me.attr.dictTrialPeriodID.setDisabled(!isTrialPeriod)
      me.attr.dictTrialPeriodID.setAllowBlank(!isTrialPeriod)
      me.attr.dictTrialPeriodID.clearValue()
      me.attr.dateTrialEnd.setDisabled(!isTrialPeriod)
      me.attr.dateTrialEnd.setAllowBlank(!isTrialPeriod)
      me.manageRankControls(me.attr.isRankAssign, me.attr.isRankSave)
      break
    case 'dateFrom':
      if (field.value && AC.dateService.isDateString(field.getRawValue())) {
        HR.orderManager.calculateDateTrialEnd(me, field.value)
        me.fillOrderExperience(true, UB.i18n('Розрахувати вказані стажі на дату початку?'))
        me.filterVacPositionID(false)
        getEmployeeTarifCoeff(me, me.attr.employeeID.getValue(), value || appAC.globalApplicationDate())
      } else {
        me.attr.vacPositionID.setValueById()
        me.attr.vacPositionID.hide()
      }
      break
    case 'dictTrialPeriodID':
      HR.orderManager.calculateDateTrialEnd(me)
      break
    case 'dictContractKindID':
      if (!me.record.get('isByHours')) {
        const isTerm = me.attr.dictContractKindID.getFieldValue('isTerm') || false
        me.attr.dateToEmpty[['hide', 'show'][+isTerm]]()
        if (!isTerm) {
          me.attr.dateToEmpty.setValue()
        }
      }
      break
    case 'isTransfer':
      const isTransfer = !!field.getValue()
      const isCivilServatesPositionType = me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.CIVIL_SERVANT
      me.down('[name=srcOrganizationName]').setDisabled(!(isTransfer && isCivilServatesPositionType))
      if (!AC.settings.get('hrEmpOrderNotNullAppointKind', appAC.globalOrganization())) {
        me.attr.dictAppointKindID.setAllowBlank(false)
      } else if (value) {
        me.attr.dictAppointKindID.setAllowBlank(false)
      }
      break
    case 'isRankSave':
      me.manageRankControls(field, me.attr.isRankAssign)
      if (field.value) {
        getEmployeeRank(me, me.record.get('employeeID'))
      }
      break
    case 'isRankAssign':
      me.manageRankControls(field, me.attr.isRankSave)
      if (field.value) {
        me.setNextRank(me.record.get('employeeID'))
      }
      break
    case 'dictRankID':
      field.clearInvalid()
      HR.orderManager.checkRankValue(me, field)
      break
    case 'vacPositionID':
      let dictContractCode
      const vacPosReco = value && AC.gridUtils.getCurrentRecord(me.attr.vacPositionID)
      if (vacPosReco) {
        dictContractCode = '02'
      } else {
        dictContractCode = '01'
      }
      UB.Repository('hr_dictContractKind')
        .attrs('ID', 'name')
        .where('code', '=', dictContractCode)
        .selectSingle()
        .then(data => {
          let id = (data && data.ID) || null
          let name = (data && data.name) || null
          me.record.set('dictContractKindID', id)
          me.record.set('dictContractKindID.name', name)
          const panelAppointDetInfo = me.down('[name=panelAppointDetInfo]')
          if (panelAppointDetInfo.collapsed) {
            panelAppointDetInfo.refreshTitle()
          }
        })
      break
    case 'isAppoint':
      me.attr.isMove.setValue(!value)
      me.attr.dateStartWork.setDisabled(value)
      me.attr.appointmentOrderDate.setDisabled(value)
      me.attr.appointmentOrderNumber.setDisabled(value)
      break
    case 'isMove':
      me.attr.isAppoint.setValue(!value)
      me.attr.dateStartWork.setDisabled(!value)
      me.attr.appointmentOrderDate.setDisabled(!value)
      me.attr.appointmentOrderNumber.setDisabled(!value)
      break
    case 'workPlace':
      me.attr.notStoreInWorkBook.setValue(value !== '1')
      me.setControlsByWorkPlace(value)
      break
    case 'dictTarifCoeffID':
      HR.orderManager.calcTarifAccrualSum(me, value)
      break
    case 'contractType':
      if (value === '2') {
        UB.Repository('hr_dictCategoryECB')
          .attrs(['ID', 'name'])
          .where('code', '=', '26')
          .selectSingle().then(resp => {
            if (resp) {
              me.attr.dictCategoryECBID.setValueById(resp.ID)
            }
          })
      }
      break

    case 'dictVehicleID':
      if (value) {
        const newv = UB.i18n(`з роботи та обслуговування {0}  державний номер {1}`, field.getFieldValue('description'), field.getFieldValue('govNum'))
        me.attr.addOrderText.setValue(me.attr.addOrderText.value ? me.attr.addOrderText.value + ' ' + newv : newv)
      } else {
        me.attr.addOrderText.setValue(null)
      }

      break
  }
}

function setControlsByWorkPlace (value) {
  const me = this
  if (me.record.get('isOutStaff')) {
    me.attr.positionID.setAllowBlank(true)
    me.attr.dictPositionID.setVisible(true)
    me.attr.dictPositionID.setAllowBlank(false)
    me.attr.workPlace.setReadOnly(true)
    me.down('[ubID=factPositionBlock]').show()
    me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
  } else {
    me.attr['workPlace'].store.filter({
      filterFn: function (item) { return item.get('code') !== '4' }
    })
  }
  me.attr.workScheduleID.setAllowBlank(value === '4')
}

function setControlsForAppointHours () {
  const me = this
  if (me.customParams.empOrderType === 'APPOINT_HOUR' || me.record.get('isByHours')) {
    me.down('[name=dateToHour]').show()
    me.down('[name=dateToHour]').setValue(me.record.get('dateToEmpty'))
    me.attr.planHours.show()
    me.attr.planHours.setAllowBlank(false)
    me.attr.mtCount.setAllowBlank(true)
    me.attr.mtCount.setDisabled(true)
    me.attr.dateToEmpty.hide()
    me.attr.accrualSum.setAllowBlank(true)
    me.attr.accrualSum.setDisabled(true)
    me.attr.empPositionName.show()
    me.down('[name=srcOrganizationPanel]').hide()
    me.attr.contractType.setDisabled(true)
    me.attr.dictFundSourceID.show()
    const panel = me.down('[name=fundSourcePanel]')
    panel && panel.hide()
  }
}

function setNextRank (employeeID) {
  let me = this
  if (employeeID) {
    $App.connection.run({
      entity: 'hr_employee',
      method: 'getNextPublServRang',
      onDate: new Date(me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')),
      employeeID: employeeID
    }).then(mParams => {
      me.attr.dictRankID.setValueById(mParams.dictRankID)
      me.curRankCode = parseInt(mParams.curRankCode) || null
    })
  } else {
    me.attr.dictRankID.setValueById(null)
    me.curRankCode = null
  }
}

function doClearExpAndAccruals (me) {
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'clearOrderAccrualsExperience',
    empOrderDetID: me.instanceID
  }).then(() => {
    me.down('[name=hr_empOrderExperience]').onRefresh()
    me.down('[name=hr_empOrderAcc]').onRefresh()
  })
}

function manageRankControls (firstControl, secondControl) {
  const me = this
  if (me.attr.isTrialPeriod.getValue()) {
    if (firstControl.getValue()) {
      secondControl.setValue(false)
    }
  } else {
    secondControl.setValue(!firstControl.getValue())
  }
  me.attr.dictRankID.setReadOnly(!me.attr.isRankAssign.getValue())
}

async function onBeforeSave () {
  const me = this
  me.record.set('tabDate', me.record.get('dateFrom'))
  const positionType = me.attr.positionID.getFieldValue('positionType')
  if (positionType !== POSITION_TYPE.CIVIL_SERVANT) {
    me.attr.dictRankID.clearValue()
  }
  if (me.record.get('empOrderType') === 'APPOINT_MOVE' && me.record.get('dateStartWork') && me.record.get('dateFrom') < me.record.get('dateStartWork')) {
    await $App.dialogError(UB.i18n(`Дата початку повинна бути не раніше Дати прийому на роботу в Організацію:?`))
    return false
  }

  if (positionType === POSITION_TYPE.CIVIL_SERVANT) {
    const res = await HR.orderManager.offerToCorrectSeveralPublServRang(me, me.attr.employeeID.value)
    if (res === false) return false
  }

  if (me.down('[name=empOrderVacationPlanGrid]').getStore().data.items.length && me.down('[name=empOrderVacationPlanGrid]').getStore().data.items.filter(el => AC.dateService.formatDate4Sql(el.get('dateFrom')) !== AC.dateService.formatDate4Sql(me.record.get('dateFrom'))).length) {
    const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`В Праві на відпустку дата "Періоду з" не співпадає з "Датою початку" призначення. Продовжити?`))
    if (!isAgree) return false
  } else if (!me.down('[name=empOrderVacationPlanGrid]').getStore().data.items.length) {
    let empOrderVacationPlan = await UB.Repository('hr_empOrderVacationPlan')
      .attrs(['ID', 'dateFrom'])
      .where('orderDetID', '=', me.record.get('ID'))
      .selectAsObject()
    if (empOrderVacationPlan && empOrderVacationPlan.length && empOrderVacationPlan.filter(el => AC.dateService.formatDate4Sql(el.dateFrom) !== AC.dateService.formatDate4Sql(me.record.get('dateFrom'))).length) {
      const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`В Праві на відпустку дата "Періоду з" не співпадає з "Датою початку" призначення. Продовжити?`))
      if (!isAgree) return false
    }
  }

  await HR.orderManager.checkEmpOrderAccDateFrom(me)
  if (me.isNewInstance || !!me.record.modified.tabNum) {
    const { info } = await $App.connection.run({
      entity: me.entityName,
      method: 'checkTabNum',
      tabNum: me.record.get('tabNum'),
      employeeID: me.record.get('employeeID'),
      organizationID: me.record.get('organizationID'),
      ID: me.instanceID
    })
    if (info) {
      const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`{0}. Все одно зберегти ?`, info))
      if (!isAgree) return false
    }
  }
  const checkFundSource = await HR.orderManager.checkOrderFundSource(me, me.attr.positionFundSourceDt)
  if (!checkFundSource) {
    return false
  }
  if (me.record.get('workPlace') === '1' && me.record.get('mtCount') > 1) {
    const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`Увага, кількість ставок працівника за основним місцем роботи більше 1. Продовжити?`))
    if (!isAgree) return false
  }
  if (me.isNewInstance || !!me.record.modified.positionID || !!me.record.modified.dictRankID) {
    const psCatResult = await HR.orderManager.checkRankPsCategory(positionType === POSITION_TYPE.CIVIL_SERVANT ? me.attr.positionID.getFieldValue('psCategory') : null, me.attr.dictRankID.getFieldValue('code'))
    if (psCatResult) {
      const rankResult = await HR.orderManager.checkRankValue(me, me.attr.dictRankID, true)
      if (rankResult) {
        return isCheckVac(me)
      } else {
        return false
      }
    } else {
      return false
    }
  }
}

async function isCheckVac (me) {
  const posRecord = AC.gridUtils.getCurrentRecord(me.attr.positionID)
  const dateFrom = AC.dateService.truncTimeToUtcNull(me.attr.dateFrom.getValue())
  if (!posRecord) return me.record.get('isOutStaff') ? true : $App.dialogYesNo('Попередження', UB.i18n(`Увага! На дату {0} вказана посада не діє. Продовжити?`, AC.dateService.formatDate(dateFrom)))
  const miDataId = posRecord.get('mi_data_id')
  const response = await $App.connection.run({
    entity: 'hr_staffUnit',
    method: 'getVacationRate',
    orderEntity: me.entityName,
    positionID: posRecord.get('ID'),
    orderID: me.record.get('orderID'),
    orderItemID: me.instanceID,
    onDate: dateFrom
  })
  if (response.vacancyRate >= me.attr.mtCount.getValue() || (!me.isNewInstance && !me.record.modified.positionID)) {
    return true
  } else {
    const empPosition = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID.shortFIO'])
      .where('positionID', '=', miDataId)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
    const orderPosition = await UB.Repository('hr_empOrderDet')
      .attrs(['ID', 'dateFrom', 'employeeID.shortFIO'])
      .where('positionID', '=', posRecord.get('ID'))
      .where('orderID', '=', me.record.get('orderID'))
      .where('empOrderType', 'in', ['APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'])
      .where('ID', '<>', me.instanceID)
      .selectAsObject()
    const orderPositionOther = await UB.Repository('hr_empOrderDet')
      .attrs(['ID', 'dateFrom', 'employeeID.shortFIO'])
      .where('positionID', '=', posRecord.get('ID'))
      .where('orderID', '!=', me.record.get('orderID'))
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('dateFrom', '>', dateFrom)
      .where('empOrderType', 'in', ['APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE', 'MOVE', 'PLURALIST'])
      .where('ID', '<>', me.instanceID)
      .selectAsObject()
    const msg = empPosition.length || orderPosition.length || orderPositionOther.length
      ? UB.i18n(`Увага! На цю посаду було вже призначено раніше, або призначаються поточним наказом працівники: {0}. Продовжити?`,
        empPosition.map(item => `${item['employeeID.shortFIO']} ${UB.i18n('з')} ${AC.dateService.formatDate(AC.dateService.unshiftDate(item.dateFrom))}`)
          .concat(orderPosition.map(item => `${item['employeeID.shortFIO']} ${UB.i18n('з')} ${AC.dateService.formatDate(AC.dateService.unshiftDate(item.dateFrom))}`))
          .concat(orderPositionOther.map(item => `${item['employeeID.shortFIO']} ${UB.i18n('з')} ${AC.dateService.formatDate(AC.dateService.unshiftDate(item.dateFrom))}`)).join(',\n'))
      : UB.i18n(`Увага! Кількість ставок на посаді за штатним розкладом менша за кількість ставок, вказаних у наказі. Продовжити?`)
    return $App.dialogYesNo(UB.i18n('Попередження'), msg)
  }
}

function onBeforeClose () {
  const me = this
  if (me.sender) {
    let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.getStore().load()
    }
  }
}

function getNextTabNum () {
  const me = this
  $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getNextTabNum',
    orderItemID: me.instanceID,
    orderEntity: 'hr_empOrderAppointDet',
    organizationID: me.record.get('organizationID'),
    employeeID: me.attr.employeeID.getValue()
  }).then(({
    tabNum
  }) => {
    me.getField('tabNum').setValue(String(tabNum))
  })
}

function fillOrderExperience (recalc = false, msg) {
  const me = this
  const grid = me.down('[name=hr_empOrderExperience]')
  grid.getStore().load().then(() => {
    if (grid.getStore().getCount()) {
      $App.dialogYesNo(UB.i18n('Попередження'), msg || UB.i18n('Видалити існуючі записи зі стажами ?')).then(isAgree => {
        if (isAgree) {
          doFillOrderExperience(me)
        }
      })
    } else {
      if (!recalc) doFillOrderExperience(me)
    }
  })
}

function doFillOrderExperience (me) {
  const positionID = me.record.get('positionID')
  const employeeID = me.record.get('employeeID')
  if (!positionID) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказана посада'))
    return
  }
  if (!employeeID) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказана особа'))
    return
  }
  const grid = me.down('[name=hr_empOrderExperience]')
  me.doSaveForm().then(result => {
    if (result !== -1) {
      $App.connection.run({
        entity: 'hr_empOrder',
        method: 'fillOrderExperience',
        empOrderDetID: me.instanceID,
        orderID: me.record.get('orderID'),
        onDate: AC.dateService.shiftDate(me.record.get('dateFrom')),
        empOrderType: me.record.get('empOrderType'),
        positionID: positionID,
        employeeID: employeeID,
        orgID: appAC.globalOrganization(),
        uniqueID: AC.dataService.getUniqueInt()
      }).then(() => {
        grid.onRefresh()
      })
    }
  })
}

function doSaveForm () {
  const me = this
  if (me.isFormDirty()) {
    return me.saveForm()
  } else {
    return Promise.resolve(1)
  }
}

function filterVacPositionID (fromRecord) {
  const me = this
  let positionID
  let onDate
  if (fromRecord) {
    positionID = me.record.get('positionID.mi_data_id')
    onDate = me.record.get('dateFrom')
  } else {
    let posReco = AC.gridUtils.getCurrentRecord(me.attr.positionID)
    positionID = posReco && posReco.get('mi_data_id')
    onDate = me.attr.dateFrom.getValue()
  }
  if (positionID && onDate && AC.dateService.isValid(onDate)) {
    onDate = AC.dateService.shiftDate(onDate)
    $App.connection.run({
      entity: 'hr_staffUnit',
      method: 'getVacationEmpPos',
      organizationID: me.record.get('organizationID'),
      positionID,
      onDate
    }).then(response => {
      const employeePosition = JSON.parse(response.resultData)
      AC.viewUtils.setWhereListProperty(me.attr.vacPositionID, [
        ['organizationID', 'equal', me.record.get('organizationID')],
        ['ID', 'in', employeePosition.length ? employeePosition.map(o => o.ID) : [0]]
      ], undefined, ['clearStore', 'clearValue'])
    })
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.vacPositionID, [
      ['organizationID', 'equal', 0]
    ])
    me.attr.vacPositionID.setValueById()
    me.attr.vacPositionID.hide()
  }
}

function setPaymentControls () {
  const me = this
  const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
  if (config) {
    if (me.isNewInstance && !me.record.get('payElID')) {
      me.attr.payElID.setValueById(config.payElIDAccrual)
    }
    me.attr.payElID.setDisabled(!config.canEditPayElAccrual)
  }
}

function beforeSave (me, params) {
  const data = me.attr.positionFundSourceDt.getData()
  params.fundSource = JSON.stringify(data.filter(o => o.mtCount))
}

function onFundSourceGridChange (grid) {
  const me = grid.up('form')
  const quantityTotal = grid.getStore().data.items.reduce((sum, item) => {
    return sum + item.get('mtCount')
  }, 0)
  if (grid.getStore().data.items.length) me.record.set('mtCount', quantityTotal)
  HR.orderManager.setIsDirty(me, true)
}

function onAfterSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'))
  }
}
