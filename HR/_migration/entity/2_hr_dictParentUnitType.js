module.exports = [
  {
    entity: 'hr_dictParentUnitType',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code', 'name'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'Центральний апарат'],
      ['2', 'Теруправління']
    ]
  }
]
