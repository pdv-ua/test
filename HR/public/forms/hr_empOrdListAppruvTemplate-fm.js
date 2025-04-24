/* global HR */
exports.formCode = {
  initComponentStart
}

function initComponentStart () {
  let me = this
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('empOrderType'), ['editItem', 'showLookup', 'addItem'])
  })
  me.on('formDataReady', () => {
    let grid = me.down('[name=empOrdListAppruvTemplateList]')
    if (me.isNewInstance) {
      if (me.defaultValues.empOrderType) {
        me.record.set('empOrderType', me.defaultValues.empOrderType)
      }
      if (me.defaultValues.organizationID) {
        me.record.set('organizationID', me.defaultValues.organizationID)
      }
      if (me.orderID) {
        grid.setReadOnly(true)
        me.on('beforesave', (me, params) => {
          params.orderID = me.orderID
        })
        me.on('aftersave', me => {
          grid.getStore().load()
        })
      }
    }
  })
}
