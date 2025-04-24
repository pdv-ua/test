/* global appAC HR AC $App UB Ext */
exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  addBaseActions,
  onAfterRender,
  onBeforeSave,
  onAfterSave,
  onFormRefresh,
  setVacationDays,
  setVacationDateTo,
  setHolidayInfo,
  validate,
  validateForm,
  validateVacListItem,
  clearErrors,
  loadLookupStores
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('refresh', me.onFormRefresh, me)
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
 /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  })*/
  me.errors = []
  me.canClose = true
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
    // positionExists: true
  })
  me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('grantVacationParaID')) {
      let grantVacationParaID = me.getField('grantVacationParaID')
      let dateFrom = grantVacationParaID.getFieldValue('dateTo')
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
  me.orderForm.makeReasonSelector(me)
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)

  me.getField('dayCount').setReadOnly(true)
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

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.enableControls()
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
          entity: 'hr_empOrderVacationrevokeDet',
          method: 'addIntComb',
          orderID: me.record.get('orderID'),
          employeePositionID: me.attr.employeePositionID.getValue(),
          employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
          dateFrom: me.attr.dateFrom.getValue(),
          dateTo: me.attr.dateTo.getValue(),
          dayCount: me.attr.dayCount.getValue(),
          reason: me.attr.reason.getValue(),
          reasonDoc: me.attr.reasonDoc.getValue()
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
            entity: 'hr_empOrderVacationrevokeDet',
            method: 'addIntComb',
            orderID: me.record.get('orderID'),
            employeePositionID: me.attr.employeePositionID.getValue(),
            employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
            dateFrom: me.attr.dateFrom.getValue(),
            dateTo: me.attr.dateTo.getValue(),
            dayCount: me.attr.dayCount.getValue(),
            reason: me.attr.reason.getValue(),
            reasonDoc: me.attr.reasonDoc.getValue()
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

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
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
  const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
  AC.gridUtils.enableCustomAction(empOrderVacationListDet, 'cloneVacationList', enabled)
  me.orderForm.enableParaControls(me)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
    case 'dateTo':
      if (field.value && AC.dateService.isDateString(field.getRawValue()) && AC.dateService.isValid(value)) {
        let dateFrom = me.getField('dateFrom')
        let dateTo = me.getField('dateTo')
        let store = me.down('[name=empOrderVacationListDet]').getStore()
        if (AC.dateService.isValid(dateFrom.getValue()) && AC.dateService.isValid(dateTo.getValue())) {
          if (store.getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('При зміні дати список видів відпусток буд очищено. Продовжити?'))
              .then(function (choice) {
                if (!choice) {
                  me.isInnerChange = true
                  try {
                    field.setValue(oldValue)
                  } finally {
                    me.isInnerChange = false
                  }
                } else {
                  store.loadData([])
                  me.setVacationDays()
                }
              })
          } else {
            me.setVacationDays()
          }
        } else {
          me.isInnerChange = true
          try {
            me.getField('dayCount').setValue(null)
          } finally {
            me.isInnerChange = false
          }
        }
        me.setHolidayInfo()
      }
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
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

function setVacationDays () {
  let me = this
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
  let me = this
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
  let checkNoVacDaysParams

  if (me.enableValidators) {
    const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
    const dateFrom = me.attr.dateFrom.getValue()
    const isDateFrom = AC.dateService.isValid(dateFrom)
    const dateTo = me.attr.dateTo.getValue()
    const isDateTo = AC.dateService.isValid(dateTo)
    // const orderID = me.record.get('orderID')
    if (isDateFrom && isDateTo && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n(`Дата 'Відкликати з' ({0}) менша за дату 'по' ({1})`, AC.dateService.formatDate(dateFrom), AC.dateService.formatDate(dateTo))
      })
      result = false
    }

    /* Перевірка на дні відкликання, для яких не знайдено відпустку */
    if (employeeNumberID && isDateFrom && isDateTo) {
      checkNoVacDaysParams = {
        entity: 'hr_empOrderVacationrevokeDet',
        method: 'checkNoVacDays',
        execParams: {
          employeeNumberID: employeeNumberID,
          dateFrom: dateFrom,
          dateTo: dateTo
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }
  }

  return Promise.resolve(true)
    .then(res => {
      if (checkNoVacDaysParams) {
        return $App.connection.run(checkNoVacDaysParams)
      } else {
        return Promise.resolve({})
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'noVacDaysCheck',
          msg: mParams.msg
        })
      }
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
      me.isClosing = false
      me.canClose = result
      return result
    })
}

function validateVacListItem (listDetID, recDateFrom, recDateTo, isBreackVacancy, vacName, showMessage = false) {
  const me = this
  let result = true
  const errors = []
  const errorTag = 2
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const employeePositionID = me.attr.employeePositionID.getValue()
  const orgID = me.record.get('organizationID')
  const orderID = me.record.get('orderID')
  const isRecDateFrom = AC.dateService.isValid(recDateFrom)
  const isRecDateTo = AC.dateService.isValid(recDateTo)

  if (!me.enableValidators) {
    me.clearErrors(errorTag)
    return Promise.resolve(true)
  }

  /* Перевірка, щоб види відпустки в періодах мали позначку "Можливість відкликання з відпустки" */
  if (!isBreackVacancy) {
    errors.push({
      tag: 0,
      code: 'isBreakVacCheck',
      msg: UB.i18n(`Вид відпустки '{0}' - без позначки "Переривання відпустки", що системою не дозволено. Налаштуйте види відпустки`, vacName)
    })
  }

  /* Перевірка на перетин з іншими відкликаннями з відпустки працівника */
  let checkVacationCrossPeriodParams
  if (employeeNumberID && employeePositionID && orgID && isRecDateFrom && isRecDateTo) {
    checkVacationCrossPeriodParams = {
      entity: 'hr_empOrderVacationrevokeDet',
      method: 'checkVacationCrossPeriod',
      execParams: {
        employeeNumberID: employeeNumberID,
        dateFrom: recDateFrom,
        dateTo: recDateTo,
        orderID: orderID,
        listDetID: listDetID
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  return Promise.resolve(true)
    .then(res => {
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
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage, 'errorText')
      return result
    })
}

/* Всі перевірки, errorTag: 0 - всі перевірки, 1 - перевірки змін форми, 2 - перевірки змін детального гріда */
function validate (errorTag = 0, showMessage = true) {
  const me = this
  const validateFormPromise = errorTag > 1 ? Promise.resolve(true) : me.validateForm(showMessage)
  me.clearErrors(errorTag)
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
            const lookups = empOrderVacationListDet.lookups
            let vacItem = lookups.dictVacationKind.find(item => item.ID === dictVacationKindID)
            let isBreackVacancy = vacItem ? vacItem.isBreackVacancy : false
            let vacName = (vacItem && vacItem.name) || '?'
            let itemPromise = me.validateVacListItem(listDetID, recDateFrom, recDateTo, isBreackVacancy, vacName, true)
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
  if (!empOrderVacationListDet.lookups) {
    empOrderVacationListDet.lookups = {}
  }
  return UB.Repository('hr_dictVacationKind')
    .attrs(['ID', 'name', 'isBreackVacancy'])
    .orderBy('ID')
    .selectAsObject().then(data => {
      empOrderVacationListDet.lookups.dictVacationKind = data
      return Promise.resolve(true)
    })
}
