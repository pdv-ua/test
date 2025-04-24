module.exports = [
  {
    entity: 'hr_dictStateMilitary',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'на військовому обліку'],
      ['2', 'знятий з військового обліку'],
      ['3', 'призовник'],
      ['4', 'перебуває на спеціальному обліку']
    ]
  }
]
