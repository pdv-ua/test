/* global UB appAC AC $App HR moment */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  enableControls,
  recordLoaded,
  onControlChanged,
  updateMissionOrderCtrl,
  onCheckValidBeforeSaveForm,
  setMissionOrderDescription,
  calcPeriod,
  beforeSave
}

function initComponentStart () {
  let me = this
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })
}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
  }
  me.orderState = me.orderForm && me.orderForm.record.get('orderState')

  me.onBeforeSave = () => {
    return me.onCheckValidBeforeSaveForm(me)
  }

  AC.viewUtils.setAttr(me)
  updateMissionOrderCtrl(me, -1, -1)

  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value
    }], 4)
  }

  me.on('aftersave', afterSave, me)
  me.on('beforesave', beforeSave, me)
  me.on('recordloaded', recordLoaded)
  me.on('controlChanged', onControlChanged)
  me.on('formDataReady', () => {
    HR.orderManager.setTitleByOrderType(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
  })
}

function recordLoaded () {
  const me = this
  me.masterForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID',
    clearValue: false
  })
  if (!me.isNewInstance) {
    updateMissionOrderCtrl(me, me.record.get('employeePositionID'), me.record.get('positionID'))
    setMissionOrderDescription(me, me.record.get('missionOrderDetID'))
  }
}

async function afterSave (me) {
  me.attr.missionOrderID.setValueById(me.attr.missionOrderID.getValue())
}

function enableControls () {
  const me = this
  const isPosted = me.orderForm ? me.orderForm.enableParaControls(me) : true
  if (!me.orderForm) {
    HR.orderManager.enableControls({
      me: me,
      isEnabled: false
    })
  }
  me.down('[name=hr_empOrderActingDet]').show()
  return isPosted
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      updateMissionOrderCtrl(me, value, me.attr.employeePositionID.getFieldValue('positionID'))
      break
    case 'missionOrderDetID':
      setMissionOrderDescription(me, value, true)
      break
  }
}

function updateMissionOrderCtrl (me, employeePositionID, positionID) {
  me.attr.missionOrderID.setValue(null)
  me.attr.missionOrderDetID.setValue(null)
  UB.Repository('hr_empOrderEmployeeDet')
    .attrs(['orderID', 'paraID'])
    .where('employeePositionID', '=', employeePositionID)
    .where('orderID.organizationID', '=', appAC.globalOrganization())
    .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
    .where('orderID.empOrderType', 'in', ['MISSION', 'MISSION_TRAINING'])
    .selectAsObject()
    .then(res => {
      const paraIds = res.length ? res.map(x => x.paraID) : ['-1']
      AC.viewUtils.setWhereListProperty(me.attr.missionOrderDetID, [['ID', 'in', paraIds]])
      me.attr.missionOrderDetID.getStore().reload().then(({ data }) => {
        if (data && data.items && data.items.length) {
          me.attr.missionOrderDetID.setValue(data.items[0].data.ID)
          me.attr.missionOrderID.setValue(data.items[0].data.orderID)
        }
        if (positionID) {
          UB.Repository('hr_position').attrs('description').where('ID', '=', positionID).selectSingle()
            .then(pres => {
              if (pres) me.title = pres.description
            })
        }
      })
    })
}

function setMissionOrderDescription (me, missionOrderDetID, updateDates) {
  me.attr.missionOrderDescription.setValue('')
  if (updateDates) {
    me.attr.dateFrom.setReadOnly(true)
    me.attr.dateTo.setReadOnly(true)
    me.attr.dayCount.setReadOnly(true)
    me.attr.dateFrom.setValue(null)
    me.attr.dateTo.setValue(null)
    me.attr.dayCount.setValue(null)
  }
  if (me.attr.missionOrderDetID.getValue()) {
    const cityName = me.attr.missionOrderDetID.getFieldValue('cityName')
    const destOrganizationName = me.attr.missionOrderDetID.getFieldValue('destOrganizationName')
    const isHolidayPay = me.attr.missionOrderDetID.getFieldValue('isHolidayPay')
    const purpose = me.attr.missionOrderDetID.getFieldValue('purpose')
    let txt = ''
    if (cityName) txt += ' ' + cityName
    if (destOrganizationName) txt += ', ' + destOrganizationName
    if (purpose) txt += UB.i18n(', з метою ') + purpose
    txt += isHolidayPay ? UB.i18n(', з оплатою вихідних днів ') : UB.i18n(', без оплати вихідних днів ')
    me.attr.missionOrderDescription.setValue(txt)
    me.attr.dateFrom.setReadOnly(false)
    me.attr.dateTo.setReadOnly(false)
    me.attr.dayCount.setReadOnly(false)
    me.attr.dateFrom.setValue(me.attr.missionOrderDetID.getFieldValue('dateFrom'))
    me.attr.dateTo.setValue(me.attr.missionOrderDetID.getFieldValue('dateTo'))
    me.attr.dayCount.setValue(me.attr.missionOrderDetID.getFieldValue('dayCount'))
  } else {
    UB.Repository('hr_empOrderMissionDet')
      .attrs(['dateFrom', 'dateTo', 'dayCount', 'purpose', 'cityName', 'isHolidayPay', 'destOrganizationName'])
      .selectById(missionOrderDetID).then(reco => {
        if (reco) {
          const cityName = reco.cityName
          const destOrganizationName = reco.destOrganizationName
          const isHolidayPay = reco.isHolidayPay
          const purpose = reco.purpose
          let txt = ''
          if (cityName) txt += ' ' + cityName
          if (destOrganizationName) txt += ', ' + destOrganizationName
          if (purpose) txt += UB.i18n(', з метою ') + purpose
          txt += isHolidayPay ? UB.i18n(', з оплатою вихідних днів ') : UB.i18n(', без оплати вихідних днів ')
          me.attr.missionOrderDescription.setValue(txt)
          me.attr.dateFrom.setReadOnly(false)
          me.attr.dateTo.setReadOnly(false)
          me.attr.dayCount.setReadOnly(false)
        }
      })
  }
}

function onCheckValidBeforeSaveForm (me, params) {
  let result = true
  if (me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
    $App.dialogInfo(UB.i18n('Дата початку більш ніж дата завершення відрядження'))
    result = false
    return Promise.resolve(result)
  }

  return Promise.resolve(result)
}

function calcPeriod (ctrl) {
  let me = this
  if (/* ctrl._oldValue !== ctrl.getRawValue() && */ ctrl.getValue()) {
    let dateFrom = me.getField('dateFrom')
    let dateTo = me.getField('dateTo')
    let dayCount = me.getField('dayCount')
    switch (ctrl) {
      case dateFrom:
        if (dayCount.getValue()) {
          dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
        } else if (dateTo.getValue()) {
          dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
        }
        break
      case dateTo:
        if (dateFrom.getValue()) {
          dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
        }
        break
      case dayCount:
        if (dateFrom.getValue()) {
          dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
        }
        break
    }
  }
}

async function beforeSave (me, params) {
  const ctrl = me.attr.employeePositionID
  params.execParams.orderID = me.orderForm.instanceID
  params.execParams.organizationID = appAC.globalOrganization()
  params.execParams.employeeID = ctrl.getFieldValue('employeeID')
  params.execParams.employeeNumberID = ctrl.getFieldValue('employeeNumberID')
  params.execParams.positionID = ctrl.getFieldValue('positionID')
  params.execParams.firstName = ctrl.getFieldValue('employeeID.firstName')
  params.execParams.lastName = ctrl.getFieldValue('employeeID.lastName')
  params.execParams.middleName = ctrl.getFieldValue('employeeID.middleName')
  params.execParams.description = me.attr.missionOrderDetID.getFieldValue('description')
  params.execParams.dateFrom = me.attr.dateFrom.getValue()
  params.execParams.dateTo = me.attr.dateTo.getValue()
  params.execParams.dayCount = me.attr.dayCount.getValue()
  params.execParams.title = me.title
}
