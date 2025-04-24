module.exports = {
  desktop: ['arm_accImport', 'arm_accStaff', 'arm_accHR', 'arm_accTim', 'arm_accHREmp', 'arm_accHREmpAdd',
    'arm_accCfg', 'arm_accHRCarier', 'arm_accSec', 'arm_accDoc', 'arm_accFSSU', 'arm_accVacation', 'arm_accDst',
    'arm_accTariffing', 'arm_accStipend'],
  enumPrefix: ['HR_', 'TRF_'],
  role: [
    'acc_admData', // Адміністратор Системи
    'acc_adminEmpWorkbook',
    'acc_admPortal',
    'acc_admSecurity', // Адміністратор безпеки
    'acc_allowInformation', // Надання інформації по особі
    'acc_approvDocs',
    'acc_approvSHR',
    'acc_approvSHRExternal',
    'acc_cancelOrder',
    'acc_checkingPosCompetition',
    'acc_editorCardOrg',
    'acc_editorDashboard',
    'acc_editorDictionaryATU', // Адміністратор довідників АТУ,
    'acc_editorDictionaryEmp', // Адміністратор довідників персоналу
    'acc_editorDictionaryEmpOrder', // Адміністратор довідників наказів з персоналу
    'acc_editorDictionaryOrg', // Адміністратор довідників оргструктури та штатного розпису
    'acc_editorDocAttachment', // Редактор додатків до документів
    'acc_editorEmployee',
    'acc_editorEmployeeList',
    'acc_editorEmployeeNumber', // Редактор Електронної картки Працівника
    'acc_editorMyOrderPerson',
    'acc_editorOrdAppointLiq', // Фахівець з внесення призначень на ліквідовані посади
    'acc_editorOrderCompetitionAll',
    'acc_editorOrderPerson',
    'acc_labelOrderPerson',
    'acc_editorOrderPersonBudget',
    'acc_editorOrderPersonDict',
    'acc_editorOrderStructure',
    'acc_editorOrderTable',
    'acc_editorOrderVacation', // Редактор наказів про надання відпусток
    'acc_editorOrganization',
    'acc_editorPlanVacation', // Редактор річного графіка відпусток
    'acc_editorRespEmployee', // Відповідальні особи організації
    'acc_editorStructure',
    'acc_editorTable',
    'acc_editorTimeCostChange',
    'acc_editorTimeSheet',
    'acc_editorUnusedVacation',
    'acc_editorWorkSchedule',
    'acc_fssu', // Облік документів СС
    'acc_fssuReview', // Переглядач документів СС
    'acc_hr',
    'acc_hrOrgEditor',
    'acc_MainCalcExperience', // Фахівець з внесення стажів персон
    'acc_mainCareer',
    'acc_MainDataMigrationHR', // Фахівець організації з міграції даних персоналу
    'acc_mainFOP',
    'acc_mainHRMIS', // Уповноважений HRMIS по Організації
    'acc_mainOrgAdmin', // Відповідальний за налаштування організації
    'acc_mainPrintPerson',
    'acc_mainReportList',
    'acc_mainReportOrderPerson',
    'acc_mainReportPerson',
    'acc_mainReportStructure',
    'acc_positionEditor', // Можливість редагування посад
    'acc_procPrivateOffice',
    'acc_recalcCases', // Перерахунок відмінків підрозділів
    'acc_reconcOrderPerson',
    'acc_requestInformation', // Запит інформації по особі
    'acc_reviewCalendar',
    'acc_reviewDashboard',
    'acc_reviewDictionaryEmp', // Переглядач довідників персоналу
    'acc_reviewDictionaryEmpOrder', // Переглядач довідників наказів з персоналу
    'acc_reviewDictionaryOrg', // Переглядач довідників оргструктури та штатного розпису
    'acc_reviewDocAttachment', // Перегляд додатків до документів
    'acc_reviewEmployee',
    'acc_reviewEmployeeList',
    'acc_reviewEmployeeNumber', // Переглядач Електронної картки Працівника
    'acc_reviewOrderPerson',
    'acc_reviewOrderPersonCart', // Переглядач карток наказів з персоналу
    'acc_reviewOrderStructure',
    'acc_reviewOrderTable',
    'acc_reviewOrderVacation', // Переглядач наказів про надання відпусток
    'acc_reviewOrganization',
    'acc_reviewPageSalary', // Переглядач Електронної картки Працівника - ЗП
    'acc_reviewPlanVacation', // Переглядач річного графіка відпусток
    'acc_reviewPositionSchedulerLog', // Перегляд журналу змін тимчасових призначень
    'acc_reviewStructure',
    'acc_reviewTable',
    'acc_reviewTimeSheet', // Переглядач табелів
    'acc_reviewTimeSheetChange', // Переглядач індівідуального розкладу роботи працівників організації
    'acc_reviewTimeSheetChangeDep', // Переглядач індівідуального розкладу роботи працівників підрозділу
    'acc_reviewTimeSheetChangeFirstDep', // Переглядач індівідуального розкладу роботи працівників структурного підрозділу
    'acc_reviewTimeSheetCost', // Переглядач налаштування правил для табеля
    'acc_reviewTimeSheetDep', // Переглядач табеля підрозділу
    'acc_reviewTimeSheetFirstDep', // Переглядач табеля структурного підрозділу
    'acc_reviewTimeSheetOrderChange', // Коригувач неявок табеля
    'acc_reviewTimeSheetRecordChange', // Коригувач табеля
    'acc_reviewTimeSheetSchedule', // Переглядач налаштування графіків роботи організації
    'acc_reviewUniDocChange', // Коригувач універсального документу
    'acc_reviewUnusedVacation',
    'acc_reviewWorkSchedule',
    'acc_searchEmpFull', // Пошук працівників повний
    'acc_searchEmpLimit', // Пошук працівників обмежений
    'acc_searchEmployeeList',
    'acc_timesheet', // Табельний облік
    'acc_timeSheetChange', // Фахівець з контролю індівідуального розкладу роботи працівників організації
    'acc_timeSheetChangeDep', // Фахівець з контролю індівідуального розкладу роботи працівників підрозділу
    'acc_timeSheetChangeFirstDep', // Фахівець з контролю індівідуального розкладу роботи працівників структурного підрозділу
    'acc_timeSheetCost', // Фахівець з налаштування правил для табеля
    'acc_timeSheetDep', // Фахівець з ведення табеля підрозділу
    'acc_timeSheetFirstDep', // Фахівець з ведення табеля структурного підрозділу
    'acc_timeSheetSchedule', // Фахівець з налаштування графіків роботи організації
    'acc_editorDictPersonCard', // Редактор довідників картки працівника'
    'acc_editorDictPosition', // Редактор довідника посад
    'acc_vacation', // Планування відпусток
    'acc_workbookEditor', // Можливість редагування трудової діяльності
    'acc_MainOrderBonus', // Відповідальний за преміювання персоналу
    'acc_MainOrdSubordinate', // Фахівець з внесення наказів підлеглих організацій
    'acc_editorFactVacation', // Ручне редагування використаних днів в праві на відпустку
    'acc_FSSUDictionary', // Фахівець з ведення довідників та налаштувань для ведення документів СС
    'acc_FSSUDictionaryReview', // Переглядач довідників та налаштувань для ведення документів СС
    'acc_expertsPersTellingSV', // Фахівець обліку персоналу (супервізор)
    'acc_payrollNumberAllEdit', // 'Фахівець з масової зміна значень в особових рахунках заробітної плати'
    'acc_editorOrderAttachment', // Редактор додатків наказів
    'acc_tarification',
    'acc_positionJoinFundSource', // Можливість об'єднання джерел фінансування посад
    'acc_editorOnlyVacation', // Редактор наказів про відпустки
    'acc_editorOnlyMission',
    'acc_editorDocAgreement', // Редагування документу під час погодження
    'acc_mainEconomicWork', // Відповідальний за накази з планово-економічної роботи
    'acc_payrollDictionaryUser', // Перегляд довідників заробітної плати
    'acc_tarificationDictionary', // Користувач довідників тарифікації
    'acc_editorStud', // Відповідальний за ведення студентів
    'acc_checkMedicalInput', // Відповідальний за внесення результатів медогляду
    'acc_notShowSalary', // Відсутність прав перегляду окладів
    'acc_reviewTimeSheetScheduleChange', // Переформування табеля у закритих періодах,
    'acc_nsReport', // Звіт 1-НС
    'acc_editorEmployeeGroup', // Ведення груп працівників
    'acc_recrutingManagement', // Відповідальний за рекрутинг
    'acc_editorMyReports',
    'acc_editorStructs', // Дозвіл на пряме редагування штатної книги
    'acc_editorTariffList',
    'acc_reviewRequestInCab',
    'acc_editorMilitaryRecord', // Внесення даних по військовому обліку
    'acc_editorTransportHR',
    'acc_massProcessingMyTask', // Групова обробка завдань
    'acc_editorReminderOfWorkExperience', // Редагування щомісячного нагадування про стажі
    'acc_editorMilitaryRecordEXP', // Розширення для ведення війсьокового обліку
    'acc_timeSheetPlanChange'
  ],
  group: [
    'group_admData',
    'group_adminEmpWorkbook',
    'group_admPortal',
    'group_admSecuritys',
    'group_allowInformation',
    'group_approvSHR',
    'group_approvSHRExternal',
    'group_bosses',
    'group_cabinetUsers',
    'group_calcExperience',
    'group_checkingPosCompetition',
    'group_chiefInStaffing',
    'group_chiefPersTelling',
    'group_dictATU',
    'group_editorCardOrg',
    'group_editorOrdAppointLiq',
    'group_editorOrderPersonBudget',
    'group_editorTimeCostChange',
    'group_expertsInStaffing',
    'group_expertsPersTelling',
    'group_fssu',
    'group_mainCareer',
    'group_MainDataMigrationHR',
    'group_mainHRMIS',
    'group_mainOrgAdmin',
    'group_makingDictionary',
    'group_makingOrganization',
    'group_orderCompetition',
    'group_personsCheckingOrder',
    'group_procPrivateOffice',
    'group_requestInformation',
    'group_reviewersPerson',
    'group_reviewPageSalary',
    'group_timeSheet',
    'group_timeSheetAdm',
    'group_timeSheetDep',
    'group_timeSheetFirstDep',
    'group_timeSheetSchedule',
    'group_MainOrdSubordinate',
    'group_editorDictPosition',
    'group_editorFactVacation',
    'group_fssuDictionary',
    'group_expertsPersTellingSV',
    'group_payrollNumberAllEdit',
    'group_statOrgAllRoll',
    'group_tarification',
    'group_editorOnlyVacation',
    'group_editorOnlyMission',
    'group_editorDocAgreement',
    'group_mainEconomicWork',
    'group_MainEditorStructure',
    'group_reviewStructure',
    'group_editorStud',
    'group_checkMedicalInput',
    'group_notShowSalary',
    'group_timeSheetScheduleChange',
    'group_nsReport',
    'group_recruter',
    'group_editorMilitaryRecord',
    'group_timeSheetPlanChange',
    'group_editorMilitaryRecordEXP'
  ],
  methodName: {
    select: 'Перегляд',
    addnew: 'Новий запис',
    insert: 'Вставити',
    update: 'Редагування',
    delete: 'Вилучення',
    doPosting: 'Провести',
    doCancelPosting: 'Відмінити проведення',
    viewPosting: 'Результат проведення',
    viewPrintForm: 'Друкувати'
  }
}
