module.exports = [
  {
    entity: 'hr_dictIllnessPercent',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'value', 'minMonths'],
    items: [
      [ '01', 'Дo 3 років', 50, 0 ],
      [ '02', 'Від 3 до 5 років', 60, 36 ],
      [ '03', 'Від 5 до 8 років', 70, 60 ],
      [ '04', 'Більше 8 років', 100, 96 ]
    ]
  }
]
