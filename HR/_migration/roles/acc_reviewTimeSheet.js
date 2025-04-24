const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewTimeSheet',
  description: 'Переглядач табелів',
  description_uk: 'Переглядач табелів',
  description_ru: 'Просмотрщик табелей',
  description_az: 'Tabellərə baxış',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'viewPrintForm', 'loadData', 'runTableReport', 'canViewAllDep']
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
