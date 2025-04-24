module.exports = [
  {
    entity: 'hr_dictLanguageLevel',
    localeAttr: ['level'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'level', 'idxNum', 'interScale'],
    items: [
      ['А1', 'інтродуктивний (Breakthrough)', 1, 'Beginner, Elementary'],
      ['А2', 'середній (Waystage)', 2, 'Pre-Intermediate'],
      ['В1', 'рубіжний (Threshold)', 3, 'Intermediate'],
      ['В2', 'просунутий (Vantage)', 4, 'Upper-Intermediate'],
      ['С1', 'автономний (Effective Operational Proficiency)', 5, 'Advanced'],
      ['С2', 'компетентний (Mastery)', 6, 'Proficiency'],
      ['-999', 'Імпортоване значення', 0, '-999 Імпортоване значення']
    ]
  }
]
