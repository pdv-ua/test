/* global _ $App UB AC appAC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onAttrKeypress,
  onRecordLoaded,
  onFormDataReady,
  setDefaultValues,
  onControlChanged,
  onBeforeSave,
  onAfterSave,
  onAfterDelete,
  onFormRefresh,
  enableControls,
  filterEmpPos,
  setVacationDays,
  setVacationDateTo,
  checkPosition,
  validate,
  validateForm,
  clearErrors
}

function checkPosition (toChangeFields) {
  HR.controlService.filterEmpPosCtrl(this, 'employeePositionID', 'dateFrom', 'dateTo', toChangeFields)
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
  filterEmpPos(me)
  HR.orderManager.setNextRecordMaker(me, [
    'organizationID',
    'state',
    'year',
    'dictVacationKindID'
  ], 4)
  HR.orderManager.setNextRecordMaker(me, [
    'organizationID',
    'state',
    'year',
    'dictVacationKindID',
    'employeePositionID',
    'employeeNumberID',
    'employeeID'
  ], 5, null, true)
  // AC.gridUtils.changeFilterMenuText(me.down('[name=hr_vacationScheduleActing]'), 1, 'Працівник')

  /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  }) */
  me.errors = []
  const dateAttrs = ['dateFrom', 'dateTo', 'dayCount']
  dateAttrs.forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function onRecordLoaded () {
  const me = this
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  if (!me.isNewInstance) {
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
  } else {
    me.record.set('isNewVacation', AC.settings.get('hrPlanIsNewVacation', appAC.globalOrganization()))
  }
  me.checkPosition(false)
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
  enableControls(me)
  getOrderFact(me)
  getOrderSchedule(me)
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  const defaultValues = me.customParams.defaultValues || me.defaultValues
  if (defaultValues) {
    _.forEach(defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  } else {
    let orgID
    let year
    let gridSender = AC.gridUtils.getSenderGrid(me)
    if (gridSender) {
      orgID = AC.viewUtils.getFilterValue(gridSender, 'organizationID')
      year = AC.viewUtils.getFilterValue(gridSender, 'year')
    }
    me.record.set('organizationID', orgID || appAC.globalOrganization())
    me.record.set('year', year || appAC.globalApplicationDate().getFullYear())
  }
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.isInnerChange) {
    return
  }
  if (!me.attr.dateFrom.getValue() || !me.attr.dateFrom.isValid() || !me.attr.dateTo.getValue() || !me.attr.dateTo.isValid()) { return }
  switch (ctrl.name) {
    case 'dateFrom':
      me.setVacationDays()
      me.checkPosition(true)
      break
    case 'dateTo':
      me.setVacationDays()
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dictVacationKindID':
      me.setVacationDays()
      break
    case 'dateFrom':
      if (AC.dateService.isValid(value) && me.attr.dateFrom.rawValue.length === 10) {
        const dateToVal = me.attr.dateTo.getValue()
        if (value && (!dateToVal || dateToVal < value)) {
          me.attr.dateTo.setValue(value)
        }
      }
      break
    case 'dateTo':
      if (AC.dateService.isValid(value) && me.attr.dateTo.rawValue.length === 10) {
        const dateFromVal = me.attr.dateFrom.getValue()
        if (value && (!dateFromVal || dateFromVal > value)) {
          me.attr.dateFrom.setValue(value)
        }
      }
      break
    case 'dayCount':
      me.setVacationDateTo()
      break
  }
}

async function onBeforeSave () {
  const me = this
  let res = await me.validateForm(true)
  me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
  if (res) {
    me.errorsIsNotSaved = false
  }

  let existedVacationSchedule = await UB.Repository('hr_vacationSchedule')
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeePositionID.description'])
    .where('ID', '!=', me.record.get('ID'))
    .where('state', 'equal', 'APPROVED')
    .where('employeePositionID', 'equal', me.record.get('employeePositionID'))
    .where('dateFrom', '<=', me.record.get('dateTo'))
    .where('dateTo', '>=', me.record.get('dateFrom'))
    .selectAsObject()

  if (existedVacationSchedule.length) {
    existedVacationSchedule = existedVacationSchedule[0]
    await $App.dialogError(UB.i18n(`Для працівника {0} вже заплановано відпустку з {1} по {2}`, existedVacationSchedule['employeePositionID.description'], AC.dateService.formatDate(existedVacationSchedule.dateFrom), AC.dateService.formatDate(existedVacationSchedule.dateTo)))
    return false
  }
  return res
}

function onAfterSave () {
  const me = this
  me.errorsIsNotSaved = true
  // AC.gridUtils.refreshSenderGrid(me)
}

function onAfterDelete () {
  AC.gridUtils.refreshSenderGrid(this)
}

function onFormRefresh () {
  const me = this
  me.validate()
}

function filterEmpPos (me, ctrl) {
  ctrl = ctrl || me.attr.employeePositionID
  let gridSender = AC.gridUtils.getSenderGrid(me)
  let orgID = (gridSender && AC.viewUtils.getFilterValue(gridSender, 'organizationID')) || appAC.globalOrganization()
  let onDate = me.record.get('dateFrom') || me.customOnDate || appAC.globalApplicationDate()
  AC.viewUtils.setWhereListProperty(ctrl, [
    ['organizationID', '=', orgID],
    ['dateFrom', '<=', onDate],
    ['dateTo', '>=', onDate]
  ])
}

function enableControls (me) {
  let orderState = me.record.get('orderDetID.orderID.orderState')
  let orderIsPosted = (orderState && orderState !== 'PROJECT')
  let itemCanEdit = !orderIsPosted
  me.setActionDisabled('fDelete', !itemCanEdit)
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
  let dictVacationKindID = me.attr.dictVacationKindID.getValue()
  me.isInnerChange = true
  $App.connection.run({
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
  let dictVacationKindID = me.attr.dictVacationKindID.getValue()
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

function validateForm () {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  let checkEmpNumDatesParams
  let checkVacPlanDaydiffParams
  let checkVacDChildPlanDayParams
  let checkVacationCrossPeriodParams
  let checkMainPartParams
  let checkImpartibleVacParams
  let checkVacYearDaysParams
  let checkVacationCrossTimeSheetParams
  let checkVacWithBountyParams

  if (me.enableValidators) {
    const employeePositionID = me.attr.employeePositionID.getValue()
    const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
    const empName = me.attr.employeePositionID.getRawValue()
    const dictVacationKindID = me.attr.dictVacationKindID.getValue()
    const dateFrom = me.attr.dateFrom.getValue()
    const isDateFromValid = AC.dateService.isValid(dateFrom)
    const dateTo = me.attr.dateTo.getValue()
    const isDateToValid = AC.dateService.isValid(dateTo)
    const dayCount = me.attr.dayCount.getValue()
    const orgID = me.record.get('organizationID')
    const orderID = me.record.get('orderID') || 0
    const year = me.record.get('year')
    const isNewVacation = me.attr.isNewVacation.getValue()
    const isBountyHelp = me.attr.isBountyHelp.getValue()

    if (isDateFromValid && isDateToValid && year) {
      const yearBegin = AC.dateService.getYearBegin(year)
      const yearEnd = AC.dateService.getYearEnd(year)
      if (yearBegin > dateTo || yearEnd < dateFrom) {
        errors.push({
          tag: errorTag,
          code: 'vacYearCheck',
          msg: UB.i18n('Період відпустки повинен відповідати вказаному року')
        })
        result = false
      }
    }

    if (isDateFromValid && isDateToValid && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n('"Дата закінчення відпустки" не може бути меншою за "Дату початку відпустки"')
      })
      result = false
    }

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

    /* Перевірка на перевищення доступних днів права на відпустку */
    if (employeeNumberID && isDateFromValid && isDateToValid) {
      checkVacPlanDaydiffParams = {
        entity: 'hr_vacationSchedule',
        method: 'checkDayCount',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          dayCount: dayCount,
          orgID: orgID,
          isNewVacation: isNewVacation
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    /* Перевірка на правильність доступних днів додаткової соц. відпустки з урахуванням ознаки "Тільки залишки нового періоду надання відпустки" */
    if (employeeNumberID && isDateFromValid && isDateToValid) {
      checkVacDChildPlanDayParams = {
        entity: 'hr_vacationSchedule',
        method: 'checkDChildDayCount',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          dayCount: dayCount,
          isNewVacation: isNewVacation
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    /* Перевірка на перетин з іншими відпустками працівника */
    if (employeePositionID && isDateFromValid && isDateToValid) {
      checkVacationCrossPeriodParams = {
        entity: 'hr_vacationSchedule',
        method: 'checkVacationCrossPeriod',
        execParams: {
          employeePositionID: employeePositionID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          orderID: orderID,
          ID: me.instanceID
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    /* UBHR-15814, 6. Якщо не встановлено "Тільки залишки нового періоду надання відпустки", то не виконувати такі перевірки */
    if (isNewVacation) {
      /* Перевірка на використання осн. частини 14 дн. */
      if (employeeNumberID && dictVacationKindID && orgID && isDateFromValid && isDateToValid && dayCount && orgID) {
        checkMainPartParams = {
          entity: 'hr_vacationSchedule',
          method: 'checkContiniousVacation',
          execParams: {
            employeeNumberID: employeeNumberID,
            dictVacationKindID: dictVacationKindID,
            dateFrom: dateFrom,
            dateTo: dateTo,
            dayCount: dayCount,
            organizationID: orgID
          },
          // monkey request prevention
          currTime: Date.now()
        }
      }

      /* Перевірка, щоб за рік, що відповідає даті початку відпустки, кількість днів відпустки не перевищувала 59 дн. */
      if (year && employeeNumberID && dictVacationKindID && isDateFromValid && isDateToValid && dayCount) {
        checkVacYearDaysParams = {
          entity: 'hr_vacationSchedule',
          method: 'checkYearDays',
          execParams: {
            year: year,
            employeeNumberID: employeeNumberID,
            dictVacationKindID: dictVacationKindID,
            dateFrom: dateFrom,
            dateTo: dateTo,
            dayCount: dayCount,
            empName: empName
          },
          // monkey request prevention
          currTime: Date.now()
        }
      }
    }

    /* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток" */
    if (employeeNumberID && dictVacationKindID && isDateFromValid && dayCount) {
      checkImpartibleVacParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkImpartibleVac',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dayCount: dayCount
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

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

    /* Перевірити, чи вже існує запланована відпустка з мат. допомогою */
    if (isBountyHelp && employeeNumberID && year) {
      checkVacWithBountyParams = {
        entity: 'hr_vacationSchedule',
        method: 'checkVacWithBounty',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          year: year,
          ID: me.instanceID
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
      result = false
    }
    if (checkVacPlanDaydiffParams) {
      return $App.connection.run(checkVacPlanDaydiffParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'vacPlanDaydiffCheck',
        msg: mParams.msg
      })
      result = false
    }
    if (checkVacDChildPlanDayParams) {
      return $App.connection.run(checkVacDChildPlanDayParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'vacDChildCheck',
        msg: mParams.msg
      })
      result = false
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
      result = false
    }
    if (checkMainPartParams) {
      return $App.connection.run(checkMainPartParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'mainPartCheck',
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
    if (checkVacYearDaysParams) {
      return $App.connection.run(checkVacYearDaysParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'vacYearDaysCheck',
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
    if (checkVacWithBountyParams) {
      return $App.connection.run(checkVacWithBountyParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'vacationWithBountyCheck',
        msg: mParams.msg
      })
    }
    return Promise.resolve(true)
  }).then(res => {
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, !me.isClosing, 'errorText')
    me.isClosing = false
    return result
  })
}

/* Всі перевірки, errorTag: 0 - всі перевірки, 1 - перевірки змін форми */
function validate (errorTag = 0) {
  const me = this
  me.clearErrors()
  me.isInternalRefresh = true
  me.errorsIsNotSaved = true
  return me.validateForm()
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
    me.errorsIsNotSaved = true
  }
}

function getOrderFact (me) {
  UB.Repository('hr_empOrderVacationDet')
    .attrs('orderID.description', 'orderID.orderState')
    .selectById(me.record.get('orderFactDetID'))
    .then(record => {
      if (record && ['POSTED', 'PROCESSED'].includes(record['orderID.orderState'])) {
        me.down('[name=orderFact]').setValue(record['orderID.description'])
      }
    })
}

function getOrderSchedule (me) {
  UB.Repository('hr_empOrderVacationapschedDet')
    .attrs('orderID.description', 'orderID.orderState')
    .selectById(me.record.get('orderDetID'))
    .then(record => {
      if (record && ['POSTED', 'PROCESSED'].includes(record['orderID.orderState'])) {
        me.down('[name=orderSchedule]').setValue(record['orderID.description'])
      }
    })
}
