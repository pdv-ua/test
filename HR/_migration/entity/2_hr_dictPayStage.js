module.exports = [
  {
    entity: 'hr_dictPayStage',
    identifier: ['yearFrom', 'yearTo', 'payRate'],
    notDelete: true,
    notUpdate: true,
    attrs: ['yearFrom', 'yearTo', 'payRate'],
    items: [
      [3, 5, 10],
      [5, 10, 15],
      [10, 15, 20],
      [15, 20, 25],
      [20, 25, 30],
      [25, 100, 40]
    ]
  }
]
