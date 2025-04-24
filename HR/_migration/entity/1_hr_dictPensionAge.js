module.exports = [
  {
    entity: 'hr_dictPensionAge',
    notDelete: true,
    notUpdate: true,
    identifier: ['dateFrom', 'sexType'],
    attrs: ['sexType', 'years', 'months', 'dateFrom', 'dateTo'],
    ignoreAttrs: ['years', 'months'],
    items: [
      ['M', 60, 0, '2020-01-01T00:00:00Z', '2021-03-31T00:00:00Z'],
      ['W', 59, 6, '2020-01-01T00:00:00Z', '2021-03-31T00:00:00Z'],
      ['M', 60, 0, '2021-04-01T00:00:00Z', '9999-12-31T00:00:00Z'],
      ['W', 60, 0, '2021-04-01T00:00:00Z', '9999-12-31T00:00:00Z']
    ]
  }
]
