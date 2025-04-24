module.exports = [
  {
    entity: 'hr_dictAppointKind',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'type'],
    items: [
      [ '0', 'На підставі конкурсу', 'CONTEST' ],
      [ '1', 'За згодою', 'MOVING' ],
      [ '2', 'В порядку переведення', 'MOVING' ]
    ]
  }
]
