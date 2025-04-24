/* global AC appAC */

exports.formCode = {
  initComponentDone,
  initComponentStart
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

async function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('orgID', appAC.globalOrganization())
  }
}
