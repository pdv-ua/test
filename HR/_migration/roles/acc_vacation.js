module.exports = [
  {
    name: 'acc_vacation',
    description: 'Планування відпусток',
    description_uk: 'Планування відпусток',
    description_ru: 'Планирование отпусков',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accOperation', 'arm_accVacation'],
    shortcutCodes: [
      'hr_empListUnusedVacation',
      'hr_empListNotplannedVacation',
      'accVacation_VacationScheduleList',
      'hr_empVacationScheduleList',
      'accVacation_VacationApSched',
      'hr_empOrderVacationApSchedA',
      'accVacation_VacationScheduleListYear',
      'hr_empVacationScheduleListYear',
      'accVacation_VacationScheduleReport',
      'hr_empOrderVacationapschedAdd',
      'hr_reportVacationExtract'
    ],
    elsRule: [
      { description: 'Невикористані відпустки', entityMask: 'hr_empListUnusedVacation', methodMask: ['*'] },
      { description: 'Незаплановані відпустки', entityMask: 'hr_empListNotplannedVacation', methodMask: ['*'] },
      { description: 'Графік відпусток', entityMask: 'hr_vacationSchedule', methodMask: ['*'] },
      { description: 'Наказ про затвердження графіку відпусток', entityMask: 'hr_empOrderVacationapschedDet', methodMask: ['*'] },
      { description: 'Види відпусток', entityMask: 'hr_dictVacationKind', methodMask: ['*'] },
      { description: 'Перераховані значення', entityMask: 'ubm_enum', methodMask: ['*'] },
      { description: 'hr_employee', entityMask: 'hr_employee', methodMask: ['view'] }, // Для контекстного меню "відкрити картку працівника"
      { description: 'Графік відпусток. Виконуючий обов\'язки', entityMask: 'hr_vacationScheduleActing', methodMask: ['*'] },
      { description: 'hr_empOrderVacationDet', entityMask: 'hr_empOrderVacationDet', methodMask: ['createOrder'] },
      { description: 'hr_empVacationPlan', entityMask: 'hr_empVacationPlan', methodMask: ['*'] },
      { description: 'hr_acquaintanceList', entityMask: 'hr_acquaintanceList', methodMask: ['*'] }
    ]
  }
]
