/* global UB $App AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  onFormRefresh,
  onBeforeClose,
  addVacations,
  clearVacations,
  validate,
  validateForm,
  validateVacList,
  validateVacListItem,
  clearErrors,
  setPayEl
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', me.onControlChanged, me)
  me.on('beforeClose', me.onBeforeClose, me)
  me.on('formDataReady', me.onFormDataReady)
  me.on('recordloaded', me.onRecordLoaded)
  me.on('refresh', me.onFormRefresh, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.errors = []
  me.canClose = true
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInternalChange) {
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      const empOrderVacationcompListDet = me.down('[name=empOrderVacationcompListDet]')
      const dismVacStore = empOrderVacationcompListDet.getStore()
      if (dismVacStore && dismVacStore.getCount()) {
        $App.dialogYesNo('Попередження', UB.i18n('Вибрано інше значення "Працівник"<br>Так - видалити пункти списків<br>Ні - залишити попереднє значення "Працівник"'))
          .then(function (res) {
            if (res) {
              me.clearVacations()
            } else {
              me.isInternalChange = true
              try {
                me.attr.employeePositionID.setValue(oldValue)
              } finally {
                me.isInternalChange = false
              }
            }
          })
      }
      AC.gridUtils.enableCustomAction(empOrderVacationcompListDet, 'addVacations', value)
      me.setPayEl(field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
      break
  }
}

function onBeforeClose () {
 /* const me = this
  AC.gridUtils.refreshSenderGrid(me)
  return true*/
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
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    me.record.set('dateFrom', appAC.globalApplicationDate())
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
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
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
  HR.orderManager.setDefaultValues(me)
}

async function onFormDataReady () {
  const me = this
  me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
  me.enableControls()
  me.setPayEl(me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'), true)
}

function onBeforeSave () {
  const me = this
  if (me.isInnerSave) {
    return Promise.resolve(true)
  } else {
    return me.validateForm(me.isEditMode).then(res => {
      me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
      if (res) {
        me.errorsIsNotSaved = false
      }
      return res
    })
  }
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

function enableControls () {
  const me = this
  const grid = me.down('[name=empOrderVacationcompListDet]')
  const isProject = me.record.get('orderID.orderState') === 'PROJECT'
  let enabled = isProject && me.isEditMode
  if (grid) {
    AC.gridUtils.enableCustomAction(grid, 'addVacations', enabled)
  }
  me.orderForm.enableParaControls(me)
}

function setPayEl (dictStaffCatID, positionType, onlyState) {
  const me = this
  const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, dictStaffCatID, positionType)
  if (config) {
    if (!onlyState) {
      me.attr.payElID.setValueById(config.payElIDMain)
    }
    me.attr.payElID.setDisabled(!config.canEditPayElMain)
  } else {
    me.attr.payElID.setDisabled(true)
    me.attr.payElID.setValue()
  }
}

function addVacations () {
  const me = this
  const grid = me.down('[name=empOrderVacationcompListDet]')
  me.isInnerSave = true
  HR.controlService.checkAndSaveForm(me, () => {
    me.isInnerSave = false
    return $App.connection.run({
      entity: 'hr_empOrderVacationcompDet',
      method: 'addPeriods',
      orgID: me.record.get('organizationID'),
      paraID: me.instanceID,
      orderID: me.record.get('orderID'),
      employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
      onDate: me.attr.dateFrom.getValue()
    }).then(() => {
      grid.getStore().load(() => {
        me.validate(0, false)
      })
    })
  })
}

function clearVacations () {
  const me = this
  const grid = me.down('[name=empOrderVacationcompListDet]')
  HR.controlService.checkAndSaveForm(me, () => {
    return $App.connection.run({
      entity: 'hr_empOrderVacationcompDet',
      method: 'clearPeriods',
      paraID: me.instanceID
    }).then(() => {
      grid.getStore().load(() => {
        me.validate(0, false)
      })
    })
  })
}

/* Перевірки при збереженні форми */
function validateForm (showMessage) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1

  if (me.enableValidators) {
    const empOrderVacationcompListDet = me.down('[name=empOrderVacationcompListDet]')
    const compListStore = empOrderVacationcompListDet.store
    let isDayCompErr = compListStore.getCount() === 0
    if (!isDayCompErr) {
      let hasCompDayCount = false
      for (let i = 0; i < compListStore.data.items.length; i++) {
        let compListItem = compListStore.data.items[i]
        let dayComp = compListItem.get('dayComp') || 0
        if (dayComp > 0) {
          hasCompDayCount = true
          break
        }
      }
      isDayCompErr = !hasCompDayCount
    }
    if (isDayCompErr) {
      errors.push({
        tag: 0,
        code: 'dayCompCheck',
        msg: UB.i18n('Не додано інформацію про кількість днів компенсації')
      })
    }
  }

  return Promise.resolve(true).then(res => {
    if (showMessage === undefined) {
      showMessage = !me.isClosing
    }
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
    me.isClosing = false
    me.canClose = result
    return result
  })
}

function validateVacListItem (compItems, currID, dayComp, showMessage = false) {
  const me = this
  let result = true
  const errors = []
  const errorTag = 2

  if (!me.enableValidators) {
    me.clearErrors(errorTag)
    return Promise.resolve(true)
  }

  let isCompDays = false
  if (compItems.length > 0) {
    for (let i = 0; i < compItems.length; i++) {
      let compListItem = compItems[i]
      let itemID = compListItem.get('ID')
      let itemDayComp = itemID === currID ? dayComp : (compListItem.get('dayComp') || 0)
      if (itemDayComp > 0) {
        isCompDays = true
        break
      }
    }
  } else {
    isCompDays = dayComp > 0
  }
  if (!isCompDays) {
    errors.push({
      tag: 0,
      code: 'dayCompCheck',
      msg: UB.i18n('Не додано інформацію про кількість днів компенсації')
    })
  }

  return Promise.resolve(true)
    .then(res => {
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage, 'errorText')
      return result
    })
}

/* Перевірки при збереженні компенсацій пункту наказу */
function validateVacList (editor, ctx, showMessage = false) {
  if (editor.isCheckRun) {
    return true
  }
  const me = this
  const empOrderVacationcompListDet = me.down('[name=empOrderVacationcompListDet]')
  const rec = ctx.record
  const dayCompCtrl = editor.query(`[name=dayComp]`)[0]
  const dayComp = dayCompCtrl.getValue()
  const currID = rec.get('ID')

  editor.isCheckRun = true
  return me.validateVacListItem(empOrderVacationcompListDet.store.data.items, currID, dayComp, showMessage)
    .then(res => {
      me.errorsIsNotSaved = true
      editor.isCheckRun = false
      return res
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
