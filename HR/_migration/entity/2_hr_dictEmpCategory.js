module.exports = [
  {
    entity: 'hr_dictEmpCategory',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictEmpCategory').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'І категорія'],
      ['2', 'ІІ категорія'],
      ['3', 'Вища категорія'],
      ['4', 'Спеціаліст'],
      ['5', 'Молодший спеціаліст'],
      ['6', 'Без категорії']
    ]
  }
]
