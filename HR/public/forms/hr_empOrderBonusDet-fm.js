/* global HR */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  initUBComponent,
  initComponentDone,
  enableControls,
  onAfterOrderSave

}
function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('formDataReady', a => {
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
  })

  me.on('afterrender', function () {
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
      HR.orderManager.setNextRecordMaker(me, [{
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }], 4)
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
}

function addBaseActions () {
  this.callParent(arguments)
}

function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

}

function initComponentDone () {}

function enableControls () {
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}
