module.exports = [
  {
    name: 'acc_approvSHRExternal',
    description: 'Переглядач проєктів ШР (зовнішній)',
    description_uk: 'Переглядач проєктів ШР (зовнішній)',
    description_ru: 'Просмотрщик проектов ШР (внешний)',
    description_az: 'SR layihə izləyicisi (xarici)',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accDoc', 'arm_accStaff'],
    shortcutCodes: [
      'accDocFolderStaffOrder',
      'accDoc_staffTableOtherOrgA',
      'hr_staffTableOtherOrgA',
      'accStaffFolderOrder',
      'accHR_staffTableAll',
      'hr_staffTableAll'
    ],
    elsRule: [
      {
        description: 'hr_empOrder',
        entityMask: 'hr_empOrder',
        methodMask: ['select', 'repPrintForm', 'exchangeReview', 'sendReview']
      },
      {
        description: 'hr_recstage',
        entityMask: 'hr_recstage',
        methodMask: ['startReconciliation', 'stopReconciliation', 'continueReconciliation',
          'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
      },
      {
        description: 'Планування штатного розпису',
        entityMask: 'hr_staffTable',
        methodMask: ['select', 'generateXLSX']
      }
    ]
  }
]
