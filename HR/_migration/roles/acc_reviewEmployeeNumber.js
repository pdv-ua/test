module.exports = [
  {
    name: 'acc_reviewEmployeeNumber',
    description: 'Переглядач Електронної картки Працівника',
    description_uk: 'Переглядач Електронної картки Працівника',
    description_ru: 'Просмотрщик Электронной карточки Работника',
    description_az: 'İşçinin elektron kartına baxış',
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
        methodMask: ['select', 'view', 'docPrintForm', 'repPrintForm']
      },
      {
        description: 'Адреси',
        entityMask: 'ac_address',
        methodMask: ['select']
      },
      {
        description: 'Контакти',
        entityMask: 'hr_employeeContact',
        methodMask: ['select']
      },
      {
        description: 'Члени сім\'ї',
        entityMask: 'hr_employeeFamily',
        methodMask: ['select']
      },
      {
        description: 'Документи',
        entityMask: 'hr_employeeDocs',
        methodMask: ['select']
      },
      {
        description: 'Пільги',
        entityMask: 'hr_employeeBenefits',
        methodMask: ['select']
      },
      {
        description: 'Нагороди',
        entityMask: 'hr_employeeBonus',
        methodMask: ['select']
      },
      {
        description: 'Стягнення',
        entityMask: 'hr_employeePenalty',
        methodMask: ['select']
      },
      {
        description: 'Військовий облік',
        entityMask: 'hr_empStateMilitary',
        methodMask: ['select']
      },
      {
        description: 'Інвалідність',
        entityMask: 'hr_employeeDisability',
        methodMask: ['select']
      },
      {
        description: 'Трудова книжка',
        entityMask: 'hr_employeeWorkbook',
        methodMask: ['select']
      },
      {
        description: 'Стаж',
        entityMask: 'hr_employeeExperience',
        methodMask: ['select', 'getTotalExperience']
      },
      {
        description: 'Ранг держслужбовця',
        entityMask: 'hr_publServRang',
        methodMask: ['select']
      },
      {
        description: 'Оцінювання',
        entityMask: 'hr_empAssessment',
        methodMask: ['select']
      },
      {
        description: 'Задачі оцінювання',
        entityMask: 'hr_empAssessmentTask',
        methodMask: ['select']
      },
      {
        description: 'Задачі оцінювання значення',
        entityMask: 'hr_empAssessmentTaskValue',
        methodMask: ['select']
      },
      {
        description: 'Освіта',
        entityMask: 'hr_employeeEducation',
        methodMask: ['select']
      },
      {
        description: 'Володіння мовами',
        entityMask: 'hr_employeeLanguage',
        methodMask: ['select']
      },
      {
        description: 'Науковий ступінь',
        entityMask: 'hr_empRangeScience',
        methodMask: ['select']
      },
      {
        description: 'Вчене звання',
        entityMask: 'hr_empAcademStatus',
        methodMask: ['select']
      },
      {
        description: 'Підвищення кваліфікації',
        entityMask: 'hr_empCertificatnUp',
        methodMask: ['select']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeAudit',
        methodMask: ['select', 'docPrintForm']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAuditDt',
        methodMask: ['select']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAudit',
        methodMask: ['select', 'docPrintForm']
      },
      {
        description: 'Додаткова інформація',
        entityMask: 'hr_empAddInform',
        methodMask: ['select']
      },
      {
        description: 'Право на відпустку',
        entityMask: 'hr_empVacationPlan',
        methodMask: ['select']
      },
      {
        description: 'Постійні нарахування',
        entityMask: 'hr_employeeAccrual',
        methodMask: ['select']
      },
      {
        description: 'Постійні утримання',
        entityMask: 'hr_payRetention',
        methodMask: ['select']
      },
      {
        description: 'Виплата зарплати',
        entityMask: 'hr_payOut',
        methodMask: ['select']
      },
      {
        description: 'Додаткові дані за організацією',
        entityMask: 'hr_employeeOrgInfo',
        methodMask: ['select']
      },
      {
        description: 'Форми допуску до інформації',
        entityMask: 'hr_employeeAccessInfo',
        methodMask: ['select']
      },
      {
        description: 'Транспортні засоби працівника',
        entityMask: 'hr_employeeVehicle',
        methodMask: ['viewEmployeeVehicle']
      },
      {
        description: 'Майно організації у працівника',
        entityMask: 'hr_employeeAssets',
        methodMask: ['viewEmployeeAssets']
      }                
    ]
  }
]
