/* global UB appAC AC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  enableControls,
  recordLoaded,
  onControlChanged,
  updateMissionOrderCtrl,
  setMissionOrderDescription,
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
  me.attr.missionOrderDescription.setFieldStyle({ color: 'blue' })
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
  return isPosted
}

async function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      updateMissionOrderCtrl(me, value, me.attr.employeePositionID.getFieldValue('positionID'))
      break
    case 'missionOrderDetID':
      setMissionOrderDescription(me, value, me.attr.employeePositionID.getValue())
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
  me.attr.missionOrderDescription.setValue(null)

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
  } else {
    UB.Repository('hr_empOrderMissionDet')
      .attrs(['purpose', 'cityName', 'isHolidayPay', 'destOrganizationName'])
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
        }
      })
  }
}

async function beforeSave (me, params) {
  const ctrl = me.attr.employeePositionID
  params.execParams.organizationID = appAC.globalOrganization()
  params.execParams.orderID = me.orderForm.instanceID
  params.execParams.employeeID = ctrl.getFieldValue('employeeID')
  params.execParams.employeeNumberID = ctrl.getFieldValue('employeeNumberID')
  params.execParams.positionID = ctrl.getFieldValue('positionID')
  params.execParams.firstName = ctrl.getFieldValue('employeeID.firstName')
  params.execParams.lastName = ctrl.getFieldValue('employeeID.lastName')
  params.execParams.middleName = ctrl.getFieldValue('employeeID.middleName')
  params.execParams.description = me.attr.missionOrderDetID.getFieldValue('description')
  params.execParams.dateFrom = me.attr.missionOrderDetID.getFieldValue('dateFrom')
  params.execParams.dateTo = me.attr.missionOrderDetID.getFieldValue('dateTo')
  params.execParams.title = me.title
}
