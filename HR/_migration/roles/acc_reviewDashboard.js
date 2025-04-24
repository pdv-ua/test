const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewDashboard',
  description: 'Переглядач Робочого столу',
  description_uk: 'Переглядач Робочого столу',
  description_ru: 'Просмотрщик Рабочего стола',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: [],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['dashboard']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () { return ['', ['0', 'Сервіс HR', 'hr_service']] }
