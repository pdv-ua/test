module.exports = [
  {
    entity: 'hr_dictMilitarySpeciality',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['001', 'Авіаційний спеціаліст'],
      ['002', 'Авіаційний механік']
    ]
  }
]
