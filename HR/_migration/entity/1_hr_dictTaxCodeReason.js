module.exports = [
  {
    entity: 'hr_dictTaxCodeReason',
    identifier: ['code'],
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    attrs: ['code', 'name'],
    items: [
      ['01', 'через релігійні переконання'],
      ['02', 'інші причини']
    ]
  }
]
