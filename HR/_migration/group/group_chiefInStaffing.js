module.exports = [
  {
    code: 'group_chiefInStaffing',
    name: 'Керівник планового відділу',
    name_uk: 'Керівник планового відділу',
    name_ru: 'Руководитель планового отдела',
    name_az: 'Planlaşdırma struktur vahidinin müdiri',
    description: 'Керівник планового відділу',
    groupRole: [
      'acc_user',
      'acc_editorOrderTable', // Редактор наказів за Штатним розписом
      'acc_reviewOrderTable', // Переглядач наказів за Штатним розписом
      'acc_editorTable', // Редактор Штатного розпису
      'acc_editorTariffList', // Редактор Тарифікаційний список
      'acc_reviewTable', // Переглядач Штатного розпису
      'acc_reviewOrganization', // Переглядач організацій
      'acc_mainReportStructure', // Користувач звітів «Оргструктура» та «Штатний розпис»
      'acc_editorDictionaryOrg', // Адміністратор довідників оргструктури та штатного розпису
      'acc_reviewDictionaryOrg', // Переглядач довідників оргструктури та штатного розпису
      'acc_editorDocAttachment', // Редактор додатків до документів
      'acc_reviewDocAttachment', // Перегляд додатків до документів
      'acc_reconcOrderPerson', // Погоджувач наказів
      'acc_cancelOrder', // Відміна проведення наказів
      'acc_positionEditor', // Можливість редагування посад
      'acc_recalcCases', // Перерахунок відмінків підрозділів
      'acc_editorRespEmployee', // Ведення відповідальних по організації
      'acc_reviewDashboard'
    ]
  }
]
