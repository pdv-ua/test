const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [
  {
    name: 'acc_reviewOrderPersonCart',
    description: 'Переглядач карток наказів з персоналу',
    description_uk: 'Переглядач карток наказів з персоналу',
    description_ru: 'Просмотрщик карт приказов по персоналу',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
    elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
  }
]

function getMethodSet () {
  let methodSet = ['getDescriptionExt', 'viewPrintForm', 'docPrintForm', 'getCalendDays', 'getMainPartIsUsed', 'groupSelect', // 5
    'selectData', 'addRecalcDays', 'clearRecalcDays', 'clear', 'viewOrderForm', 'userIsMemberOf', 'getTempExecution', 'getRecalcDays', // 13
    'exchangeReview', 'sendReview' // 15
  ]
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return ['',
    ['1,10', 'Табель', 'tim_timeSheet'],
    ['0', 'Наказ з персоналу про звільнення. Деталь', 'hr_empOrderDismDet'],
    ['5,7,8,9,13', 'Наказ з персоналу про звільнення. Компенсація відпусток', 'hr_empOrderDismVac'],
    ['2,3,14,15', 'hr_empOrder', 'hr_empOrder'],
    ['4', 'Відпустки, які нараховуються працівнику', 'hr_empVacationPlan'],
    ['13', 'Призначення працівника', 'hr_employeePositionS']
  ]
}
