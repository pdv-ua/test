/* global HR AC appAC _ */

exports.formCode = {
  initComponentDone,
  initComponentStart,
  onAfterSave,
  onFormDataReady
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onAfterSave () {
  const me = this
  const orgID = me.record.get('organizationID')
  if (HR.printSettings[orgID]) {
    delete HR.printSettings[orgID]
  }
}

function initComponentStart () {
  const me = this

  me.on('formDataReady', onFormDataReady, me)

  me.on('recordloaded', function (record, data) {
    const me = this
    if (me.isNewInstance && me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    if (me.isNewInstance) {
      if (typeof appAC !== 'undefined' && !me.record.get('organizationID')) {
        me.record.set('organizationID', appAC.globalOrganization())
      }
    }
  })
}

function onFormDataReady () {
  const me = this
  if (me.disableChangeOrg) {
    me.attr.organizationID.setReadOnly(true)
  }
}
