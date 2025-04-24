const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_MainDataMigrationHR',
  description: 'Фахівець організації з міграції даних персоналу',
  description_uk: 'Фахівець організації з міграції даних персоналу',
  description_ru: 'Специалист организации по миграции данных персонала',
  description_az: 'Kadr məlumatlarının miqrasiyasının təşkili üzrə mütəxəssis',
  sessionTimeout: 30,
  allowedAppMethods: 'getDomainInfo,ubql,getDocument,logout,setDocument,changePassword,loadImportDataEx,loadImportData',
  desktopsCodes: ['arm_accImport', 'arm_accHR', 'arm_accStaff'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'doCancelPosting', 'checkTabNum', // 7
    'clearDetail', 'saveReportSettings', 'fillOrderAccrual', 'getWorkDays', 'getCalendDays4Vac', 'getWorkDays4Vac', // 13
    'getCalendDateTo4Vac', 'getWorkDateTo4Vac', 'setDateAndNumber', 'docPrintForm', 'repPrintForm', 'isWorkDay', // 19
    'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems', 'getYearMissionDays', 'getYearInfo', // 25
    'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems', 'checkYearMissionDays', 'getYearInfo',
    'getDescriptionExt', 'getActiveVacationList', 'cloneVacationList', 'recalcBounty', 'fillEmployee',
    'addPeriods',
    'createOrder', 'addList', 'checkContVacation', 'getValidatorWarning', 'updateOrderFieldLastChangeDate',
    'fillOrderExperience', 'clearOrder*', 'doPosting_*', 'canUpdateEmployeePosition',
    'canCreateEmployeePosition', 'updateBountyPayEl','getVacListIDs']
  Array.of('*', 'getVacancies', 'loadFromTemplate', 'getTempExecution', 'getOrderSignerInfo', 'startReconciliation', // 75
    'stopReconciliation', 'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation', // 80
    'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation', 'importSelect', 'fillOrderAccrualWithSave', 'getOrderSignerList', // 85
    'addEvaluationType' // 86
  ).forEach((e, i) => { methodSet[i + 70] = e })
  return methodSet
}

function getRoleDef () {
  return {
    accImportFolderHR: ['accImport_employee', 'accImport_employeePhoto', 'accImport_map', 'accImport_employeeAppChange',
      'accImport_staff', 'accImportDict',
      ['70', 'imp entities', 'imp_*'],
      ['0-4,70', 'imp entities', 'hr_importPlan'],
      ['70', 'Джерело імпорту', 'hr_import'],
      ['70', 'Сервіс AC', 'ac_service'],
      ['0, 3, 83', 'Особи', 'hr_employee'],
      ['70', 'Параметри', 'hr_importParams']

    ],
    accHRFolderOrdersOther: ['hr_empOrderChgPosition', 'accHRChangePosition',
      ['0-23,25-69,84', 'Наказ з персоналу', 'hr_empOrder*'],
      ['0', 'Організація', 'hr_organization'],
      ['71', 'Вакантні посади (конкурс)', 'hr_positionVacContest'],
      ['0,3,74,85', 'Призначення працівника', 'hr_employeePosition'],
      ['0,73', 'Призначення працівника', 'hr_employeePositionS'],
      ['0-4', 'Додатки до наказів', 'hr_orderAttachment'],
      ['0-4,86', 'Лист ознайомлення', 'hr_acquaintanceList'],
      ['0-4,75-82', 'Этап согласования', 'hr_recstage'],
      ['0-4', 'Участник согласования', 'hr_recparticipant'],
      ['0-4', 'Заголовок та преамбула', 'hr_dictEmpOrderText'],
      ['0-4', 'Завдання', 'hr_dictTask'],
      ['0-4,72', 'Шаблон узгодження', 'hr_recstageTemplate'],
      ['0-4', 'hr_dictEmpPosAttr', 'hr_dictEmpPosAttr']
    ],
    accStaffFolderOrder: ['hr_staffOrder', 'accStaff_staffOrder',
      ['0,3-6', 'Наказ про зміну штатного розпису']
    ],
    accImportFolderSA: [
      [
        'accImport_payImport',
        ['70', 'imp entities', 'hr_importMap'],
        'accImport_IntegrateMap',
        ['70', 'ac_integrateMap', 'ac_integrateMap']
      ]
    ]
  }
}
