module.exports = [
  {
    name: 'acc_massProcessingMyTask',
    description: 'Групова обробка завдань',
    description_uk: 'Групова обробка завдань',
    description_ru: 'Групповая обработка задач',
    description_az: 'Tapşırıqların qrup işlənməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accDoc'],
    shortcutCodes: [
      'accDocFolderOrder',
      'accDoc_taskMy',
      'hr_taskMy',
      'accDoc_taskMyComplete',
      'hr_taskMyComplete',
      'hr_taskMyAllEntities'
    ],
    elsRule: [
      {
        description: 'Мої завдання',
        entityMask: 'hr_task',
        methodMask: ['select', 'update', 'setResolution', 'massProcessingTasks']
      },
      {
        description: 'Підписи по документу',
        entityMask: 'hr_empOrderSignature',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Заяви',
        entityMask: 'hr_request',
        methodMask: ['getCurrentTime']
      },
      {
        description: 'hr_empOrdListAppruv',
        entityMask: 'hr_empOrdListAppruv',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'updateEmpOrdListAppruvList']
      }
    ]
  }
]
