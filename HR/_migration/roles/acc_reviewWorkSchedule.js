module.exports = [
  {
    name: 'acc_reviewWorkSchedule',
    description: 'Переглядач графіків робочого часу',
    description_uk: 'Переглядач графіків робочого часу',
    description_ru: 'Просмотрщик графиков рабочего времени',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'accTimSettings',
      'accTim_workSchedule',
      'hr_workSchedule',
      'accTim_calendar',
      'tim_calendar',
      'accTim_timPlan',
      'tim_plan'
    ],
    elsRule: []
  }
]
