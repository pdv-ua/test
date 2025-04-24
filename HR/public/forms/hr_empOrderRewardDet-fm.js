/* global HR */
exports.formCode = {
  initComponentStart: function () {
    let me = this
    me.on('formDataReady', a => {
      HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    })

    me.on('afterrender', function () {
      let win = this.window
      if (win) {
        if (!win.height) {
          win.height = 600
        }
        if (!win.width) {
          win.width = 800
        }
      }
      me.orderConfig = {
        detailGrids: []
      }
    })
    /*me.on('beforeClose', function (a) {
      if (me.sender) {
        let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
        if (grid) {
          grid.onRefresh()
        }
      }
    })*/

    me.on('recordloaded', function (a) {
      let me = this
      me.masterForm = me.sender.up('form')
      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
        HR.orderManager.showIf(me)
        HR.orderManager.requiredIf(me)
      })
      HR.orderManager.requiredIf(me)
      HR.orderManager.showIf(me)
      if (me.isNewInstance) {
        me.record.set('organizationID', me.masterForm.record.get('organizationID'))
        me.record.set('orderID', me.masterForm.instanceID)
      }
      me.orderState = me.masterForm.record.get('orderState')
      if (me.orderState === 'PROJECT') {
        if (!me.setNextRecordMaker) {
          HR.orderManager.setNextRecordMaker(me, [{
            isExternal: value => value,
            bonusID: value => value,
            organizationID: value => me.masterForm.record.get('organizationID'),
            empOrderType: value => value,
            orderID: value => value
          }], 4)
          me.setNextRecordMaker = true
        }
        me.masterForm.filterEmployeePosition(me, {
          attrToFilter: 'employeePositionID'
        })
      }
      me.enableControls()
      HR.orderManager.setDefaultValues(me)
    })
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }
  },

  addBaseActions: function () {
    this.callParent(arguments)
  },

  enableControls: function () {
    return this.masterForm.enableParaControls(this)
  },

  onAfterOrderSave: function () {
    const me = this
    me.enableControls()
  }
}
