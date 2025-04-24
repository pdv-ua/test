const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewTimeSheetSchedule',
  description: 'Переглядач налаштування графіків роботи організації',
  description_uk: 'Переглядач налаштування графіків роботи організації',
  description_ru: 'Просмотрщик настройки графиков работы организации',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'viewPrintForm', 'loadData', 'runTableReport']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    { accTimSettings: [
      ['tim_calendar', 'accTim_calendar', ['0,2', 'Табель', 'tim_timeSheet']],
      ['hr_workSchedule', 'accTim_workSchedule', ['0', 'Графік роботи']],
      ['tim_plan', 'accTim_timPlan', ['0', 'Розклад роботи']]
    ] },
    ['', ['3', 'Звіти TIM', 'tim_report']]
  ]
}
