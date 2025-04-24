const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewTimeSheetDep',
  description: 'Переглядач табеля підрозділу',
  description_uk: 'Переглядач табеля підрозділу',
  description_ru: 'Просмотрщик табеля подразделения',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'viewPrintForm', 'loadData', 'runTableReport', 'canViewOneDep']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['tim_timeSheet', 'accTim_timeSheet', ['0-2,5', 'Табель']],
    ['hr_empOrderUni', 'accTim_empOrderUni', ['0,4', 'Універсальний документ']],
    ['', ['3', 'Звіти TIM', 'tim_report']]
  ]
}
