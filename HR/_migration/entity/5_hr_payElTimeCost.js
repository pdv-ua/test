module.exports = [
  {
    entity: 'hr_payElTimeCost',
    identifier: ['payElID', 'dictTimeCostID'],
    localeAttr: ['dictTimeCostID'],
    notUpdate: true,
    notDelete: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payElTimeCost').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' },
      dictTimeCostID: { associatedEntity: 'hr_dictTimeCost', codeAttr: 'code' }
    },
    attrs: ['payElID', 'dictTimeCostID', 'entryType'],
    items: [
      ['1', 'РбДн', 'INTIME'],
      ['1', 'РбНп', 'INTIME'],
      ['2', 'РбДн', 'INTIME'],
      ['2', 'РбНп', 'INTIME'],
      ['63', 'РбДн', 'INTIME'],
      ['63', 'РбНп', 'INTIME'],
      ['13', 'Свт', 'INTIME'],
      ['13', 'Вваг', 'INTIME'],
      ['21', 'Свт', 'INTIME'],
      ['21', 'Вваг', 'INTIME'],
      ['23', 'Свт', 'INTIME'],
      ['23', 'Вваг', 'INTIME'],
      ['36', 'Свт', 'INTIME'],
      ['36', 'Вваг', 'INTIME'],
      ['73', 'Свт', 'INTIME'],
      ['73', 'Вваг', 'INTIME'],
      ['137', 'Прст', 'INTIME'],
      ['138', 'РбДн', 'INTIME']
    ]
  }
]
