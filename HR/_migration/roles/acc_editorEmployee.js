module.exports = [
  {
    name: 'acc_editorEmployee',
    description: 'Редактор Електронної картки Особи',
    description_uk: 'Редактор Електронної картки Особи',
    description_ru: 'Редактор Электронной карточки Лица',
    description_az: 'Şəxsin elektron kartının redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql,loadImportEmployeeData',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employee',
      'hr_employee'
    ],
    elsRule: [
      {
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'view', 'docPrintForm', 'repPrintForm']
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
        description: 'Родичі',
        entityMask: 'hr_people',
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
        description: 'Дні відпустки за видами відпустки',
        entityMask: 'hr_dictVacationPlanDay',
        methodMask: ['select', 'getDayCount']
      },
      {
        description: 'Відпустки які нараховуються працівнику',
        entityMask: 'hr_empVacationPlan',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'selectAvailableVacationDays', 'selectData',
          'getAvailableVacationDays', 'getAvailableVacationDaysSql', 'getVacPeriodDays', 'getMainPartIsUsed', 'addDefaultVacationPlan',
          'getData', 'getVacPlanDays', 'autoAddPeriods', 'getVacFactDays', 'checkVacKindExists',
          'getDataReq'
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
        description: 'Профіль особи з порталу вакансій',
        entityMask: 'hr_employeeInfoPortalVac',
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
        description: 'hr_empWorkShdChange',
        entityMask: 'hr_empWorkShdChange',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спеціальність',
        entityMask: 'hr_specialty',
        methodMask: ['select', 'addnew', 'insert']
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
        description: 'Додаткові гарантії працевлаштування',
        entityMask: 'hr_empAddGuarantees',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військові звання',
        entityMask: 'hr_empMilitaryRanks',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
