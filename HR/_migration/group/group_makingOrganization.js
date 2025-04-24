module.exports = [
  {
    code: 'group_makingOrganization',
    name: 'Фахівець з ведення організацій',
    name_uk: 'Фахівець з ведення організацій',
    name_ru: 'Специалист по ведению организаций',
    name_az: 'Təşkilatın idarə edilməsi üzrə mütəxəssis',
    description: 'Фахівець з ведення організацій',
    groupRole: [
      'acc_user',
      'acc_editorOrganization', // Редактор організацій
      'acc_reviewOrganization', // Переглядач організацій
      'acc_mainFOP', // Відповідальний за Фонд оплати праці
      'acc_editorDocAttachment',
      'acc_reviewDocAttachment',
      'acc_reviewDashboard',
      'acc_cancelOrder'
    ]
  }
]
