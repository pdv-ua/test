const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorPlanVacation',
  description: 'Фахівець з планування відпусток',
  description_uk: 'Фахівець з планування відпусток',
  description_ru: 'Специалист по планированию отпусков',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accVacation'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'search', '*', 'getDaycount', 'createOrder', 'addList', 'checkDayCount',
    'checkVacationCrossPeriod', 'checkContiniousVacation', 'checkYearDays', 'checkDChildDayCount']
  Array.of('selectAvailableVacationDays', 'getAvailableVacationDays', 'getAvailableVacationDaysSql', 'getVacPeriodDays', 'getMainPartIsUsed', // 44
    'addDefaultVacationPlan', 'getData', 'selectData', 'getVacPlanDays', 'autoAddPeriods', 'getVacFactDays', 'getVacPlanDateFrom', // 51
    'clearVacationPlan', 'getDataReq', 'canEditVacFact', 'calcFields', 'checkVacWithBounty')
    .forEach((e, i) => { methodSet[i + 40] = e })
  Array.of('getWorkDays', 'getWorkDays4Vac', 'saveReportSettings', 'fillOrderAccrual', 'setDateAndNumber', 'docPrintForm', 'repPrintForm',
    'isWorkDay', 'fillOrderExperience', 'clearOrder*', 'fillOrderAccrualWithSave', 'exchangeReview', 'sendReview')
    .forEach((e, i) => { methodSet[i + 70] = e })
  // Array.of().forEach((e, i) => methodSet[i + 100] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['hr_empVacationScheduleList', 'accVacation_VacationScheduleList'],
    ['hr_empVacationScheduleListYear', 'accVacation_VacationScheduleListYear'],
    ['hr_empOrderVacationApSchedA', 'accVacation_VacationApSched',
      ['0-4,70-99', 'Наказ з персоналу', 'hr_empOrder'],
      ['0-4,8-9', 'Наказ про затвердження графіку відпусток', 'hr_empOrderVacationapschedDet']
    ],
    ['accVacation_VacationScheduleReport', 'hr_empOrderVacationapschedAdd', 'hr_reportVacationExtract', 'hr_empListUnusedVacation', 'hr_empListNotplannedVacation'], // Reports
    ['',
      ['0', 'Табельний номер', 'hr_employeeNumber'],
      ['6', 'Індекс номеру наказу', 'hr_dictEmpOrderIndex'],
      ['7', 'Відпустка працівника', 'hr_employeeVacation'],
      ['0-4,46,47,54,55', 'Періоди відпустки працівника', 'hr_empVacationPeriod'],
      ['0-4,10-14,56', 'Заплановані відпустки', 'hr_vacationSchedule'],
      ['0-4,40-44,46-50,53', 'Відпустки, які нараховуються працівнику', 'hr_empVacationPlan'],
      ['0-4', 'Лист розсилки', 'hr_mailingLetter'],
      ['0-4', 'Шаблон листа розсилки', 'hr_mailingLetterTemplate'],
      ['0-4,10', 'Шаблон листа розсилки. Учасники', 'hr_mailingLetterTemplateDet'],
      ['0-4', 'Лист підписантів', 'hr_empOrderSignDet'],
      ['0-4', 'Шаблон листа підписантів', 'hr_empOrderSignTemplate'],
      ['0-4,10', 'Шаблон листа підписантів. Учасники', 'hr_empOrderSignTemplateDet'],
      ['0-4', 'Лист погодження', 'hr_empOrdListAppruv'],
      ['0-4', 'Шаблон листа погодження', 'hr_empOrdListAppruvTemplate'],
      ['0-4', 'Шаблон листа погодження. Учасники', 'hr_empOrdListAppruvTemplateDt'],
      ['0-4', 'Шаблон листа ознайомлення', 'hr_empOrderAcquaintListTpl'],
      ['0-4', 'Шаблон листа ознайомлення. Учасники', 'hr_empOrderAcquaintListTplDet'],
      ['0-4', 'Події ознайомлення', 'hr_dictEventKnowledg']
    ]
  ]
}
