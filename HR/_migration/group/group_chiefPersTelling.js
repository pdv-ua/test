module.exports = [
  {
    code: 'group_chiefPersTelling',
    name: 'Керівник служби персоналу',
    name_uk: 'Керівник служби персоналу',
    name_ru: 'Руководитель службы персонала',
    name_az: 'İnsan Resursları rəhbəri',
    description: 'Керівник служби персоналу',
    groupRole: [
      'acc_user',
      'acc_mainReportPerson',
      'acc_reviewTable', // Переглядач Штатного розпису
      'acc_reviewOrganization', // Переглядач організацій
      // 'acc_editorEmployeeList', // Редактор Реєстру осіб
      'acc_reviewEmployeeList', // Переглядач Реєстру осіб
      'acc_editorEmployee', // Редактор Електронної картки Особи
      'acc_reviewEmployee', // Переглядач Електронної картки Особи
      'acc_editorDocAttachment', // Редактор додатків до документів
      'acc_reviewDocAttachment', // Перегляд додатків до документів
      'acc_mainReportList', // Користувач звітів-списків
      'acc_editorOrderPerson', // Редактор наказів з персоналу
      'acc_labelOrderPerson', // Редактор наказів з персоналу (ярлик)
      'acc_reviewOrderPerson', // Переглядач наказів з персоналу
      'acc_reconcOrderPerson', // Погоджувач наказів
      'acc_mainPrintPerson', // Користувач друкованих форм документів за Наказами з персоналу
      'acc_mainReportOrderPerson', // Користувач звітів за Наказами з персоналу
      'acc_cancelOrder', // Відміна проведення наказів
      'acc_editorEmployeeNumber', // Редактор Електронної картки Працівника
      'acc_reviewEmployeeNumber', // Переглядач Електронної картки Працівника
      'acc_approvDocs',
      'acc_workbookEditor', // Можливість редагування трудової діяльності
      'acc_recalcCases', // Перерахунок відмінків підрозділів
      'acc_editorPlanVacation',
      'acc_reviewCalendar',
      'acc_editorRespEmployee', // Ведення відповідальних по організації\
      'acc_reviewDashboard',
      'acc_searchEmpFull',
      'acc_editorOrderAttachment',
      'acc_editorReminderOfWorkExperience' // Редагування щомісячного нагадування про стажі
    ]
  }
]
