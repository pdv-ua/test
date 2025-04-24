module.exports = [
  {
    name: 'acc_FSSUDictionaryReview',
    description: 'Переглядач довідників та налаштувань для ведення документів СС',
    description_uk: 'Переглядач довідників та налаштувань для ведення документів СС',
    description_ru: 'Просмотрщик справочников и настроек для ведения документов СС',
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
        methodMask: ['select']
      },
      {
        description: 'Лікарняний режим',
        entityMask: 'hr_dictIllnessRegime',
        methodMask: ['select']
      },
      {
        description: 'Відсотки для лікарняного (від стажу)',
        entityMask: 'hr_dictIllnessPercent',
        methodMask: ['select']
      },
      {
        description: 'Допомога на поховання СС',
        entityMask: 'hr_dictSumFuneral',
        methodMask: ['select']
      }
    ]
  }
]
