/* global AC appAC _ $App UB */
exports.formCode = {
  initComponentStart,
  onRecordLoaded,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me) 
  me.on('recordloaded', onRecordLoaded, me)
}

function onRecordLoaded (record, data) {
  const me = this

  if (!me.isNewInstance) {
    AC.viewUtils.setAttr(me)
    const f = data.resultData.fields 
    const r = data.resultData.data[0]
    me.attr.assetNumber.setValue(r[f.indexOf('assetsID.code')])
    me.attr.assetCateg.setValue(r[f.indexOf('assetsID.categAssetsID.description')])
    me.attr.assetGroup.setValue(r[f.indexOf('assetsID.groupAssetsID.description')])
    me.attr.assetType.setValue(r[f.indexOf('assetsID.typeAssetsID.description')])
    me.attr.assetSN.setValue(r[f.indexOf('assetsID.SN')])
    me.attr.assetOrg.setValue(r[f.indexOf('assetsID.organizationID.description')])
}
}

function onControlChanged (field, value) {
  const me = this
  AC.viewUtils.setAttr(me)

  switch (field.name) {
    case 'assetsID':
      me.attr.assetNumber.setValue(me.attr.assetsID.getFieldValue('code'))
      me.attr.assetCateg.setValue(me.attr.assetsID.getFieldValue('categAssetsID.description'))
      me.attr.assetGroup.setValue(me.attr.assetsID.getFieldValue('groupAssetsID.description'))
      me.attr.assetType.setValue(me.attr.assetsID.getFieldValue('typeAssetsID.description'))
      me.attr.assetSN.setValue(me.attr.assetsID.getFieldValue('SN'))
      me.attr.assetOrg.setValue(me.attr.assetsID.getFieldValue('organizationID.description'))
      break

    case 'dateFrom':
    case 'dateTo':
      if (me.attr.dateTo.getValue() &&   me.attr.dateFrom.getValue() > me.attr.dateTo.getValue() ) {
        $App.dialogInfo(UB.i18n('Увага! Внесена дата видачі більша за дату повернення.'))
        me.attr.dateTo.setValue('')
      }
      break
  }
}