module.exports = [
  {
    entity: 'hr_dictVacationPlanDay',
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictVacationPlanDay').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['dictVacationKindID', 'positionType', 'dateFrom'],
    attrsConfig: {
      dictVacationKindID: { associatedEntity: 'hr_dictVacationKind', codeAttr: 'code' }
    },
    attrs: ['dictVacationKindID', 'positionType', 'dayCount', 'dateFrom', 'dateTo'],
    items: [
      [ 'dYear', '1', 30, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'dYear', null, 24, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'dAddO', '1', 15, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'dAddB', null, 35, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'dChild', null, 10, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'dAddS', null, 35, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ]
    ]
  }
]
