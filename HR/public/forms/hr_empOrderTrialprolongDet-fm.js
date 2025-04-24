/* global UB $App AC HR appAC */
/* jshint maxerr: 10000 */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  enableControls,
  addBaseActions,
  setTitleByOrderType,
  onBeforeSave,
  onAfterSave,
  onAfterRender,
  setupControls,
  getWorkbookRecord,
  setDayCount,
  setDateFromInfo
}

function setupControls () {
  // const me = this
}

async function setDayCount (changedCtrlName) {
  const me = this
  const dateFromCtrl = me.getField('dateFrom')
  const dateToCtrl = me.getField('dateTo')
  const isDateToChanged = changedCtrlName === 'dateTo'
  let dateFrom = dateFromCtrl.getValue()
  let dateTo = dateToCtrl.getValue()
  if (dateFrom && AC.dateService.isValid(dateFrom)) {
    dateToCtrl.setMinValue(AC.dateService.addDays(dateFrom, 1))
  }
  if (dateFrom && AC.dateService.isValid(dateFrom) && dateTo && AC.dateService.isValid(dateTo)) {
    dateFrom = AC.dateService.shiftDate(dateFrom)
    dateTo = AC.dateService.shiftDate(dateTo)
    let newDateTo
    const holidays = await HR.orderManager.getHolidays(dateFrom, AC.dateService.addYears(dateFrom, 1), appAC.globalOrganization())
    const calendarChanges = await HR.orderManager.getCalendarChanges(dateFrom, AC.dateService.addYears(dateFrom, 1), appAC.globalOrganization())
    let holiday = holidays.find(o => AC.dateService.shiftDate(o).getTime() === dateTo.getTime())
    let exchange = calendarChanges.find(o => AC.dateService.shiftDate(o.changeDateTo).getTime() === dateTo.getTime())

    if (!isDateToChanged && (!HR.orderManager.isWorkingDay(dateTo) || holiday || exchange)) {
      AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Вказаний день є вихідним або святковим. Термін буде подовжено до першого наступного робочого дня'))
      do {
        while (!HR.orderManager.isWorkingDay(dateTo)) {
          dateTo = AC.dateService.addDays(dateTo, 1)
          newDateTo = dateTo
        }
        // check holidays
        while (holidays.find(o => AC.dateService.shiftDate(o).getTime() === dateTo.getTime())) {
          dateTo = AC.dateService.addDays(dateTo, 1)
          newDateTo = dateTo
        }
        // check exchanges
        while (calendarChanges.find(o => AC.dateService.shiftDate(o.changeDateTo).getTime() === dateTo.getTime())) {
          dateTo = AC.dateService.addDays(dateTo, 1)
          newDateTo = dateTo
        }
        holiday = holidays.find(o => AC.dateService.shiftDate(o).getTime() === dateTo.getTime())
        exchange = calendarChanges.find(o => AC.dateService.shiftDate(o.changeDateTo).getTime() === dateTo.getTime())
      } while (!HR.orderManager.isWorkingDay(dateTo) || holiday || exchange)
    }
    $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getWorkDays',
      dateFrom: AC.dateService.addDays(dateFrom, 1), // сама дата закінчення не враховується
      dateTo: dateTo,
      orgID: appAC.globalOrganization()
    }).then(mParams => {
      me.record.set('dayCount', mParams.daysCount || 0)
    })
    if (newDateTo && !isDateToChanged) {
      me.isInternalChange = true
      try {
        dateToCtrl.setValue(dateTo)
      } finally {
        me.isInternalChange = false
      }
    }
  } else {
    me.record.set('dayCount', 0)
  }
}

function getWorkbookRecord () {
  const me = this
  const empPosCtrl = me.getField('employeePositionID')
  let employeePositionID = empPosCtrl.getValue()
  if (employeePositionID) {
    const selRow = empPosCtrl.getStore().data.items.find(o => o.data.ID === employeePositionID)
    return UB.Repository('hr_employeeWorkbook')
      .attrs(['ID', 'dateTrialEnd', 'appointOrder', 'employeePositionID'])
      .where('employeeID', '=', selRow.data.employeeID)
      .where('employeePositionID.positionID', '=', selRow.data.positionID)
      .where('dateTrialEnd', 'isNotNull')
      .orderByDesc('dateTo')
      .selectSingle()
      .then(data => {
        return data || null
      })
  }
  return Promise.resolve(null)
}

function onBeforeSave () {
  this.record.set('positionID', this.getField('employeePositionID').getFieldValue('positionID'))
  return Promise.resolve(true)
}

function initComponentStart () {
  let me = this
  me.on('afterrender', onAfterRender, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  let me = this
  let sender = me.sender
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
}

function onRecordLoaded () {
  const me = this
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'employeePositionID'
  })
  me.setTitleByOrderType()
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {

  })
  if (me.isNewInstance) {
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    if (me.customParams.empOrderType) {
      me.record.set('empOrderType', me.customParams.empOrderType)
    }
    const orderDate = AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate') || me.orderForm.record.get('entryDate'))
    me.record.set('dateFrom', orderDate)
  }

  me.getField('dateTo').setMinValue(AC.dateService.addDays(me.record.get('dateFrom'), 1))
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reason',
    entityName: 'hr_dictReasonTrialProlong'
  })
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reasonDoc',
    entityName: 'hr_dictOrderDetReasonDoc'
  })
  HR.orderManager.setDefaultValues(me)
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
  setDateFromInfo(me, null)
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
}

function enableControls () {
  let me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
  me.setupControls()
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.isInternalChange) {
    return
  }
  switch (field.name) {
    case 'employeePositionID':
      me.getWorkbookRecord()
        .then(data => {
          let toClearDateFromInfo = false
          if (data) {
            me.record.set('employeeWorkbookID', data.ID)
            if (data.dateTrialEnd) {
              me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(data.dateTrialEnd))
              me.record.set('employeeNumberID.orderID.description', data.appointOrder)
              me.setDayCount()
            } else {
              toClearDateFromInfo = true
            }
          } else {
            me.record.set('employeeWorkbookID', null)
            toClearDateFromInfo = true
          }
          if (toClearDateFromInfo) {
            me.record.set('dateFrom', null)
            me.record.set('employeeNumberID.orderID.description', null)
            me.record.set('dateTo', null)
            me.record.set('dayCount', null)
          }
          setDateFromInfo(me, (data && data.appointOrder) || '')
          HR.controlService.setPeriodAbsenceList(me, { dateToField: 'dateFrom' })
        })
      break
    case 'dateFrom':
      me.setDayCount(field.name)
      HR.controlService.setPeriodAbsenceList(me, { dateToField: 'dateFrom' })
      break
    case 'dateTo':
      me.setDayCount(field.name)
      break
  }
  me.setupControls()
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function onAfterRender () {
  const me = this
  me.up('window').on('beforeclose', win => {
    return true
  })
}

function setDateFromInfo (me, appointOrder) {
  const dateFromInfo = me.down('[name=dateFromInfo]')
  if (dateFromInfo) {
    if (appointOrder === null) {
      me.getWorkbookRecord()
        .then(data => {
          let orderStr = (data && data.appointOrder) || ''
          dateFromInfo.setText(orderStr)
        })
    } else {
      dateFromInfo.setText(appointOrder)
    }
  }
}

function onAfterSave () {
  const me = this
  me.orderForm.onRefresh()
}
