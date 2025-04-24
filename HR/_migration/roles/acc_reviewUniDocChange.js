const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewUniDocChange',
  description: 'Коригувач універсального документу',
  description_uk: 'Коригувач універсального документу',
  description_ru: 'Корректировщик универсального документа',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'doCancelPosting',
    'editPastPeriod']
  Array.of('runTableReport', 'canViewAllDep')
    .forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return ['hr_empOrderUni', 'accTim_empOrderUni',
    ['0-7,51', 'Універсальний документ'],
    ['50', 'Звіти TIM', 'tim_report']
  ]
}
