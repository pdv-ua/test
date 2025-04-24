// acc_requestInformation
module.exports = [
  {
    name: 'acc_fssuReview',
    description: 'Переглядач документів СС',
    description_uk: 'Переглядач документів СС',
    description_ru: 'Просмотрщик документов СС',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accOperation', 'arm_accFSSU'],
    shortcutCodes: [
      'accFSSU_empOrderSickness',
      'hr_empOrderSickness',
      'accFSSU_empOrderFuneral',
      'hr_empOrderFuneral',
      'accFSSU_sicknessMeeting',
      'hr_sicknessMeeting'
    ],
    elsRule: [
      { description: 'hr_empOrder', entityMask: 'hr_empOrder', methodMask: ['select'] },
      { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['select'] },
      { description: 'Лікарняний лист', entityMask: 'hr_empOrderSickness', methodMask: ['select'] },
      { description: 'Листи непрацездатності, звільнення від роботи', entityMask: 'hr_empOrderSicknessDt', methodMask: ['select'] },
      { description: 'Зауваження імпорту лікарняних', entityMask: 'hr_sicknessLog', methodMask: ['select'] },
      { description: 'Допомога на поховання', entityMask: 'hr_empOrderFuneral', methodMask: ['select'] },
      { description: 'Протокол комісії з соціального страхування', entityMask: 'hr_sicknessMeeting', methodMask: ['select', 'getPrintData'] },
      { description: 'Протокол комісії з соціального страхування (рядки)', entityMask: 'hr_sicknessMeetingDt', methodMask: ['select'] }
    ]
  }
]
