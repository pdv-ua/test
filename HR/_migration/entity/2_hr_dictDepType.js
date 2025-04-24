module.exports = [
  {
    entity: 'hr_dictDepType',
    localeAttr: ['name', 'nameGen'],
    notDelete: true,
    notUpdate: true,
    identifier: 'code',
    attrs: ['code', 'name', 'nameGen', 'isLead'],
    items: [
      ['1', 'Департамент', 'Департаменту', 1],
      ['2', 'Управління', 'Управління', 1],
      ['3', 'Відділ', 'Відділу', 0],
      ['4', 'Сектор', 'Сектору', 0],
      ['5', 'Служба', 'Служби', 0]
    ]
  }
]
