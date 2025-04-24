const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_timeSheetDep',
  description: 'Фахівець з ведення табеля підрозділу',
  description_uk: 'Фахівець з ведення табеля підрозділу',
  description_ru: 'Специалист по ведению табеля подразделения',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'loadData', 'fillData', 'updateData',
    'removeCorrect', 'getEmployeePositionTM', 'getEmployeePositionTMHRMIS', 'canceledOrderDay', 'removeCanceled', 'editPastPeriod', 'fillSignersByDefault']
  Array.of('doPosting', 'doCancelPosting', 'runTableReport', 'canViewOneDep')
    .forEach((e, i) => methodSet[i + 50] = e)
  Array.of('*', 'fillSignersByDefault', 'updateSignersPos')
    .forEach((e, i) => methodSet[i + 100] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['tim_timeSheet', 'accTim_timeSheet', ['0-49,101-102', 'Табель'],
      ['0-4,100', 'Підписанти', 'hr_dictSheetSigner']],
    ['hr_empOrderUni', 'accTim_empOrderUni', ['0-4,50-51,53', 'Універсальний документ']],
    ['', ['52', 'Звіти TIM', 'tim_report']]
  ]
}
