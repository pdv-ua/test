module.exports = [
  {
    entity: 'hr_dictTermContract',
    identifier: ['code'],
    notUpdate: true,
    notDelete: true,
    attrs: ['code', 'name', 'fullName', 'months'],
    items: [
      ['06', '6 місяців', '6 місяців', 6],
      ['12', '1 рік', '1 рік', 12],
      ['24', '2 роки', '2 роки', 24],
      ['36', '3 роки', '3 роки', 36],
      ['60', '5 років', '5 років', 60]
    ]
  }
]
