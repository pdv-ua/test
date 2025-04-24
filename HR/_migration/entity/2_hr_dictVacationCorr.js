module.exports = [
  {
    entity: 'hr_dictVacationCorr',
    localeAttr: ['name', 'shortname'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'shortname', 'isCorr'],
    items: [
      ['Sickness', 'Лікарняний під час відпустки', 'Лікарняний', 0],
      ['nDel', 'Наказ на відкликання з відпустки', 'Відкликання', 0],
      ['nChld', 'Наказ на вихід з відпустки по догляду за дитиною до 3 років', 'Вихід з декрету', 0]
    ]
  }
]
