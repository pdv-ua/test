/* global appAC AC UB $App HR Ext */
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
  setupControls,
  filterEmployeeNumber,
  setDefaultWorkSchedule,
  fillVacationPlan,
  copyValuesFromActivePos,
  setTempWithReturnControls,
  setTabNumControls,
  onChangeEmpAccData,
  addBaseActions,
  copyFromMainPos,
  fillAccruals
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

function filterEmployeeNumber ({
  employeeID = this.record.get('employeeID'),
  dateFrom = this.getField('dateFrom').getValue(), // this.record.get('dateFrom') - без зміщення часового поясу і на сервері перетворюється в 22:00
  isChangeActivePos,
  isClear = true
} = {}) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  const employeeNumberCtrl = me.getField('employeeNumberID')
  const whereList = {
    employee: {
      expression: '[employeeID]',
      condition: employeeID ? 'equal' : 'isNull',
      value: employeeID
    },
    dateTo: {
      expression: '[dateTo]',
      condition: '>=',
      value: '#maxdate'
    },
    orgID: {
      expression: '[orgID]',
      condition: '=',
      value: this.record.get('organizationID')
    }
  }
  if (isChangeActivePos === undefined) isChangeActivePos = me.record.get('isChangeActivePos')
  if (isChangeActivePos) {
    whereList.existsEmpPos = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'exists',
      value: {
        entity: 'hr_employeePositionS',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[employeeNumberID]=[{master}.ID]',
            condition: 'custom'
          },
          dateFrom: {
            condition: '<=',
            expression: '[dateFrom]',
            value: dateFrom
          },
          dateTo: {
            condition: '>=',
            expression: '[dateTo]',
            value: dateFrom
          },
          workPlace: {
            condition: '=',
            expression: '[workPlace]',
            value: '2'
          },
          isActive: {
            condition: '=',
            expression: '[isActive]',
            value: 1
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        }
      }
    }
  } else {
    whereList.notExistsEmpPos = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'notExists',
      value: {
        entity: 'hr_employeePositionS',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[employeeNumberID]=[{master}.ID]',
            condition: 'custom'
          },
          dateFrom: {
            condition: '<=',
            expression: '[dateFrom]',
            value: dateFrom
          },
          dateTo: {
            condition: '>=',
            expression: '[dateTo]',
            value: dateFrom
          },
          isActive: {
            condition: '=',
            expression: '[isActive]',
            value: 1
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        }
      }
    }
    whereList.existsEmpPos = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'exists',
      value: {
        entity: 'hr_employeePositionS',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[employeeNumberID]=[{master}.ID]',
            condition: 'custom'
          },
          workPlace: {
            condition: '=',
            expression: '[workPlace]',
            value: '2'
          },
          isActive: {
            condition: '=',
            expression: '[isActive]',
            value: 1
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        }
      }
    }
  }
  const store = employeeNumberCtrl.getStore()
  if (!dateFrom || !dateFrom.getFullYear || !employeeID) {
    store.loadData([])
    if (!isClear) {
      employeeNumberCtrl.setValue()
    }
    store.ubRequest.whereList = {
      ID: {
        expression: '[ID]',
        condition: 'isNull'
      }
    }
    return
  }

  if (isClear) {
    employeeNumberCtrl.setValue()
  }
  $App.connection.run({
    entity: 'hr_employeeNumberS',
    fieldList: ['ID', 'description'],
    method: 'select',
    whereList: whereList
  }).then(mParams => {
    if (mParams.resultData.rowCount && me.record.get('isExistingTabNum')) {
      setTimeout(function () {
        if (!employeeNumberCtrl.getValue()) {
          employeeNumberCtrl.setValueById(mParams.resultData.data[0][0], false, () => {})
        }
        store.ubRequest.whereList = whereList
      }, 300)
    } else {
      store.loadData([])
      if (isClear) {
        employeeNumberCtrl.setValue()
      }
      store.ubRequest.whereList = whereList
    }
  })
}

function setupControls (ctrl) {
  const me = this
  if (me.isReadOnly) {
    return
  }
  let isExistingTabNumCtrl = me.getField('isExistingTabNum')
  let isNewTabNumCtrl = me.getField('isNewTabNum')
  let isNewTabNum = isNewTabNumCtrl.getValue()
  if (ctrl === isNewTabNumCtrl || !ctrl) {
    isExistingTabNumCtrl.skipChange = true
    isExistingTabNumCtrl.setValue(!isNewTabNum)
  } else if (ctrl === isExistingTabNumCtrl) {
    isNewTabNum = !ctrl.getValue()
    isNewTabNumCtrl.skipChange = true
    isNewTabNumCtrl.setValue(isNewTabNum)
  }
  delete isNewTabNumCtrl.skipChange
  delete isExistingTabNumCtrl.skipChange
  const employeeNumberCtrl = me.getField('employeeNumberID')
  const tabNumCtrl = me.getField('tabNum')
  tabNumCtrl.setDisabled(!isNewTabNum)
  employeeNumberCtrl.setDisabled(isNewTabNum)
  tabNumCtrl.setAllowBlank(!isNewTabNum)
  employeeNumberCtrl.setAllowBlank(isNewTabNum)
  me.down('[name=generateTabNumButton]').setVisible(isNewTabNum)
  me.down('[name=empOrderVacationPlanGrid]').setDisabled(me.attr.isChangeActivePos.getValue())

  if (isNewTabNum) {
    if (employeeNumberCtrl.getValue()) {
      employeeNumberCtrl.setValue()
      if (!me.isNewInstance) {
        me.getNextTabNum()
      }
    }
    if (me.isNewInstance) {
      me.getNextTabNum()
      if (me.attr.positionID.getValue() && me.attr.positionID.getFieldValue('workScheduleID')) {
        me.attr.workScheduleID.setValueById(me.attr.positionID.getFieldValue('workScheduleID'))
      } else {
        me.setDefaultWorkSchedule()
      }
    }
  } else {
    employeeNumberCtrl.getStore().load().then(store => {
      if (store.getCount() === 1) {
        setTimeout(() => {
          if (store.getAt(0)) {
            employeeNumberCtrl.setValue(store.getAt(0).get('ID'))
            const newDictCategoryECBID = store.getAt(0).get('dictCategoryECBID')
            if (newDictCategoryECBID || !me.attr.dictCategoryECBID.getValue()) me.attr.dictCategoryECBID.setValueById(newDictCategoryECBID)
          } else {
            me.attr.isChangeActivePos.setValue(false)
            setTimeout(() => {
              me.attr.isExistingTabNum.setValue(true)
            }, 300)
          }
          if (me.isNewInstance) me.setDefaultWorkSchedule()
        }, 200)
      }
    })
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
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
    HR.orderManager.disableContextMenuItems(me.getField('employeeNumberID'), ['editItem', 'showLookup', 'addItem'])
  })
  me.on('beforeClose', me.onBeforeClose)
}

function initComponentDone () {
  const me = this

  if (me.customParams.orderForm) {
    me.orderForm = me.customParams.orderForm
  } else {
    me.orderForm = me.sender.up('form')
  }

  AC.viewUtils.setAttr(me, ['acGrid'])
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('employeeNumberID')) {
      const tabNum = me.getField('employeeNumberID').getFieldValue('tabNum')
      me.record.set('tabNum', tabNum)
      me.getField('tabNum').setValue(tabNum)
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
  me.allowSelectDictPosition = AC.settings.get('hrOrderAllowSelectDictPosition', appAC.globalOrganization())
  me.down('[name=hr_empOrderAcc]').on('changeData', onChangeEmpAccData)

  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function onChangeEmpAccData (grid, event) {
  const me = grid.up('form')
  if (!me.record.get('isByHours') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'))
  }
}

function onRecordLoaded () {
  const me = this
  me.masterForm = me.customParams.orderForm
    ? me.customParams.orderForm
    : (me.sender ? me.sender.up('form') : null)

  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('empOrderType', me.masterForm.record.get('empOrderType'))
    me.attr.vacPositionID.hide()
    // me.getNextTabNum()
  } else {
    me.attr.isChangeActivePos.skipChange = true
    me.attr.employeeNumberID.skipChange = true
    HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'))
    filterVacPosition(me.attr.vacPositionID,
      me.record.get('positionID'),
      me.record.get('employeeID'),
      me.record.get('dateFrom'))
  }
}

function filterVacPosition (ctrl, posID, empID, onDate) {
  ctrl.hide()
  ctrl.setValue(null)
  if (posID && onDate && AC.dateService.isValid(onDate)) {
    $App.connection.run({
      entity: 'hr_empOrderPluralistDet',
      method: 'getVacListIDs',
      positionID: posID,
      organizationID: appAC.globalOrganization(),
      onDate: AC.dateService.shiftDate(onDate),
      exceptEmpID: empID
    }).then(resp => {
      if (resp.resultData && resp.resultData.length) {
        ctrl.getStore().ubRequest.whereList = {
          emps: {
            expression: '[ID]',
            condition: 'in',
            value: resp.resultData
          }
        }
        ctrl.getStore().reload()
        ctrl.show()
      }
    })
  }
}

async function onFormDataReady () {
  const me = this

  me.attr.employeeID.getStore().ubRequest.whereList.exist.value.whereList.orgID = {
    condition: 'equal',
    expression: '[organizationID]',
    value: me.record.get('organizationID')
  }

  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
    ['organizationID', '=', me.record.get('organizationID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  const isReadOnly = !me.masterForm || !(me.masterForm.isEditable && me.masterForm.isEditable())
  me.isReadOnly = isReadOnly
  if (isReadOnly) {
    me.down('[ubID=btnSelectByTree]').setDisabled(true)
    const empOrderExperienceGrid = me.down('[name=hr_empOrderExperience]')
    empOrderExperienceGrid && AC.gridUtils.enableCustomAction(empOrderExperienceGrid, 'fillFromExperience', false)
    const empOrderAccGrid = me.down('[name=hr_empOrderAcc]')
    empOrderAccGrid && AC.gridUtils.enableCustomAction(empOrderAccGrid, 'fillFromStaff', false)
    me.attr.positionFundSourceDt.setReadOnly(true)
    me.actions.copyFromMainPos && me.actions.copyFromMainPos.setDisabled(true)
  }
  HR.orderManager.enableControls({
    me: me,
    isEnabled: !isReadOnly
  })
  me.down('[name=generateTabNumButton]').setDisabled(isReadOnly)
  me.query('[xtype=ubdetailgrid]').forEach(item => {
    item.setReadOnly(isReadOnly)
  })
  if (!me.masterForm) {
    me.down('[xtype=tabpanel]').items.items[1].tab.hide()
  }

  if (me.isNewInstance) {
    me.attr.dictTarifCoeffID.hide()
    me.attr.contractType.setValue('1')
    const defDictContractKindID = await UB.Repository('hr_dictContractKind').attrs('ID').where('code', '=', '02').selectScalar()
    me.attr.dictContractKindID.setValueById(defDictContractKindID)
    me.attr.workPlace.setValue('2')
    me.attr.workerType.setValue('2')
    me.actions.copyFromMainPos && me.actions.copyFromMainPos.setDisabled(true)
    me.down('[ubID=factPositionBlock]').hide()
  } else {
    const positionType = me.attr.positionID.getFieldValue('positionType')
    const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)
    me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
    me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
    me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()
    AC.viewUtils.setWhereListProperty(me.attr.positionID, [
      ['mi_treePath', 'startWith', me.record.get('departmentID.mi_treePath') || '%'],
      ['orgID', '=', me.record.get('organizationID')]
    ], null, [])
    const isTerm = me.attr.dictContractKindID.getFieldValue('isTerm')
    if (!isTerm) {
      me.attr.dateToEmpty.setValue()
    }
    me.attr.dateToEmpty[['hide', 'show'][+isTerm]]()
  }
  me.setupControls(me.getField('isNewTabNum'))
  me.setTempWithReturnControls(me.record.get('isTempWithReturn'))
  if (!isReadOnly) {
    me.filterEmployeeNumber({
      isClear: false
    })
  }
  const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
  if (funcOrgType === '2') {
    me.attr.dictCostTypeID.hide()
  }
}

function getDictTarifCoeff (me, employeeID, onDate, positionID) {
  if (positionID) {
    if (!me.attr.employeeID.getValue() || !me.attr.dictTarifCoeffID.getValue() || !me.attr.accrualSum.getValue() || !me.attr.payElID.getValue()) {
      UB.Repository('hr_position')
        .attrs('accrualSum', 'payElID', 'dictTarifCoeffID')
        .where('ID', '=', positionID)
        .selectSingle()
        .then(data => {
          if (me.attr.employeeID.getValue()) {
            let employeeData = UB.Repository('hr_employeePositionS')
              .attrs('accrualSum', 'payElID', 'dictTarifCoeffID')
              .where('employeeID', '=', employeeID)
              .where('organizationID', '=', me.record.get('organizationID'))
              .where('workPlace', '=', 1)
              .where('dateFrom', '<=', onDate)
              .where('dateTo', '>=', onDate)
              .selectSingle()
            if (!employeeData.dictTarifCoeffID) {
              if (data && data.dictTarifCoeffID) {
                me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
              }
            }
            if (!employeeData.payElID) {
              if (data && data.payElID) {
                me.attr.payElID.setValueById(data.payElID)
              }
            }
            if (!employeeData.accrualSum) {
              if (data && data.accrualSum) {
                me.attr.accrualSum.setValue(data.accrualSum)
              }
            }
          } else {
            if (data && data.dictTarifCoeffID) {
              me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
            } else { me.attr.dictTarifCoeffID.setValue() }
            if (data && data.payElID) {
              me.attr.payElID.setValueById(data.payElID)
            }
            if (data && data.accrualSum) {
              me.attr.accrualSum.setValue(data.accrualSum)
            }
          }
        })
    }
  } else {
    UB.Repository('hr_employeePositionS')
      .attrs('accrualSum', 'payElID', 'dictTarifCoeffID')
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', me.record.get('organizationID'))
      .where('workPlace', '=', 1)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle()
      .then(data => {
        if (data && data.accrualSum) {
          me.attr.accrualSum.setValue(data.accrualSum)
        } else { me.attr.accrualSum.setValue() }
        if (data && data.payElID) {
          me.attr.payElID.setValueById(data.payElID)
        } else { me.attr.payElID.setValue() }
        if (data && data.dictTarifCoeffID) {
          me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
        } else { me.attr.dictTarifCoeffID.setValue() }
      })
  }
}

function onControlChanged (field, value) {
  const me = this

  async function onChangePositionID () {
    const positionType = me.attr.positionID.getFieldValue('positionType')
    const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)
    me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
    me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
    me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
    me.attr.posNameAddition.setValue(me.allowSelectDictPosition ? field.getFieldValue('nameAddition') : null)
    me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()
    me.attr.dictPositionID.setValueById(field.getFieldValue('dictPositionID'))
    const posWorkScheduleID = field.getFieldValue('workScheduleID')
    me.attr.workScheduleID.setValueById(posWorkScheduleID)
    if (showFactPos && value) {
      me.attr.dictEmpCategoryID.setValueById(field.getFieldValue('dictEmpCategoryID'))
    } else {
      me.attr.dictEmpCategoryID.setValue()
    }

    const posDictStaffCatID = field.getFieldValue('dictStaffCatID')
    const posDictStaffSubCatID = field.getFieldValue('dictStaffSubCatID')
    const dictStaffSubCat = posDictStaffSubCatID ? await UB.Repository('hr_dictStaffSubCat').attrs('payStaffCatID').selectById(posDictStaffSubCatID) : null
    if (dictStaffSubCat && dictStaffSubCat.payStaffCatID) {
      me.attr.dictStaffCatID.setValueById(dictStaffSubCat.payStaffCatID)
    } else {
      me.attr.dictStaffCatID.setValueById(posDictStaffCatID)
    }
    if (!positionType) {
      return
    }
    let dictContractKindID = await UB.Repository('hr_dictContractKind').attrs('ID').where('name', '=', UB.i18n('на визначений строк')).selectScalar()
    if (!dictContractKindID) dictContractKindID = await UB.Repository('hr_dictContractKind').attrs('ID').where('isTerm', '=', true).selectScalar()
    const data = await UB.Repository('hr_positionTypeProps')
      .attrs(['contractType', 'dictContractKindID', 'dictStaffCatID', 'payElID', 'workPlace', 'workScheduleID', 'workerType'])
      .where('positionType', '=', positionType)
      .selectSingle()
    if (data) {
      if (!me.attr.contractType.getValue()) me.attr.contractType.setValue(data.contractType)
      if (!me.attr.dictContractKindID.getValue()) me.attr.dictContractKindID.setValueById(dictContractKindID || data.dictContractKindID)
      if (!me.attr.workerType.getValue()) me.attr.workerType.setValue(data.workerType)
      if (!posDictStaffCatID && data.dictStaffCatID) me.attr.dictStaffCatID.setValueById(data.dictStaffCatID)
      if (!posWorkScheduleID && data.workScheduleID) me.attr.workScheduleID.setValueById(data.workScheduleID)
    } else {
      if (!me.attr.dictContractKindID.getValue() && dictContractKindID) me.attr.dictContractKindID.setValueById(dictContractKindID)
      if (!posWorkScheduleID) me.attr.workScheduleID.setValueById(me.attr.positionID.getFieldValue('workScheduleID'))
    }
    me.attr.workPlace.setValue('2')
    if (!me.attr.workScheduleID.getValue() || !me.attr.dictStaffCatID.getValue() || !me.attr.dictCategoryECBID.getValue()) {
      const employeeCtrl = me.getField('employeeID')
      const employeeID = employeeCtrl.getValue()
      const mainPosData = await UB.Repository('hr_employeePositionS')
        .attrs(['workScheduleID', 'dictStaffCatID', 'dictCategoryECBID'])
        .where('employeeID', '=', employeeID)
        .where('workPlace', '=', '1')
        .orderBy('dateFrom', 'desc')
        .selectSingle()
      if (mainPosData && mainPosData.workScheduleID && !me.attr.workScheduleID.getValue()) {
        me.attr.workScheduleID.setValueById(mainPosData.workScheduleID)
      }
      if (mainPosData && mainPosData.dictStaffCatID && !me.attr.dictStaffCatID.getValue()) {
        me.attr.dictStaffCatID.setValueById(mainPosData.dictStaffCatID)
      }
      if (mainPosData && mainPosData.dictCategoryECBID && !me.attr.dictCategoryECBID.getValue()) {
        me.attr.dictCategoryECBID.setValueById(mainPosData.dictCategoryECBID)
      }
    }
    me.attr.dictCostTypeID.setValueById(field.getFieldValue('dictCostTypeID'))
  }

  if (field.skipChange) {
    delete field.skipChange
    return
  }
  switch (field.name) {
    case 'employeeID':
      getDictTarifCoeff(me, value, me.attr.dateFrom.getValue() || appAC.globalApplicationDate())
      me.filterEmployeeNumber({
        employeeID: value,
        isClear: true
      })
      me.setTabNumControls(value)
      me.setDefaultWorkSchedule()
      const useSingleTabNum = AC.settings.get('hrUseSingleEmployeeTabNum', appAC.globalOrganization())
      if (useSingleTabNum) {
        me.getNextTabNum()
      }
      me.actions.copyFromMainPos && me.actions.copyFromMainPos.setDisabled(!value || !me.attr.dateFrom.getValue())
      Promise.all([me.down('[name=hr_empOrderAcc]').onRefresh()])
        .then(() => {
          if (me.down('[name=hr_empOrderAcc]').getStore().getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити існуючі записи з нарахуваннями?')).then(isAgree => {
              if (isAgree) {
                doClearExpAndAccruals(me)
              }
            })
          }
        })
      if (me.isFundSourceAccounting === 'STAFF') {
        HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'), true)
      }
      break
    case 'positionID':
      onChangePositionID()
      getDictTarifCoeff(me, me.attr.employeeID.getValue(), me.attr.dateFrom.getValue() || appAC.globalApplicationDate(), value)
      HR.orderManager.loadOrderFundSource(me, value, true)
      break
    case 'dateFrom':
      me.actions.copyFromMainPos && me.actions.copyFromMainPos.setDisabled(!value || !me.attr.employeeID.getValue())
      if (field.value && AC.dateService.isDateString(field.getRawValue())) {
        getDictTarifCoeff(me, me.attr.employeeID.getValue(), value || appAC.globalApplicationDate())
        me.filterEmployeeNumber({
          dateFrom: value
        })
      }
      break
    case 'dictContractKindID':
      const isTerm = field.getFieldValue('isTerm')
      if (!isTerm) {
        me.attr.dateToEmpty.setValue()
      }
      me.attr.dateToEmpty[['hide', 'show'][+isTerm]]()
      break
    case 'employeeNumberID':
      if (value && me.attr.isChangeActivePos.getValue()) {
        me.copyValuesFromActivePos(value)
      } else {
        HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'), true)
      }
      const newDictCategoryECBID = field.getFieldValue('dictCategoryECBID')
      if (newDictCategoryECBID) me.attr.dictCategoryECBID.setValueById(newDictCategoryECBID)
      break
    case 'isChangeActivePos':
      if (value) me.attr.isExistingTabNum.setValue(value)
      me.filterEmployeeNumber({
        isChangeActivePos: value
      })
      me.down('[name=empOrderVacationPlanGrid]').setDisabled(value)
      break
    case 'isExistingTabNum':
      me.setupControls(field)
      break
    case 'isTempWithReturn':
      me.setTempWithReturnControls(value)
      if (!me.attr.employeeID.getValue()) return
      if (!me.isReadOnly && value) {
        UB.Repository('hr_dictContractKind')
          .attrs('ID')
          .where('code', '=', '20')
          .selectSingle().then(item => {
            if (item) {
              me.attr.dictContractKindID.setValueById(item.ID)
            }
          })
      }
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
    case 'dictTarifCoeffID':
      HR.orderManager.calcTarifAccrualSum(me, value)
      break
  }

  if (field.name === 'positionID' || field.name === 'employeeID' || field.name === 'dateFrom') {
    filterVacPosition(me.attr.vacPositionID,
      me.attr.positionID.value, me.attr.employeeID.value, me.attr.dateFrom.value)
  }
}

function doClearExpAndAccruals (me) {
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'clearOrderAccruals',
    empOrderDetID: me.instanceID
  }).then(() => {
    me.down('[name=hr_empOrderAcc]').onRefresh()
  })
}

function setTabNumControls (value) {
  const me = this
  let employeeID = me.getField('employeeID').getValue()
  if (value && employeeID) {
    let onDate = me.getField('dateFrom').getValue()
    if (onDate && AC.dateService.isValid(onDate)) {
      onDate = AC.dateService.shiftDate(onDate)
    } else {
      onDate = appAC.globalApplicationDate()
    }
    UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', me.record.get('organizationID'))
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('workPlace', '=', '2')
      .orderBy('dateTo', 'desc')
      .selectSingle()
      .then(empPosData => {
        if (empPosData) {
          if (empPosData['dateFrom'] < onDate && onDate < empPosData['dateTo']) {
            me.attr.isChangeActivePos.setValue(true)
          } else {
            me.attr.isExistingTabNum.setValue(true)
          }
        } else {
          me.attr.isChangeActivePos.setValue(false)
          me.attr.isNewTabNum.setValue(true)
        }
      })
  }
}

function setTempWithReturnControls (value) {
  const me = this
  me.down('[name=labelTempWithReturn]')[['hide', 'show'][+value]]()
  me.attr.dictContractKindID.setDisabled(value)
}

function fillVacationPlan (dateFrom, dateTo) {
  const me = this
  const grid = me.down('[entityName=hr_empOrderVacationPlan]')
  return grid.getStore().load().then(store => {
    const askPromise = store.getCount() > 0 ? $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Змінити дані вкладки "Право на відпустки"?')) : Promise.resolve(true)
    return askPromise.then(isAgree => {
      if (isAgree) {
        const employeeID = me.record.get('employeeID')
        const employeeNumberID = me.record.get('employeeNumberID')
        const positionIDCtrl = me.attr.positionID
        const positionIDReco = AC.gridUtils.getCurrentRecord(positionIDCtrl)
        const positionType = (positionIDReco && positionIDReco.get('positionType')) || '0'
        const isNewTabNum = me.record.get('isNewTabNum')
        return $App.connection.run({
          entity: 'hr_empOrderVacationPlan',
          method: 'addDefaultPluralistVacationPlan',
          employeeID: employeeID,
          employeeNumberID: employeeNumberID,
          positionType: positionType,
          dateFrom: dateFrom,
          dateTo: dateTo,
          planKindOption: !isNewTabNum ? 'EMPPLAN' : 'PLANDAY',
          orderDetID: me.instanceID
        }).then(() => {
          return grid.getStore().load()
        })
      } else {
        return Promise.resolve(true)
      }
    })
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
  let dateFrom = me.attr.dateFrom.getValue()
  let dateTo = me.attr.dateToEmpty && me.attr.dateToEmpty.getValue()
  me.record.set('tabDate', dateFrom)
  if (!me.isNewInstance && !me.attr.isChangeActivePos.getValue() && (me.record.modified.hasOwnProperty('dateFrom') || me.record.modified.hasOwnProperty('employeeID') || me.record.modified.hasOwnProperty('positionID') || me.record.modified.hasOwnProperty('dateToEmpty'))) {
    await me.fillVacationPlan(dateFrom, dateTo)
  }
  if (me.record.get('isNewTabNum')) {
    const mParams = await $App.connection.run({
      entity: 'hr_empOrderAppointDet',
      method: 'checkTabNum',
      tabNum: me.record.get('tabNum'),
      organizationID: me.record.get('organizationID'),
      employeeID: me.record.get('employeeID'),
      ID: me.instanceID
    })
    if (mParams.info) {
      const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`{0}. Все одно зберегти ?`, mParams.info))
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
  if (me.attr.dictContractKindID.getFieldValue('isTerm') && me.attr.dictContractKindID.getFieldValue('code') === '20' && me.record.get('dateToEmpty')) {
    if (!me.record.get('isChangeActivePos')) {
      const message = UB.i18n(`Не обрано призначення та встановлена дата закінчення дії тимчасових змін за цим пунктом {0}. Наказ не може бути збережений. Оберіть інші умови призначення працівника.`, AC.dateService.formatDate(me.record.get('dateToEmpty')))
      await $App.dialogError(message, UB.i18n('Увага!'))
      return false
    }
    const curPos = await UB.Repository('hr_employeePositionS')
      .attrs(['dateTo'])
      .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
      .where('dateFrom', '<=', me.record.get('dateFrom'))
      .where('dateTo', '>=', me.record.get('dateFrom'))
      .selectSingle() || {}
    if (AC.dateService.shiftDate(curPos.dateTo) < AC.dateService.shiftDate(me.record.get('dateToEmpty'))) {
      const message = UB.i18n(`Дата закінчення поточного призначення працівника "{0}" наступить раніше ніж дата закінчення дії тимчасових змін за цим пунктом "{1}". Наказ не може бути збережений. Оберіть інші умови призначення працівника.`, AC.dateService.formatDate(curPos.dateTo), AC.dateService.formatDate(me.record.get('dateToEmpty')))
      await $App.dialogError(message, UB.i18n('Увага!'))
      return false
    }
  }
  await HR.orderManager.checkEmpOrderAccDateFrom(me)
  return true
}

function onBeforeClose () {
  /*
  const me = this
  if (me.sender) {
    let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.getStore().load()
    }
  }
  */
}

function getNextTabNum () {
  const me = this
  $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getNextTabNum',
    orderItemID: me.instanceID,
    orderEntity: 'hr_empOrderPluralistDet',
    organizationID: me.record.get('organizationID'),
    employeeID: me.attr.employeeID.getValue()
  }).then(({
    tabNum
  }) => {
    me.getField('tabNum').setValue(String(tabNum))
    me.record.set('tabNum', String(tabNum))
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
        onDate: me.record.get('dateFrom'),
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

function setDefaultWorkSchedule () {
  const me = this
  const workScheduleIDCtrl = me.getField('workScheduleID')
  const employeeNumberCtrl = me.getField('employeeNumberID')
  const employeeNumberID = employeeNumberCtrl.getValue()
  let existedEnPosPromise
  if (employeeNumberID) {
    existedEnPosPromise = UB.Repository('hr_employeePositionS')
      .attrs(['workScheduleID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .orderBy('dateFrom', 'desc')
      .selectSingle()
  } else {
    existedEnPosPromise = Promise.resolve()
  }
  existedEnPosPromise.then(existedEnPos => {
    if (existedEnPos && existedEnPos.workScheduleID) {
      workScheduleIDCtrl.setValueById(existedEnPos.workScheduleID)
    } else {
      const employeeCtrl = me.getField('employeeID')
      const employeeID = employeeCtrl.getValue()
      UB.Repository('hr_employeePositionS')
        .attrs(['workScheduleID'])
        .where('employeeID', '=', employeeID)
        .where('workPlace', '=', '1')
        .orderBy('dateFrom', 'desc')
        .selectSingle().then(basePos => {
          if (basePos && basePos.workScheduleID) {
            workScheduleIDCtrl.setValueById(basePos.workScheduleID)
          }
        })
    }
  })
}

async function copyValuesFromActivePos (employeeNumberID) {
  const me = this
  if (!employeeNumberID) employeeNumberID = me.record.get('employeeNumberID')
  const onDate = me.record.get('dateFrom')
  const pos = await UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'departmentID', 'positionID', 'dictTarifCoeffID', 'contractType', 'dictContractKindID',
      'dateFrom', 'dateTo', 'workPlace', 'workerType', 'dictStaffCatID', 'workScheduleID', 'dictCategoryECBID', 'mtCount',
      'isResponsible', 'payElID', 'accrualSum'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.state', '=', 'ACTIVE')
    .where('workPlace', '=', '2')
    .selectSingle()
  if (pos) {
    me.setLoading(true)
    const departmentID = await UB.Repository('hr_department')
      .attrs('ID')
      .where('mi_data_id', '=', pos.departmentID || null)
      .misc({ __mip_ondate: onDate })
      .where('state', '=', 'ACTIVE')
      .selectScalar()
    const positionID = await UB.Repository('hr_position')
      .attrs('ID')
      .where('mi_data_id', '=', pos.positionID || null)
      .misc({ __mip_ondate: onDate })
      .where('state', '=', 'ACTIVE')
      .selectScalar()
    const empFundSource = await UB.Repository('hr_empPosFundSource')
      .attrs('dictFundSourceID', 'dictFundSourceID.description', 'mtCount')
      .where('employeePositionID', '=', pos.ID)
      .selectAsObject()
    const { result } = await $App.connection.run({
      entity: 'hr_empOrderFundSource',
      method: 'getPosFundSourceData',
      positionID: positionID,
      onDate: me.record.get('dateFrom') || appAC.globalApplicationDate()
    })
    const posFundSource = JSON.parse(result) || []

    me.attr.departmentID.setValueById(departmentID)
    setTimeout(() => {
      me.attr.positionID.skipChange = true
      me.attr.positionID.setValueById(positionID)
    }, 300)
    me.attr.dictTarifCoeffID.setValueById(pos.dictTarifCoeffID)
    me.attr.contractType.setValue(pos.contractType)
    if (!me.attr.isTempWithReturn.getValue()) {
      me.attr.dictContractKindID.setValueById(pos.dictContractKindID)
    }
    me.attr.dateToEmpty.setValue(AC.dateService.isMaxDate(pos.dateTo) ? null : pos.dateTo)
    me.attr.workPlace.setValue(pos.workPlace)
    me.attr.workerType.setValue(pos.workerType)
    me.attr.dictStaffCatID.setValueById(pos.dictStaffCatID)
    me.attr.workScheduleID.setValueById(pos.workScheduleID)
    me.attr.dictCategoryECBID.setValueById(pos.dictCategoryECBID)
    me.attr.mtCount.setValue(pos.mtCount)
    me.attr.isResponsible.setValue(pos.isResponsible)
    me.attr.payElID.setValueById(pos.payElID)
    me.attr.accrualSum.setValue(pos.accrualSum)
    me.attr.positionFundSourceDt.removeAll()
    empFundSource.forEach(row => {
      const item = posFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)
      if (item) {
        item.mtCount = row.mtCount
        item.orderID = me.record.get('orderID')
      } else {
        posFundSource.push({
          ID: null,
          orderID: me.record.get('orderID'),
          dictFundSourceID: row.dictFundSourceID,
          'dictFundSourceID.description': row['dictFundSourceID.description'],
          posTotal: null,
          posVac: null,
          mtCount: row.mtCount
        })
      }
    })
    me.attr.positionFundSourceDt.setLocalStoreData(posFundSource)
    me.attr.positionFundSourceDt.GridSummary.dataBind()
    me.setLoading(false)
  } else {
    HR.orderManager.loadOrderFundSource(me, me.record.get('positionID'), true)
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

async function copyFromMainPos () {
  const me = this
  const onDate = AC.dateService.shiftDate(me.record.get('dateFrom'))
  const employeeID = me.record.get('employeeID')
  if (!onDate || !employeeID) return
  const mainPos = await UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'departmentID', 'positionID', 'dictTarifCoeffID', 'contractType', 'dictContractKindID',
      'dateFrom', 'dateTo', 'workPlace', 'workerType', 'dictStaffCatID', 'workScheduleID', 'dictCategoryECBID', 'mtCount',
      'isResponsible', 'payElID', 'accrualSum', 'employeeNumberID'])
    .where('employeeID', '=', employeeID)
    .where('organizationID', '=', me.record.get('organizationID'))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('workPlace', '=', '1')
    .limit(1)
    .selectSingle()
  if (mainPos) {
    const doFill = async function () {
      try {
        const sleep = function (ms) {
          return new Promise(resolve => setTimeout(resolve, ms))
        }
        me.setLoading(true)
        const departmentID = await UB.Repository('hr_department')
          .attrs('ID')
          .where('mi_data_id', '=', mainPos.departmentID || null)
          .misc({ __mip_ondate: onDate })
          .where('state', '=', 'ACTIVE')
          .selectScalar()
        const positionID = await UB.Repository('hr_position')
          .attrs('ID')
          .where('mi_data_id', '=', mainPos.positionID || null)
          .misc({ __mip_ondate: onDate })
          .where('state', '=', 'ACTIVE')
          .selectScalar()
        const empFundSource = await UB.Repository('hr_empPosFundSource')
          .attrs('dictFundSourceID', 'dictFundSourceID.description', 'mtCount')
          .where('employeePositionID', '=', mainPos.ID)
          .selectAsObject()
        const { result } = await $App.connection.run({
          entity: 'hr_empOrderFundSource',
          method: 'getPosFundSourceData',
          positionID: positionID,
          onDate: me.record.get('dateFrom') || appAC.globalApplicationDate()
        })
        const posFundSource = JSON.parse(result) || []

        me.attr.departmentID.skipChange = true
        me.record.set('departmentID', departmentID)
        HR.controlService.filterUnitByParent(me.attr.positionID, mainPos.departmentID, [])
        me.attr.positionID.skipChange = true
        me.record.set('positionID', positionID)
        me.record.set('dictTarifCoeffID', mainPos.dictTarifCoeffID)
        me.attr.contractType.setValue(mainPos.contractType)
        if (!me.attr.isTempWithReturn.getValue()) {
          me.record.set('dictContractKindID', mainPos.dictContractKindID)
        }
        me.attr.dateToEmpty.setValue(AC.dateService.isMaxDate(mainPos.dateTo) ? null : mainPos.dateTo)
        me.attr.workerType.setValue(mainPos.workerType)
        me.record.set('dictStaffCatID', mainPos.dictStaffCatID)
        me.record.set('workScheduleID', mainPos.workScheduleID)
        me.record.set('dictCategoryECBID', mainPos.dictCategoryECBID)
        me.attr.isResponsible.setValue(mainPos.isResponsible)
        me.record.set('payElID', mainPos.payElID)
        me.attr.accrualSum.setValue(mainPos.accrualSum)
        if (!me.attr.mtCount.getValue()) {
          me.attr.mtCount.setValue(mainPos.mtCount)
          await sleep(600)
        }
        me.attr.positionFundSourceDt.removeAll()
        empFundSource.forEach(row => {
          const item = posFundSource.find(o => o.dictFundSourceID === row.dictFundSourceID)
          if (item) {
            item.mtCount = 0
            item.orderID = me.record.get('orderID')
          } else {
            posFundSource.push({
              ID: null,
              orderID: me.record.get('orderID'),
              dictFundSourceID: row.dictFundSourceID,
              'dictFundSourceID.description': row['dictFundSourceID.description'],
              posTotal: null,
              posVac: null,
              mtCount: 0
            })
          }
        })
        if (me.attr.mtCount.getValue() && posFundSource.length) {
          posFundSource[0].mtCount = me.attr.mtCount.getValue()
        }
        me.attr.positionFundSourceDt.setLocalStoreData(posFundSource)
        me.attr.positionFundSourceDt.GridSummary.dataBind()
        const saveResult = await me.saveForm()
        if (saveResult !== -1) {
          await $App.connection.run({
            entity: 'hr_empOrder',
            method: 'fillOrderAccrualWithSave',
            empOrderDetID: me.instanceID,
            empOrderID: me.record.get('orderID'),
            employeeNumberID: mainPos['employeeNumberID'],
            dateFrom: onDate,
            dateTo: me.record.get('dateToEmpty'),
            uniqueID: AC.dataService.getUniqueInt(),
            skipError: true
          }).then(() => {
            return grid.onRefresh()
          })
        }
        me.setLoading(false)
      } catch (err) {
        me.setLoading(false)
        throw err
      }
    }
    const grid = me.down('[name=hr_empOrderAcc]')
    await grid.getStore().load()
    if (grid.getStore().getCount()) {
      const isAgree = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити існуючі записи по нарахуванням ?'))
      if (isAgree) {
        await doFill()
      }
    } else {
      await doFill()
    }
  } else {
    await $App.dialogInfo(UB.i18n('Для працівника {0} станом на {1} не знайдено основного місця роботи', me.attr.employeeID.getFieldValue('fullFIO'), AC.dateService.formatDate(onDate)), 'Попередження')
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let copyFromMainPosAction = me.actions.copyFromMainPos
  if (!copyFromMainPosAction) {
    copyFromMainPosAction = new Ext.Action({
      actionId: 'copyFromMainPos',
      eventId: 'copyFromMainPos',
      text: UB.i18n('Заповнити з основного'),
      iconCls: 'u-icon-copy-alt',
      handler: function () {
        me.copyFromMainPos()
      }
    })
    me.actions.copyFromMainPos = copyFromMainPosAction
  }
}

async function fillAccruals (source = 'main') {
  const me = this
  const doFill = async function () {
    const onDate = AC.dateService.unshiftDate(me.record.get('dateFrom'))
    const employeeID = me.record.get('employeeID')
    if (!onDate || !employeeID) return
    let employeeNumberID
    if (source === 'main') {
      employeeNumberID = await UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID'])
        .where('employeeID', '=', employeeID)
        .where('dateFrom', '<=', AC.dateService.shiftDate(onDate))
        .where('dateTo', '>=', AC.dateService.shiftDate(onDate))
        .where('organizationID', '=', me.record.get('organizationID'))
        .where('workPlace', '=', '1')
        .limit(1)
        .selectScalar()
      if (!employeeNumberID) {
        await $App.dialogInfo(UB.i18n('Для працівника {0} станом на {1} не знайдено основного місця роботи', me.attr.employeeID.getFieldValue('fullFIO'), AC.dateService.formatDate(onDate)), 'Попередження')
      }
    } else if (source === 'previous') {
      employeeNumberID = me.record.get('employeeNumberID')
      if (!employeeNumberID) {
        await $App.dialogInfo(UB.i18n('Для працівника {0} не знайдено попереднього призначення', me.attr.employeeID.getFieldValue('fullFIO')), 'Попередження')
      }
    }
    if (employeeNumberID) {
      try {
        me.setLoading(true)
        const saveResult = await me.saveForm()
        if (saveResult !== -1) {
          await $App.connection.run({
            entity: 'hr_empOrder',
            method: 'fillOrderAccrualWithSave',
            empOrderDetID: me.instanceID,
            empOrderID: me.record.get('orderID'),
            employeeNumberID,
            dateFrom: onDate,
            dateTo: me.record.get('dateToEmpty'),
            uniqueID: AC.dataService.getUniqueInt(),
            skipError: true
          }).then(() => {
            return grid.onRefresh()
          })
        }
        me.setLoading(false)
      } catch (err) {
        me.setLoading(false)
        throw err
      }
    }
  }

  const grid = me.down('[name=hr_empOrderAcc]')
  await grid.getStore().load()
  if (grid.getStore().getCount()) {
    const isAgree = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Видалити існуючі записи по нарахуванням ?'))
    if (isAgree) {
      await doFill()
    }
  } else {
    await doFill()
  }
}
