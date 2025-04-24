const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_timeSheetCost',
  description: 'Фахівець з налаштування правил для табеля',
  description_uk: 'Фахівець з налаштування правил для табеля',
  description_ru: 'Специалист по настройке правил для табеля',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'runTableReport', 'loadData', 'saveData', 'copyRecord']
  return methodSet
}

function getRoleDef () {
  return [
    { accTimSettings: [
      ['hr_dictTimeCost', 'accTim_timeCost', ['0-4,8', 'Елементи обліку робочого часу']],
      ['hr_dictTimePrint', 'accTim_timePrint', ['0-4', 'Відображення неявок у підсумках табеля']],
      ['hr_dictTimeCostInt', 'accTim_dictTimeCostInt', ['0-4', 'Можливий перетин елементів обліку']],
      ['tim_timeSheetPrintSettings', 'accTim_timeSheetPrintSettings', ['0-4,6,7', 'Налаштування друкованої форми табеля']],
      ['hr_dictTimeForm', 'accTim_dictTimeForm', ['0-4', 'Налаштування форми коригування табеля']]
    ] },
    ['', ['5', 'Звіти TIM', 'tim_report']]
  ]
}
