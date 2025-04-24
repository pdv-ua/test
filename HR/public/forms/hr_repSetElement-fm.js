/*  global AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  controlChanged,
  onAfterSave
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlsChanged', me.controlsChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onRecordLoaded () {
  const me = this
  const orgID = appAC.globalOrganization()
  const onDate = appAC.globalApplicationDate()
  if (me.isNewInstance) {
    const grid = AC.gridUtils.getSenderGrid(me)
    if (grid.customParams && grid.customParams.repSetParamID) {
      me.record.set('repSetParamID', grid.customParams.repSetParamID)
    }
  }
  HR.treeUtils.setStaffUnitWhereList({ ctrl: me.attr.dictDepID, orgID: orgID, onDate: onDate })
  HR.treeUtils.setStaffUnitWhereList({ ctrl: me.attr.dictPosID, orgID: orgID, onDate: onDate })
  AC.viewUtils.setWhereListProperty(me.attr.dictPositionID, [
    ['dateFrom', '<=', onDate],
    ['dateTo', '>=', onDate]
  ])
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
  })
}

function onFormDataReady () {
  const me = this
  HR.orderManager.requiredIf(me)
  HR.orderManager.showIf(me)
  me.query('[isElement]').forEach(item => {
    item.on('change', ctrl => {
      let displayName = (item.attributeName === 'dictPosID') ? 'posDepName' : (['payElID', 'dictPositionID'].includes(item.attributeName) ? 'description' : 'name')
      let elmInfo = ctrl.getFieldValue(displayName)
      if (elmInfo && elmInfo.length > 200) {
        elmInfo = elmInfo.substring(0, 200 - 3) + '...'
      }
      me.record.set('elementInfo', elmInfo)
      me.record.set('elementID', ctrl.getValue())
      me.query('[isElement]').forEach(item => {
        if (item !== ctrl) {
          me.record.set(item.attributeName, null)
        }
      })
    })
  })
}

function controlChanged (ctrl, value) {
  let me = this
  switch (ctrl.name) {
    case 'elementSetTypeID':
      me.getField('elementID').setValue()
      me.record.set('elementInfo', null)
      me.query('[isElement]').forEach(item => {
        me.record.set(item.attributeName, null)
      })
      break
  }
}

function onAfterSave () {
  AC.gridUtils.refreshSenderGrid(this)
}
