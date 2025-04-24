module.exports = [
  {
    code: 'group_admData',
    name: 'Адміністратор Системи',
    name_uk: 'Адміністратор Системи',
    name_ru: 'Администратор Системы',
    name_az: 'Sistem administratoru',
    description: 'Адміністратор Системи',
    groupRole: [
      'acc_user',
      'acc_admData', // Адміністратор Системи
      'acc_editorDictionaryATU', // Адміністратор довідників АТУ
      'acc_editorDictionaryOrg', // Адміністратор довідників оргструктури та штатного розпису
      'acc_editorDictionaryEmp', // Адміністратор довідників персоналу
      'acc_editorDictionaryEmpOrder', // Адміністратор довідників наказів з персоналу
      'acc_admPortal', // Адміністратор порталу
      'acc_reviewDictionaryOrg', // Переглядач довідників оргструктури та штатного розпису
      'acc_reviewDictionaryEmpOrder', // Переглядач довідників наказів з персоналу
      'acc_reviewDictionaryEmp', // Переглядач довідників персоналу
      'acc_reviewDocAttachment', // Перегляд додатків до документів
      'acc_reviewTimeSheetCost', // Переглядач налаштування правил для табеля
      'acc_reviewOrganization', // Переглядач організацій
      'acc_editorOrganization', // Редактор організацій
      'acc_editorDocAttachment', // Редактор додатків до документів
      'acc_cancelOrder', // Відміна проведення наказів
      'acc_payrollDictionary', // Фахівець з ведення довідників заробітної плати
      'acc_FSSUDictionary', // Фахівець з ведення довідників та налаштувань для ведення документів СС
      'acc_payrollSettings', // Фахівець з ведення налаштувань заробітної плати
      'acc_timeSheetSchedule', // Фахівець з налаштування графіків роботи організації
      'acc_timeSheetCost', // Фахівець з налаштування правил для табеля
      'acc_MainDataMigrationHR', // Фахівець організації з міграції даних персоналу
      'acc_reviewTimeSheetScheduleChange' // Переформування табеля у закритих періодах
    ]
  }
]
