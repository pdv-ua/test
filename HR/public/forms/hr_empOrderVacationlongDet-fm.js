/* global AC HR $App Ext UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  onFormRefresh,
  enableControls,
  addBaseActions,
  setVacationDays,
  setVacationDateTo,
  checkPosition,
  validate,
  validateForm,
  clearErrors,
  startActingGridEdit,
  validateActing,
  getActingPayEl,
  filterEmpOrderSickness,
  setDefaultSickness
}

function startActingGridEdit (rowEditor, context) {
  const me = this
  const editor = rowEditor.editor
  const reco = context.record
  if (reco.get('ID')) {
    return
  }
  me.getActingPayEl()
    .then(data => {
      if (!data) {
        return
      }
      reco.set('payElID', data.payElID)
      reco.set('payElID.description', data['payElID.description'])
      let payElCtrl = editor.query('[name=payElID.description]')[0]
      payElCtrl.setValue(data['payElID.description'])
    })
}

function validateActing () {
  const me = this
  let errors = []
  let aGrid = me.down('[name=hr_empOrderActingDet]')
  const errorTag = 1
  if (!aGrid) {
    return
  }
  const hrCheckPayElActing = AC.settings.get('hrCheckPayElActing', me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()) || 0

  const promise = aGrid.store.data.items.length ? Promise.resolve(aGrid.store) : aGrid.store.load()

  return promise.then(store => {
    if (hrCheckPayElActing) {
      aGrid.store.data.items.forEach(rec => {
        let payElID = rec.get('payElID')
        let empPosID = rec.get('employeePositionID')
        if (empPosID && !payElID) {
          let empDesc = rec.get('employeePositionID.description')
          let msg = UB.i18n(`ТВО {0} - не вказано вид оплати за заміщення`, empDesc)
          errors.push({
            tag: errorTag,
            code: 'actingCheck' + empPosID,
            msg: msg
          })
        }
      })
    }
    return errors
  })
}

function getActingPayEl () {
  const me = this
  return UB.Repository('hr_dictVacationKind')
    .attrs('payElTempExecutionID', 'payElTempExecutionID.description')
    .where('ID', '=', me.record.get('dictVacationKindID'))
    .where('payElTempExecutionID', 'isNotNull')
    .selectSingle({
      'payElTempExecutionID': 'payElID',
      'payElTempExecutionID.description': 'payElID.description'
    })
    .then(data => {
      return data
    })
}

function checkPosition (toChangeFields) {
  HR.controlService.filterEmpPosCtrl(this, 'employeePositionID', 'dateFrom', 'dateTo', toChangeFields)
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('refresh', me.onFormRefresh, me)
  if (me.externalInitComponentStart) {
    me.externalInitComponentStart(me)
  }
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
  const dictVacationKindID = me.getField('dictVacationKindID')
  dictVacationKindID.getStore().ubRequest.logicalPredicates = dictVacationKindID.logicalPredicates
  /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  }) */
  me.errors = []
  me.canClose = true
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
  me.isMultiOrder = false
  if (AC.settings.get('hrMultiOrganization')) {
      me.isMultiOrder = true
      HR.orderManager.setMultiOrderButton(me, 5, function () {
      $App.connection.run({
        entity: 'hr_empOrderVacationlongDet',
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
    // positionExists: true,
    logicalPredicates: ['(([empPosDateFrom] AND [empPosDateTo]) OR ([empPosMaxDateTo] AND [empNumMaxDateTo] AND [empPosDateToLess] AND [empNumMiDelete]))'],
    params: [
      ['[dateTo]=[maxDateTo]', 'custom', undefined, 'empPosMaxDateTo'],
      ['employeeNumberID.dateTo', '=', '#maxdate', 'empNumMaxDateTo'],
      ['dateTo', '<', onDate, 'empPosDateToLess'],
      ['employeeNumberID.mi_deleteDate', '>=', '#maxdate', 'empNumMiDelete']
    ]
  })

  function onEmpOrderSicknessFirstLoad (store) {
    if (!me.attr.empOrderSicknessID.isInnerChange) {
      me.setDefaultSickness()
    } else {
      me.attr.empOrderSicknessID.isInnerChange = false
    }
    store.un('load', onEmpOrderSicknessFirstLoad)
  }
  const empOrderSicknessStore = me.attr.empOrderSicknessID.getStore()
  empOrderSicknessStore.on('load', onEmpOrderSicknessFirstLoad)

  me.filterEmpOrderSickness()
  me.checkPosition(false)
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
  })
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
  } else {
    let rawErrorText = me.record.get('errorText')
    if (rawErrorText) {
      me.errors = JSON.parse(rawErrorText)
      let errorText = HR.controlService.getFormErrorsText(me.errors)
      const errorLabel = me.down('[name=errorText]')
      errorLabel.setText(errorText, false)
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
  HR.orderManager.requiredIf(me)
  HR.orderManager.disabledIf(me)
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.enableControls()
  if (me.isMultiOrder) {
    HR.orderManager.checkMultiOrgActionState(me)
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
        return HR.orderManager.checkIntCombVac(me).then(result => {
          if (result) {
            return $App.connection.run({
              entity: 'hr_empOrderVacationlongDet',
              method: 'addIntComb',
              orderID: me.record.get('orderID'),
              employeePositionID: me.attr.employeePositionID.getValue(),
              dictVacationKindID: me.attr.dictVacationKindID.getValue(),
              dateFrom: me.attr.dateFrom.getValue(),
              dateTo: me.attr.dateTo.getValue(),
              dayCount: me.attr.dayCount.getValue(),
              reason: me.attr.reason.getValue(),
              action: me.attr.action.getValue()
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
                entity: 'hr_empOrderVacationlongDet',
                method: 'addIntComb',
                orderID: me.record.get('orderID'),
                employeePositionID: me.attr.employeePositionID.getValue(),
                dictVacationKindID: me.attr.dictVacationKindID.getValue(),
                dateFrom: me.attr.dateFrom.getValue(),
                dateTo: me.attr.dateTo.getValue(),
                dayCount: me.attr.dayCount.getValue(),
                reason: me.attr.reason.getValue()
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
  let me = this
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  let enabled = isProject && me.isEditMode
  let addPeriodsAction = me.actions.addPeriods
  if (addPeriodsAction) {
    me.actions.addPeriods.setDisabled(!enabled)
  }
  const addIntCombAction = me.actions.addIntComb
  if (addIntCombAction) {
    let workPlace = me.attr.employeePositionID.getFieldValue('workPlace')
    addIntCombAction.setDisabled(!(enabled && workPlace === '1'))
  }
  me.orderForm.enableParaControls(me)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      me.filterEmpOrderSickness(field.getFieldValue('employeeID'))
      if (me.isMultiOrder) {
        HR.orderManager.checkMultiOrgActionState(me)
      }
      break
    case 'dateFrom':
    case 'dateTo':
      if (AC.dateService.isValid(value)) {
        me.setVacationDays()
        if (me.isMultiOrder) {
          HR.orderManager.checkMultiOrgActionState(me, value)
        }
      }
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
    case 'dictVacationKindID':
      me.record.set('dictVacationKindID.code', field.getFieldValue('code'))
      me.setDefaultSickness()
      me.attr.isTempVacancy.setValue(field.getFieldValue('isTempVacancy'))
      me.attr.isSuspendVacPlan.setValue(field.getFieldValue('isTempVacancy'))
      break
    case 'empOrderSicknessID':
      let dateFrom
      let dateTo
      let descr
      if (value) {
        dateFrom = field.getFieldValue('dateFrom')
        dateTo = field.getFieldValue('dateTo')
        descr = field.getFieldValue('description')
      } else {
        dateFrom = null
        dateTo = null
        descr = ' '
      }
      me.attr.dateFrom.setValue(dateFrom)
      me.attr.dateTo.setValue(dateTo)
      me.attr.reason.setValue(descr)
      break
  }
}

function setVacationDays () {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateTo = me.attr.dateTo.getValue()
  let dayCount
  if (!(AC.dateService.isValid(dateFrom) && AC.dateService.isValid(dateTo))) {
    dayCount = null
  } else {
    dayCount = AC.dateService.dateDiff(dateFrom, dateTo) + 1
  }
  me.isInnerChange = true
  try {
    me.attr.dayCount.setValue(dayCount)
  } finally {
    me.isInnerChange = false
  }
}

function setVacationDateTo () {
  const me = this
  let dateFrom = me.attr.dateFrom.getValue()
  let dateToCtrl = me.attr.dateTo
  let dayCount = me.attr.dayCount.getValue()
  let dateTo
  if (!AC.dateService.isValid(dateFrom) || !dayCount) {
    dateTo = null
  } else {
    dateTo = AC.dateService.addDays(dateFrom, dayCount - 1)
  }
  me.isInnerChange = true
  try {
    dateToCtrl.setValue(dateTo)
  } finally {
    me.isInnerChange = false
  }
}

/* Перевірки при збереженні форми */
function validateForm (showMessage = false) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  let checkEmpNumDatesParams
  let checkVacationCrossPeriodParams
  let checkVacationCrossTimeSheetParams
  let checkNotPerVacParams
  let actingCheckPromise

  if (me.enableValidators) {
    // const employeePositionID = me.attr.employeePositionID.getValue()
    const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
    const dictVacationKindID = me.attr.dictVacationKindID.getValue()
    const dateFrom = me.attr.dateFrom.getValue()
    const isDateFromValid = AC.dateService.isValid(dateFrom)
    const dateTo = me.attr.dateTo.getValue()
    const isDateToValid = AC.dateService.isValid(dateTo)
    const dayCount = me.attr.dayCount.getValue()
    const orgID = me.record.get('organizationID')
    // const orderID = me.record.get('orderID')

    if (isDateFromValid && isDateToValid && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n('"Дата закінчення відпустки" не може бути меншою за "Дату початку відпустки"')
      })
      result = false
    }
    actingCheckPromise = me.validateActing()

    /* Перевірка на вихід за межі дії таб. номера */
    if (employeeNumberID && isDateFromValid && isDateToValid) {
      checkEmpNumDatesParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkEmpNumberPeriod',
        execParams: {
          employeeNumberID: employeeNumberID,
          dateFrom: dateFrom,
          dateTo: dateTo
        },
        // monkey request prevention
        currTime: Date.now(),
        listDetID: me.instanceID
      }
    }

    /* Перевірка на перетин з іншими відпустками працівника - відмінено, неперіодична відпустка може перетинати періодичну, запит UBHR-10981 */
    /* if (employeeNumberID && employeePositionID && isDateFromValid && isDateToValid) {
      checkVacationCrossPeriodParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkVacationCrossPeriod',
        execParams: {
          employeeNumberID: employeeNumberID,
          employeePositionID: employeePositionID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          orderID: orderID,
          listDetID: 0
        },
        // monkey request prevention
        currTime: Date.now()
      }
    } */

    /* Перевірка в табелі на перетин з недозволеними елементами */
    if (employeeNumberID && dictVacationKindID && isDateFromValid && isDateToValid) {
      checkVacationCrossTimeSheetParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkVacationCrossTimeSheet',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dateTo: dateTo
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    /* Перевірка, щоб кількість днів відпустки без збереження заробітної плати за рік не повинна перевищувати 15 дн */
    if (employeeNumberID && dictVacationKindID && isDateFromValid && isDateToValid && dayCount && orgID) {
      checkNotPerVacParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkNotPerVacDays',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          dayCount: dayCount,
          orgID: orgID
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }
  }

  return Promise.resolve(true).then(res => {
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
    if (actingCheckPromise) {
      return actingCheckPromise
    } else {
      return Promise.resolve({})
    }
  }).then(actErrors => {
    if (actErrors && actErrors.length) {
      errors = errors.concat(actErrors)
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
    if (checkNotPerVacParams) {
      return $App.connection.run(checkNotPerVacParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'notPerVacParamsCheck',
        msg: mParams.msg
      })
    }
    return Promise.resolve(true)
  }).then(res => {
    me.record.set('positionID', me.getField('employeePositionID').getFieldValue('positionID'))
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, !me.isClosing, 'errorText')
    me.isClosing = false
    me.canClose = result
    return result
  })
}

/* Всі перевірки, errorTag: 0 - всі перевірки, 1 - перевірки змін форми */
function validate (errorTag = 0, showMessage = true) {
  const me = this
  me.clearErrors()
  me.isInternalRefresh = true
  me.errorsIsNotSaved = true
  return me.validateForm(showMessage)
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
    me.errorsIsNotSaved = true
  }
}

function filterEmpOrderSickness (employeeID) {
  const me = this
  const modes = ['clearStore']
  if (employeeID) {
    modes.push('clearValue')
  } else {
    employeeID = me.record.get('employeeID') || 0
  }
  AC.viewUtils.setWhereListProperty(me.attr.empOrderSicknessID, [
    ['employeeID', '=', employeeID]
  ], undefined, ['clearStore', 'clearValue'])
}

function setDefaultSickness () {
  const me = this
  me.attr.empOrderSicknessID.isInnerChange = true
  let sicknessStore = me.attr.empOrderSicknessID.getStore()
  if (me.record.get('dictVacationKindID.code') === 'dPrCh' && sicknessStore.getCount() === 1) {
    me.attr.empOrderSicknessID.setValueById(sicknessStore.data.items[0].get('ID'))
  } else {
    me.attr.empOrderSicknessID.setValue(null)
  }
}
