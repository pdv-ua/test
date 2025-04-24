/* global AC appAC HR */
exports.formCode = {
  initComponentDone,
  initComponentStart,
  onRecordLoaded
}

function initComponentStart () {
  let me = this
  me.on('recordloaded', onRecordLoaded, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onRecordLoaded () {
  const me = this
  HR.treeUtils.setStaffUnitWhereList({
    ctrl: me.attr.orgID,
    withChilds: true
    /* callBackFn: () => {
      if (me.isNewInstance) {
        me.record.set('orgID', appAC.globalOrganization())
      }
    } */
  })
}
