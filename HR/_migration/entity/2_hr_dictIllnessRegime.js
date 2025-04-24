module.exports = [
  {
    entity: 'hr_dictIllnessRegime',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'Амбулаторний'],
      ['2', 'Стаціонарний'],
      ['3', 'Санаторний'],
      ['4', 'Інша робота']
    ]
  }
]
