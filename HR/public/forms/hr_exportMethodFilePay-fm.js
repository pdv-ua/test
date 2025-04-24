/* global AC $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onAfterSave,
  onFormDataReady,
  setDefaultFields,
  beforeGridEdit
}

function initComponentStart () {
  let me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
}

function onRecordLoaded (record, data) {

}

function onAfterSave () {
//  AC.gridUtils.refreshSenderGrid(this)
}

function onFormDataReady () {
  const me = this
  const orgID = appAC.globalOrganization()
  if (me.isNewInstance) {
    me.record.set('typeFile', 'filePay')
    me.record.set('orgID', orgID)
  }
}

function setDefaultFields (me, bank) {
  me.saveForm()
    .then(result => {
      if (result !== -1) {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Заповнити за замовченням?'))
          .then(choice => {
            if (choice) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_exportMethod',
                method: 'setDefaultFields',
                exportMethodID: me.instanceID,
                bank
              }).then(() => {
                me.down('[name=fieldGrid]').getStore().load()
                me.setLoading(false)
              }, (err) => {
                me.setLoading(false)
                throw err
              })
            }
          })
      }
    })
}

function beforeGridEdit (me, gridName, context) {
  const exportFieldsID = me.attr[`${gridName}.exportFieldsID.description`].field
  if (!context.record.get('exportFieldsID.description') || context.record.get('exportFieldsID.description').indexOf('[fixValue]')) {
    me.attr[`${gridName}.fixValue`].field.setReadOnly(false)
  } else {
    me.attr[`${gridName}.fixValue`].field.setValue()
    me.attr[`${gridName}.fixValue`].field.setReadOnly(true)
  }
  exportFieldsID.on('change', () => {
    if (exportFieldsID.getFieldValue('code') !== 'fixValue') {
      me.attr[`${gridName}.fixValue`].field.setValue()
      me.attr[`${gridName}.fixValue`].field.setReadOnly(true)
    } else {
      me.attr[`${gridName}.fixValue`].field.setReadOnly(false)
    }
  })
}
