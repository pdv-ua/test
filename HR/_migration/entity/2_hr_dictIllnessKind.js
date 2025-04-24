module.exports = [
  {
    entity: 'hr_dictIllnessKind',
    localeAttr: ['name', 'shortname'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name', 'shortname', 'isRst'],
    items: [
      ['1', 'Лист непрацездатності', 'Лік.лист', 1],
      ['2', 'Довідка 095-2/о (догляд)', 'Довідка', 0],
      ['3', 'Непідтверджений лікарняний', 'Непідтверджений', 0]
    ]
  }
]
