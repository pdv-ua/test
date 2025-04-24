module.exports = [
  {
    entity: 'hr_dictDegree',
    localeAttr: ['name', 'shortName'],
    notDelete: true,
    notUpdate: true,
    identifier: 'code',
    attrs: ['code', 'name', 'shortName'],
    items: [
      ['01', 'Кандидат', 'к.'],
      ['02', 'Доктор', 'д.']
    ]
  }
]
