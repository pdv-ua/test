/* global HR $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  isAdmin,
  onAfterSave
}

function isAdmin () {
  const userData = $App.connection.userData()
  const roles = userData.roles && userData.roles.split(',')
  return (/\badmins\b/).test(roles) || /\borgNodeAdmin\b/.test(roles) || /\bAdmin\b/.test(roles) // isAdmin
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    HR.orderManager.disableContextMenuItems(me.down('[name=organizationName]'), ['editItem', 'addItem'])
  })
}

function initComponentDone () {
  let me = this
  me.on('formDataReady', function (a) {
    me.down('[name=organizationName]').setValue(me.record.get('organizationName'))
    HR.orderManager.setDefaultValues(me)
  })
  HR.orderManager.setNextRecordMaker(me, [{
    paraID: value => value,
    orderID: value => value
  }], 4)
  me.on('afterSave', me.onAfterSave, me)
}

function onAfterSave () {
  let me = this
  if (me.sender && me.sender.getStore) {
    me.sender.getStore().load()
  }
}
