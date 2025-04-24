const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorUnusedVacation',
    description: 'Фахівець з обліку невикористаних відпусток',
    description_uk: 'Фахівець з обліку невикористаних відпусток',
    description_ru: 'Специалист по учету неиспользованных отпусков',
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
        methodMask: [...crud, 'search']
      },
      {
        description: 'Незаплановані відпустки',
        entityMask: 'hr_empListNotplannedVacation',
        methodMask: ['search']
      }
    ]
  }
]
