/* global appAC */

exports.formCode = {
  initComponentStart,
  initComponentDone
}

function initComponentStart () {
  const form = this

  form.globalDateChange = () => {
    updateOnDate(form)
  }
  form.globalOrganizationChange = () => {
    updateOnDate(form)
  }
}

function initComponentDone () {
  const form = this

  if (form.customParams.orderForm) {
    form.masterForm = form.orderForm = form.customParams.orderForm
  } else {
    form.masterForm = form.orderForm = form.sender.up('form')
  }

  if (form.isNewInstance) {
    const organizationID = form.masterForm.record.get('organizationID')
    form.record.set('organizationID', organizationID)
    form.getField('organizationID').setValueById(organizationID)
  }

  updateOnDate(form)
}

function updateOnDate (form) {
  const positionID = form.getField('positionID')
  updateOnDateCtrl(form, positionID)
}

function updateOnDateCtrl (form, ctrl) {
  const organizationID = form.masterForm.record.get('organizationID')

  const store = ctrl.getStore()

  store.ubRequest.orgID = organizationID
  store.ubRequest.onDate = appAC.globalApplicationDate()

  store.ubRequest.entity = 'hr_positionVac'
  store.ubRequest.method = 'getVacancies'
  // store.ubRequest.__mip_recordhistory_all = true

  // store.load()
}
