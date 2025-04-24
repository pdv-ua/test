module.exports = [
  {
    name: 'acc_adminEmpWorkbook',
    description: 'Адміністратор даних трудової книжки',
    description_uk: 'Адміністратор даних трудової книжки',
    description_ru: 'Администратор данных трудовой книжки',
    description_az: 'Əməkdaşın əmək kitabçasının məlumatlarının administratoru',
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
      'accHREmp_employeeTabListNoStaff',
      'accImport_employeeAppChange'
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
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'accWorkbookEditAlways', 'autoFillExperience', 'getPositionFullName']
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
        description: 'Призначення працівника',
        entityMask: 'hr_employeePosition',
        methodMask: ['select', 'canDelete', 'update', 'canEditDateTo', 'canEditPos', 'updateFactPosition']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employeePositionSR',
        entityMask: 'hr_employeePositionSR',
        methodMask: [ 'select' ]
      },
      {
        description: 'Працівник',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select', 'addnew', 'insert', 'update', 'getNextTabNum', 'checkParams', 'updateAddPersonDescription']
      },
      {
        description: 'hr_employeeNumberS',
        entityMask: 'hr_employeeNumberS',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employeeNumberSR',
        entityMask: 'hr_employeeNumberSR',
        methodMask: ['select', 'addnew', 'insert', 'update', 'getNextTabNum', 'checkParams']
      },
      {
        description: 'Довготривала відсутність',
        entityMask: 'hr_empLongTermAbsc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Заміщення довготривалої відсутності',
        entityMask: 'hr_longTermReplace',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
