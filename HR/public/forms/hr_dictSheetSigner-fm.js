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
    }
  }
  const filterParams = [
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()],
    ['isActive', '=', 1]
  ]
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, filterParams)
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeePositionID':
        me.attr.employeeNumberID.setValueById(me.attr.employeePositionID.getFieldValue('employeeNumberID'))
        if (value && me.attr.employeePositionID.getFieldValue('positionID')) {
          const useActualPositionName = AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization()) === true
          UB.Repository('hr_employeePositionS')
            .attrsIf(useActualPositionName, ['factPosName'])
            .attrsIf(!useActualPositionName, ['posNameDiff'])
            .orderBy('dateTo', 'desc')
            .selectById(value).then(resp => {
              if (resp) {
                me.attr.positionName.setValue(useActualPositionName ? resp.factPosName : resp.posNameDiff)
              }
            })
        } else {
          me.attr.positionName.setValue()
        }
        break
    }
  }
}
