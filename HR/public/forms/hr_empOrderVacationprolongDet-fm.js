/* global HR AC $App appAC UB Ext _ */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onRecordLoaded,
  enableControls,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  onBeforeClose,
  onFormRefresh,
  addBaseActions,
  setTitleByOrderType,
  setVacationDays,
  setVacationDateTo,
  getEmployeeNumberID,
  filterVacationPara,
  filterSickness,
  filterCauseVacation,
  fillVacationList,
  fillPeriodList,
  recalcVacPeriodDays,
  recalcVacPeriodDateTo,
  refreshCalcData,
  getProlongDayCount,
  setVacPeriod,
  setHolidayInfo,
  validate,
  validateForm,
  validateVacList,
  validateVacListItem,
  clearErrors,
  loadLookupStores,
  onSicknessChanged,
  onCauseVacationChanged,
  clearVacList,
  setLabelValues,
  checkSicknessCrossTimeSheet
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('refresh', onFormRefresh, me)
  me.on('beforeClose', onBeforeClose, me)
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
  me.orderState = me.orderForm.record.get('orderState')
  me.errors = []
  me.canClose = true
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      me.filterVacationPara({
        employeeNumberID: field.getFieldValue('employeeNumberID'),
        toClearValue: true
      })
      me.filterSickness(true)
      me.filterCauseVacation(true)
      const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
      const detStore = empOrderVacationListDet.getStore()
      if (detStore.getCount()) {
        const checkFields = ['employeePositionID']
        AC.inspectData.checkChangingValue(field, oldValue, checkFields, UB.i18n('розподілу по видам відпусток'))
          .then(result => {
            if (!result) {
              return
            }
            me.clearVacList(detStore)
          })
      }
      break
    case 'dateFrom':
    case 'dateTo':
      me.setVacationDays()
      me.setHolidayInfo()
      me.checkSicknessCrossTimeSheet()
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
    case 'action':
      let checkPromise
      let vacListStore
      let vacListCount
      let actStore
      let actCount
      let isTransfer = value === 'TRANSFER'
      let isCancel = value === 'CANCEL'
      if (isCancel || isTransfer) {
        const empOrderVacationListDet2 = me.down('[name=empOrderVacationListDet]')
        vacListStore = empOrderVacationListDet2.getStore()
        vacListCount = vacListStore.getCount()
        const empOrderActingDet = me.down('[name=hr_empOrderActingDet]')
        actStore = empOrderActingDet.getStore()
        actCount = actStore.getCount()
        if (vacListCount > 0 || actCount > 0) {
          let items4DelStr
          if (vacListCount > 0 && actCount > 0) {
            items4DelStr = UB.i18n(`розподілу по видам відпусток та виконуючих обов'язки`)
          } else if (vacListCount > 0) {
            items4DelStr = UB.i18n('розподілу по видам відпусток')
          } else if (actCount > 0) {
            items4DelStr = UB.i18n(`виконуючих обов'язки`)
          }
          field.skipChange = false
          checkPromise = AC.inspectData.checkChangingValue(field, oldValue, ['action'], items4DelStr)
        } else {
          checkPromise = Promise.resolve(true)
        }
      } else {
        checkPromise = Promise.resolve(true)
      }
      me.isInnerChange = true
      checkPromise.then(res => {
        if (!res) {
          me.isInnerChange = false
          return
        }
        if (isCancel || isTransfer) {
          clearActingParaGrid(me, actStore)
          me.clearVacList(vacListStore)
        }
        me.setVacPeriod({
          action: value,
          callBackFn: () => {
            switch (value) {
              case 'PROLONG':
                me.attr.isProlong.setValue(true)
                me.attr.isMovement.setValue(false)
                break
              case 'TRANSFER':
                me.attr.isProlong.setValue(false)
                me.attr.isMovement.setValue(true)
                break
              case 'CANCEL':
                me.attr.isProlong.setValue(false)
                me.attr.isMovement.setValue(false)
                me.attr.empOrderSicknessID.setValue(null)
                me.attr.causeVacationParaID.setValue(null)
                break
            }
            me.isInnerChange = false
            me.setLabelValues()
          }
        })
        me.filterVacationPara({
          employeeNumberID: me.getEmployeeNumberID(),
          toClearValue: false
        })
        me.enableControls()
        me.checkSicknessCrossTimeSheet()
      })
      break
    case 'empOrderSicknessID':
      me.isInnerChange = true
      me.attr.causeVacationParaID.setValue(null)
      if (!me.attr.reason.getValue()) {
        me.attr.reason.setValue(UB.i18n(`у зв’язку з тимчасовою непрацездатністю працівника під час відпустки`))
      }
      me.isInnerChange = false
      me.onSicknessChanged()
      me.checkSicknessCrossTimeSheet()
      break
    case 'causeVacationParaID':
      me.isInnerChange = true
      me.attr.empOrderSicknessID.setValue(null)
      me.isInnerChange = false
      me.onCauseVacationChanged()
      me.checkSicknessCrossTimeSheet()
      break
    case 'grantVacationParaID':
      me.setVacPeriod({})
      const isCancelMoneyHelp = me.attr.action.getValue() === 'CANCEL' && field.getFieldValue('isMoneyHelp')
      me.attr.isCancelMoneyHelp.setDisabled(!isCancelMoneyHelp)
      me.attr.isCancelMoneyHelp.setValue(isCancelMoneyHelp)
      me.checkSicknessCrossTimeSheet()
      break
  }
}

function onBeforeClose () {
  /*const me = this
  AC.gridUtils.refreshSenderGrid(me)
  return true*/
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.down('[attributeName=grantVacationParaID]'), ['editItem', 'addItem'])
  me.enableControls()
  me.setLabelValues()
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
    // params: [['positionID', 'isNotNull']]
  })
  me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
  })
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    // me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  } else {
    if (!me.isInternalRefresh) {
      me.filterVacationPara({
        employeeNumberID: me.getEmployeeNumberID(),
        toClearValue: false
      })
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
  if (!me.isInternalRefresh) {
    me.filterSickness(false)
    me.filterCauseVacation(false)
  }

  me.orderForm.makeReasonSelector(me)
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)

  HR.orderManager.setDateChecker(me, {
    dateFrom: me.getField('dateFrom'),
    dateTo: me.getField('dateTo')
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

function onBeforeSave () {
  const me = this
  let isProlong = me.attr.action.getValue() === 'PROLONG'
  if (isProlong && !me.attr.empOrderSicknessID.getValue() && !me.attr.causeVacationParaID.getValue()) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Потрібно вказати "Лікарняний лист" або "Відпустку, що перериває"'))
    return Promise.resolve(false)
  }
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
  if (me.record.get('action') === 'CANCEL' && me.record.get('isCancelMoneyHelp')) {
    me.orderForm && me.orderForm.record.set('comment', UB.i18n('Скасувати мат.допомогу'))
  } else {
    UB.Repository('hr_empOrderVacationprolongDet')
      .attrs('ID')
      .where('orderID', '=', me.record.get('orderID'))
      .where('action', '=', 'CANCEL')
      .where('isCancelMoneyHelp', '=', true)
      .selectSingle().then(rec => {
        if (!rec) {
          me.orderForm && me.orderForm.record.set('comment', null)
        }
      })
  }
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function onFormRefresh () {
  const me = this
  me.validate()
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
        return $App.connection.run({
          entity: 'hr_empOrderVacationprolongDet',
          method: 'addIntComb',
          orderID: me.record.get('orderID'),
          employeePositionID: me.attr.employeePositionID.getValue(),
          dateFrom: me.attr.dateFrom.getValue(),
          dateTo: me.attr.dateTo.getValue(),
          dayCount: me.attr.dayCount.getValue(),
          reason: me.attr.reason.getValue(),
          orgID: me.record.get('organizationID'),
          grantVacationParaID: me.attr.grantVacationParaID.getValue(),
          empOrderSicknessID: me.attr.empOrderSicknessID.getValue()
        }).then((mParams) => {
          if (mParams.msg) {
            $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
            return
          }
          if (mParams.res) {
            const grid = AC.gridUtils.getSenderGrid(me)
            me.closeWindow(true)
            HR.controlService.selectAndEdit(grid, { idxCode: 'last' })
            grid.onRefresh()
          }
        })
      })
    }
  })
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let addIntCombAction = me.actions.addIntComb
  if (!addIntCombAction) {
    addIntCombAction = new Ext.Action({
      actionId: 'addIntComb',
      eventId: 'addIntComb',
      text: UB.i18n('Наказ на сумісника'),
      iconCls: 'fa fa-clone',
      handler: function () {
        return HR.controlService.checkAndSaveForm(me, function () {
          return $App.connection.run({
            entity: 'hr_empOrderVacationprolongDet',
            method: 'addIntComb',
            orderID: me.record.get('orderID'),
            orgID: me.record.get('organizationID'),
            employeePositionID: me.attr.employeePositionID.getValue(),
            dateFrom: me.attr.dateFrom.getValue(),
            dateTo: me.attr.dateTo.getValue(),
            dayCount: me.attr.dayCount.getValue(),
            reason: me.attr.reason.getValue(),
            action: me.attr.action.getValue(),
            grantVacationParaID: me.attr.grantVacationParaID.getValue(),
            empOrderSicknessID: me.attr.empOrderSicknessID.getValue()
          }).then((mParams) => {
            if (mParams.msg) {
              $App.dialogInfo(mParams.msg, UB.i18n('Увага'))
              return
            }
            if (mParams.res) {
              const grid = AC.gridUtils.getSenderGrid(me)
              me.closeWindow(true)
              HR.controlService.selectAndEdit(grid, { idxCode: 'last' })
              grid.onRefresh()
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
  const orderState = me.record.get('orderID.orderState')
  const isProject = !orderState || me.record.get('orderID.orderState') === 'PROJECT'
  let action = me.attr.action.getValue()
  let isCancel = action === 'CANCEL'
  let isTransfer = action === 'TRANSFER'
  let isProlong = action === 'PROLONG'
  let enablePeriodControls = isProject && !isCancel && !isTransfer

  me.orderForm.enableParaControls(me)
  me.attr.dateFrom.setDisabled(!enablePeriodControls)
  me.attr.dateTo.setDisabled(!enablePeriodControls)
  me.attr.dayCount.setDisabled(!enablePeriodControls)
  me.attr.empOrderSicknessID.setDisabled(isCancel)
  me.attr.causeVacationParaID.setDisabled(isCancel)
  const isCancelMoneyHelp = isCancel && me.attr.grantVacationParaID.getFieldValue('isMoneyHelp')
  me.attr.isCancelMoneyHelp.setDisabled(!isCancelMoneyHelp)
  if (!isCancelMoneyHelp) me.attr.isCancelMoneyHelp.setValue(false)
  const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
  HR.orderManager.enableGrid(empOrderVacationListDet, enablePeriodControls)
  const empOrderActingDet = me.down('[name=hr_empOrderActingDet]')
  HR.orderManager.enableGrid(empOrderActingDet, enablePeriodControls)
  const addIntCombAction = me.actions.addIntComb
  if (addIntCombAction) {
    let workPlace = me.attr.employeePositionID.getFieldValue('workPlace')
    addIntCombAction.setDisabled(!(isProject && me.isEditMode && workPlace === '1' && !isCancel))
  }
  let tpDetail = me.down('[ubID=tpDetail]')
  tpDetail.setVisible(!(isCancel || isTransfer))
}

function fillVacationList () {
  const me = this
  delete me.vacationList
  return UB.Repository('hr_empOrderVacationListDet')
    .attrs(['dictVacationKindID'])
    .where('paraID', '=', me.record.get('grantVacationParaID'))
    .selectAsObject().then(data => {
      me.vacationList = data.map(item => item.dictVacationKindID)
      return Promise.resolve(true)
    })
}

function fillPeriodList (dictVacationKindID) {
  const me = this
  delete me.periodList
  return UB.Repository('hr_empOrderVacationListDet')
    .attrs(['empVacationPeriodID', 'empVacationPeriodID.dayDiff'])
    .where('paraID', '=', me.record.get('grantVacationParaID'))
    .where('dictVacationKindID', '=', dictVacationKindID)
    .where('[empVacationPeriodID.dayDiff]', '>', 0)
    // monkey request prevention
    .where('ID', '!=', AC.dataService.getUniqueInt())
    .selectAsObject({
      'empVacationPeriodID.dayDiff': 'dayDiff'
    }).then(data => {
      me.periodList = data
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
    }
  })
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function getEmployeeNumberID () {
  const me = this
  return me.attr.employeePositionID.getFieldValue('employeeNumberID') || me.record.get('employeeNumberID') || 0
}

function filterVacationPara ({ employeeNumberID, toClearValue, dateFrom, dateTo }) {
  const me = this
  let action = me.attr.action.getValue()
  let isCancel = action === 'CANCEL'
  let options = ['clearStore', 'clearWhereList']
  if (toClearValue) {
    options.push('clearValue')
  }
  let filters = [
    ['employeeNumberID', '=', employeeNumberID],
    ['empOrderType', '=', 'VACATION']
  ]
  if (isCancel) {
    filters.push(['orderID.orderState', 'in', ['POSTED', 'PROCESSED']])
    filters.push(['isRevokeOrProlongRef', '=', false])
  } else {
    filters.push(['orderID.orderState', 'in', ['POSTED', 'PROCESSED']])
    if (dateFrom) {
      filters.push(['calcDateTo', '>=', dateFrom])
    }
    if (dateTo) {
      filters.push(['dateFrom', '<=', dateTo])
    }
  }
  AC.viewUtils.setWhereListProperty(me.attr.grantVacationParaID, filters, undefined, options)
}

function filterSickness (toClearValue) {
  const me = this
  let employeeID = me.attr.employeePositionID.getFieldValue('employeeID') || me.record.get('employeeID') || 0
  let options = ['clearStore']
  if (toClearValue) {
    options.push('clearValue')
  }
  AC.viewUtils.setWhereListProperty(me.attr.empOrderSicknessID, [
    ['employeeID', '=', employeeID]
  ], undefined, options)
}

function filterCauseVacation (toClearValue) {
  const me = this
  let employeeNumberID = me.getEmployeeNumberID()
  let options = ['clearStore']
  if (toClearValue) {
    options.push('clearValue')
  }
  AC.viewUtils.setWhereListProperty(me.attr.causeVacationParaID, [
    ['employeeNumberID', '=', employeeNumberID]
  ], undefined, options)
}

function recalcVacPeriodDays (editor, reco, callBackFn) {
  if (editor.isInnerChange) {
    return
  }
  const dateFromCtrl = editor.query(`[name=dateFrom]`)[0]
  const dateToCtrl = editor.query(`[name=dateTo]`)[0]
  const dayCountCtrl = editor.query(`[name=dayCount]`)[0]
  let dateFrom = dateFromCtrl && dateFromCtrl.getValue()
  let dateTo = dateToCtrl && dateToCtrl.getValue()
  const dictVacationKindIDCtrl = editor.query('[name=dictVacationKindID.name]')[0]
  let vacKindRec = AC.gridUtils.getCurrentRecord(dictVacationKindIDCtrl)
  let dictVacationKindID = (vacKindRec && vacKindRec.get('ID')) || reco.get('dictVacationKindID')
  if (dictVacationKindID && dateFrom && AC.dateService.isValid(dateFrom) && dateTo && AC.dateService.isValid(dateTo)) {
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
      editor.isInnerChange = true
      try {
        dayCountCtrl.setValue(mParams.daysCount)
      } finally {
        editor.isInnerChange = false
      }
      reco.set('dayCount', mParams.daysCount)
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
  if (editor.isInnerChange) {
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
        editor.isInnerChange = true
        try {
          dateToCtrl.setValue(dateTo)
        } finally {
          editor.isInnerChange = false
        }
        reco.set('dateTo', dateTo)
      }
    })
  }
}

function refreshCalcData (me) {
  me.isInternalRefresh = true
  me.onRefresh()
  /* To refresh hr_empOrderDet.description */
  me.record.dirty = true
  me.saveInstance()
}

function getProlongDayCount ({ grantVacationParaID, grantDateFrom, grantDateTo, causeDateFrom, causeDateTo }) {
  const me = this
  const grantVacationParaCtrl = me.attr.grantVacationParaID
  if (!grantVacationParaID) {
    grantVacationParaID = grantVacationParaCtrl.getValue()
  }
  const empOrderSicknessCtrl = me.attr.empOrderSicknessID
  let empOrderSicknessID = empOrderSicknessCtrl.getValue()
  const causeVacationCtrl = me.attr.causeVacationParaID
  let causeVacationParaID = causeVacationCtrl.getValue()
  let sickDateFrom = empOrderSicknessID && AC.dateService.shiftDate(empOrderSicknessCtrl.getFieldValue('dateFrom'))
  let vacDateFrom = causeVacationParaID && AC.dateService.shiftDate(causeVacationCtrl.getFieldValue('dateFrom'))
  let isSickness = !!sickDateFrom
  grantDateFrom = grantDateFrom || (grantVacationParaID && AC.dateService.shiftDate(grantVacationParaCtrl.getFieldValue('dateFrom')))
  causeDateFrom = causeDateFrom || sickDateFrom || vacDateFrom
  grantDateTo = grantDateTo || (grantVacationParaID && AC.dateService.shiftDate(grantVacationParaCtrl.getFieldValue('calcDateTo')))
  let prolongDateFrom = (grantDateFrom && causeDateFrom && _.max([grantDateFrom, causeDateFrom])) || causeDateFrom || grantDateFrom
  let prolongDateTo = (grantDateTo && causeDateTo && _.min([grantDateTo, causeDateTo])) || causeDateTo || grantDateTo
  if (isSickness) {
    /* UBHR-11858 */
    return $App.connection.run({
      entity: 'hr_empOrderVacationprolongDet',
      method: 'getVacDaysInSickness',
      dateFrom: prolongDateFrom,
      dateTo: prolongDateTo,
      empOrderVacationDetID: grantVacationParaID,
      orgID: appAC.globalOrganization(),
      // monkey request prevention
      currTime: Date.now()
    })
  } else {
    return $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getCalendDays4Vac',
      dateFrom: prolongDateFrom,
      dateTo: prolongDateTo,
      // monkey request prevention
      currTime: Date.now()
    })
  }
}

/* Установка дат та кільк. днів продовження відпустки */
function setVacPeriod ({ action, grantVacationParaID, grantDateFrom, grantDateTo, causeDateFrom, causeDateTo, callBackFn }) {
  const me = this
  const grantVacationParaCtrl = me.attr.grantVacationParaID
  if (!grantVacationParaID) {
    grantVacationParaID = grantVacationParaCtrl.getValue()
  }
  if (action === undefined) {
    action = me.attr.action.getValue()
  }
  let empOrderSicknessID = me.attr.empOrderSicknessID.getValue()
  let causeVacationParaID = me.attr.causeVacationParaID.getValue()
  let isCancel = action === 'CANCEL'
  if ((action === 'PROLONG' || empOrderSicknessID || causeVacationParaID) && !isCancel) {
    grantDateFrom = grantDateFrom || (grantVacationParaID && AC.dateService.shiftDate(grantVacationParaCtrl.getFieldValue('dateFrom')))
    grantDateTo = grantDateTo || (grantVacationParaID && AC.dateService.shiftDate(grantVacationParaCtrl.getFieldValue('calcDateTo')))
    causeDateFrom = causeDateFrom || (empOrderSicknessID && AC.dateService.shiftDate(me.attr.empOrderSicknessID.getFieldValue('dateFrom'))) ||
      (causeVacationParaID && AC.dateService.shiftDate(me.attr.causeVacationParaID.getFieldValue('dateFrom')))
    causeDateTo = causeDateTo || (empOrderSicknessID && AC.dateService.shiftDate(me.attr.empOrderSicknessID.getFieldValue('dateTo'))) ||
      (causeVacationParaID && AC.dateService.shiftDate(me.attr.causeVacationParaID.getFieldValue('dateTo')))
    if (grantDateTo || causeDateTo) {
      let newDateFrom = _.max([grantDateTo, causeDateTo])
      newDateFrom = AC.dateService.addDays(newDateFrom, 1)
      me.getProlongDayCount({ grantVacationParaID, grantDateFrom, grantDateTo, causeDateFrom, causeDateTo }).then(mParams => {
        let daysCount = mParams.daysCount
        me.isInnerChange = true
        me.attr.dateFrom.setValue(newDateFrom)
        me.attr.dayCount.setValue(daysCount)
        let newDateTo = daysCount > 1 ? AC.dateService.addDays(newDateFrom, daysCount - 1) : newDateFrom
        me.attr.dateTo.setValue(newDateTo)
        me.isInnerChange = false
        callBackFn && callBackFn()
      })
    } else {
      callBackFn && callBackFn()
    }
  } else {
    me.isInnerChange = true
    me.attr.dateFrom.setValue(null)
    me.attr.dateTo.setValue(null)
    me.attr.dayCount.setValue(null)
    me.isInnerChange = false
    callBackFn && callBackFn()
  }
}

function setHolidayInfo () {
  const me = this
  const holidayInfo = me.down('[name=holidayInfo]')
  const dateFrom = me.attr.dateFrom.getValue()
  const dateTo = me.attr.dateTo.getValue()
  HR.timeService.setHolidayInfo(holidayInfo, dateFrom, dateTo, appAC.globalOrganization())
}

/* Перевірки при збереженні форми */
function validateForm (showMessage = false) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1

  if (me.enableValidators) {
    let dateFrom = me.attr.dateFrom.getValue()
    let isDateFrom = AC.dateService.isValid(dateFrom)
    let dateTo = me.attr.dateTo.getValue()
    let isDateTo = AC.dateService.isValid(dateTo)
    if (isDateFrom && isDateTo && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n('"Дата закінчення за заявою" не може бути меншою за "Дату початку за заявою"')
      })
      result = false
    }
  }

  return Promise.resolve(true).then(res => {
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
    me.isClosing = false
    me.canClose = result
    return result
  })
}

function validateVacListItem ({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isDay, showMessage = false, ctx, aggregateErrors = false }) {
  const me = this
  let result = true
  const errors = []
  const errorTag = 2
  const employeeNumberID = me.getEmployeeNumberID()
  const employeePositionID = me.attr.employeePositionID.getValue()
  const orgID = me.record.get('organizationID')
  const orderID = me.record.get('orderID')
  const orderDetID = me.instanceID
  const isRecDateFrom = AC.dateService.isValid(recDateFrom)
  const isRecDateTo = AC.dateService.isValid(recDateTo)
  const dateFrom = AC.dateService.unshiftDate(me.attr.dateFrom.getValue())
  const isDateFrom = AC.dateService.isValid(dateFrom)
  ctx = ctx || {}

  if (!me.enableValidators) {
    me.clearErrors(errorTag)
    Promise.resolve(true)
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
          orgID: me.record.get('organizationID'),
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
  const empVacationPeriodIDCtrl = editor.query(`[name=empVacationPeriodID.descriptionEx]`)[0]
  const vacPeriodID = empVacationPeriodIDCtrl.getFieldValue('ID')

  editor.isCheckRun = true
  return me.validateVacListItem({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isDay, showMessage, ctx })
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
            const lookups = empOrderVacationListDet.lookups
            let vacItem = lookups.dictVacationKind.find(item => item.ID === dictVacationKindID)
            let isDay = vacItem ? vacItem.isDay : false

            let itemPromise = me.validateVacListItem({ listDetID, dictVacationKindID, recDateFrom, recDateTo, recDayCount, vacPeriodID, isDay, aggregateErrors: true })
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

function onSicknessChanged () {
  const me = this
  const empOrderSicknessCtrl = me.attr.empOrderSicknessID
  let empOrderSicknessID = empOrderSicknessCtrl.getValue()
  let employeeNumberID = me.getEmployeeNumberID()
  if (!empOrderSicknessID || !employeeNumberID) {
    me.isInnerChange = true
    me.attr.causeVacationParaID.setValue(null)
    me.isInnerChange = false
    return
  }
  let sickDateFrom = AC.dateService.shiftDate(empOrderSicknessCtrl.getFieldValue('dateFrom'))
  let sickDateTo = AC.dateService.shiftDate(empOrderSicknessCtrl.getFieldValue('dateTo'))
  let sickDays = empOrderSicknessCtrl.getFieldValue('days')
  me.filterVacationPara({
    employeeNumberID: employeeNumberID,
    toClearValue: false,
    dateFrom: sickDateFrom,
    dateTo: sickDateTo
  })
  UB.Repository('hr_empOrderVacationDet')
    .attrs(['ID', 'dateFrom', 'calcDateTo'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('dateFrom', '<=', sickDateTo)
    .where('calcDateTo', '>=', sickDateFrom)
    .orderBy('dateFrom', 'desc')
    .selectSingle()
    .then(orderDet => {
      let hasVacOrder = !!orderDet
      if (hasVacOrder) {
        let action = me.attr.action.getValue()
        me.setVacPeriod({
          action,
          grantVacationParaID: orderDet.ID,
          grantDateFrom: orderDet.dateFrom,
          grantDateTo: orderDet.calcDateTo,
          causeDateFrom: sickDateFrom,
          causeDateTo: sickDateTo
        })
      } else {
        me.isInnerChange = true
        let todayDate = AC.dateService.todayDate()
        me.attr.dateFrom.setValue(todayDate)
        me.attr.dayCount.setValue(sickDays)
        let newDateTo = AC.dateService.addDays(todayDate, sickDays - 1)
        me.attr.dateTo.setValue(newDateTo)
        me.isInnerChange = false
        $App.dialogInfo(UB.i18n('В системі відсутня інформація про відпустку під час дії вибраного лікарняного'), UB.i18n('Увага'))
      }
      me.isInnerChange = true
      me.attr.grantVacationParaID.setValueById((hasVacOrder && orderDet.ID) || null)
      me.isInnerChange = false
    })
}

function onCauseVacationChanged () {
  const me = this
  const causeVacationCtrl = me.attr.causeVacationParaID
  let causeVacationParaID = causeVacationCtrl.getValue()
  let employeeNumberID = me.getEmployeeNumberID()
  if (!causeVacationParaID || !employeeNumberID) {
    return
  }
  let vacDateFrom = AC.dateService.shiftDate(causeVacationCtrl.getFieldValue('dateFrom'))
  let vacDateTo = AC.dateService.shiftDate(causeVacationCtrl.getFieldValue('dateTo'))
  me.filterVacationPara({
    employeeNumberID: employeeNumberID,
    toClearValue: false,
    dateFrom: vacDateFrom,
    dateTo: vacDateTo
  })
  UB.Repository('hr_empOrderVacationDet')
    .attrs(['ID', 'dateFrom', 'calcDateTo'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .where('dateFrom', '<=', vacDateTo)
    .where('calcDateTo', '>=', vacDateFrom)
    .orderBy('dateFrom', 'desc')
    .selectSingle()
    .then(orderDet => {
      let hasVacOrder = !!orderDet
      if (hasVacOrder) {
        let action = me.attr.action.getValue()
        me.setVacPeriod({
          action,
          grantVacationParaID: orderDet.ID,
          grantDateFrom: orderDet.dateFrom,
          grantDateTo: orderDet.calcDateTo,
          causeDateFrom: vacDateFrom,
          causeDateTo: vacDateTo
        })
      }
      me.isInnerChange = true
      me.attr.grantVacationParaID.setValueById((hasVacOrder && orderDet.ID) || null)
      me.isInnerChange = false
    })
}

function clearVacList (vacListStore) {
  const me = this
  if (!vacListStore) {
    const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
    vacListStore = empOrderVacationListDet.getStore()
  }
  $App.connection.run({
    entity: 'hr_empOrderVacationListDet',
    method: 'clearDetail',
    paraID: me.record.get('ID')
  }).then((result) => {
    vacListStore.load()
  })
}
function clearActingParaGrid (form, store) {
  $App.connection.run({
    entity: 'hr_empOrderActingDet',
    method: 'clearDetail',
    paraID: form.record.get('ID')
  }).then((result) => {
    store.load()
  })
}

function setLabelValues () {
  const me = this
  let action = me.attr.action.getValue()
  let grantVacLabel
  switch (action) {
    case 'PROLONG':
      grantVacLabel = UB.i18n('Відпустка, яка продовжується')
      break
    case 'TRANSFER':
      grantVacLabel = UB.i18n('Відпустка, яка переноситься')
      break
    case 'CANCEL':
      grantVacLabel = UB.i18n('Відпустка, яка скасовується')
      break
  }
  grantVacLabel && me.attr.grantVacationParaID.setFieldLabel(grantVacLabel)
}

function checkSicknessCrossTimeSheet () {
  const me = this
  if (me.attr.action !== 'CANCEL') {
    const dateFrom = me.attr.dateFrom.getValue()
    const dateTo = me.attr.dateTo.getValue()
    const employeeNumberID = me.getEmployeeNumberID()
    if (employeeNumberID && AC.dateService.isValid(dateFrom) && AC.dateService.isValid(dateTo)) {
      $App.connection.run({
        entity: 'hr_empOrderVacationDet',
        method: 'checkSicknessCrossTimeSheet',
        execParams: {
          employeeNumberID: employeeNumberID,
          dateFrom: dateFrom,
          dateTo: dateTo
        },
        // monkey request prevention
        currTime: Date.now()
      }).then(mParams => {
        if (mParams.result) {
          $App.dialogInfo(mParams.result, UB.i18n('Увага'))
        }
      })
    }
  }
}
