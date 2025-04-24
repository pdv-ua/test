module.exports = [
  {
    entity: 'hr_dictAcademStatus',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'Старший дослідник'],
      ['02', 'Доцент'],
      ['03', 'Професор'],
      ['04', 'Член-кореспондент'],
      ['05', 'Академік']
    ]
  }
]
