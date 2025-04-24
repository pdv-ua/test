module.exports = [
  {
    code: 'group_expertsPersTelling',
    name: 'Фахівець з обліку персоналу',
    name_uk: 'Фахівець з обліку персоналу',
    name_ru: 'Специалист по учету персонала',
    name_az: 'İşçi heyətinin uçotu üzrə mütəxəssis',
    description: 'Фахівець з обліку персоналу',
    groupRole: [
      'acc_user',
      'acc_mainReportPerson',
      'acc_reviewTable', // Переглядач Штатного розпису
      'acc_reviewOrganization', // Переглядач організацій
      'acc_reviewEmployeeList', // Переглядач Реєстру осіб
      'acc_editorEmployeeNumber', // Редактор Електронної картки Працівника
      'acc_reviewEmployeeNumber', // Переглядач Електронної картки Працівника
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
      // 'acc_reviewTimeSheet', // Переглядач табелів // https://dev.intecracy.com/jira/browse/UBHR-5976
      // 'acc_editorTimeSheet', // Фахівець з ведення табеля // https://dev.intecracy.com/jira/browse/UBHR-5976
      // 'acc_editorWorkSchedule', // Редактор графіків робочого часу
      'acc_reviewWorkSchedule', // Переглядач графіків робочого часу
      'acc_editorMyOrderPerson',
      'acc_editorOrderPersonDict', // Редактор довідників наказів з персоналу
      'acc_approvDocs',
      'acc_workbookEditor', // Можливість редагування трудової діяльності
      'acc_cancelOrder', // Відміна проведення наказів
      'acc_recalcCases', // Перерахунок відмінків підрозділів
      'acc_editorPlanVacation',
      'acc_reviewCalendar',
      'acc_editorRespEmployee', // Ведення відповідальних по організації
      'acc_reviewDashboard',
      'acc_reviewPositionSchedulerLog',
      'acc_searchEmpFull',
      'acc_editorDictPersonCard',
      'acc_editorReminderOfWorkExperience' // Редагування щомісячного нагадування про стажі
    ]
  }
]
// hr_empOrder.getValidatorWarning
