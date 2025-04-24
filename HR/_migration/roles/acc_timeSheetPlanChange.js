const crud = ['select', 'addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_timeSheetPlanChange',
    description: 'Коригувач плану в табелі',
    description_uk: 'Коригувач плану в табелі',
    description_ru: 'Коригувач плану в табелі',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'accTim_timeSheet',
      'tim_timeSheet'
    ],
    elsRule: [
      {
        description: 'Графік',
        entityMask: 'hr_workSchedule',
        methodMask: ['select']
      },
      {
        description: 'Табель',
        entityMask: 'tim_timeSheet',
        methodMask: [...crud, 'loadData', 'allowEditPlanHour']
      }
    ]
  }
]
