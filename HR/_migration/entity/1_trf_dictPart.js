module.exports = [
  {
    entity: 'trf_dictPart',
    localeAttr: ['code'],
    notDelete: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'isMain'],
    items: [
      ['1', 'Штатний розпис', 1],
      ['2', 'Вечірня школа', 0],
      ['3', 'Лікарня', 0]
    ]
  }
]
