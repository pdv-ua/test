module.exports = [
  {
    name: 'acc_fssu',
    description: 'Облік документів СС',
    description_uk: 'Облік документів СС',
    description_ru: 'Учет документов СС',
    sessionTimeout: 30,
    allowedAppMethods: 'getDomainInfo,ubql,getDocument,logout,setDocument,changePassword,loadImportEmpOrderSickness',
    desktopsCodes: ['arm_accOperation', 'arm_accFSSU'],
    shortcutCodes: [
      'accFSSU_empOrderSickness',
      'hr_empOrderSickness',
      'accFSSU_empOrderFuneral',
      'hr_empOrderFuneral',
      'accFSSU_sicknessMeeting',
      'hr_sicknessMeeting',
      'accFSSUDictionary',
      'hr_dictCommission',
      'accFSSU_dictCommission'
    ],
    elsRule: [
      { description: 'hr_empOrder', entityMask: 'hr_empOrder', methodMask: ['select'] },
      { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Лікарняний лист', entityMask: 'hr_empOrderSickness', methodMask: ['select', 'addnew', 'insert', 'update', 'delete*', 'doPosting', 'doCancelPosting', 'getExpirienceAndRate', 'fixOrderState', 'addSubEmpOrder'] },
      { description: 'Листи непрацездатності, звільнення від роботи', entityMask: 'hr_empOrderSicknessDt', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Зауваження імпорту лікарняних', entityMask: 'hr_sicknessLog', methodMask: ['select'] },
      { description: 'Допомога на поховання', entityMask: 'hr_empOrderFuneral', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'doCancelPosting'] },
      { description: 'Протокол комісії з соціального страхування', entityMask: 'hr_sicknessMeeting', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'doCancelPosting', 'setSicknessList', 'setFuneralList', 'getCalculatedDaysSickness', 'getPrintData', 'removeDt'] },
      { description: 'Протокол комісії з соціального страхування (рядки)', entityMask: 'hr_sicknessMeetingDt', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addList'] },
      { description: 'Комісія документа', entityMask: 'hr_commission', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Комісії', entityMask: 'hr_dictCommission', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Склад комісії', entityMask: 'hr_dictCommissionDt', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'hr_employeeNumber', entityMask: 'hr_employeeNumber', methodMask: ['checkDateWork', 'getParentEmpNumbers'] }
    ]
  }
]
