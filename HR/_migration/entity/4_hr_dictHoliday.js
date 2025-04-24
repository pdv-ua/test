module.exports = [
  {
    entity: 'hr_dictHoliday',
    localeAttr: ['name', 'dictTimeCostID'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrsConfig: {
      dictTimeCostID: { associatedEntity: 'hr_dictTimeCost', codeAttr: 'code' }
    },
    attrs: ['dictTimeCostID', 'code', 'name', 'onDate'],
    items: [
      ['Свт', 'NewYear', 'Новий рік', '2018-01-01T00:00:00Z'],
      ['Свт', 'Cristmas', 'Різдво', '2018-01-07T00:00:00Z'],
      ['Свт', 'WomenDay', 'Жіночій день', '2018-03-08T00:00:00Z'],
      ['Свт', 'Easter', 'Пасха', '2018-04-08T00:00:00Z'],
      ['Свт', 'LabourDay', 'Міжнародний день праці', '2018-05-01T00:00:00Z'],
      ['Свт', 'WarVictory', 'День перемоги', '2018-05-09T00:00:00Z'],
      ['Свт', 'Trinity', 'Трійця', '2018-05-27T00:00:00Z'],
      ['Свт', 'ConstitutionDay', 'День конституції', '2018-06-28T00:00:00Z'],
      ['Свт', 'DefenderDay', 'День захисника', '2018-10-14T00:00:00Z']
    ]
  }
]
