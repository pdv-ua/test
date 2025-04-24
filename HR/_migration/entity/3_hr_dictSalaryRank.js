module.exports = [
  {
    entity: 'hr_dictSalaryRank',
    identifier: ['dictRankID', 'paySum'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictSalaryRank').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      dictRankID: { associatedEntity: 'hr_dictRank', codeAttr: 'code' }
    },
    attrs: ['dictRankID', 'paySum', 'dateFrom'],
    items: [
      ['1', 1000, '2016-04-06T00:00:00Z'],
      ['2', 900, '2016-04-06T00:00:00Z'],
      ['3', 800, '2016-04-06T00:00:00Z'],
      ['4', 700, '2016-04-06T00:00:00Z'],
      ['5', 600, '2016-04-06T00:00:00Z'],
      ['6', 500, '2016-04-06T00:00:00Z'],
      ['7', 400, '2016-04-06T00:00:00Z'],
      ['8', 300, '2016-04-06T00:00:00Z'],
      ['9', 200, '2016-04-06T00:00:00Z']
    ]
  }
]
