/* global Ext _ AC $App UB appAC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onAfterRender,
  onBeforeSave,
  onAfterSave,
  onAfterDelete,
  validate,
  onFormRefresh,
  setDefaultValues,
  setDefaultDayCount,
  setDefaultDateFrom
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('afterDelete', onAfterDelete, me)
  me.on('refresh', onFormRefresh, me)
  let formShell = Ext.create('AC.formShell')
  formShell.init(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  let employeeNumberIDCtrl = me.attr.employeeNumberID
  let enStore = employeeNumberIDCtrl.store
  enStore.on('load', () => {
    let employeeID = me.record.get('employeeID')
    let employeeNumberID = me.record.get('employeeNumberID')
    if (me.isNewInstance) {
      if (!employeeNumberID) {
        let items = enStore.data.items
        employeeNumberID = items.length > 0 ? items[items.length - 1].get('ID') : 0
        if (employeeNumberID > 0) {
          me.isInnerControlChange = true
          try {
            employeeNumberIDCtrl.setValue(employeeNumberID)
          } finally {
            me.isInnerControlChange = false
          }
          filterOrderID(me, employeeNumberID, false)
          setEmpPosData(me, employeeNumberIDCtrl, employeeNumberID)
          me.attr.dictVacationKindID.focus()
        }
      }
    } else {
      filterOrderID(me, employeeNumberID, true)
    }
    filterEmployeeBenefits(me, employeeID)
  })
  me.errors = []
  const tb = me.down('toolbar')
  if (tb) {
    const idx = tb.items.items.findIndex(o => o.menuId === 'AllActions')
    tb.insert(idx > 0 ? idx - 1 : 4,
      Ext.create('Ext.form.Label', {
        ubID: 'pausedText',
        xtype: 'label',
        cls: 'grd-color-red',
        text: ''
      })
    )
  }
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
      if (me.defaultValues.employeeNumberID) {
        me.getField('employeeNumberID').setReadOnly(true)
      }
      const employeeNumberID = me.record.get('employeeNumberID') || 0
      filterOrderID(me, employeeNumberID, false)
      setEmpPosData(me, me.attr.employeeNumberID, employeeNumberID)
      filterEmployeeBenefits(me, me.record.get('employeeID'))
    }
  } else {
    let rawErrorText = me.record.get('errorText')
    if (me.isRefreshing) {
      me.isRefreshing = false
      let meErrorText = (me.errors.length && JSON.stringify(me.errors)) || ''
      if ((rawErrorText || '') !== meErrorText) {
        me.record.set('errorText', meErrorText)
      }
    } else {
      if (rawErrorText) {
        me.errors = JSON.parse(rawErrorText)
        let errorText = HR.controlService.getFormErrorsText(me.errors)
        const errorLabel = me.down('[name=errorText]')
        errorLabel.setText(errorText, false)
      }
    }
  }

  if (me.gridSender) {
    const senderParams = me.gridSender.customParams
    if (senderParams) {
      const employeeNumberID = senderParams.employeeNumberID
      const employeeID = senderParams.employeeID
      if (me.isNewInstance) {
        me.record.set('employeeID', employeeID)
      }
      const empFilter = employeeNumberID ? ['ID', '=', employeeNumberID] : ['employeeID', '=', employeeID]
      AC.viewUtils.setWhereListProperty(me.attr.employeeNumberID, [empFilter, ['orgID', '=', appAC.globalOrganization()]],
        undefined, ['clearStore'])
    }
  }
  if (me.isNewInstance) {
    setDefaultValues(me)
  }

  const gridPeriod = me.down('[name=gridPeriod]')
  gridPeriod.getStore().ubRequest.empVacationPlanID = me.instanceID || 0

  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
}

function onFormDataReady () {
  const me = this
  const gridPeriod = me.down('[name=gridPeriod]')
  gridPeriod.setDisabled(!me.isEditMode)
  HR.orderManager.disableContextMenuItems(me.getField('orderDetID'), [ 'editItem', 'addItem' ])
  HR.orderManager.disableContextMenuItems(me.getField('pauseOrderDetID'), [ 'editItem', 'addItem' ])
  const grid = AC.gridUtils.getSenderGrid(me)
  if ((grid && grid.readOnly) || !$App.domainInfo.isEntityMethodsAccessible('hr_empVacationPeriod', 'addnew')) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('[name=gridPeriod]').setReadOnly(true)
    me.down('[name=gridPeriod]').setDisabled(true)
  }
  me.shell.readOnlyIf()
  if (!me.isNewInstance) {
    const label = me.down('[ubID=pausedText]')
    label && label.setText(me.record.get('isPause') ? UB.i18n('Тимчасово припинено (див. стор. Підстави)') : '')
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.isInnerControlChange) {
    return
  }
  switch (field.name) {
    case 'employeeNumberID':
      filterOrderID(me, value, false)
      setEmpPosData(me, field, value)
      setDefaultDayCount(me)
      if (value) {
        me.attr.orderDetID.setValue()
        me.attr.dateFrom.setValue()
        me.attr.dateToEmpty.setValue()
      }
      break
    case 'orderDetID':
      if (value) {
        const vacKindReco = AC.gridUtils.getCurrentRecord(me.attr.dictVacationKindID)
        const isStateVac = vacKindReco && vacKindReco.get('code') === 'dState'
        const record = field.getStore().getById(value)
        if (record) {
          !isStateVac && me.attr.dateFrom.setValue(record.get('dateFrom'))
          me.attr.dateToEmpty.setValue(AC.dateService.getDateEmpty(record.get('dateTo')))
        }
        me.attr.employeeBenefitsID.setValue()
        me.attr.otherReasons.setValue()
      }
      break
    case 'dictVacationKindID':
      checkVacationKindData(value, me.record.get('employeeID')).then(
        result => {
          if (result) {
            setDefaultDateFrom(me)
          } else {
            me.attr.dictVacationKindID.setValue()
          }
        })
      break
    case 'dateFrom':
      setDefaultDayCount(me)
      break
    case 'employeeBenefitsID':
      if (value) {
        let employeeBenefitsRec = AC.gridUtils.getCurrentRecord(me.attr.employeeBenefitsID)
        me.attr.dateFrom.setValue(employeeBenefitsRec.get('dateFrom'))
        me.isInnerControlChange = true
        try {
          me.attr.dateToEmpty.setValue(employeeBenefitsRec.get('dateTo'))
          me.attr.orderDetID.setValue()
          me.attr.otherReasons.setValue()
        } finally {
          me.isInnerControlChange = false
        }
      }
      me.shell.readOnlyIf()
      break
    case 'otherReasons':
      if (value) {
        me.attr.orderDetID.setValue()
        me.attr.employeeBenefitsID.setValue()
      }
      break
  }
}

function filterOrderID (me, employeeNumberID, toReload) {
  let empID = 0
  let orgID = 0
  if (employeeNumberID) {
    const empNumRec = AC.gridUtils.getCurrentRecord(me.attr.employeeNumberID)
    if (empNumRec) {
      empID = empNumRec.get('employeeID')
      orgID = empNumRec.get('orgID')
    } else if (me.defaultValues) {
      empID = me.defaultValues.employeeID
    } else {
      /* employeeNumberID record is not loaded yet */
      return
    }
  }
  let options
  if (toReload) {
    let fltEmpID = AC.viewUtils.getFilterValue(me.attr.orderDetID, 'employeeID')
    /* To prevent multiple load of the same empID */
    if (fltEmpID !== empID) {
      options = ['clearStore']
    }
  }
  let filters = empID ? [
    ['employeeID', '=', empID]
  ] : []
  if (employeeNumberID) {
    filters.push(['employeeNumberID', '=', employeeNumberID])
  } else if (orgID) {
    filters.push(['organizationID', '=', orgID])
  }
  AC.viewUtils.setWhereListProperty(me.attr.orderDetID, filters, undefined, options)
  AC.viewUtils.setWhereListProperty(me.attr.pauseOrderDetID, filters, undefined, options)
}

function filterEmployeeBenefits (me, employeeID) {
  const onDate = appAC.globalApplicationDate()
  let filter = [
    ['employeeID', '=', employeeID],
    ['dateFrom', '<=', onDate],
    ['dateTo', '>=', onDate]
  ]
  AC.viewUtils.setWhereListProperty(me.attr.employeeBenefitsID, filter, undefined, ['clearStore'])
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
}

function onBeforeSave () {
  const me = this
  if (!me.isClosing) {
    return me.validate()
  } else {
    return Promise.resolve(true)
  }
}

function onAfterSave () {
  const me = this
  let gridPeriod = me.down('[name=gridPeriod]')
  gridPeriod.onRefresh()
  AC.gridUtils.refreshSenderGrid(me)
  me.errorsIsNotSaved = true
}

function onAfterDelete () {
  AC.gridUtils.refreshSenderGrid(this)
}

function validate () {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  const ID = me.instanceID
  const employeeNumberID = me.attr.employeeNumberID.getValue()
  const dictVacationKindID = me.attr.dictVacationKindID.getValue()
  const dateFrom = me.attr.dateFrom.getValue()
  const isDateFromValid = AC.dateService.isValid(dateFrom)
  const dateTo = me.attr.dateToEmpty.getValue()
  const isDateToValid = AC.dateService.isValid(dateTo)
  const dayCount = me.attr.dayCount.getValue() || 0

  let checkVacKindExistsParams
  let checkImpartibleVacParams

  if (me.enableValidators) {
    if (isDateFromValid && isDateToValid && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'datesCheck',
        msg: UB.i18n('Дата початку дії більша за дату закінчення дії')
      })
      result = false
    }

    /* Перевірка, щоб не існувало вказаного виду відпустки */
    if (employeeNumberID && dictVacationKindID && isDateFromValid) {
      checkVacKindExistsParams = {
        entity: 'hr_empVacationPlan',
        method: 'checkVacKindExists',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          ID: ID
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    /* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток" */
    if (employeeNumberID && dictVacationKindID && isDateFromValid) {
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
  }

  return Promise.resolve(true).then(res => {
    if (checkVacKindExistsParams) {
      return $App.connection.run(checkVacKindExistsParams)
    } else {
      return Promise.resolve({})
    }
  }).then(mParams => {
    if (mParams && mParams.msg) {
      errors.push({
        tag: errorTag,
        code: 'vacKindExistsCheck',
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
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, !me.isClosing && me.isDirty(), 'errorText')
    me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
    if (result) {
      me.errorsIsNotSaved = false
    }
    me.isClosing = false
    me.canClose = result
    return result
  })
}

function onFormRefresh () {
  const me = this
  me.isRefreshing = true
  me.validate()
}

function setDefaultValues (me) {
  if (me.formData) {
    me.formData.employeeNumberID && me.record.set('employeeNumberID', me.formData.employeeNumberID)
    me.formData.dictVacationKindID && me.record.set('dictVacationKindID', me.formData.dictVacationKindID)
    me.formData.orderDetID && me.record.set('orderDetID', me.formData.orderDetID)
    me.formData.dayCount && me.record.set('dayCount', me.formData.dayCount)
    me.formData.dateFrom && me.record.set('dateFrom', me.formData.dateFrom)
    me.formData.dateToEmpty && me.record.set('dateToEmpty', me.formData.dateToEmpty)
  }
}

function setEmpPosData (me, ctrl, value) {
  if (value) {
    let empNumRec = AC.gridUtils.getCurrentRecord(ctrl)
    if (empNumRec) {
      const posOrderID = empNumRec.get('posOrderID')
      const orderStore = me.attr.orderDetID.getStore()
      orderStore.load({
        callback: (records, operation, success) => {
          if (success) {
            let rec = records.find(rec => rec.data.orderID === posOrderID)
            if (rec) {
              me.record.set('orderDetID', rec.data.ID)
              me.record.set('dateFrom', rec.data.dateFrom)
              me.record.set('dateToEmpty', rec.data.dateToEmpty)
            }
          }
        }
      })
    }
  }
}

function setDefaultDayCount (me) {
  const dictVacationKindIDCtrl = me.attr.dictVacationKindID
  const dictVacationKindID = dictVacationKindIDCtrl.getValue()
  const employeeNumberIDCtrl = me.attr.employeeNumberID
  const employeeNumberID = employeeNumberIDCtrl.getValue()
  const employeeNumberReco = AC.gridUtils.getCurrentRecord(employeeNumberIDCtrl)
  if (dictVacationKindID && employeeNumberID && employeeNumberReco) {
    let dayCount
    const planDateFromCtrl = me.attr.dateFrom
    const planDateToCtrl = me.attr.dateToEmpty
    const orgID = appAC.globalOrganization()
    const onDate = appAC.globalApplicationDate()
    if (AC.dateService.isDateString(planDateFromCtrl.getRawValue())) {
      $App.connection.run({
        entity: 'hr_empVacationPlan',
        method: 'getVacPlanDays',
        employeeID: employeeNumberReco.get('employeeID'),
        employeeNumberID: employeeNumberID,
        dictVacationKindID: dictVacationKindID,
        periodDateFrom: planDateFromCtrl.getValue(),
        periodDateTo: undefined,
        planDateTo: planDateToCtrl.getValue()
      }).then(mParams => {
        if (mParams.result !== false) {
          dayCount = mParams.result
          return Promise.resolve(false)
        } else {
          return HR.treeUtils.getEmpPosInfo(undefined, employeeNumberID, orgID, onDate, ['positionID.positionType',
            'positionID.dictStaffCatID', 'positionID.dictStaffSubCatID', 'organizationID.dictGovernmTypeID'])
        }
      }).then(empPosInfo => {
        if (empPosInfo) {
          return $App.connection.run({
            entity: 'hr_dictVacationPlanDay',
            method: 'getDayCount',
            dictVacationKindID: dictVacationKindID,
            positionType: empPosInfo['positionID.positionType'],
            dictGovernmTypeID: empPosInfo['organizationID.dictGovernmTypeID'],
            dictStaffCatID: empPosInfo['positionID.dictStaffCatID'],
            dictStaffSubCatID: empPosInfo['positionID.dictStaffSubCatID'],
            onDate: onDate
          })
        } else {
          return Promise.resolve(false)
        }
      }).then(mParams => {
        if (mParams && mParams.dayCount) {
          dayCount = mParams.dayCount
        }
        me.attr.dayCount.setValue(dayCount)
      })
    }
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}

async function checkVacationKindData (value, userID) {
  let result = true
  if (AC.settings.get('hrCheckAdditionalVacationDays', appAC.globalOrganization())) {
    const vacationReason = await UB.Repository('hr_dictVacationKind')
      .attrs(['reason'])
      .selectById(value)

    if (vacationReason) {
      // HR_RIGHT_VACATION
      switch (vacationReason.reason) {
        case '1':
          const employeeBenefitsResult = await UB.Repository('hr_employeeBenefits')
            .attrs(['ID'])
            .where('employeeID', '=', userID)
            .where('dictBenefitsKindID.dictVacationKindID', '=', value)
            .where('mi_deleteDate', '>=', '9999-12-31')
            .selectSingle()
          if (!employeeBenefitsResult) {
            $App.dialogInfo(UB.i18n('Для працівника не внесена інформація про пільгу, на підставі якої надається такий вид відпустки. Рекомендовано внести відповідну інформацію про пільгу або вибрати інший вид відпустки'))
            result = false
          } else {
            result = true
          }
          break
        case '2':
          const employeeDisabilityResult = await UB.Repository('hr_employeeDisability')
            .attrs(['ID'])
            .where('employeeID', '=', userID)
            .where('disabilityID.dictVacationKindID', '=', value)
            .selectSingle()
          if (!employeeDisabilityResult) {
            $App.dialogInfo(UB.i18n('Для працівника не внесена інформація про інвалідність, на підставі якої надається такий вид відпустки. Рекомендовано внести відповідну інформацію про пільгу або вибрати інший вид відпустки'))
            result = false
          } else {
            result = true
          }
          break
        case '3':
          const employeeDocsResult = await UB.Repository('hr_employeeDocs')
            .attrs(['ID'])
            .where('employeeID', '=', userID)
            .where('dictDocKindID.vacationKindID', '=', value)
            .where('mi_deleteDate', '>=', '9999-12-31')
            .selectSingle()
          if (!employeeDocsResult) {
            $App.dialogInfo(UB.i18n('Для працівника не внесена інформація про документ, на підставі якої надається такий вид відпустки. Рекомендовано внести відповідну інформацію про пільгу або вибрати інший вид відпустки'))
            result = false
          } else {
            result = true
          }
          break
        default:
          result = true
      }
    }
  }
  return result
}

function setDefaultDateFrom (me) {
  const employeeNumberIDCtrl = me.attr.employeeNumberID
  const employeeNumberID = employeeNumberIDCtrl.getValue()
  const employeeNumberReco = AC.gridUtils.getCurrentRecord(employeeNumberIDCtrl)
  const vacKindReco = AC.gridUtils.getCurrentRecord(me.attr.dictVacationKindID)
  const vacKindCode = vacKindReco && vacKindReco.get('code')
  if (vacKindCode === 'dState') {
    const dictVacationKindID = me.attr.dictVacationKindID.getValue()
    $App.connection.run({
      entity: 'hr_empVacationPlan',
      method: 'getVacPlanDateFrom',
      employeeNumberID: employeeNumberID,
      employeeID: employeeNumberReco.get('employeeID'),
      dictVacationKindID: dictVacationKindID
    }).then(mParams => {
      let dateFrom = mParams.result
      if (dateFrom) {
        dateFrom = AC.dateService.unshiftDate(dateFrom)
        me.isInnerControlChange = true
        try {
          me.attr.dateFrom.setValue(dateFrom)
          setDefaultDayCount(me)
        } finally {
          me.isInnerControlChange = false
        }
      }
    })
  } else {
    setDefaultDayCount(me)
  }
}
