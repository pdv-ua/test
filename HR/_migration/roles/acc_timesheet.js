const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_timesheet',
  description: 'Фахівець з ведення табеля організації',
  description_uk: 'Фахівець з ведення табеля організації',
  description_ru: 'Специалист по ведению табеля организации',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'loadData', 'fillData', 'updateData',
    'removeCorrect', 'getEmployeePositionTM', 'getEmployeePositionTMHRMIS', 'canceledOrderDay', 'removeCanceled', 'fillSignersByDefault', 'updateSignersPos',
    'editPastPeriod']
  Array.of('doPosting', 'doCancelPosting', 'runTableReport', 'getTempExecution', 'canViewAllDep')
    .forEach((e, i) => methodSet[i + 50] = e)
  Array.of('*')
    .forEach((e, i) => methodSet[i + 100] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['tim_timeSheet', 'accTim_timeSheet',
      ['0-49', 'Табель'],
      ['0', 'Розрахунковий період', 'hr_dictPeriod'],
      ['0', 'Посада', 'hr_position'],
      ['0', 'Підписи по документу', 'hr_empOrderSignature'],
      ['0,53', 'Призначення працівника', 'hr_employeePositionS'],
      ['0', 'Доступні типи дочірніх пунктів наказу', 'hr_dictOrderRef'],
      ['0', 'Наказ з персоналу. Всі деталі', 'hr_empOrderDet'],
      ['0', 'Працівники', 'hr_employeeNumber'],
      ['0-4', 'Додатки до наказів', 'hr_orderAttachment'],
      ['0-4,100', 'Підписанти', 'hr_dictSheetSigner']
    ],
    ['hr_empOrderUni', 'accTim_empOrderUni', ['0-4,50-51,54', 'Універсальний документ']],
    ['', ['52', 'Звіти TIM', 'tim_report']]
  ]
}
