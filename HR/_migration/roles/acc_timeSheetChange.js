module.exports = [{
  name: 'acc_timeSheetChange',
  description: 'Фахівець з контролю індівідуального розкладу роботи працівників організації',
  description_uk: 'Фахівець з контролю індівідуального розкладу роботи працівників організації',
  description_ru: 'Специалист по контролю индивидуального расписания работы сотрудников организации',
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
      methodMask: [
        'select',
        'addnew',
        'insert',
        'update',
        'delete',
        'doPosting',
        'doCancelPosting',
        'deleteEmployee',
        'postingEmployee',
        'cancelPostingEmployee',
        'updateEmployee'
      ]
    },
    {
      description: 'Звіти TIM',
      entityMask: 'tim_report',
      methodMask: ['runTableReport']
    }
  ]
}]
