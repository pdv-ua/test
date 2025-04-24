module.exports = [
  {
    entity: 'hr_dictKinshipKind',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'isChild'],
    items: [
      ['01', 'Дружина', 0],
      ['02', 'Утриманець', 0],
      ['03', 'Сестра', 0],
      ['04', 'Брат', 0],
      ['05', 'Син', 1],
      ['06', 'Дочка', 1],
      ['07', 'Мати', 0],
      ['08', 'Чоловік', 0],
      ['09', 'Батько', 0]
    ]
  }
]
