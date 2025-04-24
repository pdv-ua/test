module.exports = [
  {
    name: 'acc_reviewCalendar',
    description: 'Переглядач календаря',
    description_uk: 'Переглядач календаря',
    description_ru: 'Просмотрщик календаря',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'accTimSettings',
      'accTim_calendar',
      'tim_calendar'
    ],
    elsRule: []
  }
]
