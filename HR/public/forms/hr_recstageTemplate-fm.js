/* global HR appAC */
exports.formCode = {
  initComponentStart

}

function initComponentStart () {
  let me = this
  me.on('afterrender', () => {
    HR.orderManager.disableContextMenuItems(me.getField('empOrderType'), ['editItem', 'showLookup', 'addItem'])
  })
  me.on('formDataReady', () => {
    let grid = me.down('[name=recstage]')
    if (me.isNewInstance) {
      if (me.recPanel) {
        const orderForm = me.recPanel.up('form')
        if (orderForm) {
          me.record.set('organizationID', orderForm.record.get('organizationID') || appAC.globalOrganization())
          me.record.set('empOrderType', orderForm.record.get('empOrderType'))
        }
        grid.setReadOnly(true)
        me.on('beforesave', (me, params) => {
          params.sourceDocID = orderForm.instanceID
        })
        me.on('aftersave', me => {
          grid.getStore().load()
        })
      } else {
        me.record.set('organizationID', appAC.globalOrganization())
      }
    } else {
      me.down('[name=recstage]').setReadOnly(false)
    }
  })
}
