module.exports = [
  {
    entity: 'hr_dictPensionType',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'Військова'],
      ['02', 'За віком'],
      ['03', 'По інвалідності'],
      ['04', 'Учасникам ліквідації наслідків аварії на ЧАЄС'],
      ['05', 'По втраті годувальника']
    ]
  }
]
