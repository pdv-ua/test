module.exports = [
  {
    entity: 'hr_dictRankAssignKind',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      [ '1', 'достроково' ],
      [ '2', 'черговий' ],
      [ '3', 'за поданням' ]
    ]
  }
]
