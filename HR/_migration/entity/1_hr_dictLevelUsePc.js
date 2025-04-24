module.exports = [
  {
    entity: 'hr_dictLevelUsePc',
    identifier: ['code'],
    notUpdate: true,
    localeAttr: ['name'],
    notDelete: true,
    attrs: ['code', 'name'],
    items: [
      ['1', 'початківець'],
      ['2', 'середній рівень'],
      ['3', 'впевнений користувач'],
      ['4', 'просунутий користувач']
    ]
  }
]
