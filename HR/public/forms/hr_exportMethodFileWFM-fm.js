/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onAfterSave,
  changeSettingsParam,
  onFormDataReady,
  beforeGridEdit
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.fieldGrid.getStore().on('load', (grid, record) => me.changeSettingsParam(me))
  me.attr.fieldGrid.on('changeData', () => {
    me.attr.fieldGrid.getStore().load()
  })
}

function onAfterSave () {
  // AC.gridUtils.refreshSenderGrid(this)
}

function changeSettingsParam (me) {
  const data = me.attr.fieldGrid.getData()
  const listParamIDs = []
  data.forEach(row => {
    if (row.listParamID) {
      listParamIDs.push(row.listParamID)
    }
    if (row.listParam1ID) {
      listParamIDs.push(row.listParam1ID)
    }
  })
  if (!listParamIDs.length) {
    listParamIDs.push(0)
  }
  me.down('[xtype=paramsControl]').setListParamIDs(listParamIDs)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('typeFile', 'fileWFM')
    me.record.set('orgID', appAC.globalOrganization())
  }
}

function beforeGridEdit (me) {
  me.attr[`fieldGrid.exportFieldsID.description`].field.on('change', (ctrl, value) => {
    if (value) {
      me.attr[`fieldGrid.fixValue`].field.setValue(null)
    }
  })
  me.attr[`fieldGrid.fixValue`].field.on('change', (ctrl, value) => {
    if (value) {
      me.attr[`fieldGrid.exportFieldsID.description`].field.setValueById(null)
    }
  })
}
