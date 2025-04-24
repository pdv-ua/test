module.exports = [
  {
    code: 'group_makingDictionary',
    name: 'Відповідальний за ведення довідників',
    name_uk: 'Відповідальний за ведення довідників',
    name_ru: 'Ответственный за ведение справочников',
    name_az: 'Soraqçaların idarə edilməsinə məsul',
    description: 'Відповідальний за ведення довідників',
    groupRole: [
      'acc_user',
      'acc_editorDictionaryEmp', // Адміністратор довідників персоналу
      'acc_reviewDictionaryEmp', // Переглядач довідників персоналу
      'acc_editorDictionaryEmpOrder', // Адміністратор довідників наказів з персоналу
      'acc_reviewDictionaryEmpOrder', // Переглядач довідників наказів з персоналу
      'acc_editorDictionaryOrg', // Адміністратор довідників оргструктури та штатного розпису
      'acc_reviewDictionaryOrg', // 'Переглядач довідників оргструктури та штатного розпису
      'acc_reviewDashboard'
    ]
  }
]
