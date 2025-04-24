/* global AC $App _ UB HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onAfterRender,
  manualSaving,
  onBeforeSave,
  onAfterSave,
  onAfterDelete,
  validate,
  onFormRefresh,
  setDefaultValues,
  onControlChanged,
  checkMainPart,
  getDayDiff
}

function initComponentStart () {
  const me = this
  me.on('initComponentDone', initComponentDone, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('afterDelete', onAfterDelete, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('manualsaving', manualSaving, me)
  me.on('refresh', onFormRefresh, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  me.errors = []
  me.isMainPartSetByCorr = false
}

function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance) {
    if (me.defaultValues) {
      me.setDefaultValues(me)
      calcDayCount(me, false)
    }
  } else {
    let isBackOrder = me.record.get('isBackOrder')
    if (isBackOrder) {
      const infoTextLabel = me.down('[name=infoText]')
      infoTextLabel.setText(UB.i18n('Право на відпустку використано у наказі, який фіксував у системі факт надання відпустки що відбувся раніше.'), false)
    }
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
  if (me.enableValidators === undefined) {
    me.enableValidators = AC.settings.get('hrEmpOrderVacationValidator')
  }
  AC.viewUtils.setWhereListProperty(me.attr.fromOrgID,
    [['state', '=', 'ACTIVE'], ['liquidate', '=', 0]], undefined, [])
  if (!(me.attr.dateFrom.getValue() < me.record.get('empVacationPlanID.employeeNumberID.dateFrom'))) {
    me.attr.fromOrgID.setDisabled(true)
  } else {
    me.attr.fromOrgID.setDisabled(false)
  }

  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
  })
  HR.orderManager.showIf(me)
  const fixMonth = AC.settings.get('hrVacFixMonth', appAC.globalOrganization()) || 0
  if (fixMonth > 0) {
    me.attr.dayFix.setVisible(true)
  }
}

function setDefaultValues (me) {
  if (me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
}

function onAfterRender () {
  const me = this
  HR.controlService.checkErrorsOnClose(me)
  $App.connection.run({
    entity: 'hr_empVacationPeriod',
    method: 'canEditVacFact'
  }).then(mParams => {
    const dayCountFactCorr = me.attr.dayCountFactCorr
    dayCountFactCorr.setReadOnly(!mParams.result)
  })
}

function manualSaving (me, action) {
  if (action && action.length) {
    action = action[0]
  }
  me.isSaveAndClosing = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose)
}

function onBeforeSave () {
  const me = this
  if (!me.isClosing) {
    return me.validate()
  } else {
    return true
  }
}

function onAfterSave () {
  const me = this
  const gridSender = AC.gridUtils.isUbGrid(me.sender) ? me.sender : (me.sender && me.sender.ownerCt)
  if (gridSender) {
    gridSender.fireEvent('refresh')
  }
  // AC.gridUtils.refreshSenderUBGrid(me)
  refreshParentGrid(me)
  me.errorsIsNotSaved = true
  me.isSaveAndClosing = false
}

function onAfterDelete () {
  refreshParentGrid(this)
}

function validate () {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  const dateFrom = AC.dateService.unshiftDate(me.attr.dateFrom.getValue())
  const isDateFromValid = AC.dateService.isValid(me.attr.dateFrom.getValue())
  const dateTo = AC.dateService.unshiftDate(me.attr.dateTo.getValue())
  const isDateToValid = AC.dateService.isValid(me.attr.dateTo.getValue())
  const dayCountPlan = me.attr.dayCountPlan.getValue()
  const dayCountFactCorr = me.attr.dayCountFactCorr.getValue()
  const senderGrid = AC.gridUtils.getSenderGrid(me)
  const senderForm = senderGrid && senderGrid.up('form')
  const employeeNumberID = senderForm && senderForm.attr.employeeNumberID.getValue()
  const planDateFrom = senderForm && AC.dateService.unshiftDate(senderForm.attr.dateFrom.getValue())
  const isPlanDateFromValid = planDateFrom && AC.dateService.isValid(planDateFrom)
  const planDateTo = senderForm && senderForm.attr.dateToEmpty.getValue() && AC.dateService.unshiftDate(senderForm.attr.dateToEmpty.getValue())
  const isPlanDateToValid = planDateTo && AC.dateService.isValid(planDateTo)
  const dictVacationKindID = senderForm && senderForm.attr.dictVacationKindID.getValue()
  const dictVacationKindCode = senderForm && senderForm.attr.dictVacationKindID.getFieldValue('code')
  const orgID = senderForm && senderForm.attr.employeeNumberID.getFieldValue('orgID')
  const fromOrgID = me.attr.fromOrgID.getValue()
  const tabNumDateFrom = me.record.get('empVacationPlanID.employeeNumberID.dateFrom')
  let dateToMaxValue = AC.dateService.unshiftDate(AC.dateService.addDays((AC.dateService.addYears(dateFrom, 1)), -1))

  let checkStateVac
  let checkImpartibleVacParams

  if (me.attr.dayFix.getValue() && me.attr.dayFix.getValue() > dayCountPlan) {
    errors.push({
      tag: errorTag,
      code: 'dateFromToCheck',
      msg: UB.i18n('Зафіксовано днів повинно бути не більше ніж доступно днів')
    })
    result = false
  }

  if (me.enableValidators) {
    if (isDateToValid && isDateFromValid && dateTo > dateToMaxValue) {
      errors.push({
        tag: errorTag,
        code: 'dateFromToCheck',
        msg: UB.i18n('Дата закінчення періоду відрізняється від дати початку періоду більше ніж на рік')
      })
      result = false
    }

    if (isDateFromValid && isDateToValid && dateFrom > dateTo) {
      errors.push({
        tag: errorTag,
        code: 'datesCheck',
        msg: UB.i18n('Дата початку періоду більша за дату закінчення періоду')
      })
      result = false
    }

    if (isDateFromValid && isPlanDateFromValid && dateFrom < planDateFrom) {
      errors.push({
        tag: errorTag,
        code: 'dateFromCheck',
        msg: UB.i18n('Дата початку періоду менша за дату початку дії виду відпустки')
      })
      result = false
    }

    if (isDateToValid && isPlanDateToValid && dateTo > planDateTo) {
      errors.push({
        tag: errorTag,
        code: 'dateToCheck',
        msg: UB.i18n('Дата закінчення періоду більша за дату закінчення дії виду відпустки')
      })
      result = false
    }

    if (fromOrgID && isDateToValid && tabNumDateFrom && dateTo > tabNumDateFrom) {
      errors.push({
        tag: errorTag,
        code: 'orgFromDateCheck',
        msg: UB.i18n('Дата закінчення періоду більша за дату початку дії табельного номеру')
      })
      result = false
    }

    if (dictVacationKindCode === 'dState') {
      if (!dayCountPlan) {
        errors.push({
          tag: errorTag,
          code: 'stateExpCheck',
          msg: UB.i18n('Стаж державної служби не внесено або стаж недостатній для виникнення права на відпустку за стаж державної служби')
        })
      }
    }

    const periods = me.sender && me.sender.getStore()
    periods && _.forEach(periods.data.items, (item) => {
      if (item.get('ID') !== me.instanceID) {
        if ((AC.dateService.unshiftDate(item.get('dateFrom') <= dateTo)) &&
          (AC.dateService.unshiftDate(item.get('dateTo')) >= dateFrom)) {
          errors.push({
            tag: errorTag,
            code: 'crossPeriodCheck',
            msg: UB.i18n('Існує період з діапазоном дат, який перетинається з внесеним')
          })
          result = false
        }
      }
    })

    /* Для відпустки "Додаткова оплачувана відпустка за стаж державної служби" - перевірка, чи є працівник держслужбовцем */
    checkStateVac = HR.timeService.checkStateVac(employeeNumberID, dictVacationKindCode, dateFrom, undefined, orgID)

    /* Перевірка тривалості відпустки по довіднику "Тривалість неподільних частин відпусток" */
    if (employeeNumberID && dictVacationKindID && isDateFromValid && dayCountPlan) {
      checkImpartibleVacParams = {
        entity: 'hr_empOrderVacationListDet',
        method: 'checkImpartibleVac',
        execParams: {
          employeeNumberID: employeeNumberID,
          dictVacationKindID: dictVacationKindID,
          dateFrom: dateFrom,
          dayCount: dayCountPlan,
          dayCountFactCorr: dayCountFactCorr
        },
        // monkey request prevention
        currTime: Date.now()
      }
    }

    if (dictVacationKindCode === 'dChild') {
      const predefinedPeriodDays = HR.timeService.getConstants().predefinedPeriodDays.dChild
      let isFactCorrError = false
      if (dayCountFactCorr && !predefinedPeriodDays.includes(dayCountFactCorr)) {
        errors.push({
          tag: errorTag,
          code: 'dChildFactCorrCheck',
          msg: UB.i18n(`Для додаткової соціальної відпустки працівникам, які мають дітей<br/>тривалість днів не відповідає значенням ({0})`, predefinedPeriodDays.join(', '))
        })
        isFactCorrError = true
      }
      if (!isFactCorrError) {
        const dayDiff = getDayDiff(me)
        let predefDayDiff = [0, ...predefinedPeriodDays]
        if (!predefDayDiff.includes(dayDiff)) {
          errors.push({
            tag: errorTag,
            code: 'dChildDayDiffCheck',
            msg: UB.i18n(`Для додаткової соціальної відпустки працівникам, які мають дітей<br/>залишилося днів не відповідає значенням ({0})`, predefDayDiff.join(', '))
          })
        }
      }
    }
  }

  return Promise.resolve(true).then(res => {
    if (checkStateVac) {
      return checkStateVac
    } else {
      return Promise.resolve({})
    }
  }).then(stateData => {
    if (!stateData) {
      errors.push({
        tag: errorTag,
        code: 'stateVacCheck',
        msg: UB.i18n(`Станом на дату ${AC.dateService.formatDate(dateFrom)} працівник не є держслужбовцем`)
      })
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
    /* UBHR-8664 - не виводити повідомлення при збереженні */
    let toShowMsg = me.isSaveAndClosing && !me.isClosing
    me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, toShowMsg, 'errorText')
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

function refreshParentGrid (me) {
  let gridSender = me.sender
  if (gridSender) {
    let formSender = gridSender.up('form')
    let gridParent = formSender.gridSender
    if (gridParent) {
      gridParent.loadData()
    }
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'dateFrom':
    case 'dateTo':
      calcDayCount(me, true)
      if (!(me.getField('dateFrom').getValue() < me.record.get('empVacationPlanID.employeeNumberID.dateFrom'))) {
        me.getField('fromOrgID').setValue()
        me.getField('fromOrgID').setDisabled(true)
      } else {
        me.getField('fromOrgID').setDisabled(false)
      }
      break
    case 'dayCountPlan':
      checkMainPart({ me, dayCountPlan: value })
      break
    case 'dayCountFactCorr':
      checkMainPart({ me, dayCountFactCorr: value })
      break
  }
}

function calcDayCount (me, fromControls) {
  let dateFrom = fromControls ? me.attr.dateFrom.getValue() : me.record.get('dateFrom')
  let dateTo = fromControls ? me.attr.dateTo.getValue() : me.record.get('dateTo')
  if (dateFrom && dateTo && AC.dateService.isValid(dateFrom) && AC.dateService.isValid(dateTo)) {
    const senderGrid = AC.gridUtils.getSenderGrid(me)
    const senderForm = senderGrid && senderGrid.up('form')
    if (senderForm) {
      const senderReco = senderForm.record
      const checkLongTerm = senderReco.get('dictVacationKindID.code') === 'dState'
      HR.timeService.getVacPeriodDays(senderReco.get('employeeID'), senderReco.get('employeeNumberID'),
        senderReco.get('dictVacationKindID'), dateFrom, dateTo, senderReco.get('dateToEmpty'), senderReco.get('dayCount'), checkLongTerm)
        .then(mParams => {
          mParams.result !== undefined && me.record.set('dayCountPlan', mParams.result)
          if (checkLongTerm && mParams.newDateFrom) {
            me.record.set('dateFrom', AC.dateService.shiftDate(mParams.newDateFrom))
          }
          if (checkLongTerm && mParams.newDateTo) {
            me.record.set('dateTo', AC.dateService.shiftDate(mParams.newDateTo))
          }
          checkMainPart({ me })
        })
    }
  }
}

function checkMainPart ({ me, dayCountPlan, dayCountFactCorr }) {
  if (!dayCountPlan) {
    dayCountPlan = me.record.get('dayCountPlan')
  }
  if (dayCountPlan) {
    let senderGrid = AC.gridUtils.getSenderGrid(me)
    let senderForm = senderGrid && senderGrid.up('form')
    if (senderForm) {
      let vacKindCode = senderForm.record.get('dictVacationKindID.code')
      const yearVacMainPart = HR.timeService.getConstants().yearVacMainPart
      if (vacKindCode.startsWith('dYear')) {
        if (dayCountPlan < yearVacMainPart) {
          me.record.set('isMainPart', true)
        } else if (dayCountFactCorr) {
          const dayDiff = getDayDiff(me)
          if (dayDiff < yearVacMainPart) {
            me.record.set('isMainPart', true)
            me.isMainPartSetByCorr = true
          } else if (me.isMainPartSetByCorr) {
            me.record.set('isMainPart', false)
          }
        }
      }
    }
  }
}

function getDayDiff (me) {
  let dayCountPlan = me.attr.dayCountPlan.getValue() || 0
  let dayFact = me.record.get('dayFact') || 0
  let dayCountFactCorr = me.attr.dayCountFactCorr.getValue() || 0
  let dayComp = me.record.get('dayComp') || 0
  return dayCountPlan - (dayFact + dayCountFactCorr + dayComp)
}
