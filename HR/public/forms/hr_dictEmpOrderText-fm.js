/* global AC $App HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  isAdmin
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

function initComponentDone () {
  let me = this
  let sender = me.sender
  let organizationID = null
  this.on('recordloaded', function (a) {
    organizationID = sender && AC.viewUtils.getFilterValue(me.sender, 'orgInOrder')
    let empOrderType = sender && AC.viewUtils.getFilterValue(sender, 'empOrderType')
    if (me.isNewInstance) {
      if (empOrderType) {
        me.record.set('empOrderType', empOrderType)
      }
      me.record.set('organizationID', organizationID)
    } else {
      // $App.domainInfo.isEntityMethodsAccessible(entityName, method)
      if (!$App.domainInfo.isEntityMethodsAccessible('hr_dictEmpOrderText', 'update')) {
        if (!me.record.get('organizationID')) {
          HR.orderManager.enableControls({
            me: me,
            isEnabled: false
          })
        }
      }
    }
    me.getField('empOrderType').setReadOnly(!!empOrderType)
  })
  this.on('formDataReady', function (a) {})
  this.on('beforeSaveForm', function (a) {})
  this.on('aftersave', function (a) {})
  this.on('beforeDelete', function (a) {})
  this.on('afterDelete', function (a) {})
  this.on('beforeClose', function (a) {})
}
