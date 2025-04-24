module.exports = [
  {
    entity: 'hr_dictFssReq',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictFssReq').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['code'],
    attrs: ['code', 'name'],
    items: [
      ['1', 'Виплата за рахунок СС'],
      ['2', 'Ізоляція від COVID-19'],
      ['3', 'Е-Виплата за рахунок СС']
    ]
  }
]
