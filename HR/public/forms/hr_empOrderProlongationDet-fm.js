/* global appAC UB AC $App HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  filterVacPositionID,
  showPrevAccrualSum,
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
  if (!notShowSalary && prevAccrualSum) { // <span style="color:darkgray;font-weight: bold;">
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
    me.record.set('orderID', me.masterForm.instanceID)
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
}

function showFields () {
  const me = this
  const positionType = me.attr.positionID.getFieldValue('positionType')
  const isTariff = positionType === POSITION_TYPE.TARIFF
  const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

  me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
  me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
  me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
  me.attr.dateToEmpty[['hide', 'show'][+(me.record.get('dictContractKindID.isTerm'))]]()
  me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
  me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
  me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()
}

function onFormDataReady () {
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
    me.down('[ubID=factPositionBlock]').hide()
    me.isRollBackValue = false
  } else {
    me.showFields()
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    if (notShowSalary) {
      me.attr.accrualSum.hide()
    }
  }
  me.showPrevAccrualSum()
  me.attr.positionID.setAllowBlank(false)
  const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
  if (funcOrgType === '2') {
    me.attr.dictCostTypeID.hide()
  }
  me.setControlsByWorkPlace(me.attr.workPlace.getValue())
  if (me.record.get('dictTarifCoeffID') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
    me.down('[ubID=accrualLabel]').show()
    HR.orderManager.calcTarifAccrualSum(me, me.record.get('dictTarifCoeffID'), true)
  }

  me.attr.reason[AC.settings.get('hrEnableReasonDoc', appAC.globalOrganization()) ? 'show' : 'hide']()
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
  if (!me.record.get('isByHours') && me.attr.positionID.getFieldValue('positionType') === POSITION_TYPE.TARIFF) {
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
  if (field.skipChange) {
    delete field.skipChange
    return
  }
  switch (field.name) {
    case 'isPreservExistCharges':
      const dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || me.orderForm.record.get('orderDate'))
      const employeeID = me.attr.employeePositionID.getFieldValue('employeeID')
      if (value) {
        const grid = me.down('entitygridpanel')
        if (!employeeID) {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вказаний працівник'))
          doCleanOrderAccrual(me, grid)
          me.attr.isPreservExistCharges.setValue(false)
          return
        }
        if (!me.isRollBackValue) {
          grid.getStore().load().then(() => {
            if (grid.getStore().getCount()) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Всі внесені в блоці Нарахування дані будуть видалені! Продовжити?')).then(isAgree => {
                if (isAgree) {
                  doFillOrderAccrual(me, grid, employeeID, dateFrom)
                } else {
                  me.isRollBackValue = true
                  me.attr.isPreservExistCharges.setValue(false)
                }
              })
            } else {
              doFillOrderAccrual(me, grid, employeeID, dateFrom)
            }
          })
        } else {
          me.isRollBackValue = false
        }
      } else {
        const grid = me.down('entitygridpanel')
        if (!me.isRollBackValue) {
          grid.getStore().load().then(() => {
            if (grid.getStore().getCount()) {
              $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Всі внесені в блоці Нарахування дані будуть видалені! Продовжити?')).then(isAgree => {
                if (isAgree) {
                  doFillOrderAccrual(me, grid, employeeID, dateFrom, 1)
                } else {
                  me.isRollBackValue = true
                  me.attr.isPreservExistCharges.setValue(true)
                }
              })
            }
          })
        } else {
          me.isRollBackValue = false
        }
      }
      break
    case 'employeePositionID':
      const copyAttrList = ['workPlace', 'accrualSum', 'dictCategoryECBID', 'contractType', 'dictContractKindID', 'dictStaffCatID',
        'payElID', 'workScheduleID', 'workerType', 'dictFundSourceID', 'dictCostTypeID', 'dictEmpCategoryID', 'dictTarifCoeffID',
        'posNameAddition', 'dictPositionID']
      me.attr.isPreservExistCharges.setValue(false)
      copyAttrList.forEach(attr => {
        if (me.attr[attr]) {
          const val = field.getFieldValue(attr)
          if (attr !== 'departmentID') me.attr[attr].skipChange = true
          if (me.attr[attr].setValueById) {
            me.attr[attr].setValueById(val)
          } else {
            me.attr[attr].setValue(val)
          }
        }
      })
      Promise.all([
        UB.Repository('hr_department')
          .attrs('ID')
          .where('mi_data_id', '=', field.getFieldValue('departmentID'))
          .where('state', '=', 'ACTIVE')
          .misc({
            __mip_ondate: appAC.globalApplicationDate()
          })
          .limit(1)
          .selectSingle(),
        UB.Repository('hr_position')
          .attrs(['ID', 'positionType'])
          .where('mi_data_id', '=', field.getFieldValue('positionID'))
          .where('state', '=', 'ACTIVE')
          .misc({
            __mip_ondate: appAC.globalApplicationDate()
          })
          .limit(1)
          .selectSingle()
      ]).then(([dep, pos]) => {
        dep && me.attr.departmentID.setValueById(dep.ID)
        if (pos) {
          me.attr.positionID.skipChange = true
          me.attr.positionID.setValueById(pos.ID)
          const isTariff = pos.positionType === POSITION_TYPE.TARIFF
          const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(pos.positionType)
          me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
          me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
          me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
          me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
          me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
          me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()
        }
      })
      if (value) {
        loadEmpPosFundSource(me, value)
      } else {
        me.attr.positionFundSourceDt.removeAll()
      }
      break
    case 'positionID':
      const accrualSum = me.attr.positionID.getFieldValue('accrualSum')
      me.attr.accrualSum.setValue(accrualSum)

      const positionType = me.attr.positionID.getFieldValue('positionType')
      const isTariff = positionType === POSITION_TYPE.TARIFF
      const isWorker = positionType === POSITION_TYPE.WORKER
      const showFactPos = [POSITION_TYPE.EMPLOYEE, POSITION_TYPE.TARIFF, POSITION_TYPE.WORKER].includes(positionType)

      me.attr.dictTarifCoeffID[showFactPos ? 'show' : 'hide']()
      me.attr.dictTarifCoeffID.setAllowBlank([true, false][+(isTariff)])
      me.attr.dictEmpCategoryID[showFactPos ? 'show' : 'hide']()
      if ((isTariff || isWorker) && value) {
        me.attr.dictEmpCategoryID.setValueById(field.getFieldValue('dictEmpCategoryID'))
      } else {
        me.attr.dictEmpCategoryID.setValue()
      }
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
      me.attr.dictPositionID[me.allowSelectDictPosition ? 'show' : 'hide']()
      me.attr.posNameAddition[me.allowSelectDictPosition ? 'show' : 'hide']()
      me.attr.posNameAddition.setValue(me.allowSelectDictPosition ? field.getFieldValue('nameAddition') : null)
      me.down('[ubID=factPositionBlock]')[showFactPos || me.allowSelectDictPosition ? 'show' : 'hide']()

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
      break
    case 'dateFrom':
      if (field.value && AC.dateService.isDateString(field.getRawValue())) {
        me.filterVacPositionID(false)
        getEmployeeTarifCoeff(me, me.attr.employeePositionID.getFieldValue('employeeID'), value || appAC.globalApplicationDate())
      } else {
        me.attr.vacPositionID.setValueById()
        me.attr.vacPositionID.hide()
      }
      break
    case 'dictContractKindID':
      const isTerm = me.attr.dictContractKindID.getFieldValue('isTerm') || false
      me.attr.dateToEmpty[['hide', 'show'][+isTerm]]()
      if (!isTerm) {
        me.attr.dateToEmpty.setValue()
      }
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
        })
      break
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
  }
}

async function loadEmpPosFundSource (me, employeePositionID) {
  me.setLoading(true)
  const empFundSource = await UB.Repository('hr_empPosFundSource')
    .attrs('dictFundSourceID', 'dictFundSourceID.description', 'mtCount')
    .where('employeePositionID', '=', employeePositionID)
    .selectAsObject()
  const positionID = await UB.Repository('hr_position')
    .attrs('ID')
    .where('mi_data_id', '=', me.attr.employeePositionID.getFieldValue('positionID') || null)
    .misc({ __mip_ondate: me.record.get('dateFrom') || appAC.globalApplicationDate() })
    .where('state', '=', 'ACTIVE')
    .selectScalar()
  const { result } = await $App.connection.run({
    entity: 'hr_empOrderFundSource',
    method: 'getPosFundSourceData',
    positionID: positionID,
    onDate: me.record.get('dateFrom') || appAC.globalApplicationDate()
  })
  const posFundSource = JSON.parse(result) || []
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
}

async function onBeforeSave () {
  const me = this
  let message = ''
  me.record.set('tabDate', me.record.get('dateFrom'))
  let result = true
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
  const checkFundSource = await HR.orderManager.checkOrderFundSource(me, me.attr.positionFundSourceDt)
  if (!checkFundSource) {
    return false
  }
  if (me.record.get('workPlace') === '1' && me.record.get('mtCount') > 1) {
    const isAgree = await $App.dialogYesNo('Попередження', UB.i18n(`Увага, кількість ставок працівника за основним місцем роботи більше 1. Продовжити?`))
    if (!isAgree) return false
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
  }
}
