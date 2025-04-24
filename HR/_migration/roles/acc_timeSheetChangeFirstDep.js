module.exports = [
  {
    name: 'acc_timeSheetChangeFirstDep',
    description: 'Фахівець з контролю індівідуального розкладу роботи працівників структурного підрозділу',
    description_uk: 'Фахівець з контролю індівідуального розкладу роботи працівників структурного підрозділу',
    description_ru: 'Специалист по контролю индивидуального расписания работы сотрудников структурного подразделения',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'hr_timeSheetChange',
      'accTim_timeSheetChange'
    ],
    elsRule: [
      {
        description: 'Скорочення робочого дня/тижня',
        entityMask: 'hr_timeSheetChange',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Звіти TIM',
        entityMask: 'tim_report',
        methodMask: ['runTableReport']
      }
    ]
  }
]
