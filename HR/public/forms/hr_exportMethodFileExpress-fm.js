/* global AC appAC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  const tp = me.down('[xtype=tabpanel]')
  if (me.isNewInstance) {
    me.record.set('typeFile', 'fileExpress')
    me.record.set('orgID', appAC.globalOrganization())
    tp.items.items[0].tab.hide()
    tp.items.items[1].tab.hide()
  } else {
    me.down('[xtype=reportparamcontrol]').show()
    me.attr.nameFile.setValue(me.record.get('nameFile'))
    me.attr.nameFile.setReadOnly(true)
    if (me.record.get('nameFile') === 'ZEX') {
      tp.items.items[0].tab.hide()
      tp.setActiveTab(1)
      const paramGrid = me.down('[itemId=reportParamGrid]')
      if (paramGrid) {
        paramGrid.store.ubRequest.whereList.byReport.value = `${me.record.get('nameFile')}_${me.instanceID}`
        paramGrid.onRefresh()
      }
    }
    if (me.record.get('nameFile') === 'PZP') {
      tp.items.items[1].tab.hide()
      tp.setActiveTab(0)
      const fieldGrid = me.down('[name=fieldGrid]')
      if (fieldGrid) {
        UB.Repository('hr_reportParam')
          .attrs('listParamID')
          .where('reportCode', '=', 'PZP_' + me.instanceID)
          .selectAsArrayOfValues().then(IDs => {
            fieldGrid.store.ubRequest.whereList.listParamID.value = IDs && IDs.length ? IDs : [0]
            fieldGrid.onRefresh()
          })
      }
    }
  }
}
