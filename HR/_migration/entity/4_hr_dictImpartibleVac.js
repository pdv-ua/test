module.exports = [
  {
    entity: 'hr_dictImpartibleVac',
    localeAttr: ['description'],
    notDelete: true,
    notUpdate: true,
    identifier: ['dictVacationKindID', 'dayCount'],
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictImpartibleVac').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      dictVacationKindID: { associatedEntity: 'hr_dictVacationKind', codeAttr: 'code' }
    },
    attrs: ['dictVacationKindID', 'dayCount', 'description'],
    items: [
      [ 'dChS', 16, 'Чорнобильська відпустка - 16 дн.' ],
      [ 'dChildW', 7, 'Додаткова оплачувана відпустка жінці, яка виховує дитину (дітей) без батька - 7 дн.' ],
      [ 'dChildW', 10, 'Додаткова оплачувана відпустка жінці, яка виховує дитину (дітей) без батька - 10 дн.' ],
      [ 'dChildW', 17, 'Додаткова оплачувана відпустка жінці, яка виховує дитину (дітей) без батька - 17 дн.' ],
      [ 'dChild', 7, 'Додаткова соціальна відпустка працівникам, які мають дітей - 7 дн.' ],
      [ 'dChild', 10, 'Додаткова соціальна відпустка працівникам, які мають дітей - 10 дн.' ],
      [ 'dChild', 17, 'Додаткова соціальна відпустка працівникам, які мають дітей - 17 дн.' ]
    ]
  }
]
