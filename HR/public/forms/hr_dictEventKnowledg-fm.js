/* global AC appAC */
exports.formCode = {
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.isNewInstance && me.attr.organizationID.setValueById(appAC.globalOrganization())
  me.attr.name.on('blur', ctrl => {
    !me.attr.nameM.getValue() && me.attr.nameM.setValue(ctrl.getValue())
    !me.attr.nameW.getValue() && me.attr.nameW.setValue(ctrl.getValue())
  })
}
