module.exports = [
  {
    entity: 'hr_departmentKind',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'Cамостійний'],
      ['2', 'У складі']
    ],
    modifyWhere: (conn) => {
      return !conn.Repository('hr_departmentKind').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    }
  }
]
