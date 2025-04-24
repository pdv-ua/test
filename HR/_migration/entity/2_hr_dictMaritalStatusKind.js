module.exports = [
  {
    entity: 'hr_dictMaritalStatusKind',
    identifier: ['code'],
    localeAttr: ['name'],
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictMaritalStatusKind').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    notDelete: true,
    notUpdate: true,
    attrs: ['code', 'name'],
    items: [
      ['01', 'заміжня'],
      ['11', 'одружений'],
      ['22', 'неодружений'],
      ['33', 'розлучений'],
      ['44', 'вдовець'],
      ['55', 'одружена'],
      ['66', 'незаміжня'],
      ['77', 'розлучена'],
      ['88', 'вдова']
    ]
  }
]
