module.exports = [
  {
    name: 'acc_editorWorkSchedule',
    description: 'Фахівець з ведення графіків робочого часу',
    description_uk: 'Фахівець з ведення графіків робочого часу',
    description_ru: 'Специалист по ведению графиков рабочего времени',
    description_az: 'iş vaxtı qrafiklərinə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'accTimSettings',
      'accTim_workSchedule',
      'hr_workSchedule'
    ],
    elsRule:
      [
        {
          description: 'Графік роботи',
          entityMask: 'hr_workSchedule',
          methodMask: ['addnew', 'insert', 'update', 'delete', 'addWorkScheduleCopy']
        }
      ]
  }
]
