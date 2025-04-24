module.exports = [
  {
    name: 'acc_approvSHR',
    description: 'Погоджувач ШР',
    description_uk: 'Погоджувач ШР',
    description_ru: 'Согласователь ШР',
    description_az: 'SHR koordinatoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accDoc'],
    shortcutCodes: [
      'accDocFolderStaffOrder',
      'accDoc_taskMyStaffTableA',
      'hr_taskMyStaffTableA',
      'accDoc_taskMyStaffTableClosedA',
      'hr_taskMyStaffTableClosedA'
    ],
    elsRule: [
      {
        description: 'Підписи по документу',
        entityMask: 'hr_empOrderSignature',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Мої завдання',
        entityMask: 'hr_task',
        methodMask: ['select', 'setResolution', 'update']
      },
      {
        description: 'hr_recstage',
        entityMask: 'hr_recstage',
        methodMask: ['startReconciliation', 'stopReconciliation', 'continueReconciliation',
          'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
      },
      {
        description: 'hr_empOrder',
        entityMask: 'hr_empOrder',
        methodMask: ['repPrintForm', 'exchangeReview', 'sendReview']
      }
    ]
  }
]
