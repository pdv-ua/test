module.exports = [
  {
    entity: 'hr_dictCauseOfDeath',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['01', 'захворювання'],
      ['02', 'травма'],
	    ['03', 'нещасний випадок'],
      ['04', 'інша']
    ]
  }
]
