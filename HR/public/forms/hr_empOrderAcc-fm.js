/* global AC */
exports.formCode = {
  addBaseActions,
  initComponentStart,
  initUBComponent,
  initComponentDone,
  recordLoaded

}

function recordLoaded () {
  let me = this
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    if (modified.includes('dummy')) {

    }
  })
  if (me.sender) {
    let masterForm = me.sender.up('form')
    if (masterForm) {
      let orderForm = masterForm.sender.up('form')
      if (me.isNewInstance) {
        if (orderForm) {
          me.record.set('empOrderID', orderForm.instanceID)
        }
        me.record.set('empOrderDetID', masterForm.instanceID)
        me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(masterForm.record.get('dateFrom')))
        me.record.set('dateToEmpty', AC.dateService.truncTimeToUtcNull(masterForm.record.get('dateToEmpty')))
      }
    }
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.groupType': 'PAYMENT' }, [])
}
function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
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
  })
}

function addBaseActions () {
  this.callParent(arguments)
}
function initUBComponent () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

}
function initComponentDone () {
  let
    me = this
  AC.viewUtils.setAttr(me)
  me.on('beforeSaveForm', function (a, b, c, d) {})
  me.on('beforeClose', function (a) {})

  me.on('recordloaded', recordLoaded)
  me.on('formDataReady', function (a) {})
  me.on('beforeSaveForm', function (a) {})
  me.on('aftersave', function (a) {})
  me.on('beforeDelete', function (a) {})
  me.on('afterDelete', function (a) {})
  me.on('beforeClose', function (a) {})
}
