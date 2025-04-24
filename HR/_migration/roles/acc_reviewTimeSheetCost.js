const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_reviewTimeSheetCost',
  description: 'Переглядач налаштування правил для табеля',
  description_uk: 'Переглядач налаштування правил для табеля',
  description_ru: 'Просмотрщик настройки правил для табеля',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'runTableReport', 'loadData']
  return methodSet
}

function getRoleDef () {
  return [
    {
      accTimSettings: [
        ['hr_dictTimeCost', 'accTim_timeCost', ['0', 'Елементи обліку робочого часу']],
        ['hr_dictTimePrint', 'accTim_timePrint', ['0', 'Відображення неявок у підсумках табеля']],
        ['hr_dictTimeCostInt', 'accTim_dictTimeCostInt', ['0', 'Можливий перетин елементів обліку']],
        ['tim_timeSheetPrintSettings', 'accTim_timeSheetPrintSettings', ['0,2', 'Налаштування друкованої форми табеля']],
        ['hr_dictTimeForm', 'accTim_dictTimeForm', ['0', 'Налаштування форми коригування табеля']]
      ]
    },
    ['', ['1', 'Звіти TIM', 'tim_report']]
  ]
}
