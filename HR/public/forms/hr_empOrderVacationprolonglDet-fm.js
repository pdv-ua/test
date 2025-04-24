/* global UB HR AC $App Ext appAC */
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
  addBaseActions,
  setTitleByOrderType,
  setVacationDays,
  setVacationDateTo,
  filterVacationPara,
  refreshCalcData,
  setHolidayInfo,
  validateForm,
  clearErrors,
  checkVacSubstitution
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('controlChanged', onControlChanged, me)
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
  const vacSubstitutionGrid = me.down('[name=empOrderVacSubstitutionDet]')
  HR.controlService.setValidateEditPromise(vacSubstitutionGrid, onBeforeValidateVacSubstitutionGrid)
  const actingGrid = me.down('[name=hr_empOrderActingDet]')
  HR.controlService.setValidateEditPromise(actingGrid, onBeforeValidateActingGrid)
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
}

function onBeforeValidateVacSubstitutionGrid (rowEditor, context) {
  const me = context.grid.up('form')
  const actingGrid = me.down('[name=hr_empOrderActingDet]')
  return actingGrid.getStore().load().then(store => {
    if (store.data.items.length > 0) {
      return $App.dialogYesNo('Попередження', 'Внесена інформація на вкладці "Виконуючі обов`язки" буде видалена! Продовжити?')
        .then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacSubstitutionDet',
              method: 'clearActingDet',
              paraID: me.instanceID
            }).then(() => {
              actingGrid.onRefresh()
              return true
            })
          } else {
            return false
          }
        })
    } else {
      return true
    }
  })
}

function onBeforeValidateActingGrid (rowEditor, context) {
  const me = context.grid.up('form')
  const vacSubsGrid = me.down('[name=empOrderVacSubstitutionDet]')
  return vacSubsGrid.getStore().load().then(store => {
    if (store.data.items.length > 0) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Внесена інформація на вкладці "Продовжити час перебування на посаді" буде видалена! Продовжити?'))
        .then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacSubstitutionDet',
              method: 'clearVacSubstitutionDet',
              paraID: me.instanceID
            }).then(() => {
              vacSubsGrid.onRefresh()
              return true
            })
          } else {
            return false
          }
        })
    } else {
      return true
    }
  })
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      if (field.skipChange) {
        delete field.skipChange
        return
      }
      me.checkVacSubstitution(field, value, oldValue).then(result => {
        if (result) {
          me.filterVacationPara({
            employeeNumberID: field.getFieldValue('employeeNumberID'),
            isClearValue: true
          })
        }
      })
      break
    case 'dateFrom':
      me.checkVacSubstitution(field, value, oldValue).then(result => {
        if (result) {
          me.setVacationDays()
          me.setHolidayInfo()
        }
      })
      break
    case 'dateTo':
      me.setVacationDays()
      me.setHolidayInfo()
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
    case 'grantVacationParaID':
      me.attr.dateFrom.setValue(AC.dateService.addDays(field.getFieldValue('dateTo'), 1))
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
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  me.orderForm && me.orderForm.filterEmployeePosition && me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
    // params: [['positionID', 'isNotNull']]
  })
  me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('grantVacationParaID')) {
      let grantVacationParaID = me.getField('grantVacationParaID')
      let dateFrom = grantVacationParaID.getFieldValue('calcDateTo')
      let newDateFrom = me.getField('dateFrom').getValue()
      if (!newDateFrom || newDateFrom <= dateFrom) {
        me.getField('dateFrom').setValue(AC.dateService.addDays(dateFrom, 1))
      }
    }
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
        employeeNumberID: me.record.get('employeeNumberID'),
        isClearValue: false
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
  if (me.orderForm && me.orderForm.makeReasonSelector) {
    me.orderForm.makeReasonSelector(me)
    me.orderForm.makeReasonSelector(me, {
      reasonFieldName: 'reasonDoc',
      entityName: 'hr_dictOrderDetReasonDoc'
    })
  }
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)
  if (me.record.get('empOrderType') === 'VACATIONREVOKE') {
    let tp = me.down('[ubID=tpDetail]')
    tp.items.items[1].tab.hide()
    tp.items.items[2].tab.hide()
  }

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

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
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
          entity: 'hr_empOrderVacationprolonglDet',
          method: 'addIntComb',
          orderID: me.record.get('orderID'),
          employeePositionID: me.attr.employeePositionID.getValue(),
          dateFrom: me.attr.dateFrom.getValue(),
          dateTo: me.attr.dateTo.getValue(),
          dayCount: me.attr.dayCount.getValue(),
          reason: me.attr.reason.getValue(),
          grantVacationParaID: me.attr.grantVacationParaID.getValue()
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
            entity: 'hr_empOrderVacationprolonglDet',
            method: 'addIntComb',
            orderID: me.record.get('orderID'),
            employeePositionID: me.attr.employeePositionID.getValue(),
            dateFrom: me.attr.dateFrom.getValue(),
            dateTo: me.attr.dateTo.getValue(),
            dayCount: me.attr.dayCount.getValue(),
            reason: me.attr.reason.getValue(),
            grantVacationParaID: me.attr.grantVacationParaID.getValue()
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
        })
      }
    })
    me.actions.addIntComb = addIntCombAction
  }
}

function enableControls () {
  const me = this
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  let enabled = isProject && me.isEditMode
  const addIntCombAction = me.actions.addIntComb
  if (addIntCombAction) {
    let workPlace = me.attr.employeePositionID.getFieldValue('workPlace')
    addIntCombAction.setDisabled(!(enabled && workPlace === '1'))
  }
  if (me.orderForm && me.orderForm.enableParaControls) {
    me.orderForm && me.orderForm.enableParaControls && me.orderForm.enableParaControls(me)
  } else {
    me.query('[setReadOnly]').forEach(item => item.setReadOnly(true))
    me.actions.fDelete.setDisabled(true)
  }
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
  this.orderForm && this.orderForm.setTitleByOrderType && this.orderForm.setTitleByOrderType(this)
}

function filterVacationPara ({
  employeeNumberID,
  isClearValue
}) {
  let me = this
  let grantVacationParaID = me.getField('grantVacationParaID')
  if (!['VACATIONPROLONGL'].includes(me.record.get('empOrderType'))) {
    return
  }
  AC.viewUtils.setWhereListProperty(grantVacationParaID, [
    ['employeeNumberID', '=', employeeNumberID]
  ])
  grantVacationParaID.getStore().load().then(() => {
    if (isClearValue) {
      grantVacationParaID.setValueById(null)
    } else {
      grantVacationParaID.setValueById(grantVacationParaID.getFieldValue('ID'))
    }
  })
}

function refreshCalcData (me) {
  me.isInternalRefresh = true
  me.onRefresh()
  /* To refresh hr_empOrderDet.description */
  me.record.dirty = true
  me.saveInstance()
}

function setHolidayInfo () {
  const me = this
  const holidayInfo = me.down('[name=holidayInfo]')
  const dateFrom = me.attr.dateFrom.getValue()
  const dateTo = me.attr.dateTo.getValue()
  HR.timeService.setHolidayInfo(holidayInfo, dateFrom, dateTo, appAC.globalOrganization())
}

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

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
    me.errorsIsNotSaved = true
  }
}

function checkVacSubstitution (ctrl, value, oldValue) {
  const me = this
  const grid = me.down('[name=empOrderVacSubstitutionDet]')
  return grid.getStore().load().then(store => {
    if (store.data.length) {
      return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Внесена інформація на вкладці "Продовжити час перебування на посаді" буде видалена! Продовжити?'))
        .then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacSubstitutionDet',
              method: 'clearVacSubstitutionDet',
              paraID: me.instanceID
            }).then(() => {
              grid.onRefresh()
              return true
            })
          } else {
            me.isInnerChange = true
            try {
              ctrl.skipChange = true
              ctrl.setValueById(oldValue)
            } finally {
              me.isInnerChange = false
            }
            return false
          }
        })
    }
    return true
  })
}
