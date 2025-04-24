/* global appAC AC UB _ */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  controlChanged,
  onRecordLoaded
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  } else {
    me.attr.dictFilter.setValueById(me.record.get('dictFilter'))
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  UB.Repository('hr_organization')
    .attrs('description')
    .where('mi_data_id', '=', me.record.get('organizationID'))
    .where('state', '=', 'ACTIVE')
    .selectSingle()
    .then(org => {
      if (org) {
        me && me.down('[name=orgName]') && me.down('[name=orgName]').setValue(org.description)
      }
    })
}

function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'value':
      if (value === 'CONTACT') {
        me.attr.dictFilter.show()
        me.attr.dictFilter.setAllowBlank(false)
      } else {
        me.attr.dictFilter.hide()
        me.attr.dictFilter.setAllowBlank(true)
        me.attr.dictFilter.setValue()
      }
      break
  }
}
