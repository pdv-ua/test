/* global HR appAC $App AC */
exports.formCode = {
  initComponentDone,
  controlChanged
}
function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'isCommon':
      me.getField('empOrderType').setDisabled(value)
      if (value) {
        me.getField('empOrderType').setValue('COMMON')
      } else if (me.empOrderType) {
        if (me._isNewInstance) {
          me.getField('empOrderType').setValue(me.empOrderType)
        }
      }
      break
  }
}
function initComponentDone () {
  let me = this
  let empOrderType
  me.on('controlChanged', controlChanged, me)
  if (me.sender) {
    empOrderType = me.sender.empOrderType
    if (!empOrderType) {
      empOrderType = me.sender.panel && me.sender.panel.empOrderType
    }
    me.empOrderType = empOrderType
  }
  me.on('recordloaded', function (a) {
    const isAdmin = $App.connection.userData().roles.toUpperCase().split(',').includes('ADMIN') || AC.entityUtils.verifyRightsMethod('hr_dictTask', 'update')

    me._isNewInstance = me.isNewInstance
    if (me.isNewInstance) {
      me.record.set('empOrderType', empOrderType || 'COMMON')
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('isCommon', !empOrderType)
    } else if (!isAdmin && !me.record.get('organizationID')) {
      HR.orderManager.enableControls({
        me: me,
        isEnabled: false
      })
    }
    HR.orderManager.disabledIf(me)
  })
}
