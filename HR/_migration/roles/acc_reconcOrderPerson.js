module.exports = [
  {
    name: 'acc_reconcOrderPerson',
    description: 'Погоджувач наказів',
    description_uk: 'Погоджувач наказів',
    description_ru: 'Согласователь приказов',
    description_az: 'Əmrləri razılaşdırır',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accDoc'],
    shortcutCodes: [
      'accDocFolderOrder',
      'accDoc_taskMy',
      'hr_taskMy',
      'accDoc_taskMyComplete',
      'hr_taskMyComplete'
    ],
    elsRule: [
      {
        description: 'Мої завдання',
        entityMask: 'hr_task',
        methodMask: ['select', 'setResolution', 'update']
      },
      {
        description: 'Підписи по документу',
        entityMask: 'hr_empOrderSignature',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      }
    ]
  }
]
