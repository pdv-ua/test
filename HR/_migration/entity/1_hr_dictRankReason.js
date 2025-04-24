module.exports = [
  {
    entity: 'hr_dictRankReason',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'у зв’язку із закінченням строку випробування'],
      ['2', 'у зв’язку з виходом на пенсію']
    ]
  }
]
