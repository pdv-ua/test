/* global AC appAC appHR UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  setEmployeeFilter
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this

  const orgID = appAC.globalOrganization()
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: orgID, isClosed: 0 })
  if (me.isNewInstance) {
    appHR.getCurrentPeriod(orgID).then(response => {
      me.attr.periodID.setValueById(response.ID)
    })
  } else {
    UB.Repository('hr_dictPeriod')
      .attrs(['*'])
      .selectById(me.record.get('periodID'))
      .then(response => {
        AC.viewUtils.setFormReadOnly(me, !!response.isClosed)
        me.attr.dateFrom.setMinValue(response.dateFrom)
        me.attr.dateTo.setMaxValue(response.dateTo)
      })
  }

  AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
    organizationID: appAC.globalOrganization(),
    dateTo: { value: appAC.globalApplicationDate(), condition: '>=' },
    dateFrom: { value: appAC.globalApplicationDate(), condition: '<=' },
    workPlace: '3'
  })
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      me.record.set('employeeID', field.getFieldValue('employeeID'))
      break
    case 'periodID':
      me.attr.dateFrom.setValue(field.getFieldValue('dateFrom'))
      me.attr.dateTo.setValue(field.getFieldValue('dateTo'))
      me.attr.dateFrom.setMinValue(field.getFieldValue('dateFrom'))
      me.attr.dateTo.setMaxValue(field.getFieldValue('dateTo'))
      break
    case 'dateFrom':
      me.attr.dateTo.setMinValue(value)
      break
    case 'dateTo':
      me.attr.dateTo.setMaxValue(value)
      break
  }
}

function setEmployeeFilter () {
  const me = this
  if (me.attr.dateTo.isValid() && me.attr.dateFrom.isValid() && me.attr.dateTo.getValue() && me.attr.dateFrom.getValue()) {
    AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
      organizationID: appAC.globalOrganization(),
      dateTo: { value: me.attr.dateTo.getValue(), condition: '>=' },
      dateFrom: { value: me.attr.dateFrom.getValue(), condition: '<=' },
      workPlace: '3'
    })
  }
}
