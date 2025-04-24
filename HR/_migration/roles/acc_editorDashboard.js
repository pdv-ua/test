const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorDashboard',
  description: 'Редактор Робочого столу',
  description_uk: 'Редактор Робочого столу',
  description_ru: 'Редактор Рабочего стола',
  description_az: 'İş masası redaktoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: [],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['view', 'dashboard']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () { return ['', ['0', 'Особа', 'hr_employee'], ['1', 'Сервіс HR', 'hr_service']] }
