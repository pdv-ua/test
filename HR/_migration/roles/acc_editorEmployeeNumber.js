module.exports = [
  {
    name: 'acc_editorEmployeeNumber',
    description: 'Редактор Електронної картки Працівника',
    description_uk: 'Редактор Електронної картки Працівника',
    description_ru: 'Редактор Электронной карточки Работника',
    description_az: 'İşçinin elektron kartını tərtib edən',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employeeTabList',
      'hr_employeeTabList',
      'accHREmp_employeeTabListCurrent',
      'accHREmp_employeePositionList',
      'hr_employeeTabListCurrent',
      'hr_employeePositionList',
      'accHREmp_employeeTabListNoStaff'
    ],
    elsRule: [
      {
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'view', 'docPrintForm', 'repPrintForm']
      },
      {
        description: 'Особи',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select', 'update', 'delete', 'view', 'getNextTabNum', 'checkParams', 'restoreRecord', 'updateAddPersonDescription']
      },
      {
        description: 'hr_employeeNumberS',
        entityMask: 'hr_employeeNumberS',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employeeNumberSR',
        entityMask: 'hr_employeeNumberSR',
        methodMask: [ 'select' ]
      },
      {
        description: 'Адреси',
        entityMask: 'ac_address',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контакти',
        entityMask: 'hr_employeeContact',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Члени сім\'ї',
        entityMask: 'hr_employeeFamily',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Документи',
        entityMask: 'hr_employeeDocs',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Пільги',
        entityMask: 'hr_employeeBenefits',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Нагороди',
        entityMask: 'hr_employeeBonus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стягнення',
        entityMask: 'hr_employeePenalty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військовий облік',
        entityMask: 'hr_empStateMilitary',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Інвалідність',
        entityMask: 'hr_employeeDisability',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Трудова книжка',
        entityMask: 'hr_employeeWorkbook',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'autoFillExperience', 'getPositionFullName']
      },
      {
        description: 'Стаж',
        entityMask: 'hr_employeeExperience',
        methodMask: ['select', 'getTotalExperience']
      },
      {
        description: 'Ранг держслужбовця',
        entityMask: 'hr_publServRang',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Освіта',
        entityMask: 'hr_employeeEducation',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Патенти та публікації',
        entityMask: 'hr_employeeSuccess',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Володіння мовами',
        entityMask: 'hr_employeeLanguage',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Науковий ступінь',
        entityMask: 'hr_empRangeScience',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вчене звання',
        entityMask: 'hr_empAcademStatus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підвищення кваліфікації',
        entityMask: 'hr_empCertificatnUp',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeAudit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'docPrintForm']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAuditDt',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAudit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'docPrintForm']
      },
      {
        description: 'Додаткова інформація',
        entityMask: 'hr_empAddInform',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Постійні утримання',
        entityMask: 'hr_payRetention',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Блокування розрахунку',
        entityMask: 'hr_payPermDisable',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Постійні нарахування',
        entityMask: 'hr_employeeAccrualEdit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Постійні нарахування',
        entityMask: 'hr_employeeAccrual',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Постійні утримання',
        entityMask: 'hr_payRetentionEdit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Виплата зарплати',
        entityMask: 'hr_payOut',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Дні відпустки за видами відпустки',
        entityMask: 'hr_dictVacationPlanDay',
        methodMask: ['select', 'getDayCount']
      },
      {
        description: 'Відпустки які нараховуються працівнику',
        entityMask: 'hr_empVacationPlan',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'selectAvailableVacationDays', 'selectData',
          'getAvailableVacationDays', 'getAvailableVacationDaysSql', 'getVacPeriodDays', 'getMainPartIsUsed', 'addDefaultVacationPlan',
          'getData', 'getVacPlanDays', 'autoAddPeriods', 'getVacFactDays', 'getDataReq'
        ]
      },
      {
        description: 'Період відпустки працівника',
        entityMask: 'hr_empVacationPeriod',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'selectData', 'getData', 'canEditVacFact', 'calcFields']
      },
      {
        description: 'Задачі оцінювання',
        entityMask: 'hr_empAssessmentTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'calcAvgValue']
      },
      {
        description: 'Задачі оцінювання',
        entityMask: 'hr_empAssessment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Задачі оцінювання значення',
        entityMask: 'hr_empAssessmentTaskValue',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'service entity',
        entityMask: 'hr_rl',
        methodMask: ['viewPrintForm', 'getRL']
      },
      {
        description: 'Документи до пільг',
        entityMask: 'hr_employeeBenefitsDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Родичі',
        entityMask: 'hr_people',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Змінені облікові дані спвробітника',
        entityMask: 'hr_employeeChange',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додаткові дані за організацією',
        entityMask: 'hr_employeeOrgInfo',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Форми допуску до інформації',
        entityMask: 'hr_employeeAccessInfo',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Організації спецперевірок',
        entityMask: 'hr_dictAuditOrg',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контрагент',
        entityMask: 'ac_contractor',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_employeeNumberInfo',
        entityMask: 'hr_employeeNumberInfo',
        methodMask: ['getData']
      },
      {
        description: 'hr_empCertificationAcc',
        entityMask: 'hr_empCertificationAcc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictBonus',
        entityMask: 'hr_dictBonus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empTarifCategory',
        entityMask: 'hr_empTarifCategory',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Призов на військову службу',
        entityMask: 'hr_empConscription',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контракт',
        entityMask: 'hr_empMilitaryContract',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Випробувальний термін',
        entityMask: 'hr_employeeTrialPeriod',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додаткові гарантії працевлаштування',
        entityMask: 'hr_empAddGuarantees',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Транспортні засоби працівника',
        entityMask: 'hr_employeeVehicle',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'viewEmployeeVehicle']
      },
      {
        description: 'Моделі транспортних засобів',
        entityMask: 'trans_model',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm']
      },
      {
        description: 'Транспортні засоби',
        entityMask: 'trans_vehicle',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm']
      },
      {
        description: 'hr_employeeAssets',
        entityMask: 'hr_employeeAssets',
        methodMask: ['*']
      },
      {
        description: 'Майно організації',
        entityMask: 'hr_Assets',
        methodMask: ['select']
      }
    ]
  }
]
