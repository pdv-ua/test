module.exports = [
  {
    name: 'acc_reviewUnusedVacation',
    description: 'Переглядач даних щодо невикористаних відпусток',
    description_uk: 'Переглядач даних щодо невикористаних відпусток',
    description_ru: 'Просмотрщик данных по неиспользованных отпусков',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accVacation'],
    shortcutCodes: [
      'accVacation_VacationScheduleReport',
      'hr_empListUnusedVacation',
      'hr_empListNotplannedVacation'
    ],
    elsRule: [
      {
        description: 'Невикористані відпустки',
        entityMask: 'hr_empListUnusedVacation',
        methodMask: ['search']
      },
      {
        description: 'Незаплановані відпустки',
        entityMask: 'hr_empListNotplannedVacation',
        methodMask: ['search']
      }
    ]
  }
]
