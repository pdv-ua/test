/* global HR AC $App UB _ appAC */
exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  enableControls,
  onControlChanged,
  onBeforeSave,
  setVacationDays,
  setVacationDateTo,
  setHolidayInfo,
  validate,
  validateForm,
  validateVacListItem,
  validateVacMoveItem,
  clearErrors,
  loadVacationList,
  loadVacationMoveList,
  doLoadVacationList
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['empOrderVacationMoveDet', 'empOrderVacationListDet']
  }
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', onAfterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['acGrid'])

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

function onRecordLoaded (record, data) {
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
  me.setHolidayInfo()

  me.formData = {}
  me.formData.detail = data.detail ? JSON.parse(data.detail) : []

  if (_.get(me, 'formData.detail.empOrderVacationListDet.length')) {
    me.attr.empOrderVacationListDet.setLocalStoreData(me.formData.detail.empOrderVacationListDet)
  } else if (data.method !== 'addnew') {
    me.attr.empOrderVacationListDet.removeAll()
  }
  if (_.get(me, 'formData.detail.empOrderVacationMoveDet.length')) {
    me.attr.empOrderVacationMoveDet.setLocalStoreData(me.formData.detail.empOrderVacationMoveDet)
  } else if (data.method !== 'addnew') {
    me.attr.empOrderVacationMoveDet.removeAll()
  }
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
}

function onFormDataReady () {
  const me = this
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  me.enableControls()
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
  // const empOrderVacationListDet = me.down('[name=empOrderVacationListDet]')
  // AC.gridUtils.enableCustomAction(empOrderVacationListDet, 'cloneVacationList', enabled)
  me.orderForm.enableParaControls(me)
  if (!me.isNewInstance) {
    me.attr.dateFromProlong.setMinValue(AC.dateService.addDays(me.attr.dateTo.getValue(), 1))
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInnerChange) {
    return
  }
  switch (field.name) {
    case 'dateFrom':
      if (field.value && AC.dateService.isDateString(field.getRawValue()) && AC.dateService.isValid(value)) {
        me.doLoadVacationList(field, oldValue)
      }

      break
    case 'dateTo':
      if (field.value && AC.dateService.isDateString(field.getRawValue()) && AC.dateService.isValid(value)) {
        if (value) me.attr.dateFromProlong.setMinValue(AC.dateService.addDays(value, 1))
        me.doLoadVacationList(field, oldValue)
      }
      break
    case 'employeePositionID':
      if (!value || !me.attr.dateFrom.getValue() || !me.attr.dateTo.getValue()) {
        me.attr.empOrderVacationListDet.removeAll()
        me.attr.empOrderVacationMoveDet.removeAll()
      } else {
        me.loadVacationList(me.attr.dateFrom.getValue(), me.attr.dateTo.getValue())
      }
      break
    case 'dateFromProlong':
      if (field.value && AC.dateService.isDateString(field.getRawValue()) && AC.dateService.isValid(value)) {
        let store = me.attr.empOrderVacationMoveDet.getStore()
        if (AC.dateService.isValid(me.attr.dateFromProlong.getValue())) {
          if (store.getCount()) {
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Розрахунок днів перенесення відпустки буде змінено. Продовжити?'))
              .then(function (choice) {
                if (!choice) {
                  me.isInnerChange = true
                  try {
                    field.setValue(oldValue)
                  } finally {
                    me.isInnerChange = false
                  }
                } else {
                  me.loadVacationMoveList(true)
                }
              })
          } else {
            me.loadVacationMoveList(true)
          }
        } else {
          me.isInnerChange = true
          me.attr.empOrderVacationMoveDet.removeAll()
        }
      }
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

function onAfterSave (me, data) {
  if (!me.notRefreshAfterSave) {
    if (data) {
      me.formData = {}
      me.formData.detail = data.detail ? JSON.parse(data.detail) : []
      if (_.get(me, 'formData.detail.empOrderVacationListDet.length')) {
        me.attr.empOrderVacationListDet.setLocalStoreData(me.formData.detail.empOrderVacationListDet, false, true)
      }
      if (_.get(me, 'formData.detail.empOrderVacationMoveDet.length')) {
        me.attr.empOrderVacationMoveDet.setLocalStoreData(me.formData.detail.empOrderVacationMoveDet, false, true)
      }
    }
  }
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
  const holidayInfo2 = me.down('[name=holidayInfo2]')
  const dateFrom2 = me.attr.dateFromProlong.getValue()
  const dateTo2 = AC.dateService.addDays(dateFrom2, me.attr.dayCount.getValue())
  HR.timeService.setHolidayInfo(holidayInfo2, dateFrom2, dateTo2, appAC.globalOrganization())
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
    const dateFromProlong = me.attr.dateFromProlong.getValue()
    const isDateFromProlong = AC.dateService.isValid(dateFromProlong)
    // const orderID = me.record.get('orderID')
    if (isDateFrom && isDateTo && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n(`Дата 'Відкликати з' ({0}) менша за дату 'по' ({1})`, AC.dateService.formatDate(dateFrom), AC.dateService.formatDate(dateTo))
      })
      result = false
    }

    if (isDateFromProlong && isDateTo && dateFromProlong < dateTo) {
      errors.push({
        tag: errorTag,
        code: 'vacDateCheck',
        msg: UB.i18n(`Дата початку перенесення ({0}) менша за дату 'по' ({1})`, AC.dateService.formatDate(dateFromProlong), AC.dateService.formatDate(dateTo))
      })
      result = false
    }

    /* Перевірка на дні відкликання, для яких не знайдено відпустку */
    if (employeeNumberID && isDateFrom && isDateTo) {
      checkNoVacDaysParams = {
        entity: 'hr_empOrderVacretprolongDet',
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
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText', true)
      me.isClosing = false
      me.canClose = result
      return result
    })
}

async function validateVacListItem ({ errors = [], listDetID, recDateFrom, recDateTo, isBreackVacancy, vacName }) {
  const me = this
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const employeePositionID = me.attr.employeePositionID.getValue()
  const orgID = me.record.get('organizationID')
  const orderID = me.record.get('orderID')
  const isRecDateFrom = AC.dateService.isValid(recDateFrom)
  const isRecDateTo = AC.dateService.isValid(recDateTo)

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
      entity: 'hr_empOrderVacretprolongDet',
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

  if (checkVacationCrossPeriodParams) {
    const mParams = await $App.connection.run(checkVacationCrossPeriodParams)
    if (mParams && mParams.msg) {
      errors.push({
        tag: 2,
        code: 'vacationCrossPeriodCheck',
        msg: mParams.msg
      })
    }
  }
}

async function validateVacMoveItem ({ errors = [], recDateFrom, recDateTo, dictVacationKindID }) {
  const me = this
  const employeeNumberID = me.attr.employeePositionID.getFieldValue('employeeNumberID')
  const isRecDateFrom = AC.dateService.isValid(recDateFrom)
  const isRecDateTo = AC.dateService.isValid(recDateTo)

  /* Перевірка в табелі на перетин з недозволеними елементами */
  let checkVacationCrossTimeSheetParams
  if (employeeNumberID && dictVacationKindID && isRecDateFrom && isRecDateTo) {
    checkVacationCrossTimeSheetParams = {
      entity: 'hr_empOrderVacationMoveDet',
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

  if (checkVacationCrossTimeSheetParams) {
    const mParams = await $App.connection.run(checkVacationCrossTimeSheetParams)
    if (mParams && mParams.msg) {
      errors.push({
        tag: 2,
        code: 'vacationCrossTimeSheet',
        msg: mParams.msg
      })
    }
  }
}

async function validate () {
  const me = this
  me.clearErrors()
  me.isInternalRefresh = true
  me.errorsIsNotSaved = true
  const errors = []
  const validateFormResult = await me.validateForm()
  if (validateFormResult) {
    const detStore = me.attr.empOrderVacationListDet.getStore()
    const detMoveStore = me.attr.empOrderVacationMoveDet.getStore()
    if ((detStore.data && detStore.data.items.length) || (detMoveStore.data && detMoveStore.data.items.length)) {
      const dictVacationKind = await UB.Repository('hr_dictVacationKind')
        .attrs(['ID', 'name', 'isBreackVacancy'])
        .orderBy('ID')
        .selectAsObject()
      for (let i in detStore.data.items) {
        let record = detStore.data.items[i]
        const dictVacationKindID = record.get('dictVacationKindID')
        const recDateFrom = record.get('dateFrom')
        const recDateTo = record.get('dateTo')
        const listDetID = record.get('ID')
        let vacItem = dictVacationKind.find(item => item.ID === dictVacationKindID)
        let isBreackVacancy = vacItem ? vacItem.isBreackVacancy : false
        let vacName = (vacItem && vacItem.name) || '?'
        await me.validateVacListItem({ errors, listDetID, recDateFrom, recDateTo, isBreackVacancy, dictVacationKindID, vacName })
      }
      for (let i in detMoveStore.data.items) {
        const record = detMoveStore.data.items[i]
        const dictVacationKindID = record.get('dictVacationKindID')
        const recDateFrom = record.get('dateFrom')
        const recDateTo = record.get('dateTo')
        await me.validateVacMoveItem({ errors, recDateFrom, recDateTo, dictVacationKindID })
      }
    }
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, 2, true, 'errorText', true)
  }
}

function clearErrors (errorTag = 0) {
  const me = this
  const formErrors = errorTag === 0 ? [] : me.errors
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText', true)
    me.errorsIsNotSaved = true
  }
}

function doLoadVacationList (field, oldValue) {
  const me = this
  let dateFrom = me.getField('dateFrom')
  let dateTo = me.getField('dateTo')
  let store = me.attr.empOrderVacationListDet.getStore()
  if (AC.dateService.isValid(dateFrom.getValue()) && AC.dateService.isValid(dateTo.getValue())) {
    if (store.getCount()) {
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Розрахунок днів перенесення відпустки буде змінено. Продовжити?'))
        .then(function (choice) {
          if (!choice) {
            me.isInnerChange = true
            try {
              field.setValue(oldValue)
            } finally {
              me.isInnerChange = false
            }
          } else {
            // store.loadData([])
            me.setVacationDays()
            me.loadVacationList(me.attr.dateFrom.getValue(), me.attr.dateTo.getValue())
          }
        })
    } else {
      me.setVacationDays()
      me.loadVacationList(me.attr.dateFrom.getValue(), me.attr.dateTo.getValue())
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

function loadVacationList (dateFrom, dateTo) {
  const me = this
  $App.connection.run({
    entity: 'hr_empOrderVacationListDet',
    method: 'getActiveVacationList',
    paraID: me.instanceID,
    orderID: me.record.get('orderID'),
    dateFrom: dateFrom,
    dateTo: dateTo,
    dayCount: me.record.get('dayCount'),
    empOrderType: me.record.get('empOrderType'),
    employeePositionID: me.attr.employeePositionID.getValue(),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID')
  }).then(response => {
    const data = JSON.parse(response.data)
    me.attr.empOrderVacationListDet.removeAll()
    const store = me.attr.empOrderVacationListDet.getStore()
    let dayCount = 0
    data.forEach(item => {
      item.sourceParaID = item.ID
      delete item.ID
      item.paraID = me.instanceID
      item.orderID = me.record.get('orderID')
      dayCount += item.dayCount || 0
      store.add(item)
    })
    me.attr.dayCount.setValue(dayCount)
    if (me.attr.dateFromProlong.getValue()) {
      me.loadVacationMoveList()
    }
    me.validate()
  })
}

function loadVacationMoveList (isValidate = false) {
  const me = this
  const data = me.attr.empOrderVacationListDet.getData()
  const dateFromProlong = me.attr.dateFromProlong.getValue()
  const dateFrom = me.attr.dateFrom.getValue()
  if (!dateFromProlong || !AC.dateService.isValid(dateFromProlong)) return
  if (!dateFrom || !AC.dateService.isValid(dateFrom)) return
  const orgID = me.record.get('organizationID') || appAC.globalOrganization()
  $App.connection.run({
    entity: 'hr_empOrderVacationMoveDet',
    method: 'calcVacationMoveList',
    execParams: {
      dateFromProlong: AC.dateService.shiftDate(me.attr.dateFromProlong.getValue()),
      vacationList: JSON.stringify(data),
      orgID
    }
  }).then(mParams => {
    me.attr.empOrderVacationMoveDet.removeAll()
    const store = me.attr.empOrderVacationMoveDet.getStore()
    const moveList = JSON.parse(mParams.moveList)
    moveList.forEach(item => {
      delete item.ID
      store.add(item)
    })
    if (isValidate) {
      me.validate()
    }
  })
}

function beforeSave (me, params) {
  const formData = { detail: {} }
  if (me.orderConfig.detailGrids) {
    me.orderConfig.detailGrids.forEach((item) => {
      const grid = me.down(`[name=${item}]`)
      formData.detail[item] = grid.getAttributeData()
    })
    params.formData = JSON.stringify(formData)
  }
}
