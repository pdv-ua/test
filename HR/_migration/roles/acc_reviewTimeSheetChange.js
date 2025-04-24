const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewTimeSheetChange',
  description: 'Переглядач індівідуального розкладу роботи працівників організації',
  description_uk: 'Переглядач індівідуального розкладу роботи працівників організації',
  description_ru: 'Просмотрщик индивидуального расписания работы сотрудников организации',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'runTableReport']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['hr_timeSheetChange', 'accTim_timeSheetChange', ['0', 'Скорочення робочого дня/тижня']],
    ['', ['1', 'Звіти TIM', 'tim_report']]
  ]
}
