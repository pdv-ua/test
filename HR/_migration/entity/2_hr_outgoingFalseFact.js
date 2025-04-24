module.exports = [
  {
    entity: 'hr_outgoingFalseFact',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'Відсутні'],
      ['2', 'Присутні'],
      ['3', 'Потребує пояснення']
    ]
  }
]
