module.exports = [
  {
    code: 'group_reviewersPerson',
    name: 'Фахівець з обліку персоналу (перегляд)',
    name_uk: 'Фахівець з обліку персоналу (перегляд)',
    name_ru: 'Специалист по учету персонала (просмотр)',
    name_az: 'İşçi heyətin uçotu üzrə mütəxəssis (baxış)',
    description: 'Фахівець з обліку персоналу (перегляд)',
    groupRole: [
      'acc_user',
      'acc_mainReportPerson',
      'acc_reviewTable', // Переглядач Штатного розпису
      'acc_reviewOrganization', // Переглядач організацій
      'acc_reviewEmployeeList', // Переглядач Реєстру осіб
      'acc_reviewEmployee', // Переглядач Електронної картки Особи
      'acc_reviewEmployeeNumber', // Переглядач Електронної картки Працівника
      'acc_mainReportList', // Користувач звітів-списків
      'acc_reviewDocAttachment', // Перегляд додатків до документів
      'acc_reviewPlanVacation',
      'acc_reviewCalendar',
      'acc_reviewDashboard',
      'acc_searchEmpFull',
      'acc_reviewOrderPerson', // Переглядач наказів з персоналу
      'acc_editorReminderOfWorkExperience' // Редагування щомісячного нагадування про стажі
    ]
  }
]
