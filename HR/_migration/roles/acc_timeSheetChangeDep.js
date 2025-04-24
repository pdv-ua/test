module.exports = [{
  name: 'acc_timeSheetChangeDep',
  description: 'Фахівець з контролю індівідуального розкладу роботи працівників підрозділу',
  description_uk: 'Фахівець з контролю індівідуального розкладу роботи працівників підрозділу',
  description_ru: 'Специалист по контролю индивидуального расписания работы сотрудников подразделения',
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
      methodMask: ['select', 'update']
    },
    {
      description: 'Звіти TIM',
      entityMask: 'tim_report',
      methodMask: ['runTableReport']
    }
  ]
}]
