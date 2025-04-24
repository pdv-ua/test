/* global AC appAC UB */

exports.formCode = {
  initComponentDone,
  onFormDataReady,
  onControlChanged
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.orgID.setValueById(appAC.globalOrganization())
    if (me.defaultValues) {
      me.attr.departmentID.setValueById(me.defaultValues.departmentID)
      me.attr.signerCode.setValue(me.defaultValues.signerCode)
    }
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid) {
    const form = grid.up('form')
    me.attr.departmentID.setReadOnly(!!form)
  } else {
    me.attr.departmentID.setReadOnly(false)
  }

  const filterParams = [
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()],
    ['isActive', '=', 1]
  ]
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, filterParams)
  if (!(me.defaultValues && me.defaultValues.signerCode)) {
    me.attr.signerCode.show()
  }
  me.attr.signerType[['WORKSHEET', 'KPIRATINGLISTS', 'WFMTIMESHEETORDER', 'KPIEVALUATION'].includes(me.attr.signerCode.getValue()) ? 'show' : 'hide']()
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeePositionID':
        me.attr.employeeNumberID.setValueById(me.attr.employeePositionID.getFieldValue('employeeNumberID'))
        if (value && me.attr.employeePositionID.getFieldValue('positionID')) {
          UB.Repository('hr_position')
            .attrs(['ID', 'name'])
            .where('state', '=', 'ACTIVE')
            .where('mi_data_id', '=', me.attr.employeePositionID.getFieldValue('positionID'))
            .orderBy('mi_dateTo', 'desc')
            .selectSingle().then(resp => {
              if (resp) {
                me.attr.positionName.setValue(resp.name)
              }
            })
        } else {
          me.attr.positionName.setValue()
        }
        break
      case 'signerCode':
        me.attr.signerType.setValue()
        me.attr.signerType[['WORKSHEET', 'KPIRATINGLISTS', 'WFMTIMESHEETORDER', 'KPIEVALUATION'].includes(me.attr.signerCode.getValue()) ? 'show' : 'hide']()
        break
    }
  }
}
