/* global appAC UB AC $App HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  onBeforeClose,
  manageRankControls,
  setNextRank,
  filterVacPositionID,
  showPrevAccrualSum,
  setAddPayDateFrom,
  showFields,
  setControlsByWorkPlace
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

function showPrevAccrualSum () {
  const me = this
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  const prevAccrualSum = me.record.get('accrualSumPrev') || me.attr.employeePositionID.getFieldValue('accrualSum')
  const label = me.down('[name=prevAccrualSumLabel]')
  if (!notShowSalary && prevAccrualSum) {
    label.update(`<span style="display: block;text-align: center; font-style: italic;font-weight: normal;" >${UB.i18n('Попередній <br> оклад {0} грн', prevAccrualSum)}</span>`)

    label.show()
  } else {
    label.hide()
  }
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('onBeforeSave', onBeforeSave, me)
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', onAfterSave, me)
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('empOrderSicknessID'), ['editItem', 'showLookup', 'addItem'])
    let employeePositionCtrl = me.getField('employeePositionID')
    employeePositionCtrl.contextMenu.add([{
      xtype: 'menuseparator'
    },
    {
      text: UB.i18n('Відкрити картку працівника'),
      iconCls: 'u-icon-check',
      handler: function () {
        const employeeID = employeePositionCtrl.getFieldValue('employeeID')

        if (!employeeID) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
          return
        }
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employee',
          entity: 'hr_employee',
          instanceID: employeeID,
          sender: employeePositionCtrl,
          cmpInitConfig: {
            employeeNumberID: employeePositionCtrl.getFieldValue('employeeNumberID')
          }
        })
      }
    }
    ])
  })
  me.on('beforeClose', onBeforeClose, me)
}

function initComponentDone () {
  const me = this

  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else if (me.sender) {
    me.orderForm = me.sender.up('form')
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
}

function onRecordLoaded () {
  const me = this
  me.masterForm = me.customParams.orderForm
    ? me.customParams.orderForm
    : (me.sender ? me.sender.up('form') : null)

  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('destOrganizationID', me.masterForm.record.get('organizationID'))
    let dateFrom = AC.dateService.truncTimeToUtcNull(me.masterForm.attr.orderDate.getValue() || appAC.globalApplicationDate())
    me.record.set('dateFrom', dateFrom)
    // me.record.set('addPayDateFrom', dateFrom)
    // me.record.set('addPayDateTo', dateFrom)
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('isRankSave', true)
    if (me.customParams.empOrderType === 'MOVE_OUTSTAFF') {
      me.record.set('isOutStaff', 1)
      me.record.set('workPlace', '4')
      me.attr.dictCategoryECBID.setAllowBlank(true)
    }
  } else {
    HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'))
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
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('employeePositionID')) {
      me.record.set('accrualSumPrev', me.getField('employeePositionID').getFieldValue('accrualSum'))
      me.showPrevAccrualSum()
    }
  })
  me.orderForm && me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  if (me.record.data['positionID.dictPositionID.isVehicle']) {
    me.attr.dictVehicleID.show()
    me.attr.addOrderText.show()
  } else {
    me.attr.dictVehicleID.hide()
    me.attr.addOrderText.hide()
  }
}

function showFields () {
  const me = this
  const positionType = me.attr.positionID.getFieldValue('positionType')
  const isCivilServatesPositionType = positionType === POSITION_TYPE.CIVIL_SERVANT
  const isTariff = positionType === POSITION_TYPE.TARIFF
  const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

  me.attr.dictRankID[['hide', 'show'][+isCivilServatesPositionType]]()
  me.attr.isRankSave[['hide', 'show'][+isCivilServatesPositionType]]()
  me.attr.isRankAssign[['hide', 'show'][+isCivilServatesPositionType]]()
  me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
  me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
  me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
  me.attr.dateToEmpty[['hide', 'show'][+(me.record.get('dictContractKindID.isTerm'))]]()
  me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
  me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
  me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()
  const termAddPayment = me.attr.termAddPayment.getValue()
  me.attr.addPayDateFrom.setAllowBlank(!termAddPayment || termAddPayment === 'NONE_TERM')
  me.attr.addPayDateTo.setAllowBlank(!termAddPayment || termAddPayment === 'NONE_TERM')
  const isTrialPeriod = !!me.record.get('isTrialPeriod')
  me.attr.dictTrialPeriodID.setAllowBlank(!isTrialPeriod)
  me.attr.dateTrialEnd.setAllowBlank(!isTrialPeriod)
  if (!me.isReadOnly) {
    me.attr.dictTrialPeriodID.setDisabled(!isTrialPeriod)
    me.attr.dateTrialEnd.setDisabled(!isTrialPeriod)
  }
}

async function onFormDataReady () {
  const me = this

  const isReadOnly = !me.masterForm || !(me.masterForm.isEditable && me.masterForm.isEditable()) || !me.masterForm.allowChangeDocument()
  me.isReadOnly = isReadOnly
  HR.orderManager.enableControls({
    me: me,
    isEnabled: !isReadOnly
  })
  const empOrderAccGrid = me.down('[name=hr_empOrderAcc]')
  if (isReadOnly) {
    me.down('[ubID=btnSelectByTree]').setDisabled(true)
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillFromStaff', false)
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillWithSave', false)
    me.showPrevAccrualSum()
    me.attr.dateToEmpty[['hide', 'show'][+(me.record.get('dictContractKindID.isTerm'))]]()
    me.showFields()
    me.attr.positionFundSourceDt.setReadOnly(true)
    return
  }
  if (me.record.get('isPreservExistCharges')) {
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillFromStaff', false)
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillWithSave', false)
    HR.orderManager.enableGrid(empOrderAccGrid, false)
  } else {
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillFromStaff', true)
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillWithSave', true)
    HR.orderManager.enableGrid(empOrderAccGrid, true)
  }
  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
    ['organizationID', '=', me.record.get('organizationID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()],
    ['isActive', '=', 1],
    ['organizationID', '=', me.record.get('organizationID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  if (me.isNewInstance) {
    me.attr.dictRankID.hide()
    me.attr.isRankSave.hide()
    me.attr.isRankAssign.hide()
    AC.viewUtils.setWhereListProperty(me.attr.empOrderSicknessID, [
      ['employeePositionID', '=', -1]
    ])
  } else {
    me.showFields()
    AC.viewUtils.setWhereListProperty(me.attr.empOrderSicknessID, [
      ['employeePositionID', '=', me.attr.employeePositionID.getValue()]
    ])
  }
  me.attr.dictRankID.setReadOnly(!me.attr.isRankAssign.getValue())
  if (!me.isNewInstance && !me.curRankCode) {
    let onDate = me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')
    onDate && $App.connection.run({
      entity: 'hr_employee',
      method: 'getNextPublServRang',
      onDate: new Date(),
      employeeID: me.attr.employeePositionID.getFieldValue('employeeID')
    }).then(mParams => {
      me.curRankCode = parseInt(mParams.curRankCode) || null
    })
  }
  const termAddPayment = me.attr.termAddPayment.getValue()
  me.attr.addPayDateFrom.setAllowBlank(!termAddPayment || termAddPayment === 'NONE_TERM')
  me.attr.addPayDateTo.setAllowBlank(!termAddPayment || termAddPayment === 'NONE_TERM')
  me.showPrevAccrualSum()
  me.attr.positionID.setAllowBlank(false)
  me.setControlsByWorkPlace(me.attr.workPlace.getValue())
  const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
  if (funcOrgType === '2') {
    me.attr.dictCostTypeID.hide()
  }
  if (me.record.get('dictTarifCoeffID') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
    me.down('[ubID=accrualLabel]').show()
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'), true)
  }
  me.fireEvent('formDataReadyFinished')
  if (!me.isNewInstance) {
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    if (notShowSalary && me.attr.accrualSum) {
      me.attr.accrualSum.hide()
    }
  }

  me.attr.reason[AC.settings.get('hrEnableReasonDoc', appAC.globalOrganization()) ? 'show' : 'hide']()
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
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

function onChangeEmpAccData (grid, event) {
  const me = grid.up('form')
  if (me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF && me.record.get('dictTarifCoeffID')) {
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'))
  }
}

function doFillOrderAccrual (me, grid, employeeID, dateFrom, onlyNotClosable = 0) {
  me.saveForm().then(result => {
    if (result !== -1) {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_empOrderAcc',
        method: 'fillOrderAccrual',
        empOrderID: me.record.get('orderID'),
        empOrderDetID: me.instanceID,
        employeeID,
        dateFrom,
        onlyNotClosable
      }).then(() => {
        me.setLoading(false)
        grid.onRefresh()
      }, err => {
        me.setLoading(false)
        throw err
      })
    }
  })
}

function doCleanOrderAccrual (me, grid) {
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_empOrderAcc',
    method: 'clearOrderAccrual',
    empOrderID: me.record.get('orderID'),
    empOrderDetID: me.instanceID
  }).then(() => {
    me.setLoading(false)
    grid.onRefresh()
  }, err => {
    me.setLoading(false)
    throw err
  })
}

function onControlChanged (field, value) {
  const me = this
  let dateFrom = AC.dateService.truncTimeToUtcNull(AC.dateService.isValid(me.record.get('dateFrom')) ? me.record.get('dateFrom') : me.orderForm.record.get('orderDate'))
  let employeeID = me.attr.employeePositionID.getFieldValue('employeeID')

  if (field.skipChange) {
    delete field.skipChange
    return
  }
  switch (field.name) {
    case 'isPreservExistCharges':
      if (value) {
        const grid = me.down('entitygridpanel')
        if (!employeeID) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказаний працівник'))
          doCleanOrderAccrual(me, grid)
          me.attr.isPreservExistCharges.setValue(false)
          return
        }
        grid.getStore().load().then(() => {
          if (grid.getStore().getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Всі внесені в блоці Нарахування дані будуть видалені! Продовжити?')).then(isAgree => {
              if (isAgree) {
                doFillOrderAccrual(me, grid, employeeID, dateFrom)
              } else {
                me.attr.isPreservExistCharges.skipChange = true
                me.attr.isPreservExistCharges.setValue(false)
              }
            })
          } else {
            doFillOrderAccrual(me, grid, employeeID, dateFrom)
          }
        })
      } else {
        const grid = me.down('[name=hr_empOrderAcc]')
        grid.getStore().load().then(() => {
          if (grid.getStore().getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Всі внесені в блоці Нарахування дані будуть видалені! Продовжити?')).then(isAgree => {
              if (isAgree) {
                doFillOrderAccrual(me, grid, employeeID, dateFrom, 1)
              } else {
                me.attr.isPreservExistCharges.skipChange = true
                me.attr.isPreservExistCharges.setValue(true)
              }
            })
          }
        })
      }
      break
    case 'employeePositionID':
      employeeID = me.attr.employeePositionID.getFieldValue('employeeID')
      if (me.attr.isRankSave.getValue()) {
        getEmployeeRank(me, field.getFieldValue('employeeID'))
      }
      getEmployeeTarifCoeff(me, field.getFieldValue('employeeID'), me.attr.dateFrom.getValue() || appAC.globalApplicationDate())
      AC.viewUtils.setWhereListProperty(me.attr.empOrderSicknessID, [
        ['employeePositionID', '=', value]
      ])
      const dictCategoryECBID = field.getFieldValue('dictCategoryECBID')
      if (dictCategoryECBID) me.attr.dictCategoryECBID.setValueById(dictCategoryECBID)
      me.attr.empOrderSicknessID.setValue()
      me.attr.empOrderSicknessID.getStore().load()
      me.attr.isPreservExistCharges.skipChange = true
      me.attr.isPreservExistCharges.setValue(false)
      const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
      if (config && me.attr.termAddPayment.getValue()) {
        me.attr.addPayElID.setValueById(config.payElIDMain)
      }
      break
    case 'positionID':
      const accrualSum = me.attr.positionID.getFieldValue('accrualSum')
      me.attr.accrualSum.setValue(accrualSum)

      const positionType = me.attr.positionID.getFieldValue('positionType')
      const isCivilServant = positionType === POSITION_TYPE.CIVIL_SERVANT
      const isTariff = positionType === POSITION_TYPE.TARIFF
      const isWorker = positionType === POSITION_TYPE.WORKER
      const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

      me.attr.dictRankID[['hide', 'show'][+(isCivilServant)]]()
      me.attr.isRankSave[['hide', 'show'][+(isCivilServant)]]()
      me.attr.isRankAssign[['hide', 'show'][+(isCivilServant)]]()
      // me.attr.dictAppointKindID[['hide', 'show'][+(isCivilServant)]]()
      me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
      me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
      me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
      if ((isTariff || isWorker) && value) {
        me.attr.dictEmpCategoryID.setValueById(field.getFieldValue('dictEmpCategoryID'))
      } else {
        me.attr.dictEmpCategoryID.setValue()
      }
      me.attr.dictPositionID[me.allowSelectDictPosition || me.record.get('isOutStaff') ? 'show' : 'hide']()
      me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
      me.attr.posNameAddition.setValue(me.allowSelectDictPosition ? field.getFieldValue('nameAddition') : null)
      me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition || me.record.get('isOutStaff') ? 'show' : 'hide']()
      const dictTarifCoeffFromPosition = me.attr.positionID.getFieldValue('dictTarifCoeffID')
      const dictTarifCoeffFromEmployee = me.attr.employeePositionID.getFieldValue('employeeID.dictTarifCoeffID')
      if (dictTarifCoeffFromPosition) {
        me.attr.dictTarifCoeffID.setValue(dictTarifCoeffFromPosition)
      } else if (dictTarifCoeffFromEmployee) {
        me.attr.dictTarifCoeffID.setValue(dictTarifCoeffFromEmployee)
      }
      const posWorkScheduleID = field.getFieldValue('workScheduleID')
      if (posWorkScheduleID) me.attr.workScheduleID.setValueById(posWorkScheduleID)
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
            me.attr.contractType.setValue(data.contractType)
            me.attr.dictContractKindID.setValueById(data.dictContractKindID)
            me.attr.payElID.setValueById(data.payElID)
            if (!me.record.get('isOutStaff')) {
              me.attr.workPlace.setValue(data.workPlace)
            }
            if (!posWorkScheduleID && data.workScheduleID) me.attr.workScheduleID.setValueById(data.workScheduleID)
            me.attr.workerType.setValue(data.workerType)
          }
        })
      if ([POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)) {
        getEmployeeTarifCoeff(me, me.attr.employeePositionID.getFieldValue('employeeID'), me.attr.dateFrom.getValue() || appAC.globalApplicationDate())
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
      if (me.isFundSourceAccounting === 'STAFF') {
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
        me.filterVacPositionID(false)
        getEmployeeTarifCoeff(me, me.attr.employeePositionID.getFieldValue('employeeID'), value || appAC.globalApplicationDate())
        // me.attr.addPayDateFrom.setValue(value)
        // me.attr.addPayDateTo.setValue(value)
        if (me.attr.termAddPayment.getValue()) {
          me.attr.addPayDateFrom.setValue(value)
        }
      } else {
        me.attr.vacPositionID.setValueById()
        me.attr.vacPositionID.hide()
        if (me.attr.termAddPayment.getValue()) {
          me.attr.addPayDateFrom.setValue()
        }
      }

      break
    case 'dictTrialPeriodID':
      HR.orderManager.calculateDateTrialEnd(me)
      break
    case 'dictContractKindID':
      const isTerm = me.attr.dictContractKindID.getFieldValue('isTerm') || false
      me.attr.dateToEmpty[['hide', 'show'][+isTerm]]()
      if (!isTerm) {
        me.attr.dateToEmpty.setValue()
      }
      break
    case 'isTransfer':
      const isTransfer = !!field.getValue()
      const isCivilServatesPositionType = me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.CIVIL_SERVANT
      me.attr.srcOrganizationID[['hide', 'show'][+(isTransfer && isCivilServatesPositionType)]]()
      break
    case 'isRankSave':
      me.manageRankControls(field, me.attr.isRankAssign)
      if (field.value) {
        getEmployeeRank(me, me.attr.employeePositionID.getFieldValue('employeeID'))
      }
      break
    case 'isRankAssign':
      me.manageRankControls(field, me.attr.isRankSave)
      if (field.value) {
        me.setNextRank(me.attr.employeePositionID.getFieldValue('employeeID'))
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
          /*
          const panelMoveDetInfo = me.down('[name=panelMoveDetInfo]')
          if (panelMoveDetInfo.collapsed) {
            panelMoveDetInfo.refreshTitle()
          }
          */
        })
      break
    case 'termAddPayment': {
      me.setAddPayDateFrom({
        addPayDateFrom: me.attr.dateFrom.getValue(),
        skipTermAdding: false
      })
      me.attr.addPayDateFrom.setAllowBlank(!value || value === 'NONE_TERM')
      me.attr.addPayDateTo.setAllowBlank(!value || value === 'NONE_TERM')
      if (value) {
        const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
        if (config) {
          me.attr.addPayElID.setValueById(config.payElIDMain)
        }
      } else {
        me.attr.addPayElID.setValue()
      }
      break
    }
    case 'addPayDateFrom' : {
      me.setAddPayDateFrom({
        addPayDateFrom: value,
        skipTermAdding: true
      })
      if (me.attr.addPayDateTo.getValue() && value > me.attr.addPayDateTo.getValue()) {
        me.attr.addPayDateTo.setValue(me.attr.addPayDateFrom.getValue())
      }
      break
    }
    case 'addPayDateTo' : {
      if (value instanceof Date && !isNaN(value)) {
        if (me.attr.addPayDateFrom.getValue() && value < me.attr.addPayDateFrom.getValue()) {
          AC.viewUtils.showToast('Помилка', UB.i18n(`Дата не може бути менше ніж {0}`, AC.dateService.formatDate(me.attr.addPayDateFrom.getValue())))
          me.attr.addPayDateTo.setValue(me.attr.addPayDateFrom.getValue())
        }
      }
      break
    }
    case 'dictReasonMovingKindID': {
      me.record.set('notStoreInWorkBook', field.getFieldValue('notStoreInWorkBook'))
      break
    }
    case 'workPlace':
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
        const appointOrderID = me.attr.employeePositionID.getFieldValue('paraID')
        if (appointOrderID) {
          UB.Repository('hr_empOrderAppointDet').attrs(['dictVehicleID']).where('ID', '=', appointOrderID)
            .selectSingle().then(appointOrder => {
              if (appointOrder) {
                let newv = UB.i18n(`з роботи та обслуговування {0}  державний номер {1}`, field.getFieldValue('description'), field.getFieldValue('govNum'))
                me.attr.addOrderText.setValue(newv)
                UB.Repository('trans_vehicle')
                  .attrs(['description', 'govNum'])
                  .where('ID', '=', appointOrder.dictVehicleID)
                  .selectSingle().then(vehicle => {
                    if (vehicle) {
                      newv += UB.i18n(`, увільнивши його від обслуговування автотранспортного засобу {0}  державний номер {1}`, vehicle.description, vehicle.govNum)
                      me.attr.addOrderText.setValue(newv)
                    }
                  })
              } else {
                const newv = UB.i18n(`з роботи та обслуговування {0}  державний номер {1}`, field.getFieldValue('description'), field.getFieldValue('govNum'))
                me.attr.addOrderText.setValue(me.attr.addOrderText.value ? me.attr.addOrderText.value + ' ' + newv : newv)
              }
            })
        } else {
          const newv = UB.i18n(`з роботи та обслуговування {0}  державний номер {1}`, field.getFieldValue('description'), field.getFieldValue('govNum'))
          me.attr.addOrderText.setValue(me.attr.addOrderText.value ? me.attr.addOrderText.value + ' ' + newv : newv)
        }
      } else {
        me.attr.addOrderText.setValue(null)
      }

      break
  }
}

function setAddPayDateFrom ({
  skipTermAdding = false,
  addPayDateFrom = this.attr.addPayDateFrom.getValue(),
  termAddPayment = this.attr.termAddPayment.getValue()
}) {
  const me = this
  me.attr.addPayDateFrom.setValue(addPayDateFrom)
  if (addPayDateFrom instanceof Date && !isNaN(addPayDateFrom)) {
    if (!skipTermAdding) {
      switch (termAddPayment) {
        case 'WEEK2_TERM':
          me.attr.addPayDateTo.setValue(AC.dateService.addDays(addPayDateFrom, 14))
          break
        case 'MONTH2_TERM':
          me.attr.addPayDateTo.setValue(AC.dateService.addMonths(addPayDateFrom, 2))
          break
        default:
          // me.attr.addPayDateFrom.setValue(dateFrom)
      }
    }
  }
}

async function onBeforeSave () {
  const me = this
  let message = ''
  me.record.set('tabDate', me.record.get('dateFrom'))
  const positionType = me.attr.positionID.getFieldValue('positionType')
  if (positionType !== POSITION_TYPE.CIVIL_SERVANT) {
    me.attr.dictRankID.clearValue()
  }
  let result = true

  if (positionType === POSITION_TYPE.CIVIL_SERVANT) {
    const res = await HR.orderManager.offerToCorrectSeveralPublServRang(me, me.attr.employeePositionID.getFieldValue('employeeID'))
    if (res === false) return false
  }

  if (!!me.record.modified.positionID || !!me.record.modified.dictRankID) {
    result = await HR.orderManager.checkRankPsCategory(positionType === POSITION_TYPE.CIVIL_SERVANT ? me.attr.positionID.getFieldValue('psCategory') : null, me.attr.dictRankID.getFieldValue('code'))
  }
  if (!result) {
    return false
  }

  result = true
  if (!!me.record.modified.positionID || !!me.record.modified.dictRankID) {
    result = await HR.orderManager.checkRankValue(me, me.attr.dictRankID, true)
  }
  if (!result) {
    return false
  }
  const checkFundSource = await HR.orderManager.checkOrderFundSource(me, me.attr.positionFundSourceDt)
  if (!checkFundSource) {
    return false
  }
  if (me.attr.dictContractKindID.getFieldValue('isTerm') && me.attr.dictContractKindID.getFieldValue('code') === '20' && me.record.get('dateToEmpty')) {
    const curPos = await UB.Repository('hr_employeePositionS')
      .attrs(['dateTo'])
      .selectById(me.record.get('employeePositionID'))
    if (AC.dateService.shiftDate(curPos.dateTo) < AC.dateService.shiftDate(me.record.get('dateToEmpty'))) {
      message = UB.i18n(`Дата закінчення поточного призначення працівника {0} наступить раніше ніж дата закінчення дії тимчасових змін за цим пунктом {1}. Наказ не може бути збережений. Оберіть інші умови призначення працівника.`, AC.dateService.formatDate(curPos.dateTo), AC.dateService.formatDate(me.record.get('dateToEmpty')))
      await $App.dialogError(message, UB.i18n('Увага!'))
      return false
    }
  }
  if (!me.record.modified.tabNum) {
    result = await isCheckVac(me)
  } else {
    message = await $App.connection.run({
      entity: me.entityName,
      method: 'checkTabNum',
      tabNum: me.record.get('tabNum'),
      organizationID: me.record.get('organizationID'),
      ID: me.instanceID
    })
  }
  if (!result) {
    return false
  }
  await HR.orderManager.checkEmpOrderAccDateFrom(me)
  result = await $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getValidatorWarning',
    validatorFn: 'checkDuplicateEmployeeNumber',
    empOrderType: me.record.get('empOrderType'),
    orderID: me.record.get('orderID'),
    extra: {
      employeePositionID: me.record.get('employeePositionID'),
      paraID: me.instanceID
    }
  })
  message = result.result || ''
  if (!message) {
    return true
  }
  return $App.dialogYesNo('Попередження', UB.i18n(`{0}. Все одно зберегти ?`, message))
}

function onBeforeClose () {
  /* const me = this
  if (me.sender) {
    const grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.onRefresh()
    }
  } */
}

async function isCheckVac (me) {
  if (!me.attr.positionID.getValue()) {
    return true
  }
  const posRecord = AC.gridUtils.getCurrentRecord(me.attr.positionID)
  const miDataId = posRecord ? posRecord.get('mi_data_id') : me.attr.positionID.getValue('mi_data_id')
  const dateFrom = AC.dateService.truncTimeToUtcNull(me.attr.dateFrom.getValue())
  const response = await $App.connection.run({
    entity: 'hr_staffUnit',
    method: 'getVacationRate',
    orderID: me.record.get('orderID'),
    orderItemID: me.instanceID,
    orderEntity: me.entityName,
    positionID: posRecord ? posRecord.get('ID') : me.attr.positionID.getValue('ID'),
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
      .where('positionID', '=', posRecord ? posRecord.get('ID') : me.attr.positionID.getValue('ID'))
      .where('orderID', '=', me.record.get('orderID'))
      .where('empOrderType', 'in', ['APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'])
      .where('ID', '<>', me.instanceID)
      .selectAsObject()
    const orderPositionOther = await UB.Repository('hr_empOrderDet')
      .attrs(['ID', 'dateFrom', 'employeeID.shortFIO'])
      .where('positionID', '=', posRecord ? posRecord.get('ID') : me.attr.positionID.getValue('ID'))
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
      orderID: me.record.get('orderID'),
      empOrderType: me.record.get('empOrderType'),
      employeePositionID: me.record.get('employeePositionID'),
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
    me.down('[name=hr_empOrderAcc]').onRefresh()
  }
}
