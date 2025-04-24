/* global Ext $App UB HR AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  enableControls,
  addBaseActions,
  onBeforeSave,
  onAfterSave,
  onFormRefresh,
  setVacationDays,
  setVacationDateTo,
  checkDates,
  checkAddedDays,
  fillVacationList,
  fillVacationListA,
  fillPeriodList,
  recalcIsPart,
  recalcVacPeriodDays,
  recalcVacPeriodDateTo,
  checkPeriodDayCount,
  onAfterRender,
  refreshCalcData,
  setHolidayInfo,
  checkPosition,
  checkVacCrossPeriod,
  validate,
  validateForm,
  validateVacList,
  validateVacListItem,
  clearErrors,
  loadLookupStores,
  onActingEdited,
  startActingGridEdit,
  getActingPayEl,
  validateActing,
  onBeforeClose
}

function validateActing (errors) {
  const me = this
  let aGrid = me.down('[name=hr_empOrderActingDet]')
  const errorTag = 1
  if (!aGrid) {
    return
  }
  aGrid.store.data.items.forEach(rec => {
    if (!rec.get('payElID')) {
      errors.push({
        tag: errorTag,
        code: 'actingCheck',
        msg: UB.i18n(`ТВО {0} - не вказано вид оплати за заміщення`, rec.get('employeePositionID.description'))
      })
    }
  })
}

function onActingEdited (rowEditor, context) {
  const me = this
  const hrCheckPayElActing = AC.settings.get('hrCheckPayElActing', me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()) || 0
  if (hrCheckPayElActing) {
    if (!context.record.get('payElID')) {
      $App.dialogError(UB.i18n('Не вказано вид оплати за ТВО. Для автоматичної передачі виплати за додаткове навантаження наказу в заробітну плату необхідно заповнити відповідне значення.'), UB.i18n('Помилка'))
    }
  }
  me.validateForm()
  // me.validateActing()
}

function getActingPayEl () {
  const me = this
  return UB.Repository('hr_empOrderVacationListDet')
    .attrs('dictVacationKindID.payElTempExecutionID', 'dictVacationKindID.payElTempExecutionID.description')
    .where('paraID', '=', me.record.get('ID'))
    .where('dictVacationKindID.payElTempExecutionID', 'isNotNull')
    .selectSingle({
      'dictVacationKindID.payElTempExecutionID': 'payElID',
      'dictVacationKindID.payElTempExecutionID.description': 'payElID.description'
    })
    .then(data => {
      return data
    })
}

function startActingGridEdit (rowEditor, context) {
  const me = this
  const editor = rowEditor.editor
  const reco = context.record
  me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.employeePositionID.getFieldValue('dictStaffCatID'),
    me.attr.employeePositionID.getFieldValue('positionType'))

  me.getActingPayEl()
    .then(data => {
      if (data) {
        const payElCtrl = editor.query('[name=payElID.description]')[0]
        reco.set('payElID', data.payElID)
        reco.set('payElID.description', data['payElID.description'])
        payElCtrl.setValue(data['payElID.description'])
      }
    })
}

/* Перевірка, коли кількість днів по пункту наказу більша за кількість доступних днів */
function checkAddedDays () {
  const me = this
  const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
  const detStore = empOrderVacationListDet.getStore()
  let dayCountSum = 0
  detStore.data.items.forEach(rec => {
    dayCountSum += rec.get('empVacationPeriodID.dayDiff') || 0
  })
  let orderItemDayCount = me.attr.dayCount.getValue()
  const holidayInfoLabel = me.down('[name=holidayInfo]')
  let holidayCount = (holidayInfoLabel && holidayInfoLabel.holidayCount) || 0
  let result = orderItemDayCount > (dayCountSum + holidayCount)
  if (result) {
    $App.dialogInfo(UB.i18n(`В наказі вказано більшу кількість днів відпустки ({0} дн.), ніж доступно працівнику ({1} дн.)!`, orderItemDayCount, dayCountSum), UB.i18n('Увага'))
  }
  return result
}

function fillVacationListA (favoriteVacKindID) {
  const me = this
  return HR.controlService.checkAndSaveForm(me, function () {
    return $App.connection.run({
      entity: 'hr_empOrderVacationDet',
      method: 'addPeriods',
      paraID: me.instanceID,
      orgID: me.record.get('organizationID'),
      orderID: me.record.get('orderID'),
      mode: 'ADDONLY',
      favoriteVacKindID: favoriteVacKindID
    }).then(() => {
      const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
      const detStore = empOrderVacationListDet.getStore()
      function validateOnLoad () {
        let msgIsShown = me.checkAddedDays()
        me.validate(0, !msgIsShown)
        detStore.un('load', validateOnLoad)
      }
      detStore.on('load', validateOnLoad)
      me.onRefresh()
    })
  })
}

function checkPosition (toChangeFields) {
  HR.controlService.filterEmpPosCtrl(this, 'employeePositionID', 'dateFrom', 'dateTo', toChangeFields)
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('refresh', onFormRefresh, me)
  me.on('beforeClose', onBeforeClose, me)

  // eslint-disable-next-line no-caller
  callParentFromCmdConfig(me, arguments.callee.name)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  createActions(me)

  const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
  if (funcOrgType === '2') {
    me.actions.addIntComb.hide()
  }
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  }) */
  me.errors = []
  me.canClose = true
  me.orderConfig = []
  me.isMultiOrder = false
  if (AC.settings.get('hrMultiOrganization')) {
    me.isMultiOrder = true
    HR.orderManager.setMultiOrderButton(me, 6, function () {
      $App.connection.run({
        entity: 'hr_empOrderVacationDet',
        method: 'addMultiOrder',
        orderID: me.record.get('orderID'),
        paraID: me.instanceID
      }).then((mParams) => {
        if (mParams.msg) {
          $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
        }
      })
    })
  }
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  const onDate = me.record.get('dateFrom') || me.record.get('orderDate') || me.record.get('entryDate') || appAC.globalApplicationDate()
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID',
    positionExists: false,
    logicalPredicates: ['(([empPosDateFrom] AND [empPosDateTo]) OR ([empPosMaxDateTo] AND [empNumMaxDateTo] AND [empPosDateToLess] AND [empNumMiDelete]))'],
    params: [
      ['[dateTo]=[maxDateTo]', 'custom', undefined, 'empPosMaxDateTo'],
      ['employeeNumberID.dateTo', '=', '#maxdate', 'empNumMaxDateTo'],
      ['dateTo', '<', onDate, 'empPosDateToLess'],
      ['employeeNumberID.mi_deleteDate', '>=', '#maxdate', 'empNumMiDelete']
    ]
  })
  me.checkPosition(false)
  /* Заголовок буде братися з caption def форми */
  // me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
  })
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    /* UBHR-5682 */
    // me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  } else {
    if (!me.isInternalRefresh) {
      let rawErrorText = me.record.get('errorText')
      if (rawErrorText) {
        me.errors = JSON.parse(rawErrorText)
        let errorText = HR.controlService.getFormErrorsText(me.errors)
        const errorLabel = me.down('[name=errorText]')
        errorLabel.setText(errorText, false)
      }
    } else {
      me.isInternalRefresh = false
    }
  }

  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reason',
    entityName: 'hr_dictReasonVacation'
  })
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)
  if (me.record.get('empOrderType') === 'VACATION_REVOKE') {
    let tp = me.down('[ubID=tpDetail]')
    tp.items.items[1].tab.hide()
    tp.items.items[2].tab.hide()
  }

  HR.orderManager.setDateChecker(me, {
    dateFrom: me.attr.dateFrom,
    dateTo: me.attr.dateTo
  })

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
  me.setHolidayInfo()
}

async function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.enableControls()
  if (me.isMultiOrder) {
    HR.orderManager.checkMultiOrgActionState(me)
  }
}

async function onBeforeClose () {
  const me = this
  if (!me.isReadOnly && me.down('[name=empOrderVacationListDet]').getStore().data.items.length) {
    let calDaySum = 0
    me.down('[name=empOrderVacationListDet]').getStore().data.items.forEach(el => {
      calDaySum += el.get('dayCount')
    })
    if (calDaySum !== me.record.get('dayCount')) {
      $App.dialogInfo(UB.i18n('Кількість днів за заявою не співпадає з загальною кількостю днів за періодами надання відпустки!'))
    }
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) { return }
  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Наказ на сумісника'),
    handler: function () {
      return HR.controlService.checkAndSaveForm(me, function () {
        return HR.orderManager.checkIntCombVac(me).then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacationDet',
              method: 'addIntComb',
              orgID: me.record.get('organizationID'),
              orderID: me.record.get('orderID'),
              employeePositionID: me.attr.employeePositionID.getValue(),
              dateFrom: me.attr.dateFrom.getValue(),
              dateTo: me.attr.dateTo.getValue(),
              dayCount: me.attr.dayCount.getValue(),
              reason: me.attr.reason.getValue(),
              isRst: me.attr.isRst.getValue()
            }).then((mParams) => {
              if (mParams.msg) {
                $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
                return
              }
              if (mParams.res) {
                const grid = AC.gridUtils.getSenderGrid(me)
                me.closeWindow(true)
                HR.controlService.selectAndEdit(grid, {
                  idxCode: 'last'
                })
                grid.onRefresh()
              }
            })
          } else {
            return Promise.resolve(false)
          }
        })
      })
    }
  })
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let addPeriodsAction = me.actions.addPeriods
  if (!addPeriodsAction) {
    addPeriodsAction = new Ext.Action({
      actionId: 'addPeriods',
      eventId: 'addPeriods',
      text: UB.i18n('Розрахувати види відпусток'),
      cls: 'fill-action',
      iconCls: 'fa fa-pencil-square-o',
      handler: function () {
        me.fillVacationListA()
      }
    })
    me.actions.addPeriods = addPeriodsAction
  }

  let addIntCombAction = me.actions.addIntComb
  if (!addIntCombAction) {
    addIntCombAction = new Ext.Action({
      actionId: 'addIntComb',
      eventId: 'addIntComb',
      text: UB.i18n('Наказ на сумісника'),
      iconCls: 'fa fa-clone',
      handler: function () {
        return HR.controlService.checkAndSaveForm(me, function () {
          return HR.orderManager.checkIntCombVac(me).then(result => {
            if (result) {
              return $App.connection.run({
                entity: 'hr_empOrderVacationDet',
                method: 'addIntComb',
                orgID: me.record.get('organizationID'),
                orderID: me.record.get('orderID'),
                employeePositionID: me.attr.employeePositionID.getValue(),
                dateFrom: me.attr.dateFrom.getValue(),
                dateTo: me.attr.dateTo.getValue(),
                dayCount: me.attr.dayCount.getValue(),
                reason: me.attr.reason.getValue(),
                isRst: me.attr.isRst.getValue()
              }).then((mParams) => {
                if (mParams.msg) {
                  $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
                  return
                }
                if (mParams.res) {
                  const grid = AC.gridUtils.getSenderGrid(me)
                  me.closeWindow(true)
                  HR.controlService.selectAndEdit(grid, {
                    idxCode: 'last'
                  })
                  grid.onRefresh()
                }
              })
            } else {
              return Promise.resolve(false)
            }
          })
        })
      }
    })
    me.actions.addIntComb = addIntCombAction
  }
}

function enableControls () {
  const me = this
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  let enabled = isProject || !me.isEditMode
  const addPeriodsAction = me.actions.addPeriods
  if (addPeriodsAction) {
    addPeriodsAction.setDisabled(!enabled)
  }
  let workPlace = me.attr.employeePositionID.getFieldValue('workPlace')
  const addIntCombAction = me.actions.addIntComb
  if (addIntCombAction) {
    addIntCombAction.setDisabled(!(enabled && workPlace === '1'))
  }
  me.isReadOnly = me.orderForm.enableParaControls(me)
  let isIntWork = workPlace === '2' // Внутрішнє сумісництво
  if (isIntWork) {
    me.record.set('isMoneyHelp', false)
  }
  if (me.attr.isMoneyHelp.isDisabled() !== isIntWork) {
    me.attr.isMoneyHelp.setDisabled(isIntWork)
  }
  setMoneyHelpPayElState(!me.record.get('isMoneyHelp'), me)
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc && me.down('[name=reasonDocPanel]')) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
    case 'dateTo':
      if (AC.dateService.isValid(value)) {
        me.setVacationDays()
        me.setHolidayInfo()
        if (me.isMultiOrder) {
          HR.orderManager.checkMultiOrgActionState(me, value)
        }
      }
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
    case 'employeePositionID':
      const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
      const detStore = empOrderVacationListDet.getStore()
      if (detStore.getCount()) {
        const checkFields = ['employeePositionID']
        AC.inspectData.checkChangingValue(field, oldValue, checkFields, UB.i18n('розподілу по видам відпусток'))
          .then(result => {
            if (!result) {
              return
            }
            $App.connection.run({
              entity: 'hr_empOrderVacationListDet',
              method: 'clearDetail',
              paraID: me.record.get('ID')
            }).then((result) => {
              detStore.removeAll()
            })
          })
      }
      if (value) {
        me.enableControls()
      }
      if (me.isMultiOrder) {
        HR.orderManager.checkMultiOrgActionState(me)
      }
      break
    case 'isMoneyHelp':
      setMoneyHelpPayElState(!value, me)
      break
  }
}

function setMoneyHelpPayElState (isDisabled, me) {
  if (me.attr.moneyHelpPayElID.isDisabled() !== isDisabled) {
    me.attr.moneyHelpPayElID.setDisabled(isDisabled)
  }
  if (isDisabled) {
    if (me.attr.moneyHelpPayElID.getValue()) {
      me.attr.moneyHelpPayElID.setValue()
    }
  } else {
    const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
    if (config) {
      if (!me.record.get('moneyHelpPayElID')) {
        me.attr.moneyHelpPayElID.setValueById(config.payElIDAdd)
      }
      if (me.attr.moneyHelpPayElID.isDisabled() !== !config.canEditPayElAdd) {
        me.attr.moneyHelpPayElID.setDisabled(!config.canEditPayElAdd)
      }
    } else {
      if (me.attr.moneyHelpPayElID.isDisabled() !== true) {
        me.attr.moneyHelpPayElID.setDisabled(true)
      }
      me.attr.moneyHelpPayElID.setValue()
    }
  }
}

function onBeforeSave () {
  const me = this
  return me.validateForm(true).then(res => {
    me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
    if (res) {
      me.errorsIsNotSaved = false
    }
    return res
  })
}

function onAfterSave () {
  const me = this
  me.errorsIsNotSaved = true
}

function onFormRefresh () {
  const me = this
  me.validate()
}

function callParentFromCmdConfig (form, funcName) {
  const func = form.commandConfig && form.commandConfig.cmpInitConfig && form.commandConfig.cmpInitConfig[funcName]
  if (func) {
    return func.apply(form, null)
  }
}

function checkDates () {
  return true
}

function fillVacationList () {
  const me = this
  delete me.vacationList
  return UB.Repository('hr_empVacationPlan')
    .attrs(['dictVacationKindID'])
    .where('employeeNumberID', '=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .groupBy(['dictVacationKindID'])
    .selectAsObject().then(data => {
      me.vacationList = data.map(item => item.dictVacationKindID)
      return Promise.resolve(true)
    })
}

function fillPeriodList (dictVacationKindID) {
  const me = this
  const dateFrom = me.attr.dateFrom.getValue()
  delete me.periodList
  return UB.Repository('hr_empVacationPeriod')
    .attrs(['ID'])
    .where('empVacationPlanID.employeeNumberID', '=', me.attr.employeePositionID.getFieldValue('employeeNumberID'))
    .whereIf(me.vacationList && me.vacationList.length, 'empVacationPlanID.dictVacationKindID', 'in', me.vacationList)
    .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('[dayDiff]', '>', 0)
    .whereIf(dateFrom, '[dateFrom]', '<=', dateFrom)
    // monkey request prevention
    .where('ID', '!=', AC.dataService.getUniqueInt())
    .selectAsObject().then(data => {
      me.periodList = data.map(item => item.ID)
      return Promise.resolve(true)
    })
}

function setVacationDays () {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateTo = me.attr.dateTo.getValue()
  let dayCountCtrl = me.attr.dayCount
  if (!AC.dateService.isValid(dateFrom) || !AC.dateService.isValid(dateTo)) {
    me.isInnerChange = true
    try {
      dayCountCtrl.setValue(null)
    } finally {
      me.isInnerChange = false
    }
    return
  }
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getCalendDays4Vac',
    dateFrom: dateFrom,
    dateTo: dateTo,
    // monkey request prevention
    currTime: Date.now()
  }).then(mParams => {
    me.isInnerChange = true
    try {
      dayCountCtrl.setValue(mParams.daysCount)
    } finally {
      me.isInnerChange = false
    }
    me.record.set('dayCount', mParams.daysCount)
  })
}

function setVacationDateTo () {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateToCtrl = me.attr.dateTo
  let dayCount = me.attr.dayCount.getValue()
  if (!AC.dateService.isValid(dateFrom) || !dayCount) {
    me.isInnerChange = true
    try {
      dateToCtrl.setValue(null)
    } finally {
      me.isInnerChange = false
    }
    return
  }
  $App.connection.run({
    entity: 'hr_empOrder',
    method: 'getCalendDateTo4Vac',
    dateFrom: dateFrom,
    dayCount: dayCount,
    // monkey request prevention
    currTime: Date.now()
  }).then(mParams => {
    let dateTo = new Date(mParams.dateTo)
    if (AC.dateService.isValid(dateTo)) {
      me.isInnerChange = true
      try {
        dateToCtrl.setValue(dateTo)
      } finally {
        me.isInnerChange = false
      }
      me.record.set('dateTo', dateTo)
      me.setHolidayInfo()
    }
  })
}

function recalcIsPart (editor, reco) {
  let dayCountCtrl = editor.query('[name=dayCount]')[0]
  const empVacationPeriodCtrl = editor.query('[name=empVacationPeriodID.descriptionEx]')[0]
  let dayCount = dayCountCtrl && dayCountCtrl.getValue()
  let vacPerReco = empVacationPeriodCtrl && AC.gridUtils.getCurrentRecord(empVacationPeriodCtrl)
  let dayCountPlan = vacPerReco && vacPerReco.get('dayCountPlan')
  if (dayCount !== undefined && vacPerReco && dayCountPlan !== undefined) {
    let isPart = dayCountPlan > dayCount
    const isPartCtrl = editor.query(`[name=isPart]`)[0]
    isPartCtrl && isPartCtrl.setValue(isPart)
    reco.set('isPart', isPart)
  }
  let dictVacationKindIDCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let vacKindReco = dictVacationKindIDCtrl && AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
  if (vacKindReco) {
    const isCont = vacKindReco.get('code') === 'dYear' && dayCount >= HR.timeService.getConstants().yearVacMainPart
    const isContinuousCtrl = editor.query(`[name=isContinuous]`)[0]
    isContinuousCtrl && isContinuousCtrl.setValue(isCont)
    reco.set('isContinuous', isCont)
  }
}

function checkPeriodDayCount (editor, reco) {
  let dayCount = reco.get('dayCount')
  let dictVacationKindCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let vacKindReco = AC.gridUtils.getCurrentRecord(dictVacationKindCtrl)
  if (!dayCount || !vacKindReco) {
    return
  }
  let vacCode = vacKindReco.get('code')
  if (vacCode === 'dChild') {
    const predefinedPeriodDays = HR.timeService.getConstants().predefinedPeriodDays.dChild
    if (!predefinedPeriodDays.includes(dayCount)) {
      $App.dialogError(UB.i18n(`Для додаткової соціальної відпустки працівникам, які мають дітей<br/>тривалість днів не відповідає значенням ({0})`, predefinedPeriodDays.join(', ')), 'Помилка')
    }
  }
}

function recalcVacPeriodDays (editor, reco, callBackFn) {
  const grid = editor.up('grid')
  if (grid.isInnerChange) {
    return
  }
  const dateFromCtrl = editor.query('[name=dateFrom]')[0]
  const dateToCtrl = editor.query('[name=dateTo]')[0]
  const dayCountCtrl = editor.query('[name=dayCount]')[0]
  let dateFrom = dateFromCtrl && dateFromCtrl.getValue()
  let dateTo = dateToCtrl && dateToCtrl.getValue()
  const dictVacationKindIDCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let vacKindRec = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
  let dictVacationKindID = vacKindRec && vacKindRec.get('ID')
  if (dictVacationKindID && dateFrom && AC.dateService.isValid(dateFrom) && dateTo && AC.dateService.isValid(dateTo)) {
    grid.isInnerChange = true
    return $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getWorkDays4Vac',
      dateFrom: dateFrom,
      dateTo: dateTo,
      dictVacationKindID: dictVacationKindID,
      orgID: appAC.globalOrganization(),
      // monkey request prevention
      currTime: Date.now()
    }).then(mParams => {
      try {
        dayCountCtrl.setValue(mParams.daysCount)
      } finally {
        grid.isInnerChange = false
      }
      reco.set('dayCount', mParams.daysCount)
      recalcIsPart(editor, reco)
      if (callBackFn) {
        return callBackFn()
      } else {
        return Promise.resolve(true)
      }
    })
  } else {
    return Promise.resolve(true)
  }
}

function recalcVacPeriodDateTo (editor, reco) {
  const grid = editor.up('grid')
  if (grid.isInnerChange) {
    return
  }
  let dateFromCtrl = editor.query('[name=dateFrom]')[0]
  let dateToCtrl = editor.query('[name=dateTo]')[0]
  let dayCountCtrl = editor.query('[name=dayCount]')[0]
  let dictVacationKindCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let dateFrom = dateFromCtrl && dateFromCtrl.getValue()
  let dayCount = dayCountCtrl && dayCountCtrl.getValue()
  let dictVacKindReco = dictVacationKindCtrl && AC.gridUtils.getCurrentRecord(dictVacationKindCtrl)
  let dictVacationKindID = dictVacKindReco && dictVacKindReco.get('ID')
  if (dateFrom && AC.dateService.isValid(dateFrom) && dayCount) {
    grid.isInnerChange = true
    $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getWorkDateTo4Vac',
      dateFrom: dateFrom,
      dayCount: dayCount,
      dictVacationKindID: dictVacationKindID,
      orgID: appAC.globalOrganization(),
      // monkey request prevention
      currTime: Date.now()
    }).then(mParams => {
      let dateTo = new Date(mParams.dateTo)
      if (AC.dateService.isValid(dateTo)) {
        try {
          dateToCtrl.setValue(dateTo)
        } finally {
          grid.isInnerChange = false
        }
        reco.set('dateTo', dateTo)
      }
    })
  }
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function refreshCalcData (me) {
  // UBHR-6546 Відпустки. Наказ про надання відпустки. Прибрати попередження після зміни дати закінченя за заявою та Дати по.
  if (me.isDirty()) {
    me.saveForm()
  } else {
    me.isInternalRefresh = true
    me.onRefresh()
    /* To refresh hr_empOrderDet.description */
    me.record.dirty = true
    me.saveInstance()
  }
}

function setHolidayInfo () {
  const me = this
  const holidayInfo = me.down('[name=holidayInfo]')
  const dateFrom = me.attr.dateFrom.getValue()
  const dateTo = me.attr.dateTo.getValue()
  HR.timeService.setHolidayInfo(holidayInfo, dateFrom, dateTo, appAC.globalOrganization())
}

function checkVacCrossPeriod (editor, reco) {
  const dateFromCtrl = editor.query(`[name=dateFrom]`)[0]
  let recDateFrom = dateFromCtrl.getValue()
  const dateToCtrl = editor.query(`[name=dateTo]`)[0]
  let recDateTo = dateToCtrl.getValue()
  if (recDateFrom && AC.dateService.isValid(recDateFrom) && recDateTo && AC.dateService.isValid(recDateTo)) {
    UB.Repository('hr_empOrderVacationListDet')
      .attrs(['ID', 'orderID.orderNumber', 'orderID.orderDate', 'dictVacationKindID.name', 'dateFrom', 'dateTo'])
      .where('employeePositionID', '=', reco.get('employeePositionID'))
      .where('ID', '!=', reco.get('ID'))
      .where('dateFrom', '<=', recDateTo)
      .where('dateTo', '>=', recDateFrom)
      .selectSingle().then(data => {
        if (data) {
          const dateFromStr = AC.dateService.formatDate(reco.get('dateFrom'))
          const dateToStr = AC.dateService.formatDate(reco.get('dateTo'))
          const dateFromStr2 = AC.dateService.formatDate(data.dateFrom)
          const dateToStr2 = AC.dateService.formatDate(data.dateTo)
          const orderDateStr = AC.dateService.formatDate(data['orderID.orderDate'])
          const msg = UB.i18n(`Виявлено перетин періодів, наказ № {0} від {1}, `, data['orderID.orderNumber'], orderDateStr) +
                        UB.i18n(`"{0}" з {1} по {2}, з періодом з {3} по {4}!`, data['dictVacationKindID.name'], dateFromStr2, dateToStr2, dateFromStr, dateToStr)
          $App.dialogInfo(msg, UB.i18n('Увага!'))
        }
      })
  }
}

/* Перевірки при збереженні форми */
function validateForm (showMessage = false) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  let isMoneyHelpParams
  let sickessCrossPromise = Promise.resolve(true)

  if (me.enableValidators) {
    const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
    const dateFrom = me.attr.dateFrom.getValue()
    const isDateFrom = AC.dateService.isValid(dateFrom)
    const dateTo = me.attr.dateTo.getValue()
    const isDateTo = AC.dateService.isValid(dateTo)
    const orderID = me.record.get('orderID')
    if (isDateFrom && isDateTo && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n('"Дата закінчення за заявою" не може бути меншою за "Дату початку за заявою"')
      })
      result = false
    }

    /* Перевірки по закладці "Виконуючі обов'язки" */
    me.validateActing(errors)

    /* Перевірки для ознаки "Матеріальна допомога" */
    const isMoneyHelp = me.attr.isMoneyHelp.getValue()
    if (isMoneyHelp) {
      isMoneyHelpParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkMoneyHelpVac',
        execParams: {
          employeeNumberID: employeeNumberID,
          dateFrom: dateFrom,
          orderID: orderID,
          orderDetID: me.instanceID,
          isMoneyHelp: isMoneyHelp,
          vacOrderCall: true
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }
    sickessCrossPromise = $App.connection.run({
      entity: 'hr_empOrderVacationDet',
      method: 'checkSicknessCrossTimeSheet',
      execParams: {
        employeeNumberID: employeeNumberID,
        dateFrom: dateFrom,
        dateTo: dateTo
      },
      // monkey request prevention
      currTime: Date.now()
    })
  }

  return sickessCrossPromise
    .then(mParams => {
      if (mParams.result) {
        errors.push({
          tag: 0, // for all tags
          code: 'sicknessCrossTimeSheet',
          msg: mParams.result
        })
        me.isClosing = false
      }
      if (isMoneyHelpParams) {
        return $App.connection.run(isMoneyHelpParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        let msgArray = JSON.parse(mParams.msg)
        if (msgArray.length) {
          msgArray.forEach(msgItem => {
            errors.push({
              tag: 0, // for all tags
              code: msgItem.code,
              msg: msgItem.msg
            })
          })
        }
      }
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
      me.isClosing = false
      me.canClose = result
      return result
    })
}

function validateVacListItem ({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isContinuous, isDay, showMessage = false, ctx, aggregateErrors = false }) {
  const me = this
  let result = true
  const errors = []
  const errorTag = 2
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const employeePositionID = me.attr.employeePositionID.getValue()
  const orgID = me.record.get('organizationID')
  const orderID = me.record.get('orderID')
  const orderDetID = me.instanceID
  const isRecDateFrom = AC.dateService.isValid(recDateFrom)
  const isRecDateTo = AC.dateService.isValid(recDateTo)
  const onDate = appAC.globalApplicationDate()
  const dateFrom = AC.dateService.unshiftDate(me.attr.dateFrom.getValue())
  const isDateFrom = AC.dateService.isValid(dateFrom)
  const reco = ctx && ctx.record

  if (!me.enableValidators) {
    me.clearErrors(errorTag)
    return Promise.resolve(true)
  }

  if (isRecDateFrom && isRecDateTo && recDateFrom > recDateTo) {
    errors.push({
      tag: errorTag,
      code: 'vacListDateCheck',
      msg: UB.i18n(`'Дата з' ({0}) менша за дату по ({1})`, AC.dateService.formatDate(recDateFrom), AC.dateService.formatDate(recDateTo))
    })
    result = false
  }

  /* Перевірка, щоб тривалість днів відпустки не перевищувала доступні дні з урахуванням всіх пунктів даного наказу */
  let checkPeriodDayDiffParams
  if (vacPeriodID) {
    if (recDayCount) {
      checkPeriodDayDiffParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkPeriodDayDiff',
        execParams: {
          orgID: orgID,
          orderID: orderID,
          listDetID: listDetID,
          empVacationPeriodID: vacPeriodID,
          dayCount: recDayCount
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }
  } else {
    if (isDay && !ctx.isCancel) {
      errors.push({
        tag: errorTag,
        code: 'periodIsEmpty',
        msg: UB.i18n('Не заповнено поле "За період"')
      })
      result = false
    }
  }

  if (isDateFrom && isRecDateFrom && dateFrom > recDateFrom) {
    errors.push({
      tag: errorTag,
      code: 'dateFromCheck',
      msg: UB.i18n(`'Дата з' ({0}) менша за дату початку відпустки ({1})`, AC.dateService.formatDate(recDateFrom), AC.dateService.formatDate(dateFrom))
    })
    result = false
  }

  /* Перевірка на 14 дн для безпереврної відпустки */
  let toCheckContVac = false
  if (isContinuous) {
    toCheckContVac = true
  }

  /* Перевірка, Якщо в наказі проставлено галочку "Безперервна відпустка", то перевірка, щоб кількість днів >= 14 */
  let checkContParams
  if (toCheckContVac && employeeNumberID && dictVacationKindID && isRecDateFrom && recDayCount) {
    checkContParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkContVacation',
      execParams: {
        ID: listDetID,
        isContinuous: isContinuous,
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        dateFrom: recDateFrom,
        dayCount: recDayCount
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток" */
  let checkImpartibleVacParams
  if (employeeNumberID && dictVacationKindID && isRecDateFrom && recDayCount) {
    checkImpartibleVacParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkImpartibleVac',
      execParams: {
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        dateFrom: recDateFrom,
        dayCount: recDayCount
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка на вихід за межі дії таб. номера */
  let checkEmpNumDatesParams
  if (employeeNumberID && isRecDateFrom && isRecDateTo) {
    checkEmpNumDatesParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkEmpNumberPeriod',
      execParams: {
        employeeNumberID: employeeNumberID,
        dateFrom: recDateFrom,
        dateTo: recDateTo
      },
      // monkey request prevention
      currTime: Date.now(),
      listDetID: listDetID
    }
  }

  /* Перевірка на доступність вказаної кількості днів відпустки */
  let checkAvailableVacationDaysParams
  if (employeeNumberID && dictVacationKindID && orgID && isRecDateFrom && isRecDateTo && recDayCount) {
    checkAvailableVacationDaysParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkAvailableVacationDays',
      execParams: {
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        orgID: orgID,
        dateFrom: recDateFrom,
        dateTo: recDateTo,
        dayCount: recDayCount,
        orderDetID: orderDetID,
        listDetID: listDetID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка на використання осн. частини 14 дн. */
  let checkMainPartParams
  if (!isContinuous && employeeNumberID && dictVacationKindID && orgID && isRecDateFrom && isRecDateTo && recDayCount) {
    checkMainPartParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkMainPart',
      execParams: {
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        vacPeriodID: vacPeriodID,
        isContinuous: isContinuous,
        orgID: orgID,
        dateFrom: recDateFrom,
        dateTo: recDateTo,
        dayCount: recDayCount,
        onDate: onDate,
        orderID: orderID,
        listDetID: listDetID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка на перетин з іншими відпустками працівника */
  let checkVacationCrossPeriodParams
  if (employeeNumberID && employeePositionID && orgID && isRecDateFrom && isRecDateTo) {
    checkVacationCrossPeriodParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkVacationCrossPeriod',
      execParams: {
        employeeNumberID: employeeNumberID,
        employeePositionID: employeePositionID,
        dateFrom: recDateFrom,
        dateTo: recDateTo,
        orderID: orderID,
        listDetID: listDetID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірка в табелі на перетин з недозволеними елементами */
  let checkVacationCrossTimeSheetParams
  if (employeeNumberID && dictVacationKindID && isRecDateFrom && isRecDateTo) {
    checkVacationCrossTimeSheetParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkVacationCrossTimeSheet',
      execParams: {
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        dateFrom: recDateFrom,
        dateTo: recDateTo
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  /* Перевірки для ознаки "Матеріальна допомога" */
  let checkMoneyHelpParams
  const isMoneyHelp = me.attr.isMoneyHelp.getValue()
  if (isMoneyHelp && employeeNumberID && dictVacationKindID && isDateFrom && recDayCount) {
    checkMoneyHelpParams = {
      entity: 'hr_empOrderVacationListDet',
      method: 'checkMoneyHelpVac',
      execParams: {
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        dateFrom: dateFrom,
        orderID: orderID,
        orderDetID: orderDetID,
        listDetID: listDetID,
        isMoneyHelp: isMoneyHelp,
        vacOrderCall: true
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  return Promise.resolve(true)
    .then(res => {
      if (checkPeriodDayDiffParams) {
        return $App.connection.run(checkPeriodDayDiffParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'periodDayDiffCheck',
          msg: mParams.msg
        })
        result = false
      }
      if (checkContParams) {
        return $App.connection.run(checkContParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'vacContCheck',
          msg: mParams.msg
        })
        result = false
      }
      if (checkImpartibleVacParams) {
        return $App.connection.run(checkImpartibleVacParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'impartibleVacCheck',
          msg: mParams.msg
        })
      }
      if (checkEmpNumDatesParams) {
        return $App.connection.run(checkEmpNumDatesParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'empNumDatesCheck',
          msg: mParams.msg
        })
      }
      if (checkAvailableVacationDaysParams) {
        return $App.connection.run(checkAvailableVacationDaysParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'availableVacationDaysCheck',
          msg: mParams.msg
        })
      }
      if (checkMainPartParams) {
        return $App.connection.run(checkMainPartParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams) {
        if (mParams.msg) {
          errors.push({
            tag: errorTag,
            code: 'mainPartCheck',
            msg: mParams.msg
          })
        }
        reco && reco.set('isBackOrder', !!mParams.isBackOrder)
      }
      if (checkVacationCrossPeriodParams) {
        return $App.connection.run(checkVacationCrossPeriodParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'vacationCrossPeriodCheck',
          msg: mParams.msg
        })
      }
      if (checkVacationCrossTimeSheetParams) {
        return $App.connection.run(checkVacationCrossTimeSheetParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'vacationCrossTimeSheetCheck',
          msg: mParams.msg
        })
      }
      if (checkMoneyHelpParams) {
        return $App.connection.run(checkMoneyHelpParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        let msgArray = JSON.parse(mParams.msg)
        if (msgArray.length) {
          msgArray.forEach(msgItem => {
            errors.push({
              tag: 0, // for all tags
              code: msgItem.code,
              msg: msgItem.msg
            })
          })
        }
      }
      return Promise.resolve({})
    }).then(mParams => {
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage, 'errorText', aggregateErrors)
      return result
    })
}

/* Перевірки при збереженні періодів пункту наказу */
function validateVacList (editor, ctx, showMessage = false) {
  if (editor.isCheckRun) {
    return true
  }
  const me = this
  const rec = ctx.record
  const dateFromCtrl = editor.query(`[name=dateFrom]`)[0]
  const recDateFrom = AC.dateService.unshiftDate(dateFromCtrl.getValue())
  const dateToCtrl = editor.query(`[name=dateTo]`)[0]
  const recDateTo = AC.dateService.unshiftDate(dateToCtrl.getValue())
  const dayCountCtrl = editor.query(`[name=dayCount]`)[0]
  const recDayCount = dayCountCtrl.getValue()
  const dictVacationKindIDCtrl = editor.query(`[name=dictVacationKindID.name]`)[0]
  const dictVacationKindID = dictVacationKindIDCtrl.getFieldValue('ID')
  const isDay = dictVacationKindIDCtrl.getFieldValue('isDay')
  const listDetID = rec.get('ID')
  const isContinuousCtrl = editor.query(`[name=isContinuous]`)[0]
  const isContinuous = isContinuousCtrl.getValue()
  const empVacationPeriodIDCtrl = editor.query(`[name=empVacationPeriodID.descriptionEx]`)[0]
  const vacPeriodID = empVacationPeriodIDCtrl.getFieldValue('ID')
  ctx = ctx || {}

  editor.isCheckRun = true
  return me.validateVacListItem({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isContinuous, isDay, showMessage, ctx })
    .then(res => {
      me.errorsIsNotSaved = true
      editor.isCheckRun = false
      return res
    })
}

/* Всі перевірки, errorTag: 0 - всі перевірки, 1 - перевірки змін форми, 2 - перевірки змін детального гріда */
function validate (errorTag = 0, showMessage = true) {
  const me = this
  const validateFormPromise = errorTag > 1 ? Promise.resolve(true) : me.validateForm(showMessage)
  me.clearErrors()
  me.isInternalRefresh = true
  me.errorsIsNotSaved = true
  return validateFormPromise.then(res => {
    if (res) {
      const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
      const detStore = empOrderVacationListDet.getStore()
      if (detStore.data && detStore.data.items.length) {
        return me.loadLookupStores().then(res => {
          let itemPromises = []
          detStore.data.items.forEach(record => {
            const listDetID = record.get('ID')
            const dictVacationKindID = record.get('dictVacationKindID')
            const recDateFrom = record.get('dateFrom')
            const recDateTo = record.get('dateTo')
            const recDayCount = record.get('dayCount')
            const vacPeriodID = record.get('empVacationPeriodID')
            const isContinuous = record.get('isContinuous')
            const lookups = empOrderVacationListDet.lookups
            let vacItem = lookups.dictVacationKind.find(item => item.ID === dictVacationKindID)
            let isDay = vacItem ? vacItem.isDay : false

            let itemPromise = me.validateVacListItem({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isContinuous, isDay, aggregateErrors: true })
            itemPromises.push(itemPromise)
          })
          return Promise.all(itemPromises)
        }).then(results => {
          let res = true
          results.forEach(rslt => {
            res = res && rslt
          })
          return res
        })
      }
    }
    return res
  })
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
    me.errorsIsNotSaved = true
  }
}

function loadLookupStores () {
  const me = this
  const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  if (!empOrderVacationListDet.lookups) {
    empOrderVacationListDet.lookups = {}
  }
  return UB.Repository('hr_dictVacationKind')
    .attrs(['ID', 'name', 'code', 'isDay'])
    .orderBy('ID')
    .selectAsObject().then(data => {
      empOrderVacationListDet.lookups.dictVacationKind = data
      return UB.Repository('hr_empVacationPeriod')
        .attrs(['ID', 'descriptionEx', 'dayCountPlan', 'dayDiff'])
        .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID || 0)
        .orderBy('ID')
        .selectAsObject()
    }).then(data => {
      empOrderVacationListDet.lookups.empVacationPeriod = data
      return Promise.resolve(true)
    })
}
