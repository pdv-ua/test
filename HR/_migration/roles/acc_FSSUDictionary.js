module.exports = [
  {
    name: 'acc_FSSUDictionary',
    description: 'Фахівець з ведення довідників та налаштувань для ведення документів СС',
    description_uk: 'Фахівець з ведення довідників та налаштувань для ведення документів СС',
    description_ru: 'Специалист по ведению справочников и настроек для ведения документов СС',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accFSSU'],
    shortcutCodes: [
      'accFSSUDictionary',
      'accFSSU_dictIllnessReason',
      'hr_dictIllnessReason',
      'accFSSU_dictIllnessRegime',
      'hr_dictIllnessRegime',
      'accFSSU_dictIllnessPercent',
      'hr_dictIllnessPercent',
      'accFSSU_dictSumFuneral',
      'hr_dictSumFuneral'
    ],
    elsRule: [
      {
        description: 'Причини непрацездатності',
        entityMask: 'hr_dictIllnessReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Лікарняний режим',
        entityMask: 'hr_dictIllnessRegime',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Відсотки для лікарняного (від стажу)',
        entityMask: 'hr_dictIllnessPercent',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Допомога на поховання СС',
        entityMask: 'hr_dictSumFuneral',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
