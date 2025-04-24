module.exports = [
  {
    entity: 'hr_dictCategMilitary',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'Перша'],
      ['02', 'Друга']
    ]
  }
]
