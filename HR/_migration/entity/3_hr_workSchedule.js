module.exports = [
  {
    entity: 'hr_workSchedule',
    identifier: ['code'],
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    attrs: ['code', 'name', 'begins'],
    items: [
      ['Std', 'Стандартний графік роботи', 'FROM_WEEKBEGIN']
    ]
  }
]
