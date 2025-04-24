/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  controlChanged,
  onFormDataReady,
  onRecordLoaded,
  onAfterSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('afterSave', me.onAfterSave, me)
  me.on('recordLoaded', me.onRecordLoaded, me)
  me.on('controlChanged', controlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    me.record.set('sourceOrgID', appAC.globalOrganization())
  }
}

function onFormDataReady () {
  const me = this
  const positionCtrl = me.attr.positionID
  const positionStore = positionCtrl.getStore()
  if (!positionStore.isLoaded) {
    AC.viewUtils.setWhereListProperty(positionCtrl, [
      ['orgID', '=', me.record.get('sourceOrgID')]
    ], undefined, ['clearStore'])
    positionStore.isLoaded = true
  }
  const isExtOrderSignerAvailable = AC.settings.get('hrIsExtOrderSignerAvailable', appAC.globalOrganization())
  if (!isExtOrderSignerAvailable) {
    me.attr.sourceOrgID.setReadOnly(true)
  }
  if (!me.isNewInstance) {
    me.down('[ubID=btnSelectByTree]').setDisabled(me.record.get('organizationID') !== me.record.get('sourceOrgID'))
    me.attr.positionID.setValueById(me.record.get('positionID'))
    me.attr.departmentID.setValueById(me.record.get('departmentID'))
  }
}

function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'sourceOrgID':
      const isDisableBtn = value !== me.record.get('organizationID')
      me.down('[ubID=btnSelectByTree]').setDisabled(isDisableBtn)
      if (value) {
        AC.viewUtils.setWhereListProperty(me.attr.departmentID, [
          ['orgID', '=', value]
        ], undefined, ['clearStore', 'clearValue'])
        AC.viewUtils.setWhereListProperty(me.attr.positionID, [
          ['orgID', '=', value],
          ['parentUnitID', '=', value]
        ], null, ['clearStore', 'clearValue'])
      } else {
        me.attr.departmentID.setValue()
      }
      break
  }
}

function onAfterSave () {
  // AC.gridUtils.refreshSenderGrid(this)
}
