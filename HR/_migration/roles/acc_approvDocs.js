const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_approvDocs',
  description: 'Погоджувач документів',
  description_uk: 'Погоджувач документів',
  description_ru: 'Согласователь документов',
  description_az: 'Sənəd koordinatoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accDoc'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'setResolution', 'getTempExecution', 'repPrintForm', // 7
    'startReconciliation', 'stopReconciliation', 'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation', // 12
    'canVisibleStopReconciliation', 'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation', 'exchangeReview', 'sendReview', 'addStampData', 'getDocumentWithStampData', 'updateEmpOrdListAppruvList', 'insertEmpOrdListAppruvList' // 21
  ]
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['hr_taskMyCompleteAllEntities', 'accDocMyTaskCompleteAllEntities'],
    ['hr_taskMyAllEntities', 'accDocMyTaskAllEntities'],
    ['',
      ['0-4', 'Підписи по документу', 'hr_empOrderSignature'],
      ['0,3,5', 'Мої завдання', 'hr_task'],
      ['6', 'Призначення працівника', 'hr_employeePositionS'],
      ['7,16,17,18,19', 'Наказ з персоналу', 'hr_empOrder'],
      ['8-11', 'Этап согласования', 'hr_recstage'],
      ['0-4,20-21', 'Лист погодження', 'hr_empOrdListAppruv']
    ]
  ]
}
