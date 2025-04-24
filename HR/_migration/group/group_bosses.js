module.exports = [
  {
    code: 'group_bosses',
    name: 'Керівник Організації та його заступник',
    name_uk: 'Керівник Організації та його заступник',
    name_ru: 'Руководитель Организации и его заместитель',
    name_az: 'Təşkilatın rəhbəri və onun müavini',
    description: 'Керівник Організації та його заступник',
    groupRole: [
      'acc_user',
      'acc_mainReportPerson',
      'acc_reconcOrderPerson', // Погоджувач наказів
      'acc_reviewTable', // Переглядач Штатного розпису
      'acc_reviewOrganization', // Переглядач організацій
      'acc_reviewEmployeeList', // Переглядач Реєстру осіб
      'acc_reviewEmployee', // Переглядач Електронної картки Особи
      'acc_mainReportList', // Користувач звітів-списків
      'acc_reviewOrderPerson', // Переглядач наказів з персоналу
      'acc_approvDocs',
      'acc_reviewDashboard',
      'acc_searchEmpFull'
    ]
  }
]
